import { describe, expect, it, vi } from "vitest";

import {
  CanvasClient,
  CanvasClientError,
  normalizeCanvasBaseUrl,
} from "./client";

type FetchMock = ReturnType<typeof vi.fn> & typeof fetch;

describe("normalizeCanvasBaseUrl", () => {
  it.each([
    ["https://example.instructure.com", "https://example.instructure.com"],
    ["https://example.instructure.com/", "https://example.instructure.com"],
    [
      "https://example.instructure.com/api/v1",
      "https://example.instructure.com",
    ],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeCanvasBaseUrl(input)).toBe(expected);
  });

  it("allows HTTP only for explicit test fixtures", () => {
    expect(
      normalizeCanvasBaseUrl("http://canvas.test/api/v1", {
        allowHttpForTesting: true,
      }),
    ).toBe("http://canvas.test");
  });

  it.each([
    "not a url",
    "ftp://example.instructure.com",
    "http://example.instructure.com",
    "https://token@example.instructure.com",
    "https://example.instructure.com?token=value",
    "https://example.instructure.com#fragment",
  ])("rejects unsafe URL %s", (input) => {
    expect(() => normalizeCanvasBaseUrl(input)).toThrow(CanvasClientError);
  });
});

describe("CanvasClient", () => {
  it("normalizes profile and course responses", async () => {
    const fetchImpl = createFetch([
      jsonResponse({ id: 42, name: "Ada Student", primary_email: "ada@test.edu" }),
      jsonResponse([
        {
          id: 7,
          name: "Biology 101",
          course_code: "BIO101",
          workflow_state: "available",
          enrollment_term_id: 3,
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.getCurrentUser()).resolves.toEqual({
      id: "42",
      name: "Ada Student",
      email: "ada@test.edu",
      sortableName: null,
      shortName: null,
    });
    await expect(client.listCourses()).resolves.toEqual([
      {
        id: "7",
        name: "Biology 101",
        courseCode: "BIO101",
        workflowState: "available",
        enrollmentTermId: "3",
        startAt: null,
        endAt: null,
      },
    ]);
  });

  it("sends bearer auth without putting tokens in URLs", async () => {
    const fetchImpl = createFetch([
      jsonResponse({ id: 42, name: "Ada Student" }),
    ]);
    const client = createClient(fetchImpl, "secret-token");

    await client.getCurrentUser();

    const request = lastRequest(fetchImpl);
    expect(request.url).toBe("https://canvas.test/api/v1/users/self/profile");
    expect(request.url).not.toContain("secret-token");
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer secret-token",
    });
  });

  it("paginates in order and rejects cross-origin next links", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses?page=2>; rel="next"',
      }),
      jsonResponse([{ id: 2, name: "Two" }]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourses()).resolves.toMatchObject([
      { id: "1" },
      { id: "2" },
    ]);

    const rejectedFetch = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://evil.test/api/v1/courses?page=2>; rel="next"',
      }),
    ]);
    const rejectedClient = createClient(rejectedFetch);

    await expect(rejectedClient.listCourses()).rejects.toMatchObject({
      code: "canvas_pagination_rejected",
    });
  });

  it("rejects same-origin redirects without following them", async () => {
    const fetchImpl = createRedirectFetch(
      "https://canvas.test/api/v1/users/self/profile",
      "https://canvas.test/login",
    );
    const client = createClient(fetchImpl, "secret-token");

    await expect(client.getCurrentUser()).rejects.toMatchObject({
      code: "canvas_redirect_rejected",
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(lastRequest(fetchImpl)).toMatchObject({
      url: "https://canvas.test/api/v1/users/self/profile",
    });
    expect(lastRequest(fetchImpl).init.redirect).toBe("manual");
  });

  it("rejects cross-origin redirects without forwarding bearer auth", async () => {
    const fetchImpl = createRedirectFetch(
      "https://canvas.test/api/v1/users/self/profile",
      "https://evil.test/collect?next=secret",
    );
    const client = createClient(fetchImpl, "secret-token");

    const error = await client.getCurrentUser().catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      code: "canvas_redirect_rejected",
    });
    expect(String((error as Error).message)).not.toMatch(/secret-token/);
    expect(String((error as Error).message)).not.toMatch(/evil\.test/);

    expect(
      fetchImpl.mock.calls.some(([url]) => String(url).startsWith("https://evil.test")),
    ).toBe(false);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    for (const call of fetchImpl.mock.calls) {
      const init = call[1] as RequestInit;
      expect(init.redirect).toBe("manual");
    }
  });

  it("respects pagination limits", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses?page=2>; rel="next"',
      }),
    ]);
    const client = createClient(fetchImpl, "token", 1);

    await expect(client.listCourses()).resolves.toMatchObject([{ id: "1" }]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "canvas_unauthorized"],
    [403, "canvas_forbidden"],
    [429, "canvas_rate_limited"],
    [503, "canvas_unavailable"],
  ] as const)("maps HTTP %s safely", async (status, code) => {
    const fetchImpl = createFetch([
      new Response(JSON.stringify({ raw: "secret-token" }), { status }),
    ]);
    const client = createClient(fetchImpl, "secret-token");

    await expect(client.getCurrentUser()).rejects.toMatchObject({ code });
    await expect(client.getCurrentUser()).rejects.not.toThrow(/secret-token/);
  });

  it("handles malformed JSON and timeouts safely", async () => {
    const malformed = createClient(
      createFetch([new Response("{nope", { status: 200 })]),
    );
    await expect(malformed.getCurrentUser()).rejects.toMatchObject({
      code: "canvas_malformed_json",
    });

    const timeoutFetch = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted", "AbortError"));
          });
        }),
    ) as FetchMock;
    const timedOut = new CanvasClient({
      allowHttpForTesting: true,
      baseUrl: "https://canvas.test",
      fetchImpl: timeoutFetch,
      personalAccessToken: "token",
      timeoutMs: 1,
    });

    await expect(timedOut.getCurrentUser()).rejects.toMatchObject({
      code: "canvas_timeout",
    });
  });

  it("returns independent capability probe results", async () => {
    const now = new Date("2026-07-05T01:02:03.000Z");
    const fetchImpl = createFetch([
      jsonResponse({ id: 42, name: "Ada Student" }),
      jsonResponse([{ id: 7, name: "Biology 101" }]),
      jsonResponse([{ id: "enrollment-1" }]),
      new Response(JSON.stringify({ denied: true }), { status: 403 }),
      jsonResponse([{ id: "group-1" }]),
      new Response(JSON.stringify({ down: true }), { status: 503 }),
    ]);
    const client = new CanvasClient({
      allowHttpForTesting: true,
      baseUrl: "https://canvas.test",
      fetchImpl,
      now: () => now,
      personalAccessToken: "token",
    });

    const results = await client.probeCapabilities();

    expect(results.find((result) => result.capability === "profile")).toMatchObject({
      status: "available",
      testedAt: now.toISOString(),
    });
    expect(results.find((result) => result.capability === "modules")).toMatchObject({
      status: "permission_denied",
      safeErrorCode: "canvas_forbidden",
      courseId: "7",
    });
    expect(
      results.find((result) => result.capability === "assignment_groups"),
    ).toMatchObject({
      status: "available",
      courseId: "7",
    });
    expect(results.find((result) => result.capability === "planner")).toMatchObject({
      status: "temporarily_failed",
      safeErrorCode: "canvas_unavailable",
    });
    expect(results.find((result) => result.capability === "files")).toMatchObject({
      status: "not_tested",
      testedAt: null,
    });
  });
});

