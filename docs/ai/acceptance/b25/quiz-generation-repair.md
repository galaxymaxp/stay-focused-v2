# B25.3 Quiz generation repair — production acceptance incomplete

Date: 2026-09-14. Branch `main`, starting HEAD `bb6313b564c4d717c08025619e3848e19244545a`. Existing dirty work was preserved. The scoped repair is commit `04ddf26`. It was validated, deployed to the existing production project, and exercised from the authenticated physical Android application. No push or migration was performed.

## Failure reproduction and classification

The two previous authenticated physical attempts both selected one ready Canvas material, requested five mixed-difficulty questions, and enabled only `single_select` and `true_false`. Both reached `generating_sections` and ended non-retryably as `quiz_generation_failed`. Read-only server checkpoint inspection printed only shape/count metadata, never titles or source text:

| Failed job | Planned regions | Allocation | Accepted after three bounded rounds |
|---|---:|---|---|
| First | 1 region, 490 characters | All five slots from the same coarse region, including one hard true/false slot | 0/5 |
| Second | 2 regions, 42 and 1,243 characters | `q1`, `q3`, `q5` were single-select from the 42-character region; `q2`, `q4` were true/false from the longer region | `q2`, `q4` only |

The previously deployed code persisted only accepted questions, not rejected candidate JSON or independent verifier verdicts. Thus the exact rejected provider output and per-option verdicts for those historical attempts are **not recoverable**. The accepted counts and allocations demonstrate a planning/coverage mismatch; they do not prove that every historical rejected candidate failed the same sub-check. A deterministic synthetic replay of the old one-region plan reproduces repeated-evidence/set rejection and bounded exhaustion. A second synthetic replay reproduces the observed `q2`/`q4`-only checkpoint with unsupported single-select evidence. Neither synthetic case contains academic source text from the device.

## Root cause and repair

The old `makeQuizPlan` used total character count as its capacity check, then round-robin assigned multiple slots to a region—even a 42-character one. Generation was asked for distinct source-grounded concepts and source-refuted distractors; the unchanged semantic and duplicate gates correctly withheld weak or repeated questions. The planner could therefore create a five-slot plan that the selected regions could not support. Its fixed mixed sequence also imposed a hard slot on every five-question set even though the accepted mixed contract permits easy/medium variety.

The planner now splits coarse prepared regions at original line/sentence boundaries, keeps each resulting unit as an exact substring of prepared source text, deduplicates units before selecting them, prefers substantive units when at least five exist, and allocates one unique unit per question. If fewer than the requested number of units exist, it returns the existing safe `quiz_source_unavailable` outcome before any provider call. Segmentation is a conservative *structural* support test, not a claim that each unit is academically sufficient: independent answer, evidence, distractor, difficulty and set verification still decide acceptance. Mixed authoring starts with easy/medium slots and uses actual verifier-assessed difficulty; explicit easy/medium/hard requests remain strict. Accepted questions remain immutable; only rejected slots are sent through up to two targeted repair passes.

Private checkpoints are versioned `quiz:plan:v2` and `quiz:accepted:v2`, so a resumed workflow does not combine the new allocation with an old candidate set. Server-only diagnostics now classify provider, structured-output, candidate/evidence, semantic, set/duplicate and repair-exhaustion failures by job ID, round, question ID, count and symbolic finding. Planning and persistence stages also emit server-only outcomes. Student-facing messages and Queue failure behavior are unchanged. Logs do not include source text, prompts, options, answer keys, or verifier reasoning.

**No validation rule was weakened, disabled, converted to a warning, or bypassed.** Exact evidence, answer cardinality, independent key/option analysis, ambiguity, distractor falsity/plausibility, no answer leakage, duplicate detection, source-only correctness, and deterministic scoring remain required.

## Final post-change verification

Fresh validation after the final source/test change passed:

