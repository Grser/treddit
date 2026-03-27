import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ items: [] });

  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, c.description, cm.role
     FROM Community_Members cm
     JOIN Communities c ON c.id = cm.community_id
     WHERE cm.user_id = ?
       AND c.visible = 1
       AND LOWER(cm.role) IN ('owner','admin','moderator')
     ORDER BY FIELD(LOWER(cm.role), 'owner', 'admin', 'moderator'), c.name ASC`,
    [me.id],
  );

  return NextResponse.json({ items: rows });
}
