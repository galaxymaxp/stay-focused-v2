import { describe, expect, it, vi } from 'vitest';
import { readReviewedMaterialIds } from './reviewed-materials';
describe('reviewed material reader', () => {
  it('scopes every provenance table to the owner and excludes foreign and deleted reviewers', async () => {
    const owner = 'owner';
    const tables: Record<string, Record<string, unknown>[]> = {
      generated_artifacts: [
        { id: 'reviewer', user_id: owner, artifact_type: 'reviewer', latest_version_id: 'version', updated_at: '2026-10-12', deleted_at: null },
        { id: 'foreign', user_id: 'other', artifact_type: 'reviewer', latest_version_id: 'foreign-version', updated_at: '2026-10-12', deleted_at: null },
        { id: 'deleted', user_id: owner, artifact_type: 'reviewer', latest_version_id: 'deleted-version', updated_at: '2026-10-12', deleted_at: '2026-10-12' },
      ],
      generated_artifact_versions: [
        { id: 'version', user_id: owner, artifact_id: 'reviewer', artifact_type: 'reviewer', source_version_id: 'source' },
        { id: 'foreign-version', user_id: 'other', artifact_id: 'foreign', artifact_type: 'reviewer', source_version_id: 'foreign-source' },
        { id: 'deleted-version', user_id: owner, artifact_id: 'deleted', artifact_type: 'reviewer', source_version_id: 'deleted-source' },
      ],
      source_versions: ['source','foreign-source','deleted-source'].map(id => ({ id, user_id: id === 'foreign-source' ? 'other' : owner, metadata: { reviewerSourceSnapshotId: id + '-snapshot' } })),
      reviewer_source_snapshots: ['source','foreign-source','deleted-source'].map(id => ({ id: id + '-snapshot', user_id: id === 'foreign-source' ? 'other' : owner, course_id: 'course' })),
      reviewer_source_snapshot_items: ['source','foreign-source','deleted-source'].map(id => ({ id, user_id: id === 'foreign-source' ? 'other' : owner, course_id: 'course', source_snapshot_id: id + '-snapshot', source_type: 'page', source_row_id: id })),
    };
    const eq = vi.fn();
    const from = vi.fn((table: string) => ({ select: () => ({ eq: (key: string, value: string) => {
      eq(table, key, value);
      // Deliberately return foreign rows too, exercising defense in depth.
      return { order: () => ({ range: async () => ({ data: tables[table], error: null }) }) };
    } }) }));
    expect(await readReviewedMaterialIds({ from } as never, owner, 'course')).toEqual(new Set(['page:source']));
    expect(from).toHaveBeenCalledTimes(5);
    for (const table of Object.keys(tables)) expect(eq).toHaveBeenCalledWith(table, 'user_id', owner);
  });
});
