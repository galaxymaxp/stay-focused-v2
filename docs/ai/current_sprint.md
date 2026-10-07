# Current Sprint

## Autopilot policy installation (2026-10-08)

Installed root [AUTOPILOT.md](../../AUTOPILOT.md) from the supplied Downloads package, retaining finite scope, fresh evidence, scoped commits, bounded retries and truthful stopping rules. Root AGENTS.md points to it; its source-of-truth order, invariants and existing content remain intact. Repository verification commands were added using the live workspace scripts and ADR-001/ADR-011 conventions. This is documentation-only setup; no implementation, deployment, migration, provider call or app test was performed.

Live baseline: `C:/Projects/stay-focused-v2`, branch `main`, HEAD `d0020a228fd90c1f06807f52ed19895822a0f1bd`, remote `origin` = `https://github.com/galaxymaxp/stay-focused-v2.git`, upstream `origin/main`; **53 ahead / 0 behind the locally recorded upstream** (no fetch or remote-freshness claim). Git identity remains the existing repository owner. The OneDrive directory supplied as environment cwd is not a Git checkout. Sixteen tracked modifications and 111 untracked leaf files were present; only the three planning documents overlap, and only this installation's sections are staged.

**Scope selection: awaiting owner decision; no roadmap execution scope has been approved by this installation.** The latest matching section recommends intentional incomplete Quiz finalization / “Finish Anyway” semantics. The separate B25.3.2 report explicitly labels B25.3.3 a recommendation only, retains real-source production acceptance as unaccepted, and prohibits B26. Neither recommendation is silently promoted to approval. Existing Matching/local-progress PASS and B25 PARTIAL statuses remain unchanged.

Available finite choices are recorded below. The owner has been asked which one to freeze; later scopes, web migration, B26–B28, production publication and unbounded paid retries are excluded unless separately authorized.

| Candidate scope (not approved yet) | Endpoint / mandatory acceptance to record on selection | First eligible task after selection |
| --- | --- | --- |
| Intentional incomplete Quiz finalization / “Finish Anyway” only | Define and implement explicit intentional completion, unanswered scoring and feedback-release semantics; prove shared/API/SQL/mobile behavior, reload/history/progress, owner isolation, no accidental completion, and choice/Matching regressions; reconcile docs and commit; stop there | Define the completion contract and acceptance matrix before modifying the existing all-finalized guard |
| B25.3.3 Quiz generation convergence and its real-source gate only | Follow the existing B25.3.2 recommendation for source context/evidence ownership, complete-set feasibility and sanitized regressions; retain strict gates/model/call bounds; obtain fresh real-source generation, persisted Quiz, take/score/result/reopen and secrecy proof under separately established provider/production limits; stop before B26 | Audit current source assembly and the retained symbolic failure evidence; establish the bounded acceptance plan |

Installation checks: **FRESH PASS** repository identity/policy/planning inspection, documentation path and scoped diff checks, preservation inventory; **NOT APPLICABLE** implementation suites/builds for this setup. The installed CLI reports `0.159.0-alpha.12.1` with `goals stable true`; the thread lifecycle API reports an active installation Goal. This does not establish an active roadmap implementation Goal. Official Goal controls: `/goal`, `/goal pause`, `/goal resume`, `/goal clear`; see [official guidance](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex).

Checkpoint: policy setup is installed; the remaining required input is the finite scope decision. No first implementation task has started. Once selected, record the stable endpoint and every mandatory acceptance row here before roadmap execution. The existing historical entries below remain unchanged.

## Matching Quiz support (2026-10-08)

**PASS — Matching questions are supported end-to-end in local automated acceptance.** The shared Quiz question union now includes Matching with readable left/right labels and opaque IDs. Its private key remains in `quiz_keys`; student answers persist explicit pairs through the existing attempt RPC. Legacy choice payloads remain compatible.

Generation plans Matching only for relationship-bearing evidence, uses strict choice/Matching schemas, and independently audits every possible pair without the proposed key. Public persistence and API projections whitelist learner fields. Both sides are ordered independently by question/item identity once, so drafts restore by ID without position-based correctness or read-time reshuffling.

