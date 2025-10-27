"use client";
import { useEffect, useMemo, useState } from "react";

type PollOption = { id: number; text: string; votes: number };
type PollData = {
  id: number;
  question: string;
  ends_at: string; // ISO
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: number | null;
};

export default function PostPoll({ postId, canInteract }: { postId: number; canInteract: boolean }) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/polls?postId=${postId}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const p = await res.json();
        setPoll(p ?? null);
      } catch { setPoll(null); }
      finally { setLoading(false); }
    })();
  }, [postId]);

  const endsInHours = useMemo(() => {
    if (!poll) return 0;
    const left = (new Date(poll.ends_at).getTime() - Date.now()) / 3600000;
    return Math.max(0, Math.round(left));
  }, [poll]);

  async function vote(optionId: number) {
    if (!poll || !canInteract || busy) return;
    if (poll.userVotedOptionId) return;

    setBusy(true);
    // actualiza optimista
    setPoll(p => {
      if (!p) return p;
      const next = { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votes: o.votes + 1 } : o), totalVotes: p.totalVotes + 1, userVotedOptionId: optionId };
      return next;
    });

    try {
      const res = await fetch("/api/polls/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pollId: poll.id, optionId }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // revertir si falla
      setPoll(null); // volverá a cargar al expandir de nuevo
      alert("No se pudo registrar tu voto");
    } finally {
      setBusy(false);
    }
  }

  if (loading || !poll) return null;

  return (
    <div className="mt-2">
      <p className="font-medium mb-2">{poll.question}</p>
      <ul className="space-y-2">
        {poll.options.map((o) => {
          const pct = poll.totalVotes ? Math.round((o.votes * 100) / poll.totalVotes) : 0;
          const selected = poll.userVotedOptionId === o.id;
          return (
            <li key={o.id} className="relative">
              {/* barra vertical estilo X (usamos una barra fina a la izquierda) */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded bg-muted" />
              <button
                disabled={!!poll.userVotedOptionId || !canInteract || busy || endsInHours <= 0}
                onClick={() => vote(o.id)}
                className={`w-full text-left pl-3 pr-2 py-2 rounded-md hover:bg-muted/60 disabled:opacity-60 ${selected ? "ring-1 ring-blue-400/50" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm">{o.text}</span>
                  <span className={`text-sm ${selected ? "text-blue-400" : "opacity-80"}`}>{pct} %</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs opacity-70 mt-1">
        {poll.totalVotes} {poll.totalVotes === 1 ? "voto" : "votos"} · {endsInHours} {endsInHours === 1 ? "hora" : "horas"} restantes
      </p>
    </div>
  );
}
