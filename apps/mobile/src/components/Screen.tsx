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
}

export function Screen({
  children,
  centered = false,
  scroll = true,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const contentStyle = [
    styles.content,
    centered ? styles.centered : null,
    contentContainerStyle,
  ];

  return (
    <SafeAreaView style={[styles.safeArea, style]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
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
});
