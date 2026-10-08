import { describe, expect, it } from 'vitest';
import { quizCountOptions, quizSourceCapacity } from './quiz-capacity';

describe('Quiz source capacity', () => {
  it('counts distinct topics and meaningful key points without a provider', () => {
    const capacity = quizSourceCapacity([{ title: 'VPN Protocols', blocks: [
      { title: 'VPN Protocols', keyPoints: ['IPSec', 'OpenVPN', 'Cisco AnyConnect', 'Site-to-Site VPN', 'Secure', 'Safe', 'Improves security', 'OpenVPN'] },
    ] }]);
    expect(capacity).toEqual({ topicCount: 1, keyPointCount: 4, duplicatesExcluded: 2, maximum: 10 });
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
});
