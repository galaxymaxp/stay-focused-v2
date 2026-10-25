# QL1 Queue miniature: acceptance

Scope frozen 2026-10-25 at `06e64db4`, branch
`overnight/2026-10-15_feedback`. TP2d prerequisite PASS is established by
Git and its acceptance report. Unattended rules prohibit remote services,
deployment, database work, env-file access, push and device checks.

## QL1b terminal checkpoint: FAILED (2026-10-26)

Stopped under unattended rule 5 after bounded attempts to obtain green web
regressions. The existing ambient generation capture exceeds its unchanged
30-second deadline both in the full retry and in an isolated file invocation.
Resource pressure was observed, but no application regression or exclusive
cause is established. No assertions, deadlines or live orb paths were changed.
The remaining required gates are NOT RUN; this item is not release-ready.

Tested worktree: `3a74047b` plus the retained QL1b patches. Native output now
preserves screen ACES/sRGB ordering, opaque paper and upright snapshots; web
theme changes clear an obsolete palette crossfade. The two new web adapter/GL
test files and implementation corrections remain uncommitted. The baseline,
shared still implementation and Queue wiring commits are not repeated.

| Check | Evidence label | Exact result |
|---|---|---|
| Shared full suite | FRESH | 888 passed / 0 failed, 89 files (45 source and 44 existing emitted mirrors) |
| Mobile full suite | FRESH | 1732 passed / 0 failed, 186 files |
| Queue GL proof | FRESH | 13 passed / 0 failed; 24 paired web/native-proxy comparisons |
| Web full first attempt | FRESH FAIL | 706 passed / 1 timeout, 88 files |
| Course options isolated | FRESH | 3 passed / 0 failed with original settings |
| Web full retry | INTERRUPTED | 5 observed failed cases; no final aggregate |
| Web isolated non-browser group | FRESH | 544 passed / 0 failed, 75 files |
| Web isolated course options group | FRESH | 3 passed / 0 failed, 1 file |
| Web isolated ambient group | FRESH FAIL | 13 passed / 1 timeout, 1 file |
| Forced root typecheck / lint | NOT RUN | 0 gates executed in QL1b |
| Direct API / web builds | NOT RUN | 0 gates executed |
| Offline Android export / forced serial root build | NOT RUN | 0 gates executed |
| API/provider/live suites | NOT RUN | API code unchanged; live calls prohibited |
| Working/staged diff hygiene | FRESH | 2/2 checks PASS, exit 0; checked again after staging checkpoint docs |

Logs are `tmp/overnight/QL1/ql1b-*.log`; the incomplete partition inventory and
summary are `web-test-inventory.txt` and `web-partition-summary.json` there.
No aggregate partition PASS is claimed: execution stopped after ambient failed,
with 11 browser files still pending in that attempt. Previously passing files
are not substituted for a green final full-suite result.

Resume QL1b when adequate local resources are available: inspect these retained
patches, obtain green full web regressions without weakening assertions, run
all remaining fresh serial gates, then commit code and reconcile completion.
Do not redo `5533c32b`, `cbb9703f` or `3a74047b`.

Only the documentation failure checkpoint is committed in QL1b, titled
`docs(queue): checkpoint QL1b failed web regression gate`. Its exact hash is in
Git and `tmp/overnight/QL1b.status`; all resumed implementation/test patches
remain uncommitted as required by the failed-gate rule.

## STEP 0: baseline before implementation

FRESH inventory: the only Queue orb mark is the shared header control on each
platform. Web `apps/web/src/components/queue-button.tsx` uses
`features/knowledge-core/OrbStill.tsx` (CSS gradient); mobile
`apps/mobile/src/design/QueueButton.tsx` uses
`features/generation-core/OrbPoster.tsx` (SVG radial gradient).
Both subscribe to the synced palette through their orb interaction handle.
These are static compatibility surfaces, not GL snapshots.

Web `apps/web/app/globals.css` supplies the OA1 `orb-static-source::before`
spill and the 9s Queue rotation. Mobile OrbPoster supplies its padded SVG spill;
`OrbImageSpill.tsx` is the unused raster-spill helper. The retained artwork is
`apps/{web/public,mobile/assets}/queue/orb-{light,dark}.png`; neither header
currently displays it. Web `day-clock/OrbLoadPoster.tsx` owns
`day-orb-still`; it too is a gradient. No pre-existing snapshot cache exists.

