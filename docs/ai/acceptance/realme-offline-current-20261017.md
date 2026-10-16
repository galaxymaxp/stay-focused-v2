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
| Preview reaches the physical phone | Expo/device | IN PROGRESS |
| Cold offline startup and saved reading on the phone | Physical Realme | IN PROGRESS |

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
mobile TypeScript and lint pass; preview Android export remains pending.

Tooling attempts: Python launcher was unavailable; edits used Node instead.
EAS update:list was first invoked at the monorepo root and failed; invoking
from apps/mobile succeeded. Vercel deployment connector returned 403; the
same project/team CLI inspection succeeded. These are not hidden successes.

## Physical acceptance

Pending final gates, preview publication, active-update evidence, offline
force-stop/relaunch, saved-Reviewer reading, restored network settings and
retained Library selection/drag behavior. No paid generation or deletion is
part of this validation. Pre-acceptance OS process death is recovered on the
next app launch; it cannot execute network work while the app is killed.

Local logs and private device captures stay ignored under .local/offline/.
