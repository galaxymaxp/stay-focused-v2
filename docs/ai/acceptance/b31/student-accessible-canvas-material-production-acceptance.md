# B31 student-accessible Canvas material production acceptance

Date: 2026-09-19 (Asia/Manila)

Verdict: **PARTIAL — real student-accessible Canvas text PDF, DOCX, PPTX, and Page sources completed fresh production Reviewer generation, persistence, Queue/background use, and physical Android Library retrieval.** A production routing defect was proven, repaired, tested, and deployed. The real 16-page scanned Accounting PDF now reaches `PDF · ready`, but Reviewer submission is killed by the Vercel runtime for out-of-memory before durable job creation. No eligible instructional PNG/JPEG exists after correct administrative routing. Some requested internal acquisition/provenance fields remain `NOT VERIFIED` because the student UI and sanitized runtime logs do not expose them, and exporting production secrets for direct database inspection was not allowed.

## Starting state

- Branch: `b25-3-3-ai-first`.
- Starting HEAD: `de6bfa34e5929f394de27690bf7d824a307df4c6`.
- `origin/main...HEAD`: 0 behind / 21 ahead.
- Worktree: clean; no unrelated dirty work.
- `git fsck --full`: exit 0 with only pre-existing dangling objects.
- Starting deployment: `dpl_3LCFzi9ao68Upsiir8GFL1kroX82`, READY, production target, canonical alias present.
- Starting health: HTTP 200, `{"status":"ok","version":"2.0.0"}`.

## Device and session

- Physical device: realme RMX3151, Android 13, ADB authorized as `PB6DWWEIHAUCMZOR`.
- App: `com.galaxymaxp.stayfocusedv2`, version 2.0.0, versionCode 1.
- The existing authenticated Student session loaded production Tasks, Generate, Today/Announcements, Queue, and Library. App data and the Canvas identity were not replaced or cleared.
- A Messenger chat-head overlay briefly intercepted taps after relaunch. Messenger was force-stopped without clearing its data; Stay Focused state was unchanged.

## Fresh Canvas inventory and synchronization

The initial normal-device sync covered the four existing selections. B31 then added two concluded courses through Stay Focused course preferences, without changing Canvas content:

- CC17 Mobile Application Design and Development
- CIT6 Capstone Project 1
- CC13 Systems Analysis and Design
- CC16 IT Security
- CIT5 Accounting Essentials
- FL 100 Foreign Culture and Language

The app reported `6 Canvas synchronization jobs started. You can switch apps.` and later `Canvas course synchronization is complete.` Sanitized production request logs exposed aggregate sync job `6d7f38c3-d427-4c8e-ba62-7c72ef69a9cf`; the authenticated app subsequently reloaded all six course health records. An earlier four-course fresh batch exposed job `0d2674e6-1d6e-4eec-8d79-0e06399bc1e8` and a successful Workflow finalize event.

The completed-course inventory materially expanded B28/B30 coverage:

| Course | Canvas grouping | Material | UI type/state before preparation | B31 eligibility |
|---|---|---|---|---|
| FL 100 | Module 0: Course Information Module | Student Handbook, Academic Integrity policy, institutional image, schedules, legacy PPT, Hiragana chart | PDF/image/DOCX/PPT | Excluded after repair because the observed module is administrative |
| FL 100 | Module 1 Unit 1 Greetings | `Module 1 Unit1 Greetings.pdf` | PDF · needs preparation | Included; instructional text PDF |
| FL 100 | Module 1 Unit 1 Greetings | `Learning Outcomes and Performance Indicators-1` | Canvas Page · ready | Included; instructional Page |
| FL 100 | Module 1 Unit 2 Self-Introduction | `UC 2. Self Introduction.pptx` | PPTX · needs preparation | Included; instructional presentation |
| FL 100 | Ungrouped | `FINAL EXAM REVIEWER 2T 23-24.docx` | DOCX · needs preparation | Included; substantive instructional reviewer |
| FL 100 | Ungrouped | `MIDTERM EXAM REVIEWER 2T.docx` | DOCX · needs preparation | Included; not selected because the final reviewer was more comprehensive |
| FL 100 | Multiple lesson modules | lesson Pages and PPTX files | ready / needs preparation / some unavailable | Included when readable and instructional |
| CIT5 | Midterms | `2-Journaling.pdf` | PDF · needs preparation | Included; genuine 16-page image-only Accounting lecture |
| CIT5 | Midterms/Finals | ten other Accounting PDFs | unavailable or needs preparation | Included where supported; not primary fixtures |
| CC13 | lesson modules | ten Canvas Pages | Canvas Page · ready | Included; not reused as the primary B31 course |
| CC16 | learning modules | instructional PDFs/Pages | PDF/Page | Included; retained as comparison inventory |
| CC16 | General Information | `APA Sample.png` | image | Excluded by the accepted administrative-module guard |
| CC13 | ungrouped inventory | logos/banner/profile artwork | image | Excluded by the accepted direct-module image rule |

