export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await requireUser();
  const form = await req.formData();
  const nickname = String(form.get("nickname") || "").slice(0, 80);
  const description = String(form.get("description") || "").slice(0, 200);
  const avatar_url = String(form.get("avatar_url") || "");
  const banner_url = String(form.get("banner_url") || "");
  const location = String(form.get("location") || "");
  const website = String(form.get("website") || "");
  const show_likes = form.get("show_likes") ? 1 : 0;
  const show_bookmarks = form.get("show_bookmarks") ? 1 : 0;

  await db.execute(
    "UPDATE Users SET nickname=?, description=?, avatar_url=?, banner_url=?, location=?, website=?, show_likes=?, show_bookmarks=? WHERE id=?",
    [nickname, description, avatar_url || null, banner_url || null, location || null, website || null, show_likes, show_bookmarks, me.id]
  );

  return NextResponse.redirect(new URL(`/u/${me.username}`, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
