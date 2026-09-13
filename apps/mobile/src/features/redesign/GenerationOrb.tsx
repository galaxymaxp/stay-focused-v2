import { useIsFocused } from "@react-navigation/native";
import { useEffect, useId, useMemo, useRef } from "react";
import { Animated, PanResponder, View } from "react-native";
import Svg, {
  Circle,
  ClipPath,
  LinearGradient,
  Path,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from "react-native-svg";

import {
  contentColors,
  motion,
  shouldAnimate,
  useTheme,
} from "../../design/theme";

export function GenerationOrb({ running }: { running: boolean }) {
  const { reducedMotion, active, mode } = useTheme();
  const id = useId().replace(/:/g, "");
  const focused = useIsFocused();
  const breathe = useRef(new Animated.Value(0)).current;
  const touch = useRef(new Animated.Value(1)).current;
  const offset = useRef(new Animated.ValueXY()).current;
  useEffect(() => {
    if (!shouldAnimate(reducedMotion, active && running, focused)) {
      breathe.setValue(0);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: motion.ambient,
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: motion.ambient,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, breathe, focused, reducedMotion, running]);
  const reduce = useRef(reducedMotion);
  reduce.current = reducedMotion;
  useEffect(
    () => () => {
      touch.stopAnimation();
      offset.stopAnimation();
    },
    [touch, offset],
  );
  useEffect(() => {
    if (reducedMotion || !active || !focused) {
      touch.stopAnimation();
      offset.stopAnimation();
      touch.setValue(1);
      offset.setValue({ x: 0, y: 0 });
    }
  }, [reducedMotion, active, focused, touch, offset]);
  const responder = useMemo(() => {
    const spring = (value: number) => {
      if (reduce.current) touch.setValue(1);
      else
        Animated.spring(touch, {
          toValue: value,
          ...motion.spring,
          useNativeDriver: true,
        }).start();
    };
    const release = () => {
      spring(1);
      if (reduce.current) offset.setValue({ x: 0, y: 0 });
      else
        Animated.spring(offset, {
          toValue: { x: 0, y: 0 },
          ...motion.spring,
          useNativeDriver: true,
        }).start();
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => spring(0.95),
      onPanResponderMove: (_, gesture) => {
        if (!reduce.current)
          offset.setValue({
            x: Math.max(-12, Math.min(12, gesture.dx / 4)),
            y: Math.max(-12, Math.min(12, gesture.dy / 4)),
          });
      },
      onPanResponderRelease: release,
      onPanResponderTerminate: release,
    });
  }, [touch, offset]);
  return (
    <View
      style={{ alignItems: "center", justifyContent: "center", minHeight: 332 }}
    >
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityLabel="Animated generation orb. Touch changes its appearance."
        style={{
          width: 320,
          height: 320,
          transform: [...offset.getTranslateTransform(), { scale: touch }],
        }}
      >
        <Animated.View
          style={{
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.96, 1],
            }),
            transform: [
              { rotate: breathe.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "2deg"] }) },
              {
                scale: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1.03],
                }),
              },
            ],
          }}
        >
          <Svg width={320} height={320} viewBox="0 0 260 260">
            <Defs>
              <RadialGradient id={`${id}-halo`}>
                <Stop offset="0" stopColor={contentColors.violet} stopOpacity={0.3} />
                <Stop offset="0.6" stopColor={contentColors.pink} stopOpacity={0.16} />
                <Stop offset="1" stopColor={contentColors.violet} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id={`${id}-body`} cx="32%" cy="20%" r="85%">
                <Stop offset="0" stopColor="#FFF1DD" />
                <Stop offset="0.14" stopColor="#F7ADE7" />
                <Stop offset="0.4" stopColor="#8453D9" />
                <Stop offset="0.72" stopColor={mode === "dark" ? "#151C49" : "#6D77CD"} />
                <Stop offset="1" stopColor="#64A6FF" />
              </RadialGradient>
              <RadialGradient id={`${id}-blue`} cx="84%" cy="60%" r="65%">
                <Stop offset="0" stopColor="#BDEFFF" stopOpacity={0.85} />
                <Stop offset="0.35" stopColor="#6DAEFF" stopOpacity={0.5} />
                <Stop offset="1" stopColor="#7775F4" stopOpacity={0} />
              </RadialGradient>
              <LinearGradient id={`${id}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0" stopColor="#FFE3F2" />
                <Stop offset="0.3" stopColor="#F77DD3" />
                <Stop offset="0.65" stopColor="#809BFF" />
                <Stop offset="1" stopColor="#CEF7FF" />
              </LinearGradient>
              <LinearGradient id={`${id}-trail`} x1="0%" y1="0%" x2="100%" y2="60%">
                <Stop offset="0" stopColor="#EFA0D7" stopOpacity={0.15} />
                <Stop offset="0.45" stopColor="#FFE3F9" stopOpacity={1} />
                <Stop offset="0.8" stopColor="#79AFFF" stopOpacity={0.9} />
                <Stop offset="1" stopColor="#79AFFF" stopOpacity={0.15} />
              </LinearGradient>
              <ClipPath id={`${id}-clip`}><Circle cx={130} cy={130} r={76} /></ClipPath>
            </Defs>
            <Circle cx={130} cy={130} r={129} fill={`url(#${id}-halo)`} />
            <Ellipse cx={130} cy={130} rx={112} ry={74} rotation={-28} origin="130,130" stroke={`url(#${id}-rim)`} strokeWidth={0.65} opacity={0.3} fill="none" />
            <Ellipse cx={130} cy={130} rx={91} ry={117} rotation={24} origin="130,130" stroke={`url(#${id}-rim)`} strokeWidth={0.55} opacity={0.23} fill="none" />
            <Circle cx={130} cy={130} r={81} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={8} opacity={0.08} />
            <Circle cx={130} cy={130} r={78} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={4} opacity={0.17} />
            <Circle cx={130} cy={130} r={76} fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth={1.4} />
            <Circle cx={130} cy={130} r={75} fill={`url(#${id}-blue)`} />
            <Path d="M 65 92 C 74 66 103 52 128 55" stroke="#FFF0F7" strokeWidth={2.5} opacity={0.85} fill="none" />
            <Path d="M 178 72 C 206 91 220 142 190 176" stroke="#A1CDFF" strokeWidth={2} opacity={0.9} fill="none" />
            <Ellipse cx={130} cy={130} rx={91} ry={27} rotation={-32} origin="130,130" stroke={`url(#${id}-trail)`} strokeWidth={5} opacity={0.08} fill="none" />
            <Ellipse cx={130} cy={130} rx={91} ry={27} rotation={-32} origin="130,130" stroke={`url(#${id}-trail)`} strokeWidth={1.3} opacity={0.95} fill="none" />
            <Path clipPath={`url(#${id}-clip)`} d="M 43 123 C 83 131 158 79 181 54 M 57 171 C 100 174 189 123 213 97 M 75 203 C 120 209 202 164 217 130" stroke={`url(#${id}-trail)`} strokeWidth={1.2} opacity={0.8} fill="none" />
            {Array.from({ length: 24 }, (_, i) => {
              const angle = i * 2.399;
              const r = 91 + (i % 5) * 7;
              return <Circle key={i} cx={130 + Math.cos(angle) * r} cy={130 + Math.sin(angle) * r} r={i % 4 === 0 ? 1.2 : 0.65} fill={i % 2 ? contentColors.blue : contentColors.pink} opacity={i % 3 === 0 ? 0.65 : 0.3} />;
            })}
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
