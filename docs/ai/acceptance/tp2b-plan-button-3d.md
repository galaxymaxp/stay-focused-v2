# TP2b: orb-material Plan button

Status: IN PROGRESS. Scope: STEP 0–3, local tests/gates/docs/commits only.
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
| Shared glass/liquid/studio/scene factories, orb unchanged | Fixed-time/seed before/after actual GL frames and diff | Pending |
| Thick rounded slab, 45% accent liquid, fixed geometry | Real GL captures and geometry/outline checks | Pending |
| 600ms internal slosh, static Reduce Motion / opacity | Shared model, lifecycle and platform tests | Pending |
| Plan through clock glass shader / sibling MSDF atlas | Layout/shader and actual glyph pixel checks | Pending |
| Shared deferred web chunk and native GLView, pause/failure/disposal | Bundle inspection and platform/browser tests | Pending |
| 390/768/1280 light/dark rest/slosh | Chromium WebGL captures; same shared scene phone proxy if native unavailable | Pending |
| TP2 sheet/planner/logo rules unchanged | Existing regressions and full affected suites | Pending |
| Required fresh serial gates | Exact commands/counts, first failures retained | Pending |

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
