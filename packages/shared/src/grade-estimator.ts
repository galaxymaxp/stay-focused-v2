export type GradeEstimateMode = "weighted" | "points";
export type GradeEstimateStatus = "secured" | "reachable" | "out_of_reach" | "complete" | "no_gradable_work";

export interface GradeEstimateGroupInput {
  readonly id: string;
  readonly name: string;
  readonly weight: number | null;
  readonly hasRules: boolean;
  readonly rules?: GradeEstimateDropRules;
}
export interface GradeEstimateDropRules {
  readonly dropLowest: number;
  readonly dropHighest: number;
  /** IDs in the estimator's assignment namespace, translated by the API. */
  readonly neverDrop: readonly string[];
}
export interface GradeEstimateAssignmentInput {
  readonly id: string;
  readonly title: string;
  readonly groupId: string | null;
  readonly pointsPossible: number;
  readonly dueAt: string | null;
  /** graded = visible score; pending = no visible score yet; excluded = excused/omitted/unpublished/zero-point */
  readonly state: "graded" | "pending" | "excluded";
  readonly score: number | null;
  readonly hiddenGrade: boolean;
}
export interface GradeEstimateInput {
  readonly targetPercent: number;
  readonly groups: readonly GradeEstimateGroupInput[];
  readonly assignments: readonly GradeEstimateAssignmentInput[];
  readonly canvasCurrentScore: number | null;
}
export interface GradeEstimateNeed {
  readonly assignmentId: string;
  readonly title: string;
  readonly dueAt: string | null;
  readonly pointsPossible: number;
  readonly neededPoints: number;
}
export interface GradeEstimate {
  readonly mode: GradeEstimateMode;
  readonly status: GradeEstimateStatus;
  readonly targetPercent: number;
  readonly currentPercent: number | null;
  readonly minimumFinalPercent: number;
  readonly maximumFinalPercent: number;
  readonly requiredPercent: number | null;
  readonly needs: readonly GradeEstimateNeed[];
  readonly warnings: {
    readonly hasDropRules: boolean;
    readonly hiddenGradeCount: number;
    readonly differsFromCanvas: boolean;
    /** Final projection at the required uniform score (or perfect scores if unreachable). */
    readonly dropRuleMessages?: readonly string[];
  };
}

const UNGROUPED = "__ungrouped__";
const round1 = (value: number) => Math.round(value * 10) / 10;

interface Totals { earned: number; graded: number; remaining: number }

