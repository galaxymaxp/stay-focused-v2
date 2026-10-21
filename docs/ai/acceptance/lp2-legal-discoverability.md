# LP2 - legal discoverability (2026-10-21)

Finite scope: STEP 0 through local implementation, tests, serial gates, docs and
local commits. Rollout and Device checks are excluded. LP2 is the endpoint;
no RB9, release or FULLSEND. No external service call, remote SQL/migration,
Scheduler action, environment-file edit, deploy, OTA/EAS or push is permitted.
Owner roadmap (read in full):
`C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused\overnight\roadmaps\2026-10-21-orb-theme-glow-scroll-tabs-legal.md`.

## Baseline before edits

Branch `overnight/2026-10-15_feedback`; HEAD `60865bc3` after TB1.
Local tracking metadata: github/main ahead 10, behind 9; no fetch performed.
Remotes: github points to galaxymaxp/stay-focused-v2; origin is the local
C:/Projects/stay-focused-v2 checkout. Git identity galaxymaxp
<omgraythekid@gmail.com>; commits use explicit --author.
Read root AGENTS.md, AUTOPILOT.md, current planning documents, newest handoff,
ADR-001 and ADR-011. Existing Owner Pause remains; this prompt authorizes only LP2.

`git log --oneline -8`:
```text
60865bc3 docs(navigation): close TB1 local acceptance and gates
5f875a4e fix(navigation): replace tab ripple with press scale
390d3b80 docs(scroll): close RS1 local acceptance and gates
7a5043e2 fix(scroll): stabilize shared search headers
2764ce02 docs(orb): close OL1 local acceptance and gates
e54f11d0 fix(orb): reveal only complete orb frames
4de209d9 docs(orb): close OG1 local acceptance and gates
0e06266f fix(orb): soften standalone generation glow
```

`git status --short`:
```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```
All unrelated owner paths and ignored tmp/ stay excluded from staging.

## STEP 0 - confirmed source cause

- Native app/privacy.tsx and app/terms.tsx render bundled shared documents using
  features/legal/LegalScreen.tsx, outside the signed-in app group. LegalLinks
  links both routes. LegalScreen already links onward to Terms from Privacy.
- Native SettingsScreen.tsx has an About section containing AppUpdateAbout
  (installed version/update details), followed by tiny LegalLinks outside it.
  ProfileButton in design/primitives.tsx opens Sheet with only Sync and Settings.
  Page on Today uses that ProfileButton. LP1 is present; no source regression.
- Web app/privacy/page.tsx and app/terms/page.tsx render shared bundled content
  with LegalPage and LegalLinks. Settings has only a small LegalLinks footer,
  no About group. AccountMenu in components/shell.tsx has no legal entry.
- Web AccountMenu exists only in the desktop sidebar, which is hidden below
  760px. Reuse the same account menu as a compact topbar avatar at phone width
  so the requested profile path is also reachable there in two taps.
- Both legal screens already cross-link. A single Privacy & Terms row can open
  Privacy directly, as the prompt explicitly allows, without a new chooser.
- Sign-in/sign-up footers and sign-up agreement exist on both platforms;
  web download footer also exists. Preserve them and the exact legal copy.
- Cause confirmed: low prominence and missing profile entry. No backend/schema,
  auth, provider, data or animation change is needed. Existing tokens/rows only.
- Deployed revision, Realme build, live database and Scheduler state are
  UNVERIFIED (owner to confirm); no live inspection is needed for this source fix.

## Acceptance matrix (before implementation)

| Requirement | Owning layer / proof | Initial result |
|---|---|---|
| Settings About: Privacy Policy, Terms of Use, chevrons and version | Native standard rows + existing AppUpdateAbout; render/press tests | FRESH PASS local |
| Native profile opens Privacy in two taps; Terms remains linked | Real ProfileButton/Sheet interaction and route tests | FRESH PASS local; device UNVERIFIED |
| Website About and profile entry, desktop and phone | Existing RowLink/AccountMenu; render/navigation tests | FRESH PASS isolated component/browser |
| Bundled offline legal content; signed-out footers/agreement retained | Existing legal route tests and unchanged source inspection | FRESH PASS local; deployed UNVERIFIED |
| Settings About/profile light and dark screenshots | Local isolated browser/RN Web fixture | FRESH PASS 6 cases / 12 inspected captures; physical acceptance UNVERIFIED |
| All requested serial gates, exact counts and API applicability | Local compiler/lint/build/Vitest and diff logs | FRESH PASS; API tests NOT APPLICABLE |
| Rollout and Device checks | Owner steps remaining | NOT RUN (excluded) |

