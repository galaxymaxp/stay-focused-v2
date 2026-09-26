import { router } from "expo-router";
import { ArrowLeft, ChevronRight, MoreHorizontal, FileText, BookOpen, ClipboardList, Presentation, FileQuestion, Globe, Info } from "lucide-react-native";
import { BottomTabBarHeightContext } from "@react-navigation/bottom-tabs";
import { useContext, useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import {
  Animated,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { QueueButton } from "./QueueButton";
import { motion, useTheme } from "./theme";
import { density, hitTarget, radius, spacing, typography } from "./tokens";

export function Copy({
  children,
  size = "body",
  muted = false,
  color,
  style,
  numberOfLines,
}: {
  children: ReactNode;
  size?: "display" | "h1" | "h2" | "h3" | "body" | "bodySmall" | "caption";
  muted?: boolean;
  color?: string;
  style?: StyleProp<import("react-native").TextStyle>;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          color: color ?? (muted ? colors.textSecondary : colors.textPrimary),
          fontSize: typography[size],
          lineHeight: typography[size] * 1.35,
          fontWeight: ["body", "bodySmall", "caption"].includes(size) ? "400" : "600",
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
export function Surface({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, mode } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surfacePrimary,
          borderRadius: radius.card,
          padding: density.cardPadding,
          gap: density.cardGap,
          borderWidth: 1,
          borderColor: colors.separator,
          shadowColor: colors.shadow,
          shadowOpacity: mode === "light" ? 0.035 : 0,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function usePressMotion(disabled = false) {
  const { reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => () => scale.stopAnimation(), [scale]);
  const animate = (value: number) => {
    scale.stopAnimation();
    if (reducedMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, { toValue: value, ...motion.spring, useNativeDriver: true }).start();
  };
  return {
    scale,
    onPressIn: () => { if (!disabled) animate(0.985); },
    onPressOut: () => animate(1),
  };
}

export function Action({
  children,
  onPress,
  disabled = false,
  secondary = false,
  pill = false,
  label,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  pill?: boolean;
  label?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const press = usePressMotion(disabled);
  return (
    <Animated.View style={{ alignSelf: secondary && !pill ? "flex-start" : "stretch", transform: [{ scale: press.scale }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        testID={testID}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        style={({ pressed }) => ({
          minHeight: hitTarget.min,
          paddingHorizontal: secondary ? spacing[2] : spacing[4],
          paddingVertical: spacing[2],
          borderRadius: pill ? radius.pill : radius.control,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.5 : pressed ? 0.82 : 1,
          backgroundColor: secondary ? (pressed ? colors.surfaceSecondary : pill ? colors.surfacePrimary : "transparent") : colors.accent,
        })}
      >
        <Copy size={secondary ? "bodySmall" : "body"} color={secondary ? colors.accent : colors.onAccent}>{children}</Copy>
      </Pressable>
    </Animated.View>
  );
}
export function IconAction({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minWidth: hitTarget.min,
        minHeight: hitTarget.min,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ width: density.utilitySize, height: density.utilitySize, borderRadius: radius.pill, backgroundColor: colors.surfacePrimary, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </Pressable>
  );
}
export function Page({
  children,
  title,
  subtitle,
  back = false,
  scroll = true,
  footer,
  onRefresh,
  actions = [],
  headerAction,
  headerLeading,
  scrollRef,
  onScroll,
  overlay,
  headerBelow,
  scrollEnabled = true,
  scrollTouch,
  refreshEnabled = true,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  back?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
  onRefresh?: () => void;
  actions?: readonly { label: string; onPress: () => void }[];
  headerAction?: ReactNode;
  /** Small identity mark shown before the title (e.g. a course monogram). */
  headerLeading?: ReactNode;
  scrollRef?: Ref<ScrollView>;
  onScroll?: React.ComponentProps<typeof ScrollView>["onScroll"];
  /** Absolutely positioned layer above the scroll content (e.g. a scrubber). */
  overlay?: ReactNode;
  /** Pinned content between the header and the scroll area (e.g. find-in-page). */
  headerBelow?: ReactNode;
  scrollEnabled?: boolean;
  /**
   * Raw touch observers on the scroll view. They bubble from any content and
   * never claim the gesture, so native scrolling is unaffected.
   */
  /** Turn pull-to-refresh off while a gesture on the page owns vertical drags. */
  refreshEnabled?: boolean;
  scrollTouch?: Pick<React.ComponentProps<typeof ScrollView>, "onTouchStart" | "onTouchMove" | "onTouchEnd" | "onTouchCancel">;
}) {
  const { colors, mode } = useTheme();
  const [menu, setMenu] = useState(false);
  const [pulling, setPulling] = useState(false);
  // Screens nested inside a tab already sit above the tab bar.
  const insideTabs = useContext(BottomTabBarHeightContext) !== undefined;
  const pullToRefresh = onRefresh
    ? () => {
        setPulling(true);
        onRefresh();
        setTimeout(() => setPulling(false), 700);
      }
    : undefined;
  const menuActions = [
    ...actions,
    ...(onRefresh ? [{ label: "Refresh", onPress: onRefresh }] : []),
    ...(!back ? [{ label: "Settings and appearance", onPress: () => router.push("/appearance") }] : []),
  ];
  return (
    <SafeAreaView
      edges={
        back && !insideTabs ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
      }
      style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}
    >
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={colors.backgroundPrimary}
      />
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 10,
          flexDirection: "row",
          alignItems: "center",
          gap: 0,
        }}
      >
        {back && (
          <IconAction
            label="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/today")
            }
          >
            <ArrowLeft size={density.utilityIcon} color={colors.textPrimary} />
          </IconAction>
        )}
        {headerLeading ? <View style={{ marginRight: spacing[3] }}>{headerLeading}</View> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Copy size={back ? "h2" : "h1"} style={back ? { fontSize: 20, lineHeight: 26 } : undefined}>{title}</Copy>
          {subtitle && (
            <Copy muted size="caption">
              {subtitle}
            </Copy>
          )}
        </View>
        {headerAction}
        {!back && <QueueButton />}
        {menuActions.length > 0 && <IconAction label="More options" onPress={() => setMenu(true)}><MoreHorizontal color={colors.textSecondary} size={density.utilityIcon} /></IconAction>}
      </View>
      {headerBelow}
      <View style={{ flex: 1 }}>
      {scroll ? (
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEnabled={scrollEnabled}
          {...scrollTouch}
          scrollEventThrottle={onScroll ? 16 : undefined}
          keyboardShouldPersistTaps="handled"
          refreshControl={pullToRefresh ? <RefreshControl enabled={refreshEnabled} refreshing={pulling} onRefresh={pullToRefresh} tintColor={colors.textSecondary} colors={[colors.accent]} progressBackgroundColor={colors.surfaceElevated} /> : undefined}
          contentContainerStyle={{
            paddingHorizontal: spacing[5],
            paddingBottom: 32,
            gap: density.screenGap,
          }}
        >
          <Flow>{children}</Flow>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>{children}</View>
      )}
      {overlay}
      </View>
      {footer && (
        <View
          style={{
            padding: 20,
            paddingBottom: 28,
            gap: 8,
            borderTopWidth: 1,
            borderColor: colors.separator,
          }}
        >
          {footer}
        </View>
      )}
      {menu && <Sheet title={title || "Options"} onClose={() => setMenu(false)}>{menuActions.map(action => <RowLink key={action.label} label={action.label} onPress={() => { setMenu(false); action.onPress(); }}><Copy>{action.label}</Copy></RowLink>)}</Sheet>}
    </SafeAreaView>
  );
}
export function Flow({ children }: { children: ReactNode }) {
  const { reducedMotion } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(opacity, {
      toValue: 1,
      duration: reducedMotion ? motion.small : motion.normal,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);
  return <Animated.View style={{ opacity, gap: density.screenGap }}>{children}</Animated.View>;
}
export function Notice({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View accessibilityLiveRegion="polite" style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, paddingVertical: 6 }}>
      <Info size={14} color={colors.textMuted} style={{ marginTop: 2 }} />
      <Copy muted size="bodySmall" style={{ flex: 1 }}>{children}</Copy>
    </View>
  );
}

/** A whole-row target keeps lists compact without shrinking the touch area. */
export function RowLink({
  children,
  label,
  onPress,
  icon,
  trailing,
  inset = false,
  disabled = false,
  accessibilityActions,
  onAccessibilityAction,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  inset?: boolean;
  disabled?: boolean;
  accessibilityActions?: readonly AccessibilityActionInfo[];
  onAccessibilityAction?: (event: AccessibilityActionEvent) => void;
}) {
  const { colors } = useTheme();
  const press = usePressMotion(disabled);
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityActions={accessibilityActions ? [...accessibilityActions] : undefined}
      onAccessibilityAction={onAccessibilityAction}
      onPress={onPress}
      disabled={disabled}
      accessibilityState={{ disabled }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => ({
        minHeight: hitTarget.min,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        margin: inset ? -density.cardPadding : 0,
        padding: inset ? density.cardPadding : 0,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {icon}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>{children}</View>
      {trailing ?? <ChevronRight size={16} color={colors.textMuted} />}
    </Pressable>
    </Animated.View>
  );
}

/** Content identity only: never implies invented courses, progress or results. */
export function ContentIcon({ kind, small = false }: { kind: string; small?: boolean }) {
  const { colors } = useTheme();
  const tone = kind === "pdf" ? "red" : kind === "slides" ? "orange" : kind === "quiz" ? "violet" : kind === "activity_output" || kind === "activity_generation" ? "green" : "blue";
  const Icon = kind === "slides" ? Presentation : kind === "quiz" ? FileQuestion : kind === "reviewer" ? BookOpen : kind === "activity_output" || kind === "task" ? ClipboardList : kind === "page" ? Globe : FileText;
  return <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: small ? 30 : 40, height: small ? 34 : 48, borderRadius: small ? 8 : 10, backgroundColor: colors[`${tone}Soft`], alignItems: "center", justifyContent: "center" }}><Icon size={small ? 18 : 22} strokeWidth={1.6} color={colors[tone]} /></View>;
}

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const press = usePressMotion();
  return <Animated.View style={{ transform: [{ scale: press.scale }] }}><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} onPressIn={press.onPressIn} onPressOut={press.onPressOut} style={{ minHeight: hitTarget.min, minWidth: hitTarget.min, justifyContent: "center" }}><View style={{ minHeight: density.filterHeight, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center", backgroundColor: selected ? colors.blueSoft : "transparent" }}><Copy size="caption" color={selected ? colors.blue : colors.textSecondary} style={{ fontWeight: selected ? "600" : "400" }}>{label}</Copy></View></Pressable></Animated.View>;
}

/**
 * Bottom sheet for lightweight choices. Dismissal never depends on scrolling:
 * the header keeps a visible Done control, the backdrop dismisses, and Android
 * back closes it. Insets come from the app's provider because a native Modal
 * is its own window, where a nested SafeAreaView can report zero insets under
 * edge-to-edge and hide controls behind the navigation bar.
 */
export function Sheet({
  children,
  onClose,
  title,
  footer,
}: {
  children: ReactNode;
  onClose: () => void;
  title?: string;
  /** Pinned below the scroll area, always visible (e.g. a secondary action). */
  footer?: ReactNode;
}) {
  const { colors, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible
      statusBarTranslucent
      navigationBarTranslucent
      animationType={reducedMotion ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(0,0,0,0.4)" }}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "88%",
            flexShrink: 1,
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.page,
            borderTopRightRadius: radius.page,
            paddingBottom: Math.max(insets.bottom, spacing[4]),
            paddingLeft: insets.left,
            paddingRight: insets.right,
          }}
        >
          <View style={{ alignItems: "center", paddingTop: spacing[2] }}>
            <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: colors.separator }} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: spacing[5], paddingRight: spacing[2], minHeight: hitTarget.min }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              {title ? <Copy size="h3" style={{ fontWeight: "600" }}>{title}</Copy> : null}
            </View>
            <DoneButton onPress={onClose} />
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: spacing[3], paddingHorizontal: spacing[5], paddingBottom: spacing[4] }}
          >
            {children}
          </ScrollView>
          {footer ? <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[2], gap: spacing[2] }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/** The single, always-visible local dismissal control for sheets and modals. */
