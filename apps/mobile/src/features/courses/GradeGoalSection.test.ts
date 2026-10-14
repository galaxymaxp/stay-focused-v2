import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GradeEstimate } from "@stay-focused/shared/grade-estimator";
const mocks = vi.hoisted(() => ({ getItem: vi.fn(), setItem: vi.fn(), estimate: vi.fn() }));
vi.mock("../../auth/sessionStore", () => ({ sessionStore: { getItem: mocks.getItem, setItem: mocks.setItem } }));
vi.mock("../../services/canvasApi", () => ({ getCanvasCourseGradeEstimate: mocks.estimate }));
vi.mock("../../config/apiBaseUrl", () => ({ getApiBaseUrl: () => "http://localhost:3000" }));
vi.mock("react-native", () => ({ Text: "Text", View: "View", StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock("../../components/Button", () => ({ Button: "Button" }));
vi.mock("../../components/Card", () => ({ Card: "Card" }));
vi.mock("../../components/TextField", () => ({ TextField: "TextField" }));
vi.mock("../../design/theme", () => ({ useLegacyTheme: () => ({}) }));
const { GradeGoalSection } = await import("./GradeGoalSection");
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let rendered: ReactTestRenderer | undefined;
const props = { courseId: "course", userId: "owner", accessToken: "token", lastSyncedAt: "2026-10-12T00:00:00Z" };
const result: GradeEstimate = { mode: "points", status: "reachable", targetPercent: 90, currentPercent: 80, minimumFinalPercent: 40,
  maximumFinalPercent: 90, requiredPercent: 100, needs: [{ assignmentId: "lab", title: "Lab 5", dueAt: "2026-10-15T00:00:00Z", pointsPossible: 20, neededPoints: 20 }],
  warnings: { hasDropRules: false, hiddenGradeCount: 0, differsFromCanvas: false } };
beforeEach(() => { vi.resetAllMocks(); mocks.getItem.mockResolvedValue(null); mocks.setItem.mockResolvedValue(undefined); mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: result } }); });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
async function render() { await act(async () => { rendered = create(createElement(GradeGoalSection, props)); }); }
function byId(id: string) { return rendered!.root.find(node => node.props.testID === id); }
function text() { return rendered!.root.findAll(node => String(node.type) === "Text").map(node => ([] as unknown[]).concat(node.props.children).join("")).join("\n"); }
async function calculate() {
  await act(async () => byId("grade-goal-target").props.onChangeText("90"));
  await act(async () => byId("grade-goal-calculate").props.onPress());
}
describe("Grade goal", () => {
  it.each([
    ["secured", "You'll reach 90% even if you score zero on the rest."],
    ["reachable", "Aim for about 100% on each remaining activity."],
    ["out_of_reach", "Even with perfect scores, the highest you can reach is 90%."],
    ["complete", "Everything in this course is graded. Your grade is 80%."],
    ["no_gradable_work", "There's no graded work to estimate from yet."],
  ] as const)("renders the %s result", async (status, message) => {
    mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: { ...result, status, needs: status === "reachable" ? result.needs : [] } } });
    await render(); await calculate(); expect(text()).toContain(message);
    expect(text()).toContain("Planning estimate");
    expect(text()).toContain("Based on your synced Canvas grades. Last synced");
    if (status === "reachable") { expect(text()).toContain("Lab 5"); expect(text()).toContain("20 / 20"); expect(text()).toContain("Due"); }
  });
  it.each([
    [1, "1 grade is hidden by your instructor and is treated as not yet graded."],
    [2, "2 grades are hidden by your instructor and are treated as not yet graded."],
  ])("renders hidden-grade copy for %i", async (hiddenGradeCount, message) => {
    mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: { ...result, warnings: { ...result.warnings, hiddenGradeCount } } } });
    await render(); await calculate();
    expect(text()).toContain(message);
  });
  it("renders all caveats under the result", async () => {
    mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: { ...result, warnings: { hasDropRules: true, hiddenGradeCount: 2, differsFromCanvas: true } } } });
    await render(); await calculate();
    expect(text()).toContain("This estimate could not apply the course's drop rules.");
    expect(text()).toContain("2 grades are hidden by your instructor and are treated as not yet graded.");
    expect(text()).toContain("Canvas calculates this course a little differently. Treat this as a rough guide.");
  });
  it("renders applied drop details with the existing caveat styles", async () => {
    mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: { ...result, warnings: { ...result.warnings,
      hasDropRules: true, dropRuleMessages: ["Drop rules applied: 1 lowest dropped in Quizzes", "Drop rules applied: 2 highest dropped in Exams"] } } } });
    await render(); await calculate();
    expect(text()).toContain("Drop rules applied: 1 lowest dropped in Quizzes");
    expect(text()).toContain("Drop rules applied: 2 highest dropped in Exams");
    expect(text()).not.toContain("could not apply");
    expect(text()).not.toContain("real requirement may be lower");
  });
  it("does not warn for never_drop-only rules with nothing dropped", async () => {
    mocks.estimate.mockResolvedValue({ ok: true, data: { estimate: { ...result,
      warnings: { ...result.warnings, hasDropRules: true, dropRuleMessages: [] } } } });
    await render(); await calculate();
    expect(text()).not.toContain("could not apply");
  });
  it("starts empty and restores and remembers only this account/course target", async () => {
    await render(); expect(byId("grade-goal-target").props.value).toBe("");
    await act(async () => rendered!.unmount()); rendered = undefined;
    mocks.getItem.mockResolvedValue("85.5");
    await render(); expect(byId("grade-goal-target").props.value).toBe("85.5");
    expect(mocks.getItem).toHaveBeenCalledWith("sf.grade-goal.v1.owner.course");
    await calculate(); expect(mocks.setItem).toHaveBeenCalledWith("sf.grade-goal.v1.owner.course", "90");
    expect(mocks.estimate).toHaveBeenCalledWith(expect.objectContaining({ courseId: "course", targetPercent: 90, accessToken: "token" }));
  });
  it("validates input and offers retry after a request error", async () => {
    await render();
    await act(async () => byId("grade-goal-calculate").props.onPress());
    expect(text()).toContain("Enter a target between 1 and 100."); expect(mocks.estimate).not.toHaveBeenCalled();
    mocks.estimate.mockResolvedValueOnce({ ok: false, error: { message: "Could not connect." } });
    await calculate(); expect(text()).toContain("Could not connect.");
    await act(async () => byId("grade-goal-retry").props.onPress()); expect(byId("grade-goal-result")).toBeDefined();
  });
  it("shows loading and discards a pending result when the target changes", async () => {
    let resolve: (value: unknown) => void = () => {};
    mocks.estimate.mockReturnValue(new Promise(next => { resolve = next; }));
    await render(); await calculate(); expect(text()).toContain("Calculating grade goal...");
    await act(async () => byId("grade-goal-target").props.onChangeText("80"));
    await act(async () => resolve({ ok: true, data: { estimate: result } }));
    expect(rendered!.root.findAll(node => node.props.testID === "grade-goal-result")).toHaveLength(0);
  });
});
