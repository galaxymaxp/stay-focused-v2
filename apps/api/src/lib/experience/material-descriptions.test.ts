import { expect, it, vi } from 'vitest';
import { experienceRepository, trustedExperienceReadRepository, withManualMaterialDescriptions } from './repository';
import type { LibraryArtifactSummary } from '@stay-focused/shared';
it('binds the single description lookup to the verified bearer owner and deduplicates the page', async () => {
  const rpc = vi.fn().mockResolvedValue({ data: [{ material_id: 'page:one', description: 'Covers cells.' }], error: null });
  const repository = trustedExperienceReadRepository({ rpc } as never, 'verified-owner');
  expect(await repository.materialDescriptions!('forged-owner', 'course', ['page:one', 'page:one'])).toEqual(new Map([['page:one', 'Covers cells.']]));
  expect(rpc).toHaveBeenCalledExactlyOnceWith('read_material_descriptions_v1', {
    p_user_id: 'verified-owner', p_course_id: 'course', p_material_ids: ['page:one'],
  });
});
it('description outages or invalid duplicate results leave material reads usable', async () => {
  const rpc = vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'private query details' } })
    .mockResolvedValue({ data: [{ material_id: 'page:one', description: 'One.' }, { material_id: 'page:one', description: 'Two.' }], error: null });
  const repository = experienceRepository({ rpc } as never);
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(await repository.materialDescriptions!('owner', 'course', ['page:one'])).toEqual(new Map());
  expect(await repository.materialDescriptions!('owner', 'course', ['page:one'])).toEqual(new Map());
  expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  rpc.mockClear();
  expect(await repository.materialDescriptions!('owner', 'course', [])).toEqual(new Map());
  expect(rpc).not.toHaveBeenCalled();
});
it('batches manual Library source descriptions by source version without changing course cards', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const item = { id: 'artifact:manual', type: 'reviewer', course: null, sourceId: id, sourceTitle: 'Notes.pdf' } as LibraryArtifactSummary;
  const courseItem = { ...item, id: 'artifact:canvas', course: { id: 'course', code: null, name: 'Course' } };
  const rpc = vi.fn().mockResolvedValueOnce({ data: [{ source_version_id: id, description: 'Covers cell energy.' }], error: null })
    .mockResolvedValue({ data: null, error: { message: 'private details' } });
  const result = await withManualMaterialDescriptions({ rpc } as never, 'verified-owner', [item, courseItem, { ...item, id: 'artifact:remake' }]);
  expect(rpc).toHaveBeenCalledExactlyOnceWith('read_manual_material_descriptions_v1', { p_user_id: 'verified-owner', p_source_version_ids: [id] });
  expect(result.map(row => row.sourceDescription)).toEqual(['Covers cell energy.', undefined, 'Covers cell energy.']);
  expect((await withManualMaterialDescriptions({ rpc } as never, 'verified-owner', [item]))[0]).toEqual(item);
});
