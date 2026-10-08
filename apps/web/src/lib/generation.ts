import { requestKey } from "./api";
export const generationEnabled =
  process.env.NEXT_PUBLIC_GENERATION_ENABLED === "true";
// Persist only the request identity. Source text, credentials and results are not cached.
export function generationKey(owner: string, operation: string, body: unknown) {
  const storageKey = `stay-focused-web-submission:${owner}:${operation}:${JSON.stringify(body)}`;
  let key: string;
  try {
    key = sessionStorage.getItem(storageKey) ?? requestKey();
    sessionStorage.setItem(storageKey, key);
  } catch {
    key = requestKey();
  }
  return {
    key,
    accepted: () => {
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* The accepted job is recoverable from Queue. */
      }
    },
  };
}