Partial drafts are valid; finalized Matching answers require a complete one-to-one mapping. Unknown IDs and duplicate assignments are rejected. Exact question-level scoring retains existing Quiz percentages and the finalize-every-question completion guard. Library progress keeps its existing precedence and counts nonempty Matching drafts as answered.

QuizScreen uses touch selectors for both readable sides, allows pair changes/clearing, predictably releases an occupied answer, restores persisted drafts, and renders checked/result/history feedback with public labels. Missing labels fail validation rather than falling back to IDs. Private maps are revealed only through the existing finalized-question feedback boundary; owner isolation and existing choice secrecy remain enforced.

Forward migration `20261007155114_quiz_matching.sql` replaces three choice-specific RPC bodies, with no table/column/RLS changes. The old RPCs require option arrays and score only `correctOptionIds`, so extending JSON types alone cannot persist/score Matching. **Apply this migration before deploying the API changes.** It has passed local Postgres integration, including choice data created before migration; remote application is NOT RUN.

FRESH checks: shared **48 passed**; API **982 passed / 4 skipped**; mobile **499 passed**. Focused generation/convergence/Matching **130 passed**; persistence/security/progress/durable **75 passed / 2 skipped**; QuizScreen/screens **26 passed**. Shared/API/mobile typechecks, API/mobile lint and whitespace checks pass. Introduced SQL/test/type/lint mistakes were corrected and rerun; no unresolved failures. Opt-in live-provider, device and production checks are NOT RUN. This slice does not certify whole-web readiness.

Next recommended task: **Intentional incomplete Quiz finalization / “Finish Anyway” semantics**. Not started here; current completion rules remain strict.

See [implementation and acceptance record](quiz-matching-2026-10-08.md).

## Shared Quiz learning progress (2026-10-07)

**PASS — this focused prerequisite is implemented and verified.** Shared `QuizLearningState`, `QuizLearningProgress` and `QuizAttemptSummary` now carry server-derived learning state and history metadata. `QuizSummary` extends progress, retaining canonical `questionCount`, `attemptCount`, `latestScore` and `bestScore` names. Library's artifact `status` remains generation state; an untouched generated Quiz now says **Not started** in mobile.

The pure API helper `deriveQuizLearningProgress` filters by owner and Quiz before applying **active attempt > completed history > abandoned-only > no attempts**. Active selection uses newest `started_at`, then greatest ID; completed selection uses newest `completed_at`, then greatest ID. Saved nonempty drafts count as answered, without unlocking results. Retries retain completion count, best score and latest completion timestamp; abandoning a retry preserves prior completion. A completed **0%** is preserved, while missing scores remain null.

Quiz history now uses the shared DTO, displays completion timestamps, and exposes loading, empty, failure and retry states. Resume selects the first unchecked question, restores saved selections, and uses the existing `finalize:false` API for serialized draft saves with failure retry. Pull refresh reloads the current attempt/result and history; Library refetches through its existing focus hook. Completion guards, private keys, RLS and generation behavior are unchanged; no migration or production configuration change was needed.

FRESH checks: Quiz/Experience **274 passed / 3 skipped**; full API **959 passed / 4 skipped**; mobile **497 passed** (including 16 new screen tests); shared **45 passed**; shared/API/mobile typechecks, API/mobile lint, and `git diff --check` passed. The missing Vitest files were repaired with the existing lockfile and no dependency/version changes. Initial new-test envelope/Activity-fixture mistakes were corrected and rerun. Physical-device and production verification were NOT RUN for this local slice.

This completes only the shared learning-progress prerequisite; it does not certify whole-web readiness or supersede separate historical generation acceptance. Recommended next task: **Matching-question contract + renderer + persistence + scoring**, not started here.

See [implementation and verification record](quiz-learning-progress-2026-10-07.md).

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

Finding-specific structured feedback, direct correction, full same-support reauthoring, alternate unused support, source-affordance difficulty planning, immutable accepted questions, and explicit academic-value examples are implemented in `bd5eb15`. Fresh package/root gates and the final bounded synthetic-live validation pass. Production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and its canonical health endpoint is green.

