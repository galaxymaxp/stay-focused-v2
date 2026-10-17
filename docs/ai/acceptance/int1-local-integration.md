# INT1 local integration

Status: IN PROGRESS. Scope and baseline: a967460 + PR #12 8fcdf16 from merge-base ed67445; main ed67445; visual tip f3dd833. Fetch succeeded. Tracked tree was clean; owner's UI/, apps/mobile/.gitignore and supabase/.temp/ are excluded.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Both histories retained, offline auth and silent idempotent admission | mobile/API | unchanged PR #12 regressions | PENDING |
| PR #12 sorts and storage; website parity | mobile/web | component, parser and mirror tests | PENDING |
| What is this? first | shared/mobile/web | constant and rendered-panel tests | PENDING |
| Snapshot/figure/external Ask reachable | mobile/web | component actions and callbacks | PENDING |
| f3dd833 heartbeat and diagnostics | mobile | cherry-pick + regressions | PENDING |
| Fresh gates | root/workspaces | serial typecheck, lint, build, test and diff checks | PENDING |

Owner steps remaining: Rollout and Device checks skipped entirely. All deployed revisions, applied migrations, database rows and Scheduler state are UNVERIFIED (owner to confirm).
