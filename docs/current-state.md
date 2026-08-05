# Current State

Last refreshed: 2026-08-06, Asia/Manila.

## Repository

- Authoritative branch: `codex/hosted-processing-prototype`.
- Reconciled implementation checkpoint: `1848805` (durable documents, EAS
  Android configuration, and deterministic mobile retention tests).
- The authoritative remote is the same feature branch after the reconciliation
  commit is pushed. `main` is not the handoff branch.
- Intentionally uncommitted local tooling noise is limited to generated
  Next/Expo declarations, Expo's generated mobile `.gitignore`, and local VS
  Code color settings. None is required by a clean clone.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 and Phase 7 have not started.

## Recovery and active implementation

- Product Recovery R1-R5 is complete. R6 is partial: automated checks pass,
  while Dynamic Type, VoiceOver, interruption, navigation/reconciliation, and
  save-flow behavior still require physical iPhone observation.
- Durable document jobs now accept at most 100 total PDF pages and at most 40
  pages that require OCR. Native-text and confirmed blank pages do not consume
  the OCR allowance; synchronous and Canvas extraction remain capped at 40
  total pages.
- API and mobile errors are sanitized, native text is inspected before OCR,
  OCR fan-out remains bounded, and Vercel Workflow owns accepted processing.
- The EAS preview APK was built and installed on a physical Android device.
  Android authentication and hosted API connectivity passed. The specific
  durable 41-100-page native-text and >40-OCR-required-page matrix remains.

## Deterministic test baseline

- Mobile: 200/200; API: 548/548; OCR: 27/27; Canvas: 72/72; shared: 6/6.
- Reviewer engine: 290/290 deterministic evaluations.
- Root typecheck, lint, and build pass. Turbo reused six of seven typecheck and
  lint tasks and six of seven build tasks; affected mobile tasks were fresh.
- Direct API and mobile typecheck/lint/build checks also pass fresh; mobile lint
  retains four existing import-order warnings and no errors.
- Workflow runtime: 1/1 passed on isolated rerun. The first run exposed a
  known 1 ms Workflow test-runtime replay-timestamp flake and is not hidden.

## Migration status

- The feature branch contains 41 ordered, uniquely prefixed migrations.
- Local HEAD has all 41, including the four newest Canvas migrations.
  `origin/codex/hosted-processing-prototype` also has all 41. `origin/main` has
  only the first 23 and is 18 migrations behind the feature branch.
- Linked Supabase has equivalent history through all 41 schema changes.
  Workflow versions align exactly. The four newest Canvas changes were applied
  remotely under generated versions `20260728022127`, `20260728024021`,
  `20260728131529`, and `20260728133821`, not the four committed filenames.
- Do not push migrations, repair history, or edit applied migration files until
  that four-version alias is deliberately reconciled with user approval.

## Known blockers and immediate task

- Physical-device acceptance debt remains for Product R6 and the durable
  long-document Android matrix. APK installation, authentication, and hosted
  API connectivity are no longer blockers.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.
- Immediate task: run and record the durable-document Android acceptance matrix
  with the installed preview build without beginning Phase 6.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.
