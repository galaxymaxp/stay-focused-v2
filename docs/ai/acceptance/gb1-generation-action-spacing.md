# GB1 generation action spacing

Baseline: `795fbba`, branch `overnight/2026-10-15_feedback`, 2026-10-19.
Status: **PASS for the finite unattended local code scope**.
Implementation: `e1b4979 fix: space and pad generation actions on mobile and web`.
Documentation checkpoint hash is recorded in Git and ignored `GB1.status`
after committing; both commits use author `galaxymaxp <omgraythekid@gmail.com>`.
Finite scope: GB1 STEP 0-2, regression tests, local gates, documentation and
local commits. Rollout and Device checks are owner steps, skipped entirely.

## Preflight and acceptance matrix

Tracked baseline clean; unrelated untracked `UI/`, `apps/mobile/.gitignore`,
`supabase/.temp/` preserved. Local tracking ahead 21 / behind 2; no fetch.
Read latest handoff plus WGP1/GN1b, current planning, AUTOPILOT and ADR-001/011.
Prompt line numbers drifted without a requirements conflict.

Mobile status column had gap 0; each action wrapper was 240pt wide with no
separation. Artifact and reconnect actions were outside the column, without
pill styling. Action padding was 16pt primary / 8pt secondary, vertical 8pt,
minimum height 48pt. Pill padding therefore needed the shared primitive fix.
Web already had one stretched full-width column, gap 10px, button padding
12px vertical / 16px horizontal, minimum height 48px below 761px. Desktop
density overrides reduced these to height 36px and padding 0 / 14px. Its details
pane provides 24px separation above the action column, exceeding the required 16px.
Web stalled state could show two primary actions (Queue and Cancel).

| Requirement | Owning layer / proof | Result |
| --- | --- | --- |
| One centered mobile action column, shared 240pt width, 12pt gap and 16pt top space | GenerationScreen renderer assertions across saved/running/stalled/failed/completed/reconnect states | FRESH PASS |
| Artifact action first; reconnect actions share column; at most one primary | State matrix and existing callback/navigation tests | FRESH PASS |
| Pills have 20pt horizontal padding and minimum 48pt height | Primary/secondary primitive press-state assertions | FRESH PASS |
| Web parity with original desktop layout retained | Column gap 12px, local horizontal padding 20px and minimum height 48px, existing 24px top separation and full pane width; stalled Queue secondary | FRESH PASS, including 4/4 synthetic CSS widths |
| Preserve button visibility and actions, admissions/retries/cancellation/navigation | Existing mobile/web suites plus reconnect/stalled handler regressions | FRESH PASS |
| Required gates, docs and local commits | Exact final gate ledger below; implementation and documentation checkpoints | FRESH PASS |

No API, database, migration, dependency, renderer or motion change. No new ADR
is requested or necessary. Shared mobile pill padding also affects other pill
call sites as explicitly permitted; non-pill styles are unchanged.

## Verification

Logs, exit files and local guard scripts are ignored under
`tmp/overnight/GB1.*` and `GB1-*`; none are committed. Tests use repository-local
TEMP/TMP, disabled live-test flags and outbound HTTP/fetch/socket guards.
Builds use offline/no-telemetry flags. No environment file is edited.

| Exact command | Result | Log stem under tmp/overnight/ |
| --- | --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached; final rerun | GB1.typecheck-final |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings | GB1.lint-final |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 590/590 tests, 56 files (existing emitted copies included) | GB1.shared |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS, 2433 passed / 3 intentional live skips, 212 files | GB1.api |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1521/1521 tests, 158 files; final rerun | GB1.mobile-final |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 364/364 tests, 55 files | GB1.web |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 36/36 static pages | GB1.api-build |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 20/20 static pages | GB1.web-build |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1 Android bundle / 35 assets, local export only | GB1.android |
| `git diff --check` | FRESH PASS, 0 whitespace errors; staged and baseline-to-HEAD hygiene also pass | GB1.diff-check |
| `npm run build -- --force --env-mode=loose` (additional AUTOPILOT gate) | FRESH PASS, 8/8 tasks, 0 cached; API/web and Android/iOS/web exports | GB1.root-build |

All requested workspaces have test scripts. API uses two workers, as in LG1,
to limit concurrent local database-test memory; no test/filter is removed.
Focused final checks: mobile 36/36 in 2 files, web 10/10 in 1 file. Additional
workflow/provider-contract suites are NOT APPLICABLE (UI-only changes).

Failed first attempts retained:

- Focused mobile: 35 passed / 1 failed (2 files). The new missing-intent test
  timed out because existing auth/client mocks created new identities on every
  render, restarting the read effect after its error update. Stable hoisted
  mock objects fixed the fixture; final focused run is 36/36 (2 files).
- First forced lint: 7/8 tasks, 0 cached; one new `react/no-children-prop`
  error in the primitive test and six existing warnings. Constructing its
  required-children props consistently with adjacent tests fixed it.
- First CSS geometry probe passed 360px, then failed at 800px because the
  existing desktop density rule reduced button height to 36px. The local
  generation action selector now enforces 48px. Final probe passes 4/4 widths
  (360/800/1024/1440), equal widths, 12px gap, 20px horizontal padding, at
  least 48px height, 24px space above, no horizontal overflow, correct desktop
  columns, and zero network requests. This uses synthetic markup with the
  actual stylesheet, not an authenticated app/device acceptance claim.

No nondeterministic flake or weakened assertion. Existing Vite config-loader
and React renderer deprecation warnings are retained. Some initial exploratory
reads used Windows-unsupported wildcard paths; corrected discovery did not
change files or constitute a gate attempt.

React review under the installed `vercel:react-best-practices` skill: no new
effects/subscriptions/network work, no admission or retry changes, stable test
identities, strict types retained, and existing press/disabled/accessibility
behavior reused. No motion was introduced.

Generated API/web Next declarations were inspected and restored to baseline;
builds/exports/logs/fixtures remain ignored. No tmp path or owner file is staged.
No Supabase, Vercel, Google Cloud, Canvas or Resend call; no SQL/migration
application, Scheduler operation, email, deployment, environment-file edit,
branch switch or push. Live-state limitations did not block this UI repair.
No platform implementation was skipped: web preserves the already-shared
pane width and 24px top spacing rather than imposing the mobile-only 240pt
width on WGP1's desktop layout. The shared pill primitive fix applies to its
other mobile callers, an explicitly permitted consequence requiring the owner
device check. No physical or authenticated browser acceptance is claimed.

## Owner steps remaining

- Rollout: NOT RUN, skipped entirely; owner chooses website/mobile publication.
- Device checks: NOT RUN, skipped entirely; Realme running, stalled, retryable
  failure and done states, including artifact/reconnect button spacing/padding.
- Deployed revisions, production/database/Scheduler state, remote-ref freshness
  and real device/browser behavior: UNVERIFIED (owner to confirm).
