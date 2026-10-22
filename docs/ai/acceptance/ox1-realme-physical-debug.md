# OX1 — Realme physical debugging (2026-10-22)

**Physical square cause CONFIRMED; source repair and isolated-device square
acceptance PASS.** This is a separately owner-authorized follow-up to the earlier
OX1 STEP 0 stop. It does not change `OX1.status`, the earlier acceptance report,
Owner Pause, or the supervisor queue. No OX2, FULLSEND, push, production service
mutation, deployment, OTA, paid remote build, release installation, uninstall,
or app-data clear was performed.

## Baseline and finite scope

- Checkout: `C:\Users\Fely Max Dilinila\Documents\Projects\b25-3-3-work`.
- Branch: `overnight/2026-10-15_feedback`; starting HEAD `bcef0477`.
- Tracking comparison at start: 1 ahead / 17 behind local `github/main`.
  No fetch, merge, checkout or push. Existing author identity retained.
- Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.
  Project mirror `sources/` was not edited.
- Authorized endpoint: reproduce on the Realme, isolate the responsible layer,
  correct it, validate physically, run regressions/gates, document and commit
  locally. Release review remains the owner's next action.
- Root AGENTS.md, AUTOPILOT.md, current planning, latest handoff and previous
  `ox1-orb-compositing-integrity.md` were read. Historical unattended restrictions
  do not supersede this new explicit physical-debugging authorization.

## Device and installed application — FRESH

- ADB connected serial `PB6DWWEIHAUCMZOR`, model **RMX3151**, Android **13**.
- Physical display **1080×2412**, density **480**.
- Installed release: `com.galaxymaxp.stayfocusedv2`, **2.3.0 / versionCode 7**;
  last update 2026-10-22 01:21:40, existing first install retained.
- GPU: **ARM Mali-G57 MC2**, OpenGL ES 3.2,
  `v1.r32p1-01eac0.153dd559bd98e32a0f9720a723652aba`.
- Source dependencies: Expo 57.0.30, expo-gl 57.0.2, RN 0.86.3,
  react-native-svg 15.15.4, Three 0.166.1. The release's documented Expo patch
  difference remains; the diagnostic APK reuses the installed release's actual
  native binaries. It does not substitute browser SVG or software WebGL.

All evidence below is **uncommitted**, under `tmp/overnight/OX1-device/`.
Screenshots can contain personal UI; none is staged or committed.

## Reproduction and confirmed cause

The square is visible both on the owner's supplied phone image and in ADB's
`before-initial.png`, `before-delayed.png` and the final unchanged-release
control `release-restored.png` (also saved as `before-dark.png`). It also surrounds the Queue button's tiny orb, whose
implementation uses **only OrbPoster**, with no GL view. It is therefore present
in captured pixels, rather than solely in the physical display compositor.
The initial release palette was green; controlled isolation used violet.

`OrbPoster.tsx` declared an SVG viewport `0 0 100 100`, with physical width and
height equal to the sphere diameter. Its circular spill has center (50,50),
radius 72 for the clock or 85 for standalone: its bounds extend beyond that
viewport. `overflow: visible` worked in browser SVG, but Android's installed
`react-native-svg/.../SvgView.java` creates an ARGB_8888 backing Bitmap with the
declared width and height. The outlying gradient is cut at the bitmap edges.
This truncation makes a colored square around the otherwise circular sphere.

| Physical isolated configuration | Observed result |
| --- | --- |
| Unmodified OrbPoster, SVG only, no GL surface | Same square (`isolation-poster-original.png`) |
| Same body and spill, padded SVG viewport and bitmap | Square disappears; soft spill retained (`isolation-poster-padded.png`) |
| Body circle only, spill removed as a diagnostic | No square (`isolation-body-only.png`) |
| Actual live DayOrb, body + aura + clock composite | No square (`isolation-clock.png`, later atlas-corrected flow captures) |
| Corrected source OrbPoster | No square (`after-dark.png`, `after-light.png`) |

The installed expo-gl TextureView is non-opaque, clears transparent black and
requests EGL alpha. The earlier premultipliedAlpha browser/native difference
was inspected but is **not the demonstrated cause**. The body, ambient capture,
clock render target/composite, load gate, 0.6 render scale and Animated crossfade
were inspected and left unchanged. No rectangular GL alpha output was needed to
reproduce the defect. Filtered graphics logs retain EXGL pixelStorei capability
messages; no fatal graphics error was observed in the final flows.

Pixel comparison on identical native violet poster scenes samples the former
left bitmap edge at x=180, y=790..890: maximum adjacent RGB jump **30 → 1**,
mean **20.77 → 0.50**. A sample beyond the old bitmap changes from black to
RGB (15,14,18), confirming that the repair retains external light. Sampled
sphere interior maximum difference is 2 levels, mean 0.63 (raster rounding).
See `pixel-comparison.json`, `isolation-contact.png` and full PNGs. These are
bounded samples supporting the visual inspection, not universal pixel proof.

