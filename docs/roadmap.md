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

Immediate next task after Phase 3D: Phase 4 Study Library and Persistence.
Phase 4 is complete and live validated; the next product phase is Phase 5
Canvas Integration.

## Phase 4 - Study Library And Persistence

Status: Complete

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Implemented foundations:

- `reviewers` Supabase migration with owner-scoped RLS policies, timestamps,
  section count, source metadata, and reviewer JSON output.
- Typed reviewer table shapes in `@stay-focused/db`.
- Authenticated Next.js reviewer CRUD API using the caller's bearer token and
  user-scoped Supabase access instead of service-role CRUD.
- Mobile Study Library screen with list, open, rename, delete, refresh, and
  return-to-generator actions.
- Save-to-library action after reviewer generation, preserving editable
  OCR-before-reviewer behavior and storing only safe source metadata.
- Regression-hardened PDF OCR web smoke wait for fast mocked OCR completion.
- Live Supabase verification confirmed the migration is already applied, the
  `public.reviewers` table exists, RLS remains enabled, and owner SELECT,
  INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Live cross-user validation used two distinct Supabase auth users. User A
  created, listed, and opened a reviewer; User B's list excluded it and open,
  rename, and delete attempts returned safe `404 reviewer_not_found` responses.
- Reverse isolation was also validated: User B created and listed a reviewer;
  User A could not list or open it; User B deleted it.
- Cleanup removed both fictional validation reviewers through their owning
  users, and follow-up owner-list/open checks confirmed no validation rows
  remained.
- The Next.js reviewer detail route typing fix aligns `[id]` route params with
  the Promise-based App Router context without changing runtime behavior.

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.
- Automated API, mobile, DB typecheck, engine, OCR, and browser smoke
  regression checks pass.
- Live migrated Supabase validation proves save, list, open, rename, delete,
  and cross-user denial against the deployed `reviewers` table.

Immediate dependency: Phase 3 source-ingestion contracts are stable enough to
store source metadata consistently. All Phase 4 external validation gates are
complete.

## Phase 5 - Canvas Synchronization Foundation

Status: In progress. Phase 5A is the first implementation slice; Phases 5B
through 5F remain planned and must not be collapsed into a single generic
Canvas integration task.

Purpose: Bring Canvas LMS data into Stay Focused as a permission-aware academic
graph that can feed the existing OCR, normalization, provenance, reviewer, and
future schedule/grade-planning boundaries without creating a parallel
generation path.

Immediate dependency: completed Phase 4 persistence and source metadata, plus a
stable source-ingestion contract from Phase 3.

### Phase 5A - Secure Canvas Connection And Capability Discovery

Status: Implemented locally; live Canvas validation pending.

Scope:

- Canvas instance URL
- Canvas personal access token
- API-side credential validation
- AES-256-GCM encrypted credential storage
- Protected connection-status API
- Disconnect support
- Course discovery
- Initial capability registry
- Safe endpoint probes
- User-visible connection and course states

Completion criteria:

- A signed-in Stay Focused user can connect Canvas.
- The Canvas profile is validated.
- The token is encrypted before persistence.
- The token is never returned to mobile.
- Courses can be listed.
- Supported and unsupported Canvas capabilities are recorded honestly.

### Phase 5B - Academic Graph Synchronization

Status: Pending.

Scope:

- Courses
- Enrollment and terms
- Syllabus
- Modules
- Ordered module items
- Module prerequisites
- Module requirements
- Module progress
- Canvas Pages
- Assignments and activities
- Assignment groups
- Announcements
- Discussions
- Quiz metadata
- Planner items
- Calendar events
- Effective student-specific dates
- External URLs
- External-tool references

Required source relationships:

