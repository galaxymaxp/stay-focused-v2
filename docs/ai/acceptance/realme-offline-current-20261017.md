# Realme offline startup, silent Reviewer submission and current source

Scope: the owner's offline sign-in failure, Realme/Autopilot source mismatch,
retention of Library reordering and compact toolbar, and silent Generate Reviewer.

| Requirement | Layer | Evidence / current result |
| --- | --- | --- |
| Expired saved account opens without waiting for internet | Auth provider + secure SDK session | FRESH PASS: pending refresh, retryable failure and malformed-storage tests |
| Reconnect replaces offline identity; logout/revocation remains authoritative | Auth provider/service | FRESH PASS: foreground, SIGNED_OUT, invalid-token and late-result regressions |
| Interrupted token refresh preserves complete saved credentials | SecureStore | FRESH PASS: failed chunk/manifest, legacy migration, simultaneous write and oversize tests |
| Current Autopilot and existing Realme Library UX coexist | Merge resolution | FRESH PASS: mobile suite; main course-batch controls retained; drag/filter/toolbar tests |
| Generate Reviewer and confirmed Remake stay on the current page | Mobile material/Library | FRESH PASS: no generation navigation; inline Notice; submission after screen unmount |
| An interrupted unaccepted request resumes with one saved key | Persistent generation intent + app lifecycle | FRESH PASS: replay, duplicate and account/permanent-rejection regressions |
| Preview reaches the physical phone | Expo/device | FRESH PASS: published group e2aa9590; current UI active on Realme |
| Cold offline startup and saved reading on the phone | Physical Realme | FRESH PASS: no active default network, saved account/course/Reviewer available |

## Source and rollout prerequisites

Isolated branch combines main ed67445 with e38f96b. Clean original checkouts
remain untouched. Live API is READY at ed67445. Connected Supabase migration
inventory includes current/past courses, poll guard, Library projections,
public sharing/revocation and course batch requests. No migration or backend
publication is required for this mobile slice. Installed APK 2.1.0/code 5
contains the clipboard native module; runtime remains 2.1.0-sdk57.

## Fresh checks

Mobile: 1,124 passed in 119 files. Authentication/storage: 51 passed in seven
files. First silent-screen assertion failed by searching Copy instead of Notice;
fixed without changing product behavior. Initial root build before the added
silent scope passed 8/8, zero cached; final forced root typecheck/lint/build also pass 8/8 each, zero cached.
After the last lifecycle concurrency adjustment, fresh full mobile tests,
mobile TypeScript and lint pass; preview Android export and publication pass (one bundle, 36 assets).

Tooling attempts: Python launcher was unavailable; edits used Node instead.
EAS update:list was first invoked at the monorepo root and failed; invoking
from apps/mobile succeeded. Vercel deployment connector returned 403; the
same project/team CLI inspection succeeded. These are not hidden successes.

## Physical acceptance

Completed final gates, preview publication, active-update evidence, offline
force-stop/relaunch, saved-Reviewer reading, restored network settings and
retained Library selection/drag behavior. No paid generation or deletion is
part of this validation. Pre-acceptance OS process death is recovered on the
next app launch; it cannot execute network work while the app is killed.

Local logs and private device captures stay ignored under .local/offline/.

## Final preview and physical result

FRESH PASS: Android preview group `e2aa9590-bb0b-4afe-908a-36bd52d5cc8c`,
update `01a1465e-b73c-7d7a-be19-13d2ad63195d`, source `a4d11a8`,
runtime `2.1.0-sdk57`, published 2026-10-17 04:19 Manila. The update is
active on Realme 2.1.0/code 5: current cached-first status/Queue and retained
four-icon Library controls are visible. With Android reporting no active
default network, force-stop/relaunch retains the account, opens the course
Library and reads a full saved Reviewer. Native hold/drag reorders two cards;
an inverse drag restores the original order. Original Wi-Fi/data settings are
restored. Recent app-process sample: zero matching fatal/JS errors.

FRESH web suite 154/154, TypeScript and lint pass after mirroring the shared
Library-order preference schema. PR CI initially found that mirror mismatch
and a missing Chromium executable; the workflow now installs its required
Playwright Chromium before browser tests. [Draft PR #12](https://github.com/galaxymaxp/stay-focused-v2/pull/12)
retains the combined changes for mainline review. CI rerun is pending.

NOT RUN: paid real-source generation/deletion and forced real-token expiry on
the phone. Silent admission, screen exit/restart recovery and expired-token
startup are covered by deterministic regressions. The first physical attempt
used Android's stale global mobile-data preference as its offline check; it
was not accepted as offline proof. The successful rerun verifies that there is
no active default network. No native build or backend mutation was needed.

