# B38.2 Physical-use repair: Canvas sync, navigation, Reviewer navigation, IA, motion, theme

Date: 2026-09-25 · Branch `b25-3-3-ai-first` · Start `0c0f28e` · End `2974ced` (+ this record)
Device: realme RMX3151, Android 13, signed B37 preview build `f0d6d63e`, JS delivered by EAS preview updates.

**Verdict: PASS with limitations.** Every defect reported from physical use was reproduced on the unchanged build, repaired, and re-verified on the device. Physical acceptance also surfaced five further defects, which were repaired and re-verified in the same slice. Screen recording is NOT RUN (the ROM has no `screenrecord`). Physical Reduced Motion is BLOCKED (the ROM refuses shell writes to the animation settings); it has automated coverage only.

## 1. Canvas sync (P0)

### What was actually wrong

Production evidence, read-only:

- Every durable `canvas_sync_jobs` row ever recorded had succeeded, and the Canvas connection was `active` with no error code. The worker, credentials and Canvas API were healthy.
- The newest job was created on **2026-09-19**. Nothing had synced in six days.

Reproduced on the unchanged build:

- The only sync trigger was the legacy "Canvas connection & sync" page, reached from a "…" menu, with separate Save and "Sync selected" steps. Every visible "Refresh" only re-read stored rows, so the app looked current while showing six-day-old data. Pressing "Sync selected" at 01:12 UTC created 6 jobs that all succeeded, and fresh data arrived: CIT6 went from 5 to 6 assignments and 0 to 1 announcement, CC17 from 3 to 4 assignments.
- **No account had ever run a grade/submission sync.** `canvas_assignment_submissions` had 0 rows, so every past-due assignment was treated as not submitted. Tasks showed "Capstone Project 1: 4 missing, 0 completed"; Canvas records 5 of 6 submitted and none missing.

### Latent defects found and fixed while tracing

- **Stale idempotency-key replay.** `create_canvas_sync_job_v1` returns the original job for any repeated key for 30 days. The client reused a key whenever its local reference still said `queued`/`running`, and those references were retained indefinitely. A sync request could therefore return an old, finished job and report "started" without doing any work. A mutation test proves this: the new test fails against the old store. It was not the failure observed on this device.
- **Lost-update race.** All job references live under one SecureStore key. Six courses starting at once interleaved read-modify-write cycles and dropped references. Reconciliation only visits stored references, so the first new-build run stuck at "4 of 6 courses" while all 6 jobs had succeeded on the server. The legacy settings page had the same race.
- `canvas_sync_job_in_progress` was not mapped to `sync_in_progress`.

### Repair (mobile only; no API, schema or migration change)

- `CanvasSyncProvider` gives the whole app one account-level sync. It starts, for each selected course, the existing durable `course_content` **and** `course_grades` jobs. It polls the started jobs by id, resumes running jobs when the app returns to the foreground, and refreshes automatically when data is more than 6 hours old (at most once per 30 minutes). On completion it bumps a data version, so every screen reloads in place.
- `SyncStatus` shows one quiet line on Today, Generate and Tasks:
  - "Synced 14 minutes ago" with a sync button
  - "Syncing Canvas… 2 of 6 courses"
  - "Canvas couldn’t be refreshed · Last synced … · Retry"
  - offline and reconnect/setup states
  Pull to refresh also syncs.
- Outcomes are reported honestly:
  - A failed or rejected course makes the refresh `partial`, with a Retry action.
  - Succeeded jobs whose Canvas areas were withheld (this Student account cannot list course-level Files/Pages, the same as on every previous run) are `limited`: "Synced just now · Some Canvas areas aren’t shared with students". This is never reported as a plain success.
- Idempotency keys are reused only for an unacknowledged submission less than 10 minutes old. Replayed finished jobs are detected and resubmitted under a fresh key. Store writes are serialized. Jobs the server no longer knows stop being tracked.
- Diagnostics log only counts and stable codes, for example `[canvas-sync] finished {"phase":"limited","courses":6}`.
- Tasks says **"Past due"**, not "Missing". It is derived from the deadline and the recorded submission, not from Canvas's `missing` flag.

### Physical proof

- One tap on the status control started 12 jobs (6 content, 6 grades). Progress ran 0 → 2 → 3 → 5 → 6 of 6 courses and settled at "Synced just now · Some Canvas areas aren’t shared with students". The database shows all 12 succeeded: content in up to 253 s, grades in up to 77 s.
- The account now has 55 submission rows, 31 submitted. Tasks shows Capstone Project 1 as "1 due, 0 past due, 5 completed".
- When the device clock passed the 6-hour threshold, relaunching refreshed automatically.

