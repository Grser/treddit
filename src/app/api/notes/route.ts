export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { getSessionUser, requireUser } from "@/lib/auth";
import { resolveSongLyrics } from "@/lib/lyrics";
import { resolveMusicMetadata } from "@/lib/musicMetadata";
import { createUserNote, deleteNoteByUser, loadActiveNotes } from "@/lib/storiesNotes";

export async function GET() {
  const me = await getSessionUser();
  const items = await loadActiveNotes(24, me?.id);
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
    ? (payload as { content: string }).content.trim().slice(0, 180)
    : "";

  if (!content) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  const songUrl = typeof (payload as { song_url?: unknown })?.song_url === "string"
    ? (payload as { song_url: string }).song_url.trim().slice(0, 500)
    : "";

  const metadata = songUrl ? await resolveMusicMetadata(songUrl) : { title: null, artist: null };
  const lyrics = songUrl ? await resolveSongLyrics(metadata.title, metadata.artist) : null;

  const id = await createUserNote(me.id, {
    content,
    song_title: metadata.title,
    song_artist: metadata.artist,
    song_url: songUrl || null,
    song_lyrics: lyrics,
  });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}

export async function DELETE() {
  const me = await requireUser();
  await deleteNoteByUser(me.id);
  return NextResponse.json({ ok: true });
}
