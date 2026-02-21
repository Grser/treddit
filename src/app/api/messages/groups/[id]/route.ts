import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchGroupDetails, updateGroupConversation } from "@/lib/messages";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
  }
  const group = await fetchGroupDetails(me.id, groupId);
  if (!group) {
    return NextResponse.json({ error: "Sin acceso" }, { status: 404 });
  }
  return NextResponse.json({ group });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const groupId = Number(id);

  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
  }

  const payload = await req.json().catch(() => null) as {
    name?: unknown;
    description?: unknown;
    avatarUrl?: unknown;
    addMemberIds?: unknown;
    removeMemberIds?: unknown;
  } | null;

  const addMemberIds = Array.isArray(payload?.addMemberIds)
    ? payload.addMemberIds.filter((value): value is number => typeof value === "number")
    : [];
  const removeMemberIds = Array.isArray(payload?.removeMemberIds)
    ? payload.removeMemberIds.filter((value): value is number => typeof value === "number")
    : [];

  if (addMemberIds.length > 0) {
    const placeholders = addMemberIds.map(() => "?").join(",");
    const [rows] = await db.query<Array<{ id: number }>>(`SELECT id FROM Users WHERE id IN (${placeholders})`, addMemberIds);
    const validIds = new Set(rows.map((row) => Number(row.id)));
    for (let index = addMemberIds.length - 1; index >= 0; index -= 1) {
      if (!validIds.has(addMemberIds[index])) addMemberIds.splice(index, 1);
    }
  }

  try {
    const group = await updateGroupConversation(me.id, groupId, {
      name: typeof payload?.name === "string" ? payload.name : undefined,
      description: typeof payload?.description === "string" ? payload.description : undefined,
      avatarUrl: typeof payload?.avatarUrl === "string" ? payload.avatarUrl : undefined,
      addMemberIds,
      removeMemberIds,
    });

    if (!group) {
      return NextResponse.json({ error: "Sin acceso" }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_IN_GROUP") {
      return NextResponse.json({ error: "Sin acceso" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_GROUP_NAME") {
      return NextResponse.json({ error: "Nombre inválido" }, { status: 400 });
    }
    console.error("Failed to update group", error);
    return NextResponse.json({ error: "No se pudo actualizar el grupo" }, { status: 500 });
  }
}
