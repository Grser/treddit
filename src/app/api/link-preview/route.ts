import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";

type PreviewPayload = {
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  domain: string;
};

function sanitizeText(value: string | null | undefined, max = 280) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, max);
}

function readMetaTag(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function readTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match?.[1]) return null;
  return match[1];
}

export async function GET(req: Request) {
  await requireUser();

  const { searchParams } = new URL(req.url);
  const urlRaw = (searchParams.get("url") || "").trim();

  if (!urlRaw) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlRaw);
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(target.protocol)) {
    return NextResponse.json({ error: "Protocolo no permitido" }, { status: 400 });
  }

  try {
    const response = await fetch(target.toString(), {
      redirect: "follow",
      headers: {
        "User-Agent": "TredditLinkPreviewBot/1.0",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "No se pudo obtener la URL" }, { status: 400 });
    }

    const html = await response.text();
    const title = sanitizeText(readMetaTag(html, "og:title") || readTitle(html), 140) || target.hostname;
    const description = sanitizeText(readMetaTag(html, "og:description") || readMetaTag(html, "description"), 220);
    const imageRaw = sanitizeText(readMetaTag(html, "og:image"), 500);
    let image: string | null = null;
    if (imageRaw) {
      try {
        image = new URL(imageRaw, target).toString();
      } catch {
        image = null;
      }
    }

    const payload: PreviewPayload = {
      url: target.toString(),
      title,
      description,
      image,
      domain: target.hostname,
    };

    return NextResponse.json({ preview: payload });
  } catch (error) {
    console.error("Failed to resolve link preview", error);
    return NextResponse.json({ error: "No se pudo generar vista previa" }, { status: 500 });
  }
}
