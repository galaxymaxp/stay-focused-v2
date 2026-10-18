"use client";
import { snapshotStatusLabel } from "@stay-focused/shared";
import { useEffect, useState } from "react";

export interface SnapshotStatusProps {
  savedAt?: string | null;
  refreshing?: boolean;
  error: string | null;
  refresh: () => void;
  updateAvailable?: boolean;
  applyUpdate?: () => void;
  hideFreshLabel?: boolean;
}
export function SnapshotStatus(props: SnapshotStatusProps) {
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick(value => value + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const label = snapshotStatusLabel(props);
  return label ? <div className="meta" aria-live="polite"><button className="subtle" onClick={props.updateAvailable ? props.applyUpdate : props.refresh}>{label}</button></div> : null;
}
