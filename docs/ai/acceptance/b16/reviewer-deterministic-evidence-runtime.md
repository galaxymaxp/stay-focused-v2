# Reviewer B16 — Deterministic evidence and runtime acceptance

## 1. Starting state

* Branch: `main`
* Starting HEAD: `95fc5aceab86193cedeb3d2d13cdbf45afb7e161`
* Working tree: only pre-existing untracked `docs/ai/acceptance/b8/`
* Ahead/behind: 12 ahead / 0 behind `origin/main`
* Engine baseline: typecheck/build passed; 449/449 evaluations passed
* API baseline: 607/607 tests across 69 files
* Git fsck: passed with known dangling blobs `e69de29...` and `625ec44...`

## 2. Old factual-ownership and runtime audit

| Field / evidence type | Old owner | Failure mode | New owner |
| --- | --- | --- | --- |
| title | Plan then model-shaped output | Provider drift before normalization | SOURCE-OWNED / DETERMINISTIC |
| explanation | Model | Unsupported/instructional/fragment/dump | MODEL-GENERATED |
| key facts | Model | Omitted or compressed away | SOURCE-OWNED / DETERMINISTIC |
| list items | Model | Partial lists | SOURCE-OWNED / DETERMINISTIC |
| formulas | Model | Omitted or rewritten | SOURCE-OWNED / DETERMINISTIC |
| results | Model | Omitted or substituted | SOURCE-OWNED / DETERMINISTIC |
| tables | Model | Flattened or incomplete | SOURCE-OWNED / DETERMINISTIC |
| ledger rows | Model | Omitted/confused with similar rows | SOURCE-OWNED / DETERMINISTIC |
| code | Model | Omitted/reformatted/used as explanation | SOURCE-OWNED / DETERMINISTIC |
| relationships | Model | Omitted or flattened | SOURCE-OWNED / DETERMINISTIC |

The four B15 traces shared one boundary: Stage 1 outlined, Stage 2 created the
complete manifest, then Stage 3 asked the provider to reproduce the full
`SectionOutput`. Stage 4 detected omissions, Stage 5 asked the provider to
reconstruct them, Stage 5a checked the monolith as generated prose, and Stage 6
assembled it. The exact Stage 3 request/response boundary made known evidence
probabilistic.

| Case | Calls | Retries | Known factual omissions |
| --- | ---: | ---: | ---: |
| Python / Docling | 25 | 16 | 0 |
| Statistics / MinerU | 27 | 18 | 21 |
| Statistics / Docling | 33 | 22 | 4 |
| Accounting / MinerU | 14 | 9 | 11 |

## 3. Architectural diagnosis

Factual retries existed because Stage 3 delegated known target survival to the
model and Stage 4 could observe loss only afterward. Per-section initial calls
plus two full-section repairs caused the high call counts.

## 4. New architecture

Stage 2 remains manifest/disposition authority. A deterministic assembler
validates source availability and renders target identity, order, and hash
before provider work. Stage 3 accepts only `{sectionId, explanation}` batches.
Stage 4 checks deterministic identity; Stage 5 retries only explanations;
Stage 5a checks source-owned evidence separately from model prose; Stage 6
strips internal markers and combines both classes.

```txt
provider-owned required targets: 0
provider-caused target loss possible?: No
normal factual-completion retries: 0
```

## 5. Complexity reduction

| Old responsibility/path | New behavior | Removed/simplified? | Reason |
| --- | --- | --- | --- |
| Provider creates full section | Explanation only | Simplified | Manifest already owns facts |
| One initial call/section | Bounded batches | Removed | Fewer round trips |
| Stage 4 checks provider recall | Exact identity/hash check | Reworked | Matches ownership |
| Stage 5 factual repair | Explanation repair only for manifest plans | Removed from normal path | Model cannot repair engine facts |
| One validation mode | Field-aware ownership boundaries | Simplified | Typed evidence is not prose |
| Provider response order | Stable-ID/source order | Removed | Provider order is non-authoritative |
| Permanent quota retries | Immediate safe fallback | Removed | Avoid futile work |

