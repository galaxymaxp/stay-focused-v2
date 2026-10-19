# GL1 glass clock acceptance

Finite unattended scope: Today readout on mobile and web, committed Inter and
build-time atlas, shared layout/compositor, fallbacks/accessibility, local
tests/screenshots/gates/docs/commits. Baseline ec9ddbf9 on
overnight/2026-10-15_feedback. Rollout/device work is excluded.

| Requirement | Owning layer | Proof needed | Result |
| --- | --- | --- | --- |
| Build-time Inter atlas, all required glyphs and license | Build | Generator + committed asset tests | FRESH PASS |
| Tabular layout, suffix scale/baseline, unknown/empty text | Shared | Unit tests | FRESH PASS |
| One shared refraction shader in existing orb GL view | Shared/both apps | Renderer tests + local browser | FRESH PASS |
| Idle time centered, no weekday; drag label/time/sub | Both apps | Mounted tests + browser screenshots | FRESH PASS |
| Accessible real time, Inter plain fallback | Both apps | Mounted tests + browser failure cases | FRESH PASS |
| Reduce Motion and unchanged idle cadence | Both apps | Local browser + loop inspection | FRESH PASS |
| Brightest-tone readability at 1440/390, light/dark | Web | Local Playwright screenshots | FRESH PASS |
| Frame cost before/after | Web | Local renderer.info/timing measurement | FRESH PASS |
| All prompt gates and forced root build | Repository | Exact counts, freshness, failures | FRESH PASS |
| Rollout/physical Realme | Owner | Separate owner work | NOT RUN |

STEP 0: no GL1 progress or committed work existed; tracked entry tree clean.
Untracked UI/, apps/mobile/.gitignore, supabase/.temp/ preserved. Cached
upstream: ahead 63/behind 2; no fetch. Read newest WGP2/OR4/OR3b handoffs,
OR3 preflight, current planning, AUTOPILOT and ADR-048. OR3b resolves the old
OR3 friction STOP. WGP2 retains the existing DayOrb scene/render loop.

Both canvases are centered at CLOCK.center and cover the readout: mobile
canvas = 204 / DAY_ORB_FILL (~315 points) before scale, with RENDER_SCALE 0.6
on the same GLView, visually scaled back up. Web uses the same geometry.
No second GL view is needed. Idle FRAME_MS is 80 on both platforms; interaction
uses 16ms. expo-font 57.0.4 exists in node_modules, is an Expo dependency and
is listed in bundledNativeModules; no new native module or APK change is
needed. The exact deployed native revision is UNVERIFIED (owner to confirm).

msdf-bmfont-xml 2.8.0 installed cleanly (104 packages); its bundled Windows
msdfgen generated the atlas successfully. Blank space has advance but no
bitmap, as expected. Inter TTFs/OFL come from the npm tarball
@expo-google-fonts/inter 0.4.2 (Inter Project Authors); no Google service call.
Both app copies are identical. No runtime atlas generation.

## Implementation and adaptations

The shared renderer subpath keeps Three out of the normal shared barrel. Both
platforms execute one shader. Orb -> half-float target -> one composite render
pass (base + glyph quads) adds two draw calls to the original one. A small
preallocated buffer changes with text/size; the atlas never changes. Five blur
taps, SDF-gradient refraction, directional light edge, dark inner rim and white
tint provide the glass. Bright-pearl evidence required stronger tint/scrim.
The scrim alpha covers the page seen through the translucent orb, and the
fallback's existing CSS scrim remains. No second GL view or animation loop.

Mobile keeps RENDER_SCALE 0.6, 80ms idle/16ms interaction cadence, AppState and
focus handling. Existing expo-font loads only the readout's Inter files.
Existing expo-asset/Expo GL decodes/uploads the bundled PNG using the installed
native implementation's supported localUri pixels slot. Web retains deferred
Three loading; changing the time cannot repeatedly cancel its two-frame load.
Reduce Motion loads a renderable glass pose and stops ambient frames. A dirty
time redraws on the next frame without the idle throttle. There is no shimmer.

Both apps remove the weekday, center idle time, preserve drag labels/time/sub,
and retain real accessible time text while GL digits are decorative. Fallback
text remains white Inter before GL readiness, with the PNG/still orb, on atlas
or float-target failure, and after shader/draw failure or web context loss.
Generation passes no clock prop and retains its existing render path. All
product changes have web/mobile parity; only native PNG/font loading and web
context events/deferred chunk loading differ by platform. No product skip.

