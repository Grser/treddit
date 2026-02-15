export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setAllowMessagesFromAnyone } from "@/lib/messages";
import { ensureAgeVerificationRequestsTable, ensureUsersAgeColumns } from "@/lib/ageVerification";

export async function POST(req: Request) {
  const me = await requireUser();
  const form = await req.formData();
  const nickname = String(form.get("nickname") || "").slice(0, 80);
  const description = String(form.get("description") || "").slice(0, 200);
  const avatar_url = String(form.get("avatar_url") || "").trim();
  const banner_url = String(form.get("banner_url") || "").trim();
  const location = String(form.get("location") || "").trim();
  const website = String(form.get("website") || "").trim();
  const birthDateRaw = String(form.get("birth_date") || "").trim();
  const show_likes = form.get("show_likes") ? 1 : 0;
  const show_bookmarks = form.get("show_bookmarks") ? 1 : 0;
  const allowMessagesFromAnyone = Boolean(form.get("allow_messages_anyone"));
  const wantsAgeVerification = Boolean(form.get("request_age_verification"));

  await Promise.all([ensureUsersAgeColumns(), ensureAgeVerificationRequestsTable()]);

  const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDateRaw) ? birthDateRaw : null;

  await db.execute(
    "UPDATE Users SET nickname=?, description=?, avatar_url=?, banner_url=?, location=?, website=?, show_likes=?, show_bookmarks=?, birth_date=? WHERE id=?",
    [nickname, description, avatar_url || null, banner_url || null, location || null, website || null, show_likes, show_bookmarks, birthDate, me.id]
  );

  if (wantsAgeVerification) {
    await db.execute(
      `INSERT INTO Age_Verification_Requests (user_id, birth_date)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE birth_date=VALUES(birth_date), created_at=CURRENT_TIMESTAMP`,
      [me.id, birthDate],
    ).catch((error) => {
      console.error("Failed to upsert age verification request", error);
    });
  } else {
    await db.execute("DELETE FROM Age_Verification_Requests WHERE user_id=?", [me.id]).catch(() => {});
  }

  try {
    await setAllowMessagesFromAnyone(me.id, allowMessagesFromAnyone);
  } catch (error) {
    console.error("Failed to update message preferences", error);
  }

  return NextResponse.redirect(new URL(`/u/${me.username}`, process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
