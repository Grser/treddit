export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireAdmin, requireUser } from "@/lib/auth";

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const me = await requireUser();
  const id = Number(params.id);
  const [[{ user }]]: any = await db.query("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = user === me.id;
  let isAdmin = false;
  if (!isOwner) {
    const [r] = await db.query("SELECT is_admin FROM Users WHERE id=?", [me.id]);
    isAdmin = !!(r as any[])[0]?.is_admin;
  }
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await db.execute("DELETE FROM Posts WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await requireUser();
  const id = Number(params.id);
  const body = await req.json().catch(() => ({} as any));
  const [[p]]: any = await db.query("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [r] = await db.query("SELECT is_admin FROM Users WHERE id=?", [me.id]);
  const isOwner = p.user === me.id;
  const isAdmin = !!(r as any[])[0]?.is_admin;
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  switch (body.op) {
    case "pin":
      await db.execute("UPDATE Users SET pinned_post_id=? WHERE id=?", [id, me.id]);
      break;
    case "unpin":
      await db.execute("UPDATE Users SET pinned_post_id=NULL WHERE id=?", [me.id]);
      break;
    case "who_can_reply":
      await db.execute("UPDATE Posts SET reply_scope=? WHERE id=?", [Number(body.value) || 0, id]);
      break;
    case "feature":
      // marca destacada (si quieres una tabla aparte)
      break;
    default:
      // editar descripción
      if (typeof body.description === "string") {
        await db.execute("UPDATE Posts SET description=? WHERE id=?", [body.description.slice(0, 2000), id]);
      }
  }

  return NextResponse.json({ ok: true });
}
