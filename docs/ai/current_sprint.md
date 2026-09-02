# Current Sprint

Last refreshed: 2026-09-02, Asia/Manila.

## Completed objective

Reviewer Benchmark B10 is complete. A feature-flagged structured-document
boundary integrates legacy, Docling, and MinerU parsing without changing the
production default or removing the current Google OCR-backed path.

## Completed scope

- Added one parser-independent contract for pages; heading, paragraph, list,
  code, formula, table, and image blocks; reading order; hierarchy; parser
  diagnostics; bounding boxes; and block/table-cell provenance.
- Added observable-signal document classification, conservative hybrid routing,
  generic parse-quality gates, safe subprocess isolation, and deterministic
  fallback to the legacy extractor.
- Preserved typed source blocks through Stage 0/1, durable workflow checkpoints,
  storage, API responses, and the mobile handoff without flattening them to a
  giant text or Markdown value.
- Added sanitized regressions for code-heavy slides, central-tendency formulas
  and tables, and scanned accounting OCR/tables. Unit tests use fixtures and
  fakes and require no model download.
- Ran a common-contract A/B over the two born-digital B8 sources and routed the
  scanned accounting source through MinerU without Google credentials.

## Result

`PARTIAL GENERATION IMPROVEMENT; STRUCTURED PARSER ARCHITECTURE ACCEPTED`

Docling materially improves code-heavy source typing and reduces literal/code
title noise, but remaining REVIEW/ACTIVITY and partial-title defects show that
heading validation still needs work. Formula/table typing and provenance are
substantially stronger for central tendency, yet all three reviewers are
withheld by existing validation. MinerU accounting output remains incomplete
in known cells, and the integration does not synthesize them.

## Verification

- Engine evaluations: 396/396, including all prior 383 cases.
- API tests: 607/607.
- Durable workflow: 1/1; focused mobile parser handoff: 10/10.
- Full typecheck and builds pass. Lint retains only the four accepted mobile
  import-order warnings. Repository diff and object-integrity checks pass.

## Next action

B11 - Harden reviewer hierarchy and student-visible validation using typed
parser structure.
