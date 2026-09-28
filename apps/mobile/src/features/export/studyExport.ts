import type { LibraryArtifactDetail } from '@stay-focused/shared';
import { getLocalArtifactStore } from '../../services/localLibrary/localArtifactDatabase';
import { activityExport, exportFileName, reviewerExport, type StudyFormat } from './exportLayout';
import { createStudyPdf } from './pdfExport';
import { createStudyDocx } from './docxExport';
import { createStudyPptx } from './pptxExport';

export function formatsFor(detail: LibraryArtifactDetail): readonly StudyFormat[] {
  return 'reviewer' in detail ? ['pdf'] : 'draft' in detail ? ['pdf', 'docx', 'pptx'] : [];
}

/** No provider request: all bytes are produced from the saved artifact and local work. */
export async function createStudyFile(detail: LibraryArtifactDetail, format: StudyFormat, ownerUserId: string): Promise<{ name: string; bytes: Uint8Array }> {
  if (!formatsFor(detail).includes(format)) throw new Error('unsupported_export_format');
  if ('quiz' in detail) throw new Error('unsupported_export_format');
  const document = 'reviewer' in detail ? reviewerExport(detail.artifact, detail.reviewer) :
    activityExport(detail.artifact, detail.draft,
      (await (await getLocalArtifactStore())?.readActivityResponse(ownerUserId, detail.artifact.id))?.responses ?? {});
  const bytes = format === 'pdf' ? await createStudyPdf(document) : format === 'docx' ? createStudyDocx(document) : createStudyPptx(document);
  return { name: exportFileName(detail.artifact, format), bytes };
}

const base64 = (bytes: Uint8Array): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!, b = bytes[i + 1], c = bytes[i + 2];
    out += alphabet[a >> 2] + alphabet[((a & 3) << 4) | ((b ?? 0) >> 4)] +
      (b === undefined ? '=' : alphabet[((b & 15) << 2) | ((c ?? 0) >> 6)]) +
      (c === undefined ? '=' : alphabet[c & 63]);
  }
  return out;
};

export async function saveStudyFile(detail: LibraryArtifactDetail, format: StudyFormat, ownerUserId: string): Promise<string | null> {
  const { EncodingType, StorageAccessFramework } = await import('expo-file-system/legacy');
  const { name, bytes } = await createStudyFile(detail, format, ownerUserId);
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;
  const mime = format === 'pdf' ? 'application/pdf' : format === 'docx' ?
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
    'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  const target = await StorageAccessFramework.createFileAsync(permission.directoryUri, name.replace(/\.[^.]+$/, ''), mime);
  await StorageAccessFramework.writeAsStringAsync(target, base64(bytes), { encoding: EncodingType.Base64 });
  return name;
}
