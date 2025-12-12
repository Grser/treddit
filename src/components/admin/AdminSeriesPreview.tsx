"use client";

import { type FormEvent, useMemo, useState } from "react";

import type { KitsuSeriesResult } from "@/types/admin";

function pickTitle(result: KitsuSeriesResult) {
  const titleOrder = ["canonicalTitle", "en_jp", "en", "ja_jp", "es_es", "es_la"];

  for (const key of titleOrder) {
    if (key === "canonicalTitle" && result.canonicalTitle) return result.canonicalTitle;
    const candidate = result.titles?.[key];
    if (candidate) return candidate;
  }

  const fallback = Object.values(result.titles || {})[0];
  return fallback || result.slug || "Título sin nombre";
}

function formatDateRange(start?: string | null, end?: string | null) {
  if (!start && !end) return "Sin fecha";

  const format = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString("es-ES", { month: "short", year: "numeric" }) : null;

  const startStr = format(start);
  const endStr = format(end);

  if (startStr && endStr) return `${startStr} – ${endStr}`;
  if (startStr) return startStr;
  if (endStr) return endStr;
  return "Sin fecha";
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-brand">
      {label}
    </span>
  );
}

function SeriesCard({ result }: { result: KitsuSeriesResult }) {
  const title = useMemo(() => pickTitle(result), [result]);
  const period = useMemo(() => formatDateRange(result.startDate, result.endDate), [result.startDate, result.endDate]);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      <div className="relative h-40 w-full bg-muted">
        {result.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.coverImage}
            alt="Portada"
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs opacity-60">Sin banner</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/70" />
        <div className="absolute bottom-3 left-3 flex items-end gap-3 text-white">
          {result.posterImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={result.posterImage}
              alt="Poster"
              className="h-28 w-20 rounded-lg object-cover shadow-lg ring-2 ring-white/60"
              loading="lazy"
            />
          ) : (
            <div className="flex h-28 w-20 items-center justify-center rounded-lg bg-black/30 text-[11px] uppercase tracking-wide">
              Sin póster
            </div>
          )}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold leading-tight drop-shadow">{title}</h3>
            <p className="text-xs opacity-80 drop-shadow">
              {result.slug ? `kitsu.app/anime/${result.slug}` : "Slug no disponible"}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-medium">
              {result.status && <StatusPill label={result.status} />}
              {result.subtype && <StatusPill label={result.subtype} />}
              {result.ageRating && <StatusPill label={result.ageRating} />}      
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4 text-sm">
        <p className="whitespace-pre-line text-sm opacity-80 line-clamp-3">
          {result.synopsis || "Esta serie no tiene sinopsis en Kitsu."}
        </p>
        <div className="flex flex-wrap gap-3 text-xs opacity-80">
          <span className="rounded-lg bg-muted px-3 py-1">{period}</span>
          {typeof result.episodeCount === "number" && (
            <span className="rounded-lg bg-muted px-3 py-1">{result.episodeCount} episodios</span>
          )}
          {result.ageRatingGuide && <span className="rounded-lg bg-muted px-3 py-1">{result.ageRatingGuide}</span>}
        </div>
      </div>
    </article>
  );
}

export default function AdminSeriesPreview() {
  const [slug, setSlug] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<KitsuSeriesResult[]>([]);
  const [lastSearch, setLastSearch] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanedSlug = slug.trim();
    const cleanedQuery = query.trim();

    if (!cleanedSlug && !cleanedQuery) {
      setError("Escribe un slug o una palabra clave para buscar en Kitsu.");
      setResults([]);
      return;
    }

    const params = new URLSearchParams();
    if (cleanedSlug) params.set("slug", cleanedSlug);
    else params.set("query", cleanedQuery);

    setLoading(true);
    setLastSearch(cleanedSlug || cleanedQuery);

    try {
      const response = await fetch(`/api/admin/series?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        setError(json?.error || "No se pudo obtener la información de Kitsu.");
        setResults([]);
        return;
      }

      setResults(Array.isArray(json?.results) ? json.results : []);
    } catch (err) {
      console.error(err);
      setError("Error de conexión con el servicio de Kitsu.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const emptyStateLabel = lastSearch
    ? `No encontramos resultados para "${lastSearch}". Prueba otro término o revisa el slug.`
    : "Aún no has hecho una búsqueda. Usa el formulario para ver cómo se vería la ficha.";

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Previsualiza la ficha de una serie</h2>
            <p className="text-sm opacity-75">
              Usa el slug exacto de Kitsu o busca por nombre para traer portada, banner y metadatos listos para crear la serie.
            </p>
          </div>
          <div className="rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            Vista previa
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm font-medium">
            Slug de Kitsu (opcional)
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              type="text"
              placeholder="por-ejemplo-attack-on-titan"
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
            />
            <span className="mt-1 block text-xs opacity-70">Se usa si lo proporcionas; de lo contrario tomaremos la búsqueda.</span>
          </label>
          <label className="text-sm font-medium">
            Búsqueda por nombre
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder="ej. Fullmetal Alchemist"
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-brand/60"
            />
            <span className="mt-1 block text-xs opacity-70">Se usa si dejas el campo de slug vacío.</span>
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand/90 disabled:opacity-60"
          >
            {loading ? "Buscando..." : "Buscar en Kitsu"}
          </button>
          <button
            type="button"
            onClick={() => {
              setSlug("");
              setQuery("");
              setResults([]);
              setError(null);
              setLastSearch("");
            }}
            className="inline-flex items-center rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
          >
            Limpiar
          </button>
        </div>
      </form>

      {loading ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm opacity-80">Cargando vista previa...</div>
      ) : results.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {results.map((item) => (
            <SeriesCard key={item.id} result={item} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm opacity-80">{emptyStateLabel}</div>
      )}
    </div>
  );
}