Routing separation is unchanged: announcements are not in Generate, and assignments appear in Tasks only when they have a deadline or can be submitted.

## 2. Announcement trap

**Cause (reproduced).** Today opened the list with `announcementId` in the URL. An effect re-selected that announcement whenever the selection became null, so Close and Android back (`onRequestClose`) reopened the sheet immediately. "Open in Canvas" was the only way out.

**Repair.**
- Announcement detail is a modal stack route (`/announcement`) with a pinned **Done** button (73×55 dp) and a separate pinned "Open in Canvas".
- The shared `Sheet` pins Done in its header, dismisses on backdrop tap, lets its scroll area shrink, and takes insets from the provider.

**Physical results:**
- Done returns to Today.
- Android back returns to Today.
- Open in Canvas opens the browser. Returning to the app keeps the announcement open, and Done still works.

## 3. Generate navigation

**Cause.** The selected course and material were `useState` inside the tab's root screen. The tab navigator's back therefore went to Today.

**Repair.** The courses stack now has one route per level: `/courses` → `/courses/[courseId]` → `/courses/[courseId]/material`.

**Physical results.** Android back, header Back and the left-edge swipe each go material → course → course list, never to Today.

## 4. Reviewer find and topic scrubber

**Find** (header search icon, then a pinned search bar):
- Searches every rendered segment: topic titles, block titles, explanations, key points and examples.
- Case- and accent-insensitive, with exact highlight offsets. The active match is strong yellow; other matches are soft.
- Shows a count ("1 of 6"), previous/next, and "No matches for “…”". A query needs at least 2 characters.
- Runs locally; nothing is sent to a server.

**Topic indicator.** The header subtitle shows "13 of 25 · Second-Generation Firewalls" and follows both search jumps and scrolling.

**Scrubber:**
- A slim thumb appears while scrolling.
- Touching and holding still within 30 dp of the right edge for 160 ms activates it: scrolling locks, a bubble names "n / 25 · Topic", ticks mark the topics, and the page follows topic by topic. Release settles on that topic.
- It uses the Reviewer's own topics as anchors. A single-topic Reviewer uses its block headings; with fewer than two anchors it scrubs by proportional position.
- The scroll view reports raw touches to it, so nothing is claimed and edge swipes still scroll natively.
- An open search stays open while scrubbing.

**Physical results (25-topic Firewalls Reviewer):**
- "stateful": 6 matches, jumped to Topic 13.
- Next/previous step 1 → 2 → 3 → 4 → 3.
- The phrase "keep track of network connections" found 2 matches.
- "blockchain" showed the no-match state.
- "packet": 34 matches, stepping across Topics 5 and 6.
- Scrubbing previewed 6 → 12 → 21 and settled on Topic 21, with the header synced.
- Edge swipes at x = 990, 1030 and 1060 px scroll without activating the scrubber (the first two builds of the scrubber had a dead strip; fixed in `984365a` and `3e8c0fc`).
- Scrolling resumes normally after a scrub.

## 5–7. Information architecture and course identity

- **Tasks:** course cards show real due / past due / completed counts. Courses with past-due work come first, then the nearest deadline; personal tasks come last. A course lists past due (most recently missed first), then due soon (7 days), then upcoming (undated last), then completed, collapsed. Task → back → course → back → Tasks works.
- **Library:**
  - Grid: a two-column (three from 560 dp) course grid of uniform tiles, with titles clamped to 3 lines. Tiles were ragged before `dc43f40`, which you reported.
  - Course view: an All / Reviewers / Quizzes / Activities segmented control, verified filtering on IT Security.
  - Data: artifacts and persistence are unchanged.
- **Generate:** cards lead with the course title. The repeated generic course icon is removed; the left accent line was removed at your request.
- **Course identity:** `courseIdentity()` parses Canvas "CODE | SECTION | TITLE" names and title-cases shouting titles while keeping acronyms and numerals, e.g. "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1" → "Capstone Project 1" / "CIT6 · CITCS 3N Group A". An FNV-1a hash of the course id picks one of 8 restrained accents (no red) and a monogram. Generate, Tasks, Library and the Reviewer header use the same identity.
- **Canvas course images:** `canvas_courses` stores no image or banner field, so none is fetched. The deterministic identity is the only treatment, as allowed by the brief.

## 8. Motion

