# Reviewer Benchmark B1 - Intro to IT Security

## 1. Starting state

* Branch: `main`
* Starting HEAD: `8d940bfed6526cb7ac921d60017e149fe535def0`
* Working tree: Clean (`git status --short` returned no entries)
* Ahead/behind: 64 ahead, 0 behind `origin/main`
* Git fsck: Passed with exit code 0; one pre-existing dangling empty blob, `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`, was reported

## 2. Inputs

### Source PDF

* File: `1. Intro-To-IT-Security.pdf`, extracted from the supplied `CC16 - CITCS 2N GROUP A.zip`
* Pages: 32
* Extraction mode: `mixed` - 31 pages used PDF.js native text and page 32 used Google Cloud Vision OCR
* Extracted characters/words: 6,621 characters / 957 words; document normalization removed 0 repeated lines and kept 6,621 characters; engine Stage 0 represented 6,166 block-text characters across 229 blocks

### Approved reference

* File: `Reference Reviewer V1 - Intro to IT Security.md`
* Section count: 17
* Structure: Each section has a concept-level title, a short source-grounded explanation, and concise key points. It uses nested bullets for categories and subtypes, numbered lists for ordered material, merges repeated slides with the same concept, and omits the title divider, topic divider, and references slide.

## 3. Source inventory

| Source concept / structure | Pages | Notes |
| -------------------------- | ----: | ----- |
| Course title divider | 1 | `Intro to IT Security - Module 1`; presentation-only divider. |
| What is IT Security | 2 | Four statements, including separate `InfoSec` and `IT Sec` lecturer framings. |
| Goal of IT Security | 3 | Confidentiality, integrity, and availability; the visual explicitly labels them as the `C.I.A. TRIAD`, but native text extracts only the three-item list. |
| Domains of IT Security | 4 | Ordered list of eleven domains. |
| What is Cybersecurity? | 5 | Three definitions attributed to Cisco, Palo Alto Networks, and Kaspersky. |
| What cybersecurity is all about | 6-8 | Three repeated-title slides: layered protection; people/processes/technology; unified threat management with detection, investigation, and remediation. These should be one concept section. |
| Importance of cybersecurity | 9-11 | Page 9 gives consequences and critical-infrastructure examples; page 10 is a visual `Your Data` diagram; page 11 lists six other reasons. The page 10 categories do not survive native extraction. |
| Challenges of cybersecurity | 12 | Seven-item list. |
| Impact of a security breach | 13 | Five impacts. |
| Types of attackers | 14 | Visual hierarchy: Cyber Attackers -> Outsiders/Insiders; Outsiders -> Organized Attackers/Hackers/Amateurs; each group has children. All labels survive as text, but their parent-child edges and layout do not. |
| Attacks Concepts & Techniques divider | 15 | Presentation-only transition slide with no study detail. |
| Definition of terms | 16 | Vulnerability, exploit as method/tool, and breach; meaning depends on term-definition nesting. |
| Types of cybersecurity threats | 17-19 | Three repeated-title slides covering cybercrime, disruption, and espionage. |
| Types of malware | 20-21 | Ten lecturer-listed items across two repeated-title slides. `MiTM` is retained as the source classifies it. |
| Symptoms of malware | 22-23 | Eleven symptoms across two repeated-title slides. |
| Methods of infiltration | 24-27 | Four numbered methods. Social engineering and password cracking have subtypes; vulnerability exploitation contains an explicit a-d sequence; APTs have two characteristics. |
| Methods to deny service | 28-29 | Traffic and malformed-packet methods plus zombie/botnet definitions. The source unusually places SEO and SEO poisoning in this section; that framing must be preserved. |
| Blended attacks | 30 | Definition, component techniques, and two source examples. |
| Impact reduction | 31 | Seven response actions. |
| References | 32 | Five URLs plus institutional branding; OCR also captures watermark/logo fragments. This is not study content. |

The PDF was visually inspected as rendered slides as well as through the production extractor. No OCR was forced for the 31 pages the production path considered natively readable.

## 4. Current Stay Focused generation