ADR-049 and the design readme/typography token comment record the owner-approved
Inter and decorative clock-glass exceptions. Global font/color tokens do not
change. No separate ways-of-working file exists in this checkout.

## Local evidence

- Pure layout/asset tests: FRESH 5/5. Compositor target/pass/buffer/disposal and
  unsupported-float tests: FRESH 2/2. Generator repetition: FRESH PASS, no diff.
- Native renderer lifecycle/failure/Reduce Motion: FRESH 14/14. Clock/screens
  focused run: FRESH 103/103. Web existing orb/ring/deferred run: FRESH 14/14;
  added deferred-clock checks finish FRESH 6/6. Final full suites below supersede
  these focused counts.
- Real local Chromium/SwiftShader uses the actual DayRingClock, DayOrb, CSS,
  Inter assets and shared shader. No auth/source/server fixture is needed;
  every non-loopback browser request is aborted. Screenshots are local only.
- Eight screenshots: tmp/overnight/GL1-screens/{1440,390}-{light,dark}-{idle,drag}.png.
  They show bright noon pearl and a held 3:30 PM start-handle drag. The test
  checks label/time/sub, accessibility tree, font fallback, GL/atlas failures,
  context loss, and absence of idle frames under Reduce Motion.
- The contrast test compares each glyph with the exact same rendered backdrop
  after hiding only its glyph mesh. It samples MSDF solid strokes, excluding
  fringe, and checks their 75th-percentile contrast: >=3 for large digits and
  >=4.5 for the small suffix. This is a local raster regression, not a complete
  WCAG audit or every antialiased pixel. Exact results live in
  tmp/overnight/GL1-screens/contrast-{light,dark}.json.
- renderer-cost.json records 24 warmed baseline frames and 23 glass frames:
  1 -> 3 draw calls/frame; median interval 83.3 -> 83.3ms; median render
  submission 0.2 -> 0.3ms; p95 0.5 -> 0.4ms in the initial full measurement.
  Final gate measurements overwrite the same file. These are CPU submission
  timings under software WebGL, not GPU completion or Realme performance.

## Failed first attempts and repairs

- First focused native clock/screens: 88 passed / 15 failed. The screens test
  mock lacked the newly used native Text export. Added Text, preserving all
  assertions; rerun 103/103.
- First browser suite: 0 passed / 8 failed; its init script accessed the HTML
  root before it existed and therefore skipped the fixed date setup too.
  Deferring theme sync to DOMContentLoaded fixed it; next run 8/8.
- A later visual run: 6 passed / 2 failed because the existing introductory
  dial spring briefly read 11:59 AM before settling at noon. The harness now
  waits for the expected time and the existing spring to settle before its
  assertions/screenshots. No production assertion or animation was removed.
- First contrast run: 9 passed / 1 failed. Light-theme solid strokes measured
  2.80 for 1, 3.23 for P and 2.15 for M. Stronger soft scrim/tint and sharper
  antialiasing raised them above the unchanged thresholds. The focused contrast
  rerun passed 2/2 (8 filtered tests, not new permanent skips).
- Draft forced typecheck: 6/8 successful, mobile failed on an ElementType
  comparison to the test host name Copy; one task was cancelled. Used String
  for the host-name comparison. Final forced typecheck passed 8/8.
- Draft lint passed 8/8 with 11 warnings (6 existing, 5 introduced by mock
  import placement and an effect cleanup ref). Fixed all introduced warnings;
  final forced lint returns to 6 existing warnings, 0 errors.
- First new deferred-clock fixture run: 5 passed / 1 failed. Inserting tests
  before the old module-load assertion populated its cached mock too early.
  Preserved the existing test ordering/assertions; rerun 6/6.
- Several edit-script patches failed to match exact text and changed no files;
  one lock audit launch hit PowerShell node -e quoting. Reissued through a
  local script. Lock audit: no existing package version changed; npm deduped
  nested helpers and added the atlas tool. No runtime provider was contacted.

All logs/scripts/screenshots remain under ignored tmp/overnight. Full gate
failures/flakes, if any, and the final exact counts are recorded below.

Final review follow-up: e00dd0ea removes a context-lost web canvas before
rendering the static orb. Otherwise its old height could push that fallback
below the clock. The strengthened local browser regression confirms no canvas
remains and the fallback stays inside the orb bounds (FRESH focused 1/1).
The full web suite and forced root build are repeated after this repair;
all subsequent evidence applies to this final implementation tip.

