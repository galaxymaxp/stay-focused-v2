import type { SectionSchemaKind } from "./types";

export interface StructuredOutputSchema {
  readonly name: string;
  readonly description: string;
  readonly schema: {
    readonly type: "object";
    readonly additionalProperties: false;
    readonly required: readonly string[];
    readonly properties: Readonly<Record<string, unknown>>;
  };
}

const baseProperties = {
  id: { type: "string", minLength: 1 },
  plannedSectionId: { type: "string", minLength: 1 },
  title: { type: "string", minLength: 1 },
  sourceBlockIds: {
    type: "array",
    minItems: 1,
    items: { type: "string", minLength: 1 },
  },
} as const;

export const conceptCardSchema: StructuredOutputSchema = {
  name: "ConceptCard",
  description: "A concise concept explanation with source-grounded key points.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "id",
      "plannedSectionId",
      "title",
      "explanation",
      "keyPoints",
      "sourceBlockIds",
    ],
    properties: {
      ...baseProperties,
      kind: { type: "string", const: "concept-card" },
      explanation: { type: "string", minLength: 1 },
      keyPoints: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 },
      },
    },
  },
};

export const processStepSchema: StructuredOutputSchema = {
  name: "ProcessStep",
  description: "An ordered process with a concise source-grounded summary.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "id",
      "plannedSectionId",
      "title",
      "steps",
      "summary",
      "sourceBlockIds",
    ],
    properties: {
      ...baseProperties,
      kind: { type: "string", const: "process-step" },
      steps: {
        type: "array",
        minItems: 1,
        items: { type: "string", minLength: 1 },
      },
      summary: { type: "string", minLength: 1 },
    },
  },
};

export const exampleCardSchema: StructuredOutputSchema = {
  name: "ExampleCard",
  description: "A concrete scenario with explanation and practical takeaway.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "id",
      "plannedSectionId",
      "title",
      "scenario",
      "explanation",
      "takeaway",
      "sourceBlockIds",
    ],
    properties: {
      ...baseProperties,
      kind: { type: "string", const: "example-card" },
      scenario: { type: "string", minLength: 1 },
      explanation: { type: "string", minLength: 1 },
      takeaway: { type: "string", minLength: 1 },
    },
  },
};

export const claimCardSchema: StructuredOutputSchema = {
  name: "ClaimCard",
  description: "A central claim with support and source-grounded reasoning.",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "id",
      "plannedSectionId",
      "title",
      "claim",
      "support",
      "reasoning",
      "sourceBlockIds",
    ],
    properties: {
      ...baseProperties,
      kind: { type: "string", const: "claim-card" },
      claim: { type: "string", minLength: 1 },
      support: { type: "string", minLength: 1 },
      reasoning: { type: "string", minLength: 1 },
    },
  },
};

export function getSchemaForSectionKind(
  schemaKind: SectionSchemaKind,
): StructuredOutputSchema {
  switch (schemaKind) {
    case "concept-card":
      return conceptCardSchema;
    case "process-step":
      return processStepSchema;
    case "example-card":
      return exampleCardSchema;
    case "claim-card":
      return claimCardSchema;
  }
}
