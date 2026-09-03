# B12 Full B8 Hybrid Reviewer Acceptance

Date: 2026-09-03 (Asia/Manila)

Verdict: **FAIL — B12 exposed unresolved Reviewer acceptance defects**

## Starting state

- Branch: `main`
- Starting HEAD: `bf0c8d1914d25edfe6a4fbb9fdea4c8d125aeb03`
- Ahead/behind: 4 ahead / 0 behind `origin/main`
- Working tree: only the known untracked `docs/ai/acceptance/b8/`
- Engine baseline: typecheck and build passed; evaluations 405/405 passed.
- API baseline: 69 files and 607/607 tests passed.
- Git fsck: passed with only known dangling blobs `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and `625ec44ccb5695fe93ac518f09238fac61eca223`.

The historical B8 directory was read but not modified or staged.

## Frozen B8 contract

The authoritative course-material pool is
`C:\Users\Fely Max Dilinila\Documents\Projects\materials`. B8 selected one
source from each of three materially different classes; B12 reused those exact
files from its read-only extracted working copy.

| Case | Source | Course/domain | Expected major concepts | Original parser | Original result | Historical failure |
| --- | --- | --- | --- | --- | --- | --- |
| Python generators | `5.0 - Generators in Python.pdf` | CC3 / Python | iterables, iterators, generators, yield, generator expressions/functions, `next()`, infinite sequences, `send()` | Native PDF / legacy | Coverage 1.00, grounding 1.00, assembled 16; acceptance fail | Furniture, code/body fragments, repetition, and oversized lists made the reviewer poor for study. |
| Central tendency | `Measures of Central Tendency2-1-1-1-1.pdf` | MATH 100 / descriptive statistics | mean, median, mode, formulas, worked values, frequency/cumulative-frequency tables | Native PDF / legacy | Diagnostic coverage 1.00, grounding 0.75, 6 planned/0 final; fail | Invalid hierarchy, unsupported `67`, and incomplete table/sequence representation. |
| Accounting ledgering | `3-Recording Methods and Ledgering.pdf` | CIT5 / accounting | cash/accrual/hybrid accounting, ledgers, debit/credit rows, unadjusted trial balance | Google OCR / legacy | Extraction blocked; no reviewer | Approved Google OCR credentials were unavailable. |

B8 did not freeze a separate prose threshold table. The stricter executable and
student-visible contract applied here is:

- coverage at least 0.80 for every required case and a passing coverage status;
- grounding at least 0.80, with no unresolved issue on assembled content;
- no unsupported visible fabrication, guessed number/formula/row, or unstated relationship;
- successful final assembly for every required source;
- concept-level titles, non-empty explanatory text, concise grounded key points,
  necessary typed evidence, and material usefulness for direct study.

B8's overall historical verdict was FAIL. B12 therefore had to pass all three
cases, not merely improve their metrics.

## Hybrid parser implementation and routing

Production still defaults to `legacy`. B12 set `DOCUMENT_PARSER_MODE=hybrid`
only in its acceptance processes. The actual router classifies inspected PDFs
from observable signals. Born-digital sources try Docling, then MinerU, then
legacy. Formula/table and scanned/OCR-heavy sources try MinerU, then legacy.
Explicit Docling mode was used only for the required Statistics comparison.
Every external parse is quality-gated before normalization; no fallback was
needed in these runs.

| Case | Source | Class | Parser | OCR | Structured evidence | Fallback | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Python hybrid | 34-page Python PDF | born-digital | Docling | Not required | 40 headings, 3 paragraphs, 91 lists, 16 code, 34 images; 184 coordinate and parent links | None | Extraction pass |
| Statistics hybrid | 6-page Statistics PDF | formula-table-heavy | MinerU | Not required by native inspection; MinerU reported internal OCR use | 12 headings, 62 paragraphs, 28 formulas, 10 tables, 266 cells; 112 coordinate links | None | Extraction pass |
| Statistics comparison | same Statistics PDF | formula-table-heavy | Docling | Not required | 17 headings, 68 paragraphs, 10 lists, 16 formulas, 11 tables, 254 cells, 4 images; 126 coordinate/parent links | None | Extraction pass |
| Accounting hybrid | 11-page scanned Accounting PDF | scanned/OCR-heavy | MinerU | Required on 11/11 pages | 11 headings, 23 paragraphs, 7 tables, 121 cells, 1 image; 42 coordinate links | None | Extraction pass |

Parser quality diagnostics were empty. Page order, captions/text, formulas,
table rows/cells, code, result paragraphs, provenance, and coordinates survived
where present. MinerU did not emit conceptual `parentId` links, but its evidence
remained ordered and typed. No case met the definition of `PARSER_LOSS`.

## Acceptance execution

`apps/api/scripts/b12-hybrid-acceptance.ts` reused the production inspector,
router, parser adapters, normalization, and `runPipeline` components. It did
not duplicate pipeline behavior. A second runner,
`scripts/b12-hybrid-durable-acceptance.ts`, used a disposable authenticated
Supabase user and the real `/api/jobs` upload, persisted extraction,
reviewer-generation, polling, result, and cleanup path.

The first durable diagnostic exposed a real defect: persisted typed blocks were
expanded as legacy presentation pages because the full `StructuredDocument`
wrapper is intentionally not stored in reviewer job metadata. After the focused
Stage 0 fix, all three durable cases were rerun from fresh uploads. Python then
succeeded with 13 conceptual sections; Statistics and Accounting failed safely.
The disposable users and uploaded objects were removed.

## Full B12 results

The detailed metrics below are from the instrumented production pipeline run.
The post-fix durable API run independently confirmed its parser selection,
concept counts, successful Python assembly, and safe Statistics/Accounting
withholding.

| Case | Parser | Coverage | Grounding | Issues | Planned | Generated | Final | Retries/calls | Assembly | Verdict |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Python generators | Docling | 1.00 | 1.00 | 0 | 13 | 13 | 13 | 6/19 | Passed | FAIL: manual student-visible inspection |
| Statistics | MinerU | 0.89 | 0.78 | 2 omissions | 10 | 9 | 0 | 9/19 | Withheld | FAIL |
| Statistics comparison | Docling | 0.89 | 0.81 | 4 omissions | 11 | 11 | 0 | 20/31 | Withheld | FAIL |
| Accounting ledgering | MinerU | 0.92 | 1.00 | 0 | 6 | 6 | 0 | 7/13 | Withheld | FAIL |

All four runs recorded zero fabrication failures and zero relationship failures.
Statistics/MinerU could not produce the broad `A. MEASURES OF CENTRAL TENDENCY`
section. Statistics/Docling produced every planned section, but four SourceCore
payloads omitted required list items. Accounting's `Ledger` section covered
only two of three semantic targets and omitted the exact source row
`15.9.17 | To Capital A/C | XXXX`; Stage 6 correctly rejected the weak section.

## Student-visible inspection

| Case | Hierarchy | Titles | Explanations | Key points | Typed evidence | Study usefulness |
| --- | --- | --- | --- | --- | --- | --- |
| Python | Concept boundaries and duplicate consolidation pass | Exact 13-title B11 list; no `REVIEW`, `ACTIVITY`, fragment, code, or suffix title | Fail: `GENERATOR FUNCTION vs GENERATOR EXPRESSION` and `Using a Regular List` merely repeat the title; `GENERATORS` has no useful explanatory sentence | Fail: `ACTIVITY` instructions leak into `GENERATORS`; some sections are long source dumps rather than concise points | Code and source values remain exact and grounded | Fail under the frozen usefulness requirement |
| Statistics / MinerU | Upstream Mean/Median/Mode hierarchy and typed groups exist | No final titles because assembly was withheld | Not student-visible | Not student-visible | 28 formulas, 10 tables, and 266 cells survive upstream | Fail: no reviewer |
| Statistics / Docling | Upstream hierarchy exists, with one additional ungrouped Mode section | No final titles because assembly was withheld | Not student-visible | Not student-visible | 16 formulas, 11 tables, and 254 cells survive upstream | Fail: no reviewer |
| Accounting | Six conceptual sections; furniture is not promoted | No final titles because assembly was withheld | Not student-visible | Not student-visible | Seven tables and 121 exact cells survive; missing ledger target is not guessed | Fail: no reviewer |

The exact assembled Python source-core text is stored in
`python-generators-reviewer.txt`. Its title repair is substantial, but technical
grounding alone is not sufficient to call it acceptable.

## Statistics structured-parser comparison

### MinerU

- Coverage: 0.89
- Grounding: 0.78
- Issues: 2 grounding omissions
- Omissions/fabrications: 2/0
- Sections: 10 planned, 9 generated, 0 assembled
- Assembly: withheld for missing planned output
- Retries/calls: 9/19

### Docling

- Coverage: 0.89
- Grounding: 0.81
- Issues: 4 grounding omissions
- Omissions/fabrications: 4/0
- Sections: 11 planned, 11 generated, 0 assembled
- Assembly: withheld for failed grounding
- Retries/calls: 20/31

MinerU preserved the source better for this benchmark: zero measured text loss,
28 formula blocks versus 16, 266 cells versus 254, a cleaner 10-section outline,
and half as many generated-content omissions. Docling retained explicit parent
links and one more table, and its generated grounding score was slightly higher,
but it required more retries and still had twice as many omissions. Neither
parser met acceptance because neither produced an assemblable reviewer.

Mean, median, mode, formula, source-table, result, cumulative-frequency, and
grouped-calculation evidence were present in both parser outputs. The failures
therefore occur after parsing. They are provider omissions, not permission to
relax exact grounding.

## Python regression

- Coverage: 1.00
- Grounding: 1.00
- Issues: 0
- Sections: 13 planned/generated/final
- Assembly: passed
- Retries/calls: 6/19
- Title regressions: none; exact B11 title list retained
- Technical B11 regression verdict: pass
- B12 student-usefulness verdict: fail for non-explanatory sections, activity
  leakage into key points, and excessive source-like lists

## Failure classification

| Failure | Case | Category | Loss stage | Source evidence | Parser evidence | Generation evidence | Grounding evidence | Safe to fix? | Fixed? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Persisted typed blocks underwent legacy page expansion | All durable cases | B — Normalization loss | Stage 0 after durable rehydration | Yes | Yes | Degraded | Degraded | Yes, minimal predicate | Yes |
| Required broad section and list items omitted | Statistics / MinerU | F — Provider generation omission | Stage 3 and bounded retries | Yes | Yes | Incomplete | Two omission issues; zero fabrication | Not by weakening gates; needs focused generation work | No |
| Required list items omitted | Statistics / Docling | F — Provider generation omission | Stage 3, detected in Stage 5 | Yes | Yes | Incomplete | Four omission issues; zero fabrication | Not by weakening gates; needs focused generation work | No |
| Exact ledger-row target omitted | Accounting / MinerU | F — Provider generation omission | Stage 3/fallback, detected in Stage 4 | Yes | Yes | Incomplete | Grounded generated text, but weak coverage | Potentially, after focused reproduction | No |
| Non-explanatory sections and activity/source-dump points pass Stage 6 | Python / Docling | H — Student-visible structure failure | Stage 6 usefulness gate | Yes | Yes | Yes | 1.00, zero issues | Requires separate generic structure-quality work | No |

There were no A, G, I, or J failures in the final run.

## Missing-evidence safety

- Missing table row: the Accounting ledger row was not synthesized; the reviewer was withheld.
- Missing numeric value: the typed hardening regression rejects a fabricated frequency `5`; no B12 run reported a fabricated number.
- Missing formula: the typed hardening regression rejects an invented formula absent from parser evidence.
- Missing relationship: co-grouped typed values do not authorize a relationship unless the exact source states it; all B12 relationship-failure counts were zero.
- Fabrication allowed: no.
- Assembly behavior: missing required output/evidence caused retry and then withholding.

The deterministic missing-evidence refusal and typed-evidence classification
families passed inside the fresh 406/406 engine run.

## Fix made during B12

Stage 0 now skips legacy presentation-page expansion when persisted source
blocks carry non-legacy parser-native structured provenance. Legacy blocks and
the production parser default retain their prior behavior. The new regression,
`persisted typed presentation blocks bypass legacy page expansion`, asserts
that typed code, kind, and parentage survive the same block-only shape used by
durable job metadata. The Stage 0 suite passes 23/23 and the total engine suite
passes 406/406.

No course name, title text, benchmark wording, source content, grounding
threshold, numeric approximation, or source-absent relationship was added.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck --workspace @stay-focused/engine` | PASS | Fresh after fix |
| `npm run build --workspace @stay-focused/engine` | PASS | Fresh after fix |
| `npm run eval --workspace @stay-focused/engine` | PASS | 406/406 |
| `npm test --workspace @stay-focused/api` | PASS | 69 files, 607/607 |
| `npm run typecheck` | PASS | 7/7 workspaces |
| `npm run lint` | PASS | No errors; only four established mobile import-order warnings |
| `npm run build` | PASS | 7/7 workspaces |
| `git diff --check` | PASS | No whitespace errors |
| `git fsck --full` | PASS with known exceptions | Only the same two dangling blobs |

## Files

- `packages/engine/src/stage0-normalize.ts`
- `packages/engine/evals/stage0-normalization.eval.ts`
- `apps/api/scripts/b12-hybrid-acceptance.ts`
- `scripts/b12-hybrid-durable-acceptance.ts`
- `docs/ai/acceptance/b12/full-b8-hybrid-acceptance.md`
- `docs/ai/acceptance/b12/results.json`
- `docs/ai/acceptance/b12/python-generators-reviewer.txt`
- `docs/ai/current_sprint.md`
- `docs/current-state.md`
- `docs/roadmap.md`

## Overall B12 verdict

**FAIL — B12 exposed unresolved Reviewer acceptance defects**

The single next task should be a focused, generic Reviewer usefulness and
required-evidence completion task: prevent title-only/activity-leaking sections
and improve required formula/table/list/row propagation under retries, then
rerun this unchanged B12 corpus and gates.
