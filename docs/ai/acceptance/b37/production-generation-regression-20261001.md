# B37 production generation regression (2026-10-01)

## 1. Starting state

The working repository was `b25-3-3-work`, branch `b25-3-3-ai-first`, at `fa5719421f153a25b89c4207a2a49205cc7739ad`. Untracked `UI/`, `apps/mobile/.gitignore`, and `tmp/` predated the repair and were not changed. The connected physical device is realme RMX3151, ADB `PB6DWWEIHAUCMZOR`. The installed Android preview runtime is `2.0.1`.

## 2. Canvas Page investigation

The owned Canvas Page row is `61c8c134-9c58-4e67-b39d-7d6ce3ac5bfa`, Canvas Page `1060153`, titled **Unit 3 Lesson 1**. Its stored HTML is 417 characters and its normalized visible text is only the 19-character filename **Unit 3 Lesson 1.pdf**. The HTML links to same-course Canvas file `11574237`; the private link query is intentionally omitted here. The course's synced file inventory held zero files, and no Page file reference was stored. The Files listing could not be used as evidence that the Page link was invalid.

Job `deb4251d-ebe9-4c7c-a8a3-ff3388fd6d8a`, started at 2026-09-30 15:12:53 UTC, succeeded with source row `9351d718-cf7d-4e57-8725-cb0366bbe82a`, `source_character_count=19`, and only that Page in `canvasItemIds`. The realme displayed a saved Reviewer explaining that only the document title was supplied. The prior sync filtered Page links through the known Files inventory, then the Page source mapper treated the filename as ready text. No linked PDF was prepared or extracted for that job.

## 3. Failed PDF investigation

The **UNIT 3 Front-End Development and Web System Design.pdf** source is processing source `3d71b55e-e73e-4b83-afc0-4003ec301453`, job `92621efa-a14a-4340-99d1-b94f9df29b87`. It started 2026-09-30 15:15:14 UTC and failed at 15:16:34 UTC with status `failed`, stage `generating_sections`, code `generation_failed`. Preparation completed. Extraction accounted for all 40 PDF pages using native text, yielded 16,413 characters, and used no OCR chunks. The prepared-source and provenance checkpoint existed before generation.

The provider was called once and returned a 24-section output of about 33,903 serialized characters. Structured validation rejected one emphasis mark because its marked phrase appeared twice in the target text. Grounding and schema checks stayed in force. The one allowed repair path then tried to include the entire rejected output in its prompt, exceeded the 24,000-byte repair allowance, and threw `repair_output_exceeds_budget` before a second provider call. No result persistence was attempted. The server failed; mobile did not misinterpret a successful job.

## 4. Repair

Commit `f334e32` adds same-origin, same-course Page link discovery during sync and owner-scoped attachment resolution at generation admission. The resolver fetches Canvas metadata for only links on that Page, excludes unsupported and administrative filenames, records the file and Page relationship, and prepares the linked file through existing ingestion. A PDF Page job carries both Page and file identities into the deferred worker. The worker requires complete page accounting, combines substantive Page text with extracted PDF text, and retains a two-source provenance manifest. Filename-only Pages without usable instructional text fail with typed `insufficient_source` or `source_attachment_unavailable` instead of publishing a title-only Reviewer.

The generation contract now omits the rejected full output from the single repair prompt when it would exceed the byte allowance; the complete source and validation findings remain, and all existing output checks still run. No schema, grounding rule, RLS policy, or database migration was relaxed.

## 5. Loading and recovery

The material screen enters the existing `GenerationCore` immediately for preparation and for intent submission. Preparation shows its real synchronous fetch/check phase and rejoins the same in-flight request after navigation away and back within the app session. Generation stores one intent, then Queue tracks the durable server stages (queued, preparing, generating, saving, completed, failed). Completion stores and opens the Reviewer; failure displays the server's typed safe reason. A synchronous preparation request is not a durable server job, so a force-stop during that request is not claimed as recovered.

## 6. Automated verification

