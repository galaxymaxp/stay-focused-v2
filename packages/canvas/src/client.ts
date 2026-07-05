import {
  type CanvasCapability,
  type CanvasCapabilityProbeResult,
  type CanvasCapabilityStatus,
  type CanvasClientErrorCode,
  type CanvasClientOptions,
  type CanvasCourse,
  type CanvasProfile,
} from "./types";

const API_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_PER_PAGE = 50;
const PROBE_PER_PAGE = 1;
const INTEGRATION_VERSION = "phase5a";

export const CANVAS_CAPABILITIES: readonly CanvasCapability[] = [
  "profile",
  "courses",
  "enrollments",
  "syllabus",
  "modules",
  "pages",
  "files",
  "assignments",
  "assignment_groups",
  "submissions",
  "grades",
  "grading_periods",
  "rubrics",
  "announcements",
  "discussions",
  "classic_quizzes",
  "new_quizzes",
  "planner",
  "calendar",
  "learning_object_dates",
  "outcomes",
  "media_captions",
  "conversations",
  "history",
  "what_if_grades",
];

export class CanvasClientError extends Error {
  public readonly code: CanvasClientErrorCode;
  public readonly status: number | null;

  public constructor(
    code: CanvasClientErrorCode,
    message: string,
    options: { readonly status?: number } = {},
  ) {
    super(message);
    this.name = "CanvasClientError";
    this.code = code;
    this.status = options.status ?? null;
  }
}

export class CanvasClient {
  public readonly baseUrl: string;
  private readonly apiBaseUrl: string;
  private readonly personalAccessToken: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxPages: number;
  private readonly now: () => Date;

  public constructor({
    allowHttpForTesting = false,
    baseUrl,
    fetchImpl = globalThis.fetch,
    maxPages = DEFAULT_MAX_PAGES,
    now = () => new Date(),
    personalAccessToken,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  }: CanvasClientOptions) {
    const normalizedBaseUrl = normalizeCanvasBaseUrl(baseUrl, {
      allowHttpForTesting,
    });
    const token = personalAccessToken.trim();
    if (!token) {
      throw new CanvasClientError(
        "missing_access_token",
        "Canvas personal access token is required.",
      );
    }
    if (typeof fetchImpl !== "function") {
      throw new CanvasClientError(
        "canvas_request_failed",
        "A fetch implementation is required.",
      );
    }
    if (!Number.isInteger(maxPages) || maxPages < 1 || maxPages > 50) {
      throw new CanvasClientError(
        "canvas_request_failed",
        "Canvas pagination limit must be between 1 and 50 pages.",
      );
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new CanvasClientError(
        "canvas_request_failed",
        "Canvas request timeout must be greater than 0.",
      );
    }

    this.baseUrl = normalizedBaseUrl;
    this.apiBaseUrl = `${normalizedBaseUrl}${API_PREFIX}`;
    this.personalAccessToken = token;
    this.fetchImpl = fetchImpl;
    this.maxPages = maxPages;
    this.now = now;
    this.timeoutMs = timeoutMs;
  }

  public get isConfigured(): boolean {
    return this.baseUrl.length > 0 && this.personalAccessToken.length > 0;
  }

  public async getCurrentUser(): Promise<CanvasProfile> {
    const parsed = await this.requestJson("/users/self/profile");
    return normalizeProfile(parsed);
  }

