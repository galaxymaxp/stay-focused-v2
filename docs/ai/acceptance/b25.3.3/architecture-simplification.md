# B25.3.3 architecture simplification checkpoint

Date: 2026-09-15. Status: **PARTIAL — AI-first architecture requires further validation.**

This is an implemented standalone spike, not a completed production migration.
The required live-material gate is blocked by an automatic approval rejection.
Production generation remains on B25.3.2. B25 is PARTIAL; B26 may not begin.

## Starting state and isolation

- Repository: `C:/Projects/stay-focused-v2`, branch `main`, HEAD `d00a543`.
- Recorded remote comparison: 51 ahead / 0 behind; no push.
- Existing dirty mobile persistence/auth tests, Workflow tests, root package
  script and planning documents plus untracked design/acceptance/Supabase work
  were inspected and left untouched.
- `git fsck --full`: exit 0; dangling blobs only, no corruption reported.
- Independent clone: `b25-3-3-work`, branch `b25-3-3-ai-first`. Dependency
  junctions reuse installed packages. This is not a linked Git worktree.
- Existing production implementation: `79e54dd`; deployment
  `dpl_peVBgRctKVmGTfkNfQqTev74QCda`, freshly inspected READY. Canonical alias
  `https://stay-focused-v2-prototype.vercel.app`; fresh health
  `{"status":"ok","version":"2.0.0"}`. No deployment was made.

## Architecture audit

The [pre-edit inventory](architecture-inventory.md) records actual paths and
KEEP / SIMPLIFY / REMOVE / ADAPT decisions before implementation.

## Implemented standalone flow

Ordered extracted blocks -> coherent context -> existing GenerationProvider ->
trusted purpose-specific instructions + Structured Outputs -> objective contract
validation -> optional one complete-output repair -> existing product DTO.

- Context preserves text, order, IDs, headings and page/slide metadata. It uses
  a conservative UTF-8-byte token bound, complete source when within budget,
  and coarse AI condensation when several source groups are required. No local
  educational ranking, affordance inference or question-slot evidence selection.
- Reviewer lets AI organize source material and adapts its sections to existing
  `ReviewerOutput`/`sourceCore`. Existing extraction and normalization remain.
- Quiz requests the entire set with count, mix and difficulty. Contract checks
  cover fields, exact count, option IDs/counts, valid answer keys, known source
  IDs and normalized exact duplicate prompts/options. Keys remain in the private
  stored object; existing `learnerQuestion` produces the public projection.
- Activity lets AI interpret requirements and return the draft structure. It
  adapts sections/slides and missing-information warnings to the existing DTO.
- OpenAI adapters now accept separate trusted instructions and explicit output
  token limits. Old callers retain their existing request behavior.
- The reader hides its independent-grounding badge for `ai-first-contract`
  metadata; contract validation does not establish semantic truth or coverage.

## Deliberately incomplete migration work

No production caller or durable workflow has been cut over. No legacy semantic
implementation or associated test has been deleted yet. The user's prescribed
order requires real-material validation before these steps. Remaining work:

1. Resolve private-source transfer approval, run all real-material generators,
   inspect quality and preserve aggregate comparison evidence.
2. Preserve headings/full source in production Quiz source assembly; migrate
   Reviewer synchronous/worker/durable paths, Quiz whole-set durable checkpoints,
   and Activity assembly/generation. Carry retry bounds across durable resumes.
3. Retire old semantic implementations and only their obsolete tests.
4. Run complete post-cutover regression/security checks, deploy the existing
   project, then perform the physical Android flows.

## Fresh deterministic checks

| Suite | Result | Count / scope |
|---|---|---|
| API full pre-cutover suite | PASS | 968 passed, 4 skipped |
| AI-first contracts, final focused suite | PASS | 26 passed; full API run above included the first 24 |
| Mobile full final suite | PASS | 450; clean HEAD had 449, one new badge-truthfulness test |
| Canvas | PASS | 73 |
| Engine | PASS | 606 legacy/extraction cases; no legacy retirement yet |
| OCR | PASS | 27 |
| Shared | PASS | 22 Vitest cases; reported historical 44 is not reproduced by this clean-HEAD runner |
| Workflow runtime | PASS | 1; unchanged production workflow |
| Provider contract | PASS | 19, including new instruction/output-limit contract |
| Root typecheck | PASS | 7/7, force, zero cached |
| Root lint | PASS with baseline warnings | 7/7, zero cached; four existing mobile import-order warnings |
| Root build | PASS with local dependency harness | 7/7, force, zero cached, 1m58s; Metro config restored |
| Diff hygiene | PASS at checkpoint | `git diff --check` |

No test was deleted. Mobile's difference from the user's 481-test baseline is
the unrelated dirty work deliberately excluded from this clean clone. The
historical baseline remains recorded without presenting it as a fresh result.

Initial failures are retained in local logs: missing API/mobile dependency links,
a table-driven test typing error (fixed), root `test` absent in clean HEAD (used
workspace scripts directly), and sandbox ancestor-directory restrictions in
ESLint/Workflow/build. Reviewed local execution resolved the filesystem issue.
Metro additionally needed the real dependency directory added to watchFolders
for validation; the harness restores tracked config byte-for-byte.

## Real-material and physical acceptance

See [real-material comparison](real-material-generation-comparison.md). No live
Reviewer/Quiz/Activity output was generated; no production Quiz, attempt, score,
result persistence or reopen was newly validated. `adb devices` saw the authorized
Android device, but no new generation was submitted or device acceptance claimed.

## Security/product invariants

Existing authentication, RLS, owner checks, answer secrecy, server scoring,
attempt/result persistence, durable jobs and secret handling remain unchanged.
New contract tests verify exact count, key validity, source references, public
projection and exact-set scoring. These tests do not certify a production
cutover that has not occurred. No schema migration, push or B26 work occurred.

## Approval blocker

Automatic approval review rejected use of the configured OCR provider on the
private B25 lecture, citing missing explicit payload/destination authorization.
An asynchronous question requests approval for Google Cloud Vision OCR and
OpenAI validation, or a narrower alternative. The answer is pending. The blocked
operation has not been bypassed.

## Files and continuation

Implementation commit: `20c7a4b` (`feat(ai): add gated AI-first generator spike`).
Production implementation files:

- `packages/engine/src/generation-context.ts`
- `packages/engine/src/ai-first-reviewer.ts`
- `packages/engine/src/provider.ts`
- `packages/engine/src/providers/openai-provider.ts`
- `packages/engine/src/types.ts`
- `packages/engine/src/index.ts`
- `apps/api/src/lib/quiz/ai-first.ts`
- `apps/api/src/lib/activity-maker/ai-first.ts`
- `apps/api/src/providers/openai-provider.ts`
- `apps/mobile/src/features/reviewer/reviewerReaderPresentation.ts`

Tests: `quiz/ai-first.test.ts`, provider contract, Reviewer presentation test.
Local source retrieval/spike/build helpers are retained under `.local/` in the
isolated clone and are not committed. All verification logs are sibling
`b25-3-3-*.log` files outside the repository. No private source/provider captures
are committed.

The original repository remains at `d00a543`, with the same dirty-path inventory.
Implementation/docs commits are retained only on the isolated branch; no merge,
cherry-pick, remote mutation or push was performed. Retain this checkout to resume
after approval; no Git worktree cleanup applies. Final `fsck` reports only
unreachable/dangling history objects inherited in the local clone, not corruption.
