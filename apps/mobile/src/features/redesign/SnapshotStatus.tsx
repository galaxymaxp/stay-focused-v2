import { snapshotUpdatedLabel } from "@stay-focused/shared";
import { useEffect, useState } from "react";
import { Pressable } from "react-native";
import { Copy } from "../../design/primitives";
import { hitTarget, spacing } from "../../design/tokens";

export interface SnapshotStatusProps {
  savedAt: string | null;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
  updateAvailable?: boolean;
  applyUpdate?: () => void;
}
export function SnapshotStatus(props: SnapshotStatusProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick(value => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const updated = snapshotUpdatedLabel(props.savedAt);
  const label = props.updateAvailable ? "Updated — tap to refresh" : props.error ?
    `Couldn't refresh · Retry${updated ? ` · ${updated}` : ""}` : props.refreshing ? "Syncing…" : updated;
  if (!label) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={props.updateAvailable ? props.applyUpdate : props.refresh} style={{ minHeight: hitTarget.min, paddingHorizontal: spacing[5], justifyContent: "center" }}>
    <Copy muted size="caption">{label}</Copy>
  </Pressable>;
}
