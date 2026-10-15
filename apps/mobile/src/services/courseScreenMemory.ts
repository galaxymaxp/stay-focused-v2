import type { LearningMaterial } from "@stay-focused/shared";

export const openedMaterials = new Map<string, LearningMaterial>();
export const openedMaterialOffsets = new Map<string, number>();
export const pendingPreparations = new Map<string, Promise<LearningMaterial | null>>();

export function purgeCourseScreenMemory(owner: string): void {
  const prefix = `${owner}:`;
  for (const map of [openedMaterials, openedMaterialOffsets, pendingPreparations]) {
    for (const key of map.keys()) if (key.startsWith(prefix)) map.delete(key);
  }
}
