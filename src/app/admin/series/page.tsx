import Navbar from "@/components/Navbar";
import AdminSeriesPreview from "@/components/admin/AdminSeriesPreview";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  await requireAdmin();

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <AdminShell
        title="Panel de series"
        subtitle="Previsualiza datos de Kitsu antes de crear una serie en Treddit."
      >
        <AdminSection title="Previsualización desde Kitsu" description="Revisa portada, banner y metadatos antes de publicar.">
          <AdminSeriesPreview />
        </AdminSection>
      </AdminShell>
    </div>
  );
}
