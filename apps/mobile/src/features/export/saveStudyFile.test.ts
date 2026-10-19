import { beforeEach, expect, it, vi } from 'vitest';
import type { LibraryArtifactDetail } from '@stay-focused/shared';
import { saveStudyFile } from './studyExport';

const mocks = vi.hoisted(() => ({ build: vi.fn(), permission: vi.fn(), create: vi.fn(), write: vi.fn() }));
vi.mock('@stay-focused/shared/study-export', async importOriginal => ({
  ...await importOriginal<typeof import('@stay-focused/shared/study-export')>(), createStudyFile: mocks.build,
}));
vi.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' }, StorageAccessFramework: {
    requestDirectoryPermissionsAsync: mocks.permission, createFileAsync: mocks.create, writeAsStringAsync: mocks.write,
  },
}));
const detail = {} as LibraryArtifactDetail;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.build.mockResolvedValue({ name: 'Saved_Draft.pdf', bytes: new Uint8Array([0, 1, 2, 255]) });
  mocks.permission.mockResolvedValue({ granted: true, directoryUri: 'local-directory' });
  mocks.create.mockResolvedValue('local-file'); mocks.write.mockResolvedValue(undefined);
});
it('writes the shared file bytes as base64 using the original SAF folder flow', async () => {
  await expect(saveStudyFile(detail, 'pdf')).resolves.toBe('Saved_Draft.pdf');
  expect(mocks.build).toHaveBeenCalledWith(detail, 'pdf');
  expect(mocks.create).toHaveBeenCalledWith('local-directory', 'Saved_Draft', 'application/pdf');
  expect(mocks.write).toHaveBeenCalledWith('local-file', 'AAEC/w==', { encoding: 'base64' });
});
it('returns cancellation without creating or writing a file', async () => {
  mocks.permission.mockResolvedValue({ granted: false });
  await expect(saveStudyFile(detail, 'pdf')).resolves.toBeNull();
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.write).not.toHaveBeenCalled();
});
