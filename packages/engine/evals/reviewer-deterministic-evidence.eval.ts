import type { GenerationProvider, GenerationRequest } from "../src/provider.js";
import {
  assembleDeterministicSectionEvidence,
  renderRequiredEvidenceTarget,
  validateDeterministicSectionEvidence,
} from "../src/reviewer-evidence-assembly.js";
import { findMissingRequiredEvidenceTargets } from "../src/required-evidence.js";
import { diagnoseStudentVisibleUsefulness } from "../src/reviewer-usefulness.js";
import { generateSections } from "../src/stage3-generate.js";
import { verifyCoverage } from "../src/stage4-verify.js";
import { retryFailedSections } from "../src/stage5-retry.js";
import { validateGrounding } from "../src/stage5a-grounding.js";
import { validateLeakage } from "../src/leakage-guard.js";
import { runPipeline } from "../src/generate.js";
import { completeSourcePredicate, presentDeterministicEvidence } from "../src/reviewer-evidence-presentation.js";
import { explanationEvidenceFor } from "../src/reviewer-explanation-evidence.js";
import { toDefaultStudentVisibleSectionOutput } from "../src/student-visible-text.js";
import { verifySemanticRelationships } from "../src/semantic-verification.js";
import { buildSourceRepresentationMap, sourceItemHasVisibleOwnedEvidence } from '../src/reviewer-source-representation.js';
import { buildResidualSourceEvidence, visibleResidualSourceEvidence, missingVisibleResidualSourceEvidence } from '../src/reviewer-source-ancestry.js';
import type {
  GenerationPlan,
  NormalizedSourceBlock,
  NormalizedSource,
  PlannedSection,
  RequiredEvidenceTarget,
  ReviewerSectionDisposition,
  SectionOutput,
  SourceOutline,
} from "../src/types.js";
import {
  assertDeepEqual,
  assertEqual,
  assertIncludes,
  isDirectExecution,
  printEvalSuiteResult,
  runEvalSuite,
  setFailureExitCode,
} from "./assert.js";
import type { EvalCase, EvalIssue, EvalSuite } from "./types.js";

const mixedTargets = [
  ["fact", "concept", "The archive preserves exact source records."],
  ["list", "list-item", "Amber register"],
  ["formula", "formula", "r = total / count"],
  ["result", "result-value", "The recorded result is 42."],
  ["row", "table-row", "2026 | North | 42"],
  ["code", "code", "const total = values.length;"],
  ["relation", "relationship", "The north record depends on the amber register."],
] as const;

const omissionCases = [
  ["model omits required formula", "formula"],
  ["model omits required numeric result", "result"],
  ["model omits required table row", "row"],
  ["model omits required ledger row", "row"],
  ["model omits required list item", "list"],
  ["model omits required relationship", "relation"],
  ["model omits required code", "code"],
] as const;

export const reviewerDeterministicEvidenceSuite: EvalSuite = {
  name: "Reviewer deterministic evidence architecture",
  cases: [
    ...omissionCases.map(([name, targetId]) => omissionCase(name, targetId)),
    excellentExplanationCase(),
    lexicalExplanationContractCase(),
    unsupportedExplanationCase(),
    usefulnessFailureCase("instructional explanation", "Try calculating every record now.", "INSTRUCTIONAL_NOISE"),
    usefulnessFailureCase("code-only explanation", "const total = values.length;\nreturn total;", "CODE_AS_EXPLANATION"),
    usefulnessFailureCase("fragment explanation", "Using source records", "FRAGMENTARY_EXPLANATION"),
    similarRowIdentityCase(),
    formulaIdentityCase(),
    sourceAbsentCase(),
    zeroCallDispositionCase("structural node consumes zero provider calls", "structural"),
    zeroCallDispositionCase("typed-only node consumes zero provider calls", "typed-evidence"),
    zeroCallDispositionCase("unsupported heading-only leaf consumes zero provider calls", "unsupported"),
    conciseExplanationCase(),
    sourceDumpCase(),
    providerDropsAllFactualFieldsCase(),
    batchIsolationCase(),
    partialBatchFailureCase(),
    batchOrderingCase(),
    retryBoundCase(),
    permanentProviderFailureCase(),
    ...presentationRegressionCases(),
    ...sourceRepresentationRegressionCases(),
    ...sourceAncestryRegressionCases(),
  ],
};

