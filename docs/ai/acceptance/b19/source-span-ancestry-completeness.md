# B19 — Source-span ancestry, completeness, and residual Reviewer noise

2026-09-08, Asia/Manila. Local execution only. **FAIL — Reviewer source completeness/presentation defect remains**.
Private captures: ignored `.local/b19/`. Final acceptance is `live/`; `attempt1/`, `attempt2/`, and `attempt3/` preserve superseded runs.

## 1. Starting state

- Branch: main. Starting HEAD: 3a8c4075377fdc1eb3c6da5be9a9c03683959bed.
- Ahead/behind: 20/0 against existing origin/main; no fetch or push.
- Working tree: only pre-existing untracked docs/ai/acceptance/b8/, untouched.
- FRESH git fsck --full PASS; the same two known dangling blobs e69de29bb2d1d6434b8b29ae775ad8c2e48c5391 and 625ec44ccb5695fe93ac518f09238fac61eca223.
- FRESH engine typecheck/build PASS, engine 519/519, architecture 70/70, reader 32/32, API 607/607 in 69 files.
- Implementation drift: none. Baselines completed before production edits.

## 2. d1/d2 loss trace

| Stage | d1 | d2 |
|---|---|---|
| Frozen cache | Full definition present | Full definition present |
| Normalized block | docling-texts-97, list, source order 104 | docling-texts-98, list, source order 105 |
| Source item | docling-texts-97-item-0 | docling-texts-98-item-0 |
| Parent/composite identity | docling-groups-7; grouped-mode source section | Same source group and section |
| Source-item extraction | Full definition retained | Full definition retained |
| Target identity | No full-definition target | No full-definition target |
| Child identity | Worked substitution and MODAL CLASS retained | Worked substitution and MODAL CLASS retained |
| Presentation owner in B18 | None | None |
| Explanation evidence in B18 | Full definition available as local prose | Full definition available as local prose |
| Typed evidence in B18 | Numeric substitution only | Numeric substitution only |
| Final visible B18 representation | Missing | Missing |
| B19 visible owner | Source-owned residual key point | Source-owned residual key point |
| Loss point | Cue-group remaining-point substring suppression | Same |

The exact deterministic loss is `extractCueRelationshipUnits` in semantic-structure.ts: the remaining-point filter drops a whole source item when its normalized text **includes any represented child value**. Both definitions match the child label MODAL CLASS and even the normalized single character from the mathematical n child. Neither proves definition coverage. Source extraction and explanation-evidence selection retain both definitions; the selected semantic plan and hence the immutable manifest omit them. B18 assembly therefore had no deterministic owner, regardless of whether a provider could repeat a definition. The source-item validator correctly reported a real omission.

The semantic selection and frozen manifest are unchanged. B19 derives required residuals from the accepted source after selection. Executed proof is in definition-trace.json, loss-detail.json, exact-loss.json, before-regressions.json, and after-regressions.json. The first private diagnostic used the wrong issue-type string, was corrected before editing, and all three pre-fix assertions then FAILED.

## 3. Source-span ancestry diagnosis

The parent contract is the source section/block/list item, not merely its selected manifest label. The residual model records source block ID, item ID, parent group ID where present, source order, exact normalized span text, classification, and explicit visible owner IDs. No new manifest target or source hash is introduced.

| Case | CHILD_OWNED | UNIQUE_REQUIRED | PRESENTATION_ONLY | UNRESOLVED |
| --- | --- | --- | --- | --- |
| Python | 83 | 12 | 17 | 6 |
| Statistics MinerU | 39 | 0 | 10 | 35 |
| Statistics Docling | 60 | 4 | 11 | 27 |
| Accounting | 9 | 0 | 6 | 6 |

CHILD_OWNED requires exact span correspondence within direct provenance or an explicit composite source span. UNIQUE_REQUIRED uses list structure/content role. PRESENTATION_ONLY uses metadata/furniture roles, exact title ownership, or a task command beneath an explicit activity heading that has no required factual owner. UNRESOLVED retains text when these facts are insufficient. Typed tables, rows, formulas, and code retain their existing target contracts; arbitrary cells/scalars cannot consume neighboring prose.

## 4. SOURCE_DUMP ownership

| Case | Section | Cause/content owner | Unique required content? | Fix layer |
|---|---|---|---|---|
| Python | Generator Functions | Source-owned prose prefixes of typed/code composites; set-level detector calls these optional; lecture wording also remains | Yes, mixed with presentation wording | ANCESTRY |
| MinerU | 2. THE MEDIAN | One concept owner carries four source sentences | Yes; all sentences preserved separately | RESIDUAL_EXTRACTION |
| MinerU | Grouped Median | Composite procedure repeats exact child math because paired display delimiters differ | Yes; formula/result children now own it once | RESIDUAL_EXTRACTION |
| MinerU | 3. THE MODE | Composite heading/prose passage | Yes; sentence spans preserve all facts | RESIDUAL_EXTRACTION |
| Docling | 2. THE MEDIAN | One concept owner carries four source sentences | Yes; all sentences preserved separately | RESIDUAL_EXTRACTION |
| Docling | 3. THE MODE | Multi-sentence source definition passage | Yes; all sentences preserved separately | RESIDUAL_EXTRACTION |

