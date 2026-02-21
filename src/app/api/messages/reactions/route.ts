import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { setDirectMessageReaction } from "@/lib/messages";

export async function POST(req: Request) {
  const me = await requireUser();
  const payload = await req.json().catch(() => null) as { messageId?: unknown; emoji?: unknown } | null;
  const messageId = Number(payload?.messageId);
  const emoji = typeof payload?.emoji === "string" ? payload.emoji : "";

  if (!Number.isFinite(messageId) || messageId <= 0 || !emoji.trim()) {
    return NextResponse.json({ error: "Reacción inválida" }, { status: 400 });
  }

  try {
    await setDirectMessageReaction(me.id, messageId, emoji);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to set reaction", error);
    return NextResponse.json({ error: "No se pudo guardar la reacción" }, { status: 500 });
  }
}
