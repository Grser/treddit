export const runtime = "nodejs";

import type { RowDataPacket } from "mysql2";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

type PollVoteRequest = {
  pollId?: unknown;
  optionId?: unknown;
};

type PollRow = RowDataPacket & { ends_at: Date | string };
type PollOptionRow = RowDataPacket & { id: number; text: string; votes: number };
type PollTotalRow = RowDataPacket & { total: number | null };

export async function POST(req: Request) {
  const me = await requireUser();
  const body = (await req.json().catch(() => null)) as PollVoteRequest | null;
  const pollId = Number(body?.pollId ?? 0);
  const optionId = Number(body?.optionId ?? 0);
  if (!pollId || !optionId) {
    return NextResponse.json({ error: "pollId y optionId requeridos" }, { status: 400 });
  }

  // Encuesta vigente
  const [p] = await db.query<PollRow[]>("SELECT ends_at FROM Polls WHERE id=? LIMIT 1", [pollId]);
  const poll = p[0];
  if (!poll) return NextResponse.json({ error: "Encuesta no existe" }, { status: 404 });
  if (new Date(poll.ends_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Encuesta finalizada" }, { status: 409 });
  }

  try {
    // Inserta voto (PK en (poll_id, user_id) evita repetidos)
    await db.execute(
      "INSERT INTO Poll_Votes (poll_id, option_id, user_id, created_at) VALUES (?, ?, ?, NOW())",
      [pollId, optionId, me.id]
    );
    // Sube contador
    await db.execute(
      "UPDATE Poll_Options SET votes=votes+1 WHERE id=? AND poll_id=?",
      [optionId, pollId]
    );
  } catch {
    return NextResponse.json({ error: "Ya votaste" }, { status: 409 });
  }

  // Devuelve estado actualizado mínimo
  const [totalRows] = await db.query<PollTotalRow[]>(
    "SELECT SUM(votes) AS total FROM Poll_Options WHERE poll_id=?",
    [pollId],
  );
  const totalVotes = Number(totalRows[0]?.total ?? 0);
  const [opts] = await db.query<PollOptionRow[]>(
    "SELECT id, text, votes FROM Poll_Options WHERE poll_id=? ORDER BY id ASC",
    [pollId],
  );

  return NextResponse.json({
    ok: true,
    pollId,
    totalVotes,
    options: opts.map((opt) => ({
      id: Number(opt.id),
      text: String(opt.text),
      votes: Number(opt.votes),
    })),
    userVotedOptionId: optionId,
  });
}
