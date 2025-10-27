export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";

/* GET /api/polls?postId=123 */
export async function GET(req: Request) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const postId = Number(url.searchParams.get("postId") || 0);
  if (!postId) return NextResponse.json(null);

  const [pollRows] = await db.query("SELECT id, question, ends_at FROM Polls WHERE post_id=? LIMIT 1", [postId]);
  const poll = (pollRows as any[])[0];
  if (!poll) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });

  const [optRows] = await db.query("SELECT id, text, votes FROM Poll_Options WHERE poll_id=? ORDER BY id ASC", [poll.id]);
  let userVotedOptionId: number | null = null;
  if (me) {
    const [voted] = await db.query("SELECT option_id FROM Poll_Votes WHERE poll_id=? AND user_id=? LIMIT 1", [poll.id, me.id]);
    userVotedOptionId = (voted as any[])[0]?.option_id ?? null;
  }
  const totalVotes = (optRows as any[]).reduce((a, b) => a + Number(b.votes), 0);

  return NextResponse.json(
    { id: poll.id, question: poll.question, ends_at: poll.ends_at, options: optRows, totalVotes, userVotedOptionId },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* POST /api/polls/vote { pollId, optionId } */
export async function POST(req: Request) {
  const me = await requireUser();
  const { pollId, optionId } = await req.json().catch(() => ({}));
  if (!pollId || !optionId) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  // encuesta vigente
  const [p] = await db.query("SELECT ends_at FROM Polls WHERE id=? LIMIT 1", [pollId]);
  const poll = (p as any[])[0];
  if (!poll) return NextResponse.json({ error: "no existe" }, { status: 404 });
  if (new Date(poll.ends_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "finalizada" }, { status: 409 });
  }

  // evita voto repetido (PK en (poll_id, user_id))
  try {
    await db.execute("INSERT INTO Poll_Votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, NOW())",
      [pollId, optionId, me.id]);
    await db.execute("UPDATE Poll_Options SET votes=votes+1 WHERE id=? AND poll_id=?", [optionId, pollId]);
  } catch {
    return NextResponse.json({ error: "ya votaste" }, { status: 409 });
  }

  return NextResponse.json({ ok: true });
}
