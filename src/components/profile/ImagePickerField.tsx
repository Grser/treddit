"use client";

import Image from "next/image";
import { ChangeEvent, useState } from "react";

import { useLocale } from "@/contexts/LocaleContext";

type Props = {
  name: string;
  label: string;
  initialUrl?: string | null;
  accept?: string;
  helpText?: string;
  minWidth?: number;
  minHeight?: number;
};

type Mode = "url" | "upload";

export default function ImagePickerField({
  name,
  label,
  initialUrl,
  accept = "image/*",
  helpText,
  minWidth,
  minHeight,
}: Props) {
  const { strings } = useLocale();
  const t = strings.profileEditor;
  const [mode, setMode] = useState<Mode>(initialUrl ? "url" : "upload");
  const [value, setValue] = useState<string>(initialUrl?.toString() || "");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);

  const hasValue = Boolean(value.trim());

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next === "upload" && !value) {
      setFileKey((k) => k + 1);
    }
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (minWidth || minHeight) {
      const dimensions = await getImageDimensions(file);
      if (!dimensions) {
        setError("No se pudo leer el tamaño de la imagen.");
        setFileKey((k) => k + 1);
        return;
      }
      const widthTooSmall = minWidth ? dimensions.width < minWidth : false;
      const heightTooSmall = minHeight ? dimensions.height < minHeight : false;

      if (widthTooSmall || heightTooSmall) {
        const widthText = minWidth ? `${minWidth}px de ancho` : null;
        const heightText = minHeight ? `${minHeight}px de alto` : null;
        const requirement = [widthText, heightText].filter(Boolean).join(" y ");
        setError(`Esta imagen es demasiado pequeña. Usa al menos ${requirement}.`);
        setFileKey((k) => k + 1);
        return;
      }
    }

    const form = new FormData();
    form.append("file", file);

    setUploading(true);
    setError(null);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const info = await res.json().catch(() => null);
        const message = info?.error || t.uploadFailed;
        throw new Error(message);
      }
      const data = (await res.json()) as { url?: string };
      const url = data?.url?.toString().trim();
      if (!url) {
        throw new Error(t.uploadFailed);
      }
      setValue(url);
      setError(null);
      setMode("upload");
    } catch (err) {
      console.error("Image upload failed", err);
      setError(err instanceof Error ? err.message : t.uploadFailed);
    } finally {
      setUploading(false);
    }
  }

  function clearValue() {
    setValue("");
    setError(null);
    setFileKey((k) => k + 1);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => switchMode("url")}
            className={`rounded-full px-3 py-1 transition ${
              mode === "url" ? "bg-brand text-white" : "border border-border"
            }`}
          >
            {t.useUrl}
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={`rounded-full px-3 py-1 transition ${
              mode === "upload" ? "bg-brand text-white" : "border border-border"
            }`}
          >
            {t.uploadImage}
          </button>
        </div>
      </div>

      {mode === "url" && (
        <input
          type="text"
          inputMode="url"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          placeholder="https://example.com/imagen.jpg"
          className="w-full h-10 rounded-md bg-input px-3 text-sm outline-none ring-1 ring-border focus:ring-2"
        />
      )}

      {mode === "upload" && (
        <input
          key={fileKey}
          type="file"
          accept={accept}
          onChange={handleUpload}
          className="block w-full text-sm text-foreground/80 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm"
          disabled={uploading}
        />
      )}

      <input type="hidden" name={name} value={value} />

      {helpText && <p className="text-xs text-foreground/70">{helpText}</p>}

      <div className="flex items-center gap-3 text-xs">
        {uploading && <span className="text-foreground/70">{t.uploading}</span>}
        {hasValue && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">Imagen cargada</span>
        )}
        {hasValue && (
          <button type="button" onClick={clearValue} className="text-red-500 hover:underline">
            {t.clear}
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {hasValue && (
        <div className="relative h-28 w-full overflow-hidden rounded-lg border border-border sm:h-36">
          <Image
            src={value}
            alt={t.previewAlt}
            fill
            sizes="100%"
            className="object-cover"
            unoptimized
          />
        </div>
      )}
    </div>
  );
}

async function getImageDimensions(file: File) {
  const imageUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = imageUrl;
    });
    return dimensions;
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
