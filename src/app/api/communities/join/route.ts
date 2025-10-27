import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await requireUser();
  const { communityId } = await req.json();
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
