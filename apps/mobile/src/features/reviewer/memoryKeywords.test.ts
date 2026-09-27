import { describe, expect, it } from "vitest";
import { memoryKeywordRanges } from "./memoryKeywords";

describe("Reviewer memorization emphasis", () => {
  it("emphasizes exact visible terms without inventing aliases", () => {
    const point = "The CIA triad consists of confidentiality, integrity, and availability.";
    const terms = memoryKeywordRanges(point, ["CIA triad", "Unknown term"])
      .map(({ start, end }) => point.slice(start, end));
    expect(terms).toEqual(["CIA triad"]);
  });
  it("keeps emphasis bounded and in reading order", () => {
    const point = "TLS and VPN protect communications across networks.";
    const ranges = memoryKeywordRanges(point);
    expect(ranges.map(({ start, end }) => point.slice(start, end))).toEqual(["TLS", "VPN"]);
    expect(ranges.length).toBeLessThanOrEqual(3);
  });
});
