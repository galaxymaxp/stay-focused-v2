# QD1 Queue dropdown acceptance

Finite scope: STEP 0-4, local gates, docs and local commits on
`overnight/2026-10-15_feedback`. Rollout and Device checks are owner work.
Baseline `dc6bbf9`; CQ1.status PASS; tracked tree clean. Unrelated untracked
`UI/`, `apps/mobile/.gitignore`, `supabase/` are preserved.

## STEP 0 evidence (baseline file:line)

- Mobile `src/design/QueueButton.tsx:70` navigates to `/generation-queue`;
  `src/design/primitives.tsx:292` mounts it; `src/design/appActivity.ts:26`
  and `src/app-shell/AppActivityProvider.tsx:45` supply counts/polling.
- `app/(app)/generation-queue.tsx:1` exports QueueScreen from
  `src/features/redesign/GenerationScreen.tsx:284`; Retry at `:487` uses
  `newRequestKey`, View Queue at `:207` navigates there.
- `app/(app)/processing.tsx:3` mounts the distinct ProcessingScreen. Notification
  routing `src/navigation/notificationRoutes.ts:34` accepts only `processing`;
  `src/navigation/appRoutes.ts:17` retains it. No Queue notification target exists.
  Keep processing and its notification/deep-link contract unchanged.
- Web `src/components/queue-button.tsx:42` polls `/api/jobs`; countActiveJobs at
  `:15`, link at `:102`; `src/components/shell.tsx:107` mounts it.
  `app/(app)/queue/page.tsx:1` exports `src/features/queue.tsx:43` QueueScreen;
  Retry `:255`, View Queue `:428`; crumbs `:27`, settings `:57` link to Queue.
- Mobile Auto exists: GenerationScreen `:523`, automaticQueueLabel in
  `automationPresentation.ts:13` returns Auto for automatic jobs. Preserve it.
  Web Queue has no Auto chip; do not invent one.
- SP0 findings `sp0-speed-audit.md:49,85-86`: header and Queue duplicate job
  polling; share one owner-scoped source per platform, retain persisted-result
  Open resolution and extraction handling.
- ADR-027 saved-first screens and ADR-028 past-course filtering remain required.
  No code contradiction or uncovered notification/deep-link dependency found.

## Acceptance matrix

| Requirement | Layer | Evidence | Result |
|---|---|---|---|
| Shared grouping, running count, failed unseen signal, last five | both hooks | queuePresentation fixtures, QueueButton and queue-items tests | FRESH PASS |
| Stable retry, double-tap lock, Open same targets | both dropdowns | mobile QueueContents + web queueActions tests | FRESH PASS |
| Header overlay, outside/back, motion/tokens, Auto | mobile | QueueButton, QueueDropdown, QueueContents tests + code | FRESH PASS; physical checks owner |
| Accessible keyboard/focus, outside/Esc | web | queue-button mocked DOM tests; native button Enter/Space semantics | FRESH PASS; browser checks owner |
| Old routes open overlay, processing retained | navigation | mobile QueueRoute + notification regressions, web queue-button route tests | FRESH PASS |
| SP1/CQ1 regressions | both | mobile 1,056/1,056; web 113/113 | FRESH PASS |
| Serial fresh required gates | repo | final serial commands and counts below | FRESH PASS |

Production revisions/state and physical behavior: **UNVERIFIED (owner to confirm)**.

## Development failures and repairs

- Initial mobile workspace typechecks caught a syntax error in the moved Open
  branch, then an incorrect color token (one diagnostic each). Both were fixed.
  A subsequent hook extraction split an effect at its cleanup return (four
  diagnostics); two script repair attempts retained the errors before normalized
  CRLF boundaries completed the extraction. A fixture-extraction helper used the
  wrong function name; a PowerShell replacement helper rejected an empty string;
  both local tooling errors were corrected. No validation was weakened.
- First expanded mobile focused suite: **20 passed / 1 failed**, 5 files passed /
  1 failed, due to a circular React test-tree JSON assertion. Replaced that
  assertion with direct rendered Copy text. Next expansion: **21 passed /
  3 failed**, 5 files passed / 2 failed: memoized header test did not re-render
  its non-context mock, and unstable session/client mock objects caused a
  5-second hook timeout and an empty pending-list assertion. Stable mock identities
  and a fresh header mount repaired the harness. Final focused mobile **24/24 in
  7 files**, web **18/18 in 4 files**. No nondeterministic product flake observed.
