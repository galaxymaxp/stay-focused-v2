import { describe, expect, it, vi } from "vitest";
import { persistCanonicalSource } from "./canonicalSourcesApi";

describe("canonical source handoff", () => {
  it.each([
    ["text", undefined],
    ["camera", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"],
    ["local_file", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"],
  ] as const)("persists %s with an idempotency key and no client owner", async (sourceType, sourceVersionId) => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect(init.headers).toMatchObject({ Authorization: "Bearer token", "idempotency-key": "source-key-1" });
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      expect(body).toMatchObject({ sourceType, displayName: "Study notes" });
      expect(body).not.toHaveProperty("userId");
      expect(body.sourceVersionId).toBe(sourceVersionId);
      return new Response(JSON.stringify({ ok: true, data: { id: "saved-id", sourceType, displayName: "Study notes" } }), { status: 200 });
    });
    const original = globalThis.fetch;
    globalThis.fetch = fetchMock as typeof fetch;
    try {
      const result = await persistCanonicalSource({ apiBaseUrl: "https://example.test/", accessToken: "token", idempotencyKey: "source-key-1", sourceType, displayName: "Study notes", sourceText: "A note about cells", ...(sourceVersionId ? { sourceVersionId } : {}) });
      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { globalThis.fetch = original; }
  });
});
