import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { job } from '../testSupport/queueJob';
import { ApiError } from '../lib/api';

const mocks = vi.hoisted(() => ({ api: vi.fn(), replace: vi.fn(), current: null as import('@stay-focused/shared').ProcessingJobStatusView | null }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/link', () => ({ default: 'a' }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('../components/providers', () => ({ useAuth: () => ({ api: mocks.api, session: { user: { id: 'owner' } } }) }));
vi.mock('../components/ui', () => ({ ContentIcon: 'Icon', Heading: 'Heading', Notice: 'Notice', State: 'State' }));
vi.mock('../components/count-up', () => ({ CountUp: 'CountUp' }));
vi.mock('../lib/generation', async original => ({ ...await original<typeof import('../lib/generation')>(), generationEnabled: true }));
vi.mock('./queue-items', () => ({ useJobRead: () => ({ job: mocks.current, data: { state: 'failed', artifactId: null, error: { message: 'Generation could not be completed.' } }, refresh: vi.fn() }) }));
const { GenerationScreen } = await import('./queue');
let rendered: ReactTestRenderer | undefined;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.current = job({ status: 'failed', retryable: true, stage: 'generating_sections' });
  const values = new Map<string, string>();
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, window: new EventTarget(), sessionStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; });
async function render(id = 'job-1') {
  await act(async () => { rendered = create(createElement(GenerationScreen, { id })); });
  return rendered!.root;
}
const retry = () => rendered!.root.findAllByType('button').find(node => node.props.children === 'Try again');
it('shows Try again, real stage and safe-material copy with a single primary action', async () => {
  await render();
  expect(retry()).toBeDefined();
  expect(JSON.stringify(rendered!.toJSON())).toContain('Stopped while building topics. Your material is safe.');
  expect(rendered!.root.findAllByType('button').filter(node => node.props.className === 'primary')).toHaveLength(1);
});
it('suppresses duplicate taps and uses a fresh key when the accepted retry itself fails', async () => {
  let accept!: (value: unknown) => void;
  mocks.api.mockReturnValueOnce(new Promise(resolve => { accept = resolve; }));
  await render();
  await act(async () => { retry()!.props.onClick(); retry()!.props.onClick(); });
  expect(mocks.api).toHaveBeenCalledTimes(1);
  await act(async () => accept({ id: 'retry-1' }));
  expect(mocks.replace).toHaveBeenCalledWith('/generation/retry-1');
  mocks.current = job({ id: 'retry-1', status: 'failed', retryable: true });
  await act(async () => rendered!.update(createElement(GenerationScreen, { id: 'retry-1' })));
  mocks.api.mockResolvedValueOnce({ id: 'retry-2' });
  await act(async () => retry()!.props.onClick());
  expect(mocks.api.mock.calls[0]![1].key).not.toBe(mocks.api.mock.calls[1]![1].key);
  expect(mocks.api.mock.calls[1]![0]).toBe('/api/jobs/retry-1/retry');
});
it('keeps the reason and Queue path without Try again for non-retryable jobs', async () => {
  mocks.current = job({ status: 'failed', retryable: false });
  const root = await render();
  expect(retry()).toBeUndefined();
  expect(root.findAllByType('a').some(node => node.props.href === '/queue')).toBe(true);
  expect(JSON.stringify(rendered!.toJSON())).toContain('Generation could not be completed.');
});
it.each(['processing_job_not_retryable', 'quiz_source_capacity_exceeded'])('removes Try again after %s even with a stale polled row', async code => {
  mocks.api.mockRejectedValueOnce(new ApiError(code, 'Safe server message.'));
  await render();
  await act(async () => retry()!.props.onClick());
  expect(retry()).toBeUndefined();
  expect(JSON.stringify(rendered!.toJSON())).toContain('Safe server message.');
});
