# B13 Reviewer Usefulness and Required-Evidence Completion

Date: 2026-09-03 (Asia/Manila)

Verdict: **FAIL — B13 still has unresolved Reviewer acceptance defects**

This is an implementation and failed-acceptance report, not an acceptance
certificate. Safe withholding does not meet the frozen B12 usable-reviewer gate.

## Starting state

- Repository: `C:\Projects\stay-focused-v2`; branch `main`.
- Starting HEAD: `93b27bd7b72ddecc6bbdfbc1c4c16ba71b7d3991`.
- Working tree: only the known untracked `docs/ai/acceptance/b8/`.
- Ahead/behind: 6 ahead / 0 behind `origin/main`.
- FRESH engine typecheck/build passed; engine evaluations **406/406**.
- FRESH API tests: **607/607 across 69 files**.
- FRESH `git fsck --full`: passed, with only the established dangling blobs
  `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and
  `625ec44ccb5695fe93ac518f09238fac61eca223`.

No B8 evidence was modified or staged. No historical B12 artifact was rewritten.

## B12 failures reproduced

The saved B12 structured documents and generated candidates were replayed against
an isolated, ignored archive of starting HEAD. This reproduced the four recorded
coverage/grounding pairs exactly: **1.00/1.00**, **0.89/0.78**,
**0.89/0.81**, and **0.92/1.00**. No parser rerun was necessary.

| Representative | Planned evidence and delivered source | Recorded candidate | Coverage / grounding | B12 Stage 6 |
| --- | --- | --- | --- | --- |
| Statistics/MinerU, ungrouped mean | One composite example target; two formula blocks and seven result/prose blocks in the section; reconstructed prompt 7,896 characters | Four points and an exact source result, but incomplete example evidence | Section 0.00 / 0.50, omission | Withheld |
| Accounting/MinerU, Ledger | Three semantic groups; six table blocks and 70 cells in the section; reconstructed prompt 9,332 characters | Two of three semantic targets; missing capital row | Section 0.67 / 1.00 | Withheld |
| Python, comparison heading | Heading-only block `docling-texts-75`; no definition in that section span; prompt 3,570 characters | Explanation exactly repeats title | Section 1.00 / 1.00 | Passed, poor study value |
| Python, GENERATORS | Two composite semantic groups, including learner activity text; 19 referenced source blocks; prompt 8,437 characters | Blank explanation and 11 points containing activity instructions | Section 1.00 / 1.00 | Passed, poor study value |
| Python, Generator Expressions | Ten semantic targets, two typed code blocks, 14 section blocks; prompt 10,658 characters | Nine points, including extended source/example material | Section 1.00 / 1.00 | Passed; manual source-dump failure |

The original saved candidates are post-Stage-3 outputs, not raw model transport
responses. B12 did not retain every raw response or transmitted prompt. Prompt
evidence above is explicitly a reconstruction using the starting implementation,
exact typed blocks and detected source items; it is not represented as a captured
transport log. Local replay details are in ignored
`.local/b13-baseline-reproduction.json`.

The omitted Ledger row is present in `mineru-8-1-hspcwj`, source row index 2,
with cell IDs `mineru-8-1-hspcwj-cell-2-1` through `...-2-6`. Its source value
is `15.9.17 | To Capital A/C | XXXX | | |`. The Statistics formula anchors
include `mineru-1-6-rdnh3b` and `mineru-1-14-ob1cy6`; all are delivered to
Stage 3. The evidence-arrival proof did not contradict B12, so parser work was
not reopened.

## Root causes

### Required-evidence completion

Stage 2 already carried semantic units, source block IDs and typed evidence
groups, but there was no uniform target-by-target manifest consumed by retries.
Full-section retries mixed generic coverage guidance with large repeated source
contexts. A small desired point count also competed with required completeness.
Provider output could ignore actual rows/formulas despite their presence.

An additional deterministic defect was found: serialization of a group with no
children returned an empty array, even when its label was the required source
row. This explains why a safe extractive fallback also lost the Ledger target.

### Student-visible usefulness

Stage 3 overwrote key points with serialized semantic units, including long
composites. Grounding verified support, not educational value. Sparse-source
handling repeated headings, and the existing Stage 6 structural checks did not
reject tautological explanations, learner commands, or source dumps.

## Required-evidence generation changes

- Reuse semantic units and typed groups to derive stable internal target IDs,
  source ordering, block/item/table/row/cell provenance and source evidence.
- Keep technical formulas, code, table rows and numeric result evidence required
  even when the prose analyzer has no list. Source rows are not synthesized.
- Serialize the manifest as structured JSON, including exact typed cell values.
  Supporting source blocks are explicitly distinguished from required targets.
- Refuse source-absent manifest evidence before provider calls and before
  fallback/assembly. Missing source evidence cannot be laundered through a plan.
- Constrain section identity in the response schema; require the complete source
  block set. Preserve the existing Stage 3 output-shape validation.
- Remove the conflicting small point-count quota for manifest-backed plans.
- Keep short atomic source lists/token-sensitive mappings exact, while stopping
  the general replacement of model key points with whole semantic source dumps.

The original semantic coverage, lexical fabrication, source-token fidelity,
source-item omission and relationship gates remain in place. Manifest checking
is additional, not a substitute for those checks. No threshold was lowered.

## Retry behavior

Each bounded retry receives the previous candidate, exact missing target IDs,
their source evidence/provenance, accepted content and usefulness diagnostics.
Only omission repairs use a merge; fields flagged by grounding/leakage/usefulness
are not treated as accepted content. The merged candidate goes through renewed
coverage, grounding and leakage checks, and the final usefulness gate.

The existing two-retry pipeline bound is unchanged. Extractive fallback preserves
empty-child group labels, but is not automatically trusted. Source-absent targets
cannot be recovered by inventing a fallback. Live calls still show that a
manifest in the prompt is not enough to guarantee provider consumption.

## Student-visible usefulness diagnostics

| Diagnostic | Deterministic check |
| --- | --- |
| `NON_EXPLANATORY_SECTION` | Explanation has effectively no informative token gain beyond the title. |
| `INSTRUCTIONAL_NOISE` | Learner-directed imperative/framing, activity heading/region, or presentation navigation. |
| `SOURCE_DUMP` | Oversized prose points, multiple paragraphs, or disproportionate repeated source material. |
| `LOW_INFORMATION_SECTION` | No meaningful concept content beyond the title or no represented concept evidence. |

Typed formula/code/table representations have evidence-sized allowances rather
than a universal tiny length cap. A short formula does not exempt an arbitrarily
padded prose paragraph. Classroom commands are filtered using role/region and
language structure, not benchmark-string matching. Filtering occurs after
source-span slicing so legacy offsets are not shifted.

The B11 diagnostics and empty-section rejection remain intact. Stage 6 withholds
the complete required reviewer instead of deleting a failed section. These
heuristics are not a claim of semantic educational-quality proof; live
acceptance remains required.

## Regressions added

The new suite has **19/19 FRESH passes**; total engine evaluations are
**425/425**, retaining all 406 prior cases.

| Regression family | Before | After | Protects |
| --- | --- | --- | --- |
| Required list completion | No stable exact-target repair contract | Exact missing item delivered and repaired | Omission recovery |
| Required table-row completion | Missing row could survive repeated regeneration | Actual missing source row delivered, full gates rerun | Ledger failure |
| Formula completion | No exact-target repair assertion | Typed formula delivered; unsupported replacement rejected | Formula safety |
| Title repetition / concise explanation | Grounding alone could pass repetition | Repetition fails; informative short explanation passes | Study usefulness |
| Activity leakage | Source commands could become key points | Concept retained, command omitted | Student-visible noise |
| Prose dump / typed exception / padded formula | No block-aware usefulness gate | Dump rejected; genuine long typed evidence accepted | Concise review contract |
| Source-absent concept plus five target-kind refusals | No manifest preflight | Provider not called; fallback cannot invent evidence | List/row/value/formula/relationship safety |
| Stage 6 terminal usefulness | Grounded tautology assembled | Reviewer withheld | Final boundary |
| Empty-child semantic group | Label disappeared | Exact source label retained | Deterministic Ledger row loss |
| Similar rows | Aggregate overlap could confuse rows | Different row label remains missing | Target identity |
| Formula without semantic list | Typed context could lack a mandatory target | Formula explicitly required | Production planning parity |

## Targeted execution and results

Used the unchanged `apps/api/scripts/b12-hybrid-acceptance.ts` generation phase,
saved frozen B12 parser outputs, original parser choices and default provider.
Order: Accounting/MinerU, Statistics/MinerU, Statistics/Docling, Python/Docling.
No PDF/parser default, corpus, acceptance threshold or harness gate was changed.

Two early Accounting diagnostics were retained: the first reached 0.94 coverage,
0.97 grounding, one unresolved omission and 11 retries/17 calls. After fixing
empty-child serialization, the second reached 1.00/1.00 with zero grounding
issues but was withheld for a non-explanatory section (10 retries/16 calls).
One isolated Ledger provider call confirmed that a fully delivered manifest
could still yield generic unsupported prose; that candidate was not assembled.

The last technical-manifest tightening occurred after the Accounting and
Statistics/MinerU processes loaded their modules. Their captured live metrics
and final-code deterministic replay must therefore be distinguished. No replay
is claimed to be a fresh provider rerun or successful acceptance.

### Captured targeted live runs

These are rejected-candidate metrics, not assembled-content acceptance scores.

| Case | Coverage | Grounding | Issues / omissions | Fabrications | Planned / generated / final | Retries / calls | Assembly / usefulness |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Accounting/MinerU, before final manifest tightening | 1.00 | 1.00 | 0 / 0 | 0 | 6 / 6 / 0 | 9 / 15 | Withheld; non-explanatory introduction |
| Statistics/MinerU, before final manifest tightening | 0.99 | 0.78 | 3 / 3 | 0 | 10 / 9 / 0 | 18 / 28 | Withheld; instructional noise and incomplete evidence |
| Statistics/Docling, final code | 0.97 | 0.81 | 8 / 8 | 0 | 11 / 11 / 0 | 22 / 33 | Withheld; instructional noise, dumps and omissions |
| Python/Docling, final code | 0.98 | 0.85 | 0 / 0 | 0 | 13 / 11 / 0 | 24 / 37 | Withheld; missing sections and instructional noise |

### Final-code replay of the exact captured candidates

| Case | Coverage | Grounding | Issues / omissions | Fabrications | Final sections | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Accounting/MinerU | 0.76 | 0.90 | 11 / 11 | 0 | 0 | FAIL |
| Statistics/MinerU | 0.91 | 0.72 | 23 / 23 | 0 | 0 | FAIL |
| Statistics/Docling | 0.97 | 0.81 | 8 / 8 | 0 | 0 | FAIL |
| Python/Docling | 0.98 | 0.85 | 0 / 0 | 0 | 0 | FAIL |

Accounting's original three semantic Ledger targets are now represented,
including the actual capital row. This is a concrete recovery, not a synthesized
row. However, only **8/19** targets in the final expanded technical Ledger
manifest are represented; 11 other typed targets remain absent. Unadjusted
Trial Balance has **23/23** targets represented. Stage 6 also rejects the
introductory explanation as `NON_EXPLANATORY_SECTION`. There is no usable final
six-section reviewer.

Statistics/MinerU final-code target counts are: arithmetic mean **1/1**,
ungrouped mean **5/8**, weighted mean **24/28**, grouped mean **36/38**,
median **1/1**, ungrouped median **6/9**, grouped median **103/109**, mode
**5/5**, grouped mode **30/33**. The broad introductory section is missing.
The remaining table/formula/result omissions have source-available targets;
all section preflights pass. Ungrouped median and mode contain instructional
noise; median/mode candidates also contain source dumps. This is not acceptance
despite high aggregate coverage.

Statistics/Docling has **37/39** grouped-mean and **32/34** grouped-mode
manifest targets represented. Other manifest targets are represented, but the
original semantic/source-item gates add omissions, resulting in eight total
issues. Median and ungrouped mode still contain instructional noise; median
points include source dumps. Keeping the original semantic gate is important:
manifest-only success is not sufficient. No formula, number, table cell or
relationship is invented to force assembly.

Python retained the exact 13-title plan below, but only 11 sections were
generated. The comparison heading and regular-list section had no generated
output. There are no final titles because assembly is withheld. The retained
candidates have zero title-repetition diagnostics and zero `SOURCE_DUMP`
diagnostics, but this is **not** a usefulness pass. Six instructional-noise
diagnostics affect five sections. Manual review additionally finds an unflagged
learner-directed imperative in the GENERATORS explanation and code used as the
explanation in two sections. Typed-length exemptions do not establish that code
is an adequate explanation. Several explanations are source fragments rather
than self-contained review material. These are remaining heuristic and
generation defects, not successful cleanup.

The exact planned hierarchy is:

1. Unit 5: Generators in Python
2. ITERATORS
3. GENERATORS
4. Yield Command
5. GENERATOR FUNCTION vs GENERATOR EXPRESSION
6. Generator Expressions
7. The next() function
8. Generator Functions
9. Using a Regular List
10. Using Generators
11. Using a Generator Expression
12. Infinite Sequences
13. Sending objects to a Generator

All 99 required manifest targets in the 11 retained Python candidates are
represented. That does not resolve the two missing sections or poor study value.
Zero grounding issues is not a complete-reviewer claim: the grounding score is
0.85 because the required missing sections remain absent.

The four targeted runs used **113 provider calls and 73 retries** in total.
Including the two early Accounting diagnostics and one isolated Ledger probe,
the B13 investigation used **147 calls and 94 retries**. There was no unbounded
regeneration or additional full-corpus attempt after these failures. Zero
fabrications above means zero detected fabrication in the retained terminal
candidates; unsupported intermediate provider content was rejected, not approved.

Detailed private captures and the final-code replay remain ignored under
`.local/b13-targeted-final/` and `.local/b13-current-code-replay.json`. They are
not committed academic source fixtures. Earlier Accounting diagnostics and the
isolated provider probe remain available locally for the next task.

## Full unchanged B12 rerun

**NOT RUN.** The required targeted acceptance prerequisite failed. Repeating the
full corpus or the durable API suite would not turn safe withholding into a
usable reviewer. No successful B13 acceptance commit was created.

## Missing-evidence safety

FRESH deterministic tests refuse missing list items, source rows, numeric values,
formulas and relationships before provider generation, retain failure through
bounded retries/fallback, and reject unsupported replacement formulas. Similar
rows cannot satisfy each other merely through shared numbers/words. No invented
row/value/formula or source-absent relationship is authorized. All failed live
reviewers remain withheld; no partial reviewer is published.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck --workspace @stay-focused/engine` | FRESH PASS | Strict source, eval and live-run TypeScript projects. |
| `npm run build --workspace @stay-focused/engine` | FRESH PASS | Engine and evaluations rebuilt before evaluation. |
| `npm run eval --workspace @stay-focused/engine` | FRESH PASS, 425/425 | New suite 19/19; all 406 previous cases retained. |
| `npm test --workspace @stay-focused/api` | FRESH PASS, 607/607 | 69 files. |
| `npm run typecheck` | PASS, 7/7 tasks | Final run: seven cached. Preceding same-code run: three fresh, four unchanged cached. |
| `npm run lint` | PASS, 7/7 tasks | Final run: seven cached. Preceding same-code run: three fresh, four cached; four established mobile import-order warnings only. |
| `npm run build` | PASS, 7/7 tasks | Final run: seven cached. Preceding same-code run: three fresh, four cached; API and Expo exports succeeded. |
| `git diff --check` | PASS | No whitespace errors. |
| `git fsck --full` | PASS | Only the two established dangling blobs. |