The no-manifest compatibility path is isolated from current Stage 2 plans.
Final flow: (1) plan required targets, (2) assemble them deterministically,
(3) batch explanations, (4) validate explanations, (5) assemble in source order.

## 6. Batching / concurrency strategy

```txt
batching used? yes
parallelism used? no; bounded batches are sequential
batch size strategy: max 6 sections, 36,000 support chars/request, 10,000 chars/section
section isolation mechanism: BEGIN/END boundaries, stable IDs, local support
failure isolation behavior: only missing/invalid section entries fail; valid siblings remain
ordering mechanism: ID mapping followed by plan/source order
```

The durable workflow uses the same batches and individual resumable checkpoints.

## 7. Runtime instrumentation

Metadata measures total wall-clock, planning/deterministic evidence, provider
wait, validation, assembly, requests, sections/request, provider retries,
factual retries, and explanation retries. Secrets and prompts are not logged.

## 8. Regressions

| Regression | Before | After | Protects |
| --- | --- | --- | --- |
| Focused architecture suite | absent | 26/26 | Required 25 cases plus permanent-quota suppression |
| Total engine | 449/449 | 475/475 | Frozen gates plus new architecture |
| API | 607/607 | 607/607 | Durable compatibility |
| Token fidelity | Provider points | Manifest-rendered exact points | New factual owner |
| Call count | Call/section | One three-section batch | Round trips |
| Recovery | Request-position failure | Missing stable-ID entry | Isolation |
| Completion | Provider factual repair | Pre-provider assembly | Zero factual repair |
| Formula replacement | Provider repair | Malicious field ignored | Exact authority |

Changed old tests encoded only the intentionally retired provider-factual
contract. Grounding, fabrication, source absence, usefulness, typed evidence,
and exact identity remain green.

## 9. Synthetic architecture proof

```txt
targets before provider: 7 (text fact, list item, formula, numeric result, table row, code, relationship)
targets mentioned by provider: 0
targets after provider: 7
provider-caused losses: 0
```

## 10. Python fresh result

The required first live attempt reached OpenAI, but every call returned HTTP
429 `no credits remaining`; this is a fallback observation, not successful
provider-quality acceptance.

```txt
coverage: 1.00 (passed)
grounding: 0.94 (passed)
issues: 0
fabrications: 0
required represented/required: 99/99
provider-owned required targets: 0
provider-caused target losses: 0
assembly: passed through deterministic extractive fallback
usefulness: automated final gate passed; provider quality not established
explanation diagnostics: 9 standalone explanations used extractive fallback
provider requests: 2
sections/request: [6, 3]
retries: 0 (factual 0, explanation 0)
wall-clock duration: 5.432 s
provider waiting duration: 5.065 s
manual quality verdict: REJECT for provider acceptance; safe evidence, uneven fallback prose, no model explanation
```

## 11. Statistics MinerU fresh result

NOT RUN — Python provider prerequisite was blocked by exhausted OpenAI credits;
no metrics, mean/median/mode, formula/result/table inspection, or verdict claimed.

## 12. Statistics Docling fresh result

NOT RUN — Python provider prerequisite was blocked by exhausted OpenAI credits.

## 13. Accounting fresh result

NOT RUN — Python provider prerequisite was blocked by exhausted OpenAI credits;
no capital-row, ledger, table/header, quality, or runtime result claimed.

## 14. Runtime comparison

| Case | B15 calls | New calls | New retries | Wall-clock | Provider wait | Verdict |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Python / Docling | 25 | 2 failed initial | 0 | 5.432 s | 5.065 s | Availability fallback only |
| Statistics / MinerU | 27 | NOT RUN | NOT RUN | NOT RUN | NOT RUN | Ineligible |
| Statistics / Docling | 33 | NOT RUN | NOT RUN | NOT RUN | NOT RUN | Ineligible |
| Accounting / MinerU | 14 | NOT RUN | NOT RUN | NOT RUN | NOT RUN | Ineligible |

