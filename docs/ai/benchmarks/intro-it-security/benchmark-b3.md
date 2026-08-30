# Reviewer Benchmark B3 - Semantic Generation Structure

Date: 2026-08-30 (Asia/Manila)

## Scope and source authority

B3 keeps the accepted B2 page-aware 17-section outline and changes the Stage
2/3 handoff so generation preserves relationships already supported by the
source. The academic source of truth remains `1. Intro-To-IT-Security.pdf` from
the supplied course archive. Reference Reviewer V1 is an editorial comparison,
not an academic source. No reference wording is injected into generation.

The production-equivalent run processed 32 pages: 31 used embedded text, page
32 used OCR, and normalization produced 6,621 characters. The source PDF SHA-256
is `B88BF63A636BB30400338E61EB6A9E93A1469B6A90B0050BD0C0D66B5FAA517E`.

## Stage 2/3 diagnosis

Stage 2 previously selected a process schema whenever Stage 1 supplied a
`process` tag. Numbered conceptual enumerations therefore became processes even
when their wording contained no action sequence. Its planned content surface
was otherwise a flat item count and string list, so definitions, category
children, ordered steps, and source examples had no durable relationship model.

Stage 3 then reinforced that flattening. Its hard-list guard replaced generated
content with mechanically detected peer strings and always blanked list-heavy
explanations. The same flat representation powered fallback behavior. The item
splitter could also leave recognized labels adjacent or match a known label
inside a hyphenated compound. Finally, Stage 3 and Stage 5a reapplied global
character offsets to page-scoped continuation blocks, truncating later pages.

## Semantic implementation

`PlannedSection` now has an optional compatibility-safe `semanticPlan` with a
section kind, semantic units, and explanation usefulness. The generic analyzer
recognizes concepts, flat lists, definition sets, supported category groups,
procedures, and example groups. A unit is a point, definition, group, steps, or
examples. It uses only visible structural evidence: indentation, explicit
labels, explicit example markers, action-led ordered runs, or numbered parents
with bullet/letter children. Ambiguous hierarchy stays flat.

Stage 2 uses semantic meaning to distinguish an enumeration from a real
procedure. Stage 3 supplies the plan to the provider and deterministically
serializes each semantic unit through the existing `sourceCore.keyPoints`
string array, avoiding a consumer schema migration. Generated explanations are
kept only when they are useful direct source excerpts; sparse facts and thin
lists may remain explanation-free. Enrichment stays null.

Page-scoped source blocks are no longer resliced by filtered global offsets in
Stage 3 or Stage 5a. Grounding omission accounting considers the explanation
and key points together, because a source item promoted verbatim into an
explanation remains visible. These are compatibility repairs, not a semantic
verification redesign.

## Regression coverage

The required generic semantic fixtures cover:

1. numbered conceptual list versus procedure;
2. explicit ordered procedure;
3. term-definition pairs;
4. supported category hierarchy;
5. ambiguous hierarchy with no invented parent;
6. explicit source examples;
7. repeated continuation deduplication;
8. sparse facts without filler;
9. long-list completeness; and
10. unusual but source-supported classifications.

An eleventh semantic fixture protects numbered parents with bullet and lettered
children. Stage 3 also covers weak one-word explanation rejection and paged
continuation retention. Stage 5a covers paged continuation grounding, adjacent
recognized-label separation, and hyphenated-compound integrity. The final
engine suite passes 319/319, up from B2's 303/303.

## Live B3 result

- Model: `gpt-4o`
- Generation duration: 37,579 ms
- Extraction duration: 2,515 ms
- Provider calls: 17
- Retries: 0
- Fallback sections: 0
- Sections: 17
- Coverage: passed, 1.00
- Grounding: passed, 1.00
- Leakage: passed

The unedited result is captured in
`after-semantic-generation-reviewer.md` and
`after-semantic-generation-reviewer.json`.

## Exact section order

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

## Approved reference versus B2 versus B3

| Dimension | Reference | B2 | B3 | Verdict |
| --------- | --------- | -- | -- | ------- |
| Section boundaries | 17 editorial sections | Same 17 source titles | Same 17 source titles | Preserved |
| Explanations | Short explanation in every section | 0 non-empty | 4 source-excerpt explanations; sparse lists stay empty | Materially closer without filler |
| Key points | Concise, often nested | Flat; several continuation pages truncated | Complete and relationship-aware where evidence survives | Materially closer |
| Definitions | Term and meaning attached | Term and meaning split | Three term-definition units attached | Fixed |
| Category hierarchy | Nested where source supports it | Flattened | Threat categories and numbered infiltration parents attached; ambiguous attackers flat | Fixed within extraction evidence |
| Procedures | Ordered exploitation steps | Steps were peers | Four steps ordered under Vulnerability Exploitation | Fixed |
| Examples | Attached to concept | Label and examples split | Blended-attack examples attached to `Common example` | Fixed |
| Repetition | Editorially consolidated | Flat guard retained duplication risk | Semantic units deduplicate repeated wording | Improved |
| Source terminology | Faithful with light editorial cleanup | Faithful but truncated in places | Faithful, complete, and preserves unusual source wording | Improved |
| Unsupported content | None intended | No outside knowledge | No outside knowledge or invented hierarchy in manual audit | Pass |

