import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), get: vi.fn(), mutate: vi.fn(), model: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mocks.client }));
vi.mock('@/lib/reviewer-shares/owner', () => ({ getOwnerShare: mocks.get, mutateOwnerShare: mocks.mutate }));
vi.mock('@/lib/processing-jobs/ai-generation', () => ({ durableGenerationProvider: mocks.model }));
vi.mock('@/lib/study-assist', () => ({ generateStudyAssist: mocks.model }));
import { GET, POST, PATCH, DELETE } from '@/../app/api/experience/shares/[artifactId]/route';
import { GET as publicGET } from '@/../app/api/shares/[token]/route';
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
it('the actual anonymous route does only snapshot reads, makes zero model/auth/write calls, and hides stopped/unknown tokens identically', async () => {
  const token = 'a'.repeat(64), stopped = 'b'.repeat(64), unknown = 'c'.repeat(64);
  const snapshot = { schemaVersion: 1, title: 'Cells', sections: [], keyTerms: [], quizzes: [], assists: [], visuals: [] };
  const writes = { insert: vi.fn(), update: vi.fn(), delete: vi.fn(), rpc: vi.fn() };
  const from = vi.fn(() => {
    let selected = '';
    const query = { ...writes, select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn() };
    query.select.mockReturnValue(query); query.is.mockReturnValue(query);
    query.eq.mockImplementation((_key: string, value: string) => { selected = value; return query; });
    query.maybeSingle.mockImplementation(async () => ({ error: null, data: selected === token ? { snapshot: { ...snapshot, ownerEmail: 'PRIVATE_EMAIL' } } : null }));
    return query;
  });
  mocks.client.mockReturnValue({ from, ...writes });
  const request = (value: string) => publicGET(new Request(`https://example.test/api/shares/${value}`), { params: Promise.resolve({ token: value }) });
  const response = await request(token);
  expect(response.status).toBe(200); expect(await response.json()).toEqual(snapshot);
  const missing = await Promise.all([request(stopped), request(unknown)]);
  expect(missing.map(r => r.status)).toEqual([404, 404]);
  expect(await missing[0]!.text()).toBe(await missing[1]!.text());
  for (const call of [mocks.auth, mocks.model, mocks.mutate, ...Object.values(writes)]) expect(call).not.toHaveBeenCalled();
  expect(from.mock.calls).toHaveLength(3);
});
