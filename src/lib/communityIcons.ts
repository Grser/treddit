export const COMMUNITY_ICON_OPTIONS = [
  { key: "none", label: "Sin icono", emoji: "" },
  { key: "plus18", label: "+18", emoji: "🔞" },
  { key: "gaming", label: "Gaming", emoji: "🎮" },
  { key: "music", label: "Música", emoji: "🎵" },
  { key: "news", label: "Noticias", emoji: "📰" },
  { key: "help", label: "Ayuda", emoji: "🛟" },
] as const;

export type CommunityIconKey = (typeof COMMUNITY_ICON_OPTIONS)[number]["key"];

const COMMUNITY_ICON_MAP = new Map<CommunityIconKey, (typeof COMMUNITY_ICON_OPTIONS)[number]>(
  COMMUNITY_ICON_OPTIONS.map((entry) => [entry.key, entry]),
);

function isCommunityIconKey(iconKey: string): iconKey is CommunityIconKey {
  return COMMUNITY_ICON_MAP.has(iconKey as CommunityIconKey);
}

export function getCommunityIconMeta(iconKey: string | null | undefined) {
  if (!iconKey || !isCommunityIconKey(iconKey)) return null;
  return COMMUNITY_ICON_MAP.get(iconKey) ?? null;
}

