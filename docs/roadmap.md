# Roadmap

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** The routing repair and two generic Activity requirement/personalization repairs are live in READY production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v`. Standalone realme validation before and after normal sync confirms learning Pages/PDF/PPTX in Generate, assignments in Tasks, announcements separated, and retained orientation material excluded. Five completed fresh Activity types passed all prewritten mandatory checks; a sixth was consistently source-limited before provider execution. Full verification passes except the existing local Expo external-link export limitation. See [B26.1 acceptance](ai/acceptance/b26.1/deployed-routing-and-activity-reliability.md). Next milestone: B27 remaining application redesign, beginning with a student-facing announcement experience.

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The repaired existing APK passed physical standalone acceptance on the realme RMX3151: session/Canvas, one new completed Reviewer, five-question server-scored Quiz, one Canvas-instruction-grounded Activity draft, and Queue/Library cold-relaunch persistence. AI-first production paths, API security/health, and mobile regressions passed. See [B25.3.4 acceptance](ai/acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Next: B26 generation-quality evaluation across multiple real Reviewer materials and Activity assignment types. Earlier PARTIAL entries are historical.

## B25.4 physical-device acceptance (2026-09-16)

Authenticated physical production-API runs completed a real CIT6 Reviewer, exact 5/5 Quiz with server-scored 100% attempt, and CC16 Learning Contract Activity. Queue and Library persisted all three and the result reopened. A corrupt local generation cache defect was fixed and retested in Expo Go; the full regression passed. The patched standalone APK is being built for installation and release-path retest, so **B25 remains PARTIAL; B26 may not begin**. See [B25.4 device checkpoint](ai/acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](ai/acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

The implementation now sends structured validator findings, permits complete slot reauthoring, escalates to unused compatible support, derives mixed difficulty from source affordance, preserves accepted questions, and keeps the exact-count/grounding/distractor/leakage/academic-value gates strict. Fresh full verification and the final bounded synthetic-live attempt pass; production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and healthy.

The single real-material production retest still accepted only 1/5 and exhausted all bounded repair phases with four pending slots. No Quiz artifact or persisted attempt/result was available. **PARTIAL — Quiz semantic convergence remains incomplete.** The next B25 follow-up must use this symbolic failure trace under separately authorized provider/production limits; B26 does not begin automatically. See [B25.3.1 report](ai/acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](ai/acceptance/b25.2.1/generation-orb-repair.md).

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

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** The physical Android flow now survives backgrounding, process death during a running Reviewer job, and temporary network loss while preserving one exact durable identity. Relaunch restores the owning course, terminal results render and save once per immutable snapshot, unsafe state fails closed, and explicit retry is the only path to a new identity. Large-text behavior remains usable at font scale 1.35. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

1. B24 — Complete Stay Focused V2 mobile UX/UI redesign specification
2. B25 — Design system + app shell implementation
3. B26 — Core experience redesign
4. B27 — Remaining application redesign
5. B28 — Full design QA + pilot freeze

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — the Canvas learner-material capability is now a coherent physical-mobile study workflow.** Students choose a synced course, see ordered module materials with honest states, confirm a material, create a durable Reviewer with one primary action, study the completed output, receive automatic snapshot-bound persistence, and reopen it from Study Library without regeneration. The physical CIT6 run produced one fresh 20-section Reviewer from all 23 PDF pages with 1.00 coverage/grounding, zero verifier issues, passed leakage, and safe fallback disclosure. Unsupported PPTX and empty items remained visible and blocked. All final package and root gates pass; no backend deployment was needed. Next: define B23 as a separate accessibility and interrupted-session/resume hardening slice rather than broadening B22 into format ingestion or Canvas permission expansion. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 is deployed and physically proven.** Fresh production syncs persisted exact module Files, Pages, and Assignments for the three selected courses while unavailable broad collections remained safe partial warnings. Production repairs aligned the durable sync-unit constraint with B21's exact resolver kinds and reviewer snapshot provenance with the existing 40-page Canvas PDF limit. A real module-owned 23-page CIT6 PDF completed prepare, native-text extraction, 20-section grounded Reviewer generation, rendering, save, and Study Library reopen on a physical Android 13 phone. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass. PPTX/DOCX and broader Canvas permission expansion remain out of scope. Next: begin B22 as a new bounded milestone. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed authentication restoration, selection of real learner PDFs, durable extraction, authenticated production Reviewer jobs, completion, rendering, save, and Study Library reopen for 15-page prose-heavy and 55-page formula/table-like sources. Live auth, owner isolation, duplicate-submit, and network recovery checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas learner-material selection remains a capstone gap: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX ingestion is also absent. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next capstone slice: Canvas learner-material access and ingestion validation; do not resume general Reviewer polishing without a demonstrated blocker. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

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

## Reviewer B16 - Deterministic retention verified, live quality gate failed

B16.1 attempt 3 (2026-09-07): capacity AVAILABLE; all four live cases ran.
Required targets are retained at 99/99, 232/232, 156/156 and 46/46, with no
provider-owned targets, provider losses or factual retries. Final calls are
4/2/3/1 and durations 10.383/26.266/16.945/5.824 s. A generic, regression-backed
prompt correction aligns explanation wording with the frozen lexical gate;
Python still uses two fallbacks. Statistics fails assembly and Accounting fails
manual quality despite automated PASS. Full B12 is NOT RUN because targeted
acceptance failed. Fresh engine 476/476, architecture 27/27 and API 607/607 pass.
Next: reconcile the generic explanation/evidence presentation contract with
existing validation rules using captured failures; do not weaken gates or start
a benchmark-specific B17. The earlier no-credit attempts remain historical.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Required evidence is now assembled and identity-checked from the Stage 2
manifest before any provider call. OpenAI owns only bounded batched
explanations; factual retries are zero, stable IDs isolate batch failures, and
non-standalone dispositions consume zero calls. Focused 26/26, full engine
475/475, API 607/607, and all root gates pass.

Historical B16 result before restored capacity: Python's two batches returned
OpenAI 429 `no credits remaining`; safe fallback preserved 99/99 targets in
5.432 s with no loss/fabrication, but this does not establish provider quality.
Statistics, Accounting, and full B12 were not run in that historical attempt.
The attempt 3 result above supersedes its provider blocker. Production remains `legacy`.

## Reviewer B15 - Planning boundary repaired, acceptance still failed

Stage 2 now distinguishes standalone, structural, typed-evidence and
unsupported source nodes using only local normalized/semantic evidence.
Non-standalone nodes retain explicit hierarchy, disposition reasons, exact
typed/semantic representations and unchanged manifest owners while consuming
no provider or retry calls. Twelve focused regressions pass and the complete
engine suite is 449/449 with all B13/B14 gates retained.

Fresh targeted acceptance did not clear the full-corpus prerequisite. Python
preserved 99/99 targets at 1.00 coverage/grounding but was withheld for
instructional noise. Statistics/MinerU preserved 211/232, Statistics/Docling
152/156 and Accounting 35/46; provider omissions and Statistics usefulness
failures were rejected with zero fabrication failures. The full unchanged B12
rerun was therefore not run. Production remains `legacy` and historical
acceptance evidence is unchanged.

Next task: repair source-supported evidence completion and usefulness without
changing B15 classifications, ownership, frozen thresholds or parser defaults,
then rerun the four targeted cases before full B12.

## Reviewer B14 - Explanation hardening, acceptance blocked by source boundary

Field-aware imperative, code-as-explanation, fragment and explanation-dump
checks now protect Stage 6. Missing-target repair prompts carry only exact
target evidence while retaining all source identities, and usefulness repairs
merge with accepted content. B14 adds 12/12 regressions; engine total is
437/437 with all 425 prior cases retained.

The milestone still fails. Exact candidate replay remains withheld, and source
audit proves the frozen 13-title Python plan contains two heading-only sections
and two code-only sections without explanatory prose. No B14 live or full B12
rerun was attempted after that deterministic stop condition. Production remains
`legacy`; historical acceptance evidence is unchanged.

Next task: reconcile heading-only planned sections with the source-faithful
Reviewer contract without cross-section borrowing, fabrication, default-parser
promotion, or weaker usefulness gates.

## Reviewer B13 - Implemented hardening, failed acceptance

Required evidence now has stable IDs and typed provenance, source availability
is checked before generation/fallback/assembly, and retries receive exact
missing targets with prior accepted content. Stage 6 rejects non-explanatory,
instructional-noise, source-dump and low-information content without deleting
required sections. Formula/code/table allowances remain block-aware. The engine
suite is **425/425**, including all 406 previous cases.

This does not complete the acceptance milestone. The frozen targeted workload
still produces withheld reviewers. The report distinguishes captured live
metrics from replay after final required-technical-evidence tightening; no full
B12 or durable acceptance rerun is claimed. Production remains `legacy` and
all original safety/structure gates are retained.

Next task: evidence-bound provider completion and source-sparse explanation
recovery, then targeted acceptance and only afterward the unchanged full B12
corpus. See `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`.

## Reviewer Benchmark B12 - Failed acceptance

The frozen B8 Python, Statistics, and scanned Accounting sources were rerun
through hybrid extraction, production pipeline components, and the real durable
job APIs. Parser readiness passed for every source with no fallback or parser
loss. One generic durable-boundary defect was fixed: persisted Docling/MinerU
typed blocks now bypass legacy presentation-page expansion. The focused Stage 0
regression passes and the complete engine suite is 406/406.

The acceptance milestone is not complete. Python restores the exact 13 B11
titles and passes coverage/grounding at 1.00, but manual inspection still finds
non-explanatory sections, activity leakage, and overlong source-like points.
Statistics remains withheld for omissions with both MinerU and Docling.
Accounting remains withheld when generated Ledger content omits an exact table
row. Zero fabrication and zero unsupported relationships were accepted; the
production parser default remains `legacy`.

Next Reviewer task: generically strengthen student-visible usefulness and
required-evidence completion without weakening current gates, then rerun the
unchanged B12 workload.

## Reviewer Benchmark B11 - Complete

Stages 1-6 now exploit the typed structure established in B10. Generic
multi-signal heading roles suppress furniture and instructional fragments while
retaining their child evidence; equivalent same-parent headings consolidate
without numeric suffixes. Planned typed evidence groups preserve formula raw
text/parser LaTeX, tables, exact cells, code, results, and provenance through
generation and relationship grounding. Objective Stage 6 diagnostics withhold
malformed student-visible structure without imposing a blind point cap.

The eight B11 regression families pass, and the complete engine suite is
405/405 with all prior 396 cases retained. API remains 607/607. Live Python
Docling now assembles 13 clean concepts at 1.00 coverage/grounding. Statistics
Docling grounding issues fall from 41 to 4 and MinerU from 40 to 2, with zero
fabrication failures; both remain safely withheld for omissions or missing
output. Accounting cell and numeric/OCR provenance is unchanged. The parser
production default remains `legacy`.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using hybrid
structured parsing. Unconditional parser promotion remains deferred.

## Reviewer Benchmark B10 - Complete

A feature-flagged structured parser architecture now preserves typed document
structure and provenance across the API, durable processing, engine Stage 0,
and mobile result boundary. Legacy, Docling, and MinerU outputs map into one
provider-independent contract; generic observable-signal routing and quality
gates select or reject external parses, and every external failure falls back
to the unchanged current extraction/Google OCR path. `legacy` remains the
production default.

Sanitized code-heavy, formula/table-heavy, and scanned-accounting fixtures
protect typed code, formulas, tables, OCR origin, hierarchy, source order, and
numeric cell provenance. The deterministic engine suite is 396/396 and the API
suite is 607/607. Live generation evidence is partial: Docling improves the
code-heavy reviewer before additional heading heuristics, but MinerU is
withheld; all central-tendency arms are withheld even though Docling/MinerU
retain formulas and tables. Scanned accounting reaches MinerU and the shared
contract without Google credentials, while known parser omissions remain
visible rather than being invented.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using the
accepted typed hierarchy/grounding layer and hybrid structured parser.

## Reviewer Benchmark B4 - Complete

Stage 4/5 now verifies relationships rather than certifying source-token
presence alone. Coverage assigns visible rows to unique semantic targets and
scores covered targets over total targets. Grounding separately rejects wrong
definition, parent-child, procedure-order, example, cross-concept, and sibling
associations while retaining lexical fabrication and omission checks. Valid
conservative paraphrases and ambiguous flat source structures still pass.

The required 16-fixture matrix, seven structured fault injections, and precise
section-only retry diagnostic pass. The engine suite is 343/343. The exact Intro
to IT Security PDF rerun preserves B3's 17 titles and every sourceCore payload,
passes 110/110 semantic targets, coverage and grounding at 1.00, zero semantic
relationship issues, and leakage, with 17 calls, no retries, and no fallbacks.

Page 10 visual labels, page 14 hierarchy edges, and flat denial-service visual
relationships remain extraction limits rather than verifier failures. The
Google service-account credential exposed during B3 requires separate
authorized operational rotation; B4 did not inspect or reuse it.

Next Reviewer benchmark: apply the same process to the Firewalls PDF to test
cross-document generalization before making additional engine changes.

## Reviewer Benchmark B3 - Complete

The accepted B2 17-section outline is unchanged. Stage 2 now carries a generic,
optional semantic plan for concepts, lists, definition sets, supported category
groups, procedures, and example groups. Stage 3 serializes those relationships
through the compatible key-point surface, retains only useful direct-source
explanations, keeps sparse facts free of filler, and continues to exclude
outside enrichment. Page-scoped continuation content remains whole through
generation and grounding.

The 32-page Intro to IT Security rerun used `gpt-4o`, made 17 calls with zero
retries and zero fallbacks, emitted the same 17 titles, and passed coverage and
grounding at 1.00 with leakage passing. Definitions, threat categories,
infiltration groups and ordered steps, and blended-attack examples remain
associated. The deterministic engine suite passes 319/319.

Known extraction limits remain: page 10 visual labels are absent and page 14
attacker hierarchy edges are not reconstructed. The next Reviewer benchmark is
B4 semantic verification: Stage 4/5 should independently reject incorrect
relationship flattening/grouping instead of treating lexical 1.00 scores as
semantic proof.

## Reviewer Benchmark B2 - Complete

Production PDF review now retains normalized page identity through durable job
submission and feeds generic page-aware blocks to Stage 0/1. Presentation title,
divider, references, and OCR/logo noise are classified as source evidence but
excluded from the academic outline; repeated continuation headings merge while
distinct neighboring concepts remain separate. The unchanged Stage 3 generated
the Intro to IT Security benchmark from a natural 17-section outline with
coverage, grounding, and leakage gates passing. Eleven new generic regressions
raise the deterministic engine suite from 292 to 303 cases.

Known next-layer debt remains explicit: Stage 2/3 must preserve semantic
relationships and write useful explanations, and extraction still cannot recover
page 10's diagram labels or page 14's visual hierarchy edges.

## Capstone Development Phase R5 - Task And Study-Plan Foundation

Status: Complete and live accepted.

- Added owner-scoped `tasks`, `study_plans`, and `study_sessions` with RLS,
  owner-safe foreign keys, service-only atomic import/apply functions, and a
  forward-only migration after the existing local/linked versions.
- Manual task CRUD and persisted synchronized Canvas-assignment import are
  exposed through authenticated APIs. Import makes a user-owned task, is
  idempotent, performs no Canvas request, and preserves user edits on re-import.
- The shared planner is deterministic and non-AI. It orders by deadline,
  priority, creation time, then task ID; bounds sessions to 90 minutes; and
  reports every unscheduled minute when capacity is insufficient.
- Preview is read-only. Apply accepts the normalized planning request, reruns
  the planner, validates owned pending tasks, and persists the plan/sessions in
  one RPC transaction rather than trusting arbitrary client session records.
- Targeted R5 API/database/acceptance tests pass 11/11, shared tests pass 31/31,
  reviewer regression passes 290/290, and shared/DB/API typechecks plus DB/API
  builds pass. Full API regression remains 558/559 only because of the known
  pre-existing Windows CRLF Canvas assertion.
- The four authorized Canvas migration-version aliases were reverified against
  live tables, constraints, indexes, RLS, functions, grants, retry structures,
  and service-role protections, then reconciled as metadata only. Historical
  SQL and Canvas schema objects were not changed or replayed.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260827155438_task_study_plan_foundation`; the linked push applied only that
  migration. Live schema, CRUD, Canvas import, preview/apply, session behavior,
  atomicity, cleanup, and all eight API plus RLS/database cross-user denials
  passed.
