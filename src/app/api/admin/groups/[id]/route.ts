export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const groupId = Number(id);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Grupo inválido" }, { status: 400 });
  }

  const form = await req.formData();
  const op = String(form.get("op") || "");

  if (op !== "delete") {
    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  await db.execute("DELETE FROM Direct_Message_Groups WHERE id=?", [groupId]);

  const baseUrl = await getRequestBaseUrl();
  return NextResponse.redirect(new URL("/admin/groups", baseUrl));
}
