import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptCanvasToken } from "@/lib/canvas-token-encryption";

const mocks = vi.hoisted(() => ({
  constructorCalls: [] as Array<{
    readonly baseUrl: string;
    readonly personalAccessToken: string;
  }>,
  createCanvasServiceClient: vi.fn(),
  verifyBearerToken: vi.fn(),
  canvas: {
    courses: [] as readonly CanvasCourseFixture[],
    fixtures: new Map<string, CourseFixture>(),
    errors: new Map<string, unknown>(),
    inFlightCourses: 0,
    inFlightModuleItems: 0,
    inFlightPageDetails: 0,
    maxInFlightCourses: 0,
    maxInFlightModuleItems: 0,
    maxInFlightPageDetails: 0,
  },
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));

vi.mock("@stay-focused/canvas", () => {
  class CanvasClientError extends Error {
    public readonly code: string;
    public readonly status: number | null;
    public readonly retryAfterMs: number | null;
    public readonly attemptCount: number;

    public constructor(
      code: string,
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

  class CanvasClient {
    public constructor(options: {
      readonly baseUrl: string;
      readonly personalAccessToken: string;
    }) {
      mocks.constructorCalls.push(options);
    }

    public async listCourses(): Promise<readonly CanvasCourseFixture[]> {
      throwIfConfigured("courses");
      return withCourseConcurrency(() => Promise.resolve(mocks.canvas.courses));
    }

    public async listModules(courseId: string): Promise<readonly CanvasModuleFixture[]> {
      throwIfConfigured(`modules:${courseId}`);
      return getFixture(courseId).modules;
    }

    public async listModuleItems(
      courseId: string,
      moduleId: string,
    ): Promise<readonly CanvasModuleItemFixture[]> {
      throwIfConfigured(`moduleItems:${courseId}:${moduleId}`);
      return withModuleItemConcurrency(async () =>
        getFixture(courseId).moduleItems.get(moduleId) ?? [],
      );
    }

    public async listPages(courseId: string): Promise<readonly CanvasPageSummaryFixture[]> {
      throwIfConfigured(`pages:${courseId}`);
      return getFixture(courseId).pages;
    }

    public async getPage(
      courseId: string,
      pageUrl: string,
    ): Promise<CanvasPageDetailFixture> {
      throwIfConfigured(`page:${courseId}:${pageUrl}`);
      return withPageDetailConcurrency(async () => {
        const page = getFixture(courseId).pageDetails.get(pageUrl);
        if (!page) {
          throw new CanvasClientError("canvas_invalid_response", "Page missing.");
        }
        return page;
      });
    }

    public async listAssignmentGroups(
      courseId: string,
    ): Promise<readonly CanvasAssignmentGroupFixture[]> {
      throwIfConfigured(`assignmentGroups:${courseId}`);
      return getFixture(courseId).assignmentGroups;
    }

    public async listAssignments(
      courseId: string,
    ): Promise<readonly CanvasAssignmentFixture[]> {
      throwIfConfigured(`assignments:${courseId}`);
      return getFixture(courseId).assignments;
    }
  }

  function getFixture(courseId: string): CourseFixture {
    const fixture = mocks.canvas.fixtures.get(courseId);
    if (!fixture) {
      throw new CanvasClientError("canvas_invalid_response", "Fixture missing.");
    }
    return fixture;
  }

  function throwIfConfigured(key: string): void {
    const error = mocks.canvas.errors.get(key);
    if (Array.isArray(error)) {
      const [next, ...remaining] = error;
      if (remaining.length > 0) {
        mocks.canvas.errors.set(key, remaining);
      } else {
        mocks.canvas.errors.delete(key);
      }
      if (next) {
        throw next;
      }
      return;
    }
    if (error) {
      throw error;
    }
  }

  async function withCourseConcurrency<T>(action: () => Promise<T>): Promise<T> {
    mocks.canvas.inFlightCourses += 1;
    mocks.canvas.maxInFlightCourses = Math.max(
      mocks.canvas.maxInFlightCourses,
      mocks.canvas.inFlightCourses,
    );
    await Promise.resolve();
    try {
      return await action();
    } finally {
      mocks.canvas.inFlightCourses -= 1;
    }
  }

  async function withModuleItemConcurrency<T>(
    action: () => Promise<T>,
  ): Promise<T> {
    mocks.canvas.inFlightModuleItems += 1;
    mocks.canvas.maxInFlightModuleItems = Math.max(
      mocks.canvas.maxInFlightModuleItems,
      mocks.canvas.inFlightModuleItems,
    );
    await Promise.resolve();
    try {
      return await action();
    } finally {
      mocks.canvas.inFlightModuleItems -= 1;
    }
  }

  async function withPageDetailConcurrency<T>(
    action: () => Promise<T>,
  ): Promise<T> {
    mocks.canvas.inFlightPageDetails += 1;
    mocks.canvas.maxInFlightPageDetails = Math.max(
      mocks.canvas.maxInFlightPageDetails,
      mocks.canvas.inFlightPageDetails,
    );
    await Promise.resolve();
    try {
      return await action();
    } finally {
      mocks.canvas.inFlightPageDetails -= 1;
    }
  }

  return {
    CanvasClient,
    CanvasClientError,
    normalizeCanvasBaseUrl: (value: string) => value.trim().replace(/\/+$/, ""),
  };
});

const syncRoute = await import("./route");
const { CanvasClientError } = await import("@stay-focused/canvas");

const ENCRYPTION_KEY = randomBytes(32).toString("base64");
const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";
const CONNECTION_A = "10000000-0000-0000-0000-00000000000a";

describe("POST /api/canvas/sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CANVAS_TOKEN_ENCRYPTION_KEY = ENCRYPTION_KEY;
    mocks.constructorCalls.length = 0;
    mocks.verifyBearerToken.mockResolvedValue({ id: USER_A });
    mocks.canvas.courses = [];
    mocks.canvas.fixtures = new Map<string, CourseFixture>();
    mocks.canvas.errors = new Map<string, unknown>();
    mocks.canvas.inFlightCourses = 0;
    mocks.canvas.inFlightModuleItems = 0;
    mocks.canvas.inFlightPageDetails = 0;
    mocks.canvas.maxInFlightCourses = 0;
    mocks.canvas.maxInFlightModuleItems = 0;
    mocks.canvas.maxInFlightPageDetails = 0;
  });

  it("requires bearer authentication", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await syncRoute.POST(createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.createCanvasServiceClient).not.toHaveBeenCalled();
  });

  it("rejects invalid bearer tokens before loading Canvas state", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.constructorCalls).toHaveLength(0);
  });

  it("returns missing connection for an authenticated user without Canvas", async () => {
    const db = createSyncDb({ connectionRows: [] });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(404);
    await expectError(response, "canvas_connection_missing");
  });

  it("loads only the authenticated user's connection and ignores request ownership fields", async () => {
    const db = createSyncDb({
      connectionRows: [connectionRow({ user_id: USER_A, id: CONNECTION_A })],
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);
    mocks.verifyBearerToken.mockResolvedValue({ id: USER_B });

    const response = await syncRoute.POST(
      createRequest({
        body: {
          userId: USER_A,
          canvasConnectionId: CONNECTION_A,
        },
      }),
    );

    expect(response.status).toBe(404);
    await expectError(response, "canvas_connection_missing");
    expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).toBeNull();
  });

  it("rejects an overlapping non-stale sync run", async () => {
    const db = createSyncDb({
      connectionRows: [connectionRow()],
      activeRun: true,
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(409);
    await expectError(response, "canvas_sync_in_progress");
  });

  it("recovers a stale abandoned sync run", async () => {
    const db = createSyncDb({
      connectionRows: [connectionRow()],
      staleRun: true,
    });
    setCanvasFixture([course("course-1")], [courseFixture("course-1")]);
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "succeeded",
      courses: { discovered: 1, succeeded: 1, failed: 0 },
    });
    expect(db.runningRunCount(CONNECTION_A)).toBe(0);
    expect(db.recoveredStaleRunCount()).toBe(1);
  });

  it("synchronizes multiple complete course snapshots and returns safe counts only", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    setCanvasFixture(
      [course("course-1"), course("course-2")],
      [
        courseFixture("course-1", {
          modules: [module("module-1"), module("module-2")],
          moduleItems: new Map([
            [
              "module-1",
              [
                moduleItem("item-1", {
                  title: "Private Module Item Title",
                  type: "Page",
                }),
              ],
            ],
            ["module-2", [moduleItem("item-2", { type: "ExternalTool" })]],
          ]),
          pages: [pageSummary("page-one")],
          pageDetails: new Map([
            [
              "page-one",
              pageDetail("page-one", {
                body: "<p>Private Page body.</p>",
                title: "Private Page Title",
              }),
            ],
          ]),
          assignmentGroups: [assignmentGroup("group-1")],
          assignments: [
            assignment("assignment-1", {
              assignmentGroupId: "group-1",
              description: "<p>Private assignment description.</p>",
              submissionTypes: ["online_quiz"],
            }),
          ],
        }),
        courseFixture("course-2", {
          modules: [],
          moduleItems: new Map(),
          pages: [],
          pageDetails: new Map(),
          assignmentGroups: [],
          assignments: [],
        }),
      ],
    );
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "succeeded",
      courses: { discovered: 2, succeeded: 2, failed: 0 },
      resources: {
        modules: 2,
        moduleItems: 2,
        pages: 1,
        assignmentGroups: 1,
        assignments: 1,
      },
    });
    expect(text).not.toContain("Private");
    expect(text).not.toContain("<p>");
    expect(text).not.toContain("stored-secret-token");
    expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).toMatchObject({
      modules: expect.arrayContaining([
        expect.objectContaining({ canvasId: "module-1" }),
      ]),
    });
  });

  it("keeps bounded request concurrency while preserving complete persistence", async () => {
    const modules = [
      module("module-1"),
      module("module-2"),
      module("module-3"),
      module("module-4"),
    ];
    setCanvasFixture(
      [course("course-1"), course("course-2"), course("course-3")],
      [
        courseFixture("course-1", {
          modules,
          moduleItems: new Map(
            modules.map((entry) => [
              entry.id,
              [moduleItem(`item-${entry.id}`, { type: "Page" })],
            ]),
          ),
          pages: [
            pageSummary("page-1"),
            pageSummary("page-2"),
            pageSummary("page-3"),
            pageSummary("page-4"),
          ],
          pageDetails: new Map([
            ["page-1", pageDetail("page-1")],
            ["page-2", pageDetail("page-2")],
            ["page-3", pageDetail("page-3")],
            ["page-4", pageDetail("page-4")],
          ]),
        }),
        courseFixture("course-2"),
        courseFixture("course-3"),
      ],
    );
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(200);
    expect(mocks.canvas.maxInFlightModuleItems).toBeLessThanOrEqual(3);
    expect(mocks.canvas.maxInFlightPageDetails).toBeLessThanOrEqual(3);
    expect(db.persistedCourseIds()).toEqual(["course-1", "course-2", "course-3"]);
  });

  it("commits successful courses and preserves failed courses during a partial run", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    db.seedGraph(USER_A, CONNECTION_A, "course-2", {
      modules: ["old-module"],
      pages: ["old-page"],
      assignments: ["old-assignment"],
    });
    setCanvasFixture(
      [course("course-1"), course("course-2")],
      [courseFixture("course-1"), courseFixture("course-2")],
    );
    mocks.canvas.errors.set(
      "page:course-2:page-1",
      new CanvasClientError(
        "canvas_unavailable",
        "Canvas body contained Private Course Title and Bearer stored-secret-token",
        { status: 503 },
      ),
    );
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "partial",
      courses: { discovered: 2, succeeded: 1, failed: 1 },
      failures: [{ code: "canvas_course_page_detail_failed", count: 1 }],
    });
    expect(db.courseResults()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          failedOperation: "page_detail",
          failureCategory: "server_error",
          failureCode: "canvas_course_page_detail_failed",
          retryCount: 2,
          retryable: true,
          status: "failed",
        }),
        expect.objectContaining({
          failureCode: null,
          retryCount: 0,
          status: "succeeded",
        }),
      ]),
    );
    expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).not.toBeNull();
    expect(db.graphFor(USER_A, CONNECTION_A, "course-2")).toMatchObject({
      modules: [expect.objectContaining({ canvasId: "old-module" })],
      pages: [expect.objectContaining({ canvasId: "old-page" })],
      assignments: [expect.objectContaining({ canvasId: "old-assignment" })],
    });
    expect(text).not.toContain("Private Course Title");
    expect(text).not.toContain("stored-secret-token");
  });

  it("preserves the previous graph when module-item, assignment, or RPC persistence fails", async () => {
    for (const failure of ["module-item", "assignment", "rpc"] as const) {
      mocks.canvas.errors = new Map<string, unknown>();
      const db = createSyncDb({
        connectionRows: [connectionRow()],
        rpcFailure: failure === "rpc",
      });
      db.seedGraph(USER_A, CONNECTION_A, "course-1", {
        modules: ["old-module"],
        moduleItems: ["old-item"],
        assignments: ["old-assignment"],
      });
      setCanvasFixture([course("course-1")], [courseFixture("course-1")]);
      if (failure === "module-item") {
        mocks.canvas.errors.set(
          "moduleItems:course-1:module-1",
          new CanvasClientError("canvas_unavailable", "Private module item body"),
        );
      }
      if (failure === "assignment") {
        mocks.canvas.errors.set(
          "assignments:course-1",
          new CanvasClientError("canvas_unavailable", "Private assignment body"),
        );
      }
      mocks.createCanvasServiceClient.mockReturnValue(db);

      const response = await syncRoute.POST(createRequest());
      const expectedCode =
        failure === "module-item"
          ? "canvas_course_module_items_failed"
          : failure === "assignment"
            ? "canvas_course_assignments_failed"
            : "canvas_course_persistence_failed";
      const expectedOperation =
        failure === "module-item"
          ? "module_items"
          : failure === "assignment"
            ? "assignments"
            : "persistence";

      expect(response.status).toBe(failure === "rpc" ? 500 : 502);
      expect(db.courseResults()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            failedOperation: expectedOperation,
            failureCode: expectedCode,
            status: "failed",
          }),
        ]),
      );
      expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).toMatchObject({
        modules: [expect.objectContaining({ canvasId: "old-module" })],
        moduleItems: [expect.objectContaining({ canvasId: "old-item" })],
        assignments: [expect.objectContaining({ canvasId: "old-assignment" })],
      });
    }
  });

  it("retries transient course operations and records recovered courses", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    setCanvasFixture([course("course-1")], [courseFixture("course-1")]);
    mocks.canvas.errors.set("assignments:course-1", [
      new CanvasClientError("canvas_rate_limited", "Private transient body", {
        retryAfterMs: 10_000,
        status: 429,
      }),
      new CanvasClientError("canvas_unavailable", "Private transient body", {
        status: 503,
      }),
    ]);
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(JSON.parse(text)).toMatchObject({
      ok: true,
      status: "succeeded",
      courses: { discovered: 1, succeeded: 1, failed: 0 },
    });
    expect(db.courseResults()).toEqual([
      expect.objectContaining({
        failureCode: null,
        retryCount: 2,
        status: "succeeded",
      }),
    ]);
    expect(text).not.toContain("Private transient body");
  });

  it("does not retry non-retryable course operation failures", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    db.seedGraph(USER_A, CONNECTION_A, "course-1", {
      modules: ["old-module"],
      pages: ["old-page"],
    });
    setCanvasFixture([course("course-1")], [courseFixture("course-1")]);
    mocks.canvas.errors.set(
      "page:course-1:page-1",
      new CanvasClientError("canvas_not_found", "Private missing page", {
        status: 404,
      }),
    );
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(502);
    expect(db.courseResults()).toEqual([
      expect.objectContaining({
        failedOperation: "page_detail",
        failureCategory: "resource_not_found",
        failureCode: "canvas_course_page_detail_failed",
        retryCount: 0,
        retryable: false,
        status: "failed",
      }),
    ]);
    expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).toMatchObject({
      modules: [expect.objectContaining({ canvasId: "old-module" })],
      pages: [expect.objectContaining({ canvasId: "old-page" })],
    });
  });

  it("removes stale children only for a course with a complete empty snapshot", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    db.seedGraph(USER_A, CONNECTION_A, "course-1", {
      modules: ["old-module"],
      moduleItems: ["old-item"],
      pages: ["old-page"],
      assignmentGroups: ["old-group"],
      assignments: ["old-assignment"],
    });
    db.seedGraph(USER_A, CONNECTION_A, "course-2", {
      modules: ["keep-module"],
      pages: ["keep-page"],
    });
    setCanvasFixture(
      [course("course-1")],
      [
        courseFixture("course-1", {
          modules: [],
          moduleItems: new Map(),
          pages: [],
          pageDetails: new Map(),
          assignmentGroups: [],
          assignments: [],
        }),
      ],
    );
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await syncRoute.POST(createRequest());

    expect(response.status).toBe(200);
    expect(db.graphFor(USER_A, CONNECTION_A, "course-1")).toMatchObject({
      modules: [],
      moduleItems: [],
      pages: [],
      assignmentGroups: [],
      assignments: [],
    });
    expect(db.graphFor(USER_A, CONNECTION_A, "course-2")).toMatchObject({
      modules: [expect.objectContaining({ canvasId: "keep-module" })],
      pages: [expect.objectContaining({ canvasId: "keep-page" })],
    });
  });

  it("is idempotent across repeated full synchronizations", async () => {
    const db = createSyncDb({ connectionRows: [connectionRow()] });
    setCanvasFixture([course("course-1")], [courseFixture("course-1")]);
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const first = await syncRoute.POST(createRequest());
    const before = db.graphFor(USER_A, CONNECTION_A, "course-1");
    const second = await syncRoute.POST(createRequest());
    const after = db.graphFor(USER_A, CONNECTION_A, "course-1");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(after?.courseInternalId).toBe(before?.courseInternalId);
    expect(after?.firstSyncedAt).toBe(before?.firstSyncedAt);
    expect(after?.lastSyncedAt).not.toBe(before?.lastSyncedAt);
    expect(after?.modules).toHaveLength(1);
    expect(after?.moduleItems).toHaveLength(1);
    expect(db.duplicateIdentityCount(USER_A, CONNECTION_A, "course-1")).toBe(0);
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly body?: unknown;
  } = {},
): Request {
  const headers = new Headers();
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer stay-focused-token");
  }
  const body =
    options.body === undefined ? undefined : JSON.stringify(options.body);
  if (body) {
    headers.set("content-type", "application/json");
  }
  return new Request("http://localhost/api/canvas/sync", {
    method: "POST",
    headers,
    body,
  });
}

