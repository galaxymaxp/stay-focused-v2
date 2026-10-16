import { describe, expect, it } from 'vitest';
import { parseStudyText } from './study-format';
import { ASSIST_PROMPT_VERSION, assistCacheKey, isAssistResult, validAssistText, type AssistRequest } from './study-assist';
import { STUDY_ASK_SUGGESTIONS, STUDY_TOOLS_PROMPT_VERSION, studyCacheKey, type StudyToolRequest } from './study-tools';

const plain = (text: string) => [{ text, bold: false }];
describe('safe flat study format', () => {
  it('keeps old plain text and line breaks as paragraphs', () => {
    expect(parseStudyText('Old answer\r\nsecond line\r\n\r\nMore.')).toEqual([
      { kind: 'paragraph', content: plain('Old answer\nsecond line') }, { kind: 'paragraph', content: plain('More.') },
    ]);
    expect(parseStudyText(' \n\n')).toEqual([]);
  });
  it('groups bullets and numbered steps and preserves their actual numbers', () => {
    expect(parseStudyText('Lead\n- First\n- Second\n2. Start\n4. Finish')).toEqual([
      { kind: 'paragraph', content: plain('Lead') }, { kind: 'bullets', items: [plain('First'), plain('Second')] },
      { kind: 'steps', items: [{ number: 2, content: plain('Start') }, { number: 4, content: plain('Finish') }] },
    ]);
  });
  it('supports bold in every construct without recursive inline nesting', () => {
    for (const input of ['A **term** matters.', '- A **term** matters.', '1. A **term** matters.']) {
      expect(JSON.stringify(parseStudyText(input))).toContain('"text":"term","bold":true');
    }
    for (const input of ['***nested***', '**unclosed', '\\**escaped**', '**outer *inner* outer**']) {
      expect(parseStudyText(input)).toEqual([{ kind: 'paragraph', content: plain(input) }]);
    }
  });
  it.each(['# Heading', '> Quote', '* bullet', '0. zero', '1000. large', '  - nested', '    1. nested', '<img src=x onerror=alert(1)>', '[link](javascript:alert(1))', '![image](x)', '`code`', '---', '\\- escaped'])('keeps unknown syntax literal: %s', input => {
    expect(parseStudyText(input)).toEqual([{ kind: 'paragraph', content: plain(input) }]);
  });
  it('never nests lists', () => {
    expect(parseStudyText('- Outer\n  - Inner\n- Next').map(block => block.kind)).toEqual(['bullets', 'paragraph', 'bullets']);
  });
  it('changes both cache keys without invalidating old result strings or caps', () => {
    const old: AssistRequest = { reviewerId: 'artifact:a', sectionId: 's', blockId: 'b', assistType: 'summarize', contentHash: 'a', promptVersion: 'study-assist-v1' };
    expect(ASSIST_PROMPT_VERSION).toBe('study-assist-v2');
    expect(STUDY_TOOLS_PROMPT_VERSION).toBe('study-tools-v3');
    expect(assistCacheKey(old)).not.toBe(assistCacheKey({ ...old, promptVersion: ASSIST_PROMPT_VERSION }));
    expect(isAssistResult({ ...old, text: 'An old plain answer.', createdAt: '2026-10-16T00:00:00Z' }, old)).toBe(true);
    expect(validAssistText('x'.repeat(2400))).toBe(true); expect(validAssistText('x'.repeat(2401))).toBe(false);
    const tool: StudyToolRequest = { ...old, action: 'define', selection: 'term', promptVersion: 'study-tools-v1' };
    expect(studyCacheKey(tool)).not.toBe(studyCacheKey({ ...tool, promptVersion: STUDY_TOOLS_PROMPT_VERSION }));
  });
  it('has exactly four suggestions in the accepted order', () => {
    expect(STUDY_ASK_SUGGESTIONS).toEqual(['What is this?', 'Why does this matter?', 'How does this work?', 'What could I confuse this with?']);
  });
});
