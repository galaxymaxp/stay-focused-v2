# B19.2 — Final presentation cleanup and demo-readiness validation

Validated 2026-09-08–09, Asia/Manila. **FAIL — demo-blocking presentation defect remains.**
The narrow deterministic cleanup improves all four serialized Reviewers and clears
the automatic presentation findings. The strict manual gate still fails, principally
because the MinerU grouped-median composite remains difficult to study. No B20 or
general architecture work is proposed.

## 1. Starting state

- Branch: `main`, authoritative checkout `C:\Projects\stay-focused-v2`.
- HEAD: `f845e92218d372bdf6159482902a5bb167a96b0f`.
- Ahead/behind: 23 / 0. Working tree: only pre-existing untracked `docs/ai/acceptance/b8/`.
- FRESH engine typecheck/build PASS; engine 547/547, architecture 98/98,
  reader 32/32, API 607/607 PASS before edits.
- FRESH status, branch, ten-entry log, rev-list and fsck completed. fsck exit 0;
  two existing dangling blobs, no corruption.
- Drift: none in the authoritative checkout. The desktop-selected OneDrive
  directory was empty and not a Git repository; the explicitly requested checkout
  was used. Runtime `gpt-4o`, parser default `legacy`.

## 2. Final defect ownership

| Case | Defect | Owner | Fix layer |
| --- | --- | --- | --- |
| Python | Six original navigation findings | RESIDUAL_SOURCE | Source-owned residual display edits |
| Python | Generator Functions set-level SOURCE_DUMP | USEFULNESS_DETECTOR | Recognize mandatory atomic display owners; individual oversized prose still fails |
| Python | Repeated code-associated description | SOURCE_LABEL | Exact same-source display owner |
| All | Explanation/key-point sentence duplicate | KEY_POINT | Exact local sentence projection |
| All | Repeated heading prefix | SOURCE_LABEL | Strip only an exact heading followed by an independent subject |
| All | Repeated relationship labels | RELATIONSHIP_LABEL | Exact same-source owner; unknown relationships retained |
| MinerU | Cross-row mapping fragments | SOURCE_LABEL | Complete ordered source-table ownership |
| Statistics | Exercise-introduction findings | RESIDUAL_SOURCE | Local heading objective plus subsequent worked result |
| MinerU | Incomplete factual since-clause | KEY_POINT | Source-only declarative completion |
| Docling | Repeated prose result/explanation | EXPLANATION | Source prose owns one matching display slot |
| Accounting | Clipped article from next source unit | SOURCE_LABEL | Explicit source boundary plus visible full continuation |
| Accounting | Passive predicate without subject | KEY_POINT | Section heading and copula |
| All | Previously missed incomplete prose/repetition | USEFULNESS_DETECTOR | Conservative serialized-prose diagnostics |
| MinerU | Remaining mixed grouped-median passage | SOURCE_LABEL | Unresolved source-boundary presentation blocker |
| Python, Accounting | Damaged code/cells | CACHE_DAMAGE | Preserved; no reconstruction |

Ownership decisions were recorded before implementation in the private
`defect-ownership-before.md`; `ownership-trace.json` contains source blocks,
targets, ancestry and residuals. Actual B19 and B19.1 serialized outputs were read.

## 3. Instructional findings

| Case | Finding | Classification | Action |
| --- | --- | --- | --- |
| Python | Code in previous slide … iterate through a city | REQUIRED_SUBJECT_CONTENT | Remove navigation phrase; retain course-content clause |
| Python | As seen in previous slide … call values using next() | REQUIRED_SUBJECT_CONTENT | Remove introduction; retain complete factual clause |
| Python | As seen in previous slide … function/expression same output | REQUIRED_SUBJECT_CONTENT | Remove introduction; retain comparison |
| Python | Example of this shown here | PRESENTATION_INSTRUCTION | Suppress with source-owned typed referent |
| Python | Example of this shown below | PRESENTATION_INSTRUCTION | Same |
| Python | Example shown in next slide | PRESENTATION_INSTRUCTION | Same |
| MinerU | Find the mode of the following values | PRESENTATION_INSTRUCTION | Heading names objective and a worked numbered result follows |
| Docling | Find the mode of the following values | PRESENTATION_INSTRUCTION | Same |

The two Statistics findings were initially AMBIGUOUS and became proven presentation
instructions after source tracing. Required target-owned commands are protected;
unresolved navigation without a source referent remains. No course vocabulary,
parser name or fixture ID is used by production helpers.

## 4. Fragment/repetition diagnosis

B19 checked only a few short explanation-fragment patterns; key points had no
fragment check, and repetition had no diagnostic. Internal deterministic evidence
also bypassed key-point checks. New diagnostics inspect serialized prose for
unfinished dependent clauses/trailing function words and exact nearby repetition.
Table/formula/code evidence is excluded. Repetition checking is scoped to outputs
with the structured evidence field; legacy provider-output gates are unchanged.
Longer grammatical problems, paraphrases, and typed result fragments still require
manual review. Zero diagnostics must not be interpreted as linguistic completeness.

