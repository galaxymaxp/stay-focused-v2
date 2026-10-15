import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('../canonical-reviewers', () => ({ readCanonicalReviewerRecord: mocks.read }));
import { getOwnerShare, mutateOwnerShare } from './owner';
const owner = 'owner', artifactId = 'artifact', versionId = 'version';
const summary = { id: `artifact:${artifactId}`, title: 'Cells', createdAt: '2026-10-15T00:00:00Z', sourceId: 'private-source', sourceTitle: 'Lecture' };
const payload = { reviewer: { title: 'Cells', sections: [{ id: 's', title: 'Structure', sourceBlockIds: ['page1'], items: [{ id: 'b', title: 'Membrane', sourceCore: { explanation: 'A boundary.', keyPoints: [], evidence: [] } }] }] } };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.read.mockImplementation(async (_client: unknown, user: string) => ({ ok: true, value: user !== owner ? null : {
    artifact: { id: artifactId, user_id: owner }, version: { id: versionId, payload },
    source: { metadata: { reviewerSourceBlocks: [{ id: 'page1', text: 'PRIVATE_SOURCE_TEXT', pageNumber: 4 }] } },
  } }));
});
function client() {
  const tables: Record<string, Record<string, unknown>[]> = {
    experience_library_v1: [{ id: `artifact:${artifactId}`, user_id: owner, summary }],
    quizzes: [{ id: 'quiz', user_id: owner, reviewer_artifact_id: artifactId, title: 'Quiz', questions: [{ id: 'q1', type: 'single_select', prompt: 'Boundary?', options: [{ id: 'a', text: 'Membrane' }], difficulty: 'easy' }] },
      { id: 'foreign', user_id: 'other', reviewer_artifact_id: artifactId, title: 'PRIVATE_QUIZ' }],
    quiz_keys: [{ quiz_id: 'quiz', user_id: owner, questions: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'A boundary.', sourceEvidence: 'PRIVATE_EVIDENCE', provenance: 'PRIVATE_PROVIDER' }] }],
    section_external_visuals: [], reviewer_shares: [],
  };
  const from = vi.fn((table: string) => {
    const filters: [string, unknown][] = [];
    const rows = () => tables[table]!.filter(row => filters.every(([k, v]) => row[k] === v));
    const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn(), maybeSingle: vi.fn(), then: vi.fn() };
    query.select.mockReturnValue(query); query.order.mockReturnValue(query);
    query.eq.mockImplementation((key: string, value: unknown) => { filters.push([key, value]); return query; });
    query.range.mockImplementation(async () => ({ data: rows(), error: null }));
    query.maybeSingle.mockImplementation(async () => ({ data: rows()[0] ?? null, error: null }));
    query.then.mockImplementation((resolve: (v: unknown) => unknown) => resolve({ data: rows(), error: null }));
    return query;
  });
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => {
    const row = { user_id: args.p_user_id, artifact_id: args.p_artifact_id, token: args.p_token, snapshot: args.p_snapshot, updated_at: '', revoked_at: null };
    tables.reviewer_shares = [row]; return { data: [row], error: null };
  });
  return { service: { from, rpc } as unknown as SupabaseClient<Database>, from, rpc, tables };
}
it('builds the snapshot from the exact owned version, saved quiz keys and numeric citations only', async () => {
  const h = client(); const result = await mutateOwnerShare(h.service, owner, artifactId, 'create', []);
  expect(result?.token).toMatch(/^[0-9a-f]{64}$/);
  const args = h.rpc.mock.calls[0]![1];
  expect(args).toMatchObject({ p_user_id: owner, p_artifact_id: artifactId, p_version_id: versionId, p_action: 'create' });
  expect(args.p_snapshot).toMatchObject({ title: 'Cells', sections: [{ citations: ['From page 4'] }], quizzes: [{ title: 'Quiz', keys: [{ correctOptionIds: ['a'] }] }] });
  expect(JSON.stringify(args.p_snapshot)).not.toContain('PRIVATE_');
  const original = JSON.stringify(args.p_snapshot);
  mocks.read.mockResolvedValue({ ok: true, value: { version: { id: 'new-version', payload: {} } } });
  const again = await mutateOwnerShare(h.service, owner, artifactId, 'create', []);
  expect(again?.token).toBe(result?.token); expect(h.rpc).toHaveBeenCalledOnce();
  expect(JSON.stringify(h.tables.reviewer_shares![0]!.snapshot)).toBe(original);
});
it('denies another owner before any read or mutation and returns only link fields for owner reads', async () => {
  const h = client();
  for (const action of ['create', 'update', 'revoke'] as const) await expect(mutateOwnerShare(h.service, 'other', artifactId, action)).rejects.toMatchObject({ status: 404 });
  expect(h.from).not.toHaveBeenCalled(); expect(h.rpc).not.toHaveBeenCalled();
  await mutateOwnerShare(h.service, owner, artifactId, 'create', []);
  expect(Object.keys((await getOwnerShare(h.service, owner, artifactId))!).sort()).toEqual(['token', 'updatedAt']);
});
