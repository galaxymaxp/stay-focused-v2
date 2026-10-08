import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { authorizedCanvasCron } from "@/lib/notifications/cron-auth";
const fake = vi.hoisted(() => ({ client: { rpc: vi.fn(), from: vi.fn() }, poll: vi.fn(), email: vi.fn(), create: vi.fn() }));
vi.mock("@/lib/canvas-db", () => ({ createCanvasServiceClient: fake.create }));
vi.mock("@/lib/notifications/canvas-poll", () => ({ processCanvasMetadataPolls: fake.poll }));
vi.mock("@/lib/notifications/canvas-email", () => ({ processCanvasEmailOutbox: fake.email }));
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", "private-test-secret");
  fake.create.mockReturnValue(fake.client);
  fake.client.rpc.mockResolvedValue({ data: 0, error: null });
  fake.client.from.mockReturnValue({ select: () => ({ lte: async () => ({ count: 0, error: null }) }) });
  fake.poll.mockResolvedValue({ courses: 1, failed: 0 });
  fake.email.mockResolvedValue({ sent: 0, skipped: 0, failed: 0 });
  vi.clearAllMocks();
});
describe("protected Canvas cron", () => {
  it.each([undefined, "Bearer wrong", "Bearer ", "Basic private-test-secret"])("rejects unauthorized %s before any database/provider work", async header => {
    const response = await POST(new Request("https://app.example/api/cron/canvas-sync", { method: "POST", headers: header ? { authorization: header } : {} }));
    expect(response.status).toBe(401); expect(fake.create).not.toHaveBeenCalled();
  });
  it("fails closed with missing configuration and safely handles Unicode headers", () => {
    expect(authorizedCanvasCron(new Request("https://app.example", { headers: { authorization: "Bearer private-test-secret" } }), "")).toBe(false);
    expect(authorizedCanvasCron(new Request("https://app.example", { headers: { authorization: "Bearer x" } }), "test✓")).toBe(false);
  });
  it("accepts an authorized manual request and sequences poll, reminder queue and delivery", async () => {
    const response = await POST(new Request("https://app.example/api/cron/canvas-sync", { method: "POST", headers: { authorization: "Bearer private-test-secret" } }));
    expect(response.status).toBe(200);
    expect(fake.poll).toHaveBeenCalledOnce();
    expect(fake.client.rpc).toHaveBeenCalledWith("queue_canvas_deadline_emails_v1", {});
    expect(fake.email).toHaveBeenCalledOnce();
    expect(fake.poll.mock.invocationCallOrder[0]).toBeLessThan(fake.client.rpc.mock.invocationCallOrder[0]!);
    expect(fake.client.rpc.mock.invocationCallOrder[0]).toBeLessThan(fake.email.mock.invocationCallOrder[0]!);
  });
  it("returns safe diagnostics when a dependency fails", async () => {
    fake.poll.mockRejectedValue(new Error("PRIVATE CANVAS TOKEN"));
    const response = await POST(new Request("https://app.example/api/cron/canvas-sync", { method: "POST", headers: { authorization: "Bearer private-test-secret" } }));
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("PRIVATE");
  });
});