  public async listCourses(): Promise<readonly CanvasCourse[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses?per_page=${DEFAULT_PER_PAGE}&enrollment_state=active`,
    );
    return parsed.map(normalizeCourse);
  }

  public async probeCapabilities(): Promise<readonly CanvasCapabilityProbeResult[]> {
    const results = new Map<CanvasCapability, CanvasCapabilityProbeResult>();
    for (const capability of CANVAS_CAPABILITIES) {
      results.set(capability, this.notTested(capability));
    }

    const profile = await this.probe("profile", null, () => this.getCurrentUser());
    results.set("profile", profile);

    let courses: readonly CanvasCourse[] = [];
    const coursesResult = await this.probe("courses", null, async () => {
      courses = await this.listCourses();
    });
    results.set("courses", coursesResult);

    const courseId = courses[0]?.id ?? null;
    if (courseId) {
      results.set(
        "enrollments",
        await this.probe("enrollments", courseId, () =>
          this.requestPaginatedJson(
            `/courses/${encodeURIComponent(courseId)}/enrollments?user_id=self&per_page=${PROBE_PER_PAGE}`,
          ),
        ),
      );
      results.set(
        "modules",
        await this.probe("modules", courseId, () =>
          this.requestPaginatedJson(
            `/courses/${encodeURIComponent(courseId)}/modules?per_page=${PROBE_PER_PAGE}`,
          ),
        ),
      );
      results.set(
        "assignment_groups",
        await this.probe("assignment_groups", courseId, () =>
          this.requestPaginatedJson(
            `/courses/${encodeURIComponent(courseId)}/assignment_groups?per_page=${PROBE_PER_PAGE}`,
          ),
        ),
      );
    }

    results.set(
      "planner",
      await this.probe("planner", null, () =>
        this.requestPaginatedJson(`/planner/items?per_page=${PROBE_PER_PAGE}`),
      ),
    );

    return CANVAS_CAPABILITIES.map((capability) => {
      const result = results.get(capability);
      if (!result) {
        return this.notTested(capability);
      }
      return result;
    });
  }

  private async probe(
    capability: CanvasCapability,
    courseId: string | null,
    action: () => Promise<unknown>,
  ): Promise<CanvasCapabilityProbeResult> {
    try {
      await action();
      return this.probeResult(capability, "available", null, courseId);
    } catch (error) {
      return this.probeResult(
        capability,
        statusForProbeError(error),
        safeErrorCodeForProbe(error),
        courseId,
      );
    }
  }

  private notTested(capability: CanvasCapability): CanvasCapabilityProbeResult {
    return {
      capability,
      status: "not_tested",
      testedAt: null,
      safeErrorCode: null,
      courseId: null,
      integrationVersion: INTEGRATION_VERSION,
    };
  }

  private probeResult(
    capability: CanvasCapability,
    status: CanvasCapabilityStatus,
    safeErrorCode: string | null,
    courseId: string | null,
  ): CanvasCapabilityProbeResult {
    return {
      capability,
      status,
      testedAt: this.now().toISOString(),
      safeErrorCode,
      courseId,
      integrationVersion: INTEGRATION_VERSION,
    };
  }

  private async requestPaginatedJson(pathAndQuery: string): Promise<readonly unknown[]> {
    let nextUrl = this.createApiUrl(pathAndQuery);
    const rows: unknown[] = [];

    for (let page = 0; page < this.maxPages; page += 1) {
      const response = await this.fetchJson(nextUrl);
      if (!Array.isArray(response.parsed)) {
        throw new CanvasClientError(
          "canvas_invalid_response",
          "Canvas returned an invalid paginated response.",
          { status: response.status },
        );
      }
      rows.push(...response.parsed);

      const next = readNextLink(response.headers.get("link"));
      if (!next) {
        return rows;
      }

      nextUrl = this.validatePaginationUrl(next);
    }

    return rows;
  }

  private async requestJson(pathAndQuery: string): Promise<unknown> {
    const response = await this.fetchJson(this.createApiUrl(pathAndQuery));
    return response.parsed;
  }

  private createApiUrl(pathAndQuery: string): URL {
    if (!pathAndQuery.startsWith("/")) {
      throw new CanvasClientError(
        "canvas_request_failed",
        "Canvas API path must start with a slash.",
      );
    }
    return new URL(`${this.apiBaseUrl}${pathAndQuery}`);
  }

  private validatePaginationUrl(value: string): URL {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new CanvasClientError(
        "canvas_pagination_rejected",
        "Canvas pagination link was invalid.",
      );
    }

    const apiBase = new URL(this.apiBaseUrl);
    if (
      parsed.origin !== apiBase.origin ||
      !parsed.pathname.startsWith(`${API_PREFIX}/`)
    ) {
      throw new CanvasClientError(
        "canvas_pagination_rejected",
        "Canvas pagination link was rejected.",
      );
    }

    return parsed;
  }

  private async fetchJson(
    url: URL,
  ): Promise<{
    readonly parsed: unknown;
    readonly headers: Headers;
    readonly status: number;
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchImpl(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.personalAccessToken}`,
        },
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) {
        throw new CanvasClientError(
          "canvas_timeout",
          "Canvas request timed out.",
        );
      }
      throw new CanvasClientError(
        "canvas_request_failed",
        "Canvas request failed before receiving a response.",
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw mapHttpError(response.status);
    }

    const text = await response.text();
    if (!text.trim()) {
      return { parsed: null, headers: response.headers, status: response.status };
    }

    try {
      return {
        parsed: JSON.parse(text) as unknown,
        headers: response.headers,
        status: response.status,
      };
    } catch {
      throw new CanvasClientError(
        "canvas_malformed_json",
        "Canvas returned malformed JSON.",
        { status: response.status },
      );
    }
  }
}

