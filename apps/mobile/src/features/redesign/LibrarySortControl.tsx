import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Action, Copy, Sheet } from '../../design/primitives';
import { spacing, hitTarget } from '../../design/tokens';

/** Reuses the app's sheet; one secondary line in each Library header. */
export function LibrarySortControl<T extends string>({ value, options, onChange }: {
  value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <Action secondary label={'Sort: ' + options.find(option => option.value === value)!.label} onPress={() => setOpen(true)}>
      Sort: {options.find(option => option.value === value)!.label}
    </Action>
    {open && <Sheet title="Sort Library" onClose={() => setOpen(false)}>
      {options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
        accessibilityState={{ selected: value === option.value }} onPress={() => { onChange(option.value); setOpen(false); }}
        style={{ minHeight: hitTarget.min, justifyContent: 'center', paddingVertical: spacing[2] }}>
        <View><Copy>{option.label}{value === option.value ? ' \u2713' : ''}</Copy></View>
      </Pressable>)}
    </Sheet>}
  </>;
}
