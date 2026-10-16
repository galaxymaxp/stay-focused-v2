# Library sort presets on Realme

Owner scope: date, Canvas module/material order (explicitly confirmed), and
alphabetical sorting with a visible control. Preserve the saved manual drag
order and existing offline/auth/silent generation behavior. Cover the Library
course grid and saved work inside a course. No backend/schema or paid generation.

## Acceptance matrix

| Requirement | Implementation | Evidence |
| --- | --- | --- |
| Discoverable Sort control | Header control on course grid and saved-work pages; accessible radio choices | FRESH screen/menu tests PASS; physical pending |
| Date in both directions | Updated newest/oldest; invalid dates last, stable ties | FRESH sorting regressions PASS |
| Alphabet in both directions | Natural, case-insensitive A-Z/Z-A including numbered units | FRESH sorting regressions PASS |
| Original Canvas course sequence | Complete paginated existing material inventory; direct source and related Reviewer/Quiz matching | FRESH rank/pagination regressions PASS; live read pending |
| Unlinked work handled honestly | Last in course-order view, explained in Sort sheet | FRESH sorting regression PASS |
| Choice survives restart by owner/course | Existing serialized preferences; validated sort enum; web mirror synchronized | FRESH preference round-trip and account hook tests PASS; physical pending |
| Offline course order | Only complete sequences cached; failed refresh retains saved sequence | FRESH hook tests PASS; physical pending |
| Manual order preserved | Presets never rewrite custom IDs; dragging saves current view as My order | FRESH existing drag tests and preference tests PASS |

## Verification checkpoint

FRESH mobile: 1,134 tests / 121 files PASS. FRESH web: 154 tests / 26 files
PASS. Forced root TypeScript: 8/8, zero cached. Lint/build and Android preview
publication pending. First screen run failed on a missing Sort icon in the
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
