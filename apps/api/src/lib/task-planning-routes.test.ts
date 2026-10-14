import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.auth }));
vi.mock("@/lib/canvas-db", () => ({ createCanvasServiceClient: mocks.client }));
import { readTaskPlanningJson } from "./task-planning-routes";
import { POST as tasks } from "@/../app/api/tasks/route";
import { PATCH as task } from "@/../app/api/tasks/[taskId]/route";
import { POST as importCanvas } from "@/../app/api/tasks/import/canvas/route";
import { POST as preview } from "@/../app/api/study-plan/preview/route";
import { POST as apply } from "@/../app/api/study-plan/apply/route";
import { PATCH as session } from "@/../app/api/study-sessions/[sessionId]/route";
const id = "00000000-0000-4000-8000-000000000001";
const routes = [
  ["tasks", tasks], ["task", (request: Request) => task(request, { params: Promise.resolve({ taskId: id }) })],
  ["import", importCanvas], ["preview", preview], ["apply", apply],
  ["session", (request: Request) => session(request, { params: Promise.resolve({ sessionId: id }) })],
] as const;
beforeEach(() => { mocks.auth.mockResolvedValue({ id: "owner" }); mocks.client.mockReturnValue({}); });
describe.each(routes)("bounded task planning: %s", (_name, handler) => {
  it.each([undefined, "1"])("rejects excess bytes with Content-Length %s", async contentLength => {
    const response = await handler(new Request("https://example.test", { method: "POST", body: " ".repeat(65537), headers: contentLength ? { "content-length": contentLength } : {} }));
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ ok: false, error: { code: "payload_too_large", message: "Request body must be at most 65536 bytes.", retryable: false } });
  });
});
it.each([undefined, new Uint8Array([0xff])])("preserves invalid-JSON denial for empty/invalid-UTF8 bodies", async body => {
  const result = await readTaskPlanningJson(new Request("https://example.test", { method: "POST", body }));
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.response.status).toBe(400);
    expect((await result.response.json()).error.code).toBe("invalid_json");
  }
});
