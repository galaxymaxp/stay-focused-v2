import { describe, expect, it, vi } from "vitest";
import { experienceRequest } from "./experienceApi";
describe("experience client", () => {
  it("sends owner authentication and stable admission key", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true, data: { id: "accepted" } }, { status: 202 }),
    );
    await expect(
      experienceRequest(
        { baseUrl: "https://api.example/", accessToken: "token", fetchImpl },
        "/api/experience/generations",
        { method: "POST", key: "stable-key", body: { materialId: "file:1" } },
      ),
    ).resolves.toEqual({ id: "accepted" });
    expect(fetchImpl.mock.calls[0]).toMatchObject([
      "https://api.example/api/experience/generations",
      {
        headers: {
          Authorization: "Bearer token",
          "Idempotency-Key": "stable-key",
        },
        method: "POST",
      },
    ]);
  });
  it("does not leak raw server diagnostics", async () => {
    await expect(
      experienceRequest(
        {
          baseUrl: "https://api.example",
          accessToken: "token",
          fetchImpl: async () =>
            Response.json(
              {
                ok: false,
                error: {
                  code: "unavailable",
                  message: "secret OCR fingerprint provider stack",
                  retryable: true,
                },
              },
              { status: 503 },
            ),
        },
        "/api/experience/library",
      ),
    ).rejects.toThrow("The server could not load this content.");
  });
  it("handles invalid JSON as a safe connection failure", async () => {
    await expect(
      experienceRequest(
        {
          baseUrl: "https://api.example",
          accessToken: "token",
          fetchImpl: async () =>
            new Response("<html>private diagnostics</html>"),
        },
        "/api/today",
      ),
    ).rejects.toThrow("Could not connect.");
  });
  it("never regenerates a persisted artifact when opened", async () => {
    const fetchImpl = vi.fn(async () =>
      Response.json({ ok: true, data: { artifact: { id: "quiz:1" } } }),
    );
    await experienceRequest(
      { baseUrl: "https://api.example", accessToken: "token", fetchImpl },
      "/api/experience/library/quiz%3A1",
    );
    expect(fetchImpl.mock.calls[0]).toMatchObject([
      "https://api.example/api/experience/library/quiz%3A1",
      { method: "GET" },
    ]);
  });
});
