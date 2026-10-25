import { beforeEach, describe, expect, it, vi } from "vitest";

// TP1 end to end: real routes, service, shared planner and repository over a
// stateful in-memory Supabase stand-in holding synthetic owned data. The
// stand-in mirrors apply_study_plan_v1/v2 semantics, which the PGlite contract
// proves against the real SQL. No network, no provider and no remote database.

type Row = Record<string, unknown>;
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/auth", () => ({ verifyBearerToken: mocks.auth }));
vi.mock("@/lib/canvas-db", () => ({ createCanvasServiceClient: mocks.client }));
vi.mock("@/providers", () => ({ createServerOpenAIProvider: () => { throw new Error("no provider in tests"); } }));
vi.mock("@/lib/task-estimates", () => ({ refreshCanvasTaskEstimates: vi.fn(async () => {}), TASK_ESTIMATE_TIMEOUT_MS: 15_000 }));

const experience = await import("@/../app/api/experience/[...path]/route");
const today = await import("@/../app/api/today/route");
const sessionsRoute = await import("@/../app/api/study-sessions/route");
const sessionRoute = await import("@/../app/api/study-sessions/[sessionId]/route");
const preferences = await import("@/../app/api/profile/planner-preferences/route");

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const T1 = uuid(1), T2 = uuid(2), T3 = uuid(3), TB = uuid(4);
const R1 = uuid(11), R2 = uuid(12), R3 = uuid(13), R4 = uuid(14), R5 = uuid(15), R6 = uuid(16), RB = uuid(17), QUIZ = uuid(18);
const C1 = uuid(21), C2 = uuid(22), CB = uuid(23);

const day = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
const at = (time: string) => `${day}T${time}:00.000Z`;
const range = { startsAt: at("00:00"), endsAt: new Date(Date.parse(at("00:00")) + 86_400_000).toISOString() };
const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();

let tables: Record<string, Row[]>;
let sequence = 1000;
let queries = 0;

function seed() {
  const task = (id: string, user: string, title: string, minutes: number, status = "pending", created = "2026-10-01T00:00:00.000Z") => ({
    id, user_id: user, title, notes: null, status, priority: "medium", due_at: null, estimated_minutes: minutes,
    estimate_source: "user", estimate_note: null, source_type: "manual", canvas_connection_id: null, canvas_course_id: null,
    canvas_assignment_id: null, canvas_assignment_row_id: null, created_at: created, updated_at: created,
    completed_at: status === "completed" ? created : null,
  });
  const course = (id: string, user: string, code: string, past = false) => ({
    id, user_id: user, canvas_connection_id: uuid(99), canvas_course_id: code, name: `${code} course`, course_code: code,
    workflow_state: past ? "completed" : "available", end_at: null, term_end_at: null, concluded: false, enrollment_states: [],
    course_state_override: null,
  });
  const library = (id: string, user: string, title: string, courseId: string | null, minutes: number | null, created: string, extra: Row = {}) => ({
    id: `artifact:${id}`, user_id: user, artifact_type: "reviewer", course_id: courseId, updated_at: created, superseded: false,
    summary: { id: `artifact:${id}`, type: "reviewer", title, createdAt: created, updatedAt: created, reviewMinutes: minutes,
      course: courseId ? { id: courseId, code: courseId === C1 ? "BIO101" : "OLD200", name: "Course" } : null },
    ...extra,
  });
  const artifact = (id: string, user: string, type = "reviewer") => ({ id, user_id: user, artifact_type: type, latest_version_id: id, deleted_at: null, safe_title: "x" });
  tables = {
    tasks: [task(T1, A, "Essay draft", 60), task(T2, A, "Lab report", 120, "pending", "2026-10-02T00:00:00.000Z"),
      task(T3, A, "Finished quiz", 30, "completed"), task(TB, B, "Other owner task", 30)],
    canvas_courses: [course(C1, A, "BIO101"), course(C2, A, "OLD200", true), course(CB, B, "CHEM")],
    experience_library_v1: [
      library(R1, A, "Cell biology reviewer", C1, 30, "2026-10-01T00:00:00.000Z"),
      library(R2, A, "Genetics reviewer", C1, null, "2026-10-05T00:00:00.000Z"),
      library(R3, A, "Recently opened reviewer", C1, 90, "2026-10-03T00:00:00.000Z"),
      library(R4, A, "Past course reviewer", C2, 20, "2026-10-04T00:00:00.000Z"),
      library(R5, A, "Uploaded notes reviewer", null, 20, "2026-10-06T00:00:00.000Z"),
      library(R6, A, "Superseded reviewer", C1, 20, "2026-09-01T00:00:00.000Z", { superseded: true }),
      library(RB, B, "Other owner reviewer", CB, 15, "2026-10-01T00:00:00.000Z"),
      { ...library(QUIZ, A, "Quiz", C1, null, "2026-10-01T00:00:00.000Z"), id: `quiz:${QUIZ}`, artifact_type: "quiz" },
    ],
    generated_artifacts: [artifact(R1, A), artifact(R2, A), artifact(R3, A), artifact(R4, A), artifact(R5, A), artifact(R6, A), artifact(RB, B), artifact(QUIZ, A, "quiz")],
    reviewer_opens: [{ user_id: A, artifact_id: R3, last_opened_at: ago(2) }, { user_id: A, artifact_id: R2, last_opened_at: ago(72) }],
    study_sessions: [], study_plans: [], user_profiles: [],
    canvas_assignments: [], canvas_assignment_submissions: [], canvas_course_sync_preferences: [], canvas_announcements: [],
  };
}

