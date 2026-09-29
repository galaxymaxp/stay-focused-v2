# B37.1 Activity generation: firewall/VPN failure (2026-09-29)

## 1. Starting state

- Repository: `b25-3-3-work`; branch `b25-3-3-ai-first`.
- Starting HEAD: `1d4ec55697ca93b8ecff87520eb62120e44d10bf`.
- Pre-existing dirty paths: untracked `apps/mobile/.gitignore` and `tmp/`. Both were left untouched.
- API: live production list confirmed READY URL `stay-focused-v2-prototype-4vzak4rqs-galaxymaxps-projects.vercel.app`, source metadata `3ed14286fa564c4abc7098a8bb4ebf5fcc153df5`, dirty staged build. Existing rollout ledger identifies it as `dpl_6UepXtqEVSPwnZMRYejoN5rMy38x`.
- Google worker before: `generation-worker-00010-g9v`, 100% traffic, image digest `sha256:0e86dcfbc9386223db6b760a95c4e7f87011f51b30970d52ecce42c2a99714c2`.
- Relevant API/worker Activity contract has no skew: both admitted the same job type and source pointer, and Dice Roller completed through Google. The same firewall source error also occurred on the earlier Vercel Workflow backend. Local later commits concern other work; their presence alone was not a reason to redeploy.

## 2. Working comparison — Dice Roller

- Course: CC17, Mobile Application Design and Development; course ID `fdcea97f-1228-469a-b81f-92c78663368f`, Canvas course `66935`.
- Source assignment: `87a383d9-7b3d-4412-84be-4c7a98eb6fab`, Canvas assignment `851881`; Canvas revision timestamp `2026-09-23T23:27:11Z`.
- Source type: synchronized Canvas assignment HTML, normalized to instruction text. This Activity path does not assign a `source_versions` revision: the job snapshot points to the assignment, and the assembled source is checkpointed before provider use. The 36-character snapshot is an assignment UUID, not instructional text.
- Most recent pre-fix success: job `37048e7b-92e8-43bf-9650-38d9bcac54d7`; snapshot `4625af59-4094-4640-97bb-4f2cae43679e`.
- Created `02:02:56Z`, claimed `02:02:58Z`, completed `02:03:07Z`, 2026-09-29. Google execution, one worker claim.
- Assembled instruction text: 361 characters, one source; usable, no extraction gap identified.
- Checkpoints: source assembly → one `activity_document` call → provider response → validated complete Activity. No repair.
- Validation/persistence: passed; one result and one draft. Type `programming`, seven sections.
- Artifact: `activity:73c54b41-5ac5-4df2-99c6-3f5a852ce8f2`.

## 3. Failed case — Implementing Firewalls and VPN

- Actual title: Assignment No. 5/Implementing Firewalls and VPNs.
- Course: CC16, IT Security; course ID `b9083a4d-4628-44d9-988d-49575445c34a`, Canvas course `61456`.
- Source assignment: `65babbb6-7b4a-45b1-ab1e-d482a607efa2`, Canvas assignment `803662`; Canvas revision timestamp `2026-06-24T08:49:49Z`.
- Same synchronized Canvas assignment ingestion path as Dice Roller. HTML: 2,206 characters. Normalized instructions: 1,097 characters, measured from the fresh post-fix source checkpoint against the unchanged assignment revision. No separate `source_versions` revision.
- Exact physical failure: `2026a424-93fc-47f8-a848-13f7ddd64f44`; snapshot `8714b2b9-8aeb-4104-a0d9-d7f5466090ed`.
- Created `2026-09-29T01:59:04Z` (09:59 Manila), claimed `01:59:09Z`, failed `01:59:17Z`.
- Status `failed`, stage `preparing_source`, Google execution, one worker claim.
- Internal error: `activity_source_unavailable`. Provider calls 0; repairs 0; source checkpoints 0; results 0; drafts 0.
- Student headline: “This generation couldn’t finish.” Stored worker message: “Activity generation could not be completed.”
- Trace: Mobile → authenticated API → accepted job → Google worker → assignment/course/source inventory → linked-page lookup **fails**. Provider, validation, repair, and persistence are never reached. There is no generated output, schema finding, provider timeout, truncation, subtype, or persistence error to inspect for this failed job.

## 4. Comparison

| Field | Dice Roller | Firewall/VPN original failure |
| --- | --- | --- |
| Source preparation | One local instruction source | Rejected a cross-course page link as missing local material |
| Input size | 361 extracted characters | 1,097 extractable characters; 2,206 HTML characters |
| Generated structure | Programming, seven sections | None; provider not reached |
| Provider | One call | Zero calls |
| Validation | Passed | Not reached |
| Repair | Zero | Not applicable |
| Persistence | One result, one draft | Not reached; zero artifacts |
| Final result | PASS | FAIL |

## 5. Root cause

`assignmentLinks` tested Canvas origin but discarded Canvas course identity. The firewall assignment belongs to course `61456`, but its HTML contains a page link and matching `data-api-endpoint` for course `55287`, slug `presentation-sequence-fw-and-vpn`. The assembler searches only owner/connection/course `61456` records, finds no such page, and throws `activity_source_unavailable` before writing the source checkpoint. Dice Roller has no local Canvas attachment link, so it avoids this failure.

