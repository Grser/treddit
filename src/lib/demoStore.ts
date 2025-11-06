import { getDemoPosts } from "@/data/demoPosts";
import type { Post } from "@/components/PostCard";
import type { SessionUser } from "@/lib/auth";
import type { DirectMessageEntry } from "@/lib/messages";

type DemoUser = {
  id: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_verified: boolean;
};

type DemoInboxEntry = {
  id: number;
  text: string;
  created_at: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  postId: number;
  is_admin: boolean;
  is_verified: boolean;
};

type DemoConversation = {
  participantId: number;
  messages: DirectMessageEntry[];
};

type DemoStore = {
  users: Map<number, DemoUser>;
  usernameIndex: Map<string, number>;
  posts: Post[];
  nextPostId: number;
  inbox: Map<number, DemoInboxEntry[]>;
  conversations: Map<string, DemoConversation>;
};

const globalForDemo = globalThis as unknown as { __tredditDemoStore?: DemoStore };

function seedUsers(): DemoUser[] {
  return [
    {
      id: 1,
      username: "demo_catlover",
      nickname: "Gatitos FTW",
      avatar_url: "/demo-reddit.png",
      is_admin: false,
      is_verified: true,
    },
    {
      id: 2,
      username: "techmaven",
      nickname: "Ana Tech",
      avatar_url: null,
      is_admin: false,
      is_verified: false,
    },
    {
      id: 3,
      username: "treddit_admin",
      nickname: "Equipo Treddit",
      avatar_url: "/demo-reddit.png",
      is_admin: true,
      is_verified: true,
    },
    {
      id: 4,
      username: "isaac",
      nickname: "Grser",
      avatar_url: "/demo-reddit.png",
      is_admin: false,
      is_verified: false,
    },
    {
      id: 5,
      username: "pixel_artist",
      nickname: "Arte en pixeles",
      avatar_url: null,
      is_admin: false,
      is_verified: false,
    },
  ];
}

function createInitialStore(): DemoStore {
  const storeUsers = seedUsers();
  const users = new Map<number, DemoUser>();
  const usernameIndex = new Map<string, number>();
  storeUsers.forEach((user) => {
    users.set(user.id, user);
    usernameIndex.set(user.username.toLowerCase(), user.id);
  });

  const seededPosts = getDemoPosts(10).map<Post>((post) => ({
    ...post,
    nickname: post.nickname ?? users.get(post.user)?.nickname ?? null,
    avatar_url: post.avatar_url ?? users.get(post.user)?.avatar_url ?? null,
    likes: post.likes ?? Math.floor(Math.random() * 200),
    comments: post.comments ?? Math.floor(Math.random() * 30),
    reposts: post.reposts ?? Math.floor(Math.random() * 10),
    views: post.views ?? Math.floor(Math.random() * 5000 + 200),
    likedByMe: false,
    repostedByMe: false,
    hasPoll: Boolean(post.hasPoll),
    reply_scope: post.reply_scope ?? 0,
    isOwner: false,
    isAdminViewer: false,
    community: post.community ?? null,
  }));

  const inbox = new Map<number, DemoInboxEntry[]>();
  const now = Date.now();
  const sampleInbox: DemoInboxEntry[] = [
    {
      id: 101,
      text: "¡Me encantó tu último post! ¿Vas a compartir más contenido así?",
      created_at: new Date(now - 10 * 60 * 1000).toISOString(),
      username: "techmaven",
      nickname: "Ana Tech",
      avatar_url: null,
      postId: seededPosts[0]?.id ?? 1,
      is_admin: false,
      is_verified: false,
    },
    {
      id: 102,
      text: "Hola 👋 ¿podrías explicar un poco más sobre el segundo punto?",
      created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      username: "pixel_artist",
      nickname: "Arte en pixeles",
      avatar_url: null,
      postId: seededPosts[1]?.id ?? 2,
      is_admin: false,
      is_verified: false,
    },
    {
      id: 103,
      text: "Somos el equipo de Treddit, ¡gracias por participar en la beta!",
      created_at: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
      username: "treddit_admin",
      nickname: "Equipo Treddit",
      avatar_url: "/demo-reddit.png",
      postId: seededPosts[2]?.id ?? 3,
      is_admin: true,
      is_verified: true,
    },
  ];
  inbox.set(4, sampleInbox);

  const conversations = new Map<string, DemoConversation>();
  const conversationKey = (a: number, b: number) => [Math.min(a, b), Math.max(a, b)].join(":");
  const baseMessages: DirectMessageEntry[] = [
    {
      id: 1,
      senderId: 2,
      recipientId: 4,
      text: "¡Hola! Te mando las referencias del diseño que mencioné.",
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      sender: {
        username: "techmaven",
        nickname: "Ana Tech",
        avatar_url: null,
        is_admin: false,
        is_verified: false,
      },
    },
    {
      id: 2,
      senderId: 4,
      recipientId: 2,
      text: "Perfecto, muchas gracias. ¿Tienes también el video?",
      createdAt: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(),
      sender: {
        username: "isaac",
        nickname: "Grser",
        avatar_url: "/demo-reddit.png",
        is_admin: false,
        is_verified: false,
      },
    },
  ];
  conversations.set(conversationKey(2, 4), {
    participantId: 2,
    messages: baseMessages,
  });

  return {
    users,
    usernameIndex,
    posts: seededPosts,
    nextPostId: seededPosts.reduce((acc, post) => Math.max(acc, post.id), 100) + 1,
    inbox,
    conversations,
  };
}

