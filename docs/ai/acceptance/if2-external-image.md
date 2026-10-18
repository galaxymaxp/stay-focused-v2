# IF2 external reference image diagnosis (2026-10-18)

Finite scope: BACKLOG N11 / IF2 only, STEP 0 through code, tests, local gates,
documentation and local commits. Baseline `7a70262` on
`overnight/2026-10-15_feedback`. Rollout and Device checks are excluded by the
unattended instructions. No later backlog work is authorized by this slice.

## Diagnosis and STEP 0

The deterministic closing defect on main is already repaired on baseline HEAD.
The HTTP/decode cause of the recorded Realme image failure remains
**UNVERIFIED (owner to confirm)**. Main already selected bounded thumbnails,
including PNG raster thumbnails for SVG originals. `37fcd169` adds GIF filtering;
its subject does not mean original-to-thumbnail selection was missing on main.
IF2 repairs the remaining silent pending-card state in mobile and web.

All requested ancestor checks pass: `0d7bfed`, `a10642b2`, `37fcd169`.
The last five baseline commits are `7a70262`, `4517181`, `bcd9ad6`, `2b6cad3`,
`efd2883`. Tracked tree was clean; untracked `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` are unrelated and preserved. No branch switch or remote fetch.
The FX1/FX1b handoffs, current planning files and ADR-041/042/043 were read.

The full `0d7bfed..HEAD` diff was inspected for the six requested paths:

| Path | Difference from main at baseline |
| --- | --- |
| `apps/mobile/src/features/reviewer/ExternalVisual.tsx` | `failedImage`/attempt-keyed Retry and retained error UI replace both closing handlers; downloaded replacement preference, offline file rendering and `onVisualChanged` queue callback added. |
| `apps/mobile/src/services/externalVisuals.ts` | User-Agent uses configured app version instead of 2.1.0; contact and strict URL allowlist retained. |
| `apps/mobile/src/features/reviewer/ImageViewer.tsx` | No diff. Back, explicit Close and qualified downward drag retain their existing dismissal rules. |
| `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx` | Batch/local snapshot support, signed save refresh and source-image refresh; `ZoomablePage` still forwards the supplied error handler directly to native Image. Source-page-specific closing handlers do not handle external references. |
| `apps/api/src/lib/external-visuals/commons.ts` | GIF MIME/selected-URL exclusion only. Main already used bounded `thumburl` with SVG-to-PNG enforcement. |
| `apps/mobile/src/features/reviewer/ReviewerReader.tsx` | Shared batch/local image loader replaces viewport discovery; stable owner/artifact/version keys and image-cache queue added. Line 415 still renders ExternalVisual, which uses ImageViewer. |

No material rendering-path surprise or code-level contradiction requires STOP.
The prompt's original-URL possibility is a hypothesis to check, not established
evidence of what the phone received.

## Candidate causes and evidence

All lines below refer to the IF2 working implementation unless explicitly
qualified with `0d7bfed`. The source tree is the authority for exact contents.

