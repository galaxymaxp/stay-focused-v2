# TP2c / TP2d: orb liquid and synchronized Plan color

Current result: **TP2d PASS (local)**. Historical TP2c STOP is retained below;
the corrected TP2d rerun and fresh final receipts follow it.

Status: **STOPPED during STEP 0** (2026-10-25). No implementation changes.
The unattended rules in `tmp/overnight/prompts/TP2c.md` take precedence over
the later instruction to stop only for data loss, security/privacy or branch.

## Baseline and partial STEP 0 inventory

- Expected and actual branch: `overnight/2026-10-15_feedback`.
- Initial HEAD: `3068726879cd27a057a57b0dfd66c049e39801b6`.
- FRESH `git merge-base --is-ancestor 30687268 HEAD`: exit 0.
- TP2b acceptance reports local PASS. Live/native acceptance remains unverified.
- Local upstream comparison: 29 behind / 17 ahead; no fetch performed.
- Initial dirty paths: untracked `UI/`, `apps/mobile/.gitignore`,
  `supabase/.temp/`. These and all `tmp/` paths remain unstaged.
- Requested commit author: `galaxymaxp <omgraythekid@gmail.com>`.

Read the full TP2c prompt, root AGENTS.md and AUTOPILOT.md. Inspected the
shared body/scene implementation, web PlanGlassCanvas, mobile PlanGlassView
and PlanButton, current planning entries and newest handoff. STEP 0 is partial:
the complete DayOrb, palette and impulse inventory was not finished because
the shader discrepancy below triggers the preceding unattended STOP rule.
No exact reusable palette source or impulse function is claimed as verified.

## STOP evidence

Unattended rule 3 says: "It is a STOP if the code itself contradicts what
the prompt assumes." Rule 4 requires recording the findings and exact owner
question, committing safe completed work, writing STOPPED and ending.

The prompt's "What is wrong (confirmed in code)" section and liquid decision
assume the slab has this density floor:

```glsl
float sheet = (0.75 + 0.25 * smoothstep(0.3, 0.9, flow)) * held * filled;
```

Actual `packages/shared/src/orb-body-renderer.ts` uses:

```glsl
float sheet = (0.35 + 0.65 * smoothstep(0.3, 0.9, flow)) * held * filled;
```

FRESH read-only `git show 30687268:packages/shared/src/orb-body-renderer.ts`
confirms that the prerequisite commit itself has the same `0.35 + 0.65`
expression. This is a local code contradiction, not missing production access.
The existing `surface`, `filled` and `uSlosh` are present as described.
The desired gravity-free expression is clear, but the higher-priority rule
requires stopping before implementing it from the contradictory baseline.

Exact owner question for a future attended run: **May TP2c proceed from the
actual TP2b `0.35 + 0.65` slab floor, treating the prompt's `0.75 + 0.25`
baseline as a documentation error?** No question was sent during this run.
No DECISIONS-NEEDED entry was added.

## Verification and remaining scope

| Check | Result |
| --- | --- |
| Branch and prerequisite ancestry | FRESH PASS, 2/2 checks |
| Slab baseline comparison with prompt | FRESH contradiction, 1/1 comparison; STOP |
| Working/staged diff hygiene | FRESH PASS, 2/2 commands, exit 0 |
| Focused and full affected test suites | NOT RUN, 0 tests executed; stopped before code edits |
| Forced typecheck/lint, API/web builds, offline Android export, serial root build | NOT RUN, 0 gates executed; STOP rule |
| Real GL captures and surface/hue/30-frame mask metrics | NOT RUN, 0 captures; STOP rule |
| Native GL and production state | UNVERIFIED (owner to confirm) |

No application gate failed, and no previous TP2b test count is claimed as a
TP2c result. No code, migration, dependency or env file was changed. No remote
service, SQL, deployment, Scheduler, email, push or device action occurred.

## Owner steps remaining

- Resolve the recorded baseline contradiction, then resume STEP 0 and carry
  out STEP 1-4, fresh suites/gates and acceptance captures locally.
