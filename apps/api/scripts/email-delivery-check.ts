import { mkdir, open, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseEnv } from "node:util";
import { sendTransactionalEmail } from "../src/lib/transactional-email";

/** Explicit operator-only check; no public endpoint and no recipient in output.
 * Load server credentials with Node --env-file; never pass secrets as arguments.
 */
async function main() {
  const args = process.argv.slice(2);
  const value = (name: string) => args[args.indexOf(name) + 1];
  const owner = value("--owner");
  const eventId = value("--event");
  const receiptArg = value("--receipt");
  if (!args.includes("--send") || !args.includes("--owner") || !args.includes("--event") || !args.includes("--receipt") ||
    !/^[a-f0-9-]{36}$/.test(owner ?? "") || !/^[a-zA-Z0-9_-]{8,160}$/.test(eventId ?? "")) {
    throw new Error("Explicit --send, --owner UUID, --event stable-event-id and --receipt local-path are required.");
  }
  const receipt = resolve(receiptArg);
  await mkdir(dirname(receipt), { recursive: true });
  let prior: { eventId: string; state: string; startedAt: string; messageId?: string } | null = null;
  try { prior = JSON.parse(await readFile(receipt, "utf8")); } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw new Error("Email receipt could not be read safely.");
  }
  if (prior) {
    if (prior.eventId !== eventId) throw new Error("Receipt belongs to another event.");
    if (prior.state === "sent") { console.log(JSON.stringify({ ok: true, duplicatePrevented: true, messageId: prior.messageId })); return; }
    throw new Error("A previous send is unresolved. Review the provider receipt before retrying this event.");
  }
  const serverEnv = args.includes("--server-env") ? parseEnv((await readFile(value("--server-env"), "utf8")).replace(/^\uFEFF/, "")) : process.env;
  const emailEnv = args.includes("--email-env") ? parseEnv((await readFile(value("--email-env"), "utf8")).replace(/^\uFEFF/, "")) : process.env;
  const url = serverEnv.NEXT_PUBLIC_SUPABASE_URL ?? serverEnv.SUPABASE_URL;
  const key = serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase configuration is missing.");
  const response = await fetch(`${url}/auth/v1/admin/users/${owner}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
  const user: unknown = await response.json();
  if (!response.ok || typeof user !== "object" || !user || !("email" in user) || typeof user.email !== "string" || !("email_confirmed_at" in user) || !user.email_confirmed_at) {
    console.log(JSON.stringify({ ok: false, stage: "confirmed_owner_lookup", status: response.status }));
    process.exitCode = 1;
    return;
  }
  const lock = await open(receipt, "wx");
  await lock.writeFile(JSON.stringify({ eventId, state: "pending", startedAt: new Date().toISOString() }));
  await lock.close();
  const result = await sendTransactionalEmail({ type: "delivery_test", eventId, recipient: user.email }, { env: emailEnv });
  if (result.ok) await writeFile(receipt, JSON.stringify({ eventId, state: "sent", startedAt: new Date().toISOString(), messageId: result.messageId }));
  console.log(JSON.stringify(result));
  if (!result.ok) process.exitCode = 1;
}
void main().catch((error: unknown) => {
  const safeReasons = ["Explicit --send, --owner UUID, --event stable-event-id and --receipt local-path are required.", "Email receipt could not be read safely.", "Receipt belongs to another event.", "A previous send is unresolved. Review the provider receipt before retrying this event.", "Server Supabase configuration is missing."];
  console.error(JSON.stringify({ ok: false, stage: "operator_check", reason: error instanceof Error && safeReasons.includes(error.message) ? error.message : "Unexpected local failure", errorType: error instanceof Error ? error.name : "unknown", code: typeof error === "object" && error !== null && "code" in error ? error.code : undefined }));
  process.exitCode = 1;
});
