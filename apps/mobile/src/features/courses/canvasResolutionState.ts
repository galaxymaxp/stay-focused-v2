export type CanvasResolutionStatus =
  | "idle"
  | "pending"
  | "usable"
  | "empty"
  | "unsupported"
  | "inaccessible"
  | "failed";

export interface CanvasResolutionPreviewIdentity {
  readonly previewSessionId: string;
  readonly resolutionFingerprint: string;
  readonly sourceIds: readonly string[];
}

export interface CanvasResolutionState {
  readonly status: CanvasResolutionStatus;
  readonly requestToken: number;
  readonly selectionKey: string;
  readonly preview: CanvasResolutionPreviewIdentity | null;
  readonly sourceText: string;
  readonly sourceTitle: string;
}

export interface CanvasGeneratedBinding {
  readonly fingerprint: string;
  readonly selectionKey: string;
  readonly sourceText: string;
}

export interface CanvasSingleFlightLock {
  current: boolean;
}

export type CanvasResolutionAction =
  | { readonly type: "selection_changed"; readonly selectionKey: string }
  | { readonly type: "started"; readonly requestToken: number; readonly selectionKey: string }
  | {
      readonly type: "resolved";
      readonly requestToken: number;
      readonly selectionKey: string;
      readonly preview: CanvasResolutionPreviewIdentity;
      readonly sourceText: string;
      readonly sourceTitle: string;
    }
  | {
      readonly type: "terminal";
      readonly requestToken: number;
      readonly selectionKey: string;
      readonly status: Exclude<CanvasResolutionStatus, "idle" | "pending" | "usable">;
    }
  | { readonly type: "edited"; readonly sourceText?: string; readonly sourceTitle?: string }
  | { readonly type: "cleared" };

export function createCanvasSelectionKey(sourceIds: readonly string[]): string {
  return [...sourceIds].sort().join("|");
}

export function createCanvasResolutionState(): CanvasResolutionState {
  return {
    status: "idle",
    requestToken: 0,
    selectionKey: "",
    preview: null,
    sourceText: "",
    sourceTitle: "",
  };
}

export function canvasResolutionReducer(
  state: CanvasResolutionState,
  action: CanvasResolutionAction,
): CanvasResolutionState {
  switch (action.type) {
    case "selection_changed":
      return clearedState(action.selectionKey, state.requestToken);
    case "started":
      return {
        ...clearedState(action.selectionKey, action.requestToken),
        status: "pending",
      };
    case "resolved":
      if (!isCurrentResponse(state, action)) return state;
      return {
        status: "usable",
        requestToken: action.requestToken,
        selectionKey: action.selectionKey,
        preview: action.preview,
        sourceText: action.sourceText,
        sourceTitle: action.sourceTitle,
      };
    case "terminal":
      if (!isCurrentResponse(state, action) && state.requestToken !== 0) return state;
      return {
        ...clearedState(action.selectionKey, action.requestToken),
        status: action.status,
      };
    case "edited":
      return {
        ...state,
        ...(action.sourceText !== undefined ? { sourceText: action.sourceText } : {}),
        ...(action.sourceTitle !== undefined ? { sourceTitle: action.sourceTitle } : {}),
      };
    case "cleared":
      return createCanvasResolutionState();
  }
}

export function isCanvasGenerationCurrent(
  state: CanvasResolutionState,
  selectedSourceIds: readonly string[],
): boolean {
  if (
    state.status !== "usable" ||
    !state.preview?.previewSessionId ||
    !state.preview.resolutionFingerprint ||
    !state.sourceText.trim()
  ) {
    return false;
  }
  const selectedKey = createCanvasSelectionKey(selectedSourceIds);
  return (
    state.selectionKey === selectedKey &&
    createCanvasSelectionKey(state.preview.sourceIds) === selectedKey
  );
}

export function isCanvasGeneratedBindingCurrent(
  binding: CanvasGeneratedBinding | null,
  state: CanvasResolutionState,
  selectedSourceIds: readonly string[],
): boolean {
  if (!binding || !state.preview) return false;
  const selectionKey = createCanvasSelectionKey(selectedSourceIds);
  return (
    isCanvasGenerationCurrent(state, selectedSourceIds) &&
    binding.selectionKey === selectionKey &&
    binding.fingerprint === state.preview.resolutionFingerprint &&
    binding.sourceText === state.sourceText.trim()
  );
}

export function tryBeginCanvasSingleFlight(lock: CanvasSingleFlightLock): boolean {
  if (lock.current) return false;
  lock.current = true;
  return true;
}

export function finishCanvasSingleFlight(lock: CanvasSingleFlightLock): void {
  lock.current = false;
}

function isCurrentResponse(
  state: CanvasResolutionState,
  action: { readonly requestToken: number; readonly selectionKey: string },
): boolean {
  return (
    state.status === "pending" &&
    state.requestToken === action.requestToken &&
    state.selectionKey === action.selectionKey
  );
}

function clearedState(selectionKey: string, requestToken: number): CanvasResolutionState {
  return {
    status: "idle",
    requestToken,
    selectionKey,
    preview: null,
    sourceText: "",
    sourceTitle: "",
  };
}
