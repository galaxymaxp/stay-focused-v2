import { parseReviewerImages, type LibraryArtifactDetail, type ReviewerImages, type StudyImageDownload } from '@stay-focused/shared';
import { experienceRequest, type ExperienceClient } from '../experienceApi';
import { EXTERNAL_IMAGE_HEADERS } from '../externalVisuals';
import { readPageSnapshot } from '../sourcePageSnapshots';
import { downloadStudyImage, ImageFileError, refreshFigureUri, refreshSnapshotUri } from '../studyImageFile';
import type { LocalArtifactStore } from './artifactStore';
import { imageDirectory, withOfflineImageLock, type OfflineImage, type OfflineImageManifest } from './imageManifest';

export const REVIEWER_IMAGE_CAP = 40 * 1024 * 1024;
export const TOTAL_IMAGE_CAP = 500 * 1024 * 1024;
export type OfflineImageFiles = Pick<typeof import('expo-file-system/legacy'),
  'documentDirectory' | 'makeDirectoryAsync' | 'downloadAsync' | 'getInfoAsync' | 'copyAsync' | 'moveAsync' | 'deleteAsync'>;

/** A stable non-secret filename hash; signed URL query strings never participate. */
function hash(value: string): string {
  let a = 2166136261, b = 5381;
  for (let i = 0; i < value.length; i++) { a = Math.imul(a ^ value.charCodeAt(i), 16777619); b = Math.imul(b, 33) ^ value.charCodeAt(i); }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
export function offlineImageKey(kind: OfflineImage['kind'], sourceRef: string, version: string): string {
  return `${kind}-${hash(sourceRef)}-${hash(version)}`;
}

/** Persist only identity and display metadata, never private signed URLs or headers. */
export function imageRecords(data: ReviewerImages, version: string, sectionOrder: readonly string[]): OfflineImage[] {
  const records: OfflineImage[] = [];
  const seen = new Set<string>();
  const add = (record: Omit<OfflineImage, 'key' | 'localPath' | 'bytes' | 'status' | 'attempts' | 'retryAt'>) => {
    const key = offlineImageKey(record.kind, record.sourceRef, version);
    if (seen.has(key)) {
      const existing = records.find(r => r.key === key)!;
      existing.sectionIds = [...new Set([...(existing.sectionIds ?? [existing.sectionId]), record.sectionId])];
      return;
    }
    seen.add(key);
    records.push({ ...record, key, localPath: null, bytes: 0, status: 'pending', attempts: 0, retryAt: 0 });
  };
  for (const id of sectionOrder) {
    const section = data.sections.find(s => s.sectionId === id);
    if (!section) continue;
    for (const { url: _url, ...figure } of section.figures) add({ kind: 'figure', sectionId: id, sourceRef: figure.id, attribution: null, figure });
    if (section.snapshot.available && 'url' in section.snapshot) {
      const { url: _url, ...snapshot } = section.snapshot;
      add({ kind: 'page_snapshot', sectionId: id, sourceRef: snapshot.id ?? `${id}:${snapshot.labelKind ?? 'page'}:${snapshot.page}`, attribution: null, snapshot });
    }
    if (section.external) {
      const { image: _image, ...external } = section.external;
      add({ kind: 'external_visual', sectionId: id, sourceRef: external.id, attribution: `${external.credit} · ${external.license}`, external });
    }
  }
  return records;
}
const backoff = (attempts: number) => Math.min(60 * 60_000, 30_000 * 2 ** Math.min(7, Math.max(0, attempts - 1)));
function sameGeneration(a: OfflineImageManifest | null, b: OfflineImageManifest): a is OfflineImageManifest {
  return !!a && a.version === b.version && a.generation === b.generation;
}
function safeCode(error: unknown): string {
  return error instanceof ImageFileError ? error.stage : 'download';
}

/** One reviewer pass. Two downloads overlap, but admission/publication follows reading
 * order, so caps always keep a prefix. Failed evidence never removes cached images. */
export async function cacheReviewerImages(input: {
  store: LocalArtifactStore; owner: string; detail: LibraryArtifactDetail; client: ExperienceClient;
  signal: AbortSignal; files: OfflineImageFiles; now?: () => number;
  reviewerCap?: number; totalCap?: number;
}): Promise<void> {
  const { store, owner, detail, client, signal, files } = input;
  if (!('reviewer' in detail) || !files.documentDirectory || signal.aborted) return;
  const artifact = detail.artifact.id, apiId = artifact.replace(/^artifact:/, '');
  const now = input.now ?? Date.now;
  let manifest = await store.readImageManifest(owner, artifact);
  if (!manifest || manifest.version !== detail.artifact.updatedAt) return;
  const directory = imageDirectory(files.documentDirectory, owner, artifact);
  const expected = manifest;
  let data: ReviewerImages;
  try {
    // A persisted retry clock survives process restart. Owner reads never fall back
    // to expired URLs, and the combined GET never initiates external searches.
    if (manifest.retryAt > now()) return;
    data = parseReviewerImages(await experienceRequest(client, `/api/reviewers/${encodeURIComponent(apiId)}/figures`, { signal }));
    if (signal.aborted) return;
    if (data.sections.length !== detail.reviewer.sections.length || detail.reviewer.sections.some(s => !data.sections.some(v => v.sectionId === s.id))) throw new Error('incomplete_discovery');
    // Existing snapshot admission, independent of scrolling; incomplete renders
    // stay undiscovered and retry later rather than claiming full offline readiness.
    for (const section of data.sections) {
      if (signal.aborted) return;
      if (!section.figures.length && section.snapshot.available && !('url' in section.snapshot)) {
        section.snapshot = await readPageSnapshot(client, apiId, section.sectionId, true, signal);
      }
    }
    await withOfflineImageLock(async () => {
      const current = await store.readImageManifest(owner, artifact);
      if (signal.aborted || !sameGeneration(current, expected)) return;
      const records = imageRecords(data, current.version, detail.reviewer.sections.map(s => s.id));
      // An authenticated unavailable source is explicit denial, not list absence.
      // Remove previews while retaining text, including previously saved externals.
      if (data.sections.some(s => !s.snapshot.available && s.snapshot.reason === 'source_revision_unavailable')) {
        await files.deleteAsync(directory, { idempotent: true }).catch(() => {});
        current.images = []; current.discovered = true; current.retryAt = now() + 10 * 60_000;
      } else {
        const previous = new Map(current.images.map(image => [image.key, image]));
        for (const image of current.images) {
          if (!records.some(r => r.key === image.key) && image.localPath) await files.deleteAsync(image.localPath, { idempotent: true }).catch(() => {});
        }
        current.images = records.map(record => ({ ...record, ...previous.get(record.key), sectionId: record.sectionId, sectionIds: record.sectionIds }));
        // Check for OS/user removal of document files before reporting ready.
        for (const image of current.images) if (image.status === 'stored') {
          const info = image.localPath ? await files.getInfoAsync(image.localPath) : null;
          if (!info?.exists || info.isDirectory || info.size <= 0) Object.assign(image, { status: 'pending', localPath: null, bytes: 0 });
        }
        current.discovered = !data.external.running && data.external.checked >= data.external.total && !data.sections.some(s => s.snapshot.available && !('url' in s.snapshot) && !s.figures.length);
        current.attempts = current.discovered ? 0 : current.attempts + 1;
        current.retryAt = current.discovered ? 0 : now() + backoff(current.attempts);
      }
      if (await store.saveImageManifest(owner, artifact, current)) manifest = current;
    });
  } catch (error: unknown) {
    if (signal.aborted) return;
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'not_found') {
      await store.removeArtifact(owner, artifact); return;
    }
    await withOfflineImageLock(async () => {
      const current = await store.readImageManifest(owner, artifact);
      if (!sameGeneration(current, expected)) return;
      current.attempts++; current.retryAt = now() + backoff(current.attempts);
      await store.saveImageManifest(owner, artifact, current);
    });
    return;
  }
  if (signal.aborted) return;
  const pending = manifest.images.filter(image => (image.status === 'pending' || image.status === 'failed') && image.retryAt <= now());
  let capped = false;
  const positions = new Map(manifest.images.map((image, index) => [image.key, index]));
  const cappedAt = manifest.images.findIndex(image => image.status === 'skipped_cap');
  for (let offset = 0; offset < pending.length && !signal.aborted; offset += 2) {
    const batch = pending.slice(offset, offset + 2);
    // A temporary file is never published in the manifest. Interrupted .part
    // files are removed on the next attempt before downloading again.
    const downloaded = await Promise.all(batch.map(async image => {
      const temp = `${directory}${image.key}-${expected.generation}.part`;
      try {
        if (capped || (cappedAt >= 0 && (positions.get(image.key) ?? -1) >= cappedAt)) return { image, temp, bytes: 0, capped: true };
        const section = data.sections.find(s => s.sectionId === image.sectionId);
        const download: StudyImageDownload = { uri: '', kind: image.kind, reviewerTitle: detail.artifact.title, sectionTitle: image.sectionId };
        let refreshUri: (() => Promise<string>) | undefined;
        if (image.kind === 'figure') refreshUri = () => refreshFigureUri(client, apiId, image.sectionId, image.sourceRef);
        else if (image.kind === 'page_snapshot' && section?.snapshot.available && 'url' in section.snapshot) {
          const snapshot = section.snapshot;
          // Legacy snapshots without an image id are bound to the same section/page.
          refreshUri = snapshot.id ? () => refreshSnapshotUri(client, apiId, image.sectionId, snapshot) : async () => {
            const fresh = await readPageSnapshot(client, apiId, image.sectionId, false, signal);
            if (!fresh.available || !('url' in fresh) || fresh.page !== snapshot.page || fresh.labelKind !== snapshot.labelKind) throw new Error('snapshot_unavailable');
            return fresh.url;
          };
        } else if (image.kind === 'external_visual' && section?.external?.id === image.sourceRef) {
          download.uri = section.external.image; download.headers = EXTERNAL_IMAGE_HEADERS;
        } else throw new Error('image_unavailable');
        await files.makeDirectoryAsync(directory, { intermediates: true });
        await files.deleteAsync(temp, { idempotent: true });
        const result = await downloadStudyImage(files, download, temp, refreshUri, true);
        return { image, temp, bytes: result.bytes, mime: result.mime };
      } catch (error: unknown) { return { image, temp, bytes: 0, failure: safeCode(error) }; }
    }));
    for (const result of downloaded) {
      let unpublished: string | null = null;
      try {
        await withOfflineImageLock(async () => {
          const current = await store.readImageManifest(owner, artifact);
          if (signal.aborted || !sameGeneration(current, expected)) return;
          const image = current.images.find(i => i.key === result.image.key);
          if (!image || image.status === 'stored') return;
          const reviewerBytes = current.images.reduce((sum, i) => sum + i.bytes, 0);
          capped ||= !!result.capped || reviewerBytes + result.bytes > (input.reviewerCap ?? REVIEWER_IMAGE_CAP) ||
            await store.imageCacheBytes() + result.bytes > (input.totalCap ?? TOTAL_IMAGE_CAP);
          image.attempts++;
          if (capped) image.status = 'skipped_cap';
          else if (result.failure) { image.status = 'failed'; image.failure = result.failure; image.retryAt = now() + backoff(image.attempts); }
          else {
            const extensions: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
            const extension = extensions[('mime' in result ? result.mime : '')?.split(';')[0]?.toLowerCase() ?? ''] ?? 'img';
            const local = `${directory}${image.key}.${extension}`;
            unpublished = local;
            await files.deleteAsync(local, { idempotent: true });
            await files.moveAsync({ from: result.temp, to: local });
            Object.assign(image, { status: 'stored', localPath: local, bytes: result.bytes, failure: undefined, retryAt: 0 });
          }
          if (await store.saveImageManifest(owner, artifact, current)) unpublished = null;
        });
      } catch { // A move/write failure remains retryable; no partial file is rendered.
        await withOfflineImageLock(async () => {
          const current = await store.readImageManifest(owner, artifact);
          if (!sameGeneration(current, expected)) return;
          const image = current.images.find(i => i.key === result.image.key);
          if (image) Object.assign(image, { status: 'failed', localPath: null, bytes: 0, failure: 'download', retryAt: now() + backoff(image.attempts) });
          await store.saveImageManifest(owner, artifact, current);
        });
      } finally {
        if (unpublished) await files.deleteAsync(unpublished, { idempotent: true }).catch(() => {});
        await files.deleteAsync(result.temp, { idempotent: true }).catch(() => {});
      }
    }
  }
}
