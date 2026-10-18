import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), get: vi.fn(), put: vi.fn(), remove: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.client }));
vi.mock('@/lib/profile-avatars', () => ({ getProfileAvatar: mocks.get, replaceProfileAvatar: mocks.put, deleteProfileAvatar: mocks.remove }));
import { GET, PUT, DELETE, OPTIONS } from './route';
import { createCanvas } from '@napi-rs/canvas';
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: 'verified-owner' }); mocks.get.mockResolvedValue({ url: null, expiresAt: null }); });
const request = (suffix = '') => new Request(`https://local.test/api/profile/avatar${suffix}`);
it('requires verified bearer auth and uses private no-store on errors', async () => {
  mocks.auth.mockResolvedValue(null);
  const response = await GET(request()); expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(mocks.client).not.toHaveBeenCalled();
});
it('GET uses only the verified owner and returns null when empty', async () => {
  const response = await GET(request()); expect(await response.json()).toEqual({ ok: true, data: { url: null, expiresAt: null } }); expect(mocks.get).toHaveBeenCalledWith(undefined, 'verified-owner');
});
it.each([GET, DELETE])('rejects injected owner/path query parameters', async handler => {
  expect((await handler(request('?path=other/avatar.png'))).status).toBe(400); expect(mocks.client).not.toHaveBeenCalled();
});
it('rejects bad magic type and oversize before creating a storage client', async () => {
  const bad = await PUT(new Request(request(), { method: 'PUT', body: '<svg/>', headers: { 'content-type': 'image/png' } })); expect(bad.status).toBe(415);
  const large = await PUT(new Request(request(), { method: 'PUT', body: 'x', headers: { 'content-length': '2097153' } })); expect(large.status).toBe(413); expect(mocks.client).not.toHaveBeenCalled();
});
it('hides internal provider errors', async () => {
  mocks.get.mockRejectedValue(new Error('secret private path'));
  const response = await GET(request()); expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('secret');
});
it('uploads only server-normalized bytes under the verified identity', async () => {
  mocks.put.mockResolvedValue({ url: null, expiresAt: null });
  const bytes = await createCanvas(600, 300).encode('png');
  const response = await PUT(new Request(request(), { method: 'PUT', body: new Uint8Array(bytes), headers: { 'content-type': 'image/png' } }));
  expect(response.status).toBe(200); expect(mocks.put.mock.calls[0]![1]).toBe('verified-owner'); expect(mocks.put.mock.calls[0]![2]).toBeInstanceOf(Buffer);
});
it('allows preflight for the actual verbs', () => {
  const response = OPTIONS(new Request('https://local.test/api/profile/avatar', { headers: { Origin: 'http://localhost:8081' } }));
  expect(response.headers.get('access-control-allow-methods')).toContain('PUT');
});
