import { describe, expect, it } from "vitest";

import {
  canvasResolutionReducer,
  createCanvasResolutionState,
  isCanvasGenerationCurrent,
} from "./canvasResolutionState";

const SELECTION_A = "page:a";
const SELECTION_B = "page:b";

describe("canvasResolutionReducer", () => {
  it("clears usable text immediately when selection changes", () => {
    const pending = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 1,
      selectionKey: SELECTION_A,
    });
    const usable = canvasResolutionReducer(pending, {
      type: "resolved",
      requestToken: 1,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "session-a",
        resolutionFingerprint: "fingerprint-a",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Actual lesson text",
      sourceTitle: "Lesson",
    });

    const changed = canvasResolutionReducer(usable, {
      type: "selection_changed",
      selectionKey: SELECTION_B,
    });

    expect(changed).toMatchObject({
      status: "idle",
      selectionKey: SELECTION_B,
      preview: null,
      sourceText: "",
      sourceTitle: "",
    });
  });

  it("ignores a late response for the previous selection", () => {
    const pendingA = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 1,
      selectionKey: SELECTION_A,
    });
    const pendingB = canvasResolutionReducer(pendingA, {
      type: "started",
      requestToken: 2,
      selectionKey: SELECTION_B,
    });
    const lateA = canvasResolutionReducer(pendingB, {
      type: "resolved",
      requestToken: 1,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "session-a",
        resolutionFingerprint: "fingerprint-a",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Stale text",
      sourceTitle: "Stale",
    });

    expect(lateA).toEqual(pendingB);
  });

  it.each(["empty", "unsupported", "inaccessible", "failed"] as const)(
    "clears preview and source for terminal %s",
    (status) => {
      const terminal = canvasResolutionReducer(createCanvasResolutionState(), {
        type: "terminal",
        requestToken: 3,
        selectionKey: SELECTION_A,
        status,
      });

      expect(terminal).toMatchObject({
        status,
        preview: null,
        sourceText: "",
        sourceTitle: "",
      });
    },
  );

  it("requires an exact selection and resolution fingerprint for generation", () => {
    const pending = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 4,
      selectionKey: "assignment:b|page:a",
    });
    const state = canvasResolutionReducer(pending, {
      type: "resolved",
      requestToken: 4,
      selectionKey: "assignment:b|page:a",
      preview: {
        previewSessionId: "session-current",
        resolutionFingerprint: "fingerprint-current",
        sourceIds: ["page:a", "assignment:b"],
      },
      sourceText: "Actual content",
      sourceTitle: "Current",
    });

    expect(isCanvasGenerationCurrent(state, ["assignment:b", "page:a"])).toBe(true);
    expect(isCanvasGenerationCurrent(state, ["page:a"])).toBe(false);
    expect(
      isCanvasGenerationCurrent(
        { ...state, preview: { ...state.preview!, resolutionFingerprint: "" } },
        ["assignment:b", "page:a"],
      ),
    ).toBe(false);
  });

  it("clears all resolved content on teardown", () => {
    const pending = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 5,
      selectionKey: SELECTION_A,
    });
    const state = canvasResolutionReducer(pending, {
      type: "resolved",
      requestToken: 5,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "session-a",
        resolutionFingerprint: "fingerprint-a",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Actual content",
      sourceTitle: "Lesson",
    });

    expect(canvasResolutionReducer(state, { type: "cleared" })).toEqual(
      createCanvasResolutionState(),
    );
  });
});
