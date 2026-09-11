# B22 Mobile Canvas to Reviewer Study Workflow

Date: 2026-09-12 (Asia/Manila)

## Verdict

**PASS — B22 mobile Canvas-to-Reviewer study workflow proven end-to-end on physical Android.**

## Starting state

- Branch: `main`
- Starting HEAD: `d02cdacaccf6bd42b170d4ef01224038a6b68b84`
- Origin comparison: 32 commits ahead, 0 behind
- Pre-existing dirty state: untracked `docs/ai/acceptance/b8/`; it was not modified, cleaned, staged, or committed
- Git integrity: `git fsck --no-reflogs` passed; only pre-existing unreachable dangling objects were reported
- Physical target: realme RMX3151, Android 13, package `com.galaxymaxp.stayfocusedv2`
- Installed baseline: app `2.0.0`, EAS build `ede2ae05-99de-4a74-b5e2-a0ee28e008cc`

Fresh pre-implementation verification passed: Canvas 73/73, API 626/626,
mobile 377/377, and engine 606/606. No unexplained baseline regression was
present.

## Scope and workflow review

B22 changed only the student-facing mobile Canvas-to-Reviewer orchestration.
The accepted B21 exact-resource resolver, preparation APIs, database contracts,
durable job workflow, Reviewer engine, snapshot provenance, and Library APIs
were reused without API, engine, schema, or synchronization expansion.

Before B22, the shortest ready-source path used the Courses screen, Canvas
source picker, mandatory block picker, editable preview, durable job/result,
manual title/save panel, Study Library, and saved Reviewer reader. It required
seven major interactions after reaching the course card: enter Reviewer, choose
a source, preview selected blocks, generate, save, open Library, and reopen. A
preparable source added another interaction. Successful states exposed the
mechanics of block selection and source checking, connection diagnostics
occupied prominent course space, and persistence required an avoidable Save.

The accepted B22 normal path needs five major interactions from the Courses
screen through reopen: Study materials, choose material, Create Reviewer, open
Library, and open the saved Reviewer. Server-resolved default blocks and the
immutable preview remain part of the contract but are internal to the one
Create Reviewer action. “Choose specific sections” keeps the accepted advanced
path available without making it mandatory.

The current backend contract safely supports one Canvas source per Reviewer
job (`maximumSources: 1`). B22 therefore preserves honest single-source
selection and does not fake or rush multi-source support.

## Implementation

| Area | Change | Files |
| --- | --- | --- |
| Courses | Hides connection capability details behind disclosure, collapses partial-sync detail, removes duplicate selected-course rows, and leads with “Study materials” | `apps/mobile/src/features/courses/CoursesScreen.tsx` |
| Material picker | Uses concise Ready/Prepare/unavailable states and format-specific PPTX/DOCX reasons while retaining authoritative module/item ordering | `apps/mobile/src/features/courses/canvasSourcePresentation.ts` |
| Study action | Adds a course/module/material confirmation stage with one primary Create Reviewer action and optional section selection | `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx` |
| Generation | Internally resolves default blocks, creates the snapshot-bound durable job, preserves idempotency/single-flight locking, and maps job stages to coarse student copy | `CanvasSourceReviewerScreen.tsx`, `canvasStudyWorkflow.ts` |
| Save/Library | Automatically persists the successful Reviewer against the same immutable snapshot and stores a recognizable course/material source label; failed saves remain retryable | `CanvasSourceReviewerScreen.tsx`, `canvasStudyWorkflow.ts` |
| Regression tests | Covers module ordering/state copy, unsupported formats, canonical job identity, snapshot-bound automatic save, retry propagation, and coarse progress copy | `canvasSourcePresentation.test.ts`, `canvasStudyWorkflow.test.ts` |

## Canvas material states

