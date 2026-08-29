# Reviewer physical-device capstone rehearsal

Date: 2026-08-29, Asia/Manila (initial rehearsal began 2026-08-28 UTC; R8
selective-flow acceptance completed 2026-08-29).

## Verdict

`READY FOR PHYSICAL CAPSTONE REVIEWER DEMO`

The R8 replacement Android build closes the earlier Canvas structured-block
gap. The intended synchronized source -> ordered subset -> server selective
preview -> durable generation -> Processing recovery -> save/Library reopen
journey passed on the intended phone. Notification registration/delivery and a
readable camera OCR fixture remain disclosed limitations, but persisted
Processing and relaunch recovery passed independently. The earlier conditional
rehearsal is retained below as history and is superseded by the R8 acceptance
addendum at the end of this report.

## Device

- Manufacturer/model: realme RMX3151.
- Android version: Android 13 (API 33).
- Connection: USB with authorized ADB; full serial intentionally omitted.
- App: Stay Focused V2 2.0.0, build 1.
- EAS build: `3e807d36-c9af-4a5b-8680-36be10bcbfd2`.
- APK commit: `6751c4d6935e10d46c6012fa60d6794bb168b12f`.
- Install: exact verified APK installed with `adb install -r`; application data
  and the authenticated session were preserved.

## Runtime

- Production API: `https://stay-focused-v2-prototype.vercel.app`.
- API code commit: `6751c4d`.
- Supabase project reference: `xfdbwfqtorelmurncyql`.
- Production health: PASS (`2.0.0`).
- Canvas credential storage: PASS after the production
  `CANVAS_TOKEN_ENCRYPTION_KEY` was corrected and the existing commit was
  redeployed. No repository or API code change was involved.
- Durable worker: PASS. Reviewer and extraction jobs reached terminal success,
  persisted results, and were reconciled by the app after navigation/relaunch.

## Primary Canvas flow

Fixture identification is intentionally limited to non-sensitive information.

| Step | Result | Evidence |
| --- | --- | --- |
| Authentication/session restore | PASS | Session survived APK replacement and repeated force-stop/relaunch; protected API calls succeeded without an auth loop or RLS error. |
| Course load | PASS | A synchronized IT Security course opened on the phone. |
| Source inventory | PASS | Three persisted Announcement sources appeared without a live Canvas dependency during generation. |
| Source | PASS | `Final Exam Coverage and Schedule`, Announcement, 280-character resolved study text. |
| Structured block selection | FAIL | The physical flow exposed source selection followed directly by editable resolved text; no structured-block list or reorder/selection control appeared. |
| Selected block count | 0 | Study Library provenance reported zero selected blocks. |
| Selective preview | PARTIAL | Persisted synchronized text resolved correctly and remained editable, but the preview represented the complete selected announcement rather than chosen structured blocks. |
| Durable generation | PASS | Job `b0ce7b62-5105-4998-b22b-e92cdb07d839` completed with a persisted three-section result. |
| Reader | PASS | Three nonblank ordered sections rendered; source faithfulness, coverage, and clean-output checks all reported Passed. |

The generated reviewer used the accepted Canvas snapshot and did not regenerate
when reopened. Terminology and the compact source content were preserved; no
obvious unsupported outside knowledge was observed.

## Processing and recovery

- Primary reviewer job: `b0ce7b62-5105-4998-b22b-e92cdb07d839`.
- Created: 2026-08-28 17:58:00 UTC.
- Completed: 2026-08-28 17:58:25 UTC.
- Result: succeeded, 3/3 sections, result persisted.
- UI stages observed across the rehearsal: request acceptance, `Creating
  reviewer sections` with real unit counts, result storage/completion, and
  `Complete` in global Processing.
- Navigation survival: PASS. Processing showed backend history independently
  of the original Canvas screen.
- Relaunch recovery: PASS. After force-stop and relaunch, the completed job was
  present in the long Processing history and `Open result` restored the reader.
- Additional relaunch fixture: job
  `fa235e54-d2c1-49a2-a0be-53742b3ef133` completed 13/13 sections and also
  reopened from Processing after relaunch.
- The initial apparent absence was a scroll-position issue: several older
  failed jobs preceded the `Recently completed` group. UI-tree inspection
  confirmed the current job cards and their real IDs below that group.

## Notifications

- Android `POST_NOTIFICATIONS`: PASS; granted through the Android 13 runtime
  permission dialog.
- Device registration: FAIL. Tapping Enable left the notification controls
  disabled for more than 35 seconds with no message change, and production
  received no `/api/notification-devices` request.
