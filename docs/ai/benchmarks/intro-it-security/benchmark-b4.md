# Reviewer Benchmark B4 - Semantic Coverage and Grounding Verification

Date: 2026-08-30 (Asia/Manila)

## Scope and source authority

B4 changes Stage 4/5 verification, not reviewer generation. It uses the B3
source-derived semantic plan to verify unique points, term-definition pairs,
supported parent-child groups, ordered procedures, and explicit example
associations. The academic source of truth remains `1. Intro-To-IT-Security.pdf`
from the supplied course archive. Reference Reviewer V1 remains editorial
comparison only and is not generation or verification evidence.

The source PDF SHA-256 remains
`B88BF63A636BB30400338E61EB6A9E93A1469B6A90B0050BD0C0D66B5FAA517E`.
The B4 retest used its 31 native-text academic pages. Page 32 is the references
image page; it was deliberately not re-OCRed because the existing Google
service-account credential is under operational rotation. That page is outside
the accepted 17-section academic outline. No extraction or Stage 0-3 product
code changed.

## Starting state

- Branch: `main`
- Starting HEAD: `c7444e8562c71582cb1c603df372edd0ae16822f`
- Working tree: clean
- Ahead/behind: 67 ahead / 0 behind `origin/main`
- Git fsck: healthy except the pre-existing dangling empty blob
  `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`
- Engine baseline: 319/319

## Verifier diagnosis

Stage 4 previously treated schema kind, required-field presence, and referenced
source-block IDs as evidence of coverage. The report-level score counted
outline sections, not source ideas. Stage 5a independently checked legal source
tokens and whether detected source-list strings appeared, but it did not prove
that a label owned the correct meaning, a parent owned the correct children, a
procedure retained order, or an example stayed attached to its concept.

Consequently, all legal source tokens could be swapped or fused and still earn
1.00. Duplicate output could also repeat one idea while hiding another because
coverage did not assign visible rows to unique source targets. Stage 5 retries
were section-bounded, but their diagnostics described generic coverage or
grounding failures rather than the exact broken relationship and field.

## Verification model

The implementation adds one small generic verifier over B3's existing semantic
units. It performs conservative token/stem idea matching without requiring
exact strings. Each visible row can satisfy at most one source semantic target,
so repeated rows cannot inflate completeness.

Coverage is deterministic:

```text
semantic coverage = uniquely covered semantic targets / total semantic targets
```

For compatible plans without semantic units, the previous outline/schema
behavior remains. A composite target is covered only when its label and every
child are present in the legal source relationship. Procedures additionally
require source order.

Grounding remains distinct. Lexical fabrication and omission checks still ask
whether visible wording is source-supported. The relationship layer asks
whether the visible associations are legal. Any semantic relationship issue
prevents grounding from reaching the 0.80 pass threshold or 1.00. Omission
matching now accepts order-insensitive conservative token paraphrases; semantic
verification, rather than word order alone, polices association and sequence.

## Semantic issue classes

| Issue type | Meaning |
| --- | --- |
| `grounding-unsupported-relationship` | A visible association is not licensed by the semantic plan. |
| `grounding-wrong-definition-association` | A term is paired with another term's meaning. |
| `grounding-wrong-parent-child` | A supported parent-child direction or ownership is changed. |
| `grounding-wrong-step-order` | A supported procedure's ordered steps are rearranged. |
| `grounding-cross-concept-fusion` | Content from one section is fused with a neighboring concept heading. |
| `grounding-sibling-fusion` | Distinct peer source points are presented as one semantic unit. |
| `grounding-wrong-example-association` | Explicit source examples are attached to a different concept. |

## Generic regression matrix

| Fixture | Expected | Result |
| --- | --- | --- |
| A - conservative point paraphrase | PASS | PASS |
| B - missing semantic point | partial/fail coverage | PASS (0.50) |
| C - duplicate point, omit another | partial/fail coverage | PASS (0.50) |
| D - swapped definitions | semantic grounding FAIL | PASS |
| E - correct paraphrased definitions | PASS | PASS |
| F - wrong parent-child direction | semantic grounding FAIL | PASS |
| G - supported hierarchy preserved | PASS | PASS |
| H - ambiguous hierarchy remains flat | PASS | PASS |
| I - wrong procedure order | semantic grounding FAIL | PASS |
| J - correct procedure order | PASS | PASS |
| K - unordered enumeration | PASS without procedure rules | PASS |
| L - examples under wrong concept | semantic grounding FAIL | PASS |
| M - cross-concept heading fusion | semantic grounding FAIL | PASS |
| N - sibling fusion | semantic grounding FAIL | PASS |
| O - exact source wording, wrong relation | coverage/grounding FAIL | PASS |
| P - conservative relationship paraphrase | PASS | PASS |