| State | Student-visible behavior | Selectable | Backend behavior |
| --- | --- | ---: | --- |
| Ready | `Ready`; choosing it opens the study-action confirmation | Yes | Structures the exact canonical source and resolves its default selected blocks before job submission |
| Needs preparation | `Prepare`; concise preparation explanation | Yes | Calls the existing authenticated prepare route, reloads inventory, and continues only after the server returns Ready |
| Unsupported | Visible disabled row; PPTX says “PowerPoint files aren't supported yet.” and DOCX says “Word files aren't supported yet.” | No | No preview or Reviewer request |
| Empty/unavailable | Visible disabled row such as `No study text found` or `Unavailable` | No | No preview or Reviewer request |

## Accepted student flow

```text
Course
→ Module
→ Material
→ Reviewer
→ Generation
→ Study
→ Library
→ Reopen
```

On the device, the student opened CIT6 Study materials, saw materials grouped
under `Week 1: Deliverables, Policies and Guidelines`, chose the ready 23-page
PDF, reviewed its course/module/material context, and tapped Create Reviewer.
The app performed server-side selective preview and durable submission as one
action, displayed `Preparing material` while the server worked, rendered the
result only after durable success, automatically saved it, listed it first in
Study Library, and reopened the persisted record without another job.

## Tests and static verification

| Suite | Fresh result | Count / notes |
| --- | --- | --- |
| Canvas | PASS | 1 file, 73 tests |
| API | PASS | 71 files, 626 tests |
| Mobile | PASS | 32 files, 389 tests; 12 tests added over the B21 baseline |
| Engine | PASS | typecheck, build, 606/606 eval assertions |
| Root | PASS | typecheck 7/7 tasks, lint 7/7 tasks, build 7/7 tasks; no root `test` script exists |
| Lint | PASS | 0 errors; four unchanged `import/first` warnings in pre-existing mobile service tests |
| Android export/EAS | PASS | Android bundle exported; final preview APK built successfully |

Retained regression coverage proves exact page, assignment, and file source
handling, module ordering, module-linked Pages when broad Pages is unavailable,
and module-linked PDFs when broad Files is denied. The database contract test
continues to require `module_page_detail`, `module_assignment`, and
`module_file`. Mobile service tests retain bearer authentication, preparation
success/failure and retry, duplicate prevention, durable result handling,
Library persistence, saved-detail reopen, and no-regeneration behavior.

## Deployment and Android build

B22 made no API or database changes, so no Vercel or Supabase deployment was
required. The existing production health endpoint returned:

```json
{
  "status": "ok",
  "version": "2.0.0"
}
```

- API target: `https://stay-focused-v2-prototype.vercel.app`
- Build method: EAS preview/internal-distribution APK
- EAS build: `ea2cbc29-5150-4507-bcbe-841cc9384416`
- App/package: `2.0.0` / `com.galaxymaxp.stayfocusedv2`
- Build fingerprint: `f6fbdebad7bae82631cb2462a1d41ab70697b87e`
- APK SHA-256: `50FB6805F92034CE1758239EE26CF8BF595A39575D3F8948427E6DF921273F42`
- Install: `adb install --no-streaming -r` returned `Success`; authenticated app data was retained
- Launch: standalone installed app launched successfully on the physical device

An earlier queued build was cancelled because its archive preceded the final
refinement. An attempted preview-channel update was not used for acceptance
because the installed B21 binary did not have the update URL. The final claim
is based only on the standalone APK above.

## Physical Android acceptance

