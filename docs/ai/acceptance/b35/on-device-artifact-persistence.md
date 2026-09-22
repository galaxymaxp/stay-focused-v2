# B35 on-device artifact persistence and local-first Library

Date: 2026-09-22 (Asia/Manila)

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `51d4996 docs(ai): record B34 partial physical UX acceptance`
- Dirty files before B35: none
- Existing persistence dependencies: `expo-secure-store` only. No SQLite, AsyncStorage, MMKV, or filesystem store.

## 2. Previous architecture

### Cloud path (unchanged by B35)

| Artifact | Completion | Tables | Library id |
|---|---|---|---|
| Reviewer | durable `reviewer_generation` job → `processing_job_results` (+ `generated_artifacts`/`generated_artifact_versions`); saved Reviewers in `reviewers` | `reviewers`, `processing_jobs`, `processing_job_results`, `generated_artifacts`, `generated_artifact_versions`, `reviewer_source_snapshots` | `reviewer:<reviewers.id>`, `artifact:<generated_artifacts.id>`, or `generation:<job id>` with server-side aliasing |
| Quiz | durable `quiz_generation` job → `quizzes` row (`reviewer_id`, `course_id`, learner-projected questions) | `quizzes`, `quiz_attempts` | `quiz:<quizzes.id>` |
| Activity output | durable `activity_generation` job → `activity_drafts` row (revisioned, editable) | `activity_drafts` | `activity:<activity_drafts.id>` |

Every row is `user_id`-owned under RLS; `ExperienceService` additionally filters by owner. `GET /api/experience/generations/:id` sets `artifactId` only once the server has located the persisted artifact (a succeeded Reviewer job with no persisted artifact returns 404).

### Mobile read path before B35

- Library: `useExperience("/api/experience/library?limit=50")` on every focus; blank skeleton until the cloud answered; error surface when offline.
- Reader / Quiz summary / Activity draft: `ArtifactScreen` fetched `/api/experience/library/:id` every open; nothing rendered offline.
- Quiz practice: `/api/experience/quizzes/:id` plus server-scored attempts.
- Legacy: `completedArtifactCache.ts` stored bodies in chunked **SecureStore** under a 90 KB total cap with LRU eviction, used only by the older Processing/Canvas-reviewer screens. It is not part of the Library and is left unchanged (see limitations).

## 3. Storage technology decision

| Option | Assessment |
|---|---|
| Expo SecureStore (existing) | Rejected for bodies: keychain/keystore storage for small secrets; the existing cache already had to chunk at 1,800 characters and cap at ~90 KB, which evicts real Reviewers. |
| AsyncStorage | Not installed; unstructured key/value, whole-blob rewrites, no transactions or owner-scoped queries. |
| MMKV | Not installed; fast key/value but same modelling limits, and another native module. |
| expo-file-system JSON files | Not installed; manual indexing, no atomic multi-row reconciliation. |
| **expo-sqlite** | **Selected.** |

- Why: structured, owner-scoped, transactional, queryable (metadata-only list reads), versionable with `PRAGMA user_version`, first-party for Expo SDK 54 on Android and iOS, included in Expo Go.
- New dependency: `expo-sqlite ~16.0.10` (installed with `npx expo install`; config plugin added to `app.json`). Lockfile adds only `expo-sqlite` and its `await-lock` dependency; `npm ci --dry-run` passes.
- Migration implication: native module, so **a new native build is required**. It is loaded lazily; a binary without it (for example reached by an over-the-air update on runtime `2.0.0`) falls back to cloud-only Library instead of crashing.
- Web: `localArtifactDatabase.web.ts` returns no store; the web development preview reads from the cloud. Export confirms `ExpoSQLite` is in the Android/iOS bundles and absent from web.
- Size: one row per artifact; list queries read only `summary_json` (≈1 KB); full bodies (Reviewer JSON typically tens of KB) load only when an artifact opens. SQLite on-disk storage has no practical per-row limit at this scale.

## 4. Local schema

Database `stay-focused-library.db`, WAL mode, schema version 1.

`library_artifacts` (primary key `owner_user_id, artifact_id`):

