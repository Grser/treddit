"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

type Tab = "post" | "media" | "poll";

export default function Composer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("post");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // encuesta
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [days, setDays] = useState(1);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!enabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) {
        setMediaUrl(j.url); // e.g. /uploads/1699999999-foto.png
        setTab("media");
        setError(null);
      } else {
        setError(j.error || "No se pudo subir el archivo");
      }
    } catch {
      setError("No se pudo subir el archivo");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // asegura mínimo 2 y máximo 4 opciones
  function setOption(i: number, val: string) {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  }

  async function submit() {
    if (!enabled) return;

    // decide payload según pestaña activa
    const payload: any = {
      description: text || null,
      mediaUrl: null,
      poll: null,
    };

    if (tab === "media") {
      payload.mediaUrl = mediaUrl || null;
      if (!payload.mediaUrl && !payload.description) {
        setError("Agrega texto o una imagen/video.");
        return;
      }
    }

    if (tab === "poll") {
      const opts = options.map(o => o.trim()).filter(Boolean);
      if (!question.trim() || opts.length < 2) {
        setError("La encuesta necesita una pregunta y al menos 2 opciones.");
        return;
      }
      payload.poll = { question: question.trim(), options: opts, days: Math.max(1, Math.min(7, days)) };
    }

    // si es solo texto, también vale
    if (tab === "post" && !payload.description) {
      setError("Escribe algo para publicar.");
      return;
    }

    setError(null);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // limpia estados locales
        setText("");
        setMediaUrl("");
        setQuestion("");
        setOptions(["", ""]);
        setDays(1);
        setTab("post");
        setError(null);
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        setError(j.error || "No se pudo crear la publicación");
      }
    } catch {
      setError("No se pudo crear la publicación");
    }
  }

  return (
    <div className="border border-border bg-surface rounded-xl p-4">
      {/* tabs */}
      <div className="flex gap-2 mb-3 text-sm">
        <TabBtn active={tab==="post"} onClick={()=>setTab("post")}>Texto</TabBtn>
        <TabBtn active={tab==="media"} onClick={()=>setTab("media")}>Media</TabBtn>
        <TabBtn active={tab==="poll"} onClick={()=>setTab("poll")}>Encuesta</TabBtn>
      </div>

      {/* contenido */}
      {tab !== "poll" && (
        <textarea
          className="w-full resize-none rounded-md bg-input text-sm p-3 outline-none ring-1 ring-border focus:ring-2"
          placeholder={enabled ? "¿Qué quieres compartir?" : "Inicia sesión para publicar"}
          disabled={!enabled}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {tab === "media" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder="URL de imagen o video (https://...)"
              className="flex-1 h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
              disabled={!enabled}
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              disabled={!enabled || uploading}
              onChange={handleFile}
              className="block text-sm"
            />
          </div>
          {mediaUrl && (
            <p className="text-xs opacity-70">Adjunto: {mediaUrl}</p>
          )}
        </div>
      )}

      {tab === "poll" && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder="Pregunta"
            className="w-full h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
            disabled={!enabled}
            value={question}
            onChange={(e)=>setQuestion(e.target.value)}
          />
          {options.map((opt, i)=>(
            <input
              key={i}
              type="text"
              placeholder={`Opción ${i+1}`}
              className="w-full h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
              disabled={!enabled}
              value={opt}
              onChange={(e)=>setOption(i, e.target.value)}
            />
          ))}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-2 rounded-md border border-border text-xs"
              disabled={!enabled || options.length >= 4}
              onClick={()=> setOptions(o => o.length<4 ? [...o, ""] : o)}
            >
              Añadir opción
            </button>
            <button
              type="button"
              className="h-8 px-2 rounded-md border border-border text-xs"
              disabled={!enabled || options.length <= 2}
              onClick={()=> setOptions(o => o.length>2 ? o.slice(0, -1) : o)}
            >
              Quitar opción
            </button>
            <label className="text-xs opacity-80">Duración (días):
              <input
                type="number" min={1} max={7}
                value={days} onChange={e=>setDays(parseInt(e.target.value||"1",10))}
                className="ml-2 w-16 h-8 px-2 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
                disabled={!enabled}
              />
            </label>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-3 text-sm text-red-500" role="status">
          {error}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={!enabled || uploading}
          className="h-9 px-4 rounded-full bg-brand text-white text-sm disabled:opacity-50"
          title={!enabled ? "Inicia sesión para publicar" : "Publicar"}
        >
          Publicar
        </button>
      </div>
    </div>
  );
}

function TabBtn({active, onClick, children}:{active:boolean; onClick:()=>void; children:React.ReactNode}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-3 rounded-full text-sm border ${active ? "bg-brand text-white border-transparent" : "border-border"}`}
    >
      {children}
    </button>
  );
}