| Check | Result |
| --- | --- |
| API suite after final source edits | FRESH: 1,109 passed, 3 existing skips |
| Mobile suite | FRESH: 757 passed |
| Canvas client suite | FRESH: 73 passed |
| OCR suite | FRESH: 27 passed |
| Engine evals via TypeScript runner | FRESH: 606 passed, 0 failed |
| Engine repair regression | FRESH: passed |
| TypeScript across seven workspaces | FRESH: passed |
| Lint across seven workspaces | FRESH: passed; four existing mobile test-file warnings, edited screen clean on final targeted lint |
| Production build | FRESH: seven workspaces passed, including Next.js and Android Expo export |
| Git diff check | FRESH: passed |

The first sandboxed lint/build attempts could not read a parent directory; reruns with the required read access passed. The engine package's `npm test` script fails before eval execution on a Node ESM extensionless import from `packages/shared`; `npx tsx evals/run-evals.ts` passed all 606. Regression tests cover A–G and J–O directly; native-text and OCR page accounting cover H/I at the API and OCR layer. Automated tests do not establish physical acceptance.

## 7. Physical-device acceptance

After the user's explicit authorization, the guarded preview command published Android update `01a0f406-bd59-7c2c-b461-cc97b6406fa3` in group `487e86ed-bdec-4f4c-b7d2-782de43d74d2`, runtime `2.0.1`, to the existing **preview** branch. The preflight verified the API address in the EAS preview environment. The connected realme downloaded the new update; after relaunch Expo reported no newer update, and the new preparation UI was visible.

| Case | Physical evidence and result |
| --- | --- |
| 1. Prepare material shows immediate accurate progress | **PASS for “Introduction to Web Information Systems.pdf.”** From `PDF · needs preparation`, tapping Prepare immediately displayed “Preparing source…” with the reading animation and Canvas fetch/check message. It returned to `PDF · ready`. |
| 2. Reviewer generation progresses and opens a valid saved result | **FAIL.** The same PDF immediately entered “Starting your request…” then “Reading your material…”. Fresh job `2a1aab01-23f3-4a2e-8633-c784f74fe250` failed at `generating_sections`, `generation_failed`; Queue showed “Couldn’t finish”, and the detail screen showed the failure. There is no result or Library Reviewer to inspect. |
| 3. Unit 3 Lesson 1 includes actual PDF lesson content and provenance | **NOT RUN.** Stopped after case 2 exposed a genuine defect, as requested. |
| 4. Previously failing 40-page PDF succeeds or reports a proven typed blocker | **NOT RUN.** Stopped after case 2. |
| 5. Force-stop/relaunch recovers a running durable job | **PARTIAL.** The device was force-stopped while job `2a1aab01-23f3-4a2e-8633-c784f74fe250` was `running/generating_sections`. After relaunch, Queue recovered that same job in its failed state. The database has exactly one job for its source snapshot and zero saved results; successful completion/reopening could not be verified. |

The failed source prepared all 33 pages through native text (zero OCR), yielding 10,048 source characters. The worker made two provider calls; both returned structured outputs of 22 and 21 sections. The first output had one emphasis mark whose phrase was missing or non-unique in its target section; the repaired output had two such marks, with the first in section 8. The strict contract rejected the repaired output and no persistence occurred. This is a fresh contract failure after the bounded repair was actually sent, distinct from the original 40-page job's pre-repair budget failure. The safe worker log recorded category `contract`, but filtered colon-containing finding codes from its public log field. No private source text or raw provider response is recorded here.

## 8. Production verification

Vercel production deployment `dpl_4ykMwdFbk5nRqhniBhMWYnsC4ZQm` is READY and aliased to the existing production hostname. The health endpoint returned 200. Allowlisted Cloud Build `142685ec-5d16-4861-91be-ddfd1e22c3be` succeeded. Private Cloud Run revision `generation-worker-00015-5fn` serves 100% of traffic; anonymous health returned 403. The build archive contained only tracked required source and no environment or private key files. No fresh generation job existed in the 20-minute production check after rollout.

Automatic approval review initially rejected the Android preview OTA because it would publish application JavaScript and public configuration to Expo EAS without separately recognized authorization for that payload and destination. The user then explicitly authorized that exact preview publication. No production Expo branch, EAS secret, or EAS configuration was changed. The exact Page and previously failed PDF remain untested on this deployment because the first fresh device generation failed and the user instructed a stop on genuine defects.

