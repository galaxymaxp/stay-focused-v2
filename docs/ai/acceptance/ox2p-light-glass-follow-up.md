# OX2P — Website and mobile light glass follow-up

Status: **PASS for the finite unattended local code scope** (2026-10-22).

## Authorization and baseline

The complete `tmp/overnight/prompts/OX2P.md` was read. Its UNATTENDED header
controls: local code, tests, docs and commits only. No questions, service calls,
environment-file edits, migration application, Scheduler, email, device checks,
installation, rollout, push, deployment, OTA/EAS or FULLSEND. No later OX3, OX4,
QI1 or LC1 implementation is included.

Branch is exactly `overnight/2026-10-15_feedback`; source HEAD is exactly
`39ff73620e91714f077a664aafaf888dc94b527c`. Local tracking refs at startup were
2 ahead / 17 behind `github/main`, without fetch or branch switching. Owner
paths `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/`
are preserved. Commits explicitly use galaxymaxp <omgraythekid@gmail.com>.
Root AGENTS/AUTOPILOT, current planning, newest handoff, OX1-device/OX1 prior,
OT1/OL1/OG1/OP2 acceptance and relevant ADR-048/049/052 were inspected. No nested
AGENTS was found in apps/packages.

The 39ff source diff and [physical report](ox1-realme-physical-debug.md) agree:
Android's SVG backing bitmap clipped the oversized poster spill. The repaired
viewport contains every circle, with a one-unit transparent guard, while the
body and caller layout retain their original size. That separate physical
follow-up resolves the former OX1 cause blocker. Historical `OX1.status` stays
STOPPED; the old OX2 remains held and is neither run nor modified. Physical
proof at 39ff covers the isolated native shell, not the unchanged installed
release. It cannot establish physical acceptance of these new light shaders.

## STEP 0 — current source and reproduction

Actual web DayRingClock → DeferredDayOrb → DayOrb and GenerationOrb →
DeferredDayOrb → DayOrb share the existing real WebGL body, source-coupled aura
and complete-frame gate. Native Today/Generation share redesign/DayOrb and its
padded OrbPoster. Queue uses the same palette-aware static poster/gradient;
retained KnowledgeCore/OrbStill adapters use the same appearance resolver.
The shared clock compositor is already unscrimmed in light mode after OT1.
OL1 already hides live pixels until body/aura/requested atlas are complete,
then uses a 250ms whole-surface transition. No new load-order cause was found.

FRESH baseline: **24 actual-component cold sequences**, 390 and 1440 widths ×
violet/gold/pearl × light/dark × Today/Generation. CDP cache disabled, Slow 4G
150ms latency / 200000 B/s download / 93750 B/s upload, 4× CPU throttle and an
extra 1200ms local atlas delay. **547 recorded frames, 11,566 rAF samples**;
zero partial-clock samples, outer/border alpha or RGB leakage, page-corner
changes, page errors or external requests. Evidence: ignored
`tmp/overnight/OX2P-before/`, results.json and OX2P-before-summary.json.

The owner-visible web square/layer-by-layer symptom and a broad black/brown
live center do **not reproduce** in this current local build. No web square
repair or production acceptance is invented. The remaining locally visible
appearance is a strong dark reflective perimeter with a broad pale interior;
the loading/failed-GL gradient is opaque. Source explains these refinable
properties: one dark-studio optical response in both themes (0.38 liquid density,
0.06 unlit contribution, 0.9 Fresnel coverage) and three opaque poster stops.
This is appearance refinement, not another Android square diagnosis.

## STEP 1 — implementation

`ORB_GLASS_MATERIAL` supplies the same optical profile to both body adapters.
Light uses lower sheet density (0.28), a softly lit liquid contribution (0.38),
restrained inner emission (1.1), reduced Fresnel coverage (0.56), and a neutral
paper studio. Refraction still traces five samples through the inner liquid
volume; the existing sheet field, shaded depth, clear boundary and lower caustic
remain. A small directional specular reflection is separate from liquid motion.
Dark keeps the exact old coefficients/environment; its new specular gain is zero.

Both shaders remain identical. Palette storage, exact five colors and fade
samples, wave/spin/touch behavior, clock ink/composite, ambient capture/falloff,
render rate/scale, focus/AppState ownership, resource disposal and loading gate
are preserved. No extra GL surface, full-screen pass, render target, readback,
loop, backend, API, paid generation or dependency is added. Shared GLSL uniforms
are updated in the existing frame and aura continues to sample that exact body.

