# Phase 5B.3C1 Conditional Request Audit - 2026-07-06

## Scope

Phase 5B.3C1 audits whether the currently synchronized Canvas endpoint
families support reliable HTTP conditional requests for future network
efficiency work.

This phase is capability validation only. It does not implement production
conditional fetching, validator persistence, raw response caching, graph
reconstruction from cached responses, database migrations, scheduled sync,
background workers, secondary Canvas resources, mobile sync UI, or reviewer
generation from Canvas content.

## Starting Baseline

- Branch: `main`
- Starting commit: `6401ee9 feat(canvas): add incremental academic graph sync foundation`
- Ahead/behind: 0/0
- Stored Canvas connection: available, exactly one encrypted connection
- Running Canvas sync rows before audit: 0
- Known unrelated dirty files left untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`

## Audit Harness

The local-only ignored harness lived under `.local/` and reused the existing
API-side Supabase service client and Canvas token decryption helper. It did not
change production synchronization behavior, create sync runs, modify graph
state, persist validators, or print secret values.

Reported setup:

- connection available: yes
- decryption succeeded: yes
- audit client initialized: yes
- successful course samples: 3 local labels
- paginated samples: 2 endpoint pages

The harness used the same security posture as the production client for this
audit: normalized HTTPS Canvas base URL, bearer authorization containment,
finite timeout, `redirect: "manual"`, and same-origin API pagination-link
validation. Response bodies were parsed only in memory to select safe follow-up
requests; no body content, Canvas IDs, course names, Page titles, validator
values, raw headers, or raw responses were written to committed files.

## Endpoint Families Audited

- Active course listing
- Module listing
- Module-item listing
- Page listing
- Page-detail retrieval
- Assignment-group listing
- Assignment listing

Audit breadth:

- Baseline ordinary GET requests: 10
- Primary conditional requests: 10
- Controlled conditional subtests: 20
- Page details sampled: 3
- Later paginated page sampled: yes
- Known Page-listing failure courses probed only for classification: 4

## Validator Presence

| Endpoint family | ETag present | Last-Modified present | Cache-Control present | Vary present |
|---|---:|---:|---:|---:|
| Courses | yes | no | yes | yes |
| Modules | yes | no | yes | yes |
| Module items | yes | no | yes | yes |
| Pages | yes | no | yes | yes |
| Page detail | yes | no | yes | yes |
| Assignment groups | yes | no | yes | yes |
| Assignments | yes | no | yes | yes |

ETags were stable across repeated unchanged requests for every sampled
endpoint. `Last-Modified` was absent across all audited endpoint families.

## Conditional Behavior

| Endpoint family | If-None-Match 304 | If-Modified-Since 304 | Both headers 304 | Primary result | Recommendation |
|---|---:|---:|---:|---|---|
| Courses | no | no | no | 200 with full body | ordinary GET |
| Modules | no | no | no | 200 with full body | ordinary GET |
| Module items | no | no | no | 200 with full body | ordinary GET |
| Pages | no | no | no | 200 with full body | ordinary GET |
| Page detail | no | no | no | 200 with full body | ordinary GET |
| Assignment groups | no | no | no | 200 with full body | ordinary GET |
| Assignments | no | no | no | 200 with full body | ordinary GET |

No audited endpoint returned `304 Not Modified`. Because every primary
conditional request returned `200` with the same body-byte count as baseline,
the observed conditional-request value is unsupported for the currently
synchronized endpoint families.

## Pagination Findings

- Per-page validators required: yes, if conditional fetching is ever attempted.
- First-page `304` preserves next links: not observed; no first-page `304` was
  returned.
- Later-page audit: yes, a second Page-list page was audited.
- Later page had a validator: yes.
- Later-page changes can be missed by first-page-only validation: yes.

Safe production rule if future evidence changes: store independent validator
and pagination state per endpoint page. Never skip later pages based only on a
page-1 validator. Do not assume one collection validator covers every page.

## Page-Detail Findings

Page details were audited separately because Page body HTML is persisted and
fingerprinted.

- Sampled Page details: 3
- Page-detail validators present: yes
- Page-detail `304` observed: no
- Page-list and Page-detail validators are independent endpoint metadata: yes
- Page-list `304` safely implies Page bodies unchanged: no

Even if a Page list eventually returns a useful validator, it must not be
treated as proof that Page body HTML is unchanged. Page-detail validators would
need separate state per Page.

## Module-Item Findings

- Module-list validators present: yes
- Module-item-list validators present: yes
- Module-item `304` observed: no
- Each module would need independent validator state: yes
- An unchanged module list proves module items unchanged: no

Module lists and module-item collections remain separate synchronization
surfaces. Do not skip module-item requests solely because the module list is
unchanged.

## Assignment Findings

- Assignment-group validators present: yes
- Assignment validators present: yes
- Assignment-group `304` observed: no
- Assignment `304` observed: no
- Separate validator state would be required: yes
- Assignment-group stability proves assignment stability: no

Assignment groups and assignments should continue to be fetched independently.

## Network Measurements

Primary comparison:

- Baseline requests: 10
- Conditional requests: 10
- Baseline HTTP 200 responses: 10
- Conditional HTTP 200 responses: 10
- Conditional HTTP 304 responses: 0
- Baseline body bytes: 154,503
- Conditional body bytes: 154,503
- Body-byte reduction: 0%
- Baseline duration: 3.467 seconds
- Conditional duration: 3.993 seconds

Controlled subtests:

- Requests: 20
- HTTP 200 responses: 20
- HTTP 304 responses: 0
- Body bytes: 309,006
- Duration: 6.631 seconds

Expected production value: unsupported for the audited endpoint families.
This small audit does not prove broader Canvas behavior; it proves only that
the stored connection's currently synchronized endpoints did not produce useful
conditional responses during this run.

## Graph Reconstruction Requirements

A `304` response has no fresh body. Production conditional fetching would need
both validator state and exact reconstruction of the normalized fingerprint
payload from prior persisted data.

| Resource family | Existing DB graph sufficient | Missing information | Safe for conditional implementation |
|---|---|---|---|
| Course | no | Active course-list cache and validator state for all discovered courses, including courses without successful graph rows | no |
| Modules | yes | Per-course module-list validator state | no |
| Module items | yes | Per-module item-list validator state and pagination state | no |
| Pages | yes | Per-course page-list validator state and pagination state; cannot replace Page-detail state | no |
| Page details | yes | Per-page-detail validator state | no |
| Assignment groups | yes | Per-course assignment-group validator state | no |
| Assignments | yes | Per-course assignment-list validator state and pagination state if present | no |

The existing graph tables are generally sufficient to reconstruct normalized
payloads for successful course graph resources, including Page body HTML,
Canvas timestamps, JSON fields, arrays, and ordering after canonicalization.
The active course list is different: failed Page-listing courses can be
discovered without having successful graph rows, so course-list conditional
fetching would require separate cached list state before it could be safe.

## Known Page Failure Confirmation

The four known Page-listing failures were confirmed without exposing course
identities.

- Page-listing failures: 4
- Category: `resource_not_found`
- Retryable: false
- Final code: `canvas_course_pages_failed`
- Conditional headers changed classification: no
- Returned `304`: no
- Graph or fingerprint advanced: no

The audit does not treat those failures as successful empty-Page collections.

## Security Assessment

- No PAT, bearer token, authorization header, Canvas base URL, Canvas ID,
  course name, module name, Page title, Page body, assignment name, assignment
  description, raw validator, raw response header, raw response body, internal
  UUID, or fingerprint value was committed.
- Raw ETag values were used only in memory for conditional requests and were
  not written to committed documentation.
- Raw ETag values may be acceptable for future internal service-role storage
  if they remain private metadata, but they should not be returned publicly or
  logged.
- HTTPS-only Canvas URL normalization remained active.
- Redirect rejection remained active.
- Same-origin pagination validation remained active.
- Authorization header containment remained active.
- Timeout behavior remained active.
- PAT encryption, authenticated ownership, and service-role persistence
  boundaries were unchanged.

## Automated Verification

Production source was not changed, so the focused verification set passed:

- `npm run typecheck --workspace @stay-focused/canvas`: PASS, fresh
- `npm run build --workspace @stay-focused/canvas`: PASS, fresh
- `npm run test --workspace @stay-focused/canvas`: PASS, fresh, 33/33
- `npm run typecheck --workspace apps/api`: PASS, fresh
- `npm run build --workspace apps/api`: PASS, fresh
- `npm run test --workspace apps/api`: PASS, fresh, 176/176
- `npm run typecheck --workspace apps/mobile`: PASS, fresh
- `npm run test --workspace apps/mobile`: PASS, fresh, 79/79

## Decision

Outcome C: no useful validator support was observed.

Do not implement Phase 5B.3C2 for the audited endpoint families now. Continue
ordinary GET behavior for courses, modules, module items, Pages, Page details,
assignment groups, and assignments. Do not invent validators and do not skip
requests based only on course-level fingerprint state.

Recommended next phase: Phase 5B.4 secondary Canvas resource synchronization.
