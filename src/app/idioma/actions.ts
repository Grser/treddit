"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SUPPORTED = new Set(["es", "en", "pt"]);

export async function updateLanguage(formData: FormData) {
  const language = String(formData.get("language") || "").toLowerCase();

  if (!SUPPORTED.has(language)) {
    redirect("/idioma?actualizado=0");
  }

  const cookieStore = await cookies();
  cookieStore.set("treddit_lang", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  redirect("/idioma?actualizado=1");
}
