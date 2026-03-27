import { NextResponse } from "next/server";

type VirusTotalStats = {
  harmless?: number;
  malicious?: number;
  suspicious?: number;
  undetected?: number;
  timeout?: number;
};

type VirusTotalAnalysisResponse = {
  data?: {
    attributes?: {
      status?: string;
      stats?: VirusTotalStats;
      last_analysis_stats?: VirusTotalStats;
    };
  };
};

function normalizeExternalUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function toUrlId(url: string) {
  return Buffer.from(url).toString("base64url").replace(/=+$/g, "");
}

function evaluateStats(stats: VirusTotalStats | undefined) {
  const malicious = Number(stats?.malicious || 0);
  const suspicious = Number(stats?.suspicious || 0);
  if (malicious > 0 || suspicious > 0) return "unsafe" as const;
  return "safe" as const;
}

async function fetchExistingReport(apiKey: string, normalizedUrl: string) {
  const urlId = toUrlId(normalizedUrl);
  const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
    headers: { "x-apikey": apiKey },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const payload = (await res.json().catch(() => ({}))) as VirusTotalAnalysisResponse;
  return payload.data?.attributes?.last_analysis_stats;
}

async function submitAndPoll(apiKey: string, normalizedUrl: string) {
  const submitResponse = await fetch("https://www.virustotal.com/api/v3/urls", {
    method: "POST",
    headers: {
      "x-apikey": apiKey,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ url: normalizedUrl }).toString(),
    cache: "no-store",
  });

  if (!submitResponse.ok) return null;

  const submitPayload = (await submitResponse.json().catch(() => ({}))) as {
    data?: { id?: string };
  };
  const analysisId = submitPayload.data?.id;
  if (!analysisId) return null;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const analysisResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
      headers: { "x-apikey": apiKey },
      cache: "no-store",
    });

    if (!analysisResponse.ok) return null;

    const analysisPayload = (await analysisResponse.json().catch(() => ({}))) as VirusTotalAnalysisResponse;
    const status = analysisPayload.data?.attributes?.status;
    const stats = analysisPayload.data?.attributes?.stats;

    if (status === "completed" && stats) return stats;

    await new Promise((resolve) => setTimeout(resolve, 900));
  }

  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawInput = (url.searchParams.get("url") || "").slice(0, 2048);
  const normalizedUrl = normalizeExternalUrl(rawInput);

  if (!normalizedUrl) {
    return NextResponse.json({ ok: false, verdict: "unknown", reason: "URL inválida." }, { status: 400 });
  }

  const apiKey = process.env.VIRUSTOTAL_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      verdict: "unknown",
      reason: "VirusTotal no está configurado en el servidor.",
    });
  }

  try {
    const existingStats = await fetchExistingReport(apiKey, normalizedUrl);
    if (existingStats) {
      const verdict = evaluateStats(existingStats);
      return NextResponse.json({ ok: true, verdict, stats: existingStats });
    }

    const polledStats = await submitAndPoll(apiKey, normalizedUrl);
    if (!polledStats) {
      return NextResponse.json({
        ok: false,
        verdict: "unknown",
        reason: "VirusTotal no devolvió un resultado final a tiempo.",
      });
    }

    const verdict = evaluateStats(polledStats);
    return NextResponse.json({ ok: true, verdict, stats: polledStats });
  } catch {
    return NextResponse.json({
      ok: false,
      verdict: "unknown",
      reason: "Error al consultar VirusTotal.",
    });
  }
}
