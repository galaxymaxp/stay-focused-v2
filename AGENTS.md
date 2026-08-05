# Cross-Agent Operating Policy

## Source of truth

Use context in this order:

1. Git and repository implementation
2. `docs/current-state.md`
3. `docs/roadmap.md`
4. `docs/ai/current_sprint.md`
5. Relevant ADR
6. Phase reports and `docs/ai/handoff.md` as historical evidence only

## Required invariants

- Keep TypeScript strict. Do not introduce silent `any` or weaken validation.
- Mobile sends a Supabase bearer JWT; protected APIs verify it server-side.
  Service-role credentials remain server-only.
- Preserve RLS, owner isolation, explicit grants, and safe not-found denial.
- Migrations are forward-only. Never edit an old migration that may be applied.
- Never expose secrets, credentials, private Storage paths, raw provider
  errors, or private academic content unnecessarily.
- Canvas collection code must complete pagination, respect provider limits and
  `Retry-After`, and never infer deletion from partial or failed evidence.
- Reviewer output must remain faithful to the exact accepted source. Do not add
  unsupported enrichment or leak provenance labels into reviewer text.
- OCR must account for every expected page, preserve explicit blank pages, and
  fail safely on missing, duplicate, invalid, or out-of-range page evidence.
  Durable PDFs allow 100 total pages but only 40 OCR-required pages;
  synchronous and Canvas PDFs remain capped at 40 total pages.
- Durable work becomes background-safe only after HTTP 202 acceptance. Keep
  creation idempotent, persist results before success, reconcile from server
  state, and publish no result for cancelled jobs.

## Git rules

- Inspect the dirty tree before editing and never overwrite unrelated work.
- Do not force-push or push `main` automatically.
- Keep commits intentionally scoped and exclude local credentials, generated
  artifacts, private fixtures, and validation outputs.
- Do not rewrite remote history or modify applied migrations.

## Verification

Run checks proportional to changed paths. Completion claims must name the exact
suite/result and whether it was FRESH, CACHED, NOT RUN, BLOCKED, or NOT
APPLICABLE. Record flakes and failed first attempts instead of hiding them.

## Documentation

After a completed phase or slice, reconcile `docs/current-state.md`,
`docs/roadmap.md`, and `docs/ai/current_sprint.md`. Do not use the historical
handoff log as current state.
