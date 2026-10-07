# Stay Focused V2 Autopilot

## Purpose and activation

Progress the owner-approved roadmap without requiring a new prompt after each task. Inspect the live repository, select eligible work, implement it, verify it, record the result, commit scoped changes, and continue within a finite approved scope.

This file is an operating guide. Automatic continuation requires an active Codex Goal in a build that supports Goals. Merely installing this file does not activate a Goal, schedule runs, or connect ChatGPT Project conversations.

Follow current owner instructions and applicable root and nested `AGENTS.md` files. This guide does not expand tool permissions or override repository policy. Use existing stack, architecture, design references, and verification commands; do not restore the original scaffold or old engine architecture from historical attachments.

## Establish the live baseline

At startup and after interruption or context recovery:

1. Confirm repository root, branch, HEAD, remotes, upstream, ahead/behind state, Git author, and dirty paths. Preserve unrelated work. Do not assume an old Windows path, branch name, test count, or deployment is current.
2. Read applicable `AGENTS.md`, this guide, current planning files, and relevant ADRs. Discover renamed equivalents before declaring a planning file missing. Do not reconstruct a missing roadmap from chat memory.
3. Reconcile requirements with implementation and evidence. The last inspected root policy used this context order; the live policy takes precedence if it differs:
   - Git and repository implementation
   - `docs/current-state.md`
   - `docs/roadmap.md`
   - `docs/ai/current_sprint.md`
   - Relevant ADRs
   - Phase reports and `docs/ai/handoff.md` as historical evidence only
4. Check availability of relevant credentials, providers, build tools, environments, and target devices without printing secret values. Missing access blocks only work requiring that access.

Implementation establishes what exists; it does not authorize changes to product direction. Record and resolve stale status text using stronger evidence. Request owner judgment only for a material requirements conflict that evidence cannot resolve.

## Freeze a finite scope

Select the explicitly approved active milestone or finite roadmap sequence from the live planning documents and current owner instructions. Record its identifier, included tasks, prerequisites, exit criteria, and exclusions in `docs/ai/current_sprint.md`, preserving its existing format and unrelated content.

If the active scope is unambiguous, begin immediately. If no active scope is named, use the next explicitly approved finite task sequence whose endpoint is clear. If the only remaining entries are speculative, deferred, or labelled Future, do not treat them as approved work. If a finite approved scope cannot be determined, record the available choices and request the missing scope decision.

Keep the selected endpoint stable. Do not enlarge it because implementation reveals additional possible features. Necessary repairs belong to the selected task; optional improvements go into the existing backlog. A newer owner instruction may deliberately change the scope.

## Select and execute work

1. Select the highest-priority unfinished task inside the frozen scope whose prerequisites are satisfied. Follow explicit roadmap dependencies and sequencing. Do not hard-code a B-number from previous conversations.
2. Define a small acceptance matrix before edits: requirement, owning layer, proof needed, and current result. Use the task's existing acceptance document where possible; otherwise follow the repository's report convention under `docs/ai/acceptance/`.
3. Inspect the affected implementation and package scripts. Implement the smallest complete change that satisfies the task, including necessary UI, API, data, and documentation changes.
4. Run relevant focused checks, required repository gates, and the end-to-end evidence required by the task. Follow current repository and skill workflows. Do not repeatedly run unrelated suites after sufficient checks pass.
5. Audit every acceptance row against actual evidence. A passing unit test does not establish production, real-source generation, persistence, or physical-device acceptance.
6. Repair failed checks before advancing. Investigate failures from the current run; distinguish pre-existing failures with evidence. Never weaken validation, delete meaningful tests, or hide failed first attempts to get a pass.
7. Update the planning files, write the acceptance result, inspect the diff, and commit only task-owned changes using the repository owner's existing Git identity. Never use broad staging that captures unrelated work.
8. Report the milestone result, re-read the live planning state, and select the next eligible task. Task completion is a checkpoint, not a request for another prompt.

Use one task at a time by default. Concurrent agents require explicit owner authorization or an applicable instruction that requests them. Do not allow multiple workers to race on shared planning files or the same implementation paths.

## Preserve product and data guarantees

Follow the live repository invariants. In particular:

- Keep strict TypeScript, server-verified Supabase bearer authentication, server-only privileged credentials, RLS, owner isolation, and safe denial behavior.
- Keep migrations forward-only. Do not edit applied migrations or infer permission to reset production data.
- Complete Canvas pagination, respect provider limits and `Retry-After`, and never infer deletion from partial or failed collection.
- Use course/source context first. Preserve the exact accepted source, terminology, definitions, and relationships. Unsupported enrichment must not enter source-grounded content; any allowed general-knowledge fallback must be clearly labelled.
- Verify OCR page accounting, ordered assembly, missing/duplicate-page rejection, and the live limits. Do not copy numeric limits from old reports over current code and policy.
- Preserve durable acceptance, idempotent submission, result persistence before success, server reconciliation after restart, and cancellation without published results.
- Generation evaluation uses fresh source and job evidence appropriate to the current task. Do not reuse old Reviewer, Quiz, or Activity outputs as proof, and do not default to course outlines or administrative materials as instructional acceptance sources.
- Do not print tokens, keys, credential values, private source content, or raw sensitive provider errors. Commit neither secrets nor private fixtures nor generated validation artifacts prohibited by repository policy.

