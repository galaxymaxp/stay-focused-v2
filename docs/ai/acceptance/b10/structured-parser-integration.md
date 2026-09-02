# B10 - Feature-Flagged Structured Document Parser Integration

Date: 2026-09-02 (Asia/Manila)

Branch: `main`

Starting HEAD: `f2f33f3cd10a0669622182e69f8e4bb5d4b8a421`

Verdict: `PASS - architecture accepted; generation improvement is partial`

## Starting state

The working tree contained only the known untracked B8 acceptance directory,
which B10 did not modify. `main` was one commit ahead and zero behind
`origin/main`. The starting deterministic baselines passed at 383/383 engine
evaluations and 597/597 API tests. Repository object verification reported only
the two previously known dangling blobs.

## Existing extraction boundary

The production path accepted an uploaded PDF, stored its source metadata, and
ran the existing extraction service from the durable processing job. Native
PDF text was preferred; pages requiring OCR could be sent through the existing
server Google OCR provider. The result entered `SourceNormalizationInput` as
flat text or generic page blocks, and Stage 0 then inferred structure from line
shape and page context.

That boundary retained page identity but lost provider-native types, heading
hierarchy, exact code boundaries, formulas, table cells/spans, bounding boxes,
and cell-level provenance. Stage 0 therefore had to rediscover structure from
text that no longer carried those relationships.

## Architecture

The new path is:

```text
source bytes
  -> observable-signal classifier and parser router
  -> parser adapter
  -> StructuredDocument
  -> typed Stage 0 normalization
  -> outline, generation, grounding, and assembly
```

`StructuredDocument` is parser-independent and contains pages, parser metadata,
safe diagnostics, and ordered typed blocks. The block union supports heading,
paragraph, list, code, formula, table, and image/OCR regions. Every block has a
stable ID, page number, reading order, typed origin, and provenance. Optional
fields preserve raw text, confidence, hierarchy/parent ID, native label,
bounding box, heading level, language hint, formula LaTeX, image description,
and OCR origin without treating parser guesses as source truth.

Tables retain caption, rows, and cells with row/column indexes, row and column
spans, header indication, text, bounding box, and table/row/cell provenance.
The adapter never invents missing cells. Unknown adapter fields and unsafe
provenance are discarded by canonical sanitization.

Stage 0 accepts either this contract or the legacy flat/page-block input. The
structured branch keeps typed source blocks; it does not serialize the parse to
a giant Markdown string. Stage 1 excludes code, list, table, formula, image,
metadata, and furniture blocks from heuristic heading discovery while retaining
explicit typed headings and their hierarchy signals.

The durable workflow performs any external subprocess parse inside its existing
preparation step and checkpoints only the JSON-serializable structured
document. Orchestration branches on a small serializable extraction plan. This
keeps Python process work outside workflow orchestration and preserves replay
safety and the existing durable `202` processing contract.

## Parser adapters and isolation

| Adapter | Mapping result | Runtime boundary |
| --- | --- | --- |
| Legacy | Existing extracted text/page blocks map into the same contract when needed, while the default production flow remains unchanged. | Existing TypeScript extractor and Google OCR path. |
| Docling 2.124.0 | Native headings, body/group relationships, lists, code, formulas, tables, images, page coordinates, and cells map into the shared types. | Isolated Python bridge invoked by a bounded TypeScript subprocess. |
| MinerU 3.4.5 | Content-list headings, OCR text, LaTeX equations, tables including HTML spans, images, page coordinates, and furniture labels map into the same types. | Isolated CPU pipeline/PytorchPaddleOCR bridge invoked by the same subprocess contract. |

Python dependencies are not npm dependencies and are not vendored. Executable
and bridge paths are injectable. The subprocess uses argument arrays with no
shell, a temporary input directory, bounded output, timeout/process-tree
termination, and cleanup. Student-visible failures expose stable error codes,
not Python stderr, stack traces, model paths, or local filesystem paths. Unit
tests use fakes and sanitized fixtures and do not download models.

## Feature flags

The production default is `legacy`. Configuration uses these variable names:

- `DOCUMENT_PARSER_MODE`
- `DOCUMENT_PARSER_TIMEOUT_MS`
- `DOCLING_PYTHON_PATH`
- `DOCLING_PARSER_BRIDGE_PATH`
- `MINERU_PYTHON_PATH`
- `MINERU_PARSER_BRIDGE_PATH`

Missing, incomplete, or invalid external configuration does not enable an
external parser. No configured values or secrets are documented here.

## Routing and fallback

Classification uses observable input signals: native-text coverage/density,
image density, OCR requirement, code-line ratio, table/formula indicators, and
structural complexity. It does not inspect a filename, course name, or source
content keyword.

| Source class | Hybrid attempt order |
| --- | --- |
| Born-digital | Docling -> MinerU -> legacy |
| Code-heavy presentation | Docling -> MinerU -> legacy |
| Formula/table-heavy | MinerU -> legacy |
| Scanned/OCR-heavy | MinerU -> legacy |
| Unknown/low confidence | Docling -> MinerU -> legacy |

