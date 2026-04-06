export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminPermission } from "@/lib/auth";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

async function hasVerifiedColumn() {
  const [rows] = await db.query("SHOW COLUMNS FROM Communities LIKE 'is_verified'");
  return Array.isArray(rows) && rows.length > 0;
}

async function ensureVerifiedColumn() {
  if (await hasVerifiedColumn()) return;
  try {
    await db.execute("ALTER TABLE Communities ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0");
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
    if (code !== "ER_DUP_FIELDNAME") {
      throw error;
    }
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdminPermission("manage_communities");
  const { id } = await params;
  const communityId = Number(id);
  if (!communityId) {
    return NextResponse.json({ error: "Comunidad inválida" }, { status: 400 });
  }

  const form = await req.formData();
  const op = String(form.get("op") || "");

  switch (op) {
    case "hide":
    case "suspend":
      await db.execute("UPDATE Communities SET visible=0 WHERE id=?", [communityId]);
      break;
    case "show":
      await db.execute("UPDATE Communities SET visible=1 WHERE id=?", [communityId]);
      break;
    case "delete":
      await db.execute("DELETE FROM Communities WHERE id=?", [communityId]);
      break;
    case "verify":
      await ensureVerifiedColumn();
      await db.execute("UPDATE Communities SET is_verified=1 WHERE id=?", [communityId]);
      break;
    case "unverify":
      await ensureVerifiedColumn();
      await db.execute("UPDATE Communities SET is_verified=0 WHERE id=?", [communityId]);
      break;
    default:
      return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  const baseUrl = await getRequestBaseUrl();
  return NextResponse.redirect(new URL("/admin/communities", baseUrl));
}
