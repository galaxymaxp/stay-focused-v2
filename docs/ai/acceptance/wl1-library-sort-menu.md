# WL1 website Library sort menu

Status: **PASS for the finite unattended code scope**. Implementation:
`ea9ffa9 feat(web): library sort menu button`. Documentation:
`docs: close WL1` (this closure commit; exact hash in `tmp/overnight/WL1.status`).

## Scope and baseline (2026-10-18)

Finite unattended scope: STEP 0-4, local tests/gates, documentation and local
commits only. Rollout and Device checks are owner steps. No remote calls,
deployments, database operations, Scheduler changes, emails, environment-file
edits or pushes are authorized. No later roadmap slice is included.

Branch: `overnight/2026-10-15_feedback`; baseline HEAD `341cf62`.
Local upstream comparison: 49 commits ahead of `github/main`; remote-ref
freshness is **UNVERIFIED (owner to confirm)**. Git identity matches the
requested author, `galaxymaxp <omgraythekid@gmail.com>`.

Baseline `git log --oneline -8`:

```text
341cf62 docs: close GN1 (GN1b)
29bbe1d feat(mobile): open generation progress after grace period
a387c59 feat(mobile): add cancellable grace navigation hook
8dffcd4 docs: record GN1 preflight stop
da57f05 docs: close OS1 (OS1b)
a8484f6 fix(web): subtle own-material source toggle
26a8e69 feat(mobile): monotone icon rows in other-source sheet
9613d00 docs: record OS1 preflight stop
```

