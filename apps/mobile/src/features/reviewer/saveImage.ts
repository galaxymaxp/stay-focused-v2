import { Linking, Platform } from 'react-native';
import { studyImageFilename, type StudyImageDownload } from '@stay-focused/shared';

export type SaveImageResult =
  | { status: 'saved'; message: string }
  | { status: 'denied'; message: string; openSettings: () => Promise<void> }
  | { status: 'failed'; message: string };

/** Native modules load only on a deliberate save, so older APKs can still read. */
export async function saveImage(image: StudyImageDownload): Promise<SaveImageResult> {
  let cleanup: (() => Promise<void>) | undefined;
  try {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') throw new Error('native_only');
    const media = await import('expo-media-library/legacy');
    const permission = await media.requestPermissionsAsync(true, ['photo']);
    if (!permission.granted) return {
      status: 'denied', message: 'Allow photo access in settings to save study images.',
      openSettings: () => Linking.openSettings(),
    };
    const files = await import('expo-file-system/legacy');
    if (!files.cacheDirectory) throw new Error('no_cache');
    // A private per-operation directory prevents collisions and keeps the original untouched.
    const directory = `${files.cacheDirectory}study-image-${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    cleanup = () => files.deleteAsync(directory, { idempotent: true });
    await files.makeDirectoryAsync(directory, { intermediates: true });
    let uri = directory + studyImageFilename(image);
    if (/^https:\/\//i.test(image.uri)) {
      const downloaded = await files.downloadAsync(image.uri, uri, { headers: image.headers ? { ...image.headers } : undefined });
      if (downloaded.status < 200 || downloaded.status >= 300) throw new Error('download_failed');
      const mime = Object.entries(downloaded.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1];
      if (mime && !mime.toLowerCase().startsWith('image/')) throw new Error('not_image');
      const named = directory + studyImageFilename(image, mime);
      if (named !== uri) { await files.moveAsync({ from: uri, to: named }); uri = named; }
    } else if (image.uri.startsWith('file://')) {
      await files.copyAsync({ from: image.uri, to: uri });
    } else throw new Error('invalid_image');
    const info = await files.getInfoAsync(uri);
    if (!info.exists || info.isDirectory || info.size === 0) throw new Error('empty_image');
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
  } catch {
    return { status: 'failed', message: 'Could not save this image. Try again when connected and using the latest app.' };
  } finally {
    await cleanup?.().catch(() => {});
  }
}
