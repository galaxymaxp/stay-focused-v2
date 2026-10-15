import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { batchSelection, batchResultMessage, type CourseBatchPreview, type CourseBatchResult } from '@stay-focused/shared';
import { Action, Copy, Notice, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { useAuth } from '../../auth';
import { experienceRequest } from '../../services/experienceApi';
import { useExperienceClient } from '../redesign/useExperience';
import { useQueueItems } from '../queue/useQueueItems';

export function CourseBatchControls({ courseId }: { courseId: string }) {
  const { session } = useAuth();
  return <BatchControls key={`${session?.user.id}:${courseId}`} courseId={courseId} />;
}
function BatchControls({ courseId }: { courseId: string }) {
  const client = useExperienceClient(), queue = useQueueItems();
  const locked = useRef(false), alive = useRef(true);
  const [preview, setPreview] = useState<CourseBatchPreview | null>(null), [selected, setSelected] = useState<ReadonlySet<string> | 'all'>('all');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  // The keyed parent isolates account/course state; async completions are fenced.
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function load(mode: 'all' | ReadonlySet<string>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage(null);
    try {
      const result = await experienceRequest<CourseBatchPreview>(client, `/api/experience/courses/${courseId}/batch`);
      if (alive.current) { setSelected(mode); setPreview(result); }
    } catch { if (alive.current) setMessage('Could not check course materials. Try again.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function submit() {
    if (!preview || locked.current) return;
    locked.current = true; setBusy(true); setMessage(null);
    try {
      const result = await experienceRequest<CourseBatchResult>(client, `/api/experience/courses/${courseId}/batch`, {
        method: 'POST', body: { materialIds: selected === 'all' ? preview.items.filter(item => item.done || item.selectable).map(item => item.id) : batchSelection(preview, selected) },
      });
      if (alive.current) { setMessage(batchResultMessage(result)); setPreview(null); queue.refresh(); queue.show(); }
    } catch { if (alive.current) setMessage('Could not confirm the batch. Try again to reconnect saved requests.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  return <View style={{ gap: spacing[2] }}>
    <Action disabled={busy} onPress={() => void load('all')}>Generate all</Action>
    <Action secondary disabled={busy} onPress={() => void load(new Set())}>Select materials</Action>
    {preview ? <Surface>
      <Copy size="h3">Generate {batchSelection(preview, selected).length} reviewers</Copy>
      <Action secondary disabled={busy} onPress={() => setSelected(new Set(batchSelection(preview, 'all')))}>Select all</Action>
      {preview.items.map(item => <Pressable key={item.id} accessibilityRole="checkbox" accessibilityLabel={item.title}
        accessibilityState={{ checked: selected === 'all' ? item.selectable : selected.has(item.id), disabled: busy || !item.selectable }}
        disabled={busy || !item.selectable} style={{ minHeight: 44, justifyContent: 'center' }}
        onPress={() => setSelected(old => { const next = new Set(old === 'all' ? batchSelection(preview, 'all') : old); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })}>
        <Copy>{item.done ? 'Done' : !item.selectable ? 'Unavailable' : (selected === 'all' || selected.has(item.id)) ? '☑' : '☐'} · {item.title}</Copy>
      </Pressable>)}
      <Copy muted size="caption">Skipped: {preview.items.filter(item => item.done || !item.selectable).map(item => item.title).join(', ') || 'None'}</Copy>
      <Action disabled={busy || batchSelection(preview, selected).length === 0} onPress={() => void submit()}>Confirm</Action>
      <Action secondary disabled={busy} onPress={() => setPreview(null)}>Cancel</Action>
    </Surface> : null}
    {message ? <Notice>{message}</Notice> : null}
  </View>;
}
