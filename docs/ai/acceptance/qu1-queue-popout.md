# QU1 Queue popout (2026-10-18)

**Status: PASS for the finite unattended code scope.** Implementation commits:
`7eb50c2` shared, `529d466` API, `7f519a3` mobile, `bc2e6b2` web. Documentation
closure is `docs: close QU1`; its final hash is in `tmp/overnight/QU1.status`.

Finite scope: the self-contained `tmp/overnight/prompts/QU1.md`, unattended
STEP 0-5, tests, fresh serial gates, documentation and scoped local commits.
Baseline `cabd5b8`, branch `overnight/2026-10-15_feedback`. Rollout and Device
checks are excluded owner steps. No later roadmap item is authorized.

## Preflight

The six named components exist and retain the reported old summary/Refresh
presentation. `read.ts:6,24-31` reads all owner requests and deduplicates each
request's `batch_key` plus `batch_keys` with a Set. Mobile summary rendering
was at `CourseBatchQueue.tsx:20`, idle copy at `QueueContents.tsx:58`, full
Refresh at `QueueDropdown.tsx:69`. Website equivalents were
`course-batch-queue.tsx:17` and `queue-button.tsx:122,130`. Web outside-pointer
and Escape handling already exist; these are preserved and tested rather
than duplicated. Existing icons are native lucide `RefreshCw` and website
`public/icons/refresh-cw.svg` via `Icon`.

Four succeeded jobs legitimately produce 4/4, with no double membership count.
The screenshot defect is stale finished progress presentation. A separate
count defect was found: failed/cancelled requests and terminal jobs never
settled their batch progress, including after a failed job was cleared.
Count terminal attempts as done, retaining all requests and unchanged totals.
Failures retain their independent attention UI and prevent idle; retrying a
failed request changes it back to waiting and restores active progress.
DTO shape, owner filters, bounded reads and failure behavior are preserved.
No schema/API contract change, dependency or ADR is required.

The roadmap reference `overnight/roadmaps/2026-10-18-web-desktop-mobile-polish-profiles.md`
is absent. The full QU1 prompt establishes the selected scope; implementation
and current planning files agree with the component preflight. Unrelated
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are preserved.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Hide finished, retain partial batch progress, exact 4/4 screenshot case | shared + both clients | shared and component tests | FRESH PASS |
| Idle only without active/attention jobs, pending intents, waiting/quota/failed requests or active summaries | shared + both clients | helper and component tests | FRESH PASS |
| Refresh icon beside Close, accessible label, disabled/busy during initial and cached-data refresh | client headers + existing pollers | header and poller tests | FRESH PASS |
| Outside, Back, Escape, blur and focus return | client popouts | native and web dismissal tests | FRESH PASS (component) |
| Retry/Cancel, Clear, card routes and close on result open | existing actions | existing action regressions | FRESH PASS |
| Terminal batch attempts settle once; failures retain attention | API read | service unit tests with in-memory client | FRESH PASS |
| Compact spacing and existing icons/colors/touch targets | both clients | static token review + Android export; visual review excluded | FRESH PASS (local) |

## Verification

All commands below are serial, local and freshly executed (no test cache).
The tested working tree is the QU1 implementation over baseline `cabd5b8`.
Commit IDs are recorded in the handoff and final status file. Logs and generated
output remain ignored under `tmp/overnight/` or existing build directories.

