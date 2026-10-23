# PBR-RDP: authorized Realme ADB preflight (2026-10-23)

**STOPPED at preflight; resume-text diagnosis INCONCLUSIVE.** The owner directly
requested execution of the existing procedure against the connected, authorized
Realme in this chat. This authorizes the separate device session contemplated by
the [prepared runbook](pbr-rdp-realme-runbook.md); its historical documentation-only
result remains unchanged. ADB execution is available in this session.

The phone is online, and full active OTA identity is unavailable through the
inspected public metadata surfaces. Runbook preflight items 4 and 5 explicitly
require stopping before transition testing in these circumstances. Neither USB
authorization nor package version verifies those prerequisites.

## Baseline and fresh evidence

Repository `overnight/2026-10-15_feedback`, initial HEAD
`a94c2bb77b42131497b463d3e671a30d6bf3d7e8`; tracked/index clean at entry.
Local upstream snapshot 15 ahead / 23 behind `github/main`, no fetch.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.
Read root AGENTS/AUTOPILOT, current planning, latest handoff, PBR-RDP/RT1/AF1/EV1
acceptance, ADR-001/011 and relevant lifecycle/About source. No source repair.

Session `pbr-rdp-20261023T030250693Z`; recorded checks from
2026-10-23T03:02:50.9147767Z through 03:02:52.5545183Z
(11:02:50–11:02:52 Asia/Manila, UTC+08:00). Host monotonic timestamps accompany
each check; these are command timings, not application performance. The session
directory was created shortly before the recorded checks. No physical observer
assessment or host/device clock offset was obtained.

| Read-only check | FRESH observed result |
| --- | --- |
| `adb version`; `adb devices -l` (initial discovery) | ADB 1.0.41, platform-tools 37.0.1; exactly one authorized device, RMX3151. Serial excluded from saved report/ledger. |
| `shell getprop ro.product.manufacturer`; `ro.product.model` | `realme`; `RMX3151` |
| `shell getprop ro.build.version.release`; `ro.build.version.sdk` | Android `13`; API `33` |
| `shell getprop ro.build.fingerprint` | Value hashed in memory; SHA256 `fdb52513f94baae78b216812417bc4c19d594fcff160293f8aac08a10d62d391`. Fingerprint text not retained. |
| `shell dumpsys package com.galaxymaxp.stayfocusedv2` | Native versionName `2.3.0`, versionCode `7`, minSdk `24`, targetSdk `36`; package flags contain no `DEBUGGABLE`. Only allowlisted version/flag lines retained. |
| `shell settings get global airplane_mode_on` | `0` |
| `shell settings get global wifi_on`; `mobile_data` | Both `1`; enabled settings alone do not establish traffic. |
| `shell dumpsys connectivity` | Active default network present; one connected network-agent record; a VALIDATED capability present. Only booleans/count retained, no network identifiers. Existing offline isolation is not established. |
| `shell cmd uimode night` | `Night mode: yes` (system observation only) |
| `shell settings get global animator_duration_scale` | `1`; does not establish the app's Reduced Motion state |
| `shell settings get system user_rotation` | `0`; preferred rotation value, not proof of current physical orientation |

All **13 recorded device reads exited 0**. Native model/OS/version match the
historical binary baseline. Latest saved release reference
`c0569007:docs/ai/acceptance/fullsend-20261022-1719.md` identifies
OTA `01a16304-432c-703e-838e-c4ea04e4b3d9`, preview/runtime `2.3.0-sdk57`.
Original FS7 instead used `01a162a3-6a63-7318-9a64-4b40789569a1`.
Neither saved reference proves today's active OTA or pins the owner's intended
test baseline. Package metadata cannot establish the active JavaScript update;
About source displays only an eight-character prefix. No existing inspected
public surface supplies the required full active OTA/runtime/channel/embedded
status without additional access or app interaction. These fields remain
**UNVERIFIED**; no private-storage/logging workaround was attempted.

## Bounds, custody and closure

**0 app launches, 0 navigation/resume cycles, 0 screenshots, 0 UI hierarchy
dumps, 0 logcat collections.** No physical pixel or missing-text observation.
Starting/final app route, pending work, existing app theme/palette/Reduced Motion,
About display and safe public/empty UI state remain NOT OBSERVED. No cause,
failure interval, recovery interval or original FS7 chronology is inferred.

Evidence is local and Git-ignored under
`tmp/overnight/PBR-RDP-device/pbr-rdp-20261023T030250693Z/`:
`commands.jsonl` (per-command UTC/monotonic times, exits, sanitized results),
`preflight.json` and `manifest.json` (SHA256/bytes for both). Originals are
preserved; subsequent closure information is written separately. Local runner
`tmp/overnight/PBR-RDP-device/preflight.ps1` is retained, not committed.
No raw screenshots/XML, identifiers, private storage or academic content saved.

Verification: device metadata **FRESH, 13/13 exit 0**; SHA256/size custody and
documentation/diff checks **FRESH PASS** (recorded at closure). Product suites,
typecheck, lint and builds **NOT APPLICABLE / NOT RUN**: metadata collection and
documentation only, no implementation/configuration changes. This is no native
acceptance PASS. Initial inspection corrections: Windows wildcard search and
unquoted Git upstream syntax failed; corrected with directory filters/quoted
revision. Guessed ADR paths were absent; actual paths discovered by inventory.
Some broad reads were truncated and narrowed. No failed device command.

Owner steps remaining: independently establish full active OTA/runtime/channel/
embedded identity and explicitly pin the intended baseline; provide an already
isolated phone, public/empty safe state and independent physical-screen observer
before any bounded transition session. No setting change, install, reset,
force-stop, OTA switch, service access or release occurred. Source lifecycle
inspection confirms foreground can check releases/reconcile work, so an online
resume would not satisfy the runbook's no-service condition.

PBR-RT1 and PBR-EV1 remain **STOPPED**; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain
**HELD**, unqueued/unstarted. Beta readiness **BLOCKED**. No automatic successor,
speculative fix, historical archive alteration, rollout or push. Other OX/parity/
Owner Pause states remain unchanged. Scoped local documentation commit follows;
its exact hash is recorded in Git and the local closure file.
