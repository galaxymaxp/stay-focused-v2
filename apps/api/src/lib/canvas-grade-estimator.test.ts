import { describe, expect, it } from "vitest";
import { estimateCanvasCourseGrade } from "./canvas-grade-read-model";
import { GRADE_COURSE, GRADE_OWNER, gradeEstimateStore } from "./canvas-grade-estimator.fixtures";
const estimate = (store: ReturnType<typeof gradeEstimateStore>) => estimateCanvasCourseGrade({ client: store.client, courseId: GRADE_COURSE, userId: GRADE_OWNER, targetPercent: 85 });
describe("grade estimate read model", () => {
  it("applies owner, connection and course filters to every data query", async () => {
    const store = gradeEstimateStore(); await estimate(store);
    for (const query of store.queries) {
      expect(query.filters).toContainEqual(["user_id", GRADE_OWNER]);
      if (query.table.startsWith("canvas_assignment") || query.table === "canvas_course_grade_summaries") {
        expect(query.filters).toContainEqual(["course_id", GRADE_COURSE]);
        expect(query.filters).toContainEqual(["canvas_connection_id", "connection"]);
      }
    }
  });
  it("treats hidden scores as pending and never uses their underlying values", async () => {
    const store = gradeEstimateStore(); const submission = store.tables.canvas_assignment_submissions![0]!;
    submission.score_visibility_state = "hidden"; submission.normalized_status = "graded_hidden";
    store.tables.canvas_course_grade_summaries![0]!.current_score_visibility_state = "hidden";
    const first = await estimate(store);
    submission.score = 99999; store.tables.canvas_course_grade_summaries![0]!.current_score = 99999;
    expect(await estimate(store)).toEqual(first);
    expect(first).toMatchObject({ value: { currentPercent: null, warnings: { hiddenGradeCount: 1 } } });
  });
  it.each(["omit", "unpublished", "zero", "excused", "null"])("excludes %s work", async kind => {
    const store = gradeEstimateStore(); const pending = store.tables.canvas_assignments![1]!;
    if (kind === "omit") pending.omit_from_final_grade = true;
    if (kind === "unpublished") pending.published = false;
    if (kind === "zero") pending.points_possible = 0;
    if (kind === "null") pending.points_possible = null;
    if (kind === "excused") store.tables.canvas_assignment_submissions!.push({ ...store.context, id: "excused", assignment_id: "pending", excused: true });
    expect(await estimate(store)).toMatchObject({ value: { status: "complete", needs: [] } });
  });
  it.each([{ rules: {}, expected: false }, { rules: { drop_lowest: 0, never_drop: [] }, expected: false },
    { rules: { drop_highest: 1 }, expected: true }, { rules: { never_drop: [1] }, expected: true }])("handles effective drop rules %j", async ({ rules, expected }) => {
    const store = gradeEstimateStore(); store.tables.canvas_assignment_groups![0]!.rules = rules;
    expect(await estimate(store)).toMatchObject({ value: { warnings: { hasDropRules: expected } } });
  });
  it("completes pagination for courses exceeding a Data API page", async () => {
    const store = gradeEstimateStore(); store.tables.canvas_assignments = Array.from({ length: 1201 }, (_, i) => ({ ...store.context,
      id: String(i), name: "Pending", points_possible: 10, assignment_group_id: "group", due_at: null, published: true }));
    const result = await estimate(store);
    expect(result).toMatchObject({ ok: true, value: { currentPercent: null } });
    if (result.ok) expect(result.value.needs).toHaveLength(1201);
  });
  it.each([101, "101"])("translates never_drop Canvas ID %s into the stored assignment namespace", async id => {
    const store = gradeEstimateStore();
    store.tables.canvas_assignment_groups![0]!.rules = { drop_lowest: 1, never_drop: [id] };
    expect(await estimate(store)).toMatchObject({ value: { currentPercent: 80, status: "out_of_reach", requiredPercent: null,
      warnings: { dropRuleMessages: ["Drop rules applied: 1 lowest dropped in Coursework"] } } });
    expect(store.queries.find(query => query.table === "canvas_assignments")?.columns).toContain("canvas_assignment_id");
  });
  it("passes highest counts through and ignores never_drop IDs outside the owned course", async () => {
    const store = gradeEstimateStore();
    store.tables.canvas_assignment_groups![0]!.rules = { drop_highest: 1, never_drop: [999] };
    expect(await estimate(store)).toMatchObject({ value: { status: "out_of_reach", maximumFinalPercent: 80,
      warnings: { dropRuleMessages: ["Drop rules applied: 1 highest dropped in Coursework"] } } });
  });
  it("keeps hidden grades pending under drop rules without using private values", async () => {
    const store = gradeEstimateStore();
    store.tables.canvas_assignment_groups![0]!.rules = { drop_lowest: 1 };
    store.tables.canvas_assignment_submissions![0]!.score_visibility_state = "hidden";
    const first = await estimate(store);
    store.tables.canvas_assignment_submissions![0]!.score = 99999;
    expect(await estimate(store)).toEqual(first);
    expect(first).toMatchObject({ value: { currentPercent: null, requiredPercent: 85, warnings: { hiddenGradeCount: 1 } } });
  });
  it.each([{ drop_lowest: -1 }, { drop_highest: 1.5 }, { drop_lowest: "1" }, { drop_lowest: 1, never_drop: [true] }, { drop_lowest: 1, never_drop: ["0"] }])(
    "warns rather than partially applying malformed rules %j", async rules => {
      const store = gradeEstimateStore(); store.tables.canvas_assignment_groups![0]!.rules = rules;
      expect(await estimate(store)).toMatchObject({ value: { requiredPercent: 90,
        warnings: { dropRuleMessages: ["Drop rules could not be applied in Coursework."] } } });
    });
  it("rejects deselected courses and maps storage failures to safe errors", async () => {
    const store = gradeEstimateStore(); store.tables.canvas_course_sync_preferences![0]!.selected = false;
    expect(await estimate(store)).toMatchObject({ ok: false, status: 400, code: "canvas_course_not_selected" });
    store.tables.canvas_course_sync_preferences![0]!.selected = true; store.state.failTable = "canvas_assignments";
    const result = await estimate(store);
    expect(result).toMatchObject({ ok: false, status: 500, code: "canvas_grade_data_unavailable" });
    expect(JSON.stringify(result)).not.toContain("private diagnostics");
  });
});
