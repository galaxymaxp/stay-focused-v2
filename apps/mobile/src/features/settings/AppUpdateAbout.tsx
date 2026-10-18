import { useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../auth';
import { Action, Copy, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { appUpdateStore, installedApp, useAppUpdate } from '../../services/useAppUpdate';

export function AppUpdateAbout() {
  const update = useAppUpdate();
  const { session } = useAuth();
  const [checked, setChecked] = useState(false);
  const check = async () => {
    setChecked(false);
    setChecked(await appUpdateStore.check({ manual: true, offline: session?.offline }) === 'checked');
  };
  return (
    <Surface style={{ gap: spacing[3] }}>
      <Copy size="bodySmall">Version {installedApp.version} ({installedApp.versionCode}) · update {installedApp.update}</Copy>
      <Action secondary disabled={update.checking} onPress={() => { void check(); }}>{update.checking ? 'Checking…' : 'Check for updates'}</Action>
      <Copy muted size="caption">{update.lastCheckedAt === null ? 'Not checked yet' : `Last checked ${new Date(update.lastCheckedAt).toLocaleString()}`}</Copy>
      {checked && update.online && update.latest && update.status === 'up-to-date' ? <Copy muted size="bodySmall">You’re up to date.</Copy> : null}
      {update.latest && update.status !== 'up-to-date' && update.latest.notes ? (
        <View style={{ gap: spacing[2] }}>
          <Copy size="bodySmall" style={{ fontWeight: '600' }}>What’s new · {update.latest.versionName}</Copy>
          <Copy muted size="bodySmall">{update.latest.notes}</Copy>
        </View>
      ) : null}
    </Surface>
  );
}
