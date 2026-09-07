# Current Sprint

## B17 local repair — current result (2026-09-07)

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


Last refreshed: 2026-09-07, Asia/Manila.

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
