# B11 - Typed Reviewer Hierarchy and Relationship Grounding Hardening

Date: 2026-09-02 (Asia/Manila)

Branch: `main`

Starting HEAD: `13e0b4157aab012c188eb69e3befd02a36936415`

Verdict: `PASS`

Continuation audit note: the repository was later reopened at local B11 commit
`56b2519c397854c081500d9f8f48245bccdeaa1e` (three ahead, zero behind) with
only the known B8 directory untracked. The audit added a source-absent
relationship regression and found that typed group co-membership was too broad
an exemption for explicit arrows, sibling fusion, and algebraic transforms.
Those exemptions now require an exact source/parser representation; group
membership alone never proves a relationship.

## Starting state

The working tree contained only the known untracked B8 acceptance directory,
which B11 did not modify. `main` was two commits ahead and zero behind
`origin/main`. The fresh baselines passed at 396/396 engine evaluations and
607/607 API tests. Repository object verification reported only the two known
dangling blobs.

## Root causes

Stage 1 treated every parser-typed heading as a conceptual boundary. Heading
level, conceptual parent, neighbor roles, body volume, repetition, lexical
shape, and subordinate typed children did not determine the heading's role.
Non-contiguous duplicates were disambiguated with numeric suffixes, and
discarding a bad boundary risked separating it from its child evidence.

Stage 0 retained `structuredBlock`, but Stages 2 and 3 mostly serialized block
text. Formula raw text/LaTeX, exact table cells, result paragraphs, and their
shared structural relationship did not have a plan-level representation.
Stage 5 consequently validated flattened prose and could reject a real typed
cell or formula representation. It could also reject a source-supported
relationship as sibling fusion, while having no explicit guard against a
model-derived algebraic transformation of a real formula.

Stage 6 validated IDs and upstream reports but had no objective gate for
student-visible furniture, code/body-fragment titles, duplicates, empty
sections, repeated structural noise, or a section hiding multiple unrelated
heading transitions.

Representative B10 failures were classified before matching behavior changed:

| Example | Category | Trace result |
| --- | --- | --- |
| Mean formula | D | Stage 0 retained raw/LaTeX structure, but the B10 Stage 3 request exposed only the flattened representation. |
| Median formula/table | G | Formula, table, and result evidence survived but noisy headings separated or attached them to the wrong concept boundary. |
| Cumulative frequency | E | Exact cells existed, while validation searched flattened prose/semantic points and could report sibling fusion. |
| Mode result | D | The result paragraph existed after typed evidence, but no plan-level association reached Stage 3. |
| Ordinary numeric cell | E | Cell text/provenance existed, but Stage 5 had no cell-level evidence matcher. |

## Heading roles and consolidation

Typed headings now receive a generic multi-signal role score. Inputs include
heading level, conceptual parent, title shape and punctuation, body volume,
repetition, instructional shape, all-caps label shape, hierarchy confidence,
and code/formula/table/image children. A small furniture vocabulary contributes
to the score but is not the classifier by itself. Metadata front matter is
detected through compact label/value structure rather than source subject.

Subordinate headings are folded into the preceding evidence-supported concept,
retaining their ordered block IDs and provenance. Equivalent typed headings
under the same conceptual parent merge in source order without artificial
numeric suffixes. Same-named headings under different conceptual parents stay
separate. Code, formula, table, list-like, and malformed sentence fragments are
not promoted to concept titles.

## Typed relationship grouping

Each planned section may carry typed evidence groups. A group records its
concept ID, ordered member blocks, formula/table/code/result block IDs, formula
raw text and parser LaTeX, and table cells with row/column indexes, spans, page,
parser, block, and table-cell provenance. Group construction uses typed
structure, parentage, section membership, order, and proximity; it contains no
statistics-, programming-, or course-specific rule.

Stage 3 serializes these groups explicitly. The prompt distinguishes formula
source text from parser representation and names exact table coordinates. It
also states that association does not authorize an unstated calculation or
transformation. Bounded retries reuse the same planned typed evidence rather
than inventing a replacement concept.

## Table, formula, and numeric grounding

Stage 5's grounding source now includes ordinary source text, typed formula
representations, exact table cells, and deterministic semantic units. Exact
cell evidence such as `67–69` is accepted with its cell provenance. A generated
standalone `67` is not accepted merely because the range cell exists.

Formula raw text remains grounding evidence when parser LaTeX is also present;
both are serialized separately. An algebraically transformed expression is
rejected unless that exact representation exists in source evidence. A visible
relationship may use multiple members of one typed group only when the
relationship itself has an exact source/parser representation. Membership
alone does not prove an arrow, sibling fusion, calculation, or algebraic
transformation.

## Student-visible structure gate