export function DoneButton({ onPress, label = "Done" }: { onPress: () => void; label?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID="sheet-done"
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({ minHeight: hitTarget.min, minWidth: hitTarget.min + 16, paddingHorizontal: spacing[3], alignItems: "center", justifyContent: "center", opacity: pressed ? 0.55 : 1 })}
    >
      <Copy size="body" color={colors.accent} style={{ fontWeight: "600" }}>{label}</Copy>
    </Pressable>
  );
}

/**
 * iOS-style segmented control. The selection pill springs between segments on
 * the native driver; with Reduced Motion it moves without travel.
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
}: {
  segments: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors, mode, reducedMotion } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, segments.findIndex((segment) => segment.value === value));
  const segmentWidth = width > 0 ? (width - 4) / segments.length : 0;
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const toValue = index * segmentWidth;
    if (reducedMotion || segmentWidth === 0) offset.setValue(toValue);
    else Animated.spring(offset, { toValue, ...motion.spring, useNativeDriver: true }).start();
  }, [index, offset, reducedMotion, segmentWidth]);
  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ flexDirection: "row", padding: 2, minHeight: 36, borderRadius: 10, backgroundColor: colors.surfaceSecondary }}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 2,
            bottom: 2,
            left: 2,
            width: segmentWidth,
            borderRadius: 8,
            backgroundColor: mode === "dark" ? colors.surfaceElevated : "#FFFFFF",
            shadowColor: "#000",
            shadowOpacity: mode === "dark" ? 0 : 0.08,
            shadowRadius: 3,
            shadowOffset: { width: 0, height: 1 },
            elevation: mode === "dark" ? 0 : 1,
            transform: [{ translateX: offset }],
          }}
        />
      ) : null}
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(segment.value)}
            hitSlop={{ top: 6, bottom: 6 }}
            style={{ flex: 1, minHeight: 32, alignItems: "center", justifyContent: "center" }}
          >
            <Copy size="caption" color={selected ? colors.textPrimary : colors.textSecondary} style={{ fontWeight: selected ? "600" : "500", fontSize: 13 }}>
              {segment.label}
            </Copy>
          </Pressable>
        );
      })}
    </View>
  );
}
