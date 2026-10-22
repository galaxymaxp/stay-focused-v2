# OX1 orb compositing integrity

Status: **STOPPED at STEP 0 (2026-10-22)**. The owner-reported Realme square
was not reproduced in local software rendering, and inspection did not establish
a safe source-level cause. OX1 explicitly requires a stop in this situation.
No product code, dependency, pixel format, blend math or clipping was changed.
The native defect remains unresolved; earlier OL1/OT1/OG1 PASS reports do not
override the owner's physical evidence. OX2 must not begin.

## Scope and baseline

Read `tmp/overnight/prompts/OX1.md` in full, including its overriding unattended
rules. Scope was local STEP 0 investigation, then implementation/verification
only if a cause could be established. On the required stop, only safe evidence,
planning reconciliation and a scoped documentation commit proceed. Rollout and
Device checks were skipped entirely. No question was sent to the absent owner.

- Repository: `C:\Users\Fely Max Dilinila\Documents\Projects\b25-3-3-work`.
- Branch: `overnight/2026-10-15_feedback`, matching the prompt. Initial HEAD:
  `70c415d13ef75c2e334fc6d544edfdc35d34e5ff` (LP2 documentation).
- Local tracking ref `github/main`: `28174c76cf7b2696d24e33656f428ee6bf4b92dc`;
  initial ahead 0 / behind 17. No fetch, switch, merge or push.
- Initial dirty paths: only untracked `UI/`, `apps/mobile/.gitignore`,
  `supabase/.temp/`. Those and ignored `tmp/` remain owner-owned and unstaged.
- Root AGENTS.md, AUTOPILOT.md, relevant current planning entries, newest
  handoff, OT1/OG1/OL1/OP2 reports, ADR-048/049/052 and actual renderers were
  inspected. `rg --files -g AGENTS.md` found only the root policy.
- Local `FS5.status`/progress and the existing Git object
  `28174c7:docs/ai/acceptance/fullsend-20261021-2245.md` explain that FS5 used
  a separate release clone and deliberately left this source checkout unchanged.
  The older Expo patch versions/native configuration here are therefore a
  documented baseline difference, not evidence of a branch mismatch. An initial
  commentary treated it as a mismatch; the release report resolved that before
  any branch/code change. FS5 was not rerun. Live release state was not checked.

## STEP 0 findings

Both DayOrb implementations clear transparent black and share the ambient and
clock compositors. The body shaders manually produce premultiplied color and
use premultiplied blending; the ambient shader also weights RGB by coverage.
The clock fullscreen base writes the sampled alpha and its radial scrim, rather
than an unconditional alpha-one rectangle. Its target/composite and the source
capture were exercised through the actual components, not replaced by fake
renderers in the browser matrix. No outer opaque rectangle was observed there.

Native DayOrb retains separate Animated poster/live opacity layers, its 0.6
render scale, 80ms idle cadence and endFrameEXP readiness ordering. OrbPoster
uses SVG circles and a feathered spill. Web retains DeferredDayOrb, OrbLoadPoster,
the complete-frame gate and production `.day-orb`/poster/live/static CSS.
The explicit clock/standalone ambient profiles and padded standalone canvas
remain intact. No blanket circle mask or startup-only cosmetic fix was applied.

Installed Expo evidence:

- `node_modules/expo-gl/android/src/main/java/expo/modules/gl/GLView.kt` uses
  TextureView and sets `isOpaque = false`; surface destruction permits a later
  context-create callback.
- `GLContext.java` requests an eight-bit EGL alpha channel.
- `common/EXWebGLMethods.cpp` reports `alpha: true` and
  `premultipliedAlpha: false`; its `isContextLost` implementation returns false.
- The actual browser contexts in this run report `premultipliedAlpha: true`.
  That difference and the native Animated/TextureView path remain hypotheses,
  not a demonstrated compositing defect or authorization to alter dependencies.
  Transparent corner output alone cannot validate Android presentation.

### Local baseline matrix and inspected images

All helpers and generated evidence remain ignored under `tmp/overnight/`.
Repository-local TEMP/TMP was `OX1-temp`; Node used the existing
`LP2-network-guard.cjs`. Browser requests were restricted to the loopback origin.
Only synthetic state and committed local assets were used. No protected route,
account, private academic data or external service was accessed.