Stage 6 can now stop assembly with stable diagnostics:
`NON_CONCEPT_HEADING`, `PRESENTATION_FURNITURE_HEADING`,
`DUPLICATE_SECTION`, `TITLE_BODY_FRAGMENT`, `CODE_TITLE`,
`OVERSIZED_SECTION`, `EMPTY_EXPLANATION`, and `STRUCTURAL_NOISE`.

The oversized check is evidence-based, not a blind key-point cap. It requires a
dense output plus multiple hidden heading-shaped points and multiple source
heading transitions (or an extreme visible size with the same structural
evidence). A regression protects a legitimate dense 12-point source section.

## Python before and after

| Parser/run | Planned/final | Coverage | Grounding | Issues | Retries/calls | Assembly | Student-visible result |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| B10 Docling | 20/20 | 1.00 | 1.00 | 0 | 6/26 | Passed | Partial: furniture, fragments, and duplicate suffixes remained. |
| B11 legacy control | 16/0 | 1.00 | 1.00 | 0 | 12/28 | Withheld | The new gate catches the legacy code-like `characters:` title. |
| B11 Docling | 13/13 | 1.00 | 1.00 | 0 | 10/23 | Passed | Clean conceptual hierarchy and usable source-core structure. |

B11 Docling exact titles:

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

`REVIEW`, `ACTIVITY`, `Examples:`, `When to use:`, `When to not use:`, the
partial example sentence, code/list literals, and repeated numeric title
suffixes are absent as top-level concepts. Their evidence remains available
under supported concepts.

## Statistics before and after

| Parser/run | Planned/final | Coverage | Grounding | Issues | Fabrication failures | Assembly |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| B10 Docling | 17/0 | 0.87 | 0.78 | 41 | Not separately summarized | Withheld |
| B11 Docling | 11/0 | 0.89 | 0.81 | 4 omissions | 0 | Withheld (21 retries / 32 calls) |
| B10 MinerU | 12/0 | 0.95 | 0.71 | 40 | Not separately summarized | Withheld |
| B11 MinerU | 10/0 | 0.89 | 0.78 | 2 omissions | 0 | Withheld (12 retries / 22 calls) |

Docling retains 16 formula blocks and 11 tables; MinerU retains its typed
formula/table source and the planned Mean, Median, and Mode hierarchy. Evidence
groups demonstrate that formula, table, result, and exact cell evidence reach
the plan together. Representative groups include:

- Docling grouped Mean: 2 formulas, 3 tables, 12 result blocks, 79 cells.
- Docling grouped Median: 1 formula, 4 tables, 10 result blocks, 118 cells.
- Docling grouped Mode: 4 formulas, 3 tables, 9 result blocks, 39 cells.
- MinerU grouped Mean: 4 formulas, 3 tables, 7 result blocks, 81 cells.
- MinerU grouped Median: 5 formulas, 4 tables, 9 result blocks, 130 cells.
- MinerU grouped Mode: 9 formulas, 2 tables, 7 result blocks, 37 cells.

Cumulative-frequency rows and numeric cell provenance survive in the typed
groups. Metadata, `Solution`, result labels, and the procedural `Substitute`
fragment no longer outrank the central-tendency concepts. Neither parser arm
has a relationship or fabrication diagnostic. Docling remains withheld for
four incomplete-list omissions; MinerU remains withheld for two omissions and
one missing planned-section output. This is preferable to inventing the
missing evidence. The planned Docling ordering still places the broad measures
heading after an arithmetic-mean subsection, so hierarchy ordering remains a
known quality limitation even though it is no longer a grounding cascade.

The live runs do not introduce a source-absent standalone `67`. The focused
cell regression accepts exact `67–69`, rejects standalone `67` as a substring,
and the missing-row regression proves that neither retry nor assembly can
synthesize it.

## Accounting scope

No accounting reviewer was generated. The existing structured captures still
map without breakage: Docling retains 73 cells and 41/41 numeric cells with
table provenance; MinerU retains 121 cells and 32/32 numeric cells with table
provenance and keeps OCR origin. Known parser omissions remain unsynthesized.

## Verification

- Focused B11 families: 9/9, including explicit source-present versus
  source-absent relationship classification.
- Engine typecheck and build: passed.
- Engine evaluations: 405/405; all original 396 remain passing.
- API: 607/607 tests across 69 files.
- Full repository typecheck and build: passed.
- Lint: passed with only the four accepted mobile import-order warnings.
- `git diff --check`: passed.
- `git fsck --full`: only the two known dangling blobs.

The parser production default remains `legacy`; the legacy extraction and
Google OCR paths remain present. No parser routing, mobile UI, subject-specific
rule, source repair, absolute developer path, or secret was added.

## Remaining work

The statistics arms are dramatically less noisy but still withheld, and the
Docling broad-parent ordering should be observed in a full end-to-end rerun.
Parser omissions remain hard failures by design. The appropriate next task is
the full B8 acceptance rerun using the feature-flagged hybrid parser path, not
unconditional parser-default promotion.
