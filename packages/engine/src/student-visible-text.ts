import type {
  SectionOutput,
  StudentFacingSectionField,
} from "./types.js";
import { sameVisibleText } from "./reviewer-evidence-presentation.js";
import { displayProseSentences } from './reviewer-presentation-prose.js';

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
  // If a complete source-owned prose result is also the whole explanation,
  // display the source text in that slot once. Typed syntax and tables retain
  // their separate evidence blocks; provider paraphrases never replace them.
  const sourceExplanation = output.deterministicEvidence?.presentation?.evidence?.find(block =>
    ['example', 'result'].includes(block.kind) && !/[=\\{}|]/u.test(block.text) &&
    /\b(?:is|are|was|were|has|have)\b/iu.test(block.text) &&
    sameVisibleText(block.text, output.sourceCore.explanation));
  const explanation = sourceExplanation?.text ?? output.sourceCore.explanation;
  return {
    ...studentVisible,
    sourceBlockIds: [...output.sourceBlockIds],
    sourceCore: {
      explanation,
      keyPoints: output.deterministicEvidence?.presentation
        ? presentation.keyPoints.filter(point => !displayProseSentences(explanation).some(sentence => sameVisibleText(point, sentence)) &&
          !sameVisibleText(`${output.title} ${point.replace(/^\s*[-*•]\s*/u, "")}`, explanation))
        : [...presentation.keyPoints],
      ...(presentation.evidence ? { evidence: presentation.evidence.filter(block => block !== sourceExplanation).map(block => ({...block})) } : {}),
    },
    enrichment: null,
  } as SectionOutput;
}
