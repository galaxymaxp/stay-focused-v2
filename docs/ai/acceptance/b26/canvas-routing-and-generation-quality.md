# B26 Canvas routing and fresh generation-quality evaluation

Date: 2026-09-17 (Asia/Manila)

Verdict: **PARTIAL — B26 found limited Canvas-routing or generation-quality issues requiring a focused follow-up.**

## Fresh-baseline statement

The evaluation cutoff was `2026-09-16T20:44:00Z`. Only jobs created after that cutoff were used as B26 quality evidence. Historical Reviewer, Quiz, and Activity artifacts were not used as quality samples, and course-outline/orientation material was used only as a negative routing case.

The normal mobile production flow was exercised from the authenticated realme RMX3151 through Expo Go against the production API. Read-only, owner-scoped production metadata was used to identify the resulting jobs and compare stored output with the exact source snapshots. No credentials, private student answers, Quiz answer keys, or raw source bodies are included here.

## Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `0d300ec5c45e024db13750aea038695f51b98419`
- Ahead / behind `origin/main`: 8 / 0
- Dirty files: none
- `git fsck --full`: passed; only pre-existing dangling objects were reported

## Canvas routing audit

### Retrieval and presentation path

The Canvas client retrieves paginated courses, modules/module items, files, Pages, assignments, and announcements. Synchronization persists each object family separately with Canvas identifiers, course/module placement, content metadata, availability/ingestion state, due/submission metadata, and safe timestamps. `listCanvasReviewerSources` previously normalized Pages, files, assignments, and announcements into one source collection; the list endpoint excluded announcements but still exposed assignments and administrative Pages/files in Generate. Tasks independently compose Canvas assignments from the synchronized assignment records. Announcements remain in their own table and were not composed into Tasks.

Live synchronized inventory contained 81 course records, four selected/synchronized courses, 27 assignments, six announcements, 19 files, and 33 Pages. The live negative cases included `Course Syllabus`, `Course Overview`, `Welcome`, instructor/student orientation Pages, and `Course Introduction and Orientation 2026.pdf`.

### Routing table after the local repair

| Canvas object | Retrieved? | Current destination | Intended destination | Correct? | Evidence |
|---|---|---|---|---|---|
| File — learning PDF | Yes | Generate | Generate | PASS | `2. Firewalls.pdf` was ready and generated Reviewer/Quiz artifacts. |
| File — course outline/orientation | Yes | Excluded from Generate by title/module metadata | Exclude/separate | PASS | The synchronized orientation PDF is retained but no longer listed by the repaired source boundary. |
| PPT/PPTX learning material | Yes | Generate after explicit preparation | Generate | PASS | Android lecture PPTX changed from `needs preparation` to `ready`, then generated both artifacts. |
| DOC/DOCX learning material | No live sample | Supported by the Office ingestion path | Generate | NOT SUPPORTED YET | Capability exists in code, but this synchronized dataset contained no DOCX learning file. |
| Canvas lesson Page | Yes | Generate | Generate | PASS | `Fact Gathering Methods` was selected directly from a Canvas Page. |
| Announcement | Yes | Separate persisted announcement records; omitted from Generate and Tasks | Announcements | PARTIAL | Separation is correct, but no dedicated student-facing announcement surface was verified in the current mobile shell. |
| Assignment with deadline | Yes | Tasks; excluded from Generate after repair | Tasks | PASS | Past-due Canvas coursework appears in Tasks with due metadata. |
| Assignment with submission | Yes | Tasks; excluded from Generate after repair | Tasks | PASS | Text-entry/upload assignments remain actionable Activity inputs. |
| Non-actionable Page | Yes | Lesson Pages remain eligible; observed administrative labels/module placements are excluded | Depends on content | PARTIAL | The evidence-backed boundary handles the observed set; arbitrary ambiguous Pages remain unclassified without a broad AI classifier. |

### Intended V2 comparison

