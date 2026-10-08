"use client";
import type {
  CourseSummary,
  CourseMaterials,
  LearningMaterial,
  CourseLearningWorkspace,
  GenerationView,
  QuizGenerationRequest,
  QuizQuestionType,
} from "@stay-focused/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, RowLink, State } from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
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
export function CourseScreen({ id }: { id: string }) {
  const { api } = useAuth(),
    course = useResource<CourseLearningWorkspace>(
      `/api/experience/courses/${id}`,
    ),
    [extra, setExtra] = useState<LearningMaterial[]>([]),
    [offset, setOffset] = useState<number | null>(null),
    action = useAction();
  useEffect(() => {
    setExtra([]);
    setOffset(course.data?.materials.nextOffset ?? null);
  }, [course.data]);
  const materials = [...(course.data?.materials.items ?? []), ...extra],
    groups = new Map<string, LearningMaterial[]>();
  for (const m of materials) {
    const key = m.moduleTitle ?? "Course materials";
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return (
    <>
      <Heading
        title={course.data?.course.name ?? "Course materials"}
        subtitle={course.data?.course.code ?? undefined}
        back="/generate"
      />
      <div className="stack">
        <RowLink
          href="/tasks"
          title="Assignments and tasks"
          detail="Deadline-bearing work stays in Tasks."
          icon="clipboard-list"
        />
        <State resource={course} />
        {Array.from(groups).map(([name, items]) => (
          <details key={name} className="module" open>
            <summary>
              {name} <span className="meta">{items.length} materials</span>
            </summary>
            {items.map((m) => (
              <RowLink
                key={m.id}
                href={`/generate/${id}/${encodeURIComponent(m.id)}`}
                title={m.title}
                detail={`${m.kind.toUpperCase()} · ${m.readiness.replaceAll("_", " ")}`}
                icon={m.kind === "slides" ? "presentation" : "file-text"}
              />
            ))}
          </details>
        ))}
        {course.data && !materials.length && (
          <Empty title="No study materials yet.">
            <Link href="/canvas">Sync this course in Canvas settings.</Link>
          </Empty>
        )}
        {offset !== null && (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const page = await api<CourseMaterials>(
                  `/api/experience/courses/${id}/materials?offset=${offset}`,
                );
                setExtra((old) => [...old, ...page.items]);
                setOffset(page.nextOffset);
              })
            }
          >
            Load more materials
          </button>
        )}
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
export function MaterialScreen({
  courseId,
  id,
}: {
  courseId: string;
  id: string;
}) {
  const { api, session } = useAuth(),
    router = useRouter(),
    course = useResource<CourseLearningWorkspace>(
      `/api/experience/courses/${courseId}`,
    ),
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
  return (
    <>
      <Heading
        title={material?.title ?? "Study material"}
        subtitle={course.data?.course.name}
        back={`/generate/${courseId}`}
      />
      <State resource={course} />
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
        <div className="stack reader">
          <p className="muted">
            {material.kind.toUpperCase()} ·{" "}
            {material.readiness.replaceAll("_", " ")}
          </p>
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
          <div className="surface stack">
            <h2>Create study tools</h2>
            <p className="muted">
              Use this course material to create a Reviewer or practice Quiz.
            </p>
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
              disabled={
                !generationEnabled ||
                material.generation.quiz.status !== "available"
              }
              onClick={() => setQuiz(!quiz)}
            >
              Generate Quiz
            </button>
            {!generationEnabled && (
              <p className="meta">
                Generation is unavailable in this environment. You can still
                study saved materials in your Library.
              </p>
            )}
          </div>
          {quiz && <QuizSetup sourceType="material" sourceId={id} />}
          {action.message && <Notice error>{action.message}</Notice>}
        </div>
      )}
    </>
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
