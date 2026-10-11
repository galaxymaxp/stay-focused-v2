"use client";
import type {
  CourseMaterials,
  GenerateCourseList,
  GenerateCourseSummary,
  LearningMaterial,
  CourseLearningWorkspace,
  FeatureCapability,
  GenerationView,
  QuizGenerationRequest,
  QuizQuestionType,
} from "@stay-focused/shared";
import Link from "next/link";
import { useRouter, useSelectedLayoutSegment } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { courseIdentity } from "../app-model/courseIdentity";
import {
  generateCourseDestination,
  generateCourseGroups,
  generateCourseStatus,
} from "../app-model/presentation";
import { CourseMark } from "../components/course";
import { PageCrumb } from "../components/crumbs";
import { useAuth } from "../components/providers";
import {
  Empty,
  Heading,
  ContentIcon,
  Icon,
  Notice,
  State,
} from "../components/ui";
import { CanvasRefreshStatus, useCanvasRefresh } from "../lib/canvas-refresh";
import { performCanvasRefresh } from "../lib/canvas-refresh-core";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
type Resource<T> = ReturnType<typeof useResource<T>>;
type CourseSyncRun = "syncing" | "synced" | "partial" | "failed";
/**
 * Synced courses open their materials, grouped by term as in the app. Courses
 * that are not synced (or whose last sync did not finish) never open an empty
 * workspace: they wait in their own section with a Sync button.
 */
