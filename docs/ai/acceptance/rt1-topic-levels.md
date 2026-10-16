# RT1 topic levels and Expound

Scope: unattended STEP 0-4, serial local gates, documentation and atomic local
commits on overnight/2026-10-15_feedback. Rollout and Device checks are owner
steps. No later LS1/RB4 work is authorized by this slice.

Baseline: 50105e1; SA1, IM1b and MR2 status PASS. No RT1 progress or tracked
changes existed on resume. Owner untracked UI/, apps/mobile/.gitignore and
supabase/.temp/ are preserved. No code contradiction found.

Acceptance matrix (implementation evidence and final gate counts follow):

| Requirement | Layer | Proof |
| --- | --- | --- |
| Original has no action; deterministic section identity | shared | Contract/session tests |
| Owner-only reads before cache; no canonical mutation | API | Authenticated route tests |
| Three actions, same-action dedup/cache, bounded context and admission | API | Generation and route tests |
| Per-topic control, body replacement, collapsible Expound | mobile/web | Component tests |
| Persisted cache, offline Original/cached actions, retry/race protection | clients | Cache and component tests |
| Shared sign-in routing, zero model calls, unchanged snapshot | web | Shared reader tests |
| SA1 formatted answers and reveal/manual-scroll/Reduce Motion | clients | Component and existing SA1 tests |

## STEP 0 code anchors

Shared: study-tools.ts:8/10 (version/actions), study-assist.ts:4/5 (version/types),
study-format.ts (parser). API: app/api/experience/study-assist/route.ts and
study-tools/route.ts; src/lib/study-assist.ts (exact block provenance),
study-tools.ts:328 (warm admission, no durable quota), study-tools.ts:160
(grounding). Mobile: ReviewerReader.tsx:388 (sections), StudyAssistSheet.tsx,
assistStore.ts, studyAnswerScroll.tsx. Web: reviewer-reader.tsx:397 (sections),
study-assist-panel.tsx, assist-store.ts; shared-reviewer.tsx:86 (shared sections).
Snapshot: apps/api/src/lib/reviewer-shares/snapshot.ts:122 (block assists only).
Design decision: ADR-039.

Live deployment, database/applied migrations, Scheduler and provider state:
UNVERIFIED (owner to confirm). No live checks performed under unattended rules.

## Implemented proof

Contract/session tests cover all three actions, Original's null action, every
body field in section identity, persistent offline reuse, owner/content/version
isolation, failed generation retry and strict output validation. API tests cover
bearer denial, owner reads before cache hits, missing/foreign sections, exact
section-only context, no canonical mutation, all three model/cache paths, input
and output caps, safe size-only logs and shared 20/minute admission. Warm cache
TTL and exact-content collision defenses are tested independently.

Mobile/web component tests cover controls, body replacement, instant Original,
cache-only switches, formatted/collapsible Expound, offline disabled uncached
controls and cached hydration, late and out-of-order completions, exact-content
reset and safe Retry. SQLite tests execute the real production SQL for owner
isolation, store recreation, exact-content matches, corrupt entries, deletion
and sign-out purge. Browser cache tests execute the real assist-store adapter
and ensure topic results never enter SH1's existing block-only export. Shared
reader tests verify Original/Simplify/Explain simply/Expound sign-in links and
zero network/model calls. Existing SA1 reveal/parser/regression suites pass.
Canonical search restores Original when its query changes; mobile block anchors
are measured against the reader root after adding the topic wrapper. SA1 reveal
has one controller per reader, manual-scroll cancellation and Reduce Motion;
mobile includes the reader root offset when bringing answers into view.

## Fresh local verification

Tested implementation: ba81163 (with earlier 959424e, d0db258, dc4f381,
06b9385 and f1b09f1). All commands serial; test TEMP/TMP points to the repo-local
tmp/overnight/rt1-temp. Existing live-provider tests explicitly disabled through
process flags B24_6_LIVE=0 and B24_7_LIVE=0; no environment file changed.

| Command | Result | Evidence |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached | tmp/overnight/RT1.typecheck.log |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings | tmp/overnight/RT1.lint.log |
| npm run test --workspace @stay-focused/api | FRESH PASS, 2,268 passed / 3 existing live skips, 199 files | tmp/overnight/RT1.api.test.log |
| npm run test --workspace @stay-focused/mobile | FRESH PASS, 1,129 passed, 122 files | tmp/overnight/RT1.mobile.test.log |
| npm run test --workspace @stay-focused/shared | FRESH PASS, 345 passed, 39 files including existing emitted copies | tmp/overnight/RT1.shared.test.log |
| npm run test --workspace @stay-focused/web | FRESH PASS, 188 passed, 32 files | tmp/overnight/RT1.web.test.log |

