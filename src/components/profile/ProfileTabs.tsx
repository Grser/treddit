import Feed from "@/components/Feed";

export default async function ProfileTabs({
  profileId, viewerId, showLikes, showBookmarks,
}: {
  profileId: number;
  viewerId?: number | null;
  showLikes: boolean;
  showBookmarks: boolean;
}) {
  // Simplificado: pestañas estáticas. Puedes convertir a client + router state si quieres.
  // Aquí mostramos “Posts” y, si el dueño lo permite, “Me gusta”.
  return (
    <div className="max-w-2xl mx-auto">
      <nav className="sticky top-14 z-40 bg-surface border-b border-border px-4">
        <ul className="flex gap-6 h-12 items-center text-sm">
          <li><a className="font-medium" href="#">Posts</a></li>
          <li><span className="opacity-60">Respuestas</span></li>
          <li><span className="opacity-60">Destacados</span></li>
          <li><span className="opacity-60">Artículos</span></li>
          <li><span className="opacity-60">Multimedia</span></li>
          {showLikes && <li><a className="opacity-80 hover:opacity-100" href="#likes">Me gusta</a></li>}
        </ul>
      </nav>

      {/* Feed de posts del usuario */}
      <section className="p-4">
        <Feed source={`user:${profileId}`} viewerId={viewerId ?? undefined} />
      </section>

      {showLikes && (
        <section id="likes" className="p-4">
          <Feed source={`likes:${profileId}`} viewerId={viewerId ?? undefined} />
        </section>
      )}
    </div>
  );
}
