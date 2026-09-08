# B18 — Generic composite source-span presentation and source-item alignment

Started 2026-09-07; completed 2026-09-08 (Asia/Manila). Local execution only.
**FAIL — Reviewer representation defect remains**. B16 and B17 remain historical FAIL reports, unchanged.
Private evidence is under ignored `.local/b18/`. The first live attempt is preserved under `attempt1/`; final acceptance captures are under `live/`.

## 1. Starting state

- Repository: `C:/Projects/stay-focused-v2`. The supplied OneDrive workspace was empty; the brief's explicit repository exists.
- Branch: `main`. Starting HEAD: `194bae9050d06e649be9c1a5a5592d61cf3623f2`.
- Ahead/behind: 18/0 against the existing origin/main tracking ref; no fetch or push.
- Working tree: only pre-existing untracked `docs/ai/acceptance/b8/`, untouched.
- FRESH fsck PASS: two known dangling blobs `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and `625ec44ccb5695fe93ac518f09238fac61eca223`.
- FRESH engine typecheck/build PASS; engine 494/494; architecture 45/45; reader 32/32; API 607/607 in 69 files.
- Implementation drift: none. The first reader command used Node/tsx against a Vitest test and failed loading; the correct Vitest command passed 32/32 before editing. This was a runner error, not an implementation baseline failure.

## 2. B17 source-representation diagnosis

The complete before-edit map was captured in `before-ownership-map.md` and `before-ownership-map.json` before production edits. It includes every section/source block, manifest targets, semantic relationships, B17 projection, explanation, omission findings and actual serialized output. The Markdown has the requested Source identity / Manifest targets / Display owner / Validation owner / Overlaps with / Student-visible columns; the JSON contains the full joined evidence.

| Source/defect | Factual owner | Display owner | Validation owner | Root mismatch |
|---|---|---|---|---|
| Python ITERATORS prose/code overlap | 22 required targets; 14 code targets | Composite code label plus exact cached code target | Manifest matcher and final serialization | Whole prose+code span and code suffix both printed; source block identity supports suffix ownership |
| Python GENERATORS lecture/fragments | 11 required list targets | Key points including presentation prefixes | Manifest plus source-item checks | Presentation phrases are frozen factual labels; projection cannot discard their unique text arbitrarily |
| Python flattened examples | Cached structured code blocks | Typed code | Exact source evidence | Cache already contains single-line code; indentation/syntax cannot be inferred |
| MinerU grouped Median | 109 targets, including 64 row targets; composite required-evidence-f2i08j | Parent mapping, relationship copies, cells and typed rows | Manifest plus independent source items | A 783-character parent is repeated through children; semantic fragments overlap typed rows, but not all spans have exact row-set correspondence |
| MinerU formula/result and row labels | Source-owned formula/result targets and table row provenance | Repeated inherited relationship plus typed payload | Both factual contracts | Relationship label is incorrectly treated as required prose on every representation |
| MinerU two omissions | Source headings mineru-1-4-1ao82w / mineru-2-2-dcghqx | Visible section titles | Legacy omission check of core fields only | Visible headings excluded from source-item checking |
| Docling grouped mean | docling-tables-2 and docling-tables-3 row targets | Typed tables | Omission check of internal flattened relationship strings | Added parent words dilute single-string token recall; final typed rows already contain the source fragments |
| Docling grouped Median | 46 targets; composites required-evidence-19n6r6d / required-evidence-dvrekc | 683/1085-character passages plus typed formula/result/tables | Manifest and source items | Exact owned child spans can be separated; residual procedure text remains required |
| Docling repeated tables | Distinct docling-tables-6/7 and docling-tables-8/9 | Separate typed tables | Distinct row identities | Equality of values does not prove a shared source identity; no global row/table collapse |
| Docling neighboring formula | docling-texts-107, frozen grouped-mode section | Formula in that source owner | Frozen section/manifest identity | Cache order and section attribution do not authorize moving it by mathematical meaning |
| Docling grouped-mode definitions | docling-texts-97 / docling-texts-98 | No visible definitions | Independent source-item validator | REAL omissions: worked numeric substitutions are different facts; no manifest target covers the full definitions |
| Accounting cash near-duplicate | Single concept in mineru-3-1-1unfgu | Explanation and predicate bullet | Source grounding and manifest | Provider inflection can prevent exact B17 subject/predicate duplicate filtering; final B18 response permits exact filtering, but generic near-duplicate risk remains |
| Accounting ledger damage | Structured rows in mineru-7-1-1ipbnnt, mineru-8-1-hspcwj and mineru-8-2-hipr7k | Typed rows | Frozen row/cell targets | Cache already has fused cells and inconsistent columns; semantic reconstruction prohibited |
| Accounting trial-balance fragments | Six concept targets plus 17 table-row targets | Short key points and one table | Manifest | Fragmentary source labels are not complete explanatory statements; no outside accounting completion |

The trace is source block → normalized ID → manifest/relationship → deterministic presentation → provider explanation → source-item and target validation → assembly → serialized student text. Before and final cache SHA-256, manifest SHA-256, internal evidence hashes and section ownership match exactly for all four cases (`live/invariants.json`). All seven initial generation requests are byte-for-byte identical to B17; only the two needed explanation-retry requests differ. No prompt was changed.

## 3. Statistics omission classification

B17's two MinerU and four Docling findings are aggregate findings, not six individual missing facts. They contain ten source-item entries. Each is classified below; no real omission is relabeled a mapping mismatch.

| Case / B17 finding | Source item / identity | Classification | Evidence |
|---|---|---|---|
| MinerU 1 | Ungrouped-mean heading; mineru-1-4-1ao82w | REPRESENTATION-MAPPING MISMATCH | Exact heading is already the visible section title; core-only check excluded it |
| MinerU 2 | Grouped-mean heading; mineru-2-2-dcghqx | REPRESENTATION-MAPPING MISMATCH | Exact title is visible with its ordered letter prefix |
| Docling 1 | Central-tendency heading; docling-texts-15 | REPRESENTATION-MAPPING MISMATCH | Visible title contains the exact source heading |
| Docling 2a | Grouped-mean heading; docling-texts-31 | REPRESENTATION-MAPPING MISMATCH | Visible section title supplies it |
| Docling 2b | Table suffix beginning =65; docling-tables-2 | REPRESENTATION-MAPPING MISMATCH | Exact suffix and all succeeding rows occur in the visible midpoint table; internal relationship-prefixed strings failed recall |
| Docling 2c | Table suffix beginning =124; docling-tables-3 | REPRESENTATION-MAPPING MISMATCH | Exact source suffix through the sum row occurs in the visible product table |
| Docling 3 | Ungrouped-mode heading; docling-texts-85 | REPRESENTATION-MAPPING MISMATCH | Exact source heading is a visible title |
| Docling 4a | Grouped-mode heading; docling-texts-93 | REPRESENTATION-MAPPING MISMATCH | Exact source heading is a visible title |
| Docling 4b | d1 definition; docling-texts-97 | REAL OMISSION | Source has the full lower-interval frequency-difference definition; manifest and visible output have only the worked numeric substitution |
| Docling 4c | d2 definition; docling-texts-98 | REAL OMISSION | Source has the full higher-interval frequency-difference definition; manifest and visible output have only the worked numeric substitution |

Final MinerU: zero findings. Final Docling: one finding covering the two real definitions; four of six grouped-mode source items represented. These failures remain assembly-blocking. Raw source-item extraction, the 40-word filter, 0.8 omission threshold and grounding thresholds are unchanged. `source-items.json`, `source-items.log`, the before map and final `replay.json` contain the item-by-item proof.

## 4. Repair

- Add a deterministic source-representation map. Each target maps to display-owner span IDs; the immutable manifest retains factual identity, evidence texts, provenance and relationship labels.
- Use exact source spans with whitespace equivalence, source-block/row identity and explicit parent relationships. Exact aliases may share display; distinct same-valued source rows require separate occurrences.
- Keep unique parent residual spans visible. Subtract tables only as complete ordered row sets. Scalars do not remove portions of prose; code/formula runs are not split into guessed syntax. Exact prose-prefix/code-suffix pairs may share one cached code display.
- Emit explicit parent labels once through their parent target instead of prefixing every child. Unknown relationship labels remain visible. Equal labels in separate source contexts remain distinct.
- Validate projected target conservation against actual displayed owner spans, including any additional evidenceTexts. Missing unique words or an incomplete child set fails instead of relying on broad target token recall. The existing legacy unprojected path remains compatible.
- Run source-item omission checking on the final student projection, including typed blocks. An exact source heading can be satisfied by the visible local title. Additional collective child coverage requires exact source ownership and complete content; hidden manifests/debug metadata never count.
- Retain the existing recomputed-presentation tamper check; provider output still owns only explanations.
- Preserve manifest semantic order and explicit table row order. A development attempt to sort by coarse block provenance reordered numbered items; it was removed and regression-tested before final validation.

No outside facts, course/parser branches, threshold changes, source ownership changes, prompt changes, production-model changes or new generation stages. The helper remains conservative: unmatched composite/source fragments and some duplicate text remain visible rather than being guessed away.

## 5. Regression evidence

| Regression | Before | After |
|---|---|---|
| Composite raw/formula duplication | Executed starting HEAD: FAIL | PASS |
| Typed source-item mapping | Executed starting HEAD with B17 captures: FAIL | PASS |
| Repeated parent label | Executed starting HEAD: FAIL | PASS |
| Partial child/unique-word false satisfaction | Executed starting HEAD: FAIL | PASS |
| Unique parent content / incomplete child set | New synthetic safety assertions | PASS |
| Owned typed source item / unrelated ownership / hidden-only target | New synthetic safety assertions | PASS |
| Adjacent parent once / same label in separate contexts | New synthetic safety assertions | PASS |
| Distinct equal rows / same row once / complete and partial tables | Preserved invariants plus new assertions | PASS |
| Formula/result/code ownership and malformed cache | Preserved invariants plus new assertions | PASS |
| Provider cannot alter projection / evidenceTexts / exact target identity | Preserved invariants plus new assertions | PASS |
| Manifest list order despite coarse provenance | Development regression reproduced | PASS |

There are 25 added generic engine cases. The four first rows were actually executed before production edits with `before-check.mts`; results are `before-regressions.json` and `after-regressions.json`. Other before entries are not claimed as pre-fix execution. No existing tests were weakened or deleted. Initial development included a TypeScript narrowing error and capture-audit misses from omitted empty evidence arrays and bullet normalization; these were corrected. Safety review also rejected scalar subtraction and coarse provenance sorting. All failed/partial diagnostic logs remain private.

## 6. Deterministic verification

FRESH engine **519/519** (494 + 25); architecture **70/70** (45 + 25); reader **32/32**; API **607/607**, 69 files. Engine typecheck/build PASS. Final deterministic gates passed before final live generation. Every prior evaluation remains passing.

## 7. Python live result

**99/99**, coverage 1.00, grounding 0.94. Zero final issues, omissions, fabrication, provider-owned required facts, provider loss, factual retries, explanation retries and fallback. Two initial calls. Assembly PASS. Pipeline usefulness allowed assembly, but the independent serialized-output usefulness audit reports one SOURCE_DUMP; automatic acceptance is therefore FAIL. Exact prose/code overlap improves, but lecture fragments, a duplicated prefix and near-duplicate descriptions remain. Cached code is preserved honestly. Manual usefulness FAIL. Total **7.511 s**.

## 8. Statistics MinerU live result

**232/232**, coverage 1.00, grounding 0.96. Zero final issues, omissions, fabrication, provider-owned facts, provider loss and factual retries. Median parent concept, formula, **70.7**, examples and every required table row are visible. Repeated inherited parent labels are greatly reduced, but raw composite/source-cell fragments, repeated example wording and oversized passages remain. Assembly PASS. Independent serialized usefulness: three SOURCE_DUMP findings; manual usefulness FAIL. Two initial calls plus one explanation retry; no replacement/fallback. Total **15.571 s**.

## 9. Statistics Docling live result

**156/156**, coverage 1.00, grounding 0.94. Zero final fabrication, provider-owned facts, provider loss and factual retries. Formulas, results and required tables remain with frozen ownership. One omission finding contains the two real d1/d2 definition omissions; all mapping mismatches are resolved. Assembly FAIL and candidate withheld. Composite passages are reduced; exact table spans are separated, but separate source tables still repeat and procedure/fragment material remains. Formula placement is unchanged: docling-texts-107 remains in its source-attributed neighboring grouped-mode section; there is no provenance proof authorizing a move. Independent serialized usefulness: two SOURCE_DUMP findings. Manual usefulness FAIL. Two initial calls plus one explanation retry and one observed extractive replacement in grouped mode. Total **9.776 s**.

## 10. Accounting live result

**46/46**, coverage/grounding 1.00. Zero final issues, omissions, fabrication, provider-owned facts, loss, retries and fallback. Capital row, corresponding cash row, ledger headers and remaining rows were inspected and retained. Trial balance remains one table. Cash has no duplicate bullet in this final response because the existing exact subject-completion filter applies; this is response-dependent, not a claimed new inflection repair. Its source-worded grammar and trial-balance fragments still fail manual usefulness. Malformed cached rows remain exact; no columns or transactions are invented. Assembly and automatic usefulness PASS; manual FAIL. One initial call. Total **3.339 s**.

## 11. Retry behavior

| Case | Initial calls | Explanation retries | Replacements | Factual retries |
|---|---:|---:|---:|---:|
| Python | 2 | 0 | 0 | 0 |
| Statistics MinerU | 2 | 1 | 0 | 0 |
| Statistics Docling | 2 | 1 | 1 | 0 |
| Accounting | 1 | 0 | 0 | 0 |

B17 total calls 2/2/2/2 → B18 2/3/3/1. Explanation retries 0/0/0/1 → 0/1/1/0. Replacements 0/0/3/0 → 0/0/1/0. MinerU's first response introduced unsupported X1/X2/X3/Xn spellings; Docling's first ungrouped-median response introduced unsupported “find”. Frozen grounding rejected these; existing bounded explanation retries corrected them. Grouped-mode source omission still triggers the existing extractive replacement. There are no factual regeneration requests. Every final request returned HTTP 200 with gpt-4o.

Provider readiness succeeded on gpt-4o; OPENAI_API_KEY presence was checked by name only. Two B18 four-case attempts used 7 and 9 generation requests; one readiness request makes **17 provider requests** total. Attempt 1 is preserved and is not final acceptance. No concurrent generation was added.

## 12. Runtime

Seconds; single runs, not a controlled benchmark.

| Case | B17 | B18 | Difference | Under 30 s? | Under 60 s? |
|---|---:|---:|---:|---|---|
| Python | 9.113 | 7.511 | -1.602 | Yes | Yes |
| Statistics MinerU | 17.819 | 15.571 | -2.248 | Yes | Yes |
| Statistics Docling | 7.049 | 9.776 | 2.727 | Yes | Yes |
| Accounting | 4.268 | 3.339 | -0.929 | Yes | Yes |

Component timing in milliseconds:

| Case | Planning | Evidence including projection | Provider wait | Validation | Assembly | Other | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| Python | 66 | 58 | 6774 | 310 | 18 | 285 | 7511 |
| Statistics MinerU | 210 | 466 | 6272 | 2602 | 45 | 5976 | 15571 |
| Statistics Docling | 74 | 40 | 8043 | 554 | 0 | 1065 | 9776 |
| Accounting | 22 | 8 | 3178 | 56 | 4 | 71 | 3339 |

The frozen instrumentation combines evidence assembly and presentation projection in deterministicEvidenceDurationMs; a separate projection-only live timing is NOT AVAILABLE. Other/unattributed time is retained explicitly, not reassigned to a preferred component. Docling assembly is zero because the existing metric records no completed assembly on rejection. No concurrency changes. Quality remains more important than these latency differences.

## 13. Manual Reviewer quality

| Case | Faithfulness | Repetition | Structured readability | Study usefulness | Verdict |
|---|---|---|---|---|---|
| Python | All required facts; no added knowledge | Reduced code overlap; lecture/prefix repetition remains | Typed code, damaged cache unchanged | FAIL | FAIL |
| MinerU | All required facts; no fabrication | Parent repeats sharply reduced; composite/cell fragments remain | Tables/formulas retained, still noisy | FAIL | FAIL |
| Docling | Manifest exact, but two real definitions absent | Composite overlap reduced; distinct source tables repeat | Better separation; instruction/fragment and placement limitations | FAIL | FAIL |
| Accounting | All required rows; no invented structure | Trial table once; final cash bullet absent | Cached damage and fragmentary prose remain | FAIL | FAIL |

Every assembled output and withheld candidate was inspected as complete serialized text and JSON, including typed evidence. The old harness text export omits typed evidence, so it was not used alone. Native/device screenshot acceptance is NOT RUN; no visual-device pass is claimed. The final independent usefulness audit always examines serialized outputs, including withheld Docling. Its Python/MinerU/Docling findings are reported even though the unchanged internal deterministic-candidate path permits some of those passages. This residual validation/display mismatch is not bypassed or labeled acceptance.

## 14. Unrecoverable cached-formatting limitations

Only proven cache damage is listed here:

- Python structured code entries contain flattened single-line code; missing line boundaries/indentation cannot be recovered from the current cached text. Some expressions are separate partial cached blocks. No syntax or indentation was inferred.
- Accounting mineru-7-1-1ipbnnt stores concatenated dated transactions inside one cell. The Cash/Capital ledger header blocks store fused column text and inconsistent cell counts. The stored rows lack sufficient structural boundaries to reconstruct the intended layout safely.

The existing structured table row/cell boundaries and code whitespace that do exist are recoverable and preserved. Lecture labels, residual composites, repeated tables and real missing definitions are **not** called unrecoverable cache limitations. Detailed structured-cache evidence is in `cached-format-evidence.json` and `cache-summary.log`.

## 15. Full unchanged B12 rerun

**NOT RUN — targeted prerequisites failed**.

Exact prerequisites: all four manual usefulness gates FAIL; Python, MinerU and Docling independently serialized automatic usefulness FAIL; Docling source-item completeness and assembly FAIL for two real definition omissions. B12 harness, contract and acceptance thresholds are unchanged.

## 16. Simplicity gate

Plan → deterministic evidence → presentation projection → bounded explanations → validation → assembly remains intact. No factual regeneration, factual retries, course-specific hacks, parser-specific fixture hacks, threshold weakening, speculative reconstruction, new concurrency or model change. Production model stays **gpt-4o**; parser default stays **legacy**. The 207-line owner helper plus projection/validation integration is local to deterministic representation; no broad B17 explanation rewrite.

## 17. Verification

- FRESH engine typecheck/build PASS; engine 519/519; architecture 70/70.
- FRESH reader 32/32; API 607/607 in 69 files.
- FRESH root typecheck, lint and build PASS: seven executed, zero cached tasks each. Four pre-existing mobile import-order warnings unchanged.
- FRESH git diff --check and fsck PASS; the two pre-existing dangling blobs remain.
- The incidental Next.js-generated next-env.d.ts change was restored after build.
- Frozen cache, manifest hashes, internal evidence hashes, section source ownership and initial prompts compare equal to B17. All 533 targets are visibly represented, not merely internal.
- No production changes were made after final live validation; only validation notes/canonical docs follow.

## 18. Files created/changed

Implementation:

- packages/engine/src/reviewer-source-representation.ts (new)
- packages/engine/src/reviewer-evidence-presentation.ts
- packages/engine/src/required-evidence.ts
- packages/engine/src/source-items.ts
- packages/engine/src/stage5a-grounding.ts

Tests: packages/engine/evals/reviewer-deterministic-evidence.eval.ts (25 generic cases).

Validation/docs: this report; docs/current-state.md; docs/roadmap.md; docs/ai/current_sprint.md.

Ignored/private: .local/b18/ ownership map, source traces/classifications, cache evidence, before/after regressions, replay scripts, two live attempts, provider request captures, complete student outputs, invariants, manual notes, timings and verification logs. Not committed.

Untouched: pre-existing docs/ai/acceptance/b8/; B16/B17 historical reports; provider prompts/model; parser routes/default; frozen B12 harness/contract; reader/UI production files.

## 19. Git result

Implementation/tests commit: **7ae1e72d992e33fb032c860a1c95ebabad85dae6**, `fix(engine): align composite Reviewer source presentation`.
This report and three canonical-state updates form the subsequent `docs(ai): record B18 Reviewer validation` commit; final HEAD is recorded in the task response.
After the two local commits: 20 ahead / 0 behind the existing origin/main ref. Final intended tree: only pre-existing B8 untracked files. Historical reports preserved unchanged; parser default unchanged; production model unchanged; no secrets/private captures committed; no push.

## 20. Verdict

**FAIL — Reviewer representation defect remains**

B18 conserves all 533 frozen targets, removes substantial repeated parent material and resolves every proven Statistics mapping mismatch. It correctly leaves the two real Docling definition omissions as failures. Residual composite/lecture fragments, repeated representations and source-worded prose defects still fail manual usefulness, and serialized usefulness does not fully align with the internal candidate gate. Working provider capacity and high target coverage do not make those failures a PASS.

## 21. Next task

Repair the remaining source-span ancestry and source-item completeness contract using B18 captures, preserving the frozen targets and acceptance gates. Do not implement it as part of this B18 slice.
