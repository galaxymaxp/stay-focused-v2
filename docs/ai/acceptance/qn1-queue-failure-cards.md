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

## Acceptance matrix

| Step | Requirement / proof | Initial result |
| --- | --- | --- |
| 0 | Correct branch, policies, prior reports, screenshot and source causes | PASS source; live revision UNVERIFIED |
| 1 | Unified contained failure card, two-line middle-truncated full-labelled title, secondary retry pill >=44, existing circle meaning, stable retry geometry | Pending |
| 2 | Kind/stage reasons, safe unknown fallback, latest failure per kind/source with count; no history or retry/clear mutation | Pending |
| 3 | Existing opaque token for panel/sheet, nonoverlapping header, unchanged Clear | Pending |
| 4 | Focused and full affected suites; phone/tablet/desktop light/dark long-title/3+ failures screenshots inspected; fresh serial required gates | Pending |
| C | Reconcile plans/handoff, scoped local commits and progress/status | Pending |

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
