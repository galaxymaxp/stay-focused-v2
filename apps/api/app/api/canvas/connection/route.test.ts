import { randomBytes } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { encryptCanvasToken } from "@/lib/canvas-token-encryption";

const mocks = vi.hoisted(() => ({
  constructorCalls: [] as Array<{
    readonly baseUrl: string;
    readonly personalAccessToken: string;
  }>,
  courses: [
    {
      id: "course-1",
      name: "Biology 101",
      courseCode: "BIO101",
      workflowState: "available",
      enrollmentTermId: null,
      startAt: null,
      endAt: null,
    },
  ],
  createCanvasServiceClient: vi.fn(),
  getCurrentUserError: null as unknown,
  listCoursesError: null as unknown,
  profile: {
    id: "canvas-user-1",
    name: "Ada Student",
    email: "ada@test.edu",
    sortableName: null,
    shortName: null,
  },
  probeCapabilities: [
    {
      capability: "profile",
      status: "available",
      testedAt: "2026-07-05T01:00:00.000Z",
      safeErrorCode: null,
      courseId: null,
      integrationVersion: "phase5a",
    },
    {
      capability: "modules",
      status: "permission_denied",
      testedAt: "2026-07-05T01:00:00.000Z",
      safeErrorCode: "canvas_forbidden",
      courseId: "course-1",
      integrationVersion: "phase5a",
    },
    {
      capability: "files",
      status: "not_tested",
      testedAt: null,
      safeErrorCode: null,
      courseId: null,
      integrationVersion: "phase5a",
    },
  ],
  verifyBearerToken: vi.fn(),
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

    public constructor(code: string, message: string, status: number | null = null) {
      super(message);
      this.name = "CanvasClientError";
      this.code = code;
      this.status = status;
    }
  }

  class CanvasClient {
    public constructor(options: {
      readonly baseUrl: string;
      readonly personalAccessToken: string;
    }) {
      mocks.constructorCalls.push(options);
    }

    public async getCurrentUser(): Promise<unknown> {
      if (mocks.getCurrentUserError) {
        throw mocks.getCurrentUserError;
      }
      return mocks.profile;
    }

    public async listCourses(): Promise<unknown> {
      if (mocks.listCoursesError) {
        throw mocks.listCoursesError;
      }
      return mocks.courses;
    }

    public async probeCapabilities(): Promise<unknown> {
      return mocks.probeCapabilities;
    }
  }

  return {
    CanvasClient,
    CanvasClientError,
    normalizeCanvasBaseUrl: (value: string) => {
      if (!value.startsWith("https://")) {
        throw new CanvasClientError("invalid_base_url", "invalid");
      }
      return value.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
    },
  };
});

const connectionRoute = await import("./route");
const coursesRoute = await import("../courses/route");
const capabilitiesRoute = await import("../capabilities/route");

const ENCRYPTION_KEY = randomBytes(32).toString("base64");

