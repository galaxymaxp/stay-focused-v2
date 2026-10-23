# PBR-RDP: owner-present Realme read-only diagnostic runbook

2026-10-23. **Preparation only. Physical diagnostic NOT RUN.** The owner
authorized a separate bounded Realme diagnostic after PBR-EV1's screenshot
contradiction; this bridge offers documentation preparation only, with no
device-execution action. No phone, emulator, ADB, screenshot, hierarchy or
native log was accessed in this run. This document is a future checklist, not
evidence that any device step occurred.

PBR-RT1 remains **STOPPED**. PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain **HELD**,
unqueued/unstarted. PBR-EV1 remains STOPPED and native text unresolved;
**beta readiness BLOCKED**. Preparation does not reopen those tasks.

## Preparation baseline and acceptance contract

Read the complete `tmp/overnight/prompts/PBR-RDP.md`, including its overriding
UNATTENDED header, root AGENTS/AUTOPILOT, current planning/handoff, PBR-RT1,
PBR-AF1 and PBR-EV1 acceptance, and ADR-001/011. Initial HEAD
`d728939fa2c45a3d84b6dc42bc15843259d0450f`, expected branch
`overnight/2026-10-15_feedback`; tracked/index clean. Local upstream snapshot
13 ahead / 23 behind `github/main`, no fetch. Preserve unrelated untracked
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and all ignored evidence.
No new source contradiction found; EV1's archived ordering contradiction is
known and remains unresolved. No remote state inspected.

| Requirement | Evidence for preparation acceptance |
| --- | --- |
| Read-only, bounded, owner-present procedure | Identity preflight, numbered sequence, fixed limits and immediate stop rules below |
| Independent physical/capture/tree evidence | Separate timestamped fields; no tree-to-pixel or filename-to-chronology inference |
| Provenance and historical identity | Full historical OTA identities distinguished; originals immutable, hashed manifest and derivative mapping |
| Privacy and feature preservation | Public/empty surfaces only; no private capture, settings, submission, native/source or service change |
| Held scope and honest execution status | All four dependents HELD, RT1/EV1 STOPPED; physical diagnostic and rollout NOT RUN |
| Verification and scoped closure | Exact fresh local results, planning reconciliation, appended handoff and local documentation commits |

## Source facts that constrain the checklist

- `apps/mobile/src/features/redesign/DayOrb.tsx` runs when live and foreground,
  suspends work otherwise, and already rebuilds a replacement GL context with
  a fresh first-frame reveal gate. Do not add another speculative repair.
- `apps/mobile/src/app-shell/AppLifecycle.tsx` can check release metadata and
  reconcile owner work on foreground, with periodic outbox reconciliation.
  Merely resuming an online app is not guaranteed to be free of service calls.
  This preparation did not mount or execute it.
- `/generation` delegates to `GenerationScreen.tsx`. `start=1`, saved intent/job
  parameters, retry/start/cancel actions, queue polling and persisted output
  recovery can cause work or expose private content. Use only the existing
  parameter-free public/empty Generation surface, never submit or open Queue.
- `/appearance` delegates to `src/features/settings/SettingsScreen.tsx`.
  Light/Dark/Automatic and palette selections write preferences; Reduced Motion
  follows the device. Observe the existing values only; do not toggle anything.
  The page also contains account/storage/notification controls: do not capture
  the full settings page or operate those controls.
- `src/features/settings/AppUpdateAbout.tsx` displays version/code and an update
  prefix. `src/services/useAppUpdate.ts` uses Expo configuration for version/code,
  `Updates.runtimeVersion`, and only the first eight characters of update ID,
  or `built-in`. About alone does not authenticate the native package version,
  full OTA ID, channel, APK hash or runtime. Do not tap Check for updates,
  download, share or external links to obtain them.
- `DayRingClock.tsx` treats native accessible clock fallback, GL glass clock,
  SVG labels and ordinary page Text separately. A hidden native clock fallback
  after successful glass presentation is intentional, not by itself lost text.
  JS tests or UI-tree presence do not establish Android pixels or a cause.

## Historical evidence: preserve the contradiction

