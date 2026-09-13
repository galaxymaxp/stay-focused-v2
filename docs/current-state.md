# Current State

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](ai/acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](ai/acceptance/b25/ui-redesign-foundation.md).


## B24.7 Quiz backend (2026-09-13)

**PASS — Quiz backend is ready and core backend capability is complete for the UI redesign.**
Owned prepared material and saved Reviewer source relationships now feed durable,
source-grounded quizzes with server-only answer keys, persisted attempts,
deterministic exact-set scoring, weak-area navigation and Library reopen.
Reviewer, Activity Maker and Quiz capabilities are available in the new code.
Quiz uses the existing provider adapter with its own pinned GPT-5.4 model;
Reviewer and Activity model defaults and behavior are unchanged.

Fresh verification: API 906 passed plus three opt-in live tests skipped; mobile
443, Canvas 73, OCR 27, shared 44 and engine 606. Forced root typecheck/lint/build
passed 7/7 each with zero cached tasks and no lint warnings; Workflow runtime 1
and provider contract 18 passed. Both five-question live fixtures passed final
whole-set verification, local SQL attempts/scoring and Library reopen after
three rejected questions were repaired. Earlier academic failures are documented;
the limited sample is not a production reliability benchmark.

Pending rollout: apply Activity migration `20260912100000_activity_maker.sql`
then Quiz migration `20260912110000_quiz_maker.sql`, deploy API and smoke test.
No hosted migration, deployment, UI redesign or push occurred in B24.7.
This entry supersedes earlier Quiz-missing statements. Acceptance evidence is
under `docs/ai/acceptance/b24-7/`, including quality limits and failure history.

Next: B24.8 — Backend rollout readiness, then B25 — Apple-inspired 2026 design
system + mobile app shell.

## B24.6 Activity Maker backend (2026-09-12)

**PASS — V1-informed Activity Maker backend is ready for the redesigned UI.**
The verified GitHub V1 audit informed owned Canvas assignment/resource assembly,
DOCX/PPTX structural ingestion, TaskSpecification, source-grounded structured
generation, transactional editable drafts and Library/Activity Detail integration.
Activity Maker is available in the new code; Quiz remains unavailable. No UI,
Reviewer-engine rewrite, planner replacement or Canvas submission behavior added.

Fresh verification: API 768 passed plus one opt-in live test skipped; mobile 443,
Canvas 73, OCR 27, shared 44 and engine 606. Root typecheck/lint/build passed 7/7
with zero cache hits and no lint warnings. Provider contract 18 and existing
Workflow runtime 1 passed. Two live provider fixtures passed instruction/grounding
checks and local Postgres persistence/reopen/edit/regeneration validation.
Database policies, retention and account deletion passed deterministic SQL tests.

Deployment prerequisite: apply `20260912100000_activity_maker.sql` before the API
that reads Activity drafts. Hosted migration/RLS/deployed Activity execution were
not run. Legacy DOC/PPT, advanced Office layout/media and output export remain
outside this slice. Earlier phase entries below are historical; B24.6 supersedes
their Activity Maker/DOCX/PPTX missing-capability statements.

Next: B24.7 — Quiz generation, attempts, results, weak-area mapping and Library
persistence. Acceptance evidence is under `docs/ai/acceptance/b24-6/`.


## B24.5 backend experience contracts (2026-09-12)

**PARTIAL — core contracts are aligned but a product capability still requires
backend implementation.** Shared student DTOs and authenticated API experience
services now compose Today, Learn, Activities and Library. Reviewer admission
reuses source preparation, snapshot/freshness gates and durable jobs; Library
opens persisted output and deduplicates the existing automatic save path.
Capabilities explicitly disable missing Quiz, Activity Maker and calendar
implementations. No UI redesign, migration, model/provider selection change or
planner algorithm change. The standalone provider contract's pre-existing import
resolution issue is repaired with an equivalent relative import.

