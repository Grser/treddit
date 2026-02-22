"use client";

import Link from "next/link";

import UserHoverPreview from "@/components/UserHoverPreview";

export default function MentionUserLink({
  username,
  text,
  className,
}: {
  username: string;
  text: string;
  className?: string;
}) {
  return (
    <UserHoverPreview username={username}>
      <Link
        href={`/u/${encodeURIComponent(username)}`}
        className={className || "font-semibold text-sky-500 hover:underline"}
      >
        {text}
      </Link>
    </UserHoverPreview>
  );
}
