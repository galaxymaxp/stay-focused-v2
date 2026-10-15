import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, OPTIONS, PATCH } from './route';
const fake = vi.hoisted(() => ({ auth: vi.fn(), eq: vi.fn(), upsert: vi.fn(), load: vi.fn(), save: vi.fn(), from: vi.fn() }));
vi.mock('@/lib/canvas-routes', () => ({ requireCanvasAuth: fake.auth, createCorsHeaders: () => ({ 'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS' }), optionsResponse: () => new Response(null, { status: 204 }) }));
function request(body?: unknown, token = true) {
  return new Request('https://app.example/api/auto-reviewer-preferences', { method: body === undefined ? 'GET' : 'PATCH', headers: token ? { Authorization: 'Bearer session' } : {}, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => {
  vi.clearAllMocks();
  let saved: { enabled: boolean } | null = null;
  fake.load.mockImplementation(async () => ({ data: saved, error: null }));
  fake.save.mockImplementation(async () => ({ data: saved, error: null }));
  fake.eq.mockReturnValue({ maybeSingle: fake.load });
  fake.upsert.mockImplementation((row: { enabled: boolean }) => { saved = { enabled: row.enabled }; return { select: () => ({ single: fake.save }) }; });
  fake.from.mockReturnValue({ select: () => ({ eq: fake.eq }), upsert: fake.upsert });
  fake.auth.mockImplementation(async (req: Request) => req.headers.has('Authorization') ? { ok: true, value: { user: { id: 'owner' }, client: { from: fake.from } } } : { ok: false, response: new Response(null, { status: 401 }) });
});
describe('automatic reviewer preference endpoint', () => {
  it("marks owner success and auth denial private, no-store", async () => {
    const success = await GET(new Request("https://example.test", { headers: { authorization: "Bearer session" } }));
    expect(success.status).toBe(200);
    expect(success.headers.get("Cache-Control")).toBe("private, no-store");
    const denial = await GET(new Request("https://example.test"));
    expect(denial.status).toBe(401);
    expect(denial.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it.each([undefined, "1"])("stream-caps oversized bytes with Content-Length %s", async contentLength => {
    const response = await (await import("./route")).PATCH(new Request("https://example.test", {
      method: "PATCH", headers: { authorization: "Bearer session", "content-type": "application/json", ...(contentLength ? { "content-length": contentLength } : {}) },
      body: " ".repeat(256 + 1),
    }));
    expect(response.status).toBe(413);
    expect((await response.json()).error).toEqual({ code: "invalid_request", message: "Settings request is too large." });
  });

  it('rejects GET and PATCH without a bearer session', async () => {
    expect((await GET(request(undefined, false))).status).toBe(401);
    expect((await PATCH(request({ enabled: false }, false))).status).toBe(401);
    expect(fake.from).not.toHaveBeenCalled();
  });
  it('defaults a missing owner preference to enabled without writing', async () => {
    const response = await GET(request());
    expect(await response.json()).toEqual({ ok: true, data: { enabled: true } });
    expect(fake.eq).toHaveBeenCalledWith('user_id', 'owner'); expect(fake.upsert).not.toHaveBeenCalled();
  });
  it('saves only the authenticated owner and reloads false', async () => {
    const response = await PATCH(request({ enabled: false }));
    expect(response.status).toBe(200);
    expect(fake.upsert).toHaveBeenCalledWith({ user_id: 'owner', enabled: false, updated_at: expect.any(String) }, { onConflict: 'user_id' });
    expect(await (await GET(request())).json()).toEqual({ ok: true, data: { enabled: false } });
  });
  it.each([{ enabled: 'false' }, { enabled: false, user_id: 'other' }, {}, null, [true]])('rejects invalid patch %s', async body => {
    expect((await PATCH(request(body))).status).toBe(400); expect(fake.upsert).not.toHaveBeenCalled();
  });
  it('rejects malformed JSON and oversized UTF-8 input', async () => {
    const options = { method: 'PATCH', headers: { Authorization: 'Bearer session' } };
    expect((await PATCH(new Request('https://app.example', { ...options, body: '{' }))).status).toBe(400);
    expect((await PATCH(new Request('https://app.example', { ...options, body: JSON.stringify({ enabled: false, padding: 'é'.repeat(130) }) }))).status).toBe(413);
    expect(fake.upsert).not.toHaveBeenCalled();
  });
  it('returns a safe unavailable response on read and write errors', async () => {
    fake.load.mockResolvedValue({ data: null, error: { message: 'private database details' } });
    expect((await GET(request())).status).toBe(503);
    fake.save.mockResolvedValue({ data: null, error: { message: 'private database details' } });
    const response = await PATCH(request({ enabled: true })); expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('private database');
  });
  it('supports preflight and returns allowed methods', async () => {
    expect(OPTIONS(request()).status).toBe(204);
    expect((await GET(request())).headers.get('Access-Control-Allow-Methods')).toBe('GET, PATCH, OPTIONS');
  });
});
