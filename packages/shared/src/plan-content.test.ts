import { afterEach, describe, expect, it, vi } from "vitest";

import { parsePlannerPreferences, PlanModeSync } from "./orb-preference-sync";
import {
  DEFAULT_PLAN_MODE,
  generateContentStudyPlan,
  generateDeterministicStudyPlan,
  isReviewerProposal,
  PLAN_EMPTY_COPY,
  PLAN_MODE_LABELS,
  PLAN_MODES,
  planEmptyMessage,
  PlanningValidationError,
  proposalTargetKey,
  proposalTitle,
  reviewerBlockMinutes,
  selectReviewerCandidates,
  validateStudyPlanningRequest,
  type PlannerReviewer,
  type PlannerTask,
  type PlanMode,
  type ProposedStudySession,
  type ReviewerCandidateSource,
} from "./task-planning";

afterEach(() => vi.useRealTimers());

const DAY = { startsAt: "2026-10-24T00:00:00.000Z", endsAt: "2026-10-25T00:00:00.000Z" } as const;
const at = (hour: number, minute = 0) =>
  `2026-10-24T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00.000Z`;
const free = (from: number, to: number) => [{ startsAt: at(from), endsAt: at(to) }];
const uuid = (prefix: string, n: number) => `${prefix}0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const task = (n: number, minutes: number, extra: Partial<PlannerTask> = {}): PlannerTask => ({
  id: uuid("a", n), title: `Task ${n}`, dueAt: null, estimatedMinutes: minutes, priority: "medium",
  createdAt: `2026-10-0${n}T00:00:00.000Z`, ...extra,
});
const reviewer = (n: number, estimate: number | null, courseId = "course-1"): PlannerReviewer => ({
  id: uuid("b", n), title: `Reviewer ${n}`, courseId, estimatedMinutes: estimate,
});
const minutes = (sessions: readonly ProposedStudySession[], kind: "task" | "reviewer") =>
  sessions.filter((session) => (isReviewerProposal(session) ? "reviewer" : "task") === kind)
    .reduce((sum, session) => sum + session.durationMinutes, 0);

function expectNoOverlapInside(sessions: readonly ProposedStudySession[], from: string, to: string) {
  const sorted = [...sessions].sort((left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt));
  for (const [index, session] of sorted.entries()) {
    expect(Date.parse(session.startsAt)).toBeGreaterThanOrEqual(Date.parse(from));
    expect(Date.parse(session.endsAt)).toBeLessThanOrEqual(Date.parse(to));
    expect(Date.parse(session.endsAt) - Date.parse(session.startsAt)).toBe(session.durationMinutes * 60_000);
    if (index > 0) expect(Date.parse(session.startsAt)).toBeGreaterThanOrEqual(Date.parse(sorted[index - 1]!.endsAt));
  }
}

describe("plan mode contract", () => {
  it("accepts each mode, keeps omitted requests mode-free and rejects anything else", () => {
    const base = { planningRange: DAY, availability: free(9, 11) };
    for (const mode of PLAN_MODES) {
      const result = validateStudyPlanningRequest({ ...base, mode });
      expect(result).toMatchObject({ ok: true, value: { mode } });
    }
    const omitted = validateStudyPlanningRequest(base);
    expect(omitted.ok && "mode" in omitted.value).toBe(false);
    for (const mode of ["Reviewers", "both", "", null, 1, ["tasks"]]) {
      expect(validateStudyPlanningRequest({ ...base, mode })).toMatchObject({ ok: false, code: "invalid_request" });
    }
    expect(DEFAULT_PLAN_MODE).toBe("reviewers_tasks");
    expect(PLAN_MODE_LABELS).toEqual({ reviewers: "Reviewers", tasks: "Tasks", reviewers_tasks: "Reviewers & tasks" });
  });

  it("clamps reviewer blocks to 10-45 minutes and defaults to 20", () => {
    expect(reviewerBlockMinutes(null)).toBe(20);
    expect(reviewerBlockMinutes(5)).toBe(10);
    expect(reviewerBlockMinutes(10)).toBe(10);
    expect(reviewerBlockMinutes(30)).toBe(30);
    expect(reviewerBlockMinutes(45)).toBe(45);
    expect(reviewerBlockMinutes(120)).toBe(45);
  });
});

describe("content-aware Today planner", () => {
  it("tasks mode is exactly the deterministic task plan plus the mode", () => {
    const tasks = [task(1, 60), task(2, 90, { dueAt: at(10) })];
    const plan = generateContentStudyPlan({ mode: "tasks", tasks, reviewers: [reviewer(1, 20)], planningRange: DAY, availability: free(9, 12) });
    expect(plan).toEqual({
      ...generateDeterministicStudyPlan({ tasks, planningRange: DAY, availability: free(9, 12) }),
      mode: "tasks", candidates: { tasks: 2, reviewers: 0 },
    });
    expect(plan.sessions.some(isReviewerProposal)).toBe(false);
  });

  it("reviewers mode plans one contiguous block per reviewer in order and never task work", () => {
    const plan = generateContentStudyPlan({
      mode: "reviewers", tasks: [task(1, 60)],
      reviewers: [reviewer(1, 30), reviewer(2, null), reviewer(3, 5), reviewer(4, 90)],
      planningRange: DAY, availability: free(9, 11),
    });
    expect(plan.sessions.map((session) => [proposalTitle(session), session.startsAt, session.durationMinutes])).toEqual([
      ["Reviewer 1", at(9), 30], ["Reviewer 2", at(9, 30), 20], ["Reviewer 3", at(9, 50), 10], ["Reviewer 4", at(10), 45],
    ]);
    expect(plan.sessions.every(isReviewerProposal)).toBe(true);
    expect(plan.sessions.map((session) => session.proposalId)).toEqual(["session-001", "session-002", "session-003", "session-004"]);
    expect(plan.unscheduledWork).toEqual([]);
    expect(plan.candidates).toEqual({ tasks: 0, reviewers: 4 });
    expect(new Set(plan.sessions.map(proposalTargetKey)).size).toBe(4);
    expectNoOverlapInside(plan.sessions, at(9), at(11));
  });

  it("skips a reviewer that fits no remaining time instead of splitting or overbooking", () => {
    const plan = generateContentStudyPlan({
      mode: "reviewers", tasks: [],
      reviewers: [reviewer(1, 45), reviewer(2, 30), reviewer(3, 10)],
      planningRange: DAY, availability: [{ startsAt: at(9), endsAt: at(9, 50) }, { startsAt: at(12), endsAt: at(12, 30) }],
    });
    expect(plan.sessions.map((session) => [proposalTitle(session), session.startsAt])).toEqual([
      ["Reviewer 1", at(9)], ["Reviewer 2", at(12)],
    ]);
    // Reviewer 3 fits the 5 minutes left? No: 10 > 5, and the 12:30 window is full.
    expect(plan.sessions).toHaveLength(2);
  });

  it("combined mode gives tasks at most 60% first, then reviewers, then leftover time to tasks", () => {
    // 4 h free: tasks capped at 144 min, reviewers next, remaining task work after.
    const plan = generateContentStudyPlan({
      mode: "reviewers_tasks",
      tasks: [task(1, 120, { dueAt: at(23) }), task(2, 120)],
      reviewers: [reviewer(1, 30), reviewer(2, 20)],
      planningRange: DAY, availability: free(9, 13),
    });
    expect(plan.sessions.map((session) => [proposalTitle(session), session.startsAt, session.durationMinutes])).toEqual([
      ["Task 1", at(9), 90], ["Task 1", at(10, 30), 30], ["Task 2", at(11), 24],
      ["Reviewer 1", at(11, 24), 30], ["Reviewer 2", at(11, 54), 20], ["Task 2", at(12, 14), 46],
    ]);
    expect(minutes(plan.sessions.slice(0, 3), "task")).toBe(144);
    expect(minutes(plan.sessions, "reviewer")).toBe(50);
    expect(plan.unscheduledWork).toEqual([{
      taskId: uuid("a", 2), taskTitle: "Task 2", estimatedMinutes: 120, scheduledMinutes: 70, unscheduledMinutes: 50,
      reason: "insufficient_availability",
    }]);
    expect(plan.candidates).toEqual({ tasks: 2, reviewers: 2 });
    expectNoOverlapInside(plan.sessions, at(9), at(13));
    expect(plan.sessions.map((session) => session.proposalId)).toEqual(
      ["session-001", "session-002", "session-003", "session-004", "session-005", "session-006"]);
  });

  it("combined mode joins capped task work into one block when no reviewer fits between", () => {
    const plan = generateContentStudyPlan({
      mode: "reviewers_tasks", tasks: [task(1, 80)], reviewers: [],
      planningRange: DAY, availability: free(9, 10),
    });
    // 60 min free: 36 min cap, no reviewers, then the remainder continues the same block.
    expect(plan.sessions.map((session) => [proposalTitle(session), session.startsAt, session.durationMinutes])).toEqual([
      ["Task 1", at(9), 60],
    ]);
    expect(plan.unscheduledWork[0]).toMatchObject({ scheduledMinutes: 60, unscheduledMinutes: 20 });
  });

  it("combined mode gives all time to reviewers when there are no tasks", () => {
    const plan = generateContentStudyPlan({
      mode: "reviewers_tasks", tasks: [], reviewers: [reviewer(1, 45), reviewer(2, 45)],
      planningRange: DAY, availability: free(9, 10),
    });
    expect(plan.sessions.map(proposalTitle)).toEqual(["Reviewer 1"]);
    expect(planEmptyMessage(plan)).toBeNull();
  });

  it("never duplicates a reviewer or plans one beyond the reviewer cap", () => {
    expect(() => generateContentStudyPlan({ mode: "reviewers", tasks: [], reviewers: [reviewer(1, 20), reviewer(1, 20)], planningRange: DAY, availability: free(9, 11) }))
      .toThrow(PlanningValidationError);
    const many = Array.from({ length: 201 }, (_, index) => reviewer(index + 1, 10));
    expect(() => generateContentStudyPlan({ mode: "reviewers", tasks: [], reviewers: many, planningRange: DAY, availability: free(9, 11) }))
      .toThrow(/At most 200 reviewers/);
    expect(() => generateContentStudyPlan({ mode: "reviewers", tasks: [], reviewers: [{ ...reviewer(1, 20), id: "not-a-uuid" }], planningRange: DAY, availability: free(9, 11) }))
      .toThrow(PlanningValidationError);
    expect(() => generateContentStudyPlan({ mode: "both" as PlanMode, tasks: [], reviewers: [], planningRange: DAY, availability: free(9, 11) }))
      .toThrow(PlanningValidationError);
  });

  it("uses the decided empty copy and never falls back to the excluded kind", () => {
    const reviewersOnly = generateContentStudyPlan({ mode: "reviewers", tasks: [task(1, 30)], reviewers: [], planningRange: DAY, availability: free(9, 11) });
    expect(reviewersOnly.sessions).toEqual([]);
    expect(planEmptyMessage(reviewersOnly)).toBe("No saved reviewers to plan yet.");
    const tasksOnly = generateContentStudyPlan({ mode: "tasks", tasks: [], reviewers: [reviewer(1, 20)], planningRange: DAY, availability: free(9, 11) });
    expect(tasksOnly.sessions).toEqual([]);
    expect(planEmptyMessage(tasksOnly)).toBe("No open tasks to plan.");
    const both = generateContentStudyPlan({ mode: "reviewers_tasks", tasks: [], reviewers: [], planningRange: DAY, availability: free(9, 11) });
    expect(planEmptyMessage(both)).toBe(PLAN_EMPTY_COPY.reviewers_tasks);
    // No space is not "no candidates": the copy stays quiet.
    const full = generateContentStudyPlan({ mode: "reviewers", tasks: [], reviewers: [reviewer(1, 45)], planningRange: DAY, availability: [{ startsAt: at(9), endsAt: at(9, 5) }] });
    expect(full.sessions).toEqual([]);
    expect(planEmptyMessage(full)).toBeNull();
    // Omitted-mode plans carry no candidates and no copy.
    expect(planEmptyMessage(generateDeterministicStudyPlan({ tasks: [], planningRange: DAY, availability: free(9, 11) }))).toBeNull();
  });
});

describe("reviewer candidate selection", () => {
  const now = Date.parse("2026-10-24T12:00:00.000Z");
  const source = (n: number, extra: Partial<ReviewerCandidateSource> = {}): ReviewerCandidateSource => ({
    id: uuid("c", n), title: `Reviewer ${n}`, courseId: "current-a", createdAt: `2026-10-${String(10 + n).padStart(2, "0")}T00:00:00.000Z`,
    reviewMinutes: 15, lastOpenedAt: null, ...extra,
  });

  it("keeps only current-course reviewers not opened in 24 hours and not already kept today", () => {
    const result = selectReviewerCandidates({
      reviewers: [
        source(1), source(2, { courseId: "past" }), source(3, { courseId: null }),
        source(4, { lastOpenedAt: "2026-10-24T01:00:00.000Z" }), source(5, { lastOpenedAt: "2026-10-23T12:00:00.000Z" }),
        source(6), source(1), source(7, { id: "bad" }),
      ],
      currentCourseIds: new Set(["current-a", "current-b"]),
      nextDueByCourse: new Map(), excludedIds: new Set([uuid("c", 6)]), now,
    });
    expect(result.map((reviewer) => reviewer.title)).toEqual(["Reviewer 1", "Reviewer 5"]);
    expect(result[0]).toEqual({ id: uuid("c", 1), title: "Reviewer 1", courseId: "current-a", estimatedMinutes: 15 });
  });

  it("orders by nearest upcoming course task, then least recently opened, then newest", () => {
    const result = selectReviewerCandidates({
      reviewers: [
        source(1, { courseId: "current-b" }),
        source(2, { lastOpenedAt: "2026-10-20T00:00:00.000Z" }),
        source(3, { lastOpenedAt: "2026-10-18T00:00:00.000Z" }),
        source(4), source(5), source(6, { courseId: "current-c" }),
      ],
      currentCourseIds: new Set(["current-a", "current-b", "current-c"]),
      nextDueByCourse: new Map([["current-a", Date.parse("2026-10-25T00:00:00Z")], ["current-b", Date.parse("2026-10-27T00:00:00Z")]]),
      excludedIds: new Set(), now,
    });
    expect(result.map((reviewer) => reviewer.title)).toEqual([
      "Reviewer 5", "Reviewer 4", "Reviewer 3", "Reviewer 2", "Reviewer 1", "Reviewer 6",
    ]);
  });

  it("caps the candidate list at the planner limit", () => {
    const reviewers = Array.from({ length: 250 }, (_, index) => source(index + 1, { id: uuid("d", index + 1) }));
    expect(selectReviewerCandidates({ reviewers, currentCourseIds: new Set(["current-a"]), nextDueByCourse: new Map(), excludedIds: new Set(), now }))
      .toHaveLength(200);
  });
});

describe("plan mode preference sync", () => {
  it("parses exactly one valid planMode key", () => {
    for (const mode of PLAN_MODES) expect(parsePlannerPreferences({ planMode: mode })).toEqual({ planMode: mode });
    for (const value of [null, [], {}, { planMode: "both" }, { planMode: "tasks", orbColor: "gold" }]) {
      expect(() => parsePlannerPreferences(value)).toThrow();
    }
  });

  it("debounces choices into one save, keeps unavailable choices durable and applies server values", async () => {
    vi.useFakeTimers();
    let pending: string | null = null;
    const request = vi.fn().mockRejectedValueOnce({ code: "profile_preferences_unavailable" })
      .mockResolvedValue({ planMode: "reviewers" });
    const apply = vi.fn();
    const options = { readPending: async () => pending, writePending: async (mode: PlanMode | null) => { pending = mode; }, request, apply };
    const first = new PlanModeSync(options);
    first.choose("tasks"); await vi.advanceTimersByTimeAsync(300); first.choose("reviewers");
    await vi.advanceTimersByTimeAsync(600);
    expect(request).toHaveBeenCalledExactlyOnceWith("reviewers");
    expect(pending).toBe("reviewers"); expect(apply).not.toHaveBeenCalled(); first.dispose();
    const second = new PlanModeSync(options);
    await second.refresh();
    expect(request).toHaveBeenLastCalledWith("reviewers"); expect(apply).toHaveBeenLastCalledWith("reviewers");
    await Promise.resolve(); expect(pending).toBe(null); second.dispose();
  });

  it("ignores invalid server values and disposed owners", async () => {
    const apply = vi.fn();
    const sync = new PlanModeSync({ readPending: async () => null, writePending: async () => {}, request: async () => ({ planMode: "both" as PlanMode }), apply });
    await sync.refresh(); expect(apply).not.toHaveBeenCalled(); sync.dispose();
    const disposed = new PlanModeSync({ readPending: async () => "tasks", writePending: async () => {}, request: async () => ({ planMode: "tasks" }), apply });
    disposed.dispose(); await disposed.refresh(); expect(apply).not.toHaveBeenCalled();
  });
});
