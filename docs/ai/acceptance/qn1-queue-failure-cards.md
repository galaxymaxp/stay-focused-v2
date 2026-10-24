# QN1 Queue failure cards

2026-10-24. Frozen before code edits. LOCAL code/tests/docs/commits only;
endpoint QN1. No successor, rollout, device work or external service calls.

Baseline: `overnight/2026-10-15_feedback`, HEAD `5f6acd27`, no tracked dirt.
`git status --short`: unrelated `?? UI/`, `?? apps/mobile/.gitignore`,
`?? supabase/.temp/`; preserve and never stage these or tmp/.
`git log --oneline -8`:

```text
5f6acd27 docs(readiness): record passing FS8 validation receipt
05017922 docs(readiness): close FS8 blocker supersession acceptance
5adcafc8 fix(verification): validate resume text against actual capture pixels
d30afbb3 fix(web): meet muted text contrast on the light page canvas
6175e8d2 docs(readiness): freeze direct FS8 repair and website audit scope
4d93b19b docs(ux): close UX3 local card feedback verification
6ee3d7c0 fix(ux): complete bounded card hover and touch feedback
c5584807 docs(ux): freeze UX3 card feedback acceptance
```

## STEP 0 causes (baseline file:line)

- Web panel: apps/web/src/components/queue-button.tsx:119; card:
  apps/web/src/features/queue.tsx:60. Reason at :207 is a separate paragraph
  after the open row and action row. Retry :179 uses subtle styling in the
  separately padded .queue-card-actions (globals.css:2924). There is no unified
  failure-card layout. Existing subtle buttons are intentionally transparent.
- Mobile sheet: apps/mobile/src/features/queue/QueueDropdown.tsx:41; failed
  card: QueueContents.tsx:63. Reason :255 and retry :257 are siblings after
  RowLink, rather than one compact content/actions row.
- Both queue-presentation.ts:9 / queuePresentation.ts:9 only filter hidden
  IDs, sort completed entries and partition by status; each raw job renders
  independently (web queue-button.tsx:174, mobile QueueContents.tsx:55).
- Both failed rows call processingJobStoppedMessage(stage) with no kind;
  packages/shared/src/processing-job-recovery.ts:16 maps generating_sections
  to reviewer topics even for quizzes. Current shared stage vocabulary is reused
  by quizzes; presentation must translate by kind, never expose raw errors.
- Web globals.css:5371 uses translucent --surface (light rgba white .84).
  Mobile surfaceElevated is already opaque; keep it for the sheet and use it
  for failure cards. Web uses the corresponding existing opaque --elevated token.
- PBR-UX2 explicitly preserved card failure phrases/actions and only repaired
  Queue headers. The inspected screenshot visibly matches these remaining
  source defects. It has no revision/time metadata proving whether it predates
  FS10. FS10 served website / Android 2.4.0 baseline is owner-provided;
  deployed revisions are UNVERIFIED (owner to confirm). No code contradiction
  prevents this slice; no live check is permitted.

Local app.json remains 2.2.0/code 6/runtime 2.2.0-sdk57; prior PBR-AF1 STEP 0
documents deliberate source/release identity differences. This manifest cannot
establish the served FS10 binary or revision. It is preserved; no release bump
or production conclusion is part of QN1.

## Acceptance matrix

| Step | Requirement / proof | Initial result |
| --- | --- | --- |
| 0 | Correct branch, policies, prior reports, screenshot and source causes | PASS source; live revision UNVERIFIED |
| 1 | Unified contained failure card, two-line middle-truncated full-labelled title, secondary retry pill >=44, existing circle meaning, stable retry geometry | PASS (LOCAL; evidence below) |
| 2 | Kind/stage reasons, safe unknown fallback, latest failure per kind/source with count; no history or retry/clear mutation | PASS (LOCAL; evidence below) |
| 3 | Existing opaque token for panel/sheet, nonoverlapping header, unchanged Clear | PASS (LOCAL; evidence below) |
| 4 | Focused and full affected suites; phone/tablet/desktop light/dark long-title/3+ failures screenshots inspected; fresh serial required gates | PASS (LOCAL; evidence below) |
| C | Reconcile plans/handoff, scoped local commits and progress/status | PASS (LOCAL; evidence below) |

