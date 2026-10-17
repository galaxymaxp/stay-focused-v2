import { ArrowDownWideNarrow, Check } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Copy, Sheet } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
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
      onPress={() => setOpen(true)} style={{ minHeight: hitTarget.min, flexShrink: 0, justifyContent: "center", opacity: disabled ? 0.35 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.pill, backgroundColor: colors.surfaceSecondary }}>
        <ArrowDownWideNarrow size={16} color={colors.textSecondary} />
        <Copy size="caption" style={{ fontWeight: "600" }}>Sort</Copy>
      </View>
    </Pressable>
    {open ? <Sheet title={grid ? "Sort courses" : "Sort saved work"} onClose={() => setOpen(false)}>
      <View>
      {LIBRARY_SORT_OPTIONS.filter(option => (option.value !== "course" || course) && (option.value !== "custom" || !grid)).map(option =>
        <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: value === option.value }}
          onPress={() => { onChange(option.value); setOpen(false); }} style={{ minHeight: hitTarget.min, paddingVertical: spacing[3], paddingHorizontal: spacing[3], borderRadius: radius.control, backgroundColor: value === option.value ? colors.surfaceSecondary : undefined, flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View style={{ flex: 1 }}><Copy>{option.label}</Copy></View>
          {value === option.value ? <Check size={20} color={colors.accent} /> : null}
        </Pressable>)}
      </View>
      {course && value === "course" ? <Copy muted size="caption">Follows Canvas modules and materials. Unlinked work appears last.</Copy> : !grid && value === "custom" ? <Copy muted size="caption">Hold and drag to change My order. Other sorts keep your manual order saved.</Copy> : null}
    </Sheet> : null}
  </>;
}
