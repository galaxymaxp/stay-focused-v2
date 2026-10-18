"use client";
import type { ActivityDetail } from "@stay-focused/shared";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { dateLabel } from "../lib/api";
import { useResource } from "../lib/hooks";

export function DraftInstructions({ activityId, unavailable = null }: {
  activityId?: string | null;
  unavailable?: ReactNode;
}) {
  const activity = useResource<ActivityDetail>(
    activityId ? `/api/experience/activities/${encodeURIComponent(activityId)}` : null,
  );
  if (!activityId || activity.error) return <>{unavailable}</>;
  if (!activity.data) return <p className="muted">Loading instructions…</p>;
  return <Instructions key={activityId} activity={activity.data} />;
}

function Instructions({ activity }: { activity: ActivityDetail }) {
  const [expanded, setExpanded] = useState(false);
  const [long, setLong] = useState(false);
  const text = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const element = text.current;
    if (!element || expanded) return;
    const measure = () => setLong(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [activity.instructions, expanded]);
  const meta = [
    activity.dueAt ? `Due ${dateLabel(activity.dueAt)}` : null,
    activity.pointsPossible != null ? `${activity.pointsPossible} pts` : null,
  ].filter(Boolean).join(" · ");
  return (
    <section className="draft-instructions stack" aria-label="Activity instructions">
      <h2>Instructions</h2>
      {meta && <p className="meta">{meta}</p>}
      {activity.instructions?.trim() ? (
        <>
          <p ref={text} className={`instructions${expanded ? "" : " clamped"}`}>{activity.instructions}</p>
          {long && <button className="subtle" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>
            {expanded ? "Show less" : "Show all"}
          </button>}
        </>
      ) : <p className="muted">No instructions provided.</p>}
    </section>
  );
}