- Rollout NOT RUN: release completed work via the next separately authorized
  FULLSEND.
- Device checks NOT RUN: website and Realme gravity-free liquid, synchronized
  palette/fade, fixed shell and press wave; native GL/performance/accessibility.
- Served revision and database/Scheduler/provider state are UNVERIFIED
  (owner to confirm); remote inspection is prohibited in this unattended run.

The local documentation commit is titled `docs(today): record TP2c baseline
contradiction stop`; its exact hash is recorded in Git and
`tmp/overnight/TP2c.status`. Endpoint is the unattended STOP, with no successor
task or release started.

## TP2d corrected rerun (2026-10-25)

Status: **PASS (local)**. Initial HEAD adc8b3e3, expected branch
`overnight/2026-10-15_feedback`, prerequisite 30687268 ancestry PASS (FRESH).
TP2c's stop remains historical; the owner explicitly corrects the floor to
`0.35 + 0.65` and authorizes replacing fixed-accent/slosh assertions.
Untracked UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved.

STEP 0 inventory: both DayOrb implementations use createOrbBody, orb-scene,
createOrbInteractionSampler/sampleOrbInteraction and orbIdleColor. Palette
source is ORB_COLOR_KEY (`sf.orb.colorKey`), with pearl #E6EAF1 default;
web local preferences and native sessionStore feed useOrbInteraction.
OrbPreferencesSync on each platform applies per-user profile preferences
through applySyncedOrbColor. Tap release calls endOrbGesture then
rememberOrbColor; orbIdleColor applies the shared 600ms smoothstep fade.
Impulse model: OrbImpulse -> sampleOrbInteraction -> uWaves, bounded by
ORB_MAX_IMPULSES=8, ORB_RIPPLE_MS=1800, orbWaveGain, amplitude .045/cap .10.
Plan will use that packet inside the fragment only, with a static vertex
program, preserving shell geometry. DayOrb flow .35 and spin .12 about
normalized (.18,1,-.12), life .22/stir 0 and ambient capture are reusable.
Both Plan adapters currently feed fixed yellow, a .25 flow rate, identity
spin and uSlosh; these are the paths being replaced. TP2b acceptance and
full prompt, AGENTS.md, AUTOPILOT.md, newest planning/handoff entries read.

Acceptance: exact shared liquid sheet and unchanged orb fragment; shared
palette/fade including tap and cross-platform sync; liquid-only waves and
Reduce Motion opacity; actual Chromium GL at 390/768/1280, both modes and
pearl/gold/green, rest/wave; surface/hue metrics and 30 fixed outline masks;
fresh focused/full affected suites and serial mandatory gates.
Evidence goes under tmp/overnight/TP2d/. Live production, database, Scheduler,
native GL and physical performance are UNVERIFIED (owner to confirm).
Owner steps remaining: Rollout and Device checks NOT RUN; next FULLSEND,
then website/Realme appearance, synchronized fade, fixed shell and wave.

### TP2d implementation and verification notes

The slab restores the exact orb sheet, liquid function and thresholds. Its
sampling is converted from half-size coordinates to ORB_RADIUS units after
rounded-rectangle containment. The old density floor, fill surface, slosh
uniform/state and slab-only specular adjustment are removed. A SHA-256 test
pins the complete orb fragment to prerequisite 30687268.

The existing palette broadcast now sends one colorFrom/colorAt/colorIndex
transition to every listener, including the exact transition produced by an
orb tap. Only those three fields propagate; gestures/spin/impulses stay local.
Both GL adapters sample orbIdleColor directly; both fallbacks follow that
palette. One shared rAF epoch timestamp prevents sequential GPU submission
time from shifting the fade between surfaces. Flow .35, idle spin .12, axis,
life/stir, theme appearance, ambient capture and current day light match
DayOrb; Plan glyphs receive the same mode and day-light direction as digits.

