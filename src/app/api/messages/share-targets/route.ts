import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { fetchConversationSummaries, fetchGroupConversations } from "@/lib/messages";

type ShareTarget =
  | {
      type: "direct";
      id: number;
      title: string;
      subtitle: string;
      avatarUrl: string | null;
    }
  | {
      type: "group";
      id: number;
      title: string;
      subtitle: string;
      avatarUrl: string | null;
    };

export async function GET() {
  const me = await requireUser();

  const [conversations, groups] = await Promise.all([
    fetchConversationSummaries(me.id, { limit: 20 }),
    fetchGroupConversations(me.id),
  ]);

  const directTargets: ShareTarget[] = conversations.map((row) => ({
    type: "direct",
    id: row.userId,
    title: row.nickname || row.username,
    subtitle: `@${row.username}`,
    avatarUrl: row.avatar_url,
  }));

  const groupTargets: ShareTarget[] = groups.map((group) => ({
    type: "group",
    id: group.id,
    title: group.name,
    subtitle: "Grupo",
    avatarUrl: group.avatarUrl,
  }));

  return NextResponse.json({ items: [...groupTargets, ...directTargets] });
}
