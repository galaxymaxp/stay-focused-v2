# Product Recovery Phase R1 - V1 Capability Audit And Behavioral Comparison

Date: 2026-07-13, Asia/Manila.

## 1. V1 repository

V1 repository:

```text
C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused
```

V1 state:

- Branch: `main`
- Latest commit inspected: `d26decf3f82d61f2e8dd6ba2444c6c156473163a`
- Latest commit message: `harden reviewer source outlines`
- Working tree: clean
- Repository completeness: appears complete. It contains a Next.js app, Supabase code, Canvas integration code, OCR/extraction code, reviewer generation code, tests, scripts, and project documentation.

V2 repository:

```text
C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2
```

V2 state at audit start:

- Branch: `main`
- Starting commit: `9a5e2dd4677e9184e5d7a36c9645df1d78393b6a`
- Latest commit message: `fix(mobile): harden Canvas grade experience`
- Ahead/behind: `0/0`
- Known unrelated dirty files preserved: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `.vscode/`, `apps/mobile/.gitignore`

## 2. Comparison summary

V1 is a weaker architecture but currently a stronger product benchmark for practical student usefulness. Its flows are looser, less formally isolated, and less thoroughly validated, but they let a student reach "generate a reviewer from useful material" with fewer gates and more tolerance for imperfect inputs.

V2 is a stronger architecture but currently feels underpowered. It has better authentication, encryption, RLS, typed API boundaries, privacy separation, deterministic tests, protected Canvas APIs, provenance, and mobile-first structure. The cost is that the product now has too many hard stops: small PDF limits, strict page validation, strict reviewer assembly, strict source-family eligibility, explicit sync families, selected-course prerequisites, and all-or-nothing validation failures.

The recovery target should be:

```text
V1 capability and flow speed
+ V2 privacy, auth, typed APIs, provenance, and test discipline
- V2 restrictions that block ordinary student use
```

Do not copy V1 wholesale. Copy the behaviors that made V1 useful: permissive ingestion, page-aware OCR diagnostics, direct source-to-reviewer actions, attachment-aware Canvas extraction, and fewer student-visible implementation gates.

## 3. Feature matrix

| Capability | Better system | Evidence |
|---|---|---|
| OCR page capacity | V1 | V1 defaults allow Google OCR jobs up to `OCR_MAX_PAGES_PER_JOB=24`; V2 PDF OCR rejects over five pages. |
| OCR page diagnostics | V1 | V1 records per-page OCR status, character count, provider, confidence, attempts, and failed/empty page counts. V2 returns pages, page count, and warnings, but the current product can still succeed with incomplete useful text. |
| OCR correctness gate | V2 | V2 fails if Google does not return all requested page responses and rejects invalid PDFs, encrypted PDFs, wrong MIME types, bad signatures, oversized files, and over-limit page counts. |
| Reviewer generation reliability | V1 | V1's one-pass Markdown reviewer plus one repair has fewer all-or-nothing section gates. V2 can reject the whole reviewer when one section fails validation after retries. |
| Reviewer faithfulness controls | V2 | V2 has staged coverage, grounding, leakage, retry, and assembly checks with typed diagnostics. |
| Reviewer output usefulness | Mixed | V1 tends to produce a usable artifact more often. V2 produces safer output when it succeeds, but failures are too easy and sometimes unactionable. |
| Canvas usable-source discovery | V1 | V1 resolves module items, pages, assignments, discussions, announcements, files, and attachments more broadly. V2 source selection is currently narrower. |
| Canvas source privacy | V2 | V2 uses protected APIs, encrypted per-user credentials, private source sessions, immutable snapshots, provenance, and no raw Canvas IDs in mobile UI. |
| Canvas grade safety | V2 | V2 keeps grades separate from reviewer generation and exposes protected no-store grade read models. V1 has no comparable grade safety baseline in this audit. |
| Mobile user experience | V2 foundation, V1 behavior | V2 has mobile architecture, but V1's web flow keeps source actions closer to source readiness and has fewer visible toll gates. |
| Error recovery | V1 for permissiveness, V2 for diagnostics | V1 is more likely to return something. V2 has better internal diagnostics, but mobile users often see generic failure copy. |
| Security | V2 | V2 is substantially stronger: bearer auth, service-role boundaries, RLS, encrypted Canvas tokens, route scoping, private storage boundaries, and privacy-preserving docs. |
| Maintainability | V2 | V2 monorepo packages, typed contracts, test coverage, and phase docs are stronger. |
| Offline readiness | Equal to weak | Neither version is a mature offline product. V2 intentionally avoids durable grade caching. |

