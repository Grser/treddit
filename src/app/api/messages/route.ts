import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import {
  canSendDirectMessage,
  createDirectMessage,
  ensureMessageTables,
} from "@/lib/messages";

type DirectMessagePayload = {
  recipientId?: unknown;
  text?: unknown;
};

function isDirectMessagePayload(value: unknown): value is DirectMessagePayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  return true;
}

export async function POST(req: Request) {
  const me = await requireUser();

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

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

  if (!recipientId || recipientId <= 0) {
    return NextResponse.json({ error: "Destinatario inválido" }, { status: 400 });
  }

  if (recipientId === me.id) {
    return NextResponse.json({ error: "No puedes enviarte mensajes a ti mismo" }, { status: 400 });
  }

  if (!normalizedText) {
    return NextResponse.json({ error: "Escribe un mensaje" }, { status: 400 });
  }

  await ensureMessageTables();

  const allowed = await canSendDirectMessage(me.id, recipientId);
  if (!allowed) {
    return NextResponse.json({ error: "No puedes enviar mensajes a este usuario" }, { status: 403 });
  }

  try {
    const message = await createDirectMessage(me.id, recipientId, normalizedText);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Failed to create direct message", error);
    return NextResponse.json({ error: "No se pudo enviar el mensaje" }, { status: 500 });
  }
}