Explicit `docling` mode uses Docling then legacy. Explicit `legacy` mode invokes
only the unchanged current path. External parser unavailability, timeout,
malformed output, adapter failure, or quality rejection advances to the next
safe fallback. Google OCR remains available behind the legacy extractor.

## Parser quality gate

Exit code zero is insufficient. The generic gate evaluates page coverage,
unexpected empty-page ratio (explicit blanks are not penalized), text-loss
ratio, reading-order validity, unparseable table count, formula anomalies,
fatal parser diagnostics, and OCR confidence when supplied. It records safe
typed reasons and rejects incomplete output without repairing or synthesizing
source material. The final legacy fallback remains usable even when a quality
diagnostic explains why an external candidate was rejected.

## Provenance design

Normalized evidence can identify the source document, page, structured block,
parser, and source reading order. Table cells additionally retain table, row,
and column indexes; formula and code evidence retains the originating typed
block and page. The same canonical source-block representation survives API
creation, private storage, processor input, durable workflow checkpoint/result,
and mobile response parsing. Numeric cell provenance was present for every
counted accounting numeric cell: Docling 41/41 and MinerU 32/32.

## Deterministic coverage

The sanitized fixtures cover all three B8 document classes:

- Code-heavy slides: a concept heading, exact code/list literal, paragraph,
  REVIEW, ACTIVITY, and a repeated heading. Code is never promoted to a heading;
  reading order and repeated structure survive.
- Central tendency: Mean, Median, Mode, formulas, structured tables, metadata,
  and numeric cells. Formulas stay typed; rows, spans, association, and numeric
  provenance survive.
- Scanned accounting: OCR-derived text, headings, a ledger, a trial balance,
  and numeric cells. OCR origin is retained, cells stay traceable, and missing
  cells are not synthesized.

Router regressions prove Docling success bypasses MinerU/legacy, Docling quality
failure can accept MinerU, scanned sources select MinerU directly, MinerU
unavailability falls back safely, and disabled infrastructure preserves legacy
behavior. Subprocess tests prove bounded JSON transport, safe failure mapping,
private-path/stderr suppression, timeout cleanup, and no-shell invocation.

## Python generation A/B

All arms passed through `SourceNormalizationInput.structuredDocument` and the
same Stage 0 adapter. The legacy arm was first represented with the generic
legacy structured adapter rather than bypassing it.

| Input | Planned/final | Coverage | Grounding | Issues | Retries/calls | Assembly | Student-visible result |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Legacy | 16/16 | 1.00 | 1.00 | 0 | 6/22 | Pass | Complete but contains code/list fragments and partial titles. |
| Docling | 20/20 | 1.00 | 1.00 | 0 | 6/26 | Pass | Complete; materially cleaner concepts, but REVIEW/ACTIVITY, a partial sentence, and repeated next-function titles remain. |
| MinerU | 19/0 | 1.00 | 0.96 | 5 | 15/34 | Withheld | No student-visible reviewer; grounding correctly blocks it. |

Exact assembled legacy titles:

1. REVIEW
2. ITERATORS
3. lists and tuples.
4. `Cities = ["Manila", "Baguio", "Davao","Cebu",`
5. city.
6. characters:
7. GENERATORS 1
8. Yield Command
9. Generator Expressions
10. Examples:
11. The next() function
12. Generator Functions
13. Generators 2
14. ACTIVITY
15. Infinite Sequences
16. Sending objects to a Generator

Exact assembled Docling titles:

1. Unit 5: Generators in Python
2. REVIEW
3. ITERATORS
4. GENERATORS
5. Yield Command
6. GENERATOR FUNCTION vs GENERATOR EXPRESSION
7. Generator Expressions
8. Examples:
9. The next() function 1
10. `· An example of how it is used can be seen here:`
11. The next() function 2
12. Generator Functions
13. Using a Regular List
14. Using Generators
15. Using a Generator Expression
16. When to not use:
17. When to use:
18. ACTIVITY
19. Infinite Sequences
20. Sending objects to a Generator

MinerU produced no final titles because assembly was withheld. Its 19 rejected
candidate titles were: Unit 5: Generators in Python; REVIEW; ITERATORS;
GENERATORS 1; Yield Command; GENERATOR FUNCTION vs GENERATOR EXPRESSION;
Generator Expressions; Examples: 1; Sample 2; Examples: 2; Sample 4; The
next() function; Generator Functions 1; Using Generators; Generator Functions
2; Generators 2; ACTIVITY; Infinite Sequences; Sending objects to a Generator.

The direct answer is partial improvement. Typed Docling structure removes many
literal/code title errors before new heuristics, but structure alone does not
resolve heading validation or MinerU grounding.

## Statistics generation A/B

The PDF input was classified consistently with the mobile presentation source
path. All three results were withheld by the unchanged gates.

| Input | Planned/final | Coverage | Grounding | Issues | Retries/calls | Assembly | Student-visible result |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Legacy | 6/0 | 1.00 | 0.75 | 3 | 6/12 | Withheld | None. Reproduces the B8 validation shape. |
| Docling | 17/0 | 0.87 | 0.78 | 41 | 28/45 | Withheld | None. Richer typed evidence but noisy hierarchy and relationships. |
| MinerU | 12/0 | 0.95 | 0.71 | 40 | 17/29 | Withheld | None. Cleaner main hierarchy but relationship validation fails. |

