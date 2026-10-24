# WEB-A2: website desktop and mobile browser verification

2026-10-25. Branch overnight/2026-10-15_feedback, baseline d2a45bb2 (the FS11
release source). **LOCAL PASS** for the verification task: the authenticated
website was exercised end to end in a real browser against local fictional
fixtures, and two reproducible defects are recorded for WEB-A3.

## Source and prerequisite

Owner-directed run from Claude Code in the live checkout
`Documents\Projects\b25-3-3-work`. The queued WEB-A1/A2 prompts name
`Claude\Projects\Stay Focused` as the repository; that folder is the Autopilot
controller, not a Git checkout, which is why WEB-A1 STOPPED at STEP 0. WEB-A1's
STOPPED status is preserved. Its audit scope was completed as
[WEB-A1b](web-a1b-website-audit.md) (LOCAL PASS) during the FS8 repair; this
task depends on that committed audit, not on a rewritten status.

## Frozen acceptance

| Requirement | Proof | Result |
| --- | --- | --- |
| Desktop and phone browser, light and dark | Harness screen matrix: 11 screens × light/dark × 390/768/1440 px, horizontal-overflow assertion per screen | PASS |
| Tablet / responsiveness | 768 × 1024 added to the matrix; 720 px reflow (200% zoom equivalent) | PASS |
| Authenticated flows | Email sign-in, bearer proxy, persistent session reload, protected-route denial signed out and after sign-out | PASS |
| Core signed-in flows | Tasks/schedule, sessions, announcements, Generate/Canvas refresh, Queue, Reviewer reader/search/export, Study Assist, Quiz practice/completion, Canvas connect/grades, Settings, Today Plan with | PASS except D1 |
| Reduced motion and keyboard | Shimmer stops under Reduced Motion; skip link; clock ARIA slider keyboard step | PASS |
| Safety | Zero browser exceptions; zero production/provider requests (every non-localhost request aborted; paid counter 0) | PASS |
| Reproducible defects recorded | D1, D2 below with exact reproduction | DONE |

Real assistive technology, real Canvas/Supabase/providers, production URLs
and physical devices are NOT RUN and remain UNVERIFIED.

## Method

`node scripts/web-browser-check.mjs` starts the real Next.js website
(`next dev`, QA dist dir) against a localhost fixture that stands in for
Supabase Auth, Storage TUS and the API, then drives Chromium with Playwright.
Fictional data only; no `.env` read. Modes: default, `--generation-fixture`
(fixture-only admissions) and `--task-sync-only`.

The harness last tracked the RB2 website. Before it could judge the current
site, steps that encoded superseded behaviour were updated to the current
intended behaviour, each traced to its source change:

| Harness step | Current intended behaviour (source) |
| --- | --- |
| Today service failure expected an error page with Try again | Saved-first screens keep saved Today and offer `Couldn't refresh · Retry` (2bfbff3b, `snapshotStatusLabel`) |
| Reviewer "Find a visual" button | Visuals load automatically from the reader's `/figures` request; no-result stays quiet (42687310, `use-reviewer-images`) |
| Reviewer "Save to file" | Reviewer actions menu: Export PDF and Text (.txt); both downloads asserted (`reviewer-header.tsx`) |
| Generate "Up to date with Canvas" | Saved courses show their freshness label (`generate.tsx` status); refresh-on-load still asserted |
| "Not synced · 1 course" group | Previous-term courses group under Past courses; unsynced card syncs on tap, never opens materials (6d8759e5) |
| "Adjust available time" number input | Clock handles are ARIA sliders in 15-minute steps (`DayRingClock.tsx`) |
| "Open saved output" link | Finished generations redirect to the saved Library item (392ca412) |
| Upload "Read this file" review step | Picking a file uploads and creates the Reviewer directly (e96c6bef); input label names PDF, photo, DOCX or PPTX |