- Live preview initially exposed a valid PostgreSQL microsecond timestamp being
  rejected by the shared validator. R5 now accepts arbitrary valid fractional
  seconds, the focused regression passes, and the full live suite passes.

### R6 prerequisite - deterministic replanning replacement

Status: Complete and hosted accepted.

- Study sessions expose `planned`, `completed`, and `skipped` lifecycle state.
- Applying a plan serializes per owner, deletes only active sessions that
  intersect the requested planning range, preserves terminal history, rejects
  overlapping proposed sessions, and persists the replacement atomically.
- Repeated stateful API applies remain bounded to one active schedule for the
  range. Shared, targeted planning, mobile, reviewer, typecheck, lint, and build
  gates pass. The full API suite remains green except for its known Windows
  CRLF Canvas assertion.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260828173643_replace_planned_study_sessions_on_replan.sql`; the linked push
  applied it and local/remote migration history now matches.
- Hosted catalog inspection verified lifecycle schema, the partial planned-row
  index, advisory locking, replacement/overlap markers, `SECURITY INVOKER`,
  service-role-only execution, RLS, and owner policies.
- Dedicated two-user live acceptance passed first apply, same-window reapply,
  active-duplicate absence, completed/skipped preservation, status PATCH
  persistence, atomic proposed-overlap rejection, cross-owner denial, two
  concurrent RPC applies, unaffected outside-range data, and the Gap A embedded
  task/full PATCH response contract. All fixtures were removed and R5 table
  counts returned to zero.
- Fresh verification passed targeted Gap A/Gap B 27/27, shared 32/32, mobile
  216/216, reviewer 290/290, forced root typecheck/lint for 7/7 packages, and
  DB/API builds. Full API is 574/575 with only the documented Windows
  CRLF-sensitive Canvas SQL assertion.

Immediate next task: continue R6 mobile Tasks and Study Schedule integration.

## Phase 5F.2 - Incremental, Resumable Canvas Synchronization

Status: Complete and hosted validated.

- Content and grade jobs expand into database-owned list-page, item-detail,
  announcement, file, assignment, submission, and grade-summary units. Vercel
  Workflow executes one Canvas request per step and resumes from persisted
  units rather than replaying a whole course.
- Atomic connection-scoped claims cap provider work at three concurrent units,
  or two for grade jobs. Ninety-second leases, bounded provider retries,
  durable `Retry-After` scheduling, a 30-minute parent deadline, and same-job
  retry prevent unsafe request races and unbounded work.
- Relational course content promotes atomically. Announcements, files, and
  grades maintain independent health so usable scopes can advance while an
  incomplete scope keeps its last-known-good snapshot.
- Expo Go now shows course and scope health, nullable expanding totals,
  truthful partial completion, Sync again, and Cancel. Synchronization remains
  manual and still requires HTTP 202 acceptance before the app may switch away.
- Private staging is service-only, is removed on success/cancellation, and
  expires after 24 hours for failed jobs. Sanitized job/unit audit records stay
  within the existing 30-day idempotency window.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.

Hosted content produced a safe `partial` outcome when one Canvas list endpoint
was unavailable, while independent announcements advanced and no deletion was
inferred. Grade synchronization returned `unchanged`, idempotent replay reused
the same content job, and explicit cancellation published no result.

Release acceptance debt: perform the three-item physical Expo Go reload,
temporary-network, and cancellation spot-check before the next mobile release.

## Phase 5F.1 - Durable Canvas Synchronization

Status: Complete and hosted validated.

- Course-content and grade synchronization are now separate Supabase-owned
  jobs started through Vercel Workflow after HTTP 202 durable acceptance.
- Job creation is owner-scoped and idempotent. Workflow run IDs, progress,
  retryability, cancellation, bounded attempts, and stale underlying sync
  recovery are persisted without exposing Canvas source or grade content.
- Expo Go persists the creation intent before submission, replays the same key
  if acceptance is lost, stops relying on background JavaScript, and reconciles
  on launch or foreground return. Grade jobs expose Cancel and Retry.
- The user has physically passed OCR and reviewer-generation switch-away tests.
  Agent-led hosted reload recovery, temporary client disconnection, and
  explicit cancellation also pass for the existing extraction/reviewer jobs.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.
- Hosted Canvas validation passed content sync, grade sync, idempotent replay,
  and explicit cancellation. The temporary validation course selection was
  restored, successful results were persisted before terminal status, and the
  cancelled job published no result.

Phase 5F.2 builds on this completed server-owned acceptance boundary.

## Durable-document Android closeout - Device smoke passed, matrix pending

- Durable processing accepts up to 100 total PDF pages while allowing at most
  40 pages that actually require OCR. Native-text and confirmed blank pages do
  not consume the OCR allowance.
- Synchronous and Canvas extraction retain the existing 40-total-page ceiling.
- Native text is inspected before OCR; an oversized scanned document fails
  safely before provider dispatch, and mobile presents sanitized guidance.
- The EAS preview APK was built and installed on a physical Android device.
  Authentication and hosted V2 API connectivity passed. Those checks do not
  yet prove the durable long-document limits or interruption/reconciliation
  behavior.

Current acceptance task: use the installed preview build to validate the
durable-document matrix on a physical Android device. This is a closeout task,
not Phase 6.

## Product Recovery Phase R6 - Partial

Automated R6 acceptance passed on 2026-07-15, but physical-device acceptance
remains deferred because no controllable physical iPhone Expo Go session was
available to this agent. No product defect was reproduced, no product code was
changed, and the R5 automated/protected gates remain green: Canvas 69/69, OCR
25/25, engine 287/287, API 428/428, mobile 154/154, reviewer web smoke 51/51,
R3/R4/R5 protected validations, PDF OCR web smoke, root lint/typecheck, and
root production build.

Remaining recovery debt: complete Product Recovery Phase R6 on a physical
iPhone with Expo Go before claiming R6 complete.

## Product Recovery Phase R5 — Complete

The Canvas reviewer path now presents authoritative module/item ordering, safe
capability states, explicit file preparation and source checking, exact editable
preview text, existing protected generation, immutable snapshot save, and
stale-state invalidation as one calm staged student journey. Large bounded
inventories can load later pages without mixing changed or duplicate pages.
R1-R4 security, OCR completeness, reviewer grounding, and provider-call gates
remain intact. No database migration was required.

Immediate next task result: Product Recovery Phase R6 automated acceptance is
partial pending physical-device observation.

## Phase 1 - Foundation And Reviewer Engine

Status: Complete

Purpose: Establish the repository foundation and a tested reviewer-generation
engine before product UI and integrations depend on it.

Major deliverables:

- Monorepo foundation
- Stage 0 through Stage 6 pipeline
- OpenAI-compatible provider boundary
- Coverage verification
- Grounding validation
- Leakage protection
- Deterministic evaluations
- Short-prose fallback for OCR-style pasted text

Exit criteria:

- Engine build passes.
- Aggregate deterministic evals pass with 343 cases.
- Default visible reviewer output is source-faithful.
- Unsupported enrichment is excluded from default assembly.

Real-course quality note: Intro to IT Security B4 preserves B3's repaired
course-PDF outline and source-supported definitions, categories, procedures,
and examples. Stage 4/5 now independently verifies those relationships. The
next quality proof is the Firewalls PDF, not additional Intro-specific tuning.

Immediate dependency: None.

## Phase 2 - Authenticated Reviewer Vertical Slice

Status: Complete

Purpose: Prove a real user can sign in, submit source text, call the protected
API, generate with OpenAI, and preview validated reviewer output.

Major deliverables:

- Supabase email/password authentication
- Protected reviewer API route
- Expo reviewer input and preview
- OpenAI-backed generation
- Local Expo Web CORS
- Unattended authenticated browser smoke
- Persistent smoke session and output assertions

Exit criteria:

- `POST /api/reviewer/generate` requires a valid Supabase bearer token.
- Expo reviewer generation screen can submit pasted text and render a preview.
- `npm run smoke:reviewer:web` passes against the local API and Expo Web.
- Immediate repeat and session-only smoke flows are supported.

Immediate dependency: Phase 1 complete.

## Phase 3 - OCR And Source Ingestion

Status: Complete

Purpose: Replace paste-only source intake with a server-side OCR contract that
preserves layout enough for the reviewer engine to stay source-faithful.

Completed in Phase 3A:

- Audit existing source and OCR-related contracts.
- Provider-agnostic OCR boundary.
- Server-only Google Cloud OCR adapter.
- Fake-client OCR tests.
- Protected image OCR API route.
- MIME type and size validation.
- Preserved line, list, and layout boundaries.

Completed in Phase 3B:

- Gallery image selection through Expo Image Picker.
- Selected-image preview and filename display.
- Authenticated upload to `POST /api/ocr/extract`.
- Editable extracted-text review before reviewer generation.
- Manual paste fallback as a separate source mode.
- Deterministic Expo Web OCR smoke using a mocked OCR response and real
  reviewer generation.

Completed in Phase 3C:

- Camera capture through the existing Expo image-picker boundary.
- Captured-image preview and generated filename display.
- Reuse of the authenticated `POST /api/ocr/extract` upload path.
- Editable extracted-text review before reviewer generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision OCR.
- Verified that edited OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live OCR-generated reviewer.

Completed in Phase 3D:

- Synchronous small-batch PDF OCR ingestion for one PDF per request.
- PDF selection through Expo Document Picker.
- Authenticated upload to `POST /api/ocr/extract-pdf`.
- Server-side PDF validation for MIME type, `%PDF-` signature, parseability,
  encrypted/password-protected files, upload size, and 1-5 page count.
- Google Vision `DOCUMENT_TEXT_DETECTION` through synchronous
  `batchAnnotateFiles` with inline PDF bytes and explicit pages.
- Page-ordered normalized text with editable extracted-text review before
  reviewer generation.
- PDFs over five pages are rejected, not silently truncated.
- PDF files stay server-bound; Google credentials remain server-only.
- No Cloud Storage, background jobs, polling, local PDF rasterization, Poppler,
  or Ghostscript in this phase.
- Mocked PDF OCR web smoke using a fictional PDF fixture and real reviewer
  generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision PDF OCR.
- Verified that a fictional, image-only, two-page scanned PDF extracted both
  pages in page order.
- Verified that edited PDF OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live PDF OCR-generated reviewer.
- Verified that a separate PDF with more than five pages is rejected safely with
  the expected UI messages instead of being silently truncated.

Remaining Phase 3 deliverables:

- None.

Exit criteria:

- A protected OCR API route accepts image input, validates it, invokes the OCR
  provider boundary, and returns typed extracted text without exposing secrets.
- Fake-client tests prove success, error, size, MIME, and layout-preservation
  behavior.
- The reviewer input flow can use user-reviewed extracted text while manual
  paste remains available.
- Live iPhone camera/image OCR validation passes without exposing Google
  credentials to mobile code or committed files.
- Live iPhone PDF OCR validation passes using a fictional 1-2 page scanned PDF,
  editable OCR text, and reviewer generation.

Immediate dependency: Phase 2 complete.

Known limitation: visible repeated headers and footers in scanned PDFs may be
extracted as source text and become reviewer sections. Users can remove them in
the editable OCR text field. Automatic repeated header/footer detection is
deferred to a later OCR cleanup task.

Immediate next task after Phase 3D: Phase 4 Study Library and Persistence.
Phase 4 is complete and live validated; the next product phase is Phase 5
Canvas Integration.

## Phase 4 - Study Library And Persistence

Status: Complete

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Implemented foundations:

- `reviewers` Supabase migration with owner-scoped RLS policies, timestamps,
  section count, source metadata, and reviewer JSON output.
- Typed reviewer table shapes in `@stay-focused/db`.
- Authenticated Next.js reviewer CRUD API using the caller's bearer token and
  user-scoped Supabase access instead of service-role CRUD.
- Mobile Study Library screen with list, open, rename, delete, refresh, and
  return-to-generator actions.
- Save-to-library action after reviewer generation, preserving editable
  OCR-before-reviewer behavior and storing only safe source metadata.
- Regression-hardened PDF OCR web smoke wait for fast mocked OCR completion.
- Live Supabase verification confirmed the migration is already applied, the
  `public.reviewers` table exists, RLS remains enabled, and owner SELECT,
  INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Live cross-user validation used two distinct Supabase auth users. User A
  created, listed, and opened a reviewer; User B's list excluded it and open,
  rename, and delete attempts returned safe `404 reviewer_not_found` responses.
- Reverse isolation was also validated: User B created and listed a reviewer;
  User A could not list or open it; User B deleted it.
- Cleanup removed both fictional validation reviewers through their owning
  users, and follow-up owner-list/open checks confirmed no validation rows
  remained.
- The Next.js reviewer detail route typing fix aligns `[id]` route params with
  the Promise-based App Router context without changing runtime behavior.
- Consolidated physical Android acceptance on realme RMX3151 / Android 13 now
  covers Maker source modes, Canvas selective preview, pinned readiness-gated
  Generate/Save actions, durable Processing, Reader, save/list/reopen, rename,
  native delete Cancel/Confirm, and in-app/hardware Back. Reopen remains a plain
  persisted read with no regeneration.

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.
- Automated API, mobile, DB typecheck, engine, OCR, and browser smoke
  regression checks pass.
- Live migrated Supabase validation proves save, list, open, rename, delete,
  and cross-user denial against the deployed `reviewers` table.

Immediate dependency: Phase 3 source-ingestion contracts are stable enough to
store source metadata consistently. All Phase 4 external validation gates are
complete.

## Phase 5 - Canvas Synchronization Foundation

Status: Implementation complete through Phase 5F.2. Phase 5E.6 and Product
Recovery R6 acceptance remain partial only for named physical-device checks.
Phase 5A is complete and live validated; Phase 5B.1
academic graph foundation is complete; Phase 5B.2 initial full academic graph
synchronization is complete and live validated; Phase 5B.3A course recovery
hardening is complete and live validated; Phase 5B.3B incremental persistence
is complete and live validated; Phase 5B.3C1 conditional-request capability
audit is complete; Phase 5B.4A planner-item and announcement synchronization
is complete with documented live Canvas limitations; Phase 5C.1 secure file
inventory and bounded ingestion is remotely and live validated with a
documented account-wide synchronous route-duration limitation; Phase 5C.2A1
selected-course synchronization is complete and runtime-safe in local
production-build validation; Phase 5C.2A2 Canvas source selection and reviewer
handoff is complete and live validated; Phase 5C.2B Canvas PDF/image OCR
sources are complete and live validated for preparation, private Storage OCR
preview, edited reviewer handoff, and Study Library cleanup; Phase 5D.1
immutable source snapshots and exact reviewer provenance, Phase 5D.2
structured normalized blocks and selective import, and Phase 5D.3 duplicate
relationships, source freshness, and regeneration readiness are implemented,
remotely verified, and protected-live validated. Phase 5E planning is complete
in `docs/ai/phase5e-grades-submissions-plan-20260708.md`, Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`, and Phase 5E.2
is complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.3
explicit synchronized import is complete and remotely verified, and Phase 5E.4
protected grade APIs are implemented and protected-live validated in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`. Phase 5E.5
mobile assignment and grade experience is complete and locally validated in
`docs/ai/phase5e5-mobile-grade-experience-20260708.md`. Phase 5E.6 and Phase
5F remain planned and must not be collapsed into a single generic Canvas
integration task.

Purpose: Bring Canvas LMS data into Stay Focused as a permission-aware academic
graph that can feed the existing OCR, normalization, provenance, reviewer, and
future schedule/grade-planning boundaries without creating a parallel
generation path.

Immediate dependency: completed Phase 4 persistence and source metadata, plus a
stable source-ingestion contract from Phase 3.

Credential-source boundary: Canvas client, synchronization, and capability
logic must remain independent of whether credentials came from a manually
entered personal access token or a later OAuth flow. The intended model remains
conceptually similar to:

```text
CanvasCredentialProvider
|-- PersonalAccessTokenCredential
`-- OAuthCredential
```

