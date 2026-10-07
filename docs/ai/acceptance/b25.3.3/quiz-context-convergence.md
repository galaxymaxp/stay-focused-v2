# B25.3.3 source-context and generation convergence

Date: 2026-10-08, Asia/Manila. Branch: main. Starting HEAD: 93a8eb833086d7a13f3fce773453c7cbb27a80e8 (Autopilot installation). Explicit owner approval selects this finite scope; Finish Anyway and B26 are excluded.

## Acceptance contract

The active scope, prerequisites, task ordering and complete mandatory matrix are recorded at the top of [current sprint](../../current_sprint.md). **PARTIAL / BLOCKED at mandatory real-source production and physical acceptance.** The local implementation is verified and committed in `f336d26`; this does not complete B25.3.3 or authorize B26. Scope approval is settled.

## Baseline

- FRESH `npm run test -w @stay-focused/api -- src/lib/quiz`: 205 passed / 3 opt-in skipped (7 files passed, 1 skipped).
- Live checkout is main at 93a8eb8, 54 ahead / 0 behind locally recorded origin/main (no fetch/fresh-remote claim); existing owner Git identity retained.
- 16 modified tracked files and 111 untracked leaf files were backed up and SHA-256 inventoried outside the repository. Only the three current planning docs overlap; selective staging preserves their original 25-line additions.

## Pre-edit findings

- Source assembly groups blocks by heading/slide, then `splitQuizRegion` splits exact text at sentences/newlines and copies every parent source reference to every fragment. Consequently a short fragment retains coarse owners while losing defining/context relationships.
- The current planner samples nonempty units before checking full-set blueprint/concept/difficulty feasibility. Easy eligibility is mostly a length check; alternate support is selected as the first unused compatible region.
- Failure intent keys include a concept hash, so switching support can make the same failed semantic pattern appear new. Existing finding codes survive but do not themselves exclude equivalent intents across supports.
- v4 convergence state already persists accepted questions, allocation, call counters and blueprint history atomically. These invariants must survive the repair.
- Nested diagnostic logging must be inspected and proven to serialize safe JSON rather than collapsed object fields.

## Implementation

- `sources.ts` records exact original block spans, identifiers and page/slide references. `support.ts` retains heading/concept context up to 2,400 characters, joins dependent conditions, contrasts, examples and consequences when splitting coarse regions, and clips evidence spans to the exact retained text. A quote cannot cross blocks or borrow another block's owner. Persisted question references contain only the cited owners, rather than every parent reference.
- Substantive support scoring uses assertions, relationships and explanatory detail rather than nonempty text alone. It is a conservative planning cue, not a semantic verdict. Independent skeptical verification remains mandatory for source sufficiency, academic value, every distractor and answer key. Short factual evidence can still support easy questions; a 53-character non-assertion cannot consume candidate pools.
- `makeQuizPlan` checks the entire requested allocation before authoring: distinct source concepts, compatible question types/blueprints and supported difficulty. It considers capable evidence beyond the initial coverage sample, ranks genuinely unused reserve concepts by evidence strength, and fails explicitly when mixed variation is unsupported. The existing 20-question limit receives at least four medium slots when needed to avoid over-80% easy allocation; five-question behavior remains bounded. A cold/restored infeasible plan is rejected before a provider call. The existing audited-difficulty reallocation and final distribution gate remain intact.
- Durable failure patterns are independent of replaceable concept hashes. Full reauthoring and alternate-support planning exclude previously failed intent templates; direct correction retains its intended repair behavior. Legacy v4 states infer missing pattern keys from stored intent keys without resetting counters. Accepted questions stay immutable. New plans retain full-set initial blueprints; no public DTO, checkpoint namespace or database schema changes.
- The actual job reporter serializes a whitelist of symbolic fields as nested JSON before console formatting. Pool blueprint/result fields remain inspectable; private source text, stems, answers, explanations and verifier reasoning are excluded.
- The invented lecture fixture reproduces short fragments and coarse source owners with definitions, conditions, contrasts and examples. Thirteen new context/planning/regression cases and one actual service-logger case exercise these repairs. Synthetic accepting providers prove contracts only; they are not evidence of academic quality or real-source convergence.

The pinned `gpt-5.4-2026-03-05` model, strict deterministic and independent semantic checks, exact count/no partial publication, two-candidate pools, four-author/four-verifier per-slot limits and existing provider transport retry policy are unchanged. Choice, Matching, RLS/owner-safe denial, learner key secrecy, all-question completion and authoritative scoring are retained. Finish Anyway was not implemented.