| Step | Result | Evidence |
| --- | --- | --- |
| Course selection | PASS | Selected CIT6 card showed student course information and Study materials |
| Module grouping | PASS | Week 0, Week 1, and Other course content retained Canvas order |
| Real Canvas source | PASS | `CIT6 Course Introduction and Orientation 2026.pdf` shown under Week 1 as Ready |
| Source selected | PASS | Study-action stage showed course, module, material, type, and availability |
| Preparation | PASS | Selected file was already prepared; a separate CIT6 PDF visibly showed Prepare, and the retained API path is regression-covered |
| Reviewer launched | PASS | One Create Reviewer tap disabled competing actions and submitted one canonical job |
| Durable generation | PASS | Production workflow job succeeded on attempt 1 in fresh mode |
| Rendering | PASS | Title, source context, grounded status, hierarchy, explanations, and key points were readable on the realme |
| Persistence | PASS | UI reported automatic save; a server Reviewer row used the generation snapshot |
| Study Library | PASS | New item appeared first with course/material context, 20 sections, and saved date |
| Reopen | PASS | Same saved Reviewer reopened directly; B22 job count remained exactly 1 |

Ignored screenshots and UI dumps are under `.local/b22/`, including final APK
launch, course list, module/material picker, study action, durable progress,
generated Reviewer, Library listing, saved Reviewer reopen, PPTX disabled state,
and empty-item disabled state. They are acceptance evidence, not repository
artifacts. The final-app ADB warning-log filter found zero fatal exceptions,
zero unhandled React Native errors, and zero network/transport failures.

## Reviewer verification

- Course: CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1
- Module: Week 1: Deliverables, Policies and Guidelines
- Material: CIT6 Course Introduction and Orientation 2026.pdf
- Canvas resource ID: `11437391`
- Canonical V2 source ID: `file:b08d03f7-9e36-44e0-a9f0-0bc9c6d9cd2a`
- Engine source ID: `source-1ig0ss4`
- Reviewer ID: `da684716-f358-4528-afe1-f30129d38e22`
- Job ID: `90e01a26-ab30-4acf-ba60-384dafe794f6`
- Reviewer source snapshot: `74cd76b5-818b-448c-8046-faed06c115bc`
- Page count / selected blocks: 23 / 23, pages 1–23
- Section count: 20
- Coverage: 1.00, passed
- Grounding: 1.00, passed
- Grounding issues: 0
- Fabrication issues: 0
- Leakage: passed, 0 issues
- Fallback: no fallback plan; 3 individual sections used the visible source-only safety fallback
- Provenance: one unedited Canvas file snapshot, exact Canvas course/resource,
  canonical V2 source row, PDF metadata, and all 23 selected page blocks were
  persisted; automatic Library save references the same snapshot

Student-visible quality is acceptable: the phone showed the correct course and
source, a legible 20-section hierarchy, grounded explanations and key points,
and honest fallback disclosure. No unsupported enrichment, fabricated facts,
or leakage issue was observed. The stored `reviewerQualityStatus: limited`
reflects the three safe source-only sections, not a failed grounding, coverage,
or leakage gate.

## Error-state validation

| Case | Result | Student-visible behavior |
| --- | --- | --- |
| Unsupported PPTX | PASS | Three real CC17 PPTX rows stayed visible, disabled, and said “PowerPoint files aren't supported yet.”; tapping did nothing and job count stayed 1 |
| Empty item | PASS | Real CIT6 `Roll Call Attendance` stayed disabled with `No study text found`; tapping did nothing and job count stayed 1 |
| Preparation failure | PASS | Mocked service/presentation regressions keep the source out of Ready, show retry, and prevent duplicate preparation |
| Network/API failure | PASS | Mocked authenticated service regressions preserve a useful safe error and retry path without false success |

## Retained limitations

- Canvas broad Files may be permission denied; valid exact module resources remain usable.
- Canvas broad Pages may be unavailable; valid exact module resources remain usable.
- PPTX ingestion is unsupported.
- DOCX ingestion is unsupported.
- Canvas Reviewer generation remains intentionally single-source because the accepted backend limit is one source per job.

## Final integrity

`git diff --check` passed. `git fsck --no-reflogs` passed with only the same
unreachable dangling objects. No Supabase migration or schema change exists in
B22. Production Vercel health is green. The pre-existing B8 directory remains
untouched and excluded from staging.
