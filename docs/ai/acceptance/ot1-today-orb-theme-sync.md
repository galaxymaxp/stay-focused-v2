# OT1 - Today orb theme sync

Status: PASS for the finite unattended local code scope only (2026-10-21).
Owner roadmap (read in full): C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused\overnight\roadmaps\2026-10-21-orb-theme-glow-scroll-tabs-legal.md.
Only OT1 is authorized here. No OG1/OL1/RS1/TB1/LP2, release or device work.
The unattended OT1 header governs: no service calls, environment-file edits,
remote SQL/migrations, Scheduler, email, push, deployment or questions.

## Baseline before edits

Branch: overnight/2026-10-15_feedback. HEAD: 32206c16 (GV1 closure, following
OP2/OA1). No upstream fetch was performed. Existing Git author is retained for
configuration; commits explicitly use galaxymaxp <omgraythekid@gmail.com>.

Git log --oneline -8:

```
32206c16 docs(generation): close GV1 local acceptance and gates
8b37b5ae fix(generation): fit active pages to measured viewports
1d3c5cfc docs(orb): close OP2 local acceptance and gates
9e17fd4d feat(orb): refine glass time, cumulative waves and ambient backdrop
202f8c3f docs(orb): close OA1 local implementation and gates
50cf0103 feat(orb): integrate ambient spill across web and mobile
3b1abbbb feat(shared): add source-coupled orb ambient renderer
8eab3174 docs: record WX1 export parity and verification
```

Git status --short:

```
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

These unrelated paths remain untouched and will not be staged. tmp/ is ignored.

## STEP 0 - confirmed source cause, before product edits

The missing-theme hypothesis is REFUTED. Today and Generation already use the
same DayOrb and resolved mode. The alternate GL1/OP2 scrim cause is CONFIRMED:
packages/shared/src/clock-glass-renderer.ts:106 at baseline applies uScrim = .78 in LIGHT
mode (.35 dark), and :20-27 shades a broad center with black, increasing alpha
to cover the white page. Only Today requests clock composition. A local isolated
actual-component capture at 13:40 reproduces the exact near-black Today center
versus pearl Generation on a light page, with the same pearl preference/theme.
Evidence: tmp/overnight/OT1-before/* (8 actual WebGL captures, Today/Generation,
light/dark, pearl/gold; loopback only), OT1-visual.cjs. Captures were inspected.
This is a safe alternate cause explicitly allowed by the prompt, not a product
choice or a reason to stop. Fix the clock's tint/edge, not a forced dark orb.

### Complete source inventory at baseline

| Path / callers | Palette and resolved theme path |
| --- | --- |
| Mobile TodayScreen -> redesign/DayRingClock.tsx:154,382 -> redesign/DayOrb.tsx | Theme provider resolves mode; Today passes mode, time, stable shared interaction and glass readout. DayOrb runtime ref :93-105 updates mode live; :225-242 passes sampled synced idleColor and dayOrbTones deep/light plus mode to body. |
| Mobile GenerationScreen/GenerationLayout (pre-admission, active/detail, Queue-opened jobs) -> redesign/GenerationCore.tsx:35-59 -> same DayOrb | Same useTheme mode and useOrbInteraction preference. Same minute model and body; state changes motion/energy, clock omitted. Not a separate light renderer. |
| Mobile generation-core/GenerationCoreLab.tsx:94 -> generation-core/KnowledgeCore.tsx:42,176 | Retained lab scene gets mode from caller; idle uses sampled palette, job states use existing theme tones; runtime changes wake scene without recreation. |
| Mobile generation-core/orbBody.ts:129-185 | Duplicated theme TONES; idleColor overrides base/glow; DayOrb day tones override deep. Theme independently drives environment floor/sky. Both bodies have identical shaders. |
| Web Today -> day-clock/DayRingClock.tsx:441 -> DeferredDayOrb.tsx -> DayOrb.tsx | Stable shared interaction, time, clock; document data-theme MutationObserver :99-130 updates runtime and wakes existing scene. Same sampled idleColor/body input :266-283. |
| Web Generation + Queue detail -> day-clock/GenerationOrb.tsx:11-32 -> same DayOrb | Reads same preference; same clock minute; same document resolved theme; clock omitted. |
| Web retained knowledge-core/KnowledgeCore.tsx:43-104,236 | Own legacy scene; same document theme observer, idle sampled palette, authoritative state behavior. |
| Web knowledge-core/orbBody.ts:129-185 | Same duplicated theme TONES and per-frame overrides as mobile. |
| Both orbAura.ts adapters -> shared/orb-ambient-renderer.ts | No separate palette: source uniforms and captured 64x64 resolved body RGBA drive spill; mode controls restrained strength. No extra animation loop. |
| Web DeferredDayOrb.tsx:40-54 + knowledge-core/OrbStill.tsx:16-18 | CSS static gradients use sampled palette, but deferred still has no theme observation and uses day tones; failure still observes theme but can retain day deep/light. |
| Native DayOrb.tsx:125 + generation-core/KnowledgeCore.tsx:83 | Failure body/spill use the one fixed pearl branding PNG; only spill opacity follows mode, not palette. |
| Mobile design/QueueButton.tsx:13-22,175-196 + web components/queue-button.tsx:109 / globals.css:2803-2816 | Miniature and spill share rotating theme-selected raster, but ignore synced palette. Queue-opened full jobs already use GenerationCore/GenerationOrb. |
| Mobile redesign/GenerationVisual.tsx | No-ExpoGL compatibility page illustration, not an orb renderer; stays the existing supported compatibility illustration. |

The shared ORB_IDLE_PALETTE (orb-interaction.ts:49-55) defines all five semantic
keys and exact tokens. orbIdleColor supplies existing transition samples; storage,
OR4 reconciliation, gestures, spin and impulse state must remain unchanged.

## Acceptance matrix before edits

| Requirement | Owner layer / proof | Current result |
| --- | --- | --- |
| Same palette x theme appearance | Shared pure resolver + both body/fallback consumers; all five keys x themes incl pearl | PENDING |
| Today light matches Generation | Clock tint/edge, local actual WebGL light/dark pearl/gold screenshots | Baseline FAIL reproduced |
| Live theme changes retain scene/gesture/momentum | Ref updates/observer, focused component + browser tests | PENDING |
| Readable glass digits, labels and accessible real time | Existing GPU contrast thresholds (3:1 large, 4.5:1 suffix), real text and screenshots | PENDING |
| Static/Queue parity | Shared appearance in still/poster/miniature and source tests | PENDING |
| Required serial gates | Forced root gates, three client/shared suites, separate web/Android builds, both diff checks | PENDING |
| API tests | Client decorative appearance only; no API/schema/auth/request changes | NOT APPLICABLE |
| Rollout / device checks | Owner-only, skipped entirely | NOT RUN |
| Deployed revision/live preference/database/Scheduler state | Forbidden service access in this run | UNVERIFIED (owner to confirm) |

Visual tests use actual components/shaders, synthetic inputs and loopback-only
traffic. Chromium software WebGL does not establish native/device appearance.

## Resumed implementation and focused evidence

The resumed checkout was still at baseline `32206c16`, with STEP 0 recorded and
uncommitted OT1 edits. No committed work was repeated. Branch and unrelated
untracked paths matched the checkpoint. Tracking refs report behind github/main
by nine commits; this is local-ref evidence only (no fetch or branch switch).

- `packages/shared/src/orb-appearance.ts` resolves the existing palette sample
  and theme tones. Both platform body adapters use it for base, deep, glow and
  environment uniforms. DayOrb keeps day-driven light position/strength, while
  all body colors follow the same palette/theme rule. Stored OR4 keys and color
  transitions remain unchanged.
- Web deferred/failure stills and Queue use the shared poster gradient; native
  DayOrb/retained KnowledgeCore fallbacks and Queue use the SVG OrbPoster with
  those same resolved tones. The spill shares the poster source and rotating
  parent. Static posters schedule no animation and observe preference changes.
  No-ExpoGL GenerationVisual remains the existing compatibility illustration.
- The clock compositor removes the light-mode black scrim and tints the
  existing refracted glass with an existing dark ink token in light mode.
  Dark-mode composition retains its scrim. Web/native real time text and drag
  labels use theme ink in light mode, preserving accessible hidden time text.
- Scene refs and the existing theme observers update uniforms on the current
  scene. No theme key, remount, storage change or gesture/momentum reset was
  added. The React review covered effect cleanup, stable interaction handles,
  decorative semantics and native TypeScript props.

Focused FRESH PASS before final gates: shared 6/6 (1 file), mobile 39/39 (4
files), web 48/48 (5 files, including 14 existing real-WebGL clock cases).
All five palette entries are checked in both themes at helper and actual body
uniform level on both platforms. Native consumer tests compare Today and idle
Generation on the same body through both themes for each palette entry. Native
and web theme-change tests preserve scene identity and nonzero momentum.

Eight actual web component captures at 13:40, width 390: Today + Generation x
light/dark x pearl/gold in `tmp/overnight/OT1-after/`. All eight were inspected
together in `OT1-contact.png`, then compared to the original light Today capture
in `OT1-before/`. Today now shows the same light pearl/gold body as Generation;
dark mode remains dark. Eight live browser theme toggles preserve canvas
identity. The harness allows loopback traffic only, renders actual components,
and uses synthetic date/preference inputs with Chromium software WebGL.

Existing GPU stroke checks pass without lowering thresholds: light mode solid
stroke statistics are 10.44-12.96:1; dark mode 5.51-11.84:1 (3:1 large digits,
4.5:1 suffix required). Existing drag label, hidden text, atlas failure, context
loss, reduced motion and narrow long-time checks pass. These are local GPU
measurements, not physical-device claims.

Failed attempts retained: the first resumed forced typecheck stopped at 6/8
successful tasks, 0 cached, with two native errors: unsupported Svg `overflow`
prop and nonexistent `ThemeColors.text`. Fixed with SVG style overflow and the
existing `textPrimary` token; strict types were preserved. The manual visual
launch first failed before executing because Node's preload path contained
Windows backslashes; forward-slash quoting fixed it. Python was unavailable for
the contact sheet; the installed Sharp tool produced it instead. No product
assertion was weakened. The pre-interruption web focused log ended without a
result; resumed focused tests completed successfully.

The first full mobile suite passed 1604 tests across 168 files, but the retained
KnowledgeCore suite failed to load (`Unexpected token typeof`): its new poster
dependency reached raw React Native SVG code in the Node runner. The fixture
now uses the same inert native SVG boundary mock as the other native component
tests. Every existing assertion remains. Forced typecheck/lint and the complete
mobile suite are rerun after this test-only fix; passing production build and
shared-suite evidence remain valid because their source did not change.

Final serial gates and owner-only acceptance are recorded below at closure.

## Final serial gates and acceptance

Implementation: `45526e95 fix(orb): unify palette appearance and light clock tint`.
Final source hashes: `tmp/overnight/OT1-source-sha256.json` (25 owned source
paths, checked before commit). Repository-local TEMP/TMP, the existing loopback
Node guard, Expo offline, disabled telemetry and bounded Vitest workers were
used. Commands ran serially; all final invocations exited 0. Root Turbo cache
was bypassed; ordinary internal compiler/bundler caches remain permitted.
After the native SVG test-fixture repair, forced typecheck/lint and the complete
mobile suite were rerun before advancing. The passing root build and shared
suite preceded that test-only repair; no production or shared source changed,
so those passing checks were retained instead of repeated.

| Exact command | Result | Evidence | Log under tmp/overnight/ |
| --- | --- | --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks; 0 cached | FRESH | `OT1-gate-typecheck.log` |
| `npm run lint -- --force` | PASS 8/8 tasks; 0 cached; 6 existing warnings | FRESH | `OT1-gate-lint.log` |
| `npm run build -- --force --concurrency=1` | PASS 8/8 tasks; 0 cached; API 37/37, web 23/23 pages; Expo export | FRESH | `OT1-gate-build.log` |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | PASS 682/682 tests, 70 files (341 source cases + compiled duplicates) | FRESH | `OT1-gate-shared.log` |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | PASS 1611/1611 tests, 169 files | FRESH | `OT1-gate-mobile.log` |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | PASS 546/546 tests, 72 files (includes real WebGL browser cases) | FRESH | `OT1-gate-web.log` |
| `npm run build --workspace @stay-focused/web` | PASS 23/23 pages | FRESH | `OT1-gate-web-build.log` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS Android HBC export | FRESH | `OT1-gate-android-build.log` |
| `git diff --check` | PASS exit 0 | FRESH | `OT1-gate-diff.log` |
| `git diff --cached --check` | PASS exit 0 before each scoped commit | FRESH | Local staging checks |
| Relevant API tests | Client decoration only; no API/request/auth/schema change | NOT APPLICABLE | No server suite required |

The separate web and Android commands were actually invoked after the suites;
they are not substituted by the root build. Next-generated declaration-only
changes were inspected and restored to baseline. No generated build artifact,
validation output, private fixture, credential or tmp path is committed.

Final documentation resume: HEAD was already `45526e95`; only the five OT1
documentation paths remained unfinished. All 25 recorded source SHA-256 hashes
match the committed working tree. The nine saved gate records each report exit
0, and their suite/build logs were rechecked. These retain their original FRESH
run labels; implementation gates were NOT RUN again during documentation
closure because no source changed. The eight-image contact sheet and capture
metadata were inspected again. Both diff checks were run FRESH for the final
documentation commit. Local tracking refs were ahead 1 / behind 9 before that
commit; no fetch, branch switch or committed implementation work was repeated.

| Final requirement | Verdict / evidence |
| --- | --- |
| One palette x theme appearance, including pearl default | PASS; shared resolver and both actual body uniform tests cover all five palette entries in both themes |
| Today light body matches Generation | PASS locally; all eight web captures inspected, original dark light-mode center reproduced and resolved |
| Runtime changes preserve scene/gesture/momentum | PASS local component tests; eight live browser theme toggles retain canvas identity |
| Glass and fallback text readability/accessibility | PASS local GPU contrast, drag labels, atlas/context failure, long-time and reduced-motion checks; existing accessible time remains |
| Queue and static fallback parity | PASS local source/component/helper coverage; all consume the shared appearance, no static animation loop |
| All required code gates and local commits | PASS; exact serial results above; scoped code and documentation commits recorded in Git and OT1.status |
| Native/emulator/physical visual acceptance | UNVERIFIED (owner to confirm); native unit tests are not native GPU/device proof; Device checks skipped entirely |
| Live deployed/preference/database/Scheduler state | UNVERIFIED (owner to confirm); forbidden service access in this run |
| Rollout | NOT RUN; owner-only, skipped entirely |

## Owner steps remaining

- Review the local commits and ignored evidence, then separately initiate any
  rollout. Rollout was NOT RUN; nothing was pushed, deployed or published.
- Device checks were NOT RUN, skipped entirely. Confirm on the Realme that
  Today light mode matches Generation for the same palette; check theme toggles,
  Queue/fallback colors, readable glass/plain time, motion and momentum.
- Confirm deployed revisions and live preference/database/Scheduler state.
  These and native rendering/performance are UNVERIFIED (owner to confirm).
- OG1 and all later roadmap items are separate scopes and were not started.
  UI/, apps/mobile/.gitignore, supabase/.temp/ and Owner Pause are preserved.