## Mandatory requirement audit

| Sprint row | Evidence / result |
| --- | --- |
| 1. Context and exact ownership | FRESH PASS locally: bounded complete lecture contexts, coarse splitting, precise block/page references, rejection of wrong-block and joined quotes; original source wording retained |
| 2. Strength and reserves | FRESH PASS locally: non-assertion excluded; stronger compatible distinct reserve selected over first weak support; accepted questions byte-identical |
| 3. Whole-set feasibility | FRESH PASS locally: all five concept/archetype/difficulty slots planned before authoring, capable evidence outside the initial sample used, unsupported/all-easy mixed plans rejected without calls, 20-question allocation regression |
| 4. Cross-support exclusions | FRESH PASS locally: failed patterns survive different concept hashes and legacy durable resume; genuinely new compatible templates remain eligible; budgets do not reset |
| 5. Structured diagnostics | FRESH PASS locally: nested JSON round-trips and actual `processQuizJob` logger invocation; private extra fields stripped; no `[Object]` collapse |
| 6. Invariants | FRESH PASS automated: retained choice/Matching, exact count, independently audited keys/options/pairs, immutability, durable resume/call bounds, database security/scoring and learner projection suites |
| 7. Local gates | FRESH PASS: results below; all task-owned changes committed, unrelated bytes preserved |
| 8. Fresh instructional real-source generation | BLOCKED / NOT RUN: no paid live/provider or authenticated production generation submitted; access/rollout/attempt-limit prerequisites remain unresolved |
| 9. Persisted production and physical success path | BLOCKED / NOT RUN: no attached device or established authenticated app session, and live database uses a different Matching contract; no new Quiz/job/attempt/result created |
| 10. Full closure | PARTIAL: scope and checkpoint reconciled, local repair committed; rows 8 and 9 prevent completion |

## Verification

Final API, focused Quiz and root gates cover the `f336d26` implementation bytes in the preserved main working tree, including existing unrelated modifications. Other package suites passed before the last API-only 20-slot allocation adjustment; their source did not change. No push or remote freshness claim.

| Command / suite | Result |
| --- | --- |
| `npm run test -w @stay-focused/api -- src/lib/quiz` | FRESH PASS: 219 passed / 3 opt-in skipped; 8 files passed / 1 skipped |
| `npm run test -w @stay-focused/api` | FRESH PASS: 996 passed / 4 opt-in skipped; 85 files passed / 1 skipped |
| `npm run test -w @stay-focused/api -- src/lib/quiz/context.test.ts` final audit | FRESH PASS: 13/13 after strengthening the cross-support test to require a nonempty new supported pool |
| `npm run test` other workspace results | FRESH PASS: mobile 499; Canvas 73; engine 606; OCR 27; shared 48; no failures |
| `npm run test:workflow -w @stay-focused/api` | FRESH PASS: 1 runtime test; existing dirty Workflow fixture preserved |
| `npm run provider:contract -w @stay-focused/api` | FRESH PASS: 18 passed / 0 failed; no paid request |
| `npm run typecheck -- --force` | FRESH PASS after build completed: 7/7 successful, zero cached; 13.973 seconds |
| `npm run lint -- --force` | FRESH PASS: 7/7 successful, zero cached; 29.529 seconds |
| `npm run build -- --force` | FRESH PASS: 7/7 successful, zero cached; 58.691 seconds; API includes 23 steps / 2 workflows; Expo Web/iOS/Android exports complete |
| API typecheck and lint after cleanup | FRESH PASS after restoring the build's incidental generated `next-env.d.ts` edit; final test assertion included |
| Whitespace and scoped staging | FRESH PASS: staged and unstaged diff checks; explicit task-owned paths only |
| Original dirty-file preservation | FRESH PASS: 127 original leaf files SHA-256 checked, subtracting only this task's inserted sections from the three shared planning docs |
| Live provider, authenticated production, physical Android | BLOCKED / NOT RUN; opt-in tests were not enabled; no historical output substituted |

Earlier full package run passed API 993 before the last three planning regression cases; final API is 996. Shared's count includes source and generated runner counterparts, as before. Existing local Matching database tests apply the pending migration to disposable Postgres and retain legacy choice behavior; this is not remote migration proof.

### Failures and repairs retained

