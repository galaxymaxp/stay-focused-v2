import { expect, it, vi } from 'vitest';
import { experienceRepository, trustedExperienceReadRepository } from './repository';

function client() {
  const query = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), order: vi.fn().mockReturnThis(),
    range: vi.fn(),
  };
  return { query, from: vi.fn(() => query) };
}

it('binds linked Quiz reads to the verified owner and completes every page', async () => {
  const db = client();
  db.query.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, (_, index) => ({
    id: `quiz-${index}`, user_id: 'verified-owner', reviewer_artifact_id: 'reviewer',
  })), error: null }).mockResolvedValueOnce({ data: [
    { id: 'last', user_id: 'verified-owner', reviewer_artifact_id: 'reviewer' },
    { id: 'private', user_id: 'other-owner', reviewer_artifact_id: 'reviewer' },
    { id: 'unrequested', user_id: 'verified-owner', reviewer_artifact_id: 'other-reviewer' },
  ], error: null });
  const linked = await trustedExperienceReadRepository(db as never, 'verified-owner')
    .reviewerQuizIds!('forged-owner', ['reviewer', 'reviewer']);
  expect(db.from.mock.calls).toEqual([['quizzes'], ['quizzes']]);
  expect(db.query.eq.mock.calls).toEqual([['user_id', 'verified-owner'], ['user_id', 'verified-owner']]);
  expect(db.query.in.mock.calls).toEqual([['reviewer_artifact_id', ['reviewer']], ['reviewer_artifact_id', ['reviewer']]]);
  expect(db.query.order.mock.calls).toEqual([['id'], ['id']]);
  expect(db.query.range.mock.calls).toEqual([[0, 199], [200, 399]]);
  expect(linked.get('reviewer')).toHaveLength(201);
  expect(linked.get('reviewer')?.at(-1)).toBe('last');
  expect(linked.has('other-reviewer')).toBe(false);
  expect([...linked.values()].flat()).not.toContain('private');
});

it('batches unique Reviewer identities and avoids a query when no Reviewer exists', async () => {
  const db = client(); db.query.range.mockResolvedValue({ data: [], error: null });
  const repository = experienceRepository(db as never);
  expect(await repository.reviewerQuizIds!('owner', [])).toEqual(new Map());
  expect(db.from).not.toHaveBeenCalled();
  const ids = Array.from({ length: 101 }, (_, index) => `reviewer-${index}`);
  expect(await repository.reviewerQuizIds!('owner', [...ids, ids[0]!])).toEqual(new Map());
  expect(db.query.in.mock.calls).toEqual([
    ['reviewer_artifact_id', ids.slice(0, 100)], ['reviewer_artifact_id', ids.slice(100)],
  ]);
});

it('rejects incomplete evidence with a safe error instead of reporting a missing Quiz', async () => {
  const db = client();
  db.query.range.mockResolvedValueOnce({ data: Array.from({ length: 200 }, (_, index) => ({
    id: `quiz-${index}`, user_id: 'owner', reviewer_artifact_id: 'reviewer',
  })), error: null }).mockResolvedValue({ data: null, error: { message: 'private provider query' } });
  await expect(experienceRepository(db as never).reviewerQuizIds!('owner', ['reviewer']))
    .rejects.toMatchObject({ status: 503, code: 'unavailable' });
});
