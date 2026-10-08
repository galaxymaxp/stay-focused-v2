export class ApiError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
const messages: Record<string, string> = {
  sign_in_required: "Please sign in again.", unauthorized: "Please sign in again.",
  not_found: "This item is no longer available.", quiz_not_found: "This quiz is no longer available.",
  invalid_request: "Check your entries and try again.", not_ready: "Prepare this material before continuing.",
  conflict: "This item changed. Refresh before trying again.",
  quiz_result_unavailable: "Check every answer before finishing your quiz.",
  quiz_answer_already_finalized: "This answer has already been checked. Refresh to continue.",
  canvas_connection_not_found: "Connect Canvas to see your courses.",
  canvas_course_selection_required: "Choose the courses you want to sync.",
  rate_limited: "Please wait a moment before trying again.",
};
export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown; key?: string; signal?: AbortSignal; envelope?: "data" | "root";
}
export type Api = <T>(path: string, options?: RequestOptions) => Promise<T>;
export function createApi(getToken: (refresh: boolean) => Promise<string | null>, onUnauthorized: () => void, fetcher: typeof fetch = fetch): Api {
  return async <T>(path: string, options: RequestOptions = {}): Promise<T> => {
    if (!path.startsWith("/api/") || path.includes("\\") || path.includes("..")) throw new ApiError("invalid_path", "This action is unavailable.");
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort);
    if (options.signal?.aborted) abort();
    const timeout = setTimeout(abort, options.method && options.method !== "GET" ? 65000 : 15000);
    try {
      for (const refresh of [false, true]) {
        const token = await getToken(refresh);
        if (!token) { onUnauthorized(); throw new ApiError("sign_in_required", messages.sign_in_required); }
        const response = await fetcher(path, {
          method: options.method ?? "GET", cache: "no-store", credentials: "omit",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(options.key ? { "Idempotency-Key": options.key } : {}) },
          ...(options.body !== undefined ? { body: JSON.stringify(options.body) } : {}), signal: controller.signal,
        });
        if (response.status === 401 && !refresh) continue;
        const value: unknown = await response.json();
        if (!isRecord(value) || value.ok !== true || !response.ok) {
          if (response.status === 401) onUnauthorized();
          const code = isRecord(value) && isRecord(value.error) && typeof value.error.code === "string" ? value.error.code : "unavailable";
          throw new ApiError(code, messages[code] ?? "This action is unavailable right now. Please try again.");
        }
        if (options.envelope === "root") return value as T;
        if (!("data" in value)) throw new ApiError("invalid_response", "The service returned an incomplete response. Try again.");
        return value.data as T;
      }
      throw new ApiError("sign_in_required", messages.sign_in_required);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      throw new ApiError("connection", "Could not connect. Try again when you are online. Accepted generations keep working.");
    } finally {
      clearTimeout(timeout); options.signal?.removeEventListener("abort", abort);
    }
  };
}
export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
export function requestKey() { return `web-${crypto.randomUUID()}`; }
export function localDate(value = new Date()) { return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,"0")}-${String(value.getDate()).padStart(2,"0")}`; }
export function timeLabel(value: string | null) { return value ? new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Unscheduled"; }
export function dateLabel(value: string | null) { return value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No deadline"; }
export function safeUrl(value: string) { try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? url.href : undefined; } catch { return undefined; } }
