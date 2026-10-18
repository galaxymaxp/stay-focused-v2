# FX1 image diagnosis — 2026-10-18

Status: **STOPPED during STEP 0; no application repair implemented.**

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
