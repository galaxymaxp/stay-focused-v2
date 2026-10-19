# AN1b: announcement read on open

**PASS for the finite local code scope (2026-10-19).** All acceptance rows
and all 10 prompt gates pass; the extra forced repository build passes.

Finite unattended scope: STEP 0-3, local tests/gates, docs and scoped commits
on `overnight/2026-10-15_feedback`, baseline `ebcf59c`. No remote calls,
deployment, migration application, environment-file edits or pushes.
Rollout and Device checks are owner steps only. AN1's `795fbba` preflight
and [source ownership evidence](an1-announcement-read-on-open.md) are reused.
The AN1b owner answers preserve mobile row tap marking and all swipes.

## Acceptance matrix

| Requirement | Owning layer | Required local proof | Result |
| --- | --- | --- | --- |
| Detail marks only resolved/displayed data, once per open | Mobile detail and web `[id]` detail | Loading/missing data, resolved data, refresh, remount and changed route tests | FRESH PASS |
| Explicit unread stays unread while open | Both detail guards and real preference stores | Set unread, re-render/refresh, assert no auto-mark | FRESH PASS |
| Early mark survives preference hydration | Mobile async storage; web localStorage | Delayed read/initial saved state with existing pins/read ids preserved | FRESH PASS |
| Owner readiness and isolation | Both stores and detail guards | No owner write; owner arrival/change retried under correct key | FRESH PASS |
| Dots/counts/Today update without refetch | Both subscribed lists and Today | Mount actual surfaces with real stores; open detail then assert rendered rows/counts | FRESH PASS |
| Identity consistent across entry points | API source and client routes/preferences | Canonical ids across Today/list and encoded web `[id]` route | FRESH PASS |

