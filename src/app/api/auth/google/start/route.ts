export const runtime = "nodejs";

import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin; // p.ej. http://localhost:3000
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
