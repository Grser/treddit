"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type EditPostFormProps = {
  postId: number;
  initialDescription: string;
  initialReplyScope: number;
};

const REPLY_SCOPE_OPTIONS = [
  { value: 0, label: "Todo el mundo", hint: "Cualquier persona podrá responder a este post." },
  { value: 1, label: "Solo seguidores", hint: "Solo tus seguidores podrán participar en la conversación." },
  { value: 2, label: "Mejores amigos", hint: "Respuestas limitadas a tu círculo de mejores amigos." },
] as const;

export default function EditPostForm({ postId, initialDescription, initialReplyScope }: EditPostFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [replyScope, setReplyScope] = useState(
    REPLY_SCOPE_OPTIONS.some((item) => item.value === initialReplyScope) ? initialReplyScope : 0
  );

  const charactersLeft = useMemo(() => 2000 - description.length, [description.length]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const body = {
      description,
      reply_scope: replyScope,
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
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
      <form className="overflow-hidden rounded-2xl border border-border bg-surface" onSubmit={onSubmit}>
        <div className="border-b border-border/70 px-5 py-4 sm:px-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Editar publicación</p>
          <h1 className="mt-1 text-xl font-semibold">Actualiza el contenido de tu post</h1>
        </div>

        <div className="space-y-6 px-5 py-5 sm:px-6 sm:py-6">
          <label className="block space-y-2">
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm font-medium">Contenido</span>
              <span className={`text-xs ${charactersLeft < 120 ? "text-amber-500" : "text-muted-foreground"}`}>
                {description.length}/2000
              </span>
            </div>
            <textarea
              name="description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 2000))}
              rows={8}
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 outline-none ring-brand/30 transition focus:ring-2"
              placeholder="¿Qué quieres contar hoy?"
            />
          </label>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium">Quién puede responder</legend>
            <input type="hidden" name="reply_scope" value={replyScope} />
            <div className="grid gap-2 sm:grid-cols-3">
              {REPLY_SCOPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setReplyScope(option.value)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    replyScope === option.value
                      ? "border-brand bg-brand/10 shadow-sm"
                      : "border-border bg-background hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{option.hint}</p>
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/70 bg-background/50 px-5 py-4 sm:px-6">
          <Link href={`/p/${postId}`} className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted/40">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
