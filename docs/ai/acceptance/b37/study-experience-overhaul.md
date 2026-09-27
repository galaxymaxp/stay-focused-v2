# B37 study experience overhaul - 2026-09-27

Status: **PARTIAL - 100-item production Quiz stopped at batch 3**. The owner-approved per-batch budget, repair identity, format and exact-wording changes are live; 30-item Mixed (via Retry) and 30-item Multiple Choice production Quizzes pass. The 100-item Mixed smoke failed on duplicate questions in batch 3 and was stopped for owner review as instructed. No EAS cloud build has been triggered.

## Implemented locally

- Quiz: MCQ, identification, true/false, modified true/false and matching contracts; source-only topic selection; direct wording rejection; 5-100 count; checkpointed batches of at most 20; duplicate and format-balance gates; owner-scoped free-text scoring; learner-safe question projection.
- Reviewer: tap one key point, hold a group, deterministic visible-substring keyword emphasis, large Generate Quiz action, count/topic/format sheet. Existing Study Assist generation and unseen/seen persistence remain in use.
- Practice: opens/resumes automatically, renders one question at a time, has a progress line and correction input, and provides visual/sound/haptic answer and completion feedback with saved settings.
- Queue and Library: hide completed Queue entries locally without deleting generated work; remove an owned Quiz and attempts; Remake Reviewer from its one original Canvas material; show the latest Reviewer card for that material while older artifacts remain addressable by existing Quizzes.
- Today and visual system: time-based greeting, timeline with due/current/completed hierarchy, neutral app chrome with retained semantic and course colors, dynamic orb spill and reduced-motion fallback.

## Live finding and acceptance gates

- Production Quiz job `e73988aa-df73-4b2d-a9f1-f7d9566feca1` had no start, attempt, checkpoint, result or Quiz. Its persisted backend was `vercel_workflow` with run `wrun_01M3G8VHHZPS8GH0HD8FQ227GG`. Newer Quiz jobs succeeded on `google_cloud`, so this was a stranded pre-cutover run rather than evidence that new jobs embed an old API URL. After explicit owner authorization, a locked, conditional call to the existing cancellation RPC changed only that job to `cancelled`. A final read confirmed zero attempts, null result and one cancellation event.
- An early Expo cloud-build attempt was rejected by automatic approval review before submission because it uploads source/configuration externally. The B37 follow-up explicitly permits one final EAS build only after all gates pass. Zero EAS builds have been triggered.
- The connected realme runs an isolated local Android debug build. The owner signed in on the device. Reviewer selection, key-point keyword emphasis, the large Generate Quiz action, topic Select All/Clear All, count and format presets, direct Practice start/resume, correct-answer visual feedback, Today, light/dark mode, and Library swipe reveal were exercised. The owner confirmed the correct chime and haptic pulse. Sounds and Haptics were turned Off for a wrong answer; owner confirmation of physical silence is pending.
- Queue UI exposed a section-order bug: the Completed heading appeared before failed/cancelled cards. The heading was moved below Needs attention and the realme then showed the sections correctly. Clear removed failed/cancelled entries locally; Clear Completed hid succeeded entries locally while saved Library work remains server-backed.
- After explicit owner authorization, the forward migration was applied to Supabase as version `20260927140343` and the local filename was aligned. Four Quiz/key/attempt constraints were verified at 100 items. The matching Vercel production API deployment `dpl_47RqgoYLpra5v5cefPmAzy8xD3tW` reached READY and the aliased `/api/health` returned HTTP 200, version 2.0.0.
- A realme request for a 10-question Mixed Quiz from four selected VPN Reviewer topics created Google Cloud job `d0a80911-402c-4006-8622-6a6bc0685980` but failed at `preparing_source` with `invalid_request`, attempt 1, no result. The active worker is still `generation-worker-00003-s2b` on pre-B37 code; that code rejects `selectedTopicIds` and limits `questionCount` to 20. The B37 worker source is staged locally with no environment or credential file. Worker rollout authorization is pending. Do not spend the final EAS build until live generation passes.

## Worker rollout and production smoke (2026-09-27, 15:20-16:05 UTC)

Owner authorized the worker rollout. Before deploying, the migration and API were re-verified live (not re-applied): Supabase version `20260927140343` with the four 100-item constraints in place, and Vercel production `dpl_47RqgoYLpra5v5cefPmAzy8xD3tW` READY. The migration only replaces four CHECK constraints with wider ones and three functions; it has no table/column drop, delete, truncate or data rewrite.

