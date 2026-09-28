import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { webcrypto } from "node:crypto";
import { ensureSecurePkceCrypto } from "./pkceCrypto";
const mocks = vi.hoisted(() => ({ nativePresent: vi.fn(), random: vi.fn(), digest: vi.fn() }));
vi.mock("expo", () => ({ requireOptionalNativeModule: mocks.nativePresent }));
vi.mock("expo-crypto", () => ({ getRandomValues: mocks.random, digest: mocks.digest, CryptoDigestAlgorithm: { SHA256: "SHA-256" } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubGlobal("crypto", undefined);
  mocks.nativePresent.mockReturnValue({});
  mocks.random.mockImplementation((array: Uint32Array) => webcrypto.getRandomValues(array));
  mocks.digest.mockImplementation((algorithm: string, bytes: Uint8Array) => webcrypto.subtle.digest(algorithm, bytes));
});
afterEach(() => { vi.unstubAllGlobals(); });
describe("native secure PKCE", () => {
  it("fails closed on clients without the native crypto module", async () => {
    mocks.nativePresent.mockReturnValue(null);
    expect(await ensureSecurePkceCrypto()).toBe(false);
    expect(globalThis.crypto).toBeUndefined();
    expect(mocks.random).not.toHaveBeenCalled();
  });
  it("makes the real Supabase SDK generate S256 using native random/digest", async () => {
    expect(await ensureSecurePkceCrypto()).toBe(true);
    const storage = new Map<string, string>();
    const client = createClient("https://example.supabase.co", "public-test-key", { auth: {
      flowType: "pkce", autoRefreshToken: false, detectSessionInUrl: false,
      storage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { storage.set(key, value); }, removeItem: key => { storage.delete(key); } },
    } });
    const result = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo: "stayfocused://auth/callback", skipBrowserRedirect: true } });
    expect(result.error).toBeNull();
    expect(new URL(result.data.url!).searchParams.get("code_challenge_method")).toBe("s256");
    expect(mocks.random).toHaveBeenCalled();
    expect(mocks.digest).toHaveBeenCalledWith("SHA-256", expect.any(Uint8Array));
    expect([...storage.keys()].some(key => key.endsWith("-code-verifier"))).toBe(true);
  });
  it("retains browser WebCrypto without replacing it", async () => {
    vi.stubGlobal("crypto", webcrypto);
    expect(await ensureSecurePkceCrypto()).toBe(true);
    expect(globalThis.crypto).toBe(webcrypto);
    expect(mocks.nativePresent).not.toHaveBeenCalled();
  });
});
