import { useMemo } from "react";
import { useLegacyTheme, type LegacyColors } from "../design/theme";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { hitTarget, radius, spacing, typography } from "../design/tokens";
import { haptic } from "../design/haptics";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<PressableProps, "children" | "style"> {
  readonly children: ReactNode;
  readonly variant?: ButtonVariant;
  readonly fullWidth?: boolean;
  readonly loading?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly textStyle?: StyleProp<TextStyle>;
}

export function Button({
  children,
  variant = "primary",
  fullWidth = false,
  loading = false,
  disabled = false,
  accessibilityState,
  style,
  textStyle,
  onPress,
  ...props
}: ButtonProps) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isDisabled = disabled || loading;
  const palette = variantStyles(colors)[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{
        ...accessibilityState,
        busy: loading,
        disabled: isDisabled,
      }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        palette.container,
        fullWidth ? styles.fullWidth : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...props}
      onPress={onPress ? (event) => {
        haptic.tap();
        onPress(event);
      } : undefined}
    >
      {loading ? (
        <ActivityIndicator color={palette.indicatorColor} size="small" />
      ) : (
        <Text style={[styles.text, palette.text, textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (colors: LegacyColors) => StyleSheet.create({
  base: {
    alignItems: "center",
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: hitTarget.min,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.54,
  },
  text: {
    flexShrink: 1,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "center",
  },
});

const variantStyles = (colors: LegacyColors) => ({
  primary: {
    container: {
      backgroundColor: colors.accent,
      borderColor: colors.accentPressed,
    },
    text: {
      color: colors.accentText,
    },
    indicatorColor: colors.accentText,
  },
  secondary: {
    container: {
      backgroundColor: colors.cardElevated,
      borderColor: colors.borderStrong,
    },
    text: {
      color: colors.textPrimary,
    },
    indicatorColor: colors.textPrimary,
  },
  ghost: {
    container: {
      backgroundColor: colors.transparent,
      borderColor: colors.transparent,
    },
    text: {
      color: colors.textSecondary,
    },
    indicatorColor: colors.textSecondary,
  },
  danger: {
    container: {
      backgroundColor: colors.errorSurface,
      borderColor: colors.error,
    },
    text: {
      color: colors.error,
    },
    indicatorColor: colors.error,
  },
} satisfies Record<
  ButtonVariant,
  {
    readonly container: ViewStyle;
    readonly text: TextStyle;
    readonly indicatorColor: string;
  }
>);
