# OA1 orb ambient glow

## Scope and baseline (STEP 0, 2026-10-20)

Finite endpoint: OA1 local implementation, tests, gates, documentation and local
commits. OA2, release, production calls and physical checks are excluded.
Owner instruction processed once: `chatgpt-owner-1792427980694-fe4823a1-011c-4bf2-8889-791378c25add.md`.
Baseline: `8eab317484fb6e789b8b8f332f2000905b9fcf28`, expected branch
`overnight/2026-10-15_feedback`; local upstream tracking ahead 76/behind 2
(no fetch). Only UI/, apps/mobile/.gitignore and supabase/.temp/ are untracked;
they are unrelated and preserved. Root AGENTS.md is the only tracked policy.
AUTOPILOT and current planning records, ADR-048/049 were read. OA1 supersedes
OR3b's removal of disconnected Today halos; that historical decision is not a
scope conflict with the new explicit owner request.

## Render inventory and acceptance matrix

| Surface | Owner / callers | Baseline and intended proof | Result / limitation |
| --- | --- | --- | --- |
| Web Today | DayRingClock -> DeferredDayOrb -> DayOrb | Transparent Three canvas, 36deg/4.55 camera, 0.95 radius, 64% footprint; DPR <=1.5, 80ms idle/16ms interaction. No aura. Shared glass composite in same view. Actual browser light/dark/narrow/Reduce Motion capture and scene tests. | Implemented; local proof below; final visual approval remains OA2 |
| Web Generation + Queue detail | queue.tsx GenerationScreen (/generation/[id], including jobs opened from Queue) -> GenerationOrb -> DayOrb | Same body, day tones, remembered palette even while working; state changes motion/brightness. No aura. Browser states/gestures + caller tests. | Implemented; local proof below; final visual approval remains OA2 |
| Mobile Today | TodayScreen -> DayRingClock -> redesign/DayOrb | Expo GL transparent alpha clear, RENDER_SCALE 0.6, same camera/body, 80ms/16ms, AppState + live focus. No SVG halo (removed in OR3b). GL scene/foreground tests and Android export. | Device appearance UNVERIFIED |
| Mobile Generation + Queue detail | GenerateScreen preparation + GenerationScreen (including Queue-opened jobs) -> GenerationCore -> DayOrb | Same day body/tones/interaction; optional ExpoGL module guard. Scene/caller regressions. | Device appearance UNVERIFIED |
| Web KnowledgeCore | exported KnowledgeCore (no current production caller) | Own transparent Three renderer, DPR <=2, existing state cadence, centered single-color additive aura. State palette only idle overridden. | Implemented; local proof below; final visual approval remains OA2 |
| Mobile KnowledgeCore lab | GenerationCoreLab -> generation-core/KnowledgeCore | Own Expo GL, focus/AppState; same old aura/state contract. | Implemented; local proof below; final visual approval remains OA2 |
| Web deferred / failed GL still | DeferredDayOrb CSS still; DayOrb / KnowledgeCore CSS fallback | Current fallback has no running renderer. Must keep static, palette-derived spill with no loop. | Implemented; local proof below; final visual approval remains OA2 |
| Mobile failed GL still | DayOrb / KnowledgeCore bundled PNG | Static branding pearl image, no renderer. Must keep safe static spill from that exact image, not claim dynamic palette parity. | Implemented; local proof below; final visual approval remains OA2 |
| Mobile no ExpoGL | GenerationCore -> GenerationVisual | Non-orb page/orbit illustration, existing native-driven motion. Not a glass orb; retain illustration. | NOT APPLICABLE to orb spill |
| Queue header miniature, both apps | QueueButton / queue-button.tsx | Bundled theme-specific raster orb and 9s rotation; current unrelated accent disk. Blur the same raster, share rotation; retain hit area. | Implemented; local proof below; final visual approval remains OA2 |

Body shader uses linear colors base/deep/glow, procedural liquid time/life/stir,
inverse spin, world-space inner light, error desaturation and existing shimmer.
Ambient must use those exact accepted inputs, without touching body/clock shader
appearance. Existing palettes and shared synced preference remain authoritative.
GL and fallback hosts have transparent, non-interactive margins; fading must finish
inside existing canvas bounds to avoid clipped rectangles. No layout expansion,
new GL view, per-frame React updates or higher render rate is required.
Reduce Motion draws only on explicit changes and uses a stable pose; ambient must
snap to the current palette/state rather than schedule a settling loop. Hidden,
unfocused, disposed scenes must stop requests/draws. Context loss retains stills.

## Approach