export function normalizeCanvasBaseUrl(
  value: string,
  options: { readonly allowHttpForTesting?: boolean } = {},
): string {
  const raw = value.trim();
  if (!raw) {
    throw new CanvasClientError(
      "invalid_base_url",
      "Canvas base URL is required.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new CanvasClientError(
      "invalid_base_url",
      "Canvas base URL must be a valid URL.",
    );
  }

  const allowHttp = options.allowHttpForTesting === true;
  if (parsed.protocol !== "https:" && !(allowHttp && parsed.protocol === "http:")) {
    throw new CanvasClientError(
      "invalid_base_url",
      "Canvas base URL must use HTTPS.",
    );
  }
  if (parsed.username || parsed.password) {
    throw new CanvasClientError(
      "invalid_base_url",
      "Canvas base URL must not include embedded credentials.",
    );
  }
  if (parsed.search || parsed.hash) {
    throw new CanvasClientError(
      "invalid_base_url",
      "Canvas base URL must not include a query string or fragment.",
    );
  }

  const normalizedPath = normalizeCanvasBasePath(parsed.pathname);
  parsed.pathname = normalizedPath;
  parsed.search = "";
  parsed.hash = "";
  parsed.username = "";
  parsed.password = "";

  const serialized = parsed.toString().replace(/\/$/, "");
  return serialized;
}

function normalizeCanvasBasePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  if (!trimmed || trimmed === "/") {
    return "";
  }
  if (trimmed === API_PREFIX) {
    return "";
  }
  if (trimmed.endsWith(API_PREFIX)) {
    return trimmed.slice(0, -API_PREFIX.length).replace(/\/+$/, "");
  }
  return trimmed;
}

function normalizeProfile(value: unknown): CanvasProfile {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas profile response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const name = stringOrNull(value.name) ?? stringOrNull(value.short_name);
  if (!id || !name) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas profile response was missing required fields.",
    );
  }

  return {
    id,
    name,
    email: stringOrNull(value.primary_email) ?? stringOrNull(value.email),
    sortableName: stringOrNull(value.sortable_name),
    shortName: stringOrNull(value.short_name),
  };
}

function normalizeCourse(value: unknown): CanvasCourse {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas course response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const name = stringOrNull(value.name);
  if (!id || !name) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas course response was missing required fields.",
    );
  }

  return {
    id,
    name,
    courseCode: stringOrNull(value.course_code),
    workflowState: stringOrNull(value.workflow_state),
    enrollmentTermId: normalizeId(value.enrollment_term_id),
    startAt: stringOrNull(value.start_at),
    endAt: stringOrNull(value.end_at),
  };
}

function normalizeId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function readNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) {
    return null;
  }

  const links = linkHeader.split(",");
  for (const link of links) {
    const match = /^\s*<([^>]+)>;\s*rel="next"\s*$/i.exec(link.trim());
    if (match) {
      return match[1] ?? null;
    }
  }
  return null;
}

function mapHttpError(status: number): CanvasClientError {
  if (status === 401) {
    return new CanvasClientError(
      "canvas_unauthorized",
      "Canvas rejected the token.",
      { status },
    );
  }
  if (status === 403) {
    return new CanvasClientError(
      "canvas_forbidden",
      "Canvas denied access to this resource.",
      { status },
    );
  }
  if (status === 404) {
    return new CanvasClientError(
      "canvas_invalid_response",
      "Canvas resource was not found.",
      { status },
    );
  }
  if (status === 429) {
    return new CanvasClientError(
      "canvas_rate_limited",
      "Canvas rate limited the request.",
      { status },
    );
  }
  if (status >= 500) {
    return new CanvasClientError(
      "canvas_unavailable",
      "Canvas is temporarily unavailable.",
      { status },
    );
  }
  return new CanvasClientError(
    "canvas_request_failed",
    "Canvas returned an unsuccessful response.",
    { status },
  );
}

function statusForProbeError(error: unknown): CanvasCapabilityStatus {
  if (!(error instanceof CanvasClientError)) {
    return "temporarily_failed";
  }
  if (error.code === "canvas_forbidden" || error.code === "canvas_unauthorized") {
    return "permission_denied";
  }
  if (error.code === "canvas_invalid_response" && error.status === 404) {
    return "not_supported";
  }
  if (
    error.code === "canvas_rate_limited" ||
    error.code === "canvas_timeout" ||
    error.code === "canvas_unavailable" ||
    error.code === "canvas_request_failed"
  ) {
    return "temporarily_failed";
  }
  return "temporarily_failed";
}

function safeErrorCodeForProbe(error: unknown): string {
  return error instanceof CanvasClientError
    ? error.code
    : "canvas_request_failed";
}

function isAbortError(error: unknown): boolean {
  const DomException = globalThis.DOMException;
  return typeof DomException === "function" && error instanceof DomException
    ? error.name === "AbortError"
    : isRecord(error) && error.name === "AbortError";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
