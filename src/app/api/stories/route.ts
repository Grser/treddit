export const runtime = "nodejs";

import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { createStory, loadActiveStories } from "@/lib/storiesNotes";

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

  if (!content) {
    return NextResponse.json({ error: "Contenido vacío" }, { status: 400 });
  }

  const id = await createStory(me.id, content);
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