## Source correction

Changed runtime file: `apps/mobile/src/features/generation-core/OrbPoster.tsx`.
It reserves the original size as the caller's layout footprint, then centers an
absolutely positioned, larger SVG inside it. Its viewport includes the entire
spill plus one transparent SVG unit on every side: clock extent 146, standalone
172. The body remains exactly 100 units / the requested diameter. Palette,
gradient stops, opacity, synchronization, touch targets and theme resolution
remain the existing implementation.

No black backing, circular clipping mask, dependency patch, shader/blend change,
web renderer change, frame timer or new GPU render pass was introduced.

Regression file: `apps/mobile/src/features/generation-core/OrbPoster.test.ts`.
Eight cases cover both variants, both themes and Queue/large sizes (26/240pt).
They require the whole spill to lie strictly inside the native viewport, its
edge to end at zero opacity, and the sphere's diameter/center/layout footprint
to be preserved. The original viewport fails that containment requirement.

Tested source SHA-256:

- OrbPoster.tsx: `090abd740e2bf002505305b79351cb18ea129877594ebb105a2492953c5e600a`.
- OrbPoster.test.ts: `10764c21497c7c0b5d9506c888ae81ac00a524b8e17934091b0160a2dd2a59cb`.

## Non-destructive native test method and limits

The installed release was pulled read-only. Local diagnostic APKs reuse its
native binaries and contain locally bundled source components. They use a
separate package **`com.galaxymaxp.stayfocusedv2.ox1physical`**, separate provider
authorities/resource namespace, debug signing and **disabled Expo Updates**.
Neither release credentials nor owner authentication data were copied.
`repack.py`, the bundles and signed APKs remain ignored local evidence.

The isolation entry uses the real OrbPoster and DayOrb. The flow entry uses
real DayRingClock and GenerationCore, real ThemeProvider/palette storage and
Expo Router's bundled native bottom-tab navigation, with empty local timeline
data and no backend calls. This establishes the native rendering/focus/AppState
paths in an **offline diagnostic shell**, not the authenticated production
Today/Generate routes or backend behavior.

Two packaging adaptations are explicit: dev-server asset metadata was normalized
to embedded resource paths, and the clock atlas's localUri in the ignored test
bundle was directed to a byte-identical PNG pushed to that diagnostic app's own
external-files directory. Before the latter adaptation the helper's clock glyphs
were missing; those early frames are excluded from typography acceptance.
Source atlas upload/rendering code and all shaders were left unchanged. The
atlas-corrected captures visibly show glass time in the live native clock.

The first older `.w2verification` development APK could not run the current JS
runtime; it is not acceptance evidence. A fresh local Gradle attempt passed
plugin compilation after repairing a Windows selector/socket configuration,
then was interrupted while provisioning an uncached NDK. No remote native build
was submitted. The reused-native diagnostic APK and fresh Android HBC export
provide the device/build evidence; a clean Gradle APK rebuild is **NOT COMPLETED**.

## Physical acceptance — FRESH

| Requirement | Result and evidence |
| --- | --- |
| Reproduce actual release square | PASS; before-initial/delayed and release-restored PNGs |
| Attribute root cause to a specific layer | PASS; SVG-only / padded / body-only isolation above |
| Corrected poster transparent margin and external aura | PASS; after-dark/light/light-gold PNGs, pixel samples |
| Purple, gold and pearl in both themes, both renderer surfaces | PASS; 12 `after-flow-{dark,light}-{gold,pearl,violet}-{today,generate}.png`; visually inspected `matrix-contact.png` |
| Glass clock typography | PASS in atlas-corrected live capture `after-flow-fileatlas.png`; plain text retained on fallback |
| Ten Today → Generate → Today cycles | PASS in offline native shell; 20 cycle PNGs and `matrix-results.json` |
| Background → foreground | PASS for square/complete orb; `after-resume.png` |
| At least 30 seconds stable appearance | PASS for square; `after-stable-30s.png` and bounded performance sample; Reduced Motion captures recorded separately |
| Tap palette and held rotation | PASS; interaction-before/after-tap/after-rotation PNGs; tap changes violet to orange and the native glass pose responds |
| Reduced Motion | PASS; Remove animations enabled through system Accessibility UI, stable for 31 seconds, then restored |
| Loading/route frames | Corrected poster remains complete; physical recording retained; bounded frame review is not a guarantee over every frame |

Surface destruction during route/background/theme transitions can invoke the
existing final static fallback; it remains responsive to palette/theme changes
and no square reappears. This task preserves that behavior. It does not claim
that animated GL automatically recovers from every destroyed surface.

