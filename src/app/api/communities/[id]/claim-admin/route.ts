import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

type Params = {
  params: Promise<{ id: string }>;
};

type AdminRow = RowDataPacket & {
  is_admin: number;
};

export async function POST(_: Request, { params }: Params) {
  const me = await requireUser();
  const { id } = await params;
  const communityId = Number(id);

  if (!Number.isInteger(communityId) || communityId <= 0) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const [adminRows] = await db.query<AdminRow[]>("SELECT is_admin FROM Users WHERE id=? LIMIT 1", [me.id]);
  if (!adminRows[0]?.is_admin) {
    return NextResponse.json({ error: "Solo administradores globales" }, { status: 403 });
  }

  await db.execute(
    `INSERT INTO Community_Members (community_id, user_id, role)
     VALUES (?, ?, 'admin')
     ON DUPLICATE KEY UPDATE role = CASE WHEN role='owner' THEN role ELSE 'admin' END`,
    [communityId, me.id]
  );

  return NextResponse.json({ ok: true });
}
