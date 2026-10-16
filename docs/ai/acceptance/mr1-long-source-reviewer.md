# MR1 long-source reviewer recovery (2026-10-16)

Scope: MR1 only, starting from `ed67445` on
`overnight/2026-10-15_feedback`. STEP 0-2, local gates, reconciled docs and local
commits; no subsequent roadmap item is included. Rollout and Device checks are
owner steps. No environment file, remote service, SQL, Scheduler, deployment or
push is authorized. Owner untracked `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` remain untouched.

**PASS: STEP 0-2, fresh serial local gates, docs and scoped commits.**

## STEP 0 evidence

Baseline branch matched; GA1b status line 1 was PASS; HEAD was `ed67445`, tracked
tree was clean, and HEAD...`github/main` was 0/0 using local refs (no fetch).
Author is `galaxymaxp <omgraythekid@gmail.com>`.

These baseline references describe the pre-change implementation at `ed67445`:

| Requirement | Evidence / finding |
| --- | --- |
| Reviewer schema and caller | `packages/engine/src/ai-first-reviewer.ts:24` defines `reviewer_document`; `:102` runs the AI-first reviewer and `:116` calls `generateContract`. |
| Original output allowance | `packages/engine/src/generation-context.ts:71`: every contract request gets exactly **12,000 output tokens**, independent of source length. The 26,325-character source therefore receives 12,000, including JSON, prose, source references, emphasis and reasoning. |
| Input admission | `apps/api/src/lib/reviewer-generation-limits.ts:1` allows 100,000 characters; the 26,325-character material is below it. `generation-context.ts:23` admits complete blocks into 80,000-byte request groups. Exact normalized byte size of the owner's private material is unavailable locally. |
| Other candidate causes | Reviewer schema permits 100 sections, 30 key points per section and 100 references per section. These are unchanged. A provider **incomplete** result is rejected before JSON/schema validation, so the supplied incomplete checkpoint is not evidence of a local section/key-point contract rejection. |
| Provider incomplete boundary | `apps/api/src/providers/openai-provider.ts:155` forwards the budget. `:186-192` reads status and preserves `max_output_tokens` or `content_filter` in the safe exception, before parsing output. |
| Incomplete checkpoint | `apps/api/src/lib/processing-jobs/ai-generation.ts:29` hashes the Google request; `:72` stores `{state:'failed',kind:'incomplete'}` without the reason. `:74` throws safe `generation_failed` (503). On redelivery, `:38-39` throws `GenerationContractError(['provider_output_incomplete'])` without another provider transfer. |
| Terminal mapping | `apps/api/src/lib/processing-jobs/ai-reviewer.ts:28-36` translates contract failure to 422 `generation_failed`; `operations.ts:829-833` records `retryable:false,automaticRetryable:false`. This explains two job attempts but one reserved provider call. |
| Google worker | `apps/api/src/lib/processing-jobs/google-cloud.ts:144` executes a delivery; `:175` runs Google operations; `:205` calls the common reviewer step, then `operations.ts:810` / `ai-reviewer.ts:20` reach the shared engine. No separate manual engine. |
| Manual and Canvas creation | Own text enters `apps/api/app/api/jobs/route.ts:375` / `:455`, then `creation.ts:212` creates the reviewer job. Canvas `experience/generation.ts:92` / `:148` uses the same creation service; deferred Canvas creation `creation.ts:338` also delegates to it. |

