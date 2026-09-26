import { requireOptionalNativeModule } from "expo";
import type { ComponentType } from "react";

import { useTheme } from "../../design/theme";
import type { CoreState } from "../generation-core/coreModel";
import type { KnowledgeCoreProps } from "../generation-core/KnowledgeCore";
import { GenerationVisual } from "./GenerationVisual";

/**
 * The approved Knowledge Core (liquid in a glass ball) drawn with expo-gl.
 *
 * expo-gl resolves its native module as soon as it is imported, so an
 * installed app built before GL was added would crash on this screen if the
 * core were imported normally. It is loaded only after a non-throwing check
 * finds the native module; otherwise the previous visual stays in place.
 */
const glAvailable = requireOptionalNativeModule("ExponentGLObjectManager") != null;
let knowledgeCore: ComponentType<KnowledgeCoreProps> | null = null;

function loadKnowledgeCore(): ComponentType<KnowledgeCoreProps> | null {
  if (!glAvailable) return null;
  if (!knowledgeCore) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    knowledgeCore = (require("../generation-core/KnowledgeCore") as typeof import("../generation-core/KnowledgeCore")).KnowledgeCore;
  }
  return knowledgeCore;
}

export function GenerationCore({ state, size = 300 }: { state: CoreState; size?: number }) {
  const { colors, mode, reducedMotion, active } = useTheme();
  const KnowledgeCore = loadKnowledgeCore();
  if (!KnowledgeCore) {
    return (
      <GenerationVisual
        running={state === "reading" || state === "generating" || state === "finalizing"}
        completed={state === "complete"}
      />
    );
  }
  return <KnowledgeCore state={state} colors={colors} mode={mode} reducedMotion={reducedMotion} active={active} size={size} />;
}