function ensureStore(): DemoStore {
  if (!globalForDemo.__tredditDemoStore) {
    globalForDemo.__tredditDemoStore = createInitialStore();
  }
  return globalForDemo.__tredditDemoStore;
}

function normalizeSessionUser(user: SessionUser): DemoUser {
  const store = ensureStore();
  let existing = store.users.get(user.id);
  if (!existing) {
    existing = {
      id: user.id,
      username: user.username,
      nickname: user.username,
      avatar_url: user.avatar_url ?? null,
      is_admin: Boolean(user.is_admin),
      is_verified: Boolean(user.is_verified),
    };
    store.users.set(user.id, existing);
    store.usernameIndex.set(user.username.toLowerCase(), user.id);
  }
  return existing;
}

export function getDemoFeed(options: {
  limit: number;
  cursor?: number | null;
  userId?: number;
  username?: string;
  tag?: string;
  filter?: string;
}): { items: Post[]; nextCursor: string | null } {
  const store = ensureStore();
  const { limit, cursor, userId, username, tag, filter } = options;
  let list = [...store.posts].sort((a, b) => b.id - a.id);
  if (cursor) {
    list = list.filter((post) => post.id < cursor);
  }
  if (userId) {
    list = list.filter((post) => post.user === userId);
  }
  if (username) {
    const id = store.usernameIndex.get(username.toLowerCase());
    if (id) {
      list = list.filter((post) => post.user === id);
    } else {
      list = [];
    }
  }
  if (tag) {
    const lower = tag.toLowerCase();
    list = list.filter((post) => post.description?.toLowerCase().includes(lower));
  }
  if (filter === "media") {
    list = list.filter((post) => Boolean(post.mediaUrl));
  }

  const items = list.slice(0, limit);
  const nextCursor = list.length > limit ? String(items[items.length - 1].id) : null;
  return { items, nextCursor };
}

export function createDemoPost(user: SessionUser, payload: {
  description: string | null;
  mediaUrl: string | null;
  poll: null;
  communityId: number | null;
}): { id: number } {
  const store = ensureStore();
  const author = normalizeSessionUser(user);
  const id = store.nextPostId++;
  const created_at = new Date().toISOString();
  const tags = extractHashtags(payload.description || "");
  const newPost: Post = {
    id,
    user: author.id,
    username: author.username,
    nickname: author.nickname,
    avatar_url: author.avatar_url,
    description: payload.description,
    mediaUrl: payload.mediaUrl,
    created_at,
    likes: 0,
    comments: 0,
    reposts: 0,
    likedByMe: false,
    repostedByMe: false,
    views: Math.floor(Math.random() * 200 + 50),
    hasPoll: false,
    reply_scope: 0,
    is_admin: author.is_admin,
    is_verified: author.is_verified,
    community: null,
  };

  if (tags.length) {
    // boost visibility artificially
    newPost.views = Math.max(newPost.views, tags.length * 120);
  }

  store.posts = [newPost, ...store.posts];
  return { id };
}

