import { describe, expect, it, vi } from "vitest";
import { experienceRequest } from "./experienceApi";
import { ApiConfigurationError } from "../config/apiBaseUrlResolution";
describe("experience client", () => {
  it("keeps missing configuration separate from authentication and prevents a request", async () => {
    const fetchImpl = vi.fn();
    const client = { baseUrl: "", accessToken: "valid-session-token", fetchImpl };
    await expect(experienceRequest(client, "/api/experience/courses")).rejects.toMatchObject({
      kind: "configuration", code: "missing_api_base_url",
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(client.accessToken).toBe("valid-session-token");
    await expect(experienceRequest({ ...client, baseUrl: "https://api.example", accessToken: "" }, "/api/experience/courses")).rejects.toMatchObject({ code: "sign_in_required" });
    await expect(experienceRequest(client, "/api/experience/courses")).rejects.toBeInstanceOf(ApiConfigurationError);
  });
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
  it("shows the supported Quiz maximum from a typed capacity rejection", async () => {
    await expect(experienceRequest({
      baseUrl: "https://api.example", accessToken: "token",
      fetchImpl: async () => Response.json({ ok: false, error: { code: "quiz_source_capacity_exceeded", supportedMaximum: 43, message: "private detail", retryable: false } }, { status: 422 }),
    }, "/api/experience/quizzes", { method: "POST" })).rejects.toThrow("supports up to 43 questions");
  });
  it("classifies an invalid server response separately from connectivity", async () => {
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
    ).rejects.toMatchObject({ code: "invalid_response" });
  });
  it("classifies only actual HTTP responses as authentication or authorization failures", async () => {
    for (const [status, code] of [[401, "sign_in_required"], [403, "permission_denied"]] as const) {
      const fetchImpl = vi.fn(async () => new Response("", { status }));
      await expect(experienceRequest({ baseUrl: "https://api.example", accessToken: "token", fetchImpl }, "/api/experience/courses")).rejects.toMatchObject({ code });
      expect(fetchImpl).toHaveBeenCalledOnce();
    }
    await expect(experienceRequest({ baseUrl: "https://api.example", accessToken: "token", fetchImpl: async () => { throw new Error("offline"); } }, "/api/experience/courses")).rejects.toMatchObject({ code: "connection" });
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