Grouping uses authoritative sourceVersionId; source-less rows may only combine
when an explicit retry chain proves identity. Identical names alone cannot prove
the same material. This safe equivalent avoids hiding unrelated same-name files.
Counts describe failed/expired job records, not worker internal attemptCount.
Clear continues to operate on the original ungrouped jobs.

## Owner steps remaining

Rollout and Device checks NOT RUN, skipped entirely. Realme Queue sheet with a
failed reviewer and failed quiz, authenticated/native accessibility and actual
served revisions: UNVERIFIED (owner to confirm). No deploy, migration/SQL,
service/provider call, Scheduler/email/OTA/EAS, environment-file change or push.

## Final local checkpoint: PASS

Implementation 05102204. All code steps and required local gates passed.
Full suites FRESH: **5474 passed / 0 failed / 3 existing API live skips**.
No cached test result is substituted. Forced root gates each report 8/8 tasks,
0 cached; six pre-existing lint warnings, zero new warnings/errors.

Both clients use one bounded failure card, a two-line title prefix with a
separate unshrinking filename suffix (native multiline middle ellipsis is not
portable), full accessible title and web tooltip. The retry label and targets
stay fixed while busy; narrow cards wrap actions within their border. Existing
circle activation opens the same detail route. The native sheet was already
opaque; its token/header remain intact. Web and failure cards use the existing
opaque elevated surface token, since the primary light surface is translucent.

Display-only grouping joins source-version identity and explicit retry ancestry
within each kind, selects the newest failedAt/update and deterministic ID tie,
and counts unique failed/expired job records in the existing bounded Queue
projection. Rows without either identity proof
remain separate even if names match: the safe equivalent avoids merging distinct
same-name materials. Stored jobs, attemptCount, polling, unseen IDs, owner scope,
Clear's raw IDs, retry endpoints/keys/locks/denials and history are unchanged.
No API/database/auth/migration/provider or generation-output change.

### Responsive evidence and limitations

Permanent regression: apps/web/src/features/queue-failures.browser.test.ts.
32 cases = web/native adapted RNW x 320/390/768/1280 x light/dark x normal/200%
text. Five synthetic failures become three cards, including three attempts of
one material, quiz and unknown-stage failures, and long unbroken PDF names.
Actual QueueButton/QueueCard and QueueDropdown/QueueContents/QueueCard plus native
text/surface/action/row/icon functions are extracted from source. Auth/data,
routing, provider calls, batch entries, notices and icon drawings are inert local
adapters. Assertions
cover reason containment, actual button role/44+ targets, full visible suffixes,
opaque cards, no page overflow, header control separation, stable busy geometry,
last-card reachability and Clear's five original IDs. Initial and scrolled PNGs
and geometry JSON are retained in tmp/overnight/QN1/visual/. Representative phone,
tablet and desktop light/dark captures were visually inspected.

This is Chromium/RNW evidence, not Android layout, OS font scaling, screen-reader,
authenticated app or production proof. Native device/assistive technology and
FS10 deployed revisions are UNVERIFIED (owner to confirm).

### Attempts retained

Initial focused mobile 182/15, web 81/10 and shared 735/75 passed before final
regression additions. New browser test first failed two 320px/200% web cases:
111 passed / 2 failed, 10 files passed / 1 failed; the second diagnostic had
the same counts. The overflowing text was the synthetic background word
(rectangles inside the panel were bounded); allowing that fixture text to wrap
retains the no-overflow assertion. Review also found the native suffix could
shrink: it now reserves its width. A third run again had 111/2: comparing retry
viewport positions across Playwright's scroll-into-view produced a collector
failure. Explicitly scrolling before the baseline preserves exact busy geometry
assertions. Subsequent 113/11 focused runs passed. Final full web reruns every
regression against the final CSS and actual native icon dimensions. A final
visual refinement keeps the web retry label on one line. No assertion was
weakened or test skipped. Original logs remain in commands.jsonl. Read-only
discovery misses/truncated reads were corrected before editing the owning paths.

