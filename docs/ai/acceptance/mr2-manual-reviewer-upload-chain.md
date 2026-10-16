# MR2 manual reviewer upload chain

Status: **PASS for code STEP 0-3, fresh serial gates, docs and local commits.**

Finite scope: MR2 STEP 0-3, local tests/gates/docs/commits only. Rollout and
Device checks are owner steps. No remote service call, migration application,
Scheduler action, environment-file edit, deployment or push is authorized.

## STEP 0 baseline

Branch `overnight/2026-10-15_feedback`, HEAD `b837453`; MR1.status starts PASS,
with MR1 documentation checkpoint `7db5981`. SA2 is present. Tracked tree clean;
owner-untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.
Local upstream metadata: github/main, ahead 14; no fetch. No nested AGENTS.md.
Read root AGENTS.md, AUTOPILOT.md, current state/roadmap/sprint sections, the
external MR2 roadmap section and ADR-018/029/035. No code contradiction found.

File:line references describe the inspected baseline before MR2 edits:

- `apps/api/app/api/job-uploads/route.ts:80` MIME allowlist;
  `apps/api/src/lib/processing-jobs/upload-intents.ts:16` upload MIME union,
  :33 source kind/extension, :128 size cap;
  `creation.ts:42` extraction-only MIME union;
  `apps/api/app/api/job-uploads/[uploadId]/accept/route.ts:93` PDF byte validation,
  :113 image validation and :128 extraction-only creation. New manual creation has its own binary RPC;
  the older extraction-only DTO remains PDF/image for compatibility.
- `apps/api/src/lib/activity-maker/office-extraction.ts:6` OFFICE_MIME reexport,
  :30 shared bounded extractor; `canvas-stored-file-extraction.ts:33` imports,
  :57 Office kinds, :195 shared extraction. `canvas-file-policy.ts:20` single
  file cap derives from the 10 MiB PDF policy.
- `apps/web/src/features/own-material.tsx:17` LIMITS, :112 upload,
  :145 accept, :260 picker, :299 editable extracted text.
  Mobile `ReviewerGenerateScreen.tsx:564` image extraction, :645 PDF extraction,
  :867 editable extracted text; `reviewerSourceFlow.ts:13` source modes.
- `apps/api/src/lib/processing-jobs/processor.ts:76` job dispatch, :147 extraction,
  :386 reviewer delegation; `ai-reviewer.ts:11` shared engine entry;
  `google-cloud.ts:175` Google orchestration; `operations.ts:241` checkpointed
  extraction planning, :556 extraction completion, :731 deferred Canvas attach,
  :809 AI reviewer step. Server extraction already exists; no new paid service.
- `apps/mobile/src/features/queue/QueueDropdown.tsx:15` shared Queue source;
  `apps/mobile/src/app-shell/AppActivityProvider.tsx:20` provider;
  `apps/web/src/components/queue-button.tsx:13` web Queue source.
  Chained work remains a reviewer job, so existing generation/Open/Retry targets
  apply, with DOCX/PPTX labels and local job-reference parsing added.

Deployed API/website/worker revisions, database rows/applied migrations, Scheduler,
provider outcomes and physical behavior: **UNVERIFIED (owner to confirm)**.
These were not queried and do not block the unattended code scope.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| DOCX/PPTX at Canvas cap; legacy conversion message | shared/API/mobile/web | policy, picker, route and metadata tests | FRESH focused PASS |
| Actual ZIP/expected part validation; renamed file rejected | API | synthetic ZIP and route tests | FRESH focused PASS |
| Shared Office extractor and ordered blocks; MR1 retained | API/engine boundary | real synthetic DOCX/PPTX chain tests and MR1 regressions | FRESH focused PASS |
| One accepted job from upload through saved reviewer | API/database/clients | PostgreSQL admission/attach/completion and client/orchestration tests | FRESH focused PASS |
| Empty Office/photo/PDF stops before generation | API | actual worker empty-Office failure, existing OCR/page failure and orchestration tests | FRESH PASS |
| Quotas, owner denial, lease/cancellation and immutable child Retry | database/API | PGlite real SQL and existing regression suites | FRESH focused PASS |
| Pick immediately; no file/photo editor; paste unchanged | mobile/web | rendered interaction tests and upload retry tests | FRESH focused PASS |
| Fresh serial gates, docs, scoped local commits | repository | commands/counts below | FRESH PASS |

## Verification

All test temporary files use repo-local `tmp/overnight/mr2-temp`. Full API gates
explicitly disable B24_6_LIVE and B24_7_LIVE. Logs remain ignored under
`tmp/overnight/MR2.*.log`; no private fixture or validation output is committed.
Engine code is unchanged: engine suite NOT APPLICABLE; existing API MR1
regressions run in the full API suite. Workflow orchestration is covered by
five mocked local tests and API build compilation. The separate workflow runtime
directory has no test sources; its command uses `--passWithNoTests` and must be
reported as zero tests, not runtime acceptance.