Build results and final hygiene are recorded at closure below. Provider adapter
contract and workflow runtime checks: NOT APPLICABLE; neither provider nor
workflow execution code changed. No live provider acceptance is claimed.

## Failed first attempts and repairs

- Python file-generation command could not start because Python is unavailable;
  used Node and apply_patch. No files were written by the failed command.
- Preliminary integration typecheck: 4 successful / 6 tasks, web JSX parse errors
  from line-ending-sensitive insertion leaving missing closing tags. Normalize
  owned reader text and close the wrappers. Next forced typecheck passed 8/8.
- First new API focused run: 1 failed suite / 1 passed suite, 7 tests passed;
  fixture selection was initialized before the reviewer. Move it below the
  reviewer. Focused rerun: 11/11 tests, 2/2 files.
- First gate after new tests: 3 successful / 5 tasks, shared test attempted to
  mutate readonly keyPoints. Use immutable fixture copies (also in client
  content-change tests). Next forced typecheck passed 8/8. After the final
  canonical-search integration adjustment, forced typecheck/lint passed again.
- No nondeterministic flake. Existing Vite config-loader warning remains. Lint's
  six warnings are the existing mobile test import-order warnings (five) and
  website Library unused useMemo (one), with no new warnings.

## Owner steps remaining

Rollout and Device checks were skipped entirely. Publish the API/website and a
compatible preview update, then check one topic on realme: Simplify, Explain
simply, instant Original, organized Expound/collapse, instant cache switching,
offline cached/disabled uncached behavior, manual-scroll/Reduce Motion and
canonical search. Check shared controls return through sign-in with no AI call.
RT1 adds no native module, dependency or migration; IM1b's new preview APK and
MR2's migration/worker rollout remain the owner's separate pending rollout.
Live revisions, actual provider output, database/applied migrations, Scheduler
and physical behavior are UNVERIFIED (owner to confirm). No deployment, remote
service call, migration application, Scheduler action, email, environment-file
change or push occurred. The finite RT1 run does not start LS1 or RB4.

## Closure: PASS for the unattended local code scope

All acceptance rows above pass under local mocked/SQLite tests; actual provider,
production and physical acceptance is UNVERIFIED, not claimed by this verdict.
FRESH standalone API build 1/1 (35/35 static pages), web build 1/1 (19/19),
Android export 1/1 (one bundle / 35 assets). FRESH forced root build 8/8,
0 cached. Logs: tmp/overnight/RT1.api.build.log, RT1.web.build.log,
RT1.android.build.log and RT1.root.build.log. FRESH git diff --check and
staged diff hygiene pass at the final docs checkpoint. The two generated-only
Next ambient-file changes were reviewed and restored; no generated artifacts,
private fixtures, credentials or tmp files are committed. Owner untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ remain untouched. Root/current-state,
roadmap, sprint, external RT1 roadmap and ADR-039 are reconciled. Implementation
commits follow; the containing docs closure commit is recorded in Git and
in tmp/overnight/RT1.status after commit.

- 959424e feat(shared): define section topic levels and cached assistance
- d0db258 feat(api): generate owner-scoped cached topic explanations
- dc4f381 test(shared): verify topic cache and Original contracts
- 06b9385 test(api): verify topic isolation caching and admission
- f1b09f1 feat(mobile): add cached topic levels and collapsible Expound
- ba81163 feat(web): add topic levels Expound and shared sign-in controls

Exact final build/hygiene commands:

- npm run build --workspace @stay-focused/api: FRESH PASS, 1/1.
- npm run build --workspace @stay-focused/web: FRESH PASS, 1/1.
- npm run build --workspace @stay-focused/mobile -- --platform android: FRESH PASS, 1/1.
- npm run build -- --force: FRESH PASS, 8/8, 0 cached.
- git diff --check and git diff --cached --check: FRESH PASS, 0 whitespace errors.

The local documentation helper initially misread PowerShell's UTF-16 gate logs
as UTF-8 and stopped before writing docs. Adding encoding detection let it
verify the existing green results; no gate rerun or product change was needed.
