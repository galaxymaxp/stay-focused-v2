# B19.3 — Grouped-median composite presentation repair

Validated 2026-09-09, Asia/Manila. **PASS — B19.3 grouped-median demo blocker cleared.**

## Starting state and reproduction

Authoritative checkout `C:\Projects\stay-focused-v2`, branch `main`, HEAD
`8e0debce0477f54e8e4098c7fe1824d7538df4d4`, ahead/behind 25/0. Only pre-existing
untracked `docs/ai/acceptance/b8/`. Fresh initial fsck exited 0 with the same two
known dangling blobs; no corruption. Fresh engine typecheck/build passed and
engine evaluation passed 592/592 (architecture 143 included). The supplied B19.2
reader/API/root baseline was historical, not relabeled as a fresh pre-edit run.
Fresh final reader/API/root results are recorded below.

Before implementation, the production pipeline replayed the final B19.2 captured
responses against the frozen B12 cache. MinerU serialized text was byte-identical
to B19.2. Private evidence includes complete serialized output, plan, source blocks,
residual classifications, typed relationships, table cells, ownership maps and
pre-serialization deterministic section output.

The defective study point combined `cfa = … i = … fmd = … Example: Find …
Height(Inches)`. Nearby points included `3 Total`, `50 STEPS: Height(Inches)` and
a calculation caption ending in another table-heading fragment. This was not a
provider paraphrase or a serializer-generated sentence.

## Exact ownership diagnosis

The affected planned section is
`central-tendency-hybrid-section-hvuitm-planned-w0b1ju`.

| Owner/component | Frozen source identity | Role and original display problem |
| --- | --- | --- |
| `required-evidence-f2i08j:0` | `mineru-3-18-1gqh8nb`, `mineru-3-19-1fwifke` | Section heading plus definition in a source label |
| `required-evidence-f2i08j:1` | `mineru-3-21-1fcj86g` | Formula-component definition |
| `required-evidence-f2i08j:2` | `mineru-3-23-1esk0si`, `mineru-3-24-1f2jmhh`, `mineru-3-25-19subsz`, `mineru-4-0-19iuq40`, `mineru-4-1-1k2ojj2` | Three definitions, objective, typed caption and table header fused together |
| `required-evidence-13sonq3:0` | `mineru-4-1-1k2ojj2` | Cross-row sequence copied outside its table |
| `required-evidence-1eak1ne:0` | Tables plus `mineru-4-2-1a2txhy` | Total, procedural heading, next table header fused |
| `required-evidence-1n9bfjx:0` | Coarse table locator, typed evidence group | Header fragment copied outside complete tables |
| `required-evidence-hw050d:0` | `mineru-4-5-1bgrxyt`, `mineru-4-6-1lgmjzx` | Step, calculation caption and table header fused |
| `required-evidence-gsz05u` | `mineru-3-20-1jo1wty` | Complete general formula, already typed |
| `required-evidence-pbmgxo` | `mineru-5-4-mwf2dq` | Worked final formula, already typed |

The raw mapping/relationship graph and residual classifications are correct
factual ownership contracts. Presentation previously split formulas and rows,
but stopped at prose punctuation; it did not use the stronger accepted member
boundaries. The correction belongs in source-owner display aggregation and
ordered-table projection, consumed by the existing presentation and visibility
checks. Section planning, provider explanations and final serializer architecture
remain unchanged.

`source-role-classification.json` privately classifies every involved source unit
and table row as definition, formula, component, objective, step, result, heading,
header, row, or required other. Typed `resultBlockIds` alone were not treated as
proof that a symbol definition is a worked result. The incomplete typed caption
is REQUIRED_OTHER and remains visible; its missing words are not recoverable
under this task's frozen-input rule.

## Generalized repair

`buildSourceRoleRepresentationMap` derives a second display graph from the
unchanged factual graph and accepted typed evidence members. It activates only
when a composite demonstrably contains multiple complete paragraph members.
It splits exact source-unit spans, preserves every unmatched remainder, and
resolves original owners to all their visible pieces. Known source headings can
be owned by the identical displayed section title.

Formula-adjacent source units and typed captions use the existing `source`
evidence blocks; a complete objective with following worked table/formula evidence
uses the existing `example` block. Source ordering keeps the formula, components,
objective, tables and calculation together. No new output schema or UI behavior
was added. Single-word procedural labels are accepted only as explicit colon
labels; scalar source units cannot split mathematical or ordinal prose.

A header or cross-row fragment can resolve to an ordered table only when its
characters form a contiguous sequence in the frozen ordered cells and every row
has a complete visible owner. It cannot be discharged by scattered numbers or
an incomplete table. Visibility and grounding consume that same derived graph;
internal identities alone do not prove a visible fact. The factual graph,
source text, manifests, residual IDs/classifications, typed payload strings,
evidence hashes, thresholds and provider requests remain unchanged.

## Regression evidence

