import { describe, expect, it, vi } from "vitest";
import type { Api } from "./api";
import { setWorkDone } from "./complete-work";

describe("setWorkDone", () => {
  it("imports unlinked Canvas work before completing the returned task", async () => {
    const request = vi.fn().mockResolvedValueOnce({ tasks: [{ id: "imported-task" }] }).mockResolvedValueOnce({});
    await setWorkDone(request as Api, { id: "canvas:assignment-row", taskId: null }, true);
    expect(request.mock.calls).toEqual([
      ["/api/tasks/import/canvas", { method: "POST", body: { assignmentIds: ["assignment-row"] } }],
      ["/api/tasks/imported-task", { method: "PATCH", body: { status: "completed" } }],
    ]);
  });

  it("reopens linked work without another import and encodes its task ID", async () => {
    const request = vi.fn().mockResolvedValue({});
    await setWorkDone(request as Api, { id: "canvas:assignment-row", taskId: "task/id" }, false);
    expect(request.mock.calls).toEqual([["/api/tasks/task%2Fid", { method: "PATCH", body: { status: "pending" } }]]);
  });

  it("never PATCHes null when the import returns no task", async () => {
    const request = vi.fn().mockResolvedValue({ tasks: [] });
    await expect(setWorkDone(request as Api, { id: "canvas:assignment-row", taskId: null }, true)).rejects.toThrow("right now");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not import a local item that has no task", async () => {
    const request = vi.fn();
    await expect(setWorkDone(request as Api, { id: "task:missing", taskId: null }, true)).rejects.toThrow("can't be marked done");
    expect(request).not.toHaveBeenCalled();
  });

  it("does not PATCH when importing fails", async () => {
    const request = vi.fn().mockRejectedValue(new Error("Import failed"));
    await expect(setWorkDone(request as Api, { id: "canvas:assignment-row", taskId: null }, true)).rejects.toThrow("Import failed");
    expect(request).toHaveBeenCalledTimes(1);
  });
});
