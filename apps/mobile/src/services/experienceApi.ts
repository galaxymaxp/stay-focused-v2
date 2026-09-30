import type { ExperienceResponse } from "@stay-focused/shared";
import { ApiConfigurationError, requireApiBaseUrl } from "../config/apiBaseUrlResolution";

export interface ExperienceClient {
  baseUrl: string;
  accessToken: string;
  fetchImpl?: typeof fetch;
}
export class ExperienceApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}
const messages: Record<string, string> = {
  sign_in_required: "Please sign in again.",
  permission_denied: "You do not have permission to use this item.",
  invalid_response: "The server returned an unexpected response. Try again later.",
  server_error: "The server could not load this content. Try again later.",
  not_found: "This item is no longer available.",
  course_not_synced: "This course is not synced with Stay Focused yet.",
  not_ready: "This material is not ready yet. Prepare it and try again.",
  invalid_request: "Check your selection and try again.",
  conflict: "This item changed. Refresh before trying again.",
  activity_draft_conflict:
    "Your draft changed elsewhere. Reload it before saving.",
  quiz_source_unavailable: "This source is not available for a quiz yet.",
  quiz_source_capacity_exceeded: "Choose fewer questions for this material.",
  quiz_generation_failed:
    "Your quiz could not be completed. Choose another material.",
  activity_generation_failed:
    "Your draft could not be completed. Review the assignment and its materials.",
  rate_limited: "Please wait a moment before trying again.",
  unavailable: "The server could not load this content. Try again when your connection is stable.",
};
/** Safe product errors only. Never echo arbitrary server/provider response text. */
export async function experienceRequest<T>(
  client: ExperienceClient,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    key?: string;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort);
  if (options.signal?.aborted) abort();
  const timeout = setTimeout(abort, options.method === "POST" ? 65000 : 15000);
  try {
    const baseUrl = requireApiBaseUrl(client.baseUrl);
    if (!client.accessToken)
      throw new ExperienceApiError(
        "sign_in_required",
        messages.sign_in_required!,
      );
    const response = await (client.fetchImpl ?? fetch)(
      `${baseUrl}${path}`,
      {
        method: options.method ?? "GET",
        headers: {
          Authorization: `Bearer ${client.accessToken}`,
          "Content-Type": "application/json",
          ...(options.key ? { "Idempotency-Key": options.key } : {}),
        },
        ...(options.body !== undefined
          ? { body: JSON.stringify(options.body) }
          : {}),
        signal: controller.signal,
      },
    );
    if (response.status === 401) throw new ExperienceApiError("sign_in_required", messages.sign_in_required!);
    if (response.status === 403) throw new ExperienceApiError("permission_denied", messages.permission_denied!);
    if (response.status >= 500) throw new ExperienceApiError("server_error", messages.server_error!, true);
    let value: ExperienceResponse<T>;
    try {
      value = await response.json();
    } catch {
      throw new ExperienceApiError("invalid_response", messages.invalid_response!);
    }
    if (!response.ok || !value || value.ok !== true) {
      const code =
        value && value.ok === false && typeof value.error?.code === "string"
          ? value.error.code
          : "unavailable";
      throw new ExperienceApiError(
        code,
        code === "quiz_source_capacity_exceeded" && value?.ok === false && Number.isInteger(value.error?.supportedMaximum)
          ? `This material supports up to ${value.error.supportedMaximum} questions. Choose a shorter Quiz.`
          : messages[code] ?? "This request could not be completed. Try again.",
        value?.ok === false && value.error?.retryable === true,
      );
    }
    if (!("data" in value)) throw new ExperienceApiError("invalid_response", messages.invalid_response!);
    return value.data;
  } catch (error) {
    if (error instanceof ApiConfigurationError) throw error;
    if (error instanceof ExperienceApiError) throw error;
    throw new ExperienceApiError(
      "connection",
      "Could not connect. Your accepted generations will keep working. Try again when you are online.",
      true,
    );
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abort);
  }
}
export function newRequestKey() {
  return `mobile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
