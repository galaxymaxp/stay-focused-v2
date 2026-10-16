# SA2 Ask about an image

Status: **PASS for code STEP 0-4, fresh serial gates, docs and local commits.**

Finite unattended scope: STEP 0-4, local tests/gates/docs/commits only. Rollout
and Device checks are owner steps. No remote calls, SQL, deployment, Scheduler,
environment-file edits or pushes are authorized.

## STEP 0 baseline

Branch `overnight/2026-10-15_feedback`, HEAD `e98e855`; SA1.status starts PASS.
Tracked tree clean; untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
are preserved. Local upstream metadata is github/main, ahead 9 (no fetch).

File:line references below describe the inspected baseline before SA2 edits:

- `packages/shared/src/study-tools.ts:8`: v2 prompt; :10 fixed text actions;
  :42 static Ask suggestions; :44 limits (question 1200, follow-ups 2, body
  48 KiB); :58 grounding labels; :149 session cache key.
  `packages/shared/src/study-format.ts:52` supplies SA1 organized instructions.
- `apps/api/src/lib/study-tools.ts:13`: gpt-5.4-2026-03-05 default;
  :32 strict parsing, :115 bounded context, :238 organized prompt,
  :258 generation/error boundary, :315 instance burst guard (20/minute).
  `apps/api/app/api/experience/study-tools/route.ts:15` uses authenticated
  experienceRoute, owner library/canonical reads and the same provider.
  There is **no durable quota or cost ledger on the existing Study Tools path**;
  SA2 preserves its admission/context/token/error controls, adding image bounds.
- `apps/api/src/providers/openai-provider.ts:51` already types Responses
  input_image; :145 generateWithImage(s), :173 inline low-detail image input.
  No provider dependency is needed.
- `apps/api/src/lib/source-page-snapshots.ts:49` verifies artifact/version/source
  owners, canonical section citations, accepted original availability, owner and
  source-version/page row and private source-page-snapshots storage.
  `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx:10` displays it;
  :126 ZoomablePage handles zoom. Ready rows have UUIDs not yet exposed in DTOs.
- `apps/api/src/lib/source-figures/sections.ts:51` verifies accepted immutable
  original/complete receipt; :90 links only cited figures; :111 signs owner
  source-figures storage objects. `store.ts:38` stores owner-prefixed bytes.
  Mobile `SourceFigures.tsx:37` displays inline and zoom figures by UUID.
- `apps/api/src/lib/external-visuals/service.ts:47` owner-checks reviewer and
  version/section composite key; :21 maps stored validated URL/attribution.
  `commons.ts:62` restricts images to HTTPS upload.wikimedia.org;
  `match.ts:18` already fetches raster bytes server-side (3 MiB cap).
  `batch.ts:30` reads owner/version visuals. There is no scalar image ID;
  an opaque digest of the stored composite key and image revision can identify
  the exact current image without a migration or client URL trust.
  Mobile `ExternalVisual.tsx:11` displays inline and ZoomablePage.
- Web `apps/web/src/features/reviewer/section-visual.tsx:45` handles all three
  surfaces and dialog zoom; `reviewer-reader.tsx:405` supplies section identity.
  Mobile `ReviewerReader.tsx:390` supplies canonical sections and source visuals.
- Mobile `SmartSelectionPanel.tsx:33`, `StudyAssistSheet.tsx:27`; web
  `smart-selection.tsx:97`, `study-assist-panel.tsx:33` own Ask, formatting,
  session cache and SA1 press/completion reveal. Reuse these panels.
- `apps/web/src/features/shared-reviewer.tsx:101` renders attributed public
  visuals; :124 routes AI controls through reviewerShareSignIn; no model calls.

Live revisions, database rows/migrations, Scheduler, provider output and physical
behavior: **UNVERIFIED (owner to confirm)**. No live check was attempted.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Reference-only image Ask, limits, chips, image cache identity | shared/API | strict parser and cache tests | FRESH PASS |
| Owner/current-section resolution, indistinguishable 404 | API | mocked storage/canonical tests | FRESH PASS |
| Server bytes + section context, bounded raster input | API/provider | mocked provider and cap tests | FRESH PASS |
| Same admission, errors, organized format and grounding | API | existing + image tests | FRESH PASS |
| All three inline/zoom surfaces open Ask with thumbnail | mobile/web | surface/panel tests and builds | FRESH PASS |
| Offline disabled; shared sign-in return, zero model calls | clients/web | regression tests | FRESH PASS |
| Fresh serial gates, docs and local atomic commits | repo | recorded commands/counts | FRESH PASS |

## Verification

All commands ran locally and serially with TEMP/TMP under ignored tmp/overnight/temp. Live API test flags B24_6_LIVE and B24_7_LIVE were explicitly disabled. No production/service call was used. Logs are ignored under tmp/overnight/SA2.*.log; no output or fixture artifacts are committed.

