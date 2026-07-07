import { describe, expect, it, vi } from "vitest";
import type { ReviewerOutput } from "@stay-focused/engine";

import {
  deleteReviewer,
  getReviewer,
  listReviewers,
  renameReviewer,
  saveReviewer,
} from "./reviewerLibraryApi";

const API_BASE_URL = "http://localhost:3000";
const REVIEWER_ID = "11111111-1111-4111-8111-111111111111";

describe("reviewer library API", () => {
  it("lists saved reviewers with bearer auth", async () => {
    const fetchImpl = createFetch({
      ok: true,
      reviewers: [summary()],
    });

    const result = await listReviewers({
      accessToken: "token-value",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
    });

    expect(result).toMatchObject({ ok: true, data: [summary()] });
    expect(lastRequest(fetchImpl)).toMatchObject({
      url: `${API_BASE_URL}/api/reviewers`,
      init: {
        method: "GET",
        headers: { Authorization: "Bearer token-value" },
      },
    });
  });

  it("saves a reviewer without logging raw source data", async () => {
    const fetchImpl = createFetch({
      ok: true,
      reviewer: detail(),
    });

    const result = await saveReviewer({
      accessToken: "token-value",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
      reviewerOutput: reviewerOutput(),
      sourceMetadata: {
        sourceMode: "pdf",
        sourceCharacterCount: 120,
        pdfPageCount: 2,
        sourceLabel: "Fictional handout",
      },
      title: "Fictional handout",
    });

    expect(result).toMatchObject({ ok: true, data: detail() });
    const request = lastRequest(fetchImpl);
    expect(request.url).toBe(`${API_BASE_URL}/api/reviewers`);
    expect(request.init.method).toBe("POST");
    expect(JSON.parse(String(request.init.body))).toMatchObject({
      title: "Fictional handout",
      sourceMetadata: {
        sourceMode: "pdf",
        sourceCharacterCount: 120,
        pdfPageCount: 2,
      },
      reviewerOutput: { id: "reviewer-output-1" },
    });
    expect(String(request.init.body)).not.toContain("sourceText");
    expect(String(request.init.body)).not.toContain("file://");
  });

  it("saves a Canvas reviewer with only an opaque source snapshot ID", async () => {
    const fetchImpl = createFetch({
      ok: true,
      reviewer: canvasDetail(),
    });

    const result = await saveReviewer({
      accessToken: "token-value",
      apiBaseUrl: API_BASE_URL,
      fetchImpl,
      reviewerOutput: reviewerOutput(),
      sourceMetadata: {
        sourceMode: "canvas",
        sourceCharacterCount: 120,
        sourceLabel: "Canvas Reviewer",
      },
      sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
      title: "Canvas Reviewer",
    });

    expect(result).toMatchObject({
      ok: true,
      data: {
        sourceProvenance: {
          sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
          sourceCount: 2,
          wasEdited: true,
        },
      },
    });
    const body = JSON.parse(String(lastRequest(fetchImpl).init.body));
    expect(body).toMatchObject({
      sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
      sourceMetadata: { sourceMode: "canvas" },
    });
    expect(JSON.stringify(body)).not.toContain("source_manifest");
    expect(JSON.stringify(body)).not.toContain("sha256");
    expect(JSON.stringify(body)).not.toContain("canvas_connection_id");
  });

  it("opens, renames, and deletes a reviewer", async () => {
    const openFetch = createFetch({ ok: true, reviewer: detail() });
    const renameFetch = createFetch({
      ok: true,
      reviewer: { ...summary(), title: "Renamed" },
    });
    const deleteFetch = createFetch({ ok: true });

    await expect(
      getReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: openFetch,
        reviewerId: REVIEWER_ID,
      }),
    ).resolves.toMatchObject({ ok: true, data: detail() });

    await expect(
      getReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch({ ok: true, reviewer: canvasDetail() }),
        reviewerId: REVIEWER_ID,
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: {
        sourceProvenance: {
          sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
          sourceCount: 2,
        },
      },
    });

    await expect(
      renameReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: renameFetch,
        reviewerId: REVIEWER_ID,
        title: "Renamed",
      }),
    ).resolves.toMatchObject({
      ok: true,
      data: { id: REVIEWER_ID, title: "Renamed" },
    });

    await expect(
      deleteReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: deleteFetch,
        reviewerId: REVIEWER_ID,
      }),
    ).resolves.toEqual({ ok: true, data: undefined });
  });

  it("maps auth, not-found, and storage errors safely", async () => {
    for (const [status, code] of [
      [401, "unauthorized"],
      [404, "reviewer_not_found"],
      [500, "reviewer_storage_failed"],
    ] as const) {
      const result = await listReviewers({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl: createFetch(
          {
            ok: false,
            error: {
              code,
              message: "SQL stack with Bearer secret-token",
            },
          },
          status,
        ),
      });

      expect(result).toMatchObject({ ok: false, error: { code } });
      expect(JSON.stringify(result)).not.toContain("secret-token");
      expect(JSON.stringify(result).toLowerCase()).not.toContain("stack");
    }
  });

  it("rejects missing config, token, title, and reviewer ID before fetch", async () => {
    const fetchImpl = vi.fn();

    await expect(
      listReviewers({
        accessToken: "token-value",
        apiBaseUrl: "",
        fetchImpl,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "invalid_api_base_url" } });

    await expect(
      listReviewers({
        accessToken: "",
        apiBaseUrl: API_BASE_URL,
        fetchImpl,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "missing_access_token" } });

    await expect(
      renameReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl,
        reviewerId: REVIEWER_ID,
        title: " ",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "invalid_title" } });

    await expect(
      getReviewer({
        accessToken: "token-value",
        apiBaseUrl: API_BASE_URL,
        fetchImpl,
        reviewerId: " ",
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: "missing_reviewer_id" } });

    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

