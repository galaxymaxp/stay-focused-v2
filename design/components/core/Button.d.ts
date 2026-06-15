import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. @default "primary" */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  /** @default "md" */
  size?: "sm" | "md" | "lg";
  /** Icon node placed before the label (e.g. a Lucide icon). */
  iconLeft?: React.ReactNode;
  /** Icon node placed after the label. */
  iconRight?: React.ReactNode;
  /** Stretch to fill the container width. @default false */
  full?: boolean;
  children?: React.ReactNode;
}

/**
 * Primary action control for Stay Focused.
 * @startingPoint section="Core" subtitle="Flat gold/secondary/ghost buttons" viewport="700x180"
 */
export function Button(props: ButtonProps): JSX.Element;
export default Button;