STEP 0: tracked tree clean, expected branch retained; existing unrelated
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`, ignored `tmp/` preserved.
Cached tracking ahead 38 / behind 2; no fetch. No nested AGENTS.md found.
Relevant ADR-032 keeps Today and standalone announcements on the same service.

## Implementation and diagnosis

- Mobile detail resolves the route id against `useExperience`'s
  `/api/experience/announcements?limit=100` response. The Expo route re-exports
  this detail screen. Web `[id]/page.tsx` decodes the route id and renders
  `AnnouncementDetail` within the layout's `AnnouncementsWorkspace` context,
  populated by `useResource` on the same list endpoint. Unavailable or loading
  details do not auto-mark. Existing mobile row-tap marking remains unchanged
  by explicit owner answer 1, including its pre-navigation timing.
- Both detail effects now keep a ref keyed by route id and preference owner.
  They consume that open only once resolved content is displayed with an owner.
  Loading, account readiness and account changes do not consume another owner's
  guard. Refreshing data or changing preferences does not re-mark an explicit
  unread. A route change or unmount/reopen starts another open.
- Both preference hooks expose their existing owner id; their storage and
  subscription behavior is unchanged. Mobile `markRead` queues changes after
  the initial `sessionStore` read, emits to mounted `useSyncExternalStore`
  consumers and serializes writes. Web `read` loads `localStorage` synchronously
  before merging, then emits and persists. Owner keys remain
  `sf.list-preferences.v1.${owner}`; no Canvas write or schema change.
- No mark/hydration overwrite, owner-readiness loss, id mismatch, or unsubscribed
  Today snapshot was found. The tests use the actual preference hooks with
  controlled local storage and the actual mounted list, Today and detail
  components; they do not substitute a preference hook. Mobile explicitly
  covers an early mark followed by unread before delayed hydration finishes,
  as well as an early mark alone surviving saved read ids/pins. Web covers the
  child detail loading saved state before parent hydration effects. Delayed
  owner arrival, account switch and denied browser storage are covered.
- Mobile Today uses `useArrangedAnnouncements`; web Today uses
  `useListPreferences`. Their existing subscriptions update dots, unread
  subtitle and Today rows immediately without a resource refresh. Neither Today
  implementation needed a change. Web tests exercise the actual async `[id]`
  page with an encoded id containing both colon and slash; the same canonical
  id is read by list and Today. API `ExperienceService.getTodayScreen` calls
  the same `getAnnouncements` mapper, which returns `row.id` for both endpoints.
  Existing API equivalence/announcement tests also cover this contract.
- The reported opened-but-unread symptom is most likely a deployed build
  predating the existing auto-mark code: **UNVERIFIED (owner to confirm)**,
  an inference after the source/race tests, not a deployed diagnosis. The new
  guards address the requested timing and explicit-unread contract. They do not
  claim to repair a storage race that the evidence did not reproduce.

No required mobile/web behavior was skipped. Native gestures remain native;
web navigation stays links. No visual, motion, token, API, migration, dependency,
release-version or ADR change. React best-practices review: effects remain
unconditional, ref mutation is confined to effects, owner boundaries are
explicit, subscriptions remain shared, and strict test mocks are typed.

## Verification

Evidence applies to implementation commits `50d4ccc` (mobile) and `e881082`
(web). Gates ran against the identical implementation before/after those
scoped commits. All requested workspaces have a test script.

| Exact command | Result and counts |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached; final retry |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 596/596 tests, 58 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS, 2433 passed / 3 intentional live skips, 212 files; complete suite with bounded concurrency |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1535/1535 tests, 161 files |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 387/387 tests, 59 files; final retry |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1 local Android bundle exported |
| `git diff --check` | FRESH PASS, 0 whitespace errors; repeated at closure |
| `git diff --cached --check` | FRESH PASS, 0 whitespace errors on implementation commits; repeated on docs |
| Additional `npm run build -- --force --env-mode=loose` | FRESH PASS, 8/8 tasks, 0 cached; local Android/iOS/web exports included |

API live flags were explicitly disabled; all three opt-in live cases skipped.
The worker flag changes only concurrency, with no file/test filtering.
No extra API workflow/provider-contract suite is applicable: no API/provider
implementation changed. Focused final evidence:
mobile 102/102 tests in 2 files (6 new plus the existing 96 screen tests),
web 5/5 in 1 new file. Renderer tests use fictional announcement text and
mock data/auth/storage boundaries; they do not establish device or deployed
browser/notification behavior. No physical or rollout checks ran.

Generated Next declarations changed only through local builds and were
inspected/restored to HEAD. Logs, exports, the network guard and progress/status
remain ignored under `tmp/` or workspace build outputs. Documentation commit:
`docs: complete AN1b announcement read handoff` (final hash in Git and
`tmp/overnight/AN1b.status`). Author for every commit:
`galaxymaxp <omgraythekid@gmail.com>` via `--author`.

### Failed first attempts

- First focused mobile: 100 passed / 1 failed (2 files). The mock RowLink keeps
  its icon as a prop; the dot assertion incorrectly searched rendered children.
  It now inspects the real row's icon prop. Final focused 102/102 includes an
  additional delayed-hydration regression added before full gates.
- First focused web: 4 passed / 1 failed (1 file). Read rows correctly moved
  after unread rows; changed the test to locate the canonical href rather than
  assume index 0. Final focused 5/5.
- First root typecheck: exit 2, 5/8 tasks, 0 cached; three web test diagnostics
  (untyped mock-call tuple predicate and two `act` callbacks returning the
  existing read hook's empty-owner union). Typed storage mocks and explicit
  void callbacks fix these without weakening application types.
- First root lint: exit 1, 5/8 tasks, 0 cached; two new web test errors for
  passing children as props. Used `createElement` child arguments instead.
- First full web: all 387 tests passed, but 1 suite failed / 58 passed because
  existing `screen-snapshots.browser.test.ts` timed out its browser teardown
  hook at 10 seconds while gates ran concurrently. Unchanged full-suite retry
  passed 387/387 in 59 files. No timeout or existing test was weakened.
- Several exploratory reads used nonexistent filenames or PowerShell wildcards
  unsupported by rg; discovery continued using actual imports and `rg --files`.
  These were read-only discovery misses, not gate failures.
- First additional root build launch: exit 1 before npm/Turbo tasks ran because
  Node's preload option interpreted Windows backslashes in the quoted guard
  path. Used forward slashes in the same absolute path and retried. No build
  or product code was changed for this launch failure. Final root build uses
  the ignored local HTTP(S)/fetch/socket guard to deny non-loopback traffic,
  disables telemetry/live flags and puts Expo offline; loose env mode carries
  those guards through Turbo. Earlier workspace scripts ran as local default
  commands without that guard; they did not run a deploy/provider script.

## Owner steps remaining

- **Rollout: NOT RUN, skipped entirely.** Owner reviews commits and chooses
  publication separately. For later Vercel deployment/env/log work, strongly
  recommend installing its missing CLI with `npm i -g vercel`; no installation
  or CLI invocation ran during AN1b.
- **Device checks: NOT RUN, skipped entirely.** On Realme and the actual
  website, open unread announcements from Today/list, return and confirm the
  dot/count and Today removal. Confirm explicit unread persists while open,
  reopen reads again, and notification/deep-link/direct URL entry points work.
- Deployed API/web/mobile revisions, production/database/applied-migration/
  Scheduler state, remote-ref freshness and actual browser/device behavior
  remain **UNVERIFIED (owner to confirm)**. No live state was needed for the
  local repair, and no remote service was called.
