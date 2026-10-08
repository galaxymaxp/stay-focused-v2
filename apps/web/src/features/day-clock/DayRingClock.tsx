"use client";
import type { TodayItem } from "@stay-focused/shared";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useSpringNumber } from "../../lib/motion";
import { DAY_ORB_FILL, DayOrb } from "./DayOrb";
import {
  CLOCK,
  DAY_MINUTES,
  dayStateAt,
  SNAP_MINUTES,
  angleMinutes,
  angularDelta,
  dragEdge,
  followMinutes,
  hitTest,
  moveRange,
  ringPoint,
  segmentAt,
  snapRange,
  snapTo,
} from "./dayClock";
import {
  clockLabel,
  formatFreeTime,
  timelineSegments,
  type PlanTone,
  type TimelineSegment,
} from "./timeline";

// Web port of apps/mobile/src/features/redesign/DayRingClock.tsx: same
// geometry, hit-testing, follow-then-snap drag, gliding schedule arcs and
// proposed-plan arcs. PanResponder becomes pointer events (mouse, pen and
// touch), and screen-reader adjustables become keyboard sliders.

type Mode = "start" | "end" | "move";
type Range = { start: number; end: number };
export interface ProposedArc {
  readonly id: string;
  readonly from: number;
  readonly to: number;
  readonly tone: PlanTone;
}

/** Touch drags on the middle wait for a still hold so a scroll still scrolls. */
const MOVE_HOLD_MS = 240;
const MOVE_SLOP = 8;
const SNAP_MS = 180;
const TWEEN_MS = 260;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