Shared poster coverage is 0.18 / 0.38 / 0.28 in light and 1 / 1 / 1 in dark.
Native SVG stops, web loading CSS, retained OrbStill and Queue use matching
coverage while keeping the exact palette/depth colors. Individual stop coverage
retains internal shading; no whole-bitmap opacity or circle clip is used.
The 39ff native viewport/padding/diameter/footprint formulas are unchanged.

Focused regressions cover restoration of original dark optics after a live
light-theme update without reallocating resources, palette/coverage fidelity,
native stop translucency and retained padded containment. A new real WebGL
browser suite renders both actual adapters for every palette, requiring exact
pixel parity, transparent corners, moving liquid, mostly translucent interiors
and lower light rim coverage. This is software Chromium, not a native GPU run.

FRESH fixed-pose experiment compares original 39ff body with current web/native
bodies at 256×256, identical camera, time, palette and light: **all five dark
RGBA arrays have maximum difference 0**, and current web/native arrays match
exactly in both themes. Light changes are intentional. See ignored
OX2P-dark-proof.json. This bounded sample does not prove every dark state.

## STEP 2 — evidence and limits

FRESH final web matrix: **120 normal-motion sequences (2679 frames, 44238 rAF samples) plus 40 Reduced Motion sequences (218 frames, 18723 samples)**. All five stored keys cover both themes,
Today/Generation, 390/1440 widths, cache-disabled Slow 4G and 4x CPU. Normal
cases include cold load, hard reload and component route switching, plus
blur/focus resume. Reduced Motion covers every palette/theme/surface/width.
There are zero sampled visible partial clocks, framebuffer border/corner alpha
or RGB leaks, page-corner differences, page errors or external requests. The
aura remains nonzero outside the body (minimum 11042 pixels in the sampled annulus).
Inspected six paired before/after sheets, four all-palette normal/Reduced Motion web sheets, native
poster/live sheets and the recorded frame strip. Capture timings are bounded
software-browser observations, not physical native performance guarantees. All screenshots/recordings/contact
sheets, source snapshots and logs are local ignored evidence, not committed
validation outputs or private production fixtures. Fixtures contain fictional
local state and run actual components/shaders through Vite, not authenticated
Next Router routes. No production URL is contacted.

Native component parity: FRESH 20 RN Web cases, all five palettes × both themes
× clock/standalone, each with poster/live/resumed captures. Zero page errors,
external requests or framebuffer border alpha; every clock frame includes its
atlas composite. Browser SVG/expo-gl/asset host adapters are explicit. Physical
Realme after these appearance changes is NOT RUN. The original release remains
unchanged; the earlier separate OX1 physical diagnosis is preserved.

Inspected local before/after contact sheets show a lighter reflective boundary,
soft palette-tinted liquid, legible clock and retained external falloff. The
native poster/live matrices show the same five colors without square cutoffs.
The recorded sequence still changes from the static poster to a different live
liquid pose. The early plain-time model synchronization is also visible in the
baseline. These are retained startup characteristics, not a newly attributed
web square. OL1 startup integrity is retained; no additional startup animation
is implemented.
Any owner-requested first-frame easing or genuine deployed loading symptom is
separate OX4 work, requiring real route/connection evidence. OX3 Queue fade and
QI1/LC1 remain separate later prompts.

Contact sheets (ignored local artifacts):

- [390 violet before/after](../../../tmp/overnight/OX2P-web-390-violet-contact.png),
  [gold](../../../tmp/overnight/OX2P-web-390-gold-contact.png),
  [pearl](../../../tmp/overnight/OX2P-web-390-pearl-contact.png).
- [1440 violet before/after](../../../tmp/overnight/OX2P-web-1440-violet-contact.png),
  [gold](../../../tmp/overnight/OX2P-web-1440-gold-contact.png),
  [pearl](../../../tmp/overnight/OX2P-web-1440-pearl-contact.png).
- All five palettes: [390 normal](../../../tmp/overnight/OX2P-web-390-all-contact.png),
  [1440 normal](../../../tmp/overnight/OX2P-web-1440-all-contact.png),
  [390 Reduced Motion](../../../tmp/overnight/OX2P-web-390-reduced-contact.png),
  [1440 Reduced Motion](../../../tmp/overnight/OX2P-web-1440-reduced-contact.png).
