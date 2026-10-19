import { isOrbColorKey, parseProfilePreferences, type ProfilePreferences } from './profile-preferences';
import type { OrbColorKey } from './orb-interaction';

export interface OrbPreferenceSyncOptions {
  readPending: () => Promise<string | null>;
  writePending: (key: OrbColorKey | null) => Promise<void>;
  request: (key?: OrbColorKey) => Promise<ProfilePreferences>;
  apply: (key: OrbColorKey) => void;
}
/** One instance per authenticated owner. Local rendering never awaits this queue. */
export class OrbPreferenceSync {
  private pending: OrbColorKey | null = null;
  private revision = 0;
  private disposed = false;
  private busy = false;
  private due = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  private readonly ready: Promise<void>;
  constructor(private readonly options: OrbPreferenceSyncOptions) {
    const revision = this.revision;
    this.ready = options.readPending().then(value => {
      if (!this.disposed && this.revision === revision && isOrbColorKey(value)) {
        this.pending = value;
        options.apply(value);
      }
    }).catch(() => {});
  }
  private persist(value: OrbColorKey | null) {
    this.writes = this.writes.catch(() => {}).then(() => this.options.writePending(value)).catch(() => {});
  }
  choose(key: OrbColorKey): void {
    if (this.disposed) return;
    this.revision++;
    this.pending = key;
    this.due = Date.now() + 600;
    this.persist(key);
    this.schedule();
  }
  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = undefined; void this.refresh(); }, Math.max(0, this.due - Date.now()));
  }
  async refresh(): Promise<void> {
    await this.ready;
    if (this.disposed || this.busy) return;
    if (this.pending && Date.now() < this.due) { this.schedule(); return; }
    this.busy = true;
    const revision = this.revision, pending = this.pending;
    try {
      const value = parseProfilePreferences(await this.options.request(pending ?? undefined));
      if (this.disposed || revision !== this.revision) return;
      if (pending) { this.pending = null; this.persist(null); }
      this.options.apply(value.orbColor);
    } catch {
      // Includes profile_preferences_unavailable during staged rollout. Keep
      // the visible choice and its durable pending write for a later reconnect.
    } finally {
      this.busy = false;
      if (!this.disposed && revision !== this.revision && this.pending) this.schedule();
    }
  }
  dispose(): void { this.disposed = true; clearTimeout(this.timer); }
  /** A replacement instance waits for this owner's queued disk writes. */
  settled(): Promise<void> { return this.writes; }
}
