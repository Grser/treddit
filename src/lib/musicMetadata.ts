export type MusicMetadata = {
  title: string | null;
  artist: string | null;
};

const REQUEST_TIMEOUT_MS = 3500;

function splitSongAndArtist(rawTitle: string, fallbackArtist: string | null) {
  const normalizedTitle = rawTitle.trim();
  if (!normalizedTitle) {
    return { title: null, artist: fallbackArtist };
  }

  const separators = [" - ", " – ", " — ", " | ", " · "];
  for (const separator of separators) {
    const idx = normalizedTitle.indexOf(separator);
    if (idx <= 0) continue;
    const left = normalizedTitle.slice(0, idx).trim();
    const right = normalizedTitle.slice(idx + separator.length).trim();
    if (!left || !right) continue;
    return { title: right.slice(0, 120), artist: left.slice(0, 120) };
  }

  return { title: normalizedTitle.slice(0, 120), artist: fallbackArtist };
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "TredditBot/1.0",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null) as Record<string, unknown> | null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function normalizeHost(value: string) {
  return value.toLowerCase().replace(/^www\./, "");
}

export async function resolveMusicMetadata(rawUrl: string): Promise<MusicMetadata> {
  const urlValue = rawUrl.trim();
  if (!urlValue) return { title: null, artist: null };

  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    return { title: null, artist: null };
  }

  const encodedUrl = encodeURIComponent(parsed.toString());
  const host = normalizeHost(parsed.hostname);

  const candidates: string[] = [];
  if (host.includes("youtube.com") || host.includes("youtu.be") || host.includes("spotify.com") || host.includes("soundcloud.com")) {
    candidates.push(`https://noembed.com/embed?url=${encodedUrl}`);
  }
  if (host.includes("youtube.com") || host.includes("youtu.be")) {
    candidates.push(`https://www.youtube.com/oembed?url=${encodedUrl}&format=json`);
  }
  if (host.includes("spotify.com")) {
    candidates.push(`https://open.spotify.com/oembed?url=${encodedUrl}`);
  }

  candidates.push(`https://noembed.com/embed?url=${encodedUrl}`);

  for (const candidate of candidates) {
    const data = await fetchJson(candidate);
    if (!data) continue;
    const title = typeof data.title === "string" ? data.title : "";
    const authorName = typeof data.author_name === "string" ? data.author_name : null;
    if (!title && !authorName) continue;
    const normalized = splitSongAndArtist(title, authorName ? authorName.slice(0, 120) : null);
    return normalized;
  }

  return { title: null, artist: null };
}
