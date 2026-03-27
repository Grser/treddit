"use client";

import { useMemo } from "react";

type Community = {
  id: number;
  name: string;
  slug: string;
  role?: string | null;
};

function roleLabel(role?: string | null) {
  if (!role) return null;
  const normalized = role.toLowerCase();
  if (normalized === "owner") return "Dueño";
  if (normalized === "admin") return "Administrador";
  if (normalized === "moderator") return "Moderador";
  return null;
}

export default function CommunityManagerCard({ community }: { community: Community }) {
  const badge = useMemo(() => roleLabel(community.role), [community.role]);

  return (
    <li className="overflow-hidden rounded-3xl border border-border/70 bg-surface/80 shadow-sm transition hover:border-brand/40">
      <div className="h-20 bg-gradient-to-r from-brand/30 via-fuchsia-500/20 to-cyan-500/20" />
      <div className="-mt-6 px-5 pb-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl border border-border bg-background text-base font-bold">
              {community.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold">{community.name}</p>
              <p className="text-xs opacity-70">c/{community.slug}</p>
            </div>
          </div>
          {badge && <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs text-brand">{badge}</span>}
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a
            href={`/c/${community.slug}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
          >
            Ver comunidad
          </a>
          <a
            href={`/c/${community.slug}/editar`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-brand px-4 text-sm font-medium text-white"
          >
            Abrir editor completo
          </a>
        </div>
      </div>
    </li>
  );
}
