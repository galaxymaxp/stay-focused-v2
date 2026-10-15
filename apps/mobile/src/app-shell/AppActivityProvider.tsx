import { useMemo, type ReactNode } from "react";
import { AppActivityContext } from "../design/appActivity";
import { useCanvasSync } from "../features/sync/CanvasSyncProvider";
import {
  QueueItemsContext,
  useQueueSource,
} from "../features/queue/useQueueItems";

export function AppActivityProvider({ children }: { children: ReactNode }) {
  const queue = useQueueSource();
  const { snapshot } = useCanvasSync();
  const syncing = snapshot.phase === "syncing";
  const { generating, queued, refresh } = queue;
  const active = syncing || generating + queued > 0;
  const value = useMemo(
    () => ({ active, syncing, generating, queued, refresh }),
    [active, syncing, generating, queued, refresh],
  );
  return (
    <QueueItemsContext.Provider value={queue}>
      <AppActivityContext.Provider value={value}>
        {children}
      </AppActivityContext.Provider>
    </QueueItemsContext.Provider>
  );
}
