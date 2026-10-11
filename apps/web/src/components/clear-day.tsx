import type { ReactNode } from "react";

export function ClearDay({
  title = "Your day is clear.",
  detail = "Make room for what matters.",
  action,
  compact = false,
}: {
  title?: string;
  detail?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`clear-day${compact ? " compact" : ""}`} role="status">
      <svg className="clear-day-art" viewBox="0 0 160 120" aria-hidden="true" focusable="false">
        <path className="cd-horizon" d="M14 92h132" />
        <path className="cd-sun" d="M54 92a26 26 0 0 1 52 0" />
        <path className="cd-rays" d="M80 48v-8M48 58l-6-6M112 58l6-6M38 80h-8M122 80h8" />
        <rect className="cd-calendar" x="62" y="70" width="36" height="30" rx="6" />
        <path className="cd-check" d="m71 85 6 6 12-12" />
      </svg>
      <strong>{title}</strong>
      <p className="meta">{detail}</p>
      {action}
    </div>
  );
}
