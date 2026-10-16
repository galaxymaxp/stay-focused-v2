import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { reviewerShareSignIn, type ReviewerShareSnapshot } from '@stay-focused/shared';
import { gradingFixtures } from '../../../../packages/shared/src/quiz-grading.fixtures';
vi.mock('next/link', () => ({ default: 'a' }));
const { SharedReviewerReader, SharedReviewerPage, SharedQuizPractice, scoreSharedQuiz, SHARED_AI_ACTIONS } = await import('./shared-reviewer');
const token = 'a'.repeat(64);
const snapshot: ReviewerShareSnapshot = { schemaVersion: 1, title: 'Cells', keyTerms: ['Membrane'],
  sections: [{ title: 'Structure', citations: ['From page 4'], blocks: [{ title: 'Membrane', explanation: 'A boundary.', keyPoints: ['Protects the cell.'], evidence: [] }] }],
  assists: [{ section: 0, block: 0, type: 'explain_simply', text: 'A cell has a boundary.' }],
  visuals: [{ section: 0, image: 'https://upload.wikimedia.org/cell.png', title: 'Cell', credit: 'Artist', license: 'CC BY', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cell.png' }],
  quizzes: [{ title: 'Cell quiz', questions: [{ id: 'q1', type: 'single_select', prompt: 'What protects the cell?', options: [{ id: 'a', text: 'Membrane' }, { id: 'b', text: 'Outside' }], difficulty: 'easy', selectionInstruction: 'Choose one answer.' }],
    keys: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'The membrane is a boundary.' }] }] };
let rendered: ReactTestRenderer | undefined;
const fetcher = vi.fn();
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.stubGlobal('fetch', fetcher); fetcher.mockReset(); });
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; vi.unstubAllGlobals(); });
it('renders the read-only reviewer, terms, existing assists, text citations and attributed Wikimedia visual', async () => {
  await act(async () => { rendered = create(createElement(SharedReviewerReader, { token, snapshot })); });
  const body = JSON.stringify(rendered!.toJSON());
  for (const text of ['Cells', 'Membrane', 'From page 4', 'A cell has a boundary.', 'Artist', 'CC BY', 'Cell quiz']) expect(body).toContain(text);
  expect(fetcher).not.toHaveBeenCalled();
  expect(rendered!.root.findByType('img').props.referrerPolicy).toBe('no-referrer');
});
it('every AI control routes to sign-in with an exact local return link and makes zero calls', async () => {
  await act(async () => { rendered = create(createElement(SharedReviewerReader, { token, snapshot })); });
  for (const action of SHARED_AI_ACTIONS) {
    const anchor = rendered!.root.findAllByType('a').find(node => node.props.children === action)!;
    expect(anchor.props.href).toBe(reviewerShareSignIn(token)); expect(anchor.props.onClick).toBeUndefined();
  }
  expect(fetcher).not.toHaveBeenCalled();
});
it('scores in memory without a network write or storage and offers sign-in to save', async () => {
  const storage = { setItem: vi.fn(), getItem: vi.fn() }; vi.stubGlobal('localStorage', storage);
  await act(async () => { rendered = create(createElement(SharedReviewerReader, { token, snapshot })); });
  const root = rendered!.root;
  await act(async () => root.findAllByType('input')[0]!.props.onChange({ target: { checked: true } }));
  await act(async () => root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(JSON.stringify(rendered!.toJSON())).toContain('100');
  expect(root.findAllByType('a').find(a => a.props.children === 'Sign in to save your score')?.props.href).toBe(reviewerShareSignIn(token));
  expect(fetcher).not.toHaveBeenCalled(); expect(storage.setItem).not.toHaveBeenCalled(); expect(storage.getItem).not.toHaveBeenCalled();
});
it('public page only reads a stored snapshot with GET, omitted credentials, no-store and abort support', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify(snapshot)));
  await act(async () => { rendered = create(createElement(SharedReviewerPage, { token })); });
  expect(fetcher).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledWith(`/api/shares/${token}`, expect.objectContaining({ method: 'GET', credentials: 'omit', cache: 'no-store', signal: expect.any(AbortSignal) }));
  expect(JSON.stringify(rendered!.toJSON())).toContain('Cells');
});
it('revoked/unknown public responses show the same not-shared copy', async () => {
  fetcher.mockResolvedValue(new Response(JSON.stringify({ error: 'not_shared' }), { status: 404 }));
  await act(async () => { rendered = create(createElement(SharedReviewerPage, { token })); });
  expect(JSON.stringify(rendered!.toJSON())).toContain('This reviewer is no longer shared');
});
it('page is outside the app group, noindex, and does not import private readers or AI actions', () => {
  const page = readFileSync('app/s/[token]/page.tsx', 'utf8');
  expect(page).toContain('index: false');
  const source = readFileSync('src/features/shared-reviewer.tsx', 'utf8');
  for (const forbidden of ['useAuth', 'SectionVisual', 'assistStore', '/api/experience', 'source-page', 'source-figure']) expect(source).not.toContain(forbidden);
});
it.each(gradingFixtures.filter(f => f.finalized !== false && !f.assisted && !f.revealed))('public grading reuses O2 semantics: $name', fixture => {
  const quiz = { title: 'Quiz', questions: [fixture.question], keys: [fixture.key] };
  expect(scoreSharedQuiz(quiz, { [fixture.question.id]: fixture.selected }).percentage).toBe(fixture.percentage);
  expect(fetcher).not.toHaveBeenCalled();
});
it('switching a modified false answer to true clears the obsolete correction before local scoring', async () => {
  const quiz = { ...snapshot.quizzes[0]!, questions: [{ ...snapshot.quizzes[0]!.questions[0]!, type: 'modified_true_false' as const,
    options: [{ id: 'a', text: 'True' }, { id: 'b', text: 'False' }] }] };
  await act(async () => { rendered = create(createElement(SharedQuizPractice, { quiz, signIn: reviewerShareSignIn(token) })); });
  const root = rendered!.root;
  await act(async () => root.findAllByType('input').find(n => n.props.value === 'b')!.props.onChange({ target: { checked: true } }));
  await act(async () => root.findAllByType('input').find(n => n.props['aria-label'] === 'Correction 1')!.props.onChange({ target: { value: 'Old correction' } }));
  await act(async () => root.findAllByType('input').find(n => n.props.value === 'a')!.props.onChange({ target: { checked: true } }));
  await act(async () => root.findByType('form').props.onSubmit({ preventDefault() {} }));
  expect(JSON.stringify(rendered!.toJSON())).toContain('100'); expect(fetcher).not.toHaveBeenCalled();
});

it('renders saved structured answers with the same safe format and no AI calls', async () => {
  await act(async () => { rendered = create(createElement(SharedReviewerReader, { token, snapshot: { ...snapshot, assists: [{ ...snapshot.assists[0]!, text: 'Lead\n- **Membrane**\n1. Protect\n<script>bad</script>' }] } })); });
  expect(rendered!.root.findAllByType('strong').some(node => node.props.children === 'Membrane')).toBe(true);
  expect(rendered!.root.findAllByType('script')).toHaveLength(0);
  expect(JSON.stringify(rendered!.toJSON())).toContain('<script>bad</script>'); expect(fetcher).not.toHaveBeenCalled();
});
