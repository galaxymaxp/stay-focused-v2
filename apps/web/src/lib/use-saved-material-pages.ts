"use client";
import { mergeSavedData } from "@stay-focused/shared";
import type { CourseMaterials, LearningMaterial } from "@stay-focused/shared";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../components/providers";
import { snapshotEpoch as screenSnapshotEpoch, writeScreenSnapshot, listScreenSnapshots } from "./screen-snapshots";

/** Later pages retain their exact query/offset; an incomplete refresh keeps all saved pages. */
export function useSavedMaterialPages(courseId: string, firstNext: number | null, refreshedAt: string | null) {
  const { session, api } = useAuth(), owner = session?.user.id ?? "";
  const writeEpoch = screenSnapshotEpoch(owner);
  const identity = `${owner}:${courseId}`;
  const prefix = `/api/experience/courses/${encodeURIComponent(courseId)}/materials?offset=`;
  const [state, setState] = useState<{ identity: string; pages: ReadonlyMap<number, CourseMaterials>; error: string | null }>({ identity, pages: new Map(), error: null });
  const pages = state.identity === identity ? state.pages : new Map<number, CourseMaterials>();
  useEffect(() => {
    if (!owner || !courseId) return;
    let live = true;
    const controller = new AbortController(), epoch = screenSnapshotEpoch(owner);
    void (async () => {
      const cached = await listScreenSnapshots<CourseMaterials>(owner, "data:" + prefix);
      if (!live) return;
      const saved = new Map<number, CourseMaterials>();
      for (const snapshot of cached) {
        const offset = Number(snapshot.key.slice("data:".length + prefix.length));
        if (Number.isSafeInteger(offset) && offset > 0) saved.set(offset, snapshot.data);
      }
      setState(old => ({ identity, pages: old.identity === identity && old.pages.size ? old.pages : saved, error: null }));
      try {
        const fresh = new Map<number, CourseMaterials>();
        for (const offset of [...saved.keys()].sort((a, b) => a - b)) {
          const path = prefix + offset;
          const page = await api<CourseMaterials>(path, { signal: controller.signal });
          if (!live) return;
          fresh.set(offset, mergeSavedData(saved.get(offset) ?? null, page));
          await writeScreenSnapshot(owner, "data:" + path, page, epoch);
        }
        if (live && fresh.size) setState(old => ({ identity, pages: new Map([...(old.identity === identity ? old.pages : []), ...fresh]), error: null }));
      } catch { if (live) setState(old => ({ ...old, error: "Couldn't refresh saved materials." })); }
    })().catch(() => undefined);
    return () => { live = false; controller.abort(); };
  }, [owner, courseId, api, prefix, identity, refreshedAt]);

  const acceptPage = useCallback(async (offset: number, page: CourseMaterials) => {
    if (screenSnapshotEpoch(owner) !== writeEpoch) return;
    setState(old => ({ identity, pages: new Map(old.identity === identity ? old.pages : []).set(offset, page), error: null }));
    await writeScreenSnapshot(owner, "data:" + prefix + offset, page, writeEpoch);
  }, [owner, prefix, identity, writeEpoch]);
  const ordered = [...pages].sort(([a], [b]) => a - b);
  const items = [...new Map(ordered.flatMap(([, page]) => page.items).map(item => [item.id, item])).values()] as LearningMaterial[];
  return { items, nextOffset: ordered.length ? ordered[ordered.length - 1]![1].nextOffset : firstNext, acceptPage, error: state.identity === identity ? state.error : null };
}
