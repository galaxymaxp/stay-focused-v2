import type { Database } from '@stay-focused/db';
import type { ProfileAvatar } from '@stay-focused/shared';
import type { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { AvatarFailure } from './profile-avatar-image';

const BUCKET = 'profile-avatars';
type Client = SupabaseClient<Database>;
type Profile = Database['public']['Tables']['user_profiles']['Row'];
const empty: ProfileAvatar = { url: null, expiresAt: null };
const unavailable = () => new AvatarFailure(503, 'unavailable');

function ownedPath(path: string, userId: string): boolean {
  return path.startsWith(`${userId}/`) && /^avatar-[0-9a-f-]{36}\.png$/.test(path.slice(userId.length + 1));
}
async function read(client: Client, userId: string): Promise<Profile | null> {
  const result = await client.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
  if (result.error) throw unavailable();
  const row = result.data;
  if (row && (row.user_id !== userId || (row.avatar_path && !ownedPath(row.avatar_path,userId)) ||
      !Array.isArray(row.avatar_cleanup_paths) || row.avatar_cleanup_paths.some(path => !ownedPath(path,userId) || path === row.avatar_path))) throw unavailable();
  return row;
}
async function cleanup(client: Client, userId: string, row: Profile | null): Promise<void> {
  const paths = row?.avatar_cleanup_paths ?? [];
  if (!paths.length) return;
  const removed = await client.storage.from(BUCKET).remove(paths);
  if (removed.error) throw unavailable();
  const finished = await client.rpc('finish_profile_avatar_cleanup_v1', { p_user_id: userId, p_paths: paths });
  if (finished.error) throw unavailable();
}
async function sign(client: Client, path: string): Promise<ProfileAvatar> {
  const signed = await client.storage.from(BUCKET).createSignedUrl(path, 600);
  if (signed.error || !signed.data?.signedUrl || !signed.data.signedUrl.startsWith('https://')) throw unavailable();
  return { url: signed.data.signedUrl, expiresAt: new Date(Date.now() + 600_000).toISOString() };
}
export async function getProfileAvatar(client: Client, userId: string): Promise<ProfileAvatar> {
  const row = await read(client,userId);
  await cleanup(client,userId,row);
  return row?.avatar_path ? sign(client,row.avatar_path) : empty;
}

export async function replaceProfileAvatar(client: Client, userId: string, png: Buffer): Promise<ProfileAvatar> {
  const previous = await read(client,userId);
  await cleanup(client,userId,previous);
  const path = `${userId}/avatar-${randomUUID()}.png`;
  const uploaded = await client.storage.from(BUCKET).upload(path,png,{ contentType:'image/png', upsert:false, cacheControl:'0' });
  if (uploaded.error) throw unavailable();
  let committed = false;
  let commitAttempted = false;
  let definitelyRejected = false;
  try {
    const signed = await sign(client,path);
    commitAttempted = true;
    const result = await client.rpc('commit_profile_avatar_v1', { p_user_id:userId, p_expected_path:previous?.avatar_path ?? null, p_path:path });
    if (result.error) throw unavailable();
    if (!result.data) { definitelyRejected = true; throw new AvatarFailure(409,'conflict'); }
    committed = true;
    await cleanup(client,userId,await read(client,userId));
    return signed;
  } catch (error) {
    // Once committed, the new photo stays authoritative even if retiring the old
    // object failed. The persisted cleanup list makes a later retry safe.
    // A lost RPC response may have committed. Never remove that possibly-current
    // object on uncertain evidence; a private orphan is safer than a broken photo.
    if (!committed && (!commitAttempted || definitelyRejected)) {
      const removed = await client.storage.from(BUCKET).remove([path]);
      if (removed.error) throw unavailable();
    }
    throw error;
  }
}

export async function deleteProfileAvatar(client: Client, userId: string): Promise<ProfileAvatar> {
  const previous = await read(client,userId);
  await cleanup(client,userId,previous);
  if (!previous?.avatar_path) return empty;
  const result = await client.rpc('commit_profile_avatar_v1', { p_user_id:userId, p_expected_path:previous.avatar_path, p_path:null });
  if (result.error) throw unavailable();
  if (!result.data) throw new AvatarFailure(409,'conflict');
  await cleanup(client,userId,await read(client,userId));
  return empty;
}