- Root cause in the current client: `enableCompletionNotifications` awaits
  `Notifications.getExpoPushTokenAsync` without a deadline or exception
  boundary. `ProcessingScreen` therefore cannot clear `notificationBusy` when
  the native/Expo token request does not settle.
- OS delivery: NOT VERIFIED.
- Notification deep-link routing: NOT VERIFIED.
- App-level persisted recovery: PASS and independent of notification delivery.

## Save and Study Library

- Save title: `Capstone Physical Reviewer Test`.
- Save: PASS.
- Study Library list: PASS; the saved Canvas reviewer appeared with three
  sections.
- Reopen: PASS without regeneration.
- Section order/content preservation: PASS.
- Source health: actual state was `0 current, 0 changed, 1 unavailable`; the
  concluded Announcement source was unavailable for rebuild, while the saved
  immutable snapshot remained readable. This was not mislabeled as
  `ready_current`.

## Physical intake

| Intake | Picker/capture | Extraction/OCR | Editable text | Generation handoff | Result |
| --- | --- | --- | --- | --- | --- |
| Camera | PASS | NOT VERIFIED | NOT VERIFIED | NOT VERIFIED | Android permission and rear-camera capture/acceptance passed, producing a 1.2 MiB JPEG. The phone was pointed at a dark surface rather than a readable page, so OCR was intentionally not claimed. |
| Gallery | PASS | PASS | PASS | PASS | Android photo picker returned a 230 KiB PNG; durable one-page OCR succeeded, restored 402 characters, allowed an edit cycle, and enabled Generate. |
| PDF | PASS | PASS | PASS | PASS | Files returned the known native-text `3. VPNs.pdf` fixture (15 pages, 182 KiB); durable extraction succeeded for 15/15 pages, restored 2,898 editable characters, and enabled Generate. |

The PDF fixture was checked locally before selection: it is a 15-page PDF with
extractable native text. The 41-100-page physical PDF matrix was not repeated.

## Offline behavior

- Wi-Fi and mobile data were disabled before reviewer submission.
- The app displayed `Waiting for connection` and explicitly said the request
  was saved locally and was not yet a server job.
- Connectivity was restored and verified before reconciliation.
- Processing submitted the queued intent with its existing idempotency key as
  reviewer job `296230d4-cfe2-45a3-8814-8d7dc324191c`.
- Real progress appeared as `Creating reviewer sections`, including 2/4 units.
- The backend completed the job at 4/4 with a persisted result.
- After force-stop/relaunch, Processing recovered the completed job and `Open
  result` restored the four-section reviewer.
- Verdict: PASS for understandable pre-acceptance behavior, accepted-job
  persistence, and recovery after reconnect.

## Defects and gaps

### Canvas URL normalization

- Severity: Low.
- Reproduction: entering the school Canvas hostname without `https://` is
  rejected; the explicitly prefixed HTTPS URL connects.
- Root cause: the mobile connection request trims but does not normalize a
  scheme-less hostname before the API validates an absolute HTTPS URL.
- Fix in this task: none; recorded for a focused follow-up as requested while
  the acceptance pass continued.
- Physical recheck: HTTPS-prefixed URL PASS.

### Missing physical structured-block controls

- Severity: High for the specified demo script; reviewer generation itself is
  unaffected.
- Reproduction: Source selection proceeds directly to the resolved editable
  source text and Generate. No structured-block selection/order screen is
  exposed for the synchronized Announcement.
- Root cause: the current mobile Canvas reviewer screen models one selected
  source ID and its resolved full text; it does not render the block-selection
  experience proven by the API acceptance harness.
- Fix in this task: none. Adding that interaction is beyond a defect-only
  physical rehearsal and would require a replacement Android build.
- Physical recheck: gap reproduced; full-source Canvas generation PASS.

### Notification registration can remain busy indefinitely

- Severity: Medium.
- Reproduction: grant Android notification permission, tap Enable, and observe
  disabled controls with no success/error while no registration request reaches
  production.
- Root cause: the Expo push-token await has no timeout/catch boundary and the UI
  only clears its busy state after that promise returns.
- Fix in this task: none; notification delivery is separate from the already
  proven durable recovery path and a mobile fix would require a new APK.
- Physical recheck: permission PASS; registration/delivery/routing FAIL/NOT
  VERIFIED.

## Repository and verification

- Starting branch/HEAD: `main` at
  `6751c4d6935e10d46c6012fa60d6794bb168b12f`.
- Starting tree: clean; 54 ahead and 0 behind `origin/main`.
- Starting `git fsck --full`: PASS.
- Product code changed: no.
- EAS rebuild: no; the exact requested artifact was used.
- API code redeploy by Codex: no. The user corrected a production encryption
  environment value and redeployed the same commit.
