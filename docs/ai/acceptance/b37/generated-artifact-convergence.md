# B37 generated artifact model convergence

Date: 2026-09-23

Verdict: **PARTIAL — canonical migration implemented with unresolved runtime dependencies.**

The unresolved dependency is operational rather than a remaining code path: production still runs the pre-B37 schema/API because the forward migration and deployment could not be applied safely from this workspace. The repository implementation and local Postgres verification converge all current Reviewer-dependent runtime paths on canonical generated artifacts.

## Starting state and root cause

The branch started clean at `64d7d22` on `b25-3-3-ai-first` with author `galaxymaxp <omgraythekid@gmail.com>`. B36 had observed 48 `generated_artifacts` rows and zero legacy `reviewers` rows. Reviewer creation/reading used the generated-artifact model, while Quiz availability, Quiz source resolution, the Quiz job RPC, and saved-Reviewer management still depended on the empty legacy table. Queue navigation also accepted billable generation from a mount effect.

No title-based mapping was introduced. All canonical relationships use owner-scoped UUIDs.

## Canonical Reviewer definition

A current Reviewer is a `generated_artifacts` row where:

- `artifact_type = 'reviewer'`;
- `user_id` is the authenticated owner;
- `deleted_at is null`;
- `latest_version_id` resolves to an owner-matching `generated_artifact_versions` row for the same artifact with `artifact_type = 'reviewer'`;
- that version's `source_version_id` resolves to an owner-matching `source_versions` row;
- the version payload contains the persisted Reviewer object.

For Canvas-derived Quiz eligibility, source-version metadata must additionally carry a valid `reviewerSourceSnapshotId` resolving to an unedited, owner/course-matching `reviewer_source_snapshots` row.

## Schema and RPC migration

Forward migration: `packages/db/migrations/20260923000000_canonical_reviewer_artifacts.sql`.

It adds nullable `quizzes.reviewer_artifact_id`, an owner-safe composite FK to `generated_artifacts(id, user_id)` with `ON DELETE RESTRICT`, an unambiguous old/new Reviewer identity check, a partial Quiz FK index, and an active Reviewer/source index. Existing `quizzes.reviewer_id` rows remain readable and are not fabricated or title-mapped.

`create_quiz_processing_job` keeps its durable signature shape but renames the semantic argument to `p_reviewer_artifact_id`. It validates course ownership, active Reviewer type/ownership, current version/payload, exact source snapshot/course, unedited source, request identity, quota, fingerprint, and idempotency before inserting a job. `complete_quiz_processing_job` persists `reviewer_artifact_id` and validates it against frozen job metadata.

`rename_reviewer_artifact` and `delete_reviewer_artifact` are fixed-search-path, authenticated, owner-scoped `SECURITY DEFINER` RPCs. Delete is a soft delete. It refuses deletion with `reviewer_has_quizzes` when a canonical dependent Quiz exists; neither Quiz history nor artifact versions cascade away. Existing RLS remains enabled. Quiz job creation stays service-role-only; rename/delete are granted only to `authenticated`; no grant was broadened.

The legacy table is deliberately not dropped. Historical Quiz rows still carry its FK, and production counts/dependencies were not safely re-audited in this run.

## Quiz migration

The Generate experience now derives material-to-Reviewer availability from active canonical artifacts, their current versions, source-version metadata, exact source snapshots, and snapshot items. The DTO carries `reviewerArtifactId`; no ambiguous legacy-ID meaning remains.

Quiz submission sends the canonical artifact ID through shared types, mobile, API, job metadata, checkpoints, completion payload, and persistence. The Library relationship is `artifact:<generated_artifacts.id>`.

`quiz/sources.ts` loads the active owner-scoped artifact, exact current version, source version, snapshot, and snapshot items. Quiz regions are assembled directly from the persisted Reviewer section/item payload (`sourceCore` explanation, key points, and bounded evidence). It does not reconstruct the Reviewer from Canvas material, and it does not query `reviewers`.

## Reviewer management and deletion

