# Website V1 acceptance — 2026-10-08

Owner-authorized finite scope: functional browser implementations of Today,
schedule/calendar, tasks/deadlines, Canvas, generation/queue, Reviewer/Quiz,
Library, and settings using the existing backend. Local reviewable commits only.

Baseline: `de09b9c`, dedicated `website/functional-v1` branch and
`C:/Projects/stay-focused-v2-website` worktree. The original checkout and all
dirty mobile, API, design, and planning files remain untouched. No `apps/web`
existed. ADR-001/003/011/018, root policy, AUTOPILOT, current planning files,
mobile API clients, shared DTOs, B25 design tokens and design bundle inspected.

B25.3.3 production compatibility investigation is paused by owner instruction.
Its existing reports, blockers and PARTIAL/BLOCKED verdict are preserved.

| Requirement | Owning layer / proof | Result |
| --- | --- | --- |
| Repository isolation / shared architecture | Dedicated worktree, ADR-019, scoped diff | PASS inspection |
| Auth, session recovery, protected UI | Supabase browser client, server bearer boundary; unit/browser checks | FRESH PASS isolated fixture checks; live Supabase acceptance BLOCKED |
| Today / tasks / deadlines | Existing Today/task APIs; CRUD UI and empty/error states | FRESH PASS create/edit/deadline browser flow; existing API CRUD regression PASS |
| Schedule/calendar | Persisted sessions, deterministic planner preview/apply | FRESH PASS browser preview/apply/persisted listing |
| Canvas | Existing connection, selection, sync and source APIs | FRESH PASS isolated connection/disconnection and accepted sync; live school integration BLOCKED |
| Generation / queue | Existing durable admission, idempotency, real server state, cancellation | FRESH PASS default guard and fixture-only admission/retry/settings; live paid acceptance BLOCKED |
| Reviewer / Library | Existing persisted artifact reader, paging and filters | FRESH PASS reader reopen/search/export and draft edit/save/reload |
| Quiz | Choice/Matching, draft persistence, check/finalize/history/result guards | FRESH PASS five-question browser practice and web/API regression |
| Settings / responsive / themes / a11y | Current B25 palette and keyboard/mobile browser checks | FRESH PASS both themes/ten screens, keyboard, 720px reflow and visual comparison; physical assistive-technology acceptance NOT RUN |
| Mobile compatibility | No mobile/API/shared changes; package checks and root gates | FRESH PASS 467 mobile tests, TypeScript/lint/export; four existing lint warnings |

Live authenticated integration requires a non-production account/backend. No
production write or paid generation may be used to make this report pass.

## W1 foundation checkpoint

FRESH: web TypeScript passes; web lint passes (one initial config-export warning
corrected); Vitest 6/6 passes. `node scripts/web-browser-check.mjs` passes on
isolated localhost Auth/API fixtures: protected-route redirect makes no private
request, email sign-in, bearer forwarded through the Next rewrite, reload
recovers without another sign-in, both themes at 390x844 and 1440x1000, no
horizontal overflow or browser exceptions. Zero production/provider requests.
Screenshots and JSON evidence are generated under ignored `.local/website-qa`.
They are test fixtures, not evidence of live Supabase or production acceptance.

Direct visual inspection of Today mobile/desktop captures confirms palette,
ring, four-tab terminology and neutral glass navigation. Mobile planner controls
push Up Next lower than the reference; this remains a correction in W5.
Authentication visual acceptance is pending its missing approved screen frame.

## W2 tasks and schedule checkpoint

FRESH browser acceptance on fictional localhost services: manual task creation,
deadline and notes editing, task-detail deep links, deterministic plan preview,
apply and persisted session listing pass. The first browser run exposed encoded
route parameters being encoded twice; task/material/artifact page boundaries now
decode their route segment once. A pre-filled textarea label mismatch was also
corrected with an explicit accessible name. No API or mobile changes.

Foundation code is formatted for review. Session-bound API closures refuse a
JWT from a different account; resource requests cancel on navigation/account
change and polling does not overlap. Available-time controls collapse on mobile
so Up Next remains visible above the bottom navigation.

