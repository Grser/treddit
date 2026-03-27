import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ensureCommunityAclTables } from "@/lib/communityPermissions";

export async function POST(req: Request) {
  await ensureCommunityAclTables();
  const me = await requireUser();
  const { communityId } = await req.json();
  const [banRows] = await db.query(
    `SELECT id
     FROM Community_Bans
     WHERE community_id = ?
       AND user_id = ?
       AND (expires_at IS NULL OR expires_at > NOW())
     LIMIT 1`,
    [communityId, me.id],
  );
  if (banRows.length > 0) {
    return NextResponse.json({ error: "No puedes unirte: estás baneado de esta comunidad" }, { status: 403 });
  }
  await db.execute(
    "INSERT IGNORE INTO Community_Members (community_id, user_id, role) VALUES (?, ?, 'member')",
    [communityId, me.id]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const { communityId } = await req.json();
  await db.execute(
    "DELETE FROM Community_Members WHERE community_id=? AND user_id=?",
    [communityId, me.id]
  );
  return NextResponse.json({ ok: true });
}