function compare(left: unknown, right: unknown): number {
  if (typeof left === "string" && typeof right === "string") {
    const l = Date.parse(left), r = Date.parse(right);
    if (/^\d{4}-\d{2}-\d{2}T/.test(left) && Number.isFinite(l) && Number.isFinite(r)) return l - r;
    return left.localeCompare(right);
  }
  return Number(left) - Number(right);
}

function fakeClient() {
  function from(table: string) {
    queries += 1;
    const filters: ((row: Row) => boolean)[] = [];
    const orders: { column: string; ascending: boolean }[] = [];
    let columns = "*", window: [number, number] | null = null, limit = Infinity;
    let action: { kind: "select" } | { kind: "update"; values: Row } | { kind: "upsert"; values: Row; conflict: string } = { kind: "select" };
    const run = (): { data: unknown; error: unknown } => {
      if (columns.includes("tasks!")) return { data: null, error: { code: "PGRST200", message: "Could not find a relationship" } };
      const rows = tables[table] ??= [];
      if (action.kind === "upsert") {
        const values = action.values, key = action.conflict;
        const existing = rows.find((row) => row[key] === values[key]);
        if (existing) Object.assign(existing, values); else rows.push({ ...values });
        return { data: [{ ...(existing ?? rows.at(-1)!) }], error: null };
      }
      let matched = rows.filter((row) => filters.every((filter) => filter(row)));
      if (action.kind === "update") {
        for (const row of matched) Object.assign(row, action.values, { updated_at: new Date().toISOString() });
      }
      for (const order of [...orders].reverse()) {
        matched = [...matched].sort((l, r) => (order.ascending ? 1 : -1) * compare(l[order.column], r[order.column]));
      }
      if (window) matched = matched.slice(window[0], window[1] + 1);
      return { data: matched.slice(0, limit).map((row) => ({ ...row })), error: null };
    };
    const builder = {
      select(value = "*") { columns = value; return builder; },
      update(values: Row) { action = { kind: "update", values }; return builder; },
      upsert(values: Row, options: { onConflict: string }) { action = { kind: "upsert", values, conflict: options.onConflict }; return builder; },
      eq(column: string, value: unknown) { filters.push((row) => row[column] === value); return builder; },
      neq(column: string, value: unknown) { filters.push((row) => row[column] !== value); return builder; },
      lt(column: string, value: unknown) { filters.push((row) => compare(row[column], value) < 0); return builder; },
      gt(column: string, value: unknown) { filters.push((row) => compare(row[column], value) > 0); return builder; },
      in(column: string, values: readonly unknown[]) { filters.push((row) => values.includes(row[column])); return builder; },
      filter(column: string, _op: string, value: unknown) { filters.push((row) => row[column] === value); return builder; },
      order(column: string, options: { ascending?: boolean } = {}) { orders.push({ column, ascending: options.ascending !== false }); return builder; },
      range(start: number, end: number) { window = [start, end]; return builder; },
      limit(count: number) { limit = count; return builder; },
      maybeSingle() { const result = run(); return Promise.resolve(result.error ? result : { data: (result.data as Row[])[0] ?? null, error: null }); },
      single() { const result = run(); const row = (result.data as Row[] | null)?.[0]; return Promise.resolve(result.error ? result : row ? { data: row, error: null } : { data: null, error: { code: "PGRST116" } }); },
      then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) { return Promise.resolve(run()).then(resolve, reject); },
    };
    return builder;
  }
  return { from, rpc: (name: string, args: Row) => Promise.resolve(mocks.rpc(name, args)) };
}

