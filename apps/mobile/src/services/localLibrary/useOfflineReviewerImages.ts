import { useEffect, useState } from 'react';
import { getLocalArtifactStore } from './localArtifactDatabase';
import { imagesNeedConnection, subscribeOfflineImages, type OfflineImageManifest } from './imageManifest';

export function useOfflineReviewerImages(owner: string | null, artifact: string, version: string) {
  const identity = `${owner}:${artifact}:${version}`;
  const [state, setState] = useState<{ identity: string; manifest: OfflineImageManifest | null } | null>(null);
  useEffect(() => {
    if (!owner) return;
    let live = true, read = 0;
    const refresh = async () => {
      const run = ++read;
      const store = await getLocalArtifactStore();
      const manifest = await store?.readImageManifest(owner, artifact) ?? null;
      if (live && run === read) setState({ identity, manifest: manifest?.version === version ? manifest : null });
    };
    const unsubscribe = subscribeOfflineImages(owner, () => { void refresh().catch(() => {}); });
    void refresh().catch(() => {});
    return () => { live = false; unsubscribe(); };
  }, [owner, artifact, version, identity]);
  const manifest = state?.identity === identity ? state.manifest : null;
  return { manifest, needsConnection: imagesNeedConnection(manifest) };
}