| Command | Evidence | Exact result |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH | 8/8 tasks, 0 cached, 0 errors (final after restored ambient files) |
| npm run lint -- --force | FRESH | 8/8 tasks, 0 cached, 0 errors, 6 existing warnings |
| npm run test --workspace @stay-focused/api | FRESH | 2,226 passed, 3 existing live skips, 192 files |
| npm run test --workspace @stay-focused/mobile | FRESH | 1,086 passed, 115 files |
| npm run test --workspace @stay-focused/shared | FRESH | 324 passed, 34 files including emitted copies |
| npm run test --workspace @stay-focused/web | FRESH | 168 passed, 28 files |
| npm run provider:contract --workspace @stay-focused/api | FRESH | 20 passed, 0 failed |
| npm run build -- --force | FRESH | 8/8 tasks, 0 cached |
| npm run build --workspace @stay-focused/api | FRESH | 1/1, 34/34 pages |
| npm run build --workspace @stay-focused/web | FRESH | 1/1, 19/19 pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH | 1/1, one bundle, 35 assets |
| git diff --check and git diff --cached --check | FRESH | 0 whitespace errors |
| Engine tests / workflow runtime suite | NOT APPLICABLE | engine/workflow code unchanged |
| Rollout / Device checks | NOT RUN | skipped entirely by unattended rules |

Shared initially passed 322 tests in 33 files; the forced build emitted the new test copy, so it was rerun at 324/34. API was rerun after the final image-specific prompt wording; counts stayed 2,226 passed/3 skipped. Forced typecheck/lint were repeated after builds restored their generated Next ambient files. No source change followed the final gates.

Failed first attempts, preserved rather than hidden:

- Initial forced typecheck: 6/8 successful, 0 cached; three mobile errors from a missing image field on reader state. Corrected the declaration; subsequent forced runs pass 8/8.
- Focused API: 169 passed/1 failed in 9 files (170 total); an old exact snapshot DTO assertion omitted its new id. Updated it; 170/170 passed before the additional streaming-cap test.
- Focused mobile: 52 passed/2 failed in 4 files; old offline assertions required zero buttons. Updated them to verify disabled Ask and hidden private viewer/images. Added surface tests; 57/57 pass.
- Focused web: 35 passed/1 failed in 2 files; a new test attempted JSON serialization of React element children. Changed the selector to inspect child text directly. With the three image-surface tests, 39/39 pass.
- First full API: 2,225 passed/1 failed/3 skipped in 192 files; the pre-render snapshot exact DTO assertion also omitted its id. Corrected it; both subsequent full runs passed.
- Python was unavailable before an editing command wrote anything; Node performed the edits. No nondeterministic flake observed. Existing Vite config/deprecation and React test-renderer warnings are not assertion failures.

## Acceptance coverage and limits

New server tests verify reference-only validation, question/follow-up bounds, indistinguishable foreign/unknown/current-section denials, owner-bound storage downloads, signatures/cap, Commons identity/revision/allow-list and attribution, actual typed Responses image+text input, shared rate admission and no model call after rejection. Streaming cap is enforced without trusting Content-Length. All three mobile/web inline and zoom controls are tested; Ask panel tests cover chip order, thumbnail, typed questions, two follow-ups and repeat-cache reuse. The shared figure links to sign-in with exact return and zero calls. SA1 reveal/parser regression tests remain green.

The baseline has no durable Study Tools quota or usage/cost ledger. SA2 uses its exact existing 20/minute warm-instance guard, model selection, token budgets and safe errors; no new storage write is added. Snapshot/figure downloads use server-only service credentials after explicit owner/current-source/section checks, since the existing private bucket/column grants deliberately deny client access. See packages/db/migrations/20261013000300_source_page_snapshots.sql:30 and :55, and 20261014000400_source_figures.sql:26. No grant or applied migration changed.

Code commits: 3a03e34 shared; 1e46ee3 API; 99ba4f7 mobile; c886fec web. Documentation closure is this checkpoint; its final hash is in tmp/overnight/SA2.status and Git history, without self-amending. Original untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. Generated Next ambient files were restored; no tmp/generated/private material is staged.

## Owner steps remaining

Rollout and Device checks are skipped entirely. Coordinate API/website and compatible preview OTA publication for v3. Check page snapshots, figures and Wikimedia visuals with inline and zoom Ask controls; What is this?, What does it mean?, Explain the parts and Why is it in this lesson?; typed/follow-up/cache behavior; organization, grounding, autoscroll, manual scrolling and Reduce Motion; offline disabled controls; and shared-link sign-in return with zero viewer model calls. No new SA2 migration, worker deployment or native module is needed. Prior rollout prerequisites remain separate owner work.

Production revisions, database rows/applied migrations, Scheduler, actual provider interpretation and physical behavior are **UNVERIFIED (owner to confirm)**. No remote calls, deployment, Scheduler change, SQL/migration application, email, environment-file edit, push or deletion outside the repo occurred. No later roadmap item was started.
