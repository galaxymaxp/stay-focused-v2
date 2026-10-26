import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Copy } from '../../design/primitives';

export interface RemovedPlanBlock { key: string; title: string; expiresAt: number }
/** One pending removal; replacing it restarts the five-second window. */
export function PlanUndoBar({ removed, onUndo, onExpire }: { removed: RemovedPlanBlock | null; onUndo: (key: string) => void; onExpire: () => void }) {
  const latest = useRef({ onUndo, onExpire }); latest.current = { onUndo, onExpire };
  const [expired, setExpired] = useState<RemovedPlanBlock | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => { setExpired(removed); latest.current.onExpire(); }, Math.max(0, removed.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [removed]);
  if (!removed || removed === expired) return null;
  return <View testID="plan-undo-bar" accessibilityLiveRegion="polite" style={{ height: 52, borderRadius: 999, backgroundColor: '#f2efe8', flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 4, gap: 12 }}>
    <Copy color="#141415" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, fontSize: 14 }}>Removed {removed.title}</Copy>
    <Pressable accessibilityRole="button" accessibilityLabel="Undo remove" onPress={() => { if (Date.now() < removed.expiresAt) latest.current.onUndo(removed.key); latest.current.onExpire(); }} style={{ minWidth: 64, minHeight: 44, paddingHorizontal: 16, borderRadius: 999, backgroundColor: '#141415', alignItems: 'center', justifyContent: 'center' }}><Copy color="#f2efe8" style={{ fontSize: 13, fontWeight: '600' }}>Undo</Copy></Pressable>
  </View>;
}
