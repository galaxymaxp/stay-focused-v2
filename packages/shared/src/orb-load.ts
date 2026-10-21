export const ORB_LOAD_TIMEOUT_MS = 12_000;
export const ORB_REVEAL_MS = 250;
export type OrbLoadStatus = 'loading' | 'ready' | 'failed';

/** A late atlas/frame cannot resurrect a failed or disposed scene. */
export function createOrbLoadGate(publish: (status: OrbLoadStatus) => void, logFailure: () => void) {
  let status: OrbLoadStatus = 'loading';
  let disposed = false;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const fail = () => {
    if (disposed || status === 'failed') return;
    status = 'failed'; clearTimeout(deadline);
    publish(status); logFailure();
  };
  const setActive = (active: boolean) => {
    clearTimeout(deadline);
    if (active && !disposed && status === 'loading') deadline = setTimeout(fail, ORB_LOAD_TIMEOUT_MS);
  };
  setActive(true);
  return {
    setActive,
    ready() {
      if (disposed || status !== 'loading') return;
      status = 'ready'; clearTimeout(deadline); publish(status);
    },
    fail,
    dispose() { disposed = true; clearTimeout(deadline); },
  };
}
