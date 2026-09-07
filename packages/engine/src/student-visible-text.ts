import type {
  SectionOutput,
  StudentFacingSectionField,
} from "./types.js";
import { sameVisibleText } from "./reviewer-evidence-presentation.js";

export interface StudentVisibleTextEntry {
  readonly field: StudentFacingSectionField;
  readonly fieldPath: string;
  readonly text: string;
}

export function extractStudentVisibleText(
  output: SectionOutput,
): readonly StudentVisibleTextEntry[] {
  return [
    {
      field: "title",
      fieldPath: "title",
      text: output.title,
    },
    {
      field: "sourceCore.explanation",
      fieldPath: "sourceCore.explanation",
      text: output.sourceCore.explanation,
    },
    ...output.sourceCore.keyPoints.map(
      (text, index): StudentVisibleTextEntry => ({
        field: "sourceCore.keyPoints",
        fieldPath: `sourceCore.keyPoints[${index}]`,
        text,
      }),
    ),
    ...(output.sourceCore.evidence ?? []).map((block, index): StudentVisibleTextEntry => ({
      field: "sourceCore.keyPoints",
      fieldPath: `sourceCore.evidence[${index}]`,
      text: block.text,
    })),
  ];
}

export function toDefaultStudentVisibleSectionOutput(
  output: SectionOutput,
): SectionOutput {
  const { deterministicEvidence: _internalEvidence, ...studentVisible } = output;
  const presentation = output.deterministicEvidence?.presentation ?? output.sourceCore;
  const explanation = output.sourceCore.explanation;
  return {
    ...studentVisible,
    sourceBlockIds: [...output.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints: output.deterministicEvidence?.presentation
        ? presentation.keyPoints.filter(point => !sameVisibleText(point, explanation) &&
          !sameVisibleText(`${output.title} ${point.replace(/^\s*[-*•]\s*/u, "")}`, explanation))
        : [...presentation.keyPoints],
      ...(presentation.evidence ? { evidence: presentation.evidence.map(block => ({...block})) } : {}),
    },
    enrichment: null,
  } as SectionOutput;
}
