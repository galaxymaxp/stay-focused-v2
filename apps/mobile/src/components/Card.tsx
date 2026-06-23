import type { ReactNode } from "react";
import {
  StyleSheet,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { colors, radius, shadows, spacing } from "../design/tokens";

interface CardProps extends ViewProps {
  readonly children: ReactNode;
  readonly elevated?: boolean;
  readonly accent?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export function Card({
  children,
  elevated = false,
  accent = false,
  style,
  ...props
}: CardProps) {
  return (
    <View
      style={[
        styles.card,
        elevated ? styles.elevated : null,
        accent ? styles.accent : null,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing[5],
    ...shadows.card,
  },
  elevated: {
    backgroundColor: colors.cardElevated,
  },
  accent: {
    borderColor: colors.accent,
  },
});