* Model: `gpt-4o`, through `apps/api/src/providers/openai-provider.ts` and the OpenAI Responses API
* Duration: 50,467 ms
* Retry count: 0
* Fallback: No; 16 original generated sections, 0 repaired sections, 0 extractive fallbacks
* Section count: 16
* Coverage: `passed`, score 1.00, 16/16 detected outline sections covered
* Grounding: `passed`, score 1.00, no reported issues
* Leakage: `passed`, no reported issues
* Unsupported visible content: Yes. No outside cybersecurity facts were added, but several concatenated strings invent relationships not present in the PDF, and the final references section exposes corrupted OCR/logo fragments.

Production path traced:

`ReviewerGenerateScreen` -> durable document-extraction job -> `extractPdfDocument` -> `normalizeDocumentTextWithEvidence` -> durable reviewer-generation job -> `runPipeline` -> Stage 0 `normalizeSource` -> Stage 1 `detectOutline` -> Stage 2 `buildGenerationPlan` -> Stage 3 `generateSection` -> Stage 4 `verifyCoverage` -> Stage 5 `validateGrounding` / `validateLeakage` / `retryFailedSections` -> Stage 6 `assembleReviewer` -> stored `ReviewerOutput` -> `ReviewerPreview`.

The existing `packages/engine/scripts/live-run.ts` is a useful engine harness, but it accepts only fixed text fixtures and uses the engine Chat Completions provider. This benchmark used a small temporary harness that called the unchanged production extractor, production API provider, and unchanged `runPipeline`; it did not duplicate reviewer logic. The repository's existing `it-security.txt` fixture also omits the visual-only page 10 categories and the OCR references page, and its one-line layout does not reproduce the production extractor's 229-block shape.

## 5. Current generated reviewer

Exact section titles in order:

1. `Introduction`
2. `What is IT Security`
3. `Goal of IT Security`
4. `Domains of IT Security`
5. `Challenges of Cybersecurity`
6. `Impact of a Security Breach`
7. `Organized Attackers`
8. `Definition of Terms`
9. `Types of Cybersecurity Threats`
10. `Types of Malware`
11. `Symptoms of Malware`
12. `Methods of Infiltration`
13. `Methods to Deny Service`
14. `Blended Attacks`
15. `Impact Reduction`
16. `THE`

## 6. Reference -> Stay Focused section mapping

| Reference section | Stay Focused section(s) | Mapping | Notes |
| ----------------- | ----------------------- | ------- | ----- |
| What is IT Security? | What is IT Security | DIRECT | Same source concept; current explanation is empty. |
| Goal of IT Security | Goal of IT Security | DIRECT | Same three goals; current incorrectly plans a plain numbered list as a process. |
| Domains of IT Security | Domains of IT Security | MERGED | Correct domain items are present, but the same current section also absorbs pages 5-11. |
| What is Cybersecurity? | Domains of IT Security | MERGED | Three definitions are embedded as flat points inside the domains section. |
| What Cybersecurity Is All About | Domains of IT Security | MERGED | The three repeated slides are present as title/body concatenations, not a section. |
| Importance of Cybersecurity | Domains of IT Security | MERGED | Pages 9 and 11 are absorbed; page 10's visual data categories are missing. |
| Challenges of Cybersecurity | Challenges of Cybersecurity | DIRECT | Same extracted list; no explanation. |
| Impact of a Security Breach | Impact of a Security Breach | MERGED | The five impacts are present, but attacker labels are appended to the same section. |
| Types of Attackers | Impact of a Security Breach; Organized Attackers | FRAGMENTED | Insiders and `Outsiders` leak into the impact section; organized attackers, hackers, and amateurs appear in the next section with broken edges. |
| Attack Concepts: Vulnerability, Exploit, and Breach | Organized Attackers; Definition of Terms | FRAGMENTED | The divider becomes an attacker key point; definitions are a separate flat list with terms disconnected from meanings. |
| Types of Cybersecurity Threats | Types of Cybersecurity Threats | DIRECT | All three lecturer categories are retained, but hierarchy is flat. |
| Types of Malware | Types of Malware | DIRECT | Ten source items are retained in order. |
| Symptoms of Malware | Symptoms of Malware | DIRECT | Eleven source items are retained in order. |
| Methods of Infiltration | Methods of Infiltration | DIRECT | All extracted material is present, but method/subtype hierarchy and the a-d sequence are flattened. |
| Methods to Deny Service | Methods to Deny Service | DIRECT | The unusual SEO classification is faithfully retained; nested relationships are flattened. |
| Blended Attacks | Blended Attacks | DIRECT | Definition and examples are retained, but `Common example` is a peer bullet rather than a grouping label. |
| Impact Reduction | Impact Reduction | MERGED | Seven actions are present; `References` is appended as an eighth key point. |
| No reference section | Introduction | EXTRA | Presentation-only title slide becomes duplicate study content. |
| No reference section | THE | EXTRA | References/OCR branding noise becomes a student-visible section. |