- Mean hierarchy: legacy is page-fragmentary; Docling exposes explicit main
  and subheadings but also metadata, Solution, and result headings; MinerU is
  cleaner at the main level but still promotes Solution.
- Median hierarchy: typed paths expose the Median group and subordinate
  formula/table evidence, but neither produces an acceptable reviewer.
- Mode hierarchy: Docling preserves grouped/ungrouped structure but retains
  Examples and a result heading; MinerU retains the major group but adds a
  procedural fragment (`5. Substitute to formula`).
- Formula preservation: legacy has zero typed formulas; Docling has 16 and
  MinerU has 28, including LaTeX where supplied.
- Table relationships: Docling retains 11 and MinerU 10 structured tables with
  real cell coordinates/spans. Generation and grounding do not yet exploit the
  relationships reliably.
- Cumulative-frequency preservation: it survives in typed table evidence from
  both external adapters, but the final relationship gates still fail.
- Unsupported 67: no source-absent standalone 67 was introduced or made
  student-visible. The known relational defect is not fixed: MinerU omitted the
  highlighted 67-69 row in its parser output, and no adapter synthesized it.
- Metadata suppression: MinerU suppresses more metadata than Docling; Docling
  retains the university title and other structural noise. Both still need
  downstream hierarchy validation.

This source proves that preserving formula/table structure exposes better
evidence but does not itself solve reviewer relationship generation and
student-visible validation.

## Accounting parser path

Hybrid classification selects MinerU directly for the scanned/OCR-heavy PDF.
Both B9 parser captures map through the same new contract without Google
credentials:

| Parser | Pages | Typed block summary | Numeric provenance |
| --- | ---: | --- | ---: |
| Docling | 11 | 8 headings, 27 paragraphs, 12 images, 11 lists, 3 tables (73 cells) | 41/41 numeric cells |
| MinerU | 11 | 11 headings, 23 paragraphs, 1 image, 7 tables (121 cells) | 32/32 numeric cells |

MinerU marks OCR use. Docling's preserved B9 raw capture lacked an envelope flag,
although the actual B9 run used OCR. Known defects remain: Docling missed
`Accrual Accounting`, emitted malformed OCR text, merged four ledgers into one
9x7 table, and incompletely reconstructed the following ledger. MinerU retained
individual cells more often but still merged/misread some cells, omitted a
trial-balance debit total that exists in the source/Docling capture, and
promoted a bullet to a heading. Missing source relationships are never silently
corrected.

Google OCR is not removed. It remains the legacy fallback and therefore the
default production OCR path. The local MinerU scanned path demonstrates that a
configured external mode can create a `StructuredDocument` without Google
credentials.

## Performance observations

These CPU measurements are informational and were not used as the quality
decision:

| Parser | Source | Approximate parse duration | Notes |
| --- | --- | ---: | --- |
| Docling | Python generators | 299.5 s | CPU parse; model/runtime startup contributes. |
| Docling | Central tendency | 73.7 s | Born-digital structured parse. |
| Docling | Accounting | 96.7 s | OCR/layout work on 11 scanned pages. |
| MinerU | Python generators | 1661.3 s | Included roughly 25.6 minutes of first model initialization/download. |
| MinerU | Central tendency | 107.5 s | CPU pipeline. |
| MinerU | Accounting | 79.4 s | CPU PytorchPaddleOCR path. |

Generation added approximately 59-186 seconds per A/B arm. Model startup and
CPU parsing create latency and memory pressure, especially MinerU first run;
production sizing and warm-runtime behavior remain deferred.

## Verification

Fresh final verification passes:

- Engine typecheck and build.
- Engine evaluations: 396/396 (all prior 383 plus 13 B10 cases).
- API: 607/607 tests across 69 files.
- Durable workflow: 1/1.
- Focused mobile structured handoff: 10/10.
- Full repository typecheck and build.
- Lint, with only the four accepted mobile import-order warnings.
- `git diff --check` and `git fsck --full` with only the two known dangling
  blobs.
- Python bridge syntax parsing and production-path absolute-path scan.

## Remaining weaknesses and decision

- Explicit parser headings can still include document furniture, instructional
  labels, partial sentences, examples, results, or procedural fragments.
- Typed formula/table evidence is not yet used strongly enough by generation
  and relationship validation.
- OCR parser omissions and mutations remain source defects; numeric/provenance
  checks expose them but do not repair them.
- External CPU parsers are too slow for unconditional synchronous adoption and
  need deployment/runtime sizing.
- Live adapters depend on separately provisioned Python environments; their
  unit test boundary is intentionally fixture/fake based.

The integration meets B10's architecture criteria and keeps existing gates
intact. Structured parsing materially improves reviewer generation only
partially. Docling and MinerU should proceed toward production adoption behind
the feature flag and legacy fallback, but should not become the unconditional
default. The next task is `B11 - Harden reviewer hierarchy and student-visible
validation using typed parser structure`.