Implemented: one shared GPU helper on a dedicated package subpath
(similar to clock-glass-renderer), with thin existing aura adapters. Reuse the
body's final uniforms to eliminate palette drift. Broad weighted directional
samples of the same procedural liquid are diffused into a low-contrast spill.
This approximates the visible body field; it does not sample pixels or reproduce
YouTube's private algorithm. No new render target or full orb renderer.

## Verification and owner work

Final gate ledger follows below. API tests are NOT APPLICABLE: no API code,
schema or default shared export changed; ambient is a separate client-only subpath.
Rollout and Device checks: NOT RUN, skipped entirely. Live revisions, database,
Scheduler and physical appearance/performance are UNVERIFIED (owner to confirm).

## Implementation (STEP 1-2)

Implemented under `shared/orb-ambient-renderer` with a pure exponential response
in `orb-ambient.ts`. Existing aura files are identical thin platform adapters.
All four scenes pass final body uniforms after `body.update`; body shader,
interaction model, preference sync and clock composite sources are unchanged.
Today gains one plane; KnowledgeCore replaces its old one. No stacked SVG/CSS
halo on GL paths. Scene callbacks cancel queued rAF while inactive; GenerationOrb
also suspends its minute timer when hidden. Queue's native opacity/rotation
animations stop on focus/background/disposal. Web miniature rotates its common
source+spill parent and pauses when hidden. Reduce Motion suppresses all
continuous movement via the existing platform policy.

Directional liquid samples drive spatial light variation. Color changes use a
0.24-second exponential response, initialized/snapped to source for reduced
motion. Existing camera, ball size, layout, hit areas, bounds, DPR limits, native
0.6 scale and frame cadences are preserved. Final shader has broad smooth radial
weighting, transparent edge pixels and no independent ambient pulse. Light
backgrounds blend the source hue toward paper to avoid a dark shadow. The exact
body shimmer remains for body lighting only; its original bounded/irregular
regression is retained. Static fallback gradients/images diffuse themselves.
The mobile PNG is the existing pearl still: dynamic GL/palette parity cannot be
claimed when that fallback is shown. No-ExpoGL's GenerationVisual is a page
illustration, not an orb; it is unchanged.

## First attempts and repairs (retained evidence)

- Baseline glass browser suite FRESH PASS 10/10. Baseline isolated captures PASS
  2/2 (16 Today/standalone no-clock DayOrb combinations). Initial harness file
  creation failed because `python` is unavailable, then a shell-embedded JS
  string was invalid; both subsequent test invocations found no test file and
  exited 1. The harness was written with PowerShell and then passed. No product
  or gate was weakened; before images are retained in OA1-before.
- Shared focused first run: 2 passed / 1 failed. Exact equality exposed floating
  cancellation in `Color.lerp(..., 1)` for a dark source. Initialization and
  reduced motion now use `copy` to preserve the exact source. Rerun 3/3 PASS.
- Mobile focused first run: 51 passed / 1 failed: old fallback assumed one Image.
  It now distinguishes the sharp source from its blurred duplicate. Rerun 52/52,
  then lifecycle coverage 53/53 PASS. Web focused 46/46, then 47/47 PASS.
- First forced root typecheck: 7/8 tasks PASS, 0 cached; mobile failed on two
  unsupported Image `pointerEvents` props. Touch pass-through moved to View
  hosts. Second forced run FRESH PASS 8/8, 0 cached, 46.045s.
- First visual inspection found a too-prominent dark ring and a gray paper
  shadow. The shader's inner fade was broadened and paper color blending added.
  Actual GPU pixels now verify transparent edges, spatial spill and unchanged
  body; tests are not shader-string assertions. Visual suite at that checkpoint
  passed 6/6; final suite/gate results follow below.

## Full-suite first attempt and diagnostic correction

The first full web command (`npm run test --workspace @stay-focused/web --
--maxWorkers=1`) finished 521 passed / 3 failed / 524 tests, 70 passed / 2 failed
of 72 files. Two new pixel tests summed RGB differences of 289/207 after
round-tripping the GPU canvas through a 2D canvas. Direct QA-only WebGL buffer
snapshots prove exact interior RGBA equality (normalized radius < 0.30) (both bodyDiff = 0), while the
spill changes 1,126,172 / 693,155 summed alpha units and outer-edge alpha remains
0. No production framebuffer read or tolerance relaxation was added. The 2D
premultiplication/color-conversion round trip was the measurement problem.

