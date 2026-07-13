import { runPipeline } from "../src/generate.js";
import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import type { ReviewerOutput, SectionOutput, SourceNormalizationInput } from "../src/types.js";
import {
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

const fallbackFixtures: readonly { readonly name: string; readonly text: string; readonly expected?: string }[] = [
  { name: "paragraph section fallback", text: "River Trade\nRiver ports connected fictional inland markets. Merchants recorded cargo before each voyage.", expected: "River ports" },
  { name: "bullet-list fallback", text: "Archive Tools\n- Quartz index\n- Cedar register\n- Indigo ledger", expected: "Quartz index" },
  { name: "heading-heavy fallback", text: "## Lantern Policy\nLantern permits identify approved night routes.\n## Harbor Signals\nBlue flags mark a fictional harbor inspection.", expected: "Lantern" },
  { name: "list-only fallback", text: "1. Amber token\n2. Cobalt token\n3. Silver token", expected: "Amber token" },
  { name: "short-source fallback", text: "Mica layers split along flat surfaces.", expected: "Mica" },
  { name: "mixed headings and paragraphs fallback", text: "# Cloud Gardens\nCloud gardens collect mist for fictional hill farms.\n## Mesh trays\nMesh trays hold seed beds above stone channels.", expected: "Cloud" },
  { name: "exact technical-term preservation", text: "Zero-Trust Fabric\nThe Zero-Trust Fabric uses MT-47 gates at 12.5% capacity.", expected: "MT-47" },
  { name: "comparison table converted to text", text: "Material comparison\nAster glass: flexible.\nBeryl glass: rigid.", expected: "Aster glass" },
  { name: "numbered procedure fallback", text: "Signal setup\n1. Raise the violet marker.\n2. Record the beacon code.\n3. Close the copper latch.", expected: "violet marker" },
  { name: "OCR-like line breaks fallback", text: "Fictional Civic Notes\nA council records\npublic comments before\nissuing a local notice.", expected: "council" },
  { name: "Canvas-like page fallback", text: "Week 4: Orchard Maps\nOrchard maps label rows by tree age.\nKey terms\n- row marker\n- harvest zone", expected: "row marker" },
  { name: "too-few-block fallback", text: "Basalt Compass\nA basalt compass points toward the fictional north arch.", expected: "basalt compass" },
];

export const reviewerRecoverySuite: EvalSuite = {
  name: "Reviewer reliability recovery",
  cases: [
    createGeneratedCase(),
    createRepairCase("explanation-only repair"),
    createRepairCase("key-point-only repair"),
    createRepairCase("title-only repair preserves the exact planned title"),
    ...fallbackFixtures.map(createFallbackCase),
    createMixedRecoveryCase(),
    createMissingSectionCase(),
    createRetryDriftCase(),
    createEmergencyCase("provider-wide malformed output", "malformed"),
    createEmergencyCase("provider outage with readable source", "outage"),
  ],
};

function createGeneratedCase(): EvalCase {
  return {
    name: "fully valid generated reviewer remains unchanged",
    run: async () => {
      const provider = new RecoveryProvider("valid");
      const reviewer = await runPipeline({ input: singleTopicInput(), provider });
      return [
        ...assertEqual(provider.requests.length, 1, "Valid output triggered an unnecessary retry."),
        ...assertEqual(reviewer.metadata.reviewerQualityStatus, "complete", "Valid output was downgraded."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 0, "Valid output triggered fallback."),
        ...assertEqual(reviewer.sections[0]?.qualityStatus, "generated", "Valid section quality was not generated."),
      ];
    },
  };
}

function createRepairCase(name: string): EvalCase {
  return {
    name,
    run: async () => {
      const provider = new RecoveryProvider("drift-then-valid");
      const reviewer = await runPipeline({ input: singleTopicInput(), provider });
      return [
        ...assertEqual(provider.requests.length, 2, "Field repair did not stop after one valid retry."),
        ...assertEqual(reviewer.sections[0]?.qualityStatus, "repaired", "Valid repair status was not recorded."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 0, "Successful repair unnecessarily used fallback."),
        ...assertEqual(reviewer.metadata.groundingStatus, "passed", "Repaired section failed grounding."),
        ...assertEqual(reviewer.metadata.leakageStatus, "passed", "Repaired section failed leakage."),
      ];
    },
  };
}

function createFallbackCase(fixture: (typeof fallbackFixtures)[number]): EvalCase {
  return {
    name: fixture.name,
    run: async () => {
      const reviewer = await runPipeline({
        input: { kind: "plain-text", title: fixture.name, text: fixture.text },
        provider: new RecoveryProvider("malformed"),
        retryPolicy: noRetries(),
      });
      const visible = reviewer.sections.flatMap((section) => section.items)
        .flatMap((item) => [item.title, item.sourceCore.explanation, ...item.sourceCore.keyPoints]).join(" ");
      return [
        ...assertEqual((reviewer.metadata.fallbackSectionCount ?? 0) > 0, true, "Fallback section was not recorded."),
        ...assertEqual(reviewer.metadata.coverageStatus, "passed", "Fallback failed coverage."),
        ...assertEqual(reviewer.metadata.groundingStatus, "passed", "Fallback failed grounding."),
        ...assertEqual(reviewer.metadata.leakageStatus, "passed", "Fallback failed leakage."),
        ...(fixture.expected ? assertIncludes(visible, fixture.expected, "Fallback lost exact source terminology.") : []),
      ];
    },
  };
}

function createMixedRecoveryCase(): EvalCase {
  return {
    name: "one failed section among several valid sections",
    run: async () => {
      const reviewer = await runPipeline({
        input: twoTopicInput(),
        provider: new RecoveryProvider("first-malformed"),
        retryPolicy: noRetries(),
      });
      return [
        ...assertEqual(reviewer.sections.length, 2, "Mixed recovery lost a planned section."),
        ...assertEqual(reviewer.metadata.originalGeneratedSectionCount, 1, "Valid generated section was not preserved."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 1, "Failed section did not use one fallback."),
        ...assertEqual(reviewer.metadata.reviewerQualityStatus, "limited", "Mixed quality was not represented honestly."),
      ];
    },
  };
}

function createMissingSectionCase(): EvalCase {
  return {
    name: "provider missing one planned section",
    run: async () => {
      const reviewer = await runPipeline({ input: twoTopicInput(), provider: new RecoveryProvider("second-malformed"), retryPolicy: noRetries() });
      return [
        ...assertEqual(reviewer.sections.length, 2, "Missing provider section was silently dropped."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 1, "Missing provider section did not use fallback."),
      ];
    },
  };
}

function createRetryDriftCase(): EvalCase {
  return {
    name: "retry response that drifts further uses fallback",
    run: async () => {
      const provider = new RecoveryProvider("always-drift");
      const reviewer = await runPipeline({ input: singleTopicInput(), provider });
      return [
        ...assertEqual(provider.requests.length, 3, "Retry drift exceeded or skipped the retry bound."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 1, "Retry drift did not use fallback."),
        ...assertEqual(reviewer.metadata.groundingStatus, "passed", "Fallback after retry drift failed grounding."),
      ];
    },
  };
}

function createEmergencyCase(name: string, behavior: "malformed" | "outage"): EvalCase {
  return {
    name,
    run: async () => {
      const reviewer = await runPipeline({ input: twoTopicInput(), provider: new RecoveryProvider(behavior), retryPolicy: noRetries() });
      return [
        ...assertEqual(reviewer.metadata.fallbackPlanUsed, true, "Emergency source-outline plan was not recorded."),
        ...assertEqual(reviewer.metadata.reviewerQualityStatus, "limited", "Emergency reviewer was not marked limited."),
        ...assertEqual(reviewer.sections.length, 2, "Emergency reviewer lost source-outline sections."),
        ...assertEqual(reviewer.metadata.fallbackSectionCount, 2, "Emergency reviewer did not use source-only sections."),
      ];
    },
  };
}

function singleTopicInput(): SourceNormalizationInput {
  return { kind: "plain-text", title: "Copper Ecology", text: "Copper Ecology\nCopper moss stores rainwater in shallow fictional valleys. Copper moss releases the water during dry afternoons." };
}

function twoTopicInput(): SourceNormalizationInput {
  return { kind: "plain-text", title: "Fictional Field Notes", text: "# Copper Ecology\nCopper moss stores rainwater in shallow valleys.\n# Slate Navigation\nSlate markers identify the northern footpath." };
}

function noRetries() {
  return { maxRetries: 0, retryWeakSections: true, retryFailedSections: true } as const;
}

type RecoveryBehavior = "valid" | "drift-then-valid" | "always-drift" | "malformed" | "outage" | "first-malformed" | "second-malformed";

class RecoveryProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];
  public constructor(private readonly behavior: RecoveryBehavior) {}

  public async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
    this.requests.push(request);
    const requestNumber = this.requests.length;
    if (this.behavior === "outage") throw new Error("fictional provider outage");
    if (this.behavior === "malformed" || (this.behavior === "first-malformed" && requestNumber === 1) || (this.behavior === "second-malformed" && requestNumber === 2)) {
      return { malformed: true } as TOutput;
    }
    if (this.behavior === "always-drift" || (this.behavior === "drift-then-valid" && requestNumber === 1)) {
      return createOutput(request, ["Invented astronomy recommendations are essential."], "Invented astronomy recommendations are essential.") as TOutput;
    }
    return createOutput(request) as TOutput;
  }
}

