# Roadmap

Last refreshed: 2026-07-05, Asia/Manila.

## Phase 1 - Foundation And Reviewer Engine

Status: Complete

Purpose: Establish the repository foundation and a tested reviewer-generation
engine before product UI and integrations depend on it.

Major deliverables:

- Monorepo foundation
- Stage 0 through Stage 6 pipeline
- OpenAI-compatible provider boundary
- Coverage verification
- Grounding validation
- Leakage protection
- Deterministic evaluations
- Short-prose fallback for OCR-style pasted text

Exit criteria:

- Engine build passes.
- Aggregate deterministic evals pass with 266 cases.
- Default visible reviewer output is source-faithful.
- Unsupported enrichment is excluded from default assembly.

Immediate dependency: None.

## Phase 2 - Authenticated Reviewer Vertical Slice

Status: Complete

Purpose: Prove a real user can sign in, submit source text, call the protected
API, generate with OpenAI, and preview validated reviewer output.

Major deliverables:

- Supabase email/password authentication
- Protected reviewer API route
- Expo reviewer input and preview
- OpenAI-backed generation
- Local Expo Web CORS
- Unattended authenticated browser smoke
- Persistent smoke session and output assertions

Exit criteria:

- `POST /api/reviewer/generate` requires a valid Supabase bearer token.
- Expo reviewer generation screen can submit pasted text and render a preview.
- `npm run smoke:reviewer:web` passes against the local API and Expo Web.
- Immediate repeat and session-only smoke flows are supported.

Immediate dependency: Phase 1 complete.

## Phase 3 - OCR And Source Ingestion

Status: Complete

Purpose: Replace paste-only source intake with a server-side OCR contract that
preserves layout enough for the reviewer engine to stay source-faithful.

Completed in Phase 3A:

- Audit existing source and OCR-related contracts.
- Provider-agnostic OCR boundary.
- Server-only Google Cloud OCR adapter.
- Fake-client OCR tests.
- Protected image OCR API route.
- MIME type and size validation.
- Preserved line, list, and layout boundaries.

Completed in Phase 3B:

- Gallery image selection through Expo Image Picker.
- Selected-image preview and filename display.
- Authenticated upload to `POST /api/ocr/extract`.
- Editable extracted-text review before reviewer generation.
- Manual paste fallback as a separate source mode.
- Deterministic Expo Web OCR smoke using a mocked OCR response and real
  reviewer generation.

Completed in Phase 3C:

- Camera capture through the existing Expo image-picker boundary.
- Captured-image preview and generated filename display.
- Reuse of the authenticated `POST /api/ocr/extract` upload path.
- Editable extracted-text review before reviewer generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision OCR.
- Verified that edited OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live OCR-generated reviewer.

Completed in Phase 3D:

- Synchronous small-batch PDF OCR ingestion for one PDF per request.
- PDF selection through Expo Document Picker.
- Authenticated upload to `POST /api/ocr/extract-pdf`.
- Server-side PDF validation for MIME type, `%PDF-` signature, parseability,
  encrypted/password-protected files, upload size, and 1-5 page count.
- Google Vision `DOCUMENT_TEXT_DETECTION` through synchronous
  `batchAnnotateFiles` with inline PDF bytes and explicit pages.
- Page-ordered normalized text with editable extracted-text review before
  reviewer generation.
- PDFs over five pages are rejected, not silently truncated.
- PDF files stay server-bound; Google credentials remain server-only.
- No Cloud Storage, background jobs, polling, local PDF rasterization, Poppler,
  or Ghostscript in this phase.
- Mocked PDF OCR web smoke using a fictional PDF fixture and real reviewer
  generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision PDF OCR.
- Verified that a fictional, image-only, two-page scanned PDF extracted both
  pages in page order.
- Verified that edited PDF OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live PDF OCR-generated reviewer.
- Verified that a separate PDF with more than five pages is rejected safely with
  the expected UI messages instead of being silently truncated.

Remaining Phase 3 deliverables:

- None.

Exit criteria:

- A protected OCR API route accepts image input, validates it, invokes the OCR
  provider boundary, and returns typed extracted text without exposing secrets.
- Fake-client tests prove success, error, size, MIME, and layout-preservation
  behavior.
- The reviewer input flow can use user-reviewed extracted text while manual
  paste remains available.
- Live iPhone camera/image OCR validation passes without exposing Google
  credentials to mobile code or committed files.
- Live iPhone PDF OCR validation passes using a fictional 1-2 page scanned PDF,
  editable OCR text, and reviewer generation.

Immediate dependency: Phase 2 complete.

Known limitation: visible repeated headers and footers in scanned PDFs may be
extracted as source text and become reviewer sections. Users can remove them in
the editable OCR text field. Automatic repeated header/footer detection is
deferred to a later OCR cleanup task.

Immediate next task: choose the next scoped product task in a separate
implementation pass. Phase 4 remains pending and was not started by the Phase
3D validation documentation pass.

## Phase 4 - Study Library And Persistence

Status: Pending

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.

Immediate dependency: Phase 3 source-ingestion contracts stable enough to store
source metadata consistently.

## Phase 5 - Canvas Integration

Status: Pending

Purpose: Bring Canvas LMS material into the same reviewer pipeline without
creating a parallel generation path.

Major deliverables:

- Canvas authentication or token handling
- Courses
- Modules
- Assignments
- Announcements
- Files and source selection
- Sending Canvas material through the same reviewer pipeline

Exit criteria:

- A user can select Canvas material and generate a reviewer through the existing
  protected API and engine pipeline.
- Canvas credentials and server-only tokens are not exposed to mobile bundles.
- Canvas source metadata can be stored with reviewers when persistence exists.

Immediate dependency: Phase 4 persistence and source metadata, plus a stable
source-ingestion contract from Phase 3.

## Phase 6 - Tasks And Study Schedules

Status: Pending

Purpose: Expand from reviewer generation into schedule-first planning and
actionable study sessions.

Major deliverables:

- Task generation
- Due-date awareness
- Schedule generation
- Calendar-first planning
- Canvas deadline integration
- Actionable study sessions

Exit criteria:

- Source material and deadlines can produce user-actionable tasks.
- Generated study sessions fit into schedule-first planning.
- Canvas deadlines can inform task and schedule generation when Canvas is
  connected.

Immediate dependency: Phase 5 Canvas integration and Phase 4 saved content.

## Phase 7 - Polish, Deployment, And Thesis Validation

Status: Pending

Purpose: Validate the app as a polished, deployable capstone product rather
than only a local development slice.

Major deliverables:

- Completed mobile OAuth flows
- Deployed API validation
- Accessibility
- Navigation and UI polish
- Performance testing
- User testing
- Thesis evidence
- Production readiness

Exit criteria:

- Production deployment is validated with safe environment separation.
- Mobile auth flows are complete, including OAuth redirects if kept in scope.
- Accessibility, performance, and user-testing evidence are documented.
- Thesis evidence reflects the implemented product accurately.

Immediate dependency: Phases 3 through 6 complete enough to validate an end-to-end
student workflow.
