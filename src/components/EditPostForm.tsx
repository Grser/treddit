"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type EditPostFormProps = {
  postId: number;
  initialDescription: string;
  initialReplyScope: number;
};

export default function EditPostForm({ postId, initialDescription, initialReplyScope }: EditPostFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const form = new FormData(event.currentTarget);
    const body = {
      description: String(form.get("description") || ""),
      reply_scope: Number(form.get("reply_scope") || 0),
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        alert("No se pudo actualizar");
        return;
      }
      router.push(`/p/${postId}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="max-w-2xl mx-auto p-4 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="text-sm">Contenido</span>
        <textarea
          name="description"
          defaultValue={initialDescription}
          rows={6}
          className="w-full bg-input rounded-md p-3 ring-1 ring-border outline-none"
        />
      </label>

      <label className="block">
        <span className="text-sm">Quién puede responder</span>
        <select
          name="reply_scope"
          defaultValue={initialReplyScope}
          className="h-10 px-3 rounded-md bg-input ring-1 ring-border"
        >
          <option value={0}>Todo el mundo</option>
          <option value={1}>Solo seguidores</option>
          <option value={2}>Mejores amigos</option>
        </select>
      </label>

      <div className="flex gap-2">
        <button disabled={saving} className="h-10 px-4 rounded-full bg-brand text-white disabled:opacity-60">
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <a href={`/p/${postId}`} className="h-10 px-4 rounded-full border border-border">
          Cancelar
        </a>
      </div>
    </form>
  );
}
