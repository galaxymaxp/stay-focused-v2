# PBR-EV1: FS7 archive recovery contradiction checkpoint

2026-10-23. **STOPPED during STEP 1**, at the first recovered-pixel versus
historical-narrative contradiction. No repair, device diagnostic or release
action. PBR-RT1 remains **STOPPED**; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain
**HELD**. Native defect unresolved; **beta readiness BLOCKED**.

## Scope, baseline and stop rule

Read `tmp/overnight/prompts/PBR-EV1.md` in full. Its UNATTENDED rules control:
archive-only work, no questions, services, environment-file edits, installs,
device actions, deployments, migrations or push. STEP 0 says "STOP on any
surprise"; UNATTENDED rule 4 requires a safe local commit and recorded owner
question when a STOP condition is reached. Missing artifacts alone would not
have stopped recovery; the recovered files disagreeing with the report does.

Initial branch `overnight/2026-10-15_feedback`, HEAD
`821b24162d0570ab7af7c6f98fd08256d183964c`; tracked/index diffs empty, local
upstream snapshot 11 ahead / 23 behind `github/main`, no fetch. Author
galaxymaxp <omgraythekid@gmail.com>. Preserve `UI/`, `apps/mobile/.gitignore`,
`supabase/.temp/` and ignored evidence. Read root AGENTS/AUTOPILOT, active
planning/handoff, PBR0/PBR-RT1/PBR-AF1 acceptance and ADR-001/011. No source,
configuration, migration, dependency or historical acceptance report changed.

Owner authority: runner answer
`answers/2026-10-230941-PBR-RT1-needs-physical-resume-text-attri.md:1-7`
records option 1, recovery of existing evidence and held dependents. Corroborated
by runner `DECISIONS-NEEDED.md:228-237`, `BACKLOG.md:309-315` and
`autopilot-ledger.md:266`. No fresh device investigation authorized.

## Evidence locations and identity

Use these exact roots below; all archive access was read-only:

- `R` = `C:/Users/Fely Max Dilinila/Claude/Projects/Stay Focused/overnight`.
- `C` = `C:/Users/Fely Max Dilinila/Documents/Projects/stay-focused-v2-fullsend-20261022-1512`.
- `A` = `C/.local/fullsend-20261022-1512` (expand `C` above).
- `L` = `R/logs/auto_2026-10-22_0902/FS7.log`.
- `H` = `babcb0b:docs/ai/acceptance/fullsend-20261022-1512.md`.

`R/.local/fullsend-20261022-1512` and the work checkout's corresponding
`.local/` directory are absent. **The sibling release clone and its actual `A`
directory exist**; `L:2462,2649` records the clone location. Read-only clone
`git log -1` returns `babcb0b`. This expands the search beyond the earlier
PBR-RT1/PBR-AF1 inspected locations; their historical unavailable-artifact
statements are preserved, not silently rewritten. No fetch/switch/reset.

`git show c9cb867d:docs/ai/acceptance/fullsend-20261022-1512.md` and the
corrected `H` both record FS7 source `2670285815e47885fb8220c9596b91daa61dde84`,
application `83f9474603ed45488c75d7028dad170f79374263`, Android update
`01a162a3-6a63-7318-9a64-4b40789569a1`, preview/runtime `2.3.0-sdk57`, and
About Version 2.3.0 (7). `A/phone-result.json:1` and `L:8590-8601` corroborate
that historical identity. Existing `A/installed-before.apk` is 132,024,227 B,
SHA256 `0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`,
matching the manifest-inspected binary in PBR0 acceptance, "APK archive and
assets". No APK build/install or new manifest extraction here.

Current source `apps/mobile/app.json:5-18` remains **2.2.0/code6/runtime
2.2.0-sdk57**, deliberately separate. Later
`c0569007:docs/ai/acceptance/fullsend-20261022-1719.md`, "Published release
evidence" / "Device acceptance", records source `245380ea`, application
`acf9481`, update `01a16304-432c-703e-838e-c4ea04e4b3d9` and narrower
Appearance/live-GL checks. It cannot substitute for the earlier FS7 capture
pair. Current installed binary/active update/live state and independently
authenticated per-capture identity are **UNVERIFIED (owner to confirm)**.

## Recovered commands, ordering and timing

These are observations of saved text/metadata, not commands executed now:

| Recorded fact | Independently inspectable provenance / limit |
| --- | --- |
| Light selection, return to Today, light Today capture; then standalone Generation via `stayfocused://generation` | `L:8602-8606,9149-9156`; `A/light-selected.xml:1`; no new app action |
| Settings route, Appearance Dark selection, Today, then standalone Generation | `L:9168-9175,9276-9284,9336-9346,9418-9426`; `A/dark-selected.xml:1` records Dark selected=true |
| Three repetitions of Today -> standalone Generation, with UI dump before each capture | Exact archived loop `L:9437-9451`; capture order `cycle-1-today`, `cycle-1-generation`, then cycles 2 and 3 |
| Home -> launcher monkey -> UI dump -> first resume PNG | `L:9452-9456`; no explicit sleep/dwell between Home and launch, and no per-action AppState/focus timestamp. Actual background dwell **UNVERIFIED** |
| First resume capture host timestamp | `A/after-resume.png` filesystem mtime `2026-10-22T08:10:41.966Z` (16:10:41.966 +08:00); `L:9479-9490` separately records 16:10:41.9784655 +08:00 and filename LastWriteTime 16:10:41 |
| Follow-up timing calculation | `L:9494-9513` measures elapsed host time since the first PNG's LastWriteTime, ensures at least 31 seconds, dumps UI then captures, and prints `STABILITY_SECONDS=54.9` |
| Follow-up PNG host timestamp | `A/stable-after-resume.png` mtime `2026-10-22T08:11:36.817Z`; mtime separation **54.851 seconds**, consistent with rounded 54.9. This is capture spacing, not time since native resume or failure/recovery duration |
| Appearance and other preferences | `A/phone-result.json:1` records original Automatic/Reduced Motion Off; `A/live-results.json:1` records final Automatic, unchanged orange palette/settings. Dark selected before the failing-flow loop; restoration occurs after it (`L:9519-9525`). No synchronized system-theme/native configuration trace |

Filesystem mtimes are host file-write metadata, not signed device events. No
continuous recording or exact onset/recovery bounds were recovered before
the stop. `A/device.cjs:5-8` captures `adb exec-out screencap -p` and separately
writes UI-automator XML; that helper was **read only, never executed**.

## Contradiction: recovered pixels versus recorded result

`H`, "Live checks", and `R/answers/fullsend-20261022-1512-result.md`, STEP 7,
say the **first** resume capture loses text and the 54.9-second follow-up
recovers. `L:9516-9518`, `A/live-results.json:1`, and local
`tmp/overnight/FS7.progress` / `FS7.status` repeat that narrative (historical
physical PARTIAL, 5 PASS / 1 FAIL).

Direct local `view_image` inspection of the exact files named below showed
the **opposite ordering**:

| Existing artifact under `A` | Fresh read-only observation | Bytes / dimensions | SHA256 computed during EV1 |
| --- | --- | --- | --- |
| `after-resume.png` | Status "Starting your request…", helper "This saved request hasn’t started yet.", "View Queue", "Generation details" and back arrow visible; complete orb visible | 251,534 / 1080x2412 | `486145d3c9d7bb1772a224e3cd682e3686014ed966da1023c5437cf168f5d8b9` |
| `stable-after-resume.png` | Those four app text strings and back arrow absent; orb, button backgrounds and system status bar remain visible | 265,443 / 1080x2412 | `8b3698a5dcbe96150e14026a1b752acebc88f7fe029d520be63ae129d67fe0df` |
| `after-resume.xml` | 42 nodes, four TextView text entries; UI dump precedes its PNG | 14,504 | `3e4cda7f7ff8c0e26e57ac9bdc7f4c644249b73925cd698df88771d3187ccf5a` |
| `stable-after-resume.xml` | Byte-identical to first XML, including the same text entries; UI dump precedes its PNG | 14,504 | `3e4cda7f7ff8c0e26e57ac9bdc7f4c644249b73925cd698df88771d3187ccf5a` |

`A/after-resume.xml:1` / `stable-after-resume.xml:1` retain the status text,
helper, View Queue and Generation details. The last text entry has zero bounds
in both dumps. XML retention is **not proof of rendered pixels** and these
dump/capture operations are sequential, not simultaneous. The safe-label
console summaries in `L:9470-9478,9504-9511` only list Back; the helper's
allowlist (`A/device.cjs:10-11`) omits these other strings, so that abbreviated
console output cannot prove their absence from the full UI tree.

Do not swap the filenames, reinterpret these as a confirmed recovery, edit the
FS7 report, or infer a native font/GL/compositor/capture cause. No independent
camera footage, simultaneous physical-display observation or synchronized
native lifecycle/Text/surface trace establishes whether the physical display
matched either PNG. **Screen-versus-capture attribution, original capture
identity/untampered chronology and actual recovery remain UNVERIFIED (owner
to confirm).** The historical narrative and the currently recovered bytes
are both preserved as conflicting evidence.

The hashes are first computed here, not recovered original checksums. None of
the inspected evidence supplies an earlier signed checksum/chain of custody
proving these ignored files were never overwritten or mislabeled. A neutral
metadata/hash manifest of 38
already-existing archive files was saved under ignored
`tmp/overnight/PBR-EV1/archive-manifest.json` before the contradiction was
observed; no PNG, raw XML/log, credential or private academic content is added
to Git. Only the public standalone Generation pair was visually inspected.

Primary text provenance hashes: `L` SHA256
`0fb510fb1a860e339335f550d5a5c724738082fbd1bef5e0502535f4689cecdd`;
runner result SHA256
`61dfae431187e6e24ed5da736f3dc9d74e6c72b5555256754191936d4e622817`.
Corrected `H` Git blob `ded7455717110f431df06cf240d546378be06362`, SHA256
`517be8656ee90b66f528ab67466ed62781944cedd4568586357405da6fe18bb3`;
first report at c9cb867d blob `2af86c4800b9f13931a6e27d909d4184d5728dff`.
The normal babcb0b correction adds documentation-attempt history; the device
result narrative is unchanged between the two. No remote history modified.