Fresh verification: API 710, mobile 443, Canvas 73, OCR 27, shared 44 (22 distinct source tests), engine 606,
Workflow runtime 1 and provider contract 18; forced typecheck/lint/build each pass
7/7 with zero cache hits and zero lint warnings. Hosted RLS/new APK acceptance
NOT RUN. Pre-existing persistence edits are preserved and excluded from this commit.

Next: B24.6 Activity Maker generation and owner-scoped draft persistence, then a
separate Quiz generation/attempt/results slice. Reconcile the completed B24
specification (not found in this checkout) before B25 app-shell implementation.
See [B24.5 contract](ai/acceptance/b24-5/backend-ui-contract.md) and [verification](ai/acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Canvas Reviewer creation now persists a minimal owner/source/job recovery record before submission, reconnects the exact durable job after backgrounding or Android process death, retains identity through temporary network errors, fails closed on unsafe state, and makes snapshot-bound Library saves replay-safe. Production physical acceptance on a realme RMX3151 / Android 13 proved background/foreground, running-job force-stop/relaunch, network interruption/recovery, large text at font scale 1.35, automatic save, and Library reopen without regeneration. Exactly two intentional jobs produced two distinct snapshots and one saved Reviewer per snapshot. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and forced root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next milestones: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification; B25 — Design system + app shell implementation; B26 — Core experience redesign; B27 — Remaining application redesign; B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The normal path is now Study materials → material → Create Reviewer → automatic save → Library → reopen. Course diagnostics are disclosed instead of leading, Canvas materials retain module order, Ready/Prepare/PPTX-DOCX unsupported/empty states are explicit, and the accepted single-source snapshot/durable-job architecture remains intact. Physical production acceptance used the real 23-page CIT6 PDF and created one fresh 20-section Reviewer with 1.00 coverage/grounding, zero grounding/fabrication/leakage issues, automatic snapshot-bound persistence, and reopen without a second job. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. No API, engine, Supabase, or Vercel deployment change was required. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Production exact module resolution persisted real learner materials for all three selected courses despite broad Files (`canvas_permission_denied`) and Pages (`canvas_resource_not_found`) failures. Two production-only database contract gaps were repaired and regression-covered: the exact-resource sync-unit allow-list and the stale five-page reviewer-snapshot limit. A genuine 23-page CIT6 Canvas PDF was resolved from its module, stored privately, extracted as 23/23 native-text blocks, generated into a grounded 20-section Reviewer (coverage/grounding 1.00, leakage passed), rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production is healthy at the canonical Vercel URL. PPTX/DOCX remain intentionally unsupported and broad Canvas limitations remain honest partial-sync warnings. Next: start B22 only as a separate scope. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** The current `main` app launched on a physical realme RMX3151 / Android 13, restored its Supabase session, selected real 15-page and 55-page learner PDFs through Android Files, created authenticated durable jobs against the deployed Vercel API, completed the production `gpt-4o` Reviewer workflow, rendered 5-section and 14-section grounded results, saved them, and reopened them from Study Library without regeneration. Live missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root typecheck/lint/build pass; lint retains four existing warnings. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source. Current Canvas ingestion also lacks DOCX/PPTX parsing. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](ai/acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](ai/acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](ai/acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](ai/acceptance/b19/source-span-ancestry-completeness.md).

## B18 local repair — historical result (2026-09-08)

**FAIL — Reviewer representation defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46, with unchanged hashes, source ownership,
production gpt-4o, parser default legacy and initial prompts. Deterministic
representation ownership reduces composite/relationship copies and validates
visible spans. All Statistics mapping mismatches are resolved; Docling remains
withheld for one finding containing two real missing definitions. MinerU now
assembles with zero omissions. Python fallback remains zero. Final calls are
2/3/3/1, explanation retries 0/1/1/0, factual retries all zero. All four manual
gates still FAIL; serialized usefulness also fails Python/MinerU/Docling.
Full unchanged B12: NOT RUN — targeted prerequisites failed.
Fresh engine 519/519, architecture 70/70, reader 32/32, API 607/607, root
typecheck/lint/build all PASS. No push. B16/B17 historical FAIL reports unchanged.
Next: repair remaining source-span ancestry and source-item completeness from
B18 captures, preserving frozen targets and gates.
See [B18 acceptance](ai/acceptance/b18/composite-source-presentation-source-item-alignment.md).