## Risky-section audit

| Section | Result | Notes |
| ------- | ------ | ----- |
| What is IT Security | Pass | Direct source definition becomes the explanation; InfoSec and IT Sec descriptions remain intact. |
| Goal of IT Security | Pass | Three sparse goals remain peers; no filler sentence is manufactured. |
| Domains of IT Security | Pass | All eleven domains remain in source order and are not mislabeled as a procedure. |
| What is Cybersecurity? | Pass | Each definition stays associated with Cisco, Palo Alto Networks, or Kaspersky. |
| Types of Attackers | Pass with extraction limitation | Thirteen labels survive; `Employees and ex-employees`, `White hats`, and `Amateurs` are cleanly separated. No visual parent-child edge is guessed. |
| Definition of Terms | Pass | Vulnerability, Exploit, and Breach each retain their source meanings. |
| Types of Cybersecurity Threats | Pass | Cybercrime, Disruption, and Espionage retain their descriptions and examples. |
| Types of Malware | Pass | All ten types from both continuation pages are present. |
| Methods of Infiltration | Pass | Four numbered parent methods retain bullets; exploitation retains four ordered steps. |
| Methods to Deny Service | Pass with layout limitation | All twelve extracted items are present; relationships not encoded by extraction remain flat. |
| Blended Attacks | Pass | Hybrid techniques form a source excerpt explanation and the two explicit examples stay attached. |

## Grounding audit

| Content | Classification | Evidence / notes |
| ------- | -------------- | ---------------- |
| Four non-empty explanations | SUPPORTED | Each is a direct normalized source excerpt of at least five words. |
| InfoSec and IT Sec descriptions | SUPPORTED | Exact source terms and descriptions from page 2. |
| Cisco/Palo Alto/Kaspersky definitions | SUPPORTED | Provider labels and definition wording occur in the page 5 source. |
| Threat-category descriptions | SUPPORTED | Relationships follow alternating label/description evidence. |
| Exploit verb/noun meanings | SUPPORTED | Both meanings remain under the single source label. |
| Infiltration parent-child groups | SUPPORTED | Each numbered parent and its bullet/letter children occur in the same page-scoped block. |
| Vulnerability Exploitation sequence | SUPPORTED | Lettered action steps preserve source order. |
| Blended `Common example` group | SUPPORTED | Explicit example label precedes both examples. |
| Attacker hierarchy | SUPPORTED only as a flat list | Labels are extracted, but missing visual edges are not reconstructed. |
| Reference-only synthesis sentences | UNSUPPORTED for generation | They are not copied into B3 and the reference is not part of the academic input. |
| Outside cybersecurity facts | UNSUPPORTED | Manual audit found none in B3. |
| Invented parent-child edges | UNSUPPORTED RELATIONSHIP | Manual audit found none in B3. |

## Density comparison

Metrics count academic section titles, explanations, and visible list rows. A
B3 relationship serialized into one row is one visible row even when it retains
several children; reference nested rows are counted individually.

| Metric | Reference | B2 | B3 |
| ------ | --------: | -: | -: |
| Sections | 17 | 17 | 17 |
| Non-empty explanations | 17 | 0 | 4 |
| Explanation words | 289 | 0 | 64 |
| Visible list rows/key points | 160 | 112 | 106 |
| Key-point/list-row words | 680 | 582 | 618 |
| Average words per non-empty explanation | 17.0 | 0.0 | 16.0 |
| Average words per visible row | 4.2 | 5.2 | 5.8 |
| Total structured content words | 1,030 | 640 | 740 |
| Explicit ordered procedure sequences | 1 | 0 | 1 |
| Outside-knowledge findings | 0 | 0 | 0 |

B3 remains more extractive and less editorially expansive than the approved
reference, but it is materially closer than B2: it restores complete later-page
content, adds useful source explanations where safely available, and encodes
supported meaning without inflating the reviewer with outside prose.

## Remaining limitations

### Verification

Stage 4/5 still validate lexical coverage, schema completeness, grounding, and
leakage rather than independently validating semantic relationships. The 1.00
scores are necessary but not proof of correct grouping; B3's relationship audit
is manual plus deterministic fixture coverage. A semantic relationship verifier
belongs in B4.

### Extraction/layout

- **KNOWN EXTRACTION GAP:** page 10's visual `Your Data` category labels are
  absent from native text and are not invented.
- **KNOWN EXTRACTION GAP:** page 14 retains attacker labels in reading order but
  not all visual parent-child edges; B3 intentionally keeps them flat.
- Some Method-to-Deny-Service parent/description edges are not encoded by the
  normalized layout and remain flat.

### Other

The generated Markdown renderer uses the source's existing mojibake punctuation
(`â€“`, `â€™`) where it is already present in normalized extraction. This benchmark
does not alter encoding or editorially correct lecturer wording such as
`boarder` and `data break`.

## Verdict

**PASS - Reviewer semantic structure now matches the approved barebones study
format within the relationships supported by extracted source evidence.**

Recommended next task: add Stage 4/5 semantic relationship verification so
coverage and grounding cannot report 1.00 for incorrectly flattened or grouped
content.