All six B18 findings were traced in source-dump-ownership.json. The five Statistics findings are resolved in final serialization. Python's original set-level finding remains. Superseded attempts also reported a second finding in GENERATORS after conservative recovery of an ambiguous activity-adjacent fragment; final output has one SOURCE_DUMP. This variation and retained fragments are not declared unrecoverable cache defects or silently waived. The detector and its thresholds are unchanged.

## 5. Repair

- A small deterministic residual-source contract augments the plan after the frozen manifest is built. It does not alter semantic selection, target IDs/hashes, evidence hashes, source ownership, or provider requests.
- Whole source items survive when manifest phrases cover only a prefix. Those phrases may yield visible display to the complete source item, avoiding phrase/residual duplication.
- Exact composite ancestry can bridge coarse child provenance; unrelated matching text cannot satisfy another source. Typed output aliases are displayed once.
- Parent formula content can yield to a typed child after removing only paired Markdown display-math delimiters for matching. Actual formula text and target identity remain unchanged. No operator, value, syntax, or indentation is inferred.
- Explicit prose sentence boundaries produce atomic visible spans. Ordered markers and mathematical/code runs stay intact.
- Source assembly recomputes the residual contract from accepted blocks. Validation rejects changed/missing presentation and checks actual residual visibility, including serialized and non-standalone outputs. Internal IDs alone never satisfy a residual.
- The existing source-item validator remains unchanged in extraction, thresholds, and matching semantics. Added residual visibility checks strengthen completeness beyond selected targets.
- OpenAI still owns only bounded explanations; all seven final requests are byte-for-byte identical to B18 initial requests. No prompt or provider ownership change.

## 6. Regression evidence

| Regression | Before | After |
|---|---|---|
| d1 full source definition survives preserved example children | Executed starting HEAD: FAIL | PASS, source-exact visible residual |
| d2 full source definition survives preserved example children | Executed starting HEAD: FAIL | PASS, source-exact visible residual |
| Source-item omission despite all child targets retained | Executed starting HEAD: FAIL | PASS, zero Docling omission findings |
| Generic definition + formula + result conservation | New synthetic assertion; no starting-HEAD execution claimed | PASS, definition retained and math once |
| Metadata/ambiguity, source identity/order, tables/rows, provider tampering, hidden evidence, serialization | New synthetic assertions | PASS |
| Exact composite child alias and paired display-math delimiters | Development issues captured in superseded attempts | PASS |

28 generic cases were added. They cover all requested 20 regression families plus whole-item phrase ownership, source tampering, serialized visible/hidden evidence, activity definitions, non-standalone visibility, coarse composite ancestry, and paired formula delimiters. All prior tests remain unchanged and passing. Initial development caught an ordered-marker sentence split, invalid source-absent test fixtures, a test outline-ID error, and a private audit assumption that every planned heading serializes as an item. Those failed logs are preserved; none is hidden as a clean first attempt.

## 7. Deterministic verification

FRESH engine **547/547**, architecture **98/98**, reader **32/32**, API **607/607** (69 files). Added regressions: **28**. Engine typecheck/build PASS. These gates pass on final implementation before its provider rerun.

| Case | Targets | Grounding | Omissions | Assembly | SOURCE_DUMP | Other automatic findings |
| --- | --- | --- | --- | --- | --- | --- |
| Python | 99/99 | 0.99 | 0 | passed | 1 | 6 |
| Statistics MinerU | 232/232 | 1.00 | 0 | passed | 0 | 1 |
| Statistics Docling | 156/156 | 1.00 | 0 | passed | 0 | 1 |
| Accounting | 46/46 | 1.00 | 0 | passed | 0 | 0 |

## 8. Python live result

99/99, coverage 1.00, grounding 0.99; zero omissions/fabrication/provider loss, fallback, factual retries, and explanation retries. Assembly PASS. Automatic usefulness FAIL: 1 SOURCE_DUMP and 6 instructional findings. Manual usefulness FAIL. Exact code-suffix duplication remains prevented; the newly detected duplicate output-line recovery was corrected using composite ancestry. Remaining near-duplicate descriptions, relationship prefixes, and conservative lecture fragments prevent acceptance. Flattened cached code remains unchanged. 2 calls, 5.758 s.

## 9. Statistics MinerU live result

