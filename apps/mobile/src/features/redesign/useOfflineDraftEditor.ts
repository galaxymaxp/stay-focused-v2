import type { ActivityDraft, ActivityDraftContent } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth';
import { experienceRequest } from '../../services/experienceApi';
import { getLocalArtifactStore } from '../../services/localLibrary/localArtifactDatabase';
import { draftErrorCode, newDraftEditId, notifyDraftEdits, subscribeDraftEdits, syncPendingDraftEdits } from '../../services/localLibrary/pendingDraftSync';
import { useExperienceClient } from './useExperience';

export const DEVICE_DRAFT_CAPTION = 'Saved on this device · will sync';
export const DRAFT_ATTENTION_NOTICE = "This offline edit couldn't be saved. Copy your text or try again.";
const editable = (draft: ActivityDraft): ActivityDraftContent => ({ title: draft.title, sections: draft.sections, slides: draft.slides });

export function useOfflineDraftEditor(draft: ActivityDraft, onSaved: (draft: ActivityDraft) => void, deviceCopy: boolean) {
  const owner = useAuth().session?.user.id ?? null, client = useExperienceClient();
  const [content, setContent] = useState(() => editable(draft));
  const [revision, setRevision] = useState(draft.revision);
  const [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false), [attention, setAttention] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const busyRef = useRef(false), live = useRef(true), dirtyRef = useRef(false);
  const onSavedRef = useRef(onSaved); onSavedRef.current = onSaved;
  const cloudRevision = useRef(draft.revision); cloudRevision.current = draft.revision;
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, [owner, draft.id]);
  useEffect(() => {
    if (!dirtyRef.current && !busyRef.current) { setContent(editable(draft)); setRevision(draft.revision); }
  }, [draft]);
  useEffect(() => {
    if (!owner) return;
    let mounted = true;
    const load = async (publish = true) => {
      const store = await getLocalArtifactStore(), row = await store?.readPendingDraftEdit(owner, draft.id);
      if (!mounted) return;
      setPending(!!row); setAttention(row?.state === 'needs_attention');
      // A successful replay acknowledges this editor's own base even when the
      // student has started typing the next edit. Do not replace unsaved text.
      if (!row && publish && dirtyRef.current) {
        const confirmed = await store?.readDetail(owner, `activity:${draft.id}`);
        if (mounted && confirmed && 'draft' in confirmed.detail) setRevision(confirmed.detail.draft.revision);
      }
      if (!dirtyRef.current && !busyRef.current) {
        const detail = await store?.readDetail(owner, `activity:${draft.id}`);
        if (!mounted) return;
        if (row) { setContent(row.content); setRevision(row.baseRevision); }
        else if (detail && 'draft' in detail.detail && detail.detail.draft.revision >= cloudRevision.current) {
          setContent(editable(detail.detail.draft)); setRevision(detail.detail.draft.revision);
          if (publish) onSavedRef.current(detail.detail.draft);
        }
      }
      return row;
    };
    const unsubscribe = subscribeDraftEdits(owner, () => { void load().catch(() => undefined); });
    void load(false).then(row => { if (mounted && row) void syncPendingDraftEdits(owner, client); }).catch(() => undefined);
    return () => { mounted = false; unsubscribe(); };
  }, [owner, draft.id, client]);
  const change = (next: ActivityDraftContent) => { dirtyRef.current = true; setDirty(true); setContent(next); setNote(null); };
  const save = useCallback(async (retry = false) => {
    if (!owner || busyRef.current) return;
    busyRef.current = true; setBusy(true); setNote(null);
    try {
      const store = await getLocalArtifactStore();
      const row = await store?.readPendingDraftEdit(owner, draft.id);
      if (!live.current) return;
      const queue = async () => {
        if (!store) throw new Error('Device storage is unavailable. Keep this draft open and try again.');
        // Ensure this saved draft's full body survives removing offline copies.
        const existing = await store.readDetail(owner, `activity:${draft.id}`);
        if (!existing) throw new Error('Device storage is unavailable. Keep this draft open and try again.');
        const editId = await newDraftEditId();
        if (!live.current) return;
        await store.queueDraftEdit(owner, draft.id, revision, content, editId);
        if (retry) await store.retryDraftEdit(owner, draft.id);
        if (!live.current) return;
        setPending(true); setAttention(row?.state === 'needs_attention' && !retry);
        dirtyRef.current = false; setDirty(false); notifyDraftEdits(owner);
      };
      if (row || deviceCopy) {
        await queue();
        if (!deviceCopy || retry) await syncPendingDraftEdits(owner, client);
      } else {
        try {
          const updated = await experienceRequest<ActivityDraft>(client, `/api/experience/activity-drafts/${encodeURIComponent(draft.id)}`, { method: 'PATCH', body: { revision, content } });
          if (!live.current) return;
          const local = await store?.readDetail(owner, `activity:${draft.id}`);
          if (store && local) await store.upsertDetail(owner, local.detail.artifact.id, {
            artifact: { ...local.detail.artifact, title: updated.title, updatedAt: updated.updatedAt }, draft: updated,
          });
          setRevision(updated.revision); dirtyRef.current = false; setDirty(false);
          onSavedRef.current(updated);
          await syncPendingDraftEdits(owner, client);
        } catch (error) {
          if (draftErrorCode(error) !== 'connection') throw error;
          await queue();
        }
      }
      const current = await store?.readPendingDraftEdit(owner, draft.id);
      if (live.current) { setPending(!!current); setAttention(current?.state === 'needs_attention'); }
    } catch (error) {
      if (live.current) setNote(error instanceof Error ? error.message : 'Could not save. Your edits remain here.');
    } finally {
      busyRef.current = false;
      if (live.current) { setBusy(false); if (owner) notifyDraftEdits(owner); }
    }
  }, [owner, draft.id, revision, content, deviceCopy, client]);
  const saveRef = useRef(save); saveRef.current = save;
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void saveRef.current(), 700);
    return () => clearTimeout(timer);
  }, [content, dirty]);
  return { content, change, dirty, busy, pending, attention, note, save,
    caption: dirty ? 'Unsaved changes' : pending ? DEVICE_DRAFT_CAPTION : 'Saved draft' };
}
