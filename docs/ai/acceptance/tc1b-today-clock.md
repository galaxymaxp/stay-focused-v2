# TC1b / BACKLOG P15: overnight Today clock

Scope: STEP 0-6, tests, local gates, documentation and local commits only.
Baseline `9430e20`, branch `overnight/2026-10-15_feedback`, unchanged.
TC1's server projection question is resolved by the owner's 2026-10-18 answer
and [ADR-047](../../architecture/ADR-047-overnight-today-clock.md).
OR1b's orb/halo implementation is preserved. No later roadmap item started.

## Acceptance matrix

| Requirement / owning layer | Local proof | Result |
| --- | --- | --- |
| STEP 0 planner/RPC accepts increasing ranges past 24:00 | Re-read TC1 preflight, validator/service/repository and tracked RPC; reuse original five diagnostics without rerunning them | CACHED 5/5; no migration/RPC blocker |
| Shared duration, containment, invalid equal endpoints and normal behavior | `packages/shared/src/free-time.test.ts` | FRESH PASS 13/13 |
| Mobile/web planning 22:00-04:00 and 23:30-00:30 | Each `overnight-clock.test.ts`, independent expected local calendar timestamps; normal 09:00-11:00 retained | FRESH PASS |
| Wrapped store and Schedule inputs | Web `free-time-store.test.ts`, shared validation/error and existing planner request path | FRESH PASS |
| Ring arc, handle positions, hit test, drag through midnight and whole-block duration | Both clock model suites and overnight regressions | FRESH PASS |
| Extended Today current/next/later/progress and no-override regression | API `today-window.test.ts` converts TC1's counterexample into passing proof; HTTP tests exercise route/service and trimmed next date | FRESH PASS |
| Invalid overrides, safe 400 explanation, validation before data reads | Ten HTTP invalid-input cases, existing authenticated owner-route regressions | FRESH PASS |
| At 01:30 yesterday owns the window; at 04:00 today excludes it | Both `today-clock-window.test.ts` mounted hooks, including an open-screen midnight rollover and the existing per-day keys | FRESH PASS 3/3 per client |
| Clock options, checked lock, typed save while locked, invalid input | Mobile/web mounted menu tests; mobile Today integration proves unchanged lock key and shared drag/menu planning callback | FRESH PASS |
| Device-locale 12/24-hour parsing | Mobile pure typed-field round trips, midnight/noon, malformed and empty values | FRESH PASS |
| Wrapped Up next / preview labels and bar positions | Absolute source times retained; shared locale clock labels; each mounted preview regression places 01:00 work halfway through 22:00-04:00 with positive width | FRESH PASS |

## Implementation

Existing free-time keys and the lock key remain in use. Both clients select
one date/window through the shared helper, with boundary timers and foreground
reconciliation. The override participates in the existing owner/path cache
identity; no two-date snapshot composition is introduced. A pending preview
cannot publish after its owning date changes.

The server accepts validated optional ISO bounds, keeps the default projection
unchanged and derives all Today fields from its selected window. A next-date
start at 04:00 deliberately excludes the previous window's morning work. The
approved trimmed-start example controls interpretation of the prompt's
calendar-date anchor wording; ADR-047 records this explicitly.

Mobile uses the measured reviewer Modal pattern, safe-area bounds, typed hour
and minute fields, device-locale AM/PM, and the native switch. Web uses the
existing popover tokens, browser time inputs, Escape/focus restoration and
outside/Tab dismissal. Both have the sole 44px Clock options corner button.
Lock blocks drags and step adjustment; typing still commits through the same
free-time/planning path. Existing web secondary range controls were consolidated
into the menu. No native dependency, schema, migration, RPC, SQL, auth or
provider integration change.

## Verification

Final gate results and local commit hashes are recorded in the handoff footer
and the final run status. Validation logs stay uncommitted under
`tmp/overnight/TC1b*`.

