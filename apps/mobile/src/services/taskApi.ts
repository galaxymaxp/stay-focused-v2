import type {
  TaskPriority,
  TaskStatus,
  TaskView,
} from "@stay-focused/shared/task-planning";

import { API_BASE_URL_SETUP_HINT } from "./reviewerApi";

const TASKS_PATH = "/api/tasks";
const MAX_ERROR_MESSAGE_CHARS = 300;
/** The route caps a page at 50; ask for the maximum so Work pages rarely. */
const TASK_PAGE_LIMIT = 50;

export interface TaskApiBaseInput {
  readonly apiBaseUrl: string;
  readonly accessToken: string;
  readonly signal?: AbortSignal;
  readonly fetchImpl?: typeof fetch;
}

export interface ListTasksInput extends TaskApiBaseInput {
  readonly status?: TaskStatus;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface TaskPage {
  readonly tasks: readonly TaskView[];
  readonly nextCursor: string | null;
}

export interface CreateTaskInput extends TaskApiBaseInput {
  readonly title: string;
  readonly notes?: string | null;
  readonly priority?: TaskPriority;
  readonly dueAt?: string | null;
  readonly estimatedMinutes?: number;
}

export interface UpdateTaskInput extends TaskApiBaseInput {
  readonly taskId: string;
  readonly title?: string;
  readonly notes?: string | null;
  readonly priority?: TaskPriority;
  readonly dueAt?: string | null;
  readonly estimatedMinutes?: number;
  readonly status?: TaskStatus;
}

export interface TaskIdInput extends TaskApiBaseInput {
  readonly taskId: string;
}

export interface TaskApiError {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
}

export type TaskApiResult<TData> =
  | { readonly ok: true; readonly data: TData }
  | { readonly ok: false; readonly error: TaskApiError };

export async function listTasks(input: ListTasksInput): Promise<TaskApiResult<TaskPage>> {
  const query = new URLSearchParams();
  query.set("limit", String(input.limit ?? TASK_PAGE_LIMIT));
  if (input.status) query.set("status", input.status);
  if (input.cursor) query.set("cursor", input.cursor);
  const endpoint = createEndpoint(input.apiBaseUrl, `${TASKS_PATH}?${query.toString()}`);
  if (!endpoint.ok) return { ok: false, error: endpoint.error };

  return requestJson<TaskPage>({
    endpoint: endpoint.url,
    input,
    method: "GET",
    parseSuccess: (parsed) => {
      const data = readDataRecord(parsed);
      const tasks = data && Array.isArray(data.tasks)
        ? data.tasks.filter(isTaskView)
        : null;
      if (!tasks) return malformed();
      const nextCursor = data && typeof data.nextCursor === "string"
        ? data.nextCursor
        : null;
      return { ok: true, data: { tasks, nextCursor } };
    },
  });
}

export async function createTask(input: CreateTaskInput): Promise<TaskApiResult<TaskView>> {
  const endpoint = createEndpoint(input.apiBaseUrl, TASKS_PATH);
  if (!endpoint.ok) return { ok: false, error: endpoint.error };

  return requestJson<TaskView>({
    // Only fields the create route accepts are sent; unknown keys are rejected
    // by the route's allow-list.
    body: {
      title: input.title,
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
      ...(input.estimatedMinutes !== undefined
        ? { estimatedMinutes: input.estimatedMinutes }
        : {}),
    },
    endpoint: endpoint.url,
    input,
    method: "POST",
    parseSuccess: parseTask,
  });
}

export async function updateTask(input: UpdateTaskInput): Promise<TaskApiResult<TaskView>> {
  const endpoint = createTaskEndpoint(input);
  if (!endpoint.ok) return { ok: false, error: endpoint.error };
  const body = {
    ...(input.title !== undefined ? { title: input.title } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.dueAt !== undefined ? { dueAt: input.dueAt } : {}),
    ...(input.estimatedMinutes !== undefined
      ? { estimatedMinutes: input.estimatedMinutes }
      : {}),
    ...(input.status !== undefined ? { status: input.status } : {}),
  };
  if (Object.keys(body).length === 0) {
    return clientError("invalid_request", "Provide at least one field to update.");
  }

  return requestJson<TaskView>({
    body,
    endpoint: endpoint.url,
    input,
    method: "PATCH",
    parseSuccess: parseTask,
  });
}

export async function deleteTask(input: TaskIdInput): Promise<TaskApiResult<null>> {
  const endpoint = createTaskEndpoint(input);
  if (!endpoint.ok) return { ok: false, error: endpoint.error };

  return requestJson<null>({
    endpoint: endpoint.url,
    input,
    method: "DELETE",
    parseSuccess: () => ({ ok: true, data: null }),
  });
}

function parseTask(parsed: unknown): TaskApiResult<TaskView> {
  const data = readData(parsed);
  return isTaskView(data) ? { ok: true, data } : malformed();
}

function createTaskEndpoint(
  input: TaskIdInput | UpdateTaskInput,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: TaskApiError } {
  const taskId = input.taskId.trim();
  if (!taskId) return { ok: false, error: taskError("missing_task_id", "A task ID is required.") };
  return createEndpoint(input.apiBaseUrl, `${TASKS_PATH}/${encodeURIComponent(taskId)}`);
}

function createEndpoint(
  apiBaseUrl: string,
  path: string,
):
  | { readonly ok: true; readonly url: string }
  | { readonly ok: false; readonly error: TaskApiError } {
  const normalizedBaseUrl = apiBaseUrl.trim().replace(/\/+$/, "");
  if (!normalizedBaseUrl) {
    return { ok: false, error: taskError("invalid_api_base_url", API_BASE_URL_SETUP_HINT) };
  }
  try {
    const parsed = new URL(normalizedBaseUrl);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.search ||
      parsed.hash
    ) {
      return {
        ok: false,
        error: taskError(
          "invalid_api_base_url",
          `EXPO_PUBLIC_API_BASE_URL must be a plain HTTP(S) base URL. ${API_BASE_URL_SETUP_HINT}`,
        ),
      };
    }
  } catch {
    return {
      ok: false,
      error: taskError(
        "invalid_api_base_url",
        `EXPO_PUBLIC_API_BASE_URL must be a valid API base URL. ${API_BASE_URL_SETUP_HINT}`,
      ),
    };
  }
  return { ok: true, url: `${normalizedBaseUrl}${path}` };
}