## 7. Editorial comparison

| Dimension | Reference | Stay Focused | Verdict | Notes |
| --------- | --------- | ------------ | ------- | ----- |
| Section boundaries | 17 natural study concepts; repeated concept slides merged; dividers omitted | 16 outline sections, including 2 noise sections; four reference concepts collapse into `Domains`; attacker content fragments across sections | WEAKER | The largest defect is established before generation. |
| Explanations | 17 concise explanations averaging 17 words | Only `Introduction` has an explanation, and it duplicates its title/key point; 15 substantive sections are empty | WEAKER | Stage 3's detected-list guard unconditionally replaces explanation with an empty string when it finds two or more items. |
| Key points | Short facts grouped under the concept they explain | 138 flat items, including giant copied/concatenated lines and presentation headings | WEAKER | Current points average 5.63 words, but the problem is semantic grouping rather than raw length. |
| Hierarchy | Nested categories, subtypes, definitions, and ordered steps | Flat `string[]`; parent-child and sequence markers are stripped | WEAKER | Page 14 edges are lost in extraction; other explicit list hierarchy is lost during planning/generation. |
| Repetition handling | Repeated elaboration slides merge into one section without exposing banners | Recognized repeated headings merge for threats, malware, symptoms, infiltration, and denial of service; unrecognized headings are fused into bullets under another section | WEAKER | The working repeated-heading behavior is worth preserving. |
| Definitions | Terms stay next to their meanings | `Vulnerability`, its meaning, `Exploit`, its method/tool meanings, and `Breach` are seven peer bullets | WEAKER | A student must reconstruct which meaning belongs to which term. |
| Procedures | The vulnerability-exploitation sequence remains ordered within its parent method | Method labels, subtypes, and steps are one flat list; a-d ordering disappears | WEAKER | Stage 2 selects `concept-card` for an outline tagged `mixed`. |
| Examples | Source examples stay under the concept they demonstrate | Example content is retained, but its grouping label is a peer bullet | WEAKER | No invented examples were added. |
| Visual-source handling | Page 10 data categories and page 14 hierarchy are preserved | Page 10 categories are absent; page 14 labels survive but hierarchy does not | WEAKER | These are extraction/layout gaps, not Stage 3 omissions. |
| Source fidelity | Preserves terminology, examples, and unusual SEO placement while paraphrasing explanations | Preserves literal wording and typos well, but creates unsupported adjacency relationships and exposes OCR garbage | WEAKER | Literal token fidelity is stronger in places, but semantic fidelity is worse. |

## 8. Grounding audit

