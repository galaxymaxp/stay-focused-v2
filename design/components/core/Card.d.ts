import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Inner padding step. @default "md" */
  padding?: "none" | "sm" | "md" | "lg";
  /** Selected state — gold-tinted surface + accent border. @default false */
  selected?: boolean;
  /** Subtle accent-tinted surface. @default false */
  accent?: boolean;
  children?: React.ReactNode;
}

/** Flat warm content surface (never glass). */
export function Card(props: CardProps): JSX.Element;
export default Card;