- Initial focused implementation run: 8 failed / 128 passed. Assertion cues omitted valid generic verbs (`iterate`, `restore`, `name`), and adjacent independent `When` rules were incorrectly merged. Both were repaired. Historical coarse-plan tests were updated to expect early zero-call rejection, retaining the independent duplicate-evidence assertion. Two recall-only coverage fixtures now request easy explicitly; unsupported mixed insufficiency has separate tests. No semantic gate was weakened or meaningful test deleted.
- API typechecking first found an optional-state closure issue, then an incorrect test cast with private extra fields. Both were repaired under strict types; final forced typecheck passes.
- Actual logger regression first failed because it expected two candidates from the existing single-candidate contract mock. The test now checks that mock's actual nested payload; the separate serialization test covers two nested candidate results.
- The audit found the old three-medium cap would make a valid 20-slot mixed allocation infeasible. It now scales to the required minimum. The initial 20-question synthetic generation assertion correctly failed the existing duplicate-content gate because the numbered components repeated one understanding; that fixture is used only for allocation/boundary proof, without claiming distinct academic generation.
- A repeated root typecheck was incorrectly run concurrently with `next build`; the build removed/recreated `.next/types`, causing TS6053 missing-generated-file errors (5/7 tasks completed). No source/config workaround was added. Build completed successfully, then forced typecheck was rerun sequentially and passed 7/7. The earlier root gate set also passed 7/7 with zero cached tasks.
- Vercel `whoami` emitted an update-worker timeout/EPIPE but returned the existing authenticated owner and exit 0. No CLI upgrade/config change was made. Node's initial env-file load omitted the first BOM-prefixed key; read-only parsing stripped the BOM and verified presence without printing values.

## Fresh environment and rollout prerequisite evidence

- Root `.env.local` exists. Provider and Supabase server/public credential fields are nonempty; values were not printed. No application user-session credential was established from the available named variables. CLI authentication alone is not learner bearer authentication.
- FRESH `adb devices -l`: header only, no attached device. Historical realme RMX3151 availability/session cannot be assumed. Physical Library open, secrecy, answering/finalizing, expected/actual score, persistence and history reopen therefore remain unaccepted.
- The existing Vercel link names `stay-focused-v2-prototype`; no deployment or alias was changed or certified in this run.
- Read-only Supabase MCP migration inspection of the configured project succeeds. It includes migrations absent from this checkout (for example `20260928131513 matching_blocks` and `20261001015542 close_stranded_canvas_staging`), and does **not** list local `20261007155114_quiz_matching`.
- Read-only RPC inspection demonstrates a material contract difference: live `save_quiz_answer` / `complete_quiz_attempt` use `matchingPairs` and `selectedOptionIds`; they contain neither `correctPairs` nor `leftItems`. This checkout's Matching migration replaces those bodies for the `leftItems`/`rightItems`/`correctPairs` contract. Blindly applying it could invalidate existing live Matching data/behavior. The rollout prerequisite is **not satisfied**. Compare the target's live schema/data contract and deployment lineage, then prepare a compatible forward rollout before any production write. This is environment compatibility work, not a renewed B25.3.3 scope decision.
- All remote operations in this run were metadata/function-definition SELECTs. No private lecture, user row, key, answer, credential or raw provider error was fetched or logged. No migration, deployment, production write, paid provider call, Quiz submission or physical action occurred.

## Checkpoint / next eligible work

Local implementation commit: `f336d26`. Approved-scope commit: `b8967f3`. The separate acceptance checkpoint also strengthens the existing exclusion assertion without changing implementation. It records this genuine stop; neither local PASS nor this checkpoint closes B25.3.3.

Resume at mandatory rows 8/9: establish a connected/unlocked authenticated target app/device and a verified compatible production target; review the live Matching contract before applying any forward migration or deploying this older checkout. Establish this run's bounded paid generation allowance before calls; do not reset historical limits. After prerequisites are satisfied, use a fresh owned instructional source and exactly the approved attempts, retain only safe symbolic diagnostics/timings, verify five-question persistence and the complete physical Quiz/Library/secrecy/score/result/history/reopen/owner-denial flow. Repair demonstrated failures within B25.3.3 and re-audit every row. Finish Anyway and other recommendations remain outside scope.

The interface still reports the existing installation Goal as `blocked` and exposes no resume operation. No new Goal was created and no completion was claimed. Use this activation command when the external prerequisites are ready:

```text
/goal Complete only the owner-approved B25.3.3 generation-convergence scope recorded in docs/ai/current_sprint.md, following AUTOPILOT.md and AGENTS.md. Implement its documented repairs, obtain every mandatory acceptance proof, reconcile records, and commit scoped changes. Preserve existing contracts and unrelated work. Exclude Finish Anyway, B26, and other recommendations. Stop only at fully verified completion or a precisely documented genuine blocker or budget limit.
```
