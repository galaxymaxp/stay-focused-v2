# OP2 orb polish

**PASS for the finite unattended local code scope.** Implementation `9e17fd4d`; final gates and evidence below.

## STEP 0: finite scope and baseline (2026-10-20)

Read the full unattended OP2 prompt. Scope ends after STEP 0–4, serial local
gates, reconciled documentation and scoped local commits. No questions, remote
service calls, environment-file edits, deployment, SQL, device work or push.
GV1 and FULLSEND are excluded; Owner Pause is preserved.

Branch `overnight/2026-10-15_feedback`, HEAD
`202f8c3f7e7b012136acf3708a7e044a561be827` match the reviewed baseline.
Local tracking is behind github/main by 5 (no fetch). Author is galaxymaxp.
Only UI/, apps/mobile/.gitignore and supabase/.temp/ are untracked; preserve them.
Root AGENTS.md, AUTOPILOT, current planning summaries, relevant roadmap entries,
owner BACKLOG OP2/GV1 section and ADR-048/049 were inspected. No material code
or scope contradiction found. OP2 explicitly supersedes appearance preservation
and OA1 paper whitening. Live state is UNVERIFIED (owner to confirm).

## Requirement / path / proof matrix before implementation

| Requirement | Actual paths and baseline | Required proof / initial status |
| --- | --- | --- |
| Larger refractive time | shared clock-glass-renderer, mobile redesign/DayRingClock and web day-clock/DayRingClock + globals.css. Interior white mix .65; mobile idle/drag 32/30, web 30. MSDF Inter with .45 AM/PM; accessible plain text/failure path. | Real GPU clock close-ups and contrast, narrow/desktop light/dark; long times and drag captions fit; fallback typography. PENDING |
| Calm cumulative waves | shared orb-interaction has one tapAt/rippleDir and .9s restart; identical platform orbBody and orbInteractionFrame adapters feed DayOrb and retained KnowledgeCore. | Retention/directions, bounded sum, expiry, long gaps, elapsed-time equivalence, Reduce Motion; actual one/five-tap recordings. PENDING |
| Source-faithful backdrop | shared orb-ambient-renderer sums four procedural lobes and whitens paper .88; both orbAura adapters use body uniforms. | GPU pixels from resolved body, dark/light sectors and rotation, feathered alpha, lifecycle/resource evidence. PENDING |
| All consumers | Today -> DayRingClock -> DayOrb (web deferred); mobile GenerateScreen preparation and GenerationScreen detail/Queue -> GenerationCore -> DayOrb; web GenerationScreen detail/Queue -> GenerationOrb -> DayOrb. Retained web KnowledgeCore export and mobile GenerationCoreLab use their own scenes. | Existing caller/scene/gesture tests plus isolated actual Today/Generation browser captures. PENDING |
| Static/miniature | mobile DayOrb/KnowledgeCore exact branding/orb-adaptive-foreground.png + OrbImageSpill; web OrbStill exact CSS gradient, deferred still; Queue exact theme queue/orb-light.png and orb-dark.png, common rotating source/spill parent. No-ExpoGL GenerationVisual is a page illustration. | Preserve exact raster/gradient source and shared rotation, no new loop; fallback screenshots. Native blur/physical appearance UNVERIFIED. |
| Preserve behavior | No job/auth/schema work. Existing ring ownership, scroll/hold semantics, momentum and stored palette sync remain. Existing focus/visibility/AppState policies and render cadence remain. | Model, both platform scene suites and full required gates. PENDING |

## Visual evidence plan

Use the existing Vite + loopback HTTP + Playwright isolated browser harnesses,
with only synthetic renderer inputs and all non-loopback browser traffic aborted.
Run with repository-local TEMP/TMP, telemetry disabled and Expo offline. Capture
baseline and final Today/Generation at 390/1440, both themes, day/palette/state
variants, Reduce Motion and GL failure. Inspect PNG close-ups and decoded motion
frames, retaining short WebM recordings under ignored tmp/overnight/OP2-*.
Use QA-only GPU readback for assertions; production must never read pixels.
Record renderer.info, target dimensions and submission timing where measurable;
software Chromium evidence does not establish Android GPU cost or appearance.

