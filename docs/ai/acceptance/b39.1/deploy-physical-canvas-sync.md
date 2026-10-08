# B39.1 Deploy + Physical Canvas Sync and Task Attachment Acceptance (2026-10-01)

**BLOCKED — the B39 API is deployed and healthy, offline Task attachment metadata is repaired, and the native preview APK is installed on the realme. Live Canvas authentication/sync and the required physical UI flows remain unverified because no Android UI control surface is available in this session.**

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `f2891a8` (`f2891a85d63a0c3fb8c643ddbe866ed54a4beb9d`)
- Dirty files: `UI/`, `apps/mobile/.gitignore`, `supabase/`, and `tmp/` were already untracked. Left untouched and unstaged.
- Device/ADB: realme RMX3151, Android 13, authorized as `PB6DWWEIHAUCMZOR` (`device`).
- B39 commits present: `51f008b` and `f2891a8`.
- B37 architecture preserved: Yes. No Canvas worker, dispatch, database migration, or RLS code changed. Cloud Run redeployment was not required; worker code is unchanged.
- Separate B37 production-generation regression: Not addressed; it remains a separate existing issue and did not prevent the B39 API deployment or Android build.

## 2. B39.1 changes

- Offline attachment metadata finding: Task summaries and details were API-only. `useExperience` cleared screen data on route changes and did not restore an offline Task or its attachment metadata.
- Files changed: `apps/mobile/src/services/localLibrary/schema.ts`, `artifactStore.ts`, `offlineActivityCache.ts`, `artifactStore.test.ts`, `apps/mobile/src/features/redesign/useExperience.ts`, `TasksScreen.tsx`, and the `screens.test.ts` ActivityDetail fixture.
- Reason: add an owner-scoped activity snapshot table to the existing Library SQLite database, persist summaries and opened details, and use the snapshot only after a connection failure. The existing sign-out purge removes the new rows. File bytes are not downloaded into this cache.
- Tests added/changed: SQLite restart, owner-isolation, refresh idempotency, metadata, and purge coverage; updated an ActivityScreen fixture to include the now-required `attachments` field.
- Commits: `80cd1b0` (offline metadata repair) and `f8f3571` (DTO test fixture).

## 3. API deployment

- Commit: `80cd1b08ed69717fced3f3b18d7f945f5cec865e`
- Deployment ID: `dpl_74hWVM2kSvg21hfnRLcVu885ohFe`
- Status: READY, production target.
- Production URL: <https://stay-focused-v2-prototype.vercel.app>
- Health: `GET /api/health` returned HTTP 200 and `{"status":"ok","version":"2.0.0"}`.
- Attachment API readiness: The deployed Experience catchall route is included in the production build. An unauthenticated attachment request returned HTTP 401, confirming the route is present and protected. No authenticated attachment request was possible without the physical app UI/session.
- Normal authenticated API: Not verified in production.

## 4. Android build

- Build profile: `preview` (internal Android APK, existing EAS project and credentials; credentials frozen).
- Build ID: `de93f504-cb53-4388-b48a-47103d65eb3a`, status FINISHED.
- Commit: `80cd1b08ed69717fced3f3b18d7f945f5cec865e`.
- Artifact/application version: `2.0.0`, Android version code `1`, runtime `2.0.1`, package `com.galaxymaxp.stayfocusedv2`.
- Installed on realme: Yes, via `adb install -r`. Android retained the existing package and first-install timestamp.
- `expo-sharing` native availability: PASS. APK DEX inspection found `expo/modules/sharing/SharingModule` in `classes4.dex`.
- Build note: The first local EAS invocation stopped before creating a build because the clean checkout had no installed config-plugin dependencies. After `npm ci` in the isolated detached worktree, the preview build completed. Signing credentials were not changed.
- UI control: CUA returned `apps: []`, `browsers: []` both before and after install. No Appium, Maestro, or scrcpy workflow was available. The app was not opened through an unsupported ADB UI path.

## 5. Canvas authentication

