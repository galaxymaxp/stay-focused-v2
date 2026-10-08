# B38.0 — Generate Course State, Ordering, and Material Loading Repair

Date: 2026-09-24
Branch: `b25-3-3-ai-first`
Verdict: **PASS — B38.0 Generate course state and material loading physically accepted**

## 1. Starting state

| Item | Value |
|---|---|
| Starting HEAD | `5cea9935e9c5a040d201b8b4695c863a27acf32e` (B37 closure) |
| Ahead / behind `origin/main` | 50 ahead / 0 behind |
| Dirty files | none |
| Production | `dpl_2QUkcVoZADvJ3JfzegXSDXEjzrcp` READY at `https://stay-focused-v2-prototype.vercel.app`; `/api/health` → `{"status":"ok","version":"2.0.0"}` |
| Device | realme RMX3151, Android 13 / SDK 33, ADB-authorized; signed preview app `com.galaxymaxp.stayfocusedv2` 2.0.0 (B37 build `f0d6d63e`, preview update channel) |

## 2. Bug reproduction (before repair)

- Generate showed about 79 courses in one alphabetical list. Every card read "Synced Aug 29", including school service shells and courses from 2022.
- Tapping `HIST 100 | CITCS 1J-1 | READINGS IN THE PHILIPPINE HISTORY` (internal course id `c79295e0…`) showed "Materials could not be loaded / The server could not load this content. Try again when your connection is stable." Evidence: `device/01-before-generate-flat-list.png` and `device/02-before-hist100-materials-error.png`.
- Production log, 2026-09-23T22:14:15Z: `GET /api/experience/courses/c79295e0… → 503 experience.request.failed { code: 'unavailable' }`.
- The Sync page listed six **Selected courses**: CC17, CIT6, CC13 (CITCS 1J), CC16, CIT5, and FL 100. HIST 100 was not selected, so its real state was **UNSYNCED**. It was not a Wi-Fi problem.

## 3. Course-state architecture (traced)

```
Canvas listCourseInventory (live, enrollments/term/concluded)
  → canvas_courses (upsert; last_synced_at = inventory upsert time)
  → canvas_course_sync_preferences.selected          (what the student chose to sync)
  → canvas_sync_runs (sync_mode=course, scope_course_id) + canvas_course_sync_states
  → loadCanvasCourseInventory → CanvasCourseInventoryItem {classification, selected, lastSync}
       used by GET /api/canvas/courses (Sync page)
GET /api/experience/courses/:id → ExperienceService.getCourseMaterials
  → listCanvasReviewerSources → loadStoredSelectedCanvasCourse
       (400 canvas_course_not_selected unless preference.selected)
  → loadCourseSourceDescriptors → isCanvasGenerateCandidate
mobile GenerateScreen → useExperience('/api/experience/courses') → CourseCard → workspace
```

Before the repair, `GET /api/experience/courses` returned every `canvas_courses` row sorted by name. Its only date was `last_synced_at`, which is the time of the inventory upsert, not a course sync. There was no selection, sync-run, or classification data.

## 4. Root cause

| Area | Cause | Layer |
|---|---|---|
| Course list | The Generate list read raw discovered `canvas_courses` rows, sorted by name, with no current/previous classification. | `COURSE_SYNC_STATE` (API list query) |
| Sync-state presentation | The card called `last_synced_at` "Synced", but that is only the inventory-upsert time, so every discovered course looked synced. | `STALE_COURSE_RECORD` / mobile presentation |
| Material loading | The materials gate correctly returns `400 canvas_course_not_selected` for an unselected course, but `getCourseMaterials` mapped every non-404 failure to `503 unavailable`. | `ERROR_STATE_HANDLING` (experience service) |
| Routing | Every card opened the materials workspace whatever its sync state. | `COURSE_SYNC_STATE` (mobile routing) |

Primary classification: **COURSE_SYNC_STATE**, with **ERROR_STATE_HANDLING** as the secondary cause. Material routing, owner scope, RLS, grants, and Canvas ingestion were not at fault.

## 5. Implemented repair (`b3f6973`)

- **One source of truth.** `GET /api/experience/courses` now uses `loadCanvasCourseInventory`, the Sync page's own loader. Selection plus the latest sync attempt decide the sync state. Canvas enrollment, term, and concluded metadata decide current/previous. It returns `GenerateCourseList { items: GenerateCourseSummary[], classificationSource }`.
- **Read-only stored fallback.** With `allowStoredFallback`, used by Generate only, a failed live Canvas listing falls back to the stored course rows. The database still supplies sync state, and `classifyStoredCanvasCourse` sets the period from `workflow_state=completed` or saved dates only. The Sync page stays strict.
- **Truthful error mapping.** A `canvas_course_not_selected` or `canvas_connection_missing` materials gate now returns `409 course_not_synced`. Real storage failures stay `503 unavailable` (retryable). Activity detail tolerates `course_not_synced`, as its comment already intended.
- **Mobile routing.**
  - `generateCourseDestination` sends only `synced` courses to Generate. Unsynced and incomplete courses go to `/canvas-settings?courseId=…`.
  - `CoursesScreen` adds that course to the unsaved selection draft once and explains Save, then Sync selected.
  - A defensive `course_not_synced` workspace state offers "Open Canvas sync".
  - The empty state is titled "No study materials found".
