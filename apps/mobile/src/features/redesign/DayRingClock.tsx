import type { TodayItem } from "@stay-focused/shared";
import { useIsFocused } from "@react-navigation/native";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Sun, Moon } from "lucide-react-native";
import { Animated, PanResponder, Vibration, View } from "react-native";
import Svg, { Circle, Path, Line, Defs, LinearGradient, RadialGradient, Stop, Text as SvgText } from "react-native-svg";

import { Copy } from "../../design/primitives";
import { contentColors, motion, useTheme } from "../../design/theme";
import {
  clockMinutes,
  ringDragMinutes,
  snapMinutes,
  timelineSegments,
} from "./presentation";

const SIZE = 320,
  CENTER = SIZE / 2,
  RADIUS = 126,
  HANDLE_TOUCH_SIZE = 56,
  HANDLE_VISIBLE_SIZE = 34;
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
  const gradientId = useId().replace(/:/g, "");
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
  const markerInner = point(now.getHours() * 60 + now.getMinutes(), 103);
  const daytime = now.getHours() >= 6 && now.getHours() < 18;
  return (
    <View style={{ alignItems: "center", gap: 0 }}>
      <View style={{ width: SIZE, height: SIZE }} testID="day-ring">
        <Svg
          width={SIZE}
          height={SIZE}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Defs>
            <LinearGradient id={`${gradientId}-rim`} x1="0%" y1="0%" x2="90%" y2="100%">
              <Stop offset="0" stopColor={mode === "dark" ? "#505355" : "#DFE3E1"} />
              <Stop offset="0.45" stopColor={mode === "dark" ? "#25282A" : "#F1F0EC"} />
              <Stop offset="1" stopColor={mode === "dark" ? "#444548" : "#CFD6D3"} />
            </LinearGradient>
            <RadialGradient id={`${gradientId}-face`} cx="40%" cy="30%" r="75%">
              <Stop offset="0" stopColor={mode === "dark" ? "#1A1D1E" : "#FFFFFF"} />
              <Stop offset="1" stopColor={colors.backgroundPrimary} />
            </RadialGradient>
            <LinearGradient id={`${gradientId}-free`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0" stopColor="#B4E6D2" /><Stop offset="1" stopColor="#5FAF91" />
            </LinearGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={116} fill={`url(#${gradientId}-face)`} />
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            stroke={`url(#${gradientId}-rim)`}
            strokeWidth={22}
            fill="none"
          />
          <Path
            d={arc(start, end)}
            stroke={`url(#${gradientId}-free)`}
            strokeWidth={22}
            fill="none"
            strokeLinecap="butt"
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
              strokeWidth={22}
              fill="none"
              strokeLinecap="butt"
            />
          ))}
          {Array.from({ length: 96 }, (_, index) => {
            const angle = (index * Math.PI) / 48;
            const major = index % 4 === 0;
            return (
              <Line
                key={index}
                x1={CENTER + Math.sin(angle) * (major ? 98 : 108)}
                y1={CENTER - Math.cos(angle) * (major ? 98 : 108)}
                x2={CENTER + Math.sin(angle) * 112}
                y2={CENTER - Math.cos(angle) * 112}
                stroke={colors.textMuted}
                strokeWidth={major ? 1 : 0.6}
                opacity={major ? 0.8 : 0.35}
              />
            );
          })}
          <Circle cx={CENTER} cy={CENTER} r={137} fill="none" stroke={colors.textMuted} strokeWidth={0.5} opacity={0.25} />
          {[{ label: "12 AM", minutes: 0 }, { label: "6 AM", minutes: 360 }, { label: "12 PM", minutes: 720 }, { label: "6 PM", minutes: 1080 }].map(hour => {
            const p = point(hour.minutes, 146);
            return <SvgText key={hour.label} x={p.x} y={p.y + 4} fontFamily="sans-serif" fontSize={9} fill={colors.textSecondary} textAnchor="middle">{hour.label}</SvgText>;
          })}
          <Line x1={markerInner.x} y1={markerInner.y} x2={marker.x} y2={marker.y} stroke={contentColors.classes} strokeWidth={2} />
          <Circle cx={markerInner.x} cy={markerInner.y} r={3} fill={contentColors.classes} />
          <Circle
            cx={marker.x}
            cy={marker.y}
            r={4}
            fill={contentColors.classes}
            stroke={colors.backgroundPrimary}
            strokeWidth={2}
          />
        </Svg>
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 75,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          {daytime ? <Sun size={23} color={colors.warning} strokeWidth={1.5} /> : <Moon size={23} color={colors.accent} strokeWidth={1.5} />}
          <Copy size="display" style={{ fontSize: 29, lineHeight: 36 }}>
            {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </Copy>
          <Copy color={colors.accent} size="caption">
            {now.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
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
      <Copy size="caption" color={colors.success}>{end - start} min free time · Hold a handle to adjust</Copy>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 12,
          justifyContent: "center",
        }}
      >
        {segments.some((s) => s.kind === "study_session") && <Copy size="caption" color={colors.accent}>Study</Copy>}
        {segments.some((s) => s.kind === "calendar_block") && (
          <Copy size="caption" color={colors.warning}>Classes</Copy>
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
          (clockMinutes(
            origin.current.x - CENTER + gesture.dx,
            origin.current.y - CENTER + gesture.dy,
          ) + 720) % 1440,
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
      <View
        style={{
          width: HANDLE_VISIBLE_SIZE,
          height: HANDLE_VISIBLE_SIZE,
          borderRadius: HANDLE_VISIBLE_SIZE / 2,
          backgroundColor: colors.violet,
          borderColor: colors.backgroundPrimary,
          borderWidth: 3,
          shadowColor: colors.shadow,
          shadowOpacity: 0.18,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      />
    </Animated.View>
  );
}
