import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { markConversationRead, markGroupConversationRead } from "@/lib/messages";

type ReadPayload = {
  recipientId?: unknown;
  groupId?: unknown;
};

export async function POST(req: Request) {
  const me = await requireUser();

  let payload: ReadPayload = {};
  try {
    payload = (await req.json()) as ReadPayload;
  } catch {
    payload = {};
  }

  const recipientId = Number(payload.recipientId);
  if (Number.isFinite(recipientId) && recipientId > 0 && recipientId !== me.id) {
    await markConversationRead(me.id, recipientId);
    return NextResponse.json({ ok: true });
  }

  const groupId = Number(payload.groupId);
  if (Number.isFinite(groupId) && groupId > 0) {
    await markGroupConversationRead(me.id, groupId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "Destino inválido" }, { status: 400 });
}