## 4. OCR comparison

### V1 behavior

V1 first attempts normal PDF text extraction with `unpdf`. OCR is reserved for scanned or image-only PDFs. The OCR system supports Google Vision, Google Document AI, and OpenAI modes, with Google providers allowed to auto-run and OpenAI gated more tightly.

Important V1 OCR behaviors:

- Default Google OCR page-job limit is `24`.
- OpenAI OCR has a separate default cap of `5`.
- Each page is rendered and OCR'd with page-level status.
- Page metadata includes page number, status, text length, confidence, provider, model, error, attempts, and rendered image characteristics.
- Partial page outcomes are preserved in metadata as successful, failed, empty, and truncated page counts.
- A merged OCR result can still be marked completed when enough text exists, even if some pages failed or were empty.

V1 is therefore more capable but not perfectly strict. It is better at showing what happened per page, but it can still treat partial extraction as a completed OCR result.

### V2 behavior

V2's PDF OCR API is stricter and smaller:

- PDF upload max size is 10 MB.
- PDF page count must be 1 through 5.
- PDFs over five pages are rejected instead of truncated.
- PDFs are checked for MIME type, `%PDF-` signature, parseability, and encryption/password protection.
- Google Vision `batchAnnotateFiles` is called synchronously with explicit requested pages.
- The provider fails if Google does not return a response object for every requested page.
- Normalization can still return success when only some returned pages contain useful text.

The user's five-page manual test exposed the important practical gap: the file was within the stated limit, but only two pages produced useful OCR text in the app. Since the provider would fail on missing page responses, the likely behavioral issue is that Google returned page responses for all pages but some pages normalized to empty or near-empty text, while the product still allowed the extraction to continue as a general success.

### OCR conclusion

V2 should keep its server-only provider boundary, PDF safety checks, and no-silent-truncation rule. It should remove the five-page product ceiling and add page-completeness reporting:

```text
5 of 5 pages extracted
Pages 3-5 returned no readable text
Retry missing pages
Continue with partial text
```

Success must not imply full coverage unless every page has useful extracted text or the user explicitly accepts a partial result.

## 5. Reviewer comparison

### V1 behavior

V1's current reviewer path uses a source-shaped Markdown reviewer flow:

- Clean and truncate source text to a one-pass source cap.
- Build a source outline.
- Ask the model for one Markdown reviewer that follows the source structure.
- Validate the Markdown against source structure, metadata leakage, generic headings, lost exact terms, and refusal/debug content.
- Run one repair prompt with the original source and previous Markdown when validation fails.

V1 can still fail, but it has fewer ways for one local problem to destroy the whole output. Its artifact is simple Markdown, so validation is broad rather than per-card and per-field.

### V2 behavior

V2's engine is much safer and more inspectable:

```text
Stage 0 normalize
-> Stage 1 outline
-> Stage 2 plan
-> Stage 3 section generation
-> Stage 4 coverage
-> Stage 5 retry
-> Stage 5a grounding
-> leakage guard
-> Stage 6 assembly
```

The failure mode is too severe for production student use. Stage 6 can reject the whole reviewer when a single section remains failed or weak after retries. The API maps this to `422 reviewer_validation_failed`, and the mobile UI often cannot tell the student which section or field failed or how to recover.

V2 includes an extractive fallback path, but it is limited to specific conditions. It does not cover every practical case, such as missing output, failed schema validation, list-only or heading-heavy sections, too few extractive blocks, or retry drift.

### Reviewer conclusion

V2 should keep coverage, grounding, leakage protection, typed diagnostics, and source-faithful defaults. It should change failure policy:

```text
Generate
-> validate
-> repair failed fields
-> use extractive fallback for failed sections
-> assemble a limited but useful reviewer
-> report confidence per section
```

Rejecting the whole reviewer should be reserved for empty source, unsafe source, provider outage, schema-wide invalidity, or a complete inability to produce any source-backed output.

## 6. Canvas comparison

### V1 behavior

V1 has broad Canvas source-resolution behavior:

- Module item URL classification.
- Page body extraction.
- Assignment description extraction.
- Announcement extraction.
- Discussion support.
- Canvas file extraction for PDF, PPTX, DOCX, TXT/MD/CSV, HTML, and selected image/PDF OCR paths.
- Attachment discovery from HTML anchors.
- Combination of direct body text and extracted attachment text.
- Source readiness states such as attachment-only, external-link-only, unsupported file type, empty text, and extraction failures.

This made V1 feel more capable because the app had more ways to find useful material even when the assignment description itself was empty.

