import type { LibraryArtifactDetail } from '@stay-focused/shared';
import { createStudyFile, STUDY_MIME, type StudyFormat } from '@stay-focused/shared/study-export';
export { formatsFor, createStudyFile } from '@stay-focused/shared/study-export';

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

export async function saveStudyFile(detail: LibraryArtifactDetail, format: StudyFormat): Promise<string | null> {
  const { EncodingType, StorageAccessFramework } = await import('expo-file-system/legacy');
  const { name, bytes } = await createStudyFile(detail, format);
  const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return null;
  const target = await StorageAccessFramework.createFileAsync(permission.directoryUri, name.replace(/\.[^.]+$/, ''), STUDY_MIME[format]);
  await StorageAccessFramework.writeAsStringAsync(target, base64(bytes), { encoding: EncodingType.Base64 });
  return name;
}
