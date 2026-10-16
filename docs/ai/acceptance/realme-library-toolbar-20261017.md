# Compact course Library selection toolbar

Owner correction: reclaim saved-item viewport space. Remake/remove bulk cards
are hidden until long press. The top filter slot then becomes a 48-point icon
bar, with four equally expanding targets (minimum 48 points): remake, trash,
select/unselect all, X cancel. No Organize, Done, move-to-top/bottom, bottom
panel or persistent bulk action card. The selection count uses the existing
subtitle line. Normal and selected top slots reserve the same height.

The held item is selected; Select all is the default toggle action unless
every item in the current category is selected. It then becomes Unselect all
with a different icon. All pages participate, while other filtered categories
stay untouched. Remake uses unique selected Reviewer sources; trash removes
the selection. Both retain confirmation and existing server/device guarantees.
The course grid and stored custom ordering are unchanged.

FRESH PASS: full mobile suite, 1,056 tests / 105 files; mobile TypeScript; focused
ESLint on the four changed source/test files; diff hygiene; preview environment
preflight. Final copy-only correction also passes all 70 screen tests.
Tests cover hidden controls, icon order/equal targets, select-all beyond the
first page, unselect state, filter isolation, selected remake confirmation,
partial removal failures, multi-selection drag, cancellation and edge scrolling.

Earlier attempt: four existing screen tests failed because they still expected
the removed controls or the old direct filter child structure. Their interaction
paths were updated to hold/select/icon actions. Final tests pass. No publication
occurred during that failed check.

FRESH PASS: Android preview OTA group `b1537d74-77d0-4e80-ad86-24fef46abe6d`,
update `01a1463c-a586-7ff9-b43a-07e7f151d38f`, runtime `2.1.0-sdk57`,
source `e4f0ae7f0e8666d5da81b3c0c763b41754564756`, published
2026-10-17 03:42 Manila. Export/publication succeeded.

FRESH PASS: the owner made the physical Realme RMX3151 available for this check.
After download/relaunch the corrected UI is active on 2.1.0/code 5. Screenshots
were visually inspected: three full Reviewer cards and part of a fourth remain
visible while selected. All four icons occupy equal-width top targets; the
stacked actions, bottom panel, Organize and Done are absent. Native Select all
selected 13 course items and changed to Unselect all; clearing shows zero and
disables destructive actions. X restores filters and ordinary browsing.

FRESH PASS: a controlled one-second native hold followed by movement reorders
the first item below the second. A force-stop/relaunch preserves that order.
An inverse controlled drag restored the owner's original order; visible labels
were compared against the initial capture and match. The Library is left open
in normal mode. Recent process sample: 0 matching fatal/JS errors.

Earlier device attempts: an ambiguous prefix in the helper failed to operate
the select-all control; exact accessible labels resolved it. The built-in adb
draganddrop attempts did not reorder. Explicit DOWN, one-second hold, MOVE and
UP events did reorder and persist; no application change was needed for this
input-timing issue. Those attempts are not counted as passing native drags.

NOT RUN: live paid remake/generation or deletion; no confirmation was approved.
NOT APPLICABLE: native/APK build, backend deployment or database migration.
Local evidence is uncommitted in `.local/realme-toolbar/`: OTA metadata, UI
hierarchies, normal/selected and mid-drag screenshots, and the error sample.
Source remains on `fix/realme-library-bulk-actions`; no main push or merge.
