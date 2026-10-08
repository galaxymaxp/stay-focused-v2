# B25.4 physical-device acceptance checkpoint

Date: 2026-09-16 (Asia/Manila). Branch: `b25-3-3-ai-first`, starting HEAD `6f618cf`; fix commit `9bdc03e`. No B26 work, push, merge, backend redeployment, credential capture, or test-data deletion.

## Production and device

- Production API: `https://stay-focused-v2-prototype.vercel.app`, deployment `dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4`, deployed commit `09835be`. `/` returned 200; `/api/health` returned 200 and `{"status":"ok","version":"2.0.0"}`. Unauthenticated Reviewer, Quiz, Activity-generation and Library routes returned 401.
- Physical realme RMX3151, Android 13, ADB-authorized. The user entered credentials directly on the phone. The signed-in session loaded linked Canvas data and survived an Expo Go force-stop/relaunch without an auth loop. No token or password was extracted.
- The previously installed standalone app generated the Reviewer against the deployed API; the current B25 mobile bundle ran through Expo Go with the same production API for Library, Quiz, Activity and Queue. Thus the successful Quiz/Activity acceptance is a physical production-API test, but is not yet proof that an updated standalone APK has been installed. A preview APK build containing the mobile fix was submitted as EAS build `c62d5d50-9f1a-4b9d-b575-e4f4195b89c2`; install/retest is pending at this checkpoint.

## Real-material acceptance

| Flow | Physical evidence | Result |
|---|---|---|
| Reviewer | CIT6 Capstone Project 1, ready Canvas PDF `CIT6 Course Introduction and Orientation 2026.pdf`. One new completed job and saved Reviewer; Library listed 23 sections and reopened the source-associated output. Course overview, explanation and learning outcomes were readable; no empty or duplicate migration sections or schema debris were observed. | Passed on production API and physical phone; entry was through the older installed client. |
| Quiz | Same ready CIT6 PDF; B25 Generate requested five mixed questions. One completed Quiz job, exactly five questions with answer options. The learner view showed no correct answer before each server-side check; five answers were checked, the server returned 5/5 (100%), and the completed attempt reopened from Library/history with Best 100%. | Passed on production API and physical Expo Go bundle after the mobile cache repair. Provider/repair call count was not exposed in safe UI telemetry. |
| Activity | Today-selected real CC16 IT Security `Assignment No. 1/Learning Contract`. Canvas instructions: individual work, five Expectations, five Contributions, five Motivations and five Hindrances as bullets in complete sentences. No attachment or supplied template was shown. One new completed job saved a draft with those four headings and five complete-sentence bullets each. It reopened from the Library after navigating away. | Passed on production API and physical Expo Go bundle; the generic draft still needs student review/personalization before any Canvas submission. |

The Queue displayed the newly completed Activity, Quiz and Reviewer in order, with no active/queued jobs. Library's All view showed exactly one new artifact of each type at the top, distinguishable from older Sep 14 records. Navigation did not create a second Quiz or Activity. Cancellation was not exercised because no job remained active when Queue was inspected; existing cancellation tests were not modified.

## Reproduced mobile failure and repair

The first two B25 Quiz taps failed before reaching the job screen with `JSON Parse error: Unexpected character: c`. No job was submitted. The owner-scoped local generation admission cache was malformed, and `readGenerationIntents` parsed it without a guard. Fix `9bdc03e` treats an unreadable or non-array local cache as empty, leaving accepted server jobs authoritative and discoverable in Queue. A regression test seeds malformed cache, creates an intent and proves one server submission. The reloaded phone then submitted one Quiz job and completed the 5/5 attempt.

This is a mobile release change; the Vercel API did not change and was not redeployed. The corrected mobile path has only been physically exercised in a local Expo Go bundle so far. Do not call B25 complete until the installable updated client is built and physically retested, or an equivalent released mobile bundle is verified.

## Security and regression

Production unauthenticated protected routes returned 401. The physical signed-in account read its own course, generation jobs, artifacts and Quiz result. Quiz learner projection removes answer-key fields; answer feedback is disclosed only after finalizing each answer, and completion/score is server-owned. Repository tests cover foreign-owner indistinguishable not-found and database RLS, but no second physical account was available for a live cross-owner probe. No server-side secret was placed in mobile source or captured in this evidence.

Fresh post-fix checks: API 864 passed / 3 skipped (83 files); Mobile 451 passed (38 files); Canvas 73; Engine 606; OCR 27; Shared 44; Workflow runtime 1 passed (sandbox dependency access failed first, then unsandboxed pass); provider contract 19; forced root typecheck, lint and build each 7/7 with zero cached; lint retained four pre-existing mobile warnings; `git diff --check` passed. The temporary Metro dependency-junction harness used only to run this isolated checkout was removed, along with generated env/config churn. The full build used that temporary harness and produced Android, iOS and web bundles.

Local-only physical evidence (not committed because it contains real learner material): `.local/b25-4/reviewer-source.png`, `.local/b25-4/reviewer-open.png`, `.local/b25-4/quiz-admission-failure.png`, `.local/b25-4/quiz-result.png`, `.local/b25-4/activity-source.png`, `.local/b25-4/activity-open.png`, `.local/b25-4/library-all.png`, `.local/b25-4/activity-queue.png`.

**B25 remains PARTIAL pending installable updated-client physical retest. B26 may not begin.** This supersedes the earlier sign-in-blocked checkpoint; it does not rewrite B25.3.3 historical results.
