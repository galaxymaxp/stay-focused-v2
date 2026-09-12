# B24.5 backend capability map (completed before implementation)

Inspected 2026-09-12: main at 2fdaddf, 34 ahead / 0 behind local origin/main.
Git fsck succeeds with three dangling objects. Existing dirty persistence work,
Workflow fixtures, package.json and status documents must be preserved.

Evidence: ../b22/mobile-canvas-study-workflow.md,
../b23/mobile-recovery-foundation.md, ../pre-ui/pre-ui-persistence-readiness.md.
No completed B24 specification/acceptance document found; use task brief as
four-surface requirements. design/ assets are not backend implementation evidence.

| Surface | Capability | State | Evidence / gap |
|---|---|---|---|
| Today | Tasks, deadlines, priority, estimates, completion | EXISTS | shared/task-planning.ts, tasks routes, task-planning-repository.ts |
| Today | Canvas assignments and task provenance | EXISTS | canvas_assignments; tasks/import/canvas; owner-scoped import RPC |
| Today | study_plans, study_sessions, schedule reads, completed/skipped | EXISTS | task-planning repository and study-sessions routes |
| Today | Preview/apply/replan/reschedule | EXISTS | study-plan/preview and apply replace planned sessions in range, preserve terminal states |
| Today | Unified day, overdue, next, planner freshness | MISSING | Compose existing records; no new algorithm |
| Today | Calendar/class events | MISSING | Availability windows only; no stored event feed |
| Learn | Courses/modules/files/pages/assignments | EXISTS | canvas-course-selection, canvas-reviewer-sources, packages/canvas |
| Learn | Usable-content resolver, PDF/OCR, source preparation | EXISTS | canvas-usable-content-service, sources/prepare and resolve, OCR |
| Learn | DOCX/PPTX ingestion | MISSING | Existing descriptors deliberately mark unsupported |
| Learn | Student workspace/material DTO | PARTIAL | Readiness and module placement exist; diagnostics need projection |
| Reviewer | Grounded engine, durable jobs, saved output | EXISTS | engine validators; processing_job_results; reviewers; generated_artifact_versions |
| Reviewer | Product lifecycle, direct Library resolution | PARTIAL | Internal stages need mapping; B22 mobile auto-saves snapshot-bound results |
| Tasks | Assignment instructions/resources | EXISTS | description_html and source resolver/resource descriptors |
| Tasks | Normalized Activity list/detail/urgency | MISSING | Assignments and imported planner tasks currently separate |
| Activity Maker | Generator | MISSING | No task-output generation route or engine |
| Activity Maker | Editable draft persistence | MISSING | No activity-output/task_outputs persistence domain |
| Quiz | Generation | MISSING | No quiz engine/route; Canvas quiz_id is an external assignment reference |
| Quiz | Questions/attempts/results | MISSING | Artifact enum supports quiz but is not a functioning quiz domain |
| Library | Reviewer list/open/rename/delete | EXISTS | reviewers routes and persisted reviewer_output/source snapshots |
| Library | Durable output persisted before success | EXISTS | processing_job_results and generated_artifact_versions |
| Library | Unified types/relationships | PARTIAL | Need safe projection and deduplication across existing persistence |
| Library | Last-opened persistence | MISSING | Return null; no speculative migration |
| Security | JWT, owner filters, RLS | EXISTS | auth.ts, reviewer-db.ts, owner predicates, db migrations |
| Cross-cutting | Central capabilities/student errors | MISSING | Current errors are domain-specific |
| Scope | New engines/planner/UI/schema duplication | NOT REQUIRED | Explicit exclusions |

Decision: additive shared DTOs and API experience services/routes; no schema
change. Missing categories stay empty with explicit reasons. Reuse deterministic
planner, source preparation, generation admission and persisted output.
