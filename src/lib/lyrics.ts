export async function resolveSongLyrics(trackName: string | null, artistName: string | null): Promise<string | null> {
  const track = (trackName || "").trim();
  const artist = (artistName || "").trim();

  if (!track || !artist) return null;

  const endpoint = new URL("https://lrclib.net/api/get");
  endpoint.searchParams.set("track_name", track);
  endpoint.searchParams.set("artist_name", artist);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const res = await fetch(endpoint, {
      cache: "no-store",
      signal: controller.signal,
      headers: { "User-Agent": "TredditBot/1.0" },
    });

    if (!res.ok) return null;
    const payload = (await res.json().catch(() => null)) as { syncedLyrics?: unknown; plainLyrics?: unknown } | null;
    if (!payload) return null;

    const syncedLyrics = typeof payload.syncedLyrics === "string" ? payload.syncedLyrics.trim() : "";
    const plainLyrics = typeof payload.plainLyrics === "string" ? payload.plainLyrics.trim() : "";

    const normalized = syncedLyrics || plainLyrics;
    if (!normalized) return null;

    return normalized.slice(0, 4000);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