### V2 behavior

V2's Canvas reviewer source selection is safer but narrower:

- Source types are currently `page`, `assignment`, `announcement`, and `file`.
- A Page is available only when synchronized Page body text is readable.
- An assignment is available only when the synchronized assignment description has readable text.
- The exact mobile-visible failure "This assignment does not have readable description text" comes from this narrow assignment-description rule.
- A file is available only after bounded selected-file ingestion and OCR preparation.
- Preview uses protected database rows and private preview sessions, not live Canvas calls.

The likely reason "Acquire New Knowledge" style items feel worse in V2 is that useful content may live behind Canvas Pages, module item targets, attachments, linked files, or external content rather than directly in the assignment description. V1 had more logic for following those relationships. V2 records many Canvas rows, but row count is not the same as usable study content.

### Canvas conclusion

V2 should preserve protected API and snapshot boundaries while broadening usable-content resolution:

- Prefer Page bodies when module items point to Pages.
- Follow assignment-linked files and attachments when safe.
- Reintroduce discussion support when permissions allow.
- Treat empty assignment descriptions as shells, not dead ends.
- Rank sources by "can generate a reviewer from this" rather than raw Canvas object type.

## 7. Mobile UX comparison

V1 is a web app, not a mobile implementation, so it is not a direct UI benchmark. It is still a useful workflow benchmark.

V1 source rows keep readiness, status, and actions close together. A student sees which sources are ready, which need repair, and which can generate a reviewer. The direct path is closer to:

```text
Open course
-> choose a ready resource
-> scan/repair if needed
-> generate reviewer
```

V2 mobile is more technically explicit:

```text
Open Courses
-> understand connection capabilities
-> select courses
-> sync course content
-> open reviewer flow
-> choose source rows
-> structure sources
-> choose blocks
-> preview editable source
-> generate
-> save
```

That precision is valuable internally, but too much of it is visible to students. The physical iPhone validation exposed this: capability copy, sync-state copy, large action buttons, source-preview scrolling, and generic failure banners made the app feel more like a validation console than a study tool.

UX recovery should not mean a redesign. It should mean hiding implementation detail behind clearer student actions:

- "Create reviewer" should be the primary action when useful source material exists.
- Sync, prepare, OCR, and repair should be visible as progress and recovery states, not as concepts the student must understand first.
- Course content sync and grade sync must be labeled separately.
- Capability copy should avoid "Not tested yet" when that means only "not probed during initial connection."
- Failure banners should sit near the action they affect and include safe recovery actions.

## 8. Restriction audit

| Restriction | Classification | Reason |
|---|---|---|
| Bearer-authenticated protected APIs | Necessary | Protects user data and keeps mobile from direct server-only operations. |
| Supabase owner-scoped RLS | Necessary | Required for saved reviewer and Canvas data isolation. |
| Encrypted Canvas token storage | Necessary | Canvas PATs must never be stored or returned in plaintext. |
| Server-only OCR credentials | Necessary | Prevents Google credentials from reaching mobile or browser code. |
| No raw Canvas IDs in mobile UI | Helpful | Reduces accidental private-data exposure and user confusion. |
| PDF five-page ceiling | Harmful | Blocks normal study PDFs and makes V2 feel artificially limited. Replace with chunking and page coverage. |
| Reject PDFs over five pages instead of truncating | Helpful but incomplete | Better than silent truncation, but not enough as a product ceiling. |
| Synchronous Google Vision PDF processing only | Neutral to harmful | Good as an MVP, but larger documents need chunking or asynchronous processing. |
| Success when only some pages have useful OCR text | Harmful | Allows incomplete reviewers without clear warning. |
| Whole-reviewer rejection when one section fails | Harmful | Protects quality but destroys usefulness. Replace with section-level fallback and confidence. |
| Strict grounding and leakage checks | Necessary | Must remain, but should drive repair/fallback rather than common hard rejection. |
| Retry limit of two for failed sections | Helpful | Prevents runaway cost, but needs better fallback after retry exhaustion. |
| Narrow Canvas source types | Harmful | Excludes useful content behind discussions, attachments, linked files, module targets, and external resources. |
| Assignment available only by description text | Harmful | Empty assignment shells can still point to useful Pages, files, or module content. |
| Explicit course-content sync | Helpful | Keeps Canvas access intentional, but the UI should not make students reason about sync families. |
| Explicit grade sync | Necessary for Phase 5E | Grades are sensitive and should remain separate from reviewer content. |
| No grade data in reviewer generation | Necessary | Academic grade values must not leak into study prompts or snapshots. |
| No durable grade cache in Phase 5E | Helpful | Correct boundary for grade MVP; separate from reviewer recovery. |
| Capability "not tested yet" wording | Harmful | Accurate internally but misleading to users after later flows prove capability. |
| Source preview edit step | Helpful | User can correct OCR or Canvas extraction before generation. It needs better collapse/navigation, not removal. |
| Selected-block import | Helpful but heavy | Good for provenance and precision, but should be streamlined for common "use all useful content" cases. |

