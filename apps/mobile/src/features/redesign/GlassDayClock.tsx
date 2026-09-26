import { memo, useEffect, useId, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, Ellipse, Line, LinearGradient, Path, RadialGradient, Rect, Stop } from "react-native-svg";

import { useTheme } from "../../design/theme";
import { CLOCK, HORIZON_Y, dayStateAt, type DayState } from "./dayClock";

/** Glass diameter in its own drawing units. */
const D = CLOCK.glass * 2;
const R = CLOCK.glass;
const HORIZON = R + HORIZON_Y * R;

/** Fixed, sparse star field in the upper sky (restrained: no twinkling particles). */
const STARS: readonly (readonly [number, number, number])[] = [
  [52, 46, 0.9], [78, 30, 0.6], [104, 40, 0.8], [138, 28, 0.7], [160, 54, 0.9], [44, 78, 0.6], [124, 64, 0.5],
  [176, 88, 0.6], [30, 104, 0.5], [92, 62, 0.4], [148, 96, 0.4], [66, 100, 0.5], [118, 22, 0.5], [186, 116, 0.4],
];

/**
 * The Today clock's glass body. The current state of the day (sky, sun or
 * moon, horizon, stars) is painted inside the glass and clipped to it; the
 * glass itself adds depth, rim light, a soft sheen and slight refraction at
 * the edge. Light from the sky spills onto the page around the clock.
 *
 * Only native-driver transforms and opacity move continuously (a slow haze
 * drift, the sheen, the glow); the sky itself re-renders only when the minute
 * changes, and never while the ring is being dragged.
 */