### Phase 5A - Secure Canvas Connection And Capability Discovery

Status: Complete, live validated, and audit-hardened. Direct server-side Canvas
validation, remote Supabase migration/RLS validation, protected API
connect/status/courses/capabilities/disconnect lifecycle, strict encrypted
payload validation, atomic connection/capability persistence, redirect
rejection, and automated two-user authorization tests have passed.

Scope:

- Canvas instance URL
- Canvas personal access token
- API-side credential validation
- AES-256-GCM encrypted credential storage
- Protected connection-status API
- Disconnect support
- Course discovery
- Initial capability registry
- Safe endpoint probes
- User-visible connection and course states

#### Phase 5A Authentication Model

Phase 5A uses user-generated Canvas personal access tokens for development,
capstone demonstrations, controlled testing, and initial user-controlled Canvas
connections. Each Stay Focused user supplies their own personal access token.
There is no shared school-wide token.

Each token is scoped to the Canvas account that generated it and remains subject
to the permissions configured by the institution and course. A token cannot
access school-wide Canvas data, cannot bypass locked, hidden, unpublished, or
permission-restricted content, and must never be shared between Stay Focused
users.

Personal access tokens must be:

- validated before persistence
- encrypted server-side with AES-256-GCM
- stored per Stay Focused user
- excluded from API responses
- excluded from logs and errors
- removable through disconnect
- treated as revocable credentials

