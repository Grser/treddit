const SENSITIVE_TERMS = [
  "gore",
  "blood",
  "sangre",
  "cadaver",
  "corpse",
  "nsfw",
  "nude",
  "nudes",
  "desnudo",
  "desnuda",
  "desnudos",
  "xxx",
  "explicit",
  "porno",
  "porn",
  "sex",
  "sexual",
  "violence",
  "violento",
  "violencia",
  "18+",
];

export type SensitiveMediaAnalysis = {
  suggestedSensitive: boolean;
  reasons: string[];
};

export function analyzeSensitiveMediaInput(input: {
  filename?: string | null;
  mimeType?: string | null;
  userHint?: string | null;
}): SensitiveMediaAnalysis {
  const reasons = new Set<string>();
  const haystack = `${input.filename || ""} ${input.userHint || ""}`.toLowerCase();

  for (const term of SENSITIVE_TERMS) {
    if (haystack.includes(term)) {
      reasons.add(`keyword:${term}`);
    }
  }
  return {
    suggestedSensitive: reasons.size > 0,
    reasons: [...reasons],
  };
}

export function isImageMediaUrl(url: string | null | undefined) {
  if (!url) return false;
  const normalized = url.toLowerCase().split("?")[0];
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"].some((ext) => normalized.endsWith(ext));
}
