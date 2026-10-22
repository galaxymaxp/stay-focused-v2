# PBR-RT1: Android resume-text investigation

Date: 2026-10-22. **STOPPED at STEP 1, before implementation.** Local evidence
does not substantiate the actual FS7 missing-native-text cause; essential
physical reproduction/attribution is unavailable within this code-only task.
No product code or permanent regression tests changed. No fix is established.

## Baseline and acceptance matrix

Inspected branch `overnight/2026-10-15_feedback`, HEAD
`a4e5c4ccda1408f853db2e6a1f102b823a343ff0`, exactly as requested. Initial tracked
tree clean; untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and
ignored `tmp/` evidence are pre-existing owner artifacts, preserved/excluded.
Local upstream snapshot: HEAD 2 ahead / 23 behind `github/main`; no fetch.
Root AGENTS.md and AUTOPILOT.md apply; no nested policy found in affected paths.
PBR0 prerequisite is recorded PASS in `PBR0.status` and commits `bdd1c021` /
`a4e5c4cc`. Historical evidence is not current device acceptance.

| Requirement | Owning layer / existing evidence | Required proof | Investigation result |
| --- | --- | --- | --- |
| Exact FS7 failure | `c9cb867d:docs/ai/acceptance/fullsend-20261022-1512.md`, Live checks: first background/resume capture loses native text while orb stays visible; later follow-up complete at 54.9 s; 5 PASS / 1 FAIL | Repeated same-route observation with synchronized lifecycle/text/surface evidence and pinned binary/OTA | Historical PARTIAL; cause and exact disappearance/recovery interval unverified |
| Lifecycle | `design/theme.tsx`, `app-shell/AppLifecycle.tsx`, `DayOrb.tsx`: active means AppState `active`; listener cleanup and owner-gated recovery; existing AppLifecycle tests | Establish event ordering and rendered Text at failure, without service calls | FRESH JS probe retains complete Text and suspends GL work for inactive/background/unfocused; physical event ordering unverified |
| Navigation / Appearance | Root navigation theme, authenticated stack, tabs, `/settings` redirect to `/appearance`, `SettingsScreen` preference update; `navigationMotion.ts` | Actual route/focus and native view attach/detach at the failing instant | Source traced; Node cannot reproduce native-stack presentation |
| GL / replacement surface | `DayOrb.tsx` already rebuilds replacement context, resets first-frame load gate and preserves fallback; existing replacement/background tests | Correlate GL identity/presentation with native text loss; distinguish same/replaced context | Existing repair present; no duplicate repair justified |
| Native Text / clock | `DayRingClock.tsx` / `CenterReadout`: accessible native clock remains mounted; opacity 0 only after glass readiness; failure restores opacity 1. SVG ring labels and other page Text are separate | Prove which native labels disappear on screen versus capture, with native Text/view state | Source intent established; actual Android raster/compositor/font cause unproven |
| Fonts / theme / Reduced Motion | `clockFonts.ts` loads scoped Inter clock fonts with native font fallback; theme resolves system preference and tracks Reduce Motion | Attribute font availability, theme and motion to the observed failure | No source evidence that changing fonts/theme/navigation fixes FS7 |
| Existing coverage | DayOrb: first frame, atlas failure, draw failure, theme, reduced motion, background/resume, focus and replacement; ring-orb-spin: complete accessible clock and readiness fallback; AppLifecycle and navigationStructure | Relevant fresh diagnostic tests plus faithful reproduction where available | FRESH 65/65 across five existing files; additional ignored synthetic probe 8/8. No faithful Android reproduction |
| Minimal correction / regression | Only after concrete supported cause | A failing cause-specific reproduction and passing repair, preserving full text/state/features | BLOCKED by missing cause evidence; STEP 2/3 NOT RUN at mandatory STEP 1 stop |
| Required physical acceptance | Pinned Realme RMX3151 / Android 13, binary 2.3.0/code7/runtime 2.3.0-sdk57 and active OTA | Exact FS7 route/Appearance flow and ten resume cycles, screen versus capture, timestamps and sanitized native evidence | UNVERIFIED (owner to confirm); no device commands permitted |

## Source and release boundaries