The firewall assignment itself contains usable ordered instructions and a heading, not near-zero or garbage text. Its exact assignment module contains assignments/discussion, not additional file/page materials. No source size or token/output limit was hit. The title/link text stays in the normalized instructions; inaccessible cross-course content is not fetched, impersonated as a local source, or fabricated. The separate assigned scenario was not supplied and remains an explicit learner placeholder.

## 6. Fix

- `activity-maker/sources.ts`: require Canvas course identity when resolving links; exclude links explicitly scoped to another Canvas course from the local attachment lookup. Keep origin checks, owner/course filters, missing local attachment rejection, grounding, and limits intact.
- `activity-maker/activity-maker.test.ts`: regression for the exact cross-course page slug and its API endpoint; same-course resolution still works.
- `activity-maker/security.test.ts`: actual assembly regression, source text retention, owner isolation, and safe error view.
- `activity-maker/database.test.ts`: source HTML/link resolution → normalization → bounded generation with controlled provider → validation → real completion RPC → reopen, with duplicate completion rejected. Cases cover Dice Roller and the firewall/VPN presentation shape.
- `experience/service.ts` and mobile `GenerationScreen.tsx`: preserve a safe source-preparation reason under the existing friendly headline.
- No prompt, output schema, database migration, Canvas Tasks routing, Quiz, Matching, or export behavior changed.

Worker build `a3fac8b4-e0dd-46bc-958e-347d43673a9d` succeeded. Allowlisted staging excluded environment and credential files. Existing private worker revision `generation-worker-00011-n2s` now serves 100%. Existing identity/secrets/config were retained; anonymous invocation was not enabled.

The Vercel production deployment of the supplemental safe error mapping was **BLOCKED by automatic approval review**, which required explicit production authorization. No alternate deployment path was used. Approval was requested asynchronously; API rollout is pending. Mobile source change is present locally and served by the existing debug client; no EAS build.

## 7. Regression coverage

| Test | Result |
| --- | --- |
| Dice Roller/simple source | PASS automated and fresh realme generation |
| Firewall/VPN cross-course link shape | PASS resolver, actual assembly, and database pipeline |
| Validation | PASS, including presentation conversion and editable content |
| Persistence | PASS real RPC and live one-result/one-draft reads |
| Duplicate prevention | PASS completion replay rejected; live job has one artifact |

The first database regression run contaminated the existing suite's shared fixture counts. Its two new cases were isolated with rollback and the suite passed. The first `npm` call was blocked by PowerShell script execution policy; subsequent calls used `npm.cmd`.

## 8. Physical-device acceptance

On realme RMX3151, existing authenticated debug client, production API and patched private Google worker. Input was adb automation on the physical device, not a claim of real-finger interaction.

- Selected the same IT Security assignment, tapped Create Draft, observed Reading, then Completed in Queue.
- Fresh job: `ccfc860b-81ee-4d25-8c16-a9d9534dadd0`, created `02:31:02Z`, completed `02:31:33Z`. One worker claim, one provider call, no repair.
- Artifact: `activity:cccc17e5-86df-4972-8588-58fffbaa59d9`. Type `presentation`, 12 populated slides, all reference the instruction source, zero empty slides.
- Visible draft has usable scenario/security concern tasks and editable placeholders, rather than asserting an invented assigned scenario. Eleven missing-information warnings reflect unavailable scenario/research/personal content. The presentation and submission checklist retain the assignment's work-plan purpose. This is a draft requiring student completion, not a finished researched answer.
- Force-stop → relaunch existing development server → Library → IT Security → same generated draft reopened. Library showed one new intended card. Queue retained the original failed attempt separately without a ghost artifact.
- Fresh Dice Roller job `e8397ecb-623b-41c9-af43-2f0601ea0d49` completed `02:42:16Z`, one call/no repair, one result/one draft. Artifact `activity:fca3d605-2afb-4960-b18a-039ff52fbc5b`, six populated sections, type `technical_activity`; opened on device.
- Duplicate check: new firewall job one draft/one result; original failed job zero drafts/results; canonical firewall assignment count remains one. New per-job snapshots are expected provenance, not duplicate canonical sources. Existing Dice Roller artifacts were retained.

## 9. Full verification

| Check | Fresh result |
| --- | --- |
| API `npm.cmd test` | 102 files; 1,076 passed, three existing opt-in skips |
| Focused Activity + Google worker suites | Seven files; 72 passed, one opt-in skip |
| Mobile `npm.cmd test` | 73 files; 726 passed |
| API / mobile `npm.cmd run typecheck` | PASS |
| API `npm.cmd run lint` | PASS |
| Mobile `npm.cmd run lint` | PASS, four existing import-order warnings |
| Separate `npm.cmd run test:workflow` | PASS, one test |
| `git diff --check` | PASS |

Mobile lint and separate Workflow tests initially encountered sandbox filesystem resolution denials; both passed with normal filesystem access. Those initial failures were environmental, not concealed test failures.

## 10. Git

Commit is scoped to this Activity bug, its regressions, safe error presentation, and this evidence/current-state reconciliation. Starting untracked paths remain untouched. No EAS build, B38 work, origin push, or change to unapplied Matching migration.

## 11. Verdict

PASS — Implementing Firewalls and VPN generation failure identified, fixed, and physically verified

The supplemental API error-message rollout remains pending explicit approval. B37.1 as a whole remains PARTIAL for its separate outstanding acceptance gates.
