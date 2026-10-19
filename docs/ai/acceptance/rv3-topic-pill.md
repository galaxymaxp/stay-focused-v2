# RV3 topic pill acceptance - PASS locally (2026-10-19)

Baseline `829b8fb`, branch `overnight/2026-10-15_feedback`. Finite scope:
STEP 0-3, mobile/web/shared-reader presentation, regressions, local gates,
docs and scoped local commits. Rollout and Device checks are skipped entirely.
No remote calls, environment-file edits, deployment, migration or push.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Rounded, inset neutral track/thumb; compact content width | mobile | render/layout tests, light/dark tokens | FRESH PASS |
| Measured sliding level thumb, independent Expound, Reduce Motion | mobile | animation/state tests | FRESH PASS |
| Rounded track and translated/resized thumb, no divider | web | component tests and isolated Playwright | FRESH PASS |
| Full accessibility labels, radios, expanded button, focus | both | unit/browser tests | FRESH PASS |
| Short labels/no overflow at narrow widths | both | layout tests and Playwright | FRESH PASS |
| Shared reader appearance and sign-in-only behavior | web | component/browser tests | FRESH PASS |
| Required gates and forced root build | repository | local logs | FRESH PASS |
| Rollout, physical devices and live state | owner | excluded by unattended rules | NOT RUN |

STEP 0: tracked tree clean; expected unrelated untracked paths preserved.
Read current planning, AUTOPILOT, ADR-001/011/039, newest and RV2 handoffs;
opened the exact reference image. `.segmented` only appears in owner/shared
reviewers; styles will stay scoped to `.topic-level-row`. Line numbers drifted.
Web currently uses a group with pressed buttons rather than the requested
radiogroup/radios; implement the explicit radio accessibility rule with keyboard
navigation. Shared reader keeps sign-in links per ADR-039. Theme token names
are `textPrimary`/`surfaceElevated` on mobile. Dark elevated is #2c2c2e and
field/secondary is #3a3a3c; retain the explicitly required existing tokens.
Live revisions/database/Scheduler/device state: **UNVERIFIED (owner to confirm)**.

## Implementation and focused evidence

Mobile: available-width wrapper retains RV2's <380pt compact-label threshold,
while the track hugs its content and aligns left. A 40pt visual track sits
inside 48pt parent bounds; 44pt Pressables have 2pt vertical-only hit slop
within those bounds. The 32pt thumb leaves 4pt track inset. `onLayout` measures
each option; separate Animated nodes allow native translateX and JS layout
width animations, both 200ms ease-in-out. First measurement and Reduce Motion
snap; interrupted animations stop on effect cleanup. Both thumbs use existing
surfaceElevated/radius.pill/shadows.card; labels use textPrimary at normal
caption weight. Expound remains independent, including its closing ability
offline, without a divider. No source, cache, generation or API behavior change.

Web: topic-scoped CSS uses max-content/max-width 100%, a 40px rounded visual
track in 48px controls, 32px inset elevated thumbs, regular primary text and a
small gap before Expound. One measured absolute thumb translates and resizes
over 200ms; ResizeObserver covers option/group and responsive label changes.
Reduce Motion disables transition, including live preference changes. Radios
support roving focus, arrows/Home/End and skip disabled options. Original
remains keyboard reachable if the selected pending rewrite becomes disabled
offline. Expound retains aria-expanded and a separate conditional thumb.
Shared-reader links keep their exact sign-in return routes and display an
Original thumb; they do not become radios or perform generation, per ADR-039.

FRESH focused tests: mobile **12/12**, one file; web topic/shared-reader
**36/36**, two files. Existing source/caching/race/error/offline tests remain.
New tests cover no divider, geometry/radii/tokens, selected measured animation,
independent Expound thumb, live Reduce Motion, label threshold and disabled
radio tab stop. React review skill applied: strict types, primitive effect
dependencies, observer/animation cleanup, equality-guarded measurements and
accessible controls; no dependency or ADR added.

Web Playwright: **54/54 checks** on the actual owner/shared components and
globals.css at 1440/768/400/390/360/320px in light/dark. Includes geometry,
token colors/radii, no overflow, readable single-row labels, selected alignment,
two independent thumbs, exact sign-in links, arrow focus/ring, measured motion,
live Reduce Motion and live breakpoint remeasurement without remounting.
390-light-expanded and 1440-dark screenshots inspected.

Mobile React Native Web harness: **8/8** combinations (500/390/360/320px,
light/dark), actual TopicAssist and the extracted unchanged Copy function,
actual RN Web layout; theme/service/answer-reveal boundaries isolated.
Checks content width, no page overflow, single-line labels, 40/32px track/thumb,
44px controls, measured alignment, independent Expound and selected movement.
Both 360px screenshots inspected. This is layout evidence, not native/device
accessibility or performance acceptance. Native accessibilityState is asserted
by render tests; RN Web 0.21 does not map that native prop to aria-checked.
No app implementation was changed to compensate for that harness limitation.

