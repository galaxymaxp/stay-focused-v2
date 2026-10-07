import { createHash } from 'node:crypto';
import type { QuizSourceReference } from '@stay-focused/shared';
import type { QuizRegion } from './generation';

export const MAX_QUIZ_SUPPORT_CHARS = 2400;
const normalize = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const assertion = /\b(?:is|are|means|refers|checks?|grants?|transforms?|limits?|requires?|determines?|protects?|ensures?|establishes?|specifies|maps|removes?|returns?|contains?|includes?|connects?|supports?|supplies|compares?|measures?|provides?|allows?|enables?|restricts?|detects?|prevents?|validates?|uses?|keeps?|associates?|occurs?|strengthens?|separates?|combines?|records?|verifies|iterates|restores?|names?|states?|judges?|follows?|must|should|increases?|decreases?)\b|[=|]/i;
const continuation = /^(?:it|its|this|these|those|they|such|for example|for instance|if|when|unless|because|therefore|as a result|in contrast|whereas|however|but|otherwise|the same|only|after|before|solution|\d+[.)])\b/i;

/** Planning evidence, not a correctness verdict. Independent semantic gates remain mandatory. */
export function supportStrength(region: QuizRegion): number {
    const text = region.text, words = normalize(text).split(' ');
    if (text.length > MAX_QUIZ_SUPPORT_CHARS || normalize(text).length < 35 || words.length < 6 || !assertion.test(text)) return 0;
    const facts = text.split(/\n|(?<=[.!?])\s+/).filter(part => assertion.test(part) && normalize(part).length >= 25).length;
    const links = text.match(/\b(?:because|whereas|unlike|if|when|unless|before|after|therefore|rather than|for example|such as|but|only)\b/gi)?.length ?? 0;
    return Math.min(facts, 6) * 3 + Math.min(links, 6) * 2 + Math.min(words.length, 150) / 20;
}
export function supportConceptId(region: QuizRegion): string {
    const focus = region.focusText ?? region.text;
    const subject = normalize(focus.split(/\b(?:is|are|means|refers|checks|grants|transforms|limits|requires|determines|protects|ensures|establishes|specifies|maps|prevents|before|whereas)\b/i)[0]!).split(' ').slice(0, 8).join(' ');
    return createHash('sha256').update(subject || normalize(region.label)).digest('hex').slice(0, 20);
}
function sliceSupport(region: QuizRegion, start: number, end: number, id: string): QuizRegion {
    const evidence = region.evidence?.filter(span => span.start < end && span.end > start).map(span => ({ ...span,
        start: Math.max(span.start, start) - start, end: Math.min(span.end, end) - start }));
    return { ...region, id, text: region.text.slice(start, end), focusText: region.text.slice(start, end),
        ...(evidence ? { evidence } : {}), sourceRefs: evidence ? uniqueRefs(evidence.map(span => span.sourceRef)) : [...region.sourceRefs],
        reviewerSectionIds: [...region.reviewerSectionIds] };
}
/** Keep a bounded heading/concept region whole when coverage permits. If it must
 * split, attach dependent conditions/examples to their assertion, not isolated lines.
 * Offsets preserve exact text and block ownership; never synthesize source wording. */
export function contextSupports(region: QuizRegion, split = false): QuizRegion[] {
    if (!split && region.text.length <= MAX_QUIZ_SUPPORT_CHARS) return [region];
    const boundaries = [...region.text.matchAll(/\r?\n|(?<=[.!?])\s+(?=[\p{Lu}\d])/gu)];
    const parts: { start: number; end: number }[] = [];
    let start = 0;
    for (const boundary of boundaries) {
        if (region.text.slice(start, boundary.index).trim()) parts.push({ start, end: boundary.index });
        start = boundary.index + boundary[0].length;
    }
    if (region.text.slice(start).trim()) parts.push({ start, end: region.text.length });
    const units: { start: number; end: number }[] = [];
    for (const part of parts) {
        const text = region.text.slice(part.start, part.end).trim(), previous = units.at(-1);
        const independentCondition = previous && /\n/.test(region.text.slice(previous.end, part.start))
            && /^(?:if|when)\b/i.test(text) && /^(?:if|when)\b/i.test(region.text.slice(previous.start, previous.end).trim());
        if (previous && part.end - previous.start <= MAX_QUIZ_SUPPORT_CHARS
            && ((continuation.test(text) && !independentCondition) || !assertion.test(text) || normalize(text).length < 35
                || normalize(region.text.slice(previous.start, previous.end)).length < 35)) previous.end = part.end;
        else units.push({ ...part });
    }
    if (units.length === 1 && units[0]!.end - units[0]!.start <= MAX_QUIZ_SUPPORT_CHARS) return [region];
    return units.filter(unit => unit.end - unit.start <= MAX_QUIZ_SUPPORT_CHARS)
        .map((unit, index) => sliceSupport(region, unit.start, unit.end, `${region.id}#context-${index + 1}`));
}
export function uniqueRefs(refs: readonly QuizSourceReference[]): QuizSourceReference[] {
    return [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
}
/** New source plans use original block IDs. Legacy plans retain their frozen region IDs. */
export function quoteOwners(region: QuizRegion, regionId: unknown, quote: unknown): QuizSourceReference[] | null {
    if (typeof quote !== 'string' || quote.trim().length < 12 || quote.length > 8000 || !region.text.includes(quote)) return null;
    if (!region.evidence) return regionId === region.id ? [...region.sourceRefs] : null;
    const owners = region.evidence.filter(span => span.id === regionId && region.text.slice(span.start, span.end).includes(quote));
    return owners.length ? uniqueRefs(owners.map(span => span.sourceRef)) : null;
}
export function evidenceIds(region: QuizRegion): string[] {
    return region.evidence ? [...new Set(region.evidence.map(span => span.id))] : [region.id];
}