| Check | Result | Notes |
| --- | --- | --- |
| Credential present | UNVERIFIED | No Canvas credential was extracted or printed. |
| Authentication | UNVERIFIED | No live owner-authenticated Canvas request was made. |
| Canvas account resolved | UNVERIFIED | Requires the signed-in app flow. |
| Retained after relaunch | UNVERIFIED | App was not relaunched through a controllable UI. |
| Secret leakage | No Canvas credential observed | Application log inspection was not possible; no Canvas token/header was requested or printed. |

## 6. Fresh Canvas sync

- Last successful sync before: Not recorded.
- Logical job count before: Not recorded.
- Sync action count: 0; the normal Sync action was not pressed.
- Cloud Tasks evidence: Not collected.
- Cloud Run evidence: Not collected for this run.
- Last successful sync after: Not recorded.
- Logical job count after: Not recorded.

| Data | Result | Before | After | Notes |
| --- | --- | ---: | ---: | --- |
| Courses | UNVERIFIED | — | — | No fresh sync. |
| Tasks | UNVERIFIED | — | — | No fresh sync. |
| Generate materials | UNVERIFIED | — | — | No fresh sync. |
| Announcements | UNVERIFIED | — | — | No fresh sync. |
| Task attachments | UNVERIFIED | — | — | No fresh sync. |

## 7. Canvas routing

| Content | Expected | Result | Evidence |
| --- | --- | --- | --- |
| Instructional material | Generate | Physical UNVERIFIED | Existing B39 routing implementation and regressions retained. |
| Assignment | Tasks | Physical UNVERIFIED | Existing B39 routing implementation and regressions retained. |
| Assignment-only attachment | Tasks | Physical UNVERIFIED | Existing B39 Generate exclusion retained. |
| Announcement | Announcements | Physical UNVERIFIED | Requires fresh Canvas data. |
| Admin/course outline | Excluded | Physical UNVERIFIED | Requires fresh Canvas data. |

## 8. Real Task attachment

- Course: Not selected; app UI unavailable.
- Task: Not selected; app UI unavailable.
- Filename: Not observed.
- MIME/type: Not observed.
- Attachment shown: UNVERIFIED.
- Authenticated resolution: UNVERIFIED; unauthenticated route correctly returned 401.
- Native open/share: APK includes the native Expo Sharing module, but physical chooser flow is UNVERIFIED.
- Correct contents: UNVERIFIED.
- Returned to Task: UNVERIFIED.
- Appeared in Generate: UNVERIFIED physically; existing source-routing regression remains in B39 evidence.
- Triggered Canvas sync: UNVERIFIED; no job-count baseline was available.
- Triggered generation: UNVERIFIED; no Task was opened.

## 9. Offline attachment metadata

- Metadata persisted: Automated PASS in the existing SQLite database; physical test UNVERIFIED.
- Filename/type visible offline: Automated store round-trip PASS; physical UI UNVERIFIED.
- File content cached: No; file bytes are intentionally not part of the metadata cache.
- Offline tap behavior: Existing UI maps a connection failure to “Connect to the internet to open this attachment.” Physical UI UNVERIFIED.
- Result: Implementation repaired and locally verified; physical confirmation blocked.

## 10. Attachment resync

- Task copies before: Not recorded.
- Task copies after: Not recorded.
- Attachment copies before: Not recorded.
- Attachment copies after: Not recorded.
- Result: UNVERIFIED; no manual sync was run.

## 11. Generate navigation

- Course/material: Not selected.
- Android back: UNVERIFIED.
- Gesture/back: UNVERIFIED.
- Returned to course list: UNVERIFIED.
- Result: Physical gate blocked by absent UI control.

## 12. Library

- Course: Not selected.
- Artifact: Not selected.
- Force-stop/relaunch: UNVERIFIED in this acceptance.
- Offline/persistence: Existing B39/B38 persisted artifact tests remain; this physical flow was not repeated.
- Result: Physical gate blocked by absent UI control.

## 13. Announcements