| Gate | Result |
|---|---|
| API | 920 passed, 4 skipped; 82 files |
| Mobile | 477 passed; 39 files |
| Canvas | 73 passed |
| Engine | 606 passed |
| OCR | 27 passed |
| Shared | 44 passed |
| Workflow runtime | 1 passed |
| Provider contract | 18 passed |
| Forced root typecheck | 7/7 workspaces, zero cached |
| Forced root lint | 7/7 workspaces, zero cached |
| Forced root build | 7/7 workspaces, zero cached; 23 steps and 2 workflows |
| Diff hygiene | `git diff --check` passed |

The API suite's fourth skip is the new opt-in live Quiz test. The focused Quiz/processing suite passed 147 tests with 2 opt-in tests skipped before the full run. Regression coverage includes historical planner shapes, bounded repair, evidence and semantic validation, duplicates, deterministic scoring, persistence, and owner isolation. Reviewer and Activity Maker automated paths remained green through the full API/Mobile/Workflow validation.

## Bounded live provider validation

The pinned Quiz model remained `gpt-5.4-2026-03-05`; production model configuration was not changed. One new provider generation attempt used synthetic, subject-neutral security facts through the real server provider, repaired planner, generator, and full validation gate. It produced and accepted all five requested questions and passed in 52.87 seconds. The second allowed attempt was not used. No prompt, generated answer, answer key, or private course text was recorded.

## Deployment

The scoped commit was deployed from a clean detached worktree to the existing `stay-focused-v2-prototype` project. Initial production deployment `dpl_HgTY75iCsj9BZxN93UztF9ZLvkpZ` reached `READY` and the production alias returned health `{ status: "ok", version: "2.0.0" }`. During the physical flow, a second accepted request remained a `database_worker` row with no workflow run. The related production execution setting was restored to the repository's established `vercel_workflow` backend and the same validated commit was redeployed as `dpl_6PnfPKwDZPyrCSq8NSN2Hfv8xV5c`. It also reached `READY` and owns `https://stay-focused-v2-prototype.vercel.app`. The accidentally queued second request was cancelled before any processing/provider attempt.

## Production and physical-device result

The physical target was available as an authorized ADB `device`: realme RMX3151, Android 13. Expo Go used the production API. A real Canvas lecture PDF was prepared successfully, then one authenticated five-question, mixed-difficulty Quiz was submitted. Generation rendered the responsive orb, stated that the screen could be left, and continued after navigation to Today. Queue restored the server job without cancellation.

That production workflow did **not** complete a Quiz. It reached `generating_sections`, invoked the repaired generator, and failed non-retryably after the bounded third round. Server-only diagnostics identified the terminal class as `repair_exhausted`, with three accepted and two pending questions. The last rejected questions failed `academicValue`; one also failed `difficulty_mismatch`. Earlier rounds additionally reported `option_analysis_invalid`, `distractorsWrong`, `distinctConcept`, `noLeakage`, `explanationGrounded`, and one `answer_key_mismatch`. The strict validator remained active; no output was force-accepted.

Per the stop rule, no further provider generation was attempted. Therefore no production Quiz artifact reached Library, and learner-view answer secrecy, answer selection, submit, deterministic production score, result persistence, and reopen could not be physically accepted. Today, Generate, and Queue rendered normally during the device flow; previously accepted Reviewer, Activity Maker, Tasks, Library, and trusted owner-scoped reads remain covered by the fresh automated regression suites, but were not subjected to another live provider call.

No private academic source text, provider output, answer key, user/course/material identifier, token, or device serial is included here. Temporary screenshots and status helpers were not retained. B26 was not started.

## Remaining limitation and verdict

The structural planner defect is repaired and synthetic live validation succeeds, but the real production author/verifier combination still cannot reliably satisfy the unchanged academic-value/difficulty gate within its bounded repair rounds. A follow-up must diagnose that semantic convergence problem using a new explicitly authorized provider attempt before B25 can close.

**PARTIAL — Quiz repair improved but acceptance remains incomplete.**
