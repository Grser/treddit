import Navbar from "@/components/Navbar";
import AdminSeriesPreview from "@/components/admin/AdminSeriesPreview";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Series</p>
          <h1 className="text-2xl font-semibold">Previsualización desde Kitsu</h1>
          <p className="text-sm opacity-70">
            Consulta los datos de Kitsu antes de crear una serie en Treddit. Aquí verás cómo lucen la portada, el banner y los
            metadatos que obtuvimos de la API.
          </p>
        </header>

        <AdminSeriesPreview />
      </main>
    </div>
  );
}