| Revision | Image (Cloud Build) | Source |
| --- | --- | --- |
| `generation-worker-00004-nb4` | `sha256:2f9f8d10…` (`3b916411`) | HEAD `e2fb414` staged source (byte-identical, no env/credential files) |
| `generation-worker-00005-grd` | `sha256:e37096df…` (`b9f7ea06`) | `552540d` alias-grounding fix |
| `generation-worker-00006-75b` | `sha256:3be39aa7…` (`6f7b22f3`) | `5a857ad` matching-key fix, **serving 100%** |

Each revision kept the runtime service account, 1 CPU/2 GiB, concurrency 1, 0-2 instances, 1800 s timeout and secret references; `generation-invoker` stays the only `run.invoker`; anonymous `/health` returned 403. The old worker parser capped `questionCount` at 20 and rejected the `selectedTopicIds` key; the new one accepts 5-100 and up to 100 unique topic IDs, and older request shapes remain valid (single batch, same `complete` checkpoint).

Realme smoke requests used the coinstalled `b37debug` app with Metro pinned to the production API alias, VPN Reviewer `4072b0a0-…`, 30 questions, topics `section-6`…`section-10`:

| Job | Revision | Formats | Outcome and cause |
| --- | --- | --- | --- |
| `004989d0` | 00004 | Mixed | Reached `generating_sections` (no `invalid_request`). Both calls failed only on q1: extra alias "SSL VPN" absent from the cited section. Fixed in `552540d`: ungrounded aliases are dropped; the canonical answer must still be in the source. |
| `a8c0863c` | 00005 | Mixed | Matching items sharing the stem "Match the VPN application to its description." were flagged `duplicate_question`. Fixed in `5a857ad`: matching items are keyed by `leftItem`. |
| `4c2932a9` | 00006 | Mixed | Two modified true/false corrections were paraphrases ("after", "through the provider's servers") not present in the source. Correctly rejected; not relaxed. |
| `34a05573` | 00006 | Multiple Choice | Batch 1 (20 items) passed and was checkpointed. Batch 2 returned matching/true-false/identification items: its "balance the remaining formats" instruction overrides a single-format request. No repair ran because the job's two-call budget was spent. |

Open design blockers (not changed in production):

1. `durableGenerationProvider` limits each job to two `quiz_set` calls (`ai-first:calls:quiz_set`). B37 batching needs up to five batches plus repairs, so 50/100-item Quizzes cannot complete and 30 only completes if both batches pass first time.
2. The provider response cache key hashes model, schema and prompt, so duplicate/mix retries within a batch replay the same saved response instead of trying again.
3. The batch-continuation prompt asks to balance formats even when one format was requested.
4. Modified true/false and identification corrections need an explicit "copy the correction verbatim from the source" instruction, since the validator correctly requires source-grounded answers.

Other findings: the Quiz sheet says "Next you'll review the request. Nothing is generated until you confirm." but Continue submits immediately. Failed Quiz jobs offer no Retry in the app. After a warm resume the debug app's surface stopped repainting (clock frozen, taps unreflected); a force-stop and relaunch cleared it. `database.test.ts` still referenced the pre-rename migration file and failed at HEAD; fixed in `552540d`. Library reviewer counts collapsed from 10 to 5 once reconciliation finished, and the Today timeline rendered, on the realme.

## Approved batching rework and production smoke (2026-09-27, 16:40-17:25 UTC)

Owner approved a bounded per-batch budget. Commits `faf5a80`, `3886a2d`, `29e9d1f` (API/worker), `c387d7a`, `8b78451` (mobile).

- Budget: `min(10, ceil(n/20) * 2)` `quiz_set` calls per job. Each 20-item batch makes one call; only if items fail does one repair run, and it asks only for replacements of the rejected or missing slots. No retry loops remain.
- Saved-response identity: each call carries `quiz:batch:<offset>:initial|repair`, so a repair cannot resolve to the failed call's saved output; redelivery of the same call still reuses it (`ai_generation.saved_response_reused` is logged).
- Single-format requests state one allowed type in every batch; only Mixed rebalances (surplus items of a dominating format are repaired). Earlier stems, used matching terms and repair notes travel in the prompt so instructions stay under 8 KB.
- Contract now requires identification answers and modified true/false corrections copied exactly from the cited source. Validation was not relaxed.
- Failed `quiz_generation_failed` jobs are user-retryable; the retry route returns a live or succeeded retry instead of creating another job; the generation view and failed screen offer Retry.
- Tests: batching (30/50/100, first-attempt, one-repair, failure after repair, hard cap, fresh repair identity, all five single formats, off-format repair, Mixed rebalance, reused matching term), exact modified true/false and identification wording, retry route guard, retryable generation view. API 99 files, 1026 tests (3 opt-in skipped); provider contract 20/20; mobile 65 files, 653 tests.

