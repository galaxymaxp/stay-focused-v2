# PL4 vector GlassPill — acceptance

Status: LOCAL PASS (code and local gates only). Finite unattended scope: STEP 0–5, local gates, docs and
atomic local commits. Rollout and Device checks are skipped entirely. No remote
services, database application, environment-file edits, push or deployment.

## Baseline and STEP 0 inventory

Branch `overnight/2026-10-15_feedback`, HEAD `31a3d50a`; upstream github/main
ahead 22 / behind 32 (local refs only). PL3.status is PASS and canonical docs
record PL3 LOCAL PASS. Current branch agrees with the recent canonical entries;
the old main reference describes the separate C:/Projects checkout.

```text
31a3d50a docs(today): close PL3 block action verification
d3633495 fix(today-mobile): release edit state after cancelled block drag
6ee0f5e1 test(today): use complete saved timeline fixtures
fa02dc47 fix(today): normalize saved reviewer action keys
7d3133a3 test(today): prove block actions in local Chromium
4e266a13 fix(today): preserve saved block action identities
7e08db36 feat(today-mobile): long-press reorder of plan blocks
ddc8b981 feat(today-mobile): swipe to skip or remove with undo
```

`git status --short` contains only untracked owner paths: UI/,
apps/mobile/.gitignore, supabase/.temp/. Preserve these; never stage tmp/.
Read AGENTS.md, CLAUDE.md, AUTOPILOT.md, current planning entries and newest
handoff. Approved roadmap D1–D15 and Pills.dc.html/Main.dc.html inline styles
read in full from C:/Users/Fely Max Dilinila/Claude/Projects/Stay Focused/overnight/roadmaps/.

- Mobile PlanButton owns focus/AppState/load gate/GL and fallback; fallback uses
  orb palette and clock fonts. PlanGlassView owns the Expo GL context and atlas;
  planPill exports only radius 26. PlanButton.test, PlanButton3d.test and
  PlanGlassView.test cover only this obsolete button. PlanningControl opens the
  existing sheet. TodayScreen already tracks ringActive for handle drags.
- Web plan-button loads PlanGlassCanvas via DayOrb's re-export/preload promise.
  plan-glass.browser.test is solely the old button's GL proof. TodayScreen
  toggles the existing inline adjust panel; add aria-expanded to the new pill.
- git grep of every plan-glass-renderer export (planImpulse, PLAN_GLASS_FIT,
  createPlanShell, PlanGlassFrame, createPlanGlass, createPlanGlassLoop) finds
  only its own tests and the two old adapters. Delete those button-only files
  and the package subpath. No orb, Queue or Generation importer uses them.
- There is no plan-liquid.ts. plan-liquid.test.ts exercises createOrbBody and
  pins the orb fragment bytes; keep it, the shared orb renderers, glass atlas
  loader, clock fonts and orb interaction implementations unchanged.
- Mobile GenerateMaterialScreen: existing generate(reviewer|quiz), busy,
  submitting ref, reviewerSubmitted and quiz submitting screen; primary Action
  for reviewer and secondary Action for quiz. Keep durable admission/grace
  navigation. Web MaterialScreen: generate/useAction reviewer handler plus
  existing secondary Remake confirmation and QuizForm options/submit handler.
- Tasks: mobile ActivityScreen create()/busyRef/busy; web ActivityDetail
  createDraft()/draft.busy. Replace only their draft primary action.
- Library reviewer: mobile ReviewerHeader/ReviewerReader opens existing
  QuizFromReviewerSheet with next()/busy; web ReviewerHeader/ReviewerReader
  opens QuizFromReviewerDialog with create()/busy. Keep existing quiz settings.
- Existing responses expose reviewerArtifactId but no material quiz-existence
  metadata; reviewer summaries initialize relatedArtifactIds empty. Add minimal
  owner-scoped linked-quiz metadata to existing responses, no new client fetch
  or generation behavior. Older API responses safely retain an available action.
- expo-linear-gradient is absent; Expo bundledNativeModules specifies ~57.0.2.
  Add that native gradient dependency with expo install (no alternative native
  gradient component is installed). Small mobile visual height stays 34 while
  its outer touch target is at least 44.