Final ADR review restored the existing native Auto chip styling on failed
automatic jobs. The focused native assertion includes that label; fresh focused
mobile 182/15, full mobile 1,666/176 and focused web 113/11 (all 32 visual cases)
passed afterward. Final forced typecheck/lint followed declaration restoration.
The final screenshots are under tmp/overnight/QN1/visual/1792830654511/;
phone/tablet/desktop light/dark and narrow doubled-text captures were inspected
in the full-web capture set, with final representative captures reinspected.

### Exact commands and counts

| Command | FRESH result | Original log |
| --- | --- | --- |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/screens.test.ts src/features/queue src/design/CourseInteractions.test.ts src/design/QueueButton.test.ts src/design/courseIdentity.test.ts src/features/redesign/presentation.test.ts src/features/redesign/libraryPresentation.test.ts src/features/redesign/courseReviewerActions.test.ts src/features/redesign/listPreferences.test.ts --maxWorkers=2` | Test Files  15 passed (15); Tests  182 passed (182) | tmp/overnight/QN1/focused-mobile-1792830537249.log |
| `npm run test --workspace @stay-focused/web -- src/features/queue src/features/course-batch src/features/generate.test.ts src/features/library.test.ts src/components/queue-button.test.ts src/components/course-options.test.ts src/components/course-navigation.test.ts --maxWorkers=2` | Test Files  11 passed (11); Tests  113 passed (113) | tmp/overnight/QN1/focused-web-1792830651796.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | Test Files  75 passed (75); Tests  736 passed (736) | tmp/overnight/QN1/shared-1792829216361.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1` | Test Files  176 passed (176); Tests  1666 passed (1666) | tmp/overnight/QN1/mobile-serial-1792830551091.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | Test Files  78 passed (78); Tests  617 passed (617) | tmp/overnight/QN1/web-serial-1792829332335.log |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | Test Files  214 passed (214); Tests  2455 passed \| 3 skipped (2458) | tmp/overnight/QN1/api-1792829620502.log |
| `npm run typecheck -- --force` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | tmp/overnight/QN1/typecheck-1792830672096.log |
| `npm run lint -- --force` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | tmp/overnight/QN1/lint-1792830708987.log |
| `npm run build --workspace @stay-focused/api` | exit 0 | tmp/overnight/QN1/api-build-1792829856747.log |
| `npm run build --workspace @stay-focused/web` | exit 0 | tmp/overnight/QN1/web-build-1792829969030.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | exit 0 | tmp/overnight/QN1/android-build-1792830026252.log |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | Tasks:    8 successful, 8 total; Cached:    0 cached, 8 total | tmp/overnight/QN1/root-build-1792830161957.log |

Next ambient declarations restored from exact pre-build copies after checked
generator output; final forced typecheck follows restoration. Both diff checks
PASS at scoped code and documentation staging boundaries. Repo-local temporary
directories/caches, offline Expo/npm, EXPO_NO_DOTENV=1, telemetry disabled and
loopback/environment-read guards were used. No tmp or build output staged.
FRESH diff hygiene: 2/2 commands PASS at each scoped staging boundary. Source
custody: 38/38 PASS; committed source matches tested files 11/11 with only Git
CRLF/LF normalization. Git line-ending and Node color-environment warnings are
retained in the logs; neither is a failed gate.

Commits: 394d4fa6 acceptance freeze; 05102204 implementation; final
documentation commit follows in Git and QN1.status (no self-amend). Author
galaxymaxp <omgraythekid@gmail.com>. Unrelated owner artifacts and all prior
planning/handoff text preserved. Endpoint QN1 reached; no successor admitted.

### Owner steps remaining

- Rollout and Device checks NOT RUN, skipped entirely. Realme Queue sheet with a
  failed reviewer and failed quiz; native accessibility/targets/font scaling;
  authenticated application and served website/Android 2.4.0 revisions:
  UNVERIFIED (owner to confirm).
- Live database/migration/Scheduler/provider state UNVERIFIED; no remote check
  is needed for this code slice. Owner handles the next separately authorized
  fullsend. LM1/TC2/TP1 remain separate tasks. Preserve historical holds.
- No deploy, remote SQL/migration, Supabase/Vercel/Google/Canvas/Resend call,
  Scheduler/email/OTA/EAS, environment-file change, push or device action.
- Vercel CLI is absent; recommend `npm i -g vercel` for future separately
  authorized env/deploy/log work. Installation NOT RUN.