The prior Canvas-export inspection established that `2-Journaling.pdf` is 8,089,877 bytes, 16 pages, and has zero native text on every page. The current student UI confirms the same course/title through the live Canvas path, but does not expose current byte count or Canvas numeric file ID.

## Production routing defect and repair

Fresh production behavior initially displayed FL 100 `Module 0: Course Information Module` in Generate with eight administrative items, including the Student Handbook, Academic Integrity policy, schedule documents, and an institutional image. This directly violated B31 routing policy.

The smallest repair added the exact normalized observed module label, `module 0 course information module`, to the existing administrative-module guard. It did not add a semantic planner, filename classifier, schema change, provider change, or Canvas mutation. Regression coverage retains a normal ungrouped PDF while excluding a file placed in that exact module.

- Repair commit: `9e29d840dff5e66bdb735d05940b007871f6266c`.
- Deployment: `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`.
- Production URL: `https://stay-focused-v2-prototype-9gj9ur18y-galaxymaxps-projects.vercel.app`.
- Canonical alias: `https://stay-focused-v2-prototype.vercel.app`.
- State: READY, production target.
- Health: HTTP 200, version 2.0.0.

Physical post-deployment refresh changed FL 100 from 14 modules / 37 materials to 13 modules / 29 materials. The administrative module and all eight members disappeared; the first visible group became the real `Module 1 Unit 1 Greetings` lesson.

## Selected fixtures

| Type | Course / internal course record | Module | Fixture | Why selected |
|---|---|---|---|---|
| Text PDF | FL 100 / `6fd5dc09-1f59-4298-b55d-55fa2515ea03` | Module 1 Unit 1 Greetings | `Module 1 Unit1 Greetings.pdf` | Real lesson containing Japanese greetings and classroom expressions |
| Scanned PDF | CIT5 / `dd731b01-9865-4445-8954-4508bc7dd3fa` | Midterms | `2-Journaling.pdf` | Real 16-page image-only Accounting lecture, previously independently measured at 8,089,877 bytes |
| DOCX | FL 100 / `6fd5dc09-1f59-4298-b55d-55fa2515ea03` | Ungrouped | `FINAL EXAM REVIEWER 2T 23-24.docx` | Substantive course reviewer covering vocabulary, patterns, questions, and assessment requirements |
| PPTX | FL 100 / `6fd5dc09-1f59-4298-b55d-55fa2515ea03` | Module 1 Unit 2 Self-Introduction | `UC 2. Self Introduction.pptx` | Real lesson presentation with situations, vocabulary, particles, and patterns |
| Canvas Page | FL 100 / `6fd5dc09-1f59-4298-b55d-55fa2515ea03` | Module 1 Unit 1 Greetings | `Learning Outcomes and Performance Indicators-1` | Real lesson outcomes and practical greeting/classroom-expression indicators |
| PNG/JPEG | none | none | none | The only newly found image was inside the excluded administrative module; previously known APA/artwork images also remain excluded |

Canvas numeric course/file/page/module-item IDs and live file sizes are not displayed by the Student UI or sanitized request logs. They were not recovered by reading credentials or private app state.

## End-to-end results

