import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDraft, LibraryArtifactDetail } from '@stay-focused/shared';
import { fixtureArtifact } from '../../../../packages/shared/src/experience.fixtures';
import { StudyExportControl } from './study-export-control';
import { ArtifactScreen } from './library';
import { EXPORT_FAILURE } from './study-export';

const mocks = vi.hoisted(() => ({ download: vi.fn(), formats: vi.fn(), resource: vi.fn(), api: vi.fn() }));
vi.mock('./study-export', async importOriginal => ({
  ...await importOriginal<typeof import('./study-export')>(), downloadStudyFile: mocks.download, studyFormats: mocks.formats,
}));
vi.mock('../lib/hooks', async importOriginal => ({ ...await importOriginal<typeof import('../lib/hooks')>(), useResource: mocks.resource }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api }) }));
vi.mock('../components/ui', () => ({ Heading: 'Heading', State: 'State', Notice: 'Notice' }));
vi.mock('./reviewer/reviewer-reader', () => ({ ReviewerReader: 'ReviewerReader' }));
vi.mock('./draft-instructions', () => ({ DraftInstructions: 'DraftInstructions' }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }));
const draft: ActivityDraft = { id: 'draft', activityId: 'assignment', courseId: 'course', title: 'Saved title', type: 'essay',
  sections: [{ id: 's', heading: 'First', content: 'Saved content', level: 1, order: 0, sourceRefs: [] }], slides: [],
  sources: [], warnings: [], generationId: 'job', createdAt: '', updatedAt: '', editable: true, revision: 1, status: 'draft' };
const detail: LibraryArtifactDetail = { artifact: { ...fixtureArtifact, type: 'activity_output' }, draft };
let tree: ReactTestRenderer | undefined;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks();
  vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('document', new EventTarget());
  mocks.formats.mockResolvedValue(['pdf', 'docx', 'pptx']); mocks.download.mockResolvedValue(undefined);
  mocks.resource.mockReturnValue({ data: detail });
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.unstubAllGlobals(); });
const button = (text: string) => tree!.root.findAllByType('button').find(node => node.props.children === text)!;
const click = async (text: string) => act(async () => button(text).props.onClick());
const json = () => JSON.stringify(tree!.toJSON());
async function mount(editor = false) {
  await act(async () => { tree = create(editor ? createElement(ArtifactScreen, { id: 'draft' }) : createElement(StudyExportControl, { detail })); });
}
it('loads shared formats on demand and exports the selected saved artifact', async () => {
  await mount(); expect(mocks.formats).not.toHaveBeenCalled(); expect(json()).not.toContain('Word');
  await click('Export'); expect(mocks.formats).toHaveBeenCalledWith(detail);
  expect(tree!.root.findAllByType('button').map(node => node.props.children)).toEqual(['Export', 'PDF', 'Word (.docx)', 'PowerPoint (.pptx)']);
  await click('Word (.docx)'); expect(mocks.download).toHaveBeenCalledWith(detail, 'docx');
  expect(json()).not.toContain('Word'); expect(mocks.api).not.toHaveBeenCalled();
});
it('locks export buttons during creation and displays a safe failure Notice', async () => {
  await mount(); await click('Export');
  let reject!: (error: Error) => void;
  mocks.download.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  await act(async () => { button('PDF').props.onClick(); });
  expect(tree!.root.findAllByType('button').every(node => node.props.disabled)).toBe(true);
  expect(json()).toContain('Creating file');
  await act(async () => reject(new Error(EXPORT_FAILURE)));
  expect(json()).toContain(EXPORT_FAILURE); expect(button('PDF').props.disabled).toBe(false);
});
it('masks lazy module failures and allows a retry', async () => {
  mocks.formats.mockRejectedValueOnce(new Error('private module error'));
  await mount(); await click('Export'); expect(json()).toContain(EXPORT_FAILURE); expect(json()).not.toContain('private module error');
  await click('Export'); expect(json()).toContain('PowerPoint (.pptx)');
});
it('disables unsaved exports, then exports the server-confirmed draft after saving', async () => {
  await mount(true);
  await act(async () => tree!.root.findByType('input').props.onChange({ target: { value: 'Edited title' } }));
  await act(async () => tree!.root.findByType('textarea').props.onChange({ currentTarget: { style: {}, scrollHeight: 50, offsetHeight: 50, clientHeight: 50 }, target: { value: 'Edited content' } }));
  expect(button('Export').props.disabled).toBe(true); expect(json()).toContain('Save your changes first to include them.');
  expect(mocks.download).not.toHaveBeenCalled();
  const saved = { ...draft, title: 'Server saved title', revision: 2, sections: [{ ...draft.sections[0]!, content: 'Server saved content' }] };
  mocks.api.mockResolvedValue(saved);
  await click('Save draft');
  expect(mocks.api).toHaveBeenCalledWith('/api/experience/activity-drafts/draft', { method: 'PATCH', body: {
    revision: 1, content: { title: 'Edited title', sections: [{ ...draft.sections[0]!, content: 'Edited content' }], slides: [] },
  } });
  expect(button('Export').props.disabled).toBe(false); expect(json()).not.toContain('Save your changes first');
  await click('Export'); await click('PDF');
  expect(mocks.download).toHaveBeenCalledWith({ artifact: { ...detail.artifact, title: saved.title }, draft: saved }, 'pdf');
  expect(mocks.api).toHaveBeenCalledOnce();
});
