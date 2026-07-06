# Phase 5C.2A2 - Canvas Source Selection And Reviewer Handoff

Date: 2026-07-07, Asia/Manila.

## Starting State

- Branch: `main`
- Starting commit: `f825b10 feat(canvas): add selected course synchronization`
- Upstream status: `main...origin/main`, ahead 0 and behind 0
- Known unrelated dirty files left untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`

## Phase Boundary

This phase completes the first user-facing Canvas-to-reviewer loop for
textual Canvas content already synchronized into the database:

```text
selected synchronized course
-> source picker
-> ordered source preview
-> editable source text and title
-> existing reviewer-generation API
-> existing reviewer preview
-> existing Study Library save
```

The implementation reuses the Phase 5C.2A1 selected-course boundary and the
existing reviewer and Study Library routes. It does not call Canvas, decrypt the
Canvas PAT, call Storage, run OCR, download files, parse files, or call OpenAI
during source listing or source preview.

## Supported Sources

Selectable sources:

- Canvas Page body text
- Assignment description text
- Announcement message text

Each source is available only when server-side HTML normalization produces
non-empty readable text. Titles alone are never treated as study content.

Listed but unavailable:

- Canvas file metadata rows without extracted text

Deferred:

- Canvas PDF parsing
- Canvas image OCR
- Office document parsing
- spreadsheet parsing
- audio/video transcription
- Canvas Studio media
- submissions, grades, rubrics, feedback
- cross-course source bundles
- full persistent provenance history

## Source-List Contract

Route:

```text
GET /api/canvas/courses/:courseId/sources
```

The route authenticates with the Supabase bearer token, resolves the active
owned Canvas connection, verifies the internal course belongs to that
connection and user, verifies the course is still selected, and returns only
descriptors from that course.

Descriptor shape is intentionally narrow:

- internal stable source id
- source type
- sanitized title
- availability
- unavailable reason
- updated timestamp
- estimated character count

The listing response excludes source bodies, raw HTML, Canvas URLs, signed
URLs, Storage object keys, raw synchronization errors, and credential fields.
Ordering is deterministic: available sources first, then type order
Page -> Assignment -> Announcement -> File, then sanitized title, then internal
source id.

The listing uses a bounded page size of 100 descriptors, an offset cap of 1000,
and per-type fetch caps as a pagination-ready safety boundary.

## Preview Contract

Route:

```text
POST /api/canvas/courses/:courseId/sources/preview
```

The request accepts ordered internal source descriptor ids. The server rejects:

- empty selections
- duplicate ids
- malformed ids
- unsupported source types
- unavailable sources
- unknown sources
- cross-course sources
- deselected-course access
- source count over the configured maximum
- per-source text over the configured maximum
- combined preview text over the configured maximum

The server preserves the submitted source-picker order and assembles plain text
with readable source boundaries. The preview response is protected UI
provenance only; source ids, course ids, URLs, Storage keys, and Canvas
credentials are not sent to the generation provider.

## HTML Normalization

The server uses `parse5` for HTML parsing. The normalizer extracts readable
text, decodes safe entities, preserves headings, paragraphs, lists, and table
row/cell separation, and removes scripts, styles, forms, hidden elements,
iframes, embeds, SVG, canvas, token-looking strings, bearer tokens, signed
parameters, and direct URLs.

Malformed HTML is parsed inertly and no external resources are fetched.

## Limits

- Maximum sources per preview: 8
- Maximum characters per source: 20,000
- Maximum combined preview characters: 90,000
- Existing reviewer request source-text limit: 100,000
- Suggested-title limit: 120
- Retained headroom: 10,000 characters plus JSON overhead and student edits

Over-limit responses include only sanitized counts and limits. They do not
return source text and do not silently truncate.

## Mobile Experience

The Courses screen now shows `Create reviewer from Canvas` for saved selected
courses with terminal synchronization history. Unsynchronized selected courses
show `Sync this course first`.

The Canvas source reviewer screen includes:

- course freshness summary
- sync-required state
- partial/failed sync warnings
- Pages, Assignments, Announcements, and Files sections
- disabled unavailable files
- multi-select with an 8-source maximum
- selected count
- retry loading
- preview action
- editable preview text
- editable source title
- generation through the existing reviewer service
- save through the existing Study Library service with `sourceMode: "canvas"`

No account-wide synchronization or automatic reviewer generation is triggered
by opening the screen.

## Reviewer Handoff

Generation calls the existing reviewer API with only:

```json
{
  "sourceText": "...",
  "sourceTitle": "..."
}
```

Canvas source ids, course ids, URLs, Storage keys, credentials, and provenance
objects are not included in the reviewer-generation request. Saving uses the
existing Study Library API and stores only minimal metadata:

- source mode: `canvas`
- source character count
- safe source label

No permanent Canvas provenance tables were added.

## Automated Verification

Focused checks passed:

- `npm run test --workspace apps/api -- src/lib/canvas-reviewer-sources.test.ts`
  - 11 passed, 0 failed
- `npm run test --workspace apps/api -- app/api/canvas/courses/[courseId]/sources/route.test.ts app/api/canvas/courses/[courseId]/sources/preview/route.test.ts`
  - 10 passed, 0 failed
- `npm run test --workspace apps/mobile -- src/services/canvasApi.test.ts`
  - 22 passed, 0 failed

Package and app checks passed:

- `npm run typecheck --workspace @stay-focused/canvas`
- `npm run build --workspace @stay-focused/canvas`
- `npm run test --workspace @stay-focused/canvas`
  - 52 passed, 0 failed
- `npm run typecheck --workspace @stay-focused/db`
- `npm run typecheck --workspace apps/api`
- `npm run build --workspace apps/api`
- `npm run test --workspace apps/api`
  - 220 passed, 0 failed after Phase 5C.2A2 service coverage
- `npm run typecheck --workspace apps/mobile`
- `npm run test --workspace apps/mobile`
  - 88 passed, 0 failed
- `npm run typecheck --workspace @stay-focused/engine`
- `npm run build --workspace @stay-focused/engine`
- `npm run eval --workspace @stay-focused/engine`
  - 266 passed, 0 failed
- `npm run typecheck --workspace @stay-focused/ocr`
- `npm run build --workspace @stay-focused/ocr`
- `npm run test --workspace @stay-focused/ocr`
  - 14 passed, 0 failed

Final root workspace verification is recorded in the commit report.

## Protected Live Validation

Validation used the existing encrypted Canvas connection, the established
smoke-test user, local production API on `127.0.0.1:3000`, and Expo Web for
the mobile picker/editor smoke. Output below uses only aggregate counts and
opaque labels.

### Source Inventory

- Opaque course reference: `live-course-1`
- Latest course sync status: `partial`
- Latest course sync age at validation time: approximately 292 minutes
- Available Pages: 36
- Unavailable Pages: 2
- Available assignments: 0
- Unavailable assignments: 0
- Available announcements: 11
- Unavailable announcements: 0
- Unavailable PDFs: 0
- Unavailable images: 0
- Metadata-only media: 0
- Blocked files: 0
- Total descriptors: 49
- Source bodies present in list response: no
- Account-wide route called: no
- Canvas called by source listing: no

### Preview

- Sources requested: 2
- Source types: Page, Announcement
- Preview character count: 3,467
- Suggested-title length: 55
- Deterministic assembly: passed
- Empty sources rejected: passed
- Unsupported file preview: not exercised live for this selected course; covered
  by automated service and route tests
- Cross-course source mixing rejected: passed
- Cross-user preview denial: covered by ownership fixtures and RLS posture
- URLs present in preview text: no
- Credentials present in preview text or suggested title: no
- Canvas called: no
- Storage called: no
- OCR invoked: no
- OpenAI invoked by preview: no

### Mobile UI Smoke

Expo Web smoke result:

- Authentication: signed in
- Courses opened: yes
- Canvas reviewer opened: yes
- Source rows seen: 49
- Sources selected: 2
- Preview loaded: yes
- Source text edited: yes
- Title edited: yes
- Back navigation preserved selection: yes
- Preview reloaded: yes

### Reviewer Generation And Save Smoke

The smoke used the student-approved preview text plus a harmless temporary
validation edit, called the existing reviewer-generation API, saved through the
existing Study Library API, verified list visibility, and deleted the smoke
reviewer.

- Existing reviewer API reused: yes
- Source count: 2
- Source character count: 3,467 before the temporary edit
- Student edit verified: yes
- Title edit verified: yes
- Generation result: HTTP 200
- Reviewer generated: yes
- Reviewer section count: 2
- Saved: yes
- Visible in Study Library: yes
- Cleanup result: deleted
- Canvas metadata sent to OpenAI: no
- Canvas credentials sent to OpenAI: no

## Security Verification

- Selected-course boundary is enforced by the API service and route.
- Deselected-course live access was denied.
- Cross-course source mixing live access was denied.
- Cross-user denial is covered by authenticated ownership filters, service
  tests, and RLS posture; no second live user credentials were available for
  this smoke.
- Unsupported file preview is covered by automated service and route tests.
- Preview limits are covered by automated service tests.
- Source listing excludes bodies.
- Preview does not call Canvas, Storage, OCR, or OpenAI.
- Reviewer generation receives only edited source text and source title.
- The mobile reviewer API diagnostic log no longer prints generated reviewer
  titles.
- No migration was added.

## Limitations

- Canvas file contents remain unavailable until parser/OCR work begins.
- The live selected course used for aggregate validation had no file descriptors
  in its source-list page, so unavailable file UI behavior was validated by
  fixtures and automated tests rather than that specific live course.
- Cross-user live validation was not run because no separate second smoke-user
  credentials were available.
- The source-list pagination boundary is intentionally simple and
  pagination-ready; advanced search and filtering remain deferred.
- The preview provenance returned to mobile is transient and is not stored as a
  permanent source-history model.

## Final Verdict

PASS - Phase 5C.2A2 Canvas source-selection and reviewer handoff complete.

Next roadmap task: Phase 5C.2B - Canvas PDF and image extraction/OCR
integration.
