import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  openURL: vi.fn(), getItemAsync: vi.fn(), setItemAsync: vi.fn(), deleteItemAsync: vi.fn(),
  auth: { signInWithOAuth: vi.fn(), linkIdentity: vi.fn(), getUser: vi.fn(), exchangeCodeForSession: vi.fn(), signOut: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn() },
}));
vi.mock("react-native", () => ({ Linking: { openURL: mocks.openURL } }));
vi.mock("expo-secure-store", () => ({ getItemAsync: mocks.getItemAsync, setItemAsync: mocks.setItemAsync, deleteItemAsync: mocks.deleteItemAsync }));
vi.mock("./supabaseClient", () => ({ getSupabaseClientResult: () => ({ ok: true, data: { auth: mocks.auth } }) }));
import { completeAuthCallback, openProviderAuth, requestPasswordReset, updateRecoveredPassword } from "./providerAuth";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example" }, error: null });
  mocks.auth.exchangeCodeForSession.mockResolvedValue({ data: { session: { user: { id: "owner" } } }, error: null });
});
describe("supported Supabase mobile auth", () => {
  it.each([["google", "google"], ["microsoft", "azure"]] as const)("starts %s with PKCE redirect", async (provider, expected) => {
    expect((await openProviderAuth(provider)).ok).toBe(true);
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: expected, options: expect.objectContaining({ redirectTo: "stayfocused://auth/callback", skipBrowserRedirect: true }) });
    expect(mocks.openURL).toHaveBeenCalledWith("https://auth.example");
  });
  it("exchanges a repeated callback once", async () => {
    const results = await Promise.all([completeAuthCallback("stayfocused://auth/callback?code=dedup"), completeAuthCallback("stayfocused://auth/callback?code=dedup")]);
    expect(results.every(result => result.ok)).toBe(true);
    expect(mocks.auth.exchangeCodeForSession).toHaveBeenCalledTimes(1);
  });
  it("never exchanges a bearer callback", async () => {
    expect((await completeAuthCallback("stayfocused://auth/callback#access_token=SECRET")).ok).toBe(false);
    expect(mocks.auth.exchangeCodeForSession).not.toHaveBeenCalled();
  });
  it("rejects owner changes during supported linking", async () => {
    mocks.getItemAsync.mockResolvedValue("original-owner");
    const result = await completeAuthCallback("stayfocused://auth/callback?code=wrong-owner");
    expect(result.ok).toBe(false);
    expect(mocks.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("links only after a verified signed-in user", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
    mocks.auth.linkIdentity.mockResolvedValue({ data: { url: "https://auth.example/link" }, error: null });
    expect((await openProviderAuth("google", true)).ok).toBe(true);
    expect(mocks.setItemAsync).toHaveBeenCalledWith(expect.any(String), "owner");
    expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled();
  });
  it("uses Supabase for recovery and hides raw failures", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: new Error("SECRET") });
    const result = await requestPasswordReset("student@example.org");
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith("student@example.org", { redirectTo: "stayfocused://auth/callback?mode=recovery" });
  });
  it("rejects short reset passwords before transmission", async () => {
    expect((await updateRecoveredPassword("short")).ok).toBe(false);
    expect(mocks.auth.updateUser).not.toHaveBeenCalled();
  });
});
