@AGENTS.md

# Claude Code workflow

## Start every task from repository truth

1. Run `git status --short --branch` and inspect the existing diff before
   editing. Preserve pre-existing local/generated changes.
2. Read `docs/current-state.md`, then `docs/roadmap.md`, then
   `docs/ai/current_sprint.md`. Do not treat `docs/ai/handoff.md`, phase reports,
   auto-memory, or chat summaries as current state.
3. Confirm the checked-out branch matches the authoritative branch named in
   `docs/current-state.md`. If it does not, stop and ask; do not switch, merge,
   rebase, or cherry-pick on your own.
4. Read only the ADRs, package manifests, nearby tests, and implementation files
   relevant to the requested slice. Do not preload the entire documentation
   tree.

The canonical state files are intentionally not imported into this file. They
must be read fresh because they change as acceptance work closes.

## Work in bounded slices

- Restate the requested outcome and explicit non-goals before making a broad or
  cross-workspace change.
- Prefer the smallest coherent implementation and extend the closest existing
  test. Do not begin Phase 6 unless the user explicitly starts it and the
  canonical planning files are reconciled.
- Use installed Supabase or Vercel tooling only when the task requires remote
  evidence. Treat remote writes, deployments, EAS builds, migration commands,
  commits, and pushes as explicit user-authorized actions.
- Use subagents only for independent, read-only exploration or review when that
  will materially reduce main-context load. Keep edits and integration in the
  main session, and do not use subagents for small tasks.
- Never read local secret files or the historical academic live-output
  artifacts. Examples and fictional fixtures are safe; real credentials and
  private academic content are not.

## Verify proportionally

Start with affected workspaces, then widen only when the change crosses package
boundaries or is release-sized:

- API: `npm run test --workspace @stay-focused/api`; add
  `npm run test:workflow --workspace @stay-focused/api` for Workflow behavior.
- Mobile: `npm run test --workspace @stay-focused/mobile`.
- OCR, Canvas, or shared contracts: run the matching workspace test.
- Reviewer engine: `npm run test --workspace @stay-focused/engine`.
- Type/lint/build: run the affected workspace commands first; use root
  `npm run typecheck`, `npm run lint`, and `npm run build` for cross-workspace or
  closeout verification.
- Always run `git diff --check` before declaring a code or documentation slice
  complete.

Do not run credentialed smoke tests, live validation, provider calls, device
builds, deployments, or database mutation merely because a similarly named
local test exists.

## Commit authorship

The repository owner is the sole author of every commit in this repository.

- Never add a `Co-Authored-By` trailer for Claude, Claude Code, Anthropic, or
  any other agent, model, or tool.
- Never set yourself as commit author or committer, and never amend authorship
  metadata.
- A commit message contains only the scoped subject and, when useful, a body
  describing the change. No attribution trailers, no generated-with footers.

If a commit cannot be created without agent attribution, do not create it;
report the blocker to the user.

An explicit commit or push request in the current user task authorizes that
action within its stated scope. Never infer authorization for commits, pushes,
force-pushes, history rewrites, or pushes to main.

## Hand off cleanly

- Reinspect `git status` and the final diff. Keep generated declarations, local
  editor settings, credentials, private fixtures, and validation output out of
  the intended patch.
- Reconcile the canonical state hierarchy only when verified product or
  acceptance state changed; routine implementation notes do not belong there.
- Report changed files, behavior, remaining debt, and exact verification using
  the required `FRESH`, `CACHED`, `NOT RUN`, `BLOCKED`, or `NOT APPLICABLE`
  labels. Never hide a failed first attempt or a flake.
