export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

function getOrigin(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost =
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host")?.trim();

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const origin = getOrigin(req); // p.ej. https://mi-dominio.com
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // state anti-CSRF
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    include_granted_scopes: "true",
    state,
    // prompt: "select_account",
  });

  const res = NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );

  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd, // en localhost debe ser false
    path: "/",
    maxAge: 300,
  });

  return res;
}
