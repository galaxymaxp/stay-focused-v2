# Task and planner sync reliability ? 2026-10-10

Owner request: fix submitted assignments and unselected/finished course work
appearing in Tasks and Today/Schedule on both clients; merge immediately.
Baseline: remote main d9490fb. Implementation uses a fresh checkout; unrelated
existing working trees are untouched. No migrations or direct task/status writes.

## Causes and repairs

- Website rebuilt imported tasks from raw pending task rows, labeled them
  Personal and ignored canonical Canvas submission evidence. It now uses the
  complete owner-scoped activity list, including canonical course, status and
  updated assignment deadline; there is no silent 50-task pagination/count cap.
- Shared activity reads ignored course selection and retained orphaned imports.
  The canonical context reads preferences, validates owner/connection joins,
  excludes ended/completed/deleted/unpublished courses and unavailable assignments.
  Removal is a reversible read filter; personal tasks and saved artifacts remain.
  Archived assignment details remain readable through their owner-scoped identity.
- Planner import and existing pending task eligibility now use the same context.
  Submitted work is not planned even when explicitly requested. Revised titles
  and deadlines use the assignment row rather than the old imported task row.
- Today and Schedule reconcile linked planned blocks with activity completion.
  Removed course work is excluded; completed/submitted work does not become Up Next.
- Tasks/Today/Schedule expose explicit content+grades refresh on web. The previous
  per-course web content-only action uses the same paired refresh. Partial job
  outcomes are not reported as up to date. Mobile admissions are bounded to one
  pair at a time and thrown admission errors remain part of the outcome.
- Visible task views reload persisted data every minute and after local changes.
  Sync remains explicit; this does not activate the separately pending cron/email
  migration or reintroduce automatic batches on app launch/navigation.

## Verification

| Check | Result |
| --- | --- |
| Full API suite | FRESH PASS: 119 files, 1,275 passed, 3 skipped |
| Final focused activity/planner suite | FRESH PASS: 8 files, 162 passed |
| Web unit suite | FRESH PASS: 10 files, 69 passed |
| Mobile sync/provider/screens | FRESH PASS: 3 files, 68 passed; earlier five-file run 76 passed |
| Root typecheck | PASS: 8/8; changed apps fresh, 6 unchanged/corresponding successful tasks cached on final run |
| Root lint | FRESH PASS 8/8, four unchanged mobile import/first warnings; final API/web lint fresh |
| Root production build | FRESH PASS 8/8, zero cached; API, website, Android/iOS/web exports |
| Live database read | FRESH PASS: canonical context over active owners; 4 pending local imports reconciled to submitted; no private titles/IDs logged |
| Scoped browser | FRESH PASS: node scripts/web-browser-check.mjs --task-sync-only; desktop/mobile course+status, create/edit, planning and paired sync; zero paid requests |
| Physical Android acceptance | NOT RUN: ADB has no attached device, CUA has no browser/app surface |

Initial typecheck attempts caught stale deleted web state references, a narrowed
Canvas source comparison, and fixture union typing; all were repaired. Initial
browser attempts hit Windows URL path decoding, a duplicated course-badge text
assertion, and simultaneous Next dev/build output collision. Fixed the path and
assertion and ran dev/build sequentially. The broad browser harness then reached
an unchanged Reviewer key-point toolbar pointer obstruction outside this slice;
that failure is recorded rather than counted as a full browser pass. A scoped
mode verifies this task/schedule/sync story without changing Reviewer behavior.
A local database probe first failed CJS top-level await and then Vercel's masked
sensitive variables; the .mts probe used existing local configuration successfully.
The initial EAS preflight was invoked from the repository root rather than the
mobile workspace; the prescribed workspace command passed and published.

## Rollout

Android preview OTA published: update group 25edeaae-9365-4ffa-acb2-f84123430983,
Android update 01a1238e-5c4f-7222-a546-817f2d975456, runtime 2.0.1. Published from
the verified working tree; product source matches the implementation commit.
No native build or production-channel change.

Main merge, API and website release IDs and smoke results are recorded below
once complete. API/web authenticated UI and fresh live Canvas fetch remain
unverified without a signed-in browser surface. Sync is available for the owner.
