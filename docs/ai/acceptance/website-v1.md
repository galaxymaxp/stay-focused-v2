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
| Today / tasks / deadlines | Existing Today/task APIs; create/update/delete and empty/error states | PENDING |
| Schedule/calendar | Persisted sessions, deterministic planner preview/apply | PENDING |
| Canvas | Existing connection, selection, sync and source APIs | PENDING |
| Generation / queue | Existing durable admission, idempotency, real server state, cancellation | PENDING; live paid requests excluded |
| Reviewer / Library | Existing persisted artifact reader, paging and filters | PENDING |
| Quiz | Choice/Matching, draft persistence, check/finalize/history/result guards | PENDING |
| Settings / responsive / themes / a11y | Current B25 palette and keyboard/mobile browser checks | PENDING |
| Mobile compatibility | No mobile/API/shared changes; package checks and root gates | PENDING |

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