## 9. Recovery roadmap

### High impact

1. Product Recovery Phase R2 - Reviewer reliability and fallback redesign

Expected benefit: Reviewer generation becomes useful even when one section is weak.

Implementation difficulty: Medium to high.

Risk: Weak fallback could reintroduce unsupported content if grounding is bypassed. The design must keep validation but change failure policy.

Dependencies: Engine retry/fallback diagnostics and API/mobile structured error handling.

2. Product Recovery Phase R3 - Full-document OCR with page completeness

Expected benefit: Removes the visible five-page ceiling and prevents silent partial extraction.

Implementation difficulty: Medium to high.

Risk: Cost, latency, provider limits, and mobile progress complexity.

Dependencies: Chunked PDF processing, page coverage model, retry-missing-page behavior, UI progress and warnings.

3. Product Recovery Phase R4 - Canvas usable-content resolution

Expected benefit: "Acquire New Knowledge" and similar module items become useful when the real content is in linked Pages/files/attachments rather than assignment descriptions.

Implementation difficulty: High.

Risk: More Canvas traversal increases permissions variance and failure states.

Dependencies: V2 protected Canvas source model, module item target resolution, attachment/file extraction, and safe source ranking.

### Medium impact

4. Product Recovery Phase R5 - Simplified student workflow

Expected benefit: The app feels like "choose material, get reviewer" instead of "operate sync infrastructure."

Implementation difficulty: Medium.

Risk: Hiding sync details can obscure failure recovery if not designed carefully.

Dependencies: Improved source readiness state and clearer action hierarchy.

5. Structured reviewer failure diagnostics

Expected benefit: When reviewer generation still fails, the student sees a safe failed-section label, validation category, and recovery actions.

Implementation difficulty: Medium.

Risk: Diagnostics must not expose source excerpts, prompts, model output, private terms, or internal IDs.

Dependencies: Existing `PipelineAssemblyError` diagnostics and mobile error parsing.

6. Capability wording correction

Expected benefit: Removes misleading "Not tested yet" copy.

Implementation difficulty: Low.

Risk: Must avoid overclaiming universal Canvas support.

Dependencies: Current capability registry and course-level evidence.

### Low impact

7. Canvas course-row action hierarchy cleanup

Expected benefit: Reduces repeated oversized buttons and ambiguous sync copy.

Implementation difficulty: Low to medium.

Risk: Needs accessibility and Dynamic Type checks.

Dependencies: Existing mobile components and tokens.

8. Reviewer source preview ergonomics

Expected benefit: Less scrolling and better recovery from failure.

Implementation difficulty: Low to medium.

Risk: Must preserve editable source access.

Dependencies: Existing Canvas source reviewer screen.

## 10. V2 features to preserve

Preserve these V2 improvements:

- Supabase authentication and bearer-token protected APIs.
- Caller-scoped user access and RLS.
- Server-only OpenAI and Google credentials.
- AES-256-GCM encrypted Canvas credential storage.
- No school-wide Canvas credential assumption.
- Protected Canvas APIs and per-user course ownership.
- Private Storage boundaries for Canvas files.
- Immutable Canvas source snapshots and provenance.
- Exact selected-block provenance for saved Canvas reviewers.
- Grade data separation from reviewer generation.
- Hidden/unavailable grade wrapper handling.
- No local grade calculation in the grade MVP.
- Strict response parsers at mobile service boundaries.
- Provider boundaries for OCR and reviewer generation.
- Deterministic engine evals and route tests.
- Privacy-preserving live-validation documentation.
- Expo Web as fast UI regression plus physical iPhone final validation.

The recovery work should remove unnecessary product friction, not weaken these foundations.

## 11. Product verdict

```text
PRODUCT RECOVERY REQUIRED
```

V2 is architecturally stronger than V1, but V1 remains ahead as a practical capability benchmark. The next work should prioritize reviewer reliability and fallback behavior before continuing normal Phase 5F synchronization work.

## 12. Next task

```text
Product Recovery Phase R2 - Reviewer reliability and fallback redesign
```
