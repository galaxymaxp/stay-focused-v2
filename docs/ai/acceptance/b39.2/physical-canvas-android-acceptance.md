# B39.2 — Physical Canvas and Android Acceptance

Date: 2026-10-01 (Asia/Manila)

This is the B39.2 continuation of the historical B39.1 blocked report. It preserves the original result and records the physical repair and acceptance evidence separately.

## 1. Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `f28b69f`
- Device: realme RMX3151, Android 13, ADB serial `PB6DWWEIHAUCMZOR`
- Installed build: EAS build `de93f504-cb53-4388-b48a-47103d65eb3a`, version 2.0.0, runtime 2.0.1
- API deployment before this run: B39.1 production deployment `dpl_74hWVM2kSvg21hfnRLcVu885ohFe`
- Initial unrelated untracked paths: `UI/`, `apps/mobile/.gitignore`, `supabase/`, `tmp/`; all left untouched.

## 2. Android control

- ADB: connected to the physical device throughout the acceptance run.
- Package: `com.galaxymaxp.stayfocusedv2`
- Launch activity: `com.galaxymaxp.stayfocusedv2/.MainActivity`
- UI hierarchy access: `uiautomator dump` and local parsing of text/bounds.
- Screenshot access: `exec-out screencap -p`; all retained PNGs have valid PNG signatures.
- Input/tap access: ADB tap, swipe, Home, and Android Back key events.
- Logcat access: app-process-only logcat inspected with secret-pattern counts; raw log lines were not saved.

## 3. Canvas authentication

The existing signed-in session remained active. The app reached the connected Canvas account at `uc-bcf.instructure.com`, displayed 81 courses, and loaded Canvas-backed Generate and Tasks data. Private account identifiers and Canvas links are omitted from this report.

## 4. Fresh Canvas synchronization

- Last sync before: the latest existing logical job completed on 2026-09-30; aggregate count was 468 jobs.
- Sync pressed: four explicit physical course-sync actions during B39.2; no sync button was pressed during the final passive sequence.
- Logical job count before: 468.
- Logical job count after: 476, an increase of eight jobs: one `course_content` plus one `course_grades` job for each manual action. Each job was dispatched and started once, then succeeded.
- Cloud Tasks: dispatch and worker start were recorded for both job types.
- Cloud Run: private `generation-worker` revision `generation-worker-00018-49v`, serving 100%; 33 revision log entries and zero `ERROR` severity entries.
- Completion: all eight added jobs succeeded. The final idempotency sync created one task and one file reference of each expected type, without duplicates.
- Last sync after: 2026-10-01 07:23:27–07:23:37 UTC (15:23:27–15:23:37 Asia/Manila); the content and grade jobs each had `dispatched=1`, `started=1`, and `succeeded` status.
- Production API: deployment `dpl_GGanDYkLZ3eoLT6JmDmQMtxu46Ya` was READY; `/api/health` returned 200. The unauthenticated attachment route returned 401.

## 5. Tasks physical acceptance

- Course: Web Information System (CIT17; Canvas course code `CITCS 3N Group A`).
- Task: Learning Contract.
- Due/status: due Sep 7 at 11:59 PM; Submitted/completed in the course task list.
- Course-first hierarchy: Tasks displayed course cards and per-course due/completed counts before individual tasks.
- Task detail: instructions and a distinct Attachments section were shown for the same assignment.

## 6. Real attachment acceptance

