# B36 signed physical UX + offline acceptance

Date: 2026-09-23 (Asia/Manila)

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `f88b0c2`
- Dirty files before B36: none
- Git author: `galaxymaxp <omgraythekid@gmail.com>` (repository owner, not Codex)
- Physical device: realme RMX3151, Android 13 (SDK 33), ADB serial `PB6DWWEIHAUCMZOR`,
  1080x2412 at density 480 (360dp logical width)
- Build previously installed on the device: EAS `3f001662` at commit `7410a31`
  (2026-09-19), which predates both B34 and B35. Nothing on this device had yet
  exercised the B34 UX overhaul or expo-sqlite, which is consistent with B34
  recording its physical items as BLOCKED.

## 2. Environment readiness

| Variable | Local | EAS preview |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | present (`apps/mobile/.env.local`) | present |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | present (`apps/mobile/.env.local`) | present (marked sensitive) |
| `EXPO_PUBLIC_API_BASE_URL` | present (`apps/mobile/.env.local`) | supplied by the `preview` profile `env` block in `apps/mobile/eas.json` |

- Secret values printed: NO
- No EAS environment variable was created, changed, or removed. All three public
  values were already resolvable for the preview profile, so no configuration
  was required.
- `SUPABASE_SERVICE_ROLE_KEY` and other server-only secrets were never read or
  printed.

## 3. Pre-build verification

Run fresh against `f88b0c2` before any B36 change.

| Check | Result | Notes |
|---|---|---|
| `npm run typecheck -- --force` | PASS | 7/7 workspaces, 0 cached |
| `npm run lint -- --force` | PASS | 7/7; only the 4 accepted pre-existing `import/first` warnings |
| `npm test --workspace @stay-focused/mobile` | PASS | 42 files, 505/505 |
| `npm test --workspace @stay-focused/api` | PASS | 88 files, 895 passed, 3 opt-in skipped |
| `npm test --workspace @stay-focused/canvas` | PASS | 73/73 |
| `npm test --workspace @stay-focused/shared` | PASS | 44/44 |
| `npm ci --dry-run` | PASS | lockfile consistent |
| `npm run build --workspace @stay-focused/mobile` (expo export) | PASS | android/ios/web bundles emitted |
| `git diff --check` | PASS | clean |

Every total matches the B35 baseline exactly. No failure was introduced by B36
at this point because no code had changed yet.

Failure classification: no PRE-EXISTING and no B36 INTRODUCED build/test
failures. The defects recorded in section 18 are runtime/product defects found
on the device, not build or test failures.

## 4. Signed build

Two signed builds were produced: the first to run acceptance, the second to
verify the repairs made during acceptance.

| | Build 1 | Build 2 (final) |
|---|---|---|
| EAS account | `galaxymax` | `galaxymax` |
| Project | `@galaxymaxp/stay-focused-v2` (`2b3a9db6-3712-4ed0-8365-17d9936562dd`) | same |
| Profile | `preview` (internal distribution, `buildType: apk`) | same |
| Commit | `f88b0c2` | `1e81edd` |
| Build ID | `0dc19cdd-3fdb-45d4-985b-23921e8a05ef` | `245ccaec-3888-4144-b27d-a76c95aebe8b` |
| Artifact | signed APK, 108 MB | signed APK |
| Result | FINISHED | FINISHED |

- Installed version: `com.galaxymaxp.stayfocusedv2`, versionName `2.0.0`,
  versionCode `1`, minSdk 24, targetSdk 36. The preview profile does not
  auto-increment, so build identity was confirmed by install time and by the
  APK being installed directly from the downloaded EAS artifact rather than by
  versionCode.
- `expo-sqlite` included: YES. `unzip -l` on the downloaded APK lists
  `lib/arm64-v8a/libexpo-sqlite.so` (plus armeabi-v7a, x86, x86_64).
  `expo-sqlite ~16.0.10` is a declared dependency and `"expo-sqlite"` is in the
  `app.json` plugin list. Native libraries are not extracted on this device, so
  runtime behaviour (sections 11-13) is the operative proof.
