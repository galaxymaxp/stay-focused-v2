# B19.1 frozen-architecture runtime model escalation

## 1. Starting state

- Branch: `main`.
- Starting HEAD: `93c716cea58d5e3c6e5c0bab56835b8150ab4824`.
- Ahead/behind: 22 / 0 relative to `origin/main` (`git rev-list` reported `0 22`).
- Working tree: only the pre-existing untracked `docs/ai/acceptance/b8/` directory.
- Baselines: frozen B19 `gpt-4o` results and `.local/b19/live/` captures were present and used as authoritative; GPT-4o was not rerun.
- Implementation drift: none. Production Reviewer model was `gpt-4o`; parser default was `legacy`; B16-B19 reports were preserved.

## 2. Experiment controls

Everything was frozen except the runtime generation model. The same normalized source, outline, plan, manifests, target IDs/hashes, residual ancestry, evidence projection, display ownership, prompts, schemas, temperature behavior, retry policy, validation, grounding, omission checks, usefulness detector, and assembly were used for Terra and Sol.

Before every case, the harness regenerated the deterministic preflight and required exact equality with the B19 source, outline, plan, and manifest. The four structured input files were byte-identical to the preserved B19 final attempt. OCR/extraction was unchanged; no new OCR service was enabled; no Google Cloud configuration was changed; no document was re-extracted.

| Frozen structured input | SHA-256 | Matches B19 attempt 3? |
| --- | --- | --- |
| Python | `247f63547a5d07be349c8e1cf4d0c1473128f635672de794b8c6592ab376f537` | Yes |
| Statistics MinerU | `e4724aa27d61c00d56bd55745967c88bcadacf74b620e39eec05644dd9d256a5` | Yes |
| Statistics Docling | `9752b5892f68548716e41b8a2d752ed826eefd36f5221829dc9263d4e7231f59` | Yes |
| Accounting | `d987e790f475323f7ad01fb753419f63e2cb26fc10535e1c303ec95d69e3703f` | Yes |

## 3. Provider readiness

`OPENAI_API_KEY` was present by name through ignored local configuration. Its value was not printed or captured.

| Model | Available? | Reasoning setting | Readiness |
| ----- | ---------- | ----------------- | --------- |
| `gpt-5.6-terra` | Yes | Not explicitly set; the existing Chat Completions provider exposes no reasoning-effort control, so normal provider behavior was preserved | PASS, HTTP 200, exact model name |
| `gpt-5.6-sol` | Yes | Not explicitly set; the existing Chat Completions provider exposes no reasoning-effort control, so normal provider behavior was preserved | PASS, HTTP 200, exact model name |

Each readiness check made one minimal request with zero retries. No substitute model was used.

## 4. B19 gpt-4o baseline

| Case | Targets | Coverage | Grounding | Omissions | Fabrication | Assembly | Automatic usefulness | Manual usefulness | Calls | Runtime |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: | ---: |
| Python | 99/99 | 1.00 | 0.99 | 0 | 0 | PASS | FAIL: 1 SOURCE_DUMP, 6 INSTRUCTIONAL | FAIL | 2 | 5.758 s |
| Statistics MinerU | 232/232 | 1.00 | 1.00 | 0 | 0 | PASS | FAIL: 1 INSTRUCTIONAL | FAIL | 2 | 9.408 s |
| Statistics Docling | 156/156 | 1.00 | 1.00 | 0 | 0 | PASS | FAIL: 1 INSTRUCTIONAL | FAIL | 2 | 6.259 s |
| Accounting | 46/46 | 1.00 | 1.00 | 0 | 0 | PASS | PASS | FAIL | 1 | 3.559 s |

The B19 history remains FAIL. It was not replaced with a new favorable sample.

## 5. Terra Run A

