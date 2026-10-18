# FX1 image diagnosis — 2026-10-18

Status: **FX1b PASS for code, tests, gates, docs and local commits; physical acceptance pending.**

The original FX1 STOP below is historical. The owner answered its scope question
in FX1b; the appended outcome records the approved repair and current evidence.

The unattended rules take precedence over the implementation instructions.
Rule 3 says, "It is a STOP if the code itself contradicts what the prompt
assumes." The format/size hypothesis says the server stores the Commons
original file URL. The inspected implementation already selects thumbnails.
The run stopped at that contradiction; it does not claim either device failure
has been fixed or its root cause established.

## Baseline and completed safe work

- Branch: `overnight/2026-10-15_feedback`; starting HEAD `653e8d8`.
- `git fetch github` succeeded; `github/main` was the expected `0d7bfed`.
- Normal merge `cb4df08` brings the release fixes from main without conflicts.
  Author: galaxymaxp <omgraythekid@gmail.com>.
- **FRESH PASS:** required post-merge `npm ci`, exit 0; 1,488 packages added,
  1,497 audited. TEMP/TMP were repo-local `tmp/fx1-temp`. npm reported 33
  dependency advisories (11 moderate, 22 high); no audit-fix or dependency
  change was attempted. Installation emitted deprecation warnings.
- Current shipped release remains **dc162de**, according to the merged FULLSEND
  evidence. Its actual deployed revision is **UNVERIFIED (owner to confirm)**.
- Unrelated untracked `UI/`, `apps/mobile/.gitignore`, and `supabase/.temp/`
  were preserved. No environment file was edited.

## STEP 0 code evidence

References below describe the merged application code at `cb4df08`.

| Surface | Evidence |
| --- | --- |
| Save implementation | `apps/mobile/src/features/reviewer/saveImage.ts:14` dynamically imports `expo-media-library/legacy`; line 20 imports `expo-file-system/legacy`. Line 15 requests write-only photo permission. Line 28 downloads with the supplied headers; lines 29–31 check HTTP status and image MIME. Lines 37–38 check file existence/size. Line 41 awaits iOS `saveToLibraryAsync`; line 45 awaits Android `createAlbumAsync('Stay Focused', undefined, false, uri)`. The bare catch at line 49 hides the stage. Cleanup at lines 51–52 runs after the awaited operation settles. |
| Save control | `apps/mobile/src/features/reviewer/SaveImageButton.tsx:9` guards concurrent/offline saves and displays the result; permission denial supplies Open settings. |
| Figure download caller | `apps/mobile/src/features/reviewer/SourceFigures.tsx:95` supplies `uri: figure.url`, no headers. `apps/api/src/lib/source-figures/sections.ts:104` signs the private storage object for 600 seconds and line 106 returns the signed URL. These image bytes use a signed storage URL, not a bearer-protected API image route. The discovery route remains protected. |
| Snapshot download caller | `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx:129` supplies `uri: ready.url`, no headers. `apps/api/src/lib/source-page-snapshots.ts:80` signs the private object for 600 seconds and line 82 returns the signed URL. No bearer header is required for those signed image bytes. |
| External download caller | `apps/mobile/src/features/reviewer/ExternalVisual.tsx:49` supplies `uri: result.image`, `headers: EXTERNAL_IMAGE_HEADERS`, source title and stored attribution. Card and viewer image errors call `setOpen(false)` at lines 35 and 46, confirming the silent-close behavior. |
| Native external headers and URL validation | `apps/mobile/src/services/externalVisuals.ts:6` defines the header, with stale `StayFocused/2.1.0` at line 7 versus app config version 2.2.0. `allowedUrl` at line 18 requires HTTPS, an allowed hostname, no credentials and no explicit port. Lines 27–28 restrict images to `upload.wikimedia.org` and source links to Commons File pages. |
| Commons selection — contradiction | `apps/api/src/lib/external-visuals/commons.ts:7` sets width 1200. Line 91 requests `imageinfo` with `iiurlwidth`. Line 73 selects **`info.thumburl`**, not `info.url`; line 75 uses **`thumbwidth`/`thumbheight`**. Lines 78–80 exclude TIFF, reject SVG unless the selected thumbnail ends in `.png`, and reject width over 1200. Lines 52–53 normalize `thumb.wikimedia.org` to the allow-listed upload host. GIF remains eligible; this is not proof that the failed device image was a GIF. |
| Stored and returned external image | `apps/api/src/lib/external-visuals/service.ts:79` persists `image.image`, which comes from the thumbnail candidate. Line 21 returns the stored `row.image_url` unchanged; `apps/api/src/lib/external-visuals/batch.ts:39` does the same on reviewer reads. Legacy rows could differ, but their actual values are unverified. |
| Existing selection tests | `apps/api/src/lib/external-visuals/commons.test.ts:26` covers non-Commons hosts, raw SVG and oversized thumbnail rejection; line 37 asserts `iiurlwidth=1200`; line 62 covers thumbnail-host normalization. Tests were inspected, **NOT RUN** after the STOP. |
| Website rendering | `apps/web/src/features/reviewer/section-visual.tsx:142` renders `<img src={external.image}>` directly. Line 141 passes that same value into the viewer; line 165 renders `zoomed.src`. Browser rendering does not prove the native request succeeds. |
| Existing gallery decision | `docs/architecture/ADR-038-reviewer-image-gallery-saving.md` records why Android uses the initial-file album path without album lookup and why iOS uses add-only Photos. Changing to asset-first writes is not supported by device evidence from this run. |

