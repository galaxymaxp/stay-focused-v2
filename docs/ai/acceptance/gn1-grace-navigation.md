# GN1 mobile grace navigation - preflight STOP

Date: 2026-10-18. Status: **STOPPED**, not implemented or complete.
Finite scope: GN1 STEP 0 through local implementation, tests, fresh serial
gates, docs and commits. Rollout and Device checks are excluded by the
unattended rules. STEP 0 says **"STOP on any surprise"**; rule 4 requires
checkpointing safe work and ending without asking a live question.

## Baseline

Branch `overnight/2026-10-15_feedback`; HEAD `da57f05`, after required
`9613d00`. Local refs show ahead 45 / behind 0 against `github/main`;
remote freshness **UNVERIFIED (owner to confirm)**, no fetch. Author is
galaxymaxp <omgraythekid@gmail.com>. Tracked tree initially clean; unrelated
untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.

Initial `git log --oneline -8`:

```text
da57f05 docs: close OS1 (OS1b)
a8484f6 fix(web): subtle own-material source toggle
26a8e69 feat(mobile): monotone icon rows in other-source sheet
9613d00 docs: record OS1 preflight stop
c6584b5 docs: close SH2 mobile hide-on-scroll
fb99de4 feat(mobile): hide secondary headers on scroll
10347e2 feat(mobile): add hide-on-scroll header hook
d98e58b docs: record SH2 preflight stop
```

## STEP 0 inventory

Paths below are relative to `apps/mobile/`, at baseline `da57f05`.

| Submit site | Existing behavior |
| --- | --- |
| `src/features/redesign/GenerateScreen.tsx:429,439-452` | Reviewer saves an auto-submit intent, sets the exact Request saved note, refreshes Queue and calls `acceptGeneration` without navigation. Quiz immediately pushes `/generation` with `intent` and `start: "1"`. |
| `src/features/redesign/LibraryScreen.tsx:143-183` | Confirmed Remake saves an auto-submit intent, sets the same note, refreshes and calls `acceptGeneration`; no automatic navigation. Missing original material can immediately push `/courses/[courseId]/reviewer` at line 174. |
| `src/features/courses/CourseBatchControls.tsx:31-39,43-44` | Generate all / Select materials load a preview; Confirm POSTs selected material IDs. Successful response **immediately calls `queue.show()`**, in addition to refreshing and closing the preview. No router push, but visible Queue opens immediately. |
| `src/features/redesign/useCourseReviewerBatch.ts:14-46` and `courseReviewerActions.ts:31-65` | Loads all material pages, saves/reuses intents and awaits admissions. No navigation or Queue opening. Progress increments only after an accepted/reused active job; a capacity-wait progress callback can have count zero. A future timer must require count > 0 and schedule only once, not reschedule for every accepted item. |
| `src/features/reviewer/ReviewerGenerateScreen.tsx:62,112` | Immediately pushes `/generation` with accepted `id`; second path optionally includes `quiz: "1"`. |
| `src/features/courses/CanvasSourceReviewerScreen.tsx:844` | Immediately pushes `/generation` with accepted `id`. |
| `src/features/redesign/TasksScreen.tsx:256-263` | Immediately pushes `/generation` with `intent`, `start: "1"`. |
| `src/features/reviewer/ReviewerReader.tsx:564-569` | Immediately pushes `/generation` with `intent`, `start: "1"`. |
| `src/features/queue/QueueContents.tsx:52,94,164` | Saved request closes Queue then immediately pushes `/generation` with `intent` and no start; active job opens with `id`; retry opens with returned `id`. |

`GenerateCourseScreen` renders `CourseBatchControls` at
`src/features/redesign/GenerateScreen.tsx:308`. `LibraryCourseScreen` uses
`useCourseReviewerBatch(library.refresh)` at `LibraryScreen.tsx:277` for
confirmed Remake all at line 291. It also owns the single Remake hook at
line 276. No other production consumers were found by repository search.

### STEP 0.3 route finding

`src/features/redesign/GenerationScreen.tsx:32,45-71,74-94` reads the saved
intent once per effect dependency change and takes its `generationId` if
present. With `start: "1"`, its auto-start effect calls `confirmGeneration`,
which calls `acceptGeneration`; this is **not observe-only**. The admission
service deduplicates concurrent calls by owner/key, but delayed reviewer
navigation must not add an admission call.

Without `start`, the route shows the saved intent without automatically
submitting it. If its saved generation ID already exists, `useJobRead` shows
the accepted job. Otherwise it shows **Ready to start**, **This saved request
hasn't started yet**, and a manual **Start generation** action
(`GenerationScreen.tsx:184-198`). It does not subscribe to later intent
storage writes or use Queue updates as an effect dependency. Thus the
existing non-start form can display an intent safely, but is not a reliable
live observer if admission is still pending when the route reads storage.
No guarantee that an admission ID arrives within two seconds exists in code;
no live request was attempted. The reviewer path still exists, so the
reviewer-path-removed stop condition does not apply.

