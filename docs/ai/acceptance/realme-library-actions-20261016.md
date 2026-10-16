# Realme Library and course generation update

User scope: apply the requested generation and Library controls to the connected
Realme immediately. Source baseline is the published orb hotfix `a1bc3f0`;
implementation commits are `463c945` and `9ef1340`.

- Generate all Reviewers appears for every loaded course, including PPTX courses.
  A fresh, complete paginated inventory selects ready materials without saved
  Reviewers. Generated rows are shaded and explicitly labeled; their material
  detail offers Remake Reviewer and Open saved Reviewer.
- Course Library offers Remake all reviewers for unique saved sources with ready
  original materials, plus Remove all for all saved work in that course. Removal
  requires confirmation, removes quizzes before referenced Reviewers, waits for
  server confirmation before removing device copies, and keeps failures visible.
  Draft rows now have a swipe-left Remove action.
- Batches persist requests before admission, reuse uncertain admissions and
  active jobs, and wait up to three minutes for queue capacity. Partial acceptance
  and limits are reported. The app must stay open while submitting; accepted
  jobs continue on the server. Sources without original material IDs cannot be
  remade in bulk, and preparing/unavailable originals are skipped with a count.

FRESH PASS: 91 tests across screens, courseReviewerActions, generationRecovery,
useLocalLibrary and reviewerLibraryApi; mobile TypeScript; focused ESLint on all
six edited/new source and test files; diff hygiene.

FRESH PASS: Android preview OTA group `55e1412d-c073-45d6-9bb4-651dfddddb4c`,
update `01a14518-73b6-7781-b0ee-6e18e4009a87`, runtime `2.1.0-sdk57`, source
`9ef13401b59721171698db8c22934b1cebd95ab7`, published 2026-10-16 22:23 Manila.

FRESH PASS: physical Realme RMX3151, existing version 2.1.0/code 5. The update
downloaded and became active after relaunch; account and offline Library remained
available. CC17 shows Generate all, PPTX Ready materials and generated labels.
Its Library shows Remake all reviewers and Remove all. Native confirmation
dialogs were opened and cancelled for Generate all, Remake all, Remove all and
individual draft removal. The first draft's swipe reveals Remove. Recent process
log sample: zero matching fatal/ReactNativeJS/TypeError/ReferenceError entries.

NOT RUN: live paid generation, bulk remake completion or deletion of the user's
saved work; confirmation dialogs were cancelled. Mocked regression tests cover
admission, queue backoff, pagination, draft deletion, and partial removal failure.
NOT APPLICABLE: backend deployment, database migration, native/APK/EAS build.

Earlier attempts: Python was unavailable; the Node editing fallback initially
duplicated a CRLF-sensitive source segment. TypeScript, lint and screen tests
caught it. Corrected source passed the fresh final checks before publication.

Local evidence (not committed): `.local/realme-library/` contains OTA output,
before/after UI hierarchies, screenshots, cancelled-dialog captures and the log
sample. Source is on local branch `fix/realme-library-bulk-actions`; no main push
or remote merge was performed.