232/232, coverage 1.00, grounding 1.00, omissions 0. Median, its formulas, result 70.7, examples, tables, and required rows remain visible. All three B18 SOURCE_DUMP findings are resolved, including exact repeated formula runs. Composite cell fragments, near-duplicate passages, and an instructional example prompt remain. Assembly PASS; automatic and manual usefulness FAIL. 2 calls, no retries or replacements, 9.408 s.

## 10. Statistics Docling live result

156/156, coverage 1.00, grounding 1.00. Both d1/d2 full definitions are visible, copied from their frozen list items; omissions 0. Formulas/results/tables remain with original ownership, including distinct same-valued tables. The neighboring formula remains in its frozen section. Both B18 SOURCE_DUMP findings are resolved. Assembly PASS. Automatic usefulness still fails an instructional example prompt; manual usefulness fails remaining fragmentary explanations, repeated passages/labels, and presentation noise. 2 calls, no retries or replacement, 6.259 s.

## 11. Accounting live result

46/46, coverage and grounding 1.00. Capital row, corresponding cash row, ledger headers, and every required row remain. Trial-balance table occurs once. Malformed rows are unchanged. Assembly and automatic usefulness PASS; manual usefulness FAIL for fragmentary key points/grammar and residual context clutter, not merely damaged table formatting. The trailing word in the management-use point already exists in the frozen manifest; this is a source-target boundary artifact, not provider fabrication or new residual extraction. Cash prose varies by provider wording under unchanged exact duplicate filtering. 1 call, no retries/fallback, 3.559 s.

## 12. Retry behavior

| Case | Calls | Explanation retries | Replacements | Factual retries |
| --- | --- | --- | --- | --- |
| Python | 2 | 0 | 0 | 0 |
| Statistics MinerU | 2 | 0 | 0 | 0 |
| Statistics Docling | 2 | 0 | 0 | 0 |
| Accounting | 1 | 0 | 0 | 0 |

B18 calls 2/3/3/1 become 2/2/2/1. Explanation retries 0/1/1/0 become all zero. Docling's one replacement becomes zero. Factual retries remain zero. OPENAI_API_KEY was checked by name/presence only; gpt-4o readiness passed. Four sequential four-case attempts used 7 requests each, plus one readiness request: 29 total provider requests. All captures are preserved. No concurrency was added to generation.

## 13. Runtime

| Case | B18 seconds | B19 seconds | Difference | Under 30 s? | Under 60 s? |
| --- | --- | --- | --- | --- | --- |
| Python | 7.511 | 5.758 | -1.753 | Yes | Yes |
| Statistics MinerU | 15.571 | 9.408 | -6.163 | Yes | Yes |
| Statistics Docling | 9.776 | 6.259 | -3.517 | Yes | Yes |
| Accounting | 3.339 | 3.559 | 0.220 | Yes | Yes |

Live component timing, milliseconds:

| Case | Planning | Evidence/projection | Provider | Validation | Assembly | Other | Total |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Python | 83 | 35 | 4979 | 343 | 17 | 301 | 5758 |
| Statistics MinerU | 187 | 504 | 4023 | 2247 | 29 | 2418 | 9408 |
| Statistics Docling | 56 | 29 | 5236 | 415 | 19 | 504 | 6259 |
| Accounting | 14 | 6 | 3434 | 47 | 4 | 54 | 3559 |

The unchanged live instrumentation combines ancestry with planning/revalidation and projection with evidence assembly. Separate additive live ancestry/projection measurements are NOT AVAILABLE. The following fresh isolated deterministic replays measure those operations directly; they are not subtracted from or added to the live totals:

| Case | Ancestry/residual replay ms | Projection replay ms |
| --- | --- | --- |
| Python | 21.207 | 5.511 |
| Statistics MinerU | 34.915 | 23.748 |
| Statistics Docling | 16.850 | 8.232 |
| Accounting | 2.376 | 1.208 |

These are individual runs, not a controlled performance benchmark. Final provider timing was captured after root verification completed; provider latency remains variable. Other/unattributed time remains explicit.

## 14. Manual Reviewer quality

| Case | Faithfulness | Completeness | Repetition | Readability | Verdict |
|---|---|---|---|---|---|
| Python | PASS, no outside facts | 99 targets and residuals visible | FAIL, near-duplicate source descriptions | FAIL, lecture fragments and source clutter | FAIL |
| MinerU | PASS, exact source math/rows | 232 targets, zero omissions | FAIL, cell/parent fragments remain | FAIL, composite table/prose noise | FAIL |
| Docling | PASS, both definitions source-exact | 156 targets, zero omissions | FAIL, distinct-source repeats and label/prose copies | FAIL, fragments/instructional prompts | FAIL |
| Accounting | PASS, exact source rows | 46 targets, zero omissions | Some near redundancy remains | FAIL, source-target fragments and grammar | FAIL |