Queue panel headers, nav links, cards/list rows, course batches and Needs
attention contain text/content/status icons, with no additional orb marks.
`features/queue.tsx` also contains Generation progress/detail screens using
GenerationOrb; those are outside this task and remain unchanged. Mobile
generation-queue route redirects to the popover. QN1 failure cards remain frozen.

FRESH Chromium/SwiftShader captures, device scale 3, 26px body crop:
`tmp/overnight/QL1/baseline.cjs`, `baseline.json`, `*-old-web.png`,
`*-old-mobile.png`, `*-today.png`. Native baseline is a labelled SVG web proxy
of the exact OrbPoster gradients/geometry, not a native capture.
Today reference uses the actual shared body/stage/output transform, noon light,
time 8.4, identity spin, no digits. Metrics are linear-sRGB luminance within
radius 0.46 of the body crop, composited onto the same theme paper.

| Mode/color | Old web mean / p95 | Old mobile proxy mean / p95 | Today mean / p95 |
|---|---|---|---|
| light pearl | .86030 / .89567 | .80055 / .88792 | .90259 / .92096 |
| light gold | .77255 / .82609 | .71682 / .80290 | .89364 / .92096 |
| light green | .76775 / .81957 | .71081 / .79658 | .89313 / .92096 |
| dark pearl | .70286 / .81227 | .56998 / .82020 | .03547 / .19439 |
| dark gold | .51152 / .58928 | .41617 / .59559 | .03117 / .15923 |
| dark green | .48861 / .56151 | .39813 / .56783 | .03089 / .15574 |

The default dark web miniature is about 19.8 times the reference mean;
mobile proxy is about 16.1 times. Baseline does not meet QL1.

The initial dark baseline above used `#121212` paper and rounded the proxy SVG
viewport to 45px. A later capture-harness correction uses the actual existing
`#000000` dark background token and exact 44.72px SVG viewport. It reproduces
the unchanged old gradients; no old rendering is inferred from new pixels.
Original evidence is preserved in `tmp/overnight/QL1/baseline-first/`.
The corrected `baseline.json`/crops are used in the comparison strips below:

| Mode/color | Old web mean / p95 | Old mobile proxy mean / p95 | Today mean / p95 |
|---|---|---|---|
| light pearl | .86030 / .89567 | .79728 / .88792 | .90259 / .92096 |
| light gold | .77255 / .82609 | .71459 / .80282 | .89364 / .92096 |
| light green | .76775 / .81957 | .70866 / .79658 | .89313 / .92096 |
| dark pearl | .70286 / .81227 | .56069 / .82020 | .02379 / .16850 |
| dark gold | .51152 / .58928 | .40946 / .59559 | .02012 / .13672 |
| dark green | .48861 / .56151 | .39175 / .56783 | .01984 / .13291 |

## STEP 1–2 implementation checkpoint

Shared `orb-still.ts` provides versioned color/theme/physical-pixel keys, a
bounded 32-entry promise/LRU cache, invalidation and failed-request retry.
GPU-only `orb-still-renderer.ts` uses the existing body, clock stage, camera,
ACES exposure 1.02 and sRGB output. The fixed scene is Today at noon, time 8.4,
identity spin, no digits. Miniature spill is removed entirely (the decided
small-size option); the ambient renderer and all live orbs are unchanged.

Web uses a short-lived offscreen renderer, memory plus optional CacheStorage.
Mobile uses a serialized headless Expo context, a multisampled RGBA8 target,
upright PNG snapshot, the existing app cache directory, and guaranteed GPU
teardown. There is no mounted GLView or per-row renderer. Palette/theme/size
changes choose the appropriate cache key; hidden/unfocused callers schedule
no requests. Already-started snapshots finish and release resources, but stale
results cannot publish. Rotation remains the existing 9s animation and stops
for Reduce Motion/background/focus loss. Palette changes use a finite 600ms
smoothstep still crossfade; Reduce Motion changes immediately.

Compatibility equivalent: instead of re-toning the unrelated pearl artwork,
the bundled fallback is the exact shared-scene still, for all five palette
colors and both modes at 78px. It needs no client GL and preserves glass and
liquid even if native GL/snapshots are unavailable. Both bundles are identical;
`scripts/generate-queue-stills.mjs` regenerates them locally. This also avoids
approximating the luminance/hue rule with a different artwork. The web body
uses existing `--bg` backing so header elevation cannot brighten transmitted
pixels. No sizes, behavior or hit targets changed.

FRESH focused: shared cache 12/12; mobile Queue/header/adapter 40/40;
web Queue 67/67 including QN1 browser regressions; additional web lifecycle
and header checks 20/20. Full suites/gates and final capture audit follow.

## First attempts and capture corrections

