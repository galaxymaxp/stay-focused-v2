# OL1 - Website orb loads whole

## Scope and baseline (before edits)

Owner prompt: tmp/overnight/prompts/OL1.md, read in full. Owner roadmap read
in full: `C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused\overnight\roadmaps\2026-10-21-orb-theme-glow-scroll-tabs-legal.md`.
Finite scope: STEP 0-2, serial local gates, reconciled docs and local commits.
No service access, environment-file edits, rollout, migration application,
push or device checks. Existing Owner Pause and unrelated work are preserved.

Branch: overnight/2026-10-15_feedback (matches). HEAD: 4de209d9, after OT1/OG1.
Local upstream evidence: github/main, ahead 4 / behind 9; no remote refresh.
Author: galaxymaxp <omgraythekid@gmail.com>. Node 24.16.0. Root AGENTS.md and
AUTOPILOT.md read; no nested AGENTS.md found. Existing scripts are local builds,
TypeScript, ESLint and Vitest. Use repository-local TEMP/TMP, offline Expo,
disabled telemetry and the existing loopback-only Node network guard.

`git log --oneline -8`:

```text
4de209d9 docs(orb): close OG1 local acceptance and gates
0e06266f fix(orb): soften standalone generation glow
03355b65 docs(orb): close OT1 local acceptance and gates
45526e95 fix(orb): unify palette appearance and light clock tint
32206c16 docs(generation): close GV1 local acceptance and gates
8b37b5ae fix(generation): fit active pages to measured viewports
1d3c5cfc docs(orb): close OP2 local acceptance and gates
9e17fd4d feat(orb): refine glass time, cumulative waves and ambient backdrop
```

`git status --short`:

