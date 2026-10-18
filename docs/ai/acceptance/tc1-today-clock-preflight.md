# TC1 / BACKLOG P15: cross-midnight Today clock preflight

**RESOLVED by TC1b and [ADR-047](../../architecture/ADR-047-overnight-today-clock.md), 2026-10-18.** The owner approved the server Today projection extension; local implementation and verification are in [TC1b acceptance](tc1b-today-clock.md). The original preflight findings and failed first attempt below are retained as historical evidence. The owner contract question no longer blocks TC1.


**STOPPED at STEP 0 (2026-10-18).** Baseline `bb14b88` on
`overnight/2026-10-15_feedback`; local tracking state 73 ahead / 0 behind
`github/main`, without fetching. The complete TC1 prompt and its unattended
overrides were read. Scope: TC1 STEP 0-6, tests, gates, documentation and local
commits only; rollout, device checks and remote operations excluded.

## Stop finding

The planner accepts ISO ranges past midnight, but the existing Today date model
does not return the complete plan belonging to that start date. TC1 STEP 0.3
explicitly says to STOP if the day model cannot represent the ownership rule
without server changes. Unattended rule 4 requires a checkpoint and owner
question, rather than proceeding past that condition.

- `apps/api/src/lib/experience/mappers.ts:58`: `dayWindow(date, offset)` ends
  at `start + 86_400_000` (next midnight, line 63).
- `apps/api/src/lib/experience/mappers.ts:124`: `composeToday` uses that fixed
  window; line 129 filters sessions with `starts_at < end && ends_at > start`.
  Sessions starting at or after next midnight are absent from `timeline`.
- The same projection derives `current`, `next` and `later` from that filtered
  timeline (lines 138-139 and 147). An extended stored study-plan range does
  not extend the session read window.
- `apps/api/src/lib/experience/service.ts:159-162` passes the calendar date
  into `composeToday`; `apps/api/app/api/today/route.ts:8-10` accepts date and
  UTC offset, without a supported extended-end parameter.
- Mobile `TodayScreen.tsx:68-71` and web `today-screen.tsx:76-80` each consume
  one such Today snapshot. Merely changing its date to yesterday, as needed
  for the proposed local ownership selection, omits the next morning's work.

Concrete local counterexample, UTC+08: a window owned by October 17 runs
22:00-04:00. At October 18 01:30, a planned session runs 01:00-02:00. Calling
`composeToday` with October 17 returns an empty timeline and null current/next;
with October 18 it returns the session as both current and next. The requested
start-date-owned snapshot therefore is not supported by the current contract.

Supporting it needs a deliberate extension of the server's Today projection,
or an explicitly accepted client composition of two calendar-date snapshots
that reconciles timeline/current/next/later/progress and refresh behavior.
Neither alternative was implemented past the explicit preflight stop.
This is a local code contradiction, not missing production access.

**Exact question for the owner:** May TC1 extend the server Today read model
to include the wrapped end while preserving start-date ownership, or should
it instead compose two existing calendar-date snapshots in each client?
Please approve the approach and its treatment of current/next/later/progress
before resuming TC1. This question is recorded for morning; no response was
requested during the unattended run.

## Other STEP 0 findings

