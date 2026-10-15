import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), read: vi.fn(), prepare: vi.fn(), after: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.verify }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock('@/lib/external-visuals/batch', () => ({ readReviewerVisuals: mocks.read, prepareReviewerVisuals: mocks.prepare }));
vi.mock('next/server', () => ({ after: mocks.after }));
import { GET, POST } from './route';
const id = '11111111-1111-4111-8111-111111111111'; const context = { params: Promise.resolve({ id }) };
const request = (method: string) => new Request('https://local.test/visuals', { method, headers: { authorization: 'Bearer synthetic', 'content-type': 'application/json' }, ...(method === 'POST' ? { body: '{}' } : {}) });
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ id: 'owner' }); mocks.read.mockResolvedValue({ sections: {}, checked: 0, total: 3, running: false }); });
describe('reviewer visuals route', () => {
  it('denies without a verified owner', async () => {
    mocks.verify.mockResolvedValue(null);
    expect((await GET(request('GET'), context)).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });
  it('reads cached visuals for the verified owner with private no-store', async () => {
    const response = await GET(request('GET'), context);
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.read).toHaveBeenCalledWith({}, { userId: 'owner', artifactId: id });
  });
  it('starts one background batch when sections are unchecked and nothing is running', async () => {
    const response = await POST(request('POST'), context);
    expect(response.status).toBe(202); expect(mocks.after).toHaveBeenCalledOnce();
    await mocks.after.mock.calls[0]![0](); expect(mocks.prepare).toHaveBeenCalledWith({}, { userId: 'owner', artifactId: id });
  });
  it.each([{ checked: 3, total: 3, running: false }, { checked: 1, total: 3, running: true }])('does not start a batch for %j', async state => {
    mocks.read.mockResolvedValue({ sections: {}, ...state });
    expect((await POST(request('POST'), context)).status).toBe(202); expect(mocks.after).not.toHaveBeenCalled();
  });
});
