import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getSessionUser, requireUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox, getDemoUnreadCount } from "@/lib/demoStore";
import { fetchConversationSummaries, markAllConversationsRead } from "@/lib/messages";

type SummaryResponse = {
  unread: number;
  total: number;
  latest: string | null;
};

export async function GET() {
  const me = await getSessionUser();
  if (!me) {
    return NextResponse.json<SummaryResponse>(
      { unread: 0, total: 0, latest: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!isDatabaseConfigured()) {
    const cookieStore = await cookies();
    const lastSeenValue = cookieStore.get("messages_last_seen")?.value;
    const lastSeenRaw = lastSeenValue ? Number(lastSeenValue) : 0;
    const lastSeen = Number.isFinite(lastSeenRaw) && lastSeenRaw > 0 ? lastSeenRaw : 0;
    const entries = getDemoInbox(me.id, lastSeen || undefined);
    const unread = getDemoUnreadCount(me.id, lastSeen || undefined);
    const latest = entries[0]?.created_at ?? null;
    return NextResponse.json<SummaryResponse>(
      { unread, total: entries.length, latest },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const summaries = await fetchConversationSummaries(me.id, { limit: 40 });
  const latestDate = summaries[0]?.createdAt ?? null;
  const unread = summaries.reduce((acc, row) => acc + (Number.isFinite(row.unreadCount) ? row.unreadCount : 0), 0);

  return NextResponse.json<SummaryResponse>(
    { unread, total: summaries.length, latest: latestDate },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST() {
  const me = await requireUser();
  if (!me) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set("messages_last_seen", String(Date.now()), {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
    return response;
  }

  await markAllConversationsRead(me.id);
  return NextResponse.json({ ok: true });
}
