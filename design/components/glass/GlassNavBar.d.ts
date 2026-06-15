import * as React from "react";

export interface GlassNavBarProps {
  /** Bar title. */
  title?: React.ReactNode;
  /** Uppercase eyebrow above the title. */
  subtitle?: React.ReactNode;
  /** Leading node — brand mark, back chevron, or avatar. */
  leading?: React.ReactNode;
  /** Trailing action node — icon button, etc. */
  trailing?: React.ReactNode;
  /** Large-title style (bigger, bottom-aligned). @default false */
  large?: boolean;
  style?: React.CSSProperties;
}

/** Sticky iOS 26 Liquid Glass top navigation bar. */
export function GlassNavBar(props: GlassNavBarProps): JSX.Element;
export default GlassNavBar;
