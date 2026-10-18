import type { CanvasMaterialPreparationRow, MaterialDescriptionRow, ProcessingJobDatabaseRow } from '@stay-focused/db';
import type { GenerationProvider } from '@stay-focused/engine';
import { describe, expect, it, vi } from 'vitest';
import { cleanMaterialDescription, describeManualMaterial, describePreparedMaterial, materialDescriptionModel } from './material-descriptions';
import type { PreparedMaterial } from './canvas-preparation/contracts';

const job = { id: 'prep', user_id: 'owner', state: 'prepared', result_id: 'result' } as CanvasMaterialPreparationRow;
const receipt = { id: 'receipt', description_status: 'failed' } as MaterialDescriptionRow;
function setup(text = 'Cells use energy to maintain their structures.') {
  const rpc = vi.fn().mockResolvedValueOnce({ data: [receipt], error: null }).mockResolvedValue({ data: true, error: null });
  const readPrepared = vi.fn(async (): Promise<PreparedMaterial> => ({ version: 1, components: [{
    type: 'page', id: '11111111-1111-4111-8111-111111111111', revision: 'a'.repeat(64), text, blocks: [],
  }] }));
  const generate = vi.fn().mockResolvedValue({ description: 'Covers how cells use energy to maintain their structures.' });
  return { client: { rpc } as never, rpc, generate, deps: { readPrepared, provider: { generate } as GenerationProvider } };
}
describe('source-only revision descriptions', () => {
  it('records skipped_empty without any provider call', async () => {
    const s = setup('  ');
    await describePreparedMaterial(s.client, job, s.deps);
    expect(s.rpc).toHaveBeenCalledExactlyOnceWith('claim_material_description_v1', expect.objectContaining({ p_empty: true }));
    expect(s.generate).not.toHaveBeenCalled();
  });
  it.each(['ready', 'failed', 'skipped_empty', 'guard exhausted'])('does not call a provider for an existing %s revision or exhausted guard', async () => {
    const s = setup(); s.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    await describePreparedMaterial(s.client, job, s.deps);
    expect(s.generate).not.toHaveBeenCalled(); expect(s.rpc).toHaveBeenCalledOnce();
  });
  it('bounds source context across components, marks it untrusted and sends no owner/title/metadata', async () => {
    const s = setup('A'.repeat(4000));
    const base = await s.deps.readPrepared();
    s.deps.readPrepared.mockResolvedValue({ ...base, components: [...base.components,
      { ...base.components[0]!, id: '22222222-2222-4222-8222-222222222222', text: 'B'.repeat(4000) }] });
    await describePreparedMaterial(s.client, job, s.deps);
    const call = s.generate.mock.calls[0]![0];
    expect(call).toMatchObject({ model: 'gpt-5.4-2026-03-05', reasoningEffort: 'low', maxOutputTokens: 600 });
    expect(call.instructions).toContain('untrusted data'); expect(call.instructions).toContain('never general knowledge');
    expect(Object.keys(JSON.parse(call.prompt))).toEqual(['sourceText']);
    expect(JSON.parse(call.prompt).sourceText).toHaveLength(6000);
    expect(call.prompt).not.toContain('owner');
    expect(s.rpc).toHaveBeenLastCalledWith('finish_material_description_v1', expect.objectContaining({ p_id: 'receipt', p_user_id: 'owner' }));
  });
  it('cleans markdown and keeps at most two sentences within 240 characters', async () => {
    const s = setup(); s.generate.mockResolvedValue({ description: '# **Cells** use [energy](https://example.invalid).\n- ' + 'Further detail '.repeat(30) + '.' });
    await describePreparedMaterial(s.client, job, s.deps);
    expect(s.rpc).toHaveBeenLastCalledWith('finish_material_description_v1', expect.objectContaining({ p_description: 'Cells use energy.' }));
    expect(cleanMaterialDescription('First. Second! Third?')).toBe('First. Second!');
    expect(cleanMaterialDescription('```Cells use energy.```')).toBe('Cells use energy.');
    expect(cleanMaterialDescription('```text\nCells use energy.\n```')).toBe('Cells use energy.');
    expect(cleanMaterialDescription('Covers U.S. history.')).toBe('Covers U.S. history.');
    const long = cleanMaterialDescription('A long sentence '.repeat(40));
    expect(Array.from(long).length).toBeLessThanOrEqual(240); expect(long).toMatch(/\.$/);
    expect(Array.from(cleanMaterialDescription('🧬 '.repeat(180))).length).toBeLessThanOrEqual(240);
  });
  it('retains failed reservation on provider failure, returns normally and logs no provider data', async () => {
    const s = setup(); s.generate.mockRejectedValue(new Error('private provider content'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(describePreparedMaterial(s.client, job, s.deps)).resolves.toBeUndefined();
    expect(s.rpc).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith('material_description', { code: 'generation_failed' });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  });
  it.each([null, {}, { description: '' }, { description: 'Valid.', secret: 'extra' }])('rejects invalid provider output %j', async output => {
    const s = setup(); s.generate.mockResolvedValue(output);
    await describePreparedMaterial(s.client, job, s.deps);
    expect(s.rpc).toHaveBeenCalledOnce();
  });
  it('ignores unprepared jobs and unavailable current evidence', async () => {
    const s = setup();
    await describePreparedMaterial(s.client, { ...job, state: 'cancelled' }, s.deps);
    s.deps.readPrepared.mockResolvedValueOnce(null as never);
    await describePreparedMaterial(s.client, job, s.deps);
    expect(s.rpc).not.toHaveBeenCalled(); expect(s.generate).not.toHaveBeenCalled();
  });
  it('supports an explicit model override without changing configured defaults', () => {
    expect(materialDescriptionModel({ MATERIAL_DESCRIPTION_MODEL: ' custom-model ' })).toBe('custom-model');
    expect(materialDescriptionModel({ MATERIAL_DESCRIPTION_MODEL: ' ' })).toBe('gpt-5.4-2026-03-05');
  });
  it('describes only an owned persisted manual source version', async () => {
    const s = setup();
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { user_id: 'owner', source_text: 'Cells use energy.' }, error: null }) };
    const from = vi.fn(() => query);
    await describeManualMaterial({ from, rpc: s.rpc } as never, { user_id: 'owner', source_version_id: 'version' } as ProcessingJobDatabaseRow, s.deps);
    expect(from).toHaveBeenCalledExactlyOnceWith('source_versions');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'owner');
    expect(s.rpc).toHaveBeenCalledWith('claim_material_description_v1', expect.objectContaining({ p_source_version_id: 'version', p_preparation_id: null }));
  });
});
