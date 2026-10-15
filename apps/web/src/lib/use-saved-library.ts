"use client";
import { useCallback } from 'react';
import type { LibraryArtifactSummary, LibraryOverview } from '@stay-focused/shared';
import { useAuth } from '../components/providers';
import { useResource } from './hooks';

/** Show accepted pages immediately; persist only a complete successful walk. */
export function useSavedLibrary() {
  const { api } = useAuth();
  const load = useCallback(async (signal: AbortSignal, publish: (data: LibraryOverview) => void): Promise<LibraryOverview> => {
    const items = new Map<string, LibraryArtifactSummary>();
    const superseded = new Set<string>();
    let result: LibraryOverview | null = null;
    let offset: number | null = 0;
    for (let page = 0; offset !== null && page < 20; page++) {
      const previousOffset = offset;
      result = await api<LibraryOverview>(`/api/experience/library?limit=100&offset=${offset}`, { signal });
      if (signal.aborted) throw new Error('Library refresh cancelled.');
      result.items.forEach(item => items.set(item.id, item));
      result.supersededReviewerIds?.forEach(id => superseded.add(id));
      offset = result.nextOffset;
      if (offset !== null && offset <= previousOffset) throw new Error('Could not load the next Library page. Please try again.');
      const accepted = { ...result, items: [...items.values()].filter(item => item.status === 'completed' && !superseded.has(item.id)), supersededReviewerIds: [...superseded] };
      publish(accepted);
      result = accepted;
    }
    if (offset !== null || !result) throw new Error('The Library is larger than this view can load. Please try again.');
    return { ...result, nextOffset: null };
  }, [api]);
  const resource = useResource<LibraryOverview>('/api/experience/library?complete=1', 0, 'data', false, load);
  return { ...resource, items: resource.data?.items ?? [], categories: resource.data?.categories ?? null };
}
