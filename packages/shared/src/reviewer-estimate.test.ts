import { describe, expect, it } from 'vitest';
import {
  estimateReviewerMinutes, REVIEWER_MINIMUM_MINUTES, REVIEWER_MINUTE_INCREMENT,
  REVIEWER_ORIENTATION_MINUTES_PER_SECTION, REVIEWER_RECALL_SECONDS_PER_KEY_POINT,
  REVIEWER_WORDS_PER_MINUTE,
} from './reviewer-estimate';

const item = (explanation = 'Cells contain genetic material.', keyPoints = ['Cells are living units.']) =>
  ({ title: 'Excluded item title', sourceCore: { explanation, keyPoints } });
const reviewer = (items: readonly unknown[] = [item()]) => ({ title: 'Excluded reviewer title', sections: [{ title: 'Excluded section title', items }] });

describe('estimateReviewerMinutes', () => {
  it.each([null, undefined, '', [], {}, { sections: [] }, reviewer([]), reviewer([item(' \n ', [])])])('returns null for empty input %j', payload => {
    expect(estimateReviewerMinutes(payload)).toBeNull();
  });
  it('returns five minutes for a small saved reviewer, wrapped or bare', () => {
    const expected = { minutes: 5, basis: { words: 8, keyPoints: 1, sections: 1 } };
    expect(estimateReviewerMinutes(reviewer())).toEqual(expected);
    expect(estimateReviewerMinutes({ reviewer: reviewer() })).toEqual(expected);
  });
  it('counts explanations, recall points and item/evidence text exactly', () => {
    const payload = { sections: Array.from({ length: 3 }, () => ({ items: [{
      ...item('word '.repeat(600), Array.from({ length: 4 }, () => 'recall point')),
      text: 'item text', sourceCore: { explanation: 'word '.repeat(600),
        keyPoints: Array.from({ length: 4 }, () => 'recall point'), evidence: [{ text: 'example text' }] },
    }] })) };
    // 1836/200 + 12*15/60 + 3 = 15.18 => 20 minutes.
    expect(estimateReviewerMinutes(payload)).toEqual({ minutes: 20, basis: { words: 1836, keyPoints: 12, sections: 3 } });
  });
  it('excludes titles, metadata, emphasis copies and unsupported enrichment', () => {
    const payload = reviewer();
    const baseline = estimateReviewerMinutes(payload);
    const saved = { ...payload, title: 'title '.repeat(1000), metadata: { text: 'metadata '.repeat(1000) },
      sections: [{ title: 'title '.repeat(1000), items: [{ ...item(), title: 'title '.repeat(1000),
        enrichment: { text: 'enrichment '.repeat(1000) },
        sourceCore: { ...item().sourceCore, emphasis: [{ text: 'Cells' }] } }] }] };
    expect(estimateReviewerMinutes(saved)).toEqual(baseline);
  });
  it('rounds up only after adding reading, recall and orientation', () => {
    expect(estimateReviewerMinutes(reviewer([item('word '.repeat(750), ['word'])]))?.minutes).toBe(10);
    expect(estimateReviewerMinutes(reviewer([item('word '.repeat(800), [])]))?.minutes).toBe(5);
    expect(estimateReviewerMinutes(reviewer([item('word '.repeat(801), [])]))?.minutes).toBe(10);
  });
  it('ignores blank recall points and handles whitespace', () => {
    expect(estimateReviewerMinutes(reviewer([item(' one\t two\nthree ', ['', ' \n ', 'four'])]))?.basis)
      .toEqual({ words: 4, keyPoints: 1, sections: 1 });
  });
  it.each([{ sections: [null] }, { sections: [{ items: 'bad' }] }, reviewer([{ ...item(), sourceCore: { explanation: 'valid', keyPoints: [1] } }]),
    reviewer([{ ...item(), text: 3 }]), reviewer([{ ...item(), sourceCore: { ...item().sourceCore, evidence: [{}] } }]),
    { reviewer: null, sections: reviewer().sections }])('returns null for invalid input %j', payload => {
    expect(estimateReviewerMinutes(payload)).toBeNull();
  });
  it('never throws on an unreadable payload', () => {
    expect(estimateReviewerMinutes(new Proxy({}, { has() { throw new Error('invalid'); } }))).toBeNull();
  });
  it('is deterministic and does not mutate its input', () => {
    const payload = reviewer();
    const before = JSON.stringify(payload);
    expect(estimateReviewerMinutes(payload)).toEqual(estimateReviewerMinutes(payload));
    expect(JSON.stringify(payload)).toBe(before);
  });
  it('exports the documented formula constants', () => {
    expect([REVIEWER_WORDS_PER_MINUTE, REVIEWER_RECALL_SECONDS_PER_KEY_POINT,
      REVIEWER_ORIENTATION_MINUTES_PER_SECTION, REVIEWER_MINUTE_INCREMENT, REVIEWER_MINIMUM_MINUTES]).toEqual([200, 15, 1, 5, 5]);
  });
});
