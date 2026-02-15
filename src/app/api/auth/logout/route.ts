import { NextResponse } from "next/server";

import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

export async function POST() {
  const isProd = process.env.NODE_ENV === "production";
  const baseUrl = await getRequestBaseUrl();

  // Evita usar req.url cuando proviene de un host interno detrás de proxy
  const redirectUrl = new URL("/", `${baseUrl}/`);

  const res = NextResponse.redirect(redirectUrl, 303);

  // Invalidamos la cookie
  res.cookies.set("treddit_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 0,
  });

  return res;
}