## Implementation and proof audit (STEP 1–3)

- Shared clock shader now samples a magnified/refracted source through filled
  digits. Coverage-aware transmission limits alpha unweighting below .35 so
  nearly transparent body regions do not become an opaque white fill. Additive
  directional reflection (.18–.48 linear) supplies curved surface depth instead
  of mixing the entire interior 65% toward white. Glyph coverage/opacity is
  unchanged. The scrim covers the enlarged readout. Both callers
  and real fallbacks use 40 display pixels/points (mobile +25% idle/+33% drag,
  web +33%). AM/PM is 18, matching the atlas's 45%; labels remain plain.
  Inter, accessible real text, float-target/atlas/GL failure behavior remain.
- Shared input state now retains up to eight directional timestamped impulses.
  Packets last 1.8s, amplitude .045 and summed signed tanh cap .10 world units.
  The same constants feed both identical vertex shaders and CPU proof model;
  nonnegative squared-sine crests avoid destructive interference on rapid taps;
  normals differentiate the saturated sum. Active count skips normal work at
  idle. Existing adapters deliver all waves to all four scenes. Expiration is
  absolute-time based; Reduce Motion clears waves and switches palette once.
  No gesture classification, ring ownership, spin friction or sync change.
- The backdrop uses the exact resolved body's existing scene/material/camera
  in one fixed 64x64 RGBA8 target. One nine-sample averaged, feathered plane
  expands source RGBA shading into the margin, without white blending or summed
  lights. RGB is unweighted for tone mapping, and source alpha also weights
  the final spill coverage. Intrinsic color and visible opacity both survive.
  It excludes itself during capture and restores state in finally.
  Strength uses existing elapsed-time easing; no separate color interpolation
  can lag behind the source. All scenes capture within their existing frame.
  No production pixel readback, second full-resolution orb or extra scheduler.
  Capture state restoration, failure and idempotent target disposal have pure
  resource tests. See ADR-052 for tradeoffs.
- Exact native PNG, web gradient and Queue raster sources/rotation were already
  shared with their spill at baseline and are retained. Their existing tests
  remain in the required full suites. Basic no-ExpoGL GenerationVisual remains
  a page illustration. Native static pearl does not claim live palette parity.

## First attempts and repairs (retained, not hidden)

- Baseline launcher first failed before tests: Windows backslashes in
  NODE_OPTIONS were consumed while parsing the preload path. Switched to the
  existing forward-slash guard convention. Retry baseline browser PASS 8/8,
  with before screenshots and WebM captures, no product edit in that bundle.
- Shared model first run: 21 passed / 2 failed (23 total): exact hemisphere
  floating equality and negative zero at packet start. Direction assertion now
  uses numerical closeness; model returns exact zero at t=0. Retry PASS 23/23.
  Initial web focused PASS 29/29 and mobile focused PASS 43/43.
- Initial local visual run: 16 passed / 2 failed (18 total), both original
  clock contrast thresholds. The low tint alone was too faint. Enlarged scrim,
  directional interior lighting and correct alpha unweighting repaired contrast
  without lowering the 3:1 large-time / 4.5:1 suffix thresholds. Intermediate
  glass-only retries were 10/10 PASS, then 9/10 while exploring directional tint;
  final source restored the stronger minimum tint and retains refraction.
- First rotating-sector run: 11 passed / 1 failed (12 total): a .12 alpha floor
  biased ambient luminance. Removed that floor. Next focused pixel run passed
  three / failed one / skipped 18: an ordinary bright light-mode studio did not
  contain the assumed 30% dark-sector variation. The controlled rotation probe
  now explicitly supplies the same known dark studio on either page background;
  normal light-source captures are still retained. Pixel/long-time retry PASS
  7/7 selected (18 intentionally excluded by focused filter). No threshold was
  weakened. Source/backdrop correlations .9695–.9901 over both backgrounds;
  dim sector moves from angular bin 4 to 3 as source pose changes.
