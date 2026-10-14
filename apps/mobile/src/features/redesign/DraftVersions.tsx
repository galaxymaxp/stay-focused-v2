import type { ActivityDraft, ActivityDraftCopy, ActivityDraftCopies, ActivityDraftCopySummary } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { Action, Copy, Notice, Sheet } from '../../design/primitives';
import { spacing } from '../../design/tokens';
import { useAuth } from '../../auth';
import { experienceRequest } from '../../services/experienceApi';
import { getLocalArtifactStore } from '../../services/localLibrary/localArtifactDatabase';
import { subscribeDraftEdits, syncPendingDraftEdits } from '../../services/localLibrary/pendingDraftSync';
import { useExperienceClient } from './useExperience';

export const OFFLINE_DRAFT_CONFLICT_NOTICE = 'Edited offline · the online version was kept';
export function useDraftVersions(draft: ActivityDraft | null, onSaved: (draft: ActivityDraft) => void) {
  const owner = useAuth().session?.user.id ?? null, client = useExperienceClient(), id = draft?.id;
  const scope = useRef({ owner, id, client }); scope.current = { owner, id, client };
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [copies, setCopies] = useState<readonly ActivityDraftCopySummary[]>([]);
  const [keptId, setKeptId] = useState<string | null>(null), [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ActivityDraftCopy | null>(null);
  const [note, setNote] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const reload = useCallback(async () => {
    if (!id || !owner) return;
    const active = () => mounted.current && scope.current.owner === owner && scope.current.id === id && scope.current.client === client;
    const receipt = await (await getLocalArtifactStore())?.readDraftCopyReceipt(owner, id);
    if (!active()) return;
    if (receipt) setKeptId(receipt);
    try {
      const value = await experienceRequest<ActivityDraftCopies>(client, `/api/experience/activity-drafts/${encodeURIComponent(id)}/copies`);
      if (!active()) return;
      if (!Array.isArray(value.copies)) throw new Error('invalid_draft_copies');
      setCopies(value.copies);
      // Copies also recover a conflict whose accepted response was lost.
      setKeptId(value.copies.some(c => c.id === receipt) ? receipt! : value.copies[0]?.id ?? null);
    } catch { /* A durable local conflict notice can survive being offline. */ }
  }, [client, id, owner]);
  useEffect(() => { setCopies([]); setKeptId(null); setSelected(null); setOpen(false); }, [owner, id]);
  useEffect(() => { void reload(); return owner ? subscribeDraftEdits(owner, () => { void reload(); }) : undefined; }, [owner, reload, draft?.revision]);
  async function view(copyId: string) {
    if (!id || busy) return;
    setBusy(true); setNote(null); setOpen(true);
    try {
      const copy = await experienceRequest<ActivityDraftCopy>(client, `/api/experience/activity-drafts/${encodeURIComponent(id)}/copies/${encodeURIComponent(copyId)}`);
      if (mounted.current && scope.current.owner === owner && scope.current.id === id) setSelected(copy);
    }
    catch { setNote('Could not open the online version. Try again when connected.'); }
    finally { setBusy(false); }
  }
  async function restore() {
    if (!draft || !selected || !id || busy) return;
    setBusy(true); setNote(null);
    try {
      const store = await getLocalArtifactStore();
      if (owner && await store?.readPendingDraftEdit(owner, id)) { setNote('Sync your offline edit before restoring this version.'); return; }
      const current = await experienceRequest<ActivityDraft>(client, `/api/experience/activity-drafts/${encodeURIComponent(id)}`);
      const updated = await experienceRequest<ActivityDraft>(client, `/api/experience/activity-drafts/${encodeURIComponent(id)}`, { method: 'PATCH', body: { revision: current.revision, content: selected.content } });
      onSaved(updated); setOpen(false); setSelected(null);
      if (owner) await syncPendingDraftEdits(owner, client);
    } catch { setNote('Could not restore the online version. Refresh and try again.'); }
    finally { setBusy(false); }
  }
  function confirmRestore() {
    if (Platform.OS === 'web') { if (window.confirm('Restoring replaces your offline edit')) void restore(); }
    else Alert.alert('Restore online version?', 'Restoring replaces your offline edit', [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore it', onPress: () => void restore() }]);
  }
  async function remove() {
    if (!id || !selected || busy) return;
    setBusy(true); setNote(null);
    try {
      await experienceRequest(client, `/api/experience/activity-drafts/${encodeURIComponent(id)}/copies/${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      setSelected(null); await reload();
    } catch { setNote('Could not remove this copy. Try again when connected.'); }
    finally { setBusy(false); }
  }
  return { copies, keptId, open, selected, note, busy, view, confirmRestore, remove,
    show: () => { setSelected(null); setNote(null); setOpen(true); void reload(); }, close: () => { setOpen(false); setSelected(null); } };
}
export type DraftVersionsState = ReturnType<typeof useDraftVersions>;
export function DraftVersionsNotice({ versions }: { versions: DraftVersionsState }) {
  return versions.keptId ? <View style={{ gap: spacing[2] }}>
    <Notice>{OFFLINE_DRAFT_CONFLICT_NOTICE}</Notice>
    <Action secondary disabled={versions.busy} onPress={() => void versions.view(versions.keptId!)}>View online version</Action>
  </View> : null;
}
export function DraftVersionsSheet({ versions }: { versions: DraftVersionsState }) {
  if (!versions.open) return null;
  const copy = versions.selected;
  return <Sheet title={copy ? 'Online version' : 'Online versions'} onClose={versions.close}>
    {copy ? <>
      <Copy size="h3">{copy.title}</Copy>
      {copy.content.sections.map(section => <View key={section.id} style={{ gap: spacing[2] }}><Copy size="h3">{section.heading}</Copy><Copy>{section.content}</Copy></View>)}
      {copy.content.slides.map(slide => <View key={slide.number} style={{ gap: spacing[2] }}><Copy size="h3">{slide.title}</Copy><Copy>{slide.body}</Copy>{slide.speakerNotes ? <Copy muted>{slide.speakerNotes}</Copy> : null}</View>)}
      <Action disabled={versions.busy} onPress={versions.confirmRestore}>Restore it</Action>
      <Action secondary disabled={versions.busy} onPress={() => void versions.remove()}>Remove copy</Action>
    </> : versions.copies.map(item => <Action key={item.id} secondary disabled={versions.busy} onPress={() => void versions.view(item.id)}>{item.title} · Version {item.revision}</Action>)}
    {!copy && !versions.copies.length && !versions.busy ? <Copy muted>No online versions kept.</Copy> : null}
    {versions.busy ? <Copy muted>Loading…</Copy> : null}
    {versions.note ? <Notice>{versions.note}</Notice> : null}
  </Sheet>;
}
