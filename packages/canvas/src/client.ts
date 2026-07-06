import {
  type CanvasCapability,
  type CanvasCapabilityProbeResult,
  type CanvasCapabilityStatus,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasAssignmentSubmissionType,
  type CanvasAnnouncement,
  type CanvasAnnouncementsListOptions,
  type CanvasClientErrorCode,
  type CanvasClientOptions,
  type CanvasCourse,
  type CanvasCourseEnrollment,
  type CanvasCourseSection,
  type CanvasCourseTerm,
  type CanvasDownloadedFile,
  type CanvasFile,
  type CanvasFileDownloadOptions,
  type CanvasHostnameResolver,
  type CanvasJson,
  type CanvasJsonObject,
  type CanvasModule,
  type CanvasModuleItem,
  type CanvasPageDetail,
  type CanvasPageSummary,
  type CanvasPlannerItem,
  type CanvasPlannerItemsListOptions,
  type CanvasPlannerOverrideSummary,
  type CanvasPlannerSubmissionState,
  type CanvasProfile,
} from "./types";

const API_PREFIX = "/api/v1";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_PAGES = 10;
const DEFAULT_PER_PAGE = 50;
const PROBE_PER_PAGE = 1;
const INTEGRATION_VERSION = "phase5a";
const MAX_RETRY_AFTER_MS = 30_000;

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
  public readonly retryAfterMs: number | null;
  public readonly attemptCount: number;

  public constructor(
    code: CanvasClientErrorCode,
    message: string,
    options: {
      readonly status?: number;
      readonly retryAfterMs?: number | null;
      readonly attemptCount?: number;
    } = {},
  ) {
    super(message);
    this.name = "CanvasClientError";
    this.code = code;
    this.status = options.status ?? null;
    this.retryAfterMs = options.retryAfterMs ?? null;
    this.attemptCount = options.attemptCount ?? 1;
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
  private readonly resolveHostname: CanvasHostnameResolver | null;

  public constructor({
    allowHttpForTesting = false,
    baseUrl,
    fetchImpl = globalThis.fetch,
    maxPages = DEFAULT_MAX_PAGES,
    now = () => new Date(),
    personalAccessToken,
    resolveHostname,
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
    if (
      resolveHostname !== undefined &&
      typeof resolveHostname !== "function"
    ) {
      throw new CanvasClientError(
        "canvas_request_failed",
        "A Canvas hostname resolver must be a function.",
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
    this.resolveHostname = resolveHostname ?? null;
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

  public async listCourseInventory(): Promise<readonly CanvasCourse[]> {
    const parsed = await this.requestPaginatedJson(
      createPathWithQuery("/courses", [
        ["per_page", String(DEFAULT_PER_PAGE)],
        ["state[]", "unpublished"],
        ["state[]", "available"],
        ["state[]", "completed"],
        ["include[]", "term"],
        ["include[]", "concluded"],
        ["include[]", "sections"],
      ]),
    );
    return parsed.map(normalizeCourse);
  }

  public async listModules(courseId: string): Promise<readonly CanvasModule[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/modules?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizeModule);
  }

  public async listModuleItems(
    courseId: string,
    moduleId: string,
  ): Promise<readonly CanvasModuleItem[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/modules/${encodeCanvasPathSegment(moduleId)}/items?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizeModuleItem);
  }

  public async listPages(courseId: string): Promise<readonly CanvasPageSummary[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/pages?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizePageSummary);
  }

  public async getPage(
    courseId: string,
    pageUrl: string,
  ): Promise<CanvasPageDetail> {
    const parsed = await this.requestJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/pages/${encodeCanvasPathSegment(pageUrl)}`,
    );
    return normalizePageDetail(parsed);
  }

  public async listAssignmentGroups(
    courseId: string,
  ): Promise<readonly CanvasAssignmentGroup[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/assignment_groups?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizeAssignmentGroup);
  }

  public async listAssignments(
    courseId: string,
  ): Promise<readonly CanvasAssignment[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/assignments?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizeAssignment);
  }

  public async listPlannerItems({
    contextCodes,
    endDate,
    startDate,
  }: CanvasPlannerItemsListOptions): Promise<readonly CanvasPlannerItem[]> {
    const parsed = await this.requestPaginatedJson(
      createPathWithQuery("/planner/items", [
        ["per_page", String(DEFAULT_PER_PAGE)],
        ["start_date", normalizeQueryDate(startDate, "start_date")],
        ["end_date", normalizeQueryDate(endDate, "end_date")],
        ...normalizeContextCodes(contextCodes).map(
          (contextCode) => ["context_codes[]", contextCode] as const,
        ),
      ]),
    );
    return parsed.map(normalizePlannerItem);
  }

  public async listAnnouncements({
    courseId,
    endDate,
    startDate,
  }: CanvasAnnouncementsListOptions): Promise<readonly CanvasAnnouncement[]> {
    const contextCode = `course_${encodeCanvasContextCodeId(courseId)}`;
    const parsed = await this.requestPaginatedJson(
      createPathWithQuery("/announcements", [
        ["per_page", String(DEFAULT_PER_PAGE)],
        ["context_codes[]", contextCode],
        ["start_date", normalizeQueryDate(startDate, "start_date")],
        ["end_date", normalizeQueryDate(endDate, "end_date")],
      ]),
    );
    return parsed.map(normalizeAnnouncement);
  }

  public async listCourseFiles(courseId: string): Promise<readonly CanvasFile[]> {
    const parsed = await this.requestPaginatedJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/files?per_page=${DEFAULT_PER_PAGE}`,
    );
    return parsed.map(normalizeFile);
  }

  public async getCourseFile(
    courseId: string,
    fileId: string,
  ): Promise<CanvasFile> {
    const parsed = await this.requestJson(
      `/courses/${encodeCanvasPathSegment(courseId)}/files/${encodeCanvasPathSegment(fileId)}`,
    );
    return normalizeFile(parsed);
  }

  public async downloadFile(
    file: CanvasFile,
    options: CanvasFileDownloadOptions,
  ): Promise<CanvasDownloadedFile> {
    const downloadUrl = normalizeDownloadStartUrl({
      apiBaseUrl: this.apiBaseUrl,
      baseUrl: this.baseUrl,
      file,
    });
    const maxBytes = normalizePositiveInteger(
      options.maxBytes,
      "Canvas file download byte limit",
    );
    const timeoutMs = normalizePositiveInteger(
      options.timeoutMs,
      "Canvas file download timeout",
    );
    const maxRedirects = normalizeBoundedInteger(
      options.maxRedirects,
      "Canvas file download redirect limit",
      0,
      10,
    );

    return downloadCanvasFile({
      canvasOrigin: new URL(this.baseUrl).origin,
      fetchImpl: this.fetchImpl,
      maxBytes,
      maxRedirects,
      personalAccessToken: this.personalAccessToken,
      resolveHostname: this.resolveHostname,
      startUrl: downloadUrl,
      timeoutMs,
    });
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
    const seenUrls = new Set<string>();

    for (let page = 0; page < this.maxPages; page += 1) {
      if (seenUrls.has(nextUrl.toString())) {
        throw new CanvasClientError(
          "canvas_pagination_rejected",
          "Canvas pagination link repeated a previously fetched page.",
        );
      }
      seenUrls.add(nextUrl.toString());

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

    throw new CanvasClientError(
      "canvas_pagination_rejected",
      "Canvas pagination exceeded the configured page limit.",
    );
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
        redirect: "manual",
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
        "canvas_network_error",
        "Canvas request failed before receiving a response.",
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (isRedirectStatus(response.status)) {
      throw new CanvasClientError(
        "canvas_redirect_rejected",
        "Canvas redirects are not followed for authenticated requests.",
        { status: response.status },
      );
    }

    if (!response.ok) {
      throw mapHttpError(response.status, response.headers, this.now());
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

async function downloadCanvasFile({
  canvasOrigin,
  fetchImpl,
  maxBytes,
  maxRedirects,
  personalAccessToken,
  resolveHostname,
  startUrl,
  timeoutMs,
}: {
  readonly canvasOrigin: string;
  readonly fetchImpl: typeof fetch;
  readonly maxBytes: number;
  readonly maxRedirects: number;
  readonly personalAccessToken: string;
  readonly resolveHostname: CanvasHostnameResolver | null;
  readonly startUrl: URL;
  readonly timeoutMs: number;
}): Promise<CanvasDownloadedFile> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const seenUrls = new Set<string>();
  let currentUrl = startUrl;

  try {
    for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
      await validateDownloadTarget({
        canvasOrigin,
        resolveHostname,
        url: currentUrl,
      });
      const serializedUrl = currentUrl.toString();
      if (seenUrls.has(serializedUrl)) {
        throw new CanvasClientError(
          "canvas_file_redirect_rejected",
          "Canvas file download redirect loop was rejected.",
        );
      }
      seenUrls.add(serializedUrl);

      const headers: Record<string, string> = {
        Accept: "application/octet-stream",
      };
      if (currentUrl.origin === canvasOrigin) {
        headers.Authorization = `Bearer ${personalAccessToken}`;
      }

      let response: Response;
      try {
        response = await fetchImpl(serializedUrl, {
          method: "GET",
          headers,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (error) {
        throw downloadFetchError(error, controller.signal.aborted);
      }

      if (isRedirectStatus(response.status)) {
        if (redirectCount >= maxRedirects) {
          throw new CanvasClientError(
            "canvas_file_redirect_rejected",
            "Canvas file download exceeded the redirect limit.",
            { status: response.status },
          );
        }
        currentUrl = resolveRedirectLocation(
          response.headers.get("location"),
          currentUrl,
          canvasOrigin,
        );
        continue;
      }

      if (!response.ok) {
        throw new CanvasClientError(
          "canvas_file_download_failed",
          "Canvas file download returned an unsuccessful response.",
          { status: response.status },
        );
      }

      const contentLength = parseContentLength(response.headers.get("content-length"));
      if (contentLength !== null && contentLength > maxBytes) {
        throw new CanvasClientError(
          "canvas_file_too_large",
          "Canvas file download exceeds the configured byte limit.",
          { status: response.status },
        );
      }

      const bytes = await readBoundedResponseBody({
        maxBytes,
        response,
        signal: controller.signal,
      });
      return {
        bytes,
        byteLength: bytes.byteLength,
        contentType: stringOrNull(response.headers.get("content-type")),
      };
    }
  } finally {
    clearTimeout(timeoutId);
  }

  throw new CanvasClientError(
    "canvas_file_redirect_rejected",
    "Canvas file download exceeded the redirect limit.",
  );
}

function normalizeDownloadStartUrl({
  apiBaseUrl,
  baseUrl,
  file,
}: {
  readonly apiBaseUrl: string;
  readonly baseUrl: string;
  readonly file: CanvasFile;
}): URL {
  if (!file.id.trim()) {
    throw new CanvasClientError(
      "canvas_file_download_failed",
      "Canvas file metadata was missing an identifier.",
    );
  }

  let parsed: URL;
  if (file.downloadUrl) {
    try {
      parsed = new URL(file.downloadUrl, baseUrl);
    } catch {
      throw new CanvasClientError(
        "canvas_file_download_failed",
        "Canvas file download URL was invalid.",
      );
    }
  } else {
    parsed = new URL(`${apiBaseUrl}/files/${encodeCanvasPathSegment(file.id)}`);
  }

  if (parsed.origin !== new URL(baseUrl).origin) {
    throw new CanvasClientError(
      "canvas_file_download_failed",
      "Canvas file download must start from the connected Canvas origin.",
    );
  }
  return parsed;
}

function resolveRedirectLocation(
  location: string | null,
  currentUrl: URL,
  canvasOrigin: string,
): URL {
  if (!location?.trim()) {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download redirect was missing a target.",
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(location, currentUrl);
  } catch {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download redirect was invalid.",
    );
  }
  validateDownloadTargetSyntax(parsed, canvasOrigin);
  return parsed;
}

async function validateDownloadTarget({
  canvasOrigin,
  resolveHostname,
  url,
}: {
  readonly canvasOrigin: string;
  readonly resolveHostname: CanvasHostnameResolver | null;
  readonly url: URL;
}): Promise<void> {
  validateDownloadTargetSyntax(url, canvasOrigin);
  if (!resolveHostname) {
    return;
  }

  let addresses: readonly string[];
  try {
    addresses = await resolveHostname(url.hostname);
  } catch {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download target could not be safely resolved.",
    );
  }
  if (
    addresses.length === 0 ||
    addresses.some((address) => isUnsafeDownloadHostname(address))
  ) {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download target resolved to a rejected address.",
    );
  }
}

function validateDownloadTargetSyntax(url: URL, canvasOrigin: string): void {
  if (url.username || url.password) {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download redirect included embedded credentials.",
    );
  }

  if (url.protocol !== "https:" && !(url.origin === canvasOrigin && url.protocol === "http:")) {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download redirect used an unsupported scheme.",
    );
  }

  if (isUnsafeDownloadHostname(url.hostname)) {
    throw new CanvasClientError(
      "canvas_file_redirect_rejected",
      "Canvas file download redirect target was rejected.",
    );
  }
}

