# B23 Mobile Recovery Foundation

Date: 2026-09-12 (Asia/Manila)

## Verdict

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.**

## Starting state

- Branch: `main`
- Starting HEAD: `83d033e251241a23bc80deb6649984b98f5de14c`
- Origin comparison: 33 commits ahead, 0 behind
- Pre-existing dirty state: untracked `docs/ai/acceptance/b8/`; it was not modified, cleaned, staged, or committed
- Git integrity: `git fsck --full` passed with only the pre-existing dangling blobs
- Physical target: realme RMX3151, Android 13, package `com.galaxymaxp.stayfocusedv2`
- Installed baseline: app `2.0.0`, build code 1, original Android font scale 0.9

Fresh pre-implementation verification passed: Canvas 73/73, API 626/626,
mobile 389/389, engine 606/606, and all forced root gates.

## Existing lifecycle analysis

B22 accepted a durable Reviewer job and kept its status in screen state. Its
generic active-job reference was written to SecureStore after acceptance, but
the Canvas screen did not read that reference on a remount or relaunch. The
pending source identity, source snapshot association, save identity, and
request idempotency key otherwise lived only in component state and refs.

Backgrounding without unmounting was already safe: AppState stopped the timer,
the server continued, and foregrounding immediately reconciled the same job.
A component remount or Android process death lost the Canvas orchestration,
however, so the app could not reconnect to a running or completed-but-unseen
job. A response interrupted after server acceptance also left no durable link
from the Canvas screen to the accepted job. Automatic Library persistence used
a plain insert, so a process loss after the database commit but before local
cleanup could make a safe retry fail or tempt a duplicate save.

The selected minimum design reuses the existing durable job API. It persists a
small Canvas-specific recovery record before submission, binds the exact job
after acceptance, routes the restored authenticated session back to the owning
course, retrieves status/result from the server, and makes snapshot-bound
Library persistence idempotent. Recovery never calls Create Reviewer by itself.

## Implementation

| Area | Change | Files |
| --- | --- | --- |
| Recovery record | Versioned, user-scoped SecureStore record written before submission and bound to the exact accepted job/source version | `apps/mobile/src/services/canvasReviewerRecoveryStore.ts` |
| Relaunch routing | Restored authenticated sessions with recovery state return to the exact course Reviewer route once | `apps/mobile/src/app-shell/AppLifecycle.tsx` |
| Reviewer orchestration | Reconnects running/completed jobs, resumes polling, retains identity across transient errors, fails closed on mismatches, and uses explicit new retry identities | `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx` |
| Account isolation | Sign-out clears Canvas recovery and generic active-job references for the outgoing owner | `apps/mobile/src/auth/AuthProvider.tsx` |
| Replay-safe save | Recovery can rebuild a save draft from non-secret metadata; API upsert and a unique owner/snapshot index make retries converge on one row | `canvasStudyWorkflow.ts`, `apps/api/app/api/reviewers/route.ts`, `packages/db/migrations/20260911174606_add_reviewer_snapshot_idempotency.sql` |
| Accessibility/large text | Adds useful labels/states for Study materials, source groups, progress, terminal alerts, and button busy/disabled behavior; button copy may shrink instead of disappearing | `CoursesScreen.tsx`, `CanvasSourceReviewerScreen.tsx`, `Button.tsx` |
| Regression coverage | Adds recovery persistence/policy, identity, interruption, corruption, account, retry, and source-safe save tests | `canvasReviewerRecoveryStore.test.ts`, `canvasStudyWorkflow.test.ts`, `route.test.ts` |

## Recovery-state contract

Android uses the existing SecureStore-backed `sessionStore` key
`stay-focused-v2.canvas-reviewer-recovery.v1`. Version 1 stores only the owner
user ID, request idempotency key, nullable accepted job ID/source-version ID,
course ID/name, one canonical Canvas item ID, resolution fingerprint, source
title, source character count, and creation/acceptance timestamps. It does not
store source text, OCR output, generated output, Canvas credentials, Supabase
tokens, OpenAI credentials, or authorization headers.

Unaccepted ambiguity expires after two minutes; accepted state expires after
seven days. Malformed, wrong-version, wrong-user, mismatched-source, and
nonexistent/non-retryable records fail closed. Temporary API failures retain
the record and resume polling. Sign-out removes the outgoing user's recovery
and active-job references before the session is cleared.

## Persistence and database rollout

Migration `20260911174606` found zero existing duplicate owner/snapshot groups,
removed no production rows, and created
`reviewers_owner_source_snapshot_unique (user_id, source_snapshot_id)`. PostgreSQL
continues to permit multiple non-Canvas rows with a null snapshot. The Reviewer
POST now upserts on that exact owner/snapshot key, so a recovery replay returns
the one logical saved Reviewer.

The migration is present locally and remotely. Pre-rollout security and
performance advisor checks reported no errors. Production API deployment
`dpl_DPWVh9xowqTCR4ntcdQt1PrwZamF` is Ready and aliased to
`https://stay-focused-v2-prototype.vercel.app`; the canonical health endpoint
returns HTTP 200 with `{"status":"ok","version":"2.0.0"}`.

