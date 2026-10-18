# WG3b website Generate home

**Status: PASS for unattended STEP 0-7, tests, required gates, docs and local
commits.** WG3 is done via WG3b; rollout and real-account checks remain owner
steps. Implementation commit: **0eb0aaa**.

Finite unattended scope: WG3b STEP 0-7, local tests/gates, docs and local commits
on `overnight/2026-10-15_feedback`, baseline `4bd0d91` (required `9dae76f`
ancestor). WG3 stopped docs-only at `1e53edd`; no previous implementation to
repeat. Website only; no mobile changes, remote calls or environment-file edits.
The referenced overnight roadmap is absent, as recorded by WG1; the complete
WG3b prompt supplies the finite scope. Owner-approved unrelated untracked paths
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are preserved.

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Current, own material, collapsed Not synced, collapsed Past; search retains own card | GenerateScreen | Render regression and browser order/search | FRESH PASS |
| Accessible corner ellipsis; desktop hover/focus and narrow/touch visibility | CourseOptions/CSS | Render regression and intercepted browser keyboard/geometry | FRESH PASS |
| Existing Canvas labelled menu and move action retained | Canvas/CourseOptions | Render tests and browser payload/action clipping | FRESH PASS |
| Secondary Sync and at most one primary | GenerateScreen | Browser class assertions | FRESH PASS |
| One sync line, active work over failure over freshness | Generate selector and State opt-out | Pure state matrix and rendered stale-failure regression plus browser | FRESH PASS |
| Standard padding on every Try again action without handler changes | Nine action sites and retry-button CSS | Source audit and browser computed style on actual recovery action | FRESH PASS |
| Strict types, lint, web regressions, API build, clean diff | Workspace gates | Fresh serial required commands | FRESH PASS |

Development checks: focused Generate/course-options/reviewer-state suite first
attempt **32 passed, 2 failed** (three files): the new test counted an unrelated
Notice as another sync status, and serialized React element children with
circular ownership. Assertions now target the sync line and inspect string
children. Corrected run **FRESH PASS 34/34, 3/3 files**. No production defect
was masked by those test changes; no nondeterministic flake observed.

Padding cause: the desktop density rule in `globals.css` overrides base button
padding `12px 16px` with `0 14px`; Smart Selection additionally used the compact
`link-button` rule (`2px 4px`, no minimum height). All nine Try again action
sites now use a shared `retry-button` class restoring `12px 16px`, minimum 48px.
Existing secondary/primary tone, handlers and busy guards are preserved.

No ADR: the selector is local to Generate and the existing State status default
is preserved; no new cross-application architecture or dependency.

## Verification

Tested WG3b implementation `0eb0aaa` on baseline `4bd0d91`, with no code
changes after the final fresh gate sequence began. Implementation commit and
closure commit are recorded in the handoff and `tmp/overnight/WG3b.status`.
React review checked hook cleanup, strict prop types, menu focus/dismissal,
unchanged callers and default State status behavior.

| Exact command or flow | Evidence | Result |
| --- | --- | --- |
| `npm run typecheck -- --force` | `.local/wg3/gate-typecheck-resumed.log` | FRESH PASS, 8/8 tasks, 0 cached |
| `npm run lint -- --force` | `.local/wg3/gate-lint-resumed.log` | FRESH PASS, 8/8 tasks, 0 cached; 6 existing warnings (web 1, mobile 5), 0 errors |
| `npm test --workspace @stay-focused/web` | `.local/wg3/gate-web-tests-resumed.log` | FRESH PASS, 265/265 tests, 42/42 files; includes Generate, generate-reviewer-state and generation recovery |
| `npm run build --workspace @stay-focused/api` | `.local/wg3/gate-api-build-resumed.log` | FRESH PASS, 1/1 build, 35/35 static pages |
| `git diff --check` and `git diff --cached --check` | Local Git inspection | FRESH PASS, implementation and documentation closure |
| `node apps/web/scripts/wg3-layout-check.mjs` | `.local/wg3-browser-attempt3.log`, `.local/wg3/report.json`, `.local/wg3/*.png` | FRESH PASS, 35/35 page/viewport checks |
| `node --check apps/web/scripts/wg3-layout-check.mjs` and `node --check apps/web/scripts/wg1-layout-check.mjs` | Local syntax checks | FRESH PASS, 2/2 |
| Mobile/Android build and tests | Mobile implementation unchanged | NOT APPLICABLE for this website-only scope |
| API tests, live provider/workflow probes | API implementation unchanged | NOT RUN / NOT APPLICABLE to requested suites |

The browser run used fictional intercepted data at 1440/1024/768/390 px plus
1440 px touch: 275 intercepted API requests, five checked move PATCH requests,
zero unexpected requests and zero runtime errors. It checks default collapse,
order, retained own material under search, no visible Course options label,
secondary Sync, primary count, exactly one sync line, syncing over stale
failure, freshness, actual retry padding/recovery, keyboard opening/arrows/Tab,
Escape/focus return, outside dismissal, hover/focus/touch visibility, corner
geometry, no text overlap or horizontal page scroll and Canvas compatibility.
Screenshots were inspected at desktop and phone widths. Popovers are separate
painted layers; corner geometry still independently rejects title/chevron or
button intersections. API/auth requests fail closed; no real service was called.

Failed first attempts are retained, without claiming them as passes:

- Focused tests: **32 passed / 2 failed**, corrected to **34/34** as above.
- Browser attempt 1: **0 completed / 1 failed**, overlap checker counted text
  behind the opaque popover as a collision; fixed layer accounting. Attempt 2:
  **2 completed**, then timeout because copied fixtures reused one accepted
  sync-job ID; fixed fictional job identities. Attempt 3: **35/35**.
- Forced typecheck: **5/8 tasks successful**, zero cached; TS2739 on one new
  fictional course fixture missing `termName` and `lastSuccessfulSyncAt`.
  Added explicit null fields, preserving strict types; final run **8/8**.
- Full web tests: **264 passed / 1 failed**, 41/42 files passed; recovery
  assertion compared `className` to exactly `primary`. It now checks the CSS
  token so added padding classes preserve the exactly-one-primary guarantee;
  final run **265/265**. No nondeterministic flake observed.

An interruption occurred before gate completion or WG3b commits. Resume read
the prompt, progress, Git log/status/diff, source and planning files, preserved
the completed browser evidence, and ran the final required gate chain serially.
No committed work was repeated. The existing Vite config-loader warning is
non-failing. Local validation artifacts and unrelated paths remain unstaged.
The API build regenerated `apps/api/next-env.d.ts`; its build-only change was
inspected and restored to the pre-build contents before the implementation
commit. No generated artifacts, private fixtures, tmp or unrelated paths were
included. No root/Android build was required by the website-only WG3b gates.

## Owner steps remaining

Rollout and Device checks are skipped entirely (NOT RUN). Owner deploys the
reviewed website through RB6/fullsend from main, then checks Generate in the
real browser at desktop and phone widths. Production revision, database rows,
Scheduler state and real-account browser/device behaviour are **UNVERIFIED
(owner to confirm)**. No remote service call, deployment, remote SQL/migration,
Scheduler operation, email, environment-file edit or push is authorized here.
Vercel CLI is not installed; strongly recommend `npm i -g vercel` for the later
owner-controlled environment, deployment and log workflow. Not run here.
