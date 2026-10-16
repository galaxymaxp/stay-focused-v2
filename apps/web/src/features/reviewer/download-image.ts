import { studyImageFilename, type StudyImageDownload } from '@stay-focused/shared';

/** Blob download preserves the filename for cross-origin signed/Wikimedia URLs. */
export async function downloadStudyImage(image: StudyImageDownload): Promise<void> {
  const response = await fetch(image.uri, { credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error('Image download failed');
  const blob = await response.blob();
  if (!blob.size || (blob.type && !blob.type.startsWith('image/'))) throw new Error('Image unavailable');
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url; anchor.download = studyImageFilename(image, blob.type);
    document.body.appendChild(anchor); anchor.click();
  } finally {
    anchor.remove();
    // Let the browser consume the click before releasing its object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
