import Navbar from "@/components/Navbar";
import SidebarLeft from "@/components/SidebarLeft";
import SidebarRight from "@/components/SidebarRight";
import PostCard from "@/components/PostCard";
import Composer from "@/components/Composer";
import AuthBanner from "@/components/AuthBanner";
import { getSessionUser } from "@/lib/auth";
import Feed from "@/components/Feed";



async function getFeed(base: string) {
  const res = await fetch(`${base}/api/posts`, { cache: "no-store" });
  if (!res.ok) return { items: [] as any[] };
  return res.json();
}
async function getDiscovery(base: string) {
  const res = await fetch(`${base}/api/discovery`, { cache: "no-store" });
  if (!res.ok) return { recommendedUsers: [], trendingTags: [] };
  return res.json();
}

export default async function Page() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const session = await getSessionUser();
  const [{ items }, discovery] = await Promise.all([
    getFeed(base),
    getDiscovery(base),
  ]);

  const canInteract = Boolean(session);

  return (
    <div className="min-h-dvh">
      <Navbar />
      <div className="mx-auto max-w-7xl px-3 sm:px-4 grid grid-cols-1 md:grid-cols-[16rem_1fr] lg:grid-cols-[16rem_1fr_20rem] gap-4 py-4">
        <SidebarLeft
          communities={discovery.trendingTags.map((t: any) => t.tag)}
        />

        <main className="space-y-4">
          {!canInteract && <AuthBanner />}
          <Composer enabled={canInteract} />

          {items.length === 0 && (
            <div className="border border-border bg-surface rounded-xl p-6 text-sm opacity-80">
              Aún no hay publicaciones en tu feed. Sigue a algunos usuarios o crea una publicación.
            </div>
          )}

        <Feed canInteract={!!canInteract} />
        </main>

        <SidebarRight
          trending={discovery.trendingTags}
          recommended={discovery.recommendedUsers}
        />
      </div>
    </div>
  );
}