| Question | Result | Finding |
|---|---|---|
| A. Are announcements separated? | PARTIAL | Separate storage and no Generate/Tasks mixing passed; dedicated presentation was not verified. |
| B. Are learning files separated from assignments? | PASS | After repair, object type authoritatively excludes assignments from Generate. |
| C. Are actionable/deadline/submittable assignments routed to Tasks? | PASS | Assignment records preserve due dates, submission types, and instructions in Tasks/Activity. |
| D. Are course outlines/orientation documents filtered or separated? | PASS | Observed administrative title/module metadata is filtered locally without deleting the source. |
| E. Are actual lesson Pages eligible for Generate? | PASS | A lesson Page completed both fresh generation flows. |
| F. Are PDF/PPTX/DOCX study materials eligible where supported? | PARTIAL | PDF and PPTX passed live; DOCX has implementation support but no live synchronized sample. |
| G. Does the UI hide raw Canvas details? | PARTIAL | The UI uses readable title/module and `ready`/`needs preparation` states, but still exposes type labels such as Canvas Page/PDF/PPTX. |

Gate A verdict: **PARTIAL — narrow Canvas routing issues were found.** The assignment/admin-content mixing was narrow, repairable, and regression-covered, so Gate B proceeded.

## Generate eligibility repair

The source-list boundary now:

- excludes assignments and announcements by authoritative Canvas object type;
- excludes the administrative titles and module placements actually observed in synchronized data (syllabus, course outline/overview/introduction/orientation, welcome, instructor profile, grading/course requirements, house rules, room assignment, and orientation/general-information modules);
- retains the records for Task or announcement handling;
- keeps lesson Pages and learning files eligible;
- makes no OpenAI call and introduces no general classifier, educational planner, or per-course template.

## Fresh evaluation dataset

### Reviewer / Quiz sources

| Course | Source | Type | Purpose and source structure | Extraction notes | Reviewer job / Quiz job (UTC) |
|---|---|---|---|---|---|
| CC13 Systems Analysis and Design | Fact Gathering Methods | Canvas lesson Page | Mixed definitions, examples, procedures, advantages/disadvantages, interviewing, sampling, questionnaires, observation, and prototyping | Direct Page HTML; approximately 8,227 characters; no OCR | `cc536612…` 20:45:02 / `d44f2f79…` 20:50:03 |
| CC16 IT Security | 2. Firewalls.pdf | PDF lecture | Concept-heavy and technical material: firewall modes/generations, structures, architectures, a worked addressing example, and best practices | Native PDF text; approximately 7,984 characters; diagrams present but no OCR required | `b73acec8…` 20:52:35 / `6f461e76…` 20:54:02 |
| CC17 Mobile Application Design and Development | Module 1 — Introduction to the Android Platform.pptx | PPTX lecture | Definitions/history, languages, features, versions/API levels, architecture/runtime, and mobile development lifecycle | Office/PPTX extraction after normal UI preparation; approximately 9,873 characters across 39 slides; no OCR | `e05778ac…` 20:57:39 / `d3312d3f…` 20:58:57 |

One incidental fresh CC13 control pair was created while navigating before the intended source was selected. It was retained, clearly identifiable by its post-cutoff job IDs, and excluded from the three-source B26 grading dataset.

### Activity assignments

| Course | Assignment | Type | Key Canvas requirements | Resources / personalization |
|---|---|---|---|---|
| CC16 IT Security | Assignment No. 2 / Getting to know | Structured personal reflection/comment | Picture plus name, age, location, hobbies, motto/quote, and course/teacher expectations | No attachment/template; student-specific biography required, so placeholders are mandatory |
| CC16 IT Security | Assignment No. 3 / Research: Top 10 | Research report/presentation | Exactly 10 threats; origin, impact, propagation, mitigation, significance/economic impact/industries/advances, lessons, recommendations, organized presentation, APA references | No academic research sources attached; student research is required |
| CC16 IT Security | Assignment No. 8 / Build Your Own Cipher | Technical design/presentation | Original manual substitution/transposition/hybrid cipher, maximum five steps, 10–15 minute presentation, encrypt/decrypt `MEET AT NOON`, peer instructions, strength/weakness, constrained encrypted-only challenge, and 1–2 page PDF with all group names | No template/attachment; original design and group names must remain student-supplied |

All three assignments were already past due at evaluation time and had actionable submission metadata. They intentionally represent personal reflection, research/report, and technical presentation/template work.

## Reviewer results

Exactly one intended Reviewer was generated per selected source initially.

