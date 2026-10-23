<!-- PBR-LP1 completion begin -->
## PBR-LP1 current local checkpoint: PASS

2026-10-23: Library profiling and mandatory local gates complete, **zero runtime
changes; no justified further local optimization**. [Acceptance, samples,
hashes and commands](ai/acceptance/pbr-lp1-library-performance.md).
Baseline MB1 `d8d22603` and AF1 `ef80dfc6` retained. Two repeated public synthetic
cohorts preserve full items/stats/DTO/cursors/hidden IDs. All 0/100/240/300
changed/unchanged hook schedules remain 2 summary/2 aggregate stats/max 1 active.
Each overview uses 8 SQL reads with 1 summary scan; 300-item medians 3.029/3.440ms
without adversarial unmatched overlays, 11.788/11.078ms with the seeded history.
API walks stay 2/2/6/6 vs 7/7/21/21 with 1,000 hidden rows. No production SQL,
physical frame/latency or percent-saving claim; no schema/cache/feature change.

FRESH full shared 716 / mobile 1,658 / API 2,455 = **4,829 passed / 0 failed /
3 existing live skips** (shared includes emitted copies). Focused 85 pass;
two 2-test probe cohorts pass; forced root typecheck/lint/build 8/8 each, 0 cached;
explicit API build PASS; root build includes offline mobile JS/assets and web.
No application gate failure or flake. Scoped local commits a35b1d3c, 204f8731 plus
the final docs checkpoint in Git/status. Original evidence/untracked dirt kept.

LP1 is complete; **PBR-AS1 requires fresh supervisor review of actual LP1 PASS**;
PBR-LR1 follows AS1 PASS/review. No successor work or queue changes. OX2 blocked
by OX1; unrelated work and Owner Pause intact. Historical RT1/EV1 STOPPED,
physical RT2 STOPPED / resume-text INCONCLUSIVE and deferred. Active OTA/safe
isolation and production/authenticated-browser/physical measurements UNVERIFIED.
Rollout and Device checks NOT RUN; no push/deploy/service/SQL/migration/env file/
Scheduler/device/native build/install/OTA/EAS/spending. Source 2.2.0/code6 is
distinct from archived 2.3.0/code7. Earlier LP1 eligibility text below is history.
<!-- PBR-LP1 completion end -->

<!-- PBR-MB1 completion begin -->
## PBR-MB1 current local checkpoint: PASS

2026-10-23: current-source startup/cache/navigation/Library/API synthetic
measurements and opt-in privacy-safe instrumentation are complete. Runtime
commit `b788663e288f5d970d87cd7d54710c94abf21813`. [Acceptance, exact intervals, hashes, attempts and commands](ai/acceptance/pbr-mb1-performance-baseline.md).
No optimization or physical/production speedup is claimed. AF1 ef80dfc6 remains
the Library baseline: all0/100/240/300 changed/unchanged schedules retain2
summary reads /2 stats reads /max1 active read; complete results match.
API0/1000-history page walks preserve exact hidden IDs, cursors and ownership.

FRESH full suites: shared711/mobile1658/API2455/web575/Canvas75/OCR27/engine606
= **6107 passed /0 failed /3 existing live skips** (shared includes emitted
copies). Forced root typecheck/lint/build each8/8,0 cached; explicit API/web
builds and38-file Android offline JS/assets export PASS. Initial typecheck
test-typing failure and mobile additive-assertion failure are recorded, corrected
and rerun. No new skip or product flake. All work is scoped local commits.

Approved order remains **PBR-MB1 -> PBR-LP1 -> PBR-AS1 -> PBR-LR1**.
LP1 is next only after fresh supervisor review/publication of MB1 PASS; start
with this baseline and AF1 completed work, optimize only demonstrated remaining
costs or document no justified further local optimization. AS1 awaits LP1 PASS
and review; LR1 awaits AS1 PASS and review. No successor work or queue change.
Historical OX2 remains blocked by OX1; unrelated roadmaps and Owner Pause intact.

RT1/EV1 STOPPED; RT2 physical preflight STOPPED / resume-text INCONCLUSIVE
and deferred for independent development. Source2.2.0/code6/runtime2.2.0-sdk57
is distinct from archived installed2.3.0/code7/binary-configured2.3.0-sdk57/preview.
Active OTA/full runtime/channel/embedded identity and safe isolation remain
UNVERIFIED; no device/beta/release gate passes. Rollout and Device checks are
owner steps, NOT RUN. No push/deploy/service/remote SQL/migration/environment
file/device/native build/install/OTA/EAS/Scheduler action or spending.
Earlier eligibility/publication wording below is a recovery checkpoint;
the independent lane disposition above is current.
<!-- PBR-MB1 completion end -->
<!-- PBR recovery 2026-10-23 begin -->
## Current owner scope: resume independent local performance work

2026-10-23 direct owner PC instruction supersedes the earlier four-task hold.
**PBR-RT2 physical diagnostic remains STOPPED; resume-text INCONCLUSIVE and
DEFERRED for independent development.** Full active OTA/runtime/channel and
embedded identity UNKNOWN; safe public/empty isolation NOT PROVEN; 0 resume
cycles. Fresh authorized Realme checks confirm Android13/API33, native2.3.0/code7
and installed APK SHA256 matching the archive; binary configured runtime
2.3.0-sdk57 / preview does not establish active OTA identity.

Approved finite order: **PBR-MB1 -> PBR-LP1 -> PBR-AS1 -> PBR-LR1**.
MB1 now depends on actual **PBR0 PASS + PBR-AF1 PASS**, removing only the
unnecessary rendering-diagnostic prerequisite for LOCAL measurements. MB1 now
has PASS for local measurements/instrumentation and committed checks; PBR-LP1
awaits fresh supervisor review/publication. AS1 and LR1 await their predecessor
PASS and review. PBR-AF1's completed Library coalescing
repair is baseline, not duplicate work. Historical RT1/EV1 STOPPED and RT2/FS7
reports stay intact; earlier hold statements below are historical checkpoints
superseded only for this independent lane. Device, beta/tester and release gates
remain BLOCKED; OX2 still depends on OX1 STOPPED.

Existing runner PID39828, active supervisor chatgpt, Manual Pause OFF at recovery
inspection; no restart or duplicate. Two TOTAL pending limit means only MB1 can
be admitted now alongside preserved OX2. Continue subsequent approved IDs through
fresh reviews as slots permit. No push/deploy/migration/OTA/native build/install,
FULLSEND, production or secret changes. Every implementation retains fresh tests,
forced typecheck/lint/build and measured before/after proof where applicable.
[Recovery evidence, deferral authority and dependency rationale](ai/acceptance/pbr-rt2-recovery-and-performance-resumption.md).
<!-- PBR recovery 2026-10-23 end -->

# Current State

<!-- PBR-RT2 begin -->
PBR-RT2 direct-PC diagnostic (2026-10-23): **BLOCKED at identity/isolation
preflight; rendering INCONCLUSIVE, cause UNRESOLVED.** Fresh local ADB confirms
one Realme RMX3151 / Android13/API33, package 2.3.0/code7; 13/13 recorded reads
exit0. Active validated network; full active OTA/runtime/channel UNKNOWN. Runbook
preflight stops apply: 0 app launches/navigation/resumes/captures/tree dumps.
No repair justified. Independent physical display and app theme/motion UNKNOWN.
[New acceptance and exact evidence](ai/acceptance/pbr-rt2-direct-realme-diagnostic.md).
FRESH full suites: 4809 pass/0 fail/3 existing live skips; 65 focused checks pass.
Forced root typecheck/lint/build: 8/8 each, 0 cached; Android offline JS export
PASS. Supported supervisor controller handoff applied; no tasks admitted. Historical RT1/EV1 STOPPED and RDP preparation PASS preserved;
MB1 -> LP1 -> AS1 -> LR1 HELD, beta BLOCKED. Initial runner idle, enabled, Pause
OFF; no duplicate runner or queue bypass. No release/install/settings/data change.
<!-- PBR-RT2 end -->


<!-- PBR-RDP device preflight begin -->
PBR-RDP authorized device session (2026-10-23): **STOPPED at preflight**.
ADB freshly confirms Realme RMX3151 / Android 13 / API 33 and native
2.3.0/code 7; 13 read-only checks exited 0. Phone has an active validated
network; full active OTA/runtime/channel/embedded identity UNVERIFIED.
Runbook preflight stops apply: **0 launches/resume cycles/screenshots/tree
dumps**; physical text diagnosis INCONCLUSIVE. No settings or app changes.
[Fresh results and remaining prerequisites](ai/acceptance/pbr-rdp-realme-preflight-20261023.md).
ADB access is now available; earlier preparation-only results below are historical.
PBR-RT1/EV1 STOPPED, four dependents HELD, beta readiness BLOCKED; no successor
or rollout. Other roadmap/Owner Pause states preserved.
<!-- PBR-RDP device preflight end -->

<!-- PBR-RDP begin -->
PBR-RDP / Realme diagnostic preparation (2026-10-23): **PASS for local
documentation preparation only**. [Owner-present runbook](ai/acceptance/pbr-rdp-realme-runbook.md)
pins phone/native/OTA identity, existing theme/motion and isolation preconditions,
chronological bounded observations (20 minutes / at most ten resumes), independent
physical-screen versus screenshot/tree records, privacy stops and immutable
artifact custody. Separate authorized physical diagnostic **NOT RUN**: current
bridge offers documentation preparation only, no device-execution action.
No source/native/config change or speculative fix. PBR-EV1 and PBR-RT1 remain
STOPPED; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain HELD, unqueued/unstarted;
**beta readiness BLOCKED**. Known archived FS7 ordering contradiction preserved.
Current phone/full OTA, native cause, original chronology and live state remain
**UNVERIFIED (owner to confirm)**. Rollout and Device checks NOT RUN, skipped
entirely; no service, environment-file, release, device or push action.
Fresh verification counts and exact commands are in the runbook/handoff.
Prior acceptance, OX2 block, other pending work, parity and Owner Pause preserved.
Finite preparation endpoint reached; owner-present diagnostics/review remain,
with no automatic RT1 retry, successor or release.
<!-- PBR-RDP end -->

<!-- PBR-EV1 begin -->
PBR-EV1 (2026-10-23): **STOPPED during archive-only STEP 1** on recovered
pixel/report contradiction. The sibling FS7 release clone exists: first
`after-resume.png` shows Generation text, while `stable-after-resume.png`
lacks it, opposite to the historical recovery narrative. Exact hashes,
recorded Today -> Generation x3 -> Home/resume order and 54.9-second capture
spacing are preserved in [recovery checkpoint](ai/acceptance/pbr-ev1-fs7-evidence-recovery.md).
Physical-screen attribution, original file chronology and actual recovery
remain UNVERIFIED (owner to confirm); no cause or fix inferred. FRESH forced
typecheck 8/8, 0 cached; lint interrupted at stop, builds NOT RUN, focused
tests NOT APPLICABLE. Safe docs integrity and staged/unstaged hygiene PASS.
PBR-RT1 stays STOPPED; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 stay HELD;
**beta readiness BLOCKED**. No source change, device action, service call,
release or push. Rollout/Device checks NOT RUN. Owner archive reconciliation
required before retry; previous acceptance/OX/parity/Owner Pause preserved.
<!-- PBR-EV1 end -->

<!-- PBR-AF1 begin -->
PBR-AF1 (2026-10-23): **PASS for mandatory LOCAL renewed audit/repair scope**.
Implementation ef80dfc6: coalesces owner-scoped Library progress reads and shares
the summary scan with stats. Identical synthetic 300-item workload: summary reads
604 -> 2, stats 302 -> 2, max 1 active summary call; complete results, late writes,
owner switch, failed-read recovery and per-item progress preserved. FRESH full
suites 6,092 passed / 0 failed / 3 existing live skips. Forced root typecheck,
lint and serial build 8/8 each, zero cached; final post-restoration typecheck 8/8.
API 37/web 23 pages and Android 38-file JS/assets export PASS; diff/staged hygiene
and history/scope validation PASS. Six existing lint warnings; first expected
regression failures and harness corrections retained in acceptance.
Reader host profile 2/2 preserves all 4,440 large-fixture text segments; host
timings are not native latency. Existing APK 132,024,227 B unchanged; HBC +1,623 B
versus PBR0, no APK saving claimed. Native text **UNRESOLVED / UNREPRODUCED**,
essential native attribution BLOCKED/OWNER-TO-VERIFY. PBR-RT1 stays STOPPED;
PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 stay HELD. No beta/release readiness claim.
Rollout/Device checks NOT RUN; live state UNVERIFIED (owner to confirm).
No service call, install, environment edit, remote SQL, deployment or push.
[Final acceptance and owner recipe](ai/acceptance/pbr-af1-audit-and-fix.md).
<!-- PBR-AF1 end -->

<!-- PBR-RT1 begin -->
PBR-RT1 / Android Resume-Text Recovery (2026-10-22): **STOPPED at STEP 1**,
before implementation, on source a4e5c4cc / overnight/2026-10-15_feedback.
FS7's missing native text after resume is not attributed by the available
local evidence. The existing replacement-GL-context repair is already present;
newer narrower Appearance/live-GL success does not close FS7's 5 PASS / 1 FAIL.
FRESH existing focused mobile suites: **65 passed / 5 files**. Ignored combined
DayRingClock/DayOrb probe: **8 passed / 1 file**, 80 synthetic resume cycles;
neither test-host Text nor software rendering proves Android native pixels.
First probe attempt **4 passed / 4 failed** due to harness effect/timer flushing;
corrected harness passes without product edits or weakened assertions.
Documentation scope/path and unstaged/staged hygiene: FRESH PASS. Full suites,
root typecheck/lint/build and API/web/Android exports: NOT RUN at the required
pre-implementation evidence stop. No runtime code or permanent regression added.
Essential pinned-device screen-versus-capture and synchronized lifecycle/native
Text/surface evidence remains **UNVERIFIED (owner to confirm)**; the exact owner
question and privacy-safe matrix are recorded in the acceptance report/handoff.
Rollout and Device checks NOT RUN, skipped entirely; no service, environment-file,
deployment, native build/install, remote SQL, Scheduler/email or push operation.
Frozen sequence: PBR0 -> **PBR-RT1 STOPPED** -> PBR-MB1 -> PBR-LP1 -> PBR-AS1 ->
PBR-LR1. All four dependents are held, not started or queued; actual predecessor
PASS plus fresh authorized supervisor review is required. These explicit IDs
govern the owner-approved sequence; older PBR1-PBR5 categories remain historical
proposals. Pending OX2/OX3/OX4/QI1/LC1, held parity, Owner Pause, owner artifacts
and all previous evidence remain intact. Safe documentation committed locally;
exact hashes in Git and ignored PBR-RT1.status. No later task initiated.
[Acceptance, source boundaries, tests and owner evidence](ai/acceptance/pbr-rt1-android-resume-text.md).
<!-- PBR-RT1 end -->

<!-- PBR0 begin -->
PBR0 / website + Android pre-beta baseline (2026-10-22): **PASS for the finite
unattended audit scope**, source 245380ea on overnight/2026-10-15_feedback.
No app/source implementation, dependency, config or migration changes.
Exact local 2.3.0/code7 APK weighs **132,024,227 bytes**; native libraries
93,639,812 bytes across four ABIs. User-reported 117 MB remains unidentified.
Fresh web: Today 213 kB / Library 223 kB First Load JS; standalone Android HBC
10,945,101 bytes. These are separate source/export/binary measurements, not
device latency. Existing SP1/SP2/SP2b optimizations are retained; remaining
read/render/packaging/offline work is evidence-ranked in the audit.
FRESH forced root typecheck/lint/build: 8/8 each, 0 cached; six existing warnings.
Shared 706/72 files (includes emitted copies), Canvas 75/1, OCR 27/3, engine
606 evaluations, API 2452 passed + 3 existing live skips/213 files, mobile
1645/172, web 575/76; all executed cases pass. Separate API/web/Android builds,
post-restoration forced typecheck and diff/staged hygiene PASS.
Historical FS7 physical **5 PASS/1 FAIL** stays PARTIAL; newer narrow GL recovery
proof is distinguished. Authenticated desktop web and live revisions/DB/regions/
queue/Scheduler, actual startup/Web Vitals/P50/P95 remain **UNVERIFIED (owner to
confirm)**. Rollout and Device checks **NOT RUN**, skipped entirely.
PBR1–PBR5 are conditional small code-only proposals; **supervisor review must
precede any next job**. PBR6 is owner-only. Pending OX3/OX4/QI1/LC1, held web
parity and Owner Pause remain unchanged. No remote service, environment-file
edit, SQL/migration apply, deploy/OTA/EAS, Scheduler/email or push.
Audit commit bdd1c021; documentation checkpoint follows separately.
[Audit, measurements, conditional roadmap and owner matrix](ai/acceptance/pbr0-prebeta-performance-audit.md).
<!-- PBR0 end -->

<!-- OX2P begin -->
OX2P / website + mobile light glass (2026-10-22): **PASS for the finite unattended local code scope**.
Exact source prerequisite 39ff7362 and separate Realme padding report confirmed;
historical OX1 STOPPED and old OX2 held status remain unchanged. Implementation
1140c737 refines shared light-only liquid/reflection coverage and translucent
static posters. Native padded SVG containment is retained; no new render pass,
clock compositor, loading timer, gesture, backend or dependency change. All five
dark fixed-pose RGBA comparisons with 39ff have maximum difference 0; current
web/mobile adapters match exactly locally in both themes.
FRESH root forced typecheck/lint/build: 8/8 each, 0 cached, six existing warnings.
Full suites: shared 706 tests/72 files, mobile 1643/172, web 575/76;
2924 passed, 0 failed/skipped. Explicit API/web builds
and Android HBC export PASS. Both diff checks PASS. FRESH 120 throttled normal
and 40 Reduced Motion web sequences cover all five palettes, both themes,
Today/Generation and 390/1440 widths; no sampled partial clock, alpha/RGB corner
leak, page-corner change, page error or external request. Twenty RN Web cases
and inspected before/after contact sheets pass locally. Current local web does
not reproduce the owner's square/layered-load symptom; startup easing stays OX4.
Rollout and Device checks NOT RUN, skipped entirely. Physical acceptance after
these shader changes, authenticated/deployed web and live state remain
UNVERIFIED (owner to confirm). No service call, environment-file edit, remote
SQL/migration, Scheduler/email, deploy, OTA/install, push or later-scope work.
Owner Pause and unrelated paths preserved. Local endpoint reached; owner review
and separately authorized device/rollout work remain.
[Acceptance and exact gates](ai/acceptance/ox2p-light-glass-follow-up.md).
<!-- OX2P end -->

<!-- OX1-device begin -->
OX1 / owner-authorized Realme follow-up (2026-10-22): **PASS for the physical
square repair in an isolated native test application**. The actual release and
an SVG-only OrbPoster reproduce the square. Android rasterizes its oversized
spill into the declared, too-small SVG bitmap; a padded viewport removes the
cutoff while preserving body size and external light. Only mobile OrbPoster and
eight regression cases change. Physical dark/light × gold/pearl/violet ×
Today/Generate captures, ten navigation cycles, resume, live glass text,
tap/rotation and 31-second Reduced Motion stability pass in the offline shell.
FRESH root typecheck/lint/build: 8/8 each, 0 cached; shared 696, mobile 1641,
web 569 tests pass; Android HBC export passes. The release/data remain intact;
no deploy, OTA, push or production mutation. Clean Gradle APK rebuild was not
completed; the device test reuses the release's exact native binaries under a
separate package with local source bundles and explicit asset adaptation.
The historical OX1 stop/status remains unchanged; this separately authorized
resolution awaits owner/supervisor review, with OX2 and release unstarted.
[Physical evidence and limits](ai/acceptance/ox1-realme-physical-debug.md).
<!-- OX1-device end -->

<!-- OX1 begin -->
OX1 / orb compositing integrity (2026-10-22): **STOPPED at STEP 0**.
The owner-reported Realme square was not reproduced in local software rendering;
no safe source-level cause or repair was established. No runtime code, dependency,
blend math, pixel format or mask changed. Thirty-six actual web-component
sequences (violet/gold/pearl, both themes, Today/Generation, cold/reload/component
routes) produced 805 frames and 13,518 samples: zero partial-clock samples,
outer alpha/RGB leakage or page-corner difference. Twelve mobile-component
React Native Web cases also show no square; their browser GL/SVG adapters do
not establish Android TextureView behavior. FRESH focused suites: shared 12/12,
mobile 26/26, web 21/21, no skips. Full gates NOT RUN at the required stop;
documentation diff/staged hygiene FRESH PASS. Prior local PASS is not native
acceptance. The source branch intentionally remains at the pre-FS5 source pin;
the existing FS5 Git report explains its separate release clone.
Native physical rendering, lifecycle/performance and live state remain
UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN, skipped entirely.
Owner capture/layer-isolation request is recorded in the report and handoff;
no unattended question, service call, environment-file edit, deploy or push.
Only scoped documentation is committed; exact hash in Git/OX1.status. Owner
paths and Owner Pause preserved. OX2 remains blocked until OX1 has real PASS
evidence. [Acceptance and stop evidence](ai/acceptance/ox1-orb-compositing-integrity.md).
<!-- OX1 end -->

