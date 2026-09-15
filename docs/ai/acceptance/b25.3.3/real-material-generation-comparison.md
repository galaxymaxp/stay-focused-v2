# B25.3.3 real-material generation comparison

Date: 2026-09-16. Live OpenAI comparison and content inspection completed.

The user explicitly authorized selected-material OpenAI generation and Google Cloud Vision only where native extraction requires OCR. The prior automatic approval rejection is resolved. No unrelated Canvas data, account details, credentials, messages or student records were transferred. Textbook grade examples are fictional instructional examples. Existing source documents were not edited.

| Case | Source characters / blocks | Reviewer sections / calls / latency | Quiz count / calls / latency |
|---|---:|---|---|
| Original failed B25 CIT6 lecture | 7,167 / 23 | 16 / 1 / 24.760 s | 5 / 1 / 12.604 s |
| Generators in Python, 34 pages | 11,126 / 150 | 22 / 1 / 46.013 s | 5 / 1 / 10.716 s |
| Measures of Central Tendency, 6 pages | 8,764 / 122 | 18 / 1 / 40.216 s | 5 / 1 / 11.403 s |
| Activity two-heading worksheet fixture | Minimal instruction, template and source example | Two required headings / 1 / 2.168 s | Not applicable |

All final outputs passed their contracts without repair. Model: gpt-5.4-2026-03-05. Each complete source fit in one context; no condensation was required. Calls are application-level requests, distinct from possible SDK transport retries. No cost measurement is available.

| Metric | Legacy B25.3.2 | AI-first |
|---|---|---|
| Real lecture provider calls | 4 author + 4 verifier | 1 whole-set Quiz request |
| Real lecture completion | 4/5 accepted; no Quiz saved | 5/5 contract-valid in comparison; production acceptance recorded separately |
| Latency | 63.331 s historical fixture, not comparable real-lecture latency | 12.604 s real-lecture Quiz |
| Local semantic stages | Supports, affordances, blueprints, candidates, ranking, verification and repair | None; context, model, contract validation |
| Student usefulness | No complete production Quiz | Coherent Reviewer; diverse, self-contained mixed Quiz; template-following Activity |
| Source faithfulness | Incomplete Quiz | Source references resolve; inspected outputs broadly faithful, with inherited source defects noted below |

## Inspection and prompt iterations

Initial gpt-4o Reviewer output omitted useful detail and softened a prohibition; Activity added correct but unsupported background. Reviewer and Activity moved to the pinned gpt-5.4 model with explicit detail and source-only instructions. The first gpt-5.4 Reviewer overinterpreted line wraps and range-versus-value specificity as contradictions. Neighboring-block and contradiction instructions were clarified. A later Quiz review found worked-example answer recall; the final prompt requires self-contained data/code and meaningful application. The final three Quiz outputs shown above use that prompt. Earlier successful contracts did not count as quality acceptance.

Final inspection: CIT6 retains deadlines, deliverables, attendance rules and prohibited AI uses. Python retains yield/next/send, examples, infinite-sequence cautions and the worksheet requirements. Statistics retains mean/median/mode formulas and worked examples. Quiz options are plausible, keys/explanations match the questions, and code/data needed for application questions appear in the question. Activity follows exactly How it works and Example with no invented introduction/conclusion or unsupported background.

Limitations: the Python source has Cities/cities capitalization and imprecise pedagogical statements; the Reviewer can reproduce them. The statistics source reports an inconsistent arithmetic result in an example, also reproduced by the Reviewer. Thin validation does not establish mathematical truth or repair instructor source errors. The AI-first boundary improves coherent context and completion, not a guarantee of perfect educational accuracy. No local semantic checker was added to conceal these limitations.

## Source identity and retention

SHA-256 of normalized validation input:

- CIT6: a5c96c619b98828f696f4e38d2ee2d46d3c400b33047e68ac526e309a2369e7f
- Python: 745921817b925ffc0f6dcbbf696504868d4c05376a4079b4ffc91eedb3d2c5cf
- Statistics: 00a13229bcde7a279487dd16cd83b1c51d227b4e975a3187ab989e70c66426bf

CIT6 is the exact selected file behind job d038e85b-ae03-4853-aa2a-f663037415b0, read with owner constraints through existing extraction. The other two use existing native/structured extracts. Temporary inspection content is removed after comparison; only hashes, aggregate metrics and observations are retained. Rejected AI outputs are not durably stored.