## Hypothesis verdicts and unavailable evidence

- **Original format/size:** the claim that current selection stores Commons
  originals is contradicted by code and the existing test assertions. Stored
  historical row contents and the failed image format remain **UNVERIFIED
  (owner to confirm)**. No read-time conversion or database change was made.
- **User-Agent/403:** the stale version string is confirmed. A Wikimedia 403
  or policy rejection is **UNVERIFIED (owner to confirm)**. No public Commons
  request was made; no production service was contacted.
- **Save download/HTTP/MIME/empty file:** each failure is possible but hidden
  by the catch. There is no evidence of the actual response. Missing bearer
  headers do not explain the signed storage URL path. Expiry remains possible,
  not established.
- **Android media write:** the current operation is awaited before cleanup;
  premature JavaScript cleanup is not established. The actual native exception
  and SDK 57 native behavior were not established before the STOP.
- **Legacy imports:** the source imports are confirmed; successful release
  bundle/native module resolution remains **UNVERIFIED (owner to confirm)**.
- **ADB:** `adb devices` returned an empty device list. The requested read-only
  `adb logcat -d | findstr /i "reviewer.external_image_failed
  reviewer.external_image_loaded ReactNativeJS MediaLibrary"` waited for a
  device and was interrupted. **BLOCKED**, zero log records obtained; no phone
  mutation or interactive device check occurred. Lack of a device is not the
  STOP reason.
- No 2026-10-17 roadmap file was found in the repository. The canonical
  planning documents record this STOP; no replacement roadmap was invented.

## Verification

All seven requested application gate commands (root forced typecheck, root
forced lint, shared/API/mobile/web suites, root forced build) are **NOT RUN**:
the earlier mandatory STOP overrides progression to implementation and gates.
Gate counts: **0/7 executed; no test pass count claimed**. Diff hygiene is
**FRESH PASS** (`git diff --check` and `git diff --cached --check`, exit 0),
checked separately for the documentation checkpoint. No cached result is
presented as fresh. No application test failure or flake was observed because
the suites were not run.

The first local documentation-edit command could not start because `python`
is unavailable; the Node.js edit succeeded. This is recorded as a tooling
attempt, not a test failure or flake.

## Exact owner question

Given that current Commons selection already requests bounded thumbnails and
stores `thumburl`, should FX1 resume under a revised scope that investigates the
actual failed image response and save failure stage, preserves ADR-038's
write-only/add-only permission constraints, and changes image selection or the
Android media path only when evidence supports it?

## Owner steps remaining

1. Resolve the STEP 0 contradiction and authorize the revised diagnostic scope.
   Confirm the failed stored image shape and native failure evidence without
   exposing private URLs or academic content.
2. Complete FX1 STEP 0, STEP 1, STEP 2, tests and all fresh serial gates. Neither
   Save image nor external loading is repaired by this checkpoint.
3. **Rollout — NOT RUN, skipped entirely.** After a reviewed repair, run the
   preview-update preflight before an authorized OTA to `2.2.0-sdk57` if changes
   are JS/TS only; deploy the API if needed. A native change requires a new APK
   with deliberate versionCode 7 because preview autoIncrement is false.
4. **Device checks — NOT RUN, skipped entirely.** Recheck figure, snapshot and
   external-image saves and external card/viewer rendering on the Realme.
   FULLSEND's other outstanding browser, overflowing-viewer and suitable-source
   Office checks remain outstanding.

No deployment, push, remote SQL/migration application, Scheduler action,
Supabase/Vercel/Google Cloud/Canvas/Resend call, email or environment-file edit
was performed. Production and Scheduler state are **UNVERIFIED (owner to
confirm)**; migrations were not changed.

## FX1b outcome — 2026-10-18

## FX1b image repair complete locally (2026-10-18)

