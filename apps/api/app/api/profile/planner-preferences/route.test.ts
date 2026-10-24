import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ auth: vi.fn(), client: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), upsert: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mock.auth }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: mock.client }));
import { GET, PATCH, OPTIONS } from './route';
beforeEach(() => {
  vi.clearAllMocks(); mock.auth.mockResolvedValue({ id: 'verified-owner' });
  for (const name of ['client', 'from', 'select', 'eq', 'upsert'] as const) mock[name].mockReturnValue(mock);
  mock.single.mockResolvedValue({ data: { plan_mode: 'tasks' }, error: null });
  mock.maybeSingle.mockResolvedValue({ data: null, error: null });
});
const request = (body?: unknown, suffix = '') => new Request(`https://local.test/api/profile/planner-preferences${suffix}`, body === undefined ? {} : { method: 'PATCH', body: JSON.stringify(body) });
it.each([GET, PATCH])('requires verified bearer authentication', async handler => {
  mock.auth.mockResolvedValue(null); const response = await handler(request());
  expect(response.status).toBe(401); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(mock.client).not.toHaveBeenCalled();
});
it('reads only the verified owner and defaults never-chosen users to reviewers & tasks', async () => {
  expect(await (await GET(request())).json()).toEqual({ ok: true, data: { planMode: 'reviewers_tasks' } });
  expect(mock.from).toHaveBeenCalledWith('user_profiles'); expect(mock.eq).toHaveBeenCalledWith('user_id', 'verified-owner'); expect(mock.select).toHaveBeenCalledWith('plan_mode');
  mock.maybeSingle.mockResolvedValue({ data: { plan_mode: null }, error: null });
  expect(await (await GET(request())).json()).toMatchObject({ data: { planMode: 'reviewers_tasks' } });
  mock.maybeSingle.mockResolvedValue({ data: { plan_mode: 'reviewers' }, error: null });
  expect(await (await GET(request())).json()).toMatchObject({ data: { planMode: 'reviewers' } });
});
it.each([{}, null, [], { planMode: null }, { planMode: 'both' }, { planMode: 'tasks', user_id: 'other' }, { orbColor: 'gold' }])('rejects invalid patches before accessing DB: %j', async body => {
  expect((await PATCH(request(body))).status).toBe(400); expect(mock.client).not.toHaveBeenCalled();
});
it.each([GET, PATCH])('rejects injected query owners', async handler => {
  expect((await handler(request(undefined, '?user_id=other'))).status).toBe(400); expect(mock.client).not.toHaveBeenCalled();
});
it('upserts only the mode under the verified owner, preserving other profile fields', async () => {
  expect(await (await PATCH(request({ planMode: 'tasks' }))).json()).toEqual({ ok: true, data: { planMode: 'tasks' } });
  expect(mock.upsert).toHaveBeenCalledWith({ user_id: 'verified-owner', plan_mode: 'tasks' }, { onConflict: 'user_id' });
});
it.each(['42703', 'PGRST204'])('maps the missing column %s (before the migration) without exposing details', async code => {
  mock.maybeSingle.mockResolvedValue({ error: { code, message: 'private' }, data: null });
  const response = await GET(request()); expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ ok: false, error: { code: 'profile_preferences_unavailable', message: 'Preferences are unavailable.' } });
});
it('hides unexpected failures and bounds bodies', async () => {
  mock.client.mockImplementation(() => { throw new Error('secret'); });
  expect(await (await GET(request())).json()).toMatchObject({ error: { code: 'unavailable' } });
  for (const input of [new Request(request(), { method: 'PATCH', body: 'x'.repeat(1025) }), new Request(request(), { method: 'PATCH', body: '{' })]) {
    expect([400, 413]).toContain((await PATCH(input)).status);
  }
});
it('allows native CORS preflight with PATCH and no-store', () => {
  const response = OPTIONS(new Request(request(), { headers: { Origin: 'http://localhost:8081' } }));
  expect(response.headers.get('access-control-allow-methods')).toContain('PATCH'); expect(response.headers.get('cache-control')).toBe('private, no-store');
});