function sourceAncestryRegressionCases(): readonly EvalCase[] {
  const definition = 'The interval records the difference between neighboring counts.';
  const formula = target('formula-child', 'formula', 'q = total / count', 'span', 0);
  const result = target('result-child', 'result-value', 'q = 42', 'span', 0);
  const parent = target('parent', 'concept', `${definition} ${formula.label} ${result.label}`, 'span', 0);
  const block = (text: string, id = 'span', order = 0, role?: 'content' | 'metadata' | 'furniture'): NormalizedSourceBlock => ({
    id, order, kind: 'paragraph', text,
    structuredBlock: {id, order, pageNumber: 1, type: 'paragraph', text, parentId: 'source-group', ...(role ? {role} : {}),
      provenance: {blockId: id, pageNumber: 1, parser: 'legacy'}},
  });
  const build = (blocks = [block(parent.label, 'span', 0, 'content')], targets: readonly RequiredEvidenceTarget[] = [formula, result], title = 'Register') => {
    const residualSourceEvidence = buildResidualSourceEvidence({title, sourceBlocks: blocks, targets});
    const section = {...createSection('residual-section', title, blocks.map(b => b.id), targets), residualSourceEvidence};
    const output = assembleDeterministicSectionEvidence({section, sourceBlocks: blocks});
    const visible = toDefaultStudentVisibleSectionOutput(output);
    return {section, output, visible, residual: visibleResidualSourceEvidence(residualSourceEvidence),
      text: [...visible.sourceCore.keyPoints, ...(visible.sourceCore.evidence ?? []).map(b => b.text)].join('\n')};
  };
  const check = (name: string, run: () => readonly EvalIssue[]): EvalCase => ({name: `B19 ${name}`, run: async () => run()});
  return [
    check('parent definition survives formula and result children', () => {
      const text = build().text;
      return [...assertIncludes(text, definition, 'Definition disappeared.'), ...assertEqual(text.split(formula.label).length - 1, 1, 'Child formula duplicated.'), ...assertEqual(text.split(result.label).length - 1, 1, 'Child result duplicated.')];
    }),
    check('fully covered parent suppresses duplicate raw display', () => {
      const b = build([block(formula.label)], [formula]);
      return [...assertEqual(b.residual.length, 0, 'Fully owned span retained raw.'), ...assertEqual(b.text.split(formula.label).length - 1, 1, 'Formula repeated.')];
    }),
    check('partially covered parent retains unique residual', () => assertEqual(build().residual.some(r => r.text.includes(definition)), true, 'Partial coverage erased parent.')),
    check('residual preserves source and parent identity', () => assertEqual(build().residual.every(r => r.sourceBlockId === 'span' && r.parentId === 'source-group'), true, 'Ancestry lost.')),
    check('structural metadata residual is suppressed', () => assertEqual(build([block('Slide navigation', 'meta', 0, 'metadata')], []).residual.length, 0, 'Metadata emitted.')),
    check('ambiguous residual is retained', () => {
      const b = build([block('Check this relationship.')], []);
      return [...assertEqual(b.residual[0]?.classification, 'UNRESOLVED', 'Ambiguity guessed.'), ...assertIncludes(b.text, 'Check this relationship.', 'Ambiguity discarded.')];
    }),
    check('exact heading ownership avoids raw duplication', () => {
      const b = block('Register');
      const heading: NormalizedSourceBlock = {...b, kind: 'heading', structuredBlock: {...b.structuredBlock!, type: 'heading', text: 'Register'}};
      return assertEqual(build([heading], []).text, '', 'Visible title duplicated.');
    }),
    check('row child cannot absorb unrelated prose', () => assertEqual(visibleResidualSourceEvidence(buildResidualSourceEvidence({title: 'Register', sourceBlocks: [block(definition)], targets: [target('row', 'table-row', 'North | 42', 'span', 0)]}))[0]?.text, definition, 'Row absorbed prose.')),
    check('table children cover only table portion', () => {
      const rows = ['Region | Count', 'North | 42'].map((label, index) => ({...target(`row-${index}`, 'table-row', label, 'span', 0), provenance: [{sourceBlockId: 'span', sourceOrder: 0, tableBlockId: 'table', tableRowIndex: index}]}));
      const p = target('table-parent', 'concept', `${definition}\n${rows.map(r => r.label).join('\n')}`, 'span', 0);
      const core = presentDeterministicEvidence([p, ...rows]);
      return [...assertIncludes(core.keyPoints.join(' '), definition, 'Neighbor definition lost.'), ...assertEqual(core.evidence?.[0]?.text, rows.map(r => r.label).join('\n'), 'Table changed.')];
    }),
    check('formula cannot satisfy a definition', () => assertEqual(visibleResidualSourceEvidence(buildResidualSourceEvidence({title: 'Register', sourceBlocks: [block(definition)], targets: [formula]}))[0]?.text, definition, 'Formula satisfied definition.')),
    check('result cannot satisfy a definition', () => assertEqual(visibleResidualSourceEvidence(buildResidualSourceEvidence({title: 'Register', sourceBlocks: [block(definition)], targets: [result]}))[0]?.text, definition, 'Result satisfied definition.')),
    check('provider response order cannot alter residual ancestry', () => {
      const a = build();
      const generated = {...a.output, sourceCore: {...a.output.sourceCore, explanation: 'Recorded counts are retained.'}};
      return assertEqual(validateDeterministicSectionEvidence(a.section, generated).valid, true, 'Explanation changed factual ownership.');
    }),
    check('provider cannot replace residual factual ownership', () => {
      const b = build();
      return assertEqual(validateDeterministicSectionEvidence(b.section, {...b.output, deterministicEvidence: {...b.output.deterministicEvidence!, presentation: {explanation: '', keyPoints: [], evidence: []}}}).valid, false, 'Provider replacement accepted.');
    }),
    check('source-item validator recognizes visible residual', () => {
      const b = build([block(definition)], []);
      const context = createContext();
      const source = {...context.source, blocks: [block(`- ${definition}`)]};
      const section = {...b.section, sourceSectionId: context.outline.sections[0]!.id};
      const g = validateGrounding({source, outline: context.outline, plan: {...context.plan, sections: [section]}, outputs: [{...b.visible, sourceCore: {...b.visible.sourceCore, explanation: definition}}]});
      return assertEqual(g.issues.some(i => i.type === 'grounding-omission'), false, 'Visible source item rejected.');
    }),
    check('hidden residual does not satisfy visibility', () => {
      const b = build();
      return assertEqual(validateDeterministicSectionEvidence(b.section, {...b.output, deterministicEvidence: {targetIds: b.output.deterministicEvidence!.targetIds, evidenceHash: b.output.deterministicEvidence!.evidenceHash}}).valid, false, 'Hidden residual accepted.');
    }),
    check('residual items retain source order', () => assertEqual(build([block('Second unique fact.', 'second', 2), block('First unique fact.', 'first', 1)], []).residual.map(r => r.sourceBlockId).join(','), 'first,second', 'Source order lost.')),
    check('multiple unique parent items all survive', () => assertEqual(build([block('First unique fact. Second unique fact.')], []).residual.length, 2, 'Unique item dropped.')),
    check('metadata role cannot delete required row headers', () => {
      const t = target('header', 'table-row', 'Region | Count', 'span', 0);
      return assertIncludes(build([block(t.label, 'span', 0, 'metadata')], [t]).text, t.label, 'Required header removed.');
    }),
    check('source dump projection preserves each sentence exactly', () => {
      const text = 'The first record describes the archive. The second record describes its source. The third record preserves its identity.';
      return assertEqual(presentDeterministicEvidence([target('prose', 'concept', text, 'span', 0)]).keyPoints.join(' '), text, 'Prose facts changed.');
    }),
    check('target conservation and hashes remain exact', () => {
      const ts = [parent, formula, result]; const before = JSON.stringify(ts); const b = build(undefined, ts);
      return [...assertEqual(JSON.stringify(ts), before, 'Targets mutated.'), ...assertEqual(findMissingRequiredEvidenceTargets(b.section, b.visible).length, 0, 'Target disappeared.')];
    }),
    check('incomplete phrase receives a whole source item owner', () => {
      const b = build([block('The key records the interval.')], [target('phrase', 'concept', 'The key', 'span', 0)]);
      return [...assertEqual(b.visible.sourceCore.keyPoints.length, 1, 'Truncated phrase duplicated.'), ...assertEqual(b.text, 'The key records the interval.', 'Source item fragmented.')];
    }),
    check('source ancestry tampering is rejected before provider work', () => {
      const b = build(); let rejected = false;
      try { assembleDeterministicSectionEvidence({section: b.section, sourceBlocks: [block('Altered source')]}); } catch { rejected = true; }
      return assertEqual(rejected, true, 'Altered source contract accepted.');
    }),
    check('serialized visible residual discharges the completeness contract', () => {
      const b = build();
      return assertEqual(missingVisibleResidualSourceEvidence(b.section.residualSourceEvidence, b.visible.sourceCore).length, 0, 'Visible residual rejected.');
    }),
    check('serialized hidden residual fails despite complete child targets', () => {
      const b = build();
      return assertEqual(missingVisibleResidualSourceEvidence(b.section.residualSourceEvidence, {explanation: '', keyPoints: [], evidence: b.visible.sourceCore.evidence}).length > 0, true, 'Child-only output accepted.');
    }),
    check('activity ancestry suppresses task commands but retains definitions', () => {
      const h = block('Activity', 'heading');
      const heading: NormalizedSourceBlock = {...h, kind: 'heading', structuredBlock: {...h.structuredBlock!, type: 'heading', text: 'Activity'}};
      const b = build([heading, block('Create a program for your answer.', 'command', 1), block(definition, 'definition', 2)], []);
      return [...assertIncludes(b.text, definition, 'Activity heading erased a fact.'), ...assertEqual(b.text.includes('Create a program'), false, 'Structural activity command emitted.')];
    }),
    check('non-standalone sections cannot hide unique residuals', () => {
      const b = build(); const context = createContext();
      const section = {...b.section, sourceSectionId: context.outline.sections[0]!.id, reviewerDisposition: 'typed-evidence' as const};
      const output = {...b.visible, sourceCore: {explanation: '', keyPoints: [], evidence: b.visible.sourceCore.evidence}};
      const g = validateGrounding({...context, plan: {...context.plan, sections: [section]}, outputs: [output]});
      return assertEqual(g.issues.some(i => i.type === 'grounding-omission' && i.message.includes('residual')), true, 'Non-standalone residual hidden.');
    }),
    check('explicit composite span bridges an exact typed child without duplication', () => {
      const child = target('output', 'code', 'Recorded: Amber', 'code-block', 0);
      const parent = {...target('composite', 'concept', 'Recorded outputs:', 'code-block', 0), sourceBlockIds: ['code-block', 'output-block']};
      const blocks = [block('Recorded outputs: Recorded: Amber', 'code-block'), block('Recorded: Amber', 'output-block', 1)];
      const b = build(blocks, [parent, child]);
      return [...assertEqual(b.residual.some(s => s.sourceBlockId === 'output-block'), false, 'Exact typed output repeated.'),
        ...assertEqual(buildResidualSourceEvidence({title: 'Register', sourceBlocks: [block('Recorded: Amber', 'unrelated')], targets: [child]}).some(s => s.classification === 'CHILD_OWNED'), false, 'Unrelated identity accepted.')];
    }),
    check('display math delimiters do not duplicate a source formula in its parent', () => {
      const child = {...formula, label: `$$\n${formula.label}\n$$`, evidenceTexts: [formula.label]};
      const p = {...parent, label: `${definition} ${formula.label}`, evidenceTexts: [`${definition} ${formula.label}`]};
      const core = presentDeterministicEvidence([p, child]);
      return [...assertEqual(core.keyPoints.join(' '), definition, 'Formula wrapper blocked child ownership.'), ...assertEqual(core.evidence?.[0]?.text, child.label, 'Typed formula identity changed.')];
    }),
  ];
}

