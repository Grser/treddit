"use client";

import { useLocale } from "@/contexts/LocaleContext";
import CommunityManagerCard from "@/components/community/CommunityManagerCard";

type Community = {
  id: number;
  name: string;
  slug: string;
  role?: string | null;
};

export default function ManageCommunitiesList({ communities }: { communities: Community[] }) {
  const { strings } = useLocale();
  const t = strings.createCommunity;

  if (!communities?.length) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t.existingTitle}</h2>
        <p className="mt-1 text-sm opacity-70">{t.existingSubtitle}</p>
        <p className="mt-4 text-sm opacity-80">{t.empty}</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-xl font-semibold">{t.existingTitle}</h2>
      <p className="mt-1 text-sm opacity-70">
        Administra cada comunidad desde su editor dedicado para banner, imagen, descripción y más opciones visuales.
      </p>

      <ul className="mt-5 space-y-4">
        {communities.map((community) => (
          <CommunityManagerCard key={community.id} community={community} />
        ))}
      </ul>
    </section>
  );
}
