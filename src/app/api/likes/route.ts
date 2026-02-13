import { NextResponse } from "next/server";

const message = "Usa /api/likes/post o /api/likes/comment.";

export async function GET() {
  return NextResponse.json({ error: message }, { status: 400 });
}

export async function POST() {
  return NextResponse.json({ error: message }, { status: 400 });
}