export function GenerateScreen() {
  const { api } = useAuth();
  const courses = useResource<GenerateCourseList>("/api/experience/courses"),
    [search, setSearch] = useState(""),
    [runs, setRuns] = useState<Record<string, CourseSyncRun>>({}),
    [showUnsynced, setShowUnsynced] = useState(false);
  const canvas = useCanvasRefresh("all", courses.refresh);
  const query = search.trim().toLowerCase();
  const all = courses.data?.items ?? [];
  const filtered = query
    ? all.filter((c) => {
        const identity = courseIdentity(c);
        return [c.name, c.code, identity.title, identity.subtitle, identity.monogram]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
    : all;
  const synced = filtered.filter((c) => generateCourseDestination(c) === "generate");
  const unsynced = filtered.filter((c) => generateCourseDestination(c) === "sync");
  const groups = generateCourseGroups(synced);

  async function syncCourse(id: string) {
    setRuns((old) => ({ ...old, [id]: "syncing" }));
    try {
      // Syncing a course selects it in Canvas first, as in the app.
      const inventory = await api<{ selectedCourseIds: string[] }>("/api/canvas/courses", { envelope: "root" });
      if (!inventory.selectedCourseIds.includes(id))
        await api("/api/canvas/course-preferences", {
          method: "PUT",
          body: { selectedCourseIds: [...inventory.selectedCourseIds, id] },
          envelope: "root",
        });
      const phase = await performCanvasRefresh(api, id, new AbortController().signal, () => undefined);
      setRuns((old) => ({ ...old, [id]: phase === "synced" ? "synced" : phase === "partial" ? "partial" : "failed" }));
    } catch {
      setRuns((old) => ({ ...old, [id]: "failed" }));
    }
    courses.refresh();
  }

  const card = (c: GenerateCourseSummary) => {
    const identity = courseIdentity(c);
    const counts = [
      c.materialCount === null ? null : `${c.materialCount} ${c.materialCount === 1 ? "material" : "materials"}`,
      c.reviewerCount ? `${c.reviewerCount} ${c.reviewerCount === 1 ? "Reviewer" : "Reviewers"}` : null,
    ].filter(Boolean);
    return (
      <Link key={c.id} href={`/generate/${c.id}`} className="course-card" title={c.name}>
        <CourseMark course={c} identity={identity} size={44} />
        <span className="grow">
          <strong>{identity.title}</strong>
          <span className="meta">{[identity.subtitle, ...counts].filter(Boolean).join(" · ")}</span>
          <span className="meta course-sync-line">{generateCourseStatus(c)}</span>
        </span>
        <Icon name="chevron-right" />
      </Link>
    );
  };
  return (
    <>
      <Heading title="Generate" subtitle="Canvas material or your own notes." />
      <div className="stack">
        <div className="row wrap generate-tools">
          <label className="grow">
            <span className="sr-only">Search courses</span>
            <input
              type="search"
              aria-label="Search courses"
              placeholder="Search courses"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Link className="button subtle" href="/canvas">
            <Icon name="globe" />
            Connection and sync
          </Link>
        </div>
        <CanvasRefreshStatus refresh={canvas} />
        <State resource={courses} />
        <div className="course-grid">
          <Link href="/generate/new" className="course-card own">
            <span className="content-icon">
              <Icon name="file-text" />
            </span>
            <span className="grow">
              <strong>Your own material</strong>
              <span className="meta">Paste notes, or upload a PDF or photo</span>
            </span>
            <Icon name="chevron-right" />
          </Link>
        </div>
        {groups.map((group) => (
          <section key={group.key} className="stack course-group" aria-label={group.title}>
            <h2 className="kicker">{group.title}</h2>
            <div className="course-grid">{group.items.map(card)}</div>
          </section>
        ))}
        {unsynced.length > 0 && (
          <section className="stack course-group unsynced-group" aria-label="Not synced">
            <button
              className="subtle unsynced-toggle"
              aria-expanded={showUnsynced || !!query}
              onClick={() => setShowUnsynced((v) => !v)}
            >
              <Icon name="chevron-down" />
              Not synced · {unsynced.length} {unsynced.length === 1 ? "course" : "courses"}
            </button>
            {(showUnsynced || !!query) && (
              <div className="course-grid">
                {unsynced.map((c) => {
                  const identity = courseIdentity(c);
                  const run = runs[c.id];
                  return (
                    <div key={c.id} className="course-card unsynced" title={c.name}>
                      <CourseMark course={c} identity={identity} size={44} />
                      <span className="grow">
                        <strong>{identity.title}</strong>
                        <span className="meta">
                          {[identity.subtitle, c.termName].filter(Boolean).join(" · ") || "Canvas course"}
                        </span>
                        <span className="meta course-sync-line">
                          {run === "syncing"
                            ? "Syncing from Canvas…"
                            : run === "failed"
                              ? "Sync didn’t finish. Try again."
                              : run === "partial"
                                ? "Synced, with some parts still missing."
                                : c.syncState === "sync_incomplete"
                                  ? "Last sync didn’t finish"
                                  : "Not synced yet"}
                        </span>
                      </span>
                      <button
                        className="primary"
                        disabled={run === "syncing"}
                        aria-label={`Sync ${identity.title}`}
                        onClick={() => void syncCourse(c.id)}
                      >
                        {run === "syncing" ? "Syncing…" : c.syncState === "sync_incomplete" ? "Retry" : "Sync"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
        {courses.data && !synced.length && !unsynced.length && (
          <Empty title={search ? "No matching courses." : "Sync Canvas to begin."}>
            <Link href="/canvas">Connect Canvas, then sync a course to generate study tools from it.</Link>
          </Empty>
        )}
        {courses.data && !query && !synced.length && unsynced.length > 0 && (
          <Notice>No course is synced yet. Sync one below to generate study tools from its materials.</Notice>
        )}
      </div>
    </>
  );
}
const kindLabels: Record<LearningMaterial["kind"], string> = {
  pdf: "PDF",
  document: "Document",
  slides: "Slides",
  page: "Canvas page",
  module: "Module",
  announcement: "Announcement",
  assignment: "Assignment",
  image: "Image",
  text: "Text",
};
const readinessLabels: Record<LearningMaterial["readiness"], string> = {
  ready: "Ready",
  needs_preparation: "Needs preparation",
  empty: "No readable text",
  unsupported: "Unsupported",
  unavailable: "Unavailable",
};
const reasonLabels: Record<string, string> = {
  source_not_ready: "Prepare this material first.",
  unsupported_material: "This material type is not supported yet.",
  service_unavailable: "Temporarily unavailable. Try again shortly.",
  not_implemented: "Not available yet.",
};
function capabilityLabel(capability: FeatureCapability | undefined) {
  if (capability?.status === "available") return "Available";
  return reasonLabels[capability?.reasonCode ?? ""] ?? "Unavailable";
}
const CourseContext = createContext<{
  courseId: string;
  course: Resource<CourseLearningWorkspace>;
} | null>(null);
function useCourse() {
  const value = useContext(CourseContext);
  if (!value) throw new Error("Course workspace is missing.");
  return value;
}
/**
 * Course materials on the left, the selected material on the right. The
 * layout stays mounted while the selection changes, so the list keeps its
 * scroll position and loaded pages. On phones it is two screens.
 */
export function CourseWorkspace({
  courseId,
  children,
}: {
  courseId: string;
  children: ReactNode;
}) {
  const { api } = useAuth(),
    course = useResource<CourseLearningWorkspace>(
      `/api/experience/courses/${courseId}`,
    ),
    segment = useSelectedLayoutSegment(),
    selectedId = segment ? decodeURIComponent(segment) : null,
    [extra, setExtra] = useState<LearningMaterial[]>([]),
    [offset, setOffset] = useState<number | null>(null),
    [filter, setFilter] = useState(""),
    action = useAction();
  useEffect(() => {
    setExtra([]);
    setOffset(course.data?.materials.nextOffset ?? null);
  }, [course.data]);
  const materials = [...(course.data?.materials.items ?? []), ...extra],
    visible = materials.filter((m) =>
      m.title.toLowerCase().includes(filter.trim().toLowerCase()),
    ),
    groups = new Map<string, LearningMaterial[]>();
  for (const m of visible) {
    const key = m.moduleTitle ?? "Course materials";
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  const canvas = useCanvasRefresh(courseId, course.refresh);
  const name = course.data?.course.name ?? "Course materials",
    code = course.data?.course.code;
  return (
    <CourseContext.Provider value={{ courseId, course }}>
      <div
        className={`course-workspace${selectedId ? " has-selection" : ""}`}
      >
        <div className="course-heading">
          <Heading
            title={name}
            subtitle={
              course.data
                ? [
                    code,
                    `${course.data.materials.totalKnown} ${course.data.materials.totalKnown === 1 ? "material" : "materials"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : undefined
            }
            back="/generate"
            crumb={selectedId ? null : undefined}
            action={
              <div className="row wrap">
                <Link
                  href={`/canvas/${courseId}/grades`}
                  className="button"
                  aria-label="Grades"
                >
                  <Icon name="square-check-big" />
                  <span className="desktop-only">Grades</span>
                </Link>
                <Link
                  href="/tasks"
                  className="button"
                  aria-label="Assignments and tasks"
                >
                  <Icon name="clipboard-list" />
                  <span className="desktop-only">Assignments and tasks</span>
                </Link>
              </div>
            }
          />
        </div>
        <CanvasRefreshStatus refresh={canvas} />
        <State resource={course} />
        {course.data && (
          <div className="course-split">
            <section className="pane-list" aria-label="Course materials">
              <div className="pane-tools">
                <input
                  type="search"
                  aria-label="Filter materials"
                  placeholder="Filter materials"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div className="pane-scroll">
                {Array.from(groups).map(([group, items]) => (
                  <div key={group} className="pane-group">
                    <h2 className="pane-group-title">
                      <span>{group}</span>
                      <span className="count-up">{items.length}</span>
                    </h2>
                    {items.map((m) => (
                      <Link
                        key={m.id}
                        className="material-link"
                        href={`/generate/${courseId}/${encodeURIComponent(m.id)}`}
                        aria-current={m.id === selectedId ? "page" : undefined}
                      >
                        <ContentIcon kind={m.kind} />
                        <span className="grow">
                          <strong>{m.title}</strong>
                          <span className="meta">
                            {kindLabels[m.kind]} ·{" "}
                            {readinessLabels[m.readiness]}
                          </span>
                        </span>
                        <span
                          className={`status-dot ${m.readiness}`}
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </div>
                ))}
                {!materials.length && (
                  <Empty title="No study materials yet.">
                    <Link href="/canvas">
                      Sync this course in Canvas settings.
                    </Link>
                  </Empty>
                )}
                {materials.length > 0 && !visible.length && (
                  <p className="muted pane-note">No materials match.</p>
                )}
                {offset !== null && (
                  <div className="pane-note">
                    <button
                      disabled={action.busy}
                      onClick={() =>
                        void action.run(async () => {
                          const page = await api<CourseMaterials>(
                            `/api/experience/courses/${courseId}/materials?offset=${offset}`,
                          );
                          setExtra((old) => [...old, ...page.items]);
                          setOffset(page.nextOffset);
                        })
                      }
                    >
                      Load more materials
                    </button>
                  </div>
                )}
                {action.message && <Notice error>{action.message}</Notice>}
              </div>
            </section>
            <section className="pane-detail" aria-label="Selected material">
              {children}
            </section>
          </div>
        )}
      </div>
    </CourseContext.Provider>
  );
}
/** Right pane before a material is chosen. Hidden on phones. */
export function CourseOverview() {
  const { course } = useCourse();
  if (!course.data) return null;
  return (
    <div className="pane-placeholder">
      <Icon name="sparkles" />
      <h2>Choose a material</h2>
      <p className="muted">
        Pick something from {course.data.course.name} to create a Reviewer or a
        practice Quiz from it.
      </p>
    </div>
  );
}
export function MaterialScreen({ id }: { id: string }) {
  const { api, session } = useAuth(),
    { courseId, course } = useCourse(),
    router = useRouter(),
    action = useAction();
  const [material, setMaterial] = useState<LearningMaterial | null>(null),
    [searched, setSearched] = useState(false),
    [lookupError, setLookupError] = useState<string | null>(null);
  // Deep links may identify a material beyond the initial page. Scan bounded server pages.
  useEffect(() => {
    if (!course.data) return;
    let alive = true;
    const controller = new AbortController();
    setMaterial(null);
    setSearched(false);
    setLookupError(null);
    void (async () => {
      try {
        let page = course.data!.materials;
        const visited = new Set<number>();
        while (alive) {
          const found = page.items.find((m) => m.id === id);
          if (found) {
            setMaterial(found);
            break;
          }
          if (page.nextOffset === null) break;
          if (visited.has(page.nextOffset))
            throw new Error(
              "Material paging could not continue. Please refresh the course.",
            );
          visited.add(page.nextOffset);
          page = await api<CourseMaterials>(
            `/api/experience/courses/${courseId}/materials?offset=${page.nextOffset}`,
            { signal: controller.signal },
          );
        }
        if (alive) setSearched(true);
      } catch (error) {
        if (alive) {
          setSearched(true);
          setLookupError(
            error instanceof Error
              ? error.message
              : "Materials could not be loaded.",
          );
        }
      }
    })();
    return () => {
      alive = false;
      controller.abort();
    };
  }, [course.data, api, courseId, id]);
  const [quiz, setQuiz] = useState(false);
  function generate() {
    void action.run(async () => {
      if (!generationEnabled)
        throw new Error("Generation is unavailable in this environment.");
      const body = { courseId, materialId: id },
        submission = generationKey(session!.user.id, "reviewer", body);
      const job = await api<GenerationView>("/api/experience/generations", {
        method: "POST",
        body,
        key: submission.key,
      });
      submission.accepted();
      router.push(`/generation/${job.id}`);
    });
  }
  const courseName = course.data?.course.name;
  return (
    <div className="material-panel">
      <PageCrumb
        parent={
          courseName
            ? { label: courseName, href: `/generate/${courseId}` }
            : undefined
        }
        current={material?.title}
      />
      {!searched && course.data && <p role="status">Finding your material…</p>}
      {lookupError && (
        <div>
          <Notice error>{lookupError}</Notice>
          <button onClick={course.refresh}>Try again</button>
        </div>
      )}
      {searched && !material && !lookupError && (
        <Empty title="This material could not be opened.">
          Return to the course and refresh its materials.
        </Empty>
      )}
      {material && (
        <>
          <header className="detail-head">
            <Link
              href={`/generate/${courseId}`}
              className="icon-button back-button"
              aria-label={`Back to ${courseName ?? "course"}`}
            >
              <Icon name="arrow-left" />
            </Link>
            <div className="detail-meta">
              <span className="badge">{kindLabels[material.kind]}</span>
              <span className={`status ${material.readiness}`}>
                {readinessLabels[material.readiness]}
              </span>
            </div>
            <h2>{material.title}</h2>
            <p className="muted">
              {[material.moduleTitle, courseName].filter(Boolean).join(" · ")}
            </p>
            <div className="detail-actions">
              {material.readiness === "needs_preparation" && (
                <button
                  disabled={action.busy}
                  onClick={() =>
                    void action.run(async () => {
                      const result = await api<{ items: LearningMaterial[] }>(
                        "/api/experience/materials/prepare",
                        { method: "POST", body: { courseId, materialId: id } },
                      );
                      setMaterial(
                        result.items.find((m) => m.id === id) ?? material,
                      );
                      action.setMessage("Your material has been checked.");
                    })
                  }
                >
                  Prepare material
                </button>
              )}
              <button
                className="primary"
                disabled={
                  action.busy ||
                  !generationEnabled ||
                  material.generation.reviewer.status !== "available"
                }
                onClick={generate}
              >
                Generate Reviewer
              </button>
              <button
                aria-expanded={quiz}
                disabled={
                  !generationEnabled ||
                  material.generation.quiz.status !== "available"
                }
                onClick={() => setQuiz(!quiz)}
              >
                Generate Quiz
              </button>
            </div>
            {!generationEnabled && (
              <p className="meta">
                Generation is unavailable in this environment. You can still
                study saved materials in your Library.
              </p>
            )}
            {action.message && <Notice error>{action.message}</Notice>}
          </header>
          <div className="detail-body">
            <div className="stack">
              {quiz ? (
                <QuizSetup sourceType="material" sourceId={id} />
              ) : (
                <div className="detail-hint">
                  <h3>Create study tools</h3>
                  <p className="muted">
                    A Reviewer turns this material into key ideas you can
                    search. A Quiz turns it into practice questions. Both are
                    saved to your Library, and you can leave while they
                    generate.
                  </p>
                </div>
              )}
            </div>
            <aside className="detail-side">
              <h3>Source</h3>
              <dl className="facts">
                <dt>Type</dt>
                <dd>{kindLabels[material.kind]}</dd>
                <dt>Module</dt>
                <dd>{material.moduleTitle ?? "Course materials"}</dd>
                <dt>Status</dt>
                <dd>{readinessLabels[material.readiness]}</dd>
                <dt>Reviewer</dt>
                <dd>{capabilityLabel(material.generation.reviewer)}</dd>
                <dt>Quiz</dt>
                <dd>{capabilityLabel(material.generation.quiz)}</dd>
              </dl>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
export function QuizSetup({
  sourceType,
  sourceId,
}: {
  sourceType: "material" | "reviewer";
  sourceId: string;
}) {
  const { api, session } = useAuth(),
    router = useRouter(),
    action = useAction(),
    [count, setCount] = useState(5),
    [difficulty, setDifficulty] =
      useState<QuizGenerationRequest["difficulty"]>("mixed"),
    [types, setTypes] = useState<QuizQuestionType[]>([
      "single_select",
      "true_false",
    ]);
  const options: [QuizQuestionType, string][] = [
    ["single_select", "Multiple choice"],
    ["multi_select", "Multiple answers"],
    ["true_false", "True / False"],
    ["matching", "Matching"],
  ];
  return (
    <section className="surface stack">
      <h2>New Quiz</h2>
      <label>
        Number of questions
        <select
          aria-label="Number of questions"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
        >
          {[5, 10, 15, 20].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label>
        Difficulty
        <select
          aria-label="Difficulty"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
        >
          {["easy", "medium", "hard", "mixed"].map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="stack">
        <legend>Question types</legend>
        {options.map(([value, label]) => (
          <label className="check-row" key={value}>
            <input
              type="checkbox"
              checked={types.includes(value)}
              onChange={(e) =>
                setTypes((old) =>
                  e.target.checked
                    ? [...old, value]
                    : old.filter((t) => t !== value),
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>
      <button
        className="primary"
        disabled={!generationEnabled || action.busy || !types.length}
        onClick={() =>
          void action.run(async () => {
            if (!generationEnabled)
              throw new Error("Generation is unavailable in this environment.");
            const body: QuizGenerationRequest = {
              sourceType,
              sourceIds: [sourceId],
              questionCount: count,
              difficulty,
              questionTypes: types,
            };
            const submission = generationKey(session!.user.id, "quiz", body),
              job = await api<{ id: string }>("/api/experience/quizzes", {
                method: "POST",
                body,
                key: submission.key,
              });
            submission.accepted();
            router.push(`/generation/${job.id}`);
          })
        }
      >
        {action.busy ? "Starting…" : "Generate Quiz"}
      </button>
      {action.message && <Notice error>{action.message}</Notice>}
    </section>
  );
}
