import { useEffect, useRef, useState } from 'react';
import { Share, View } from 'react-native';
import type { ReviewerReaderModel, ReviewerShareLink } from '@stay-focused/shared';
import { useAuth } from '../../auth';
import { Action, Copy, Notice, Sheet } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { mutateReviewerShare, reviewerShareUrl } from '../../services/reviewerShares';
import { experienceRequest, type ExperienceClient } from '../../services/experienceApi';

export function ShareReviewerMenu({ artifactId, reviewer, client, offline }: {
  artifactId: string; reviewer: ReviewerReaderModel; client: ExperienceClient; offline: boolean;
}) {
  const { session } = useAuth();
  return <OwnerShare key={`${session?.user.id}:${artifactId}`} owner={session?.user.id ?? ''} artifactId={artifactId} reviewer={reviewer} client={client} offline={offline} />;
}
function OwnerShare({ owner, artifactId, reviewer, client, offline }: {
  owner: string; artifactId: string; reviewer: ReviewerReaderModel; client: ExperienceClient; offline: boolean;
}) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [share, setShare] = useState<ReviewerShareLink | null>(null), [note, setNote] = useState<string | null>(null);
  const active = useRef(true);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  async function menu() {
    if (busy || !owner || offline) return;
    setOpen(true); setBusy(true); setNote(null);
    try {
      const result = await experienceRequest<ReviewerShareLink | null>(client, `/api/experience/shares/${encodeURIComponent(artifactId)}`);
      if (active.current) setShare(result);
    }
    catch { if (active.current) setNote('Could not check sharing. Try again when connected.'); }
    finally { if (active.current) setBusy(false); }
  }
  async function mutate(method: 'POST' | 'PATCH' | 'DELETE') {
    if (busy || !owner || offline) return;
    setBusy(true); setNote(null);
    try {
      const result = await mutateReviewerShare(client, owner, artifactId, reviewer, method);
      if (!active.current) return;
      setShare(result);
      if (method === 'POST' && result) {
        const url = reviewerShareUrl(result.token);
        const copied = await copyReviewerLink(url);
        if (!active.current) return;
        setNote(copied ? 'Link copied.' : 'Link ready to share');
        await Share.share({ message: url, url, title: reviewer.title }).catch(() => {});
      } else setNote(method === 'DELETE' ? 'Sharing stopped.' : 'Shared version updated.');
    } catch { if (active.current) setNote('Could not complete sharing. Please try again.'); }
    finally { if (active.current) setBusy(false); }
  }
  async function copy() {
    if (!share || busy || offline || !owner) return;
    setBusy(true);
    const url = reviewerShareUrl(share.token);
    try {
      const copied = await copyReviewerLink(url);
      if (!active.current) return;
      setNote(copied ? 'Link copied.' : 'Link ready to share');
      if (!copied) await Share.share({ message: url, url, title: reviewer.title }).catch(() => {});
    } finally { if (active.current) setBusy(false); }
  }
  return <>
    <Action secondary disabled={offline || !owner} onPress={() => void menu()}>Share</Action>
    {open && <Sheet title="Share Reviewer" onClose={() => setOpen(false)}>
      <Copy muted>Anyone with the link can read this version and take its included quizzes. Study Assist saved on this device is included. Course images and account details are excluded.</Copy>
      <View style={{ gap: spacing[2] }}>
        <Action disabled={busy} onPress={() => void mutate('POST')}>Share link</Action>
        {share && <><Copy>{reviewerShareUrl(share.token)}</Copy>
          <Action secondary disabled={busy || offline} onPress={() => void copy()}>Copy link</Action>
          <Action secondary disabled={busy} onPress={() => void mutate('PATCH')}>Update shared version</Action>
          <Action secondary disabled={busy} onPress={() => void mutate('DELETE')}>Stop sharing</Action></>}
      </View>
      {note && <Notice>{note}</Notice>}
    </Sheet>}
  </>;
}

/** An older APK may not contain ExpoClipboard; even module evaluation can throw. */
export async function copyReviewerLink(url: string): Promise<boolean> {
  try {
    const clipboard = await import('expo-clipboard');
    return await clipboard.setStringAsync(url);
  } catch { return false; }
}
