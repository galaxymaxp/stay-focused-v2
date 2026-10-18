# SH2b mobile secondary headers (2026-10-18)

Finite scope: SH2b STEP 0-4, local tests/gates, documentation and local
commits. Baseline `d98e58b`, branch `overnight/2026-10-15_feedback`.
The owner's corrected Page/Sheet facts supersede the earlier SH2 stop;
`d98e58b` is retained. Rollout and Device checks are excluded by the
unattended rules. No later roadmap work is authorized by this report.

**Status: PASS, code complete locally.** Implementation commits:
`10347e2 feat(mobile): add hide-on-scroll header hook` and
`fb99de4 feat(mobile): hide secondary headers on scroll`.
Planning/report closure is committed as `docs: close SH2 mobile hide-on-scroll`;
its final hash is recorded in `tmp/overnight/SH2b.status` after commit.

## Acceptance matrix

| Requirement | Owning layer | Local evidence | Result |
| --- | --- | --- | --- |
| Down hides after measured height + 24pt, 8pt hysteresis; accumulated slow up reveals | Pure `nextHeaderVisibility` | Hook tests, including jitter and direction extrema | FRESH PASS |
| Top, negative overscroll and short content show; refresh/resize need no new scroll | Hook metrics | Pure and mounted hook tests | FRESH PASS |
| Bottom rebound / viewport enlargement cannot masquerade as upward reading | Pure visibility decision | Two bottom-offset regressions | FRESH PASS |
| Measured height + opacity collapse removes the region's occupied height | Animated hook / Page | Mounted tests assert zero height and opacity; inner natural measurement survives hidden/resize | FRESH PASS; native layout remains owner device acceptance |
| Existing token motion, eased both ways; Reduce Motion is instant | Hook | `motion.small` = 180ms, `Easing.inOut(Easing.quad)`, JS layout driver; immediate values with Reduce Motion | FRESH PASS |
| Default Page unchanged; opt-in composes hook then caller at 16ms | Page | Default/wrapper/composition tests | FRESH PASS |
| Native RefreshControl, refresh admission and fixed actions remain | Page / Library | Native control test; back/header action/fixed-control exclusion; existing Library interactions | FRESH PASS |
| Today date/status; both Tasks status headers; Tasks sync line; Library offline caption | Screen opt-ins | Existing screen suite plus four explicit opt-in assertions | FRESH PASS |
| Reviewer snapshot/search collapses; focused/raw/deferred queries stay visible through match jumps | ReviewerReader / SearchField | Reader test exercises focus, single character, query, blur, next-match jump and down scroll; Page forced-visible test | FRESH PASS |
| Hidden descendants excluded from accessibility/touch; top restores them | Page | Both accessibility properties, pointer events and top restoration asserted | FRESH PASS; TalkBack remains owner device acceptance |
| Website parity observation for PAR1 | Source inspection | No website hide-on-scroll header found; mobile-only change | FRESH PASS (source inspection only) |

## Decisions

The Today greeting remains in Page's fixed title row because Queue/Profile
actions share that row. The date moves from `subtitle` into the collapsible
region with SnapshotStatus. Back buttons, header actions and the tab bar stay
outside the collapsing region. The existing Today no-pull-to-refresh behavior
is preserved; native refresh remains available on screens that already use it.

Library's former `headerBelow` combines sort/filter/selection actions with
the offline caption. Its controls and SnapshotStatus move intact into Page's
`headerBelowFixed` slot; only the offline caption collapses. Its existing
organizer scroll observer, drag/selection behavior and refresh admission stay
connected. Tasks' existing Canvas sync line joins its collapsible status area;
the course Tasks page retains its existing SnapshotStatus content.

An absolute inner measurement view keeps its natural height independent of
the animated outer height, including while hidden. The outer view animates
height and opacity together to remove its space, with overflow clipped.
Viewport/content size callbacks reveal short refreshed lists without waiting
for scroll. Scroll/measurement state lives in refs; visibility changes alone
update React state. Animation cleanup stops interrupted/unmounted motion.
No new dependency, native module, token, schema or API is introduced. Sheet's
drag-to-dismiss handler is untouched. No ADR is needed.

## Verification

Latest focused run: **FRESH PASS 117/117**
in four files (19 hook, 7 primitives, 12 Reviewer/scrubber, 79 screen tests).

| Required command, run serially on final code | Result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 447/447 tests, 44 files (existing compiled copies included) |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1365/1365 tests, 141 files |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 1/1 build; 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1/1 local Android export |
| `git diff --check` and `git diff --cached --check` | FRESH PASS, 2/2 checks, 0 whitespace errors |

Final forced typecheck/lint and both test suites ran before the local API
build, followed by the local Android export. API framework-generated
`next-env.d.ts` drift is restored to the clean starting version. Expo is
offline and telemetry is disabled in the build process environment; no
environment file is changed. No workflow/provider/remote validation script
is run. API unit/provider suites are NOT APPLICABLE to this mobile-only
change and were NOT RUN; API build is nevertheless a required gate above.

Failed first attempts are retained in ignored local logs:

- Hook stub: **15 passed / 2 failed**. The test interpolation returned a
  snapshot number instead of a live Animated interpolation. Fixed the stub
  to read its backing value; production animation was unaffected.
- Focused mobile typecheck: **1 error**, missing Today `spacing` import.
  First combined focused tests: **107 passed / 8 failed**, all the same
  missing import. Added the import; the next focused run passed **115/115**.
- First forced lint: **7/8 tasks passed, 0 cached**; mobile had **1 error +
  7 warnings**, web **1 warning**. Corrected the Page test's element props
  construction and the two new import-order warnings. The six existing
  warnings remain (five mobile import-order, one website unused import).
- A later review added the two bottom-offset regressions and restarted
  forced gates for the final code. No nondeterministic flake was observed.

Raw command logs and progress/status are ignored under `tmp/overnight/SH2b*`;
none are staged or committed. Final counts above are the durable evidence.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner mobile OTA/APK.
- **Device checks - NOT RUN, skipped entirely:** Realme Today, Tasks,
  course Tasks, Library course and reviewer down/up without a gap; persistent
  actions/tab bar; existing pull-to-refresh at the top; instant Reduce Motion;
  reviewer search stays visible while focused/typing/querying/match jumping;
  TalkBack hidden descendants and restoration at the top.
- Production revision, database/Scheduler state and real-account/device
  behavior are **UNVERIFIED (owner to confirm)**. No remote calls were made.

No deployment, remote SQL/migration, Scheduler operation, email, environment
file edit or push. No credentials/private fixtures/generated artifacts are
committed. Unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/.temp/`
remain untouched. PAR1: the website has no hide-on-scroll header in inspected
source and remains outside this mobile-only slice.