async function readBoundedResponseBody({
  maxBytes,
  response,
  signal,
}: {
  readonly maxBytes: number;
  readonly response: Response;
  readonly signal: AbortSignal;
}): Promise<Uint8Array> {
  if (!response.body) {
    return new Uint8Array();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      let read: ReadableStreamReadResult<Uint8Array>;
      try {
        read = await reader.read();
      } catch (error) {
        throw downloadFetchError(error, signal.aborted);
      }
      if (read.done) {
        break;
      }
      const chunk = read.value;
      totalBytes += chunk.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new CanvasClientError(
          "canvas_file_too_large",
          "Canvas file download exceeded the configured byte limit.",
          { status: response.status },
        );
      }
      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function downloadFetchError(error: unknown, aborted: boolean): CanvasClientError {
  if (aborted || isAbortError(error)) {
    return new CanvasClientError(
      "canvas_file_download_timeout",
      "Canvas file download timed out.",
    );
  }
  return new CanvasClientError(
    "canvas_file_download_failed",
    "Canvas file download failed before completion.",
  );
}

function parseContentLength(value: string | null): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value.trim());
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

function normalizePositiveInteger(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new CanvasClientError("canvas_request_failed", `${label} is invalid.`);
  }
  return value;
}

function normalizeBoundedInteger(
  value: number,
  label: string,
  min: number,
  max: number,
): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new CanvasClientError("canvas_request_failed", `${label} is invalid.`);
  }
  return value;
}

function isUnsafeDownloadHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const mappedIpv4 = normalized.startsWith("::ffff:")
    ? parseIpv4Address(normalized.slice("::ffff:".length))
    : null;
  if (mappedIpv4) {
    return isUnsafeIpv4Address(mappedIpv4);
  }
  if (
    normalized === "localhost" ||
    normalized === "0.0.0.0" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local")
  ) {
    return true;
  }

  const ipv4 = parseIpv4Address(normalized);
  if (ipv4) {
    return isUnsafeIpv4Address(ipv4);
  }

  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd")
  );
}

function isUnsafeIpv4Address(
  ipv4: readonly [number, number, number, number],
): boolean {
  const [first, second] = ipv4;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127) ||
    first === 0
  );
}

function parseIpv4Address(value: string): readonly [number, number, number, number] | null {
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets = parts.map((part) => Number(part));
  if (
    octets.every(
      (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
    )
  ) {
    return octets as [number, number, number, number];
  }
  return null;
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
  const name =
    stringOrNull(value.name) ??
    stringOrNull(value.friendly_name) ??
    stringOrNull(value.course_code) ??
    "Untitled Canvas course";
  if (!id) {
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
    accountId: normalizeId(value.account_id),
    startAt: stringOrNull(value.start_at),
    endAt: stringOrNull(value.end_at),
    timeZone: stringOrNull(value.time_zone),
    publicSyllabus: booleanOrNull(value.public_syllabus),
    syllabusBody: stringOrNull(value.syllabus_body),
    updatedAt: stringOrNull(value.updated_at),
    concluded: booleanOrNull(value.concluded),
    term: normalizeCourseTerm(value.term),
    enrollments: normalizeCourseEnrollments(value.enrollments),
    sections: normalizeCourseSections(value.sections),
  };
}

function normalizeCourseTerm(value: unknown): CanvasCourseTerm | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: normalizeId(value.id),
    name: stringOrNull(value.name),
    startAt: stringOrNull(value.start_at),
    endAt: stringOrNull(value.end_at),
  };
}

