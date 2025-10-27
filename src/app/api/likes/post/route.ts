export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const me = await requireUser();
  const { postId, action } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: "postId requerido" }, { status: 400 });

  try {
    if (action === "unlike") {
      await db.execute("DELETE FROM Like_Posts WHERE user=? AND post=?", [me.id, postId]);
      return NextResponse.json({ ok: true, liked: false });
    }

    await db.execute(
      "INSERT IGNORE INTO Like_Posts (user, post, date, visible) VALUES (?, ?, NOW(), 1)",
      [me.id, postId]
    );
    return NextResponse.json({ ok: true, liked: true });
  } catch (e) {
    return NextResponse.json({ error: "no se pudo actualizar el like" }, { status: 500 });
  }
}
