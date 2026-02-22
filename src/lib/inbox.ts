import { getCompactTime } from "@/lib/time";
import { isDatabaseConfigured } from "@/lib/db";
import { getDemoInbox } from "@/lib/demoStore";
import { fetchConversationStarters, fetchConversationSummaries, fetchGroupConversations } from "@/lib/messages";

export type InboxEntry = {
  type?: "direct" | "group";
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
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  isFavorite?: boolean;
  isListed?: boolean;
  isBlocked?: boolean;
  isStarter?: boolean;
  groupId?: number;
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
      isArchived: false,
      isMuted: false,
      isPinned: false,
      isFavorite: false,
      isListed: false,
      isBlocked: false,
    }));
  }

  const [rows, starters, groups] = await Promise.all([
    fetchConversationSummaries(userId, { limit: 200 }),
    fetchConversationStarters(userId, { limit: 25 }),
    fetchGroupConversations(userId),
  ]);

  const conversations = rows.map((row) => ({
    type: "direct" as const,
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
    isArchived: row.isArchived,
    isMuted: row.isMuted,
    isPinned: row.isPinned,
    isFavorite: row.isFavorite,
    isListed: row.isListed,
    isBlocked: row.isBlocked,
  }));

  const existing = new Set(conversations.map((entry) => entry.userId));
  const starterEntries = starters
    .filter((row) => !existing.has(row.userId))
    .map((row) => ({
      type: "direct" as const,
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
      isArchived: false,
      isMuted: false,
      isPinned: false,
      isFavorite: false,
      isListed: false,
      isBlocked: false,
      isStarter: true,
    }));

  const groupEntries = groups.map((group) => ({
    type: "group" as const,
    userId: -group.id,
    username: `grupo-${group.id}`,
    nickname: group.name,
    avatar_url: group.avatarUrl,
    lastMessage: group.lastMessage || "Grupo creado",
    lastSenderId: group.lastSenderId,
    createdAt: group.createdAt,
    unreadCount: group.unreadCount,
    isArchived: false,
    isMuted: false,
    isPinned: false,
    isFavorite: false,
    isListed: false,
    isBlocked: false,
    groupId: group.id,
  }));

  return [...groupEntries, ...conversations, ...starterEntries];
}

export { getCompactTime };
