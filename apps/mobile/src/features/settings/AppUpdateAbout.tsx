import { useState } from 'react';
import { Share, View } from 'react-native';
import { useAuth } from '../../auth';
import { Action, Copy, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { appUpdateStore, installedApp, useAppUpdate } from '../../services/useAppUpdate';
import { appDownloadUrl } from '../../services/publicWebsite';

export function AppUpdateAbout() {
  const update = useAppUpdate();
  const { session } = useAuth();
  const [checked, setChecked] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const share = async () => {
    setShareFailed(false);
    try {
      await Share.share({ title: 'Download Stay Focused', message: appDownloadUrl() });
    } catch {
      setShareFailed(true);
    }
  };
  const check = async () => {
    setChecked(false);
    setChecked(await appUpdateStore.check({ manual: true, offline: session?.offline }) === 'checked');
  };
  return (
    <Surface style={{ gap: spacing[3] }}>
      <Copy size="bodySmall">Version {installedApp.version} ({installedApp.versionCode}) · update {installedApp.update}</Copy>
      <Action secondary disabled={update.checking} onPress={() => { void check(); }}>{update.checking ? 'Checking…' : 'Check for updates'}</Action>
      <Action secondary onPress={() => { void share(); }}>Share download link</Action>
      {shareFailed ? <Copy muted size="bodySmall">Could not open sharing. Please try again.</Copy> : null}
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
