export const runtime = "nodejs";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ensureAgeVerificationRequestsTable, ensureUsersAgeColumns } from "@/lib/ageVerification";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: userId } = await params;
  const id = Number(userId);
  const form = await req.formData();
  const op = String(form.get("op") || "");
  const baseUrl = new URL("/", req.url);
  await Promise.all([ensureUsersAgeColumns(), ensureAgeVerificationRequestsTable()]);

  switch (op) {
    case "make_admin":   await db.execute("UPDATE Users SET is_admin=1 WHERE id=?", [id]); break;
    case "revoke_admin": await db.execute("UPDATE Users SET is_admin=0 WHERE id=?", [id]); break;
    case "verify":       await db.execute("UPDATE Users SET is_verified=1 WHERE id=?", [id]); break;
    case "unverify":     await db.execute("UPDATE Users SET is_verified=0 WHERE id=?", [id]); break;
    case "hide":         await db.execute("UPDATE Users SET visible=0 WHERE id=?", [id]); break;
    case "show":         await db.execute("UPDATE Users SET visible=1 WHERE id=?", [id]); break;
    case "approve_age_verification":
      await db.execute("UPDATE Users SET is_age_verified=1 WHERE id=?", [id]);
      await db.execute("DELETE FROM Age_Verification_Requests WHERE user_id=?", [id]);
      break;
    case "reject_age_verification":
      await db.execute("UPDATE Users SET is_age_verified=0 WHERE id=?", [id]);
      await db.execute("DELETE FROM Age_Verification_Requests WHERE user_id=?", [id]);
      break;
    case "set_password": {
      const newPassword = String(form.get("password") || "").trim();
      if (newPassword.length < 6) {
        return NextResponse.redirect(new URL("/admin/users?password=error", baseUrl));
      }
      const passwordHash = await hash(newPassword, 10);
      await db.execute("UPDATE Users SET password=? WHERE id=?", [passwordHash, id]);
      return NextResponse.redirect(new URL("/admin/users?password=updated", baseUrl));
    }
  }
  return NextResponse.redirect(new URL("/admin/users", baseUrl));
}
