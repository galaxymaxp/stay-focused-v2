import { ListChecks, RotateCw, Square, Trash2, X } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { haptic } from '../../design/haptics';
import { useTheme } from '../../design/theme';
import { radius } from '../../design/tokens';

/** Replaces the filter tabs while selecting, without taking list space. */
export function LibrarySelectionToolbar({ allSelected, allInCourse, canRemake, canRemove, dragging, onRemake, onRemove, onToggleAll, onCancel }: {
  allSelected: boolean;
  allInCourse: boolean;
  canRemake: boolean;
  canRemove: boolean;
  dragging: boolean;
  onRemake: () => void;
  onRemove: () => void;
  onToggleAll: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  return <View accessibilityRole="toolbar" accessibilityLabel="Selected work actions" style={{ flexDirection: 'row', borderRadius: radius.control, backgroundColor: colors.surfaceSecondary }}>
    <SelectionIcon label={allInCourse ? 'Remake all reviewers' : 'Remake selected reviewers'} disabled={!canRemake || dragging} onPress={onRemake}>
      <RotateCw size={21} color={colors.textPrimary} strokeWidth={1.8} />
    </SelectionIcon>
    <SelectionIcon label={allInCourse ? 'Remove all' : 'Remove selected'} disabled={!canRemove || dragging} onPress={onRemove}>
      <Trash2 size={21} color={colors.danger} strokeWidth={1.8} />
    </SelectionIcon>
    <SelectionIcon label={allSelected ? 'Unselect all' : 'Select all'} disabled={dragging} onPress={onToggleAll}>
      {allSelected ? <Square size={21} color={colors.textPrimary} strokeWidth={1.8} /> : <ListChecks size={21} color={colors.textPrimary} strokeWidth={1.8} />}
    </SelectionIcon>
    <SelectionIcon label="Cancel selection" onPress={onCancel}>
      <X size={21} color={colors.textPrimary} strokeWidth={1.8} />
    </SelectionIcon>
  </View>;
}

function SelectionIcon({ label, disabled = false, onPress, children }: { label: string; disabled?: boolean; onPress: () => void; children: ReactNode }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
    onPress={() => { haptic.tap(); onPress(); }}
    style={({ pressed }) => ({ flex: 1, minWidth: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.control, opacity: disabled ? 0.35 : 1, backgroundColor: pressed ? colors.surfacePrimary : 'transparent' })}>
    {children}
  </Pressable>;
}