## Verification, actions and skipped work

Serial local runner `node tmp/overnight/PBR-EV1/run.cjs typecheck lint api-build
android-build` uses inspected PBR0 loopback-only Node network guard,
repository-local TEMP/TMP/TMPDIR, npm offline, Expo offline/no-dotenv, disabled
Next/Expo/Turbo telemetry and local-only Turbo cache. Package scripts were
inspected: API `next build`; mobile `expo export`, not APK/native build.
No install, service command or live check executed. At contradiction the
owned runner PID 43272 and its child process tree were terminated; no further
gate/recovery work continued beyond the required safe documentation checkpoint.

| Exact command / gate | Actual result / freshness |
| --- | --- |
| `npm run typecheck -- --force` | **FRESH PASS**, exit 0, 8/8 tasks, 0 cached, runner 59.128 s; source 821b2416; `tmp/overnight/PBR-EV1/typecheck-1792720436406.log` |
| `npm run lint -- --force` | **BLOCKED / INTERRUPTED at contradiction stop**; forced task execution began, no final task/error/warning counts or normal exit. Runner process termination exit 1 is not a completed lint failure or PASS; `lint-1792720495623.log` retained |
| `npm run build --workspace @stay-focused/api` | **NOT RUN** at stop |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | **NOT RUN** at stop; inspected offline export only |
| Relevant shared/API/mobile focused tests | **NOT APPLICABLE** to archive/docs-only changes; 0 tests executed; no historical suite reused as fresh proof |
| `git diff --check`; `git diff --cached --check` | **FRESH PASS**, exit 0 for safe documentation checkpoint, including exact staged content |
| Documentation integrity, links/provenance/hash transcription and historical preservation | **FRESH PASS** for recorded facts and explicit limits; original bodies preserved, five owned Markdown paths only |
| Provenance corroboration of recovery narrative | **BLOCKED** by opposite pixel ordering; STOPPED, no success/recovery claim |
| PBR-RT1 stop / four holds / feature preservation / scope / no unsupported claim or secret leakage | **FRESH PASS** by scoped diff and preserved baseline comparison; no runtime change or native-cause claim |
| Rollout; Device checks | **NOT RUN**, skipped entirely |

First inspection errors retained: unquoted PowerShell `@{upstream}` revision
was corrected with a literal quoted revision; guessed `app.config.ts` was
absent and `app.json` was used. Direct XML casting rejected the appended
UI-automator footer (generic UI only); bounded node-attribute extraction
corrected inspection without modifying evidence. An inline Node inspection
failed PowerShell quoting; the file-based extractor already supplied safe
labels/counts. Overbroad read output was narrowed. No product/test change,
assertion weakening, observed flake or completed failed implementation gate.

STEP 0 done. STEP 1 **partial, STOPPED on contradiction**. STEP 2 contains only
this safe findings checkpoint, not completed/reconciled recovery. STEP 3 safe
documentation/boundary validation only; remaining tests/builds not advanced.

## Owner steps remaining

- **Exact question, recorded only:** Can you reconcile the original FS7
  capture identities? The recovered `after-resume.png` hash `486145d3…f5d8b9`
  contains the Generation labels, while `stable-after-resume.png` hash
  `8b3698a5…7fe0df` lacks them, opposite to the report's recovery narrative.
  Supply any already-saved original first-failure/recovery screenshots or
  recording and original filename/timestamp mapping/checksums, if different;
  confirm whether the same labels disappeared on the physical screen. Include
  any existing measured Home-to-resume dwell/system-theme and synchronized
  lifecycle/Text/surface notes. No need to resupply the recovered route loop;
  do not create new captures, reset/install or change OTA under EV1 authority.
  Redact credentials and private academic content. No unattended question sent.
- **Device checks: NOT RUN.** Any fresh bounded native diagnostic requires
  separate owner authorization after archive discrepancy review. Native cause,
  exact failure/recovery interval and screen-versus-capture remain unverified.
- **Rollout: NOT RUN.** No FULLSEND, deploy, worker, OTA/EAS, native build/install,
  migration/remote SQL, Scheduler/email/provider operation, environment-file
  change, push or cloud spending. No fix ready to publish. All live production
  state **UNVERIFIED (owner to confirm)**.
- Review this STOPPED checkpoint before any retry. PBR-RT1 remains STOPPED;
  four dependents HELD, unqueued/unstarted. Original OX2 block, pending
  OX3/OX4/QI1/LC1, performance/visual roadmap, parity and Owner Pause preserved.
  **Beta readiness remains BLOCKED**. No automatic next task.

Local docs-only commits and exact hashes are recorded in the appended handoff
and ignored `tmp/overnight/PBR-EV1.status`; no tmp artifact is committed.
