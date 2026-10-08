"use client";
import type {
  Quiz,
  QuizAttempt,
  QuizQuestion,
  QuizQuestionResult,
  QuizResult,
} from "@stay-focused/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CountUp, SpringProgress } from "../components/count-up";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, State } from "../components/ui";
import { dateLabel, requestKey } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import {
  answerText,
  canCheck,
  compatibleAttempt,
  pairDraft,
  readableQuiz,
} from "../lib/quiz";

type AttemptHistory = {
  id: string;
  status: "in_progress" | "completed" | "abandoned";
  startedAt: string;
  completedAt?: string | null;
  percentage: number | null;
}[];

export function QuizScreen({ id }: { id: string }) {
  const { api } = useAuth(),
    quiz = useResource<Quiz>(`/api/experience/quizzes/${id}`),
    history = useResource<AttemptHistory>(
      `/api/experience/quizzes/${id}/attempts`,
    ),
    action = useAction();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [activeTerm, setActiveTerm] = useState<string | null>(null),
    [finishing, setFinishing] = useState(false),
    [reviewing, setReviewing] = useState(false),
    key = useRef<string | null>(null);
  const valid = quiz.data && readableQuiz(quiz.data),
    questions = valid ? quiz.data!.questions : [],
    question = questions[index],
    feedback = attempt?.feedback.find((f) => f.questionId === question?.id),
    savedDraft =
      attempt?.answers.find((a) => a.questionId === question?.id)
        ?.selectedOptionIds ?? [],
    answered = attempt
      ? questions.filter((q) =>
          attempt.answers.some((a) => a.questionId === q.id && a.finalizedAt),
        ).length
      : 0,
    unanswered = questions.length - answered;

  function draftFor(value: QuizAttempt, position: number) {
    return (
      value.answers
        .find((a) => a.questionId === questions[position]?.id)
        ?.selectedOptionIds.slice() ?? []
    );
  }
  function open(value: QuizAttempt) {
    const next = compatibleAttempt(value),
      position =
        next.currentQuestion >= 0 && next.currentQuestion < questions.length
          ? next.currentQuestion
          : 0;
    setAttempt(next);
    setResult(null);
    setIndex(position);
    setSelected(draftFor(next, position));
    setActiveTerm(null);
    setFinishing(false);
  }
  function start() {
    void action.run(async () => {
      key.current ??= requestKey();
      const value = await api<QuizAttempt>(
        `/api/experience/quizzes/${id}/attempts`,
        { method: "POST", key: key.current },
      );
      key.current = null;
      open(value);
      history.refresh();
    });
  }
  function resume(attemptId: string, completed = false) {
    void action.run(async () => {
      if (completed) {
        setResult(
          await api<QuizResult>(
            `/api/experience/quiz-attempts/${attemptId}/result`,
          ),
        );
        setAttempt(null);
        setReviewing(false);
      } else
        open(
          await api<QuizAttempt>(`/api/experience/quiz-attempts/${attemptId}`),
        );
    });
  }
  /** Saves the unchecked draft so it survives reloads and other devices. */
  async function saveDraft(current: QuizAttempt, draft: string[]) {
    if (!question || feedback) return current;
    if (JSON.stringify(draft) === JSON.stringify(savedDraft)) return current;
    return compatibleAttempt(
      await api<QuizAttempt>(
        `/api/experience/quiz-attempts/${current.id}/answers/${question.id}`,
        { method: "PATCH", body: { selectedOptionIds: draft, finalize: false } },
      ),
    );
  }
  function choose(draft: string[]) {
    if (!attempt) return;
    setSelected(draft);
    void action.run(async () => setAttempt(await saveDraft(attempt, draft)));
  }
  function moveTo(next: number) {
    if (!attempt || next < 0 || next >= questions.length || next === index)
      return;
    void action.run(async () => {
      const saved = await saveDraft(attempt, selected);
      const value = compatibleAttempt(
        await api<QuizAttempt>(
          `/api/experience/quiz-attempts/${saved.id}/study-state`,
          { method: "PATCH", body: { action: "navigate", position: next } },
        ),
      );
      setAttempt(value);
      setIndex(next);
      setSelected(draftFor(value, next));
      setActiveTerm(null);
    });
  }
  function check() {
    if (!attempt || !question) return;
    void action.run(async () => {
      setAttempt(
        compatibleAttempt(
          await api<QuizAttempt>(
            `/api/experience/quiz-attempts/${attempt.id}/answers/${question.id}`,
            {
              method: "PATCH",
              body: { selectedOptionIds: selected, finalize: true },
            },
          ),
        ),
      );
    });
  }
  function reveal() {
    if (!attempt || !question) return;
    void action.run(async () => {
      const saved = await saveDraft(attempt, selected);
      setAttempt(
        compatibleAttempt(
          await api<QuizAttempt>(
            `/api/experience/quiz-attempts/${saved.id}/study-state`,
            {
              method: "PATCH",
              body: { action: "reveal", questionId: question.id, position: index },
            },
          ),
        ),
      );
    });
  }
  function finish() {
    if (!attempt) return;
    void action.run(async () => {
      await saveDraft(attempt, selected);
      setResult(
        await api<QuizResult>(
          `/api/experience/quiz-attempts/${attempt.id}/complete`,
          { method: "POST" },
        ),
      );
      setAttempt(null);
      setFinishing(false);
      setReviewing(false);
      history.refresh();
      quiz.refresh();
    });
  }
  // Arrow keys move between questions when focus is not in a text field.
  useEffect(() => {
    if (!attempt) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (event.key === "ArrowRight") moveTo(index + 1);
      if (event.key === "ArrowLeft") moveTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const inProgress = history.data?.find((h) => h.status === "in_progress");
  return (
    <>
      <Heading
        title={valid ? quiz.data!.title : "Quiz"}
        crumb={valid ? quiz.data!.title : "Quiz"}
        subtitle={
          valid
            ? `${quiz.data!.questionCount} questions · ${quiz.data!.difficulty} difficulty`
            : undefined
        }
        back="/library"
        action={
          <button
            className="subtle"
            disabled={action.busy}
            onClick={() => {
              quiz.refresh();
              history.refresh();
              if (attempt) resume(attempt.id);
              if (result) resume(result.attemptId, true);
            }}
          >
            Refresh
          </button>
        }
      />
      <State resource={quiz} />
      {quiz.data && !valid && (
        <Notice error>
          This quiz uses a question format this version cannot open safely.
        </Notice>
      )}

      {valid && !attempt && !result && (
        <div className="quiz-overview">
          <section className="surface stack">
            <h2>{inProgress ? "Pick up where you left off" : "Practice"}</h2>
            <p className="muted">
              Answers are saved as you go, so you can leave and resume on any
              device. Check each answer for instant feedback, or reveal it when
              you are stuck.
            </p>
            <div className="row wrap">
              {inProgress ? (
                <>
                  <button
                    className="primary"
                    disabled={action.busy}
                    onClick={() => resume(inProgress.id)}
                  >
                    Resume attempt
                  </button>
                  <button disabled={action.busy} onClick={start}>
                    Start practice
                  </button>
                </>
              ) : (
                <button
                  className="primary"
                  disabled={action.busy}
                  onClick={start}
                >
                  Start practice
                </button>
              )}
            </div>
          </section>
          <section className="stack">
            <h2>Attempt history</h2>
            <State resource={history} />
            {history.data?.length === 0 && (
              <p className="muted">No attempts yet.</p>
            )}
            {history.data
              ?.filter((h) => h.status !== "abandoned")
              .map((item) => (
                <div className="surface row between attempt-row" key={item.id}>
                  <div>
                    <strong>
                      {item.status === "completed" ? (
                        <CountUp value={item.percentage ?? 0} suffix="%" />
                      ) : (
                        "In progress"
                      )}
                    </strong>
                    <span className="meta">
                      {dateLabel(item.completedAt ?? item.startedAt)}
                    </span>
                  </div>
                  {item.status === "completed" && (
                    <button
                      disabled={action.busy}
                      onClick={() => resume(item.id, true)}
                    >
                      View result
                    </button>
                  )}
                </div>
              ))}
          </section>
        </div>
      )}

      {valid && attempt && question && !result && (
        <div className="quiz-layout">
          <div className="stack quiz-main">
            <section className="surface stack question-card" key={question.id}>
              <span className="meta">
                Question {index + 1} of {questions.length}
              </span>
              <h2>{question.prompt}</h2>
              <p className="muted">{question.selectionInstruction}</p>
              <QuestionInput
                question={question}
                selected={selected}
                activeTerm={activeTerm}
                locked={action.busy || !!feedback}
                onTerm={setActiveTerm}
                onChange={(draft) => {
                  choose(draft);
                  setActiveTerm(null);
                }}
                onType={setSelected}
                onTyped={() => choose(selected)}
              />
            </section>
            {feedback ? (
              <Feedback question={question} value={feedback} />
            ) : (
              <div className="row wrap">
                <button
                  className="primary"
                  disabled={action.busy || !canCheck(question, selected)}
                  onClick={check}
                >
                  Check answer
                </button>
                {!attempt.revealedQuestionIds.includes(question.id) && (
                  <button disabled={action.busy} onClick={reveal}>
                    Reveal answer
                  </button>
                )}
              </div>
            )}
            <div className="row between quiz-nav">
              <button
                disabled={action.busy || index === 0}
                onClick={() => moveTo(index - 1)}
              >
                Previous
              </button>
              <span className="meta desktop-only">Use ← → to move</span>
              <button
                disabled={action.busy || index + 1 >= questions.length}
                onClick={() => moveTo(index + 1)}
              >
                Next
              </button>
            </div>
          </div>
          <aside className="surface stack quiz-rail">
            <div>
              <p className="meta">
                <CountUp value={answered} /> answered ·{" "}
                <CountUp value={unanswered} /> unanswered
              </p>
              <SpringProgress
                label="Answered questions"
                max={questions.length}
                value={answered}
              />
            </div>
            <nav className="question-grid" aria-label="Questions">
              {questions.map((q, position) => {
                const state =
                  position === index
                    ? "current"
                    : attempt.revealedQuestionIds.includes(q.id)
                      ? "revealed"
                      : attempt.answers.some(
                            (a) => a.questionId === q.id && a.finalizedAt,
                          )
                        ? "answered"
                        : "open";
                return (
                  <button
                    key={q.id}
                    className={`question-dot ${state}`}
                    aria-current={position === index ? "step" : undefined}
                    aria-label={`Question ${position + 1}, ${state === "open" ? "unanswered" : state}`}
                    disabled={action.busy}
                    onClick={() => moveTo(position)}
                  >
                    {position + 1}
                  </button>
                );
              })}
            </nav>
            {finishing ? (
              <div className="stack finish-confirm" role="alert">
                <p>
                  {unanswered > 0
                    ? `You still have ${unanswered} unanswered ${unanswered === 1 ? "question" : "questions"}. They will count as skipped.`
                    : "Finish this attempt and see your results?"}
                </p>
                <div className="row wrap">
                  <button onClick={() => setFinishing(false)}>
                    Continue Quiz
                  </button>
                  <button
                    className="primary"
                    disabled={action.busy}
                    onClick={finish}
                  >
                    {unanswered > 0 ? "Finish anyway" : "Finish Quiz"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="primary"
                disabled={action.busy}
                onClick={() => setFinishing(true)}
              >
                Finish quiz
              </button>
            )}
          </aside>
        </div>
      )}

      {valid && result && (
        <div className="quiz-result">
          <section className="surface stack result-card">
            <p className="score">
              <CountUp value={result.percentage} suffix="%" />
            </p>
            <p>
              <CountUp value={result.earnedPoints} /> of {result.possiblePoints}{" "}
              points
            </p>
            <p className="meta">
              {result.correctCount} correct · {result.incorrectCount} incorrect
              · {result.skippedCount} skipped · {result.revealedCount ?? 0}{" "}
              revealed
            </p>
            <div className="row wrap">
              <button className="primary" disabled={action.busy} onClick={start}>
                Retake Quiz
              </button>
              <button
                onClick={() => {
                  setAttempt(null);
                  setResult(null);
                  history.refresh();
                }}
              >
                Attempt history
              </button>
            </div>
            <Link href="/library">Back to Library</Link>
          </section>
          <section className="stack">
            <h2>Keep building on these ideas</h2>
            {result.weakAreas.length ? (
              result.weakAreas.map((area) => (
                <div key={area.topicId} className="surface">
                  <h3>{area.label}</h3>
                  <p className="meta">
                    {area.missed} missed of {area.asked} questions
                  </p>
                </div>
              ))
            ) : (
              <p className="muted">No weak areas in this attempt.</p>
            )}
            <button onClick={() => setReviewing((v) => !v)}>
              {reviewing ? "Hide answers" : "Review answers"}
            </button>
            {reviewing &&
              result.questions.map((value, position) => {
                const q = questions.find((q) => q.id === value.questionId);
                return q ? (
                  <section className="stack" key={q.id}>
                    <h3>
                      {position + 1}. {q.prompt}
                    </h3>
                    <Feedback question={q} value={value} />
                  </section>
                ) : null;
              })}
          </section>
        </div>
      )}
      {!quiz.data && !quiz.loading && !quiz.error && (
        <Empty title="Quiz unavailable." />
      )}
      {action.message && <Notice error>{action.message}</Notice>}
    </>
  );
}

function QuestionInput({
  question,
  selected,
  activeTerm,
  locked,
  onTerm,
  onChange,
  onType,
  onTyped,
}: {
  question: QuizQuestion;
  selected: string[];
  activeTerm: string | null;
  locked: boolean;
  onTerm: (id: string | null) => void;
  onChange: (draft: string[]) => void;
  onType: (draft: string[]) => void;
  onTyped: () => void;
}) {
  if (question.matchingPairs?.length) {
    const pairs = question.matchingPairs;
    return (
      <div className="match-columns">
        <div className="stack">
          <h3>Terms</h3>
          {pairs.map((pair, position) => {
            const linked = selected
              .find((v) => v.startsWith(`${pair.id}:`))
              ?.split(":")[1];
            return (
              <div key={pair.id} className="match-term">
                <button
                  className="choice"
                  aria-pressed={activeTerm === pair.id}
                  disabled={locked}
                  onClick={() => onTerm(activeTerm === pair.id ? null : pair.id)}
                >
                  <span className="match-letter" aria-hidden="true">
                    {String.fromCharCode(65 + position)}
                  </span>
                  {pair.leftItem}
                </button>
                {linked && (
                  <span className="meta match-link">
                    → {question.options.find((o) => o.id === linked)?.text}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="stack">
          <h3>Meanings</h3>
          <p className="meta">Choose a term, then its meaning.</p>
          {question.options.map((option) => (
            <button
              key={option.id}
              className="choice"
              aria-pressed={selected.some((v) => v.endsWith(`:${option.id}`))}
              disabled={locked || !activeTerm}
              onClick={() =>
                activeTerm && onChange(pairDraft(selected, activeTerm, option.id))
              }
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (question.type === "identification")
    return (
      <label>
        Your answer
        <input
          aria-label="Type your answer"
          placeholder="Type the term"
          disabled={locked}
          value={selected[0] ?? ""}
          onChange={(e) => onType(e.target.value ? [e.target.value] : [])}
          onBlur={onTyped}
        />
      </label>
    );
  const falseId = question.options.find(
    (o) => o.text.trim().toLowerCase() === "false",
  )?.id;
  const markedFalse =
    question.type === "modified_true_false" &&
    !!falseId &&
    selected.includes(falseId);
  return (
    <div className="stack">
      {question.type === "matching" && question.leftItem && (
        <p className="match-single">{question.leftItem}</p>
      )}
      {question.options.map((option) => (
        <button
          className="choice"
          key={option.id}
          disabled={locked}
          aria-pressed={selected.includes(option.id)}
          onClick={() =>
            onChange(
              question.type === "multi_select"
                ? selected.includes(option.id)
                  ? selected.filter((s) => s !== option.id)
                  : [...selected, option.id]
                : [option.id],
            )
          }
        >
          {option.text}
        </button>
      ))}
      {markedFalse && (
        <label>
          Correct the wrong word or phrase
          <input
            aria-label="Correct the wrong term or phrase"
            placeholder="Type the correction"
            disabled={locked}
            value={selected[1] ?? ""}
            onChange={(e) => onType([falseId!, e.target.value])}
            onBlur={onTyped}
          />
        </label>
      )}
    </div>
  );
}

function Feedback({
  question,
  value,
}: {
  question: QuizQuestion;
  value: QuizQuestionResult;
}) {
  const heading = value.assisted
    ? "Revealed · no recall credit"
    : value.correct
      ? "Correct"
      : "Keep learning";
  return (
    <div className={`surface stack ${value.correct ? "success" : ""}`}>
      <h3>{heading}</h3>
      <div>
        <span className="meta">Your answer</span>
        <p>{answerText(question, value.selectedOptionIds)}</p>
      </div>
      {(!value.correct || value.assisted) && (
        <div>
          <span className="meta">Correct answer</span>
          <p>{answerText(question, value.correctOptionIds)}</p>
        </div>
      )}
      {value.pairCount ? (
        <p className="meta">
          {value.pairCorrectCount ?? 0} of {value.pairCount} pairs correct
        </p>
      ) : null}
      <p>{value.explanation}</p>
    </div>
  );
}