Use [PBR-EV1](pbr-ev1-fs7-evidence-recovery.md) for full archive roots, exact
file hashes and command provenance, [PBR-RT1](pbr-rt1-android-resume-text.md)
for the native attribution stop, and [PBR-AF1](pbr-af1-audit-and-fix.md) for
the separate local Library repair. Do not modify previous acceptance records.

| Identity | Established local/historical fact; not a current phone observation |
| --- | --- |
| Current checkout manifest | `apps/mobile/app.json`: 2.2.0 / code 6 / runtime `2.2.0-sdk57` |
| Original FS7 | Realme RMX3151 / Android 13 per RT1; package `com.galaxymaxp.stayfocusedv2`, binary 2.3.0 / code 7, runtime `2.3.0-sdk57`, preview; source `2670285815e47885fb8220c9596b91daa61dde84`, application `83f9474603ed45488c75d7028dad170f79374263` |
| Original FS7 OTA | `01a162a3-6a63-7318-9a64-4b40789569a1` |
| Later narrower Appearance/live-GL evidence | Source `245380ea`, application `acf9481`, OTA `01a16304-432c-703e-838e-c4ea04e4b3d9`, same historical 2.3.0/code 7/runtime; not an FS7 closure |
| Archived APK | 132,024,227 bytes; SHA256 `0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`; not proof of today's installed bytes |

Recovered `after-resume.png` SHA256
`486145d3c9d7bb1772a224e3cd682e3686014ed966da1023c5437cf168f5d8b9`
shows Generation text; `stable-after-resume.png` SHA256
`8b3698a5dcbe96150e14026a1b752acebc88f7fe029d520be63ae129d67fe0df`
lacks it. The report says first missing, later recovered. Both XML dumps are
byte-identical and retain the four TextView strings. The 54.851-second host
mtime separation (rounded 54.9 in the log) is capture spacing, not a measured
failure or recovery duration. Original Home-to-launch dwell is unknown.
Do not swap names, overwrite files, repair the narrative or infer GPU/font/
compositor failure. Hashes computed in EV1 do not prove original custody.

A new observation must get a new session ID and directory, never those archive
names/paths. If the new baseline uses the later OTA, existing theme, measured
5-second dwell or a different capture order, label those differences explicitly.
A negative result under different conditions cannot resolve original FS7.

## Owner-present preflight checklist (future session only)

No item below has been executed. Maximum session: **20 minutes**, comprising
up to 5 minutes of preflight and 15 minutes of observation; at most **10 resume
cycles**, one fixed existing theme/motion state, no unbounded retry. Missing
evidence is recorded as unknown, never filled from an old report.

1. Record owner/operator/independent observer aliases, local session ID,
   start UTC and timezone, approved public routes, tool capabilities and stop
   time. Owner must be present and able to stop. No new authorization question
   was sent during this unattended preparation.
2. Agree the expected baseline **before** transitions: Realme RMX3151, Android
   13, package above, expected native versionName/versionCode and full expected
   OTA ID/runtime/channel/embedded status. The expected OTA must be explicitly
   pinned to already-saved local evidence, rather than presumed to be FS7.
   If the owner cannot pin the intended baseline, stop before the flow.
3. Using only already-available, authorized read-only device metadata in that
   separate session, compare actual model/OS/API level/build fingerprint and
   native package versionName/versionCode with that baseline. Observe About
   locally without its action buttons; record its displayed version/code/update
   prefix separately. Keep device serials, IMEI, account names and identifying
   fingerprint details out of shared reports. No USB-debugging/settings change,
   pairing, rooting or new permission grant is included.
4. Read full active OTA ID/runtime/channel/embedded status only if an existing
   safe local inspection surface/tool can expose them without fetching,
   reloading, installing, editing code or dumping private app storage. Correlate
   About prefix with the full ID. Otherwise record the unavailable fields
   **UNVERIFIED (owner to confirm)** and stop before transition testing; an
   eight-character prefix or historical APK hash is insufficient. Do not
   manufacture access through a new diagnostic build.
5. Check that the device/app is **already** in an isolated/offline state that
   prevents service traffic, using existing read-only indicators/evidence.
   App foreground can trigger network work. Do not toggle airplane mode,
   connectivity, app offline settings or sign in/out to establish this condition.
   If isolation cannot be established without a change, stop and record the
   blocker. This runbook does not authorize contacting any remote service.
