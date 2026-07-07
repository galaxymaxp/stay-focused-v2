import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createCanvasServiceClient: vi.fn(),
  createReviewerUserClient: vi.fn(),
  readSafeReviewerSourceProvenanceSummary: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/reviewer-db", () => ({
  createReviewerUserClient: mocks.createReviewerUserClient,
}));

vi.mock("@/lib/canvas-db", () => ({
  createCanvasServiceClient: mocks.createCanvasServiceClient,
}));

vi.mock("@/lib/reviewer-source-provenance", () => ({
  readSafeReviewerSourceProvenanceSummary:
    mocks.readSafeReviewerSourceProvenanceSummary,
}));

const { DELETE, GET, PATCH } = await import("./route");

const REVIEWER_ID = "11111111-1111-4111-8111-111111111111";

describe("/api/reviewers/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    mocks.createCanvasServiceClient.mockReturnValue({ from: vi.fn() });
    mocks.readSafeReviewerSourceProvenanceSummary.mockResolvedValue({
      ok: true,
      value: sourceProvenanceSummary(),
    });
  });

  it.each([
    ["read", GET],
    ["rename", PATCH],
    ["delete", DELETE],
  ])("rejects %s without valid auth", async (_label, handler) => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await handler(
      createRequest({ auth: null }),
      routeContext(REVIEWER_ID),
    );

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.createReviewerUserClient).not.toHaveBeenCalled();
  });

  it("returns a full owned reviewer", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createReadClient({ row: reviewerRow() }),
    );

    const response = await GET(createRequest(), routeContext(REVIEWER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reviewer: {
        id: REVIEWER_ID,
        title: "Study Habits",
        reviewerOutput: { id: "reviewer-output-1" },
      },
    });
  });

  it("returns a safe provenance summary for Canvas reviewers", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createReadClient({ row: reviewerRow({ sourceMode: "canvas" }) }),
    );

    const response = await GET(createRequest(), routeContext(REVIEWER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.readSafeReviewerSourceProvenanceSummary).toHaveBeenCalledWith({
      client: expect.anything(),
      sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
      userId: "user-1",
    });
    expect(body.reviewer.sourceProvenance).toMatchObject({
      sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
      sourceCount: 2,
      wasEdited: true,
    });
    expect(JSON.stringify(body)).not.toContain("exact_source_text");
    expect(JSON.stringify(body)).not.toContain("original_preview_sha256");
    expect(JSON.stringify(body)).not.toContain("normalized_content_sha256");
  });

  it("returns the same safe 404 for missing or inaccessible reviewers", async () => {
    for (const row of [null, undefined]) {
      mocks.createReviewerUserClient.mockReturnValue(createReadClient({ row }));

      const response = await GET(createRequest(), routeContext(REVIEWER_ID));

      expect(response.status).toBe(404);
      await expectError(response, "reviewer_not_found");
    }
  });

  it("renames a reviewer title only", async () => {
    const client = createUpdateClient({
      row: { ...reviewerRow(), title: "Renamed Reviewer" },
    });
    mocks.createReviewerUserClient.mockReturnValue(client);

    const response = await PATCH(
      createRequest({ body: { title: "  Renamed Reviewer  " } }),
      routeContext(REVIEWER_ID),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reviewer: { title: "Renamed Reviewer" },
    });
    expect(client.updatePayload).toEqual({ title: "Renamed Reviewer" });
  });

  it("rejects blank rename titles", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createUpdateClient({ row: reviewerRow() }),
    );

    const response = await PATCH(
      createRequest({ body: { title: "  " } }),
      routeContext(REVIEWER_ID),
    );

    expect(response.status).toBe(422);
    await expectError(response, "invalid_title");
  });

  it("rejects ownership and reviewer-output replacement through rename", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createUpdateClient({ row: reviewerRow() }),
    );

    for (const body of [
      { title: "Study Habits", user_id: "user-2" },
      { title: "Study Habits", reviewerOutput: reviewerOutput() },
    ]) {
      const response = await PATCH(
        createRequest({ body }),
        routeContext(REVIEWER_ID),
      );

      expect(response.status).toBe(400);
      await expectError(response, "invalid_request");
    }
  });

  it("deletes an owned reviewer", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createDeleteClient({ row: { id: REVIEWER_ID } }),
    );

    const response = await DELETE(createRequest(), routeContext(REVIEWER_ID));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
  });

  it("returns safe 404 for delete when the row is missing or inaccessible", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createDeleteClient({ row: null }));

    const response = await DELETE(createRequest(), routeContext(REVIEWER_ID));

    expect(response.status).toBe(404);
    await expectError(response, "reviewer_not_found");
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
    headers.set("authorization", options.auth ?? "Bearer valid-token");
  }

  return new Request(`http://localhost/api/reviewers/${REVIEWER_ID}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(options.body ?? { title: "Renamed Reviewer" }),
  });
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function createReadClient(options: { readonly row: unknown }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({
            data: options.row ?? null,
            error: null,
          })),
        })),
      })),
    })),
  };
}

function createUpdateClient(options: {
  readonly row: unknown;
  readonly error?: unknown;
}) {
  const state: { updatePayload?: unknown } = {};
  return {
    get updatePayload() {
      return state.updatePayload;
    },
    from: vi.fn(() => ({
      update: vi.fn((payload: unknown) => {
        state.updatePayload = payload;
        return {
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: options.row,
                error: options.error ?? null,
              })),
            })),
          })),
        };
      }),
    })),
  };
}

function createDeleteClient(options: {
  readonly row: unknown;
  readonly error?: unknown;
}) {
  return {
    from: vi.fn(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: options.row,
              error: options.error ?? null,
            })),
          })),
        })),
      })),
    })),
  };
}

function sourceMetadata() {
  return {
    sourceMode: "paste",
    sourceCharacterCount: 42,
    sourceLabel: "Study Habits",
  };
}

function canvasSourceMetadata() {
  return {
    sourceMode: "canvas",
    sourceCharacterCount: 42,
    sourceLabel: "Canvas Reviewer",
  };
}

function sourceProvenanceSummary() {
  return {
    sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
    sourceMode: "canvas",
    sourceTitle: "Canvas Reviewer",
    sourceCount: 2,
    wasEdited: true,
    generatedAt: "2026-07-07T00:10:00.000Z",
    parserVersions: ["canvas-html-visible-text-v1"],
    ocrVersions: ["canvas-stored-image-ocr-v1"],
  };
}

function reviewerRow(options: { readonly sourceMode?: "paste" | "canvas" } = {}) {
  return {
    id: REVIEWER_ID,
    user_id: "user-1",
    title: "Study Habits",
    source_metadata:
      options.sourceMode === "canvas" ? canvasSourceMetadata() : sourceMetadata(),
    reviewer_output: reviewerOutput(),
    source_snapshot_id:
      options.sourceMode === "canvas"
        ? "22222222-2222-4222-8222-222222222222"
        : null,
    section_count: 1,
    created_at: "2026-07-05T00:00:00.000Z",
    updated_at: "2026-07-05T00:01:00.000Z",
  };
}

function reviewerOutput() {
  return {
    id: "reviewer-output-1",
    title: "Study Habits",
    sections: [
      {
        id: "section-1",
        sourceSectionId: "source-section-1",
        plannedSectionId: "planned-section-1",
        title: "Study Habits",
        order: 0,
        kind: "concept-card",
        sourceBlockIds: ["block-1"],
        coverageStatus: "passed",
        coverageScore: 1,
        groundingStatus: "passed",
        groundingScore: 1,
        groundingIssues: [],
        leakageStatus: "passed",
        leakageIssues: [],
        items: [
          {
            id: "item-1",
            plannedSectionId: "planned-section-1",
            title: "Study Habits",
            kind: "concept-card",
            sourceBlockIds: ["block-1"],
            sourceCore: {
              explanation: "Set one clear goal.",
              keyPoints: ["Set one clear goal."],
            },
            enrichment: null,
          },
        ],
      },
    ],
    metadata: {
      sourceId: "source-1",
      planId: "plan-1",
      coverageReportId: "coverage-1",
      sourceTitle: "Study Habits",
      sourceKind: "plain-text",
      language: "en",
      sectionCount: 1,
      generatedSectionCount: 1,
      coverageStatus: "passed",
      coverageScore: 1,
      coverage: {},
      groundingStatus: "passed",
      groundingScore: 1,
      grounding: {},
      leakageStatus: "passed",
      leakage: {},
    },
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