## 5. Repair

Small deterministic helpers now preserve original residual text/identity while
carrying a separate navigation-free display span; remove only proven pure navigation;
complete supported predicates and factual since-clauses; deduplicate exact nearby
sentences and same-source prefixes; reuse complete ordered tables for exact cross-row
mapping spans; and repair clipped articles only when the full next source unit is visible.

The source-item checker recognizes these exact source-owned display proofs. It still
rejects a missing factual continuation. All manifests, evidence hashes, section
ownership and cached inputs are unchanged. Matching prose results can appear once
in the explanation slot using their source text; provider paraphrases cannot replace them.

The aggregate SOURCE_DUMP detector previously counted mandatory atomic source spans
as optional source copying. It now excludes exact required representation/residual
owners from that optional count. No numeric threshold changed. Oversized individual
points still fail, covered by a generalized regression. This corrects classification;
it does not establish manual readability.

## 6. Regression evidence

| Regression | Before | After |
| --- | --- | --- |
| Proven navigation leakage | FAIL, executed on starting source | PASS |
| Explanation-sentence/key-point exact duplicate | FAIL, executed on starting source | PASS |
| Heading-supported modal predicate | FAIL, executed on starting source | PASS |
| Mixed unique/child/navigation residual | FAIL, executed on starting source | PASS |

Starting source was archived privately from the exact starting commit and executed
with the same synthetic repro. No pre-fix claim is inferred. The final 45 additional
generalized cases cover all 20 requested categories, including 533 synthetic target
identities and provider ownership rejection, plus negative source-boundary cases.

Recorded intermediate failures: the first replay harness read the wrong capture
request shape and fell back; corrected replay matched frozen prompts. Two synthetic
fixtures initially reused block IDs incorrectly, and new repetition diagnostics
initially affected three legacy tests; both were corrected. One intermediate Docling
replay lost a typed result because the prose since-clause transformation was applied
to its validation key; the transformation is now restricted to prose projection.
Manual review also caught heading removal before a parenthetical symbol; regression
tests now require an independently supplied subject. These attempts remain private.

## 7. Deterministic verification

| Suite | FRESH result |
| --- | ---: |
| Engine | 592/592 |
| Architecture (included in engine) | 143/143 |
| Reader | 32/32 |
| API | 607/607, 69 files |
| Regressions added | 45 |

All 547 original engine tests remain passing.

## 8. Python live result

FRESH final `gpt-4o`: **99/99**, coverage 1.00, grounding 0.99, omissions 0,
fabrication 0, SOURCE_DUMP 0, INSTRUCTIONAL 0, repetition diagnostics 0, fragment
diagnostics 0. Assembly PASS; automatic usefulness PASS; strict manual usefulness
FAIL (remaining lecture framing and repeated descriptions). Calls 2, factual and
explanation retries 0, fallback 0, runtime **9.839 s**.

## 9. Statistics MinerU live result

FRESH **232/232**, coverage 1.00, grounding 1.00, omissions/fabrication 0.
Median, Grouped Median, formulas, 70.7, examples and all required table rows retained.
SOURCE_DUMP 0, INSTRUCTIONAL 0, fragment/repetition diagnostics 0. Assembly and
automatic usefulness PASS; manual usefulness FAIL for the remaining grouped-median
composite. Calls 2, all retries 0, runtime **15.451 s**.

## 10. Statistics Docling live result

FRESH **156/156**, coverage 1.00, grounding 1.00, omissions/fabrication 0.
Full visible d1 and d2 definitions independently matched the original source items;
formulas, results and tables retained with frozen ownership. SOURCE_DUMP 0,
INSTRUCTIONAL 0, fragment/repetition diagnostics 0. Assembly and automatic usefulness
PASS; strict manual usefulness FAIL (mixed procedural fragments/repeated prose).
Calls 2, all retries 0, runtime **10.340 s**.

## 11. Accounting live result

FRESH **46/46**, coverage 1.00, grounding 1.00, omissions/fabrication 0.
Capital row, cash row, ledger headers and all required rows retained; trial balance
displayed once. Clipped article and passive key point repaired. Cash-accounting
subject/verb disagreement and nominal ledger prose remain. Fragment/repetition
diagnostics 0, assembly and automatic usefulness PASS, strict manual usefulness FAIL.
Calls 1, all retries 0, runtime **3.238 s**.

## 12. Runtime

| Case | B19 | B19.2 | Difference | Under 30 s? |
| --- | ---: | ---: | ---: | --- |
| Python | 5.758 s | 9.839 s | +4.081 s | Yes |
| MinerU | 9.408 s | 15.451 s | +6.043 s | Yes |
| Docling | 6.259 s | 10.340 s | +4.081 s | Yes |
| Accounting | 3.559 s | 3.238 s | -0.321 s | Yes |

No concurrency changes. Final seven calls used 10,185 input tokens (3,200 cached)
and 1,641 output tokens. Cost experiments were not rerun. The earlier live pass
also preserved all gates; it was superseded by final validation after the heading fix.

