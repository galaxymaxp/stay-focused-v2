# Current Sprint

Last refreshed: 2026-09-03, Asia/Manila.

## Current objective result

Reviewer B13 has implemented required-evidence manifests, exact-target bounded
repairs, source-availability refusal and deterministic student-usefulness gates.
Its **425/425 engine evaluations** pass, but the acceptance objective remains
failed: safe withholding and completed technical checks are not a usable
reviewer. Required provider evidence consumption and source-sparse explanations
still need recovery. Production remains `legacy`; parser/UI/mobile/auth/
scheduling behavior was not changed. See
`docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md` for the separate
live measurements and final-code candidate replay.

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

## B13 verification

- FRESH B13 regressions: 19/19; engine evaluations: 425/425, retaining all 406
  prior cases, including B11 structure and B12 durable typed-block regressions.
- FRESH API tests: 607/607 across 69 files.
- Full typecheck, lint and builds pass; the acceptance report records fresh
  versus cached tasks. Lint retains only the four accepted mobile warnings.
- Four targeted live cases remain withheld. Full unchanged B12/durable rerun:
  NOT RUN because targeted acceptance prerequisites failed.
- Repository diff and object-integrity checks pass; only the two known
  dangling blobs remain.

## Next action

Resolve the remaining evidence-bound provider completion and source-sparse
explanation failures using the B13 candidates. Keep required evidence and all
grounding/usefulness gates strict, then rerun targeted acceptance before the
unchanged full B12 corpus. Do not promote the parser default or mark B13 passed.
