import { isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox } from "@/lib/demoStore";
import { fetchConversationSummaries } from "@/lib/messages";

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
};

export async function loadInbox(userId: number, lastSeen: number): Promise<InboxEntry[]> {
  if (!isDatabaseConfigured()) {
    return getDemoInbox(userId, lastSeen || undefined).map((entry) => ({
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

  const rows = await fetchConversationSummaries(userId, { limit: 40, lastSeen });
  return rows.map((row) => ({
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
}

export function getCompactTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "ahora";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return "ahora";
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} d`;
  return date.toLocaleDateString();
}
