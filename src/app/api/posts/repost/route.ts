export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const me = await requireUser();
  const { postId, action } = await req.json().catch(() => ({}));
  if (!postId) return NextResponse.json({ error: "postId requerido" }, { status: 400 });

  try {
    if (action === "unrepost") {
      await db.execute("DELETE FROM Reposts WHERE user_id=? AND post_id=?", [me.id, postId]);
      return NextResponse.json({ ok: true, reposted: false });
    }
    await db.execute(
      "INSERT IGNORE INTO Reposts (user_id, post_id, created_at) VALUES (?, ?, NOW())",
      [me.id, postId]
    );
    return NextResponse.json({ ok: true, reposted: true });
  } catch {
    return NextResponse.json({ error: "no se pudo actualizar el repost" }, { status: 500 });
  }
}
