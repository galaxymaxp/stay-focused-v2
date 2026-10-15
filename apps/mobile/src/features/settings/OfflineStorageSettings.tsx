import { useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useIsFocused } from 'expo-router/react-navigation';

import { useAuth } from '../../auth';
import { Action, Copy, Notice, Surface } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { spacing } from '../../design/tokens';
import type { OfflineStats } from '../../services/localLibrary/artifactStore';
import { getLocalArtifactStore } from '../../services/localLibrary/localArtifactDatabase';
import { runOfflineCatchUp, stopOfflineCatchUp, subscribeOfflineLibrary } from '../../services/localLibrary/offlineCatchUp';
import { useExperienceClient } from '../redesign/useExperience';

export function offlineStorageSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;
}

export function OfflineStorageSettings() {
  return Platform.OS === 'web' ? null : <DeviceOfflineStorage />;
}

function DeviceOfflineStorage() {
  const { session } = useAuth();
  const owner = session?.user.id;
  const client = useExperienceClient();
  const focused = useIsFocused();
  const { active } = useTheme();
  const [stats, setStats] = useState<OfflineStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  const working = useRef(false);
  const confirming = useRef(false);

  useEffect(() => {
    const current = ++generation.current;
    setStats(null); setBusy(false); setCleared(false); setError(null);
    working.current = false; confirming.current = false;
    if (!owner || !focused || !active) return;
    const refresh = async () => {
      const store = await getLocalArtifactStore();
      const next = store ? await store.offlineStats(owner) : null;
      if (generation.current === current) setStats(next);
    };
    void refresh().catch(() => { if (generation.current === current) setError('Could not read device storage.'); });
    const unsubscribe = subscribeOfflineLibrary(owner, () => { void refresh().catch(() => undefined); });
    return () => { generation.current += 1; unsubscribe(); };
  }, [owner, focused, active]);

  async function clear(current: number) {
    if (!owner || generation.current !== current || working.current) return;
    confirming.current = false; working.current = true; setBusy(true); setError(null);
    try {
      await stopOfflineCatchUp(owner);
      const store = await getLocalArtifactStore();
      if (!store || generation.current !== current) return;
      await store.clearBodies(owner);
      const next = await store.offlineStats(owner);
      if (generation.current === current) { setStats(next); setCleared(true); }
    } catch {
      if (generation.current === current) setError('Could not remove device copies. Try again.');
    } finally {
      if (generation.current === current) { working.current = false; setBusy(false); }
    }
  }
  function confirm() {
    if (working.current || confirming.current) return;
    confirming.current = true;
    const current = generation.current;
    Alert.alert('Remove saved copies from this device?',
      "Your Library stays in your account and items save again the next time you're online. Unsynced quiz answers are kept.", [
        { text: 'Cancel', style: 'cancel', onPress: () => { confirming.current = false; } },
        { text: 'Remove device copies', style: 'destructive', onPress: () => void clear(current) },
      ], { cancelable: true, onDismiss: () => { confirming.current = false; } });
  }
  async function saveAgain() {
    if (!owner || working.current) return;
    const current = generation.current;
    working.current = true; setBusy(true); setError(null);
    try {
      const outcome = await runOfflineCatchUp(owner, client, { force: true });
      const store = await getLocalArtifactStore();
      const next = store ? await store.offlineStats(owner) : null;
      if (generation.current === current) {
        setStats(next);
        if (outcome.errorCode) setError(outcome.errorCode === 'connection'
          ? 'Connect to save your Library on this device.' : 'Could not save every item yet. Try again.');
        else if (next && next.current === next.total) setCleared(false);
      }
    } catch {
      if (generation.current === current) setError("Could not read device storage. Try again.");
    } finally {
      if (generation.current === current) { working.current = false; setBusy(false); }
    }
  }
  if (!stats) return null;
  return (
    <View style={{ gap: spacing[2] }}>
      <Copy muted size="caption" style={{ fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>Offline storage</Copy>
      <Surface style={{ gap: spacing[2] }}>
        <Copy>{stats.current} of {stats.total} items saved on this device · about {offlineStorageSize(stats.approximateBytes)}</Copy>
        <Action secondary disabled={busy} onPress={confirm}>Remove device copies</Action>
        {cleared ? <Action secondary disabled={busy} onPress={() => void saveAgain()}>Save again now</Action> : null}
        {busy ? <Copy muted size="caption">Updating device copies…</Copy> : null}
        {error ? <Notice>{error}</Notice> : null}
      </Surface>
    </View>
  );
}
