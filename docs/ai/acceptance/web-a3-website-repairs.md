# WEB-A3: evidence-backed website repairs

2026-10-25. Branch overnight/2026-10-15_feedback after WEB-A2 (97053ea8).
Scope: repair exactly the reproducible website defects recorded in
[WEB-A2](web-a2-browser-verification.md). No new features, no API, data,
schema or mobile change.

## Frozen acceptance

| Requirement | Owning layer | Proof needed |
| --- | --- | --- |
| D1: after saving an activity draft and reloading, the editor shows the saved text and revision | `apps/web/src/features/library.tsx` DraftEditor | Focused component test (fresher revision adopted when unedited; unsaved edits never overwritten; save refreshes the saved screen) and the unmodified-assertion browser harness passing at the D1 step |
| D1 must not lose unsaved edits or weaken conflict protection | same | Test: a fresher revision arriving while edited leaves the edits and their base revision untouched |
| D2: website copy shows the intended ellipsis / middle dot | `own-material.tsx` lines 90/96/103/114, `reviewer/topic-assist.tsx` 83 | Source scan returns no corrupted website strings; harness PASS |
| No regression | web | Full web suite serial, harness default + generation + task-sync modes PASS, fresh forced typecheck/lint/root build, API/web/Android export builds, diff checks |

Mobile `ReviewerGenerateScreen.tsx:145` carries the same D2 corruption but is
outside this website task; it is recorded, not changed.

RESULT_PLACEHOLDER
