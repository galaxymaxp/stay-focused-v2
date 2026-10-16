# ADR-035: Long-source reviewer split and assembly

Status: Accepted for local MR1 implementation (2026-10-16); rollout and physical
acceptance remain owner steps.

## Context

A 26,325-character manual source produced an incomplete reviewer response. The
AI-first engine assigned every reviewer 12,000 output tokens, and durable
redelivery treated all incomplete responses as a terminal contract failure.
The historical checkpoint omitted the reason, so output exhaustion is an
inference; content filtering cannot be ruled out for that original response.
Manual and Canvas reviewer jobs share this engine.

## Decision

Keep the comprehensive source-grounded instructions, schema and validation.
For a source with C normalized text characters, use
`min(24000, max(12000, ceil(0.75*C) + 4000))` output tokens. At 26,325 characters,
this is 23,744. Preserve source/instruction/schema/repair/output headroom within
128k using conservative byte-based context accounting; shrink the rejected-output
repair allowance when needed. Quiz/Activity default budgets remain 12,000.

Attempt one whole reviewer when its complete source fits a context window; retain
its one substantive contract repair. On a known `max_output_tokens` incomplete
response, switch to deterministic ordered parts. Sources spanning context
windows use parts directly, retaining all accepted blocks instead of condensing.
Target 8,000 source characters; prefer headings/page changes after 4,000; never
split inside a normalized block or exceed the existing 80,000-byte part context
limit. Preserve the existing eight-context-group maximum. An indivisible block
that exceeds context capacity still fails explicitly; never clip it.

Generate parts serially with identical trusted instructions. Each part gets two
attempts total, including contract/provider failures. Validate reference
allowlists and require every part block to be referenced. Keep successful parts,
quarantine a definite failing part after attempt2, then continue. Concatenate
successful parts in source order and allocate globally unique section/item IDs.
Return typed metadata `generationStatus: 'partial'` plus exact quarantined part
IDs, source block IDs, two attempts and a safe reason. Mark coverage failed and
record missing blocks. If no part succeeded, fail rather than publish an empty
reviewer. Expose a safe partial notice on the owner readers; preserve exact
accepted prose and keep private IDs/errors out of visible reviewer text.

Known token exhaustion is an orchestration signal, not terminal generation
failure. Content-filter/unknown-reason incompleteness retains the existing fatal
behavior. Never reinterpret old reasonless checkpoints as token exhaustion.
Fencing, cancellation, unknown transfer, budget denial and checkpoint errors
propagate; they cannot be quarantined as harmless content gaps.

## Durability and cost

Retain the existing `google:provider:*` namespace and initial whole-call hash.
Add stable logical identities for whole-product repair and each part/attempt.
All durable reviewer backends read receipts before transfer; completed successes
and definite part failures replay without billing again. Persist incomplete
reason without raw output/error content. Pending/unknown outcomes remain fenced.
Reserve every transfer in `ai-first:calls:reviewer_document`; use the bounded
source-derived maximum `2 + 2 * numberOfParts`. Disable internal SDK retries for
durable calls so each HTTP request has one reservation. Other schemas retain
their existing job-wide budgets and error policies. User generation quotas,
authentication, ownership and RLS remain unchanged. Read actual persisted
reservations for final provider cost counts; save the result before success.

## Consequences and validation

Long sources can cost additional bounded calls. A single enormous indivisible
block may still fail; the engine never truncates it. Split context boundaries can
affect educational organization, so local contract tests do not prove factual
completeness of the owner's actual material. Existing ai-first compatibility
coverage/grounding scores remain contract/reference checks, not semantic proof.
See [MR1 acceptance](../ai/acceptance/mr1-long-source-reviewer.md) for fresh tests,
gates, repaired first attempts and rollout limitations. This supersedes the
reviewer-only condensation/fixed-budget details of
[AI-first generation](ADR-ai-first-generation.md); other products keep that ADR.