## Final outcome and exact gates

**PASS for the finite unattended local code scope.** All code/tests, all 10
prompt gates, the additional forced root build, docs and scoped local commits
complete. Implementation tip e00dd0ea on overnight/2026-10-15_feedback;
documentation-only closure follows. Every workspace has a test script.

| Exact command | FRESH result |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; closure repeat |
| `npm run lint -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; closure repeat |
| `npm run test --workspace @stay-focused/shared` | PASS 632/632 tests, 64 files; post-build repeat |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS 2452 passed / 3 intentional live skips, 213 files |
| `npm run test --workspace @stay-focused/mobile` | PASS 1587/1587 tests, 166 files |
| `npm run test --workspace @stay-focused/web` | PASS 451/451 tests, 67 files, including 10/10 clock browser checks |
| `npm run build --workspace @stay-focused/api` | PASS 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | PASS 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS local Android export |
| `git diff --check` / `git diff --cached --check` | PASS, 0 whitespace errors (closure checked again before commit) |
| Additional `npm run build -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; local exports only |

Loose Turbo environment mode preserves the ignored outbound HTTP(S)/fetch/
socket guard. API live flags are disabled, Expo is offline and telemetry is
disabled. Temporary directories stay inside the repository. No live provider
or workflow contract suite applies to this UI-only change. The final gate
sequence passed; earlier forced typecheck/focused failures above are retained.
A documentation diff
check caught one extra EOF blank line in the design readme; it was removed.
No nondeterministic flake remained. Builds regenerated the API/web next-env
declarations; both generated-only diffs were inspected and restored.

The first shared gate passed 625 tests/62 files. The final post-build run
passed 632 tests across 64 files because the repository also collects emitted dist
test copies; no assertion or suite was removed. Final forced typecheck/lint
were repeated after the last deferred-loading test/change and build outputs.

Final renderer evidence: baseline 24 vs glass 23
warmed frames; draw calls [1] -> [3];
median interval 83.4 -> 83.5ms;
median CPU submission 0.20 -> 0.30ms;
p95 0.30 -> 0.40ms. Minimum sampled
solid-stroke contrast: light 7.08:1, dark 11.42:1. These
measurements remain local software-WebGL evidence, with the limits above.

Commits (all --author="galaxymaxp <omgraythekid@gmail.com>", no attribution trailers):

- c4329a3f build: clock glyph atlas from Inter
- 2afd2e41 feat(shared): add clock glyph layout and glass compositor
- 18e2967c fix(shared): preserve glass clock contrast over translucent orbs
- dec26802 feat(mobile): render Today time as glass in Inter
- cba28643 feat(web): render Today time as glass in Inter
- e00dd0ea fix(web): keep the orb fallback in place after context loss
- docs: GL1 glass clock handoff (final hash in Git and GL1.status)

**UNVERIFIED (owner to confirm):** deployed website/mobile/API revisions,
the exact installed APK's native module inventory, real GPU/Realme timing and
physical appearance/accessibility, applied remote migrations and Scheduler
state, and remote-ref freshness. Local Expo dependency/autolinking evidence
requires no new native module or APK change. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, deployment, remote SQL/migration application, Scheduler
operation, email, environment-file edit, branch switch or push occurred.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** publish the website and mobile OTA
  through the existing owner release process. No API/database change is needed
  by GL1; prior slices retain their own pending release work.
- **Device checks - NOT RUN, skipped entirely:** website and Realme current
  time and dragged time look like glass, respond to orb rotation/ripple/color,
  stay readable in both themes, retain plain small Inter labels, and show no
  weekday. Check dragging without flicker, Realme frame cost/stutter/power,
  screen-reader time and the static/plain fallbacks. Reduce Motion must retain
  glass with no ambient motion or shimmer.
- Confirm the recorded UNVERIFIED items. For later authorized deployment/env/log
  work, strongly recommend installing the missing Vercel CLI with
  `npm i -g vercel`. No installation or invocation was made during GL1.

Ignored progress/status: tmp/overnight/GL1.progress and GL1.status. Expected
UI/, apps/mobile/.gitignore and supabase/.temp/ remain untracked and untouched.
No later roadmap task was started; the local GL1 endpoint is complete.
