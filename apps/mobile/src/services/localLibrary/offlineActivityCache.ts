import type { ActivityDetail, ActivitySummary } from "@stay-focused/shared";

import { getLocalArtifactStore } from "./localArtifactDatabase";

export interface OfflineExperienceCache<T> {
  read(ownerUserId: string, path: string): Promise<T | null>;
  write(ownerUserId: string, data: T): Promise<void>;
}

export const activitySummariesOfflineCache: OfflineExperienceCache<{ items: ActivitySummary[] }> = {
  async read(ownerUserId) {
    const items = await (await getLocalArtifactStore())?.readActivitySummaries(ownerUserId);
    return items ? { items } : null;
  },
  async write(ownerUserId, data) {
    await (await getLocalArtifactStore())?.saveActivitySummaries(ownerUserId, data.items);
  },
};

export const activityDetailOfflineCache: OfflineExperienceCache<ActivityDetail> = {
  async read(ownerUserId, path) {
    const match = path.match(/\/api\/experience\/activities\/([^/?]+)$/);
    if (!match) return null;
    let activityId: string;
    try { activityId = decodeURIComponent(match[1]!); } catch { return null; }
    return (await getLocalArtifactStore())?.readActivityDetail(ownerUserId, activityId) ?? null;
  },
  async write(ownerUserId, data) {
    await (await getLocalArtifactStore())?.saveActivityDetail(ownerUserId, data);
  },
};