- `step1-typecheck.log`: FRESH FAIL, 7/8 tasks, 0 cached. The native render
  target annotation inferred `Texture | Texture[]`; explicitly retaining the
  single-texture generic fixes it without weakening TypeScript.
- `gl-first.log`: FRESH FAIL, 2 passed / 11 failed. Real web header elevation
  brightened transmitted pixels; the body now uses the existing page backing.
  The no-GL fixture also attempted to draw its Today reference without GL;
  that fixture now omits the unavailable reference in the failure-only case.
- `gl-second.log`: FRESH FAIL, 10 passed / 3 failed. Desktop locator screenshots
  rounded a fractional 26px vertical bound to 27px (78×81 physical pixels).
  The harness now crops precisely 78×78 pixels for every body from the page
  capture. No threshold, mask or luminance assertion was relaxed.
- `gl-third.log`: FRESH PASS, 13/13, before strengthening the native proxy.
  Later source audit added an opaque existing-paper native backing (avoiding
  platform PNG alpha differences) and Expo's default upright snapshot option.
  The final proxy executes the production native adapter with only the Expo
  context/filesystem/snapshot boundary replaced by Chromium readback. It waits
  for the returned snapshot URI to be displayed, rather than capturing fallback.
- Initial focused command forwarding dropped `--maxWorkers=1` at the PowerShell
  boundary (npm warned); the later runner uses explicit argument arrays. Final
  suites and gates are serial, with repo-local TEMP/TMP/TMPDIR/caches,
  EXPO_NO_DOTENV/EXPO_OFFLINE, telemetry disabled and outbound traffic blocked.

- Resumed `gl-resumed.log`: FRESH FAIL, 6 passed / 10 failed (including one
  30s timeout). The stronger native proxy exposed a real output-transform bug:
  Three r166 skips tone mapping on ordinary render targets; an sRGB framebuffer
  also encodes after blending, unlike the screen shader. Native snapshot means
  were up to 6.25 times Today. The snapshot-only material now executes Three's
  exact ACES/sRGB functions before premultiplication, then composites onto the
  existing paper in display space. The RGBA8 target performs no second encoding.
  The original body shader, exposure and live renderers remain unchanged.
  The harness closes each page in `finally`, including failed cases.
- `gl-output-correction.log`: FRESH PASS, 13/13 with that correction and the
  production native adapter. No metric threshold or mask was relaxed.
- The interrupted QL1 `web-full.log` contains only suite startup, with no final
  result; it is INTERRUPTED, not a pass. QL1b runs all affected suites and gates
  again under separate `ql1b-*.log` paths. Earlier passing suites remain recorded.
- `ql1b-web-full.log`: FRESH FAIL, 706 passed / 1 failed in 88 files. The
  existing `course-options.browser.test.ts` 320px case exceeded Vitest's default
  5000ms test budget after the long GL suite. `ql1b-course-options-isolated.log`
  then passed all 3 cases with the original settings and unchanged assertions.
  A full unchanged serial web rerun follows; no product/test timeout or geometry
  assertion was modified to accommodate this first-attempt flake.
- `ql1b-web-full-retry.log`: INTERRUPTED after confirmed failures, not a pass.
  It reported 5 failed cases: ambient generation capture (1/14) and generation
  screen captures (4/13); no final aggregate exists. A local Windows sample
  measured 100% CPU, 361 MB available memory and 2.3 GB memory compression.
  Only this run's verified Vitest process tree was stopped; unrelated apps were
  preserved. The final full web validation uses 75 non-browser files together
  and all 13 browser files in separate serial invocations, releasing Vitest
  runtimes between fixtures. Inventory and aggregate checks require exactly
  88 files / 707 tests, no skips. Assertions and deadlines stay unchanged.

The native snapshot source was checked locally in installed Expo GL
`GLContext.java` and `EXGLContext.mm`. Physical Expo/driver presentation remains
UNVERIFIED; the stronger Chromium proxy does not change that evidence label.

## STEP 3: real GL captures (QL1b, 2026-10-26)

FRESH `gl-output-correction.log`: **13 passed / 0 failed**, including 12
width/theme/color cases and one no-WebGL/Reduce Motion/hidden rotation case.
Each matrix case compares both web and the native adapter proxy with an
independent Today body crop: **24 paired comparisons**. Bundled fallback
parity/mean/p95/hue assertions also pass for all 12 cases. This uses Chromium
WebGL2/SwiftShader, device scale 3, fixed 78x78 physical-pixel body crops and
unchanged radius .46 metrics. Headers and the empty Queue popover execute the
production components with synthetic local data; QN1 cards/actions are covered
by their separate regression tests. No authenticated or remote app was opened.

