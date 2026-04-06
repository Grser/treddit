import Navbar from "@/components/Navbar";
import { AdminSection, AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminSeriesPage() {
  await requireAdminPermission("access_dashboard");

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar />
      <AdminShell
        title="Panel de series"
        subtitle="La búsqueda de series en Kitsu fue retirada del panel de administración."
      >
        <AdminSection
          title="Búsqueda externa deshabilitada"
          description="Este módulo ya no consulta Kitsu desde admin. Si necesitas una serie, agrégala manualmente desde el flujo interno."
        >
          <div className="rounded-2xl border border-border bg-surface p-5 text-sm opacity-80">
            Se eliminó la opción de búsqueda y previsualización en Kitsu para mantener una operación más simple y controlada.
          </div>
        </AdminSection>
      </AdminShell>
    </div>
  );
}
