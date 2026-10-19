import type { SupabaseClient } from "@supabase/supabase-js";

export const RESET_NOTICE = "If this account exists, a reset link will arrive by email.";
export const EXPIRED_RESET = "This reset link has expired. Request a new one from Sign in.";
export const RECOVERY_OWNER_KEY = "stay-focused-web-recovery-owner";

export function resetEmail(email: string): string | null {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed.toLowerCase() : null;
}

export function resetError(action: "request" | "update", connection = false): string {
  if (action === "request") return connection
    ? "A reset email could not be requested. Check your connection."
    : "A reset email could not be requested. Try again later.";
  return connection
    ? "The password could not be updated. Check your connection."
    : "The password could not be updated. Please request another reset link.";
}

export function passwordError(password: string, confirmation: string): string | null {
  if (password.length < 8) return "Use at least 8 characters for your password.";
  return password === confirmation ? null : "Passwords do not match.";
}

export const resetRedirectTo = (origin: string) => `${origin}/auth/reset`;

export async function requestWebPasswordReset(client: SupabaseClient, email: string, origin: string): Promise<string> {
  const normalized = resetEmail(email);
  if (!normalized) throw new Error("Enter your email address first.");
  let failed: boolean;
  try {
    const { error } = await client.auth.resetPasswordForEmail(normalized, { redirectTo: resetRedirectTo(origin) });
    failed = Boolean(error);
  } catch {
    throw new Error(resetError("request", true));
  }
  if (failed) throw new Error(resetError("request"));
  return RESET_NOTICE;
}

export async function updateWebPassword(client: SupabaseClient, password: string, confirmation: string): Promise<void> {
  const invalid = passwordError(password, confirmation);
  if (invalid) throw new Error(invalid);
  let failed: boolean;
  try {
    const { error } = await client.auth.updateUser({ password });
    failed = Boolean(error);
  } catch {
    throw new Error(resetError("update", true));
  }
  if (failed) throw new Error(resetError("update"));
}

export type RecoveryParams =
  | { kind: "error" }
  | { kind: "hash"; access_token: string; refresh_token: string }
  | { kind: "pkce"; code: string }
  | { kind: "recovery" }
  | { kind: "none" };

export function hasRecoveryIntent(search: string, hash: string): boolean {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  return query.get("type") === "recovery" || query.get("mode") === "recovery" || fragment.get("type") === "recovery";
}

/** Keep credentials in memory only; never put them in notices or logs. */
export function recoveryParams(search: string, hash: string): RecoveryParams {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if ([query, fragment].some(params => ["error", "error_code", "error_description"].some(key => params.has(key)))) return { kind: "error" };
  if (fragment.get("type") === "recovery") {
    const access_token = fragment.get("access_token"), refresh_token = fragment.get("refresh_token");
    return access_token && refresh_token ? { kind: "hash", access_token, refresh_token } : { kind: "error" };
  }
  const code = query.get("code");
  if (code) return { kind: "pkce", code };
  return query.get("type") === "recovery" || query.get("mode") === "recovery" ? { kind: "recovery" } : { kind: "none" };
}

export function resetPageState(loading: boolean, recovery: boolean, hasSession: boolean): "loading" | "ready" | "expired" {
  return loading ? "loading" : recovery && hasSession ? "ready" : "expired";
}