function simulateDrops(input: GradeEstimateInput, x: number | null) {
  const dropped = new Set<string>();
  const messages: string[] = [];
  for (const group of input.groups) {
    const rules = group.rules;
    if (!rules) {
      if (group.hasRules) messages.push(`Drop rules could not be applied in ${group.name}.`);
      continue;
    }
    const neverDrop = new Set(rules.neverDrop);
    const graded = input.assignments.filter(a => a.groupId === group.id && a.pointsPossible > 0 &&
      (a.state === "graded" && a.score !== null || x !== null && a.state === "pending"));
    const candidates = graded.filter(a => !neverDrop.has(a.id)).sort((a, b) => {
      const percentage = (a: GradeEstimateAssignmentInput) => a.state === "pending" ? x ?? 0 : (a.score ?? 0) / a.pointsPossible;
      return percentage(a) - percentage(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    });
    // Apply lowest first, then highest, while keeping at least one graded score.
    let budget = Math.max(0, graded.length - 1);
    const lowest = Math.min(rules.dropLowest, candidates.length, budget);
    for (const a of candidates.splice(0, lowest)) dropped.add(a.id);
    budget -= lowest;
    const highest = Math.min(rules.dropHighest, candidates.length, budget);
    for (const a of candidates.slice(candidates.length - highest)) dropped.add(a.id);
    if (rules.dropLowest > 0) messages.push(`Drop rules applied: ${lowest} lowest dropped in ${group.name}`);
    if (rules.dropHighest > 0) messages.push(`Drop rules applied: ${highest} highest dropped in ${group.name}`);
  }
  return { dropped, messages, totals: totalsByGroup(input.assignments.filter(a => !dropped.has(a.id))) };
}

function dropModel(input: GradeEstimateInput, mode: GradeEstimateMode) {
  return {
    current: model(mode, input.groups, simulateDrops(input, null).totals).current,
    final: (x: number) => model(mode, input.groups, simulateDrops(input, x).totals).final(x),
  };
}

/** Split at score-order changes: each open range has a fixed retained set and is linear. */
function solveDrops(input: GradeEstimateInput, final: (x: number) => number | null, target: number) {
  const boundaries = new Set([0, 1000]);
  for (const a of input.assignments) {
    if (a.state !== "graded" || a.score === null || !(a.pointsPossible > 0)) continue;
    const tick = a.score / a.pointsPossible * 1000;
    for (const n of [Math.floor(tick), Math.ceil(tick)]) if (n >= 0 && n <= 1000) boundaries.add(n);
  }
  const sorted = [...boundaries].sort((a, b) => a - b);
  const ranges: Array<readonly [number, number]> = [];
  for (const [index, tick] of sorted.entries()) {
    ranges.push([tick, tick]);
    const next = sorted[index + 1];
    if (next !== undefined && tick + 1 <= next - 1) ranges.push([tick + 1, next - 1]);
  }
  let required: number | null = null;
  let minimum = Infinity, maximum = -Infinity;
  for (const [start, end] of ranges) {
    const lowGrade = final(start / 1000), highGrade = final(end / 1000);
    if (lowGrade === null || highGrade === null) continue;
    minimum = Math.min(minimum, lowGrade, highGrade);
    maximum = Math.max(maximum, lowGrade, highGrade);
    if (required !== null || highGrade < target - 1e-9) continue;
    let low = start, high = end;
    // At most ten iterations per range; evaluate drops at every candidate.
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if ((final(mid / 1000) ?? -Infinity) >= target - 1e-9) high = mid;
      else low = mid + 1;
    }
    required = low / 1000;
  }
  return { required, minimum, maximum };
}

function totalsByGroup(assignments: readonly GradeEstimateAssignmentInput[]): Map<string, Totals> {
  const map = new Map<string, Totals>();
  for (const a of assignments) {
    if (a.state === "excluded" || !(a.pointsPossible > 0)) continue;
    const key = a.groupId ?? UNGROUPED;
    const t = map.get(key) ?? { earned: 0, graded: 0, remaining: 0 };
    if (a.state === "graded" && a.score !== null) {
      t.earned += a.score;
      t.graded += a.pointsPossible;
    } else {
      t.remaining += a.pointsPossible;
    }
    map.set(key, t);
  }
  return map;
}

/** Returns final(x) for x in [0,1] plus the current grade over graded work only, both as percents. */
function model(mode: GradeEstimateMode, groups: readonly GradeEstimateGroupInput[], totals: Map<string, Totals>) {
  if (mode === "points") {
    let earned = 0, graded = 0, remaining = 0;
    for (const t of totals.values()) { earned += t.earned; graded += t.graded; remaining += t.remaining; }
    const possible = graded + remaining;
    return {
      final: (x: number) => (possible > 0 ? ((earned + x * remaining) / possible) * 100 : null),
      current: graded > 0 ? (earned / graded) * 100 : null,
    };
  }
  const weights = new Map(groups.map((g) => [g.id, Math.max(0, g.weight ?? 0)]));
  const parts = [...totals.entries()]
    .map(([id, t]) => ({ w: weights.get(id) ?? 0, ...t }))
    .filter((p) => p.w > 0 && p.graded + p.remaining > 0);
  const totalWeight = parts.reduce((sum, p) => sum + p.w, 0);
  const gradedParts = parts.filter((p) => p.graded > 0);
  const gradedWeight = gradedParts.reduce((sum, p) => sum + p.w, 0);
  return {
    final: (x: number) =>
      totalWeight > 0
        ? (parts.reduce((sum, p) => sum + p.w * ((p.earned + x * p.remaining) / (p.graded + p.remaining)), 0) / totalWeight) * 100
        : null,
    current: gradedWeight > 0
      ? (gradedParts.reduce((sum, p) => sum + p.w * (p.earned / p.graded), 0) / gradedWeight) * 100
      : null,
  };
}

