import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ verify: vi.fn(), snapshot: vi.fn() }));
vi.mock('@/lib/auth', () => ({ verifyBearerToken: mocks.verify }));
vi.mock('@/lib/canvas-db', () => ({ createCanvasServiceClient: () => ({}) }));
vi.mock('@/lib/source-page-snapshots', () => ({ getSourcePageSnapshot: mocks.snapshot }));
import { GET } from './route';
const id = '11111111-1111-4111-8111-111111111111';
const context = { params: Promise.resolve({ id, sectionId: 'section-1' }) };
beforeEach(() => { vi.clearAllMocks(); mocks.verify.mockResolvedValue({ id: 'verified-owner' }); mocks.snapshot.mockResolvedValue({ available: true, status: 'rendering', page: 2 }); });
describe('snapshot GET bearer boundary', () => {
  it('requires server-verified bearer auth before snapshot work', async () => {
    mocks.verify.mockResolvedValue(null);
    const response = await GET(new Request(`https://api.example.test/api/reviewers/${id}/sections/section-1/snapshot`), context);
    expect(response.status).toBe(401); expect(mocks.snapshot).not.toHaveBeenCalled();
  });
  it('returns 202 after accepted dispatch using the verified owner', async () => {
    const response = await GET(new Request('https://api.example.test/snapshot', { headers: { authorization: 'Bearer test' } }), context);
    expect(response.status).toBe(202); expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.snapshot).toHaveBeenCalledWith({}, { userId: 'verified-owner', artifactId: id, sectionId: 'section-1', render: true });
  });
  it('uses read-only discovery and 200 for the header', async () => {
    mocks.snapshot.mockResolvedValue({ available: true, status: 'unrendered', page: 2 });
    const response = await GET(new Request('https://api.example.test/snapshot?render=0'), context);
    expect(response.status).toBe(200); expect(mocks.snapshot.mock.calls[0]?.[1].render).toBe(false);
  });
  it('fails safely if dispatch is not accepted', async () => {
    mocks.snapshot.mockRejectedValue(new Error('raw private provider failure'));
    const response = await GET(new Request('https://api.example.test/snapshot'), context);
    expect(response.status).toBe(503); expect(JSON.stringify(await response.json())).not.toContain('raw private');
  });
});
