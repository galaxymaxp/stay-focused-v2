import { stableSavedList } from "@stay-focused/shared";
import { useRef } from "react";
import { useAuth } from "../../auth";

/** Apply explicit pin/filter controls after this; server refreshes keep group positions. */
export function useStableSnapshotGroups<T extends { readonly key: string }>(items: readonly T[]): T[] {
  const { session } = useAuth(), owner = session?.user.id ?? "";
  const previous = useRef<{ owner: string; items: readonly T[] }>({ owner, items: [] });
  const result = stableSavedList(previous.current.owner === owner ? previous.current.items : [], items, item => item.key);
  previous.current = { owner, items: result };
  return result;
}
