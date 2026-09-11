# B21.1 Canvas learner-material production acceptance

Date: 2026-09-11 (Asia/Manila)

Verdict: **PASS — B21 Canvas learner-material ingestion proven end-to-end on physical Android.**

## Scope and starting state

B21.1 deployed the committed B21 implementation, ran a new sync for only the
three selected real Canvas courses, repaired two database contract gaps exposed
by production, and completed Canvas → Reviewer → save → Study Library reopen on
a physical Android phone. No local upload substituted for the Canvas source,
no emulator was used, and no DOCX/PPTX/OAuth/Reviewer redesign was added.

- Branch: `main`
- Starting HEAD: `67241d9987de86f6776c36861a10f43daf1085ac`
- Starting divergence: 29 ahead, 0 behind `origin/main`
- Starting dirty path: pre-existing untracked `docs/ai/acceptance/b8/`, preserved
- Git integrity: `git fsck --full` found no corruption and two dangling blobs
- Physical target: realme RMX3151, Android 13, USB debugging authorized

The fresh pre-deployment gates passed: Canvas 73/73, API 624/624, and mobile
377/377, with typechecking passing for each workspace.

## Production deployment

The API was deployed with `npx vercel deploy --prod --yes` and promoted to
`https://stay-focused-v2-prototype.vercel.app`. The final production deployment
is `dpl_DkGEwcPWN5FEpziqE5Lj9Z4rSYu5`, built from
`f60cf770c64cedfa0c1e484c7ae1f1b047cf7096`. It is `READY`; `/api/health`
returned HTTP 200 with `{"status":"ok","version":"2.0.0"}`.

The production environment contained the required Supabase, Canvas-token
encryption, OpenAI, Google Cloud, and processing-backend variables. Values were
not printed. The build reported the repository's dependency-audit and
`allowScripts` warnings, but compilation, type validation, deployment, aliasing,
and runtime health all succeeded.

## Fresh real Canvas sync

The final fresh run began on 2026-09-11 at 12:41 UTC from the installed Android
app. All three jobs reached terminal `succeeded` with a safe `partial` result:
their exact module resources succeeded while the same supplemental broad
collections remained unavailable.

| Course | Modules | Module items | PDF | Image | Page | Assignment material | Unsupported | Selectable |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| CC17 Mobile Application Design and Development | 3 | 5 | 0 | 0 | 0 | 1 | 3 | 1 |
| CIT6 Capstone Project 1 | 2 | 6 | 2 | 0 | 0 | 4 | 0 | 5 |
| CC16 IT Security | 7 | 42 | 8 | 1 | 19 | 12 | 0 | 31 |

`Selectable` is the final picker state. CIT6 contains four substantive
assignment sources and one prepared PDF; its other PDF still honestly reports
`Prepare file`. Empty roll-call assignments remain unavailable.

| Course | Broad Files | Broad Pages | Exact File | Exact Page | Exact Assignment | Final state |
| --- | --- | --- | --- | --- | --- | --- |
| CC17 | `canvas_permission_denied` | `canvas_resource_not_found` | 3/3 succeeded | No module Page candidate | 1/1 succeeded | succeeded / partial |
| CIT6 | `canvas_permission_denied` | `canvas_resource_not_found` | 2/2 succeeded | No module Page candidate | 3/3 succeeded | succeeded / partial |
| CC16 | `canvas_permission_denied` | `canvas_resource_not_found` | 9/9 succeeded | 19/19 succeeded | 8/8 succeeded | succeeded / partial |

The exact Canvas routes were `/api/v1/files/:id`,
`/api/v1/courses/:courseId/pages/:url`, and
`/api/v1/courses/:courseId/assignments/:id`. The broad failures are Canvas
permission/content limitations, not evidence that exact module resources are
unavailable.

## Persistence regression proof

The critical old defect is closed against production. Despite Files and Pages
collection failures in every course, the successful module-owned results
persisted independently:

- CC17: 3 modules, 5 module items, 3 exact file rows, and 2 assignment rows;
- CIT6: 2 modules, 6 module items, 2 exact file rows, and 5 assignment rows;
- CC16: 7 modules, 42 module items, 9 exact file rows, 19 Page rows, and 14
  assignment rows.

The corresponding job-unit evidence shows every candidate-bearing
`module_items_page`, `module_file`, `module_page_detail`, and
`module_assignment` unit succeeded. Supplemental `files_page` and `pages_page`
units failed once with sanitized codes, while the content and files scope
outcomes were recorded as succeeded. No successful owned graph was cleared.

## Selected real Canvas learner material

- Course: CIT6 Capstone Project 1
- Module: Week 1: Deliverables, Policies and Guidelines
- Module item: position 4, Canvas module-item `2761992`
- Material: `CIT6 Course Introduction and Orientation 2026.pdf`
- Type: PDF, 167,395 bytes, 23 pages
- Canvas resource ID: `11437391`
- Canonical V2 source ID: `file:b08d03f7-9e36-44e0-a9f0-0bc9c6d9cd2a`
- Resolver: Canvas `/api/v1/files/11437391`
- V2 ingestion: `/api/canvas/courses/[courseId]/sources/prepare`, using the
  owner-scoped Canvas file-ingestion service and private Storage
- OCR required: no; all 23 pages had usable native text

The persisted file row is `stored`, retains matching source/stored byte counts
and SHA-256 identity, has a successful non-retryable ingestion result, and is
linked back to Canvas module `451507` / item `2761992`. Private bucket keys and
user identifiers are intentionally omitted from this report.

