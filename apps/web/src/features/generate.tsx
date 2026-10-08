"use client";
import type {
  CourseSummary,
  CourseMaterials,
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
import { PageCrumb } from "../components/crumbs";
import { useAuth } from "../components/providers";
import {
  Empty,
  Heading,
  Icon,
  Notice,
  RowLink,
  State,
} from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
type Resource<T> = ReturnType<typeof useResource<T>>;
export function GenerateScreen() {
  const courses = useResource<{ items: CourseSummary[] }>(
      "/api/experience/courses",
    ),
    [search, setSearch] = useState("");
  const filtered =
    courses.data?.items.filter((c) =>
      `${c.name} ${c.code ?? ""}`.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  return (
    <>
      <Heading
        title="Generate"
        subtitle="Study tools from your Canvas materials."
      />
      <div className="stack">
        <label>
          Search courses
          <input
            type="search"
            placeholder="Search courses"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <RowLink
          href="/generate/new"
          title="Your own material"
          detail="Paste notes, or upload a PDF or photo"
          icon="file-text"
        />
        <div className="row between">
          <span className="kicker">Canvas</span>
          <Link href="/canvas">Connection and sync</Link>
        </div>
        <State resource={courses} />
        <p className="kicker">Current courses</p>
        <div className="cards">
          {filtered.map((c) => (
            <RowLink
              key={c.id}
              href={`/generate/${c.id}`}
              title={c.name}
              tag={c.code ?? undefined}
              detail={
                c.materialCount === null
                  ? "Open course materials"
                  : `${c.materialCount} materials`
              }
            />
          ))}
        </div>
        {courses.data && !filtered.length && (
          <Empty title={search ? "No matching courses." : "No courses yet."}>
            <Link href="/canvas">Connect Canvas and select your courses.</Link>
          </Empty>
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
const materialIcon = (m: LearningMaterial) =>
  m.kind === "slides"
    ? "presentation"
    : m.kind === "page" || m.kind === "text"
      ? "text-align-start"
      : "file-text";
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
              <Link
                href="/tasks"
                className="button"
                aria-label="Assignments and tasks"
              >
                <Icon name="clipboard-list" />
                <span className="desktop-only">Assignments and tasks</span>
              </Link>
            }
          />
        </div>
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
                        <span className="content-icon">
                          <Icon name={materialIcon(m)} />
                        </span>
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