function omissionCase(name: string, targetId: string): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const before = assembleDeterministicSectionEvidence({
      section: context.sections[0]!,
      sourceBlocks: context.source.blocks,
    });
    const generated = await generateSections({ ...context, provider });
    const output = generated.outputs[0]!;
    const expected = targetById(context.sections[0]!, targetId);
    const coverage = verifyCoverage({ ...context, outputs: [output] });
    return [
      ...assertIncludes(output.sourceCore.keyPoints.join("\n"), expected.label, "Provider omission removed deterministic evidence."),
      ...assertDeepEqual(output.sourceCore.keyPoints, before.sourceCore.keyPoints, "Provider changed the deterministic evidence set."),
      ...assertEqual(coverage.status, "passed", "Provider omission lowered exact evidence coverage."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "A required target was lost after generation."),
    ];
  } };
}

function excellentExplanationCase(): EvalCase {
  return { name: "excellent grounded explanation need not repeat every fact", run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const result = await generateSections({ ...context, provider });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(output.sourceCore.explanation.includes("r = total / count"), false, "Explanation was forced to reproduce a formula."),
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "passed", "Concise explanation failed grounding."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "Concise explanation caused factual loss."),
    ];
  } };
}

function lexicalExplanationContractCase(): EvalCase {
  return { name: "explanation prompt matches frozen lexical grounding without transferring factual ownership", run: async () => {
    const context = createContext();
    const paraphrase = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(request,
        "The archive safeguards authentic source records.")),
    });
    const provider = new ScriptedProvider((request) => explanationsFor(request,
      "The archive preserves exact source records."));
    const generated = await generateSections({ ...context, provider });
    const prompt = provider.requests[0]!.prompt;
    return [
      ...assertEqual(validateGrounding({ ...context, outputs: paraphrase.outputs }).status, "failed", "Frozen lexical grounding must still reject unsupported vocabulary."),
      ...assertIncludes(prompt, "source vocabulary", "Explanation contract does not disclose the frozen lexical grounding constraint."),
      ...assertIncludes(prompt, "Reuse", "Explanation contract must permit concise local source clauses."),
      ...assertEqual(prompt.includes("Do not choose, restate"), false, "Prompt contradicts source-grounded explanatory clause reuse."),
      ...assertEqual(validateGrounding({ ...context, outputs: generated.outputs }).status, "passed", "Concise local source explanation should pass the unchanged grounding gate."),
      ...assertEqual(diagnoseStudentVisibleUsefulness({ section: context.sections[0]!, source: context.source, output: generated.outputs[0]! }).length, 0, "Source vocabulary must still produce a useful explanation."),
      ...assertDeepEqual(generated.outputs[0]!.sourceCore.keyPoints, paraphrase.outputs[0]!.sourceCore.keyPoints, "Explanation wording altered deterministic evidence."),
    ];
  } };
}

function unsupportedExplanationCase(): EvalCase {
  return { name: "unsupported explanation fails grounding while evidence stays intact", run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(
        request,
        "Orbital telescopes predict tomorrow's fictional weather.",
      )),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "failed", "Unsupported explanation passed grounding."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Grounding failure damaged deterministic evidence."),
    ];
  } };
}

function usefulnessFailureCase(
  name: string,
  explanation: string,
  expectedType: string,
): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(request, explanation)),
    });
    const output = result.outputs[0]!;
    const issues = diagnoseStudentVisibleUsefulness({
      section: context.sections[0]!, source: context.source, output,
    });
    return [
      ...assertEqual(issues.some((issue) => issue.type === expectedType), true, "Expected explanation usefulness failure was not detected."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Usefulness failure damaged deterministic evidence."),
    ];
  } };
}

function similarRowIdentityCase(): EvalCase {
  return { name: "exact similar-row identity remains provenance-sensitive", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const row = targetById(section, "row");
    const altered: SectionOutput = {
      ...assembleDeterministicSectionEvidence({ section, sourceBlocks: context.source.blocks }),
      sourceCore: {
        explanation: "The archive preserves exact source records.",
        keyPoints: section.requiredEvidence!.map((target) =>
          target.id === row.id ? "2026 | South | 42" : renderRequiredEvidenceTarget(target)
        ),
      },
    };
    return assertDeepEqual(
      findMissingRequiredEvidenceTargets(section, altered).map((target) => target.id),
      ["row"],
      "A similar row satisfied the exact source row.",
    );
  } };
}

function formulaIdentityCase(): EvalCase {
  return { name: "similar formula cannot replace exact required formula", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const altered = legacyOutput(section, ["r = total + count"]);
    return assertEqual(
      findMissingRequiredEvidenceTargets(section, altered).some((target) => target.id === "formula"),
      true,
      "A mathematically different formula satisfied exact identity.",
    );
  } };
}