Factual retries are zero in the normal architecture and synthetic proof.
Round trips structurally decreased. Student-acceptable successful-provider
runtime remains unproven.

## 15. Factual-completion retry analysis

```txt
old factual retries: 16 / 18 / 22 / 9 respectively
new factual retries: 0
remaining explanation retries: bounded; 0 for permanent quota failure
remaining reason for any factual retry path: none for manifest-backed production plans
structural zero-call behavior: verified
typed-only zero-call behavior: verified
unsupported zero-call behavior: verified
```

## 16. Full unchanged B12 rerun

NOT RUN — deterministic unit prerequisites passed, but fresh Python provider
quality was unavailable due permanent no-credit 429. Remaining paid runs would
not be valid provider acceptance evidence.

## 17. Manual reviewer-quality inspection

```txt
Python: complete/scannable evidence, uneven fallback explanations, no outside knowledge, provider-quality rejected.
Statistics MinerU: NOT RUN.
Statistics Docling: NOT RUN.
Accounting: NOT RUN.
```

## 18. Missing-evidence safety

```txt
missing list/formula/result/table/ledger/relationship/code: deterministic assembly or safe engine failure; never provider reconstruction
unsupported heading: zero calls and no invented prose
typed-only section: zero calls and exact typed representation
failed explanation: valid siblings remain; failed section alone retries, falls back, or is withheld
```

## 19. Architecture invariant

```txt
Can OpenAI omission remove a known required source target? No
Can OpenAI rewrite an exact source target into the authoritative value? No
Can a concise explanation cause required evidence to disappear? No
Can source-absent required evidence be synthesized? No
Are factual completion retries required in the normal path? No
```

## 20. Runtime invariant

```txt
Typical requests: ceil(standalone sections / 6), further bounded by character caps
Request mode: sequential batches
Measured typical wall-clock: not established; Python permanent-failure fallback 5.432 s
Provider wait share: 93.2% in that fallback
Routine >30 s?: not observed offline/fallback; successful live evidence pending
20+ calls required?: No
```

## 21. Verification

| Command | Result | Notes |
| --- | --- | --- |
| Baseline engine | PASS | 449/449 |
| Focused architecture eval | PASS | 26/26 |
| Full engine eval | PASS | 475/475 |
| API tests | PASS | 607/607, 69 files |
| Root typecheck | PASS | 7/7 |
| Root lint | PASS | Four pre-existing mobile warnings |
| Root build | PASS | 7/7 |
| Python live | BLOCKED | Two batches returned no-credit 429 |
| Statistics/Accounting | NOT RUN | Python gate unavailable |
| Full B12 | NOT RUN | Targeted gate unavailable |
| `git diff --check` | PASS | Line-ending notices only |
| `git fsck --full` | PASS | Two known dangling blobs |

## 22. Files created/changed

```txt
architecture implementation: engine evidence/generation/verification/retry/grounding/assembly modules; durable API workflow
evaluations: new 26-case suite plus updated pipeline/recovery/completion/token-fidelity expectations
runtime instrumentation: engine/API generation metrics and B12 harness
acceptance/docs: this report plus current_sprint, current-state, roadmap, handoff
ignored/private artifacts: .local/b16-python and logs
pre-existing untouched files: docs/ai/acceptance/b8 and historical B12-B15 reports
```

## 23. Git result

* Implementation commit: `fd9476b` — `refactor(engine): assemble reviewer evidence deterministically`
* Documentation commit: contains this report and status updates
* Working tree target: only pre-existing untracked `docs/ai/acceptance/b8/`
* Ahead/behind target: 14 ahead / 0 behind
* B8 untouched? Yes
* B12/B13/B14/B15 preserved? Yes
* Parser default changed? No; `legacy` remains default
* Secrets committed? No
* Pushed? No

## 24. Verdict

FAIL — Reviewer evidence remains probabilistic, runtime remains excessive, or frozen acceptance is unresolved

The single next architectural task is to validate explanation-only batching and
manual Reviewer quality under restored provider capacity, in Python →
Statistics/MinerU → Statistics/Docling → Accounting order, before any B17 work.
