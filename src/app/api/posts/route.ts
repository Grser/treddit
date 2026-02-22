export const runtime = "nodejs";

import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";
import { createDemoPost, getDemoFeed } from "@/lib/demoStore";
import { ensurePostsCommunityColumn, getPostsCommunityColumn } from "@/lib/communityColumns";
import { ensurePostsSensitiveColumn, getPostsSensitiveColumn } from "@/lib/postSensitivity";
import { isUserAgeVerified } from "@/lib/ageVerification";
import { estimatePostViews } from "@/lib/postStats";

type PostRow = {
  id: number;
  user: number;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  is_admin: number | boolean;
  is_verified: number | boolean;
  description: string | null;
  created_at: string | Date;
  reply_scope: number | null;
  mediaUrl: string | null;
  likes: number;
  comments: number;
  reposts: number;
  hasPoll: number;
  likedByMe: number;
  repostedByMe: number;
  community_id: number | null;
  community_slug: string | null;
  community_name: string | null;
  is_sensitive: number | boolean | null;
};

type CommunityMembershipRow = RowDataPacket & {
  id: number;
  visible: number;
  isMember: number;
};

const ANON_FEED_CACHE_TTL_MS = 15_000;
const AUTH_FEED_CACHE_TTL_MS = 8_000;
const globalForPostsCache = globalThis as unknown as {
  __tredditAnonFeedCache?: Map<string, { expiresAt: number; payload: { items: unknown[]; nextCursor: string | null } }>;
  __tredditAuthFeedCache?: Map<string, { expiresAt: number; payload: { items: unknown[]; nextCursor: string | null } }>;
};

function getAnonFeedCacheStore() {
  if (!globalForPostsCache.__tredditAnonFeedCache) {
    globalForPostsCache.__tredditAnonFeedCache = new Map();
  }
  return globalForPostsCache.__tredditAnonFeedCache;
}

function getAuthFeedCacheStore() {
  if (!globalForPostsCache.__tredditAuthFeedCache) {
    globalForPostsCache.__tredditAuthFeedCache = new Map();
  }
  return globalForPostsCache.__tredditAuthFeedCache;
}

function clearFeedCaches() {
  getAnonFeedCacheStore().clear();
  getAuthFeedCacheStore().clear();
}

function shouldUseAnonFeedCache(url: URL, meId: number | null) {
  if (meId) return false;
  const search = url.searchParams;
  const likesOf = Number(search.get("likesOf") || 0);
  return likesOf <= 0;
}

function createAnonFeedCacheKey(url: URL) {
  const sorted = [...url.searchParams.entries()]
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
  return sorted || "feed:default";
}

function shouldUseAuthFeedCache(url: URL, meId: number | null) {
  if (!meId) return false;
  const search = url.searchParams;
  const likesOf = Number(search.get("likesOf") || 0);
  const userId = Number(search.get("userId") || 0);
  const communityId = Number(search.get("communityId") || 0);
  const username = (search.get("username") || "").trim();
  const tag = (search.get("tag") || "").trim();
  const filter = (search.get("filter") || "").trim();

  return likesOf <= 0 && userId <= 0 && communityId <= 0 && !username && !tag && !filter;
}

