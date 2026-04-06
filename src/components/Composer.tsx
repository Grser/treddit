"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

import { useLocale } from "@/contexts/LocaleContext";
import { formatUploadLimit } from "@/lib/upload";
import { uploadFile } from "@/lib/clientUpload";
import { isImageMediaUrl } from "@/lib/sensitiveMedia";
import EmojiPicker from "@/components/EmojiPicker";

type Tab = "post" | "media" | "poll";

type ComposerErrorKey = "needContent" | "uploadFailed" | "createFailed" | "pollInvalid" | "mediaEmpty" | null;

type CommunityOption = { id: number; name: string; slug: string };
type MentionUser = { id: number; username: string; nickname: string | null };
const POST_TEXT_LIMIT = 2000;

export default function Composer({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const { strings } = useLocale();
  const t = strings.composer;

  const [tab, setTab] = useState<Tab>("post");
  const [text, setText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isSensitive, setIsSensitive] = useState(false);
  const [sensitiveSuggested, setSensitiveSuggested] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [errorKey, setErrorKey] = useState<ComposerErrorKey>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [communities, setCommunities] = useState<CommunityOption[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesError, setCommunitiesError] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState<number>(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<MentionUser[]>([]);
  const [mentionsLoading, setMentionsLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const canMarkSensitive = Boolean(mediaUrl && isImageMediaUrl(mediaUrl));

  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [days, setDays] = useState(1);

  function normalizePollDays(value: number) {
    return Number.isFinite(value) ? Math.max(1, Math.min(7, Math.trunc(value))) : 1;
  }

  const errorMessage = useMemo(() => {
    if (errorKey) return t.errors[errorKey];
    if (serverError) return serverError;
    return null;
  }, [errorKey, serverError, t.errors]);

  function clearError() {
    setErrorKey(null);
    setServerError(null);
  }

  useEffect(() => {
    if (!enabled) {
      setCommunities([]);
      setCommunityId(0);
      setCommunitiesError(null);
      return;
    }

    let active = true;
    setCommunitiesLoading(true);
    setCommunitiesError(null);

    fetch("/api/communities/mine", { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          throw new Error(String(res.status));
        }
        const data = (await res.json().catch(() => ({ items: [] }))) as {
          items?: { id: number; name: string; slug: string }[];
        };
        const list = Array.isArray(data.items) ? data.items : [];
        setCommunities(
          list.map((item) => ({
            id: Number(item.id),
            name: item.name,
            slug: item.slug,
          })),
        );
      })
      .catch(() => {
        if (!active) return;
        setCommunitiesError(t.communityLoadFailed);
      })
      .finally(() => {
        if (!active) return;
        setCommunitiesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled, t.communityLoadFailed]);

  useEffect(() => {
    const match = text.match(/(?:^|\s)@([\p{L}\p{N}_]{1,32})$/u);
    setMentionQuery(match ? match[1] : "");
  }, [text]);

  useEffect(() => {
    if (!enabled || !mentionQuery.trim()) {
      setMentionResults([]);
      setMentionsLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setMentionsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(mentionQuery.trim())}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json().catch(() => ({ items: [] }))) as {
          items?: MentionUser[];
        };
        if (!active) return;
        setMentionResults(Array.isArray(data.items) ? data.items : []);
      } catch {
        if (!active) return;
        setMentionResults([]);
      } finally {
        if (active) setMentionsLoading(false);
      }
    }, 120);

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [enabled, mentionQuery]);

  function insertMention(username: string) {
    setText((prev) => prev.replace(/(?:^|\s)@[\p{L}\p{N}_]{1,32}$/u, (full) => `${full[0] === " " ? " " : ""}@${username} `));
    setMentionQuery("");
    setMentionResults([]);
    clearError();
  }

  function insertCommunity(community: CommunityOption) {
    const normalizedName = community.name.replace(/\s+/g, "_").slice(0, 48);
    const token = `@comunidad[${community.slug}:${normalizedName}]`;
    setText((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}${token} `);
    clearError();
  }

  function addEmoji(emoji: string) {
    setText((prev) => `${prev}${emoji}`);
    setShowEmojiPicker(false);
    clearError();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    if (!enabled) return;
    const file = e.target.files?.[0];
    if (!file) return;
    clearError();
    setUploading(true);
    try {
      const payload = await uploadFile(file, { scope: "post", onProgress: (progress) => setUploadProgress(progress) });
      if (payload.url) {
        setMediaUrl(payload.url);
        setTab("media");
        const isImage = isImageMediaUrl(payload.url);
        const suggested = Boolean(payload.sensitive?.suggestedSensitive);
        if (isImage && suggested) {
          setIsSensitive(true);
          setSensitiveSuggested(true);
        } else {
          setSensitiveSuggested(false);
          if (!isImage) setIsSensitive(false);
        }
        clearError();
      } else {
        setErrorKey("uploadFailed");
      }
    } catch (err) {
      if (err instanceof Error && err.message && err.message !== "UPLOAD_FAILED") {
        setServerError(err.message);
      } else {
        setErrorKey("uploadFailed");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
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
    communityId: number | null;
    isSensitive: boolean;
  };

  async function submit() {
    if (!enabled) return;

    const payload: ComposerPayload = {
      description: text || null,
      mediaUrl: null,
      poll: null,
      communityId: communityId > 0 ? communityId : null,
      isSensitive: Boolean(mediaUrl && isImageMediaUrl(mediaUrl) && isSensitive),
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
        days: normalizePollDays(days),
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
        setIsSensitive(false);
        setSensitiveSuggested(false);
        clearError();
        router.refresh();
      } else {
        const j = await res.json().catch(() => ({}));
        if (j.error) {
          setServerError(typeof j.error === "string" ? j.error : t.errors.createFailed);
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
        <>
          <div className="relative">
            <textarea
              className="w-full resize-none rounded-md bg-input p-3 pr-20 text-sm outline-none ring-1 ring-border focus:ring-2"
              placeholder={enabled ? t.placeholderEnabled : t.placeholderDisabled}
              disabled={!enabled}
              rows={3}
              value={text}
              maxLength={POST_TEXT_LIMIT}
              onChange={(e) => {
                clearError();
                setText(e.target.value);
              }}
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-1">
              <button type="button" disabled={!enabled} onClick={() => setText((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}@`)} className="rounded-full bg-muted px-2 py-1 text-sm disabled:opacity-60" title="Etiquetar usuario">
                @
              </button>
              <button type="button" disabled={!enabled || communities.length === 0} onClick={() => setText((prev) => `${prev}${prev.endsWith(" ") || !prev ? "" : " "}@comunidad[`)} className="rounded-full bg-muted px-2 py-1 text-sm disabled:opacity-60" title="Etiquetar comunidad">
                #
              </button>
              <button type="button" disabled={!enabled} onClick={() => setShowEmojiPicker((prev) => !prev)} className="rounded-full bg-muted px-2 py-1 text-sm disabled:opacity-60" title="Agregar emoji">
                ◇
              </button>
            </div>
            {showEmojiPicker && enabled && (
              <EmojiPicker onSelect={addEmoji} className="absolute right-0 z-20 mt-2 w-[min(20rem,90vw)]" />
            )}
          </div>
          <p className="mt-1 text-right text-xs opacity-65">
            {text.length}/{POST_TEXT_LIMIT}
          </p>
          {(mentionsLoading || mentionResults.length > 0) && (
            <div className="mt-2 flex flex-wrap gap-2">
              {mentionsLoading && <span className="text-xs opacity-60">Buscando personas…</span>}
              {mentionResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => insertMention(user.username)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60"
                >
                  {user.nickname || user.username} <span className="opacity-70">@{user.username}</span>
                </button>
              ))}
            </div>
          )}
          {communities.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {communities.slice(0, 6).map((community) => (
                <button
                  key={community.id}
                  type="button"
                  onClick={() => insertCommunity(community)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60"
                >
                  c/{community.slug}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "media" && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              disabled={!enabled || uploading}
              onChange={handleFile}
              className="block w-full text-sm"
            />
          </div>
          <p className="text-xs opacity-70">Tamaño máximo para fotos y videos: {formatUploadLimit()}.</p>
          {uploading && (
            <div className="rounded-lg border border-border bg-input/60 p-2">
              <p className="text-xs opacity-80">Subiendo archivo: {uploadProgress}%</p>
              <div className="mt-1 h-2 overflow-hidden rounded bg-muted">
                <div className="h-full bg-brand transition-all" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}
          {mediaUrl && (
            <p className="text-xs opacity-70">{t.attachLabel}: {mediaUrl.split("/").pop() || "archivo"}</p>
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
                onChange={(e) => setDays(normalizePollDays(Number(e.target.value)))}
                className="ml-2 w-16 h-8 px-2 rounded-md bg-input outline-none ring-1 ring-border focus:ring-2"
                disabled={!enabled}
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-3 text-sm">
        <label className="mb-1 block font-medium">Contenido sensible (solo imagen)</label>
        <label className="inline-flex items-center gap-2 text-xs opacity-80">
          <input
            type="checkbox"
            checked={isSensitive}
            disabled={!canMarkSensitive}
            onChange={(e) => setIsSensitive(e.target.checked)}
          />
          Marcar imagen como sensible
        </label>
        {!canMarkSensitive && <p className="mt-1 text-xs opacity-60">Disponible solo cuando adjuntas una imagen.</p>}
        {sensitiveSuggested && canMarkSensitive && (
          <p className="mt-1 text-xs text-amber-400">Detección automática: se sugirió marcar esta imagen como sensible.</p>
        )}
      </div>

      <div className="mt-3 text-sm">
        <label className="mb-1 block font-medium">{t.communityLabel}</label>
        <select
          className="h-10 w-full rounded-md bg-input px-3 text-sm outline-none ring-1 ring-border focus:ring-2 disabled:opacity-60"
          value={communityId}
          onChange={(e) => {
            clearError();
            setCommunityId(Number(e.target.value) || 0);
          }}
          disabled={!enabled || communitiesLoading}
        >
          <option value={0}>{t.communityDefault}</option>
          {communities.map((community) => (
            <option key={community.id} value={community.id}>
              {community.name}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs opacity-70">{t.communityHint}</p>
        {communitiesLoading && (
          <p className="mt-1 text-xs opacity-60">{t.communityLoading}</p>
        )}
        {communitiesError && !communitiesLoading && (
          <p className="mt-1 text-xs text-red-500">{communitiesError}</p>
        )}
        {enabled && !communitiesLoading && !communitiesError && communities.length === 0 && (
          <p className="mt-1 text-xs opacity-60">{t.communityEmpty}</p>
        )}
      </div>

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
