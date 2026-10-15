"use client";
import { useState } from "react";
import type { GradeEstimate } from "@stay-focused/shared/grade-estimator";
import { useAuth } from "../components/providers";
import { Notice } from "../components/ui";
import { useAction } from "../lib/hooks";

export function GradeGoal({ courseId }: { courseId: string }) {
  const { api } = useAuth();
  const [target, setTarget] = useState("85"), [result, setResult] = useState<GradeEstimate | null>(null);
  const action = useAction();
  async function calculate() {
    if (!/^\d+(?:\.\d)?$/.test(target) || Number(target) < 1 || Number(target) > 100) throw new Error("Enter a target between 1 and 100.");
    const value = await api<{ estimate: GradeEstimate }>(`/api/canvas/courses/${encodeURIComponent(courseId)}/grades/estimate?target=${encodeURIComponent(target)}`, { envelope: "root" });
    setResult(value.estimate);
  }
  return <section className="surface stack" aria-label="Grade goal">
    <h2>Grade goal</h2>
    <label>Target percentage<input type="number" min="1" max="100" step="0.1" value={target} onChange={event => { setTarget(event.target.value); setResult(null); }} /></label>
    <button disabled={action.busy} onClick={() => void action.run(calculate)}>{action.busy ? "Calculating…" : "Calculate"}</button>
    {action.message && <Notice error>{action.message}</Notice>}
    {result && <div className="stack" role="status">
      <p>{result.status === "reachable" ? `Aim for about ${result.requiredPercent}% on each remaining activity.` : result.status === "secured" ? `You'll reach ${result.targetPercent}% even if you score zero on the rest.` : result.status === "out_of_reach" ? `Even with perfect scores, the highest you can reach is ${result.maximumFinalPercent}%.` : result.status === "complete" ? `Everything in this course is graded. Your grade is ${result.currentPercent}%.` : "There's no graded work to estimate from yet."}</p>
      {result.needs.map(need => <p key={need.assignmentId}>{need.title}: {need.neededPoints} / {need.pointsPossible}</p>)}
      {result.warnings.dropRuleMessages?.map((message, i) => <p key={i} className="muted">{message}</p>)}
      {result.warnings.hasDropRules && !result.warnings.dropRuleMessages && <p className="muted">This estimate could not apply the course&apos;s drop rules.</p>}
      {result.warnings.hiddenGradeCount > 0 && <p className="muted">{result.warnings.hiddenGradeCount} hidden {result.warnings.hiddenGradeCount === 1 ? "grade is" : "grades are"} treated as not yet graded.</p>}
      {result.warnings.differsFromCanvas && <p className="muted">Canvas calculates this course a little differently. Treat this as a rough guide.</p>}
    </div>}
    <p className="muted">Based on your synced Canvas grades.</p>
  </section>;
}
