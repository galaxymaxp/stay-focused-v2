/** Shared browser destination, independent from the API origin. */
export function websiteOrigin(origin = process.env.EXPO_PUBLIC_WEBSITE_URL ?? 'https://stay-focused-ten.vercel.app'): string {
  const url = new URL(origin);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('invalid_website_origin');
  return url.origin;
}

export function appDownloadUrl(): string {
  try {
    return `${websiteOrigin()}/download`;
  } catch {
    return 'https://github.com/galaxymaxp/stay-focused-releases/releases/latest';
  }
}
