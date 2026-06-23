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

import { colors, hitTarget, radius, spacing, typography } from "../design/tokens";

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
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const palette = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
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
    >
      {loading ? (
        <ActivityIndicator color={palette.indicatorColor} size="small" />
      ) : (
        <Text style={[styles.text, palette.text, textStyle]}>{children}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    fontWeight: "700",
  },
});

const variantStyles = {
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
>;
