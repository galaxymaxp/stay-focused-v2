import type { TodayItem } from "@stay-focused/shared";
import { useIsFocused } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Vibration, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";

import { Copy } from "../../design/primitives";
import { motion, useTheme } from "../../design/theme";
import {
  CLOCK,
  DAY_MINUTES,
  SNAP_MINUTES,
  angleMinutes,
  angularDelta,
  dragEdge,
  followMinutes,
  hitTest,
  moveRange,
  ringPoint,
  snapRange,
  snapTo,
} from "./dayClock";
import { DAY_ORB_FILL, DayOrb } from "./DayOrb";
import { timelineSegments } from "./presentation";

/** "2 h 15 min", "45 min", "3 h". */
export function formatFreeTime(minutes: number) {
  const whole = Math.round(minutes);
  const hours = Math.floor(whole / 60),
    rest = whole % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
function clockLabel(minutes: number) {
  const date = new Date(2000, 0, 1, 0, 0);
  date.setMinutes(Math.round(minutes));
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
function arc(from: number, to: number, radius: number) {
  const a = ringPoint(from, radius),
    b = ringPoint(Math.min(to, from + 1439.9), radius);
  return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${to - from > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

type Mode = "start" | "end" | "move";
type Range = { start: number; end: number };

/**
 * The ends grab at once, so a drag starting on either end always adjusts it.
 * The middle of the block moves both ends together after a short still hold,
 * so a scroll that happens to start on the arc still scrolls the page.
 */
const MOVE_HOLD_MS = 240;
const MOVE_SLOP = 8;
const SNAP_MS = 180;
const TWEEN_MS = 260;

const frame: (callback: (time: number) => void) => unknown =
  typeof globalThis.requestAnimationFrame === "function"
    ? (callback) => globalThis.requestAnimationFrame(callback)
    : (callback) => setTimeout(() => callback(Date.now()), 16);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Short eased transition between two values, driven per frame only while it
 * runs. Used for the release snap and for schedule arcs that change.
 */
function tween(from: number[], to: number[], duration: number, onFrame: (values: number[]) => void, onDone?: () => void) {
  const begin = Date.now();
  let stopped = false;
  const step = () => {
    if (stopped) return;
    const t = Math.min(1, (Date.now() - begin) / duration);
    const k = easeOut(t);
    onFrame(from.map((value, index) => value + (to[index]! - value) * k));
    if (t < 1) frame(step);
    else onDone?.();
  };
  frame(step);
  return () => {
    stopped = true;
  };
}

type Segment = ReturnType<typeof timelineSegments>[number];

/** Schedule arcs glide to new times instead of jumping; new ones grow from their start. */
function useGlidingSegments(segments: readonly Segment[], reducedMotion: boolean) {
  const [shown, setShown] = useState(segments);
  const previous = useRef(segments);
  useEffect(() => {
    const before = new Map(previous.current.map((segment) => [segment.id, segment]));
    previous.current = segments;
    if (reducedMotion) {
      setShown(segments);
      return;
    }
    const from = segments.flatMap((segment) => {
      const old = before.get(segment.id);
      return old ? [old.from, old.to] : [segment.from, segment.from];
    });
    const to = segments.flatMap((segment) => [segment.from, segment.to]);
    if (from.every((value, index) => value === to[index])) {
      setShown(segments);
      return;
    }
    return tween(from, to, TWEEN_MS, (values) =>
      setShown(segments.map((segment, index) => ({ ...segment, from: values[index * 2]!, to: values[index * 2 + 1]! }))),
    );
  }, [reducedMotion, segments]);
  return shown;
}

/**
 * Today's day clock. A glass body holds the current state of the day; around
 * it, the schedule ring shows free time (the accent arc) and scheduled items
 * (the thin inner lane). Press and hold anywhere near a handle to move that
 * edge, or on the middle of the free-time arc to move the whole block. While
 * the finger is down the arc follows it continuously; on release it snaps to
 * the nearest fifteen minutes and commits.
 */
export function DayRingClock({
  date,
  timeline,
  start,
  end,
  onChange,
  onCommit,
  onAdjustingChange,
  disabled = false,
  proposed = [],
}: {
  /** A plan preview drawn as dashed arcs on the schedule lane until applied. */
  proposed?: readonly { readonly id: string; readonly from: number; readonly to: number; readonly color: string }[];
  date: string;
  timeline: readonly TodayItem[];
  start: number;
  end: number;
  /** Accessible step adjustments (no gesture) report here before committing. */
  onChange: (start: number, end: number) => void;
  onCommit: (start: number, end: number) => void;
  /** True while the ring is held, so the page can pause scrolling and pull-to-refresh. */
  onAdjustingChange?: (adjusting: boolean) => void;
  disabled?: boolean;
}) {
  const { colors, active, mode: theme, reducedMotion } = useTheme();
  const focused = useIsFocused();
  const { width: windowWidth } = useWindowDimensions();
  const size = Math.min(CLOCK.size, Math.max(260, windowWidth - 40));
  const scale = size / CLOCK.size;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active || !focused) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [active, focused]);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const [draft, setDraft] = useState<Range | null>(null);
  const [adjusting, setAdjusting] = useState<Mode | null>(null);
  const range = draft ?? { start, end };
  const lift = useRef(new Animated.Value(0)).current;

  const segments = useGlidingSegments(useMemo(() => timelineSegments(timeline, date), [timeline, date]), reducedMotion);

  const latest = useRef({ start, end, disabled, reducedMotion, scale, onCommit, onAdjustingChange });
  latest.current = { start, end, disabled, reducedMotion, scale, onCommit, onAdjustingChange };
  const gesture = useRef({
    mode: null as Mode | null,
    held: false,
    origin: { x: 0, y: 0 },
    angle: 0,
    moved: 0,
    base: { start: 0, end: 0 },
    value: { start: 0, end: 0 },
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
    pending: null as Range | null,
    scheduled: false,
    stopSnap: null as null | (() => void),
  });

  useEffect(() => () => {
    clearTimeout(gesture.current.timer);
    gesture.current.stopSnap?.();
  }, []);

  // Props caught up with a committed value: the local draft is no longer needed.
  useEffect(() => {
    if (!gesture.current.held && !gesture.current.stopSnap) setDraft(null);
  }, [start, end]);

  /** One state update per frame at most, however fast touch events arrive. */
  const publish = useCallback((value: Range) => {
    const state = gesture.current;
    state.pending = value;
    if (state.scheduled) return;
    state.scheduled = true;
    frame(() => {
      state.scheduled = false;
      if (state.pending) setDraft(state.pending);
    });
  }, []);

  const responder = useMemo(() => {
    const local = (event: GestureResponderEvent) => {
      const { locationX, locationY } = event.nativeEvent;
      const k = latest.current.scale;
      return { x: locationX / k, y: locationY / k };
    };
    const activate = () => {
      const state = gesture.current;
      if (state.held || !state.mode) return;
      state.held = true;
      Vibration.vibrate(state.mode === "move" ? 12 : 6);
      setAdjusting(state.mode);
      latest.current.onAdjustingChange?.(true);
      if (!latest.current.reducedMotion) {
        Animated.spring(lift, { toValue: 1, ...motion.spring, useNativeDriver: true }).start();
      } else lift.setValue(1);
    };
    const finish = (commit: boolean) => {
      const state = gesture.current;
      clearTimeout(state.timer);
      const wasHeld = state.held;
      state.held = false;
      const mode = state.mode;
      if (mode) setAdjusting(null);
      state.mode = null;
      if (!latest.current.reducedMotion) {
        Animated.spring(lift, { toValue: 0, ...motion.spring, useNativeDriver: true }).start();
      } else lift.setValue(0);
      if (!wasHeld || !mode) return;
      latest.current.onAdjustingChange?.(false);
      state.pending = null;
      const released = commit ? state.value : state.base;
      const target = commit ? snapRange(released.start, released.end, mode) : state.base;
      const done = () => {
        state.stopSnap = null;
        if (commit) {
          Vibration.vibrate(8);
          latest.current.onCommit(target.start, target.end);
        } else setDraft(null);
      };
      if (latest.current.reducedMotion) {
        setDraft(target);
        done();
        return;
      }
      state.stopSnap?.();
      state.stopSnap = tween([released.start, released.end], [target.start, target.end], SNAP_MS, ([a, b]) => setDraft({ start: a!, end: b! }), done);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: (event) => {
        const { disabled: off, start: from, end: to } = latest.current;
        if (off) return false;
        const point = local(event);
        return hitTest(point.x, point.y, from, to) !== null;
      },
      // An end owns its touch immediately; the middle lets the page scroll until held.
      onShouldBlockNativeResponder: () => gesture.current.mode !== "move",
      onPanResponderGrant: (event) => {
        const state = gesture.current;
        state.stopSnap?.();
        state.stopSnap = null;
        const point = local(event);
        const { start: from, end: to } = latest.current;
        state.mode = hitTest(point.x, point.y, from, to);
        state.held = false;
        state.origin = point;
        state.angle = angleMinutes(point.x - CLOCK.center, point.y - CLOCK.center);
        state.moved = 0;
        state.base = { start: from, end: to };
        state.value = { start: from, end: to };
        clearTimeout(state.timer);
        if (state.mode === "move") state.timer = setTimeout(activate, MOVE_HOLD_MS);
        else if (state.mode) activate();
      },
      onPanResponderMove: (_event, move) => {
        const state = gesture.current;
        if (!state.mode) return;
        const k = latest.current.scale;
        if (!state.held) {
          const distance = Math.hypot(move.dx, move.dy);
          if (distance <= MOVE_SLOP) return;
          // Moving before the hold completes is a page scroll, not a block move.
          clearTimeout(state.timer);
          state.mode = null;
          return;
        }
        const x = state.origin.x + move.dx / k;
        const y = state.origin.y + move.dy / k;
        const angle = angleMinutes(x - CLOCK.center, y - CLOCK.center);
        const current = state.value;
        let next: Range;
        if (state.mode === "move") {
          state.moved += angularDelta(state.angle, angle);
          state.angle = angle;
          next = moveRange(state.base.start, state.base.end, state.moved);
        } else {
          const edge = state.mode;
          next = dragEdge(edge, followMinutes(edge === "start" ? current.start : current.end, angle), current.start, current.end);
        }
        state.value = next;
        publish(next);
      },
      onPanResponderTerminationRequest: () => !gesture.current.held,
      onPanResponderRelease: () => finish(true),
      onPanResponderTerminate: () => finish(false),
    });
  }, [lift, publish]);

  const step = (edge: Mode, direction: 1 | -1) => {
    if (disabled) return;
    const delta = SNAP_MINUTES * direction;
    const next =
      edge === "move"
        ? moveRange(start, end, delta)
        : dragEdge(edge, snapTo((edge === "start" ? start : end) + delta), start, end);
    onChange(next.start, next.end);
    onCommit(next.start, next.end);
  };

  const track = theme === "dark" ? "rgba(255,255,255,0.09)" : "rgba(20,24,40,0.07)";
  const handleFill = theme === "dark" ? colors.surfaceElevated : "#FFFFFF";
  const segmentColor = (kind: TodayItem["kind"]) =>
    kind === "study_session" ? colors.blue : kind === "calendar_block" ? colors.orange : colors.violet;
  const marker = ringPoint(nowMinutes);
  const middle = (range.start + range.end) / 2;
  const orbCanvas = (CLOCK.glass * 2) / DAY_ORB_FILL;
  const handles: { key: Mode; at: number }[] = [
    { key: "start", at: range.start },
    { key: "end", at: range.end },
  ];

  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: size, height: size }} testID="day-ring">
        <View pointerEvents="none" style={{ position: "absolute", left: (CLOCK.center - orbCanvas / 2) * scale, top: (CLOCK.center - orbCanvas / 2) * scale }}>
          <DayOrb minutes={nowMinutes} size={orbCanvas * scale} mode={theme} reducedMotion={reducedMotion} live={focused && active} />
        </View>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: (CLOCK.center - CLOCK.glass) * scale,
            top: (CLOCK.center - CLOCK.glass) * scale,
            width: CLOCK.glass * 2 * scale,
            height: CLOCK.glass * 2 * scale,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <CenterReadout mode={adjusting} range={range} now={now} />
        </View>
        <Svg
          width={size}
          height={size}
          viewBox={`0 0 ${CLOCK.size} ${CLOCK.size}`}
          style={{ position: "absolute", top: 0, left: 0 }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Circle cx={CLOCK.center} cy={CLOCK.center} r={CLOCK.ring} stroke={track} strokeWidth={CLOCK.track} fill="none" />
          {Array.from({ length: 24 }, (_, hour) => {
            const inner = ringPoint(hour * 60, CLOCK.ring - CLOCK.track / 2 + 3);
            const outer = ringPoint(hour * 60, CLOCK.ring + CLOCK.track / 2 - 3);
            return <Line key={hour} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke={colors.textMuted} strokeWidth={hour % 6 === 0 ? 1.4 : 0.9} opacity={hour % 6 === 0 ? 0.55 : 0.28} />;
          })}
          {Array.from({ length: 12 }, (_, index) => {
            const hour = index * 2;
            const major = hour % 6 === 0;
            const label = hour === 0 ? "12AM" : hour === 12 ? "12PM" : hour === 6 ? "6AM" : hour === 18 ? "6PM" : String(hour % 12);
            // Far enough out that a handle parked on an hour never covers its label.
            const p = ringPoint(hour * 60, CLOCK.ring + CLOCK.track / 2 + 15);
            return (
              <SvgText key={hour} x={p.x} y={p.y + 3.5} fontFamily="sans-serif" fontSize={major ? 9.5 : 9} fontWeight={major ? "600" : "400"} fill={major ? colors.textSecondary : colors.textMuted} textAnchor="middle">
                {label}
              </SvgText>
            );
          })}
          <Path d={arc(range.start, range.end, CLOCK.ring)} stroke={colors.accent} strokeOpacity={adjusting ? 1 : 0.9} strokeWidth={CLOCK.track} fill="none" strokeLinecap="butt" testID="free-time-arc" />
          {segments.map((segment) => (
            <Path key={segment.id} d={arc(segment.from, Math.max(segment.to, segment.from + 0.5), CLOCK.lane)} stroke={segmentColor(segment.kind)} strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.92} />
          ))}
          {proposed.map((session) => (
            <Path key={session.id} d={arc(session.from, Math.max(session.to, session.from + 0.5), CLOCK.lane)} stroke={session.color} strokeWidth={6} strokeDasharray="5 4" fill="none" strokeLinecap="round" testID="proposed-arc" />
          ))}
          <Circle cx={marker.x} cy={marker.y} r={4.5} fill={colors.textPrimary} stroke={handleFill} strokeWidth={2} testID="now-marker" />
          {handles.map((handle) => {
            const p = ringPoint(handle.at, CLOCK.ring);
            const held = adjusting === handle.key || adjusting === "move";
            return (
              <Circle key={handle.key} cx={p.x} cy={p.y} r={held ? 12.5 : 11} fill={handleFill} stroke={colors.accent} strokeWidth={2.5} />
            );
          })}
        </Svg>
        {adjusting ? <HeldHalo range={range} mode={adjusting} scale={scale} lift={lift} color={colors.accent} /> : null}
        {/* Screen readers adjust with steps instead of a drag. */}
        {(
          [
            { key: "start", label: "Availability start", at: range.start, value: start },
            { key: "end", label: "Availability end", at: range.end, value: end },
            { key: "move", label: "Free time block", at: middle, value: start },
          ] as const
        ).map((control) => {
          const p = ringPoint(control.at, CLOCK.ring);
          const text = control.key === "move" ? `${clockLabel(start)} to ${clockLabel(end)}` : clockLabel(control.value);
          return (
            <View
              key={control.key}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={control.label}
              accessibilityHint={control.key === "move" ? "Swipe up or down to move the whole block by fifteen minutes." : "Swipe up or down to adjust by fifteen minutes."}
              accessibilityValue={{ min: 0, max: DAY_MINUTES, now: Math.round(control.value), text }}
              accessibilityState={{ disabled }}
              accessibilityActions={[
                { name: "increment", label: "Fifteen minutes later" },
                { name: "decrement", label: "Fifteen minutes earlier" },
              ]}
              onAccessibilityAction={(event) => step(control.key, event.nativeEvent.actionName === "increment" ? 1 : -1)}
              style={{ position: "absolute", left: p.x * scale - 24, top: p.y * scale - 24, width: 48, height: 48 }}
            />
          );
        })}
        <View
          {...responder.panHandlers}
          testID="day-ring-touch"
          importantForAccessibility="no"
          style={{ position: "absolute", top: 0, left: 0, width: size, height: size }}
        />
      </View>
      <Copy size="h3" style={{ fontVariant: ["tabular-nums"] }}>{formatFreeTime(range.end - range.start)} free</Copy>
      <Copy muted size="caption" style={{ fontVariant: ["tabular-nums"] }}>
        {clockLabel(range.start)} – {clockLabel(range.end)} · Drag an end, or hold the middle to move
      </Copy>
      {segments.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 2 }}>
          {segments.some((s) => s.kind === "study_session") && <Legend color={colors.blue} label="Planned work" />}
          {segments.some((s) => s.kind === "calendar_block") && <Legend color={colors.orange} label="Classes" />}
          {segments.some((s) => s.kind !== "study_session" && s.kind !== "calendar_block") && <Legend color={colors.violet} label="Tasks" />}
        </View>
      ) : null}
    </View>
  );
}

