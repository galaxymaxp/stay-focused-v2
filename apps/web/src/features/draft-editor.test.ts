import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDraft, LibraryArtifactSummary } from '@stay-focused/shared';
import { ArtifactScreen } from './library';

// A saved screen can render an older draft revision before the server copy arrives.
const mocks = vi.hoisted(() => ({ resource: {} as Record<string, unknown>, api: vi.fn(), refresh: vi.fn() }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ session: { user: { id: 'owner' } }, api: mocks.api }) }));
vi.mock('../lib/hooks', async () => {
  const { useState } = await import('react');
  return {
    useResource: () => mocks.resource,
    useAction: () => {
      const [message, setMessage] = useState<string | null>(null);
      return { busy: false, message, setMessage, run: async (action: () => Promise<void>) => { await action(); } };
    },
  };
});
vi.mock('../lib/use-saved-library', () => ({ useSavedLibrary: () => ({}) }));
vi.mock('../lib/use-library-course-sequence', () => ({ useLibraryCourseSequence: () => ({}) }));
vi.mock('../lib/reviewer-opened', () => ({ useReviewerOpened: () => undefined }));
vi.mock('../components/ui', () => ({ Heading: 'Heading', Icon: 'Icon', ContentIcon: 'ContentIcon', Empty: 'Empty', State: 'State', Notice: 'Notice', contentTone: () => '' }));
vi.mock('../components/crumbs', () => ({ PageCrumb: 'Crumb' }));
vi.mock('../components/course', () => ({ CourseMark: 'CourseMark' }));
vi.mock('../components/snapshot-status', () => ({ SnapshotStatus: 'SnapshotStatus' }));
vi.mock('./draft-instructions', () => ({ DraftInstructions: 'DraftInstructions' }));
vi.mock('./study-export-control', () => ({ StudyExportControl: 'StudyExportControl' }));
vi.mock('./reviewer/reviewer-reader', () => ({ ReviewerReader: 'ReviewerReader' }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

const artifact = { id: 'activity:d1', type: 'activity_output', title: 'Study reflection' } as unknown as LibraryArtifactSummary;
const draft = (revision: number, content: string) => ({
  id: 'd1', activityId: 'canvas:c1', courseId: 'c1', type: 'reflection', title: 'Study reflection',
  sections: [{ id: 's1', heading: 'Reflection', level: 1, content, order: 1, sourceRefs: [] }],
  slides: [], sources: [], warnings: [], generationId: 'g1', createdAt: '', updatedAt: '',
  editable: true, revision, status: 'draft',
}) as unknown as ActivityDraft;
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });

async function show(value: ActivityDraft) {
  mocks.resource = { data: { artifact, draft: value }, refresh: mocks.refresh };
  await act(async () => {
    if (tree) tree.update(createElement(ArtifactScreen, { id: artifact.id }));
    else tree = create(createElement(ArtifactScreen, { id: artifact.id }));
  });
}
const reflection = () => tree!.root.findAllByType('textarea').find(node => node.props['aria-label'] === 'Reflection')!;
const save = () => tree!.root.findAllByType('button').find(node => node.props.children === 'Save draft')!;
const edit = (value: string) => act(async () => reflection().props.onChange({
  target: { value }, currentTarget: { style: {}, scrollHeight: 0, offsetHeight: 0, clientHeight: 0 },
}));

it('shows the newer saved revision when the server copy replaces an older saved screen', async () => {
  await show(draft(1, 'My study plan'));
  expect(reflection().props.value).toBe('My study plan');
  await show(draft(2, 'I reviewed the source and planned time.'));
  expect(reflection().props.value).toBe('I reviewed the source and planned time.');
  mocks.api.mockResolvedValue(draft(3, 'Later'));
  await edit('Later');
  await act(async () => save().props.onClick());
  expect(mocks.api).toHaveBeenCalledWith('/api/experience/activity-drafts/d1',
    expect.objectContaining({ method: 'PATCH', body: expect.objectContaining({ revision: 2 }) }));
});

it('never replaces unsaved edits, and keeps their base revision for conflict checks', async () => {
  await show(draft(1, 'My study plan'));
  await edit('My unsaved thoughts');
  await show(draft(2, 'Saved elsewhere'));
  expect(reflection().props.value).toBe('My unsaved thoughts');
  mocks.api.mockResolvedValue(draft(2, 'My unsaved thoughts'));
  await act(async () => save().props.onClick());
  expect(mocks.api).toHaveBeenCalledWith('/api/experience/activity-drafts/d1',
    expect.objectContaining({ body: expect.objectContaining({ revision: 1 }) }));
});

it('refreshes the saved screen after a successful save', async () => {
  await show(draft(1, 'My study plan'));
  mocks.api.mockResolvedValue(draft(2, 'Saved'));
  await edit('Saved');
  await act(async () => save().props.onClick());
  expect(mocks.refresh).toHaveBeenCalledTimes(1);
  await show(draft(1, 'My study plan'));
  expect(reflection().props.value).toBe('Saved');
});
