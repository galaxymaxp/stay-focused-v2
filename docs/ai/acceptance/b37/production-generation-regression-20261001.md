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
