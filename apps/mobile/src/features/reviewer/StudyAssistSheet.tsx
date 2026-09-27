import { ASSIST_LABELS, ASSIST_RESULT_LABELS, ASSIST_TYPES, type AssistSelection, type AssistType } from '@stay-focused/shared';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useAuth } from '../../auth';
import { getApiBaseUrl } from '../../config/apiBaseUrl';
import { Action, Copy, Notice, Sheet, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { studyAssist, StudyAssistError } from '../../services/studyAssist';

export function StudyAssistSheet({ selection, onClose }: { selection: AssistSelection | null; onClose: () => void }) {
  const { session } = useAuth();
  const [state, setState] = useState<{ type: AssistType | null; loading: boolean; text: string | null; error: string | null }>({ type: null, loading: false, text: null, error: null });
  const live = useRef(true);
  const busy = useRef(false);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  async function choose(type: AssistType) {
    if (!selection || busy.current) return;
    busy.current = true;
    setState({ type, loading: true, text: null, error: null });
    try {
      const result = await studyAssist.request(session?.user.id ?? '', {
        baseUrl: getApiBaseUrl() ?? '', accessToken: session?.accessToken ?? '',
      }, selection, type);
      if (live.current) setState({ type, loading: false, text: result.text, error: null });
    } catch (error) {
      if (live.current) setState({ type, loading: false, text: null, error: error instanceof StudyAssistError ? error.message : 'This explanation is unavailable. Please try again.' });
    } finally { busy.current = false; }
  }
  return <Sheet title="Study Assist" onClose={onClose}>
    {selection ? <>
      <View style={{ gap: spacing[2] }}>
        <Copy size="h3">{selection.block.title}</Copy>
        <Copy muted size="bodySmall" numberOfLines={4}>{selection.block.explanation || selection.block.keyPoints.join('\n')}</Copy>
      </View>
      <View style={{ gap: spacing[2] }}>
        {ASSIST_TYPES.map(type => <Action key={type} secondary disabled={state.loading} onPress={() => void choose(type)}>{ASSIST_LABELS[type]}</Action>)}
      </View>
      {state.loading ? <Copy muted>Creating your {state.type === 'analogy' ? 'analogy' : state.type === 'example' ? 'example' : 'explanation'}… You can close this sheet.</Copy> : null}
      {state.text && state.type ? <Surface style={{ gap: spacing[2] }}>
        <Copy muted size="caption">{ASSIST_RESULT_LABELS[state.type]} · Saved for offline study</Copy>
        <Copy>{state.text}</Copy>
      </Surface> : null}
      {state.error ? <Notice>{state.error}</Notice> : null}
      {!state.text && !state.loading && !state.error ? <Copy muted size="caption">AI study help, saved on this device after you request it.</Copy> : null}
    </> : <Notice>This block is no longer available. Reopen the Reviewer to choose another.</Notice>}
  </Sheet>;
}