## Execution conventions

Inspect scripts before running; use only local compiler/lint/Vitest/Next build/
Expo export commands. Use repository-local TEMP/TMP, EXPO_OFFLINE=1, disabled
telemetry and a loopback-only Node network guard. Generated/validation artifacts
stay ignored under tmp/overnight/LP2-*. API tests NOT APPLICABLE: client legal
navigation only; no API, auth, persistence, schema or provider behavior changes.

## Implementation and local visual proof

Native Settings reuses the existing RowLink and icon-chip patterns in About,
with the existing AppUpdateAbout immediately beneath them. The duplicate small
Settings footer is removed. Version/update checks/share behavior is unchanged.
ProfileButton reuses its Sheet/RowLink, closes the sheet and pushes /privacy.
Privacy already links to /terms. The legal landing is two taps from Today;
Terms is available through the existing link on that landing. No new chooser.

Web Settings reuses RowLink for /privacy and /terms and reads its version from
the web package manifest (2.0.0 at baseline), rather than hardcoding a release.
Native keeps installed Expo version metadata (app.json currently 2.2.0 / 6).
The same AccountMenu gains one legal row and a compact phone topbar avatar,
replacing the phone-only Settings shortcut; Account settings remains in the menu.
Compact menu links keep 44px minimum targets and fit the phone viewport.
No new token, dependency, glass surface, motion or legal document copy.

Focused tests, FRESH PASS:

- `npm run test --workspace @stay-focused/mobile -- src/design/primitives.test.ts src/features/settings/legalDiscoverability.test.ts src/features/legal/LegalScreen.test.ts`:
  18 tests / 3 files, exit 0. The actual ProfileButton and Sheet render, open,
  navigate and dismiss; both Settings targets and existing version component
  remain in About. Existing legal tests verify every bundled section offline,
  back behavior, target sizes and cross-links.
- `npm run test --workspace @stay-focused/web -- src/features/legal/discoverability.test.ts src/features/legal/legal.test.ts`:
  5 tests / 2 files, exit 0. Settings grouping/targets/version and actual Shell
  desktop/compact account menus are exercised, including close on navigation.
  Existing legal tests server-render both documents without fetching.
- Initial `npm run typecheck -- --force`: 8/8 tasks, 0 cached, exit 0,
  40.545s; followed by the final serial run after the final test/CSS adjustment.

`tmp/overnight/LP2-visual.cjs` runs actual native SettingsScreen, Page,
ProfileButton/Sheet/RowLink, AppUpdateAbout and legal routes using RN Web, and
actual web Shell/Settings/RowLink/legal routes using production CSS. Fixture
session/avatar/version state is synthetic; unrelated Settings network sections,
queues, provider effects and sheet-drag worklets are replaced with inert stubs.
Native icons use existing web SVG masks; RN safe areas are zero. The fixture
router simulates local route transitions; this does not prove Expo/Next Router
or authentication behavior. All legal document copy is the bundled source.
Native is shown offline; no external requests or page errors in any case.

Six FRESH PASS cases: RN Web at 390x900, web at 390x900 and 1440x900, each
light and dark. Each exercises both Settings destinations, two profile taps to
Privacy, then the Terms cross-link. Twelve final screenshots were inspected:
`tmp/overnight/LP2-visual/{native-390,web-390,web-1440}-{light,dark}-{settings-about,profile}.png`.
Machine results: `LP2-visual/results.json`; final log `LP2-visual-final.log`.
All About rows, chevrons and versions are readable and the profile entry fits.
These are isolated local UI proofs. Physical/native rendering, gestures,
performance, actual authenticated routes and deployed state remain
UNVERIFIED (owner to confirm).

## First attempts and limitations

- The first focused launch failed before any tests because backslashes in
  NODE_OPTIONS were consumed by Node. Corrected to forward slashes; retained
  `LP2-focused-mobile.log` and passing `LP2-focused-mobile-retry.log`.
- First browser helper timed out locating native Terms: its Expo Link adapter
  did not map accessibilityLabel to aria-label; CSS also referenced the wrong
  emitted filename. Corrected the helper; all six cases passed. Initial
  screenshots captured the native sheet during its existing 160ms fade; waited
  300ms before final captures and scrolled the version into view. The second
  and final runs both pass 6/6. Original logs remain; production source did not
  change for these helper repairs. No assertion was weakened.