function createOutput(
  request: GenerationRequest<unknown>,
  forcedPoints?: readonly string[],
  forcedExplanation?: string,
): SectionOutput {
  const prompt = request.prompt;
  const blocks = [...prompt.matchAll(/\[Passage block ([^| ]+)\s*\|[^\]]+\]\n([\s\S]*?)(?=\n\n?\[Passage block|\n(?:DETECTED PASSAGE ITEMS:|Requirements:)|$)/g)];
  const sourceBlockIds = blocks.map((match) => match[1] ?? "").filter(Boolean);
  const texts = blocks.map((match) => (match[2] ?? "").trim()).filter(Boolean);
  const plannedSectionId = String(request.metadata?.plannedSectionId ?? "");
  const kind = String(request.metadata?.schemaKind ?? "concept-card") as SectionOutput["kind"];
  const explanation = forcedExplanation ?? texts.at(-1) ?? "";
  const keyPoints = forcedPoints ?? (texts.length > 1 ? texts.slice(0, -1) : texts);
  return {
    id: `generated-${plannedSectionId}`,
    kind,
    plannedSectionId,
    title: "Provider title is normalized by the plan",
    sourceBlockIds,
    sourceCore: { explanation, keyPoints: keyPoints.length > 0 ? keyPoints : [explanation] },
    enrichment: null,
  } as SectionOutput;
}

export async function runReviewerRecoveryEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerRecoverySuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) await runReviewerRecoveryEvals();