Intermediate evaluations exposed compatibility failures (including 396/415,
then 413/415 and 414/415), and a transient TypeScript error from a misplaced
control-flow statement. Prompt layout, defensive required-field access,
replacement-versus-merge behavior and exact atomic-list preservation were fixed;
the final freshly rebuilt suite is 425/425. No failure was dismissed as a flake.
Next's generated `next-env.d.ts` drift was restored to its starting contents;
it is not a B13 change.

## Files and Git

Implementation responsibilities:

- `types.ts`: manifest/provenance and coverage diagnostic types.
- `required-evidence.ts`: manifest construction, exact technical matching,
  source availability and structured serialization.
- `review-content.ts`: generic activity/furniture/learner-command classification.
- `reviewer-usefulness.ts`: deterministic, typed-aware usefulness diagnostics.
- `semantic-structure.ts`: activity-aware semantic inputs and empty-child label
  preservation.
- `stage2-plan.ts`: required/supporting evidence planning.
- `stage3-generate.ts`: preflight, schema/prompt contracts and concise content.
- `stage4-verify.ts`: exact missing-target diagnostics alongside semantic gates.
- `stage5-retry.ts`: targeted repair, conservative merge and safe fallback.
- `stage5a-grounding.ts`: additional manifest omissions; original safety retained.
- `stage6-assemble.ts`: terminal source availability and usefulness gates.
- `index.ts`: exports.
- `evals/reviewer-completion-usefulness.eval.ts`, `evals/run-evals.ts`: 19 new
  deterministic cases and registration.
- This report and the three current-state documents: result reconciliation.

Implementation commit: `b5047b4fa9e283314db10e75128c753a885c7b84`
(`fix(engine): improve reviewer evidence completion and usefulness`).
The follow-up is a documentation-only failure report, not an acceptance commit.
No secrets, private source fixtures, local provider outputs, B8 evidence or B12
historical edits were staged. Nothing was pushed. Production remains `legacy`.

## Final B13 verdict

**FAIL — B13 still has unresolved Reviewer acceptance defects**

The implementation improves deterministic safety and diagnostics, but does not
demonstrate reliable evidence-complete, study-ready generation for the frozen
corpus. The next task is evidence-bound completion and explanatory repair of
these exact B13 failed candidates, including missed instructional/code-dump
checks, with unchanged gates.
