import { describe, expect, it } from "vitest";
import { heuristicTaskEstimateMinutes } from "./task-planning";

describe("heuristic task estimates", () => {
  it.each([
    [["online_quiz"], null, 0, 30],
    [["online_upload"], null, 0, 90],
    [["online_upload"], 100, 1500, 170],
    [["unknown"], null, 0, 60],
    [[], null, 0, 60],
    [[" ONLINE_QUIZ ", "online_upload"], 10, 0, 90],
  ] as const)("uses type, points and description length: %j", (submissionTypes, pointsPossible, descriptionCharacters, expected) => {
    expect(heuristicTaskEstimateMinutes({ submissionTypes, pointsPossible, descriptionCharacters })).toBe(expected);
  });
  it("always returns a bounded multiple of five", () => {
    for (const type of ["online_quiz", "online_upload", "online_url", "unknown"]) {
      for (const pointsPossible of [null, 0, 49, 50, 10000]) {
        for (const descriptionCharacters of [0, 1499, 1500, 100000]) {
          const minutes = heuristicTaskEstimateMinutes({ submissionTypes: [type], pointsPossible, descriptionCharacters });
          expect(minutes).toBeGreaterThanOrEqual(15);
          expect(minutes).toBeLessThanOrEqual(240);
          expect(minutes % 5).toBe(0);
        }
      }
    }
  });
});