function normalizeCourseEnrollments(
  value: unknown,
): readonly CanvasCourseEnrollment[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((enrollment) => ({
    id: normalizeId(enrollment.id),
    type: stringOrNull(enrollment.type),
    role: stringOrNull(enrollment.role),
    roleId: normalizeId(enrollment.role_id),
    enrollmentState: stringOrNull(enrollment.enrollment_state),
    workflowState: stringOrNull(enrollment.workflow_state),
    limitPrivilegesToCourseSection: booleanOrNull(
      enrollment.limit_privileges_to_course_section,
    ),
  }));
}

function normalizeCourseSections(
  value: unknown,
): readonly CanvasCourseSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).map((section) => ({
    id: normalizeId(section.id),
    name: stringOrNull(section.name),
    startAt: stringOrNull(section.start_at),
    endAt: stringOrNull(section.end_at),
    enrollmentRole: stringOrNull(section.enrollment_role),
  }));
}

function normalizeModule(value: unknown): CanvasModule {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas module response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const name = stringOrNull(value.name);
  if (!id || !name) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas module response was missing required fields.",
    );
  }

  return {
    id,
    name,
    position: integerOrNull(value.position),
    unlockAt: stringOrNull(value.unlock_at),
    itemCount: integerOrNull(value.items_count),
    requireSequentialProgress: booleanOrNull(value.require_sequential_progress),
    published: booleanOrNull(value.published),
    prerequisiteModuleIds: idArray(value.prerequisite_module_ids),
    state: stringOrNull(value.state),
  };
}