## W3 Canvas, generation and Queue checkpoint

FRESH isolated browser flow: real route contracts are exercised for connection
creation/deletion, course inventory, accepted content sync and recovery shortcut.
The personal access token is cleared after submission and absent from browser
storage. Course/module/material navigation and deep links pass. Generation
admission is disabled by default; paid generation was not invoked. Queue opens
persisted completed output without generating again. Loaded history now survives
active-queue polling. Source preparation, Reviewer/Quiz admission, cancellation
and retry reuse existing API safeguards and idempotency contracts.

Figma Generate, Course, Generation and Queue frames were inspected. The orb is
the supplied local SVG. Desktop arrangements derive from that same design
language under the owner's explicit approval; no new desktop design is invented.

## W4 Library, Reviewer, Quiz and settings checkpoint

FRESH: web unit tests 10/10; web TypeScript and lint pass. Browser checks pass
saved Reviewer reload/search/text export, revision-checked activity draft
edit/save/reload, Quiz saved-selection recovery, single/multiple/true-false and
Matching answers, finalize/check feedback, all-question completion guard,
finish confirmation, score/history/reopen and updated Library learning progress.
Settings changes the persisted theme and signs out. Public answer labels are
shown; opaque option IDs and private diagnostics are not displayed.

The inspected Quiz frame's Reveal Answer and incomplete Finish controls are not
implemented because the existing backend deliberately withholds answer keys
before finalization and requires all questions checked. Existing safeguards win;
no security or grading contract changed. Plain-text Reviewer export uses the
saved artifact and does not call generation. Exact paginated API reads are used
for Library and course material lists, with bounded material-deep-link recovery.

## W5 verification and visual comparison

Fresh repository baseline checks (zero Turbo cache hits): root TypeScript 8/8,
lint 8/8, build 8/8. API and website production builds succeed; mobile Web,
Android and iOS exports succeed. Lint has four existing mobile `import/first`
warnings and no website warnings. Regression command
`npm run test --workspaces --if-present` passes: API 996 (4 skipped), mobile 467,
web initially 9 (then 10/10 after an additional ambiguous-identity test), Canvas
73, engine 606 deterministic evaluations, OCR 27, shared 26. No paid live evals.
Final code was rechecked: root TypeScript 8/8 (27.002s), lint 8/8
(21.469s), build 8/8 (1m4.926s), all with zero Turbo cache hits; web
unit tests 10/10 also pass freshly. Total distinct passing tests/evaluations
across the unchanged backend/mobile/shared suites and final web suite: 2,205.

Browser evidence uses fictional localhost Auth/API fixtures exclusively, with
non-local browser requests denied. Default mode records zero generation
admissions. The generation-fixture mode records three fixture admissions: an
intentional failed Reviewer submission, retry using the same persisted key, and
Quiz submission preserving ten questions/medium/two types. These are not OpenAI
requests. Accepted jobs poll actual fixture state, display server unit counts,
and reopen a persisted artifact; no synthetic percentage is added.

