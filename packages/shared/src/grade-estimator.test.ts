import { describe, expect, it } from "vitest";
import { estimateGradeNeeds, type GradeEstimateAssignmentInput, type GradeEstimateGroupInput } from "./grade-estimator";
const group = (id: string, weight: number): GradeEstimateGroupInput => ({ id, name: id, weight, hasRules: false });
const assignment = (id: string, possible: number, score: number | null, groupId: string | null = null): GradeEstimateAssignmentInput => ({
  id, title: id, pointsPossible: possible, score, groupId, state: score === null ? "pending" : "graded", hiddenGrade: false, dueAt: null,
});
const points = (targetPercent: number, assignments: readonly GradeEstimateAssignmentInput[]) => estimateGradeNeeds({ targetPercent, assignments, groups: [], canvasCurrentScore: null });
describe("grade estimator", () => {
  it("solves reachable points targets and needed points per activity", () => {
    // (80 + 100x)/200 = .9 -> x=1; target .85 -> x=.9, 20 points needs 18.
    const work = [assignment("graded", 100, 80), assignment("Lab 5", 20, null), assignment("rest", 80, null)];
    expect(points(90, work)).toMatchObject({ status: "reachable", requiredPercent: 100 });
    expect(points(85, work)).toMatchObject({ status: "reachable", requiredPercent: 90, needs: [{ neededPoints: 18 }, { neededPoints: 72 }] });
  });
  it("recognizes a secured target", () => {
    // Zero remaining: 95/110 = 86.3636%, above 85.
    expect(points(85, [assignment("graded", 100, 95), assignment("rest", 10, null)]))
      .toMatchObject({ status: "secured", minimumFinalPercent: 86.4, requiredPercent: 0 });
  });
  it("recognizes an out-of-reach target", () => {
    // Perfect remaining: (40+50)/150=60%.
    expect(points(90, [assignment("graded", 100, 40), assignment("rest", 50, null)]))
      .toMatchObject({ status: "out_of_reach", maximumFinalPercent: 60 });
  });
  it("solves weighted groups, including groups with no graded work", () => {
    // final(x)=.18+.8x, target .8 -> x=.775; current quiz grade=90%.
    const result = estimateGradeNeeds({ targetPercent: 80, canvasCurrentScore: null, groups: [group("quiz", 40), group("exam", 60)],
      assignments: [assignment("Quiz 1", 20, 18, "quiz"), assignment("Quiz 2", 20, null, "quiz"), assignment("Exam", 100, null, "exam")] });
    expect(result).toMatchObject({ mode: "weighted", currentPercent: 90, minimumFinalPercent: 18, maximumFinalPercent: 98, requiredPercent: 77.5 });
    expect(result.needs.map(n => n.neededPoints)).toEqual([15.5, 77.5]);
  });
  it("uses Canvas's current score to distinguish points from weighting", () => {
    // Weighted current=.4*.9+.6*.5=66%; points current=68/120=56.6667%.
    const input = { targetPercent: 70, canvasCurrentScore: 56.7, groups: [group("quiz", 40), group("exam", 60)],
      assignments: [assignment("Quiz", 20, 18, "quiz"), assignment("Exam", 100, 50, "exam"), assignment("Rest", 100, null, "exam")] };
    expect(estimateGradeNeeds(input).mode).toBe("points");
    expect(estimateGradeNeeds({ ...input, canvasCurrentScore: 66 }).mode).toBe("weighted");
    expect(estimateGradeNeeds({ ...input, canvasCurrentScore: null }).mode).toBe("weighted");
  });
  it("excludes weight-zero work from weighted advice", () => {
    const result = estimateGradeNeeds({ targetPercent: 90, canvasCurrentScore: null, groups: [group("counted", 100), group("practice", 0)],
      assignments: [assignment("graded", 100, 80, "counted"), assignment("rest", 100, null, "counted"), assignment("practice", 100, null, "practice")] });
    expect(result.needs.map(n => n.assignmentId)).toEqual(["rest"]);
  });
  it("reports complete when no graded work remains", () => {
    expect(points(90, [assignment("graded", 100, 80)])).toMatchObject({ status: "complete", currentPercent: 80, needs: [] });
  });
  it("reports no gradable work for empty, excluded and zero-point inputs", () => {
    expect(points(90, []).status).toBe("no_gradable_work");
    expect(points(90, [{ ...assignment("excluded", 100, null), state: "excluded" }, assignment("zero", 0, null)]).status).toBe("no_gradable_work");
  });
  it("warns about drops, hidden pending scores and a Canvas mismatch over two points", () => {
    const result = estimateGradeNeeds({ targetPercent: 85, groups: [{ ...group("group", 0), hasRules: true }], canvasCurrentScore: 90,
      assignments: [assignment("graded", 100, 80), { ...assignment("hidden", 100, null), hiddenGrade: true }, { ...assignment("excused", 10, null), hiddenGrade: true, state: "excluded" }] });
    expect(result.warnings).toEqual({ hasDropRules: true, hiddenGradeCount: 1, differsFromCanvas: true,
      dropRuleMessages: ["Drop rules could not be applied in group."] });
    expect(estimateGradeNeeds({ targetPercent: 80, groups: [], assignments: [assignment("graded", 100, 80)], canvasCurrentScore: 82 }).warnings.differsFromCanvas).toBe(false);
  });
  it("clamps targets and rounds requirements up to a tenth", () => {
    // (80+100x)/200=.833 -> x=.866; a 3-point item needs ceil(2.598*10)/10=2.6.
    const work = [assignment("graded", 100, 80), assignment("small", 3, null), assignment("rest", 97, null)];
    expect(points(-10, work).targetPercent).toBe(0);
    expect(points(200, work).targetPercent).toBe(150);
    expect(points(83.3, work)).toMatchObject({ requiredPercent: 86.6, needs: [{ neededPoints: 2.6 }, { neededPoints: 84.1 }] });
  });
  it("sorts remaining activities by due date with undated work last", () => {
    const work = [assignment("last", 10, null), { ...assignment("later", 10, null), dueAt: "2026-10-20T00:00:00Z" },
      { ...assignment("first", 10, null), dueAt: "2026-10-13T00:00:00Z" }];
    expect(points(80, work).needs.map(n => n.assignmentId)).toEqual(["first", "later", "last"]);
  });
});

