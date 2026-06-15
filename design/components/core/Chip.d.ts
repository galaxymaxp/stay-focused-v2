import * as React from "react";

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Earthy semantic tone. @default "neutral" */
  tone?: "neutral" | "accent" | "red" | "amber" | "green" | "blue";
  /** Filled soft background vs. outline only. @default true */
  soft?: boolean;
  /** Small leading icon node. */
  iconLeft?: React.ReactNode;
  children?: React.ReactNode;
}

/** Compact status / metadata pill. */
export function Chip(props: ChipProps): JSX.Element;
export default Chip;
