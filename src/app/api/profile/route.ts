export const runtime = "nodejs";
import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { setAllowMessagesFromAnyone } from "@/lib/messages";
import { ensureAgeVerificationRequestsTable, ensureUsersAgeColumns } from "@/lib/ageVerification";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

type ProfileStatusRow = RowDataPacket & {
  is_age_verified: number;
};

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
  const countryOfOriginRaw = String(form.get("country_of_origin") || "").trim();
  const idDocumentUrlRaw = String(form.get("id_document_url") || "").trim();
  const show_likes = form.get("show_likes") ? 1 : 0;
  const show_bookmarks = form.get("show_bookmarks") ? 1 : 0;
  const allowMessagesFromAnyone = Boolean(form.get("allow_messages_anyone"));
  const wantsAgeVerification = Boolean(form.get("request_age_verification"));

  await Promise.all([ensureUsersAgeColumns(), ensureAgeVerificationRequestsTable()]);

  const birthDate = normalizeBirthDate(birthDateRaw);
  const countryOfOrigin = countryOfOriginRaw.slice(0, 120) || null;
  const idDocumentUrl = idDocumentUrlRaw || null;

  await db.execute(
    "UPDATE Users SET nickname=?, description=?, avatar_url=?, banner_url=?, location=?, website=?, show_likes=?, show_bookmarks=?, birth_date=?, country_of_origin=? WHERE id=?",
    [nickname, description, avatar_url || null, banner_url || null, location || null, website || null, show_likes, show_bookmarks, birthDate, countryOfOrigin, me.id]
  );

  const [statusRows] = await db.query<ProfileStatusRow[]>("SELECT is_age_verified FROM Users WHERE id=? LIMIT 1", [me.id]);
  const alreadyAgeVerified = Boolean(statusRows[0]?.is_age_verified);

  if (!alreadyAgeVerified && wantsAgeVerification) {
    if (!birthDate || !countryOfOrigin || !idDocumentUrl) {
      return NextResponse.json(
        { error: "Para verificar edad debes indicar fecha de nacimiento, país de origen y foto de tu documento." },
        { status: 400 },
      );
    }

    await db.execute(
      `INSERT INTO Age_Verification_Requests (user_id, birth_date, country_of_origin, id_document_url)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE birth_date=VALUES(birth_date), country_of_origin=VALUES(country_of_origin), id_document_url=VALUES(id_document_url), created_at=CURRENT_TIMESTAMP`,
      [me.id, birthDate, countryOfOrigin, idDocumentUrl],
    ).catch((error) => {
      console.error("Failed to upsert age verification request", error);
    });
  } else if (!alreadyAgeVerified && !wantsAgeVerification) {
    await db.execute("DELETE FROM Age_Verification_Requests WHERE user_id=?", [me.id]).catch(() => {});
  }

  try {
    await setAllowMessagesFromAnyone(me.id, allowMessagesFromAnyone);
  } catch (error) {
    console.error("Failed to update message preferences", error);
  }

  const requestBaseUrl = await getRequestBaseUrl();
  return NextResponse.redirect(new URL(`/u/${me.username}`, requestBaseUrl));
}

function normalizeBirthDate(raw: string) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const latamFormat = raw.match(/^(\d{2})[-\/](\d{2})[-\/](\d{4})$/);
  if (!latamFormat) return null;

  const [, day, month, year] = latamFormat;
  const normalized = `${year}-${month}-${day}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

