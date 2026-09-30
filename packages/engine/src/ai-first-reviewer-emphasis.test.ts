import { describe, expect, it, vi } from 'vitest';
import { GenerationContractError } from './generation-context.js';
import { runAIReviewer, validateReviewerDocument, validateReviewerEmphasis } from './ai-first-reviewer.js';

const explanation = 'A firewall controls incoming and outgoing network traffic. It applies rules to requests and protects a private network.';
const keyPoints = ['Phishing attempts to steal information from users.', 'A firewall controls incoming and outgoing traffic.'];
const mark = (text: string, target: 'explanation' | 'key_point' = 'explanation', index = 0, style: 'bold' | 'underline' | 'highlight' = 'highlight') =>
  ({ target, index, text, style });
const section = (emphasis: unknown, sourceRefs = ['source-1']) =>
  ({ title: 'Network safety', explanation, keyPoints, emphasis, sourceRefs });
const document = (emphasis: unknown, sourceRefs?: string[]) =>
  ({ title: 'Network reviewer', sections: [section(emphasis, sourceRefs)] });

describe('AI reviewer optional emphasis', () => {
  it('keeps multiple valid, unique exact marks in reading order', () => {
    const marks = [mark('controls incoming'), mark('Phishing', 'key_point', 0, 'underline')];
    expect(validateReviewerEmphasis(explanation, keyPoints, marks)).toEqual(marks);
  });
  it.each([
    ['missing target', mark('destroys all malware')],
    ['punctuation difference', mark('firewall, controls')],
    ['whitespace difference', mark('controls  incoming')],
    ['Unicode normalization difference', mark('cafe\u0301')],
    ['markup absent from prose', mark('<b>firewall</b>')],
    ['bad target index', mark('Phishing', 'key_point', 2)],
    ['malformed entry', { target: 'explanation', index: 0, text: 'firewall', style: 'blink' }],
  ])('drops %s without altering prose', (_name, invalid) => {
    expect(validateReviewerEmphasis(explanation, keyPoints, [invalid])).toEqual([]);
    expect(validateReviewerDocument(document([invalid]), ['source-1']).sections[0]?.explanation).toBe(explanation);
  });
  it('drops a phrase repeated within its target, but allows the same phrase in another section', () => {
    const repeated = 'A firewall protects users. A firewall filters traffic.';
    expect(validateReviewerEmphasis(repeated, [], [mark('A firewall')])).toEqual([]);
    const two = { title: 'Network reviewer', sections: [section([mark('Phishing', 'key_point', 0)]), section([mark('Phishing', 'key_point', 0)])] };
    expect(validateReviewerDocument(two, ['source-1']).sections.map(s => s.emphasis)).toEqual([[mark('Phishing', 'key_point', 0)], [mark('Phishing', 'key_point', 0)]]);
  });
  it('keeps valid marks while dropping absent, overlapping, and over-dense marks', () => {
    expect(validateReviewerEmphasis(explanation, keyPoints, [
      mark('controls incoming'), mark('missing phrase'), mark('incoming and'), mark(explanation), mark('Phishing', 'key_point', 0),
    ])).toEqual([mark('controls incoming'), mark('Phishing', 'key_point', 0)]);
  });
  it('accepts missing, empty, malformed, and oversized optional metadata as zero or bounded marks', () => {
    expect(validateReviewerDocument({ title: 'Network reviewer', sections: [{ title: 'Network safety', explanation, keyPoints, sourceRefs: ['source-1'] }] }, ['source-1']).sections[0]?.emphasis).toEqual([]);
    expect(validateReviewerEmphasis(explanation, keyPoints, [])).toEqual([]);
    expect(validateReviewerEmphasis(explanation, keyPoints, 'invalid')).toEqual([]);
    expect(validateReviewerEmphasis(explanation, keyPoints, Array.from({ length: 41 }, () => mark('missing')))).toEqual([]);
  });
  it('reproduces the production failure shape with only synthetic study text', () => {
    const response = { title: 'Systems reviewer', sections: [
      { title: 'Improving Decision-Making', explanation: 'Information systems help teams evaluate decisions using reports.',
        keyPoints: ['Teams use reports to compare options and choose a course of action.'],
        emphasis: [mark('evidence rather than intuition', 'key_point', 0)], sourceRefs: ['page-1'] },
    ] };
    const result = validateReviewerDocument(response, ['page-1']);
    expect(result.sections[0]?.emphasis).toEqual([]);
    expect(result.sections[0]?.keyPoints).toEqual(response.sections[0]?.keyPoints);
    expect(result.sections[0]?.sourceRefs).toEqual(['page-1']);
  });
  it('keeps source references and required study content fatal even alongside bad emphasis', () => {
    expect(() => validateReviewerDocument(document([mark('missing')], ['invented']), ['source-1'])).toThrow(GenerationContractError);
    expect(() => validateReviewerDocument(document([mark('missing')], []), ['source-1'])).toThrow(GenerationContractError);
    expect(() => validateReviewerDocument({ title: 'Network reviewer', sections: [{ ...section([mark('missing')]), keyPoints: [] }] }, ['source-1'])).toThrow(GenerationContractError);
  });
  it('uses one provider call for emphasis-only defects and assembles safe marks', async () => {
    const generate = vi.fn().mockResolvedValue(document([mark('controls incoming'), mark('not in prose')]));
    const result = await runAIReviewer({ input: { id: 'source', blocks: [{ id: 'source-1', text: 'A firewall controls incoming and outgoing network traffic.', kind: 'paragraph' }] }, provider: { generate } });
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.sections[0]?.items[0]?.sourceCore).toMatchObject({ explanation, keyPoints, emphasis: [mark('controls incoming')] });
    expect(result.sections[0]?.sourceBlockIds).toEqual(['source-1']);
  });
  it('retains one substantive repair attempt when optional emphasis is also invalid', async () => {
    const generate = vi.fn().mockResolvedValueOnce({ title: 'Network reviewer', sections: [{ ...section([mark('missing')]), keyPoints: [] }] })
      .mockResolvedValueOnce(document([mark('missing')]));
    const result = await runAIReviewer({ input: { id: 'source', blocks: [{ id: 'source-1', text: 'A firewall controls network traffic.', kind: 'paragraph' }] }, provider: { generate } });
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.sections[0]?.items[0]?.sourceCore.emphasis).toEqual([]);
  });
});