**PASS for the finite unattended code scope; device acceptance remains pending.**
Owner's revised FX1b scope supersedes the earlier diagnostic STOP. Commons
already selected bounded thumbnails from its first implementation; no legacy
conversion is needed. New GIF candidates are skipped. The native User-Agent
uses expo-constants/app config (currently 2.2.0) and the existing contact URL.
Mobile and web external-image failures retain the viewer and display
Image couldn't load, Retry and Open on Commons; safe failure logs contain no URL.

Save returns/logs typed permission, download, HTTP-status, MIME, empty-file,
media-write and missing-module stages with specific messages. Source saves
refresh signed URLs through existing bearer-protected reads after permission,
match the exact figure/snapshot identity, and fail safely if it changed.
SDK 57 explicitly supports the current Android initial-file album call, so
ADR-038's Android write-only and iOS add-only paths remain; cleanup follows
the awaited native write. These fixes do not establish the actual phone exception.

**FRESH final gates:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; shared **350/350** (40 files), API **2273/2273** (199 files, 3 existing live skips), mobile **1263/1263** (134 files), web **211/211** (37 files); zero test failures. All seven application gates
ran serially with repo-local TEMP/TMP. Diff and staged-diff hygiene PASS.
Lint retains six existing warnings. First lint attempt failed on a new web
JSX apostrophe (5/8 tasks complete, one error); fixed and the serial sequence
restarted. Focused mobile first attempt had 141 pass/1 fail from an invalid
test fixture; corrected, then 142/142 passed. First full mobile run had 1,243
passing tests and two failed suites (132 passing files) because indirect imports
needed an expo-constants Node mock; fixed before restarting the final sequence.
No nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Publish reviewed JS/TS changes and the GIF API rule, then recheck figure,
snapshot and external saves plus external card/viewer rendering on Realme.
ADB evidence is BLOCKED (zero devices); actual native cause/module resolution,
failed image/response and production/database/Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deployment, SQL, migration,
Scheduler action, email, environment-file edit or push occurred. The absent
2026-10-17 roadmap file was skipped; unrelated untracked work is preserved.
This run ends at FX1b; FULLSEND's other live checks remain pending.

[FX1 diagnosis and FX1b outcome](fx1-image-diagnosis.md).


### Acceptance matrix and root-cause limits

| Requirement / hypothesis | Result and evidence |
| --- | --- |
| STEP 0 reuse and baseline | DONE. Read FX1.progress, last 15 commits and dirty tree first. Existing merge cb4df08 and install retained; node_modules present, npm ci NOT RUN (already done). Read-only fetch confirms github/main 0d7bfed. Source evidence in the original table is reused. |
| Original format/size | DOES NOT HOLD, closed by owner. First implementation d1775c18 already selected thumburl. No read-time conversion or original-URL tests added. |
| Selected GIF | FRESH PASS: commons.ts:78-81 excludes GIF MIME and selected GIF suffix; commons.test.ts covers fallback to a supported candidate, PNG/JPEG/WebP and SVG raster thumbnails. Existing allow-list and bounds retained. Actual failed device format UNVERIFIED. |
| User-Agent | FRESH PASS: services/externalVisuals.ts:9 derives version from Constants.expoConfig with app.json fallback and existing GitHub contact URL. Test uses 9.8.7 to prove this is not hardcoded to 2.2.0. A real Wikimedia 403 remains UNVERIFIED. |
| Silent close | FRESH PASS: ExternalVisual.tsx:18-23 and 39-51 retain the viewer and share retry/error state; section-visual.tsx:59-62,145-147,169-170 mirror it on web. Tests cover both card and viewer failure, URL-free logs, retrying the same image and Commons source links. |
| Save diagnostics | FRESH PASS: saveImage.ts:5-23,25-78 classifies every requested stage, plus download for network/read/cache failures. Only stage is logged; no native errors, URLs or academic text are returned. Permission denial retains Open settings. Missing native imports are mocked independently. |
| Signed-URL lifetime | CODE RISK CONFIRMED, actual phone cause UNVERIFIED. SourceFigures.tsx:60-72 can retain a loaded figure indefinitely (availability heartbeat does not refresh figures). Snapshot polling pauses outside active app; no expiry guard existed at save. SourceFigures.tsx:95-100 and SourcePageSnapshot.tsx:129-134 now supply refreshUri through SaveImageButton.tsx:16 to saveImage.ts:45. Existing owner reads mint fresh URLs after permission and before download; no bearer header is sent to storage bytes. Missing/replaced IDs and non-ready snapshots safely fail without downloading the stale URL. |
| Android media path | SUPPORTED, retained. Installed expo-media-library 57.0.5 src/legacy/MediaLibrary.ts:768-815 documents/types initialAssetLocalUri and forwards it on Android. MediaLibraryModule.kt:155-170 explicitly dispatches it to createAlbumWithInitialFileUri under write permission; :357-364 preserves that permission gate. albums/CreateAlbum.kt:50-66 awaits asset insertion then returns the album. No evidence warrants asset-first/addAssetsToAlbumAsync, so no ADR-038 addendum/call-order rewrite. Tests instead assert download validation before native write, no asset/album lookup and cleanup only after Android/iOS write resolves. |
| Legacy imports | Both package exports resolve locally to src/legacy/index.ts; forced mobile export validates bundling. The signed APK's native module contents remain UNVERIFIED (owner to confirm). |
| ADB | BLOCKED: fresh adb devices returned zero devices. adb logcat -d was not started without a device; prior FX1 already recorded its indefinite wait. Zero log records. No phone mutation or device checks. |
| Requested dated roadmap | NOT APPLICABLE: no 2026-10-17 roadmap exists; skipped as owner instructed. Other canonical docs reconciled. |

