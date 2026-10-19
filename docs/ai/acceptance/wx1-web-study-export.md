# WX1 / Website saved study exports

Approved endpoint: STEP 0-5, local tests/gates, reconciled docs and atomic local
commits on `overnight/2026-10-15_feedback`. Baseline `30f183bc`. Rollout and Device
checks are excluded by the leading UNATTENDED rules in WX1. No service calls,
deployment, remote SQL/migration, Scheduler operation, environment-file edit or
push is authorized. Unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
were present at startup and are preserved.

| Requirement | Owning layer | Evidence / current result |
| --- | --- | --- |
| Pure builders moved, single source, mobile behavior preserved | shared/mobile | `git mv`; four builder implementations identical after import-path normalization; 11 shared export tests and 2 SAF adapter tests FRESH PASS |
| Saved local bytes, format validation, names/MIME | shared | Original 7 tests retained; 4 added creation/rejection cases FRESH PASS |
| Lazy browser download and delayed URL cleanup | web helper | All three Draft MIME/name cases, Reviewer PDF, unsupported input, click failure, no fetch and dynamic import boundary FRESH PASS |
| Reviewer PDF/TXT in existing menu | web Reviewer | Format dispatch, busy disable, existing Share/quiz and keyboard behavior FRESH PASS |
| Draft exports saved state, protects edits | web Draft | Shared format discovery, busy/error/retry, unsaved disable and server-confirmed saved response FRESH PASS |
| Required repository gates | all | FRESH PASS; exact results below |
| Rollout and Device checks | owner | NOT RUN, explicitly skipped; UNVERIFIED (owner to confirm) |

Implementation adds no API/schema, content enrichment, styling tokens or motion.
The main shared entry does not export study builders. Browser code dynamically
imports `@stay-focused/shared/study-export`; mobile retains SAF folder saves.
No other mobile source imports pdf-lib/fflate, so direct mobile dependencies move
to shared. The lockfile changes only those workspace dependency declarations;
already installed versions are reused without an install or network request.

**PASS for the finite unattended local code scope.** Ignored local evidence: `tmp/overnight/WX1-*`,
`WX1.progress` and `WX1.status`.

First attempts: the optional `python` launcher was unavailable before any writes;
the equivalent Node script completed. Initial reads of nonexistent optional
`use-action.ts`, shared Vitest config and Next guidance reference were corrected
using `lib/hooks.ts`, package defaults and the installed skill layout. Gate failures and corrected attempts are retained below.

## Final verification

Implementation: 255081e3 shared/mobile; f787b490 web. Documentation commit
is recorded in Git and ignored WX1.status. All checks below are local. The Node
network guard blocks external HTTP/fetch/socket destinations; telemetry is
disabled, Expo is offline, and B24_7_LIVE=0. No live service check was attempted.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached | Final forced run; 0 errors |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached | 0 errors, 6 existing warnings (5 mobile, 1 web) |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 643 tests / 65 files | Includes original 7 export cases plus 4 creation/rejection cases |
| `npm run test --workspace @stay-focused/api` | FRESH PASS, 2452 passed / 3 skipped / 213 files | Full retry, two workers; live skips intentional |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1582 tests / 166 files | Full retry; 2 SAF adapter cases; original 7 cases moved to shared |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 515 tests / 71 files | Export helper/UI/menu regressions included |
| `npm run build --workspace @stay-focused/api` | FRESH PASS | 37/37 pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS | 23/23 pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS | Local Android export only |
| `npm run build -- --force` (AUTOPILOT) | FRESH PASS, 8/8 tasks, 0 cached | Additional repository build |
| `git diff --check` / `git diff --cached --check` | FRESH PASS | No whitespace defects after correction |

Focused checks: shared 11, mobile adapter 2, web 30 tests / 4 files FRESH PASS.
The mobile adapter test was renamed to saveStudyFile.test.ts so Git retains the
original studyExport.test.ts move to shared; its renamed focused test and final
full mobile suite pass. The four builders compare identical with baseline after
import-path/line-ending normalization. Production web output contains the
builder in a lazy chunk and in none of the 39 initial page-manifest entries.
React review: hooks remain unconditional, action locks prevent duplicate saves,
format controls use native buttons/disabled state, unsaved hint is associated,
Reviewer keyboard/focus behavior and Share/quiz controls remain covered. No new
CSS, dependencies beyond the moved builders, motion or provider request.

## Failed attempts and retries

- First forced typecheck: FAIL, 4 successful / 6 total tasks, 0 cached; one new
  test mock had an overly broad Vitest type (TS2345). Typed the revoke callback;
  forced rerun passed all 8 tasks without weakening TypeScript.
- First full mobile suite under concurrent load: FAIL, 1581 passed / 1 timeout,
  165 passed files / 1 failed. Existing offlineCatchUp 300-attempt continuation
  case hit its unchanged 5000ms timeout. Full two-worker retry passed all 1582.
- First full API suite under concurrent load: FAIL, 2450 passed / 2 timeouts /
  3 skipped, 211 passed files / 2 failed. Existing read-imports packaging and
  document_extraction prerender-hook cases hit unchanged 5000ms timeouts. Full
  two-worker retry passed 2452 with 3 intentional live skips. No test assertions
  or timeouts were relaxed. These are recorded as load-related timeout flakes.
- First sequential-runner preload failed before tests (0 tests) because Windows
  backslashes were parsed in NODE_OPTIONS. Preserved its log, normalized only
  the ignored runner path to forward slashes and reran successfully.
- First staged diff check found one new trailing blank line in shared index.ts;
  removed it, then staged/final checks passed.
- After builds, the two inspected Next-generated next-env.d.ts changes were
  restored to the clean baseline; final forced typecheck/lint and full mobile
  checks were rerun after test-file rename and whitespace cleanup.
- Existing Vite config-loader, Expo color and large-bundle warnings are retained
  in ignored logs. No failed code assertion remains.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy the website through the owner
  release process. Mobile changes go beyond imports (shared MIME lookup and
  dependency ownership); include the refactor in the next authorized mobile
  OTA if shipping it. Generated file algorithms/output behavior are unchanged.
- **Device checks - NOT RUN, skipped entirely:** on desktop and a phone browser,
  export a Reviewer PDF and Draft PDF, DOCX and PPTX, and open each in its app.
  Confirm the unsaved hint and export after saving. Verify native mobile folder
  export when shipping the mobile refactor. Actual viewer/device behavior and
  deployed revisions remain **UNVERIFIED (owner to confirm)**.
- For future authorized Vercel environment/deploy/log work, strongly recommend
  installing the missing CLI with `npm i -g vercel`. No installation or Vercel
  command was run here.

Endpoint WX1 only. Owner Pause, blocked FULLSEND and unrelated untracked paths
remain untouched. No subsequent overnight task or worker was started.