- Filename: `Learning-Contract-Template.docx`
- MIME/type: DOCX, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`; UI displayed `DOCX · 15 KB`.
- Parent Task: Learning Contract in Web Information System (CIT17).
- UI metadata: one attachment row under the correct Task.
- Authenticated download: requested by the signed-in app; the Android chooser showed the same filename. Saved through My Files to Downloads as a 15,166-byte file; the file was recognized as a ZIP-based OOXML DOCX.
- Native open/share: Android share sheet opened with the DOCX filename and native share/save targets. Saving through My Files returned to the Task. This device had no installed DOCX editor, so editor rendering was not asserted.
- Correct file: the saved filename, size, and DOCX container matched the displayed attachment.
- Returned to Task: yes, after the My Files save flow.
- Canvas sync created: none during attachment open/save.
- Generation created: none.
- Generate leakage: none; Generate showed three lecture PDFs and did not show the assignment or its DOCX.

## 7. Offline attachment acceptance

- Task available offline: yes; cached course/task metadata remained visible.
- Detail available offline: yes.
- Filename/type visible: yes, including the separate Attachments row and `DOCX · 15 KB` label.
- File cached: no; attachment bytes were not retained as offline content.
- Offline attachment action: displayed “Connect to the internet to open this attachment.”
- Result: expected clear offline message; Wi-Fi and mobile data were restored, and Canvas course data loaded again.

## 8. Attachment resync

- Task copies before: 1 Learning Contract row.
- Task copies after: 1.
- Attachment copies before: 1 matching Canvas file with one assignment reference and one typed-attachment reference.
- Attachment copies after: unchanged at 1 file and one reference of each type.
- Result: second deliberate post-repair sync was idempotent.

## 9. Generate

- Course: Web Information System (CIT17).
- Material: Lecture Presentations with three instructional PDFs: Introduction to Web Information Systems, Web Architecture, and UNIT 3 Front-End Development and Web System Design.
- Assignment exclusion: confirmed; the assignment appears through the separate “Assignments and tasks” route to Tasks, not as Generate material.
- Attachment exclusion: confirmed; `Learning-Contract-Template.docx` does not appear in Generate.
- Announcement exclusion: confirmed; no announcements appear in the Generate material hierarchy.
- Android Back: returned from the course/material hierarchy to the Generate course list, not Today.
- Gesture/back: the in-app back arrow was separately tested and returned to the same Generate course list. No horizontal back gesture was needed.
- Result: course search for `CIT17` filtered the course list to Web Information System; material separation held.

## 10. Library

- Course: Web Information System (CIT17).
- Artifact: existing Web Information Systems Reviewer, among three persisted CIT17 reviewers.
- Drill-down: course grid → CIT17 → existing artifact → Reviewer opened without generating an artifact.
- Force-stop/relaunch: app relaunched to the signed-in Today screen; Library still listed CIT17 and its three reviewers.
- Persistence: after force-stop/relaunch, CIT17 and its Reviewer artifact remained visible in Library. Library offline availability was not separately tested; opening the existing artifact triggered no generation or sync.
- Result: pass.

## 11. Announcements

- Announcement: “Android Studio Activity 09/15/26” in CC17.
- Close: Close dismissed the announcement detail.
- Android Back: reopening the detail and pressing Android Back dismissed it.
- Open in Canvas: launched Chrome to the corresponding Canvas discussion.
- Trapped modal: none; the announcement could be closed, reopened, dismissed by Back, and reopened for Canvas handoff.
- Result: pass. During one later share-sheet exit, an exploratory coordinate was accepted by Android’s chooser and opened Messenger. No message was sent and no recipient was selected; I backed out and restored Stay Focused before continuing.

## 12. Reviewer

- Reviewer: existing Web Information Systems Reviewer; no Reviewer was generated for this test.
- Search term: `architecture`.
- Search result jump: selected “Leading Web Servers: Apache vs. Nginx”; Reviewer moved to Topic 15 of 18 and highlighted matching text.
- Section navigator: right-edge swipe moved to Topic 14, “Web Servers.”
- Motion: topic navigation and search result jumps worked at the original animation scales (1/1/1).
- Reduced Motion: Android Accessibility → Remove animations was enabled temporarily; scales changed to 0/0/0. Search result and section jumps still worked. The setting was turned off afterward and scales were verified restored to 1/1/1.
- Result: pass.

## 13. Passive-sync counts

The baseline was 476 jobs after all intentional syncs. The required passive workflow then ran without pressing Sync. Intermediate job totals were not separately queried after each individual screen; the aggregate before and after the sequence was identical.

| Action              | Logical sync count |
| ------------------- | -----------------: |
| Baseline            | 476 |
| Launch              | 476* |
| Today               | 476* |
| Generate            | 476* |
| Tasks               | 476* |
| Attachment open     | 476* |
| Library             | 476* |
| Announcement        | 476* |
| Reviewer            | 476* |
| Force-stop/relaunch | 476* |

\* Per-action values indicate the unchanged count observed at the final aggregate check; actions were not each followed by a separate database query.

- Unexpected sync: no; final total remained 476 (216 successful content jobs, 171 successful grade jobs).
- Result: passive navigation and the authenticated attachment-file request created no full Canvas sync jobs. An attachment download is a file request, not a Canvas sync job.

## 14. Security

| Check                   | Result | Notes |
| ----------------------- | ------ | ----- |
| Canvas token leakage    | Pass | App-only logcat scan found zero token-pattern matches. |
| Authorization leakage   | Pass | Zero Authorization/Bearer-pattern matches in app-only logcat. |
| Owner-scoped attachment | Pass | Download uses the authenticated app route; anonymous access returned 401. File references are scoped by user, Canvas connection, and course. |
| RLS/account isolation   | Pass | Existing owner-scoped schema and access path were preserved. No account switch was performed on the physical device. |
| Cloud Run privacy       | Pass | Service remained private; invoker IAM binding is limited to the `generation-invoker` service account. |

The same sanitized scan found zero `SUPABASE_SERVICE_ROLE`, access-token, refresh-token, or signed-URL signature-pattern matches. Raw logs and private URLs were not added to evidence.

## 15. Defects found

Physical testing reproduced one defect: Learning Contract’s DOCX link was present in assignment instructions but absent from the Task Attachments section because the Canvas course-file inventory did not include this assignment-linked file. After repair and a physical resync, the attachment appeared with its filename/type and opened through Android’s share/save flow. No other unresolved physical defect was found.

## 16. Verification after repairs

| Check | Result | Notes |
| ----- | ------ | ----- |
| Focused regression tests | Pass | `assignment-file-metadata.test.ts` and `canvas-file-normalize.test.ts`: 6 tests passed. |
| API typecheck | Pass | `npm run typecheck --workspace=@stay-focused/api` |
| Lint | Pass | Affected API scope. |
| Diff whitespace | Pass | `git diff --check` |
| Production API | Pass | Vercel deployment READY; health 200; anonymous attachment request 401. |
| Worker deployment | Pass | Cloud Build `08e3ae97-e072-493a-98e8-3ec43816a45f` succeeded; image digest `sha256:f9d3c3a6117f177a7626524b12ae0a79035f31566575a1008af03453b6ad70d4`; private Cloud Run revision `generation-worker-00018-49v` served 100%. |
| Physical repeat | Pass | Post-deploy sync populated the expected task/file references and the physical Task detail showed the attachment. |
| B37 architecture | Pass | Private Cloud Run worker and its service-account invoker boundary were preserved. |

Implementation commit: `2545cb4 fix(canvas): resolve assignment-linked attachment metadata`.

## 17. Evidence

Fresh B39.2 screenshots and sanitized hierarchy evidence are in `docs/ai/acceptance/b39.2/evidence/`:

- Canvas/session and sync: `01-launch.png`, `02-canvas-connected.png`, `03-before-sync.png`, `03-before-sync-repair.png`, `03-before-sync-worker.png`, `04-sync-repair-running.png`, `04-sync-worker-running.png`, `05-sync-repair-complete.png`, `05-sync-worker-complete.png`.
- Tasks and attachment candidates: `06-tasks-courses.png`, `07-task-detail.png`, `08-task-attachment.png`, `08-task-detail-hierarchy.txt`, `09-cit6-tasks.png`, `09-cit6-task-detail.png`, `09-cit6-attachment-candidate.png`, `10-cit5-task-detail.png`.
- Native attachment, offline, idempotency: `09-native-attachment-open.png`, `offline-task-courses.png`, `offline-task-course.png`, `offline-task-detail.png`, `offline-attachment-open.png`, `11-idempotency-sync-running.png`, `12-idempotency-sync-complete.png`.
- Generate and navigation: `10-generate-course-list.png`, `11-generate-course-materials.png`, `12-generate-back-course-list.png`, `36-generate-in-course.png`, `37-generate-in-app-back.png`, `28-passive-generate-course.png`.
- Library and Reviewer: `13-library-courses.png`, `14-library-cit17-artifacts.png`, `15-reviewer-open.png`, `16-reviewer-topic-search.png`, `17-reviewer-topic15.png`, `18-reviewer-reduced-motion.png`, `24-library-after-relaunch.png`, `30-passive-library-reviewer.png`, `32-passive-reviewer.png`, `33-reviewer-reduced-search.png`, `34-reviewer-reduced-topic15.png`.
- Announcements and relaunch: `19-today-announcements.png`, `20-announcement-open.png`, `21-announcement-reopened.png`, `22-announcement-open-canvas.png`, `23-relaunch-today.png`, `27-passive-relaunch.png`, `31-passive-announcements.png`.
- Passive attachment and settings restoration: `25-passive-task-attachment.png`, `26-passive-attachment-share.png`, `29-passive-attachment-share.png`, `35-settings-remove-animations-restored.png`.

All retained PNGs were checked for the PNG signature. Private UI XML dumps were removed; no raw logs or credentials are committed.

## 18. Git

- Implementation commit, if any: `2545cb4 fix(canvas): resolve assignment-linked attachment metadata`
- Acceptance commit: this documentation and evidence commit; commit hash is recorded in the final task summary.
- Final HEAD: this acceptance commit; repository history records its hash.
- Remaining dirty files: none expected under B39.2 after its acceptance commit; pre-existing unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/`, and `tmp/` remain untouched.
- Unrelated files untouched: `UI/`, `apps/mobile/.gitignore`, `supabase/`, and `tmp/`.
- Push: not pushed, per task instruction.

## 19. Final verdict

PASS — B39 physical Canvas sync and Tasks attachment acceptance passed

Next recommended milestone:

```txt
B40
```