Web: `OX1-baseline.cjs`, `OX1-baseline.log`, `OX1-before/results.json` and
per-sequence `sequence.json`. Actual DayRingClock and GenerationOrb, their lazy
DayOrb module, actual shaders, atlas and application CSS ran in Chromium with
SwiftShader. The clock was fixed at October 22, 08:45. Violet (the purple key),
gold and pearl each cover both themes, Today/Generation starting surfaces and
cold load/hard reload/warm component route switches: **36 sequences**. Violet
and pearl use 390px width; gold uses 1440px, all at 900px height. CDP disabled
cache and used Slow 4G (150ms, 200000/93750 B/s), 4x CPU and an added 1200ms
local atlas delay. Each sequence includes poster, live, blur/focus resume and
background-only PNGs plus screencast JPEGs. Component switching approximates
route lifecycle; it does not establish real Next Router/authenticated behavior.

FRESH observations: **805 screencast images, 13,518 rAF samples, 0 visible
partial-clock samples, 0 page errors, 0 external browser requests**. Readback
occurs only in the ignored QA wrapper, immediately after real final renders.
Maximum two-pixel border alpha, corner alpha and corner RGB are all **0**.
Corners use normalized radius > .53. Comparison with the same page while only
the decorative host is hidden covers **344,364 pixels** outside radius .56:
maximum RGB difference **0**. The sampled annulus (.37-.44 buffer radius)
contains at least **13,170 nonzero-alpha pixels** per sequence, preserving aura
outside the sphere. These are bounded samples, not proof about every device,
every frame or all state transitions.

Mobile component approximation: `OX1-native-web.cjs`, `OX1-native-web.log`,
`OX1-native-web-exit.json` (Node exit 0) and `OX1-native-web/results.json`.
Actual mobile DayOrb, OrbPoster, body/aura and shared clock renderer run through
React Native Web. The QA host replaces Expo GLView with a real browser WebGL2
canvas, endFrameEXP with a no-op and expo-asset with the local atlas URI. SVG
components are translated to matching browser SVG elements. Only the bundled
atlas require is rewritten in the QA bundle; repository source is unchanged.
This tests **neither Expo's actual native surface nor native SVG rasterization**.
Twelve cases cover three palettes, two themes and clock/standalone, at size 320
with reduced motion. Each has poster/live/resumed captures (36 PNGs). A live
prop false/true cycle approximates focus lifecycle, not Android AppState or
surface recreation. Dark gray/paper backgrounds deliberately expose rectangular
coverage. All cases completed, with **0 border alpha, 0 page errors, 0 external
requests**; all six clock scenes report an atlas composite. Standalone scenes
correctly have no atlas. Backings are 192x192 / 230x230 at the retained scale.

Inspected five contact sheets: `OX1-web-violet-contact.png`,
`OX1-web-gold-contact.png`, `OX1-web-pearl-contact.png`,
`OX1-native-clock-contact.png`, `OX1-native-standalone-contact.png`. Also inspected
full violet-dark Today poster/live and native clock poster/live PNGs. No square
was visible in those local images. `OX1-summary.json` records aggregate pixels
and frames. There is no after matrix because no repair was justified.

| Requirement | Result at stop |
| --- | --- |
| Reproduce owner square locally and establish exact cause | NOT ESTABLISHED; owner symptom remains unresolved |
| Web palette/theme/poster/live/load/resume baseline | FRESH observations above; no local square |
| Mobile component/poster/shared-renderer approximation | FRESH 12 cases; browser host, no native-surface proof |
| Physical Android, actual GL surface restoration/performance | UNVERIFIED (owner to confirm); device work NOT RUN |
| Smallest confirmed cross-platform fix | NOT RUN; STEP 0 stop prevents speculative changes |
| STEP 2 after frames, new discovered-bug regression, full acceptance | NOT RUN; no confirmed cause/implementation |
| Rollout | NOT RUN; skipped entirely |

## Diagnostic checks and gate ledger

