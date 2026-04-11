import { NextResponse } from "next/server";

function normalizeExternalUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractImageFromHtml(html: string, baseUrl: URL) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["'][^>]*>/i,
    /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;
    try {
      return new URL(candidate, baseUrl).toString();
    } catch {
      continue;
    }
  }

  return null;
}

export async function GET(req: Request) {
  const requestUrl = new URL(req.url);
  const rawUrl = (requestUrl.searchParams.get("url") || "").slice(0, 2048);
  const parsedUrl = normalizeExternalUrl(rawUrl);

  if (!parsedUrl) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  try {
    const res = await fetch(parsedUrl.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        "user-agent": "Mozilla/5.0 TredditBot",
        accept: "text/html,image/*;q=0.9,*/*;q=0.8",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "No se pudo abrir el enlace" }, { status: 400 });
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType.startsWith("image/")) {
      return NextResponse.json({ ok: true, imageUrl: res.url || parsedUrl.toString() });
    }

    if (contentType.includes("text/html")) {
      const html = await res.text();
      const imageUrl = extractImageFromHtml(html, new URL(res.url || parsedUrl.toString()));
      if (imageUrl) {
        return NextResponse.json({ ok: true, imageUrl });
      }
    }

    return NextResponse.json({ error: "El enlace no contiene una imagen utilizable" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "No se pudo resolver la URL" }, { status: 400 });
  }
}