| Area | Existing source behavior |
| --- | --- |
| Branch and dirty tree | Expected branch, OR1b code `8eca072` and docs `bb14b88`; unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved |
| Mobile helpers | `snapMinutes` and `ringDragMinutes` clamp to 0-1440; `planningRequest` rejects `end <= start` and uses a single calendar-day planning range; `freeTimeAround` and `timelineSegments` cap at 1440 |
| Web helpers/store | `timeline.ts` has the same planning rejection/day cap; `free-time-store.ts` requires `end > start`; time input parsing rejects malformed strings |
| Server planning | Shared `normalizeRange` (`task-planning.ts:511-523`) checks increasing ISO timestamps, without a 24-hour cap. API service forwards ranges; repository passes them to `apply_study_plan_v1` unchanged |
| SQL | Latest tracked planner RPC in `20260828173643_replace_planned_study_sessions_on_replan.sql` checks increasing bounds and session containment, without a same-date or 24-hour restriction. No migration/RPC change is needed to accept the supplied ISO ranges; remote application state unverified |
| Ring behavior | Both dayClock models clamp drag/move/snap inside one day and assume ordered endpoints in hit testing; arc paths and durations assume `end - start`. Mobile lock is the existing 44px `clock-lock` switch; web uses `day-clock-lock` |
| Today persistence | Existing per-day keys `sf.today.free-time.<date>` and shared lock key `sf.today.clock-locked`; both screens currently select the calendar date |
| Preview/Schedule | Both PlanPreview components use `to - from` and minute-of-day positions. Web Schedule maps end `00:00` to 1440 and requires end after start |
| Menu reuse | Mobile reviewer uses a measured native Modal with dismiss backdrop/safe-area bounds; web reviewer popover handles Escape, focus return, outside dismissal and keyboard actions |

No shared helper, UI, storage, planning, API, SQL, migration or dependency change
was made. OR1b's orb/halo implementation remains untouched. A TC1 ownership ADR
is deferred until the stopped contract decision is resolved; no implemented
architecture is claimed.

## Verification

Temporary synthetic evidence/config/logs remain uncommitted under
`tmp/overnight/TC1*`. Only local in-memory functions ran, with the existing
Node non-loopback socket guard enabled. No production or external service call.

| Command / evidence | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --config tmp/overnight/TC1.vitest.config.ts` | FRESH PASS: 1 file, 5/5 tests; 2 overnight planner-validator cases, fixed day boundary, omitted prior-date active session, same session present on the next date |
| `npm run typecheck -- --force` | NOT RUN: STEP 0 STOP, no implementation |
| `npm run lint -- --force` | NOT RUN: STEP 0 STOP, no implementation |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/web` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/shared` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/api` | NOT RUN: STEP 0 STOP; temporary targeted proof is not the API suite |
| `npm run build --workspace @stay-focused/api` | NOT RUN: STEP 0 STOP |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: STEP 0 STOP |
| `git diff --check` and `git diff --cached --check` | FRESH PASS: 0 whitespace errors on owned documentation |
| Additional AUTOPILOT forced root build | NOT RUN: documentation-only stopped checkpoint |

Prompt gate counts: **1/9 FRESH PASS (diff hygiene), 8/9 NOT RUN, 0 failed**.
The five diagnostic tests verify existing behavior; they are not TC1 feature
acceptance. STEP 0 partial; STEPS 1-6, feature tests and implementation gates
not entered. No feature completion claim.

Failed first diagnostic launch: Node exited 1 before collecting tests because
backslashes in an absolute `NODE_OPTIONS --require` path were consumed.
Retry used the repository-relative guard path and passed 5/5. No failing test
assertions, skipped tests or nondeterministic flakes. Vite emitted its existing
CommonJS/ESM configuration warning. Source-discovery wildcard/path misses were
resolved with `rg --files`; no paths or source were fabricated.

## Owner steps remaining

- Resolve the recorded Today contract question before resuming TC1. All
  cross-midnight helpers, drawing/drag, ownership/menu/preview code, tests,
  required implementation gates and the ownership ADR remain to be done.
- **Rollout - NOT RUN, skipped entirely:** Preview OTA and website preview
  after implementation and verification, through the owner's release process.
- **Device checks - NOT RUN, skipped entirely:** Realme and web 22:00-04:00
  dragging/typing, 12/24h input, plan past midnight, Today at 01:00, lock drag
  prevention and typed editing while locked.
- **UNVERIFIED (owner to confirm):** installed/deployed revisions, physical
  behavior, production DB rows/applied migrations, Scheduler state and remote
  ref freshness. No network check was attempted.

Checkpoint commit: `docs: record TC1 Today model preflight stop`; final hash in
Git and `tmp/overnight/TC1.status`. No push, deployment, migration application,
remote SQL, provider call, Scheduler operation, email or `.env*` edit.
