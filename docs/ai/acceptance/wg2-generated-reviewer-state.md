# WG2 website generated Reviewer state

**PASS - finite unattended code scope complete locally (2026-10-18).**
Rollout and Device checks remain owner steps and were skipped entirely.

Finite owner-authorized unattended scope: WG2/N6 STEP 0-2, local mocked tests,
fresh serial gates, documentation and local commits. Baseline `b750224` on
`overnight/2026-10-15_feedback`; WG1 `653e8d8` is an ancestor. No later task,
remote service call, environment-file edit, deployment, migration application,
Scheduler operation, email or push is authorized. Rollout and Device checks
are excluded and belong to the owner.

## STEP 0 evidence

- Initial tracked tree clean; only expected untracked `UI/`,
  `apps/mobile/.gitignore`, `supabase/.temp/`. Owner Git identity confirmed.
- Mobile Generate rows use `reviewerArtifactId` for generated state and open
  `artifact:<id>`; mobile Library confirms remaking from the original material.
  Processing presentation distinguishes running, ready and failed server states.
- Website course and paged material reads both use
  `ExperienceService.courseMaterialsForOwnedCourse` and `learningMaterial`,
  which populate the latest owner-persisted `reviewerArtifactId`.
- Library and Queue reader links encode the complete `artifact:<id>` Library ID.
- `ProcessingJobStatusView`, source metadata and `GenerationView` expose no
  Canvas material ID. `sourceVersionId` is a different identifier. Optional
  `courseBatches.requests` maps only batch submissions, so it cannot identify
  the latest job for an arbitrary material or a later direct remake.
  **generating state per material: not available from existing data**.
  Use saved Reviewer state only; never join by display name or infer failure.
- `useResource` reloads on mount, focus, online and visibility return. A course
  refresh also revalidates saved later pages through `useSavedMaterialPages`.
- Referenced `overnight/roadmaps/2026-10-17-integrate-reviewer-generate-polish.md`
  is absent (also recorded by WG1/FX1b); the complete WG2 prompt defines scope.
  No implementation contradiction found. Live deployment/database/Scheduler
  state is **UNVERIFIED (owner to confirm)** and was not queried.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| One Reviewer ready row label, also in accessible name, only for saved ID | Web Generate | Render tests | FRESH PASS |
| Open reviewer uses encoded Library ID; Remake requires confirmation | Web detail | Render/action tests | FRESH PASS |
| Exact confirmation copy, Cancel/Escape, busy/error guards | Web detail | Interaction tests | FRESH PASS |
| Reviewer fact Ready; no-reviewer generation and Quiz preserved | Web detail | Render/action tests | FRESH PASS |
| Revalidate after acceptance and on returning, including saved pages | Web resources | Real resource/action hooks, mocked API/storage | FRESH PASS |
| WG1/course batch regressions and fresh serial gates | Repository | Exact command counts below | FRESH PASS |

## Implementation and development verification

Rows append Reviewer ready to their existing meta line and accessible name only
when the server returns a saved Reviewer ID. The detail pane uses the Library's
encoded `artifact:<id>` route, shows Open reviewer as primary, and keeps Remake
secondary with the exact requested confirmation copy. The inline alert dialog
uses the existing confirmation classes; Cancel receives focus, Cancel/Escape
return it to Remake, and confirmation belongs to the current owner/material/
Reviewer identity. Busy actions cannot submit twice. Failed submission leaves
the current Reviewer accessible and permits retry.

Acceptance refreshes the existing course resource. Returning from Generation
remounts/revalidates that resource; focus/visibility refresh remains available.
Its saved timestamp revalidates later material pages at their original offsets.
The Reviewer fact says Ready, and the original no-Reviewer and Quiz flows remain.
No API, shared contract, mobile, dependency, schema or migration change.

FRESH focused development tests: first **20/20**, then **21/21** in four files
after adding the unchanged Quiz submission regression. The final set includes
13 WG2 cases, two WG1 Generate cases, three Course options cases and three
unchanged course-batch cases. Tests use real resource/action hooks with fictional
API/storage responses; they make no remote calls. No nondeterministic flake.

First gate attempt: `npm run typecheck -- --force` failed, exit 2, **4 successful
of 6 scheduled tasks, 0 cached**, with TS18046 at the new test's node-mock props
access. Added an explicit unknown/object/property type guard; no type weakening.
Restarted the final serial gate sequence. Logs live in ignored
`tmp/overnight/WG2.*.log`.

That typecheck rerun passed **8/8 tasks, 0 cached**. The first lint gate then
failed, exit 1, **5 successful of 8 tasks, 0 cached**: one new
`react/no-children-prop` error in the test's inline render fixture and one
existing web unused-import warning. Constructed the required component props
as a typed fixture before rendering, without disabling rules. Restarted the
serial gates again against the final test code. These were deterministic
development corrections, not hidden flakes.

## Final serial gates

All commands run locally and in order, with repo-local TEMP/TMP and telemetry
disabled for builds. No remote validation or real generation is used.

| Command | Evidence/result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 224/224 tests, 38/38 files |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 350/350 tests, 40/40 files |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 1/1 build, 35/35 static pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 1/1 build, 19/19 static pages |
| `npm run build -- --force` (AUTOPILOT additional gate) | FRESH PASS, 8/8 tasks, 0 cached; API/web 35/35 and 19/19 pages; Android/iOS/web exports, 68 assets |
| `git diff --check`; `git diff --cached --check` | FRESH PASS |

The existing lint warnings are five mobile test import-order warnings and one
web Library unused `useMemo` import. Vite's existing config-loader/CommonJS
notice remains; PowerShell labels redirected stderr as NativeCommandError even
when Vitest exits 0. No test failed or was skipped in these two suites.
API/mobile unit suites, provider/workflow/live tests are NOT APPLICABLE to the
unchanged implementation paths and were NOT RUN. Browser/device/RB5 acceptance
is NOT RUN under the unattended exclusion.

The tested application tree is committed as `0eaffa9` (implementation) and
`bb2395f` (tests). Final forced typecheck/lint/build took 32.472s / 38.96s /
3m13.718s; all final task counts were 8/8 with zero cached. After inspection,
restored the two generated Next ambient declarations to their clean baseline;
no generated output or temporary evidence is committed. Root export used
EXPO_OFFLINE=1 and telemetry was disabled. No environment file was edited.

## Commits and repository state

- `0eaffa9 feat(web): show saved Reviewer state on Generate`
- `bb2395f test(web): cover generated Reviewer actions and refresh`
- Documentation closes in `docs: close WG2`; its final hash is recorded in
  ignored `tmp/overnight/WG2.status` together with all run commits.

All commits use author `galaxymaxp <omgraythekid@gmail.com>`. The only unrelated
untracked paths remain `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`.
No remote service call, deploy, remote SQL/migration, Scheduler action, email,
environment-file edit or push occurred. The finite run ends at WG2; WV1/MD1
and other roadmap work were not started.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely. After review, publish
the website change and perform RB5 Generate checks for Reviewer ready,
Open reviewer and confirmed Remake in phone and resized desktop browsers.