- Automated suites: intentionally not rerun because no product code changed and
  the installed APK/API correspond to the already verified commit.
- Physical evidence added by this report does not overwrite the deterministic
  suite baseline documented in current state.

## Remaining limitations

- Reviewer core: no new grounding, coverage, persistence, or save/reopen
  regression observed.
- Device/deployment: readable-page camera OCR and notification delivery/routing
  remain unverified; Expo token registration currently stalls; the 41-100-page
  physical PDF matrix was not repeated.
- UI-only: Canvas school hosts require an explicit HTTPS scheme; Processing
  history is long and does not automatically anchor to the newest completed
  group; the Canvas mobile flow lacks structured-block controls.
- Unrelated/upstream: the concluded Announcement was unavailable for a live
  source-health rebuild, although its immutable saved snapshot remained usable.

## Shortest reliable demo script

Primary passing path:

1. Open Courses and the prepared IT Security course.
2. Choose the compact Announcement source.
3. Check the resolved editable source text and create the reviewer.
4. Leave the source screen, open global Processing, and show the real job.
5. Open the completed result, save as `Capstone Physical Reviewer Test`, then
   reopen it from Study Library.

Fallback path:

1. Open Reviewer -> Import PDF.
2. Select `3. VPNs.pdf`, extract its native text, and show the editable result.
3. Generate, leave the screen, and recover the job/result through Processing.

## R8 selective-flow acceptance addendum (supersedes the conditional result)

### Replacement build and runtime

- Device: realme RMX3151, Android 13; authorized USB/ADB, serial omitted.
- App: Stay Focused V2 2.0.0, build 1.
- Implementation commit: `69ea697ee916adb0e928171b4d0afdc792b92da0`.
- EAS build: `ab67feeb-0f61-4d6c-b24c-a7c5658ac050`, internal preview,
  finished successfully.
- APK:
  `https://expo.dev/artifacts/eas/mQNg94iYrhw69KFfT0Y-X53vsDqvkT99Ir8kIZKgZvw.apk`.
- Downloaded APK SHA-256:
  `C226AB68DF39E9B87A0915803CEA8F3473C7C7990E6E03102ACA1DBF2904BFD5`.
- Install: `adb install -r` PASS; package reported version 2.0.0/build 1 and
  retained the authenticated session.
- API: unchanged production deployment at
  `https://stay-focused-v2-prototype.vercel.app`; no server code changed and no
  API redeploy was required.

### Structured-block selection

The prepared course and a compact persisted Announcement were reused. Private
course text is intentionally omitted.

| Check | Result | Evidence |
| --- | --- | --- |
| Source opens | PASS | The selected persisted Canvas source opened from the prepared course. |
| Structured blocks load | PASS | The server structure request returned nine selectable blocks and the screen showed `9 of 250 blocks selected by default`. |
| Block hierarchy | PASS FOR FIXTURE | Ordered paragraph rows, type labels, indentation space, and checkbox state were clear and unclipped. This compact fixture returned no heading block, so nested heading indentation was not physically exercised. |
| Select block | PASS | After Clear, an individual block selected and the count updated. |
| Deselect block | PASS | A selected block was removed, reducing the count from four to three. |
| Multiple selection | PASS | Four blocks were selected together before the final three-block subset. |
| Source order preserved | PASS | The first preview stored source ordinals 4/5/6/7 as preview ordinals 1/2/3/4; the updated preview stored source ordinals 5/6/7 as preview ordinals 1/2/3. |
| Zero-selection guard | PASS | Clear produced zero selected blocks, disabled Preview, and displayed the select-at-least-one-block guidance. |

Returning from Preview preserved the current structure and selection. Changing
the source remained a reset boundary. Preview and Generate actions were disabled
while in flight, preventing duplicate requests from taps or rerenders.

### Selective preview

| Check | Result | Evidence |
| --- | --- | --- |
| Server preview request | PASS | The app called the existing selective-preview endpoint with the structure session and exact source-ordered block IDs. |
| Preview renders | PASS | The first authoritative preview displayed four selected blocks; the final preview displayed three. |
| Correct selected content | PASS | The final preview manifest contains exactly the intended source block ordinals 5/6/7 and one source item. |
| Selection change refreshes preview | PASS | Returning, removing one block, and previewing again created a new server session rather than reusing the four-block result. |
| Preview metadata retained | PASS | Final session `b1e54bea-7485-4a1b-927c-5e68a94ea5a1`, resolution fingerprint, source item ID, three block manifests, hashes, and order persisted through job acceptance. |
| Stale preview behavior | AUTOMATED PASS; NOT PHYSICALLY INDUCED | Selection mutation invalidated the local preview and required a new request. Route/generation-gate tests cover expired, mismatched, and 409/new-preview responses; external source mutation or session expiry was not forced on the phone. |