Source manifest is deliberately 2.2.0/code6/runtime `2.2.0-sdk57`.
FS7 report pins source `26702858`, merged application `83f9474`, Android OTA
`01a162a3-6a63-7318-9a64-4b40789569a1`, runtime `2.3.0-sdk57`, on the existing
2.3.0/code7 binary. Newer report
`c0569007:docs/ai/acceptance/fullsend-20261022-1719.md` pins source `245380ea`,
application `acf9481`, OTA `01a16304-432c-703e-838e-c4ea04e4b3d9` on that same
binary/runtime. It proves narrower Appearance round trips with live GL and
glass time; it does not close FS7's broader missing-native-text failure.
Current installed binary/active OTA and all live service state remain
**UNVERIFIED (owner to confirm)**. No live check is attempted.

The relevant FS7-to-current source diff already contains `90383ef2`'s empty
first-frame reveal and `245380ea`'s replacement-context repair. The inspected
DayRingClock, AppLifecycle, theme and root layout paths have no intervening
diff against application `83f9474`. Installed local dependency source is an
investigation aid, not proof of the shipped APK's exact native dependencies.

## Investigation and verification

### Evidence examined without exposing private screen content

Read the exact two release reports from local Git, PBR0 audit (especially
390-407), current planning checkpoints, latest handoff, root policies and
ADR-001/011. `tmp/overnight/FS7.progress` and `FS7.status` repeat the original
5 PASS / 1 FAIL and 54.9-second follow-up, without cause-specific native
diagnostics. Top-level FS7 evidence here consists of those two files. The FS7
report locates its original captures/logs in the separate release clone's
`.local/fullsend-20261022-1512/`; neither that path nor the newer
`.local/fullsend-20261022-1719/` exists in this checkout. Those original captures
were not available in the inspected evidence and were not fetched elsewhere.

Prior `tmp/overnight/OX1-device/` captures/logs belong to the isolated SVG-square
diagnostic shell, not FS7's failing authenticated resume. Read-only inspection
of `graphics-filtered.log`, `isolation-graphics.log`, `interaction.log` and
`matrix.log` reported only byte/line counts and matches for lifecycle,
React-native Text and GL surface diagnostic markers. They contain no matched
AppState/host-resume/pause or ReactTextView/TextLayoutManager markers, and only
three GL/surface mentions in interaction.log. This bounded marker search does
not prove no native defect occurred. No screenshot or academic screen/source
content was printed or copied, and these artifacts cannot attribute FS7.

### Source attribution and its limits

- `ThemeProvider` tracks AppState and Reduced Motion, resolves palette changes
  and keeps children mounted. Appearance writes the existing preference; root
  navigation updates colors without a theme-key tree remount. The authenticated
  stack key is the owner ID. Tabs crossfade; pushed Settings/Appearance uses
  the existing native hierarchy. No evidence supports changing these semantics.
- `AppLifecycle` owns update/outbox/offline work and notification routing. It
  has no blanket native-Text opacity/removal path. Its services are mocked in
  diagnostic tests; no live recovery, authentication or provider flow ran.
- `DayOrb` gates running on both focus/live and AppState, wakes on reactivation,
  handles identical versus replaced GL contexts and resets loading on replacement.
  `DayRingClock` refreshes time every 30 s while active/focused. This timer is
  not evidence of the failure's duration. Native accessible time remains mounted,
  with complete number/period children; only its intentional GL-ready opacity
  changes. Other native page text and SVG labels are outside the GL clock.
- Installed Expo GL's Android `GLView.kt` is a non-opaque TextureView. Surface
  destruction destroys the GL context and resets surface-creation state. This
  explains why replacement callbacks matter, not why unrelated Text disappears.
  Installed RN `AppStateModule.kt` emits active on host resume and background
  on pause, with window focus emitted separately. `AppearanceModule.kt` handles
  native configuration changes. These are platform boundaries that Node stubs
  cannot execute. They do not justify a GPU, compositor, font or capture diagnosis.
- Local installed Expo 57.0.30, GL 57.0.2, Router 57.0.28, RN 0.86.3,
  screens 4.26.2 and Vitest 4.1.11 were read from package metadata. These are
  checkout dependencies, not a certification of the release APK's native graph.

### Bounded deterministic attempt

