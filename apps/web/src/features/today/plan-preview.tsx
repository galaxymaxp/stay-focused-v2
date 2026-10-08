"use client";
import type { DeterministicStudyPlan } from "@stay-focused/shared/task-planning";
import {
  formatFreeTime,
  planTaskIds,
  planToneFor,
} from "../day-clock/timeline";

// Web port of apps/mobile/src/features/redesign/PlanPreview.tsx.

function minuteOfDay(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}
function hourLabel(minutes: number) {
  const date = new Date(2000, 0, 1, 0, 0);
  date.setMinutes(Math.round(minutes));
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: minutes % 60 ? "2-digit" : undefined,
  });
}

/**
 * The planner's proposal drawn to scale across the free window: one block per
 * session, colored per task (matching the clock ring), empty space left empty.
 * Nothing changes until Apply.
 */
export function PlanPreview({
  plan,
  from,
  to,
  busy,
  onApply,
  onDiscard,
}: {
  plan: DeterministicStudyPlan;
  from: number;
  to: number;
  busy: boolean;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const span = Math.max(15, to - from);
  const taskIds = planTaskIds(plan);
  const planned = plan.sessions.reduce((t, s) => t + s.durationMinutes, 0);
  const unscheduled = plan.unscheduledWork.reduce(
    (t, item) => t + item.unscheduledMinutes,
    0,
  );
  const hours = Array.from(
    { length: Math.floor(to / 60) - Math.ceil(from / 60) + 1 },
    (_, i) => (Math.ceil(from / 60) + i) * 60,
  ).filter((m) => m > from && m < to);
  return (
    <section className="surface stack plan-preview" aria-label="Proposed plan">
      <div className="row between">
        <h3>Proposed plan</h3>
        <span className="meta count-up">{formatFreeTime(planned)} planned</span>
      </div>
      <div
        className="plan-bar"
        role="img"
        aria-label={
          plan.sessions.length
            ? `Proposed plan: ${plan.sessions
                .map(
                  (s) =>
                    `${s.taskTitle} at ${hourLabel(minuteOfDay(s.startsAt))} for ${s.durationMinutes} minutes`,
                )
                .join("; ")}`
            : "No sessions fit this window"
        }
      >
        {hours.map((m) => (
          <span
            key={m}
            className="plan-hour"
            style={{ left: `${((m - from) / span) * 100}%` }}
          />
        ))}
        {plan.sessions.map((session, index) => {
          const start = minuteOfDay(session.startsAt);
          const tone = planToneFor(taskIds, session.taskId);
          const late = session.scheduledAfterDeadline;
          return (
            <span
              key={session.proposalId}
              className={`plan-block${late ? " late" : ""}`}
              title={`${session.taskTitle} · ${session.durationMinutes} min`}
              style={{
                left: `${(Math.max(0, start - from) / span) * 100}%`,
                width: `${(Math.min(session.durationMinutes, to - start) / span) * 100}%`,
                color: `var(--${tone})`,
                background: `var(--${tone}-soft)`,
                animationDelay: `${index * 45}ms`,
              }}
            >
              <strong>{session.taskTitle}</strong>
              <span>
                {late ? "after due · " : ""}
                {session.durationMinutes}m
              </span>
            </span>
          );
        })}
      </div>
      <div className="row between plan-ends">
        <span className="meta">{hourLabel(from)}</span>
        <span className="meta">{hourLabel(to)}</span>
      </div>
      {unscheduled > 0 && (
        <p className="meta plan-unfit">
          <span className="plan-unfit-swatch" aria-hidden="true" />
          {formatFreeTime(unscheduled)} more didn&apos;t fit
        </p>
      )}
      <div className="row wrap">
        <button className="subtle" disabled={busy} onClick={onDiscard}>
          Discard
        </button>
        <button
          className="primary"
          disabled={busy || plan.sessions.length === 0}
          onClick={onApply}
        >
          Apply plan
        </button>
      </div>
    </section>
  );
}
