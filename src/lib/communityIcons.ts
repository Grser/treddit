export const COMMUNITY_ICON_OPTIONS = [
  { key: "none", label: "Sin icono", emoji: "" },
  { key: "plus18", label: "+18", emoji: "🔞" },
  { key: "gaming", label: "Gaming", emoji: "🎮" },
  { key: "music", label: "Música", emoji: "🎵" },
  { key: "news", label: "Noticias", emoji: "📰" },
  { key: "help", label: "Ayuda", emoji: "🛟" },
] as const;

export type CommunityIconKey = (typeof COMMUNITY_ICON_OPTIONS)[number]["key"];

const COMMUNITY_ICON_MAP = new Map(COMMUNITY_ICON_OPTIONS.map((entry) => [entry.key, entry]));

export function getCommunityIconMeta(iconKey: string | null | undefined) {
  if (!iconKey) return null;
  return COMMUNITY_ICON_MAP.get(iconKey) ?? null;
}