## Physical Android Reviewer E2E

The B21 preview APK build `ede2ae05-99de-4a74-b5e2-a0ee28e008cc` was installed
on the physical realme device. Package `com.galaxymaxp.stayfocusedv2`, app
version `2.0.0`, targeted the production API and retained the authenticated
session.

The picker displayed real Canvas sources grouped by module, including ready
assignments, two CIT6 PDFs requiring preparation, and an unavailable empty
roll-call item. Preparing the selected PDF stored it privately, extracted 23/23
pages, exposed 23 selectable blocks, and produced an exact editable preview.

The durable Reviewer job `0ff834b1-4eb6-4789-95d7-fa62fe3b5010` ran through
the production Vercel Workflow backend and completed on its first worker
attempt. It processed 20/20 sections in 44.820 seconds. The phone rendered the
result, saved it, listed it in Study Library, and reopened the saved record
without regeneration. The saved reviewer is
`e0d48aa1-833d-4e49-bee1-eaf54a2c1adc`, with the same title and 20 sections.

| Step | Result | Evidence |
| --- | --- | --- |
| Canvas source visible | PASS | Real CIT6 PDF shown under the correct module |
| Source selected | PASS | Canonical Canvas-backed V2 source selected |
| Ingestion | PASS | 167,395 bytes stored; 23/23 native-text pages |
| Reviewer job | PASS | Durable production job succeeded, attempt 1 |
| Generation | PASS | 20/20 sections, fresh mode, production `gpt-4o` |
| Rendering | PASS | Grounded reviewer rendered on the phone |
| Save | PASS | Server reviewer row created with snapshot provenance |
| Study Library reopen | PASS | Same title, source context, and 20 sections reopened |

ADB warning-log inspection for the active app found zero fatal exceptions, zero
unhandled React Native errors, and zero transport exceptions. Screenshots of
block selection, exact preview, reviewer, Library listing, and reopen were
captured under ignored `.local/b21/` evidence and were not committed.

## Reviewer verification

- Final sections: 20
- Coverage: 1.00, passed
- Grounding: 1.00, passed
- Leakage: passed
- Grounding/leakage issues: none reported by the persisted verifier metrics
- Source: 7,211 characters before normalization; 7,097 normalized characters
- Provenance: one Canvas file snapshot item, 23 selected snapshot blocks, page
  numbers 1–23, matching normalized and stored hashes
- Runtime behavior: four provider calls and four bounded explanation retries;
  some sections used the visible source-only safety fallback rather than
  accepting text that could not be safely verified

Student-visible inspection showed the correct course/source context, sensible
course-outline sections, readable key points, and explicit grounded/fallback
status. No unsupported enrichment or source leakage was observed.

## Production defects found and repaired

### 1. Exact-resource unit constraint

Classification: `B21_IMPLEMENTATION_DEFECT`.

The application emitted B21's new `module_page_detail`, `module_assignment`, and
`module_file` unit kinds, but the deployed database check constraint still
allowed only the older kinds. Candidate-bearing module pages therefore failed
before exact resolution.

Repair: `20260911122809_allow_canvas_module_material_sync_units.sql` updates and
validates the bounded allow-list. The database contract test now asserts every
B21 exact kind. A production migration dry-run contained only that migration,
the error-level advisor reported no issues, the migration applied, and the
fresh three-course run succeeded as listed above.

### 2. Reviewer snapshot PDF page ceiling

Classification: `B21_IMPLEMENTATION_DEFECT`.

The current synchronous Canvas PDF extractor accepts up to 40 pages, but the
immutable reviewer-provenance item constraint still allowed only 1–5. The real
23-page preview therefore failed before a job could be created.

Repair: `20260911125600_allow_canvas_snapshot_document_page_limit.sql` aligns
snapshot provenance to the existing 1–40 Canvas limit with a `NOT VALID` add
followed by validation. A focused regression checks the exact bound. The only
pending production migration was this change, the advisor was clean, and the
same physical preview then created a successful Reviewer job.

### Other observed limitations

- `CANVAS_PERMISSION_OR_CONTENT_LIMITATION`: broad Files is denied and broad
  Pages is unavailable for all three courses; exact module resources still work.
- `UNSUPPORTED_FORMAT`: CC17 contains three PPTX files that remain safely
  metadata-only and unselectable, as required by scope.
- `DEPLOYMENT_ENVIRONMENT`: npm reported 58 dependency audit findings and six
  pending install scripts during Vercel builds; these did not block build or
  runtime health and were not broadened into dependency remediation.

## Fresh final regression

| Suite | Result |
| --- | --- |
| Canvas typecheck/tests | PASS; 73/73 |
| API typecheck/tests | PASS; 626/626 across 71 files |
| Mobile typecheck/tests | PASS; 377/377 across 31 files |
| Engine typecheck/build/eval | PASS; 606/606, including 157/157 architecture |
| Supabase migration parity/advisor | PASS; both B21.1 migrations remote, no error-level findings |
| Vercel production build/health | PASS; READY, HTTP 200 |

## Result

The purpose of B21.1 is satisfied: a genuine learner PDF was discovered from a
module through the repaired Canvas path, persisted despite failed supplemental
collections, ingested and resolved into exact blocks, generated through the
real production Reviewer workflow, rendered on a physical Android phone, saved,
and reopened from Study Library. B22 was not started and nothing was pushed.

Next: begin B22 only as a separately scoped task; keep the known broad Canvas
permission/content limitations and intentional PPTX/DOCX exclusions explicit.