| Command | Result | Evidence under `tmp/overnight/` |
| --- | --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached | `QU1-typecheck-final.log` |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached, 0 errors, 6 existing warnings | `QU1-lint-final.log` |
| `npm run typecheck --workspace @stay-focused/web` then `npm run lint --workspace @stay-focused/web` | FRESH PASS, 1/1 each after final test-fixture correction, 1 existing lint warning | `QU1-web-typecheck-final.log`, `QU1-web-lint-final.log` |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 446/446, 44/44 files; includes existing compiled test copies and all source tests | `QU1-shared-tests.log` |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 278/278, 42/42 files | `QU1-web-tests-final.log` |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1332/1332, 139/139 files | `QU1-mobile-tests.log` |
| `npm run test --workspace @stay-focused/api` | FRESH PASS, 2315 passed, 3 skipped, 0 failed; 201/201 files | `QU1-api-tests-final.log` |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 1/1 build, 35/35 static pages | `QU1-api-build-final.log` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1/1 export, 1 Android bundle, 35 assets, 4262 modules; offline/telemetry disabled | `QU1-android-build.log` |
| `git diff --check` | FRESH PASS, 0 whitespace errors; final staged checks recorded with commits | `QU1-diff-check.log` |

Each of the four implementation commits passed `git diff --cached --check`.

First attempts are retained: mobile tests **1324 passed / 8 failed**, 138/139
files passed (`QU1-mobile-tests-attempt1.log`). The eight new assertions
serialized mocked icon props containing circular React Fiber references;
reading rendered Copy text corrected the test-only defect. Final suite is
1332/1332. Initial lint was 8/8 with eight warnings; two new duplicate-import
warnings were fixed, leaving the six pre-existing warnings (five mobile import
ordering, one website unused import). Non-failing Vite config-loader warnings
and Expo NO_COLOR/FORCE_COLOR notices remain. No nondeterministic flake was observed.

The initial API suite/build passed (2308 passed, 3 skipped; 35/35 static pages),
then final review extended the terminal-count regression to failed/expired
attempts, retry reopening and every job status. API tests/build were repeated
for that change. Website tests were repeated after correcting a pre-existing
inconsistent running-badge/empty-list fixture. Local `python` was unavailable;
that editing attempt made no change and patches were used instead.
The API build's generated `next-env.d.ts` was restored to its clean baseline;
build outputs, validation logs and private local files are excluded from commits.

Root aggregate/website production build: **NOT RUN**, not part of QU1's
explicit gate list. Workflow/provider contracts and live generation probes:
**NOT APPLICABLE**, no workflow/provider implementation changed.

## Implementation review

`activeBatchSummaries` filters only `done < total`; the existing package-index
star export exposes it and `queueIsIdle`. Idle uses visible jobs (completed
outputs are allowed), local pending intents on mobile, batch attention states,
and active summaries. Loading, queue refresh errors and mobile local-request
errors suppress the idle message. Web has no local generation-intent list.

The native header has Queue, the existing lucide refresh icon, then Close.
The refresh Pressable uses the existing 48-point hit target, button role and
`Refresh queue` label, busy/disabled accessibility state and ActivityIndicator.
Web reuses its masked `refresh-cw` Icon, standard icon-button styling and
spinner, with the same label plus `aria-busy` and disabled state. Both existing
pollers expose in-flight refresh state, retain cached data and their admission
lock, and avoid state updates from disposed requests. No second poller or
duplicate event listeners were added.

Both apps preserve existing QueueCard actions, Clear, batch Retry/Cancel and
result navigation. Mobile retains the backdrop Pressable and Modal
`onRequestClose`; web retains outside pointerdown, Escape, blur and trigger
focus return. Web popover padding/gaps reuse the existing 12/8px spacing scale;
native uses existing spacing tokens. No new color or animation is introduced;
existing reduced-motion rules cover the web spinner.

This is static/component verification. Visual, TalkBack, real browser default
focus behavior and Android Back behavior still require the owner's excluded
device checks.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely under unattended rules.
Owner website deploy and mobile OTA/APK, then Android finished-batch/empty-state,
TalkBack refresh label, refresh busy state and outside-tap/Back review. Web
review at 1440 and 390 px, including Escape/outside dismissal and focus return.

Production revision, database rows, Scheduler state and real-account/device
behavior: **UNVERIFIED (owner to confirm)**. No remote service calls, deployment,
remote SQL, migration, Scheduler operation, email, environment-file edit or push.
