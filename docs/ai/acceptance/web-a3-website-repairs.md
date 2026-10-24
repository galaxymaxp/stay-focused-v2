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

## Result: LOCAL PASS

| Requirement | Evidence | Result |
| --- | --- | --- |
| D1 saved text after reload | `DraftEditor` adopts a newer server revision when there are no unsaved edits, and refreshes the saved screen after a successful save. New `apps/web/src/features/draft-editor.test.ts` 3/3; against the unfixed file 2 of 3 fail (adopt newer revision; refresh after save). Browser harness default mode passes its unmodified D1 assertion | PASS |
| D1 keeps unsaved edits and their base revision | Test: a fresher revision arriving while edited leaves the text and sends the old revision on save, so the API's revision check still rejects a stale save | PASS |
| D2 copy | `own-material.tsx` 90/96/103/114 and `reviewer/topic-assist.tsx` 83 restored to `…` / `·`, matching the mobile wording; `tmp/overnight/WEB-A2/ellipsis-scan.cjs` finds none left on the website | PASS |
| No regression | Harness default (14 PASS groups), `--generation-fixture` (16) and `--task-sync-only` (5) all PASS with 0 browser exceptions and 0 paid/production requests; gates below | PASS |

Focused: `draft-editor.test.ts` + `library.test.ts` 18/18
(`tmp/overnight/WEB-A3/focused-1.log`; unfixed proof `focused-unfixed.log`).

Fresh gates on the WEB-A3 working tree, serial via `tmp/overnight/gates.ps1`,
all exit 0 (`tmp/overnight/WEB-A3/`):

| Exact command | Result / evidence |
| --- | --- |
| `npm run typecheck -- --force` | 8/8, 0 cached; `typecheck-1792870311058.log` |
| `npm run lint -- --force` | 8/8, 0 cached; 0 errors, 7 existing warnings; `lint-1792870341802.log` |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 651 passed / 83 files; `web-serial-1792870390152.log` |
| `npm run build --workspace @stay-focused/api` | PASS; `api-build-1792870660207.log` |
| `npm run build --workspace @stay-focused/web` | PASS, 23/23 static pages; `web-build-1792870722331.log` |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | offline Android JS/assets export PASS; `android-build-1792870756860.log` |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8, 0 cached; `root-build-1792870829014.log` |
| `git diff --check`, `git diff --cached --check` | PASS at commit |

No API, data, schema, dependency or mobile change. The mobile copy of the
D2 corruption (`ReviewerGenerateScreen.tsx:145`) remains for a mobile task.
Rollout and Device checks NOT RUN; production and real-browser behaviour
UNVERIFIED (owner to confirm). These repairs ship with the next FULLSEND.