Plan presses enqueue at most eight two-axis impulses, expire at 1800ms and
reuse the orb's exact rippleHeight packet and orbWaveGain. The packet moves
the slab liquid coordinates only; a static vertex program keeps its shell
fixed. It never invokes the orb gesture/color-choice path. Reduce Motion
queues no wave and keeps the 0.85 opacity dip. Native GL failure uses a flat
palette-coloured action; web failure uses full-volume palette layers. These
fallbacks cannot reproduce GL optics and are explicitly failure equivalents.

First attempts retained under tmp/overnight/TP2d:

- native-focused-first.log: 30 pass / 2 fail, 4 files pass / 1 fail; two old
  fallback-loop expectations remained after the approved slosh removal.
  Corrected the expectations; native-focused-final.log passes 32/32, 5 files.
- gl-first.log: 0 executed / 26 filtered skips because the title filter omitted
  Vitest's quoted string formatting. No acceptance claimed from that command.
- gl-matrix-first.log: 20 pass / 6 fail. Only pearl hue comparisons failed:
  the .025 chroma cutoff excluded every nearly neutral orb pixel, and the
  helper incorrectly treated atan2(0,0) as a measured red hue. The diagnostic
  rerun gl-pearl-second.log retains the same six failures with raw metrics.
  Use every measurable 8-bit chroma sample (at least 1/255), weighted by chroma;
  the required +/-6 degree assertion is unchanged. gl-pearl-third.log passes
  6/6 selected cases (20 filter skips); no product palette was altered.
- First shell helper command had a PowerShell array syntax error before edits;
  a later JS harness writer needed literal template-dollar escaping. Both
  were corrected locally. Diff review removed a malformed splice and whitespace
  before final gates. No failed application check is hidden.

Fresh preliminary checks: shader 1/1; shared focused 30/30; web palette/gesture
17/17; web DayOrb/palette 19/19; native DayOrb/palette 35/35. Shared full suite
871/871, 85 files (43 source plus 42 existing emitted mirrors). Final full
suites, expanded surface metrics, rendered fade-frame proof and serial gates
are pending below; preliminary results are not substituted for final gates.

The first full web run also exposed a frame-clock regression in existing
controlled-clock tap/ambient checks. generation-frame-first.log isolates it:
0 pass / 1 fail / 12 filtered skips; live impulses were discarded because
performance.timeOrigin did not align with the simulated Date/performance
clock. Calibrating the shared epoch once with Date.now()-performance.now()
keeps identical per-frame samples and supports native/simulated clocks.
generation-frame-second.log passes the unchanged assertion (1 pass, 12
filtered skips). New orb-animation-time.test.ts pins clock calibration and
same-frame invariance; shared-frame-regression.log passes 10/10, 3 files.

Full web attempts: web-full-first.log **685 pass / 3 fail**, 83 files pass /
2 fail; web-full-second.log **686 pass / 2 fail**, 84 files pass / 1 fail.
Both include all 26 passing Plan GL checks and 120 matching color-fade frames.
The remaining ambient checks required two distinct corrections, with no
assertion weakened:

- A temporary instrumented harness (only under tmp/) proved that a tap can
  arrive 3-75ms after the current display-frame timestamp. The old sampler
  permanently discarded that apparently future impulse. It now retains it
  at age zero until eligible; spinAt also stays monotonic, preserving momentum.
  A new shared regression checks pending input, exact later age/expiry, Reduce
  Motion and equivalent momentum. retained-input-focused.log: **32/32**,
  4 files. Shader wave speed/decay/gain/constants remain unchanged.
- ambient-diagnostic.log: 0 pass / 2 fail / 12 filtered skips. After the
  pending-input repair, ambient-diagnostic-fixed.log: 1 pass / 1 fail /
  12 filtered skips. The trace then showed a real-time fixture flake: GPU/
  protocol delays expanded its nominal 750ms sequence beyond 1800ms, so the
  oldest wave correctly expired at 1805ms. Only these two quantitative tap
  sequences now use Playwright's controlled clock (the same established
  approach as generation-screen.browser.test.ts). Five retained waves and
  settled zero-wave assertions are unchanged; all rendering/cadence scenarios
  keep real time. ambient-focused-final.log: **2 pass / 12 filtered skips**.

