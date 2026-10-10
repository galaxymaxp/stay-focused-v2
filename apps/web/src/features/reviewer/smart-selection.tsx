"use client";
import {
  STUDY_ACTIONS,
  STUDY_ACTION_LABELS,
  STUDY_ACTION_TITLES,
  STUDY_ASK_SUGGESTIONS,
  STUDY_GROUNDING_DETAILS,
  STUDY_GROUNDING_LABELS,
  STUDY_LIMITS,
  STUDY_MODIFIER_LABELS,
  STUDY_OFFLINE,
  STUDY_QUESTION_TOO_LONG,
  STUDY_REFINEMENTS,
  STUDY_SELECTION_TOO_LARGE,
  STUDY_TOOLS_PROMPT_VERSION,
  checkStudySelection,
  isStudyToolResult,
  studyCacheKey,
  studyReusable,
  studySurface,
  type AssistSelection,
  type StudyAction,
  type StudyFollowUp,
  type StudyGrounding,
  type StudyModifier,
  type StudyToolRequest,
  type StudyToolResult,
} from "@stay-focused/shared";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAuth } from "../../components/providers";
import { ApiError, type Api } from "../../lib/api";

// Web port of apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx and
// services/studyTools.ts. On the web the student selects with the pointer
// (or arrives with text already selected in the reader).

const MESSAGES: Record<string, string> = {
  connection: STUDY_OFFLINE,
  study_selection_too_large: STUDY_SELECTION_TOO_LARGE,
  study_question_too_long: STUDY_QUESTION_TOO_LONG,
  study_answer_too_long: "Shorten your answer to the key idea and check it again.",
  study_follow_up_limit: "This question has reached its follow-up limit. Start a new question.",
  sign_in_required: "Your session needs to be refreshed. Sign in again to use this learning tool.",
  permission_denied: "This Reviewer isn’t available to your account.",
  not_found: "This part of the Reviewer is no longer available. Reopen the Reviewer and try again.",
  not_ready: "The course material for this passage isn’t available right now.",
  conflict: "This Reviewer changed. Reopen it and try again.",
  rate_limited: "You’re using learning tools quickly. Wait a moment and try again.",
  server_error: "The learning tool is temporarily unavailable. Try again shortly.",
  invalid_response: "The learning tool is temporarily unavailable. Try again shortly.",
  invalid_request: "Check your selection and try again.",
};
class StudyToolsError extends Error {}

/** Identical requests reuse their result for this panel; novelty variants never do. */
function createStudyToolsSession(api: Api) {
  const results = new Map<string, Promise<StudyToolResult>>();
  return (request: StudyToolRequest): Promise<StudyToolResult> => {
    const key = studyCacheKey(request);
    const existing = results.get(key);
    if (existing) return existing;
    const work = api<unknown>("/api/experience/study-tools", { method: "POST", body: request }).then(
      (value) => {
        if (!isStudyToolResult(value, request)) throw new StudyToolsError(MESSAGES.invalid_response!);
        return value;
      },
      (error: unknown) => {
        const code = error instanceof ApiError ? error.code : "server_error";
        throw new StudyToolsError(MESSAGES[code] ?? MESSAGES.server_error!);
      },
    );
    results.set(key, work);
    work.then(
      () => {
        if (!studyReusable(request)) results.delete(key);
      },
      () => results.delete(key),
    );
    return work;
  };
}

type Run = { status: "pending" } | { status: "ready"; result: StudyToolResult } | { status: "error"; message: string };
type Extra = Pick<StudyToolRequest, "modifier" | "question" | "answer" | "previous" | "followUps">;
type TestState = { question: Run | null; answer: string; checked: Run | null; choices: Run | null; explained: Run | null };
type AskTurn = { question: string; run: Run };
const EMPTY_TEST: TestState = { question: null, answer: "", checked: null, choices: null, explained: null };
const VERDICTS = { correct: "Correct", partial: "Partially correct", incorrect: "Try again" } as const;

/**
 * Smart Selection: choose exact words from the concept, then Define, Explain,
 * Example, Test Me or Ask runs on them. Refinements generate only when chosen.
 */
