import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const isProd = process.env.NODE_ENV === "production";

  // Construimos una URL absoluta hacia la raíz
  const redirectUrl = new URL("/", req.url);

  const res = NextResponse.redirect(redirectUrl);

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
