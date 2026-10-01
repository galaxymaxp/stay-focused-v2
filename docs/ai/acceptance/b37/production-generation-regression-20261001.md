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

## B37.2 addendum — Canvas Page file eligibility and staging blocker (2026-10-01)

This addendum retains every earlier B37 and B37.1 failure above. Starting branch was `b25-3-3-ai-first` at `03794e2`. Unrelated `UI/`, `apps/mobile/.gitignore`, and `tmp/` remain untouched. The diagnostic-only commit `e03826d` was deployed temporarily to obtain sanitized Canvas decisions; commit `54aa9fd` replaced those logs with the scoped repair. The earlier Introduction PDF result `21bb2d8a-30f3-459c-a6dc-06acfe8917c1` remains accepted; it was not regenerated.

### Live Canvas file and attachment decision

Authenticated Canvas lookup used the existing student's connection, the owned Page's course `67174`, and file `11574237`. The Page HTML contains one same-origin, same-course file reference, repeated in its link metadata. Canvas returned display name `Unit 3 Lesson 1.pdf`, filename `Unit+3+Lesson+1.pdf`, PDF MIME/extension, 1,495,059 bytes, folder `1698211`, a download URL, `locked=false`, `hidden=true`, `hidden_for_user=true`, and visibility `inherit`. No normal course Files inventory row or module-item reference exists for this file. The Page reference is present. Direct authenticated metadata lookup and the existing bounded/redirect-restricted download both succeeded; the bytes have a `%PDF-` signature and passed the MIME/extension/signature validator. No credentials, signed URLs, or document text were logged.

| Stage | Result | Evidence / reason |
| --- | --- | --- |
| Page link discovery | PASS | Owned Page `61c8c134-9c58-4e67-b39d-7d6ce3ac5bfa` exposed the link; one file ID after duplicate suppression. |
| File ID parsing | PASS | `11574237` parsed from the Canvas file path. |
| Same-course validation | PASS | Link and connection origin matched Canvas course `67174`; no arbitrary URL was fetched. |
| Metadata resolution | PASS | Authenticated `getCourseFile(67174,11574237)` returned the metadata above despite the empty normal Files inventory. |
| Eligibility before repair | FAIL | `classifyCanvasFileForIngestion` returned `blocked_unavailable` solely because `hidden`/`hidden_for_user` were true. The Page resolver skipped it, then filename-only Page text caused `insufficient_source`. This is a hidden-flag policy mismatch, not inventory gating, parsing, permission denial, type, size, redirect, or signature failure. |
| Download after scoped repair | PASS | The exact Page-linked file was downloaded through the authenticated Canvas client with existing byte/time/redirect bounds, then downloaded again by ingestion. |
| Signature validation | PASS | PDF signature, declared/response MIME and extension checks passed. |
| Preparation | PASS | New owned file row `5fda44de-1ffc-43e5-b4fd-e89885e1dd72` retained both hidden flags, recorded `eligible_document` only through the verified Page path, and stored 1,495,059 bytes with hash and private object present. The Page reference points to the owned Page row. |
| Source staging | FAIL | Production `stage_deferred_canvas_reviewer_pdf_v1` requires `canvasItemIds` length exactly one with a `file:` item. The actual job snapshot correctly has `[page:61c8c134-9c58-4e67-b39d-7d6ce3ac5bfa, file:5fda44de-1ffc-43e5-b4fd-e89885e1dd72]`. Live function definition confirms the one-item check. API logged `ProcessingJobCreationError` and HTTP 503. |
| Extracted source and Page + file assembly | SKIPPED | Staging rejected the two-source snapshot before worker dispatch or PDF text extraction. No Reviewer text or dual-provenance artifact exists. |

