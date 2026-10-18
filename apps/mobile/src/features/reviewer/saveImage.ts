import { downloadStudyImage, ImageFileError } from '../../services/studyImageFile';
import { Linking, Platform } from 'react-native';
import { studyImageFilename, type StudyImageDownload } from '@stay-focused/shared';

export type SaveImageResult =
  | { status: 'saved'; message: string }
  | { status: 'denied'; stage: 'permission'; message: string; openSettings: () => Promise<void> }
  | { status: 'failed'; stage: SaveImageStage; message: string };

export type SaveImageStage = 'permission' | 'download' | `download_http_${number}` | 'not_image' | 'empty' | 'media_write' | 'module_missing';

function failure(stage: SaveImageStage): Extract<SaveImageResult, { status: 'failed' }> {
  console.warn('reviewer.save_image_failed', { stage });
  return { status: 'failed', stage, message: stage === 'module_missing' ? 'Update the app to save images'
    : stage === 'media_write' ? "Couldn't write to your gallery"
    : stage === 'permission' ? 'Allow photo access in settings to save study images.' : "Couldn't download the image" };
}

function missingModule(error: unknown): boolean {
  // Classify locally; never send native errors (which can contain private URLs) to logs.
  return error instanceof Error && (/cannot find native module|cannot find module|native module.*(missing|not found)/i.test(error.message)
    || ('code' in error && error.code === 'ERR_UNAVAILABLE'));
}

/** Native modules load only on a deliberate save, so older APKs can still read. */
export async function saveImage(image: StudyImageDownload, refreshUri?: () => Promise<string>): Promise<SaveImageResult> {
  let cleanup: (() => Promise<void>) | undefined;
  let stage: SaveImageStage = 'module_missing';
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('native_only');
    const media = await import('expo-media-library/legacy');
    stage = 'permission';
    const permission = await media.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) {
      console.warn('reviewer.save_image_failed', { stage });
      return {
        status: 'denied', stage, message: 'Allow photo access in settings to save study images.',
        openSettings: () => Linking.openSettings(),
      };
    }
    stage = 'module_missing';
    const files = await import('expo-file-system/legacy');
    stage = 'download';
    if (!files.cacheDirectory) throw new Error('no_cache');
    // Owner reads mint fresh signed URLs; do not fall back to expired or changed source evidence.
    // A private per-operation directory prevents collisions and keeps the original untouched.
    const directory = `${files.cacheDirectory}study-image-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    cleanup = () => files.deleteAsync(directory, { idempotent: true });
    await files.makeDirectoryAsync(directory, { intermediates: true });
    let uri = directory + studyImageFilename(image);
    const { mime } = await downloadStudyImage(files, image, uri, refreshUri);
    const named = directory + studyImageFilename(image, mime);
    if (named !== uri) { await files.moveAsync({ from: uri, to: named }); uri = named; }
    stage = 'media_write';
    if (Platform.OS === 'ios') {
      // Album queries require full read access on iOS; add-only never touches them.
      await media.saveToLibraryAsync(uri);
    } else {
      // Native createAlbumWithInitialFileUri reuses the named directory. Unlike
      // getAlbumAsync, this path needs only write permission, even on Android 13+.
      await media.createAlbumAsync('Stay Focused', undefined, false, uri);
    }
    const destination = Platform.OS === 'android' ? 'Saved to Stay Focused.' : 'Saved to your photos.';
    return { status: 'saved', message: image.attribution ? `${destination}\n${image.attribution}` : destination };
  } catch (error: unknown) {
    return failure(missingModule(error) ? 'module_missing' : error instanceof ImageFileError ? error.stage : stage);
  } finally {
    await cleanup?.().catch(() => {});
  }
}
