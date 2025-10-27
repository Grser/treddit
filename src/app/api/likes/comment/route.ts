import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { likeCommentSchema } from "@/lib/validators";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = likeCommentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  await db.execute(
    "INSERT IGNORE INTO Like_Comments (user, comment, date, visible) VALUES (?, ?, NOW(), 1)",
    [me.id, parsed.data.commentId]
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const me = await requireUser();
  const body = await req.json();
  const parsed = likeCommentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 });

  await db.execute("DELETE FROM Like_Comments WHERE user=? AND comment=?", [me.id, parsed.data.commentId]);
  return NextResponse.json({ ok: true });
}