Personal access token entry is acceptable for the capstone, development, and
controlled initial deployment, but it is not the preferred permanent
authorization flow for a broad public multi-user release.

Completion criteria:

- A signed-in Stay Focused user can connect Canvas.
- The Canvas profile is validated.
- The token is encrypted before persistence.
- The token is never returned to mobile.
- Courses can be listed.
- Supported and unsupported Canvas capabilities are recorded honestly.

Validation status as of 2026-07-05:

- Direct Canvas HTTPS validation passed through the server-side validation
  script using one developer-owned personal access token from existing ignored
  local credential names.
- Canvas profile returned and normalized successfully.
- Course listing returned 17 courses.
- These results prove only the validating user's available Canvas capabilities;
  they do not prove institution-wide course or endpoint access.
- Live pagination was not exercised because the account did not require a
  second page; automated tests cover ordered pagination and cross-origin
  rejection.
- Enrollments, modules, assignment groups, and planner probes returned
  `available` for that user; capability availability may differ per user,
  course, role, or institution.
- Supabase migration `202607050002_create_canvas_connections.sql` applied
  remotely and read-only checks verified both tables, RLS, and no direct
  `anon`/`authenticated` access to encrypted token columns.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is configured locally as a canonical padded
  Base64 key that decodes to exactly 32 bytes. The helper accepts surrounding
  environment whitespace, rejects malformed or non-canonical key material, and
  validates only when encryption or decryption is used.
- Protected API lifecycle validation passed against `http://localhost:3000`:
  Supabase bearer authentication was acquired for an established smoke-test
  user, `PUT /api/canvas/connection` validated the Canvas profile before
  persistence, 17 courses were returned, 25 capability records were created,
  and connection metadata responses excluded credential fields.
- Encrypted persistence was verified through a server-side database query:
  one connection row existed for the selected user, ciphertext, IV,
  authentication tag, and encryption version were populated, no plaintext PAT
  column was present, ciphertext differed from the submitted PAT, and capability
  rows were scoped to the same user and connection.
- `GET /api/canvas/connection`, `GET /api/canvas/courses`, and
  `GET /api/canvas/capabilities` passed from the stored encrypted credential.
  Capability statuses were `available` and `not_tested`.
- Invalid replacement PAT validation returned the stable token error while
  preserving the existing valid connection.
- `DELETE /api/canvas/connection` removed the selected user's connection and
  dependent capability rows, left saved reviewers unchanged, and final
  connection status returned the disconnected state.
- Automated route tests cover cross-user scoping for connection, courses,
  capabilities, and disconnect behavior. A live second-user validation was not
  run because no separate second test-user credentials were available.
- Phase 5A.2 hardening adds strict canonical Base64 validation for encrypted
  payload fields, the atomic `replace_canvas_connection_with_capabilities` RPC,
  a composite capability ownership foreign key, explicit redirect rejection,
  expanded request validation coverage, and realistic two-user route tests.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for RPC existence, revoked public execution,
  service-role execution, validated ownership constraint, RLS, and revoked
  direct grants.

### Phase 5B - Academic Graph Synchronization

Status: Complete through Phase 5B.4A. Phase 5B.1 is complete as a database and
typed Canvas API foundation. Phase 5B.2 initial full synchronization is complete as a manual,
synchronous route with atomic per-course persistence. Phase 5B.3A recovery
hardening and Phase 5B.3B deterministic incremental persistence are complete.
Phase 5B.3C1 found no useful 304 support for the currently synchronized
endpoint families, so production conditional fetching remains unsupported.
Phase 5B.4A planner-item and announcement synchronization is complete as a
backend-only extension.

#### Phase 5B.1 - Academic Graph Foundation

Status: Complete and remotely verified.

Implemented:

- Supabase migration `202607050004_create_canvas_academic_graph.sql`.
- Tables: `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`.
- Stable Canvas identity constraints for courses, modules, module items, Pages,
  assignment groups, and assignments.
- Composite ownership constraints across `user_id`, `canvas_connection_id`,
  and `course_id`.
- RLS on every academic graph table.
- Direct `anon` and `authenticated` grants revoked to preserve the Phase 5A
  service-role persistence boundary.
- Typed Canvas client methods for courses, modules, module items, Pages, Page
  detail, assignment groups, and assignments.
- Pagination tests for all new collection methods, including later-page
  failures, repeated-link loop protection, and cross-origin next-link
  rejection.

Deferred from Phase 5B.1:

- Full synchronization orchestration
- Scheduled jobs and background workers
- Mobile course screens
- Sync-start API routes
- Announcements, discussions, planner data, quiz metadata, and files/media
  ingestion
- Incremental sync cursors and destructive stale cleanup
- Reviewer generation from Canvas content

Recommended next phase after Phase 5B.3B: Phase 5B.3C - Conditional Canvas
fetching and network-efficiency hardening.