async function expectError(
  response: Response,
  code: string,
): Promise<unknown> {
  const body = await response.json();
  expect(body).toMatchObject({
    ok: false,
    error: { code },
  });
  expect(JSON.stringify(body)).not.toContain("stored-secret-token");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  return body;
}

function setCanvasFixture(
  courses: readonly CanvasCourseFixture[],
  fixtures: readonly CourseFixture[],
): void {
  mocks.canvas.courses = courses;
  mocks.canvas.fixtures = new Map(fixtures.map((fixture) => [fixture.courseId, fixture]));
}

function createSyncDb(options: {
  readonly connectionRows?: readonly Record<string, unknown>[];
  readonly activeRun?: boolean;
  readonly staleRun?: boolean;
  readonly rpcFailure?: boolean;
} = {}) {
  const connections = new Map<string, Record<string, unknown>>();
  for (const row of options.connectionRows ?? [connectionRow()]) {
    connections.set(String(row.user_id), { ...row });
  }

  const graph = new Map<string, StoredGraph>();
  const runs: StoredRun[] = [];
  const courseResults: StoredCourseResult[] = [];
  let idSequence = 0;
  let syncSequence = 0;

  if (options.activeRun || options.staleRun) {
    runs.push({
      id: nextId("run"),
      userId: USER_A,
      connectionId: CONNECTION_A,
      status: "running",
      heartbeatAt: options.staleRun
        ? "2026-07-05T00:00:00.000Z"
        : new Date().toISOString(),
      recovered: false,
    });
  }

  const api = {
    courseResults() {
      return [...courseResults];
    },
    duplicateIdentityCount(userId: string, connectionId: string, courseId: string) {
      const stored = graph.get(graphKey(userId, connectionId, courseId));
      if (!stored) return 0;
      return duplicateCount(stored.modules.map((entry) => entry.canvasId)) +
        duplicateCount(stored.moduleItems.map((entry) => entry.canvasId)) +
        duplicateCount(stored.pages.map((entry) => entry.canvasId)) +
        duplicateCount(stored.assignmentGroups.map((entry) => entry.canvasId)) +
        duplicateCount(stored.assignments.map((entry) => entry.canvasId));
    },
    graphFor(userId: string, connectionId: string, courseId: string) {
      return graph.get(graphKey(userId, connectionId, courseId)) ?? null;
    },
    persistedCourseIds() {
      return [...graph.values()]
        .map((stored) => stored.courseCanvasId)
        .sort((left, right) => left.localeCompare(right));
    },
    recoveredStaleRunCount() {
      return runs.filter((run) => run.recovered).length;
    },
    runningRunCount(connectionId: string) {
      return runs.filter(
        (run) => run.connectionId === connectionId && run.status === "running",
      ).length;
    },
    seedGraph(
      userId: string,
      connectionId: string,
      courseId: string,
      seed: Partial<SeedGraph>,
    ) {
      const now = `seed-${syncSequence}`;
      graph.set(graphKey(userId, connectionId, courseId), {
        assignmentGroups: (seed.assignmentGroups ?? []).map((id) =>
          storedIdentity(id, nextId("group")),
        ),
        assignments: (seed.assignments ?? []).map((id) =>
          storedIdentity(id, nextId("assignment")),
        ),
        courseCanvasId: courseId,
        courseInternalId: nextId("course"),
        firstSyncedAt: now,
        lastSyncedAt: now,
        moduleItems: (seed.moduleItems ?? []).map((id) =>
          storedIdentity(id, nextId("item")),
        ),
        modules: (seed.modules ?? []).map((id) =>
          storedIdentity(id, nextId("module")),
        ),
        pages: (seed.pages ?? []).map((id) => storedIdentity(id, nextId("page"))),
      });
    },
    rpc: vi.fn((name: string, payload: Record<string, unknown>) => ({
      single: vi.fn(async () => {
        if (name === "begin_canvas_sync_run") {
          return beginRun(payload);
        }
        if (name === "replace_canvas_course_academic_snapshot") {
          return replaceSnapshot(payload, options.rpcFailure === true);
        }
        if (name === "record_canvas_sync_course_result") {
          return recordCourseResult(payload);
        }
        return finishOrProgress(name, payload);
      }),
      then: (
        resolve: (value: unknown) => void,
        _reject: (reason: unknown) => void,
      ) => {
        resolve(finishOrProgress(name, payload));
      },
    })),
    from: vi.fn((table: string) => {
      if (table !== "canvas_connections") {
        throw new Error(`Unexpected table ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_column: string, userId: string) => ({
            maybeSingle: vi.fn(async () => ({
              data: connections.get(userId) ?? null,
              error: null,
            })),
          })),
        })),
      };
    }),
  };

  function beginRun(payload: Record<string, unknown>) {
    const userId = String(payload.p_user_id);
    const connectionId = String(payload.p_canvas_connection_id);
    const connection = connections.get(userId);
    if (!connection || connection.id !== connectionId) {
      return { data: null, error: { message: "canvas_connection_missing" } };
    }

    for (const run of runs) {
      if (run.connectionId !== connectionId || run.status !== "running") {
        continue;
      }
      if (options.staleRun === true && !run.recovered) {
        run.status = "failed";
        run.recovered = true;
      } else {
        return { data: null, error: { message: "canvas_sync_in_progress" } };
      }
    }

    const run = {
      id: nextId("run"),
      userId,
      connectionId,
      status: "running",
      heartbeatAt: String(payload.p_started_at),
      recovered: false,
    };
    runs.push(run);
    return { data: runRow(run), error: null };
  }

  function finishOrProgress(name: string, payload: Record<string, unknown>) {
    const runId = String(payload.p_sync_run_id);
    const run = runs.find((entry) => entry.id === runId);
    if (run && name === "finish_canvas_sync_run") {
      run.status = String(payload.p_status);
    }
    if (run && name === "update_canvas_sync_run_progress") {
      run.heartbeatAt = String(payload.p_heartbeat_at);
    }
    return { data: run ? runRow(run) : null, error: run ? null : { message: "run" } };
  }

  function recordCourseResult(payload: Record<string, unknown>) {
    const runId = String(payload.p_sync_run_id);
    const run = runs.find((entry) => entry.id === runId);
    if (!run) {
      return { data: null, error: { message: "run" } };
    }

    const result: StoredCourseResult = {
      courseFingerprint: String(payload.p_course_fingerprint),
      failedOperation:
        typeof payload.p_failed_operation === "string"
          ? payload.p_failed_operation
          : null,
      failureCategory:
        typeof payload.p_failure_category === "string"
          ? payload.p_failure_category
          : null,
      failureCode:
        typeof payload.p_failure_code === "string" ? payload.p_failure_code : null,
      httpStatusClass:
        typeof payload.p_http_status_class === "string"
          ? payload.p_http_status_class
          : null,
      retryCount:
        typeof payload.p_retry_count === "number" ? payload.p_retry_count : 0,
      retryable:
        typeof payload.p_retryable === "boolean" ? payload.p_retryable : null,
      runId,
      status: String(payload.p_status),
    };
    const existingIndex = courseResults.findIndex(
      (entry) =>
        entry.runId === result.runId &&
        entry.courseFingerprint === result.courseFingerprint,
    );
    if (existingIndex >= 0) {
      courseResults[existingIndex] = result;
    } else {
      courseResults.push(result);
    }
    return { data: result, error: null };
  }

  function replaceSnapshot(
    payload: Record<string, unknown>,
    shouldFail: boolean,
  ) {
    if (shouldFail) {
      return { data: null, error: { message: "rpc failed" } };
    }

    const userId = String(payload.p_user_id);
    const connectionId = String(payload.p_canvas_connection_id);
    const coursePayload = asRecord(payload.p_course);
    const courseId = String(coursePayload.canvas_course_id);
    const existing = graph.get(graphKey(userId, connectionId, courseId));
    const now = `sync-${syncSequence += 1}`;

    const nextGraph: StoredGraph = {
      assignmentGroups: readPayloadArray(payload.p_assignment_groups).map((entry) =>
        storedIdentity(
          String(asRecord(entry).canvas_assignment_group_id),
          findId(existing?.assignmentGroups, String(asRecord(entry).canvas_assignment_group_id)) ??
            nextId("group"),
        ),
      ),
      assignments: readPayloadArray(payload.p_assignments).map((entry) =>
        storedIdentity(
          String(asRecord(entry).canvas_assignment_id),
          findId(existing?.assignments, String(asRecord(entry).canvas_assignment_id)) ??
            nextId("assignment"),
        ),
      ),
      courseCanvasId: courseId,
      courseInternalId: existing?.courseInternalId ?? nextId("course"),
      firstSyncedAt: existing?.firstSyncedAt ?? now,
      lastSyncedAt: now,
      moduleItems: readPayloadArray(payload.p_module_items).map((entry) =>
        storedIdentity(
          String(asRecord(entry).canvas_module_item_id),
          findId(existing?.moduleItems, String(asRecord(entry).canvas_module_item_id)) ??
            nextId("item"),
        ),
      ),
      modules: readPayloadArray(payload.p_modules).map((entry) =>
        storedIdentity(
          String(asRecord(entry).canvas_module_id),
          findId(existing?.modules, String(asRecord(entry).canvas_module_id)) ??
            nextId("module"),
        ),
      ),
      pages: readPayloadArray(payload.p_pages).map((entry) =>
        storedIdentity(
          String(asRecord(entry).canvas_page_url),
          findId(existing?.pages, String(asRecord(entry).canvas_page_url)) ??
            nextId("page"),
        ),
      ),
    };

    graph.set(graphKey(userId, connectionId, courseId), nextGraph);
    return {
      data: {
        assignment_groups_deleted: 0,
        assignment_groups_inserted: nextGraph.assignmentGroups.length,
        assignment_groups_updated: 0,
        assignments_deleted: 0,
        assignments_inserted: nextGraph.assignments.length,
        assignments_updated: 0,
        course_inserted: existing ? 0 : 1,
        course_updated: existing ? 1 : 0,
        module_items_deleted: 0,
        module_items_inserted: nextGraph.moduleItems.length,
        module_items_updated: 0,
        modules_deleted: 0,
        modules_inserted: nextGraph.modules.length,
        modules_updated: 0,
        pages_deleted: 0,
        pages_inserted: nextGraph.pages.length,
        pages_updated: 0,
      },
      error: null,
    };
  }

  function nextId(prefix: string): string {
    idSequence += 1;
    return `${prefix}-${idSequence}`;
  }

  return api;
}

function runRow(run: StoredRun) {
  return {
    id: run.id,
    user_id: run.userId,
    canvas_connection_id: run.connectionId,
    sync_mode: "full",
    status: run.status,
    started_at: run.heartbeatAt,
    completed_at: run.status === "running" ? null : run.heartbeatAt,
    heartbeat_at: run.heartbeatAt,
    discovered_course_count: 0,
    successful_course_count: 0,
    failed_course_count: 0,
    resource_counts: {},
    failure_code: null,
    failure_summary: null,
    created_at: run.heartbeatAt,
    updated_at: run.heartbeatAt,
  };
}

function connectionRow(overrides: Record<string, unknown> = {}) {
  const encrypted = encryptCanvasToken("stored-secret-token", ENCRYPTION_KEY);
  return {
    id: CONNECTION_A,
    user_id: USER_A,
    base_url: "https://canvas.test",
    canvas_user_id: "canvas-user-a",
    canvas_user_name: "Fictional User",
    canvas_user_email: "student@example.invalid",
    token_ciphertext: encrypted.ciphertext,
    token_iv: encrypted.iv,
    token_auth_tag: encrypted.authTag,
    encryption_version: encrypted.encryptionVersion,
    status: "active",
    last_verified_at: "2026-07-05T01:00:00.000Z",
    last_error_code: null,
    created_at: "2026-07-05T01:00:00.000Z",
    updated_at: "2026-07-05T01:00:00.000Z",
    ...overrides,
  };
}

function course(id: string): CanvasCourseFixture {
  return {
    id,
    name: `Fictional Course ${id}`,
    courseCode: null,
    workflowState: "available",
    enrollmentTermId: null,
    accountId: null,
    startAt: null,
    endAt: null,
    timeZone: null,
    publicSyllabus: false,
    syllabusBody: null,
    updatedAt: null,
  };
}

function courseFixture(
  courseId: string,
  overrides: Partial<CourseFixture> = {},
): CourseFixture {
  return {
    assignmentGroups: [assignmentGroup("group-1")],
    assignments: [assignment("assignment-1", { assignmentGroupId: "group-1" })],
    courseId,
    moduleItems: new Map([
      ["module-1", [moduleItem("item-1", { type: "Page" })]],
    ]),
    modules: [module("module-1")],
    pageDetails: new Map([["page-1", pageDetail("page-1")]]),
    pages: [pageSummary("page-1")],
    ...overrides,
  };
}

function module(id: string): CanvasModuleFixture {
  return {
    id,
    name: `Fictional Module ${id}`,
    position: 1,
    unlockAt: null,
    itemCount: 1,
    requireSequentialProgress: false,
    published: true,
    prerequisiteModuleIds: [],
    state: "active",
  };
}

function moduleItem(
  id: string,
  overrides: Partial<CanvasModuleItemFixture> = {},
): CanvasModuleItemFixture {
  return {
    id,
    title: `Fictional Item ${id}`,
    position: 1,
    indent: 0,
    type: "Page",
    contentId: null,
    pageUrl: "page-1",
    externalUrl: null,
    htmlUrl: "https://canvas.example.invalid/item",
    newTab: false,
    published: true,
    completionRequirement: { type: "must_view" },
    contentDetails: { points_possible: 0 },
    ...overrides,
  };
}

function pageSummary(id: string): CanvasPageSummaryFixture {
  return {
    pageId: id,
    url: id,
    title: `Fictional Page ${id}`,
    published: true,
    frontPage: false,
    editingRoles: "teachers",
    lockInfo: { locked: false },
    unlockAt: null,
    lockAt: null,
    createdAt: null,
    updatedAt: null,
  };
}

function pageDetail(
  id: string,
  overrides: Partial<CanvasPageDetailFixture> = {},
): CanvasPageDetailFixture {
  return {
    ...pageSummary(id),
    body: "<p>Fictional body.</p>",
    ...overrides,
  };
}

function assignmentGroup(id: string): CanvasAssignmentGroupFixture {
  return {
    id,
    name: `Fictional Group ${id}`,
    position: 1,
    groupWeight: 10,
    rules: { drop_lowest: 0 },
    integrationData: { source: "test" },
  };
}

function assignment(
  id: string,
  overrides: Partial<CanvasAssignmentFixture> = {},
): CanvasAssignmentFixture {
  return {
    id,
    assignmentGroupId: null,
    name: `Fictional Assignment ${id}`,
    description: "<p>Fictional assignment.</p>",
    position: 1,
    pointsPossible: 10,
    gradingType: "points",
    submissionTypes: ["online_upload"],
    dueAt: null,
    unlockAt: null,
    lockAt: null,
    published: true,
    muted: false,
    omitFromFinalGrade: false,
    anonymousGrading: false,
    htmlUrl: "https://canvas.example.invalid/assignment",
    quizId: null,
    discussionTopicId: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

function graphKey(userId: string, connectionId: string, courseId: string): string {
  return `${userId}:${connectionId}:${courseId}`;
}

function storedIdentity(canvasId: string, internalId: string): StoredIdentity {
  return { canvasId, internalId };
}

function findId(
  identities: readonly StoredIdentity[] | undefined,
  canvasId: string,
): string | null {
  return identities?.find((entry) => entry.canvasId === canvasId)?.internalId ?? null;
}

function duplicateCount(values: readonly string[]): number {
  return values.length - new Set(values).size;
}

function readPayloadArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected object.");
  }
  return value as Record<string, unknown>;
}

interface CourseFixture {
  readonly courseId: string;
  readonly modules: readonly CanvasModuleFixture[];
  readonly moduleItems: ReadonlyMap<string, readonly CanvasModuleItemFixture[]>;
  readonly pages: readonly CanvasPageSummaryFixture[];
  readonly pageDetails: ReadonlyMap<string, CanvasPageDetailFixture>;
  readonly assignmentGroups: readonly CanvasAssignmentGroupFixture[];
  readonly assignments: readonly CanvasAssignmentFixture[];
}

interface StoredRun {
  id: string;
  userId: string;
  connectionId: string;
  status: string;
  heartbeatAt: string;
  recovered: boolean;
}

interface StoredCourseResult {
  readonly runId: string;
  readonly courseFingerprint: string;
  readonly status: string;
  readonly failureCode: string | null;
  readonly failedOperation: string | null;
  readonly failureCategory: string | null;
  readonly httpStatusClass: string | null;
  readonly retryable: boolean | null;
  readonly retryCount: number;
}

interface StoredIdentity {
  readonly canvasId: string;
  readonly internalId: string;
}

interface StoredGraph {
  readonly courseCanvasId: string;
  readonly courseInternalId: string;
  readonly firstSyncedAt: string;
  readonly lastSyncedAt: string;
  readonly modules: readonly StoredIdentity[];
  readonly moduleItems: readonly StoredIdentity[];
  readonly pages: readonly StoredIdentity[];
  readonly assignmentGroups: readonly StoredIdentity[];
  readonly assignments: readonly StoredIdentity[];
}

interface SeedGraph {
  readonly modules: readonly string[];
  readonly moduleItems: readonly string[];
  readonly pages: readonly string[];
  readonly assignmentGroups: readonly string[];
  readonly assignments: readonly string[];
}

interface CanvasCourseFixture {
  readonly id: string;
  readonly name: string;
  readonly courseCode: string | null;
  readonly workflowState: string | null;
  readonly enrollmentTermId: string | null;
  readonly accountId: string | null;
  readonly startAt: string | null;
  readonly endAt: string | null;
  readonly timeZone: string | null;
  readonly publicSyllabus: boolean | null;
  readonly syllabusBody: string | null;
  readonly updatedAt: string | null;
}

interface CanvasModuleFixture {
  readonly id: string;
  readonly name: string;
  readonly position: number | null;
  readonly unlockAt: string | null;
  readonly itemCount: number | null;
  readonly requireSequentialProgress: boolean | null;
  readonly published: boolean | null;
  readonly prerequisiteModuleIds: readonly string[];
  readonly state: string | null;
}

interface CanvasModuleItemFixture {
  readonly id: string;
  readonly title: string;
  readonly position: number | null;
  readonly indent: number | null;
  readonly type: string;
  readonly contentId: string | null;
  readonly pageUrl: string | null;
  readonly externalUrl: string | null;
  readonly htmlUrl: string | null;
  readonly newTab: boolean | null;
  readonly published: boolean | null;
  readonly completionRequirement: Readonly<Record<string, string | number | boolean>> | null;
  readonly contentDetails: Readonly<Record<string, string | number | boolean>> | null;
}

interface CanvasPageSummaryFixture {
  readonly pageId: string | null;
  readonly url: string;
  readonly title: string;
  readonly published: boolean | null;
  readonly frontPage: boolean | null;
  readonly editingRoles: string | null;
  readonly lockInfo: Readonly<Record<string, string | number | boolean>> | null;
  readonly unlockAt: string | null;
  readonly lockAt: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

interface CanvasPageDetailFixture extends CanvasPageSummaryFixture {
  readonly body: string | null;
}

interface CanvasAssignmentGroupFixture {
  readonly id: string;
  readonly name: string;
  readonly position: number | null;
  readonly groupWeight: number | null;
  readonly rules: Readonly<Record<string, string | number | boolean>> | null;
  readonly integrationData: Readonly<Record<string, string | number | boolean>> | null;
}

interface CanvasAssignmentFixture {
  readonly id: string;
  readonly assignmentGroupId: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly position: number | null;
  readonly pointsPossible: number | null;
  readonly gradingType: string | null;
  readonly submissionTypes: readonly string[];
  readonly dueAt: string | null;
  readonly unlockAt: string | null;
  readonly lockAt: string | null;
  readonly published: boolean | null;
  readonly muted: boolean | null;
  readonly omitFromFinalGrade: boolean | null;
  readonly anonymousGrading: boolean | null;
  readonly htmlUrl: string | null;
  readonly quizId: string | null;
  readonly discussionTopicId: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}