Editable preview semantics remained enabled because the existing backend
contract supports them. No edit was made during the final run, and provenance
correctly records `wasEdited = false` with matching source/server-preview hashes.

### Durable generation, recovery, and save/reopen

| Check | Result | Evidence |
| --- | --- | --- |
| Durable job accepted | PASS | Job `1e8d146a-43d7-45cb-9259-cefbaad690ea` was accepted by the unchanged Vercel Workflow backend. |
| Processing recovery | PASS | The exact job appeared in global Processing; after force-stop/relaunch it remained available with `Open result`. |
| Real progress | PASS | The phone showed the accepted/waiting state and persisted 1/1 unit completion. |
| Completion | PASS | Backend status `succeeded`, created 02:53:53 UTC and completed 02:54:17 UTC. |
| Reviewer content matches selection | PASS | The job consumed the snapshot tied to the final three-block preview; coverage, grounding, and leakage statuses all passed, with coverage and grounding scores 1.00. |
| Unselected content excluded | PASS | The immutable generation snapshot contains only selected source block ordinals 5/6/7; the removed ordinal 4 and all other unselected blocks are absent. |
| Save | PASS | Saved with exact title `Capstone Selective Canvas Reviewer`. |
| Study Library reopen | PASS | The exact item reopened without regeneration and remained readable with one section after relaunch. |
| Snapshot preserved | PASS | The saved reviewer references snapshot `c6446ac2-18a9-4a16-aff5-febad28da396`. |

### Provenance

- Snapshot and final preview session match; snapshot creation was immediately
  before durable job acceptance on 2026-08-29 UTC.
- One Canvas Announcement item is recorded with its source identifier, item
  hash, resolution fingerprint, and selected-block manifest.
- The three selected blocks retain source order 5/6/7 and snapshot/preview
  order 1/2/3; all are paragraph blocks for this fixture.
- Block hashes are present. Parser version is
  `canvas-html-structured-blocks-v1`; normalization version is
  `canvas-selective-preview-v1`; OCR count is zero; relationship count is zero.
- Exact source hash matches the final server preview hash and `wasEdited` is
  false. The Study Library record points to the same immutable snapshot.

### R8 automated verification

- Mobile typecheck PASS after correcting a readonly-array/Set narrowing error
  found by the first post-change run; mobile tests 278/278 PASS.
- Canvas typecheck PASS; Canvas tests 72/72 PASS.
- Targeted structure route, selective-preview route, reviewer generation,
  freshness gate, and provenance API tests: 43/43 PASS.
- Forced root typecheck and lint: 7/7 packages, zero cached tasks. No warnings
  appeared and no new warning was introduced.
- `git diff --check` and `git fsck --full`: PASS.
- Local Expo web returned HTTP 200, but no in-app browser was connected for a
  browser rendering pass. The replacement APK was instead inspected on the
  required physical Android device. EAS emitted the pre-existing non-blocking
  Metro `watcher.unstable_workerThreads` validation warning.

### Current limitations

- Reviewer core: no new grounding, coverage, selective-snapshot, persistence,
  or save/reopen defect. Physical hierarchy used a paragraph-only fixture, and
  stale preview expiry/source mutation was covered automatically rather than
  induced on-device.
- Device/deployment: notification token registration, delivery, and routing
  remain unfixed/unverified; readable camera OCR and the 41-100-page physical
  PDF matrix were not repeated.
- UI-only: Canvas school hosts still require an explicit HTTPS scheme;
  Processing history does not automatically anchor to the newest result.
- Unrelated product limitations: source health was not refreshed during the R8
  Library reopen. The immutable saved snapshot was independently verified.

### Current shortest reliable demo script

1. Courses -> prepared course -> Canvas reviewer -> compact source.
2. Wait for structured blocks, Clear, then select a three-to-five-block subset.
3. Preview the server-resolved selection and tap Generate.
4. Leave the flow -> Processing -> show persisted progress/completion -> Open
   result.
5. Save as `Capstone Selective Canvas Reviewer` -> Study Library -> reopen.

Existing PDF fallback:

1. Reviewer -> Import PDF -> select `3. VPNs.pdf`.
2. Extract native text, inspect/edit the resolved text, and Generate.
3. Processing -> completed result -> save -> Study Library reopen.

R8 verdict: `READY FOR PHYSICAL CAPSTONE REVIEWER DEMO`.
