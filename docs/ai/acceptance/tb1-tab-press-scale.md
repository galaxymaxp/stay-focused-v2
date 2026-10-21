# TB1 - bottom tab press feedback (2026-10-21)

Finite unattended scope: STEP 0 through local tests, serial gates, documentation
and scoped local commits. Rollout and Device checks are excluded. No service
calls, remote SQL/migration, Scheduler operations, environment-file edits or push.
Owner roadmap, read in full:
`C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused\overnight\roadmaps\2026-10-21-orb-theme-glow-scroll-tabs-legal.md`.
TB1 is the endpoint; LP2, release and FULLSEND are outside this run.

## Baseline (before edits)

Branch: `overnight/2026-10-15_feedback`; HEAD `390d3b80` (RS1 local closure).
Upstream github/main: ahead 8, behind 9, from local metadata only.
Author: galaxymaxp <omgraythekid@gmail.com>; explicit --author on local commits.
Read AGENTS.md, AUTOPILOT.md, current planning files and newest handoff sections.
ADR-001 workspace gates and ADR-011 local visual/physical distinction apply.

`git log --oneline -8`:
```text
390d3b80 docs(scroll): close RS1 local acceptance and gates
7a5043e2 fix(scroll): stabilize shared search headers
2764ce02 docs(orb): close OL1 local acceptance and gates
e54f11d0 fix(orb): reveal only complete orb frames
4de209d9 docs(orb): close OG1 local acceptance and gates
0e06266f fix(orb): soften standalone generation glow
03355b65 docs(orb): close OT1 local acceptance and gates
45526e95 fix(orb): unify palette appearance and light clock tint
```

`git status --short`:
```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```
These unrelated owner paths and ignored tmp/ stay excluded from staging.

## STEP 0 - confirmed cause before edits

- `apps/mobile/app/(app)/(tabs)/_layout.tsx:1,19` uses Expo Router Tabs and
  `coreTabOptions`; no custom tab button is supplied. :19 already triggers
  `haptic.select()` on tabPress. Preserve this single existing listener.
- `apps/mobile/src/design/coreNavigation.tsx:9-27` controls selected tint,
  background, icon/label density and 48pt minimum tab target; preserve them.
- Installed `node_modules/expo-router/build/react-navigation/bottom-tabs/views/BottomTabItem.js:11`
  defaults to PlatformPressable, and :110 supplies
  `android_ripple: { borderless: true }`. Installed
  `elements/PlatformPressable.js:95-103` enables Android ripple and fills its
  default color. This directly confirms the roadmap hypothesis; the installed
  navigation implementation is vendored inside Expo Router, not a separate
  top-level @react-navigation dependency. No Liquid Glass tab bar is active.
- `apps/web/src/components/shell.tsx:14-19,68-84` renders ordinary sidebar
  links. `apps/web/app/globals.css:424-451,1314-1323` uses hover/active CSS;
  phone media queries do not add a ripple. STEP 2 can be skipped.
- Existing native Animated can drive transform timing with useNativeDriver.
  `themeTokens.ts` provides motion.press=140 and motion.small=180. Use those
  tokens, with scale 1.08 and a bounded non-overshooting ease return.
- No emulator process is running. Device checks are excluded. Native rendering,
  production revisions and live state are UNVERIFIED (owner to confirm).

## Acceptance matrix (written before implementation)

| Requirement | Owning layer / proof | Local result |
|---|---|---|
| No Android ripple; icon + label enlarge together to 1.08 | Plain Pressable + inner Animated.View; component tests | FRESH PASS source/component; Android visual UNVERIFIED |
| Release/cancel/long press return in 180ms with no overshoot | Native-driver timing and lifecycle tests | FRESH PASS component/browser |
| Reduce Motion never scales, including live preference changes | Theme + component regressions | FRESH PASS |
| Targets >=44px, accessibility/selected styling/navigation/haptics preserved | Navigator integration + prop/layout tests | FRESH PASS local; physical navigation UNVERIFIED |
| Web skip only if no equivalent ripple | Source inspection above | FRESH PASS; NOT APPLICABLE change |
| Local visual proof; emulator recording if available | Isolated local tooling | FRESH PASS 8 RN Web cases; native UNVERIFIED |
| Required serial gates and explicit API applicability | Exact commands/counts below | FRESH PASS; API tests NOT APPLICABLE |
| Rollout and Device checks | Owner steps remaining | NOT RUN (excluded) |

