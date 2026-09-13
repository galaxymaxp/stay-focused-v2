import { router } from "expo-router";
import { ArrowLeft, ChevronRight, Layers, Settings } from "lucide-react-native";
import { useEffect, useRef, type ReactNode } from "react";
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
import { hitTarget, radius, spacing, typography } from "./tokens";

export function Copy({
  children,
  size = "body",
  muted = false,
  color,
  style,
}: {
  children: ReactNode;
  size?: "display" | "h1" | "h2" | "h3" | "body" | "caption";
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
          fontWeight: size === "body" || size === "caption" ? "400" : "600",
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
          padding: spacing[5],
          gap: spacing[3],
          borderWidth: 1,
          borderColor: colors.separator,
          shadowColor: colors.shadow,
          shadowOpacity: mode === "light" ? 0.045 : 0,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Action({
  children,
  onPress,
  disabled = false,
  secondary = false,
  label,
  testID,
}: {
  children: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  label?: string;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: hitTarget.min,
        paddingHorizontal: spacing[4],
        paddingVertical: spacing[3],
        borderRadius: radius.control,
        alignItems: "center",
        justifyContent: "center",
        opacity: disabled ? 0.5 : pressed ? 0.75 : 1,
        backgroundColor: secondary ? colors.surfaceElevated : colors.accent,
        borderWidth: secondary ? 1 : 0,
        borderColor: colors.separator,
      })}
    >
      <Copy color={secondary ? colors.textPrimary : colors.onAccent}>
        {children}
      </Copy>
    </Pressable>
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
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: pressed
          ? colors.surfaceSecondary
          : colors.surfacePrimary,
      })}
    >
      {children}
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
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  back?: boolean;
  scroll?: boolean;
  footer?: ReactNode;
  onRefresh?: () => void;
}) {
  const { colors, mode } = useTheme();
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
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        {back && (
          <IconAction
            label="Back"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/today")
            }
          >
            <ArrowLeft size={22} color={colors.textPrimary} />
          </IconAction>
        )}
        <View style={{ flex: 1 }}>
          <Copy size="h1">{title}</Copy>
          {subtitle && (
            <Copy muted size="caption">
              {subtitle}
            </Copy>
          )}
        </View>
        {!back && (
          <>
            <IconAction
              label="Open Queue"
              onPress={() => router.push("/generation-queue")}
            >
              <Layers color={colors.textSecondary} size={21} />
            </IconAction>
            <IconAction
              label="Settings and appearance"
              onPress={() => router.push("/appearance")}
            >
              <Settings color={colors.textSecondary} size={21} />
            </IconAction>
          </>
        )}
      </View>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: spacing[5],
            paddingBottom: 32,
            gap: 20,
          }}
        >
          <Flow>{children}</Flow>
          {onRefresh && (
            <Action secondary onPress={onRefresh}>
              Refresh
            </Action>
          )}
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
  return <Animated.View style={{ opacity, gap: 20 }}>{children}</Animated.View>;
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <View accessibilityLiveRegion="polite">
      <Copy muted>{children}</Copy>
    </View>
  );
}

/** A whole-row target keeps lists compact without shrinking the touch area. */
export function RowLink({
  children,
  label,
  onPress,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: hitTarget.min,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: spacing[1] }}>{children}</View>
      <ChevronRight size={22} color={colors.textMuted} />
    </Pressable>
  );
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
