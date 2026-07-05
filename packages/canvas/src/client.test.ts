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
        accountId: null,
        startAt: null,
        endAt: null,
        timeZone: null,
        publicSyllabus: null,
        syllabusBody: null,
        updatedAt: null,
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

  it("lists courses from the expected endpoint with bearer authorization", async () => {
    const fetchImpl = createFetch([jsonResponse([{ id: 10, name: "Course" }])]);
    const client = createClient(fetchImpl, "course-token");

    await expect(client.listCourses()).resolves.toMatchObject([{ id: "10" }]);

    const request = lastRequest(fetchImpl);
    expect(request.url).toBe(
      "https://canvas.test/api/v1/courses?per_page=50&enrollment_state=active",
    );
    expect(request.init.headers).toMatchObject({
      Authorization: "Bearer course-token",
    });
  });

  it("encodes course IDs and paginates modules", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "Module One", position: 1 }], {
        link: '<https://canvas.test/api/v1/courses/course%2F1/modules?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          id: 2,
          name: "Module Two",
          prerequisite_module_ids: [1, "module-0"],
          require_sequential_progress: true,
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listModules("course/1")).resolves.toEqual([
      {
        id: "1",
        name: "Module One",
        position: 1,
        unlockAt: null,
        itemCount: null,
        requireSequentialProgress: null,
        published: null,
        prerequisiteModuleIds: [],
        state: null,
      },
      {
        id: "2",
        name: "Module Two",
        position: null,
        unlockAt: null,
        itemCount: null,
        requireSequentialProgress: true,
        published: null,
        prerequisiteModuleIds: ["1", "module-0"],
        state: null,
      },
    ]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://canvas.test/api/v1/courses/course%2F1/modules?per_page=50",
    );
  });

  it("encodes module item IDs and preserves polymorphic fields", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, title: "Read Page", type: "Page" }], {
        link: '<https://canvas.test/api/v1/courses/course%201/modules/module%2F1/items?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          id: 2,
          title: "External tool",
          position: 3,
          indent: 1,
          type: "ExternalTool",
          content_id: 99,
          page_url: "week-one",
          external_url: "https://tool.example.invalid/launch",
          html_url: "https://canvas.test/courses/1/modules/items/2",
          new_tab: true,
          published: false,
          completion_requirement: { type: "must_view", completed: false },
          content_details: { points_possible: 10, due_at: null },
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listModuleItems("course 1", "module/1")).resolves.toEqual([
      {
        id: "1",
        title: "Read Page",
        position: null,
        indent: null,
        type: "Page",
        contentId: null,
        pageUrl: null,
        externalUrl: null,
        htmlUrl: null,
        newTab: null,
        published: null,
        completionRequirement: null,
        contentDetails: null,
      },
      {
        id: "2",
        title: "External tool",
        position: 3,
        indent: 1,
        type: "ExternalTool",
        contentId: "99",
        pageUrl: "week-one",
        externalUrl: "https://tool.example.invalid/launch",
        htmlUrl: "https://canvas.test/courses/1/modules/items/2",
        newTab: true,
        published: false,
        completionRequirement: { type: "must_view", completed: false },
        contentDetails: { points_possible: 10, due_at: null },
      },
    ]);
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://canvas.test/api/v1/courses/course%201/modules/module%2F1/items?per_page=50",
    );
  });

  it("lists Pages and encodes Page detail URL slugs", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ page_id: 5, url: "week-one", title: "Week One" }], {
        link: '<https://canvas.test/api/v1/courses/7/pages?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          url: "week-two",
          title: "Week Two",
          published: true,
          front_page: false,
        },
      ]),
      jsonResponse({
        page_id: 6,
        url: "week 1/overview",
        title: "Overview",
        body: "<p>Fictional overview.</p>",
        lock_info: { locked: false },
      }),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listPages("7")).resolves.toMatchObject([
      { pageId: "5", url: "week-one", title: "Week One" },
      { pageId: null, url: "week-two", title: "Week Two" },
    ]);
    await expect(client.getPage("7", "week 1/overview")).resolves.toMatchObject({
      pageId: "6",
      url: "week 1/overview",
      body: "<p>Fictional overview.</p>",
      lockInfo: { locked: false },
    });
    expect(fetchImpl.mock.calls[2]?.[0]).toBe(
      "https://canvas.test/api/v1/courses/7/pages/week%201%2Foverview",
    );
  });

  it("lists assignment groups with pagination", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 10, name: "Homework", group_weight: 40 }], {
        link: '<https://canvas.test/api/v1/courses/7/assignment_groups?page=2>; rel="next"',
      }),
      jsonResponse([{ id: 11, name: "Projects", rules: { drop_lowest: 1 } }]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listAssignmentGroups("7")).resolves.toEqual([
      {
        id: "10",
        name: "Homework",
        position: null,
        groupWeight: 40,
        rules: null,
        integrationData: null,
      },
      {
        id: "11",
        name: "Projects",
        position: null,
        groupWeight: null,
        rules: { drop_lowest: 1 },
        integrationData: null,
      },
    ]);
  });

  it("lists assignments with pagination and nullable dates intact", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 50, name: "Draft", due_at: null }], {
        link: '<https://canvas.test/api/v1/courses/7/assignments?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          id: 51,
          assignment_group_id: 10,
          name: "Final",
          points_possible: 100,
          grading_type: "points",
          submission_types: ["online_upload", "external_tool"],
          due_at: "2026-07-20T00:00:00Z",
          unlock_at: null,
          lock_at: null,
          published: true,
          muted: false,
          omit_from_final_grade: false,
          anonymous_grading: null,
          html_url: "https://canvas.test/courses/7/assignments/51",
          quiz_id: 88,
          discussion_topic_id: null,
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listAssignments("7")).resolves.toMatchObject([
      {
        id: "50",
        dueAt: null,
        unlockAt: null,
        lockAt: null,
        submissionTypes: [],
      },
      {
        id: "51",
        assignmentGroupId: "10",
        dueAt: "2026-07-20T00:00:00Z",
        unlockAt: null,
        lockAt: null,
        submissionTypes: ["online_upload", "external_tool"],
        quizId: "88",
        discussionTopicId: null,
      },
    ]);
  });

  it("propagates later-page failures without returning successful prefixes", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses?page=2>; rel="next"',
      }),
      new Response(JSON.stringify({ down: true }), { status: 503 }),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourses()).rejects.toMatchObject({
      code: "canvas_unavailable",
    });
  });

  it("rejects repeated pagination links before looping", async () => {
    const firstPage =
      "https://canvas.test/api/v1/courses?per_page=50&enrollment_state=active";
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: `<${firstPage}>; rel="next"`,
      }),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourses()).rejects.toMatchObject({
      code: "canvas_pagination_rejected",
    });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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

  it("rejects pagination limits instead of returning partial results", async () => {
    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses?page=2>; rel="next"',
      }),
    ]);
    const client = createClient(fetchImpl, "token", 1);

    await expect(client.listCourses()).rejects.toMatchObject({
      code: "canvas_pagination_rejected",
    });
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
