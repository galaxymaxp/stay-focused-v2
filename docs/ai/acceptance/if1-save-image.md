# IF1 Save image diagnosis, repair and regression coverage - 2026-10-18

Status: **PASS for the finite unattended code scope**. IF1 / BACKLOG N10 only,
STEP 0-4, tests, gates, docs and local commits. Rollout and Device checks are
excluded by the unattended rules. No later roadmap slice is authorized here.
Implementation: `bcd9ad6 fix(mobile): encode save image cache filenames for Android`.
Closing docs commit: `docs: close IF1`; final hash is recorded in Git and
`tmp/overnight/IF1.status`. Both use author galaxymaxp
<omgraythekid@gmail.com>; no push.

## Finding

The fullsend failure is real, but its actual exception cannot be recovered from
the old catch. A loaded image and an online phone do not establish that another
HTTP download succeeds. The proven code risk is reuse of a 600-second signed
figure URL without refreshing it at Save. FX1b already fixes that risk and
reports the failing stage; OI1 preserves it in the shared downloader. Deeper
native inspection found a separate defect still present at the starting HEAD:
the cache filename was concatenated into a file URI without encoding. Ordinary
spaces, Unicode and punctuation can prevent Android's MIME lookup, causing the
initial-file album call to reject before creating an album. IF1 encodes only
the filename URI component, preserving its decoded name and the destination.
This supersedes the initial no-product-change diagnosis. The historical phone
exception and physical fix remain **UNVERIFIED (owner to confirm)**.

The release record identifies application commit `dc162de`, while the prompt
calls the tested main baseline `0d7bfed`. `0d7bfed` contains that release code;
its Save implementation has the recorded old message and no refresh callback.
The five Save/caller/filename paths have no diff between dc162de and 0d7bfed;
dc162de is an ancestor of 0d7bfed.
Neither revision contains FX1b. This distinction does not establish the phone's
actual installed JavaScript/native module state.

## STEP 0 and comparison notes

- Starting branch `overnight/2026-10-15_feedback`, HEAD `2b6cad3`; stay on it.
  First five commits: `2b6cad3`, `efd2883`, `2afa3bb`, `5865036`, `7ef8fa5`.
- `git merge-base --is-ancestor <revision> HEAD` returned 0 for `0d7bfed`,
  `dfbf466f` and `c78e4b54`. Expected legacy save path is still present.
- Inspected `git diff main..HEAD` for all four named paths and all three
  callers. The local `main` ref is stale at `d00a543` and predates Save; its
  diff consequently shows Save and the downloader as additions. No ref was
  fetched or moved. Also compared **`0d7bfed..HEAD`** for the meaningful release
  delta. Remote-ref freshness is **UNVERIFIED (owner to confirm)**.
- `saveImage.ts`: release downloads `image.uri` directly and swallows every
  error; HEAD delegates validation to `downloadStudyImage`, obtains a fresh
  owner URI after permission, validates finite positive size, and returns/logs
  safe stages. Awaited native write, cache isolation, album/destination and
  success copy are preserved.
- `SaveImageButton.tsx`: HEAD accepts and forwards `refreshUri`; it continues
  to display the result message, guard concurrent/offline saves and provide
  Open settings on denial.
- `galleryImage.ts`: unchanged in both comparisons. This is the OCR input
  picker, not the reviewer gallery output path.
- `studyImageFile.ts`: added by OI1 (`c78e4b54`), extracting FX1b's validated
  download and exact figure/snapshot refresh helpers for reuse by offline
  Library images. Gallery MIME remains optional; offline retention requires it.
- `SourceFigures.tsx:98` and `SourcePageSnapshot.tsx:134`: pass exact-ID refresh
  callbacks now; release lines 95/129 supplied only the currently displayed URL.
  OI1 may display private local files, but online source Save still uses fresh
  owner evidence. `ExternalVisual.tsx:54` retains headers/source title/credit and
  needs no signed-URL refresh for its validated public Commons URL (or local
  retained file). Its existing Retry/Commons behavior is from FX1b.
