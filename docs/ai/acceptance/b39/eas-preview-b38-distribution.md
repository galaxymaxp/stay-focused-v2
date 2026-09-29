# B39 - B38 EAS preview distribution

Date: 2026-09-29 (Asia/Manila). **PASS after authorized native preview-build fallback.**

## State and scope

- Branch: `b25-3-3-ai-first`; starting HEAD: `2af5681527e4fe334aec799e58a6606a33157784` (B38 committed).
- Reviewed existing header cleanup in LibraryScreen.tsx, ReviewerReader.tsx and corresponding current-state/roadmap/sprint entries. Committed only those five files as `b88a50798898a508d8fc6efda6c163d128a8e41b` (`refactor(mobile): simplify generated content headers`).
- Final distributed source: `2c66889e30eb248c5ba3b7410b4ffba3dbca383d` (`fix(mobile): version Android runtime for native auth`); one Android runtime override, no application/auth changes.
- Unrelated starting paths `apps/mobile/.gitignore` and `tmp/` remained untouched and unstaged. No origin push, backend rollout, migration, production channel/build or store submission.

## EAS readiness and original OTA

Existing project `@galaxymaxp/stay-focused-v2`, ID `2b3a9db6-3712-4ed0-8365-17d9936562dd`; login `galaxymax`. Existing preview profile: internal/APK, environment/channel/branch `preview`. Updates already configured; no configure command or channel remapping.

Initial decision: **EAS UPDATE** for JS/UI-only B38. Old release APK had Updates enabled, correct project URL/channel and runtime `2.0.0`. Published from clean committed source:

| Field | Value |
| --- | --- |
| Group / Android update | `cdc3f3a6-5ecb-46b5-96cb-ea1404c007bb` / `01a0eb5e-f925-7367-afbb-d782d0f9e6a4` |
| Channel / environment / runtime | preview / preview / 2.0.0 |
| Commit | `b88a50798898a508d8fc6efda6c163d128a8e41b` |
| Message | B38 draft-first assignment UX and simplified content headers |

