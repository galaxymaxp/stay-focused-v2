import type { Database } from '@stay-focused/db';
import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, expect, it, vi } from 'vitest';
import { deleteProfileAvatar, getProfileAvatar, replaceProfileAvatar } from './profile-avatars';
const owner = '11111111-1111-4111-8111-111111111111';
const old = `${owner}/avatar-22222222-2222-4222-8222-222222222222.png`;
type Row = Database['public']['Tables']['user_profiles']['Row'];
let row: Row | null;
let readError: boolean;
let rpcError: boolean;
let conflict: boolean;
const remove = vi.fn(), upload = vi.fn(), createSignedUrl = vi.fn(), rpc = vi.fn();
const client = { from: () => ({ select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: async () => {
  expect(id).toBe(owner); return { data: row, error: readError ? { message: 'private' } : null };
} }) }) }), storage: { from: (bucket: string) => { expect(bucket).toBe('profile-avatars'); return { remove, upload, createSignedUrl }; } }, rpc } as unknown as SupabaseClient<Database>;
beforeEach(() => {
  vi.clearAllMocks(); row = null; readError = rpcError = conflict = false;
  remove.mockResolvedValue({ error: null }); upload.mockResolvedValue({ error: null });
  createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://private.test/signed' }, error: null });
  rpc.mockImplementation(async (name: string, args: { p_path?: string | null; p_paths?: string[] }) => {
    if (rpcError) return { error: { message: 'private' } };
    if (conflict) return { data: false, error: null };
    if (name === 'commit_profile_avatar_v1') row = { orb_color: null, orb_color_updated_at: null, user_id: owner, avatar_path: args.p_path ?? null, avatar_updated_at: 'now', avatar_cleanup_paths: row?.avatar_path ? [row.avatar_path] : [] };
    else if (row) row.avatar_cleanup_paths = row.avatar_cleanup_paths.filter(path => !args.p_paths?.includes(path));
    return { data: true, error: null };
  });
});
it('GET returns null when no avatar exists and never exposes a private path', async () => {
  expect(await getProfileAvatar(client, owner)).toEqual({ url: null, expiresAt: null });
  expect(createSignedUrl).not.toHaveBeenCalled();
});
it('replacement stores and signs new bytes before swapping, then retires old object', async () => {
  row = { orb_color: null, orb_color_updated_at: null, user_id: owner, avatar_path: old, avatar_updated_at: null, avatar_cleanup_paths: [] };
  const value = await replaceProfileAvatar(client, owner, Buffer.from('normalized'));
  const path = upload.mock.calls[0]![0]; expect(path).toMatch(new RegExp(`^${owner}/avatar-.*\\.png$`));
  expect(createSignedUrl).toHaveBeenCalledWith(path, 600);
  expect(remove).toHaveBeenCalledWith([old]); expect(value.url).toBe('https://private.test/signed');
  expect(row!.avatar_path).toBe(path); expect(row!.avatar_cleanup_paths).toEqual([]);
  expect(upload.mock.invocationCallOrder[0]).toBeLessThan(rpc.mock.invocationCallOrder[0]!);
});
it('delete clears pointer and object, and is idempotent', async () => {
  row = { orb_color: null, orb_color_updated_at: null, user_id: owner, avatar_path: old, avatar_updated_at: null, avatar_cleanup_paths: [] };
  expect(await deleteProfileAvatar(client, owner)).toEqual({ url: null, expiresAt: null });
  expect(row!.avatar_path).toBeNull(); expect(remove).toHaveBeenCalledWith([old]);
  await deleteProfileAvatar(client, owner); expect(remove).toHaveBeenCalledTimes(1);
});
it('denies another owner path before signing or deleting', async () => {
  row = { orb_color: null, orb_color_updated_at: null, user_id: owner, avatar_path: old.replace(owner, 'other'), avatar_updated_at: null, avatar_cleanup_paths: [] };
  await expect(getProfileAvatar(client, owner)).rejects.toMatchObject({ status: 503 }); expect(createSignedUrl).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
});
it('compensates explicit conflicts but preserves objects after uncertain RPC failure', async () => {
  conflict = true; await expect(replaceProfileAvatar(client, owner, Buffer.from('png'))).rejects.toMatchObject({ status: 409 }); expect(remove).toHaveBeenCalledTimes(1);
  remove.mockClear(); conflict = false; rpcError = true;
  await expect(replaceProfileAvatar(client, owner, Buffer.from('png'))).rejects.toMatchObject({ status: 503 }); expect(remove).not.toHaveBeenCalled();
});
it('retains durable cleanup after a failed storage delete and retries on GET', async () => {
  row = { orb_color: null, orb_color_updated_at: null, user_id: owner, avatar_path: old, avatar_updated_at: null, avatar_cleanup_paths: [] };
  remove.mockResolvedValueOnce({ error: { message: 'private' } });
  await expect(deleteProfileAvatar(client, owner)).rejects.toMatchObject({ status: 503 });
  expect(row!.avatar_cleanup_paths).toEqual([old]);
  expect(await getProfileAvatar(client, owner)).toEqual({ url: null, expiresAt: null });
  expect(row!.avatar_cleanup_paths).toEqual([]);
});
it('fails closed on profile reads and failed uploads', async () => {
  readError = true; await expect(getProfileAvatar(client, owner)).rejects.toMatchObject({ status: 503 });
  readError = false; upload.mockResolvedValue({ error: { message: 'private' } });
  await expect(replaceProfileAvatar(client, owner, Buffer.from('png'))).rejects.toMatchObject({ status: 503 }); expect(rpc).not.toHaveBeenCalled();
});
