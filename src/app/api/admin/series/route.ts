export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth";

type KitsuImage = {
  original?: string;
  large?: string;
  medium?: string;
  small?: string;
  tiny?: string;
};

type KitsuAnime = {
  id: string;
  type: string;
  attributes?: {
    canonicalTitle?: string;
    slug?: string;
    synopsis?: string;
    startDate?: string;
    endDate?: string;
    episodeCount?: number | null;
    status?: string;
    ageRating?: string;
    ageRatingGuide?: string;
    subtype?: string;
    titles?: Record<string, string>;
    posterImage?: KitsuImage | null;
    coverImage?: KitsuImage | null;
  };
};

function pickBestImage(image?: KitsuImage | null): string | null {
  if (!image) return null;
  return (
    image.original ||
    image.large ||
    image.medium ||
    image.small ||
    image.tiny ||
    null
  );
}

function mapAnime(item: KitsuAnime) {
  const attrs = item.attributes ?? {};
  return {
    id: item.id,
    slug: attrs.slug ?? null,
    canonicalTitle: attrs.canonicalTitle ?? null,
    titles: attrs.titles ?? {},
    synopsis: attrs.synopsis ?? null,
    startDate: attrs.startDate ?? null,
    endDate: attrs.endDate ?? null,
    episodeCount: attrs.episodeCount ?? null,
    status: attrs.status ?? null,
    subtype: attrs.subtype ?? null,
    ageRating: attrs.ageRating ?? null,
    ageRatingGuide: attrs.ageRatingGuide ?? null,
    posterImage: pickBestImage(attrs.posterImage ?? undefined),
    coverImage: pickBestImage(attrs.coverImage ?? undefined),
  };
}

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug")?.trim();
  const query = url.searchParams.get("query")?.trim();

  if (!slug && !query) {
    return NextResponse.json(
      { error: "Debes enviar el slug de Kitsu o un término de búsqueda" },
      { status: 400 },
    );
  }

  const filterParam = slug ? `filter[slug]=${encodeURIComponent(slug)}` : `filter[text]=${encodeURIComponent(query!)}`;
  const requestUrl = `https://kitsu.io/api/edge/anime?${filterParam}&page[limit]=5`;

  let response: Response;
  try {
    response = await fetch(requestUrl, {
      headers: { Accept: "application/vnd.api+json" },
      next: { revalidate: 0 },
    });
  } catch (error) {
    console.error("Error fetching Kitsu API", error);
    return NextResponse.json(
      { error: "No se pudo conectar con Kitsu" },
      { status: 502 },
    );
  }

  if (!response.ok) {
    return NextResponse.json(
      { error: "Kitsu respondió con un error", status: response.status },
      { status: 502 },
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { data?: KitsuAnime[] }
    | null;

  if (!payload?.data || !Array.isArray(payload.data) || payload.data.length === 0) {
    return NextResponse.json({ results: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const mapped = payload.data.filter((item) => item?.id && item.type === "anime").map(mapAnime);

  return NextResponse.json(
    { results: mapped },
    { headers: { "Cache-Control": "no-store" } },
  );
}
