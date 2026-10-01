# B39 student workflow and Canvas Task attachments — 2026-10-01

## Verdict

**BLOCKED — implementation and local regression checks pass, but current Canvas authentication, a fresh manual sync, and required realme attachment acceptance were not verifiable in this session.** No production deployment, Expo update/build, Canvas sync, or app data mutation was performed.

## Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `b8a0c54` (`Record B37.3 composite Canvas device acceptance`)
- The B37 Cloud Tasks → private Cloud Run Canvas worker architecture and its authentication, ownership, RLS, idempotency, and passive-sync controls were not altered.
- Starting untracked paths were left untouched: `UI/` (9/30 realme UI reference screenshots and README, relevant as prior B39 workflow evidence), `apps/mobile/.gitignore`, `supabase/.temp/cli-latest`, and `tmp/b37-current.png` (historical). `supabase/migrations/` was empty.
- A realme RMX3151 (Android 13) was visible to ADB as `PB6DWWEIHAUCMZOR`; no Android UI surface was available through the computer-control session. No UI actions were attempted through ADB.

## Implementation

- Canvas Task detail now reads owner-scoped `canvas_files` and `canvas_file_references` for `assignment` and `typed_attachment` references. Repeated references to one Canvas file collapse to one attachment card.
- Task detail returns only student-visible file metadata and displays an `Attachments` section only when it has entries.
- A tapped attachment uses an authenticated Stay Focused request. The server re-resolves the file through the active owner's stored Canvas credential, downloads it through the existing bounded Canvas client, and streams the bytes without returning a temporary Canvas URL or Canvas credential.
- Mobile writes the tapped file to its cache and opens Android's native file-sharing/app chooser with the original filename and MIME type. Attachment open performs a GET and does not enqueue sync or generation work.
- Generate now excludes files referenced only as assignment or announcement attachments. An independent Canvas module File reference keeps a file eligible for Generate.
- No migration was needed. Existing canonical Canvas file and reference rows remain authoritative.
- `expo-sharing` was added at the Expo SDK 54 compatible version. A new native Android build is required before this mobile open flow can be physically exercised.
- Existing course-first Tasks, Generate course search, Library organization/offline artifact store, Announcement dismissal sheet, Reviewer local search/section scrubber, and reduced-motion handling were retained.

Changed implementation files: `packages/shared/src/experience.ts`; `apps/api/app/api/experience/[...path]/route.ts`; `apps/api/src/lib/canvas-reviewer-sources.ts` and its test; `apps/api/src/lib/experience/repository.ts`, `service.ts`, and `experience.test.ts`; `apps/mobile/src/features/redesign/TasksScreen.tsx`; new `apps/mobile/src/services/canvasTaskAttachments.ts` and test; `apps/mobile/package.json`; root `package-lock.json`.

## Evidence and verification

| Area | Result | Evidence |
| --- | --- | --- |
| Canvas credential present/authenticated/account resolved | NOT VERIFIED | Current secure credential was not read or printed; cached data was not used as proof. |
| Fresh manual Canvas sync and job counts | NOT RUN | No app UI surface was available to trigger the normal manual Sync flow. No sync job was created by this work. |
| Assignment attachment routing | PASS (automated) | Regression verifies attachment-only files are excluded from Generate and a separately module-listed file remains eligible. |
| Task metadata, parent/course/owner association, deduplication | PASS (automated) | Activity detail tests cover owner-scoped references, one logical file across duplicate references, safe filename/MIME/extension/size, no attachment state when empty, and safe download resolution. |
| Authenticated on-demand mobile open request | PASS (automated) | New tests verify bearer-authenticated GET, filename/MIME preservation, no sync/generation route, and rejected/offline behavior. |
| API sync/auth regression suites | PASS (FRESH) | 6 API files / 72 tests; 6 API Canvas/source files / 110 tests. |
| Mobile workflow suites | PASS (FRESH) | 7 workflow/library/reviewer files / 91 tests; 3 Canvas sync files / 32 tests; 6 final focused files / 53 tests. |
| Canvas client | PASS (FRESH) | 1 file / 73 tests. |
| Typecheck | PASS (FRESH for changed packages) | Root `npm run typecheck`: 7 packages successful; API and Mobile were cache misses and ran `tsc --noEmit`. |
| Lint | PASS | API lint has no findings. Mobile lint has 0 errors and 4 existing `import/first` warnings in unrelated store tests. |
| `git diff --check` | PASS | Clean before implementation commit. |
| Physical Android | BLOCKED | No fresh B39 screens, sync, attachment file, Android preview evidence, or relaunch evidence collected. 9/30 UI screenshots are earlier workflow reference only. |
| Deployment/security | NOT RUN / no change | No Vercel, Cloud Run, Supabase, EAS, or production changes. Static code review found no client Canvas credential, temporary URL, service-role secret, sync dispatch, or generation dispatch in the new attachment UI path. Production log, private-worker IAM, and RLS checks were not repeated. |

## Failed first attempts

- The first new source-routing test expected the wrong order for a module-listed file and Page; the assertion was corrected to match existing deterministic module-first ordering, then the suite passed.
- Initial attachment mobile test harness attempts hit React Native Flow parsing and mock typing issues; native imports were made lazy and the request assertion now uses a typed capture. Final test and typecheck pass.

## Remaining B39 gates

1. On the realme, verify the current Canvas credential with a lightweight authenticated request; perform exactly one normal manual Sync and record pre/post counts, dispatch, worker completion, and last-success timestamp.
2. Verify same-assignment/same-attachment idempotency after resync and confirm no passive sync on navigation or relaunch.
3. Publish/install a native Android build containing `expo-sharing`, then open a real synced Canvas assignment attachment, return to the Task, and check Canvas authentication and job counts.
4. Complete on-device Generate routing, Library offline reopen, Announcement close/back/Canvas handoff, Reviewer search/jump, transition, and Reduce Motion checks.
5. Verify the remaining security/deployment gates against the deployed API and private Cloud Run service.

No B37 historical evidence was rewritten. B39 remains **BLOCKED** until the required current Canvas and device evidence is collected.

## Git

- Starting implementation HEAD: `b8a0c54`
- Implementation commit: `51f008b` (`feat(mobile): complete B39 student workflow and task attachments`)
- Acceptance/docs commit: recorded by Git after this document is committed.
- No push.