The third failure was the existing Generation browser's immediate progress
sample: its animated caption was 2 of 18 while approaching the fixture's 3 of
18. The test now waits for that same exact target before reading the list;
its assertion is retained. Focused retry of both affected browser files passed
11/11 across 2 files. Final full retry is recorded below. No gate or product
validation was weakened. Default shared suite discovers src and compiled dist
copies; the source-only run is recorded separately to avoid inflating unique
coverage. Early lint passed 8/8 with two added BOM warnings (8 total); BOMs
were removed; final lint retains only the 6 baseline warnings.

## Local visual and resource evidence

All browser traffic was restricted to the local harness origin. Components
use no academic body content, account or production API. Baseline screenshots
are in `tmp/overnight/OA1-before/` (16 combinations; Generation baseline used
its underlying DayOrb at 315px). After images and short WebM captures are in
`tmp/overnight/OA1-after/` and `video/`: actual DayRingClock + actual
GenerationOrb at 1440/390 widths, both themes and both motion preferences,
four palette choices, five generation states, held rotation and context loss.
Before video was not captured. Static screenshots, scene/GPU proofs and after
videos are local implementation evidence; final reference/physical parity
remains UNVERIFIED for the separate OA2 milestone.

Visually inspected desktop/narrow clock, green/orange palette, paper/reduced
motion and context-loss still images. Edges fade without a rectangular cut;
source tint is visible on dark, restrained on paper. Glass and plain fallback
time remain legible. Existing real-browser glass tests also exercise ring drag
and bright-pearl stroke contrast; physical touch feel remains UNVERIFIED.

Same GL1 instrumented harness before/after (Chromium SwiftShader, software GPU):

| Render | Draw calls before -> after | Median interval ms before -> after | Median CPU submission ms before -> after | p95 submission ms before -> after |
| --- | --- | --- | --- | --- |
| Body only | 1 -> 2 | 83.4 -> 83.6 | 0.2 -> 0.3 | 0.3 -> 0.9 |
| Body + glass | 3 -> 4 | 83.2 -> 83.3 | 0.3 -> 0.5 | 0.4 -> 0.8 |

Evidence: `OA1-before/renderer-cost.json`, `OA1-after/renderer-cost.json`.
These are local CPU submission samples (24/23 warmed frames), not GPU time,
physical FPS, power or a performance guarantee. The ambient harness additionally
forces preserveDrawingBuffer for QA pixel snapshots, so its submission samples
are not compared against the normal renderer. Across palette/state captures,
renderer.info stays at 2 geometries/0 textures without clock and 4 geometries/
2 textures with clock after warmup. No new render target or texture is allocated
by the ambient plane. Disposal is checked with resource spies and actual browser
context loss; Android allocation/power/compositing remain UNVERIFIED.

Transparent source corners were checked locally: both Queue rasters are
144x144 with corner alpha 0, and the existing native fallback PNG is 1024x1024
with corner alpha 0. Native blur quality itself still requires owner review.


## Final gates (STEP 3, FRESH unless stated)

Final production source is committed as 3b1abbbb + 50cf0103. Gates ran on that
working-tree source before committing. All commands ran serially, with repo-local
TEMP/TMP; telemetry disabled and Expo offline for builds. Root final build also
used --concurrency=1. No dependency version or validation configuration changed.

| Required gate | Actual result | Evidence under tmp/overnight/ |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS 8/8 tasks, 0 cached; 41.567s | OA1-typecheck-final.log |
| npm run lint -- --force | FRESH PASS 8/8, 0 cached; 6 existing warnings (5 mobile, 1 web), 0 errors; 66.647s | OA1-lint-final.log |
| npm run build -- --force --concurrency=1 | FRESH PASS 8/8, 0 cached; 285.793s | OA1-build-final.log |
| npm run test --workspace @stay-focused/shared -- --maxWorkers=2 | FRESH PASS 660/660, 68 files, includes compiled duplicates | OA1-shared-full.log |
| Additional shared source-only: npm run test --workspace @stay-focused/shared -- src --maxWorkers=2 | FRESH PASS 330/330, 34 source files | OA1-shared-source.log |
| npm run test --workspace @stay-focused/mobile -- --maxWorkers=2 | FRESH PASS 1581/1581, 166 files | OA1-mobile-full.log |
| npm run test --workspace @stay-focused/web -- --maxWorkers=1 | FRESH PASS 524/524, 72 files; dedicated ambient 8 + glass 10 + Generation page 3 browser cases | OA1-web-full2.log |
| Relevant API tests | NOT APPLICABLE: client-only subpath, no API/default shared runtime/schema change | Source diff + API build |
| API build | FRESH PASS equivalent final root @stay-focused/api:build, 37/37 generated pages; separate invocation NOT RUN | OA1-build-final.log |
| Web build | FRESH PASS equivalent final root @stay-focused/web:build, 23/23 generated pages; separate invocation NOT RUN | OA1-build-final.log |
| Android export | FRESH PASS equivalent final root @stay-focused/mobile:build, Android HBC bundle emitted (also iOS/web); separate --platform android invocation NOT RUN | OA1-build-final.log |
| git diff --check | FRESH PASS, exit 0, 0 whitespace errors | OA1-diff-check.log |
| git diff --cached --check | FRESH PASS, exit 0, 0 whitespace errors for each scoped commit | OA1-cached-check.log + Git |