#### Phase 5B.2 - Initial Full Academic Graph Synchronization

Status: Complete, remotely verified, and live validated.

Scope:

- Courses
- Modules
- Ordered module items
- Canvas Pages
- Assignment groups
- Assignments
- Page detail bodies
- Existing assignment quiz metadata fields
- Sync-run history
- Bounded synchronous orchestration
- Per-course atomic replacement
- Stale-child cleanup after complete course snapshots only
- Partial account-sync handling
- Mobile service function without UI

Required source relationships:

```text
Course
|-- Module
|   `-- Module item
|       |-- Page
|       |-- Assignment
|       |-- External URL
|       `-- External tool
|-- Assignment group
`-- Assignment
```

Exit criteria:

- Canvas material is stored as related academic entities, not as a flat file
  list.
- Module order, Page relationships, assignment-group relationships, nullable
  dates, HTML fields, and existing assignment quiz metadata are preserved.
- The authenticated user can manually trigger synchronization through
  `POST /api/canvas/sync`.
- Persistence is atomic per course rather than for the whole Canvas account.
- A partial account sync may commit successful courses while preserving failed
  courses.
- Empty complete snapshots remove stale child rows for that course only.
- Incomplete course fetches and failed RPC calls do not prune existing graphs.
- Repeated full synchronization is idempotent and preserves internal row IDs.
- No background or scheduled synchronization exists yet.
- No mobile synchronization screen exists yet.

Validation:

- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied.
- Remote rollback verification passed through
  `scripts/phase5b2-full-sync-verification.sql`.
- Live protected connection recreation passed through
  `PUT /api/canvas/connection`.
- Two live sync calls returned HTTP 200 with sanitized partial results:
  17 courses discovered, 13 succeeded, 4 failed, 27 modules, 311 module items,
  459 Pages, 18 assignment groups, and 25 assignments.
- The second live sync introduced no duplicates, preserved internal
  identities, kept first-sync timestamps stable, advanced last-sync timestamps,
  and left zero running sync rows.

#### Phase 5B.3A - Course Failure Diagnostics And Recovery Hardening

Status: Complete.

Scope:

- Added migration `202607050007_add_canvas_sync_course_results.sql`.
- Added sanitized per-course sync diagnostics through
  `record_canvas_sync_course_result`.
- Preserved manual synchronous sync and atomic per-course persistence.
- Added operation-specific failure codes and bounded transient retries.
- Preserved course/module-item/Page-detail concurrency limits.
- Confirmed the four previous generic failures are Page-listing
  `resource_not_found` 4xx permanent Canvas limitations, not implementation
  defects.

Validation:

- Remote migration history includes `202607050007`.
- Remote rollback verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Two hardened live sync calls returned HTTP 200 partial results:
  17 courses discovered, 13 succeeded, 4 failed with sanitized
  `canvas_course_pages_failed`, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, and 25 assignments.
- Retry attempts in live validation: 0, because the four failures are
  non-retryable 4xx resource-not-found responses.
- Duplicate identities remained 0, internal identities remained stable, and
  zero sync rows remained running.

#### Phase 5B.3B - Incremental Synchronization Foundation

Status: Complete, remotely verified, and live validated.

Scope:

- Added migration `202607050008_add_canvas_incremental_sync_state.sql`.
- Added `canvas_course_sync_states` with one row per user, Canvas connection,
  and Canvas course identity.
- Added deterministic course-snapshot fingerprints from the normalized
  persistence payload, with version `canvas-course-snapshot-v1`.
- Added `full` and `incremental` sync modes and `unchanged` course results.
- Added service-role-only RPCs for mode-aware run creation, changed-course
  graph replacement plus state advancement, unchanged-course recording, and
  failed-course metadata.
- Preserved the Phase 5A credential boundary and Phase 5B.2 per-course
  atomicity.

Validation:

- Remote migration history includes `202607050008`.
- Remote rollback verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- A full live baseline returned HTTP 200 partial with 17 courses discovered,
  13 changed/succeeded, 0 unchanged, 4 Page-listing failures, 13 graph
  replacements, and zero running sync rows.
- Two immediate incremental live runs returned HTTP 200 partial with 13
  unchanged courses, 0 changed courses, 4 Page-listing failures, 0 graph
  replacements for unchanged courses, deterministic fingerprints, stable graph
  timestamps, no duplicate identities, and zero running sync rows.

Deferred from Phase 5B.3B:

- Endpoint-level conditional requests
- ETag and Last-Modified support
- Secondary Canvas resources
- Scheduled/background synchronization
- Mobile synchronization UI
- Reviewer generation from Canvas content

#### Phase 5B.3C - Conditional Canvas Fetching And Network-Efficiency Hardening

Status: Audit complete for Phase 5B.3C1. Production conditional fetching is
not implemented.

Scope:

- Investigate Canvas endpoint support for conditional requests.
- Add ETag or Last-Modified handling only where reliable per endpoint.
- Measure whether request count, bandwidth, or duration improves.
- Preserve deterministic persistence and safe failure behavior from Phase
  5B.3B.
- Avoid claiming delta synchronization where Canvas cannot provide a reliable
  cursor.

Phase 5B.3C1 audit result:

- A local ignored harness audited active course listing, modules, module items,
  Pages, Page details, assignment groups, and assignments using the stored
  encrypted Canvas connection.
- Production sync behavior was unchanged; no sync runs, graph writes,
  validator persistence, raw response caching, or migrations were added.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match primary conditional requests returned HTTP 200 with full
  bodies for every audited endpoint; no 304 responses were observed.
- Baseline and conditional body bytes were both 154,503, so observed body-byte
  reduction was 0%.
- One paginated Page collection included a later page, confirming that any
  future conditional design would need independent per-page validator and
  pagination state.
- Page-list validators cannot be treated as proof that Page-detail bodies are
  unchanged.
- Module lists, module-item lists, assignment groups, and assignments require
  separate state if future evidence ever supports conditional requests.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.

Decision:

- Outcome C: no useful validator support was observed.
- Do not implement Phase 5B.3C2 for the currently synchronized endpoint
  families.
- Continue ordinary GET behavior for courses, modules, module items, Pages,
  Page details, assignment groups, and assignments.
- Do not invent validators and do not skip requests based only on
  course-level fingerprint state.

#### Phase 5B.4 - Secondary Canvas Resource Synchronization

Status: Phase 5B.4A complete, remotely verified, and live validated with
documented permanent Canvas limitations.

Scope:

- Select each secondary Canvas resource family only after explicit product and
  security review.
- Continue using the per-user credential boundary, service-role persistence,
  sanitized diagnostics, and failure-preservation rules established in Phase
  5A through Phase 5B.3C1.
- Keep production conditional fetching out unless future evidence shows
  reliable 304 behavior.
- Continue not treating Page-listing 404 failures as successful empty-Page
  collections.

##### Phase 5B.4A - Planner Items And Announcements

Status: Complete, remotely verified, and live validated with a documented
partial result.

Scope:

- Canvas planner-item retrieval through `GET /api/v1/planner/items`.
- Canvas announcement retrieval through per-course
  `GET /api/v1/announcements` calls.
- A deterministic rolling sync window: 30 days in the past and 120 days in the
  future, captured from one run timestamp.
- Typed Canvas client methods, repeated `context_codes[]` query serialization,
  ordinary authenticated GET behavior, trusted pagination, redirect rejection,
  and bounded transient retry behavior.
- Normalized planner and announcement payloads with deterministic source
  fingerprints and without unrestricted nested Canvas payload retention.
- Tables `canvas_planner_items` and `canvas_announcements`.
- Service-role-only snapshot RPCs for planner and per-course announcement
  persistence.
- Insert/update/unchanged/pruned accounting and safe scoped pruning only after
  a complete authoritative snapshot is fetched.
- Aggregate-only route summaries and mobile service parsing without UI.

Validation:

- Remote migrations `202607060001` and `202607060002` are applied.
- Remote rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Protected live validation used the existing encrypted Canvas connection.
  The first run returned HTTP 200 `partial`, discovered 37 planner items and
  27 announcements, inserted 37 planner items and 19 announcements, preserved
  four known Page-listing limitations, and left zero running sync rows.
- The second run returned HTTP 200 `partial`, classified 37 planner items and
  19 announcements as unchanged, preserved stable identities, produced zero
  duplicates, zero unnecessary updates, zero unexpected pruning, stable failure
  categories, and zero running sync rows.
- The four known Page-listing failures remain non-retryable
  `canvas_course_pages_failed` `resource_not_found` 4xx limitations.
- Four announcement persistence scopes remain partial for the same unavailable
  course graphs and are reported as sanitized
  `canvas_announcement_persistence_failed` diagnostics without pruning.

Deferred from Phase 5B.4A:

- Discussion entries, discussion replies, and general discussion-topic
  synchronization.
- Quiz details and quiz-question metadata.
- Planner-note creation, planner-note editing, and planner-override mutation.
- Submission, grade, rubric, and feedback synchronization.
- File, attachment, announcement-attachment, and media ingestion.
- Canvas webhooks, scheduled synchronization, background jobs, resumable jobs,
  queues, mobile synchronization UI, source-selection UI, notifications, and
  reviewer generation from Canvas data.

### Phase 5C - File, Attachment, And Media Ingestion

Status: Complete through Phase 5C.2B. Phase 5C.1 secure file inventory and
bounded selected-file ingestion is remotely and live validated for backend behavior, private Storage,
and second-run stability. The account-wide synchronous metadata sync route
remains over its configured runtime budget in local production-build
measurement, so deployed production-runtime readiness is not claimed for that
diagnostic route. Phase 5C.2A1 selected-course synchronization is complete,
uses independent course-scoped requests, and stayed within the 60-second
per-course budget in protected live validation. Phase 5C.2A2 Canvas source
selection and reviewer handoff is complete and live validated. Phase 5C.2B
Canvas PDF/image OCR sources are complete and live validated for preparation,
private Storage OCR preview, edited reviewer handoff, and Study Library
cleanup. Phase 5D.1 immutable source snapshots, Phase 5D.2 structured
normalized blocks, and Phase 5D.3 duplicate relationships, source freshness,
and regeneration readiness are implemented, remotely verified, and
protected-live validated. The historical Phase 5E next-step text is superseded:
Phase 5E.1 through 5E.5 are implemented, and Phase 5E.6 remains partial only
for physical-device acceptance.

#### Phase 5C.1 - Secure File Inventory And Bounded Ingestion Foundation

Status: Remotely and live validated for backend behavior; production-runtime
safe status is partial because the synchronous sync route exceeds its
configured 60-second budget.

Implemented:

- Canvas file metadata listing and single-file metadata lookup in
  `@stay-focused/canvas`.
- Bounded Canvas file download support with manual redirect handling,
  off-origin bearer stripping, unsafe host rejection, timeout enforcement, and
  content-length/stream byte caps.
- Central file policy shared with existing OCR limits: 10 MiB per file, 3 files
  per ingestion request, and 15 MiB aggregate stored bytes per ingestion
  request.
- Metadata-only or blocked classification for media, unsupported formats,
  dangerous MIME/extension combinations, archives/containers, locked files,
  hidden files, unavailable files, and oversized files.
- `canvas_files`, `canvas_file_references`, and
  `canvas_file_ingestion_results` migration foundation.
- Private Supabase Storage bucket `canvas-source-files` with restrictive
  policies denying direct `anon` and `authenticated` object access.
- Service-role-only RPCs for file inventory replacement and sanitized ingestion
  result recording.
- `POST /api/canvas/sync` file inventory for successful course graphs, with
  module-item references and Canvas file links discovered from Page,
  assignment, and announcement HTML.
- `POST /api/canvas/files/ingest` for authenticated selected file-row ids,
  fresh metadata lookup before download, content signature validation, private
  storage upload, stale-object cleanup, and sanitized per-file terminal
  results.
- Mobile sync response parsing for aggregate `files` and `fileReferences`
  counts without adding UI.
- Remote migrations `202607060003` and `202607060004` are applied.
- Supabase security and performance advisors were reviewed; new Phase 5C.1
  foreign-key index warnings were fixed by `202607060004`.
- Private Storage access controls passed: public, anonymous, authenticated
  arbitrary, and cross-user object access were denied while trusted server
  access worked.
- Protected live ingestion stored two eligible selected files, recorded one
  metadata-only result, and preserved stable object pointers on the second
  ingestion with zero additional bytes stored.
- Protected live metadata sync remained aggregate-only and metadata-only for
  files, but measured 72.294 seconds and 65.355 seconds in local
  production-build validation against `maxDuration = 60`.

Still deferred from Phase 5C.1:

- Text extraction from Canvas files.
- OCR over Canvas files.
- Parser registry and parser-version tracking.
- PowerPoint, Word, spreadsheet, HTML, caption, and media parsers.
- Mobile file-selection, source-preview, and selective-import UI.
- Reviewer generation from Canvas file contents.
- Background/resumable ingestion jobs.

Verification:

- Canvas package tests: 50/50.
- API tests: 184/184.
- Mobile tests: 79/79.
- OCR tests: 14/14.
- Root typecheck/build/tests: 7/7 workspaces.

#### Phase 5C.2A1 - Course Selection And Runtime-Safe Canvas Synchronization

Status: Complete. Remotely verified and protected-live validated.

Implemented:

- `GET /api/canvas/courses` now returns a Canvas course inventory with
  metadata-based presentation categories: likely current, past or concluded,
  other or uncertain, and unavailable.
- Course names are display data only, not authoritative exclusion rules.
- `canvas_course_sync_preferences` stores selected-course choices separately
  from the course inventory with stable identities, composite ownership,
  RLS, revoked direct client grants, and service-role-only RPCs.
- Deselecting a course disables future normal selected-course synchronization
  but does not delete synchronized graph data, file metadata, stored objects,
  or sync history.
- `POST /api/canvas/courses/:courseId/sync` synchronizes one selected internal
  course row through the existing shared course synchronization path.
- Course-scoped sync covers course-owned graph data, announcements, file
  metadata, and file references, but intentionally excludes user-wide planner
  synchronization.
- Normal mobile synchronization uses selected course IDs and a maximum
  concurrency of two independent course-scoped requests.
- Per-course mobile status distinguishes unsaved selection changes, running,
  success, partial, failed, deselected, and unavailable states.
- Academic-unit synchronization limit: none.

Validation:

- Remote migration `20260706113150` is applied and rollback-safe SQL
  verification passed.
- Supabase security and performance advisors produced no new Phase 5C.2A1
  findings.
- Protected live inventory returned 76 course shells: 15 likely current,
  59 past or concluded, 2 other or uncertain, and 0 unavailable.
- Two likely-current courses were selected, persisted, restored after reload,
  synchronized independently, deselected, and reselected without duplicate
  identities or destructive cleanup.
- First selected-course sync durations were 6.052 seconds and 8.492 seconds.
  Second selected-course sync durations were 5.833 seconds and 7.849 seconds.
- The account-wide route was not called by the normal selected-course mobile
  flow.

Still deferred from Phase 5C.2A1:
- Parser/OCR expansion for Canvas file contents.
- Background, scheduled, resumable, or queued synchronization.
- Canvas OAuth and broader Canvas resource families.

#### Phase 5C.2A2 - Canvas Source Selection And Reviewer Handoff

Status: Complete and protected-live validated.

Implemented:

- Protected `GET /api/canvas/courses/:courseId/sources` for selected,
  synchronized, owned internal course rows.
- Source descriptors over existing synchronized Canvas tables for Pages,
  assignment descriptions, announcements, and unavailable file metadata.
- Safe course freshness summary with terminal sync status, completed timestamp,
  partial flag, sanitized failure categories, and synchronized-source
  availability.
- Deterministic descriptor ordering: available first, then Page, Assignment,
  Announcement, File, then sanitized title and internal id.
- Bounded source listing with pagination-ready metadata.
- Protected `POST /api/canvas/courses/:courseId/sources/preview` that validates
  ordered internal source ids, rejects duplicates, cross-course ids, unknown
  ids, unavailable files, unsupported types, and over-limit selections.
- Server-side `parse5` HTML-to-text normalization preserving readable
  structure while removing hidden/executable content, URLs, signed parameters,
  bearer tokens, and token-like strings.
- Preview limits that fit inside the existing reviewer request limit:
  8 sources, 20,000 characters per source, 90,000 combined preview characters,
  120-character suggested title, and 100,000-character reviewer request limit.
- Mobile `Create reviewer from Canvas` entry point for saved selected courses
  with terminal sync history.
- Mobile source picker sections for Pages, Assignments, Announcements, and
  Files, with unavailable files disabled.
- Editable Canvas preview text and title before generation.
- Existing reviewer-generation API reuse with only `sourceText` and
  `sourceTitle`.
- Existing Study Library save flow reuse with minimal `sourceMode: "canvas"`
  metadata.
- No migration, no new reviewer engine, no file parsing/OCR, no automatic sync,
  and no full persistent provenance table.

Exit criteria:

- Canvas provides visible student value in mobile before more Canvas resource
  families are added.
- Partial sync failures are understandable without exposing raw Canvas errors,
  course names, filenames, URLs, object keys, hashes, or private content.
- Reviewer generation still receives user-reviewed source text through the
  existing generation boundary.

Validation:

- API source service tests passed with 11/11 cases, covering normalization,
  limits, selected-course lookup, unavailable files, duplicate rejection,
  cross-course rejection, and no token-column selection.
- API route tests for source list and preview passed with 10/10 cases.
- Mobile Canvas API service tests passed with 22/22 Canvas source cases.
- Package verification passed for Canvas, DB, API, mobile, engine, and OCR.
- Protected live validation used opaque `live-course-1` and aggregate-only
  output: 49 descriptors, 36 available Pages, 2 unavailable Pages, 11 available
  announcements, 0 available assignments, no source bodies in listing, ordered
  two-source preview with 3,467 characters, deterministic assembly, empty-source
  rejection, cross-course rejection, no URLs or credentials, and no
  Canvas/Storage/OCR/OpenAI calls during preview.
- Reviewer-generation smoke reused the existing reviewer API, returned HTTP
  200, generated 2 sections, saved to Study Library, verified list visibility,
  and deleted the smoke reviewer.
- Expo Web UI smoke selected two Canvas sources, loaded preview, edited source
  text and title, returned to source selection with selection preserved, and
  reloaded preview.

Still deferred from Phase 5C.2A2 and completed by Phase 5C.2B:

- Canvas PDF extraction.
- Canvas image OCR.

Still deferred after Phase 5C.2B:

- Office parsing.
- audio/video transcription.
- full persistent Canvas source provenance.
- background, scheduled, resumable, or queued synchronization.
- tasks and schedule generation.
- Canvas OAuth.
- broader Canvas resource support.

#### Phase 5C.2B - Canvas PDF And Image Extraction/OCR Integration

Status: Complete and protected-live validated.

Implemented:

- Safe Canvas file-state descriptors for ready, not prepared, failed,
  blocked, unsupported, and unavailable files without returning Storage fields,
  Canvas URLs, hashes, raw MIME internals, or credentials.
- Course-scoped `POST /api/canvas/courses/:courseId/sources/prepare` that
  accepts only owned `file:<internal-row-id>` descriptors and delegates to the
  existing `ingestCanvasFiles` boundary.
- Shared API-side OCR validation/extraction helpers reused by manual image/PDF
  OCR routes and Canvas stored-file extraction.
- Stored-file extraction from server-resolved owned rows only, with private
  bucket, object-key shape, byte count, SHA-256, MIME/signature, PDF
  parseability, encrypted-PDF, and page-limit validation before OCR.
- Source preview support for one OCR-backed PDF/image file mixed with Pages,
  assignment descriptions, and announcements while preserving submitted picker
  order.
- Mobile source-picker prepare/ready/failed/unsupported states, one-file
  selection guard, and honest extraction loading copy.
- No extracted-text persistence, no Canvas call or PAT decryption during
  preview, no signed URLs or raw bytes returned to mobile, and no Canvas
  metadata sent to OpenAI.

Validation:

- Canvas package typecheck/build/tests: 52/52.
- DB package typecheck: passed.
- OCR package typecheck/build/tests: 14/14.
- API typecheck/build/tests: 269/269.
- Mobile typecheck/tests: 92/92.
- Engine typecheck/build/evals: 266/266.
- Root Turbo typecheck/build: 7/7 tasks, 5 cached and 2 fresh.
- Workspace tests: API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14.
- Protected live validation checked 2 selected synchronized courses, found 0
  eligible PDFs and 2 eligible images, prepared opaque `live-file-1`, reran
  preparation idempotently, previewed Page -> Image -> Announcement with 1
  OCR-backed source and 62 extracted image characters, returned no private
  Storage or credential fields, generated and saved a reviewer from harmless
  edited text, verified Study Library visibility, and deleted the validation
  reviewer. An exploratory generation attempt including the very short/noisy
  live OCR preview text returned the existing `reviewer_validation_failed`
  response.

#### Later Phase 5C Parser And Source Import Work

Scope:

- PDF with embedded text
- Scanned PDF through the existing OCR boundary
- PowerPoint `.ppt` and `.pptx`
- Word `.doc` and `.docx`
- Images
- Plain text
- HTML
- Supported spreadsheet text
- Assignment attachments
- Discussion attachments
- Announcement attachments
- Canvas-hosted media captions when available
- Unsupported format handling
- File-size and page-count limits
- Parser registry
- Partial-failure reporting

Required ingestion flow:

```text
Canvas discovery
-> metadata record
-> authorized file download
-> MIME and extension detection
-> parser or OCR selection
-> structured text extraction
-> normalized source blocks
-> editable preview
-> confirmed import
-> reviewer generation
```

Exit criteria:

- Canvas file discovery does not bypass the existing OCR, normalization,
  grounding, or reviewer validation boundaries.
- Unsupported files and partial failures are visible without blocking unrelated
  synchronized records.

### Phase 5D - Source Normalization, Provenance, And Selective Import

Status: Complete through Phase 5D.3 and protected-live validated for Phase
5D.1 through Phase 5D.3 on 2026-07-08. Phase 5D.1 is implemented and remotely
verified as the immutable source-snapshot and exact reviewer-provenance
foundation. Phase 5D.2 is implemented and remotely verified as the structured
normalized-block and selective-import slice. Phase 5D.3 is implemented as
duplicate relationships, source freshness, and regeneration readiness without
actual regeneration. Remote Phase 5D.3 verification passed with migrations
`202607080001_add_canvas_source_relationships_freshness.sql` and
`202607080002_harden_source_relationship_grants.sql`, plus 18/18 rollback-safe
SQL verifier checks; protected live validation passed with aggregate opaque
output only; remaining Supabase advisor warnings are historical.

Subphases:

- Phase 5D.1 - Immutable Source Snapshots And Exact Reviewer Provenance:
  private preview sessions, exact edited source snapshots, ordered snapshot
  items, parser/OCR version identifiers, database-enforced reviewer ownership
  linkage, safe detail summaries, no historical reviewer backfill, and no
  provenance sent to OpenAI.
- Phase 5D.2 - Structured Normalized Blocks And Selective Import:
  private short-lived structure sessions, heading/list/table/OCR block models,
  page ordering where available, safe public block selectors, bounded
  user-selectable blocks before generation, selected-block preview manifests,
  immutable snapshot block provenance, and no provenance sent to OpenAI.
- Phase 5D.3 - Duplicate Relationships, Source Freshness, And Regeneration
  Readiness: same-source and exact-content duplicate detection, repeated Canvas
  reference summaries, immutable relationship provenance, protected
  current-versus-snapshot source-status checks, conservative
  missing-after-sync semantics, unsupported-source reporting, and readiness
  assessment without actual regeneration.

Scope:

- Structure preservation
- Headings
- Bullet hierarchy
- Tables
- Pages
- Slide numbers
- Module order
- Source snapshots
- Source versions
- Content hashes
- Parser versions
- OCR versions
- Selective import
- Editable source preview
- Deduplication
- Repeated-source relationships
- Stale-source handling
- Deleted-source handling
- Unsupported-source reporting

Every normalized source must preserve provenance such as:

```text
Stay Focused user ID
Canvas connection ID
Canvas course ID
Canvas module ID
Canvas module-item ID
Canvas source-object ID
source type
source title
file name
MIME type
page or slide number
Canvas URL
Canvas updated timestamp
local synchronized timestamp
content hash
parser version
OCR version
```

Exit criteria:

- A reviewer remains linked to the exact source snapshot used during
  generation. Phase 5D.1 satisfies this foundation for the current Canvas
  reviewer path.
- Users can preview and selectively import source material before it reaches the
  reviewer engine. Phase 5D.2 satisfies this for the current Canvas reviewer
  path using server-held block manifests and selected-block snapshots.
- Saved Canvas reviewers can be checked against current synchronized source
  state with conservative current/changed/unavailable/unsupported/missing/unknown
  results and a regeneration-readiness summary. Phase 5D.3 satisfies this as
  assessment only; actual reviewer regeneration remains out of scope.

### Phase 5E - Grades, Submissions, Rubrics, And Feedback Foundation

Status: Implemented through Phase 5E.5. Phase 5E.6 automated, protected API,
and Expo Web validation is complete; physical iPhone acceptance remains
partial. The implementation-ready plan is recorded in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`. Phase 5E.1 is complete
in `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`: database
tables, normalized data contracts, DB types, remote migration verification, and
rollback-safe SQL verification are done. Phase 5E.2 is complete in
`docs/ai/phase5e2-canvas-grade-client-20260708.md`: typed read-only Canvas
client methods, normalized assignment/submission/course-grade provider
contracts, explicit visibility wrappers, pagination/error coverage, and
unsafe-field discards are done. Phase 5E.3 is implemented and locally validated
in
`docs/ai/phase5e3-explicit-grade-sync-20260708.md`: an internal explicit
service can synchronize one owned selected course into the Phase 5E.1
assignment/submission and visible-summary tables with service-role-only RPCs,
deterministic fingerprints, sync-state transitions, and failed-family
preservation. Remote Supabase verification is complete: migrations
`202607080005_add_canvas_grade_sync_rpcs.sql` and
`202607080006_harden_canvas_grade_sync_rpc_function_references.sql` are applied
remotely, RPC execution is service-role-only, RLS/direct grants remain
hardened, the rollback-safe verifier passed 17/17 checks, and no fictional rows
remain. Phase 5E.4 is implemented in
`docs/ai/phase5e4-protected-grade-api-20260708.md`: protected API routes now
allow explicit selected-course grade sync, paginated assignment/submission
list, assignment detail, Canvas-provided visible course summary, and sync-status
reads. The sync route delegates to Phase 5E.3; all GET routes are database-only
and return `Cache-Control: no-store`. Phase 5E.5 is complete and locally
validated in `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: mobile now
adds selected-course `Grades` entry points, strict grade API client parsers,
GET-only initial loading and reload behavior, explicit per-course grade sync,
course summary display, assignment pagination, safe assignment detail loading,
status presentation, stale/partial/failed copy, and in-memory-only
network-failure preservation. Synchronization is manual and per selected course
only, Canvas access remains read-only, and no background job, notification,
durable grade cache, local grade calculation, submission write, private
submission-content storage, or reviewer prompt integration exists.
Phase 5E.6 is partial in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed. Physical iPhone Expo Go validation
remains required before Phase 5E.6 and Phase 5E can be marked complete.
Phase 5E.4 protected live validation is complete in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`; the closeout
fixed the sync route course-scope preflight so unknown valid course UUIDs return
safe `404` and owned but unselected courses return safe `400` before Canvas
synchronization.

