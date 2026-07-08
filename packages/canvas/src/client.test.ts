import { describe, expect, it, vi } from "vitest";

import {
  CanvasClient,
  CanvasClientError,
  normalizeCanvasBaseUrl,
} from "./client";
import type { CanvasFile, CanvasHostnameResolver } from "./types";

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
        concluded: null,
        term: null,
        enrollments: [],
        sections: [],
      },
    ]);
  });

  it("lists course inventory with presentation metadata", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 7,
          name: "Biology 101",
          course_code: "BIO101",
          workflow_state: "available",
          concluded: false,
          term: {
            id: 3,
            name: "First Term",
            start_at: "2026-06-01T00:00:00Z",
            end_at: "2026-10-01T00:00:00Z",
          },
          enrollments: [
            {
              id: 9,
              type: "StudentEnrollment",
              enrollment_state: "active",
            },
          ],
          sections: [
            {
              id: 4,
              name: "A",
              enrollment_role: "StudentEnrollment",
            },
          ],
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourseInventory()).resolves.toMatchObject([
      {
        id: "7",
        term: { id: "3", name: "First Term" },
        concluded: false,
        enrollments: [{ id: "9", enrollmentState: "active" }],
        sections: [{ id: "4", enrollmentRole: "StudentEnrollment" }],
      },
    ]);

    const request = lastRequest(fetchImpl);
    expect(request.url).toContain("/api/v1/courses?");
    expect(request.url).toContain("state%5B%5D=available");
    expect(request.url).toContain("include%5B%5D=term");
    expect(request.url).toContain("include%5B%5D=concluded");
  });

  it("uses safe presentation fallbacks when inventory courses omit names", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 7,
          name: null,
          friendly_name: null,
          course_code: "BIO101",
          workflow_state: "available",
        },
        {
          id: 8,
          name: null,
          friendly_name: null,
          course_code: null,
          workflow_state: "available",
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourseInventory()).resolves.toMatchObject([
      { id: "7", name: "BIO101" },
      { id: "8", name: "Untitled Canvas course" },
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

  it("lists Phase 5E course assignments with safe grade metadata", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 50,
          assignment_group_id: 10,
          name: "Fictional Draft",
          description: "<p>Existing assignment description.</p>",
          points_possible: 0,
          grading_type: "points",
          submission_types: ["online_upload", "external_tool"],
          due_at: null,
          unlock_at: null,
          lock_at: null,
          published: true,
          muted: false,
          omit_from_final_grade: false,
          allowed_attempts: 3,
          hide_in_gradebook: true,
          post_manually: true,
          quiz_id: 88,
          discussion_topic_id: null,
          assignment_visibility: [137, 381],
          rubric: [{ private: "discarded" }],
          final_grader_id: 999,
        },
        {
          id: "51",
          name: "Fictional Practice",
          submission_types: [],
          allowed_attempts: -1,
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.listCourseAssignments("course/7")).resolves.toEqual([
      {
        canvasAssignmentId: "50",
        title: "Fictional Draft",
        assignmentGroupId: "10",
        pointsPossible: 0,
        gradingType: "points",
        submissionTypes: ["online_upload", "external_tool"],
        dueAt: null,
        unlockAt: null,
        lockAt: null,
        published: true,
        muted: false,
        omitFromFinalGrade: false,
        allowedAttempts: 3,
        allowedAttemptsUnlimited: false,
        hideInGradebook: true,
        postManually: true,
        quizId: "88",
        discussionTopicId: null,
        assignmentVisible: true,
      },
      {
        canvasAssignmentId: "51",
        title: "Fictional Practice",
        assignmentGroupId: null,
        pointsPossible: null,
        gradingType: null,
        submissionTypes: [],
        dueAt: null,
        unlockAt: null,
        lockAt: null,
        published: null,
        muted: null,
        omitFromFinalGrade: null,
        allowedAttempts: null,
        allowedAttemptsUnlimited: true,
        hideInGradebook: null,
        postManually: null,
        quizId: null,
        discussionTopicId: null,
        assignmentVisible: null,
      },
    ]);

    const first = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(first.pathname).toBe("/api/v1/courses/course%2F7/assignments");
    expect(first.searchParams.get("per_page")).toBe("50");
    expect(first.searchParams.getAll("include[]")).toEqual([]);
  });

  it("rejects malformed Phase 5E assignment metadata", async () => {
    const cases = [
      [{ id: 1, name: "Bad Points", points_possible: "NaN" }],
      [{ id: 1, name: "x".repeat(501) }],
      [{ id: 1, name: "Bad Attempts", allowed_attempts: -2 }],
      [{ id: 1, name: "Bad Types", submission_types: ["online_upload", {}] }],
      [{ id: 1, name: "Bad Date", due_at: "not-a-date" }],
    ];

    for (const body of cases) {
      const client = createClient(createFetch([jsonResponse(body)]));
      await expect(client.listCourseAssignments("7")).rejects.toMatchObject({
        code: "canvas_invalid_response",
      });
    }
  });

  it("applies pagination security to Phase 5E assignments", async () => {
    const pagedFetch = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses/7/assignments?page=2>; rel="next"',
      }),
      jsonResponse([{ id: 2, name: "Two" }]),
    ]);
    await expect(createClient(pagedFetch).listCourseAssignments("7")).resolves.toEqual([
      expect.objectContaining({ canvasAssignmentId: "1" }),
      expect.objectContaining({ canvasAssignmentId: "2" }),
    ]);

    const crossOrigin = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://evil.test/api/v1/courses/7/assignments?page=2>; rel="next"',
      }),
    ]);
    await expect(
      createClient(crossOrigin).listCourseAssignments("7"),
    ).rejects.toMatchObject({ code: "canvas_pagination_rejected" });

    const repeatedUrl =
      "https://canvas.test/api/v1/courses/7/assignments?per_page=50";
    const repeated = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: `<${repeatedUrl}>; rel="next"`,
      }),
    ]);
    await expect(
      createClient(repeated).listCourseAssignments("7"),
    ).rejects.toMatchObject({ code: "canvas_pagination_rejected" });

    const limited = createFetch([
      jsonResponse([{ id: 1, name: "One" }], {
        link: '<https://canvas.test/api/v1/courses/7/assignments?page=2>; rel="next"',
      }),
    ]);
    await expect(
      createClient(limited, "token", 1).listCourseAssignments("7"),
    ).rejects.toMatchObject({ code: "canvas_pagination_rejected" });

    const malformed = createFetch([jsonResponse({ id: 1, name: "No Array" })]);
    await expect(
      createClient(malformed).listCourseAssignments("7"),
    ).rejects.toMatchObject({ code: "canvas_invalid_response" });
  });

  it("lists own course submissions while discarding unsafe fields", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          assignment_id: 100,
          workflow_state: "unsubmitted",
          late: false,
          missing: false,
          excused: false,
        },
        {
          assignment_id: 101,
          workflow_state: "submitted",
          submission_type: "online_upload",
          submitted_at: "2026-07-01T01:00:00Z",
          attempt: 1,
          late: true,
          missing: false,
          excused: false,
          seconds_late: 300,
          late_policy_status: "late",
          assignment_visible: true,
          body: "private body",
          submission_comments: [{ comment: "private comment" }],
          attachments: [{ id: 1, display_name: "private.pdf" }],
          preview_url: "https://canvas.test/preview",
          html_url: "https://canvas.test/submission",
          url: "https://example.invalid/submitted",
          user_id: 444,
          grader_id: 555,
          media_comment: { media_id: "private" },
          rubric_assessment: { private: true },
          submission_history: [{ private: true }],
          anonymous_id: "anon",
        },
        {
          assignment_id: 102,
          workflow_state: "graded",
          submitted_at: "2026-07-01T01:00:00Z",
          graded_at: "2026-07-02T01:00:00Z",
          posted_at: "2026-07-03T01:00:00Z",
          attempt: 0,
          late: false,
          missing: false,
          excused: false,
          grade_matches_current_submission: true,
          score: 0,
          grade: "",
        },
        {
          assignment_id: 103,
          workflow_state: "graded",
          graded_at: "2026-07-02T01:00:00Z",
          score: 98.5,
          grade: "A",
          grade_matches_current_submission: false,
        },
        {
          assignment_id: 104,
          workflow_state: "graded",
          graded_at: "2026-07-02T01:00:00Z",
        },
      ], {
        link: '<https://canvas.test/api/v1/courses/7/students/submissions?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          assignment_id: 105,
          workflow_state: "submitted",
          late: true,
          missing: null,
          excused: true,
          score: null,
          grade: null,
        },
        {
          assignment_id: 106,
          workflow_state: "missing",
          late: true,
          missing: true,
          excused: false,
          late_policy_status: "missing",
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    const result = await client.listOwnCourseSubmissions("7");

    expect(result).toHaveLength(7);
    expect(result[0]).toMatchObject({
      canvasAssignmentId: "100",
      workflowState: "unsubmitted",
      score: { state: "unknown", value: null },
      grade: { state: "unknown", value: null },
    });
    expect(result[1]).toMatchObject({
      canvasAssignmentId: "101",
      submittedAt: "2026-07-01T01:00:00Z",
      attempt: 1,
      late: true,
      secondsLate: 300,
      latePolicyStatus: "late",
      assignmentVisible: true,
    });
    expect(result[2]).toMatchObject({
      canvasAssignmentId: "102",
      attempt: 0,
      score: { state: "visible", value: 0 },
      grade: { state: "visible", value: "" },
    });
    expect(result[3]).toMatchObject({
      score: { state: "visible", value: 98.5 },
      grade: { state: "visible", value: "A" },
      gradeMatchesCurrentSubmission: false,
    });
    expect(result[4]).toMatchObject({
      score: { state: "hidden", value: null },
      grade: { state: "hidden", value: null },
    });
    expect(result[5]).toMatchObject({
      excused: true,
      score: { state: "unavailable", value: null },
      grade: { state: "unavailable", value: null },
    });
    expect(result[6]).toMatchObject({
      late: true,
      missing: true,
      latePolicyStatus: "missing",
    });

    for (const submission of result) {
      expect(Object.keys(submission)).not.toEqual(
        expect.arrayContaining([
          "body",
          "submission_comments",
          "attachments",
          "preview_url",
          "html_url",
          "url",
          "user_id",
          "grader_id",
          "rubric_assessment",
          "submission_history",
          "anonymous_id",
        ]),
      );
    }
  });

  it("requests own submissions without student ids or unsafe includes", async () => {
    const fetchImpl = createFetch([jsonResponse([])]);
    const client = createClient(fetchImpl, "submission-token");

    await client.listOwnCourseSubmissions("course/7");

    const request = lastRequest(fetchImpl);
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/v1/courses/course%2F7/students/submissions");
    expect(url.searchParams.get("per_page")).toBe("50");
    expect(url.searchParams.getAll("student_ids[]")).toEqual([]);
    expect(url.searchParams.getAll("include[]")).toEqual([]);
    expect(url.searchParams.get("grouped")).toBeNull();
    expect(request.init.method).toBe("GET");
    expect(request.init.body).toBeUndefined();
    expect(authorizationHeader(request.init)).toBe("Bearer submission-token");
  });

  it("rejects malformed own submission responses", async () => {
    const cases = [
      [{ workflow_state: "submitted" }],
      [{ assignment_id: 1, attempt: -1 }],
      [{ assignment_id: 1, seconds_late: -1 }],
      [{ assignment_id: 1, score: "10" }],
      [{ assignment_id: 1, grade: "x".repeat(121) }],
      { assignment_id: 1 },
    ];

    for (const body of cases) {
      const client = createClient(createFetch([jsonResponse(body)]));
      await expect(client.listOwnCourseSubmissions("7")).rejects.toMatchObject({
        code: "canvas_invalid_response",
      });
    }
  });

  it("normalizes own course grade summaries from student enrollments only", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 1,
          type: "TeacherEnrollment",
          grades: {
            current_score: 999,
            current_grade: "hidden teacher value",
          },
        },
        {
          id: 2,
          type: "StudentEnrollment",
          enrollment_state: "active",
          grades: {
            current_score: 0,
            current_grade: "",
            final_score: 91.25,
            final_grade: "A-",
            unposted_current_score: 10,
            unposted_current_grade: "private",
            unposted_final_score: 20,
            unposted_final_grade: "private",
            html_url: "https://canvas.test/private-grades",
          },
          user_id: 123,
          user: { id: 123, name: "Private User" },
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(client.getOwnCourseGradeSummary("7")).resolves.toEqual({
      currentScore: { state: "visible", value: 0 },
      currentGrade: { state: "visible", value: "" },
      finalScore: { state: "visible", value: 91.25 },
      finalGrade: { state: "visible", value: "A-" },
    });

    const request = lastRequest(fetchImpl);
    const url = new URL(request.url);
    expect(url.pathname).toBe("/api/v1/courses/7/enrollments");
    expect(url.searchParams.get("user_id")).toBe("self");
    expect(url.searchParams.getAll("type[]")).toEqual(["StudentEnrollment"]);
    expect(url.searchParams.getAll("include[]")).toEqual([]);
    expect(request.init.method).toBe("GET");
    expect(request.init.body).toBeUndefined();
  });

  it("distinguishes hidden, null, and unavailable course grade summaries", async () => {
    await expect(
      createClient(
        createFetch([
          jsonResponse([
            {
              id: 2,
              type: "StudentEnrollment",
              grades: {
                current_score: null,
                current_grade: null,
              },
            },
          ]),
        ]),
      ).getOwnCourseGradeSummary("7"),
    ).resolves.toEqual({
      currentScore: { state: "unavailable", value: null },
      currentGrade: { state: "unavailable", value: null },
      finalScore: { state: "hidden", value: null },
      finalGrade: { state: "hidden", value: null },
    });

    await expect(
      createClient(
        createFetch([jsonResponse([{ id: 2, type: "StudentEnrollment" }])]),
      ).getOwnCourseGradeSummary("7"),
    ).resolves.toEqual({
      currentScore: { state: "unavailable", value: null },
      currentGrade: { state: "unavailable", value: null },
      finalScore: { state: "unavailable", value: null },
      finalGrade: { state: "unavailable", value: null },
    });

    await expect(
      createClient(
        createFetch([jsonResponse([{ id: 3, type: "ObserverEnrollment" }])]),
      ).getOwnCourseGradeSummary("7"),
    ).resolves.toEqual({
      currentScore: { state: "unavailable", value: null },
      currentGrade: { state: "unavailable", value: null },
      finalScore: { state: "unavailable", value: null },
      finalGrade: { state: "unavailable", value: null },
    });
  });

  it("rejects malformed course grade objects", async () => {
    const client = createClient(
      createFetch([
        jsonResponse([
          {
            id: 2,
            type: "StudentEnrollment",
            grades: { current_score: "95" },
          },
        ]),
      ]),
    );

    await expect(client.getOwnCourseGradeSummary("7")).rejects.toMatchObject({
      code: "canvas_invalid_response",
    });
  });

  it("keeps Phase 5E methods GET-only and does not add mutation helpers", async () => {
    for (const methodName of [
      "submitAssignment",
      "uploadSubmission",
      "gradeSubmission",
      "commentOnSubmission",
      "excuseSubmission",
      "updateLatePolicy",
      "listStudentSubmissions",
    ]) {
      expect(
        Object.prototype.hasOwnProperty.call(CanvasClient.prototype, methodName),
      ).toBe(false);
    }

    const fetchImpl = createFetch([
      jsonResponse([{ id: 1, name: "One" }]),
      jsonResponse([{ assignment_id: 1 }]),
      jsonResponse([]),
    ]);
    const client = createClient(fetchImpl);

    await client.listCourseAssignments("7");
    await client.listOwnCourseSubmissions("7");
    await client.getOwnCourseGradeSummary("7");

    for (const call of fetchImpl.mock.calls) {
      const init = call[1] as RequestInit;
      const url = new URL(String(call[0]));
      expect(init.method).toBe("GET");
      expect(init.body).toBeUndefined();
      expect(url.searchParams.getAll("include[]")).toEqual([]);
      expect(url.searchParams.getAll("student_ids[]")).toEqual([]);
    }
  });

  it.each([
    [401, "canvas_unauthorized"],
    [403, "canvas_forbidden"],
    [404, "canvas_not_found"],
    [429, "canvas_rate_limited"],
    [400, "canvas_request_failed"],
    [503, "canvas_unavailable"],
  ] as const)("maps Phase 5E HTTP %s safely", async (status, code) => {
    const fetchImpl = createFetch([
      new Response(JSON.stringify({ raw: "secret-token private grade" }), {
        status,
        headers: status === 429 ? { "retry-after": "2" } : {},
      }),
    ]);
    const client = createClient(fetchImpl, "secret-token");

    const error = await client
      .listOwnCourseSubmissions("7")
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code });
    expect(String((error as Error).message)).not.toMatch(/secret-token|private grade/);
  });

  it("handles Phase 5E malformed JSON, timeout, redirects, and bad links safely", async () => {
    await expect(
      createClient(createFetch([new Response("{nope", { status: 200 })]))
        .listOwnCourseSubmissions("7"),
    ).rejects.toMatchObject({ code: "canvas_malformed_json" });

    const timeoutFetch = vi.fn(
      (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("aborted secret-token", "AbortError"));
          });
        }),
    ) as FetchMock;
    const timedOut = new CanvasClient({
      allowHttpForTesting: true,
      baseUrl: "https://canvas.test",
      fetchImpl: timeoutFetch,
      personalAccessToken: "secret-token",
      timeoutMs: 1,
    });
    await expect(timedOut.listOwnCourseSubmissions("7")).rejects.toMatchObject({
      code: "canvas_timeout",
    });

    await expect(
      createClient(
        createRedirectFetch(
          "https://canvas.test/api/v1/courses/7/students/submissions?per_page=50",
          "https://canvas.test/login",
        ),
      ).listOwnCourseSubmissions("7"),
    ).rejects.toMatchObject({ code: "canvas_redirect_rejected" });

    await expect(
      createClient(
        createFetch([
          jsonResponse([{ assignment_id: 1 }], {
            link: '<notaurl>; rel="next"',
          }),
        ]),
      ).listOwnCourseSubmissions("7"),
    ).rejects.toMatchObject({ code: "canvas_pagination_rejected" });
  });

  it("lists planner items with repeated course context codes and deterministic dates", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          context_type: "Course",
          course_id: 7,
          planner_override: {
            id: 99,
            plannable_type: "Assignment",
            plannable_id: 50,
            workflow_state: "active",
            marked_complete: true,
            dismissed: false,
          },
          submissions: {
            excused: false,
            graded: false,
            late: true,
            missing: true,
            needs_grading: false,
            with_feedback: false,
          },
          plannable_id: "50",
          plannable_type: "assignment",
          plannable: {
            title: "Private Assignment Title",
            due_at: "2026-07-20T00:00:00.000Z",
            workflow_state: "published",
          },
          html_url: "/courses/7/assignments/50",
        },
      ], {
        link: '<https://canvas.test/api/v1/planner/items?page=2>; rel="next"',
      }),
      jsonResponse([
        {
          planner_override: null,
          submissions: false,
          plannable_id: "note-1",
          plannable_type: "planner_note",
          plannable: {
            title: "Private Note Title",
            todo_date: "2026-07-21T00:00:00.000Z",
            course_id: null,
            workflow_state: "active",
          },
          html_url: "/api/v1/planner_notes/note-1",
        },
      ]),
    ]);
    const client = createClient(fetchImpl);

    await expect(
      client.listPlannerItems({
        contextCodes: ["course_7", "course_8"],
        endDate: "2026-11-03T12:00:00.000Z",
        startDate: "2026-06-06T12:00:00.000Z",
      }),
    ).resolves.toEqual([
      {
        contextType: "Course",
        contextCode: "course_7",
        courseId: "7",
        plannableId: "50",
        plannableType: "assignment",
        title: "Private Assignment Title",
        plannerDate: "2026-07-20T00:00:00.000Z",
        dueAt: "2026-07-20T00:00:00.000Z",
        todoDate: null,
        htmlUrl: "/courses/7/assignments/50",
        workflowState: "published",
        plannerOverride: {
          id: "99",
          plannableType: "Assignment",
          plannableId: "50",
          workflowState: "active",
          markedComplete: true,
          dismissed: false,
          deletedAt: null,
          createdAt: null,
          updatedAt: null,
        },
        submission: {
          excused: false,
          graded: false,
          late: true,
          missing: true,
          needsGrading: false,
          withFeedback: false,
        },
      },
      {
        contextType: null,
        contextCode: null,
        courseId: null,
        plannableId: "note-1",
        plannableType: "planner_note",
        title: "Private Note Title",
        plannerDate: "2026-07-21T00:00:00.000Z",
        dueAt: null,
        todoDate: "2026-07-21T00:00:00.000Z",
        htmlUrl: "/api/v1/planner_notes/note-1",
        workflowState: "active",
        plannerOverride: null,
        submission: null,
      },
    ]);

    const firstUrl = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(firstUrl.pathname).toBe("/api/v1/planner/items");
    expect(firstUrl.searchParams.get("start_date")).toBe(
      "2026-06-06T12:00:00.000Z",
    );
    expect(firstUrl.searchParams.get("end_date")).toBe(
      "2026-11-03T12:00:00.000Z",
    );
    expect(firstUrl.searchParams.getAll("context_codes[]")).toEqual([
      "course_7",
      "course_8",
    ]);
  });

  it("lists announcements one course at a time", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 1,
          title: "Private Announcement Title",
          message: "<p>Private announcement body.</p>",
          posted_at: "2026-07-01T00:00:00Z",
          delayed_post_at: null,
          lock_at: "2026-08-01T00:00:00Z",
          workflow_state: "active",
          published: true,
          locked: false,
          html_url: "https://canvas.test/courses/7/discussion_topics/1",
          context_code: "course_7",
        },
      ], {
        link: '<https://canvas.test/api/v1/announcements?page=2>; rel="next"',
      }),
      jsonResponse([]),
    ]);
    const client = createClient(fetchImpl);

    await expect(
      client.listAnnouncements({
        courseId: "7",
        endDate: "2026-11-03T12:00:00.000Z",
        startDate: "2026-06-06T12:00:00.000Z",
      }),
    ).resolves.toEqual([
      {
        id: "1",
        contextCode: "course_7",
        title: "Private Announcement Title",
        message: "<p>Private announcement body.</p>",
        postedAt: "2026-07-01T00:00:00Z",
        delayedPostAt: null,
        lockAt: "2026-08-01T00:00:00Z",
        todoDate: null,
        workflowState: "active",
        published: true,
        locked: false,
        htmlUrl: "https://canvas.test/courses/7/discussion_topics/1",
      },
    ]);

    const firstUrl = new URL(String(fetchImpl.mock.calls[0]?.[0]));
    expect(firstUrl.pathname).toBe("/api/v1/announcements");
    expect(firstUrl.searchParams.getAll("context_codes[]")).toEqual([
      "course_7",
    ]);
  });

  it("lists and reads course file metadata without exposing download bodies", async () => {
    const fetchImpl = createFetch([
      jsonResponse([
        {
          id: 10,
          display_name: "Lecture Notes.pdf",
          filename: "lecture-notes.pdf",
          "content-type": "application/pdf",
          size: 1024,
          folder_id: 2,
          url: "https://canvas.test/files/10/download",
          hidden_for_user: false,
        },
      ]),
      jsonResponse({
        id: 10,
        display_name: "Lecture Notes.pdf",
        filename: "lecture-notes.pdf",
        content_type: "application/pdf",
        size: 1024,
        folder_id: 2,
        url: "https://canvas.test/files/10/download",
        hidden_for_user: false,
      }),
    ]);
    const client = createClient(fetchImpl, "file-token");

    await expect(client.listCourseFiles("course/7")).resolves.toEqual([
      {
        id: "10",
        folderId: "2",
        displayName: "Lecture Notes.pdf",
        filename: "lecture-notes.pdf",
        contentType: "application/pdf",
        size: 1024,
        createdAt: null,
        updatedAt: null,
        modifiedAt: null,
        lockAt: null,
        unlockAt: null,
        locked: null,
        hidden: null,
        hiddenForUser: false,
        visibilityLevel: null,
        mediaClass: null,
        mediaEntryId: null,
        downloadUrl: "https://canvas.test/files/10/download",
      },
    ]);
    await expect(client.getCourseFile("course/7", "10")).resolves.toMatchObject({
      id: "10",
      contentType: "application/pdf",
      downloadUrl: "https://canvas.test/files/10/download",
    });

    expect(fetchImpl.mock.calls[0]?.[0]).toBe(
      "https://canvas.test/api/v1/courses/course%2F7/files?per_page=50",
    );
    expect(fetchImpl.mock.calls[1]?.[0]).toBe(
      "https://canvas.test/api/v1/courses/course%2F7/files/10",
    );
    expect(fetchImpl.mock.calls[0]?.[1]).toMatchObject({
      headers: { Authorization: "Bearer file-token" },
    });
  });

  it("downloads same-origin Canvas files with bounded binary reads", async () => {
    const fetchImpl = createFetch([
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
        headers: {
          "content-length": "5",
          "content-type": "application/pdf",
        },
      }),
    ]);
    const client = createClient(fetchImpl, "download-token");

    await expect(
      client.downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      }),
    ).resolves.toMatchObject({
      byteLength: 5,
      contentType: "application/pdf",
    });

    const request = lastRequest(fetchImpl);
    expect(request.url).toBe("https://canvas.test/files/10/download");
    expect(request.init.redirect).toBe("manual");
    expect(authorizationHeader(request.init)).toBe("Bearer download-token");
  });

  it("strips bearer auth when following HTTPS file redirects off Canvas", async () => {
    const fetchImpl = vi.fn(
      async (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        if (String(url) === "https://canvas.test/files/10/download") {
          expect(authorizationHeader(init)).toBe("Bearer secret-token");
          return new Response(null, {
            status: 302,
            headers: {
              location: "https://canvas-files.example.test/signed/file.pdf",
            },
          });
        }
        expect(String(url)).toBe(
          "https://canvas-files.example.test/signed/file.pdf",
        );
        expect(authorizationHeader(init)).toBeNull();
        return new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), {
          headers: { "content-type": "application/pdf" },
        });
      },
    ) as FetchMock;
    const client = createClient(fetchImpl, "secret-token");

    await expect(
      client.downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      }),
    ).resolves.toMatchObject({ byteLength: 5 });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("rejects file redirects whose hostname resolves to a private address", async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      return new Response(null, {
        status: 302,
        headers: {
          location: "https://canvas-files.example.test/signed/file.pdf",
        },
      });
    }) as FetchMock;
    const resolveHostname = vi.fn(async (hostname: string): Promise<readonly string[]> => {
      if (hostname === "canvas-files.example.test") {
        return ["10.0.0.8"];
      }
      return ["203.0.113.10"];
    });
    const client = createClient(
      fetchImpl,
      "secret-token",
      10,
      resolveHostname,
    );

    await expect(
      client.downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_redirect_rejected" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(resolveHostname).toHaveBeenCalledWith("canvas-files.example.test");
  });

  it("rejects unsafe file redirects and over-limit bodies", async () => {
    const redirectFetch = vi.fn(async (): Promise<Response> => {
      return new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/internal.pdf" },
      });
    }) as FetchMock;
    const redirectClient = createClient(redirectFetch);

    await expect(
      redirectClient.downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_redirect_rejected" });
    expect(redirectFetch).toHaveBeenCalledTimes(1);

    const largeFetch = createFetch([
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-length": "3" },
      }),
    ]);
    const largeClient = createClient(largeFetch);

    await expect(
      largeClient.downloadFile(fileFixture(), {
        maxBytes: 2,
        maxRedirects: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_too_large" });
  });

  it.each([
    "http://canvas-files.example.test/signed/file.pdf",
    "https://user:pass@canvas-files.example.test/signed/file.pdf",
    "https://192.168.1.10/internal.pdf",
    "https://169.254.1.10/internal.pdf",
    "https://[::1]/internal.pdf",
    "https://[fe80::1]/internal.pdf",
    "https://[fd00::1]/internal.pdf",
  ])("rejects unsafe file redirect target %s without retrying it", async (location) => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      return new Response(null, {
        status: 302,
        headers: { location },
      });
    }) as FetchMock;
    const client = createClient(fetchImpl, "secret-token");

    const error = await client
      .downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "canvas_file_redirect_rejected" });
    expect(String((error as Error).message)).not.toMatch(/secret-token/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects file redirect loops before refetching the same target", async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      return new Response(null, {
        status: 302,
        headers: { location: "https://canvas.test/files/10/download" },
      });
    }) as FetchMock;
    const client = createClient(fetchImpl);

    await expect(
      client.downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 2,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_redirect_rejected" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("bounds streaming bodies when content-length is missing or understated", async () => {
    const missingLength = createFetch([
      streamResponse([[1, 2], [3]]),
    ]);
    const missingLengthClient = createClient(missingLength);

    await expect(
      missingLengthClient.downloadFile(fileFixture(), {
        maxBytes: 2,
        maxRedirects: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_too_large" });

    const understatedLength = createFetch([
      streamResponse([[1, 2], [3]], { "content-length": "2" }),
    ]);
    const understatedLengthClient = createClient(understatedLength);

    await expect(
      understatedLengthClient.downloadFile(fileFixture(), {
        maxBytes: 2,
        maxRedirects: 0,
        timeoutMs: 1000,
      }),
    ).rejects.toMatchObject({ code: "canvas_file_too_large" });
  });

  it("aborts stalled file body reads without exposing private error details", async () => {
    const fetchImpl = vi.fn(
      async (_url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        return new Response(new ReadableStream<Uint8Array>({
          start(controller) {
            init?.signal?.addEventListener("abort", () => {
              controller.error(
                new DOMException("aborted secret-token", "AbortError"),
              );
            });
          },
        }));
      },
    ) as FetchMock;
    const client = createClient(fetchImpl, "secret-token");

    const error = await client
      .downloadFile(fileFixture(), {
        maxBytes: 10,
        maxRedirects: 0,
        timeoutMs: 1,
      })
      .catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: "canvas_file_download_timeout" });
    expect(String((error as Error).message)).not.toMatch(/secret-token/);
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
    [404, "canvas_not_found"],
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

  it("captures retry-after metadata without exposing response bodies", async () => {
    const fetchImpl = createFetch([
      new Response(JSON.stringify({ raw: "private-body" }), {
        status: 429,
        headers: { "retry-after": "2" },
      }),
    ]);
    const client = createClient(fetchImpl, "secret-token");

    await expect(client.getCurrentUser()).rejects.toMatchObject({
      code: "canvas_rate_limited",
      retryAfterMs: 2000,
      status: 429,
    });
    await expect(client.getCurrentUser()).rejects.not.toThrow(/private-body/);
  });

  it("classifies network failures separately from HTTP failures", async () => {
    const fetchImpl = vi.fn(async (): Promise<Response> => {
      throw new TypeError("network dropped secret-token");
    }) as FetchMock;
    const client = createClient(fetchImpl, "secret-token");

    await expect(client.getCurrentUser()).rejects.toMatchObject({
      code: "canvas_network_error",
      status: null,
    });
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
  resolveHostname?: CanvasHostnameResolver,
): CanvasClient {
  return new CanvasClient({
    allowHttpForTesting: true,
    baseUrl: "https://canvas.test/api/v1",
    fetchImpl,
    maxPages,
    personalAccessToken: token,
    resolveHostname,
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

function streamResponse(
  chunks: readonly (readonly number[])[],
  headers: Record<string, string> = {},
): Response {
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(new Uint8Array(chunk));
      }
      controller.close();
    },
  }), {
    headers,
  });
}

function fileFixture(overrides: Partial<CanvasFile> = {}): CanvasFile {
  return {
    id: "10",
    folderId: "2",
    displayName: "Lecture Notes.pdf",
    filename: "lecture-notes.pdf",
    contentType: "application/pdf",
    size: 5,
    createdAt: null,
    updatedAt: null,
    modifiedAt: null,
    lockAt: null,
    unlockAt: null,
    locked: false,
    hidden: false,
    hiddenForUser: false,
    visibilityLevel: null,
    mediaClass: null,
    mediaEntryId: null,
    downloadUrl: "https://canvas.test/files/10/download",
    ...overrides,
  };
}

function authorizationHeader(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get("authorization");
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
