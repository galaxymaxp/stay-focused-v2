# Current Sprint

Last refreshed: 2026-08-06, Asia/Manila.

## Current objective

Complete Android acceptance for durable long-document processing using an EAS
preview APK and the hosted V2 API.

## Why it matters

The implementation is deterministic and preserved, but a handoff must not
confuse local coverage with installed-device acceptance. This closes the active
durable-document/APK slice without starting Phase 6.

## Current branch

`codex/hosted-processing-prototype`

## Baseline commit

`1848805` — durable-document implementation, Android preview configuration,
and deterministic mobile retention-test repair are committed.

## Scope

- Preserve the verified EAS `preview` APK build/install evidence; Android
  authentication and hosted API connectivity already pass.
- Accept a native-text PDF between 41 and 100 pages without OCR provider use.
- Confirm a PDF with more than 40 OCR-required pages fails safely before OCR.
- Confirm accepted work reconciles after switch-away, network interruption, and
  app restart, and that result/save behavior remains owner-scoped.
- Record safe evidence without source bodies, credentials, or private files.

## Explicit non-goals

- Phase 6 or Phase 7 implementation.
- Raising the 100-total-page or 40-OCR-page limits.
- Automatic/scheduled Canvas synchronization, native background upload, or
  push-notification redesign.
- Dependency upgrades or migration-history repair.

## Required verification

- `npm run test --workspace @stay-focused/mobile`
- `npm run test --workspace @stay-focused/api`
- `npm run test:workflow --workspace @stay-focused/api`
- `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check`
- Preserve the EAS build, APK installation, Android authentication, and hosted
  connectivity evidence; record each remaining physical acceptance item as
  PASS, FAIL, NOT RUN, or BLOCKED.

## Known blockers

- The physical Android device must be available again for the remaining matrix;
  a currently active ADB session is not assumed.
- Four linked Canvas migrations use remote-generated version aliases; do not
  mutate migration history as part of this sprint.
- Product Recovery R6 physical iPhone checks remain separate acceptance debt.

## Completion criteria

The existing preview build/install evidence remains preserved, the
durable-document matrix is recorded truthfully, deterministic checks remain
green, no private source content is committed, and canonical documentation is
reconciled.

## Next action after completion

Complete the deferred Product Recovery R6 physical iPhone accessibility,
interruption, navigation/reconciliation, and Study Library save checks.