[EAS update](https://expo.dev/accounts/galaxymaxp/projects/stay-focused-v2/updates/cdc3f3a6-5ecb-46b5-96cb-ea1404c007bb). Old-APK native logs identified the exact ID/runtime and completed download at 12:14:58-12:15:00. Restart and changed sign-in UI supported activation; active ID was inferred, not directly probed. Original verdict was PARTIAL because the release app was signed out.

Variable values suppressed: Supabase URL **present**, Supabase anon key **present**; API URL **missing** on EAS, **present** in the existing preview profile. OTA export explicitly inherited that profile variable; bundle API presence was verified without printing it. APK build automatically used profile env plus EAS preview variables. No EAS variable changed.

## Required native fallback

Owner reported "Update Stay Focused to use secure provider sign-in." Old APK lacked `ExpoCrypto`. The PKCE guard fails closed without native crypto/WebCrypto; the earlier assessment that crypto was optional for authentication was incorrect. OTA delivers JS but cannot install native crypto. Provider sign-in, account creation and password recovery require it; existing-account email/password sign-in does not invoke this guard.

Owner explicitly requested an APK build. Final decision: **NEW PREVIEW BUILD REQUIRED for secure provider sign-in.** Committed Android runtime `2.0.1` to distinguish new native capabilities from old `2.0.0`; iOS runtime and channel mappings unchanged.

| Build field | Value |
| --- | --- |
| Build ID | `21be5ea3-f224-4be4-a707-643c7957dd15` |
| Profile / environment / channel | preview / preview / preview |
| Platform / runtime | Android / 2.0.1 |
| Commit | `2c66889e30eb248c5ba3b7410b4ffba3dbca383d` |
| Result / completed | FINISHED, Gradle BUILD SUCCESSFUL / 2026-09-29T04:42:38.943Z |
| APK size / SHA-256 | 121,707,170 bytes / `1526F480BAEB21CE289C1E1520D04599AEEF09C6C7B4BE6A0310225B28D3A463` |

[Build](https://expo.dev/accounts/galaxymaxp/projects/stay-focused-v2/builds/21be5ea3-f224-4be4-a707-643c7957dd15) / [APK](https://expo.dev/artifacts/eas/xRRghQYkGH3h6GdSS2Vry4IlI5dT6at-3IoLtaWZsc0.apk).

Built from clean committed checkout using existing signing credentials and `--freeze-credentials`. Autolinking resolved expo-crypto 15.0.9; downloaded APK DEX contains ExpoCrypto. Manifest/resources confirm Updates enabled, correct project URL, preview channel and runtime 2.0.1. Installed with `adb install -r` at 12:45:22, preserving app data. Native startup checked EAS without error. Future Android preview updates target 2.0.1; old 2.0.0 updates do not apply. No 2.0.1 OTA was published; final acceptance used this signed APK's embedded B38 bundle.

## Verification

| Check | Result |
| --- | --- |
| Focused mobile tests before OTA | FRESH PASS: 147 tests / 11 files |
| Mobile typecheck / lint before OTA | FRESH PASS; zero lint errors, four existing import-order warnings |
| Auth checks after runtime override | FRESH PASS: 29 tests / 3 files (PKCE/provider/callback) |
| git diff --check | FRESH PASS |
| Android OTA export | FRESH PASS: 3,422 modules; Generate Draft present, Study Activity absent, preview API present |
| Preview APK build / inspection / installation | FRESH PASS |

Focused mobile files: screens, libraryPresentation, GenerationScreen, tasksPresentation, presentation, reviewerNavigation, reviewerReaderPresentation, QuizNavigation, QuestionSlider, completedArtifactCache, studyExport. JS/UI stayed unchanged during the runtime-only override; no backend suite rerun.

First lint failed on sandbox parent access; authorized rerun passed. Initial EAS reads hit PowerShell/network restrictions and an unsupported env-list flag; corrected. OTA attempts stopped before publication on clean-worktree ownership and linked-dependency Metro resolution; used a process-scoped Git safe-directory exception, exported verified unchanged source from the established workspace with preview env, then published that export from clean checkout using skip-bundler/input-dir. No global Git configuration or explicit clear-cache flag changed. First autolinking probe omitted --json; corrected. Build emitted a watcher-option warning but passed.

## Fresh realme acceptance

Realme RMX3151 / Android 13, serial `PB6DWWEIHAUCMZOR`; signed non-debuggable release package `com.galaxymaxp.stayfocusedv2`. No Metro connection; adb reverse list empty throughout final acceptance.

Google sign-in passed the crypto guard. First callback went to Android's saved default for separate b37debug, which lacked that attempt's PKCE verifier. Cleared the debug default in Android settings, temporarily disabled the debug package, retried and authenticated the existing acceptance account in the release app. Re-enabled debug immediately afterward; no debug data deleted or substituted.

| Check | Result |
| --- | --- |
| Preview release bundle / no Metro | FRESH PASS: installed EAS APK, runtime 2.0.1, no adb reverse |
| Google provider sign-in | FRESH PASS: callback completed; authenticated Today/Library |
| Draft-first flow | FRESH PASS: Firewall/VPN Task -> Assignment, Generate Draft / Open Draft; existing Open Draft goes directly to editor |
| Study Activity absent | FRESH PASS: no intermediate worksheet or Library Activities category |
| Simplified Draft header | FRESH PASS: one editable title, header Export, Saved draft, populated slides; no repeated course/source/date banner |
| Library | FRESH PASS: All / Reviewers / Quizzes / Drafts |
| Reviewer controls | FRESH PASS: saved Firewalls/VPN reviewer, 27 topics, Topic scrubber, search, Generate Quiz and Export |
| Quiz progress | FRESH PASS: existing practice at Question 48 of 100; 1 answered / 99 unanswered; navigation retained; no answers changed |
| Offline Draft reopen | FRESH PASS: force-stop, disable network, reopen same Firewall/VPN Draft; device-copy notice; title and first slide match online |
| Duplicate prevention on reopen | FRESH PASS at UI level: identical visible Draft cards and stable 20-Draft course summary before/offline/after reconnect; no new generation |

Offline proof: Android reported **Active default network: none** and app displayed connection/device-copy guidance. Restored Wi-Fi/data (both read 1), active network returned and Library stayed stable. Cloud reconciliation first refreshed older cached summaries; comparison used the settled online baseline. Existing Canvas stale-sync notice did not block saved content. No Draft edits, regeneration or native Office export tests. Microsoft sign-in/password recovery not separately exercised.

Private APKs, exports, logs and UI evidence remain ignored under .local/b39/. Acceptance and current-state/roadmap/sprint documents committed after successful final verification; unrelated paths excluded. No origin push.

## Verdict

**PASS - B38 UX published to EAS preview and verified on physical Android**, with the authorized preview APK required for secure provider sign-in.

Single next recommended task: complete the separate realme native Office DOCX/PPTX-opening acceptance gate. Not begun here.
