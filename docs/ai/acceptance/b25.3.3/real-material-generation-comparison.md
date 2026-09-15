# B25.3.3 real-material comparison

Status: BLOCKED before live generation; no quality equivalence claim.

| Metric | Legacy B25.3.2 | Simplified spike |
|---|---|---|
| Provider calls | Production: four author + four verifier batches | Not run |
| Latency | Historical fixture: 63.331 seconds; not a production latency measurement | Not measured |
| Completion | Real lecture: 4/5 accepted, no Quiz persisted | Not measured |
| Local semantic stages | Support splitting, affordances, blueprints, candidate ranking, semantic verification/repair | Standalone path: none; context -> AI -> contract validation, optional one repair |
| Student usefulness | Production Quiz unavailable | Not evaluated |
| Source faithfulness | No complete production Quiz | Not evaluated |
| Cost | No comparable measurement available | Not measured |

## Planned immutable cases

1. Exact material behind failed job `d038e85b-ae03-4853-aa2a-f663037415b0`.
2. Existing extracted *Generators in Python* slide document, from the established
   B19 corpus (34 pages).
3. Existing extracted *Measures of Central Tendency* document, from the same
   corpus (6 pages).
4. Activity fixture with explicit instructions, two-heading instructor template,
   source example, due date and submission-type metadata.

Existing source files have not been edited. Capture complete inputs/outputs only
in ignored `.local/b25-3-3`; commit hashes and aggregate metrics, not private
course text. Inspect organization, coverage, plausible distractors, explanations,
faithfulness and template fidelity before accepting the spike.

## Access and approval record

The sandboxed Supabase read failed. A reviewed read outside the sandbox reached
the correct historical source but source structuring required an OCR provider.
The next call using configured Google Cloud Vision was rejected by automatic
approval review: it identified private production lecture data being sent to an
external OCR service and required explicit payload/destination authorization.

The user was asked whether to approve Google Cloud Vision OCR plus OpenAI,
existing extracted text plus OpenAI only, or offline validation. No answer had
arrived when this checkpoint was written. No live generation was performed and
no blocked OCR operation was bypassed.

Deployment and architecture retirement remain behind the requested live-quality
gate. B25 remains PARTIAL; B26 may not begin.