Ignored `tmp/overnight/PBR-RT1-probe.test.ts` composes the actual DayRingClock
and actual DayOrb, plus one public synthetic sibling Text label. Eight cases
cover initial dark/light, normal/Reduced Motion and clock fonts loaded/unloaded.
Each performs ten simulated inactive -> background/unfocused -> active/unfocused
-> active/focused cycles, flips resolved theme, alternates same/replaced GL
contexts, and checks complete clock Text/period/accessibility plus the public
label. Background/unfocused frames do not advance; successful presentation
hides only the intentional native clock fallback; a synthetic draw error
restores it. Unmount removes the listener and leaves zero timers. Final result:
**8 passed / 0 failed / 0 skipped**, 80 simulated cycles, not device cycles.

This uses React test renderer, controlled focus/theme/font flags, fake timers,
string native/SVG hosts, a stub atlas/GL/Three renderer and a simulated native
animation completion. It does not run Android Text rasterization, real font
loading, TextureView/EGL, native-stack attach/detach, Activity/window lifecycle,
SurfaceFlinger, screenshots or actual route/auth state. JS Text retention is
not proof of visible native pixels. Existing browser/software-GL tooling has
the same essential Android presentation gap; no browser run could faithfully
attribute this failure, so none was started. No native binary or emulator was
built, launched or installed. No ADB/device command ran.

The first probe attempt recorded **4 passed / 4 failed**: normal-motion cases
asserted GL-ready opacity before React's reveal effect timer was advanced.
The harness was corrected to flush effects in one `act` and advance their
timers in the next; all original assertions remain. The unchanged product then
passed 8/8. This is a deterministic harness scheduling error, not reproduced
FS7 text loss or a product repair; both attempts/logs are retained. Existing
Vite CommonJS/native-loader and react-test-renderer deprecation warnings remain.
One exploratory Windows wildcard `rg` path was invalid; a directory with an
explicit `-g '*.test.ts'` filter corrected it. Broad inventories were narrowed
after output truncation. No assertion, gate or repository configuration changed.

### Exact gate ledger

All executed test commands ran serially via ignored
`node tmp/overnight/PBR-RT1-investigate.cjs [--probe]`, using inspected PBR0
loopback-only Node network protection, repository-local TEMP/TMP/TMPDIR,
Expo offline/telemetry disabled, Next/Turbo telemetry disabled, npm offline
and Turbo cache restricted to `local:rw`. No Turbo task ran or cached result
was reused. These are test-runner wall times, not application latency.

| Exact command / check | Result and evidence label |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --config tmp/overnight/PBR-RT1-probe.config.ts --maxWorkers=1` | FRESH first attempt exit 1: 4 passed / 4 failed / 1 file (8.641 s); corrected harness exit 0: 8 passed / 0 failed / 0 skipped / 1 file (6.979 s) |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/DayOrb.test.ts src/features/redesign/ring-orb-spin.test.ts src/app-shell/AppLifecycle.test.ts src/navigation/navigationStructure.test.ts src/design/TabPressButton.test.ts --maxWorkers=2` | FRESH PASS, exit 0: 65 passed / 0 failed / 0 skipped / 5 files (3.447 s) |
| `git diff --check` | FRESH PASS, exit 0 after final documentation edits |
| `git diff --cached --check` | FRESH PASS, exit 0 on the exact staged documentation for each commit |
| Documentation paths, sequence, historical-content and owned-scope validation | FRESH PASS; five owned Markdown paths only across the documentation checkpoints |
| `npm run typecheck -- --force` | NOT RUN: mandatory pre-implementation STEP 1 evidence stop; no runtime changes |
| `npm run lint -- --force` | NOT RUN: same evidence stop |
| `npm run build --workspace @stay-focused/api` | NOT RUN: same evidence stop; no API changes |
| `npm run build --workspace @stay-focused/web` | NOT RUN: same evidence stop; no web changes |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: same evidence stop; inspected script is `expo export`, not a native release build |
| `npm run build -- --force --concurrency=1` | NOT RUN: same evidence stop |
| Full mobile/shared/API/web suites | NOT RUN: only proportionate investigative suites at the required pre-implementation stop |
| Cause-specific fix/regression acceptance | BLOCKED: no substantiated missing-native-text cause; passing diagnostic mocks do not close the task |
| Rollout; Device checks | NOT RUN: skipped entirely by unattended rules |

