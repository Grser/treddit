import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";

import Navbar from "@/components/Navbar";
import { getSessionUser } from "@/lib/auth";
import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoFeed } from "@/lib/demoStore";
import { estimatePostViews } from "@/lib/postStats";

type PostStatsRow = RowDataPacket & {
  id: number;
  description: string | null;
  likes: number;
  comments: number;
  reposts: number;
};

export const dynamic = "force-dynamic";

export default async function PostStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, session] = await Promise.all([params, getSessionUser()]);
  const postId = Number(id);
  if (!Number.isFinite(postId) || postId <= 0) notFound();

  if (!isDatabaseConfigured()) {
    const { items } = getDemoFeed({ limit: 200 });
    const post = items.find((item) => Number(item.id) === postId);
    if (!post) notFound();
    const views = estimatePostViews({ likes: post.likes, comments: post.comments, reposts: post.reposts ?? 0 });
    return (
      <div className="min-h-dvh bg-background text-foreground">
        <Navbar session={session} />
        <main className="mx-auto w-full max-w-3xl px-4 py-6">
          <h1 className="text-2xl font-bold">Estadísticas del post</h1>
          <p className="mt-2 opacity-80">{post.description || "Sin descripción"}</p>
          <StatsGrid likes={post.likes} comments={post.comments} reposts={post.reposts ?? 0} views={views} />
        </main>
      </div>
    );
  }

  const [rows] = await db.query<PostStatsRow[]>(
    `
      SELECT
        p.id,
        p.description,
        (SELECT COUNT(*) FROM Like_Posts lp WHERE lp.post = p.id) AS likes,
        (SELECT COUNT(*) FROM Comments c WHERE c.post = p.id AND c.visible = 1) AS comments,
        (SELECT COUNT(*) FROM Reposts rp WHERE rp.post_id = p.id) AS reposts
      FROM Posts p
      WHERE p.id = ?
      LIMIT 1
    `,
    [postId],
  );

  const post = rows[0];
  if (!post) notFound();
  const likes = Number(post.likes) || 0;
  const comments = Number(post.comments) || 0;
  const reposts = Number(post.reposts) || 0;
  const views = estimatePostViews({ likes, comments, reposts });

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar session={session} />
      <main className="mx-auto w-full max-w-3xl px-4 py-6">
        <h1 className="text-2xl font-bold">Estadísticas del post</h1>
        <p className="mt-2 opacity-80">{post.description || "Sin descripción"}</p>
        <StatsGrid likes={likes} comments={comments} reposts={reposts} views={views} />
      </main>
    </div>
  );
}

function StatsGrid({
  likes,
  comments,
  reposts,
  views,
}: {
  likes: number;
  comments: number;
  reposts: number;
  views: number;
}) {
  return (
    <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Me gusta" value={likes} />
      <StatCard label="Respuestas" value={comments} />
      <StatCard label="Reposts" value={reposts} />
      <StatCard label="Vistas (estimadas)" value={views} />
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value.toLocaleString("es-ES")}</p>
    </article>
  );
}