Fixture contract drift corrected to match the API: `/api/today` carries
`capabilities` (the clock is planner-gated); `/api/jobs?detailId=` returns
`detailId`/`detail` (the generation screen's read); upload accept requires an
idempotency key and `jobType: "reviewer_generation"`. Added: tablet width and a
TP1 check (three Plan with radios, default Reviewers & tasks, PATCH synced once,
persisted across reload) with a `/api/profile/planner-preferences` fixture
matching the route's `{ planMode }` contract. No assertion was removed without
an equivalent current check.

## Defects

**D1 — saved activity draft shows stale text after reload (data-integrity UX).**
Reproduce: open a saved activity draft, edit Reflection, Save draft ("Draft
saved." shown, server write count 1), reload. The editor shows the pre-save
text ("My study plan") with no update prompt; navigating away and back shows
the saved text. Cause: `DraftEditor` (`apps/web/src/features/library.tsx:554`)
copies the `draft` prop into state once and is keyed by draft id only. Reload
renders the pre-save saved-screen snapshot first; the fresh server revision
then arrives but is ignored, leaving stale content and a stale revision, so a
following save would conflict. Harness assertion left failing until repaired.

**D2 — corrupted characters in website copy.** An ellipsis or middle dot was
replaced by a literal `?`: `own-material.tsx:90` "slides as text?",
`:96` "or click to choose ? Documents", `:103` "Uploading source? 45%",
`:114` "Starting?"; `reviewer/topic-assist.tsx:83` "Creating your
explanation?". Same corruption in mobile `ReviewerGenerateScreen.tsx:145`
(outside website scope; noted for mobile).

No other defect was reproduced: all other flows, both themes and all three
widths pass with zero browser exceptions.

## Verification

| Run | Result |
| --- | --- |
| Default harness (committed) | Fails only at D1 as designed: 5 groups PASS before it (`tmp/overnight/WEB-A2/harness-final-default.log`) |
| Default harness, probe recording D1 and continuing | PASS, all 16 groups; 634 local API calls, 0 paid, 0 browser errors |
| `--generation-fixture`, probe | PASS, all groups incl. own material and generation redirects; generation admissions 7 (fixture only) |
| `--task-sync-only` (committed) | PASS |

The probe is an ignored copy differing only in the D1 assertion
(`tmp/overnight/WEB-A2/make-probe.cjs`). First failing attempts are retained as
`harness-1..5.log`, `probe-*.log`.

Fresh gates on the WEB-A2 working tree (source d2a45bb2 plus the harness and
fixture diff), run serially by `tmp/overnight/gates.ps1`; all exit 0:

| Exact command | Result / evidence (`tmp/overnight/WEB-A2/`) |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached; 43.7 s; `typecheck-1792868706452.log` |
| `npm run lint -- --force` | 8/8, 0 cached; 0 errors, 7 existing warnings; `lint-1792868750273.log` |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 648 passed / 82 files; 289.9 s; `web-serial-1792868827881.log` |
| `npm run build --workspace @stay-focused/api` | PASS; `api-build-1792869117761.log` |
| `npm run build --workspace @stay-focused/web` | PASS, 23/23 static pages; `web-build-1792869247460.log` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | offline Android JS/assets export PASS; `android-build-1792869284385.log` |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8, 0 cached; 226.8 s; `root-build-1792869367233.log` |
| `git diff --check`, `git diff --cached --check` | PASS at commit |

Generated `next-env.d.ts` files were restored after each build. The change is
test tooling only (harness and fixture); no application source changed.

Unintended extra run, recorded for completeness: while filling in this report,
a shell quoting error executed the web suite once more with a malformed
`--maxWorkers=1\` argument, so it ran in parallel (77 s wall, 424 s test time).
That run had 644 passed / 4 failed tests (timeouts or timing assertions in
`course-options`, `password-reset`, `orb-load` and `overnight-preview`) plus
three suites whose `afterAll` hook timed out (`course-options`,
`hide-on-scroll`, `screen-snapshots`). These match the
parallel-load flakes recorded in earlier acceptance reports (TC2, PBR-UX2);
the serial gate above passes them all. Other commands in that accident
failed at argument parsing and changed nothing.

## Owner steps remaining

Rollout and Device checks NOT RUN. Signed-in production website on real
browsers (Safari/Firefox/Edge, real phone browsers), real screen readers and
live Canvas/Supabase remain UNVERIFIED (owner to confirm). D1 and D2 go to
WEB-A3.