- [Recorded before/after frame strip](../../../tmp/overnight/OX2P-web-sequence-contact.png).
- [RN Web live matrix](../../../tmp/overnight/OX2P-native-live-contact.png) and
  [padded SVG poster matrix](../../../tmp/overnight/OX2P-native-poster-contact.png).

## Verification ledger

- FRESH focused shared: 23/23, 4 files; mobile: 48/48, 4 files; web: 46/46,
  5 files (includes actual contrast/refraction/load/fallback browser checks).
- FRESH new adapter/shader WebGL regression: 5/5, 1 file, all five palettes.
- First new shared test: 18 passed / 5 failed. Its incorrect expectation equated
  theme-specific depth colors; corrected to require the exact palette in both
  liquid stops and each theme's own exact depth. Existing assertions retained.
  Log: OX2P-focused-shared-first.log.
- First ignored fixed-pose helper failed before rendering because its virtual
  original TypeScript module lacked a .ts suffix; corrected loader identity,
  then the comparison passed. OX2P-dark-proof-first.log is retained.
- An initial edit-helper invocation failed to parse before execution. The first
  Python helper could not run because python was unavailable; Node applied the
  edits. Neither failure changed product files. No failed gate is hidden.
- Native capture wrapper reported shell exit 1 after bundler stderr warnings,
  while its Node exit manifest is 0 and all 20 cases completed. This wrapper
  anomaly is retained in OX2P-native-web.log / OX2P-native-web-exit.json; no
  native case or underlying Node failure is hidden.
- All final required serial gates are FRESH and exit 0:

| Exact command | FRESH result | Log under tmp/overnight/ |
| --- | --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached; 45.921s | OX2P-gate-typecheck.log |
| `npm run lint -- --force` | PASS 8/8 tasks, 0 cached; six existing warnings, zero new; 87.504s | OX2P-gate-lint.log |
| `npm run build -- --force --concurrency=1` | PASS 8/8 tasks, 0 cached; API 37/37 pages, web 23/23, mobile Android/iOS HBC + web exports; 565.101s | OX2P-gate-build.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | PASS 706/706 tests, 72 files (353 source + compiled copies); 20.145s | OX2P-gate-shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | PASS 1643/1643 tests, 172 files; 67.32s | OX2P-gate-mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | PASS 575/575 tests, 76 files; 293.4s | OX2P-gate-web.log |
| `npm run build --workspace @stay-focused/api` | PASS 37/37 pages; 87.826s | OX2P-gate-api-build.log |
| `npm run build --workspace @stay-focused/web` | PASS 23/23 pages; 46.928s | OX2P-gate-web-build.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS Android HBC export; 60.747s | OX2P-gate-android-build.log |
| `git diff --check` | PASS exit 0; 0.177s | OX2P-gate-diff.log |
| `git diff --cached --check` | PASS exit 0 (repeated for explicit staging); 0.095s | OX2P-gate-cached-diff.log |

Total full suites: **2924 passed, 0 failed, 0 skipped**. Focused cases overlap
these suites and are not added again. Shared includes compiled test copies.
Root gates bypass Turbo cache; normal compiler/bundler internal caches remain.
Repository-local TEMP/TMP, loopback Node guard, offline Expo, disabled telemetry
and bounded test workers were used. Separate API and web builds were
actually invoked after the suites, as was the explicit Android export. No full serial gate invocation failed. Generated Next/Expo declarations were inspected/restored;
final source hashes cover all 11 owned code/test paths. Post-restoration fresh
forced typecheck and staged/unstaged hygiene results are recorded at closure.

- API tests: NOT APPLICABLE — no backend/auth/request/schema behavior changes.

### Focused command ledger

| Exact command | Result |
| --- | --- |
| `npm run test -w @stay-focused/shared -- src/orb-appearance.test.ts src/orb-load.test.ts src/clock-glass-renderer.test.ts src/orb-ambient.test.ts --maxWorkers=1` | FRESH 23/23, exit 0 |
| `npm run test -w @stay-focused/mobile -- src/features/generation-core/OrbPoster.test.ts src/features/generation-core/orbBody.test.ts src/features/generation-core/orbAura.test.ts src/features/redesign/DayOrb.test.ts --maxWorkers=1` | FRESH 48/48, exit 0 |
| `npm run test -w @stay-focused/web -- src/features/knowledge-core/orbBody.test.ts src/features/knowledge-core/orbAura.test.ts src/features/day-clock/DayOrb.test.ts src/features/day-clock/glass-clock.browser.test.ts src/features/day-clock/orb-load.browser.test.ts --maxWorkers=1` | FRESH 46/46, exit 0 |
| `npm run test -w @stay-focused/web -- src/features/knowledge-core/orbBody.browser.test.ts --maxWorkers=1` | FRESH 5/5, exit 0 |

