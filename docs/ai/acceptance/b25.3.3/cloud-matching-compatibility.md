# B25.3.3 cloud Matching compatibility and acceptance handoff

Date: 2026-10-08, Asia/Manila. Scope: the approval in `b8967f3`; generation
convergence only. Overall: **PARTIAL / BLOCKED at fresh generation, compatible
production rollout, and physical success-path acceptance**.

## Restored baseline and changes

### Published-key follow-up — 2026-10-08

The owner replaced/published the OpenAI key and authorized continuation. This
task resumes at `29aa524bc08ff11531ef80a7db4dc6c47c552ed0`, clean on the same
scoped branch. FRESH runtime inspection observes spec revision **16**, current
observations, enforced network policy, and the configured network secret ready.
The attached `source_config_version_id` still identifies
`cecfgver_6ac6ddc6309c81938cafc7edc32c2e7f`, the same saved version inspected
before publication. The runtime tool describes this task's instance, not the
latest published environment configuration; newly published secret adoption
cannot be established here.

The original instructional snapshot was reread through the same constrained
owner/file/hash joins. Its 23 blocks, exact-source hash and normalized harness
block hash match the provenance below; no generated output was reused.

| Today's ledger position | FRESH result at `29aa524` | Evidence |
| --- | --- | --- |
| 5 — fourth real-source engine run | FAIL: 0/5, 417 ms, one author invocation, zero verifier invocations, HTTP 401 | Run `0c2ed547-41ab-40d4-8e35-65fe126dc254`; strict five-slot plan, same model/gates/bounds; `provider_failure` / `authoring_provider_failed`; `/tmp/b2533-live-attempt-5-safe.json` and corresponding `.log` |
| 6 — independent minimal Python Responses authorization probe | FAIL: HTTP 401, `invalid_api_key`, 500 ms; no private/instructional input, no generation acceptance | Run `1f6dfca1-101e-4b9e-b6cf-2b4e7a572353`; `/tmp/b2533-authorization-attempt-6-safe.json`; preserved HTTPS proxy and CA trust, no retries |

Ledger now **6/10 conservatively consumed; at most four remain for 2026-10-08**:
four instructional generator attempts and two minimal authorization probes.
Read-only diagnostics do not consume generation attempts. No successful
Responses usage/billing result was returned; do not infer zero cost or reset
the allowance. Paid retries are paused until new authorization/binding evidence.

Read-only SDK/Python pinned-model GETs pass. A fake/nonexistent Responses ID
lookup returns 404. These are not POST authorization or generation proof.
A temporary Vitest transport probe confirms the SDK alias equals the configured
binding, inherited proxy variables are present, `NODE_USE_ENV_PROXY=1`, and
the worker uses `EnvHttpProxyAgent`. Python POST independently fails with the
same `invalid_api_key`; the failure is not specific to Vitest/Node. The saved
key's correctness and adoption remain unknown; do not blame the owner's key
or weaken generation schema/validation based on these errors. Safe transport
observations are `/tmp/b2533-read-only-transport-safe.json`. The temporary test
source and private source input were removed; no product/test code changed.

FRESH remote heads still contain main `cff27bc`, the three recovered checkpoints,
and `codex/hosted-processing-prototype` at `debc23a`. Read-only fetch/inspection
finds the latter dated 2026-08-06 and lacking the later canonical-source/
Matching migrations; it does not resolve deployed API/worker/client lineage.
`EXPO_PUBLIC_API_BASE_URL` still is not a usable HTTPS origin. Required learner,
deployment/EAS credential names remain absent, with no controllable device.

Mandatory row 8 remains attempted/BLOCKED and row 9 NOT RUN/BLOCKED; row 6's
live preservation and row 10 closure remain outstanding. The earlier fresh
cloud automation/gates below are retained evidence at unchanged product bytes,
not rerun results for this follow-up. Only documentation changed, so new
implementation suites/root gates are NOT APPLICABLE; scoped diff/link checks
are required and recorded on delivery. No production data/contract was changed.

