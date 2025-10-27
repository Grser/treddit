export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function POST(req: Request) {
  const me = await requireUser();
  const { pollId, optionId } = await req.json().catch(() => ({}));
  if (!pollId || !optionId) {
    return NextResponse.json({ error: "pollId y optionId requeridos" }, { status: 400 });
  }

  // Encuesta vigente
  const [p] = await db.query("SELECT ends_at FROM Polls WHERE id=? LIMIT 1", [pollId]);
  const poll = (p as any[])[0];
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
  const [[{ total }]]: any = await db.query(
    "SELECT SUM(votes) AS total FROM Poll_Options WHERE poll_id=?",
    [pollId]
  );
  const [opts] = await db.query(
    "SELECT id, text, votes FROM Poll_Options WHERE poll_id=? ORDER BY id ASC",
    [pollId]
  );

  return NextResponse.json({
    ok: true,
    pollId,
    totalVotes: Number(total) || 0,
    options: opts,
    userVotedOptionId: optionId,
  });
}
