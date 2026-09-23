import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createReviewerUserClient: vi.fn(),
  readCanonicalReviewerRecord: vi.fn(),
  verifyBearerToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.verifyBearerToken }));
vi.mock("@/lib/reviewer-db", () => ({ createReviewerUserClient: mocks.createReviewerUserClient }));
vi.mock("@/lib/canonical-reviewers", () => ({ readCanonicalReviewerRecord: mocks.readCanonicalReviewerRecord }));
vi.mock("@/lib/reviewer-source-provenance", () => ({ readSafeReviewerSourceProvenanceSummary: vi.fn() }));

const { DELETE, GET, PATCH } = await import("./route");
const ARTIFACT_ID = "11111111-1111-4111-8111-111111111111";

describe("/api/reviewers/[id] canonical artifact management", () => {
  const client = { rpc: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyBearerToken.mockResolvedValue({ id: "user-1" });
    mocks.createReviewerUserClient.mockReturnValue(client);
    mocks.readCanonicalReviewerRecord.mockResolvedValue({ ok: true, value: canonicalRecord() });
  });

  it.each([["read", GET], ["rename", PATCH], ["delete", DELETE]])("rejects unauthenticated %s", async (_label, handler) => {
    mocks.verifyBearerToken.mockResolvedValue(null);
    const response = await handler(request({ auth: null }), context());
    expect(response.status).toBe(401);
    await expectError(response, "unauthorized");
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("reads a full canonical Reviewer", async () => {
    const response = await GET(request(), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(mocks.readCanonicalReviewerRecord).toHaveBeenCalledWith(client, "user-1", ARTIFACT_ID);
    expect(body.reviewer).toMatchObject({ id: ARTIFACT_ID, reviewerOutput: { id: "reviewer-output-1" } });
  });

  it("returns the same 404 for missing or owner-inaccessible artifacts", async () => {
    mocks.readCanonicalReviewerRecord.mockResolvedValue({ ok: true, value: null });
    const response = await GET(request(), context());
    expect(response.status).toBe(404);
    await expectError(response, "reviewer_not_found");
  });

  it("renames through the owner-safe canonical RPC", async () => {
    client.rpc.mockResolvedValue({ data: [{ ...canonicalRecord().artifact, safe_title: "Renamed" }], error: null });
    const response = await PATCH(request({ body: { title: "  Renamed  " } }), context());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(client.rpc).toHaveBeenCalledWith("rename_reviewer_artifact", { p_artifact_id: ARTIFACT_ID, p_title: "Renamed" });
    expect(body.reviewer.title).toBe("Renamed");
  });

  it("soft-deletes through the canonical RPC", async () => {
    client.rpc.mockResolvedValue({ data: true, error: null });
    const response = await DELETE(request(), context());
    expect(response.status).toBe(200);
    expect(client.rpc).toHaveBeenCalledWith("delete_reviewer_artifact", { p_artifact_id: ARTIFACT_ID });
  });

  it("retains the Reviewer and reports a dependency conflict when Quizzes exist", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: "reviewer_has_quizzes" } });
    const response = await DELETE(request(), context());
    expect(response.status).toBe(409);
    await expectError(response, "reviewer_has_quizzes");
  });

  it("does not expose a foreign or missing artifact through delete", async () => {
    client.rpc.mockResolvedValue({ data: null, error: { message: "reviewer_not_found" } });
    const response = await DELETE(request(), context());
    expect(response.status).toBe(404);
    await expectError(response, "reviewer_not_found");
  });
});

function canonicalRecord() {
  const versionId = "22222222-2222-4222-8222-222222222222";
  const sourceId = "33333333-3333-4333-8333-333333333333";
  return {
    artifact: { id: ARTIFACT_ID, user_id: "user-1", artifact_type: "reviewer", safe_title: "Study Habits", latest_version_id: versionId, created_at: "2026-07-05T00:00:00.000Z", updated_at: "2026-07-05T00:01:00.000Z", deleted_at: null },
    version: { id: versionId, artifact_id: ARTIFACT_ID, user_id: "user-1", artifact_type: "reviewer", source_version_id: sourceId, version_number: 1, payload: { reviewer: reviewerOutput() }, created_at: "2026-07-05T00:00:00.000Z" },
    source: { id: sourceId, user_id: "user-1", source_id: "source-1", version_number: 1, character_count: 42, content_hash: "hash", metadata: { sourceTitle: "Study Habits" }, created_at: "2026-07-05T00:00:00.000Z" },
  };
}

function reviewerOutput() {
  return {
    id: "reviewer-output-1", title: "Study Habits",
    sections: [{ id: "section-1", sourceSectionId: "source-section-1", plannedSectionId: "planned-section-1", title: "Study Habits", order: 0, kind: "concept-card", sourceBlockIds: ["block-1"], coverageStatus: "passed", coverageScore: 1, groundingStatus: "passed", groundingScore: 1, groundingIssues: [], leakageStatus: "passed", leakageIssues: [], items: [{ id: "item-1", plannedSectionId: "planned-section-1", title: "Study Habits", kind: "concept-card", sourceBlockIds: ["block-1"], sourceCore: { explanation: "Set one goal.", keyPoints: ["Set one goal."] }, enrichment: null }] }],
    metadata: { sourceId: "source-1", planId: "plan-1", coverageReportId: "coverage-1", sourceTitle: "Study Habits", sourceKind: "plain-text", language: "en", sectionCount: 1, generatedSectionCount: 1, coverageStatus: "passed", coverageScore: 1, coverage: {}, groundingStatus: "passed", groundingScore: 1, grounding: {}, leakageStatus: "passed", leakage: {} },
  };
}

function request(options: { auth?: string | null; body?: unknown } = {}) {
  const headers = new Headers({ "content-type": "application/json" });
  if (options.auth !== null) headers.set("authorization", options.auth ?? "Bearer valid-token");
  return new Request(`http://localhost/api/reviewers/${ARTIFACT_ID}`, { method: "PATCH", headers, body: JSON.stringify(options.body ?? { title: "Renamed" }) });
}

function context() { return { params: Promise.resolve({ id: ARTIFACT_ID }) }; }

async function expectError(response: Response, code: string) {
  const body = await response.json();
  expect(body).toMatchObject({ ok: false, error: { code } });
  expect(JSON.stringify(body).toLowerCase()).not.toContain("stack");
}