| Field | Purpose |
|---|---|
| `owner_user_id` | Authenticated Supabase user id; every statement filters by it |
| `artifact_id` | Server canonical Library id (`reviewer:…`, `quiz:…`, `activity:…`); identity, never the title |
| `artifact_type` | `reviewer` / `quiz` / `activity_output` (CHECK-constrained) |
| `title` | Display only |
| `course_id`, `source_id`, `activity_id` | Course/material/assignment relationships |
| `cloud_created_at`, `cloud_updated_at` | Cloud timestamps used for reconciliation ordering |
| `summary_json` | Complete `LibraryArtifactSummary` (includes `relatedArtifactIds` and `quiz` summary) |
| `payload_json` | Complete typed `LibraryArtifactDetail` (Reviewer reader model, learner Quiz, or Activity draft); nullable until hydrated |
| `payload_schema` | Body shape version; a mismatch is treated as missing and re-fetched |
| `payload_cloud_updated_at` | Cloud version of the stored body; older than `cloud_updated_at` ⇒ body refresh needed |
| `local_updated_at` | Last local write |

`library_artifact_aliases` (`owner_user_id, alias_id → artifact_id`) records server-confirmed identity changes such as `generation:<job>` → `reviewer:<id>`.

Versioning: forward-only migration list applied in exclusive transactions; `user_version` tracks progress. A database from a newer build is reset and repopulated from the cloud (the cloud is authoritative).

## 5. Owner isolation and logout policy

- Isolation: composite primary key and `WHERE owner_user_id = ?` on every read/write/delete; empty owner ids are rejected. The same server id under two owners is two rows. The authenticated stack is already keyed by `session.user.id`, so in-memory Library state is also discarded on account change.
- Logout policy: **A — explicit sign-out deletes that owner's local artifacts** (`purgeLocalLibraryForOwner`, alongside the existing per-owner Queue/recovery clearing). Session expiry without sign-out keeps rows, still owner-isolated. Rationale: shared student devices; the cloud copy makes re-download cheap.

## 6. Write path

```
durable generation → server persists artifact → GenerationView{state: completed, artifactId}
  → GET /api/experience/library/:artifactId (authoritative persisted copy)
  → exclusive-transaction upsert into SQLite
```

- Trigger: `GenerationScreen` once per persisted `artifactId` (`persistedArtifactId` returns null for every non-`completed` state and for `completed` without a server artifact id).
- Also written: every online artifact open (`ArtifactScreen`), every Library reconciliation (summaries plus up to 20 bodies per refresh), and a saved Activity draft revision returned by the PATCH.
- Nothing is written locally before the cloud copy exists; a failed detail fetch stores nothing.
- Duplicates: idempotent upsert keyed on `(owner, artifact_id)`; identical content is a no-op.

## 7. Local-first read path

```
Library focus → read SQLite summaries → render pages immediately
  → reconcile with cloud in background (refreshing caption, no blanking)
  → re-read SQLite after list reconciliation → hydrate missing/outdated bodies
```

- With saved work: cards render immediately; `Checking for updates…` shows during reconciliation; a failed refresh shows a quiet device-copy notice instead of the error surface.
- Without saved work: B34 structural skeleton, then the normal empty or error surface.
- B34 layout retained: All / Reviewers / Quizzes / Activity Outputs, native horizontal paging, interpolated indicator, per-page vertical scrolling, card anatomy. "More saved work" now reveals further local items in 50-item steps.
- Artifact open: device copy renders first; the cloud copy is fetched in the background and stored.

## 8. Reconciliation policy

| Scenario | Behavior |
|---|---|
| Remote new | Insert summary; body hydrated in the same refresh (bounded) |
| Remote newer | Update summary; body marked behind and re-fetched |
| Same timestamp and content | No-op |
| Same timestamp, changed content (for example Quiz best score) | Update to the cloud copy |
| Remote older than local | Ignored |
| Remote request fails | All local rows retained; Library shows device copy |
| Remote list omits an artifact | Retained (list absence is not a deletion signal) |
| Owner-authenticated `not_found` for that exact artifact | Local copy removed |
| Server resolves an id to a different canonical id | Alias recorded; superseded local row replaced |
| Duplicate responses | Single row |

Deletion: the backend has explicit deletes (`DELETE /api/reviewers/:id`, `DELETE /api/experience/activity-drafts/:id`) but no list tombstones. The legacy "Manage saved Reviewers" delete now also removes the local `reviewer:<id>`; any other server-side deletion is applied the next time that artifact is opened online (explicit `not_found`).

## 9. Offline behavior

- Reviewer: full reader from the device.
- Quiz: summary opens from the device; the Quiz screen shows saved learner questions read-only with a notice. Practice, answer checking, scoring, and results remain server-only. No answer keys are stored (the DTO is the learner projection).
- Activity output: draft opens from the device; saving edits requires a connection.
- Library: all saved items, with a device-copy notice.
- Network-only: generation, Queue, Library refresh, draft save, quiz attempts/scoring, Generate course browsing.

## 10. Queue integration