- Early web typecheck found two implicit-array-type errors in new QA code;
  arrays now have explicit number[] types. First forced root typecheck stopped
  at shared: 3 successful / 5 scheduled tasks, 0 cached, one readonly/mutable
  inferred-state mismatch. Explicit OrbInteraction return-state annotation
  preserves the readonly contract. Fresh forced retry PASS 8/8, 0 cached.
- Initial added clock refraction probe sampled a hand-picked rectangle including
  counters/background and failed its chroma threshold. Replaced that sampling
  with the actual MSDF filled-stroke mask; corrected shader alpha unweighting.
  Its next run passed original contrast (2/2) but the low-chroma pastel-violet
  probe differed by only 1.90 blue/red units after tone mapping. Final opposing
  warm/cool probe uses existing gold and day-sky blue #2466B8, with the same
  chroma assertions, to test source transmission. All actual palette captures
  and original contrast requirements remain in the full suite.

The final-source closure below supersedes intermediate statuses and evidence.

A further acceptance audit measured one through five 150ms taps at the same
420ms age after the last tap. The initial signed packet's peaks fell from
.01011 to .00527 (RMS .00359 to .00229), despite retaining all wavefronts.
This contradicted the requested strength buildup and the first comparison test
did not catch it. The packet now uses positive squared-sine crests with the
same effective crest spacing, speed, duration, envelope and cap. A new stronger
regression requires both peak and spatial energy to increase at every count
from one to five. Its first full shared run stopped with 668 passed / 1 failed
of 669 across 68 files: positive crests eliminated cancellation, but the fifth
front travelled beyond the existing peak, making peak counts 4 and 5 equal.
A bounded shared gain now strengthens retained fronts with 120ms smooth attack,
1.2s decay and the same endpoint envelope (zero at expiration). The CPU helper
also supplies the GPU gain uniform; no independent shader timing is introduced.
The stricter regression remains unchanged; focused retry PASS 21/21. All
final-source gates are rerun; the first green forced build is superseded and
cannot serve as final build evidence. Its typecheck/lint/build were 8/8 each,
0 cached, before this necessary acceptance repair. First build took 5m39.479s.

The next serial run passed forced typecheck/lint/build 8/8 each (0 cached) and
shared 670/670 across 68 files; mobile stopped at 1580 passed / 1 failed of
1581, 165 passed / 1 failed of 166 files. One component assertion still read
OA1's removed uBase/uTime metadata rather than the new captured texture. It now
asserts the 64x64 source and identical captured/displayed body scene and camera;
focused retry PASS 14/14. A previous scripted replacement had missed those lines.

Final visual inspection rejected the fully unweighted clock fill despite its
green contrast: nearly transparent pearl became too white. Coverage-aware
transmission and stronger refraction now preserve source shading, with additive
directional reflection. Its first selected run passed 6 / failed 1 / skipped 7;
the light-mode first '1' was 2.735:1. A wider scrim alone left that statistic
unchanged (2 passed / 1 failed / 11 skipped). Raising the minimum reflection
from .14 to .18 repaired that same threshold without flattening the directional
variation. Retry PASS 3/3 selected (11 excluded), including filled-stroke
warm/cool source transmission. All final-source gates are restarted once more;
the second forced build (3m47.232s Turbo / 231.5s wall) is also superseded.

The following serial pass had green typecheck/lint/build 8/8 each (0 cached),
shared 670/670 and mobile 1581/1581. Full web stopped at 528 passed / 4 failed
of 532 (71 passed / 1 failed of 72 files): the web ring component tests still
assumed one text child and font 30. They now compare the exact recursive text,
the explicit AM/PM child and font 40. Focused retry PASS 7/7. This preserves
the original time/accessibility assertions while accepting the intentional
suffix typography. No assertion threshold or product behavior was weakened.

Final RGBA review found that the initial ambient correlation probe divided out
source alpha and therefore could miss darkness due to transparency. The spill
now retains sampled alpha in its final coverage, with rebalanced strength
(.9 dark / .5 light) rather than boosting dim source colors. The probe retains
its emitted-light correlation and dark-sector assertions, now using actual
premultiplied output, and adds visible luminance correlation on explicit black
and white pages plus nonzero visible variation. Focused retry PASS 2/2
(10 excluded): visible correlation .9725–.9997, with dim sectors moving as the
source rotates. Earlier normalized-color correlations are superseded as
luminance proof. One more complete final-source serial run follows; the third
forced build (3m47.941s Turbo / 231.988s wall) is not reused.

