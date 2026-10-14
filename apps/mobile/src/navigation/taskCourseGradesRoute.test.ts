import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ params: {} as Record<string, unknown>, canGoBack: vi.fn(), back: vi.fn(), replace: vi.fn() }));
vi.mock("expo-router", () => ({ router: mocks, useLocalSearchParams: () => mocks.params }));
vi.mock("../features/courses/CanvasGradeScreen", () => ({ CanvasGradeScreen: "CanvasGradeScreen" }));
const { default: Route } = await import("../../app/(app)/(tabs)/work/[courseKey]/grades");
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.params = { courseKey: "course-1", courseId: "course-1", courseName: "Course One" };
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
async function screen() {
  await act(async () => { rendered = create(createElement(Route)); });
  return rendered!.root.find(node => String(node.type) === "CanvasGradeScreen");
}
describe("Tasks course Grades route", () => {
  it("renders the shared screen with course identity and returns within Tasks", async () => {
    const gradeScreen = await screen();
    expect(gradeScreen.props).toMatchObject({ courseId: "course-1", courseName: "Course One" });
    gradeScreen.props.onBackToCourses();
    expect(mocks.replace).toHaveBeenCalledWith({ pathname: "/work/[courseKey]", params: { courseKey: "course-1" } });
  });
  it("walks the Tasks history when opened from its course", async () => {
    mocks.canGoBack.mockReturnValue(true);
    (await screen()).props.onBackToCourses();
    expect(mocks.back).toHaveBeenCalledOnce();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
  it("falls back to Tasks when no course key is available", async () => {
    mocks.params = {};
    const gradeScreen = await screen();
    expect(gradeScreen.props).toMatchObject({ courseId: "", courseName: "Course" });
    gradeScreen.props.onBackToCourses();
    expect(mocks.replace).toHaveBeenCalledWith("/work");
  });
});