function createFetch(body: unknown, status = 200) {
  return vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  });
}

function lastRequest(fetchImpl: ReturnType<typeof createFetch>) {
  const call = fetchImpl.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }

  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}

function summary() {
  return {
    id: REVIEWER_ID,
    title: "Study Habits",
    sourceMetadata: {
      sourceMode: "paste",
      sourceCharacterCount: 42,
      sourceLabel: "Study Habits",
    },
    sectionCount: 1,
    createdAt: "2026-07-05T00:00:00.000Z",
    updatedAt: "2026-07-05T00:01:00.000Z",
  };
}

function detail() {
  return {
    ...summary(),
    reviewerOutput: reviewerOutput(),
  };
}

function canvasDetail() {
  return {
    ...summary(),
    sourceMetadata: {
      sourceMode: "canvas",
      sourceCharacterCount: 120,
      sourceLabel: "Canvas Reviewer",
    },
    sourceProvenance: {
      sourceSnapshotId: "22222222-2222-4222-8222-222222222222",
      sourceMode: "canvas",
      sourceTitle: "Canvas Reviewer",
      sourceCount: 2,
      wasEdited: true,
      generatedAt: "2026-07-07T00:10:00.000Z",
      parserVersions: ["canvas-html-visible-text-v1"],
      ocrVersions: ["canvas-stored-image-ocr-v1"],
    },
    reviewerOutput: reviewerOutput(),
  };
}

function reviewerOutput(): ReviewerOutput {
  return {
    id: "reviewer-output-1",
    title: "Study Habits",
    sections: [],
    metadata: {
      sourceId: "source-1",
      planId: "plan-1",
      coverageReportId: "coverage-1",
      sourceTitle: "Study Habits",
      sourceKind: "plain-text",
      language: "en",
      sectionCount: 0,
      generatedSectionCount: 0,
      coverageStatus: "passed",
      coverageScore: 1,
      coverage: {
        id: "coverage-1",
        planId: "plan-1",
        sourceId: "source-1",
        status: "passed",
        score: 1,
        coverageScore: 1,
        coverageBasis: "source-outline",
        sourceSectionsTotal: 0,
        sourceSectionsCovered: 0,
        sourceSections: [],
        issues: [],
        sections: [],
      },
      groundingStatus: "passed",
      groundingScore: 1,
      grounding: {
        id: "grounding-1",
        planId: "plan-1",
        sourceId: "source-1",
        status: "passed",
        score: 1,
        threshold: 0.8,
        issues: [],
        sections: [],
        phase1FabricationFails: 0,
        phase1FabricationFailures: [],
      },
      leakageStatus: "passed",
      leakage: {
        id: "leakage-1",
        planId: "plan-1",
        sourceId: "source-1",
        status: "passed",
        issues: [],
        sections: [],
      },
    },
  };
}
