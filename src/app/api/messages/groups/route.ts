import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createGroupConversation, fetchGroupConversations } from "@/lib/messages";

export async function GET() {
  const me = await requireUser();
  const groups = await fetchGroupConversations(me.id);
  return NextResponse.json({ groups });
}

export async function POST(req: Request) {
  const me = await requireUser();
  const payload = await req.json().catch(() => null) as { name?: unknown; description?: unknown; avatarUrl?: unknown; memberIds?: unknown } | null;
  const name = typeof payload?.name === "string" ? payload.name : "";
  const description = typeof payload?.description === "string" ? payload.description : "";
  const avatarUrl = typeof payload?.avatarUrl === "string" ? payload.avatarUrl : "";
  const memberIds = Array.isArray(payload?.memberIds)
    ? payload?.memberIds.filter((value): value is number => typeof value === "number")
    : [];

  if (!name.trim()) {
    return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
  }

  if (memberIds.length === 0) {
    return NextResponse.json({ error: "Agrega al menos 1 integrante" }, { status: 400 });
  }

  const placeholders = memberIds.map(() => "?").join(",");
  const [rows] = await db.query<Array<{ id: number; username: string }>>(
    `SELECT id, username FROM Users WHERE id IN (${placeholders})`,
    memberIds,
  );
  const ids = rows.map((row) => Number(row.id)).filter((id) => id !== me.id);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No encontramos usuarios válidos" }, { status: 400 });
  }

  try {
    const groupId = await createGroupConversation(me.id, name, ids, { description, avatarUrl });
    return NextResponse.json({ groupId }, { status: 201 });
  } catch (error) {
    console.error("Failed to create group", error);
    return NextResponse.json({ error: "No se pudo crear el grupo" }, { status: 500 });
  }
}
