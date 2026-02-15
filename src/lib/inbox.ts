import { getCompactTime } from "@/lib/time";
import { isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox } from "@/lib/demoStore";
import { fetchConversationStarters, fetchConversationSummaries } from "@/lib/messages";

export type InboxEntry = {
  userId: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin?: boolean;
  is_verified?: boolean;
  lastMessage: string;
  lastSenderId: number;
  createdAt: string;
  unreadCount: number;
  isStarter?: boolean;
};

export async function loadInbox(userId: number): Promise<InboxEntry[]> {
  if (!isDatabaseConfigured()) {
    return getDemoInbox(userId).map((entry) => ({
      userId: entry.userId,
      username: entry.username,
      nickname: entry.nickname,
      avatar_url: entry.avatar_url,
      is_admin: entry.is_admin,
      is_verified: entry.is_verified,
      lastMessage: entry.lastMessage,
      lastSenderId: entry.lastSenderId,
      createdAt: entry.created_at,
      unreadCount: entry.unreadCount,
    }));
  }

  const [rows, starters] = await Promise.all([
    fetchConversationSummaries(userId, { limit: 25 }),
    fetchConversationStarters(userId, { limit: 25 }),
  ]);

  const conversations = rows.map((row) => ({
    userId: row.userId,
    username: row.username,
    nickname: row.nickname,
    avatar_url: row.avatar_url,
    is_admin: row.is_admin,
    is_verified: row.is_verified,
    lastMessage: row.lastMessage,
    lastSenderId: row.lastSenderId,
    createdAt: row.createdAt,
    unreadCount: row.unreadCount,
  }));

  const existing = new Set(conversations.map((entry) => entry.userId));
  const starterEntries = starters
    .filter((row) => !existing.has(row.userId))
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      nickname: row.nickname,
      avatar_url: row.avatar_url,
      is_admin: row.is_admin,
      is_verified: row.is_verified,
      lastMessage: "Inicia una conversación",
      lastSenderId: 0,
      createdAt: row.createdAt,
      unreadCount: 0,
      isStarter: true,
    }));

  return [...conversations, ...starterEntries];
}

export { getCompactTime };