`GET /api/reviewers` lists canonical active Reviewers only. `GET /api/reviewers/[id]` returns the current persisted version. Rename and delete call the canonical RPCs. The older POST save handshake remains only as compatibility for an already-persisted generated result: it locates exactly one current canonical payload by generated Reviewer output ID, never by title, then returns the canonical artifact identity.

After server delete succeeds, mobile removes `artifact:<id>` from the owner-scoped B35 SQLite store and updates visible state. On a dependency denial or any server error, no local removal occurs. A deleted server artifact is absent during later reconciliation, so it does not resurrect after relaunch.

## Queue confirmation safety

`GenerationScreen` now reads a saved intent on mount without calling `acceptGeneration`. An explicit **Confirm generation** action performs acceptance. A synchronous in-flight ref blocks repeated taps; a persisted `generationId` reopens without acceptance. Tests prove zero mount calls, one explicit acceptance, repeated-tap collapse, and no acceptance when reopening an accepted intent.

## Verification

| Gate | Fresh result |
|---|---|
| Focused mobile B37 | 44/44 passed after the repeated-tap case was added |
| Focused API B37 | 108/108 passed |
| Quiz Postgres/migration focus | 54 passed, 2 opt-in live tests skipped |
| Typecheck | 7/7 workspaces passed, forced |
| Lint | 7/7 passed outside sandbox; 0 errors, 4 unrelated pre-existing warnings |
| Mobile | 43 files, 508/508 passed |
| API | 89 files, 886 passed, 3 opt-in live tests skipped |
| Canvas | 1 file, 73/73 passed |
| Shared | 6 files, 44/44 passed |
| DB/API production build | passed; 22 workflow steps, 2 workflows, 28 static pages |
| Mobile export | passed for Android, iOS, and web |
| `npm ci --dry-run` | passed; lockfile unchanged |
| `git diff --check` | passed; line-ending notices only |

The initial in-sandbox lint/build attempts failed because Windows module resolution was denied above the writable workspace. The same commands passed unchanged with the required filesystem access. An earlier focused API attempt failed only because the two old route-test fakes still modeled CRUD against `reviewers`; those fixtures were replaced with canonical artifact/RPC fixtures, then the focused and full suites passed.

## Production safety and unresolved acceptance

The linked Vercel target was verified read-only as `galaxymaxps-projects/stay-focused-v2-prototype`, project `prj_aBKHItGY99yCoFwNet9YU23d3IIg`, root `apps/api`. No deployment occurred.

Production migration was not attempted. The repository has no Supabase CLI project/config, the Supabase CLI is unavailable locally, no database environment file is present for the API, and project documentation records an unresolved remote migration-history alias mismatch. Pulling the entire production environment was automatically rejected as an unacceptable secret-exposure risk. No authenticated Supabase browser surface was available. Therefore local/remote migration status before/after, current row counts, constraint/grant inspection, and a non-destructive production data mapping audit could not be completed safely.

The last safe counts remain B36's observations: 48 generated artifacts and 0 legacy Reviewer rows. Current generated-Reviewer count, Quiz count, legacy-linked Quiz count, and mapping issues are **not reverified**. No student content or secrets were printed.

Because the migration was not applied, the API was not deployed and no production smoke was claimed. Existing canonical Reviewer discovery, real Quiz submission/completion, Library/local persistence, populated Reviewer management, controlled deletion, and physical accidental-spend acceptance remain required after migration. No academically valuable artifact was deleted and no quota was spent.

## Legacy retirement decision

Current source has no `.from("reviewers")` call and the B37 migration contains no `public.reviewers` lookup. Remaining occurrences are historical migrations, generated schema types for the still-present table/column, compatibility fields for historical Quiz rows, and documentation/tests describing history. The table must remain in this phase because the old Quiz FK and unknown current production relationships have not been audited after B36. A later explicit migration may retire it only after production dependency proof.

## B38 handoff

B38 is **Generation Quality Acceptance**. It must investigate `request_exceeds_context_budget`, especially on large PPTX extracted source context, and test representative PDF, scanned PDF, DOCX, PPTX, Canvas Page, Reviewer, Quiz, and Activity Output sources. B37 does not change context-budget or generation-quality behavior.
