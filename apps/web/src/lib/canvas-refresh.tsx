"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/providers";
import { Icon } from "../components/ui";
import {
  performCanvasRefresh,
  type RefreshPhase,
  type RefreshProgress,
} from "./canvas-refresh-core";

/**
 * Scopes refreshed in this page load. Opening or reloading Generate (or a
 * course in it) asks Canvas for the latest once, the web's pull-to-refresh;
 * moving around inside the app does not repeat it.
 */
const refreshedThisLoad = new Set<string>();

export function useCanvasRefresh(scope: string, onSynced: () => void, auto = true) {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const identity = `${owner}:${scope}`;
  const active = useRef<AbortController | null>(null);
  const synced = useRef(onSynced);
  synced.current = onSynced;
  const [state, setState] = useState<{
    identity: string;
    phase: RefreshPhase;
    progress: RefreshProgress;
  }>({
    identity,
    phase: "idle",
    progress: { finished: 0, total: 0 },
  });
  useEffect(
    () => () => {
      active.current?.abort();
      active.current = null;
    },
    [identity, api],
  );

  const sync = useCallback(async () => {
    if (!owner || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setState({
      identity,
      phase: "syncing",
      progress: { finished: 0, total: 0 },
    });
    try {
      const phase = await performCanvasRefresh(
        api,
        scope,
        controller.signal,
        (progress) => {
          if (!controller.signal.aborted)
            setState({ identity, phase: "syncing", progress });
        },
      );
      if (!controller.signal.aborted) {
        setState((old) => ({ ...old, phase }));
        if (phase === "synced" || phase === "partial" || phase === "unconfirmed") {
          synced.current();
          window.dispatchEvent(new Event("sf:task-state-changed"));
        }
      }
    } catch {
      if (!controller.signal.aborted)
        setState((old) => ({ ...old, phase: "failed" }));
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, [api, identity, owner, scope]);
  useEffect(() => {
    if (!auto || !owner) return;
    // A course needs no second request when the whole account just refreshed.
    if (refreshedThisLoad.has(identity) || refreshedThisLoad.has(`${owner}:all`)) return;
    refreshedThisLoad.add(identity);
    let settled = false;
    void sync().finally(() => {
      settled = true;
    });
    // A refresh cut short (navigation, or React's development remount) may run again.
    return () => {
      if (!settled) refreshedThisLoad.delete(identity);
    };
  }, [auto, identity, owner, sync]);
  return {
    ...(state.identity === identity
      ? state
      : { phase: "idle" as const, progress: { finished: 0, total: 0 } }),
    sync,
  };
}

export function CanvasRefreshStatus({
  refresh,
}: {
  refresh: ReturnType<typeof useCanvasRefresh>;
}) {
  const { phase, progress, sync } = refresh;
  const label =
    phase === "syncing"
      ? progress.total
        ? `Syncing with Canvas · ${progress.finished}/${progress.total}`
        : "Syncing with Canvas…"
      : phase === "synced"
        ? "Up to date with Canvas"
        : phase === "partial"
          ? "Some sync requests didn’t finish"
          : phase === "failed"
            ? "Canvas sync didn’t finish"
            : phase === "unconfirmed"
              ? "Sync status unavailable. Accepted jobs may still be running."
              : phase === "not_connected"
                ? "Connect Canvas to sync courses"
                : "Canvas";
  return (
    <span className={`canvas-refresh ${phase}`} role="status">
      {phase === "syncing" ? (
        <span className="tile-spinner" aria-hidden="true" />
      ) : (
        <Icon name="refresh-cw" />
      )}
      <span>{label}</span>
      {phase !== "syncing" && (
        <button className="link-button subtle" onClick={() => void sync()}>
          Sync now
        </button>
      )}
    </span>
  );
}