<!-- LP2 begin -->
LP2 / legal discoverability (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed existing LP1 bundled routes and tiny Settings footer links; neither
profile menu exposed legal information. Native/web Settings now have standard
Privacy Policy and Terms of Use rows in About, with version information.
Profile/account menus open Privacy in two taps and retain the existing Terms
cross-link. Phone web reuses the same menu behind a topbar avatar because its
desktop sidebar is hidden. Signed-out/download links and legal copy remain.
Implementation: c6586db4; docs checkpoint hash is in Git and LP2.status.
FRESH forced root typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
lint warnings, zero new. Shared 696/72 files, mobile 1633/171, web 569/75;
explicit web build 23/23 pages and Android HBC export PASS. Root API build
37/37 pages; API tests NOT APPLICABLE (client navigation only). Post-restoration
forced typecheck 8/8, 0 cached, PASS. Unstaged/staged hygiene checks PASS.
Six isolated browser cases and 12 inspected light/dark captures cover native
components through RN Web, phone web and desktop web; both Settings routes,
two profile taps and Terms cross-link pass with no external requests/page errors.
First helper failures, new-warning repairs and two deliberately interrupted
builds are retained in acceptance. Native/physical rendering, actual authenticated
routes and deployed/live state remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, email,
environment-file edit, remote SQL/migration, Scheduler operation, deploy or push.
Original owner paths and Owner Pause preserved. LP2 endpoint reached; no RB9,
release or FULLSEND started.
[Acceptance and exact gates](ai/acceptance/lp2-legal-discoverability.md).
<!-- LP2 end -->

<!-- TB1 begin -->
TB1 / bottom tab press (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed installed Expo Router's borderless Android ripple. Shared tab options
now supply a plain Pressable, discard ripple props and scale the exact icon/label
children to 1.08 with native-driver timing. Return uses the existing 180ms token
and bounded ease, with no overshoot. Release/cancel/blur reset; live Reduce Motion,
background/disabled changes and unmount stop/reset motion. The 48pt fixed targets,
accessibility/ref/selected styles, navigation and existing tab haptic remain.
Website sidebar has no equivalent ripple at phone width; web code change skipped.
Implementation: 5f875a4e; docs checkpoint hash is in Git and TB1.status.
FRESH forced root typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files, mobile 1630/170, web 566/74; explicit web build
23/23 pages and Android HBC export PASS. Root API build 37/37 pages; API tests
NOT APPLICABLE (client feedback only). Post-restoration forced typecheck 8/8,
0 cached, PASS. Unstaged/staged hygiene checks PASS. First typecheck/fixture
failures and repairs are retained in acceptance; no assertions were weakened.
Focused component tests 15/15; local RN Web fixture 8/8 cases, 24 captures,
135 release samples: scale [1,1.08], return about 179-183ms, reduced scale 1.
Baseline child/target geometry is preserved in light/dark and column/row layouts.
Native/emulator/physical rendering/performance and deployed/live state remain
UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN, skipped entirely.
No service call, environment-file edit, SQL/migration apply, Scheduler operation,
deployment or push. Original owner paths and Owner Pause preserved. Finite TB1
endpoint reached; no LP2, release or FULLSEND started.
[Acceptance and exact gates](ai/acceptance/tb1-tab-press-scale.md).
<!-- TB1 end -->

<!-- RS1 begin -->
RS1 / hide-on-scroll search (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed: mobile's shared secondary header animated layout height on JS,
changing the scroll viewport during visibility decisions. Every opted-in Page
(Reviewer, Generate, Library, Today, Tasks and course Tasks) now uses a measured
constant inset and an absolute transform-only header with a header-only mask.
Reanimated owns clamped finger-following motion, drag/momentum snap, top/short
list restoration, focus/query pinning and instant Reduce Motion endpoints.
Native animated accessibility/hit props avoid per-scroll header React updates.
Reviewer jumps/section anchors/answer reveal account for the measured inset.
Phone web Generate/Reviewer use measured overlay slots and 12px hysteresis;
desktop layout remains. Implementation: 7a5043e2; docs hash is in Git/RS1.status.
FRESH forced typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files, mobile 1615/169, web 566/74; separate web
23/23 pages and Android HBC export PASS. Root API build 37/37 pages; API tests
NOT APPLICABLE (client scroll/layout only). Unstaged/staged diff checks PASS.
Four local browser regressions, six direct emulated touch drags, before/after
captures and fixed content coordinates verify local phone scroll behavior.
Failed focused attempts and two deliberately interrupted builds are retained.
Native/emulator/physical behavior, authenticated routes and deployed/live state
remain UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN,
skipped entirely. No service call, environment-file edit, SQL/migration apply,
Scheduler operation, deployment or push. Original owner paths and Owner Pause
preserved. RS1 endpoint reached; no TB1, LP2, release or FULLSEND started.
[Acceptance and exact gates](ai/acceptance/rs1-hide-on-scroll-no-shake.md).
<!-- RS1 end -->

<!-- OL1 begin -->
OL1 / whole-orb loading (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed: the deferred still was replaced before the first GL frame, and
body/aura drew before the asynchronous clock atlas. Web/native now retain one
OT1 palette/theme poster until a complete frame (native: after endFrameEXP),
then crossfade the whole surface over 250ms; Reduce Motion is instant.
Early chunk/atlas loading retains the Three.js split. Failure/timeout keeps the
poster, logs one safe warning and disposes work; late callbacks cannot reveal it.
Generation's change-only reduced-motion pose, gestures, cadence and OG1 remain.
Implementation: e54f11d0; documentation hash is in Git/OL1.status.
FRESH final forced typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files (source plus compiled duplicates), mobile
1617/169, web 561/73; separate web 23/23 pages and Android HBC
export pass. Root API build 37/37 pages; API tests NOT APPLICABLE (decorative
client/loading helper only). Diff/staged checks pass. Failed focused attempts
and the interrupted first build/reduced-motion repair are recorded.
Twelve before/after browser sequences, 164/137 images and 3343/4086 samples:
731 visible partial samples before, zero after; seven loading browser regressions
cover fades, Slow 4G, failure/timeout and Reduce Motion. Production bundle
inspection confirms Three stays outside Today/Generation initial route chunks.
Physical/native appearance/performance, real Next Router/auth/production and
deployed/live state remain UNVERIFIED (owner to confirm). Rollout and Device
checks NOT RUN, skipped entirely. No service call, environment-file edit,
remote SQL/migration, Scheduler, deployment or push. Original unrelated paths
and Owner Pause preserved. OL1 endpoint reached; no later backlog item.
[Acceptance and exact gates](ai/acceptance/ol1-web-orb-loads-whole.md).
<!-- OL1 end -->

<!-- OG1 begin -->
OG1 / standalone Generation glow (2026-10-21): **PASS for the finite unattended local code scope**.
Shared annular mask was confirmed; a clock-radius input or existing canvas
clipping was not found. Explicit standalone lighting begins at .9x body radius,
fades to zero by 1.7x, and has .4998 of clock peak coverage. Padded decorative
layers preserve body/hit sizes and phone no-scroll fit. All Generation,
preparation/Queue, retained KnowledgeCore and static consumers are covered;
Today keeps its prior clock geometry, strength and appearance.
Implementation: `0e06266f`; documentation hash is in Git/OG1.status.
FRESH final typecheck/lint/root build: 8/8 each, 0 cached; six existing lint
warnings. Shared 688/70 files (344 source cases plus compiled duplicates),
mobile 1612/169, web 550/72. Separate web build 23/23 pages and Android HBC
export pass; root API build 37/37 pages. Both diff checks pass. First focused
measurement failures and two repaired duplicate-import warnings are recorded.
16 baseline/after web captures per run and eight full Generation page captures
cover light/dark pearl/gold at phone/desktop sizes. GPU core differences and
border alpha are zero; standalone source-sector correlations and overlap pass.
Native component and full viewport/gesture regressions pass. Native/emulator/
physical appearance and performance remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, environment
file edit, remote SQL/migration, Scheduler operation, deployment or push.
Original unrelated paths and Owner Pause preserved. OG1 endpoint reached;
OL1 and all later backlog items were not started.
[Acceptance and exact gates](ai/acceptance/og1-standalone-generation-glow.md).
<!-- OG1 end -->

<!-- OT1 begin -->
OT1 / Today orb theme sync (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed cause: the shared clock compositor applied a .78 black scrim in light
mode; theme propagation already worked. Shared palette/theme appearance now
drives both bodies, static fallbacks and Queue. Light clock ink replaces the
black scrim; live theme changes retain the scene and momentum. OR4 storage,
gestures, Reduce Motion and accessible real time text remain.
Implementation: `45526e95`; documentation hash is in Git/OT1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; six existing
lint warnings. Shared 682/70 files (source + compiled duplicates), mobile
1611/169, web 546/72. Separate web build 23/23 pages and Android HBC
export pass; root API build 37/37 pages. Both diff checks pass. Eight actual web
Today/Generation light/dark pearl/gold captures were inspected; GPU contrast and
live canvas identity pass. First typecheck failure and repairs are retained.
Native/physical appearance and live state remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, environment
file edit, remote SQL/migration, Scheduler change, deployment or push. Original
unrelated paths and Owner Pause preserved. OT1 endpoint reached; no later item.
[Acceptance and exact gates](ai/acceptance/ot1-today-orb-theme-sync.md).
<!-- OT1 end -->

<!-- GV1 begin -->
GV1 / Generation viewport (2026-10-20): **PASS for the finite unattended local code scope**.
Native detail and pre-admission pages use measured non-scroll flex space, with
an intact responsive orb/fallback and bounded full details/errors/actions.
Enlarged short layouts keep concise state labels and full status in details;
background-work copy waits for acceptance. Phone web uses the dynamic viewport
and a bounded dialog; desktop retains both panes. Jobs, OP2 and picker scrolling
are preserved. Implementation: `8b37b5ae`; documentation hash is in Git/GV1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; six existing
lint warnings. Shared 670/68 files (335 source + compiled duplicates), mobile
1600/169, web 540/72. Equivalent final root API/web builds generate 37/37 and
23/23 pages; Android HBC export and diff/staged checks pass. Native component
bounds cover 66 state/viewport combinations via RN Web, including safe insets,
landscape and 200% text. Actual web bounds, gestures, screenshots and OP2
clock/wave/backdrop browser checks pass. Failed attempts and the stronger final
native audit are retained. Native rendering/physical acceptance and live state
remain UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN,
skipped entirely; Realme disconnected. No service call, environment-file edit,
remote SQL/migration, Scheduler operation, deployment or push. Original unrelated
paths and Owner Pause are preserved. Finite GV1 endpoint reached; no later work.
[Acceptance and exact gates](ai/acceptance/gv1-generation-viewport.md).
<!-- GV1 end -->


<!-- OP2 begin -->
OP2 / Larger glass clock, cumulative waves and source-faithful backdrop
(2026-10-20): **PASS for the finite unattended local code scope**. Time is 40
pixels/points across idle/drag/fallback, with refracted source shading and
proportional AM/PM. Eight bounded overlapping waves build strength smoothly;
a 64x64 RGBA GPU capture drives the backdrop from resolved color AND opacity.
Today, Generation preparation/detail, retained KnowledgeCore and existing
static/Queue sources are covered. Jobs, gestures, synced palettes and render
cadence remain; no extra animation loop or production pixel readback.
Implementation: `9e17fd4d`; documentation hash is in Git/OP2.status.
FRESH PASS: forced typecheck/lint/build 8/8 workspaces each, 0 cached; six
existing lint warnings. Shared 670/68 files (includes compiled duplicates;
335 source cases), mobile 1581/166, web 532/72. API/web builds 37/37 and 23/23
pages and Android HBC export are supplied by the equivalent fresh root build.
Diff/staged checks pass. Real GPU pixels, screenshots, before/after motion
frames and CPU submission/resource observations were inspected; failed attempts
and repairs are retained. Rollout and Device checks NOT RUN, skipped entirely.
Deployed/live state and physical Android appearance/performance remain
UNVERIFIED (owner to confirm). No service call, environment-file edit, remote
SQL/migration, Scheduler, deployment or push. Unrelated paths and Owner Pause
are preserved. OP2 ends here; GV1 is separate and has not started.
[Acceptance and exact gates](ai/acceptance/op2-orb-polish.md).
<!-- OP2 end -->


<!-- OA1 begin -->
OA1 / Orb ambient light (2026-10-20): **PASS for the finite unattended local
code scope**. Shared procedural spill follows final body palette, liquid motion,
spin, day light and state in all four GL scenes. Today/Generation, retained
KnowledgeCore, static fallbacks and Queue miniature sources are covered. Body,
glass clock, gestures, synced choices, layout and render rates are preserved;
Reduce Motion is stable and hidden/unfocused/disposed work stops.
Implementation: 3b1abbbb, 50cf0103; documentation hash in Git/OA1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 330/34 source files (default suite 660/68 including compiled
duplicates), mobile 1581/166, web 524/72. Final root build supplies equivalent
API 37/37 pages, web 23/23 pages and Android export gates. Diff checks pass.
Local screenshots/videos, real GPU pixel checks, clock/gesture checks and CPU
submission/resource observations are recorded; failed first attempts retained.
Rollout and Device checks NOT RUN; physical/reference visual parity, performance
and deployed/live state UNVERIFIED (owner to confirm). No service call, remote
SQL/migration, Scheduler, environment-file edit, deployment or push. Original
untracked paths and Owner Pause preserved. OA1 ends here; supervisor review and
separately published OA2 remain owner work.
[Acceptance and exact gates](ai/acceptance/oa1-orb-ambient-glow.md).
<!-- OA1 end -->


<!-- WX1 begin -->
WX1 / Website saved study exports (2026-10-19): **PASS for the finite
unattended local code scope**. Pure layout/PDF/DOCX/PPTX builders now live in
`@stay-focused/shared/study-export`; mobile retains SAF saves. The website
lazily downloads Reviewer PDF (with existing TXT retained) and saved Draft
PDF/DOCX/PPTX. Unsaved Draft edits disable export with the save-first hint;
exports use the confirmed save response. Existing menu/aside, tokens, busy
locks and safe Notices are used; no API/schema or motion change.
Commits: 255081e3 (shared/mobile), f787b490 (web); docs hash in Git/WX1.status.
FRESH PASS: forced typecheck/lint/root build 8/8 tasks each, 0 cached;
6 existing lint warnings. Shared 643/65 files, API 2452/213 files with
3 intentional live skips, mobile 1582/166 files, web 515/71 files.
API/web builds 37/37 and 23/23 pages; Android export and diff checks pass.
Original builders are identical after import-path normalization; the web builder
chunk is absent from all initial page bundles. First failures/retries are
recorded in acceptance. Rollout and Device checks NOT RUN, skipped entirely;
live deployed state and actual viewers are UNVERIFIED (owner to confirm).
No service call, deployment, remote SQL/migration, Scheduler, environment-file
edit or push. Unrelated paths and Owner Pause remain; no later task started.
This supersedes earlier WX1-unstarted checkpoint notes without resuming FULLSEND.
[Acceptance and exact gates](ai/acceptance/wx1-web-study-export.md).
<!-- WX1 end -->

<!-- FULLSEND recovery begin -->
FULLSEND recovery (2026-10-19): **BLOCKED before step 1**. WA1 is recovered and
locally committed (3fe40518, 1a808907), with all final-code gates FRESH PASS.
First release prerequisite failed: Vercel CLI 64.5.0 `whoami --json
--non-interactive` exited 1, `loggedIn: false`. Release work stopped. GitHub main
is 384173c0; no main integration, push, deployment, EAS APK or adb install was
performed. FULLSEND config remains unchanged/unconfigured. The owner must log
in locally before a new attempt prepares/reviews main and runs fresh release
gates from step 1. Owner Pause and unrelated files remain unchanged; WX1 was
not started. [Local blocker/evidence](ai/acceptance/fullsend-recovery-20261019.md).
<!-- FULLSEND recovery end -->

<!-- WA1 begin -->
WA1 / Website password recovery (2026-10-19): **PASS for the finite unattended
local code scope**, recovered from interrupted bb1ed7fe on Windows. Implementation
3fe40518 adds sign-in-only reset requests, a public reset screen, owner-bound
recovery persistence and callback routing for malformed/expired recovery links.
Normal sign-in/OAuth and server bearer-JWT/ownership boundaries remain unchanged.
FRESH PASS on final code: forced typecheck/lint/root build 8/8 each, 0 cached;
6 existing lint warnings. Shared 632, API 2452 / 3 intentional live skips,
mobile 1587, web 502 tests / 69 files (20 local browser cases). API/web builds
37/37 and 23/23 pages, Android export and diff checks pass. Four screenshots
reviewed at 1440/390. Prior failed assertions and the interrupted export are
retained in acceptance. Generated Next declarations restored after inspection;
unrelated UI/, mobile .gitignore and supabase/.temp/ remain untouched.
Rollout and Device checks NOT RUN for WA1; live redirect allowlist, email template
and real recovery round trip UNVERIFIED (owner to confirm). Owner Pause remains
set; no surviving WA1 worker, queue restart or later task. The separate owner
FULLSEND request is authorized but still requires its own reviewed main candidate,
prerequisites and fresh release gates; these local checks are not release proof.
[Acceptance](ai/acceptance/wa1-web-password-reset.md).
<!-- WA1 end -->

<!-- GL1 begin -->
GL1 / Today glass clock (2026-10-19): **PASS for the finite unattended local
code scope**. Both apps use one shared MSDF refraction composite in the existing
orb view, with bundled Inter 700 time and plain 600/500 captions. Weekday is
removed; idle time is centered and dragged time updates next frame. Accessible
real time, static/plain fallbacks and Reduce Motion remain. Inter and clock-glass
exceptions are documented in ADR-049 and design typography documentation.
Commits: c4329a3f, 2afd2e41, 18e2967c, dec26802, cba28643, e00dd0ea; docs hash in Git/status.
FRESH PASS: forced typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing
lint warnings. Shared 632, API 2452 / 3 intentional live skips, mobile 1587,
web 451 tests pass. Browser clock checks 10/10, 8 screenshots at 1440/390 in
both themes; bright-pearl stroke-contrast regression passes. API/web builds
37/37 and 22/22 pages, local Android export and diff checks pass. Mobile keeps
0.6 render scale and 80ms idle/16ms interaction cadence. Local renderer.info
shows 1 -> 3 draw calls with ~83ms idle interval; CPU submission timing is not
GPU or Realme proof. Draft failures are retained in acceptance. Rollout and
Device checks NOT RUN, skipped entirely; deployed/physical state UNVERIFIED
(owner to confirm). No prohibited service call, deployment, remote SQL/migration,
Scheduler operation, environment-file edit or push. Prior untracked paths
preserved; no later task started. [Acceptance](ai/acceptance/gl1-glass-clock.md).
<!-- GL1 end -->

<!-- OF1b begin -->
OF1b / automatic offline saving (2026-10-19): **PASS for the finite unattended
local code scope**. STEP 0-3, tests, all 10 prompt gates, additional forced root
build, documentation and local commits complete. Baseline 9bf8335; branch
overnight/2026-10-15_feedback retained. OF1b owner answers supersede OF1's STOP.
AppLifecycle remains owner; the Library joins. Limited body runs automatically
continue, transient errors back off, and local SQLite migration 10 records
version-bound permanent failures on existing artifact rows. Per-item
notifications drive current/total/failedPermanent captions on both Library
surfaces. Sync/generation changes arriving mid-flight request a later list
recheck. Inventory walks beyond ten pages. No NetInfo/shared reconnect listener
exists; foreground/session restoration plus idle active retries are the approved
fallback. OI1 image scheduling/caps/cleanup and image-aware readiness remain.
Both caption twins have exact wording; web has no offline mode or caption caller.
Commits: 5bc6652 (mobile), 9a38527 (web); docs hash in Git/OF1b.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 596, API 2433 / 3 intentional live skips, mobile 1546, web 391
tests pass. API/web builds 36/36 and 22/22 pages; Android export and diff checks
pass. Failed first attempts and final verification repeats are recorded.
Rollout and Device checks NOT RUN, skipped entirely; live state and physical
reconnect behavior UNVERIFIED (owner to confirm). No deployment, external call,
remote SQL/migration, Scheduler, email, environment-file edit or push. Original
untracked paths preserved. No later task started; owner rollout/device review
remains. [Acceptance and exact gates](ai/acceptance/of1b-offline-continuation.md).
<!-- OF1b end -->


<!-- AN1b begin -->
AN1b / announcement read on open (2026-10-19): **PASS for the finite unattended
local code scope**. STEP 0-3, both apps, regression tests, all 10 prompt gates,
additional forced root build, docs and local commits complete. Baseline ebcf59c;
branch overnight/2026-10-15_feedback retained. Owner answers supersede AN1's
row-write conflict: mobile row taps and swipes stay unchanged. Both detail
screens now wait for resolved/displayed data and the preference owner, then
mark once per opened id/owner. Explicit unread persists until a new open.
Stores keep existing per-device/browser owner keys and notifications; actual
mounted list/Today tests prove immediate dot/count/card updates. No hydration
overwrite, owner loss, id mismatch or stale Today subscription reproduced.
The symptom most likely reflects older deployed builds: UNVERIFIED (owner to
confirm), not a live diagnosis. No Today implementation change needed.
Commits: 50d4ccc (mobile), e881082 (web); docs hash in Git/AN1b.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 596, API 2433 / 3 intentional live skips, mobile 1535, web 387
tests pass. API/web builds 36/36 and 22/22 static pages; Android export and
diff hygiene pass. New regressions 6 mobile / 5 web; failed first attempts and
web browser-teardown flake recorded. No platform feature skipped, dependency,
API, schema, release-version, motion or ADR change. Owner steps: Rollout and
Device checks NOT RUN, skipped entirely; verify Realme/website, notification,
deep-link and direct URL flows later. Live state UNVERIFIED (owner to confirm).
No deployment, remote SQL/migration, Scheduler, email, environment-file edit or
push; unrelated owner paths preserved. Endpoint AN1b only; no later task started.
[Acceptance and exact gates](ai/acceptance/an1b-announcement-read-on-open.md).
<!-- AN1b end -->

<!-- LP1 begin -->
LP1 / privacy and terms (2026-10-19): **PASS for the finite unattended local
code scope**. Baseline be9d5dc, branch overnight/2026-10-15_feedback retained.
STEP 0-4, shared structured copy, public server-rendered web routes, bundled
offline native root routes, caption footer links and sign-up agreement notices
are complete. Both apps use one dated source and contact constant. No required
platform skipped, new dependency, API, schema, motion or ADR change.
Implementation commits: 451b58c, 0aacc1c, 12e4aa2; docs hash in Git/LP1.status.
FRESH PASS: all 10 prompt gates; typecheck/lint/root build each 8/8 tasks,
0 cached; 6 existing lint warnings. Shared 593, API 2433 / 3 intentional live
skips, mobile 1529, web 382 tests; API 36/36 and web 22/22 static pages,
Android export and diff hygiene pass. Local Playwright 13/13, including both
legal routes signed out at 1440/390 in light/dark, footer navigation and
JavaScript-disabled content; 0 legal API/external requests or page errors.
Failed first attempts are recorded. Generated declarations restored; unrelated
owner paths preserved. Rollout/Device checks NOT RUN, skipped entirely;
live state UNVERIFIED (owner to confirm). No remote call, deployment, migration
application, Scheduler operation, environment-file edit or push.
Owner must review wording/contact before publication and later use the public
privacy URL in Play Console. Not reviewed by a lawyer. Endpoint LP1 only;
no later slice or previously stopped task resumed. [Acceptance](ai/acceptance/lp1-legal-pages.md).
<!-- LP1 end -->


<!-- OR3b begin -->
OR3b / orb momentum, ring spin, ripple and pearl (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-5, both apps, regression tests,
all 10 prompt gates, additional forced root build, docs and local commits
complete. Baseline 6cfeabb; branch overnight/2026-10-15_feedback retained.
OR3b's explicit owner answer resolves OR3's prior requirements STOP: one
0.4-second friction constant, 0.01 rad/s cutoff; 6 rad/s stops at 2.56s and
1 rad/s at 1.85s in the 10ms model tests. Smoothed samples preserve decayed
velocity through held pauses. Physical ring moves feed Y spin at gain 3;
release snapping never pushes spin. Ring input and coast bypass native page
pause. Both shaders use a 900ms great-circle ripple and matching normals;
Reduce Motion suppresses ripple/momentum and keeps deliberate still poses.
Pearl is existing #E6EAF1; stable sf.orb.colorKey migration preserves all four
old choices and handles queued writes/late hydration safely. Approved glow
fallback: remove the Today aura on both apps and native SVG halo after the
installed Stop API probe; generation aura matches the body's idle fade and
restores authoritative state tint. No new native module/dependency/token.
Commits: d0a4c65, 4c3fdbe, 1a0b512, 445fcb2f; docs hash in Git/OR3b.status.
FRESH PASS: typecheck/lint/root build each 8/8 tasks, 0 cached; 6 existing lint
warnings. Shared 610, API 2433 / 3 intentional live skips, mobile 1558, web 411
tests; API/web 36/36 and 22/22 pages; Android export and diff hygiene pass.
Local WebGL 5/5 and native Stop probe 2/2 PASS. Failed first attempts recorded.
Rollout and Device checks NOT RUN, skipped entirely. Live state, deployed
revisions and physical feel/power UNVERIFIED (owner to confirm). No remote
call, SQL/migration application, Scheduler, email, deployment, environment-file
edit, branch switch or push. Original unrelated paths preserved. Endpoint
OR3b only; no later task started. [Acceptance and exact gates](ai/acceptance/or3b-orb-interaction.md).
<!-- OR3b end -->

<!-- OR4 begin -->
OR4 / orb color sync between phone and website (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-4, both apps, tests, all 10 prompt
gates, docs and local commits complete. Baseline 34ab2f4d; branch
overnight/2026-10-15_feedback retained. Migration **file only, not applied**:
packages/db/migrations/20261018000301_profile_preferences.sql adds nullable
user_profiles.orb_color (check on pearl/gold/green/violet/orange; null = pearl)
plus a DB-time orb_color_updated_at trigger (last write wins by server time),
and extends the column-level authenticated select grant. GET/PATCH
/api/profile/preferences: verified bearer, owner-scoped service upsert,
1 KiB bounded strict body, private no-store, invalid key 400, missing
column/stale schema mapped to typed 503 profile_preferences_unavailable. Shared
parseProfilePreferences reuses OR3 palette keys; OrbPreferenceSync is one
serialized per-owner queue. Both clients render the cached key at once, PATCH
600ms after the last tap (one request for fast taps), keep a durable
per-owner pending value for reconnect, never revert on failure, and silently
stay local-only while unavailable. Server values use the existing OR2 color
cross-fade (instant under Reduce Motion). Mobile refreshes on start, sign-in,
foreground and a 15s active retry; web on load, focus, visibility, online and
a 15s visible retry. No new dependency, token or native module.
Commits: e2124bd6, bb5352ea, d84e058b, 4197bb95, a0d2d8bc, 78c8dd0c, 7fc55b7d;
docs hash in Git/OR4.status.
FRESH PASS: typecheck/lint each 8/8 tasks, 0 cached; 6 existing lint warnings.
Shared 614, API 2452 / 3 intentional live skips, mobile 1567, web 417 tests;
API/web/Android builds and diff hygiene pass. First API run had 2 timeout
flakes in unrelated files (34/34 isolated, full rerun green).
Rollout and Device checks NOT RUN, skipped entirely. Applied migration,
deployed revisions and phone/browser sync UNVERIFIED (owner to confirm). No
remote call, SQL/migration application, Scheduler, email, deployment,
environment-file edit, branch switch or push. Original unrelated paths
preserved. Endpoint OR4 only; no later task started. [Acceptance and exact gates](ai/acceptance/or4-orb-color-sync.md).
<!-- OR4 end -->

<!-- WGP2 begin -->
WGP2 / generation orb and vertical step bar (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-4, both apps, tests, all 10
prompt gates, docs and local commits complete. Baseline 2480cf14; branch
overnight/2026-10-15_feedback retained. STEP 0 Playwright repro (real
GenerationScreen, 1440/390): the canvas mounts, the ball-only target receives
the pointer and a tap stores the next color, but generation states hid the
idle color, so taps looked dead. Web and mobile generation screens (and the
Queue generation view) now render the Today DayOrb, which gains an optional
state: the Knowledge Core's coreModel excess over idle while running, the
existing desaturated tint and stillness on failure, and a brief brighten then
idle on completion. Today is unchanged without a state; Reduce Motion snaps.
Web: numbered list replaced by a 3px segmented track (done --success, failed
--danger, pending --line), a 1.6s sweep on the current segment (steady half
fill under RM), sr-only state words, real section fill and count under
Building study material, and stepRevealQueue ticks multi-stage jumps at 180ms
without ever running ahead of the server or delaying Library. Mobile: a thin
pill bar under the status line with the shared skeleton shimmer and the
same count caption. Commits: 0aeb7177, d1231c6a, 392ca412, 3bef7b33,
4063c883; docs hash in Git/WGP2.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing
lint warnings. Shared 614, API 2452 / 3 intentional live skips, mobile 1580,
web 435 tests (first web run 430 / 5 fail on a test window stub, repaired);
API/web builds 37/37 and 22/22 pages; Android export and diff hygiene pass.
Rollout and Device checks NOT RUN, skipped entirely. Deployed revisions and
physical appearance UNVERIFIED (owner to confirm). No remote call,
SQL/migration, Scheduler, email, deployment, environment-file edit, branch
switch or push. Endpoint WGP2 only; no later task started. [Acceptance and exact gates](ai/acceptance/wgp2-generation-orb-step-bar.md).
<!-- WGP2 end -->


<!-- OF1 begin -->
OF1 / automatic offline saving (2026-10-19): **STOPPED at STEP 0**, under
the prompt's overriding UNATTENDED rules 3-4. Baseline `09e53dd`, branch
`overnight/2026-10-15_feedback` retained. Implementation contradicts the
assumed focus-cancelled job: AppLifecycle already starts owner-scoped catch-up
on sign-in/foreground; Library blur aborts only its own remote fallback, not
the shared catch-up controller. Body hydration instead has a 60-second budget
and 300-attempt cap, with no automatic continuation after a limited run;
notifications occur after batches of up to 20. This changes the required fix.
No product code changed; implementation/tests/build gates NOT RUN after STOP.
Documentation diff hygiene checked separately. Owner must resolve the recorded
scope question before work resumes. Rollout/Device checks NOT RUN, skipped
entirely; deployed behavior/state UNVERIFIED (owner to confirm). No remote call,
deployment, environment-file edit, migration application or push. Full findings
and exact owner question are in the latest OF1 handoff footer.
<!-- OF1 end -->

<!-- IV1 begin -->
IV1 / reviewer image viewer (2026-10-19): **PASS for the finite unattended local
code scope**. Endpoint: STEP 0, web/mobile implementation, tests, all 10 prompt
gates, additional forced root build, docs and scoped local commits. Baseline
`c448c21`, branch `overnight/2026-10-15_feedback` retained. Web: slider
removed; point-origin 1x/2.5x tap zoom, transform pan with fitted-image clamps,
pointer-release touch handling, keyboard toggle, 200ms motion / instant Reduce
Motion. Mobile: single-tap 1x/2.5x parity, retained 1x-4x pinch/pan and modal
isolation. Both: question-circle vectors, Ask above Save, equal full-width
48px/pt rows, 8px/pt gap and offline note below. Shared Ask retains sign-in.
FRESH PASS: shared 590, API 2433 / 3 intentional live skips, mobile 1527,
web 378; final typecheck/lint 8/8 tasks each, 0 cached; 6 existing warnings.
API/web builds, Android export, root build 8/8 / 0 cached and diff hygiene
pass. Final web rebuild follows the last measurement refinement. Browser web
6/6 and native-web layout 6/6 combinations pass, zero unexpected requests/page
errors; screenshots inspected. Failed attempts recorded. Optional web pinch/
wheel omitted; no required platform skipped, dependency/API/schema/ADR change.
Rollout/Device checks NOT RUN, skipped entirely. Live/physical state UNVERIFIED
(owner to confirm). No remote operation, environment-file edit or push.
Next: owner rollout and real website/Realme checks. IV1 endpoint only;
no later slice started or AN1 resumed. [Acceptance](ai/acceptance/iv1-reviewer-image-viewer.md).
<!-- IV1 end -->

<!-- RV3 begin -->
RV3 / reference topic level pill (2026-10-19): **PASS for the finite unattended
local code scope**. Frozen endpoint complete: STEP 0-3, mobile/web/shared-reader
presentation, regressions, 10/10 prompt gates, forced root build, docs and local
commits. Baseline `829b8fb`, branch `overnight/2026-10-15_feedback` retained.
Mobile `61cbb03`: measured native translation / layout width, 200ms ease,
instant Reduce Motion, neutral content-width rounded track and inset thumbs.
Web `d1df22b`: measured CSS translation/width, ResizeObserver, reduced-motion
override, focus-visible radios/keyboard navigation, independent Expound, no
divider. Both retain regular primary labels and RV2 short labels. Shared-reader
links preserve sign-in-only behavior and display the same Original thumb.
40pt/px visual tracks retain >=44pt/px targets. No platform implementation skipped.
FRESH PASS: shared 590, API 2433 / 3 intentional live skips, mobile 1525, web 374;
typecheck/lint/root build 8/8 tasks each, 0 cached; six existing lint warnings.
API/web builds, Android export and diff hygiene pass. Focused mobile 12/12,
web 36/36; isolated web Playwright 54/54, mobile RN Web layout/theme 8/8, zero
requests/page errors. Screenshots inspected. Tooling retries are recorded;
no unit/gate failure or nondeterministic flake. No API/schema/dependency/ADR
change. Generated declarations restored; original owner paths preserved.
Rollout/Device checks NOT RUN, skipped entirely; live/physical state UNVERIFIED
(owner to confirm). No remote call, environment-file edit, deployment or push.
Next: owner rollout/reference comparison on Realme and actual web, light/dark.
RV3 supersedes RV2 presentation; its generation and independent-toggle behavior
remain. Endpoint RV3 only; no later task started or AN1 resumed.
[Acceptance](ai/acceptance/rv3-topic-pill.md).
<!-- RV3 end -->

<!-- GS1 begin -->
GS1 / Generate course search on scroll (2026-10-19): **PASS for the finite
unattended local code scope**, baseline `149a516`, branch
`overnight/2026-10-15_feedback`. Mobile `b5a0d04` opts SnapshotStatus/search
into existing SH2b Page motion; focus or any raw query holds it visible.
Web `5886a0b` adds a 12px-direction hook and sticky search only at <=760px,
200ms ease / instant Reduce Motion, focus/query pinning and hidden accessibility
exclusion. Connection/status controls stay in normal flow; desktop retains its
original layout. Native refresh is preserved. No platform implementation skipped.
FRESH PASS: 10/10 prompt gates; forced typecheck/lint/root build each 8/8
tasks, 0 cached; 0 lint errors / 6 existing warnings. Shared 590, API 2433
with 3 intentional live skips, mobile 1522, web 373 tests; API/web builds,
Android export and diff hygiene pass. Focused mobile 128, web 27; synthetic
CSS/accessibility 4/4 widths, 0 network requests. Failed first attempts recorded.
No API/schema/dependency/ADR change. Generated declarations restored; owner
paths preserved. Rollout/Device checks NOT RUN, skipped entirely; live state
UNVERIFIED (owner to confirm). No remote service call, environment-file edit,
deployment or push. Endpoint GS1 only; owner rollout/Realme/web checks remain.
[GS1 acceptance](ai/acceptance/gs1-generate-course-search-scroll.md).
<!-- GS1 end -->

<!-- GB1 begin -->
GB1 / generation action spacing (2026-10-19): **PASS for the finite unattended
local code scope**, baseline `795fbba`, branch `overnight/2026-10-15_feedback`.
Implementation `e1b4979` puts all mobile actions in one centered 240pt column,
12pt gaps and 16pt top space; artifact first, reconnect included, at most one
primary. Pills now have 20pt horizontal padding and retain 48pt minimum height.
Web uses 12px gaps, 20px horizontal padding and 48px minimum height, retaining
WGP1 full pane width and its existing 24px top separation; stalled Queue is
secondary. Visibility, handlers, generation lifecycle and navigation preserved.
FRESH PASS: all 10 requested gates; typecheck/lint 8/8 tasks each, 0 cached,
0 lint errors / 6 existing warnings; shared 590, API 2433 / 3 intentional live
skips, mobile 1521, web 364 tests. API/web builds, Android export, diff hygiene
and additional forced root build (8/8, 0 cached) pass. Synthetic CSS geometry
4/4 widths passes; failed first attempts retained in acceptance. No API,
database, dependency, motion or ADR change. Rollout and Device checks NOT RUN,
skipped entirely; live/device state UNVERIFIED (owner to confirm). No remote
operation, environment-file edit or push. Endpoint GB1 only; AN1 remains
separately STOPPED. [GB1 acceptance](ai/acceptance/gb1-generation-action-spacing.md).
<!-- GB1 end -->

<!-- AN1 begin -->
AN1 / announcement read-on-open preflight (2026-10-19): **historical STOPPED
checkpoint, superseded by AN1b above**. Commit 795fbba preserved the original
row-write conflict without application changes. Owner's AN1b answers retain
mobile row-tap marking and authorize resolved-data once-per-open detail guards
on both apps. The original question is resolved; AN1b implements and tests the
revised scope. Historical evidence remains in the AN1 acceptance/handoff.
<!-- AN1 end -->

<!-- LG1 begin -->
LG1 / hidden Canvas files linked from visible sources (2026-10-19): **PASS**
for the finite unattended local code scope, baseline f709843, branch
overnight/2026-10-15_feedback retained. STEP 0-6, tests/gates/docs/local commits
complete. Shared effective policy requires current published, visible source
evidence. Course-batched reads, next-sync stale-status repair and preparation
through the existing 200-per-sync guard cover source status, previews and
snapshots. Both clients consume corrected API state; no client UI, migration,
dependency or ADR change. Finalize health records lack reference context and
retain the prompt's explicit exception; they do not gate material generation.
Commits: d318a09, ddcaef1, b345138; documentation hash in Git/LG1.status.
FRESH PASS: 10/10 requested gates. Forced typecheck/lint each 8/8 tasks, zero
cached; six existing lint warnings, zero errors. Shared 590/590 (56 files),
API 2433 passed / 3 intentional live skips (212 files, final committed-tree
rerun), mobile 1511/1511 (158 files), web 363/363 (55 files). API build 36/36
static pages, web 20/20, Android local export and diff hygiene pass. Additional
AUTOPILOT forced root build passes 8/8 tasks, zero cached, including local
Android/iOS/web exports. Failed first attempts are recorded in acceptance;
no nondeterministic flake. Generated declarations restored; owner paths untouched.
Rollout and Device checks NOT RUN, skipped entirely. Production state remains
UNVERIFIED (owner to confirm). No external service call, deployment, remote SQL,
Scheduler operation, environment-file edit or push. Next: owner rollout, SOC SCI
103N Realme/website sync/preparation/generation and read-only 14-row check.
[LG1 acceptance](ai/acceptance/lg1-page-linked-hidden-files.md).
<!-- LG1 end -->

<!-- UC3 begin -->
UC3 / APK release pipeline (2026-10-19): **PASS** for the finite local code
scope, baseline `0037a3a`, branch `overnight/2026-10-15_feedback` retained.
Endpoint: STEP 0-4, tests/gates/docs/local commits only. The update-checker
roadmap's UC1/UC2/UC3 code scope is complete; **RB7 is Fely's rollout**.
The publisher defaults to a side-effect-free dry run, imports the exact shared
release parsers, guards app.json mismatches, and tests publishing through
injected operations only. Runbook covers fullsend native APK versus OTA,
verified built versionCode under EAS remote versioning, and minSupported.
Implementation commits: `7e6f274` (script), `ece3721` (tests), `1dc1c20`
(runbook/ADR-051, linked from mobile device runbook and ADR-050).
FRESH PASS: **8/8 prompt gates**; Node publisher 27/27, shared 590/590 (56
files, existing emitted copies included), API 2404 passed / 3 intentional live
skips (210 files, two workers). Forced typecheck/lint each 8/8 tasks, zero
cached, six existing lint warnings and zero errors. API build 36/36 pages;
empty named APK dry run exits 0 with v2.2.0+6 argv; diff hygiene passes.
Additional forced root build passes 8/8 tasks, zero cached, including API/web
and local Android/iOS/web exports. No failed gates or nondeterministic flakes.
Rollout and Device checks NOT RUN, skipped entirely. Real publish mode NOT RUN;
no real gh runner, service call, deployment, remote SQL, Scheduler operation,
environment-file edit or push. Live release/artifact, EAS actual built metadata,
deployed revisions, remote-ref freshness, database/Scheduler and device state
remain **UNVERIFIED (owner to confirm)**. No mobile implementation, version,
runtime, dependency or migration change. Generated declarations are restored;
expected owner paths remain untouched. Next: owner RB7 and first use of the
publisher at a real native release, with no fake test release.
[Acceptance](ai/acceptance/uc3-apk-release.md); [runbook](dev/android-release-runbook.md).
<!-- UC3 end -->

<!-- UC2 begin -->
UC2 / public Android download page (2026-10-19): **PASS** for the finite local
code scope, baseline `c958cc1`, branch `overnight/2026-10-15_feedback` retained.
Endpoint: UC2 STEP 0-5, tests/gates/docs/local commits; UC3 completion is recorded above.
Public `/download` validates UC1 API metadata and shows version, UTC date,
plain notes, one APK action, local QR and installation steps. `/release`
redirects; auth entry points and the existing account menu link to download.
Mobile About shares the website download URL using the existing origin config.
Main implementation: `053beb6` (web), `eef9c67` (mobile). Showcase's existing
CTA is updated in ignored local clone `.local/showcase-download-link`, branch
`download-link`, commit `77dd54b`; no push or PR was performed.
FRESH PASS: all 10 prompt gates; shared 588/588, API 2404 passed/3 intentional
live skips, web 363/363, mobile 1511/1511; forced typecheck/lint 8/8 tasks each,
zero cached, six existing lint warnings. API 36/36 and web 20/20 static pages,
Android export, extra forced root build 8/8 tasks (zero cached, including local
Android/iOS/web exports), showcase build, diff hygiene, local browser 9/9.
Failed harness launches and clone commit attempt are recorded in acceptance.
Rollout and Device checks NOT RUN, skipped entirely; live production/release,
remote-ref freshness, database/Scheduler and physical-device behavior remain
**UNVERIFIED (owner to confirm)**. No deployment, production-service call,
remote SQL, Scheduler action, environment-file edit or push. Owner rollout,
Realme/QR/native-share checks and showcase push/PR remain. UC3 release automation is complete above; RB7 is Fely's rollout. [Acceptance](ai/acceptance/uc2-download-page.md); ADR-050 amended.
<!-- UC2 end -->

<!-- UC1 begin -->
UC1 / in-app update checker (2026-10-19): **PASS** for the finite local
code scope, baseline `7506d51`, branch `overnight/2026-10-15_feedback`.
Endpoint: UC1 STEP 0-6, tests/gates/docs/local commits only. Shared release
parsing/runtime comparison and the public API route are complete; mobile has
a persisted twelve-hour checker, one Today banner with version dismissal,
online-only minimum-supported sheet and Settings About/manual checks/notes.
No new native module, dependency, runtime or version-code change. Metadata
fetches are bounded; server cache is ten minutes with stale/204 fallback.
Implementation commits: `71e7a51`, `d24112c`, `e239af3`, `092fde0`,
`e48b8c5`, `8375004`, `62085d3`, `1ffcd06`.
FRESH PASS: shared 576/576 (source plus existing emitted copies), API 2404 passed /
3 intentional live skips, mobile 1503/1503; final forced typecheck/lint 8/8 tasks
each, zero cached, six existing lint warnings; API build 36/36 pages and Android
local export. Additional forced root build passes 8/8 tasks, zero cached,
including API/web and Android/iOS/web exports; final diff hygiene passes.
Rollout and Device checks NOT RUN, skipped entirely. Live release, production,
remote refs and phone behavior UNVERIFIED (owner to confirm); no remote service
operation, deployment, SQL, Scheduler change, environment-file edit or push.
Owner rollout/device acceptance remains separate; UC2 status is recorded above.
UC3 release automation completion is recorded above. [Acceptance](ai/acceptance/uc1-update-checker.md); ADR-050 in `docs/adr/`.
<!-- UC1 end -->

PAR1b / web-mobile parity audit (2026-10-19): **PASS for the finite docs-only source audit**, baseline `796e312` on `overnight/2026-10-15_feedback`, endpoint PAR1b only. Completed 54 source-backed feature rows and 16 gaps ranked by student impact; both platforms have file:line evidence, with partial behavior and roadmap mismatches explicit. Expected untracked owner paths remain untouched. FRESH PASS: `git diff --check` (1/1 prompt gate, 0 errors), docs-only scope (1/1, five docs paths), source-link/line validation; build/typecheck/lint/application tests NOT APPLICABLE. One local commit `docs: complete web vs mobile parity audit`; exact hash in Git and `tmp/overnight/PAR1b.status`. Rollout/Device checks NOT RUN, skipped entirely; live/deployed/migration/provider/Scheduler/device state UNVERIFIED (owner to confirm). Supersedes the prior PAR1 preflight-only record; owner exception is resolved. Next: Claude and Fely use Gaps for the next roadmap; no later slice started. [Audit](ai/parity-web-mobile-20261018.md).

PF1b / profile photos (2026-10-19): **PASS for the finite local code scope**, baseline `1ad0039` on `overnight/2026-10-15_feedback`, endpoint PF1b only. Private service-managed avatar storage and owner-only RLS/grants, bounded image validation/cropping, shared uploaded/provider/initial resolution and memory-only expiry, plus web/mobile photo controls are committed in `14a10d5`, `74c07df`, `8ee9099`, `6574093`, `fc9a330`. FRESH PASS: all 10 prompt gates; shared 542/542, API 2397 passed/3 skipped live cases, web 353/353, mobile 1481/1481; forced typecheck/lint 8/8 tasks each, 0 cached, six existing lint warnings; API/web/Android builds and diff hygiene pass; additional forced root build 8/8, 0 cached. Failed fixture attempts are retained in the acceptance report. Migration `20261018000300_profile_avatars.sql` is a FILE ONLY; rollout/device checks NOT RUN, all remote actions excluded. Live provider/production/device state UNVERIFIED (owner to confirm). [Acceptance](ai/acceptance/pf1b-profile-avatars.md).

OR2 / BACKLOG P14b (2026-10-18): **PASS for the finite code scope**, baseline 67e9dc4 on overnight/2026-10-15_feedback, endpoint OR2 only. Shared model 586e5bf, shader uniforms 6da7225, mobile 5483726 and web 39acf35 add device-persisted idle colors, tap bulges and held rotation/inertia using the existing render loops. Ring priority, scrolling, OR1b halo and generation-state appearance are retained; Reduce Motion switches color instantly without bulge/inertia. FRESH PASS 8/8 prompt gates: shared 520/520, mobile 1473/1473, web 348/348; forced typecheck/lint 8/8 tasks each, 0 cached, six existing lint warnings; API/Android builds and diff hygiene pass. Additional forced root build passes 8/8, 0 cached (API/web and local Android/iOS/web exports). Rollout and Device checks NOT RUN, skipped entirely; live/device state UNVERIFIED (owner to confirm). [Acceptance](ai/acceptance/or2-orb-interaction.md).

WGP1 / BACKLOG P16 (2026-10-18): **PASS for the finite code scope**, layout A, implementation 7799ef8. Web generation uses a 1.3fr/1fr layout from 1024px, a large height-capped orb, material name/page count, ordered server stages and state-specific actions; mobile, renderer, generation/retry/navigation behavior preserved. Course name and MD1 description omitted because the existing response has no lookup key. FRESH PASS 7/7 prompt gates (342 web / 502 shared tests), forced typecheck/lint 8/8 with 0 cached, plus forced root build 8/8, 0 cached. Local synthetic CSS geometry passes 4/4 widths, including no overflow at 360px. Rollout/Device checks NOT RUN; live state and physical appearance UNVERIFIED (owner to confirm). Scope baseline c372b50, STEP 0-5/tests/gates/docs/local commits only; endpoint WGP1. [Acceptance](ai/acceptance/wgp1-desktop-generation.md).

TC1b / BACKLOG P15 (2026-10-18): **PASS for the finite code scope**, superseding TC1's preflight STOP using the owner-approved server Today extension. Shared overnight math, planning/store/Schedule support, wrapped ring/drag, date ownership with boundary refresh, and mobile/web Clock options with typed time fields are complete locally. FRESH PASS 9/9 prompt gates (1462 mobile, 325 web, 489 shared, 2369 API / 3 intentional live skips); forced typecheck/lint 8/8, 0 cached. Rollout/device checks NOT RUN; production/device state UNVERIFIED (owner to confirm). ADR-047 resolves the ownership decision; no migration/RPC/SQL change. Endpoint TC1b only. [Acceptance](ai/acceptance/tc1b-today-clock.md).

IF2 / BACKLOG N11 (2026-10-18): complete locally in `5b7c41e`; HEAD already retained external viewers on errors, and IF2 adds mobile/web pending-card loading feedback plus regression proof. FRESH PASS 8/8 expanded prompt gates (1439 mobile, 2351 API / 3 live skips, 309 web tests), plus forced root build 8/8, 0 cached. Actual phone HTTP/decode cause UNVERIFIED (owner to confirm); RB6/N9 rollout and Realme checks remain owner steps. [IF2 evidence](ai/acceptance/if2-external-image.md).

OR1b / BACKLOG P14 (2026-10-18): **PASS for the finite code scope**, superseding OR1's preflight STOP with the supplied owner answers. `8eca072` adds a static mobile-only SVG halo behind both GL and PNG, using minute-memoized day aura tint, dark/light tuning and unchanged glass/host/frame-loop behavior. FRESH PASS 7/7 prompt gates (1446 mobile / 476 shared tests), plus forced root build 8/8, 0 cached. First test-only typecheck failure was corrected and recorded. Realme appearance/compositing/power and remote state remain UNVERIFIED (owner to confirm); rollout/device checks NOT RUN. OR1b endpoint complete; OR2 is tracked separately above. [OR1b evidence](ai/acceptance/or1b-today-orb-glow.md).

IF1 / BACKLOG N10 (2026-10-18): `bcd9ad6` repairs unescaped image-cache filename URIs that can prevent Android MIME detection before album creation; retains fresh owner reads, safe failure stages, decoded names and Stay Focused destination. FRESH PASS 6/6 prompt gates (1434 mobile tests), plus forced root build 8/8, 0 cached. Historical Realme cause UNVERIFIED (owner to confirm); rollout/device checks remain owner steps. [IF1 acceptance](ai/acceptance/if1-save-image.md).

QZ1 (2026-10-18): mobile/web progress labels open question jump controls, sharing current/revealed/answered/unanswered states; saved-only mobile questions jump locally. Prompt gates FRESH PASS 9/9 (shared 470, mobile 1406, web 304 tests; forced typecheck/lint and API/Android/web builds). Implementation: `3eb0be0`, `8df68cc`, `0880274`. Rollout/device checks are owner steps; production/device state UNVERIFIED (owner to confirm); flagged intentionally absent. [QZ1 acceptance](ai/acceptance/qz1-question-jump.md).

## MD1 material descriptions complete via MD1b - PASS locally (2026-10-18)

MD1b resolves and supersedes the historical preflight STOP at `8bf6b2d`.
Finite unattended STEP 0-6, tests/gates/docs/local commits are complete from
baseline `b7ff2d2` on `overnight/2026-10-15_feedback`. No later slice started.

Canvas preparation generates a source-only description once per exact revision
after its result commits, at both existing figure-hook sites. Separate safe
owner metadata leaves private prepared payloads immutable/service-only. Atomic
reservations prevent repeated charges; empty extraction records skipped_empty,
failures retain failed, and guards/exhausted quotas skip supplementary work.
Only 6,000 source characters, low reasoning effort, 600 output tokens, an
eight-second provider timeout and zero retries are allowed; descriptions are
plain text, one or two sentences, at most 240 Unicode code points.

One owner-bound material-page lookup validates revision and original bytes;
missing/outage metadata maps to null. Mobile bodySmall and the web muted
paragraph render above Generate only when present, using existing tokens and
without changing availability. Manual uploads start nonblocking best-effort
metadata after attachment and retain immediate generation; existing personal
Library cards display it beneath source filenames through one batched lookup.
ADR-046 records the
storage/model/cap/quota decisions; the new migration is a FILE ONLY.

Implementation commits:

- `0f2e2d8 feat(db): add material description cache migration file`
- `7ef8fa5 feat(api): describe exact material revisions after extraction`
- `5865036 feat(mobile): show material descriptions above Generate`
- `2afa3bb feat(web): show material descriptions above Generate`
- `efd2883 feat: show manual material descriptions in Library`

**FRESH PASS: 10/10 prompt gate commands**, executed serially against the
final implementation:

| Command | FRESH result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2350 passed / 3 skipped, 204 files; live cases disabled process-locally |
| `npm run test --workspace @stay-focused/shared` | 476/476 passed, 46 files (existing compiled test copies included) |
| `npm run test --workspace @stay-focused/web` | 308/308 passed, 44 files |
| `npm run test --workspace @stay-focused/mobile` | 1410/1410 passed, 143 files |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 35/35 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build, 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 local export, 1 Android bundle; EXPO_OFFLINE=1 |
| `git diff --check` | PASS, 0 whitespace errors; staged check also PASS |

Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
**FRESH PASS, 8/8 tasks, 0 cached**, including Android/iOS/web exports.
Loose mode preserves process-local offline/no-telemetry flags in child builds.
Additional provider contract: **FRESH PASS 20/20, 0 failed (fake provider clients only)**. Workflow regression:
**NOT APPLICABLE: no Workflow runtime/step changes; no tracked workflow test sources exist; changed attachment hook covered by API/manual/worker regressions**. Neither calls a live provider.

**UNVERIFIED (owner to confirm):** production revisions, database rows/applied
migrations, Scheduler state, remote-ref freshness and real browser/phone/provider
behavior. No remote service operation, deployment, remote SQL/migration,
Scheduler change, email, environment-file edit or push was performed.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are
preserved. Temporary logs, generated build outputs and validation artifacts are
excluded from commits; Next-generated declarations were inspected/restored.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** apply
  `packages/db/migrations/20261018000200_material_descriptions.sql`, optionally
  set `MATERIAL_DESCRIPTION_MODEL`, deploy API / Google worker / web, and
  publish mobile OTA/APK in the next owner fullsend. The Vercel CLI is missing;
  installing `npm i -g vercel` is strongly recommended for the owner's later
  deployment tooling. No installation or CLI use occurred here.
- Existing prepared materials need worker redelivery/re-preparation to acquire
  metadata. Broad existing-material coverage needs an owner backfill decision;
  no backfill was written or run. Normal Generate reads never call the model.
- **Device checks - NOT RUN, skipped entirely:** phone/browser prepared
  PDF/PPTX/Canvas-page description above Generate; missing description adds
  nothing; Generate still works; completed manual uploads show cached descriptions
  beneath their existing personal Library filenames. Provider quality/latency and physical/browser
  behavior remain owner acceptance.
- Manual uploads retain ADR-037 immediate generation. Existing personal Library
  cards show cached descriptions beneath the original filename on mobile/web.
  Optional manual metadata is started without awaiting it and may be lost when
  a worker exits; no background completion guarantee is claimed.
- Future only: cross-student reuse for identical files; owner isolation remains.


[MD1 acceptance](ai/acceptance/md1-material-description.md) records exact evidence.

## WD1 draft activity instructions complete locally - PASS (2026-10-18)

WD1's finite unattended code scope is complete: STEP 0-5, tests, fresh serial
gates, docs and local commits on `overnight/2026-10-15_feedback`, baseline
`fe660af`. Implementation: `8aa10db` (API/shared), `30a009e` (web),
`3817695` (mobile). The interrupted API suite was resumed; committed API work
was preserved. No later roadmap slice started.

The web draft aside now shows the linked activity's plain-text instructions,
due date and available points, with an eight-line Show all/Show less clamp.
Unavailable activities use section/slide outline links only with 2+ items,
without a Draft title link. Mobile shows a default-collapsed, accessible
Instructions section above the title, using the existing owner-scoped offline
activity cache. Editor saving, status and warnings stay intact. The optional
nullable pointsPossible DTO field uses the already-read assignment row;
no new query, migration, dependency, palette or cache behavior change.

**FRESH PASS: 10/10 prompt gate commands.** Forced root typecheck/lint each
**8/8 tasks, 0 cached**; API **2316 passed / 3 skipped** (201 files, two workers,
live cases disabled); shared **464/464** (44 files); web **297/297** (43 files);
mobile **1401/1401** (143 files). API build **1/1, 35/35** pages; web build
**1/1, 19/19** pages; Android export **1/1**; diff/staged-diff hygiene PASS.
Additional AUTOPILOT forced root build **8/8 tasks, 0 cached**, including
Android/iOS/web exports. Six existing lint warnings remain. Initial focused
fixture and test-only typecheck failures were corrected and all attempts are
recorded in acceptance; the resumed full suites had no failures or flakes.
Build-generated Next declarations were inspected and restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Fely owns API/web deployment, mobile OTA/APK, browser 1440/768px
instructions/due/points/clamp/fallback checks and phone collapsed/expanded/
offline-after-online-open checks. Production revisions, database rows,
Scheduler state, remote-ref freshness and browser/device behavior remain
**UNVERIFIED (owner to confirm)**. No remote service operation, deployment,
SQL/migration, Scheduler change, email, environment-file edit or push was run.
Unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` are preserved.

[WD1 acceptance](ai/acceptance/wd1-draft-activity-instructions.md) records exact commands/results and remaining owner steps.

## WL1 website Library sort menu complete locally - PASS (2026-10-18)

WL1's finite unattended website code scope is complete: STEP 0-4, local tests,
fresh serial gates, docs and local commits. Baseline `341cf62`, branch
`overnight/2026-10-15_feedback`; implementation `ea9ffa9`. No later roadmap
slice started. Reviewer code, mobile, API/schema and dependencies are unchanged.

Both Library views now use one compact icon + Sort button with a checked
radio menu. The existing web list still mirrors mobile's options and context
filtering. Menu choices retain the existing scope keys and persistence.
First-item focus, arrows/Home/End, Escape, outside dismissal, Tab blur and
selection focus follow the reviewer pattern; outside dismissal restores focus.
The right-aligned menu reuses account-popover tokens with a viewport width cap.
No shared component was extracted and no ADR was needed.

**FRESH PASS: 7/7 prompt gate commands.** Forced root typecheck/lint each
**8/8 tasks, 0 cached**; web **289/289** (42 files), shared **464/464**
(44 files); API build **1/1, 35/35** pages; web build **1/1, 19/19** pages;
diff and staged-diff hygiene PASS. Additional API suite **2315 passed,
3 skipped** (201 files, 2 workers); AUTOPILOT forced root build **8/8 tasks,
0 cached**. Focused Library/reviewer tests **21/21**. Six existing lint
warnings remain. First typecheck failed with three new test mock type errors
(4 successful/6 total tasks); corrected before the full fresh passing retry.
No test flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Fely owns website deployment and browser checks at 1440/768/360px
for Library grid/course: menu opening, checked choice, persistence after
reload and keyboard Escape. Production revisions, database rows, Scheduler,
remote-ref freshness and browser/device behavior are **UNVERIFIED (owner to
confirm)**. No remote service operation, deployment, SQL/migration, Scheduler
change, email, environment-file edit or push was run.

[WL1 acceptance](ai/acceptance/wl1-library-sort-menu.md) records the baseline, source findings, matrix and all
commands/results, including the failed first attempt.

## GN1 mobile grace navigation complete via GN1b - PASS (2026-10-18)

GN1b completes the finite unattended mobile code scope, superseding GN1's
preflight STOP at `8dffcd4`. Baseline `8dffcd4`, branch
`overnight/2026-10-15_feedback`. Implementation commits: `a387c59` (hook/ADR)
and `29bbe1d` (screens/tests). No later roadmap slice started.

Reviewer Generate and confirmed single Library Remake open the saved intent's
generation page after two seconds. Blur, navigation (including parent tab/stack
changes), background/inactive state, unmount, reschedule and Queue opening
cancel the pending push. Admission continues independently. The delayed route
omits `start`; GenerationScreen observes a late persisted job ID after Queue
updates/focus without admitting again, and preserves a manually retried job ID.
Generate all/Select materials keep their immediate Queue popout and unchanged
test; Quiz and all other immediate paths retain their behavior. ADR-045 records
the shared mobile pattern; no API/schema/dependency or accessibility change.

**FRESH PASS:** all **7/7 prompt gate commands**. Forced root typecheck and
lint **8/8 tasks each, zero cached** (six existing lint warnings); shared
**464/464** (44 files), mobile **1395/1395** (142 files); API build **1/1**,
**35/35** pages; Android export **1/1**; diff/staged-diff hygiene PASS.
Additional API suite **2315 passed, 3 skipped** (201 files) with two workers;
AUTOPILOT forced root build **8/8 tasks, zero cached**. First API attempt:
2314 passed/1 timed out/3 skipped; reduced-worker full retry passes without
changing assertions/timeouts. New Remake fixture failures (112 pass/5 fail)
were fixed, then focused **117/117** passed. Acceptance records all attempts.
Build-generated Next declarations were restored; unrelated work preserved.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely: Fely's mobile OTA/APK and Realme stay-two-seconds, navigate-away,
home/background-return and immediate Generate-all Queue checks. Production
revisions, database rows, Scheduler, remote-ref freshness and physical-device
behavior are **UNVERIFIED (owner to confirm)**. No remote service call,
deployment, SQL/migration, Scheduler change, email, environment-file edit or
push. [GN1/GN1b acceptance](ai/acceptance/gn1-grace-navigation.md).

## OS1 source option rows complete via OS1b - PASS (2026-10-18)

OS1 is done via OS1b. The owner correction resolves and supersedes the
preflight STOP at `9613d00`: reuse RowLink's existing opacity/scale pressed
feedback. Finite unattended STEP 0-4, tests, fresh serial gates, docs and
local commits are complete on `overnight/2026-10-15_feedback`, baseline
`9613d00`. Implementation: **26a8e69** (mobile), **a8484f6** (web).

Mobile chooser and in-mode pick actions use monotone icon RowLinks with
original labels, handlers, chooser testIDs and busy flags. The shared row
only gains optional testID forwarding; its 48pt targets, accessible role/
label and pressed feedback remain unchanged. Footer actions, Try again,
global Button and sheet chrome are unchanged. Web preflight confirmed the
white selected background; existing `--hover` now supplies a muted selected/
active state scoped to `.own-material .segments`, with no selected shadow
and text/file icons. Other toggles are unchanged.

**FRESH PASS:** forced root typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files), mobile **1372/1372** (141 files), web
**281/281** (42 files); API build **1/1**, **35/35** pages; Android export
**1/1**; web build **1/1**, **19/19** pages; AUTOPILOT forced root build
**8/8 tasks, 0 cached**; diff/staged-diff hygiene **PASS**, zero whitespace
errors. Focused mobile/web **20/20** and **9/9**; local browser CSS **8/8**.
Six existing lint warnings remain. Initial test-lint and local helper
failures and their repairs are recorded in the acceptance report; no suite
flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Realme light/dark acceptance should confirm icon rows, no filled
white highlight, existing RowLink opacity/scale feedback and the same source
flows. Production revisions, database rows, Scheduler and device/real-account
behavior are **UNVERIFIED (owner to confirm)**. No remote call, deployment,
SQL/migration, Scheduler change, email, environment-file edit or push. No
later roadmap slice started; no ADR needed.

[OS1b acceptance](ai/acceptance/os1b-source-option-rows.md) records the scope, source findings and evidence.

## SH2 mobile hide-on-scroll complete locally - PASS (2026-10-18)

SH2 is done via SH2b: the corrected Page/native RefreshControl facts resolve
and supersede the earlier preflight stop at `d98e58b`. Finite unattended
STEP 0-4, local tests/gates and implementation are complete on
`overnight/2026-10-15_feedback`, baseline `d98e58b`. Implementation commits:
**10347e2**, **fb99de4**. Documentation closes this finite mobile-only slice;
no later roadmap task was started.

One shared hook collapses measured height and opacity with the existing
**180ms** eased motion token (Reduce Motion: instant). Downward travel hides
past **header height + 24pt**; **8pt** accumulated hysteresis prevents jitter.
Up, top/negative overscroll and short refreshed/resized content reveal it;
bottom rebound and viewport offset correction cannot reopen it accidentally.
Page opts in and composes hook then caller at 16ms; native RefreshControl
and Sheet drag logic are preserved. Hidden descendants leave accessibility
and touch navigation. No dependency, schema, API or token change.

Today collapses date/status, keeping its greeting in the fixed Queue/Profile
actions row. Both Tasks pages collapse SnapshotStatus; main Tasks includes
its existing sync line. Library course collapses only the offline caption,
keeping sort/filter/selection/status controls fixed and organizer scroll
connected. Reviewer snapshot/search collapses except while focused or a raw
or deferred query is active, including match jumps. Back/actions/tab bar stay
visible. **PAR1:** website has no hide-on-scroll header in inspected source.

**FRESH PASS:** final forced root typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files, existing compiled copies included); mobile
**1365/1365** (141 files); API build **1/1**, **35/35** static pages; Android
local export **1/1**; diff/staged-diff checks **2/2**, zero whitespace errors.
Focused tests **117/117**. Six existing lint warnings remain. Initial stub,
missing-import and test-lint failures and their repairs are recorded in
[SH2b acceptance](ai/acceptance/sh2b-hide-on-scroll.md); no nondeterministic
flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely: owner mobile OTA/APK, then Realme down/up/no-gap, existing refresh,
Reduce Motion, search and TalkBack checks. Production revision, database/
Scheduler state and real-account/device behavior are **UNVERIFIED (owner to
confirm)**. No remote service calls, deployment, remote SQL, migration,
Scheduler operation, email, environment-file edit or push. Unrelated work
is preserved.

## RV2 topic level pill complete locally - PASS (2026-10-18)

Finite unattended STEP 0-4, tests, all eight required fresh serial gate
commands, documentation and scoped local commits are complete on
`overnight/2026-10-15_feedback`, baseline `1064513`. Mobile and website now
show one four-part topic pill. Original / Simplify / Explain simply retain
their level selection; Expound remains an independent expandable button,
separated by an existing border token. Open Expound and the selected level
can both highlight. Signed-out website controls keep their sign-in links.
No source, API, migration, dependency or native module change.

Mobile has 32-point visible segments with vertical-only 6-point hit slop
inside 44-point parent bounds, no ScrollView and full accessibility names.
Short labels Original / Simpler / Simplest appear below **380 measured row
points** (about 85 text points per segment at the boundary). Website uses
them at **<=400px viewport**, equal shares, 44px targets and no scrolling.
Implementation: **0b553dd**, **bf5febd**, **fc1cb84**, **ec580e9**.

**FRESH PASS:** root forced typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files, existing compiled copies included), web
**280/280** (42 files), mobile **1334/1334** (139 files); API build **1/1**,
**35/35** static pages; local Android export **1/1**; diff/staged-diff checks.
Isolated browser **24/24** at 1440/768/390/360px in light/dark themes, using
actual components and CSS with all network blocked, zero requests/errors.
Six existing lint warnings remain. Three deterministic initial browser
failures and fixes are retained in acceptance; no nondeterministic flake.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner website deployment and mobile OTA/APK, then Realme 360-point
readability, no-scroll, Expound and TalkBack checks, plus real web at 1440/390.
Production revision, database/Scheduler state and real-account/device behavior
are **UNVERIFIED (owner to confirm)**. No remote service call, deployment,
remote SQL, migration application, Scheduler operation, environment-file edit
or push. Build-generated Next declarations were restored; unrelated untracked
work is preserved. RV2 is the finite endpoint; no later task started.

[Acceptance and exact evidence](ai/acceptance/rv2-topic-pill.md).


## QU1 Queue popout complete locally - PASS (2026-10-18)

Unattended STEP 0-5, tests and required fresh serial gates are complete on
`overnight/2026-10-15_feedback`, baseline `cabd5b8`. Both apps show batch progress
only while `done < total` and use one shared idle rule. Accessible header refresh
icons replace the full Refresh actions and reflect in-flight refreshes with
cached data. Existing dismissal, focus, Clear, Retry/Cancel and result actions
remain. Spacing uses existing tokens. The valid 4/4 screenshot was stale display;
a separate API defect now settles terminal batch attempts without hiding their
independent failure attention. Retry reopens progress. No DTO/schema change.

Implementation: **7eb50c2**, **529d466**, **7f519a3**, **bc2e6b2**.
**FRESH PASS:** forced root typecheck/lint **8/8 tasks each, 0 cached**;
shared **446/446** (44 files, including existing compiled copies), web
**278/278** (42 files), mobile **1332/1332** (139 files), API **2315 passed,
3 skipped** (201 files); API build **1/1**, **35/35** static pages; Android
export **1/1**. Final web typecheck/lint and diff/staged-diff checks pass.
Six existing lint warnings. First mobile attempt **1324 passed / 8 failed**
(circular test serialization), corrected to green; no nondeterministic flake.
[Acceptance and exact evidence](ai/acceptance/qu1-queue-popout.md).

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner website deploy and mobile OTA/APK, then Android finished-batch,
TalkBack/refresh/outside-tap/Back checks and web review at 1440/390 px.
Production revision, database rows, Scheduler and real-account/device behavior
are **UNVERIFIED (owner to confirm)**. No remote service call, deployment,
migration, Scheduler operation, environment-file edit or push. Unrelated work
is preserved. QU1 is the finite endpoint; no later task started.

## WG3b Generate home complete locally - PASS (2026-10-18)

WG3 is done via WG3b; this supersedes the docs-only preflight stop at
`1e53edd`. Unattended STEP 0-7, tests, required fresh serial gates, docs and
local commits are complete. Implementation: **0eb0aaa** on
`overnight/2026-10-15_feedback`, baseline `4bd0d91`. Current courses precede
own material, collapsed Not synced and collapsed Past; search retains own
material. Accessible corner menus use desktop hover/focus and narrow/touch
visibility; Canvas retains its labelled menu. Sync is secondary. Generate
shows one combined status with active work before failure before freshness.
All nine website Try again actions restore standard 12px/16px padding.

**FRESH PASS:** root forced typecheck **8/8**, lint **8/8**, both **0 cached**;
web tests **265/265**, **42/42 files**; API build **1/1**, **35/35** static
pages; diff/staged-diff checks. Intercepted fictional browser **35/35** checks
at 1440/1024/768/390 px plus wide touch, zero unexpected requests/errors.
Six existing lint warnings; failed first attempts retained in
[WG3b acceptance](ai/acceptance/wg3b-generate-home.md). No nondeterministic
flake. Mobile implementation unchanged; mobile build/tests NOT APPLICABLE.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB6/fullsend website deployment from main, then real-account
desktop/phone browser review. Production revision, database rows, Scheduler
and real-account behavior **UNVERIFIED (owner to confirm)**. No remote service
call, deployment, migration, environment-file edit or push. Unrelated work is
preserved. WG3b is the finite endpoint; no later task started.

## RV1 reviewer header complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, fresh serial local gates, docs and local
commits.** Mobile title-row Reviewer actions contains Export and Share in a
measured native popover, reusing QueueDropdown's outside/Android Back pattern.
The title wraps beside a 48-point trigger; the menu has no animation. Offline
Export works; Share keeps its owner/offline guard, sheet and request logic.
Website Share/Save to file use the existing account popover pattern with
Escape/focus return, arrows/Tab and outside dismissal; Generate Quiz stays
visible. Both clients group minutes/topics compactly. Mobile automatic labels
and website course/date remain. Reviewer-only hideFreshLabel suppresses idle
Updated while preserving Syncing, error/Retry and update-available actions.
Other screens retain default status behavior. **RV1 supersedes RX1's button
row.** No existing reviewer Save offline action; none invented. No reusable
primitive, ADR, dependency, native module, API change or migration.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; mobile **1321/1321** (139 files), web **249/249** (42 files), shared
workspace **427/427** (44 files including existing compiled copies), separate
shared source-only **215/215** (22 files). Standalone API build **1/1**,
**35/35** pages; Android export **1/1**. Root build includes website **19/19**
pages and Android/iOS/web exports. Diff/staged-diff PASS; six existing lint
warnings. Deterministic failed first attempts are recorded in acceptance;
no nondeterministic flake. Implementation: **e4f5ee9**, **0f500cd**, **6bef993**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB6 fullsend: website deploy and APK/OTA, then Realme menu,
offline/meta/status checks and browser checks at 1440/390 px. Production
revision, database rows, Scheduler and device/browser behavior are **UNVERIFIED
(owner to confirm)**. No remote service operation, deployment, remote SQL,
Scheduler change, email, environment-file edit or push. Generated Next
declarations were restored; original untracked work is preserved. RV1 is the
finite endpoint; no later task started. WG3's earlier stop remains independent.

[RV1 acceptance](ai/acceptance/rv1-reviewer-header.md).

## MR3 failed-generation recovery complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, local gates, docs and local commits.**
Mobile Generation, Canvas and Queue plus website Generation/Queue offer
**Try again** for safe Reviewer/Quiz failures, with the real stage in plain words
and **Your material is safe.** Accepted retries get fresh keys and reuse the
exact stored extraction/source; duplicate taps are fenced. Typed 409/422 denials
remove the action despite stale polling. View Queue remains secondary; Canvas
choose-another is secondary for non-retryable failures. Existing tokens remain.

**Owner must apply the new function-only migration
`20261018000100_failed_generation_retry.sql` before API/client rollout.** It
admits safe historical generation failures without backfilling existing rows,
retains exact source/version/contract identity and denies deleted/unavailable
documents, Canvas items and Quiz Reviewer sources. Automatic retry policy,
quotas, source validation, OCR accounting, ownership and cancellation remain.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 each, 0 cached**;
shared **393/393** (43 files), API **2306 passed + 3 existing live skips**
(201 files), mobile **1311/1311** (138 files), web **236/236** (40 files).
Standalone API build **1/1**, **35/35** pages; Android export **1/1**. Root
build also produces website **19/19** pages and Android/iOS/web exports. Diff
and staged-diff checks PASS; six existing lint warnings. Failed first attempts
and final key-rotation review are retained in acceptance; no observed flake.
Optional standalone workflow probe: **BLOCKED, zero tests discovered** (only
.gitignore is tracked); runtime/provider boundary unchanged, so it is NOT
APPLICABLE to MR3's mandatory gates. API source-chain/workflow tests pass.

Implementation: **84ab171**, **71f3d25**, **55d4eb0**, **cb36f82**.
**Owner steps remaining:** migration application, API/website deploy, mobile OTA
and the specified SOC_SCI_103 failure/retry device check are **NOT RUN**, skipped
entirely. Production revision, rows, Scheduler and physical behavior are
**UNVERIFIED (owner to confirm)**. No remote service call, deployment, remote SQL,
Scheduler change, email, environment-file edit or push. Generated build type
changes were restored; original untracked work is preserved. MR3 is the endpoint.

[MR3 acceptance](ai/acceptance/mr3-failed-generation-retry.md) ·
[ADR-044](adr/ADR-044-failed-generation-retry.md).

## OI1 offline reviewer images complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-8, tests, local gates, docs and commits.** Saving
a reviewer to the device now queues its snapshots, figures and stored external
references automatically in private document storage. SQLite v9 persists image
identity, version, attempts and retry clocks; two downloads run at a time.
Fresh FX1b owner reads, MIME/size/status validation and temporary-file moves
protect publication. Reviewer text remains readable while images save.

The reader prefers local files with the original labels and attribution.
Readiness counts every non-capped image; storage totals include image bytes.
Caps are 40 MiB per reviewer and 500 MiB across the app, preserving reading
order with one quiet Some images need a connection line. Removal, supersession,
version replacement, source denial, clearing and sign-out invalidate previews;
late writes cannot restore removed copies. Manual gallery Save image remains.
No native dependency, API or remote migration changes. **PAR1:** the website
has no offline mode; website offline work is NOT APPLICABLE.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; shared **362/362** tests (42 files), mobile **1301/1301** (137 files);
standalone API build **1/1**, **35/35** pages; Android export **1/1**.
Root build also exports iOS/web and builds website **19/19** pages. API tests
NOT APPLICABLE (unchanged API). Diff/staged-diff checks PASS. Six existing lint
warnings remain. Failed first attempts and the aborted resumed build are
recorded in acceptance; no nondeterministic flake observed. Implementation:
**c78e4b5**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Publish the reviewed mobile change and check snapshots, figures and
an external reference in airplane mode, after restart, replacement and removal;
confirm storage drops. Native/deployed revision, live database/Scheduler state
and physical behavior are **UNVERIFIED (owner to confirm)**. No live provider
check, deployment, remote SQL/migration, Scheduler action, email, environment-file
edit or push was run. Unrelated untracked work is preserved. OI1 is the finite
endpoint; no later task was started.

[OI1 acceptance](ai/acceptance/oi1-offline-reviewer-images.md) ·
[ADR-043](adr/ADR-043-offline-reviewer-images.md).

## WV1/N7 reviewer image load complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, local gates, docs and commits.** Website
and mobile load all cached reviewer image URLs in one owner-scoped `/figures`
response on open. Bulk snapshot discovery checks the exact original once and
never renders. Missing snapshots use a three-request queue with read-only
bounded polling; source-image errors share one signed-URL refresh. Website
reserves image boxes, eagerly loads the first two images, and lazily loads the
rest with async decoding. IM2 Ask/Save/details, source priority, owner isolation
and offline/identity guards remain. Legacy routes are compatible; no migration
or dependency change.

Synthetic fixture: **7 -> 2 metadata requests**, first course URL **2 -> 1
sequential responses**; unrendered page **3 -> 2** with mocked immediate
completion. Earliest URL including stored external remains **1 -> 1**.
Production speed is unverified.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; API **2283/2283** (201 files, three existing live skips),
web **227/227** (39 files), shared **362/362** (42 files),
mobile **1269/1269** (135 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; mobile Android export **1/1**.
Root build also exports Android/iOS/web. Six existing lint warnings remain.
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB5: deploy reviewed API/web and assess real reviewer image
loading; publish/recheck the mobile change on device. Deployment revision,
production rows, device behavior and Scheduler state are **UNVERIFIED (owner
to confirm)**. No remote call, deployment, SQL/migration application, Scheduler
action, email, environment-file edit or push occurred. The referenced overnight
roadmap is absent; the complete WV1 prompt supplied scope. Unrelated untracked
paths are preserved. This finite run ends at WV1; no later task was started.

[WV1 acceptance](ai/acceptance/wv1-reviewer-images.md).

## WG2 Generate saved Reviewer state complete locally - PASS (2026-10-18)

**PASS for unattended WG2/N6 STEP 0-2, tests, fresh serial gates, documentation
and local commits.** Website material rows show one Reviewer ready label in
the existing meta line and accessible name when `reviewerArtifactId` exists.
The detail pane offers primary Open reviewer, secondary confirmed Remake, and
a Ready Reviewer fact. Cancel/Escape return focus; duplicate submissions lock;
failed submission retains the saved Reviewer. Quiz and no-Reviewer flows remain.
Accepted submission and return/focus revalidate existing course/material reads,
including saved later pages. No new endpoint, contract, dependency or migration.

General job DTOs lack a material ID; batch-only mappings cannot establish the
latest arbitrary material job. **generating state per material: not available
from existing data**. Rows use saved Reviewer evidence only.

**FRESH PASS:** forced root typecheck/lint/build **8/8 tasks each, 0 cached**;
web **224/224** tests (38 files), shared **350/350** (40 files); standalone
API/web builds **1/1 each**, **35/35** and **19/19** pages; root mobile exports
Android/iOS/web with 68 assets. Diff/staged-diff hygiene PASS. Six existing lint
warnings remain. Initial typecheck and lint errors in the new test fixture were
fixed and the serial gates restarted; exact failures are retained in acceptance.
Implementation **0eaffa9**; tests **bb2395f**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Publish the reviewed website change and perform RB5 Generate checks
for Reviewer ready / Open reviewer / confirmed Remake on phone/resized desktop.
Deployed revision, owner acceptance and live database/Scheduler state are
**UNVERIFIED (owner to confirm)**. No remote call, deployment, SQL/migration,
Scheduler action, email, environment-file edit or push occurred. The referenced
overnight roadmap is absent; the complete prompt supplied scope. This run ends
at WG2; unrelated untracked paths and earlier release limitations are preserved.

[WG2 acceptance](ai/acceptance/wg2-generated-reviewer-state.md).

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

[FX1 diagnosis and FX1b outcome](ai/acceptance/fx1-image-diagnosis.md).

## FULLSEND shipped; live acceptance PARTIAL (2026-10-18)

The explicitly authorized release is on main and production: pinned WG1
653e8d8a2b9b43b7e607e103d9d1a09a25cd451c, tested application main
dc162de3df634eea8b447f73ac67d758be75f4ee. It includes INT1/PR #12, MR1,
SA1/SA2, MR2, IM1b, RT1, EV1, RX1, IM2 and WG1. **WG2, WV1 and MD1 are not
in this release.** The active autopilot worktree and other worktrees were
preserved; this release used a separate clean clone.

All fresh gates and GitHub CI run 39069451068 pass. Root forced
typecheck/lint/build: 8/8 each, zero cached. Doctor: 21/21. Shared: 350,
Canvas: 75, OCR: 27, engine: 606, API: 2,268 plus 3 existing live skips,
mobile: 1,239, web: 209, provider contract: 20; zero failing tests.
The sole release migration, 20261016000100_manual_reviewer_uploads.sql,
was applied before main; all 95 staged/remote versions match.

Worker generation-worker-00028-f5t is Ready with 100% traffic on image
worker:b55d5a5. API dpl_2f7nfcr1Y5JJufzTZYmqu1s7276g and website
dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN are READY; health and HTTP availability
pass. Realme RMX3151 was upgraded in place to **2.2.0 / code 6**, runtime
2.2.0-sdk57, from signed EAS build 2ed33756-ef3b-4887-ac0a-fa0c59adf7ab.
The owner session and all 75 offline Library items remain. No OTA was published.

Physical PASS: Export/Share row, first What is this? Ask chip, bulleted and
revealed text/image answers, tap-only source-figure details, pull-down close,
Library Sort placement and offline cold restart. Two live generation requests
were used. Physical FAIL: Save image shows its generic failure alert, and the
checked external-reference image stays blank and cannot keep its viewer open.
Causes are unverified. NOT RUN: desktop/390px website UI (Windows browser
activation Access denied), overflowing-viewer scroll, and Office upload
(no suitable local instructional source). These prevent full live acceptance.

Next: repair/recheck the two image failures and finish the unrun checks; keep
the finite release endpoint at WG1. Preview autoIncrement is false to retain
code 6 after the first failed build; deliberately advance the code or restore
auto-increment before a later native release. Email delivery remains disabled
(CANVAS_EMAIL_DELIVERY_ENABLED=0 was not changed); no plan purchase, persistent
credential creation/rotation, destructive SQL or app-data deletion occurred.
This entry supersedes older owner-rollout-pending statements for the shipped
scope; their historical local evidence remains below.

[Full release acceptance](ai/acceptance/fullsend-20261018.md).

## WG1 website Generate layout complete locally - PASS (2026-10-18)

**PASS for unattended WG1/N5 STEP 0-2, tests, fresh serial gates, documentation
and local commits.** Generate search/link and course heading actions wrap across
1440-360 px. Breadcrumb levels truncate on one line without colliding with Queue.
Batch buttons reuse shared padding/height; cards in each row stretch equally;
material titles/meta/actions wrap. Both Generate and Canvas use one styled
Course options disclosure with aria-expanded, Escape/focus return and outside
click/focus dismissal. Canvas popovers escape the card list's overflow clipping.

Single in-flight sync text lives in CanvasRefreshStatus below the heading.
During that global refresh the course button keeps a spinner, disabled state
and aria-busy without duplicate Syncing text; local text remains when global
refresh is idle. Existing sync and move-course requests are preserved. No API,
mobile, dependency, schema or migration change. Implementation: **ace4cb2**;
browser harness: **f485a2f**.

**FRESH PASS on f485a2f:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; web **209/209** tests (37 files), focused render/batch **8/8**;
standalone API/web builds **1/1 each**, **35/35** and **19/19** pages; root
Android/iOS/web exports with 68 assets. Local Playwright **20/20** page/viewport
checks and **10/10** mocked move-course requests, zero text-control collisions,
horizontal page scroll, unexpected requests or runtime errors. Screenshots and
logs: ignored .local/wg1/. Diff/staged-diff hygiene PASS. Six existing lint
warnings remain (five mobile, one web); every final gate passed first attempt.
Focused development failures and browser-checker false positives are retained
in acceptance; no nondeterministic flake observed. API/mobile/shared tests
NOT APPLICABLE (unchanged); generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner publishes the reviewed website change and performs RB5 Generate in a phone
browser and resized desktop. Deployed revision, owner device acceptance and
live DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The referenced
overnight roadmap file is absent; the complete WG1 prompt supplies the scope
without contradicting implementation. No remote service call, deployment,
SQL/migration application, environment-file edit, Scheduler action, email or
push occurred. Expected unrelated untracked paths remain. This finite run ends
at WG1; no later roadmap task was started.

[WG1 acceptance](ai/acceptance/wg1-generate-layout.md).

## IM2 reviewer images complete locally - PASS (2026-10-17)

**PASS for unattended IM2/N4 STEP 0-3, tests, fresh serial gates, documentation
and local commits.** Opening an image reveals its details inside the viewer on
all mobile/web surfaces. Grounding remains visible; external Commons/source and
license links are direct viewer actions. Named thumbnails, Ask/Save exact targets,
offline guards, source precedence and existing gallery permissions remain.

Mobile uses one scrollable ImageViewer Modal for images/details/actions, with
pinch/double-tap zoom, bounded pan, top/zoom-1 pull-down dismissal (120 dp or a
fast downward flick), Android back and Reduce Motion. An explicit touch boundary
prevents reader edge-scrubber interaction. Web dialog/image overflow supports
all zoom levels; Close/backdrop dismissal and native Esc semantics remain.
No dependency, native module, API, schema or migration is added. Code commits:
**93dea65**, **13833e9**, **11fb0ee**, **739d80b**, **311cc58**.

**FRESH PASS on code 311cc58:** forced root typecheck/lint/build **8/8 each,
zero cached**; mobile **1,239/1,239** (133 files), web **204/204** (35 files);
standalone API and Android builds **1/1 each**, API/web pages **35/35** and
**19/19**, Android one bundle/35 assets, root Android/iOS/web exports with 68
assets. Diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings.
Initial lint (7/8 tasks) and mobile (3 import failures / 130 passing files)
failures were fixed; focused test expectation failures and retries are retained
in acceptance. No nondeterministic flake observed. API/shared tests NOT
APPLICABLE (unchanged). Generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Release mobile/website through the normal owner flow; perform RB5 on Realme for
caption reveal, always-visible grounding, direct license access, tall-content
scroll, pull-down, zoom/pan, Android back, Reduce Motion and edge-swipe isolation;
check website scrolling and Esc/Close/backdrop. Deployed revisions, native/browser
interaction and DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The
referenced overnight roadmap file was missing locally; the full IM2 prompt
supplied the scope without an implementation contradiction. No remote service
call, deployment, SQL/migration application, environment-file edit, Scheduler
action, email, fetch or push occurred. Expected unrelated untracked paths remain.
This finite run ends at IM2; no later roadmap item was started.

[IM2 acceptance](ai/acceptance/im2-reviewer-images.md);
[ADR-041](architecture/ADR-041-reviewer-image-viewer.md).

## RX1 reviewer header complete locally - PASS (2026-10-17)

**Header layout superseded by RV1; RX1 validation below is historical.**

**PASS for unattended RX1/N3 STEP 0-2, fresh serial gates, documentation and local
commits.** Mobile now renders title, equal-width secondary Export/Share row,
review-time/topics metadata, Generate Quiz hero and hint in that order. Export
fills the row for non-artifact reviewers. At font scale 2 and above the buttons
stack with complete labels; existing 48-point targets, accessibility defaults,
Share/offline behavior and source content remain. Website actions already use
one row and are unchanged. No dependency, native module or migration is added.
Implementation/tests: **0ce5db6**.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile
**1,216/1,216** tests (131 files); focused header/Share suites **14/14** (3 files);
standalone API and Android builds **1/1 each**, API/web pages **35/35** and
**19/19**, Android one bundle/35 assets, root Android/iOS/web exports with 68
assets; diff/staged-diff checks PASS. Zero lint errors, six existing warnings.
First typecheck failed **7/8 tasks** on a test fixture's too-narrow metadata
type, corrected with the component prop type; the fresh retry passed. No flake
observed. Web/API/shared tests NOT APPLICABLE (unchanged). Generated Next
declarations restored. [RX1 acceptance](ai/acceptance/rx1-reviewer-header.md).

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner releases the mobile change and performs RB5 on Realme, including narrow
and large-font layout, focus order, offline Share and Export-only fallback.
Deployed revisions and physical behavior are **UNVERIFIED (owner to confirm)**.
No remote service call, deployment, SQL/migration application, environment-file
edit, Scheduler action, email, fetch or push occurred. Expected unrelated
untracked paths are preserved. This finite run ends at RX1; no later item started.

## EV1 external references complete locally - PASS (2026-10-17)

**PASS for unattended EV1/N2 STEP 0-2, fresh serial gates, documentation and local commits.** Root cause in code: mobile coupled external visibility to source discovery and snapshot eligibility instead of displayed source URLs, with a batch-wide parser failure capable of hiding every valid reference. Snapshot/figure components now report displayed source images; found Commons references can render during pending, absent or failed discovery. Malformed sections are omitted individually while strict visual validation remains.

The exact external label, attribution, Wikimedia headers, source precedence, offline/auth/reachability guards, bounded batch polling and explicit replacement flow remain. Temporary reviewer.* diagnostics are removed. Captions and image viewer behavior are preserved. No API/web/shared serializer, migration, dependency or native module changed. Code commits: **239a0ab** (reproduction), **a9c1d7f** (fix).

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile **1,209/1,209** (130 files); focused regressions **87/87** (5 files); standalone API and Android builds **1/1 each**, API/web pages **35/35** and **19/19**, Android one bundle / 35 assets, root mobile Android/iOS/web exports with 68 assets; diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings. Deliberate red reproduction **7 failed / 80 passed** is retained in acceptance; every gate passed on its first gate attempt and no nondeterministic flake was observed. API/web/shared tests are NOT APPLICABLE because those workspaces did not change. Generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks were skipped entirely (NOT RUN). Publish the reviewed mobile fix through the normal owner release flow; RB5 on Realme must confirm a found external image, exact label and attribution for a section without a course image, source precedence and offline behavior. Deployed revisions, actual stored visuals, applied migrations, database/Scheduler state, provider/image egress and physical-device root cause remain **UNVERIFIED (owner to confirm)**. No deploy, push, fetch, remote service/SQL call, migration application, environment-file edit, Scheduler action or email occurred. Unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. This finite run ends at EV1; IM2 and later items are not started.

[EV1 acceptance](ai/acceptance/ev1-mobile-external-references.md).

## INT1 combined locally - PASS (2026-10-17)

**PASS for the finite unattended INT1 code scope, fresh serial gates, documentation and local commits.** Merge efad5c9 combines the 35 local 10-16 commits through a967460 with PR #12 at 8fcdf16; 979f120 cherry-picks only f3dd833 with provenance. Test commits 2ddb9a8 and 21e685a prove the combination and restore PR #12's grouping contract. MR1/SA1/SA2/MR2/IM1b/RT1 remain, with PR #12 offline auth, silent idempotent Reviewer submission, organization and sorting. What is this? renders first, and inline/zoom image Ask callbacks pass for snapshots, extracted figures and external visuals on both platforms.

PR #12 mobile sorting wins: pill beside update status, compact highlighted 48-point rows, disabled during selection, displayed-title alphabetization, owner/course-scoped preferences and offline Canvas sequence cache. Website has one contextual select with identical options/values/labels and preference DTO. Both clients use complete material sequences for Canvas order; unlinked work follows. Obsolete LS1 sorting/open tracking and unused sourcePosition projection/tests are removed. Both preference versions parse safely. ADR-040 records the supersession; original branch histories below are retained as historical evidence.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; shared **350/350** (40 files), API **2,268 passed / 3 existing live skips** (199 files), mobile **1,202/1,202** (130 files), web **203/203** (35 files), Canvas **75/75**, OCR **27/27**, engine **606 evaluations / zero failures**. Lint has zero errors and six existing warnings. API/web build 35/35 and 19/19 pages; mobile exports Android, iOS and web (68 assets). Generated Next.js declarations were restored. Root gates ran on production code at 2ddb9a8; the only subsequent code-tree change restores a PR #12 test, verified by fresh mobile typecheck/lint and the full suite. First failures and repairs are recorded in acceptance; no nondeterministic flake was observed.

PR #12 CI was green at 8fcdf16 (run 39035996757), according to owner-provided history; live CI was not queried. Nothing beyond the reported Realme OTA is deployed. Deployed revisions, database rows/applied migrations, provider behavior, Scheduler and physical acceptance are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely and remain RB5 owner work after the later roadmap slices. No push, deployment, remote database/service call, migration application, environment-file edit, Scheduler action or email occurred; git fetch was the sole authorized remote operation. No changes to codex-fullsend-20261016.md. This run ends at INT1; EV1 and all later items were not started.

[INT1 acceptance](ai/acceptance/int1-local-integration.md).

## LS1 Library sorting complete locally (2026-10-16)

**PASS for unattended LS1 STEP 0-3, fresh serial gates, documentation and local commits.** Mobile and website Library now offer Recently added / Course / Title A-Z / Recently opened; course contents default to Canvas order, with Recently added and Title A-Z alternatives. Shared pure comparators sort within pinned and unpinned groups without refetching. Personal & other participates in date sorts and follows courses in alphabetical sorts. Choices and capped opened timestamps stay per owner/device; old or unavailable storage defaults safely. Mobile uses the existing sheet and Reduce Motion-aware layout animation; website uses a compact native select.

Optional sourcePosition is projected server-side from existing synced Canvas module/item/file/page/assignment metadata, with owner/course/connection checks, complete pagination and safe failure. No Canvas calls, migration, dependency or native module is added. Manual/mixed/unplaced sources follow positioned work by creation time. Existing source, authentication, RLS, grants, offline and RT1/earlier behavior remain intact.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,280 passed / 3 existing live skips** (200 files), mobile **1,136** (123), shared **358** (41, including emitted copies), web **195** (34). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors; six existing warnings. Repaired attempts are retained in acceptance; no nondeterministic flake. Code commits: **d027f2b**, **45c6d19**, **451eabb**, **c5f1f6b**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and a compatible preview update; verify all Library sorts, Canvas source order, pins, successful reviewer/quiz/draft opens and choice persistence after restart on mobile and website. LS1 adds no native module; inherited IM1b APK and MR2 migration/worker rollout remain owner work. Older API/cache entries use the unpositioned fallback until successful reconciliation. Deployed revisions, actual Canvas positions, database/applied migrations, Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, remote SQL/migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at LS1; RB4 was not started.

[LS1 acceptance](ai/acceptance/ls1-library-sorting.md); [ADR-040](architecture/ADR-040-library-sort-orders.md).

## RT1 topic levels and Expound complete locally (2026-10-16)

**PASS for unattended RT1 STEP 0-4, fresh serial gates, docs and local commits.** Each mobile/website topic has compact Original / Simplify / Explain simply controls and collapsible Expound. Canonical content stays unchanged; Original is immediate and has no model action. Server-read, owner-scoped sections feed source-only SA1 formatted answers and grounding labels. Persistent owner/exact-content caches support offline reuse; uncached controls show the existing offline reason. Reading choices last only for the session; canonical search restores Original. Shared snapshots remain unchanged, so shared topic controls route to sign-in and make no model calls.

Study Tools' existing 20/minute warm-instance admission and provider configuration are reused. New bounded server dedup/cache is per warm instance (400 entries / 30 minutes), not a durable global quota/cache. Context is capped at 18,000 characters without truncation; results at 6,000 characters. No migration, dependency or native module is added. All prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2/IM1b local regressions remain green.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,268 passed / 3 existing live skips** (199 files), mobile **1,129** (122), shared **345** (39 including existing emitted copies), web **188** (32). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Repaired first attempts are recorded in acceptance; no nondeterministic flake. Implementation commits: **959424e**, **d0db258**, **dc4f381**, **06b9385**, **f1b09f1**, **ba81163**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and compatible preview update, then check topic levels, instant Original/cache switching, organized Expound/collapse, offline, canonical search, manual scrolling/Reduce Motion and shared sign-in routing on realme. Predecessor IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual provider output, live database/applied migrations/Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at RT1; LS1/RB4 were not started.

[RT1 acceptance](ai/acceptance/rt1-topic-levels.md); [ADR-039](architecture/ADR-039-topic-level-study-tools.md).

## IM1b image saving and Android Share complete locally (2026-10-16)

**PASS for unattended IM1b STEP 0-4, fresh serial gates, docs and local commits.** Owner resolved the previous iOS album contradiction: write-only photo permission, Android **Stay Focused** album, iOS **Photos without an album** using add-only saving. SDK-compatible expo-media-library ~57.0.5 and the permission plugin are added with no other dependency upgrades. All three mobile image zoom viewers offer Save beside Ask; owner website zoom viewers download the same sanitized title/section/kind filename. Wikimedia includes source title and stored attribution/license confirmation. Failed/non-image/empty downloads never reach gallery insertion; temporary bytes are cleaned. Shared-link viewers have no Save control.

Share retains SH1's canonical owner/server-ID gate and disabled device-copy state. No Android hide branch or lost canonical ID was found. Clipboard is loaded lazily and guarded; a missing module, rejected copy or false result falls back to system sharing with **Link ready to share** and a visible link. Eager native loading is a plausible old-APK cause; actual installed contents and physical diagnosis remain **UNVERIFIED (owner to confirm)**. SA2/MR2 and earlier features remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, 0 cached**; API **2,257 passed / 3 existing live skips** (197 files), mobile **1,119** (120), shared **337** (37 including existing emitted copies), web **179** (30). Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Failed first attempts and repairs are recorded in acceptance; no nondeterministic flake. Code: **1959a0e**, **d8544f9**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Build/install a new preview APK containing clipboard and media-library (OTA alone cannot add native modules), publish the website, and verify realme snapshot/figure/Wikimedia saves, Share, offline state, permission denial/settings and clipboard fallback. Verify iOS add-only Photos saving with no album/full-access prompt. Deployed revisions, native permissions/gallery behavior, live database/applied migrations/Scheduler/provider state and physical root cause are **UNVERIFIED (owner to confirm)**. No prohibited remote call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. No later roadmap item was started.

[IM1b acceptance](ai/acceptance/im1b-image-save-share.md); [ADR-038](architecture/ADR-038-reviewer-image-gallery-saving.md).

## MR2 manual file-to-reviewer complete locally (2026-10-16)

**PASS for unattended MR2 STEP 0-3, fresh serial gates, docs and local commits.** Manual PDF/photo/DOCX/PPTX picks now upload, extract and generate one reviewer job with one progress destination in generation and the existing Queue. Office uses the shared extractor at the Canvas 10 MiB cap, validates ZIP/expected parts, and retains ordered source blocks and MR1 generation. Legacy DOC/PPT gets conversion copy. Files/photos have no editable-text step; paste retains editing and explicit generation. Empty extraction fails with the required message before generation. Per-pick keys and upload references survive interrupted acceptance retries.

The new forward-only migration `20261016000100_manual_reviewer_uploads.sql` extends private upload policy and service-only atomic creation/source attachment. Both quota families, page/character limits, owner isolation, live leases, immutable child Retry and cancellation without publication remain. Google/database workers reuse extraction checkpoints; Vercel Workflow keeps explicit page/chunk boundaries. No new service, dependency or native module. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2 remain working under local regressions.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,257 passed / 3 existing live skips** in 197 files; mobile **1,098** in 117; shared **334** in 36 including emitted copies; web **176** in 29; provider contract **20/20**. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Six existing lint warnings, zero errors. Five mocked workflow orchestration tests pass; the dedicated runtime directory has zero test sources and is NOT APPLICABLE, not runtime acceptance. Repaired first attempts are recorded in acceptance. Code: 36f19a1, 9e42184, 15c351d, e96c6be.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Apply the new migration and coordinate API/website/Google-worker/compatible preview OTA publication, then verify DOCX/PPTX/PDF/photo direct generation, Queue/reconnect after 202, empty/legacy failures, cancellation and paste parity. Deployed revisions, live database/applied migrations/Scheduler, provider outcomes and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action, email or push occurred. IM1 remains a separate next item; this finite MR2 run ends here.

[Acceptance](ai/acceptance/mr2-manual-reviewer-upload-chain.md); [ADR-037](architecture/ADR-037-manual-reviewer-upload-chain.md).

## SA2 Ask about an image complete locally (2026-10-16)

**PASS for the unattended SA2 code scope: STEP 0-4, fresh serial gates, docs and local commits.** Ask now accepts an owner-scoped image reference for page snapshots, extracted figures and stored Wikimedia visuals. All three mobile/web image surfaces and zoom viewers open the existing Ask panel with a thumbnail, the four specified static chips, typed questions and two follow-ups. SA1 formatting/reveal/session caching remain in use. The server fetches exact scoped bytes, rejects raster input above 3 MiB, supplies section text and attribution to the existing vision adapter, and preserves grounding/admission/error controls. Clients never submit bytes or image URLs. Shared visuals route to sign-in with the share return path and make zero model calls. Offline controls are disabled. No migration, dependency, native module or canonical reviewer rewrite is introduced. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1 remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,226 passed / 3 existing live skips** in 192 files, mobile **1,086/1,086** in 115, shared **324/324** in 34 (includes emitted copies), web **168/168** in 28; provider contract **20/20**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and fixes are retained in acceptance; no nondeterministic flake observed. Code commits: 3a03e34 shared, 1e46ee3 API, 99ba4f7 mobile, c886fec web.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Coordinate API/website and compatible preview OTA publication for the v3 Study Tools contract. Then check image Ask on a page snapshot, figure and Wikimedia image, including inline/zoom controls, all four chips, typed questions, follow-ups, organized answers/reveal, offline behavior and shared-link sign-in return. Production revisions, live database/Scheduler state, actual provider interpretation, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 adds no migration or worker change. MR2 subsequently completed locally; see its newer entry above.

[Acceptance](ai/acceptance/sa2-ask-about-image.md); [ADR-036](architecture/ADR-036-ask-about-image.md).

## SA1 Study Assist complete locally (2026-10-16)

**PASS for the unattended SA1 code scope: STEP 0-5, fresh serial gates, reconciled docs and scoped local commits.** Shared flat markdown-lite parsing, v2 prompts/cache keys, organized mobile/web/shared-link answers, press/completion reveal with manual-scroll and Reduce Motion guards, and the exact four Ask chips with **What is this?** first are complete. Test Me question/choice structure, canonical reviewer content, grounding, owner isolation and all existing limits remain intact. SH1 explicitly accepts retained v1 and current v2 assists with exact content validation. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1 are preserved. No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,208 passed / 3 existing skips** in 191 files, mobile **1,082/1,082** in 115, shared **296/296** in 30 (includes emitted copies), web **164/164** in 27. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and their repairs are retained in acceptance; no nondeterministic flake observed. Code commits: ad92609 shared, 5bcf15e API, 051c649 mobile, 5041c1d web.

**Owner steps remaining:** Rollout and Device checks were entirely skipped. Coordinate API/website and compatible preview OTA publication for the v2 prompt contracts, then check Explain loading/answer reveal, organized answers, Ask chip order, manual scrolling, Reduce Motion and website keyboard/focus on realme and website. Production revisions, database/Scheduler state, actual provider formatting, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 subsequently completed locally; see its newer entry above.

[Acceptance](ai/acceptance/sa1-study-assist.md).

## MR1 long-source reviewer recovery complete locally (2026-10-16)

**PASS for STEP 0-2, fresh serial gates, reconciled docs and local commits.**
MR1 is the first item of the 2026-10-16 roadmap, after GA1b `ed67445`.
Source-sized bounded output budgets, ordered whole-block recovery on known token
exhaustion, two-attempt part quarantine with typed partial results, durable
receipts/cost counts, and safe website/mobile partial notices are implemented.
Short sources keep one call; content filtering and unknown transfer fencing
retain their existing failure behavior. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b are preserved.
[Acceptance](ai/acceptance/mr1-long-source-reviewer.md); ADR-035 records the split/assembly decision.
No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,206
passed / 3 existing skips**, mobile **1,072**, shared **272**, web **154**, engine
**606 evaluations**, AI-first unit **20**, provider contract **20** passed.
Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android
bundle / 35 assets). Zero lint errors, six existing warnings. Repaired first
provider-contract/config-launch failures are retained in acceptance. Code:
747ea4d engine, 7c226ed API, 307000e mobile/web partial disclosure.

**Owner steps remaining:** Rollout and Device checks are entirely skipped.
Deploy API/Google worker and compatible website/mobile code, then re-upload the
SOC SCI 103 midterm material on realme and website and inspect completeness.
Live revisions/database/Scheduler, original incomplete reason/token usage and
physical behavior are **UNVERIFIED (owner to confirm)**. No migration, remote
call, environment-file edit, deployment, Scheduler change or push is part of MR1.
## Library Sort layout follow-up (2026-10-17)

Owner feedback: Sort crowds the title and looks out of place. Finite scope:
move it beside update status on both Library pages, use a compact horizontal
pill, remove duplicate status inset, tighten the option sheet and retain all
presets, touch targets and drag selection. Mobile tests FRESH PASS: 1,135 / 121.
FRESH PASS: forced root typecheck/lint/build, 8/8 each, zero cached; six existing
lint warnings. Preview source bcb9988, group b60fe0f0-5319-4c11-b0a3-9aba991bbc43,
update 01a14a01-00f6-70b7-a358-d708971b2e95, runtime 2.1.0-sdk57, published
2026-10-17 21:15 Manila, applied on Realme. Ten native layout/interaction checks
PASS, with screenshots inspected: title now two lines, status and Sort share a
row, all six menu choices fit, selection toolbar remains compact. Zero matching
fatal/JS errors in current process sample. Draft PR #12 updated; CI pending.
Acceptance: docs/ai/acceptance/realme-library-sort-20261017.md. No remaining
layout blocker; course page left open with Course order selected.

## Library sort presets (2026-10-17)

Owner-approved finite scope: visible Library sorting by updated date, Canvas
module/material order and alphabet, while preserving manual drag order. Cover
both the course grid and saved items, store choices per owner/scope, use the
complete existing material inventory for course sequence, retain a complete
sequence for offline use, verify automated/native behavior, publish preview
and reconcile this record. No backend/schema change or paid generation.
Visible Sort controls now cover the Library course grid and saved items.
Presets: Updated newest/oldest, Alphabetical A?Z/Z?A, Canvas Course order and
My order. Choices are owner/scope specific; dragging switches to My order
without erasing a previously saved order when another preset is selected.
Canvas sequence comes from the complete paginated material inventory, with
linked quizzes placed with their Reviewer. Unlinked work is last. Complete
sequences are cached for offline use; failed refreshes retain the saved one.

FRESH PASS: mobile 1,134 tests / 121 files, web 154 / 26, forced root TypeScript
and lint 8/8 each, zero cached; six existing lint warnings. Root production build passed 8/8, zero cached; native correction and final
publication are recorded below. First icon-mock and old
bulk-toolbar assertion failures were repaired; the full rerun passes.
FRESH PASS: final Android preview group 456c1693-3c24-4104-8bd5-58f2b162d563,
update 01a146c3-084c-7407-acf0-d3f36b97bd70, source 22b4afa, runtime
2.1.0-sdk57, published 2026-10-17 06:09 Manila, is active on Realme
2.1.0/code 5. Visible-title course-grid A-Z and Z-A now pass. Six choices are
visible; item alphabet/date choices, complete course sequence and preserved
manual order passed the preceding feature OTA. Course-order selection also
passes an explicit fresh select/relaunch check on the final OTA. Cached course
sequence/account/choice passed restart without an active default network;
original network settings were restored. The Sort sheet is left open for the
owner. Recent final process log has zero matching fatal/JS errors.

FRESH final mobile suite: 1,135 tests / 121 files, mobile TypeScript, focused
ESLint and final Android export/publication PASS. Web 154 tests and forced root
typecheck/lint/build 8/8 each, zero cached, passed for feature base 29d48e6.
The corrective change only adjusts the pure grid comparator to use the same
courseIdentity title as the tiles. Initial implementation CI passed; final
implementation CI is in progress. No APK, database, backend or paid generation.

See [acceptance](ai/acceptance/realme-library-sort-20261017.md).


## Realme offline startup and current Autopilot integration (2026-10-17)

Owner scope: restore saved-account offline startup, retain the Realme Library
hold/drag and compact toolbar, update to current Autopilot source, and make
Generate Reviewer submit silently without forcing the generation page.

Isolated branch `fix/realme-offline-current-20261017` combines main `ed67445`
with Realme branch `e38f96b`. Current durable course batches, cached-first
screens, Queue, sharing and course-state work are retained alongside the device
Library changes and ExpoGL hotfix. No main push or backend mutation.

Saved SDK credentials unlock owner-scoped device data before online refresh.
Retryable auth transport failures retain offline access; explicit SIGNED_OUT,
invalid/revoked refresh tokens and late pre-logout responses cannot revive it.
SecureStore uses serialized alternating chunk banks and commits the manifest
last; legacy chunks remain readable. A visible offline-access message explains
the saved-content state. Online APIs still verify the bearer token.

Reviewer Generate and confirmed Library Remake save an explicit automatic
intent, submit independently of the screen and leave navigation alone. Queue
tracks accepted jobs. Interrupted admissions resume on launch/foreground with
the same idempotency key; permanent rejection requires a deliberate Retry.
Server background safety begins at acceptance. If the OS kills the process
before acceptance, the saved request resumes when the app reopens.

FRESH mobile suite: 1,124 tests / 119 files PASS. Focused authentication/storage
51 tests PASS; reviewer admission tests cover navigation, restart replay,
duplicate taps, account fencing and permanent rejection. FRESH forced root typecheck/lint/build pass 8/8 each, zero cached; six
existing lint warnings. A final lifecycle concurrency adjustment has fresh
mobile suite/typecheck/lint coverage; the preview export verifies its bundle.
Preview/device acceptance passes as recorded below. Earlier silent-screen assertion
failed because it inspected Copy nodes instead of the rendered Notice; fixed.

Read-only live checks confirm the API production deployment uses `ed67445`
and all CQ1/SP2/SH1/GA1b migrations are present. Vercel connector inspection
returned 403; the explicitly scoped authenticated CLI fallback succeeded.
The installed Realme APK 2.1.0/code 5 includes expo-clipboard, so this remains
a JavaScript-only update on runtime `2.1.0-sdk57`.

FRESH PASS: Android preview group `e2aa9590-bb0b-4afe-908a-36bd52d5cc8c`,
update `01a1465e-b73c-7d7a-be19-13d2ad63195d`, source `a4d11a8`,
runtime `2.1.0-sdk57`, published 2026-10-17 04:19 Manila. The update is
active on Realme 2.1.0/code 5: current cached-first status/Queue and retained
four-icon Library controls are visible. With Android reporting no active
default network, force-stop/relaunch retains the account, opens the course
Library and reads a full saved Reviewer. Native hold/drag reorders two cards;
an inverse drag restores the original order. Original Wi-Fi/data settings are
restored. Recent app-process sample: zero matching fatal/JS errors.

FRESH web suite 154/154, TypeScript and lint pass after mirroring the shared
Library-order preference schema. PR CI initially found that mirror mismatch
and a missing Chromium executable; the workflow now installs its required
Playwright Chromium before browser tests. [Draft PR #12](https://github.com/galaxymaxp/stay-focused-v2/pull/12)
retains the combined changes for mainline review. CI rerun is pending.

NOT RUN: paid real-source generation/deletion and forced real-token expiry on
the phone. Silent admission, screen exit/restart recovery and expired-token
startup are covered by deterministic regressions. The first physical attempt
used Android's stale global mobile-data preference as its offline check; it
was not accepted as offline proof. The successful rerun verifies that there is
no active default network. No native build or backend mutation was needed.

See [acceptance](ai/acceptance/realme-offline-current-20261017.md).

## Realme compact Library selection toolbar (2026-10-17)

Owner UI correction supersedes the earlier Library controls: remove the always
visible remake/remove card, Organize/Done, and the move-to-edge footer. Holding
a saved item reveals four equal icon targets in place of the filter tabs:
remake, trash, select/unselect all, and X to cancel. The header shows the selected
count. Selection covers the current filter, including items beyond the first
page; remake/removal use only that selection and retain confirmation. Dragging
and stored order remain available. The toolbar occupies a fixed 48-point slot
in both modes, preserving the list viewport during the hold.

FRESH PASS: 1,056 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene; EAS preview environment preflight. Final copy-only change also
passes all 70 screen tests.

FRESH PASS: preview OTA group `b1537d74-77d0-4e80-ad86-24fef46abe6d`
from `e4f0ae7` is active on Realme 2.1.0/code 5. Physical checks confirm
three complete Reviewer cards plus part of a fourth remain visible in selection
mode; four equal icons replace the tabs; select all, unselect all and X work.
Native hold/drag and saved order after force-stop/relaunch pass. The original
item order was restored; the course Library is left open in normal mode. Recent
process sample: 0 matching fatal/JS errors. See
`docs/ai/acceptance/realme-library-toolbar-20261017.md`.

## Realme course Library organization (2026-10-17)

Owner scope: home-screen-style organization of saved items inside a course,
not the course grid. Long press selects and arms drag; further taps select
items without opening them. Drop moves the selection as a block. Order is
account/course scoped on the device; filtered-out items retain their slots.
Done returns to ordinary opening. Move-to-edge controls provide a gesture-free
option, and selected removal uses the existing explicit confirmation.

FRESH PASS: 1,052 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene. Final test-only typing correction also passes 66 screen tests.
FRESH PASS: preview OTA group `7dc9a912-93aa-4348-8d1f-ca41911575a6`
from `43131a5` is active on the connected Realme (2.1.0/code 5). Native
hold-to-select and the selection controls were verified. Recent process log
sample: zero matching fatal/JS errors. The owner is testing the phone directly;
agent physical multi-select, drag and restart-persistence checks were not run.
Those behaviors pass automated regression tests. See
`docs/ai/acceptance/realme-library-organize-20261017.md`. No native
dependency, database or backend change.

## Realme Library and generation actions (2026-10-16)

JS-only update adds Generate all Reviewers for ready course materials, including
PPTX slides, with complete fresh pagination and saved-Reviewer skipping. Generated
materials have a shaded row and explicit label; their detail opens the saved
Reviewer or offers Remake. Course Library adds Remake all reviewers and Remove
all saved work with confirmation; individual drafts can now be removed. Server
confirmation precedes local removal, failed items remain visible, and quizzes
are removed before their referenced Reviewers. Batch submissions reuse uncertain
requests, wait up to three minutes for queue capacity, and report partial
acceptance and queue limits. Keep the app open until
submission finishes; accepted work remains server-backed.

FRESH PASS: 91 tests across screen, batch, generation-recovery, local-Library and
Reviewer API suites; mobile TypeScript; focused ESLint; diff hygiene. Initial
checks caught a CRLF-sensitive edit duplication; corrected before final checks.
FRESH PASS: preview OTA `55e1412d-c073-45d6-9bb4-651dfddddb4c` published
from `9ef1340` and applied to the connected Realme (2.1.0/code 5). Physical
checks confirm CC17 Generate all, generated labels, both course Library bulk
actions and the draft Remove swipe. All confirmation dialogs were cancelled;
NOT RUN: live generation or deletion. Recent process log sample has no matching
fatal/JS errors. No native build, backend deployment or migration. See
`docs/ai/acceptance/realme-library-actions-20261016.md` for evidence.

## Realme generation orb hotfix (2026-10-16)

The generation screen incorrectly checked the retired `ExponentGLObjectManager`
native module after the SDK 57 upgrade. It now checks `ExpoGL`, matching the
installed GLView, so supported devices use the existing 3D Knowledge Core.
Scoped from published preview source `079986c`; unrelated unshipped work is
excluded. FRESH generation/core tests: 23/23; mobile typecheck and focused
ESLint PASS. JavaScript-only preview OTA `d1b79016-9ed3-4de4-85af-184896cbc25e`
published from `e18dda0`; FRESH physical Realme verification PASS: the
generation screen shows the animated 3D orb after relaunch. No native/APK/EAS build requested or run.

## GA1b saved course batch generation complete locally (2026-10-16)

**PASS for STEP 0-3, fresh serial gates, docs and local commits.** GA1's
prerequisite questions are resolved by the owner's GA1b answers. Course
Generate all and selection create normal per-material Reviewers, skip exact
current reviewers, and retain owner-isolated preparation intent independently
of Auto and current-course filtering. Pending requests support Cancel/Retry;
normal jobs retain Retry/Open, server quotas and QD1 batch progress on mobile
and web. Confirmation says "Generate N reviewers" without generation minutes.
SP1/CQ1/QD1/SP2/SP2b/SH1 remain preserved. The historical GA1 STOP below is
superseded by GA1b. [Acceptance](ai/acceptance/ga1b-saved-course-batch-generation.md),
[ADR-034](architecture/ADR-034-course-batch-generation.md).

FRESH app gates pass: forced typecheck/lint **8/8 each, zero cached**; API
**2,187 passed / 3 existing skips**, mobile **1,072**, shared **269**, web **154**
passed. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 static
pages/one Android bundle and 35 assets; zero lint errors/six existing warnings.
Forced root build **FRESH PASS, 8/8, zero cached**. Implementation commits:
`6f247f0` API/shared/migration, `2782bc3` mobile, `7a73181` web. Earlier failed
attempts are retained in acceptance. Only unrelated untracked UI files,
mobile `.gitignore` and Supabase CLI temp metadata remain outside these commits.

**Owner steps remaining:** entirely skipped Rollout and Device checks. Apply
`supabase/migrations/20261016010000_course_reviewer_batch_requests.sql` after
preparation/quota/CQ1/SP2/SH1 prerequisites, deploy API/website/worker as needed,
confirm native preview compatibility and publish OTA, then run CIT17/realme/web
Generate all/selection/done skip, quota remainder, Auto off/past-course preparation,
failed preparation/Retry, Cancel and Queue progress/Retry/Open checks. Confirm
existing global poll scheduling; no Scheduler change was made. Live revisions,
applied migrations/rows, Scheduler, latency and physical behavior remain
**UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/application,
deployment, environment-file edit or push is part of GA1b.

## SH1 public reviewer links complete locally (2026-10-16)

**PASS for the unattended SH1 code scope: STEP 0-5, fresh serial gates, docs and local commits.** Website and mobile create/copy/update/stop owner-scoped snapshot links; anonymous `/s/<token>` reads stored content and scores included quizzes in memory. Saved device-local Study Assist and attributed Wikimedia references are included; private account/source metadata, course page images and extracted figures are excluded. Public reads make no auth/model calls or database writes. RLS, bounded rate limiting, revocation, deletion cleanup and account-switch isolation are verified. Code tip `147db48`; [acceptance](ai/acceptance/sh1-public-share-links.md), [ADR-033](architecture/ADR-033-public-share-links.md). SP1/CQ1/QD1/SP2/SP2b are preserved; GA1 remains excluded.

FRESH verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,166 passed / 3 existing skips in 187 files**, mobile **1,068/1,068 in 112 files**, shared **264/264 in 25 files** (includes emitted test copies), web **150/150 in 24 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 generated pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings. Draft failures and repaired import-order warnings are retained in acceptance; no nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks were entirely skipped. Apply new migration files `20261015050000` then `20261015050100` after canonical/SP2 prerequisites, deploy API/website, confirm native `expo-clipboard` support (build/install a compatible preview binary if needed before OTA), then preview OTA and CIT17/private-window/mobile share/quiz/sign-in/update/stop/deletion checks. Confirm website origin and trusted forwarded IP behavior. Revisions, applied migrations/live rows, Scheduler, ingress and physical behavior are **UNVERIFIED (owner to confirm)**. Viewer score saving after sign-in and cross-device assistance synchronization remain follow-ups; this scope deliberately signs in and returns without writing to another owner's quiz. No remote service call, remote SQL/application, env-file edit, deployment, Scheduler action or push occurred. This finite SH1 run ends here.

## SP2b remaining speed findings complete locally (2026-10-15)

**PASS for the unattended SP2b code scope: findings 4/7/8/10/13, tests, fresh serial gates, documentation and local commits.** Courses opens from stored inventory with zero Canvas calls/writes; Today shares one verified bundle; website WebGL loads after useful content; read handlers shed preparation/document imports; Queue/header/generation detail share one owner-scoped reader and poller. Mobile detail follows screen focus. SP1/CQ1/QD1/SP2 are preserved; GA1 stays STOPPED. Code tip `19028c5`; [acceptance](ai/acceptance/sp2b-read-path-speed.md), [ADR-032](architecture/ADR-032-today-and-job-read-context.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,146 passed / 3 existing skips in 183 files**, mobile **1059/1059 in 110 files**, shared **260/260 in 23 files**, web **121/121 in 22 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings. Repaired draft fixture/tracing failures and first mobile gate **1,056 passed / 2 failed** remain recorded in acceptance; no nondeterministic flake observed.

Local deterministic measures: Today **4 requests / 16 data reads + 8 auth/activity calls -> 1 / 9 + 2**; `/today` First Load JS **320 -> 198 kB**; dedicated Today server trace **375 PDF.js package entries -> 0** (79 total files). Courses uses four data reads plus its connection lookup, with the final three reads parallel. Detail **2 sequential requests plus header polling -> 1 shared request/poller**. These are fixture/build counts, not production latency. Mobile orb remains unchanged (Three.js **1,292,907 raw bytes**, not its Metro contribution).

**Owner steps remaining:** rollout and device checks were entirely skipped. Confirm pending SP2/CQ1 migration prerequisites, deploy API/website and preview OTA, then verify CIT17 Courses/Today speed, orb/clock/reduced motion, Queue Retry/Open/extraction/detail, saved content and owner isolation. Deployed revisions, live rows/applied migrations, Scheduler, actual latency/cold starts, physical behavior and Metro contribution are **UNVERIFIED (owner to confirm)**. SP2b adds no migration, region/capacity/queue/service change. Findings 11/12 and GA1 remain separate owner decisions. No remote service call, remote SQL/application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2b run ends here.


## SP2 preparation and Library data path complete locally (2026-10-15)

**PASS for the unattended SP2 code scope (STEP 0-5, fresh serial gates, docs and local commits).** Owner-bound summary projections and exact current-version detail reads replace whole-owner body scans; preparation reuses complete current evidence and batched receipts/controls; independent reads run in parallel; website Library publishes accepted pages while retaining saved cards on partial failures. Existing unchanged-version mobile hydration was already implemented and is retained with stronger regression proof. SP1/CQ1/QD1 remain intact; GA1 remains separately STOPPED, with no batch-generation implementation claimed. Code tip `97a6934`; [acceptance](ai/acceptance/sp2-library-data-path.md), [ADR-031](architecture/ADR-031-library-summary-projections.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,130 passed / 3 existing skips in 182 files**, mobile **1,057/1,057 in 110 files**, web **118/118 in 21 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings; one repaired source-fixture import timeout and earlier draft failures remain recorded. Shared tests NOT APPLICABLE (unchanged source). Diff/staged hygiene PASS.

Same SP0 synthetic fixture: Library **18 reads / 18,900,915 bytes -> 2 / 44,277**; exact reviewer **11 / 18,879,565 -> 2 / 78,702**; preparation probe **700 / 75,400 -> 2 / 4** with empty receipts/controls. Response bodies remain identical. These are local DB JSON counts, excluding unchanged auth/freshness and real inventory/provider costs; no production latency claim.

**Owner steps remaining:** apply new migration file `20261015040000_experience_library_projections.sql` before API publication (including appropriate version-table generated-estimate backfill scheduling), deploy API/website and preview OTA, then perform the entirely skipped CIT17/realme/website Rollout and Device checks. Regions, capacity, live rows/applied migrations/query plans, Scheduler, actual latency and physical behavior are **UNVERIFIED (owner to confirm)**. SP0 findings 11/12 remain owner region/capacity decisions; SP2b is tracked above. No remote service, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2 run ends here.

## GA1 stopped at prerequisite audit (2026-10-15)

**STOPPED at STEP 0 under the unattended prompt's code-surprise rule.** EP1
returns `409 not_ready` without retaining explicit Reviewer intent for pending
preparation; only eligible automatic candidates resume after preparation. E2
estimates saved-reviewer study time, not generation duration. Existing server
quota enforcement is reusable. No product or migration change was made.
The [audit](ai/acceptance/ga1-course-batch-generation.md) records exact evidence,
AG1/AG2 coverage gaps, reusable paths and the two owner questions; [ADR-030](architecture/ADR-030-course-batch-generation.md)
is deferred. QD1 remains PASS locally; SP1/CQ1 behavior is unchanged.

FRESH baseline prerequisites **3/3 PASS**; product gates **NOT RUN** (zero
typecheck/lint tasks, tests or builds). Documentation whitespace checks pass
with zero errors. Owner steps remaining: resolve explicit intent resumption and
confirmation-time semantics, resume implementation/gates, then perform the
entirely skipped Rollout and Device checks. Production/database/Scheduler/CIT17
and physical state are **UNVERIFIED (owner to confirm)**. No remote service,
environment-file edit, deployment or push occurred.

## QD1 header Queue complete locally (2026-10-15)

**PASS for the unattended QD1 code scope (STEP 0-4, gates, docs and local commits).** Queue now opens over the current screen from the mobile/web header. Shared owner-scoped sources replace duplicate list polling, with running-only badges, unseen failure dots, progress, Retry, and the latest five completed entries from the existing bounded Queue window. Mobile keeps Auto, pending request recovery and outside/Back dismissal; web has native keyboard activation, focus entry/return and Escape/outside dismissal. Old Queue routes open the overlay; the separate processing notification target, SP1 and CQ1 remain intact. Code tip: `1183369`; [acceptance](ai/acceptance/qd1-queue-dropdown.md), [ADR-029](architecture/ADR-029-queue-dropdown.md).

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; mobile **1,056/1,056 in 110 files**, web **113/113 in 20 files**, zero skips. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Lint: zero errors, five existing mobile warnings plus one existing web warning. Failed draft and first gate attempts remain in acceptance; no nondeterministic flake observed. API/shared tests **NOT APPLICABLE** because their source is unchanged.

**Owner steps remaining:** deploy website, publish preview OTA, then run the entirely skipped Rollout/Device checks on realme and website, including Retry/Open, old links, Back/outside dismissal, Reduce Motion and website keyboard/focus. Deployed revisions, database/Scheduler state and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service action, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. QD1 adds no migration/API/worker change. Next separate roadmap item: GA1; this finite QD1 run ends here.


## CQ1 current and past courses complete locally (2026-10-15)

**PASS for the unattended CQ1 code scope (STEP 0-4, gates, docs and local commits).** Current courses show by default; past courses stay in collapsed sections on mobile and website with owner controls to move either way. Shared Canvas conclusion/enrollment/course/term evidence drives the automatic rule; Default Term without completion evidence stays current. Past-course work is omitted from Today, Tasks, calendar, Queue, notification fan-out, routine sync and eager preparation. Explicit opens/refreshes sync once; Library reviewers and quizzes remain labelled and available. Code tip: `6d8759e`; [acceptance](ai/acceptance/cq1-current-and-past-courses.md), [ADR-028](adr/ADR-028-current-and-past-courses.md).

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,120 passed/3 skipped in 180 files**, mobile **1,042/1,042 in 105 files**, shared **258/258 in 22 files** (includes emitted JS copies; source-only **129/129 in 11 files**), web **95/95 in 16 files**, Canvas **75/75 in 1 file**. Standalone API/web/Android builds **1/1 each**. Lint: zero errors/five existing warnings. Repaired draft/first-gate failures and one earlier API timeout flake remain recorded in acceptance; the final serial run passed without retries.

**Owner steps remaining:** apply migration files `20261015030000` then `20261015030100`, publish API/website/worker and preview OTA, then run the entirely skipped Rollout/Device checks on realme and website. CIT17 Default Term identities/counts, live course evidence, deployed revisions/database/Scheduler state, actual speed and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. Next separate roadmap item: QD1; this finite CQ1 run ends here.

## SP1 saved-first screens complete locally (2026-10-15)

**PASS for the unattended SP1 code scope.** Mobile and website render owner-scoped saved Today, Courses, course pages, Tasks/Work, Library and Reviewer content before background requests. Static Syncing/Updated/Retry status preserves saved content on failure; open reviewers require an explicit tap to accept a changed revision. Exact course-page offsets, stable course/list positions, sign-out purge, account-switch isolation and browser storage fallback are covered. Code tip: `15811de`; [acceptance](ai/acceptance/sp1-cached-first-screens.md), [ADR-027](architecture/ADR-027-cached-first-screens.md).

FRESH final verification: forced typecheck and lint **8/8 tasks each, zero cached**; mobile **1,036/1,036 in 105 files**, shared **223/223 in 19 files**, web **94/94 in 16 files**, no skips. Standalone API/website/Android builds pass **1/1 each**; forced repository build passes **8/8, zero cached**. Lint retains five existing warnings/zero errors. First mobile gate was **1,032 passed/4 failed** (schema-version and header-position fixtures); focused repair **77/77** and full rerun pass. Draft failures remain recorded; no flake observed. API tests are NOT APPLICABLE because API source is unchanged.

Production/deployed revision, actual first-content latency and physical/browser RB3 behavior are **UNVERIFIED (owner to confirm)**. Rollout and Device checks were entirely skipped. **Owner steps remaining:** preview OTA, website deployment, then RB3 saved reopen, airplane-mode Retry, second-account isolation and open-reviewer checks. No remote service call, remote SQL/migration, Scheduler action, environment-file change or push occurred. Next separate item: CQ1; this run does not start it.

## SP0 speed audit complete (2026-10-15)

**PASS for the local docs-only SP0 scope.** [Speed audit](architecture/sp0-speed-audit.md)
at `588bbf1` maps both platforms' main screens, caches, API/database costs,
Canvas sync/preparation, hosting evidence and bundle sizes. Leading findings:
pre-pagination preparation N+1 (700 reads in a simple 100-material example),
whole-owner artifact/body scans, network-first screen loads, live Canvas inventory
on Courses, and the website Library's all-pages publication gate. No product fix
or schema change was made. This supersedes the F0S "SP0 next" checkpoint below.

FRESH: web build PASS (19 static pages, 28 routes; Today First Load JS 315 kB),
mobile local Library tests 9/9, final hook probes 2/2 (11 resource cases plus web
Library), synthetic service probe 12/12 observations, and docs diff hygiene PASS.
The audit/handoff retain the failed JSX harness attempt and tooling limitations.
Production timings, CIT17 course/Default Term counts, deployed regions and queue
capacity remain **UNVERIFIED (owner to confirm)**. Rollout/Device checks were
skipped; no service calls, environment edits, push or later feature work occurred.
Next separate item: SP1 saved-first screens; CQ1 and SP2 have audit inputs.

## F0S released-main base established (2026-10-15)

**PASS for the unattended F0S scope.** Branch
`overnight/2026-10-15_feedback` was created directly from GitHub `main`
`079986c` (PR #10), fetched using the new `github` remote. The existing local-path
`origin` is unchanged. All 37 overnight-added migrations and all added source
paths exist in released main; no untracked files needed moving.

FRESH baseline: forced typecheck/lint/build each passed 8/8 tasks, zero cached;
lint has zero errors and five existing mobile warnings. Shared 134/134, Canvas
75/75, mobile 1,026/1,026 and web 84/84 tests passed. API initially had one
5-second timeout (2,095 passed, three skipped); the unchanged full rerun passed
2,096 tests with three skips in 179 files. Tests used repository-local temp.
Exact commands and both API attempts are recorded in the F0S handoff.

This establishes the local Git baseline and supersedes older branch/PR-pending
descriptions below. Production and physical-device state are **UNVERIFIED
(owner to confirm)**; no service calls, rollout, migration application, environment
edits or push occurred. Owner steps remaining: none for F0S. SP0 is the next
separate tester-feedback item; no later feature work was started.

## Realignment and mobile visuals parity in progress (2026-10-15)

Owner-approved finite scope: realign to main 150df38 (PRs #7/#8), deliver
JS-only mobile automatic reviewer visuals and inline lazy course visuals,
pass all quality gates, merge by PR, publish preview OTA, then verify existing
Reviewers and finish notification/offline checks on the realme. No new manual
Reviewer generations: the two PDF/PPTX smoke generations are complete.

Main was fast-forwarded from d0fa50b to 150df38; pre-realignment edits are
preserved locally on wip/pre-realign-20261015 at 6ad67bf. Clean-main fresh
root typecheck passed 8/8 before edits. Cloud Run generation-worker-00027-rz2
serves 100% from 150df38; authenticated health 200, unauthenticated 403.
Supabase migration 20261015020000 was already applied and remains untouched.

Mobile parity branch feat/mobile-reviewer-visuals-parity now has 1,024 passing
mobile tests in 102 files (+15), fresh root typecheck/lint 8/8 and Expo Doctor
21/21. Fresh root build also passes 8/8 (2m45.765s). PR/CI/merge, OTA, and physical acceptance are pending.
Finished APK 12ab0357 (2.1.0/code 4, source f989710) is kept; mobile parity
will arrive through OTA on runtime 2.1.0-sdk57. The existing account is preserved.
Canvas schedule stays enabled every five minutes; owner automatic reviewers
are restored. Broad student email stays off because no sending domain is owned.
See [release evidence](ai/acceptance/release-20261014.md); older entries below are historical.

## VL3 Find a visual completed locally; rollout pending (2026-10-14)

**Code complete; unattended run FAILED on the validation-temp guard.** Initial
full API regressions cleaned only their own newly created synthetic Office
directories in Windows Temp before TEMP/TMP were redirected into the repository.
Final validation uses repo-local temp; the deviation cannot be retroactively
undone. Feature gates are green; exact counts and the incident are in the handoff.
Sections without an available source snapshot
or extracted figure can explicitly request a Wikimedia Commons reference while
online. Five bounded, freely licensed candidates are filtered with plain credit,
then at most three existing OpenAI vision calls require a direct match at 0.90
confidence. Weak/empty results say **No reliable visual found**; provider failures
remain retryable and never cache that outcome. No automatic search trigger.

The separate card and zoom sheet always say **External reference — not from your
course material.** Credit/license link to Commons; legal license details have a
separate link. Existing tokens and zoom viewer are reused. Positive read-only
reachability and completed source discovery gate the action; offline/source-image
transitions hide the card. Canonical prose/source evidence and offline copies
receive no external content. Find another is offered once, then cache is reused.

Forward-only `20261014000700_section_external_visuals.sql` is written, **not
applied**. Owner/version/section cache, safe-column RLS/grants, artifact/account
cascades, a service-only 120-second lease and serialized rolling-day reservations
cap all external searches at 20/owner/day including failed attempts. Found/none
results persist before response; expired/deleted/replaced work cannot publish.
The existing provider gains typed image URL input without a new key/env/SDK.

Exact FRESH gates and failed draft attempts are in the
[VL3 handoff](ai/handoff.md#vl3-unattended-find-a-visual-2026-10-14).
[ADR-020](architecture/ADR-020-visual-learning.md#find-a-visual-vl3) records caps,
licensing, source precedence, cache semantics and separation. Rollout and Device
checks were entirely skipped. Owner steps: apply the migration through the
Supabase connector (filename as name), deploy API, publish preview OTA, confirm
runtime Wikimedia egress and perform RB2 realme label/no-result/offline/source
checks. Live runtime/migrations/provider quality/concurrency/device behavior are
**UNVERIFIED (owner to confirm)**. No production service call, environment edit,
deployment, remote SQL, Scheduler change or push occurred.


## VL2.1 PPTX page snapshots completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** PPTX now uses the existing page snapshot renderer and VL1.3 pre-render path.
Preparation converts the accepted original with isolated headless LibreOffice,
with a 60-second deadline, process kill, 20 MiB output / 100-page caps, safe PDF
validation and temporary-file cleanup. Full archive bounds and linked-media
rejection precede native execution. Conversion failure or missing local binary
leaves material prepared and keeps VL2 extracted figures as the fallback.

Receipt identity is owner + Canvas file + exact metadata fingerprint + original
SHA-256. The new forward-only migration
`20261014000600_office_page_snapshots.sql` is written, **not applied**. It
adds a private PDF bucket, immutable service-only receipts with RLS/grants and
server-derived accepted-snapshot fingerprint binding. Changed revisions convert
again, unchanged ones reuse, and historical conversions/originals remain retained.
Old unbound/edited/composite Office sources fail closed; no provenance backfill.

PPTX blocks map pageNumber to slideNumber in presentation order, including blank
and hidden slides. Canonical citations and exact accepted conversion evidence
qualify snapshots. Missing original/converted bytes cannot be bypassed by cache.
Original PDF/local checks, rendering budgets, system exemption, leases and
completion remain shared. Mobile adds From slide n / Slide n labels to the
existing viewer without changing polling, gestures, tokens or offline behavior.
Canvas/synchronous original PDFs keep the 40-page limit; converted page counts
live only in their own rendering receipt. DOCX pagination is not deterministic
from existing blocks, so the permitted PPTX-only scope ships; DOCX snapshots
remain a follow-up, and its VL2 extracted figures continue to work.

Worker image installs only the approved LibreOffice writer/impress components
with --no-install-recommends, apt-list cleanup and writable non-root HOME.
Estimated delta is 250-500 MiB uncompressed / 100-200 MiB compressed; estimated
small-deck startup/conversion is 5-30 seconds. No repository-documented image or
cold-start numeric limit was found. Actual image size, peak RSS, cold start and
native conversion fidelity are **UNVERIFIED (owner to confirm)**; no image build
was run. Exact fresh gates and draft failures are in [VL2.1 handoff](ai/handoff.md#vl21-unattended-office-page-snapshots-2026-10-14).
See [ADR-020 Office page snapshots](architecture/ADR-020-visual-learning.md#office-page-snapshots-vl21).

Final FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,997 passed / 3 existing skips
(169 files); mobile 984 passed (95 files); API build 34/34 pages; Android export
1 bundle / 31 assets; whitespace 0 errors. No failed required gate; draft fixture
and syntax failures are retained in the handoff.

Owner steps remaining: review/apply the migration through the Supabase connector
(filename as name, never db push), rebuild/deploy the worker and measure its
real size/cold start/peak RSS, deploy API, publish preview OTA, then RB2 realme
From slide n and conversion-failure figure-fallback checks. Rollout and Device
checks were entirely skipped. Deployed state, prerequisites, migrations/buckets,
queue/IAM/Scheduler, retained source rows and physical behavior are unverified.
No deployment, production service call, remote SQL, environment-file edit, Scheduler
change or push occurred. Next code work requires a separately prompted item.


## VL2 extracted source figures completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Preparation extracts the exact original's
PDF raster figures and PPTX/DOCX media. Named size, area, repetition, count and
time limits remove tiny/repeated decoration and bound work. PDF.js image objects
and a pure JavaScript PNG encoder need no new dependency. Office preparation and
accepted manifests share structural drafts; standalone and composite admission
retain canonical cited IDs. No generated/external image or model caption.

Figures run only after prepared/succeeded completion, outside its transaction.
Failure is code/count-only and leaves preparation successful. Private immutable
rows bind owner + file/asset + original SHA-256; revision receipts also preserve
successful empty extraction. New revisions re-extract, unchanged ones reuse, and
historical rows/originals remain retained under ADR-021. Both migration files
`20261014000400_source_figures.sql` and
`20261014000500_source_figure_extraction_receipts.sql` are written, **not applied**.

Owner-only bearer API routes use private no-store responses, strict canonical
citations and exact accepted material/hash. Batched availability signs no images;
only fully receipted extractions are visible. Opening a section returns at most
12 short-lived signed images. Office requires
the new structural parser, so old flattened snapshots are not guessed into
alignment. Missing/deleted/edited or ambiguous evidence exposes no figures.

Mobile shows the image action only where figures exist, hides it offline, and
opens the existing bottom sheet with page/slide labels, one figure at a time and
the existing bounded pinch/pan/double-tap viewer. Existing tokens, Reduce Motion
and dismissal are retained. Eligible VL1 page snapshots remain the fallback.
Office vector rendering belongs to VL2.1. Durable uploaded local PDFs are covered;
legacy hashless assets and stateless synchronous OCR lack a retained exact
original and receive no guessed figure binding or new asset backfill.

Final FRESH gates: forced typecheck 7/7 and forced lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,947 passed / 3 existing skips
(166 files); mobile 979 passed (95 files); API build 34/34 static pages;
Android export 1 bundle; whitespace 0 errors. Draft failures, the initial
PGlite timeout and exact validation details are retained in the
[VL2 handoff](ai/handoff.md#vl2-unattended-extracted-figures-2026-10-14).
See [ADR-020 Phase 2](architecture/ADR-020-visual-learning.md#phase-2-extracted-figures-vl2).

Owner steps remaining: apply both migrations through the Supabase connector
(filename as name, never db push), deploy worker and API, publish preview OTA,
then RB2 realme figure/logo/no-icon, zoom, offline and snapshot-fallback checks.
Rollout and Device checks were entirely skipped. Deployed state, applied
migrations/buckets, retained originals, costs and device behavior are
**UNVERIFIED (owner to confirm)**. No remote service call, environment-file edit,
Scheduler change or push. VL2.1 is now completed locally above; DOCX pagination remains a follow-up.

## VL1.3 cited page pre-render completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Manual and automatic Reviewer completion share
one post-commit hook that reserves and dispatches every distinct lowest cited
section page, at most 100, sequentially. The exact accepted standalone Canvas PDF
or unchanged accepted local PDF is resolved once. Edited, Office and multi-source
materials are silent no-ops. Failures log fixed codes/counts and cannot change
the committed Reviewer outcome; completion before a student opens is best effort.

New forward-only migration `20261014000300_system_page_snapshot_prerender.sql`
is written, not applied. Existing/default snapshot rows remain student-origin;
service-only system reservations bypass the rolling 20-render student cap.
Student reservation and claim count student work only; system attempts retain
the three-claim bound, leases and deletion fences. Idempotent reuse never changes
origin. Older reviewers keep their capped on-open fallback. Existing mobile
header discovery shows ready images without a student reservation; no mobile
or EP3 source change was needed.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,896 passed / 3 existing skips (160 files),
API build 34/34 static pages (16 steps / 1 workflow), whitespace 0 errors. Unchanged
mobile snapshot discovery/viewer tests also pass 22/22. Full mobile/Android gates
are NOT APPLICABLE because mobile is unchanged. Draft failures and exact counts
are retained in the [VL1.3 handoff](ai/handoff.md#vl13-unattended-cited-page-pre-render-2026-10-14); see [ADR-020 Pre-render](architecture/ADR-020-visual-learning.md#pre-render-vl13).

Owner steps remaining: apply the migration through the Supabase connector using
the filename as name (never db push), deploy worker then API, and run RB2 realme
new-PDF instant-image / older-reviewer on-open-fallback checks. Rollout and Device
checks were entirely skipped. Deployed revisions, applied migrations, queue/IAM,
Scheduler, retained bytes and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.
VL2 subsequently completed locally above; EP3 remains committed.

## EP3 preparation status completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** EP3 STEPS 0-3, all required fresh gates,
documentation and local commits are complete. The corrected owner roadmap is
readable; the earlier missing-roadmap STOP is superseded. Each current Canvas
revision exposes a fixed safe preparation status. Older prepared revisions never
make newer work Ready; backlog/deferred work is Preparing, failed/cancelled/capped
or guard-paused work is Couldn't prepare. Unsupported/empty/unavailable stay
explicit. Legacy fields remain for one release; strict older Canvas clients keep
their response shape unless they opt in with '?preparationStatus=1'.

Mobile replaces normal Prepare actions with Ready / Preparing / Couldn't prepare.
Only failures offer Retry, hidden on observed connection failure. Preparing has
no animation (including Reduce Motion); Reviewer and Quiz wait for Ready. Focus
refresh and serial ten-second polling are bounded to 18 reads/polls per refresh
cycle and stop on terminal status, blur/background or offline evidence. Later
loaded pages keep their pagination and refresh their own material statuses.
Retry uses EP1's single admission/dispatch path, with accounting reset only in
the serialized RPC, cumulative lifetime attempts retained, and double submission/
Ready reconnection idempotent. Existing Reviewer Retry recovery remains intact.
No migration or native dependency was added; owner RLS/private columns are intact.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,856 passed / 3 existing skips, mobile
959 passed, API build 34/34 pages (16 steps / 1 workflow), Android export one
bundle / 31 assets, whitespace 0 errors. Draft failures and exact counts are in
the [EP3 handoff](ai/handoff.md#ep3-corrected-prompt-continuation-2026-10-14); see [ADR-026 Client status](architecture/ADR-026-eager-preparation.md#client-status).

Owner steps remaining: deploy API then preview OTA after EP1/EP2 prerequisites;
RB2 realme checks new PDF Preparing -> Ready without a tap, forced failure plus
Retry, airplane-mode Retry visibility, and Reduce Motion. Rollout and device
checks were entirely skipped. Deployed revisions, applied migrations, job rows,
queue/IAM, Scheduler and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.

## EP2 preparation backfill completed locally; rollout pending (2026-10-14)

EP2 STEPS 0-3 are implemented locally. The corrected external roadmap was read;
the earlier EP2 missing-path STOP is superseded. Active selected owned courses,
including completed courses skipped by notification polling, now receive fair
poll-owned preparation visits without another sync or student request. Inactive
or unselected courses wait until their connection/selection permits preparation.

Complete source eligibility and batched exact-revision/control reads seed only
unprepared, unsuppressed, below-cap materials into the existing discovery backlog.
EP1's admission, worker and 25/200 runaway guard remain the single preparation
path. Stable five-material round-robin turns are bounded by 25 per course and
50 globally per poll invocation; at most 20 courses are leased for 90 seconds.
Live sync/discovery and student Retry recover before backfill. Worker completion
cannot advance a backfill ledger outside the poll budget. Durable visits and
idempotent discoveries/receipts recover seed/admission/registration crashes.

New forward-only migration `20261014000200_canvas_preparation_backfill.sql` is
written, not applied. It adds service-only fair course visits with safe owner
RLS reads and explicit grants. The real discovery/PGlite proof prepares all
230 old materials within budgets; the five-material course is fully admitted
in the first round. Existing EP1 tests pass unchanged. Final FRESH gates:
typecheck 7/7, lint 7/7 (four existing mobile warnings), shared 133/133,
API 1,841 passed / 3 existing skips, API build 34/34 pages, whitespace 0 errors.
First timeout/typecheck failures and exact results are retained in the
[EP2 handoff](ai/handoff.md#ep2-corrected-prompt-continuation-2026-10-14).
See [ADR-026](architecture/ADR-026-eager-preparation.md#backfill) for budgets, priority and resumability.

Rollout and device checks were entirely skipped. Owner steps: apply the EP2
migration after EP1's two migrations, deploy API and Google worker, observe
per-course backfill counts and guard state not `tripped`, then RB2 checks an
old never-opened material shows Ready on realme. Deployed revisions, migrations,
credentials, Scheduler, production inventory, OCR/cost and retained bytes are
UNVERIFIED (owner to confirm). No remote call, environment-file edit or push.

## EP1e eager preparation completed locally; rollout pending (2026-10-14)

**EP1 STEPS 0-4 are implemented locally.** The EP1d revision-byte binding STOP
was answered by the owner and repaired in `0678d03`; the preparation store was
committed in `310734f`. Additional complete-inventory and binding repairs are
`0ad268b`, `2ac0ee3` and `501b28b`. Earlier cap/pagination repairs remain intact.
The historical EP1/EP1b/EP1c/EP1d sections below are superseded by this section.

Every eligible new/changed revision now enters durable preparation independently
of automatic-reviewer preferences or baseline. The Google worker persists
original identity, complete extraction/page evidence and canonical blocks before
publishing `prepared`. Job-scoped broker leases, revision fences, cancellation,
one cycle retry/three automatic attempts and explicit Retry protect publication.
Manual/automatic/Activity Maker/preview consumers use this result path; pending
material has no preview-text Reviewer fallback or second OCR. Mobile UI is
unchanged and existing readiness/response shapes remain compatible.

Durable batches contain 25 jobs, with 200 maximum per sync/poll cycle. Actual
guard SQL fed by the real 230-file discovery fixture completes 200 and defers
30, then drains 30 in the next poll cycle without a new item. Repeat/no-progress
signals persist owner-readable guard state and suppression. Sync wakeups,
discovery backlog and dispatch receipts recover interrupted work. Provider
cooldowns are preserved in durable scheduling, including binary downloads.
ADR-021 original retention and Canvas 40/local durable 100/40 limits remain.

Both forward-only preparation migrations are **written, not applied**:
`20261014000000` and `20261014000100`. See
[ADR-026](architecture/ADR-026-eager-preparation.md) for the design and safe guard
queries, and the [EP1e handoff](ai/handoff.md#ep1e-unattended-continuation-2026-10-14)
for exact commits, final FRESH gate counts and failed-first-attempt evidence.
EP2 backfill and EP3 preparation status are complete locally; owner rollout remains pending.

Rollout/device checks were entirely skipped. The owner must apply both migrations,
deploy API/Google worker, confirm Cloud Tasks queue/IAM, watch the first CIT17
sync and run RB2's realme sync-to-Ready check. Live revisions, migrations,
credentials, Scheduler, inventories, retained bytes and OCR/cost remain
**UNVERIFIED (owner to confirm)**. No remote service call, deployment, environment
file edit, notification/email or push occurred.

## EP1d placement inventory repaired; revision-byte binding STOP (2026-10-14)

**STEPS 0.7/0.8 done locally; EP1 STOPPED before STEPS 1-4.** `996574a`
pages owned Modules/ModuleItems with the existing stable, bounded File/Page
helper and fails closed before placement/admission. `e739cab` also completes
file-reference and open automatic-candidate reads under the standing inventory
authorization. The real 1,002-item placement case passes with a modeled
1,000-row response cap; focused source/admission tests pass FRESH 78/78.
Earlier Canvas 40-page and File/Page fixes remain intact.

A new non-inventory surprise blocks safe reuse of ingestion: inventory SQL
advances a file's content fingerprint to revision B and keeps revision A's
original hash/key with `not_requested`. `ingestOneCanvasFile` then matches the
new metadata fingerprint without checking the ingestion state or its binding
to the stored bytes, marks `unchanged`, and never downloads B. A local test
executes the actual inventory SQL and real ingester: 1 passed, 17 deliberately
filtered; 0 downloads/uploads. This can associate A's bytes with B's revision.
The unattended STOP rule requires a new owner answer; see the
[EP1d handoff](ai/handoff.md#ep1d-unattended-continuation-2026-10-14).

No preparation store/migration/types, worker/broker extension, guard, deferred
drain or consumer changes were started. ADR-026 remains free; EP2/EP3 remain
blocked. Rollout/device checks entirely skipped; live impact is
**UNVERIFIED (owner to confirm)**. Earlier EP1c placement approval questions
below are historical and superseded by the completed repair.

Retained-repair gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached;
4 existing lint warnings), shared 133/133, API 1,766 passed / 3 existing skips,
API build 34/34 pages, diff 0 errors. Final focused tests: 102/102. The first
full API run failed one outdated query fixture; correction and rerun are
recorded in the handoff. Mobile gates NOT APPLICABLE.

## EP1c File/Page inventory repaired; placement completeness STOP (2026-10-14)

**STEP 0.6 done locally; EP1 remains STOPPED before STEPS 1-4.** Owner-approved
File/Page reads now use stable ID order and 200-row ranges, with a 50-page
safety bound per owned course/type. Errors or an exhausted bound fail explicitly;
AG1 records no candidate/baseline from that incomplete evidence. Real listing
regressions discover all 230 Files and all 230 Pages with correct public
pagination; mixed placement/exclusion and Page reference behavior is preserved.
The earlier Canvas 40-page repair `23cb9d0` remains intact.

A separate placement-evidence surprise requires continuation review:
`readModules` / `readModuleItemsForReferences` still perform a single
unpaginated read. Under a modeled 1,000-row server cap, the actual source-list
path silently omits an independently placed instructional attachment and admits
an administrative file whose excluded module placement was beyond the cap;
`hasMore=false`. This is distinct from the repaired File/Page cap. Live row-limit
configuration/impact is **UNVERIFIED (owner to confirm)**. See the exact evidence
and continuation question in the [EP1c handoff](ai/handoff.md#ep1c-unattended-continuation-2026-10-14).

Commit: `c5d537b`. Retained-repair gates FRESH PASS: forced typecheck/lint 7/7
each (0 cached; 4 existing warnings), shared 133/133, API 1,756 passed / 3 skips,
API build 34/34 pages, diff 0 errors. Mobile gates NOT APPLICABLE.

No preparation migration/types, result store, worker/broker extension, guard,
poll drain or consumer gating was added. ADR-026 remains free. EP2/EP3 remain
blocked on EP1. Rollout and device checks entirely skipped.

## EP1b eager preparation continuation (2026-10-14)

**STOPPED on a new preflight finding; STEP 0.5 is committed locally.**
`23cb9d0` restores deferred Canvas PDF validation to the existing 40-total-page
limit before inspection/OCR, including reused page counts. Local durable PDFs
retain 100 total / 40 OCR-required pages. Focused tests: FRESH 29/29 in 3 files.
Retained-fix gates FRESH PASS: forced typecheck/lint 7/7 tasks each (0 cached,
4 existing lint warnings), shared 133/133, API 1,749 passed / 3 existing skips,
API build 34/34 pages and diff check 0 errors. Mobile gates NOT APPLICABLE.

The source-list inventory is silently capped at 150 Files and 150 Pages.
An offline reproduction with 230 eligible files returns 150, then
`hasMore=false`; 80 are omitted. EP1's discovery cannot treat that as complete
evidence for the required 200-prepared/30-deferred behavior. The unattended
surprise rule requires an owner answer before repairing this additional boundary.
The exact question and evidence are in the [EP1b handoff](ai/handoff.md#ep1b-unattended-continuation-2026-10-14).

The unfinished preparation-store draft was removed; no new migration/types,
worker task, broker extension, sync guard, deferred drain or consumer changes
remain. ADR-026 remains free and the latest migration remains `20261013000500`.
EP1 STEPS 1-4 remain incomplete; EP2/EP3 and visual phases still depend on them.
Rollout/device checks were entirely skipped. Already-stored Canvas sources over
40 pages and all live state are **UNVERIFIED (owner to confirm)**.

## EP1 eager preparation preflight (2026-10-14)

**STOPPED at STEP 0; no EP1 implementation or migration added.** The required
code recheck found that deferred Canvas PDF extraction uses the local durable
100-page limit, contradicting EP0's assumed 40-page Canvas extraction cap.
The later Canvas snapshot constraint remains 40 pages; it does not prevent
earlier inspection/OCR. This is a repository finding, not a live production claim.

EP1's overriding unattended STOP rule requires owner review before continuation.
The proposed continuation first enforces the existing 40-page Canvas rule before
inspection/OCR, including stored page-count reuse, while preserving local durable
PDFs at 100 total / 40 OCR-required pages. EP1 STEPS 1-4 and their gates remain
NOT RUN. ADR-026 is still free; the latest migration remains `20261013000500`.
EP0's completed audit is historical evidence, with the cap correction annotated.
Rollout and device checks were entirely skipped; live state is UNVERIFIED
(owner to confirm). See [EP1 handoff](ai/handoff.md#ep1-unattended-preflight-stop-2026-10-14).

## EP0 eager preparation audit (2026-10-14)

**PASS for docs-only local scope; EP0 done, EP1 next.** Fely decided to prepare
every instructional Canvas material on sync, with cost accepted and no per-user
preparation cost cap. Guard: 200/sync, checked every 25 for repeat/no progress;
three attempts across syncs require student Retry. VL2.1 LibreOffice is approved
for its later slice. The EP0 prompt records P0 confirmation at 12:48.

The [preparation audit](architecture/ep0-preparation-audit.md) maps binary
ingestion, later extraction/blocks, provenance, every trigger, eligibility,
retention and worker context with file:line evidence. Today's Prepare means
stored bytes, not completed extraction. A worker can run the existing path
using brokered tokens and awaited dispatch; no request-context STOP was found.
EP1 needs one durable job/result per owned material/revision, full prepared
admission gates and a persisted batch guard/overflow drain. Use ADR-026 if still
free; ADR-021 through ADR-025 are occupied.

Historical read-only CIT17 evidence: five PDFs / 164 pages / 8,973,082 bytes;
actual OCR share, full current inventory and dollar cost are UNVERIFIED (owner
to confirm). No fresh service query or provider work. FRESH git diff --check
PASS (0 whitespace errors); typecheck/lint/tests/builds NOT RUN (0), docs only.
One local docs commit; no code, migration, deployment, remote SQL, Scheduler,
email, environment edit or push. Rollout and device checks entirely skipped.
RB1/N1 owner acceptance remains separately pending; this owner-authorized EP0
slice supersedes the earlier blanket autopilot pause for this audit.
See [EP0 handoff](ai/handoff.md#ep0-unattended-preparation-audit-2026-10-14).

## RB1 rollout — device acceptance in progress (2026-10-13)

**Production-deployed at exact commit `9d6f254`; device acceptance NOT RUN.**
This section supersedes the rollout-pending statements in the earlier local
slice records below. Autopilot remains paused until RB1 and the requested N1
continuation are handled.

API `dpl_D7XoTybcNT1ib9AMcEvXYU8tKB4P` is READY and healthy; worker
`generation-worker-00024-p6n` is READY with 100% traffic and authenticated
health 200. Preview OTA group `3b109b84-f28d-4557-b1ba-433a1a2e9145`
is published on Android runtime `2.0.1`. Five forward-only migrations applied
and passed object/RLS/grant/private-bucket verification. No RB1 env change.

| Item | Deployment | RB1 device acceptance |
| --- | --- | --- |
| P1 hidden grades, Grades navigation, Matching cap | API + preview deployed | NOT RUN |
| AG2 polling and labels | API + preview + migrations deployed; poll inactive | Queue Auto NOT RUN; Library/reviewer automatic labels BLOCKED (no successful automatic artifact) |
| PV1c Canvas PDF provenance retention | API + worker + migration deployed | NOT RUN |
| VL1.1b Canvas page snapshots | API + worker + preview + migration deployed | NOT RUN |
| E2 review-time estimate | API + preview deployed | NOT RUN |
| G1.1 drop rules | API + preview deployed | BLOCKED (no live drop-lowest fixture) |
| H1b private logging | API + worker deployed | End-to-end generation NOT RUN |
| VL0c/VL1.2 local PDF provenance/snapshots | API + worker + preview + migration deployed | NOT RUN |
| O2c offline quiz scoring | API + preview deployed | NOT RUN |
| H2/H2b dependency fixes | API + worker deployed | Dispatch/completion NOT RUN |
| H3 private responses | API deployed; FRESH owner GET 200/private,no-store PASS | Live API check PASS |
| H4 legacy review retirement | API deployed; FRESH POST /api/review 404 PASS | Canonical generation NOT RUN |

STEP 5 is **DEFERRED to N1 notification activation (separate owner step;
follows docs/architecture/canvas-email-notifications.md, including
skip_stale_canvas_email_events_v1 before any send)**. No RB1 cron call,
Scheduler operation or Resend activation. N1 starts after RB1 acceptance/docs;
creating/resuming Scheduler requires its separate STEP 5 yes.

FRESH pinned gates PASS: forced typecheck/lint 7/7 each (zero cached; four
existing lint warnings), shared 108/108, API 1,735 passed/3 existing skips,
mobile 928/928, API build, Android export and diff check. The first OTA command
stopped before publication for a missing noninteractive message; the owner
approved the explicit-message retry, which published one update group.

See [RB1 rollout evidence and device matrix](ai/acceptance/rb1/rollout.md).


## H4 legacy review route retirement (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
Security status: **H1-03 FIXED locally (retired)**. Fely selected option 1 on
2026-10-13 at 18:27: retire the legacy /api/review route if unused. STEP 0 found
no runtime, test-harness, script, CI or mobile/website consumer. Commit
`eb2a4b5` removes its only POST module and adds a focused offline absence
test. The canonical reviewer route, engine/provider exports and opt-in provider
smoke script remain used and unchanged. No migration, dependency or mobile change.

FRESH gates: forced typecheck and lint 7/7 tasks each, 0 cached;
lint 0 errors / 4 existing mobile import warnings; shared 133/133 in 12 files;
API 1,735 passed / 3 skipped / 0 failed in 146 files; API build 34/34 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). The build route
list and manifest omit /api/review and retain /api/reviewer/generate.
Mobile tests and Android export are NOT APPLICABLE (mobile unchanged).
The first typecheck failed on three stale generated Next route imports;
a local rebuild refreshed them, and the forced rerun passed. No test flake.

Owner steps remaining: ship H4 with the next API deploy, confirm POST /api/review
returns 404 and canonical generation works, optionally remove the deployed API's
RUN_OPENAI_SMOKE variable, and generate a reviewer from a Canvas module on device.
Rollout and device checks were entirely skipped. Live deployed revisions, route
behavior and environment state remain **UNVERIFIED (owner to confirm)**.
See [H4 handoff](ai/handoff.md#h4-unattended-legacy-review-route-retirement-2026-10-13).

## H3 private responses and bounded bodies (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
Security status: **H1-04 and H1-05 FIXED locally**. All 14 bounded text readers stream
request bodies and cancel at their existing byte caps, including missing or
misleading Content-Length. Fatal UTF-8 decoding maps to each caller's existing
invalid-JSON/request denial; null/blank-body behavior is preserved. All 15
previously uncovered owner-data route files return Cache-Control: private,
no-store on success and error, including the four audited source/job routes.
Existing no-store helpers and the separate experience streaming reader stay
unchanged. Status codes, error codes/messages, bodies and authorization are preserved.

Local code commits: `e2f2d1c` (shared reader), `ca6e48d` (14 bounded readers and regressions),
`d2a2ba8` (15 owner-response route files and regressions). No dependency,
migration, mobile, environment-file or legacy /api/review change.

FRESH gates: forced typecheck 7/7 tasks, 0 cached; forced lint 7/7 tasks,
0 cached, 0 errors / 4 existing mobile import warnings; shared 133/133 in 12
files; API 1,734 passed / 3 skipped in 145 files; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). Mobile tests
and Android export are NOT APPLICABLE (mobile unchanged).
One new connection test first used POST instead of PUT (34 passed / 2 failed);
corrected fixture rerun 36/36. No full-gate failure or flake.

Owner steps remaining: include H3 in the next API deploy; spot-check source
detail and job result response headers; sign in, sync Canvas and open a reviewer
and task plan on device. Rollout and device checks were entirely skipped. Live
deployed headers/revisions, database/applied state and Scheduler remain
**UNVERIFIED (owner to confirm)**. See [ADR-024](architecture/ADR-024-private-responses-bounded-bodies.md) and
[H3 handoff](ai/handoff.md#h3-unattended-private-responses-and-bounded-bodies-2026-10-13).

## VL1.2 local PDF page snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Accepted
unchanged local PDFs with VL0c's extracted page blocks now use the existing
lowest-cited-page snapshot cache, durable dispatch and 1400 px zoom viewer.
Exact accepted source/parent/extraction/asset ownership is checked; stored size
and hash verify downloaded bytes. Legacy null hashes retain asset/owner/size
identity. Edited/unavailable/old sources and non-PDF imports remain ineligible.

Fely's option 1 is implemented: **respect the delete**. Deleted/cleanup-pending
assets or missing objects return source_revision_unavailable before download,
reservation or dispatch, including for cached images. Page text remains with
"Page preview unavailable"; offline controls stay hidden. Deletion/cleanup and
preserve-artifacts retention are unchanged. Missing bytes during work become
terminal unavailable; completion fences deletion against publication.

Local commits: `4a7bb83` (API/migration) and `84bee38` (mobile). Forward-only
`20261013000400_local_pdf_page_snapshots.sql` is **NOT APPLIED**. It permits paired
null Canvas bindings for local rows, retaining owner/version/page identity,
RLS/grants and shared 20/user/rolling-24h reservation/attempt budgets and leases.

FRESH gates: forced typecheck/lint 7/7 each, 0 cached (0 errors / 4 existing lint
warnings); shared 133/133 in 12 files; API 1,655 passed / 3 skipped in 141 files;
mobile 928/928 in 90 files; API build 35/35 pages, 16 steps / 1 workflow; Android
export 3,456 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS
(0 whitespace errors). First mobile attempt: 927 passed / 1 failed, fixed by
updating the old local-file header exclusion assertion. No full-suite flake.
VL1.2 gates ran with the then-uncommitted H2 dependency group; H2b has since completed it.

Live revisions, applied migration/bucket/IAM/queue state, local bytes and cleanup
remain **UNVERIFIED (owner to confirm)**. Owner steps remaining: reviewed migration
application, one API deploy, one worker deploy, one preview OTA, then fresh-PDF,
edited-text, keep-reviewers deletion and airplane-mode device acceptance.
Rollout and device checks were entirely skipped. See [ADR-020](architecture/ADR-020-visual-learning.md)
and [VL1.2 handoff](ai/handoff.md#vl12-unattended-local-pdf-page-snapshots-2026-10-13).

## H2 dependency upgrades (2026-10-13)

**H2b PASS for local code scope; H2 code work is done. Rollout/device acceptance
pending.**
Dependency status: Next / eslint-config-next 15.5.27 (`bd39917`), Workflow 4.8.13 / test
adapter 4.0.29 (`86cf90a`, accepted ADR-023), Google authentication/gRPC, sharp 0.35.5,
undici 6.29.0 / 7.30.0 and compatible parsing/archive/mobile leaves are committed in
separate groups. React/React DOM remain 19.1.0; all 110 frozen Expo/RN/tooling package
names and existing majors pass the local scope check. No app/test/snapshot changes or
new migration.

CACHED before audit (reused from H2): **5 critical / 38 high / 33 moderate / 0 low / 0
info / 76 total**. FRESH after audit: **0 critical / 24 high / 21 moderate / 0 low / 0
info / 45 total** (valid JSON; exit 1 reports residual advisories). Remaining findings
and every changed package are in the [H2b
result](ai/audits/h1-release-hardening.md#h2-result-2026-10-13-h2b-pass). Original H2
failures remain historical; O2c PASS and isolated HEAD mobile 928/928 cleared that
blocker.

All eight gates ran FRESH between each STEP 2 group. Final: forced typecheck/lint 7/7
each, 0 cached, 0 errors / 4 existing lint warnings; shared 133/133 (12 files), API 1655
passed / 3 skipped (141 files), mobile 928/928 (90 files), API build 35/35 pages with 16
steps / 1 workflow, Android export 3459 modules / 31 assets / 1 bundle / 1 metadata
file, whitespace check 0 errors. No full-suite H2b flake; failed preflight launcher and
original H2 attempts are recorded in the
[handoff](ai/handoff.md#h2b-unattended-dependency-upgrade-completion-2026-10-13).

**Separate owner-planned item:** Expo SDK 54 -> 57 / React Native 0.81 -> 0.87, with
coordinated native/Metro/Jest/router changes and device acceptance. Next's excluded
PostCSS pin and unavailable compatible argparse/sprintf-js fixes remain reported. Live
production state is **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped. Owner steps remaining: review, one API deploy plus the coordinated
mobile OTA, then sign-in/sync/reviewer smoke and app/Canvas/reviewer/quiz device checks.

## H1/H1b release hardening audit (2026-10-13)

**PASS for local scope; rollout and live verification pending.** H1 audit local:
8 findings, 2 fixed, 5 reported for owner decisions, 1 live boundary UNVERIFIED.
The report inventories all 75 migrations, 106 current security-definer functions,
69 application tables, 100 policies including Storage, and 65 API routes.
Source inspection found fixed definer paths, revoked PUBLIC/anon execution,
owner-checked authenticated RPCs, application RLS and private bucket declarations.
Applied state and inherited Storage permissions remain owner verification work.

`aa58d87` removes private reviewer exception/diagnostic text from logs; H1b's
`21bb836` replaces arbitrary experience exception names with fixed categories.
HTTP, product, authentication and retention behavior are unchanged. H2b completed compatible dependency updates; residual advisories remain owner work.
H4 retires the unused legacy review endpoint locally. H3 completed private response cache headers
and bounded body allocation; see the current security status above. Fely's VL1.2 option 1 decision resolves
local-PDF retention: respect deletion, with no retention change. FRESH registry audit: 5 critical / 38 high /
33 moderate, 76 entries;
no dependency update or new migration was made.

FRESH final gates: forced typecheck/lint 7/7 each (0 cached; 0 lint errors / 4
existing warnings); shared 108/108 in 11 files; API 1,558 passed / 3 skipped in
140 files; mobile 898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow;
diff check PASS (0 whitespace errors). Android export NOT APPLICABLE (0; mobile
unchanged). Reproduction failures, the earlier H1 fixture failure and corrected
preload launches are recorded in the report and handoff; no full-suite flakes.

Production is **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped. See [audit](ai/audits/h1-release-hardening.md) and
[handoff](ai/handoff.md#h1h1b-unattended-release-hardening-audit-2026-10-13).

## O2 offline quiz reveal and scoring (2026-10-13)

**O2c PASS for local code scope; rollout/device acceptance pending.** O2b's shared
TypeScript grader (`4ad11b4`) and owner-only answer-key endpoint (`086e7ad`) are
preserved. The owner's corrected decision keeps `complete_quiz_attempt` and
persisted History/Library percentages SQL-authoritative; no database migration
or SQL function was changed. Frozen TypeScript response parity and all 23
SQL-rule fixtures pass against the unchanged function in local PGlite.

Separate owner-scoped SQLite keys hydrate with O1 bodies, retry independently,
refresh with the body revision and purge on sign-out/copy removal. Missing keys
retain the existing connection-required behavior. Offline check, reveal and
finish use the shared grader and persist provisional results with the caption
"Scored offline · will sync". Replay persists the server attempt identity before
mutations, preserves assisted-reveal ordering, tolerates interrupted completion,
and replaces local results with the server's; mismatch logging is only
`offline_score_mismatch`. No AI calls or jobs were added.

O2c implementation commits: `f2ac5dd` (storage/hydration) and `3b05865`
(offline practice/replay). FRESH final gates: forced typecheck/lint 7/7 each,
0 cached (0 lint errors / 4 existing warnings); shared 133/133 in 12 files;
API 1,608 passed / 3 skipped in 141 files; mobile 920/920 in 90 files;
API build 35/35 pages, 16 steps / 1 workflow; Android export 3,456 modules /
31 assets / 1 bundle / 1 metadata file; diff check PASS (0 whitespace errors).
The failed first fixture/typecheck/mobile-request-count attempts are recorded
in the handoff. Gates ran with the pre-existing uncommitted H2 dependency group;
O2c neither changes nor commits those manifests, lockfile or ADR-023.

Live revisions, deployed SQL and parity on real student data are
**UNVERIFIED (owner to confirm)**. Owner steps remaining: one API deploy,
one preview OTA, then airplane-mode/force-stop/reopen/reveal/finish/reconnect
acceptance and score comparison. Rollout and device checks were entirely skipped.
See [ADR-022](architecture/ADR-022-offline-quiz-answer-keys.md) and [O2c handoff](ai/handoff.md#o2c-unattended-offline-quiz-reveal-and-scoring-completion-2026-10-13).

## VL0 local-upload PDF provenance (2026-10-13)

**VL0c PASS for local code scope; rollout/device acceptance pending.** New
accepted local PDF child revisions load the worker's existing extraction blocks
by owner and exact `extraction_result_id`. Only an accepted trimmed-text SHA-256
matching the normalized parent keeps page blocks and `pageProvenance: "extracted"`.
Edited text has no blocks and `"edited"`; missing/invalid evidence or read errors
have no blocks and `"unavailable"`, while acceptance still succeeds. No backfill,
new migration, immutable-source update or second block builder is introduced.

Existing Study Assist and page-mapping readers consume the canonical metadata.
VL1.2 subsequently adds local snapshot rendering/mobile controls with the same
renderer and no deletion/retention change. Owner answer 6 clears the historical
VL0 STEP 0.5 stop: **accepted, deferred to VL1.2**. Provenance needs text, not
retained PDF bytes; deletion/cleanup is unchanged and honors `preserve_artifacts`.

FRESH forced typecheck/lint: 7/7 each (0 cached; 0 errors / 4 existing warnings).
Shared 108/108 in 11 files; API 1,579 passed / 3 skipped in 140 files; mobile
898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow; diff check PASS
(0 whitespace errors). Android export NOT APPLICABLE (mobile unchanged).
Production revisions, applied migration state, retained bytes and old affected-row
counts are **UNVERIFIED (owner to confirm)**. Rollout/device checks entirely skipped.
See [VL0c handoff](ai/handoff.md#vl0c-unattended-local-upload-pdf-provenance-2026-10-13).

## G1.1 grade estimator drop rules (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Grade estimates
now apply `drop_lowest`, `drop_highest` and `never_drop` within each group, using
percentage ordering, stable assignment-ID ties and the one-graded-score guard.
The API translates persisted Canvas IDs into owned stored assignment IDs;
malformed rules retain an explicit warning. Hidden grades remain pending, and
mode selection still chooses the current calculation nearest Canvas's visible
score. No-rule output is pinned by the CIT17-like regression: 217/250 graded,
350 remaining, target 90% gives 92.3%, with the same per-activity points.

Uniform future scores are simulated at each candidate. Bounded binary searches
within stable drop ranges find the minimum required score to 0.1%, including
unequal-point order changes; dropped future activities do not contribute to the
target or appear in retained activity advice. Mobile displays applied drop counts
in existing secondary text. Protected-only rules have no misleading warning.

Implementation commits: `378fb61`, `fae3bdc`, `f856de7`, `0ccc29e`.
FRESH gates: forced typecheck/lint 7/7 each (0 cached; lint 0 errors / 4 existing
warnings); shared 108/108 in 11 files; API 1,551 passed / 3 skipped in 140 files;
mobile 898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file;
diff check PASS. Failed fixture/preload attempts are recorded in the handoff.

Live production state and Canvas parity are **UNVERIFIED (owner to confirm)**.
Owner next: one Vercel deploy, one preview OTA, then a drop-lowest course/device
hand calculation. No migration, remote service call, Scheduler change,
environment-file edit or push. Existing G1/R1 acceptance remains unchanged.
See [G1.1 handoff](ai/handoff.md#g11-unattended-grade-estimator-drop-rules-2026-10-13).

## E2 reviewer review-time estimate (2026-10-13)

**PASS: estimate and display code, tests and local commits complete; rollout/device acceptance pending.**
Reviewer estimates: E2 local. The reader and Library already load the exact saved
version payload, so both compute the estimate on read without new queries, metadata
writes or a migration. Saved explanations, key points and item/evidence text count
at 200 words/minute, plus 15 seconds per nonblank key point and 1 minute per section;
round up to 5-minute increments, minimum 5. Titles, metadata, emphasis copies and
unsupported enrichment are excluded. Empty/invalid content returns null.
Optional `reviewMinutes` fields keep older clients compatible; quizzes and activity
outputs return null. Mobile shows `~N min review` in the existing secondary caption,
joined to the automatic-origin label with ` · ` when present.

Implementation commits: `80e8cd5`, `4c48804`, `f3d3b7b`.
FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached; 0 lint errors,
4 existing mobile warnings); shared 93/93 in 11 files; API 1,542 passed / 3 skipped
in 140 files; mobile 890/890 in 89 files; API build 35 pages / 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS.
The handoff records the corrected fixture failures and generated-type race.

E3 is the next product decision: which reviewers become Today review blocks, when,
and how often. Today and `task-planning.ts` are unchanged. E2 is independent of
PV1c/VL1.1b. Live production state is **UNVERIFIED (owner to confirm)**. Rollout and
device checks were entirely skipped under the unattended rules.

## PV1 Canvas PDF provenance (2026-10-13)

**PASS: code, migration file, tests and local commits complete; rollout pending.**
Freshly prepared Canvas PDFs refresh the owned descriptor and use existing deferred
admission for both manual and automatic generation. The worker remains the sole
builder of cited page blocks; preparation failure remains `409 not_ready`.
Snapshot-aware cleanup uses transaction advisory locks plus a durable exclusive
claim to bridge the Storage HTTP deletion window. Snapshot insertion and new
current-file references share that lock and fail safely during a claim. Rollback
keeps any pre-existing or uncertain object and removes only a new unreferenced key.
The unused server resolver returns only the accepted unedited Canvas PDF revision.

Implementation commits: `2b0ce49`, `9b6ce4e`. Forward-only migration:
`20261013000200_canvas_source_provenance_retention.sql` (NOT APPLIED).
FRESH gates: typecheck 7/7 tasks; lint 7/7 tasks, 0 errors / 4 existing mobile
warnings; API 134 files, 1,488 passed / 0 failed / 3 skipped; mobile 87 files,
861 passed / 0 failed; API build 1/1, 35/35 static pages; diff check 0 errors.
The first API gate had one existing database setup timeout (1,484 passed / 7
skipped); both rerun and final run passed. A focused database fixture initially
failed 7 cases and was repaired (final focused retention suite 37/37).
No cached results claimed. PGlite tests deterministic transaction interleavings;
physical multi-session blocking and deployed Storage remain UNVERIFIED.

R1.4 admission evidence is NOT AVAILABLE (R1.4 preflight stop). Preview caps
(20,000/source; 90,000 combined) reject rather than truncate; no partial-source
quality finding is established. VL1.1b subsequently passed STEP 0 and completed Canvas-only snapshots locally;
owner rollout remains pending. VL0 remains separate. No production calls, deployment,
migration application, Scheduler changes, environment-file edits or push.
See [PV1c completion handoff](ai/handoff.md#pv1c-canvas-pdf-provenance-completion-2026-10-13)
and [ADR-021](architecture/ADR-021-canvas-source-provenance-retention.md).

## R1.4 CIT17 acceptance (2026-10-13)

**STOPPED at step 1; R1 remains 15/16, AG1 PARTIAL.** All five CIT17 baseline materials already have reviewers under the shared owner-scoped reviewer mapping. No eligible file, baseline edit, sync tap or generation; baseline remains exactly `2026-10-12T07:07:14.956768+00:00`. Production API `dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ` is READY and worker `generation-worker-00023-9hs` serves 100%. End counts: 622 sync jobs, 242 processing jobs, 113 reviewer jobs, 90 artifacts; 0 active sync/processing jobs. PV1 admission-path evidence NOT RUN because no new job exists. AG2 rollout/device acceptance remains pending. FRESH read-only checks; code gates NOT RUN (docs only). See [R1.4 stop evidence](ai/acceptance/r1/rollout-and-acceptance.md#r14--cit17-preflight-stop-2026-10-13).

## VL1.1b Canvas PDF snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Both
manual and automatic standalone unedited Canvas PDFs preserve cited page blocks.
The authenticated topic endpoint selects the lowest cited page, reuses an
owner/source-version/page cache, and awaits durable Google task acceptance before
HTTP 202. Header discovery does not render. The existing native worker renders
one accepted PDF page at 1400 px, verifies its hash, uploads privately and fences
publication with a lease. Reservations and actual attempts are capped at
20/user/rolling 24 hours, including retries. Missing original revisions return
source_revision_unavailable; VL1.1b excluded local/edited/Office/Page sources.
VL1.2 above subsequently admits eligible local PDFs while respecting deletion.

Mobile adds From page n, bounded five-check/15-second progress polling, and a
full-screen pinch/pan/double-tap viewer using existing tokens and Reduce Motion.
Offline device copies and failed reachability checks hide it; no offline image
store or new native dependency. Coarse null source types are classified server-side.

FRESH gates: forced typecheck and lint 7/7 each, 0 cached; lint 0 errors /
4 existing warnings; API 140 files, 1,537 passed / 0 failed / 3 skipped; mobile
89 files, 879 passed / 0 failed; API build 35/35 static pages, 16 steps/1 workflow;
Android export 1 bundle / 3,452 modules / 31 assets; diff check 0 errors.
Failed first attempts and the recurring PGlite bootstrap flake are recorded in
the handoff; its setup timeout now matches the other database fixtures.

Forward-only migration 20261013000300_source_page_snapshots.sql is NOT APPLIED.
PV1 migration/rollout, live retained bytes, bucket/IAM/queue, deployed renderer
and device checks remain UNVERIFIED (owner to confirm). No remote service calls,
deployments, applied migrations, Scheduler changes, environment-file edits or push.
VL0 local provenance remains separate. Embedded images and labeled external
visuals on request remain later phases. See [ADR-020](architecture/ADR-020-visual-learning.md),
[preflight](ai/acceptance/vl1/preflight.md), and
[VL1.1b handoff](ai/handoff.md#vl11b-unattended-canvas-pdf-snapshots-2026-10-13).

## VL1 source-page snapshots (2026-10-13)

**STOPPED at STEP 0.1; no feature code or migration added.** Canonical reviewer
payloads retain section `sourceBlockIds`, but local PDF extraction does not persist
page-numbered blocks in `source_versions.metadata`. Reviewer admission keeps those
blocks in `processing_job_sources.metadata` while reusing the existing source
version; saved artifact reads therefore lack the required block-to-page mapping.
The stored PDF document link survives. VL1's unattended stop rule requires owner
direction before repairing this prerequisite or starting STEPS 1-5. FRESH:
repository inspection and documentation diff check (0 errors); all six build/test
gates NOT RUN. Live state UNVERIFIED (owner to confirm). No external calls,
deployments, applied migrations, environment-file edits or push. See
[VL1 handoff](ai/handoff.md#vl1-unattended-source-page-snapshots-2026-10-13).

## P1 unattended polish (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Singular hidden-grade
copy is tested, Tasks opens the shared Grades screen inside its own `work` stack,
and Matching-only quizzes use a deterministic verbatim-term budget in setup,
admission, retry and worker processing. The strict validator and Mixed capacity
are preserved. No migration, external service call, deployment, Scheduler change,
environment-file edit or push. FRESH: forced typecheck/lint 7/7 (0 cached,
4 existing lint warnings); shared 71/71; API 1,415 passed/3 skipped; mobile
853/853; API build 35 pages/16 steps/1 workflow; diff check 0 errors.
The original R1 Matching-only source/cause and live revisions are UNVERIFIED
(owner to confirm); the historical fixture does not establish that root cause.
Failed first attempts, evidence and Owner steps remaining are recorded in [P1 acceptance](ai/acceptance/p1/unattended-polish.md).

## AG2 background automation (2026-10-13)

**PASS (local code scope); rollout and device acceptance pending.** Complete
metadata polls now detect newly observed File/Page module-item IDs and await the
existing durable course-content admission and Google dispatch. The first complete
inventory baselines existing IDs; changed items and failed scopes do not trigger.
Service-only reservations serialize per-user checks: automation enabled, verified
API activity within 7 days, at most 1 request/course/rolling 6 hours and 3/user/rolling
24 hours. Auth records activity with an hourly conditional write. AG1's 3/run and
5/24-hour reviewer limits remain unchanged. Queue shows Auto; Library and the
reviewer header show Made automatically, derived from owned candidate/job/version
receipts. A service-only, idempotent stale-email SQL guard and owner activation
runbook are prepared. Migrations `20261013000000` and `20261013000100` are local only.

FRESH: forced typecheck/lint 7/7 each (0 cached; 4 existing lint warnings), API
1,450 passed/3 skipped in 132 files, mobile 861 passed in 87 files, API build
35 static pages/16 workflow steps/1 workflow, Android export 1 bundle/3,450 modules/
31 assets, and diff check 0 errors. The first typechecks failed on JSON narrowing
and mobile fetch-mock types; both were fixed and rerun successfully. No test flakes.
R1.4 pending. Cloud Scheduler, live revisions, environment/IAM and applied
migration state are UNVERIFIED (owner to confirm). No remote service calls,
deployments, migration application, emails, Scheduler changes, environment-file
edits or push. Website parity is deferred. See the
[execution contexts](architecture/ag2-execution-contexts.md) and [handoff](ai/handoff.md).

## R1 coordinated rollout (2026-10-12)

**PARTIAL — production rollout complete; 15/16 device lines PASS, line 7 FAIL (R1.3 reviewer generation), 0 pending.** R1 source `cc42361`; AG1.1 fix `b5adb7d`; AG1.2 token fix `4a2a2d0` and dispatch fix `b6ab830`. Owner-applied R1.1 migrations remain reconciled with no history repair. API `dpl_38faB6K3SfD38KeGE7TNuG6W6bgp` was later redeployed by the CC17 session as R1 + API quiz fixes, `dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF`. GR1 API **dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ** and worker **generation-worker-00023-9hs** (100%) deploy source fc3486b. Rollback: API dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF; worker generation-worker-00022-wzx. Preview OTA `ba5e6d56-d75a-4ef4-adb0-162518572c48` is unchanged. Scheduler/Resend inactive. See [R1 evidence](ai/acceptance/r1/rollout-and-acceptance.md).

| Feature | Overall status | Device acceptance |
|---|---|---|
| O1 offline library | PASS | Lines 1–4 accepted: cold offline Reviewer/Quiz/Draft reopen, copy removal/recovery, practice kept, no sync jobs |
| AG1 automatic reviewers | PARTIAL | R1.3 proved preparation/admission/dispatch/start but failed during generation. GR1 classification and bounded known-outcome retries are live. Fresh manual Unit 2 diagnosis succeeded on worker 00023, first delivery, 53,159 ms; saved reviewer opens in Library. Original failed job unchanged. Line 7 still needs one completing automatic run. |
| E1 study-time estimates | PASS | Lines 10–12: varied estimates, student edit kept, no re-estimation |
| G1 grade estimator | PASS | Lines 13–14: hand-checked CIT17 90% → 92.3% per remaining activity |

Regression/sign-out-in line 15 and Mixed-quiz Matching line 16 PASS. Matching-only generation contract failure remains open. GR1 provider classification and bounded definite-outcome checkpoints are deployed from fc3486b. Unit 2 manual diagnosis PASS on worker 00023: fresh job ceaebf6d succeeded on delivery 1; provider duration 53,159 ms; saved reviewer opens from Library (18 topics). No request_failed or reviewer_generation.* failure events; kind/httpStatus/incompleteReason absent on success. Original d9de6cfe remains failed/generation_failed, attempt 2, retryable=false. No Queue Retry or direct data edits; no new deploy, cap change, migration, OTA or push. The earlier R1.3 failure cause remains unknown; this run does not establish output truncation. Line 7 remains FAIL, R1 15/16, AG1 PARTIAL; next automatic acceptance needs naturally new or known-fitting material. AG2 background-poll code is complete locally; rollout/device acceptance and website parity remain open. Prior GR1 code gates passed: forced typecheck/lint 7/7 (0 cached, 4 existing warnings), API 1,409 passed/3 skipped/128 files, build 35 pages/16 steps/1 workflow, provider contract 20/20. Code gates NOT RERUN for this device/docs continuation; documentation diff check FRESH PASS.

## O1 explicit offline library (2026-10-12)

**PASS (local) - physical acceptance pending.** O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Device copies stay owner-scoped; only authenticated not_found removes an artifact, list absence retains it, sign-out purges the owner, and Quiz bodies remain learner questions without answer keys. Fely's 2026-10-13 option 1 decision is implemented by O2c (ADR-022): keys hydrate separately, purge with device copies and enable provisional scores until server-wins replay. Removing copies keeps summaries, aliases, Quiz practice, Activity responses and Task snapshots. O2c adds local API/shared and mobile changes; rollout remains pending. Historical O1 FRESH gates: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile import-order warnings); mobile tests 843/843 in 85 files; Android export 1 bundle / 3,448 modules / 31 assets; git diff --check 0 whitespace errors.

## G1 grade estimator (2026-10-12; historical local result before R1/G1.1)

**PARTIAL - implemented locally; API/mobile rollout and physical acceptance pending.** Grade goal computes the same percentage needed on each remaining activity using a pure points/weighted model, choosing the mode nearest Canvas's visible current score. A read-only owner-selected-course API excludes non-gradable/excused work and treats hidden grades as pending; drop-rule and mismatch warnings keep the estimate qualified and Canvas authoritative. Mobile remembers the target by account/course and links course Tasks to Grades. No migration, AI, grade writes, website, deployment, OTA/EAS or push. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); shared 68 passed in 10 files; API 1,362 passed / 3 skipped in 126 files; mobile 817 passed in 82 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed. Live sanity check awaits account/course context; device acceptance remains pending.

## E1 study-time estimates (2026-10-12)

Reviewer estimates: E2 local; Today review blocks deferred to E3.

**PARTIAL - implemented locally; production migration/API rollout/OTA and physical acceptance pending.** Canvas task time now uses one bounded structured AI call (10 tasks/request; snapshot limit 40 AI tasks/user/24 hours), with deterministic heuristic fallback and retry. Owner-scoped fingerprints avoid repeat calls and refresh changed assignments; student estimates win through guarded writes. Today/Tasks show approximate automatic time and TaskEditor explains the source. Migration `20261012000200` remains local. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); shared 57 passed in 9 files; API 1,336 passed / 3 skipped in 124 files; mobile 807 passed in 81 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed.

## AG1 automatic reviewers after Canvas content sync (2026-10-12)

**PARTIAL - implemented locally; production migration, API/worker rollout and physical acceptance pending.** Successful, unchanged and partial course-content syncs run owner-scoped automatic admission through the existing generation path. First sync baselines current eligible file/Page material; subsequent material/revisions use deterministic receipts, existing-reviewer skips, 3/run and 5/24-hour caps, a service-only per-user lease, quota deferral and bounded retries. API and mobile Settings provide a persistent off switch. Migrations `20261012000000` and `20261012000100` remain local. FRESH: root typecheck 7/7 (0 cached); root lint 7/7 (0 cached, 0 errors, 4 pre-existing mobile warnings); API 1,304 passed / 3 skipped in 123 files; mobile 800 passed in 80 files; API build passed (35 static pages, 16 workflow steps / 1 workflow); git diff --check passed. [ADR-019](architecture/ADR-019-automatic-reviewer-generation.md).

## Product direction v1.4 — regular Canvas students and automatic reviewers (2026-10-10)

**DIRECTION ONLY — no code changed.** The October 10 TBI assessment huddle changed the target users from CTE students and CTE Board Examiners to regular Canvas-using students of one institution (UC) across all departments. Automatic reviewer generation on Canvas sync is now the target workflow (editable, regenerable, can be turned off); the current build still generates reviewers manually, and the five-minute metadata poll does not trigger generation. Grade estimator, AI study-time estimate, and offline library are proposals. See [official direction v1.4](capstone/official-direction.md).

## Urgent Canvas sync and configurable email notifications (2026-10-03)

**PARTIAL — local implementation complete; production activation pending.** A protected five-minute metadata poll reuses the Canvas client/normalizers and canonical tables, with bounded requests, independent scopes and safe partial-failure handling. Assignment/announcement changes queue transactional, deduplicated email events; deadline reminders use due-date revisions, reliable submission/completion evidence and local reminder time. Settings saves global and per-type switches, reminder time and timezone. The linked Vercel project is Hobby with Fluid Compute, so the documented external trigger is one Google Cloud Scheduler HTTP job; this work adds no Cloud Run service. Migration `20261003025905` and the missing cron/Resend environment variables, verified sender, API/Mobile rollout, controlled production/device acceptance, and workload/backlog check remain required. No production data or emails were changed. [Architecture and setup](architecture/canvas-email-notifications.md).

## Quick Canvas token tutorial (2026-10-01)

**PARTIAL physical acceptance.** The unchanged tutorial image is bundled locally. The Canvas token form opens it once per app session when the form first appears and offers a manual reopen control. The full-screen viewer preserves form state and supports vertical scrolling plus an enlarged, horizontally pannable reading mode. Android preview OTA `01a0f7d2-ca43-760b-9723-4a4ddf1f1a40` was checked on the realme: opening, reading, scrolling, closing, reopening, domain preservation, and no repeated popup on return passed. Existing connected courses still loaded. A successful new-token reconnection and real-token log check were not exercised. Canvas authentication and sync code were unchanged.

## B41 native Office DOCX/PPTX opening (2026-10-01)

**PASS.** The realme had no app able to open DOCX or PPTX; with the owner's approval, Google Docs and Slides were installed. The opening test exposed a defect: exported Drafts lost every line break (DOCX breaks were written outside runs, and PPTX chunking flattened lines). Fixed in `28b81af`/`74ae2ab` with regression tests, and shipped as preview OTA `9129850a-bd65-4588-b80b-53cd53d82745` (runtime 2.0.1). The re-exported DOCX and PPTX open directly from My Files in Google Docs and Slides (18/18 slides), with lines preserved. No new jobs or artifacts. FRESH: mobile 782, typecheck and lint pass. Microsoft Word/PowerPoint not tested. [B41 acceptance](ai/acceptance/b41/native-office-docx-pptx-opening.md).

## B40 Reviewer Smart Selection learning tools (2026-10-01)

**PASS.** Tapping a Reviewer topic opens the existing Study Assist sheet. The full concept is now selectable there with Android's own handles and Copy/Select All, and the sheet captures the exact range. Define, Explain, Example, Test Me and Ask then run on that selection in the same sheet, with lazy refinements (Plain words, In context, Key traits, Compare; Simpler, Deeper, Analogy, Why it matters; Real world, Step-by-step, Another, Counterexample; Test Me checking, Harder, Apply it, Explain answer, Need choices?).

One owner-scoped `POST /api/experience/study-tools` route reuses the Study Assist ownership and source-provenance path. It verifies that the selection belongs to the owner's block, sends only bounded context (the block, nearby section content and cited source excerpts), and enforces selection, question, answer, follow-up (2) and output limits on the server. Define/Explain/Example/Ask fall back to general knowledge automatically, with a tappable From your material / Source + general knowledge / General knowledge badge. Test Me is source-only. The canonical Reviewer is never modified.

Physical acceptance passed on the RMX3151 against a local API and a coinstalled local debug build: all actions and refinements, grounding states, offline message, Reduce Motion, search and the scrubber, and zero new Canvas, processing or artifact rows. FRESH: API 1,198 tests, mobile 778, shared 50; typecheck and lint 7/7. **Production-deployed:** API `dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR` and preview OTA `ded5f2a6-19a4-4934-99ea-23610409a642` (runtime 2.0.1), both smoke-tested on the preview app. The sheet now opens on whole-topic quick assists, and selecting text swaps in the five actions. [B40 acceptance](ai/acceptance/b40/reviewer-smart-selection-learning-tools.md). Next: B41 native Office DOCX/PPTX opening acceptance.

## B39.2 physical Canvas and Android acceptance (2026-10-01)

**PASS — closes B39.** Recorded in [B39.2 acceptance](ai/acceptance/b39.2/physical-canvas-android-acceptance.md); the B39.1 BLOCKED entry below is historical.

## B39.1 deployment and physical Canvas acceptance (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** The B39 API is deployed READY as `dpl_74hWVM2kSvg21hfnRLcVu885ohFe`; production health returned 200 and the protected attachment route returned 401 without a session. The offline Task/attachment metadata gap is repaired in the existing owner-scoped SQLite store. Preview APK `de93f504-cb53-4388-b48a-47103d65eb3a` from `80cd1b0` finished and is installed on the RMX3151; APK inspection confirms native Expo Sharing. CUA exposes no Android UI surface, so Canvas authentication, manual sync, attachment open, and remaining physical/passive-sync gates are unverified. No sync action or Cloud Run deployment occurred. [B39.1 acceptance](ai/acceptance/b39.1/deploy-physical-canvas-sync.md).

## B39 student workflow and Canvas Task attachments (2026-10-01)

**BLOCKED — local implementation and regression checks pass; current Canvas authentication, a fresh manual sync, and realme attachment-open acceptance remain unverified.** Task detail now displays deduplicated owner-scoped Canvas assignment files and opens a tapped file through a server-side authenticated Canvas download, with no temporary URL returned to Mobile. Generate excludes attachment-only assignment and announcement files unless a file is separately listed as a course module resource. Expo Sharing requires a new native Android build. No production deployment, Canvas sync, job creation, or app data mutation occurred. The RMX3151 is ADB-connected but was not exposed as a UI control surface. [B39 acceptance record](ai/acceptance/b39/student-workflow-canvas-tasks.md).

## B37 production generation regression (2026-10-01)

**BLOCKED after B37.2.** The earlier Introduction PDF and force-stop recovery remain PASS. B37.2 proved that Unit 3 Lesson 1's same-course PDF is directly accessible to the student's Canvas account even though hidden from the normal Files inventory. Commit `54aa9fd` scopes ingestion of that file to its authenticated Page link; API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` is live and Android preview update `01a0f4ef-496a-7c4c-a6e7-52617f4268bd` is installed. The realme's fresh request stored all 1,495,059 PDF bytes, but the production SQL staging function still requires exactly one `file:` item while Page provenance supplies `page:` plus `file:`. API logged `ProcessingJobCreationError`/503; one generic row `dde023f1-65ef-415b-b888-5550bc845494` remains queued with zero attempts, no dispatch or result. The 40-page PDF retest was stopped. A forward-only staging contract repair and a fresh Page acceptance are required before B37 can close. [Acceptance record](ai/acceptance/b37/production-generation-regression-20261001.md).

## B39 preview API configuration (2026-09-30)

**PASS.** Missing or invalid mobile API configuration now produces a typed configuration error before any request and shows an app configuration state without changing Supabase session, Canvas connection, or local Library data. The EAS preview environment now holds the public API address; the documented Android preview command checks it against the build profile and publishes with `--environment preview`. Final OTA `01a0f2ae-79d7-732a-9ba4-c492f2af3545` passed realme session, Generate, Tasks, Library, Today, CIT17 PDFs, Canvas connection, and force-stop/relaunch. Passive navigation kept Canvas jobs at 468 with zero active. [Acceptance](ai/acceptance/b39/preview-api-configuration.md).

## B38 Canvas sync admission (2026-09-30)

**PASS.** B38's Google Cloud Tasks and private Cloud Run dispatch was physically accepted after the earlier rollout block was resolved by explicit user authorization. Manual CC6, CIT17, and SOC SCI 103N synchronization completed, and passive navigation created zero jobs. [Acceptance](ai/acceptance/b38/canvas-sync-admission.md).

## B38 pre-rollout snapshot (historical, 2026-09-29)

**Rollout blocked by automatic approval review.** The production Vercel deployment was rejected as a consequential service change without separately recognized explicit authorization; no Cloud Run or EAS rollout followed. The physical gates remain unrun. [Evidence and trigger map](ai/acceptance/b38/canvas-sync-admission.md).

**Implementation verified locally; physical acceptance pending deployment.** B37's already proven Google dispatch architecture is committed at `46e66a8`. The 14-job batch came from account-wide `sync()` calls in sign-in/foreground stale-data reconciliation and Today focus; Generate and Tasks pull-to-refresh also called it. Launch, foreground, and passive screens now read persisted data and reconcile existing jobs only. Explicit Sync actions still start content and grades jobs. The existing database partial unique index admits one active job per user/course/type; the API now returns that active job when a concurrent different-key request hits the index. The failed repeat CC6 content job `8252e7d3-0059-4965-8de3-cd91513b192d` was claimed once, had zero units, and coincided with a production `/api/internal/canvas/sync-token` timeout; worker token handoff now allows the route's 30-second budget and retries one transient failure. CIT17's published “FINAL PROJECT GROUPING” Page has an empty body and is now excluded by general Page eligibility. Deployment and realme passive/manual/relaunch gates remain open; do not claim a physical PASS yet.

## B37 Canvas sync Google worker cutover (2026-09-29)

**PARTIAL.** Canvas content and grade jobs now dispatch through the existing Google Cloud Tasks queue to the private Cloud Run worker. Vercel remains the authenticated job API and gives the claimed worker only its job's Canvas token through a Google identity verified internal route. A forward Supabase migration supplies dispatch identity and worker leases. Production API deployment `dpl_GhxrKrR746J7gs2qoL29npWp7oxR` and corrected worker revision `generation-worker-00013-k9j` are live. Fresh realme CC6, CIT17 and SOC SCI 103N content/grade jobs all reached terminal success; content outcomes were safe partials for inaccessible Canvas resources. The first attempt exposed a finalization decrypt bug; the corrected worker passed a fresh attempt for each target course. No fresh job used Vercel Workflow. Full physical acceptance fails because opening Generate and force-stopping/relaunching caused extra 7-course sync batches, one CC6 retry failed before unit execution, and an empty administrative Canvas Page appeared under CIT17 learning materials. The three target courses retained canonical rows without count growth after repeats. The architecture code remains uncommitted under the requested acceptance gate. The earlier regression entry below is historical.

## Canvas sync Workflow quota regression (2026-09-29)

**BLOCKED for fresh sync.** CC6, CIT17 and SOC SCI 103N each submitted content and grade jobs, and the authenticated API returned/polled them successfully. All six stayed queued because Vercel Workflow delivery logs report `ThrottleError: Workflow usage limit exceeded`; no Canvas processing step ran. Live Canvas course inventory still loads with the existing credential. A forward Supabase migration `20260929060000` is applied: an every-minute database job expires overdue queued/running sync jobs at their existing 30-minute deadline without deleting course data. The original six are terminal `expired`. Mobile foreground reconciliation, continuous polling, a recent-attempt cooldown across restarts, and safe failure copy are implemented locally; Android preview OTA group `bbf3c411-38b7-4c26-880b-61a6f9206514` was published for runtime `2.0.1`, but activation on the realme is unconfirmed. The installed preview APK launches with the retained signed-in session; new successful sync and physical routing acceptance await Workflow capacity or the planned Google-worker migration. Recovery source is uncommitted pending full acceptance. Unrelated starting dirty paths remain untouched.

## B39 EAS preview distribution (2026-09-29)

**PASS after authorized native preview-build fallback.** B38/header cleanup was published as preview OTA group `cdc3f3a6-5ecb-46b5-96cb-ea1404c007bb` at `b88a507`, runtime `2.0.0`. The old APK lacked required native crypto for provider auth, so the owner authorized preview APK `21be5ea3-f224-4be4-a707-643c7957dd15`, source `2c66889`, Android runtime `2.0.1`, channel/environment `preview`. Installed on realme; Google sign-in, Draft-first flow, single-title/Export/save header, Library categories, Reviewer navigation, Quiz progress, force-stop/offline saved Draft reopen and stable Draft cards/count all pass without Metro. FRESH focused mobile 147 tests, auth 29 tests, mobile typecheck/lint (four existing warnings), diff check, export and APK build/inspection pass. Future Android preview updates target `2.0.1`. No backend rollout, production channel change or push. Next: separate native Office DOCX/PPTX-opening acceptance. [Acceptance](ai/acceptance/b39/eas-preview-b38-distribution.md).

## Artifact header simplification (2026-09-29)

Removed repeated course/source banners and generated-date lines from saved Draft/Quiz previews, and repeated course/source context from the Reviewer header. Draft uses one multiline editable title and a header Export action; Quiz preview titles are compact. Topic navigation, question progress, Draft save status, actions and course organization remain. FRESH verification: 67 focused mobile tests, mobile typecheck, changed-screen lint and git diff check pass. Existing Draft, Quiz preview and Reviewer opened on realme with the cleaned headers; no generation or account data changed. Local debug JS only, no deployment or push.

## B38 draft-first assignment UX (2026-09-29)

**PASS.** Current local mobile UX makes the saved editable Draft the assignment result. Tasks show Assignment / Generate Draft; completion and Queue show Draft ready / Open Draft; Library uses All / Reviewers / Quizzes / Drafts. The separate Study Activity worksheet/status is removed, and exports use saved Draft content. Internal Activity generation, B37 Canvas resolution, owner checks, grounding, validation, persistence/idempotency and offline storage are unchanged. Fresh realme Firewall/VPN (12 slides) and Dice Roller (eight sections) each saved one Draft; Firewall/VPN reopened offline after force-stop. Fresh mobile 733/API 1,076 tests, focused mobile 103/Activity-worker 70, Workflow, both typechecks/lints and diff check pass (four existing mobile warnings). No schema/API/worker deployment, EAS update/build or push. Next: distribute the tested mobile UX via the existing preview update channel; not started. [Acceptance](ai/acceptance/b38/draft-first-assignment-ux.md).

## B37.1 firewall/VPN Activity generation repair (2026-09-29)

**Activity bug PASS; B37.1 remains PARTIAL for separate gates.** The exact failed job stopped before the provider because a same-origin link targeted another Canvas course. Course-aware source preparation is fixed on private Google worker `generation-worker-00011-n2s` (100% traffic). A fresh generation from the same firewall/VPN assignment completed with one call, one 12-slide draft, Queue completion, Library visibility and force-stop/reopen on realme. Fresh Dice Roller still passes. API 1,076/mobile 726 tests, focused Activity/Google worker 72 tests, typechecks and lint pass (four existing mobile warnings). Supplemental safe API error mapping is local: automatic approval review rejected production API rollout pending explicit authorization; approval was requested. No prompt/schema/migration change, EAS build, B38 work or push. [Investigation and acceptance](ai/acceptance/b37/activity-firewall-vpn-generation.md).

## B37.1 pre-APK study experience polish (2026-09-28)

**PARTIAL; B37 remains PARTIAL.** The explicitly authorized rollout is complete: Vercel `dpl_6UepXtqEVSPwnZMRYejoN5rMy38x` is READY and private Google worker `generation-worker-00010-g9v` serves 100%. Minimal integrated arrows/slider replace dedicated Skip/Previous/Next; unanswered navigation creates no skipped action. Realme adb checks pass free navigation, synthetic slider drift and vertical handoff, reveal-before/after, offline force-stop persistence, completion/score, retake/history and production offline replay. After an initial real-finger failure, the user reports about 20 connected thumb drags without cancellation on the corrected slider. The follow-up shows the destination question immediately on release while the online save completes; the user physically retested and accepted the final slider. Automated vertical handoff passed. Fresh source-grounded Reviewer emphasis and a visually inspected three-page PDF pass. Fresh Matching exposes a publication defect: public questions omit pair labels. Tested forward correction `1025208` awaits explicit Supabase approval and fresh pairing/partial-credit acceptance; remaining Activity task/native Office acceptance is pending. Fresh mobile 726/726 and earlier API 1071 tests pass (three existing API skips); mobile typecheck/lint pass with four existing mobile lint warnings. Existing Activity autosave/completion and export evidence is retained. Export scope remains generated Library Activities: PDF/DOCX/PPTX; Reviewers: PDF only. No EAS build or origin push. [B37.1 ledger](ai/acceptance/b37/pre-apk-study-experience-polish.md).

Once B37.1 passes, B38 will move durable Canvas sync execution to the existing Google worker. Mobile calls an authenticated Vercel API; Vercel validates owner and creates/queries a durable Supabase job; the internal Google worker paginates Canvas and performs bounded, checkpointed ingestion; Supabase holds owner-scoped status and canonical data. Preserve routing, provenance, history, retries, progress, and disconnect/reconnect. This is an architecture decision only. Production Canvas lifecycle acceptance, then one new EAS preview APK and final physical acceptance, follow B38.

## B37.2 non-Canvas acceptance and build gate (2026-09-28)

**PARTIAL.** Production API `dpl_Ehds5J5evWG1zwj7JT68CZaYZRnR` (commit `f729596`) fixes the Camera/Local File source claim, which returned 503 because `source_versions` is immutable. Text, Camera and Local File each reach Reviewer, Quiz and Library, and persist through force-stop. The 100-item Quiz passes (100/100 unique, sourced, 10 calls). Recovery email delivery works through the Resend test sender (owner only; no verified domain). **Canvas sync is BLOCKED** by the Vercel Workflow usage limit. No EAS build; the installed preview APK lacks `expo-crypto`, so provider sign-in fails closed there until a new native build ships. [Evidence](ai/acceptance/b37/study-experience-overhaul.md).

## B37.2 continuation in progress (2026-09-28)

Core auth, owner-safe supported linking, Canvas credential lifecycle and server-only Resend acceptance are implemented. API `dpl_6A3CygzdmL4u3jzUd9zkKZZb8afL` is READY; health 200 and signed-out protected routes 401. Forward Canvas migration is recorded once as `20260928001117`; the existing private worker is unchanged. Email/password sign-out/sign-in and session restoration pass on realme. The upgraded local test client proves native S256 PKCE; **0 EAS builds**. After the user saved the manual-linking setting, its fresh production probe returned 200. Google/Microsoft physical flows are continuing.

Invalid Canvas token handling and same-account replacement pass physically; original owner/connection and all historical source/course/task/Reviewer/Quiz/activity ID fingerprints are preserved. Hostname-only address input adds HTTPS. Live disconnect/reconnect, sync and remaining source paths are pending. One real Resend message is delivered and replay is deduplicated; a test sender with no verified domains does not establish broad student delivery.

Fresh VPN 30 Mixed persisted exactly 30 items in two calls with no repairs; physical Queue/Library reopen is pending. Fresh capacity-100 Firewalls failed duplicate validation in batch 4 after seven bounded calls and published no Quiz. No automatic retry or weakened validation. Next: finish provider auth, Canvas disconnect/reconnect and Text/Camera/Local File physical acceptance, then reconcile the final B37 verdict. [Current evidence](ai/acceptance/b37/study-experience-overhaul.md). The older quota-stop sections below are historical. `tmp/` untouched; no push.

## B37.2 opening production gate (2026-09-28)

**PARTIAL — migration/deployment/small-source rejection verified; fresh 30 Mixed blocked at the existing daily quota (25/25), so B37.2 is NOT STARTED.**

The approved B37.1a migration is recorded once in `xfdbwfqtorelmurncyql` as version `20260927230139`, name `20260928100000_canonical_non_canvas_sources`; reviewed local filename unchanged. Sources/courses/original Quiz row fingerprints match, all 15 historical Quizzes remain readable, and RLS/grants/owner-source constraints are preserved. No reset or deletion. Production API `dpl_FnAWyTzQmfNgsQLuo5rQyPKpdzbv` is READY for `0c354ac`, health 200 and signed-out Library 401. Private worker `generation-worker-00009-jzb` serves 100%; anonymous health 403. Build/digest and detailed verification are in the ledger.

VPN sections 6–10 have 26 concepts, 5 duplicate exclusions and capacity 52. Direct 100-item admission returns typed 422 with maximum 52, no job and zero provider calls. The whole VPN Reviewer still calculates capacity 100; its whole-source capacity is not claimed to pass a below-100 check. Fresh 30 Mixed returns 429 `rate_limited`, no job/provider calls: 25/25 daily jobs, zero queued/running. The next window starts **2026-09-28 08:00 Manila**. An existing Canvas `2. Firewalls.pdf` Reviewer is a candidate with 138 concepts/capacity 100. No fresh 100-item, Queue/Library completion or non-Canvas physical flow was run after the required stop. Do not bypass the quota.

Realme `PB6DWWEIHAUCMZOR` loaded current JS against production, retained the authorized owner's session, and loaded existing Library/Queue data. Tokens stayed in the app. The corrected config `stay-focused-v2/env.local` matches production; only variable names/presence are recorded. Initial inventory approval blocks were resolved for aggregate counts after explicit user approval; private content exports were not bypassed. Fresh Quiz tests: 157 passed, 2 existing skips; focused database tests: 30 passed, 2 skips (overlapping); production build and `git diff --check` pass. No EAS build, auth/Canvas credential/Resend implementation, live email or new lifecycle acceptance. Existing unrelated Supabase security-advisor warnings remain recorded for separate review.

The authenticated Supabase user UUID is the canonical owner.

Canvas credentials authorize synchronization.
They do not own Stay Focused data.

Resume the 30/100 and non-Canvas physical gate after daily admission resets, then B37.2. Study Assist latency remains approximately 20 seconds and optimization is deferred. `tmp/` untouched; no push.

[Detailed B37 rollout and acceptance ledger](ai/acceptance/b37/study-experience-overhaul.md).


## B37.1a local checkpoint before rollout (2026-09-28)

The local B37.1a implementation uses `source_versions` to anchor non-Canvas Text, Camera/OCR and Local PDF sources under the authenticated `user_id`. Existing Canvas File and Page Reviewers continue to use that table and retain snapshot/course/material provenance; new jobs label their source type. The non-Canvas sheet persists a source on Continue, then sends its source ID through the durable Reviewer path. Quiz resolves the same persisted Reviewer and source; the forward migration allows an owner-bound Quiz with a null Canvas course and a required source version. Library code retains source name/type and can reopen both artifacts. The old manual Save screen is removed from this route. No fake Canvas IDs are used for non-Canvas sources. Activity remains Canvas assignment based. The physical app reached Text entry, camera launch and PDF selection, but its API was unreachable, so persistence and Library reopening are unverified. Automatic approval review rejected the live Supabase migration; no production schema/data changed. Physical and production acceptance are tracked in the [B37 ledger](ai/acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 capacity lock checkpoint (2026-09-28)

**PARTIAL — local Quiz capacity and repair implementation passes focused checks; production acceptance is pending.** Capacity is calculated from persisted Reviewer titles and key points with deterministic deduplication and no provider calls. API admission, worker execution and old-job Retry enforce the same maximum; repair rejects a replacement that repeats its rejected original. Generate now shows Other source near the top and opens a rising sheet with Text, Camera and Local File. The connected realme confirmed text entry, native camera launch and selection of an instructional PDF. Its underlying flow remains Reviewer-only with a manual Save step; Quiz persistence still requires Canvas IDs, so converging non-Canvas generation exceeds this scoped task's stop condition. No production deployment, EAS build, fresh Quiz or Library acceptance occurred. See [B37 acceptance checkpoint](ai/acceptance/b37/study-experience-overhaul.md). Study Assist latency remains separate.

## B37 study experience overhaul (2026-09-27)

**PARTIAL - 100-item production Quiz stopped at batch 3.** Quiz generation now budgets two calls per 20-item batch (cap 10), repairs only rejected items with fresh responses, keeps single-format requests single-format, and requires exact source wording for recall answers; failed Quizzes can be retried without duplicates. Worker `generation-worker-00008-8q5` and Vercel `dpl_4m9zHz7epmr7qHtG427gJgZgBMQi` are live. 30-item Mixed and Multiple Choice production Quizzes pass and reopen from Library; the 100-item Mixed run failed on repeated questions in batch 3 and awaits an owner decision. Study Assist is still about 20 s because each request loads every Reviewer from Tokyo into `iad1`. No EAS build used. See [B37 acceptance](ai/acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation now routes to Google Cloud.** The user confirmed Vercel deployment capacity after the readiness checkpoint. One production deployment, `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL`, reached READY with `GENERATION_BACKEND=google-cloud`; the aliased `/api/health` returned 200. An authenticated production API request using the existing owner-linked VPN instructional Reviewer completed one Quiz through Cloud Tasks, private Cloud Run, OpenAI and Supabase. Queue showed `succeeded`; one owner-scoped result and Quiz persisted; Library listed and reopened it. B38's earlier fresh Quiz, terminal Quiz/text-PDF replay, scoped Vercel OIDC federation, final worker image and security checks also pass. Vercel Workflow remains available for rollback; no Android/EAS build was used. See [B38 acceptance](ai/acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud heavy-generation foundation (2026-09-27)

**PARTIAL — direct Cloud Tasks → private Cloud Run execution works; production cutover remains blocked.** The existing Stay Focus project and Google Vision OCR were reused. Fresh Google-backed Reviewer runs succeeded from text PDF, scanned PDF (16 inspected pages, four OCR chunks), DOCX, PPTX and Canvas Page; Activity also succeeded. Jobs persisted once and reopened from Library. A fresh Quiz reached the existing validator but failed `quiz_generation_failed` with no artifact. Controlled lease retry, queued/running cancellation and safe failure checks passed; terminal duplicate replay was blocked by automatic approval review's usage limit. Vercel dispatch identity has not been federated to Google, and Vercel Functions Storage capacity still prevents assuming a new deployment is possible. The live Vercel API and Workflow default are unchanged; no EAS build was used. See [B37 Cloud acceptance](ai/acceptance/b37/google-cloud-generation-foundation.md). Next: complete Quiz and replay acceptance, configure Vercel-to-Google identity, clear deployment capacity, then review B38 cutover.

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](ai/acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Latest dev-lab revision adds ribbon-edge glow, flowing theme palettes and independent width/twist/curvature changes, replacing transparent faceting with depth-tested bodies. Complete remains slowly alive; Error and Reduced Motion freeze. Fresh mobile 576/576, typecheck and lint pass (four existing warnings). Realme checks are recorded in [ribbon refinement](ai/acceptance/b38-2-1/ribbon-glow-refinement.md). Still PARTIAL for the original glass-material bar; production remains unchanged.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — dev-only real 3D prototype; not approved for production integration.** Expo GL/Three.js replaces the rejected wobbling-image experiment in a dedicated lab, not in production generation. Six states, four palettes, system/simulated Reduced Motion and physical realme checks are implemented. Complete now slows continuously instead of stopping; Error settles and stops. Fresh mobile tests 574/574, typecheck and lint (0 errors, four existing warnings) pass. Short UI-frame samples show 1.35–2.04% steady-state jank and 4.40% transition jank; these are not direct GL FPS measurements. Transparent ribbon intersections, weak glass material and UC surface coloration still miss the signature-visual bar. Production jobs, Queue, auth and old SVG are untouched. See [prototype acceptance](ai/acceptance/b38-2-1/generation-core-prototype.md). Next: refine geometry/materials on the realme and repeat visual/direct-GL acceptance before integration.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](ai/acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS — fresh production generation is source-faithful, useful, durable, and demo-ready for the tested matrix.** On the physical realme RMX3151, a 33-page CC16 Firewalls PDF produced a 25-topic Reviewer and a five-question Quiz whose five marked answers were all correct; a 39-slide CC17 Android Platform PPTX produced a 32-topic Reviewer; and the production Tasks → Create Draft flow produced a requirement-faithful Android Versions Activity Output. All artifacts completed through durable jobs, opened cleanly, persisted in Library, and survived the required relaunch checks. Queue/background continuation passed.

The initial PPTX job reproducibly failed before OpenAI because the strict response schema expanded every long source block ID into an enum and crossed the contract budget. The smallest repair (`1d992aa`) uses bounded strings in the provider schema while preserving exact allowlist enforcement in local validation and repair. The long-ID regression passes, the repaired PPTX completed on production `gpt-5.4-2026-03-05`, and the full repository gates pass. Deployment `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` is READY and healthy; no mobile update or migration was required. See [B38.1 acceptance](ai/acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS — Generate course state and material loading are physically accepted.** Generate listed every discovered Canvas course as "Synced", using the inventory-upsert time, in one alphabetical list. Opening an unselected course such as HIST 100 turned the correct `400 canvas_course_not_selected` gate into a generic `503` "Materials could not be loaded". The Generate list now uses the Sync page's own inventory: selection plus the latest sync attempt give synced / not synced / sync incomplete, and Canvas term/enrollment classification groups current before previous courses, synced first and newest term first. A read-only stored fallback applies when Canvas cannot list courses. Unsynced and incomplete courses open Canvas sync with that course added to the selection draft, and they make no materials request. The unselected gate now returns `409 course_not_synced`, real failures stay retryable, and a synced course with no eligible sources shows "No study materials found".

Implementation `b3f6973` is deployed as `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ` (READY, healthy, no 5xx), and the mobile change as EAS preview update `d288a6ea` on the B37 signed build. No migration was needed.

On the realme RMX3151: HIST 100 (not synced) opens Sync; CC17 (current) and CC16 (previous) open their materials; CIT6 shows the empty state; an offline materials failure retries successfully. Fresh gates pass: typecheck/lint 7/7, mobile 513/513, API 901 with 3 opt-in skips, Canvas 73/73, shared 44/44, DB/API and mobile builds, and the lockfile dry-run. See [B38.0 acceptance](ai/acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS — canonical Reviewer convergence is live and physically accepted.** Production migration history was reconciled without replaying schema SQL, `20260923000000_canonical_reviewer_artifacts.sql` and the owner-scoped read-grant follow-up `20260923010000_authenticated_canonical_reviewer_reads.sql` were applied, and all local migration versions now match production. Deployment `dpl_2QUkcVoZADvJ3JfzegXSDXEjzrcp` is READY at the canonical production alias. Authenticated Android acceptance proved the positive and negative Quiz gates, explicit Queue confirmation with zero pre-confirmation jobs, one durable canonical Quiz job/result/Quiz, offline cold-relaunch reading from SQLite, populated canonical Reviewer management, disposable rename/delete without resurrection, and dependency denial for a Quiz-backed Reviewer. Signed preview build `f0d6d63e-2607-45ee-b125-3b5d43ec2966` at `a7bfcee` is the accepted binary. The legacy table remains for historical compatibility but has zero rows and no active runtime reads. Fresh verification passes: typecheck/lint 7/7, mobile 508/508, API 890 passed with 3 opt-in skips, Canvas 73/73, shared 44/44, DB focus 82 passed with 2 opt-in skips, production build, mobile export, lockfile dry-run, and diff check. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — canonical migration implemented with unresolved runtime dependencies.** The repository now uses `generated_artifacts` as the durable Reviewer identity for the Generate Quiz gate, Quiz DTO/RPC/job/source/persistence path, Reviewer management, source status, deletion, and B35 local relationships. Quiz source assembly consumes the persisted current Reviewer version directly; title matching is never used. The forward migration adds owner-safe `quizzes.reviewer_artifact_id`, preserves historical `reviewer_id`, restricts deletion when dependent Quizzes exist, and keeps the legacy table for a later audited retirement. Queue navigation is side-effect free: only an explicit confirmation can accept generation, with repeated-tap and reopen protection. Fresh typecheck/lint/build/export/install and all requested suites pass (mobile 508, API 886 with 3 opt-in skips, Canvas 73, shared 44). Production is still on the pre-B37 schema/API: the known remote migration-history mismatch, unavailable local Supabase workflow/credentials, and rejected full environment pull prevented a safe current data audit, migration, deployment, authenticated smoke, or physical spend check. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: apply/verify B37 through an approved Supabase path and complete its production smoke; then B38 Generation Quality Acceptance.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — the B34 UX overhaul and the B35 local-first store are accepted on real hardware; Quiz generation and Reviewer deletion are unreachable on this branch.** Two signed EAS preview APKs were built and installed on the realme RMX3151 (Android 13): `0dc19cdd` at `f88b0c2` for acceptance and `245ccaec` at `1e81edd` carrying the repairs. Both contain `libexpo-sqlite.so`; the signing identity is unchanged and no credential was created or rotated. Authentication, session persistence across force-stop, the synced-course Generate browser, Reviewer hierarchy across three materially different Reviewers, the replacement generation visual with genuinely multiline-stable status regions, Library paging/indicator/cards, and the repaired Today handles all pass physically. One real Reviewer was generated end to end from CC17 material and stored locally. Offline is the strongest result: with the network fully disabled, the Library renders saved work behind an explicit device-copy notice, Reviewer and Activity Output open in full, and the Quiz opens read-only with questions visible, no answer keys (correctness exists only on attempt results, never in stored question bodies), no fake scoring, and no submission path; network-only functions fail honestly. Reconnect reconciles with no duplicates and no loss, proven both by a stable `6 items` count and by two same-titled Reviewers correctly remaining two distinct ids. Measured motion is acceptable (289 frames, 11.4% janky, 90th percentile 28ms, GPU 8ms), and reduced motion via "Remove animations" keeps every surface usable. Logout returns to sign-in and the session is cleared across relaunch; the owner re-authenticated and the Library rebuilt from the cloud. Two bounded layout defects were found and repaired: card rows were clipped by the Surface corner radius because three call sites gave `RowLink inset` a `padding: 0` Surface with nothing to cancel, and the Library tab row was a hardcoded 378pt inside a 320pt content area. Blocking the remaining items is one shared root cause: creation and reading moved to `generated_artifacts` (48 rows) while the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table (0 rows), so Quiz generation can never be enabled and "Manage saved Reviewers" lists nothing to delete. No second test account exists, so cross-account isolation remains covered by automated tests only. Fresh forced typecheck/lint 7/7 (same 4 pre-existing warnings), mobile 505/505, API 895/3 skipped, Canvas 73/73, shared 44/44, `npm ci --dry-run`, mobile export, and `git diff --check` all pass. See [B36 acceptance](ai/acceptance/b36/signed-physical-offline-acceptance.md). Next: B37 Generation Quality Acceptance, which should also carry the legacy-`reviewers` retirement that unblocks Quiz generation and Reviewer deletion.

## B35 on-device artifact persistence (2026-09-22)

**PASS — completed Reviewers, Quizzes, and Activity outputs are persisted on the device and the Library is local-first.** An owner-scoped, versioned expo-sqlite store (`apps/mobile/src/services/localLibrary`) keeps the authoritative cloud Library detail once the server reports a persisted `artifactId`. It is also filled by online opens, Library reconciliation (summaries plus bounded body hydration), and saved Activity draft revisions. The Library and artifact reader render from the device before any network request. Cloud refresh is idempotent: older copies are ignored, failures and remote-list absence retain local rows, and only an owner-authenticated `not_found` removes one. Offline, Reviewers, Quiz questions, and Activity drafts are readable; generation, practice/scoring, draft saves, and refresh stay network-only. Explicit sign-out purges that owner's rows. Supabase, RLS, durable generation, and Queue are unchanged; Quiz→Reviewer identity uses persisted ids, never titles. Fresh forced typecheck/lint, mobile 505/505, API 895 passed / 3 skipped, Canvas 73/73, shared 44/44, mobile export, and DB/API builds pass. The installed signed APK predates the new native module, so a new native build is required. See [B35 acceptance](ai/acceptance/b35/on-device-artifact-persistence.md). Next: B36 Signed Physical UX + Offline Acceptance, which also completes B34's pending physical matrix.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — the connected Generate, Reviewer, Generation, Library, Today-handle, and motion overhaul is implemented and all fresh automated gates pass, but authenticated acceptance on the changed signed Android build is still blocked.** Generate now browses synchronized owner-scoped courses and gates Quiz through an exact persisted Reviewer relationship; the reader has study-oriented semantic hierarchy without duplicate section/block titles; the former orb is replaced by a native-driven study field in fixed layout regions; Library is a swipeable native pager with interpolated rounded tabs, compact cards, and structural loading; radial handles now use 34-point visuals over the 22-point ring with 56-point touch geometry; common press motion is centralized and reduced-motion aware. The realme RMX3151 / Android 13 is ADB-authorized and loaded the changed local bundle, but Expo Go cannot reuse the signed app's authenticated SecureStore session. EAS signed-build upload requires explicit approval. See [B34 acceptance](ai/acceptance/b34/current-mobile-ux-repair.md). Next: finish B34 physical acceptance, then B35 Physical UX Acceptance.

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** The former standalone DOCX/PPTX milestone was already absorbed by B31, and B32 closed the scanned-PDF reliability blocker; no duplicate production generation was run. Page, text PDF, scanned PDF, DOCX, and PPTX now have production generation, Queue, physical Android, persistence, and Library-reopen evidence. Direct instructional JPEG ingestion is production-proven; Canvas PNG/JPEG discovery remains naturally fixture/Student-permission limited, with shared implementation and negative routing verified. B33 repaired one reproducible product-separation defect so Tasks now excludes Canvas assignment records with neither a deadline nor an actionable submission mode, including previously imported linked rows. Full API, engine, Canvas, focused failure-safety, typecheck, and DB/API production-build gates pass. See [B33 acceptance](ai/acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — production scanned-PDF Reviewer generation is durable and memory-safe.** The synchronous request now stores only a durable Canvas source reference; checkpointed workflow steps perform page inspection, OCR, ordered source assembly, attachment, and AI generation. READY deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` completed fresh 16-page job `a85bd672-2aed-401b-a37e-fd1c794d826f`, attaching 6,757 ordered OCR characters and persisting `Reviewer in Journaling and Basic Accounting`. The authenticated realme RMX3151 showed background continuation, Queue completion, meaningful Reviewer rendering, and Library reopen after force-stop/relaunch. Full API and engine regressions pass. Direct service-role DB metadata inspection was unavailable because the local Vercel environment pull returned secret references rather than decrypted Supabase values; production workflow logs and physical app behavior provide the durable-result evidence. See [B32 acceptance](ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance, with B33 only if a new DOCX/PPTX defect is proven.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — production Student paths now accept fresh Canvas text PDF, DOCX, PPTX, and Page Reviewers end-to-end, including Queue/background continuation, owner-authenticated persistence, physical Library open, and force-stop/relaunch retrieval.** B31 expanded synchronization to concluded FL 100 and CIT5 courses without modifying Canvas. It found and repaired one exact administrative-module routing gap; commit `9e29d84` is live in READY deployment `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`, and physical Generate now excludes the eight-item FL 100 Course Information module while retaining 29 lesson materials. The genuine 16-page Accounting scan reaches `PDF · ready`, then both generation submissions are killed for production OOM before durable job creation. Deep internal provenance/byte/signature fields were not safely inspectable, and no eligible instructional image exists. See [B31 acceptance](ai/acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — production contains B29's direct-module image routing guard, and its negative behavior is physically accepted.** READY deployment `dpl_3LCFzi9ao68Upsiir8GFL1kroX82` serves the canonical URL and passes health. Fresh normal-device synchronization completed for CC13, CC16, CC17, and CIT6. CC16's administrative APA image and five ungrouped CC13 artwork/profile files stayed out of Generate, while announcements and assignments remained on their expected surfaces. The Student-only account cannot create the positive direct-module fixture. Instructor cooperation and sandbox access will not be pursued, and this external Canvas-permission limitation does not block the student product roadmap. No product repair or Canvas mutation was made. Required tests, typecheck, lint, and the isolated production API build pass. See [B30 acceptance](ai/acceptance/b30/canvas-instructional-image-production-acceptance.md). Next: B31 student-accessible Canvas material acceptance.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — the production Google Vision path and OCR-derived Reviewer flow are proven on physical Android, but Canvas learning-image discovery is not physically accepted.** A real image-only Hiragana PDF completed 1/1 OCR page with 688 characters, fresh generation, owner-linked persistence, and Library reopen. A real Piaget JPEG completed live image OCR with 965 characters and the same fresh generation/retrieval path. Canvas images are intentionally supported only when a direct module File placement establishes learning intent and administrative routing does not exclude them. B29 repaired a false-positive gap by excluding ungrouped artwork; no suitable synchronized teaching image exists to exercise the Canvas route. A larger 16-page image-only scan stalled during inspection and was cancelled safely. Package tests, OCR tests, typecheck, lint, and isolated production API build pass; the known local `expo-router` root-build issue remains. See [B29 acceptance](ai/acceptance/b29/live-ocr-learning-image-acceptance.md). Next: B30 production acceptance with one consented direct-module Canvas instructional image.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — the production Canvas PDF, PPTX, and Page source paths completed fresh Reviewer jobs on the authenticated realme and reopened in Library.** Read-only database checks found 7,984/9,873/8,227 source characters respectively, matching source versions, Canvas provenance, persisted results, and owner links. The OOXML DOCX extractor produced readable text from a local fixture; no Canvas DOCX learning file was present. Scanned PDF and meaningful image OCR were not run live, though the existing Google Cloud Vision paths and failure behavior pass automated tests. B27 remains the active READY production deployment. No code or schema repair was made; the B27 migration-history mismatch still blocks a future CLI push until reconciled. See [B28 acceptance](ai/acceptance/b28/ingestion-document-format-acceptance.md). Next: B29 scanned-PDF/instructional-image OCR acceptance.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 student-facing Canvas announcements are deployed and physically accepted.** The production schema supports author and attachment metadata without changing RLS or grants; deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT` is READY and healthy. A signed B27 APK preserved the realme's authenticated session, and fresh sync plus physical Today/list/detail/native-text/Canvas-handoff and routing checks passed. Live announcements have no body links or attachments. The remote migration-history version differs from the local filename and needs reconciliation before a future CLI push; the applied schema is verified. See [B27.1 acceptance](ai/acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** The final production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v` is READY and healthy. Physical standalone validation confirms study Pages/PDF/PPTX in Generate, Canvas assignments in Tasks, announcements excluded from Generate/Tasks, and the retained CIT6 orientation PDF excluded after normal synchronization. Generic Activity prompt repairs preserve mandatory non-text/count/format/reference requirements and use editable sentence starters instead of inventing personal facts. Five completed assignment types passed their prewritten checklists; one scenario-dependent type stopped before generation because its referenced Group Announcement was unavailable. Automated and production gates pass apart from the existing local Expo external-link limitation. See [B26.1 acceptance](ai/acceptance/b26.1/deployed-routing-and-activity-reliability.md).

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The existing preview APK was verified to contain the generation-cache repair, installed with app data preserved on the realme RMX3151, and launched directly outside Expo Go. Authentication/Canvas, fresh Reviewer/Quiz/Activity jobs, server Quiz scoring, Queue, Library and all three artifact reopens passed through cold relaunch. A read-only trace confirms AI-first production ownership for all three generators. Production health/protected-route checks and fresh mobile regressions pass. See [B25.3.4 acceptance](ai/acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Historical PARTIAL entries below remain as checkpoints, not current status.

## B25.4 physical-device acceptance (2026-09-16)

Physical realme RMX3151 / Android 13 acceptance reached the production AI-first API for a real CIT6 Reviewer and five-question Quiz plus a real CC16 Learning Contract Activity. All three completed in Queue and reopened from Library; the Quiz attempt scored 5/5 on the server and its result reopened. A malformed mobile generation-admission cache initially blocked Quiz submission and is repaired in `9bdc03e`, with regression coverage and a successful Expo Go physical retest. Full post-fix regression passes. A patched preview APK build is pending install/retest; therefore B25 remains **PARTIAL** and B26 may not begin. See [B25.4 device checkpoint](ai/acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](ai/acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

Quiz repair now uses structured finding-specific feedback, direct correction, full same-support reauthoring, alternate unused support, source-affordance difficulty planning, immutable accepted questions, and deterministic academic-value checks. All fresh package/root gates pass, and the second/final bounded synthetic-live validation accepted all five questions. Commit `bd5eb15` is deployed as production `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` (`READY`, healthy canonical alias).

The one authorized authenticated real-lecture retest still ended `repair_exhausted`: 1/5 accepted, with four slots pending after alternate-support repair. No Quiz artifact reached Library, so take/submit/score/result/reopen remain unaccepted. **PARTIAL — Quiz semantic convergence remains incomplete.** No gates were weakened, no retry was submitted, and B26 was not started. See [B25.3.1 report](ai/acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](ai/acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](ai/acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](ai/acceptance/b25/ui-redesign-foundation.md).


## B24.7 Quiz backend (2026-09-13)

**PASS — Quiz backend is ready and core backend capability is complete for the UI redesign.**
Owned prepared material and saved Reviewer source relationships now feed durable,
source-grounded quizzes with server-only answer keys, persisted attempts,
deterministic exact-set scoring, weak-area navigation and Library reopen.
Reviewer, Activity Maker and Quiz capabilities are available in the new code.
Quiz uses the existing provider adapter with its own pinned GPT-5.4 model;
Reviewer and Activity model defaults and behavior are unchanged.

Fresh verification: API 906 passed plus three opt-in live tests skipped; mobile
443, Canvas 73, OCR 27, shared 44 and engine 606. Forced root typecheck/lint/build
passed 7/7 each with zero cached tasks and no lint warnings; Workflow runtime 1
and provider contract 18 passed. Both five-question live fixtures passed final
whole-set verification, local SQL attempts/scoring and Library reopen after
three rejected questions were repaired. Earlier academic failures are documented;
the limited sample is not a production reliability benchmark.

Pending rollout: apply Activity migration `20260912100000_activity_maker.sql`
then Quiz migration `20260912110000_quiz_maker.sql`, deploy API and smoke test.
No hosted migration, deployment, UI redesign or push occurred in B24.7.
This entry supersedes earlier Quiz-missing statements. Acceptance evidence is
under `docs/ai/acceptance/b24-7/`, including quality limits and failure history.

Next: B24.8 — Backend rollout readiness, then B25 — Apple-inspired 2026 design
system + mobile app shell.

## B24.6 Activity Maker backend (2026-09-12)

**PASS — V1-informed Activity Maker backend is ready for the redesigned UI.**
The verified GitHub V1 audit informed owned Canvas assignment/resource assembly,
DOCX/PPTX structural ingestion, TaskSpecification, source-grounded structured
generation, transactional editable drafts and Library/Activity Detail integration.
Activity Maker is available in the new code; Quiz remains unavailable. No UI,
Reviewer-engine rewrite, planner replacement or Canvas submission behavior added.

Fresh verification: API 768 passed plus one opt-in live test skipped; mobile 443,
Canvas 73, OCR 27, shared 44 and engine 606. Root typecheck/lint/build passed 7/7
with zero cache hits and no lint warnings. Provider contract 18 and existing
Workflow runtime 1 passed. Two live provider fixtures passed instruction/grounding
checks and local Postgres persistence/reopen/edit/regeneration validation.
Database policies, retention and account deletion passed deterministic SQL tests.

Deployment prerequisite: apply `20260912100000_activity_maker.sql` before the API
that reads Activity drafts. Hosted migration/RLS/deployed Activity execution were
not run. Legacy DOC/PPT, advanced Office layout/media and output export remain
outside this slice. Earlier phase entries below are historical; B24.6 supersedes
their Activity Maker/DOCX/PPTX missing-capability statements.

Next: B24.7 — Quiz generation, attempts, results, weak-area mapping and Library
persistence. Acceptance evidence is under `docs/ai/acceptance/b24-6/`.


## B24.5 backend experience contracts (2026-09-12)

**PARTIAL — core contracts are aligned but a product capability still requires
backend implementation.** Shared student DTOs and authenticated API experience
services now compose Today, Learn, Activities and Library. Reviewer admission
reuses source preparation, snapshot/freshness gates and durable jobs; Library
opens persisted output and deduplicates the existing automatic save path.
Capabilities explicitly disable missing Quiz, Activity Maker and calendar
implementations. No UI redesign, migration, model/provider selection change or
planner algorithm change. The standalone provider contract's pre-existing import
resolution issue is repaired with an equivalent relative import.

Fresh verification: API 710, mobile 443, Canvas 73, OCR 27, shared 44 (22 distinct source tests), engine 606,
Workflow runtime 1 and provider contract 18; forced typecheck/lint/build each pass
7/7 with zero cache hits and zero lint warnings. Hosted RLS/new APK acceptance
NOT RUN. Pre-existing persistence edits are preserved and excluded from this commit.

Next: B24.6 Activity Maker generation and owner-scoped draft persistence, then a
separate Quiz generation/attempt/results slice. Reconcile the completed B24
specification (not found in this checkout) before B25 app-shell implementation.
See [B24.5 contract](ai/acceptance/b24-5/backend-ui-contract.md) and [verification](ai/acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Canvas Reviewer creation now persists a minimal owner/source/job recovery record before submission, reconnects the exact durable job after backgrounding or Android process death, retains identity through temporary network errors, fails closed on unsafe state, and makes snapshot-bound Library saves replay-safe. Production physical acceptance on a realme RMX3151 / Android 13 proved background/foreground, running-job force-stop/relaunch, network interruption/recovery, large text at font scale 1.35, automatic save, and Library reopen without regeneration. Exactly two intentional jobs produced two distinct snapshots and one saved Reviewer per snapshot. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and forced root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next milestones: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification; B25 — Design system + app shell implementation; B26 — Core experience redesign; B27 — Remaining application redesign; B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The normal path is now Study materials → material → Create Reviewer → automatic save → Library → reopen. Course diagnostics are disclosed instead of leading, Canvas materials retain module order, Ready/Prepare/PPTX-DOCX unsupported/empty states are explicit, and the accepted single-source snapshot/durable-job architecture remains intact. Physical production acceptance used the real 23-page CIT6 PDF and created one fresh 20-section Reviewer with 1.00 coverage/grounding, zero grounding/fabrication/leakage issues, automatic snapshot-bound persistence, and reopen without a second job. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. No API, engine, Supabase, or Vercel deployment change was required. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Production exact module resolution persisted real learner materials for all three selected courses despite broad Files (`canvas_permission_denied`) and Pages (`canvas_resource_not_found`) failures. Two production-only database contract gaps were repaired and regression-covered: the exact-resource sync-unit allow-list and the stale five-page reviewer-snapshot limit. A genuine 23-page CIT6 Canvas PDF was resolved from its module, stored privately, extracted as 23/23 native-text blocks, generated into a grounded 20-section Reviewer (coverage/grounding 1.00, leakage passed), rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production is healthy at the canonical Vercel URL. PPTX/DOCX remain intentionally unsupported and broad Canvas limitations remain honest partial-sync warnings. Next: start B22 only as a separate scope. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** The current `main` app launched on a physical realme RMX3151 / Android 13, restored its Supabase session, selected real 15-page and 55-page learner PDFs through Android Files, created authenticated durable jobs against the deployed Vercel API, completed the production `gpt-4o` Reviewer workflow, rendered 5-section and 14-section grounded results, saved them, and reopened them from Study Library without regeneration. Live missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root typecheck/lint/build pass; lint retains four existing warnings. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source. Current Canvas ingestion also lacks DOCX/PPTX parsing. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](ai/acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](ai/acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](ai/acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](ai/acceptance/b19/source-span-ancestry-completeness.md).

## B18 local repair — historical result (2026-09-08)

**FAIL — Reviewer representation defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46, with unchanged hashes, source ownership,
production gpt-4o, parser default legacy and initial prompts. Deterministic
representation ownership reduces composite/relationship copies and validates
visible spans. All Statistics mapping mismatches are resolved; Docling remains
withheld for one finding containing two real missing definitions. MinerU now
assembles with zero omissions. Python fallback remains zero. Final calls are
2/3/3/1, explanation retries 0/1/1/0, factual retries all zero. All four manual
gates still FAIL; serialized usefulness also fails Python/MinerU/Docling.
Full unchanged B12: NOT RUN — targeted prerequisites failed.
Fresh engine 519/519, architecture 70/70, reader 32/32, API 607/607, root
typecheck/lint/build all PASS. No push. B16/B17 historical FAIL reports unchanged.
Next: repair remaining source-span ancestry and source-item completeness from
B18 captures, preserving frozen targets and gates.
See [B18 acceptance](ai/acceptance/b18/composite-source-presentation-source-item-alignment.md).


## B17 local repair — historical result (2026-09-07)

**FAIL — generic Reviewer quality defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46; model gpt-4o and parser default legacy
are unchanged. Deterministic display now separates typed evidence, protects
row identity/order and exact overlap, and preserves every target at serialization.
Local sentence context and heading-subject completion improve explanations.
Fresh engine 494/494, architecture 45/45 and reader 32/32 pass.
Final calls 2/2/2/2, explanation retries 0/0/0/1, factual retries all zero.
Python has zero fallback, but source code/layout and repetitive labels remain.
Statistics remains withheld (two/four omissions); Accounting improves but
still fails manual usefulness. All four manual gates FAIL; full B12 NOT RUN.
Next: repair composite source-span/relationship presentation and align its
source-item evidence, preserving the frozen gates. No push or parser promotion.
See [B17 acceptance](ai/acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` contains the R5 implementation, Gap A/Gap B, and acceptance
  documentation commits and remains unpushed. Gap B hosted acceptance began at
  `792205d` with a clean tree, 45 commits ahead and 0 behind `origin/main`.
- R8 started from clean `dbf5e039f345f95986d810bb353c83b5b85487ca`,
  55 commits ahead and 0 behind `origin/main`. Implementation commit
  `69ea697ee916adb0e928171b4d0afdc792b92da0` exposes the existing Canvas
  structured-block/selective-preview contract in the Android reviewer flow.
- Consolidated Reviewer Android acceptance started at `e23ef61` on `main`, 62
  commits ahead and 0 behind `origin/main`, with three preserved in-scope UI
  edits already present in the working tree.
- Recovery branches/tags remain preserved. Generated Next build drift was
  removed before the R5 implementation commit.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 is in progress locally; Phase 7 has not started.

## Recovery and active implementation

- B16.1 attempt 3 on 2026-09-07 has working OpenAI capacity but FAILS live
  acceptance. All four targeted cases retained every deterministic target
  (99/99, 232/232, 156/156, 46/46), with zero provider losses or factual retries.
  A regression-backed generic prompt correction reduced Python from six calls
  and eight fallback explanations to four calls and two fallbacks (10.383 s).
  Statistics remains withheld for grounding omissions/structural noise;
  Accounting assembles in 5.824 s but has fragmentary prose and raw table dumps.
  Manual quality fails, so full frozen B12 was not eligible. Fresh engine
  476/476 (architecture 27/27) and API 607/607 pass. Preserve the frozen gates;
  next: reconcile the generic explanation/evidence presentation contract with
  the existing validation rules, using these captured failures. No B17, parser
  promotion, evidence-ownership change, or push. See
  `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.
- Reviewer B16 deterministically assembles required facts, list items,
  formulas/results, tables/rows, code, relationships, titles, and provenance.
  OpenAI owns only bounded batched explanations; ownership and prose validation
  are separate and runtime/request metrics are explicit. Focused 26/26, engine
  475/475, API 607/607, and all root gates pass. Live acceptance is unresolved:
  Python returned permanent no-credit 429s. Its two-call, zero-retry fallback
  preserved 99/99 targets in 5.432 s, but Statistics, Accounting, and full B12
  were not run. Production remains `legacy`. See
  `docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.
- Reviewer B15 makes source sufficiency a Stage 2 planning concern. Explicit
  source nodes are deterministically classified as standalone, structural,
  typed evidence or unsupported; non-standalone nodes retain hierarchy and
  exact evidence ownership without provider calls or fabricated explanations.
  B15 passes 12/12 focused regressions and the full 449/449 engine suite. Fresh
  targeted acceptance remains failed: Python preserves 99/99 targets but is
  withheld for instructional noise; Statistics/MinerU preserves 211/232,
  Statistics/Docling 152/156 and Accounting 35/46, all with zero fabrication
  failures. The full B12 rerun was not eligible. Production remains `legacy`.
  See `docs/ai/acceptance/b15/reviewer-section-planning.md`.
- Reviewer B14 hardens explanation form and targeted repair while retaining all
  B13 safety gates. The new 12/12 suite and full 437/437 engine evaluations pass.
  Acceptance remains failed: exact B13 candidates are still withheld, and
  source audit proves two planned Python sections are heading-only while two
  additional sections are code-only. B14 made no fresh provider calls and did
  not fabricate prose. See `docs/ai/acceptance/b14/reviewer-explanatory-repair.md`.
- Reviewer B13 adds stable required-evidence manifests, structured row/cell
  provenance, source-absent preflight refusal, exact-target bounded repairs and
  final deterministic usefulness gates. Empty-child semantic group labels no
  longer disappear from extractive fallback. All **425/425 engine evaluations**
  pass, but the Reviewer acceptance milestone remains **failed**: provider
  omissions and non-explanatory/source-dump candidates are still withheld.
  Earlier live metrics and final-code candidate replay are distinguished in
  `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`. No full B12
  rerun is claimed after failed targeted prerequisites. Parser default remains
  `legacy`; B11 gates and B12 durable typed-block preservation remain intact.
- Reviewer Benchmark B12 completed the full frozen B8 corpus in hybrid mode and
  failed acceptance. A minimal Stage 0 fix now preserves non-legacy typed blocks
  after durable metadata rehydration; its regression raises engine evaluations
  to 406/406. The post-fix durable run produces Python's expected 13-section
  plan, while Statistics and Accounting remain safely withheld for missing
  generated source evidence. Manual Python inspection also finds title-only
  explanations, activity leakage into key points, and excessive source-like
  lists despite 1.00 coverage/grounding. No fabrication was allowed, and the
  production parser default remains `legacy`. See
  `docs/ai/acceptance/b12/full-b8-hybrid-acceptance.md`.
- Reviewer Benchmark B11 is complete locally. Typed heading roles now use
  hierarchy, repetition, lexical/body, neighbor, and subordinate-evidence
  signals; furniture and instruction labels fold into their supported parent
  without losing source blocks. Same-parent repeats consolidate without numeric
  suffixes. Plan-level typed evidence groups carry formulas, tables, exact
  cells, code, and result statements through generation and grounding. Stage 6
  now rejects objective malformed student-visible structure.
- Live Python Docling assembles 13/13 clean concepts with 1.00 coverage and
  grounding and none of B10's furniture, malformed fragments, or repeated
  suffixes. Central-tendency Docling issues fall from 41 to 4 and MinerU from
  40 to 2, all omissions with zero fabrication failures; both remain safely
  withheld. Accounting numeric provenance remains Docling 41/41 and MinerU
  32/32. The production parser default remains `legacy`.
- Reviewer Benchmark B10 is complete locally. The API can now route PDF bytes
  through a feature-flagged, provider-independent `StructuredDocument`
  boundary with legacy, Docling, and MinerU adapters. Typed headings,
  paragraphs, lists, code, formulas, tables, images, reading order, hierarchy,
  parser diagnostics, and block/cell provenance reach Stage 0 without first
  being collapsed into Markdown. The production default remains the existing
  extraction/Google OCR path; external parser failures and quality failures
  fall back deterministically and expose only safe diagnostics.
- B10's sanitized three-class fixtures and router regressions pass without
  downloading parser models. Live A/B evidence is mixed: Docling materially
  improves code-heavy source structure and title quality, while MinerU's
  Python reviewer is withheld by grounding; all three central-tendency
  reviewers are withheld despite substantially better typed formula/table
  evidence. The scanned accounting source routes through MinerU into the
  shared contract without Google credentials, but known missing/misread cells
  remain unsynthesized. B11 now addresses the downstream hierarchy and
  grounding layer without another parser-specific mapping.
- Reviewer Benchmark B4 is complete locally. Stage 4 now scores unique
  source-derived semantic targets, while Stage 5a independently rejects wrong
  definition, parent-child, step-order, example, cross-concept, and sibling
  relationships. Relationship failures remain section-bounded and now produce
  field/type-specific retry guidance. The exact Intro to IT Security PDF
  retains B3's 17 titles and all 17 sourceCore payloads, passing 110/110 semantic
  targets, 1.00 coverage, 1.00 grounding, zero relationship issues, leakage,
  17 calls, 0 retries, and 0 fallbacks. The Google credential exposed during B3
  still requires authorized operational rotation; B4 did not inspect or reuse
  it. See `docs/ai/benchmarks/intro-it-security/benchmark-b4.md`.
- Reviewer Benchmark B3 is complete locally. Stage 2 now carries an optional
  source-derived semantic plan and distinguishes conceptual enumerations from
  procedures; Stage 3 preserves definitions, supported category groups,
  ordered steps, and explicit examples while allowing useful direct-source
  explanations and avoiding filler. The real 32-page Intro to IT Security run
  retains B2's 17-section outline and passes with 17 calls, 0 retries, 0
  fallbacks, 1.00 coverage, 1.00 grounding, and leakage passing. Page 10 visual
  labels and page 14 hierarchy edges remain explicit extraction gaps; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b3.md`.
- Reviewer Benchmark B2 is complete locally. Production PDF extraction now
  preserves normalized page blocks through mobile job submission and durable
  worker storage into generic engine source blocks. Page-aware Stage 0/1
  classifies title/divider/reference noise, recognizes page-leading academic
  headings, merges repeated continuation slides, and keeps distinct concepts
  separate without changing Stage 3. The real 32-page Intro to IT Security run
  now produces the approved 17-concept outline instead of the B1 giant Domains
  span and noise sections; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b2.md`.
- The R6 reviewer-core capstone audit is accepted. The complete supported path
  is source intake or synchronized Canvas selection, editable preparation,
  grounded Stage 0-6 generation, durable progress, reviewer reading, save, and
  Study Library reopen. A fresh linked-project Canvas run passed selection,
  OpenAI generation, immutable provenance, persistence, source health, owner
  isolation, and zero-residue cleanup.
- Two reviewer defects were hardened: saved PDF metadata now matches the
  durable 100-total-page policy instead of rejecting page counts above five,
  and reviewer results opened from completion routing can be titled and saved
  from Processing, including their Canvas snapshot.
- The R8 Canvas mobile gap is closed and physically accepted. A synchronized
  source now resolves to server-owned structured blocks, honors the server
  default selection, supports ordered subset selection and a zero-selection
  guard, creates an authoritative selective preview, and hands its preview
  session/fingerprint into the unchanged durable generation path. Changing the
  selection invalidates the old preview and requires a new one.
- The physical R8 run selected three of nine returned blocks. The resulting
  durable job completed 1/1, recovered through Processing after force-stop,
  saved as `Capstone Selective Canvas Reviewer`, and reopened from Study
  Library without regeneration. Its immutable snapshot records exactly three
  ordered paragraph blocks (source block ordinals 5, 6, and 7), the
  selective-preview parser/normalization versions, hashes, no OCR, and
  `wasEdited = false`.
- Consolidated Reviewer UI acceptance is complete on realme RMX3151 / Android
  13. Pasted text, gallery, camera, PDF, Canvas selection/preview, a real durable
  generation, Processing, Reader, save, immediate Library refresh, reopen,
  rename, native delete Cancel/Confirm, and both Back paths passed. The run fixed
  blank-source/footer readiness and saved-Reader Android Back behavior without
  changing reviewer architecture or persistence semantics.
- Capstone development R5 is complete and live accepted: manual task CRUD,
  persisted Canvas-assignment import, deterministic preview/apply planning,
  study-session persistence/edit/delete, and two-user denial coverage are in
  place and passed against linked Supabase. Final verdict: PASS.
- The R6 replanning prerequisite (Gap B) is implemented and hosted accepted.
  Study sessions have `planned`, `completed`, and `skipped` lifecycle state;
  applying a range serializes per owner and atomically replaces only
  intersecting planned rows, preserves terminal history, and rejects
  overlapping new proposals.
- Live acceptance exposed one R5 runtime defect: PostgreSQL returned persisted
  timestamps with microsecond precision while the shared ISO validator allowed
  at most milliseconds. The parser now accepts valid fractional precision and
  a regression test covers the live format.
- Product Recovery R1-R5 is complete. R6 is partial: automated checks pass,
  while Dynamic Type, VoiceOver, interruption, navigation/reconciliation, and
  save-flow behavior still require physical iPhone observation.
- Durable document jobs now accept at most 100 total PDF pages and at most 40
  pages that require OCR. Native-text and confirmed blank pages do not consume
  the OCR allowance; synchronous and Canvas extraction remain capped at 40
  total pages.
- API and mobile errors are sanitized, native text is inspected before OCR,
  OCR fan-out remains bounded, and Vercel Workflow owns accepted processing.
- The EAS preview APK was built and installed on a physical Android device.
  Android authentication and hosted API connectivity passed. The specific
  durable 41-100-page native-text and >40-OCR-required-page matrix remains.
- R8 EAS internal preview build `ab67feeb-0f61-4d6c-b24c-a7c5658ac050`
  (Stay Focused V2 2.0.0, build 1, commit `69ea697`) was installed with
  `adb install -r` on the realme RMX3151 / Android 13. Authentication and the
  existing session survived replacement. No API code changed, so the verified
  production deployment remained in use.
- Reviewer acceptance EAS build `b625303b-943e-45a1-89da-e50c33fbba1b`
  (Stay Focused V2 2.0.0, build 1) was installed with `adb install -r` on the
  same device. Authentication and the two pre-existing saved reviewers survived
  replacement; the hosted preview API remained reachable.

## Deterministic test baseline

- B15 verification passes 449/449 engine evaluations (B15 12/12, B14 12/12,
  B13 19/19) and 607/607 API tests across 69 files. Root typecheck, lint and
  build pass for 7/7 workspaces; four established mobile import-order warnings
  remain. Fresh targeted provider runs completed but all four Reviewers were
  safely withheld, so the full B12 rerun was not run.
- B11 verification passes 405/405 engine evaluations (all prior 396 remain)
  and 607/607 API tests. Engine and full repository typechecks pass; builds
  pass; lint retains only the four accepted mobile import-order warnings. B10's
  unchanged adjacent baselines remain 1/1 durable workflow and 10/10 focused
  mobile parser handoff tests.
- Shared: 32/32, including the PostgreSQL microsecond timestamp regression;
  targeted Gap A/Gap B API/database/session coverage: 27/27; mobile: 216/216;
  reviewer engine: 343/343 deterministic evaluations after B4 semantic
  coverage, relationship, fault-injection, and retry-diagnostic regressions.
  These suites were rerun after hosted acceptance.
- Forced root typecheck and lint pass fresh for 7/7 packages with zero cached
  tasks; lint retains only the four known mobile import-order warnings. DB and
  API production builds pass.
- Full API regression is 576/577 after two new reviewer-save boundary tests.
  The only failure matches the documented
  pre-existing Windows CRLF-sensitive Canvas SQL substring baseline; the SQL
  semantics and all planning tests pass, so it is not a Gap B product defect.
- R8 verification passed: mobile 278/278, Canvas 72/72, targeted Canvas
  structure/selective-preview/generation/freshness/provenance API tests 43/43,
  fresh forced root typecheck 7/7, fresh forced root lint 7/7, `git diff
  --check`, and `git fsck --full`. The four previously accepted mobile
  import-order warnings did not appear in the R8 lint run and no new warning
  was introduced.
- Consolidated Reviewer acceptance verification passes mobile 373/373, focused
  Reviewer/Library 108/108, mobile and root typecheck/lint, `git diff --check`,
  and `git fsck --full`. Lint retains only the same four accepted mobile
  `import/first` warnings.

## Migration status

- The four proven Canvas metadata aliases were reconciled through supported
  `supabase migration repair` metadata operations only:
  `20260728022127` to `20260728094421`, `20260728024021` to
  `20260728104000`, `20260728131529` to `20260728201000`, and
  `20260728133821` to `20260728213700`. No historical SQL was edited or
  replayed and no Canvas schema object was changed by the repair.
- Forward-only migration
  `20260827155438_task_study_plan_foundation.sql` is the applied R5 foundation.
  It creates `tasks`, `study_plans`, and `study_sessions` with owner-safe
  foreign keys, RLS policies, service-only RPCs, and supporting indexes.
- Forward-only migration
  `20260828173643_replace_planned_study_sessions_on_replan.sql` is applied to
  linked Supabase. A CLI 2.116.0 dry-run proposed only this migration; final
  local/remote history matches through `20260828173643`.
- Hosted catalog inspection confirmed the non-null `planned` status default and
  lifecycle check, partial planned-session index, owner-serialized replacement
  function, safe search path, `SECURITY INVOKER`, service-role-only execution,
  enabled RLS, and unchanged owner policies.
- Dedicated two-user runtime acceptance passed first apply, same-window
  reapply, no duplicate active schedule, completed/skipped preservation,
  owner-scoped status PATCH persistence, overlap rejection with no partial
  writes, cross-owner API/RLS denial, two concurrent RPC applies, and the Gap A
  embedded-task/full-PATCH response contract. Temporary users and rows were
  removed; `tasks`, `study_plans`, and `study_sessions` counts returned from
  0/0/0 to 0/0/0.
- Supabase CLI 2.116.0 dry-run proposed only the R5 migration. The linked push
  applied only `20260827155438`, and final linked history records it as
  `task_study_plan_foundation`.
- Live schema checks passed for constraints, indexes, owner RLS, grants,
  triggers, and service-only security-invoker import/apply RPCs. Live CRUD,
  Canvas import/idempotency/edit preservation, deterministic preview, atomic
  apply, study-session behavior, and all eight API plus RLS/database isolation
  attacks passed. Dedicated test users and rows were removed; R5 table counts
  returned from 0 to 0.

## Known risks and immediate task

- Recommended next task: reconcile heading-only planned sections with the
  source-faithful explanatory contract. Do not borrow child content, fabricate,
  weaken usefulness, or change the parser default. Targeted acceptance must pass
  before the unchanged full B12 rerun.
- Recommended next task: run the same reviewer benchmark on the Firewalls PDF
  to test whether the B3 generation structure and B4 semantic verifier
  generalize beyond Intro to IT Security.
- The Google service-account credential exposed during B3 requires authorized
  operational rotation. Do not inspect, print, copy, or commit the existing
  value while remediation is pending.
- Reviewer-core limitations are documented in
  `docs/ai/reviewer-core-capstone-acceptance-20260828.md`; notably, fresh camera
  and long-document device acceptance was not repeated, and a cold-start
  non-Canvas result conservatively loses its gallery/camera/PDF mode label when
  saved from Processing. Content and reopen behavior remain intact.
- Supabase warn-level advisors report only legacy non-Gap-B findings: four
  `reviewers` RLS init-plan performance warnings plus older function/Auth
  security warnings. No warning names the Gap B status/index/apply objects.
  Address unrelated findings only through separately scoped work.
- Physical-device acceptance debt remains for Product R6, readable camera OCR,
  the durable long-document Android matrix, and notification registration,
  delivery, and routing. Persisted Processing/relaunch recovery is accepted and
  does not depend on notifications.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.



## W2 mobile parity main integration (2026-10-11)

Owner requested `push to main`. Remote main already contains W1/W2 website
integration `7ef5a61`. The four scoped mobile commits are integrated as
`f308faf`, `55b7cd0`, `815631d`, `dc018c8`; the parity report is `2c022f4`.
**FRESH PASS** on the combined tree: web typecheck/lint and 82 tests;
mobile typecheck/lint and 793 tests (four existing lint warnings).
Main's newer task refresh is preserved. Documentation conflicts retain both
histories. Normal publication targets `origin/main`; no force push or manual
deployment. Original dirty website/main/mobile checkouts remain untouched.
Prior physical RMX3151 and viewport evidence is retained; neither was rerun
for this Git integration. Next: owner laptop/fullscreen review.

## W2 mobile parity and fresh acceptance (2026-10-11)

**PASS locally, including physical RMX3151 checks.** The existing W2 website
implementation was rechecked in `C:/Projects/stay-focused-v2-website` on
`website/functional-v1`: fresh web typecheck/lint, 79 tests and all 25 requested
page/viewport checks pass. Mobile parity is committed on `b25-3-3-ai-first`
in `b25-3-3-work`: Canvas other-space grouping, growing draft fields with
keyboard avoidance, and theme-aware/reduced-motion-safe clear-day states
(`b87fe54`, `e1f5f3d`, `f42c43f`, `9ec9fa1`). Fresh mobile typecheck/lint and
791 tests pass; lint retains four pre-existing test-file import warnings.
Physical local-debug acceptance used actual screens with isolated fictional
data: Canvas search/disclosure, draft growth/keyboard, light/dark Today with
system Reduce Motion on/off, and planning action pass. Device settings were
restored. Existing mobile docs/design edits remain untouched; evidence and
cross-repository state are recorded in the appended W2 handoff here. No API
change, push or deployment. Next: owner laptop/fullscreen review.

## W1/W2 main integration (2026-10-11)

Owner explicitly requested `push to main w1 w2`. The release merges W1/W2
tip `c05634f` with current main `6319376` in an isolated integration checkout.
It preserves main's canonical task/planner state, bounded content+grades sync,
minute resource refresh and capstone terminology while adding W1 completion,
shared free time and saved-plan clarity, plus all W2 layout/editor changes.
The planner regression now follows the canonical repository, including work
explicitly reopened in Canvas despite an old submission timestamp.

FRESH PASS: web 82 tests/12 files; focused API planning/experience 171 tests/9
files; root typecheck and lint 8/8 each, zero cached (four existing mobile
lint warnings). Root build also passes 8/8, zero cached. Browser acceptance
passes all 25 page/viewport checks, 10 light/dark Today captures, the four-page
desktop sweep, Canvas search/selection/bounded sync, draft persistence/guards,
and importing/completing an unlinked paper task in the canonical Tasks list.
Browser evidence uses isolated fictional data, not a new real-account run.
Unrelated dirty work and local evidence remain outside the release. This
entry supersedes the earlier local-only W1/W2 publication checkpoints below;
manual deployment and production acceptance are not part of this push.

## W2 website desktop layout (2026-10-11)

**PASS locally.** On `website/functional-v1`, the centered 1760px shell and
viewport-capped Today clock support laptop and fullscreen layouts. Library
cards fill equal-height rows; Canvas has course search and collapsible other
spaces; drafts have an outline and fields that grow with content; Today has
theme-aware clear-day illustrations. Fresh web typecheck/lint and 79 tests
pass. Isolated Playwright acceptance passed all 25 page/viewport checks,
light/dark Today checks, draft save/resize/guard flows and Canvas filtering
and selection persistence. Implementation: `e833536`, `3642654`, `2abe801`,
`5ae9b6b`, `7a520ba`, `14b12c4`. Evidence is in the appended W2 handoff and
ignored `tmp/w2-screens/`. No push/deployment. Next: owner review on laptop
and fullscreen; separately scheduled feature prompts remain outside W2.

## W1 Today/Schedule alignment and submitted-work filtering (2026-10-11)

**PASS locally, including all six real-account checks.** Branch
`website/functional-v1` now filters handed-in Canvas work from the shared
planner, completes unlinked Canvas/paper activities through one import-and-mark
helper, separates Overdue from today's schedule, shares date-specific free
time, and labels previews as unsaved with Save to schedule. Fresh API
typecheck/task-planning tests (32) and web typecheck/lint/tests (79) pass.
Two saved real-account blocks matched Today's preview and Schedule at
9:30–10:30 PM and 10:30–11:30 PM. Temporary sessions/plan metadata and local
preferences were restored; The 5 Why Analysis remains completed as instructed.
Implementation commits: `de3e99c`, `9d2ef46`, `1343428`. No push or deployment;
the production website still requires these changes to be released. Full
details and adaptations are appended to `docs/ai/handoff.md`. W2 layout,
Library/search/draft work and all excluded estimator/sync/gating work remain
outside this slice.

## Task and planner sync reliability (2026-10-10)

Owner-authorized scope: repair stale Tasks/Today/Schedule on website and mobile,
merge immediately, and publish the existing API, website and Android preview.

The canonical activity model now checks course selection, stored course end/state,
assignment availability and submission evidence for both clients and the planner.
Imported Canvas tasks retain their course identity and current assignment deadline.
Submitted work moves to Completed, is never overdue, and is excluded from planning;
planned sessions reflect the linked activity state. Deselected/ended courses and
orphaned imports do not return as personal tasks. Saved work is preserved.

Website Tasks consumes the complete canonical activity list; Tasks, Today and
Schedule expose explicit content+grades Sync now and poll persisted data every
minute. Per-course website sync now includes grades. Partial sync outcomes remain
partial. Android refresh admissions are bounded to one content/grades pair.
Opening Tasks/Today/Schedule does not create Canvas jobs; the existing once-per-load Generate refresh is preserved. Automatic five-minute Canvas polling
is still the separate, pending notification activation scope.

FRESH PASS: API 1,275 tests (3 skipped), focused final activity/planning regression
162 tests, web 69 tests, mobile sync/screens 68 tests, root production builds 8/8,
root lint 8/8 (four existing mobile warnings), root typecheck 8/8 (changed apps fresh;
unmodified packages cached). Read-only live database checks passed and found four
pending local imports with submitted Canvas evidence. Android preview OTA
25edeaae-9365-4ffa-acb2-f84123430983 is published for runtime 2.0.1.

API/website publication and main integration are being completed. Physical device
acceptance is NOT RUN: no ADB device or browser surface is exposed. See
[acceptance](ai/acceptance/task-sync-reliability-20261010.md).


## Website completion and main integration (2026-10-08)

Owner-authorized finite scope: finish Claude's pending web changes, verify the
website, publish it, and push to main. Existing API/mobile/database architecture
and unrelated working-tree changes are preserved.

PUBLISHED AND INTEGRATED INTO MAIN. Course Library, reviewer management and
selection tools, account menu, content identity and Schedule deadlines are
complete. Canvas refresh is explicit, bounded, owner-cancelled and honest about
partial admission or unknown polling outcomes. Fresh web tests 66/66, reviewer
route regression 9/9, web typecheck/lint and root typecheck/lint/build 8/8 pass.
Production deployment ca524a4 is READY. Live signed-in read, rename with reload,
delete confirmation Cancel, and desktop/mobile layout checks passed. The normal
main push was verified remotely; no force push. No paid generation or live
Canvas sync was submitted. See
[completion evidence](ai/acceptance/website-completion-20261008.md).

## Website production deployment (2026-10-08)

Owner-authorized: the V2 website replaces retired V1 on
`https://stay-focused-ten.vercel.app` (Vercel project `stay-focused`). The
project now builds `galaxymaxp/stay-focused-v2` from `apps/web`, and pushes to
`website/functional-v1` deploy production automatically. It uses the shared V2
Supabase project and the existing API (`stay-focused-v2-prototype`) through the
same-origin rewrite. Owner enabled web generation and Google/Microsoft sign-in;
V1 server secrets were removed from the project.

Shipped with it: V1-style desktop shell (sidebar, breadcrumbs, full-width
layout), Today with a right rail, side-by-side course materials, and motion
mirroring the mobile tokens. FRESH: web typecheck/lint/tests, both isolated
browser runs, production build, and live checks (API proxy 200/401, anon key
for the V2 project). NOT RUN: authenticated live use by the owner, live
generation and OAuth round trips. Preview deployments have no Supabase key
(`NEXT_SUPABASE_ANON_KEY` is production-only), and `main` now includes `apps/web`; preview authentication remains unconfigured.

## Website V1.1 orb parity (2026-10-08)

Owner-authorized scope: port the authoritative mobile WebGL orb, verify visual
and behavioral parity, preserve the functional website and commit scoped work
on `website/functional-v1`. Investigation at `6a8032a` found that the actual
mobile Generation route uses Animated plus layered SVG, with no WebGL renderer
or shaders in the inspected local sources. **BLOCKED** pending the actual
WebGL source location or owner resolution of that rendering requirement. No
replacement orb or runtime change was made. See [orb parity report](ai/acceptance/website-orb-parity.md)
for source mapping, baseline verification and remaining differences. Existing
V1 historical findings remain below; B25.3.3 stays paused and incomplete. No
production deployment, provider call, schema or generation-engine change.

## Website V1 owner-approved scope (2026-10-08)

The owner prioritizes functional website implementation immediately. B25.3.3
production compatibility investigation is paused; its PARTIAL/BLOCKED verdict,
reports, repairs, and blockers remain preserved and it is not complete. This
instruction supersedes earlier web exclusions for the finite website scope only.

Endpoint: implement and locally verify the nine requested browser surfaces in
`apps/web` over existing Supabase identity and shared API/workflows, record exact
blockers, and commit scoped changes on `website/functional-v1`. No production
deployments, migrations/data writes, PR #1 edits, or paid generation requests.
See `docs/ai/acceptance/website-v1.md` and ADR-019 for the acceptance matrix.

Task order: W1 auth/shell/Today; W2 tasks/calendar; W3 Canvas/generation/queue;
W4 Library/Reviewer/Quiz/settings; W5 browser, regression and root verification.
Continue independent work when live acceptance is blocked. Current result:
LOCALLY VERIFIED; W1-W4 functional client implementations and W5 browser,
visual, regression and fresh root TypeScript/lint/build checks pass. Live
acceptance remains PARTIAL/BLOCKED: dedicated non-production Supabase/API and
Canvas test access, plus a separate paid-generation allowance, are not established.
Generation is disabled by default. Run instructions are in `apps/web/README.md`.
Historical sections below are retained.

## Urgent Canvas sync and configurable email notifications (2026-10-03)

**PARTIAL — local implementation complete; production activation pending.** A protected five-minute metadata poll reuses the Canvas client/normalizers and canonical tables, with bounded requests, independent scopes and safe partial-failure handling. Assignment/announcement changes queue transactional, deduplicated email events; deadline reminders use due-date revisions, reliable submission/completion evidence and local reminder time. Settings saves global and per-type switches, reminder time and timezone. The linked Vercel project is Hobby with Fluid Compute, so the documented external trigger is one Google Cloud Scheduler HTTP job; this work adds no Cloud Run service. Migration `20261003025905` and the missing cron/Resend environment variables, verified sender, API/Mobile rollout, controlled production/device acceptance, and workload/backlog check remain required. No production data or emails were changed. [Architecture and setup](architecture/canvas-email-notifications.md).