MVP boundary:

- Strictly read-only selected-course assignment, submission, and visible grade
  state.
- Explicit per-course synchronization only; Canvas calls happen only in the
  sync route.
- DB-only mobile read routes over synchronized state.
- Canvas-provided visible course grade summaries only when returned by Canvas.
- No unofficial local grade calculation or weighted estimate.
- No notification delivery, background jobs, cron, queues, submission writes,
  uploads, comments, grade edits, or reviewer prompt use.

Scope:

- Visible current course score
- Visible final course score
- Displayed grades
- Assignment groups
- Assignment-group weights
- Drop rules
- Grading periods
- Assignments
- Points possible
- Grading type
- Submission scores
- Submission state
- Attempt number
- Missing state
- Late state
- Excused state
- Omitted-from-final-grade state
- Rubric definitions
- Rubric assessments
- Instructor comments
- Feedback attachments
- Learning outcomes when permitted
- Grade snapshots
- Canvas hidden-grade behavior

MVP subphases:

- Phase 5E.1 - Data contract and database foundation (complete)
- Phase 5E.2 - Canvas assignment/submission client support (complete)
- Phase 5E.3 - Explicit synchronized import (complete and remotely verified)
- Phase 5E.4 - Protected API read model (complete and live validated)
- Phase 5E.5 - Mobile assignment and grade experience (complete and locally validated)
- Phase 5E.6 - Protected live validation and hardening (automated/protected
  validation complete; physical iPhone acceptance pending)

