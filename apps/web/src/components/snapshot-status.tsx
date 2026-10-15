"use client";
import { snapshotUpdatedLabel } from "@stay-focused/shared";
import { useEffect, useState } from "react";

export interface SnapshotStatusProps {
  savedAt?: string | null;
  refreshing?: boolean;
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
  const updated = snapshotUpdatedLabel(props.savedAt ?? null);
  const label = props.updateAvailable ? "Updated — tap to refresh" : props.error ?
    `Couldn't refresh · Retry${updated ? ` · ${updated}` : ""}` : props.refreshing ? "Syncing…" : updated;
  return label ? <div className="meta" aria-live="polite"><button className="subtle" onClick={props.updateAvailable ? props.applyUpdate : props.refresh}>{label}</button></div> : null;
}