function applyPlan(name: string, args: Row) {
  const user = args.p_user_id as string, typed = name === "apply_study_plan_v2";
  const start = Date.parse(args.p_planning_starts_at as string), end = Date.parse(args.p_planning_ends_at as string);
  const proposals = args.p_sessions as Row[];
  const fail = (message: string) => ({ data: null, error: { message } });
  for (const proposal of proposals) {
    const kind = typed ? proposal.kind : "task";
    const ok = kind === "task"
      ? tables.tasks!.some((task) => task.id === proposal.task_id && task.user_id === user && task.status === "pending") && !proposal.reviewer_artifact_id
      : kind === "reviewer" && !proposal.task_id && tables.generated_artifacts!.some((artifact) => artifact.id === proposal.reviewer_artifact_id &&
        artifact.user_id === user && artifact.artifact_type === "reviewer" && !artifact.deleted_at && artifact.latest_version_id);
    if (!ok || Date.parse(proposal.starts_at as string) < start || Date.parse(proposal.ends_at as string) > end) return fail("study_plan_session_invalid");
  }
  const reviewerIds = proposals.filter((proposal) => proposal.kind === "reviewer").map((proposal) => proposal.reviewer_artifact_id);
  if (new Set(reviewerIds).size !== reviewerIds.length) return fail("study_plan_reviewer_duplicate");
  tables.study_sessions = tables.study_sessions!.filter((session) => !(session.user_id === user && session.status === "planned" &&
    Date.parse(session.starts_at as string) < end && Date.parse(session.ends_at as string) > start));
  if (tables.study_sessions.some((session) => session.user_id === user && session.reviewer_artifact_id && reviewerIds.includes(session.reviewer_artifact_id) &&
    Date.parse(session.starts_at as string) < end && Date.parse(session.ends_at as string) > start)) return fail("study_plan_reviewer_duplicate");
  const planId = uuid(sequence++);
  tables.study_plans!.push({ id: planId, user_id: user, planning_starts_at: args.p_planning_starts_at, planning_ends_at: args.p_planning_ends_at, created_at: new Date().toISOString() });
  for (const proposal of proposals) {
    const now = new Date().toISOString();
    tables.study_sessions.push({ id: uuid(sequence++), user_id: user, study_plan_id: planId,
      task_id: typed && proposal.kind === "reviewer" ? null : proposal.task_id, block_kind: typed ? proposal.kind : null,
      reviewer_artifact_id: typed && proposal.kind === "reviewer" ? proposal.reviewer_artifact_id : null,
      starts_at: new Date(proposal.starts_at as string).toISOString(), ends_at: new Date(proposal.ends_at as string).toISOString(),
      status: "planned", created_at: now, updated_at: now });
  }
  return { data: [{ study_plan_id: planId, session_count: proposals.length }], error: null };
}

const auth = (user: string) => ({ authorization: `Bearer ${user}`, "content-type": "application/json" });
const post = (path: string, user: string, body?: unknown) => experience.POST(
  new Request(`https://app.example/api/experience/${path}`, { method: "POST", headers: auth(user), body: JSON.stringify(body ?? {}) }),
  { params: Promise.resolve({ path: path.split("/") }) });
const plan = (mode: string | undefined, user = A, availability = [{ startsAt: at("09:00"), endsAt: at("13:00") }]) =>
  ({ planningRange: range, availability, ...(mode === undefined ? {} : { mode }) });