| Case | Targets / coverage / grounding | Omissions / fabrication / assembly | Usefulness diagnostics | Manual | Calls | Runtime | Input / cached / output / reasoning | Cost |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: |
| Python | 99/99 / 1.00 / 0.99 | 0 / 0 / PASS | 2 SOURCE_DUMP, 6 INSTRUCTIONAL; 0 FRAGMENT, 0 REPETITION | FAIL | 2 | 6.624 s | 3,153 / 0 / 419 / 0 | $0.011334 |
| Statistics MinerU | 232/232 / 1.00 / 1.00 | 0 / 0 / PASS | 1 INSTRUCTIONAL; all other types 0 | FAIL | 2 | 12.479 s | 2,904 / 0 / 677 / 152 | $0.013932 |
| Statistics Docling | 156/156 / 1.00 / 1.00 | 0 / 0 / PASS | 1 INSTRUCTIONAL; all other types 0 | FAIL | 2 | 6.356 s | 3,112 / 0 / 543 / 0 | $0.012740 |
| Accounting | 46/46 / 1.00 / 1.00 | 0 / 0 / PASS | none; automatic PASS | FAIL | 1 | 4.738 s | 974 / 0 / 338 / 84 | $0.006004 |

Terra made seven generation requests with zero provider, explanation, or factual retries. Python retained lecture wording and repetition and gained a second SOURCE_DUMP finding. MinerU remained dominated by composite/cell fragments. Docling generated the incomplete explanation `Since there are 5 (odd) items,`. Accounting retained the `report` grammar error and fragmentary points. No outside knowledge was detected.

## 6. Sol Run A

| Case | Targets / coverage / grounding | Omissions / fabrication / assembly | Usefulness diagnostics | Manual | Calls | Runtime | Input / cached / output / reasoning | Cost |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: |
| Python | 99/99 / 1.00 / 0.99 | 0 / 0 / PASS | 2 SOURCE_DUMP, 6 INSTRUCTIONAL; 0 FRAGMENT, 0 REPETITION | FAIL | 2 | 7.434 s | 3,153 / 0 / 434 / 0 | $0.021292 |
| Statistics MinerU | 232/232 / 1.00 / 1.00 | 0 / 0 / PASS | 1 INSTRUCTIONAL; all other types 0 | FAIL | 2 | 16.062 s | 2,904 / 0 / 699 / 192 | $0.025596 |
| Statistics Docling | 156/156 / 1.00 / 1.00 | 0 / 0 / PASS | 1 INSTRUCTIONAL; all other types 0 | FAIL | 2 | 8.976 s | 3,112 / 0 / 559 / 0 | $0.023628 |
| Accounting | 46/46 / 1.00 / 1.00 | 0 / 0 / PASS | none; automatic PASS | FAIL | 1 | 4.429 s | 974 / 0 / 248 / 0 | $0.008856 |

Sol made seven generation requests with zero provider, explanation, or factual retries. It repaired one Accounting agreement error in Run A and avoided Terra's incomplete ungrouped-median explanation, but Python and both Statistics reviewers remained fragmentary, repetitive, and instructional. No outside knowledge was detected.

## 7. Candidate Run B

Sol was selected as the narrow Run A leader for replication, not for production: its one Accounting grammar repair and avoidance of Terra's incomplete Docling sentence made it slightly preferable while both still failed manual usefulness.

| Case | Targets | Coverage | Grounding | Omissions | Fabrication | Assembly | Automatic diagnostics | Manual | Runtime |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | ---: |
| Python | 99/99 | 1.00 | 0.99 | 0 | 0 | PASS | 2 SOURCE_DUMP, 6 INSTRUCTIONAL | FAIL | 7.092 s |
| Statistics MinerU | 232/232 | 1.00 | 1.00 | 0 | 0 | PASS | 1 INSTRUCTIONAL | FAIL | 11.740 s |
| Statistics Docling | 156/156 | 1.00 | 1.00 | 0 | 0 | PASS | 1 INSTRUCTIONAL | FAIL | 7.660 s |
| Accounting | 46/46 | 1.00 | 1.00 | 0 | 0 | PASS | none | FAIL | 6.777 s |

Sol B made seven generation requests with zero retries. It preserved correctness and reproduced the defect pattern, but reverted Sol A's `Cash Accounting reports...` repair to `Cash Accounting report...`. The small prose gain was therefore not reliable.

