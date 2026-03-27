"use client";

import { useState } from "react";

type UrlSafetyResponse = {
  ok?: boolean;
  verdict?: "safe" | "unsafe" | "unknown";
  reason?: string;
  stats?: {
    harmless?: number;
    malicious?: number;
    suspicious?: number;
    undetected?: number;
    timeout?: number;
  };
};

export default function SafeExternalLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [checking, setChecking] = useState(false);

  async function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (checking) return;

    setChecking(true);
    try {
      const res = await fetch(`/api/url/safety?url=${encodeURIComponent(href)}`, {
        cache: "no-store",
      });
      const payload = (await res.json().catch(() => ({}))) as UrlSafetyResponse;

      if (!res.ok || payload.verdict === "unknown") {
        const reason = payload.reason || "No se pudo verificar con VirusTotal en este momento.";
        const shouldContinue = window.confirm(`${reason}\n\n¿Igual quieres abrir el enlace?`);
        if (!shouldContinue) return;
      }

      if (payload.verdict === "unsafe") {
        const flagged = (payload.stats?.malicious || 0) + (payload.stats?.suspicious || 0);
        window.alert(`Enlace bloqueado: VirusTotal lo marcó como riesgoso (${flagged} detecciones).`);
        return;
      }

      window.open(href, "_blank", "noopener,noreferrer");
    } catch {
      const shouldContinue = window.confirm("No se pudo verificar con VirusTotal. ¿Abrir enlace igualmente?");
      if (!shouldContinue) return;
      window.open(href, "_blank", "noopener,noreferrer");
    } finally {
      setChecking(false);
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={handleClick}
      aria-busy={checking}
      className={className}
      title={checking ? "Analizando enlace con VirusTotal…" : undefined}
    >
      {children}
    </a>
  );
}
