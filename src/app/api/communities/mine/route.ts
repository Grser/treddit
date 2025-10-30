import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ items: [] });
  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, cm.role
     FROM Community_Members cm
     JOIN Communities c ON c.id = cm.community_id
     WHERE cm.user_id = ? AND c.visible = 1
     ORDER BY c.name ASC`,
    [me.id]
  );
  return NextResponse.json({ items: rows });
}
