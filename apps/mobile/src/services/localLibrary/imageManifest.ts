import type { ReviewerFigure, ReviewerReferenceVisual, ReviewerSnapshot, StudyImageDownload } from '@stay-focused/shared';

export type ReadySnapshot = Extract<ReviewerSnapshot, { url: string }>;
export interface OfflineImage {
  key: string;
  kind: StudyImageDownload['kind'];
  sectionId: string;
  sectionIds?: string[];
  sourceRef: string;
  localPath: string | null;
  bytes: number;
  status: 'pending' | 'stored' | 'failed' | 'skipped_cap';
  attempts: number;
  retryAt: number;
  failure?: string;
  attribution: string | null;
  snapshot?: Omit<ReadySnapshot, 'url'>;
  figure?: Omit<ReviewerFigure, 'url'>;
  external?: Omit<ReviewerReferenceVisual, 'image'>;
}
export interface OfflineImageManifest {
  version: string;
  /** Unique across clear and re-save of the same version: delayed downloads cannot resurrect files. */
  generation: string;
  discovered: boolean;
  attempts: number;
  retryAt: number;
  images: OfflineImage[];
}
export function newImageManifest(version: string): OfflineImageManifest {
  return { version, generation: `${Date.now()}-${Math.random().toString(36).slice(2)}`, discovered: false, attempts: 0, retryAt: 0, images: [] };
}
export function imagesReady(manifest: OfflineImageManifest | null): boolean {
  return !!manifest?.discovered && manifest.images.every(image => image.status === 'stored' || image.status === 'skipped_cap');
}
export function imagesNeedConnection(manifest: OfflineImageManifest | null): boolean {
  return !!manifest && (!manifest.discovered || manifest.images.some(image => image.status !== 'stored'));
}
// Serializes publication with invalidation, including the filesystem move. Network
// downloads happen outside this lock, so a slow connection cannot block text writes.
let tail: Promise<unknown> = Promise.resolve();
export function withOfflineImageLock<T>(work: () => Promise<T>): Promise<T> {
  const result = tail.then(work);
  tail = result.catch(() => undefined);
  return result;
}
const listeners = new Map<string, Set<() => void>>();
export function subscribeOfflineImages(owner: string, listener: () => void): () => void {
  const set = listeners.get(owner) ?? new Set(); set.add(listener); listeners.set(owner, set);
  return () => { set.delete(listener); if (!set.size) listeners.delete(owner); };
}
export function notifyOfflineImages(owner: string): void {
  for (const listener of listeners.get(owner) ?? []) listener();
}

/** Encoding prevents owner/artifact IDs from becoming path traversal. */
export function imageDirectory(root: string, owner: string, artifact?: string): string {
  const segment = (value: string) => encodeURIComponent(value).replace(/\./g, '%2E');
  return `${root}offline-images/${segment(owner)}/${artifact ? `${segment(artifact)}/` : ''}`;
}
export async function removeImageDirectory(owner: string, artifact?: string): Promise<void> {
  let files: typeof import('expo-file-system/legacy');
  try { files = await import('expo-file-system/legacy'); } catch { return; } // Older binary / Node / web.
  if (files.documentDirectory) {
    // A filesystem failure must not roll back removal of readable DB rows.
    // Clear/replacement retries the same private directory; never touch gallery files.
    await files.deleteAsync(imageDirectory(files.documentDirectory, owner, artifact), { idempotent: true }).catch(() => {});
  }
}
