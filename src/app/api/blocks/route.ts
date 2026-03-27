import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { blockUser, hasBlocked, unblockUser } from "@/lib/blocks";

type BlockPayload = {
  userId?: unknown;
};

function parseUserId(payload: BlockPayload): number {
  return Number(payload.userId);
}

export async function POST(req: Request) {
  const me = await requireUser();
  const payload = (await req.json().catch(() => ({}))) as BlockPayload;
  const userId = parseUserId(payload);
  if (!Number.isFinite(userId) || userId <= 0 || userId === me.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }
  await blockUser(me.id, userId);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const payload = (await req.json().catch(() => ({}))) as BlockPayload;
  const userId = parseUserId(payload);
  if (!Number.isFinite(userId) || userId <= 0 || userId === me.id) {
    return NextResponse.json({ error: "Usuario inválido" }, { status: 400 });
  }
  await unblockUser(me.id, userId);
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const me = await requireUser();
  const url = new URL(req.url);
  const userId = Number(url.searchParams.get("userId") || 0);
  if (!Number.isFinite(userId) || userId <= 0 || userId === me.id) {
    return NextResponse.json({ blocked: false });
  }
  const blocked = await hasBlocked(me.id, userId);
  return NextResponse.json({ blocked });
}