Roadmap result: Phase 5E.6 - partial for physical-device acceptance only.
Product Recovery Phases R1, R2, and
R3 are complete and documented in
`docs/ai/product-recovery-r1-v1-audit-20260713.md`,
`docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`, and
`docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

Historical next step at that checkpoint was Product Recovery Phase R4; R4 and
R5 are now complete and R6 remains partial.

Exit criteria:

- Grade and submission records remain separate from reviewer source content.
- Grades never automatically enter reviewer-generation prompts.
- Hidden or incomplete Canvas grading information is represented honestly.
- Phase 5E.1 through Phase 5E.5 are complete. Phase 5E.6 automated,
  protected API, and Expo Web validation passed; physical iPhone Expo Go
  validation remains before Phase 5E can be marked complete.

## Product Recovery

Status: Partial. Phases R1 through R5 are complete; R6 automated acceptance is
complete and its physical-device matrix remains open.

Product Recovery Phase R5 - Complete.

Purpose: Restore practical student usefulness while preserving the stronger V2
architecture. V1 is the behavioral benchmark; V2 is the security,
maintainability, privacy, and mobile architecture benchmark.

Phase R1 result:

- Completed `docs/ai/product-recovery-r1-v1-audit-20260713.md`.
- Located and inspected the V1 repository without modifying it.
- Compared V1 and V2 reviewer generation, OCR, Canvas source resolution,
  mobile workflow, security, and maintainability behavior.
- Identified V2 safeguards that must remain: authentication, RLS, encrypted
  Canvas credentials, server-only OCR/OpenAI credentials, protected Canvas APIs,
  private source snapshots, provenance, strict parsers, grade/reviewer
  separation, and privacy-preserving validation docs.
- Identified product restrictions that are blocking usefulness: the five-page
  OCR ceiling, incomplete page coverage handling, all-or-nothing reviewer
  assembly, narrow Canvas source eligibility, ambiguous sync/capability copy,
  and a workflow that exposes too many implementation gates to students.

Phase R3 result:

- Completed `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.
- Centralized the synchronous five-page PDF limit and documented the Google
  Vision `files:annotate` constraint behind it.