## Acceptance matrix

| Decision / requirement | Owning layer / proof | Result |
| --- | --- | --- |
| D13 vector only, clipped highlight, exact sizes/themes | CSS/native components + browser/tree tests | PASS local: CSS/native geometry and 3 Chromium / 6 native component cases |
| D13 busy/disabled/focus/Reduce Motion and >=44 native targets | Component/browser tests | PASS local: component/browser disabled, focus, motion and native hit-target assertions |
| D13 Today count, Updating… while dragging, accessible action remains | Today/PlanningControl + closest tests | PASS local: Today Chromium and Plan/PlanningSheet/screen regressions |
| D13 delete proven button-only renderers; preserve orb/Queue/Generation | git grep inventory + regression suites | PASS local: tracked export-user grep and unchanged renderer regression suites |
| D14 Generate one pill for reviewer/quiz/busy/completed states | Both platform state/handler tests | PASS local: shared mapping, both screen suites and owner-scoped API metadata |
| D14 Tasks draft handler and busy label | Both platform screen tests | PASS local: existing draft-handler and busy/idempotency assertions on both platforms |
| D14 Library small quiz pill/busy/hidden for existing quiz | Both headers + existing quiz flow tests | PASS local: both headers and actual native Reader busy propagation |
| D1 monochrome; D2 clock renderer/gesture unchanged | Owned diff + styles review | PASS local: exact monochrome styles; no clock renderer/gesture edits |
| D15 code/local commits only, no sync/Library refetch | Request assertions + diff review | PASS local: existing handlers, request assertions, no client Library fetch or migration |
| 300% web edges and clipped highlight | Local Chromium captures | PASS local: inspected light/dark Chromium captures at zoom 300%, DPR 3 |

## Verification

### Resumed checkpoint

Resumed at `63a16d95`: steps 1-3 were already committed and were not
reimplemented. Inspected every uncommitted step 4 path before proceeding.
Step 4 is `c45c7da4`; verification repairs are `23d71f3d`. No owner paths
were edited or staged.

The existing material and reviewer detail responses now include minimal
owner-scoped persisted Quiz metadata. The production adapter binds the verified
bearer owner, batches 100 Reviewer identities, pages 200 Quiz rows at a time,
and fails safely on incomplete reads. It does not fetch the client Library,
sync Canvas, change generation requests, or add a migration. Older API
responses leave the existing action available. Synthetic adapter tests prove
owner binding, exclusion of unrelated rows, pagination, batching and safe
provider-error handling.

Generate uses one medium pill for the available Reviewer/Quiz state, with
inline busy labels and no pill once both outputs exist. Web keeps its existing
Quiz options: opening them moves the single pill to the existing submit action;
Cancel quiz returns to the material action. Remake remains the existing
secondary action. Mobile keeps its durable admission, Queue and grace navigation;
only the old temporary Quiz submitting screen is replaced by the inline busy
pill. Tasks uses the existing draft handler; Library uses a small Quiz pill and
propagates the existing dialog/sheet busy state. Quiz remains gated on a saved
Reviewer. Small native pills have a 34px visual shell inside a >=44px target.

`expo-linear-gradient ~57.0.2` was added through Expo's compatible installer
because no native gradient component existed. Lockfile included. No other new
dependency. The clock renderer and gestures, orb/Queue/Generation renderers,
and `plan-liquid.test.ts` are preserved. The sole DayOrb edit removes its
obsolete PlanGlassCanvas re-export. Button-only renderer, atlas, wrappers,
subpath and obsolete tests were deleted after the export-user inventory;
closing git grep finds no remaining code importer.

### First failures and retained repairs

- Initial step 1 browser fixture: **0 passed / 3 failed**, repeated in the
  rerun/debug logs. Vite's fixture lacked executable automatic JSX configuration
  and failed in Chromium with `(void 0) is not a function`; the local fixture
  configuration was corrected. Final focused run **3/3 passed**.