## Automated verification

| Suite | Fresh result | Count / notes |
| --- | --- | --- |
| Canvas | PASS | typecheck; 1 file, 73/73 tests |
| API | PASS | typecheck; 71 files, 626/626 tests |
| Mobile | PASS | typecheck; 33 files, 411/411 tests |
| Engine | PASS | typecheck, build, 606/606 eval assertions |
| Root | PASS | forced typecheck 7/7, lint 7/7, build 7/7; no root test script exists |
| Lint | PASS | zero errors; four unchanged `import/first` warnings in pre-existing mobile service tests |

Coverage includes same-record background/foreground reads, component
recreation, exact job/course/source recovery, owned-history discovery for
acceptance-response ambiguity, running and completed recovery without a create
call, transient poll retention, nonexistent/stale/corrupt/user/source mismatch
handling, sign-out, explicit retry identity, duplicate-submit idempotency,
single-flight saving, Library API reopen, and student-facing state copy.

## EAS build and physical Android acceptance

- Final EAS preview build: `a1140081-b3a8-4c1d-90cc-3846980f97b9`
- App version: `2.0.0`
- Distribution: internal Android APK
- API target: `https://stay-focused-v2-prototype.vercel.app`
- Artifact: `https://expo.dev/artifacts/eas/AXQkYnkU8eUSOfmw32oFaOKrxXfLGsgXZqVGSmSYEA0.apk`
- APK size: 106,356,377 bytes
- APK SHA-256: `8519B05CCA910EDBEEC5CF232A99268BB1284CF5E7588184F5043B8DF6B4C21F`
- Installation: PASS — `adb install --no-streaming -r` returned `Success`, with the authenticated session retained
- Device: physical realme RMX3151, Android 13

The physical workflow used the real CIT6 course and its 23-page
`CIT6 Course Introduction and Orientation 2026.pdf`. The first intentional
B23 submission survived background/foreground with the same Android process
and durable job. A real Wi-Fi interruption produced the concise
`Status temporarily unavailable` state, retained that job identity, resumed
when Wi-Fi returned, rendered 20 sections, and saved automatically. A rapid
double tap still created one logical job.

A second intentional submission was required because the first completed too
quickly to prove process death while running. The second job was confirmed
server-side as running before force-stop. Relaunch used a new Android process,
routed to the owning course, displayed the same in-progress 20-of-20 job, and
did not expose or invoke Create Reviewer. It then rendered the correct
20-section result and saved automatically. Study Library grew from five to
seven entries, reopening the latest saved result did not create another job,
and the final Android crash buffer contained zero matches.

| Recovery scenario | Physical result | Supporting result |
| --- | --- | --- |
| Background/foreground | PASS | Same process and durable job resumed |
| Process death while running | PASS | Force-stop removed the process; relaunch reattached to the same server job |
| Temporary network loss | PASS | Recoverable message shown; identity retained; completion resumed after connectivity returned |
| Completed while absent | Not separately induced physically | Automated recovery uses the same exact-job terminal retrieval path and passes |
| Terminal failure and explicit retry | Not induced against production | Deterministic policy and screen tests pass; retry creates a new request identity only after terminal failure |
| Sign-out/account mismatch | Not induced against production | Store and auth tests clear or reject owner-mismatched state |
| Stale/corrupt state | Not induced against production | Store tests fail closed and remove invalid records |

Production evidence after the run found exactly two intentional B23 jobs, two
distinct job identities, both `succeeded`, `attempt_count=1`, and
`reuse_mode=fresh`. Their two distinct result snapshot identities each have
exactly one owner-scoped Reviewer row; total B23 saved Reviewers: two. Provider
executions: **Not directly observable**. Durable result metrics separately
reported four provider calls for each intentional job.

The second result retained exact Canvas provenance for resource `11437391`:
one canonical file source, one item, 23 extraction blocks spanning pages 1–23,
7,211 source characters, 20 sections, coverage 1.00, grounding 1.00, zero
grounding/fabrication issues, passed leakage, and one disclosed safe fallback
section. That fallback is a retained content-quality limitation, not a recovery
failure.

Large-text validation temporarily changed the physical device from font scale
0.9 to 1.35. Courses, Study materials, Ready/Prepare/unavailable rows, Create
Reviewer, progress/error states, the scrollable reader, Library, and reopen all
remained reachable and understandable. Cards became taller and wrapped more,
but no action was blocked. The setting was restored through Android Settings;
final state is font scale 0.9, Wi-Fi enabled, and mobile data enabled.

## Scope boundary

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

No navigation, screen, brand, typography, spacing,
animation, Reviewer-quality, OCR, format-ingestion, or multi-source redesign is
part of this milestone.

The accepted sequence remains:

```text
B24 — Complete Stay Focused V2 mobile UX/UI redesign specification
B25 — Design system + app shell implementation
B26 — Core experience redesign
B27 — Remaining application redesign
B28 — Full design QA + pilot freeze
```
