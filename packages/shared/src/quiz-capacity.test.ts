import { describe, expect, it } from 'vitest';
import { MATCHING_PAIRS_PER_ITEM, quizCountOptions, quizFormatMaximum, quizMatchingTerms, quizSourceCapacity } from './quiz-capacity';

describe('Quiz source capacity', () => {
  it('counts distinct topics and meaningful key points without a provider', () => {
    const capacity = quizSourceCapacity([{ title: 'VPN Protocols', blocks: [
      { title: 'VPN Protocols', keyPoints: ['IPSec', 'OpenVPN', 'Cisco AnyConnect', 'Site-to-Site VPN', 'Secure', 'Safe', 'Improves security', 'OpenVPN'] },
    ] }]);
    expect(capacity).toEqual({ topicCount: 1, keyPointCount: 4, duplicatesExcluded: 2, maximum: 10, matchingTermCount: 7, matchingMaximum: 2 });
  });
  it('caps a large source at 100 and offers the actual maximum below 100', () => {
    const sections = Array.from({ length: 60 }, (_, index) => ({ title: `Topic ${index + 1}`, blocks: [{ title: `Concept ${index + 1}`, keyPoints: [`The principle ${index + 1} has a distinct application.`] }] }));
    expect(quizSourceCapacity(sections).maximum).toBe(100);
    expect(quizCountOptions(43)).toEqual([10, 20, 30, 43]);
    expect(quizCountOptions(18)).toEqual([10, 18]);
  });
  it('does not treat numbered placeholders and generic headings as study concepts', () => {
    expect(quizSourceCapacity([{ title: 'Topic 1', blocks: [{ title: 'Overview', keyPoints: ['A stack removes the most recently added item.'] }] }])).toMatchObject({ topicCount: 0, keyPointCount: 1, maximum: 2 });
  });
  it('budgets three distinct verbatim terms per Matching-only item', () => {
    const sections = [{ title: 'Network security', blocks: [{ title: 'Threats',
      explanation: 'Firewall is a defense. Phishing is deception. Spyware is surveillance.',
      keyPoints: ['Firewall: Filters traffic', 'Phishing: Steals credentials', 'Ransomware: Locks files', 'Malware: Harmful software', 'Rootkit: Conceals access', 'Spyware: Monitors activity', 'phishing: Duplicate term'],
    }] }];
    const capacity = quizSourceCapacity(sections);
    expect(MATCHING_PAIRS_PER_ITEM).toBe(3);
    expect(quizMatchingTerms(sections)).toEqual(['Firewall', 'Phishing', 'Spyware', 'Ransomware', 'Malware', 'Rootkit']);
    expect(capacity).toMatchObject({ matchingTermCount: 6, matchingMaximum: 2 });
    expect(quizFormatMaximum(capacity, ['matching'])).toBe(2);
    expect(quizFormatMaximum(capacity)).toBe(capacity.maximum);
    expect(quizFormatMaximum(capacity, ['single_select', 'matching'])).toBe(capacity.maximum);
    expect(quizFormatMaximum(capacity, ['identification'])).toBe(capacity.maximum);
  });
  it('excludes uncited titles, generic labels and ordinary concept sentences', () => {
    const sections = [{ title: 'Invented heading', blocks: [{ title: 'Uncited term',
      keyPoints: ['This material provides useful information.'], explanation: 'Introduction: Begin reading. Topic 1: Read on.' }] }];
    expect(quizMatchingTerms(sections)).toEqual([]);
    expect(quizSourceCapacity(sections).matchingMaximum).toBe(0);
  });
  it('deduplicates terms across regions and selected topics using the same normalization', () => {
    const block = { title: 'Security', keyPoints: ['OpenVPN', 'IPSec', 'Cisco AnyConnect'], explanation: 'OpenVPN is a protocol.' };
    const sections = [{ title: 'Section 1', blocks: [block] }, { title: 'Section 2', blocks: [{ ...block, keyPoints: ['OPENVPN', 'IPSec', 'Cisco AnyConnect', 'WireGuard'] }] }];
    expect(quizSourceCapacity(sections)).toMatchObject({ matchingTermCount: 4, matchingMaximum: 1 });
    expect(quizSourceCapacity(sections.slice(0, 1))).toMatchObject({ matchingTermCount: 3, matchingMaximum: 1 });
  });
});