6. Owner confirms no pending generation, upload, unsaved edit, timer or other
   state that backgrounding/navigation could endanger. Observe only the public/
   empty Today and parameter-free Generation surfaces. If private schedules,
   coursework, names, notifications or source text would be visible, stop before
   capture; do not navigate through private content to reach a test state.
7. Note existing Appearance preference, resolved system theme, palette,
   Reduced Motion, orientation, display size and relevant already-known
   battery/display overlays, without changes. Inspect only a safe visible
   Appearance section if reachable without exposing private account content;
   otherwise mark the value unknown and skip that route. Do not recreate FS7's
   Light-to-Dark changes or test a theme/motion matrix under this authority.
8. Prepare a private local evidence directory outside tracked artifacts, an
   append-only event manifest and a host monotonic clock. Note host/device clock
   offset if safely available without adjusting either clock. No cloud sync,
   upload, email or automatic Git staging. If required observation/capture
   capabilities are absent, stop; this bridge currently has none.

## Chronological observation checklist (future session only)

1. Record the actual starting route/state and identity checkpoint. Observe
   physical Today labels, tabs/back, ring SVG labels, orb and glass/native clock
   separately. Do not drag the clock/ring or change a plan. Write the observer's
   physical-screen assessment before reviewing any saved screenshot/tree.
2. Navigate Today -> parameter-free Generation three times, returning to Today
   between repetitions and logging each departure/arrival and dwell. The
   archived loop was Today -> Generation x3 followed by Home/resume; end on
   Generation before the first
   background. No `id`, `intent`, `start`, quiz or private route parameters.
   Record visible public status/helper/View Queue/Generation details/back
   affordance; do not press actions. Note if baseline labels differ from FS7.
3. Cycle 1: note Generation foreground, then Home departure time; leave app in
   background for a target **5 seconds**, noting the actual dwell. Resume the
   same running app through its existing launcher entry, with no force-stop,
   relaunch/reset or notification link. Record launcher action and first
   physically observed foreground frame as separate events. Define **t=0** as
   that observed frame; it is not a measured AppState/native callback.
4. Observe at target offsets **0, 1, 5, 15, 30 and 55 seconds** from t=0.
   Record actual elapsed times, late/missed points and uncertainty; never delay
   navigation for longer than 55 seconds to seek an assumed recovery. At every
   point independently note physical text/arrow/background/orb status, with
   `visible`, `missing`, `partial`, `not expected` or `not observed` per element.
   Record screenshot and hierarchy start/end times if safely supported, pairing
   each to the nearest physical note; target screenshot-before-tree and record
   actual order. XML collection/capture can perturb timing. If 0/1-second
   captures cannot be acquired, keep physical notes and mark captures missed;
   do not invent simultaneous samples or queue overlapping capture tools.
5. After the 55-second point, if no symptom and time remains, use cycles 2-5
   for same-route Generation resume, 6-9 for same-route Today resume, with the
   same target dwell/observation points. Before cycle 10, optionally observe the
   already-selected Appearance section -> Today without touching controls,
   then resume Today. If unsafe/unavailable, skip Appearance and record why;
   no substitute settings change. Recheck identity using the same safe local
   surface between route blocks and at the end; record gaps without claiming
   continuous OTA monitoring. Stop at 10 total cycles or the session deadline.
6. At the **first missing-text symptom or physical/capture/tree discrepancy**,
   stop further navigation and cycles. If identity/privacy remain safe, keep
   that single cycle's remaining observations through t=55, preserving first/
   last known visible and missing times separately. Then end the diagnostic;
   do not provoke recovery or apply a fix. For unexpected identity/OTA, private
   content, network activity, pending-state risk, crash, update prompt or any
   owner stop, terminate immediately without further capture or interaction.
7. End by recording actual final route, unchanged preferences/identity if safely
   observable, cycle count, skipped points, duration and stop reason. Leave the
   app state in place; do not reset/restore settings or cancel work. Distinguish
   `reproduced`, `not reproduced within bounds`, `capture-only discrepancy`,
   `physical-only discrepancy` and `inconclusive`. None attributes a cause or
   closes RT1; all require review against the contradictory archive.

