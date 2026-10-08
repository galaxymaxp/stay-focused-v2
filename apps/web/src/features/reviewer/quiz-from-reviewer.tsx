"use client";
import {
  quizCountOptions,
  quizSourceCapacity,
  type QuizDifficulty,
  type QuizGenerationRequest,
  type QuizQuestionType,
  type ReviewerReaderModel,
} from "@stay-focused/shared";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../components/providers";
import { Icon } from "../../components/ui";
import { generationEnabled, generationKey } from "../../lib/generation";

// Web port of QuizFromReviewerSheet in apps/mobile/src/features/reviewer/ReviewerReader.tsx.

const DIFFICULTIES: readonly { value: QuizDifficulty | "mixed"; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
];
const FORMATS: readonly { value: QuizQuestionType | "mixed"; label: string }[] = [
  { value: "mixed", label: "Mixed" },
  { value: "single_select", label: "Multiple Choice" },
  { value: "identification", label: "Identification" },
  { value: "true_false", label: "True or False" },
  { value: "modified_true_false", label: "Modified True or False" },
  { value: "matching", label: "Matching" },
];
const ALL_TYPES: QuizQuestionType[] = ["single_select", "identification", "true_false", "modified_true_false", "matching"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A saved Reviewer's Library id is `artifact:<id>`; that id is the Quiz source. */
export function reviewerArtifactIdFromLibraryId(libraryId: string): string | null {
  const [prefix, id] = libraryId.split(":");
  return (prefix === "artifact" || prefix === "reviewer") && id && UUID.test(id) ? id : null;
}

export function QuizFromReviewerDialog({
  libraryId,
  title,
  reviewer,
  onClose,
}: {
  libraryId: string;
  title: string;
  reviewer: ReviewerReaderModel;
  onClose: () => void;
}) {
  const { api, session } = useAuth();
  const router = useRouter();
  const reviewerArtifactId = reviewerArtifactIdFromLibraryId(libraryId);
  const [count, setCount] = useState("10");
  const [customCount, setCustomCount] = useState("25");
  const [selectedTopics, setSelectedTopics] = useState(() => reviewer.sections.map((s) => s.id));
  const capacity = useMemo(
    () => quizSourceCapacity(reviewer.sections.filter((s) => selectedTopics.includes(s.id))),
    [reviewer, selectedTopics],
  );
  const countOptions = useMemo(() => quizCountOptions(capacity.maximum), [capacity.maximum]);
  const questionCount = Number(count === "custom" ? customCount : count);
  const validCount = Number.isInteger(questionCount) && questionCount >= 5 && questionCount <= capacity.maximum;
  useEffect(() => {
    if (count !== "custom" && Number(count) > capacity.maximum && countOptions.length)
      setCount(String(countOptions.at(-1)));
  }, [capacity.maximum, count, countOptions]);
  const [difficulty, setDifficulty] = useState<QuizDifficulty | "mixed">("mixed");
  const [format, setFormat] = useState<QuizQuestionType | "mixed">("mixed");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function create() {
    if (!session || !reviewerArtifactId || busy || !validCount || selectedTopics.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      if (!generationEnabled) throw new Error("Generation is unavailable in this environment.");
      const body: QuizGenerationRequest = {
        sourceType: "reviewer",
        sourceIds: [reviewerArtifactId],
        reviewerArtifactId,
        questionCount,
        difficulty,
        questionTypes: format === "mixed" ? ALL_TYPES : [format],
        selectedTopicIds: selectedTopics,
      };
      const submission = generationKey(session.user.id, "quiz", body);
      const job = await api<{ id: string }>("/api/experience/quizzes", { method: "POST", body, key: submission.key });
      submission.accepted();
      onClose();
      router.push(`/generation/${job.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare this Quiz request.");
    } finally {
      setBusy(false);
    }
  }
  const segments = countOptions.length
    ? [
        ...countOptions.map((v) => ({
          value: String(v),
          label: v === capacity.maximum && v !== 100 ? `${v} max` : String(v),
        })),
        { value: "custom", label: "Custom" },
      ]
    : [];
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog surface stack" role="dialog" aria-modal="true" aria-labelledby="new-quiz-title" tabIndex={-1} ref={dialog}>
        <div className="row between">
          <h2 id="new-quiz-title">New Quiz</h2>
          <button className="icon-button subtle" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div>
          <span className="meta">Source</span>
          <strong>{title}</strong>
        </div>
        <fieldset className="stack plain-fieldset">
          <legend className="meta">Questions</legend>
          {segments.length > 0 && (
            <div className="segments">
              {segments.map((s) => (
                <button key={s.value} aria-pressed={count === s.value} onClick={() => setCount(s.value)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          {capacity.maximum >= 5 && (
            <p className="meta">{capacity.maximum}-question maximum, based on the topics and key points in this material.</p>
          )}
          {count === "custom" && (
            <input
              aria-label={`Custom question count, 5 to ${capacity.maximum}`}
              inputMode="numeric"
              value={customCount}
              maxLength={3}
              onChange={(e) => setCustomCount(e.target.value.replace(/\D/g, ""))}
            />
          )}
          {!validCount && (
            <p className="meta danger-text">
              {capacity.maximum < 5
                ? "This material needs more distinct study points for a Quiz."
                : `Choose 5 to ${capacity.maximum} questions.`}
            </p>
          )}
        </fieldset>
        <fieldset className="stack plain-fieldset">
          <legend className="meta">
            Topics · {selectedTopics.length} of {reviewer.sections.length}
          </legend>
          <div className="row">
            <button className="subtle" onClick={() => setSelectedTopics(reviewer.sections.map((s) => s.id))}>
              Select all
            </button>
            <button className="subtle" onClick={() => setSelectedTopics([])}>
              Clear all
            </button>
          </div>
          <div className="topic-checklist">
            {reviewer.sections.map((section) => (
              <label key={section.id} className="check-row">
                <input
                  type="checkbox"
                  checked={selectedTopics.includes(section.id)}
                  onChange={(e) =>
                    setSelectedTopics((current) =>
                      e.target.checked ? [...current, section.id] : current.filter((id) => id !== section.id),
                    )
                  }
                />
                {section.title}
              </label>
            ))}
          </div>
          {selectedTopics.length === 0 && <p className="meta danger-text">Select at least one topic.</p>}
        </fieldset>
        <fieldset className="stack plain-fieldset">
          <legend className="meta">Difficulty</legend>
          <div className="segments">
            {DIFFICULTIES.map((d) => (
              <button key={d.value} aria-pressed={difficulty === d.value} onClick={() => setDifficulty(d.value)}>
                {d.label}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="stack plain-fieldset">
          <legend className="meta">Question format</legend>
          <div className="row wrap" role="radiogroup" aria-label="Question format">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                role="radio"
                aria-checked={format === f.value}
                className={`chip${format === f.value ? " on" : ""}`}
                onClick={() => setFormat(f.value)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </fieldset>
        {!reviewerArtifactId && (
          <p className="notice">This Reviewer isn’t saved to your account yet, so it can’t be used for a Quiz.</p>
        )}
        <p className="meta">Your quiz starts generating as soon as you create it. You can leave while it works.</p>
        {error && <p className="notice error">{error}</p>}
        <div className="row dialog-actions">
          <button className="subtle" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={busy || !reviewerArtifactId || !validCount || selectedTopics.length === 0 || !generationEnabled}
            onClick={() => void create()}
          >
            {busy ? "Starting…" : "Create Quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