`git status`: no tracked modifications; pre-existing untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/`. Preserve these paths. Never stage
`tmp/` or `.local/`.

## STEP 0 findings — PASS

- `apps/web/src/features/library.tsx` has the expected native select in
  `LibrarySortControl`, used by the grid with `LIBRARY_GRID_SORT_KEY` and by
  course views with their course key. Existing signatures and persistence stay.
- `apps/web/src/app-model/librarySortOptions.ts` has six options. They mirror,
  rather than import, the identical list in
  `apps/mobile/src/features/redesign/LibrarySortControl.tsx`. Grid excludes
  custom/course order; course views include both; Personal excludes course order.
- ReviewerHeader uses first-item focus, outside mousedown/touch dismissal,
  Escape/selection focus restoration, blur dismissal, ArrowDown opening, and
  wrapping ArrowUp/ArrowDown/Home/End navigation. Reuse locally and leave
  reviewer-header untouched; extracting a shared abstraction would widen scope.
  WL1 additionally restores trigger focus on outside dismissal, as requested.
- `Icon` masks `/icons/<name>.svg`; `check.svg` exists and arrow-up-down does
  not. `lucide-static` is absent. Installed `lucide-react-native` 1.57.0
  provides official path data in `dist/cjs/icons/arrow-up-down.js`; use it with
  sibling SVG attributes (24px, white stroke, width 2, round caps/joins).
- `.library-sort` and `.library-sort select` match the prompt. Use existing
  `account-popover` palette/tokens, a right-aligned menu and compact trigger.
- Existing `library.test.ts` has four preference/order/storage tests using
  react-test-renderer. Extend these to exercise real preference persistence
  through menu choices and add keyboard/dismissal/semantics coverage.
- Root `AGENTS.md`, `AUTOPILOT.md` and current planning headers read. No nested
  AGENTS.md was found under apps/packages. Current implementation matches the
  prompt assumptions; no STOP condition found.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Compact Sort trigger; no header select | Library UI | Focused web test | FRESH PASS |
| Mirrored filtered options and selected check | Library UI/options | Grid/course/Personal tests | FRESH PASS |
| Correct scope key, sorting and persistence | Existing preference store | Screen integration tests | FRESH PASS |
| Focus, Escape, outside, blur, arrow/Home/End | Menu interaction | Focused web tests | FRESH PASS |
| Existing reviewer behavior | Unchanged ReviewerHeader | Existing web suite | FRESH PASS |
| Menu width/right alignment at 360px | CSS | Code inspection; owner browser check | Code PASS; browser NOT RUN |
| Fresh serial gates | Repository | Exact commands/counts below | FRESH PASS, 7/7 prompt commands |

## Verification

Code inspection confirms the wrapper aligns to the right of its containing
stack and the menu to its trigger's right edge, with `max-width:
calc(100vw - 32px)`. Trigger and rows are at least 44px high. Existing
account-popover supplies colors, borders, rounding and hover state. No new
palette values. Physical/browser viewport acceptance remains an owner step.

The local tests exercise real `useListPreferences` writes, scope keys,
ordering and reload from the serialized value with a fresh cache owner, plus
storage failure. They test checked/check-icon state and filtered labels for
grid/course/Personal, first focus, selection/Escape/outside focus restoration,
inside presses, Tab blur, trigger toggle, arrow wrapping and Home/End, and
listener cleanup. Outside presses prevent the browser's default focus change
so the requested restored focus remains on the trigger (touch listener is
explicitly non-passive). Reviewer code is unchanged; no ADR is needed.

**FRESH PASS: 7/7 prompt gate commands**, run serially, plus API tests and
the AUTOPILOT forced root build. Evidence covers the code committed as
`ea9ffa9` on the baseline checkout; subsequent changes are documentation only.

- Focused `npm run test --workspace @stay-focused/web --
  src/features/library.test.ts src/features/reviewer/reviewer-header.test.ts`:
  **FRESH PASS, 21/21** tests, 2 files (12 Library, 9 reviewer).
- First `npm run typecheck -- --force`: **FRESH FAIL**, 4 successful/6 total
  tasks before abort, 0 cached, 3 TS2345 diagnostics in the new tests' string
  mock Icon lookups. Replaced them with typed node predicates; no validation
  weakening. Full fresh retry: **PASS, 8/8 tasks, 0 cached**.
- `npm run lint -- --force`: **FRESH PASS, 8/8 tasks, 0 cached**, 0 errors,
  6 pre-existing warnings (one unused web useMemo, five mobile import-order).
- `npm run test --workspace @stay-focused/web`: **FRESH PASS, 289/289**, 42 files.
- `npm run test --workspace @stay-focused/shared`: **FRESH PASS, 464/464**, 44 files.
- `npm run test --workspace @stay-focused/api -- --maxWorkers=2`:
  **FRESH PASS, 2315 passed / 3 skipped**, 201 files. Process-local
  `B24_6_LIVE=0` and `B24_7_LIVE=0` explicitly disable live database/provider
  cases. Two workers follow the prior run's recorded timeout mitigation.
  No test failures, retries or flakes in WL1.
- `npm run build --workspace @stay-focused/api`: **FRESH PASS, 1/1 build,
  35/35 static pages generated**.
- `npm run build --workspace @stay-focused/web`: **FRESH PASS, 1/1 build,
  19/19 static pages generated**; existing unused-useMemo lint warning only.
- `npm run build -- --force` (AUTOPILOT): **FRESH PASS, 8/8 tasks, 0 cached**.
  Expo's local export completed for web/Android/iOS. Process-local
  `EXPO_OFFLINE=1`, `EXPO_NO_TELEMETRY=1`, `NEXT_TELEMETRY_DISABLED=1` and
  `TURBO_TELEMETRY_DISABLED=1` were used for this additional build.
- `git diff --check` and `git diff --cached --check`: **FRESH PASS**, zero
  whitespace errors. Build-generated `apps/api/next-env.d.ts` and
  `apps/web/next-env.d.ts` were inspected and restored to the clean baseline.
  Generated outputs and command logs are excluded from commits.
- Existing Vite CommonJS/native-config advisory remains; no test assertions,
  timeouts or configuration were weakened. The sole failed gate attempt was
  the corrected test-only typecheck failure recorded above.
- Documentation tooling: an initial Python helper could not start because
  Python is unavailable here; the installed Node runtime completed the edits.
  The failed helper wrote no files and did not affect gate results.

## Closure

STEP 0-4, required tests/gates and local implementation are complete. Current
state, roadmap and sprint are reconciled; the handoff includes owner steps.
No later roadmap work started. Only the four owned web paths and the five
owned documentation paths are committed. The three unrelated untracked
baseline paths remain untouched. No deployment, remote service operation,
SQL/migration, Scheduler change, email, environment-file edit or push was run.

Production revisions, database rows, Scheduler state, remote-ref freshness
and browser/device behavior are **UNVERIFIED (owner to confirm)**;
unattended rules prohibit live checks. No remote or physical acceptance is
claimed by the local tests. Raw command logs stay uncommitted under
`tmp/overnight/WL1.*.log`.

## Owner steps remaining

- Rollout: Fely's website deployment — **NOT RUN**.
- Device checks: browser 1440/768/360px, Library grid and course: menu opens,
  correct checked choice, persistence after reload, keyboard Escape — **NOT RUN**.