function sourceAbsentCase(): EvalCase {
  return { name: "source-absent target fails before provider reconstruction", run: async () => {
    const context = createContext();
    const section = context.sections[0]!;
    const absent = {
      ...section,
      requiredEvidence: section.requiredEvidence!.map((target) =>
        target.id === "formula"
          ? { ...target, label: "r = total + count", evidenceTexts: ["r = total + count"] }
          : target
      ),
    };
    const changed = withSections(context, [absent]);
    const provider = new ScriptedProvider((request) => explanationsFor(request, "Unused explanation."));
    const result = await generateSections({ ...changed, provider });
    return [
      ...assertEqual(provider.requests.length, 0, "Source-absent evidence reached the provider."),
      ...assertEqual(result.failedSectionIds.includes(absent.id), true, "Source-absent evidence did not fail safely."),
    ];
  } };
}

function zeroCallDispositionCase(name: string, disposition: ReviewerSectionDisposition): EvalCase {
  return { name, run: async () => {
    const context = createContext();
    const section = { ...context.sections[0]!, reviewerDisposition: disposition };
    const changed = withSections(context, [section]);
    const provider = new ScriptedProvider((request) => explanationsFor(request, "Unused explanation."));
    const result = await generateSections({ ...changed, provider });
    return [
      ...assertEqual(provider.requests.length, 0, "Non-standalone node consumed a provider call."),
      ...assertEqual(result.outputs[0]?.sourceCore.explanation, "", "Non-standalone node received invented prose."),
      ...assertEqual(validateDeterministicSectionEvidence(section, result.outputs[0]!).valid, true, "Non-standalone evidence was not assembled deterministically."),
    ];
  } };
}

function conciseExplanationCase(): EvalCase {
  return { name: "one concise grounded explanation sentence passes", run: async () => {
    const context = createContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(
        request,
        "The archive preserves exact source records.",
      )),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(validateGrounding({ ...context, outputs: [output] }).status, "passed", "Grounded sentence failed grounding."),
      ...assertEqual(diagnoseStudentVisibleUsefulness({ section: context.sections[0]!, source: context.source, output }).length, 0, "Concise sentence failed usefulness."),
    ];
  } };
}

function sourceDumpCase(): EvalCase {
  return { name: "source dump fails usefulness while evidence remains valid", run: async () => {
    const context = createContext();
    const dump = Array.from({ length: 12 }, () => "The archive preserves exact source records.").join(" ");
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => explanationsFor(request, dump)),
    });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(diagnoseStudentVisibleUsefulness({ section: context.sections[0]!, source: context.source, output }).some((issue) => issue.type === "SOURCE_DUMP"), true, "Source dump passed usefulness."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, output).valid, true, "Source dump damaged deterministic evidence."),
    ];
  } };
}

function providerDropsAllFactualFieldsCase(): EvalCase {
  return { name: "provider drops every factual field without target loss", run: async () => {
    const context = createContext();
    const provider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The archive preserves exact source records.",
    ));
    const result = await generateSections({ ...context, provider });
    const output = result.outputs[0]!;
    return [
      ...assertEqual(context.sections[0]!.requiredEvidence!.length, 7, "Synthetic proof did not begin with seven mixed targets."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[0]!, output).length, 0, "Explanation-only provider caused target loss."),
      ...assertEqual(output.sourceCore.keyPoints.length, 7, "Final candidate lost mixed deterministic evidence."),
    ];
  } };
}

function batchIsolationCase(): EvalCase {
  return { name: "batched explanations maintain section isolation", run: async () => {
    const context = createTwoSectionContext();
    const provider = new ScriptedProvider((request) => ({
      explanations: (request.metadata?.explanationBatchSectionIds as readonly string[]).map((sectionId) => ({
        sectionId,
        explanation: sectionId === "section-a"
          ? "The amber archive preserves northern records."
          : "The cobalt archive preserves southern records.",
      })),
    }));
    const result = await generateSections({ ...context, provider });
    return [
      ...assertEqual(provider.requests.length, 1, "Independent sections were not batched."),
      ...assertEqual(result.outputs[0]?.sourceCore.explanation.includes("cobalt"), false, "Section B evidence leaked into A."),
      ...assertEqual(result.outputs[1]?.sourceCore.explanation.includes("amber"), false, "Section A evidence leaked into B."),
      ...assertDeepEqual(result.outputs.map((output) => output.plannedSectionId), ["section-a", "section-b"], "Stable section IDs changed in a batch."),
    ];
  } };
}

function partialBatchFailureCase(): EvalCase {
  return { name: "partial batch failure retries only the failed explanation", run: async () => {
    const context = createTwoSectionContext();
    const initial = await generateSections({
      ...context,
      provider: new ScriptedProvider((request) => ({ explanations: [
        { sectionId: "section-a", explanation: "The amber archive preserves northern records." },
        { sectionId: "section-b", explanation: "Orbital telescopes invent unrelated claims." },
      ] })),
    });
    const outputs = initial.outputs;
    const retryProvider = new ScriptedProvider((request) => explanationsFor(
      request,
      "The cobalt archive preserves southern records.",
    ));
    const retried = await retryFailedSections({
      outputs,
      coverage: verifyCoverage({ ...context, outputs }),
      grounding: validateGrounding({ ...context, outputs }),
      leakage: validateLeakage({ ...context, outputs }),
      plan: context.plan,
      source: context.source,
      outline: context.outline,
      provider: retryProvider,
      retryPolicy: { maxRetries: 1, retryWeakSections: true, retryFailedSections: true },
    });
    return [
      ...assertDeepEqual(retryProvider.requests[0]?.metadata?.explanationBatchSectionIds, ["section-b"], "Valid batch member was regenerated."),
      ...assertEqual(retried[0]?.sourceCore.explanation, outputs[0]?.sourceCore.explanation, "Valid explanation changed during isolated retry."),
      ...assertEqual(findMissingRequiredEvidenceTargets(context.sections[1]!, retried[1]).length, 0, "Failed explanation repair affected evidence."),
    ];
  } };
}

function batchOrderingCase(): EvalCase {
  return { name: "provider response order cannot change reviewer order", run: async () => {
    const context = createTwoSectionContext();
    const result = await generateSections({
      ...context,
      provider: new ScriptedProvider(() => ({ explanations: [
        { sectionId: "section-b", explanation: "The cobalt archive preserves southern records." },
        { sectionId: "section-a", explanation: "The amber archive preserves northern records." },
      ] })),
    });
    return assertDeepEqual(
      result.outputs.map((output) => output.plannedSectionId),
      ["section-a", "section-b"],
      "Provider response order changed source order.",
    );
  } };
}

