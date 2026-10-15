# SH1 public reviewer links — unattended code scope

**Status: PASS for the local code scope, 2026-10-16.** All STEP 0-5 work,
fresh serial gates and scoped local commits are complete. Rollout and Device
checks are intentionally NOT RUN, as required by the unattended instructions.

Baseline: `2ff66b0`, branch `overnight/2026-10-15_feedback`. SP2 and SP2b
status files both PASS. Tracked tree clean; owner untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/` remain untouched. Scope is SH1 only;
GA1 batch generation remains excluded. No remote services, env edits,
migration application, deployment, Scheduler action or push are authorized.

## STEP 0 evidence

| Requirement | Current implementation / proof |
| --- | --- |
| Exact reviewer read | `apps/api/src/lib/experience/service.ts:289` (projection at `:305`), `repository.ts:85`; ADR-031 `docs/architecture/ADR-031-library-summary-projections.md:1` |
| Experience router/auth | `apps/api/app/api/experience/[...path]/route.ts:17`, `apps/api/src/lib/experience/http.ts:8`, `read-http.ts:35` verifies bearer before service creation |
| Web reviewer | `apps/web/src/features/library.tsx:430` ArtifactScreen; `reviewer/reviewer-reader.tsx:59` (baseline), `quiz-from-reviewer.tsx:42`, `study-assist-panel.tsx:32`, `assist-store.ts:58` (baseline), `section-visual.tsx:45` |
| Web quiz / offline scoring | `apps/web/src/features/quiz.tsx:32`; shared `packages/shared/src/quiz-grading.ts:28` and `:42` are pure local grading |
| Mobile | `apps/mobile/src/features/reviewer/ReviewerReader.tsx:80`, `apps/mobile/src/features/redesign/LibraryScreen.tsx:375` |
| Saved Study Assist | browser `assist-store.ts:60` localStorage; mobile `services/studyAssist.ts:19`, `services/localLibrary/assistCache.ts:13` SQLite, scoped by owner and exact canonical content. Smart Selection sessions are ephemeral, not saved content (`services/studyTools.ts:39`). |
| Wikimedia | `apps/api/src/lib/external-visuals/batch.ts:26` reads `section_external_visuals` by owner/artifact/version; license/credit/URLs are separate from course figures/snapshots |
| Page citations | `apps/api/src/lib/source-page-snapshots.ts:28` resolves canonical section references against structured blocks; sharing will copy only numeric citation labels |
| Existing limiter | `apps/api/src/lib/study-tools.ts:313` owner AI limiter; public reads need a separate bounded IP/token limiter |
| Latest migration | `20261015040000_experience_library_projections.sql`; next free migration `20261015050000_public_reviewer_shares.sql`; next ADR 033 |

SH0 and roadmap SH1 read in full. No code contradiction: local saved assistance
is separable and can be explicitly submitted by the owner when sharing;
grading requires no server write. Live state is UNVERIFIED (owner to confirm).

## Acceptance matrix

| Requirement | Layer | Required proof | Result |
| --- | --- | --- | --- |
| Owner isolation, no anonymous table access | SQL/API | Local SQL and route tests | FRESH PASS |
| Snapshot allow-list, no source images/private metadata | Builder/public API | Adversarial payload tests | FRESH PASS |
| Same link until stop, explicit refresh only | SQL/service | Edit/update/revoke tests | FRESH PASS |
| Public read has zero AI calls/writes | API/web | Spies and component boundary tests | FRESH PASS |
| Anonymous reader/terms/quiz/saved assists/attributed visuals | Web | Component tests/build | FRESH PASS |
| AI links go to sign-in with return; scoring local | Web/shared | Interaction tests | FRESH PASS |
| Share/copy/system sheet and update/stop | Mobile | Component/service tests/export | FRESH PASS |
| Bounded best-effort limiter | API | Burst/capacity/expiry tests | FRESH PASS |
| Fresh serial gates and scoped local commits | All | Exact counts below | FRESH PASS |

## Gates and failed attempts

FRESH focused results: SQL 4/4, SH1 API 19/19 in four files before the final
actual-handler assertion (20 SH1 tests in the final full suite), web
11/11 in three files, mobile 56/56 in five files including existing reader
regressions, shared link/return-path 2/2. TEMP/TMP use repo-local
`tmp/overnight/sh1-temp`; gate logs remain under ignored `tmp/overnight/SH1-*`.

Recorded first attempts, repaired before final gates:

- Draft API typecheck found strict null-flow and emphasis-union inference
  errors; function declaration/narrowing fixed these without weakening types.
- Focused API route test: 15 passed / 1 failed because its fixture attached a
  body to GET. Fixed the request fixture; 16/16 passed, later expanded to 19/19.
- API typecheck caught a test's relative import path even though Vitest resolved
  it; changed to the repository's configured alias in `d087e09`.
- Draft mobile typecheck: 1 error because `Copy` does not accept `selectable`;
  used the existing Copy primitive and retained the explicit Copy link action.
- Draft web typecheck: 5 parser diagnostics from one unterminated JSX href
  template in the signup return link; repaired expression, then passed.
- The first package-lock update pruned unrelated extraneous entries. Restored
  the original entries and retained only the exact clipboard dependency/module
  addition (12 added lines). No unrelated package upgrade is included.

Initial forced root typecheck/lint each passed 8/8 tasks with zero cached;
lint initially included four new test import-order warnings, which were removed.
Final lint retains only the six existing warnings. Typecheck/lint are repeated
after the late-owner mobile guard; no API code changed after its full suite.

FRESH final full suites: API **2,166 passed / 3 existing opt-in skips in 187 files**;
mobile **1,068/1,068 in 112 files**; shared **264/264 in 25 files** (includes
emitted test copies); web **150/150 in 24 files**. The web suite includes all
applicable O2 scoring fixtures and the modified-false-to-true correction case.
The mobile suite includes late-owner-response suppression for clipboard/system
sharing. FRESH final forced typecheck/lint each **8/8 tasks, zero cached**;
lint **0 errors / 6 existing warnings**. No nondeterministic flake observed.
The initial full API pass was 2,165/3 skips; after adding the actual public
HTTP handler no-auth/no-model/no-write assertion, fresh API typecheck/lint
passed 1/1 each and the full suite passed 2,166/3 skips. No runtime API change
followed its successful standalone build. Standalone API and website builds
passed 1/1 each, with 34/34 and 19/19 generated pages respectively. Android
export passed 1/1 (one bundle, 35 assets). Forced repository build passed
8/8 tasks, zero cached; mobile produced 8 web bundles, 1 Android bundle and
1 iOS bundle. All gates executed serially. The root build's internal Turbo
workspace parallelism is unchanged. No remote build/deployment ran.

| Command / scope | Final result | Evidence label |
| --- | --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | FRESH PASS |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings | FRESH PASS |
| `npm run test --workspace @stay-focused/api` | 2,166 passed / 3 existing skips, 187 files | FRESH PASS |
| `npm run test --workspace @stay-focused/mobile` | 1,068 passed, 112 files | FRESH PASS |
| `npm run test --workspace @stay-focused/shared` | 264 passed, 25 files (emitted copies included) | FRESH PASS |
| `npm run test --workspace @stay-focused/web` | 150 passed, 24 files | FRESH PASS |
| `npm run build --workspace @stay-focused/api` | 1/1; 34/34 generated pages | FRESH PASS |
| `npm run build --workspace @stay-focused/web` | 1/1; 19/19 generated pages, public `/s/[token]` included | FRESH PASS |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1; 1 bundle / 35 assets | FRESH PASS |
| `npm run build -- --force` | 8/8 tasks, 0 cached | FRESH PASS |
| `git diff --check` and staged equivalent | 0 whitespace errors | FRESH PASS |
| Rollout, remote SQL/provider/workflow smoke and Device checks | 0 remote/device executions; explicitly excluded | NOT RUN / NOT APPLICABLE to unchanged provider execution |

The final API-specific typecheck/lint also passed 1/1 each after the last
handler test. Next-generated `apps/api/next-env.d.ts` and web counterpart were
inspected and restored to their clean baseline after builds. Only task-owned
source/migration/docs changes are committed; outputs and temp logs are not.
Existing Vitest configuration/renderer and Metro color warnings are retained
in logs; no nondeterministic failure occurred. The installed Python alias was
unavailable during lockfile cleanup; installed Node performed that local edit.

## Implementation commits

| Commit | Scope |
| --- | --- |
| `f991d2b` | Owner-isolated snapshot table, RLS, serialized mutations and local SQL tests |
| `cc1b502` | API allow-list, owner/public endpoints, bounded limiter and shared contracts |
| `d087e09` | Correct configured alias for the route test |
| `aa3cce8` | Public reader/local quiz, owner web controls and safe sign-in returns |
| `025bc1f` | Mobile share/copy/system sheet, explicit update/stop and clipboard dependency |
| `fe88b54` | Soft-delete revocation and regeneration-freeze SQL proof |
| `71b616b` | Exact snapshot/private-field tests, minimal owner link reads and shared return tests |
| `b9700e2` | Late-owner mobile clipboard/system-share suppression |
| `bcf9ed7` | All applicable O2 scoring fixtures and obsolete correction clearing |
| `147db48` | Actual public HTTP handler zero auth/model/write proof |

The final documentation checkpoint reconciles the planning files and handoff;
its resolved hash is recorded with all run commits in `tmp/overnight/SH1.status`.

## Owner steps remaining

Rollout and Device checks are entirely skipped. Apply the two new migrations
(`20261015050000` then `20261015050100`) after their canonical/SP2 prerequisites,
deploy API/website, preview OTA, and run the CIT17 private
window/quiz/sign-in/revocation and physical mobile checks. Deployed revisions,
applied migrations, live rows, Scheduler and physical behavior are UNVERIFIED
(owner to confirm).

Confirm the target preview binary contains the new SDK 57 `expo-clipboard`
module; otherwise build/install a compatible binary before OTA. The website
link origin defaults to the already documented `https://stay-focused-ten.vercel.app`
and can use `EXPO_PUBLIC_WEBSITE_URL`; confirm the actual rollout origin.
Neither a native build nor any environment file edit was performed here.
The Vercel CLI is unavailable; for the later owner rollout, installing it with
`npm i -g vercel` is recommended for deploy/env/log operations. No CLI was run.

Viewer scores remain in memory and are discarded on navigation/reload.
Signing in returns to the link, including OAuth/signup; no clean existing path
can save a score against another owner's quiz. A separately authorized viewer
score/copy model is the follow-up, rather than writing to the original quiz.
Saved Study Assist includes exact matching content on the device creating or
updating the link; cross-device assistance synchronization is not implemented.
