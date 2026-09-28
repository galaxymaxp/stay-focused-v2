import { describe, expect, it, vi } from "vitest";
import { sendTransactionalEmail } from "./transactional-email";
const event = { type: "delivery_test", eventId: "b372-live-check", recipient: "student@example.org" } as const;
const env = { RESEND_API_KEY: "PRIVATE", RESEND_FROM_EMAIL: "Stay Focused <mail@example.org>" };
describe("server transactional email", () => {
  it("fails closed without server configuration", async () => {
    const fetch = vi.fn();
    expect(await sendTransactionalEmail(event, { env: {}, fetch })).toEqual({ ok: false, code: "email_not_configured", retryable: false });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("uses a stable deduplication key and no private data in the email", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "message" }), { status: 200 }));
    await sendTransactionalEmail(event, { env, fetch });
    await sendTransactionalEmail(event, { env, fetch });
    const first = fetch.mock.calls[0][1];
    expect(first.headers["Idempotency-Key"]).toBe(fetch.mock.calls[1][1].headers["Idempotency-Key"]);
    expect(first.body).not.toContain("PRIVATE");
    expect(first.headers.Authorization).toBe("Bearer PRIVATE");
  });
  it.each([[403, false], [429, true], [503, true]])("sanitizes provider failure %s", async (status, retryable) => {
    const fetch = vi.fn().mockResolvedValue(new Response("PRIVATE RAW PROVIDER RESPONSE", { status }));
    const result = await sendTransactionalEmail(event, { env, fetch });
    expect(result).toEqual({ ok: false, code: "email_delivery_failed", status, retryable });
    expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
  it("sanitizes thrown network failures", async () => {
    const fetch = vi.fn().mockRejectedValue(new Error("PRIVATE"));
    expect(await sendTransactionalEmail(event, { env, fetch })).toEqual({ ok: false, code: "email_delivery_failed", retryable: true });
  });
  it("rejects invalid event/recipient before sending", async () => {
    const fetch = vi.fn();
    expect((await sendTransactionalEmail({ ...event, recipient: "bad" }, { env, fetch })).ok).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });
});
