export const AUTH_CALLBACK_URL = "stayfocused://auth/callback";

export type AuthCallback =
  | { readonly kind: "code"; readonly code: string; readonly recovery: boolean }
  | { readonly kind: "error" }
  | { readonly kind: "ignored" };

/** Accept only our callback and authorization codes; never accept bearer tokens. */
export function parseAuthCallback(value: string): AuthCallback {
  try {
    const url = new URL(value);
    const path = `${url.hostname}${url.pathname}`.replace(/^\//, "");
    if (url.protocol !== "stayfocused:" || path !== "auth/callback" || url.username || url.password || url.port) {
      return { kind: "ignored" };
    }
    if (url.hash || url.searchParams.has("error") || url.searchParams.has("error_code")) return { kind: "error" };
    const codes = url.searchParams.getAll("code");
    if (codes.length !== 1 || !codes[0] || codes[0].length > 2048) return { kind: "error" };
    return { kind: "code", code: codes[0], recovery: url.searchParams.get("mode") === "recovery" };
  } catch {
    return { kind: "ignored" };
  }
}