## Repository verification commands

The live repository uses npm workspaces and Turborepo (ADR-001). For implementation work, inspect the affected package scripts and choose proportional checks. Existing commands include:

- Focused Quiz/API: `npm run test -w @stay-focused/api -- src/lib/quiz`.
- Focused QuizScreen: `npm run test -w @stay-focused/mobile -- src/features/redesign/quizLearning.test.ts`.
- Package suites: `npm run test -w @stay-focused/shared`, `npm run test -w @stay-focused/api`, `npm run test -w @stay-focused/mobile`; other affected packages use their existing workspace scripts.
- Package gates: `npm run typecheck -w <workspace>` and `npm run lint -w <workspace>` where defined.
- Workflow runtime / provider boundary, when affected: `npm run test:workflow -w @stay-focused/api` and `npm run provider:contract -w @stay-focused/api`.
- Required fresh repository gates: `npm run typecheck -- --force`, `npm run lint -- --force`, `npm run build -- --force`. Record actual task/cache results; do not infer freshness merely from the command.
- Diff hygiene: `git diff --check` and `git diff --cached --check`.

For documentation-only policy installation, validate the owned diff and referenced paths; implementation tests and builds are NOT APPLICABLE. Do not run live provider, production, or device flows as part of installation. Future tasks retain every acceptance gate required by their approved scope, including real-source or device proof where mandatory. Existing Expo Web is a fast surface under ADR-011, not a substitute for mandatory physical acceptance.

## Evidence and closure

Label each verification claim with its exact suite or flow, result, tested commit/build/environment, and one of `FRESH`, `CACHED`, `NOT RUN`, `BLOCKED`, or `NOT APPLICABLE`. Record applicable failures, skips, flakes, and limitations. Keep environment-file reports to names and presence only.

Use the repository's status vocabulary. Where no vocabulary exists, use PASS, PARTIAL, BLOCKED, or FAIL. PASS requires every mandatory acceptance row to pass. PARTIAL is never equivalent to complete. Explicit owner-approved closure with a platform limitation remains labelled as such.

After a task, reconcile `docs/current-state.md`, `docs/roadmap.md`, and `docs/ai/current_sprint.md` without rewriting historical records. Append a concise handoff entry only when that is the repository convention; handoff history does not become current state. Record durable checkpoint information in the existing sprint/acceptance files: scope, task, requirement results, implementation commit, evidence paths, unresolved debt, and next action. Do not require an additional duplicate state ledger.

An implementation commit may contain the report before its final commit ID is known. Include that ID in the post-commit status; do not amend repeatedly merely to embed a commit's own hash inside its contents.

## Blockers, permissions, and bounded retries

Continue authorized reversible implementation, checks, documentation, and scoped local commits without asking again. Existing explicit authorization for a particular deployment, migration, or build remains valid. This operating guide itself does not authorize production publication, destructive operations, spending without an established limit, sending messages, or changing account/security settings.

Respect `AGENTS.md`: do not automatically push main, force-push, rewrite remote history, overwrite unrelated changes, or clean unrelated dirty files. When approval is actually required, prepare the concrete reviewable result first, then identify the exact action and why authorization is missing.

Stop dependent work for missing credentials/device access, a required owner decision, unresolved authoritative conflict, a permission boundary, or no defensible repair path. Record a blocker precisely with evidence and the smallest input that unlocks it. Continue independent approved tasks only if the roadmap permits their order and they do not depend on the blocked requirement; never relabel the blocked task complete.

Do not repeat the same failed action without new evidence. After three repair attempts at the same persistent failure with no meaningful progress, checkpoint the investigation and stop that path. Respect system budgets and rate limits. Budget exhaustion means checkpoint and stop, not completion. Never bypass approval, authentication, provider limits, or budget controls.

## Milestone report and completion

At every safe task milestone, report:

```text
Task / verdict:
What changed:
Verification: exact results and evidence labels
Commit / branch / HEAD:
Repository state: owned and unrelated dirty paths; ahead/behind if available
Acceptance report:
Blockers / remaining debt:
Next eligible task:
Goal: continuing / blocked / budget-limited / complete
```

Complete the Goal only when every mandatory item in the frozen scope has the required evidence, planning files are reconciled, scoped changes are committed where allowed, and no mandatory acceptance remains partial or blocked. Stop at the approved endpoint; do not enter future roadmap groups automatically.

On resume, inspect the live checkout and recorded checkpoint, verify which actions already completed, and continue from the next unfinished requirement. Reconcile partial commits or documentation before creating duplicate jobs, commits, builds, or artifacts.
