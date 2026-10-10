/** Suggested titles follow the chosen topic/count until the learner edits them. */
export function suggestedQuizTitle(reviewerTitle: string, topics: readonly string[], questionCount: number): string {
  const subject = (topics.length === 1 ? topics[0] : reviewerTitle)?.trim() || "Study Quiz";
  const suffix = Number.isInteger(questionCount) && questionCount > 0 ? ` — ${questionCount} questions` : " — Quiz";
  return `${subject.slice(0, 200 - suffix.length)}${suffix}`;
}
