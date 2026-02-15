import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { markConversationRead } from "@/lib/messages";

type ReadPayload = {
  recipientId?: unknown;
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
  if (!Number.isFinite(recipientId) || recipientId <= 0 || recipientId === me.id) {
    return NextResponse.json({ ok: false, error: "Destinatario inválido" }, { status: 400 });
  }

  await markConversationRead(me.id, recipientId);
  return NextResponse.json({ ok: true });
}