## Local visual audit

All evidence is synthetic renderer input, isolated from accounts and academic
records. Browser traffic is restricted to the loopback harness origin. Before
screenshots and recordings are retained in `tmp/overnight/OP2-before/`; baseline
Today and Generation recordings were decoded into frame contact sheets and
inspected (`OP2-motion/decoded-before.json`, 5.56s and 7.52s).

Final captures use the actual DayRingClock, GenerationOrb and retained
KnowledgeCore, actual shared shaders, bundled atlas/Inter and app CSS. The
primary matrix covers 390/1440, both themes, Reduce Motion, GL/context/atlas
failure, idle and free-time dragging, four palette advances and all retained
generation states. Long `11:59 PM` and 18px AM/PM fit at 320/390/1440 in both
glass and plain fallback. The larger readout and source-dependent filled
interiors were inspected; labels remain plain and clear of the time.

Eight additional 6:30 AM / 6:15 PM dawn/dusk captures were generated using the
same isolated Vite/browser pattern with actual Today and Generation components,
gold/orange/green/violet, both themes and 390/1440 widths. All eight passed
readout/error checks and were inspected (`OP2-day-states/captures.json`). Noon,
late-night and dawn/dusk therefore have distinct actual day-light inputs.
The green/violet broad spill follows the source's upper bright region while
dim sectors remain subdued; paper retains the source-colored variation.

The controlled rotation probe renders a known dark studio source on black and
white pages. GPU readback measures actual premultiplied emitted light and
visible luminance after page compositing. Visible correlations are
.9725–.9997 over the three poses in each theme; dim bins move 5→2 on black and
2→14→10 on white. These replace the earlier intrinsic-only comparisons.
Separate actual-GPU checks require unchanged interior RGBA with the spill
hidden/shown and alpha 0 at canvas borders. No production readback exists.

The unchanged strict buildup regression and final pure-model measurements use
one through five 150ms taps sampled 420ms after the last tap. Peak displacement
is .00989, .01391, .02562, .02884, .03020 world units; RMS .00339, .00657,
.01043, .01372, .01614. Both grow at each count, with .10 cap, bounded eight
slots, independent directions, exact expiry, long-gap, frame-equivalence and
Reduce Motion coverage. `OP2-wave-strength-final.json` records the measurements.

Final motion/resource observations and the exact final gate ledger follow below. All captures are local Chromium/SwiftShader;
physical Android appearance, performance, GPU time and power remain UNVERIFIED.

## Final-source closure (STEP 4, PASS locally)

Implementation commit: `9e17fd4d`. Required gates ran serially with repository-
local TEMP/TMP, the existing loopback-only Node guard, Expo offline and telemetry
disabled. Every result below is FRESH unless explicitly labelled otherwise.
No package version, validation configuration or assertion threshold was weakened.

| Required gate | Exact final result | Evidence under tmp/overnight/ |
| --- | --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached; 31.146s wall | OP2-gate-typecheck.log |
| `npm run lint -- --force` | PASS 8/8, 0 cached; 0 errors, 6 existing warnings (5 mobile, 1 web); 38.274s wall | OP2-gate-lint.log |
| `npm run build -- --force --concurrency=1` | PASS 8/8, 0 cached; 3m27.705s Turbo / 212.277s wall | OP2-gate-build.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | PASS 670/670, 68 files; default includes src/dist duplicates (335 source + 335 compiled cases) | OP2-gate-shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | PASS 1581/1581, 166 files | OP2-gate-mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | PASS 532/532, 72 files, including glass 14 + ambient 12 browser cases | OP2-gate-web.log |
| Relevant API tests | NOT APPLICABLE: decorative client model/renderers only; no API/model consumer, server behavior, auth or schema changed | Source diff + API build |
| `npm run build --workspace @stay-focused/api` | PASS equivalent final root task, 37/37 generated pages; separate invocation NOT RUN | OP2-gate-build.log |
| `npm run build --workspace @stay-focused/web` | PASS equivalent final root task, 23/23 generated pages; separate invocation NOT RUN | OP2-gate-build.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS equivalent final root Android export (also iOS/web); separate invocation NOT RUN | OP2-gate-build.log, OP2-android-export-proof.json |
| `git diff --check` | PASS, exit 0, no whitespace errors | OP2-gate-diff.log, OP2-final-diff.log |
| `git diff --cached --check` | PASS, exit 0 for explicit implementation and documentation stages | OP2-cached-code.log, OP2-cached-docs.log |

