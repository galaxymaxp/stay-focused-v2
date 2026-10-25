import { createQuietPreview, planningSelectionHash } from "@stay-focused/shared";
import type { DeterministicStudyPlan, StudyPlanningRequest } from "@stay-focused/shared/task-planning";
import { useEffect, useMemo, useRef, useState } from "react";

/** Scope previews to the authenticated owner and clock date. */
export function useQuietPlanner(identity: string, load: (request: StudyPlanningRequest) => Promise<DeterministicStudyPlan>) {
  const requestKey = useRef("");
  const latest = useRef(load);
  latest.current = load;
  const [state, setState] = useState<{
    identity: string; preview: DeterministicStudyPlan | null;
    previewRequest: StudyPlanningRequest | null; previewing: boolean; previewNote: string | null;
  }>({ identity, preview: null, previewRequest: null, previewing: false, previewNote: null });
  const empty = () => ({ identity, preview: null, previewRequest: null, previewing: false, previewNote: null });
  const scheduler = useMemo(() => createQuietPreview<StudyPlanningRequest, DeterministicStudyPlan>({
    load: request => latest.current(request),
    start: () => setState({ identity, preview: null, previewRequest: null, previewing: true, previewNote: null }),
    result: (preview, previewRequest) => {
      const key = `${JSON.stringify([previewRequest.planningRange, previewRequest.availability])}:${planningSelectionHash(previewRequest.mode ?? "tasks", previewRequest.selection)}`;
      if (requestKey.current === key) setState({ identity, preview, previewRequest, previewing: false, previewNote: null });
    },
    error: error => setState({ identity, preview: null, previewRequest: null, previewing: false,
      previewNote: error instanceof Error ? error.message : "Could not preview your plan." }),
    idle: () => setState(old => old.identity === identity ? { ...old, previewing: false } : old),
  }), [identity]);
  useEffect(() => () => scheduler.invalidate(), [scheduler]);
  const clearPreview = () => { scheduler.invalidate(); setState(empty()); };
  return {
    ...(state.identity === identity ? state : empty()),
    clearPreview,
    queuePreview: (request: StudyPlanningRequest) => {
      clearPreview();
      requestKey.current = `${JSON.stringify([request.planningRange, request.availability])}:${planningSelectionHash(request.mode ?? "tasks", request.selection)}`;
      scheduler.queue(request);
    },
  };
}
