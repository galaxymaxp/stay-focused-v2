import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ match: vi.fn(), put: vi.fn(async () => {}), open: vi.fn(),
  create: vi.fn(), setSize: vi.fn(), draw: vi.fn(), dispose: vi.fn(), release: vi.fn(), sceneDispose: vi.fn() }));
vi.mock('three', () => ({ WebGLRenderer: class {
  constructor() { mocks.create(); }
  setSize = mocks.setSize; dispose = mocks.dispose; forceContextLoss = mocks.release;
} }));
vi.mock('@stay-focused/shared/orb-still-renderer', () => ({ createOrbStillScene: () => ({ render: mocks.draw, dispose: mocks.sceneDispose }) }));
const { queueOrbStills } = await import('./queue-orb-still');
const request = { color: '#E6EAF1', mode: 'dark' as const, pixels: 78 };
function environment() {
  mocks.open.mockResolvedValue({ match: mocks.match, put: mocks.put });
  vi.stubGlobal('location', { origin: 'http://localhost' });
  vi.stubGlobal('window', { caches: { open: mocks.open } });
  vi.stubGlobal('document', { createElement: () => ({ toDataURL: () => 'data:image/png;base64,new' }) });
}
afterEach(() => { queueOrbStills.clear(); vi.resetAllMocks(); vi.unstubAllGlobals(); });
it('loads persistent versioned size/color/theme hits without constructing GL', async () => {
  environment(); mocks.match.mockResolvedValue(new Response('data:image/png;base64,saved'));
  expect(await queueOrbStills.get(request)).toBe('data:image/png;base64,saved');
  expect(mocks.match).toHaveBeenCalledWith('http://localhost/queue/still-cache/ql1-v1-e6eaf1-dark-78.png');
  expect(mocks.create).not.toHaveBeenCalled();
});
it('coalesces a cold draw, persists it and releases the short-lived context', async () => {
  environment(); const a = queueOrbStills.get(request), b = queueOrbStills.get(request);
  expect(a).toBe(b); expect(await a).toBe('data:image/png;base64,new');
  expect(mocks.setSize).toHaveBeenCalledWith(78, 78, false); expect(mocks.create).toHaveBeenCalledOnce();
  expect(mocks.put).toHaveBeenCalledOnce(); expect(mocks.sceneDispose).toHaveBeenCalledOnce();
  expect(mocks.dispose).toHaveBeenCalledOnce(); expect(mocks.release).toHaveBeenCalledOnce();
});
it('survives optional storage failure and retries a failed GL draw without leaking its context', async () => {
  environment(); mocks.open.mockRejectedValue(new Error('quota')); mocks.draw.mockImplementationOnce(() => { throw new Error('GL'); });
  await expect(queueOrbStills.get(request)).rejects.toThrow('GL'); expect(mocks.release).toHaveBeenCalledOnce();
  expect(await queueOrbStills.get(request)).toBe('data:image/png;base64,new'); expect(mocks.release).toHaveBeenCalledTimes(2);
});
