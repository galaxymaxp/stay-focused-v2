# TP2b: orb-material Plan button

Status: PASS (local). Scope: STEP 0–3, local tests/gates/docs/commits only.
The unattended rules prohibit deployments, remote services/SQL, Scheduler,
email, env-file edits and push. Rollout and Device checks are NOT RUN.

## Baseline and STEP 0 inventory (before code edits)

Branch: `overnight/2026-10-15_feedback`; HEAD: `b829bf19`.
FRESH `git merge-base --is-ancestor b829bf19 HEAD`: exit 0.
Local tracking comparison: ahead 11, behind 29 (no fetch performed).
Author: galaxymaxp <omgraythekid@gmail.com>.

```text
b829bf19 docs(today): close TP2 local planning verification
4a04eda1 feat(today): add Plan sheet and size-aware block marks
ac428fed fix(planner): preserve selected work and chronological order
705013b5 feat(planner): add owned selections and planning candidates
630bb223 docs(today): freeze TP2 implementation acceptance
6456d91a docs(web): record WEB-A4 release readiness and FULLSEND handoff
543c87d8 docs(web): record WEB-A3 website repairs
614138c7 fix(web): keep saved drafts current after reload and restore copy
```

`git status --short`:

```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

These owner paths and all tmp paths remain unstaged. Read the full TP2b
prompt, root AGENTS.md, AUTOPILOT.md, current planning entries, newest handoff,
TP2 acceptance and owner roadmap/addendum. TP2b supersedes TP2's flat-rendering
equivalent. ADR-048 and ADR-049 describe the rendering and bundle boundaries.

| Piece | Exact baseline implementation |
| --- | --- |
| Scene / camera / output | `buildScene` in both DayOrb.tsx files: Three WebGLRenderer, alpha/premultiplied rendering, sRGB, ACES filmic, exposure 1.02, perspective 36°, distance 4.55 |
| Glass shell, liquid and studio | Both `knowledge-core/orbBody.ts` (web) and `generation-core/orbBody.ts` (mobile), identical `createOrbBody`, `VERTEX`, `FRAGMENT`; SphereGeometry 0.95/96/64; custom ShaderMaterial, not MeshPhysicalMaterial |
| Optical model | Fragment `studio`, `liquid`, refracted five-sample volume, Fresnel, specular and caustic; `orbAppearance` and `ORB_GLASS_MATERIAL` supply tones/environment/density/emission |
| Ambient | Shared `createOrbAmbient` in `orb-ambient-renderer.ts`, 64×64 source capture; platform `createOrbAura` forwards update/capture and existing shimmer |
| Glass glyphs | `createClockGlass` / `CLOCK_GLASS_FRAGMENT`, half-float orb target then base/glyph composite; `layoutClockGlyphs` supplies MSDF quads; `scripts/build-clock-glyph-atlas.mjs` generates bundled Inter Bold atlas |
| Native atlas/fonts | DayOrb `loadClockAtlas` uses expo-asset, native localUri PNG decoding; `clockFonts.ts` loads Inter 500/600/700 for fallback; existing atlas contains only time glyphs |
| Deferred web module | `DeferredDayOrb` calls cached `preloadDayOrb` promise, `import('./DayOrb')`; Three and glass stay behind this lazy boundary; atlas preloads alongside it |
| Load / input | `useOrbLoad` and shared `createOrbLoadGate` handle first frame/timeout/failure; both `useOrbInteraction` implementations own palette/rotation and are excluded from the button |
| Plan and sheet | Both PlanButton files currently animate SVG paths and styled plain text; both planning-sheet files own the unchanged behavior, semantics and placement |

The orb IS a genuine 3D/GL renderer; STEP 0 permits continuation. Live served
revision, native GL/device state, production/database/Scheduler/provider state:
UNVERIFIED (owner to confirm); no remote inspection is permitted.

## Acceptance matrix

| Requirement | Proof | Result |
| --- | --- | --- |
| Shared glass/liquid/studio/scene factories, orb unchanged | Fixed-time/seed before/after actual GL frames and diff | PASS (local) |
| Thick rounded slab, 45% accent liquid, fixed geometry | Real GL captures and geometry/outline checks | PASS (local) |
| 600ms internal slosh, static Reduce Motion / opacity | Shared model, lifecycle and platform tests | PASS (local) |
| Plan through clock glass shader / sibling MSDF atlas | Layout/shader and actual glyph pixel checks | PASS (local) |
| Shared deferred web chunk and native GLView, pause/failure/disposal | Bundle inspection and platform/browser tests | PASS (local) |
| 390/768/1280 light/dark rest/slosh | Chromium WebGL captures; same shared scene phone proxy if native unavailable | PASS (local) |
| TP2 sheet/planner/logo rules unchanged | Existing regressions and full affected suites | PASS (local) |
| Required fresh serial gates | Exact commands/counts, first failures retained | PASS (local) |

## Owner steps remaining

- Rollout NOT RUN: release via the next separately authorized FULLSEND.
- Device checks NOT RUN: website and Realme material appearance, press slosh,
  fixed accent while the orb changes palette, native GL/performance/accessibility.
- Confirm live deployed/database/Scheduler state separately.

## STEP 1 receipt

Extracted `createOrbBody` to the GPU-only shared `orb-body-renderer` subpath;
both old platform paths re-export it. Extracted scene/camera/output setup to
`createOrbStage` / `configureOrbRenderer` in shared `orb-scene`, used by both
DayOrb implementations. The sphere shader, geometry and uniforms are unchanged.
FRESH fixed noon / time 8.4 / pearl / Reduce Motion Chromium SwiftShader captures
before and after: **0 changed channels out of 396,900 in each theme; maximum
channel difference 0**. [Light before](../../../tmp/overnight/TP2b/orb-before-light.png),
[light after](../../../tmp/overnight/TP2b/orb-after-light.png),
[dark before](../../../tmp/overnight/TP2b/orb-before-dark.png),
[dark after](../../../tmp/overnight/TP2b/orb-after-dark.png).
Machine receipt: tmp/overnight/TP2b/orb-diff.json. FRESH extraction-focused web
regressions: **22/22 tests, 2/2 files** (`extraction-focused.log`).


## STEP 2 implementation

- `orb-body-renderer.ts` now accepts an arbitrary shell geometry and optional
  slab bounds. The sphere retains its original shader text. The slab substitutes
  the refracted ray's box exit and rounded-rectangle containment for the sphere
  intersection, and bounds the same flowing liquid field below a 45% surface.
  It uses the same studio, Fresnel, refraction, five volume samples, emission,
  caustics and tone mapping. A wider key reflection is the shallow slab's sole
  specular tuning. No 2D layer is the live renderer.
- Shared `plan-glass-renderer.ts` creates the beveled ExtrudeGeometry slab with
  real 0.27-height thickness and the existing radius token, the extracted orb
  stage/body, shared `createOrbAmbient` capture and `createClockGlass` composite.
  Only the liquid's surface uniform moves. No orb palette store, theme color
  sync, touch-wave, rotation or color-fade input reaches this scene.
- The accent defaults to #d7aa38. Web honors the existing scoped
  --plan-action-accent override; native accepts an explicit accent override.
  The liquid's deep tint stays in that hue while theme changes the studio.
- A bounded damped surface tilt follows the press side and reaches exactly
  zero at 600ms. Centered/keyboard presses get a small deterministic tilt.
  Reduce Motion freezes time and slosh and uses the existing 0.85 opacity dip.
- Web `PlanGlassCanvas` is re-exported from DayOrb and obtained through the
  exact existing cached `preloadDayOrb` dynamic-import promise. No Three/GPU
  helper enters the normal shared barrel or initial route bundle. The test
  build verifies Three is absent from entry.js. The canvas renders at 0.8
  CSS resolution with the orb's bounded pixel ratio; native GLView uses 0.6
  scale like the orb. Idle draw cadence is 80ms; active slosh is 16ms.
- Both adapters pause on loss of focus/visibility/foreground and dispose
  scene, targets, atlas and renderer. Native context replacement hides the old
  frame and restarts its first-frame/timeout gate. Late atlases are disposed.
  Unsupported GL/float targets, missing atlas, shader/draw failure, timeout or
  context loss expose TP2's original flat fallback only. Web's fallback DOM is
  kept display:none until failure (including its original feedback), preserving
  TP2's unchanged browser assertions. It is never visible in GL captures.
- `scripts/build-clock-glyph-atlas.mjs --label` uses the same committed Inter
  Bold and MSDF generator to create identical plan-atlas.png/json on both
  platforms. Clock assets are untouched. `layoutClockGlyphs(..., true)` keeps P
  full-size; `createClockGlass(..., true)` uses the identical glass shader with
  rectangular layout and no clock scrim. Mobile's original native PNG upload
  is extracted to `glassAtlas.ts` and shared by clock and label.
- A resize listener also refreshes token radii when the media breakpoint changes
  without changing the column width. Its regression is included in the final
  web suite; typecheck/lint rerun after this final source review.
- Both accessible action labels, disabled behavior, onPress, full width and
  48px web / 52px native sizes remain. Planning sheets, planner and logo rules
  and their tests are unchanged. Original native PlanButton tests now target
  the unchanged fallback; separate live-adapter tests cover the GL path.

## STEP 3 visual evidence

All images below are actual Chromium/SwiftShader GL, with no visible fallback:

| Width | Light rest / slosh | Dark rest / slosh |
| --- | --- | --- |
| 390 | [rest](../../../tmp/overnight/TP2b/390-light-rest.png) / [slosh](../../../tmp/overnight/TP2b/390-light-slosh.png) | [rest](../../../tmp/overnight/TP2b/390-dark-rest.png) / [slosh](../../../tmp/overnight/TP2b/390-dark-slosh.png) |
| 768 | [rest](../../../tmp/overnight/TP2b/768-light-rest.png) / [slosh](../../../tmp/overnight/TP2b/768-light-slosh.png) | [rest](../../../tmp/overnight/TP2b/768-dark-rest.png) / [slosh](../../../tmp/overnight/TP2b/768-dark-slosh.png) |
| 1280 | [rest](../../../tmp/overnight/TP2b/1280-light-rest.png) / [slosh](../../../tmp/overnight/TP2b/1280-light-slosh.png) | [rest](../../../tmp/overnight/TP2b/1280-dark-rest.png) / [slosh](../../../tmp/overnight/TP2b/1280-dark-slosh.png) |

![Actual orb and button crops beside each other](../../../tmp/overnight/TP2b/orb-button-comparison.png)

[Actual press mid-slosh](../../../tmp/overnight/TP2b/actual-press-mid-slosh.png).
The reproducible rest/slosh matrix fixes shared shader time and surface tilt;
separate actual-input coverage observes nonzero slosh after a side press,
unchanged action bounds and zero tilt after settling. The test-only Three
instrumentation reads the framebuffer; product code does no CPU readback.

[Native shared-scene proxy](../../../tmp/overnight/TP2b/native-shared-scene-web-proxy-390.png)
is explicitly labelled **web GL at phone width, 52px**, using the exact shared
scene that native calls. This Windows unattended run cannot establish native
GL presentation without the excluded Device checks. Native GL, Realme visual
acceptance, real GPU timing, power and assistive technology remain UNVERIFIED
(owner to confirm), not silently substituted by the proxy.

Headless cadence (24 warmed orb frames per case), final full-suite receipt:
fallback baseline median 83.7ms, live GL button 83.2ms. Final
composite CPU submission median 0.2ms / 0.1ms and p95
1.8ms / 0.2ms respectively. This is software Chromium, not
GPU or physical-device performance (`orb-cadence.json`).

## First failures and corrections

| Check | First result and correction |
| --- | --- |
| Extraction staged diff | One extra blank line at DayOrb.tsx EOF; accidentally included in 2eb2a0ef, removed in the next owned change. Subsequent diff gate passes. |
| native-focused-first.log | 39 passed / 3 failed, 3 files passed / 1 failed. New adapter harness lacked Node's PNG require loader, so native asset resolution failed before the scene mock. Added the same inert asset loader as existing DayOrb tests; unchanged assertions rerun 42/42, 4/4 files. |
| typecheck-expanded-first.log | One TS2769 in the new silhouette test: reduce inferred a 0-or-1 accumulator. Supplied the correct number accumulator type. 4 successful / 6 total tasks before Turbo stopped. No product validation weakened. |
| lint-first.log | 8/8 tasks, zero errors, ten warnings; three new native DayOrb duplicate/late-import warnings. Consolidated the shared scene import; final lint must return to seven existing warnings. |

A first skill-file read used the wrong installed version path; corrected to
vercel 0.54.1 and applied its React lifecycle/lazy-loading review. A rejected
apply_patch attempted delete/add on the same file; the atomic tool made no
changes, and the file was then updated normally. No failed application check
or assertion has been hidden or weakened. Final gate receipts follow.

Final receipt-helper first attempt: it expected UTF-8 logs, but Windows
PowerShell redirects command output as UTF-16LE, so it rejected the shared
summary before writing completion docs. Added BOM-aware log decoding; the
original gate logs and assertions are unchanged. This is a documentation-helper
failure, not an application-gate failure.


## Final verification receipts

FRESH: shared 862/83 files; API 2517/218 files (3 existing live skips); mobile 1725/184 files; web 675/85 files. **5779 passed / 0 failed / 3 existing live skips**.

| Command | Result | Evidence under tmp/overnight/TP2b |
| --- | --- | --- |
| npm run test --workspace @stay-focused/shared -- --maxWorkers=1 | FRESH PASS, exit 0 | shared-full.log |
| npm run test --workspace @stay-focused/api -- --maxWorkers=1 | FRESH PASS, exit 0 | api-full.log |
| npm run test --workspace @stay-focused/mobile -- --maxWorkers=1 | FRESH PASS, exit 0 | mobile-full.log |
| npm run test --workspace @stay-focused/web -- --maxWorkers=1 | FRESH PASS, exit 0 | web-full.log |
| npm run typecheck -- --force | FRESH PASS, exit 0, 8/8 tasks, 0 cached | typecheck-final.log |
| npm run lint -- --force | FRESH PASS, exit 0, 8/8 tasks, 0 cached | lint-final.log |
| npm run build --workspace @stay-focused/api | FRESH PASS, exit 0, 38/38 static pages | api-build.log |
| npm run build --workspace @stay-focused/web | FRESH PASS, exit 0, 23/23 static pages | web-build.log |
| npm run build --workspace @stay-focused/mobile -- --platform android --output-dir ../../tmp/overnight/TP2b/android-export | FRESH PASS, exit 0, 1 HBC bundle, 37 assets and metadata | android-export.log |
| npm run build -- --force --concurrency=1 --env-mode=loose | FRESH PASS, exit 0, 8/8 tasks, 0 cached | root-build.log |
| git diff --check / git diff --cached --check | FRESH PASS, repeated before every final commit | Git |
| Workflow/provider contract gates | NOT APPLICABLE: no workflow/provider changes | Unchanged implementation |
| Rollout / Device checks | NOT RUN; UNVERIFIED (owner to confirm) | Unattended exclusion |

Shared's recorded Vitest run discovered 42 source test files and 41 existing
emitted test files in dist; 862 is the runner's reported total, including those
mirrors. No compiled validation output is staged.

All mandatory commands ran serially using repo-local TEMP/TMP/TMPDIR and
local npm/Turbo caches, EXPO_NO_DOTENV=1, EXPO_OFFLINE=1, telemetry disabled
and the loopback-only Node/browser network guards. No remote service call or
env-file edit occurred. Lint has seven existing warnings, zero new warnings
and zero errors. Existing Expo FORCE_COLOR/NO_COLOR and Vite config-loader
notices are tooling warnings. No new migration or dependency was added.

The 14 actual WebGL browser checks pass, including missing GL/atlas, context
loss, reduced motion, focus, actual press/settling and palette isolation.
Unchanged TP2 planning browser tests pass 8/8 in the full web suite. Native
focused regressions pass 42/42 (4 files); the full suite also covers the
unchanged sheet, planner and logo fit rules.

Metrics: 30/30 identical rendered silhouette masks; 187 shaded
MSDF-interior pixels, 142 distinct interior RGB shades (solid
interiors selected through the atlas, not anti-alias fringes). Six capture
metrics show p90-minus-p10 luminance >0.18, highlight-minus-p90 >0.08 and
median liquid hue within 3 degrees of the 43.77-degree accent. Across both
press sides and themes, hue remains within the required +/-6 degrees while
the orb visibly changes palette. See *-shading.json, shape-label.json and
color-stability.json.

Native GL presentation, physical FPS/power, Realme and other real browsers,
assistive technology, served revision and remote database/Scheduler/provider
state: **UNVERIFIED (owner to confirm)**. The local GL proxy is labelled.

## Commits and endpoint

Commits are listed in the final handoff and tmp/overnight/TP2b.status; every
commit uses author galaxymaxp <omgraythekid@gmail.com>. No tmp, generated
validation output, private fixture, credential or unrelated owner path was
staged. Product MSDF assets are intentionally committed build inputs.
No push. Endpoint TP2b only: no release, FULLSEND or other backlog work started.

Verified implementation head: 5c54a0f54f02ba2bc7d9b07bbc94e82029f19099 (tree 54cbf3714bb8112f4f24963d73893ff2c7e7ed58). The gates
ran against the same application/package/script bytes before those local
commits; subsequent completion changes are documentation only.
