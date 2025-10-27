import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const postId = Number(context.params.id);
  const [rows] = await db.query(
    `SELECT c.id, c.text, c.created_at, c.comment as parentId, u.username, u.nickname
     FROM Comments c
     JOIN Users u ON u.id = c.user
     WHERE c.post = ?
     ORDER BY c.created_at ASC
    `,
    [postId]
  );
  return NextResponse.json({ items: rows });
}
