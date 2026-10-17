# WG1 website Generate layout

**PASS - local unattended code scope complete (2026-10-18).**

Finite unattended scope: WG1/N5, website only, baseline fdf1937 on
`overnight/2026-10-15_feedback`. Required ancestor 1a9d3f9 is present.
Only pre-existing untracked UI/, apps/mobile/.gitignore and supabase/.temp/
were present. The referenced overnight roadmap is absent; the complete WG1
prompt supplies the finite requirements without a code contradiction.

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Matching batch button sizing and wrapping | CourseBatchControls/CSS | Existing batch regressions and five browser widths | FRESH PASS |
| Single-line truncated breadcrumb clear of actions | Shell breadcrumb/CSS | Long course/material names at five widths | FRESH PASS |
| Single global sync message with busy course button | Generate presentation | Render regression and browser | FRESH PASS |
| Search/link wrap independently | Generate CSS | Browser text intersections and horizontal scroll | FRESH PASS |
| Styled Course options on both pages, Esc/outside dismissal | Shared CourseOptions | Render tests and browser interactions | FRESH PASS |
| Equal card heights; title/meta/action wrapping | Generate grid/detail CSS | Browser geometry and screenshots | FRESH PASS |

Single sync location: CanvasRefreshStatus below the Generate/course heading.
While it is syncing, per-course in-flight text is hidden; the local Sync button
keeps its disabled state, spinner and aria-busy. If global refresh is idle,
local in-flight course text remains. Sync admission, polling and data semantics
are unchanged.

## Implementation and local acceptance

- FRESH focused render tests: 8/8 across 3 files, including unchanged
  course-batch.test.ts (3/3). First attempt: 2 failed / 6 passed because Next
  Link expected a browser self in the Node renderer; mock Link for this render
  boundary fixed it. No nondeterministic flake observed.
- FRESH isolated web typecheck: PASS after fixing one test callback returning a
  boolean from document.dispatchEvent; the initial run failed with TS2769.
- Browser development attempts 1 and 2 each reached 1 passing viewport/page
  check, then reported overlapping ascent/descent bounds on adjacent lines of
  the same H1 text node. Visual inspection confirmed normal heading line layout.
  The checker now compares distinct text nodes, clips overflow/ellipsis bounds,
  and continues checking every distinct header/sync/action text box.
- Final FRESH browser result: **20/20** page/viewport checks (Generate, course,
  material and Canvas at 1440, 1024, 768, 390 and 360 px), **10/10** mocked
  move-course requests, **170** intercepted API requests, **zero** unexpected
  requests or runtime errors. Equal-height grid cards, matching batch button
  height/padding, single sync text, stable disclosure geometry, aria-expanded,
  Escape focus return, outside click, existing PATCH payload, and the final
  Canvas row's unclipped clickable action pass. Native buttons retain normal
  Tab/Enter behavior; focus-leaving dismissal also has a render regression.
- Screenshots and structured geometry report: ignored .local/wg1/ (20 PNGs,
  report.json, server.log). Visually reviewed Generate 1440/360, course 1440/360
  and material 768; fixtures include unusually long course/material/module names.
- Python launcher unavailable during an edit attempt; no mutation occurred in
  that command. Repeated the text edits with the installed Node runtime.
- Local browser script: node apps/web/scripts/wg1-layout-check.mjs.
  All auth/API responses intercepted with fictional fixtures. Fallback origins
  are loopback. No production URL or remote credentials are used by the script.

## Final serial gates (FRESH, code f485a2f)

| Command | Result |
| --- | --- |
| npm run typecheck -- --force | PASS, 8/8 tasks, 0 cached |
| npm run lint -- --force | PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| npm run test --workspace @stay-focused/web | PASS, 209/209 tests, 37/37 files |
| npm run build --workspace @stay-focused/api | PASS, 1/1 build, 35/35 static pages |
| npm run build --workspace @stay-focused/web | PASS, 1/1 build, 19/19 static pages |
| npm run build -- --force (AUTOPILOT additional gate) | PASS, 8/8 tasks, 0 cached; API/web 35/35 and 19/19 pages; Android/iOS/web exports and 68 assets |
| git diff --check; git diff --cached --check | PASS |

All final gates passed on their first gate attempt. The focused development
failures above were corrected before gates. Logs: .local/wg1/gate-*.log.
Root typecheck/lint/build took 24.343s / 33.276s / 1m44.866s. Vite's existing
CommonJS/config-loader notice and six existing lint warnings remain; PowerShell
renders redirected stderr notices as NativeCommandError records even when the
command exits 0. API/mobile/shared unit suites are NOT APPLICABLE (unchanged).
This is local mocked layout acceptance, with no claim of live account acceptance.

## Owner steps remaining

Rollout and Device checks skipped entirely (NOT RUN). Owner releases through the
normal website flow and performs RB5 Generate at phone/resized desktop widths.
Deployed revision and physical/browser owner acceptance are
**UNVERIFIED (owner to confirm)**. No live DB or Scheduler check is required
for this website-only slice; their state remains UNVERIFIED (owner to confirm).

Implementation: ace4cb2. Browser harness: f485a2f. No dependency, API, mobile,
schema, migration or sync transport change. All credentials/fixtures in the
browser harness are fictional. Generated Next ambient declarations are restored
after inspection. Existing unrelated untracked paths are preserved.