- Read the FX1/FX1b handoff sections, `b30beae8`, FX1 diagnosis, ADR-038,
  ADR-041 and ADR-043. FX1's original-thumbnail hypothesis was already rejected;
  IF1 does not resurrect it or infer the failed image's format.

## Candidate-cause matrix

Release evidence below means the file at **`0d7bfed`**; HEAD evidence means
the starting `2b6cad3`, except where explicitly marked IF1. Installed Expo source
is **expo-media-library 57.0.5**. Tests mock
native modules and image bytes; they do not emulate Android's MediaStore.

| Candidate | Evidence and verdict | Fixed on HEAD by | Test evidence |
| --- | --- | --- | --- |
| Expired signed source URL, despite a loaded preview | Release `SourceFigures.tsx:95` supplies `figure.url`; `source-figures/sections.ts:104-106` signs for 600 seconds; `saveImage.ts:28` reuses it without a new owner read. Code risk confirmed; the actual failed URL/status is unknown. Snapshot release caller `SourcePageSnapshot.tsx:129` has the same Save limitation. | FX1b `dfbf466f` adds proactive refresh after permission; OI1 `c78e4b54` retains it in `studyImageFile.ts:16,32-43`, matching figure ID or snapshot ID/page/labelKind and refusing stale fallback. | New stale-URL 403 then deliberate Save retry with `refreshUri` succeeds; existing test proves proactive refresh occurs after permission and before any byte download, with no bearer header on storage. Existing caller tests reject changed figure/snapshot identity. There is no automatic retry loop. |
| Unsupported URI scheme (`invalid_image`) | Release `saveImage.ts:27-36` accepts only HTTPS/file. Release `sourceFigures.ts:19` and `sourcePageSnapshots.ts:24` already require HTTPS, so this is ruled out for a validated source-figure caller; not established for historical device data. | Not a new fix: unsupported input is still refused. HEAD `studyImageFile.ts:18-25` returns safe `download` instead of hiding the failure. | New data/content/http URI cases return download stage, no copy/download/native write, cleanup once. |
| Non-2xx response, network rejection, non-image content or empty bytes | Release `saveImage.ts:28-31,37-38` already refuses these, but its catch at 49-50 loses all evidence. Visibility of cached pixels cannot establish response status or MIME for a subsequent request. | FX1b/OI1 keep refusal and add `download_http_N`, `download`, `not_image`, `empty`. `studyImageFile.ts:20-27` validates status before MIME and finite positive bytes before insertion. No claim that arbitrary provider/network failure is repaired. | New 302/404/429/503 and mixed-case HTML/JSON/octet-stream cases; existing 401/403/500, transport rejection, missing/zero/invalid-size cases. All refuse gallery publication and clean cache. |
| Android permission/native album failure; alleged `copyAsset=false` move issue on API 30 | Release `saveImage.ts:15,45` is the same permission/album call as HEAD. Expo `src/legacy/MediaLibrary.ts:779,783-815` says copyAsset is ignored without asset; `MediaLibraryModule.kt:155-170` selects the initial-file branch, not asset move. It checks write permission (`:357-364,393-400`), and on API 30 requests declared WRITE_EXTERNAL_STORAGE (`:309-320`); writeOnly omits READ_EXTERNAL_STORAGE. `albums/CreateAlbum.kt:49-68` creates the directory, inserts the cache file then returns album metadata. `assets/CreateAsset.kt:59-125,146-147` uses ContentResolver/MediaStore for API 30+, not the asset move strategy. Thus changing false to true is not a supported repair. Actual manifest grant/OEM/MediaStore failure remains unknown. | No native path change warranted. FX1b reports native rejection as `media_write`, with plain gallery failure notice. The native path still performs internal queries; JS unit tests do not prove those queries succeed on Realme. | Existing and new Android tests assert exact album arguments, write-only photo permission, no standalone asset or album lookup, and awaited native write before cleanup. New simulated storage exception on local input returns media_write and deletes only its private temporary copy. |
| Filename extension/MIME mismatch | Release `saveImage.ts:30-33` already renames according to response MIME; shared `image-download.ts:12-17` prefers known image MIME over URL suffix, strips query/fragment and defaults to png. Not a demonstrated PNG/JPEG mismatch defect. Expo `MediaLibraryUtils.kt:190-196` derives local-file MIME from extension; missing/unsupported/misreported MIME can still matter, but no such failed response is available. | Existing MIME naming retained at IF1 `saveImage.ts:53-57`. Gallery accepts absent MIME, as on release; IF1 does not add byte sniffing, conversion or broaden accepted formats based on speculation. | Existing opaque-URL JPEG test plus new misleading PNG suffix/JPEG MIME test proves rename before album insertion. Rename failure returns download and never inserts media. |
| Unescaped filename in cache URI prevents Android MIME detection | Release `saveImage.ts:26,33` and starting HEAD `saveImage.ts:50,52` concatenate the readable filename directly; shared `image-download.ts:17-18` retains spaces, Unicode, `#`, `%` and punctuation. Expo `MediaLibraryUtils.kt:190-196` passes the URI string to Android `MimeTypeMap.getFileExtensionFromUrl`, whose filename contract rejects characters outside `[a-zA-Z_0-9.\-()%]` and removes query/fragment text first. `albums/CreateAlbum.kt:50-52` throws on missing MIME before creating the album at line 58. This is a code-proven remaining failure path, consistent with no album; the actual phone filename is unknown. | IF1 `saveImage.ts:50-57` percent-encodes only the filename, including punctuation left literal by encodeURIComponent, for both download and MIME rename destinations. Native `assetUri.path` / `mUri.lastPathSegment` decode the file path and gallery display name (`CreateAlbum.kt:53-59`, `CreateAsset.kt:62,68,107`; FileSystem `legacy/FileSystemLegacyModule.kt:1077-1079`). Success copy, permissions, original image and album remain intact. | Six native-contract cases for spaces, Unicode, hash, apostrophe/ampersand, encodeURIComponent-literal punctuation and percent: pre-fix 43 passed / 6 failed; final focused suite 99/99. Tests assert decoded readable filename and identical download/album URI, with cleanup once. These contract mocks do not execute Android. |
| Missing module, permission exception or cache/native failure hidden by the catch | Release `saveImage.ts:14,20,49-50` hides import/cache/permission/write exceptions behind the same notice. Denied permission itself had a distinct notice, so a simple denial alone does not match recorded row 4b. Native contents of the tested APK are unknown. | FX1b differentiates module_missing, permission, download and media_write, logging only the stage. OI1 preserves this. | Existing module-import suite covers both missing imports; stage tests cover ERR_UNAVAILABLE and permission errors. New notice tests prove plain-language download/gallery/update/permission messages reach Alert and Save becomes available again. |

