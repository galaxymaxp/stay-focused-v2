"use client";
import {
  ASSIST_LABELS,
  ASSIST_TYPES,
  selectAssistBlock,
  type AssistType,
  type LibraryArtifactSummary,
  type ReviewerReaderModel,
} from "@stay-focused/shared";
import { useDeferredValue, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  findReviewerMatches,
  highlightRuns,
  isDuplicateBlockTitle,
  MIN_QUERY_LENGTH,
  reviewerSegments,
  segmentIds,
  type ReviewerMatch,
} from "../../app-model/reviewerNavigation";
import { useAuth } from "../../components/providers";
import { Heading, Icon, Notice } from "../../components/ui";
import { dateLabel } from "../../lib/api";
import { generationEnabled } from "../../lib/generation";
import {
  assistMark,
  assistStore,
  assistTargetKey,
  hasAssistResult,
  keyOf,
  useAssistMarks,
  type AssistMark,
  type AssistReadyEvent,
  type AssistTarget,
} from "./assist-store";
import { QuizFromReviewerDialog } from "./quiz-from-reviewer";
import { StudyAssistPanel } from "./study-assist-panel";

// Web counterpart of apps/mobile/src/features/reviewer/ReviewerReader.tsx:
// topics and search on the left, the Reviewer in a reading column, and Study
// Assist in a side panel. Click a key point to select it (Shift-click for its
// group), click an explanation for Study Assist, or select any text to study it.

type Passage = { section: string; block: string; point?: number; text?: string };
type Pick = { section: string; block: string; points: readonly number[] };

