# Reviewer Benchmark B2 - Page-Aware Presentation Outline

Date: 2026-08-30 (Asia/Manila)

## Scope and source authority

Benchmark B2 retests the unchanged Reviewer Stage 3 behavior after a narrowly
scoped production metadata, Stage 0 normalization, and Stage 1 outline repair.
The academic source of truth remains `1. Intro-To-IT-Security.pdf`. The approved
Reference Reviewer V1 is used only as an editorial comparison, never as an
academic source.

The production-equivalent rerun processed all 32 pages: 31 used embedded native
text and page 32 used OCR. Extraction yielded 6,621 source characters. The
page-aware handoff produced 62 normalized blocks: 57 academic blocks, two title
blocks, one divider block, and two reference-page blocks.

## Structural-data diagnosis

The extractor already retained page identity and ordered OCR blocks in
`OcrPage`. `normalizeDocumentTextWithEvidence` then returned only one flattened
string, even though the extraction job also stored `rawPages`. The mobile result
parser discarded `rawPages`; reviewer source state, the reviewer request, job
storage, and the worker all forwarded only `sourceText`. Consequently Stage 0
received plain text and Stage 1 could not distinguish a page break from an
ordinary blank line.

The engine types already supported generic `pageNumber`, `order`,
`sectionHint`, and scalar block metadata. The repair therefore did not add a
PDF-only engine abstraction. Normalized extraction now exposes ordered page text;
the production request path carries those blocks and a generic `presentation`
source kind; pasted and Canvas/plain-text callers continue to omit page data.

## Stage 0 and Stage 1 changes

- Stage 0 expands page-scoped presentation blocks into a page-leading heading
  and body block, retaining `pageNumber` and order.
- It classifies academic, title, divider, reference-only, and branding/noise
  page evidence with generic signals. Raw classified evidence remains in the
  normalized source.
- Page-leading question, sentence-case, title-case, numbered-topic, and
  list-followed headings no longer depend on all-caps detection.
- Stage 1 excludes presentation-only roles from the academic outline, treats a
  page heading as the authoritative boundary for its page body, and keeps
  visual hierarchy labels inside that page's concept.
- Adjacent identical headings merge as continuation slides. Only the first
  heading remains in the merged source span; all continuation bodies remain.
  Related but non-identical headings stay separate.
- Stage 3 prompts, schemas, explanation behavior, key-point behavior, and
  generation implementation were not changed.

## Generic regression coverage

Eleven new page-aware cases cover the nine required presentation patterns plus
the explicit long-list and non-paged protections:

1. title slide suppression;
2. transition-divider suppression;
3. reference-only page suppression;
4. isolated OCR/logo noise suppression;
5. short legitimate academic slide retention;
6. repeated two-page heading merge;
7. repeated three-page continuation merge with all bodies once;
8. visual hierarchy labels grouped beneath one page heading;
9. related but distinct headings remain separate;
10. distinct headings after a long list remain separate; and
11. plain-text input remains independent of page metadata.

The focused Stage 1 suite passes 28/28. The full deterministic engine suite
passes 303/303, up from the B1 baseline of 292/292. No pre-existing fixture was
changed; only new page-aware expectations were added.

## Direct B2 Stage 1 outline audit

1. `What is IT Security`
2. `Goal of IT Security`
3. `Domains of IT Security`
4. `What is Cybersecurity?`
5. `What is Cybersecurity all about?`
6. `Importance of cybersecurity`
7. `Challenges of Cybersecurity`
8. `Impact of a Security Breach`
9. `Types of Attackers`
10. `Definition of Terms`
11. `Types of Cybersecurity Threats`
12. `Types of Malware`
13. `Symptoms of Malware`
14. `Methods of Infiltration`
15. `Methods to Deny Service`
16. `Blended Attacks`
17. `Impact Reduction`

This matches the approved editorial concept map. The course title, attack-topic
transition, page 10 visual-only extraction remnant, and page 32 references/OCR
branding do not become outline sections.

## B1 to B2 structural comparison

| Finding | B1 | B2 | Verdict |
| ------- | --- | --- | ------- |
| Domains span | 28 points absorbed pages 4-11 | 11 domain points from page 4 only | Fixed |
| Cybersecurity definition | Fused into Domains | Separate section | Fixed |
| Repeated cybersecurity slides | Fused into Domains as banners/body | One continuation section spanning pages 6-8 | Fixed |
| Importance section | Fused into Domains | Separate section spanning pages 9 and 11 | Fixed within available extraction |
| Attackers boundary | Split across breach, Organized Attackers, and definitions | One `Types of Attackers` source section | Fixed at outline level |
| Decorative Introduction | Emitted as study content | Excluded as a title-only page | Fixed |
| Divider handling | Attached to attacker content | Classified and excluded | Fixed |
| References handling | Appended under Impact Reduction | Classified as source evidence and excluded from outline | Fixed |
| OCR `THE` noise | Became its own section | Cannot outrank `References`; no noise section | Fixed |

## Final B2 generation

- Model: `gpt-4o`
- Generation duration: 34,920 ms
- Provider calls: 17
- Retries: 0
- Fallback sections: 0
- Sections: 17
- Coverage: passed, 1.00
- Grounding: passed, 1.00
- Leakage: passed

The captured output is stored without editorial correction in
`after-page-aware-outline-reviewer.md` and
`after-page-aware-outline-reviewer.json`.

## Editorial result and remaining defects

Concept placement is materially stronger. Every expected concept has its own
natural section, continuation slides are merged only with their matching topic,
the attacker labels remain inside `Types of Attackers`, and presentation noise
is absent.

This task deliberately does not claim that the reviewer is now well written.
Stage 2 still treats some enumerations as processes. Stage 3 still emits empty
explanations, flat term/definition and method/step lists, and false adjacency
inside page-level hierarchy labels (for example attacker labels). These are the
next semantic-structure defects, not B2 outline regressions.

Verification also remains too permissive for editorial structure: coverage and
grounding both report 1.00 despite flat relationships and empty explanations.
Their semantics were intentionally unchanged in B2.

## Known extraction gaps

- **KNOWN EXTRACTION GAP:** page 10's visual `Your Data` categories are absent
  from native text. Page awareness correctly prevents the heading-only remnant
  from becoming a duplicate Importance section, but does not recover the labels.
- **KNOWN EXTRACTION GAP:** page 14 retains attacker labels in reading order but
  not the visual parent-child edges. B2 groups the labels under the correct
  concept but does not reconstruct a hierarchy.

## Quality-gate verdict

All 18 B2 gates pass: page evidence reaches Stage 0/1; plain text remains valid;
distinct, repeated, related, title, divider, reference, noise, and short-topic
cases behave as required; the real deck has the natural 17-section map; Stage 3
is unchanged; and deterministic plus repository verification is green.

**PASS - Reviewer source segmentation now matches natural presentation concepts.**
