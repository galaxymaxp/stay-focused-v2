export interface StudyImageDownload {
  uri: string;
  reviewerTitle: string;
  sectionTitle: string;
  kind: 'page_snapshot' | 'figure' | 'external_visual';
  sourceTitle?: string;
  attribution?: string;
  headers?: Readonly<Record<string, string>>;
}

/** The same portable, bounded filename on the gallery and website. */
export function studyImageFilename(image: StudyImageDownload, mimeType?: string): string {
  const types: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
  const extension = types[mimeType?.split(';')[0]?.toLowerCase() ?? '']
    ?? image.uri.split(/[?#]/)[0]?.match(/\.(png|jpe?g|webp|gif|avif)$/i)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ?? 'png';
  const clean = (value: string) => value.normalize('NFKC').replace(/[\u0000-\u001f\u007f\\/:*?"<>|.]+/g, '-').replace(/\s+/g, ' ').trim().replace(/^[- ]+|[- ]+$/g, '').slice(0, 60).trim() || 'study';
  return [image.reviewerTitle, image.sectionTitle, ...(image.sourceTitle ? [image.sourceTitle] : []), image.kind].map(clean).join('-') + '.' + extension;
}