### Exact verification and attempts

Seven final serial commands, all **FRESH PASS**:

Environment: local Windows checkout, repo-local TEMP/TMP, live-test flags off.
The tested source snapshot is now committed at **a10642b**, including
**37fcd16** and **dfbf466**; only documentation changed after these gates.

1. npm run typecheck -- --force: 8/8 tasks, 0 cached.
2. npm run lint -- --force: 8/8 tasks, 0 cached, six existing warnings, no errors.
3. npm test -w @stay-focused/shared: 350 passed, 40 files.
4. npm test -w @stay-focused/api: 2273 passed, 3 existing live skips, 199 passing files.
5. npm test -w @stay-focused/mobile: 1263 passed, 134 files.
6. npm test -w @stay-focused/web: 211 passed, 37 files.
7. npm run build -- --force: 8/8 tasks, 0 cached. Generated API/web next-env.d.ts restored from pre-build copies.

Build details: API 35/35 and web 19/19 generated pages; Expo Android 1/1,
iOS 1/1 and web 10/10 emitted bundles, 68 assets. Build exit 0.

git diff --check and git diff --cached --check: FRESH PASS, exit 0.
Focused API: 23/23 (1 file); focused mobile final: 142/142 (9 files);
focused web/download: 9/9 (2 files). These are additional development checks,
not a substitute for the final full suites. No cached acceptance is claimed.
First focused mobile attempt: 141 pass/1 fail, fixture included an impossible
rendering url:undefined rather than omitting URL; corrected to the real DTO.
First lint: 5/8 tasks completed, 1 new JSX-entity error and 1 warning reported
before Turbo cancellation; fixed with a JSX string expression. Typecheck/lint
were rerun fresh before continuing serially. An interim successful lint had
seven warnings; the introduced test import-order warning was removed. Final
review also narrowed module detection so source-unavailable errors stay in
the download stage; regressions cover that case, and typecheck/lint were rerun.
First full mobile run: 1,243 passing tests in 132 files and two import-failed
suites (SectionScrubber and studyAnswer, __DEV__ undefined in Expo native code).
Added the same expo-constants stand-in to those Node-only test boundaries;
focused 20/20 passed, then the final seven-command serial sequence was restarted.
A Node -e import-resolution probe
had a PowerShell quoting SyntaxError; a local .cjs probe then resolved both
legacy imports. No test flake. Logs and temporary tools stay ignored under
tmp/overnight/FX1b*, with TEMP/TMP in tmp/fx1b-temp.

### Local commits

```text
37fcd16 fix(api): serve raster Commons thumbnails for external visuals
dfbf466 fix(mobile): save images through fresh owner reads and report failure stage
a10642b fix(mobile): show retry when an external image fails
```

The docs: close FX1 checkpoint contains this outcome; its hash is recorded
after commit in FX1b.status and Git history. All commits use author galaxymaxp
<omgraythekid@gmail.com>. No push. Starting unrelated untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ are preserved.

### Owner steps remaining

Rollout and Device checks: **NOT RUN, skipped entirely**. Owner runs the
preview-update preflight before separately authorized OTA to 2.2.0-sdk57,
publishes the API GIF exclusion and website error state, and rechecks all three
save kinds plus external inline/viewer loading on Realme. No native/dependency
change was needed; if a later native fix is needed, build a new APK with deliberate
versionCode 7 (preview autoIncrement remains false). Recheck iOS add-only saving.
FULLSEND desktop/390px browser, overflowing viewer and suitable instructional
Office-source checks remain pending. Actual deployed revisions, DB rows,
Scheduler, failed image/response and native cause remain UNVERIFIED (owner to
confirm). No further owner approval is needed for this completed local scope.
