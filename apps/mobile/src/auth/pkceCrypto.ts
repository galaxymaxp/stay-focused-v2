import { requireOptionalNativeModule } from "expo";

/** Supabase uses WebCrypto for its supported PKCE flow. Fail closed on older
 * clients instead of allowing its Math.random/plain challenge fallback.
 */
export async function ensureSecurePkceCrypto(): Promise<boolean> {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.getRandomValues === "function" && typeof globalThis.crypto.subtle?.digest === "function") return true;
  if (!requireOptionalNativeModule("ExpoCrypto")) return false;
  try {
    const crypto = await import("expo-crypto");
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: {
        getRandomValues: crypto.getRandomValues,
        subtle: {
          digest: (algorithm: string, data: BufferSource) => {
            if (algorithm !== "SHA-256") throw new Error("Unsupported auth digest");
            return crypto.digest(crypto.CryptoDigestAlgorithm.SHA256, data);
          },
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}