- Announcement: Not selected.
- Close: UNVERIFIED.
- Android back: UNVERIFIED.
- Open in Canvas: UNVERIFIED.
- Trapped modal: UNVERIFIED.
- Result: Physical gate blocked by absent UI control.

## 14. Reviewer

- Reviewer: Not selected.
- Search query: Not run.
- Search jump: UNVERIFIED.
- Section navigator: UNVERIFIED.
- Normal motion: UNVERIFIED.
- Reduced Motion: UNVERIFIED.
- Result: Physical gate blocked by absent UI control.

## 15. Passive-sync evidence

| Action | Logical Canvas sync count | Unexpected sync? |
| --- | ---: | --- |
| Baseline | Not recorded | UNVERIFIED |
| Launch | Not run | UNVERIFIED |
| Today | Not run | UNVERIFIED |
| Generate | Not run | UNVERIFIED |
| Tasks | Not run | UNVERIFIED |
| Task attachment | Not run | UNVERIFIED; attachment request is distinct from a sync job |
| Library | Not run | UNVERIFIED |
| Announcement | Not run | UNVERIFIED |
| Reviewer | Not run | UNVERIFIED |
| Force-stop/relaunch | Not run | UNVERIFIED |

No Canvas Sync action was initiated during this task. No passive job-count assertion is claimed.

## 16. Automated verification

| Command/Test | Result | Notes |
| --- | --- | --- |
| `npm run typecheck` | PASS, 7/7 | Fresh root command; mobile/shared executed, remaining packages were cached. |
| `npm run lint` | PASS, 7/7 | Four pre-existing mobile `import/first` warnings; zero errors. |
| Mobile focused suites | PASS, 65/65 | `screens.test.ts`, `artifactStore.test.ts`, `canvasTaskAttachments.test.ts`. First attempt was 64/65 because an older test fixture omitted required `attachments`; fixture was corrected and rerun. |
| `git diff --check` | PASS | Fresh before commits. |
| Production API health | PASS | HTTP 200 after READY deployment. |
| Unauthenticated attachment route | PASS | HTTP 401; route is protected. |

## 17. Security

| Check | Result | Notes |
| --- | --- | --- |
| Canvas token leakage | No Canvas token observed | No Canvas credential was obtained. Application-log inspection unavailable. |
| Authorization leakage | No Authorization header observed | No authenticated request was made. |
| Owner-scoped attachment | PASS by code/test evidence | B39 owner-scoped attachment implementation unchanged. |
| RLS | Unchanged | No database or migration changes in B39.1. Live policy inspection not performed. |
| Cloud Run privacy | Unchanged | Worker and dispatch code untouched; no Cloud Run deploy. Live IAM inspection not performed. |

## 18. Deployment summary

- Vercel: READY production deployment `dpl_74hWVM2kSvg21hfnRLcVu885ohFe`, API health 200, protected attachment endpoint responds 401 without authentication.
- Mobile/EAS: Preview build `de93f504-cb53-4388-b48a-47103d65eb3a` FINISHED and installed on the RMX3151; native Expo Sharing class found in the APK.
- Cloud Run: Deployment not required; worker code unchanged.
- Production state: B39 API is live. No Canvas sync or authenticated attachment operation was performed.

## 19. Git

- Repair commit: `80cd1b0`.
- Test fixture commit: `f8f3571`.
- Acceptance/docs commit: Added after this record is completed.
- Final HEAD: Updated by acceptance/docs commit.
- Remaining dirty files: Original untracked `UI/`, `apps/mobile/.gitignore`, `supabase/`, `tmp/`; untouched and unstaged.
- Unrelated files untouched: Yes.
- Push performed: No.

## 20. Verdict

**BLOCKED — required Canvas/device acceptance evidence could not be obtained because this session has no Android UI control surface.** The API deployment, offline metadata repair, native build, and installation prerequisites completed. Do not close B39 PASS or start B40.

Next recommended milestone: provide a supported CUA Android UI control surface for the authorized RMX3151, then resume the real-owner Canvas authentication, sync, attachment, and remaining physical gates.