The smallest next credential step is to start a fresh task from the republished
environment and verify its attached configuration/version and a bounded
Responses request before further acceptance. Official
[saved-state/update guidance](https://learn.chatgpt.com/docs/environments/cloud-environments#reuse-and-update-saved-state)
states that existing tasks retain their own state. Continue from this scoped
branch/patch and the six-attempt ledger; never restart the scaffold or reset
acceptance. No task creation or environment reattachment capability is exposed
to this agent. If fresh adoption still returns 401, correct the environment's
requested network-secret binding/Responses credential through configuration,
without putting credential values in chat.

Repository `galaxymaxp/stay-focused-v2`, initial recovered checkpoint
`de09b9ce510ecce3a8ff3ae630234a7dfc546c9b`. FRESH remote inspection resolves
the three supplied recovery branches; `b8967f3`, `f336d26`, and `de09b9c` are
all ancestors of the recovered checkpoint. The remote fetch configuration
tracks only main, so the recovery refs were fetched explicitly. Initial cloud
tree: clean, with none of the 127 unrelated local dirty files present.

Implementation branch: `codex/b25.3.3-cloud-compatibility`. The earlier cloud
startup blocker commit `aeb4b77` remains preserved on `work`; its missing-history
finding is resolved by recovery, not by reconstructing the implementation.
Read AGENTS.md, AUTOPILOT.md, the current planning documents, ADR-001,
ADR-011, the original acceptance report, and the Matching implementation record.
Existing cloud Git identity was preserved. No Goal lifecycle is asserted.

Implementation commit `f0e40f25cd3384d3111bdff90005c8cb0295e0a6` adds:

- A read-only metadata/aggregate inspection and offline assessment command,
  `scripts/check-quiz-deployment-compatibility.ts`. It compares actual RPC
  signatures/body fingerprints to the checkpoint migrations, checks RPC grants,
  empty search paths and table read/RLS settings, and blocks unsupported saved
  behavior. It never applies migrations, deploys, opens network connections or
  prints private rows. This is an operator preflight, not an automatically
  installed deployment gate or proof of complete compatibility.
- Three Postgres/API projection regressions: real checkpoint metadata matches;
  changed named arguments/scoring, unsafe access and missing metadata block;
  saved legacy Matching cannot be transparently reopened/answered by this
  checkpoint, and remains blocked even when the local RPC bodies match.
- An opt-in fresh-owned-source harness for the existing strict generator and
  disposable PGlite persistence. Its planning-only mode makes no provider call.
  It never replays accepted/generated outputs and writes only symbolic summaries.
  After the implementation commit, the harness also records whitelisted provider
  failure classifications and HTTP status without printing raw errors.

No runtime API/Matching DTO, generation schema, validator, model, call bound,
historical migration, saved Quiz, attempt or scoring rule was changed. The
implementation makes an unsafe release reviewable and rejectable; a production
adapter remains blocked by missing deployed source/release evidence.

## Evidence-backed contract trace

FRESH read-only Supabase inspection targets project `xfdbwfqtorelmurncyql`
(`stay-focused-v2`, PostgreSQL 17). Migration metadata includes
`20260928131513 matching_blocks`, `quiz_study_state`, `quiz_clear_drafts`,
canonical Reviewer/source and Google generation migrations absent from this
checkpoint, and `20261001015542 close_stranded_canvas_staging`. It does not
include this checkout's `20261007155114_quiz_matching`.

| Surface | Checkpoint behavior | FRESH deployed database evidence / limitation |
| --- | --- | --- |
| Generation/admission | `sources.ts` resolves Canvas/Reviewer sources; service calls `create_quiz_processing_job` with `p_reviewer_id` | Live argument is `p_reviewer_artifact_id`; named PostgREST dispatch is incompatible. Current deployed producer/model/checkpoint source is unavailable |
| Validation | Strict 2–6 explicit left/right items, private bijection, independent all-pair audit, exact count and immutable acceptance | Live answer RPC validates blocks when `matchingPairs` has at least three items, colon-encoded references and existing option IDs. Actual deployed author/verifier code is not identified |
| Worker persistence | Public `leftItems`/`rightItems` whitelist, private `correctPairs`; payload uses `reviewerId` | Live completion whitelists `options` and `leftItem`, checks canonical `reviewerArtifactId`/`sourceVersionId`, and preserves canonical source links. Legacy `reviewer_id` still exists alongside canonical columns; renaming one parameter would not reconcile the source flow |
| API reads / reopening | `learnerQuestion` and Library projection validate explicit sides; legacy block fixture throws safe `unavailable` | Actual HTTP responses and deployed reader code cannot be established from RPC bodies; the live format inventory proves old data must remain readable |
| Client rendering | QuizScreen/MatchingQuestion render explicit readable sides and restore pairs by ID | Supported deployed native/browser versions and their renderer code are unavailable; current device/session cannot be inferred from historical runs |
| Submission | PATCH `{type:'matching',pairs,finalize}`; SQL receives an object | Live RPC receives an array of strings, e.g. synthetic `left1:right2`, and stores `selectedOptionIds`. Sending this checkpoint's object is rejected |
| Scoring/completion | Exact question-level correctness; every question must be finalized; result projection recomputes the same percentage | Live SQL counts each Matching pair, excludes assisted questions, skips unfinalized answers, and stores its resulting percentage. Replacing it changes existing semantics; this task does not authorize adding Finish Anyway |
| Attempts/history | Explicit Matching answers/feedback; source-private keys released only after question finalization | Existing encoded answers and assisted state require their original readers and score policy. The current API's `resultView` cannot represent live weighted/assisted results faithfully |

For example, two correct pairs out of a three-pair block plus four correct
choice questions gives live SQL `6/7 = 85.71%`, while checkpoint question-level
scoring gives `4/5 = 80%`. Converting IDs alone would change the score.

Aggregate-only inventory: **48 legacy Matching questions**, **66 questions of
types outside this checkpoint's union**, and **2 assisted attempts**. These
are counts, not retrieved stems, answers or keys. The offline preflight exits
1 / BLOCKED with eight issues: creation named-argument drift, four changed RPC
bodies, and the three saved-behavior inventories. RLS/read grants and inspected
RPC service-only privileges/empty search paths match the checked metadata;
that does not replace live two-owner API acceptance or a policy audit.

**Compatibility verdict: INCOMPATIBLE for direct rollout.** A preservation
boundary and coordinated release are required. A transparent payload-only
adapter is insufficient. Prefer porting only the B25.3.3 convergence repairs
onto the actual deployed lineage while retaining its existing formats/scoring,
source handling and clients. If a new explicit-pair format is retained instead,
first implement reviewed dual readers plus version-specific submission/scoring
and compatible producers; preserve existing saved bytes and completed scores.
No such adapter or production migration is claimed implemented here.

## Fresh real-source attempt evidence

The owner established **10 generation attempts for 2026-10-08**, rather than
a monetary cap. Existing per-slot/two-candidate/transport bounds were retained.
Three generation attempts and one minimal Responses authorization probe were
made; conservatively charge **4 of 10**, leaving at most **6** for this date.
No successful token-usage/billing response was returned. Do not reset this
ledger or infer a dollar allowance on resume.

Source provenance: the material referenced by historical failed job
`d038e85b-ae03-4853-aa2a-f663037415b0` still exists. That old job/output is not
acceptance evidence. Its material is `file:b08d03f7-9e36-44e0-a9f0-0bc9c6d9cd2a`.
The read is owner-joined through that job, scoped to unedited accepted source
snapshot `84e37782-8cff-4ad5-8dd4-9cad17080974`, and constrained to the current
file hash. No generated Reviewer text or old Quiz candidates were used.

- Stored PDF SHA-256: `581fd9467eb240dd16445015c4d75809809c4d643625799412de90bcb58f1f83`.
- Exact accepted-source SHA-256: `46b767eb3575a78f87fc53d418d54a38809b829018657c84004f1992368a1712`.
- Normalized source SHA-256: `631316b4c228e139c06332cb2db0c42b9497a2cb5198f8bc012a199efe24fee4`.
- Private input: 23 original persisted source blocks, pages 1–23, 7,167 text
  characters; source is unedited. Parser `canvas-stored-file-extraction-v1`,
  OCR/block version `canvas-ocr-structured-blocks-v1`.
- Harness block SHA-256: `eb49abf8acc9be20537295d29facb50b73d6ea5cccc8a65655b113039c67f2f2`.
  Reconstruction uses the existing `regionsFromBlocks` with exact saved
  block/page identities, not a new source-intake/production endpoint.

FRESH planning-only run `646d79c2-2ae3-468c-8f2f-3114da32ba2f` plans five slots
(medium/medium/medium/easy/easy), in 22 ms, with zero provider calls. This proves
source planning, not academic generation or production intake acceptance.

| Fresh attempt | Result | Safe evidence |
| --- | --- | --- |
| 1: `272ed16e-b1d3-4a07-9af6-71fe151d261c` | FAIL at provider boundary, 0/5, 5,751 ms | One author invocation, zero verifier invocations; `provider_failure` / `authoring_provider_failed`. Proxy-aware Node transport had not been enabled; the underlying HTTP status was not captured |
| 2: `b5b3e721-b200-43fe-8363-b9dc070acacd` | FAIL at provider boundary, 0/5, 525 ms | Proxy-aware Node enabled after a successful read-only pinned-model metadata probe; one author, zero verifier invocations. No raw error retained |
| 3: `63184892-90bd-40ca-8a77-195b10580f50` | FAIL at provider boundary, 0/5, 417 ms | Same source/model/strict gates; one author, zero verifier invocations; newly safe classification captures HTTP 401 |
| Minimal authorization probe | FAIL, HTTP 401 `invalid_api_key` | Direct SDK Responses request through the inherited proxy, no instructional/private prompt, confirms an external credential/Responses authorization blocker rather than an academic/schema finding |

Tested generator/runtime bytes: `f0e40f2`; attempt 3 adds only the recorded
harness diagnostic classification. Model remains `gpt-5.4-2026-03-05`.
These run IDs are local harness identifiers, **not production job/Workflow IDs**.
All attempts fail before the SQL persistence portion: no new production
Quiz/job/attempt/result and no generated local Quiz is claimed. No old output,
mock or synthetic fixture substitutes for failed fresh acceptance.

## Verification and limitations

Cloud: Node 24.19.0, npm 11.9.0 (repository declares npm 10.9.2 and minimum npm
10), fresh `npm ci --no-audit --no-fund` from the recovered lockfile, no dependency
or lockfile edit. Network is enforced/restricted; OpenAI/package/Git destinations
are allowed, no VPN/TCP grants. Supabase metadata/source SELECTs use the connected
MCP channel. Direct Supabase/hosted API destinations are not granted.

Runtime status now reports the configured secret and five runtime variables
ready; actual calls still require independent authorization. `OPENAI_API_KEY`
is absent, so the authorized `STAY_FOCUSED_OPENAI_API_KEY` binding was aliased
only for test commands, preserving proxy headers and CA trust. HTTP 401 on
Responses remains the decisive blocker. `EXPO_PUBLIC_API_BASE_URL` is present
but not a usable HTTPS origin. `SMOKE_TEST_EMAIL`, `SMOKE_TEST_PASSWORD`,
`VERCEL_TOKEN`, `EXPO_TOKEN` and `EAS_ACCESS_TOKEN` are absent; no authenticated
learner session/deployment/build capability was established. No adb/emulator
binary or controllable authenticated physical device is available.

| Check | FRESH cloud result |
| --- | --- |
| Initial recovered Quiz suite | 219 passed / 3 opt-in skipped |
| Final focused Quiz suite | 222 passed / 4 opt-in skipped, 8 files passed / 1 skipped |
| Full API suite | 999 passed / 5 opt-in skipped, 85 files passed / 1 skipped |
| Mobile / shared | 467 / 26 passed; 39 / 4 files passed |
| Workflow / provider boundary | 1 runtime test / 18 contract checks passed |
| Forced root build | 7/7 successful, zero cached, 4m37.246s; Web/iOS/Android exports, no APK or hosted deployment |
| Forced root lint | 7/7 successful, zero cached; four existing mobile `import/first` warnings |
| Forced root typecheck | Final PASS: 7/7 successful, zero cached, 36.357s. First attempt failed on 23 stale ignored Expo route errors; repaired by regenerating types |
| Offline CLI typecheck | PASS with strict explicit TypeScript invocation |
| Database-only preflight | FRESH BLOCKED on live inventory; expected and necessary rejection, not a failed checkpoint-unit test |
| Physical / browser authenticated success path | BLOCKED / NOT RUN; exports and offline Metro startup are not device/browser acceptance |

Historical mobile/shared totals include local/generated files absent from this
cloud checkout. They are not reused as fresh results. Unaffected engine,
Canvas and OCR full suites were not rerun; their build/typecheck/lint gates
are included in root verification. No cached verification result is claimed.

The gates used the repository commands from AUTOPILOT.md:
`npm run test -w @stay-focused/api -- src/lib/quiz`, full API/mobile/shared
workspace tests, `npm run test:workflow -w @stay-focused/api`,
`npm run provider:contract -w @stay-focused/api`, and
`npm run typecheck -- --force`, `npm run lint -- --force`,
`npm run build -- --force`. The opt-in owned-source run used
`B25_3_3_LIVE=1` and a private `B25_3_3_LIVE_INPUT` with the test named
`B25.3.3 fresh owned prepared source: strict generation and disposable SQL persistence`;
planning additionally used `B25_3_3_PLAN_ONLY=1`. The final CLI was separately
checked with strict TypeScript. Product bytes were `f0e40f2`; the last live
attempt/final typecheck/focused suite also included the small diagnostic-only
harness change recorded in the follow-up commit. Final report edits do not
change tested product bytes.

Safe local evidence files are `/tmp/b2533-quiz-final.log`,
`/tmp/b2533-api-full.log`, `/tmp/b2533-mobile-full.log`,
`/tmp/b2533-shared-full.log`, `/tmp/b2533-workflow.log`,
`/tmp/b2533-provider-contract.log`, `/tmp/b2533-root-typecheck-final.log`,
`/tmp/b2533-root-lint.log`, `/tmp/b2533-root-build.log`, and the three
`/tmp/b2533-live-attempt-<n>-safe.json` reports. They are ephemeral workspace
evidence, not committed artifacts or production identifiers. Read-only
inspection metadata is `/tmp/b2533-live-inspection.json`. FRESH Git integrity,
scoped whitespace and new report/planning link checks pass. Private source
input and incidental Expo-generated tracked/untracked drift are removed before
delivery; the unrelated baseline branch remains preserved.

The owner will check the API key later. HTTP 401 establishes failure through
this cloud binding, not proof that the owner's saved credential itself is
incorrect; investigate injection/binding and Responses authorization without
exposing values. No further paid retry is eligible until new evidence resolves
that prerequisite.

Retained failures: first new database regression failed to transform because
an `await` was inside a synchronous assertion callback; fixed without weakening
the assertion. A metadata query referenced a nonexistent timestamp column;
corrected using the observed schema. The first root typecheck found 23 stale
Expo route errors after switching from the old cloud baseline. Existing routes
were verified, and `expo start --offline --port 8085` regenerated ignored
typed routes; no casts, validation/config relaxation or app route edits. The
temporary Metro helper was stopped. Build-generated `next-env.d.ts` drift was
restored to HEAD before the final typecheck. All provider failures remain
recorded; no schema change or difficulty relaxation was justified by HTTP 401.

## Rollout and exact remaining handoff

Run from the repository root:

```sh
npx tsx scripts/check-quiz-deployment-compatibility.ts --sql
# Run the printed SELECT through the intended target's authorized read-only
# channel, then save only its inspection object to a private metadata file.
npx tsx scripts/check-quiz-deployment-compatibility.ts /path/to/inspection.json
```

Do this **before** applying the pending Matching migration or changing the API,
worker or client alias. The existing target must reject this checkpoint.
A MATCH is only a conservative database preflight; it does not waive saved
data/client/owner acceptance or authorize publication. Even installing this
checkpoint's RPC bodies would still block its inventoried legacy saved behavior.

Concrete next release sequence, gated by missing lineage:

1. Obtain the actual deployed API/worker/client source refs and deployment/build
   IDs, HTTPS API target, and current supported-client inventory. Historical
   Vercel deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` / `79e54dd` is not
   evidence of today's release; the health source only reports product `2.0.0`.
2. Port the convergence-only repair onto that lineage, retaining its saved
   Matching/scoring and canonical-source behavior; or prepare a reviewed
   version boundary with dual readers before any new-format writer. Exercise
   old/new quizzes, drafts, completed attempts, assisted policy, encoded/explicit
   submissions, stored percentages, supported clients and owner denial in a
   disposable/staging target. Never rewrite existing saved data to fit this tree.
3. Prepare only any necessary new forward migration/versioned RPC, with exact
   expected preflight, API/worker SHAs, compatible client builds and rollback
   artifacts. The unreviewed local Matching replacement must not be replayed on
   this production lineage. Preserve existing checkpoints and accepted questions.
4. Correct the Responses credential binding through cloud secret configuration.
   Establish authenticated owner/test-denial sessions and allowed target access.
   Repeat one bounded fresh real-source attempt from the remaining daily ledger;
   collect actual job/Workflow/deployment IDs, safe diagnostics and persisted
   Quiz/attempt/result/history evidence. No scope approval renewal is needed.
5. After compatible staging proof, prepare the concrete production release and
   honor explicit applicable deployment authorization. Otherwise request only
   the required deployment/build action after it is reviewable. No deployment
   approval is requested while the required lineage and compatible repair are
   unavailable. Release reads before writes, then canary the owned source;
   monitor sanitized generation failures, attempt/scoring consistency and
   owner denial; rollback code/aliases to recorded compatible artifacts without
   reversing applied forward migrations or deleting saved quizzes/attempts.

Physical Android build handoff: candidate product tree is `f0e40f2` plus the
final acceptance/diagnostic commit, existing `apps/mobile/eas.json` **preview**
profile (internal APK), Expo 2.0.0, package `com.galaxymaxp.stayfocusedv2`.
The profile points at the historical Vercel alias and is **not release eligible**
until steps 1–4 identify a compatible API. With the reviewed source/target and
authenticated EAS capability, use its supported pinned CLI to run
`eas build --platform android --profile preview --non-interactive` from
`apps/mobile`. Record exact Git SHA, CLI/profile, EAS build ID, APK SHA-256,
package/version/build number and API/worker deployments. No native APK/build ID
is available from this run; the Expo Android bundle is not an APK.

On an actual connected/unlocked authenticated device:

1. Record model/Android version and `adb devices -l`; verify the candidate APK
   and install with `adb install -r <verified-apk>` without clearing saved data.
2. Confirm authentication and existing saved quizzes/attempts/history survive.
3. Select the approved owned instructional source and submit exactly one fresh
   five-question mixed job within the remaining allowance. Record accepted job
   ID, build/deployments, complete 5/5 outcome and exact source provenance.
4. Verify the persisted Quiz appears in Library, opens, and reopens without
   regeneration. Inspect permitted public payloads for absence of keys,
   explanations/evidence and verifier reasoning before intentional finalization.
5. Answer/check every question through the target app, including readable
   Matching interactions where the approved generated set contains them.
   Observe restored drafts and the existing completion guard; do not add
   incomplete-completion/Finish Anyway behavior.
6. Calculate expected score using the Quiz's established format/version and
   source-supported key; compare app result and authoritative persisted score.
7. Verify persisted result/history and reopen after app relaunch, preserving
   Quiz/attempt identity and score. Record actual evidence with no private
   source, tokens, answer keys or raw provider errors in public artifacts.
8. Verify a distinct authenticated owner receives safe denial for Quiz,
   attempt, draft/finalize, result and history access; preserve pre-existing data
   and clean up only explicitly disposable acceptance data.

These steps instantiate mandatory row 9, not new product scope. A browser or
emulator run, when available, must be recorded separately and cannot close the
physical row. No physical app/session or historical realme device is assumed.

Smallest blockers: valid Responses credential binding; actual deployed
producer/API/client source and release identities for a compatible repair;
usable/allowed API target plus authenticated two-owner test access; and
authenticated APK build capability plus a controllable physical Android device.
Source recovery and the finite daily generation allowance are now satisfied.
