import type {
  SectionOutput,
  StudentFacingSectionField,
} from "./types.js";

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
  ];
}

export function toDefaultStudentVisibleSectionOutput(
  output: SectionOutput,
): SectionOutput {
  return {
    ...output,
    sourceBlockIds: [...output.sourceBlockIds],
    sourceCore: {
      explanation: output.sourceCore.explanation,
      keyPoints: [...output.sourceCore.keyPoints],
    },
    enrichment: null,
  } as SectionOutput;
}
