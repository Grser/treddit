import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2";

import { getSessionUser, requireUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox, getDemoUnreadCount } from "@/lib/demoStore";

type InboxRow = RowDataPacket & {
  id: number;
  text: string;
  created_at: Date | string;
};

type SummaryResponse = {
  unread: number;
  total: number;
  latest: string | null;
};

async function loadInboxSummary(userId: number): Promise<InboxRow[]> {
  const [rows] = await db.query<InboxRow[]>(
    `
    SELECT c.id, c.text, c.created_at
    FROM Comments c
    JOIN Posts p ON p.id = c.post
    WHERE p.user = ? AND c.user <> ?
    ORDER BY c.created_at DESC
    LIMIT 40
    `,
    [userId, userId],
  );
  return rows;
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json<SummaryResponse>(
      { unread: 0, total: 0, latest: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const cookieStore = cookies();
  const lastSeenValue = cookieStore.get("messages_last_seen")?.value;
  const lastSeen = lastSeenValue ? Number(lastSeenValue) : 0;

  if (!isDatabaseConfigured()) {
    const entries = getDemoInbox(me.id);
    const unread = getDemoUnreadCount(me.id, lastSeen || undefined);
    const latest = entries[0]?.created_at ?? null;
    return NextResponse.json<SummaryResponse>(
      { unread, total: entries.length, latest },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await loadInboxSummary(me.id);
  const latestDate = rows[0]?.created_at ? new Date(rows[0].created_at).toISOString() : null;
  const unread = lastSeen
    ? rows.filter((row) => new Date(row.created_at).getTime() > lastSeen).length
    : rows.length;

  return NextResponse.json<SummaryResponse>(
    { unread, total: rows.length, latest: latestDate },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST() {
  const me = await requireUser();
  if (!me) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set("messages_last_seen", String(Date.now()), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  return response;
}