| Fixture | Discovery | Preparation/extraction | Fresh Reviewer | Persistence and Android | Result |
|---|---|---|---|---|---|
| Greetings PDF | PASS | `PDF · needs preparation` -> HTTP 200 prepare -> `PDF · ready`; resulting content retained Japanese, romanization, English meanings, and classroom expressions | PASS; job `5568cdac-7faf-4b51-9355-36e3e9b93923`; provider request finished in 18,742 ms | PASS; Queue completion, Library open, artifact request later observed as `artifact:2c1212b9-d920-4c96-b3c5-d1e1fc9f6ece` | PASS |
| Self Introduction PPTX | PASS | `PPTX · needs preparation` -> `PPTX · ready`; output retained lesson situations, country vocabulary, question marker, particles, and sentence patterns in sensible order | PASS; fresh 202-backed durable generation completed | PASS; visible among the four newest Library Reviewers and opened on Android | PASS |
| Learning Outcomes Page | PASS | Already `Canvas Page · ready`; normalized content retained learning outcomes, greetings, daily-life reactions, classroom expressions, and performance indicator | PASS; fresh durable generation completed | PASS; Queue completed and Android Library opened the result | PASS |
| Final Exam Reviewer DOCX | PASS | `DOCX · needs preparation` -> HTTP 200 prepare -> `DOCX · ready`; readable ordered headings/vocabulary/patterns/rules, no OOXML garbage | PASS; job `a3ff7851-d2ce-40a8-922c-d675a283dbe3` | PASS; artifact `24a8e4da-4a23-4384-a8d1-9bb96d5a8e8a`; reopened after force-stop/relaunch | PASS |
| 2-Journaling scanned PDF | PASS | HTTP 200 prepare and `PDF · ready` in about 26 seconds | FAIL before durable job creation: two submission attempts returned HTTP 500 and `instance was killed because it ran out of available memory` | No new artifact; Queue retained `Request needs confirmation`; no further retry | PARTIAL / B32 INPUT |

### Reviewer output sanity

All four successful Reviewers were non-empty, source-specific, readable, and free of obvious cross-course mixing.

- Text PDF: `Japanese Greetings and Common Classroom Expressions Reviewer`, nine sections: Core Greetings; Polite and Plain Forms; Home and Daily Routine Expressions; First Meeting and Introduction Expression; Common Classroom Expressions; How Similar Expressions Differ by Situation; Exercise 1; Likely Expression Matches; Source-Supported Irregularities.
- PPTX: `Japanese Self-Introduction and First-Time Meeting Expressions Reviewer`, ten sections: Lesson goals; Situation 1; Country vocabulary; saying your name; saying where you are from; Situation 2; question marker; particle `wa`; particle `mo`/disagreement; useful sentence patterns.
- Canvas Page: `Reviewer on Basic Everyday and Classroom Expressions`, five sections: Learning Outcomes; Greeting Expressions; Reactions to Daily Life Expressions; Basic Classroom Expressions; Performance Indicator.
- DOCX: `Japanese Lesson Reviewer: House, Daily Life, Time, Questions, and Assessment Requirements`, 22 sections covering scope; house/appliance/adjective/place/routine/time/day/month/food/action vocabulary; useful phrases; question forms; verb note; price/place/description patterns; two model-Q&A groups; assessment rules; two assessment parts; and material inconsistencies.

The sanitized logs prove durable 202 admission for the successful flows and OpenAI-adapter completion for the observed text-PDF job, but do not emit the exact production model name. No secret or raw provider payload was accessed.

## Acquisition, validation, OCR, and provenance evidence

What production directly proved:

- Every selected source was returned only within the existing authenticated Student session and owner-selected course context.
- File preparation endpoints returned HTTP 200 and changed the exact Canvas material from `needs preparation` to `ready`.
- Resulting Reviewers visibly correspond to their selected PDF, PPTX, Page, or DOCX source and retained ordered content.
- Job, Queue, Library, and artifact endpoints all remained authenticated and returned HTTP 200/202.
- The deployed implementation still enforces bounded download, extension/MIME/signature policy, stored byte/hash checks, PDF inspection/OCR dispatch, OOXML extraction, HTML normalization, source snapshots, ownership, and persistence; the full API/Canvas regression suites covering those boundaries pass.

