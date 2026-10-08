"use client";
import type {
  ActivityDraft,
  ActivityDraftContent,
  GenerationView,
  LibraryArtifactSummary,
  LibraryOverview,
  Quiz,
  QuizSummary,
  ReviewerReaderModel,
} from "@stay-focused/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { courseIdentity } from "../app-model/courseIdentity";
import {
  PERSONAL_LIBRARY_KEY,
  describeLibraryCounts,
  filterCourseLibrary,
  groupLibraryByCourse,
  librarySegments,
  type LibraryFilter,
} from "../app-model/libraryPresentation";
import { arrangeList } from "../app-model/listPreferences";
import { available } from "../app-model/presentation";
import { CourseMark } from "../components/course";
import { PageCrumb } from "../components/crumbs";
import { useAuth } from "../components/providers";
import { ReviewerReader } from "./reviewer/reviewer-reader";
import { reviewerArtifactIdFromLibraryId } from "./reviewer/quiz-from-reviewer";
import { ContentIcon, Empty, Heading, Icon, Notice, State, contentTone } from "../components/ui";
import { generationEnabled, generationKey } from "../lib/generation";
import { useAction, useResource } from "../lib/hooks";
import { useListPreferences } from "../lib/list-preferences";
type Artifact = {
  artifact: LibraryArtifactSummary;
  reviewer?: ReviewerReaderModel;
  quiz?: Quiz;
  draft?: ActivityDraft;
};
/** Quiz progress from the summary the API sends, worded as the app's Library card. */
function quizProgress(quiz: QuizSummary) {
  if (quiz.activeAttempt)
    return `In progress · ${quiz.activeAttempt.answeredCount} / ${quiz.questionCount} answered`;
  if (quiz.latestScore !== null)
    return `Completed · Latest ${quiz.latestScore}% · ${quiz.attemptCount} attempt${quiz.attemptCount === 1 ? "" : "s"}`;
  return "Not started";
}
const typeLabel = (type: LibraryArtifactSummary["type"]) =>
  type === "activity_output" ? "Draft" : type === "quiz" ? "Quiz" : "Reviewer";
const sourceTypeLabel = (kind: NonNullable<LibraryArtifactSummary["sourceType"]>) =>
  kind === "local_file"
    ? "Local file"
    : kind === "camera"
      ? "Camera"
      : kind === "text"
        ? "Text"
        : kind === "canvas_page"
          ? "Canvas page"
          : kind === "canvas_file"
            ? "Canvas file"
            : "Canvas";
function libraryIdentity(key: string, course: LibraryArtifactSummary["course"]) {
  return course
    ? courseIdentity(course)
    : courseIdentity({ id: PERSONAL_LIBRARY_KEY, name: "Personal & other", code: null });
}
function itemHref(item: LibraryArtifactSummary) {
  return item.type === "quiz"
    ? `/quiz/${encodeURIComponent(item.quiz?.id ?? item.id.slice(item.id.indexOf(":") + 1))}`
    : `/library/${encodeURIComponent(item.id)}`;
}

/**
 * The whole saved Library from the account (never a device copy): finished
 * study work only, without Reviewers a newer generation replaced.
 */
function useSavedLibrary() {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const [state, setState] = useState<{
    owner: string;
    items: LibraryArtifactSummary[];
    categories: LibraryOverview["categories"] | null;
    loading: boolean;
    error: string | null;
  }>({ owner, items: [], categories: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!session?.user.id) return;
    let live = true;
    void (async () => {
      setState((old) => ({ owner, items: old.owner === owner ? old.items : [], categories: old.owner === owner ? old.categories : null, loading: true, error: null }));
      try {
        const items: LibraryArtifactSummary[] = [];
        const superseded = new Set<string>();
        let categories: LibraryOverview["categories"] | null = null;
        let offset: number | null = 0;
        for (let page = 0; offset !== null && page < 20; page++) {
          const result: LibraryOverview = await api<LibraryOverview>(`/api/experience/library?limit=100&offset=${offset}`);
          items.push(...result.items);
          result.supersededReviewerIds?.forEach((id) => superseded.add(id));
          categories = result.categories;
          offset = result.nextOffset;
        }
        if (offset !== null) throw new Error("The Library is larger than this view can load. Please try again.");
        if (live)
          setState({
            owner,
            items: items.filter((item) => item.status === "completed" && !superseded.has(item.id)),
            categories,
            loading: false,
            error: null,
          });
      } catch (cause) {
        if (live)
          setState((old) => ({
            ...old,
            loading: false,
            error: cause instanceof Error ? cause.message : "Library could not be loaded.",
          }));
      }
    })();
    return () => {
      live = false;
    };
  }, [api, session?.user.id, owner, version]);
  const current = state.owner === owner ? state : { items: [], categories: null, loading: true, error: null };
  return { ...current, data: current.loading && !current.items.length ? null : current.items, refresh };
}

