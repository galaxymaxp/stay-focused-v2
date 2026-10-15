import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), get: vi.fn(), mutate: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.client }));
vi.mock('@/lib/reviewer-shares/owner', () => ({ getOwnerShare: mocks.get, mutateOwnerShare: mocks.mutate }));
import { GET, POST, PATCH, DELETE } from '@/../app/api/experience/shares/[artifactId]/route';
const id = '11111111-1111-4111-8111-111111111111';
const context = { params: Promise.resolve({ artifactId: id }) };
const req = (method: string, body?: unknown) => new Request('https://example.test/api/experience/shares/' + id,
  { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
beforeEach(() => { vi.clearAllMocks(); mocks.auth.mockResolvedValue({ id: 'verified-owner' }); mocks.client.mockReturnValue({}); mocks.get.mockResolvedValue(null); mocks.mutate.mockResolvedValue(null); });
it.each([GET, POST, PATCH, DELETE])('requires verified bearer identity before any service access', async route => {
  mocks.auth.mockResolvedValue(null);
  expect((await route(req(route === GET ? 'GET' : 'POST', route === GET ? undefined : {}), context)).status).toBe(401);
  expect(mocks.client).not.toHaveBeenCalled(); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.mutate).not.toHaveBeenCalled();
});
it('binds every owner action to the verified identity and rejects a supplied owner or snapshot', async () => {
  await GET(req('GET'), context);
  expect(mocks.get).toHaveBeenCalledWith({}, 'verified-owner', id);
  for (const [route, method, action] of [[POST, 'POST', 'create'], [PATCH, 'PATCH', 'update'], [DELETE, 'DELETE', 'revoke']] as const) {
    expect((await route(req(method, method === 'DELETE' ? undefined : { assists: [] }), context)).status).toBe(200);
    expect(mocks.mutate).toHaveBeenLastCalledWith({}, 'verified-owner', id, action, []);
  }
  const count = mocks.mutate.mock.calls.length;
  expect((await POST(req('POST', { userId: 'other', snapshot: {} }), context)).status).toBe(400);
  expect(mocks.mutate).toHaveBeenCalledTimes(count);
});
