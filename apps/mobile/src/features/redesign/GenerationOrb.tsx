import { useIsFocused } from "@react-navigation/native";
import { useEffect, useId, useMemo, useRef } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  StyleSheet,
  View,
} from "react-native";
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from "react-native-svg";

import {
  contentColors,
  motion,
  shouldAnimate,
  useTheme,
} from "../../design/theme";

const SIZE = 320;
const BLOB =
  "M 130 51 C 174 48 207 82 208 126 C 211 171 178 207 133 209 C 87 211 52 178 51 133 C 48 89 84 54 130 51 Z";

export function GenerationOrb({ running }: { running: boolean }) {
  const { reducedMotion, active, mode } = useTheme();
  const id = useId().replace(/:/g, "");
  const focused = useIsFocused();
  const breathe = useRef(new Animated.Value(0.35)).current;
  const drift = useRef(new Animated.Value(0.2)).current;
  const spectrum = useRef(new Animated.Value(0.25)).current;
  const orbit = useRef(new Animated.Value(0.08)).current;
  const press = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const state = useRef({ active, focused, reducedMotion });
  state.current = { active, focused, reducedMotion };

  useEffect(() => {
    if (!shouldAnimate(reducedMotion, active && running, focused)) {
      stopValues(breathe, drift, spectrum, orbit);
      breathe.setValue(0.35);
      drift.setValue(0.2);
      spectrum.setValue(0.25);
      orbit.setValue(0.08);
      return;
    }
    const ease = Easing.inOut(Easing.ease);
    const animation = Animated.parallel([
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, {
            toValue: 1,
            duration: 3600,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
          Animated.timing(breathe, {
            toValue: 0,
            duration: 3900,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(drift, {
            toValue: 1,
            duration: 5200,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
          Animated.timing(drift, {
            toValue: 0,
            duration: 4900,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(spectrum, {
            toValue: 1,
            duration: 6200,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
          Animated.timing(spectrum, {
            toValue: 0,
            duration: 6800,
            easing: ease,
            isInteraction: false,
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.timing(orbit, {
          toValue: 1,
          duration: 18000,
          easing: Easing.linear,
          isInteraction: false,
          useNativeDriver: true,
        }),
      ),
    ]);
    animation.start();
    return () => {
      animation.stop();
      stopValues(breathe, drift, spectrum, orbit);
    };
  }, [active, breathe, drift, focused, orbit, reducedMotion, running, spectrum]);

  useEffect(() => {
    if (reducedMotion || !active || !focused) {
      stopValues(press, pulse);
      press.setValue(0);
      pulse.setValue(0);
    }
  }, [active, focused, press, pulse, reducedMotion]);
  useEffect(
    () => () => stopValues(breathe, drift, spectrum, orbit, press, pulse),
    [breathe, drift, spectrum, orbit, press, pulse],
  );

  const responder = useMemo(() => {
    const setPress = (toValue: number) => {
      press.stopAnimation();
      if (state.current.reducedMotion) {
        press.setValue(toValue);
        return;
      }
      Animated.spring(press, {
        toValue,
        ...motion.spring,
        useNativeDriver: true,
      }).start();
    };
    const release = (withPulse: boolean) => {
      setPress(0);
      if (!withPulse || state.current.reducedMotion) return;
      pulse.stopAnimation();
      pulse.setValue(0);
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(pulse, {
          toValue: 0,
          ...motion.spring,
          useNativeDriver: true,
        }),
      ]).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () =>
        state.current.active && state.current.focused,
      onPanResponderGrant: () => {
        pulse.stopAnimation();
        pulse.setValue(0);
        setPress(1);
      },
      onPanResponderRelease: () => release(true),
      onPanResponderTerminate: () => release(false),
    });
  }, [press, pulse]);

  const pressScale = reducedMotion
    ? 1
    : press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.94] });
  const pulseScale = reducedMotion
    ? 1
    : pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  return (
    <View style={styles.frame}>
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityLabel="Generation orb"
        accessibilityHint="Touch for a subtle visual response."
        accessibilityState={{ busy: running }}
        testID="generation-orb"
        style={[styles.orb, { transform: [{ scale: pressScale }] }]}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.fill, { transform: [{ scale: pulseScale }] }]}
        >
          <Animated.View
            style={[
              styles.fill,
              {
                opacity: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.55, 0.88],
                }),
                transform: [
                  {
                    scale: breathe.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1.08],
                    }),
                  },
                ],
              },
            ]}
          >
            <OrbHalo id={id} />
          </Animated.View>

          <Animated.View
            style={[
              styles.fill,
              {
                transform: [
                  {
                    translateX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-3, 4],
                    }),
                  },
                  {
                    translateY: breathe.interpolate({
                      inputRange: [0, 1],
                      outputRange: [3, -2],
                    }),
                  },
                  {
                    rotate: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["-3deg", "4deg"],
                    }),
                  },
                  {
                    scaleX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.975, 1.03],
                    }),
                  },
                  {
                    scaleY: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.025, 0.98],
                    }),
                  },
                  {
                    scale: breathe.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1.025],
                    }),
                  },
                ],
              },
            ]}
          >
            <OrbBody id={id} mode={mode} />
          </Animated.View>

          <Animated.View
            style={[
              styles.fill,
              {
                opacity: spectrum.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.24, 0.56, 0.3],
                }),
                transform: [
                  {
                    translateX: spectrum.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-10, 11],
                    }),
                  },
                  {
                    translateY: spectrum.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, -10],
                    }),
                  },
                  {
                    rotate: spectrum.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["-7deg", "8deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <OrbSpectrum id={id} />
          </Animated.View>

          <Animated.View
            style={[
              styles.fill,
              {
                opacity: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1],
                }),
                transform: [
                  {
                    translateX: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: [8, -7],
                    }),
                  },
                  {
                    translateY: spectrum.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-6, 7],
                    }),
                  },
                  {
                    rotate: drift.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["5deg", "-6deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <OrbHighlights id={id} />
          </Animated.View>

          <Animated.View
            style={[
              styles.fill,
              {
                opacity: spectrum.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.48, 0.78],
                }),
                transform: [
                  {
                    rotate: orbit.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0deg", "360deg"],
                    }),
                  },
                ],
              },
            ]}
          >
            <OrbitalLight id={id} />
          </Animated.View>

          <Animated.View
            style={[
              styles.fill,
              {
                opacity: press.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.08, 0.34],
                }),
                transform: [
                  {
                    scale: press.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.96, 1.04],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchLight id={id} />
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function OrbHalo({ id }: { id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <RadialGradient id={`${id}-halo`}>
          <Stop offset="0" stopColor={contentColors.violet} stopOpacity={0.34} />
          <Stop offset="0.48" stopColor={contentColors.pink} stopOpacity={0.17} />
          <Stop offset="0.78" stopColor={contentColors.blue} stopOpacity={0.07} />
          <Stop offset="1" stopColor={contentColors.violet} stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id={`${id}-halo-rim`} x1="0%" y1="10%" x2="100%" y2="90%">
          <Stop offset="0" stopColor="#FF9EDF" />
          <Stop offset="0.5" stopColor="#A98BFF" />
          <Stop offset="1" stopColor="#75C9FF" />
        </LinearGradient>
      </Defs>
      <Circle cx={130} cy={130} r={128} fill={`url(#${id}-halo)`} />
      <Ellipse cx={130} cy={130} rx={112} ry={72} rotation={-27} origin="130,130" stroke={`url(#${id}-halo-rim)`} strokeWidth={0.7} opacity={0.34} fill="none" />
      <Ellipse cx={130} cy={130} rx={88} ry={116} rotation={23} origin="130,130" stroke={`url(#${id}-halo-rim)`} strokeWidth={0.55} opacity={0.24} fill="none" />
    </Svg>
  );
}

function OrbBody({ id, mode }: { id: string; mode: "light" | "dark" }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <RadialGradient id={`${id}-body`} cx="28%" cy="19%" r="88%">
          <Stop offset="0" stopColor="#FFF4D8" />
          <Stop offset="0.14" stopColor="#F6A4E3" />
          <Stop offset="0.39" stopColor="#8B5AE2" />
          <Stop offset="0.7" stopColor={mode === "dark" ? "#192252" : "#6878D2"} />
          <Stop offset="1" stopColor="#58B0FF" />
        </RadialGradient>
        <LinearGradient id={`${id}-rim`} x1="5%" y1="5%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#FFF0F7" />
          <Stop offset="0.25" stopColor="#FA78D0" />
          <Stop offset="0.64" stopColor="#7C8DFF" />
          <Stop offset="1" stopColor="#D4FAFF" />
        </LinearGradient>
      </Defs>
      <Path d={BLOB} fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth={1.5} />
      <Path d={BLOB} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={7} opacity={0.11} />
    </Svg>
  );
}