export const GlassDayClock = memo(function GlassDayClock({
  minutes,
  scale,
  parallax,
}: {
  /** Minute of the day, already rounded by the caller. */
  minutes: number;
  /** Design-to-screen scale. */
  scale: number;
  /** Small offset applied to the sheen while the ring is being dragged. */
  parallax: Animated.ValueXY;
}) {
  const { mode, reducedMotion, active } = useTheme();
  const state = useMemo(() => dayStateAt(minutes), [minutes]);
  // Gradient ids are unique per clock (on web every SVG shares one document).
  const p = `glass${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const size = D * scale;
  const drift = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reducedMotion || !active) {
      drift.setValue(0);
      sheen.setValue(0);
      glow.setValue(1);
      return;
    }
    const ease = Easing.inOut(Easing.sin);
    const loops = [
      Animated.loop(Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 26000, easing: ease, useNativeDriver: true }),
        Animated.timing(drift, { toValue: -1, duration: 30000, easing: ease, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 14000, easing: ease, useNativeDriver: true }),
      ])),
      Animated.loop(Animated.sequence([
        Animated.timing(sheen, { toValue: 1, duration: 21000, easing: ease, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: -1, duration: 25000, easing: ease, useNativeDriver: true }),
        Animated.timing(sheen, { toValue: 0, duration: 12000, easing: ease, useNativeDriver: true }),
      ])),
      // Irregular, shallow wander rather than a pulse.
      Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 0.9, duration: 9000, easing: ease, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.98, duration: 7000, easing: ease, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0.93, duration: 11000, easing: ease, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 1, duration: 8000, easing: ease, useNativeDriver: true }),
      ])),
    ];
    loops.forEach((loop) => loop.start());
    return () => loops.forEach((loop) => loop.stop());
  }, [active, drift, glow, reducedMotion, sheen]);

  return (
    <>
      <ClockGlow p={p} state={state} scale={scale} opacity={glow} dark={mode === "dark"} />
      <View
        style={{
          position: "absolute",
          left: (CLOCK.center - R) * scale,
          top: (CLOCK.center - R) * scale,
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: "hidden",
          backgroundColor: state.top,
        }}
      >
        <Sky p={p} state={state} size={size} />
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", top: 0, left: 0, width: size, height: size, transform: [{ translateX: drift.interpolate({ inputRange: [-1, 1], outputRange: [-9 * scale, 9 * scale] }) }] }}
        >
          <Haze p={p} night={state.night} size={size} />
        </Animated.View>
        <GlassOptics p={p} size={size} dark={mode === "dark"} />
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            transform: [
              { translateX: parallax.x },
              { translateY: parallax.y },
              { rotate: sheen.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] }) },
            ],
          }}
        >
          <Sheen p={p} size={size} />
        </Animated.View>
        <Rim p={p} size={size} dark={mode === "dark"} />
      </View>
    </>
  );
});

/**
 * Light from the glass on the surrounding page: a soft, low-saturation halo in
 * the sky's own color, strongest right at the glass and gone well before the
 * edge of the clock area. It sits under the schedule ring.
 */
function ClockGlow({ p, state, scale, opacity, dark }: { p: string; state: DayState; scale: number; opacity: Animated.Value; dark: boolean }) {
  const extent = CLOCK.size * 1.36;
  const px = extent * scale;
  // Small and realistic: never neon, never competing with text.
  const strength = dark ? 0.26 : 0.2;
  const inner = R / (extent / 2);
  return (
    <Animated.View
      pointerEvents="none"
      style={{ position: "absolute", left: (CLOCK.center - extent / 2) * scale, top: (CLOCK.center - extent / 2) * scale, width: px, height: px, opacity }}
    >
      <Svg width={px} height={px} viewBox={`0 0 ${extent} ${extent}`}>
        <Defs>
          <RadialGradient id={`${p}clockGlow`} cx="50%" cy="50%" r="50%">
            <Stop offset={0} stopColor={state.glow} stopOpacity={strength} />
            <Stop offset={inner} stopColor={state.glow} stopOpacity={strength} />
            <Stop offset={inner + 0.12} stopColor={state.glow} stopOpacity={strength * 0.42} />
            <Stop offset={inner + 0.3} stopColor={state.glow} stopOpacity={strength * 0.12} />
            <Stop offset={1} stopColor={state.glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={extent / 2} cy={extent / 2} r={extent / 2} fill={`url(#${p}clockGlow)`} />
      </Svg>
    </Animated.View>
  );
}

function Sky({ p, state, size }: { p: string; state: DayState; size: number }) {
  const { body } = state;
  const bx = R + body.x * R;
  const by = R + body.y * R;
  const sun = body.kind === "sun";
  const lowSun = sun ? 1 - body.altitude : 0;
  const sunCore = lowSun > 0.7 ? "#FFD39A" : "#FFF6DC";
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} style={{ position: "absolute" }}>
      <Defs>
        <LinearGradient id={`${p}sky`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={state.top} />
          <Stop offset={0.5} stopColor={state.mid} />
          <Stop offset={0.8} stopColor={state.mid} />
          <Stop offset={1} stopColor={state.horizon} />
        </LinearGradient>
        <LinearGradient id={`${p}ground`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor={state.horizon} stopOpacity={0.9} />
          <Stop offset={0.35} stopColor={state.ground} />
          <Stop offset={1} stopColor={state.ground} />
        </LinearGradient>
        <RadialGradient id={`${p}bloom`} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor={state.horizon} stopOpacity={0.85} />
          <Stop offset={1} stopColor={state.horizon} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${p}halo`} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor={sun ? "#FFF3D2" : "#E6ECFF"} stopOpacity={sun ? 0.7 : 0.32} />
          <Stop offset={0.4} stopColor={sun ? "#FFE3A6" : "#C9D6FF"} stopOpacity={sun ? 0.28 : 0.12} />
          <Stop offset={1} stopColor={sun ? "#FFE3A6" : "#C9D6FF"} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${p}moon`} cx="38%" cy="34%" r="70%">
          <Stop offset={0} stopColor="#F7F8FC" />
          <Stop offset={1} stopColor="#B9C2D6" />
        </RadialGradient>
        <LinearGradient id={`${p}horizonLine`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0} />
          <Stop offset={0.5} stopColor="#FFFFFF" stopOpacity={0.34} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
        <RadialGradient id={`${p}scrim`} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#000000" stopOpacity={state.scrim} />
          <Stop offset={1} stopColor="#000000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${p}reflection`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#FFE2B0" stopOpacity={0.45} />
          <Stop offset={1} stopColor="#FFE2B0" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={D} height={HORIZON} fill={`url(#${p}sky)`} />
      {state.warmth > 0.02 ? <Ellipse cx={bx} cy={HORIZON} rx={D * 0.62} ry={D * 0.3} fill={`url(#${p}bloom)`} opacity={state.warmth * 0.75} /> : null}
      {state.night > 0.04
        ? STARS.map(([x, y, strength], index) => (
            <Circle key={index} cx={x} cy={y} r={0.55 + strength * 0.55} fill="#FFFFFF" opacity={state.night * strength * 0.75} />
          ))
        : null}
      <Circle cx={bx} cy={by} r={sun ? 30 : 22} fill={`url(#${p}halo)`} />
      {sun ? <Circle cx={bx} cy={by} r={8.5} fill={sunCore} /> : <Circle cx={bx} cy={by} r={7} fill={`url(#${p}moon)`} />}
      <Rect x={0} y={HORIZON} width={D} height={D - HORIZON} fill={`url(#${p}ground)`} />
      {sun && lowSun > 0.55 ? <Ellipse cx={bx} cy={HORIZON + 14} rx={7} ry={16} fill={`url(#${p}reflection)`} opacity={(lowSun - 0.55) * 1.8} /> : null}
      {/* The horizon sits below the time text and never crosses it. */}
      <Line x1={R - R * 0.86} y1={HORIZON} x2={R + R * 0.86} y2={HORIZON} stroke={`url(#${p}horizonLine)`} strokeWidth={0.8} />
      {state.scrim > 0.02 ? <Ellipse cx={R} cy={R - 4} rx={74} ry={44} fill={`url(#${p}scrim)`} /> : null}
    </Svg>
  );
}