async function requestJson<TData>({
  body,
  endpoint,
  input,
  method,
  parseSuccess,
}: {
  readonly body?: unknown;
  readonly endpoint: string;
  readonly input: TaskApiBaseInput;
  readonly method: "GET" | "POST" | "PATCH" | "DELETE";
  readonly parseSuccess: (parsed: unknown) => TaskApiResult<TData>;
}): Promise<TaskApiResult<TData>> {
  const accessToken = input.accessToken.trim();
  if (!accessToken) {
    return clientError("missing_access_token", "A valid session is required for your work.");
  }

  const fetcher = input.fetchImpl ?? fetch;
  try {
    const response = await fetcher(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: input.signal,
    });
    const parsed = await readJson(response);
    if (!response.ok) return apiError(response.status, parsed);
    return parseSuccess(parsed);
  } catch (error) {
    if (isAbortError(error) || input.signal?.aborted) {
      return clientError("request_aborted", "The request was cancelled.");
    }
    return clientError(
      "network_error",
      `Your work could not be reached. ${API_BASE_URL_SETUP_HINT}`,
    );
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function readData(parsed: unknown): unknown {
  return isRecord(parsed) && parsed.ok === true ? parsed.data : undefined;
}

function readDataRecord(parsed: unknown): Readonly<Record<string, unknown>> | null {
  const data = readData(parsed);
  return isRecord(data) ? data : null;
}

/**
 * Rows that do not match the contract are dropped rather than rendered as
 * partial tasks, so a malformed row cannot become an untitled entry the user
 * cannot act on.
 */
function isTaskView(value: unknown): value is TaskView {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    (value.status === "pending" || value.status === "completed") &&
    (value.priority === "low" || value.priority === "medium" || value.priority === "high") &&
    (value.dueAt === null || typeof value.dueAt === "string") &&
    typeof value.estimatedMinutes === "number" &&
    (value.sourceType === "manual" || value.sourceType === "canvas") &&
    typeof value.createdAt === "string"
  );
}

function apiError(status: number, parsed: unknown): TaskApiResult<never> {
  const error = isRecord(parsed) && isRecord(parsed.error) ? parsed.error : null;
  const code = error && typeof error.code === "string" ? error.code : "task_request_failed";
  const message = error && typeof error.message === "string"
    ? error.message.slice(0, MAX_ERROR_MESSAGE_CHARS)
    : "Your work could not be loaded.";
  return { ok: false, error: { code, message, status } };
}

function malformed(): TaskApiResult<never> {
  return clientError("malformed_response", "The server returned an unexpected response.");
}

function clientError(code: string, message: string): TaskApiResult<never> {
  return { ok: false, error: taskError(code, message) };
}

function taskError(code: string, message: string): TaskApiError {
  return { code, message };
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error
    ? error.name === "AbortError"
    : isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