The suite also protects two real-source overlap cases discovered by the live
retest: a parent term legally appearing as another parent's child, and one full
sibling label containing the complete text of a shorter sibling label.

## Fault injection

Every mutation starts from clean structured output. The real benchmark artifact
is never modified.

| Injected defect | Detected by | Result |
| --- | --- | --- |
| Swapped term definitions | wrong-definition association | PASS |
| Reordered procedure steps | wrong-step-order | PASS |
| Cross-concept fused key point | cross-concept-fusion | PASS |
| Sibling fusion | sibling-fusion | PASS |
| Wrong example association | wrong-example-association | PASS |
| One missing semantic unit | unique semantic coverage | PASS (0.50) |
| Duplicate replacing another unit | unique semantic coverage | PASS (0.50) |

## Retry behavior

Stage 5 continues to retry only affected sections and preserve successful
outputs. Relationship issues now carry their exact type, field path, offending
text, and source-only corrective wording into retry guidance. A dedicated eval
proves a swapped-definition failure makes exactly one provider request and the
prompt includes both `grounding-wrong-definition-association` and the instruction
to preserve the source association.

## Live B4 result

- Model: `gpt-4o`
- Native extraction duration: 271 ms
- Generation duration: 54,996 ms
- Provider calls: 17
- Retries: 0
- Fallback sections: 0
- Sections: 17
- Semantic targets: 110/110
- Coverage: passed, 1.00
- Grounding: passed, 1.00
- Semantic relationship issues: 0
- Leakage: passed

The exact 17 titles and all 17 `sourceCore` payloads are identical to the B3
artifact. B4 therefore preserves the approved barebones generation shape while
providing independent semantic verification. The clean output is captured in
`after-semantic-verification-reviewer.md` and
`after-semantic-verification-reviewer.json`.

## Risky-section audit

| Section | Coverage | Grounding | Relationships | Notes |
| --- | --- | --- | --- | --- |
| Goal of IT Security | passed, 1.00 | passed, 1.00 | passed, 0 issues | Three unique flat goals retained. |
| What is Cybersecurity? | passed, 1.00 | passed, 1.00 | passed, 0 issues | Three source definitions remain distinct. |
| Types of Attackers | passed, 1.00 | passed, 1.00 | passed, 0 issues | Only extraction-supported flat peers are checked. |
| Definition of Terms | passed, 1.00 | passed, 1.00 | passed, 0 issues | Three terms retain their own definitions. |
| Types of Cybersecurity Threats | passed, 1.00 | passed, 1.00 | passed, 0 issues | Supported group ownership is retained. |
| Methods of Infiltration | passed, 1.00 | passed, 1.00 | passed, 0 issues | Groups and the supported ordered exploitation steps pass. |
| Blended Attacks | passed, 1.00 | passed, 1.00 | passed, 0 issues | Explicit examples remain attached. |

## Remaining limitations

### Extraction and layout

- Page 10's visual `Your Data` categories remain absent from native extraction.
- Page 14 still lacks some visual attacker parent-child edges, so B4 correctly
  validates only the flat evidence available to the semantic plan.
- Some visual relationships under Methods to Deny Service remain flat.
- Page 32 reference OCR was not repeated while its credential is under rotation;
  this does not alter the academic outline or output.

### Generation

- Stage 3 remains deliberately extraction-first and barebones. B4 adds no new
  synthesis, outside knowledge, or hierarchy.

### Verification

- Matching is deterministic and conservative, not a general semantic-entailment
  model. Highly abstractive paraphrases may require a future bounded entailment
  layer; the present suite proves conservative paraphrases and rejects the known
  structural corruptions.
- Verification cannot reconstruct relationships absent from trusted extraction.

### Operations

- Credential exposure remediation required operationally: YES.
- The existing Google service-account credential must be rotated through the
  authorized operational mechanism. B4 did not inspect, print, copy, stage,
  commit, or rotate its value.

## Verification result

The engine suite passes 343/343: the 319-case B3 baseline plus 23 semantic
coverage/relationship cases and one precise retry-diagnostic case. Forced root
typecheck and lint, diff whitespace validation, Git integrity, and a staged
secret-pattern scan are recorded with the B4 commit handoff.

Recommended next benchmark: run the same process on the Firewalls PDF to prove
the semantic verifier generalizes beyond Intro to IT Security.