- Step 3 browser: **8 passed / 2 failed** (initial Plan count disagreed with
  the visible fallback proposal; reorder assertion raced the automatic preview).
  Count now uses the same cached proposal and the test waits for ready state.
  Focused rerun **10/10 passed**. No clock gesture changed.
- Step 4 web: **17 passed / 8 failed** from old button-child selectors after
  replacement. Accessible label selectors restored the handler assertions;
  rerun **25/25 passed**. Expanded header test initially **30 passed / 1 failed**
  because it expected the only button in a header with an actions menu;
  selecting the specific pill fixed it, **31/31 passed**.
- Resumed full typecheck: **6/8 successful tasks, 0 cached**, API TS2322 in
  the new production-shaped test fixture. Literal `type` and `status` were
  widened by the mock. Explicit literal types fix the fixture without any
  validation relaxation. The subsequent fresh run is recorded below.
- The interrupted `step4-api-full.log` has only suite startup and no result:
  **NOT RUN to completion**, never counted as a pass. Resumed focused API
  verification is **92 passed / 0 failed / 0 skipped, 3 files**.
- First resumed lint passed **8/8 tasks, 0 cached**, with **9 warnings**.
  Removed PL4's unused GenerationLayout import and the BOM in PlanButton.test;
  the other seven warnings are the established baseline.
- First full shared attempt: **946 tests passed, 97 files passed / 1 failed**.
  The failure was the deleted renderer's stale emitted test in ignored `dist/`,
  which still attempted to read the deleted button atlas. Added a package-local
  Vitest include for `src/**/*.test.ts`, matching the other apps' source-only
  suites. Source tests and assertions are preserved; generated stale tests are
  excluded consistently before and after a build. No fixture/atlas restored.
  This also removes duplicated compiled test executions from the reported
  count: the source-only result is **476 passed / 0 failed / 0 skipped,
  49 files**. The earlier 946 included both source and generated tests; it
  must not be described as 946 distinct source cases.
- First full mobile attempt: **1745 passed / 23 failed, 187 passed / 3 failed
  files**. Three established Reviewer integration tests mocked React Native
  without StyleSheet; added hairlineWidth and an inert native gradient mock
  so they render the actual GlassPill. Focused rerun **52 passed / 1 failed**:
  a Study Assist selector matched every busy-capable button, now including
  Generate quiz. Scoped it to its actual sheet, preserving the exact four
  action assertions. Also verified busy state propagation from Quiz submission
  through the real Reader and Header. Final focused rerun **53/53 passed**.

Receipts are retained under `tmp/overnight/PL4/`; no validation output is staged.

Fresh serial commands and exact counts are recorded below. Evidence only in
tmp/overnight/PL4; preserve first failures and reruns. Repo-local temporary and
cache paths, dotenv/telemetry off, credential stripping and loopback guards.

## UNVERIFIED and Owner steps remaining

Live FS12/served revision, database, Scheduler/provider state: **UNVERIFIED
(owner to confirm)**. No permitted local code check requires remote access.

- Rollout **NOT RUN**, skipped entirely: owner FULLSEND after PL4 PASS.
- Device checks **NOT RUN**, skipped entirely: Realme pill sharpness at 3×,
  placements, native accessibility/Reduce Motion/appearance/performance.
- Native fidelity, other real browsers/assistive technology: **UNVERIFIED
  (owner to confirm)**.

### Final local gate results (2026-10-27)

Tested code: `23d71f3d` on `overnight/2026-10-15_feedback`.

| Gate (FRESH) | Result |
| --- | --- |
| Shared, source only | 476 passed, 0 failed/skipped; 49 files |
| Mobile | 1768 passed, 0 failed/skipped; 190 files |
| Web unit | 573 passed, 0 failed/skipped; 79 files |
| Web Chromium, 13 serial suites | 142 passed, 0 failed/skipped; 13 files |
| Affected API experience/quiz-metadata/descriptions | 92 passed, 0 failed/skipped; 3 files |
| Forced typecheck, lint and serial root build | 8/8 tasks each, 0 cached |
| Closing typecheck after declaration restoration | 8/8 tasks, 0 cached |
| Direct API build, web build, offline Android export | PASS, 1/1 each |
| Working/staged whitespace checks | PASS, zero errors |

