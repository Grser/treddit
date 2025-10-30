export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const communityId = Number(params.id);
  if (!communityId) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const form = await req.formData();
  const op = String(form.get("op") || "");

  switch (op) {
    case "hide":
      await db.execute("UPDATE Communities SET visible=0 WHERE id=?", [communityId]);
      break;
    case "show":
      await db.execute("UPDATE Communities SET visible=1 WHERE id=?", [communityId]);
      break;
    default:
      return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  return NextResponse.redirect(new URL("/admin/communities", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"));
}