export function getDemoTrendingTags(max = 5): { tag: string; count: number; views: number }[] {
  const store = ensureStore();
  const freq = new Map<string, { count: number; views: number }>();
  store.posts.forEach((post) => {
    extractHashtags(post.description || "").forEach((tag) => {
      const current = freq.get(tag) || { count: 0, views: 0 };
      current.count += 1;
      current.views += post.views ?? 0;
      freq.set(tag, current);
    });
  });
  return [...freq.entries()]
    .map(([tag, data]) => ({ tag, count: data.count, views: data.views }))
    .sort((a, b) => {
      if (b.views === a.views) return b.count - a.count;
      return b.views - a.views;
    })
    .slice(0, max);
}

export function getDemoRecommendedUsers(currentUserId?: number | null): DemoUser[] {
  const store = ensureStore();
  return [...store.users.values()].filter((user) => user.id !== currentUserId);
}

export function getDemoInbox(userId: number): DemoInboxEntry[] {
  const store = ensureStore();
  return store.inbox.get(userId)?.slice() ?? [];
}

export function getDemoUnreadCount(userId: number, since?: number): number {
  const entries = getDemoInbox(userId);
  if (!since) return entries.length;
  return entries.filter((entry) => new Date(entry.created_at).getTime() > since).length;
}

function conversationKey(a: number, b: number) {
  return [Math.min(a, b), Math.max(a, b)].join(":");
}

export function getDemoConversation(viewerId: number, otherId: number): DirectMessageEntry[] {
  const store = ensureStore();
  const key = conversationKey(viewerId, otherId);
  const convo = store.conversations.get(key);
  return convo ? convo.messages.slice().sort((a, b) => a.id - b.id) : [];
}

type AttachmentPayload = NonNullable<DirectMessageEntry["attachments"]>;

let demoMessageId = 1000;

export function appendDemoMessage(
  sender: SessionUser,
  recipientId: number,
  text: string,
  attachments: AttachmentPayload = [],
): DirectMessageEntry {
  const store = ensureStore();
  const senderUser = normalizeSessionUser(sender);
  const recipientUser = store.users.get(recipientId);
  if (!recipientUser) {
    throw new Error("RECIPIENT_NOT_FOUND");
  }
  const key = conversationKey(sender.id, recipientId);
  let convo = store.conversations.get(key);
  if (!convo) {
    convo = { participantId: recipientId, messages: [] };
    store.conversations.set(key, convo);
  }
  const entry: DirectMessageEntry = {
    id: ++demoMessageId,
    senderId: sender.id,
    recipientId,
    text,
    createdAt: new Date().toISOString(),
    sender: {
      username: senderUser.username,
      nickname: senderUser.nickname,
      avatar_url: senderUser.avatar_url,
      is_admin: senderUser.is_admin,
      is_verified: senderUser.is_verified,
    },
    attachments,
  };
  convo.messages = [...convo.messages, entry];
  return entry;
}

function extractHashtags(text: string) {
  return text.match(/#[\p{L}\p{N}_]+/gu)?.map((tag) => tag.toLowerCase()) ?? [];
}

export function resolveDemoUserByUsername(username: string): DemoUser | null {
  const store = ensureStore();
  const id = store.usernameIndex.get(username.toLowerCase());
  return id ? store.users.get(id) ?? null : null;
}

export function resolveDemoUserById(id: number): DemoUser | null {
  const store = ensureStore();
  return store.users.get(id) ?? null;
}

export type { DemoInboxEntry, DemoUser };
