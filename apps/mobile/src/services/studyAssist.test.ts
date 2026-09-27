import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ASSIST_TYPES, assistCacheKey, assistRequest, selectAssistBlock, type AssistRequest, type ReviewerReaderModel } from '@stay-focused/shared';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStudyAssistService, ASSIST_OFFLINE_MESSAGE } from './studyAssist';
import { ExperienceApiError } from './experienceApi';
import { createLocalArtifactStore } from './localLibrary/artifactStore';
import { migrateLocalLibrary } from './localLibrary/schema';
import { openNodeSqlite, reviewerDetail, OWNER_A, OWNER_B, REVIEWER_ROW_ID } from './localLibrary/localLibrary.testSupport';
import { quizIntentInput } from '../features/redesign/quizRequest';

const cleanups: (() => void)[] = [];
afterEach(() => { while (cleanups.length) cleanups.pop()!(); });
const client = { baseUrl: 'https://example.test', accessToken: 'test' };
const output = (request: AssistRequest) => ({ ...request, text: `Help for ${request.assistType}`, createdAt: '2026-09-27T00:00:00Z' });
async function setup(path?: string) {
  const handle = openNodeSqlite(path);
  cleanups.push(() => { try { handle.close(); } catch { /* closed in relaunch test */ } });
  await migrateLocalLibrary(handle.db);
  const cache = createLocalArtifactStore(handle.db);
  const detail = reviewerDetail();
  await cache.upsertDetail(OWNER_A, detail.artifact.id, detail);
  const reviewer = ('reviewer' in detail ? detail.reviewer : null)!;
  const section = reviewer.sections[0]!;
  const selection = selectAssistBlock(reviewer, section.id, section.blocks[0]!.id)!;
  const generate = vi.fn(async (_client: typeof client, request: AssistRequest): Promise<unknown> => output(request));
  const service = createStudyAssistService({ cache: async () => cache, generate });
  return { ...handle, cache, detail, reviewer, selection, generate, service };
}
describe('Study Assist on-demand cache', () => {
  it('does nothing until requested, then generates once and returns unchanged cached output', async () => {
    const s = await setup();
    expect(s.generate).not.toHaveBeenCalled();
    const a = await s.service.request(OWNER_A, client, s.selection, 'summarize');
    const b = await s.service.request(OWNER_A, client, s.selection, 'summarize');
    expect(b).toEqual(a); expect(s.generate).toHaveBeenCalledTimes(1);
    expect(s.generate.mock.calls[0]![1]).not.toHaveProperty('canonicalContent');
  });
  it.each(ASSIST_TYPES)('generates and independently caches %s', async type => {
    const s = await setup();
    const value = await s.service.request(OWNER_A, client, s.selection, type);
    expect(value.assistType).toBe(type);
    expect(await s.cache.readAssist(OWNER_A, assistRequest(s.selection, type), s.selection.canonicalContent)).toEqual(value);
  });
  it('keeps all four types independent', async () => {
    const s = await setup();
    await Promise.all(ASSIST_TYPES.map(type => s.service.request(OWNER_A, client, s.selection, type)));
    expect(s.generate).toHaveBeenCalledTimes(4);
    expect(s.raw.prepare('SELECT COUNT(*) AS n FROM study_assists').get()).toEqual({ n: 4 });
  });
  it('deduplicates concurrent taps including while the cache lookup is pending', async () => {
    const s = await setup();
    const calls = Array.from({ length: 12 }, () => s.service.request(OWNER_A, client, s.selection, 'analogy'));
    expect(calls.every(call => call === calls[0])).toBe(true);
    const results = await Promise.all(calls);
    expect(new Set(results).size).toBe(1); expect(s.generate).toHaveBeenCalledTimes(1);
  });
  it('persists across closing and reopening a real SQLite file, offline without network', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'b37-assist-'));
    cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
    const path = join(dir, 'library.db');
    const first = await setup(path);
    const value = await first.service.request(OWNER_A, client, first.selection, 'example');
    first.close();
    const second = await setup(path);
    second.generate.mockRejectedValue(new ExperienceApiError('connection', 'offline'));
    expect(await second.service.request(OWNER_A, client, second.selection, 'example')).toEqual(value);
    expect(second.generate).not.toHaveBeenCalled();
  });
  it('bypasses cache after canonical content or prompt version changes', async () => {
    const s = await setup();
    await s.service.request(OWNER_A, client, s.selection, 'summarize');
    const updated: ReviewerReaderModel = { ...s.reviewer, sections: s.reviewer.sections.map(section => ({ ...section, blocks: section.blocks.map(block => ({ ...block, explanation: block.explanation + ' Changed.' })) })) };
    const selection = selectAssistBlock(updated, s.selection.sectionId, s.selection.blockId)!;
    expect(selection.contentHash).not.toBe(s.selection.contentHash);
    await s.service.request(OWNER_A, client, selection, 'summarize');
    await s.service.request(OWNER_A, client, selection, 'summarize', 'study-assist-v2');
    expect(s.generate).toHaveBeenCalledTimes(3);
  });
  it('uncached offline help is calm and canonical Reviewer remains readable', async () => {
    const s = await setup(); s.generate.mockRejectedValue(new ExperienceApiError('connection', 'offline'));
    await expect(s.service.request(OWNER_A, client, s.selection, 'example')).rejects.toThrow(ASSIST_OFFLINE_MESSAGE);
    expect((await s.cache.readDetail(OWNER_A, s.detail.artifact.id))?.detail).toEqual(s.detail);
    expect(s.generate).toHaveBeenCalledTimes(1);
  });
  it.each(['sign_in_required', 'not_found', 'conflict'])('handles %s without damaging the Reviewer', async code => {
    const s = await setup(); s.generate.mockRejectedValue(new ExperienceApiError(code, 'Safe product message'));
    await expect(s.service.request(OWNER_A, client, s.selection, 'example')).rejects.toThrow('Safe product message');
    expect((await s.cache.readDetail(OWNER_A, s.detail.artifact.id))?.detail).toEqual(s.detail);
  });
  it.each([null, {}, { text: '' }, { text: 'x'.repeat(2401) }])('rejects malformed output %j without caching', async bad => {
    const s = await setup(); s.generate.mockResolvedValue(bad);
    await expect(s.service.request(OWNER_A, client, s.selection, 'example')).rejects.toThrow('could not be read');
    expect(s.raw.prepare('SELECT COUNT(*) AS n FROM study_assists').get()).toEqual({ n: 0 });
  });
  it('does not cache provider failures and permits an explicit retry', async () => {
    const s = await setup(); s.generate.mockRejectedValueOnce(new Error('private provider error'));
    await expect(s.service.request(OWNER_A, client, s.selection, 'analogy')).rejects.toThrow('could not be generated');
    await expect(s.service.request(OWNER_A, client, s.selection, 'analogy')).resolves.toHaveProperty('text');
    expect(s.generate).toHaveBeenCalledTimes(2);
  });
  it('discards corrupt cached JSON and safely regenerates', async () => {
    const s = await setup(); await s.service.request(OWNER_A, client, s.selection, 'example');
    s.raw.prepare('UPDATE study_assists SET result_json = ?').run('{bad');
    await s.service.request(OWNER_A, client, s.selection, 'example');
    expect(s.generate).toHaveBeenCalledTimes(2);
  });
  it('rejects a fingerprint collision when exact content differs', async () => {
    const s = await setup(); await s.service.request(OWNER_A, client, s.selection, 'example');
    expect(await s.cache.readAssist(OWNER_A, assistRequest(s.selection, 'example'), 'different canonical content')).toBeNull();
  });
  it('isolates owners and purges assists at sign-out or Reviewer deletion', async () => {
    const s = await setup(); const request = assistRequest(s.selection, 'example');
    await s.service.request(OWNER_A, client, s.selection, 'example');
    expect(await s.cache.readAssist(OWNER_B, request, s.selection.canonicalContent)).toBeNull();
    await s.cache.purgeOwner(OWNER_A);
    expect(await s.cache.readAssist(OWNER_A, request, s.selection.canonicalContent)).toBeNull();
    await expect(s.cache.writeAssist(OWNER_A, output(request), s.selection.canonicalContent)).rejects.toThrow('not_saved');
    await s.cache.upsertDetail(OWNER_A, s.detail.artifact.id, s.detail);
    await s.service.request(OWNER_A, client, s.selection, 'example');
    await s.cache.removeArtifact(OWNER_A, s.detail.artifact.id);
    expect(s.raw.prepare('SELECT COUNT(*) AS n FROM study_assists').get()).toEqual({ n: 0 });
  });
  it('leaves canonical artifacts and the Quiz request identical after all assistance', async () => {
    const s = await setup(); const before = JSON.stringify(s.detail);
    const input = { title: s.detail.artifact.title, reviewerArtifactId: REVIEWER_ROW_ID };
    const quizBefore = quizIntentInput(input);
    await Promise.all(ASSIST_TYPES.map(type => s.service.request(OWNER_A, client, s.selection, type)));
    expect(JSON.stringify(s.detail)).toBe(before);
    expect((await s.cache.readDetail(OWNER_A, s.detail.artifact.id))?.detail).toEqual(s.detail);
    expect(quizIntentInput(input)).toEqual(quizBefore);
    expect(JSON.stringify(quizBefore)).not.toContain('Help for');
    expect(assistCacheKey(assistRequest(s.selection, 'example'))).toContain(s.selection.contentHash);
  });
  it('does not charge when persistent storage is unavailable', async () => {
    const s = await setup();
    const service = createStudyAssistService({ cache: async () => null, generate: s.generate });
    await expect(service.request(OWNER_A, client, s.selection, 'example')).rejects.toThrow('storage is unavailable');
    expect(s.generate).not.toHaveBeenCalled();
  });
  it('rejects a missing/decorative block selection', async () => {
    const s = await setup();
    expect(selectAssistBlock(s.reviewer, s.selection.sectionId, 'missing')).toBeNull();
    expect(selectAssistBlock(s.reviewer, 'title', s.selection.blockId)).toBeNull();
  });
});
