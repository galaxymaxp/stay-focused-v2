"use client";
import { useEffect, useState } from "react";
import type { CourseMaterials, LearningMaterial } from "@stay-focused/shared";
import { useAuth } from "../components/providers";
import { readScreenSnapshot, snapshotEpoch, writeScreenSnapshot } from "./screen-snapshots";
import { courseSequence, type LibraryCourseSequence } from "../app-model/librarySorting";
import type { Api } from "./api";

/** A partial/failed inventory must never replace the saved complete order. */
export async function loadCourseMaterials(api: Api, courseId: string): Promise<LearningMaterial[]> {
  const items: LearningMaterial[] = [], seen = new Set<number>();
  let offset: number | null = 0;
  while (offset !== null) {
    if (seen.has(offset)) throw new Error("Could not load every material. Refresh and try again.");
    seen.add(offset);
    const page: CourseMaterials = await api(`/api/experience/courses/${encodeURIComponent(courseId)}/materials?offset=${offset}`);
    items.push(...page.items);
    offset = page.nextOffset;
  }
  return [...new Map(items.map(item => [item.id, item])).values()];
}

export function useLibraryCourseSequence(courseId: string, enabled: boolean) {
  const { session, api } = useAuth(), owner = session?.user.id ?? "";
  const identity = `${owner}:${courseId}`;
  const [state, setState] = useState<{ identity: string; data: LibraryCourseSequence | null; loading: boolean; error: boolean }>({ identity, data: null, loading: false, error: false });
  useEffect(() => {
    if (!enabled || !owner || !courseId) return;
    let live = true;
    const key = `library-course-order:v1:${courseId}`, epoch = snapshotEpoch(owner);
    void (async () => {
      const saved = await readScreenSnapshot<LibraryCourseSequence>(owner, key);
      if (!live) return;
      setState({ identity, data: saved?.data ?? null, loading: true, error: false });
      try {
        const data = courseSequence(await loadCourseMaterials(api, courseId));
        if (!live || snapshotEpoch(owner) !== epoch) return;
        await writeScreenSnapshot(owner, key, data, epoch);
        if (live) setState({ identity, data, loading: false, error: false });
      } catch { if (live) setState(old => ({ ...old, loading: false, error: true })); }
    })();
    return () => { live = false; };
  }, [owner, courseId, enabled, api, identity]);
  return state.identity === identity ? state : { identity, data: null, loading: false, error: false };
}
