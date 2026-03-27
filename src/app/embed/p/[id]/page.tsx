import type { RowDataPacket } from "mysql2";
import { notFound } from "next/navigation";

import { db, isDatabaseConfigured } from "@/lib/db";
import { getDemoFeed } from "@/lib/demoStore";

type EmbedPostRow = RowDataPacket & {
  id: number;
  username: string;
  description: string | null;
  created_at: string | Date;
};

export const dynamic = "force-dynamic";

export default async function EmbedPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId) || postId <= 0) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://treddit.clawn.cat";

  if (!isDatabaseConfigured()) {
    const { items } = getDemoFeed({ limit: 200 });
    const post = items.find((item) => Number(item.id) === postId);
    if (!post) notFound();
    return (
      <main className="mx-auto w-full max-w-2xl p-4 text-foreground">
        <h1 className="text-xl font-bold">Insertar post</h1>
        <p className="mt-2 rounded-lg border border-border bg-surface p-4">
          <b>@{post.username}</b> · {new Date(post.created_at).toLocaleString("es-ES", { timeZone: "UTC" })}
          <br />
          {post.description || "Sin descripción"}
        </p>
        <EmbedCode baseUrl={baseUrl} postId={postId} />
      </main>
    );
  }

  const [rows] = await db.query<EmbedPostRow[]>(
    `
      SELECT p.id, u.username, p.description, p.created_at
      FROM Posts p
      JOIN Users u ON u.id = p.user
      WHERE p.id = ?
      LIMIT 1
    `,
    [postId],
  );
  const post = rows[0];
  if (!post) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl p-4 text-foreground">
      <h1 className="text-xl font-bold">Insertar post</h1>
      <p className="mt-2 rounded-lg border border-border bg-surface p-4">
        <b>@{post.username}</b> · {new Date(post.created_at).toLocaleString("es-ES", { timeZone: "UTC" })}
        <br />
        {post.description || "Sin descripción"}
      </p>
      <EmbedCode baseUrl={baseUrl} postId={postId} />
    </main>
  );
}

function EmbedCode({ baseUrl, postId }: { baseUrl: string; postId: number }) {
  const embedHtml = `<iframe src="${baseUrl}/p/${postId}" style="width:100%;max-width:640px;height:540px;border:0;border-radius:12px;" loading="lazy"></iframe>`;

  return (
    <section className="mt-4 space-y-2">
      <h2 className="font-semibold">Código para insertar</h2>
      <textarea
        readOnly
        value={embedHtml}
        className="h-28 w-full rounded-lg border border-border bg-input p-3 font-mono text-xs"
      />
    </section>
  );
}
