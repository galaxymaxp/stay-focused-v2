import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActivityDraft } from '@stay-focused/shared';
import { useOfflineDraftEditor, DEVICE_DRAFT_CAPTION } from './useOfflineDraftEditor';
import { useDraftVersions, DraftVersionsNotice, DraftVersionsSheet, OFFLINE_DRAFT_CONFLICT_NOTICE } from './DraftVersions';
import { draftDetail, openNodeSqlite, OWNER_A } from '../../services/localLibrary/localLibrary.testSupport';
import { createLocalArtifactStore, type LocalArtifactStore } from '../../services/localLibrary/artifactStore';
import { migrateLocalLibrary } from '../../services/localLibrary/schema';

const fake = vi.hoisted(() => ({ client: { baseUrl: 'https://app.test', accessToken: 'token' }, request: vi.fn(), sync: vi.fn(), alert: vi.fn(), listeners: new Set<() => void>() }));
vi.mock('react-native', () => ({ View: 'View', Platform: { OS: 'android' }, Alert: { alert: fake.alert } }));
vi.mock('../../auth', () => ({ useAuth: () => ({ session: { user: { id: 'owner-a' } } }) }));
vi.mock('../../design/primitives', () => ({ Action: 'Action', Copy: 'Copy', Notice: 'Notice', Sheet: 'Sheet' }));
vi.mock('./useExperience', () => ({ useExperienceClient: () => fake.client }));
vi.mock('../../services/experienceApi', () => ({ experienceRequest: fake.request }));
vi.mock('../../services/localLibrary/localArtifactDatabase', () => ({ getLocalArtifactStore: async () => store }));
vi.mock('../../services/localLibrary/pendingDraftSync', () => ({
  syncPendingDraftEdits: fake.sync, newDraftEditId: async () => 'edit-id',
  draftErrorCode: (error: { code?: string }) => error.code,
  subscribeDraftEdits: (_owner: string, callback: () => void) => { fake.listeners.add(callback); return () => fake.listeners.delete(callback); },
  notifyDraftEdits: () => { for (const callback of fake.listeners) callback(); },
}));
let store: LocalArtifactStore, handle: ReturnType<typeof openNodeSqlite>, draft: ActivityDraft;
let rendered: ReactTestRenderer | undefined;
let editor: ReturnType<typeof useOfflineDraftEditor>, versions: ReturnType<typeof useDraftVersions>;
const onSaved = vi.fn();
function Editor({ offline = false }: { offline?: boolean }) { editor = useOfflineDraftEditor(draft, onSaved, offline); return createElement('caption', null, editor.caption); }
function Versions() { versions = useDraftVersions(draft, onSaved); return createElement('View', null, createElement(DraftVersionsNotice, { versions }), createElement(DraftVersionsSheet, { versions })); }
beforeEach(async () => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.clearAllMocks(); fake.listeners.clear();
  handle = openNodeSqlite(); await migrateLocalLibrary(handle.db); store = createLocalArtifactStore(handle.db);
  const detail = draftDetail(); if (!('draft' in detail)) throw new Error('fixture'); draft = detail.draft;
  // The test's mocked session is an independent owner, as in an actual sign-in.
  await store.upsertDetail('owner-a', detail.artifact.id, detail);
  fake.sync.mockResolvedValue(undefined);
  fake.request.mockImplementation(async (_client, path: string) => path.endsWith('/copies') ? { copies: [] } : draft);
});
afterEach(async () => { if (rendered) await act(async () => rendered!.unmount()); rendered = undefined; handle.close(); vi.useRealTimers(); });
async function mount(offline = false) { await act(async () => { rendered = create(createElement(Editor, { offline })); }); }
describe('offline Draft editor hook', () => {
  it('autosaves offline after 700ms; device caption and leave state survive remount', async () => {
    await mount(true); vi.useFakeTimers();
    await act(async () => { editor.change({ ...editor.content, title: 'Persistent edit' }); });
    expect(editor.dirty).toBe(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(700); });
    expect(editor.caption).toBe(DEVICE_DRAFT_CAPTION); expect(editor.dirty).toBe(false);
    expect(fake.request).not.toHaveBeenCalled();
    vi.useRealTimers(); await act(async () => rendered!.unmount()); rendered = undefined; await mount(true);
    expect(editor.content.title).toBe('Persistent edit'); expect(editor.caption).toBe(DEVICE_DRAFT_CAPTION);
    expect(fake.sync).toHaveBeenCalledTimes(1);
    expect(await store.listPendingDraftEdits(OWNER_A)).toEqual([]);
  });
  it('PATCH connection failure saves to SQLite; a pending online edit uses replay instead of PATCH', async () => {
    fake.request.mockRejectedValue({ code: 'connection' }); await mount();
    await act(async () => { editor.change({ ...editor.content, title: 'Connection edit' }); });
    await act(async () => { await editor.save(); });
    expect(editor.caption).toBe(DEVICE_DRAFT_CAPTION); expect(editor.dirty).toBe(false);
    expect(fake.request).toHaveBeenCalledTimes(1);
    await act(async () => { editor.change({ ...editor.content, title: 'Queued online edit' }); });
    await act(async () => { await editor.save(); });
    expect(fake.request).toHaveBeenCalledTimes(1); expect(fake.sync).toHaveBeenCalledTimes(1);
    expect(await store.readPendingDraftEdit('owner-a', draft.id)).toMatchObject({ content: { title: 'Queued online edit' } });
  });
  it('needs_attention remains visible and retries only on explicit Try again', async () => {
    await store.queueDraftEdit('owner-a', draft.id, 1, { title: draft.title, sections: draft.sections, slides: [] }, 'edit');
    await store.markDraftEditAttention('owner-a', draft.id);
    await mount(true); expect(editor.attention).toBe(true);
    await act(async () => { await editor.save(true); });
    expect(editor.attention).toBe(false); expect(fake.sync).toHaveBeenCalledTimes(2);
    expect(await store.readPendingDraftEdit('owner-a', draft.id)).toMatchObject({ state: 'pending' });
  });
  it('online PATCH persists confirmed content and attempts one replay pass', async () => {
    const updated = { ...draft, title: 'Online saved', revision: 2, updatedAt: '2026-10-14T00:00:00Z' };
    fake.request.mockResolvedValue(updated); await mount();
    await act(async () => { editor.change({ ...editor.content, title: updated.title }); });
    await act(async () => { await editor.save(); });
    expect(fake.request).toHaveBeenCalledExactlyOnceWith(fake.client, `/api/experience/activity-drafts/${draft.id}`, {
      method: 'PATCH', body: { revision: draft.revision, content: { title: updated.title, sections: draft.sections, slides: draft.slides } },
    });
    expect(editor.caption).toBe('Saved draft'); expect(onSaved).toHaveBeenCalledWith(updated);
    expect((await store.readDetail('owner-a', `activity:${draft.id}`))?.detail).toMatchObject({ draft: updated });
    expect(fake.sync).toHaveBeenCalledTimes(1);
  });
  it('replay during typing advances the acknowledged base without replacing unsaved text', async () => {
    await mount();
    await act(async () => { editor.change({ ...editor.content, title: 'Next unsaved edit' }); });
    const detail = draftDetail({ revision: 2, title: 'Accepted earlier edit', updatedAt: '2026-10-14T00:00:00Z' });
    await act(async () => { await store.upsertDetail('owner-a', detail.artifact.id, detail); for (const callback of fake.listeners) callback(); });
    expect(editor.content.title).toBe('Next unsaved edit'); expect(editor.dirty).toBe(true);
    await act(async () => { await editor.save(); });
    expect(fake.request).toHaveBeenCalledWith(fake.client, expect.any(String), { method: 'PATCH', body: { revision: 2, content: expect.objectContaining({ title: 'Next unsaved edit' }) } });
  });
});
describe('kept online version actions', () => {
  it('keeps the editor usable when the copies response has an invalid shape', async () => {
    fake.request.mockResolvedValue(draft);
    await act(async () => { rendered = create(createElement(Versions)); });
    expect(versions.copies).toEqual([]);
    expect(versions.keptId).toBeNull();
    expect(versions.busy).toBe(false);
  });
  it('shows conflict notice, opens a read-only copy, confirms restore via PATCH and removes a copy', async () => {
    const content = { title: 'Kept online', sections: draft.sections, slides: [] }, copy = { id: 'copy-id', content, title: content.title, revision: 2, createdAt: '2026-10-13' };
    let removed = false;
    fake.request.mockImplementation(async (_client, path: string, options?: { method?: string }) => {
      if (options?.method === 'DELETE') { removed = true; return { deleted: true }; }
      if (options?.method === 'PATCH') return { ...draft, ...content, revision: 3 };
      if (path.endsWith('/copies')) return { copies: removed ? [] : [copy] };
      if (path.endsWith('/copy-id')) return copy;
      return { ...draft, revision: 2 };
    });
    await act(async () => { rendered = create(createElement(Versions)); });
    expect(rendered!.root.findByType('Notice' as never).props.children).toBe(OFFLINE_DRAFT_CONFLICT_NOTICE);
    await act(async () => { await versions.view('copy-id'); });
    expect(versions.selected?.content.title).toBe('Kept online');
    expect(rendered!.root.findAllByType('Action' as never).map(node => node.props.children)).toContain('Restore it');
    await act(async () => { versions.confirmRestore(); });
    expect(fake.alert.mock.calls[0]![1]).toBe('Restoring replaces your offline edit');
    const buttons = fake.alert.mock.calls[0]![2] as { text: string; onPress?: () => void }[];
    await act(async () => { buttons.find(button => button.text === 'Restore it')!.onPress!(); });
    expect(fake.request).toHaveBeenCalledWith(fake.client, expect.any(String), { method: 'PATCH', body: { revision: 2, content } });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ revision: 3 }));
    await act(async () => { await versions.view('copy-id'); });
    await act(async () => { await versions.remove(); });
    expect(versions.copies).toEqual([]); expect(versions.keptId).toBeNull();
  });
});