export function ReviewerReader({
  artifact,
  reviewer,
}: {
  artifact: LibraryArtifactSummary;
  reviewer: ReviewerReaderModel;
}) {
  const { api, session } = useAuth();
  const owner = session?.user.id ?? "";
  const segments = useMemo(() => reviewerSegments(reviewer), [reviewer]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const matches = useMemo(() => findReviewerMatches(segments, deferredQuery), [segments, deferredQuery]);
  const [activeMatch, setActiveMatch] = useState(0);
  const searching = deferredQuery.trim().length >= MIN_QUERY_LENGTH;
  const bySegment = useMemo(() => {
    const map = new Map<string, { first: number; items: ReviewerMatch[] }>();
    matches.forEach((match, index) => {
      const entry = map.get(match.segmentId) ?? { first: index, items: [] };
      entry.items.push(match);
      map.set(match.segmentId, entry);
    });
    return map;
  }, [matches]);
  const matchedSections = useMemo(() => new Set(matches.map((m) => m.sectionIndex)), [matches]);
  useEffect(() => setActiveMatch(0), [deferredQuery]);
  useEffect(() => {
    const match = matches[activeMatch];
    if (!match) return;
    document
      .querySelector(`[data-segment="${CSS.escape(match.segmentId)}"]`)
      ?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatch, matches]);

  // Which topic is being read, for the contents list.
  const [current, setCurrent] = useState(0);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        const visible = records.filter((r) => r.isIntersecting).map((r) => Number((r.target as HTMLElement).dataset.index));
        if (visible.length) setCurrent(Math.min(...visible));
      },
      { rootMargin: "-80px 0px -60% 0px" },
    );
    sectionRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, [reviewer]);

  const [passage, setPassage] = useState<Passage | null>(null);
  const assistTarget = useMemo<AssistTarget | null>(() => {
    if (!passage) return null;
    const selection = selectAssistBlock(reviewer, passage.section, passage.block);
    return selection ? { selection, ...(passage.point === undefined ? {} : { pointIndex: passage.point }) } : null;
  }, [reviewer, passage]);
  const marks = useAssistMarks();
  const markFor = (blockId: string, point?: number): AssistMark => assistMark(marks[assistTargetKey(reviewer.id, blockId, point)]);
  const pointHasResult = (block: string, index: number) => hasAssistResult(marks[assistTargetKey(reviewer.id, block, index)]);
  useEffect(() => {
    if (!owner) return;
    for (const section of reviewer.sections)
      for (const block of section.blocks) {
        const selection = selectAssistBlock(reviewer, section.id, block.id);
        if (!selection) continue;
        assistStore.hydrate(owner, { selection });
        block.keyPoints.forEach((_, pointIndex) => assistStore.hydrate(owner, { selection, pointIndex }));
      }
  }, [owner, reviewer]);

  const [picking, setPicking] = useState<Pick | null>(null);
  const pickingBlock = picking
    ? reviewer.sections.find((s) => s.id === picking.section)?.blocks.find((b) => b.id === picking.block) ?? null
    : null;
  const allPoints = (points: readonly string[]) => points.map((_, i) => i).filter((i) => points[i]!.trim());
  const pressPoint = (event: MouseEvent, section: string, block: string, points: readonly string[], index: number) => {
    if (!window.getSelection()?.isCollapsed) return;
    if (event.shiftKey) {
      const all = allPoints(points);
      setPicking((c) => (c?.block === block && c.points.length === all.length ? { section, block, points: [] } : { section, block, points: all }));
      return;
    }
    if (picking?.block !== block && pointHasResult(block, index)) {
      setPicking(null);
      setPassage({ section, block, point: index });
      return;
    }
    setPicking((c) =>
      c?.block === block
        ? { ...c, points: c.points.includes(index) ? c.points.filter((p) => p !== index) : [...c.points, index].sort((a, b) => a - b) }
        : { section, block, points: [index] },
    );
  };
  const openExplanation = (section: string, block: string) => {
    if (picking || !window.getSelection()?.isCollapsed) return;
    setPassage({ section, block });
  };
  const generatePicked = (type: AssistType) => {
    if (!picking?.points.length) return;
    const selection = selectAssistBlock(reviewer, picking.section, picking.block);
    if (!selection) return;
    for (const pointIndex of picking.points) assistStore.run(owner, api, { selection, pointIndex }, type);
    setPicking(null);
  };

  // A result that lands while its panel is closed is announced.
  const [ready, setReady] = useState<AssistReadyEvent | null>(null);
  const openKey = assistTarget ? keyOf(assistTarget) : null;
  const openKeyRef = useRef(openKey);
  openKeyRef.current = openKey;
  useEffect(
    () =>
      assistStore.onSettled((event) => {
        if (event.target.selection.reviewerId === reviewer.id && event.key !== openKeyRef.current) setReady(event);
      }),
    [reviewer.id],
  );
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => setReady(null), 6000);
    return () => clearTimeout(timer);
  }, [ready]);

  // Selecting text inside a block offers "Study selection".
  const [selectionChip, setSelectionChip] = useState<{ x: number; y: number; section: string; block: string; text: string } | null>(null);
  const onArticleMouseUp = () => {
    const selected = window.getSelection();
    if (!selected || selected.isCollapsed || selected.rangeCount === 0) return setSelectionChip(null);
    const range = selected.getRangeAt(0);
    const start = (range.startContainer.parentElement ?? null)?.closest<HTMLElement>("[data-block]");
    const end = (range.endContainer.parentElement ?? null)?.closest<HTMLElement>("[data-block]");
    const text = selected.toString().trim();
    if (!start || start !== end || !text) return setSelectionChip(null);
    const box = range.getBoundingClientRect();
    setSelectionChip({ x: box.left + box.width / 2, y: box.top, section: start.dataset.section!, block: start.dataset.block!, text });
  };
  useEffect(() => {
    if (!selectionChip) return;
    const clear = () => setSelectionChip(null);
    window.addEventListener("scroll", clear, { passive: true });
    return () => window.removeEventListener("scroll", clear);
  }, [selectionChip]);

  const render = (id: string, text: string, emphasis: readonly { text: string; style: "bold" | "underline" | "highlight" }[] = []): ReactNode => {
    const entry = bySegment.get(id);
    if (entry) {
      const active = matches[activeMatch]?.segmentId === id ? activeMatch - entry.first : null;
      return highlightRuns(text, entry.items, active).map((run, i) =>
        run.kind === "plain" ? run.text : <mark key={i} className={run.kind === "active" ? "find-active" : "find-match"}>{run.text}</mark>,
      );
    }
    if (!emphasis.length) return text;
    const ranges = emphasis
      .map((m) => ({ ...m, start: text.indexOf(m.text) }))
      .filter((m) => m.start >= 0)
      .sort((a, b) => a.start - b.start);
    const runs: ReactNode[] = [];
    let from = 0;
    ranges.forEach((range, i) => {
      if (range.start < from) return;
      if (range.start > from) runs.push(text.slice(from, range.start));
      const content = text.slice(range.start, range.start + range.text.length);
      runs.push(range.style === "highlight" ? <mark key={i} className="find-match">{content}</mark> : range.style === "underline" ? <u key={i}>{content}</u> : <strong key={i}>{content}</strong>);
      from = range.start + range.text.length;
    });
    if (from < text.length) runs.push(text.slice(from));
    return runs;
  };

  const [quizOpen, setQuizOpen] = useState(false);
  function saveText() {
    const body = [
      reviewer.title,
      ...reviewer.sections.flatMap((s) => [s.title, ...s.blocks.flatMap((b) => [b.title, b.explanation, ...b.keyPoints.map((p) => `• ${p}`)])]),
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reviewer.title.replace(/[^\w\- ]+/g, "").trim() || "reviewer"}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const passageLabel = assistTarget
    ? passage?.point !== undefined
      ? `Key point ${passage.point + 1} · ${assistTarget.selection.block.title}`
      : assistTarget.selection.block.title
    : "";

  return (
    <>
      <Heading
        title={artifact.title}
        crumb={artifact.title}
        subtitle={[reviewer.course?.name, dateLabel(reviewer.generatedAt), `${reviewer.sections.length} topics`].filter(Boolean).join(" · ")}
        back="/library"
        action={
          <div className="row">
            <button onClick={saveText}>Save to file</button>
            <button className="primary" disabled={!generationEnabled} onClick={() => setQuizOpen(true)}>
              Generate Quiz
            </button>
          </div>
        }
      />
      <div className={`reviewer-layout${passage ? " with-panel" : ""}`}>
        <nav className="reviewer-toc" aria-label="Topics">
          <label className="reviewer-search">
            <span className="sr-only">Search topics, terms, definitions</span>
            <input
              type="search"
              aria-label="Search topics, terms, definitions"
              placeholder="Search topics, terms, definitions"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches.length) {
                  e.preventDefault();
                  setActiveMatch((i) => (i + (e.shiftKey ? matches.length - 1 : 1)) % matches.length);
                }
              }}
            />
          </label>
          {searching && (
            <div className="row between search-steps">
              <span className="meta" aria-live="polite">
                {matches.length ? `${activeMatch + 1} of ${matches.length}` : "No matching topics."}
              </span>
              <span className="row">
                <button className="icon-button subtle" aria-label="Previous match" disabled={!matches.length} onClick={() => setActiveMatch((i) => (i - 1 + matches.length) % matches.length)}>
                  <Icon name="chevron-left" />
                </button>
                <button className="icon-button subtle" aria-label="Next match" disabled={!matches.length} onClick={() => setActiveMatch((i) => (i + 1) % matches.length)}>
                  <Icon name="chevron-right" />
                </button>
              </span>
            </div>
          )}
          <ol className="toc-list">
            {reviewer.sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#topic-${index + 1}`}
                  className={`${index === current ? "current" : ""}${searching && !matchedSections.has(index) ? " dim" : ""}`}
                  aria-current={index === current ? "location" : undefined}
                >
                  <span className="toc-index">{index + 1}</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="reviewer-article" onMouseUp={onArticleMouseUp}>
          {reviewer.freshness !== "current" && (
            <Notice>
              {reviewer.freshness === "changed"
                ? "The source has changed since this Reviewer was created."
                : reviewer.freshness === "attention_required"
                  ? "This Reviewer’s source needs attention."
                  : "Source freshness has not been confirmed."}
            </Notice>
          )}
          <p className="meta reader-hint">
            Click an explanation for Study Assist. Click a key point to select it, Shift-click for its whole group, or
            select any words to study exactly that.
          </p>
          {reviewer.sections.map((section, sectionIndex) => (
            <section
              key={section.id}
              id={`topic-${sectionIndex + 1}`}
              data-index={sectionIndex}
              ref={(node) => {
                sectionRefs.current[sectionIndex] = node;
              }}
              className="reviewer-topic"
            >
              <header className="topic-head">
                <span className="kicker">Topic {sectionIndex + 1}</span>
                <h2 data-segment={segmentIds.sectionTitle(section.id)}>{render(segmentIds.sectionTitle(section.id), section.title)}</h2>
              </header>
              {section.blocks.map((block) => {
                const pickingHere = picking?.block === block.id;
                return (
                  <div key={block.id} className="reviewer-block" data-block={block.id} data-section={section.id}>
                    {!isDuplicateBlockTitle(section.title, block.title) && (
                      <h3 data-segment={segmentIds.blockTitle(block.id)}>{render(segmentIds.blockTitle(block.id), block.title)}</h3>
                    )}
                    <p
                      className={`passage explanation mark-${markFor(block.id) ?? "none"}`}
                      data-segment={segmentIds.explanation(block.id)}
                      role="button"
                      tabIndex={0}
                      title="Open Study Assist for this concept"
                      onClick={() => openExplanation(section.id, block.id)}
                      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPassage({ section: section.id, block: block.id }))}
                    >
                      {render(segmentIds.explanation(block.id), block.explanation, block.emphasis?.filter((m) => m.target === "explanation" && m.index === 0) ?? [])}
                    </p>
                    {block.keyPoints.length > 0 && (
                      <div className={`key-points${pickingHere ? " picking" : ""}`}>
                        <span className="kicker">Key points</span>
                        <ul>
                          {block.keyPoints.map((point, index) => {
                            const picked = pickingHere && picking.points.includes(index);
                            const mark = pickingHere ? null : markFor(block.id, index);
                            const saved = !pickingHere && pointHasResult(block.id, index);
                            return (
                              <li
                                key={index}
                                className={`passage key-point mark-${mark ?? "none"}${picked ? " picked" : ""}`}
                                data-segment={segmentIds.keyPoint(block.id, index)}
                                role="checkbox"
                                aria-checked={!!picked}
                                tabIndex={0}
                                title={saved ? "Open its explanation (Shift-click to select the group)" : "Select for Study Assist (Shift-click to select the group)"}
                                onClick={(e) => pressPoint(e, section.id, block.id, block.keyPoints, index)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    pressPoint(e as unknown as MouseEvent, section.id, block.id, block.keyPoints, index);
                                  }
                                }}
                              >
                                <span className={`point-marker${pickingHere ? (picked ? " checked" : " box") : ""}`} aria-hidden="true" />
                                <span className="grow">
                                  {render(segmentIds.keyPoint(block.id, index), point, block.emphasis?.filter((m) => m.target === "key_point" && m.index === index) ?? [])}
                                </span>
                                {mark === "pending" && <span className="tile-spinner" aria-label="Creating" />}
                                {(mark === "fresh" || saved) && <Icon name="sparkles" />}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {block.evidence.length > 0 && (
                      <div className="evidence">
                        <span className="kicker">Details &amp; examples</span>
                        {block.evidence.map((evidence, index) => (
                          <div key={index}>
                            <span className="meta evidence-kind">{evidence.kind}</span>
                            <p data-segment={segmentIds.evidence(block.id, index)} className={evidence.kind === "code" ? "code" : undefined}>
                              {render(segmentIds.evidence(block.id, index), evidence.text)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </article>

        {passage && (
          <StudyAssistPanel
            key={openKey ?? "missing"}
            target={assistTarget}
            initialText={passage.text}
            passageLabel={passageLabel}
            onClose={() => setPassage(null)}
          />
        )}
      </div>

      {selectionChip && (
        <button
          className="selection-chip"
          style={{ left: selectionChip.x, top: selectionChip.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setPassage({ section: selectionChip.section, block: selectionChip.block, text: selectionChip.text });
            setPicking(null);
            setSelectionChip(null);
            window.getSelection()?.removeAllRanges();
          }}
        >
          <Icon name="sparkles" />
          Study selection
        </button>
      )}
      {picking && pickingBlock ? (
        <div className="pick-bar" role="toolbar" aria-label="Selected key points">
          <span className="pick-count">
            {picking.points.length} selected
          </span>
          <button className="subtle" onClick={() => setPicking({ ...picking, points: allPoints(pickingBlock.keyPoints) })}>
            All
          </button>
          <button className="subtle" onClick={() => setPicking({ ...picking, points: [] })}>
            None
          </button>
          <span className="pick-divider" aria-hidden="true" />
          {ASSIST_TYPES.map((type) => (
            <button key={type} disabled={!picking.points.length} onClick={() => generatePicked(type)}>
              {ASSIST_LABELS[type]}
            </button>
          ))}
          <button className="icon-button subtle" aria-label="Cancel selection" onClick={() => setPicking(null)}>
            <Icon name="x" />
          </button>
        </div>
      ) : ready ? (
        <div className={`ready-toast${ready.ok ? "" : " failed"}`} role="status">
          <span>
            {ready.ok
              ? `Your ${ASSIST_LABELS[ready.type].toLowerCase()} is ready.`
              : `Your ${ASSIST_LABELS[ready.type].toLowerCase()} couldn’t be created.`}
          </span>
          <button
            className="subtle"
            onClick={() => {
              const { selection, pointIndex } = ready.target;
              setReady(null);
              setPassage({ section: selection.sectionId, block: selection.blockId, ...(pointIndex === undefined ? {} : { point: pointIndex }) });
            }}
          >
            View
          </button>
          <button className="icon-button subtle" aria-label="Dismiss" onClick={() => setReady(null)}>
            <Icon name="x" />
          </button>
        </div>
      ) : null}
      {quizOpen && (
        <QuizFromReviewerDialog libraryId={artifact.id} title={artifact.title} reviewer={reviewer} onClose={() => setQuizOpen(false)} />
      )}
    </>
  );
}
