"use client";
import { useRef, useState } from 'react';
import { useAuth } from '../components/providers';
import { useQueueItems } from './queue-items';
export function CourseBatchQueue() {
  const queue = useQueueItems(), { api } = useAuth(), locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function act(id: string, action: 'cancel' | 'retry') {
    if (locked.current) return;
    locked.current = true; setError(null);
    try { await api(`/api/experience/batch-requests/${id}/${action}`, { method: 'POST' }); queue.refresh(); }
    catch { setError('Could not update this request. Try again.'); }
    finally { locked.current = false; }
  }
  const data = queue.data?.courseBatches;
  return <div className="stack">
    {data?.summaries.map(group => <p className="meta" key={group.batchKey}>{group.done} of {group.total} done</p>)}
    {data?.requests.filter(row => ['waiting', 'quota', 'failed'].includes(row.state)).map(row => <div className="surface stack" key={row.id}>
      <h3>{row.title}</h3><p className="meta">{row.state === 'waiting' ? 'Waiting for preparation' : row.state === 'failed' ? 'Could not start this reviewer' : row.nextAvailableAt ? `Waiting for quota · retry after ${new Date(row.nextAvailableAt).toLocaleString()}` : 'Waiting for generation capacity'}</p>
      <div className="row">{row.state === 'failed' ? <button onClick={() => void act(row.id, 'retry')}>Retry</button> : null}
        <button onClick={() => void act(row.id, 'cancel')}>Cancel</button></div>
    </div>)}
    {error ? <p role="status">{error}</p> : null}
  </div>;
}
