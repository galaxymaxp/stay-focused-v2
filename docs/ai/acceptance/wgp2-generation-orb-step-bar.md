# WGP2 acceptance - generation orb and vertical step bar

Finite scope: STEP 0-4, code/tests/gates/docs/local commits only. Baseline
2480cf14, overnight/2026-10-15_feedback. No remote operation, deployment,
environment-file edit or push. No ADR requested. Rollout/device checks excluded.

| Requirement | Layer | Proof | Current result |
| --- | --- | --- | --- |
| Interactivity root cause reproduced before changes | Web | Local Playwright harness, real GenerationScreen + globals.css, 1440/390 | Pointer reaches `orb-touch`; tap stored pearl -> gold, but running states hid the idle color |
| Today orb (body, idle color, OR3 gestures, OR4 sync) on generation screens | Both | DayOrb state tests, GenerationOrb / GenerationCore composition tests | FRESH PASS web 7 + 1, mobile 11 + 2 |
| State shown by behaviour from coreModel mapping; Today unchanged without state | Both | coreModel level tests; exact Today uniforms without state | FRESH PASS web 2, mobile 2 |
| Real browser: canvas, center hit target, tap changes stored key, numberless list, animated current segment, Reduce Motion still | Web | `generation-screen.browser.test.ts` at 1440 and 390 | FRESH PASS 3/3 |
| Vertical step bar, progress-in-step, count moved, sr state word | Web | generation-screen tests | FRESH PASS |
| Fast tail: ordered reveal, never ahead of the server, RM instant, Library open not delayed | Web | `stepRevealQueue` unit tests + mounted fake-timer test | FRESH PASS |
| Compact progress bar and caption, hidden when stalled/failed/done | Mobile | GenerationScreen tests | FRESH PASS |
| Gates | Repo | Exact prompt suites | See below |
| Production and physical acceptance | Owner | Rollout/device checks | NOT RUN; UNVERIFIED (owner to confirm) |

## STEP 0 finding

The prompt's candidates (dynamic placeholder, pane stacking, status overlap,
inset math, WebGL fallback) were all ruled out locally: the canvas mounts,
`document.elementFromPoint` at the orb center returns the ball-only
`orb-touch` layer at both widths, and a tap writes the next color key. The
cause of "does nothing" is visual: the Knowledge Core passes the remembered
idle color only in the `idle` state (OR2 rule), and a generation page is
never idle, so a tap changed storage with no visible result; the 0.12 ripple
is masked by the full-speed generation spin and turbulent liquid. Whether the
deployed site even includes OR2/OR3b pointer handling is UNVERIFIED (owner to
confirm).

Fix: the generation screens render the Today DayOrb, which always shows the
remembered color, with an optional `state` that adds the Knowledge Core's
excess over its own idle profile (life, glow, spin, liquid rate, shimmer) and
eases with the same constants. Failure eases `error` to 1 (the existing
desaturated, glow-off tint wins over the idle color) and the loop stops.
Completion flashes glow briefly (about 1 s) and then renders exactly as idle
Today. Reduce Motion snaps levels, no flash, no ambient loop.

## Gates (final, FRESH)

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached (run with `--env-mode=loose` so the local network guard reaches every task; repeated at closure) |
| `npm run lint -- --force` | PASS 8/8 tasks, 0 cached, 0 errors, 6 pre-existing warnings (web library.tsx unused useMemo; 5 mobile test import/first); repeated at closure |
| `npm run test --workspace @stay-focused/shared` | PASS 59 files, 614 tests |
| `npm run test --workspace @stay-focused/api` | PASS 213 files, 2452 passed / 3 intentional live skips (`--maxWorkers=2`) |
| `npm run test --workspace @stay-focused/mobile` | PASS 166 files, 1580 tests |
| `npm run test --workspace @stay-focused/web` | PASS 66 files, 435 tests (rerun after one repair, below) |
| `npm run build --workspace @stay-focused/api` | PASS, 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android bundle exported to dist |
| `git diff --check` | PASS, baseline-to-HEAD and staged |
| Additional `npm run build -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached |

Failed first attempt: the first full web run was 65/66 files, 430 passed /
5 failed, all in `generationRecovery.test.ts` with `window.matchMedia is not
a function`. That suite renders GenerationScreen with a bare EventTarget
window; the new step reveal reads prefers-reduced-motion. Commit 4063c883
adds `matchMedia` to that stub (no assertion changed); the rerun passed
435/435. Focused runs before the gates did not include that file. Earlier
local attempts during implementation: a mobile test placed `vi.hoisted`
in a file without a `vi` import (moved to its own file); the browser test
first failed on an unresolved virtual entry id and then a dev JSX runtime
mismatch (fixed in the test's build config); a sibling-order assertion was
corrected to look at the GenerationProgress instance. Builds regenerated
`apps/api/next-env.d.ts` and `apps/web/next-env.d.ts`; both were restored.

## Notes

- Web Queue: the 26px topbar Queue button icon is a static PNG, not a
  renderer, so it is unchanged. The generation view opened from Queue is the
  same GenerationScreen and uses the Today orb.
- Knowledge Core files stay: mobile's lab screen still uses
  `generation-core/KnowledgeCore`; web `knowledge-core/KnowledgeCore.tsx` is
  no longer imported by production code but is kept with its tests (its
  orbBody/orbAura/coreModel/orbInteraction modules are shared by DayOrb).
- Mobile skeleton reuse: mobile skeletons are the shared `SkeletonBlock`
  opacity shimmer (no gradient library), so the compact bar reuses it rather
  than a sliding gradient; it holds still under Reduce Motion.
- The web Library open is now keyed by the saved artifact id, so step-reveal
  re-renders and polls can no longer cancel the existing 1400ms wait. The
  redirect is never delayed: the reported 5 -> done tail (4 x 180ms) ends
  well before it, and only a queued -> done jump (8 x 180ms) would still be
  ticking when Library opens.
