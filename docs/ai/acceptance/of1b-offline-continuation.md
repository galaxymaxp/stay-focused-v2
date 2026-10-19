# OF1b automatic offline saving

Status: PASS for the finite unattended local code scope.

Finite scope: STEP 0-3, local tests/gates, documentation and local commits.
Baseline 9bf8335 on overnight/2026-10-15_feedback. Rollout and Device checks
are excluded by the unattended rules. No external service operations allowed.

STEP 0 reuses a68072f and the OF1 handoff: AppLifecycle already owns catch-up;
Library blur only unsubscribes the view. The 60-second/300-attempt body limits,
missing continuation, unaccounted errors and batch notifications still exist.
There is no NetInfo/native reconnect listener in the installed app. Existing
release checks perform isolated reachability probes, not connectivity events.
Use foreground/session admission and backed-off active continuation instead.

| Requirement | Owner | Proof / result |
| --- | --- | --- |
| App-scoped, single flight, blur independent | lifecycle/service/hook | PASS: mounted hook blur + lifecycle + single-flight tests |
| Continue after time/attempt limits | service | PASS: timer-driven 305-item and elapsed-budget regressions |
| Retry transient errors with backoff; stop on background/offline admission | service/store | PASS: simulated connection recovery, lifecycle session/active admission, persisted exponential delays |
| Persist version-specific permanent failures without a new table | local artifact rows | PASS: file close/reopen, owner isolation, new-version/stale-failure fencing, successful-open and clear/purge regressions |
| Publish per item and read live counts | service/hook | PASS: mounted hook reads 0/3, 1/3, 2/3 and completes 3/3 after blur |
| Four exact captions, home/course; web twin | presentation | PASS: four state assertions in mobile and web; web has no caller |
| Preserve OI1 images, caps, cleanup, readiness | unchanged image implementation | PASS: existing focused image/cache/queue/cleanup tests; image scheduling/caps unchanged |
| All gates and documentation | repository | PASS: all 10 prompt gates plus forced root build; scoped local commits and reconciled planning files |

Live/deployed revisions, reported production 40/72 cause, remote database and
Scheduler state: UNVERIFIED (owner to confirm). No live inspection is allowed.

## Implementation and limits

- AppLifecycle still owns admission; the focused Library effect joins without
  passing its screen AbortSignal. Active/offline-session changes suspend body
  admission and cancel its pending timer. Sign-out/clear refuse new body admissions while draining writes and image
  downloads before cleanup through the existing stop function. Clearing copies
  still allows the existing Settings save-again action.
- Inventory now follows all advancing 100-item pages instead of silently
  stopping after ten pages; an 11-page regression covers this ceiling. List
  failure/absence still never implies deletion.
- Each body run retains the 60-second and 300-attempt limits. A limited run schedules
  another low-priority run after 250ms. Groups now contain five sequential items
  with an event-loop yield between groups. Only one owner flight runs at once;
  concurrent callers join. Sync/generation callers additionally mark changed
  inventory, ensuring a refresh arriving mid-flight gets a later list recheck.
- Transient per-item retries persist attempts and retry time: 2s, 4s, 8s,
  increasing to 5 minutes. Connection/list failures use idle active admissions
  at 30s, 60s, etc., capped at 5 minutes. No native reconnect source exists;
  foreground/session restoration and these idle admissions are the approved
  fallback, not an instant hardware reconnect event. No new dependency/probe
  endpoint or native listener was added.
- Forward-only local SQLite migration 10 appends four columns to the existing
  library_artifacts table. Permanent permission/invalid-request failures are
  version bound; exact detail not_found still removes only that artifact. A
  missing quiz key leaves its readable body and stops endless key retries.
  Unknown/server/rate-limit/invalid-response failures remain retryable, without
  an attempt threshold turning transient failures into permanent ones.
- New versions ignore prior failure metadata. A delayed old-version failure
  cannot poison a new summary. Successful refreshes and explicit body clear
  reset failures; owner purge/removal removes the row. All SQL is owner scoped.
  No remote database, schema, API, auth, RLS or source-content change.
