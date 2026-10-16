# IM1 image saving and Android Share — STOPPED at STEP 0

Date: 2026-10-16. Baseline: `c74d94f` on
`overnight/2026-10-15_feedback`, ahead of the locally known `github/main` by
19 commits. No fetch or push. Git identity: galaxymaxp
<omgraythekid@gmail.com>. The tracked tree was clean; the owner's untracked
`UI/`, `apps/mobile/.gitignore`, and `supabase/.temp/` were left alone.
`tmp/overnight/SA2.status` and `tmp/overnight/MR2.status` both began with PASS.

## Stop condition and exact owner decision

IM1 requires requesting **write-only** photo permission and saving every image
to the **Stay Focused** album. The installed SDK 57-compatible
`expo-media-library` **57.0.5** explicitly requires **full read/write access**
for iOS album operations. This contradicts the permission assumption before
implementation; it is not a missing production-state check.

Reproducible installed-source evidence:

- `node_modules/expo/bundledNativeModules.json:67` selects `~57.0.5`.
- `node_modules/expo-media-library/build/index.d.ts:26` exposes the write-only
  permission argument.
- `node_modules/expo-media-library/ios/next/MediaLibraryNextModule.swift:238`
  guards `Album.get` with `checkIfFullAccessGranted()`;
  line 252 applies the same guard to `Album.create`, before any creation.
- `node_modules/expo-media-library/ios/next/MediaLibraryNextPermissionDelegate.swift:57`
  checks the read/write requester, and its `hasFullAccess` implementation
  requires granted status plus `accessPrivileges == all`. The separate
  write-only authorization does not satisfy this guard.
- The legacy entry point does not avoid it:
  `node_modules/expo-media-library/ios/MediaLibraryModule.swift:244` and
  line 251 guard album lookup/creation with `runIfAllPermissionsWereGranted`;
  line 529 checks the read/write requester and full privileges.
- Saving a standalone asset has a separate write-permission path
  (`ios/next/MediaLibraryNextModule.swift:124`), but substituting the general
  photo library would break IM1's named-album requirement.

**Exact question for the owner:** May IM1 request full photo-library access on
iOS so it can save to the Stay Focused album, or should this slice explicitly
limit named-album saving to Android and keep iOS save behavior deferred?

The UNATTENDED rules 3–4 and STEP 0 require stopping on a code contradiction.
No permission expansion, platform-scope change, custom native workaround, or
later implementation step was undertaken. The dependency was installed with
scripts disabled solely to inspect the exact SDK-compatible package. The
incomplete manifest/lockfile changes (including unrelated npm lockfile churn)
were reverted byte-for-byte to HEAD. No native module/plugin addition is
committed; an implementation ADR is deferred with the blocked implementation.
The inspected package may remain in the local `node_modules` installation.

## STEP 0 surface and identity inventory

| Requirement | Owning paths and evidence | Result |
| --- | --- | --- |
| Mobile page image and zoom | `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx:12`, modal at 115, Ask at 124, `ZoomablePage` at 133 | FRESH source inspection |
| Mobile figures and zoom | `apps/mobile/src/features/reviewer/SourceFigures.tsx:40`, sheet at 77, zoom/Ask at 81/84 | FRESH source inspection |
| Mobile Wikimedia and zoom | `apps/mobile/src/features/reviewer/ExternalVisual.tsx:13`, sheet at 46, zoom/Ask at 49/51 | FRESH source inspection |
| SA2 action and reader composition | `AskImageButton.tsx:6`; `ReviewerReader.tsx:404`, 407, 410 | FRESH source inspection |
| Owner website image surfaces | `apps/web/src/features/reviewer/section-visual.tsx:47`, dialog at 134; owner composition in `reviewer-reader.tsx:411` | FRESH source inspection |
| Shared website | `apps/web/src/features/shared-reviewer.tsx:74` renders only included public Wikimedia visuals; no course snapshot or owner image API | FRESH source inspection; no Save added |
| Native configuration | `apps/mobile/app.json:28`; `apps/mobile/package.json:27`, 33, 41 before the temporary install contain clipboard/filesystem/sharing; media-library absent | FRESH baseline inspection |
| Share render gate | `apps/mobile/src/features/reviewer/ReviewerReader.tsx:375` checks `artifact:`; no Android/platform branch | FRESH source inspection |
| Share clipboard dependency | `ShareReviewerMenu.tsx:3` imports clipboard eagerly; create/copy handlers await it without a native-module fallback; `node_modules/expo-clipboard/build/ExpoClipboard.js:3` calls `requireNativeModule('ExpoClipboard')` at import | FRESH source finding; repair NOT RUN after STOP |
| Library online/device identity | `apps/api/src/lib/experience/service.ts:265`, 270, 305, 311; `repository.ts:87`; mobile `LibraryScreen.tsx:334`, 375; `localLibrary/artifactStore.ts:296`, 303, 309 and `librarySync.ts:118` | Canonical `artifact:` summary survives aliases and device persistence |

