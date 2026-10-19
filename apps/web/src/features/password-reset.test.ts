import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { EXPIRED_RESET, RESET_NOTICE, hasRecoveryIntent, passwordError, recoveryParams, requestWebPasswordReset, resetEmail, resetError, resetPageState, resetRedirectTo, updateWebPassword } from "./password-reset";

function stub() {
  const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null });
  const updateUser = vi.fn().mockResolvedValue({ error: null });
  return { resetPasswordForEmail, updateUser, client: { auth: { resetPasswordForEmail, updateUser } } as unknown as SupabaseClient };
}
describe("web password recovery", () => {
  it.each(["", " ", "student", "student@school", "a b@school.test", "a@b@c.test"])("rejects invalid email %j", async email => {
    const { client, resetPasswordForEmail } = stub();
    expect(resetEmail(email)).toBeNull();
    await expect(requestWebPasswordReset(client, email, "https://example.test")).rejects.toThrow("Enter your email address first.");
    expect(resetPasswordForEmail).not.toHaveBeenCalled();
  });
  it.each(["https://example.test", "http://127.0.0.1:3100"])("uses a neutral notice and exact redirect at %s", async origin => {
    const { client, resetPasswordForEmail } = stub();
    expect(resetEmail(" Student+Study@School.Test ")).toBe("student+study@school.test");
    expect(resetRedirectTo(origin)).toBe(`${origin}/auth/reset`);
    await expect(requestWebPasswordReset(client, " Student+Study@School.Test ", origin)).resolves.toBe(RESET_NOTICE);
    expect(RESET_NOTICE).toBe("If this account exists, a reset link will arrive by email.");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("student+study@school.test", { redirectTo: `${origin}/auth/reset` });
  });
  it.each([false, true])("maps request and update errors without exposing provider text (connection=%s)", async connection => {
    const { client, resetPasswordForEmail, updateUser } = stub();
    for (const fn of [resetPasswordForEmail, updateUser]) {
      if (connection) fn.mockRejectedValue(new Error("private provider details"));
      else fn.mockResolvedValue({ error: { message: "private provider details" } });
    }
    await expect(requestWebPasswordReset(client, "a@b.test", "https://example.test")).rejects.toThrow(resetError("request", connection));
    await expect(updateWebPassword(client, "password8", "password8")).rejects.toThrow(resetError("update", connection));
    expect(resetError("request", connection)).not.toContain("private");
    expect(resetError("update", connection)).not.toContain("private");
  });
  it("validates length before confirmation and never trims a password", async () => {
    const { client, updateUser } = stub();
    expect(passwordError("1234567", "different")).toBe("Use at least 8 characters for your password.");
    expect(passwordError("12345678", "different")).toBe("Passwords do not match.");
    await expect(updateWebPassword(client, "short", "short")).rejects.toThrow("Use at least 8");
    await expect(updateWebPassword(client, "password8", "different")).rejects.toThrow("Passwords do not match.");
    expect(updateUser).not.toHaveBeenCalled();
    await expect(updateWebPassword(client, " password8 ", " password8 ")).resolves.toBeUndefined();
    expect(updateUser).toHaveBeenCalledWith({ password: " password8 " });
  });
  it.each([
    ["?code=one", "", { kind: "pkce", code: "one" }],
    ["?next=/today", "", { kind: "none" }],
    ["", "#type=recovery&access_token=access&refresh_token=refresh", { kind: "hash", access_token: "access", refresh_token: "refresh" }],
    ["", "#type=recovery&access_token=access", { kind: "error" }],
    ["", "#type=signup&access_token=access&refresh_token=refresh", { kind: "none" }],
    ["?type=recovery", "", { kind: "recovery" }],
    ["?mode=recovery", "", { kind: "recovery" }],
    ["?code=one&error_code=otp_expired", "", { kind: "error" }],
    ["", "#error=access_denied&error_description=private", { kind: "error" }],
    ["?code=", "", { kind: "none" }],
  ])("parses recovery evidence without treating other auth links as recovery (%s %s)", (search, hash, result) => {
    expect(recoveryParams(search as string, hash as string)).toEqual(result);
  });
  it("expires missing/used recovery even with an ordinary session", () => {
    expect(resetPageState(true, false, false)).toBe("loading");
    expect(resetPageState(false, false, false)).toBe("expired");
    expect(resetPageState(false, false, true)).toBe("expired");
    expect(resetPageState(false, true, false)).toBe("expired");
    expect(resetPageState(false, true, true)).toBe("ready");
    expect(EXPIRED_RESET).toBe("This reset link has expired. Request a new one from Sign in.");
  });
  it("preserves recovery intent even when link credentials are invalid or expired", () => {
    expect(hasRecoveryIntent('?type=recovery&error_code=otp_expired', '')).toBe(true);
    expect(hasRecoveryIntent('?mode=recovery', '#error=expired')).toBe(true);
    expect(hasRecoveryIntent('', '#type=recovery')).toBe(true);
    expect(hasRecoveryIntent('?code=oauth', '#type=signup')).toBe(false);
  });
});
