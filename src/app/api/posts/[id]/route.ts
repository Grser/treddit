export const runtime = "nodejs";
import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type AuthenticatedUser = Awaited<ReturnType<typeof requireUser>>;

type PostOwnerRow = RowDataPacket & { user: number };
type UserAdminRow = RowDataPacket & { is_admin: number };

type PostPatchBody = {
  op?: unknown;
  value?: unknown;
  description?: unknown;
};

async function deletePost(me: AuthenticatedUser, id: number) {
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [rows] = await db.query<PostOwnerRow[]>("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  const ownerRow = rows[0];
  if (!ownerRow?.user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = Number(ownerRow.user) === me.id;
  let isAdmin = false;
  if (!isOwner) {
    const [adminRows] = await db.query<UserAdminRow[]>("SELECT is_admin FROM Users WHERE id=?", [me.id]);
    isAdmin = Boolean(adminRows[0]?.is_admin);
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.execute("DELETE FROM Posts WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const me = await requireUser();
  const id = Number(params.id);
  return deletePost(me, id);
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const methodOverride = req.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ||
    req.headers.get("content-type")?.includes("multipart/form-data");
  if (!methodOverride) {
    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  const form = await req.formData();
  const op = String(form.get("_method") || "").toUpperCase();
  if (op !== "DELETE") {
    return NextResponse.json({ error: "Operación no soportada" }, { status: 400 });
  }

  const me = await requireUser();
  const id = Number(params.id);
  return deletePost(me, id);
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await requireUser();
  const id = Number(params.id);
  const rawBody = (await req.json().catch(() => null)) as PostPatchBody | null;
  const patchBody = {
    op: typeof rawBody?.op === "string" ? rawBody.op : undefined,
    value: rawBody?.value,
    description: typeof rawBody?.description === "string" ? rawBody.description : undefined,
  };

  const [postRows] = await db.query<PostOwnerRow[]>("SELECT user FROM Posts WHERE id=? LIMIT 1", [id]);
  const postRow = postRows[0];
  if (!postRow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [adminRows] = await db.query<UserAdminRow[]>("SELECT is_admin FROM Users WHERE id=?", [me.id]);
  const isOwner = Number(postRow.user) === me.id;
  const isAdmin = Boolean(adminRows[0]?.is_admin);
  if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  switch (patchBody.op) {
    case "pin":
      await db.execute("UPDATE Users SET pinned_post_id=? WHERE id=?", [id, me.id]);
      break;
    case "unpin":
      await db.execute("UPDATE Users SET pinned_post_id=NULL WHERE id=?", [me.id]);
      break;
    case "who_can_reply":
      await db.execute("UPDATE Posts SET reply_scope=? WHERE id=?", [Number(patchBody.value) || 0, id]);
      break;
    case "feature":
      // marca destacada (si quieres una tabla aparte)
      break;
    default:
      // editar descripción
      if (patchBody.description !== undefined) {
        await db.execute("UPDATE Posts SET description=? WHERE id=?", [patchBody.description.slice(0, 2000), id]);
      }
  }

  return NextResponse.json({ ok: true });
}
