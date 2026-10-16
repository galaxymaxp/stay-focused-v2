import { beforeEach, expect, it, vi } from "vitest";
import { AuthRetryableFetchError, AuthApiError } from "@supabase/supabase-js";
import { getCurrentSession, getSavedSession } from "./authService";

const mocks = vi.hoisted(() => ({ read: vi.fn(), current: vi.fn() }));
vi.mock("./sessionStore", () => ({ sessionStore: { getItem: mocks.read } }));
vi.mock("./supabaseClient", () => ({ SUPABASE_AUTH_STORAGE_KEY: "saved-auth", getSupabaseClientResult: () => ({ ok: true, data: { auth: { getSession: mocks.current } } }) }));
vi.mock("./pkceCrypto", () => ({ ensureSecurePkceCrypto: vi.fn() }));
const saved = { access_token: "expired-token", refresh_token: "saved-refresh", expires_at: 1,
  user: { id: "owner", app_metadata: { roles: ["student"] }, user_metadata: {}, identities: [] } };
beforeEach(() => { vi.clearAllMocks(); mocks.read.mockResolvedValue(JSON.stringify(saved)); });
it("reads an expired saved account without a network request", async () => {
  expect(await getSavedSession()).toMatchObject({ offline: true, user: { id: "owner" }, expiresAt: 1 });
  expect(mocks.current).not.toHaveBeenCalled();
});
it.each([null, "{", JSON.stringify({ user: { id: "owner" } }), JSON.stringify({ ...saved, user: null })])("rejects missing or malformed secure storage", async raw => {
  mocks.read.mockResolvedValue(raw);
  expect(await getSavedSession()).toBeNull();
});
it("retains saved access only on a retryable transport failure", async () => {
  mocks.current.mockResolvedValue({ data: { session: null }, error: new AuthRetryableFetchError("offline", 0) });
  expect(await getCurrentSession()).toMatchObject({ ok: true, data: { offline: true, user: { id: "owner" } } });
});
it("does not substitute offline identity for an invalid or revoked refresh token", async () => {
  mocks.current.mockResolvedValue({ data: { session: null }, error: new AuthApiError("revoked", 400, "refresh_token_not_found") });
  expect(await getCurrentSession()).toMatchObject({ ok: false });
});
it("honors the SDK's cleared session even when an earlier saved identity existed", async () => {
  mocks.current.mockResolvedValue({ data: { session: null }, error: null });
  expect(await getCurrentSession()).toEqual({ ok: true, data: null });
});