## 8. Manual Reviewer comparison

| Case | gpt-4o | Terra | Sol | Best |
| ---- | ------ | ----- | --- | ---- |
| Python | FAIL: source dump, six lecture findings, repetition | FAIL: same six findings, two source dumps, awkward overlap | FAIL: same six findings, two source dumps, repetition | GPT-4o narrowly; none useful |
| Statistics MinerU | FAIL: fragments and instructional text | FAIL: fragments/instructional text remain | FAIL: fragments/instructional text remain | No material winner |
| Statistics Docling | FAIL: fragments/repetition/instruction | FAIL: adds incomplete sentence | FAIL: avoids Terra sentence but retains defects | GPT-4o/Sol A close; none useful |
| Accounting | FAIL: grammar/fragments | FAIL: same grammar/fragments | FAIL overall; one grammar fix in A, reverted in B | Sol A sample only; unreliable |

Python's SOURCE_DUMP did not disappear; lecture wording did not disappear; complete/natural prose did not become consistent; repetition did not materially decrease; neither model introduced unsupported Python knowledge. MinerU remained verbose through deterministic retained evidence, not model embellishment, and preserved 1.00 grounding. Docling definitions remained natural only where already complete in source; fragments/repetition remained and formula ownership did not change. Accounting's malformed cached rows were left honestly unchanged.

## 9. Defect comparison

| Defect | gpt-4o B19 | Terra A | Sol A | Candidate B | Model-sensitive? |
| --- | --- | --- | --- | --- | --- |
| Python SOURCE_DUMP | 1 | 2 | 2 | 2 | No; not removed |
| Python lecture wording | 6 findings | 6 findings | 6 findings | 6 findings | No |
| Python repetition | FAIL | FAIL | FAIL | FAIL | No |
| MinerU fragments | FAIL | FAIL | FAIL | FAIL | No |
| MinerU instructional text | 1 finding | 1 finding | 1 finding | 1 finding | No |
| Docling fragments | FAIL | FAIL, plus incomplete explanation | FAIL | FAIL | No |
| Docling repetition | FAIL | FAIL | FAIL | FAIL | No |
| Accounting fragments | FAIL | FAIL | FAIL | FAIL | No |
| Accounting grammar | FAIL | FAIL | one fix | fix reverted | Not reliably |

## 10. Correctness preservation

| Candidate | Total targets | d1/d2 | Formulas/results/tables | Source ownership | Fabrication | Factual retries |
| --- | ---: | --- | --- | --- | ---: | ---: |
| Terra A | 533/533 | retained | retained | unchanged exact preflight | 0 | 0 |
| Sol A | 533/533 | retained | retained | unchanged exact preflight | 0 | 0 |
| Sol B | 533/533 | retained | retained | unchanged exact preflight | 0 | 0 |

All candidates had zero provider-caused target loss, zero source-item omissions, zero unsupported outside knowledge, and passing assembly. Python remained 0.99 grounded; the other three cases remained 1.00. B19 ancestry and formula/table ownership were preserved.

## 11. Automatic usefulness

The existing detector was run unchanged. A zero means the detector emitted no finding of that type; manual fragment/repetition review remains independently authoritative.

| Model/run | Case | SOURCE_DUMP | INSTRUCTIONAL | FRAGMENT | REPETITION | Automatic verdict |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| GPT-4o B19 | Python | 1 | 6 | 0 | 0 | FAIL |
| GPT-4o B19 | MinerU | 0 | 1 | 0 | 0 | FAIL |
| GPT-4o B19 | Docling | 0 | 1 | 0 | 0 | FAIL |
| GPT-4o B19 | Accounting | 0 | 0 | 0 | 0 | PASS |
| Terra A | Python | 2 | 6 | 0 | 0 | FAIL |
| Terra A | MinerU | 0 | 1 | 0 | 0 | FAIL |
| Terra A | Docling | 0 | 1 | 0 | 0 | FAIL |
| Terra A | Accounting | 0 | 0 | 0 | 0 | PASS |
| Sol A | Python | 2 | 6 | 0 | 0 | FAIL |
| Sol A | MinerU | 0 | 1 | 0 | 0 | FAIL |
| Sol A | Docling | 0 | 1 | 0 | 0 | FAIL |
| Sol A | Accounting | 0 | 0 | 0 | 0 | PASS |
| Sol B | Python | 2 | 6 | 0 | 0 | FAIL |
| Sol B | MinerU | 0 | 1 | 0 | 0 | FAIL |
| Sol B | Docling | 0 | 1 | 0 | 0 | FAIL |
| Sol B | Accounting | 0 | 0 | 0 | 0 | PASS |

