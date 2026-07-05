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
      let parsed: URL;
      try {
        parsed = new URL(value.trim());
      } catch {
        throw new CanvasClientError("invalid_base_url", "invalid");
      }
      if (parsed.protocol !== "https:") {
        throw new CanvasClientError("invalid_base_url", "invalid");
      }
      if (parsed.username || parsed.password || parsed.search || parsed.hash) {
        throw new CanvasClientError("invalid_base_url", "invalid");
      }
      parsed.pathname = parsed.pathname
        .replace(/\/api\/v1\/?$/, "")
        .replace(/\/+$/, "");
      return parsed.toString().replace(/\/$/, "");
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
    expect(db.rpcPayload).toBeUndefined();
  });

  it.each([
    ["malformed JSON", { rawBody: "{nope" }, 400, "invalid_json"],
    ["empty JSON body", { rawBody: "" }, 400, "invalid_json"],
    ["non-object JSON", { body: [] }, 400, "invalid_request"],
    [
      "missing base URL",
      { body: { personalAccessToken: "secret-token" } },
      400,
      "invalid_request",
    ],
    [
      "missing PAT",
      { body: { baseUrl: "https://canvas.test" } },
      400,
      "invalid_request",
    ],
    [
      "blank PAT",
      {
        body: {
          baseUrl: "https://canvas.test",
          personalAccessToken: "   ",
        },
      },
      400,
      "invalid_request",
    ],
    [
      "unexpected field types",
      { body: { baseUrl: 42, personalAccessToken: true } },
      400,
      "invalid_request",
    ],
    [
      "URL exceeding maximum length",
      {
        body: {
          baseUrl: `https://canvas.test/${"a".repeat(2049)}`,
          personalAccessToken: "secret-token",
        },
      },
      400,
      "invalid_request",
    ],
    [
      "PAT exceeding maximum length",
      {
        body: {
          baseUrl: "https://canvas.test",
          personalAccessToken: "x".repeat(4097),
        },
      },
      400,
      "invalid_request",
    ],
    [
      "request body exceeding maximum size",
      {
        rawBody: JSON.stringify({
          baseUrl: "https://canvas.test",
          personalAccessToken: "x".repeat(20_000),
        }),
      },
      413,
      "payload_too_large",
    ],
    [
      "incorrect content type",
      {
        body: {
          baseUrl: "https://canvas.test",
          personalAccessToken: "secret-token",
        },
        contentType: "text/plain",
      },
      400,
      "invalid_request",
    ],
    [
      "unknown extra fields",
      {
        body: {
          baseUrl: "https://canvas.test",
          personalAccessToken: "secret-token",
          extra: "nope",
        },
      },
      400,
      "invalid_request",
    ],
  ] as const)("rejects %s safely", async (_name, requestOptions, status, code) => {
    const db = createDbClient();
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(createRequest(requestOptions));
    const body = await expectError(response, code);

    expect(response.status).toBe(status);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(db.rpcPayload).toBeUndefined();
  });

  it.each([
    ["malformed Canvas URL", "not a url"],
    ["embedded URL credentials", "https://token:secret@canvas.test"],
    ["URL query strings", "https://canvas.test?token=secret-token"],
    ["URL fragments", "https://canvas.test#secret-token"],
    ["non-HTTPS URL", "http://canvas.test"],
  ])("rejects %s before saving credentials", async (_name, baseUrl) => {
    const db = createDbClient();
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(
      createRequest({
        body: {
          baseUrl,
          personalAccessToken: "secret-token",
        },
      }),
    );
    const body = await expectError(response, "invalid_canvas_url");

    expect(response.status).toBe(400);
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(db.rpcPayload).toBeUndefined();
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
    expect(db.rpcPayload).toBeUndefined();
    expect(db.deletedConnectionUserId).toBeUndefined();
  });

  it("validates, encrypts, stores, and returns safe Canvas connection data", async () => {
    const db = createDbClient({ connectionRow: null });
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
    expect(db.rpcPayload).toMatchObject({
      p_user_id: "user-1",
      p_base_url: "https://canvas.test",
      p_canvas_user_id: "canvas-user-1",
      p_token_iv: expect.any(String),
      p_token_auth_tag: expect.any(String),
      p_encryption_version: "aes-256-gcm:v1",
    });
    expect(JSON.stringify(db.rpcPayload)).not.toContain("secret-token");
    expect(JSON.stringify(body)).not.toContain("secret-token");
    expect(db.connectionFor("user-1")).toMatchObject({
      id: "connection-1",
      base_url: "https://canvas.test",
    });
    expect(db.capabilitiesFor("user-1")).toHaveLength(3);
    expect(db.capabilitiesFor("user-1")[1]).toMatchObject({
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

  it.each([
    "capability_delete",
    "capability_insert",
    "partial_capability_insert",
  ] as const)(
    "rolls back connection replacement when %s fails inside the atomic RPC",
    async (rpcFailure) => {
      const oldConnection = connectionRow({
        base_url: "https://old.canvas.test",
        canvas_user_name: "Existing Student",
      });
      const oldCapability = capabilityRow({
        capability: "courses",
        status: "available",
      });
      const db = createDbClient({
        capabilityRows: [oldCapability],
        connectionRow: oldConnection,
        rpcFailure,
      });
      mocks.createCanvasServiceClient.mockReturnValue(db);

      const response = await connectionRoute.PUT(
        createRequest({
          body: {
            baseUrl: "https://new.canvas.test",
            personalAccessToken: "secret-token",
          },
        }),
      );

      await expectError(response, "canvas_storage_failed");
      expect(response.status).toBe(500);
      expect(db.connectionFor("user-1")).toMatchObject({
        base_url: "https://old.canvas.test",
        canvas_user_name: "Existing Student",
      });
      expect(db.capabilitiesFor("user-1")).toEqual([oldCapability]);
    },
  );

  it("keeps a new user disconnected when the atomic RPC fails", async () => {
    const db = createDbClient({
      connectionRow: null,
      rpcFailure: "capability_insert",
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(createRequest());

    await expectError(response, "canvas_storage_failed");
    expect(response.status).toBe(500);
    expect(db.connectionFor("user-1")).toBeNull();
    expect(db.capabilitiesFor("user-1")).toEqual([]);
  });

  it("updates the connection and complete capabilities snapshot together", async () => {
    const db = createDbClient({
      capabilityRows: [
        capabilityRow({ capability: "old_capability", status: "available" }),
      ],
      connectionRow: connectionRow({ base_url: "https://old.canvas.test" }),
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    const response = await connectionRoute.PUT(createRequest());

    expect(response.status).toBe(200);
    expect(db.connectionFor("user-1")).toMatchObject({
      base_url: "https://canvas.test",
    });
    expect(db.capabilitiesFor("user-1")).toHaveLength(3);
    expect(db.capabilitiesFor("user-1").map((row) => row.capability)).toEqual([
      "profile",
      "modules",
      "files",
    ]);
    expect(db.hasCapabilityOwnershipMismatch()).toBe(false);
  });

  it("proves User A and User B are isolated across connection routes", async () => {
    const userA = "00000000-0000-0000-0000-00000000000a";
    const userB = "00000000-0000-0000-0000-00000000000b";
    const encryptedA = encryptCanvasToken("stored-token-a", ENCRYPTION_KEY);
    const userAConnection = connectionRow({
      id: "connection-a",
      user_id: userA,
      canvas_user_name: "User A",
      token_ciphertext: encryptedA.ciphertext,
      token_iv: encryptedA.iv,
      token_auth_tag: encryptedA.authTag,
      encryption_version: encryptedA.encryptionVersion,
    });
    const userACapability = capabilityRow({
      id: "capability-a",
      user_id: userA,
      canvas_connection_id: "connection-a",
      capability: "courses",
      status: "available",
    });
    const db = createDbClient({
      capabilityRows: [userACapability],
      connectionRows: [userAConnection],
    });
    mocks.createCanvasServiceClient.mockReturnValue(db);

    mocks.verifyBearerToken.mockResolvedValue({ id: userA });
    const userARead = await connectionRoute.GET(createRequest());
    expect(userARead.status).toBe(200);
    await expect(userARead.json()).resolves.toMatchObject({
      ok: true,
      connection: { id: "connection-a", canvasUserName: "User A" },
    });

    mocks.verifyBearerToken.mockResolvedValue({ id: userB });
    const userBRead = await connectionRoute.GET(createRequest());
    expect(userBRead.status).toBe(200);
    await expect(userBRead.json()).resolves.toEqual({
      ok: true,
      connection: null,
    });

    const userBCourses = await coursesRoute.GET(createRequest());
    await expectError(userBCourses, "canvas_connection_missing");
    expect(userBCourses.status).toBe(404);
    expect(mocks.constructorCalls).toHaveLength(0);

    const userBCapabilities = await capabilitiesRoute.GET(createRequest());
    expect(userBCapabilities.status).toBe(200);
    await expect(userBCapabilities.json()).resolves.toEqual({
      ok: true,
      capabilities: [],
    });

    const userBDelete = await connectionRoute.DELETE(createRequest());
    expect(userBDelete.status).toBe(200);
    expect(db.connectionFor(userA)).toEqual(userAConnection);
    expect(db.capabilitiesFor(userA)).toEqual([userACapability]);

    const userBReplace = await connectionRoute.PUT(
      createRequest({
        body: {
          baseUrl: "https://canvas-b.test",
          personalAccessToken: "secret-token-b",
        },
      }),
    );
    expect(userBReplace.status).toBe(200);
    expect(db.connectionFor(userA)).toEqual(userAConnection);
    expect(db.capabilitiesFor(userA)).toEqual([userACapability]);
    expect(db.connectionFor(userB)).toMatchObject({
      user_id: userB,
      base_url: "https://canvas-b.test",
    });
    expect(db.hasCapabilityOwnershipMismatch()).toBe(false);
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly contentLength?: string;
    readonly contentType?: string | null;
    readonly body?: unknown;
    readonly rawBody?: string;
  } = {},
): Request {
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set("content-type", options.contentType ?? "application/json");
  }
  if (options.contentLength) {
    headers.set("content-length", options.contentLength);
  }
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer stay-focused-token");
  }

  return new Request("http://localhost/api/canvas/connection", {
    method: "PUT",
    headers,
    body:
      options.rawBody ??
      JSON.stringify(
        options.body ?? {
          baseUrl: "https://canvas.test",
          personalAccessToken: "secret-token",
        },
      ),
  });
}

function createDbClient(options: {
  readonly connectionRow?: unknown;
  readonly connectionRows?: readonly unknown[];
  readonly capabilityRows?: readonly unknown[];
  readonly rpcFailure?:
    | "capability_delete"
    | "capability_insert"
    | "partial_capability_insert";
} = {}) {
  const state: {
    capabilityUserId?: string;
    deletedConnectionUserId?: string;
    rpcPayload?: Record<string, unknown>;
  } = {};
  const connections = new Map<string, Record<string, unknown>>();
  const capabilities: Array<Record<string, unknown>> = [];

  if (options.connectionRows) {
    for (const row of options.connectionRows) {
      const record = row as Record<string, unknown>;
      connections.set(String(record.user_id), { ...record });
    }
  } else if (options.connectionRow !== undefined && options.connectionRow !== null) {
    const record = options.connectionRow as Record<string, unknown>;
    connections.set(String(record.user_id ?? "user-1"), { ...record });
  } else if (options.connectionRow === undefined) {
    const row = connectionRow();
    connections.set(String(row.user_id), row);
  }

  for (const row of options.capabilityRows ?? []) {
    const record = row as Record<string, unknown>;
    capabilities.push({
      user_id: record.user_id ?? "user-1",
      canvas_connection_id: record.canvas_connection_id ?? "connection-1",
      ...record,
    });
  }

  return {
    get capabilityUserId() {
      return state.capabilityUserId;
    },
    get deletedConnectionUserId() {
      return state.deletedConnectionUserId;
    },
    get rpcPayload() {
      return state.rpcPayload;
    },
    capabilitiesFor(userId: string) {
      return capabilities.filter((row) => row.user_id === userId);
    },
    connectionFor(userId: string) {
      return connections.get(userId) ?? null;
    },
    hasCapabilityOwnershipMismatch() {
      return capabilities.some((row) => {
        const owner = [...connections.values()].find(
          (connection) => connection.id === row.canvas_connection_id,
        );
        return owner ? owner.user_id !== row.user_id : false;
      });
    },
    rpc: vi.fn((name: string, payload: Record<string, unknown>) => {
      state.rpcPayload = payload;
      return {
        single: vi.fn(async () => {
          if (name !== "replace_canvas_connection_with_capabilities") {
            return { data: null, error: { message: "unknown rpc" } };
          }
          if (options.rpcFailure) {
            return { data: null, error: { message: options.rpcFailure } };
          }

          const userId = String(payload.p_user_id);
          const previous = connections.get(userId);
          const id = String(previous?.id ?? nextConnectionId(userId));
          const savedConnection = connectionRow({
            id,
            user_id: userId,
            base_url: payload.p_base_url,
            canvas_user_id: payload.p_canvas_user_id,
            canvas_user_name: payload.p_canvas_user_name,
            canvas_user_email: payload.p_canvas_user_email,
            token_ciphertext: payload.p_token_ciphertext,
            token_iv: payload.p_token_iv,
            token_auth_tag: payload.p_token_auth_tag,
            encryption_version: payload.p_encryption_version,
            last_verified_at: payload.p_last_verified_at,
            created_at:
              typeof previous?.created_at === "string"
                ? previous.created_at
                : "2026-07-05T01:00:00.000Z",
            updated_at: payload.p_last_verified_at,
          });
          const nextCapabilities = (payload.p_capabilities as Array<
            Record<string, unknown>
          >).map((capability, index) => ({
            id: `capability-${userId}-${index + 1}`,
            user_id: userId,
            canvas_connection_id: id,
            capability: capability.capability,
            status: capability.status,
            tested_at: capability.tested_at,
            safe_error_code: capability.safe_error_code,
            course_id: capability.course_id,
            integration_version: capability.integration_version,
            created_at: String(payload.p_last_verified_at),
            updated_at: String(payload.p_last_verified_at),
          }));

          connections.set(userId, savedConnection);
          for (let index = capabilities.length - 1; index >= 0; index -= 1) {
            if (
              capabilities[index]?.user_id === userId &&
              capabilities[index]?.canvas_connection_id === id
            ) {
              capabilities.splice(index, 1);
            }
          }
          capabilities.push(...nextCapabilities);

          return { data: savedConnection, error: null };
        }),
      };
    }),
    from: vi.fn((table: string) => {
      if (table === "canvas_connections") {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(async (_column: string, value: string) => {
              state.deletedConnectionUserId = value;
              const removed = connections.get(value);
              connections.delete(value);
              if (removed) {
                for (let index = capabilities.length - 1; index >= 0; index -= 1) {
                  if (capabilities[index]?.canvas_connection_id === removed.id) {
                    capabilities.splice(index, 1);
                  }
                }
              }
              return { error: null };
            }),
          })),
          select: vi.fn(() => ({
            eq: vi.fn((_column: string, value: string) => ({
              maybeSingle: vi.fn(async () => ({
                data: connections.get(value) ?? null,
                error: null,
              })),
            })),
          })),
        };
      }

      return {
        delete: vi.fn(() => ({
          eq: vi.fn(async (_column: string, value: string) => {
            for (let index = capabilities.length - 1; index >= 0; index -= 1) {
              if (capabilities[index]?.canvas_connection_id === value) {
                capabilities.splice(index, 1);
              }
            }
            return { error: null };
          }),
        })),
        insert: vi.fn(async (payload: readonly Record<string, unknown>[]) => {
          capabilities.push(...payload);
          return { error: null };
        }),
        select: vi.fn(() => ({
          eq: vi.fn((_column: string, value: string) => {
            state.capabilityUserId = value;
            return {
              order: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: capabilities.filter((row) => row.user_id === value),
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

function nextConnectionId(userId: string): string {
  return userId === "user-1" ? "connection-1" : `connection-${userId}`;
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

function capabilityRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "capability-1",
    user_id: "user-1",
    canvas_connection_id: "connection-1",
    capability: "courses",
    status: "available",
    tested_at: "2026-07-05T01:00:00.000Z",
    safe_error_code: null,
    course_id: null,
    integration_version: "phase5a",
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
