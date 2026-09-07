# B16.1 — Live provider and runtime validation

Current result: **Attempt 3 — restored-balance validation: FAIL**, detailed after
the preserved historical report below. Provider capacity is now AVAILABLE.

History:
- Attempt 1 — blocked: HTTP 429 no credits (recorded by the resumption brief;
  a separate timestamped readiness artifact is not present in this checkout).
- Attempt 2 — blocked: HTTP 429 no credits; the existing report below and its
  2026-09-06T18:04:26.400Z sanitized probe are preserved.
- Attempt 3 — restored-balance validation, 2026-09-07: working provider,
  complete targeted runs, failed manual/grounding gates; full B12 ineligible.

## Preserved historical blocked-attempt report

Date: 2026-09-07, Asia/Manila. Validation-only attempt stopped at the provider readiness gate.

## 1. Starting state

- Branch: `main`.
- Starting HEAD: `fb3710328812e736d111ac4d282024a58507b53c`.
- Preceding commits: `fd9476b` (deterministic evidence implementation), then `fb37103` (architecture/runtime documentation).
- Working tree: only pre-existing untracked `docs/ai/acceptance/b8/`.
- Ahead/behind: 14 ahead / 0 behind `origin/main` (local remote-tracking reference; no fetch).
- Engine baseline: historical B16 475/475, including focused architecture 26/26; NOT RERUN.
- API baseline: historical B16 607/607 across 69 files; NOT RERUN.
- FRESH `git fsck --full`: exit 0, with known dangling blobs `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and `625ec44ccb5695fe93ac518f09238fac61eca223`.

## 2. Provider readiness

- Required variable for the existing harness's generation phase: `OPENAI_API_KEY`; present. No secret values were printed.
- Configuration checked against `apps/api/scripts/b12-hybrid-acceptance.ts` and the production OpenAI provider: root `.env.local`, existing process-environment precedence, installed OpenAI SDK, Chat Completions, default model `gpt-4o`, strict JSON schema.
- Minimal request: synthetic readiness JSON, 20 output-token limit, no academic source content. The private readiness probe disables SDK retries and uses a 30-second timeout so a permanent blocker stops immediately. Production provider/harness configuration was not modified.
- Request started: `2026-09-06T18:04:26.400Z` (2026-09-07 02:04:26.400 Asia/Manila).
- FRESH result: HTTP 429, safely classified as no credits / provider capacity unavailable. One request, zero retries; elapsed 2,056 ms. No raw provider error was printed or saved.
- Authentication: no authentication-failure response observed; successful authenticated generation remains unproven.
- Capacity: unavailable. No fallback generation was attempted or accepted.
- Readiness verdict: **BLOCKED — provider capacity unavailable**.

## 3. Architecture invariant preflight

NOT RUN: Step 2 requires immediate stop on no credits, before Step 3.

Historical B16 contract only: provider-owned required targets = 0; provider-caused loss possible = No; normal factual retries = 0; engine 475/475 and architecture 26/26. These are not fresh B16.1 proof. No implementation changed.

## 4. Python live result

| Metric | Result |
| --- | --- |
| Source hierarchy / B15 dispositions / standalone, structural, typed-only, unsupported sections | NOT RUN |
| Coverage / grounding / issues / fabrications | NOT RUN |
| Manifest / provider-owned targets / provider losses | NOT RUN |
| Calls / batches / retries / duration / provider wait | NOT RUN |
| Assembly / usefulness | NOT RUN |

The readiness request is not a Python generation call. Historical B16 fallback metrics are not reused as fresh provider acceptance.

## 5. Python manual quality

NOT RUN: no fresh student-visible sections were generated. Explanation quality, instructional leakage, title repetition, code-as-explanation, source dumps, outside knowledge and study usefulness remain unassessed, including all eight requested iterator/generator risk areas.

## 6. Statistics MinerU live result

NOT RUN: provider readiness blocked. Manifest total, source availability, deterministic assemblability, ambiguous/unowned targets, represented targets after provider, losses, coverage, grounding, issues, fabrications, requests, retries, runtime, assembly and usefulness are unmeasured. Mean/median/mode, formula/result, table and worked-example inspection was not performed.

## 7. Statistics Docling live result

NOT RUN: provider readiness blocked. All manifest, target, quality, request, retry, runtime and assembly metrics remain unmeasured. Mean/median/mode, formulas/results, tables/examples and the previously source-dump-prone Median material were not inspected anew.

## 8. Accounting live result

NOT RUN: provider readiness blocked. Required-target source availability/assemblability, source-unavailable and ambiguous/unowned classification, representation, losses, coverage, grounding, issues, fabrications, calls, retries, runtime, assembly and usefulness are unmeasured. The capital row, corresponding cash row, ledger headers and other source-available rows were not inspected anew.

## 9. Batch behavior

| Case | Standalone sections | Batches | Sections/batch | Failed explanations | Isolated retries |
| --- | --- | --- | --- | --- | --- |
| Python / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Accounting / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

Section isolation, stable IDs/order, response-order independence, cross-section borrowing and partial-failure isolation: NOT LIVE VALIDATED. Batch character/token counts and response ordering: unavailable.

## 10. Retry behavior

| Case | Factual retries | Explanation retries | Provider/schema retries | Total |
| --- | --- | --- | --- | --- |
| Python / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Accounting / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

The readiness probe made zero retries. No Reviewer grounding, usefulness, schema or transient-failure retry behavior was exercised; no fresh factual-retry invariant is claimed.

## 11. Runtime

| Case | Deterministic | Provider wait | Validation | Assembly | Total | Provider % |
| --- | --- | --- | --- | --- | --- | --- |
| Python / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Statistics / Docling | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |
| Accounting / MinerU | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN |

Planning and deterministic-evidence assembly timings are also NOT RUN. Typical Reviewer duration, routine >30 s / >60 s behavior, main latency bottleneck and avoidability are unknown. The 2,056 ms failed readiness request does not establish successful generation latency or a provider-wait/Reviewer-total ratio. No optimization is justified by this result.

## 12. B15 → B16 comparison

| Case | B15 calls | New calls | Reduction | Old factual retries | New factual retries |
| --- | ---: | --- | --- | ---: | --- |
| Python / Docling | 25 | NOT RUN | Unknown | 16 | NOT RUN |
| Statistics / MinerU | 27 | NOT RUN | Unknown | 18 | NOT RUN |
| Statistics / Docling | 33 | NOT RUN | Unknown | 22 | NOT RUN |
| Accounting / MinerU | 14 | NOT RUN | Unknown | 9 | NOT RUN |

B15 numbers are historical, as recorded in the preserved B16 report. The standalone readiness call is excluded from Reviewer comparisons.

## 13. Full unchanged B12 rerun

NOT RUN — live targeted prerequisite failed

Provider availability blocked all four targeted runs. The corpus at `C:\Users\Fely Max Dilinila\Documents\Projects\materials`, fixtures, required evidence, thresholds, parser default, extraction providers and frozen policies were not modified.

## 14. Manual Reviewer quality

Python, Statistics MinerU, Statistics Docling and Accounting: NOT RUN for scanability, explanation quality, fact readability, typed-evidence readability, instructional leakage, source dumps, outside knowledge and overall study usefulness. No fresh Reviewer exists for inspection.

## 15. Simplicity check

Preserved B16 implementation contract: Plan → deterministic evidence → batched explanations → validate explanations → assemble.

Historical B16 identifies no factual retries in the manifest-backed normal path and an isolated no-manifest compatibility path. Hidden factual regeneration, unnecessary round trips and successful-provider execution were not exercised by this attempt. No architecture, prompts, batching, retries or validation policy changed.

## 16. Verification

| Command | Result | Notes |
| --- | --- | --- |
| Starting Git status / branch / HEAD / ahead-behind | FRESH PASS | Exact requested starting state |
| `node .local/b16-1/provider-readiness.mjs` | FRESH BLOCKED | One HTTP 429 no-credit response; zero retries |
| `npm run typecheck --workspace @stay-focused/engine` | NOT RUN | Immediate provider stop condition |
| `npm run build --workspace @stay-focused/engine` | NOT RUN | Immediate provider stop condition |
| `npm run eval --workspace @stay-focused/engine` | NOT RUN | Historical 475/475 is not a fresh run |
| `npm test --workspace @stay-focused/api` | NOT RUN | Historical 607/607 is not a fresh run |
| `npm run typecheck` | NOT RUN | Immediate provider stop condition; docs only |
| `npm run lint` | NOT RUN | Immediate provider stop condition; docs only |
| `npm run build` | NOT RUN | Immediate provider stop condition; docs only |
| `git diff --check` | FRESH PASS | Documentation changes checked |
| `git fsck --full` | FRESH PASS | Starting and final checks; same two known dangling blobs |

## 17. Files created/changed

- Validation evidence: this report; factual blocker notes in `docs/current-state.md`, `docs/roadmap.md`, and `docs/ai/current_sprint.md`.
- Justified implementation fixes: none.
- Ignored/private artifacts: `.local/b16-1/provider-readiness.mjs` and sanitized `.local/b16-1/provider-readiness.json`; not staged.
- Pre-existing untouched files: `docs/ai/acceptance/b8/`, historical B12–B16 reports, and `docs/ai/handoff.md`. No credentials, environment files or provider captures staged.

## 18. Git result

- Final HEAD: `fb3710328812e736d111ac4d282024a58507b53c`.
- Commits: none; the task's success-conditioned documentation commit was not made for blocked acceptance.
- Working tree: three modified status documents, this new untracked report, and the pre-existing untracked B8 directory; ignored readiness artifacts remain private.
- Ahead/behind: 14 ahead / 0 behind `origin/main`.
- Historical B8/B12–B16 reports preserved: yes.
- Parser default changed: no; `legacy` remains unchanged.
- Secrets committed: no. Pushed: no.

## 19. Verdict

BLOCKED — live provider capacity or authentication prevented acceptance validation

Single next task: restore capacity for the configured OpenAI account/project, then rerun B16.1 beginning with the minimal readiness gate and Python / Docling. No B17 benchmark-repair work is justified.

---

# Attempt 3 — restored-balance validation

Date: 2026-09-07, Asia/Manila. **FAIL with a working provider.** All four
targeted runs completed; the full unchanged B12 rerun is ineligible. No fallback
is counted as provider acceptance. Earlier blocked attempts above are preserved.

## 1. Starting state

- `main`, HEAD `fb3710328812e736d111ac4d282024a58507b53c`.
- 14 ahead / 0 behind the existing `origin/main` reference; no fetch or push.
- Modified: `docs/current-state.md`, `docs/roadmap.md`, `docs/ai/current_sprint.md`.
- Untracked: this report and the pre-existing `docs/ai/acceptance/b8/`.
- No initial engine implementation drift.
- FRESH `git fsck --full`: exit 0; the same two known dangling blobs above.

## 2. Provider readiness

`OPENAI_API_KEY` was confirmed by presence only. One minimal `gpt-4o` Chat
Completions request succeeded at `2026-09-07T02:35:33.990Z`, 3,773 ms, zero
retries, 51 input / 5 output tokens. Authentication accepted; **Provider capacity:
AVAILABLE**. No new billing, quota, authentication or transient rate-limit error.
The prior sanitized readiness JSON was copied before the new probe replaced it.
No secret/header/raw provider error was printed or committed.

## 3. Fresh architecture verification

Before live generation: engine typecheck/build PASS; engine **475/475**, including
architecture **26/26**; API **607/607**, 69 files. All FRESH.

Independent preflight ran normalization, outline, planning, deterministic assembly
and exact target validation against the existing extracted documents. Source
availability and successful deterministic assembly cover every manifest target:

| Case | Hierarchy | Standalone | Structural | Typed-only | Unsupported | Manifest | Source-available | Assemblable | Unavailable | Ambiguous/unowned |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | 13 | 9 | 0 | 2 | 2 | 99 | 99 | 99 | 0 | 0 |
| Statistics / MinerU | 10 | 9 | 0 | 0 | 1 | 232 | 232 | 232 | 0 | 0 |
| Statistics / Docling | 11 | 11 | 0 | 0 | 0 | 156 | 156 | 156 | 0 | 0 |
| Accounting / MinerU | 6 | 5 | 1 | 0 | 0 | 46 | 46 | 46 | 0 | 0 |

Docling Statistics uses the existing default standalone disposition when its
plan omits explicit disposition metadata. Counts above inspect actual sections.
For every case, final/rejected key-point arrays exactly equal pre-provider
deterministic arrays. Provider-owned required targets = 0; provider-caused losses
= 0; normal factual-completion retries = 0. These conclusions use independent
array comparisons, rather than relying on the harness's constant ownership fields.

Extraction was CACHED, generation FRESH. SHA-256 comparison proved all three
existing extracted PDF inputs exactly match their entries in the specified
materials corpus ZIPs. No parser, corpus, fixture, source or extraction changed.

## 4. Python live result

The unchanged `apps/api/scripts/b12-hybrid-acceptance.ts --phase generate --case
python-generators-hybrid` ran with the real production OpenAI provider. A private
fetch observer recorded request bodies and successful responses without headers
or credentials; it did not change requests, SDK retry policy or response content.

| Run | Coverage | Grounding | Issues / fabrications | Targets | Calls | Sections/request | Explanation retry requests | Fallback explanations | Wall |
| --- | ---: | ---: | --- | --- | ---: | --- | ---: | ---: | ---: |
| Original prompt, fresh successful provider | 1.00 | 0.94 | 0 / 0 | 99/99 | 6 | 6,3; 6,3; 6,2 | 4 | 8 | 16.231 s |
| First generic wording correction | 1.00 | 0.94 | 0 / 0 | 99/99 | 6 | 6,3; 6,2; 6,2 | 4 | 7 | 15.771 s |
| Final generic prompt | 1.00 | 0.94 | 0 / 0 | 99/99 | 4 | 6,3; 3; 2 | 2 | 2 | 10.383 s |

All assemble, and all have zero factual retries, provider/schema/transient retries,
provider-owned targets and provider-caused losses. Final automatic usefulness
checks PASS; provider/manual acceptance FAIL. Final planning 76 ms, deterministic
assembly 14 ms, provider wait 9,720 ms, instrumented validation 165 ms, final
assembly 9 ms. Initial explanation batches: 2. Final accepted provider prose:
7 of 9 standalone sections; two extractive fallbacks do not count as acceptance.

### Generic regression and smallest correction

The first successful-provider run exposed a **generic prompt-contract defect**:
the prompt prohibited restating evidence, encouraged concise explanation, and
did not disclose the frozen lexical source-vocabulary constraint. All nine
initial paraphrases failed grounding, including ordinary connective/synonym
tokens. Retrying the same underspecified contract was ineffective.

A synthetic archive/records regression (no benchmark titles/content) was added
before changing the prompt. It demonstrates that unsupported vocabulary is still
rejected, exact concise source prose passes grounding and usefulness, and neither
choice alters deterministic evidence. It also checks that the prompt permits
local source wording and states the lexical constraint. FRESH red: 26 passed / 1
failed. After the correction: 27/27. Private logs preserve both results.

Only the explanation prompt changed: permit short explanatory source sentences,
explicitly prohibit synonyms/extra transitions, retain local boundaries and all
quality restrictions, and keep required evidence engine-owned. No grounding or
usefulness rule, threshold, retry limit, provider or parser changed. The first
live correction's failure is retained above; the final prompt improves but does
not complete acceptance. No further prompt tuning or concurrency was attempted.

## 5. Python manual quality

Inspected actual assembled item explanations/key points and the harness's
student-visible text, not just metadata. No mobile UI acceptance is claimed.

| Risk area | Final inspection |
| --- | --- |
| ITERATORS | FAIL: source-list fallback duplicates a fact; captured two-sentence local explanations were rejected as sibling fusion. |
| GENERATORS | Provider prose is concise and locally supported; required key points still repeat source fragments/prefixes and include instructional framing. |
| Yield Command | PASS explanation: a complete local explanation; code is a separate evidence field. |
| Generator Expressions | FAIL provider acceptance: fallback duplicates the first fact; code/source examples are lengthy flattened key points. |
| The next() function | Accepted after one explanation retry; source wording is useful but retains first-person lecture framing. |
| Generator Functions | Concise accepted source explanation; code is separate from prose, but long code evidence remains difficult to scan. |
| Infinite Sequences | Concise accepted source explanation. |
| Sending objects to a Generator | Concise accepted source explanation. |

Title-only repetition and code-as-explanation were not observed in final provider
prose; no final unsupported outside knowledge was found. Fact readability, source
dumps, instructional leakage and fallback quality prevent overall PASS. Typed-only
nodes correctly have no invented prose; unsupported nodes remain hierarchy-only.

Classification: primary fixed issue = generic prompt-contract defect. Residual
local multi-sentence sibling-fusion rejections are grounding false-positive
candidates, not evidence of cross-section borrowing. Examples of benign lexical
paraphrases were also rejected by the frozen rule; the rule was left unchanged.
Automatic usefulness PASS does not establish manual usefulness: it misses the
poor evidence presentation in this run. This is not just provider randomness.

## 6. Statistics MinerU live result

Before provider: manifest/source-available/assemblable **232/232/232**;
source-unavailable and ambiguous/unowned **0**. After provider: **232 represented**,
exact evidence unchanged, **0 provider losses**.

Coverage **1.00**, grounding **0.84**, **2 unresolved grounding omissions**,
**0 fabrications**. Two initial batches **6,3**, **2 calls**, no retry of any kind.
Provider wait **17.380 s**, wall **26.266 s**. Assembly **FAIL**, withheld for
`STRUCTURAL_NOISE` in grouped Median; ungrouped/grouped Mean also have failed
source-list grounding. Thus all manifest targets being present is insufficient
under the unchanged source-list/assembly gates. No provider factual repair was
requested to resolve those failures.

Mean, weighted mean, median and mode explanations were inspected, along with
their formulas, result statements, tables and worked examples. Formula/results
and exact tables remain, including source-stated 39.67, median 79 and mode values;
no recalculation/correction of questionable source arithmetic was invented.
Grouped Median has 105 key points, repeatedly prefixes an approximately 850-character
mixed paragraph/formula/table label, and is unsuitable for scanning. Instructional
worked-example text remains in deterministic evidence. Candidate explanation-form
checks report no issues, but whole Reviewer usefulness/manual quality FAIL.
One otherwise provider-generated explanation is replaced by fallback because
overall section grounding fails; zero provider acceptance is inferred from it.

## 7. Statistics Docling live result

Manifest/source-available/assemblable **156/156/156**; unavailable/unowned **0**.
After provider: **156 represented**, **0 losses**, exact evidence unchanged.
Coverage **1.00**, grounding **0.80**, **4 unresolved grounding omissions**,
**0 fabrications**, assembly **FAIL**. Initial batches **6,5**, one explanation
retry batch of **2**, total **3 calls**, **0 factual retries**. Provider wait
**15.401 s**; wall **16.945 s**.

Mean, median, mode, formulas/results and example tables were inspected. Remaining
source-list omissions affect the overview, grouped Mean, and ungrouped/grouped
Mode. They are not manifest target losses. Median retains raw example/table
paragraphs up to 1,085 characters plus duplicated table rows; ungrouped Median
uses an instructional phrase. Four final explanations differ from the last
provider response because the fallback path reacts to failed overall grounding.
No final fabrication or unsupported outside knowledge was observed. Automatic
explanation-form checks PASS, but assembly/manual/usefulness acceptance FAIL.

## 8. Accounting live result

Before provider: **46 source-available and deterministically assemblable**,
**0 source-unavailable**, **0 ambiguous/unowned**. After: **46/46**, **0 losses**.
Coverage/grounding **1.00/1.00**, issues/fabrications **0/0**, assembly PASS,
automatic usefulness PASS, **no fallback**. One batch of **5**, **1 call**, zero
factual/explanation/provider/schema/transient retries; provider wait **5.550 s**,
wall **5.824 s**.

Explicitly verified the exact capital row
`15.9.17 | To Capital A/C | XXXX | | |`, its blank-cell structure, the matching
`15.9.17 | By Cash A/C | XX` side, ledger headers, and all remaining required
ledger rows against the source-owned targets. Spacing is retained in actual
output. Cash/service revenue/capital labels and trial-balance rows are present.

Manual FAIL: Cash starts with a command-like “Report when”; Ledger is a
subjectless definition; Hybrid is a sentence fragment; trial balance opens with
a list introduction and includes a 481-character table dump followed by repeated
rows. Required evidence is safe, but this is not yet a polished study reviewer.
These are generic usefulness false-PASS findings, not provider evidence loss.

## 9. Batch behavior

| Case | Standalone | Initial batches | Initial sections/batch | Failed initial explanations | Isolated retry batches |
| --- | ---: | ---: | --- | ---: | --- |
| Python / Docling | 9 | 2 | 6,3 | 3 | 3 sections, then 2 |
| Statistics / MinerU | 9 | 2 | 6,3 | 0 | 0 |
| Statistics / Docling | 11 | 2 | 6,5 | 2 | 2 sections |
| Accounting / MinerU | 5 | 1 | 5 | 0 | 0 |

“Failed explanations” excludes non-explanation source-list/assembly failures.
All 10 final-code targeted HTTP calls returned 200. Captured request section IDs
match response IDs; every prompt source-block reference belongs to its section;
output remains in plan/source order. No actual cross-section contamination or
sibling evidence borrowing was identified in final prose. Valid explanations
are excluded from later retry batches. Final response order happened to match
request order; response-order independence and missing/partial batch isolation
are FRESH focused-test results, not adversarial live observations.

## 10. Retry behavior

| Case | Factual | Explanation grounding retry requests | Explanation usefulness retry requests | Provider/schema | Transient/rate-limit | Retried section attempts |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | 0 | 2 | 0 | 0 | 0 | 5 |
| Statistics / MinerU | 0 | 0 | 0 | 0 | 0 | 0 |
| Statistics / Docling | 0 | 1 | 0 | 0 | 0 | 2 |
| Accounting / MinerU | 0 | 0 | 0 | 0 | 0 | 0 |

Python retries: first ITERATORS / Generator Expressions / next(); then ITERATORS /
Generator Expressions. Reasons: lexical fabrication flags and local sibling-fusion
flags. Docling retries: ungrouped Median and Mode, both lexical explanation flags.
Every original/intermediate Python retry was likewise grounding-related (four
requests each; 17/16 section attempts). No schema rejection or SDK HTTP retry was
observed across any attempt. Production `providerRetryCount` counts explanation
retry requests too; it is not a separate provider/schema error count.

## 11. Runtime

All times below are already-extracted generation, in seconds. Total uses the
outer harness wall-clock rather than the pre-assembly failure metric.

| Case | Planning | Deterministic | Provider wait | Instrumented validation | Assembly | Total | Provider % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | .076 | .014 | 9.720 | .165 | .009 | 10.383 | 93.6% |
| Statistics / MinerU | .171 | .355 | 17.380 | 3.937 | 0* | 26.266 | 66.2% |
| Statistics / Docling | .126 | .038 | 15.401 | .454 | 0* | 16.945 | 90.9% |
| Accounting / MinerU | .048 | .004 | 5.550 | .136 | .008 | 5.824 | 95.3% |

`0*` means no successful final assembly measurement, not a free failed assembly.
Instrumentation excludes validation inside retry/fallback report refreshes; its
columns are not an exhaustive timing partition. Unclassified non-provider time
is .399/4.423/.926/.078 s respectively. Total non-provider time is
.663/8.886/1.544/.274 s. MinerU's engine validation/reporting cost is material;
do not attribute all its latency to OpenAI. No runtime instrumentation was altered.

- Mainly OpenAI wait? Yes, 66.2–95.3%, with substantial additional MinerU work.
- Avoidable serial requests? Failed explanation retries remain; successful sibling
  sections are not regenerated. Initial batches are sequential by existing design.
- Roughly 10–20 s? Python/Docling Statistics do; Accounting is faster; MinerU is
  26.3 s, within the larger-material band. These are four observations, not a p95.
- Any measured normal case >30 s or >60 s? No. This does not prove future bounds.
- Old 20–30-call behavior? No: final case requests are 4/2/3/1. No speculative
  concurrency, batching-cap, deterministic optimization or quality reduction.

## 12. B15 → B16 comparison

| Case | B15 calls | New calls | Call reduction | Old factual retries | New factual retries | Duration |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | 25 | 4 | 84.0% | 16 | 0 | 10.383 s |
| Statistics / MinerU | 27 | 2 | 92.6% | 18 | 0 | 26.266 s |
| Statistics / Docling | 33 | 3 | 90.9% | 22 | 0 | 16.945 s |
| Accounting / MinerU | 14 | 1 | 92.9% | 9 | 0 | 5.824 s |

B15 is historical; B16 values are fresh final-code targeted observations. Failed
or fallback cases remain failures despite these call reductions. The readiness
request and two earlier Python diagnostic runs are excluded from this comparison.

## 13. Full unchanged B12 rerun

**NOT RUN — all four targeted cases did not pass.** Statistics assembly and manual
quality failed; Python includes fallbacks; Accounting manual quality failed.
Frozen contract, corpus, parser default, fixtures, required evidence, grounding,
fabrication, coverage and usefulness rules remain unchanged. No threshold bypass
or benchmark-specific rule was introduced to force eligibility.

## 14. Manual Reviewer quality

| Case | Explanation quality | Fact / typed-evidence readability | Instructional leakage / source dumps | Outside knowledge | Study usefulness |
| --- | --- | --- | --- | --- | --- |
| Python | Partial; 2 fallback explanations | Complete but repetitive/flattened code | Source fragments and lecture framing remain | None observed in final output | FAIL |
| Statistics MinerU | Generally concise; 1 fallback replacement | Severe repeated labels and Median dump | Present in deterministic evidence | None observed in final candidate | FAIL; withheld |
| Statistics Docling | Uneven; 4 fallback replacements | Oversized Median/table blocks | Instructional Median and source dumps | None observed in final candidate | FAIL; withheld |
| Accounting | Fragmentary/command-like despite no fallback | Required rows intact; raw duplicated tables | Present | None observed | FAIL |

Statistics has no final published Reviewer: inspection is of its rejected
candidate, not a claim that withheld content was student-visible. Python and
Accounting inspection uses actual assembled payloads/text; device rendering is
NOT RUN. Automatic usefulness PASS is explicitly distinguished from manual FAIL.

## 15. Simplicity gate

Production manifest-backed flow still has five steps: Plan → assemble evidence
deterministically → generate batched explanations → validate explanations →
assemble Reviewer. No hidden provider factual regeneration, no factual provider
retries, no full-section provider regeneration. Deterministic rebuilding of a
retried section's evidence does occur but cannot transfer ownership to the model.
The old completion-repair branch is compatibility-only for no-manifest plans;
current production plans use manifests. No architecture redesign was made.

Remaining exceptions: bounded explanation retries (measured above), fallback
replacement after whole-section grounding fails, and repeated local report
validation. These are explicitly recorded rather than described as an ideal
zero-retry path. No routine 20+ provider calls. The decision to stop architecture
work and return to product integration is NOT earned by these failed gates.

## 16. Verification

| Check | Result | Fresh/cache detail |
| --- | --- | --- |
| Readiness | PASS | FRESH, one request / zero retries |
| Pre-live engine typecheck/build/eval | PASS | FRESH, 475/475; architecture 26/26 |
| Pre-live API tests | PASS | FRESH, 607/607, 69 files |
| Generic regression before prompt fix | Expected FAIL | FRESH, 26 passed / 1 failed |
| Focused regression after each correction | PASS | FRESH, 27/27 |
| Final engine typecheck/build/eval | PASS | FRESH, 476/476; architecture 27/27 |
| Final API tests | PASS | FRESH, 607/607, 69 files |
| Root typecheck | PASS | 7 tasks: engine/API/mobile FRESH, four dependencies CACHED |
| Root lint | PASS | Same 3 FRESH / 4 CACHED; four pre-existing mobile import warnings |
| Root build | PASS | Same 3 FRESH / 4 CACHED |
| Corpus source identity | PASS | FRESH ZIP-entry/PDF SHA-256 equality, all three sources |
| Target preflight and before/after identity | PASS | FRESH, all four cases |
| Provider/batch capture replay | PASS as observation | FRESH offline replay of captured live responses, no paid calls |
| Full B12 | NOT RUN | Failed targeted prerequisites |
| `git diff --check` / `git fsck --full` | PASS | FRESH; same two known dangling blobs |

Private helper first attempts had a PowerShell brace/glob parsing error and an
incorrect relative import. They were corrected; no implementation or acceptance
result is based on those failed helpers. The post-test build regenerated
`apps/api/next-env.d.ts`; this task-created drift was inspected and restored.

## 17. Files created/changed

- Validation evidence: continued this report; updated `docs/current-state.md`,
  `docs/roadmap.md`, `docs/ai/current_sprint.md`; appended `docs/ai/handoff.md`.
- Generic implementation fix: `packages/engine/src/stage3-generate.ts` explanation
  prompt only; synthetic regression in
  `packages/engine/evals/reviewer-deterministic-evidence.eval.ts`.
- Ignored/private artifacts: `.local/b16-1/` readiness history, preflights,
  successful provider captures, per-case outputs, replay/audit and test logs.
  They are not staged. Cached extracted documents remain private and unchanged.
- Pre-existing untouched: `docs/ai/acceptance/b8/`, historical B12/B13/B14/B15
  reports and original B16 architecture report, corpus, extraction providers,
  fixtures, environment files and credentials.

## 18. Git result

Implementation commit: `4873ce3e5c74f32a9f7239cfdb82dcc4bd96b091` —
`fix(engine): align explanation prompts with frozen source wording`.
Final HEAD is the following documentation commit containing this report,
`docs(ai): complete B16 live provider and runtime validation`; its exact hash is
reported in the task response. This records completed validation work with a
FAIL outcome, not acceptance. Final tree: only pre-existing untracked
`docs/ai/acceptance/b8/`; branch distance: 16 ahead / 0 behind local `origin/main`.
Historical reports preserved: yes. Parser default changed: no (`legacy`).
Secrets/private captures committed: no. Pushed: no.

## 19. Verdict

FAIL — working-provider validation exposed a generic Reviewer architecture or explanation-quality defect

Single next task: reconcile the generic explanation/evidence presentation
contract with the existing validation rules using these captured failures,
while preserving deterministic ownership and frozen gates. The evidence does
not justify a benchmark-specific B17 or a claim that Reviewer acceptance is done.


## B17 continuation — 2026-09-07

B16.1 remains historically FAIL. The local generic presentation repair and fresh
validation are recorded in [B17](../b17/reviewer-explanation-evidence-presentation.md).
B17 also fails manual acceptance; all frozen target counts and the production
model remain unchanged. No historical result above has been rewritten.
