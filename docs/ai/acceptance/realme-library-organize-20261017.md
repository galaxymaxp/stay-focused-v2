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
FRESH PASS: preview OTA group `7dc9a912-93aa-4348-8d1f-ca41911575a6`,
update `01a14629-c43c-78cc-b13a-2d318ce88d41`, runtime `2.1.0-sdk57`,
source `43131a59f5a568fb74f4fde2189974095731fd90`, published
2026-10-17 03:21 Manila. Export and publication completed successfully.

FRESH PASS: the connected Realme RMX3151 (2.1.0/code 5) downloaded and applied
the update after relaunch. The course grid retains its original controls; the
course Library shows Organize. Holding a saved Reviewer enters selection mode,
shows the selected outline/check and count, and offers Done and move/removal
controls. UI screenshots were visually inspected. Recent process log sample
contains zero matching fatal/ReactNativeJS TypeError/ReferenceError entries.

NOT RUN by agent: physical multi-select, drag-drop and persistence after a
further restart. The owner confirmed they are testing the phone directly;
agent device control stopped. Automated tests cover those behaviors, including
block ordering, filtered slots, cancellation and edge scrolling. No live paid
generation or removal confirmation was performed by the agent.
NOT APPLICABLE: native/APK build, backend deployment or database migration.

Local evidence (uncommitted): `.local/realme-organize/` contains OTA metadata,
UI hierarchies, screenshots and the error sample. Source remains on local branch
`fix/realme-library-bulk-actions`; no main push or remote merge was performed.

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

The initial attempt to parse the redirected OTA JSON as UTF-8 failed because
Windows PowerShell wrote UTF-16LE. Decoding its BOM correctly resolved it.