- No migration, no Canvas ingestion change, no hardcoded course IDs or titles, and no RLS or ownership change.

## 6. Sync-state contract

| Course state | Rule | Tap destination | Result |
|---|---|---|---|
| Synced + materials | `selected` and the latest attempt is success/partial with a completion time | Generate | Material list |
| Synced + no eligible materials | Same, with zero eligible sources | Generate | "No study materials found" |
| Not synced | Not selected, or never attempted | Sync (course added to draft) | Save, then Sync selected |
| Sync incomplete | Latest attempt `failed` or `running`, or no completion time | Sync | "Sync again" on the selected course |
| Synced + backend failure | Materials request fails with 5xx or network error | Generate | "Materials could not be loaded" + Try again |

## 7. Course ordering

1. Period: current (`likely_current`) → previous (`past_or_concluded`) → other (`other_or_uncertain`/`unavailable`).
2. Within a period: synced → sync incomplete → not synced, so Generate-ready courses come first.
3. Newest `term.endAt ?? endAt ?? term.startAt ?? startAt` first; undated courses last.
4. Course name (code-prefixed) and then id, so input order never matters.

No semester dates are invented, and titles are never used to decide the period. Service shells such as Career Center appear under Current courses because Canvas reports them as active service-term enrollments. They are shown as "Not synced" and are not excluded by name.

First 10 displayed after repair:

| # | Course | Period | Sync state | Tap destination |
|---|---|---|---|---|
| 1 | CC17 \| CITCS 3F Group A \| MOBILE APPLICATION DESIGN AND DEVELOPMENT | Current | Synced (2026-27-1T) | Generate |
| 2 | CIT6 \| CITCS 3N GROUP A \| CAPSTONE PROJECT 1 | Current | Synced (2026-27-1T) | Generate (empty state) |
| 3 | CC6 \| CITCS 3F Group A \| EMERGING TECHNOLOGIES IN IT | Current | Not synced | Sync |
| 4 | CIT17 \| CITCS 3N GROUP A \| WEB INFORMATION SYSTEM | Current | Not synced | Sync |
| 5 | SOC SCI 103N \| CITCS 3F Group A \| THE CONTEMPORARY WORLD | Current | Not synced | Sync |
| 6 | UC University Student Council | Current | Not synced | Sync |
| 7 | Sports Development Office | Current | Not synced | Sync |
| 8 | UC Peer Facilitators Organization | Current | Not synced | Sync |
| 9 | Registrar | Current | Not synced | Sync |
| 10 | Medical-Dental | Current | Not synced | Sync |

The full list has 79 unique courses and no duplicates: 16 current, 62 previous, and 1 other. Previous courses begin with the four synced ones, CC16 (2025-26-3T), FL 100 (2023-24-2T), CIT5 (2023-24-1T), and CC13 (2022-23-3T), followed by unsynced courses from newest to oldest term.

## 8. HIST 100 result

| Item | Result |
|---|---|
| Actual sync state | Not synced (not in Selected courses; no sync attempt) |
| Material count | Not requested; the course is not synchronized |
| Final tap destination | Sync page, with HIST 100 added to the Selected courses draft ("Not synced yet", "Save selection before syncing.") |
| Final UI result | "HIST 100 … was added to Selected courses. Save, then Sync selected to use it in Generate." |
| Generic error present | No |
| Materials request made | None: production logs after the tap show only Sync page calls, and no `/api/experience/courses/c79295e0…` |

The draft was not saved, so no production selection changed. Evidence: `device/06-hist100-not-synced-card.png` and `device/07-hist100-sync-page-selected-draft.png`.

## 9. Material eligibility verification

| Canvas object | Generate | Tasks | Announcements | Result |
|---|---|---|---|---|
| Instructional PDF | Yes | No | No | CC16 lecture PDFs and CIT5 PDFs listed |
| PPTX/DOCX | Yes | No | No | CC17 and FL 100 PPTX, FL 100 DOCX listed |
| Canvas Page | Yes | No | No | CC16, FL 100, and CC13 Pages listed |
| Instructional image/scanned source | Module images only | No | No | Automated coverage (`excludes ungrouped artwork…`); no module image in the synced courses |
| Announcement | No | No | Yes | None listed; CC17 announcements appear on Today/Announcements |
| Assignment | No | Yes | No | None listed; deadline work is linked to Tasks |
| Course outline/admin content | No | No | No | Automated coverage for syllabus/orientation/Course Information Module |

Materials seen on device across the synced courses: CC17 had 3 in 2 modules, CC16 had 19 in 3 modules, CIT6 had 0, and FL 100, CIT5, and CC13 each had many.

Compared with the API: every materials request returned 200. The client renders server items in order without filtering (`moduleGroups` preserves every item), and no assignments, announcements, or duplicates appeared. I did not capture the authenticated JSON body directly, because that would require extracting the student's JWT, which is prohibited.

Pre-existing eligibility observations, not repaired because they are not regressions and fixing them would need new title-based rules:

