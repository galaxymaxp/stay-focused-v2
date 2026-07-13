import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCanvasAuth: vi.fn(),
  resolveStoredCanvasUsableContent: vi.fn(),
}));

vi.mock("@/lib/canvas-routes", async () => {
  const actual = await vi.importActual<typeof import("@/lib/canvas-routes")>(
    "@/lib/canvas-routes",
  );
  return { ...actual, requireCanvasAuth: mocks.requireCanvasAuth };
});
vi.mock("@/lib/canvas-usable-content-service", () => ({
  resolveStoredCanvasUsableContent: mocks.resolveStoredCanvasUsableContent,
}));

const { POST } = await import("./route");
const COURSE_ID = "00000000-0000-4000-8000-000000000001";
const ITEM_ID = "page:00000000-0000-4000-8000-000000000002";

describe("POST Canvas usable-content resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCanvasAuth.mockResolvedValue({
      ok: true,
      value: { client: { from: vi.fn() }, user: { id: "user-1" } },
    });
  });

  it("returns content only for a usable owned synchronized source", async () => {
    mocks.resolveStoredCanvasUsableContent.mockResolvedValue({
      ok: true,
      value: {
        status: "usable",
        sourceKind: "page",
        method: "synchronized_page_html",
        sourceText: "Actual lesson content.",
        contentFingerprint: "a".repeat(64),
        provenance: { method: "synchronized_page_html" },
      },
    });
    const response = await POST(request({ itemId: ITEM_ID }), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      ok: true,
      status: "usable",
      sourceKind: "page",
      method: "synchronized_page_html",
      sourceText: "Actual lesson content.",
      contentFingerprint: "a".repeat(64),
    });
    expect(JSON.stringify(body)).not.toContain(ITEM_ID);
  });

  it.each(["empty", "unsupported", "inaccessible", "failed"])(
    "omits source text for terminal %s",
    async (status) => {
      const safeFailureCategory =
        status === "empty"
          ? "content_empty"
          : status === "unsupported"
            ? "source_unsupported"
            : status === "inaccessible"
              ? "source_inaccessible"
              : "resolution_failed";
      mocks.resolveStoredCanvasUsableContent.mockResolvedValue({
        ok: true,
        value: {
          status,
          sourceKind: "module_item",
          method: "module_reference",
          safeFailureCategory,
          provenance: { method: "module_reference" },
        },
      });
      const response = await POST(request({ itemId: ITEM_ID }), context());
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.status).toBe(status);
      expect(body.safeFailureCategory).toBe(safeFailureCategory);
      expect(body).not.toHaveProperty("sourceText");
      expect(body).not.toHaveProperty("contentFingerprint");
    },
  );

  it.each([
    { itemId: ITEM_ID, baseUrl: "https://canvas.example.edu" },
    { itemId: ITEM_ID, personalAccessToken: "private-token" },
    { itemId: "https://canvas.example.edu/files/2" },
  ])("rejects URL, base URL, and credential-shaped inputs", async (body) => {
    const response = await POST(request(body), context());

    expect(response.status).toBe(400);
    expect(mocks.resolveStoredCanvasUsableContent).not.toHaveBeenCalled();
  });
});

function request(body: unknown): Request {
  return new Request("http://localhost/api/canvas/resolve", {
    method: "POST",
    headers: { authorization: "Bearer token", "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context() {
  return { params: Promise.resolve({ courseId: COURSE_ID }) };
}