| Required command | Result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks, 0 cached |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks, 0 cached; 0 errors, six existing warnings |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1462/1462, 148 files |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 325/325, 48 files |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 489/489, 47 files, including existing compiled test copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS: 2369 passed, 3 intentional live-provider skips, 205 files; two workers bound local database-test memory |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1 local Android bundle |
| `git diff --check` | FRESH PASS: 0 whitespace errors; final staged check in handoff |
| `npm run build -- --force --env-mode=loose` (additional AUTOPILOT gate) | FRESH PASS: 8/8 tasks, 0 cached; API/web builds and mobile Android/iOS/web exports |

Resume checkpoint: implementation remains at `11f9afa`. The completed gate
logs above were inspected as CACHED evidence after interruption; no committed
implementation or passing suite was repeated. Only documentation closure,
restoration of inspected build-generated Next declarations and fresh diff/link
checks remained. The React review found effect/listener cleanup, strict props
and labelled typed controls in place; physical interaction remains owner work.

The offline socket preload, Expo offline/no-telemetry, Next/Turbo telemetry
suppression and process-local disabled live-test switches were used. The
additional AUTOPILOT forced root build preserves these flags with loose
environment mode. No environment file was edited. Build-generated declarations
are inspected and restored; build outputs and validation artifacts are excluded.

Failed first attempts and repairs, retained rather than hidden:

- Python was unavailable before any script edit ran; local editing used Node.
- The first shared test launch failed before collection because a relative
  preload path did not resolve inside the workspace. Quoted absolute forward
  slashes fixed the process-local guard; shared focused proof passed 13/13.
- First root typecheck: 5/8 tasks successful, 0 cached; an editing-script marker
  failed on CRLF and omitted the clock model suffixes, and a web hook replacement
  missed. Restored both suffixes from Git and repaired the hook. Second attempt:
  6/8 successful, 0 cached; the mobile Copy component did not forward an alert
  role, so the error uses its surrounding native View. Subsequent root checks
  pass 8/8; validation was never weakened.
- First API focused run: 49 passed / 10 failed. Invalid overrides already
  returned 400, but unrelated bundle reads had begun. Moved validation before
  parallel bundle reads; retry passed 59/59.
- First mobile boundary/preview run: 3 passed / 1 failed. The preview selector
  matched an hour divider as well as the session; limited it to percentage-width
  blocks. Final full mobile suite passes.
- First full web run: 323 passed / 2 failed in mirror consistency checks.
  Synchronized the existing presentation mirror and kept the dayClock mirror
  marker first. Final full web suite passes 325/325.
- The staged mobile diff check initially found one trailing space on a generated
  blank test line; removed it in a scoped cleanup commit. Full implementation
  diff hygiene then passed.
- First lint passed with 11 warnings, including duplicate directives/imports
  introduced during editing. Those were removed; final lint retains only the
  six existing warnings. Existing Vite configuration and Metro warnings remain.

No nondeterministic flake, assertion suppression, weakened check or deleted
acceptance test. Workflow/provider contract suites are NOT APPLICABLE: no
workflow runtime, provider or generation boundary changed; the API build still
compiles the existing workflow.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** Preview OTA and website preview via
  the existing owner release process. Nothing was deployed or pushed.
- **Device checks - NOT RUN, skipped entirely:** Realme and web 22:00-04:00
  and 23:30-00:30, drag handles through midnight, move the whole window, type
  times in 12/24-hour settings, check planning/Up next/preview past midnight,
  open Today at 01:00, switch at the wrapped end, lock to prevent dragging and
  save typed edits while locked. Physical appearance and keyboard behavior
  remain owner acceptance.
- **UNVERIFIED (owner to confirm):** installed/deployed revisions, production
  database rows/applied migrations, Scheduler state, remote-ref freshness and
  real phone/browser behavior. Local code/tests do not establish live state.
- Vercel CLI is absent. For future owner rollout tooling, installing
  `npm i -g vercel` is strongly recommended; no installation or CLI call ran.

No Supabase, Vercel, Google Cloud, Canvas or Resend call, deployment, remote SQL,
migration application, Scheduler operation, email, environment-file edit or
push. Unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are preserved.
