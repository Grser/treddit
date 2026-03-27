// src/app/p/[id]/edit/page.tsx
import type { RowDataPacket } from "mysql2";

import Navbar from "@/components/Navbar";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import EditPostForm from "@/components/EditPostForm";

type PostRow = RowDataPacket & {
  id: number;
  user: number;
  description: string | null;
  reply_scope: number;
};

type AdminFlagRow = RowDataPacket & { is_admin: number };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const me = await requireUser();
  const id = Number(rawId);

  const [rows] = await db.query<PostRow[]>(
    "SELECT p.id, p.user, p.description, p.reply_scope FROM Posts p WHERE p.id=? LIMIT 1",
    [id]
  );
  const post = rows[0];
  if (!post) return <div className="p-6">Post no encontrado</div>;

  const [r] = await db.query<AdminFlagRow[]>("SELECT is_admin FROM Users WHERE id=?", [me.id]);
  const isAdmin = Boolean(r[0]?.is_admin);
  if (Number(post.user) !== me.id && !isAdmin) return <div className="p-6">No autorizado</div>;

  return (
    <div className="min-h-dvh">
      <Navbar />
      <EditPostForm
        postId={id}
        initialDescription={post.description || ""}
        initialReplyScope={post.reply_scope}
      />
    </div>
  );
}
