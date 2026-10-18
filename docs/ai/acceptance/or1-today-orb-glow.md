# OR1 / BACKLOG P14: Today orb outer glow preflight

**STOPPED at STEP 0 (2026-10-18).** Baseline `4517181` on
`overnight/2026-10-15_feedback`. Finite scope was OR1 only: mobile visual
parity, tests, local gates, docs and scoped local commits. OR2 was not started.
The unattended rules require stopping on preflight surprises and when the
mobile orb already implements the matching outer glow in code.

## Findings

The inspected mobile implementation already contains the web outer aura.
This establishes source parity, not physical-device visual acceptance. There
is no defensible, concrete mobile-only cause established by the available
source; adding a second halo would be speculative under STEP 0's stop rule.

| Candidate | Local evidence at baseline | Finding |
| --- | --- | --- |
| Missing aura | Both `DayOrb.tsx` files call `createOrbAura()`, scale its mesh by `0.86`, add it to the scene, and update it with `dayOrbTones(minutes).aura` | Matching outer-glow implementation already exists |
| Different shader | Mobile `generation-core/orbAura.ts` and web `knowledge-core/orbAura.ts` use the same shader, `AURA_SIZE = 3.3`, additive blending, outside-glass mask, spread and theme strength | Formatting differences; no mobile-only shader defect found |
| Canvas too small | Both cameras use distance `4.55`, FOV `36`, radius `0.95`; both hosts use `(CLOCK.glass * 2) / DAY_ORB_FILL` | Ball diameter stays 204 design points; canvas is about 317.5 points and the scaled aura about 303.7 points before displacement. No smaller mobile host found |
| Parent clipping | Mobile orb/host/ring Views set no clipping or hidden overflow; web host has no additional halo or larger dimensions | No source evidence of mobile parent clipping |
| Transparency or color setup | Both renderers use `alpha: true`, clear alpha zero, sRGB output, ACES tone mapping and exposure `1.02`. Installed Expo Android `GLView.kt` uses `TextureView` with `isOpaque = false` | No setup mismatch shown. Native compositing behavior remains UNVERIFIED |
| Resolution | Mobile retains `RENDER_SCALE = 0.6` and inverse view scaling; web caps pixel ratio at `1.5` | Known performance difference; no evidence it removes the halo. Raising pixel cost is outside the intended repair |
| Readout | Mobile readout is a separate centered overlay inside the glass; no outer scrim found. Web scrim is inset inside the glass | No mobile overlay covering the outer aura found |
| PNG fallback | Mobile replaces failed GL rendering with `orb-adaptive-foreground.png`, with no separate halo. Web deferred Reduce Motion still also has no separate outer halo | Whether the reported device used fallback is UNVERIFIED; do not assume it did |
| Motion/lifecycle | Mobile retains `dayOrbTouch`, foreground/live gating and Reduce Motion handling | No rendering/lifecycle changes made |
| Optional SVG dependency | `apps/mobile/package.json` already lists `react-native-svg` 15.15.4 | No dependency/native addition necessary for a future approved static halo |

The referenced owner testing roadmap
`overnight/roadmaps/2026-10-18-web-desktop-mobile-polish-profiles.md` is absent;
the `overnight/` directory is absent and no matching tracked file was found.
The supplied OR1 prompt was read in full, including all unattended overrides.
Current planning files and the IF1 handoff footer were inspected; none provides
OR1 device evidence identifying a different rendering path or a concrete cause.

**Exact question for the owner:** Which installed mobile revision and render
path (live GL or PNG fallback), theme and time of day showed the weaker glow,
and should OR1 proceed with a static mobile-only halo despite the existing
matching GL aura? Please provide the missing testing roadmap or correct its path.
This question is recorded for morning; no unattended response was requested.

## Acceptance and verification

| Requirement / check | Result |
| --- | --- |
| Source comparison and stop-rule audit | FRESH: matching aura code and missing roadmap found; STEP 0 partial, stopped before implementation |
| Concrete device cause | UNVERIFIED (owner to confirm); not invented from shader/platform hypotheses |
| Mobile fix, geometry/touch/tint/motion regression tests | NOT RUN: preflight STOP; no runtime or test changes |
| `npm run typecheck -- --force` | NOT RUN: preflight STOP |
| `npm run lint -- --force` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/shared` | NOT RUN: preflight STOP |
| `npm run build --workspace @stay-focused/api` | NOT RUN: preflight STOP |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: preflight STOP |
| `git diff --check` and `git diff --cached --check` | FRESH PASS: zero whitespace errors on the owned documentation change |
| Additional AUTOPILOT forced root build | NOT RUN: preflight STOP; documentation-only checkpoint |

Prompt gate counts: **1/7 FRESH PASS (diff hygiene), 6/7 NOT RUN, 0 failed**.
No test attempts or flakes. Read-only discovery attempts reported missing
roadmap/test/native-module filenames; the actual native `GLView.kt` was found
and inspected. These were source-discovery misses, not failing test runs.

Only documentation is changed. No web/mobile runtime, shared helper, shader,
render pipeline, dependency, migration or ADR change. Unrelated untracked
`UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` are preserved. No remote
service operation, deployment, remote SQL/migration, Scheduler action, email,
environment-file edit or push occurred. Local remote-tracking comparison was
0 behind / 68 ahead at baseline; remote-ref freshness is UNVERIFIED.

## Owner steps remaining

- Resolve the recorded preflight question and supply/correct the missing
  roadmap before resuming OR1. The requested visual improvement remains open.
- **Rollout: NOT RUN, skipped entirely.** Preview OTA only after a reviewed
  implementation and a separately authorized owner rollout.
- **Device checks: NOT RUN, skipped entirely.** Owner Realme dark/light visual
  comparison, ring handles, scrolling and Reduce Motion acceptance.
- Production revisions, database rows/applied migrations, Scheduler state,
  actual device render path, visual output and power behavior remain
  **UNVERIFIED (owner to confirm)**.

Commit: `docs: record OR1 preflight stop` (final hash in Git and
`tmp/overnight/OR1.status`). Progress/status files remain uncommitted under tmp.
