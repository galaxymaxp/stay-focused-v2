import type { ReviewerReaderModel } from "@stay-focused/shared";
import { describe, expect, it } from "vitest";

import {
  anchorIndexForFraction,
  currentAnchorIndex,
  findReviewerMatches,
  highlightRuns,
  proportionalOffset,
  reviewerAnchors,
  reviewerSegments,
} from "./reviewerNavigation";

function block(id: string, title: string, explanation: string, keyPoints: string[] = [], evidence: string[] = []) {
  return { id, title, explanation, keyPoints, evidence: evidence.map((text) => ({ kind: "example" as const, text })) };
}
const reviewer: Pick<ReviewerReaderModel, "sections"> = {
  sections: [
    { id: "s1", title: "Database Models", blocks: [block("b1", "Database Models", "A model describes how data is organized.")] },
    {
      id: "s2",
      title: "Normalization",
      blocks: [
        block("b2", "First Normal Form (1NF)", "Normalization removes redundancy. In 1NF every attribute is atomic.", ["Atomic values only"], ["A phone list split into rows."]),
        block("b3", "Second Normal Form", "2NF removes partial dependency on a composite key.", ["Depends on the whole key"]),
      ],
    },
    { id: "s3", title: "Transactions", blocks: [block("b4", "ACID", "A transaction is atomic, consistent, isolated and durable.", [], ["Café payment either commits or rolls back."])] },
  ],
};

describe("Reviewer search", () => {
  const segments = reviewerSegments(reviewer);

  it("indexes exactly what the reader renders, skipping duplicate block headings", () => {
    expect(segments.find((segment) => segment.id === "b1:title")).toBeUndefined();
    expect(segments.map((segment) => segment.kind)).toContain("key_point");
    expect(segments.map((segment) => segment.kind)).toContain("evidence");
  });

  it("finds topic names, definitions and arbitrary body text", () => {
    expect(findReviewerMatches(segments, "Transactions")).toEqual([{ segmentId: "s3:title", sectionIndex: 2, start: 0, end: 12 }]);
    expect(findReviewerMatches(segments, "partial dependency").map((match) => match.segmentId)).toEqual(["b3:explanation"]);
    expect(findReviewerMatches(segments, "phone list").map((match) => match.segmentId)).toEqual(["b2:evidence:0"]);
  });

  it("returns every match in reading order, case- and accent-insensitively", () => {
    const matches = findReviewerMatches(segments, "normalization");
    expect(matches.map((match) => match.segmentId)).toEqual(["s2:title", "b2:explanation"]);
    expect(findReviewerMatches(segments, "cafe")).toEqual([{ segmentId: "b4:evidence:0", sectionIndex: 2, start: 0, end: 4 }]);
    expect(findReviewerMatches(segments, "atomic").map((match) => match.segmentId)).toEqual(["b2:explanation", "b2:point:0", "b4:explanation"]);
  });

  it("returns no matches for absent or too-short queries", () => {
    expect(findReviewerMatches(segments, "TCP/IP")).toEqual([]);
    expect(findReviewerMatches(segments, "a")).toEqual([]);
    expect(findReviewerMatches(segments, "   ")).toEqual([]);
  });

  it("splits text into plain, match and active runs at exact character positions", () => {
    const text = "Normalization removes redundancy. In 1NF every attribute is atomic.";
    const matches = findReviewerMatches([{ id: "x", kind: "explanation", sectionIndex: 0, text }], "at");
    expect(highlightRuns(text, matches, 1)).toEqual([
      { text: "Normaliz", kind: "plain" },
      { text: "at", kind: "match" },
      { text: "ion removes redundancy. In 1NF every ", kind: "plain" },
      { text: "at", kind: "active" },
      { text: "tribute is ", kind: "plain" },
      { text: "at", kind: "match" },
      { text: "omic.", kind: "plain" },
    ]);
  });
});

describe("Reviewer scrubber", () => {
  it("uses the Reviewer's topics as semantic anchors", () => {
    expect(reviewerAnchors(reviewer).map((anchor) => anchor.title)).toEqual(["Database Models", "Normalization", "Transactions"]);
  });

  it("falls back to block headings for a single-topic Reviewer, else to proportional position", () => {
    const single = { sections: [reviewer.sections[1]!] };
    expect(reviewerAnchors(single).map((anchor) => anchor.title)).toEqual(["First Normal Form (1NF)", "Second Normal Form"]);
    expect(reviewerAnchors({ sections: [reviewer.sections[0]!] })).toEqual([]);
    expect(proportionalOffset(0.5, 3000, 1000)).toBe(1000);
    expect(proportionalOffset(1.4, 3000, 1000)).toBe(2000);
  });

  it("maps the finger position along the track to topics, clamped at both ends", () => {
    expect(anchorIndexForFraction(0, 12)).toBe(0);
    expect(anchorIndexForFraction(0.5, 12)).toBe(6);
    expect(anchorIndexForFraction(1, 12)).toBe(11);
    expect(anchorIndexForFraction(-0.2, 12)).toBe(0);
    expect(anchorIndexForFraction(0.5, 0)).toBe(-1);
  });

  it("reports the topic currently being read", () => {
    const offsets = [120, 900, 1800];
    expect(currentAnchorIndex(offsets, 0)).toBe(-1);
    expect(currentAnchorIndex(offsets, 30)).toBe(0);
    expect(currentAnchorIndex(offsets, 810)).toBe(1);
    expect(currentAnchorIndex(offsets, 5000)).toBe(2);
    expect(currentAnchorIndex(offsets, -200)).toBe(-1);
  });
});