/** Soft accent halo on whatever is being held: a handle, or the whole arc. */
function HeldHalo({ range, mode, scale, lift, color }: { range: Range; mode: Mode; scale: number; lift: Animated.Value; color: string }) {
  const size = CLOCK.size * scale;
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, width: size, height: size, opacity: lift }}>
      <Svg width={size} height={size} viewBox={`0 0 ${CLOCK.size} ${CLOCK.size}`}>
        {mode === "move" ? (
          <Path d={arc(range.start, range.end, CLOCK.ring)} stroke={color} strokeOpacity={0.18} strokeWidth={CLOCK.track + 14} fill="none" strokeLinecap="round" />
        ) : (
          (() => {
            const p = ringPoint(mode === "start" ? range.start : range.end, CLOCK.ring);
            return <Circle cx={p.x} cy={p.y} r={24} fill={color} opacity={0.16} />;
          })()
        )}
      </Svg>
    </Animated.View>
  );
}

function CenterReadout({ mode, range, now }: { mode: Mode | null; range: Range; now: Date }) {
  const shadow = { textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } };
  if (mode) {
    const label = mode === "start" ? "Free from" : mode === "end" ? "Free until" : "Free time";
    const time = mode === "end" ? range.end : range.start;
    return (
      <>
        <Copy color="rgba(255,255,255,0.86)" size="caption" style={{ ...shadow, letterSpacing: 0.6, textTransform: "uppercase", fontWeight: "600" }}>{label}</Copy>
        <Copy color="#FFFFFF" size="display" style={{ ...shadow, fontSize: 30, lineHeight: 37, fontVariant: ["tabular-nums"] }}>
          {mode === "move" ? `${clockLabel(range.start)}` : clockLabel(time)}
        </Copy>
        <Copy color="rgba(255,255,255,0.86)" size="caption" style={{ ...shadow, fontVariant: ["tabular-nums"] }}>
          {mode === "move" ? `until ${clockLabel(range.end)} · ` : ""}{formatFreeTime(range.end - range.start)}
        </Copy>
      </>
    );
  }
  return (
    <>
      <Copy color="#FFFFFF" size="display" style={{ ...shadow, fontSize: 32, lineHeight: 39, fontVariant: ["tabular-nums"] }}>
        {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
      </Copy>
      <Copy color="rgba(255,255,255,0.86)" size="caption" style={{ ...shadow, fontWeight: "500" }}>
        {now.toLocaleDateString([], { weekday: "long" })}
      </Copy>
    </>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ width: 12, height: 4, borderRadius: 2, backgroundColor: color }} />
      <Copy muted size="caption">{label}</Copy>
    </View>
  );
}
