import { createContext } from "react";

/** Shared transient handlers; the enclosing surface owns the bounded transform. */
export const NavigationFeedbackContext = createContext<{
  active: boolean;
  onPressIn: () => void; onPressOut: () => void; onFocus: () => void;
  onBlur: () => void; onHoverIn: () => void; onHoverOut: () => void;
} | null>(null);