The implementation keeps normal Files behavior unchanged. Only a same-course Page link verified through the owned Canvas connection can request hidden-file preparation. The resolver requires bounded authenticated download and content validation before admitting it; preparation verifies the owned Page reference; ingestion refetches metadata and downloads and validates again. Locked, oversized, unsupported, dangerous, malformed, cross-course, and inaccessible files remain excluded. Mobile now maps `insufficient_source` and `source_attachment_unavailable` to safe, specific copy. The new 503 occurs after generic job-row insertion and is mapped to the safe server-error copy; the two typed Page errors were covered by tests but not encountered in the successful attachment download.

### Verification and rollout

Implementation commit `54aa9fd` contains API attachment/policy/preparation changes and the mobile typed-error map. FRESH API suite: 1,116 passed, 3 existing skips; mobile suite: 760 passed; Canvas client: 73 passed; OCR: 27 passed. API and mobile TypeScript checks passed. Changed API and mobile lint passed. The API production build passed with the required filesystem read access; the first sandboxed build and first mobile lint attempt could not read parent directories and are not counted as passes. `git diff --check` passed. Engine code was unchanged, so engine evals were not rerun; the pre-existing engine `npm test` ESM issue remains separate. The first isolated Expo staging export failed because Metro could not resolve a junctioned `expo-router`; publishing from the clean tracked HEAD in the main repository succeeded. No secret, EAS configuration, migration, grounding rule, or worker code was changed.

