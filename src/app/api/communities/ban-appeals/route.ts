import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureCommunityAclTables } from "@/lib/communityPermissions";
import { ensureCommunityBanAppealsSchema } from "@/lib/communityBanAppeals";

export async function POST(req: Request) {
  await ensureCommunityAclTables();
  await ensureCommunityBanAppealsSchema();

  const me = await requireUser();
  const body = await req.json().catch(() => ({}));
  const communityId = Number(body?.communityId);
  const message = String(body?.message || "").trim();

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }
  if (message.length < 10 || message.length > 500) {
    return NextResponse.json({ error: "La apelación debe tener entre 10 y 500 caracteres" }, { status: 400 });
  }

  const [banRows] = await db.query(
    `SELECT id
     FROM Community_Bans
     WHERE community_id = ?
       AND user_id = ?
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [communityId, me.id],
  );
  if (banRows.length === 0) {
    return NextResponse.json({ error: "No tienes un ban activo en esta comunidad" }, { status: 400 });
  }

  const [existingRows] = await db.query(
    `SELECT id
     FROM Community_Ban_Appeals
     WHERE community_id = ?
       AND user_id = ?
       AND status = 'pending'
     LIMIT 1`,
    [communityId, me.id],
  );
  if (existingRows.length > 0) {
    return NextResponse.json({ error: "Ya tienes una apelación pendiente para esta comunidad" }, { status: 409 });
  }

  await db.execute(
    `INSERT INTO Community_Ban_Appeals (community_id, user_id, message, status)
     VALUES (?, ?, ?, 'pending')`,
    [communityId, me.id, message],
  );

  return NextResponse.json({ ok: true });
}
