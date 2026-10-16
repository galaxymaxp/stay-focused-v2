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

Preview OTA publication and physical device check pending. The owner was using
the Realme during the previous acceptance check; availability was requested
before further device control. No live generation or deletion is needed.
