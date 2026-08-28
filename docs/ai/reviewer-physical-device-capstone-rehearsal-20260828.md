# Reviewer physical-device capstone rehearsal

Date: 2026-08-29, Asia/Manila (rehearsal began 2026-08-28 UTC).

## Verdict

`CONDITIONALLY READY FOR PHYSICAL CAPSTONE REVIEWER DEMO`

The production Android/Canvas reviewer path is operational on the intended
phone: authentication, synchronized Canvas source use, durable generation,
Processing reconciliation, relaunch recovery, reader rendering, save/Library
reopen, gallery OCR, native-text PDF extraction, and offline outbox recovery
all passed. The exact capstone script remains conditional because the physical
Canvas screen did not expose structured block selection, push registration
stalled after Android permission was granted, and a readable physical camera
fixture was not available for the OCR portion of the camera check.

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