Recordings: `before-device.mp4` and `after-navigation-device.mp4`, captured via
scrcpy's ADB encoder. Direct `adb shell screenrecord` was inaccessible on this
Realme; no recording was falsely claimed from that failed command. UI actions
used bounds from fresh UIAutomator XML, including the orb-touch resource ID.

## Regression and build ledger

All commands below are **FRESH**, exit 0, with logs and exact durations in
`gates.json` / `gates-progress.log`. Root gates each report 8/8 tasks, 0 cached.
Existing six lint warnings (five mobile import ordering, one web unused import)
and Vite config-loader notices were retained, not suppressed or weakened.

| Exact command | Result |
| --- | --- |
| `npm run test -w @stay-focused/mobile -- src/features/generation-core/OrbPoster.test.ts src/features/redesign/DayOrb.test.ts src/design/QueueButton.test.ts --maxWorkers=1` | 37/37, 3 files; includes 8 new regression cases |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached; 47.811s wrapper |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 84.947s |
| `npm run build -- --force` | 8/8 tasks, 0 cached; 138.073s; API 37 pages, web 23 pages, Android/iOS HBC + web exports |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | 696/696, 72 files; 17.288s |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | 1641/1641, 172 files; 58.568s |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 569/569, 75 files; 261.583s |
| `npm run build --workspace @stay-focused/web` | 23/23 pages; 44.751s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | Android HBC export PASS; 78.891s |
| `git diff --check` | PASS, followed by final staged hygiene check |

Full suites total **2,906 passed / 0 failed / 0 skipped**, across 319 files.
The 37 focused cases overlap the full mobile suite and are not added again.
The shared count includes the checkout's existing compiled test copies (348
source cases plus their compiled copies), consistent with earlier local gates.
API tests are NOT APPLICABLE to this source-only native layout repair. Root API
typecheck/lint/build still ran. Build-generated next-env/expo-env changes and
temporary entry/native config changes were restored; only task-owned paths are
staged. No meaningful assertion or production config was weakened.

## Performance and remaining boundaries

A bounded post-change native Today sample reports 310 rendered frames,
5 janky frames (1.61%), p50/p90/p95/p99 **13/14/15/18ms**, GPU p99 **12ms**
(`perf-30s.txt`). It is observational, not a matched before/after benchmark or
battery acceptance. The GL code/cadence/render scale is unchanged. The static
SVG's pixel area increases by 2.13× for clock and 2.96× for standalone, bounded
by the original body size; it adds no animation loop. Tiny Queue allocation
also includes the complete spill. Long-session memory/battery testing remains
outside this bounded physical run.

Remaining boundaries: original release intentionally still contains the defect
until an owner-authorized release; clean native Gradle rebuild uncompleted;
authenticated production navigation/backend and long-duration battery/memory
are not established by the offline shell. Existing surface-loss fallback behavior
is preserved. OX2 and release sequencing remain supervisor/owner decisions.

## Final device/restoration checkpoint

Reduced Motion was exercised through Accessibility → Vision → Remove animations.
The original setting was Off (`transition_animation_scale=1`). The shell's
attempt to write that setting was denied with WRITE_SECURE_SETTINGS; no
permission was granted or bypassed. The normal Settings UI successfully toggled
it On (`0`) for the test, then Off (`1`) afterward. The orb/ring crop
(60,335)-(1020,1295) has **maximum RGB difference 0** between the two captures
31 seconds apart. The idle gfxinfo interval reports **0 frames**, so its empty
histogram's 4950ms percentiles are not interpreted as latency.

Tap changes violet to orange, including the tiny header poster; the held move
changes the live glass pose. Those final images were visually inspected.
`interaction-results.json` records the completed checks. The initial scripted
settings-write attempt failed and its original `interaction.log` is retained;
the later UI-toggle evidence, not that failed script, establishes Reduced Motion.

The release's **Automatic** theme was restored and selected=true was verified
in `ui-release-theme-final.xml`. OS animation scale is again **1**. Release
version/code, original first-install and last-update timestamps are unchanged;
the original green palette remains. The phone returns to the original release's
Today screen. `release-restored.png` intentionally still shows the old release's
square: the corrected source was installed only in the separate diagnostic app.
The first incorrectly named before-dark capture was actually light; it remains
as `before-dark-first-light.png`. The initial before-light capture showed Settings;
it remains as `before-light-first-settings.png`, replaced by the actual Today
light control. Neither mislabeled first attempt is used as dark acceptance.

Local tooling, APK helpers and evidence remain ignored. The historical
`tmp/overnight/OX1.status` is untouched (final SHA-256
`612294e3a36a0b4652a7ab8111a082962a0d171081f18059e7342621a2a9ea8e`).
The scoped local commit is reported after creation; this report does not rewrite
the earlier stopped run's status.
