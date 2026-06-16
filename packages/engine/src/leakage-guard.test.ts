import assert from "node:assert/strict";
import { test } from "node:test";

import { detectInstructionLeakage, validateLeakage } from "./leakage-guard.js";
import type { GenerationPlan, SectionOutput } from "./types.js";

const cleanOutput: SectionOutput = {
  kind: "concept-card",
  id: "output-1",
  plannedSectionId: "planned-section-1",
  title: "Focused review",
  sourceCore: {
    explanation: "Focused review keeps attention on one source-backed idea.",
    keyPoints: ["Use short review intervals", "Keep examples concrete"],
  },
  sourceBlockIds: ["source-block-1"],
};

const plan: GenerationPlan = {
  id: "plan-1",
  sourceId: "source-1",
  outlineId: "outline-1",
  title: "Leakage Plan",
  sections: [
    {
      id: "planned-section-1",
      sourceSectionId: "source-section-1",
      title: "Focused review",
      order: 0,
      schemaKind: "concept-card",
      target: {
        objective: "Review focused content.",
        itemCount: 1,
        focus: "Focused review",
        requiredSourceBlockIds: ["source-block-1"],
        expectedTags: ["concept"],
        coverageRules: ["Use the source block."],
      },
      sourceBlockIds: ["source-block-1"],
      tokenWeight: 4,
      targetItemCount: 1,
      sourceStartOffset: 0,
      sourceEndOffset: 20,
    },
  ],
  metadata: {
    sectionCount: 1,
    sourceBlockCount: 1,
  },
};

test("clean user-facing output passes leakage validation", () => {
  assert.deepEqual(detectInstructionLeakage(cleanOutput), { ok: true });
});

test("forbidden wording in a user-facing field is rejected with the field name", () => {
  const result = detectInstructionLeakage({
    ...cleanOutput,
    sourceCore: {
      ...cleanOutput.sourceCore,
      explanation:
        "Recall   the\nexam meaning of focused review before comparing examples.",
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected leakage guard to reject leaked instruction wording.");
  }

  assert.deepEqual(result.fields, ["sourceCore.explanation"]);
  assert.deepEqual(result.findings, [
    {
      field: "sourceCore.explanation",
      fieldPath: "sourceCore.explanation",
      forbiddenPattern: "recall the exam meaning",
    },
  ]);
});

test("forbidden wording only in a non-user-facing field does not trigger rejection", () => {
  const result = detectInstructionLeakage({
    ...cleanOutput,
    id: "recall the exam meaning-output-id",
  });

  assert.deepEqual(result, { ok: true });
});

test("project leakage in student-facing title and core fields is reported", () => {
  const report = validateLeakage({
    plan,
    outputs: [
      {
        ...cleanOutput,
        title: "Impact Reduction in Stay Focused V2",
        sourceCore: {
          explanation:
            "The engine should maintain operational resilience after incidents.",
          keyPoints: ["Use accountable communication."],
        },
      },
    ],
  });

  assert.equal(report.status, "failed");
  assert.deepEqual(
    report.issues.map((issue) => ({
      type: issue.type,
      fieldPath: issue.fieldPath,
      offendingTerm: issue.offendingTerm,
    })),
    [
      {
        type: "leakage",
        fieldPath: "title",
        offendingTerm: "Stay Focused",
      },
      {
        type: "leakage",
        fieldPath: "title",
        offendingTerm: "Stay Focused V2",
      },
      {
        type: "leakage",
        fieldPath: "sourceCore.explanation",
        offendingTerm: "the engine",
      },
    ],
  );
});

test("project terms in ids are not scanned as student-facing leakage", () => {
  const report = validateLeakage({
    plan,
    outputs: [
      {
        ...cleanOutput,
        id: "Stay Focused V2 engine",
        plannedSectionId: "planned-section-1",
      },
    ],
  });

  assert.equal(report.status, "passed");
  assert.deepEqual(report.issues, []);
});
