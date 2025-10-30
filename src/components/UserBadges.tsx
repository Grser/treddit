import type { HTMLAttributes } from "react";

export type UserBadgesProps = {
  isVerified?: boolean;
  isAdmin?: boolean;
  size?: "sm" | "md";
  className?: string;
  labels?: {
    verified?: string;
    admin?: string;
  };
} & Pick<HTMLAttributes<HTMLSpanElement>, "aria-hidden">;

export default function UserBadges({
  isVerified,
  isAdmin,
  size = "md",
  className = "",
  labels,
}: UserBadgesProps) {
  if (!isVerified && !isAdmin) return null;
  const iconClass = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const wrapClass = size === "sm" ? "h-4 w-4" : "h-6 w-6";

  return (
    <span className={`inline-flex items-center gap-1 ${className}`}>
      {isVerified && (
        <span
          className={`inline-flex items-center justify-center rounded-full bg-blue-500/90 text-white ${wrapClass}`}
          title={labels?.verified || "Verified profile"}
          aria-label={labels?.verified || "Verified profile"}
        >
          <VerifiedIcon className={`${iconClass}`} />
        </span>
      )}
      {isAdmin && (
        <span
          className={`inline-flex items-center justify-center text-amber-400 ${wrapClass}`}
          title={labels?.admin || "Administrator"}
          aria-label={labels?.admin || "Administrator"}
        >
          <AdminIcon className={`${iconClass}`} />
        </span>
      )}
    </span>
  );
}

function VerifiedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11.5 11 13.5 15 9.5" />
    </svg>
  );
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 9.9 8.26 3.5 9.27l4.9 4.26L6.82 20 12 16.9 17.18 20l-1.58-6.47 4.9-4.26-6.4-1.01z" />
    </svg>
  );
}
