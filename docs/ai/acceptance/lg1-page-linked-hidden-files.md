# LG1: hidden Canvas files linked from visible sources

Baseline: `f709843`, branch `overnight/2026-10-15_feedback` retained.
Finite scope: STEP 0-6, local tests/gates, documentation and local commits.
Rollout and Device checks are excluded by the prompt's UNATTENDED rules.
No external service, deployment, remote SQL, migration application, Scheduler,
email, environment-file edit or push is authorized or required for this run.

## STEP 0 and call-site audit

The tracked tree was clean. Only expected untracked owner paths existed:
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`; ignored `tmp/` is local evidence.
Local upstream tracking was `github/main`, ahead 16 / behind 2 at baseline;
remote freshness is **UNVERIFIED (owner to confirm)**. No fetch ran.
Newest handoff sections were UC3, UC2 and UC1; implementation and planning
state take precedence over these historical records. AUTOPILOT.md was read.

The prompt's schema location was imprecise: the implementation schema is in
`packages/db/migrations/202607060003_add_canvas_file_ingestion_foundation.sql`
and `packages/db/src/types.ts`, rather than `supabase/migrations`.
References store owner, connection, course, file, source type, source provider
identity and referenced local row. Current Pages, assignments, announcements,
modules and module items store publication and access/date-lock evidence.
No schema STOP condition applies; no migration is needed or written.

All production TypeScript matches from the requested hidden/eligibility scan:

| Call site | Before LG1 | LG1 result / reference availability |
| --- | --- | --- |
| `packages/canvas/src/types.ts`, `client.ts` | Define/parse `hiddenForUser` | Unchanged metadata transport; no access decision |
| `packages/db/src/types.ts` | File row/insert/update hidden fields | Unchanged schema types |
| `canvas-file-policy.ts` classifier, direct-link classifier, status mapper, hidden predicate | Hidden always unavailable except explicit Page override | Shared effective policy; locks/deletion win; only current, explicitly published and visible references elevate hidden files; size/type/security limits retained |
| `canvas-file-policy.ts:isNewlySupportedOfficeFile` | Ordinary Office metadata upgrade classifier | Unchanged legacy helper; effective classification now runs on access-aware source reads |
| `canvas-file-normalize.ts` payload fields / `mapCanvasFile` | Raw hidden flags set blocked eligibility/status | Effective policy from fresh course reference/source batches; standalone mapping denies without evidence |
| `canvas-sync.ts` inventory write / existing-file mapping | Reclassified inventory could overwrite Page access; existing-file path merely maps flags | Persistence extracted to `canvas-file-inventory.ts`; effective inventory payload plus owner-scoped 200-ID repair batches for stale unavailable/blocked status |
| `canvas-file-ingestion.ts` hiddenPageLink / eligibility/status mapping / metadata update / content validation | Only explicit Page-worker hint could override hidden metadata | Current references loaded once per requested course, fully paginated; shared mapper used on fresh provider metadata; aggregate limit uses effective eligibility; metadata/signature validation unchanged |
| `canvas-reviewer-sources.ts` direct-link candidate / metadata availability | Raw hidden flags denied normal file preparation; separate Page candidate override | Course-batched access evidence attached to source rows for list/prepare/preview/structured snapshot reads; candidate bypass removed; shared policy controls availability |
| `reviewer-source-status.ts:isFileUnavailable` | Hidden flags and stored blocked eligibility denied rebuild | Shared policy plus complete owned reference/source batches for file status; missing rows remain denied |
| `canvas-stored-file-extraction.ts` hidden fields in validation input | Pass-through to byte/type/signature validation | Unchanged; preview/snapshot readers supply effective source state, workers freshly ingest before extraction |
| `experience/canvas-page-attachments.ts` hidden-file branch | Separate hidden Page download override | Shared effective policy and visible published Page check; authenticated byte validation retained; stale existing rows repaired without replacing historical objects |
| `canvas-sync-jobs/finalize.ts:itemStateForRecord` | `locked` or `hiddenForUser` reports health state locked | Explicit prompt exception: unchanged. The staged `record` has provider metadata, no current references/source visibility. This health receipt does not determine material generation eligibility |
| `canvas-module-material.ts` | Classifies raw provider file/assignment attachment policy; blocks `blocked_*` eligibility | Unchanged dormant diagnostic classifier: repository search finds no production caller, only its tests; it does not control material Generate, previews or snapshots |
| `canvas-preparation/backfill.fixture.ts` | Synthetic local nonhidden rows | Test fixture only; not a production decision |
| `canvas-preparation/orchestration.ts` | Enqueues supported/canPrepare sources from complete API inventory | Unchanged: corrected sources enter the same durable registration/200-job guard; no parallel queue or bypass |

Reference reads are course batches, paginated in 200-row pages, bounded at
10,000 per table; failure or saturation fails closed. They retain user,
connection and course predicates. Missing source rows, unknown publication,
unpublished/locked/date-locked sources and deleted/missing files cannot grant
access. Fresh inventory already has source/reference context, so it adds no
reference query per file. Stored access loading only reads relevant source kinds.

## Acceptance matrix

| Requirement | Owning layer / proof | Result |
| --- | --- | --- |
| Hidden / hidden-for-user linked PDFs eligible; no-reference PDF unavailable | Shared policy and normalization tests | FRESH PASS |
| Locks, dates, deletion, security and size remain enforced | Policy and ingestion regressions | FRESH PASS |
| Visible published source required; missing/foreign/unknown sources denied | Policy and paginated reference integration | FRESH PASS |
| Page-only course with two linked PDFs and third hidden unreferenced file | `canvas-page-linked-files.test.ts`, actual API functions with injected Data API/queue boundaries | FRESH PASS |
| Existing unavailable rows repaired, including retained-hash status | Inventory persistence/repair integration | FRESH PASS |
| Missing object downloads on preparation | Ingestion regression with mocked authenticated provider and Storage | FRESH PASS |
| Preparation registers both PDFs through existing guard | Integration invokes real orchestration; admission/dispatch injected; existing guard SQL suite retained | FRESH PASS |
| Later Files inventory promotion retains access with current course references | Repeated inventory integration and normalization regression | FRESH PASS |
| Source list and saved reviewer rebuild status ready after preparation | Integration plus source-status access regressions | FRESH PASS |
| Web/mobile parity | Both Generate clients consume API material preparation and generation capability; no raw Canvas hidden checks | FRESH code inspection; full suites/builds below |
| Physical SOC SCI 103N sync and generation | Owner rollout/device steps explicitly excluded | NOT RUN |

The course fixture is wholly synthetic: Page-only content, two linked hidden
PDFs, one unreferenced hidden PDF. No private Canvas source or production IDs
are copied into fixtures. Worker publication/provider/queue operations are
injected in the integration test; it is not evidence of real PDF OCR or live
generation. Existing full-suite worker, extraction and local PGlite guard
contracts supply their separate local proof.

## Gates and attempts

Final verdict: **PASS, 10/10 requested gates**, plus the AUTOPILOT root build. Logs and per-command exit
files stay ignored under `tmp/overnight/LG1.*`. Tests use repository-local
TEMP/TMP, `B24_6_LIVE=0`, `B24_7_LIVE=0` and a Node outbound HTTP/fetch guard.
Builds use offline/no-telemetry flags; none is a publication command.

Failed first attempts retained: initial focused API typecheck found generic
Supabase table typing plus readonly Json narrowing and a leftover candidate
call; subsequent focused typecheck found one new fixture's null hash argument.
Corrected with typed table reads, proper narrowing, bypass removal and valid
fixture input. First broad focused suite: 2 failed / 105 passed (5 files),
because old query doubles lacked range support/current Page evidence; fixed.
First integration run: 1 failed / 35 passed (4 files), missing version/source
metadata in the new fixture. Second: 1 failed / 58 passed (5 files), expected
`ready` instead of the actual public `ready_current` enum. Both corrected.
Focused final: 89/89 tests, 7 files. Final ingestion/integration review rerun: 25/25 tests, 2 files, after aggregate eligibility was routed through the shared policy. No nondeterministic flake observed.
First forced lint: 6/8 successful tasks before failure; one reserved `module`
binding error and one unused import warning in touched API files. Fixed.
Initial Python utility was unavailable; Node performed the local edit instead.
One long shell file-write was rejected by automatic policy review; the same
local test artifact was safely authored with apply_patch. Atomic patch-context
misses made no partial changes and were corrected. A staged diff check found one extra EOF blank line in the extracted inventory module; removed in the local test commit amendment. Final base-to-HEAD and worktree/staged hygiene checks pass. No prohibited fallback ran.


| Exact command | Result / counts | Log stem |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached (final rerun) | LG1.typecheck-final |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached, 6 existing warnings, 0 errors | LG1.lint-final |
| npm run test --workspace @stay-focused/shared | FRESH PASS, 590/590 tests, 56 files (existing emitted copies included) | LG1.shared |
| npm run test --workspace @stay-focused/api -- --maxWorkers=2 | FRESH PASS, 2433 passed / 3 intentional live skips, 212 files; final committed-tree rerun also passes | LG1.api / LG1.api-final |
| npm run test --workspace @stay-focused/mobile | FRESH PASS, 1511/1511 tests, 158 files | LG1.mobile |
| npm run test --workspace @stay-focused/web | FRESH PASS, 363/363 tests, 55 files | LG1.web |
| npm run build --workspace @stay-focused/api | FRESH PASS, 36/36 static pages | LG1.api-build |
| npm run build --workspace @stay-focused/web | FRESH PASS, 20/20 static pages | LG1.web-build |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS, 1 local Android bundle / 35 assets, no publication | LG1.android |
| git diff --check | FRESH PASS, 0 whitespace errors; staged and baseline-to-HEAD checks also pass | LG1.diff-check |
| npm run build -- --force (additional AUTOPILOT gate) | FRESH PASS, 8/8 tasks, 0 cached; API/web and Android/iOS/web exports | LG1.root-build |

Every workspace has a test script. NOT APPLICABLE: new schema migration,
ADR, dependency installation, UI visual changes and workflow/provider-contract
suites (no workflow/provider implementation change). No device or deployment
claim is inferred from local gates. The API full suite was repeated against
committed code after the final aggregate-policy review; the 25/25 focused run
also covers that review. Vite config-loader and Expo color warnings remain.

Implementation commits (author galaxymaxp <omgraythekid@gmail.com>):

- d318a09 fix(api): centralize access policy for hidden linked Canvas files
- ddcaef1 fix(api): preserve hidden linked file access through sync and generation
- b345138 test(api): cover Page-only hidden file repair and preparation
- The documentation checkpoint's exact hash is recorded in Git and LG1.status
  after committing; no self-referential amendment.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy API and Google worker when
  ready; next course sync performs the repair with no SQL/backfill migration.
- **Device checks - NOT RUN, skipped entirely:** sync SOC SCI 103N on Realme
  and website; confirm Unit 1-3 PDFs appear under Pages, prepare, then generate
  a reviewer. Owner may perform the prompt's read-only SQL check of all 14 rows.
- Production revisions, the reported 14-file state, current reference rows,
  applied database state, Scheduler state and real device behavior remain
  **UNVERIFIED (owner to confirm)**. Repository evidence alone was used here.
- For later owner deployment/log/env tooling, installing the missing Vercel
  CLI with `npm i -g vercel` is strongly recommended. It was not installed or run.
