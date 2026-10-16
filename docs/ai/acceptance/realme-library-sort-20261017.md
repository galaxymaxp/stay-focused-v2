# Library sort presets on Realme

Owner scope: date, Canvas module/material order (explicitly confirmed), and
alphabetical sorting with a visible control. Preserve the saved manual drag
order and existing offline/auth/silent generation behavior. Cover the Library
course grid and saved work inside a course. No backend/schema or paid generation.

## Acceptance matrix

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Discoverable Sort control | Header control on course grid and saved-work pages; accessible radio choices | FRESH screen/menu tests PASS; physical PASS |
| Date in both directions | Updated newest/oldest; invalid dates last, stable ties | FRESH sorting regressions PASS |
| Alphabet in both directions | Natural, case-insensitive A-Z/Z-A including numbered units | FRESH sorting regressions PASS |
| Original Canvas course sequence | Complete paginated existing material inventory; direct source and related Reviewer/Quiz matching | FRESH rank/pagination regressions PASS; native complete-sequence read PASS |
| Unlinked work handled honestly | Last in course-order view, explained in Sort sheet | FRESH sorting regression PASS |
| Choice survives restart by owner/course | Existing serialized preferences; validated sort enum; web mirror synchronized | FRESH preference round-trip and account hook tests PASS; physical PASS |
| Offline course order | Only complete sequences cached; failed refresh retains saved sequence | FRESH hook tests PASS; physical PASS |
| Manual order preserved | Presets never rewrite custom IDs; dragging saves current view as My order | FRESH existing drag tests and preference tests PASS |

## Verification checkpoint

FRESH mobile: 1,134 tests / 121 files PASS. FRESH web: 154 tests / 26 files
PASS. Forced root TypeScript: 8/8, zero cached. Lint/build and Android preview publication PASS (details below). First screen run failed on a missing Sort icon in the
native icon mock; corrected. The next run had one old toolbar assertion count
the new header Sort button as a bulk action; it now inspects the actual toolbar
and verifies that sorting is disabled during selection. No product assertion
was removed. Full rerun passes.

## Behavior and limits

Date is explicitly labelled Updated. Grid date uses latest saved work in each
course; pinned course tiles remain first. Course order follows the complete
learning-material API sequence, which already orders by Canvas module/item
placement. Quizzes inherit their linked Reviewer's position. Work without a
matching learning material is listed last, without guessing from titles.
Choose Course order once online to retain its complete sequence for offline use.
The shared web preference DTO remains mirrored; website sorting UI is outside
this device-focused scope. Existing API/DB/provider implementations are untouched.

Native/OTA evidence will be appended here. Private captures/logs stay ignored
under .local/sort/ and .local/offline/.

## Initial preview/device evidence and corrective check

Initial Android sorting OTA group d21383a8-c337-44b4-9814-c2cc47a22a54,
update 01a146b7-94d8-752f-9826-81325e0457aa, source 29d48e6,
runtime 2.1.0-sdk57, published 2026-10-17 05:56 Manila.
FRESH physical PASS: six options, item A-Z/Z-A, both date choices, complete
Canvas sequence loading, return to saved manual order. Offline restart retains
the Course order preference, saved sequence and signed account; original
network settings are restored. The first offline comparison rejected an exact
prefix match because a new cached Reviewer appeared between captures. The
rerun verifies the shared items' relative course order and passes.

Physical grid A-Z found a real defect: raw Canvas course names begin with code
and section fields, whereas the tiles display the cleaned title. Corrective
commit 22b4afa sorts the same visible courseIdentity title as the tiles, with a
regression for code/section prefixes. FRESH final mobile suite: 1,135 tests in
121 files; mobile TypeScript and focused ESLint PASS. The first focused linter
command was invoked at the monorepo root without a root ESLint config; the
correct mobile-workspace invocation passes. Earlier root typecheck/lint/build
8/8 each and web 154/154 remain evidence for the full feature before this pure
comparator correction. Final corrective Android export and native grid A-Z/Z-A checks PASS. Initial implementation CI at 29d48e6 passed all checks.

## Final verdict: PASS

FRESH PASS: final Android preview group 456c1693-3c24-4104-8bd5-58f2b162d563,
update 01a146c3-084c-7407-acf0-d3f36b97bd70, source 22b4afa, runtime
2.1.0-sdk57, published 2026-10-17 06:09 Manila, is active on Realme
2.1.0/code 5. Visible-title course-grid A-Z and Z-A now pass. Six choices are
visible; item alphabet/date choices, complete course sequence and preserved
manual order passed the preceding feature OTA. Course-order selection also
passes an explicit fresh select/relaunch check on the final OTA. Cached course
sequence/account/choice passed restart without an active default network;
original network settings were restored. The Sort sheet is left open for the
owner. Recent final process log has zero matching fatal/JS errors.

FRESH final mobile suite: 1,135 tests / 121 files, mobile TypeScript, focused
ESLint and final Android export/publication PASS. Web 154 tests and forced root
typecheck/lint/build 8/8 each, zero cached, passed for feature base 29d48e6.
The corrective change only adjusts the pure grid comparator to use the same
courseIdentity title as the tiles. Initial implementation CI passed; final
implementation CI is in progress. No APK, database, backend or paid generation.

The first final-run check expected the older test selection but found My order.
Explicitly selecting Course order and performing a fresh force-stop/relaunch
passes persistence on the final OTA. Prior failed physical checks and both OTA
metadata files remain in the ignored evidence directory. No first attempt is
counted as a passing check.
