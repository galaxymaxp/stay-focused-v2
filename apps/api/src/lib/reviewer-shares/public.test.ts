import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { assistRequest, selectAssistBlock, type ReviewerReaderModel } from '@stay-focused/shared';
import { expect, it, vi } from 'vitest';
import { buildShareSnapshot, projectShareSnapshot } from './snapshot';
import { publicShareResponse, readPublicShare, ShareReadLimiter } from './public';

const reviewer: ReviewerReaderModel = { id: 'artifact:private', title: 'Cells', course: { id: 'PRIVATE_COURSE', name: 'PRIVATE_NAME', code: null },
  source: { id: 'PRIVATE_SOURCE', title: 'PRIVATE_SOURCE_TITLE' }, generatedAt: '2026-10-15T00:00:00Z', freshness: 'current',
  sections: [{ id: 's1', title: 'Structure', blocks: [{ id: 'b1', title: 'Membrane', explanation: 'A boundary.', keyPoints: ['Protects the cell.'], evidence: [] }] }] };
const selection = selectAssistBlock(reviewer, 's1', 'b1')!;
const result = { ...assistRequest(selection, 'explain_simply'), text: 'A cell has a boundary.', createdAt: reviewer.generatedAt };
const snapshot = () => buildShareSnapshot({ reviewer, citations: [['From page 4']], quizzes: [], assists: [result], visuals: [] });
const token = 'a'.repeat(64);

it('accepts retained plain v1 and formatted v2 assists with exact content binding, rejecting unknown versions', () => {
  for (const promptVersion of ['study-assist-v1', 'study-assist-v2']) {
    const assist = { ...result, promptVersion, text: promptVersion.endsWith('v1') ? 'Old plain answer.' : 'Lead\n- **Term**' };
    const input = { reviewer, citations: [], quizzes: [], assists: [assist], visuals: [] };
    expect(buildShareSnapshot(input).assists[0]?.text).toBe(assist.text);
    expect(() => buildShareSnapshot({ ...input, assists: [{ ...assist, contentHash: 'stale' }] })).toThrow('invalid_request');
  }
  expect(() => buildShareSnapshot({ reviewer, citations: [], quizzes: [], assists: [{ ...result, promptVersion: 'unknown' }], visuals: [] })).toThrow('invalid_request');
});

