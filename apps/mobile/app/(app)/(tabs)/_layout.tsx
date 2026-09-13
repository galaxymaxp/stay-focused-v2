import { Tabs } from "expo-router";
import { BookOpen, CheckSquare, Clock, Sparkles } from "lucide-react-native";
import { useTheme } from "../../../src/design/theme";
import { primaryTabs } from "../../../src/features/redesign/presentation";
const icons = { today: Clock, courses: Sparkles, work: CheckSquare, library: BookOpen };
export default function TabsLayout() {
 const { colors } = useTheme();
 return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.textSecondary, tabBarStyle: { backgroundColor: colors.surfacePrimary, borderTopColor: colors.separator, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 12, fontWeight: "500" }, tabBarItemStyle: { minHeight: 48 } }}>
 {primaryTabs.map(tab => <Tabs.Screen key={tab.route} name={tab.route} options={{ title: tab.title, tabBarAccessibilityLabel: tab.title, tabBarIcon: ({ color, size }) => { const Icon = icons[tab.route]; return <Icon color={color} size={size} strokeWidth={1.8} />; } }} />)}
 </Tabs>;
}
