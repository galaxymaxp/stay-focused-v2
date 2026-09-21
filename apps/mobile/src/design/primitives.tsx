import { router } from "expo-router";
import { ArrowLeft, ChevronRight, Layers, MoreHorizontal, FileText, BookOpen, ClipboardList, Presentation, FileQuestion, Globe, Info } from "lucide-react-native";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { motion, useTheme } from "./theme";
import { density, hitTarget, radius, spacing, typography } from "./tokens";

export function Copy({
  children,
  size = "body",
  muted = false,
  color,
  style,
}: {
  children: ReactNode;
  size?: "display" | "h1" | "h2" | "h3" | "body" | "bodySmall" | "caption";
  muted?: boolean;
  color?: string;
  style?: StyleProp<import("react-native").TextStyle>;
}) {
  const { colors } = useTheme();
  return (
    <Text
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
}) {
  const { colors, mode } = useTheme();
  const [menu, setMenu] = useState(false);
  const menuActions = [
    ...actions,
    ...(onRefresh ? [{ label: "Refresh", onPress: onRefresh }] : []),
    ...(!back ? [{ label: "Settings and appearance", onPress: () => router.push("/appearance") }] : []),
  ];
  return (
    <SafeAreaView
      edges={
        back ? ["top", "left", "right", "bottom"] : ["top", "left", "right"]
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
        <View style={{ flex: 1, minWidth: 0 }}>
          <Copy size="h1">{title}</Copy>
          {subtitle && (
            <Copy muted size="caption">
              {subtitle}
            </Copy>
          )}
        </View>
        {headerAction}
        {!back && (
            <IconAction
              label="Open Queue"
              onPress={() => router.push("/generation-queue")}
            >
              <Layers color={colors.textSecondary} size={density.utilityIcon} />
            </IconAction>
        )}
        {menuActions.length > 0 && <IconAction label="More options" onPress={() => setMenu(true)}><MoreHorizontal color={colors.textSecondary} size={density.utilityIcon} /></IconAction>}
      </View>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
      {menu && <Sheet onClose={() => setMenu(false)}><Copy size="h2">{title || "Options"}</Copy>{menuActions.map(action => <RowLink key={action.label} label={action.label} onPress={() => { setMenu(false); action.onPress(); }}><Copy>{action.label}</Copy></RowLink>)}</Sheet>}
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
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  trailing?: ReactNode;
  inset?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const press = usePressMotion(disabled);
  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
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

export function Sheet({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const { colors, reducedMotion } = useTheme();
  return (
    <Modal
      transparent
      visible
      animationType={reducedMotion ? "fade" : "slide"}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)",
        }}
      >
        <SafeAreaView
          edges={["bottom", "left", "right"]}
          style={{
            maxHeight: "85%",
            backgroundColor: colors.surfaceElevated,
            borderTopLeftRadius: radius.card,
            borderTopRightRadius: radius.card,
            padding: spacing[5],
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              gap: spacing[3],
              paddingBottom: spacing[4],
            }}
          >
            {children}
          </ScrollView>
          <Action secondary onPress={onClose}>
            Close
          </Action>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
