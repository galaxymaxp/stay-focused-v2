import { useState } from 'react';
import { Share, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
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
  async function menu() {
    if (busy || !owner || offline) return;
    setOpen(true); setBusy(true); setNote(null);
    try { setShare(await experienceRequest(client, `/api/experience/shares/${encodeURIComponent(artifactId)}`)); }
    catch { setNote('Could not check sharing. Try again when connected.'); }
    finally { setBusy(false); }
  }
  async function mutate(method: 'POST' | 'PATCH' | 'DELETE') {
    if (busy || !owner || offline) return;
    setBusy(true); setNote(null);
    try {
      const result = await mutateReviewerShare(client, owner, artifactId, reviewer, method);
      setShare(result);
      if (method === 'POST' && result) {
        const url = reviewerShareUrl(result.token);
        await Clipboard.setStringAsync(url);
        setNote('Link copied.');
        await Share.share({ message: url, url, title: reviewer.title });
      } else setNote(method === 'DELETE' ? 'Sharing stopped.' : 'Shared version updated.');
    } catch { setNote('Could not complete sharing. Please try again.'); }
    finally { setBusy(false); }
  }
  return <>
    <Action secondary disabled={offline || !owner} onPress={() => void menu()}>Share</Action>
    {open && <Sheet title="Share Reviewer" onClose={() => setOpen(false)}>
      <Copy muted>Anyone with the link can read this version and take its included quizzes. Study Assist saved on this device is included. Course images and account details are excluded.</Copy>
      <View style={{ gap: spacing[2] }}>
        <Action disabled={busy} onPress={() => void mutate('POST')}>Share link</Action>
        {share && <><Copy>{reviewerShareUrl(share.token)}</Copy>
          <Action secondary disabled={busy} onPress={() => void Clipboard.setStringAsync(reviewerShareUrl(share.token)).then(() => setNote('Link copied.'), () => setNote('Could not copy the link.'))}>Copy link</Action>
          <Action secondary disabled={busy} onPress={() => void mutate('PATCH')}>Update shared version</Action>
          <Action secondary disabled={busy} onPress={() => void mutate('DELETE')}>Stop sharing</Action></>}
      </View>
      {note && <Notice>{note}</Notice>}
    </Sheet>}
  </>;
}