The generation/ambient diagnostic runs overlapped the already failing full
web runs; that extra software-GPU load is recorded, not treated as physical
performance evidence. Final acceptance uses a subsequent serial full rerun.

### TP2d interruption recovery

Resumed on 2026-10-25 from HEAD 9868d2fd after reading the unattended rules,
TP2d/TP2c checkpoints, Git history/status/diff and the existing gate receipts.
The acceptance freeze (9047abe4) and shader commit (9868d2fd) were retained;
no committed implementation was redone. Palette/wave/frame-clock changes
were already present in the working tree and were reviewed before staging.

The interrupted serial pipeline had completed the final web (688/688), mobile
(1726/1726), forced typecheck/lint, direct API/web builds and offline Android
export. Its root-build.log ended during Expo export without an exit receipt;
that attempt is INCOMPLETE, not a passing gate. No matching build process
remained on resume. Only the incomplete root build was rerun, recorded in
root-build-resume.log, followed serially by the rebuilt shared suite. Earlier
completed checks were preserved. The initial resume diff hygiene check found
one trailing blank line in this acceptance document; finalization removes it.
A Windows rg wildcard-path inspection first returned error 123; the corrected
-g glob inspection succeeded and found no removed production uniform/accent
references. Neither helper attempt was an application test failure.
The resumed root export ran under local memory pressure (99 MiB free of
15,661 MiB at 21:25:52); Android and web bundles still completed while iOS
continued. Slow PowerShell diagnostics were replaced with a lightweight local
Node log reader. A cmd tasklist filter first had a quoting error (exit 1);
the corrected read-only command succeeded. These are tooling observations,
not a product-performance result or a substituted build receipt.

React review used the installed Vercel React best-practices skill: hooks stay
unconditional, shared handle identity remains stable, high-frequency color
sampling uses refs, and frame/listener/GPU cleanup stays explicit. The Three
pipeline remains behind the existing web lazy import. No new dependency,
server/auth/data/schema behavior or external integration was introduced.

### TP2d final receipts

Plan now holds the orb's exact weightless liquid, uses its synced pearl-default palette and exact 600ms fade, and sends an 1800ms liquid-only tap wave from the press point. Web/mobile shells stay fixed; Reduce Motion queues no wave and dips opacity to 0.85. Fallback colors follow the same palette. TP2d supersedes the historical TP2b fixed-yellow/fill/slosh decisions and resolves TP2c's prompt-floor stop.

Implementation head: 3173b75aa9ee50acd17fbaf00b9a098ea277031b. The final UI/shared suites and gates
ran on the same affected bytes before the scoped commit. The additional API
suite ran before later client-only clock repairs; API paths and API-exercised
logic are unchanged, and API/root builds run fresh after those repairs.

FRESH full suites: shared 876/88 files; API 2517/218 files (3 existing live skips); mobile 1726/184 files; web 688/85 files. **5807 passed / 0 failed / 3 existing live skips**.
Shared's default suite includes source files and generated dist test mirrors;
the final 88 files are 44 source files and 44 emitted mirrors. All mirrors
in the final run were rebuilt by the fresh serial root build.
Focused/filter skips above are diagnostic selection, not final suite skips.

| TP2d requirement | Final local result |
| --- | --- |
| Exact orb liquid and unchanged orb fragment | FRESH PASS: shader construction plus pinned TP2b SHA-256 |
| Pearl default, palette choice, orb tap and sync transition | FRESH PASS: both platform sync suites and 120 matching rendered fade samples |
| Plan press preserves orb/button color | FRESH PASS: actual browser action and platform/model regressions |
| Orb wave packet, bounded impulses, static shell and Reduce Motion | FRESH PASS: shared/native/browser suites and 30 identical outline masks |
| Label shader, current mode/light and colored fallback | FRESH PASS: shared appearance/glyph tests, both adapters and browser failure cases |
| 390/768/1280, both modes, pearl/gold/green, rest/wave | FRESH PASS: 36 real WebGL captures, 18 paired metrics and three comparison crops |
| Full affected suites and mandatory local gates | FRESH PASS: exact receipts below; no cached task results |
| Native GL, rollout and physical/device checks | NOT RUN: owner steps under unattended scope; UNVERIFIED (owner to confirm) |

