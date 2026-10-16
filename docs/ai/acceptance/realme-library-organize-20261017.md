# Realme course Library organization

Scope: only Reviewers, quizzes and drafts inside a course Library. Course tiles
retain their existing interactions. Long press selects and arms drag; taps in
organize mode select/deselect; Done returns to opening items. Dragged selections
move together, with a drop marker and edge scrolling. Move to top/bottom is an
accessible alternative. Removal keeps explicit confirmation.

Custom order is stored using the existing account-scoped local preferences,
keyed by course. New saved work stays visible; stale IDs are ignored; reordering
a filtered category preserves the slots of other kinds. Default pin ordering
remains until a custom order is saved for that course.

FRESH PASS: full mobile suite, 1,052 tests / 105 files. Mobile TypeScript,
focused ESLint on all eight affected source/test files, and diff hygiene PASS.
Final test-only typing correction also passes 66 screen tests.
Preview OTA and physical Realme acceptance are in progress.

Earlier attempts: initial TypeScript caught ScrollView measurement typing;
corrected to its native scroll ref. Three new screen tests initially failed
because the Page test double omitted header/footer slots; corrected the double
and all focused 80 tests passed. ESLint and the EAS environment preflight were
first invoked from the repository root; corrected to apps/mobile. The preflight
created an empty root app.json; that generated file was removed. No publication
occurred during the failed preflight.

A later TypeScript pass caught two test callbacks returning VitestUtils rather
than void; their braces were corrected and the final TypeScript/lint/screen run
passes.
