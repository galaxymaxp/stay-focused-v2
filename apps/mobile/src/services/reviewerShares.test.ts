import { beforeEach, expect, it, vi } from 'vitest';
import { assistRequest, selectAssistBlock } from '@stay-focused/shared';
const mocks = vi.hoisted(() => ({ peek: vi.fn() }));
vi.mock('./studyAssist', () => ({ studyAssist: { peek: mocks.peek } }));
import { collectSharedAssists, mutateReviewerShare, reviewerShareUrl } from './reviewerShares';
import { reviewerDetail } from './localLibrary/localLibrary.testSupport';
const detail = reviewerDetail(), reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
const token = 'a'.repeat(64);
beforeEach(() => { vi.clearAllMocks(); mocks.peek.mockResolvedValue(null); });
it('builds a website link independently of API URL and rejects unsafe origins/tokens', () => {
  expect(reviewerShareUrl(token, 'https://website.test')).toBe(`https://website.test/s/${token}`);
  for (const origin of ['http://website.test', 'https://private@test', 'https://site.test/private', 'https://site.test?secret=1']) expect(() => reviewerShareUrl(token, origin)).toThrow();
  expect(() => reviewerShareUrl('bad')).toThrow();
});
it('collects only saved exact-owner block/point results and never calls generation', async () => {
  const s = reviewer.sections[0]!, b = s.blocks[0]!, selection = selectAssistBlock(reviewer, s.id, b.id)!;
  const result = { ...assistRequest(selection, 'summarize'), text: 'Saved summary.', createdAt: reviewer.generatedAt };
  mocks.peek.mockImplementation(async (owner: string, selected: typeof selection, type: string, point?: number) =>
    owner === 'owner' && selected.blockId === b.id && type === 'summarize' && point === undefined ? result : null);
  expect(await collectSharedAssists('owner', reviewer)).toEqual([result]);
  expect(await collectSharedAssists('other', reviewer)).toEqual([]);
});
it.each(['POST', 'PATCH', 'DELETE'] as const)('sends a bearer JWT and an assistance-only body for %s', async method => {
  const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: method === 'DELETE' ? null : { token, updatedAt: '' } })));
  await mutateReviewerShare({ baseUrl: 'https://api.test', accessToken: 'test-jwt', fetchImpl }, 'owner', 'artifact', reviewer, method);
  expect(fetchImpl).toHaveBeenCalledOnce();
  const [url, options] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('https://api.test/api/experience/shares/artifact'); expect(options.headers).toMatchObject({ Authorization: 'Bearer test-jwt' });
  expect(options.method).toBe(method);
  if (method === 'DELETE') { expect(options.body).toBeUndefined(); expect(mocks.peek).not.toHaveBeenCalled(); }
  else expect(JSON.parse(options.body as string)).toEqual({ assists: [] });
});