Final diagnostic executions total **73 passed / 0 failed / 0 skipped across
6 files** (65 existing tests plus 8 synthetic probe cases); the earlier 4/4
attempt remains recorded separately. No observed flake or product-test failure.
Logs/config/probe/results stay ignored under `tmp/overnight/PBR-RT1-*`; no tmp
artifact is staged. Historical PBR0 full gates remain historical, not reused.

## Stop decision and finite roadmap

The prompt requires: "If essential physical-device reproduction/attribution
evidence is unavailable, or the local reproduction cannot substantiate the actual
missing-native-text cause, STOP PBR-RT1". Both apply. STEP 1 is partial;
STEP 2/3 are NOT RUN. No speculative remount/timer/redraw/font/navigation/GL
change is made. FS7 stays PARTIAL, PBR-RT1 is **STOPPED**, and every dependent
task is held. The live-state UNVERIFIED entries alone did not cause this stop.

Runner BACKLOG's "PBR execution 2026-10-22" freezes:
`PBR0 -> PBR-RT1 -> PBR-MB1 -> PBR-LP1 -> PBR-AS1 -> PBR-LR1`.
Only PBR-RT1 executes here. The four later IDs are approved roadmap only,
not queued/started/completed. A predecessor must actually PASS and undergo
fresh authorized supervisor review before the dependent task is published.
Older conditional PBR1-PBR5 categories are not these execution IDs.
Pending OX2/OX3/OX4/QI1/LC1, held parity and Owner Pause remain intact.

## Owner steps remaining

- **Exact owner question (recorded only, no unattended question sent):** On the
  pinned Realme 2.3.0/code7 binary, what exact FS7 route order, background dwell,
  Appearance/system-theme state and active OTA reproduce the missing native
  labels, and do the same labels disappear on the physical display as in the
  simultaneous capture? Supply synchronized sanitized AppState/focus,
  Activity/window/surface/context and Text/view/font/error evidence around the
  first failure and recovery so the cause can be isolated before choosing a fix.
- **Device checks: NOT RUN.** Under separate owner authorization, record model/
  OS, binary/build fingerprint and active update/runtime/channel. Distinguish
  historical FS7 update `01a162a3` from newer `01a16304`; do not silently install,
  switch OTA, force-stop or reset data to reproduce. Recover the original route
  order/dwell from original FS7 evidence first; its report does not specify all
  timings. Repeat that exact flow and ten background/foreground cycles, including
  same-route resume, Today/standalone Generation round trips without submission,
  and Settings > Appearance > Today separately. Cover Light/Dark/Automatic and
  normal/Reduced Motion; record native page/tab labels, SVG ring labels, native
  clock fallback and GL clock independently. Observe on-screen versus capture
  at resume and bounded follow-ups (for example 1/5/15/30/55 s), with actual
  timestamps and first/last observed failure, not an invented 54.9 s duration.
  Use a public/empty diagnostic state, crop/redact private content and never
  collect academic text, tokens or credentials. Native layer isolation, if
  needed, requires separate authorization and must preserve input/scroll,
  offline/task/quiz state, pending plans and source completeness.
- **Rollout: NOT RUN.** Review scoped documentation and new native evidence
  before any retry or later task. No fix exists to publish. All deploys, native
  release builds/installation, OTA/EAS, pushes, remote SQL/migrations, providers,
  email/Scheduler/account/credential operations remain unperformed.
- **UNVERIFIED (owner to confirm):** current installed/active build and OTA,
  actual failure cause/recovery interval, screen-versus-capture attribution,
  broader authenticated native/web acceptance, live revisions/database/regions/
  queues/Scheduler and physical latency/GPU/font/compositor metrics. No production
  or device performance claim follows from local test timing.
- Vercel CLI is unavailable; strongly recommend `npm i -g vercel` for future
  separately authorized env/deploy/log tooling. Installation and all Vercel
  commands NOT RUN here. No environment file was touched, no external service
  contacted, and owner artifacts and all prior evidence are preserved.

Commits: scoped `docs(perf): record PBR-RT1 native-text evidence stop`, followed
by a handoff checkpoint recording its exact hash. Final exact commit hashes
are in Git and `tmp/overnight/PBR-RT1.status`; no commit embeds its own hash.