The first focused shared invocation used the exact command above and returned
18 passed / 5 failed before its new-test expectation was corrected. Its retained
first log and final 23/23 result describe both attempts.

### Final restoration checkpoint

FRESH `npm run typecheck -- --force` after restoring both Next declarations:
**8/8 tasks, 0 cached, exit 0**, 43.149s wall; OX2P-final-typecheck.log/JSON.
The final Android HBC is 10,944,818 bytes and contains the actual new uGlass
uniform and liquid-density shader source (both checks true), recorded in
OX2P-android-export-proof.json. Final source/evidence audit passes all 11
owned hashes, expected 24/120/40 web cases, 20 RN Web cases and dark/parity
comparisons. Final unstaged/staged hygiene checks are FRESH PASS before both
scoped commits; no generated declaration remains changed.

## Local closure

Implementation: **1140c737 fix(orb): refine light glass across web and mobile**.
Documentation: **docs(orb): close OX2P local light-glass acceptance**, the scoped
commit containing this report; exact hash is in Git and OX2P.status. No generated
evidence, credentials, private fixture, owner-owned file or tmp/ path is staged.
React review confirms stable hooks/wake refs, decorative semantics, cleanup,
existing lazy boundary and no per-frame React updates. FRESH bright-pearl
per-glyph solid-stroke metric minima are 11.333:1 main / 9.910:1 suffix in
light and 5.506:1 main / 11.387:1 suffix in dark; original thresholds remain
3:1 / 4.5:1. The existing resource probe still observes 3 draws without clock,
5 with clock, and 2/1 versus 4/3 geometries/textures. These are software-browser
observations, not native timing or power measurements. Existing contrast,
refraction, resource, alpha, context/failure, wave and lifecycle suites pass
without lowered thresholds. Rendering still uses the existing body/aura/clock
passes and scale/cadence. Physical GPU cost, FPS, battery and final native
appearance remain unverified. The exact original OX1 status SHA-256 remains
612294e3a36a0b4652a7ab8111a082962a0d171081f18059e7342621a2a9ea8e.

| Acceptance requirement | Final result |
| --- | --- |
| Shared light glass + softly tinted volumetric liquid | PASS locally; identical actual adapters, five-palette GPU regression and inspected images |
| Dark quality retained | PASS bounded fixed-pose comparison; all five 39ff RGBA arrays unchanged; existing dark suites pass |
| Native padded SVG, Queue/clock/standalone fallback | PASS source/containment/component proofs; physical checks NOT RUN |
| Readout contrast, gestures/waves, lifecycle, reduced motion and final fallback | PASS FRESH existing suites; thresholds retained |
| Complete first frame / no square / external falloff | PASS local 160 final web sequences, 20 RN Web cases; production symptom not reproduced |
| Required gates, docs and scoped local commits | PASS for finite local scope; exact hashes in Git/status |
| Production/authenticated routes, physical GPU and live state | UNVERIFIED (owner to confirm) |
| Rollout / Device checks | NOT RUN; skipped entirely |

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Review local evidence/commits; any push,
  deployment, OTA, release or installation remains separately owner-authorized.
- Device checks: NOT RUN, skipped entirely. Confirm Realme Today/Generation/Queue,
  saved palettes and both themes, glass readout, padded poster/no square,
  gestures/waves, Reduce Motion, foreground/navigation/fallback behavior and
  physical GPU/performance/battery. Browser adapter evidence is not a substitute.
- Real authenticated Next Router website flows and genuinely slow connection,
  deployed revisions and live preferences/database/Scheduler state remain
  **UNVERIFIED (owner to confirm)**. The unattended restrictions prohibit
  checking those services and devices here.
- The Vercel CLI is unavailable. Strongly recommend `npm i -g vercel` for future
  separately authorized environment/deploy/log tooling; no install or Vercel
  command was run in OX2P.