| Output | Content | Classification | Source evidence / notes |
| ------ | ------- | -------------- | ----------------------- |
| Reference | IT Security explanation and four key points | PARAPHRASE BUT SUPPORTED | Page 2 states all four ideas. |
| Reference | CIA goals and `three core security goals` framing | PARAPHRASE BUT SUPPORTED | Page 3 lists the three goals and visually labels the C.I.A. triad. |
| Reference | Page 10 data categories under Importance | SUPPORTED | The labels are visible in the `Your Data` diagram although absent from native text extraction. |
| Reference | Outsider/insider attacker tree | PARAPHRASE BUT SUPPORTED | Page 14 visually encodes the exact hierarchy. |
| Reference | Breach as the result of successfully exploiting a vulnerability | PARAPHRASE BUT SUPPORTED | Page 16's wording is grammatically incomplete but conveys that relationship. |
| Reference | Cybercrime, disruption, and espionage grouped by attacker purpose | PARAPHRASE BUT SUPPORTED | Pages 17-19 label the categories and describe profit, disruption, and state espionage. |
| Reference | SEO and SEO poisoning under Methods to Deny Service | SUPPORTED | Page 29 explicitly places them under that heading; the unusual lecturer classification is retained. |
| Reference | All remaining explanations, key points, examples, and procedures | SUPPORTED | No outside cybersecurity fact was found. Minor grammar/spelling cleanup does not change the lecturer's claims. |
| Stay Focused | Literal list items in What is IT Security, goals, challenges, malware, symptoms, threats, methods, blended attacks, and impact reduction | SUPPORTED | These are exact or mechanically joined source lines. |
| Stay Focused | `Cyber Security What is Cybersecurity?` as one domain key point | UNSUPPORTED | `Cyber Security` is domain 11 on page 4; `What is Cybersecurity?` is the next slide heading. The merged relationship is not in the source. |
| Stay Focused | `Trusted Partners Outsiders` and attacker labels appended to breach impacts | UNSUPPORTED | Page 14 shows `Trusted Partners` under Insiders and `Outsiders` as a sibling category; neither belongs to page 13's impact list. |
| Stay Focused | `State-sponsored Hackers` | UNSUPPORTED | Page 14 shows `State-sponsored` under Organized Attackers and `Hackers` as a separate outsider group. Concatenation changes the hierarchy. |
| Stay Focused | `Attacks Concepts & Techniques` as an Organized Attackers key point | UNSUPPORTED | Page 15 is a decorative divider, not an attacker type. |
| Stay Focused | `References` as an Impact Reduction key point | UNSUPPORTED | It is the page 32 heading, not a breach-response action. |
| Stay Focused | Reference URLs | SUPPORTED | The URLs are visible on page 32, but they are presentation/reference noise rather than study content. |
| Stay Focused | `THE`, `RDILI`, and `Technol000` fragments | UNSUPPORTED | These are OCR/logo corruptions or partial branding, not source academic statements. `1946` is visible in the watermark but is still presentation noise. |
| Both | Explicit `C.I.A. TRIAD` label | SUPPORTED source content omitted by both | Page 3 visually includes the label; it is an `EXTRACTION GAP` because native text supplies only the three goals. The underlying three concepts are still covered. |

No external cybersecurity source was used for this audit. The PDF is authoritative even where its grammar, spelling, or classification is unusual.

## 9. Pipeline defect attribution

| Finding | Severity | Owning layer | Evidence |
| ------- | -------- | ------------ | -------- |
| Page 10 data categories never reach normalized source | P0 | SOURCE EXTRACTION | Native text for page 10 is only `Importance of cybersecurity`; the reference's seven labels are visibly present in the diagram. |
| Page 14 parent-child attacker edges are lost | P0 | SOURCE EXTRACTION | Extraction returns labels in reading order but no spatial or tree relationships. Stage 3 cannot recover authoritative edges it never receives. |
| PDF page identity and layout blocks are discarded before reviewer normalization | P0 | SOURCE EXTRACTION | Extraction stores `rawPages`, but the reviewer job passes flattened `source_text` to `runPipeline`. Page boundaries are indistinguishable from intra-page blank lines. |
| Repeated slide headings on pages 5-11 are classified as paragraphs | P0 | STAGE 0 — NORMALIZATION | Stage 0 creates 229 blocks; `What is Cybersecurity?`, all three `What is Cybersecurity all about?` headings, and all Importance headings are paragraphs, while later headings are correctly classified. |
| Pages 4-11 become one 238-token `Domains of IT Security` outline section | P0 | STAGE 1 — OUTLINE | The detected outline jumps from Domains directly to Challenges. This predetermines the giant generated section. |
| Types of Attackers is split across the Impact and Organized Attackers spans | P0 | STAGE 1 — OUTLINE | `Types of Attackers` is not selected as a boundary; the inline `Organized Attackers` label is. |
| Title and topic dividers become study content | P1 | STAGE 1 — OUTLINE | `Introduction` is inferred from page 1 and page 15 is included as `Attacks Concepts & Techniques` inside the attacker span. |
| References/OCR branding becomes a `THE` section | P0 | STAGE 1 — OUTLINE | `References` is treated as a paragraph; OCR watermark fragment `THE` is treated as a heading and planned normally. |
| Methods of Infiltration is planned as `concept-card` despite an explicit ordered sequence | P1 | STAGE 2 — PLANNING | Stage 1 tags it `mixed`; Stage 2 selects a process schema only for an exact `process` tag. |
| Goal of IT Security is planned as `process-step` although it is a three-item goal list | P2 | STAGE 2 — PLANNING | Any numbered-list signal contributes a process tag, so enumeration is conflated with sequence. |
| Fifteen substantive sections have empty explanations | P0 | STAGE 3 — GENERATION | `applyDetectedListCoreGuard` forces `explanation: ""` whenever two or more items are mechanically detected, overriding the model output. |
| Headings, continuation lines, and adjacent concepts are fused into key-point strings | P0 | STAGE 3 — GENERATION | The hard list guard replaces generated points with `extractCleanSourceItems` output, producing strings such as `Cyber Security What is Cybersecurity?`. |
| Definitions and explicit methods/subtypes are flattened | P0 | STAGE 3 — GENERATION | `sourceCore.keyPoints` is a flat string array and the guard strips list markers; the student-visible output carries no nesting. |
| Coverage score is perfect despite missing conceptual sections and noise sections | P0 | STAGE 4 — COVERAGE | Stage 4 measures whether every Stage 1 outline section has an output, so an incorrect 16-section outline can score 16/16. |
| Grounding score is perfect despite invented adjacency relationships | P0 | STAGE 5 — RETRY / GROUNDING | Grounding is lexical/token and item-omission based. Concatenated source tokens pass even when their relationship is false. With all sections passing, no retry is triggered. |
| Assembled metadata says `complete` despite benchmark-critical defects | P1 | STAGE 6 — ASSEMBLY | Stage 6 trusts accepted coverage/grounding/leakage reports; 0 fallbacks and full outline coverage produce `reviewerQualityStatus: complete`. |
| Mobile displays the flat reviewer faithfully | P2 | NOT A DEFECT | `reviewerReaderPresentation.ts` preserves section/item/key-point order and `ReviewerPreview.tsx` renders each string as one bullet. It has no hierarchy to recover. |
| Recognized repeated headings merge correctly | P2 | NOT A DEFECT | Threats, malware, symptoms, infiltration, and denial-of-service slides each become one section. Preserve this behavior while fixing boundary detection. |

