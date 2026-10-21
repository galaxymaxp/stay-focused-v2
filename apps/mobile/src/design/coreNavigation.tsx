import type { BottomTabNavigationOptions } from "expo-router/js-tabs";
import { BookOpen, CheckSquare, Clock, Sparkles } from "lucide-react-native";
import type { ThemeColors } from "./themeTokens";
import { TabPressButton } from "./TabPressButton";
import { density, hitTarget } from "./tokens";

export const coreTabIcons = { today: Clock, courses: Sparkles, work: CheckSquare, library: BookOpen };

/** Shared with the real navigator in the visual harness; safe area is additive. */
export function coreTabOptions(colors: ThemeColors, bottomInset: number): BottomTabNavigationOptions {
  return {
    headerShown: false,
    tabBarButton: props => <TabPressButton {...props} />,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: {
      height: density.tabHeight + bottomInset,
      paddingTop: 2,
      paddingBottom: bottomInset + 2,
      backgroundColor: colors.backgroundPrimary,
      borderTopColor: colors.separator,
      borderTopWidth: 0.5,
      elevation: 0,
    },
    tabBarLabelStyle: { fontSize: density.tabLabel, fontWeight: "500", marginTop: 0 },
    tabBarIconStyle: { height: 24 },
    tabBarItemStyle: { minHeight: hitTarget.min },
  };
}
