import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth";
import {
  OAUTH_STATE_COOKIE,
  consumeRememberedOrigin,
  clearOauthCookies,
  getBaseUrl,
  getRedirectUri,
} from "../utils";

export const runtime = "nodejs";

type GoogleTokenResponse = {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: "Bearer";
  refresh_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
};

type UserRecord = {
  id: number;
  username: string;
  email: string;
  avatar_url: string | null;
  is_admin: number;
  is_verified: number;
};

type UserRow = RowDataPacket & UserRecord;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  let origin = getBaseUrl(req); // p.ej. https://mi-dominio.com

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const rememberedOrigin = consumeRememberedOrigin(cookieStore);
  if (rememberedOrigin) {
    origin = rememberedOrigin;
  }
  const redirectUri = await getRedirectUri(origin);

  if (!code || !state || !stateCookie || state !== stateCookie) {
    // redirección absoluta
    const res = NextResponse.redirect(new URL("/", origin), {
      headers: { "x-error": "invalid_state" },
    });
    clearOauthCookies(res);
    return res;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  // Intercambio de code por tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const res = NextResponse.redirect(new URL("/", origin), {
      headers: { "x-error": "token_exchange_failed" },
    });
    clearOauthCookies(res);
    return res;
  }
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  // Obtener perfil
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    const res = NextResponse.redirect(new URL("/", origin), {
      headers: { "x-error": "userinfo_failed" },
    });
    clearOauthCookies(res);
    return res;
  }
  const info = (await userRes.json()) as GoogleUserInfo;

  // Upsert en Users
  const [bySub] = await db.execute<UserRow[]>(
    "SELECT id, username, email, avatar_url, is_admin, is_verified FROM Users WHERE google_sub=? LIMIT 1",
    [info.sub]
  );
  let user: UserRecord | undefined = bySub[0];

  if (!user && info.email) {
    const [byEmail] = await db.execute<UserRow[]>(
      "SELECT id, username, email, avatar_url, is_admin, is_verified FROM Users WHERE email=? LIMIT 1",
      [info.email]
    );
    user = byEmail[0];
    if (user) {
      await db.execute(
        "UPDATE Users SET google_sub=?, avatar_url=? WHERE id=?",
        [info.sub, info.picture ?? null, user.id]
      );
      user.avatar_url = info.picture ?? user.avatar_url ?? null;
    }
  }

  if (!user) {
    const baseUsername = (info.email?.split("@")[0] || `g${info.sub.slice(0, 8)}`)
      .replace(/[^a-zA-Z0-9_]/g, "");
    const username = await findFreeUsername(baseUsername);

    const [ins] = await db.execute<ResultSetHeader>(
      "INSERT INTO Users (username, nickname, email, password, google_sub, avatar_url, created_at, visible) VALUES (?, ?, ?, ?, ?, ?, NOW(), 1)",
      [
        username,
        info.name || username,
        info.email || `${username}@example.com`,
        // hash imposible para login local, solo placeholder
        "$2a$10$B1T7sQvLmJKg0T0rMZx3eOiJ5T6m4bqEBCmY8YwS9n3h4pJrZk1y2",
        info.sub,
        info.picture ?? null,
      ]
    );
    const newId = Number(ins.insertId);
    user = {
      id: newId,
      username,
      email: info.email || `${username}@example.com`,
      avatar_url: info.picture ?? null,
      is_admin: 0,
      is_verified: 0,
    };
  }

  if (!user) {
    throw new Error("USER_CREATION_FAILED");
  }

  // Crear sesión
  const token = signSession({
    id: user.id,
    username: user.username,
    email: user.email,
    avatar_url: user.avatar_url ?? null,
    is_admin: Boolean(user.is_admin),
    is_verified: Boolean(user.is_verified),
  });

  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(new URL("/", origin));
  res.cookies.set("treddit_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // en localhost debe ser false
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  // limpiar state
  clearOauthCookies(res);

  return res;
}

// genera un username libre añadiendo sufijos si está tomado
async function findFreeUsername(base: string) {
  let candidate = base.toLowerCase().slice(0, 32) || "usuario";
  let i = 0;
  for (;;) {
    const [rows] = await db.execute<RowDataPacket[]>(
      "SELECT 1 FROM Users WHERE username=? LIMIT 1",
      [candidate]
    );
    if (rows.length === 0) return candidate;
    i += 1;
    candidate = (base + i).toLowerCase().slice(0, 32);
  }
}
