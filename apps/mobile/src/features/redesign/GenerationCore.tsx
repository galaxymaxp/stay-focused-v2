import { requireOptionalNativeModule } from "expo";
import { useIsFocused } from "expo-router/react-navigation";
import { useEffect, useState } from "react";
import { View } from "react-native";

import { useTheme } from "../../design/theme";
import type { CoreState } from "../generation-core/coreModel";
import { OrbTouchLayer, useOrbInteraction } from "../generation-core/orbInteraction";
import { GenerationVisual } from "./GenerationVisual";

/**
 * The Today orb (liquid in a glass ball) drawn with expo-gl, with the job
 * shown only in how it behaves. Same body, remembered color and gestures.
 *
 * expo-gl resolves its native module as soon as it is imported, so an
 * installed app built before GL was added would crash on this screen if the
 * orb were imported normally. It is loaded only after a non-throwing check
 * finds ExpoGL (the module used by this SDK's GLView); otherwise the previous
 * visual stays in place. The legacy ExponentGLObjectManager name is absent
 * in SDK 57 even when GL is installed.
 */
const glAvailable = requireOptionalNativeModule("ExpoGL") != null;
let dayOrb: typeof import("./DayOrb") | null = null;

function loadDayOrb(): typeof import("./DayOrb") | null {
  if (!glAvailable) return null;
  if (!dayOrb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    dayOrb = require("./DayOrb") as typeof import("./DayOrb");
  }
  return dayOrb;
}

export function GenerationCore({ state, size = 300 }: { state: CoreState; size?: number }) {
  const { mode, reducedMotion, active } = useTheme();
  const focused = useIsFocused();
  const interaction = useOrbInteraction();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active || !focused) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [active, focused]);
  const orb = loadDayOrb();
  if (!orb) {
    return (
      <GenerationVisual
        size={size}
        running={state === "reading" || state === "generating" || state === "finalizing"}
        completed={state === "complete"}
      />
    );
  }
  const ball = size * orb.DAY_ORB_FILL, inset = (size - ball) / 2;
  return (
    <View testID="generation-orb" style={{ width: size, height: size }}>
      <orb.DayOrb variant="standalone" minutes={now.getHours() * 60 + now.getMinutes()} size={size} mode={mode} reducedMotion={reducedMotion}
        live={focused && active} state={state} interaction={interaction} />
      <OrbTouchLayer interaction={interaction} size={ball} left={inset} top={inset} reducedMotion={reducedMotion} />
    </View>
  );
}