- First required root typecheck: **4 successful / 6 tasks, zero cached**, exit 2,
  **12 TS diagnostics** in new web tests (unknown ref props and callbacks returning
  boolean/VitestUtils). Second: **4/6, zero cached**, exit 2, **3 remaining unknown
  props diagnostics**. Narrowed to Record<string, unknown> and used void
  callbacks; workspace checks and fresh root reruns passed.
- First root lint: **5 successful / 8 tasks, zero cached**, exit 1, web **1 error /
  2 warnings** (prefer-const plus hook dependency and an existing Library warning).
  Its launch briefly overlapped the preceding typecheck, so neither attempt is
  used as final serial evidence. Fixed the test const and callback dependency.
  Intermediate lint passed 8/8 but exposed 13 new mobile warnings (duplicate
  imports, test import placement, redundant cleanup dependency); fixed all new
  warnings. Final serial lint retains only five pre-existing mobile import-order
  warnings and one pre-existing web Library unused-import warning, zero errors.
- Local generated text initially had invalid Windows encoding; repaired to plain
  text before the final gates. No provider errors or private source content
  were added to UI or fixtures.

## Implementation commits

- 6beec6a refactor(queue): share header data and bounded history grouping
- c94d529 feat(mobile): open generation queue under the header
- 1183369 feat(web): replace the queue page with a header popover

## Owner steps remaining

Rollout and Device checks were entirely skipped. Deploy the website and publish
a preview OTA, then check on realme and the website: running badge, dropdown over
the current screen, Retry/Open, old Queue links, mobile outside tap/Back, Reduce
Motion, and website Enter/Space/Esc/focus return. Confirm deployed revisions and
physical behavior. Previous CQ1 migration/API/worker rollout remains its separate
owner prerequisite. No QD1 migration or API/worker deployment is required.

Production revisions, live database/Scheduler state and physical behavior are
**UNVERIFIED (owner to confirm)**. No remote service action, remote SQL/migration,
deployment, Scheduler change, environment-file edit, push or outside-repo deletion
was performed. No API/shared source changed, so their test suites are
**NOT APPLICABLE** under this prompt; their build/typecheck gates still run.

## Final serial gates - FRESH, code tip 1183369

All final commands ran in this order, with TEMP/TMP set to the repository's
`.local/test-temp`. Telemetry disabled; Expo offline mode used for local exports.
No package gate below is a cached claim; forced Turbo runs report zero cached.

| Command | Exact result |
|---|---|
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached |
| `npm run lint -- --force` | PASS 8/8 tasks, 0 cached, 0 errors; 5 existing mobile + 1 existing web warnings |
| `npm run test --workspace @stay-focused/mobile` | PASS 1,056/1,056 tests in 110/110 files; 0 skipped |
| `npm run test --workspace @stay-focused/web` | PASS 113/113 tests in 20/20 files; 0 skipped |
| API/shared tests | NOT APPLICABLE: neither source changed |
| `npm run build --workspace @stay-focused/api` | PASS 1/1 build; 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | PASS 1/1 build; 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS 1/1 export; 1 Android bundle, 35 assets |
| `npm run build -- --force` (AUTOPILOT) | PASS 8/8 tasks, 0 cached |
| `git diff --check`, `git diff --cached --check` | PASS 0 whitespace errors, including final docs |

Detailed local logs: `tmp/overnight/QD1-serial-*.log` (uncommitted). Next-generated
API/web next-env declarations were restored to their clean baseline, and no
export/build output was staged. The final tracked tree is clean; unrelated
untracked UI/, apps/mobile/.gitignore and supabase/ remain preserved. Branch is
`overnight/2026-10-15_feedback`; no push. The documentation commit contains this
record; its hash is recorded after commit in QD1.status rather than self-amended.

Final documentation hygiene first found one extra EOF blank line in current_sprint;
removed it, then reran diff/staged-diff checks with zero errors.
