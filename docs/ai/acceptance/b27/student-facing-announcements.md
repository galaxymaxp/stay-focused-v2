# B27 student-facing Canvas announcements

Date: 2026-09-18 (Asia/Manila)

Verdict: **PARTIAL — announcement routing is correct but student-facing acceptance has remaining presentation issues.**

The production implementation and deterministic verification are complete. Production rollout and authenticated physical rendering of real announcements remain unaccepted because production deployment/database migration were not authorized directly and Expo Go cannot use the installed standalone app's valid authentication sandbox.

## Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `43e27752e5e9aef0fe5c79857e28ae791a6939b4`
- Ahead / behind `origin/main`: 13 / 0 at start
- Dirty files: none
- `git fsck --full`: passed; only pre-existing dangling objects were reported
- No upstream branch was configured. The comparison above uses `origin/main` directly.

## Architecture audit

- Canvas announcements were already fetched per course through `CanvasClient.listAnnouncements` from Canvas `/api/v1/announcements` and persisted through the course-snapshot replacement RPC.
- The existing `canvas_announcements` row retained owner, connection, course UUID and Canvas course identity, Canvas announcement identity, title, `message_html`, chronological dates, workflow/published/locked state, `html_url`, and a fingerprint.
- Course identity was retained in storage, but there was no student announcement read model, experience endpoint, mobile route, Today section, or detail surface.
- HTML was stored. Author and attachment metadata were not retained before B27.
- No read/unread state existed. B27 does not invent one or claim Canvas acknowledgement behavior.
- Announcements did not enter Today, Generate, Tasks, Reviewer sources, or Activity sources. The accepted B26 Generate/Tasks exclusions remain unchanged.
- The synchronized data supplies useful chronological metadata. The live store contains six announcements across CC17 and CC16, all with HTML bodies and Canvas URLs.

## Implementation

- Canvas normalization now retains optional author display names and attachment labels/content types/URLs.
- A forward-only migration adds `author_name` and constrained JSON attachment storage and updates the owner/course-validated snapshot RPC without weakening RLS or grants.
- A shared `StudentAnnouncement` contract exposes student-readable course identity, title, plain body, preview, posted date, author, safe links, attachments, and optional Canvas destination.
- The authenticated experience service composes announcements newest-first, filters explicitly unpublished/locked records, converts Canvas HTML to readable native text, extracts labeled HTTPS links, rejects credential-bearing or token-like URLs, and tolerates absent optional metadata.
- `GET /api/experience/announcements` exposes the owner-scoped result with bounded pagination.
- Today contains a compact recent-announcements section and `View all` entry point.
- A dedicated native announcements route provides loading, error, empty, list, detail, missing-body, author/date/course, link, attachment, and Open-in-Canvas presentation without WebView or raw HTML.
- No AI summarization, urgency ranking, task conversion, ingestion, notification overhaul, or routing redesign was added.

## Routing acceptance matrix

| Content | Expected surface | Result | Notes |
|---|---|---|---|
| Canvas announcement | Announcements | PASS automated / physical pending | New owner-scoped API and Today/list/detail UI; real synchronized rows confirmed read-only |
| Learning PDF | Generate | PASS regression | B26 classifier unchanged; full package tests pass |
| Learning PPTX | Generate | PASS regression | B26 classifier unchanged; full package tests pass |
| Lesson Page | Generate | PASS regression | B26 source eligibility unchanged |
| Assignment | Tasks | PASS regression | Task repository and assignment path unchanged |
| Course outline/orientation | Excluded/separate | PASS regression | B26 administrative exclusion unchanged |

## Automated verification

| Gate | Result |
|---|---|
| Focused Canvas/API/mobile announcement tests | PASS — Canvas 73, API focus 88, mobile focus 23 |
| Canvas package | PASS — 73/73 |
| API package | PASS — 871 passed, 3 skipped (874 total) |
| Mobile package | PASS — 455/455 |
| Shared package | PASS — 44/44 |
| Root typecheck | PASS — 7/7 workspaces |
| Root lint | PASS — 7/7 workspaces |
| Database build | PASS |
| API production build | PASS — 28 static pages/routes generated |
| `git diff --check` | PASS |
| `git fsck --full` | PASS — only pre-existing dangling objects |

The first sandboxed API build could not traverse the checkout's externally linked dependencies. The approved out-of-sandbox API build passed. This is the known local workspace-link condition, not a B27 regression.

## Deployment

