import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  canSendDirectMessage,
  createDirectMessage,
  ensureMessageTables,
  fetchConversationMessages,
  type DirectMessageAttachment,
} from "@/lib/messages";

type DirectMessagePayload = {
  recipientId?: unknown;
  text?: unknown;
  attachments?: unknown;
  replyToMessageId?: unknown;
};

function isDirectMessagePayload(value: unknown): value is DirectMessagePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const me = await requireUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (!isDirectMessagePayload(payload)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const recipientId = Number(payload.recipientId);
  const textValue = typeof payload.text === "string" ? payload.text : "";
  const normalizedText = textValue.trim();
  const attachmentsRaw = Array.isArray(payload.attachments) ? payload.attachments : [];
  const replyToMessageId = Number(payload.replyToMessageId);
  const attachments: DirectMessageAttachment[] = attachmentsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as Record<string, unknown>;
      const url = typeof data.url === "string" ? data.url.trim() : "";
      const type =
        data.type === "image" || data.type === "audio" || data.type === "video" || data.type === "file"
          ? data.type
          : "file";
      const name = typeof data.name === "string" ? data.name : null;
      const durationSecondsRaw = Number(data.durationSeconds);
      const durationSeconds = Number.isFinite(durationSecondsRaw)
        ? Math.max(0, Math.min(Math.round(durationSecondsRaw), 3600))
        : null;
      if (!url) return null;
      return { url, type, name, durationSeconds } satisfies DirectMessageAttachment;
    })
    .filter(Boolean) as DirectMessageAttachment[];

  const hasAudioOverLimit = attachments.some(
    (item) => item.type === "audio" && typeof item.durationSeconds === "number" && item.durationSeconds > 60,
  );
  if (hasAudioOverLimit) {
    return NextResponse.json({ error: "El audio no puede durar más de 1 minuto" }, { status: 400 });
  }

  if (!recipientId || recipientId <= 0) {
    return NextResponse.json({ error: "Destinatario inválido" }, { status: 400 });
  }

  if (recipientId === me.id) {
    return NextResponse.json({ error: "No puedes enviarte mensajes a ti mismo" }, { status: 400 });
  }

  if (!normalizedText && attachments.length === 0) {
    return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });
  }

  if (isDatabaseConfigured()) {
    await ensureMessageTables();
  }

  const allowed = await canSendDirectMessage(me.id, recipientId);
  if (!allowed) {
    return NextResponse.json({ error: "No puedes enviar mensajes a este usuario" }, { status: 403 });
  }

  try {
    const message = await createDirectMessage(
      me,
      recipientId,
      normalizedText,
      attachments,
      Number.isFinite(replyToMessageId) && replyToMessageId > 0 ? replyToMessageId : null,
    );
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to create direct message", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}


export async function GET(req: Request) {
  const me = await requireUser();
  const url = new URL(req.url);
  const recipientId = Number(url.searchParams.get("recipientId"));
  const afterId = Number(url.searchParams.get("afterId") || "0");
  const limit = Number(url.searchParams.get("limit") || "60");

  if (!Number.isFinite(recipientId) || recipientId <= 0) {
    return NextResponse.json({ error: "Destinatario inválido" }, { status: 400 });
  }

  if (recipientId === me.id) {
    return NextResponse.json({ messages: [] });
  }

  if (isDatabaseConfigured()) {
    await ensureMessageTables();
  }

  const canMessage = await canSendDirectMessage(me.id, recipientId);
  if (!canMessage) {
    return NextResponse.json({ error: "No puedes ver esta conversación" }, { status: 403 });
  }

  try {
    const messages = await fetchConversationMessages(me.id, recipientId, limit, Math.max(0, afterId));
    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Failed to fetch direct messages", error);
    return NextResponse.json({ error: "No se pudo cargar la conversación" }, { status: 500 });
  }
}
