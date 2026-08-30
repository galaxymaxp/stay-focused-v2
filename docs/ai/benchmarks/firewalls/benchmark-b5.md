# Reviewer Benchmark B5 - Frozen-Engine Generalization Test on Firewalls

Date: 2026-08-31 (Asia/Manila)

## 1. Starting state

* Branch: `main`
* Starting HEAD: `0fb88b957e0554ecff34d55bc80d83d180e40f1d`
* Working tree: Clean. `git status --short` returned no entries.
* Ahead/behind: 68 ahead / 0 behind `origin/main`
* Git fsck: Exit 0. It reported two unreachable dangling blobs, `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and `625ec44ccb5695fe93ac518f09238fac61eca223`; no corrupt object was reported.

## 2. Product freeze

* Product implementation modified before benchmark: NO. The starting product trees were clean: `packages/engine/src` = `a96532d5d7d1e83fc2189ff9ca8c113865e7939f`, `packages/ocr/src` = `aee737b3a21588a555a1a1350892db291d5d6964`, `apps/api` = `3dad18b25741c77e66659eb5ecacc505b4350709`, and `apps/mobile` = `16555c5ded288e77d34f4975cc3dbbc9c4f459de`.
* Product implementation modified by B5: NO. Only the three benchmark artifacts listed in section 25 were created.
* Engine eval baseline: `343/343 PASS`; the same count passed freshly after the B5 run.

## 3. Firewalls source

* File: `Modules/Lecture Presentations/2. Firewalls.pdf` from `CC16 - CITCS 2N GROUP A.zip`; SHA-256 `75FF14DD5F94DCA076C20ADA4FA2E9B1006A9411282CA48D7C43E8A1531264AE`
* Pages: 33
* Extraction: Production PDF.js inspection selected native text for all 33 pages (`pdfjs-native-text`); OCR was not requested. The benchmark extraction completed in 195 ms. Independent human inspection used native text plus rendered images for all pages.
* Extracted characters: 6,997 normalized characters; no repeated boilerplate lines were removed.
* Extracted words: 992
* Structured blocks: 33 page-aware source blocks entered Stage 0; Stage 0 produced 60 blocks: 51 academic, 2 presentation-title, 5 presentation-divider, and 2 references blocks.
* Layout-sensitive pages: 4, 15-17, 23, and 25-30. Pages 25, 27, 29, and 30 are especially important because they are architecture diagrams whose native text is almost entirely the repeated slide title. Sparse pages were 1, 8, 14, 18, 22, 25, 27, 29, and 30.

Every page used the normal production extraction decision. OCR was not forced merely because a human could see more meaning in a diagram.

## 4. Human source inventory

| Concept / structure | Pages | Structure type | Notes |
| ------------------- | ----: | -------------- | ----- |
| Firewalls & VPNs title | 1 | presentation title | Chapter divider only; not study content. |
| Learning Objectives | 2 | checklist / overview | Five course objectives; legitimate source text but mostly a preview of later topics. |
| Technical Control | 3 | definition / conceptual explanation | Hardware and software protection and its role in balancing CIA objectives. The slide title is the generic `Introduction`. |
| Physical Design | 4 | conceptual explanation / hierarchy | Explicitly says the design has two parts: Security Technologies and Physical Security. |
| Physical Design Process | 5 | ordered procedure | Four dependent design steps in source order. |
| Firewalls | 6 | definition / forms | Defines the lecturer's firewall concept and lists possible implementation forms. |
| Firewall Categorization | 7 | classification | Three classification dimensions: Processing Mode, Development Era, and Structure. |
| Processing Mode categories | 8-13 | classification / comparison | Divider on page 8 followed by Packet Filtering, Application-Level Gateways, Circuit-level Gateways, MAC-layer Firewalls, and Hybrids. |
| Development Era categories | 14-17 | classification / comparison / example | Divider on page 14 followed by First, Second, and Third Generation; page 15 contains an explicit FTP example. |
| Structure categories | 18-21 | classification / definition | Divider on page 18 followed by Commercial Grade, SOHO Firewall, and Residential Grade. |
| Firewall Architectures divider | 22 | presentation divider | Introduces the architecture family; not useful as an empty Reviewer section. |
| Packet Filtering Routers | 23 | architecture / disadvantages | Basic operation plus a nested three-item disadvantages group. |
| Screened Host Firewalls | 24-25 | architecture / diagram | Textual description on page 24 and a labeled topology diagram on page 25. |
| Dual-homes Firewalls | 26-27 | architecture / hierarchy / diagram | Three explicit parent-child groups on page 26 and a labeled topology diagram on page 27. |
| Screened Subnet Firewalls | 28-30 | architecture / rule set / diagrams | DMZ explanation and three common-implementation relationships on page 28; two labeled diagrams on pages 29-30. |
| Best Practices for Firewalls | 31-32 | ordered rule set / checklist | Twelve numbered recommendations. Numbering is for reference and priority, not a dependent process sequence. |
| References | 33 | references / presentation noise | Citations and URLs only; not study content. |

## 5. New document challenges

Firewalls differs meaningfully from Intro in these ways:

* three successive classification systems whose parent labels are on divider slides and whose members are separate slides;
* wrapped two-line divider titles (`Categorized by Processing Mode` and `Categorized by Development Era`);
* visual-only continuation slides sharing the prior academic heading;
* architecture diagrams with labels, network direction, trust boundaries, and DMZ placement that do not survive native extraction;
* explicit label-to-children structures expressed through indentation (`two parts`, `Disadvantages`, and `Common Implementation`);
* an explicit inline example (`Ex. FTP...`) rather than Intro's `Common example` block;
* a real four-step procedure and, later, a numbered action-led checklist that must not be treated as a procedure;
* category material that functions as a comparison even though it is not laid out as a table.

## 6. Stage 1 outline

1. `Learning Objectives`
2. `Introduction`
3. `Physical Design`
4. `Physical Design Process`
5. `Firewalls`
6. `Firewall Categorization`
7. `Categorized by Processing`
8. `Packet Filtering`
9. `Application-Level Gateways`
10. `Circuit-level Gateways`
11. `MAC-layer Firewalls`
12. `Hybrids`
13. `Categorized by`
14. `First Generation`
15. `Second Generation`
16. `Third Generation`
17. `Categorized by Structure`
18. `Commercial Grade`
19. `SOHO Firewall`
20. `Residential Grade`
21. `Packet Filtering Routers`
22. `Screened Host Firewalls`
23. `Dual-homes Firewalls`
24. `Screened Subnet Firewalls`
25. `BEST PRACTICES FOR FIREWALLS`

## 7. Outline mapping

| Human source concept | Stage 1 section(s) | Mapping | Notes |
| -------------------- | ------------------ | ------- | ----- |
| Firewalls & VPNs title | None | MISSING | Correct intentional suppression. |
| Learning Objectives | Learning Objectives | DIRECT | Legitimate but low-value overview retained. |
| Technical Control | Introduction | DIRECT | Content boundary is correct; the generic slide title hides the actual concept. |
| Physical Design | Physical Design | DIRECT | Correct boundary. |
| Physical Design Process | Physical Design Process | DIRECT | Correct boundary and page. |
| Firewalls | Firewalls | DIRECT | Correct boundary. |
| Firewall Categorization | Firewall Categorization | DIRECT | Correct top-level classification list. |
| Processing Mode categories | Categorized by Processing; Packet Filtering; Application-Level Gateways; Circuit-level Gateways; MAC-layer Firewalls; Hybrids | SPLIT | Specific categories are distinct, but a wrapped divider becomes a redundant content section and the parent-child classification is not encoded. |
| Development Era categories | Categorized by; First Generation; Second Generation; Third Generation | SPLIT | Specific eras remain distinct, but the divider is truncated and emitted as content. |
| Structure categories | Categorized by Structure; Commercial Grade; SOHO Firewall; Residential Grade | SPLIT | Specific types remain distinct; the empty divider becomes content. |
| Firewall Architectures divider | None | MISSING | Correct intentional suppression of the divider itself. |
| Packet Filtering Routers | Packet Filtering Routers | DIRECT | Correct boundary. |
| Screened Host Firewalls | Screened Host Firewalls | DIRECT | Page 24 text is present; page 25 diagram evidence is absent rather than merged. |
| Dual-homes Firewalls | Dual-homes Firewalls | DIRECT | Page 26 text is present; page 27 diagram evidence is absent rather than merged. |
| Screened Subnet Firewalls | Screened Subnet Firewalls | DIRECT | Page 28 text is present; pages 29-30 diagram evidence is absent rather than merged. |
| Best Practices for Firewalls | BEST PRACTICES FOR FIREWALLS | DIRECT | Pages 31-32 merge correctly. |
| References | None | MISSING | Correct intentional suppression. |

## 8. Continuation and noise audit

| Source behavior | Engine behavior | Result | Notes |
| --------------- | --------------- | ------ | ----- |
| Pages 31-32 repeat `BEST PRACTICES FOR FIREWALLS` with textual continuation | One section includes page 31 heading/body and page 32 body | CORRECT MERGE | All twelve items are retained once. |
| Pages 24-25 repeat `Screened Host Firewalls` | Page 25 is marked `presentation-divider` and does not join the page 24 section | OVER-SPLIT | No extra visible section is created, but the academic diagram continuation is discarded because extraction retained only its heading. |
| Pages 26-27 repeat `Dual-homes Firewalls` | Page 27 is marked `presentation-divider` and does not join page 26 | OVER-SPLIT | Text remains usable, but diagram relationships are unavailable. |
| Pages 28-30 repeat `Screened Subnet Firewalls` | Pages 29-30 are marked `presentation-divider` and do not join page 28 | OVER-SPLIT | Both topology diagrams are absent from the source evidence used by the Reviewer. |
| Page 1 course title | Suppressed | CORRECT SEPARATION | No title-slide study section. |
| Pages 8, 14, and 18 category dividers | Emitted as `Categorized by Processing`, `Categorized by`, and `Categorized by Structure` | OVER-SPLIT | These three presentation-only transitions each duplicate their own title as explanation and key point. |
| Page 22 `Firewall Architectures` divider | Suppressed | CORRECT SEPARATION | The four architecture concepts still receive sections. |
| Page 33 references | Suppressed | CORRECT SEPARATION | URLs and branding do not leak into study content. |
| Repeated logo, watermark, and footer template | Not emitted | CORRECT SEPARATION | No branding or OCR garbage appears. |

Noise suppression therefore generalizes for the course title, architecture divider, references, branding, and footer text, but not for the three `Categorized by ...` dividers. It also suppresses academically important diagram-only continuations after extraction has reduced them to heading-only pages.

## 9. Stage 2 semantic audit

| Section | Detected type | Human source structure | Result | Notes |
| ------- | ------------- | ---------------------- | ------ | ----- |
| Learning Objectives | `list` / `concept-card` | checklist / overview | CORRECT | Five independent objectives stay non-procedural. |
| Introduction | `list` / `concept-card` | Technical Control definition | INCORRECT | The term and its meaning are three flat points. |
| Physical Design | `list` / `concept-card` | concept with explicit two-part hierarchy | INCORRECT | `Security Technologies` and `Physical Security` are not attached to `two parts`. |
| Physical Design Process | `procedure` / `process-step` | four-step procedure | CORRECT | Step order is represented in one composite semantic target. |
| Firewalls | `list` / `concept-card` | definition and implementation forms | CONSERVATIVE-BUT-VALID | Definition wording and forms remain in the same section. |
| Firewall Categorization | `list` / `concept-card` | three-way classification | CONSERVATIVE-BUT-VALID | The dimensions are retained, but not linked to their later members. |
| Categorized by Processing | `concept` / `concept-card` | presentation divider | INCORRECT | Empty academic plan with no semantic units. |
| Packet Filtering | `list` / `concept-card` | alias plus characteristics | CONSERVATIVE-BUT-VALID | Alias and properties remain together. |
| Application-Level Gateways | `list` / `concept-card` | alias plus characteristics | CONSERVATIVE-BUT-VALID | Proxy alias remains in the section. |
| Circuit-level Gateways | `list` / `concept-card` | characteristics | CORRECT | Two supported properties remain peers. |
| MAC-layer Firewalls | `list` / `concept-card` | characteristics / ACL relationship | CONSERVATIVE-BUT-VALID | The ACL statement remains intact. |
| Hybrids | `list` / `concept-card` | concept plus component combinations | CORRECT | All combinations remain in the same section. |
| Categorized by | `concept` / `concept-card` | presentation divider | INCORRECT | The wrapped title is truncated in Stage 1 and has no semantic units. |
| First Generation | `list` / `concept-card` | properties plus explicit example | INCORRECT | `Ex. FTP...` is not detected as an example relationship. |
| Second Generation | `list` / `concept-card` | properties | CORRECT | Stateful characteristics remain together. |
| Third Generation | `list` / `concept-card` | two type-to-characteristic groups | INCORRECT | Application Firewall and NGFW properties are flattened. |
| Categorized by Structure | `concept` / `concept-card` | presentation divider | INCORRECT | Empty academic plan with no semantic units. |
| Commercial Grade | `list` / `concept-card` | two forms | CORRECT | Both forms are retained. |
| SOHO Firewall | `list` / `concept-card` | acronym expansion plus characteristics | CONSERVATIVE-BUT-VALID | The expansion remains adjacent but is not a definition unit. |
| Residential Grade | `list` / `concept-card` | characteristics | CORRECT | Three properties remain peers. |
| Packet Filtering Routers | `list` / `concept-card` | concept plus nested disadvantages | INCORRECT | `Disadvantages` and its three children become four peer points. |
| Screened Host Firewalls | `list` / `concept-card` | architecture plus relationships / diagram | CONSERVATIVE-BUT-VALID | Page 24 text is coherent; the diagram never reached planning. |
| Dual-homes Firewalls | `category-hierarchy` / `concept-card` | three supported parent-child groups | CORRECT | All three groups and children are preserved. |
| Screened Subnet Firewalls | `list` / `concept-card` | concept plus `Common Implementation` group | INCORRECT | The explicit group label and three relationships are flattened. |
| BEST PRACTICES FOR FIREWALLS | `procedure` / `process-step` | numbered rule set / checklist | INCORRECT | Action-led recommendations are incorrectly treated as a dependent sequence. |

Stage 2 detected 0 definition units, 3 relationship groups, 2 ordered procedures, and 0 example groups. Human inspection finds one real procedure, several term/meaning relationships, multiple explicit groups, and one explicit example.

## 10. Live Reviewer result

* Model: `gpt-4o`, through the unchanged production API Responses provider
* Extraction duration: 195 ms
* Generation duration: 68,548 ms
* Retries: 0
* Fallback: 0 sections; 25 originally generated, 0 repaired
* Sections: 25
* Semantic coverage: `passed`, 1.00
* Covered targets: 84/84
* Grounding: `passed`, 1.00
* Relationship issues: 0
* Leakage: `passed`, 0 issues

The generated Markdown and JSON are unedited renderings of the captured `ReviewerOutput`.

## 11. Explanation audit

| Section | Result | Notes |
| ------- | ------ | ----- |
| Learning Objectives | NOT NEEDED | The five objective rows are self-explanatory. |
| Introduction | MISSING-WHEN-USEFUL | A short explanation should associate `Technical Control` with the following definition. |
| Physical Design | USEFUL | Source-grounded orientation is present, although it ends with the awkward `parts:.`. |
| Physical Design Process | MISSING-WHEN-USEFUL | The sequence is compressed into one key point without an orienting sentence. |
| Firewalls | MISSING-WHEN-USEFUL | The definition is relegated to a long key point. |
| Firewall Categorization | NOT NEEDED | A short three-item classification list needs no filler. |
| Categorized by Processing | FILLER | Explanation and key point both merely repeat the presentation divider. |
| Packet Filtering | USEFUL | Short, source-grounded explanation identifies the examined packet information. |
| Application-Level Gateways | MISSING-WHEN-USEFUL | A proxy-mediated concept would benefit from one short orientation. |
| Circuit-level Gateways | NOT NEEDED | Two clear properties are enough. |
| MAC-layer Firewalls | USEFUL | The source-supported host-identity sentence orients the section. |
| Hybrids | MISSING-WHEN-USEFUL | The defining combination statement remains only a key point. |
| Categorized by | FILLER | Explanation and key point only reconstruct the divider text. |
| First Generation | MISSING-WHEN-USEFUL | Statelessness would be a useful short orientation. |
| Second Generation | MISSING-WHEN-USEFUL | Stateful connection tracking would be a useful short orientation. |
| Third Generation | MISSING-WHEN-USEFUL | The two nested product concepts are not oriented. |
| Categorized by Structure | FILLER | Explanation and key point only repeat the divider. |
| Commercial Grade | NOT NEEDED | Two concise form statements are sufficient. |
| SOHO Firewall | USEFUL | The explanation is source-grounded and identifies its inside-to-outside role. |
| Residential Grade | NOT NEEDED | Three concise characteristics are sufficient. |
| Packet Filtering Routers | USEFUL | Short supported behavior statement; the disadvantage grouping remains separate issue. |
| Screened Host Firewalls | USEFUL | Correctly orients the combined architecture. |
| Dual-homes Firewalls | MISSING-WHEN-USEFUL | The groups are accurate but lack a concise architectural overview. |
| Screened Subnet Firewalls | MISSING-WHEN-USEFUL | A DMZ-based orientation would improve the flat implementation rows. |
| BEST PRACTICES FOR FIREWALLS | NOT NEEDED | A checklist needs scan-friendly rows, not prose filler. |

There are 9 non-empty explanations. Six are useful source-grounded explanations; three are divider filler. No outside explanation was found.

## 12. Reviewer structure audit

| Dimension          | Result | Notes |
| ------------------ | ------ | ----- |
| Section boundaries | PARTIAL | Major substantive topics are easy to locate, but three divider-only sections are emitted and taxonomy parents are disconnected from their children. |
| Key points | PARTIAL | Factual completeness is strong, but the two procedures/checklists are each serialized as one very long visible row, and several group labels are peers rather than parents. |
| Definitions | PARTIAL | Alias/meaning text is retained in the right section, but Stage 2 creates zero definition units and does not explicitly associate Technical Control or SOHO with their meanings. |
| Hierarchy | PARTIAL | Dual-homes hierarchy is preserved; Physical Design, Packet Filtering Router disadvantages, Third Generation, and Screened Subnet relationships are flattened. Diagram hierarchy is absent before Stage 0. |
| Procedures | PARTIAL | The real Physical Design Process retains order, but the Best Practices checklist is falsely treated as a procedure. Both become single dense rows. |
| Comparisons | PARTIAL | Processing modes, development eras, and structures remain distinct, but the category-to-member relationship is only inferable from adjacency and redundant divider sections. |
| Examples | PARTIAL | The FTP example stays in First Generation and no example is invented, but Stage 2 does not model the explicit example association. |
| Repetition | PARTIAL | Textual best-practice continuation merges correctly; repeated diagram slides are suppressed instead of contributing evidence. |
| Presentation noise | FAIL | Course title, architecture divider, references, branding, and footer are removed, but three category dividers appear as study sections. |
| Source fidelity | PARTIAL | Visible factual wording is source-supported and lecturer terminology is preserved; structural meaning and four diagrams are incomplete. Existing PDF mojibake is preserved rather than silently corrected. |

## 13. Semantic verification audit

| Section | Coverage | Grounding | Relationships | Notes |
| ------- | -------- | --------- | ------------- | ----- |
| Learning Objectives | 5/5, 1.00 | 1.00 | 0 issues | Truthful for the five planned list points. |
| Introduction | 3/3, 1.00 | 1.00 | 0 issues | Does not notice the missing term-definition association. |
| Physical Design | 5/5, 1.00 | 1.00 | 0 issues | Does not require the explicit two-part relationship. |
| Physical Design Process | 1/1, 1.00 | 1.00 | 0 issues | Composite procedure target preserves all four steps and order. |
| Firewalls | 2/2, 1.00 | 1.00 | 0 issues | Factual content is complete. |
| Firewall Categorization | 4/4, 1.00 | 1.00 | 0 issues | Does not connect dimensions to later sections. |
| Categorized by Processing | 1/1, 1.00 | 1.00 | 0 issues | A divider with zero source items still receives a synthetic one-target pass. |
| Packet Filtering | 4/4, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Application-Level Gateways | 3/3, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Circuit-level Gateways | 2/2, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| MAC-layer Firewalls | 3/3, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Hybrids | 4/4, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Categorized by | 1/1, 1.00 | 1.00 | 0 issues | A divider with zero source items still receives a synthetic one-target pass. |
| First Generation | 5/5, 1.00 | 1.00 | 0 issues | Does not require the explicit example association. |
| Second Generation | 4/4, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Third Generation | 6/6, 1.00 | 1.00 | 0 issues | Does not require type-to-property associations. |
| Categorized by Structure | 1/1, 1.00 | 1.00 | 0 issues | A heading-only divider is certified as complete study content. |
| Commercial Grade | 2/2, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| SOHO Firewall | 4/4, 1.00 | 1.00 | 0 issues | Association is only implicit. |
| Residential Grade | 3/3, 1.00 | 1.00 | 0 issues | Truthful for planned points. |
| Packet Filtering Routers | 6/6, 1.00 | 1.00 | 0 issues | Does not require `Disadvantages` to own its three children. |
| Screened Host Firewalls | 5/5, 1.00 | 1.00 | 0 issues | Truthful only for page 24 text; diagram evidence is absent. |
| Dual-homes Firewalls | 3/3, 1.00 | 1.00 | 0 issues | Three composite parent-child targets are correctly preserved. |
| Screened Subnet Firewalls | 6/6, 1.00 | 1.00 | 0 issues | Does not require `Common Implementation` ownership. |
| BEST PRACTICES FOR FIREWALLS | 1/1, 1.00 | 1.00 | 0 issues | A single composite procedure target certifies an incorrectly inferred procedure relation. |

The report-level 84/84 is truthful only relative to Stage 2's own plan. It is not truthful relative to the independent source inventory because it certifies three noise sections, omits diagram-only academic evidence, and treats a checklist as a procedure. Stage 4 and Stage 5 therefore expose a plan-trust blind spot.

## 14. Human grounding findings

| Content | Classification | Source evidence / notes |
| ------- | -------------- | ----------------------- |
| All ordinary visible factual key points | SUPPORTED | Manual comparison found their wording in the native page evidence; no outside cybersecurity fact was added. |
| Six useful non-empty explanations | SUPPORTED | Each is a short source excerpt or conservative source-grounded sentence. |
| `Categorized by Processing Mode`, `Categorized by Development Era`, and `Categorized by Structure` | SUPPORTED | The words exist on divider slides, but using each as both explanation and key point is presentation-noise leakage, not factual fabrication. |
| Physical Design `two parts` rendered as four peer points | UNSUPPORTED RELATIONSHIP | No false fact is added, but the source-supported parent-child relationship is lost. |
| First Generation FTP example | SUPPORTED | It remains in the correct section; its example role is not represented. |
| Packet Filtering Router disadvantages as peer rows | UNSUPPORTED RELATIONSHIP | The source visually nests three disadvantages under `Disadvantages`; the Reviewer flattens the ownership. |
| Dual-homes parent-child rows | SUPPORTED | NIC, additional-protection, and NAT labels each retain their source child. |
| Screened Subnet `Common Implementation` as a peer row | UNSUPPORTED RELATIONSHIP | The following three connection statements are source-supported children of that label. |
| Best Practices presented as a procedure | UNSUPPORTED RELATIONSHIP | The source is a numbered rule set; it does not state dependency or sequence. |
| Invented examples or outside definitions | SUPPORTED | None were found. |

## 15. Visual/layout extraction audit

| Page / structure | Preservation | Reviewer impact | Notes |
| ---------------- | ------------ | --------------- | ----- |
| Page 4 two-part Physical Design hierarchy | PARTIALLY PRESERVED | Hierarchy flattened | Text and all labels survive, but indentation/ownership does not. |
| Page 15 Stateless details and FTP example | PARTIALLY PRESERVED | Example role flattened | Words survive; nested and example relationships are not represented. |
| Page 17 Application Firewall and NGFW groups | PARTIALLY PRESERVED | Properties become peers | Text survives without dependable visual grouping. |
| Page 23 `Disadvantages` group | PARTIALLY PRESERVED | Three disadvantages become peer bullets | Native text does not retain indentation strongly enough for the current planner. |
| Page 25 Screened Host diagram | MISSING | Topology, trusted/untrusted placement, proxy/application firewall flow, and blocked traffic labels are absent | Production accepts the repeated heading as usable native text and never invokes OCR/layout recovery. Owning layer: SOURCE EXTRACTION. |
| Page 27 Dual-homed Host diagram | MISSING | NAT placement, external/internal filtering routers, proxy access, and trust-boundary detail are absent | Page 26 text limits the study impact but does not replace the diagram. Owning layer: SOURCE EXTRACTION. |
| Page 28 `Common Implementation` nesting | PARTIALLY PRESERVED | Relationships are flat | All words survive, but label ownership is lost. |
| Page 29 Screened Subnet DMZ diagram | MISSING | DMZ, bastion host, proxy access, and filtering-router relationships are absent | Owning layer: SOURCE EXTRACTION. |
| Page 30 concrete screened-subnet topology | MISSING | Internet/router/firewall/DMZ/LAN gateway placement and example addresses are absent | Owning layer: SOURCE EXTRACTION. |
| Pages 31-32 numbered best practices | FULLY PRESERVED | All twelve items retained once | Layout and number order survive; the later semantic classification is wrong. |

## 16. Intro-overfit audit

| Behavior | Result | Evidence |
| -------- | ------ | -------- |
| Course-title, references, branding, and footer suppression | GENERALIZES | Pages 1 and 33 plus recurring template elements do not appear. |
| Wrapped or taxonomy-specific divider suppression | CONFIRMED OVERFIT | Pages 8, 14, and 18 become study sections while Intro's simpler dividers were suppressed. |
| Legitimate short text sections | GENERALIZES | Commercial Grade and concise gateway slides remain. |
| Textual continuation merging | GENERALIZES | Pages 31-32 merge with every item once. |
| Visual-only repeated continuation handling | POSSIBLE OVERFIT | Pages 25, 27, and 29-30 are treated as dividers instead of continuations, but missing extraction evidence is the primary cause. |
| Definition detection under new formatting | POSSIBLE OVERFIT | Firewalls produces zero definition units despite term/meaning and alias material. |
| Same-page explicit hierarchy | GENERALIZES | Dual-homes produces three correct `group` units. |
| Label-followed group detection | POSSIBLE OVERFIT | `two parts`, `Disadvantages`, and `Common Implementation:` remain flat. |
| True procedure recognition | GENERALIZES | Physical Design Process is correctly ordered. |
| Action-led numbered checklist distinction | CONFIRMED OVERFIT | Best Practices is classified and rendered as a procedure. |
| Explicit example recognition under new syntax | POSSIBLE OVERFIT | `Ex. FTP...` stays in the right section but is not an `example-group`. |
| Semantic verifier independence | POSSIBLE OVERFIT | 1.00 coverage and grounding merely reproduce wrong Stage 1/2 assumptions. |

## 17. Barebones-format compliance

| Requirement | Result | Evidence |
| ----------- | ------ | -------- |
| Natural section titles | PARTIAL | Most titles are natural; `Introduction`, `Categorized by Processing`, and `Categorized by` are weak or truncated. |
| Short explanations where useful | PARTIAL | Six useful explanations, several missed opportunities, and three filler divider explanations. |
| Concise key points | PARTIAL | Most rows are concise; the process and best-practice rows are very long. |
| One idea per visible row | FAIL | Each composite procedure/checklist row contains 4 or 12 separate actions. |
| Meaningful hierarchy preserved | PARTIAL | Dual-homes passes; several explicit groups and all diagram relationships are lost. |
| Ambiguous hierarchy not invented | PASS | No unsupported parent-child edge was invented from ambiguous diagrams. |
| Definitions associated correctly | PARTIAL | Text remains local to the right section, but Stage 2 creates no definition units. |
| True procedures preserve order | PASS | Physical Design Process retains steps 1-4 in order. |
| Ordinary lists remain non-procedural | FAIL | Best Practices is a false procedure. |
| Comparisons remain understandable | PARTIAL | Category members are findable, but classification ownership is not explicit. |
| Examples stay associated | PARTIAL | FTP remains in First Generation, but its explicit example role is flattened. |
| Repetition reduced | PASS | No textual content is duplicated across continuation slides. |
| Presentation noise removed | FAIL | Three category divider sections survive. |
| Lecturer terminology preserved | PASS | Source terminology, grammar, spellings, and aliases remain. |
| No outside knowledge | PASS | Manual audit found none. |
| No unsupported relationships | FAIL | Checklist-as-procedure is unsupported; several supported relationships are also lost. |

## 18. Generalization by pipeline layer

| Layer | Intro B4 | Firewalls B5 | Generalizes? | Notes |
| ----- | -------- | ------------ | ------------ | ----- |
| Extraction | PARTIAL | PARTIAL | PARTIAL | Both decks retain native text but lose academically meaningful visual relationships. Firewalls adds four diagram-only continuation pages. |
| Stage 0 | PASS | PARTIAL | PARTIAL | Most roles are correct, but three category dividers become academic and four visual continuation titles become dividers. |
| Stage 1 | PASS | PARTIAL | PARTIAL | Major concepts are distinct, but three empty divider sections are emitted and taxonomy ownership is not retained. |
| Stage 2 | PASS | PARTIAL | PARTIAL | Real procedure and Dual-homes groups work; checklist distinction, definitions, examples, and several groups do not. |
| Stage 3 | PASS | PARTIAL | PARTIAL | It faithfully serializes the plan without outside knowledge, but exposes noise and dense composite rows from the flawed plan. |
| Stage 4 | PASS | PASS internally / PARTIAL manually | PARTIAL | 84/84 is exact against the plan, not against the human source inventory. |
| Stage 5 | PASS | PASS internally / PARTIAL manually | PARTIAL | Lexical grounding is strong; the wrong checklist relationship passes because it originates in Stage 2. |
| Stage 6 | PASS | PARTIAL | PARTIAL | Assembly is correct for accepted inputs but publishes all three noise sections as `complete`. |

## 19. Intro B4 vs Firewalls B5 metrics

| Metric | Intro B4 | Firewalls B5 |
| ------ | -------: | -----------: |
| PDF pages | 32 | 33 |
| Extracted characters | 6,621 | 6,997 |
| Extracted words | 957 | 992 |
| Structured blocks | 62 | 60 |
| Outline sections | 17 | 25 |
| Semantic targets | 110 | 84 |
| Reviewer words | 747 | 876 |
| Non-empty explanations | 4 | 9 |
| Definition units | 6 | 0 |
| Relationship groups | 7 | 3 |
| Ordered procedures | 1 | 2 (1 false positive) |
| Retries | 0 | 0 |
| Fallback sections | 0 | 0 |
| Coverage | 1.00 | 1.00 |
| Grounding | 1.00 | 1.00 |
| Semantic relationship issues | 0 | 0 |

Intro word count was recomputed from its B4 JSON. Its definition/group counts are the B3/B4 semantic-plan diagnostics. Firewalls metrics are from the fresh B5 capture. They are diagnostic and were not used as optimization targets.

## 20. Student-use verdict

If Firewalls.pdf were the material I needed to study tonight, would I actually use this Reviewer?

Yes, but only as a secondary checklist beside the PDF, not as the final standalone Reviewer. It makes the major firewall types and architectures easy to find, retains nearly every native-text fact, preserves the real Physical Design Process order, keeps all twelve best practices, removes references and branding, and adds no outside cybersecurity material.

I would still reopen the PDF for the conceptual map. The Reviewer does not clearly show which firewall types belong to Processing Mode, Development Era, or Structure; it loses four architecture diagrams; it flattens disadvantages and common-implementation relationships; and it presents twelve independent best practices as one dense procedure row. The three `Categorized by...` filler sections slow scanning and make the apparently perfect `Grounded` status less trustworthy. It remains barebones, but not reliably self-sufficient.

## 21. Defects discovered

### DEFECT-1

* Severity: P1
* Owning layer: STAGE 0 - NORMALIZATION
* Observed behavior: Wrapped and taxonomy-specific divider slides become academic source blocks, which Stage 1 emits as `Categorized by Processing`, `Categorized by`, and `Categorized by Structure` sections.
* Source evidence: Pages 8, 14, and 18 contain only classification-transition titles and no study detail.
* Generated evidence: Each becomes a section whose explanation and sole key point repeat the divider wording; coverage and grounding are both 1.00.
* Study impact: Adds three empty/filler sections and disconnects classification parents from their member topics.
* Intro-specific or general: GENERAL REVIEWER DEFECT; CONFIRMED OVERFIT to simpler divider shapes seen in Intro.
* Generic regression test: A presentation with single-line and wrapped `Categorized by X` transition slides followed by real category slides must suppress the empty dividers while retaining the classification relationship.

### DEFECT-2

* Severity: P1
* Owning layer: STAGE 2 - PLANNING
* Observed behavior: An action-led numbered checklist is classified as `procedure` / `process-step`.
* Source evidence: Pages 31-32 are titled `BEST PRACTICES FOR FIREWALLS` and list twelve independent recommendations without temporal dependency.
* Generated evidence: One visible key point prefixes all twelve items as a single ordered procedure; Stage 4 gives the composite target 1/1.
* Study impact: Makes an exam-oriented checklist difficult to scan and falsely implies sequence/dependency.
* Intro-specific or general: GENERAL REVIEWER DEFECT; CONFIRMED OVERFIT in numbered-list versus process detection.
* Generic regression test: A numbered, action-led best-practices/rules list must remain a non-procedural list, while a numbered workflow containing dependency/transition evidence must remain a procedure.

### DEFECT-3

* Severity: P1
* Owning layer: STAGE 2 - PLANNING
* Observed behavior: Explicit lexical group and example cues are flattened unless they match the narrower hierarchy patterns validated in Intro.
* Source evidence: Page 4 says `made up of two parts`; page 15 marks `Ex.`; page 23 labels `Disadvantages`; page 28 labels `Common Implementation:`.
* Generated evidence: These labels and their following items are peer points, and Stage 2 reports no definition or example units for the entire document.
* Study impact: Students must reconstruct ownership and example meaning, weakening the conceptual map.
* Intro-specific or general: GENERAL REVIEWER DEFECT; POSSIBLE OVERFIT to Intro's particular numbered-parent and `Common example` syntax.
* Generic regression test: Test explicit `N parts:`, `Disadvantages:`, `Common implementation:`, and `Ex.` patterns with child bullets and require conservative grouping without relying on indentation alone.

### DEFECT-4

* Severity: P1
* Owning layer: SOURCE EXTRACTION
* Observed behavior: Pages containing a readable repeated heading plus an academically important diagram pass native-text completeness, so no layout/OCR path captures diagram labels or relationships.
* Source evidence: Pages 25, 27, 29, and 30 visibly contain labeled firewall topologies but expose only 2-3 native-text words.
* Generated evidence: None of those pages contributes a source block to its architecture section; the Reviewer contains only the preceding text slide.
* Study impact: Trust boundaries, DMZ placement, filtering-router roles, NAT placement, and traffic flow cannot be studied from the Reviewer.
* Intro-specific or general: GENERAL REVIEWER DEFECT expressed as a recurring presentation/layout extraction edge case; the same class of limitation existed in Intro.
* Generic regression test: A PDF page with a short native heading and a labeled raster/vector academic diagram must be flagged as layout-incomplete or routed to a layout-aware extraction path, rather than accepted as fully extracted.

### DEFECT-5

* Severity: P1
* Owning layer: STAGE 4 - COVERAGE
* Observed behavior: Semantic coverage reports 1.00 when Stage 1/2 themselves contain noise sections and an incorrect relationship classification.
* Source evidence: The independent inventory excludes three category dividers and classifies Best Practices as a checklist.
* Generated evidence: The divider sections each receive a synthetic 1/1 target, and the checklist receives one composite procedure target; all pass 84/84. Stage 5 also reports zero relationship issues because it trusts the same plan.
* Study impact: `complete`, 1.00 coverage, and 1.00 grounding create confidence that is not justified by source-level structure.
* Intro-specific or general: GENERAL REVIEWER DEFECT; a verifier independence gap rather than a Firewalls-specific rule failure.
* Generic regression test: Inject a source-derived plan containing a presentation-only section and a checklist mislabeled as a procedure; source-level verification must reject or qualify the perfect report instead of certifying the plan's own mistakes.

No P0 defect or outside-knowledge fabrication was found. No defect was fixed in B5.

## 22. Generalization conclusion

* Does the Reviewer generalize beyond Intro? PARTIALLY. It preserves most textual facts, natural substantive boundaries, real procedure order, one supported hierarchy, source terminology, and presentation/reference suppression in a new document.
* Is there evidence of Intro-specific overfitting? YES. Wrapped classification dividers, action-led checklists, and alternate group/example syntax expose confirmed or possible reliance on Intro-shaped patterns.
* Does Firewalls justify another engine implementation pass? YES, but only for the demonstrated general defects: presentation-taxonomy handling, checklist-versus-procedure classification, alternate explicit relationship cues, and verifier independence. No Firewalls-specific heuristic is justified.
* Is any failure only an extraction/layout limitation? YES. The missing topology meaning on pages 25, 27, 29, and 30 is absent before Stage 0 and must not be blamed on Stage 3. This extraction class is recurring and plausibly general, but the specific diagrams are document instances.

## 23. Automated verification

| Command | Result | Notes |
| ------- | ------ | ----- |
| Production-equivalent PDF extraction | PASS (FRESH) | 33/33 native-text pages, 0 OCR, 0 failed/blank/missing pages; 195 ms. Completeness limitation documented separately. |
| Production-equivalent Reviewer run | PASS mechanically / PARTIAL editorially (FRESH) | `gpt-4o`; 68,548 ms; 25 calls; 0 retries; 0 fallbacks; unedited output captured. |
| `npm run typecheck --workspace @stay-focused/engine` | PASS (FRESH) | Exit 0. |
| `npm run build --workspace @stay-focused/engine` | PASS (FRESH) | Exit 0. |
| `npm run eval --workspace @stay-focused/engine` | PASS (FRESH) | 343 passed, 0 failed. |
| `npm run typecheck -- --force` | PASS (FRESH) | 7/7 workspace tasks succeeded; 0 cached. |
| `npm run lint -- --force` | PASS WITH WARNINGS (FRESH) | 7/7 workspace tasks succeeded; 4 unchanged `import/first` warnings in mobile test files, 0 errors. |
| `git diff --check` | PASS (FRESH) | No whitespace errors. |
| `git fsck --full` | PASS (FRESH) | Exit 0; the two dangling blobs from the starting state remain. |

Final engine eval count: 343 passed, 0 failed.

## 24. Credential safety

* Credential rotation still required: YES. B3/B4 recorded an exposed Google service-account credential requiring operational rotation; B5 found no authorized evidence that rotation is complete and did not inspect or rotate it.
* Secret values printed: NO
* New secret committed: NO

The production provider used the repository's existing authorized `.env.local` loading path. Only key presence was checked; no value was printed or copied into an artifact.

## 25. Files created

* `docs/ai/benchmarks/firewalls/current-firewalls-reviewer.md`
* `docs/ai/benchmarks/firewalls/current-firewalls-reviewer.json`
* `docs/ai/benchmarks/firewalls/benchmark-b5.md`

## 26. Git result

* Final HEAD: The benchmark-only commit identified in the final handoff; its parent is `0fb88b957e0554ecff34d55bc80d83d180e40f1d`.
* Benchmark commit: `docs(ai): benchmark reviewer generalization on firewalls` (hash reported in the final handoff).
* Working tree: Only the three benchmark files were present before the benchmark commit; final state was verified clean after commit.
* Ahead/behind: 69 ahead / 0 behind after the benchmark commit.
* Product code changed: NO
* Push performed: NO

## 27. Verdict

`PARTIAL — Firewalls exposes general Reviewer defects that require another engine pass`

Recommended next task: implement one generic Reviewer generalization pass covering presentation-taxonomy divider handling, numbered checklist-versus-procedure classification, alternate explicit group/example cues, and source-level verification regressions; include a layout-incomplete diagram fixture without adding Firewalls-specific heuristics.