```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

These untracked owner paths and ignored tmp/ must never be staged.

## STEP 0 confirmed cause

- Web DeferredDayOrb.tsx:32-35 waits two animation frames before requesting the
  split DayOrb module; :49 replaces the still immediately when the module loads,
  before a GL frame exists. Its :53 initial poster hardcodes light appearance.
- Web DayOrb.tsx:98-101 inserts an initially clear canvas. :204 loads the clock
  atlas asynchronously, then :290 captures the body/aura and :299 renders them
  even when the atlas/compositor is not available. :294 independently reports
  glass readiness only after its later composite draw. DayRingClock.tsx:441-444
  switches the real time text separately. This is the confirmed visible partial
  scene; shader body and OA1/OP2 aura themselves share one scene and are not
  separate network layers. GL1 atlas is a bundled local PNG, independent of
  self-hosted Inter Clock fonts (globals.css:2034 onward).
- GenerationOrb.tsx:5 statically imports DayOrb and :32 mounts it directly.
  Generation has no glass atlas; its gap is a clear canvas before the first
  body+aura frame, rather than three independent GL layers. Moving it onto the
  existing dynamic boundary keeps Three.js out of the entry bundle.
- Mobile DayOrb.tsx:128-130 shows GLView immediately. :169 awaits the atlas,
  but :245-255 presents body/aura via endFrameEXP before glass exists. This
  confirms the same clock first-frame pattern in source. Apply the gate to
  mobile Today and Generation; native GPU appearance remains unverified.
- OT1 theme/palette resolver and OG1 explicit clock/standalone profiles already
  exist. Reuse them; no product decision or contradictory prerequisite found.

FRESH baseline Playwright: actual DayRingClock and GenerationOrb components,
production CSS/shaders, Vite split chunks, local fictional state only. Chromium
software WebGL; CDP cache disabled, 4x CPU, Slow 4G (150ms, 200000 B/s down,
93750 B/s up), and an explicit extra 1800ms atlas response delay to expose the
race deterministically. Cold load, hard reload, component route switches in
light/dark gold: 12 sequences, frames and per-rAF scene/visibility samples in
tmp/overnight/OL1-before/. Today sequences contain visible body-only frames;
Generation reaches one complete no-clock scene. This harness exercises actual
route components, not Next's router or auth/network. No production calls.
Baseline source refs above refer to 4de209d9.

First visual invocation failed before starting because Windows NODE_OPTIONS
backslashes were parsed away. Forward-slash quoted preload paths repaired it;
the successful baseline used the network guard. Both logs are retained in tmp/.

## Acceptance matrix before edits

| Requirement | Owning layer | Proof needed | Initial result |
| --- | --- | --- | --- |
| Single current-palette/theme poster while loading | Web/native presentation | Frames, theme/palette tests | FAIL: immediate canvas replacement |
| Body, aura and requested atlas ready before reveal | Existing scene loop | First-frame tests and render probes | FAIL: body renders before atlas |
| One ~250ms fade; instant Reduce Motion | Presentation | Browser/animation tests | NOT RUN |
| Early split-chunk/atlas request | Web loading boundary | Request order and bundle inspection | FAIL: deferred waterfall |
| Failure/timeout final poster, log once, dispose | Loading lifecycle | Tests for all failure paths | NOT RUN |
| Same gate on mobile when applicable | Expo GL loop | endFrameEXP ordering/component tests | Applicable by source; NOT RUN |
| Light/dark cold/reload/route frame sequences | Browser | Before/after images and visibility samples | Baseline reproduced |
| Serial gates, scoped commits and docs | Repository | Exact results below at closure | NOT RUN |
| Realme/slow website owner acceptance and rollout | Owner | Separate review | NOT RUN; skipped entirely |

## Implementation and final evidence

Web DayOrb now retains a complete OT1 palette/theme poster and hides the canvas
until the first successful body/aura/optional glass composite. The exact CSS
poster is used across the deferred boundary, so loading the module cannot expose
an empty canvas. CSS resolves theme synchronously and the event wake updates
palette on the poster as well as the scene without competing for the wake ref.
The whole canvas fades in over 250ms while the poster fades out. Plain real
clock text fades alongside its glass replacement and remains accessible.
Reduce Motion removes the transition; Generation retains its one live frame,
and the deferred clock's existing static no-readout behavior and deliberate
held/ring pose behavior remain.

Both Today and Generation now request DayOrb through the dynamic boundary.
The chunk and Today atlas image request start together in the route component's
effect, before data readiness. Three remains split; request-order and dynamic
import assertions cover it. Readiness is based on a rendered frame, never merely
on module load or texture arrival. No partial clock scene is submitted even to
the hidden canvas while its atlas is pending.

FRESH production Next bundle inspection also finds one renderer-bearing async
chunk, static/chunks/9d78c252.e8fa1c3f0dfafd00.js, absent from the initial chunk
sets for Today and all Generate/Generation routes (including layout chunks).
The saved manifest-derived record is tmp/overnight/OL1-next-boundary.json.

The shared lifecycle owns a 12-second active loading deadline, rejects late
readiness after failure/disposal, cancels its timer on success and logs one
fixed safe warning per failed gate. Chunk, atlas, compositor, shader, render,
context and timeout failures keep the poster, withdraw glass readiness and
dispose the scene. Hidden loading scenes suspend the deadline. A chunk loading
deadline and the subsequent first-frame deadline are separate bounded phases.
No raw renderer/provider exception is logged by the gate.

Mobile uses the same deadline and gates reveal only after endFrameEXP succeeds.
The body and source-coupled aura share the existing GLView/scene/loop; no new
frame loop or per-frame React state is added. A native-driver 250ms opacity
animation fades the complete surface; Reduce Motion snaps it. Plain accessible
time remains visible through the fade, then yields to the glass. Existing render
scale, cadence, OG1 padding, gesture refs, palette/theme and AppState/focus
policies are preserved. Static posters keep current mode and palette on failure.

FRESH focused results: web component suites 20/20 across 3 files; mobile DayOrb
25/25; shared lifecycle 4/4; browser loading suite 7/7. Browser regressions cover
12 Slow-4G cold/reload/route cases, parallel atlas/chunk requests, a 250ms complete
surface crossfade, WebGL/atlas/chunk/timeout final posters, theme/palette fallback,
one safe warning and instant/change-only Reduce Motion. Evidence is ignored
under tmp/overnight/OL1-regressions/.

Before/after CDP screencasts have 12 sequences each in OL1-before/ and OL1-after/.
They contain 164 before / 137 after screencast images and 3343 / 4086 rAF samples.
All 6 baseline Today sequences contain partial samples (104,107,111 light;
134,136,139 dark); all 12 after sequences contain zero visible partial clock
frames. OL1-before-contact.png and OL1-after-contact.png were inspected: a
complete gold poster stays intact, then one complete light/dark orb emerges.
Generation's original clear-first-frame gap becomes the same poster-to-live
transition. The harness uses actual route components with synthetic component
switches, not Next Router/auth/production integration. Native GPU/physical
appearance and performance remain UNVERIFIED (owner to confirm).

### Failed first attempts and repairs

- First web component run: 9 failed / 8 passed (1 failed, 2 passed files). The
  pre-existing DOM node mock lacked style.setProperty for the new poster ref;
  supplied the real DOM shape. Follow-up 17/17 and expanded 20/20 pass.
- First browser suite: beforeAll failed, 7 cases skipped. The split-import
  assertion assumed double quotes while Vite emitted backticks. It now accepts
  JavaScript quote syntax while still requiring a dynamic DayOrb chunk; all 7
  browser cases then pass with unchanged rendering assertions.
- Focused mobile typecheck: 3 TS2769 errors in newly added act callbacks returning
  VitestUtils. Changed callbacks to return void; types remain strict.
- Initial focused web lint: 3 warnings, including 2 new hook dependency warnings.
  Destructured the stable lifecycle callbacks rather than depending on a new
  object or disabling rules. Baseline is 1 web + 5 mobile warnings.

Full serial gate results and local commit IDs are recorded below.

First full forced typecheck/lint both passed 8/8 tasks, 0 cached, with six
existing warnings. Review then found that reusing the deferred boundary had
made standalone Generation static under Reduce Motion. The OL1 runner and only
its descendants were stopped during the root build (INTERRUPTED, not a build
PASS). The standalone path now explicitly requests its existing change-only
live pose and has a new regression. No assertion was weakened. Final serial
gates restart from typecheck on the final source; the first logs are retained.

All nine requested serial gates then passed (shared 696/72 files, mobile
1616/169, web 561/73, forced root checks 8/8 each, web 23/23 and Android HBC).
A final installed Expo GL source audit found that GLView.kt:63-68 resets its
surface-create flag after destroying a context, allowing a second context in
the same React component. Native now rejects duplicate/replacement context
callbacks: a replacement is context loss and withdraws the ready canvas to the
final poster, rather than reusing old readiness for a clear canvas. A native
regression checks the withdrawal, no new frame and one safe warning.

Only native DayOrb and its test changed in this last repair. The forced root
typecheck/lint/build, full native suite, explicit Android export and diff check
were rerun serially for it. Shared/web source hashes are unchanged; their fresh
full suites and explicit web build from the complete serial run remain valid
and are NOT RUN again for this native-only repair. Pre-repair logs and results
are retained as OL1-gate-*-before-context-guard.log and the matching JSON.

### Resume audit and final Android export

The interrupted session completed final root typecheck/lint/build and the
1617-test native suite, but its separate Android export stopped at Metro startup.
OL1-gates.json still held the earlier successful Android entry while its log had
been overwritten. The resume audited log completion rather than accepting that
stale entry. The incomplete log is retained as
OL1-gate-android-build-interrupted.log. Only the unfinished explicit Android
export was rerun, with the same offline Expo settings, repository TEMP/TMP and
loopback-only Node guard: FRESH PASS, exit 0, 60.127s, Android HBC exported.
The manifest was updated with this result. No committed work or unchanged suite
was repeated. A resume evidence-inspection one-liner initially failed on
PowerShell/Node quote handling; a literal here-string succeeded. This was an
inspection command, not an implementation gate.

All 16 owned source hashes and the exact staged file list were checked.
The only source changes after the first full serial run were native DayOrb
and its test, matching the affected reruns. React/Next review confirms client
boundaries, stable event callbacks, effect cleanup, accessible real time text,
opacity-only transitions and the retained dynamic renderer boundary.

## Final serial gates and acceptance

Implementation: e54f11d0 fix(orb): reveal only complete orb frames.
Documentation: docs(orb): close OL1 local acceptance and gates (following scoped
commit; exact hash in Git and tmp/overnight/OL1.status).

| Exact command | Result | Evidence | Log under tmp/overnight/ |
| --- | --- | --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached | FRESH | OL1-gate-typecheck.log |
| `npm run lint -- --force` | PASS 8/8 tasks, 0 cached; 6 existing warnings | FRESH | OL1-gate-lint.log |
| `npm run build -- --force --concurrency=1` | PASS 8/8 tasks, 0 cached; API 37/37, web 23/23, mobile exports | FRESH | OL1-gate-build.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | PASS 696/696 tests, 72 files; includes compiled copies | FRESH | OL1-gate-shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | PASS 1617/1617 tests, 169 files | FRESH | OL1-gate-mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | PASS 561/561 tests, 73 files | FRESH | OL1-gate-web.log |
| `npm run build --workspace @stay-focused/web` | PASS 23/23 pages | FRESH | OL1-gate-web-build.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS Android HBC export | FRESH | OL1-gate-android-build.log |
| `git diff --check` | PASS exit 0 | FRESH | OL1-gate-diff.log |
| `git diff --cached --check` | PASS exit 0 before each scoped commit | FRESH | Code/doc staging checks |
| Relevant API tests | No API, auth, request, schema or backend behavior changed | NOT APPLICABLE | Client-only scope |

Final root build wall time: 281.693s. All
implementation suites pass without skips. Turbo work is FRESH, with 0 cached
tasks; normal compiler/bundler internal caches are permitted. Shared includes
348 source tests plus compiled copies. All 16 owned source hashes match
the final serial run. Generated Next declarations were inspected/restored;
no generated artifact, private fixture, credential or tmp/ file is staged.
Documentation-only closure did not rerun unchanged implementation gates.
Final documentation diff/staged checks are FRESH.

| Final requirement | Verdict and evidence |
| --- | --- |
| One current-theme/palette poster, then complete scene | PASS locally; before/after frames and renderer readiness tests |
| Body, aura and requested atlas before reveal | PASS; no partial clock draws; native endFrameEXP ordering test |
| ~250ms whole-surface transition, instant Reduce Motion | PASS local CSS/native driver tests; real browser intermediate opacity samples |
| Early chunk/atlas requests; SP2b split retained | PASS; browser request order and production Next bundle inspection |
| GL/atlas/chunk/timeout failure, once-only warning and final poster | PASS; 4 browser failure cases, shared late/disposal tests, native fallback tests |
| Clock/standalone appearance, time accessibility, gestures/lifecycle | PASS locally; full platform suites and existing OP2/OG1 browser regressions |
| Cold, hard reload and client component switches, both themes | PASS local software WebGL, 12 paired sequences plus 12 regression scenarios |
| Exact serial gates, docs and local commits | PASS; table above, both commits in Git/OL1.status |
| Native/physical, real Next Router/auth/production, live state | UNVERIFIED (owner to confirm); explicit owner scope below |
| Rollout and Device checks | NOT RUN; skipped entirely |

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Review local commits/evidence and separately
  initiate any publication. Nothing is pushed, deployed, migrated or published.
- Device checks: NOT RUN, skipped entirely. Website on a genuinely slow
  connection: Today/Generation cold load, hard reload and real route navigation,
  both themes and saved palettes; failure fallback, Reduce Motion and gestures.
  Mobile changed by the confirmed first-frame pattern: Realme Today/Generation,
  complete first frame, glass/plain text, themes/palettes, fade, failure,
  AppState/focus, touch, native GPU/frame/power behavior. No install was attempted.
- Physical/native appearance and performance, real Next Router/auth/production
  behavior, deployed revisions and live preference/database/Scheduler state are
  UNVERIFIED (owner to confirm). Software Chromium and RN tests do not prove them.
  Installed Expo GL Android uses TextureView (GLView.kt:20), which supports
  compositing; this source observation does not establish physical fade quality.
- The Vercel CLI is not installed. For a separately authorized future rollout,
  strongly recommend `npm i -g vercel` to enable env pull, deploy and logs.
  No CLI install or Vercel command was run in OL1.
- Original UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored tmp/ remain
  untouched by staging; Owner Pause is preserved. OL1 ends at local closure;
  RS1 and all later items are outside this run.
