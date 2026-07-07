# Phase 5D.3 - Source Relationships And Freshness

Date: 2026-07-07

## Summary

Phase 5D.3 adds duplicate/repeated Canvas source context, private immutable
relationship provenance, and a manual saved-reviewer source-status check. It is
readiness assessment only. It does not regenerate reviewers, create a
regeneration route, call OpenAI, automatically synchronize Canvas, or display
source/block diffs.

## Duplicate Model

Same-source duplicates use a private deterministic identity built from
server-derived ownership and Canvas source fields: Stay Focused user, Canvas
connection, course, source type, and Canvas source object identity. The raw key
is never returned to mobile.

Exact-content duplicates use the complete normalized source-content SHA-256
from the current parser/OCR output. Empty normalized content is ignored. The
hash remains private. Fuzzy matching, semantic matching, embeddings, AI
similarity, title-only matching, and prefix matching are not used.

When exact-content duplicates are found, the first source in submitted order is
canonical. Canonical blocks remain selected by default; later exact duplicates
remain visible but are unselected by default and can still be manually selected.

## Repeated References

Repeated references are separate from duplicates. They describe one Canvas
source object being reachable through multiple Canvas locations, such as file
references or module items. Mobile receives only broad safe categories:
`module`, `page`, `assignment`, and `announcement`. Raw Canvas reference IDs,
module IDs, object IDs, internal row IDs, URLs, and hashes remain private.

## Private Provenance

Migration `202607080001_add_canvas_source_relationships_freshness.sql` adds:

- `source_relationship_manifest` and `duplicate_analysis_version` to Canvas
  preview and structure sessions.
- Private `reviewer_source_snapshot_item_relationships` rows with relationship
  types `same_source`, `same_content`, and `canvas_reference`.
- Same-owner and same-snapshot composite foreign keys.
- Bounded type/reference checks, deterministic uniqueness, service-role-only
  grants, RLS, lookup indexes, and immutable update blocking.
- Snapshot RPC copying from preview-session relationship manifests into
  immutable relationship rows.

Follow-up migration `202607080002_harden_source_relationship_grants.sql`
reasserts service-role-only table access after Supabase default grants by
revoking relationship-table privileges from `service_role` and granting back
only `select`, `insert`, and `delete`.

Historical Phase 5D.1 snapshots with no relationship rows remain valid.

## Source Status

`GET /api/reviewers/:id/source-status` is protected by bearer authentication
and uses owner-scoped service reads. It returns only safe counts, statuses,
actions, and source titles already visible to the owner. It returns no hashes,
private IDs, raw source text, block text, Canvas URLs, Storage keys, or
credentials.

The check reads synchronized database state only. It does not call Canvas,
decrypt the Canvas PAT, read Storage, invoke OCR, or call OpenAI.

Textual Pages, assignments, and announcements are normalized with the current
HTML-to-text sanitizer and compared against the immutable normalized-content
hash. Prepared PDF/image files compare stored content identity and preparation
metadata without rerunning OCR.

Status states:

- `current`: current synchronized content identity matches the snapshot.
- `changed`: current source exists but content identity differs.
- `unavailable`: current row exists but is locked, hidden, unavailable, or
  missing required prepared private content.
- `unsupported`: current row exists but the current app cannot normalize it
  through Phase 5D source paths.
- `missing_after_sync`: stable identity is absent only after later authoritative
  successful sync evidence.
- `unknown`: evidence is partial, failed, older than the snapshot, ambiguous,
  or historically insufficient.

The user-facing copy remains conservative and does not claim an instructor
deleted content.

## Readiness

Reviewer-level readiness states are:

- `ready_current`
- `ready_with_changes`
- `blocked_missing_sources`
- `blocked_unavailable_sources`
- `blocked_unsupported_sources`
- `unknown`

These states are only a future-regeneration assessment. No reviewer text is
constructed and no replacement workflow is exposed in this phase.

## Mobile

Canvas source structure responses include a safe duplicate summary per source.
The Canvas source reviewer screen shows exact duplicate and repeated-reference
context while preserving manual source/block selection.

Study Library reviewer detail includes a manual source-health refresh for saved
Canvas reviewers. It shows not-checked, checking, current, changed,
attention-required, unknown, readiness, safe actions, and per-source statuses.
It has no regeneration button and performs no automatic sync.

## Verification

Automated coverage includes:

- API duplicate/repeated relationship service tests.
- API source-status service tests for current, changed, missing-after-sync,
  partial/failed/old-sync unknown, unsupported, unavailable, file preparation,
  cross-user denial, and no-snapshot safety.
- API route tests for auth-first handling, owned reviewer success, no-snapshot
  safety, not-found denial, storage errors, and safe CORS.
- Mobile parser tests for duplicate summaries and source-status payloads.
- DB typecheck for the updated generated-style types.

Remote database verification is covered by
`scripts/phase5d3-source-relationships-freshness-verification.sql`, which uses
fictional rollback-only data to verify relationship storage, columns, RLS,
direct grant denial, service-role grants, ownership constraints, same-snapshot
constraints, uniqueness, invalid type rejection, immutable update rejection,
snapshot reuse, and historical snapshot compatibility.

Remote verification passed with 18/18 checks after applying
`202607080001_add_canvas_source_relationships_freshness.sql` and
`202607080002_harden_source_relationship_grants.sql`. Supabase security and
performance advisors were reviewed; remaining warnings were historical.

## Live Validation

Protected live validation was not completed during this audit session. Validate
Phase 5D.3 with aggregate opaque output only after any required earlier Phase
5D protected live-validation catch-up steps are complete.