describe("/api/canvas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.constructorCalls.length = 0;
    mocks.getCurrentUserError = null;
    mocks.listCoursesError = null;
    process.env.CANVAS_TOKEN_ENCRYPTION_KEY = ENCRYPTION_KEY;
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
  });

  it("requires JWT auth before reading Canvas connection state", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);
    const db = createDbClient();
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.GET(createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.createCanvasServiceClient).not.toHaveBeenCalled();
  });

  it("returns safe connection metadata without encrypted token fields", async () => {
    const db = createDbClient({ connectionRow: connectionRow() });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      connection: {
        id: "connection-1",
        canvasUserName: "Ada Student",
      },
    });
    expect(JSON.stringify(body)).not.toContain("token_ciphertext");
    expect(JSON.stringify(body)).not.toContain("secret-token");
  });

  it("rejects invalid Canvas URLs before saving credentials", async () => {
    const db = createDbClient();
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(
      createRequest({
        body: {
          baseUrl: "http://canvas.test",
          personalAccessToken: "secret-token",
        },
      }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_canvas_url");
    expect(db.upsertPayload).toBeUndefined();
  });

  it("keeps an existing connection when replacement token validation fails", async () => {
    const db = createDbClient({ connectionRow: connectionRow() });
    mocks.createCanvasServiceClient.mockReturnValue(db);
    mocks.getCurrentUserError = {
      code: "canvas_unauthorized",
      message: "upstream said secret-token",
    };

    const response = await connectionRoute.PUT(
      createRequest({
        body: {
          baseUrl: "https://canvas.test",
          personalAccessToken: "secret-token",
        },
      }),
    );

    const body = await expectError(response, "invalid_canvas_token");
    expect(response.status).toBe(401);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(db.upsertPayload).toBeUndefined();
    expect(db.deletedConnectionUserId).toBeUndefined();
  });

  it("validates, encrypts, stores, and returns safe Canvas connection data", async () => {
    const db = createDbClient({ upsertRow: connectionRow() });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(
      createRequest({
        body: {
          baseUrl: "https://canvas.test/api/v1",
          personalAccessToken: "secret-token",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      connection: {
        baseUrl: "https://canvas.test",
        canvasUserName: "Ada Student",
      },
      courses: [{ id: "course-1", name: "Biology 101" }],
      capabilities: [
        { capability: "profile", status: "available" },
        { capability: "modules", status: "permission_denied" },
        { capability: "files", status: "not_tested" },
      ],
    });
    expect(db.upsertPayload).toMatchObject({
      user_id: "user-1",
      base_url: "https://canvas.test",
      canvas_user_id: "canvas-user-1",
      token_iv: expect.any(String),
      token_auth_tag: expect.any(String),
      encryption_version: "aes-256-gcm:v1",
    });
    expect(JSON.stringify(db.upsertPayload)).not.toContain("secret-token");
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(db.deletedCapabilitiesConnectionId).toBe("connection-1");
    expect(db.insertedCapabilities).toHaveLength(3);
    expect(db.insertedCapabilities?.[1]).toMatchObject({
      user_id: "user-1",
      canvas_connection_id: "connection-1",
      capability: "modules",
      status: "permission_denied",
      safe_error_code: "canvas_forbidden",
    });
  });

  it("disconnects only the authenticated user's Canvas connection", async () => {
    const db = createDbClient();
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.DELETE(createRequest());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(db.deletedConnectionUserId).toBe("user-1");
  });

  it("lists courses through decrypted server-side credentials", async () => {
    const encrypted = encryptCanvasToken("stored-secret-token", ENCRYPTION_KEY);
    const db = createDbClient({
      connectionRow: {
        ...connectionRow(),
        token_ciphertext: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_auth_tag: encrypted.authTag,
        encryption_version: encrypted.encryptionVersion,
      },
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await coursesRoute.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      courses: [{ id: "course-1", name: "Biology 101" }],
    });
    expect(mocks.constructorCalls.at(-1)).toMatchObject({
      baseUrl: "https://canvas.test",
      personalAccessToken: "stored-secret-token",
    });
    expect(JSON.stringify(body)).not.toContain("stored-secret-token");
  });

  it("fails closed when stored Canvas credentials are corrupted", async () => {
    const encrypted = encryptCanvasToken("stored-secret-token", ENCRYPTION_KEY);
    const db = createDbClient({
      connectionRow: {
        ...connectionRow(),
        token_ciphertext: encrypted.ciphertext,
        token_iv: encrypted.iv,
        token_auth_tag: "AAAA",
        encryption_version: encrypted.encryptionVersion,
      },
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await coursesRoute.GET(createRequest());

    expect(response.status).toBe(500);
    await expectError(response, "canvas_connection_corrupt");
    expect(mocks.constructorCalls).toHaveLength(0);
  });

  it("returns missing connection safely for courses", async () => {
    const db = createDbClient({ connectionRow: null });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await coursesRoute.GET(createRequest());

    expect(response.status).toBe(404);
    await expectError(response, "canvas_connection_missing");
  });

  it("lists capability statuses for the authenticated user", async () => {
    const db = createDbClient({
      capabilityRows: [
        {
          id: "capability-1",
          capability: "courses",
          status: "available",
          tested_at: "2026-07-05T01:00:00.000Z",
          safe_error_code: null,
          course_id: null,
          integration_version: "phase5a",
        },
      ],
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await capabilitiesRoute.GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      capabilities: [
        {
          capability: "courses",
          status: "available",
          testedAt: "2026-07-05T01:00:00.000Z",
        },
      ],
    });
    expect(db.capabilityUserId).toBe("user-1");
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly body?: unknown;
  } = {},
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer stay-focused-token");
  }

  return new Request("http://localhost/api/canvas/connection", {
    method: "PUT",
    headers,
    body: JSON.stringify(
      options.body ?? {
        baseUrl: "https://canvas.test",
        personalAccessToken: "secret-token",
      },
    ),
  });
}

function createDbClient(options: {
  readonly connectionRow?: unknown;
  readonly upsertRow?: unknown;
  readonly capabilityRows?: readonly unknown[];
} = {}) {
  const state: {
    capabilityUserId?: string;
    deletedCapabilitiesConnectionId?: string;
    deletedConnectionUserId?: string;
    insertedCapabilities?: readonly unknown[];
    upsertPayload?: unknown;
  } = {};

  return {
    get capabilityUserId() {
      return state.capabilityUserId;
    },
    get deletedCapabilitiesConnectionId() {
      return state.deletedCapabilitiesConnectionId;
    },
    get deletedConnectionUserId() {
      return state.deletedConnectionUserId;
    },
    get insertedCapabilities() {
      return state.insertedCapabilities;
    },
    get upsertPayload() {
      return state.upsertPayload;
    },
    from: vi.fn((table: string) => {
      if (table === "canvas_connections") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(async (_column: string, value: string) => {
              state.deletedConnectionUserId = value;
              return { error: null };
            }),
          })),
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              maybeSingle: vi.fn(async () => ({
                data:
                  options.connectionRow === undefined
                    ? connectionRow({ user_id: value })
                    : options.connectionRow,
                error: null,
              })),
            })),
          })),
          upsert: vi.fn((payload: unknown) => {
            state.upsertPayload = payload;
            return {
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: options.upsertRow ?? connectionRow(),
                  error: null,
                })),
              })),
            };
          }),
        };
      }

      return {
        delete: vi.fn(() => ({
          eq: vi.fn(async (_column: string, value: string) => {
            state.deletedCapabilitiesConnectionId = value;
            return { error: null };
          }),
        })),
        insert: vi.fn(async (payload: readonly unknown[]) => {
          state.insertedCapabilities = payload;
          return { error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn((_column: string, value: string) => {
            state.capabilityUserId = value;
            const ordered = {
              order: vi.fn(() => ordered),
              then: undefined,
            };
            return {
              order: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: options.capabilityRows ?? [],
                  error: null,
                })),
              })),
            };
          }),
        })),
      };
    }),
  };
}

function connectionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "connection-1",
    user_id: "user-1",
    base_url: "https://canvas.test",
    canvas_user_id: "canvas-user-1",
    canvas_user_name: "Ada Student",
    canvas_user_email: "ada@test.edu",
    token_ciphertext: "ciphertext",
    token_iv: "iv",
    token_auth_tag: "tag",
    encryption_version: "aes-256-gcm:v1",
    status: "active",
    last_verified_at: "2026-07-05T01:00:00.000Z",
    last_error_code: null,
    created_at: "2026-07-05T01:00:00.000Z",
    updated_at: "2026-07-05T01:00:00.000Z",
    ...overrides,
  };
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
  expect(JSON.stringify(body)).not.toContain("Error:");
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
  expect(body).not.toHaveProperty("stack");
  return body;
}