References inspected: [Figma Foundations and screen board](https://www.figma.com/design/1UlaDGXMPT6EkVRHdAveHP?node-id=25-1277),
Foundations `2:190`; Generate `25:3065`, Course `25:3063`, Generation `25:3053`,
Queue `25:3051`, Library `25:3057`, Reviewer `25:3056`, Quiz question `25:3061`,
Quiz result `25:3043`; both owner-approved local mobile showcases in the
original checkout's `docs/design/references`; shared mobile implementation.
No separately version-labelled Design System v1.2 file was found. The inspected
Figma Foundations supplies the component tokens. The owner explicitly authorized
deriving missing desktop frames from this design language.

Light/dark phone and desktop screenshots are captured for authentication and all
ten major surfaces. Additional captures cover generation in progress, Quiz
questions and results. Direct visual comparison checks neutral dark surfaces,
pale primary actions, light-theme reference colors, hierarchy, spacing, card and
control radii, glass navigation, exact supplied Lucide icons and generation orb.
Desktop uses the authorized sidebar, wider cards and calendar adaptation.
Corrections include collapsing mobile ring controls, restoring the 40px Quiz
score hierarchy, 48px segmented controls and named form/select/range controls.
Generated captures and JSON reports remain ignored under `.local/website-qa`.

### Remaining live acceptance and scope limits

- BLOCKED: no dedicated non-production Supabase/API account and authenticated
  session was established for this worktree. Live sign-in/sign-up/confirmation,
  token expiry and database persistence/RLS are not proven by fictional fixtures.
- BLOCKED: live Canvas school connection, provider pagination and real course
  persistence require that non-production environment and a test Canvas account.
- BLOCKED: actual OpenAI source-to-Reviewer/Quiz generation requires a separately
  established allowance. No provider call, production write or migration was made.
- NOT RUN: physical device and NVDA/VoiceOver testing. Static lint, semantic,
  keyboard and visual checks do not claim a complete WCAG certification.
- Not exposed in this slice: manual notes/file upload and new activity-output
  generation. Saved activity drafts remain editable. Schedule is a seven-day
  persisted study-session view/planner with completion/skipping, rather than an
  external calendar or unrestricted event editor. Lists use server pagination;
  calendar reads are bounded to 200 sessions and disclose that boundary.
- Approved Reveal Answer, skipped/revealed result counts and incomplete finish
  cannot be wired under the current all-question finalization/secrecy contract.
  They are omitted, not simulated. No grading or generation safeguard changed.

### First attempts and corrections

The first web lint reported an anonymous config-export warning (corrected).
The first full feature type/lint run found a Feedback JSX closing-brace error
(corrected). Browser runs exposed double-encoded task/material/artifact route
segments and unstable implicit names around pre-filled textareas/selects
(corrected). One overlapping harness launch encountered a localhost port in use;
subsequent runs are sequential. Screenshot waiting initially swallowed a
strict-locator error when Canvas had multiple loading skeletons; the harness now
requires all skeletons to disappear before capture. One run during active Next hot-reload stalled
while restoring its session; final checks run with application code frozen.
Root `npm run test` is absent in the committed monorepo; the correct workspace
regression command above passes. No failed first attempt is presented as a pass.

### Accessibility review

The accessibility-review skill was applied to navigation, labels, keyboard
alternatives, contrast and reflow. Website lint passes its static accessibility
rules. Browser checks verify skip-link focus, Enter to the main landmark,
keyboard available-time adjustment in 15-minute steps, and 720px reflow (the
layout width corresponding to a 1440px desktop at 200%). Icon-only controls have
accessible names; decorative icons/orb are hidden from assistive technology.
Segmented controls and range alternatives use 48px targets. Mobile detail views
hide primary chrome, matching the approved pushed-screen treatment and mobile
stack; desktop retains its authorized sidebar.

| Text pair | Ratio |
| --- | ---: |
| Light body on page | 17.46:1 |
| Light secondary on page | 5.73:1 |
| Light primary button text | 6.04:1 |
| Dark secondary on card | 7.86:1 |
| Dark primary button text | 17.32:1 |
| Dark link on page | 12.70:1 |

These sampled text pairs pass the 4.5:1 text threshold. They do not establish
all component/placeholder/non-text contrast or actual screen-reader behavior.
Approved subtle field/border treatments are retained; a full WCAG audit remains
NOT RUN rather than being inferred from these checks.

## Website milestone verdict

W1-W4 implementation is locally verified; W5 automated browser, regression,
root-build and visual work is locally verified. The final Queue copy distinguishes
document/source preparation from generated study tools and returns completed
preparation to Generate. Web TypeScript/lint/build were rerun for that last change and pass. This is a functional application
client using the existing backend, not live production acceptance. Overall live
acceptance remains PARTIAL/BLOCKED by the non-production account/environment,
Canvas test access and separate generation allowance listed above. No deployment,
push, migration, production data modification or PR #1 change occurred.
B25.3.3 remains paused and PARTIAL/BLOCKED, not complete.
