# Product Recovery Phase R4 — Canvas Usable-Content Resolution

Date: 2026-07-13, Asia/Manila.

## 1. Starting state

- V2 branch: `main`.
- V2 starting commit: `0103a0bd63f9d565cc2b278c819bc1803963b7a1` (`feat(ocr): enforce full-document page completeness`).
- Ahead/behind: `0/0` against `origin/main`.
- Expected unrelated dirty paths: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`, and `.vscode/`.
- V1 reference: clean `main` at `d26decf3f82d61f2e8dd6ba2444c6c156473163a`; inspected read-only.

## 2. Existing V2 architecture

| Input/resource path | Existing trusted source | R4 use |
| --- | --- | --- |
| Page | Owner/course-scoped synchronized `canvas_pages.body_html` | Deterministic HTML normalization and meaningful-content classification |
| Assignment | Owner/course-scoped synchronized `canvas_assignments.description_html` | Same authoritative HTML boundary; grading metadata excluded |
| Announcement | Owner/course-scoped synchronized `canvas_announcements.message_html` | Same authoritative HTML boundary |
| File | Private Storage object behind stored hash, byte, MIME, magic-byte, ownership, and course checks | Existing extraction service and exact R3 verifier; no second download/OCR path |
| Module item | Synchronized module-item row and linked synchronized resource IDs | Supported Page/Assignment/File links only; unsupported types are never followed |
| Reviewer | Protected preview session and immutable snapshot flow | Fingerprint, course, ordered item, selection, and current-row gate before provider creation |

The Canvas package already follows `Link` pagination, bounds retries, rejects authenticated redirects, and protects file downloads with host, DNS, private-address, redirect, byte, and content checks. R4 introduces no remote fetch helper and performs no account-wide resync.

## 3. V1 failure classes intentionally rejected

| Failure class | V1 behavior | R4 decision |
| --- | --- | --- |
| Redirect resolution | Manually followed redirect/HTML targets and could forward Canvas authorization before a hard same-host stop | No external resolution or browser scraping; retain V2 redirect and host controls |
| Partial attachments | Combined a readable body with failed or partial attachment extraction | No partial file source; exact R3 completion is mandatory |
| Metadata padding | Added attachment labels and other labels to source text | Titles, filenames, module names, item types, and labels stay outside reviewer text |
| Broad source types | Treated discussion/external/module shells as potential sources | R4 supports only existing safe synchronized Page/Assignment/File paths; other module types are `unsupported` |
| Private diagnostics | Logged titles, URLs, and raw repair/error details | Canvas generation logs only a safe error name and `canvas_source_redacted` privacy marker |

## 4. Reproduced failure classes

Red regressions first proved that V2 direct and selective preview assembly inserted `SOURCE N - TYPE - title`, OCR block assembly inserted `[Page N]`, preview sessions lacked a current-course/item fingerprint gate, and the mobile screen could accept a late response after a new selection. The initial tests failed on those exact behaviors before implementation.

## 5. Final resolution contract

The reusable `resolveCanvasUsableContent` boundary returns one of:

- `usable`: normalized, meaningful, complete source text is present; structured provenance and a SHA-256 content fingerprint are separate.
- `empty`: access and processing succeeded, but content contains no instructional evidence; source text is absent.
- `unsupported`: the item or validated file kind is intentionally out of scope; no linked callback or external fetch occurs.
- `inaccessible`: ownership/course/access checks fail or a linked synchronized row is missing; the response is opaque.
- `failed`: integrity, extraction, provider, parsing, or storage verification failed; source text is absent.

Meaningfulness is evidence-based, not a sentence or arbitrary character threshold. Real headings plus content, lists, short equations, ports, acronyms, and exact technical terms remain eligible. A generic title, navigation words, whitespace, hidden markup, or UI actions do not.

## 6. Normalization

`canvas-content-normalization.ts` is the single deterministic visible-text boundary. It:

- parses with `parse5`;
- removes scripts, styles, forms, controls, embedded objects, navigation, hidden elements, common Canvas chrome, zero-width characters, and controls;
- preserves headings, paragraphs, anchor text, list boundaries, ordered numbering, and table-cell boundaries;
- decodes HTML entities through the parser;
- collapses repeated whitespace without paraphrasing or inventing structure.

Preview assembly now joins only resolved content bodies. Source titles, filenames, source labels, IDs, and OCR page numbers remain provenance/block metadata and are not inserted into reviewer text.

## 7. File and OCR reuse

Canvas PDFs/images still pass through `extractPreparedCanvasFileText`, which verifies ownership, course, private bucket/key, stored size/hash, validated MIME and bytes, and the existing R3 OCR extraction service. One resolution performs at most one Storage download and one OCR provider call. Missing, duplicate, malformed, failed, or incomplete pages produce no source. Complete all-blank extraction maps to `empty`. The five-page PDF limit is unchanged and enforced before provider work.

## 8. API and reviewer enforcement

`POST /api/canvas/courses/[courseId]/sources/resolve` accepts only JSON with one opaque synchronized `itemId`. It rejects URLs, Canvas base URLs, PAT-shaped extra fields, download URLs, and unknown fields before service work. JWT authentication, connection ownership, selected-course membership, and row ownership/course filters are server-side.

Preview sessions now return a deterministic resolution fingerprint. Canvas reviewer generation requires the session ID, course ID, exact ordered item IDs, and fingerprint. Before provider creation, the server verifies:

- preview-session ownership and expiry;
- supported current normalization version;
- session course and ordered manifest IDs;
- fingerprint equality;
- course remains selected;
- every current synchronized row still exists inside the same user/connection/course boundary;
- direct HTML normalizes to the same content hash;
- stored files retain the same SHA-256 and ready state.

The freshness gate does not rerun OCR. Any stale/non-usable result returns before provider creation, so reviewer calls remain zero.

## 9. Mobile stale-result protection

The Canvas screen now uses a pure reducer plus monotonic request tokens. Selection/block changes, new attempts, terminal failures, teardown/sign-out, and back navigation clear preview text/title. Structure, preview, and generation each use abort controllers. Late responses must match the active token and selection key. Generation also requires the reducer's exact preview session, fingerprint, and source-ID set to match the current selection.

## 10. Supported matrix

| Source | Method | Usable condition | Non-usable behavior | Validation |
| --- | --- | --- | --- | --- |
| Page | `synchronized_page_html` | Current owned selected-course body normalizes to instructional text | `empty`/`inaccessible`/`failed` | Deterministic and live |
| Assignment | `synchronized_assignment_html` | Current student-visible description contains instructional text | Name, due date, points, grades, and submission data never become source | Deterministic; no live assignment sample used |
| Announcement | `synchronized_announcement_html` | Current message contains instructional text | Empty message has no source | Deterministic; no live announcement sample used |
| Image | `stored_image_ocr` | Protected stored bytes pass all checks and R3 extraction is complete/meaningful | Empty/unsupported/inaccessible/failed, no partial text | Deterministic and live |
| PDF | `stored_pdf_ocr` | Same, with every expected page terminal exactly once | Incomplete/all-blank/over-limit/failed produce no source | Deterministic plus R3 protected validation |
| Module Page/Assignment/File | `module_reference` then linked authoritative method | Linked synchronized resource resolves usable | Missing link is inaccessible | Deterministic |
| Subheader, quiz, discussion, external URL/tool | `module_reference` | Never usable in R4 | `unsupported`; callback/fetch count zero | Deterministic fixture |

Deferred: quiz-attempt ingestion, discussions, external sites/tools, media transcription, DOCX/PPTX parsing, submission content, and browser scraping.

## 11. Security and privacy

- No PAT, base URL, remote URL, trusted host, extraction method, expected OCR page count, or ownership choice comes from the resolve request.
- Service-role reads are always filtered by user, connection, selected course, and row/resource identity; missing/cross-owner rows share the same inaccessible result.
- No Canvas/OCR content, title, course/module/item name, filename, URL, provider response, or credential is logged by the R4 harness or Canvas error logger.
- Normal terminal responses expose source text only for `usable`; other states contain no `sourceText` or fingerprint.
- No RLS or migration change was required; existing private preview sessions persist the needed manifest and hashes.

## 12. Protected evidence and performance

Final `npm run validate:canvas:r4` passed with aggregate-only output:

| Safe label | Kind | Resolution | Characters | Duration | Reviewer |
| --- | --- | --- | ---: | ---: | --- |
| `usable-sample-1` | Page | `usable` | 3,988 | 1,000 ms resolution | HTTP 200 in 29,290 ms; coverage/grounding/leakage passed |
| `file-sample-1` | Image | `usable` | 62 | 2,116 ms | Not requested |
| `unsupported-sample-1` | Module item | `unsupported` | 0 | 0 ms | Not started |
| `controlled-inaccessible` | Page | `inaccessible` | 0 | 0 ms | Not started |
| `controlled-incomplete` | PDF | `failed` | 0 | 0 ms | Not started |

The harness made seven protected HTTP calls. A synchronized direct resource performs zero upstream Canvas calls, up to seven owner/course-scoped database reads including selection/sync state, and zero writes. Reviewer freshness adds one selected-preference read and one current-row read per selected source after the existing preview-session read. File resolution adds one private Storage read and at most one OCR call. No route approached its 60/120-second execution limit.

R3 protected validation also passed: complete 1-, 2-, and 5-page extractions; one complete document with a blank middle page; a controlled incomplete provider with zero reviewer calls; and a successful five-page reviewer with passed coverage, grounding, and leakage.

## 13. Deterministic and automated verification

| Command/suite | Result |
| --- | --- |
| Canvas typecheck/build/tests | Passed; 69/69 tests |
| OCR typecheck/build/tests | Passed; 25/25 tests |
| Engine typecheck/build/eval | Passed; 287/287 evaluations |
| API typecheck/lint/build/tests | Passed; 426/426 tests |
| Mobile typecheck/lint/tests | Passed; 138/138 tests |
| Root typecheck/lint | Passed; 7/7 tasks each |
| Reviewer web-smoke unit tests | Passed; 51/51 |
| PDF web smoke | Passed; mocked OCR, real reviewer, 2 sections/4 key points |
| R3 protected validation | Passed |
| R4 protected validation | Passed |
| R4 harness strict TypeScript check | Passed |
| `git diff --check` | Passed |

New tests cover meaningful HTML variants, ownership/course mismatch, supported/unsupported module references, protected file terminal mapping, one-call extraction, no metadata/page-label source padding, strict resolve request shape, current-row hash/state checks, stale server gate, reducer clearing, stale response rejection, and exact generation selection binding.

## 14. Database and migration decision

No migration was added. Existing synchronized rows are authoritative, existing preview sessions already persist ordered source/block manifests and hashes, and immutable reviewer snapshots already preserve accepted source provenance. Adding another transient-resolution table would duplicate that state without improving the server gate.

## 15. Remaining risks

- Synchronized HTML is authoritative only as of the last successful selected-course sync; the generation gate detects changes in local synchronized rows, not unsynchronized upstream edits.
- File OCR remains synchronous and bounded by the existing route/provider limits.
- The meaningfulness vocabulary is deterministic and conservative; future real examples may justify additive noise terms, with regressions.
- Live R4 evidence covered a Page and stored Image; Assignment, Announcement, module links, unsupported types, inaccessible rows, and incomplete PDFs were fixture-validated.

## 16. Recommended next task

Product Recovery Phase R5 — Canvas source-selection and reviewer UX recovery.