function retryBoundCase(): EvalCase {
  return { name: "failed explanation obeys the retry bound", run: async () => {
    const context = createContext();
    const initialProvider = new ScriptedProvider((request) => explanationsFor(request, "Using records"));
    const initial = await generateSections({ ...context, provider: initialProvider });
    const outputs = initial.outputs;
    const retryProvider = new ScriptedProvider((request) => explanationsFor(request, "Using records"));
    const final = await retryFailedSections({
      outputs,
      coverage: verifyCoverage({ ...context, outputs }),
      grounding: validateGrounding({ ...context, outputs }),
      leakage: validateLeakage({ ...context, outputs }),
      plan: context.plan,
      source: context.source,
      outline: context.outline,
      provider: retryProvider,
      retryPolicy: { maxRetries: 2, retryWeakSections: true, retryFailedSections: true },
    });
    return [
      ...assertEqual(retryProvider.requests.length, 2, "Explanation retry exceeded or skipped the bound."),
      ...assertEqual(validateDeterministicSectionEvidence(context.sections[0]!, final[0]!).valid, true, "Bounded retries changed deterministic evidence."),
    ];
  } };
}

function permanentProviderFailureCase(): EvalCase {
  return { name: "permanent provider quota failure is not retried", run: async () => {
    let requests = 0;
    const reviewer = await runPipeline({
      input: {
        kind: "plain-text",
        title: "Quota-safe fallback",
        text: "The archive preserves exact source records.",
      },
      provider: {
        generate: async () => {
          requests += 1;
          throw new Error("429 You have no credits remaining.");
        },
      },
    });
    return [
      ...assertEqual(requests, 1, "Permanent quota failure triggered provider retries."),
      ...assertEqual(reviewer.metadata.generationMetrics?.providerRetryCount, 0, "Permanent failure was recorded as a retry loop."),
      ...assertEqual(reviewer.metadata.generationMetrics?.factualCompletionRetryCount, 0, "Permanent failure triggered factual completion."),
    ];
  } };
}

class ScriptedProvider implements GenerationProvider {
  public readonly requests: GenerationRequest<unknown>[] = [];
  public constructor(
    private readonly response: (request: GenerationRequest<unknown>) => unknown,
  ) {}
  public async generate<TOutput>(request: GenerationRequest<TOutput>): Promise<TOutput> {
    this.requests.push(request as GenerationRequest<unknown>);
    return this.response(request as GenerationRequest<unknown>) as TOutput;
  }
}

function explanationsFor(
  request: GenerationRequest<unknown>,
  explanation: string,
): unknown {
  const ids = request.metadata?.explanationBatchSectionIds;
  return {
    explanations: Array.isArray(ids)
      ? ids.map((sectionId) => ({ sectionId, explanation }))
      : [],
  };
}