Complete serialized text and typed JSON were reviewed. No native/device screenshot acceptance is claimed. Assembly PASS is not conflated with the independent serialized usefulness gate. This gate still exposes the pre-existing internal-candidate versus serialized-output mismatch; it was not bypassed.

Observed-fragment classification:

| Fragment family | Origin | Classification | Action |
|---|---|---|---|
| Definitions, formula substitutions, computational steps | Source blocks and targets | REQUIRED_CONTENT | Preserve |
| Explicit activity heading and learner commands beneath it without factual owners | Heading/source-role ancestry | PRESENTATION_METADATA | Suppress |
| Previous-slide claims that also state a concept; non-imperative activity-adjacent text | Source list items | AMBIGUOUS | Preserve; do not assert cache damage |
| Example/source relationship labels inherited by typed facts | Relationship metadata and source targets | AMBIGUOUS unless exact alternate owner exists | Conservative retention |
| Weighted-mean fragment and cash wording | Provider-selected local wording | PROVIDER_WORDING | Recorded as manual-quality failure where incomplete |
| Accounting short/trailing-word key points | Frozen source-target boundary | REQUIRED_CONTENT / AMBIGUOUS presentation | Preserve exact source; no outside completion |

## 15. Unrecoverable cache limitations

- Python code blocks already lack source line boundaries/indentation; a broken expression is split across cached blocks. No indentation or missing syntax was reconstructed.
- Accounting cached rows already contain fused dates/cells, inconsistent columns, and placeholder amounts. No transaction, numeric value, or cell boundary was invented.

Formula placement follows frozen source ordering. Repetition, instructional wording, and target-boundary fragments are not classified as unrecoverable merely because they remain.

## 16. Full unchanged B12 rerun

**NOT RUN — targeted prerequisites failed.** Python fails automatic usefulness (source dumps/instructional fragments) and manual quality; MinerU and Docling fail automatic instructional and manual presentation gates; Accounting fails manual fragment/grammar quality. Completeness/grounding/assembly improvements do not waive these prerequisites.

## 17. Simplicity gate

Plan → deterministic evidence → source ancestry/residual projection → presentation → bounded explanations → validation → assembly. No factual regeneration/retries, fixture hacks, course/parser-specific content repairs, threshold weakening, speculative reconstruction, or production-model change. Parser default remains legacy. The new ancestry helper is deterministic and uses source roles/identities and bounded exact normalization only.

## 18. Verification

FRESH engine typecheck/build/eval, architecture, reader, API, root typecheck/lint/build all PASS. Root checks force execution: 7/7 workspaces, zero cached tasks. Four existing lint warnings remain. git diff --check and git fsck --full PASS. Generated Next next-env.d.ts drift was restored; no generated app change is committed. See verification.json and verified-*.log for final exact commands/results.

## 19. Files created/changed

- Implementation: packages/engine/src/reviewer-source-ancestry.ts (new); reviewer-source-representation.ts; reviewer-evidence-presentation.ts; reviewer-evidence-assembly.ts; stage2-plan.ts; stage5a-grounding.ts; types.ts.
- Tests: packages/engine/evals/reviewer-deterministic-evidence.eval.ts, 28 synthetic regressions.
- Validation/docs: this report; docs/current-state.md; docs/roadmap.md; docs/ai/current_sprint.md.
- Private .local/b19/: baseline/verification logs, exact loss trace, before/after regressions, full ancestry and ownership audit, readiness, four preserved live attempts, complete outputs, invariant hashes, timings, and manual diagnostics. Ignored and uncommitted.
- Pre-existing untouched: untracked B8 directory and historical B16/B17/B18 acceptance reports.

## 20. Git result

Implementation and tests are committed together as fix(engine): preserve unique composite source evidence. The documentation commit is docs(ai): record B19 Reviewer validation. Final HEAD is the latter commit (resolve from git log); final full hash is recorded in the task response and private git-result.json. Main ends 22 ahead / 0 behind. Working tree contains only pre-existing untracked B8 files. Historical reports preserved; parser default unchanged; gpt-4o unchanged; no secrets committed; no push.

## 21. Verdict

**FAIL — Reviewer source completeness/presentation defect remains**

The real Docling omissions are repaired through source-owned residual evidence, all 533 targets and hashes remain intact, and all Statistics source dumps are resolved without changing provider prompts or factual ownership. Remaining conservative source fragments, composite/cell repetition, and incomplete prose still fail the frozen automatic/manual presentation gates. Therefore B19 is not a full Reviewer acceptance PASS.

## 22. Next task

Repair the remaining source-owned fragment and presentation classification contract using the B19 serialized captures, preserving residual completeness, frozen targets, and all acceptance gates. Do not implement that next slice in B19.