Paths without a canonical `artifact:` prefix were traced: a `generation:` route
is an input alias, and server detail resolves it to the canonical artifact
summary before the reader receives it. Local persistence stores
`detail.artifact.id` as canonical and records the requested alias separately.
Quiz/activity entries are not owner reviewer artifacts. The stale `reviewer:`
example in the artifact-store comment is not an ID transformation in code.
No supported owner reviewer path was found that strips `artifact:`. Device
copies retain Share's render condition and pass `deviceCopy` to its disabled
state. Existing offline notice is in `ReviewerReader.tsx:367`.

**Share root-cause finding:** no code evidence of Android-specific hiding or a
lost canonical server ID. Eager clipboard native loading can fail in an APK
without the module; that remains a plausible APK compatibility cause, **not a
confirmed physical-device diagnosis**. RB4 already requires a new preview APK.
The requested guarded dynamic clipboard import/system-sheet fallback remains
unimplemented because the run stopped at STEP 0.

Image delivery is usable: page snapshots receive a short-lived HTTPS signed
Storage URL (`apps/api/src/lib/source-page-snapshots.ts:80`, 82;
`apps/mobile/src/services/sourcePageSnapshots.ts:24`). Figures receive HTTPS
URLs through the owner-scoped figures response
(`apps/mobile/src/services/sourceFigures.ts:12`, 19). External visuals receive
a validated `upload.wikimedia.org` HTTPS URL and native identification header
(`apps/mobile/src/services/externalVisuals.ts:6`, 9, 27); the stored fields are
`title`, `credit`, `license`, `licenseUrl`, and `sourceUrl`. Those fields are
rendered in mobile attribution and shared website captions. These three viewer
paths do not use data URIs. No actual image was fetched during investigation.

## Acceptance and verification

| Scope / exact command | Result / counts |
| --- | --- |
| STEP 0 local baseline, surface, identity and installed native-source inspection | FRESH; contradiction found, STOPPED |
| STEP 1 mobile helper/dependency/plugin/UI | NOT RUN to completion; inspection-only dependency edits reverted |
| STEP 2 website download | NOT RUN |
| STEP 3 Android Share/fallback | NOT RUN; source diagnosis only |
| STEP 4 new tests | NOT RUN; 0 new tests |
| `npm run typecheck -- --force` | NOT RUN; 0 tasks executed |
| `npm run lint -- --force` | NOT RUN; 0 tasks executed |
| `npm run test --workspace @stay-focused/api` | NOT RUN; 0 tests executed |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN; 0 tests executed |
| `npm run test --workspace @stay-focused/shared` | NOT RUN; 0 tests executed |
| `npm run test --workspace @stay-focused/web` | NOT RUN; 0 tests executed |
| `npm run build --workspace @stay-focused/api` | NOT RUN; 0 builds executed |
| `npm run build --workspace @stay-focused/web` | NOT RUN; 0 builds executed |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN; 0 bundles produced |
| `git diff --check`, `git diff --cached --check` | FRESH documentation checkpoint; results recorded in handoff/status |

No test failure or flake occurred: the implementation gates were not entered.
Earlier SA2/MR2 passing counts are historical and are not IM1 validation.
The npm inspection command completed successfully; The initial Python cleanup command was unavailable and made no changes; cleanup succeeded with Node. Source-search glob errors
under PowerShell were corrected by searching directories with `rg -g`.

## Owner steps remaining

- Resolve the exact permission/platform question above before resuming IM1.
  Then implement STEP 1–4, run every fresh serial gate, add the native-module
  ADR, reconcile docs and commit the code.
- **Rollout — skipped entirely:** new preview APK containing clipboard and
  media-library, then website publication. OTA alone cannot add native modules.
- **Device checks — skipped entirely:** on realme verify page snapshot, source
  figure and Wikimedia Save reach the Stay Focused album; verify Share appears,
  offline disabled copy, permission denial/settings and missing-clipboard
  fallback. Verify iOS behavior once its scope is resolved.
- Deployed revisions, installed APK contents, real photo authorization/gallery
  behavior, live database/applied migrations/Scheduler, provider state and
  physical root cause are **UNVERIFIED (owner to confirm)**.

No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL, migration
application, deployment, Scheduler action, environment-file edit, email or push
occurred. No other roadmap item was started. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/
SA1/SA2/MR2 implementation remains unchanged.