Not directly observable from the approved production surfaces:

- live byte counts, redirect chain, magic bytes, and content-type comparison;
- Canvas numeric file/page/module-item IDs;
- source record, source-version, extraction-result, and relationship IDs for every run;
- persisted owner joins and character/page/slide counts;
- exact production model name;
- a provider log proving Vision invocation for the Accounting scan.

Exporting production environment secrets for direct database inspection was rejected and was not circumvented. Therefore those fields are `NOT VERIFIED`, not claimed by inference. No missing persisted provenance row was directly proven.

## Queue/background and Android reopen

- The text-PDF request reached Queue as Generating, the device navigated to Tasks, real CIT5 assignments rendered, and the request completed without keeping the generation screen open.
- Queue later showed all four new successful Reviewers under Completed.
- Library displayed the four new source-specific titles in newest-first order.
- `am force-stop` followed by a normal launcher start retained authentication. Today reloaded CC17 announcements, Library reloaded the four new Reviewers, and the DOCX Reviewer reopened with readable content and navigation.
- Result: Queue/background PASS; authenticated relaunch PASS; Library reopen PASS.

## Routing separation

| Surface | Fresh physical evidence | Result |
|---|---|---|
| Generate | Real lesson PDF/PPTX/DOCX/Pages present; repaired FL 100 administrative module removed; APA/artwork images absent | PASS after repair |
| Tasks | Real CIT5 Accounting assignments such as `2.1-Aling Charing`, `2.2-Good Sister`, and `2.3-Birch` remained actionable | PASS |
| Today/Announcements | CC17 announcements reloaded after app force-stop/relaunch | PASS |
| Instructional image | None naturally eligible | NOT AVAILABLE |

## Scanned-PDF evidence for B32

- Source: CIT5 Accounting Essentials, Midterms, `2-Journaling.pdf`.
- Prior independent binary evidence: 8,089,877 bytes, 16 pages, zero native text on every page.
- B31 preparation start: approximately 23:19:50 +08:00.
- Preparation response: HTTP 200 at 15:19:50 UTC; Android showed `PDF · ready` by the 25-second poll.
- Generation submission attempts: 15:20:33 and 15:22:00 UTC.
- Both outcomes: HTTP 500; Vercel runtime killed the instance for out-of-memory.
- Durable generation job: none created for the scan.
- Provider generation: not reached.
- Artifact: none created.
- OCR invocation/page completion/partial extraction: not exposed by sanitized logs, so not claimed.
- User-visible recovery: Queue retained `2-Journaling.pdf — Request needs confirmation`; server processing list reported nothing processing. No third retry was made.

This is a more precise B32 input than B29: acquisition/preparation can now finish, while synchronous generation admission/context construction exceeds the production function memory limit for the prepared scan.

## Verification

| Check | Result |
|---|---|
| Focused routing test | FRESH PASS, 30/30 |
| API tests | FRESH PASS, 873 passed / 3 skipped |
| Canvas tests | FRESH PASS, 73/73 |
| Root typecheck | PASS, 7/7; 6 cached, API fresh |
| Root lint | PASS, 7/7; four existing Mobile import-order warnings, zero errors |
| Isolated DB/API production build | FRESH PASS outside sandbox; Workflow bundle, Next build, 28 static pages/routes |
| First parallel sandbox build | INTERRUPTED after compile/type phase stopped producing output; superseded by the successful isolated elevated build |
| `git diff --check` | PASS |
| Final `git fsck --full` | PASS with only pre-existing dangling objects |

## Closure and next task

- B31 is **PARTIAL**.
- Text PDF, real Canvas DOCX, PPTX, and Canvas Page are accepted end-to-end through fresh Student-accessible production paths.
- The routing defect is repaired and deployed without architectural redesign.
- Scanned-PDF Reviewer creation is not accepted because generation admission OOMs before durable job creation.
- Canvas instructional-image positive acceptance remains unavailable and does not block the roadmap.
- B32 should isolate the 16-page prepared-scan memory spike and preserve current bounds, ordering, ownership, validation, failure safety, and AI-first architecture.
