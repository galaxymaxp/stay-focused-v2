import { View } from 'react-native';
import { useAuth } from '../../auth';
import { Action, Copy, Sheet, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { appUpdateStore, downloadAppUpdate, useAppUpdate } from '../../services/useAppUpdate';

export function AppUpdateBanner() {
  const update = useAppUpdate();
  const { session } = useAuth();
  if (session?.offline || !update.banner || !update.latest) return null;
  const latest = update.latest;
  return (
    <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], paddingVertical: 0 }}>
      <Copy size="caption" numberOfLines={1} style={{ flex: 1 }}>Update available · {latest.versionName}</Copy>
      <Action secondary onPress={() => downloadAppUpdate(latest.apkUrl)}>Download</Action>
      <Action secondary label="Dismiss update" onPress={() => { void appUpdateStore.dismiss(latest.versionCode); }}>×</Action>
    </Surface>
  );
}

/** Mounted once in the app lifecycle, so the banner and required sheet never compete. */
export function AppUpdateRequired() {
  const update = useAppUpdate();
  const { session } = useAuth();
  if (session?.offline || !update.unsupported || !update.latest) return null;
  const latest = update.latest;
  return (
    <Sheet title="Update required" dismissible={false} onClose={() => {}}>
      <View style={{ gap: spacing[3] }}>
        <Copy>This version can no longer get updates. Download {latest.versionName}.</Copy>
        <Action onPress={() => downloadAppUpdate(latest.apkUrl)}>Download {latest.versionName}</Action>
      </View>
    </Sheet>
  );
}
