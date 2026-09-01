# B9 Docling vs MinerU parser bake-off

Date: 2026-09-01

Overall verdict: **PASS — parser bake-off produced an actionable architecture decision**

Recommendation: **D — Hybrid: Docling primary + MinerU hard-document/OCR fallback**

Adopting this architecture would **PARTIALLY** reduce the planned B9 hand-written
heuristics. Native parser labels remove most code/table/formula guessing, but the
engine still needs generic document-class routing, repeated-title consolidation,
heading/furniture validation, and numeric relationship checks.

## Scope and starting state

This was an investigation only. No Stage 0–6 implementation, prompt, schema,
mobile, API, or OCR behavior was changed. Parser environments, model caches,
native outputs, rendered inspection pages, and scripts remain outside the
repository in:

```text
C:\Projects\stay-focused-v2-parser-bakeoff
```

Starting repository state:

| Check | Result |
| --- | --- |
| Branch | `main` |
| HEAD | `cff27bcdfffb15933d7191d87cc44f7b4ff5fb77` |
| `origin/main...HEAD` | `0 0` |
| Working tree | Only the known untracked `docs/ai/acceptance/b8/reviewer-e2e-acceptance.md` |
| Engine eval | **383 passed, 0 failed** |

Acceptance sources:

| Source | Full path | Pages |
| --- | --- | ---: |
| Python generators | `C:\Projects\stay-focused-v2\.local\b8-acceptance-work-20260901\Files\5.0 - Generators in Python.pdf` | 34 |
| Central tendency | `C:\Projects\stay-focused-v2\.local\b8-acceptance-work-20260901\Modules\6. Descriptive Statistics\Measures of Central Tendency2-1-1-1-1.pdf` | 6 |
| Recording methods and ledgering | `C:\Projects\stay-focused-v2\.local\b8-acceptance-work-20260901\Files\3-Recording Methods and Ledgering.pdf` | 11 |

## Environment and installation

| Check | Result | Notes |
| --- | --- | --- |
| System Python | 3.14.7 | `python` and `py`; system pip 26.2.1 |
| Parser Python | 3.12.14 | Managed by `uv`, isolated per parser |
| NVIDIA | Not usable/detected | `nvidia-smi` exists but returned insufficient permissions; Windows reported an AMD Radeon 780M and a Parsec virtual display adapter |
| CUDA | Unavailable | Docling: PyTorch 2.13.0+cpu; MinerU: PyTorch 2.8.0+cpu; both reported `cuda=False`, CUDA version `None`, and zero CUDA devices |
| WSL | Available | WSL 2; default distribution `docker-desktop` |
| Docker | CLI only | Docker 29.7.2; daemon pipe was absent |

