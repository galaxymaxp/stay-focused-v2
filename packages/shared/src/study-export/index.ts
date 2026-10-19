import type { LibraryArtifactDetail } from '../index';
import { activityExport, exportFileName, reviewerExport, type StudyFormat } from './layout';
import { createStudyPdf } from './pdf';
import { createStudyDocx } from './docx';
import { createStudyPptx } from './pptx';

export { exportFileName, type StudyFormat } from './layout';
export const STUDY_MIME: Readonly<Record<StudyFormat, string>> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function formatsFor(detail: LibraryArtifactDetail): readonly StudyFormat[] {
  return 'reviewer' in detail ? ['pdf'] : 'draft' in detail ? ['pdf', 'docx', 'pptx'] : [];
}

/** No provider request: all bytes are produced from the saved artifact. */
export async function createStudyFile(detail: LibraryArtifactDetail, format: StudyFormat): Promise<{ name: string; bytes: Uint8Array }> {
  if (!formatsFor(detail).includes(format)) throw new Error('unsupported_export_format');
  if ('quiz' in detail) throw new Error('unsupported_export_format');
  const document = 'reviewer' in detail ? reviewerExport(detail.artifact, detail.reviewer) :
    activityExport(detail.artifact, detail.draft);
  const bytes = format === 'pdf' ? await createStudyPdf(document) : format === 'docx' ? createStudyDocx(document) : createStudyPptx(document);
  return { name: exportFileName(detail.artifact, format), bytes };
}
