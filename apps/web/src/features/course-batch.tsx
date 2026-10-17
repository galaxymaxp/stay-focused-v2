"use client";
import { useEffect, useRef, useState } from 'react';
import { batchSelection, batchResultMessage, type CourseBatchPreview, type CourseBatchResult } from '@stay-focused/shared';
import { useAuth } from '../components/providers';
import { useQueueItems } from './queue-items';
import { generationEnabled } from '../lib/generation';

export function CourseBatchControls({ courseId }: { courseId: string }) {
  const { session } = useAuth();
  return <BatchControls key={`${session?.user.id}:${courseId}`} courseId={courseId} />;
}
function BatchControls({ courseId }: { courseId: string }) {
  const { api } = useAuth(), queue = useQueueItems();
  const locked = useRef(false), alive = useRef(true);
  const [preview, setPreview] = useState<CourseBatchPreview | null>(null), [selected, setSelected] = useState<ReadonlySet<string> | 'all'>('all');
  const [busy, setBusy] = useState(false), [message, setMessage] = useState<string | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function load(mode: 'all' | ReadonlySet<string>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setMessage(null);
    try { const result = await api<CourseBatchPreview>(`/api/experience/courses/${courseId}/batch`); if (alive.current) { setPreview(result); setSelected(mode); } }
    catch { if (alive.current) setMessage('Could not check course materials. Try again.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  async function submit() {
    if (!preview || locked.current) return;
    locked.current = true; setBusy(true); setMessage(null);
    try {
      const result = await api<CourseBatchResult>(`/api/experience/courses/${courseId}/batch`, { method: 'POST', body: { materialIds: selected === 'all' ? preview.items.filter(item => item.done || item.selectable).map(item => item.id) : batchSelection(preview, selected) } });
      if (alive.current) { setMessage(batchResultMessage(result)); setPreview(null); queue.refresh(); window.dispatchEvent(new Event('sf:queue-open')); }
    } catch { if (alive.current) setMessage('Could not confirm the batch. Try again to reconnect saved requests.'); }
    finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  return <div className="stack course-batch">
    <div className="row wrap course-batch-actions"><button disabled={busy || !generationEnabled} onClick={() => void load('all')}>Generate all</button>
      <button disabled={busy || !generationEnabled} onClick={() => void load(new Set())}>Select materials</button></div>
    {preview ? <section className="surface stack" aria-label="Confirm course generation">
      <h3>Generate {batchSelection(preview, selected).length} reviewers</h3>
      <button disabled={busy} onClick={() => setSelected(new Set(batchSelection(preview, 'all')))}>Select all</button>
      {preview.items.map(item => <label className="check-row" key={item.id}><input type="checkbox" disabled={busy || !item.selectable}
        checked={selected === 'all' ? item.selectable : selected.has(item.id)} onChange={() => setSelected(old => { const next = new Set(old === 'all' ? batchSelection(preview, 'all') : old); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} />
        {item.title}{item.done ? ' · Done' : !item.selectable ? ' · Unavailable' : ''}</label>)}
      <p className="meta">Skipped: {preview.items.filter(item => item.done || !item.selectable).map(item => item.title).join(', ') || 'None'}</p>
      <div className="row"><button className="primary" disabled={busy || !batchSelection(preview, selected).length} onClick={() => void submit()}>Confirm</button>
        <button disabled={busy} onClick={() => setPreview(null)}>Cancel</button></div>
    </section> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
