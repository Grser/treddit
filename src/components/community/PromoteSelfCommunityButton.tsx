"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PromoteSelfCommunityButton({
  communityId,
  alreadyManager,
}: {
  communityId: number;
  alreadyManager: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (alreadyManager) {
    return (
      <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm text-emerald-700">
        Ya tienes rol administrativo
      </span>
    );
  }

  async function onPromote() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/communities/${communityId}/claim-admin`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(payload?.error || "No se pudo actualizar tu rol");
        return;
      }
      router.refresh();
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onPromote}
        disabled={loading}
        className="rounded-full border border-brand px-4 py-2 text-sm text-brand transition hover:bg-brand/10 disabled:opacity-60"
      >
        {loading ? "Activando..." : "Hacerme admin de esta comunidad"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
