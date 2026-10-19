# OR3b orb interaction acceptance

**Status: PASS for the finite unattended local code scope (2026-10-19).** Finite endpoint: STEP 0-5,
regressions, every prompt gate, the AUTOPILOT forced root build, docs and local
commits. Rollout and Device checks are excluded by the UNATTENDED rules.
Baseline 6cfeabb, branch overnight/2026-10-15_feedback retained. No later task.

## Preflight and scope

Read OR3b in full and reused be9d5dc / OR3.progress and the existing
[OR3 preflight](or3-orb-momentum-preflight.md); its actual location is
`docs/ai/acceptance/`, not the prompt's stale `docs/acceptance/` path. The explicit
owner answer resolves the 1.4-second conflict with 0.4 seconds. Both existing
ring handlers reach their orb handle. No other implementation contradiction or
tracked owner edit was found. Initial untracked UI/, apps/mobile/.gitignore and
supabase/.temp/ remain preserved. Cached upstream was ahead 44 / behind 2,
without fetch. Latest handoffs and OR1b, TC1b, OR2 / ADR-048 were reviewed.

Bodies use world-space uLight for emission and inverse uSpin for liquid.
Today passes tones.position; generation defaults to centered light. Both aura
adapters accept per-frame offsets. Installed native SVG Stop.setNativeProps
calls parent.forceUpdate and cannot set stop colors through that API. The
approved fallback removes the Today aura mesh on both apps and the mobile SVG
halo. The generation aura is retained and tracks the body's exact idle tint;
its centered light remains centered under rotation. No required platform
feature is skipped. Native halo-center animation is NOT APPLICABLE after
removal. See [ADR-048 follow-up](../../architecture/ADR-048-orb-interaction.md).

## Acceptance matrix

| Requirement | Local proof | Result |
| --- | --- | --- |
| Smoothed capped velocity, held pause, release/cancel/RM | Shared model and gesture tests | FRESH PASS |
| 6 rad/s 2.5-5s, 1 rad/s under 2s | 10ms stepping; 0.4s time constant / 0.01 cutoff | FRESH PASS (2.56s / 1.85s) |
| Ring sign, gain, edges/block, no snap impulses | Actual mounted ring handlers on both platforms + shared continuity | FRESH PASS |
| Mobile ring and coast render during page touch | Mounted Today scene tests | FRESH PASS |
| Traveling ripple, restarts, endpoint off, normals | Shared/body tests, exact shader parity and local WebGL | FRESH PASS |
| Disconnected Today glow removed on both platforms | Actual scene tests; no aura mesh or native SVG halo | FRESH PASS |
| Generation tint/state precedence | Actual mounted renderer tests + aura reset tests on both apps | FRESH PASS |
| Pearl default, cycle, stable keys, legacy 0..3, bad storage | Shared + both adapters, native late/queued-write regressions | FRESH PASS |
| Cadence returns, reduced motion still frame, lifecycle cleanup | Mounted renderer tests on both platforms | FRESH PASS |
| Exact full gates and scoped commits | Gate table below / final handoff | FRESH PASS |

All required source files and affected OR2 tests were inspected. Updated old
first-color/index, 650ms bulge, two-second friction and renderer uniform/halo
expectations. Added mounted ring and browser generation/Today scene coverage.
React review applied: refs carry per-frame work, stable handles and complete
effect dependencies, scene cleanup/cancellation, unchanged decorative targets
and existing deferred WebGL loading; no React state updates per frame.

## Extra local shader proof

`node tmp/overnight/OR3b-shader.cjs`: FRESH PASS, 5/5 assertions, 0 page/shader
errors, non-loopback requests denied. Real Three/WebGL renderer in local
headless Chromium, identical shader source used by both apps. Off vs zero,
900ms endpoint and original baseline shader with zero bulge: 0 differing byte
channels each. Active ripple: 37,260 changed channels; baseline has 49,726 lit
channels. This proves compilation/endpoint parity and visible displacement,
not Realme appearance or the final physical feel.

## Verification attempts (retained, not hidden)

- Initial `python` edit launch failed: Windows alias had no interpreter. It made
  no edits; `py` is available and was used. A subsequent test-edit script
  stopped on a stale test-title match before changing tests; corrected it.
- First shared build: exit 2, two removed-export diagnostics from tests that
  still referenced orbBulge/parseOrbColor. Tests were then migrated; rebuild
  passed. No type validation was weakened.
- First focused mobile: 24/24 PASS. Added ring/storage focused: 17/17 PASS.
- First focused web: 9 pass / 4 fail, two additional suites failed to collect:
  an edit script accidentally copied mobile renderer text to web orbBody.ts;
  restoring the identical body shader fixed collection/parity. The ring mock
  also omitted rectangle.height. Intermediate retry: 18 pass / 3 fail; adding
  the real geometry dimension fixed all ring cases. Final focused 24/24 PASS.
