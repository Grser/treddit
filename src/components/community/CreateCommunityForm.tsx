"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/contexts/LocaleContext";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export default function CreateCommunityForm() {
  const { strings } = useLocale();
  const t = strings.createCommunity;
  const router = useRouter();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [touchedSlug, setTouchedSlug] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    return name.trim().length >= 3 && /^[a-z0-9-]{3,32}$/.test(slug.trim());
  }, [name, slug]);

  function handleNameChange(value: string) {
    setName(value);
    if (!touchedSlug) {
      const nextSlug = slugify(value);
      setSlug(nextSlug);
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t.error);
      }
      setMessage(t.success);
      setName("");
      setSlug("");
      setDescription("");
      setTouchedSlug(false);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message || t.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h1 className="text-xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm opacity-80">{t.subtitle}</p>

      <form onSubmit={submit} className="mt-5 space-y-4">
        <label className="block text-sm">
          <span className="font-medium">{t.nameLabel}</span>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            className="mt-1 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
            maxLength={80}
            required
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium">{t.slugLabel}</span>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setTouchedSlug(true);
            }}
            className="mt-1 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
            pattern="[a-z0-9-]{3,32}"
            maxLength={32}
            required
          />
          <span className="mt-1 block text-xs opacity-70">{t.slugHelp}</span>
        </label>

        <label className="block text-sm">
          <span className="font-medium">{t.descriptionLabel}</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full rounded-lg bg-input px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-2 focus:ring-brand/60"
            maxLength={280}
            rows={4}
            placeholder={t.descriptionHelp}
          />
          <span className="mt-1 block text-xs opacity-60">
            {description.length}/280
          </span>
        </label>

        <button
          type="submit"
          className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
          disabled={!isValid || busy}
        >
          {busy ? "…" : t.submit}
        </button>

        {message && <p className="text-sm text-emerald-500">{message}</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </section>
  );
}