The code proves the fixed budget and terminal-incomplete failure mechanism. It
cannot prove that every possible reviewer of a 26k-character source exceeds
12,000 tokens. A comprehensive response plus JSON, emphasis and reasoning can
exhaust that allowance; the supplied checkpoint proves that this response was
incomplete, but **does not retain its reason**. Output exhaustion is the working
inference, not a recovered production fact. The original reason and exact token
usage remain **UNVERIFIED (owner to confirm)**. No content is dropped to fit.
[Official Responses reasoning documentation](https://developers.openai.com/api/docs/guides/reasoning)
confirms the output allowance includes reasoning and visible output.

## Implementation / acceptance matrix

| Requirement | Owning layer and fresh proof | Result |
| --- | --- | --- |
| Bounded source-sized budget | Engine budget = clamp(ceil(characters * 0.75) + 4,000, 12,000, 24,000); 26,325 -> **23,744**; short <=10,666 ->12,000; >=26,667 ->24,000. Contract repair allowance shrinks to keep source + trusted instructions/schema + correction + output inside the conservative 128k request budget. | PASS |
| Whole blocks in order | Target 8,000 source characters per part; prefer heading/page boundaries after 4,000; serialized part context <=80,000 bytes. An oversized indivisible block stays intact; existing >80k block refusal remains. Sources already spanning context windows split directly without lossy condensation. Existing eight-context-group source cap remains. | PASS |
| Incomplete -> ordered recovery | Real engine + durable adapter, synthetic exactly 26,325 characters: one truncation + four complete parts; all 12 blocks retained in order; globally reassigned section/item IDs unique; identical trusted instructions throughout. | PASS |
| Collect, retry once, quarantine | One middle part fails twice: earlier and later parts retained; `metadata.generationStatus:'partial'`, typed failure part IDs/source IDs/attempt count, failed coverage and explicit missing-block issues. All failed -> no empty success. Missing/foreign references cannot become successful parts. | PASS |
| Short source | Exactly one transfer; saved success reused without another reservation. | PASS |
| Resume and cost accounting | Stable per-part/attempt identity, persisted pending/completed/definite-failed receipts, original initial-call key retained; counted before each transfer. Job cap **2 + 2 * planned parts**; 26,325 fixture has cap10, consumes5 (or6 with failed part). SDK retries disabled in durable adapter so hidden HTTP retries cannot evade reservations. All durable reviewer backends retain receipts. | PASS |
| Crash mid-split | Simulated crash between completed part1 and next part; redelivery on Google / Vercel Workflow / database worker reuses completed receipts. Existing pending/unknown outcomes remain fenced, with completed parts retained in storage. | PASS |
| Content filter unchanged | Adapter and engine tests show content-filter incompleteness remains terminal, with no split or repeat transfer; legacy unknown-reason checkpoints fail safely without inferring truncation. | PASS |
| Cancellation / result persistence | Cancellation stops between parts and before cached reuse. Fencing, budget, unknown-transfer and persistence failures propagate; they never become partial successes. Complete-job checkpoint is persisted before return. Cost metric reads durable reservation total rather than charging cache replays. | PASS |
| Owner-visible gap | Experience projection emits a fixed, safe partial notice on both website/mobile readers, retaining all successful blocks and exposing neither private block IDs nor provider errors. | PASS |
| Regression invariants | Existing strict typing, source references/emphasis, auth, ownership, RLS, cancellation, idempotency, saved-first screens, course batches, sharing and other surfaces run through fresh suites below. No migration or provider/model change. | PASS |

Focused checks: API **82/82**, then **123/123**, then **14/14**; engine unit
**19/19 in 3 files** before the final gates. Counts overlap and are not summed.
The first standalone engine-unit launch failed before collecting tests because
the temporary config imported a nonexistent physical `vitest/config` path;
using the package export fixed it. First draft `python` edit command failed
because Python is unavailable, before writing files; equivalent Node editing
succeeded. The first additional `npm run provider:contract --workspace @stay-focused/api` gate failed before assertions: a new runtime import of the engine barrel made standalone Node resolution hit extensionless engine imports (`ERR_MODULE_NOT_FOUND`, zero contract checks run). Removing the provider runtime dependency and recognizing its safe incomplete error inside the engine repaired the same gate to **20 passed / 0 failed**. No failed assertion or nondeterministic flake was observed. The final fresh serial run repeats the suites after this repair.

## Final fresh serial gates

| Command | Result | Local evidence under tmp/overnight/ (uncommitted) |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached | MR1-final-typecheck-final.log |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings (5 mobile, 1 web) | MR1-final-lint-final.log |
| npm run test --workspace @stay-focused/api | FRESH PASS, 2,206 passed / 3 existing skips, 191 files | MR1-final-api-tests.log |
| npm run test --workspace @stay-focused/mobile | FRESH PASS, 1,072/1,072, 114 files | MR1-final-mobile-tests.log |
| npm run test --workspace @stay-focused/shared | FRESH PASS, 272/272, 28 files; includes existing emitted test copies | MR1-final-shared-tests.log |
| npm run test --workspace @stay-focused/engine | FRESH PASS, 606 evaluations passed / 0 failed | MR1-final-engine-tests.log |
| npm run test --workspace @stay-focused/web | FRESH PASS, 154/154, 26 files | MR1-final-web-tests.log |
| npm run provider:contract --workspace @stay-focused/api | FRESH PASS, 20/20; mocked client, no real call | MR1-final-provider-contract.log |
| npm run build --workspace @stay-focused/api | FRESH PASS, 1/1 build; 34/34 static pages; 16 workflow steps / 1 workflow built | MR1-final-api-build.log |
| npm run build --workspace @stay-focused/web | FRESH PASS, 1/1 build; 19/19 static pages | MR1-final-web-build.log |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS, 1/1 export; 1 Android bundle / 35 assets | MR1-final-android-build.log |
| npm run build -- --force | FRESH PASS, 8/8 tasks, 0 cached; extra AUTOPILOT gate | MR1-final-root-build.log |
| node node_modules/vitest/vitest.mjs run --config tmp/overnight/mr1-engine.config.mts | FRESH PASS, 20/20 tests in 3 files (AI-first split, emphasis, bounded repair) | MR1-engine-unit-final.log |
| git diff --check / git diff --cached --check | FRESH PASS, 0 whitespace errors; each scoped commit checked | closure output / MR1-final-diff-check.log |

Final source code is the three implementation commits below; final gates ran on
that identical source before commits. Build-generated API/web next-env.d.ts
changes were excluded and restored. No generated outputs, private fixtures or
tmp files are committed. Framework config/NO_COLOR warnings are non-failing;
no nondeterministic flake was observed. The original provider-contract failure
and repaired attempts above remain part of the record.

`test:workflow`: NOT APPLICABLE: the configured `apps/api/workflow-tests` tree
contains no `*.workflow.test.ts` files in this checkout. Workflow/Google delivery,
checkpoint and cancellation regressions are covered by API tests; provider
boundary also receives the standalone mocked provider contract check. No live
provider smoke, worker command, browser/device generation or remote call is run.

## Owner steps remaining

Rollout and Device checks were skipped entirely. Deploy the API and Google
worker; deploy the website / distribute compatible mobile code for the partial
notice as appropriate. After deployment, re-upload the owner's SOC SCI 103
midterm reviewer PDF as manual material on the realme and website; inspect the
full reviewer and confirm source order/completeness. Confirm Canvas generation,
partial-gap display and queue/cancellation behavior on the deployed versions.
No migration is added by MR1. Existing pending GA1b/SH1/SP2 prerequisites remain
owner work; no Scheduler creation/change/resume is needed by this fix.

Live deployed revisions, applied database state, Scheduler state, exact original
incomplete reason/token usage, production latency and physical behavior are
**UNVERIFIED (owner to confirm)**. The source metadata and production job evidence
in the prompt were treated as given; no production query was attempted.

## Commits / closure

- 747ea4d fix(engine): recover truncated reviewers with ordered source parts
- 7c226ed fix(api): resume reviewer parts with counted provider transfers
- 307000e fix(reviewer): disclose partial generation on mobile and web

Documentation closure is the commit containing this report, ADR-035, planning
reconciliation and handoff; its final hash is recorded in tmp/overnight/MR1.status.
The external 2026-10-16 roadmap's MR1 status was updated in place; other items
were preserved. No external file can be included in this repository's commits.

**PASS for the finite unattended MR1 code scope.** The tracked working tree is
clean after closure; only the three original unrelated untracked paths remain.
Rollout/device work is NOT RUN and is not claimed as production acceptance.
