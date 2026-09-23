import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReviewerUserClient: vi.fn(),
  listCanonicalReviewerRecords: vi.fn(),
  readSafeReviewerSourceProvenanceSummary: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.verifyBearerToken }));
vi.mock("@/lib/reviewer-db", () => ({ createReviewerUserClient: mocks.createReviewerUserClient }));
vi.mock("@/lib/canonical-reviewers", () => ({ listCanonicalReviewerRecords: mocks.listCanonicalReviewerRecords }));
vi.mock("@/lib/reviewer-source-provenance", () => ({
  readSafeReviewerSourceProvenanceSummary: mocks.readSafeReviewerSourceProvenanceSummary,
  verifyReviewerSourceSnapshotForSave: vi.fn(),
}));

const { GET, OPTIONS, POST } = await import("./route");

describe("/api/reviewers canonical compatibility surface", () => {
  const client = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    mocks.createReviewerUserClient.mockReturnValue(client);
    mocks.listCanonicalReviewerRecords.mockResolvedValue({ ok: true, value: [canonicalRecord()] });
  });

  it("keeps local-web CORS preflight support", () => {
    const response = OPTIONS(new Request("http://localhost/api/reviewers", {
      method: "OPTIONS",
      headers: { origin: "http://localhost:8081" },
    }));
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:8081");
  });

  it("rejects unauthenticated listing before storage access", async () => {
    mocks.verifyBearerToken.mockResolvedValue(null);
    const response = await GET(request({ auth: null }));
    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(mocks.listCanonicalReviewerRecords).not.toHaveBeenCalled();
  });

  it("lists canonical Reviewer artifacts without returning full payloads", async () => {
    const response = await GET(request());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.listCanonicalReviewerRecords).toHaveBeenCalledWith(client, "user-1");
    expect(body).toMatchObject({ ok: true, reviewers: [{ id: ARTIFACT_ID, title: "Study Habits", sectionCount: 1 }] });
    expect(JSON.stringify(body)).not.toContain("reviewerOutput");
  });

  it("reports canonical storage failures without leaking details", async () => {
    mocks.listCanonicalReviewerRecords.mockResolvedValue({ ok: false });
    const response = await GET(request());
    expect(response.status).toBe(500);
    await expectError(response, "reviewer_storage_failed");
  });

  it("maps the legacy save handshake only by exact generated payload identity", async () => {
    client.rpc.mockResolvedValue({ data: [{ ...canonicalRecord().artifact, safe_title: "Renamed" }], error: null });
    const response = await POST(request({ body: createBody("Renamed", "reviewer-output-1") }));
    const body = await response.json();
    expect(response.status).toBe(201);
    expect(client.rpc).toHaveBeenCalledWith("rename_reviewer_artifact", { p_artifact_id: ARTIFACT_ID, p_title: "Renamed" });
    expect(body.reviewer).toMatchObject({ id: ARTIFACT_ID, title: "Renamed", reviewerOutput: { id: "reviewer-output-1" } });
  });

  it("never infers canonical identity from a matching title", async () => {
    const response = await POST(request({ body: createBody("Study Habits", "different-output") }));
    expect(response.status).toBe(404);
    await expectError(response, "reviewer_not_found");
    expect(client.rpc).not.toHaveBeenCalled();
  });
});

const ARTIFACT_ID = "11111111-1111-4111-8111-111111111111";
const VERSION_ID = "22222222-2222-4222-8222-222222222222";
const SOURCE_ID = "33333333-3333-4333-8333-333333333333";

function canonicalRecord() {
  return {
    artifact: {
      id: ARTIFACT_ID, user_id: "user-1", artifact_type: "reviewer", safe_title: "Study Habits",
      latest_version_id: VERSION_ID, created_at: "2026-07-05T00:00:00.000Z", updated_at: "2026-07-05T00:01:00.000Z", deleted_at: null,
    },
    version: {
      id: VERSION_ID, artifact_id: ARTIFACT_ID, user_id: "user-1", artifact_type: "reviewer", source_version_id: SOURCE_ID,
      version_number: 1, payload: { reviewer: reviewerOutput() }, created_at: "2026-07-05T00:00:00.000Z",
    },
    source: {
      id: SOURCE_ID, user_id: "user-1", source_id: "source-1", version_number: 1, character_count: 42,
      content_hash: "hash", metadata: { sourceTitle: "Study Habits" }, created_at: "2026-07-05T00:00:00.000Z",
    },
  };
}

function createBody(title: string, outputId: string) {
  return { title, sourceMetadata: { sourceMode: "paste", sourceCharacterCount: 42 }, reviewerOutput: { ...reviewerOutput(), id: outputId } };
}

function reviewerOutput() {
  return {
    id: "reviewer-output-1", title: "Study Habits",
    sections: [{
      id: "section-1", sourceSectionId: "source-section-1", plannedSectionId: "planned-section-1", title: "Study Habits", order: 0,
      kind: "concept-card", sourceBlockIds: ["block-1"], coverageStatus: "passed", coverageScore: 1, groundingStatus: "passed",
      groundingScore: 1, groundingIssues: [], leakageStatus: "passed", leakageIssues: [],
      items: [{ id: "item-1", plannedSectionId: "planned-section-1", title: "Study Habits", kind: "concept-card", sourceBlockIds: ["block-1"], sourceCore: { explanation: "Set one goal.", keyPoints: ["Set one goal."] }, enrichment: null }],
    }],
    metadata: { sourceId: "source-1", planId: "plan-1", coverageReportId: "coverage-1", sourceTitle: "Study Habits", sourceKind: "plain-text", language: "en", sectionCount: 1, generatedSectionCount: 1, coverageStatus: "passed", coverageScore: 1, coverage: {}, groundingStatus: "passed", groundingScore: 1, grounding: {}, leakageStatus: "passed", leakage: {} },
  };
}

function request(options: { auth?: string | null; body?: unknown } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.auth !== null) headers.set("authorization", options.auth ?? "Bearer valid-token");
  return new Request("http://localhost/api/reviewers", { method: "POST", headers, body: JSON.stringify(options.body ?? createBody("Study Habits", "reviewer-output-1")) });
}

async function expectError(response: Response, code: string) {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