| Course | Source | Sections | Coverage | Grounding | Organization | Explanation | Study usefulness | Main issue |
|---|---|---:|---|---|---|---|---|---|
| CC13 | Fact Gathering Methods | 10 | PASS | PASS | PASS | PASS | PASS | None observed. |
| CC16 | 2. Firewalls.pdf | 28 | PASS | PASS | PARTIAL | PASS | PASS | Long source became a very granular card sequence; content remained coherent and useful. |
| CC17 | Android Platform PPTX | 31 | PASS | PASS | PARTIAL | PASS | PASS | Slide-derived output was somewhat mechanical/over-segmented. |

All three jobs used one provider call and reported no repair retry. Major concepts, procedures, examples, and source caveats were represented without invented course facts. The Firewalls Reviewer correctly noted that the title/objectives mention VPN while the available detailed content is primarily about firewalls. The Android source contains time-sensitive statements that are now dated, but the Reviewer represented them as supplied rather than silently replacing them with outside knowledge.

Repeated Reviewer issue: two long slide-oriented sources produced more cards than necessary. This is a P2 organization/polish issue (`MODEL_BEHAVIOR`), not a grounding or usefulness failure, so no prompt change was made.

## Quiz results

Each selected source produced one fresh five-question mixed-format Quiz. Every question, option set, keyed answer, and explanation was inspected against the selected source.

| Course | Source | Questions | Supported | Partial | Unsupported | Ambiguous | Distractor quality | Main issue |
|---|---|---:|---:|---:|---:|---:|---|---|
| CC13 | Fact Gathering Methods | 5 | 5 | 0 | 0 | 0 | PASS | None observed. |
| CC16 | 2. Firewalls.pdf | 5 | 5 | 0 | 0 | 0 | PASS | One best-practice statement is counterintuitive, but the item and key faithfully match the source. |
| CC17 | Android Platform PPTX | 5 | 5 | 0 | 0 | 0 | PASS | None observed. |

The questions tested method selection, procedural understanding, architecture/component roles, and applied distinctions rather than only verbatim word matching. Exactly one answer was defensible for every item, distractors were plausible without becoming alternative correct answers, and no external knowledge was required.

Repeated Quiz issues: none observed.

## Activity results

| Course | Assignment | Structure | Counts | Format | Context use | Personalization | Main issue |
|---|---|---|---|---|---|---|---|
| CC16 | Getting to know | PASS | PASS | PARTIAL initially; PASS on rerun | PARTIAL initially; PASS on rerun | PASS | Initial draft included all six text fields but omitted the mandatory picture cue. |
| CC16 | Research: Top 10 | PASS | PASS | PASS | PASS | PASS | Correctly produced a ten-item research scaffold rather than fabricating unsourced threat research. |
| CC16 | Build Your Own Cipher | PASS | PASS | PASS | PASS | PASS | None observed. |

### Requirement checks

- Getting to know: initial job `5300c08a…` (21:01:02Z) used editable placeholders for every personal text field and made no autobiographical claim, but omitted the picture instruction. The one permitted rerun, `cd76c83e…` (21:15:09Z), included the picture cue and all six fields. Classification: `INTERMITTENT`.
- Research Top 10: job `83db0d5c…` (21:02:35Z) reserved exactly ten candidates, repeated all required analysis dimensions, added comparative analysis/conclusion/recommendations, required APA citations, and explicitly warned that the student must supply researched facts because Canvas provided no research sources.
- Build Your Own Cipher: job `738f3e1f…` (21:04:45Z) covered the manual/original/maximum-five-step rules, input/key/encryption/decryption/output, full required demo in both directions, peer use, one strength/weakness, the 1–3 word and 4–10 letter encrypted-only challenge, presentation timing, the 1–2 page PDF, and all group names. It did not invent a cipher or group identity.

Repeated Activity issue: none across the dataset. The only mandatory-requirement omission was not reproduced on the single allowed rerun.

## Failures, root causes, and reproducibility