## 9. Git result

Implementation commit: `f334e32` (19 scoped files); initial evidence commit: `1c3461f`. Unrelated `UI/`, `apps/mobile/.gitignore`, and `tmp/` remain untracked and untouched. The deployed API and worker were built from an allowlisted archive of `f334e32`. The preview bundle's mobile and package source is byte-identical to `f334e32`; its EAS metadata reports the later documentation-only HEAD `1c3461f`.

## 10. Verdict

**PARTIAL.** Preparation progress and failed-job recovery were physically observed. Fresh Reviewer generation failed strict emphasis validation after the allowed repair. The two exact material retests and successful Reviewer/Library acceptance remain open. No further implementation repair was made after this physical failure.

## B37.1 addendum — optional emphasis repair and fresh production gate (2026-10-01)

This addendum preserves the B37 failure above. Starting HEAD was `f6a5b64` on `b25-3-3-ai-first`. The unrelated untracked `UI/`, `apps/mobile/.gitignore`, and `tmp/` were left untouched.

### Exact failed response diagnosis

Job `2a1aab01-23f3-4a2e-8633-c784f74fe250` has two completed provider checkpoints. The first response has 22 sections and 61 emphasis marks; the repaired response has 21 sections and 58 marks. These are the rejected marks, with only the minimum phrase text shown:

| Response | Section | Target | Phrase | Exact occurrences | Normalization |
| --- | --- | --- | --- | ---: | --- |
| Initial | 13, Improving Decision-Making | key point 4 | “evidence rather than intuition” | 0 | Still absent after NFC, whitespace collapse, case folding, and punctuation removal |
| Repair | 8, CRM and Educational Systems | key point 2 | “automating sales and marketing processes” | 0 | Still absent under the same checks |
| Repair | 12, Improving Decision-Making | key point 3 | “evidence rather than intuition” | 0 | Still absent under the same checks |

The earlier record's “missing or non-unique” wording was a coarse classification: all three were **missing verbatim**, not duplicate phrases. The referenced key points existed (51, 112, and 112 characters respectively). Both outputs had populated titles, explanations, and key points in every section, and every section had one or more references within the 33 supplied block IDs. Removing only invalid emphasis leaves both outputs passing these structural and source-reference checks. Those checks do not independently prove every factual statement is faithful to the PDF; the rejected output was not persisted or physically inspected.

### Architecture and repair

The provider's `reviewer_document` schema and prompt ask the model to select text already present in an explanation or indexed key point. `validateReviewerDocument` validates required study content and source IDs; the previous `validateReviewerEmphasis` threw a fatal contract error for absent, repeated, overlapping, malformed, or over-dense marks. `generateContract` therefore spent its one whole-product repair on optional styling. The assembler stores marks in `sourceCore.emphasis`; the API reader maps them to the shared reader model; the mobile reader and export renderer locate them with `indexOf`. Uniqueness is needed to avoid styling an arbitrary occurrence. A zero-mark section renders its unchanged plain text. Emphasis does not supply study content, source provenance, or coverage.

Commit `587d5f4` keeps the provider schema and substantive prompt, then deterministically retains only well-formed, exact, unique, non-overlapping, sparse marks in the already generated prose. It discards absent or ambiguous marks without changing prose or inventing phrases. Required title, explanation, key-point, and exact source-reference failures remain fatal; source references are checked before emphasis resolution. Emphasis-only defects no longer invoke a provider repair. The existing one repair attempt remains for substantive contract failures. This change does not add semantic source-faithfulness verification to the AI-first path, whose coverage/grounding metadata describes source-reference contract checks.

### Verification and deployment