- First new web generation fixture: 0 pass / 7 fail in teardown because the
  renderer mock omitted forceContextLoss. Corrected mock: 7/7 PASS. Native
  generation tint suite 7/7 PASS, web Today 2/2 PASS.
- First full shared gate: 598 pass / 4 fail, 57 pass / 1 failed files. Only
  stale generated dist/orb-interaction.test.js failed (old 9 tests), against
  freshly emitted model code from the early failed build. Rebuilding shared
  refreshed generated tests; full suite 610/610 PASS, 58 files. Generated
  copies remain uncommitted; the final total includes source and dist copies.
- Final focused mobile after queued-write ordering fix: 28/28 PASS, 4 files.

The first documentation-finalizer attempt stopped on Windows cp1252 decoding
a pre-existing UTF-8 planning file. It changed no planning file; running the
same script with `py -X utf8` completed safely. This was a documentation
script launch failure, not an implementation gate failure.

## Gates and closure

**Prompt gates: 10/10 PASS**, plus the additional AUTOPILOT forced root build.
Every workspace has a test script. No cached result is called fresh. Evidence
applies to implementation tip 445fcb2f; later changes are documentation only.

| Exact command | FRESH final result |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; closure repeat |
| `npm run lint -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; closure repeat |
| `npm run test --workspace @stay-focused/shared` | PASS, 610/610 tests, 58 files; includes generated copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1558/1558 tests, 163 files |
| `npm run test --workspace @stay-focused/web` | PASS, 411/411 tests, 63 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android export |
| `git diff --check` / `git diff --cached --check` | PASS, 0 whitespace errors; closure repeated |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; local Android/iOS/web exports |

No separate API workflow/provider contract check applies: those boundaries are
unchanged. API live flags were explicitly disabled, with all 3 live cases
skipped. Tests use local fixtures and mocked boundaries. Turbo loose env mode
preserves the ignored outbound HTTP(S)/fetch/socket blocker; Expo is offline,
telemetry disabled, temporary directories inside the repo. No deployment or
provider script was executed. Generated Next declarations were inspected and
restored; compiled tests, exports, logs and all tmp files are uncommitted.

All commits use --author='galaxymaxp <omgraythekid@gmail.com>':

- `d0a4c65 feat(shared): add orb momentum ring spin and palette keys`
- `4c3fdbe feat(orb): replace tap bulge with traveling ripple shaders`
- `1a0b512 feat(mobile): connect orb momentum ripple and ring input`
- `445fcb2f feat(web): connect orb momentum ripple and ring input`
- `docs: complete OR3b orb interaction handoff` (final hash in Git and
  ignored `tmp/overnight/OR3b.status`; no self-hash amendment).

Initial forced typecheck/lint passed, but early lint had one introduced unused
CLOCK import (7 warnings total); it was removed, leaving the 6 existing warnings.
Final typecheck/lint were repeated after queued-write/lifecycle and deferred
Reduce Motion ring handling changes. Earlier successful repeats are retained
in ignored logs. No remaining nondeterministic flake was established. Vite
config, React renderer and Expo color warnings remain non-failing.

`node tmp/overnight/OR3b-native-halo-probe.cjs`: FRESH PASS, 2/2 assertions
against the installed Stop implementation: new stopColor ignored and parent
forceUpdate invoked. This supports the approved removal fallback without
claiming that a custom native gradient encoding can never be built.

Current-state, roadmap and sprint reconcile OR3b and resolve the old OR3 STOP.
ADR-048 has the requested follow-up. No API, auth/RLS, schema/migration,
source content, dependency, design token or release-version change. No later
slice started; only owner rollout and physical acceptance remain.


## Owner steps remaining

- Rollout - NOT RUN, skipped entirely: review local commits and separately
  choose web/mobile publication through the existing owner release process.
- Device checks - NOT RUN, skipped entirely: Realme and desktop hard/gentle
  flicks, ring edges/block and move-hold-move-release, ripple, approved absence
  of Today glow, pearl default, preserved old gold, Reduce Motion, scrolling,
  visibility/navigation and power. No local test claims physical acceptance.
- UNVERIFIED (owner to confirm): deployed/installed revisions, production DB
  and applied migrations, Cloud Scheduler, remote-ref freshness and actual
  device/browser behavior. No live state was queried or inferred from tests.

No service call, deployment, remote SQL/migration application, Scheduler,
email, environment-file change, branch switch or push is authorized or run.
Ignored tmp progress/status/logs and all generated output stay uncommitted.
