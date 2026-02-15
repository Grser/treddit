import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { OAUTH_STATE_COOKIE, getBaseUrl, getRedirectUri, rememberOrigin } from "../utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const origin = getBaseUrl(req); // p.ej. https://mi-dominio.com
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const redirectUri = await getRedirectUri(origin, req);

  // state anti-CSRF
  const state = randomBytes(16).toString("hex");

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
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd, // en localhost debe ser false
    path: "/",
    maxAge: 300,
  };
  res.cookies.set(OAUTH_STATE_COOKIE, state, cookieOptions);
  rememberOrigin(res, origin);

  return res;
}
