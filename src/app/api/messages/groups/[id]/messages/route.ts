import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { fetchGroupMessages, sendGroupMessage } from "@/lib/messages";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const me = await requireUser();
  const { id } = await params;
  const groupId = Number(id);
  const url = new URL(req.url);
  const afterId = Number(url.searchParams.get("afterId") || "0");

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
  }

  const messages = await fetchGroupMessages(me.id, groupId, afterId);
  return NextResponse.json({ messages });
}

export async function POST(req: Request, { params }: Params) {
  const me = await requireUser();
  const { id } = await params;
  const groupId = Number(id);
  const payload = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof payload?.text === "string" ? payload.text : "";

  if (!Number.isFinite(groupId) || groupId <= 0 || !text.trim()) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const message = await sendGroupMessage(me.id, groupId, text);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_IN_GROUP") {
      return NextResponse.json({ error: "No perteneces a este grupo" }, { status: 403 });
    }
    console.error("Failed to send group message", error);
    return NextResponse.json({ error: "No se pudo enviar" }, { status: 500 });
  }
}
