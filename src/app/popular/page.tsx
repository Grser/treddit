import Navbar from "@/components/Navbar";
import Feed from "@/components/Feed";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PopularPage() {
  const me = await getSessionUser();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight">Popular</h1>
        <p className="text-sm opacity-75">Se muestran los posts con más likes. El ranking considera hasta 1000 publicaciones.</p>
        <Feed canInteract={Boolean(me)} filter="popular" limit={30} />
      </main>
    </div>
  );
}