```text
Course
|-- Syllabus
|-- Module
|   `-- Module item
|       |-- Page
|       |-- File
|       |-- Assignment
|       |-- Discussion
|       |-- Quiz
|       |-- External URL
|       `-- External tool
|-- Announcement
|-- Assignment group
`-- Planner/calendar item
```

Exit criteria:

- Canvas material is stored as related academic entities, not as a flat file
  list.
- Module order, nesting, prerequisites, lock state, completion state, and
  relationships are preserved.
- Synchronized activities can later become reviewer sources, scheduling data,
  or grade-planning inputs according to their capability classification.

### Phase 5C - File, Attachment, And Media Ingestion

Status: Pending.

Scope:

- PDF with embedded text
- Scanned PDF through the existing OCR boundary
- PowerPoint `.ppt` and `.pptx`
- Word `.doc` and `.docx`
- Images
- Plain text
- HTML
- Supported spreadsheet text
- Assignment attachments
- Discussion attachments
- Announcement attachments
- Canvas-hosted media captions when available
- Unsupported format handling
- File-size and page-count limits
- Parser registry
- Partial-failure reporting

Required ingestion flow:

```text
Canvas discovery
-> metadata record
-> authorized file download
-> MIME and extension detection
-> parser or OCR selection
-> structured text extraction
-> normalized source blocks
-> editable preview
-> confirmed import
-> reviewer generation
```

Exit criteria:

- Canvas file discovery does not bypass the existing OCR, normalization,
  grounding, or reviewer validation boundaries.
- Unsupported files and partial failures are visible without blocking unrelated
  synchronized records.

### Phase 5D - Source Normalization, Provenance, And Selective Import

Status: Pending.

Scope:

- Structure preservation
- Headings
- Bullet hierarchy
- Tables
- Pages
- Slide numbers
- Module order
- Source snapshots
- Source versions
- Content hashes
- Parser versions
- OCR versions
- Selective import
- Editable source preview
- Deduplication
- Repeated-source relationships
- Stale-source handling
- Deleted-source handling
- Unsupported-source reporting

Every normalized source must preserve provenance such as:

```text
Stay Focused user ID
Canvas connection ID
Canvas course ID
Canvas module ID
Canvas module-item ID
Canvas source-object ID
source type
source title
file name
MIME type
page or slide number
Canvas URL
Canvas updated timestamp
local synchronized timestamp
content hash
parser version
OCR version
```

Exit criteria:

- A reviewer remains linked to the exact source snapshot used during
  generation.
- Users can preview and selectively import source material before it reaches the
  reviewer engine.

### Phase 5E - Grades, Submissions, Rubrics, And Feedback Foundation

Status: Pending.

Scope:

- Visible current course score
- Visible final course score
- Displayed grades
- Assignment groups
- Assignment-group weights
- Drop rules
- Grading periods
- Assignments
- Points possible
- Grading type
- Submission scores
- Submission state
- Attempt number
- Missing state
- Late state
- Excused state
- Omitted-from-final-grade state
- Rubric definitions
- Rubric assessments
- Instructor comments
- Feedback attachments
- Learning outcomes when permitted
- Grade snapshots
- Canvas hidden-grade behavior

Exit criteria:

- Grade and submission records remain separate from reviewer source content.
- Grades never automatically enter reviewer-generation prompts.
- Hidden or incomplete Canvas grading information is represented honestly.

### Phase 5F - Incremental And Resilient Synchronization

Status: Pending.

Scope:

- Incremental updates
- Canvas `updated_at` handling
- Content hashing
- Idempotent upserts
- Per-course checkpoints
- Per-item sync status
- Resumable synchronization
- Pagination
- Low-concurrency queues
- Retry behavior
- `429` handling
- Retry-after handling
- Stale records
- Deleted Canvas objects
- Locked or unpublished objects
- Partial failures
- Synchronization history
- Background synchronization
- User-visible sync health

Supported item states:

```text
discovered
synced
metadata_only
locked
unpublished
permission_denied
external
unsupported_format
download_failed
parse_failed
ocr_failed
stale
deleted_from_canvas
temporarily_failed
```

Exit criteria:

- Synchronization is idempotent, resumable, low-concurrency, and transparent
  about partial failures.
- Users can see sync health without seeing raw Canvas errors or secret data.

### Future Phase - Grade Goal Planner

Status: Future.

Grade Goal Planner - Allow students to set a desired course grade, such as
90%, and calculate what scores they need on remaining activities using
synchronized Canvas grades, assignment weights, points, submissions, grading
rules, and editable manual assumptions.

Future planner requirements:

- Target-grade input
- Total-points courses
- Weighted assignment-group courses
- Grading periods
- Dropped-score rules
- Excused assignments
- Omitted assignments
- Extra credit
- Hypothetical scores
- Minimum required score
- Feasibility detection
- Best-case projection
- Worst-case projection
- "What happens if" scenarios
- Highest-impact remaining activity
- Manual correction when Canvas data is incomplete
- Confidence labels
- Optional Canvas What-If Grades verification when supported

Required confidence states:

```ts
type GradeProjectionConfidence =
  | "exact_from_visible_canvas_rules"
  | "verified_with_canvas_what_if"
  | "estimated_from_visible_data"
  | "manual_configuration_required"
  | "insufficient_data";
```

Future grade projections must not be described as exact when grading
information is incomplete or hidden.

### Future Phase - Student Intelligence Features

Status: Future.

Later roadmap group:

- Missing-work recovery plans
- Announcement digests
- Deadline-conflict detection
- Professor-feedback summaries
- Rubric weakness detection
- Outcome-based study planning
- Course-progress dashboards
- Transcript-based reviewers
- Searchable lecture captions
- Offline course packs
- Course-wide semantic search
- Recently viewed material
- "Continue where you left off"

Permission-dependent features must be marked honestly. Successful Canvas course
access does not imply access to inbox messages, recent history, captions,
quiz questions, grades, outcomes, or external-tool content.

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