function Haze({ p, night, size }: { p: string; night: number; size: number }) {
  const strength = 0.07 - night * 0.035;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`}>
      <Defs>
        <RadialGradient id={`${p}haze`} cx="50%" cy="50%" r="50%">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={strength} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse cx={R * 0.62} cy={HORIZON - 30} rx={70} ry={16} fill={`url(#${p}haze)`} />
      <Ellipse cx={R * 1.45} cy={HORIZON - 52} rx={56} ry={12} fill={`url(#${p}haze)`} />
    </Svg>
  );
}

/** Depth and refraction: a darker inner edge and a faint bent-light ring. */
function GlassOptics({ p, size, dark }: { p: string; size: number; dark: boolean }) {
  const a = (angle: number, radius: number) => `${R + radius * Math.cos((angle * Math.PI) / 180)} ${R + radius * Math.sin((angle * Math.PI) / 180)}`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} style={{ position: "absolute" }} pointerEvents="none">
      <Defs>
        <RadialGradient id={`${p}depth`} cx="50%" cy="46%" r="54%">
          <Stop offset={0.7} stopColor="#000000" stopOpacity={0} />
          <Stop offset={0.92} stopColor="#000814" stopOpacity={dark ? 0.26 : 0.16} />
          <Stop offset={1} stopColor="#000814" stopOpacity={dark ? 0.46 : 0.3} />
        </RadialGradient>
      </Defs>
      <Circle cx={R} cy={R} r={R} fill={`url(#${p}depth)`} />
      <Circle cx={R} cy={R} r={R - 7} stroke="#FFFFFF" strokeOpacity={0.07} strokeWidth={5} fill="none" />
      {/* Light caught along the lower inner edge, as in thick glass. */}
      <Path d={`M ${a(148, R - 5)} A ${R - 5} ${R - 5} 0 0 0 ${a(32, R - 5)}`} stroke="#FFFFFF" strokeOpacity={0.2} strokeWidth={1.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** A broad, soft sheen across the upper glass — no hard glint. */
function Sheen({ p, size }: { p: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`}>
      <Defs>
        <LinearGradient id={`${p}sheen`} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.3} />
          <Stop offset={0.55} stopColor="#FFFFFF" stopOpacity={0.06} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={R * 0.74} cy={R * 0.5} rx={R * 0.66} ry={R * 0.3} fill={`url(#${p}sheen)`} transform={`rotate(-24 ${R * 0.74} ${R * 0.5})`} />
    </Svg>
  );
}

/** Rim light: bright where the glass faces up, dimmer below. */
function Rim({ p, size, dark }: { p: string; size: number; dark: boolean }) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${D} ${D}`} style={{ position: "absolute" }} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${p}rim`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset={0} stopColor="#FFFFFF" stopOpacity={0.62} />
          <Stop offset={0.45} stopColor="#FFFFFF" stopOpacity={0.12} />
          <Stop offset={1} stopColor="#FFFFFF" stopOpacity={0.3} />
        </LinearGradient>
      </Defs>
      <Circle cx={R} cy={R} r={R - 0.9} stroke={`url(#${p}rim)`} strokeWidth={1.6} fill="none" />
      {!dark ? <Circle cx={R} cy={R} r={R - 0.2} stroke="#000000" strokeOpacity={0.1} strokeWidth={0.5} fill="none" /> : null}
    </Svg>
  );
}