| Case | Severity | Failure | Root cause | Evidence | Reproduced? |
|---|---|---|---|---|---|
| Generate list before repair | P1 | Assignments and administrative Pages/files appeared beside study materials | CANVAS_ROUTING | Live lists across selected courses plus the pre-repair list boundary | CONSISTENT before repair |
| Getting to know initial Activity | P0 | Mandatory picture cue omitted while all personal text fields were preserved | MODEL_BEHAVIOR | Complete Canvas instructions reached the model; first output omitted only picture, one rerun included it | INTERMITTENT |
| Announcement experience | P2 | Separate records exist, but no dedicated mobile announcement surface was verified | UI_PRESENTATION | Code/data trace and current mobile shell | CONSISTENT limitation |
| Long slide-based Reviewers | P2 | Card organization was overly granular | MODEL_BEHAVIOR | 28- and 31-section artifacts, with otherwise complete grounded content | CONSISTENT in 2/3 long sources |

No reproducible P0/P1 generation-quality failure was found. The reproducible routing P1 was repaired locally. The intermittent Activity omission does not justify prompt optimization or a deterministic requirement planner under the B26 repair policy.

## Repairs and regression

Issue: actionable assignments and observed administrative course content were exposed by the Generate list endpoint.

Smallest repair: add a metadata-first eligibility boundary at the existing Canvas source-list boundary. Canvas type routes assignment/announcement objects; a compact evidence-backed set of normalized administrative title/module patterns handles the observed ambiguous Page/file cases. The source records are not deleted or reclassified globally.

Regression coverage proves:

- announcements are not returned by Generate;
- assignments are not returned by Generate and remain covered by existing Task composition tests;
- a lesson Page and learning PDF remain eligible;
- `Course Syllabus` and `Course Introduction and Orientation 2026.pdf` are excluded;
- source capability listing remains provider-free.

The focused post-repair source suite passed 28/28, including the previously failing assignment/admin cases and the learning-material control. No generation prompt, provider, extraction, schema, workflow, or database code changed. Because the local repair was not deployed in this task, the production UI still requires a deployment/device routing confirmation.

## Verification

| Suite | Result | Count / notes |
|---|---|---|
| Focused Canvas source regression | PASS | 28/28 |
| Canvas | PASS | 73/73 |
| API | PASS | 865 passed, 3 skipped (868 total) |
| Engine | PASS | 606/606 |
| Mobile | PASS | 451/451 |
| Shared | PASS | 44/44 |
| OpenAI provider contract | PASS | 19/19 |
| Root typecheck | PASS | 7/7 workspaces |
| Root lint | PASS | 7/7 workspaces; four pre-existing mobile test warnings, zero errors |
| API production build | PASS | Next.js build completed, 28 static pages plus dynamic routes |
| Root production build | PARTIAL | Five cached package builds and API compilation passed; mobile export could not resolve `expo-router` because this checkout links it from an external installation that Metro does not follow |
| OCR | NOT APPLICABLE | No OCR/extraction code changed; live PDF/PPTX sources used native/Office extraction |
| Workflow | NOT APPLICABLE | No job/runtime code changed |
| `git diff --check` | PASS | Production and staged documentation diffs are clean |
| `git fsck --full` | PASS | Final check completed; only pre-existing dangling objects were reported |

## Limitations

- Three historical/past-due courses were inspected; one had an explicit final-grade/completion signal, while Canvas supplied no reliable course-end flag for the other two.
- Live learning material types were Canvas Page, PDF, and PPTX. DOCX support was code-audited but not live-tested because no synchronized DOCX was available.
- Legacy DOC/PPT and advanced Office layout/media fidelity remain unsupported; scanned-image/OCR generation was not exercised.
- The connected account exposed 81 course records but only four selected/synchronized courses, so this is not evidence for all institutions or course configurations.
- Three intended Reviewer sources, three matching Quiz sources (15 inspected questions), and three Activity assignment types were graded.
- A dedicated announcement surface, live DOCX, scanned-image/OCR material, Canvas New Quiz content, arbitrary ambiguous non-actionable Pages, and all school-specific permissions could not be verified.
- The routing repair is local and was not pushed, merged, or deployed.
- The sample does not prove human-expert quality or perfect stochastic reliability.

## Final verdict

**PARTIAL — B26 found limited Canvas-routing or generation-quality issues requiring a focused follow-up.**

Recommended next task: deploy the focused routing repair, confirm the repaired Generate/Tasks/announcement separation on the physical device, and run a bounded Activity instruction-reliability sample centered on attachment/picture requirements before changing prompts.