function LibraryCard({
  item,
  pinned,
  onPin,
  actions,
}: {
  item: LibraryArtifactSummary;
  pinned: boolean;
  onPin: () => void;
  actions?: ReactNode;
}) {
  const tone = contentTone(item.type);
  return (
    <div className="library-card">
      <Link className="library-card-open" href={itemHref(item)} aria-label={`${typeLabel(item.type)}: ${item.title}${pinned ? ", pinned" : ""}`}>
        <ContentIcon kind={item.type} />
        <span className="grow">
          <span className={`type-pill tone-${tone}`}>{typeLabel(item.type)}</span>
          <strong>{item.title}</strong>
          {!item.course && item.sourceType && (
            <span className="meta">
              {sourceTypeLabel(item.sourceType)}
              {item.sourceTitle ? ` · ${item.sourceTitle}` : ""}
            </span>
          )}
          <span className="meta">
            Updated {new Date(item.updatedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
            {item.quiz
              ? ` · ${item.quiz.questionCount} questions${item.quiz.bestScore !== null ? ` · Best ${item.quiz.bestScore}%` : ""}`
              : ""}
          </span>
          {item.quiz && <span className="meta">{quizProgress(item.quiz)}</span>}
        </span>
      </Link>
      <span className="row-actions library-card-actions">
        <button
          className="icon-button subtle"
          aria-pressed={pinned}
          aria-label={pinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
          title={pinned ? "Unpin" : "Pin to top"}
          onClick={onPin}
        >
          <Icon name="pin" />
        </button>
        {actions}
      </span>
    </div>
  );
}

/** Level 1: courses that have saved study work, as in the app. */
export function LibraryScreen() {
  const library = useSavedLibrary();
  const { prefs, pin } = useListPreferences();
  const [search, setSearch] = useState("");
  const groups = useMemo(() => groupLibraryByCourse(library.items), [library.items]);
  const arranged = arrangeList(groups, (group) => group.key, prefs.pinned.course, []);
  const query = search.trim().toLowerCase();
  const found = query
    ? library.items.filter((item) => `${item.title} ${item.course?.name ?? ""} ${item.sourceTitle ?? ""}`.toLowerCase().includes(query))
    : [];
  return (
    <>
      <Heading
        title="Library"
        subtitle={
          library.data
            ? `${library.items.length} saved ${library.items.length === 1 ? "item" : "items"} · by course`
            : "Your saved study tools, by course."
        }
        action={
          <button className="subtle" aria-label="Refresh Library" onClick={library.refresh} disabled={library.loading}>
            <Icon name="refresh-cw" />
            <span className="desktop-only">Refresh</span>
          </button>
        }
      />
      <div className="stack">
        <input
          type="search"
          aria-label="Search your Library"
          placeholder="Search Reviewers, Quizzes and Drafts"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <State resource={library} />
        {query ? (
          <>
            <p className="kicker">
              {found.length} {found.length === 1 ? "result" : "results"}
            </p>
            <div className="library-grid">
              {found.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  pinned={prefs.pinned.artifact.includes(item.id)}
                  onPin={() => pin("artifact", item.id, !prefs.pinned.artifact.includes(item.id))}
                />
              ))}
            </div>
            {!found.length && <Empty title="No matching saved work.">Try a course name or a word from the title.</Empty>}
          </>
        ) : (
          <div className="course-grid library-courses">
            {[...arranged.pinned, ...arranged.rest].map((group) => {
              const identity = libraryIdentity(group.key, group.course);
              const pinned = prefs.pinned.course.includes(group.key);
              return (
                <div key={group.key} className="library-course">
                  <Link href={`/library/course/${encodeURIComponent(group.key)}`} className="course-card">
                    <CourseMark course={group.course ?? { id: PERSONAL_LIBRARY_KEY, name: "Personal & other" }} identity={identity} size={44} />
                    <span className="grow">
                      <strong>{identity.title}</strong>
                      {identity.subtitle && <span className="meta">{identity.subtitle}</span>}
                      <span className="meta library-counts">{describeLibraryCounts(group.counts)}</span>
                    </span>
                    <Icon name="chevron-right" />
                  </Link>
                  <button
                    className={`icon-button subtle course-pin${pinned ? " on" : ""}`}
                    aria-pressed={pinned}
                    aria-label={pinned ? `Unpin ${identity.title}` : `Pin ${identity.title}`}
                    title={pinned ? "Unpin" : "Pin to top"}
                    onClick={() => pin("course", group.key, !pinned)}
                  >
                    <Icon name="pin" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {library.data && !query && groups.length === 0 && (
          <Empty title="No generated study materials yet">
            Reviewers, quizzes and drafts you generate are kept here, grouped by course.{" "}
            <Link href="/generate">Browse synced courses.</Link>
          </Empty>
        )}
      </div>
    </>
  );
}

type Pending = { kind: "rename" | "delete" | "remove" | "remake"; item: LibraryArtifactSummary } | null;

/** Level 2: one course's saved work, filtered by kind. */
export function LibraryCourseScreen({ courseKey }: { courseKey: string }) {
  const { api, session } = useAuth();
  const router = useRouter();
  const library = useSavedLibrary();
  const { prefs, pin } = useListPreferences();
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [pending, setPending] = useState<Pending>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const action = useAction();
  const courseItems = filterCourseLibrary(library.items, courseKey, "all").filter((item) => !removed.has(item.id));
  const filtered = courseItems.filter((item) => filter === "all" || item.type === filter);
  const arranged = arrangeList(filtered, (item) => item.id, prefs.pinned.artifact, []);
  const items = [...arranged.pinned, ...arranged.rest];
  const identity = libraryIdentity(courseKey, courseItems[0]?.course ?? null);
  const counts = (type: LibraryFilter) =>
    type === "all" ? courseItems.length : courseItems.filter((item) => item.type === type).length;
  const unavailable =
    filter !== "all" && library.categories ? !available(library.categories[filter]) : false;

  function confirm() {
    if (!pending || !session) return;
    const { kind, item } = pending;
    void action.run(async () => {
      if (kind === "rename") {
        const id = reviewerArtifactIdFromLibraryId(item.id);
        const title = renameTitle.trim();
        if (!id || !title || title.length > 120) return;
        await api(`/api/reviewers/${encodeURIComponent(id)}`, {
          method: "PATCH", body: { title }, envelope: "root",
        });
        setPending(null);
        library.refresh();
        return;
      } else if (kind === "delete") {
        const id = reviewerArtifactIdFromLibraryId(item.id);
        if (!id) throw new Error("This Reviewer can’t be deleted here.");
        await api(`/api/reviewers/${encodeURIComponent(id)}`, { method: "DELETE", envelope: "root" });
      } else if (kind === "remove") {
        if (!item.quiz) return;
        await api(`/api/experience/quizzes/${encodeURIComponent(item.quiz.id)}`, { method: "DELETE" });
      } else {
        if (!item.course || !item.sourceMaterialId) {
          setPending(null);
          if (item.course) router.push(`/generate/${item.course.id}`);
          else throw new Error("This Reviewer has no original course material available to remake.");
          return;
        }
        const body = { courseId: item.course.id, materialId: item.sourceMaterialId },
          submission = generationKey(session.user.id, "reviewer", body);
        const job = await api<GenerationView>("/api/experience/generations", {
          method: "POST",
          body,
          key: submission.key,
        });
        submission.accepted();
        router.push(`/generation/${job.id}`);
        return;
      }
      if (prefs.pinned.artifact.includes(item.id)) pin("artifact", item.id, false);
      setRemoved((old) => new Set(old).add(item.id));
      setPending(null);
    });
  }

  return (
    <>
      <PageCrumb current={identity.title} />
      <header className="page-heading library-course-head">
        <div className="row">
          <Link href="/library" className="icon-button back-button" aria-label="Go back">
            <Icon name="arrow-left" />
          </Link>
          <CourseMark
            course={courseItems[0]?.course ?? { id: PERSONAL_LIBRARY_KEY, name: "Personal & other" }}
            identity={identity}
            size={44}
          />
          <div>
            <h1>{identity.title}</h1>
            <p className="muted">
              {[identity.subtitle, `${courseItems.length} saved ${courseItems.length === 1 ? "item" : "items"}`]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>
      </header>
      <div className="stack">
        <div className="segments task-groups" aria-label="Library categories">
          {librarySegments.map((segment) => (
            <button
              key={segment.value}
              aria-pressed={filter === segment.value}
              aria-label={segment.label}
              onClick={() => setFilter(segment.value)}
            >
              {segment.label}
              {library.data && <span className="segment-count">{counts(segment.value)}</span>}
            </button>
          ))}
        </div>
        <State resource={library} />
        {unavailable && <Notice>This category is temporarily unavailable.</Notice>}
        {pending && (
          <div className="surface stack finish-confirm" role={pending.kind === "rename" ? "dialog" : "alertdialog"} aria-label={pending.kind === "rename" ? "Rename Reviewer" : "Confirm"}>
            <p>
              {pending.kind === "rename"
                ? `Rename “${pending.item.title}”`
                : pending.kind === "delete"
                ? `Delete “${pending.item.title}”? It will be removed from your Library on every device. This can’t be undone.`
                : pending.kind === "remove"
                  ? `Remove “${pending.item.title}” and its practice history from your Library?`
                  : `Create a fresh Reviewer from the original material for “${pending.item.title}”? The latest version will appear in Library.`}
            </p>
            {pending.kind === "rename" && (
              <label>
                Reviewer title
                <input autoFocus value={renameTitle} maxLength={120} disabled={action.busy}
                  onChange={(event) => setRenameTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && !action.busy) setPending(null);
                    if (event.key === "Enter" && renameTitle.trim() && renameTitle.trim() !== pending.item.title) confirm();
                  }} />
              </label>
            )}
            <div className="row wrap">
              <button disabled={action.busy} onClick={() => setPending(null)}>Cancel</button>
              <button
                className={pending.kind === "remake" || pending.kind === "rename" ? "primary" : "danger"}
                disabled={action.busy || (pending.kind === "remake" && !generationEnabled) || (pending.kind === "rename" && (!renameTitle.trim() || renameTitle.trim() === pending.item.title))}
                onClick={confirm}
              >
                {pending.kind === "rename" ? "Save title" : pending.kind === "delete" ? "Delete Reviewer" : pending.kind === "remove" ? "Remove Quiz" : "Remake Reviewer"}
              </button>
            </div>
          </div>
        )}
        {action.message && <Notice error>{action.message}</Notice>}
        <div className="library-grid">
          {items.map((item) => {
            const pinned = prefs.pinned.artifact.includes(item.id);
            const reviewer = item.type === "reviewer" && !!reviewerArtifactIdFromLibraryId(item.id);
            return (
              <LibraryCard
                key={item.id}
                item={item}
                pinned={pinned}
                onPin={() => pin("artifact", item.id, !pinned)}
                actions={
                  reviewer ? (
                    <>
                      <button className="subtle" aria-label={`Rename ${item.title}`}
                        onClick={() => {
                          action.setMessage(null);
                          setRenameTitle(item.title);
                          setPending({ kind: "rename", item });
                        }}>
                        Rename
                      </button>
                      <button
                        className="icon-button subtle"
                        aria-label={`Remake ${item.title}`}
                        title="Remake from the original material"
                        disabled={!generationEnabled}
                        onClick={() => setPending({ kind: "remake", item })}
                      >
                        <Icon name="refresh-cw" />
                      </button>
                      <button
                        className="icon-button subtle danger"
                        aria-label={`Delete ${item.title}`}
                        title="Delete"
                        onClick={() => setPending({ kind: "delete", item })}
                      >
                        <Icon name="trash" />
                      </button>
                    </>
                  ) : item.type === "quiz" && item.quiz ? (
                    <button
                      className="icon-button subtle danger"
                      aria-label={`Remove ${item.title}`}
                      title="Remove"
                      onClick={() => setPending({ kind: "remove", item })}
                    >
                      <Icon name="trash" />
                    </button>
                  ) : null
                }
              />
            );
          })}
        </div>
        {library.data && !items.length && (
          <Empty title={filter === "all" ? "Nothing saved for this course." : `No ${librarySegments.find((s) => s.value === filter)!.label.toLowerCase()} yet.`}>
            <Link href="/generate">Generate a Reviewer or Quiz.</Link>
          </Empty>
        )}
        {items.length > 0 && (
          <p className="meta library-total">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        )}
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
