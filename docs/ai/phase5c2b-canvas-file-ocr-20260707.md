# Phase 5C.2B - Canvas PDF And Image OCR Sources

Date: 2026-07-07, Asia/Manila.

## Summary

Phase 5C.2B is implemented for Canvas PDFs, PNGs, and JPEGs as reviewer
sources. The flow keeps preparation and preview separate:

```text
selected synchronized Canvas course
-> eligible file descriptor
-> explicit Prepare action
-> existing secure Canvas ingestion boundary
-> private stored file
-> select one ready PDF/image file with optional text sources
-> preview reads private stored bytes and runs server-only OCR
-> editable source text/title
-> existing reviewer-generation API
-> existing Study Library save
```

No migration was required. OCR output is transient only and is not stored by
Canvas file preparation, Canvas source preview, Supabase Storage, or reviewer
source metadata.

## Implemented Boundary

- Source listing now returns a safe file-state object for Canvas files and still
  avoids Canvas, Storage, OCR, and OpenAI calls.
- `POST /api/canvas/courses/:courseId/sources/prepare` validates owned
  `file:<internal-row-id>` descriptors and delegates to the existing
  `ingestCanvasFiles` service.
- Source preview supports ordered mixtures of Pages, assignment descriptions,
  announcements, and one ready OCR-backed file.
- Preview rejects two or more file sources before Storage download or OCR.
- Stored-file extraction validates owner, connection, selected course, private
  bucket, object-key ownership shape, byte count, SHA-256, MIME/signature,
  PDF parseability, PDF encryption, and PDF page count before OCR.
- Manual image/PDF OCR routes and Canvas stored-file preview share OCR
  validation/provider helpers instead of calling each other over HTTP.
- Mobile source selection adds prepare, preparing, ready, failed, unsupported,
  unavailable, one-file selection, and extraction-loading states without adding
  a parallel reviewer flow.
- Reviewer generation still receives only `sourceText` and `sourceTitle`.

## Supported Matrix

| Source type | Status |
| --- | --- |
| Canvas Page | Listed, selectable, previewed |
| Assignment description | Listed, selectable, previewed |
| Announcement | Listed, selectable, previewed |
| Canvas PDF | Listed, preparable, selectable when ready, OCR previewed |
| Canvas PNG | Listed, preparable, selectable when ready, OCR previewed |
| Canvas JPEG | Listed, preparable, selectable when ready, OCR previewed |
| Plain text/Markdown file | Listed as unsupported metadata only |
| Office document | Listed as unsupported metadata only |
| Audio/video | Listed as media/unsupported metadata only |

## Verification

Automated verification passed:

- Canvas package typecheck, build, and tests: 52/52.
- DB package typecheck: passed.
- OCR package typecheck, build, and tests: 14/14.
- API typecheck, production build, and tests: 269/269.
- Mobile typecheck and tests: 92/92.
- Engine typecheck, build, and evals: 266/266.
- Root Turbo typecheck: 7/7 tasks, 5 cached and 2 fresh.
- Root Turbo build: 7/7 tasks, 5 cached and 2 fresh.
- Workspace tests: API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14.

Protected live validation used the existing smoke-test user and opaque labels.
Two selected synchronized courses were checked. The inventory had 0 eligible
PDFs and 2 eligible images; both images needed preparation. Opaque
`live-course-2/live-file-1` was prepared through the course-scoped route,
prepared again idempotently, refreshed to ready, selected with one Page and one
announcement, and previewed through private Storage plus OCR. The preview
preserved Page -> Image -> Announcement order, returned one OCR-backed source,
reported image kind, produced non-empty extracted text, and returned no Storage
keys, signed URLs, file bytes, hashes, credentials, or Canvas URLs.

Reviewer generation and Study Library save/delete passed through the existing
API using a harmless edited source text. An exploratory generation attempt that
included the very short/noisy live OCR preview text returned
`reviewer_validation_failed`; this did not affect the Canvas preparation,
Storage, OCR, preview, edit, save, or cleanup boundaries. The completed
edited-text smoke generated one reviewer section, saved it to Study Library,
verified list visibility, and deleted the validation reviewer.

## Security Result

- Source listing: no Canvas call, no Storage call, no OCR call, no OpenAI call.
- Preparation: Canvas call and PAT decryption are isolated to the existing
  server-side ingestion boundary.
- Preview: no Canvas call, no PAT decryption, no OpenAI call; private Storage
  read and OCR are server-side only.
- Mobile and API responses do not return Storage object keys, signed URLs,
  file bytes, Canvas credentials, Canvas URLs, hashes, OCR provider internals,
  or raw ingestion rows.
- Reviewer generation receives no Canvas course IDs, source IDs, file IDs,
  filenames, MIME types, page metadata, Storage information, Canvas URLs, or
  credentials.

## Remaining Limitations

- One OCR-backed Canvas file per preview is the synchronous safeguard.
- OCR output is not cached.
- PDFs remain limited to one to five pages.
- Office documents, spreadsheets, plain text/Markdown Canvas files, audio,
  video, Canvas Studio, discussions, quizzes, submissions, grades, rubrics,
  feedback, and background/resumable ingestion remain deferred.
- Full persistent Canvas source provenance remains deferred to Phase 5D.

## Next Recommendation

Proceed to Phase 5D - Source Normalization, Provenance, And Selective Import.
