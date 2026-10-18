import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDetail, ActivityDraft } from '@stay-focused/shared';
import { DraftInstructions } from './draft-instructions';
import { ArtifactScreen } from './library';
import { dateLabel } from '../lib/api';

const mocks = vi.hoisted(() => ({ resource: vi.fn(), long: false }));
vi.mock('../lib/hooks', () => ({ useResource: mocks.resource, useAction: () => ({ busy: false }) }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: vi.fn() }) }));
vi.mock('../components/ui', () => ({ Heading: 'Heading', State: 'State', Notice: 'Notice' }));
vi.mock('../components/snapshot-status', () => ({ SnapshotStatus: 'SnapshotStatus' }));
vi.mock('./reviewer/reviewer-reader', () => ({ ReviewerReader: 'ReviewerReader' }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }));

const activity = { instructions: 'Read <b>every</b> requirement.', dueAt: '2026-10-20T08:00:00Z', pointsPossible: 25 } as ActivityDetail;
const draft: ActivityDraft = {
  id: 'draft', activityId: 'canvas:assignment', courseId: 'course', title: 'Draft', type: 'essay',
  sections: [{ id: 'a', heading: 'First', content: '', level: 1, order: 0, sourceRefs: [] }, { id: 'b', heading: 'Second', content: '', level: 1, order: 0, sourceRefs: [] }], slides: [],
  sources: [], warnings: [], generationId: 'job', createdAt: '', updatedAt: '', editable: true, revision: 1, status: 'draft',
};
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks(); mocks.long = false;
  mocks.resource.mockReturnValue({ data: activity });
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
async function mount(editor = false) {
  await act(async () => { tree = create(editor ? createElement(ArtifactScreen, { id: 'activity:draft' }) : createElement(DraftInstructions, { activityId: draft.activityId }), {
    createNodeMock: element => element.type === 'p' ? { scrollHeight: mocks.long ? 300 : 60, clientHeight: 60 } : null,
  }); });
}
const text = () => JSON.stringify(tree!.toJSON());
it('uses the Tasks fetch pattern and date formatter, and renders points and literal safe text', async () => {
  await mount();
  expect(mocks.resource).toHaveBeenCalledWith('/api/experience/activities/canvas%3Aassignment');
  expect(text()).toContain(`Due ${dateLabel(activity.dueAt)}`);
  expect(text()).toContain('25 pts'); expect(text()).toContain(activity.instructions);
  expect(tree!.root.findAllByType('b')).toHaveLength(0);
  expect(text()).not.toContain('dangerouslySetInnerHTML');
  expect(tree!.root.findAllByType('button')).toHaveLength(0);
});
it('clamps long text and toggles Show all/Show less and aria-expanded', async () => {
  mocks.long = true; await mount();
  const button = () => tree!.root.findByType('button');
  expect(button().props['aria-expanded']).toBe(false); expect(button().props.children).toBe('Show all');
  expect(tree!.root.findAllByType('p').some(node => node.props.className === 'instructions clamped')).toBe(true);
  await act(async () => button().props.onClick());
  expect(button().props['aria-expanded']).toBe(true); expect(button().props.children).toBe('Show less');
  expect(tree!.root.findAllByType('p').some(node => node.props.className === 'instructions')).toBe(true);
  await act(async () => button().props.onClick()); expect(button().props['aria-expanded']).toBe(false);
});
it('handles empty instructions, absent due date and zero points', async () => {
  mocks.resource.mockReturnValue({ data: { ...activity, instructions: '  ', dueAt: null, pointsPossible: 0 } });
  await mount(); expect(text()).toContain('No instructions provided.'); expect(text()).toContain('0 pts'); expect(text()).not.toContain('Due ');
});
it('loads quietly without blocking the editor', async () => {
  mocks.resource.mockImplementation((path: string | null) => path?.includes('/library/') ? { data: { artifact: { title: 'Draft' }, draft } } : { loading: true, data: null });
  await mount(true); expect(text()).toContain('Loading instructions'); expect(tree!.root.findByType('input').props.disabled).toBe(false);
  expect(text()).not.toContain('Outline');
});
it.each(['404', 'connection'])('falls back on %s to section anchors without a Draft title link', async error => {
  mocks.resource.mockImplementation((path: string | null) => path?.includes('/library/') ? { data: { artifact: { title: 'Draft' }, draft } } : { data: null, error });
  await mount(true);
  expect(tree!.root.findByType('nav').props['aria-label']).toBe('Draft outline');
  expect(tree!.root.findAllByType('a').map(node => node.props.href)).toEqual(['#draft-section-0', '#draft-section-1']);
  expect(tree!.root.findAllByType('label').map(node => node.props.id)).toContain('draft-title');
});
it('hides the fallback for fewer than two sections/slides and missing activity ID', async () => {
  mocks.resource.mockImplementation((path: string | null) => path?.includes('/library/') ? { data: { artifact: { title: 'Draft' }, draft: { ...draft, activityId: '', sections: draft.sections.slice(0, 1) } } } : { data: null });
  await mount(true); expect(tree!.root.findAllByType('nav')).toHaveLength(0); expect(text()).not.toContain('Loading instructions');
});
it('uses slide anchors for an unavailable activity', async () => {
  mocks.resource.mockImplementation((path: string | null) => path?.includes('/library/') ? { data: { artifact: { title: 'Draft' }, draft: { ...draft, activityId: '', sections: [], slides: [{ number: 1, title: 'One', body: '' }, { number: 2, title: 'Two', body: '' }] } } } : { data: null });
  await mount(true); expect(tree!.root.findAllByType('a').map(node => node.props.href)).toEqual(['#draft-slide-1', '#draft-slide-2']);
});
