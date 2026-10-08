# B38 - Draft-first assignment UX

## 1. Starting state

- Branch: `b25-3-3-ai-first`; HEAD: `cc10d00` (`fix(activity): respect Canvas course scope in source links`).
- Unrelated untracked paths: `apps/mobile/.gitignore`, `tmp/`. Neither was edited or staged.

## 2. Student-facing changes

Task -> Assignment -> **Generate Draft** -> **Draft ready / Open Draft** -> saved editable **Draft**.

The artifact screen opens the existing Draft editor directly. Removed the separate Study Activity worksheet, response fields and worksheet completion display. Library categories are **All / Reviewers / Quizzes / Drafts**, with Draft card labels and course counts. Queue uses Draft wording. Missing-information warnings and editable placeholders remain. PDF/DOCX/PPTX export now uses the saved Draft sections/slides instead of the removed worksheet; confirmed edits immediately update the open artifact/export source and its existing device copy.

## 3. Internal infrastructure retained

No API, worker, prompt, generation contract, database schema or migration changes. Internal `activity`, `activity_output` and route names remain. Kept B37 course-aware Canvas source handling, preparation/linked materials, grounding, auth/ownership, validation, durable queue/background execution, idempotent admission/completion, Draft persistence/revision checks, SQLite copies, reconciliation and error handling. Canvas Tasks, Reviewers and Quizzes retain their existing data models and behavior. Historical local worksheet responses remain stored; this change neither deletes nor migrates them.

## 4. Dice Roller

**FRESH PASS** - source normalization -> controlled generation -> validation -> real database completion/reopen and rejected duplicate completion are covered by the existing B37 database regression. Fresh realme generation also completed: job `d4ddeb0c-2201-4504-86f2-ce22b534a422`, artifact `activity:0c398a25-e1cc-4622-8f45-c63bc2a46166`. One new Draft, type `technical_activity`, eight populated sections, editable. Device showed Draft ready and the direct Draft editor; no Study Activity form. Authenticated Library read found one card for the fresh result.

## 5. Implementing Firewalls and VPN

**FRESH PASS** - existing cross-course resolver, actual source assembly and real completion-RPC regressions pass. Same realme assignment generated through the existing production API/private worker: job `3bc9ba3a-1b52-4c6c-98de-364ceb982c7b`, artifact `activity:b7ee839c-117f-46f7-95ad-13c21419ddbd`, created `2026-09-29T03:28:46Z`. One editable presentation Draft with 12 populated slides, no empty slide, 12 missing-information warnings. Student/scenario details remain editable placeholders. Cross-course links keep B37 semantics: external-course content is not incorrectly resolved as local-course material or fabricated.

## 6. Automated verification

All final results below are **FRESH**.

| Check | Result |
| --- | --- |
| Focused mobile Draft/UI/Library/recovery/export checks | PASS - 103 tests, eight files |
| Mobile full `npm.cmd test --workspace @stay-focused/mobile` | PASS - 733 tests, 73 files |
| API full `npm.cmd test --workspace @stay-focused/api` | PASS - 1,076 tests, 102 files; three existing opt-in skips |
| Activity/Google worker/repository focused tests | PASS - 70 tests, seven files; one existing opt-in skip (overlaps full API) |
| Separate API `test:workflow` | PASS - one test |
| Mobile typecheck | PASS |
| API typecheck | PASS |
| Mobile lint | PASS - zero errors, four pre-existing import-order warnings |
| API lint | PASS |
| `git diff --check` | PASS |

New coverage verifies Draft completion/opening, unchanged Reviewer completion, assignment endpoint/intents, one Draft card under Drafts, absence of worksheet/status, editable placeholders, confirmed save to the same Draft/device record, immediate saved-revision display/export source and offline reopen without duplication. Export tests inspect Word/PowerPoint content and valid PDF bytes.

First focused mobile run failed on one stale wording expectation and a test that searched for a header control outside its mocked Page children; both corrected. First mobile typecheck caught missing Reviewer/Quiz capability fields in a new fixture; corrected. A PowerShell text edit introduced a BOM/encoding change; restored the original encoding and reran the full checks. Sandboxed mobile lint and Workflow import resolution failed on parent-directory access; both passed with the required filesystem access. An inspector-only helper initially rejected async callback syntax; a Promise-chain helper succeeded. No application test failure remains and unrelated warnings were not changed.

## 7. Physical device

**FRESH PASS** on realme RMX3151, serial `PB6DWWEIHAUCMZOR`, Android 13, existing debug client with current local JS and the existing authenticated owner. Input was adb automation, not a real-finger usability claim.

1. Opened Firewall/VPN from Tasks -> IT Security and tapped Generate Draft.
2. Generation completed; screen showed Draft ready / Open Draft.
3. Open Draft went directly to the existing saved editor, showing presentation/student/scenario placeholders and no separate Study Activity artifact.
4. Library -> IT Security -> Drafts showed the new Draft once. Reopened the same Draft from its card.
5. Device SQLite read confirmed one matching summary and a saved detail.
6. Disabled Wi-Fi and mobile data, force-stopped the app, relaunched using the existing Metro server over USB, then opened Library -> IT Security -> Drafts -> the same Draft. Device-copy guidance and populated editor were visible offline.
7. Restored Wi-Fi and mobile data (both report enabled). A fresh authenticated Library read still found one card for the Firewall/VPN result.
8. Also generated/opened fresh Dice Roller; one matching new result, populated editor and no Study Activity form.

Private UI trees/screenshots and aggregate probes remain under ignored `.local/b38/`; no credentials or private source fixtures were committed. Historical intentional Draft generations remain available and are not counted as duplicate completion of these fresh jobs.

## 8. Known limitations

- Mobile UX is verified in the existing debug client. No EAS build/update, production mobile distribution, API deployment or worker deployment was performed.
- Offline reading/reopen remains supported; saving Draft edits still needs a connection, as before.
- Removed worksheet responses remain stored but are no longer shown/exported. Exports use the saved Draft instead. Native Office opening is outside this focused acceptance; file content generation is automated-tested.
- Existing Canvas sync quota/status limitations are unchanged and did not block generation from the already-synced assignments. Historical B37 acceptance is unchanged.

## 9. Verdict

**PASS — Draft is now the assignment result and Study Activity is no longer student-facing.**

Next recommended task: distribute the tested mobile UX through the existing preview update channel. Do not begin that rollout as part of B38.

Commit scope: B38 mobile UX, focused regressions, this report and current-state/roadmap/sprint reconciliation only. No origin push.
