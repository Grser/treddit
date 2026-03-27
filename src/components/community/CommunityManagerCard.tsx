"use client";

import { useEffect, useMemo, useState } from "react";

import ImagePickerField from "@/components/profile/ImagePickerField";

type Community = {
  id: number;
  name: string;
  slug: string;
  role?: string | null;
};

type CommunitySettings = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  banner_url: string;
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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<CommunitySettings>({
    id: community.id,
    name: community.name,
    slug: community.slug,
    description: "",
    icon_url: "",
    banner_url: "",
  });

  useEffect(() => {
    if (!open) return;
    let ignore = false;
    setLoading(true);
    setError(null);

    fetch(`/api/communities/${community.id}/settings`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || "No se pudo cargar la configuración");
        }
        return res.json() as Promise<{ item?: CommunitySettings }>;
      })
      .then((payload) => {
        if (ignore) return;
        if (payload.item) {
          setSettings(payload.item);
        }
      })
      .catch((err) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "No se pudo cargar la comunidad");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [open, community.id]);

  async function onSave(formData: FormData) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);

    const payload = {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || ""),
      icon_url: String(formData.get("icon_url") || ""),
      banner_url: String(formData.get("banner_url") || ""),
    };

    try {
      const res = await fetch(`/api/communities/${community.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar");
      }

      setMessage("Cambios guardados.");
      setSettings((prev) => ({ ...prev, ...payload }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  const badge = useMemo(() => roleLabel(community.role), [community.role]);

  return (
    <li className="rounded-2xl border border-border/70 bg-surface/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="size-10 rounded-full border border-border bg-muted bg-cover bg-center"
            style={settings.icon_url ? { backgroundImage: `url(${settings.icon_url})` } : undefined}
          />
          <div>
            <p className="font-semibold">{settings.name}</p>
            <p className="text-xs opacity-70">c/{settings.slug}</p>
          </div>
          {badge && <span className="rounded-full bg-brand/10 px-2 py-1 text-xs text-brand">{badge}</span>}
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`/c/${settings.slug}`}
            className="inline-flex h-9 items-center justify-center rounded-full border border-border px-4 text-sm hover:bg-muted/60"
          >
            Ver comunidad
          </a>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="inline-flex h-9 items-center justify-center rounded-full bg-brand px-4 text-sm text-white"
          >
            {open ? "Cerrar edición" : "Editar"}
          </button>
        </div>
      </div>

      {open && (
        <form
          className="mt-4 space-y-4 rounded-xl border border-border/60 bg-background/40 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            void onSave(new FormData(event.currentTarget));
          }}
        >
          {loading ? (
            <p className="text-sm opacity-70">Cargando configuración...</p>
          ) : (
            <>
              <label className="block text-sm">
                <span className="font-medium">Nombre de la comunidad</span>
                <input
                  name="name"
                  defaultValue={settings.name}
                  className="mt-1 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
                  maxLength={80}
                  required
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium">Descripción</span>
                <textarea
                  name="description"
                  defaultValue={settings.description}
                  className="mt-1 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
                  maxLength={280}
                  rows={3}
                  placeholder="Describe esta comunidad"
                />
              </label>

              <div className="grid gap-4 lg:grid-cols-2">
                <ImagePickerField
                  name="icon_url"
                  label="Ícono"
                  initialUrl={settings.icon_url}
                  helpText="Se recomienda una imagen cuadrada de al menos 128x128."
                  minWidth={128}
                  minHeight={128}
                />
                <ImagePickerField
                  name="banner_url"
                  label="Banner"
                  initialUrl={settings.banner_url}
                  helpText="Ideal para portada de comunidad (mínimo 1200x300)."
                  minWidth={1200}
                  minHeight={300}
                />
              </div>

              <button
                type="submit"
                className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
                disabled={busy}
              >
                {busy ? "Guardando..." : "Guardar cambios"}
              </button>

              {message && <p className="text-sm text-emerald-500">{message}</p>}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </>
          )}
        </form>
      )}
    </li>
  );
}