- Processing (`queued`/`preparing`/`generating`/`finalizing`): not stored.
- Failed / cancelling / cancelled: not stored.
- Completed with server `artifactId`: stored once, idempotently.
- Relaunch: Library reads SQLite before any network call; durable jobs, Queue, intents, and polling are unchanged and not moved into SQLite.

## 11. Quiz relationship

- The Quiz body keeps `reviewerId`; the summary keeps `relatedArtifactIds: ["reviewer:<id>"]`.
- Generate still gates Quiz from the owner-scoped server material DTO (`LearningMaterial.reviewerId`). Generation is network-only, so the local store is not used for that gate.
- Title inference used: **NO**.

## 12. Test evidence

| Area | Test | Result |
|---|---|---|
| Reviewer / Quiz / Activity insert | `artifactStore.test.ts` stores each completed type with its full body | PASS |
| Restart durability | close and reopen the same SQLite file | PASS |
| Duplicate upsert | twice-received detail and summaries → one row | PASS |
| Newer remote | updates existing row and body | PASS |
| Older/equal remote | ignored / no-op; newer local kept | PASS |
| Offline read | reconciled artifacts read with the remote failing; hook opens device copy offline | PASS |
| Local-first Library | hook renders SQLite items before the pending cloud page resolves | PASS |
| Remote failure | list failure and non-`not_found` detail failures keep rows | PASS |
| Owner isolation | owner B sees nothing of owner A; same id under both owners stays separate | PASS |
| Logout / account switch | purge removes only the signed-out owner; hook under owner B shows none of A | PASS |
| Incomplete Queue job | seven non-completed states plus completed-without-artifact → nothing stored | PASS |
| Completed job | Reviewer / Quiz / Activity stored once; second call `unchanged` | PASS |
| Quiz relationship | `reviewerId` and `relatedArtifactIds` preserved despite equal titles | PASS |
| Schema version | initialization, idempotent reopen, newer-build reset, unknown payload schema | PASS |
| Library UI | local items during refresh, device-copy notice, skeleton only with no local data, B34 error surface | PASS |

Tests run the production SQL on Node's built-in SQLite through a test-only adapter. Mutation checks were run and reverted: removing the older-copy guard failed 1 test; removing the owner filter from summary listing failed 3 tests.

## 13. Automated verification

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck -- --force` | PASS, FRESH | 7/7, 0 cached |
| `npm run lint -- --force` | PASS, FRESH | 7/7, 0 cached; 4 pre-existing mobile import-order warnings, none added |
| `npm test --workspace @stay-focused/mobile` | PASS, FRESH | 505/505 in 42 files |
| `npm test --workspace @stay-focused/api` | PASS, FRESH | 895 passed, 3 opt-in skipped |
| `npm test --workspace @stay-focused/canvas` | PASS, FRESH | 73/73 |
| `npm test --workspace @stay-focused/shared` | PASS, FRESH | 44/44 |
| `npm run build --workspace @stay-focused/mobile` | PASS, FRESH | Android/iOS/web export; `ExpoSQLite` native-only |
| `npm run build --workspace @stay-focused/db --workspace @stay-focused/api` | PASS, FRESH | production build |
| `npm ci --dry-run --ignore-scripts` | PASS | lockfile consistent |
| `npx expo install --check` | PRE-EXISTING drift | `expo`, `expo-constants`, `expo-updates` patch versions behind; `expo-sqlite` matches |
| `git diff --check` | PASS | |

The first forced typecheck failed on a B35-introduced test type assertion and the first lint added one import-order warning in a new test; both were fixed before the results above.

## 14. Device validation

NOT RUN. No ADB device was attached, and the installed signed APK does not contain the new native module. Signed physical and offline acceptance is B36.

## 15. Known limitations

- A new native build is required. Until then, installed 2.0.0 binaries keep cloud-only Library behavior.
- Server deletions made elsewhere are applied only when that artifact is next opened online; there are no list tombstones.
- Up to 20 bodies are hydrated per refresh; a very large first sync may need several Library visits before every body is offline-ready. The summary list is complete immediately (up to 1,000 artifacts).
- Reviewer `freshness` and Quiz attempt statistics are as of the last online open or refresh.
- Timestamp ordering assumes the API's consistent ISO serialization.
- Web preview has no local persistence.
- The legacy SecureStore `completedArtifactCache` used by the older Processing/Canvas-reviewer screens remains; it is owner-filtered but not migrated or purged on sign-out.

## 16. Verdict

PASS — B35 on-device artifact persistence accepted

Next: B36 Signed Physical UX + Offline Acceptance.
