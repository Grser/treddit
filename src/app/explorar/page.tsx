import Link from "next/link";

import Navbar from "@/components/Navbar";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";

export const dynamic = "force-dynamic";

type TrendingTag = { tag: string; count: number; views: number };

export default async function ExplorePage() {
  const baseUrl = await getRequestBaseUrl();
  const tags = await getTrendingTags(baseUrl);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-semibold tracking-tight">Explorar</h1>
        <p className="text-sm opacity-75">Hashtags más vistos o buscados en este momento.</p>

        <section className="rounded-2xl border border-border bg-surface p-5">
          <ul className="space-y-3">
            {tags.map((item, idx) => (
              <li key={item.tag} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 px-4 py-3">
                <div>
                  <p className="text-xs uppercase opacity-60">#{idx + 1} en tendencias</p>
                  <Link href={`/buscar?q=${encodeURIComponent(item.tag)}`} className="text-lg font-semibold text-brand hover:underline">
                    {item.tag}
                  </Link>
                </div>
                <div className="text-right text-xs opacity-75">
                  <p>{item.views.toLocaleString()} vistas</p>
                  <p>{item.count.toLocaleString()} menciones</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

async function getTrendingTags(baseUrl: string): Promise<TrendingTag[]> {
  const res = await fetch(`${baseUrl}/api/discovery`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = (await res.json()) as { trendingTags?: TrendingTag[] };
  return Array.isArray(data.trendingTags) ? data.trendingTags.slice(0, 15) : [];
}