Distinct source-suite shared/mobile/web total: **2959 passed / 0 failed / 0 skipped**.
The affected API's 92 additional cases are reported separately. Shared
counts exclude generated duplicate tests, as explained above; comparisons with
PL3's old combined source/dist count must account for this. Lint retains seven
pre-existing warnings, zero new warnings and zero errors. Workflow runtime,
provider-contract and migration checks are **NOT APPLICABLE** (no changes to
those layers). Release/device checks are **NOT RUN**, as explicitly excluded
above. Live production state remains **UNVERIFIED (owner to confirm)**.

Exact commands, executed serially (repaired gates retain their earlier logs):

```text
npm run typecheck -- --force
npm run lint -- --force
npm run test --workspace @stay-focused/shared -- --maxWorkers=1
npm run test --workspace @stay-focused/mobile -- --maxWorkers=1
npm run test --workspace @stay-focused/web -- --maxWorkers=1 --exclude **/*.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/course-options.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/ambient.browser.test.ts --pool=threads --reporter=verbose
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/glass-clock.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/day-clock/orb-load.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/generation-screen.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/knowledge-core/orbBody.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/password-reset.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-failures.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/queue-orb.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/components/ui/glass-pill.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/features/today/today-planner.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/hide-on-scroll.browser.test.ts
npm run test --workspace @stay-focused/web -- --maxWorkers=1 src/lib/screen-snapshots.browser.test.ts
npm run build --workspace @stay-focused/api
npm run build --workspace @stay-focused/web
npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 1 --output-dir ../../tmp/overnight/PL4/android-export
npm run build -- --force --concurrency=1 --env-mode=loose
npm run test --workspace @stay-focused/api -- --maxWorkers=1 src/lib/experience/experience.test.ts src/lib/experience/reviewer-quiz-state.test.ts src/lib/experience/material-descriptions.test.ts
npm run typecheck -- --force
git diff --check
git diff --cached --check
```

Receipts: tmp/overnight/PL4/gates-repaired.json (typecheck/shared),
gates-closing-lint.json, gates-remainder.json, gates-closing.json, closing-api.log
and final-gates.json. The original failed receipts are preserved as
gates-final.json and gates-verified.json; no failed first attempt was waived.
Commands used repo-local TEMP/TMP/TMPDIR and npm/Turbo caches, dotenv and
telemetry disabled, stripped credential variables and loopback-only Node
guards. Root build inherits CPU affinity 1, matching RR1d/PL3; no repository
or Metro concurrency setting changed. Generated Next declaration bytes were
restored by the runner before the closing typecheck. Artifacts stay ignored.

### Local visual result

Chromium fixtures use synthetic data and loopback routes. The final pill
browser suite proves dimensions, colors, no canvas/img/image/video, busy/disabled
semantics, focus outline, keyboard expansion and reduced-motion spinner behavior.
Light/dark captures at CSS zoom 300% and deviceScaleFactor 3 were visually
inspected: smooth rounded edges and the highlight stays inside the border;
the external Plan ring is the deliberate keyboard focus outline. Screenshots:
tmp/overnight/PL4/browser/pills-300pct-{light,dark}.png and actual Today captures
at 1280/390px. Native tests prove structure and >=44px targets; they do not
establish physical appearance.

### Local commits

```text
49643361 feat(ui-web): vector GlassPill
dc4da823 feat(ui-mobile): vector GlassPill
63a16d95 feat(today): vector Plan pill replaces 3D Plan button
c45c7da4 feat(ui): GlassPill on Generate, Tasks and Library
23d71f3d test(ui): stabilize vector pill regression gates
```

The final documentation commit follows; its exact hash is recorded in Git and
tmp/overnight/PL4.status/progress. No remote service/SQL, migration, deployment,
Scheduler/email, environment-file edit, push, OTA/EAS or device action. Owner
UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched; tmp outputs
are uncommitted. Endpoint PL4 only.
