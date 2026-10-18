import type { StudyImageDownload } from '@stay-focused/shared';
import type * as FileSystem from 'expo-file-system/legacy';
import type { ExperienceClient } from './experienceApi';
import { readPageSnapshot, type PageSnapshot } from './sourcePageSnapshots';
import { readSectionFigures } from './sourceFigures';

export type ImageFileStage = 'download' | `download_http_${number}` | 'not_image' | 'empty';
export class ImageFileError extends Error {
  constructor(readonly stage: ImageFileStage) { super(stage); }
}
export type ImageFiles = Pick<typeof FileSystem, 'downloadAsync' | 'copyAsync' | 'getInfoAsync'>;

/** Shared FX1b download validation. Never logs a URL or native error. */
export async function downloadStudyImage(files: ImageFiles, image: StudyImageDownload, destination: string,
  refreshUri?: () => Promise<string>, requireMime = false): Promise<{ bytes: number; mime?: string }> {
  const sourceUri = refreshUri ? await refreshUri() : image.uri;
  let mime: string | undefined;
  if (/^https:\/\//i.test(sourceUri)) {
    const downloaded = await files.downloadAsync(sourceUri, destination, { headers: image.headers ? { ...image.headers } : undefined });
    if (downloaded.status < 200 || downloaded.status >= 300) throw new ImageFileError(`download_http_${downloaded.status}`);
    mime = Object.entries(downloaded.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
    if ((requireMime && !mime) || (mime && !mime.toLowerCase().startsWith('image/'))) throw new ImageFileError('not_image');
  } else if (sourceUri.startsWith('file://')) {
    await files.copyAsync({ from: sourceUri, to: destination });
  } else throw new ImageFileError('download');
  const info = await files.getInfoAsync(destination);
  if (!info.exists || info.isDirectory || !Number.isFinite(info.size) || info.size <= 0) throw new ImageFileError('empty');
  return { bytes: info.size, mime };
}

/** Fresh owner reads must still refer to the exact accepted image. */
export async function refreshSnapshotUri(client: ExperienceClient, artifactId: string, sectionId: string,
  expected: Extract<PageSnapshot, { url: string }>): Promise<string> {
  const fresh = await readPageSnapshot(client, artifactId, sectionId, false);
  if (!expected.id || !fresh.available || !('url' in fresh) || fresh.id !== expected.id ||
      fresh.page !== expected.page || fresh.labelKind !== expected.labelKind) throw new Error('snapshot_unavailable');
  return fresh.url;
}
export async function refreshFigureUri(client: ExperienceClient, artifactId: string, sectionId: string, id: string): Promise<string> {
  const fresh = (await readSectionFigures(client, artifactId, sectionId)).find(item => item.id === id);
  if (!fresh) throw new Error('figure_unavailable');
  return fresh.url;
}