The prompt permits matching final-source forced builds to satisfy duplicate
workspace gates. The final root command executes the same API/web build scripts
and emits the Android HBC. The 10,921,991-byte Android HBC contains the final
glass reflection/coverage source, wave gain and source-alpha-weighted ambient
shader (all five checks true). Generated Next declarations were inspected and
restored; no generated output, credentials or tmp artifacts are committed.

Final Today/Generation wave recordings (8.20s / 7.88s) were decoded and inspected
with their frame contact sheets (`OP2-motion/decoded.json`). They show the calm
single response, stronger overlapping surface relief and return to quiet flow.
GPU uniform ages retain all five impulses: Today .837/.676/.503/.330/.160s,
Generation .818/.658/.496/.325/.146s; these are actual sampled ages with 150ms
scheduled waits plus input overhead. Both scenes reach zero active waves after
taps stop. Distinct-position taps and earlier moving fronts are retained; pure
model tests independently establish exact elapsed-time behavior and strength.

Final GPU spill checks: Generation and retained KnowledgeCore interior RGBA
differences are exactly 0; border alpha is 0. Spill alpha differences are
356,520 / 237,136 summed units and sectors vary. Bright-pearl solid-stroke
contrast minimum is 3.406:1 light / 5.506:1 dark; suffix minima exceed 4.5:1.
Filled zero interiors transmit both gold and day-sky blue in actual GPU pixels,
with MSDF-selected coverage rather than a shader-string or opacity assertion.

Resource observations (`OP2-clock/renderer-cost.json`): actual draws/frame are
3 without clock and 5 with clock, one more than OA1 in each case. Geometry/texture
counts settle at 2/1 and 4/3. The one fixed RGBA8 64x64 target has 16KiB logical
pixel storage; driver overhead is unmeasured. Median idle intervals are
83.2/83.3ms. CPU submission medians are 0.20/0.20ms, p95 0.30/0.40ms across
8/14 warmed frames. This measures software Chromium submission only, not GPU
time, Android FPS, battery or allocations. Existing 80ms idle/16ms interaction
cadence and native .6 render scale remain. No physical performance claim.

| Final requirement | Evidence / verdict |
| --- | --- |
| Larger, naturally proportioned glass with source shading | Actual GPU filled-interior color/contrast; clock close-ups, idle/drag, long time and fallback at 320/390/1440: PASS locally |
| Calm accumulation, safe cap and smooth decay | Stronger one-to-five peak/energy test, retained directional packets, timing/expiry/long-gap/reduced-motion models and actual motion/GPU counts: PASS |
| Visible source color/luminance/orientation in backdrop | RGBA capture, emitted AND page-composited correlation, moving dim sectors, transparent borders and exact unchanged body pixels: PASS locally |
| All callers and fallback/miniature sources | Both platforms scenes/caller suites; preparation/detail/Queue route inventory; exact existing PNG/gradient/rotation: PASS code; native appearance UNVERIFIED |
| Jobs, palette sync, gestures, lifecycle and accessibility | Unchanged business boundaries; full client suites, scene disposal/visibility, reduced motion, ring/scroll controls and readable real text: PASS locally |

Finite OP2 local scope is complete. Scope excludes GV1, publication and physical
approval. The next owner action is review of these commits/evidence and the
separately queued GV1 task; this run does not continue into it.
## Owner steps remaining

Rollout: NOT RUN, skipped entirely. Device checks: NOT RUN, skipped entirely;
Realme disconnected. Owner confirms deployed/live state, reviews actual device
appearance/gesture feel/performance, and separately authorizes any publication.
