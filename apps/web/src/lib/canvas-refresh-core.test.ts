import { describe, expect, it, vi } from "vitest";
import type { Api, RequestOptions } from "./api";
import { performCanvasRefresh } from "./canvas-refresh-core";

function fixture(
  handler?: (path: string, options?: RequestOptions) => unknown,
) {
  const calls: { path: string; options?: RequestOptions }[] = [];
  const api: Api = async <T>(path: string, options?: RequestOptions) => {
    calls.push({ path, options });
    const value = handler?.(path, options);
    if (value !== undefined) return value as T;
    if (path.endsWith("/connection"))
      return { connection: { status: "connected" } } as T;
    if (path.endsWith("/courses"))
      return {
        courses: [
          { id: "course-1", selectable: true },
          { id: "course-2", selectable: true },
          { id: "hidden", selectable: false },
        ],
        selectedCourseIds: ["course-1", "hidden"],
      } as T;
    return {
      id: path.endsWith("grades/sync") ? "grades" : "content",
      status: "succeeded",
    } as T;
  };
  return { api, calls };
}
const tick = async () => {};
const run = (api: Api, scope = "all", signal = new AbortController().signal) =>
  performCanvasRefresh(api, scope, signal, () => {}, tick);

describe("explicit Canvas refresh", () => {
  it("syncs only selected, selectable courses and reports both successful jobs", async () => {
    const { api, calls } = fixture();
    expect(calls).toHaveLength(0);
    expect(await run(api)).toBe("synced");
    expect(
      calls
        .filter((call) => call.options?.method === "POST")
        .map((call) => call.path),
    ).toEqual([
      "/api/canvas/courses/course-1/sync",
      "/api/canvas/courses/course-1/grades/sync",
    ]);
    expect(
      calls
        .filter((call) => call.options?.method === "POST")
        .every((call) => call.options?.key),
    ).toBe(true);
  });
  it("does not report complete success when one admission failed", async () => {
    const { api } = fixture((path) => {
      if (path.endsWith("grades/sync")) throw new Error("admission failed");
    });
    expect(await run(api)).toBe("partial");
  });
  it("does not poll or claim success when all admissions failed", async () => {
    const { api, calls } = fixture((path, options) => {
      if (options?.method === "POST") throw new Error("offline");
    });
    expect(await run(api)).toBe("failed");
    expect(calls.some((call) => call.path.includes("sync-jobs"))).toBe(false);
  });
  it("polls accepted jobs and treats server-terminal failures as partial", async () => {
    const { api } = fixture((path, options) => {
      if (options?.method === "POST")
        return {
          id: path.endsWith("grades/sync") ? "grades" : "content",
          status: "queued",
        };
      if (path.includes("sync-jobs"))
        return {
          id: path.endsWith("grades") ? "grades" : "content",
          status: path.endsWith("grades") ? "failed" : "succeeded",
        };
    });
    expect(await run(api)).toBe("partial");
  });
  it("keeps a lost polling connection distinct from a server failure", async () => {
    const { api, calls } = fixture((path, options) => {
      if (options?.method === "POST")
        return {
          id: path.endsWith("grades/sync") ? "grades" : "content",
          status: "queued",
        };
      if (path.includes("sync-jobs")) throw new Error("connection lost");
    });
    expect(await run(api)).toBe("unconfirmed");
    expect(
      calls.filter((call) => call.path.includes("sync-jobs")),
    ).toHaveLength(6);
  });
  it("recovers from a transient polling error", async () => {
    let polls = 0;
    const { api } = fixture((path, options) => {
      if (options?.method === "POST")
        return {
          id: path.endsWith("grades/sync") ? "grades" : "content",
          status: "queued",
        };
      if (path.includes("sync-jobs") && ++polls <= 2)
        throw new Error("temporary");
    });
    expect(await run(api)).toBe("synced");
  });
  it("stops starting work after abort or owner change", async () => {
    const controller = new AbortController();
    const { api, calls } = fixture((path, options) => {
      if (options?.method === "POST") controller.abort();
    });
    await expect(run(api, "all", controller.signal)).rejects.toThrow();
    expect(
      calls.filter((call) => call.path.includes("sync-jobs")),
    ).toHaveLength(0);
  });
  it("does not start jobs for disconnected accounts or empty selections", async () => {
    const disconnected = fixture((path) =>
      path.endsWith("/connection") ? { connection: null } : undefined,
    );
    expect(await run(disconnected.api)).toBe("not_connected");
    const empty = fixture((path) =>
      path.endsWith("/courses")
        ? { courses: [], selectedCourseIds: [] }
        : undefined,
    );
    expect(await run(empty.api)).toBe("idle");
    expect(
      [...disconnected.calls, ...empty.calls].some(
        (call) => call.options?.method === "POST",
      ),
    ).toBe(false);
  });
  it("bounds polling without claiming unfinished jobs succeeded", async () => {
    const { api } = fixture((path) =>
      path.includes("/sync") || path.endsWith("/grades/sync")
        ? { id: path, status: "running" }
        : undefined,
    );
    const progress = vi.fn();
    expect(
      await performCanvasRefresh(
        api,
        "course-1",
        new AbortController().signal,
        progress,
        tick,
      ),
    ).toBe("unconfirmed");
    expect(progress).toHaveBeenLastCalledWith({ finished: 0, total: 2 });
  });
});
