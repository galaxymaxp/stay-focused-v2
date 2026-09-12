# B24.5 backend UI contract

## Scope and starting evidence

Architecture alignment for Today, Learn, Tasks and Library; no mobile visual or
navigation implementation. Main started at
`2fdaddf09e28dec7919c317469a602b23c6447c8`, 34 ahead / 0 behind the local
origin/main reference. No fetch or push was performed. Initial fsck succeeded
with three dangling objects, not corrupt objects.

The completed pre-implementation [capability map](backend-capability-map.md)
is the audit source. B22 and B23 acceptance are present; a completed B24 design
specification was not found. This task's brief supplies the experience
requirements. This does not certify B24 visual-design acceptance.

Fresh baseline: API 626, mobile 443, Canvas 73, OCR 27, shared 32, engine 606.
The first shell invocation of npm was blocked by PowerShell execution policy;
`npm.cmd` ran the baseline successfully. No policy change was required.

## Architecture before and after

Before: mobile composed Canvas source descriptors/structure/previews, durable
jobs, result payloads and saved Reviewers. Planner and task APIs were separate.
B22/B23 automatically persisted Canvas Reviewers from the mobile recovery flow.

After: `packages/shared/src/experience.ts` defines student DTOs, exported as
types from the shared package. `apps/api/src/lib/experience/` contains pure
mapping, application services, owner-scoped read access, safe HTTP errors and a
generation admission adapter. New authenticated routes return
`{ ok: true, data }` or `{ ok: false, error }` and private/no-store responses.
The established domains remain in their original locations.

Read access uses the existing bearer verifier and authenticated Supabase client,
plus explicit user predicates and defensive owner filtering. Existing Canvas
source and planner mutation primitives keep their current server-only client
and owner-scoped authorization. No table, migration, RLS policy, provider,
runtime AI model, engine validation threshold or scheduling algorithm changed.

## Routes

All new data routes require a verified Supabase Bearer JWT. OPTIONS is public
and contains no student data. Prefix `E` below means `/api/experience`.

