import { NextResponse } from "next/server";

const SUPPORTED = new Set(["es", "en", "pt"]);

export async function POST(request: Request) {
  const form = await request.formData();
  const language = String(form.get("language") || "").toLowerCase();

  if (!SUPPORTED.has(language)) {
    return NextResponse.redirect(new URL("/idioma?actualizado=0", request.url));
  }

  const response = NextResponse.redirect(new URL("/idioma?actualizado=1", request.url));
  response.cookies.set("treddit_lang", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  return response;
}
