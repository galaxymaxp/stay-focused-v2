/** Platform adapters schedule after rendering and reveal the exact answer anchor. */
export function createStudyAnswerScroll(reveal: (target: string, animated: boolean, stillCurrent: () => boolean) => void, schedule: (work: () => void) => void) {
  let sequence = 0;
  let active: { token: number; target: string; animated: boolean; manual: boolean } | null = null;
  function queue(token: number) {
    schedule(() => {
      const stillCurrent = () => active?.token === token && !active.manual;
      if (active && stillCurrent()) reveal(active.target, active.animated, stillCurrent);
    });
  }
  return {
    begin(target: string, reducedMotion: boolean): number {
      const token = ++sequence;
      active = { token, target, animated: !reducedMotion, manual: false };
      queue(token);
      return token;
    },
    complete(token: number) { if (active?.token === token && !active.manual) queue(token); },
    manualScroll() { if (active) active.manual = true; },
    cancel() { active = null; },
  };
}