async function data<T = Record<string, unknown>>(response: Response): Promise<T> {
  const body = await response.json() as { data?: T };
  return body.data as T;
}
type Session = { kind?: string; taskId?: string; taskTitle?: string; reviewerId?: string; reviewerTitle?: string; startsAt: string; durationMinutes: number };
type Plan = { sessions: Session[]; mode?: string; candidates?: { tasks: number; reviewers: number }; unscheduledWork: unknown[] };
const titles = (value: Plan) => value.sessions.map((session) => session.reviewerTitle ?? session.taskTitle);
async function readSessions(user: string) {
  const response = await sessionsRoute.GET(new Request(`https://app.example/api/study-sessions?startsAt=${encodeURIComponent(range.startsAt)}&endsAt=${encodeURIComponent(range.endsAt)}&limit=200`, { headers: auth(user) }));
  return (await response.json() as { data: { sessions: Array<Record<string, unknown>> } }).data.sessions;
}
async function readToday(user: string) {
  return data<{ timeline: Array<{ id: string; title: string; status: string; reviewer?: { id: string }; deepLinkTarget: { id: string } }> }>(
    await today.GET(new Request(`https://app.example/api/today?date=${day}&utcOffsetMinutes=0`, { headers: auth(user) })));
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
  queries = 0;
  mocks.auth.mockImplementation(async (request: Request) => {
    const token = request.headers.get("authorization")?.replace("Bearer ", "");
    return token === A || token === B ? { id: token } : null;
  });
  mocks.client.mockImplementation(fakeClient);
  mocks.rpc.mockImplementation((name: string, args: Row) => {
    if (name === 'import_canvas_assignments_as_tasks_v1') {
      const rows = tables.canvas_assignments!.filter(row => row.user_id === args.p_user_id && (args.p_assignment_ids as string[]).includes(row.id as string));
      for (const assignment of rows) if (!tables.tasks!.some(row => row.canvas_assignment_row_id === assignment.id)) tables.tasks!.push({
        ...tables.tasks![0], id: uuid(500 + tables.tasks!.length), title: assignment.name, user_id: args.p_user_id,
        source_type: 'canvas', canvas_assignment_row_id: assignment.id, canvas_assignment_id: assignment.canvas_assignment_id,
        canvas_connection_id: uuid(99), canvas_course_id: 'BIO101', estimated_minutes: 60, due_at: assignment.due_at,
      });
      return { data: tables.tasks!.filter(row => rows.some(assignment => assignment.id === row.canvas_assignment_row_id)), error: null };
    }
    if (name === "apply_study_plan_v1" || name === "apply_study_plan_v2") return applyPlan(name, args);
    if (name === "record_reviewer_open_v1") {
      const owned = tables.generated_artifacts!.some((artifact) => artifact.id === args.p_artifact_id && artifact.user_id === args.p_user_id &&
        artifact.artifact_type === "reviewer" && !artifact.deleted_at);
      if (!owned) return { data: false, error: null };
      tables.reviewer_opens = tables.reviewer_opens!.filter((open) => !(open.user_id === args.p_user_id && open.artifact_id === args.p_artifact_id));
      tables.reviewer_opens.push({ user_id: args.p_user_id, artifact_id: args.p_artifact_id, last_opened_at: new Date().toISOString() });
      return { data: true, error: null };
    }
    return { data: null, error: { message: `unexpected rpc ${name}` } };
  });
});

