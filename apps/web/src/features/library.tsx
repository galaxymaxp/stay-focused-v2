"use client";
import type {
  ActivityDraft,
  ActivityDraftContent,
  LibraryArtifactSummary,
  LibraryOverview,
  Quiz,
  QuizSummary,
  ReviewerReaderModel,
} from "@stay-focused/shared";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../components/providers";
import { ReviewerReader } from "./reviewer/reviewer-reader";
import { Empty, Heading, Notice, RowLink, State } from "../components/ui";
import { dateLabel } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
type Artifact = {
  artifact: LibraryArtifactSummary;
  reviewer?: ReviewerReaderModel;
  quiz?: Quiz;
  draft?: ActivityDraft;
};
const filters = [
  ["all", "All"],
  ["reviewer", "Reviewers"],
  ["quiz", "Quizzes"],
  ["activity_output", "Activity Outputs"],
] as const;
/** Quiz progress from the summary the API sends: an open attempt, then any finished one. */
function quizProgress(quiz: QuizSummary) {
  if (quiz.activeAttempt) return "In progress";
  if (quiz.latestScore !== null || quiz.bestScore !== null) return "Completed";
  return quiz.attemptCount > 0 ? "Started" : "Not started";
}
export function LibraryScreen() {
  const { api } = useAuth(),
    [filter, setFilter] = useState("all"),
    [search, setSearch] = useState(""),
    library = useResource<LibraryOverview>(
      `/api/experience/library?type=${filter}&limit=50`,
    ),
    [extra, setExtra] = useState<LibraryArtifactSummary[]>([]),
    [offset, setOffset] = useState<number | null>(null),
    action = useAction();
  useEffect(() => {
    setExtra([]);
    setOffset(library.data?.nextOffset ?? null);
  }, [library.data]);
  const items = [...(library.data?.items ?? []), ...extra].filter((item) =>
    `${item.title} ${item.course?.name ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading title="Library" />
      <div className="stack">
        <div className="segments" aria-label="Library categories">
          {filters.map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => {
                setFilter(value);
                setExtra([]);
                setOffset(null);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <label>
          Search saved materials
          <input
            type="search"
            placeholder="Search your Library"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <State resource={library} />
        <div className="cards">
          {items.map((item) => (
            <RowLink
              key={item.id}
              href={
                item.type === "quiz"
                  ? `/quiz/${encodeURIComponent(item.quiz?.id ?? item.id.slice(item.id.indexOf(":") + 1))}`
                  : `/library/${encodeURIComponent(item.id)}`
              }
              title={item.title}
              icon={item.type === "quiz" ? "file-question-mark" : "book-open"}
              tag={
                item.type === "quiz"
                  ? "Quiz"
                  : item.type === "reviewer"
                    ? "Reviewer"
                    : "Activity Output"
              }
              detail={`${item.course?.name ?? "Saved material"} · ${item.quiz ? quizProgress(item.quiz) : dateLabel(item.updatedAt)}${item.quiz?.bestScore !== null && item.quiz?.bestScore !== undefined ? ` · Best ${item.quiz.bestScore}%` : ""}`}
            />
          ))}
        </div>
        {library.data && !items.length && (
          <Empty
            title={
              search
                ? "No matching saved materials."
                : "No saved materials yet."
            }
          >
            <Link href="/generate">
              Create your first study tool from course material.
            </Link>
          </Empty>
        )}
        {offset !== null && (
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const page = await api<LibraryOverview>(
                  `/api/experience/library?type=${filter}&limit=50&offset=${offset}`,
                );
                setExtra((old) => [...old, ...page.items]);
                setOffset(page.nextOffset);
              })
            }
          >
            Load more saved materials
          </button>
        )}
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
export function ArtifactScreen({ id }: { id: string }) {
  const artifact = useResource<Artifact>(
    `/api/experience/library/${encodeURIComponent(id)}`,
  );
  const data = artifact.data;
  if (data?.reviewer)
    return <ReviewerReader artifact={data.artifact} reviewer={data.reviewer} />;
  return (
    <>
      <Heading
        title={data?.artifact.title ?? "Saved material"}
        back="/library"
        crumb={data?.artifact.title}
      />
      <State resource={artifact} />
      {data?.quiz && (
        <Link className="button primary" href={`/quiz/${data.quiz.id}`}>
          Open Quiz
        </Link>
      )}
      {data?.draft && <DraftEditor draft={data.draft} />}
    </>
  );
}
function DraftEditor({ draft }: { draft: ActivityDraft }) {
  const { api } = useAuth(),
    [content, setContent] = useState<ActivityDraftContent>({
      title: draft.title,
      sections: draft.sections,
      slides: draft.slides,
    }),
    [revision, setRevision] = useState(draft.revision),
    [dirty, setDirty] = useState(false),
    action = useAction();
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const click = (e: MouseEvent) => {
      const target = e.target instanceof Element ? e.target.closest("a") : null;
      if (
        target &&
        target.getAttribute("href") &&
        !target.getAttribute("href")!.startsWith("#") &&
        !window.confirm("Leave without saving your draft changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", click, true);
    };
  }, [dirty]);
  return (
    <div className="reader stack">
      <p className="meta">{dirty ? "Unsaved changes" : "Saved draft"}</p>
      <label>
        Draft title
        <input
          disabled={action.busy}
          value={content.title}
          onChange={(e) => {
            setDirty(true);
            setContent((old) => ({ ...old, title: e.target.value }));
          }}
        />
      </label>
      {content.sections.map((section, index) => (
        <label key={section.id}>
          {section.heading ?? `Section ${index + 1}`}
          <textarea
            aria-label={section.heading ?? `Section ${index + 1}`}
            disabled={action.busy}
            value={section.content}
            onChange={(e) => {
              setDirty(true);
              setContent((old) => ({
                ...old,
                sections: old.sections.map((s) =>
                  s.id === section.id ? { ...s, content: e.target.value } : s,
                ),
              }));
            }}
          />
        </label>
      ))}
      {content.slides.map((slide) => (
        <label key={slide.number}>
          {slide.title}
          <textarea
            aria-label={slide.title}
            disabled={action.busy}
            value={slide.body}
            onChange={(e) => {
              setDirty(true);
              setContent((old) => ({
                ...old,
                slides: old.slides.map((s) =>
                  s.number === slide.number
                    ? { ...s, body: e.target.value }
                    : s,
                ),
              }));
            }}
          />
        </label>
      ))}
      {draft.warnings.length > 0 && (
        <Notice>
          Some sections need information from you. Check this draft against your
          assignment before using it.
        </Notice>
      )}
      <button
        className="primary"
        disabled={action.busy || !dirty}
        onClick={() =>
          void action.run(async () => {
            const updated = await api<ActivityDraft>(
              `/api/experience/activity-drafts/${draft.id}`,
              { method: "PATCH", body: { revision, content } },
            );
            setRevision(updated.revision);
            setDirty(false);
            action.setMessage("Draft saved.");
          })
        }
      >
        Save draft
      </button>
      {action.message && <Notice>{action.message}</Notice>}
    </div>
  );
}
