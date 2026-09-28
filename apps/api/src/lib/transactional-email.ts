import { createHash } from "node:crypto";

export type TransactionalEmailEvent =
  | { readonly type: "delivery_test"; readonly eventId: string; readonly recipient: string }
  | { readonly type: "canvas_reconnect_required"; readonly eventId: string; readonly recipient: string };
export type EmailDeliveryResult =
  | { readonly ok: true; readonly messageId: string }
  | { readonly ok: false; readonly code: "email_not_configured" | "email_invalid_event" | "email_delivery_failed"; readonly retryable: boolean; readonly status?: number };

/** Server only. The event ID is stable for retries of one unresolved condition.
 * Resend retains idempotency keys for 24 hours. Longer lived events must also
 * persist their sent receipt before integration with a recurring scheduler.
 */
export async function sendTransactionalEmail(event: TransactionalEmailEvent, options: {
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly fetch?: typeof globalThis.fetch;
} = {}): Promise<EmailDeliveryResult> {
  const env = options.env ?? process.env;
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.RESEND_FROM_EMAIL?.trim();
  if (!apiKey || !from) return { ok: false, code: "email_not_configured", retryable: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(event.recipient) || !/^[a-zA-Z0-9_-]{8,160}$/.test(event.eventId)) {
    return { ok: false, code: "email_invalid_event", retryable: false };
  }
  const subject = event.type === "delivery_test" ? "Stay Focused email delivery check" : "Reconnect Canvas in Stay Focused";
  const text = event.type === "delivery_test"
    ? "This is the authorized Stay Focused B37 email delivery check. No action is required."
    : "Canvas needs a valid access token to resume syncing. Your saved study work is safe. Open Stay Focused, then Settings, Canvas connection and sync, to reconnect using the same Canvas account.";
  const key = createHash("sha256").update(`${event.type}:${event.eventId}:${event.recipient.toLowerCase()}`).digest("hex");
  try {
    const response = await (options.fetch ?? globalThis.fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `stayfocused/${key}` },
      body: JSON.stringify({ from, to: [event.recipient], subject, text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { ok: false, code: "email_delivery_failed", status: response.status, retryable: response.status === 429 || response.status >= 500 };
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || !payload || !("id" in payload) || typeof payload.id !== "string") return { ok: false, code: "email_delivery_failed", retryable: false };
    return { ok: true, messageId: payload.id };
  } catch {
    return { ok: false, code: "email_delivery_failed", retryable: true };
  }
}