| Production smoke | Job | Result |
| --- | --- | --- |
| 30 Mixed, topics 6-10 (first try, worker `00007-xzx`) | `c5c83f17` | Failed: batch 2 initial and repair both reused matching term "IPSec" (3 calls). Prompt fix `3886a2d`, worker `00008-8q5`. |
| 30 Mixed, same request via app Retry | `4cdd8af2` (`retry_of` `c5c83f17`) | **PASS**: 2 batches, 2 calls (budget 4), 30 unique items, 8 MC / 6 identification / 6 T/F / 4 modified T/F / 6 matching, one Quiz, reopened in Library. A second Retry on the original returned this job; no duplicate. |
| 30 Multiple Choice, topics 6-10 | `76bd34cf` | **PASS**: batch 2 repaired one duplicate with a fresh response; 3 calls, 3 distinct saved responses, 30/30 `single_select`, 30 unique. |
| 100 Mixed, topics 2-10 | `c1f1e32c` | **FAILED, stopped for review**. See below. |

100-item stop report: batch **3 of 5** (offset 40); provider calls **5 of 10** (batch 1: 1, batch 2: 2, batch 3: 2); validation category **`duplicate_question`**; first call rejected q1, q6, q11, q19 (matching terms already used: Site-to-Site VPN, IPSec, Cisco AnyConnect, OpenVPN) and q5 (modified T/F repeating an earlier question); **repair ran** and fixed four, but r2 reproduced the rejected q5 verbatim. All five responses were **fresh** (distinct call identities, no saved-response reuse). Batches 1-2 remain checkpointed; the job is failed and retryable. No further architectural change was made.

Reviewer fixes verified on the realme: a key point with a saved explanation shows a muted marker and a tap opens its result. Sheets now close by dragging down (handle, header or content that fits) and by swiping up when content fits; small or horizontal drags and taps are unchanged. Study Assist uses low reasoning effort but still took about 20 s on device: each request loads every Reviewer version (about 1.5 MB for this owner) twice from Supabase `ap-northeast-1` to Vercel `iad1` before the model call.

## Verification ledger

| Gate | Result |
| --- | --- |
| API typecheck | FRESH PASS |
| Mobile typecheck | FRESH PASS |
| API tests | FRESH PASS after `29e9d1f`: 99 files, 1026 tests (3 opt-in skipped); provider contract 20/20 |
| Mobile tests | FRESH PASS after `8b78451`: 65 files, 653 tests |
| API lint | FRESH PASS, 0 errors |
| Mobile lint | FRESH PASS: 0 errors, four existing test-import warnings |
| API build | FRESH PASS outside sandbox after alias read denial inside sandbox |
| Mobile export | FRESH PASS (web, Android and iOS JS bundles) |
| Android native debug build | FRESH PASS after local Windows NDK C++ runtime diagnostic; installed alongside the release app |
| Supabase migration | FRESH PASS, version `20260927140343`, constraints verified |
| Vercel API | FRESH PASS, `dpl_4m9zHz7epmr7qHtG427gJgZgBMQi` READY and aliased, health 200 |
| Google Cloud worker | FRESH PASS rollout: `generation-worker-00008-8q5` (`3886a2d`) serving 100%, private, config unchanged |
| Production Quiz smoke | PARTIAL: 30 Mixed (Retry) and 30 Multiple Choice pass; 100 Mixed failed at batch 3 on duplicates and was stopped |
| Authenticated realme flows | PARTIAL: Reviewer, Practice, Queue, Library, Today, themes pass observed checks; new-format Quiz practice blocked on generation |
| EAS cloud build | NOT RUN (0 of 1 allowed) |

Next: owner decision on 100-item uniqueness (for example concept planning before batches, repair that rejects verbatim repeats of rejected items, or a source-size guard for large counts); scoped Study Assist reads or a Vercel function region near Supabase; then finish the five-format practice, Queue, Library, theme and orb matrix. Use the single EAS preview build only after every prebuild gate passes.
