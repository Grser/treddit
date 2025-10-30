"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/contexts/LocaleContext";

type Tab = "post" | "media" | "poll";

type ComposerErrorKey = "needContent" | "uploadFailed" | "createFailed" | "pollInvalid" | "mediaEmpty" | null;

export default function Composer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { strings } = useLocale();
  const t = strings.composer;

  const [tab, setTab] = useState<Tab>("post");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [errorKey, setErrorKey] = useState<ComposerErrorKey>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [days, setDays] = useState(1);

  const errorMessage = useMemo(() => {
    if (errorKey) return t.errors[errorKey];
    if (serverError) return serverError;
    return null;
  }, [errorKey, serverError, t.errors]);

  function clearError() {
    setErrorKey(null);
    setServerError(null);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!enabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    clearError();
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.url) {
        setMediaUrl(j.url);
        setTab("media");
        clearError();
      } else {
        setErrorKey("uploadFailed");
      }
    } catch {
      setErrorKey("uploadFailed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function setOption(i: number, val: string) {
    const copy = [...options];
    copy[i] = val;
    setOptions(copy);
  }

  type PollPayload = {
    question: string;
    options: string[];
    days: number;
  } | null;

  type ComposerPayload = {
    description: string | null;
    mediaUrl: string | null;
    poll: PollPayload;
  };

  async function submit() {
    if (!enabled) return;

    const payload: ComposerPayload = {
      description: text || null,
      mediaUrl: null,
      poll: null,
    };

    if (tab === "media") {
      payload.mediaUrl = mediaUrl || null;
      if (!payload.mediaUrl && !payload.description) {
        setErrorKey("mediaEmpty");
        return;
      }
    }

    if (tab === "poll") {
      const opts = options.map((o) => o.trim()).filter(Boolean);
      if (!question.trim() || opts.length < 2) {
        setErrorKey("pollInvalid");
        return;
      }
      payload.poll = {
        question: question.trim(),
        options: opts,
        days: Math.max(1, Math.min(7, days)),
      };
    }

    if (tab === "post" && !payload.description) {
      setErrorKey("needContent");
      return;
    }

    clearError();

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setText("");
        setMediaUrl("");
        setQuestion("");
        setOptions(["", ""]);
        setDays(1);
        setTab("post");
        clearError();
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        if (j.error) {
          setServerError(j.error);
        } else {
          setErrorKey("createFailed");
        }
      }
    } catch {
      setErrorKey("createFailed");
    }
  }

  return (
    <div className="border border-border bg-surface rounded-xl p-4">
      <div className="flex gap-2 mb-3 text-sm">
        <TabBtn active={tab === "post"} onClick={() => { clearError(); setTab("post"); }}>
          {t.tabs.text}
        </TabBtn>
        <TabBtn active={tab === "media"} onClick={() => { clearError(); setTab("media"); }}>
          {t.tabs.media}
        </TabBtn>
        <TabBtn active={tab === "poll"} onClick={() => { clearError(); setTab("poll"); }}>
          {t.tabs.poll}
        </TabBtn>
      </div>

      {tab !== "poll" && (
        <textarea
          className="w-full resize-none rounded-md bg-input text-sm p-3 outline-none ring-1 ring-border focus:ring-2"
          placeholder={enabled ? t.placeholderEnabled : t.placeholderDisabled}
          disabled={!enabled}
          rows={3}
          value={text}
          onChange={(e) => {
            clearError();
            setText(e.target.value);
          }}
        />
      )}

      {tab === "media" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="url"
              placeholder={t.mediaPlaceholder}
              className="flex-1 h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
              disabled={!enabled}
              value={mediaUrl}
              onChange={(e) => {
                clearError();
                setMediaUrl(e.target.value);
              }}
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
            <p className="text-xs opacity-70">
              {t.attachLabel}: {mediaUrl}
            </p>
          )}
        </div>
      )}

      {tab === "poll" && (
        <div className="mt-2 space-y-2">
          <input
            type="text"
            placeholder={t.pollQuestion}
            className="w-full h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
            disabled={!enabled}
            value={question}
            onChange={(e) => {
              clearError();
              setQuestion(e.target.value);
            }}
          />
          {options.map((opt, i) => (
            <input
              key={i}
              type="text"
              placeholder={t.pollOption(i + 1)}
              className="w-full h-10 px-3 rounded-md bg-input text-sm outline-none ring-1 ring-border focus:ring-2"
              disabled={!enabled}
              value={opt}
              onChange={(e) => {
                clearError();
                setOption(i, e.target.value);
              }}
            />
          ))}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 px-2 rounded-md border border-border text-xs"
              disabled={!enabled || options.length >= 4}
              onClick={() => setOptions((o) => (o.length < 4 ? [...o, ""] : o))}
            >
              {t.addOption}
            </button>
            <button
              type="button"
              className="h-8 px-2 rounded-md border border-border text-xs"
              disabled={!enabled || options.length <= 2}
              onClick={() => setOptions((o) => (o.length > 2 ? o.slice(0, -1) : o))}
            >
              {t.removeOption}
            </button>
            <label className="text-xs opacity-80">
              {t.pollDuration}:
              <input
                type="number"
                min={1}
                max={7}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value || "1", 10))}
                className="ml-2 w-16 h-8 px-2 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
                disabled={!enabled}
              />
            </label>
          </div>
        </div>
      )}

      {errorMessage && (
        <p className="mt-3 text-sm text-red-500" role="status">
          {errorMessage}
        </p>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={submit}
          disabled={!enabled || uploading}
          className="h-9 px-4 rounded-full bg-brand text-white text-sm disabled:opacity-50"
          title={!enabled ? t.submitDisabledTitle : t.submit}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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
