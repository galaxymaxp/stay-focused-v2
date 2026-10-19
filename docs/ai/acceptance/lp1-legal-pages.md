# LP1 privacy and terms acceptance

Finite scope: LP1 STEP 0-4, tests, local gates, documentation and scoped local
commits only. Baseline `be9d5dc`, branch `overnight/2026-10-15_feedback`.
Rollout and Device checks are excluded. No later overnight work is authorized.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Dated, structured source and single contact constant | shared | Content suite | FRESH PASS, 3/3 focused; full suite 593/593 |
| Public server-rendered legal pages, no auth/API | web | Provider tests, rendering tests, signed-out Playwright | FRESH PASS, configured-auth bypass, server copy and 8/8 width/theme routes |
| Small bottom links and sign-up notice | both | Source review, browser and renderer assertions | FRESH PASS, 3/3 public footer navigations, native renderer and source placement |
| Offline native routes reachable with/without session | mobile | Root-route inspection, renderer tests, Android export | FRESH PASS, renderer 2/2, mobile 1529/1529 and Android export |
| All local gates, no forbidden operations | repository | Guarded commands, diff and staging review | FRESH PASS, 10/10 prompt gates plus forced root build |

STEP 0: tracked entry tree clean; original untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/` preserved.
Cached upstream `github/main`: 34 ahead / 2 behind, without fetch.
Read full LP1 prompt, root policy, AUTOPILOT, planning headers, newest handoffs
and UC2 acceptance. Actual web routes are under `apps/web/app`, not `src/app`;
the public bypass lives in providers.tsx, outside Shell's signed-in guard.
Mobile legal routes belong at root because both existing route groups redirect
according to session state. These path adaptations do not change the fix.

## Code-grounded inventory

- Accounts/email/password and linked Google/Microsoft identities:
  `apps/web/src/features/auth.tsx`, `apps/web/src/components/providers.tsx`,
  `apps/mobile/src/auth/authService.ts`, `providerAuth.ts` and `AuthProvider.tsx`.
- Canvas token/account/address: `apps/api/app/api/canvas/connection/route.ts`,
  `apps/api/src/lib/canvas-routes.ts`, `canvas-token-encryption.ts`.
  AES-256-GCM, server encryption key, fresh IV and authentication tag; safe
  connection responses omit token fields. Disconnect clears encrypted fields
  via `packages/db/migrations/20260928120000_canvas_credential_lifecycle.sql`.
  `packages/canvas/src/client.ts` implements reading; the token itself may have
  broader Canvas permissions. No claim that the token is inherently read-only.
- Synced courses/modules/pages/files/assignments/announcements/grades/own
  submissions: `apps/api/src/lib/canvas-sync.ts`, `canvas-grade-sync.ts`,
  `canvas-file-ingestion.ts`; database migrations `202607050004`, `202607060001`,
  `202607060003`, `202607080003` under `packages/db/migrations/`.
- Uploads, extracted text, canonical source versions, reviewers, processing
  jobs/events/results: `apps/api/src/lib/processing-jobs/`,
  `packages/db/migrations/20260723084329_reusable_processing_assets.sql`.
  Quizzes/attempts and drafts: `apps/api/src/lib/quiz/`,
  `apps/api/src/lib/experience/`, `20260912100000_activity_maker.sql`,
  `20260912110000_quiz_maker.sql`, `20261013000500_offline_activity_draft_copies.sql`.
- Tasks, study plans/sessions: `apps/api/app/api/study-plan/`,
  `packages/db/migrations/20260827155438_task_study_plan_foundation.sql`.
  Avatars: `apps/api/src/lib/profile-avatars.ts`, `20261018000300_profile_avatars.sql`.
  Device IDs/push tokens/preferences and delivery records:
  `apps/api/src/lib/notifications/repository.ts`, `worker.ts`,
  `20260726230833_hosted_processing_uploads_and_notifications.sql`,
  `20261003025905_canvas_notification_sync.sql`.
- Offline library/images/edits and screen snapshots:
  `apps/mobile/src/services/localLibrary/artifactStore.ts`, `localArtifactDatabase.ts`,
  `pendingDraftSync.ts`, `schema.ts`, `apps/mobile/src/auth/AuthProvider.tsx`.
  Explicit sign-out attempts owner cleanup, with failure handling; local database
  purge itself can swallow errors. Do not promise infallible wiping. Settings
  clears bodies/images via `apps/mobile/src/features/settings/OfflineStorageSettings.tsx`.
  Exported files are outside cleanup. Web session/preferences/snapshots:
  `apps/web/src/components/providers.tsx`, `apps/web/src/lib/screen-snapshots.ts`.
- Supabase authentication/database/private Storage: `packages/db/src/client.ts`,
  processing upload intents and avatar service above. Owner isolation/RLS comes
  from database migrations; no encryption claim for ordinary device copies.
- Vercel website/API/workflows: `apps/web/next.config.ts`, `apps/api/next.config.ts`,
  `apps/api/src/lib/processing-jobs/workflow-start.ts`, `workflow-dispatch.ts`.
  Google Cloud workers/tasks:
  `apps/api/src/lib/processing-jobs/google-cloud.ts`,
  `canvas-sync-jobs/google-dispatch.ts`, `canvas-preparation/dispatch.ts`;
  OCR: `apps/api/src/lib/ocr/create-server-ocr-provider.ts` (Cloud Vision).
- OpenAI material/prompts: `apps/api/src/providers/openai-provider.ts`,
  `packages/engine/src/providers/openai-provider.ts`. No claim about provider
  training, data residence or provider-specific retention periods.
- Wikimedia topic-derived searches and images:
  `apps/api/src/lib/external-visuals/service.ts`, `commons.ts`; queries are built
  from section title/text. Explicitly disclose topic exposure.
- Resend destination and coursework email payload:
  `apps/api/src/lib/transactional-email.ts`, `notifications/canvas-email.ts`.
  Expo push: `notifications/worker.ts` (expo-server-sdk); Expo updates:
  `apps/mobile/src/services/appUpdateStore.ts` and `apps/mobile/app.json`.
  GitHub public APK/releases: `apps/web/src/features/download/DownloadPage.tsx`,
  `packages/shared/src/app-release.ts`, `apps/api/app/api/app/latest-release/route.ts`.
- Sharing is a public, revocable saved snapshot, not a live mirror:
  `apps/api/src/lib/reviewer-shares/public.ts`, `owner.ts`, `snapshot.ts`,
  `20261015050000_public_reviewer_shares.sql`, `20261015050100_revoke_deleted_reviewer_shares.sql`.
- Retention/deletion: no self-service account deletion endpoint found. Account
  deletion hardening migration supports admin deletion, not a user-facing flow.
  Job lifecycle cleanup is configurable and does not imply one account-wide
  deadline: `20260723084329_reusable_processing_assets.sql`,
  `20260723091627_processing_lifecycle_batching.sql`, `20260912100000_activity_maker.sql`.
  Unavailable Canvas sources block rebuild/retry, without automatically erasing
  saved outputs: `apps/api/src/lib/reviewer-source-status.ts`,
  `20261018000100_failed_generation_retry.sql`, ADR-044. No deletion inferred
  from partial sync; no promise that disconnect deletes synced or generated work.

No processor or flow requiring an owner decision was found. Live deployment,
provider configuration/policies, applied migrations and Scheduler state remain
**UNVERIFIED (owner to confirm)**. Source inspection does not verify production.

Not reviewed by a lawyer; owner to review wording before publishing to the Play Store.

## Implementation and parity

Both apps import `PRIVACY_POLICY` and `TERMS_OF_SERVICE` from shared structured
data with `LEGAL_CONTACT_EMAIL`. No markdown parser, dependency, API, schema or
ADR change. Web pages are server components outside `(app)` with metadata and
a 68ch reading column. The public provider bypass extends UC2 without changing
Shell's protected behavior. Both legal routes explicitly pass configured-auth
provider tests, and server rendering does not fetch.

Mobile routes are root siblings of the guarded route groups. The renderer uses
only bundled content, a safe-area scroll screen and existing theme/typography
tokens. Back returns through the stack or falls back to sign-in for a deep link.
The caption shows the public website path without opening an external browser.
Offline renderer tests prohibit fetch and assert all shared sections and copy.
Generated Expo types were refreshed from the app tree with the installed SDK's
official local generator; no cast or type weakening was used.

Both apps have centered caption footer links at the bottom of sign-in, sign-up
and Settings; web also has them on download. Mobile confirmation state retains
the footer. Both sign-up buttons have the requested agreement sentence below.
Targets use 48px/pt minimums. No sidebar links, new motion or navigation glass.
React skill review covers strict props, stable section/text keys, no fetching
or effects in content renderers, native header semantics and web heading order.
Web-only metadata/download and mobile-only native offline screens apply to
their platforms; no required platform feature was skipped.

## Verification

All final results below are FRESH for implementation tip `12e4aa2` (the
unit/type/lint gates ran on the same implementation before scoped commits).
All workspaces have test scripts. API workers were bounded to two; no test
selection was excluded beyond the suite's 3 existing intentional live skips.
No gate result is labelled CACHED. Live/device flows are NOT RUN by the prompt.

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, 0 cached, final retry |
| `npm run lint -- --force` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | PASS, 593/593 tests, 57 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite, bounded workers |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1529/1529 tests, 160 files; final run |
| `npm run test --workspace @stay-focused/web` | PASS, 382/382 tests, 58 files; final retry |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages, including privacy and terms; sequential retry |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 Android bundle exported locally |
| `git diff --check` and `git diff --cached --check` | PASS, 0 whitespace errors; repeated at closure |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; includes local Android/iOS/web exports |
| `node tmp/overnight/LP1-browser.mjs` | PASS, 13/13 scenarios; 8 signed-out legal route/width/theme combinations, 3 footer navigations, 2 no-JavaScript routes; 0 legal API/external requests and 0 page errors |

Browser evidence uses production Next output on 127.0.0.1:3197 with empty
sessions. Both routes return 200 without redirect, contain server-rendered
headings and copy, follow the selected theme and have no horizontal overflow at
1440 or 390. Footer links meet 48px bounds; cross-navigation and public entry
links work. Legal pages make no API or external requests. Download metadata is
intercepted locally (204), never proxied. No-JavaScript checks prove content
exists before hydration. Screenshots inspected; server stopped after use.

## Failed first attempts and limitations

- First focused web run: 7 failed / 9 passed (3 files). Next Link's browser idle-callback implementation needed a Node test mock after adding the real footer. Full web first run similarly exposed the Settings test harness: 2 failed / 380 passed (58 files). Added href-preserving link mocks in both affected test files; no production workaround. Final web 382/382.
- First forced typecheck: 6/8 tasks, 0 cached, exit 2; 3 mobile diagnostics. Expo's ignored generated route types lacked the two new files, and a renderer test compared a typed element directly to a mock string. Used the installed SDK's local route generator and String(node.type); strict typing remains intact. Final typecheck 8/8.
- First lint passed 8/8 with 7 warnings, including one new unused mock prop. Removed it; final lint has only the 6 existing warnings (5 mobile, 1 web).
- An extra web build was mistakenly started while the first build was collecting traces. The overlapping output invalidated the first build (exit 1, ENOENT for _not-found/page.js.nft.json). The extra process was interrupted (exit 1). A sequential web rebuild and the later forced repository build passed. This was a local verification orchestration error, not a hidden passing first attempt.
- Python was unavailable for a draft sprint-prefix helper, so no file was written by that attempt; used Node instead. Exploratory reads of stale src/app, Page, workflow/update and SDK paths were resolved from source search. A few Windows rg wildcard paths were invalid and were corrected. No product assumption was contradicted.
- No nondeterministic flake, weakened assertion, suppressed check or remaining failure. Existing Vite config-loader, react-test-renderer deprecation and Expo color warnings are non-failing.

Node HTTP(S), fetch and socket traffic outside loopback was blocked for gates;
telemetry/live flags were disabled and Expo used offline mode. The forced root
build uses loose env mode to propagate those process-only guards. No environment
file was edited. Generated Next declarations were inspected and restored. Logs,
screenshots, exports and progress/status remain ignored in tmp or build output.
No production, provider, remote database or physical-device proof is claimed.

## Commits and owner steps

- `451b58c feat(shared): add privacy policy and terms content`
- `0aacc1c feat(web): add public privacy and terms pages`
- `12e4aa2 feat(mobile): add offline privacy and terms screens`
- Documentation: `docs: complete LP1 legal pages handoff`; final hash in Git
  and ignored `tmp/overnight/LP1.status`.

Owner must review both policies and confirm or replace LEGAL_CONTACT_EMAIL
(omgraythekid@gmail.com). Rollout and Device checks are NOT RUN, skipped
entirely: owner chooses website/mobile publication and actual signed-out,
signed-in, offline, Back and light/dark checks. Later enter the public privacy
URL in Play Console. Provider configuration, deployed revisions, applied
migrations, Scheduler and remote-ref freshness are UNVERIFIED (owner to confirm).
Not reviewed by a lawyer; owner to review wording before publishing to the Play Store.