## 10. Structural rules inferred from the approved reviewer

### Rule 1

* Rule: Repeated slides that elaborate the same conceptual heading should normally become one reviewer section, while distinct headings must start distinct concepts.
* Why it helps: Students can find one complete concept without scanning repeated slide banners or one giant unrelated section.
* Current engine behavior: It merges repeated headings only when Stage 0/1 recognizes them. The production extraction shape causes several page 5-11 headings to be missed and all content to collapse under Domains.
* Likely owning layer: STAGE 0 — NORMALIZATION and STAGE 1 — OUTLINE
* Generic regression test possible: YES

### Rule 2

* Rule: Title slides, decorative transition slides, repeated institutional banners, and reference-only slides should not become study sections unless they contain academic content.
* Why it helps: It removes navigation noise and prevents meaningless memorization targets.
* Current engine behavior: It emits `Introduction`, includes the topic divider as an attacker key point, and emits a `THE` references section.
* Likely owning layer: STAGE 1 — OUTLINE
* Generic regression test possible: YES

### Rule 3

* Rule: A substantive section should have one short, source-supported synthesis sentence; an empty explanation is appropriate only for a truly sparse/list-only source where a synthesis would add nothing.
* Why it helps: The explanation tells the student what the list means and how to orient before memorizing details.
* Current engine behavior: The hard list guard removes explanations from every section with two or more detected items, including definitions, procedures, and multi-slide concepts.
* Likely owning layer: STAGE 3 — GENERATION
* Generic regression test possible: YES

### Rule 4

* Rule: Key points should express one source idea each and must never fuse a heading, sibling category, or following slide into the same point.
* Why it helps: Each bullet becomes a reliable recall unit rather than a source dump whose relationship must be reverse-engineered.
* Current engine behavior: Mechanical item replacement preserves coverage but creates false adjacency strings and giant mixed sections.
* Likely owning layer: STAGE 3 — GENERATION
* Generic regression test possible: YES

### Rule 5

* Rule: Meaningful hierarchy must be preserved: topic -> category -> subtype, term -> definition, and method -> step/subtype.
* Why it helps: Relationships are often the information students must memorize; a flat bag of labels discards that information.
* Current engine behavior: The output schema/presentation contains flat key-point strings, and the list guard strips markers. Visual hierarchy is additionally absent from extracted evidence.
* Likely owning layer: SOURCE EXTRACTION, STAGE 2 — PLANNING, and STAGE 3 — GENERATION
* Generic regression test possible: YES