The slab maps each normalized press point to normalize(vec3(x, y, 1)) before
feeding the unchanged orb wave packet. This adapts the origin to a flat front
face while preserving speed, decay and gain. GL-unavailable fallbacks are
palette-colored flat equivalents; native GL appearance remains an owner step.

| Command | Final result / evidence under tmp/overnight/TP2d |
| --- | --- |
| npm run test --workspace @stay-focused/shared -- --maxWorkers=1 | FRESH PASS, exit 0; shared-final.log |
| npm run test --workspace @stay-focused/api -- --maxWorkers=1 | FRESH PASS, exit 0; api-full.log |
| npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 | FRESH PASS, exit 0; mobile-full.log |
| npm run test --workspace @stay-focused/web -- --maxWorkers=1 | FRESH PASS, exit 0; web-full.log |
| npm run typecheck -- --force | FRESH PASS, exit 0; typecheck-final.log |
| npm run lint -- --force | FRESH PASS, exit 0; lint-final.log |
| npm run build --workspace @stay-focused/api | FRESH PASS, exit 0; api-build.log |
| npm run build --workspace @stay-focused/web | FRESH PASS, exit 0; web-build.log |
| npm run build --workspace @stay-focused/mobile -- --platform android --output-dir ../../tmp/overnight/TP2d/android-export | FRESH PASS, exit 0; android-export.log |
| npm run build -- --force --concurrency=1 --env-mode=loose | FRESH PASS, exit 0; root-build-resume.log |
| git diff --check / git diff --cached --check | FRESH PASS before scoped commits |
| Workflow/provider contract gates | NOT APPLICABLE: no workflow/provider changes |
| Rollout / Device checks | NOT RUN: unattended exclusions |

FRESH forced typecheck/lint/serial root build each 8/8 tasks, 0 cached; direct API/web builds and offline Android JS/assets export PASS. Seven existing lint warnings, no new warnings/errors. Working/staged diff checks PASS.
Direct API/web builds generated 38/38 and 23/23 static pages respectively;
the Android-only export produced one HBC bundle, 37 assets and metadata.
All validation used repo-local TEMP/TMP/TMPDIR and caches, EXPO_NO_DOTENV=1,
EXPO_OFFLINE=1, telemetry disabled, environment-file exclusion and loopback-only
Node/browser guards. No dependency, migration or env file was changed.

### TP2d real GL evidence

Actual Chromium/SwiftShader WebGL, no visible fallback: **36 captures /
18 color-theme-width pairs**, with rest and mid-wave at each pair. Liquid
metrics hide the glyphs only during framebuffer measurement, then restore
the real label for screenshots. The orb's inner disk and slab interior exclude
shell edges; slab rows cover 12%-88% height/width. A horizontal step means an
adjacent-row luminance jump >0.15 at a column; at most
**14.61%** of the width shares one (limit 60%).
Minimum mean row luminance **0.0956** (floor .01):
no empty interior band. Chroma-weighted circular mean hue uses every measurable
8-bit chroma sample (>=1/255); maximum orb/button difference
**5.52 degrees** (limit +/-6), including pearl.
All 18 metrics files retain both rest/wave observations and sample counts.