- Existing Vite module-level directive/config-loader notices are tooling
  warnings. Visual tests are not physical-device acceptance. No rollout or
  device command is run.
- First serial typecheck passed 8/8 (0 cached; 38.567s wall time) and lint
  passed 8/8 (0 cached; 55.945s), but lint exposed one new unused-prefetch
  warning in the web test adapter, alongside six existing warnings. Repaired
  that adapter without changing production behavior or assertions. Deliberately
  interrupted root build during workspace compilation, verified its process
  tree stopped and restarted the full serial sequence. The first logs/JSON
  and interrupted build log remain under LP2-gate-*-first / -interrupted.
- Second serial typecheck/lint passed 8/8 each, 0 cached (39.681s / 49.451s).
  Root build compiled successfully but warned about a named JSON version
  import. Switched production and test code to a default manifest import;
  deliberately interrupted that build, verified the process tree stopped,
  restored only generated Next declarations, refreshed source hashes and
  reran visuals (6/6 PASS) and the full serial sequence on frozen source.
  Second logs/JSON and the interrupted build log are retained. No full build
  failure or test failure is disguised by either deliberate interruption.

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Review the local commits/evidence, then
  separately initiate publication. No push, deploy, OTA/EAS or install here.
- Device checks: NOT RUN, skipped entirely. Realme: Today avatar -> Privacy &
  Terms; follow Terms and Back; Settings -> About -> both legal rows, version,
  light/dark and offline. Physical/native rendering and actual navigation,
  accessibility and performance are UNVERIFIED (owner to confirm).
- Actual authenticated web routes/Next Router, deployed revisions, live
  production/database/Scheduler state are UNVERIFIED (owner to confirm).
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for separately
  authorized future env pull/deploy/log tooling. Installation and all Vercel
  commands NOT RUN in LP2.
- No service call, email, environment-file edit, remote SQL/migration or
  Scheduler operation is performed. Original UI/, apps/mobile/.gitignore,
  supabase/.temp/ and ignored tmp/ remain untouched and excluded from staging.
  Existing Owner Pause remains; no RB9, release or FULLSEND is started.


## Final serial gates

| Exact command | Result | Counts | Wall time |
|---|---|---|---|
| `npm run typecheck -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached | 41.913s |
| `npm run lint -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached; 6 existing warnings | 51.372s |
| `npm run build -- --force` | FRESH PASS, exit 0 | 8/8 tasks, 0 cached; API 37/37, web 23/23 pages; local Expo exports | 197.909s |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | FRESH PASS, exit 0 | 696 tests / 72 files | 16.869s |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | FRESH PASS, exit 0 | 1633 tests / 171 files | 59.366s |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | FRESH PASS, exit 0 | 569 tests / 75 files | 287.191s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, exit 0 | 23/23 pages | 47.303s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, exit 0 | 1 Android HBC bundle, export complete | 60.054s |
| `git diff --check` | FRESH PASS, exit 0 | diff hygiene | 0.122s |

All requested gates ran serially on frozen source. Zero suite skips. Shared
includes source and compiled duplicate cases; shared source is unchanged.
Only six existing lint warnings remain (five mobile import/first and one web
unused import). Earlier attempts and tooling warnings are retained above.
Full logs/JSON: ignored tmp/overnight/LP2-gate-*.log and LP2-gates.json.
Eight production/test source hashes match after gates. Generated Next ambient
declarations were inspected and restored to baseline; no generated file is staged.
Additional npm run typecheck -- --force after that restoration: FRESH PASS,
8/8 tasks, 0 cached, exit 0, 40.302s (LP2-final-typecheck.log/json).
Pre-commit git diff --check and git diff --cached --check: FRESH PASS at both
scoped checkpoints. API tests NOT APPLICABLE: no API/auth/schema/provider change.

## Closure

**PASS for the finite unattended local code scope.** Implementation:
c6586db4 fix(legal): expose policies in settings and profile menus.
Documentation checkpoint: docs(legal): close LP2 local acceptance and gates;
exact hash in Git and tmp/overnight/LP2.status. Current state, roadmap, sprint
and handoff reconciled. No environment file, generated/private artifact,
validation output, tmp/ or unrelated owner path is committed. Rollout and Device
checks remain NOT RUN; physical and production acceptance remains UNVERIFIED
(owner to confirm). LP2 ends here; no later backlog item started.