function createAuthFeedCacheKey(url: URL, meId: number) {
  return `user:${meId}|${createAnonFeedCacheKey(url)}`;
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "20", 10) || 20, 1), 50);
  const cursor = url.searchParams.get("cursor");
  const userId = Number(url.searchParams.get("userId") || 0);
  const likesOf = Number(url.searchParams.get("likesOf") || 0);
  const filter = (url.searchParams.get("filter") || "").toLowerCase();
  const communityId = Number(url.searchParams.get("communityId") || 0);
  const wantsCommunityFilter = communityId > 0;
  const usernameFilter = (url.searchParams.get("username") || "").trim();
  const tagRaw = (url.searchParams.get("tag") || "").trim();
  const normalizedTag = tagRaw
    ? (tagRaw.startsWith("#") ? tagRaw : `#${tagRaw}`).toLowerCase()
    : "";
  const joinParams: (number | string)[] = [];
  const whereParams: (number | string)[] = [];
  const joins: string[] = [];
  const whereParts: string[] = [];

  if (likesOf > 0) {
    joins.push("JOIN Like_Posts lpFilter ON lpFilter.post = p.id AND lpFilter.user = ?");
    joinParams.push(likesOf);
  }

  const cursorValue = Number(cursor);
  if (cursor && !Number.isNaN(cursorValue)) {
    whereParts.push("p.id < ?");
    whereParams.push(cursorValue);
  }

  if (userId > 0) {
    whereParts.push("p.user = ?");
    whereParams.push(userId);
  }

  if (usernameFilter) {
    whereParts.push("u.username LIKE ? ESCAPE '\\'");
    whereParams.push(`%${escapeLike(usernameFilter)}%`);
  }

  if (filter === "media") {
    whereParts.push("EXISTS(SELECT 1 FROM Files f WHERE f.postid = p.id)");
  }

  if (normalizedTag) {
    whereParts.push("LOWER(p.description) LIKE ? ESCAPE '\\'");
    whereParams.push(`%${escapeLike(normalizedTag)}%`);
  }

  const meId = me?.id ?? null;
  const canUseAnonCache = shouldUseAnonFeedCache(url, meId);
  const canUseAuthCache = shouldUseAuthFeedCache(url, meId);
  const anonCacheKey = canUseAnonCache ? createAnonFeedCacheKey(url) : null;
  const authCacheKey = canUseAuthCache && meId ? createAuthFeedCacheKey(url, meId) : null;
  const anonCacheStore = canUseAnonCache ? getAnonFeedCacheStore() : null;
  const authCacheStore = canUseAuthCache ? getAuthFeedCacheStore() : null;

  if (anonCacheStore && anonCacheKey) {
    const cached = anonCacheStore.get(anonCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        headers: {
          "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=30",
        },
      });
    }
  }

  if (authCacheStore && authCacheKey) {
    const cached = authCacheStore.get(authCacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.payload, {
        headers: {
          "Cache-Control": "private, max-age=0, must-revalidate",
        },
      });
    }
  }

  const shouldPrioritizeFollowed = Boolean(
    meId && !userId && !likesOf && !wantsCommunityFilter && !usernameFilter && !normalizedTag,
  );

  if (shouldPrioritizeFollowed) {
    joins.push("LEFT JOIN Follows ff ON ff.followed = p.user AND ff.follower = ?");
    joinParams.push(Number(meId));
  }

  if (!isDatabaseConfigured()) {
    const { items, nextCursor } = getDemoFeed({
      limit,
      cursor: cursorValue || null,
      userId: userId || undefined,
      username: usernameFilter || undefined,
      tag: normalizedTag || undefined,
      filter,
    });
    return NextResponse.json(
      { items, nextCursor },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const [communityColumn, sensitiveColumn] = await Promise.all([
    getPostsCommunityColumn(),
    getPostsSensitiveColumn(),
  ]);
  const hasCommunityColumn = Boolean(communityColumn);
  const hasSensitiveColumn = Boolean(sensitiveColumn);

  if (wantsCommunityFilter) {
    if (!hasCommunityColumn || !communityColumn) {
      return NextResponse.json(
        { items: [], nextCursor: null },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    whereParts.push(`p.${communityColumn} = ?`);
    whereParams.push(communityId);
  }

  const whereClause = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const shouldJoinUsersInIdQuery = Boolean(usernameFilter);
  const idQueryUsersJoin = shouldJoinUsersInIdQuery ? "JOIN Users u ON u.id = p.user" : "";
  const communityIdSelect = hasCommunityColumn && communityColumn ? `p.${communityColumn}` : "NULL";
  const communityJoin = hasCommunityColumn && communityColumn ? `LEFT JOIN Communities c ON c.id = p.${communityColumn}` : "";
  const communitySlugSelect = hasCommunityColumn ? "c.slug" : "NULL";
  const communityNameSelect = hasCommunityColumn ? "c.name" : "NULL";
  const sensitiveSelect = hasSensitiveColumn ? "p.is_sensitive" : "0";

  try {
    const [idRows] = await db.query<Array<RowDataPacket & { id: number }>>(
      `
      SELECT p.id
      FROM Posts p
      ${joins.join(" ")}
      ${idQueryUsersJoin}
      ${whereClause}
      ORDER BY ${shouldPrioritizeFollowed ? "CASE WHEN ff.follower IS NULL THEN 1 ELSE 0 END, p.id DESC" : "p.id DESC"}
      LIMIT ?
      `,
      [...joinParams, ...whereParams, limit + 1],
    );

    const orderedIds = idRows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id));
    if (!orderedIds.length) {
      return new NextResponse(JSON.stringify({ items: [], nextCursor: null }), {
        headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
      });
    }

    const placeholders = orderedIds.map(() => "?").join(", ");
    const orderByField = orderedIds.map(() => "?").join(", ");
    const [rows] = await db.query<PostRow[]>(
      `
      SELECT
        p.id,
        p.user AS user,
        u.username,
        u.nickname,
        u.avatar_url,
        u.is_admin,
        u.is_verified,
        p.description,
        p.created_at,
        p.reply_scope,
        firstFile.route AS mediaUrl,
        COALESCE(likeCount.likes, 0) AS likes,
        COALESCE(commentCount.comments, 0) AS comments,
        COALESCE(repostCount.reposts, 0) AS reposts,
        CASE WHEN pollCount.post_id IS NULL THEN 0 ELSE 1 END AS hasPoll,
        CASE WHEN ? IS NULL THEN 0 WHEN myLike.post IS NULL THEN 0 ELSE 1 END AS likedByMe,
        CASE WHEN ? IS NULL THEN 0 WHEN myRepost.post_id IS NULL THEN 0 ELSE 1 END AS repostedByMe,
        ${communityIdSelect} AS community_id,
        ${communitySlugSelect} AS community_slug,
        ${communityNameSelect} AS community_name,
        ${sensitiveSelect} AS is_sensitive
      FROM Posts p
      JOIN Users u ON u.id = p.user
      ${communityJoin}
      LEFT JOIN (
        SELECT f.postid, MIN(f.id) AS first_file_id
        FROM Files f
        WHERE f.postid IN (${placeholders})
        GROUP BY f.postid
      ) fileRef ON fileRef.postid = p.id
      LEFT JOIN Files firstFile ON firstFile.id = fileRef.first_file_id
      LEFT JOIN (
        SELECT lp.post, COUNT(*) AS likes
        FROM Like_Posts lp
        WHERE lp.post IN (${placeholders})
        GROUP BY lp.post
      ) likeCount ON likeCount.post = p.id
      LEFT JOIN (
        SELECT c.post, COUNT(*) AS comments
        FROM Comments c
        WHERE c.post IN (${placeholders})
        GROUP BY c.post
      ) commentCount ON commentCount.post = p.id
      LEFT JOIN (
        SELECT r.post_id, COUNT(*) AS reposts
        FROM Reposts r
        WHERE r.post_id IN (${placeholders})
        GROUP BY r.post_id
      ) repostCount ON repostCount.post_id = p.id
      LEFT JOIN (
        SELECT DISTINCT pl.post_id
        FROM Polls pl
        WHERE pl.post_id IN (${placeholders})
      ) pollCount ON pollCount.post_id = p.id
      LEFT JOIN Like_Posts myLike ON myLike.post = p.id AND myLike.user = ?
      LEFT JOIN Reposts myRepost ON myRepost.post_id = p.id AND myRepost.user_id = ?
      WHERE p.id IN (${placeholders})
      ORDER BY FIELD(p.id, ${orderByField})
      `,
      [
        meId,
        meId,
        ...orderedIds,
        ...orderedIds,
        ...orderedIds,
        ...orderedIds,
        ...orderedIds,
        meId,
        meId,
        ...orderedIds,
        ...orderedIds,
      ],
    );

    const list = rows;
    const hasSensitiveItems = hasSensitiveColumn && list.some((row) => Boolean(row.is_sensitive));
    const viewerAgeVerified = meId && hasSensitiveItems ? await isUserAgeVerified(meId) : false;
    const items = list.slice(0, limit).map((row) => ({
      ...row,
      likes: Number(row.likes) || 0,
      comments: Number(row.comments) || 0,
      reposts: Number(row.reposts) || 0,
      views: estimatePostViews({ likes: row.likes, comments: row.comments, reposts: row.reposts }),
      likedByMe: Boolean(row.likedByMe),
      repostedByMe: Boolean(row.repostedByMe),
      hasPoll: Boolean(row.hasPoll),
      reply_scope: Number(row.reply_scope ?? 0),
      is_sensitive: Boolean(row.is_sensitive),
      can_view_sensitive: viewerAgeVerified,
      isOwner: meId ? Number(row.user) === meId : false,
      isAdminViewer: Boolean(me?.is_admin),
      community:
        row.community_id && row.community_slug
          ? {
              id: Number(row.community_id),
              slug: String(row.community_slug),
              name: row.community_name ? String(row.community_name) : String(row.community_slug),
            }
          : null,
    }));
    const nextCursor = list.length > limit ? String(items[items.length - 1].id) : null;

    const payload = { items, nextCursor };
    if (anonCacheStore && anonCacheKey) {
      anonCacheStore.set(anonCacheKey, {
        expiresAt: Date.now() + ANON_FEED_CACHE_TTL_MS,
        payload,
      });
    }

    if (authCacheStore && authCacheKey) {
      authCacheStore.set(authCacheKey, {
        expiresAt: Date.now() + AUTH_FEED_CACHE_TTL_MS,
        payload,
      });
    }

    return new NextResponse(JSON.stringify(payload), {
      headers: {
        "Cache-Control": anonCacheStore
          ? "public, max-age=0, s-maxage=15, stale-while-revalidate=30"
          : authCacheStore
            ? "private, max-age=0, must-revalidate"
            : "no-store",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Failed to load posts from database", error);
    return NextResponse.json(
      { items: [], nextCursor: null },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export async function POST(req: Request) {
  const me = await requireUser();
  const databaseReady = isDatabaseConfigured();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const descriptionValue = body["description"];
  let description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const mediaUrlValue = body["mediaUrl"];
  const mediaUrl = typeof mediaUrlValue === "string" ? mediaUrlValue.trim() : "";
  const pollPayload = body["poll"];
  const communityValue = body["communityId"];
  const sensitiveValue = body["isSensitive"];
  const isSensitive = sensitiveValue === true || sensitiveValue === 1 || sensitiveValue === "1";
  const communityIdRaw = typeof communityValue === "number" ? communityValue : Number(communityValue);
  const normalizedCommunityId = Number.isFinite(communityIdRaw) && communityIdRaw > 0 ? communityIdRaw : null;

  let communityColumn = databaseReady ? await getPostsCommunityColumn() : "community_id";
  let sensitiveColumn = databaseReady ? await getPostsSensitiveColumn() : "is_sensitive";

  description = description.slice(0, 2000);

  type NormalizedPoll = { question: string; options: string[]; days: number } | null;
  let poll: NormalizedPoll = null;

  if (pollPayload && typeof pollPayload === "object" && !Array.isArray(pollPayload)) {
    const pollObject = pollPayload as Record<string, unknown>;
    const questionValue = pollObject["question"];
    const question = typeof questionValue === "string" ? questionValue.trim() : "";
    const optionsRaw = pollObject["options"];
    const options = Array.isArray(optionsRaw)
      ? optionsRaw.map((opt) => (typeof opt === "string" ? opt.trim() : "")).filter(Boolean)
      : [];
    const daysRaw = Number(pollObject["days"]);
    const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.trunc(daysRaw), 1), 7) : 1;

    if (!question || options.length < 2) {
      return NextResponse.json({ error: "Encuesta inválida" }, { status: 400 });
    }

    poll = { question: question.slice(0, 200), options: options.slice(0, 4), days };
  } else if (pollPayload !== undefined && pollPayload !== null) {
    return NextResponse.json({ error: "Encuesta inválida" }, { status: 400 });
  }

  if (!description && !mediaUrl && !poll) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  let postId: number | null = null;
  let pollId: number | null = null;
  let communityId: number | null = null;

  if (normalizedCommunityId && databaseReady) {
    if (!communityColumn) {
      communityColumn = await ensurePostsCommunityColumn();
      if (!communityColumn) {
        return NextResponse.json({ error: "La base de datos no admite comunidades" }, { status: 400 });
      }
    }
    try {
      const [rows] = await db.query<CommunityMembershipRow[]>(
        `
        SELECT c.id, c.visible,
               EXISTS(
                 SELECT 1 FROM Community_Members cm WHERE cm.community_id = c.id AND cm.user_id = ?
               ) AS isMember
        FROM Communities c
        WHERE c.id = ?
        LIMIT 1
        `,
        [me.id, normalizedCommunityId],
      );
      const row = rows[0];
      if (!row) {
        return NextResponse.json({ error: "La comunidad no existe" }, { status: 404 });
      }
      const isMember = Boolean(row.isMember);
      const isAdmin = Boolean(me.is_admin);
      const isVisible = Boolean(row.visible);
      if (!isMember && !isAdmin) {
        return NextResponse.json({ error: "No puedes publicar en esta comunidad" }, { status: 403 });
      }
      if (!isVisible && !isMember && !isAdmin) {
        return NextResponse.json({ error: "No puedes publicar en esta comunidad" }, { status: 403 });
      }
      communityId = Number(row.id);
    } catch (error) {
      console.error("Failed to verify community", error);
      return NextResponse.json({ error: "No se pudo validar la comunidad" }, { status: 500 });
    }
  } else if (normalizedCommunityId) {
    communityId = normalizedCommunityId;
  }

  if (!databaseReady) {
    const { id } = createDemoPost(me, {
      description: description || null,
      mediaUrl: mediaUrl || null,
      poll: null,
      communityId: normalizedCommunityId,
      isSensitive,
    });
    return NextResponse.json({ ok: true, id }, { status: 201 });
  }

  try {
    const columns = ["user", "description", "created_at", "reply_scope"];
    const placeholders = ["?", "?", "NOW()", "?"];
    const params: (number | string | null)[] = [me.id, description || null, 0];

    if (communityColumn) {
      columns.push(communityColumn);
      placeholders.push("?");
      params.push(communityId);
    }

    if (!sensitiveColumn) {
      sensitiveColumn = await ensurePostsSensitiveColumn();
    }
    if (sensitiveColumn) {
      columns.push(sensitiveColumn);
      placeholders.push("?");
      params.push(isSensitive ? 1 : 0);
    }

    const insertSql = `INSERT INTO Posts (${columns.join(", ")}) VALUES (${placeholders.join(", ")})`;
    const [insertPost] = await db.execute<ResultSetHeader>(insertSql, params);
    postId = insertPost.insertId;

    if (mediaUrl) {
      try {
        await db.execute("INSERT INTO Files (postid, route) VALUES (?, ?)", [postId, mediaUrl]);
      } catch (error) {
        console.warn("No se pudo guardar archivo multimedia", error);
      }
    }

    if (poll) {
      const endsAt = new Date(Date.now() + poll.days * 24 * 60 * 60 * 1000);
      const [insertPoll] = await db.execute<ResultSetHeader>(
        "INSERT INTO Polls (post_id, question, ends_at) VALUES (?, ?, ?)",
        [postId, poll.question, endsAt]
      );
      pollId = insertPoll.insertId;
      await Promise.all(
        poll.options.map((option) =>
          db.execute("INSERT INTO Poll_Options (poll_id, text) VALUES (?, ?)", [pollId, option])
        )
      );
    }
  } catch (error) {
    console.error("Failed to create post", error);
    if (pollId) {
      await db.execute("DELETE FROM Polls WHERE id=?", [pollId]).catch(() => {});
      await db.execute("DELETE FROM Poll_Options WHERE poll_id=?", [pollId]).catch(() => {});
    }
    if (postId) {
      await db.execute("DELETE FROM Posts WHERE id=?", [postId]).catch(() => {});
      await db.execute("DELETE FROM Files WHERE postid=?", [postId]).catch(() => {});
    }
    return NextResponse.json({ error: "No se pudo crear la publicación" }, { status: 500 });
  }

  clearFeedCaches();

  return NextResponse.json({ ok: true, id: postId }, { status: 201 });
}