The only authorized authenticated real-lecture retest still ended `repair_exhausted`: 1/5 accepted and four slots pending after the alternate-support phase. No complete Quiz persisted, so Library/take/submit/score/result/reopen remain unaccepted. **PARTIAL — Quiz semantic convergence remains incomplete.** No validation was weakened, no production retry occurred, and B26 was not started. See [B25.3.1 report](acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](acceptance/b25/ui-redesign-foundation.md).


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
See [B24.5 contract](acceptance/b24-5/backend-ui-contract.md) and [verification](acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Minimal SecureStore state binds the authenticated owner, Canvas source, idempotency request, accepted job, and immutable snapshot without storing source or generated content. Exact-job polling resumes after backgrounding, process recreation, and transient network failure; a unique owner/snapshot database contract makes automatic Library persistence replay-safe. Physical Android acceptance proved the running-job recovery path, large-text reachability, save, and reopen, while production counts showed two intentional jobs and one Reviewer for each of two distinct snapshots. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification, followed by B25 — Design system + app shell implementation, B26 — Core experience redesign, B27 — Remaining application redesign, and B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The mobile flow now leads with course/module/material context, keeps Ready/Prepare/unsupported/empty states understandable, turns default source resolution and durable job submission into one Create Reviewer action, shows coarse progress, and auto-saves against the immutable Canvas snapshot. A fresh production job from the real 23-page CIT6 PDF produced a grounded 20-section Reviewer (coverage/grounding 1.00, zero issues, leakage passed), rendered on the realme Android 13 phone, appeared in Study Library, and reopened without regeneration. Real CC17 PPTX and CIT6 empty rows remained visible and disabled. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. B22 required no API or schema deployment; production health is green. Next: scope B23 separately. See [B22 acceptance](acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Fresh production syncs of the three selected courses persisted exact module resources despite broad Files/Pages failures. Two database contract mismatches found live were minimally migrated and regression-covered. A genuine 23-page CIT6 Canvas PDF was prepared from its module, extracted into 23/23 native-text blocks, generated by the durable production workflow into a grounded 20-section Reviewer with 1.00 coverage/grounding and passed leakage, rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production health is HTTP 200. PPTX/DOCX stay safely unsupported and broad Canvas permissions remain partial warnings. Next: begin B22 only under a new scope. See [B21.1 acceptance](acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed cold launch/session restoration, real 15-page and 55-page learner-PDF intake, durable authenticated production jobs, Reviewer completion/rendering, save, and Library reopen. Missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass; four existing lint warnings remain. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX parsing is not implemented. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](acceptance/b19/source-span-ancestry-completeness.md).

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
See [B18 acceptance](acceptance/b18/composite-source-presentation-source-item-alignment.md).


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
See [B17 acceptance](acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Previous objective result — B16.1 historical

B16.1 attempt 3 (2026-09-07) is FAIL with provider capacity AVAILABLE.
All four targeted cases ran through real `gpt-4o`; deterministic retention is
99/99, 232/232, 156/156 and 46/46 with zero factual retries or provider losses.
A captured generic prompt-contract regression now passes: concise source wording
is explicitly permitted under the unchanged lexical grounding rule. Python
improves to four calls, 10.383 s and two fallback explanations, but still fails
provider acceptance. Statistics MinerU/Docling remain withheld (two/four
grounding omissions; MinerU also structural noise). Accounting has one call,
5.824 s and automated PASS, but fragmentary prose/raw tables fail manual quality.
Full B12 is NOT RUN: targeted prerequisites failed. Fresh engine 476/476,
architecture 27/27 and API 607/607 pass. Next: reconcile the generic
explanation/evidence presentation contract with the existing validation rules
using captured failures. No B17, ownership/default/threshold change or push.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Historical B16 architecture baseline: the engine assembles every required manifest target deterministically
before provider work and restricts batched provider output to explanations.
The focused suite passes 26/26, the engine 475/475, and API 607/607. Provider-
owned required targets and factual retries are zero; non-standalone nodes use
zero calls. Live quality acceptance is unresolved because Python calls returned
OpenAI 429 `no credits remaining`. Its safe fallback preserved 99/99 targets
with zero loss/fabrication in 5.432 s and two initial batches, but Statistics,
Accounting, and full B12 were not run. Production remains `legacy`. See
`docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.

## B15 predecessor result

Reviewer B15 now distinguishes source-supported standalone sections from
structural, typed-evidence and unsupported nodes before generation. Exact
non-standalone representations retain titles, manifests and ownership while
making no provider or retry calls. Its new suite is 12/12 and the engine is
**449/449**, retaining B13 and B14. Fresh targeted acceptance still fails:
Python is withheld for instructional noise despite 99/99 target representation;
Statistics and Accounting remain withheld for provider omissions, with
Statistics also failing usefulness. Production remains `legacy`. See
`docs/ai/acceptance/b15/reviewer-section-planning.md`.

## B13 predecessor result

Reviewer B13 introduced stable required-evidence manifests, exact-target repair,
source-absent refusal and initial deterministic usefulness gates. Its 19/19
regressions remain frozen and green. B13 acceptance failed because provider
omissions, activity/source dumps and source-sparse explanations remained.

## B12 predecessor result

Reviewer Benchmark B12 completed the frozen three-source B8 workload through
hybrid parsing and the real durable job path. Verdict:
`FAIL — B12 exposed unresolved Reviewer acceptance defects`.

The run found and fixed one generic Stage 0 defect: non-legacy typed blocks
rehydrated from durable metadata were incorrectly expanded as legacy
presentation pages. The post-fix durable rerun restored Python's 13-section
typed plan. Python technically passes at 1.00 coverage/grounding, but manual
inspection still finds title-only explanations, activity leakage, and overly
source-like key-point lists. Statistics remains safely withheld for provider
omissions with both MinerU and Docling; Accounting remains safely withheld
because generated Ledger content omits a required exact source row. No visible
fabrication or unsupported relationship was accepted. Production remains
`legacy` by default.

## Completed predecessor

Reviewer Benchmark B11 is complete. Stages 1-6 now use B10's typed document
structure for concept hierarchy, evidence grouping, relationship grounding,
and objective student-visible assembly validation. The production parser
default and existing Google OCR-backed path remain unchanged.

## Completed scope

- Added generic multi-signal typed-heading roles, metadata/furniture demotion,
  same-parent repeated-heading consolidation, and child-evidence retention.
- Added plan-level typed evidence groups for formulas, tables, exact cells,
  code, and result statements with preserved structural provenance.
- Grounded formula raw text/parser LaTeX and exact table cells without allowing
  unstated calculations, range substrings, or algebraic transformations.
- Added objective Stage 6 diagnostics for furniture, duplicate/code/body titles,
  empty sections, structural noise, and evidence-based oversized sections.
- Added eight deterministic regression families and reran live Python Docling
  plus central-tendency Docling/MinerU generation through the B10 harness.

## Result

`PASS - TYPED REVIEWER HIERARCHY AND GROUNDING HARDENING ACCEPTED`

Python Docling now assembles 13 clean concepts at 1.00 coverage and grounding,
with no REVIEW/ACTIVITY/Examples furniture, partial-sentence/code/list titles,
or repeated numeric suffixes. Central-tendency grounding issues fall from 41
to 4 with Docling and from 40 to 2 with MinerU, with zero fabrication failures.
Both statistics arms remain correctly withheld for omissions or missing output
rather than inventing relationships. Typed accounting cells and numeric/OCR
provenance remain intact.

## B15 verification

- FRESH B15 regressions: 12/12; engine evaluations: 449/449, retaining all 437
  prior cases, including all B13 and B14 regressions.
- FRESH API tests: 607/607 across 69 files.
- Full typecheck, lint and builds pass; the acceptance report records fresh
  versus cached tasks. Lint retains only the four accepted mobile warnings.
- Fresh provider-backed targeted results: Python 1.00/1.00 with 99/99 required
  targets but usefulness failure; Statistics/MinerU 0.91/0.80 with 211/232;
  Statistics/Docling 0.97/0.81 with 152/156; Accounting 0.76/0.88 with 35/46.
  All four were safely withheld with zero fabrication failures.
- Full unchanged B12 rerun: NOT RUN because targeted prerequisites failed.
- Repository diff and object-integrity checks pass; only the two known
  dangling blobs remain.

## Next action

Restore provider capacity and rerun the B16 targeted order. Accept only after
successful explanations pass grounding, usefulness, manual quality, and
runtime, then run unchanged B12. Do not start a B17 benchmark patch.