function normalizeModuleItem(value: unknown): CanvasModuleItem {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas module item response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const title = stringOrNull(value.title);
  const type = stringOrNull(value.type);
  if (!id || !title || !type) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas module item response was missing required fields.",
    );
  }

  return {
    id,
    title,
    position: integerOrNull(value.position),
    indent: integerOrNull(value.indent),
    type,
    contentId: normalizeId(value.content_id),
    pageUrl: stringOrNull(value.page_url),
    externalUrl: stringOrNull(value.external_url),
    htmlUrl: stringOrNull(value.html_url),
    newTab: booleanOrNull(value.new_tab),
    published: booleanOrNull(value.published),
    completionRequirement: jsonObjectOrNull(value.completion_requirement),
    contentDetails: jsonObjectOrNull(value.content_details),
  };
}

function normalizePageSummary(value: unknown): CanvasPageSummary {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas Page response was invalid.",
    );
  }

  const url = stringOrNull(value.url);
  const title = stringOrNull(value.title);
  if (!url || !title) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas Page response was missing required fields.",
    );
  }

  return {
    pageId: normalizeId(value.page_id),
    url,
    title,
    published: booleanOrNull(value.published),
    frontPage: booleanOrNull(value.front_page),
    editingRoles: stringOrNull(value.editing_roles),
    lockInfo: jsonObjectOrNull(value.lock_info),
    unlockAt: stringOrNull(value.unlock_at),
    lockAt: stringOrNull(value.lock_at),
    createdAt: stringOrNull(value.created_at),
    updatedAt: stringOrNull(value.updated_at),
  };
}