function arc(from: number, to: number, radius: number) {
  const a = ringPoint(from, radius),
    b = ringPoint(Math.min(to, from + 1439.9), radius);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

/** Short eased transition, driven per frame only while it runs. */
function tween(
  from: number[],
  to: number[],
  duration: number,
  onFrame: (values: number[]) => void,
  onDone?: () => void,
) {
  const begin = performance.now();
  let stopped = false;
  const step = () => {
    if (stopped) return;
    const t = Math.min(1, (performance.now() - begin) / duration);
    const k = easeOut(t);
    onFrame(from.map((value, i) => value + (to[i]! - value) * k));
    if (t < 1) requestAnimationFrame(step);
    else onDone?.();
  };
  requestAnimationFrame(step);
  return () => {
    stopped = true;
  };
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return reduced;
}

/** Schedule arcs glide to new times instead of jumping; new ones grow from their start. */
function useGlidingSegments(
  segments: readonly TimelineSegment[],
  reducedMotion: boolean,
) {
  const [shown, setShown] = useState(segments);
  const previous = useRef(segments);
  useEffect(() => {
    const before = new Map(previous.current.map((s) => [s.id, s]));
    previous.current = segments;
    if (reducedMotion) {
      setShown(segments);
      return;
    }
    const from = segments.flatMap((s) => {
      const old = before.get(s.id);
      return old ? [old.from, old.to] : [s.from, s.from];
    });
    const to = segments.flatMap((s) => [s.from, s.to]);
    if (from.every((value, i) => value === to[i])) {
      setShown(segments);
      return;
    }
    return tween(from, to, TWEEN_MS, (values) =>
      setShown(
        segments.map((s, i) => ({
          ...s,
          from: values[i * 2]!,
          to: values[i * 2 + 1]!,
        })),
      ),
    );
  }, [reducedMotion, segments]);
  return shown;
}

const kindTone = (kind: TodayItem["kind"]) =>
  kind === "study_session"
    ? "var(--blue)"
    : kind === "calendar_block"
      ? "var(--orange)"
      : "var(--violet)";

/**
 * Today's day clock. A glass orb holds the state of the day; around it the
 * ring shows free time (the accent arc) and scheduled items (the thin inner
 * lane). Drag an end to resize, or the middle to move the whole block; it
 * follows continuously and snaps to fifteen minutes on release.
 */
export function DayRingClock({
  date,
  timeline,
  start,
  end,
  onCommit,
  disabled = false,
  proposed = [],
  onSegmentPress,
  locked = false,
  onToggleLock,
}: {
  date: string;
  timeline: readonly TodayItem[];
  start: number;
  end: number;
  onCommit: (start: number, end: number) => void;
  disabled?: boolean;
  /** A plan preview drawn as dashed arcs on the schedule lane until applied. */
  proposed?: readonly ProposedArc[];
  /** A scheduled block on the inner lane was clicked. */
  onSegmentPress?: (id: string) => void;
  /** Locked, the free time cannot be dragged (blocks can still be opened). */
  locked?: boolean;
  onToggleLock?: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<number>(CLOCK.size);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setSize(el.clientWidth || CLOCK.size));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const scale = size / CLOCK.size;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // The whole dial springs out from 12:00 AM when it first appears.
  const reveal = useSpringNumber(1);
  const fromMidnight = (m: number) => (reveal >= 1 ? m : m * reveal);

  const [draft, setDraft] = useState<Range | null>(null);
  const [adjusting, setAdjusting] = useState<Mode | null>(null);
  const [hover, setHover] = useState<Mode | "segment" | null>(null);
  const range = draft ?? { start, end };
  const segments = useGlidingSegments(
    useMemo(() => timelineSegments(timeline, date), [timeline, date]),
    reducedMotion,
  );
  const latest = useRef({ start, end, disabled, locked, segments, onCommit, onSegmentPress, reducedMotion });
  latest.current = { start, end, disabled, locked, segments, onCommit, onSegmentPress, reducedMotion };
  const gesture = useRef({
    mode: null as Mode | null,
    held: false,
    touch: false,
    origin: { x: 0, y: 0 },
    client: { x: 0, y: 0 },
    angle: 0,
    moved: 0,
    base: { start: 0, end: 0 },
    value: { start: 0, end: 0 },
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    tap: null as string | null,
    stopSnap: null as null | (() => void),
  });
  useEffect(
    () => () => {
      clearTimeout(gesture.current.timer);
      gesture.current.stopSnap?.();
    },
    [],
  );
  // Props caught up with a committed value: the local draft is no longer needed.
  useEffect(() => {
    if (!gesture.current.held && !gesture.current.stopSnap) setDraft(null);
  }, [start, end]);

  const toDesign = useCallback((event: { clientX: number; clientY: number }) => {
    const rect = box.current!.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * CLOCK.size,
      y: ((event.clientY - rect.top) / rect.height) * CLOCK.size,
    };
  }, []);

  const activate = () => {
    const state = gesture.current;
    if (state.held || !state.mode) return;
    state.held = true;
    setAdjusting(state.mode);
  };
  const finish = (commit: boolean) => {
    const state = gesture.current;
    clearTimeout(state.timer);
    const wasHeld = state.held;
    const mode = state.mode;
    state.held = false;
    state.mode = null;
    setAdjusting(null);
    if (!wasHeld || !mode) return;
    const released = commit ? state.value : state.base;
    const target = commit
      ? snapRange(released.start, released.end, mode)
      : state.base;
    const done = () => {
      state.stopSnap = null;
      if (commit) latest.current.onCommit(target.start, target.end);
      else setDraft(null);
    };
    if (latest.current.reducedMotion) {
      setDraft(target);
      done();
      return;
    }
    state.stopSnap?.();
    state.stopSnap = tween(
      [released.start, released.end],
      [target.start, target.end],
      SNAP_MS,
      ([a, b]) => setDraft({ start: a!, end: b! }),
      done,
    );
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const point = toDesign(event);
    const { start: from, end: to, segments: blocks, onSegmentPress: press, locked: fixed, disabled: off } = latest.current;
    const block = press ? segmentAt(point.x, point.y, blocks, [from, to]) : null;
    const mode = block || fixed || off ? null : hitTest(point.x, point.y, from, to);
    if (!block && !mode) return;
    const state = gesture.current;
    state.stopSnap?.();
    state.stopSnap = null;
    state.tap = block?.id ?? null;
    state.mode = mode;
    state.held = false;
    state.touch = event.pointerType === "touch";
    state.origin = point;
    state.client = { x: event.clientX, y: event.clientY };
    state.angle = angleMinutes(point.x - CLOCK.center, point.y - CLOCK.center);
    state.moved = 0;
    state.base = { start: from, end: to };
    state.value = { start: from, end: to };
    event.currentTarget.setPointerCapture(event.pointerId);
    clearTimeout(state.timer);
    // Ends grab at once. A mouse can move the block at once too; on touch the
    // middle waits for a still hold so a scroll that starts on it still scrolls.
    if (mode === "move" && state.touch)
      state.timer = setTimeout(activate, MOVE_HOLD_MS);
    else if (mode) activate();
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = gesture.current;
    const point = toDesign(event);
    if (!state.mode && !state.tap) {
      // Hover only: show what a press here would do.
      const { start: from, end: to, segments: blocks, onSegmentPress: press, locked: fixed, disabled: off } = latest.current;
      const next =
        press && segmentAt(point.x, point.y, blocks, [from, to])
          ? "segment"
          : fixed || off
            ? null
            : hitTest(point.x, point.y, from, to);
      if (next !== hover) setHover(next);
      return;
    }
    const travel = Math.hypot(event.clientX - state.client.x, event.clientY - state.client.y);
    if (state.tap && travel > MOVE_SLOP) state.tap = null;
    if (!state.mode) return;
    if (!state.held) {
      if (travel <= MOVE_SLOP) return;
      // Moving before the hold completes is a scroll, not a block move.
      clearTimeout(state.timer);
      state.mode = null;
      return;
    }
    const angle = angleMinutes(point.x - CLOCK.center, point.y - CLOCK.center);
    const current = state.value;
    let next: Range;
    if (state.mode === "move") {
      state.moved += angularDelta(state.angle, angle);
      state.angle = angle;
      next = moveRange(state.base.start, state.base.end, state.moved);
    } else {
      const edge = state.mode;
      next = dragEdge(
        edge,
        followMinutes(edge === "start" ? current.start : current.end, angle),
        current.start,
        current.end,
      );
    }
    state.value = next;
    setDraft(next);
  };
  const onPointerUp = () => {
    const tapped = gesture.current.tap;
    gesture.current.tap = null;
    if (tapped) latest.current.onSegmentPress?.(tapped);
    finish(true);
  };
  const onPointerCancel = () => {
    gesture.current.tap = null;
    finish(false);
  };

  const step = (control: Mode, direction: 1 | -1, amount = SNAP_MINUTES) => {
    if (disabled || locked) return;
    const delta = amount * direction;
    const next =
      control === "move"
        ? moveRange(start, end, delta)
        : dragEdge(control, snapTo((control === "start" ? start : end) + delta), start, end);
    onCommit(next.start, next.end);
  };
  const onSliderKey = (control: Mode) => (event: KeyboardEvent) => {
    const keys: Record<string, [1 | -1, number]> = {
      ArrowUp: [1, SNAP_MINUTES],
      ArrowRight: [1, SNAP_MINUTES],
      ArrowDown: [-1, SNAP_MINUTES],
      ArrowLeft: [-1, SNAP_MINUTES],
      PageUp: [1, 60],
      PageDown: [-1, 60],
    };
    const move = keys[event.key];
    if (!move) return;
    event.preventDefault();
    step(control, move[0], move[1]);
  };

  const shown = {
    start: fromMidnight(range.start),
    end: fromMidnight(range.end),
  };
  const marker = ringPoint(fromMidnight(nowMinutes));
  const orbCanvas = (CLOCK.glass * 2) / DAY_ORB_FILL;
  const cursor = adjusting
    ? "grabbing"
    : hover === "segment"
      ? "pointer"
      : hover
        ? "grab"
        : "default";
  const readoutTime =
    reveal >= 1
      ? now
      : new Date(new Date(`${date}T00:00:00`).getTime() + Math.min(1439, Math.max(0, fromMidnight(nowMinutes))) * 60000);

  return (
    <div
      ref={box}
      className={`day-clock${adjusting ? " adjusting" : ""}${locked ? " locked" : ""}`}
      data-testid="day-ring"
    >
      <div
        className="day-orb-host"
        style={{
          left: (CLOCK.center - orbCanvas / 2) * scale,
          top: (CLOCK.center - orbCanvas / 2) * scale,
        }}
      >
        <DayOrb minutes={nowMinutes} size={orbCanvas * scale} />
      </div>
      <div
        className="day-readout"
        style={{
          left: (CLOCK.center - CLOCK.glass) * scale,
          top: (CLOCK.center - CLOCK.glass) * scale,
          width: CLOCK.glass * 2 * scale,
          height: CLOCK.glass * 2 * scale,
          // A soft shade behind the time on bright skies (the model's scrim).
          ['--readout-scrim' as string]: String(dayStateAt(nowMinutes).scrim + 0.12),
        }}
        aria-live="off"
      >
        {adjusting ? (
          <>
            <span className="readout-label">
              {adjusting === "start" ? "Free from" : adjusting === "end" ? "Free until" : "Free time"}
            </span>
            <span className="readout-time">
              {clockLabel(adjusting === "end" ? range.end : range.start)}
            </span>
            <span className="readout-sub">
              {adjusting === "move" ? `until ${clockLabel(range.end)} · ` : ""}
              {formatFreeTime(range.end - range.start)}
            </span>
          </>
        ) : (
          <>
            <span className="readout-time">
              {readoutTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </span>
            <span className="readout-sub">
              {now.toLocaleDateString([], { weekday: "long" })}
            </span>
          </>
        )}
      </div>
      <svg viewBox={`0 0 ${CLOCK.size} ${CLOCK.size}`} aria-hidden="true">
        <circle cx={CLOCK.center} cy={CLOCK.center} r={CLOCK.ring} className="ring-track" strokeWidth={CLOCK.track} fill="none" />
        {Array.from({ length: 24 }, (_, hour) => {
          const inner = ringPoint(hour * 60, CLOCK.ring - CLOCK.track / 2 + 3);
          const outer = ringPoint(hour * 60, CLOCK.ring + CLOCK.track / 2 - 3);
          return (
            <line
              key={hour}
              x1={inner.x}
              y1={inner.y}
              x2={outer.x}
              y2={outer.y}
              className="ring-tick"
              strokeWidth={hour % 6 === 0 ? 1.4 : 0.9}
              opacity={hour % 6 === 0 ? 0.55 : 0.28}
            />
          );
        })}
        {Array.from({ length: 12 }, (_, index) => {
          const hour = index * 2;
          const major = hour % 6 === 0;
          const label = hour === 0 ? "12AM" : hour === 12 ? "12PM" : hour === 6 ? "6AM" : hour === 18 ? "6PM" : String(hour % 12);
          const p = ringPoint(hour * 60, CLOCK.ring + CLOCK.track / 2 + 15);
          return (
            <text key={hour} x={p.x} y={p.y + 3.5} className={major ? "ring-label major" : "ring-label"} textAnchor="middle">
              {label}
            </text>
          );
        })}
        {adjusting && (
          <g className="held-halo">
            {adjusting === "move" ? (
              <path d={arc(shown.start, shown.end, CLOCK.ring)} strokeWidth={CLOCK.track + 14} fill="none" strokeLinecap="round" />
            ) : (
              (() => {
                const p = ringPoint(adjusting === "start" ? shown.start : shown.end, CLOCK.ring);
                return <circle cx={p.x} cy={p.y} r={24} />;
              })()
            )}
          </g>
        )}
        <path
          d={arc(shown.start, shown.end, CLOCK.ring)}
          className="free-arc"
          strokeWidth={CLOCK.track}
          fill="none"
          strokeLinecap="butt"
          strokeOpacity={adjusting ? 1 : locked ? 0.55 : 0.9}
          data-testid="free-time-arc"
        />
        {segments.map((segment) => (
          <path
            key={segment.id}
            d={arc(fromMidnight(segment.from), Math.max(fromMidnight(segment.to), fromMidnight(segment.from) + 0.5), CLOCK.lane)}
            stroke={kindTone(segment.kind)}
            strokeWidth={6}
            fill="none"
            strokeLinecap="round"
            opacity={proposed.length || segment.to <= range.start || segment.from >= range.end ? 0.28 : 0.92}
          >
            <title>{segment.title}</title>
          </path>
        ))}
        {proposed.map((session) => (
          <path
            key={session.id}
            d={arc(fromMidnight(session.from), Math.max(fromMidnight(session.to), fromMidnight(session.from) + 0.5), CLOCK.lane)}
            stroke={`var(--${session.tone})`}
            strokeWidth={6}
            strokeDasharray="5 4"
            fill="none"
            strokeLinecap="round"
            className="proposed-arc"
          />
        ))}
        <circle cx={marker.x} cy={marker.y} r={4.5} className="now-marker" strokeWidth={2} />
        {(["start", "end"] as const).map((key) => {
          const p = ringPoint(key === "start" ? shown.start : shown.end, CLOCK.ring);
          const held = adjusting === key || adjusting === "move";
          return (
            <circle
              key={key}
              cx={p.x}
              cy={p.y}
              r={held ? 12.5 : locked ? 6 : hover === key ? 12 : 11}
              className={locked ? "ring-handle locked" : "ring-handle"}
              strokeWidth={locked ? 0 : 2.5}
            />
          );
        })}
      </svg>
      <div
        className="day-clock-touch"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onPointerLeave={() => !gesture.current.mode && setHover(null)}
      />
      {(
        [
          { key: "start", label: "Free time starts", at: range.start, value: start, text: clockLabel(start) },
          { key: "end", label: "Free time ends", at: range.end, value: end, text: clockLabel(end) },
          { key: "move", label: "Free time block", at: (range.start + range.end) / 2, value: start, text: `${clockLabel(start)} to ${clockLabel(end)}` },
        ] as const
      ).map((control) => {
        const p = ringPoint(control.at, CLOCK.ring);
        return (
          <div
            key={control.key}
            role="slider"
            tabIndex={disabled || locked ? -1 : 0}
            className="day-clock-slider"
            aria-label={control.label}
            aria-valuemin={0}
            aria-valuemax={DAY_MINUTES}
            aria-valuenow={Math.round(control.value)}
            aria-valuetext={control.text}
            aria-disabled={disabled || locked}
            onKeyDown={onSliderKey(control.key)}
            style={{ left: p.x * scale - 22, top: p.y * scale - 22 }}
          />
        );
      })}
      {onToggleLock && (
        <button
          type="button"
          className="day-clock-lock"
          role="switch"
          aria-checked={locked}
          aria-label="Lock clock"
          title={locked ? "Unlock to change your free time" : "Lock so your free time can't change by accident"}
          onClick={onToggleLock}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d={locked ? "M8 11V7a4 4 0 0 1 8 0v4" : "M8 11V7a4 4 0 0 1 7.5-2"} />
          </svg>
        </button>
      )}
    </div>
  );
}