Mobile components in the table are under `apps/mobile/src/features/reviewer/`,
mobile services under `apps/mobile/src/services/`; shared paths
are under `packages/shared/src/`; server paths are under `apps/api/src/lib/`.
Expo paths are under `node_modules/expo-media-library/`. No private URLs, raw
provider/native errors or academic fixtures are persisted in this report.
The filename contract was also checked directly in the installed Android SDK
source, `sources/android-37.0/android/webkit/MimeTypeMap.java:48-77` (under the
local SDK): it strips fragment/query text, checks the restricted filename
pattern, then extracts the extension. This is source evidence, not execution
on the Realme's Android version or OEM implementation.

## Acceptance and verification

- Requirements: grounded diagnosis; each requested candidate evaluated; no
  speculative native/design change; proven filename URI repair only; unchanged success copy/destination;
  existing safe failure notice verified; regressions added. No ADR needed.
- New tests cover the supported success/failure contract; 403 retry is a second
  deliberate Save action. Production already refreshes before downloading, so
  it need not first incur a stale-URL 403.
- Focused final development check: **FRESH PASS 99/99 tests, 5 files**:
  `npm test --workspace @stay-focused/mobile -- src/features/reviewer/saveImage.test.ts src/features/reviewer/saveImage.modules.test.ts src/features/reviewer/SaveImageButton.test.ts src/features/reviewer/SourceFigures.test.ts src/features/reviewer/SourcePageSnapshot.test.ts`.
  Earlier focused runs passed 89/89 then 93/93 before the six filename cases.