The prompt expressly permits a fresh equivalent build to be reused when its
output proves the same gate on final source. The final root build executes the
same API/web next build scripts and emits the Android platform export, with no
Turbo cache hits. These three outcomes are reused rather than rebuilt again.
The earlier root build also passed 8/8 (0 cached, 276.689s), before the final web
focus/fallback refinements; it is not the final build evidence. Next regenerated
both next-env.d.ts declarations; their generated-only diffs were inspected and
restored, as in prior slices. No generated output is committed.

The timing table above measures DayOrb, shared by Today and Generation.
KnowledgeCore replaces its existing aura plane; its source scene still has one
body and one ambient plane. No physical GPU, FPS or battery claim is made.

## Requirement closure and checkpoint (STEP 4)

| Requirement | Implementation and proof | Local result / limit |
| --- | --- | --- |
| Palette, state, day light and rotation coupling | Final body uniforms -> shared directional field; shared/model, both adapter/KnowledgeCore suites, native/web DayOrb scenes, actual browser palette/state captures | PASS locally; procedural approximation, not pixel extraction |
| Temporal easing | 0.24s exponential response; equal elapsed-time 12.5/30/60Hz regression; exact initialization/reduced-motion copy | PASS |
| Reduced motion | Stable source-driven light, one frame on changes, no ambient scheduler; model, scene and browser regressions | PASS locally; physical preference path UNVERIFIED |
| Lifecycle/disposal | Visibility and blur/focus cancel browser frames/timer; AppState/live/focus stop native scenes; idempotent plane disposal and actual context loss/stills | PASS locally; native context behavior/allocations UNVERIFIED |
| Every render path without stacked glow | Four GL scenes, deferred and failed stills, image-derived Queue miniatures; source inventory above, full client suites and Android export | PASS code coverage; miniature/native appearance UNVERIFIED |
| Preserve orb, gestures, clock and layout | Body, interaction and clock shader sources unchanged; exact interior GPU pixels, existing ring/ripple/inertia/color tests, glass drag/contrast and Generation page browser cases | PASS locally; final reference parity/touch feel UNVERIFIED |
| No remote/schema/settings expansion | Dedicated client helper; no migration, API/provider change, new setting or dependency | PASS source audit |

Implementation commits:

- 3b1abbbb feat(shared): add source-coupled orb ambient renderer
- 50cf0103 feat(orb): integrate ambient spill across web and mobile
- Documentation closure: docs(orb): close OA1 local implementation and gates
  (this report's commit; exact hash is in Git and tmp/overnight/OA1.status).

Status: PASS for OA1's finite unattended local code scope. This is not deployment,
physical-device acceptance or final visual approval. All requested code steps and
applicable gates are complete; no later scope was started. Six baseline lint
warnings, default shared compiled-test duplication, lack of baseline video,
static pearl fallback limitations and physical visual/performance work are
explicitly retained, not hidden.

### Owner steps remaining

- Supervisor reviews OA1 commits, source coverage, gate logs and local artifacts,
  then publishes a separate bounded OA2 visual/performance/coverage milestone.
  OA2 was NOT RUN and must not be inferred from local unit PASS.
- Rollout: NOT RUN, skipped entirely. Use the owner's separately authorized
  release process after review; no push or deployment occurred here.
- Device checks: NOT RUN, skipped entirely. Confirm Android Today, preparation,
  Generation/Queue-opened jobs, miniature and fallback spill in both themes;
  palette/state changes, Reduce Motion, glass/plain clock, gestures/scrolling,
  clipping, focus/background cleanup, GPU/frame timing, memory and power.
- Deployed revisions, live preference/database/migration/Scheduler state and all
  physical results remain UNVERIFIED (owner to confirm). No Supabase, Vercel,
  Google Cloud, Canvas or Resend call, remote SQL, Scheduler action, environment
  file edit or push was performed. Original UI/, apps/mobile/.gitignore and
  supabase/.temp/ are preserved; Owner Pause and unrelated scopes are unchanged.