## Execution conventions

Repository-local TEMP/TMP; EXPO_OFFLINE=1; disabled telemetry; loopback-only
Node network guard for builds/tests. Inspected scripts are local compiler,
lint, Vitest, Next build and Expo export only. No deploy/migrate/email script.
No backend, API, schema, auth, data, source or storage change is needed.

## Implementation and local evidence

`TabPressButton.tsx` is supplied by shared `coreTabOptions`. It discards the
upstream ripple/opacity/hover props, retains the navigator's styles and fixed
48pt target, and wraps the exact icon/label children in one Animated.View.
The inner view preserves column/row alignment and justification. Press-in
eases to 1.08 over existing motion.press (140ms); out/cancel/blur eases to 1
over motion.small (180ms). Easing.out(quad) is bounded: zero overshoot. Both
timings use useNativeDriver:true, with no per-frame JS/React state updates.
Preference/background/disabled changes stop and reset an in-flight press;
unmount stops the native animation. Reduce Motion never starts scale timing.
Native callbacks, roles, aria/accessibility state/labels, test IDs and refs
are forwarded. Expo Web href/default prevention and modified clicks retain
the upstream behavior. The existing tabPress haptic listener is untouched;
the button adds no haptic. No new dependency, theme/color token or glass layer.

FRESH focused component suite:
`npm run test --workspace @stay-focused/mobile -- src/design/TabPressButton.test.ts --maxWorkers=2`
PASS, 15/15 tests, 1 file. Tests cover no-ripple boundary, fixed target and child
layout, accessibility/ref forwarding, exact native timing and bounded easing,
press-out/touch-cancel/blur without navigation, long press, navigation callback,
Expo Web modified clicks/default prevention, reduced/inactive/disabled states,
live changes during a hold, rapid repeated taps, unmount and navigator wiring.
Initial focused run was 14/14; the later 15/15 adds Expo Web link preservation.
FRESH mobile workspace typecheck PASS after the first root failure below.

FRESH local visual fixture: `node tmp/overnight/TB1-visual.cjs` PASS, 8 cases
(light/dark x column/row x Reduce Motion on/off). Actual production button runs
through RN Web Animated and Pressable, with synthetic labels/icons and theme
boundary; baseline is the old unwrapped Pressable child layout with installed
tab styles. 24 captures and measurements.json live under ignored
`tmp/overnight/TB1-visual/`; both contact sheets were visually inspected.
All four target rectangles and relative child positions/sizes equal baseline;
targets are >=48px and remain fixed during scale. Motion holds measure 1.08,
reduced holds 1, every release and 650ms long press returns to 1. Collected
release frames stay within [1,1.08]. Light/dark and beside/below labels remain
legible with no shift. This proves local layout/browser timing, not Android
ripple rendering, native-thread execution/performance, real navigation routes
or physical acceptance. No emulator is running; recording is NOT RUN.
The 135 sampled frames measure first-rest within tolerance at 179.3-182.5ms
with motion; reduced holds/releases remain exactly 1. Targets measure
97.5x48px portrait and 211x48px landscape in this fixture.

Retained first attempts and limitations:
- First forced root typecheck: 7/8 tasks PASS, 0 cached; mobile failed with
  two TypeScript errors (Expo AnimatedPressable ref union vs plain View ref,
  and test renderer accepting ReactElement while navigator returns ReactNode).
  A typed stable ref adapter and Fragment test wrapper repair these without
  casts to any or weakening checks. Log: TB1-first-typecheck.log. Final forced
  root typecheck is rerun below on final source.
- First visual fixture failed before capture with an undefined child selector:
  RN Web does not forward raw data-kind; fixture now uses dataSet. It also
  resolves the existing ESM RN Web entry consistently. Assertions are unchanged.
  Log: TB1-visual-first.log. The next run passed all eight cases.
