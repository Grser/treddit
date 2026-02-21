export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSessionUser, requireUser } from "@/lib/auth";
import { createStory, deleteStoryById, deleteStoryByUser, loadActiveStories, registerStoryView } from "@/lib/storiesNotes";

export async function GET() {
  const me = await getSessionUser();
  const items = await loadActiveStories(24, me?.id);
  return NextResponse.json({ items }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const me = await requireUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const content = typeof (payload as { content?: unknown })?.content === "string"
    ? (payload as { content: string }).content.trim().slice(0, 220)
    : "";
  const mediaUrl = typeof (payload as { media_url?: unknown })?.media_url === "string"
    ? (payload as { media_url: string }).media_url.trim().slice(0, 500)
    : "";
  const mediaUrls = Array.isArray((payload as { media_urls?: unknown })?.media_urls)
    ? (payload as { media_urls: unknown[] }).media_urls
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().slice(0, 500))
      .filter(Boolean)
    : [];
  const normalizedMediaUrls = [...new Set(mediaUrls.length > 0 ? mediaUrls : mediaUrl ? [mediaUrl] : [])].slice(0, 10);

  if (normalizedMediaUrls.length === 0) {
    return NextResponse.json({ error: "La historia necesita una foto o video" }, { status: 400 });
  }

  const ids: number[] = [];
  for (const currentMediaUrl of normalizedMediaUrls) {
    const id = await createStory(me.id, { content: content || null, media_url: currentMediaUrl });
    if (typeof id === "number" && id > 0) ids.push(id);
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "No se pudo publicar tu historia" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ids, id: ids[0] }, { status: 201 });
}

export async function DELETE(req: Request) {
  const me = await requireUser();

  let payload: unknown = null;
  try {
    payload = await req.json();
  } catch {
    payload = null;
  }

  const storyId = Number((payload as { storyId?: unknown } | null)?.storyId);

  if (Number.isFinite(storyId) && storyId > 0) {
    const affected = await deleteStoryById(me.id, storyId);
    if (affected === 0) {
      return NextResponse.json({ error: "No se encontró la historia seleccionada." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, deleted: affected });
  }

  await deleteStoryByUser(me.id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const me = await requireUser();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const storyId = Number((payload as { storyId?: unknown })?.storyId);
  if (!Number.isFinite(storyId) || storyId <= 0) {
    return NextResponse.json({ error: "Historia inválida" }, { status: 400 });
  }

  await registerStoryView(storyId, me.id);
  return NextResponse.json({ ok: true });
}