- Added one authoritative verifier for expected count, exact unique page
  coverage, range, terminal states, explicit blank pages, deterministic order,
  and source eligibility.
- Gated manual and Canvas-backed OCR so incomplete extraction returns safe
  diagnostics and cannot reach reviewer generation.
- Preserved R2 at 287/287 engine evaluations and protected-live validated all
  five accepted pages with coverage, grounding, and leakage passing.

Phase R4 result:

- Enforced one authoritative `usable`, `empty`, `unsupported`, `inaccessible`,
  or `failed` Canvas content boundary.
- Kept metadata and incomplete OCR out of reviewer text and added current-row,
  selection, fingerprint, and preview-session generation gates.

Phase R5 result:

- Recovered the selected-course student journey with authoritative ordering,
  safe capability states, explicit preparation/checking, exact editable
  preview, existing reviewer generation, and snapshot-bound save.
- Added continuous bounded source pagination, complete stale-state clearing,
  duplicate-request prevention, accessible progress, and the parchment/gold
  flat-content visual hierarchy.
- Protected R5 validation passed live generation/save/cleanup and stored-file
  resolution; unsupported, inaccessible, and stale scenarios made zero
  reviewer calls.

Recovery roadmap:

- Phase R2 - Reviewer reliability and fallback redesign (complete; 287/287 engine evals and protected Canvas HTTP 200 with validated limited fallback output).
- Phase R3 - Full-document OCR with page completeness (complete; exact page coverage enforced, OCR 25/25, API 391/391, mobile 130/130, protected five-page extraction 5/5 with reviewer validation passing).
- Phase R4 - Canvas usable-content resolution (complete; typed terminal states, exact content-only normalization, current fingerprint gate, and zero reviewer calls for non-usable sources).
- Phase R5 - Simplified student workflow (complete; module ordering, safe capability presentation, staged single-source preview/generation/save, pagination, stale invalidation, and protected end-to-end validation).
- Phase R6 - Real-device product acceptance (partial; automated checks pass,
  physical iPhone checks remain).

Remaining recovery task: Phase R6 physical iPhone acceptance.

Historical note: Phase 5F was pending when this recovery roadmap was written.
Phase 5F.1 and 5F.2 are now complete and hosted validated as recorded at the
top of this roadmap.

### Phase 5F - Incremental And Resilient Synchronization

Status: Complete through Phase 5F.2 and hosted validated. The original scope
below is retained as the planning record; physical release spot-checks remain
acceptance debt rather than implementation work.

Scope:

- Incremental updates
- Canvas `updated_at` handling
- Content hashing
- Idempotent upserts
- Per-course checkpoints
- Per-item sync status
- Resumable synchronization
- Pagination
- Low-concurrency queues
- Retry behavior
- `429` handling
- Retry-after handling
- Stale records
- Deleted Canvas objects
- Locked or unpublished objects
- Partial failures
- Synchronization history
- Background synchronization
- User-visible sync health

Supported item states:

```text
discovered
synced
metadata_only
locked
unpublished
permission_denied
external
unsupported_format
download_failed
parse_failed
ocr_failed
stale
deleted_from_canvas
temporarily_failed
```

Exit criteria:

- Synchronization is idempotent, resumable, low-concurrency, and transparent
  about partial failures.
- Users can see sync health without seeing raw Canvas errors or secret data.

### Future Phase - Canvas OAuth Production Authorization

Status: Future. Not implemented.

Purpose: Replace or supplement manual personal access token entry with the
intended production authorization path for broad multi-user Canvas deployment.

Scope:

- institution-approved Canvas Developer Key
- OAuth authorization redirect
- Canvas authorization-code exchange
- per-user OAuth access tokens
- refresh-token handling where supported
- token refresh and expiration
- encrypted server-side token storage
- connection revocation
- OAuth state validation
- redirect URI validation
- migration from manually entered PAT connections
- institution-specific configuration
- capability revalidation after OAuth connection

Stay Focused does not currently possess a Canvas Developer Key. A Developer Key
is controlled by the Canvas institution or administrator, so OAuth cannot be
fully implemented for the school instance until such a key is approved.

OAuth is required before presenting the Canvas integration as a broadly
deployable public production authorization system. Phase 5A personal access
token support remains useful as a capstone and controlled deployment path, but
OAuth is not merely an optional hardening step.

### Future Phase - Grade Goal Planner

Status: Future.

Grade Goal Planner - Allow students to set a desired course grade, such as
90%, and calculate what scores they need on remaining activities using
synchronized Canvas grades, assignment weights, points, submissions, grading
rules, and editable manual assumptions.

Future planner requirements:

- Target-grade input
- Total-points courses
- Weighted assignment-group courses
- Grading periods
- Dropped-score rules
- Excused assignments
- Omitted assignments
- Extra credit
- Hypothetical scores
- Minimum required score
- Feasibility detection
- Best-case projection
- Worst-case projection
- "What happens if" scenarios
- Highest-impact remaining activity
- Manual correction when Canvas data is incomplete
- Confidence labels
- Optional Canvas What-If Grades verification when supported

Authorization relationship: the planner must consume only grade and assignment
data visible through the connected user's own Canvas credentials, whether the
credential source is the current per-user PAT model or the future OAuth model.
It must not require or assume a school-wide Canvas credential.

Required confidence states:

```ts
type GradeProjectionConfidence =
  | "exact_from_visible_canvas_rules"
  | "verified_with_canvas_what_if"
  | "estimated_from_visible_data"
  | "manual_configuration_required"
  | "insufficient_data";
```

Future grade projections must not be described as exact when grading
information is incomplete or hidden.

### Future Phase - Student Intelligence Features

Status: Future.

Later roadmap group:

- Missing-work recovery plans
- Announcement digests
- Deadline-conflict detection
- Professor-feedback summaries
- Rubric weakness detection
- Outcome-based study planning
- Course-progress dashboards
- Transcript-based reviewers
- Searchable lecture captions
- Offline course packs
- Course-wide semantic search
- Recently viewed material
- "Continue where you left off"

Permission-dependent features must be marked honestly. Successful Canvas course
access does not imply access to inbox messages, recent history, captions,
quiz questions, grades, outcomes, or external-tool content.

## Phase 6 - Tasks And Study Schedules

Status: In progress; route foundation and replanning backend are hosted
accepted, with task/schedule mobile surfaces remaining.

Purpose: Expand from reviewer generation into schedule-first planning and
actionable study sessions.

Major deliverables:

- Task generation
- Due-date awareness
- Schedule generation
- Calendar-first planning
- Canvas deadline integration
- Actionable study sessions

Exit criteria:

- Source material and deadlines can produce user-actionable tasks.
- Generated study sessions fit into schedule-first planning.
- Canvas deadlines can inform task and schedule generation when Canvas is
  connected.

Immediate dependency: Phase 5 Canvas integration and Phase 4 saved content.

## Phase 7 - Polish, Deployment, And Thesis Validation

Status: Pending

Purpose: Validate the app as a polished, deployable capstone product rather
than only a local development slice.

Major deliverables:

- Completed mobile OAuth flows
- Deployed API validation
- Accessibility
- Navigation and UI polish
- Performance testing
- User testing
- Thesis evidence
- Production readiness

Exit criteria:

- Production deployment is validated with safe environment separation.
- Mobile auth flows are complete, including OAuth redirects if kept in scope.
- Accessibility, performance, and user-testing evidence are documented.
- Thesis evidence reflects the implemented product accurately.

Immediate dependency: Phases 3 through 6 complete enough to validate an end-to-end
student workflow.
