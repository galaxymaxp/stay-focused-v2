import { useEffect, useRef, useState } from 'react';
import { Pressable, Switch, View } from 'react-native';
import { useAuth } from '../../auth';
import { getApiBaseUrl } from '../../config/apiBaseUrl';
import { Copy, Notice, Surface } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { spacing } from '../../design/tokens';
import { getAutoReviewerPreference, setAutoReviewerPreference } from '../../services/autoReviewerPreferencesApi';

const ERROR = "Couldn't update this setting. Try again.";
export function AutoReviewerSettings() {
  const { session } = useAuth();
  const { colors } = useTheme();
  const userId = session?.user.id;
  const accessToken = session?.accessToken;
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const saving = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    setEnabled(null); setBusy(false); saving.current = false; setError(null);
    if (!userId || !accessToken) {
      setError('Sign in to load this setting.');
      return;
    }
    void getAutoReviewerPreference({ baseUrl: getApiBaseUrl() ?? '', accessToken }).then(value => {
      if (generation.current === current) setEnabled(value);
    }).catch(() => {
      if (generation.current === current) setError('Could not load this setting. Check your connection and retry.');
    });
    return () => { generation.current = current + 1; };
  }, [userId, accessToken, reload]);

  async function toggle(value: boolean) {
    if (saving.current || !accessToken || enabled === null) return;
    const current = generation.current;
    const previous = enabled;
    saving.current = true; setBusy(true); setError(null); setEnabled(value);
    try {
      const saved = await setAutoReviewerPreference({ baseUrl: getApiBaseUrl() ?? '', accessToken }, value);
      if (generation.current === current) setEnabled(saved);
    } catch {
      if (generation.current === current) { setEnabled(previous); setError(ERROR); }
    } finally {
      if (generation.current === current) { saving.current = false; setBusy(false); }
    }
  }
  return (
    <View style={{ gap: spacing[2] }}>
      <Copy muted size="caption" style={{ fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' }}>Canvas reviewers</Copy>
      <Surface style={{ gap: spacing[2] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, gap: spacing[3] }}>
          <Copy style={{ flex: 1 }}>Create reviewers automatically</Copy>
          <Switch accessibilityLabel="Create reviewers automatically" disabled={busy || enabled === null} value={enabled ?? false} onValueChange={value => void toggle(value)} trackColor={{ false: colors.surfaceSecondary, true: colors.success }} thumbColor={colors.onAccent} />
        </View>
        <Copy muted size="caption">When Canvas sync finds new lecture material, Stay Focused makes a reviewer for it. Turning this off keeps the reviewers you already have.</Copy>
        {enabled === null && !error ? <Copy muted>Loading your setting…</Copy> : null}
        {busy ? <Copy muted>Saving…</Copy> : null}
        {error ? <>
          <Notice>{error}</Notice>
          <Pressable accessibilityRole="button" accessibilityLabel="Retry automatic reviewer setting" disabled={busy} onPress={() => enabled === null ? setReload(value => value + 1) : void toggle(!enabled)} style={{ minHeight: 48, justifyContent: 'center' }}>
            <Copy color={colors.accent}>Try again</Copy>
          </Pressable>
        </> : null}
      </Surface>
    </View>
  );
}
