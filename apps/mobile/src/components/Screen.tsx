import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  StatusBar,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors, spacing } from "../design/tokens";

interface ScreenProps {
  readonly children: ReactNode;
  readonly centered?: boolean;
  readonly scroll?: boolean;
  readonly style?: StyleProp<ViewStyle>;
  readonly contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * Optional chrome pinned below the scrolling content. It is laid out as a
   * sibling of the scroll area rather than floating above it, so content always
   * scrolls clear of it. Screens that omit it are unchanged.
   */
  readonly footer?: ReactNode;
}

export function Screen({
  children,
  centered = false,
  scroll = true,
  style,
  contentContainerStyle,
  footer,
}: ScreenProps) {
  const contentStyle = [
    styles.content,
    centered ? styles.centered : null,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={contentStyle}>{children}</View>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[6],
  },
  centered: {
    justifyContent: "center",
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: spacing[2],
    paddingBottom: spacing[3],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[3],
  },
});
