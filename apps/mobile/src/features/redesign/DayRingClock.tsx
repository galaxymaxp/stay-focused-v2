import type { TodayItem } from "@stay-focused/shared";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, Vibration, View } from "react-native";
import Svg, { Circle, Path, Line } from "react-native-svg";

import { Copy } from "../../design/primitives";
import { contentColors, motion, useTheme } from "../../design/theme";
import {
  clockMinutes,
  ringDragMinutes,
  snapMinutes,
  timelineSegments,
} from "./presentation";

const SIZE = 288,
  CENTER = SIZE / 2,
  RADIUS = 116;
function point(minutes: number) {
  const angle = (minutes / 1440) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CENTER + RADIUS * Math.cos(angle),
    y: CENTER + RADIUS * Math.sin(angle),
  };
}
function arc(from: number, to: number) {
  const a = point(from),
    b = point(Math.min(to, from + 1439.9));
  return `M ${a.x} ${a.y} A ${RADIUS} ${RADIUS} 0 ${to - from > 720 ? 1 : 0} 1 ${b.x} ${b.y}`;
}
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
  const { colors, active } = useTheme();
  const focused = useIsFocused();
  const [now, setNow] = useState(new Date());
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
  const marker = point(now.getHours() * 60 + now.getMinutes());
  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ width: SIZE, height: SIZE }} testID="day-ring">
        <Svg
          width={SIZE}
          height={SIZE}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={colors.surfaceSecondary}
            strokeWidth={17}
            fill="none"
          />
          <Path
            d={arc(start, end)}
            stroke={contentColors.free}
            strokeWidth={17}
            fill="none"
            strokeLinecap="round"
            opacity={0.75}
          />
          {segments.map((segment) => (
            <Path
              key={segment.id}
              d={arc(segment.from, segment.to)}
              stroke={
                segment.kind === "study_session"
                  ? contentColors.study
                  : segment.kind === "calendar_block"
                    ? contentColors.classes
                    : contentColors.other
              }
              strokeWidth={17}
              fill="none"
              strokeLinecap="round"
            />
          ))}
          {Array.from({ length: 24 }, (_, index) => {
            const angle = (index * Math.PI) / 12;
            return (
              <Line
                key={index}
                x1={CENTER + Math.sin(angle) * 94}
                y1={CENTER - Math.cos(angle) * 94}
                x2={CENTER + Math.sin(angle) * (index % 6 ? 99 : 103)}
                y2={CENTER - Math.cos(angle) * (index % 6 ? 99 : 103)}
                stroke={colors.textMuted}
                strokeWidth={index % 6 ? 1 : 2}
              />
            );
          })}
          <Circle
            cx={marker.x}
            cy={marker.y}
            r={4}
            fill={colors.textPrimary}
            stroke={colors.backgroundPrimary}
            strokeWidth={2}
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 64,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Copy size="display">
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </Copy>
          <Copy muted size="caption">
            {now.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Copy>
          <Copy size="caption" color={colors.success}>
            {end - start} min selected
          </Copy>
        </View>
        <RingHandle
          label="Availability start"
          value={start}
          disabled={disabled}
          onChange={(value) => onChange(Math.min(value, end - 15), end)}
          onCommit={(value) => onCommit(Math.min(value, end - 15), end)}
        />
        <RingHandle
          label="Availability end"
          value={end}
          disabled={disabled}
          onChange={(value) => onChange(start, Math.max(value, start + 15))}
          onCommit={(value) => onCommit(start, Math.max(value, start + 15))}
        />
      </View>
      <Copy muted size="caption">
        Hold a ring handle, then drag to set your free time.
      </Copy>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
        }}
      >
        <Copy size="caption">● Study</Copy>
        <Copy color={colors.success} size="caption">
          ○ Free time selection
        </Copy>
        {segments.some((s) => s.kind === "calendar_block") && (
          <Copy size="caption">◷ Classes</Copy>
        )}
      </View>
    </View>
  );
}
function RingHandle({
  label,
  value,
  disabled,
  onChange,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const { colors, reducedMotion } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const current = useRef({
    value,
    onChange,
    onCommit,
    disabled,
    reducedMotion,
  });
  current.current = { value, onChange, onCommit, disabled, reducedMotion };
  const held = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    origin = useRef(point(value)),
    latest = useRef(value);
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      scale.stopAnimation();
    },
    [scale],
  );
  const responder = useMemo(() => {
    const animate = (toValue: number) => {
      if (current.current.reducedMotion) scale.setValue(1);
      else
        Animated.spring(scale, {
          toValue,
          ...motion.spring,
          useNativeDriver: true,
        }).start();
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
          animate(1.16);
        }, 300);
      },
      onPanResponderMove: (_, gesture) => {
        if (!held.current) return;
        const next = ringDragMinutes(
          latest.current,
          clockMinutes(
            origin.current.x - CENTER + gesture.dx,
            origin.current.y - CENTER + gesture.dy,
          ),
        );
        latest.current = next;
        current.current.onChange(next);
      },
      onPanResponderRelease: () => {
        clearTimeout(timer.current);
        animate(1);
        if (held.current) current.current.onCommit(latest.current);
        held.current = false;
      },
      onPanResponderTerminate: () => {
        clearTimeout(timer.current);
        animate(1);
        held.current = false;
      },
    });
  }, [scale]);
  const p = point(value);
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
        left: p.x - 24,
        top: p.y - 24,
        width: 48,
        height: 48,
        alignItems: "center",
        justifyContent: "center",
        transform: [{ scale }],
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.accent,
          borderColor: colors.surfaceElevated,
          borderWidth: 3,
        }}
      />
    </Animated.View>
  );
}