- Implementation commit: `6b0a806` (`feat(mobile): add Canvas announcement experience`)
- New B27 deployment: **NOT RUN — explicit production deployment approval is required**
- New migration application: **NOT RUN — installing/running the pinned Supabase CLI requires explicit approval**
- Current production remains the accepted B26.1 deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v` at `https://stay-focused-v2-prototype.vercel.app`, previously inspected as `READY` and healthy at version `2.0.0`.
- No deployment ID or production-health claim is recorded for B27.

The API implementation tolerates existing rows without the new optional columns, but author/attachment retention requires the new migration followed by a fresh Canvas sync.

## Real Canvas data inspected

A read-only, credential-safe database inspection confirmed these synchronized examples without recording message bodies, account email, IDs, or tokens:

- CC17 | CITCS 3F Group A — `Android Studio Activity 09/15/26`
- CC17 | CITCS 3F Group A — `Final Project 09/10/2026`
- CC17 | CITCS 3F Group A — `Online Modality 09/10/2026`
- CC16 | CITCS 2N GROUP A — `Final Grades (CC16 | CITCS 2N GROUP A)`
- CC16 | CITCS 2N GROUP A — `Final Exam Coverage and Schedule`
- CC16 | CITCS 2N GROUP A — `Admission`

All six records have HTML bodies and Canvas destinations. No synchronized body contained an embedded anchor. Attachment availability cannot be established until the metadata migration is applied and a fresh sync retains attachment payloads.

## Physical Android acceptance

Device connectivity passed on the realme RMX3151 running Android 13. The new Expo Go bundle compiled successfully on the physical device and rendered the B27 Today entry point, loading copy, `View all`, and the student-safe unavailable state without raw diagnostics. The device could reach the local API through ADB reverse.

Authenticated live-data acceptance could not continue: Expo Go uses a different application sandbox from `com.galaxymaxp.stayfocusedv2`, so it cannot read the standalone app's valid persisted session. Its own saved session is expired. A proposed short-lived service-role acceptance login was rejected because the task did not directly authorize minting/impersonating a session; no credential was created or exposed. The temporary harness source was fully removed.

| Scenario | Result | Notes |
|---|---|---|
| Discovery | PARTIAL | New Today section and `View all` rendered physically; authenticated data rows not rendered |
| Multiple courses | NOT EXERCISED | Read-only store confirms CC17 and CC16 data; no authenticated device session |
| Detail rendering | NOT EXERCISED | Fixture/component coverage passes; live detail not opened |
| Rich content | NOT EXERCISED live | All live rows contain HTML; safe/readable conversion is fixture-tested |
| Links/attachments | NOT EXERCISED | Live rows have Canvas destinations but no embedded anchors; attachment metadata awaits migration/fresh sync |
| Routing regression | PASS automated / NOT RERUN physical | B26 paths are unchanged and full regressions pass; no fresh authenticated device sync |
| Empty state | PASS automated / NOT EXERCISED physical | Intentional empty state is component-tested |

## Failures and repairs

| Scenario | Failure | Root cause | Repair | Rerun result |
|---|---|---|---|---|
| API full suite | Two sync-route fixtures lacked the newly normalized attachment property | Test fixture drift | Added the canonical empty attachment shape | PASS — 871 passed, 3 skipped |
| Sandboxed API build | External workspace dependency paths were inaccessible | Local sandbox/link boundary | Ran the same API production build outside the sandbox | PASS |
| Physical live data | Expo Go returned `Please sign in again` | Separate app sandbox held an expired session; standalone owns the valid session | No unsafe credential workaround used; source restored | BLOCKED pending direct sign-in or authorized acceptance session/new standalone build |

## Privacy and safety

- No Canvas token, Supabase secret, access/refresh token, account email, raw message body, or raw Canvas identifier is recorded.
- No database row, account, task, source, announcement, or artifact was mutated or deleted.
- Temporary Metro/watch-folder and attempted local acceptance-auth source changes were removed before documentation.
- B26 routing and unrelated repository work remain intact.

## Remaining limitations and next steps

1. Obtain explicit approval to apply `20260918120000_canvas_announcement_student_metadata.sql` with a pinned Supabase CLI and deploy commit `6b0a806` to production Vercel.
2. Provide a direct Expo Go sign-in, explicitly authorize a short-lived acceptance session, or build/install a new standalone APK; then rerun all seven physical scenarios after fresh Canvas sync.
3. If the synchronized account still has no attachment-bearing announcement after migration/sync, record attachment interaction as `NOT EXERCISED` rather than manufacturing evidence.

B28 must not begin until production rollout and authenticated physical B27 acceptance are complete.

## Final verdict

**PARTIAL — announcement routing is correct but student-facing acceptance has remaining presentation issues.**
