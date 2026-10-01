# B43 Android friend APK acceptance

Started: 2026-10-01 (Asia/Manila). Resumed: 2026-10-02.

## Verdict

**PARTIAL — signed APK produced and installed; full primary-device acceptance is pending.** The installed APK launched standalone with the existing account and loaded Today, Generate, Tasks, Library, a saved Reviewer, Quiz and Draft. The realme disappeared from ADB before fresh Canvas sync, Announcements, token tutorial, and offline/reconnect checks could finish. No second-device PASS is claimed.

## Starting state and configuration

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `5f0d75210ab6d519e852bc3127d3d58b3de62cd3`
- Starting unrelated untracked paths: `UI/`, `apps/mobile/.gitignore`, `supabase/`, `tmp/`; all left untouched.
- Expo SDK: 54 (`expo` package `~54.0.36`)
- React Native: `0.81.5`
- Android application ID: `com.galaxymaxp.stayfocusedv2`
- App version: `2.0.0`; Android versionCode: `1` from EAS build metadata
- EAS profiles: `development` (internal development client), `preview` (internal APK), `production` (store default/AAB)
- Existing APK profile: `preview`; `distribution: internal`, `android.buildType: apk`, channel/environment `preview`. No EAS configuration change was needed.
- EAS environment variables: `EXPO_PUBLIC_SUPABASE_URL` PRESENT; `EXPO_PUBLIC_SUPABASE_ANON_KEY` PRESENT; `EXPO_PUBLIC_API_BASE_URL` PRESENT. Values intentionally omitted. The preview profile's existing API URL setting remains authoritative for that variable.
- Existing remote Android keystore was reused with `--freeze-credentials`; no signing credentials were regenerated.

## Pre-build verification

| Check | Result | Notes |
|---|---|---|
| Mobile typecheck | PASS | `npm run typecheck --workspace @stay-focused/mobile` |
| Mobile lint | PASS | `npm run lint --workspace @stay-focused/mobile`; zero errors and four existing `import/first` warnings in service test files |
| Focused mobile tests | PASS | `npm test --workspace @stay-focused/mobile`; 75 files, 782 tests |
| Expo export/config validation | PASS | `npm run build --workspace @stay-focused/mobile`; Android, iOS, and web bundles exported |
| Expo resolved config | PASS | SDK 54, version 2.0.0, application ID confirmed; versionCode is remote and reported by EAS |

## EAS APK build