### Rule 6

* Rule: Ordered material must remain ordered, and an enumeration that is not a process must not be mislabeled as a procedure.
* Why it helps: Students can follow real sequences without inventing order among categories or losing order among steps.
* Current engine behavior: The CIA goals are planned as a process, while the vulnerability-exploitation a-d procedure is flattened inside a concept card.
* Likely owning layer: STAGE 2 — PLANNING
* Generic regression test possible: YES

### Rule 7

* Rule: Source examples, lecturer terminology, and unusual classifications should be retained without outside correction, but remain attached to the concept that introduced them.
* Why it helps: The reviewer stays aligned with the course and preserves exam-relevant lecturer framing.
* Current engine behavior: It correctly preserves literal terms, typos, examples, `MiTM`, and SEO under denial of service, but often loses the parent relationship.
* Likely owning layer: STAGE 3 — GENERATION
* Generic regression test possible: YES

### Rule 8

* Rule: Verification must evaluate conceptual organization and semantic relationships against source evidence, not merely output presence and token overlap against the current outline.
* Why it helps: A reviewer should not be labeled complete when it covers a defective outline or combines source tokens into false relationships.
* Current engine behavior: Coverage, grounding, leakage, and assembly all pass at 1.00 despite the observable structural failures.
* Likely owning layer: STAGE 4 — COVERAGE and STAGE 5 — RETRY / GROUNDING
* Generic regression test possible: YES

## 11. Density comparison

| Metric | Reference | Stay Focused |
| ------ | --------: | -----------: |
| Sections | 17 | 16 |
| Reviewer words | 1,030 | 831 |
| Explanation words | 289 | 6 |
| Key points | 160 | 138 |
| Avg. key points / section | 9.41 | 8.63 |
| Avg. explanation length | 17.00 words | 0.38 words |
| Avg. key-point length | 4.25 words | 5.63 words |
| Source -> reviewer compression | 0.93:1 source/reviewer (107.6% of source length) | 1.15:1 source/reviewer (86.8% of source length) |

Measurement excludes the reference preamble and Markdown labels, and counts section titles, explanations, and every nested/numbered key-point row. The 957-word production extraction is the denominator. The reference being slightly longer than extracted text is not evidence of outside knowledge: its short synthesis sentences and repeated parent labels make relationships explicit. Density alone does not determine quality.

## 12. Student-use findings

If I had to study this PDF tonight, the approved reference would be easier to use because it exposes the document's conceptual map. I could jump directly to Cybersecurity definitions, Importance, or Attacker Types instead of searching a 28-point Domains section. Its one-sentence explanations tell me what each list is doing. Nested bullets show which attacker belongs to which group, which meaning belongs to `Exploit`, and which steps belong to vulnerability exploitation. The current output forces me to reconstruct those relationships and sometimes teaches the wrong adjacency, such as `State-sponsored Hackers` or `Trusted Partners Outsiders`.

The reference is also easier to scan before an exam: it removes title/reference slides, separates definitions from examples, and keeps procedures ordered. The current output's `Grounded`/complete status would create misplaced confidence because every token can be sourced while the study structure is still wrong.

Stay Focused currently does better in these limited respects:

* It preserves lecturer wording, capitalization, and typos more literally, including `boarder`, `data break`, and `a write a new exploit`.
* It retains every native-text list item from the main academic slides and does not invent outside cybersecurity facts or examples.
* It correctly merges several repeated-title sequences and preserves the lecturer's unusual placement of SEO/SEO poisoning under Methods to Deny Service.
* Its flat extraction is exhaustive enough to support a repair once boundaries and relationships are represented correctly.

These strengths do not outweigh the current structural defects, but they are constraints worth preserving.

## 13. Highest-value changes for the engine

### P0 - Make the reviewer outline page-aware and presentation-aware

* behavior to change: Carry page/block identity into reviewer normalization, reliably detect slide headings across the production extraction shape, merge adjacent repeated headings, keep distinct concepts separate, and suppress title/divider/reference-only pages.
* pipeline layer: SOURCE EXTRACTION, STAGE 0 — NORMALIZATION, STAGE 1 — OUTLINE
* reason: The largest failures - the giant Domains section, fragmented attackers, and `THE` - are fixed before a model can write useful content.
* generic acceptance test: Given a synthetic multi-page deck with repeated headings, distinct headings, a title divider, a transition divider, and references, the outline merges only repeated concepts, retains every distinct academic concept, and emits no noise section.