| Regression | Exact starting source | After |
| --- | --- | --- |
| A: independent definition, objective and result | FAIL | PASS |
| B: formula with separate nearby symbol definitions | FAIL | PASS |
| C: supported objective separated from concept | FAIL | PASS |
| D: unresolved command retained | PASS | PASS |
| E: table header owned by complete ordered table | FAIL | PASS |
| F: analogous Science/electrical-circuit case | FAIL | PASS |
| Missing separated definition rejected | PASS | PASS |
| Missing table row rejected | PASS | PASS |

The first eight tests ran on an archive of the exact starting HEAD; five failed
and three conservative controls passed. Six additional regressions cover scalar
boundaries, missing relationships, immutable ownership/payloads, incomplete table
ownership, shuffled manifest rows and caption adjacency. These six are post-fix
controls, not inferred pre-fix passes. Total new cases: 14.

Recorded unsuccessful intermediate attempts: a private replay path incorrectly
mixed capture directories and was corrected before the byte-identical reproduction;
a test fixture initially used a mutable-array annotation and was corrected;
a display helper briefly produced a false-or-object TypeScript union and was
corrected. A replay exposed a Docling regression where a standalone `2` split
ordinal/formula prose; the complete-unit restriction and scalar regression fix it.
These logs remain private. Final checks below supersede failed attempts.

## Deterministic verification

| Suite | FRESH final result |
| --- | ---: |
| Engine typecheck | PASS |
| Engine build | PASS |
| Engine evaluation | 606/606 |
| Architecture (included in engine) | 157/157 |
| Reader | 32/32 |
| API | 607/607, 69 files |

All 592 pre-existing engine cases remain passing.

## Targeted live validation

All runs use the unchanged production `gpt-4o` request shape and concurrency.

| Case / route | Assembly | Coverage | Grounding | Issues / fabrication / omissions | Dump / instructional / fragments / repetition | Automatic usefulness | Calls / retries / fallback | Runtime |
| --- | --- | ---: | ---: | --- | --- | --- | --- | ---: |
| Python | PASS | 1.00 | 0.99 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | 2 / 0 / 0 | 7.049 s |
| Statistics MinerU | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | 2 / 0 / 0 | 18.012 s |
| Statistics Docling | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | 2 / 0 / 0 | 8.639 s |
| Accounting | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | 1 / 0 / 0 | 3.713 s |

MinerU retained 232/232 targets. Python retained 99/99, Docling 156/156,
Accounting 46/46: 533/533 total. Independent serialized auditing reports zero
missing targets and residuals. Source, outline, entire plan, manifests, residuals,
evidence hashes and typed code/formula/table/result payloads match B19.2 exactly
(payload order is compared by section and kind because presentation order changed).
All four parser-cache files are byte-identical to the original B12 cache. Both
full Docling d1/d2 definitions remain visible. Median, grouped median and worked
70.7 remain: MinerU spells that value with source spaces (`7 0 . 7`), which are
preserved. The old harness's literal `70.7` regex incorrectly reports false for
that spelling even on B19.2; a separate whitespace-tolerant visibility check
confirms the unchanged formula. No value was inserted to satisfy a regex.

## Grouped-median manual inspection

| Criterion | Result | Finding |
| --- | --- | --- |
| Faithfulness | PASS | Every statement has a frozen owner; no factual rewriting |
| Completeness | PASS | Definitions, formulas, four tables, all rows and worked result remain |
| Definition clarity | PASS | Independent concept point; objective is separate |
| Formula clarity | PASS | Symbol definitions individually follow the general formula |
| Table clarity | PASS for repaired grouping | Headers and row sequences belong to tables; existing damaged cells remain |
| Worked-example clarity | PASS | Objective, tables, source steps and final formula are ordered together |
| Repetition | No material issue from repair | Some explanation overlap and required repeated typed evidence remain |
| Overall usefulness | PASS for B19.3 gate | Original composite no longer blocks study |

Inspection read the actual serialized Reviewer fields, including evidence blocks.
It did not equate empty automatic diagnostics with perfect grammar. A scalar
formula `2`, an incomplete source caption, and damaged ranking cells remain
visible. The caption is now separate source material beside its table, not part
of a definition or invented explanatory sentence. No missing caption words or
ranking values were reconstructed.

## Cross-case manual findings and full B12 rerun

Cross-case manual regression checks PASS. Python lecture framing and overlapping
descriptions, Docling procedural labels/near-repeat prose, and Accounting grammar
remain NON_BLOCKING_PRESENTATION as explicitly scoped by B19.3. Their historical
strict polish failures are not claimed repaired. No new demo blocker appeared.

The unchanged `apps/api/scripts/b12-hybrid-acceptance.ts` ran with `--phase generate`
against private byte-identical copies of all four frozen B12 parser outputs and
original extraction-readiness metadata. Corpus root was the requested materials
directory. The three selected PDF bytes inside its ZIPs match the frozen B8
working copies by SHA-256. No parser/extraction phase or durable upload rerun
was performed, because re-extraction is prohibited here.

