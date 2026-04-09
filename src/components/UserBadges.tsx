import type { HTMLAttributes } from "react";

export type UserBadgesProps = {
  isVerified?: boolean;
  isAdmin?: boolean;
  adminRoleName?: string | null;
  adminRoleEmoji?: string | null;
  size?: "sm" | "md";
  showRoleName?: boolean;
  className?: string;
  labels?: {
    verified?: string;
    admin?: string;
  };
} & Pick<HTMLAttributes<HTMLSpanElement>, "aria-hidden">;

export default function UserBadges({
  isVerified,
  isAdmin,
  adminRoleName,
  adminRoleEmoji,
  size = "md",
  showRoleName = true,
  className = "",
  labels,
}: UserBadgesProps) {
  const hasRole = Boolean(adminRoleName);
  if (!isVerified && !isAdmin && !hasRole) return null;
  const wrapper = size === "sm" ? "h-5 w-5" : "h-6 w-6";
  const iconClass = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";
  const base = `inline-flex items-center justify-center rounded-full ${wrapper}`;
  const container = `inline-flex items-center gap-1 align-middle ${className}`;
  const rolePillClass =
    size === "sm"
      ? "inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100"
      : "inline-flex items-center gap-1 rounded-full border border-amber-300/50 bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-100";

  return (
    <span className={container}>
      {hasRole && (
        <span
          className={rolePillClass}
          title={adminRoleName || labels?.admin || "Administrator"}
          aria-label={adminRoleName || labels?.admin || "Administrator"}
        >
          <span aria-hidden>{adminRoleEmoji || "👑"}</span>
          {showRoleName ? <span>{adminRoleName}</span> : null}
        </span>
      )}
      {isVerified && (
        <span
          className={`${base} bg-blue-500 text-white`}
          title={labels?.verified || "Verified profile"}
          aria-label={labels?.verified || "Verified profile"}
        >
          <VerifiedIcon className={`${iconClass}`} />
        </span>
      )}
      {isAdmin && (
        <span
          className={`${base} bg-amber-400/20 text-amber-500`}
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
