import { activeBatchSummaries } from '@stay-focused/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Action, Copy, Notice, Surface } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { experienceRequest } from '../../services/experienceApi';
import { useExperienceClient } from '../redesign/useExperience';
import { useQueueItems } from './useQueueItems';
export function CourseBatchQueue() {
  const queue = useQueueItems(), client = useExperienceClient(), locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function act(id: string, action: 'cancel' | 'retry') {
    if (locked.current) return;
    locked.current = true; setError(null);
    try { await experienceRequest(client, `/api/experience/batch-requests/${id}/${action}`, { method: 'POST' }); queue.refresh(); }
    catch { setError('Could not update this request. Try again.'); }
    finally { locked.current = false; }
  }
  const data = queue.data?.courseBatches;
  return <View style={{ gap: spacing[2] }}>
    {activeBatchSummaries(data).map(group => <Copy key={group.batchKey} size="caption">{group.done} of {group.total} done</Copy>)}
    {data?.requests.filter(row => ['waiting', 'quota', 'failed'].includes(row.state)).map(row => <Surface key={row.id}>
      <Copy size="h3">{row.title}</Copy>
      <Copy muted size="caption">{row.state === 'waiting' ? 'Waiting for preparation' : row.state === 'failed' ? 'Could not start this reviewer' : row.nextAvailableAt ? `Waiting for quota · retry after ${new Date(row.nextAvailableAt).toLocaleString()}` : 'Waiting for generation capacity'}</Copy>
      {row.state === 'failed' ? <Action secondary onPress={() => void act(row.id, 'retry')}>Retry</Action> : null}
      <Action secondary onPress={() => void act(row.id, 'cancel')}>Cancel</Action>
    </Surface>)}
    {error ? <Notice>{error}</Notice> : null}
  </View>;
}
