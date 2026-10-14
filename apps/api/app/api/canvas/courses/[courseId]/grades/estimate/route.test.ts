import { beforeEach, describe, expect, it, vi } from "vitest";
import { GRADE_COURSE, GRADE_OWNER, gradeEstimateStore } from "@/lib/canvas-grade-estimator.fixtures";
const auth = vi.hoisted(() => ({ require: vi.fn() }));
vi.mock("@/lib/canvas-routes", () => ({ requireCanvasAuth: auth.require,
  jsonResponse: (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } }),
  optionsResponse: (_request: Request, methods: string) => new Response(null, { status: 204, headers: { allow: methods } }),
}));
const route = await import("./route");
const request = (query = "target=85") => new Request(`http://localhost/api/canvas/courses/${GRADE_COURSE}/grades/estimate?${query}`);
const context = (courseId = GRADE_COURSE) => ({ params: Promise.resolve({ courseId }) });
describe("read-only grade estimate route", () => {
  beforeEach(() => { auth.require.mockResolvedValue({ ok: true, value: { client: gradeEstimateStore().client, user: { id: GRADE_OWNER } } }); });
  it("requires authentication", async () => {
    auth.require.mockResolvedValue({ ok: false, response: Response.json({ ok: false }, { status: 401 }) });
    expect((await route.GET(request(), context())).status).toBe(401);
  });
  it.each(["", "target=0", "target=101", "target=NaN", "target=Infinity", "target=85.55", "target=", "target=1e2", "target=85&target=90", "target=85&unknown=1"])("rejects invalid target query %s", async query => {
    const response = await route.GET(request(query), context());
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: "invalid_request", message: "Enter a target between 1 and 100." } });
  });
  it("denies another owner's course with safe not-found", async () => {
    const response = await route.GET(request(), context("33333333-3333-4333-8333-333333333333"));
    expect(response.status).toBe(404);
  });
  it("returns a calculated estimate from synchronized fixture rows", async () => {
    const response = await route.GET(request(), context());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ ok: true, estimate: { mode: "points", status: "reachable", requiredPercent: 90, needs: [{ neededPoints: 90 }] } });
    expect(route.OPTIONS(request()).headers.get("allow")).toBe("GET, OPTIONS");
  });
});