| Cause | Evidence | Fixed on HEAD by / verdict | Test |
| --- | --- | --- | --- |
| Raw SVG, non-raster or oversized original selected | `0d7bfed:apps/api/src/lib/external-visuals/commons.ts:73` selects `thumburl`, line 75 uses thumbnail dimensions, line 79 requires PNG for SVG. Current lines 73-83 retain these guards; line 93 requests width 1200. | Already guarded on main. No new URL-selection change warranted. Bytes returned for the phone's actual request are UNVERIFIED. | `commons.test.ts`: explicit SVG original (12000 x 8000) yields PNG thumbnail (1200 x 800); existing raw SVG/oversize rejection. |
| Unsupported GIF decode | Main MIME allowlist included GIF; current `commons.ts:78` excludes GIF MIME and selected `.gif` paths. | `37fcd169`; possible main cause, not established phone cause. | Existing GIF MIME and inconsistent-metadata GIF-URL exclusion cases. |
| Wikimedia rejects missing/unacceptable headers | Main already sends identifying headers to card Image and ZoomablePage. Current `externalVisuals.ts:8` builds configured-version User-Agent; `ExternalVisual.tsx:41` and line 55 pass it. | Header presence predates main; FX1b refreshes version. HTTP rejection/rate limits remain runtime possibilities, not grounds to change headers. | Existing configured-version/contact and both-surface header assertions; safe failure copy/logging. |
| Allowlist rejects redirect host | `externalVisuals.ts:20` validates metadata URLs, line 29 only accepts upload image host. API `commons.ts:49` normalizes thumb to upload; search line 99 denies redirects. Native image redirects do not pass through the DTO parser. | Existing guards retained. Invalid metadata omits a whole card rather than rendering a present blank card. Actual image redirect chain UNVERIFIED. | New normalized raster URL acceptance / thumb, Commons-image and file-URL rejection; existing API normalization case. |
| Empty/wrong-MIME cached file | Main `ExternalVisual.tsx:29` hides images offline and has no local replacement path. HEAD `studyImageFile.ts:19` validates HTTP/MIME/nonempty files; `localLibrary/offlineImages.ts:160` requires MIME, lines 181-186 move validated bytes before stored publication; lines 108-110 reconcile missing/empty files. | OI1 path is newer than APK. Corruption after validation is possible, not proven; image errors still use retained UI. No new cache policy. | Existing offline validation suite plus new local-file decode error retaining viewer. |
| Error clears open state / unmounts viewer | `0d7bfed:ExternalVisual.tsx:36` card and line 46 viewer call `setOpen(false)`. Current lines 22-24 only set failed attempt; lines 51-55 keep viewer and display ExternalImageError. `ZoomablePage` line 178 forwards that handler. | `a10642b2` fixes both surfaces. Main reproduction fails exactly because ImageViewer unmounts. Errors do not clear result on HEAD; owner/token/source/offline transitions and Ask still intentionally close. | Both card/viewer error tests retain the same native Modal and no onClose call, Retry remount/key tests, viewer Retry resets zoom. |
| Pending request leaves silent blank card | Baseline mobile card only renders Image with onError; baseline web external card likewise has no load feedback. | IF2 adds attempt-keyed native loading indicator / web muted loading status, cleared on successful load and restored for Retry or changed URL. Existing error UI replaces pending UI on failure. | New loading/decode/changed-URL tests on both surfaces; counterfactual probes fail against baseline implementation. |

Reader client is memoized by access token (`ReviewerReader.tsx:123`), and the
ExternalVisual key uses owner/artifact/version (line 415). Ordinary image load
state changes do not replace the reader identity. `ImageViewer.tsx:55,61`
contains gesture/back closing only; no image-error callback. The external path
does not use SourcePageSnapshot's separate failure-to-null snapshot state.
The current combined batch path also enforces the upload image host in
`packages/shared/src/reviewer-images.ts:56`; line 80 omits only malformed
external metadata. The legacy service parser is not the only host boundary.
The GIF exclusion applies to newly selected candidates: existing found rows
are returned from cache (`external-visuals/service.ts:58`) with their stored
image URL (line 21). IF2 does not claim a data rewrite or guarantee that every
historical stored URL decodes. No actual problematic stored row was inspected;
the retained error UI covers that possibility without changing sourcing rules.
Web's existing error handler (`section-visual.tsx:28,128`) retains the dialog;
IF2 changes only its matching pending-card gap.

## Acceptance matrix

| Requirement | Owning layer | Local proof |
| --- | --- | --- |
| No silent pending external card | Mobile/web components | Visible pending state, decode completion, changed URL and retry regressions. |
| Card onError offers Retry and Commons | Mobile component | Failure before opening replaces Image with existing error controls. |
| Viewer error stays mounted | ExternalVisual + native Modal | Same Modal instance remains visible; onClose spy untouched on card/viewer/local-file error. |
| Retry starts fresh attempt | Mobile/web components | New image key and native image instance; viewer's own Retry resets zoom to one. |
| SVG original yields raster thumbnail | API Commons selector | Injected provider response with SVG original; PNG thumbnail returned without requesting original bytes. |
| Preserve sourcing, allowlist, attribution | API/service/component boundaries | No runtime changes at API/service layer; existing and added strict boundary tests. |

