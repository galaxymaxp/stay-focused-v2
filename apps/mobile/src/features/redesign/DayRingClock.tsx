import type { TodayItem } from "@stay-focused/shared";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react-native";
import { Animated, PanResponder, Vibration, View } from "react-native";
import Svg, { Circle, Path, Line, Text as SvgText } from "react-native-svg";

import { Copy } from "../../design/primitives";
import { motion, useTheme } from "../../design/theme";
import {
  clockMinutes,
  ringDragMinutes,
  snapMinutes,
  timelineSegments,
} from "./presentation";

const SIZE = 320,
  CENTER = SIZE / 2,
  RADIUS = 126,
  TRACK = 22,
  HANDLE_TOUCH_SIZE = 56,
  HANDLE_VISIBLE_SIZE = 28;
function point(minutes: number, radius = RADIUS) {
  const angle = (minutes / 1440) * Math.PI * 2 + Math.PI / 2;
  return {
    x: CENTER + radius * Math.cos(angle),
    y: CENTER + radius * Math.sin(angle),
  };
}
function arc(from: number, to: number) {
  const a = point(from),
    b = point(Math.min(to, from + 1439.9));
  return `M ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 ${to - from > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
/** "2 h 15 min", "45 min", "3 h". */
export function formatFreeTime(minutes: number) {
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
function clockLabel(minutes: number) {
  const date = new Date(2000, 0, 1, 0, 0);
  date.setMinutes(minutes);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/**
 * The day as a 24-hour ring. Free time is the one filled arc, in the theme
 * accent, so it reads as "yours" without competing colors. Scheduled items sit
 * as a thin inner line; "now" is a small dot on the track. Holding a handle
 * lifts it, shows its time in the center, and releasing commits.
 */
export function DayRingClock({
  date,
  timeline,
  start,
  end,
  onChange,
  onCommit,
  disabled = false,
}: {
  date: string;
  timeline: readonly TodayItem[];
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
  onCommit: (start: number, end: number) => void;
  disabled?: boolean;
}) {
  const { colors, active, mode } = useTheme();
  const focused = useIsFocused();
  const [now, setNow] = useState(new Date());
  const [adjusting, setAdjusting] = useState<"start" | "end" | null>(null);
  useEffect(() => {
    if (!active || !focused) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [active, focused]);
  const segments = useMemo(
    () => timelineSegments(timeline, date),
    [timeline, date],
  );
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const marker = point(nowMinutes);
  const daytime = now.getHours() >= 6 && now.getHours() < 18;
  const track = mode === "dark" ? colors.surfaceSecondary : "#E8E7E3";
  const segmentColor = (kind: TodayItem["kind"]) =>
    kind === "study_session" ? colors.blue : kind === "calendar_block" ? colors.orange : colors.violet;
  return (
    <View style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: SIZE, height: SIZE }} testID="day-ring">
        <Svg
          width={SIZE}
          height={SIZE}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Circle cx={CENTER} cy={CENTER} r={RADIUS - TRACK / 2 - 1} fill={mode === "dark" ? colors.surfacePrimary : colors.surfaceElevated} />
          <Circle cx={CENTER} cy={CENTER} r={RADIUS} stroke={track} strokeWidth={TRACK} fill="none" />
          <Path
            d={arc(start, end)}
            stroke={colors.accent}
            strokeOpacity={adjusting ? 1 : 0.88}
            strokeWidth={TRACK}
            fill="none"
            strokeLinecap="butt"
            testID="free-time-arc"
          />
          {segments.map((segment) => (
            <Path
              key={segment.id}
              d={arc(segment.from, segment.to)}
              stroke={segmentColor(segment.kind)}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
          {Array.from({ length: 24 }, (_, hour) => {
            const angle = (hour * Math.PI) / 12;
            const major = hour % 6 === 0;
            const inner = RADIUS - TRACK / 2 - (major ? 9 : 5);
            const outer = RADIUS - TRACK / 2 - 2;
            return (
              <Line
                key={hour}
                x1={CENTER + Math.sin(angle) * inner}
                y1={CENTER - Math.cos(angle) * inner}
                x2={CENTER + Math.sin(angle) * outer}
                y2={CENTER - Math.cos(angle) * outer}
                stroke={colors.textMuted}
                strokeWidth={major ? 1.2 : 0.8}
                opacity={major ? 0.7 : 0.35}
              />
            );
          })}
          {[{ label: "12 AM", minutes: 0 }, { label: "6 AM", minutes: 360 }, { label: "12 PM", minutes: 720 }, { label: "6 PM", minutes: 1080 }].map(hour => {
            const p = point(hour.minutes, RADIUS + 22);
            return <SvgText key={hour.label} x={p.x} y={p.y + 4} fontFamily="sans-serif" fontSize={10} fill={colors.textMuted} textAnchor="middle">{hour.label}</SvgText>;
          })}
          <Circle cx={marker.x} cy={marker.y} r={5} fill={colors.textPrimary} stroke={mode === "dark" ? colors.surfacePrimary : colors.surfaceElevated} strokeWidth={2} testID="now-marker" />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 75,
            justifyContent: "center",
            alignItems: "center",
            gap: 2,
          }}
        >
          {adjusting ? (
            <>
              <Copy muted size="caption" style={{ letterSpacing: 0.6, textTransform: "uppercase", fontWeight: "600" }}>{adjusting === "start" ? "Free from" : "Free until"}</Copy>
              <Copy size="display" style={{ fontSize: 30, lineHeight: 37, fontVariant: ["tabular-nums"] }}>{clockLabel(adjusting === "start" ? start : end)}</Copy>
              <Copy color={colors.textSecondary} size="caption" style={{ fontVariant: ["tabular-nums"] }}>{formatFreeTime(end - start)}</Copy>
            </>
          ) : (
            <>
              {daytime ? <Sun size={20} color={colors.textMuted} strokeWidth={1.5} /> : <Moon size={20} color={colors.textMuted} strokeWidth={1.5} />}
              <Copy size="display" style={{ fontSize: 30, lineHeight: 37, fontVariant: ["tabular-nums"] }}>
                {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </Copy>
              <Copy color={colors.textSecondary} size="caption">
                {now.toLocaleDateString([], {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </Copy>
            </>
          )}
        </View>
        <RingHandle
          label="Availability start"
          value={start}
          disabled={disabled}
          onHoldChange={(held) => setAdjusting(held ? "start" : null)}
          onChange={(value) => onChange(Math.min(value, end - 15), end)}
          onCommit={(value) => onCommit(Math.min(value, end - 15), end)}
        />
        <RingHandle
          label="Availability end"
          value={end}
          disabled={disabled}
          onHoldChange={(held) => setAdjusting(held ? "end" : null)}
          onChange={(value) => onChange(start, Math.max(value, start + 15))}
          onCommit={(value) => onCommit(start, Math.max(value, start + 15))}
        />
      </View>
      <Copy size="h3" style={{ fontVariant: ["tabular-nums"] }}>{formatFreeTime(end - start)} free</Copy>
      <Copy muted size="caption" style={{ fontVariant: ["tabular-nums"] }}>
        {clockLabel(start)} – {clockLabel(end)} · Hold a handle to adjust
      </Copy>
      {segments.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, justifyContent: "center", marginTop: 2 }}>
          {segments.some((s) => s.kind === "study_session") && <Legend color={colors.blue} label="Study" />}
          {segments.some((s) => s.kind === "calendar_block") && <Legend color={colors.orange} label="Classes" />}
          {segments.some((s) => s.kind !== "study_session" && s.kind !== "calendar_block") && <Legend color={colors.violet} label="Other" />}
        </View>
      ) : null}
    </View>
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
function RingHandle({
  label,
  value,
  disabled,
  onHoldChange,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onHoldChange?: (held: boolean) => void;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const { colors, mode, reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const halo = useRef(new Animated.Value(0)).current;
  const current = useRef({
    value,
    onChange,
    onCommit,
    onHoldChange,
    disabled,
    reducedMotion,
  });
  current.current = { value, onChange, onCommit, onHoldChange, disabled, reducedMotion };
  const held = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    origin = useRef(point(value)),
    latest = useRef(value);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      scale.stopAnimation();
      halo.stopAnimation();
    },
    [halo, scale],
  );
  const responder = useMemo(() => {
    const animate = (lifted: boolean) => {
      if (current.current.reducedMotion) {
        scale.setValue(1);
        halo.setValue(lifted ? 1 : 0);
        return;
      }
      Animated.parallel([
        Animated.spring(scale, { toValue: lifted ? 1.14 : 1, ...motion.spring, useNativeDriver: true }),
        Animated.timing(halo, { toValue: lifted ? 1 : 0, duration: lifted ? motion.small : motion.normal, useNativeDriver: true }),
      ]).start();
    };
    const release = (commit: boolean) => {
      clearTimeout(timer.current);
      animate(false);
      if (held.current) {
        if (commit) current.current.onCommit(latest.current);
        current.current.onHoldChange?.(false);
      }
      held.current = false;
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => !current.current.disabled,
      onPanResponderGrant: () => {
        origin.current = point(current.current.value);
        latest.current = current.current.value;
        held.current = false;
        timer.current = setTimeout(() => {
          held.current = true;
          Vibration.vibrate(10);
          animate(true);
          current.current.onHoldChange?.(true);
        }, 300);
      },
      onPanResponderMove: (_, gesture) => {
        if (!held.current) return;
        const next = ringDragMinutes(
          latest.current,
          (clockMinutes(
            origin.current.x - CENTER + gesture.dx,
            origin.current.y - CENTER + gesture.dy,
          ) + 720) % 1440,
        );
        latest.current = next;
        current.current.onChange(next);
      },
      onPanResponderRelease: () => release(true),
      onPanResponderTerminate: () => release(false),
    });
  }, [halo, scale]);
  const p = point(value);
  const surface = mode === "dark" ? colors.surfaceElevated : "#FFFFFF";
  return (
    <Animated.View
      {...responder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityHint="Hold and drag, or swipe up and down to adjust by fifteen minutes."
      accessibilityValue={{
        min: 0,
        max: 1440,
        now: value,
        text: `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`,
      }}
      accessibilityState={{ disabled }}
      accessibilityActions={[
        { name: "increment", label: "Fifteen minutes later" },
        { name: "decrement", label: "Fifteen minutes earlier" },
      ]}
      onAccessibilityAction={(event) => {
        if (disabled) return;
        const next = snapMinutes(
          value + (event.nativeEvent.actionName === "increment" ? 15 : -15),
        );
        onChange(next);
        onCommit(next);
      }}
      style={{
        position: "absolute",
        left: p.x - HANDLE_TOUCH_SIZE / 2,
        top: p.y - HANDLE_TOUCH_SIZE / 2,
        width: HANDLE_TOUCH_SIZE,
        height: HANDLE_TOUCH_SIZE,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 4,
        elevation: 4,
        transform: [{ scale }],
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: HANDLE_VISIBLE_SIZE + 18,
          height: HANDLE_VISIBLE_SIZE + 18,
          borderRadius: (HANDLE_VISIBLE_SIZE + 18) / 2,
          backgroundColor: colors.accent,
          opacity: Animated.multiply(halo, 0.16),
        }}
      />
      <View
        style={{
          width: HANDLE_VISIBLE_SIZE,
          height: HANDLE_VISIBLE_SIZE,
          borderRadius: HANDLE_VISIBLE_SIZE / 2,
          backgroundColor: surface,
          borderColor: colors.accent,
          borderWidth: 2.5,
          shadowColor: "#000",
          shadowOpacity: mode === "dark" ? 0.4 : 0.16,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      />
    </Animated.View>
  );
}
