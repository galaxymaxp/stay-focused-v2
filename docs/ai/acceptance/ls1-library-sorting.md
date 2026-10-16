# LS1 Library sorting

Scope: unattended STEP 0-3, tests, fresh serial gates, docs and local commits.
Baseline 720675b; branch overnight/2026-10-15_feedback, ahead of github/main by 30.
Tracked tree clean; owner untracked UI/, apps/mobile/.gitignore, supabase/.temp/ preserved.
RT1.status: PASS; IM1b.status: PASS. No code contradiction found.

## STEP 0 evidence and decisions (baseline 720675b line anchors)

- packages/shared/src/experience.ts:220 LibraryArtifactSummary has createdAt, updatedAt, lastOpenedAt, course, sourceMaterialId and title, but no position.
- apps/mobile/src/features/redesign/LibraryScreen.tsx:179/242 uses groupLibraryByCourse/filterCourseLibrary then arrangeList. libraryPresentation.ts:28/47 groups by updatedAt; listPreferences.ts:79 parses prefs; useListPreferences.ts:16 uses sf.list-preferences.v1.<owner>. useLocalLibrary.ts:53 loads local then server summaries.
- apps/web/src/features/library.tsx:127/223 mirrors grouping/filtering/pins. lib/use-saved-library.ts:9 completes paginated summary loading. lib/list-preferences.ts:24/34 guards browser storage reads/writes.
- apps/api/src/lib/experience/service.ts:228/234/253 always returns lastOpenedAt null; there is no Library open-time write. Mobile services/completedArtifactCache.ts:107 touches a separate eviction timestamp, not Library summary state. Use capped device-local opened timestamps in list preferences on successful detail/practice display.
- packages/db/src/types.ts:1197 canvas_modules.position; :1302 canvas_module_items.position/module_id/content ID/page URL. Existing placement: apps/api/src/lib/canvas-reviewer-sources.ts:3910-3975. No position reaches Library.
- Enrich server summaries in code from existing synced owner/course/connection-matched module data. No migration, table, Canvas call or sync change. Manual/mixed/historical items get null; multiple placements use earliest numeric module/item pair.

## Acceptance matrix

| Requirement | Layer | Proof |
| --- | --- | --- |
| Every order, stable case-insensitive ties | shared | fixtures |
| Pinned first, sort within both partitions | shared/clients | arrangement tests |
| Old/invalid prefs, persistence, capped open history | clients | preference tests |
| Owner-scoped Canvas order, manual null, pagination | API | projection tests |
| Compact accessible controls, no refetch | clients | component tests |
| Fresh gates | all | final results below |

Live deployed revisions, database/applied migrations, Scheduler and physical behavior: UNVERIFIED (owner to confirm). Rollout and Device checks skipped entirely.

## Repaired development attempts

- Python executable unavailable; no files changed by that attempt. Used Node for local edits.
- Initial forced typecheck: 5/8 tasks succeeded before web failed (missing test fixture export and missing parsed fields from a CRLF-sensitive edit). Repair typecheck: 6/8 before mobile failed (old test reset omitted sort/opened). Both fixture issues repaired without weakening validation.
- Mobile focused first: 16 failed / 58 passed, 3 failed / 1 passed files; native renderer needed an inert session-store stub, old preference reset lacked new fields, and grouping fixture retained duplicate personal row. Second: 1 failed / 111 passed, 1 failed / 4 passed files; new assertion expected course code where the existing tile renders the course name. Corrected to actual identity titles. No nondeterministic flake.
- API focused: FRESH 14 passed / 2 files (projection and SQL baseline).

- First serial gate typecheck: 7/8 tasks passed, zero cached; API rejected Supabase generic conditional column inference (3 errors). Kept the fixed table allow-list explicit at the query boundary, matching the existing repository pattern; no validation or type strictness weakened.
- Second serial typecheck: 6/8 tasks completed before API failed with one remaining common-column inference error. Used the existing repository filter(key, eq, value) pattern for the two fixed course-key alternatives.
- First lint gate: 6/8 completed before Next lint rejected a local variable named module (1 error). Renamed it moduleRow; removed the new unused summary imports. Existing web useMemo warning retained.
- A passing lint attempt had 22 warnings (16 new import placement/duplicate warnings, 6 existing). Corrected only new warnings. That runner completed API tests (2,280 passed / 3 existing live skips, 200 files), then was interrupted during mobile tests (no completed mobile result) to repair Windows-shell replacement of the new en dash/checkmark and ensure the browser control stays on one line under global label/select CSS. Final gates below supersede that incomplete attempt.

## Implemented proof

