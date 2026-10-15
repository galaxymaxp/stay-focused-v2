import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import type { TaskView } from "@stay-focused/shared/task-planning";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({ View: "View", Text: "Text", Pressable: "Pressable", KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { select: () => undefined }, StyleSheet: { create: (styles: unknown) => styles } }));
vi.mock("../../design/theme", () => ({ useLegacyTheme: () => ({}) }));
vi.mock("../../components/Button", () => ({ Button: "Button" }));
vi.mock("../../components/Screen", () => ({ Screen: "Screen" }));
vi.mock("../../components/TextField", () => ({ TextField: "TextField" }));
const { TaskEditor } = await import("./TaskEditor");
const { TaskRow } = await import("./TaskRow");
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let rendered: ReactTestRenderer | undefined;
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
function task(source: TaskView["estimateSource"]): TaskView {
  return { id: "one", title: "Quiz", notes: null, status: "pending", priority: "medium", dueAt: null, estimatedMinutes: 45,
    estimateSource: source, estimateNote: "Short quiz", sourceType: "canvas", canvasConnectionId: null,
    canvasCourseId: null, canvasAssignmentId: null, createdAt: "2026-10-12T00:00:00Z", updatedAt: "2026-10-12T00:00:00Z", completedAt: null };
}
function text() {
  return rendered!.root.findAll(node => String(node.type) === "Text").map(node => ([] as unknown[]).concat(node.props.children).join(""));
}
describe("task estimate display", () => {
  it.each(["ai", "heuristic", "user", "default"] as const)("renders the correct row estimate and editor explanation for %s", async source => {
    const value = task(source);
    await act(async () => { rendered = create(createElement(TaskRow, { task: value, now: new Date(), onOpen: vi.fn(), onToggleComplete: vi.fn() })); });
    expect(text().some(line => line.includes(source === "ai" || source === "heuristic" ? "~45 min" : "45 min"))).toBe(true);
    const onSave = vi.fn();
    await act(async () => { rendered!.update(createElement(TaskEditor, { task: value, saving: false, error: null, onSave, onCancel: vi.fn() })); });
    const explanation = source === "ai" ? "Estimated by Stay Focused: Short quiz" : source === "heuristic" ? "Estimated from the assignment type" : null;
    if (explanation) expect(text()).toContain(explanation);
    else expect(text().some(line => line.startsWith("Estimated by") || line.startsWith("Estimated from"))).toBe(false);
    await act(async () => { rendered!.root.find(node => node.props.testID === "task-estimate-input").props.onChangeText("30"); });
    await act(async () => { rendered!.root.find(node => node.props.testID === "task-save").props.onPress(); });
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ estimatedMinutes: 30 }));
  });
});
