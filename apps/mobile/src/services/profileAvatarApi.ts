import { AVATAR_MAX_BYTES, parseProfileAvatar, type ProfileAvatar } from '@stay-focused/shared';
import { requireApiBaseUrl } from '../config/apiBaseUrlResolution';

export async function profileAvatarRequest(input: {
  baseUrl: string; accessToken: string; method?: 'GET' | 'PUT' | 'DELETE';
  photo?: { uri: string; mimeType: string; file?: Blob };
}, fetcher: typeof fetch = fetch): Promise<ProfileAvatar> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const baseUrl = requireApiBaseUrl(input.baseUrl);
    if (!input.accessToken) throw new Error('sign_in_required');
    let bytes: Uint8Array | undefined;
    if (input.photo) {
      if (input.photo.file) {
        if (input.photo.file.size > AVATAR_MAX_BYTES) throw new Error('Choose a photo under 2 MB.');
        bytes = new Uint8Array(await input.photo.file.arrayBuffer());
      } else {
        if (!/^(file|content):\/\//.test(input.photo.uri)) throw new Error('invalid_local_photo');
        const { File } = await import('expo-file-system');
        const file = new File(input.photo.uri);
        if (file.size > AVATAR_MAX_BYTES) throw new Error('Choose a photo under 2 MB.');
        bytes = await file.bytes();
      }
      if (bytes.byteLength > AVATAR_MAX_BYTES) throw new Error('Choose a photo under 2 MB.');
    }
    const response = await fetcher(`${baseUrl}/api/profile/avatar`, {
      method: input.method ?? 'GET', headers: { Authorization: `Bearer ${input.accessToken}`,
        ...(input.photo ? { 'Content-Type': input.photo.mimeType } : {}) },
      ...(bytes ? { body: bytes as Uint8Array<ArrayBuffer> } : {}), signal: controller.signal,
    });
    const value: unknown = await response.json();
    if (!response.ok || !value || typeof value !== 'object' || !('ok' in value) || value.ok !== true || !('data' in value)) {
      throw new Error(response.status === 413 ? 'Choose a photo under 2 MB.' : response.status === 415 ? 'Choose a JPEG, PNG or WebP photo.' : 'Could not update your photo. Check your connection and try again.');
    }
    return parseProfileAvatar(value.data);
  } finally { clearTimeout(timeout); }
}