describe("TP1 plan content end to end", () => {
  it('TP2 lists synchronized unimported work read-only and keeps its selection alias on release/apply', async () => {
    const assignmentId = uuid(70);
    tables.canvas_assignments!.push({ id: assignmentId, user_id: A, course_id: C1, canvas_connection_id: uuid(99), canvas_assignment_id: 'work-70',
      name: 'Synced work', due_at: at('17:00'), submission_types: ['online_upload'], created_at: ago(1), published: true });
    tables.canvas_course_sync_preferences!.push({ id: uuid(71), user_id: A, course_id: C1, canvas_connection_id: uuid(99), selected: true });
    const candidates = await data<import('@stay-focused/shared/task-planning').PlanningCandidates>(await post('planner/candidates', A, plan('tasks')));
    expect(candidates.courses[0]!.items).toContainEqual(expect.objectContaining({ id: assignmentId, needsTaskImport: true, estimateMinutes: 60 }));
    expect(mocks.rpc).not.toHaveBeenCalled();
    const request = { ...plan('tasks'), selection: { order: 'manual', items: [{ kind: 'task', id: assignmentId }] } };
    const preview = await data<Plan>(await post('planner/preview', A, request));
    expect(titles(preview)).toEqual(['Synced work']);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(['import_canvas_assignments_as_tasks_v1']);
    const next = await data<Plan>(await post('planner/preview', A, request)); expect(next).toEqual(preview);
    expect((await post('planner/apply', A, request)).status).toBe(200);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(['import_canvas_assignments_as_tasks_v1', 'apply_study_plan_v1']);
  });
  it("TP2 reads grouped owned candidates without writes and defaults match TP1", async () => {
    const candidates = await data<import('@stay-focused/shared/task-planning').PlanningCandidates>(await post('planner/candidates', A, plan('reviewers_tasks')));
    expect(candidates.courses.map(course => course.id)).toEqual([C1]);
    expect(candidates.courses[0]!.items.find(item => item.id === R3)).toMatchObject({ openedWithin24h: true, estimateMinutes: 45 });
    expect(candidates.personalItems.map(item => item.id)).toEqual([T1, T2]);
    expect(candidates.freeWindowMinutes).toBe(240);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const { defaultPlanningDraft, builtPlanningSelection } = await import('@stay-focused/shared');
    const selection = builtPlanningSelection(candidates, defaultPlanningDraft(candidates));
    const legacy = await data<Plan>(await post('planner/preview', A, plan('reviewers_tasks')));
    const selected = await data<Plan & { notFit: unknown[] }>(await post('planner/preview', A, { ...plan('reviewers_tasks'), selection }));
    const { notFit, ...original } = selected;
    expect(original).toEqual(legacy);
    expect(notFit).toEqual([]);
  });
  it("TP2 opts in recent reviewers and uses identical selection on preview and apply", async () => {
    const request = { ...plan('reviewers_tasks'), selection: { order: 'manual', courseIds: [C1], items: [{ kind: 'reviewer', id: R3 }, { kind: 'reviewer', id: R1 }] } };
    const preview = await data<Plan>(await post('planner/preview', A, request));
    expect(titles(preview)).toEqual(['Recently opened reviewer', 'Cell biology reviewer']);
    expect(preview.sessions.map(item => item.durationMinutes)).toEqual([45, 30]);
    expect(mocks.rpc).not.toHaveBeenCalled();
    const applied = await post('planner/apply', A, request);
    expect(applied.status).toBe(200);
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(['apply_study_plan_v2']);
    const stored = mocks.rpc.mock.calls[0]![1].p_sessions as { reviewer_artifact_id: string }[];
    expect(stored.map(item => item.reviewer_artifact_id)).toEqual([R3, R1]);
  });
  it.each([
    { order: 'smart', courseIds: [CB] }, { order: 'smart', items: [{ kind: 'task', id: TB }] },
    { order: 'smart', items: [{ kind: 'reviewer', id: RB }] }, { order: 'smart', items: [{ kind: 'reviewer', id: R4 }] },
    { order: 'smart', items: [{ kind: 'reviewer', id: QUIZ }] },
    { order: 'manual', courseIds: [C1], items: [{ kind: 'task', id: T1 }] },
  ])('TP2 safely rejects unowned/out-of-scope selection %j', async selection => {
    for (const endpoint of ['planner/preview', 'planner/apply']) {
      expect((await post(endpoint, A, { ...plan('reviewers_tasks'), selection })).status).toBe(404);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps an omitted mode tasks-only with the original response shape", async () => {
    const response = await post("planner/preview", A, plan(undefined));
    expect(response.status).toBe(200);
    const preview = await data<Plan & Record<string, unknown>>(response);
    expect(titles(preview)).toEqual(["Essay draft", "Lab report", "Lab report"]);
    expect(preview).not.toHaveProperty("mode");
    expect(preview).not.toHaveProperty("candidates");
    for (const session of preview.sessions) expect(Object.keys(session).sort()).toEqual(
      ["durationMinutes", "endsAt", "proposalId", "scheduledAfterDeadline", "startsAt", "taskId", "taskTitle"]);
    await post("planner/replan", A, plan(undefined));
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["apply_study_plan_v1"]);
  });

  it("previews each mode from the eligible owned candidates only", async () => {
    const tasksOnly = await data<Plan>(await post("planner/preview", A, plan("tasks")));
    expect(titles(tasksOnly)).toEqual(["Essay draft", "Lab report", "Lab report"]);
    expect(tasksOnly).toMatchObject({ mode: "tasks", candidates: { tasks: 2, reviewers: 0 } });

    // R3 opened 2h ago, R4 past course, R5 no course, R6 superseded, RB other owner, quiz excluded.
    const reviewers = await data<Plan>(await post("planner/preview", A, plan("reviewers")));
    expect(reviewers.sessions.map((session) => [session.reviewerTitle, session.startsAt, session.durationMinutes])).toEqual([
      ["Cell biology reviewer", at("09:00"), 30], ["Genetics reviewer", at("09:30"), 20],
    ]);
    expect(reviewers.sessions.every((session) => session.kind === "reviewer")).toBe(true);
    expect(reviewers).toMatchObject({ mode: "reviewers", candidates: { tasks: 0, reviewers: 2 }, unscheduledWork: [] });

    const both = await data<Plan>(await post("planner/preview", A, plan("reviewers_tasks")));
    expect(both.sessions.map((session) => [session.reviewerTitle ?? session.taskTitle, session.startsAt, session.durationMinutes])).toEqual([
      ["Essay draft", at("09:00"), 60], ["Lab report", at("10:00"), 84],
      ["Cell biology reviewer", at("11:24"), 30], ["Genetics reviewer", at("11:54"), 20], ["Lab report", at("12:14"), 36],
    ]);
    expect(both.unscheduledWork).toEqual([]);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("never places blocks in busy time between free windows", async () => {
    const busy = [{ startsAt: at("09:00"), endsAt: at("09:40") }, { startsAt: at("11:00"), endsAt: at("11:30") }];
    const preview = await data<Plan>(await post("planner/preview", A, plan("reviewers_tasks", A, busy)));
    for (const session of preview.sessions) {
      const from = Date.parse(session.startsAt), to = from + session.durationMinutes * 60_000;
      expect((from >= Date.parse(at("09:00")) && to <= Date.parse(at("09:40"))) || (from >= Date.parse(at("11:00")) && to <= Date.parse(at("11:30")))).toBe(true);
    }
    expect(preview.sessions.reduce((sum, session) => sum + session.durationMinutes, 0)).toBeLessThanOrEqual(70);
  });

  it.each([["both"], [""], [null], [1]])("rejects invalid mode %j before any storage access", async (mode) => {
    const response = await post("planner/preview", A, { ...plan(undefined), mode });
    expect(response.status).toBe(400);
    const replan = await post("planner/replan", A, { ...plan(undefined), mode });
    expect(replan.status).toBe(400);
    expect(queries).toBe(0);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("applies the same mode, persists reviewer identity and survives reload in Schedule and Today", async () => {
    const applied = await data<{ mode: string; sessions: Array<Record<string, unknown>> }>(await post("planner/replan", A, plan("reviewers_tasks")));
    expect(applied.mode).toBe("reviewers_tasks");
    expect(mocks.rpc.mock.calls.map(([name]) => name)).toEqual(["apply_study_plan_v2"]);
    expect(applied.sessions.filter((session) => session.kind === "reviewer").map((session) => session.reviewer)).toEqual([
      { id: `artifact:${R1}`, title: "Cell biology reviewer", courseId: C1 },
      { id: `artifact:${R2}`, title: "Genetics reviewer", courseId: C1 },
    ]);

    const reloaded = await readSessions(A);
    expect(reloaded.map((session) => [session.kind, session.taskId, (session.reviewer as { id: string } | undefined)?.id ?? null])).toEqual([
      ["task", T1, null], ["task", T2, null], ["reviewer", null, `artifact:${R1}`], ["reviewer", null, `artifact:${R2}`], ["task", T2, null],
    ]);
    const timeline = (await readToday(A)).timeline;
    expect(timeline.filter((item) => item.reviewer).map((item) => [item.title, item.reviewer!.id, item.status])).toEqual([
      ["Cell biology reviewer", `artifact:${R1}`, "planned"], ["Genetics reviewer", `artifact:${R2}`, "planned"],
    ]);

    // Repeated apply replaces planned blocks: no duplicates, one more plan row.
    await post("planner/replan", A, plan("reviewers_tasks"));
    expect(await readSessions(A)).toHaveLength(5);
    expect(tables.study_plans).toHaveLength(2);

    // Reviewers mode applies reviewer blocks only and replaces the task blocks.
    const reviewersOnly = await data<{ mode: string; sessions: Array<Record<string, unknown>> }>(await post("planner/replan", A, plan("reviewers")));
    expect(reviewersOnly.mode).toBe("reviewers");
    expect((await readSessions(A)).map((session) => session.kind)).toEqual(["reviewer", "reviewer"]);
  });

  it("finishing a reviewer block completes only that block and keeps it out of the next plan", async () => {
    await post("planner/replan", A, plan("reviewers"));
    const block = (await readSessions(A)).find((session) => (session.reviewer as { id: string }).id === `artifact:${R1}`)!;
    const patched = await sessionRoute.PATCH(new Request(`https://app.example/api/study-sessions/${block.id}`, { method: "PATCH", headers: auth(A), body: JSON.stringify({ status: "completed" }) }),
      { params: Promise.resolve({ sessionId: block.id as string }) });
    expect(await data(patched)).toMatchObject({ kind: "reviewer", status: "completed", taskId: null, reviewer: { id: `artifact:${R1}` } });
    expect(tables.tasks!.filter((task) => task.user_id === A).map((task) => task.status)).toEqual(["pending", "pending", "completed"]);
    expect((await readToday(A)).timeline.find((item) => item.reviewer?.id === `artifact:${R1}`)?.status).toBe("completed");

    const next = await data<Plan>(await post("planner/preview", A, plan("reviewers")));
    expect(next.sessions.map((session) => session.reviewerTitle)).toEqual(["Genetics reviewer"]);
    await post("planner/replan", A, plan("reviewers"));
    expect((await readSessions(A)).map((session) => [(session.reviewer as { id: string }).id, session.status])).toEqual([
      [`artifact:${R1}`, "completed"], [`artifact:${R2}`, "planned"],
    ]);
  });

  it("records opens, skips recently opened reviewers and shows the empty state without falling back", async () => {
    const opened = await post(`library/artifact:${R1}/opened`, A);
    expect(opened.status).toBe(200);
    await post(`library/artifact:${R2}/opened`, A);
    const preview = await data<Plan>(await post("planner/preview", A, plan("reviewers")));
    expect(preview.sessions).toEqual([]);
    expect(preview.candidates).toEqual({ tasks: 0, reviewers: 0 });
    // Combined still plans tasks; reviewers are simply absent.
    expect(titles(await data<Plan>(await post("planner/preview", A, plan("reviewers_tasks"))))).toEqual(["Essay draft", "Lab report", "Lab report"]);
    tables.tasks = tables.tasks!.filter((task) => task.user_id !== A);
    const tasksOnly = await data<Plan>(await post("planner/preview", A, plan("tasks")));
    expect(tasksOnly).toMatchObject({ sessions: [], candidates: { tasks: 0, reviewers: 0 } });
  });

  it("isolates owners for candidates, opens, blocks and preferences", async () => {
    expect((await post(`library/artifact:${R1}/opened`, B)).status).toBe(404);
    expect((await post(`library/artifact:${QUIZ}/opened`, A)).status).toBe(404);
    expect((await post(`library/quiz:${QUIZ}/opened`, A)).status).toBe(404);
    expect(tables.reviewer_opens!.filter((open) => open.user_id === B)).toEqual([]);
    const other = await data<Plan>(await post("planner/preview", B, plan("reviewers")));
    expect(other.sessions.map((session) => session.reviewerTitle)).toEqual(["Other owner reviewer"]);
    await post("planner/replan", A, plan("reviewers"));
    expect(await readSessions(B)).toEqual([]);
    expect((await readToday(B)).timeline).toEqual([]);

    const prefs = (user: string, body?: unknown) => body === undefined
      ? preferences.GET(new Request("https://app.example/api/profile/planner-preferences", { headers: auth(user) }))
      : preferences.PATCH(new Request("https://app.example/api/profile/planner-preferences", { method: "PATCH", headers: auth(user), body: JSON.stringify(body) }));
    expect(await data(await prefs(A))).toEqual({ planMode: "reviewers_tasks" });
    expect(await data(await prefs(A, { planMode: "tasks" }))).toEqual({ planMode: "tasks" });
    expect(await data(await prefs(A))).toEqual({ planMode: "tasks" });
    expect(await data(await prefs(B))).toEqual({ planMode: "reviewers_tasks" });
    expect((await prefs(A, { planMode: "both" })).status).toBe(400);
  });

  it("hides a reviewer block once its reviewer is deleted", async () => {
    await post("planner/replan", A, plan("reviewers"));
    tables.experience_library_v1 = tables.experience_library_v1!.filter((row) => row.id !== `artifact:${R2}`);
    expect((await readSessions(A)).map((session) => (session.reviewer as { id: string }).id)).toEqual([`artifact:${R1}`]);
    expect((await readToday(A)).timeline.map((item) => item.reviewer?.id)).toEqual([`artifact:${R1}`]);
  });
});
