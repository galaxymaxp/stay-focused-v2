"use client";
import type {
  Quiz,
  QuizAttempt,
  QuizAttemptSummary,
  QuizMatchPair,
  QuizResult,
  QuizQuestionResult,
} from "@stay-focused/shared";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CountUp, SpringProgress } from "../components/count-up";
import { useAuth } from "../components/providers";
import { Empty, Heading, Notice, State } from "../components/ui";
import { dateLabel, requestKey } from "../lib/api";
import { useAction, useResource } from "../lib/hooks";
import { answerLabels, changePair, readableQuiz } from "../lib/quiz";
export function QuizScreen({ id }: { id: string }) {
  const { api } = useAuth(),
    quiz = useResource<Quiz>(`/api/experience/quizzes/${id}`),
    history = useResource<QuizAttemptSummary[]>(
      `/api/experience/quizzes/${id}/attempts`,
    ),
    action = useAction();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null),
    [result, setResult] = useState<QuizResult | null>(null),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [pairs, setPairs] = useState<QuizMatchPair[]>([]),
    [finish, setFinish] = useState(false),
    key = useRef<string | null>(null);
  const valid = quiz.data && readableQuiz(quiz.data),
    question = valid ? quiz.data!.questions[index] : null,
    feedback = attempt?.feedback.find((f) => f.questionId === question?.id),
    saved = attempt?.answers.find((a) => a.questionId === question?.id);
  useEffect(() => {
    setSelected(
      saved && saved.type !== "matching" ? [...saved.selectedOptionIds] : [],
    );
    setPairs(saved?.type === "matching" ? [...saved.pairs] : []);
  }, [saved, index]);
  function restore(value: QuizAttempt) {
    setAttempt(value);
    setResult(null);
    const first =
      quiz.data?.questions.findIndex(
        (q) =>
          !value.answers.some(
            (a) => a.questionId === q.id && a.finalizedAt !== null,
          ),
      ) ?? 0;
    setIndex(Math.max(0, first));
    history.refresh();
  }
  function start() {
    void action.run(async () => {
      key.current ??= requestKey();
      const value = await api<QuizAttempt>(
        `/api/experience/quizzes/${id}/attempts`,
        { method: "POST", key: key.current },
      );
      key.current = null;
      restore(value);
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
      } else
        restore(
          await api<QuizAttempt>(`/api/experience/quiz-attempts/${attemptId}`),
        );
    });
  }
  function save(
    nextSelected: string[],
    nextPairs: QuizMatchPair[],
    finalize = false,
  ) {
    if (!attempt || !question) return;
    setSelected(nextSelected);
    setPairs(nextPairs);
    void action.run(async () => {
      const value = await api<QuizAttempt>(
        `/api/experience/quiz-attempts/${attempt.id}/answers/${question.id}`,
        {
          method: "PATCH",
          body:
            question.type === "matching"
              ? { type: "matching", pairs: nextPairs, finalize }
              : { selectedOptionIds: nextSelected, finalize },
        },
      );
      setAttempt(value);
      history.refresh();
    });
  }
  const checked =
    quiz.data?.questions.filter((q) =>
      attempt?.answers.some(
        (a) => a.questionId === q.id && a.finalizedAt !== null,
      ),
    ).length ?? 0;
  const canCheck =
    question?.type === "matching"
      ? pairs.length === question.leftItems.length
      : selected.length > 0;
  return (
    <>
      <Heading
        title="Quiz"
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
      <div className="stack quiz-content">
        <State resource={quiz} />
        {quiz.data && !valid && (
          <Notice error>
            This quiz uses an unsupported question format. It cannot be safely
            opened in this version.
          </Notice>
        )}
        {valid && !attempt && !result && (
          <>
            <h2>{quiz.data!.title}</h2>
            <p className="muted">
              {quiz.data!.questionCount} questions · {quiz.data!.difficulty}{" "}
              difficulty
            </p>
            <button className="primary" disabled={action.busy} onClick={start}>
              Start practice
            </button>
            <h2>Attempt history</h2>
            <State resource={history} />
            {history.data?.length === 0 && (
              <p className="muted">No attempts yet.</p>
            )}
            {history.data?.map((item) => (
              <div className="surface row between" key={item.id}>
                <div>
                  <strong>
                    {item.status === "completed" ? (
                      <CountUp value={item.percentage ?? 0} suffix="%" />
                    ) : item.status === "in_progress"
                        ? "In progress"
                        : "Abandoned"}
                  </strong>
                  <span className="meta">
                    {dateLabel(item.completedAt ?? item.startedAt)}
                  </span>
                </div>
                {item.status !== "abandoned" && (
                  <button
                    disabled={action.busy}
                    onClick={() => resume(item.id, item.status === "completed")}
                  >
                    {item.status === "completed"
                      ? "View result"
                      : "Resume attempt"}
                  </button>
                )}
              </div>
            ))}
          </>
        )}
        {valid && attempt && question && !result && (
          <>
            <h2>{quiz.data!.title}</h2>
            <p className="meta">
              {checked} checked · {quiz.data!.questionCount - checked} remaining
            </p>
            <SpringProgress
              label="Checked questions"
              max={quiz.data!.questionCount}
              value={checked}
            />
            <section className="surface stack">
              <h2>{question.prompt}</h2>
              <p className="muted">{question.selectionInstruction}</p>
              {question.type === "matching"
                ? question.leftItems.map((item) => (
                    <label key={item.id}>
                      {item.label}
                      <select
                        aria-label={`Match ${item.label}`}
                        disabled={action.busy || !!feedback}
                        value={
                          pairs.find((p) => p.leftItemId === item.id)
                            ?.rightItemId ?? ""
                        }
                        onChange={(e) =>
                          save([], changePair(pairs, item.id, e.target.value))
                        }
                      >
                        <option value="">Choose an answer</option>
                        {question.rightItems.map((right) => (
                          <option key={right.id} value={right.id}>
                            {right.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))
                : question.options.map((option) => (
                    <button
                      className="choice"
                      key={option.id}
                      disabled={action.busy || !!feedback}
                      aria-pressed={selected.includes(option.id)}
                      onClick={() =>
                        save(
                          question.type === "multi_select"
                            ? selected.includes(option.id)
                              ? selected.filter((s) => s !== option.id)
                              : [...selected, option.id]
                            : [option.id],
                          [],
                        )
                      }
                    >
                      {option.text}
                    </button>
                  ))}
            </section>
            {!feedback && (
              <>
                <button
                  className="primary"
                  disabled={action.busy || !canCheck}
                  onClick={() => save(selected, pairs, true)}
                >
                  Check answer
                </button>
                {action.message && (
                  <button
                    disabled={action.busy}
                    onClick={() => save(selected, pairs)}
                  >
                    Retry saving selection
                  </button>
                )}
              </>
            )}
            {feedback && <Feedback question={question} value={feedback} />}
            <div className="row between">
              <button
                disabled={action.busy || index === 0}
                onClick={() => setIndex((i) => i - 1)}
              >
                Previous
              </button>
              <span className="meta">
                Question {index + 1} of {quiz.data!.questionCount}
              </span>
              <button
                disabled={action.busy || index + 1 >= quiz.data!.questionCount}
                onClick={() => setIndex((i) => i + 1)}
              >
                Next
              </button>
            </div>
            <label>
              Go to question
              <select
                aria-label="Go to question"
                disabled={action.busy}
                value={index}
                onChange={(e) => setIndex(Number(e.target.value))}
              >
                {quiz.data!.questions.map((q, i) => (
                  <option value={i} key={q.id}>
                    Question {i + 1}
                    {attempt.answers.some(
                      (a) => a.questionId === q.id && a.finalizedAt,
                    )
                      ? " · checked"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="primary"
              disabled={action.busy || checked !== quiz.data!.questionCount}
              onClick={() => setFinish(true)}
            >
              See results
            </button>
            {checked !== quiz.data!.questionCount && (
              <p className="meta">
                Check every answer before completing your quiz.
              </p>
            )}
            {finish && (
              <div className="surface stack" role="alert">
                <p>Finish this attempt and view your results?</p>
                <div className="row">
                  <button onClick={() => setFinish(false)}>
                    Continue Quiz
                  </button>
                  <button
                    className="primary"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(async () => {
                        setResult(
                          await api<QuizResult>(
                            `/api/experience/quiz-attempts/${attempt.id}/complete`,
                            { method: "POST" },
                          ),
                        );
                        setFinish(false);
                        history.refresh();
                        quiz.refresh();
                      })
                    }
                  >
                    Finish Quiz
                  </button>
                </div>
              </div>
            )}
          </>
        )}
        {valid && result && (
          <>
            <h2>{quiz.data!.title}</h2>
            <p className="score">
              <CountUp value={result.percentage} suffix="%" />
            </p>
            <p>
              <CountUp value={result.correctCount} /> of{" "}
              {result.totalQuestions} correct
            </p>
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
            <details>
              <summary>Review answers</summary>
              <div className="stack">
                {result.questions.map((value) => {
                  const q = quiz.data!.questions.find(
                    (q) => q.id === value.questionId,
                  );
                  return q ? (
                    <section className="stack" key={q.id}>
                      <h3>{q.prompt}</h3>
                      <Feedback question={q} value={value} />
                    </section>
                  ) : null;
                })}
              </div>
            </details>
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
            <Link href="/library">Back to Library</Link>
          </>
        )}
        {!quiz.data && !quiz.loading && !quiz.error && (
          <Empty title="Quiz unavailable." />
        )}
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
function Feedback({
  question,
  value,
}: {
  question: Quiz["questions"][number];
  value: QuizQuestionResult;
}) {
  return (
    <div className={`surface stack ${value.correct ? "success" : ""}`}>
      <h3>{value.correct ? "Correct" : "Keep learning"}</h3>
      <p>{value.explanation}</p>
      <div>
        <span className="meta">Your answer</span>
        {answerLabels(question, value).map((text, i) => (
          <p key={i}>{text}</p>
        ))}
      </div>
      {!value.correct && (
        <div>
          <span className="meta">Correct answer</span>
          {answerLabels(question, value, true).map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      )}
    </div>
  );
}
