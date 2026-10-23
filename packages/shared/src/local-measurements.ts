/** Fixed, local-only boundaries. No identifiers, paths, content or metadata. */
export const LOCAL_MEASUREMENT_NAMES = [
  'startup.entry_decision',
  'library.setup',
  'library.snapshot_read',
  'library.overview_read',
  'navigation.notification_dispatch',
  'api.library_page',
] as const;
export type LocalMeasurementName = typeof LOCAL_MEASUREMENT_NAMES[number];
export const LOCAL_MEASUREMENT_OUTCOMES = ['success', 'empty', 'error', 'cancelled'] as const;
export type LocalMeasurementOutcome = typeof LOCAL_MEASUREMENT_OUTCOMES[number];
export interface LocalMeasurement {
  readonly name: LocalMeasurementName;
  readonly outcome: LocalMeasurementOutcome;
  readonly durationMs: number;
  readonly count?: number;
}
export interface LocalMeasurementObserver {
  /** Inject a monotonic millisecond clock, e.g. performance.now, only when enabled. */
  readonly now: () => number;
  readonly sink: (event: LocalMeasurement) => void | Promise<void>;
}
type Finish = (outcome: LocalMeasurementOutcome, count?: number) => void;
const inert: Finish = () => undefined;

/** No default clock/sink, buffer, timer, console output or network transport.
 * An observer owns its unfinished spans; replacing/removing it drops those
 * spans rather than publishing into a later observer's session.
 */
export function createLocalMeasurements() {
  let observer: LocalMeasurementObserver | undefined;
  return {
    observe(options: LocalMeasurementObserver): () => void {
      // Copy the observer so every installation has a distinct lifetime.
      const installed = { now: options.now, sink: options.sink };
      observer = installed;
      return () => { if (observer === installed) observer = undefined; };
    },
    start(name: LocalMeasurementName): Finish {
      const current = observer;
      if (!current || !LOCAL_MEASUREMENT_NAMES.includes(name)) return inert;
      let started: number;
      try { started = current.now(); } catch { return inert; }
      if (!Number.isFinite(started)) return inert;
      let finished = false;
      return (outcome, count) => {
        if (finished) return;
        finished = true;
        if (observer !== current || !LOCAL_MEASUREMENT_OUTCOMES.includes(outcome)) return;
        try {
          const elapsed = current.now() - started;
          if (!Number.isFinite(elapsed) || elapsed < 0) return;
          const event: LocalMeasurement = Object.freeze({ name, outcome, durationMs: elapsed,
            ...(outcome === 'success' && Number.isSafeInteger(count) && count! >= 0 ? { count } : {}),
          });
          // Neither synchronous throws nor async rejection may affect study.
          const result = current.sink(event);
          if (result) void result.catch(() => undefined);
        } catch { /* Optional instrumentation must never alter app behavior. */ }
      };
    },
  };
}

/** Opt-in for controlled local probes; production remains disabled by default. */
export const localMeasurements = createLocalMeasurements();
