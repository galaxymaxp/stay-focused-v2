# Current Sprint

Last refreshed: 2026-08-29, Asia/Manila.

## Completed objective

Implement and physically accept the missing Canvas structured-block selection
and server selective-preview flow on Android without changing the reviewer
engine, generation schemas, or Canvas synchronization semantics.

## Baseline

R8 started from clean `dbf5e039f345f95986d810bb353c83b5b85487ca`
on `main`, 55 commits ahead and 0 behind `origin/main`. Repository integrity
passed before editing.

## Completed scope

- Traced the mobile course/source flow through Canvas inventory, preparation,
  structure, selective preview, durable job handoff, freshness validation, and
  immutable reviewer-source provenance.
- Replaced the Canvas full-source-first interaction with server-owned structured
  blocks, server default selection, ordered select/deselect/clear behavior, a
  250-block guard, explicit selective preview, and safe loading/error states.
- Retained editable selective-preview semantics supported by the backend. The
  exact structure session, selected block IDs, preview session, resolution
  fingerprint, Canvas source IDs, and preview text now stay bound together;
  changing selection invalidates the prior preview.
- Preserved the existing durable reviewer job, Processing recovery, reader,
  save, and Study Library paths. Paste, gallery, camera, and PDF semantics were
  not changed.
- Built EAS internal preview `ab67feeb-0f61-4d6c-b24c-a7c5658ac050` from
  implementation commit `69ea697ee916adb0e928171b4d0afdc792b92da0`,
  installed it on the realme RMX3151 / Android 13, and reused the unchanged
  verified production API.

## Verification

- Mobile: 278/278 tests; Canvas package: 72/72; targeted Canvas
  structure/selective-preview/generation/freshness/provenance API: 43/43.
- Forced root typecheck and lint: 7/7 packages, zero cached tasks. The four
  previously accepted mobile import-order warnings did not appear; no new
  warning was introduced. `git diff --check` and `git fsck --full` passed.
- The first post-change mobile typecheck exposed a readonly-array/Set narrowing
  error in the new selection helper. It was corrected before the fresh passing
  verification run.
- Physical selection returned nine ordered paragraph blocks selected by
  default. Clear produced zero selected blocks and disabled Preview. Select,
  deselect, reselect, multiple selection, back-navigation preservation, and a
  changed three-block preview all passed.
- The final server preview retained the three selected blocks in original
  source order. Durable job `1e8d146a-43d7-45cb-9259-cefbaad690ea` completed
  1/1 with coverage, grounding, and leakage all passed; coverage and grounding
  scores were 1.00.
- Processing recovered the completed job after force-stop/relaunch. The result
  saved as `Capstone Selective Canvas Reviewer` and reopened from Study Library
  without regeneration.
- Immutable snapshot `c6446ac2-18a9-4a16-aff5-febad28da396` matches the final
  preview session and contains exactly three ordered selected block manifests,
  their hashes and parser version, the selective-preview normalization version,
  no OCR, and `wasEdited = false`.

## Result

`READY FOR PHYSICAL CAPSTONE REVIEWER DEMO`

The intended Canvas source -> structured blocks -> subset -> server preview ->
durable generation -> Processing -> save -> Study Library journey is now
implemented and physically accepted. Notification registration, delivery, and
routing remain explicitly outside this result; persisted Processing and
relaunch recovery passed independently.

## Next action

Reviewer UI refinement across Canvas selection, Processing, Reader, and Study
Library.
