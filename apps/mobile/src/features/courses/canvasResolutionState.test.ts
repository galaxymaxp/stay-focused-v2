import { describe, expect, it } from "vitest";

import {
  canvasResolutionReducer,
  createCanvasResolutionState,
  finishCanvasSingleFlight,
  isCanvasGeneratedBindingCurrent,
  isCanvasGenerationCurrent,
  tryBeginCanvasSingleFlight,
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

  it("invalidates the previous response when the same source is retried", () => {
    const firstAttempt = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 1,
      selectionKey: SELECTION_A,
    });
    const retry = canvasResolutionReducer(firstAttempt, {
      type: "started",
      requestToken: 2,
      selectionKey: SELECTION_A,
    });
    const lateFirstAttempt = canvasResolutionReducer(retry, {
      type: "resolved",
      requestToken: 1,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "old-session",
        resolutionFingerprint: "old-fingerprint",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Old response",
      sourceTitle: "Old title",
    });

    expect(lateFirstAttempt).toEqual(retry);
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

  it("clears all resolved content on sign-out or teardown", () => {
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

  it("blocks generation after course or source-mode state is cleared", () => {
    const pending = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 8,
      selectionKey: SELECTION_A,
    });
    const usable = canvasResolutionReducer(pending, {
      type: "resolved",
      requestToken: 8,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "session-a",
        resolutionFingerprint: "fingerprint-a",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Current source text",
      sourceTitle: "Current source",
    });

    const clearedForCourse = canvasResolutionReducer(usable, {
      type: "selection_changed",
      selectionKey: "",
    });
    const clearedForMode = canvasResolutionReducer(usable, { type: "cleared" });

    expect(isCanvasGenerationCurrent(clearedForCourse, [SELECTION_A])).toBe(false);
    expect(isCanvasGenerationCurrent(clearedForMode, [SELECTION_A])).toBe(false);
  });

  it("invalidates a generated save binding after text, source, or fingerprint changes", () => {
    const pending = canvasResolutionReducer(createCanvasResolutionState(), {
      type: "started",
      requestToken: 9,
      selectionKey: SELECTION_A,
    });
    const usable = canvasResolutionReducer(pending, {
      type: "resolved",
      requestToken: 9,
      selectionKey: SELECTION_A,
      preview: {
        previewSessionId: "session-a",
        resolutionFingerprint: "fingerprint-a",
        sourceIds: [SELECTION_A],
      },
      sourceText: "Bound source text",
      sourceTitle: "Bound source",
    });
    const binding = {
      fingerprint: "fingerprint-a",
      selectionKey: SELECTION_A,
      sourceText: "Bound source text",
    };

    expect(isCanvasGeneratedBindingCurrent(binding, usable, [SELECTION_A])).toBe(true);
    expect(
      isCanvasGeneratedBindingCurrent(
        binding,
        canvasResolutionReducer(usable, {
          sourceText: "Edited source text",
          type: "edited",
        }),
        [SELECTION_A],
      ),
    ).toBe(false);
    expect(isCanvasGeneratedBindingCurrent(binding, usable, [SELECTION_B])).toBe(false);
    expect(
      isCanvasGeneratedBindingCurrent(
        { ...binding, fingerprint: "changed-fingerprint" },
        usable,
        [SELECTION_A],
      ),
    ).toBe(false);
  });

  it("allows exactly one request for a double tap until the operation finishes", () => {
    const lock = { current: false };
    let requestCount = 0;
    if (tryBeginCanvasSingleFlight(lock)) requestCount += 1;
    if (tryBeginCanvasSingleFlight(lock)) requestCount += 1;

    expect(requestCount).toBe(1);
    finishCanvasSingleFlight(lock);
    expect(tryBeginCanvasSingleFlight(lock)).toBe(true);
  });

  it("prevents a duplicate save while the first save is active", () => {
    const saveLock = { current: false };
    let saveRequests = 0;

    if (tryBeginCanvasSingleFlight(saveLock)) saveRequests += 1;
    if (tryBeginCanvasSingleFlight(saveLock)) saveRequests += 1;

    expect(saveRequests).toBe(1);
    finishCanvasSingleFlight(saveLock);
  });
});