Focused existing suites ran serially, with a loopback guard and repository-local
TEMP/TMP. `OX1-focused.cjs`/JSON and the three `OX1-focused-*.log` files retain
exact commands/results. These pass on the unchanged baseline; they do not
demonstrate removal of the physical square.

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run test --workspace @stay-focused/shared -- src/clock-glass-renderer.test.ts src/orb-load.test.ts src/orb-ambient.test.ts --maxWorkers=1` | 12/12 tests, 3/3 files, exit 0 | FRESH |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/DayOrb.test.ts --maxWorkers=1` | 26/26 tests, 1/1 file, exit 0 | FRESH |
| `npm run test --workspace @stay-focused/web -- src/features/day-clock/DayOrb.test.ts src/features/day-clock/deferred-day-orb.test.ts src/features/day-clock/generation-orb.test.ts --maxWorkers=1` | 21/21 tests, 3/3 files, exit 0 | FRESH |
| `npm run typecheck -- --force` | STEP 0 stop; no implementation | NOT RUN |
| `npm run lint -- --force` | STEP 0 stop; no implementation | NOT RUN |
| `npm run build -- --force --concurrency=1` | STEP 0 stop; no implementation | NOT RUN |
| `npm run test --workspace @stay-focused/shared` | Full suite not invoked | NOT RUN |
| `npm run test --workspace @stay-focused/mobile` | Full suite not invoked | NOT RUN |
| `npm run test --workspace @stay-focused/web` | Full suite not invoked | NOT RUN |
| `npm run build --workspace @stay-focused/api` | STEP 0 stop; no implementation | NOT RUN |
| `npm run build --workspace @stay-focused/web` | STEP 0 stop; no implementation | NOT RUN |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | STEP 0 stop; no implementation | NOT RUN |
| Relevant API tests | No server/auth/schema/request changes | NOT APPLICABLE |
| `git diff --check` and `git diff --cached --check` | Exit 0 for final documentation staging | FRESH |

Total focused result: **59 passed / 0 failed / 0 skipped across 7 files**.
There are no reused CACHED gate results. Full gates have no run counts and
cannot be described as green. Existing Vite config-loader compatibility warnings
were emitted by mobile/web diagnostics; no warning suppression or config edit.

Retained first attempts: the initial helper used invalid palette key `purple`,
which resolves to pearl. It was deliberately interrupted (wrapper exit 1);
its four completed cases and captures are in `OX1-before-invalid-palette-first/`
and `OX1-baseline-invalid-palette-first.log`, excluded from final counts. The
corrected run uses `violet` and exits 0. First native helper completed 12 cases
but PowerShell reported exit 1 after bundler stderr warnings; the log is retained
as `OX1-native-web-wrapper-first.log`. An explicit `$LASTEXITCODE` wrapper and
Node exit manifest establish exit 0 on the repeated capture run; warnings remain
in the log. The first Git report lookup used nonexistent `fs5-release.md` and
failed; tree inspection located the actual FULLSEND report. No test assertion
was weakened and no production change was attempted.

## Documentation checkpoint and owner steps remaining

One scoped local commit: `docs(orb): record OX1 source-attribution stop`.
Its exact hash is in Git, `tmp/overnight/OX1.progress` and `OX1.status`.
Owned files: this report, `docs/current-state.md`, `docs/roadmap.md`,
`docs/ai/current_sprint.md`, and the appended `docs/ai/handoff.md` footer.
No runtime rollback is needed: this checkpoint changes documentation only.
The material remaining risk is the still-unresolved native visual regression.

**Exact question for the owner (recorded only; no unattended question sent):**
On the installed FS5 Realme build, does the violet square persist for at least
10 seconds after a cold Today open, and does it also occur in standalone
Generation or change after Today -> Generate -> Today and background ->
foreground, in each theme? Can matching on-screen photo/recording and ordinary
screen capture from the same state be supplied, with installed version/runtime,
so a follow-up can isolate native presentation versus framebuffer/poster/clock
composition? If those observations still cannot isolate the layer, owner-led
native framebuffer/compositor diagnostics are needed before choosing a fix.

- **Device checks: NOT RUN, skipped entirely.** The above is an owner-only
  focused test request, not a completed check or physical acceptance claim.
- **Rollout: NOT RUN, skipped entirely.** Review the checkpoint; do not publish
  an unimplemented fix. No push, deploy, OTA/EAS, install, remote SQL/migration,
  Scheduler operation, email or Supabase/Vercel/Google Cloud/Canvas/Resend call.
- Native rendering, physical capture/performance, actual authenticated web
  routes and deployed/live/database/Scheduler state remain **UNVERIFIED (owner
  to confirm)**. FS5 history is repository evidence, not fresh live verification.
- The Vercel CLI is unavailable in this session. Strongly recommend
  `npm i -g vercel` for separately authorized future env/deploy/log tooling;
  installation and all Vercel commands were NOT RUN here.
- Owner paths, environment files and existing Owner Pause are preserved.
  OX2 and any release/FULLSEND remain unstarted.