## 13. Manual quality

| Case | Faithfulness | Completeness | Readability | Repetition | Verdict |
| --- | --- | --- | --- | --- | --- |
| Python | PASS | PASS | Improved; lecture framing remains | Some descriptions overlap | FAIL |
| MinerU | PASS | PASS | Grouped-median composite remains confusing | Table fragments reduced, not eliminated | FAIL |
| Docling | PASS | PASS | Some procedural fragments remain | Near-exact prose remains | FAIL |
| Accounting | PASS | PASS | Improved; source grammar remains | Required repeated ledger rows retained | FAIL |

Manual review examined all final serialized text, not an app screenshot. Key points
changed from 84/74/49/11 to 78/43/44/11; target counts did not change. The strict
manual checklist remains unmet even where remaining imperfections are non-blocking.

## 14. Remaining cache limitations

Python retains flattened code with missing line boundaries/indentation and a split
expression. Accounting retains fused transaction cells, inconsistent columns and
placeholders. These cannot be reconstructed under the frozen extraction contract.
No stronger assertion about recoverability through future extraction is made.

## 15. Full B12 rerun

**NOT RUN — targeted prerequisites failed**

Automatic PASS did not bypass the required manual gate. No PDF was re-extracted.

## 16. Capstone readiness

**NO — DEMO BLOCKER REMAINS**

## 17. Remaining defects

| Classification | Remaining defect |
| --- | --- |
| DEMO_BLOCKING | MinerU grouped-median composite still combines definitions, exercise text and table-heading fragments in one study point |
| NON_BLOCKING_PRESENTATION | Python lecture framing/repeated descriptions, Docling near-exact prose/procedural labels, Accounting grammar/nominal labels |
| UNRECOVERABLE_CACHE | Frozen Python line/indentation damage and split expression; frozen Accounting cell/column damage/placeholders |

Only the first item justifies another engine repair before the demo. Minor remaining
imperfections do not justify general architecture work or additional model comparisons.

## 18. Simplicity gate

Plan → deterministic evidence → ancestry/residual projection → presentation projection
→ bounded explanations → validation → assembly remains intact. No factual regeneration,
factual retries, fixture-specific hacks, parser-specific hacks, threshold weakening,
OCR changes, runtime model changes, speculative reconstruction, provider repair passes,
or additional generation loops were introduced.

## 19. Verification

FRESH engine typecheck/build/eval, architecture, reader, API, root typecheck, root
lint and root build PASS. Root checks used `--force` (0 cached tasks). Four existing
mobile lint warnings remain untouched. Generated Next environment declaration drift
was reverted after the build. Final diff check, status, fsck and rev-list were run.

Independent audit: exact frozen source/outline/ownership/manifests/cache/evidence hashes
match for all four cases. Serialized required-target loss 0; residual loss 0; exact
code/formula/table payloads unchanged; full d1/d2 visible.

A supplemental experiment reapplied the pre-assembly grounding function to serialized
outputs after their ownership marker had been removed. That unsupported invocation
reports identical historical false positives on the starting source and B19.2:
0.88/0.50/0.98/0.96, with no newly flagged fields. It is not the production grounding
contract. Production grounding remains 0.99/1.00/1.00/1.00; serialized target visibility
is checked independently. This diagnostic mismatch was not hidden or changed here.

Provider readiness was FRESH: key present, authentication accepted, `gpt-4o` capacity
available; one small readiness request. Only presence/status and usage were printed.

## 20. Files created/changed

- Implementation: engine evidence presentation/assembly, source representation/ancestry,
  required-evidence visibility, student-visible text, usefulness diagnostics, grounding
  display proofs, residual display type, and new `reviewer-presentation-prose.ts`.
- Tests: new `reviewer-final-presentation.eval.ts`, registered in the architecture suite.
- Docs: this report plus `docs/current-state.md`, `docs/roadmap.md`, `docs/ai/current_sprint.md`.
- Private `.local/b19-2/`: frozen starting-source repro, before/after serialized reviewers,
  traces, replay attempts, two live captures, provider readiness, manual audit, invariants,
  timing, regression evidence and verification logs. Not committed.
- Untouched: B8, B16–B19.1 historical reports, OCR/parser/cache inputs, runtime provider
  model/prompt/concurrency configuration, mobile/API implementation and existing lint warnings.

## 21. Git result

Implementation/tests and documentation are committed separately. Main remains unpushed;
only the pre-existing B8 folder remains untracked. Final commit IDs and ahead/behind are
recorded in the task response and private `git-result.json` (avoids a self-referential
documentation commit hash). Runtime model changed: no. OCR changed: no.
Secrets/private captures committed: no. Pushed: no.

## 22. Verdict

**FAIL — demo-blocking presentation defect remains**

## 23. Next task

Repair the MinerU grouped-median composite that still mixes definitions, exercise
wording and table-heading fragments, preserving its frozen source owners.