Shared comparators use created time, locale-aware case-insensitive names/codes and stable IDs. Explicit sort runs after stable snapshot grouping and independently within existing pin partitions; filters, local pagination and offline markers remain.
Server projections select only existing synced placement metadata with verified owner/course/connection checks. Complete pagination and a hard ceiling fail safely; earliest valid placements win. SQL fixtures exercise the actual repository page, summary and detail paths, and existing projection/RLS/grant tests remain. No new database schema is required.
Mobile/browser stores preserve old pins/hides/read state and default absent/unknown sorts. Open history is owner-scoped and capped at 300. Successful reviewer, draft and quiz screens record opens; summaries/background catch-up do not. Initial mobile load merges before recording opens and serializes writes. Storage errors retain visit-local choices safely.
Mobile uses the existing Sheet, secondary Action, selected radio semantics and animateNextLayout(reducedMotion). Website uses a native labeled select with a single-line compact form style. Component tests change order in memory without API/generation/refresh calls. Focused mobile: FRESH 114 passed / 6 files; web: FRESH 7 / 2.

No live calls, environment-file edits, remote SQL/migration application, deploys, Scheduler actions, email or pushes. All temporary/test outputs remain under ignored repo-local tmp/ and build outputs. Unrelated owner files remain untouched.
- First complete mobile gate: 2 suites failed to import / 121 passed files; 1,095 tests passed. Two additional reader renderer suites imported native SecureStore through open tracking; added inert session-store adapters there, retaining production code and all assertions. API final suite already passed 2,280 / 3 live skips (200 files) and is unchanged by these test-only repairs.
- First full web gate: 1 failed / 194 passed tests, 1 failed / 33 passed files. The existing exact-mirror check requires its explanatory comment on line 1; restored that position after adding the shared import, without changing or weakening the mirror test. Mobile final: 1,136 / 123 files; shared final: 358 / 41 (includes existing emitted copies).

## Final acceptance and gates

**PASS (local code scope).** Every code acceptance row is PASS with fresh fixture/component/repository/SQL evidence. Tested implementation is now code tip c5f1f6b on overnight/2026-10-15_feedback; documentation-only closure follows. Source changes were stable for each final successful gate; the only later web change restored the mirror comment to line 1. No cached suite results are used.

| Command | Evidence | Exact result |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH | 8/8 tasks, 0 cached, 0 errors |
| npm run lint -- --force | FRESH | 8/8 tasks, 0 cached, 0 errors, 6 existing warnings |
| npm run test --workspace @stay-focused/api | FRESH | 2,280 passed / 3 existing live skips; 200 files |
| npm run test --workspace @stay-focused/mobile | FRESH | 1,136 passed; 123 files |
| npm run test --workspace @stay-focused/shared | FRESH | 358 passed; 41 files including emitted copies |
| npm run test --workspace @stay-focused/web | FRESH | 195 passed; 34 files |
| npm run build --workspace @stay-focused/api | FRESH | 1/1 build; 35/35 pages |
| npm run build --workspace @stay-focused/web | FRESH | 1/1 build; 19/19 pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH | 1/1 export; 1 Android bundle, 35 assets |
| npm run build -- --force | FRESH | 8/8 tasks, 0 cached; includes all-platform Expo export |
| git diff --check; git diff --cached --check | FRESH | exit 0, no whitespace errors |
| Rollout and Device checks | NOT RUN | Explicit unattended exclusion |
| New migration / provider contract / worker rollout | NOT APPLICABLE | No LS1 schema, provider or worker change |

Final successful lint warnings are the same five pre-existing mobile import/first warnings and one pre-existing web useMemo warning. Existing Vite config/renderer deprecation and Expo FORCE_COLOR warnings are non-blocking. All failures and the deliberate interrupted attempt are recorded above; no flake was hidden. All test TEMP/TMP paths used repo-local tmp/overnight/temp; logs are ignored tmp/overnight/LS1.*. Generated Next ambient declaration changes were restored, and no build/test artifact is committed.

Commits: d027f2b (shared), 45c6d19 (API), 451eabb (mobile), c5f1f6b (web). The documentation closure commit is listed in tmp/overnight/LS1.status after creation.

## Owner steps remaining

Rollout and Device checks were skipped entirely. Publish the API and website and a compatible preview update; validate both Library levels, all labels/orders, pins, manual/unpositioned fallback, recently-opened tracking on reviewer/quiz/draft and persistence after restart. Canvas order requires the updated API or refreshed cache containing positions; old summaries remain usable through the unpositioned fallback. No new LS1 native module or migration is needed. Inherited IM1b APK and MR2 migration/worker steps remain owner responsibilities. Confirm deployed revisions, synced Canvas position rows, database/applied migrations, Scheduler and physical behavior: **UNVERIFIED (owner to confirm)**. RB4 was not started.