function normalizePageDetail(value: unknown): CanvasPageDetail {
  const summary = normalizePageSummary(value);
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas Page detail response was invalid.",
    );
  }

  return {
    ...summary,
    body: stringOrNull(value.body),
  };
}

function normalizeAssignmentGroup(value: unknown): CanvasAssignmentGroup {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas assignment group response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const name = stringOrNull(value.name);
  if (!id || !name) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas assignment group response was missing required fields.",
    );
  }

  return {
    id,
    name,
    position: integerOrNull(value.position),
    groupWeight: numberOrNull(value.group_weight),
    rules: jsonObjectOrNull(value.rules),
    integrationData: jsonObjectOrNull(value.integration_data),
  };
}

function normalizeAssignment(value: unknown): CanvasAssignment {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas assignment response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const name = stringOrNull(value.name);
  if (!id || !name) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas assignment response was missing required fields.",
    );
  }

  return {
    id,
    assignmentGroupId: normalizeId(value.assignment_group_id),
    name,
    description: stringOrNull(value.description),
    position: integerOrNull(value.position),
    pointsPossible: numberOrNull(value.points_possible),
    gradingType: stringOrNull(value.grading_type),
    submissionTypes: stringArray(value.submission_types),
    dueAt: stringOrNull(value.due_at),
    unlockAt: stringOrNull(value.unlock_at),
    lockAt: stringOrNull(value.lock_at),
    published: booleanOrNull(value.published),
    muted: booleanOrNull(value.muted),
    omitFromFinalGrade: booleanOrNull(value.omit_from_final_grade),
    anonymousGrading: booleanOrNull(value.anonymous_grading),
    htmlUrl: stringOrNull(value.html_url),
    quizId: normalizeId(value.quiz_id),
    discussionTopicId: normalizeId(value.discussion_topic_id),
    createdAt: stringOrNull(value.created_at),
    updatedAt: stringOrNull(value.updated_at),
  };
}

function normalizePlannerItem(value: unknown): CanvasPlannerItem {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas planner item response was invalid.",
    );
  }

  const plannableId = normalizeId(value.plannable_id);
  const plannableType = stringOrNull(value.plannable_type);
  if (!plannableId || !plannableType) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas planner item response was missing required fields.",
    );
  }

  const plannable = isRecord(value.plannable) ? value.plannable : null;
  const courseId =
    normalizeId(value.course_id) ?? normalizeId(plannable?.course_id);
  const contextType = stringOrNull(value.context_type);
  const explicitContextCode = stringOrNull(value.context_code);

  return {
    contextType,
    contextCode:
      explicitContextCode ??
      (courseId && (!contextType || contextType.toLowerCase() === "course")
        ? `course_${courseId}`
        : null),
    courseId,
    plannableId,
    plannableType,
    title:
      stringOrNull(value.title) ??
      stringOrNull(plannable?.title) ??
      stringOrNull(plannable?.name),
    plannerDate:
      stringOrNull(value.plannable_date) ??
      stringOrNull(plannable?.plannable_date) ??
      stringOrNull(plannable?.due_at) ??
      stringOrNull(plannable?.todo_date) ??
      stringOrNull(plannable?.start_at),
    dueAt: stringOrNull(plannable?.due_at),
    todoDate: stringOrNull(plannable?.todo_date),
    htmlUrl: stringOrNull(value.html_url) ?? stringOrNull(plannable?.html_url),
    workflowState:
      stringOrNull(value.workflow_state) ??
      stringOrNull(plannable?.workflow_state),
    plannerOverride: normalizePlannerOverride(value.planner_override),
    submission: normalizePlannerSubmission(value.submissions),
  };
}

