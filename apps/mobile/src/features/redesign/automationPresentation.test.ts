import { describe, expect, it } from "vitest";
import { automaticLibraryLabel, automaticQueueLabel, automaticReviewerLabel } from "./automationPresentation";

describe("automatic reviewer labels", () => {
  it("labels Queue, Library and the reviewer header from automatic origin", () => {
    expect(automaticQueueLabel({ origin: "automatic" })).toBe("Auto");
    expect(automaticLibraryLabel({ origin: "automatic" })).toBe("Made automatically");
    expect(automaticReviewerLabel({ origin: "automatic", sourceTitle: "Unit 1.pdf" })).toBe("Made automatically from Unit 1.pdf");
  });
  it.each([undefined, "manual"] as const)("does not label %s reviewers", origin => {
    expect(automaticQueueLabel({ origin })).toBeNull();
    expect(automaticLibraryLabel({ origin })).toBeNull();
    expect(automaticReviewerLabel({ origin, sourceTitle: "Unit 1.pdf" })).toBeNull();
  });
  it("does not invent a material title when it is unavailable", () => {
    expect(automaticReviewerLabel({ origin: "automatic", sourceTitle: null })).toBe("Made automatically");
  });
});