- CIT5 lists `CITCS-Schedule-v083123.pdf`.
- CC13 lists the navigation Pages "IT Security Homepage" and "UC Course Homepage".
- An `.xlsx` file is labelled "DOCX · unsupported" by the existing unsupported-file kind mapping.

## 10. Empty and error state verification

| Scenario | Physical result |
|---|---|
| Synced + materials | CC17, CC16, FL 100, CIT5, and CC13 list their materials |
| Synced + no eligible materials | CIT6 shows "No study materials found" with no Sync redirect and no error (`device/10`) |
| Not synced | HIST 100 and every "Not synced" card open the Sync page with no materials request |
| Failed/incomplete sync | No real course is in this state; automated coverage (`generateCourseSyncState`, route and screen tests) |
| Genuine backend/network failure | With Wi-Fi off, CC17 shows "Materials could not be loaded" + Try again; after reconnecting, Try again loads the materials (`device/11`, `device/12`) |

## 11. Production deployment

- Implementation commit: `b3f69730ca17b266d726ee3027f4a08110c949db`
- Vercel production deployment `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ` is READY and aliased to `stay-focused-v2-prototype.vercel.app`. `/api/health` returns 200 `{"status":"ok","version":"2.0.0"}`, and an unauthenticated `/api/experience/courses` returns 401.
- Logs since the deploy show 36 × 200 and 1 × 401 (the unauthenticated check), with no 5xx. Six materials requests were made, one per synced course, and all returned 200.
- The mobile change went out as an EAS update on channel `preview`, runtime 2.0.0, Android. It was exported with dotenv disabled and `EXPO_PUBLIC_API_BASE_URL` set to production, and the bundle was checked for the production URL before publishing. Update group `d288a6ea-7a77-4d2d-b855-61c1eae2329f`. The signed B37 build applied it after two cold launches, so no native rebuild was needed.
- No database migration was needed or applied.

## 12. Physical Android acceptance

| Check | Result |
|---|---|
| Generate home | Loads with no endless spinner or duplicates, and scrolls normally |
| Current/previous ordering | Current courses → Previous courses → Other courses; synced first; newest term first (`device/03`, `device/04`) |
| Synced current course | CC17 opens materials directly (`device/05`) |
| Unsynced routing | HIST 100 opens Sync, and no materials request is made |
| HIST 100 | Correctly Not synced → Sync; the generic error is gone |
| Previous course | CC16 (2025-26-3T) opens 19 materials. A ready PDF shows Generate Reviewer and Generate Quiz, which were not tapped, so nothing was spent (`device/08`, `device/09`) |
| Empty state | CIT6 shows "No study materials found" |
| Retry | Offline error → reconnect → Try again succeeds |

One unexplained observation: during an early attempt, after a burst of rapid scroll swipes, the app showed Today instead of the tapped course. The process did not restart, and the behavior did not reproduce, either on a normal tap or on a deliberate tap during a scroll fling. It is recorded only for completeness.

Evidence is in `docs/ai/acceptance/b38-0/device/` (12 PNGs, downscaled; a third-party chat-head avatar is blurred in 03 and 04).

## 13. Automated verification (FRESH)

| Command | Result |
|---|---|
| `npm run typecheck -- --force` | 7/7 (after one fix to a new test's typing; the first attempt failed on that test only) |
| `npm run lint -- --force` | 7/7, 0 errors, 4 pre-existing mobile `import/first` warnings |
| `npm test --workspace @stay-focused/mobile` | 43 files, 513/513 |
| `npm test --workspace @stay-focused/api` | 91 files, 901 passed, 3 opt-in live tests skipped |
| `npm test --workspace @stay-focused/canvas` | 73/73 |
| `npm test --workspace @stay-focused/shared` | 44/44 |
| `npm run build --workspace @stay-focused/db --workspace @stay-focused/api` | passed (28 static pages) |
| `npm run build --workspace @stay-focused/mobile` | `expo export` passed |
| `npm ci --dry-run` | passed; lockfile unchanged |
| `git diff --check` | clean |

New or updated focused coverage:

- Sync-state derivation for all branches.
- Ordering: current before previous, previous retained, independent of input order, stable ties, tolerant of missing term data.
- Owner-bound inventory call and empty list without a connection.
- `course_not_synced` versus `unavailable` mapping.
- Stored fallback: the Sync page stays strict; fallback reads are owner-scoped and write nothing.
- Unselected and foreign courses refused before any source read.
- Mobile grouping, destination, and status labels.
- Screen tests: unsynced and incomplete courses route to Sync with no materials request; synced empty state versus not-synced denial versus real failure.

## 14. Limitations

- Direct production SQL inspection was not possible: the Supabase connector is unauthorized in this session, and there is no CLI or database credential. Sync state was established from the product's own authenticated Sync page plus production logs.
- The Canvas-side course ID for HIST 100 was not retrieved. Only the internal course ID prefix appears in the sanitized logs.
- No course is naturally in the failed/incomplete sync state, and production data was not corrupted to create one.

## 15. Next

B38 Production Generation Quality Acceptance (not started in this task).