Docling was installed from the [official installation guidance](https://docling-project.github.io/docling/getting_started/installation/)
in `C:\Projects\stay-focused-v2-parser-bakeoff\.venv-docling`.
`uv pip show` confirmed Docling **2.124.0** on Python 3.12.14.

MinerU was installed as `mineru[all]` using `uv`, following the
[official quick start](https://github.com/opendatalab/MinerU/blob/master/docs/en/quick_start/index.md),
in `C:\Projects\stay-focused-v2-parser-bakeoff\.venv-mineru`.
`uv pip show` confirmed MinerU **3.4.5** on Python 3.12.14. The supported
`pipeline` backend ran on CPU. Hugging Face downloads initially failed because
the installed hub client attempted Windows symlinks without the required
privilege; setting MinerU's supported `MINERU_MODEL_SOURCE=modelscope` kept all
models in the external workspace and completed successfully.

No parser package or model was installed in or copied into the monorepo.

## Preserved outputs and runtimes

| Parser/source | Status | Approximate duration | Native evidence |
| --- | --- | ---: | --- |
| Docling / Python | Success | 299.499 s | Markdown plus full Docling document-tree JSON |
| Docling / statistics | Success | 73.706 s | Markdown plus full Docling document-tree JSON |
| Docling / accounting | Success | 96.687 s | Markdown plus full Docling document-tree JSON |
| MinerU / Python | Success | 1,661.257 s | Markdown, content-list v1/v2, middle/model JSON, layout/span/origin PDFs |
| MinerU / statistics | Success | 107.468 s | Same native output set plus extracted equation/table images |
| MinerU / accounting | Success | 79.405 s | Same native output set plus extracted table images |

The first MinerU duration includes approximately 25.6 minutes of one-time model
initialization/download. Warm-run quality, not speed, is used for the verdict.

Stay Focused comparison captures are under:

```text
C:\Projects\stay-focused-v2-parser-bakeoff\comparison\stay-focused
```

The Python and statistics files preserve the B8 structured input. All their
source blocks were `unknown` blocks despite page attribution. The accounting
capture records exactly:

```text
BLOCKED — Google OCR credential unavailable
```

## Scoring method

Scores use `0 = missing/broken`, `1 = weak`, `2 = mostly correct`, and
`3 = strong`. `N/E` means the source does not exercise that capability and is
not treated as positive evidence. Scores reflect only the outputs produced for
these PDFs, not documented features.

## Python generators: full capability matrix

| Capability | Stay Focused | Docling | MinerU |
| --- | ---: | ---: | ---: |
| Reading order | 2 | 3 | 3 |
| Heading hierarchy | 0 | 2 | 2 |
| Paragraph grouping | 1 | 2 | 2 |
| List preservation | 0 | 3 | 2 |
| Code-block recognition | 0 | 2 | 3 |
| Table detection | N/E | N/E | N/E |
| Table cell relationships | N/E | N/E | N/E |
| Formula preservation | N/E | N/E | N/E |
| Page attribution | 3 | 3 | 3 |
| Header/footer suppression | 1 | 2 | 3 |
| Presentation-noise handling | 0 | 2 | 2 |
| OCR/scanned PDF | N/E | N/E | N/E |
| Output useful for LLM generation | 1 | 2 | 2 |

### Docling evidence

Docling produced 40 `section_header`, 113 `text`, 91 `list_item`, and 16
`code` nodes. Every inspected node retained page provenance. It correctly kept
the `Cities = [...]` literal and most examples out of headings, preserved
`Parañaque` without mojibake, and represented bullets as list items. Code was
sometimes flattened into one line, one condition split across two code nodes,
and a body sentence (`An example of how it is used can be seen here:`) was
promoted as a heading.

Detected headings, with repeated slide titles counted:

```text
Unit 5: Generators in Python
REVIEW
ITERATORS (x6)
GENERATORS (x2)
Yield Command
GENERATOR FUNCTION vs GENERATOR EXPRESSION
Generator Expressions (x2)
Examples: (x2)
An example of how it is used can be seen here:
The next() function (x3)
Generator Functions (x7)
Using a Regular List
Using a Generator Expression
Using Generators
When to use:
When to not use:
ACTIVITY
Infinite Sequences (x3)
Sending objects to a Generator (x4)
```

### MinerU evidence

MinerU produced 159 `text`, 31 `code`, and 100 `footer` objects. Every content
object retained `page_idx`. It preserved more code regions and multiline code
than Docling, but OCR introduced source changes: a missing comma in the cities
literal, an extra `R`, `1ist`, split words, accent artifacts, and incorrect
language tags such as `julia` and `lisp` for Python. Bullets survived mainly as
characters inside text rather than list objects.

Detected headings:

```text
Unit 5: Generators in Python
REVIEW
ITERATORS (x6)
GENERATORS (x2)
Yield Command
GENERATOR FUNCTION vs GENERATOR EXPRESSION
Generator Expressions (x2)
Examples: (x2)
Sample 2
Sample 4
The next() function (x3)
Generator Functions (x7)
Using Generators
ACTIVITY
Infinite Sequences (x3)
Sending objects to a Generator (x4)
```

### Suspicious B8 heading classification

| Suspicious class | Docling | MinerU |
| --- | --- | --- |
| Code fragment | Correctly typed as code/list/body in the inspected cases | Correctly typed as code in the inspected cases, with some OCR mutation |
| List literal | Correctly typed as list/code rather than heading | Correctly typed as code/body rather than heading |
| Partial sentence | Mostly correctly typed, but one explanatory sentence was incorrectly promoted | Correctly typed as body in the B8 examples |
| `REVIEW` | Incorrectly promoted | Incorrectly promoted |
| `ACTIVITY` | Incorrectly promoted | Incorrectly promoted |
| Mojibake/noise | Suppressed/decoded; clean `Parañaque` | Original mojibake suppressed, but different OCR noise was introduced |

Both parsers preserve repeated titles rather than providing a consolidated
concept hierarchy. `REVIEW` and `ACTIVITY` remain indistinguishable from real
concept headings without a downstream structural rule.

## Central tendency: full capability matrix

| Capability | Stay Focused | Docling | MinerU |
| --- | ---: | ---: | ---: |
| Reading order | 2 | 3 | 3 |
| Heading hierarchy | 1 | 2 | 2 |
| Paragraph grouping | 2 | 3 | 3 |
| List preservation | 1 | 2 | 2 |
| Code-block recognition | N/E | N/E | N/E |
| Table detection | 1 | 3 | 3 |
| Table cell relationships | 1 | 3 | 2 |
| Formula preservation | 1 | 1 | 2 |
| Page attribution | 3 | 3 | 3 |
| Header/footer suppression | 1 | 1 | 3 |
| Presentation-noise handling | 1 | 2 | 2 |
| OCR/scanned PDF | N/E | N/E | N/E |
| Output useful for LLM generation | 1 | 2 | 3 |

Stay Focused retained readable text and pages, but flattened tables/formulas
into `unknown` blocks. B8 then promoted university metadata and result
sentences, lost important grouped-table relationships, introduced unsupported
`67`, grounded at 0.75, and correctly refused assembly.

### Docling relationship inspection

Docling produced 17 section headers, 16 formula-labelled text nodes, and 11
tables. The hierarchy is positional rather than semantic: headings, formulae,
and tables all point to the document body rather than to explicit Mean/Median/
Mode parent nodes.

```text
A. MEASURES OF CENTRAL TENDENCY
└─ 1. ARITHMETIC MEAN
   ├─ a. Computation ... Ungrouped Data
   ├─ formula orig: X̄ = ΣX / n
   ├─ b. WEIGHTED ARITHMETIC MEAN
   └─ subjects × grades × units table
└─ c. COMPUTING THE MEAN OF GROUPED DATA
   ├─ height × frequency table
   ├─ height × frequency × midpoint table
   └─ height × frequency × midpoint × f(Xm) table
└─ 2. THE MEDIAN
   ├─ median formula nodes
   └─ <cf/process and <cf/ranking tables
└─ 3. THE MODE
   ├─ mode formula nodes
   └─ grouped-frequency/modal-class tables
```

The Markdown exporter emitted `formula-not-decoded`; the richer JSON retained
source glyph strings in `orig` while leaving `text` empty. A downstream adapter
could recover those glyphs, but they are not normalized LaTeX and have no
explicit heading parent. Tables were strong: ordinary and cumulative-frequency
rows/columns survived, including `<cf` values 2, 7, 19, 34, 42, 47, and 50.
Result values were present in source-derived nodes. A final result (`Mode =
70.4`) was incorrectly promoted as a heading.

### MinerU relationship inspection

MinerU produced 12 same-level heading objects, 28 equation objects containing
LaTeX, 10 HTML tables, and three metadata `header` objects.

```text
A. MEASURES OF CENTRAL TENDENCY
└─ 1. ARITHMETIC MEAN
   ├─ equation: X̄ = ΣX / n
   ├─ weighted-grade HTML table
   └─ grouped midpoint/f(Xm) HTML tables
└─ 2. THE MEDIAN
   ├─ equation: Median = LCB + ((n/2 - cfa) / fmd)i
   └─ cumulative-frequency/process/ranking HTML tables
└─ 3. THE MODE
   ├─ equation: Mode = LCB + (d1 / (d1 + d2))i
   └─ grouped-frequency/modal-class HTML tables
```

This is also an inferred sequential parentage, not an explicit nested tree, but
the sequence is cleaner and university/course metadata is suppressed as
`header`. Equations and table cells are immediately usable by an LLM. Most
values are traceable to page-specific equation/table objects. Errors remain:
some LaTeX tokens are spaced or mistranscribed, one median expression became
`Pl09`, and the highlighted median-class table lost the `67–69` row even though
the adjacent cumulative-frequency tables retained it. No missing answer was
calculated or repaired for this comparison.

## Accounting/OCR: full capability matrix

| Capability | Stay Focused | Docling | MinerU |
| --- | ---: | ---: | ---: |
| Reading order | 0 | 2 | 3 |
| Heading hierarchy | 0 | 1 | 2 |
| Paragraph grouping | 0 | 2 | 3 |
| List preservation | 0 | 3 | 2 |
| Code-block recognition | N/E | N/E | N/E |
| Table detection | 0 | 3 | 3 |
| Table cell relationships | 0 | 1 | 2 |
| Formula preservation | N/E | N/E | N/E |
| Page attribution | 0 | 3 | 3 |
| Header/footer suppression | 0 | 2 | 3 |
| Presentation-noise handling | 0 | 2 | 2 |
| OCR/scanned PDF | 0 | 2 | 3 |
| Output useful for LLM generation | 0 | 2 | 3 |

### Docling

```text
OCR required: Yes; all 11 pages are image-heavy/scanned
OCR backend: RapidOCR on Torch CPU, PP-OCRv6 detection/recognition
Successful: Yes, locally, without Google credentials
Text quality: Mostly readable; missed Accrual Accounting and retained errors such as "P R E P A R E D B" and "record containing bookkeeping is a entries"
Table quality: Mixed; excellent 17×3 trial balance with both 97,100 totals, but the four-ledger page was merged into one 9×7 table and the next page's debit/credit ledgers were incomplete/scrambled
```

### MinerU

```text
OCR required: Yes; all 11 pages are image-heavy/scanned
OCR/backend: PytorchPaddleOCR in MinerU pipeline mode, local Torch CPU
Successful: Yes, locally, without Google credentials
Text quality: Strong; detected Cash, Accrual, Hybrid, Ledger, and Unadjusted Trial Balance headings with readable definitions
Table quality: Mostly correct segmentation; four separate page-7 account tables, two page-8 debit/credit ledger tables, and a 17×3 trial balance. Individual cells still merged/misread, and the trial-balance debit total was omitted while the source and Docling preserve both 97,100 totals
```

MinerU also incorrectly promoted the bullet `prepared before any adjusting
entries are made` to heading level. Neither parser's complex ledger cells should
be accepted without source-image/numeric validation.

The architectural finding is nevertheless decisive: **both parsers remove the
current hard dependency on Google OCR for this source class**. MinerU provides
the better local OCR/layout representation; Docling provides a valuable
cross-check for totals and native text.

## Overall scores

These aggregate scores summarize only capabilities actually exercised by at
least one source. They are judgment summaries, not arithmetic averages.

| Capability | Stay Focused | Docling | MinerU |
| --- | ---: | ---: | ---: |
| Reading order | 1 | 3 | 3 |
| Heading hierarchy | 0 | 2 | 2 |
| Paragraph grouping | 1 | 2 | 3 |
| Lists | 0 | 3 | 2 |
| Code | 0 | 2 | 3 |
| Tables | 1 | 3 | 3 |
| Formulae | 1 | 1 | 2 |
| Page attribution | 2 | 3 | 3 |
| Noise suppression | 1 | 2 | 2 |
| OCR | 0 | 2 | 3 |
| LLM-ready output | 1 | 2 | 3 |

## Optional direct generation experiment

The experiment was not run. There is no existing lossless adapter from either
native parser schema into `SourceNormalizationInput`. Creating one would require
exactly the heading/list/formula/table transformation policy this bake-off is
meant to select, so a one-off adapter would confound parser quality with new
heuristics. Four live diagnostic reviewers would also add many provider calls
without establishing that the mapping, rather than the parser, caused the
difference.

The current B8 generation evidence remains relevant:

| Current input | Coverage | Grounding | Issues | Assembly | Student-visible result |
| --- | ---: | ---: | ---: | --- | --- |
| Python unknown blocks | 1.00 | 1.00 | 0 reported; 6 retries, 3 fallbacks | Yes, 16 sections | Fail: fragments/noise promoted despite passing metrics |
| Statistics unknown blocks | 1.00 | 0.75 | Unsupported `67`; incomplete relationships | No, 6 planned/0 final | Fail safely |

The next implementation task should first define and regression-test the native
parser adapter. The same frozen sources can then provide a fair generation A/B
using a single shared mapping contract.

## Architectural findings

- **Primary current failure:** document structure. Stage 0 supplies flat,
  untyped text, and later generation is asked to reconstruct code, headings,
  tables, and equations from lexical appearance.
- **Born-digital/code-heavy source:** Docling is the safer primary parser. It
  uses native text cleanly, preserves Unicode and lists, and does not introduce
  MinerU's OCR mutations. MinerU recognizes more code blocks but changes source
  tokens and language labels.
- **Formula/table-heavy source:** MinerU is stronger. Its page-specific LaTeX
  equation objects and HTML tables are more immediately useful than Docling's
  empty `text` formula nodes, though Docling's table cells were sometimes more
  complete.
- **Scanned source:** both local OCR paths work without Google. MinerU better
  separates ledger regions and detects headings; Docling correctly preserved a
  total MinerU omitted.
- **No parser produces a finished study hierarchy:** both use mostly flat
  heading levels, repeat slide titles, and promote some presentation/body
  labels. Parser output must be treated as evidence, not truth.
- **Remaining engine work:** generic document classification/routing, source
  provenance, repeated-title merging, heading plausibility/furniture filtering,
  table/equation serialization, numeric validation against source cells/images,
  and student-visible quality checks that do not equate coverage/grounding 1.00
  with a usable reviewer.

## Recommendation

**D — Hybrid: Docling primary + MinerU hard-document/OCR fallback**

Use Docling as the default for born-digital documents and code-heavy slides.
Route image-heavy pages and documents with dense equations or complex tables to
MinerU. Preserve the original PDF plus page/bounding-box provenance, and permit
Docling/MinerU cross-checking for high-risk numeric tables rather than silently
choosing one cell value.

**Would this substantially reduce B9 heuristic work? PARTIALLY.** It removes the
need to infer most code blocks, table grids, equation regions, page boundaries,
and scanned text from plain strings. It does not remove the need for small,
generic policies around routing, hierarchy consolidation, furniture/assessment
label handling, source fidelity, and numeric relationship validation.

## Repository disposition and verification

- Temporary workspace: `C:\Projects\stay-focused-v2-parser-bakeoff`
- Tracked Stay Focused output: only
  `docs/ai/acceptance/b9/parser-bakeoff.md`
- B8 report SHA-256 before documentation:
  `4633D6986940DDD8065DBC232F82F62F44DEACCB5DCB765153132F1D12B10389`
- Production code: unchanged
- Parser dependencies/model outputs: external and untracked
- Push: not performed

## Next recommended task

Design a Stage 0 parser-adapter contract and a generic document router behind a
feature flag. Add frozen regressions for this exact code-slide, statistics, and
scanned-ledger trio; require page/bounding-box provenance and numeric table
validation; then run the deferred generation A/B before enabling either parser
in production.