| Route | Change | Purpose |
|---|---|---|
| GET /api/today | New | One composed day response |
| GET E/capabilities | New | Central implementation capability state |
| GET E/courses | New | Stored student course summaries |
| GET E/courses/:courseId | New | Course learning workspace |
| GET E/courses/:courseId/materials | New | Safe material descriptors, offset pagination |
| POST E/materials/prepare | New adapter | Existing file preparation, normalized materials |
| POST E/generations | New adapter | Single-material Reviewer admission |
| GET E/generations/:generationId | New | Product lifecycle and resolved artifact identity |
| GET E/activities | New | Deterministically prioritized assignments and personal tasks |
| GET E/activities/:activityId | New | Instructions, resources, materials, output/capability state |
| GET E/library | New | Normalized persisted artifacts and category capability state |
| GET E/library/:artifactId | New | Persisted Reviewer reader, never regeneration |
| POST E/planner/preview | New adapter | Existing deterministic preview service |
| POST E/planner/apply | New adapter | Existing apply service |
| POST E/planner/replan | New adapter | Same apply primitive, explicit product intent |
| /api/study-plan/preview, /api/study-plan/apply | Reused unchanged | Existing compatibility routes |
| /api/study-sessions, /api/study-sessions/:sessionId | Reused unchanged | Schedule read, status, reschedule, delete |
| /api/tasks, /api/tasks/:taskId, /api/tasks/import/canvas | Reused unchanged | Personal task CRUD, explicit Canvas import |
| /api/canvas/courses/:courseId/sources/* | Reused domain services | Preparation, structure, default selective preview, source gates |
| /api/jobs and /api/jobs/:jobId/{result,cancel,retry} | Reused unchanged | Existing durable workflows and compatibility clients |
| /api/reviewers and /api/reviewers/:id | Reused unchanged | Existing saves, rename/delete and compatibility reader |

Course IDs are stored course UUIDs, not Canvas external IDs. Activity IDs are
opaque `canvas:<assignment-row-uuid>` or `task:<task-uuid>` values. Library IDs
are opaque `reviewer:`, `artifact:` or legacy `generation:` references. Clients
must round-trip them, including URL encoding, instead of parsing their storage
meaning. `generation:<job-uuid>` is also a durable open alias.

## Shared contracts

FeatureCapability, ExperienceCapabilities, GenerationCapability,
CourseReference, CourseSummary, LearningMaterial, CourseMaterials,
CourseLearningWorkspace, ActivitySummary, ActivityResource, ActivityDetail,
TodayItem, TodayOverview, LibraryArtifactType, LibraryArtifactSummary,
LibraryOverview, GenerationState, GenerationView, ReviewerReaderModel,
ExperienceError, ExperienceResponse, QuizSummary and ActivityOutputDraft.
Existing task priority/status types are reused. Fixture exports live separately
in `experience.fixtures.ts`; production routes never load fixtures.

## Today mapping

`date=YYYY-MM-DD` and `utcOffsetMinutes=-720..840` define the requested day.
Offset defaults to UTC (0); Manila clients send 480. Offset is for that day;
the client must supply the correct offset for dates across daylight-saving
changes. Timestamps stay ISO instants. Invalid/overflowed dates are rejected.

The service reads owner-scoped tasks, assignments, submission status, courses,
study sessions and plans. Canvas assignment due dates/titles are authoritative;
imported tasks add the planner identity, priority, local completion and estimate.
Unimported assignments remain visible and are not silently imported on a GET.
Missing submission evidence is `unknown`, not fabricated completion. A linked
submitted/graded-not-missing/excused record suppresses overdue classification.
Orphaned imported tasks remain visible, with no invented course relationship.

Pending items sort by urgency, overdue first, priority high/medium/low, due
instant, then ID. Completed/submitted items sort last. Now means due before the
end of the requested day or high priority; Next means due within the following
seven days; Later is the remainder. These are read-model values, not DB groups.

The timeline includes every session overlapping the day, ordered by start and
ID, including skipped/completed sessions. Current is an active session covering
asOf. Next prefers current, then a future session, then urgent/due-today work.
Later contains remaining future sessions and due-today work. Overdue means an
unfinished deadline before asOf, capped at the requested day's end. Upcoming
deadlines are unfinished items after the day, ordered by deadline. A task and
its session are distinct activities in progress totals; skipped sessions count
in total but not completed or scheduled minutes. Session durations represent
the whole persisted block, including blocks overlapping midnight.

Planner state uses the newest plan overlapping the day. No plan is
`not_planned`; a plan ending before day end or older than an owned task update
is `stale`; otherwise `current`. This is conservative freshness, not a second
planner or an input-fingerprint re-evaluation. `needsTaskImport` identifies
unfinished Canvas activities not yet represented by planner tasks. Import via
the existing endpoint before expecting those activities to be scheduled.

Preview/apply/replan accept the canonical StudyPlanningRequest. Replan calls
applyOwnedStudyPlan; the existing RPC replaces planned sessions in the requested
range while preserving completed/skipped sessions. Existing session PATCH
supports startsAt, endsAt and status, validates interval and ownership, and
does not mark a task complete implicitly. No route was renamed.

## Learn and Reviewer generation

Courses come from stored owned Canvas courses, without calling live Canvas on
each list. Unknown counts are null. Workspace materialCount is the existing
source resolver's totalKnown; it is not a promise that a partial Canvas sync
discovered every remote resource. Materials retain module ordering and title,
source identity, supported kind and readiness. The existing resolver's source
caps and selected-course access gate remain unchanged. Pages, PDF, images and
text follow the established readiness rules. DOCX/PPTX remain unsupported.
Announcements are excluded by the existing normal source listing.

Materials paginate at 100 with nextOffset and totalKnown. No extraction text,
OCR state arrays, fingerprints, probe output or private job provenance are
returned. Page/slide count is null when the descriptor does not know it.

POST materials/prepare and POST generations accept only:

```json
{ "courseId": "<course UUID>", "materialId": "<opaque material ID>" }
```

Generation additionally requires an Idempotency-Key header (8-200 safe
characters under the existing validator). A repeated accepted identity
reconnects before source preparation. It must match owner, course and material.
The adapter checks a concurrent admission's persisted identity as well, because
different materials can have identical text. An intentional new generation
uses a new key. Source preparation is not background-safe until HTTP 202;
durable execution after acceptance retains the existing workflow semantics.

The adapter reuses preparation if necessary, structure/default block selection,
selective preview, preview-session validation, generation freshness gate,
immutable snapshot creation, canonical job creation and dispatch. It does not
add a prompt, alter the Reviewer engine or relax grounding/coverage validation.

| Internal job state/stage | Product state |
|---|---|
| queued | queued |
| running preparing_source/normalizing_source/detecting_outline/planning_sections | preparing |
| running generating_sections/retrying_sections/verifying_coverage | generating |
| running assembling_reviewer/storing_reviewer | finalizing |
| succeeded with published persisted output | completed, with artifactId |
| failed/expired | failed, safe error |
| cancellation_requested | cancelling |
| cancelled | cancelled |

Only real valid unit counts are exposed; no synthetic percentage or internal
status message. Deleted/unavailable completed artifacts are safely not-found,
never regenerated. The durable result is persisted before completion and is
immediately included in Library. No explicit Save step is required. The B22/B23
mobile save path remains compatible and its existing snapshot idempotency is
unchanged; the experience Library deduplicates the saved Reviewer and durable
artifact. Existing artifact and generation aliases continue opening the saved
Reviewer after automatic save.

## Tasks / Activity Maker

Activities include stored Canvas assignments and supported personal tasks.
ActivityDetail projects plain instructions, safe HTTPS links found in assignment
instructions, course materials when available, capability and existing output
lists. It does not expose raw Canvas objects. Unsafe/token-bearing/credential
URLs are omitted. Only material links present in the synced instructions can
be associated; course materials are context, not a claim that every material
is an assignment attachment. Relative links cannot be resolved without a trusted
base URL and are currently omitted. Deselected-course materials can be null.

`hasGeneratedDraft=false` and outputs=[] accurately describe current persistence.
ActivityOutputDraft is the minimal future draft/saved lifecycle and storage
boundary; there is no write endpoint, draft table or generator behind it yet.

## Library and Reviewer reader

Library type filter is all/reviewer/quiz/activity_output; optional courseId,
offset and limit (1-100, default 50). Each response includes all category
capabilities. Missing categories return empty items, never demonstration data.

Sources: existing saved reviewers, plus succeeded Reviewer jobs whose persisted
result and active/latest generated artifact version are owned and available.
Legacy succeeded results without a version remain readable. Cancelled, failed,
unfinished, foreign, deleted or superseded version results are excluded.
Snapshot IDs connect course/source metadata and suppress duplicate saved output.
No raw job table becomes a public contract. Open projects only persisted
student text: section/item titles, explanations, key points and typed evidence
(code, tables, formulas, examples, results/source text). Ordering/text are
preserved. No sourceCore object, Stage 0-6 IDs, grounding reports, prompts,
provider configuration or raw metadata is serialized.

Saved Reviewers reuse existing source-status freshness. Durable-only artifacts
currently return unknown freshness. LastOpenedAt remains null because it is not
persisted. RelatedArtifactIds and activityId remain empty/null until the Quiz
and Activity Maker implementations establish real relationships. QuizSummary
reserves reviewerId/sourceId; ActivityOutputDraft reserves activityId.

## Capabilities and errors

Implementation capabilities: Reviewer and planner available; Quiz generation,
Activity Maker and calendar unavailable/not_implemented. Material generation
capability adds source_not_ready or unsupported_material. This does not claim a
live provider/Canvas health probe; transient service failures return the safe
retryable unavailable error. The status vocabulary also reserves
temporarily_unavailable for runtime capability probes when implemented.

Error fields: code, title, message, retryable, action. Codes are sign_in_required,
not_found, invalid_request, not_ready, unavailable, generation_failed,
rate_limited and conflict. Raw provider/DB/OCR messages are not copied. Logging
retains operation/table and safe error class/code; domain observability remains.
Existing compatibility routes keep their existing safe domain error contracts.

## Limits, missing capabilities and deferred work

- **Quiz generation: missing.** No prompt/engine was introduced.
- **Quiz questions/attempts/results: missing.** Generic artifact type enums
  and Canvas quiz references are not working quiz persistence/results.
- **Activity Maker generation: missing.** No substitute prompt system added.
- **Activity Maker persistence: missing.** Typed draft boundary only.
- **Calendar/classes: missing.** No invented events or second scheduler.
- No persisted last-opened timestamp; no working quiz/reviewer or draft/activity
  relationship records yet. Existing future relationship fields remain honest.
- Material preparation before 202 still uses existing synchronous source
  preparation limits. DOCX/PPTX support is still a separate ingestion task.
- Reads complete local pagination in 200-row pages with a 10,000-row per-table
  safety bound; exceeding it yields an explicit unavailable error. The initial
  composition adapter reads owner collections, including persisted payloads,
  rather than introducing SQL views. Metadata-only Library pagination and
  targeted detail queries are the next scale optimization before large pilots.
- No completed B24 spec was found; reconcile the actual visual specification
  before B25. Hosted deployment, live RLS exercises and new physical APK
  acceptance are not performed by these deterministic checks.

Smallest follow-up: B24.6, implement one approved Activity Maker generation path
and owner-scoped editable draft persistence using these boundaries, then a
separate Quiz generation/questions/attempt/results slice. B25 can build the
shell and existing supported flows with missing capabilities explicitly disabled.

## Verification and git

See [verification](verification.md) for fresh results, failures/retries and exact
preservation evidence. No push, migration application, deployment or UI redesign.
