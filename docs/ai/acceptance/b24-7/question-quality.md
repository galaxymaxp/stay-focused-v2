# B24.7 question quality

## Coverage and difficulty

Prepared blocks form real source regions keyed by material and block IDs. Source
headings supply topic labels; generic Solution and numbered procedural headings
remain with their academic parent rather than becoming isolated topics; pages/slides and source-region references survive.
Exact duplicate content, very short regions, agenda/contents/contact/reference
and thank-you regions are filtered. Paragraph groups are bounded to avoid an
entire long document becoming one topic. When regions exceed questions, evenly
spaced selection includes the end of the document. Otherwise round-robin
allocation prevents one opening topic taking all slots.

Requested types are allocated deterministically. Mixed difficulty starts with
the preferred sequence easy, medium, easy, hard, medium, independently of type.
Final mixed questions use the independent auditor's actual reasoning labels,
with no more than ceil(80% of count) at one level. Thus a five-question mixed
Quiz may contain easy and medium questions without inventing a hard label.
Explicit easy/medium/hard requests must match the requested level exactly. Easy means recall/recognition; medium means comparison,
relationship/process understanding; hard means multi-step, source-contained
application. A verifier must agree that the reasoning meets the label. Too little
source or a topic unable to support the requested question fails safely; the
backend never fabricates padding to reach the count.

## Candidate and correctness gates

Strict schemas reject unrecognized properties and constrain source IDs to the
actual planned topics. Server validation independently checks nonempty bounded
prompt/explanation/concept, allocated ID/type/topic/difficulty, 3–6 choice options
or exactly True/False, unique IDs and normalized option text, valid key references,
exactly one single-select/true-false key, and a multi-select key containing at
least two correct plus at least one incorrect choice. All/none-of-the-above
options are rejected. Exact evidence quotes must exist in the assigned source
region; invented regions/quotes fail.

Normalized prompt/concept overlap and exact answer-in-prompt checks reject direct
leakage and duplicates. Reused long evidence passages in the same source topic
are rejected, because immediate feedback can reveal a later answer despite
different wording. Arbitrary list-position trivia is rejected; semantic academic
value checks distinguish meaningful ordered procedures from presentation order. A separate bounded provider call independently enumerates
all defensible options without the proposed answer key or requested difficulty,
provides reasoning for each option, and checks key correctness, source sufficiency, distractor
falsity/plausibility, ambiguity, explanation grounding, external facts, semantic
duplication, cross-question leakage (including immediate feedback), and reasoning
difficulty. It independently classifies the actual reasoning difficulty; the
server enforces it against explicit difficulty requests and uses those actual
labels for a mixed request, enforcing the set-level variation bound. Learner self-containment and arithmetic
are explicit gates, including source OCR arithmetic errors. Every option must
have exactly one supported/contradicted analysis consistent with the final key.
Every check must be true and the independently enumerated answer set
must equal the proposed key. Missing/duplicate verdicts and malformed output fail
closed. No embeddings or second provider architecture is introduced.

Only failed slots are requested again, with failure reasons and the accepted set
as context. An initial pass plus two repairs is the limit. Accepted questions
are checkpointed; no partial Quiz is published. Provider semantic verification
is a quality safeguard, not a mathematical guarantee of natural-language truth.
The deterministic suites use mocked verdicts to prove contracts and failure
behavior; they do not claim those mocks establish academic validity.

## Deterministic fixtures

Fixtures cover cybersecurity, Python/programming, statistics, accounting,
conceptual social science, table content, formula content, short material,
40-section material and repetitive presentation noise. Tests cover 5/10/15/20
question counts, allocation, invalid keys/options/types/evidence, wrong difficulty classification, missing
per-option analysis, missing learner-visible premises, arithmetic errors, ambiguity and
unsupported-explanation rejection, malformed provider responses, partial repair,
semantic duplicates and public answer-key leakage. Attempt/SQL tests separately
cover drafts, correct/incorrect answers, exact-set multi-select, immediate
feedback, locked final answers, concurrent finalizations, resumption, completion,
repeat history, foreign-owner denial and weak-area thresholds.

## Live validation scope

The opt-in local test uses the existing B12 Statistics prepared-source fixture
and committed IT Security source. It uses the server provider adapter and local
Postgres migration/RPCs, then reopens the artifact through the Library service.
Provider outputs and source-derived diagnostics stay outside Git. See
`verification.md` for executed results and failures; a deterministic/mock pass
must never be reported as a live quality pass.
