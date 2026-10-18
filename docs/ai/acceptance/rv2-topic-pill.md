# RV2 acceptance - PASS locally (2026-10-18)

Finite scope: shared compact labels; mobile + web + signed-out four-part pill; tests; fresh serial gates; docs; local commits. No rollout or device checks, no remote calls, no environment changes, no push.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Compact/full labels exported; actions unchanged | shared | unit test and index wildcard | FRESH PASS |
| One pill, no scroll, independent Expound and full accessibility | mobile | render/state/narrow-layout tests | FRESH PASS |
| One pill, state and signed-out sign-in links | web | render/state/link tests | FRESH PASS |
| Single row / no overflow at 1440/768/390/360 | web | isolated local Playwright with requests blocked | FRESH PASS |
| Required serial checks | repository | fresh command logs under tmp/overnight | FRESH PASS |
| Rollout + device acceptance | owner | skipped entirely | NOT RUN |

Baseline 1064513; original untracked paths preserved. No migration, dependency, API or behavior changes authorized. Mobile short labels below 380 measured row points: four segments at that width allow about 85 points of text per segment, enough for Explain simply at the existing 12-point caption size. Web short labels at viewport <=400px per prompt.

## Implementation checkpoints

- `0b553dd feat(shared): compact topic level labels`
- `bf5febd feat(mobile): topic levels and expound in one pill`
- `fc1cb84 fix(mobile): preserve equal topic pill shares and hit bounds`
- `ec580e9 feat(web): topic levels and expound in one pill`

Focused FRESH PASS: shared 6/6 (1 file), mobile 9/9 (1 file), web topic + shared reviewer 35/35 (2 files). Mobile renders no ScrollView, keeps three radios with full names and checked/disabled state, and gives 32-point visible segments vertical-only 6-point hit slop within 44-point parent bounds. Expound has its own equal-share wrapper; expansion does not change the level. Width cases 320/360/379/380/500 cover the mobile label threshold. No new colors, tokens, packages, native modules, migration, API or source-content change.

Browser FRESH PASS: `node tmp/overnight/RV2-browser.mjs`, 24/24 checks, at 1440/768/390/360px in light and dark themes. Each combination checks both actual owner/shared components with repository globals.css: four equal segments, one row, readable text, >=44px targets, visible overflow and scrollWidth <= clientWidth on both pill and row. It also checks independent selection/expansion, selected styling and sign-in links. All requests are blocked; 0 unexpected requests and 0 page errors. This is an isolated fictional component harness with assist-store and Next Link boundaries replaced, not a full application or real-account flow. Screenshots/report are ignored under `tmp/overnight/RV2-browser/`; 360-light and 1440-dark screenshots were inspected.

### Failed first attempts (retained)

1. Browser attempt 1: 0/24 completed checks; equal-segment assertion failed because Expound's horizontal padding contributed to its outer flex basis. Removed web horizontal segment padding and gave mobile Expound an equal-share 44-point wrapper. Product layout defect corrected before mandatory gates.
2. Browser attempt 2: 2/24 completed checks; harness expected `returnTo`, while the existing sign-in helper correctly uses `next`. Corrected the harness expectation; no sign-in behavior change.
3. Browser attempt 3: 3/24 completed checks; screenshot write failed with ENOENT because URL.pathname preserved `%20` in the Windows path. Used fileURLToPath. Final attempt passed 24/24. These were deterministic defects, not nondeterministic flakes.

No unit-test or required-gate failures occurred. Existing non-failing Vite configuration notices are retained in logs.

## Required fresh serial gates

Tested implementation HEAD: `ec580e9`, following baseline `1064513`. Every
listed command ran fresh, serially, in the listed order. Logs remain ignored
under `tmp/overnight/RV2-gate-*.log`. TEMP/TMP stayed repository-local;
telemetry was disabled for builds and Expo ran offline. No environment file
was edited. Shared Vitest intentionally discovers existing compiled copies;
447 is the workspace result, not 447 distinct source tests.

| Command | Exact result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | FRESH PASS |
| `npm run lint -- --force` | 8/8 tasks, 0 cached, 0 errors, 6 existing warnings | FRESH PASS |
| `npm run test --workspace @stay-focused/shared` | 447/447 tests, 44/44 files | FRESH PASS |
| `npm run test --workspace @stay-focused/web` | 280/280 tests, 42/42 files | FRESH PASS |
| `npm run test --workspace @stay-focused/mobile` | 1334/1334 tests, 139/139 files | FRESH PASS |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 35/35 static pages | FRESH PASS |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 local Android export | FRESH PASS |
| `git diff --check` | 0 whitespace errors; final staged check also passes | FRESH PASS |

No required-gate retries, test skips or nondeterministic flakes. Existing
non-failing Vite and Expo notices remain in the logs. Root aggregate/website
production builds are **NOT RUN**, outside RV2's explicit gate list. API
unit/provider/workflow suites are **NOT APPLICABLE** to the unchanged API
and provider boundaries. API build was required and passed. Generated
`apps/api/next-env.d.ts` changes were inspected and restored to HEAD.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner website deploy and mobile
  OTA/APK through the existing release process. No RV2 migration is required.
- **Device checks - NOT RUN, skipped entirely:** Android Realme at 360pt:
  one compact pill, readable labels, no scrolling, Expound opens/closes,
  TalkBack announces three radios and one expandable button. Real website
  review at 1440 and 390px. The isolated harness is not real-account proof.
- Production revision, database/Scheduler state and actual device/provider
  behavior are **UNVERIFIED (owner to confirm)**. No remote check was attempted.
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for later
  owner-controlled environment, deployment and log work; not run here.

No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL,
migration application, deployment, Scheduler action, email, environment-file
change or push. No ADR is needed. Original untracked `UI/`,
`apps/mobile/.gitignore` and `supabase/.temp/` are preserved. No `tmp/`,
`.local/`, screenshot, bundle or validation log is committed. Documentation
closure commit is recorded in `tmp/overnight/RV2.status`; no next task begins.

Closure tooling first attempt: `python tmp/overnight/RV2-close-docs.py` exited 9009 because the Windows Python alias has no installed runtime. No files changed and no gate ran in that attempt. The equivalent Node helper completed the documentation updates; no runtime was installed.