function createContext() {
  const blocks = mixedTargets.map(([id, kind, label], order) => ({
    id: `block-${id}`,
    kind: kind === "formula" || kind === "code" ? kind : "paragraph" as const,
    text: label,
    order,
  }));
  const source: NormalizedSource = {
    id: "deterministic-source",
    title: "Archive Records",
    kind: "document",
    language: "en",
    metadata: {},
    blocks,
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  const targets: RequiredEvidenceTarget[] = mixedTargets.map(([id, kind, label], order) => ({
    id,
    kind,
    label,
    evidenceTexts: [label],
    sourceBlockIds: [`block-${id}`],
    provenance: [{ sourceBlockId: `block-${id}`, sourceOrder: order }],
    ...(kind === "relationship" ? { relationshipLabel: "depends on" } : {}),
  }));
  const section = createSection("section-mixed", "Mixed evidence", source.blocks.map((block) => block.id), targets);
  return contextFrom(source, [section]);
}

function createTwoSectionContext() {
  const source: NormalizedSource = {
    id: "batch-source",
    title: "Two archives",
    kind: "document",
    language: "en",
    metadata: {},
    blocks: [
      { id: "block-a", kind: "paragraph", text: "The amber archive preserves northern records.", order: 0 },
      { id: "block-b", kind: "paragraph", text: "The cobalt archive preserves southern records.", order: 1 },
    ],
    createdAt: "2026-09-05T00:00:00.000Z",
  };
  const sections = [
    createSection("section-a", "Amber archive", ["block-a"], [target("target-a", "concept", source.blocks[0]!.text, "block-a", 0)], 0),
    createSection("section-b", "Cobalt archive", ["block-b"], [target("target-b", "concept", source.blocks[1]!.text, "block-b", 1)], 1),
  ];
  return contextFrom(source, sections);
}

function contextFrom(source: NormalizedSource, sections: readonly PlannedSection[]) {
  const outline: SourceOutline = {
    id: `${source.id}-outline`,
    sourceId: source.id,
    title: source.title,
    sections: sections.map((section) => ({
      id: section.sourceSectionId,
      title: section.title,
      order: section.order,
      startOffset: 0,
      endOffset: section.sourceEndOffset,
      tokenWeight: section.tokenWeight,
      sourceBlockIds: section.sourceBlockIds,
      blockIds: section.sourceBlockIds,
      roughStartBlockId: section.sourceBlockIds[0]!,
      roughEndBlockId: section.sourceBlockIds.at(-1)!,
      tags: ["concept"],
      confidence: 1,
    })),
  };
  const plan: GenerationPlan = {
    id: `${source.id}-plan`,
    sourceId: source.id,
    outlineId: outline.id,
    title: source.title,
    sections,
    metadata: { sectionCount: sections.length, sourceBlockCount: source.blocks.length },
    sourceOutline: outline,
  };
  return { source, outline, plan, sections };
}

function withSections(
  context: ReturnType<typeof createContext>,
  sections: readonly PlannedSection[],
) {
  return contextFrom(context.source, sections);
}

function createSection(
  id: string,
  title: string,
  blockIds: readonly string[],
  targets: readonly RequiredEvidenceTarget[],
  order = 0,
): PlannedSection {
  return {
    id,
    sourceSectionId: `${id}-source`,
    title,
    order,
    schemaKind: "concept-card",
    target: {
      objective: `Explain ${title}.`,
      itemCount: targets.length,
      focus: title,
      requiredSourceBlockIds: blockIds,
      expectedTags: ["concept"],
      coverageRules: ["Represent exact required evidence."],
    },
    sourceBlockIds: blockIds,
    tokenWeight: 40,
    targetItemCount: targets.length,
    sourceStartOffset: 0,
    sourceEndOffset: 10_000,
    semanticPlan: { kind: "concept", units: [], explanationUseful: true },
    requiredEvidence: targets,
    supportingSourceBlockIds: [],
    reviewerDisposition: "standalone",
  };
}

function target(
  id: string,
  kind: RequiredEvidenceTarget["kind"],
  label: string,
  blockId: string,
  sourceOrder: number,
): RequiredEvidenceTarget {
  return {
    id,
    kind,
    label,
    evidenceTexts: [label],
    sourceBlockIds: [blockId],
    provenance: [{ sourceBlockId: blockId, sourceOrder }],
  };
}

function targetById(section: PlannedSection, id: string): RequiredEvidenceTarget {
  const found = section.requiredEvidence?.find((target) => target.id === id);
  if (!found) throw new Error(`Missing test target ${id}.`);
  return found;
}

function legacyOutput(section: PlannedSection, keyPoints: readonly string[]): SectionOutput {
  return {
    id: "legacy-output",
    kind: section.schemaKind,
    plannedSectionId: section.id,
    title: section.title,
    sourceBlockIds: [...section.sourceBlockIds],
    sourceCore: {
      explanation: "The archive preserves exact source records.",
      keyPoints,
    },
    enrichment: null,
  } as SectionOutput;
}

export async function runReviewerDeterministicEvidenceEvals(): Promise<boolean> {
  const result = await runEvalSuite(reviewerDeterministicEvidenceSuite);
  printEvalSuiteResult(result);
  setFailureExitCode([result]);
  return result.status === "passed";
}

if (isDirectExecution(import.meta.url)) {
  await runReviewerDeterministicEvidenceEvals();
}

function presentationRegressionCases(): readonly EvalCase[] {
  const row = (id: string, label: string, index: number): RequiredEvidenceTarget => ({
    ...target(id, 'table-row', label, 'table-a', 1),
    provenance: [{sourceBlockId: 'table-a', sourceOrder: 1, tableBlockId: 'table-a', tableRowIndex: index}],
  });
  const rows = [row('header', 'Region | Count', 0), row('north', 'North | 42', 1), row('south', 'South | 17', 2)];
  const project = () => presentDeterministicEvidence(rows);
  const cases: EvalCase[] = [
    {name: 'B17 serialized typed evidence still satisfies the information-value gate', run: async () => {
      const context = createContext(); const section = context.sections[0]!;
      const base = assembleDeterministicSectionEvidence({section,sourceBlocks:context.source.blocks});
      const core = presentDeterministicEvidence(section.requiredEvidence!);
      const output: SectionOutput = {...base,deterministicEvidence:undefined,sourceCore:{explanation:'The archive preserves exact source records.',keyPoints:[],evidence:[...(core.evidence??[]),...core.keyPoints.map(text=>({kind:'source' as const,text}))]}};
      return [...assertEqual(diagnoseStudentVisibleUsefulness({section,source:context.source,output}).some(issue=>issue.type==='LOW_INFORMATION_SECTION'),false,'Information in typed blocks was ignored.')];
    }},
    {name: 'B17 source predicate gains only its local heading subject', run: async () => [
      ...assertEqual(completeSourcePredicate('Register','Is a record of regional counts.'),'Register is a record of regional counts.','Source predicate subject was not restored.'),
      ...assertEqual(completeSourcePredicate('Register','The register contains regional counts.'),'The register contains regional counts.','An existing subject was duplicated.'),
      ...assertEqual(completeSourcePredicate('Register','Reports regional counts.'),'Register reports regional counts.','Predicate wording was rewritten.'),
    ]},
    {name: 'B17 title-completed source predicate is not repeated as a bullet', run: async () => {
      const context = createContext();
      const base = assembleDeterministicSectionEvidence({section:context.sections[0]!,sourceBlocks:context.source.blocks});
      const output: SectionOutput = {...base, title:'Archive', sourceCore:{explanation:'Archive is a record of regional counts.',keyPoints:[]}, deterministicEvidence:{...base.deterministicEvidence!,presentation:{explanation:'',keyPoints:['• is a record of regional counts','A separate source fact.']}}};
      return [...assertDeepEqual(toDefaultStudentVisibleSectionOutput(output).sourceCore.keyPoints,['A separate source fact.'],'Local subject completion left a duplicate predicate.')];
    }},
    {name: 'B17 table rows follow source row order rather than semantic discovery order', run: async () => {
      return [...assertEqual(presentDeterministicEvidence([rows[2]!, rows[0]!, rows[1]!]).evidence?.[0]?.text, 'Region | Count\nNorth | 42\nSouth | 17', 'Table header or rows were reordered by semantic discovery.')];
    }},
    {name: 'B17 table rows are retained separately from explanatory points', run: async () => [
      ...assertEqual(project().keyPoints.length, 0, 'Raw table leaked into key points.'),
      ...assertEqual(project().evidence?.[0]?.kind, 'table', 'Table type was lost.'),
      ...assertIncludes(project().evidence?.[0]?.text ?? '', 'South | 17', 'Table row lost.'),
    ]},
    {name: 'B17 exact table passage is not duplicated in concept display', run: async () => {
      const tableText = rows.map(t => t.label).join('\n');
      const passage = target('passage', 'concept', `The record contains regional counts. ${tableText}`, 'table-a', 1);
      const core = presentDeterministicEvidence([passage,...rows]);
      return [
        ...assertEqual(core.keyPoints.some(point => point.includes('North | 42')), false, 'Whole table remains in prose.'),
        ...assertEqual(rows.every(t => core.evidence?.some(b => b.text.includes(t.label))), true, 'Rows were summarized away.'),
      ];
    }},
    {name: 'B17 code whitespace remains verbatim in a typed code block', run: async () => {
      const code = 'function values() {\n  return 42;\n}';
      const core = presentDeterministicEvidence([target('code','code',code,'code-a',0)]);
      return [...assertEqual(core.evidence?.[0]?.kind,'code','Code flattened into prose.'), ...assertEqual(core.evidence?.[0]?.text,code,'Code whitespace rewritten.')];
    }},
    {name: 'B17 extractive fallback is displayed once', run: async () => {
      const context = createContext();
      const base = assembleDeterministicSectionEvidence({section:context.sections[0]!,sourceBlocks:context.source.blocks});
      const explanation = base.sourceCore.keyPoints[0]!;
      const output: SectionOutput = {...base,sourceCore:{...base.sourceCore,explanation},deterministicEvidence:{...base.deterministicEvidence!,presentation:presentDeterministicEvidence(context.sections[0]!.requiredEvidence!)}};
      const visible = toDefaultStudentVisibleSectionOutput(output);
      return [...assertEqual(visible.sourceCore.explanation,explanation,'Fallback removed.'),...assertEqual(visible.sourceCore.keyPoints.includes(explanation),false,'Fallback repeated as key point.')];
    }},
    {name: 'B17 duplicate explanation bullet normalization preserves distinct facts', run: async () => {
      const context = createContext();const base = assembleDeterministicSectionEvidence({section:context.sections[0]!,sourceBlocks:context.source.blocks});
      const explanation='The archive preserves exact source records.';
      const output: SectionOutput={...base,sourceCore:{...base.sourceCore,explanation},deterministicEvidence:{...base.deterministicEvidence!,presentation:{explanation:'',keyPoints:['• '+explanation,'The archive preserves other source records.']}}};
      const visible=toDefaultStudentVisibleSectionOutput(output);
      return [...assertDeepEqual(visible.sourceCore.keyPoints,['The archive preserves other source records.'],'Exact duplicate filtering removed a distinct idea.')];
    }},
    {name: 'B17 presentation commands stay out of explanation evidence',run: async () =>{
      const context=createContext();const section=context.sections[0]!;
      const blocks=[{id:section.sourceBlockIds[0]!,order:0,kind:'paragraph' as const,text:'Remember that the archive is important.\nThe archive preserves exact source records.\nCalculate the following values.'}];
      return [...assertDeepEqual(explanationEvidenceFor(section,blocks).map(b=>b.text),['The archive preserves exact source records.'],'Presentation-only commands entered explanatory context.')];
    }},
    {name: 'B17 every mixed required target survives the presentation projection',run: async () =>{
      const context=createContext(); const section=context.sections[0]!;
      const base=assembleDeterministicSectionEvidence({section,sourceBlocks:context.source.blocks});
      const visible={...base,deterministicEvidence:undefined,sourceCore:presentDeterministicEvidence(section.requiredEvidence!)};
      return [...assertEqual(findMissingRequiredEvidenceTargets(section,visible).length,0,'Projection lost required evidence.')];
    }},
    {name: 'B17 identical values in distinct table rows survive deduplication',run: async () =>{
      const core=presentDeterministicEvidence([row('one','North | 42',1),row('two','North | 42',2)]);
      return [...assertEqual(core.evidence?.[0]?.text.split('\n').length,2,'Distinct repeated source rows collapsed.')];
    }},
    {name: 'B17 identical table row identity is emitted once',run: async () =>{
      const core=presentDeterministicEvidence([rows[1]!,{...rows[1]!,id:'duplicate-semantic-row'}]);
      return [...assertEqual(core.evidence?.[0]?.text,'North | 42','Same row duplicated by semantic and typed paths.')];
    }},
    {name: 'B17 formula and result pair both remain exact',run: async () =>{
      const core=presentDeterministicEvidence([target('formula','formula','r = 84 / 2','calc',0),target('result','result-value','r = 42','calc',0)]);
      return [...assertDeepEqual(core.evidence,[{kind:'formula',text:'r = 84 / 2'},{kind:'result',text:'r = 42'}],'Formula/result relationship lost.')];
    }},
    {name: 'B17 explanation shaping cannot borrow adjacent source blocks',run: async () =>{
      const context=createTwoSectionContext();
      const evidence=explanationEvidenceFor(context.sections[0]!,context.source.blocks);
      return [...assertEqual(evidence.length,1,'Adjacent section entered local context.'),...assertEqual(evidence[0]?.blockId,'block-a','Context borrowed sibling evidence.')];
    }},
    {name: 'B17 presentation mutation cannot gain factual ownership',run: async () =>{
      const context=createContext();const section=context.sections[0]!;
      const base=assembleDeterministicSectionEvidence({section,sourceBlocks:context.source.blocks});
      const malicious={...base,deterministicEvidence:{...base.deterministicEvidence!,presentation:{explanation:'',keyPoints:['Invented evidence.']}}};
      return [...assertEqual(validateDeterministicSectionEvidence(section,malicious).valid,false,'Changed display evidence was accepted.')];
    }},
  ];
  for (const exact of [true,false]) cases.push({name:exact?'B17 source-authorized same-concept combination remains accepted':'B17 unsupported sibling combination remains rejected',run: async () =>{
    const context=createContext();const section={...context.sections[0]!,semanticPlan:{kind:'concept' as const,explanationUseful:true,units:[{kind:'point' as const,label:'The amber archive stores northern records.',items:[]},{kind:'point' as const,label:'The cobalt archive stores southern records.',items:[]}]}};
    const text='The amber archive stores northern records and the cobalt archive stores southern records.';
    const output={...assembleDeterministicSectionEvidence({section,sourceBlocks:context.source.blocks}),sourceCore:{explanation:text,keyPoints:[]}};
    const issues=verifySemanticRelationships({section,output,allSections:[section],currentSourceText:exact?text:section.semanticPlan.units.map(u=>u.label).join('\n')});
    return [...assertEqual(issues.some(i=>i.type==='grounding-sibling-fusion'),!exact,'Source-authorized fusion boundary changed.')];
  }});
  return cases;
}

function sourceRepresentationRegressionCases(): readonly EvalCase[] {
  const formula = target('calc-formula', 'formula', 'r = 84 / 2', 'calculation', 0);
  const result = target('calc-result', 'result-value', 'r = 42', 'calculation', 0);
  const parent = target('calc-parent', 'concept', 'Register values: r = 84 / 2 r = 42', 'calculation', 0);
  const children = [formula, result].map(t => ({...t, relationshipLabel: parent.label}));
  const targets = [parent, ...children];
  const visibleText = (core: ReturnType<typeof presentDeterministicEvidence>) =>
    [...core.keyPoints, ...(core.evidence ?? []).map(b => b.text)].join('\n');
  const item = {text: 'r = 84 / 2 r = 42', sourceBlockIds: ['calculation']};
  const typed = {explanation: '', keyPoints: [], evidence: [{kind: 'formula' as const, text: formula.label}, {kind: 'result' as const, text: result.label}]};
  const missing = (ts: readonly RequiredEvidenceTarget[], core: typeof typed | ReturnType<typeof presentDeterministicEvidence>) => {
    const section = createSection('projection', 'Register', ['calculation'], ts);
    return findMissingRequiredEvidenceTargets(section, {id: 'output', kind: 'concept-card', plannedSectionId: section.id,
      title: section.title, sourceBlockIds: section.sourceBlockIds, sourceCore: core, enrichment: null});
  };
  const row = (id: string, text: string, index: number, block = 'table') => ({
    ...target(id, 'table-row', text, block, 1),
    provenance: [{sourceBlockId: block, sourceOrder: 1, tableBlockId: block, tableRowIndex: index}],
  });
  const rows = [row('h', 'Region | Count', 0), row('a', 'Amber | 42', 1), row('b', 'Cobalt | 17', 2)];
  const check = (name: string, run: () => readonly EvalIssue[]): EvalCase => ({name: `B18 ${name}`, run: async () => run()});
  return [
    check('composite parent is conserved without raw duplicate display', () => [
      ...assertEqual(missing(targets, presentDeterministicEvidence(targets)).length, 0, 'Parent lost.'),
      ...assertEqual(visibleText(presentDeterministicEvidence(targets)).split(formula.label).length - 1, 1, 'Formula duplicated.'),
    ]),
    check('unique composite content stays visible', () => assertIncludes(visibleText(presentDeterministicEvidence(targets)), 'Register values:', 'Unique content lost.')),
    check('owned formula and result collectively satisfy their source item', () => assertEqual(sourceItemHasVisibleOwnedEvidence(item, [formula, result], typed), true, 'Owned child coverage ignored.')),
    check('unrelated identical child evidence cannot satisfy source identity', () => assertEqual(sourceItemHasVisibleOwnedEvidence({...item, sourceBlockIds: ['unrelated']}, [formula, result], typed), false, 'Unrelated source accepted.')),
    check('source-item validation counts a legitimate typed formula', () => assertEqual(sourceItemHasVisibleOwnedEvidence({...item, text: formula.label}, [formula], typed), true, 'Typed formula ignored.')),
    check('hidden targets do not satisfy visible source-item coverage', () => assertEqual(sourceItemHasVisibleOwnedEvidence(item, [formula, result], {explanation: '', keyPoints: []}), false, 'Hidden facts accepted.')),
    check('explicit parent label is emitted once for adjacent children', () => assertEqual(visibleText(presentDeterministicEvidence(targets)).split('Register values:').length - 1, 1, 'Parent label repeated.')),
    check('same label remains in distinct source contexts', () => {
      const first = target('p1', 'concept', 'Recorded values', 'north', 0);
      const second = target('p2', 'concept', 'Recorded values', 'south', 3);
      const ts = [first, {...target('c1', 'result-value', 'North = 42', 'north', 1), relationshipLabel: first.label}, second,
        {...target('c2', 'result-value', 'South = 17', 'south', 4), relationshipLabel: second.label}];
      return assertEqual(visibleText(presentDeterministicEvidence(ts)).split(first.label).length - 1, 2, 'Distant parent context erased.');
    }),
    check('identical valued distinct rows remain distinct', () => assertEqual(presentDeterministicEvidence([rows[1]!, row('distinct', rows[1]!.label, 2)]).evidence?.[0]?.text.split('\n').length, 2, 'Distinct row collapsed.')),
    check('same row identity is emitted once', () => assertEqual(presentDeterministicEvidence([rows[1]!, {...rows[1]!, id: 'alias'}]).evidence?.[0]?.text, rows[1]!.label, 'Same row duplicated.')),
    check('formula and result ownership is preserved', () => {
      const map = buildSourceRepresentationMap(targets);
      return assertEqual(map.entries.filter(e => e.target.kind === 'formula' || e.target.kind === 'result-value').every(e => e.target.sourceBlockIds[0] === 'calculation'), true, 'Source ownership changed.');
    }),
    check('complete table children satisfy their composite parent', () => {
      const p = target('table-parent', 'concept', rows.map(r => r.label).join('\n'), 'table', 1);
      const ts = [p, ...rows]; const core = presentDeterministicEvidence(ts);
      return [...assertEqual(core.keyPoints.length, 0, 'Raw table repeated.'), ...assertEqual(missing(ts, core).length, 0, 'Table parent not covered.')];
    }),
    check('partial child set cannot falsely satisfy the composite parent', () => {
      const core = presentDeterministicEvidence(targets);
      return assertEqual(missing(targets, {...core, evidence: core.evidence?.filter(b => b.kind !== 'result')}).some(t => t.id === parent.id), true, 'Missing result silently accepted.');
    }),
    check('missing unique parent word cannot pass on token recall', () => {
      const p = target('partial', 'concept', 'Amber bronze cobalt denim emerald fuchsia gold hazel indigo jade unique', 'calculation', 0);
      return assertEqual(missing([p], {explanation: '', keyPoints: [], evidence: [{kind: 'source', text: p.label.replace(' unique', '')}]}).length, 1, 'Incomplete text accepted.');
    }),
    check('malformed cached code stays exact', () => {
      const text = 'def values(): yield 1 yield 2';
      return assertEqual(presentDeterministicEvidence([target('flat', 'code', text, 'cache', 0)]).evidence?.[0]?.text, text, 'Indentation inferred.');
    }),
    check('relationship metadata is not repeated as study prose', () => assertEqual(presentDeterministicEvidence(targets).evidence?.some(b => b.text.includes(parent.label)), false, 'Full relationship passage repeated.')),
    check('target identities and factual content are unchanged by projection', () => {
      const before = JSON.stringify(targets); presentDeterministicEvidence(targets);
      return assertEqual(JSON.stringify(targets), before, 'Projection mutated manifest.');
    }),
    check('additional evidence spans remain required independently of labels', () => {
      const t = {...formula, evidenceTexts: [formula.label, 'r = 42']};
      return [...assertIncludes(visibleText(presentDeterministicEvidence([t])), 'r = 42', 'Additional factual span hidden.'),
        ...assertEqual(missing([t], {...typed, evidence: typed.evidence.slice(0, 1)}).length, 1, 'Label alone satisfied a multi-span contract.')];
    }),
    check('provider cannot alter source representation ownership', () => {
      const section = createSection('protected', 'Register', ['calculation'], targets);
      const output = assembleDeterministicSectionEvidence({section, sourceBlocks: [{id: 'calculation', order: 0, kind: 'paragraph', text: parent.label}]});
      const changed = {...output, deterministicEvidence: {...output.deterministicEvidence!, presentation: {...typed, evidence: typed.evidence.slice(0, 1)}}};
      return assertEqual(validateDeterministicSectionEvidence(section, changed).valid, false, 'Provider-owned projection accepted.');
    }),
    check('source row order is deterministic', () => assertEqual(presentDeterministicEvidence([rows[2]!, rows[0]!, rows[1]!]).evidence?.[0]?.text, rows.map(r => r.label).join('\n'), 'Source row order lost.')),
    check('coarse provenance cannot reorder the frozen semantic list', () => {
      const ts = [target('first', 'list-item', '1. First action.', 'a', 10),
        target('second', 'list-item', '2. Second action.', 'b', 20),
        target('third', 'list-item', '3. Third action.', 'parent', 0)];
      return assertDeepEqual(presentDeterministicEvidence(ts).keyPoints, ts.map(t => t.label), 'Block provenance reordered a semantic list.');
    }),
    check('short scalar children cannot shred source prose', () => {
      const p = target('prose', 'concept', 'Locate the class where n/2 is found.', 'calculation', 0);
      const scalar = {...target('scalar', 'result-value', '2', 'calculation', 0), relationshipLabel: p.label};
      return assertIncludes(visibleText(presentDeterministicEvidence([p, scalar])), p.label, 'Scalar was subtracted from prose.');
    }),
    check('exact prose prefix can yield ownership to cached code', () => {
      const code = target('code-child', 'code', 'const total = values.length;', 'code', 0);
      const p = target('code-parent', 'code', `Recorded code: ${code.label}`, 'code', 0);
      const core = presentDeterministicEvidence([p, code]);
      return [...assertEqual(core.evidence?.[0]?.text, code.label, 'Typed code changed.'), ...assertEqual(visibleText(core).split(code.label).length - 1, 1, 'Code duplicated.')];
    }),
    check('formula runs are not split by scalar children', () => {
      const p = target('math', 'formula', 'r = 84 / 2', 'calculation', 0);
      return assertEqual(presentDeterministicEvidence([p, target('denominator', 'result-value', '2', 'calculation', 0)]).evidence?.[0]?.text, p.label, 'Formula run split.');
    }),
    check('partial table row collection preserves unique source rows', () => {
      const p = target('table-parent', 'concept', rows.map(r => r.label).join('\n'), 'table', 1);
      const core = presentDeterministicEvidence([p, rows[0]!, rows[1]!]);
      return assertIncludes(visibleText(core), rows[2]!.label, 'Unique source row lost.');
    }),
  ];
}