- Prompt gates against the resumed final implementation:

  | Command | Result |
  | --- | --- |
  | `npm run typecheck -- --force` | **FRESH PASS**, 8/8 tasks, 0 cached |
  | `npm run lint -- --force` | **FRESH PASS**, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings (5 mobile import/first, 1 web unused useMemo) |
  | `npm test --workspace @stay-focused/mobile` | **FRESH PASS**, 1434/1434 tests, 143/143 files |
  | `npm run build --workspace @stay-focused/api` | **FRESH PASS**, 1/1 build, 35/35 static pages |
  | `npm run build --workspace @stay-focused/mobile -- --platform android` | **FRESH PASS**, 1/1 local export, 1 Android bundle |
  | `git diff --check` | **FRESH PASS**, 0 whitespace errors; staged check also PASS |

  **6/6 prompt gate commands PASS.** Additional AUTOPILOT
  `npm run build -- --force --env-mode=loose`: **FRESH PASS, 8/8 tasks, 0 cached**,
  including API, web and Android/iOS/web mobile exports. Loose mode preserves
  process-local offline/telemetry flags and the Node outbound-connection guard.
  Gates ran against implementation now committed as `bcd9ad6`; only docs and
  build-generated ambient declarations changed afterward. Those declarations
  were inspected and restored; no generated output is committed. Logs remain ignored
  under `tmp/overnight/IF1-*-resumed*.log`. Builds/tests use a local Node preload
  that rejects outbound connections; builds also disable telemetry and use Expo
  offline/no-dotenv flags process-locally. No environment file is edited.
- Failure history: pre-fix filename contract **43 passed / 6 failed**, then
  **98 passed / 1 failed** because an existing Wikimedia test still expected a
  literal space in the URI; corrected to expect its encoded form, then 99/99.
  Earlier full mobile **1428/1428** predates the filename repair and is superseded.
  Earlier pre-fix gate logs are superseded by the resumed final gates; the
  interrupted typecheck-final log had no completion summary.
  On resume, first typecheck/lint/mobile-test launches failed before running
  their suites because Windows backslashes in NODE_OPTIONS were consumed by
  Node's preload parser (MODULE_NOT_FOUND). Retained those logs; forward-slash
  preload paths fixed the invocation, with no validation or network guard removed.
  No nondeterministic flake observed. Initial read-only evidence probes included
  invalid Windows glob paths, a nonexistent guessed source file, and a wrong
  skill-version path; actual paths were found/read. No gate was run on those
  guesses and no product change resulted.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** next fullsend RB6/N9 publishes the
  reviewed branch via a new APK or an owner-approved OTA after its existing
  preflight. IF1 adds no native dependency or runtime change.
- **Device checks - NOT RUN, skipped entirely:** on Realme save a freshly
  opened source figure and an external reference; confirm the **Stay Focused**
  album appears and the original image remains intact. If failure persists,
  capture the safe failure stage, Android API level and permission/native
  evidence without private URLs/content. Source-page Save is also an owner
  regression check.
- Actual device cause, shipped/deployed revisions, native module resolution,
  database rows, Scheduler state and remote-ref freshness are **UNVERIFIED
  (owner to confirm)**. No remote service call, deployment, remote SQL,
  migration, Scheduler operation, email, environment-file edit or push is
  permitted in IF1. No phone access is attempted.
