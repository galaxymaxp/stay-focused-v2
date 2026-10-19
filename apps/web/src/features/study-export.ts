import type { LibraryArtifactDetail } from '@stay-focused/shared';
import type { StudyFormat } from '@stay-focused/shared/study-export';

export const EXPORT_FAILURE = 'The file could not be created. Please try again.';

export async function studyFormats(detail: LibraryArtifactDetail): Promise<readonly StudyFormat[]> {
  const { formatsFor } = await import('@stay-focused/shared/study-export');
  return formatsFor(detail);
}

/** Build only on demand, from saved content, without a provider request. */
export async function downloadStudyFile(detail: LibraryArtifactDetail, format: StudyFormat): Promise<void> {
  try {
    const { createStudyFile, STUDY_MIME } = await import('@stay-focused/shared/study-export');
    const { name, bytes } = await createStudyFile(detail, format);
    const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: STUDY_MIME[format] }));
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  } catch {
    throw new Error(EXPORT_FAILURE);
  }
}
