"use client";

const EMOJI_GROUP = [
  "•", "◦", "▪", "▫", "○", "●", "◇", "◆",
  "□", "■", "△", "▲", "▽", "▼", "◻", "◼",
  "✦", "✧", "✩", "★", "✱", "✲", "✳", "✶",
  "♥", "♡", "✚", "✖", "✓", "✕", "➤", "➜",
  "↗", "↘", "↙", "↖", "→", "←", "↑", "↓",
  "~", "·", "—", "_", "+", "=", "|", "/",
] as const;

export default function EmojiPicker({
  onSelect,
  className = "",
}: {
  onSelect: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-2 shadow-xl ${className}`}>
      <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
        {EMOJI_GROUP.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="rounded-md px-1 py-1 text-xl transition hover:bg-muted"
            onClick={() => onSelect(emoji)}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
