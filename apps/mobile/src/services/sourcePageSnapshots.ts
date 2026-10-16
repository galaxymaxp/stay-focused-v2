import { experienceRequest, type ExperienceClient } from './experienceApi';

export type PageSnapshot = (
  | { available: false; reason: string; page?: number }
  | { available: true; status: 'rendering' | 'unrendered'; page: number }
  | { available: true; id?: string; url: string; page: number; width: number; height: number; sourceLabel: string }) & { labelKind?: 'slide' };

export async function readPageSnapshot(client: ExperienceClient, artifactId: string, sectionId: string,
  render: boolean, signal?: AbortSignal): Promise<PageSnapshot> {
  const value: unknown = await experienceRequest(client,
    `/api/reviewers/${encodeURIComponent(artifactId)}/sections/${encodeURIComponent(sectionId)}/snapshot${render ? '' : '?render=0'}`, { signal });
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('snapshot_invalid');
  const data = value as Record<string, unknown>;
  if (data.labelKind !== undefined && data.labelKind !== 'slide') throw new Error('snapshot_invalid');
  const label = data.labelKind === 'slide' ? { labelKind: 'slide' as const } : {};
  if (data.available === false && typeof data.reason === 'string') {
    if (data.page !== undefined && (typeof data.page !== 'number' || !Number.isSafeInteger(data.page) || data.page < 1 || data.page > 100))
      throw new Error('snapshot_invalid');
    return { available: false, reason: data.reason, ...(typeof data.page === 'number' ? { page: data.page } : {}) };
  }
  if (data.available !== true || typeof data.page !== 'number' || !Number.isSafeInteger(data.page) || data.page < 1 || data.page > 100)
    throw new Error('snapshot_invalid');
  if (data.status === 'rendering' || data.status === 'unrendered') return { available: true, status: data.status, page: data.page, ...label };
  if (typeof data.url !== 'string' || !data.url.startsWith('https://') || typeof data.sourceLabel !== 'string' ||
      data.sourceLabel.length > 500 || typeof data.width !== 'number' || typeof data.height !== 'number' ||
      !Number.isSafeInteger(data.width) || !Number.isSafeInteger(data.height) || data.width <= 0 || data.width > 1400 ||
      data.height <= 0 || data.height > 10000) throw new Error('snapshot_invalid');
  return { available: true, ...(typeof data.id === 'string' && /^[0-9a-f-]{36}$/i.test(data.id) ? {id:data.id} : {}), url: data.url, page: data.page, width: data.width, height: data.height, sourceLabel: data.sourceLabel, ...label };
}

export function clampPageZoom(scale: number): number { return Math.min(4, Math.max(1, scale)); }
export function clampPagePan(offset: number, dimension: number, scale: number): number {
  const limit = dimension * (scale - 1) / 2;
  return Math.min(limit, Math.max(-limit, offset));
}