Production API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` is READY on the existing production alias; `/api/health` returned 200. Existing private Cloud Run worker `generation-worker-00016-dvd` remains at 100% traffic; it received no Unit 3 dispatch. The Android-only EAS **preview** update group is `4782608a-f5e4-4a43-9020-d566783c3028`, update `01a0f4ef-496a-7c4c-a6e7-52617f4268bd`, runtime `2.0.1`, source HEAD `54aa9fd`. The preview API URL preflight passed. Expo device logs show this update downloaded and pending on the first realme launch, then no update available on the next launch. Production Expo branch and EAS secrets/configuration were untouched.

### Realme Unit 3 gate and stop

Tapping **Generate Reviewer** for Unit 3 Lesson 1 immediately showed “Starting your request…” ([device screenshot](unit3-staging-failure.png)). The API prepared file `11574237`, but the staging RPC failed. One generic job row `dde023f1-65ef-415b-b888-5550bc845494` was left `queued/preparing_source`, `execution_backend=database_worker`, with zero attempts, no Google dispatch, no result ID, one job for its source snapshot, and zero result rows. The realme Queue shows **1 queued** and “Hasn’t started” for Unit 3 ([device screenshot](unit3-queue-blocked.png)); three local “Not started” reconnect entries were also visible, without additional server jobs. The staging-contract diagnosis is based on the actual snapshot shape, live SQL function definition and API 503 log; the API suppresses the raw RPC error, so the precise database exception was inferred from that deterministic predicate. A separate Reviewer artifact was not created, and no substantive output can be inspected.

**Unit 3 physical result: FAIL.** The attachment eligibility and ingestion defect is repaired and physically exercised, but the Page plus file staging contract prevents generation. Per the stop gate, the 40-page `UNIT 3 Front-End Development and Web System Design.pdf` received **no fresh retest**. No additional implementation or database repair was made after the device failure. The existing Introduction PDF PASS and its earlier force-stop recovery remain valid. B37 cannot be closed until the staging function accepts the verified two-source Page/PDF shape, the stranded job is handled safely, and fresh Unit 3 and 40-page Reviewers are inspected on the realme.

**B37.2 verdict: BLOCKED — production Page/PDF staging rejects two-source provenance after successful attachment ingestion.**

## B37.3 addendum — V1 Canvas resolution adapted to durable V2 (2026-10-01)

This addendum preserves every historical failure above. Starting branch was `b25-3-3-ai-first` at `07d57e7`. The V1 behavioral reference was `galaxymaxp/stay-focused`, `main` at `d26decf`. The requested V1 resolver, extraction, preservation, refresh, action, tests, and flow script were inspected before changing the V2 boundary. Implementation commit: `6c5b72b`.

| Behavior | V1 | Current V2 before B37.3 | Required adaptation |
| --- | --- | --- | --- |
| Page body only | Normalized Page text | Structured Page source | Retain existing Page path |
| Page + one attachment | Body and extracted file combined | API admitted pair; production PDF staging rejected two IDs | Permit owned Page plus linked PDF in staging |
| Page + multiple attachments | Extracted ordered links into one text resource | Resolver capped at one file | Admit up to seven files in the existing eight-source snapshot; resolve one logical job in the worker |
| Attachment-only Page | Filename-only body omitted; attachment text used | One-file PDF path omitted filename-only body | Apply same behavior to composite Pages |
| Links embedded in Page HTML | Parsed Page anchors | Parses validated Canvas file IDs | Reuse existing parser and authenticated lookup |
| Files absent from normal Files listing | Direct Canvas lookup | Page-scoped authenticated hidden-file exception | Retain exception and same-course checks |
| Duplicate discovery | Deduped by URL/name | Dedupes by Canvas file ID | Keep first Page occurrence and ID identity |
| Attachment order | First link occurrence | First link occurrence | Retain Page order in IDs, snapshot, and blocks |
| Partial extraction failure | Continued with warning | Required Page file preparation failed closed | Typed failure for a discovered eligible required link; ignore policy-ineligible links |
| Composite normalized content | One `ModuleResource.extractedText` | One processing job source and structured snapshot | Resolve one text source inside durable work, with component boundaries |
| Provenance | Attachment diagnostics in resource metadata | Ordered snapshot items and block source ordinals | Retain Page and each included file as distinct internal items |

V1's resolver supported multiple attachments, though its tests lacked a direct multi-attachment case. At audit time, the uncommitted V2 implementation would have structured multiple files synchronously at API admission. It was revised to structure and preview them in durable worker execution. The Page is the primary item; ordered `canvasItemIds`, one job source, snapshot items, and source block IDs retain each component. Standalone PDF/PPTX and Page-only behavior remain in the existing architecture. The `orientation` administrative filename filter remains per the user's direction.

### Production contract and repair

The live `public.stage_deferred_canvas_reviewer_pdf_v1(uuid,uuid,text,bigint)` definition required `jsonb_array_length(metadata->'canvasItemIds') = 1` and the sole ID to be `file:<id>`. The job source table allows `pdf`, `image`, and `text` with one storage location or normalized text. The provenance snapshot already supported multiple ordered Page/file items. SQL rejected the Page/PDF pair; the API's one-file limit and worker's PDF-only deferred path limited Page + N.

Migration `20261001015348_composite_canvas_page_staging` permits a standalone PDF or one owned Page plus its directly referenced same-course PDF. Hash, byte, private bucket, MIME, role, and ownership checks remain. It adds a service-only guarded failure RPC for undispatched staging placeholders. Migration `20261001015542_close_stranded_canvas_staging` terminally failed only pre-repair, undispatched, zero-attempt Canvas placeholders with an event. Historical job `dde023f1-65ef-415b-b888-5550bc845494` is now `failed`, with one failure event and no result. It was not forced through the worker or deleted. Both migrations occur once in remote history. The deployed functions grant execution to `service_role`, not `authenticated`.

The API resolves Page links in Canvas order, filters administrative and unsupported names, authenticates same-course metadata lookup, verifies directly accessible hidden files through bounded downloads and binary validation, and prepares each eligible file. A Page with at least two eligible attachments creates one text placeholder job. The private worker verifies every Page-scoped reference, builds all selectable blocks, validates preview and fingerprint, saves one ordered snapshot, and atomically attaches normalized composite text before the existing Reviewer engine runs. A missing or unreadable required attachment fails with a typed error. No new source table or generation architecture was introduced.

### Verification and rollout

Focused composite tests: 35 passed before migration version adjustment; 14 affected tests passed after it. Full API suite: 1,124 passed, three existing skips. API typecheck, lint, production build, and `git diff --check` passed. Engine input format and mobile code were unchanged; no Expo update was published. The existing realme preview remained installed. Synthetic tests cover Page link order, ID deduplication, hidden-file validation, administrative exclusion, multi-file job admission, worker provenance, and typed failure before attach. Existing API tests cover standalone files, Page-only, Page + one file, grounding, and saved Reviewer behavior.

API deployment `dpl_GY45TeASQw6QZEhZpMbtxZyERzTR` is READY on the production alias; `/api/health` returned 200. Allowlisted Cloud Build `4ddd65ca-5cb6-4b0e-995d-0501ac46366b` succeeded. Private Cloud Run revision `generation-worker-00017-hlc` serves 100% of traffic; anonymous `/health` returned 403. The checked Vercel error log had no entries and the new worker revision had no ERROR entries. No EAS configuration or secret changed.

### Physical acceptance A — Unit 3 Lesson 1

Fresh realme request passed. Canvas file `11574237` was privately stored from B37.2; the new request passed composite PDF staging and worker dispatch. Job `cb9cf499-a5b0-4afc-98a0-e2939be4ffb5` succeeded on one attempt. Processing source snapshot `fc5907a0-aa58-4bb4-b89c-8019a7c75311` holds Page and PDF IDs; Reviewer provenance snapshot `a036ce73-3a2d-4ecc-af6f-9bfde98f3e90` has two ordered items. Result `4a2c4883-6c81-4f8b-a277-1e9182e7e93a`; Library artifact `278adbf1-74de-44f5-ae12-3d130aa835f7`. The Reviewer opened on realme with 17 substantive topics about globalization and industrial revolutions. Database checks found one result and one artifact version.

### Physical acceptance B — Power Point Slides

Fresh realme request passed. The repeated Page HTML links resolved to three distinct file IDs in teacher order; the orientation file was excluded by the explicit administrative policy. Both eligible PDFs were privately stored and prepared. Job `69a3a7a9-6e82-424d-8aff-bd7ff319f06a` succeeded on one attempt. Reviewer provenance snapshot `5055d792-5c39-4754-99fa-025fd943b195` has Page, Lesson 1 PDF, Lesson 2 PDF in order. The one normalized source has 102 distinct blocks with source ordinals 1, 2, and 3. The generated sections cite 37 source blocks across all three ordinals, confirming each component reached grounding. Result `41579f67-5fa6-40f6-87b6-d793e67f7bab`; Library artifact `44836af1-32c8-4bbc-94ef-a766580c64d9`. It opened on realme with 24 substantive topics spanning both lessons. Database checks found one job, one result, and one artifact version.

| Attachment | Type | Included? | Preparation | Provenance |
| --- | --- | --- | --- | --- |
| Course Orientation Soc Sci 103.pptx (`11483820`) | PPTX | No; `orientation` administrative policy | Skipped before ingestion | None |
| Unit 1 Lesson 1.pdf (`11483824`) | PDF | Yes | Stored and extracted | File item 2, block ordinal 2 |
| Unit 1 Lesson 2.pdf (`11483833`) | PDF | Yes | Stored and extracted | File item 3, block ordinal 3 |

### Physical acceptance C — 40-page PDF

Fresh realme request passed after A and B. Standalone PDF job `469afb05-92a5-4900-9831-c9872a7f698f` succeeded on one attempt. The source records 40 pages and 40 numbered blocks spanning pages 1–40; Reviewer provenance snapshot `4b68a9ed-e9f9-4c09-ab77-87d09a6fb3a2` has one file item. Result `70be8d48-6559-4116-8088-a29ff4ce3d03`; Library artifact `393fc9ef-5edf-4b69-b4f3-e761ca04b32a`. The Reviewer opened on realme with 23 substantive Front-End Development topics. Historical repair-prompt-budget and emphasis failures did not recur. Database checks found one result and one artifact version.

**B37.3 verdict: PASS — B37 composite Canvas generation repaired and physically verified.** Next roadmap task: continue B39 full end-to-end demo acceptance.
