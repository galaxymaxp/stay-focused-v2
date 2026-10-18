export interface AvatarInput {
  uploadedUrl?: string | null;
  userMetadata?: Readonly<Record<string, unknown>> | null;
  email?: string | null;
}

export function avatarHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

/** Metadata supplies display content only, never authorization. */
export function resolveAvatar({ uploadedUrl, userMetadata, email }: AvatarInput): {
  kind: 'uploaded' | 'provider' | 'initials'; url?: string; initial: string;
} {
  const initial = Array.from(email?.trim() ?? '')[0]?.toLocaleUpperCase() || '·';
  const uploaded = avatarHttpsUrl(uploadedUrl);
  if (uploaded) return { kind: 'uploaded', url: uploaded, initial };
  const provider = avatarHttpsUrl(userMetadata?.avatar_url) ?? avatarHttpsUrl(userMetadata?.picture);
  return provider ? { kind: 'provider', url: provider, initial } : { kind: 'initials', initial };
}

export interface ProfileAvatar { url: string | null; expiresAt: string | null }
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
