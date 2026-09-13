import { useMemo } from "react";
import { useLegacyTheme, type LegacyColors } from "../design/theme";
import type { ReactNode } from "react";
import {
  StyleSheet,
  type StyleProp,
  View,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { radius, shadows, spacing } from "../design/tokens";

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
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

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

const createStyles = (colors: LegacyColors) => StyleSheet.create({
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