## B17 local repair — historical result (2026-09-07)

**FAIL — generic Reviewer quality defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46; model gpt-4o and parser default legacy
are unchanged. Deterministic display now separates typed evidence, protects
row identity/order and exact overlap, and preserves every target at serialization.
Local sentence context and heading-subject completion improve explanations.
Fresh engine 494/494, architecture 45/45 and reader 32/32 pass.
Final calls 2/2/2/2, explanation retries 0/0/0/1, factual retries all zero.
Python has zero fallback, but source code/layout and repetitive labels remain.
Statistics remains withheld (two/four omissions); Accounting improves but
still fails manual usefulness. All four manual gates FAIL; full B12 NOT RUN.
Next: repair composite source-span/relationship presentation and align its
source-item evidence, preserving the frozen gates. No push or parser promotion.
See [B17 acceptance](ai/acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` contains the R5 implementation, Gap A/Gap B, and acceptance
  documentation commits and remains unpushed. Gap B hosted acceptance began at
  `792205d` with a clean tree, 45 commits ahead and 0 behind `origin/main`.
- R8 started from clean `dbf5e039f345f95986d810bb353c83b5b85487ca`,
  55 commits ahead and 0 behind `origin/main`. Implementation commit
  `69ea697ee916adb0e928171b4d0afdc792b92da0` exposes the existing Canvas
  structured-block/selective-preview contract in the Android reviewer flow.
- Consolidated Reviewer Android acceptance started at `e23ef61` on `main`, 62
  commits ahead and 0 behind `origin/main`, with three preserved in-scope UI
  edits already present in the working tree.
- Recovery branches/tags remain preserved. Generated Next build drift was
  removed before the R5 implementation commit.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 is in progress locally; Phase 7 has not started.

## Recovery and active implementation

- B16.1 attempt 3 on 2026-09-07 has working OpenAI capacity but FAILS live
  acceptance. All four targeted cases retained every deterministic target
  (99/99, 232/232, 156/156, 46/46), with zero provider losses or factual retries.
  A regression-backed generic prompt correction reduced Python from six calls
  and eight fallback explanations to four calls and two fallbacks (10.383 s).
  Statistics remains withheld for grounding omissions/structural noise;
  Accounting assembles in 5.824 s but has fragmentary prose and raw table dumps.
  Manual quality fails, so full frozen B12 was not eligible. Fresh engine
  476/476 (architecture 27/27) and API 607/607 pass. Preserve the frozen gates;
  next: reconcile the generic explanation/evidence presentation contract with
  the existing validation rules, using these captured failures. No B17, parser
  promotion, evidence-ownership change, or push. See
  `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.
- Reviewer B16 deterministically assembles required facts, list items,
  formulas/results, tables/rows, code, relationships, titles, and provenance.
  OpenAI owns only bounded batched explanations; ownership and prose validation
  are separate and runtime/request metrics are explicit. Focused 26/26, engine
  475/475, API 607/607, and all root gates pass. Live acceptance is unresolved:
  Python returned permanent no-credit 429s. Its two-call, zero-retry fallback
  preserved 99/99 targets in 5.432 s, but Statistics, Accounting, and full B12
  were not run. Production remains `legacy`. See
  `docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.
- Reviewer B15 makes source sufficiency a Stage 2 planning concern. Explicit
  source nodes are deterministically classified as standalone, structural,
  typed evidence or unsupported; non-standalone nodes retain hierarchy and
  exact evidence ownership without provider calls or fabricated explanations.
  B15 passes 12/12 focused regressions and the full 449/449 engine suite. Fresh
  targeted acceptance remains failed: Python preserves 99/99 targets but is
  withheld for instructional noise; Statistics/MinerU preserves 211/232,
  Statistics/Docling 152/156 and Accounting 35/46, all with zero fabrication
  failures. The full B12 rerun was not eligible. Production remains `legacy`.
  See `docs/ai/acceptance/b15/reviewer-section-planning.md`.
- Reviewer B14 hardens explanation form and targeted repair while retaining all
  B13 safety gates. The new 12/12 suite and full 437/437 engine evaluations pass.
  Acceptance remains failed: exact B13 candidates are still withheld, and
  source audit proves two planned Python sections are heading-only while two
  additional sections are code-only. B14 made no fresh provider calls and did
  not fabricate prose. See `docs/ai/acceptance/b14/reviewer-explanatory-repair.md`.
- Reviewer B13 adds stable required-evidence manifests, structured row/cell
  provenance, source-absent preflight refusal, exact-target bounded repairs and
  final deterministic usefulness gates. Empty-child semantic group labels no
  longer disappear from extractive fallback. All **425/425 engine evaluations**
  pass, but the Reviewer acceptance milestone remains **failed**: provider
  omissions and non-explanatory/source-dump candidates are still withheld.
  Earlier live metrics and final-code candidate replay are distinguished in
  `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`. No full B12
  rerun is claimed after failed targeted prerequisites. Parser default remains
  `legacy`; B11 gates and B12 durable typed-block preservation remain intact.
- Reviewer Benchmark B12 completed the full frozen B8 corpus in hybrid mode and
  failed acceptance. A minimal Stage 0 fix now preserves non-legacy typed blocks
  after durable metadata rehydration; its regression raises engine evaluations
  to 406/406. The post-fix durable run produces Python's expected 13-section
  plan, while Statistics and Accounting remain safely withheld for missing
  generated source evidence. Manual Python inspection also finds title-only
  explanations, activity leakage into key points, and excessive source-like
  lists despite 1.00 coverage/grounding. No fabrication was allowed, and the
  production parser default remains `legacy`. See
  `docs/ai/acceptance/b12/full-b8-hybrid-acceptance.md`.
- Reviewer Benchmark B11 is complete locally. Typed heading roles now use
  hierarchy, repetition, lexical/body, neighbor, and subordinate-evidence
  signals; furniture and instruction labels fold into their supported parent
  without losing source blocks. Same-parent repeats consolidate without numeric
  suffixes. Plan-level typed evidence groups carry formulas, tables, exact
  cells, code, and result statements through generation and grounding. Stage 6
  now rejects objective malformed student-visible structure.
- Live Python Docling assembles 13/13 clean concepts with 1.00 coverage and
  grounding and none of B10's furniture, malformed fragments, or repeated
  suffixes. Central-tendency Docling issues fall from 41 to 4 and MinerU from
  40 to 2, all omissions with zero fabrication failures; both remain safely
  withheld. Accounting numeric provenance remains Docling 41/41 and MinerU
  32/32. The production parser default remains `legacy`.
- Reviewer Benchmark B10 is complete locally. The API can now route PDF bytes
  through a feature-flagged, provider-independent `StructuredDocument`
  boundary with legacy, Docling, and MinerU adapters. Typed headings,
  paragraphs, lists, code, formulas, tables, images, reading order, hierarchy,
  parser diagnostics, and block/cell provenance reach Stage 0 without first
  being collapsed into Markdown. The production default remains the existing
  extraction/Google OCR path; external parser failures and quality failures
  fall back deterministically and expose only safe diagnostics.
- B10's sanitized three-class fixtures and router regressions pass without
  downloading parser models. Live A/B evidence is mixed: Docling materially
  improves code-heavy source structure and title quality, while MinerU's
  Python reviewer is withheld by grounding; all three central-tendency
  reviewers are withheld despite substantially better typed formula/table
  evidence. The scanned accounting source routes through MinerU into the
  shared contract without Google credentials, but known missing/misread cells
  remain unsynthesized. B11 now addresses the downstream hierarchy and
  grounding layer without another parser-specific mapping.
- Reviewer Benchmark B4 is complete locally. Stage 4 now scores unique
  source-derived semantic targets, while Stage 5a independently rejects wrong
  definition, parent-child, step-order, example, cross-concept, and sibling
  relationships. Relationship failures remain section-bounded and now produce
  field/type-specific retry guidance. The exact Intro to IT Security PDF
  retains B3's 17 titles and all 17 sourceCore payloads, passing 110/110 semantic
  targets, 1.00 coverage, 1.00 grounding, zero relationship issues, leakage,
  17 calls, 0 retries, and 0 fallbacks. The Google credential exposed during B3
  still requires authorized operational rotation; B4 did not inspect or reuse
  it. See `docs/ai/benchmarks/intro-it-security/benchmark-b4.md`.
- Reviewer Benchmark B3 is complete locally. Stage 2 now carries an optional
  source-derived semantic plan and distinguishes conceptual enumerations from
  procedures; Stage 3 preserves definitions, supported category groups,
  ordered steps, and explicit examples while allowing useful direct-source
  explanations and avoiding filler. The real 32-page Intro to IT Security run
  retains B2's 17-section outline and passes with 17 calls, 0 retries, 0
  fallbacks, 1.00 coverage, 1.00 grounding, and leakage passing. Page 10 visual
  labels and page 14 hierarchy edges remain explicit extraction gaps; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b3.md`.
- Reviewer Benchmark B2 is complete locally. Production PDF extraction now
  preserves normalized page blocks through mobile job submission and durable
  worker storage into generic engine source blocks. Page-aware Stage 0/1
  classifies title/divider/reference noise, recognizes page-leading academic
  headings, merges repeated continuation slides, and keeps distinct concepts
  separate without changing Stage 3. The real 32-page Intro to IT Security run
  now produces the approved 17-concept outline instead of the B1 giant Domains
  span and noise sections; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b2.md`.
- The R6 reviewer-core capstone audit is accepted. The complete supported path
  is source intake or synchronized Canvas selection, editable preparation,
  grounded Stage 0-6 generation, durable progress, reviewer reading, save, and
  Study Library reopen. A fresh linked-project Canvas run passed selection,
  OpenAI generation, immutable provenance, persistence, source health, owner
  isolation, and zero-residue cleanup.
- Two reviewer defects were hardened: saved PDF metadata now matches the
  durable 100-total-page policy instead of rejecting page counts above five,
  and reviewer results opened from completion routing can be titled and saved
  from Processing, including their Canvas snapshot.
- The R8 Canvas mobile gap is closed and physically accepted. A synchronized
  source now resolves to server-owned structured blocks, honors the server
  default selection, supports ordered subset selection and a zero-selection
  guard, creates an authoritative selective preview, and hands its preview
  session/fingerprint into the unchanged durable generation path. Changing the
  selection invalidates the old preview and requires a new one.
- The physical R8 run selected three of nine returned blocks. The resulting
  durable job completed 1/1, recovered through Processing after force-stop,
  saved as `Capstone Selective Canvas Reviewer`, and reopened from Study
  Library without regeneration. Its immutable snapshot records exactly three
  ordered paragraph blocks (source block ordinals 5, 6, and 7), the
  selective-preview parser/normalization versions, hashes, no OCR, and
  `wasEdited = false`.
- Consolidated Reviewer UI acceptance is complete on realme RMX3151 / Android
  13. Pasted text, gallery, camera, PDF, Canvas selection/preview, a real durable
  generation, Processing, Reader, save, immediate Library refresh, reopen,
  rename, native delete Cancel/Confirm, and both Back paths passed. The run fixed
  blank-source/footer readiness and saved-Reader Android Back behavior without
  changing reviewer architecture or persistence semantics.
- Capstone development R5 is complete and live accepted: manual task CRUD,
  persisted Canvas-assignment import, deterministic preview/apply planning,
  study-session persistence/edit/delete, and two-user denial coverage are in
  place and passed against linked Supabase. Final verdict: PASS.
- The R6 replanning prerequisite (Gap B) is implemented and hosted accepted.
  Study sessions have `planned`, `completed`, and `skipped` lifecycle state;
  applying a range serializes per owner and atomically replaces only
  intersecting planned rows, preserves terminal history, and rejects
  overlapping new proposals.
- Live acceptance exposed one R5 runtime defect: PostgreSQL returned persisted
  timestamps with microsecond precision while the shared ISO validator allowed
  at most milliseconds. The parser now accepts valid fractional precision and
  a regression test covers the live format.
- Product Recovery R1-R5 is complete. R6 is partial: automated checks pass,
  while Dynamic Type, VoiceOver, interruption, navigation/reconciliation, and
  save-flow behavior still require physical iPhone observation.
- Durable document jobs now accept at most 100 total PDF pages and at most 40
  pages that require OCR. Native-text and confirmed blank pages do not consume
  the OCR allowance; synchronous and Canvas extraction remain capped at 40
  total pages.
- API and mobile errors are sanitized, native text is inspected before OCR,
  OCR fan-out remains bounded, and Vercel Workflow owns accepted processing.
- The EAS preview APK was built and installed on a physical Android device.
  Android authentication and hosted API connectivity passed. The specific
  durable 41-100-page native-text and >40-OCR-required-page matrix remains.
- R8 EAS internal preview build `ab67feeb-0f61-4d6c-b24c-a7c5658ac050`
  (Stay Focused V2 2.0.0, build 1, commit `69ea697`) was installed with
  `adb install -r` on the realme RMX3151 / Android 13. Authentication and the
  existing session survived replacement. No API code changed, so the verified
  production deployment remained in use.
- Reviewer acceptance EAS build `b625303b-943e-45a1-89da-e50c33fbba1b`
  (Stay Focused V2 2.0.0, build 1) was installed with `adb install -r` on the
  same device. Authentication and the two pre-existing saved reviewers survived
  replacement; the hosted preview API remained reachable.

## Deterministic test baseline

- B15 verification passes 449/449 engine evaluations (B15 12/12, B14 12/12,
  B13 19/19) and 607/607 API tests across 69 files. Root typecheck, lint and
  build pass for 7/7 workspaces; four established mobile import-order warnings
  remain. Fresh targeted provider runs completed but all four Reviewers were
  safely withheld, so the full B12 rerun was not run.
- B11 verification passes 405/405 engine evaluations (all prior 396 remain)
  and 607/607 API tests. Engine and full repository typechecks pass; builds
  pass; lint retains only the four accepted mobile import-order warnings. B10's
  unchanged adjacent baselines remain 1/1 durable workflow and 10/10 focused
  mobile parser handoff tests.
- Shared: 32/32, including the PostgreSQL microsecond timestamp regression;
  targeted Gap A/Gap B API/database/session coverage: 27/27; mobile: 216/216;
  reviewer engine: 343/343 deterministic evaluations after B4 semantic
  coverage, relationship, fault-injection, and retry-diagnostic regressions.
  These suites were rerun after hosted acceptance.
- Forced root typecheck and lint pass fresh for 7/7 packages with zero cached
  tasks; lint retains only the four known mobile import-order warnings. DB and
  API production builds pass.
- Full API regression is 576/577 after two new reviewer-save boundary tests.
  The only failure matches the documented
  pre-existing Windows CRLF-sensitive Canvas SQL substring baseline; the SQL
  semantics and all planning tests pass, so it is not a Gap B product defect.
- R8 verification passed: mobile 278/278, Canvas 72/72, targeted Canvas
  structure/selective-preview/generation/freshness/provenance API tests 43/43,
  fresh forced root typecheck 7/7, fresh forced root lint 7/7, `git diff
  --check`, and `git fsck --full`. The four previously accepted mobile
  import-order warnings did not appear in the R8 lint run and no new warning
  was introduced.
- Consolidated Reviewer acceptance verification passes mobile 373/373, focused
  Reviewer/Library 108/108, mobile and root typecheck/lint, `git diff --check`,
  and `git fsck --full`. Lint retains only the same four accepted mobile
  `import/first` warnings.

## Migration status

- The four proven Canvas metadata aliases were reconciled through supported
  `supabase migration repair` metadata operations only:
  `20260728022127` to `20260728094421`, `20260728024021` to
  `20260728104000`, `20260728131529` to `20260728201000`, and
  `20260728133821` to `20260728213700`. No historical SQL was edited or
  replayed and no Canvas schema object was changed by the repair.
- Forward-only migration
  `20260827155438_task_study_plan_foundation.sql` is the applied R5 foundation.
  It creates `tasks`, `study_plans`, and `study_sessions` with owner-safe
  foreign keys, RLS policies, service-only RPCs, and supporting indexes.
- Forward-only migration
  `20260828173643_replace_planned_study_sessions_on_replan.sql` is applied to
  linked Supabase. A CLI 2.116.0 dry-run proposed only this migration; final
  local/remote history matches through `20260828173643`.
- Hosted catalog inspection confirmed the non-null `planned` status default and
  lifecycle check, partial planned-session index, owner-serialized replacement
  function, safe search path, `SECURITY INVOKER`, service-role-only execution,
  enabled RLS, and unchanged owner policies.
- Dedicated two-user runtime acceptance passed first apply, same-window
  reapply, no duplicate active schedule, completed/skipped preservation,
  owner-scoped status PATCH persistence, overlap rejection with no partial
  writes, cross-owner API/RLS denial, two concurrent RPC applies, and the Gap A
  embedded-task/full-PATCH response contract. Temporary users and rows were
  removed; `tasks`, `study_plans`, and `study_sessions` counts returned from
  0/0/0 to 0/0/0.
- Supabase CLI 2.116.0 dry-run proposed only the R5 migration. The linked push
  applied only `20260827155438`, and final linked history records it as
  `task_study_plan_foundation`.
- Live schema checks passed for constraints, indexes, owner RLS, grants,
  triggers, and service-only security-invoker import/apply RPCs. Live CRUD,
  Canvas import/idempotency/edit preservation, deterministic preview, atomic
  apply, study-session behavior, and all eight API plus RLS/database isolation
  attacks passed. Dedicated test users and rows were removed; R5 table counts
  returned from 0 to 0.

## Known risks and immediate task

- Recommended next task: reconcile heading-only planned sections with the
  source-faithful explanatory contract. Do not borrow child content, fabricate,
  weaken usefulness, or change the parser default. Targeted acceptance must pass
  before the unchanged full B12 rerun.
- Recommended next task: run the same reviewer benchmark on the Firewalls PDF
  to test whether the B3 generation structure and B4 semantic verifier
  generalize beyond Intro to IT Security.
- The Google service-account credential exposed during B3 requires authorized
  operational rotation. Do not inspect, print, copy, or commit the existing
  value while remediation is pending.
- Reviewer-core limitations are documented in
  `docs/ai/reviewer-core-capstone-acceptance-20260828.md`; notably, fresh camera
  and long-document device acceptance was not repeated, and a cold-start
  non-Canvas result conservatively loses its gallery/camera/PDF mode label when
  saved from Processing. Content and reopen behavior remain intact.
- Supabase warn-level advisors report only legacy non-Gap-B findings: four
  `reviewers` RLS init-plan performance warnings plus older function/Auth
  security warnings. No warning names the Gap B status/index/apply objects.
  Address unrelated findings only through separately scoped work.
- Physical-device acceptance debt remains for Product R6, readable camera OCR,
  the durable long-document Android matrix, and notification registration,
  delivery, and routing. Persisted Processing/relaunch recovery is accepted and
  does not depend on notifications.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.
