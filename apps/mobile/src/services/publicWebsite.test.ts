import { afterEach, expect, it, vi } from 'vitest';
import { appDownloadUrl } from './publicWebsite';

afterEach(() => vi.unstubAllEnvs());
it('uses the existing website origin, independently of API configuration', () => {
  vi.stubEnv('EXPO_PUBLIC_WEBSITE_URL', 'https://website.test/');
  expect(appDownloadUrl()).toBe('https://website.test/download');
});
it('uses the existing production website default when no override exists', () => {
  vi.stubEnv('EXPO_PUBLIC_WEBSITE_URL', undefined);
  expect(appDownloadUrl()).toBe('https://stay-focused-ten.vercel.app/download');
});
it.each(['http://unsafe.test', 'https://user:password@site.test', 'https://site.test/private', 'invalid'])('falls back to public releases for invalid origin %s', origin => {
  vi.stubEnv('EXPO_PUBLIC_WEBSITE_URL', origin);
  expect(appDownloadUrl()).toBe('https://github.com/galaxymaxp/stay-focused-releases/releases/latest');
});