| Width | Surface | Maximum mean error | Maximum p95 error | Maximum hue gap |
|---|---|---|---|---|
| 390 | web | 0.050% | 0.545% | 0.414 degrees |
| 390 | native adapter web proxy | 0.050% | 0.545% | 0.678 degrees |
| 1280 | web | 7.018% | 5.667% | 0.924 degrees |
| 1280 | native adapter web proxy | 0.050% | 0.545% | 0.678 degrees |

All values satisfy mean/p95 within 10% and hue within 6 degrees. The body is
26px on both platforms; miniatures have no ambient spill. Desktop screenshot
resampling contributes the larger, still passing web differences.

FRESH source-isolation check: no diff from `06e64db4` in shared orb body,
scene, ambient and clock-glass renderers, web day-clock/knowledge-core, or
mobile Today/generation-core paths. Only Queue consumes the new still helper.

Each strip below is **old miniature / new miniature / Today reference** at
390px. Native images are explicitly a Chromium proxy of the production Expo
snapshot adapter, not physical/native captures. Both themes and all three
required colors are shown. Corresponding 1280px strips, Queue captures and
per-case JSON are under `tmp/overnight/QL1/visual/` with the same naming scheme.

| Mode/color | Web | Native adapter web proxy |
|---|---|---|
| light pearl | ![Web light pearl](../../../tmp/overnight/QL1/visual/390-light-pearl-web-comparison.png) | ![Native proxy light pearl](../../../tmp/overnight/QL1/visual/390-light-pearl-mobile-proxy-comparison.png) |
| light gold | ![Web light gold](../../../tmp/overnight/QL1/visual/390-light-gold-web-comparison.png) | ![Native proxy light gold](../../../tmp/overnight/QL1/visual/390-light-gold-mobile-proxy-comparison.png) |
| light green | ![Web light green](../../../tmp/overnight/QL1/visual/390-light-green-web-comparison.png) | ![Native proxy light green](../../../tmp/overnight/QL1/visual/390-light-green-mobile-proxy-comparison.png) |
| dark pearl | ![Web dark pearl](../../../tmp/overnight/QL1/visual/390-dark-pearl-web-comparison.png) | ![Native proxy dark pearl](../../../tmp/overnight/QL1/visual/390-dark-pearl-mobile-proxy-comparison.png) |
| dark gold | ![Web dark gold](../../../tmp/overnight/QL1/visual/390-dark-gold-web-comparison.png) | ![Native proxy dark gold](../../../tmp/overnight/QL1/visual/390-dark-gold-mobile-proxy-comparison.png) |
| dark green | ![Web dark green](../../../tmp/overnight/QL1/visual/390-dark-green-web-comparison.png) | ![Native proxy dark green](../../../tmp/overnight/QL1/visual/390-dark-green-mobile-proxy-comparison.png) |

## Frozen acceptance matrix

| Requirement | Owning layer | Required proof | Result |
|---|---|---|---|
| Shared body/stage/output and fixed still frame | shared renderer | GL comparison against independent Today crop | FRESH PASS, 24 pairs |
| Color × theme × physical-size cache, invalidation/retry | shared/platform adapters | focused tests | FRESH PASS, shared/mobile full and web unit suites |
| Web/mobile Queue only; layout and QN1 intact | header components | focused/full client suites, Chromium and mobile proxy | Queue checks PASS; full web gate FAILED |
| Mean/p95 within 10%, hue within 6 degrees | captures | 390/1280 light/dark pearl/gold/green | FRESH PASS, 24 pairs |
| Quiet fallback, no extra spill, no hidden work, Reduce Motion | adapters/components | lifecycle/fallback/rotation checks | FRESH PASS, GL proof and client tests |
| Fresh serial gates and scoped commits | repository | exact counts/logs | FAILED web gate; remaining gates NOT RUN; code uncommitted |

## Owner steps remaining

- Restore sufficient local test resources and resume the pending web/gates/code
  commits before considering this item complete.
- Rollout NOT RUN: after local acceptance passes, release via the next separately
  authorized FULLSEND.
- Device checks NOT RUN: website and Realme visual comparison with Today;
  native GL presentation and physical performance.
- Live served revision/database/Scheduler/provider state:
  **UNVERIFIED (owner to confirm)**. No live call is needed for this code slice.
- Other browsers, assistive technology and physical GPU performance/power:
  **UNVERIFIED (owner to confirm)**.
