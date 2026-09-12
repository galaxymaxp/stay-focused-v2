# B24.5 verification

## Starting state

- Branch: main.
- HEAD: 2fdaddf09e28dec7919c317469a602b23c6447c8.
- Tracking reference: 34 ahead / 0 behind origin/main, without fetching.
- Initial fsck: FRESH PASS, three dangling blobs, no corruption.
- Pre-existing changes: the two API Workflow runtime fixtures; mobile session
  storage, active-job storage/tests, completed artifact cache/tests, draft
  storage, jobs API tests, outbox storage/tests; root package.json; three current
  status documents; new sessionStore.test.ts, localStoreQueue.ts,
  persistenceConcurrency.test.ts; docs/ai/acceptance/b8 and pre-ui directories.
  No pre-existing staged changes.

Fresh baseline npm.cmd test: API 626, mobile 443, Canvas 73, OCR 27, shared 32,
engine 606. No standalone database test script exists in packages/db; database
schema/RLS contract tests are part of the API suite.

## Final deterministic verification

| Suite | Result | Count / notes |
|---|---|---|
| API | FRESH PASS | 710 tests / 74 files, including 84 new B24.5 checks |
| Mobile | FRESH PASS | 443 tests / 35 files; no mobile implementation changes |
| Canvas | FRESH PASS | 73 tests |
| OCR | FRESH PASS | 27 tests |
| Shared | FRESH PASS | 44 executions / 6 files; 22 distinct source tests, including 6 new fixture checks |
| Engine | FRESH PASS | 606 deterministic eval checks, including architecture/presentation invariants |
| Workflow runtime | FRESH PASS | 1 isolated runtime test |
| Provider contract | FRESH PASS | 18 checks after resolving pre-existing standalone import issue |
| Root typecheck | FRESH PASS | 7/7 tasks, forced, zero cache hits |
| Root lint | FRESH PASS | 7/7 tasks, forced, zero cache hits, zero warnings |
| Root build | FRESH PASS | 7/7 tasks, forced, zero cache hits; API and mobile exports |
| Database contract checks | FRESH PASS | Existing API schema/RLS/ownership checks included above |
| Live Postgres/RLS integration | NOT RUN | No migration or database mutation performed |
| Hosted/mobile physical acceptance | NOT RUN | No deployment or new APK |
| Live AI evals | NOT RUN | Existing deterministic evals run; no model/provider change or paid generation |
| git diff --check | FRESH PASS | Before commit and final audit |
| git fsck --full | FRESH PASS | No corrupt objects; dangling blobs retained |

Commands: npm.cmd run verify:pre-ui (all workspace tests, Workflow runtime,
then forced root typecheck/lint/build) and npm.cmd run provider:contract
--workspace @stay-focused/api. Logs remain local outside the tracked repository.
The existing shared runner discovers both src and emitted dist tests. Its
baseline 32 executions covered 16 distinct cases; final 44 cover 22. An additional
`npm.cmd run test --workspace @stay-focused/shared -- src` confirms 22/22.
The earlier intermediate 38 count occurred before the new fixture tests had
compiled copies. Counts here describe the final run, not that intermediate state.

## Failures and corrections, retained honestly

1. Initial `npm` invocation hit Windows PowerShell's script execution policy.
   Used npm.cmd; did not change the execution policy.
2. Initial API typecheck found a widened timeline literal and generic Supabase
   select typing. Added the precise mapping return type and explicit allow-list
   table union; did not weaken TypeScript or introduce any.
3. First full gate failed engine execution because a value re-export tried to
   resolve a type-only experience module at runtime. Changed the shared barrel
   to `export type *`, then reran the gate successfully.
4. The separately discovered provider:contract script failed with TS2307.
   The starting HEAD already imported its timeout constant through an @/ alias
   unavailable to tsconfig.providers.json. Replaced that single import with its
   equivalent relative path; 18/18 pass. No provider settings or implementation
   behavior changed.
5. Review found that legacy material availability is unavailable for preparable,
   empty and unsupported files too. Readiness now preserves the precise
   capability state; tests use the real legacy availability combinations.
   The complete gate was rerun on this final correction.

## Security evidence

New deterministic tests cover missing JWT across all new read surfaces, protected
generation admission, server-derived identity ignoring supplied userId, and
foreign-owner Today tasks/assignments/sessions/plans, course/material workspace,
activity list/detail, Reviewer/library entry, job state and persisted result.
Repository tests assert explicit user_id predicates and defensive owner filters,
including continuation past a full page.

Generation tests retain source selection, snapshot/generation gates and
idempotency semantics, reject foreign material lookup and changed material
identity, and check identity again after concurrent admission. Library tests
exclude cancelled, failed, running, foreign, deleted and unavailable outputs;
preserve generation/artifact aliases after automatic saved-Reviewer deduplication;
and prove open reads existing evidence without source/generation work.

Response assertions exclude sourceCore, plannedSectionId, prompts, private job
metadata, provider configuration, raw diagnostic strings, encrypted-token fields,
unsafe resource URLs and raw error details. The original database policies and
owner-scoped foreign keys remain unchanged. These are deterministic code and
schema-contract tests, not a claim of newly exercised hosted RLS.

## Preservation and commit scope

Before reconciling status documents, SHA-256 comparison found zero differences
across the captured pre-existing files. The new B24.5 section is inserted into
each of docs/current-state.md, docs/roadmap.md and docs/ai/current_sprint.md;
their pre-existing content remains byte-identical. Only the B24.5 section is
staged for those files, retaining the user's existing uncommitted pre-UI section.
All other pre-existing dirty files remain unchanged. Next's generated
next-env.d.ts build drift is restored to its initially clean content and excluded.

Commit only B24.5 shared contracts/fixtures/tests, experience API/services/tests,
acceptance documents/status additions and the one-line provider test import fix.
No reset, clean, stash, migration, deployment or push.

## Verdict

PARTIAL — core contracts are aligned but a product capability still requires backend implementation

Next: B24.6 — Activity Maker generation and owner-scoped draft persistence,
followed by a separate Quiz generation/questions/attempt/results slice. Reconcile
the completed B24 specification before B25 design-system/app-shell work; the
existing supported experience can use these contracts with missing features disabled.
