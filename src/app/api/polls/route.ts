export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser, requireUser } from "@/lib/auth";

type PollRow = RowDataPacket & {
  id: number;
  question: string;
  ends_at: Date | string;
};

type PollOptionRow = RowDataPacket & {
  id: number;
  text: string;
  votes: number;
};

type PollVoteRow = RowDataPacket & {
  option_id: number;
};

type PollResponse = {
  id: number;
  question: string;
  ends_at: string;
  options: { id: number; text: string; votes: number }[];
  totalVotes: number;
  userVotedOptionId: number | null;
};

type PollVoteRequest = {
  pollId?: unknown;
  optionId?: unknown;
};

/* GET /api/polls?postId=123 */
export async function GET(req: Request) {
  const me = await getSessionUser();
  const url = new URL(req.url);
  const postId = Number(url.searchParams.get("postId") || 0);
  if (!postId) return NextResponse.json(null);

  const [pollRows] = await db.query<PollRow[]>("SELECT id, question, ends_at FROM Polls WHERE post_id=? LIMIT 1", [postId]);
  const poll = pollRows[0];
  if (!poll) return NextResponse.json(null, { headers: { "Cache-Control": "no-store" } });

  const [optRows] = await db.query<PollOptionRow[]>(
    "SELECT id, text, votes FROM Poll_Options WHERE poll_id=? ORDER BY id ASC",
    [poll.id],
  );
  let userVotedOptionId: number | null = null;
  if (me) {
    const [voted] = await db.query<PollVoteRow[]>(
      "SELECT option_id FROM Poll_Votes WHERE poll_id=? AND user_id=? LIMIT 1",
      [poll.id, me.id],
    );
    userVotedOptionId = voted[0]?.option_id ?? null;
  }
  const options = optRows.map((opt) => ({
    id: Number(opt.id),
    text: String(opt.text),
    votes: Number(opt.votes),
  }));
  const totalVotes = options.reduce((a, b) => a + b.votes, 0);

  const response: PollResponse = {
    id: Number(poll.id),
    question: String(poll.question),
    ends_at: new Date(poll.ends_at).toISOString(),
    options,
    totalVotes,
    userVotedOptionId: userVotedOptionId ? Number(userVotedOptionId) : null,
  };

  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

/* POST /api/polls/vote { pollId, optionId } */
export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => null)) as PollVoteRequest | null;
  const pollId = Number(body?.pollId ?? 0);
  const optionId = Number(body?.optionId ?? 0);
  if (!pollId || !optionId) return NextResponse.json({ error: "datos inválidos" }, { status: 400 });

  // encuesta vigente
  const [p] = await db.query<PollRow[]>("SELECT ends_at FROM Polls WHERE id=? LIMIT 1", [pollId]);
  const poll = p[0];
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
