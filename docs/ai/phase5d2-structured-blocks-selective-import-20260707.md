# Phase 5D.2 - Structured Blocks And Selective Canvas Import

Date: 2026-07-07.

Phase 5D.2 adds block-level structure and selective import for the existing
Canvas reviewer path. It does not complete all Phase 5D work, and it does not
implement Phase 5D.3 deduplication, stale-source comparison, deleted-source
handling, regeneration, or broader parser support.

## Security Status

Credential rotation is still not confirmed for the values previously reported
as exposed in local tool output:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- Google OCR credential material
- `CANVAS_PERSONAL_ACCESS_TOKEN`
- `CANVAS_TOKEN_ENCRYPTION_KEY`

SECURITY ACTION REQUIRED - protected live validation remains blocked pending
credential rotation.

Implementation, local automated verification, and remote database verification
were completed without printing credential values. Protected live Canvas, OCR,
or OpenAI validation was not run.

## Implemented Boundary

The Canvas reviewer flow is now:

```text
select Canvas sources
-> structure each source into server-issued blocks
-> store a private 24-hour structure session
-> select or clear blocks grouped by source
-> build a selective preview from server-stored blocks
-> edit final selected text/title
-> generate through the existing reviewer API
-> copy selected block provenance into the immutable source snapshot
-> save to Study Library
```

The reviewer engine/provider boundary remains unchanged. OpenAI receives only
the final edited `sourceText` and optional `sourceTitle`; it receives no
structure session IDs, block IDs, block metadata, Canvas IDs, hashes, parser
versions, OCR versions, page numbers, Storage fields, or private provenance.

## Structured Block Model

Server public blocks use opaque UUIDs and safe display metadata:

- `heading`
- `paragraph`
- `list_item`
- `table`
- `quote`
- `code`

Public responses include readable block text for the authenticated student's
review screen, source/block ordinals, heading level, list depth/style, page
number where available, and selection flags. Public responses do not expose
database row IDs, Canvas object IDs, connection IDs, course IDs, module IDs,
file IDs, hashes, Storage paths, parser versions, OCR versions, provider names,
URLs, or credentials.

Private manifests preserve exact normalized block text, block SHA-256,
heading/list/table/page context, parser/OCR versions, source ordinals, source
manifest details, and synchronization timestamps.

## Normalization

Canvas HTML sources use `parse5` and keep visible headings, paragraphs, list
items with nesting depth, whole tables with row/cell/header structure, block
quotes, and preformatted/code blocks. Existing Canvas source safety remains in
place: hidden, executable, form, iframe/embed/object/canvas/svg content and
credential-like text are excluded or sanitized.

OCR-backed PDF/image sources reuse `OcrResult.pages`, `OcrPage.blocks`, and
line ordering instead of splitting the already flattened text. Image OCR is
modeled as page 1. PDF page numbers are preserved. Explicit bullet and numbered
lines become list items; uncertain OCR text remains paragraphs. Heading levels
and slide numbers are not invented.

Oversized non-table blocks may be split deterministically at safe boundaries.
Oversized tables fail safely rather than dropping rows or silently truncating.

## Database

Migration:

- `202607070004_add_canvas_selective_source_blocks.sql`

New/changed private data:

- `canvas_source_preview_sessions.selected_block_manifest`
- `canvas_source_structure_sessions`
- `reviewer_source_snapshot_blocks`

Structure sessions are private, server-authoritative, bounded to 8 sources and
400 blocks, and expire within 24 hours. They have RLS enabled, no direct
`anon` or `authenticated` grants, service-role access only, owner/course
validation, and an immutable update-blocking trigger.

Snapshot blocks are immutable private rows copied during
`create_reviewer_source_snapshot` when a selective preview session contains a
selected-block manifest. They relate to both the source snapshot and the
correct source snapshot item, preserve exact selected block text and hashes,
and remain compatible with historical Phase 5D.1 snapshots that have no block
rows.

## API

Added:

- `POST /api/canvas/courses/:courseId/sources/structure`
- `POST /api/canvas/courses/:courseId/sources/selective-preview`

Both routes authenticate before parsing, accept strict JSON bodies with
allowlisted fields, and return safe errors. The structure route validates
owned selected-course sources, preserves submitted source order, invokes OCR
only when a selected prepared file needs it, and creates a structure session
only after all selected sources normalize successfully.

The selective-preview route validates the owned unexpired structure session,
unique selected opaque block IDs, selectable blocks, selected-block limits, and
route-course ownership. It reconstructs text entirely from server-stored
blocks, preserves source and block order, omits unselected sources, stores a
Phase 5D.1 preview session with `canvas-selective-preview-v1`, and never
reruns OCR, calls Canvas, decrypts the PAT, or calls OpenAI.

## Mobile

The Canvas reviewer screen now has a block-selection stage between source
choice and editable preview. Students can:

- structure selected sources
- see blocks grouped under each source
- toggle individual blocks
- select all blocks for a source
- clear a source
- see the selected block count
- build a selective editable preview
- return from preview to the block selector

Selection changes invalidate the preview, generated reviewer, and source
snapshot ID. Study Library provenance summaries now show a safe selected-block
count without exposing hashes or private IDs.

## Verification

Automated verification passed:

- DB typecheck: passed.
- Shared typecheck/build: passed; no shared test script is present.
- Canvas typecheck/build/tests: 52/52.
- OCR typecheck/build/tests: 14/14.
- API typecheck/build/tests: 299/299.
- Mobile typecheck/tests: 95/95.
- Engine typecheck/build/evals: 266/266.
- Root build: 7/7 workspaces.
- Root workspace tests: API 299/299, mobile 95/95, Canvas 52/52, OCR 14/14.
- Root typecheck: passed after rerun; the first root typecheck hit the known
  generated `.next/types` OneDrive artifact issue while root build was
  regenerating Next output.

Remote database verification passed:

- Dry-run listed only `202607070004_add_canvas_selective_source_blocks.sql`.
- Remote migration push applied `202607070004`.
- Migration history includes local and remote `202607070004`.
- `scripts/phase5d2-selective-blocks-verification.sql` returned 18/18 PASS
  checks against rollback-only fictional data.
- Supabase advisors reported only historical warnings; no new Phase 5D.2 table
  or RPC finding was introduced.

Protected live validation:

- Not run.
- Blocked pending confirmed credential rotation and Canvas reconnection.

## Defects Found

- Mobile block selector compile gaps after the first UI patch: missing default
  block selection helper, block-kind formatter, `blockText` style, and new
  selective-preview error messages. Fixed and covered by mobile typecheck/tests.
- New route tests initially omitted the `beforeEach` import. Fixed before the
  API typecheck/test pass.
- Remote Supabase dry-run initially used the shorter `supabase/migrations`
  directory; the complete migration history lives under `packages/db/migrations`.
  Remote verification was rerun from a temporary CLI workdir built from the
  complete migration directory.

## Remaining Phase 5D Work

- Phase 5D.3 duplicate-source detection.
- Repeated-source relationship modeling.
- Stale-source comparison.
- Deleted-source handling.
- Source diff UI.
- Unsupported-source reporting expansion.
- Regeneration readiness.
- Broader parser support.
