"use client";
import { useEffect, useState } from "react";
import type { CoreState } from "../knowledge-core/coreModel";
import { OrbPointerLayer, useOrbInteraction } from "../knowledge-core/orbInteraction";
import { DAY_ORB_FILL, DayOrb } from "./DayOrb";

/**
 * The Today orb on generation screens: the same body, remembered color and
 * gestures. The job shows only in how the orb behaves.
 */
export function GenerationOrb({ state }: { state: CoreState }) {
  const interaction = useOrbInteraction();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="generation-orb" data-testid="generation-orb" data-state={state} aria-hidden="true">
      <DayOrb minutes={now.getHours() * 60 + now.getMinutes()} state={state} interaction={interaction} />
      <OrbPointerLayer interaction={interaction} fill={DAY_ORB_FILL} />
    </div>
  );
}
