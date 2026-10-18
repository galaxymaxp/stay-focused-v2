import { describe, expect, it } from 'vitest';
import { compareInstalled, parseReleaseBody, parseReleaseTag, shouldCheck, toLatestRelease, type LatestRelease } from './app-release';

const github = {
  tag_name: 'v2.3.0+7', name: 'Stay Focused 2.3.0', body: 'versionCode: 7\nruntime: native-7\n\nCalmer study days.',
  html_url: 'https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.3.0+7',
  published_at: '2026-10-19T00:00:00Z',
  assets: [{ name: 'app.apk', browser_download_url: 'https://github.com/galaxymaxp/stay-focused-releases/releases/download/v2.3.0+7/app.apk' }],
};
const latest = toLatestRelease(github)!;
describe('public release metadata', () => {
  it('parses whitespace, optional lines and plain notes', () => {
    expect(parseReleaseBody('  versionCode : 7  \r\n runtime: native-7 \r\nminSupported: 6\r\n\r\nNotes')).toEqual({ versionCode: 7, runtimeVersion: 'native-7', minSupportedVersionCode: 6, notes: 'Notes' });
    expect(parseReleaseBody('Notes')).toEqual({ versionCode: null, runtimeVersion: null, minSupportedVersionCode: null, notes: 'Notes' });
    expect(parseReleaseBody('versionCode: 3.5\nminSupported: -1').versionCode).toBeNull();
    expect(parseReleaseBody('versionCode: 7\nruntime: \n\nNotes').runtimeVersion).toBeNull();
  });
  it('parses tags and rejects invalid codes', () => {
    expect(parseReleaseTag(' v2.3.0+7 ')).toEqual({ versionName: '2.3.0', versionCode: 7 });
    for (const tag of ['2.3.0', 'v2.3.0+0', 'v2.3.0+9007199254740992']) expect(parseReleaseTag(tag)).toBeNull();
  });
  it('maps first APK, falls back to name and handles missing runtime', () => {
    expect(latest).toMatchObject({ versionName: '2.3.0', versionCode: 7, minSupportedVersionCode: null, notes: 'Calmer study days.' });
    expect(toLatestRelease({ ...github, tag_name: 'release', body: 'versionCode: 7' })).toMatchObject({ versionName: github.name, runtimeVersion: null });
  });
  it('rejects missing APK, unsafe URLs and inconsistent metadata', () => {
    for (const patch of [{ assets: [] }, { html_url: 'javascript:alert(1)' }, { draft: true }, { prerelease: true }, { body: 'versionCode: 8' }, { published_at: 'bad' }, { body: 'versionCode: 7\nminSupported: 8' }]) expect(toLatestRelease({ ...github, ...patch })).toBeNull();
  });
  it.each<[number, string | null, Partial<LatestRelease>, string]>([
    [6, 'native-7', {}, 'up-to-date'], [6, 'native-6', {}, 'update-available'],
    [6, null, {}, 'update-available'], [6, 'native-6', { runtimeVersion: null }, 'update-available'],
    [6, 'native-7', { minSupportedVersionCode: 7 }, 'unsupported'],
    [7, 'native-6', {}, 'up-to-date'], [8, 'native-6', {}, 'up-to-date'],
  ])('compares installed code %s runtime %s', (versionCode, runtimeVersion, patch, expected) => {
    expect(compareInstalled({ installed: { versionCode, runtimeVersion }, latest: { ...latest, ...patch } })).toBe(expected);
  });
  it('throttles for twelve hours and recovers from clock changes', () => {
    expect(shouldCheck(null, 1)).toBe(true);
    expect(shouldCheck(1, 2)).toBe(false);
    expect(shouldCheck(1, 1 + 12 * 3600000)).toBe(true);
    expect(shouldCheck(10, 1)).toBe(true);
  });
});
