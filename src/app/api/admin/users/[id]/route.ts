export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  await requireAdmin();
  const id = Number(params.id);
  const form = await req.formData();
  const op = String(form.get("op") || "");

  switch (op) {
    case "make_admin":   await db.execute("UPDATE Users SET is_admin=1 WHERE id=?", [id]); break;
    case "revoke_admin": await db.execute("UPDATE Users SET is_admin=0 WHERE id=?", [id]); break;
    case "verify":       await db.execute("UPDATE Users SET is_verified=1 WHERE id=?", [id]); break;
    case "unverify":     await db.execute("UPDATE Users SET is_verified=0 WHERE id=?", [id]); break;
    case "hide":         await db.execute("UPDATE Users SET visible=0 WHERE id=?", [id]); break;
    case "show":         await db.execute("UPDATE Users SET visible=1 WHERE id=?", [id]); break;
  }
  return NextResponse.redirect(new URL("/admin/users", process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000/"));
}
