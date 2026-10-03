import { describe, expect, it, vi } from "vitest";
import { defaultNotificationPreferences } from "@stay-focused/shared/notification-preferences";
import { loadNotificationPreferences, saveNotificationPreferences } from "./notificationPreferencesApi";
describe("persistent notification settings", () => {
  it("reloads the server's saved preferences after a new client session", async () => {
    let saved = defaultNotificationPreferences("Asia/Manila");
    const fetchImpl = vi.fn(async (_url: string | URL | Request, options?: RequestInit) => {
      if (options?.method === "PATCH" && typeof options.body === "string") saved = { ...saved, ...JSON.parse(options.body) };
      return new Response(JSON.stringify({ ok: true, data: { preferences: saved } }), { status: 200 });
    });
    const client = { baseUrl: "https://app.example", accessToken: "session-one", fetchImpl };
    expect((await loadNotificationPreferences(client, "Asia/Manila")).email_enabled).toBe(true);
    await saveNotificationPreferences(client, { announcement_email: false, reminder_time: "09:30" });
    await saveNotificationPreferences(client, { email_enabled: false });
    const reloaded = await loadNotificationPreferences({ ...client, accessToken: "session-two" }, "UTC");
    expect(reloaded).toMatchObject({ email_enabled: false, announcement_email: false, reminder_time: "09:30", timezone: "Asia/Manila" });
    expect(new Headers(fetchImpl.mock.calls.at(-1)?.[1]?.headers).get("Authorization")).toBe("Bearer session-two");
  });
  it("rejects invalid time before writing to the server", async () => {
    const fetchImpl = vi.fn();
    await expect(saveNotificationPreferences({ baseUrl: "https://app.example", accessToken: "session", fetchImpl }, { reminder_time: "00:00" })).rejects.toThrow();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