| Frozen B12 case / parser | Assembly | Coverage | Grounding | Grounding issues / fabrication / omissions | Dump / instructional / fragments / repetition | Automatic usefulness | Manual material usefulness | Calls / retries / fallback | Runtime |
| --- | --- | ---: | ---: | --- | --- | --- | --- | --- | ---: |
| Python / Docling | PASS | 1.00 | 0.99 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | PASS with stated limitations | 2 / 0 / 0 | 10.476 s |
| Statistics / MinerU | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | PASS with stated limitations | 2 / 0 / 0 | 14.496 s |
| Statistics / Docling | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | PASS with stated limitations | 2 / 0 / 0 | 13.739 s |
| Accounting / MinerU | PASS | 1.00 | 1.00 | 0 / 0 / 0 | 0 / 0 / 0 / 0 | PASS | PASS with stated limitations | 1 / 0 / 0 | 3.743 s |

Full frozen generation acceptance: PASS under the unchanged coverage/grounding
contract and B19.3's explicitly preserved non-blocking/cache classifications.
This is material study usefulness, not a claim that every historical cosmetic
manual check now passes. The old B12 plain-text exporter omits typed evidence;
manual review instead used its full serialized Reviewer JSON rendered privately
with all evidence fields. No production exporter or historical report was edited.

## Runtime and usage

| Case | B19.2 | B19.3 targeted | Difference | Under 30 s? |
| --- | ---: | ---: | ---: | --- |
| Python | 9.839 s | 7.049 s | -2.790 s | Yes |
| Statistics MinerU | 15.451 s | 18.012 s | +2.561 s | Yes |
| Statistics Docling | 10.340 s | 8.639 s | -1.701 s | Yes |
| Accounting | 3.238 s | 3.713 s | +0.475 s | Yes |

| Case | Calls | B19.2 input / cached / output tokens | B19.3 input / cached / output tokens |
| --- | ---: | --- | --- |
| Python | 2 | 3165 / 1792 / 432 | 3165 / 0 / 441 |
| Statistics MinerU | 2 | 2916 / 0 / 425 | 2916 / 0 / 437 |
| Statistics Docling | 2 | 3124 / 1408 / 544 | 3124 / 0 / 538 |
| Accounting | 1 | 980 / 0 / 240 | 980 / 0 / 240 |

MinerU increased 2.561 s: measured provider wait increased 0.710 s and validation
increased 0.852 s; the remaining approximately 1 s is pipeline time outside those
buckets. Replay increased from 6.706 to 8.430 s, consistent with additional local
display-graph checks. The instrumentation does not justify attributing every
millisecond more precisely. The independent B12 MinerU run took 14.496 s. No
extra provider pass, factual retry, concurrency change, input-token increase or
runtime-model change was introduced. Accounting's 0.475 s increase closely matches
its 0.476 s provider-wait increase.

## Simplicity gate and remaining limitations

PASS: no factual regeneration, factual retries, extra provider repair passes,
fixture-specific replacements, parser-specific branches, Statistics/grouped-median
branches, filename/page checks, threshold weakening, OCR changes, runtime-model
changes, or speculative reconstruction. Source roles and typed boundaries drive
production behavior. Source-specific identifiers occur only in private diagnostics
and this report.

| Classification | Remaining defect |
| --- | --- |
| DEMO_BLOCKING | None demonstrated after this repair |
| NON_BLOCKING_PRESENTATION | Python lecture framing/overlap; Docling procedural fragments/near-repeat prose; Accounting grammar/nominal labels; isolated typed labels and explanation overlap |
| UNRECOVERABLE_CACHE | Frozen Python line/indentation and split-expression damage; Accounting fused/damaged cells and columns; preserved incomplete Statistics caption/ranking cells |

No cache limitation above is presented as repaired. Existing limitations were
not automatically promoted to demo blockers, nor hidden from manual review.

## Final repository verification and Git

FRESH engine typecheck/build/eval, architecture, reader, API, root typecheck,
root lint and root build PASS. Root tasks used `--force`, with zero cached tasks.
Four known mobile lint warnings remain unchanged. Final `git diff --check` and
`git fsck --full` PASS; only the two pre-existing dangling blobs remain.

Implementation/tests and this report/current-status updates are committed
separately with the requested messages. No push. Final hashes are recorded in
the task response/private Git evidence to avoid a self-referential docs hash.
Only pre-existing B8 remains untracked. `.local/`, provider captures, credentials,
and source materials are excluded from both commits.

## Files and next task

Implementation: source representation, evidence presentation/assembly, required
visibility and grounding display-proof wiring. Tests: new composite-role eval
and architecture registration. Docs: this report, `docs/current-state.md`,
`docs/roadmap.md`, `docs/ai/current_sprint.md`.

Private `.local/b19-3/`: reproduction, exact starting-source regression archive,
source/owner/role traces, live and B12 outputs/captures, SHA audits, manual notes,
runtime/usage, unsuccessful attempts, verification logs and Git results.
Untouched: B8, historical acceptance reports, parser/cache inputs, production
runtime configuration, OCR, provider concurrency, mobile/API implementation.

**YES — REVIEWER DEMO BLOCKER CLEARED**

**PASS — B19.3 grouped-median demo blocker cleared**

Next: **real mobile end-to-end Reviewer validation**. No further general engine
cleanup or runtime-model comparison is justified by this result.
