import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCanvasServiceClient: vi.fn(),
  readReviewerSourceStatus: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));

vi.mock("@/lib/reviewer-source-status", () => ({
  readReviewerSourceStatus: mocks.readReviewerSourceStatus,
}));

const route = await import("./route");

const REVIEWER_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "user-1";

describe("GET /api/reviewers/[id]/source-status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: USER_ID });
    mocks.createCanvasServiceClient.mockReturnValue({ from: vi.fn() });
    mocks.readReviewerSourceStatus.mockResolvedValue({
      ok: true,
      value: sourceStatus(),
    });
  });

  it("requires bearer authentication before storage access", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await route.GET(createRequest(), createContext(REVIEWER_ID));

    expect(response.status).toBe(401);
    expect(mocks.createCanvasServiceClient).not.toHaveBeenCalled();
    expect(mocks.readReviewerSourceStatus).not.toHaveBeenCalled();
  });

  it("returns owned reviewer source status safely", async () => {
    const response = await route.GET(createRequest(), createContext(REVIEWER_ID));
    const text = await response.text();
    const body = JSON.parse(text) as unknown;

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      overallStatus: "changed",
      regenerationReadiness: "ready_with_changes",
      counts: {
        changed: 1,
        current: 1,
        total: 2,
      },
      actions: ["sync_canvas_course"],
    });
    expect(mocks.readReviewerSourceStatus).toHaveBeenCalledWith({
      client: mocks.createCanvasServiceClient.mock.results[0].value,
      reviewerId: REVIEWER_ID,
      userId: USER_ID,
    });
    expect(text).not.toContain("source_snapshot_id");
    expect(text).not.toContain("sha256");
    expect(text).not.toContain("Readable source text");
  });

  it("returns a safe no-snapshot status payload", async () => {
    mocks.readReviewerSourceStatus.mockResolvedValue({
      ok: true,
      value: {
        ...sourceStatus(),
        overallStatus: "unknown",
        regenerationReadiness: "unknown",
        counts: {
          total: 0,
          current: 0,
          changed: 0,
          unavailable: 0,
          unsupported: 0,
          missingAfterSync: 0,
          unknown: 0,
        },
        actions: [],
        items: [],
      },
    });

    const response = await route.GET(createRequest(), createContext(REVIEWER_ID));

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      overallStatus: "unknown",
      counts: { total: 0 },
      items: [],
    });
  });

  it("denies invalid and unknown reviewers without private detail", async () => {
    const invalid = await route.GET(createRequest(), createContext("not-a-uuid"));
    expect(invalid.status).toBe(404);
    expect(mocks.readReviewerSourceStatus).not.toHaveBeenCalled();

    mocks.readReviewerSourceStatus.mockResolvedValue({
      ok: false,
      status: 404,
      code: "reviewer_not_found",
      message: "Saved reviewer was not found.",
    });
    const unknown = await route.GET(createRequest(), createContext(REVIEWER_ID));
    expect(unknown.status).toBe(404);
    await expect(unknown.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "reviewer_not_found" },
    });
  });

  it("maps source-status storage failures", async () => {
    mocks.readReviewerSourceStatus.mockResolvedValue({
      ok: false,
      status: 500,
      code: "source_snapshot_storage_failed",
      message: "Canvas source status could not be checked.",
    });

    const response = await route.GET(createRequest(), createContext(REVIEWER_ID));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      error: { code: "source_snapshot_storage_failed" },
    });
  });

  it("allows CORS preflight for source status", () => {
    const response = route.OPTIONS(
      new Request(`http://localhost/api/reviewers/${REVIEWER_ID}/source-status`, {
        headers: { origin: "http://localhost:19006" },
        method: "OPTIONS",
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, OPTIONS",
    );
  });
});

function createRequest(): Request {
  return new Request(
    `http://localhost/api/reviewers/${REVIEWER_ID}/source-status`,
    {
      headers: { authorization: "Bearer token" },
      method: "GET",
    },
  );
}

function createContext(id: string): {
  readonly params: Promise<{ readonly id: string }>;
} {
  return { params: Promise.resolve({ id }) };
}

function sourceStatus() {
  return {
    checkedAt: "2026-07-07T00:00:00.000Z",
    overallStatus: "changed",
    regenerationReadiness: "ready_with_changes",
    counts: {
      total: 2,
      current: 1,
      changed: 1,
      unavailable: 0,
      unsupported: 0,
      missingAfterSync: 0,
      unknown: 0,
    },
    actions: ["sync_canvas_course"],
    items: [
      {
        ordinal: 1,
        sourceType: "page",
        title: "Fictional Page",
        status: "current",
        message: "This source still matches the saved snapshot.",
      },
      {
        ordinal: 2,
        sourceType: "assignment",
        title: "Fictional Assignment",
        status: "changed",
        action: "sync_canvas_course",
        message: "This source has changed since the reviewer was saved.",
      },
    ],
  };
}
