import { ArrowDownWideNarrow, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Copy, Sheet } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { spacing } from "../../design/tokens";
import type { LibrarySort } from "./listPreferences";

export const LIBRARY_SORT_OPTIONS: readonly { value: LibrarySort; label: string }[] = [
  { value: "custom", label: "My order" },
  { value: "updated_desc", label: "Updated: newest first" },
  { value: "updated_asc", label: "Updated: oldest first" },
  { value: "course", label: "Course order" },
  { value: "title_asc", label: "Alphabetical: A to Z" },
  { value: "title_desc", label: "Alphabetical: Z to A" },
];
export function LibrarySortControl({ value, onChange, course = false, grid = false, disabled = false }: {
  value: LibrarySort; onChange: (sort: LibrarySort) => void; course?: boolean; grid?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { colors } = useTheme();
  const selected = LIBRARY_SORT_OPTIONS.find(option => option.value === value)!;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`Sort Library: ${selected.label}`} accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => setOpen(true)} style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center", opacity: disabled ? 0.35 : 1 }}>
      <ArrowDownWideNarrow size={20} color={colors.textPrimary} />
      <Copy size="caption">Sort</Copy>
    </Pressable>
    {open ? <Sheet title={grid ? "Sort courses" : "Sort saved work"} onClose={() => setOpen(false)}>
      {LIBRARY_SORT_OPTIONS.filter(option => (option.value !== "course" || course) && (option.value !== "custom" || !grid)).map(option =>
        <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }}
          onPress={() => { onChange(option.value); setOpen(false); }} style={{ minHeight: 48, paddingVertical: spacing[3], flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View style={{ flex: 1 }}><Copy>{option.label}</Copy></View>
          {value === option.value ? <Check size={20} color={colors.accent} /> : null}
        </Pressable>)}
      {course ? <Copy muted size="caption">Course order follows Canvas modules and materials. Work without a linked material appears last.</Copy> : null}
      {!grid ? <Copy muted size="caption">Drag an item to save a new My order. Your saved manual order is kept when using another sort.</Copy> : null}
    </Sheet> : null}
  </>;
}
