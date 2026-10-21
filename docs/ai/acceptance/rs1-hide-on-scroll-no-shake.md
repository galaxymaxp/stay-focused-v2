# RS1 - Layout-stable hide-on-scroll search

## Scope and baseline (before implementation)

Read the full prompt tmp/overnight/prompts/RS1.md and full owner roadmap:
`C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused\overnight\roadmaps\2026-10-21-orb-theme-glow-scroll-tabs-legal.md`.
Only RS1 STEP 0-3, local serial gates, docs and local commits are authorized.
Rollout and Device checks are skipped entirely. No questions, provider/service
calls, environment-file edits, deployment, migration application or push.
Root AGENTS.md, AUTOPILOT.md, newest handoffs and current planning entries read.
No nested AGENTS.md. Branch matches overnight/2026-10-15_feedback. HEAD 2764ce02.
Upstream github/main: ahead 6, behind 9 (local metadata; no remote refresh).
Git identity galaxymaxp <omgraythekid@gmail.com>; explicit --author for commits.
Original untracked owner paths are preserved and excluded from staging.

Baseline `git log --oneline -8`:
```text
2764ce02 docs(orb): close OL1 local acceptance and gates
e54f11d0 fix(orb): reveal only complete orb frames
4de209d9 docs(orb): close OG1 local acceptance and gates
0e06266f fix(orb): soften standalone generation glow
03355b65 docs(orb): close OT1 local acceptance and gates
45526e95 fix(orb): unify palette appearance and light clock tint
32206c16 docs(generation): close GV1 local acceptance and gates
8b37b5ae fix(generation): fit active pages to measured viewports
```
Baseline `git status --short`:
```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

## STEP 0 confirmed inventory and cause

- Mobile shared hook apps/mobile/src/design/useHideOnScroll.ts:19-34 computes
  visibility on JS. Hide requires y > measured height + 24 and >8pt accumulated
  downward movement; show requires >8pt upward. :52 changes React state only
  on visibility transitions (not every event), but :64-71 animates layout height
  with useNativeDriver:false. :102-105 interpolates height and opacity.
- Page primitives.tsx:257-258 enables this path; :315-340 puts the changing
  height above ScrollView, changing viewport geometry while scrolling. This
  confirms the roadmap layout-feedback hypothesis. Existing bottom-clamp logic
  mitigates one correction case but cannot make changing layout stable.
- All opted-in mobile users: ReviewerReader.tsx:318 (find-in-page),
  GenerateScreen.tsx:134 (GS1 course search), LibraryScreen.tsx:308,
  TodayScreen.tsx:285, TasksScreen.tsx:54 and :124 (course Tasks). All migrate
  through Page. No other hide-on-scroll consumer found by source search.
  Reviewer and Generate already force visibility during focus/query; preserve it.
- Web use-hide-on-scroll.ts:7-12 already accumulates 12px hysteresis, with
  transform/opacity only at :60-65; Generate.tsx:178 uses it. globals.css:4488
  uses a sticky in-flow slot, so no native height-feedback bug exists there.
  Convert to measured overlay/constant slot at phone width, desktop unchanged.
- Web reviewer-reader.tsx:338 has a static phone search (globals.css:3686),
  desktop sticky TOC (:3063). Add the shared phone overlay path to its search,
  preserving desktop TOC, query, match controls and focus.
- Reanimated 4.5.1 is installed. Installed useAnimatedScrollHandler.ts documents
  UI-thread scroll/begin/end/momentum worklets; use this existing dependency.
- Before scripted native reproduction: no native/emulator evidence yet. Physical
  device checks excluded. Production state UNVERIFIED (owner to confirm).

## Acceptance matrix (final local scope)

| Requirement | Owning layer / proof | Final local result |
|---|---|---|
| Every mobile consumer: absolute transform, constant measured inset | Page + hook, component/layout proof | FRESH PASS (evidence below) |
| Finger-following clamp on UI thread, no per-scroll React update | Reanimated handler + deterministic tests | FRESH PASS (evidence below) |
| End/momentum snap, top, focus/query, short lists, resize | Hook + regression tests | FRESH PASS (evidence below) |
| Reduce Motion: instant endpoints without slide | Native/web regression | FRESH PASS (evidence below) |
| Phone web overlay, 12px hysteresis, desktop unchanged | Shared web hook + Generate/Reviewer + local browser | FRESH PASS (evidence below) |
| Slow/fast drags and before/after frames | Local narrow browser; native if available | FRESH PASS web; native UNVERIFIED (owner to confirm) |
| Required serial gates and explicit API applicability | Exact commands/counts below | FRESH PASS (evidence below) |
| Rollout / Device checks | Owner steps remaining | NOT RUN (excluded) |

## Execution conventions

Inspect scripts before running. Repository-local TEMP/TMP, EXPO_OFFLINE=1,
telemetry disabled and loopback-only Node guard for all builds/browser work.
No API/auth/data/backend changes are planned. Generated outputs and evidence
stay ignored under tmp/overnight/RS1-*; only explicit owned paths are staged.

## Implementation and local evidence

Mobile Page now places its opted-in secondary header absolutely inside a clipped
scroll viewport; only translateY moves. Scroll content keeps paddingTop equal
to the natural measured header height. The primary header, fixed controls,
footer, scroll ref, refresh, raw touches, scrubber and existing observers remain.
The common Reanimated handler owns clamped deltas, bounce bounds, endpoint snap
on drag/momentum end, top/short-list restoration, and focus/query pinning.
Animated native accessibility/hit-test props hide fully offscreen descendants;
there is no React visibility state or per-scroll header setState. React state
only records real header measurements. Reduce Motion renders instant endpoints
while keeping the inset and same clamped travel model. Preference/force changes
and unmount cancel pending snaps. Every inventoried Page consumer inherits it.
Existing Reviewer current-topic and scrubber JS observers are preserved; their
pre-existing React behavior is outside the header-motion path.

Phone web uses the shared hook for Generate and Reviewer with an absolute search
inside a measured constant sticky slot. ResizeObserver handles font/width changes.
12px accumulated direction hysteresis, focus/raw/deferred query pinning, inert /
aria-hidden, passive listeners, cleanup and instant reduced-motion endpoints
remain. Empty sticky slots do not intercept content clicks. Above 760px the
wrapper uses display:contents and no search transform; desktop TOC/search and
Generate flex sizing are preserved. No token, glass, API/auth/data change.

FRESH focused proof before serial gates:
- Mobile useHideOnScroll.test.ts + primitives.test.ts: 29/29 tests, 2/2 files.
  Deterministic Node Reanimated boundary tests check slow deltas, fast clamps,
  bounce, snap, top/short lists/resize, focus/query/disabled state, measured
  inset, accessibility and no React render during 140 scroll callbacks.
- Web use-hide-on-scroll.test.ts + generate.test.ts +
  hide-on-scroll.browser.test.ts: 32/32 tests, 3/3 files, including 4 browser cases.
  Browser uses production hook and actual CSS with synthetic Generate/Reviewer
  layout/content. Chromium wheel input at 390x844 covers 36 x 1px down, 650px
  fling, 11 x 1px reverse (still hidden), 12th reverse (shown), top return,
  focus/query, 92px resize, 1200px desktop and reduced motion. Each slow sample
  keeps the first row document Y and measured slot height exactly constant;
  visibility changes once, with no oscillation. This is real DOM scroll/layout
  proof, not authenticated route or physical/native performance acceptance.
- Before frames: tmp/overnight/RS1-before/ (4 PNGs), baseline 2764ce02 web hook
  and CSS; no mobile shaking claim from browser baseline. After frames:
  tmp/overnight/RS1-after/ (7 PNGs plus two 36-sample JSON traces). Shown,
  hidden and reverse captures were visually inspected. Blank input text in this
  synthetic fixture is intentional; production search labels/copy are unchanged.
- No running emulator process found. Native/emulator visual reproduction and
  before/after native frames: UNVERIFIED (owner to confirm). Device checks
  excluded entirely; no physical device command or install attempted.

Retained failed attempts (not final closure evidence):
1. First focused mobile command did not start Vitest: Windows backslashes in
   NODE_OPTIONS made Node unable to resolve the local network guard. Fixed the
   guard path to forward slashes. No provider/network request occurred.
2. First actual focused native run: 28 passed / 1 failed across 2 files. The
   Node test proxy falsely reported every property as present, failing the
   assertion that the animated style has no height. Fixed the stub descriptor
   to report only actual keys; retained the assertion. Next run 29/29 PASS.
3. First mobile typecheck: 4 test-only errors (opaque animated style handle and
   optional harness prop inference). Explicit boundary type and non-null prop
   type repaired them; next mobile typecheck PASS.
4. First web typecheck: 2 test-only implicit-array inference errors. Added the
   actual metrics return type to the trace array; forced root gate covers it.
5. Baseline screenshot builder failed before rendering: virtual TypeScript
   module parsed as JS. Transpiled that baseline module with installed TS;
   second baseline run PASS. Both logs retained.
No assertion was weakened to bypass a failure. Existing deprecation/config
warnings remain visible in test logs. Final serial results follow below.

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Review local commits/evidence and separately
  authorize any publication. No deploy, OTA/EAS, remote SQL/migration, Scheduler
  operation, service call, environment-file edit or push occurred.
- Device checks: NOT RUN, skipped entirely. Owner Realme acceptance: very slow
  down/up and fast reviewer/Generate drags, snap, focus/query, top, short results,
  font/width changes, Reduce Motion, scrubber, pull refresh and accessibility;
  smoke-check Today/Library/Tasks secondary headers as other migrated consumers.
- Native UI-thread execution/rendering, physical performance, actual authenticated
  web routes and production/deployed/live database/Scheduler state are
  UNVERIFIED (owner to confirm). Unit/Chromium results do not establish them.
- Vercel CLI is absent; strongly recommend `npm i -g vercel` only for separately
  authorized future rollout tooling. Installation and all Vercel commands NOT RUN.
- Original UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored tmp/ preserved.
  Existing Owner Pause remains. Stop at RS1; do not start TB1, LP2 or FULLSEND.

Final source review found that the first draft clipped the entire scroll viewport,
which could clip the existing scrubber's extended touch region. Before closure,
clipping was restricted to a constant-height header-only mask (box-none); the
scroll/overlay viewport keeps its original overflow. A component regression
asserts both mask clipping and unclipped parent. The first forced typecheck and
lint passed (8/8 each, zero cached, six existing warnings), then the first root
build was deliberately interrupted for this preservation fix. Those first gate
logs are retained as RS1-first-*. Final gates restarted serially on final source;
only their results count for closure.
Reviewer integration review additionally caught absolute search/scrubber/answer
jump offsets that now include the fixed inset in content coordinates. The
Reviewer measures its whole overlay content and subtracts that inset from
search jumps, section anchors and the answer-reveal root offset. A regression
uses a 120pt pinned search and 320pt content-root Y, preserving the 72pt search
context below the overlay and a 200pt section anchor. Final focused mobile
suite expanded to 41/41 tests across 3 files (hook, Page, SectionScrubber).
A second root build was deliberately interrupted before final closure for
this integration fix; pre-jump logs/results are retained. No failed gate was
hidden. Final serial gates restart after this final source review.
The non-collapsing Generation viewport browser fixture maps the new Reanimated
import to its existing RN Web Animated boundary; its viewport assertions remain.
Installed Expo Babel/Metro Android compilation emits nine worklet transforms
(RS1-worklet-proof.json), demonstrating compiled UI-thread callbacks; actual
native-thread runtime/rendering is still UNVERIFIED (owner to confirm).
The added section-anchor assertion first failed (11 passed / 1 failed) because
this fixture's mocked Page stores, but does not render, its overlay. The test
now inspects the actual SectionScrubber element passed in Page.overlay; it
retains the same 200pt assertion. Rerun: 12/12 PASS. This fixture-only selector
repair happened before lint/build/full native gates; production source did not
change. The failure and passing rerun logs are retained.

Additional FRESH phone-emulated Chromium touch evidence: 2 surfaces / 6 direct
CDP touch drags PASS. Each surface receives slow down 180px at 40px/s, slow up
100px at 40px/s and fast down 600px at 1200px/s. Observed scroll Y is 165, 80,
665 (native browser touch slop); header states hidden, shown, hidden. Generate
row document Y remains 186.25px, Reviewer 145.75px, both slots remain 48px.
Six PNGs and flows.json are in ignored tmp/overnight/RS1-touch/. Captures inspected.
The first Input.synthesizeScrollGesture attempt returned without scrolling
(y=0), so it is NOT passing evidence. Direct Input.dispatchTouchEvent start /
move / end events supplied the passing touch flows; both logs retained. This
is browser touch emulation, not a native/emulator or physical-device check.

Web Today/Library/Tasks have no existing hide-on-scroll secondary-header user
in the source inventory. Their static status/management controls are unchanged;
phone Reviewer receives the requested mobile/web search parity, and Generate
migrates its existing web hide behavior. No additional unrelated hiding feature
was added to a static web control.

Relevant architecture was checked against ADR-011 (browser tests are a fast
surface, not physical acceptance), ADR-019 (fictional local fixtures and shared
API boundary), ADR-039 (canonical study content/cache boundaries) and ADR-045
(generation navigation/admission remains unchanged). RS1 changes no domain
request, canonical text, cache identity, auth or admission behavior.

Final raw-metric audit: bounds clamping can turn Infinity into a finite endpoint,
so it must not replace the old finite-evidence validation. The native helper now
rejects nonfinite offsets/content/viewport before clamping, and measurement
callbacks ignore invalid dimensions. A regression preserves both position and
delta anchor across invalid events, then verifies the next valid 1pt movement.
Final focused mobile suites: 42/42 tests, 3/3 files; compiled worklets remain 9.
This native-only repair requires fresh forced root gates, full mobile suite and
Android export again. The unchanged shared suite and web suite/build keep their
original FRESH evidence; they are not repeated. Pre-validation gate logs and
counts are retained separately. No assertion or validation was weakened.

The first standalone baseline/touch capture helpers did not explicitly override
TEMP/TMP (their Vite output paths were always repository-local). They were rerun
with repository-local RS1-temp plus the loopback guard; final before/touch
captures and flows use that isolated rerun. The main focused/browser suites and
all gate runs already used repository-local TEMP/TMP. This correction is kept
in the record; no owner file outside the repository was targeted.

Final resize endpoint preservation: a fully hidden 50pt header remeasured to
90pt must remain fully hidden (and inaccessible), rather than keep a 50pt
translation and expose 40pt. Measurement now preserves the hidden endpoint;
the existing width/font regression asserts its immediate -90pt translation
and hidden accessibility state before any further scroll. Focused mobile
remains 42/42 PASS. Affected native gates are repeated for this last adjustment;
web/shared source and passing evidence remain unchanged. Earlier root build
and mobile evidence are retained as pre-resize, not final-source native proof.

## Final serial gates

| Exact command | Result | Counts | Wall time |
|---|---|---|---|
| `npm run typecheck -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 44.944s |
| `npm run lint -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 55.538s |
| `npm run build -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 163.219s |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | FRESH PASS, exit 0 | 696 tests / 72 files | 16.128s |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | FRESH PASS, exit 0 | 1615 tests / 169 files | 62.15s |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | FRESH PASS, exit 0 | 566 tests / 74 files | 285.146s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, exit 0 | 23/23 pages | 44.986s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, exit 0 | Android HBC export | 64.311s |
| `git diff --check` | FRESH PASS, exit 0 | diff hygiene | 0.174s |

All final gates run serially. Six existing lint warnings (five mobile import/first,
one web unused import), zero new warnings. Shared includes source and generated
compiled duplicate cases; shared source was unchanged. Root build also supplies
37/37 API pages and 23/23 web pages, plus local Expo exports. Relevant API tests:
NOT APPLICABLE (client scroll/layout only; no request, auth, server, data or schema
change). Separate explicit web and Android builds were run as requested.
Evidence remains ignored under tmp/overnight/RS1-gate-*.log and RS1-gates.json.

Diff and explicitly staged diff checks are performed again before each scoped
commit. Generated Next ambient declaration edits are restored to their original
tracked content and excluded from commits; final forced typecheck rechecks that
restoration. No generated artifact, evidence output or owner path is staged.

Additional final declaration gate: `npm run typecheck -- --force` FRESH PASS,
8/8 tasks, 0 cached, exit 0, 40.854s, after restoring both generated Next ambient
files. All 15 owned source hashes match. No implementation suite was repeated
for documentation-only closure; final unstaged and explicitly staged checks
are FRESH before both local commits.
