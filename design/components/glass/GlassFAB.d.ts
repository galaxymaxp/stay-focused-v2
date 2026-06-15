import * as React from "react";

export interface GlassFABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon node (Lucide). */
  icon?: React.ReactNode;
  /** Optional label — present = extended pill FAB, absent = circular FAB. */
  label?: React.ReactNode;
}

/** Floating iOS 26 Liquid Glass action button (gold-tinted). */
export function GlassFAB(props: GlassFABProps): JSX.Element;
export default GlassFAB;
