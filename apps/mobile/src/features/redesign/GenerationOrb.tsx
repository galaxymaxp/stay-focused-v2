import { useIsFocused } from "@react-navigation/native";
import { useEffect, useMemo, useRef } from "react";
import { Animated, PanResponder, View } from "react-native";
import Svg, {
  Circle,
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
  const { reducedMotion, active } = useTheme();
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
      style={{ alignItems: "center", justifyContent: "center", minHeight: 300 }}
    >
      <Animated.View
        {...responder.panHandlers}
        accessible
        accessibilityLabel="Animated generation orb. Touch changes its appearance."
        style={{
          width: 260,
          height: 260,
          transform: [...offset.getTranslateTransform(), { scale: touch }],
        }}
      >
        <Animated.View
          style={{
            opacity: breathe.interpolate({
              inputRange: [0, 1],
              outputRange: [0.85, 1],
            }),
            transform: [
              {
                scale: breathe.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.94, 1.03],
                }),
              },
            ],
          }}
        >
          <Svg width={260} height={260} viewBox="0 0 260 260">
            <Defs>
              <RadialGradient id="orb" cx="38%" cy="30%" r="70%">
                <Stop offset="0" stopColor={contentColors.warm} />
                <Stop offset="0.22" stopColor={contentColors.pink} />
                <Stop offset="0.52" stopColor={contentColors.violet} />
                <Stop offset="0.82" stopColor={contentColors.blue} />
                <Stop
                  offset="1"
                  stopColor={contentColors.violet}
                  stopOpacity={0.05}
                />
              </RadialGradient>
              <RadialGradient id="light" cx="70%" cy="68%" r="60%">
                <Stop
                  offset="0"
                  stopColor={contentColors.blue}
                  stopOpacity={0.9}
                />
                <Stop
                  offset="1"
                  stopColor={contentColors.blue}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Circle cx={130} cy={130} r={111} fill="url(#orb)" opacity={0.12} />
            <Circle cx={130} cy={130} r={91} fill="url(#orb)" />
            <Circle cx={130} cy={130} r={89} fill="url(#light)" />
            <Ellipse
              cx={130}
              cy={130}
              rx={91}
              ry={30}
              rotation={-32}
              origin="130,130"
              stroke={contentColors.pink}
              strokeWidth={1.5}
              opacity={0.7}
              fill="none"
            />
            <Ellipse
              cx={130}
              cy={130}
              rx={89}
              ry={52}
              rotation={-32}
              origin="130,130"
              stroke={contentColors.blue}
              strokeWidth={1}
              opacity={0.55}
              fill="none"
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
