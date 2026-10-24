import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, expect, it, vi } from 'vitest';
import StudySession from '../../../app/(app)/study-session';

const mocks = vi.hoisted(() => ({ push: vi.fn(), request: vi.fn(async () => ({})), refresh: vi.fn() }));
vi.mock('expo-router', () => ({ router: { push: mocks.push }, useLocalSearchParams: () => ({ id: 'block', date: '2026-10-24' }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Page: 'Page', SkeletonCards: 'SkeletonCards' }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: mocks.request }));
vi.mock('./useExperience', () => ({ useExperienceClient: () => ({ baseUrl: 'https://api.test', accessToken: 'jwt' }), useExperience: (path: string) => ({
  loading: false, error: null, refresh: mocks.refresh,
  data: path.startsWith('/api/study-sessions') ? { sessions: [{ id: 'block', kind: 'reviewer', taskId: null, task: null, reviewer: { id: 'artifact:saved', title: 'Biology', courseId: 'course' }, startsAt: '2026-10-24T10:00:00Z', endsAt: '2026-10-24T10:30:00Z', status: 'planned' }] }
    : { items: [{ id: 'wrong-activity', taskId: null, title: 'Wrong task' }] },
}) }));
let tree: ReactTestRenderer | undefined;
afterEach(async () => { await act(async () => tree?.unmount()); tree = undefined; vi.clearAllMocks(); });
it('opens the saved reviewer and completing its block only patches the session', async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  await act(async () => { tree = create(createElement(StudySession)); });
  expect(tree!.root.findByType('Page' as never).props.title).toBe('Review session');
  const actions = tree!.root.findAllByType('Action' as never);
  expect(actions.some(node => node.props.children === 'Open activity')).toBe(false);
  await act(async () => actions.find(node => node.props.children === 'Open reviewer')!.props.onPress());
  expect(mocks.push).toHaveBeenCalledWith({ pathname: '/artifact', params: { id: 'artifact:saved' } });
  await act(async () => actions.find(node => node.props.children === 'Mark this block done')!.props.onPress());
  expect(mocks.request).toHaveBeenCalledExactlyOnceWith(expect.anything(), '/api/study-sessions/block', { method: 'PATCH', body: { status: 'completed' } });
  expect(mocks.refresh).toHaveBeenCalledOnce();
});
