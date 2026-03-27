"use client";

import { useEffect, useState } from "react";

import ImagePickerField from "@/components/profile/ImagePickerField";

type CommunitySettings = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon_url: string;
  banner_url: string;
};

export default function CommunityEditPanel({ communityId }: { communityId: number }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settings, setSettings] = useState<CommunitySettings | null>(null);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetch(`/api/communities/${communityId}/settings`, { cache: "no-store" })
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
  }, [communityId]);

  async function onSave(formData: FormData) {
    if (busy || !settings) return;
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
      const res = await fetch(`/api/communities/${communityId}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo guardar");
      }

      setMessage("Cambios guardados.");
      setSettings((prev) => (prev ? { ...prev, ...payload } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <section className="rounded-3xl border border-border bg-surface p-6">
        <p className="text-sm opacity-70">Cargando configuración de la comunidad...</p>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="rounded-3xl border border-rose-500/40 bg-rose-500/10 p-6">
        <p className="text-sm text-rose-300">No se pudo cargar la configuración de esta comunidad.</p>
      </section>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave(new FormData(event.currentTarget));
      }}
    >
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-surface/80">
        <div
          className="h-32 bg-cover bg-center"
          style={settings.banner_url ? { backgroundImage: `url(${settings.banner_url})` } : undefined}
        >
          {!settings.banner_url && (
            <div className="flex h-full items-center justify-center bg-gradient-to-r from-brand/30 via-fuchsia-500/20 to-cyan-500/20 text-sm font-medium text-white/90">
              Vista previa del banner
            </div>
          )}
        </div>
        <div className="-mt-8 flex items-end gap-3 px-5 pb-5">
          <div
            className="size-16 rounded-2xl border border-border bg-background bg-cover bg-center"
            style={settings.icon_url ? { backgroundImage: `url(${settings.icon_url})` } : undefined}
          />
          <div>
            <p className="text-lg font-semibold">{settings.name}</p>
            <p className="text-xs opacity-70">c/{settings.slug}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface/70 p-5">
        <h2 className="text-lg font-semibold">General</h2>
        <p className="mt-1 text-sm opacity-70">Edita la identidad principal de la comunidad en una sección dedicada.</p>

        <div className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="font-medium">Nombre de la comunidad</span>
            <input
              name="name"
              defaultValue={settings.name}
              className="mt-1 w-full rounded-xl bg-input px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
              maxLength={80}
              required
            />
          </label>

          <label className="block text-sm">
            <span className="font-medium">Descripción</span>
            <textarea
              name="description"
              defaultValue={settings.description}
              className="mt-1 w-full rounded-xl bg-input px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
              maxLength={280}
              rows={4}
              placeholder="Describe esta comunidad"
            />
          </label>
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface/70 p-5">
        <h2 className="text-lg font-semibold">Apariencia</h2>
        <p className="mt-1 text-sm opacity-70">Añade icono y banner para que la comunidad se vea moderna.</p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
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
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-full bg-brand px-6 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Guardando..." : "Guardar cambios"}
        </button>
        <a
          href={`/c/${settings.slug}`}
          className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm hover:bg-muted/60"
        >
          Volver a la comunidad
        </a>
      </div>

      {message && <p className="text-sm text-emerald-500">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </form>
  );
}
