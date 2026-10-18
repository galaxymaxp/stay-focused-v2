import type { ActivityDetail } from "@stay-focused/shared";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { Copy, Surface } from "../../design/primitives";
import { useTheme } from "../../design/theme";
import { spacing } from "../../design/tokens";
import { activityDetailOfflineCache } from "../../services/localLibrary/offlineActivityCache";
import { deadline } from "./presentation";
import { useExperience } from "./useExperience";

export function DraftInstructions({ activityId }: { activityId?: string | null }) {
  const activity = useExperience<ActivityDetail>(
    activityId ? `/api/experience/activities/${encodeURIComponent(activityId)}` : null,
    0, undefined, activityDetailOfflineCache,
  );
  const [expanded, setExpanded] = useState(false);
  const { colors } = useTheme();
  if (!activityId || !activity.data) return null;
  const data = activity.data;
  const meta = [
    data.dueAt ? `Due ${deadline(data.dueAt)}` : null,
    data.pointsPossible != null ? `${data.pointsPossible} pts` : null,
  ].filter(Boolean).join(" · ");
  const Chevron = expanded ? ChevronUp : ChevronDown;
  return (
    <Surface>
      <Pressable accessibilityRole="button" accessibilityLabel="Instructions"
        accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3], opacity: pressed ? 0.6 : 1 })}>
        <Copy size="h2">Instructions</Copy>
        <Chevron size={20} color={colors.textSecondary} />
      </Pressable>
      {expanded && <View style={{ gap: spacing[3] }}>
        {meta ? <Copy muted size="caption">{meta}</Copy> : null}
        <Copy>{data.instructions?.trim() ? data.instructions : "No instructions provided."}</Copy>
      </View>}
    </Surface>
  );
}
