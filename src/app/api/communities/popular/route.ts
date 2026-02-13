import { NextResponse } from "next/server";

import { db, isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ items: [] });
  }

  const [rows] = await db.query(
    `SELECT c.id, c.slug, c.name, COUNT(cm.user_id) as members
     FROM Communities c
     LEFT JOIN Community_Members cm ON cm.community_id = c.id
     WHERE c.visible = 1
     GROUP BY c.id
     ORDER BY members DESC, c.name ASC
     LIMIT 10`
  );
  return NextResponse.json({ items: rows });
}
