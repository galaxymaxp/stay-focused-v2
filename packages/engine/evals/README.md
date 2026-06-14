# Engine Evaluation Harness

This directory contains a small, dependency-free evaluation system for the
deterministic stages of the Stay Focused V2 generation engine. Each suite reads
human-readable JSON fixtures, runs a stage, compares its output with explicit
expectations, and reports passed and failed cases with useful issue messages.

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

The process exits with code `0` when every case passes and code `1` when any
case fails.

## Adding Stage 2-6 Evals

1. Add readable JSON fixture files under `evals/fixtures`.
2. Create a typed suite that converts each fixture into an `EvalCase`.
3. Use the assertion helpers to return clear `EvalIssue` values.
4. Add the suite to `run-evals.ts`.
5. Keep deterministic stage evals independent of UI, storage, and providers.

The current harness evaluates deterministic contracts only. It does not yet
measure LLM response quality because generation-provider integration is
intentionally not implemented.
