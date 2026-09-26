import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { coreTabIcons, coreTabOptions } from "../../../src/design/coreNavigation";
import { tabMotion } from "../../../src/design/navigationMotion";
import { density } from "../../../src/design/tokens";
import { useTheme } from "../../../src/design/theme";
import { primaryTabs } from "../../../src/features/redesign/presentation";

/**
 * Tabs are siblings: a short cross-fade, never a forward slide. Generate, Tasks
 * and Library each own a stack, so back walks their hierarchy before the tab
 * navigator's own back behavior (return to Today) ever applies.
 */
export default function TabsLayout() {
  const { colors, reducedMotion } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{ ...coreTabOptions(colors, insets.bottom), ...tabMotion(reducedMotion, colors.backgroundPrimary) }}>
      {primaryTabs.map((tab) => (
        <Tabs.Screen
          key={tab.route}
          name={tab.route}
          options={{
            title: tab.title,
            tabBarAccessibilityLabel: tab.title,
            tabBarIcon: ({ color }) => {
              const Icon = coreTabIcons[tab.route];
              return <Icon color={color} size={density.tabIcon} strokeWidth={1.6} />;
            },
          }}
        />
      ))}
    </Tabs>
  );
}