Rendered fade proof: **120/120 matching color samples**: 40 each for palette
choice, actual orb tap and simulated cross-platform sync application. See
fade-frames.json, tap-fade-frames.json and sync-fade-frames.json. Plan presses
change neither surface's color; GL-unavailable browser fallbacks also pass
pearl-default and synced-green assertions. Existing per-user sync controllers
are exercised with synthetic local responses on both platforms, never remote
service calls. **30/30 identical silhouette masks**, with
187 shaded glyph-interior pixels /
95 distinct shades. Native GL is an owner
step; these web captures are not native/device proof.

| Width / mode | Pearl | Gold | Green |
| --- | --- | --- | --- |
| 390 / light | [rest](../../../tmp/overnight/TP2d/390-light-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/390-light-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-light-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/390-light-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/390-light-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-light-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/390-light-green-rest.png) / [wave](../../../tmp/overnight/TP2d/390-light-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-light-green-metrics.json) |
| 390 / dark | [rest](../../../tmp/overnight/TP2d/390-dark-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/390-dark-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-dark-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/390-dark-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/390-dark-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-dark-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/390-dark-green-rest.png) / [wave](../../../tmp/overnight/TP2d/390-dark-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/390-dark-green-metrics.json) |
| 768 / light | [rest](../../../tmp/overnight/TP2d/768-light-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/768-light-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-light-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/768-light-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/768-light-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-light-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/768-light-green-rest.png) / [wave](../../../tmp/overnight/TP2d/768-light-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-light-green-metrics.json) |
| 768 / dark | [rest](../../../tmp/overnight/TP2d/768-dark-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/768-dark-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-dark-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/768-dark-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/768-dark-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-dark-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/768-dark-green-rest.png) / [wave](../../../tmp/overnight/TP2d/768-dark-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/768-dark-green-metrics.json) |
| 1280 / light | [rest](../../../tmp/overnight/TP2d/1280-light-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-light-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-light-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/1280-light-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-light-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-light-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/1280-light-green-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-light-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-light-green-metrics.json) |
| 1280 / dark | [rest](../../../tmp/overnight/TP2d/1280-dark-pearl-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-dark-pearl-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-dark-pearl-metrics.json) | [rest](../../../tmp/overnight/TP2d/1280-dark-gold-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-dark-gold-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-dark-gold-metrics.json) | [rest](../../../tmp/overnight/TP2d/1280-dark-green-rest.png) / [wave](../../../tmp/overnight/TP2d/1280-dark-green-wave.png) / [metrics](../../../tmp/overnight/TP2d/1280-dark-green-metrics.json) |

![pearl: actual orb beside Plan](../../../tmp/overnight/TP2d/pearl-comparison.png)

![gold: actual orb beside Plan](../../../tmp/overnight/TP2d/gold-comparison.png)

![green: actual orb beside Plan](../../../tmp/overnight/TP2d/green-comparison.png)

UNVERIFIED (owner to confirm): native GL presentation, Realme appearance, physical FPS/power, other real browsers/assistive technology, served revision and production/database/Scheduler/provider state.

**Owner steps remaining**:

- Rollout NOT RUN: release via the next separately authorized FULLSEND.
- Device checks NOT RUN: website and Realme weightless liquid, synchronized palette/fade, fixed shell and press wave; native GL, physical performance/power and accessibility.
- Confirm live production/database/Scheduler state separately.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for future authorized env/deploy/log tooling; installation NOT RUN.

### TP2d commits and endpoint

```text
9047abe4 docs(today): freeze corrected TP2d acceptance
9868d2fd fix(glass): restore weightless orb liquid in Plan slab
3173b75a fix(today): synchronize Plan palette and liquid tap waves
```

Completion documentation is the local commit titled
"docs(today): close TP2d liquid and color verification"; its exact hash is in
Git and tmp/overnight/TP2d.status. All commits use author galaxymaxp
<omgraythekid@gmail.com>. No tmp, generated validation output, private fixture,
credential or unrelated owner path was staged. UI/, apps/mobile/.gitignore,
supabase/.temp/ and prior tmp outputs are preserved. No push.
No deployment, remote service/SQL, migration application, Scheduler/email,
OTA/EAS or device action occurred. Endpoint TP2d only; no successor work started.
