import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ exists: false, snapshot: vi.fn(async () => ({ localUri: 'file:///snapshot.png' })),
  create: vi.fn(async () => ({})), destroy: vi.fn(async () => true), move: vi.fn(async () => {}),
  render: vi.fn(), dispose: vi.fn(), rendererDispose: vi.fn(), targetDispose: vi.fn(), target: vi.fn(),
  texture: { colorSpace: '' }, framebuffer: {}, setTarget: vi.fn() }));
vi.mock('expo-file-system/legacy', () => ({ cacheDirectory: 'file:///cache/', getInfoAsync: async () => ({ exists: mocks.exists }), moveAsync: mocks.move }));
vi.mock('expo-gl', () => ({ GLView: { createContextAsync: mocks.create, destroyContextAsync: mocks.destroy, takeSnapshotAsync: mocks.snapshot } }));
vi.mock('../generation-core/threeContext', () => ({ threeContext: (value: unknown) => value }));
vi.mock('@stay-focused/shared/orb-still-renderer', () => ({ createOrbStillScene: () => ({ render: mocks.render, dispose: mocks.dispose }) }));
vi.mock('three', () => ({ SRGBColorSpace: 'srgb',
  WebGLRenderer: class { properties = { get: () => ({ __webglFramebuffer: mocks.framebuffer }) }; setRenderTarget = mocks.setTarget; dispose = mocks.rendererDispose; },
  WebGLRenderTarget: class { constructor(...args: unknown[]) { mocks.target(...args); } texture = mocks.texture; dispose = mocks.targetDispose; },
}));
const { queueOrbStills } = await import('./queueOrbStill');
const request = { color: '#E6EAF1', mode: 'dark' as const, pixels: 78 };
afterEach(() => { queueOrbStills.clear(); vi.clearAllMocks(); mocks.exists = false; });
it('coalesces headless requests, snapshots resolved sRGB pixels upright, persists and releases GL', async () => {
  const result = await Promise.all([queueOrbStills.get(request), queueOrbStills.get(request)]);
  expect(result[0]).toBe('file:///cache/ql1-v1-e6eaf1-dark-78.png'); expect(result[1]).toBe(result[0]);
  expect(mocks.create).toHaveBeenCalledOnce(); expect(mocks.texture.colorSpace).toBe('srgb');
  expect(mocks.snapshot).toHaveBeenCalledWith(expect.anything(), { framebuffer: mocks.framebuffer, rect: { x: 0, y: 0, width: 78, height: 78 }, flip: true, format: 'png' });
  expect(mocks.move).toHaveBeenCalledWith({ from: 'file:///snapshot.png', to: result[0] });
  expect(mocks.setTarget).toHaveBeenLastCalledWith(null);
  expect(mocks.dispose).toHaveBeenCalledOnce(); expect(mocks.targetDispose).toHaveBeenCalledOnce();
  expect(mocks.rendererDispose).toHaveBeenCalledOnce(); expect(mocks.destroy).toHaveBeenCalledOnce();
});
it('loads disk hits without a GL context and tears down after a snapshot failure', async () => {
  mocks.exists = true; await queueOrbStills.get(request); expect(mocks.create).not.toHaveBeenCalled();
  queueOrbStills.clear(); mocks.exists = false; mocks.snapshot.mockRejectedValueOnce(new Error('snapshot'));
  await expect(queueOrbStills.get(request)).rejects.toThrow('snapshot'); expect(mocks.destroy).toHaveBeenCalledOnce();
  await queueOrbStills.get(request); expect(mocks.create).toHaveBeenCalledTimes(2);
});
