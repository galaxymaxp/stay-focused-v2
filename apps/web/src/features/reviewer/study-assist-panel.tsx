"use client";
import {
  ASSIST_LABELS,
  ASSIST_RESULT_LABELS,
  ASSIST_TYPES,
  type AssistType,
} from "@stay-focused/shared";
import { useEffect, useState } from "react";
import { useAuth } from "../../components/providers";
import { Icon } from "../../components/ui";
import { assistStore, keyOf, useAssistEntries, type AssistEntry, type AssistTarget } from "./assist-store";
import type { StudyAction } from "@stay-focused/shared";
import { SmartSelectionPanel } from "./smart-selection";

// Web port of apps/mobile/src/features/reviewer/StudyAssistSheet.tsx, shown as
// a side panel next to the reading column instead of a bottom sheet.

const ICONS: Record<AssistType, string> = {
  summarize: "text-align-start",
  explain_simply: "lightbulb",
  analogy: "arrow-left-right",
  example: "flask-conical",
};
const HINTS: Record<AssistType, string> = {
  summarize: "The short version",
  explain_simply: "In plain words",
  analogy: "Compare it to something",
  example: "See it in action",
};

export function StudyAssistPanel({
  target,
  initialText,
  initialAction,
  passageLabel,
  onClose,
}: {
  target: AssistTarget | null;
  initialText?: string;
  /** A Smart Selection action chosen in the reader, run as the panel opens. */
  initialAction?: StudyAction;
  /** What the panel is about, for its header. */
  passageLabel: string;
  onClose: () => void;
}) {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const key = target ? keyOf(target) : "";
  const entries = useAssistEntries(key);
  const [shown, setShown] = useState<AssistType | null>(
    () => ASSIST_TYPES.find((type) => entries[type]?.status === "ready" && !entries[type]?.seen) ?? null,
  );
  const [studying, setStudying] = useState(!!initialText);
  useEffect(() => {
    if (!target) return;
    assistStore.setOpen(key);
    assistStore.hydrate(owner, target);
    return () => assistStore.setOpen(null);
  }, [key, owner, target]);
  useEffect(() => {
    if (key) assistStore.markSeen(key);
  }, [entries, key]);
  useEffect(() => {
    if (!shown) {
      const first = ASSIST_TYPES.find((type) => entries[type]?.status === "ready");
      if (first) setShown(first);
    }
  }, [entries, shown]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function choose(type: AssistType) {
    if (!target) return;
    setShown(type);
    const entry = entries[type];
    if (entry?.status === "ready" || entry?.status === "pending") return;
    assistStore.run(owner, api, target, type);
  }
  const current = shown ? entries[shown] : undefined;
  return (
    <aside className="assist-panel" aria-label="Study Assist">
      <header className="assist-panel-head">
        <div>
          <span className="kicker">Study Assist</span>
          <strong>{passageLabel}</strong>
        </div>
        <button className="icon-button subtle" aria-label="Close Study Assist" onClick={onClose}>
          <Icon name="x" />
        </button>
      </header>
      {target ? (
        <div className="assist-panel-body stack">
          <SmartSelectionPanel
            key={`${key}|${initialText ?? ""}|${initialAction ?? ""}`}
            selection={target.selection}
            initialText={initialText}
            initialAction={initialAction}
            onActiveChange={setStudying}
          />
          {!studying && (
            <>
              <span className="kicker assist-section-label">
                Quick assists · whole {target.pointIndex !== undefined ? "key point" : "concept"}
              </span>
              <div className="assist-tiles">
                {ASSIST_TYPES.map((type) => (
                  <OptionTile key={type} type={type} entry={entries[type]} selected={shown === type} onPress={() => choose(type)} />
                ))}
              </div>
              {current?.status === "pending" && shown && (
                <div className="stack shimmer-block" aria-live="polite">
                  <span className="shimmer-line" style={{ width: "92%" }} />
                  <span className="shimmer-line" style={{ width: "84%" }} />
                  <span className="shimmer-line" style={{ width: "60%" }} />
                  <p className="meta">
                    Creating your {ASSIST_LABELS[shown].toLowerCase()}. You can close this; the passage turns green when
                    it’s ready.
                  </p>
                </div>
              )}
              {current?.status === "ready" && shown && (
                <div className="result-card" aria-live="polite">
                  <div className="row">
                    <span className="grounding-badge source">{ASSIST_RESULT_LABELS[shown]}</span>
                    <span className="meta">Saved in this browser</span>
                  </div>
                  <p>{current.text}</p>
                </div>
              )}
              {current?.status === "error" && <p className="notice">{current.error}</p>}
              {!current && <p className="meta">Results are AI-generated and saved in this browser.</p>}
            </>
          )}
        </div>
      ) : (
        <p className="notice">This passage is no longer available. Reopen the Reviewer to choose another.</p>
      )}
    </aside>
  );
}

function OptionTile({
  type,
  entry,
  selected,
  onPress,
}: {
  type: AssistType;
  entry: AssistEntry | undefined;
  selected: boolean;
  onPress: () => void;
}) {
  const ready = entry?.status === "ready";
  const status =
    entry?.status === "pending" ? "Creating…" : ready ? "Ready" : entry?.status === "error" ? "Click to retry" : HINTS[type];
  return (
    <button
      className={`assist-tile${selected ? " selected" : ""}${ready ? " ready" : ""}${entry?.status === "error" ? " error" : ""}`}
      aria-label={`${ASSIST_LABELS[type]}, ${status}`}
      aria-pressed={selected}
      aria-busy={entry?.status === "pending"}
      onClick={onPress}
    >
      <span className="row between">
        <Icon name={ICONS[type]} />
        {entry?.status === "pending" ? (
          <span className="tile-spinner" aria-hidden="true" />
        ) : ready ? (
          <Icon name="check" />
        ) : entry?.status === "error" ? (
          <Icon name="refresh-cw" />
        ) : null}
      </span>
      <strong>{ASSIST_LABELS[type]}</strong>
      <span className="meta">{status}</span>
    </button>
  );
}
