"use client";
import { useState, type ReactNode } from 'react';
import { reviewerSharePath, type ReviewerReaderModel, type ReviewerShareLink } from '@stay-focused/shared';
import { useAuth } from '../../components/providers';
import { collectSharedAssists } from './assist-store';

export interface ShareReviewerTrigger {
  disabled: boolean;
  onClick: () => void;
}
type ShareReviewerProps = { artifactId: string; reviewer: ReviewerReaderModel; renderTrigger?: (trigger: ShareReviewerTrigger) => ReactNode };
export function ShareReviewer({ artifactId, reviewer, renderTrigger }: ShareReviewerProps) {
  const { api, session } = useAuth();
  return <OwnerShare key={`${session?.user.id}:${artifactId}`} owner={session?.user.id} api={api} artifactId={artifactId} reviewer={reviewer} renderTrigger={renderTrigger} />;
}
function OwnerShare({ owner, api, artifactId, reviewer, renderTrigger }: ShareReviewerProps & { owner: string | undefined; api: ReturnType<typeof useAuth>['api'] }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [share, setShare] = useState<ReviewerShareLink | null>(null), [message, setMessage] = useState<string | null>(null);
  const path = `/api/experience/shares/${encodeURIComponent(artifactId)}`;
  async function mutate(method: 'POST' | 'PATCH' | 'DELETE') {
    if (!owner || busy) return;
    setBusy(true); setMessage(null);
    try {
      const result = await api<ReviewerShareLink | null>(path, { method, ...(method === 'DELETE' ? {} : { body: { assists: collectSharedAssists(owner, reviewer) } }) });
      setShare(result); setOpen(true);
      setMessage(method === 'DELETE' ? 'Sharing stopped.' : method === 'PATCH' ? 'Shared version updated.' : 'Link ready. Anyone with it can read and take the included quizzes.');
    } catch { setMessage('Could not change sharing. Please try again.'); setOpen(true); }
    finally { setBusy(false); }
  }
  const url = share && typeof location !== 'undefined' ? `${location.origin}${reviewerSharePath(share.token)}` : '';
  return <div className="stack">
    {renderTrigger ? renderTrigger({ disabled: busy || !owner, onClick: () => { if (open) setOpen(false); else void mutate('POST'); } }) :
      <button disabled={busy || !owner} onClick={() => { if (open) setOpen(false); else void mutate('POST'); }}>Share</button>}
    {open && <div className="surface stack" role="region" aria-label="Share Reviewer">
      <p>Share a read-only version of this reviewer, included quizzes and Study Assist saved in this browser. Course images and account details are excluded.</p>
      {share && <><label>Share link<input readOnly value={url} onFocus={event => event.target.select()} /></label>
        <div className="row wrap"><button disabled={busy} onClick={() => void navigator.clipboard.writeText(url).then(() => setMessage('Link copied.'), () => setMessage('Select the link to copy it.'))}>Copy link</button>
          <button disabled={busy} onClick={() => void mutate('PATCH')}>Update shared version</button>
          <button className="danger" disabled={busy} onClick={() => void mutate('DELETE')}>Stop sharing</button></div></>}
      {message && <p role="status">{message}</p>}
      <button onClick={() => setOpen(false)}>Close</button>
    </div>}
  </div>;
}