`app/(app)/generation-queue.tsx:5-13` renders no page: on mount it goes back,
or replaces with `/today` if it cannot go back, and calls `show()`.
`src/features/queue/useQueueItems.ts:137-145` sets `open` true;
`QueueDropdown.tsx:25-31,83` renders a native Modal containing QueueContents.
It is the existing QU1 Queue popout, not a persistent full-page batch view.
`QueueRoute.test.ts:33-48` explicitly covers both legacy route cases.

### STEP 0.4 lifecycle finding

`useIsFocused` from `expo-router/react-navigation` is already used in
`GenerationScreen.tsx:2,28`, `useExperience.ts:3,40` and
`useLocalLibrary.ts:8,57`. `src/app-shell/AppLifecycle.tsx:71-88` checks
`AppState.currentState === "active"`, subscribes to `change` and removes its
listener on cleanup. Queue polling uses the same AppState pattern.
Ordinary navigation uses router push/navigate/back; Queue opening uses
context plus a native Modal and therefore does not itself guarantee screen
blur. A resumed implementation must account for opening Queue during grace,
as well as focus, unmount and background transitions.

## Stop and exact owner question

The prompt describes Generate all as having no navigation and requests a
new two-second transition after acceptance. The live batch controls already
open Queue **immediately** after a successful response. This is not router
navigation; it is an existing user-visible transition omitted from the
preflight description. `CourseBatchControls.test.ts:25` explicitly expects
`show()` once. Changing that immediate opening is necessary to realize the
proposed grace period. This unexpected baseline behavior triggers STEP 0's
stop instruction; no implementation step was crossed.

Exact question recorded for the owner, not asked during this run:

> May GN1 replace CourseBatchControls' existing immediate `queue.show()`
> (and its test expectation) with the cancellable two-second opening through
> the current `/generation-queue` redirect/popout route, preserving QU1's
> popout rather than creating a new full-page queue? Also, may it add
> observe-only intent reconciliation in GenerationScreen so an admission
> that finishes after the initial intent read displays progress without
> another `acceptGeneration` call?

## Acceptance and verification

| Requirement | Owning layer | Proof needed | Result |
| --- | --- | --- | --- |
| Establish submit, route and lifecycle facts | Mobile | Source inventory above | FRESH source review complete; preflight STOP |
| One cancellable two-second navigation | Mobile hook | Fake-timer lifecycle tests | NOT RUN; implementation blocked by stop |
| Reviewer/Remake navigation without second admission | Mobile screens | Screen and slow-admission tests | NOT RUN; implementation blocked by stop |
| Generate all opens Queue after accepted work | Batch controls/hook | Batch tests including zero accepted/failure | NOT RUN; baseline decision pending |
| Existing immediate Quiz and other sites preserved | Mobile screens | Regression suites | NOT RUN; source unchanged |
| Rollout and Realme checks | Owner | Later owner acceptance | NOT RUN; explicitly skipped |

Required gate counts: **1/7 commands run** for the documentation checkpoint
(`git diff --check`); the other **6/7 NOT RUN** after the mandatory preflight
stop: forced root typecheck, forced root lint, shared suite, mobile suite,
API build and Android export. API tests and AUTOPILOT's root build likewise
**NOT RUN**. No cached result or previous task's test count is used as GN1
evidence. Documentation-only diff and staged-diff results are recorded in
handoff; they do not establish implementation acceptance.

Read-only helper attempts: one PowerShell search used unsupported Bash brace
expansion and failed before execution; corrected explicit paths succeeded.
Two guessed reads (`appActivity.tsx`, `QueuePopover.tsx`) were absent; actual
QueueDropdown and AppLifecycle sources were inspected. One oversized
historical-doc read was truncated; relevant current sections were read
separately. These are inspection errors, not suite failures or flakes.

No hook, screen, test, dependency, API, schema or ADR change. No remote
service call, SQL/migration, deployment, Scheduler operation, email,
environment-file edit or push. No file was deleted.

## Owner steps remaining

1. Resolve the recorded baseline/observation questions and issue corrected
   resume instructions, then implement GN1 and run every fresh serial gate.
2. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK.
3. **Device checks - NOT RUN, skipped entirely:** Realme Generate Reviewer,
   stay two seconds, generation page opens; navigate to another tab within
   two seconds, remain there; home/background then return, no navigation;
   Generate all opens Queue after two seconds.
4. Production revisions, database rows, Scheduler state, real-account and
   physical-device behavior are **UNVERIFIED (owner to confirm)**. These
   were not accessed and are not the reason for this code-baseline stop.

The documentation checkpoint commit is identified in Git and ignored
`tmp/overnight/GN1.status`/progress after commit, without a self-hash amend.