function normalizePlannerOverride(
  value: unknown,
): CanvasPlannerOverrideSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    id: normalizeId(value.id),
    plannableType: stringOrNull(value.plannable_type),
    plannableId: normalizeId(value.plannable_id),
    workflowState: stringOrNull(value.workflow_state),
    markedComplete: booleanOrNull(value.marked_complete),
    dismissed: booleanOrNull(value.dismissed),
    deletedAt: stringOrNull(value.deleted_at),
    createdAt: stringOrNull(value.created_at),
    updatedAt: stringOrNull(value.updated_at),
  };
}

function normalizePlannerSubmission(
  value: unknown,
): CanvasPlannerSubmissionState | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    excused: booleanOrNull(value.excused),
    graded: booleanOrNull(value.graded),
    late: booleanOrNull(value.late),
    missing: booleanOrNull(value.missing),
    needsGrading: booleanOrNull(value.needs_grading),
    withFeedback: booleanOrNull(value.with_feedback),
  };
}

function normalizeAnnouncement(value: unknown): CanvasAnnouncement {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas announcement response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  const title = stringOrNull(value.title);
  if (!id || !title) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas announcement response was missing required fields.",
    );
  }

  return {
    id,
    contextCode: stringOrNull(value.context_code),
    title,
    message: stringOrNull(value.message),
    postedAt: stringOrNull(value.posted_at),
    delayedPostAt: stringOrNull(value.delayed_post_at),
    lockAt: stringOrNull(value.lock_at),
    todoDate: stringOrNull(value.todo_date),
    workflowState: stringOrNull(value.workflow_state),
    published: booleanOrNull(value.published),
    locked: booleanOrNull(value.locked),
    htmlUrl: stringOrNull(value.html_url),
  };
}

function normalizeFile(value: unknown): CanvasFile {
  if (!isRecord(value)) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas File response was invalid.",
    );
  }

  const id = normalizeId(value.id);
  if (!id) {
    throw new CanvasClientError(
      "canvas_invalid_response",
      "Canvas File response was missing required fields.",
    );
  }

  return {
    id,
    folderId: normalizeId(value.folder_id),
    displayName: stringOrNull(value.display_name),
    filename: stringOrNull(value.filename),
    contentType:
      stringOrNull(value["content-type"]) ?? stringOrNull(value.content_type),
    size: integerOrNull(value.size),
    createdAt: stringOrNull(value.created_at),
    updatedAt: stringOrNull(value.updated_at),
    modifiedAt: stringOrNull(value.modified_at),
    lockAt: stringOrNull(value.lock_at),
    unlockAt: stringOrNull(value.unlock_at),
    locked: booleanOrNull(value.locked),
    hidden: booleanOrNull(value.hidden),
    hiddenForUser: booleanOrNull(value.hidden_for_user),
    visibilityLevel: stringOrNull(value.visibility_level),
    mediaClass: stringOrNull(value.media_class),
    mediaEntryId: normalizeId(value.media_entry_id),
    downloadUrl: stringOrNull(value.url),
  };
}

function encodeCanvasPathSegment(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new CanvasClientError(
      "canvas_request_failed",
      "Canvas API path segment must not be blank.",
    );
  }
  return encodeURIComponent(trimmed);
}

function encodeCanvasContextCodeId(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new CanvasClientError(
      "canvas_request_failed",
      "Canvas context code identifier must not be blank.",
    );
  }
  return trimmed;
}