- Existing subscriptions publish after each item. The hook reads current,
  total, failedPermanent and queued/running state; a successful list read clears
  an earlier connection error. Image readiness still uses OI1 manifests/caps.
  The image queue only exposes running state and emits a final notification;
  downloads, concurrency, retries, caps and cleanup are unchanged.
- Both Library home and course already call the same mobile caption helper.
  Both caption twins now use the exact four requested texts, with static text
  and no animation, button or toast. Web has no offline mode or caption caller;
  only the retained helper and its unit tests change. No required platform
  behavior was skipped. Existing ADR-027 and ADR-043 were reviewed; no new ADR
  was requested or created.

## Verification record

Focused final before the last missing-key regression: FRESH 155/155 tests,
14 files. The final full mobile gate includes that additional regression and the
11-page inventory regression. Initial full mobile (before the pagination test
was loaded) passed 1545/1545; it is repeated on the final tree. Preliminary
mobile typecheck: FRESH PASS. Final repository gates are recorded below at
closure; no historical or cached result substitutes for a fresh command.

Failures retained:

1. First focused run: 122 passed / 3 failed, 7 passed / 2 failed files. Two
   assertions expected no queued work after failure, and the quiz-key test
   expected an immediate retry. Updated them to assert the new scheduled state
   and persisted deadline, while retaining readable-body assertions.
2. Expanded focused run: 139 passed / 3 failed, 11 passed / 2 failed files;
   the 300-item fake-timer case also timed out in teardown. New Node tests
   awaited a cold native filesystem import while fake time advanced. An
   isolated hook diagnostic reproduced 1 failure / 10 skipped. Explicit inert
   filesystem mocks fixed those test harnesses; no production timeout increased.
3. Repaired focused run: 142/142, 13 files. After the mid-flight inventory
   recheck regression, 155/155, 14 files. No remaining focused failure or
   nondeterministic flake established.

Exploratory PowerShell/rg wildcard and quote errors were corrected without
changing files or running remote commands. Verification runs set live test
flags off, Expo offline and telemetry off. An ignored Node preload blocks
non-loopback HTTP(S), fetch and sockets; root Turbo loose env mode preserves
those guards in child tasks. Temporary directories stay inside the repository.
No environment file was edited. Logs/generated artifacts stay ignored in tmp
and local build output directories. Strict TypeScript is retained.

## Final gates and commits

Implementation commits: 5bc6652 (mobile), 9a38527 (web). The closing docs
commit is recorded in Git and tmp/overnight/OF1b.status. All use the requested
author. Checks ran on identical implementation before these scoped commits.

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; final repeat |
| `npm run lint -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; final repeat |
| `npm run test --workspace @stay-focused/shared` | PASS, 596/596 tests, 58 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1546/1546 tests, 162 files; final repeat |
| `npm run test --workspace @stay-focused/web` | PASS, 391/391 tests, 60 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android bundle; final repeat |
| `git diff --check` and `git diff --cached --check` | PASS, 0 whitespace errors; repeated at closure |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; Android/iOS/web local exports; final repeat |

All repository gate attempts passed. Type/lint and both mobile/root builds
were repeated after final UI polish; final mobile was repeated at 1546/1546.
Workflow/provider contract suites: NOT APPLICABLE, unchanged API/provider code.
Rollout and Device checks: NOT RUN, excluded entirely.

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely. Owner reviews local commits and chooses
  website/mobile publication separately. No deployment, OTA, EAS or push ran.
- Device checks: NOT RUN, skipped entirely. On Realme, fresh sign-in on Wi-Fi
  while opening Today only; confirm gradually increasing Library count and
  final wording. Interrupt connectivity, restore it, then foreground/background;
  confirm resumption, home/course parity and offline opening of saved items.
- Confirm all UNVERIFIED production/deployed/database/Scheduler states. The
  source-established limitations are potential contributors to the reported
  40/72 symptom, not a verified deployed diagnosis.
- For later authorized deployment/env/log tooling, installing the missing
  Vercel CLI with npm i -g vercel is strongly recommended. No install or CLI
  invocation was performed here.

React best-practices review: owner/token/active primitives remain effect
inputs; screen focus still controls only its subscription. No conditional
hooks, new motion, dependency, content rewrite or design-token change. The
only TSX implementation changes are lifecycle admission and sync invalidation.
