import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { markDirectAttachmentAsViewed } from "@/lib/messages";

type ViewAttachmentPayload = {
  messageId?: unknown;
  attachmentUrl?: unknown;
};

export async function POST(req: Request) {
  const me = await requireUser();
  const payload = await req.json().catch(() => null) as ViewAttachmentPayload | null;

  const messageId = Number(payload?.messageId);
  const attachmentUrl = typeof payload?.attachmentUrl === "string" ? payload.attachmentUrl.trim() : "";

  if (!Number.isFinite(messageId) || messageId <= 0 || !attachmentUrl) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  try {
    const result = await markDirectAttachmentAsViewed(me.id, messageId, attachmentUrl);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "MESSAGE_NOT_FOUND") {
        return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
      }
      if (error.message === "FORBIDDEN") {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }
    console.error("Failed to mark attachment as viewed", error);
    return NextResponse.json({ error: "No se pudo registrar la vista" }, { status: 500 });
  }
}
