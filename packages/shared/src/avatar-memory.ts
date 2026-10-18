import { avatarHttpsUrl, type ProfileAvatar } from './avatar';

export const EMPTY_AVATAR: ProfileAvatar = Object.freeze({ url: null, expiresAt: null });
export function parseProfileAvatar(value: unknown): ProfileAvatar {
  if (!value || typeof value !== 'object') throw new Error('invalid_avatar');
  const row = value as Record<string, unknown>;
  if (row.url === null && row.expiresAt === null) return EMPTY_AVATAR;
  if (!avatarHttpsUrl(row.url) || typeof row.expiresAt !== 'string' ||
      !Number.isFinite(Date.parse(row.expiresAt)) || Date.parse(row.expiresAt) <= Date.now() + 60_000) throw new Error('invalid_avatar');
  return { url: avatarHttpsUrl(row.url)!, expiresAt: row.expiresAt };
}

/** One owner, one mounted provider. No persistence or global cache. */
export class AvatarMemory {
  private value = EMPTY_AVATAR;
  private revision = 0;
  private disposed = false;
  private changing = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private listeners = new Set<() => void>();
  constructor(private readonly load: () => Promise<ProfileAvatar>) {}
  getSnapshot = () => this.value;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(value: ProfileAvatar) {
    clearTimeout(this.timer);
    this.value = value;
    for (const listener of this.listeners) listener();
    if (value.expiresAt) {
      // Remove before expiry even if refresh is offline or takes forever.
      this.timer = setTimeout(() => { this.publish(EMPTY_AVATAR); void this.refresh(); }, Math.max(0, Date.parse(value.expiresAt) - Date.now() - 60_000));
    }
  }
  async refresh(): Promise<void> {
    if (this.disposed || this.changing) return;
    const revision = ++this.revision;
    try {
      const value = parseProfileAvatar(await this.load());
      if (!this.disposed && revision === this.revision) this.publish(value);
    } catch {
      if (!this.disposed && revision === this.revision) this.publish(EMPTY_AVATAR);
    }
  }
  async change(write: () => Promise<ProfileAvatar>): Promise<void> {
    if (this.disposed || this.changing) throw new Error('avatar_unavailable');
    this.changing = true;
    const revision = ++this.revision;
    try {
      const value = parseProfileAvatar(await write());
      if (!this.disposed && revision === this.revision) this.publish(value);
    } catch (error) {
      this.changing = false;
      // Storage cleanup may fail after the authoritative pointer changed.
      if (!this.disposed && revision === this.revision) await this.refresh();
      throw error;
    } finally { this.changing = false; }
  }
  dispose() {
    this.disposed = true;
    this.revision++;
    clearTimeout(this.timer);
    this.value = EMPTY_AVATAR;
    this.listeners.clear();
  }
}
