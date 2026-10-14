import type { ActivityDraftContent, OfflineDraftSaveResult } from '@stay-focused/shared';
import type { LocalSqlDatabase } from './sqlDatabase';

export interface PendingDraftEdit {
  readonly draftId: string;
  readonly clientEditId: string;
  readonly baseRevision: number;
  readonly content: ActivityDraftContent;
  readonly sentContent: ActivityDraftContent | null;
  readonly state: 'pending' | 'needs_attention';
}
export interface PendingDraftStore {
  readPendingDraftEdit(owner: string, draftId: string): Promise<PendingDraftEdit | null>;
  listPendingDraftEdits(owner: string): Promise<PendingDraftEdit[]>;
  queueDraftEdit(owner: string, draftId: string, revision: number, content: ActivityDraftContent, editId: string): Promise<void>;
  prepareDraftEdit(owner: string, draftId: string): Promise<PendingDraftEdit | null>;
  finishDraftEdit(owner: string, sent: PendingDraftEdit, result: OfflineDraftSaveResult, nextEditId: string): Promise<void>;
  markDraftEditAttention(owner: string, draftId: string): Promise<void>;
  retryDraftEdit(owner: string, draftId: string): Promise<void>;
  dropPendingDraftEdit(owner: string, draftId: string): Promise<void>;
  readDraftCopyReceipt(owner: string, draftId: string): Promise<string | null>;
}
interface Row {
  draft_id: string; client_edit_id: string; base_revision: number; content_json: string;
  sent_content_json: string | null; state: 'pending' | 'needs_attention';
}
function decode(row: Row): PendingDraftEdit {
  // These are device-authored snapshots; corruption must throw and keep the row.
  return { draftId: row.draft_id, clientEditId: row.client_edit_id, baseRevision: row.base_revision,
    content: JSON.parse(row.content_json) as ActivityDraftContent,
    sentContent: row.sent_content_json ? JSON.parse(row.sent_content_json) as ActivityDraftContent : null, state: row.state };
}
function requireOwner(owner: string) { if (!owner.trim()) throw new Error('owner_required'); }
export function createPendingDraftStore(db: LocalSqlDatabase, now: () => string): PendingDraftStore {
  return {
    async readPendingDraftEdit(owner, draftId) {
      requireOwner(owner);
      const row = await db.getFirstAsync<Row>('SELECT * FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=?', [owner, draftId]);
      return row ? decode(row) : null;
    },
    async listPendingDraftEdits(owner) {
      requireOwner(owner);
      return (await db.getAllAsync<Row>('SELECT * FROM pending_draft_edits WHERE owner_user_id=? ORDER BY updated_at,draft_id', [owner])).map(decode);
    },
    async queueDraftEdit(owner, draftId, revision, content, editId) {
      requireOwner(owner);
      await db.runAsync(`INSERT INTO pending_draft_edits(owner_user_id,draft_id,client_edit_id,base_revision,content_json,updated_at)
        VALUES(?,?,?,?,?,?) ON CONFLICT(owner_user_id,draft_id) DO UPDATE SET content_json=excluded.content_json,updated_at=excluded.updated_at`,
      [owner, draftId, editId, revision, JSON.stringify(content), now()]);
    },
    async prepareDraftEdit(owner, draftId) {
      requireOwner(owner);
      let prepared: PendingDraftEdit | null = null;
      await db.withExclusiveTransactionAsync(async tx => {
        await tx.runAsync(`UPDATE pending_draft_edits SET sent_content_json=COALESCE(sent_content_json,content_json)
          WHERE owner_user_id=? AND draft_id=? AND state='pending'`, [owner, draftId]);
        const row = await tx.getFirstAsync<Row>("SELECT * FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=? AND state='pending'", [owner, draftId]);
        prepared = row ? decode(row) : null;
      });
      return prepared;
    },
    async finishDraftEdit(owner, sent, result, nextEditId) {
      requireOwner(owner);
      await db.withExclusiveTransactionAsync(async tx => {
        const current = await tx.getFirstAsync<Row>('SELECT * FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=? AND client_edit_id=?', [owner, sent.draftId, sent.clientEditId]);
        if (!current) return;
        if (result.conflict && result.copyId) await tx.runAsync(`INSERT INTO draft_sync_receipts VALUES(?,?,?)
          ON CONFLICT(owner_user_id,draft_id) DO UPDATE SET copy_id=excluded.copy_id`, [owner, sent.draftId, result.copyId]);
        if (current.content_json === JSON.stringify(sent.sentContent ?? sent.content)) {
          await tx.runAsync('DELETE FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=? AND client_edit_id=?', [owner, sent.draftId, sent.clientEditId]);
        } else {
          // Edits made during a send (or a lost response) belong to the next edit,
          // only after this id has succeeded. Keep their text and rebase once.
          await tx.runAsync(`UPDATE pending_draft_edits SET client_edit_id=?,base_revision=?,sent_content_json=NULL,state='pending'
            WHERE owner_user_id=? AND draft_id=? AND client_edit_id=?`, [nextEditId, result.draft.revision, owner, sent.draftId, sent.clientEditId]);
        }
      });
    },
    async markDraftEditAttention(owner, draftId) { requireOwner(owner); await db.runAsync("UPDATE pending_draft_edits SET state='needs_attention' WHERE owner_user_id=? AND draft_id=?", [owner, draftId]); },
    async retryDraftEdit(owner, draftId) {
      requireOwner(owner);
      // A 400 guarantees no acceptance. Retry the student's latest corrected text.
      await db.runAsync("UPDATE pending_draft_edits SET state='pending',sent_content_json=NULL WHERE owner_user_id=? AND draft_id=? AND state='needs_attention'", [owner, draftId]);
    },
    async dropPendingDraftEdit(owner, draftId) { requireOwner(owner); await db.runAsync('DELETE FROM pending_draft_edits WHERE owner_user_id=? AND draft_id=?', [owner, draftId]); },
    async readDraftCopyReceipt(owner, draftId) {
      requireOwner(owner);
      return (await db.getFirstAsync<{ copy_id: string }>('SELECT copy_id FROM draft_sync_receipts WHERE owner_user_id=? AND draft_id=?', [owner, draftId]))?.copy_id ?? null;
    },
  };
}
