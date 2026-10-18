import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { ActivityDetail } from '@stay-focused/shared';
import { DraftInstructions } from './DraftInstructions';
import { createLocalArtifactStore, type LocalArtifactStore } from '../../services/localLibrary/artifactStore';
import { migrateLocalLibrary } from '../../services/localLibrary/schema';
import { openNodeSqlite } from '../../services/localLibrary/localLibrary.testSupport';

const mocks = vi.hoisted(() => ({ owner: 'a', request: vi.fn(), store: null as LocalArtifactStore | null }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: mocks.owner }, accessToken: 'test' } }) }));
vi.mock('../../config/apiBaseUrl', () => ({ getApiBaseUrl: () => 'https://unused.invalid' }));
vi.mock('../../design/theme', () => ({ useTheme: () => ({ active: true, colors: { textSecondary: 'theme-color' } }) }));
vi.mock('../../design/primitives', () => ({ Copy: 'Copy', Surface: 'Surface' }));
vi.mock('react-native', () => ({ Pressable: 'Pressable', View: 'View' }));
vi.mock('lucide-react-native', () => ({ ChevronDown: 'ChevronDown', ChevronUp: 'ChevronUp' }));
vi.mock('expo-router/react-navigation', () => ({ useIsFocused: () => true }));
vi.mock('../sync/CanvasSyncProvider', () => ({ useCanvasSync: () => ({ dataVersion: 0 }) }));
vi.mock('../../services/localLibrary/localArtifactDatabase', () => ({ getLocalArtifactStore: async () => mocks.store }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.request, ExperienceApiError: class extends Error {} }));

const path = '/api/experience/activities/canvas%3Aassignment';
const activity: ActivityDetail = {
  id: 'canvas:assignment', title: 'Assignment', taskId: null, course: null,
  source: 'canvas', status: 'pending', priority: 'medium', dueAt: null,
  estimatedMinutes: null, estimateSource: null, submissionTypes: [],
  isOverdue: false, urgency: 'later', hasGeneratedDraft: false,
  instructions: 'Exact cached instructions', pointsPossible: 0,
  resources: [], attachments: [], courseMaterials: null, outputs: [],
  generation: { reviewer: { status: 'unavailable' }, quiz: { status: 'unavailable' }, activityAssistance: { status: 'unavailable' } },
};
let tree: ReactTestRenderer | undefined, close: () => void;
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); mocks.owner = 'a'; mocks.request.mockReset();
  const handle = openNodeSqlite(); close = handle.close; await migrateLocalLibrary(handle.db); mocks.store = createLocalArtifactStore(handle.db);
});
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; close(); });
async function mount(activityId: string | null = activity.id) {
  await act(async () => { tree = create(createElement(DraftInstructions, { activityId })); });
  await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
}
const header = () => tree!.root.find(node => String(node.type) === 'Pressable');
const text = () => JSON.stringify(tree!.toJSON());
it('uses the owner-scoped activity cache offline and starts collapsed, without a screen snapshot', async () => {
  await mocks.store!.saveActivityDetail('a', activity);
  mocks.request.mockRejectedValue(new TypeError('offline')); await mount();
  expect(mocks.request).toHaveBeenCalledWith(expect.anything(), path, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(header().props.accessibilityState).toEqual({ expanded: false }); expect(text()).not.toContain(activity.instructions);
  await act(async () => header().props.onPress()); expect(text()).toContain(activity.instructions); expect(text()).toContain('0 pts');
  mocks.owner = 'b'; await act(async () => tree!.update(createElement(DraftInstructions, { activityId: activity.id })));
  expect(tree!.toJSON()).toBeNull();
});
it('saves an online open to the activity cache and restores it offline after remount', async () => {
  mocks.request.mockResolvedValue(activity); await mount();
  expect(await mocks.store!.readActivityDetail('a', activity.id)).toEqual(activity);
  await act(async () => tree!.unmount()); tree = undefined;
  await mocks.store!.purgeScreenSnapshots('a');
  mocks.request.mockRejectedValue(new TypeError('offline')); await mount();
  await act(async () => header().props.onPress()); expect(text()).toContain(activity.instructions);
});
it('hides unavailable uncached instructions and does not request a missing activity', async () => {
  mocks.request.mockRejectedValue(new Error('not found')); await mount(); expect(tree!.toJSON()).toBeNull();
  await act(async () => tree!.unmount()); tree = undefined; mocks.request.mockClear(); await mount(null);
  expect(tree!.toJSON()).toBeNull(); expect(mocks.request).not.toHaveBeenCalled();
});
it('renders the empty wording on expansion and omits unavailable metadata', async () => {
  mocks.request.mockResolvedValue({ ...activity, instructions: '', pointsPossible: null }); await mount();
  await act(async () => header().props.onPress()); expect(text()).toContain('No instructions provided.'); expect(text()).not.toContain(' pts');
});