| Command | Evidence | Exact result |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH | 8/8 tasks, zero cached, zero errors; final after ambient restoration |
| npm run lint -- --force | FRESH | 8/8 tasks, zero cached, zero errors, six existing warnings |
| npm run test --workspace @stay-focused/api | FRESH | 2,257 passed / 3 existing live skips, 197 files |
| npm run test --workspace @stay-focused/mobile | FRESH | 1,098 passed, 117 files |
| npm run test --workspace @stay-focused/shared | FRESH | 334 passed, 36 files including emitted copies; before build 329/35 |
| npm run test --workspace @stay-focused/web | FRESH | 176 passed, 29 files |
| npm run provider:contract --workspace @stay-focused/api | FRESH | 20 passed, zero failed |
| npm run test:workflow --workspace @stay-focused/api -- --passWithNoTests | NOT APPLICABLE | Zero runtime test sources, exit 0; not runtime acceptance |
| API suite: manual-reviewer-workflow.test.ts | FRESH | 5/5 mocked orchestration tests |
| npm run build -- --force | FRESH | 8/8 tasks, zero cached; web/Android/iOS exports |
| npm run build --workspace @stay-focused/api | FRESH | 1/1 build, 34/34 pages; 18 steps / 1 workflow compiled |
| npm run build --workspace @stay-focused/web | FRESH | 1/1 build, 19/19 pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH | 1/1 export, one Android bundle / 35 assets |
| git diff --check and git diff --cached --check | FRESH | Zero whitespace errors |
| Engine suite | NOT APPLICABLE | Engine code unchanged; MR1 API regressions remain green |
| Rollout / Device checks | NOT RUN | Skipped entirely under unattended scope |

The final acceptance audit strengthened the seven source-chain tests to use the
actual worker for empty DOCX/PPTX: terminal failure, exact message, no generation
call, no result completion. They passed 7/7; affected repository typecheck/lint
and full API gates were refreshed afterward. No production code changed after
the successful build gates. Generated Next ambient files were restored.

## Failed attempts and repairs

- Initial package-only API typecheck: one upload-intent MIME union error; widened
  the database DTO for the newly supported MIME types.
- Initial package-only mobile typecheck: three errors (Queue label exhaustiveness,
  local job-store kind union and unsupported native accessibility role). Extended
  labels/storage parsing and used accessibilityLiveRegion.
- First forced repository typecheck: 6/8 tasks, zero cached, two mobile test
  fixture errors (required picker lastModified and host-node ElementType).
  Repaired fixture and used a typed predicate to find the mocked host node.
- Second forced repository typecheck: 7/8 tasks, zero cached, one incomplete API
  source-row fixture assertion. Supplied the complete typed fixture.
- Focused SQL/source run: 16 passed / 1 failed; child-retry fixture keys were only
  seven characters. Used valid keys; the subsequent SQL run passed 10/10.
- First workflow test import: one failed suite / zero workflow tests (the parallel
  SQL file passed 10/10). Corrected the relative import; 5/5 workflow tests passed.
- First full mobile gate: 1,096 passed / 2 failed in 117 files. An import
  consolidation during the preceding API run removed the runtime policy helper;
  corrected the combined import. Its focused rerun then had 14 passed / 1 failed
  because the new retry fixture omitted required upload-intent expiresAt.
  Supplied the valid envelope; focused rerun passed 15/15. The subsequent full
  serial mobile gate passed 1,098/1,098 in 117 files.
- Initial green forced lint had eight warnings, including two new duplicate
  import warnings. Consolidated the shared import; the subsequent forced lint
  passed with only the six existing warnings.
- Shell setup attempts found Python unavailable and rejected PowerShell brace
  path expansion; subsequent edits used local Node scripts and explicit paths.
  Neither attempt changed production or environment files.

No nondeterministic flake has been observed.

## Owner steps remaining

Rollout and Device checks were skipped entirely. Owner must apply the new
forward-only migration `20261016000100_manual_reviewer_uploads.sql`, coordinate
API/website/Google-worker and compatible preview OTA publication, and confirm
live revisions/catalog state. Device acceptance: DOCX and PPTX straight from
file to reviewer; photo straight to reviewer; PDF page/blank accounting;
Queue/progress, reconnect after 202, empty-file failure and paste parity.

Vercel CLI is not installed. For the owner's later rollout, installing it with
`npm i -g vercel` is strongly recommended for env pull, deploy and logs. No CLI
installation, rollout or device check was attempted during this run.

## Commits

- 36f19a1 feat(shared): define manual Office upload policy (includes Office Queue/local-reference readers)
- 9e42184 feat(api): chain manual file extraction into reviewer jobs (includes forward-only database contract)
- 15c351d feat(mobile): create reviewers immediately from picked files
- e96c6be feat(web): create reviewers directly from manual uploads

Documentation closure is this checkpoint; its final hash is recorded in
`tmp/overnight/MR2.status` and Git history rather than self-amending this file.
Fresh checks ran on the same code tree captured by these commits. No push.
