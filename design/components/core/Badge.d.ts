import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Number to display (capped at 99+). Ignored when dot is true. */
  count?: number;
  /** Render as a small status dot instead of a number. @default false */
  dot?: boolean;
  /** @default "accent" */
  tone?: "accent" | "red" | "green" | "neutral";
}

/** Tiny count or status indicator for nav icons and the FAB. */
export function Badge(props: BadgeProps): JSX.Element;
export default Badge;