## 12. Runtime

| Case | gpt-4o | Terra | Sol | Candidate B |
| ---- | -----: | ----: | --: | ----------: |
| Python | 5.758 s | 6.624 s | 7.434 s | 7.092 s |
| MinerU | 9.408 s | 12.479 s | 16.062 s | 11.740 s |
| Docling | 6.259 s | 6.356 s | 8.976 s | 7.660 s |
| Accounting | 3.559 s | 4.738 s | 4.429 s | 6.777 s |

All runs were under 30 seconds. Component timing, in milliseconds (`Other` is explicit unattributed orchestration time):

| Run/case | Planning | Deterministic evidence/projection | Provider wait | Validation | Assembly | Other | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Terra / Python | 19 | 12 | 6,174 | 205 | 11 | 202 | 6,623 |
| Terra / MinerU | 111 | 285 | 8,762 | 1,442 | 32 | 1,847 | 12,479 |
| Terra / Docling | 67 | 37 | 5,687 | 257 | 11 | 297 | 6,356 |
| Terra / Accounting | 7 | 2 | 4,663 | 31 | 2 | 33 | 4,738 |
| Sol / Python | 22 | 13 | 6,995 | 203 | 13 | 187 | 7,433 |
| Sol / MinerU | 112 | 275 | 11,646 | 1,664 | 31 | 2,334 | 16,062 |
| Sol / Docling | 60 | 49 | 8,223 | 320 | 15 | 309 | 8,976 |
| Sol / Accounting | 9 | 3 | 4,320 | 42 | 3 | 52 | 4,429 |
| Sol B / Python | 24 | 11 | 6,699 | 190 | 10 | 158 | 7,092 |
| Sol B / MinerU | 86 | 220 | 8,497 | 1,275 | 27 | 1,634 | 11,739 |
| Sol B / Docling | 43 | 26 | 6,965 | 295 | 14 | 316 | 7,659 |
| Sol B / Accounting | 10 | 4 | 6,655 | 47 | 3 | 58 | 6,777 |

## 13. Usage and estimated cost

