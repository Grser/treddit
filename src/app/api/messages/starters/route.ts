import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { fetchConversationStarters } from "@/lib/messages";

export async function GET(request: NextRequest) {
  const me = await requireUser();
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const starters = await fetchConversationStarters(me.id, { limit: 50, query });

  return NextResponse.json({
    items: starters.map((starter) => ({
      userId: starter.userId,
      username: starter.username,
      nickname: starter.nickname,
      avatar_url: starter.avatar_url,
      is_admin: starter.is_admin,
      is_verified: starter.is_verified,
      lastMessage: "Inicia una conversación",
      lastSenderId: 0,
      createdAt: starter.createdAt,
      unreadCount: 0,
      isStarter: true,
      type: "direct",
    })),
  });
}