function OrbSpectrum({ id }: { id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <ClipPath id={`${id}-spectrum-clip`}><Path d={BLOB} /></ClipPath>
        <RadialGradient id={`${id}-pink-wash`} cx="24%" cy="22%" r="72%">
          <Stop offset="0" stopColor="#FFF1CB" stopOpacity={0.95} />
          <Stop offset="0.24" stopColor="#FF7BCD" stopOpacity={0.72} />
          <Stop offset="0.7" stopColor="#8C60F0" stopOpacity={0.18} />
          <Stop offset="1" stopColor="#5F77F2" stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id={`${id}-blue-wash`} cx="82%" cy="66%" r="58%">
          <Stop offset="0" stopColor="#D3FAFF" stopOpacity={0.9} />
          <Stop offset="0.3" stopColor="#65C5FF" stopOpacity={0.68} />
          <Stop offset="1" stopColor="#6F62ED" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle clipPath={`url(#${id}-spectrum-clip)`} cx={105} cy={104} r={74} fill={`url(#${id}-pink-wash)`} />
      <Circle clipPath={`url(#${id}-spectrum-clip)`} cx={167} cy={158} r={72} fill={`url(#${id}-blue-wash)`} />
    </Svg>
  );
}

function OrbHighlights({ id }: { id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <ClipPath id={`${id}-light-clip`}><Path d={BLOB} /></ClipPath>
        <LinearGradient id={`${id}-trail`} x1="0%" y1="0%" x2="100%" y2="60%">
          <Stop offset="0" stopColor="#EC83D2" stopOpacity={0.08} />
          <Stop offset="0.42" stopColor="#FFF3FC" stopOpacity={0.96} />
          <Stop offset="0.8" stopColor="#7CC9FF" stopOpacity={0.9} />
          <Stop offset="1" stopColor="#7CA4FF" stopOpacity={0.08} />
        </LinearGradient>
      </Defs>
      <Path clipPath={`url(#${id}-light-clip)`} d="M 38 112 C 86 139 157 75 205 61 M 49 166 C 100 186 173 119 224 99 M 68 202 C 123 215 197 162 223 130" stroke={`url(#${id}-trail)`} strokeWidth={1.35} opacity={0.86} fill="none" />
      <Path d="M 68 91 C 80 64 105 53 130 55" stroke="#FFF6FB" strokeWidth={2.6} opacity={0.9} fill="none" />
      <Path d="M 176 70 C 204 89 217 137 194 169" stroke="#B5E8FF" strokeWidth={2.1} opacity={0.88} fill="none" />
    </Svg>
  );
}