- Hierarchy uses the native `slide_from_right` transition; announcement, task and text/camera Generate use `modal` with `slide_from_bottom`; tabs cross-fade.
- Reduced Motion uses a 150 ms fade with no travel for stacks and no tab animation.
- Segmented control, press scale and ring handles use springs on the native driver.
- Frame timing over repeated push/pop plus tab switches with live data loading: 387 frames, 17.1% janky, p50 24 ms, p90 44 ms, p99 113 ms, 34 slow UI-thread frames. This is heavier than B36's measurement (11.4%, p90 28 ms, a reading workload) and is recorded as remaining work.

## 9. Free-time ring

- Visuals: a flat neutral track, a single theme-accent free-time arc, thin inner lines for scheduled items, a small "now" dot, white thumbs with an accent ring and a soft hold halo.
- While a handle is held, the center shows "FREE UNTIL 9:00 PM · 3 h 30 min".
- Gesture, haptic and accessibility behavior are unchanged.
- Physical acceptance found that dragging a handle downward started pull-to-refresh and cancelled the handle. Fixed in `2974ced`: Today pauses pull-to-refresh while a handle is held. Re-verified: the drag committed and produced a plan preview, which was not applied.

## 10. UC-inspired theme (not official UC branding)

- **Brand source:** no verified UC brand asset or token exists in the repository. The palette is labelled "UC-inspired" and the Appearance screen states "This is not official UC branding".
- **Light tokens:** accent crimson `#9E1B32` (about 10.7:1 on white); neutral `#F6F6F4` background; charcoal `#161616` text.
- **Dark tokens:** accent `#F08C99` on `#0B0B0C`.
- **Danger:** moves to burnt orange (`#B4470F` light, `#FFB27D` dark), so past-due work never reads as the brand color.
- **Where red appears:** selected tab, primary actions, the free-time arc, links.
- **Course accents:** exclude red.
- **Physical check:** light and dark were checked on Settings, Today, Generate, Tasks, Library and the Reviewer. The user's Light + Stay Focused preference was restored afterwards.

## Verification

| Check | Result |
|---|---|
| Mobile tests | FRESH — 569/569 (52 files) |
| Mobile typecheck | FRESH — pass |
| Mobile lint | FRESH — 0 errors, 4 pre-existing `import/first` warnings |
| `git diff --check 0c0f28e..HEAD` | FRESH — pass |
| Mutation check (stale-key replay test vs old store) | FRESH — fails on old code, passes on fix |
| API / Canvas / shared / engine suites | NOT APPLICABLE — no changes outside `apps/mobile` |
| Root build / deployment / migration | NOT APPLICABLE — none required |
| Physical acceptance (flows above) | FRESH — pass |
| Screen recording | NOT RUN — ROM has no `screenrecord`; no recorder installed |
| Physical Reduced Motion | BLOCKED — `settings put global *_animation_scale` denied (`WRITE_SECURE_SETTINGS`); automated only |

## Delivery

- Commits: `53b5b59`, `eb156f8`, `b7fde12`, `5bc01ed`, `dc43f40`, `c1d9bc8`, `984365a`, `3e8c0fc`, `2974ced`. Nothing was pushed.
  - Note: the two old route-file deletions (`(tabs)/work.tsx`, `(tabs)/library.tsx`) were staged early and landed in `53b5b59` rather than `eb156f8`.
- EAS updates on channel `preview` (runtime 2.0.0, Android), each exported with dotenv disabled and checked for the production API and Supabase hosts, no localhost/LAN hosts, and no service-role material: `e990a841`, `ad85db0c`, `4d6aa2d7`, `0a10445f`, `3c656599`, `b593f608`, and final `7b04c8e2` at `2974ced`.

## Remaining limitations

- Frame timing (above) needs a dedicated performance pass. Likely causes are Page mount fade plus list rendering on data load.
- 8 accent hues for about 7 visible courses: two pairs currently share an accent (CC17/FL 100, CIT6/Personal).
- UC-inspired: the dark accent reads rose rather than crimson (a contrast trade-off), and accent-colored "Not synced · Tap to sync" reads slightly alarming in red.
- "Past due" totals (3) differ from Canvas's `missing` flag count (4). The app does not read that flag; exposing it would need an API change.
- The Reviewer's artifact title and source line are not searchable; only the body is.
- Course-level Files/Pages listings stay unavailable to this Student account (pre-existing, not a regression).
- The 21 evidence screenshots exclude all frames that showed a third-party chat overlay. Frame 08 predates the Reviewer header polish.

Evidence: `device/01`–`device/21`.
