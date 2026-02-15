"use client";

import { useState } from "react";

type NotificationSettingsPanelProps = {
  initial: {
    follows: boolean;
    likes: boolean;
    reposts: boolean;
    mentions: boolean;
    ads: boolean;
  };
};

export default function NotificationSettingsPanel({ initial }: NotificationSettingsPanelProps) {
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function submit(next: typeof prefs) {
    setPrefs(next);
    setSaving(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preferences", preferences: next }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    setSaving(true);
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });
      window.location.reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Preferencias de notificaciones</h2>
        <button
          type="button"
          onClick={clearAll}
          className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60"
          disabled={saving}
        >
          Borrar notificaciones
        </button>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {([
          ["follows", "Seguidores"],
          ["likes", "Me gusta"],
          ["reposts", "Reposts"],
          ["mentions", "Menciones"],
          ["ads", "Anuncios"],
        ] as const).map(([key, label]) => (
          <label key={key} className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={prefs[key]}
              onChange={(event) => {
                const next = { ...prefs, [key]: event.target.checked };
                void submit(next);
              }}
            />
            {label}
          </label>
        ))}
      </div>
    </section>
  );
}
