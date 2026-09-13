import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { coreTabIcons, coreTabOptions } from "../../../src/design/coreNavigation";
import { density } from "../../../src/design/tokens";
import { useTheme } from "../../../src/design/theme";
import { primaryTabs } from "../../../src/features/redesign/presentation";
export default function TabsLayout() {
 const { colors } = useTheme();
 const insets = useSafeAreaInsets();
 return <Tabs screenOptions={coreTabOptions(colors, insets.bottom)}>
 {primaryTabs.map(tab => <Tabs.Screen key={tab.route} name={tab.route} options={{ title: tab.title, tabBarAccessibilityLabel: tab.title, tabBarIcon: ({ color }) => { const Icon = coreTabIcons[tab.route]; return <Icon color={color} size={density.tabIcon} strokeWidth={1.6} />; } }} />)}
 </Tabs>;
}
