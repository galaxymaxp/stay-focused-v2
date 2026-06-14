# Engine Evaluation Harness

This directory contains a small, dependency-free evaluation system for the
deterministic stages of the Stay Focused V2 generation engine. Each suite reads
human-readable JSON fixtures, runs a stage, compares its output with explicit
expectations, and reports passed and failed cases with useful issue messages.

## Current Status

Stage 0 through Stage 6 plus end-to-end pipeline integration are covered. The
current aggregate result is **176 passed, 0 failed**. The harness is
deterministic and dependency-free; provider-facing cases use fake providers
only. LLM quality evals are intentionally deferred until a real provider
adapter exists.

## Why Evals Come Before Each Stage

Stage 0 establishes the source representation used by every later stage.
Adding evals before outline detection gives Stage 1 a stable input baseline and
encourages new behavior to begin with fixtures rather than ad hoc debugging.
This is important for the capstone because it makes engine behavior repeatable,
reviewable, and measurable as the pipeline grows.

Stage 1 is deterministic outline detection. Its suite checks heading-based
section boundaries, introduction and heading-free fallbacks, source ordering,
stable IDs, content tags, confidence scores, and invalid empty input. These
contracts are tested before Stage 2 so generation planning can rely on a stable
and measurable outline instead of compensating for ambiguous structure.

Stage 2 is deterministic generation planning. Its evals verify one-to-one
section planning, source ordering, reference validation, stable IDs, target
coverage requirements, and schema selection. The schema family is intentionally
limited to `ConceptCard`, `ProcessStep`, `ExampleCard`, and `ClaimCard` so Stage
3 receives a small, predictable contract before any provider request is built.
Stable planning prevents provider behavior from hiding structural mistakes.

Stage 3 evaluates the provider boundary without using a real model. Its suite
checks provider-agnostic schema selection, deterministic prompt and request
construction, source excerpt isolation, fake-provider failures, and runtime
validation of all four section output shapes. Real OpenAI integration remains
intentionally deferred so provider work cannot weaken the engine boundary.

Stage 4 is deterministic coverage verification. Its evals compare generated
outputs with planned schema kinds, required fields, and required source-block
coverage before retry or reviewer assembly. This prevents weak, incomplete, or
misrouted reviewer sections from silently passing into later pipeline stages.

Stage 5 performs bounded retries only. Its evals verify that passed outputs are
preserved, only retryable weak or failed sections are regenerated, policy
switches and retry limits are honored, provider failures remain contained, and
final outputs follow plan order. Fake providers keep these cases deterministic;
real OpenAI integration is intentionally deferred. The bounded flow prevents
weak sections from silently reaching reviewer assembly without introducing an
unbounded provider loop.

Stage 6 performs deterministic reviewer assembly without a final model pass.
Its evals cover all four typed section shapes, coverage acceptance, stable IDs,
metadata, source references, input immutability, and strict source/plan order.
Preserving the generation plan order ensures later sections cannot be silently
dropped or reordered during final assembly, directly addressing a V1
limitation while keeping final content unchanged by another model call.

The pipeline integration suite exercises `runPipeline` across Stage 0 through
Stage 6 using extracted text inputs and deterministic fake providers. It checks
schema routing, request counts, bounded retry behavior, final coverage,
ordering, metadata, and contextual errors without connecting a real provider.
Real OpenAI integration remains deferred, and GUI/mobile work remains deferred
until the completed engine contract is documented and stable.

## Running Evals

Build the engine and run all suites:

```text
npm run build --workspace @stay-focused/engine
npm run eval --workspace @stay-focused/engine
```

Run only Stage 0 after building:

```text
npm run eval:stage0 --workspace @stay-focused/engine
```

Run only Stage 1 after building:

```text
npm run eval:stage1 --workspace @stay-focused/engine
```

Run only Stage 2 after building:

```text
npm run eval:stage2 --workspace @stay-focused/engine
```

Run only Stage 3 after building:

```text
npm run eval:stage3 --workspace @stay-focused/engine
```

Run only Stage 4 after building:

```text
npm run eval:stage4 --workspace @stay-focused/engine
```

Run only Stage 5 after building:

```text
npm run eval:stage5 --workspace @stay-focused/engine
```

Run only Stage 6 after building:

```text
npm run eval:stage6 --workspace @stay-focused/engine
```

Run only the end-to-end pipeline suite after building:

```text
npm run eval:pipeline --workspace @stay-focused/engine
```

The process exits with code `0` when every case passes and code `1` when any
case fails.

## Adding Integration Evals

1. Add readable JSON fixture files under `evals/fixtures`.
2. Create a typed suite that converts each fixture into an `EvalCase`.
3. Use the assertion helpers to return clear `EvalIssue` values.
4. Add the suite to `run-evals.ts`.
5. Keep deterministic stage evals independent of UI and storage, and use fake
   providers for end-to-end pipeline fixtures.

The current harness evaluates deterministic contracts only. It does not yet
measure LLM response quality because generation-provider integration is
intentionally not implemented.