Any available existing sanitized AppState/focus, Activity/window, surface/GL
context, Text/view/font/error markers should get their own timestamps and
source/clock labels. If unavailable, say **NOT OBSERVED**. Do not add logging,
change native flags, clear logs, collect broad logcat/bugreports, inspect
private storage, or infer native event order from Home/launcher timing.

## Evidence fields and custody

Use separate records for independent evidence; never auto-populate physical
notes from image analysis or the hierarchy. Use element categories/public
allowlisted labels, not academic text. Each event/observation must contain:

| Record | Required fields |
| --- | --- |
| Session identity | Session ID; owner/operator/observer aliases; authorization scope/date; repo HEAD; expected versus observed model/OS/native version/code/package; About version/code/prefix; full OTA/runtime/channel/embedded status; each field's source/time/confidence; isolation evidence; unknowns and historical differences |
| Conditions | Existing theme preference/resolved mode/palette/Reduced Motion; route category; empty/public state; orientation; target/actual dwell; unchanged settings; tool names/versions and available capabilities |
| Event | Monotonic sequence ID; cycle/route; action category; UTC/timezone and monotonic elapsed start/end; clock source/offset/uncertainty; foreground anchor; target/actual offset; missed/late reason |
| Physical screen | Independent observer alias/time; each public element visible/missing/partial/not expected/not observed; whether continuous or sampled; first/last known states; no private transcriptions |
| Screenshot | Artifact ID; related event ID; capture start/end and host write time separately; actual ordering; tool; bytes/dimensions; SHA256; same elements assessed independently; discrepancy versus physical note |
| Hierarchy | Artifact ID/event ID; dump start/end and host write time; bytes/SHA256; public label presence, node class/bounds/visibility attributes when available; sequential timing gap; absence of pixels cannot be inferred from it |
| Optional native markers | Existing source/tool, sanitized marker category and timestamp/clock; relation to observations; missing instrumentation explicitly NOT OBSERVED |
| Closure | Actual cycle count/duration; first symptom/stop reason; skipped fields; observed intervals rather than claimed exact onset/recovery; no-cause conclusion; changed identity and comparisons, if any |

Protect original artifacts immediately in the private local session directory:
use unique sequence-based filenames, preserve original bytes and original
names, compute SHA256/size at collection, and append producer/tool/timestamps/
event mapping to the manifest. No overwrites, name swaps or mtime edits.
Hash before analysis or copying; verify hashes after any local copy and on
session close. Preserve the original manifest and append corrections with
reason, author and time instead of editing history. Hashing proves stability
from collection onward, not the historical truth of an already-mislabeled file.

Keep originals access-restricted and outside Git/cloud sync; never commit raw
screenshots, XML, logs or device identifiers. Work only on separate copies.
Any permitted sanitized crop/redaction is a derivative with its own hash and
explicit original-to-derivative mapping, processing time and redacted regions;
never replace an original or imply a crop is the full frame. If private content
appears, stop collection immediately. If accidentally saved, restrict/quarantine
that original locally for owner-controlled handling; do not display, transcribe,
upload or include it in the shared report. Share only reviewed public findings
and sanitized metadata; do not collect secrets, tokens, account/course/job IDs,
private Storage paths, provider errors or private academic content.

## Verification and preparation result

**PASS for the finite local documentation preparation scope.** Every checklist
above remains prospective. All executed commands below ran locally against
unchanged implementation `d728939f`, serially via
`node tmp/overnight/PBR-RDP/run.cjs typecheck lint api-build`. Inspected scripts
run TypeScript/ESLint/Next, not release or live validation. The runner uses the
inspected PBR0 loopback-only Node network guard, repo-local TEMP/TMP/TMPDIR,
npm offline, Expo offline/no-dotenv, disabled Next/Expo/Turbo telemetry and
local-only Turbo cache. No install, service call or environment-file edit.

