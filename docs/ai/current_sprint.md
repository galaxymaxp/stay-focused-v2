# Current Sprint

Last refreshed: 2026-08-28, Asia/Manila.

## Completed objective

Audit, runtime-accept, and harden the R6 reviewer-maker capstone path from real
source selection through persisted Study Library reopen.

## Baseline

The audit started from clean `adcc865d8992b555701f65a2dd77a63ee0861448`
on `main`, 52 commits ahead and 0 behind `origin/main`.

## Completed scope

- Traced mobile intake, Canvas source selection, Processing, shared reviewer
  rendering, Study Library, notification reconciliation, API jobs/OCR/Canvas/
  reviewer routes, and the current Stage 0-6 engine implementation.
- Verified paste, gallery image, camera, PDF, and synchronized Canvas source
  paths against code and tests. Fresh device acceptance was not claimed.
- Ran the existing live OpenAI IT Security harness: 18/18 source sections,
  coverage and grounding 1.00, zero grounding/leakage issues, and no visible
  enrichment.
- Ran isolated linked-Supabase Canvas acceptance with two users and fictional
  data. Inventory, ten-block selection, preview, generation, immutable
  snapshot, save/list/open/rename/delete, source health, and API/RLS owner
  isolation passed. Both users and all dependent rows were removed with zero
  residue.
- Fixed the stale five-page saved-PDF metadata validator and added 100/101-page
  boundary coverage.
- Added a save action to the reviewer reader opened from Processing so cold
  completion routing can finish the SAVE -> REOPEN journey; Canvas snapshot
  metadata is preserved.

## Verification

- Reviewer engine: 290/290; shared: 32/32; OCR: 27/27; Canvas: 72/72;
  mobile: 269/269; targeted reviewer API: 18/18.
- Forced root typecheck: 7/7 with zero cached tasks. Forced root lint: 7/7 with
  only the four pre-existing mobile import-order warnings. API and engine
  production builds pass; mobile typecheck is included in the root pass.
- Full API: 576/577 after the two new reviewer-save tests. The sole failure is the
  documented Windows CRLF-sensitive Canvas SQL substring assertion.
- First runtime attempt: the local durable route returned 202 and remained
  queryable, but its Vercel Workflow dev worker did not advance before the
  240-second harness deadline. Automatic cleanup passed. The protected
  synchronous Canvas route completed the same hosted data/OpenAI/persistence
  journey on the rerun. Durable jobs remain automatically covered and have
  prior hosted acceptance.
- First mobile typecheck after the Processing change identified an incorrect
  local component import; it was corrected to the existing `TextField`, and
  typecheck/tests then passed.

## Result

READY FOR CAPSTONE REVIEWER DEMO: the source -> prepare -> generate -> progress
-> reviewer -> save -> reopen path is implemented, grounded, owner-scoped, and
accepted without hosted fixture residue. Remaining risks are device/deployment
rehearsal items, not reviewer-core correctness blockers.

## Next action

Run one deployed-build physical-device rehearsal of the primary Canvas reviewer
demo, including durable completion notification, save, and Library reopen.