- Command: `npx eas build --platform android --profile preview --non-interactive --freeze-credentials`
- Build ID: `2430f1ee-07c8-4b25-800b-dfeb0c6b7534`
- Build page: [EAS Android preview build](https://expo.dev/accounts/galaxymaxp/projects/stay-focused-v2/builds/2430f1ee-07c8-4b25-800b-dfeb0c6b7534)
- Source commit: `5f0d75210ab6d519e852bc3127d3d58b3de62cd3`
- Profile/distribution/artifact target: `preview` / internal / APK
- Version/versionCode: `2.0.0` / `1`
- Result at original report time: `IN_QUEUE` (normal priority). EAS had not assigned a worker after approximately 30 minutes; its official status page reported services operational.
- Final build status: **FINISHED**; no replacement build was submitted.
- Exact hosted APK: [B43 Android APK](https://expo.dev/artifacts/eas/QSRoya4BAjP3Jvpz-01M888TVM25yMFOQt2BxHrv9sI.apk)
- Downloaded unchanged as ignored local `.local/b43/stayfocused.apk` (123,169,674 bytes; SHA-256 `FBC62FE7D7B508B04A4CD22C983C2483DFAF80DC8C0F3ECA22268EF87319C681`). The hosted Expo filename cannot be renamed in place; the local copy uses the requested name.
- `apksigner verify` passed; APK metadata reports package `com.galaxymaxp.stayfocusedv2`, version `2.0.0`, versionCode `1`, and launchable `MainActivity`. No `application-debuggable` flag was reported.

## Resume check

At 2026-10-01 15:37 UTC (23:37 Asia/Manila), the exact same build remains `IN_QUEUE` with normal priority. Its EAS `updatedAt` remains 2026-10-01 14:30:59 UTC; no artifact URL or failure reason is present. It has been queued for about 66 minutes. No replacement build was submitted. The original EAS build remains active and can be polled at the build page above.

This paragraph records the historical queue state. The build subsequently finished and the physical-device check began on October 2.

## Device acceptance

Primary device: realme RMX3151, Android 13, 1080×2412, density 480. `adb install -r .local/b43/stayfocused.apk` returned `Success`; package inspection reported version `2.0.0`/code `1`. `adb reverse --list` was empty. The installed app was force-stopped, launched through its launcher, and ran without Metro, Expo Go, or a development client. The first screenshot was black because Android reported `mWakefulness=Asleep`; waking the screen revealed the running app and existing signed-in session. A transient USB disconnect occurred once during navigation; ADB later disappeared entirely during the Today/Announcements check. Neither event was counted as an app crash.

| Check | Result | Notes |
|---|---|---|
| APK install | PASS | Exact downloaded B43 APK installed in place successfully |
| Standalone launch | PASS | Launcher started the installed release package; no ADB reverse/Metro |
| Authentication/session | PASS | Existing Galaxy session persisted and authenticated course/task/output data loaded; new sign-in not exercised |
| Today | PARTIAL | Screen and synced overdue Tasks loaded; free-time control and Announcements below the fold remain untested |
| Generate | PASS | Synced courses opened; CC17 instructional PPTX entries and their detail rendered; back navigation worked |
| Tasks | PASS | Course-first totals, past-due/completed grouping, and CC16 assignment detail/instructions rendered |
| Library | PASS | CC16 course showed 5 Reviewers, 10 Quizzes, 20 Drafts; saved output categories and cards opened |
| Canvas sync | NOT TESTED | Existing synced course data is visible; no fresh sync completed on this APK |
| Announcements | NOT TESTED | Device disconnected before list/detail/dismissal check |
| Token tutorial | NOT TESTED | Device disconnected before standalone popup check |
| Reviewer | PASS | 27-topic CC16 Reviewer rendered; search highlighted 101 matches and section jump reached topic 5 |
| Quiz | PASS | Existing 100-question Quiz resumed at question 48 with 1/100 answered; no answer changed |
| Activity/Draft | PASS | Existing CC16 presentation Draft opened with saved slides; `Drafts` is the current Library label |
| Force-stop/relaunch | PARTIAL | Force-stop before standalone launch retained the existing session; explicit post-navigation repeat pending |
| Persistence/offline | NOT TESTED | Device disconnected before network-off sequence |
| Reconnect/no duplicates | NOT TESTED | CC16 baseline counts recorded; reconnect comparison pending |
| Crash loop | PASS | App process and screens remained usable through tested flows; no immediate crash loop observed |

Local screenshots and the downloaded APK are kept under ignored `.local/b43/` because they contain private academic content. They were not committed.

## Canvas routing observed so far

| Content | Expected destination | Result | Notes |
|---|---|---|---|
| PPTX instructional material | Generate | PASS | CC17 Lecture Presentations listed two ready PPTX files; material detail opened |
| PDF/DOCX instructional material | Generate | NOT TESTED | Not opened during this run |
| Canvas instructional Page | Generate | NOT TESTED | Not opened during this run |
| Assignment/deadline/submittable item | Tasks | PASS | CC16 assignment with due date and instructions opened from Tasks; Generate course links assignments to Tasks |
| Announcement | Announcements | NOT TESTED | Device disconnected before list/detail check |
| Course outline/admin-only material | Excluded from Generate | NOT TESTED | No applicable exclusion inspected |

## Friend handoff

**APK download is available; B43 friend handoff acceptance is pending the remaining primary-device checks.** The same APK can be shared using the direct artifact link above or the local file named `stayfocused.apk`; see [the short friend checklist](android-friend-beta-checklist.md). No second Android device was available or tested. Do not label second-device acceptance PASS.

## Limitations and next step

- Fresh Canvas sync, Canvas token tutorial, Announcement dismissal, full force-stop/offline/reconnect behavior, and a second-device test remain unverified. B43 is not yet closed.
- The realme disappeared from ADB during the October 2 session. Resume the remaining checks on the same installed APK when it reconnects; do not submit another build.
- No source/configuration code changed, so the prior fresh mobile checks were not rerun. `git diff --check` applies to the documentation update.
- B44 and B45 have not started. Roadmap/current-state closure should wait for the remaining primary acceptance gates.
