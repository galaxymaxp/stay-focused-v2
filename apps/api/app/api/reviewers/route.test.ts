import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReviewerUserClient: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  verifyBearerToken: mocks.verifyBearerToken,
}));

vi.mock("@/lib/reviewer-db", () => ({
  createReviewerUserClient: mocks.createReviewerUserClient,
}));

const { GET, OPTIONS, POST } = await import("./route");

describe("/api/reviewers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
  });

  it("returns local web CORS headers for reviewer library preflight", () => {
    const response = OPTIONS(
      new Request("http://localhost/api/reviewers", {
        method: "OPTIONS",
        headers: {
          "access-control-request-headers": "authorization, content-type",
          "access-control-request-method": "POST",
          origin: "http://localhost:8081",
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "http://localhost:8081",
    );
    expect(response.headers.get("access-control-allow-methods")).toBe(
      "GET, POST, OPTIONS",
    );
  });

  it("rejects list requests without valid auth", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await GET(createRequest({ auth: null }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.createReviewerUserClient).not.toHaveBeenCalled();
  });

  it("returns summary records without full reviewer output", async () => {
    const client = createListClient({ rows: [reviewerRow()] });
    mocks.createReviewerUserClient.mockReturnValue(client);

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      reviewers: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          title: "Study Habits",
          sectionCount: 1,
        },
      ],
    });
    expect(JSON.stringify(body)).not.toContain("reviewerOutput");
    expect(JSON.stringify(body)).not.toContain("reviewer_output");
    expect(client.orderCalls).toEqual([
      ["updated_at", { ascending: false }],
      ["created_at", { ascending: false }],
    ]);
  });

  it("handles an empty library", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createListClient({ rows: [] }));

    const response = await GET(createRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, reviewers: [] });
  });

  it("returns safe errors when listing fails", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createListClient({ rows: null, error: { message: "policy detail" } }),
    );

    const response = await GET(createRequest());
    const body = await expectError(response, "reviewer_storage_failed");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("policy detail");
  });

  it("rejects create requests without valid auth before parsing JSON", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);

    const response = await POST(createRequest({ auth: null, rawBody: "{nope" }));

    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.createReviewerUserClient).not.toHaveBeenCalled();
  });

  it("saves a valid reviewer with user ownership from verified auth", async () => {
    const client = createInsertClient({ row: reviewerRow() });
    mocks.createReviewerUserClient.mockReturnValue(client);

    const response = await POST(
      createRequest({
        body: {
          title: "  Study Habits  ",
          sourceMetadata: sourceMetadata(),
          reviewerOutput: reviewerOutput(),
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      ok: true,
      reviewer: {
        title: "Study Habits",
        reviewerOutput: { id: "reviewer-output-1" },
      },
    });
    expect(client.insertPayload).toMatchObject({
      user_id: "user-1",
      title: "Study Habits",
      section_count: 1,
    });
    expect(JSON.stringify(client.insertPayload)).not.toContain("user-2");
  });

  it("rejects client-supplied user ownership", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createInsertClient({ row: reviewerRow() }));

    const response = await POST(
      createRequest({
        body: {
          title: "Study Habits",
          user_id: "user-2",
          sourceMetadata: sourceMetadata(),
          reviewerOutput: reviewerOutput(),
        },
      }),
    );

    expect(response.status).toBe(400);
    await expectError(response, "invalid_request");
  });

  it("rejects blank and oversized titles", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createInsertClient({ row: reviewerRow() }));

    for (const title of ["   ", "x".repeat(121)]) {
      const response = await POST(
        createRequest({
          body: {
            title,
            sourceMetadata: sourceMetadata(),
            reviewerOutput: reviewerOutput(),
          },
        }),
      );

      expect(response.status).toBe(422);
      await expectError(response, "invalid_title");
    }
  });

  it("rejects invalid reviewer JSON", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createInsertClient({ row: reviewerRow() }));

    const response = await POST(
      createRequest({
        body: {
          title: "Study Habits",
          sourceMetadata: sourceMetadata(),
          reviewerOutput: { id: "not-enough" },
        },
      }),
    );

    expect(response.status).toBe(422);
    await expectError(response, "invalid_reviewer_output");
  });

  it("rejects unsupported and raw-source metadata keys", async () => {
    mocks.createReviewerUserClient.mockReturnValue(createInsertClient({ row: reviewerRow() }));

    for (const sourceMetadataBody of [
      { ...sourceMetadata(), deviceUri: "file:///private.pdf" },
      { ...sourceMetadata(), sourceText: "raw OCR text" },
    ]) {
      const response = await POST(
        createRequest({
          body: {
            title: "Study Habits",
            sourceMetadata: sourceMetadataBody,
            reviewerOutput: reviewerOutput(),
          },
        }),
      );

      expect(response.status).toBe(422);
      await expectError(response, "invalid_source_metadata");
    }
  });

  it("returns safe errors when create storage fails", async () => {
    mocks.createReviewerUserClient.mockReturnValue(
      createInsertClient({ row: null, error: { message: "SQL policy detail" } }),
    );

    const response = await POST(
      createRequest({
        body: {
          title: "Study Habits",
          sourceMetadata: sourceMetadata(),
          reviewerOutput: reviewerOutput(),
        },
      }),
    );
    const body = await expectError(response, "reviewer_storage_failed");

    expect(response.status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("SQL policy detail");
  });
});

function createRequest(
  options: {
    readonly auth?: string | null;
    readonly body?: unknown;
    readonly rawBody?: string;
  } = {},
): Request {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.auth !== null) {
    headers.set("authorization", options.auth ?? "Bearer valid-token");
  }

  const body =
    options.rawBody ??
    JSON.stringify(
      options.body ?? {
        title: "Study Habits",
        sourceMetadata: sourceMetadata(),
        reviewerOutput: reviewerOutput(),
      },
    );

  return new Request("http://localhost/api/reviewers", {
    method: "POST",
    headers,
    body,
  });
}

function createListClient(options: {
  readonly rows: readonly unknown[] | null;
  readonly error?: unknown;
}) {
  const orderCalls: unknown[][] = [];
  const builder = {
    order: vi.fn((column: string, config: unknown) => {
      orderCalls.push([column, config]);
      return orderCalls.length >= 2
        ? Promise.resolve({ data: options.rows, error: options.error ?? null })
        : builder;
    }),
  };

  return {
    orderCalls,
    from: vi.fn(() => ({
      select: vi.fn(() => builder),
    })),
  };
}

function createInsertClient(options: {
  readonly row: unknown | null;
  readonly error?: unknown;
}) {
  const state: { insertPayload?: unknown } = {};
  return {
    get insertPayload() {
      return state.insertPayload;
    },
    from: vi.fn(() => ({
      insert: vi.fn((payload: unknown) => {
        state.insertPayload = payload;
        return {
          select: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: options.row,
              error: options.error ?? null,
            })),
          })),
        };
      }),
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

function reviewerRow() {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    user_id: "user-1",
    title: "Study Habits",
    source_metadata: sourceMetadata(),
    reviewer_output: reviewerOutput(),
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