export function SmartSelectionPanel({
  selection,
  initialText,
  initialAction,
  askText,
  onActiveChange,
}: {
  selection: AssistSelection;
  /** Text already selected in the reader, if the panel opened from it. */
  initialText?: string;
  /** Action chosen with that text in the reader; runs once on open. */
  initialAction?: StudyAction;
  askText?: string;
  onActiveChange?: (active: boolean) => void;
}) {
  const { api } = useAuth();
  const surface = useMemo(() => studySurface(selection.block), [selection.block]);
  const [picked, setPicked] = useState(initialText ?? "");
  const check = checkStudySelection(selection.block, picked);
  const [action, setAction] = useState<StudyAction | null>(null);
  const [subject, setSubject] = useState("");
  const [shown, setShown] = useState<{ modifier?: StudyModifier; run: Run } | null>(null);
  const [test, setTest] = useState<TestState>(EMPTY_TEST);
  const [turns, setTurns] = useState<AskTurn[]>([]);
  const [draft, setDraft] = useState("");
  const session = useRef(createStudyToolsSession(api)).current;
  const first = useRef<string | undefined>(undefined);
  const mounted = useRef(true);
  const surfaceRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Set on every mount: development remounts run the cleanup once first.
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const selecting = action !== null || check.ok || (!check.ok && check.reason === "too_large");
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !initialAction || !check.ok) return;
    started.current = true;
    choose(initialAction);
    // Runs once, for the action picked in the reader.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAction]);
  useEffect(() => onActiveChange?.(selecting), [selecting, onActiveChange]);

  function readSelection() {
    const current = window.getSelection();
    const node = surfaceRef.current;
    if (!current || !node || current.rangeCount === 0) return;
    const range = current.getRangeAt(0);
    if (!node.contains(range.commonAncestorContainer)) return;
    setPicked(current.toString());
  }
  function run(text: string, act: StudyAction, extra: Extra, apply: (run: Run) => void) {
    apply({ status: "pending" });
    const request: StudyToolRequest = {
      reviewerId: selection.reviewerId,
      sectionId: selection.sectionId,
      blockId: selection.blockId,
      contentHash: selection.contentHash,
      promptVersion: STUDY_TOOLS_PROMPT_VERSION,
      selection: text,
      action: act,
      ...(Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)) as Extra),
    };
    session(request).then(
      (result) => mounted.current && apply({ status: "ready", result }),
      (error: unknown) =>
        mounted.current &&
        apply({
          status: "error",
          message: error instanceof StudyToolsError ? error.message : MESSAGES.server_error!,
        }),
    );
  }
  function choose(next: StudyAction, contextText?: string) {
    const text = contextText ?? (action ? subject : check.ok ? check.text : "");
    if (!text) return;
    setAction(next);
    setSubject(text);
    first.current = undefined;
    setShown(null);
    setTest(EMPTY_TEST);
    setTurns([]);
    setDraft("");
    if (next === "test") run(text, "test", {}, (question) => setTest({ ...EMPTY_TEST, question }));
    else if (next !== "ask")
      run(text, next, {}, (value) => {
        first.current = value.status === "ready" ? value.result.text : undefined;
        setShown({ run: value });
      });
  }
  function refine(modifier: StudyModifier) {
    if (!action || action === "test" || action === "ask") return;
    // "Another" must differ from what is shown; other refinements rework the first result.
    const base = modifier === "another" && shown?.run.status === "ready" ? shown.run.result.text : first.current;
    run(subject, action, { modifier, ...(base ? { previous: base.slice(0, STUDY_LIMITS.previous) } : {}) }, (value) =>
      setShown({ modifier, run: value }),
    );
  }
  const question = test.question?.status === "ready" ? test.question.result.question : undefined;
  function nextQuestion(modifier?: "another" | "harder" | "apply") {
    run(subject, "test", { ...(modifier ? { modifier } : {}), ...(question ? { previous: question } : {}) }, (value) =>
      setTest({ ...EMPTY_TEST, question: value }),
    );
  }
  function checkAnswer() {
    if (!question || !test.answer.trim() || test.answer.length > STUDY_LIMITS.answer) return;
    run(subject, "test", { modifier: "check", question, answer: test.answer.trim() }, (checked) =>
      setTest((current) => ({ ...current, checked })),
    );
  }
  function explainAnswer(q: string | undefined) {
    run(subject, "test", { modifier: "explain_answer", question: q }, (explained) =>
      setTest((current) => ({ ...current, explained })),
    );
  }
  function ask(text = draft) {
    const asked = text.trim();
    if (!asked || asked.length > STUDY_LIMITS.question || turns.length > STUDY_LIMITS.followUps) return;
    const followUps: StudyFollowUp[] = turns.flatMap((turn) =>
      turn.run.status === "ready" && turn.run.result.text
        ? [{ question: turn.question, answer: turn.run.result.text.slice(0, STUDY_LIMITS.previous) }]
        : [],
    );
    const index = turns.length;
    setDraft("");
    setTurns((current) => [...current, { question: asked, run: { status: "pending" } }]);
    run(subject, "ask", { question: asked, ...(followUps.length ? { followUps } : {}) }, (value) =>
      setTurns((current) => current.map((turn, i) => (i === index ? { ...turn, run: value } : turn))),
    );
  }

  return (
    <div className="stack smart-selection">
      {action ? (
        <div className="selected-quote">
          <div className="row between">
            <span className="kicker">Selected</span>
            <button className="subtle link-button" onClick={() => setAction(null)}>
              Change selection
            </button>
          </div>
          <p>“{subject}”</p>
        </div>
      ) : (
        <div className="stack">
          <p className="meta">Select any words below to study exactly that part.</p>
          <div
            ref={surfaceRef}
            className="selection-surface"
            data-testid="smart-selection-surface"
            onMouseUp={readSelection}
            onKeyUp={readSelection}
            tabIndex={0}
            aria-label="Concept text. Select the words you want to study."
          >
            {surface}
          </div>
          {check.ok ? (
            <p className="selected-line">
              <span className="kicker">Selected</span> “{check.text}”
            </p>
          ) : check.reason === "too_large" ? (
            <p className="notice">{STUDY_SELECTION_TOO_LARGE}</p>
          ) : null}
        </div>
      )}
      {selecting && (
        <div className="study-actions" role="tablist" aria-label="Learning tools">
          {STUDY_ACTIONS.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={action === item}
              disabled={!action && !check.ok}
              className={action === item ? "on" : undefined}
              onClick={() => choose(item)}
            >
              {STUDY_ACTION_LABELS[item]}
            </button>
          ))}
        </div>
      )}
      {!selecting && askText && (
        <button className="subtle" onClick={() => choose("ask", askText)}>Ask about this concept or key point</button>
      )}
      {action && action !== "test" && action !== "ask" && (
        <div className="stack">
          <h3>
            {shown?.modifier
              ? `${STUDY_ACTION_TITLES[action]} · ${STUDY_MODIFIER_LABELS[shown.modifier]}`
              : STUDY_ACTION_TITLES[action]}
          </h3>
          {shown && (
            <RunView run={shown.run} retry={() => (shown.modifier ? refine(shown.modifier) : choose(action))}>
              {(result) => <ResultCard result={result} />}
            </RunView>
          )}
          <Chips items={STUDY_REFINEMENTS[action]} selected={shown?.modifier} disabled={shown?.run.status === "pending"} onPress={refine} />
        </div>
      )}
      {action === "test" && (
        <div className="stack">
          <h3>{STUDY_ACTION_TITLES.test}</h3>
          {test.question && (
            <RunView run={test.question} retry={() => nextQuestion()}>
              {(result) =>
                result.outcome === "insufficient" ? (
                  <p className="notice">{result.text}</p>
                ) : (
                  <div className="stack">
                    <p className="test-question">{result.question}</p>
                    {test.choices?.status === "ready" && test.choices.result.choices ? (
                      <div className="stack" role="radiogroup" aria-label="Choices">
                        {test.choices.result.choices.map((choice) => (
                          <button
                            key={choice}
                            role="radio"
                            aria-checked={test.answer === choice}
                            className={`choice${test.answer === choice ? " on" : ""}`}
                            disabled={!!test.checked}
                            onClick={() => setTest((c) => ({ ...c, answer: choice }))}
                          >
                            {choice}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        aria-label="Your answer"
                        placeholder="Your answer…"
                        value={test.answer}
                        disabled={!!test.checked}
                        onChange={(e) => setTest((c) => ({ ...c, answer: e.target.value }))}
                      />
                    )}
                    {test.answer.length > STUDY_LIMITS.answer && (
                      <p className="meta danger-text">Shorten your answer to the key idea.</p>
                    )}
                    {!test.checked || test.checked.status === "error" ? (
                      <>
                        <button
                          className="primary"
                          disabled={!test.answer.trim() || test.answer.length > STUDY_LIMITS.answer}
                          onClick={checkAnswer}
                        >
                          Check Answer
                        </button>
                        {test.checked?.status === "error" && <p className="notice">{test.checked.message}</p>}
                        <div className="row">
                          {!test.choices && (
                            <button
                              className="subtle link-button"
                              onClick={() =>
                                run(subject, "test", { modifier: "choices", question: result.question }, (choices) =>
                                  setTest((c) => ({ ...c, choices })),
                                )
                              }
                            >
                              Need choices?
                            </button>
                          )}
                          <button className="subtle link-button" onClick={() => explainAnswer(result.question)}>
                            Show answer
                          </button>
                        </div>
                        {test.choices?.status === "pending" && <span className="shimmer-line" />}
                        {test.choices?.status === "error" && <p className="notice">{test.choices.message}</p>}
                      </>
                    ) : (
                      <RunView run={test.checked} retry={checkAnswer}>
                        {(checked) =>
                          checked.outcome === "insufficient" ? (
                            <p className="notice">{checked.text}</p>
                          ) : (
                            <div className={`result-card verdict-${checked.verdict ?? "incorrect"}`}>
                              <strong className="verdict">{VERDICTS[checked.verdict ?? "incorrect"]}</strong>
                              <p>{checked.text}</p>
                            </div>
                          )
                        }
                      </RunView>
                    )}
                    {test.explained && (
                      <RunView run={test.explained} retry={() => explainAnswer(result.question)}>
                        {(explained) => <ResultCard result={explained} />}
                      </RunView>
                    )}
                    {test.checked?.status === "ready" && (
                      <Chips
                        items={STUDY_REFINEMENTS.test}
                        disabled={test.explained?.status === "pending"}
                        onPress={(modifier) =>
                          modifier === "explain_answer"
                            ? explainAnswer(result.question)
                            : nextQuestion(modifier as "another" | "harder" | "apply")
                        }
                      />
                    )}
                  </div>
                )
              }
            </RunView>
          )}
        </div>
      )}
      {action === "ask" && (
        <div className="stack">
          <h3>{STUDY_ACTION_TITLES.ask}</h3>
          {turns.map((turn, index) => (
            <div key={index} className="stack ask-turn">
              <strong>{turn.question}</strong>
              <RunView run={turn.run}>{(result) => <ResultCard result={result} />}</RunView>
            </div>
          ))}
          {turns.length > STUDY_LIMITS.followUps ? (
            <button onClick={() => setTurns([])}>New question</button>
          ) : turns.some((t) => t.run.status === "pending") ? null : (
            <>
              {turns.length === 0 && (
                <div className="row wrap">
                  {STUDY_ASK_SUGGESTIONS.map((s) => (
                    <button key={s} className="chip" onClick={() => ask(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                aria-label={turns.length ? "Ask a follow-up" : "Ask about the selected text"}
                placeholder={turns.length ? "Ask a follow-up…" : "Ask something about the selected text…"}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
                }}
              />
              <div className="row between">
                <span className={`meta${draft.length > STUDY_LIMITS.question ? " danger-text" : ""}`}>
                  {draft.length > STUDY_LIMITS.question
                    ? STUDY_QUESTION_TOO_LONG
                    : `${draft.length}/${STUDY_LIMITS.question}${turns.length ? ` · ${STUDY_LIMITS.followUps + 1 - turns.length} follow-up${STUDY_LIMITS.followUps + 1 - turns.length === 1 ? "" : "s"} left` : ""}`}
                </span>
                <button className="primary" disabled={!draft.trim() || draft.length > STUDY_LIMITS.question} onClick={() => ask()}>
                  Ask
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RunView({ run, retry, children }: { run: Run; retry?: () => void; children: (result: StudyToolResult) => ReactNode }) {
  if (run.status === "pending")
    return (
      <div className="stack shimmer-block" aria-live="polite" aria-label="Working">
        <span className="shimmer-line" style={{ width: "92%" }} />
        <span className="shimmer-line" style={{ width: "84%" }} />
        <span className="shimmer-line" style={{ width: "60%" }} />
      </div>
    );
  if (run.status === "error")
    return (
      <div className="stack">
        <p className="notice">{run.message}</p>
        {retry && (
          <button className="subtle link-button" onClick={retry}>
            Try again
          </button>
        )}
      </div>
    );
  return <>{children(run.result)}</>;
}

function ResultCard({ result }: { result: StudyToolResult }) {
  return (
    <div className="result-card" aria-live="polite">
      {result.outcome !== "not_applicable" && <GroundingBadge grounding={result.grounding} />}
      <p>{result.text}</p>
    </div>
  );
}

/** Student-facing provenance; clicking explains it. */
export function GroundingBadge({ grounding }: { grounding: StudyGrounding }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="stack grounding">
      <button
        className={`grounding-badge ${grounding}`}
        aria-expanded={open}
        aria-label={`${STUDY_GROUNDING_LABELS[grounding]}. Show details`}
        onClick={() => setOpen((v) => !v)}
      >
        {STUDY_GROUNDING_LABELS[grounding]}
      </button>
      {open && <p className="meta">{STUDY_GROUNDING_DETAILS[grounding]}</p>}
    </div>
  );
}

function Chips<T extends StudyModifier>({
  items,
  selected,
  disabled,
  onPress,
}: {
  items: readonly T[];
  selected?: StudyModifier;
  disabled?: boolean;
  onPress: (item: T) => void;
}) {
  return (
    <div className="row wrap">
      {items.map((item) => (
        <button
          key={item}
          className={`chip${selected === item ? " on" : ""}`}
          aria-pressed={selected === item}
          disabled={disabled}
          onClick={() => onPress(item)}
        >
          {STUDY_MODIFIER_LABELS[item]}
        </button>
      ))}
    </div>
  );
}
