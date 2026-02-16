export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createStory, deleteStoryByUser, loadActiveStories } from "@/lib/storiesNotes";

export async function GET() {
  const items = await loadActiveStories();
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

  if (!mediaUrl) {
    return NextResponse.json({ error: "La historia necesita una foto" }, { status: 400 });
  }

  const id = await createStory(me.id, { content: content || null, media_url: mediaUrl });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function DELETE() {
  const me = await requireUser();
  await deleteStoryByUser(me.id);
  return NextResponse.json({ ok: true });
}
