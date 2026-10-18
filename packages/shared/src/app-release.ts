/** Public Android release metadata. No account or private source data belongs here. */
export interface LatestRelease {
  versionName: string;
  versionCode: number;
  runtimeVersion: string | null;
  apkUrl: string;
  releaseUrl: string;
  notes: string;
  publishedAt: string;
  minSupportedVersionCode: number | null;
}

const positiveInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function parseReleaseTag(tag: string): { versionName: string; versionCode: number } | null {
  const match = /^v([^\s+]+)\+(\d+)$/.exec(tag.trim());
  const versionCode = Number(match?.[2]);
  return match && positiveInteger(versionCode) ? { versionName: match[1]!, versionCode } : null;
}

export function parseReleaseBody(body: string) {
  const read = (key: string) => body.match(new RegExp(`^[ \\t]*${key}[ \\t]*:[ \\t]*([^\\r\\n]*)$`, 'im'))?.[1]?.trim();
  const integer = (value: string | undefined) => value && /^\d+$/.test(value) && positiveInteger(Number(value)) ? Number(value) : null;
  return {
    versionCode: integer(read('versionCode')),
    runtimeVersion: read('runtime') || null,
    minSupportedVersionCode: integer(read('minSupported')),
    notes: body.split(/\r?\n/).filter(line => !/^\s*(versionCode|runtime|minSupported)\s*:/i.test(line)).join('\n').trim(),
  };
}

function releaseUrl(value: unknown, apk = false): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 'github.com' && !url.username && !url.password && !url.port &&
      url.pathname.startsWith('/galaxymaxp/stay-focused-releases/releases/') &&
      (!apk || url.pathname.toLowerCase().endsWith('.apk'));
  } catch { return false; }
}

export function isLatestRelease(value: unknown): value is LatestRelease {
  return record(value) && typeof value.versionName === 'string' && value.versionName.trim().length > 0 &&
    positiveInteger(value.versionCode) && (value.runtimeVersion === null || (typeof value.runtimeVersion === 'string' && value.runtimeVersion.trim().length > 0)) &&
    releaseUrl(value.apkUrl, true) && releaseUrl(value.releaseUrl) && typeof value.notes === 'string' &&
    typeof value.publishedAt === 'string' && Number.isFinite(Date.parse(value.publishedAt)) &&
    (value.minSupportedVersionCode === null || (positiveInteger(value.minSupportedVersionCode) && value.minSupportedVersionCode <= value.versionCode));
}

export function toLatestRelease(githubJson: unknown): LatestRelease | null {
  if (!record(githubJson) || githubJson.draft === true || githubJson.prerelease === true) return null;
  const tag = parseReleaseTag(typeof githubJson.tag_name === 'string' ? githubJson.tag_name : '');
  const body = parseReleaseBody(typeof githubJson.body === 'string' ? githubJson.body : '');
  // Conflicting publication metadata must never gate an installed app.
  if (tag && body.versionCode !== null && tag.versionCode !== body.versionCode) return null;
  const asset = Array.isArray(githubJson.assets) ? githubJson.assets.find((item: unknown) =>
    record(item) && typeof item.name === 'string' && item.name.toLowerCase().endsWith('.apk')) : undefined;
  const result = {
    versionName: tag?.versionName ?? githubJson.name,
    versionCode: body.versionCode ?? tag?.versionCode,
    runtimeVersion: body.runtimeVersion,
    apkUrl: record(asset) ? asset.browser_download_url : undefined,
    releaseUrl: githubJson.html_url,
    notes: body.notes,
    publishedAt: githubJson.published_at,
    minSupportedVersionCode: body.minSupportedVersionCode,
  };
  return isLatestRelease(result) ? result : null;
}

export function compareInstalled({ installed, latest }: {
  installed: { versionCode: number; runtimeVersion: string | null };
  latest: LatestRelease;
}): 'up-to-date' | 'update-available' | 'unsupported' {
  if (latest.minSupportedVersionCode !== null && installed.versionCode < latest.minSupportedVersionCode) return 'unsupported';
  return latest.versionCode > installed.versionCode &&
    (!installed.runtimeVersion || !latest.runtimeVersion || installed.runtimeVersion !== latest.runtimeVersion)
    ? 'update-available' : 'up-to-date';
}

export function shouldCheck(lastCheckedAt: number | null, now: number, intervalMs = 12 * 60 * 60 * 1000): boolean {
  return lastCheckedAt === null || !Number.isFinite(lastCheckedAt) || now < lastCheckedAt || now - lastCheckedAt >= intervalMs;
}
