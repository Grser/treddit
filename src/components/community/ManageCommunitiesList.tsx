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
      <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold">{t.existingTitle}</h2>
        <p className="mt-1 text-sm opacity-70">{t.existingSubtitle}</p>
        <p className="mt-4 text-sm opacity-80">{t.empty}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{t.existingTitle}</h2>
      <p className="mt-1 text-sm opacity-70">Panel profesional para administrar logo, banner y descripción.</p>

      <ul className="mt-4 space-y-3">
        {communities.map((community) => (
          <CommunityManagerCard key={community.id} community={community} />
        ))}
      </ul>
    </section>
  );
}