it('explicit snapshot includes saved assistance/terms/citations and excludes private owner/source/provenance fields at every level', () => {
  const safe = snapshot();
  const dirty = { ...safe, source_text: 'PRIVATE_SOURCE_TEXT', providerMetadata: 'PRIVATE_PROVIDER', canvasUrl: 'https://canvas.test',
    ownerName: 'PRIVATE_NAME', ownerEmail: 'private@test', grades: [100], tasks: ['PRIVATE_TASK'], pageSnapshots: ['PRIVATE_SNAPSHOT'], extractedFigures: ['PRIVATE_FIGURE'],
    sections: safe.sections.map(s => ({ ...s, canvasId: 'PRIVATE_CANVAS_ID', blocks: s.blocks.map(b => ({ ...b, sourceBlockIds: ['PRIVATE_SOURCE_BLOCK'], source_text: 'PRIVATE_SOURCE_TEXT' })) })) };
  const projected = projectShareSnapshot(dirty);
  expect(projected).toEqual(safe);
  expect(projected.assists[0]?.text).toBe(result.text); expect(projected.keyTerms).toEqual(['Membrane']);
  const json = JSON.stringify(projected);
  for (const forbidden of ['PRIVATE_', 'canvas', 'source_text', 'providerMetadata', 'ownerName', 'ownerEmail', 'grades', 'tasks', 'pageSnapshots', 'extractedFigures', 'private@test']) expect(json).not.toContain(forbidden);
});
it('rejects stale or cross-reviewer local assistance without exposing source context', () => {
  expect(() => buildShareSnapshot({ reviewer: { ...reviewer, title: 'Edited' }, citations: [], quizzes: [], assists: [result], visuals: [] })).toThrow('invalid_request');
  expect(() => buildShareSnapshot({ reviewer, citations: [], quizzes: [], assists: [{ ...result, reviewerId: 'other' }], visuals: [] })).toThrow();
});
it('includes browser scoring answers while removing quiz evidence, provenance, source and account fields', () => {
  const quizzes = [{ title: 'Quiz', sourceId: 'PRIVATE_SOURCE', questions: [{ id: 'q1', type: 'single_select', prompt: 'What is a boundary?',
    options: [{ id: 'a', text: 'Membrane', providerMetadata: 'PRIVATE_PROVIDER' }], selectionInstruction: 'Choose one.', difficulty: 'easy',
    sourceEvidence: 'PRIVATE_SOURCE_TEXT', canvasUrl: 'PRIVATE_CANVAS' }], keys: [{ id: 'q1', correctOptionIds: ['a'], explanation: 'A membrane is a boundary.',
      topicId: 'PRIVATE_TOPIC', sourceRefs: ['PRIVATE_SOURCE'], provenance: 'PRIVATE_METADATA' }] }];
  const safe = projectShareSnapshot({ ...snapshot(), quizzes });
  expect(safe.quizzes[0]?.keys[0]).toEqual({ id: 'q1', correctOptionIds: ['a'], explanation: 'A membrane is a boundary.' });
  expect(JSON.stringify(safe)).not.toContain('PRIVATE_');
});
it('copies only attributed Commons images, never course URLs or arbitrary image hosts', () => {
  const visual = { section: 0, image: 'https://upload.wikimedia.org/cell.png', title: 'Cell', credit: 'Artist', license: 'CC BY',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Cell.png' };
  expect(projectShareSnapshot({ ...snapshot(), visuals: [visual] }).visuals).toEqual([visual]);
  for (const image of ['https://private.supabase.test/storage/file', 'https://upload.wikimedia.org.evil.test/x', 'javascript:alert(1)'])
    expect(() => projectShareSnapshot({ ...snapshot(), visuals: [{ ...visual, image }] })).toThrow();
});
it('anonymous request returns only the allow-list and public SQL adapter only selects snapshot by token', async () => {
  const insert = vi.fn(), update = vi.fn(), rpc = vi.fn(), model = vi.fn();
  const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn(async () => ({ data: { snapshot: { ...snapshot(), ownerEmail: 'PRIVATE_EMAIL' } }, error: null })) };
  query.select.mockReturnValue(query); query.eq.mockReturnValue(query); query.is.mockReturnValue(query);
  const client = { from: vi.fn(() => query), insert, update, rpc, model } as unknown as SupabaseClient<Database>;
  const read = vi.fn(value => readPublicShare(client, value));
  const response = await publicShareResponse(new Request('https://example.test/api/shares/' + token), token, read, new ShareReadLimiter());
  expect(response.status).toBe(200); expect(await response.json()).toEqual(snapshot());
  expect(query.select).toHaveBeenCalledWith('snapshot'); expect(query.eq).toHaveBeenCalledWith('token', token); expect(query.is).toHaveBeenCalledWith('revoked_at', null);
  for (const call of [insert, update, rpc, model]) expect(call).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.get('x-robots-tag')).toContain('noindex');
});
it('stopped, unknown and malformed tokens share identical not-shared responses', async () => {
  const read = vi.fn(async () => null);
  const responses = await Promise.all([token, 'b'.repeat(64), 'bad'].map(t => publicShareResponse(new Request('https://example.test'), t, read, new ShareReadLimiter())));
  const bodies = await Promise.all(responses.map(r => r.text()));
  expect(new Set(bodies).size).toBe(1); expect(responses.every(r => r.status === 404)).toBe(true); expect(read).toHaveBeenCalledTimes(2);
});
it('bounds IP and token bursts independently, fails closed at map capacity, and expires entries', () => {
  const rate = new ShareReadLimiter(4, 2, 100);
  expect(rate.allow('ip1', token, 0)).toBe(true); expect(rate.allow('ip1', token, 1)).toBe(true);
  expect(rate.allow('ip1', 'other', 2)).toBe(false); expect(rate.allow('ip2', token, 2)).toBe(false);
  expect(rate.allow('ip2', 'other', 2)).toBe(true); expect(rate.allow('ip3', 'third', 2)).toBe(false);
  expect(rate.allow('ip3', 'third', 102)).toBe(true);
});
it('rate-limited reads reject before reading storage and return Retry-After', async () => {
  const read = vi.fn(async () => snapshot()), rate = new ShareReadLimiter(2, 1);
  await publicShareResponse(new Request('https://example.test'), token, read, rate);
  const response = await publicShareResponse(new Request('https://example.test'), token, read, rate);
  expect(response.status).toBe(429); expect(response.headers.get('retry-after')).toBe('60'); expect(read).toHaveBeenCalledTimes(1);
});
