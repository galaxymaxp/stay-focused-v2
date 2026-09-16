# ADR: AI-first educational generation

Status: Accepted. Production caller migration deployed; B25.4 physical API flows passed. Patched standalone-client release acceptance is tracked in `docs/ai/acceptance/b25.3.3/device-acceptance.md`.

## Context

Reviewer, Quiz and Activity progressively moved educational interpretation into
local TypeScript. Reviewer plans sections and evidence ownership; Quiz partitions
source into support units, assigns blueprints, ranks candidates and iterates
semantic repairs; Activity infers requirements with regexes. The B25.3.2 real
Quiz failed with one slot restricted to 53 characters despite a larger lecture.

## Decision

Stay Focused owns Canvas acquisition, extraction/OCR, ordered source context,
provider orchestration, contracts, ownership, persistence, durable jobs, scoring
and presentation. The model owns educational importance, organization, assignment
interpretation, question diversity, distractors and explanations.

Provide the complete coherent source when it fits. Larger inputs use coarse
structural groups and AI condensation with retained source references. Never
locally rank educational importance or allocate microscopic per-question evidence.
Generate a Quiz as one complete set. Validate objective contracts and permit at
most one whole-product contract repair. Fail truthfully after that bound.

Prompts use a trusted instruction channel separate from untrusted source data.
Only selected/authorized material enters context. IDs remain stable and all
returned references must exist. Answer keys and explanations remain server-only
until the existing attempt rules intentionally disclose them. Scoring stays on
the server.

Existing product DTOs remain the presentation boundary. Reviewer compatibility
metadata explicitly identifies `ai-first-contract` validation; it must not be
displayed as an independently verified factual-grounding claim.

## Consequences

- Fewer local semantic stages and fewer author/verifier loops.
- Quality depends directly on context, prompt, schema and model capability.
- Real material and human inspection are mandatory; deterministic contracts do
  not establish student usefulness or factual completeness.
- Coarse condensation is lossy and must be disclosed in telemetry/evaluation.
- The shared context builder uses a conservative 80,000 UTF-8 byte context budget, reserves
  space for schema/instructions, a 24,000-byte correction, and up to 12,000 output
  tokens. It fails rather than clipping an oversized indivisible source block.
  This is a safe upper-bound token estimate, not model-specific tokenization.
- Transport retries remain separate from the single contract-repair cycle.

## Rollout gate

Audit -> implementation -> contract tests -> real-material spike and inspection
-> cut over callers/workflows -> retire obsolete implementation/tests -> full
regression -> existing-project deployment -> physical Android acceptance.

All production Reviewer routes, the worker and durable Workflow now use the AI-first Reviewer. Quiz and Activity use the shared provider/context/contract foundation. Whole valid artifacts are checkpointed before completion; call reservations survive retries. No rejected output is added to durable checkpoints. Historical Reviewer semantic modules remain deprecated for historical evaluations and are bypassed by all production callers. Quiz and Activity semantic planners are removed.

The [acceptance report](../ai/acceptance/b25.3.3/architecture-simplification.md) records live quality, deterministic regression, rollout and physical-device results. B25 PASS requires the actual production Quiz attempt and reopen flow.