export function estimateGradeNeeds(input: GradeEstimateInput): GradeEstimate {
  const target = Math.min(150, Math.max(0, input.targetPercent));
  const totals = totalsByGroup(input.assignments);
  const anyWeight = input.groups.some((g) => (g.weight ?? 0) > 0);
  const hasDrops = input.groups.some(g => g.rules && (g.rules.dropLowest > 0 || g.rules.dropHighest > 0));
  const weighted = hasDrops ? dropModel(input, "weighted") : model("weighted", input.groups, totals);
  const points = hasDrops ? dropModel(input, "points") : model("points", input.groups, totals);

  let mode: GradeEstimateMode = anyWeight ? "weighted" : "points";
  if (anyWeight && input.canvasCurrentScore !== null && weighted.current !== null && points.current !== null) {
    mode = Math.abs(points.current - input.canvasCurrentScore) < Math.abs(weighted.current - input.canvasCurrentScore)
      ? "points" : "weighted";
  }
  const chosen = mode === "weighted" ? weighted : points;

  const solution = hasDrops ? solveDrops(input, chosen.final, target) : null;
  const projection = simulateDrops(input, solution?.required ?? 1);
  const warnings = {
    hasDropRules: input.groups.some((g) => g.hasRules),
    hiddenGradeCount: input.assignments.filter((a) => a.hiddenGrade && a.state === "pending").length,
    differsFromCanvas:
      input.canvasCurrentScore !== null && chosen.current !== null &&
      Math.abs(chosen.current - input.canvasCurrentScore) > 2,
    ...(input.groups.some(g => g.hasRules || g.rules && (g.rules.dropLowest > 0 || g.rules.dropHighest > 0 || g.rules.neverDrop.length > 0))
      ? { dropRuleMessages: projection.messages } : {}),
  };

  const min = solution && Number.isFinite(solution.minimum) ? solution.minimum : chosen.final(0);
  const max = solution && Number.isFinite(solution.maximum) ? solution.maximum : chosen.final(1);
  if (min === null || max === null) {
    return { mode, status: "no_gradable_work", targetPercent: target, currentPercent: null,
      minimumFinalPercent: 0, maximumFinalPercent: 0, requiredPercent: null, needs: [], warnings };
  }
  const base = { mode, targetPercent: target, currentPercent: chosen.current === null ? null : round1(chosen.current),
    minimumFinalPercent: round1(min), maximumFinalPercent: round1(max), warnings };

  const span = max - min;
  if (span <= 1e-9 && (!hasDrops || !input.assignments.some(a => a.state === "pending" && a.pointsPossible > 0))) {
    return { ...base, status: "complete", requiredPercent: null, needs: [] };
  }
  const x = solution ? solution.required ?? Infinity : (target - min) / span;
  // A flat projection can still have pending work that all gets dropped.
  if (solution && span <= 1e-9 && input.assignments.some(a => a.state === "pending" && a.pointsPossible > 0)) {
    return { ...base, status: target <= min ? "secured" : "out_of_reach", requiredPercent: target <= min ? 0 : null, needs: [] };
  }
  if (x <= 0) return { ...base, status: "secured", requiredPercent: 0, needs: [] };
  if (x > 1 + 1e-9) return { ...base, status: "out_of_reach", requiredPercent: null, needs: [] };

  const retainedProjection = hasDrops ? simulateDrops(input, x) : null;
  const needs = input.assignments
    .filter((a) => a.state === "pending" && a.pointsPossible > 0 &&
      !retainedProjection?.dropped.has(a.id) &&
      (mode === "points" || ((input.groups.find((g) => g.id === a.groupId)?.weight ?? 0) > 0)))
    .map((a) => ({ assignmentId: a.id, title: a.title, dueAt: a.dueAt, pointsPossible: a.pointsPossible,
      neededPoints: Math.ceil(x * a.pointsPossible * 10 - 1e-9) / 10 }))
    .sort((l, r) => (l.dueAt ? Date.parse(l.dueAt) : Infinity) - (r.dueAt ? Date.parse(r.dueAt) : Infinity));

  return { ...base, status: "reachable", requiredPercent: Math.ceil(x * 1000 - 1e-9) / 10, needs };
}
