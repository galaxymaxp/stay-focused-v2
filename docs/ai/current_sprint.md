# Current Sprint

Last refreshed: 2026-09-02, Asia/Manila.

## Completed objective

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

## Verification

- Focused B11 regressions: 8/8.
- Engine evaluations: 404/404, including all prior 396 cases.
- API tests: 607/607.
- Durable workflow: 1/1; focused mobile parser handoff: 10/10.
- Full typecheck and builds pass. Lint retains only the four accepted mobile
  import-order warnings. Repository diff and object-integrity checks pass.

## Next action

B12 - Rerun full B8 end-to-end acceptance using hybrid structured parsing.