Official pricing was checked on 2026-09-08: [GPT-5.6 Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra), [GPT-5.6 Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol), and [GPT-4o](https://developers.openai.com/api/docs/models/gpt-4o). Rates used per million tokens were Terra $2 input / $0.20 cached / $12 output; Sol $4 / $0.40 / $20; GPT-4o $2.50 / $1.25 / $10. Sol promotional pricing is documented through at least 2026-11-21. Reported completion totals already include reasoning tokens.

| Model | Input | Cached input | Output | Reasoning | Requests | Estimated total |
| ----- | ----: | -----------: | -----: | --------: | -------: | --------------: |
| GPT-4o B19 | 10,185 | 7,168 | 1,655 | 0 | 7 | $0.033052 |
| Terra A | 10,143 | 0 | 1,977 | 236 | 7 | $0.044010 |
| Sol A | 10,143 | 0 | 1,940 | 192 | 7 | $0.079372 |
| Sol B | 10,143 | 9,151 | 1,951 | 168 | 7 | $0.046648 |

Per-reviewer estimated cost:

| Run | Python | MinerU | Docling | Accounting | Average |
| --- | ---: | ---: | ---: | ---: | ---: |
| GPT-4o B19 | $0.008742 | $0.009560 | $0.009900 | $0.004850 | $0.008263 |
| Terra A | $0.011334 | $0.013932 | $0.012740 | $0.006004 | $0.011002 |
| Sol A | $0.021292 | $0.025596 | $0.023628 | $0.008856 | $0.019843 |
| Sol B | $0.010003 | $0.012803 | $0.012426 | $0.011416 | $0.011662 |

## 14. Reliability

Candidate Run B reproduced Sol A's correctness, latency envelope, and automatic failure pattern. It did not reproduce the only material-looking prose gain: the Accounting agreement repair reverted. Sol is therefore reliable for correctness but not for the presentation improvement needed to justify escalation.

## 15. OCR/extraction status

`UNCHANGED`

- Current OCR/extraction path retained.
- No paid OCR experiment performed.
- No Google Cloud service enabled or configured.
- No re-extraction performed.
- All four frozen structured-document SHA-256 values matched B19 attempt 3, and every run's source/outline/plan/manifest matched the B19 live preflight exactly.

## 16. Capstone readiness

`NO — ONE FINAL PRESENTATION REPAIR REQUIRED`

Both stronger models preserve correctness but leave substantially the same student-visible fragments, lecture wording, source dumps, repetition, and presentation noise. The dominant defect is in deterministic display selection/presentation rather than the runtime model ceiling.

## 17. Production-model decision

`KEEP GPT-4O — MODEL ESCALATION DID NOT FIX QUALITY`

Neither candidate passes manual usefulness across all four frozen cases. Sol's isolated grammar improvement was not reproduced; Terra is cheaper than Sol but also fails. Production remains unchanged.

## 18. Verification

All results below are FRESH:

- `npm run typecheck --workspace @stay-focused/engine`: PASS.
- `npm run build --workspace @stay-focused/engine`: PASS.
- `npm run eval --workspace @stay-focused/engine`: PASS, 547/547.
- Reviewer architecture: PASS, 98/98.
- Reader: PASS, 32/32.
- API: PASS, 607/607 across 69 files.
- Root `npm run typecheck -- --force`: PASS, 7/7 workspaces.
- Root `npm run lint -- --force`: PASS, 7/7 workspaces; four pre-existing warnings remain.
- Root `npm run build -- --force`: PASS, 7/7 workspaces.
- `git diff --check`: PASS.
- `git fsck --full`: PASS; two harmless dangling blobs reported.
- `git rev-list --left-right --count origin/main...HEAD`: starting value `0 22`; final value recorded after the documentation commit.

The Next build's generated `apps/api/next-env.d.ts` drift was restored to the committed content before the final Git checks.

## 19. Files created/changed

- Project implementation: none.
- Validation documentation: this report plus the B19.1 current-state entries in `docs/current-state.md`, `docs/roadmap.md`, and `docs/ai/current_sprint.md`.
- Private, ignored `.local/b19-1/`: readiness request/result; frozen-cache hashes and exact preflights; Terra A, Sol A, and Sol B request/response captures; reviewer JSON/text; automatic audits; manual audit; usage/cost; timing; verification script/results/logs.
- Untouched: production provider/model defaults, parser routing/defaults, OCR/extraction configuration and services, B8 files, corpus, fixtures, and B16-B19 historical reports.

## 20. Git result

- Final HEAD: documentation commit `docs(ai): record B19.1 runtime model comparison` (exact hash recorded in the task response).
- Commits: one documentation-only commit.
- Working tree: only pre-existing untracked `docs/ai/acceptance/b8/` after final checks.
- Ahead/behind: 23 / 0 after the documentation commit.
- Production model changed? No.
- OCR/extraction changed? No.
- Secrets committed? No.
- Pushed? No.

## 21. Verdict

`FAIL — presentation defects are model-independent`

The controlled comparison falsifies runtime-model ceiling as the primary cause. Both candidates preserve 533/533 correctness, but neither materially improves the deterministic student-visible presentation enough for the capstone.

## 22. Next task

Perform one final narrowly scoped presentation cleanup against the frozen B19 architecture, then move to end-to-end demo preparation.