No architecture or external visual design change; ADR not required. Native
ActivityIndicator uses the existing accent token; web uses the existing muted
class. Loading state derives from the existing URI/Retry key without effects,
timers, provider requests, dependencies or new image-selection behavior.

## Verification

**PASS for the finite unattended code scope.** Implementation:
`5b7c41e fix(reviewer): show loading for external reference images`.
All **8/8 expanded prompt gate commands are FRESH PASS**, plus the required
forced root build (8/8 tasks, 0 cached). The suites total **4099 passed /
3 existing live skips**, across 391 passing files. No final gate failed.
Checks ran serially against the code committed as `5b7c41e`; documentation
closure is the separate `docs: close IF2` commit recorded in Git and the status
file. Author: `galaxymaxp <omgraythekid@gmail.com>`; no push.

| Command | Fresh result |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, 0 cached. |
| `npm run lint -- --force` | PASS, 8/8 tasks, 0 cached; 0 errors, 6 pre-existing warnings. |
| `npm test --workspace @stay-focused/mobile` | PASS, 1439/1439 tests, 143 files. |
| `npm test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2351 passed, 3 existing live skips, 204 files. |
| `npm test --workspace @stay-focused/web` | PASS, 309/309 tests, 44 files. |
| `npm run build --workspace @stay-focused/api` | PASS, Next production build; 35/35 static pages. |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, one Android bundle, 4266 modules. |
| `git diff --check` | PASS; staged diff hygiene also PASS before each commit. |
| Additional `npm run build -- --force` (AUTOPILOT) | PASS, 8/8 tasks, 0 cached; includes API, web and Expo exports. |

Focused FRESH checks before full gates: mobile external component/service
**37/37**, web SectionVisual **7/7**, API Commons **24/24**. External network
sockets are blocked process-locally, live flags are zero, telemetry is disabled,
and Expo export runs offline. All provider responses in these tests are mocks.
Turbo build uses process-local `TURBO_ENV_MODE=loose` to preserve the socket
guard and offline/telemetry flags in its children; no repository config changes.
Root typecheck/lint ran in strict mode and execute only local compilers/linters.

Counterfactual regression proof (temporary substitutions restored byte-for-byte):
baseline pending-state implementation gives mobile **2 failed / 18 skipped**
and web **1 failed / 6 skipped** as expected; main viewer gives **2 failed /
18 skipped**, specifically because ImageViewer disappears after onError.
These are deliberate red checks, not final gate failures.

First-attempt tooling evidence: Windows backslashes in the preload path caused
MODULE_NOT_FOUND before tests ran; forward-slash path fixed it. The Python
launcher is unavailable, so the local counterfactual harness uses Node. The
first counterfactual viewer probe hit a single-child key assumption before
onError; Children.toArray fixes the harness, and the rerun reaches the actual
Modal-unmount assertion. No nondeterministic flake established.
Existing Vite configuration and Expo color-environment warnings remain.
Next-generated `next-env.d.ts` changes were restored after builds; validation
logs, harnesses and exports are excluded from commits. Standalone shared and
workflow/provider suites are NOT APPLICABLE to these unchanged boundaries.

## Owner steps remaining

**Rollout and Device checks: NOT RUN, skipped entirely.** Include the reviewed
JS/TS changes in the next BACKLOG RB6/N9 fullsend (new APK or owner-authorized
OTA), with the existing FX1b API GIF rule/web changes as applicable. On Realme
topic 2, verify the image loads or shows Retry, loading is visible while pending,
and an error retains the viewer with Retry and Open on Commons. Recheck the
long overflowing viewer for fullsend row 2b. Do not treat local tests as device
acceptance or rewrite rows 2b/3's original results.

The actual failed image URL/HTTP status/decoded bytes, installed APK contents,
production revisions, database rows and Scheduler state remain **UNVERIFIED
(owner to confirm)**. No deployment, remote provider/service call, remote SQL,
migration, Scheduler action, email, environment-file edit or Git push is part
of this run.