| Exact command / check | Result and evidence label |
| --- | --- |
| `npm run typecheck -- --force` | **FRESH PASS**, exit 0; 8/8 tasks, 0 cached; runner 57.164 s |
| `npm run lint -- --force` | **FRESH PASS**, exit 0; 8/8 tasks, 0 cached, 0 errors; six existing warnings (mobile five import-order, web one unused import); runner 101.891 s |
| `npm run build --workspace @stay-focused/api` | **FRESH PASS**, exit 0; Next 15.5.27, 37/37 static pages; runner 146.541 s; generated API `next-env.d.ts` inspected and restored to baseline tracked content |
| Relevant API/mobile/shared tests | **NOT APPLICABLE**, documentation only; zero tests executed, no historical suite relabeled fresh |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | **NOT APPLICABLE**, no mobile runtime/config/native/assets changed; offline JS export is not device evidence; command NOT RUN |
| Root `npm run build -- --force` / web build | **NOT RUN**, outside this documentation prompt's applicable checks |
| `git diff --check`; `git diff --cached --check` | **FRESH PASS**, exit 0; repeated for exact staged documentation before commits |
| `node tmp/overnight/PBR-RDP/check-docs.cjs` | **FRESH PASS**, 43 checks / 0 failed after the validator correction below; historical planning content, append-only handoff, earlier acceptance/policy/declaration content, local links, scope, required evidence and added-text secret patterns |
| Rollout / Device checks / separate physical diagnostic | **NOT RUN**, skipped entirely; bridge has no device-execution action |

Local raw logs and exact exits/source HEAD are retained under ignored
`tmp/overnight/PBR-RDP/`: `typecheck-1792721818114.log`,
`lint-1792721875370.log`, `api-build-1792721977351.log`, `commands.jsonl`,
the local runner and documentation checker. No generated evidence is committed.
No passing check establishes native pixels, actual OTA identity or performance.

First documentation checker attempt: **39 passed / 4 failed** because it
compared raw LF Git blobs with pre-existing Windows CRLF policy, handoff and
web declaration files. Corrected only the validator: normalize CRLF for
tracked-content comparison and retain a byte-exact pre-append handoff snapshot
for its prefix check. It then passes 43/43; no product/policy/evidence file or
assertion about preserved text was weakened. Initial broad inspection output
was truncated and guessed settings/API/ADR/guard paths were absent; discovered
actual paths with repository inventory and narrowed reads. These are inspection/
harness corrections, not source contradictions. No implementation gate failed,
no product flake observed, no failed gate remains unresolved.

| Preparation gate | Final result / proof |
| --- | --- |
| Read-only preparation | PASS: checklist/documentation only, fixed finite endpoint |
| Provenance | PASS: separate identities, independent physical/capture/tree records, collection manifest/original/derivative rules; original FS7 truth remains UNVERIFIED |
| No device actions | PASS: no device/emulator/ADB/capture/tree/native-log execution; all future steps explicitly NOT RUN |
| No native changes | PASS: owned diff contains Markdown only; build-generated ambient declaration restored |
| No lost features | PASS for preparation: no runtime/config/assets/dependencies/data changes; no new functional acceptance claim |
| No secrets | PASS for owned text: public labels/release identity only, no raw artifacts/private paths/credentials; privacy stops specified |
| RT1 / four holds unchanged | PASS: RT1/EV1 STOPPED; MB1/LP1/AS1/LR1 HELD; earlier records, OX/parity/Owner Pause preserved |

Seven preparation gates PASS; this count excludes the unexecuted physical
diagnostic and rollout. STEP 0 baseline, STEP 1 runbook, STEP 2 owner checklist/
handoff, required local gates and planning reconciliation are complete. Local
commit IDs are recorded in Git, the handoff and ignored PBR-RDP status/progress;
no automatic successor, speculative repair or physical acceptance claim.

## Owner steps remaining

- **Device checks: NOT RUN.** Separate owner-present authorized session using
  this checklist, only when a capable bridge and safe pinned local baseline
  are available. This preparation bridge has no device-execution action.
- **Rollout: NOT RUN.** Skipped entirely. No release/fix is prepared, and no
  push/deploy/Google worker/OTA/EAS/native install/remote SQL or migration/
  Scheduler/Canvas/Resend/Supabase/Vercel/Google Cloud action is authorized here.
- **UNVERIFIED (owner to confirm):** current physical device/binary/full OTA/
  runtime/channel; live revisions/database/applied migrations/queues/Scheduler;
  original FS7 custody/chronology and physical-screen attribution; actual
  failure/recovery interval and native cause. No speculative app change or
  blocked-task advancement follows from documentation acceptance.
- Review future evidence before any RT1 retry or dependent work; preserve
  OX2's historical block, pending OX3/OX4/QI1/LC1, parity and Owner Pause.
