import { describe, expect, it } from 'vitest';
import { validateReviewerDocument, validateReviewerEmphasis } from './ai-first-reviewer.js';

const explanation = 'A firewall controls incoming and outgoing network traffic.';
const keyPoints = ['Phishing attempts to steal information.'];
describe('AI reviewer emphasis contract', () => {
  it('accepts exact, sparse phrases in existing text', () => {
    expect(validateReviewerEmphasis(explanation, keyPoints, [
      { target: 'explanation', index: 0, text: 'controls incoming', style: 'highlight' },
      { target: 'key_point', index: 0, text: 'Phishing', style: 'underline' },
    ])).toHaveLength(2);
  });
  it('rejects unsupported text, markup, overlap, and excess density', () => {
    for (const marks of [
      [{ target: 'explanation', index: 0, text: 'destroys all malware', style: 'highlight' }],
      [{ target: 'explanation', index: 0, text: '<b>firewall</b>', style: 'bold' }],
      [{ target: 'explanation', index: 0, text: 'incoming', style: 'highlight' }, { target: 'explanation', index: 0, text: 'incoming and', style: 'underline' }],
      [{ target: 'explanation', index: 0, text: explanation, style: 'highlight' }],
    ]) expect(() => validateReviewerEmphasis(explanation, keyPoints, marks)).toThrow();
  });
  it('keeps old reviewer documents readable without metadata', () => {
    const old = { title: 'Network', sections: [{ title: 'Firewall', explanation, keyPoints, sourceRefs: ['source-1'] }] };
    expect(validateReviewerDocument(old, ['source-1']).sections[0]?.emphasis).toEqual([]);
  });
});
