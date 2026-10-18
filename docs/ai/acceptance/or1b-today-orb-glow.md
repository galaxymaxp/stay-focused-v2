# OR1b / BACKLOG P14: mobile Today outer glow

**PASS for the finite unattended code scope.** Implementation `8eca072`;
baseline `9f53e47` on
`overnight/2026-10-15_feedback`, 2026-10-18. The OR1b owner answers supersede
the historical OR1 preflight STOP at `7a70262`. Endpoint OR1b only; no OR2.
Rollout and device checks are excluded entirely.

## Cause and bounded preflight

Reused [OR1 source comparison](or1-today-orb-glow.md), rather than repeating
it. Existing shader, camera and host geometry already match the web. No
source evidence supports clipping, a smaller canvas or a covering readout.

The missing independent fallback glow is concrete: the PNG path had only an
Image. The live GL path relies entirely on an additive material over an
alpha-zero surface. The bounded additional inspection found that the installed
Three `WebGLState.js` uses `blendFunc(SRC_ALPHA, ONE)` for non-premultiplied
additive material: isolated low-alpha glow contributes alpha squared to the
transparent framebuffer. Expo Android `GLView.kt` sets `isOpaque = false`.
This gives a concrete alpha-attenuation mechanism, but does **not** prove which
path or compositor caused the owner's phone observation. Actual device cause
and any browser/native compositing difference remain **UNVERIFIED (owner to
confirm)**. A renderer or material switch cannot be established as a proven
device fix here, so no alpha override was made.

The owner explicitly authorized an independent static SVG halo either way.
`react-native-svg` 15.15.4 is already installed. No shader, render pipeline,
native module, dependency or ADR change is needed.

## Acceptance matrix

| Requirement | Owning layer / evidence | Result |
| --- | --- | --- |
| Soft outer glow on both GL and PNG paths | DayOrb SVG sibling before GL/Image; focused mounted component tests | FRESH PASS locally; physical appearance UNVERIFIED |
| Ball/host/layout unchanged | Existing size and DAY_ORB_FILL retained; mounted geometry test | FRESH PASS |
| Clear glass/readout and ring/handles | Transparent inner stops, fade before ring radius, existing overlays above orb | FRESH PASS locally; physical contrast/touch acceptance UNVERIFIED |
| No intercepted touches | SVG and enclosing host pointerEvents none | FRESH PASS |
| Existing day aura tone | Midnight/noon mounted tint updates; useMemo keyed by minute | FRESH PASS |
| Dark/light tuning | Peak alpha 0.35 dark / 0.16 light, zero edge | FRESH PASS locally; device tuning UNVERIFIED |
| Static Reduce Motion, inactive/live=false and fallback | Mounted GL initial-frame and failure tests, no Animated value/timer/extra frame loop | FRESH PASS |
| Mobile-only finite change | No web/generation helper/shader edits | FRESH PASS |
| Seven prompt gates plus forced root build | Local guarded commands | FRESH PASS, 7/7 commands plus 8/8 build tasks, 0 cached |

The halo is an absolute SVG layer, with no animation or effect. Its tint uses
the existing `dayOrbTones(minutes).aura`, memoized by minute and reused by the
existing scene runtime. The existing frame callback and scene settings are
unchanged. Reduce Motion and live=false retain the existing initial GL still
frame; the halo schedules no work. This proves no additional scheduled work,
not zero hardware cost to initially rasterize or composite a static SVG.

The peak sits just outside the glass (1.04 times its radius); the tail reaches
zero at 84% of the existing canvas radius, before the ring/handles. The center
stays transparent to preserve the readout. On devices already displaying GL
aura the two layers coexist; subtle appearance needs the excluded device check.

## Verification

FRESH focused `npm run test --workspace @stay-focused/mobile --
src/features/redesign/DayOrb.test.ts`: **7/7 passed, 1 file**, first attempt.
First forced root typecheck: **7/8 tasks passed, 0 cached**, mobile failed with
8 TS2345 diagnostics because mocked string host names are not React ElementType
values. The test now queries the typed imported GLView/Image/Stop components;
no casts or validation weakening were introduced. Second forced root typecheck:
**FRESH PASS, 8/8 tasks, 0 cached**. No runtime assertion failure or flake.
Source-discovery misses for incorrectly guessed test filenames were corrected
using rg; these were not test attempts.

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached on second attempt; first failure recorded above |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1446/1446 tests, 144 files |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 476/476 tests, 46 files (existing compiled copies included) |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1 Android bundle, 4266 modules |
| `git diff --check` | FRESH PASS, 0 whitespace errors; staged check also PASS |
| Additional AUTOPILOT `npm run build -- --force` | FRESH PASS, 8/8 tasks, 0 cached, including API/web builds and Android/iOS/web exports |

Commands run serially with the existing process-local Node external-socket
guard, Expo offline/no-telemetry and Next/Turbo telemetry disabled. The guard
preserves Turbo loose environment mode in children. No live suite, provider
call, remote SQL/migration, deployment, Scheduler action, email, environment-file
edit or push is authorized or performed. No API/shared contract is changed;
separate API/web/workflow/provider tests are NOT APPLICABLE to this mobile-only
visual slice. Vite retains the existing configuration-loader warning.

**Gate totals: 7/7 prompt commands FRESH PASS, 0 final failures**, plus the
additional forced root build above. Initial failed typecheck remains recorded;
no nondeterministic flakes, skipped tests or weakened assertions. Existing Vite
configuration-loader and Metro color-environment warnings remain.

Gates ran against the implementation now committed as `8eca072`. Subsequent
changes are documentation only and inspected/restored generated Next ambient
declarations. Unrelated untracked `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` remain untouched. A temporary PowerShell text-encoding change
to unrelated sprint characters was corrected from the Git UTF-8 source before
commit; the planning diff changes only the OR1 entry.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `8eca072 fix(mobile): add static outer glow to the Today orb`
- `docs: close OR1b` (closing documentation commit; final hash in Git and
  `tmp/overnight/OR1b.status`).

No push or branch switch. No environment-file edit, service call, deployment,
migration/SQL, Scheduler action or email occurred. Local tracking comparison at
baseline was 0 behind / 71 ahead of `github/main`; remote-ref freshness is
UNVERIFIED. No later slice started.
Temporary logs and socket guard remain uncommitted under `tmp/overnight/OR1b*`.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner-reviewed Preview OTA in the
  existing release process; no new native dependency/APK requirement.
- **Device checks - NOT RUN, skipped entirely:** Realme Today dark/light soft
  glow versus website, instant ring handles, scrolling, clear readout, Reduce
  Motion, inactive/fallback appearance and power behavior.
- Production/deployed revisions, database rows/applied migrations, Scheduler
  state, device render path and remote-ref freshness are **UNVERIFIED (owner to
  confirm)**. No service calls are needed for this finite code scope.