### P0 - Preserve relationships when forming student-visible key points

* behavior to change: Prevent mechanical item extraction from fusing headings/continuations, represent term-definition, category-subtype, and parent-step relationships, and keep explicit sequences ordered.
* pipeline layer: STAGE 2 — PLANNING and STAGE 3 — GENERATION
* reason: Correct tokens in the wrong relationship are unsupported content and directly harm memorization.
* generic acceptance test: Given nested categories, definitions, and an ordered procedure, output preserves every parent-child edge and sequence marker, with no sibling or next-heading concatenation.

### P1 - Restore concise source-grounded explanations

* behavior to change: Require a short synthesis for substantive sections and allow empty explanations only for verified sparse/list-only cards where a synthesis is genuinely not useful.
* pipeline layer: STAGE 3 — GENERATION
* reason: Fifteen of sixteen current sections provide no orientation; the approved structure consistently uses explanations to make lists understandable.
* generic acceptance test: A multi-sentence or multi-slide concept produces a non-meta, source-entailed explanation distinct from the title and bullets; a bare three-item label list may remain empty.

### P1 - Make validation independent enough to catch a bad outline and false relationships

* behavior to change: Add acceptance checks for noise sections, implausibly broad mixed-topic spans, heading leakage into points, missing expected source boundaries, and unsupported semantic adjacency.
* pipeline layer: STAGE 4 — COVERAGE and STAGE 5 — RETRY / GROUNDING
* reason: Current 1.00 scores and zero retries certify the exact defects the benchmark is meant to prevent.
* generic acceptance test: A fixture with all source tokens present but two headings fused and two sibling labels concatenated must fail coverage or grounding and trigger bounded recovery.

### P2 - Route visually meaningful pages to layout-aware extraction

* behavior to change: Detect pages whose native text is sparse relative to visible content and preserve diagram labels/relationships or explicitly mark them unavailable.
* pipeline layer: SOURCE EXTRACTION
* reason: Page 10 and page 14 show that readable native text can still be academically incomplete.
* generic acceptance test: A page containing a labeled diagram plus only a native heading does not pass as fully extracted; a hierarchy diagram retains labels and edges or is flagged as an extraction gap.

## 14. Verification

| Command | Result | Notes |
| ------- | ------ | ----- |
| Production-equivalent PDF extraction | PASS (FRESH) | 32/32 pages complete; 31 native, 1 OCR; 0 failed/blank pages. |
| Production-equivalent Reviewer run | PASS (FRESH) | `gpt-4o`; 50,467 ms; 16 calls; 0 retries; output captured unedited. |
| `npm run typecheck --workspace @stay-focused/engine` | PASS (FRESH) | Exit 0. |
| `npm run build --workspace @stay-focused/engine` | PASS (FRESH) | Exit 0. |
| `npm run eval --workspace @stay-focused/engine` | PASS (FRESH) | 292 passed, 0 failed. |
| `git diff --check` | PASS (FRESH) | No whitespace errors. |
| `git fsck --full` | PASS (FRESH) | Exit 0; one pre-existing dangling empty blob reported. |

Final engine eval count: 292 passed, 0 failed.

## 15. Files created by this benchmark

* `docs/ai/benchmarks/intro-it-security/current-stay-focused-reviewer.md`
* `docs/ai/benchmarks/intro-it-security/current-stay-focused-reviewer.json`
* `docs/ai/benchmarks/intro-it-security/benchmark-b1.md`

## 16. Git result

* Final HEAD: `8d940bfed6526cb7ac921d60017e149fe535def0`
* Commit: None; benchmark evidence is left uncommitted for review
* Working tree: Only the three untracked benchmark files listed above
* Ahead/behind: 64 ahead, 0 behind `origin/main`
* Push performed: No

## 17. Verdict

`BENCHMARK COMPLETE — current Reviewer behavior is now mapped against the approved barebones reference`

Next recommended task: Implement and regression-test a page-aware Stage 0/1 presentation outline that preserves distinct academic headings, merges repeated concept slides, and suppresses title/divider/reference-only pages without changing Stage 3 yet.
