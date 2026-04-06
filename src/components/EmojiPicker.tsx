"use client";

const EMOJI_GROUPS = [
  {
    id: "faces",
    icon: "😀",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😴", "🤯", "🥺", "😭", "😡", "🤗"],
  },
  {
    id: "gestures",
    icon: "👍",
    emojis: ["👍", "👎", "👏", "🙌", "🤝", "🙏", "💪", "✌️", "🤟", "👌", "🤌", "🫶", "👋", "🫡", "☝️", "👇", "👉", "👈", "🫶", "🤲"],
  },
  {
    id: "hearts",
    icon: "❤️",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "❤️‍🔥"],
  },
  {
    id: "objects",
    icon: "🎉",
    emojis: ["🎉", "🔥", "✨", "⭐", "🌈", "☀️", "🌙", "🎵", "🎶", "📸", "💡", "💬", "📌", "🎁", "⚽", "🎮", "🍕", "☕", "🚀", "🎯"],
  },
  {
    id: "symbols",
    icon: "◇",
    emojis: ["•", "◦", "▪", "▫", "○", "●", "◇", "◆", "□", "■", "△", "▲", "▽", "▼", "✦", "✧", "✩", "★", "✓", "✕"],
  },
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
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {EMOJI_GROUPS.map((group) => (
          <span key={group.id} className="inline-flex items-center justify-center rounded-full border border-border px-2.5 py-1 text-sm">
            {group.icon}
          </span>
        ))}
      </div>
      <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto pr-1">
        {EMOJI_GROUPS.flatMap((group) => group.emojis).map((emoji, index) => (
          <button
            key={`${emoji}-${index}`}
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
