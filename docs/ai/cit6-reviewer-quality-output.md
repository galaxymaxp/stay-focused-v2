# CIT6 real-course reviewer quality acceptance

Audited: 2026-08-30, Asia/Manila.

Verdict: **PARTIAL — usable after outline repair, but not yet capstone-ready.**

## Runtime evidence

The first generation used the physical Android PDF flow and hosted durable
pipeline. Job `0bf550ce-6bd2-4fb7-a24f-b5d526db06e4` completed with
`openai:gpt-4o` in 61,740 ms after 1,724 ms queue wait. It planned and assembled
10 sections, made 11 provider calls with one repair, used no fallback, and
reported coverage 1.00, grounding 1.00, and leakage passed.

Human audit failed that first output despite the green metrics: most course
content was dumped into `About the Course`, grading and requirements were
flattened into oversized bullets, `DROPPED (UD)` and `OSAS (S217)` became
headings, and the OSAS card was a sequence of isolated words. The Reader
rendered the data correctly, so these were engine/source-structure defects,
not hidden UI loss.

After the Stage 0/1 repair, one direct production-provider live retest used the
same exact 7,439-character extraction and `gpt-4o`. It completed in 78,706 ms,
detected/planned/assembled 20 sections, made 22 provider calls with two bounded
repairs, used no fallback, and reported 20/20 source-outline coverage,
grounding 1.00, and leakage passed. No additional factual enrichment appeared.

## Post-fix section audit

| Section | Source coverage | Faithfulness | Missing material | Unsupported material | Study usefulness |
| --- | --- | --- | --- | --- | --- |
| Introduction | Course title/orientation | PASS | None material | None | PARTIAL — repeats title metadata. |
| Table of Contents | Source TOC labels | PASS | None | None | PARTIAL — navigational rather than study content. |
| About the Course | Identity, overview, outcomes | PASS | None | None | PARTIAL — one long source-like overview bullet and empty explanation. |
| Course Content - Midterm | Dates, duration, core topics | PASS | None | None | PASS |
| Unit 1: Research Alignment | All five listed topics | PASS | None | None | PASS, with a repeated slide banner suffix. |
| Unit 2: Project Conceptualization | Design thinking, BMC, prototyping | PASS | None | None | PASS, with a repeated slide banner suffix. |
| Unit 3: Project Pitching | Four listed topics | PASS | None | None | PASS |
| Course Content - Final | Dates, duration, writing/defense topics | PASS | None | None | PASS |
| Unit 4: Technical Writing | Chapters 1-2 and practices | PASS | None | None | PASS |
| Unit 5: The Preliminary Defense | Requirements, deck, practices | PASS | None | None | PASS |
| Grading System | Formula and 50/50 table | PARTIAL | Visual formula/table relationship is weak | None | PARTIAL — flattened layout requires reconstruction. |
| Grade Markers | Failed, UD, INC rules | PASS | None | None | PASS |
| Course Requirements | Final project/team deliverable | PASS | None | None | PASS |
| Course Requirements - Midterms | All unit submissions | PASS | None | None | PARTIAL — dense extractive list. |
| Course Requirements - Finals | Chapters, prototype, defense | PASS | None | None | PARTIAL — dense extractive list. |
| Preliminary Defense | Final-exam/defense fragment | PASS | None | None | FAIL — redundant, very small section. |
| Team Composition | Membership and collaboration rules | PASS | None | None | PASS, with a repeated banner suffix. |
| Submission of Course Requirements | Channels, rejection rules, attendance | PASS | None | None | PARTIAL — too broad and source-like; attendance lacks its own boundary. |
| Process for Re-Admission (for Unofficially Dropped) | Full actor sequence | PARTIAL | Relationships are present but weakly expressed after layout flattening | None | PARTIAL — natural heading fixed, flow remains hard to scan. |
| Intellectual Property and AI Use | Allowed/disallowed use and attribution | PASS | None | None | PASS, with duplicated policy/banner text. |

## Human coverage and grounding

- Major inventory items: 19.
- Covered well: 15.
- Covered partially: grading presentation, submission-table presentation,
  attendance grouping, and readmission-flow relationships.
- Missing: 0.
- Intentionally omittable: TOC-only learning modalities, meeting schedule, and
  instructor labels.
- Unsupported visible facts: 0. The checked output was either source text or a
  close supported paraphrase; enrichment remained `null` and leakage passed.

The initial engine claim of 100% coverage disagreed with the human audit
because coverage was measured against a coarse ten-section Stage 1 outline.
After repair, the 20-section outline agrees reasonably with the human inventory,
although coverage does not measure presentation quality.

## Study usefulness

| Dimension | Score | Notes |
| --- | ---: | --- |
| Organization | 3.8 | Natural units/policies are now separated; TOC and one defense fragment remain. |
| Clarity | 3.6 | Most lists are clear; formula, tables, and readmission flow are not. |
| Conciseness | 3.5 | No generic filler, but repeated banners and dense extracts remain. |
| Completeness | 4.5 | No major source topic is missing. |
| Terminology fidelity | 4.7 | Source names, dates, percentages, and policy terms are retained. |
| Explanation usefulness | 2.7 | Explanations are usually empty; output relies on key points. |
| Key-point quality | 3.5 | Strong for course units; weaker for flattened tables/flow. |
| Section boundaries | 4.0 | Major improvement from 10 to 20 natural sections; two grouping issues remain. |
| Scanability | 3.6 | Reader typography is sound, but several long/raw bullets slow scanning. |
| Exam-review usefulness | 3.6 | Usable as a checklist, not yet a polished reviewer students can use without reconstruction. |

Overall: **3.75/5** (usable but should improve; below the 4.0 capstone-ready
threshold).

## Defects and disposition

1. **HIGH / NORMALIZATION + OUTLINE — coarse outline and false fragments.**
   Unicode bullets were not list lines; dash-separated, numbered-unit, formula,
   and process headings were missed; wrapped all-caps/flow text became headings.
   Fixed with general structural rules and repeated header-only draft removal.
2. **HIGH / COVERAGE VERIFICATION — initial false-positive completeness.**
   Stage 4 correctly checked its input outline, but that outline omitted natural
   sections. The repaired outline makes source-outline coverage meaningful for
   this source. Regression coverage now exercises realistic course-PDF text.
3. **MEDIUM / SOURCE EXTRACTION — tables and flow lose two-dimensional layout.**
   All content survives, but the grading/submission tables and actor flow are
   linearized. Not fixed because this task found no missing extraction and a
   layout-aware PDF parser is a separate ingestion change.
4. **HIGH / GENERATION — extractive source dumping and empty explanations.**
   List-preservation guards retain facts but can fuse slide banners/tables into
   oversized bullets; most explanations remain empty. This is the remaining
   capstone-quality blocker and was not prompt-tuned to CIT6.
5. **LOW / READER PRESENTATION — content defects render faithfully.**
   Save, reopen, headings, bullets, Unicode apostrophes, scrolling, and bottom
   actions work. No raw markup/debug IDs or visually missing data appeared.

## Verification

- Fresh engine build and aggregate deterministic eval: 292 passed, 0 failed.
- New Stage 0 normalization eval and Stage 1 outline eval pass from built code.
- Physical Android: saved the hosted result, returned to Study Library, reopened
  the 10-section reviewer, and scrolled from the first through last section.
  The Reader is operational; screenshots confirmed source dumping and isolated
  readmission words are content defects, not rendering loss.
- The repaired 20-section direct live output was not deployed into the installed
  hosted Android build; Reader presentation was therefore verified against the
  actual durable app result, while repaired content was verified at the exact
  production engine/provider boundary.
