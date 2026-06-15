import * as React from "react";

export interface GlassTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface GlassTabBarProps {
  /** Tabs to render. Keep to 3–5 for a phone. */
  items?: GlassTabItem[];
  /** id of the active tab. */
  activeId?: string;
  /** Called with the tab id on tap. */
  onSelect?: (id: string) => void;
  style?: React.CSSProperties;
}

/**
 * Floating iOS 26 Liquid Glass tab bar (inset capsule).
 * @startingPoint section="Glass chrome" subtitle="Floating glass tab capsule" viewport="700x200"
 */
export function GlassTabBar(props: GlassTabBarProps): JSX.Element;
export default GlassTabBar;