- Signing: installed with `adb install -r` over the existing preview build and
  accepted, which means the signing identity is unchanged
  (`PackageSignatures{... version:2, signatures:[c7cec06], past signatures:[]}`).
  No credential was created, rotated, or replaced. EAS never prompted for
  credentials; `--non-interactive` would have failed the build rather than
  generate a new keystore.
- Not published to any app store.
- The pre-B35 APK was not reused, and Expo Go (`host.exp.exponent`, present on
  the device) was not used for any acceptance step.

## 5. Authentication

- Sign in: the existing SecureStore session survived the reinstall, so the app
  opened straight into Today with no sign-in screen and no
  "Supabase mobile auth is not configured" error.
- Canvas data: real owner-scoped data loaded — CC17 announcements on Today, 81
  synchronized courses in Generate.
- Relaunch: `adb shell am force-stop` followed by relaunch preserved the session
  every time (performed repeatedly across sections 12, 13, and 17).
- Authenticated API: authenticated reads and writes both succeeded. The Today
  ring handle drag committed a plan change to the server, and a real Reviewer
  generation completed end to end.
- Sign-in screen: PASS. Reached after the section 16 logout — "Sign in to
  continue" with email, password, Sign in, and Create an account.
- Fresh credential sign-in: PASS. The owner signed in with real credentials after
  the logout test, the session was established, and the Library rebuilt from the
  cloud. No credential was seen, stored, or entered by the agent.
- Result: PASS. No auth bypass, no injected token, and no authentication code
  was changed.

## 6. Generate physical acceptance

| Check | Result | Notes |
|---|---|---|
| Generate root shows synchronized courses directly | PASS | Course cards render immediately under "Study tools from your synced courses"; no generic "Choose a course" selector and no implicit first-course selection |
| Unsynced/arbitrary courses absent | PASS | Every card carries a real `Synced <date>` stamp |
| Tapping a course works | PASS | Opens the course workspace with a back affordance |
| Instructional materials appear | PASS | CC17 shows "Lecture Presentations" (2) and "Assignments/Worksheets and Answer Keys" (1) with per-item `PPTX - ready` / `needs preparation` status |
| Announcements excluded from Reviewer sources | PASS | No announcement appears in the material groups; announcements remain a Today surface |
| Course outlines not used as the normal demo source | PASS | No outline pseudo-source is offered |
| Tasks remain separated | PASS | "Activities and tasks - Deadline-bearing Canvas work stays in Tasks." links out rather than mixing into materials |
| Reviewer actions available where appropriate | PASS | "Generate Reviewer" enabled only for `ready` material; `needs preparation` material offers "Prepare material" and disables Reviewer with "Prepare this material first" |
| Quiz gated on the persisted Reviewer relationship | PARTIAL | The gate is closed and correctly worded, but it can never open on this branch. See defect 3 in section 18 |
| No title-matching shortcut | PASS | Confirmed in code and in the database: the relationship is resolved through snapshot ids, never titles |

Loading, error, and empty states were all exercised with real data. Structural
skeletons (not a blank canvas) render while courses and materials load, and a
course whose live Canvas content could not be listed produced an explicit
"Materials could not be loaded" surface with a working "Try again".

Two observations that are not B36 defects:

- `GET /api/experience/courses/{id}` returns 503 `unavailable` for several
  courses. The Vercel runtime log records
  `experience.request.failed { code: 'unavailable', status: 503 }` on
  deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd`. The cause is upstream: the
  workspace calls `listCanvasReviewerSources`, a live Canvas request, and the
  in-app Canvas panel reports "Some Canvas areas could not refresh" with the
  connection last verified 2026-08-29. Courses whose modules still resolve
  (CC17) load normally. This is a Canvas/data condition, not a B36 regression,
  and the UI reports it honestly.
- A first Reviewer generation from `Module 1 - Introduction to the Android
  Platform.pptx` failed with
  `reviewer_generation.failed { category: 'contract', findings: ['request_exceeds_context_budget'] }`.
  The material is simply too large for the generation contract. This belongs to
  B37 generation quality. The failure surfaced correctly in the UI and, per
  B35 policy, was not written to the device store.

## 7. Reviewer physical acceptance

| Reviewer | Duplicate headings | Hierarchy | Readability | Scroll | Result |
|---|---|---|---|---|---|
| Reviewer in Journaling and Basic Accounting (CIT5, `2-Journaling.pdf`) | None | Obvious | High | Smooth | PASS |
| Japanese Lesson Reviewer: House, Daily Life, Time, Questions, and Assessment Requirements (FL 100) | None | Obvious | High | Smooth | PASS |
| Android Development Environment and Introduction to Android Studio Reviewer (CC17, generated during B36) | None | Obvious | High | Smooth | PASS |

- Hierarchy reads as intended on device: accented `TOPIC n` eyebrow, 22pt section
  title with a hairline rule, body explanation at 16/26, a tinted `KEY POINTS`
  group, and left-bordered `DETAILS & EXAMPLES` evidence. The four treatments are
  visually distinct, so no repeated identical card treatment flattens the page.
- Duplicate-heading suppression works: no block title repeats its section title.
- Long titles wrap correctly. The Japanese Reviewer title wraps to four lines and
  the CC17 title to four lines, with no clipping or truncation.
- Long sections stay readable and scrolling is smooth through at least Topic 6.

## 8. Generation physical acceptance

One real generation was run to completion from eligible instructional material
(`Android Development Environment.pptx`, CC17), after preparing that material
on device.

- Visual quality: PASS. The previous purple/blue orb is gone. The replacement is
  a restrained study field — a centred rounded source mark with a book glyph,
  orbiting gradient arcs, and a dashed guide ring. It reads as intentional and
  matches the product's rounded, soft-gradient language.
- Position stability: PASS, and verified against a genuine multiline case. With a
  one-line status ("Preparing your request...") the visual centre sat at y≈1022;
  when the status became two lines the centre stayed at y≈1022. The status region
  reserves `minHeight: 56` at a fixed 270pt width, so status changes cannot push
  the visual.
- Animation: PASS. Six consecutive screen captures during an active generation
  were all different, confirming continuous motion on the device. Transforms and
  opacity run on the native driver and the loop stops when the screen is
  unfocused or backgrounded.
- Status transitions: PASS. "Preparing your request..." to "Waiting to begin..."
  to completion, with the supporting copy switching from "Keep the app open until
  your request is accepted" to "You can leave this screen. We'll keep working."
  No flicker and no restart was observed.
- Queue: PASS. Queue reflects live state accurately — during the run it showed
  the job, and afterwards `Generating: None`, `Queued: None`, `Completed: 38`.
- Leave/reconnect: PASS. Leaving the generation screen mid-run did not cancel the
  job; it completed while the app was on other tabs and was retrievable from
  Queue.
- Completion: PASS. The job is recorded as Completed with a green check in Queue,
  and the artifact exists server-side (`generated_artifacts` row
  `e5b1af02-3247-4393-822d-534efd15757e`, created 2026-09-22 21:56 UTC).
- Open in Library: PASS. The finished Reviewer appeared at the top of the Library
  as "Android Development Environment and Introduction to Android Studio
  Reviewer", CC17, Updated Sep 23, and opens into the full reader.
- Result: PASS.

One observation, not treated as a defect: after a terminal failure the study
field keeps orbiting rather than settling. It is quiet and non-distracting, but a
resolved or stilled state would read better on a failed job.

No screen recording was committed. The repository's acceptance convention is PNG
evidence under `docs/ai/acceptance/<milestone>/device/`, with no video anywhere in
`docs/`, so motion is evidenced by frame sequences and by the frame statistics in
section 17 instead.

## 9. Library UX acceptance

- Tap: PASS. Each of All, Reviewers, Quizzes, and Activity Outputs selects and
  scrolls its page into place.
- Swipe: PASS. All to Reviewers to Quizzes to Activity Outputs and all the way
  back settles cleanly on every page.
- Indicator: PASS. The rounded capsule follows gesture position and interpolates
  both translation and width, and the tab strip auto-scrolls the selected tab
  fully into view.
- Vertical/horizontal gestures: PASS. Each page owns its vertical scroll, the
  pager is `directionalLockEnabled`, and diagonal gestures did not produce a
  stuck or fighting scroll.
- Loading: PASS. Structural skeletons appear only when nothing is stored yet.
  Once local rows exist, reconciliation shows "Checking for updates..." above the
  existing content and never blanks it.
- Cards: PASS. One compact anatomy throughout — type chip, course code, wrapped
  title, updated date, and metadata. Quizzes additionally show question count and
  best score.
- Long titles: PASS. The four-line Japanese Reviewer title and three-line CC17
  title wrap without clipping.
- Counts: the Quizzes page reported exactly `6 items`, matching the 6 rows in the
  `quizzes` table.
- Result: PASS, after the tab-strip repair in section 17. Before the repair the
  "Activity Outputs" label was cut at rest on this 360dp device.

## 10. Today acceptance

- Handle size: PASS. Visible diameter is 34pt against a 22pt ring stroke, so each
  handle clearly overlaps rather than being swallowed by the track. The
  difference against the pre-B34 build on the same device is obvious.
- Ring overlap: PASS. Both handles visibly overlap the ring.
- Border: PASS. Each handle carries a complete 3pt background-coloured border
  with no break.
- Touch: PASS. 56pt interaction bounds sharing the handle's radial centre made
  both handles easy to grab.
- Drag: PASS. Dragging the later handle moved free time from 120 min to 225 min
  and committed ("Updating your plan..."). The value was dragged back and the
  plan was restored to exactly 120 min, which then survived a force-stop and
  relaunch.
- Edge clipping: PASS. No clipping at any position reached during the sweep;
  handles render above the track with explicit z-order and elevation.
- Result: PASS.

## 11. Local persistence acceptance

| Artifact | Generated | Saved locally | Relaunch | Offline open | Result |
|---|---|---|---|---|---|
| Reviewer | YES, during B36 | YES | YES | YES | PASS |
| Quiz | NO - blocked, see defect 3 | YES | YES | YES | PARTIAL |
| Activity Output | NO - not generated during B36 | YES | YES | YES | PARTIAL |

- The Reviewer was generated during this milestone from real synchronized CC17
  material and is identified by canonical id, not by title: server artifact
  `e5b1af02-3247-4393-822d-534efd15757e`, source version
  `a1110180-cede-4998-b4c6-94322ca193de`.
- Quiz and Activity Output were not generated during B36. Quiz generation is
  blocked by defect 3. Activity Output generation was not reached once the Quiz
  path proved blocked and the Canvas material listing proved unreliable; the
  existing owner-scoped artifacts were used to validate the B35 persistence
  behaviour instead.
- The persistence behaviour that B35 introduced — store, relaunch, offline open —
  was exercised for all three artifact types, which is what sections 12 and 13
  test. What is missing is only the in-session completion-to-local-upsert write
  path for Quiz and Activity Output; that path was proven for Reviewer.
- Failed jobs were not written to the device store, consistent with B35 policy:
  the failed `request_exceeds_context_budget` generation never appeared in the
  Library.

## 12. Relaunch test

`adb shell am force-stop com.galaxymaxp.stayfocusedv2`, then relaunch.

- Library populates from local storage: PASS.
- Existing artifacts appear without waiting for the cloud: PASS, and this was
  observed directly. The full card list rendered while "Checking for updates..."
  was still displayed, meaning SQLite content was on screen before cloud
  reconciliation finished.
- Reviewer remains available: PASS.
- Quiz remains available: PASS.
- Activity Output remains available: PASS.
- The Library is never blank pending a Vercel response once local rows exist;
  the skeleton appears only when the store is genuinely empty.

## 13. Airplane / offline test

Network fully disabled (`cmd connectivity airplane-mode enable`, plus `svc wifi
disable` and `svc data disable`; `airplane_mode_on=1`), then force-stop and
relaunch.

### Library

- Saved artifacts still appear: PASS.
- Offline notice: PASS — "Showing work saved on this device. Refresh when you are
  back online."
- No catastrophic error surface replaces saved content: PASS. The error surface
  is suppressed whenever local content exists.

### Reviewer

- Full Reviewer readable offline: PASS, with the notice "Showing the copy saved
  on this device. Saving changes and practice need a connection."

### Quiz

- Saved questions visible: PASS — "Question 1 of 5" onward with full prompts and
  all options.
- Read-only/offline notice: PASS — "Practice and scoring need a connection. These
  are the questions saved on this device."
- No fake scoring: PASS.
- No answer keys exposed: PASS, and this holds by construction. Correctness lives
  on `QuizQuestionResult` (attempt results), never on the `QuizQuestion` bodies
  that are stored on the device.
- Practice/attempt submission unavailable: PASS. "Start practice" is not rendered
  offline because it requires the cloud quiz payload.

### Activity Output

- Draft/output readable: PASS. Title and slide content render in full.
- Save/edit persistence clearly unavailable: PASS, stated by the same device-copy
  notice.

### Network-only functionality

- Generate offline fails honestly: "Courses could not be loaded - Could not
  connect. Your accepted generations will keep working. Try again when you are
  online." No fabricated success anywhere.

Result: PASS.

## 14. Reconnect/reconciliation

Airplane mode disabled, Wi-Fi restored and confirmed `WIFI CONNECTED`.

- Refresh: PASS. The offline notice is replaced by "Checking for updates..." and
  reconciliation resumes.
- Duplicates: PASS. The Quizzes page still reported exactly `6 items`, identical
  before, during, and after the offline window, and matching the 6 rows in the
  database. Artifacts are keyed by canonical id and upserted, so one artifact id
  stays one card.
  A stronger case appeared later: two Reviewers with the identical title
  "Journaling and Basic Accounting Reviewer" render as two cards, and the
  database confirms they are genuinely distinct artifacts
  (`9f874729-68d7-473b-b150-82fb44ac01de` and
  `bf82100d-7dbc-473f-bcfa-afc79ac9faba`, different source versions). Identity is
  by id, never by title, in both directions: one id never splits into two cards,
  and two ids never collapse into one.
- Updates: PASS. Reconciliation refreshed summaries and bodies without replacing
  the visible list.
- Data loss: none. Local bodies were not destroyed; the store never regresses to
  an older copy.
- Library remained usable throughout the sync.
- Result: PASS.

## 15. Deletion

Traced rather than executed, because the supported flow cannot reach any current
artifact.

- The supported UI is Library to "Manage saved Reviewers" (`/saved-reviewers`,
  `StudyLibraryScreen`). On device it renders "No saved reviewers yet", so there
  is nothing to delete.
- Actual implementation: `handleDelete` calls `deleteReviewer` and, only on
  success, `removeLocalArtifact(session.user.id, 'reviewer:<id>')`
  (`apps/mobile/src/features/library/StudyLibraryScreen.tsx:334`). Server-first,
  then local removal — which matches the assumption in the B36 brief.
- Why it is unreachable: that screen lists rows from the legacy `reviewers`
  table, which holds 0 rows, while the 48 Reviewers the user actually has live in
  `generated_artifacts`. This is the same legacy/AI-first split as defect 3.
- Remote deletion: not exercised.
- Local deletion: not exercised.
- Relaunch: not exercised.
- Result: BLOCKED. No new deletion UI was invented, and no artifact was deleted.

## 16. Account isolation

- Logout purge: PASS for everything observable on device. "Log out" from
  Library to "Manage saved Reviewers" returned the app to "Sign in to continue",
  and a force-stop plus relaunch still required sign-in, so the SecureStore
  session was genuinely cleared rather than merely hidden. After the owner
  signed back in, the Library rebuilt from the cloud behind "Checking for
  updates..." rather than instantly rendering stale rows, which is the behaviour
  expected of a purged store.
  The SQLite delete itself could not be inspected directly: the database is
  app-private and the device is not rooted. The owner-scoped purge is covered by
  the B35 automated suite, including mutation checks on the owner-isolation
  guard.
- Second account: BLOCKED. No second valid test account exists, and none was
  fabricated.
- Cross-account leakage: not testable on device for the same reason. Owner
  isolation is covered by automated tests — every store read and write is
  owner-scoped, and identical artifact ids under different owners are kept
  separate by the composite key.
- Result: PARTIAL. The logout purge is accepted on device; the second-account
  half is BLOCKED for lack of a second account, which per the B36 brief does not
  by itself fail the milestone but is recorded as a limitation.

## 17. Motion/accessibility

Frame statistics captured with `dumpsys gfxinfo` across three full tab cycles
(Today, Generate, Tasks, Library) plus Library paging in both directions.

| Interaction | Result | Notes |
|---|---|---|
| Tab transitions, Library paging, list scrolling (289 frames) | PASS | 33 janky frames (11.4%); 90th percentile 28ms, 95th 36ms, 99th 400ms; 2 missed vsyncs |
| GPU cost | PASS | 90th/95th/99th GPU percentiles 8ms/8ms/10ms, so rendering is not the constraint |
| Press feedback | PASS | Shared spring scale on actions, rows, and chips |
| Loading to content | PASS | Skeleton to content and "Checking for updates..." are smooth, with no blanking |
| Generation state transitions and completion | PASS | No flicker, no restart, no layout shift |
| Selected controls | PASS | Library capsule interpolates cleanly with gesture position |
| Flicker / double animation / abrupt replacement | None observed | Across roughly 60 device captures |

The long frames sit at data-loading transitions (Library reconciliation, course
fetch) rather than during paging, and the low GPU times point at JS/UI-thread
work, not rendering. Motion reads as restrained and coherent on real hardware.

`Number High input latency: 295` is discounted: every input in this run was
injected with `adb shell input`, which carries synthetic timestamps, so that
counter does not describe real touch latency.

### Reduced motion

`adb` could not write animation scales on this device — ColorOS denies
`WRITE_SECURE_SETTINGS` to the shell — so reduced motion was enabled through
Settings to Accessibility to Vision to "Remove animations", confirmed by
`transition_animation_scale=0` and `animator_duration_scale=0`.

- App remains usable: PASS. Today, Library, and Queue all behave normally.
- Status changes remain understandable: PASS.
- Library still works: PASS. Tabs, capsule, cards, and reconciliation notice all
  correct.
- Generation UI does not break: PASS. The generation screen renders with its
  layout, status, visual, and controls intact.
- Controls remain responsive: PASS.
- The setting was restored afterwards; all three scales are back to `1`.

## 18. Defects discovered and repaired

### Repaired in B36

**1. Card row content clipped by the rounded corner (repaired).**
`RowLink`'s `inset` applies `margin: -cardPadding` with matching `padding` so the
pressable can span a `Surface` that carries the default card padding. Three call
sites overrode that Surface to `padding: 0`, so the negative margin had nothing
to cancel and row content sat flush against the rounded edge, where
`overflow: "hidden"` clipped it. On the course workspace header this cut the
first character of the course code and rendered "Back to all synced courses" as
"3ack to all synced courses"; only the first and last lines were affected because
the middle of the card clears the corner radius. Fixed by restoring the Surface
padding at `GenerateScreen.tsx:202`, `GenerateScreen.tsx:214`, and
`LibraryScreen.tsx:155`. `GenerateScreen.tsx:249` was deliberately left alone: it
uses its own full-bleed rows with separators and genuinely needs `padding: 0`.

**2. Library tab label truncated at rest (repaired).**
The tab row was a hardcoded 378pt inside a 320pt content area (360dp device minus
the Page's 20pt gutters), overflowing by 66pt, so "Activity Outputs" rendered as
"Activity Ou" until the strip auto-scrolled. Tab widths are now measured against
the rendered labels and total 298pt, which fits with margin, and the indicator
translate/width ranges follow with a consistent 2pt inset.

Both repairs are committed in `1e81edd` and are included in the final signed
build `245ccaec`.

### Found, not repaired in B36 (out of bounded scope)

**3. Quiz generation is unreachable on this branch.**
The B34 Quiz gate is correctly closed and correctly worded, but it can never
open. `getCourseMaterials` resolves the Reviewer-to-material relationship from
the legacy `reviewers` table, which holds 0 rows, while AI-first Reviewers are
persisted to `generated_artifacts` (48 rows). The relationship data does exist:
for the Reviewer generated during B36,
`source_versions.metadata.reviewerSourceSnapshotId` is
`f8c5008e-bae8-4450-9377-5d397cebce8a`, whose snapshot belongs to course
`fdcea97f-1228-469a-b81f-92c78663368f` (CC17) and whose snapshot item is
`file:a838c717-425e-427c-a30d-ec5381d10f4f` — exactly the material that was
opened. Repairing the gate alone would not be enough: `quiz/sources.ts:29`
resolves the source by querying `reviewers` directly, and the
`create_quiz_processing_job` RPC takes a `p_reviewer_id` that keys off the same
legacy table. A real fix means porting quiz source resolution and its RPC to
`generated_artifacts`, including a migration. That is architecture work, not the
bounded on-device repair this milestone allows, so it was documented rather than
attempted. Not introduced by B36.

**4. Reviewer deletion is unreachable on this branch.**
Same root cause. "Manage saved Reviewers" lists the legacy `reviewers` table and
therefore shows "No saved reviewers yet", leaving no supported way to delete any
of the 48 Reviewers the user holds. The local-removal path
(`removeLocalArtifact`) is correct but cannot be triggered. Not introduced by
B36. See section 15.

Defects 3 and 4 share one cause: creation and reading were migrated to
`generated_artifacts`, but three consumers — the Quiz gate, quiz source
resolution, and Reviewer management/deletion — still read the retired
`reviewers` table.

### Process note: two generations submitted unintentionally

Opening a Queue row labelled "Request needs confirmation" *is* the confirmation.
`GenerationScreen` calls `acceptGeneration(...)` from a mount effect whenever a
saved `intent` parameter is present, so there is no separate confirm control on
that screen. While inspecting the generation screen under reduced motion, two
such rows were opened, which submitted the owner's two previously queued
`2-Journaling.pdf` requests. Both completed and consumed real generation quota,
producing artifacts `bf82100d-7dbc-473f-bcfa-afc79ac9faba` and
`9f874729-68d7-473b-b150-82fb44ac01de`. Nothing was destroyed and both requests
were the owner's own, but the submissions were not intended and are recorded
here rather than presented as planned coverage. They did, incidentally, provide
the two-distinct-artifacts-same-title evidence in section 14.

The affordance itself is worth a product decision: a row that reads "Request
needs confirmation" submits on tap, with no confirmation step and no way to
inspect the request first. That is a plausible source of accidental spend for
real users. Left for the roadmap rather than repaired here, because changing it
is a product decision and not a defect repair.

### Observations, not defects

- The generation study field keeps orbiting after a terminal failure rather than
  settling.
- Reviewer source identity lines can repeat the course name twice, for example
  "CC17 | ... DEVELOPMENT - CC17 | ... - Canvas Reviewer". This is generated
  labelling, relevant to B37.
- `GET /api/experience/courses/{id}` returns 503 for courses whose live Canvas
  modules cannot be listed; the in-app Canvas panel reports "Some Canvas areas
  could not refresh" with the connection last verified 2026-08-29.

## 19. Final automated verification

Run after the repairs, at `1e81edd`.

| Command | Result | Notes |
|---|---|---|
| `npm run typecheck -- --force` | PASS | 7/7 |
| `npm run lint -- --force` | PASS | 7/7; same 4 pre-existing `import/first` warnings, none new |
| `npm test --workspace @stay-focused/mobile` | PASS | 42 files, 505/505 |
| `npm test --workspace @stay-focused/api` | PASS | 895 passed, 3 skipped |
| `npm test --workspace @stay-focused/canvas` | PASS | 73/73 |
| `npm test --workspace @stay-focused/shared` | PASS | 44/44 |
| `npm ci --dry-run` | PASS | lockfile consistent |
| `npm run build --workspace @stay-focused/mobile` | PASS | expo export succeeds |
| `git diff --check` | PASS | clean |
| EAS signed Android build | PASS | `245ccaec` at `1e81edd` |

## 20. Evidence

All under `docs/ai/acceptance/b36/device/`, captured from the signed build on the
realme RMX3151 and downscaled to 540px wide to match repository convention.

| File | Covers |
|---|---|
| `01-authenticated-today.png` | Authenticated signed B36 build with real Canvas data |
| `02-today-handle-drag.png` | Today handle drag, 120 to 225 min, committing |
| `03-generate-synced-courses.png` | Generate synced-course root |
| `04-generate-course-detail.png` | Generate course detail with material groups |
| `05-quiz-gate-closed.png` | Reviewer available, Quiz gated on the Reviewer relationship |
| `06-generation-single-line-status.png` | Generation, one-line status |
| `07-generation-multiline-status-stable.png` | Two-line status with the visual unmoved |
| `08-generation-accepted.png` | Job accepted, safe to leave the screen |
| `09-reviewer-accounting.png` | Accounting Reviewer hierarchy |
| `10-reviewer-japanese-fl100.png` | Japanese / FL100 Reviewer, four-line title wrap |
| `11-reviewer-generated-cc17.png` | The Reviewer generated during B36 |
| `12-library-swipe-activity-outputs.png` | Library swipe with indicator settled |
| `13-library-after-force-stop-relaunch.png` | Local content rendered while still checking for updates |
| `14-offline-library.png` | Offline Library with device-copy notice |
| `15-offline-reviewer.png` | Offline Reviewer, fully readable |
| `16-offline-quiz-read-only.png` | Offline Quiz, questions visible, no keys, no practice |
| `17-offline-activity-output.png` | Offline Activity Output draft |
| `18-offline-generate-unavailable.png` | Network-only function failing honestly |
| `19-reconnect-library.png` | Reconnect, refresh resumed, content retained |
| `20-reconnect-no-duplicates.png` | Still exactly 6 items after reconnect |
| `21-manage-saved-reviewers-empty.png` | Deletion flow unreachable (defect 4) |
| `22-defect-course-header-clipping.png` | Corner clipping before repair (defect 1) |
| `23-defect-tab-label-truncated.png` | "Activity Ou" before repair (defect 2) |
| `24-reduced-motion-library.png` | Library under "Remove animations" |
| `25-repair-library-tab-label-restored.png` | "Activity Outputs" fully visible after repair 2 |
| `26-repair-course-header-no-clipping.png` | Course header intact after repair 1 |
| `27-repair-course-card-icons-restored.png` | Course card icons, previously clipped away entirely |
| `28-logout-returns-to-sign-in.png` | Logout returns to the sign-in screen |
| `29-relaunch-after-logout-still-signed-out.png` | Session cleared across relaunch |

Server-side corroboration, not committed: Vercel runtime logs for deployment
`dpl_EekcdmCmpfdoobvYouekuXrUmMEd`, and read-only Supabase queries confirming the
generated artifact and its snapshot linkage.

## 21. Files changed

- `apps/mobile/src/features/redesign/GenerateScreen.tsx`
- `apps/mobile/src/features/redesign/LibraryScreen.tsx`
- `docs/ai/acceptance/b36/signed-physical-offline-acceptance.md`
- `docs/ai/acceptance/b36/device/*.png` (24 files)
- `docs/current-state.md`
- `docs/roadmap.md`
- `docs/ai/current_sprint.md`
- `docs/ai/handoff.md`

## 22. Git result

- Commits: `1e81edd` (`fix(mobile): resolve B36 physical acceptance defects`) and
  the B36 documentation commit.
- No previous commit was rewritten.
- No `.env`, token, credential, EAS secret, or signing material was staged. The
  downloaded APK was kept outside the repository.
- No unrelated file was staged.

## 23. Verdict

PARTIAL - physical validation completed with unresolved defects

The B34 UX overhaul and the B35 local-first persistence layer both hold up on
real hardware. Authentication, session persistence, the Generate synced-course
browser, Reviewer hierarchy, the generation visual and its fixed layout regions,
Library paging, and the Today handles all pass physically. The offline story is
the strongest result: saved Reviewers, Quizzes, and Activity Outputs all open
with the network fully disabled, the Quiz is read-only with no answer keys and no
fake scoring, reconnect reconciles without duplicates or loss, and network-only
functions fail honestly. Two bounded layout defects were found and repaired, and
a second signed build carries the fixes.

It is not a PASS because two acceptance-standard items cannot be satisfied on
this branch: Quiz generation and the supported Reviewer deletion flow are both
unreachable (section 18, defects 3 and 4). Neither was introduced by B36, and
they share a single root cause — creation and reading were migrated to
`generated_artifacts` while the Quiz gate, quiz source resolution, and Reviewer
management still read the retired `reviewers` table. Closing that gap needs a
migration and RPC change, which is architecture work rather than the bounded
on-device repair this milestone allows.

Two further items are recorded as limitations rather than failures: Quiz and
Activity Output were not generated during B36 (their persistence, relaunch, and
offline behaviour were still verified against real artifacts), and the
second-account half of account isolation is BLOCKED because no second valid
account exists. The logout purge itself passed on device.
