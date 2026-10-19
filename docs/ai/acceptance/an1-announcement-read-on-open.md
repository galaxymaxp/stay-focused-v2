# AN1: announcement read-on-open preflight

**STOPPED at STEP 0 (2026-10-19).** Baseline `b38c46a` on
`overnight/2026-10-15_feedback`; branch retained. Finite scope was AN1 STEP 0,
mobile/web implementation, tests, local gates, docs and local commits only.
No application or test code was changed. No later overnight slice was started.

## Material preflight conflict

AN1 assumes announcements currently become read only through explicit buttons
or swipes. The implementation already marks them read when opened on both
platforms, including a mobile row write before navigation:

- `apps/mobile/src/features/announcements/AnnouncementsScreen.tsx:88-90`:
  `AnnouncementItem.open` calls `if (!read) onRead(true)` before
  `openAnnouncement(item.id)`. Both the Announcements list and Today use this
  row. The long-press Read announcement action uses the same open handler.
- The same file at lines 194-204 resolves detail data and already calls
  `markRead(id, true)` in an effect, without checking resolved announcement
  data and without a once-per-open ref guard.
- `apps/web/src/features/announcements.tsx:134-141` already calls
  `read(id, true)` in the detail effect, also without checking resolved data
  or using a once-per-open ref guard. Web rows use links to the detail route.

The missing data check/ref guards fit the proposed detail repair. The mobile
row write changes the required repair: a detail-only change would still mark
an unread announcement read before its detail data loads, including when the
detail cannot resolve it. Removing that write would change a list row, which
AN1 STEP 1 explicitly forbids: "No change to list rows or swipes."

This is a source-backed requirements conflict, not line-number drift or a
renamed helper. AN1 unattended rules 3 and 4 require stopping when the code
contradicts an assumption in a way that changes the fix. No implementation
continued past that finding, including the otherwise independent web change.

**Exact question for the owner:** May AN1 remove only the pre-navigation
`if (!read) onRead(true)` call from `AnnouncementItem.open`, overriding
STEP 1's "No change to list rows or swipes", so automatic read writes occur
only after resolved detail data is displayed on mobile and web, with a
once-per-open id guard and the existing explicit read/unread actions retained?

This question is recorded for later; no unattended answer was requested.

## STEP 0 data and preference ownership

| Surface | Detail data | Preference writes and subscriptions |
| --- | --- | --- |
| Mobile | `app/(app)/announcement.tsx` re-exports `AnnouncementDetailScreen`. It uses `useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH)` for `/api/experience/announcements?limit=100`, then finds the route id in `data.items`. | `src/features/redesign/useListPreferences.ts` exposes `markRead`; `update` changes the owner cache, emits to mounted subscribers and serializes `sessionStore.setItem` writes under `sf.list-preferences.v1.${owner}`. `useSyncExternalStore` supplies the shared snapshot. No Canvas write. |
| Web | `app/(app)/announcements/[id]/page.tsx` awaits params, decodes id and renders `AnnouncementDetail`. The layout wraps it in `AnnouncementsWorkspace`, whose `useResource<StudentAnnouncementList>(LIST_PATH, 60000)` supplies `data.items` through Context. The detail finds the id in that context. | `src/lib/list-preferences.ts` exposes `read`; `update` changes the owner cache, emits and writes `localStorage` under the same owner-specific key pattern. `useSyncExternalStore` subscribes, including browser storage events. No Canvas write. |

Mobile `TodayScreen.tsx:135-137` uses `useArrangedAnnouncements` and its unread
slice; the hook subscribes through `useListPreferences`. Its rows at lines
432-441 use `AnnouncementItem`, including the early write described above.
Web `today-screen.tsx:89,252-254` subscribes through `useListPreferences` and
filters `prefs.read.announcements`; its line 464 links to the detail route.
Both announcement lists derive unread dots/counts from subscribed preferences.
No stale unsubscribed Today snapshot was found in source. Immediate updates,
notification/deep-link behavior and read/unread persistence were not exercised.

## Verification

| Exact command / check | Result and counts |
| --- | --- |
| Baseline Git and relevant source inspection | FRESH: expected branch, clean tracked tree; material row-write conflict found |
| `npm run typecheck -- --force` | NOT RUN: preflight STOP |
| `npm run lint -- --force` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/shared` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/api` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN: preflight STOP |
| `npm run test --workspace @stay-focused/web` | NOT RUN: preflight STOP |
| `npm run build --workspace @stay-focused/api` | NOT RUN: preflight STOP |
| `npm run build --workspace @stay-focused/web` | NOT RUN: preflight STOP |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: preflight STOP |
| `git diff --check` | FRESH PASS: 0 whitespace errors on the documentation checkpoint |
| `git diff --cached --check` | FRESH PASS: 0 whitespace errors on staged documentation |
| Additional AUTOPILOT `npm run build -- --force` | NOT RUN: preflight STOP; documentation-only checkpoint |

Prompt gates: **1/10 FRESH PASS, 9/10 NOT RUN, 0 failed**. Every requested
workspace has a test script. No test/build attempt, test counts or flake claim.
One discovery read tried nonexistent web `src/features/preferences.tsx`;
the actual web store was found through imports. This was a discovery miss,
not a gate failure. React best-practices skill was
read before the STOP; it did not require approval or cause this stop.

## Owner steps remaining

- Resolve the exact row-write scope question before resuming AN1. Mobile/web
  data-resolved once-per-open guards and the requested regression tests remain
  unimplemented; parity is not claimed. No platform was silently skipped.
- **Rollout: NOT RUN, skipped entirely.** Owner chooses deployment/OTA after
  implementation review and green gates.
- **Device checks: NOT RUN, skipped entirely.** On Realme and the website,
  open an unread announcement from Today and the list, return and confirm
  read state and removal from Today's card; verify unread while open persists.
- Deployed API/mobile/web revisions, production state, database rows/applied
  migrations, Scheduler state, remote-ref freshness and actual device/browser
  behavior remain **UNVERIFIED (owner to confirm)**. No live state is inferred
  from source. Missing live verification was not the STOP reason.

No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration,
Scheduler action, email, deployment, environment-file edit or push ran. No
dependency, migration or ADR change. Unrelated `UI/`, `apps/mobile/.gitignore`
and `supabase/.temp/` remain untouched and unstaged. Local tracking at baseline:
ahead 20 / behind 2; no fetch. Commit: `docs: record AN1 preflight scope conflict`
(final hash in Git and ignored `tmp/overnight/AN1.status`). Progress and status
remain uncommitted under `tmp/`.
