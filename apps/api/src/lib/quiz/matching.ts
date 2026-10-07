import type { QuizMatchPair, QuizMatchingItem, QuizMatchingQuestion } from '@stay-focused/shared';
import type { QuizRegion } from './generation';
import { createHash } from 'node:crypto';

/** Conservative planning cue only. Exact evidence and independent pair audit remain mandatory. */
export function supportsMatching(region: QuizRegion): boolean {
    return region.text.split(/\n|(?<=[.!?])\s+/).filter(line =>
        /^\s*[^:]{2,100}:\s*\S.{10,}|\b(?:is|are|means|refers to|protects|prevents|ensures|establishes|specifies|maps|removes|returns)\b/i.test(line)
    ).length >= 2;
}
const object = (v: unknown): Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {};
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-z0-9_-]{1,30}$/i.test(v);
const fail = (): never => { throw new Error('matching_shape_or_mapping'); };
export function validateMatchingSides(raw: { leftItems?: unknown; rightItems?: unknown }): Pick<QuizMatchingQuestion, 'leftItems' | 'rightItems'> {
    const side = (value: unknown): QuizMatchingItem[] => {
        if (!Array.isArray(value) || value.length < 2 || value.length > 6) return fail();
        const items = value.map(v => {
            const item = object(v);
            if (Object.keys(item).some(k => !['id', 'label'].includes(k)) || !id(item.id) || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 1000 || item.label.trim() === item.id) return fail();
            return { id: item.id, label: item.label.trim() };
        });
        if (new Set(items.map(i => i.id)).size !== items.length || new Set(items.map(i => i.label.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim())).size !== items.length) return fail();
        return items;
    };
    const leftItems = side(raw.leftItems), rightItems = side(raw.rightItems);
    if (leftItems.length !== rightItems.length || new Set([...leftItems, ...rightItems].map(i => i.id)).size !== leftItems.length + rightItems.length) return fail();
    return { leftItems, rightItems };
}
export function validateMatchingContent(raw: Record<string, unknown>): Pick<QuizMatchingQuestion, 'leftItems' | 'rightItems'> & { correctPairs: QuizMatchPair[] } {
    const { leftItems, rightItems } = validateMatchingSides(raw);
    if (!Array.isArray(raw.correctPairs) || raw.correctPairs.length !== leftItems.length) return fail();
    const correctPairs = raw.correctPairs.map(v => {
        const pair = object(v);
        if (Object.keys(pair).some(k => !['leftItemId', 'rightItemId'].includes(k)) || !id(pair.leftItemId) || !id(pair.rightItemId) || !leftItems.some(i => i.id === pair.leftItemId) || !rightItems.some(i => i.id === pair.rightItemId)) return fail();
        return { leftItemId: pair.leftItemId, rightItemId: pair.rightItemId };
    });
    if (new Set(correctPairs.map(p => p.leftItemId)).size !== leftItems.length || new Set(correctPairs.map(p => p.rightItemId)).size !== rightItems.length) return fail();
    // Shuffle both sides independently by identity, never using the private map.
    // Salted stable ordering survives checkpoints/reloads. No key-aware forced rotation.
    const order = (sideName: string, items: readonly QuizMatchingItem[]) => [...items].sort((a, b) =>
        createHash('sha256').update(`${raw.id}:${sideName}:${a.id}`).digest('hex').localeCompare(createHash('sha256').update(`${raw.id}:${sideName}:${b.id}`).digest('hex')));
    return { leftItems: order('left', leftItems), rightItems: order('right', rightItems), correctPairs };
}
export function pairKey(pairs: readonly QuizMatchPair[]): string {
    return JSON.stringify([...pairs].sort((a, b) => a.leftItemId.localeCompare(b.leftItemId)).map(p => [p.leftItemId, p.rightItemId]));
}