function createClient(
  fetchImpl: typeof fetch,
  token = "token",
  maxPages = 10,
): CanvasClient {
  return new CanvasClient({
    allowHttpForTesting: true,
    baseUrl: "https://canvas.test/api/v1",
    fetchImpl,
    maxPages,
    personalAccessToken: token,
  });
}

function createRedirectFetch(
  initialUrl: string,
  redirectUrl: string,
): FetchMock {
  const mock = vi.fn(
    async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      if (String(url) === initialUrl && init?.redirect !== "manual") {
        await mock(redirectUrl, init);
      }
      return new Response("", {
        status: 302,
        headers: { location: redirectUrl },
      });
    },
  ) as FetchMock;
  return mock;
}

function createFetch(responses: readonly Response[]): FetchMock {
  let index = 0;
  return vi.fn(async (): Promise<Response> => {
    const response = responses[index];
    index += 1;
    if (!response) {
      return jsonResponse([]);
    }
    return response;
  }) as FetchMock;
}

function jsonResponse(
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });
}

function lastRequest(fetchImpl: FetchMock): {
  readonly url: string;
  readonly init: RequestInit;
} {
  const call = fetchImpl.mock.calls.at(-1);
  if (!call) {
    throw new Error("fetch was not called");
  }
  return {
    url: String(call[0]),
    init: call[1] as RequestInit,
  };
}