- Contact-sheet composition initially could not run because Python is absent;
  installed sharp generated both sheets instead. Source/screenshots unchanged.
- Documentation closure helper initially had unescaped template backticks and
  stopped at parse time before writing any document. Removed those delimiters;
  the next run reconciled the docs successfully. No code gate was affected.
- Existing Vite config/deprecation and RN Web use-client bundle warnings remain
  in logs. Local RN Web uses its Animated fallback, not native execution.
- React skill review: stable native ref, cleanup on lifecycle/preference changes,
  no React render during animation frames, strict types, forwarded accessibility
  and unchanged navigation/data boundaries. No unrelated migration/refactor.

Relevant API tests: **NOT APPLICABLE**, client-only tab feedback. No request,
route, authentication, server state, persistence or schema behavior changed.
Root build still checks and builds the API. Website implementation change:
**NOT APPLICABLE**; phone sidebar has no equivalent ripple. Its full suite and
explicit build remain mandatory local gates and are run below.

## Final serial gates

| Exact command | Result | Counts | Wall time |
|---|---|---|---|
| `npm run typecheck -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 40.901s |
| `npm run lint -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 67.339s |
| `npm run build -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 268.182s |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | FRESH PASS, exit 0 | 696 tests / 72 files | 18.834s |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | FRESH PASS, exit 0 | 1630 tests / 170 files | 62.463s |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | FRESH PASS, exit 0 | 566 tests / 74 files | 293.005s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, exit 0 | 23/23 pages | 48.631s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, exit 0 | 1 Android HBC bundle, export complete | 67.335s |
| `git diff --check` | FRESH PASS, exit 0 | diff hygiene | 0.123s |

All requested gates run serially on the same final implementation. Zero test
skips. Shared includes source and compiled duplicate cases; shared source is
unchanged. Lint has six existing warnings (five mobile import/first, one web
unused import) and zero new warnings. Root build also supplies 37/37 API pages,
23/23 web pages and local Expo exports. No final gate failed or was bypassed.
Ignored evidence: TB1-gate-*.log, TB1-gates.json, TB1-source-hashes.json and the
visual captures/measurements above, all under tmp/overnight/. The three frozen
implementation/test hashes match after all gates. Generated Next ambient file
changes were inspected and restored; no generated output is staged. A final
forced typecheck after that restoration and pre-commit unstaged/staged checks
are recorded in the closure below. Documentation-only closure does not change
the tested implementation or require repeated full suites.

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Review local commits then separately
  initiate publication. No deploy/OTA/EAS/push occurs in this run.
- Device checks: NOT RUN, skipped entirely. Realme: tap Today, Generate,
  Tasks and Library; no circle; quick enlarge and smooth return; long press,
  cancellation and Reduce Motion. Physical/native behavior and performance
  remain UNVERIFIED (owner to confirm).
- Deployed revisions and live production/database/Scheduler state:
  UNVERIFIED (owner to confirm); not needed for the source-confirmed fix.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for separately
  authorized future rollout tooling; installation and Vercel commands NOT RUN.


## Closure

**PASS for the finite unattended local code scope.** Implementation commit:
5f875a4e fix(navigation): replace tab ripple with press scale.
Documentation checkpoint: docs(navigation): close TB1 local acceptance and gates;
exact hash in Git and tmp/overnight/TB1.status. All current planning documents
are reconciled; newest handoff includes scope, cause, commits, gates and owner steps.
Additional post-restoration npm run typecheck -- --force: FRESH PASS, 8/8 tasks,
0 cached, exit 0, 44.089s (TB1-final-typecheck.log/json). Source hashes 3/3 match.
Pre-commit git diff --check and git diff --cached --check: FRESH PASS for each
explicitly scoped checkpoint. No environment file, generated artifact, private
fixture, validation output, tmp/ or unrelated owner path is committed.
Rollout and Device checks remain NOT RUN; native/production acceptance remains
UNVERIFIED (owner to confirm). No later backlog item started.