describe("Canvas drop rules", () => {
  const estimate = (work: readonly GradeEstimateAssignmentInput[], dropLowest = 1, dropHighest = 0, neverDrop: readonly string[] = [], targetPercent = 85) =>
    estimateGradeNeeds({ targetPercent, canvasCurrentScore: null,
      groups: [{ ...group("quiz", 0), name: "Quizzes", hasRules: true, rules: { dropLowest, dropHighest, neverDrop } }], assignments: work });
  const quiz = (id: string, possible: number, score: number | null) => assignment(id, possible, score, "quiz");

  it("preserves the entire no-rule CIT17-like result", () => {
    const work = [quiz("g1", 100, 100), quiz("g2", 100, 67), quiz("g3", 50, 50),
      quiz("p1", 100, null), quiz("p2", 100, null), quiz("p3", 100, null), { ...quiz("p4", 50, null), hiddenGrade: true }];
    const input = { targetPercent: 90, canvasCurrentScore: 86.8, assignments: work, groups: [group("quiz", 0)] };
    const result = estimateGradeNeeds(input);
    expect(result).toEqual({ mode: "points", status: "reachable", targetPercent: 90, currentPercent: 86.8,
      minimumFinalPercent: 36.2, maximumFinalPercent: 94.5, requiredPercent: 92.3,
      needs: [100, 100, 100, 50].map((pointsPossible, i) => ({ assignmentId: `p${i + 1}`, title: `p${i + 1}`,
        dueAt: null, pointsPossible, neededPoints: i === 3 ? 46.2 : 92.3 })),
      warnings: { hasDropRules: false, hiddenGradeCount: 1, differsFromCanvas: false } });
    expect(estimateGradeNeeds({ ...input, groups: [{ ...group("quiz", 0), rules: { dropLowest: 0, dropHighest: 0, neverDrop: [] } }] })).toEqual(result);
  });
  it("drops the lowest quiz at each candidate and solves one remaining quiz", () => {
    const result = estimate([quiz("low", 100, 40), quiz("high", 100, 90), quiz("pending", 100, null)]);
    expect(result).toMatchObject({ currentPercent: 90, minimumFinalPercent: 65, maximumFinalPercent: 95, requiredPercent: 80,
      needs: [{ assignmentId: "pending", neededPoints: 80 }], warnings: { dropRuleMessages: ["Drop rules applied: 1 lowest dropped in Quizzes"] } });
  });
  it("does not count a future score that would be dropped", () => {
    expect(estimate([quiz("graded", 100, 80), quiz("pending", 100, null)], 1, 0, [], 90))
      .toMatchObject({ currentPercent: 80, minimumFinalPercent: 80, maximumFinalPercent: 100, requiredPercent: 90 });
    expect(estimate([quiz("graded", 100, 90), quiz("pending", 100, null)]))
      .toMatchObject({ status: "secured", requiredPercent: 0, needs: [] });
  });
  it("applies drop_highest and reports an unreachable target", () => {
    const work = [quiz("low", 100, 40), quiz("high", 100, 90), quiz("pending", 100, null)];
    expect(estimate(work, 0, 1, [], 60)).toMatchObject({ currentPercent: 40, requiredPercent: 80,
      warnings: { dropRuleMessages: ["Drop rules applied: 1 highest dropped in Quizzes"] } });
    expect(estimate(work, 0, 1)).toMatchObject({ status: "out_of_reach", maximumFinalPercent: 65, needs: [] });
  });
  it("protects never_drop IDs including future activities", () => {
    expect(estimate([quiz("low", 100, 40), quiz("high", 100, 90), quiz("pending", 100, null)], 1, 0, ["low"]))
      .toMatchObject({ currentPercent: 40, maximumFinalPercent: 70, status: "out_of_reach" });
    expect(estimate([quiz("graded", 100, 90), quiz("pending", 100, null)], 1, 0, ["pending"]))
      .toMatchObject({ requiredPercent: 85, minimumFinalPercent: 0 });
  });
  it("keeps at least one graded score with excessive combined drops", () => {
    expect(estimate([quiz("a", 100, 40), quiz("b", 100, 90), quiz("c", 100, 60)], 5, 5))
      .toMatchObject({ status: "complete", currentPercent: 90, warnings: { dropRuleMessages: [
        "Drop rules applied: 2 lowest dropped in Quizzes", "Drop rules applied: 0 highest dropped in Quizzes"] } });
    expect(estimate([quiz("only", 100, 70)], 10)).toMatchObject({ currentPercent: 70 });
    expect(estimate([], 10)).toMatchObject({ status: "no_gradable_work" });
  });
  it("breaks ties by ID independently of input order", () => {
    const work = [quiz("a", 10, 5), quiz("b", 100, 50), quiz("c", 100, 90)];
    expect(estimate(work)).toEqual(estimate([...work].reverse()));
    expect(estimate(work).currentPercent).toBe(70);
  });
  it("keeps hidden grades pending and excluded scores outside drop candidates", () => {
    const work = [quiz("low", 100, 40), quiz("high", 100, 90), { ...quiz("hidden", 100, null), hiddenGrade: true },
      { ...quiz("excluded", 100, 0), state: "excluded" as const }];
    expect(estimate(work)).toMatchObject({ currentPercent: 90, requiredPercent: 80, warnings: { hiddenGradeCount: 1 } });
  });
  it.each([0, 100])("applies rules with group weight %i", weight => {
    const work = [quiz("low", 100, 40), quiz("high", 100, 90), quiz("pending", 100, null)];
    const result = estimateGradeNeeds({ targetPercent: 85, canvasCurrentScore: null, assignments: work,
      groups: [{ ...group("quiz", weight), hasRules: true, rules: { dropLowest: 1, dropHighest: 0, neverDrop: [] } }] });
    expect(result).toMatchObject({ mode: weight ? "weighted" : "points", requiredPercent: 80 });
  });
  it("selects mode using the post-drop current score", () => {
    const input = { targetPercent: 70, groups: [{ ...group("quiz", 40), hasRules: true, rules: { dropLowest: 1, dropHighest: 0, neverDrop: [] } }, group("exam", 60)],
      assignments: [quiz("low", 20, 2), quiz("high", 20, 18), assignment("exam", 100, 50, "exam"), assignment("pending", 100, null, "exam")] };
    expect(estimateGradeNeeds({ ...input, canvasCurrentScore: 56.7 }).mode).toBe("points");
    expect(estimateGradeNeeds({ ...input, canvasCurrentScore: 66 }).mode).toBe("weighted");
  });
  it.each([false, true])("combines dropped quizzes with another group (weighted=%s)", weighted => {
    const result = estimateGradeNeeds({ targetPercent: 80, canvasCurrentScore: null,
      groups: [{ ...group("quiz", weighted ? 25 : 0), hasRules: true, rules: { dropLowest: 1, dropHighest: 0, neverDrop: [] } },
        group("exam", weighted ? 75 : 0)],
      assignments: [quiz("low", 100, 40), quiz("high", 100, 90), quiz("pending", 100, null),
        assignment("exam", 100, 60, "exam"), assignment("final", 100, null, "exam")] });
    expect(result).toMatchObject({ mode: weighted ? "weighted" : "points", requiredPercent: weighted ? 92.5 : 85 });
  });
  it("does not label a pending activity always dropped by highest as complete", () => {
    expect(estimate([quiz("graded", 100, 40), quiz("pending", 100, null)], 0, 1, ["graded"]))
      .toMatchObject({ status: "out_of_reach", maximumFinalPercent: 40 });
  });
  it("finds the earliest reachable range even when unequal points cause a downward jump", () => {
    // Before 50%, the future is dropped: (5+90)/110=86.36. At 50% it replaces the small quiz, yielding 54.55%.
    expect(estimate([quiz("a", 10, 5), quiz("high", 100, 90), quiz("pending", 1000, null)], 1, 0, [], 85))
      .toMatchObject({ status: "secured", requiredPercent: 0 });
    expect(estimate([quiz("a", 10, 5), quiz("high", 100, 90), quiz("pending", 1000, null)], 1, 0, [], 88))
      .toMatchObject({ status: "reachable", requiredPercent: 87.8 });
  });
});
