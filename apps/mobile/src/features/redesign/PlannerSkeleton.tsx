import { View } from 'react-native';
import { Copy, SkeletonBlock } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { PlannerButton } from './PlanPreview';

function Shape({ width, height, radius = 8 }: { width: number | `${number}%`; height: number; radius?: number }) {
  const { colors } = useTheme();
  return <SkeletonBlock width={width} height={height} radius={radius} opacityRange={[0.55, 1]} style={{ backgroundColor: colors.separator }} />;
}
/** Shares the app's single 800 + 800 ms opacity loop; Reduced Motion is static. */
export function PlannerSkeleton() {
  const { colors } = useTheme();
  return <View testID="planner-skeleton" accessible accessibilityLabel="Loading your plan" accessibilityState={{ busy: true }} style={{ gap: 20 }}>
    <View style={{ borderRadius: 18, borderWidth: 1, borderColor: colors.separator, backgroundColor: colors.surfacePrimary, paddingVertical: 16, paddingHorizontal: 18, gap: 12 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Shape width="55%" height={16} /><Shape width="23%" height={12} /></View><Shape width="100%" height={6} radius={3} /><Shape width="85%" height={12} /></View>
    <View style={{ gap: 8 }}>{(['78%', '92%', '64%'] as const).map((width, index) => <View testID="skeleton-block-row" key={index} style={{ flexDirection: 'row', gap: 12 }}><View style={{ width: 40, paddingTop: 16, alignItems: 'flex-end' }}><Shape width={30} height={12} /></View><View style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: colors.surfacePrimary, gap: 9 }}><View style={{ flexDirection: 'row', gap: 8 }}><Shape width={10} height={10} radius={5} /><Shape width={38} height={10} /></View><Shape width={width} height={14} /><Shape width={92} height={10} /></View></View>)}</View>
    <View style={{ gap: 4 }}><Copy muted style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.04 }}>Adjust</Copy>{['Courses','Include'].map((label,index) => <View key={label} style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.separator }}><Copy>{label}</Copy><Shape width={index ? 196 : 44} height={index ? 36 : 12} radius={index ? 10 : 6} /></View>)}</View>
    <View><Copy muted style={{ fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.04 }}>Smart order</Copy>{(['72%','58%','66%','50%'] as const).map((width,index) => <View testID="skeleton-course-row" key={index} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderColor: colors.separator }}><Shape width={10} height={10} radius={5} /><View style={{ flex: 1, gap: 7 }}><Shape width={width} height={13} /><Shape width={110} height={10} /></View><Shape width={14} height={14} radius={4} /></View>)}</View>
    <PlannerButton disabled onPress={() => {}}>Use this plan</PlannerButton>
  </View>;
}
