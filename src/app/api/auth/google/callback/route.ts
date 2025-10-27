export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { signSession } from "@/lib/auth";

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

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin; // p.ej. http://localhost:3000

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get("oauth_state")?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    // redirección absoluta
    return NextResponse.redirect(new URL("/", req.url), {
      headers: { "x-error": "invalid_state" },
    });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${origin}/api/auth/google/callback`;

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
    return NextResponse.redirect(new URL("/", req.url), {
      headers: { "x-error": "token_exchange_failed" },
    });
  }
  const tokens = (await tokenRes.json()) as GoogleTokenResponse;

  // Obtener perfil
  const userRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) {
    return NextResponse.redirect(new URL("/", req.url), {
      headers: { "x-error": "userinfo_failed" },
    });
  }
  const info = (await userRes.json()) as GoogleUserInfo;

  // Upsert en Users
  const [bySub] = await db.execute(
    "SELECT id, username, email FROM Users WHERE google_sub=? LIMIT 1",
    [info.sub]
  );
  let user = (bySub as any[])[0];

  if (!user && info.email) {
    const [byEmail] = await db.execute(
      "SELECT id, username, email FROM Users WHERE email=? LIMIT 1",
      [info.email]
    );
    user = (byEmail as any[])[0];
    if (user) {
      await db.execute(
        "UPDATE Users SET google_sub=?, avatar_url=? WHERE id=?",
        [info.sub, info.picture ?? null, user.id]
      );
    }
  }

  if (!user) {
    const baseUsername = (info.email?.split("@")[0] || `g${info.sub.slice(0, 8)}`)
      .replace(/[^a-zA-Z0-9_]/g, "");
    const username = await findFreeUsername(baseUsername);

    const [ins] = await db.execute(
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
    const newId = (ins as any).insertId as number;
    user = { id: newId, username, email: info.email || `${username}@example.com` };
  }

  // Crear sesión
  const token = signSession({ id: user.id, username: user.username, email: user.email });

  const isProd = process.env.NODE_ENV === "production";
  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set("treddit_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // en localhost debe ser false
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  // limpiar state
  res.cookies.set("oauth_state", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });

  return res;
}

// genera un username libre añadiendo sufijos si está tomado
import { db as _db } from "@/lib/db";
async function findFreeUsername(base: string) {
  let candidate = base.toLowerCase().slice(0, 32) || "usuario";
  let i = 0;
  for (;;) {
    const [rows] = await _db.execute(
      "SELECT 1 FROM Users WHERE username=? LIMIT 1",
      [candidate]
    );
    if ((rows as any[]).length === 0) return candidate;
    i += 1;
    candidate = (base + i).toLowerCase().slice(0, 32);
  }
}
