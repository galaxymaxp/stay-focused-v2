"use client";
import { LIBRARY_GRID_SORT_KEY, sortLibraryGroups, sortLibraryItems } from "../app-model/librarySorting";
import { orderedLibrary } from "../app-model/libraryOrder";
import { useLibraryCourseSequence } from "../lib/use-library-course-sequence";
import type { LibrarySort } from "../app-model/listPreferences";
import { LIBRARY_SORT_OPTIONS } from "../app-model/librarySortOptions";
import { SnapshotStatus } from "../components/snapshot-status";
import { useStableSnapshotGroups } from "../lib/use-stable-snapshot-groups";
import type {
  ActivityDraft,
  ActivityDraftContent,
  GenerationView,
  LibraryArtifactSummary,
  Quiz,
  QuizSummary,
  ReviewerReaderModel,
} from "@stay-focused/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
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
import { useSavedLibrary } from '../lib/use-saved-library';
import { DraftInstructions } from './draft-instructions';
import { StudyExportControl } from './study-export-control';
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
          {!item.course && item.sourceDescription ? <span className="meta">{item.sourceDescription}</span> : null}
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
  const { prefs, pin, sortLibrary } = useListPreferences();
  const [search, setSearch] = useState("");
  const groups = useStableSnapshotGroups(groupLibraryByCourse(library.items));
  const sort = prefs.librarySort?.[LIBRARY_GRID_SORT_KEY] ?? "updated_desc";
  const arranged = arrangeList(sortLibraryGroups(groups, sort), (group) => group.key, prefs.pinned.course, []);
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
        <LibrarySortControl grid value={sort} onChange={value => sortLibrary(LIBRARY_GRID_SORT_KEY, value)} />
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
                      <strong title={group.course?.name ?? identity.title}>{identity.title}</strong>
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

function LibrarySortControl({ value, onChange, course = false, grid = false }: {
  value: LibrarySort; onChange: (value: LibrarySort) => void; course?: boolean; grid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const options = LIBRARY_SORT_OPTIONS.filter(option => (option.value !== "course" || course) && (option.value !== "custom" || !grid));
  const selected = LIBRARY_SORT_OPTIONS.find(option => option.value === value);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    const close = () => { setOpen(false); trigger.current?.focus(); };
    const outside = (event: Event) => {
      if (!root.current?.contains(event.target as Node)) {
        // Keep the dismissing press from moving focus away from the trigger.
        event.preventDefault();
        close();
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("touchstart", outside, { passive: false });
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("touchstart", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  return <div className="library-sort" ref={root} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} className="library-sort-trigger subtle" aria-label={`Sort Library: ${selected?.label ?? value}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      onClick={() => setOpen(current => !current)}
      onKeyDown={event => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); } }}>
      <Icon name="arrow-up-down" />Sort
    </button>
    {open && <div id={menuId} ref={menu} className="account-popover library-sort-menu" role="menu" aria-label="Sort Library"
      onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 :
          (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}>
      {options.map(option => <button key={option.value} role="menuitemradio" aria-checked={value === option.value}
        onClick={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}>
        <span className="grow">{option.label}</span>{value === option.value && <Icon name="check" />}
      </button>)}
    </div>}
  </div>;
}

type Pending = { kind: "rename" | "delete" | "remove" | "remake"; item: LibraryArtifactSummary } | null;

/** Level 2: one course's saved work, filtered by kind. */
export function LibraryCourseScreen({ courseKey }: { courseKey: string }) {
  const { api, session } = useAuth();
  const router = useRouter();
  const library = useSavedLibrary();
  const { prefs, pin, sortLibrary } = useListPreferences();
  const sort = prefs.librarySort?.[courseKey] ?? "custom";
  const sequence = useLibraryCourseSequence(courseKey, sort === "course" && courseKey !== PERSONAL_LIBRARY_KEY);
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const [pending, setPending] = useState<Pending>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const action = useAction();
  const courseItems = filterCourseLibrary(library.items, courseKey, "all").filter((item) => !removed.has(item.id));
  const filtered = courseItems.filter((item) => filter === "all" || item.type === filter);
  const arranged = arrangeList(filtered, (item) => item.id, prefs.pinned.artifact, []);
  const items = sortLibraryItems(orderedLibrary([...arranged.pinned, ...arranged.rest], prefs.libraryOrder[courseKey]), sort, sequence.data);
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
        <LibrarySortControl course={courseKey !== PERSONAL_LIBRARY_KEY} value={sort} onChange={value => sortLibrary(courseKey, value)} />
        {sort === "course" && sequence.error ? <Notice>{sequence.data ? "Using the saved course order. Connect to refresh it." : "Course order is not saved yet. Connect once to load it."}</Notice> : null}
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
    `/api/experience/library/${encodeURIComponent(id)}`, 0, "data", true,
  );
  const data = artifact.data;
  if (data?.reviewer)
    return <ReviewerReader artifact={data.artifact} reviewer={data.reviewer} snapshotStatus={<SnapshotStatus {...artifact} hideFreshLabel />} />;
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
      {data?.draft && <DraftEditor key={data.draft.id} draft={data.draft} artifact={data.artifact} />}
    </>
  );
}
function autoSize(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

function DraftTextarea(props: ComponentPropsWithoutRef<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    if (ref.current) autoSize(ref.current);
  }, [props.value]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      autoSize(el);
    });
    observer.observe(el);
    let alive = true;
    void document.fonts.ready.then(() => { if (alive) autoSize(el); });
    return () => { alive = false; observer.disconnect(); };
  }, []);
  return <textarea {...props} ref={ref} onChange={(event) => {
    autoSize(event.currentTarget);
    props.onChange?.(event);
  }} />;
}

function DraftEditor({ draft, artifact }: { draft: ActivityDraft; artifact: LibraryArtifactSummary }) {
  const { api } = useAuth(),
    [content, setContent] = useState<ActivityDraftContent>({
      title: draft.title,
      sections: draft.sections,
      slides: draft.slides,
    }),
    [savedDraft, setSavedDraft] = useState(draft),
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
    <div className="draft-layout">
      <div className="draft-body stack">
        <label id="draft-title">
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
          <label key={section.id} id={`draft-section-${index}`}>
            {section.heading ?? `Section ${index + 1}`}
            <DraftTextarea
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
          <label key={slide.number} id={`draft-slide-${slide.number}`}>
            {slide.title}
            <DraftTextarea
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
      </div>
      <aside className="draft-aside stack">
        <DraftInstructions activityId={draft.activityId} unavailable={content.sections.length + content.slides.length >= 2 ? <nav className="stack" aria-label="Draft outline">
          <h2>Outline</h2>
          {content.sections.map((section, index) => (
            <a key={section.id} href={`#draft-section-${index}`}>
              {section.heading ?? `Section ${index + 1}`}
            </a>
          ))}
          {content.slides.map((slide) => (
            <a key={slide.number} href={`#draft-slide-${slide.number}`}>{slide.title}</a>
          ))}
        </nav> : null} />
        <p className="meta" role="status">{dirty ? "Unsaved changes" : "Saved draft"}</p>
        <StudyExportControl detail={{ artifact: { ...artifact, title: savedDraft.title }, draft: savedDraft }} disabled={action.busy} unsaved={dirty} />
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
              setSavedDraft(updated);
              setRevision(updated.revision);
              setDirty(false);
              action.setMessage("Draft saved.");
            })
          }
        >
          Save draft
        </button>
        {action.message && <Notice>{action.message}</Notice>}
      </aside>
    </div>
  );
}
