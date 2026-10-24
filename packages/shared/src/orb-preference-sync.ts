import { isOrbColorKey, parseProfilePreferences, type ProfilePreferences } from './profile-preferences';
import type { OrbColorKey } from './orb-interaction';
import { isPlanMode, type PlanMode } from './task-planning';

export interface PreferenceSyncOptions<T extends string> {
  readPending: () => Promise<string | null>;
  writePending: (value: T | null) => Promise<void>;
  /** Reads the saved value, or saves `value` first when one is given. */
  request: (value?: T) => Promise<T>;
  apply: (value: T) => void;
  isValue: (value: unknown) => value is T;
}
/** One instance per authenticated owner. Local rendering never awaits this queue. */
export class PreferenceSync<T extends string> {
  private pending: T | null = null;
  private revision = 0;
  private disposed = false;
  private busy = false;
  private due = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<void> = Promise.resolve();
  private readonly ready: Promise<void>;
  constructor(private readonly options: PreferenceSyncOptions<T>) {
    const revision = this.revision;
    this.ready = options.readPending().then(value => {
      if (!this.disposed && this.revision === revision && options.isValue(value)) {
        this.pending = value;
        options.apply(value);
      }
    }).catch(() => {});
  }
  private persist(value: T | null) {
    this.writes = this.writes.catch(() => {}).then(() => this.options.writePending(value)).catch(() => {});
  }
  choose(value: T): void {
    if (this.disposed) return;
    this.revision++;
    this.pending = value;
    this.due = Date.now() + 600;
    this.persist(value);
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
      const value = await this.options.request(pending ?? undefined);
      if (!this.options.isValue(value)) throw new Error('invalid_preference');
      if (this.disposed || revision !== this.revision) return;
      if (pending) { this.pending = null; this.persist(null); }
      this.options.apply(value);
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

export interface OrbPreferenceSyncOptions {
  readPending: () => Promise<string | null>;
  writePending: (key: OrbColorKey | null) => Promise<void>;
  request: (key?: OrbColorKey) => Promise<ProfilePreferences>;
  apply: (key: OrbColorKey) => void;
}
export class OrbPreferenceSync extends PreferenceSync<OrbColorKey> {
  constructor(options: OrbPreferenceSyncOptions) {
    super({ ...options, isValue: isOrbColorKey,
      request: async key => parseProfilePreferences(await options.request(key)).orbColor });
  }
}

export interface PlannerPreferences { readonly planMode: PlanMode }
/** Strict single-key body/response for /api/profile/planner-preferences. */
export function parsePlannerPreferences(value: unknown): PlannerPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).length !== 1 || !('planMode' in value) || !isPlanMode(value.planMode)) {
    throw new Error('invalid_planner_preferences');
  }
  return { planMode: value.planMode };
}
export interface PlanModeSyncOptions {
  readPending: () => Promise<string | null>;
  writePending: (mode: PlanMode | null) => Promise<void>;
  request: (mode?: PlanMode) => Promise<PlannerPreferences>;
  apply: (mode: PlanMode) => void;
}
/** The Today "Plan with" choice, synced per owner exactly like the orb color. */
export class PlanModeSync extends PreferenceSync<PlanMode> {
  constructor(options: PlanModeSyncOptions) {
    super({ ...options, isValue: isPlanMode,
      request: async mode => parsePlannerPreferences(await options.request(mode)).planMode });
  }
}