function createPathWithQuery(
  path: string,
  entries: readonly (readonly [string, string])[],
): string {
  if (!path.startsWith("/")) {
    throw new CanvasClientError(
      "canvas_request_failed",
      "Canvas API path must start with a slash.",
    );
  }
  const params = new URLSearchParams();
  for (const [key, value] of entries) {
    params.append(key, value);
  }
  return `${path}?${params.toString()}`;
}

function normalizeQueryDate(value: string, label: string): string {
  const trimmed = value.trim();
  if (!trimmed || !Number.isFinite(Date.parse(trimmed))) {
    throw new CanvasClientError(
      "canvas_request_failed",
      `Canvas ${label} must be a valid date string.`,
    );
  }
  return trimmed;
}

function normalizeContextCodes(values: readonly string[]): readonly string[] {
  const normalized = values.map((value) => value.trim()).filter(Boolean);
  if (normalized.length === 0) {
    throw new CanvasClientError(
      "canvas_request_failed",
      "At least one Canvas context code is required.",
    );
  }
  return normalized;
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

function integerOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function idArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(normalizeId).filter((id): id is string => id !== null);
}

function stringArray(value: unknown): readonly CanvasAssignmentSubmissionType[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is CanvasAssignmentSubmissionType =>
      typeof entry === "string" && entry.trim().length > 0,
  );
}

function jsonObjectOrNull(value: unknown): CanvasJsonObject | null {
  if (!isRecord(value)) {
    return null;
  }
  return isJsonObject(value) ? value : null;
}

function isJsonObject(value: Readonly<Record<string, unknown>>): value is CanvasJsonObject {
  return Object.values(value).every(
    (entry) => entry === undefined || isJsonValue(entry),
  );
}

function isJsonValue(value: unknown): value is CanvasJson {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isFinite(value);
  }
  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }
  if (isRecord(value)) {
    return isJsonObject(value);
  }
  return false;
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

function mapHttpError(
  status: number,
  headers: Headers,
  now: Date,
): CanvasClientError {
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
      "canvas_not_found",
      "Canvas resource was not found.",
      { status },
    );
  }
  if (status === 429) {
    return new CanvasClientError(
      "canvas_rate_limited",
      "Canvas rate limited the request.",
      { retryAfterMs: parseRetryAfterMs(headers.get("retry-after"), now), status },
    );
  }
  if (status >= 500) {
    return new CanvasClientError(
      "canvas_unavailable",
      "Canvas is temporarily unavailable.",
      { retryAfterMs: parseRetryAfterMs(headers.get("retry-after"), now), status },
    );
  }
  return new CanvasClientError(
    "canvas_request_failed",
    "Canvas returned an unsuccessful response.",
    { status },
  );
}

function isRedirectStatus(status: number): boolean {
  return status >= 300 && status < 400;
}

function parseRetryAfterMs(value: string | null, now: Date): number | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(Math.round(seconds * 1000), MAX_RETRY_AFTER_MS);
  }

  const retryAt = Date.parse(trimmed);
  if (!Number.isFinite(retryAt)) {
    return null;
  }

  return Math.min(Math.max(0, retryAt - now.getTime()), MAX_RETRY_AFTER_MS);
}

function statusForProbeError(error: unknown): CanvasCapabilityStatus {
  if (!(error instanceof CanvasClientError)) {
    return "temporarily_failed";
  }
  if (error.code === "canvas_forbidden" || error.code === "canvas_unauthorized") {
    return "permission_denied";
  }
  if (error.code === "canvas_not_found") {
    return "not_supported";
  }
  if (
    error.code === "canvas_rate_limited" ||
    error.code === "canvas_timeout" ||
    error.code === "canvas_unavailable" ||
    error.code === "canvas_network_error" ||
    error.code === "canvas_redirect_rejected" ||
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
