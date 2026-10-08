// Fictional localhost boundary fixture for browser acceptance only.
// Production application modules never import this file.
export const ids = {
  course: "22222222-2222-4222-8222-222222222222",
  reviewer: "33333333-3333-4333-8333-333333333333",
  quiz: "44444444-4444-4444-8444-444444444444",
  job: "55555555-5555-4555-8555-555555555555",
  material: "file:66666666-6666-4666-8666-666666666666",
  draft: "77777777-7777-4777-8777-777777777777",
};
export function createFixture() {
  const course = { id: ids.course, code: "TEST101", name: "Study foundations" };
  const capability = { status: "available" };
  const material = {
    id: ids.material,
    courseId: ids.course,
    title: "Planning your study",
    kind: "slides",
    readiness: "ready",
    count: 3,
    sourceId: ids.material,
    moduleTitle: "Study strategies",
    generation: {
      reviewer: capability,
      quiz: capability,
      activityAssistance: capability,
    },
  };
  const materials = { items: [material], nextOffset: null, totalKnown: 1 };
  const q = (id, type = "single_select") => ({
    id,
    type,
    prompt: `Practice question ${id.slice(1)}`,
    difficulty: "easy",
    selectionInstruction:
      type === "multi_select"
        ? "Select all correct answers."
        : "Choose one answer.",
    options: [
      { id: "o1", text: "Plan your study time" },
      { id: "o2", text: "Review your progress" },
    ],
  });
  const questions = [
    q("q1"),
    {
      id: "q2",
      type: "matching",
      prompt: "Match each study action",
      difficulty: "easy",
      selectionInstruction: "Match each term to one meaning.",
      matchingPairs: [
        { id: "l1", leftItem: "Planning" },
        { id: "l2", leftItem: "Reviewing" },
      ],
      options: [
        { id: "r2", text: "Check understanding" },
        { id: "r1", text: "Set available time" },
      ],
    },
    q("q3", "multi_select"),
    q("q4", "true_false"),
    q("q5"),
  ];
  let attempt = null,
    connection = {
      id: ids.course,
      baseUrl: "https://canvas.example.test",
      canvasUserName: "Alex Student",
      status: "connected",
      lastVerifiedAt: new Date().toISOString(),
    },
    selected = [ids.course],
    sessions = [],
    draft = {
      id: ids.draft,
      activityId: `canvas:${ids.course}`,
      courseId: ids.course,
      type: "reflection",
      title: "Study reflection",
      sections: [
        {
          id: "section-1",
          heading: "Reflection",
          level: 1,
          content: "My study plan",
          order: 1,
          sourceRefs: [],
        },
      ],
      slides: [],
      sources: [],
      warnings: [],
      generationId: ids.job,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      editable: true,
      revision: 1,
      status: "draft",
    };
  const tasks = new Map(),
    admittedJobs = new Map(),
    counts = {
      taskWrites: 0,
      sessionWrites: 0,
      draftWrites: 0,
      quizWrites: 0,
      canvasWrites: 0,
      generationCalls: 0,
      assistCalls: 0,
    };
  const now = () => new Date().toISOString();
  const quiz = () => ({
    id: ids.quiz,
    title: "Study practice",
    courseId: ids.course,
    reviewerArtifactId: ids.reviewer,
    sourceId: ids.material,
    sourceMaterialIds: [ids.material],
    difficulty: "mixed",
    createdAt: now(),
    updatedAt: now(),
    questionCount: 5,
    questions,
    activeAttempt:
      attempt?.status === "in_progress"
        ? {
            id: attempt.id,
            currentQuestion: attempt.currentQuestion,
            answeredCount: attempt.answers.filter((a) => a.finalizedAt).length,
            skippedCount: 0,
            revealedCount: attempt.revealedQuestionIds.length,
          }
        : null,
    attemptCount: attempt ? 1 : 0,
    latestScore: attempt?.status === "completed" ? 100 : null,
    bestScore: attempt?.status === "completed" ? 100 : null,
  });
  const summary = (type, id, title) => ({
    // Saved Reviewers are addressed as `artifact:<id>`, as in production.
    id: type === "reviewer" ? `artifact:${id}` : `${type}:${id}`,
    type: title === "Study reflection" ? "activity_output" : type,
    title,
    course,
    sourceId: ids.material,
    sourceTitle: material.title,
    activityId: null,
    createdAt: now(),
    updatedAt: now(),
    lastOpenedAt: null,
    status: "completed",
    relatedArtifactIds: [],
    ...(type === "quiz" ? { quiz: quiz() } : {}),
  });
  const library = () => [
    summary("reviewer", ids.reviewer, "Planning Reviewer"),
    summary("quiz", ids.quiz, "Study practice"),
    summary("activity", ids.draft, "Study reflection"),
  ];
  const job = {
    id: ids.job,
    jobType: "reviewer_generation",
    status: "succeeded",
    stage: "storing_reviewer",
    progress: {
      completedUnits: 3,
      totalUnits: 3,
      unitLabel: "sections",
      message: "Saved",
    },
    source: {
      displayName: "Planning Reviewer",
      sourceKind: "text",
      mimeType: "text/plain",
    },
    createdAt: now(),
    acceptedAt: now(),
    startedAt: now(),
    updatedAt: now(),
    completedAt: now(),
    failedAt: null,
    cancellationRequestedAt: null,
    errorCode: null,
    safeErrorMessage: null,
    retryable: false,
    attemptCount: 1,
    resultAvailable: true,
    retryOfJobId: null,
    sourceVersionId: null,
    artifactType: "reviewer",
    reuseMode: "fresh",
    reusedFromJobId: null,
    reuseCandidateArtifactVersionId: null,
    provenance: null,
  };
  const result = () => ({
    attemptId: attempt.id,
    quizId: ids.quiz,
    correctCount: attempt.feedback.filter((f) => f.correct).length,
    incorrectCount: attempt.feedback.filter((f) => !f.correct).length,
    skippedCount: 5 - attempt.feedback.length,
    revealedCount: attempt.revealedQuestionIds.length,
    totalQuestions: 5,
    earnedPoints: attempt.feedback.filter((f) => f.correct).length,
    possiblePoints: 5,
    percentage: attempt.feedback.filter((f) => f.correct).length * 20,
    questions: attempt.feedback,
    topicPerformance: [],
    weakAreas: [],
  });
  const taskActivity = (task) => ({
    id: `task:${task.id}`,
    taskId: task.id,
    course: null,
    title: task.title,
    dueAt: task.dueAt,
    status: task.status,
    priority: task.priority,
    estimatedMinutes: task.estimatedMinutes,
    submissionTypes: [],
    source: "local",
    isOverdue: false,
    urgency: "now",
    hasGeneratedDraft: false,
    instructions: task.notes,
    resources: [],
    courseMaterials: null,
    generation: {
      reviewer: capability,
      quiz: capability,
      activityAssistance: capability,
    },
    outputs: [],
  });
  async function handle(req, res, url) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {},
      path = decodeURIComponent(url.pathname),
      method = req.method;
    const send = (data, status = 200, root = false) => {
      res.writeHead(status);
      res.end(
        JSON.stringify(root ? { ok: true, ...data } : { ok: true, data }),
      );
    };
    const fail = (code, status = 409) => {
      res.writeHead(status);
      res.end(
        JSON.stringify({
          ok: false,
          error: { code, message: "PRIVATE_DIAGNOSTIC_MUST_NOT_LEAK" },
        }),
      );
    };
    if (
      method === "POST" &&
      ["/api/experience/generations", "/api/experience/quizzes"].includes(path)
    ) {
      counts.generationCalls++;
      const key = req.headers["idempotency-key"];
      if (!key) return fail("invalid_request", 400);
      if (path.endsWith("generations")) {
        if (!admittedJobs.has("retry-key")) {
          admittedJobs.set("retry-key", key);
          return fail("temporarily_unavailable", 503);
        }
        if (key !== admittedJobs.get("retry-key")) return fail("conflict");
        if (body.courseId !== ids.course || body.materialId !== ids.material)
          return fail("invalid_request", 400);
      } else if (
        body.questionCount !== 10 ||
        body.difficulty !== "medium" ||
        body.sourceIds?.[0] !== ids.material ||
        body.questionTypes?.length !== 2
      )
        return fail("invalid_request", 400);
      const id = crypto.randomUUID();
      admittedJobs.set(id, {
        ...job,
        id,
        status: "running",
        progress: {
          completedUnits: 1,
          totalUnits: 3,
          unitLabel: "sections",
          message: "Preparing",
        },
        jobType: path.endsWith("quizzes")
          ? "quiz_generation"
          : "reviewer_generation",
      });
      send(
        {
          id,
          state: "queued",
          updatedAt: now(),
          progress: { completed: null, total: null, unit: null },
          artifactId: null,
          error: null,
        },
        202,
      );
      return;
    }
    if (
      path.startsWith("/api/jobs/") &&
      admittedJobs.has(path.split("/").at(-1))
    ) {
      send(admittedJobs.get(path.split("/").at(-1)));
      return;
    }
    if (
      path.startsWith("/api/experience/generations/") &&
      admittedJobs.has(path.split("/").at(-1))
    ) {
      const id = path.split("/").at(-1);
      const done = admittedJobs.get(id).status === "succeeded";
      send({
        id,
        state: done ? "completed" : "generating",
        updatedAt: now(),
        progress: { completed: done ? 1 : 0, total: 1, unit: "sections" },
        artifactId: done
          ? admittedJobs.get(id).jobType === "quiz_generation"
            ? `quiz:${ids.quiz}`
            : `artifact:${ids.reviewer}`
          : null,
        error: null,
      });
      return;
    }
    if (path === "/api/today") {
      const items = [...tasks.values()].map((t) => ({
        ...taskActivity(t),
        kind: "personal_task",
        startAt: null,
        endAt: null,
        deepLinkTarget: { surface: "activity", id: `task:${t.id}` },
      }));
      send({
        date: url.searchParams.get("date"),
        utcOffsetMinutes: 480,
        asOf: now(),
        progress: { completed: 0, total: items.length, scheduledMinutes: 0 },
        urgent: items,
        current: null,
        next: items[0] ?? null,
        later: [],
        overdue: [],
        upcomingDeadlines: [],
        timeline: [],
        plannerState: {
          status: "not_planned",
          lastPlannedAt: null,
          needsTaskImport: false,
        },
      });
      return;
    }
    if (path === "/api/tasks" && method === "POST") {
      counts.taskWrites++;
      const id = crypto.randomUUID(),
        task = {
          ...body,
          id,
          status: "pending",
          sourceType: "manual",
          canvasConnectionId: null,
          canvasCourseId: null,
          canvasAssignmentId: null,
          createdAt: now(),
          updatedAt: now(),
          completedAt: null,
        };
      tasks.set(id, task);
      send(task, 201);
      return;
    }
    if (path === "/api/tasks") {
      send({ tasks: [...tasks.values()], nextCursor: null });
      return;
    }
    if (path.startsWith("/api/tasks/")) {
      const id = path.split("/").at(-1),
        task = tasks.get(id);
      if (!task) {
        fail("not_found", 404);
        return;
      }
      if (method === "DELETE") {
        tasks.delete(id);
        counts.taskWrites++;
        send({}, 200, true);
      } else {
        if (method === "PATCH") {
          tasks.set(id, { ...task, ...body, updatedAt: now() });
          counts.taskWrites++;
        }
        send(tasks.get(id));
      }
      return;
    }
    if (path === "/api/experience/activities") {
      send({ items: [...tasks.values()].map(taskActivity) });
      return;
    }
    if (path.startsWith("/api/experience/activities/")) {
      const task = tasks.get(path.split("task:")[1]);
      if (task) send(taskActivity(task));
      else fail("not_found", 404);
      return;
    }
    if (path === "/api/study-sessions") {
      send({ sessions });
      return;
    }
    if (path.startsWith("/api/study-sessions/")) {
      sessions = sessions.map((s) =>
        s.id === path.split("/").at(-1) ? { ...s, ...body } : s,
      );
      counts.sessionWrites++;
      send(sessions[0]);
      return;
    }
    if (path === "/api/experience/study-assist" && method === "POST") {
      counts.assistCalls++;
      send({
        ...body,
        text: `Fictional ${body.assistType.replace("_", " ")} for this passage.`,
        createdAt: now(),
      });
      return;
    }
    if (path === "/api/experience/study-tools" && method === "POST") {
      counts.assistCalls++;
      const asking = body.action === "test" && !body.modifier;
      send({
        action: body.action,
        ...(body.modifier ? { modifier: body.modifier } : {}),
        outcome: asking ? "question" : body.modifier === "check" ? "checked" : "answer",
        grounding: "source",
        text: asking ? "" : `Fictional ${body.action} result for “${body.selection}”.`,
        ...(asking ? { question: "What should you plan before a deadline?" } : {}),
        ...(body.modifier === "choices"
          ? { choices: ["Study time", "A vacation"], question: body.question }
          : {}),
        ...(body.modifier === "check" ? { verdict: "correct" } : {}),
        createdAt: now(),
      });
      return;
    }
    if (path === "/api/experience/capabilities") {
      send({
        reviewerGeneration: capability,
        quizGeneration: capability,
        activityMaker: capability,
        planner: capability,
        calendar: capability,
      });
      return;
    }
    if (path === "/api/experience/announcements") {
      send({
        items: [
          {
            id: "announcement-1",
            course,
            title: "Week 3 reading is posted",
            body: "Read the planning chapter before Friday.",
            preview: "Read the planning chapter before Friday.",
            postedAt: now(),
            authorName: "Course instructor",
            htmlUrl: null,
            attachments: [],
            links: [],
          },
        ],
        nextOffset: null,
      });
      return;
    }
    if (
      path.startsWith("/api/study-plan/") ||
      path.startsWith("/api/experience/planner/")
    ) {
      const task = [...tasks.values()].find((t) => t.status === "pending"),
        plan = {
          algorithmVersion: "deterministic-v1",
          planningRange: body.planningRange,
          availability: body.availability,
          sessions: task
            ? [
                {
                  proposalId: "proposal-1",
                  taskId: task.id,
                  taskTitle: task.title,
                  startsAt:
                    body.availability?.[0]?.startsAt ?? body.planningRange.startsAt,
                  endsAt: new Date(
                    Date.parse(
                      body.availability?.[0]?.startsAt ?? body.planningRange.startsAt,
                    ) + 30 * 60000,
                  ).toISOString(),
                  durationMinutes: 30,
                  scheduledAfterDeadline: false,
                },
              ]
            : [],
          unscheduledWork: [],
        };
      if (path.endsWith("apply") || path.endsWith("replan")) {
        sessions = plan.sessions.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
          studyPlanId: ids.course,
          task: task
            ? {
                id: task.id,
                title: task.title,
                status: task.status,
                priority: task.priority,
                dueAt: task.dueAt,
                canvasCourseId: null,
              }
            : null,
          status: "planned",
          createdAt: now(),
          updatedAt: now(),
        }));
        counts.sessionWrites++;
        send({ studyPlanId: ids.course, ...plan, sessions }, 201);
      } else send(plan);
      return;
    }
    if (path === "/api/experience/courses") {
      send({
        items: [
          {
            ...course,
            status: "active",
            materialCount: 1,
            reviewerCount: 1,
            lastActivityAt: null,
          },
        ],
      });
      return;
    }
    if (path.startsWith("/api/experience/courses/")) {
      send(
        path.endsWith("materials")
          ? materials
          : {
              course,
              materials,
              capabilities: {
                reviewerGeneration: capability,
                quizGeneration: capability,
                activityMaker: capability,
                planner: capability,
                calendar: capability,
              },
            },
      );
      return;
    }
    if (path === "/api/experience/library") {
      send({
        items: library().filter(
          (i) =>
            !url.searchParams.get("type") ||
            url.searchParams.get("type") === "all" ||
            i.type === url.searchParams.get("type"),
        ),
        categories: {
          reviewer: capability,
          quiz: capability,
          activity_output: capability,
        },
        nextOffset: null,
      });
      return;
    }
    if (path.startsWith("/api/experience/library/")) {
      const item = library().find((i) => i.id === path.split("/").at(-1));
      if (!item) {
        fail("not_found", 404);
        return;
      }
      send(
        item.type === "reviewer"
          ? {
              artifact: item,
              reviewer: {
                id: item.id,
                title: item.title,
                course,
                source: { id: ids.material, title: material.title },
                generatedAt: now(),
                freshness: "current",
                sections: [
                  {
                    id: "s1",
                    title: "Planning study time",
                    blocks: [
                      {
                        id: "b1",
                        title: "Create available time",
                        explanation:
                          "Choose a time to study, then review your understanding.",
                        keyPoints: [
                          "Start with your pending tasks.",
                          "Plan time before a deadline.",
                        ],
                        evidence: [],
                      },
                    ],
                  },
                ],
              },
            }
          : item.type === "quiz"
            ? { artifact: item, quiz: quiz() }
            : { artifact: item, draft },
      );
      return;
    }
    if (path.startsWith("/api/experience/activity-drafts/")) {
      if (body.revision !== draft.revision) {
        fail("activity_draft_conflict");
        return;
      }
      draft = { ...draft, ...body.content, revision: draft.revision + 1 };
      counts.draftWrites++;
      send(draft);
      return;
    }
    if (path === `/api/experience/quizzes/${ids.quiz}`) {
      send(quiz());
      return;
    }
    if (path === `/api/experience/quizzes/${ids.quiz}/attempts`) {
      if (method === "POST") {
        attempt = {
          id: "88888888-8888-4888-8888-888888888888",
          quizId: ids.quiz,
          startedAt: now(),
          completedAt: null,
          status: "in_progress",
          currentQuestion: 0,
          skippedQuestionIds: [],
          revealedQuestionIds: [],
          assistedQuestionIds: [],
          updatedAt: now(),
          answers: [],
          feedback: [],
        };
        counts.quizWrites++;
        send(attempt, 201);
      } else
        send(
          attempt
            ? [
                {
                  id: attempt.id,
                  quizId: ids.quiz,
                  startedAt: attempt.startedAt,
                  completedAt: attempt.completedAt,
                  status: attempt.status,
                  percentage:
                    attempt.status === "completed" ? result().percentage : null,
                },
              ]
            : [],
        );
      return;
    }
    if (path.startsWith("/api/experience/quiz-attempts/")) {
      if (!attempt) {
        fail("not_found", 404);
        return;
      }
      if (path.includes("/answers/")) {
        const qid = path.split("/").at(-1);
        attempt.answers = attempt.answers.filter((a) => a.questionId !== qid);
        const answer = {
          questionId: qid,
          selectedOptionIds: body.selectedOptionIds ?? [],
          finalizedAt: body.finalize ? now() : null,
        };
        attempt.answers.push(answer);
        counts.quizWrites++;
        if (body.finalize) {
          const correct =
            qid === "q2"
              ? ["l1:r1", "l2:r2"].every((v) =>
                  body.selectedOptionIds?.includes(v),
                )
              : qid === "q3"
                ? body.selectedOptionIds?.length === 2
                : body.selectedOptionIds?.[0] === (qid === "q5" ? "o2" : "o1");
          attempt.feedback.push({
            ...answer,
            correct,
            explanation: "Planning and review support your learning.",
            topicId: "topic-1",
            topic: "Study strategies",
            sourceRefs: [],
            reviewerSectionIds: [],
            correctOptionIds:
              qid === "q2"
                ? ["l1:r1", "l2:r2"]
                : qid === "q3"
                  ? ["o1", "o2"]
                  : [qid === "q5" ? "o2" : "o1"],
            ...(qid === "q2" ? { pairCount: 2, pairCorrectCount: correct ? 2 : 0 } : {}),
          });
        }
        send(attempt);
        return;
      }
      if (path.endsWith("/study-state")) {
        if (body.action === "reveal" && body.questionId) {
          attempt.revealedQuestionIds = [
            ...new Set([...attempt.revealedQuestionIds, body.questionId]),
          ];
          attempt.assistedQuestionIds = attempt.revealedQuestionIds;
        }
        if (Number.isInteger(body.position)) attempt.currentQuestion = body.position;
        attempt.updatedAt = now();
        counts.quizWrites++;
        send(attempt);
        return;
      }
      if (path.endsWith("/complete")) {
        attempt.status = "completed";
        attempt.completedAt = now();
        send(result());
        return;
      }
      if (path.endsWith("/result")) {
        if (attempt.status !== "completed") {
          fail("quiz_result_unavailable");
          return;
        }
        send(result());
        return;
      }
      send(attempt);
      return;
    }
    if (path === "/api/jobs") {
      send({ jobs: [job], nextCursor: null });
      return;
    }
    if (path === `/api/jobs/${ids.job}`) {
      send(job);
      return;
    }
    if (path === `/api/experience/generations/${ids.job}`) {
      send({
        id: ids.job,
        state: "completed",
        updatedAt: now(),
        progress: { completed: 3, total: 3, unit: "sections" },
        artifactId: `artifact:${ids.reviewer}`,
        error: null,
      });
      return;
    }
    if (path === "/api/canvas/connection") {
      if (method === "DELETE") {
        connection = null;
        counts.canvasWrites++;
      }
      if (method === "PUT") {
        connection = {
          id: ids.course,
          baseUrl: body.baseUrl,
          canvasUserName: "Alex Student",
          status: "connected",
          lastVerifiedAt: now(),
        };
        counts.canvasWrites++;
      }
      send({ connection }, 200, true);
      return;
    }
    if (path === "/api/canvas/courses") {
      send(
        {
          courses: [
            {
              ...course,
              displayName: course.name,
              courseCode: course.code,
              selected: selected.includes(ids.course),
              selectable: true,
              classification: "likely_current",
              lastSync: null,
              syncHealth: { overallHealth: "healthy" },
            },
          ],
          selectedCourseIds: selected,
        },
        200,
        true,
      );
      return;
    }
    if (path === "/api/canvas/course-preferences") {
      selected = body.selectedCourseIds;
      counts.canvasWrites++;
      send({ selectedCourseIds: selected }, 200, true);
      return;
    }
    if (path === "/api/canvas/sync") {
      counts.canvasWrites++;
      send({}, 200, true);
      return;
    }
    if (
      path === `/api/canvas/courses/${ids.course}/sync` ||
      path.startsWith("/api/canvas/sync-jobs/")
    ) {
      if (method === "POST") counts.canvasWrites++;
      send({
        id: ids.job,
        status: "succeeded",
        course: { displayName: course.name },
        progress: { completedUnits: 1, totalUnits: 1 },
      });
      return;
    }
    if (
      method === "POST" &&
      (path.includes("generations") || path.includes("quizzes"))
    ) {
      counts.generationCalls++;
      fail("unavailable", 503);
      return;
    }
    fail("not_found", 404);
  }
  return {
    handle,
    counts,
    finishAdmitted: () => {
      for (const [id, job] of admittedJobs) {
        if (typeof job === "object")
          admittedJobs.set(id, { ...job, status: "succeeded" });
      }
    },
  };
}
