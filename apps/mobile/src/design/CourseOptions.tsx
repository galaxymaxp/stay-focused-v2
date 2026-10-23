import { useEffect, useId, useRef, useState } from "react";
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, View } from "react-native";
import { usePathname } from "expo-router";
import { MoreHorizontal } from "lucide-react-native";
import { useAuth } from "../auth";
import { Copy, Sheet } from "./primitives";
import { useTheme } from "./theme";
import { hitTarget, spacing } from "./tokens";
import type { SwipeAction } from "./SwipeRow";

function focus(node: View | null) {
  node?.focus();
  if (Platform.OS !== "web" && node) {
    const tag = findNodeHandle(node);
    if (tag !== null) AccessibilityInfo.setAccessibilityFocus(tag);
  }
}

/** The existing callbacks, exposed without requiring a swipe. Never a navigation child. */
export function CourseOptions({ title, courseKey, actions, pinned = false }: {
  title: string;
  courseKey: string;
  actions: readonly SwipeAction[];
  pinned?: boolean;
}) {
  const { session } = useAuth();
  const pathname = usePathname();
  // Remount the disclosure on owner/route changes, dropping any captured actions.
  return <CourseMenu key={`${session?.user.id ?? ""}:${pathname}:${courseKey}`} title={title} actions={actions} pinned={pinned} />;
}

function CourseMenu({ title, actions, pinned }: { title: string; actions: readonly SwipeAction[]; pinned: boolean }) {
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
  return <View style={{ alignItems: "flex-end" }}>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={`Course options for ${title}`}
      accessibilityState={{ expanded: open }} aria-controls={open ? id : undefined}
      onPress={event => { event.stopPropagation(); setOpen(value => !value); }}
      style={{ minWidth: hitTarget.min, minHeight: hitTarget.min, alignItems: "center", justifyContent: "center" }}>
      <MoreHorizontal size={20} color={colors.textSecondary} />
    </Pressable>
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
  </View>;
}