All browser requests blocked: **0 requests and 0 page errors** in the final
web and mobile harnesses. Fixtures are fictional, isolated test inputs and
are not product mock data. Screenshots, bundles, logs and reports stay ignored
under `tmp/overnight/RV3-browser/` and `RV3-mobile-browser/`.

## Failed attempts and limitations

- Optional mobile-browser attempt 1 completed 0/8 combinations because its
  geometry query expected aria-checked from RN Web's unsupported native
  accessibilityState mapping. The corrected harness measures the initial
  Original and subsequent thumb position; native semantics retain their
  independent render-test assertions. Final result 8/8. No suppressed app error.
- A PowerShell documentation read/write briefly converted historical Unicode
  to mojibake. Inspection caught it; the owned sprint prefix was joined to the
  original Git bytes using Node, preserving all historical content. The first
  inline Node repair encountered Windows shell quote stripping and changed
  no file; the file-based repair succeeded. No environment file was touched.
- Exploratory wildcard/renamed-path reads failed; source discovery found the
  actual files. These were tooling failures, not test/gate failures or flakes.
- Dark elevated tokens are lighter than the card surface but darker than
  secondary/field; the prompt's explicit existing-token rule is followed.
- Realme, authenticated/deployed web, remote refs/revisions/database/Scheduler
  remain UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN.

## Repository gates

Commands run locally and serially, with repository-local TEMP/TMP, outbound
HTTP/fetch/socket guards, B24_6_LIVE/B24_7_LIVE=0, Expo offline/no-dotenv and
Expo/Next/Turbo telemetry disabled. No environment file was edited. API's
complete suite uses two workers to bound local database-test memory, as in
prior unattended slices; it is not filtered. Existing shared emitted test
copies are included. Every requested workspace has a test script.

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | FRESH PASS, final rerun |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings | FRESH PASS, final rerun |
| `npm run test --workspace @stay-focused/shared` | 590/590 tests, 56 files | FRESH PASS |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2433 passed / 3 intentional live skips, 212 files | FRESH PASS |
| `npm run test --workspace @stay-focused/mobile` | 1525/1525 tests, 158 files | FRESH PASS |
| `npm run test --workspace @stay-focused/web` | 374/374 tests, 56 files | FRESH PASS |
| `npm run build --workspace @stay-focused/api` | 36/36 static pages | FRESH PASS |
| `npm run build --workspace @stay-focused/web` | 20/20 static pages | FRESH PASS |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 Android bundle / 35 assets, local export | FRESH PASS |
| `git diff --check` | 0 whitespace errors; staged/final checks also pass | FRESH PASS |
| `npm run build -- --force --env-mode=loose` (additional AUTOPILOT gate) | 8/8 tasks, 0 cached; local Android/iOS/web exports | FRESH PASS |

Initial forced typecheck/lint also passed 8/8 with no cached tasks; final
reruns follow the radio offline-focus safeguard and mobile comment cleanup.
Initial focused web passed 35/35 before adding that safeguard's regression;
final focused web passes 36/36. No unit-test or required-gate failure or nondeterministic flake.
Existing non-failing Vite config-loader, React renderer and Expo diagnostics
are retained in logs. Workflow/provider-contract suites are NOT APPLICABLE
to the UI-only paths; the full requested API suite still ran and passed.

## Closure and owner steps

Implementation commits: `61cbb03 style(mobile): topic level pill with sliding thumb`; `d1df22b style(web): topic level pill with sliding thumb`.
Documentation checkpoint: `docs: complete RV3 topic pill handoff`; its final
hash is recorded in Git and ignored `tmp/overnight/RV3.status` after committing.
All requested code steps and 10/10 prompt gates, plus the forced root build,
are complete. Gate logs: `tmp/overnight/RV3.*.log`; browser report JSON and
screenshots stay under the ignored RV3 browser directories. No platform code
implementation skipped. Shared-reader interactive selection/Expound animation
does not apply to sign-in-only links; it receives the same visual track/thumb.
Generated Next declarations were inspected and restored; owner untracked paths
preserved. No source, API, schema, migration, dependency or ADR change.

Owner steps remaining:

- **Rollout - NOT RUN, skipped entirely:** owner chooses website deployment
  and mobile OTA/APK after reviewing the local commits.
- **Device checks - NOT RUN, skipped entirely:** compare the reference on
  Realme and real website in light/dark; verify narrow labels, two independent
  thumbs, animation/Reduce Motion, TalkBack and web keyboard focus.
- Confirm all UNVERIFIED production/remote/device state. For later Vercel
  deployment/env/log work, installing the missing CLI with `npm i -g vercel`
  is strongly recommended; no installation or CLI invocation ran here.

No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration
application, Scheduler action, email, deployment, environment-file edit, branch
switch or push. Finite endpoint RV3 only; no later slice or AN1 resumption.
