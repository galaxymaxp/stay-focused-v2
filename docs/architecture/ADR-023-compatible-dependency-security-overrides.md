# ADR-023: Compatible dependency security overrides

Status: accepted for local dependency scope (2026-10-13, H2b).

H2 initially stopped on the separate offline-quiz work's mobile failures. O2c
completed that work. H2b verified the committed HEAD dependency baseline in an
isolated checkout (928/928 mobile tests), then ran every required gate with the
Workflow group: forced typecheck/lint 7/7 each (0 cached, four existing warnings),
shared 133/133, API 1,655 passed / 3 skipped, mobile 928/928, API build 35/35 pages
with 16 steps / 1 workflow, Android export and whitespace check all FRESH PASS.
No application code, tests, environment files or deployment behavior is changed.

## Decision

Upgrade Workflow and its test integration together within major 4. The newest
registry-confirmed Workflow core 4.x is `@workflow/core@4.8.13`, which still pins
`devalue@5.9.2` and `nanoid@5.1.6`. Those pins remain within the vulnerable ranges
reported by the fresh H2 production audit. Updating the parent therefore cannot
remove these findings.

Use a root override scoped to `@workflow/core@4.8.13`, replacing only its
`devalue` dependency with `5.9.4` and its `nanoid` dependency with `5.1.16`.
Both replacements stay within the dependency's existing major; devalue is a
patch upgrade and nanoid a patch upgrade within 5.1. No global leaf override or
React/React DOM pin change is introduced. Registry version inventories confirm
these releases, and neither falls in the baseline advisory ranges.

Keep `@vercel/functions@3.7.6` under that same core selector, within the parent's
`^3.4.3` range. This retains the previously installed Functions version rather
than indirectly adding OIDC major 4 through Functions 3.9.11. Under the exact
`@workflow/nest@4.0.29` selector, keep its `@nestjs/common` and `@nestjs/core`
peers at the previously installed `11.1.28`, allowed by that adapter's peer
ranges. Otherwise npm selects Nest 12 and its new file-type major. H2 does not
use these unrelated major upgrades as an implicit part of a Workflow minor.

The root also declares the same Workflow 4.x version as a development dependency
so npm resolves the overridden runtime through a direct root edge and shares it
with the API workspace. Initial npm 10.9.2 workspace installs retained invalid
old Workflow versions; npm 11.13.0 resolved them but ignored the overrides across
the workspace link. The root edge makes all scoped overrides effective, confirmed
by `npm ls`. This works around the documented
[npm workspace override boundary defect](https://github.com/npm/cli/issues/9659).
The earlier root development Next dependency similarly keeps the root Next ESLint
parser able to resolve the same patched Next version as the API workspace.

The exact parent-version selectors prevent silently applying this decision to
future Workflow releases. Existing source serialization, generation, ownership,
cancellation, idempotency, and persistence contracts must remain unchanged.
Validate the existing tests unchanged, forced typecheck/lint, API production
build and Android export before considering this slice complete. No deployment,
provider call, remote SQL or migration application belongs to H2.

## Removal

Remove the devalue/nanoid overrides when a compatible Workflow 4.x parent directly
selects their patched versions. Remove the Functions/Nest compatibility pins only
after the parent resolves the retained majors naturally or a separate reviewed
upgrade establishes compatibility for the newer majors. Remove the root Workflow
development edge once the declared npm version reliably applies root overrides
through workspace links without it. Confirm with `npm ls`, a fresh
`npm audit --omit=dev --json`, and the same local gates. If a future parent no
longer matches the selector, review its pins before deleting this ADR's override
entries; do not widen the selector automatically.
