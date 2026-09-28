export const AUTH_CALLBACK_URL = "stayfocused://auth/callback";

export type AuthCallback =
  | { readonly kind: "code"; readonly code: string; readonly recovery: boolean }
  | { readonly kind: "error" }
  | { readonly kind: "ignored" };

/**
 * Rebuilds the callback from the params Expo Router bound to this route.
 * `Linking.useURL()` cannot be used here: the route mounts after the warm
 * `url` event has fired, so the hook falls back to the launch URL instead.
 * Repeated keys are kept so ambiguous callbacks are still rejected.
 */
export function authCallbackUrlFromParams(
  params: Readonly<Record<string, string | readonly string[] | undefined>>,
): string {
  const query = new URLSearchParams();
  let hash = "";
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    const values = typeof value === "string" ? [value] : value;
    if (key === "#") hash = values.join("");
    else for (const entry of values) query.append(key, entry);
  }
  const search = query.toString();
  return `${AUTH_CALLBACK_URL}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
}

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
