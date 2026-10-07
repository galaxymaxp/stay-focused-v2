import type { QuizDifficulty } from '@stay-focused/shared';
import type { QuizPlan, QuizRegion } from './generation';
import { supportsMatching } from './matching';
import { supportConceptId, supportStrength } from './support';

export const QUIZ_POOL_SIZE = 2;
export const QUIZ_MAX_AUTHOR_CALLS = 4;
export type QuizEvidenceAffordance = 'conceptual_recall' | 'comparison' | 'cause_effect' | 'relationship' | 'sequence' | 'classification' | 'application';
export interface QuizQuestionBlueprint {
    id: string;
    slotId: string;
    supportIds: string[];
    evidenceOwnerIds: string[];
    targetConceptIds: string[];
    affordance: QuizEvidenceAffordance;
    difficulty: QuizDifficulty;
    questionIntent: string;
    intentKey: string;
    patternKey: string;
    prohibitedPatterns: string[];
}
const intents: Record<QuizEvidenceAffordance, string[]> = {
    comparison: ['Distinguish the explicitly contrasted functions or conditions.', 'Identify a consequence of confusing the explicitly contrasted concepts.'],
    cause_effect: ['Explain the explicitly stated cause and its consequence.', 'Identify which stated outcome follows when the supported cause occurs.'],
    relationship: ['Test how the explicitly linked concepts constrain one another.', 'Identify a decision justified by the stated dependency.'],
    sequence: ['Test why the source-stated prerequisite must precede the next action.', 'Identify which action is appropriate at a stated process stage.'],
    classification: ['Classify an example explicitly supplied by the evidence.', 'Distinguish the source-supported category from a contradicted classification.'],
    application: ['Apply the source-stated conditional rule to its supported case.', 'Identify a decision that violates the source-stated conditional rule.'],
    conceptual_recall: ['Test the substantive function of the source concept without giving its defining answer in the stem.', 'Test the boundary of the stated concept using a source-refuted misconception.'],
};
/** Cues authorize planning possibilities, never truth: every candidate still needs exact
 * evidence and an independent skeptical audit. No application from a definition alone. */
export function evidenceAffordances(region: QuizRegion): QuizEvidenceAffordance[] {
    const text = region.text;
    const values: QuizEvidenceAffordance[] = [];
    if (supportsMatching(region)) values.push('relationship');
    if (/\b(?:whereas|compared with|in contrast|rather than|while)\b/i.test(text)) values.push('comparison');
    if (/\b(?:because|causes?|leads? to|therefore|results? in|prevents?)\b/i.test(text)) values.push('cause_effect');
    if (/\b(?:before|after|first.+then|followed by)\b/i.test(text)) values.push('sequence');
    if (/\b(?:such as|for example|classified as|categories|types of)\b/i.test(text)) values.push('classification');
    if (/\bif\b.+\b(?:then|must|should|will|restores?|requires?)\b/i.test(text)) values.push('application');
    if (/\b(?:depends? on|requires?|determines?|only when|only if|limits?|protects?|ensures?|establishes?|specifies|maps|returns?|contains?|includes?|connects?|removes?|grants?|supports?|supplies|compares?|measures?|provides?|allows?|enables?|restricts?|detects?)\b/i.test(text)) values.push('relationship');
    return [...new Set([...values, 'conceptual_recall' as const])];
}
export function blueprintCompatible(blueprint: QuizQuestionBlueprint, region: QuizRegion): boolean {
    return blueprint.supportIds.length === 1 && blueprint.supportIds[0] === region.id
        && supportStrength(region) > 0
        && evidenceAffordances(region).includes(blueprint.affordance)
        && (blueprint.difficulty === 'easy' || blueprint.affordance !== 'conceptual_recall');
}
export function duplicateBlueprintIntent(a: QuizQuestionBlueprint, b: QuizQuestionBlueprint): boolean {
    return a.intentKey === b.intentKey || (a.affordance === b.affordance && a.questionIntent === b.questionIntent
        && a.targetConceptIds.some(concept => b.targetConceptIds.includes(concept)));
}
export function planBlueprintPool(plan: QuizPlan, slot: QuizPlan['allocation'][number], round: number,
    used: readonly QuizQuestionBlueprint[], failedIntentKeys: readonly string[] = [], findingCodes: readonly string[] = [], failedPatternKeys: readonly string[] = []): QuizQuestionBlueprint[] {
    const region = [...plan.topics, ...(plan.reserveTopics ?? [])].find(topic => topic.id === slot.topicId)!;
    // Source subject, rather than a question ID, makes repeated concepts comparable.
    const concept = supportConceptId(region);
    const available = supportStrength(region) > 0 ? evidenceAffordances(region).filter(affordance => slot.type === 'matching' ? affordance === 'relationship' : slot.difficulty === 'easy' || affordance !== 'conceptual_recall') : [];
    const choices = available.flatMap(affordance => (slot.type === 'matching'
        ? ['Associate explicitly defined source concepts with their distinct meanings.', 'Associate explicitly stated items with their distinct functions or effects.']
        : intents[affordance]).map((questionIntent, index): QuizQuestionBlueprint => ({
        id: `${slot.id}:r${round + 1}:${affordance}:${index + 1}`, slotId: slot.id, supportIds: [region.id],
        evidenceOwnerIds: [...new Set(region.sourceRefs.map(ref => `${ref.materialId}:${ref.regionId}`))],
        targetConceptIds: [concept], affordance, difficulty: slot.difficulty, questionIntent,
        intentKey: `${concept}|${affordance}|${index}`,
        patternKey: `${affordance}|${index}`,
        prohibitedPatterns: [...new Set(['formatting_trivia', 'list_position_trivia', 'sentence_fragment_completion', 'wording_only_recognition', 'answer_restatement', 'definition_paraphrase', 'unsupported_inference', ...findingCodes])],
    })));
    const eligible = choices.filter(choice => !failedIntentKeys.includes(choice.intentKey) && !failedPatternKeys.includes(choice.patternKey)
        && !used.some(previous => duplicateBlueprintIntent(choice, previous)));
    // Balance archetypes across evidence owners/concepts; stable source order breaks ties.
    const rank = (blueprint: QuizQuestionBlueprint) => used.filter(previous => previous.affordance === blueprint.affordance).length * 4
        + used.filter(previous => previous.evidenceOwnerIds.some(owner => blueprint.evidenceOwnerIds.includes(owner))).length;
    eligible.sort((a, b) => rank(a) - rank(b));
    const selected: QuizQuestionBlueprint[] = [];
    for (const blueprint of eligible) {
        if (selected.length === QUIZ_POOL_SIZE) break;
        if (!selected.some(previous => duplicateBlueprintIntent(previous, blueprint))) selected.push(blueprint);
    }
    return selected;
}
