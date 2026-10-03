import { beforeEach, describe, expect, it, vi } from "vitest";
import { defaultNotificationPreferences } from "@stay-focused/shared/notification-preferences";
import { GET, PATCH } from "./route";
const fake = vi.hoisted(() => ({ auth: vi.fn(), upsert: vi.fn(), update: vi.fn(), eq: vi.fn(), single: vi.fn() }));
vi.mock("@/lib/canvas-routes", () => ({ requireCanvasAuth: fake.auth, createCorsHeaders: () => ({}), optionsResponse: () => new Response(null) }));
beforeEach(() => {
  fake.single.mockResolvedValue({ data: { user_id: "owner", ...defaultNotificationPreferences("Asia/Manila"), reminder_time: "08:00:00" }, error: null });
  fake.eq.mockReturnValue({ single: fake.single });
  fake.upsert.mockReturnValue({ error: null, select: () => ({ single: fake.single }) });
  fake.update.mockReturnValue({ eq: fake.eq });
  fake.eq.mockReturnValue({ single: fake.single, select: () => ({ single: fake.single }) });
  fake.auth.mockResolvedValue({ ok: true, value: { user: { id: "owner" }, client: { from: () => ({ upsert: fake.upsert, update: fake.update, select: () => ({ eq: fake.eq }) }) } } });
  vi.clearAllMocks();
});
describe("owner notification preferences API", () => {
  it("initializes device timezone defaults without overwriting persisted preferences", async () => {
    const response = await GET(new Request("https://app.example/api/notification-preferences?timezone=Asia%2FManila"));
    expect(response.status).toBe(200);
    expect(fake.upsert).toHaveBeenCalledWith({ user_id: "owner", ...defaultNotificationPreferences("Asia/Manila") }, { onConflict: "user_id", ignoreDuplicates: true });
    expect(fake.eq).toHaveBeenCalledWith("user_id", "owner");
    expect((await response.json()).data.preferences.reminder_time).toBe("08:00");
  });
  it("writes only the authenticated owner's changed switch", async () => {
    const response = await PATCH(new Request("https://app.example/api/notification-preferences", { method: "PATCH", body: JSON.stringify({ email_enabled: false }) }));
    expect(response.status).toBe(200);
    expect(fake.upsert).toHaveBeenCalledWith({ user_id: "owner" }, { onConflict: "user_id", ignoreDuplicates: true });
    expect(fake.update).toHaveBeenCalledWith({ email_enabled: false });
    expect(fake.eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it.each([{ user_id: "other", email_enabled: false }, { deadline_7_day: "false" }, { timezone: "Invalid/Zone" }, { reminder_time: "00:00" }, { reminder_time: "24:00" }])("rejects invalid or cross-owner patch %s", async body => {
    expect((await PATCH(new Request("https://app.example", { method: "PATCH", body: JSON.stringify(body) }))).status).toBe(400);
    expect(fake.upsert).not.toHaveBeenCalled();
  });
  it("rejects anonymous requests", async () => {
    fake.auth.mockResolvedValue({ ok: false, response: new Response(null, { status: 401 }) });
    expect((await GET(new Request("https://app.example"))).status).toBe(401);
    expect(fake.upsert).not.toHaveBeenCalled();
  });
});