Focused emphasis tests passed (30 tests across the invoked root Vitest run); the API saved-reader test and mobile zero-emphasis renderer test passed. Fresh full results: API **1,110 passed, 3 existing skips**; mobile **758 passed**; Canvas **73 passed**; OCR **27 passed**; engine TypeScript eval runner **606 passed, 0 failed**. Typecheck, lint, and production build passed across all seven workspaces; lint retained four pre-existing mobile test warnings. Initial lint/build attempts failed because the sandbox denied parent-directory reads; reruns with read access passed. The engine package's `npm test` still fails before eval execution on the existing Node ESM extensionless import from `packages/shared/src/quiz-capacity`; the TypeScript eval runner passed. `git diff --check` passed.

The API deployed from the scoped `587d5f4` archive as Vercel `dpl_EGpVzrU1DYJ6yHQTFpUqEFN4j6P9` (READY, production alias), with HTTP 200 at the public root. Cloud Build `120cb8f9-2616-4069-9eba-f60efdec264c` succeeded; private Cloud Run `generation-worker-00016-dvd` serves 100% of traffic. Anonymous worker health returns 403, and the new worker revision had no ERROR entries in the sanitized post-deploy check. No Expo update, production Expo publication, EAS configuration change, secret change, or migration was made; the existing preview OTA `01a0f406-bd59-7c2c-b461-cc97b6406fa3` stayed on the realme.

### Fresh realme acceptance and stop gate

| Case | Fresh job ID | Result | Device and production evidence |
| --- | --- | --- | --- |
| Introduction PDF | `3ad3df6f-a7e7-4eb2-8c51-0ed63677b436` | **PASS** | Immediate “Starting your request,” then durable generation. The 33-page native-text source had 10,048 characters. The job succeeded after one provider call, with one job for its fresh snapshot and one saved result `21bb2d8a-30f3-459c-a6dc-06acfe8917c1`. The realme opened an 18-topic, readable Reviewer covering WIS introduction, architecture, e-commerce, organizational use, servers, and HTTP/HTTPS; those topic terms are present in the extracted source blocks. Stored output has about 16,094 serialized content characters, references all 33 source blocks, and has 50 valid emphasis marks. Library lists exactly one new Web Information Systems Reviewer; it reopens after relaunch. Artifact `f90b0ba5-eb71-4413-a1a2-cbb11d310c11`, version `2e98a7b9-7dff-4ce1-9208-2dd348a4cd1a`. The visible content is substantive and source-aligned; source-reference validation and topic checks are not an exhaustive factual audit. |
| Unit 3 Lesson 1 Page + linked PDF | **None created** | **FAIL / BLOCKED** | The realme showed immediate “Starting your request,” then “This request could not be completed. Try again.” The production API logged `POST /api/experience/generations` at 05:19:15 Manila time as HTTP 422 `insufficient_source`. Owned Page `61c8c134-9c58-4e67-b39d-7d6ce3ac5bfa` has only 19 visible filename characters. Its HTML still links to file `11574237` on the same Canvas origin and course `67174`; no `canvas_files` row for that file/course was created. Admission therefore reached the branch where no instructional attachment was returned and the Page text was too short. The metadata or eligibility reason for the empty attachment selection is not recorded in the safe logs and remains unresolved. No fresh job, prepared PDF, result, or substantive Page Reviewer exists. The mobile error map lacks `insufficient_source`, so it displayed generic copy despite the typed server response. |
| UNIT 3 Front-End Development and Web System Design.pdf, 40 pages | **Not created** | **NOT RUN** | Stopped after the Unit 3 Page exposed a new admission failure. The previous 24-section repair-budget case therefore remains without a fresh physical retest. |
| Force-stop during durable generation | `3ad3df6f-a7e7-4eb2-8c51-0ed63677b436` | **PASS** | The app was force-stopped while this job was `running/generating_sections`. After relaunch, Queue showed the completed output for the same job; the realme opened it from Queue and Library. Production has one job for its source snapshot, one saved result, and one resulting artifact. This claim concerns an already accepted durable job, not synchronous preparation. |

**B37.1 verdict: BLOCKED.** The emphasis-only generation failure is repaired and the Introduction PDF plus successful durable recovery are physically verified. The Unit 3 Page's linked PDF was not ingested at admission, and the 40-page case was not run after that failure. Do not close B37 until the attachment eligibility cause is established, repaired if appropriate, and both pending materials pass fresh device inspection. No new implementation repair was made after this device failure.
