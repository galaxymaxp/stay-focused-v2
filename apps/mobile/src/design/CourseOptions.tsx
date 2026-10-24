import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, View } from "react-native";
import { usePathname } from "expo-router";
import { useAuth } from "../auth";
import { Copy, Sheet } from "./primitives";
import { useTheme } from "./theme";
import { hitTarget, spacing } from "./tokens";
import type { SwipeAction } from "./SwipeRow";

const CourseOptionsContext = createContext<{ open: () => void; trigger: RefObject<View | null> } | null>(null);
export const useCourseOptions = () => useContext(CourseOptionsContext);

function focus(node: View | null) {
  node?.focus();
  if (Platform.OS !== "web" && node) {
    const tag = findNodeHandle(node);
    if (tag !== null) AccessibilityInfo.setAccessibilityFocus(tag);
  }
}

/** The existing callbacks, exposed without requiring a swipe. Never a navigation child. */
export function CourseOptions({ title, courseKey, actions, pinned = false, children }: {
  title: string;
  courseKey: string;
  actions: readonly SwipeAction[];
  pinned?: boolean;
  children?: ReactNode;
}) {
  const { session } = useAuth();
  const pathname = usePathname();
  // Remount the disclosure on owner/route changes, dropping any captured actions.
  return <CourseMenu key={`${session?.user.id ?? ""}:${pathname}:${courseKey}`} title={title} actions={actions} pinned={pinned}>{children}</CourseMenu>;
}

function CourseMenu({ title, actions, pinned, children }: { title: string; actions: readonly SwipeAction[]; pinned: boolean; children: ReactNode }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<View>(null);
  const first = useRef<View>(null);
  const close = () => { setOpen(false); focus(trigger.current); };
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focus(first.current));
    return () => cancelAnimationFrame(frame);
  }, [open]);
  useEffect(() => {
    if (!open || Platform.OS !== "web") return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); focus(trigger.current); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open]);
  return <CourseOptionsContext.Provider value={{ open: () => setOpen(true), trigger }}>
    {children}
    {open ? <Sheet title="Course options" onClose={close}>
      <View nativeID={id} style={{ gap: spacing[2] }}>
        <Copy size="h3">{title}</Copy>
        {actions.map((action, index) => <Pressable key={action.key} ref={index === 0 ? first : undefined}
          accessibilityRole="button" accessibilityLabel={action.label}
          accessibilityState={action.key === "pin" ? { selected: pinned } : undefined}
          onPress={event => { event.stopPropagation(); close(); action.onPress(); }}
          style={({ pressed }) => ({ minHeight: hitTarget.min, padding: spacing[2], backgroundColor: pressed ? colors.surfaceSecondary : undefined })}>
          <Copy>{action.label}</Copy>
        </Pressable>)}
      </View>
    </Sheet> : null}
  </CourseOptionsContext.Provider>;
}