function OrbitalLight({ id }: { id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <LinearGradient id={`${id}-orbit`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0" stopColor="#FF8FD8" stopOpacity={0.08} />
          <Stop offset="0.46" stopColor="#FFF5FC" stopOpacity={0.9} />
          <Stop offset="0.74" stopColor="#78C8FF" stopOpacity={0.72} />
          <Stop offset="1" stopColor="#7A8BFF" stopOpacity={0.06} />
        </LinearGradient>
      </Defs>
      <Ellipse cx={130} cy={130} rx={102} ry={42} rotation={-30} origin="130,130" stroke={`url(#${id}-orbit)`} strokeWidth={1.15} strokeDasharray="94 548" fill="none" />
      <Circle cx={40} cy={145} r={5.5} fill={contentColors.pink} opacity={0.08} />
      <Circle cx={40} cy={145} r={1.25} fill="#FFF7FD" opacity={0.95} />
      <Circle cx={218} cy={112} r={4.5} fill={contentColors.blue} opacity={0.09} />
      <Circle cx={218} cy={112} r={1} fill="#EAFBFF" opacity={0.9} />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * 2.399;
        const radius = 94 + (index % 4) * 8;
        return (
          <Circle
            key={index}
            cx={130 + Math.cos(angle) * radius}
            cy={130 + Math.sin(angle) * radius}
            r={index % 4 === 0 ? 1.05 : 0.55}
            fill={index % 2 ? contentColors.blue : contentColors.pink}
            opacity={index % 3 === 0 ? 0.52 : 0.25}
          />
        );
      })}
    </Svg>
  );
}

function TouchLight({ id }: { id: string }) {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 260 260">
      <Defs>
        <RadialGradient id={`${id}-touch`}>
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.85} />
          <Stop offset="0.46" stopColor="#F8B8F1" stopOpacity={0.26} />
          <Stop offset="1" stopColor="#9B8CFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={130} cy={130} r={97} fill={`url(#${id}-touch)`} />
    </Svg>
  );
}

function stopValues(...values: Animated.Value[]) {
  values.forEach((value) => value.stopAnimation());
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 332,
  },
  orb: {
    width: SIZE,
    height: SIZE,
  },
  fill: {
    ...StyleSheet.absoluteFillObject,
  },
});
