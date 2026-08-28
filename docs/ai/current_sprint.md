# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Completed objective

Runtime-accept R6 backend Gap B against linked Supabase so repeated plan
application replaces active sessions without losing terminal history.

## Baseline

Hosted acceptance started from clean `792205d27f9a89f06084e889071734c55f4a841d`
on `main`, 45 commits ahead and 0 behind `origin/main`.

## Completed scope

- Reviewed the forward migration's lifecycle schema, validation order,
  owner-scoped advisory lock, range replacement, overlap rejection,
  transaction behavior, function grants/security, and retained RLS.
- Confirmed linked history through the R5 foundation, dry-ran exactly
  `20260828173643_replace_planned_study_sessions_on_replan.sql`, applied it, and
  verified final local/remote history alignment.
- Inspected the deployed catalog rather than relying on migration metadata:
  status/default/check, partial index, function definition markers, safe search
  path, service-role-only execute privilege, RLS, and owner policies all match.
- Reused and extended the ignored R5 live helper with dedicated two-user
  fixtures. First apply/reapply, duplicate absence, outside-range preservation,
  completed/skipped preservation, owner-scoped status PATCH persistence,
  overlap atomicity, cross-owner denial, and two concurrent RPC applies passed.
- Verified the Gap A live embedded task fields, independently completed task
  status, nullable `task` contract key, and full PATCH response shape.
- Deleted both acceptance users and all dependent fixtures; R5 table counts
  returned from 0/0/0 to 0/0/0.

## Verification

- Hosted Gap B runtime acceptance: PASS.
- Targeted Gap A/Gap B API/database/session tests: 27/27.
- Shared: 32/32; mobile: 216/216; reviewer: 290/290.
- Forced root typecheck and lint: 7/7 packages, zero cached tasks; lint has only
  the four known mobile import-order warnings.
- DB build: PASS. API production build: PASS.
- Full API: 574/575. The sole failure matches the documented Windows
  CRLF-sensitive Canvas SQL substring baseline; all planning tests pass.
- Performance advisors report only the four known legacy `reviewers` RLS
  init-plan warnings; no Gap B performance warning was introduced.
- Security advisors report only older function/Auth warnings and none for the
  Gap B apply function, lifecycle schema, index, grants, or RLS policies.
- First attempts recorded: the live helper initially received HTTP 401 because
  the local API process lacked the established `SUPABASE_URL` alias; cleanup
  passed, and a process-only alias made the full rerun pass. The first security
  advisor call hit a temporary-role authentication error; one retry succeeded.

## Result

PASS: Gap B is applied and hosted runtime accepted without unrelated database
changes, duplicate active schedules, terminal-history loss, owner-isolation
regression, or fixture residue.

## Next action

Continue R6 mobile Tasks and Study Schedule integration against the accepted
Gap A/Gap B backend contracts.
