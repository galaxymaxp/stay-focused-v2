# IM2 reviewer images — PASS locally

Finite unattended IM2/N4 scope from `tmp/overnight/prompts/IM2.md`, baseline
1a9d3f9 on overnight/2026-10-15_feedback. Endpoint: IM2 only.

## Baseline and decisions

STEP 0 verified branch/HEAD and only the permitted unrelated untracked UI/,
apps/mobile/.gitignore and supabase/.temp/. All named image surfaces exist.
External/figure viewers use Sheet; snapshots use Modal. ReviewerReader uses
right-edge hold/drag scrubbing on its reader ScrollView. Isolate viewer gestures
in a Modal so image interaction cannot reach the reader scrubber.

The referenced overnight/roadmaps/2026-10-17-integrate-reviewer-generate-polish.md
was not found by local file search. The full prompt supplies the requirements;
this is a documentation gap with no implementation contradiction.

Chosen pattern: opening an image reveals details inside the viewer on all three
surfaces on both platforms. No extra Details toggle. Grounding stays visible
outside and inside; external source and license links are direct viewer actions.
Accessible thumbnail names retain image identity.

## Implementation

- Mobile uses the shared ImageViewer Modal for ExternalVisual, SourceFigures
  and SourcePageSnapshot. Image, revealed details and Ask/Save scroll together.
  External Commons/source and license links are rendered only while open and
  remain direct 48-point actions. Thumbnails retain their accessible names.
- ZoomablePage reports scale to the viewer, keeps pinch/double-tap and bounded
  pan, permits native scroll takeover at zoom 1 and retains its responder while
  zoomed. Pull-down eligibility requires scroll top and zoom 1 from touch start;
  pinch, upward/horizontal intent, cancellation or leaving the top cancels it.
  Dismissal requires 120 dp, or at least 24 dp and 0.9 dp/ms. Paused flick velocity
  expires. Reduce Motion uses no translation, spring or Modal animation. Android
  back and Close always work independently of scale/scroll.
- ImageViewer explicitly stops all raw touch phases at its outer boundary,
  after its own gesture observer, so events cannot reach the reader's edge
  scrubber even through portal bubbling. Final review added this guard in
  311cc58; focused ImageViewer/SectionScrubber verification is FRESH 21/21.
- Website reveals title/credit/license/source inside the dialog on opening,
  retains grounding outside and inside, and preserves Ask/Save and replacement
  behavior. Dialog and enlarged-image overflow are scrollable at any slider
  zoom. Backdrop dismissal checks both the actual event target and dialog
  bounds, leaving content and padding clicks alone. Native Esc is not prevented;
  Close/backdrop invoke close and native close clears revealed details.
- No dependency/native module/API/schema/auth/storage behavior changes.
  [ADR-041](../../architecture/ADR-041-reviewer-image-viewer.md) records the shared
  viewer pattern. React review covered strict props, hook ordering/latest-event
  refs, native event cleanup/cancellation, accessible names and direct links.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Details hidden before opening; grounding and accessible names retained | Mobile/web images | Render tests | PASS automated |
| Attribution and direct source/license links when open | Mobile/web viewer | Render/link tests | PASS automated |
| Tall content scrolls; dismiss only at top and zoom 1; pinch/pan retained | Mobile viewer | Helper/responder/render tests | PASS automated; device NOT RUN |
| Android back and Reduce Motion | Mobile Modal | Render tests | PASS automated; device NOT RUN |
| Ask/Save exact targets, offline guards | Mobile/web | Existing SA2/IM1b suites | PASS automated |
| Scroll at all zoom levels; Esc/Close/backdrop | Web dialog | Render/event tests; native dialog semantics | PASS automated; browser NOT RUN |
| Typecheck/lint/tests/API/Android/root builds/diff | Local gates | Fresh serial commands | PASS FRESH |
| Rollout and Device checks | Owner | Excluded by UNATTENDED | NOT RUN |

Production revisions, DB/Scheduler state and physical behavior are
UNVERIFIED (owner to confirm). No live verification is permitted in this run.

## Attempts retained

- Baseline focused mobile suites: FRESH 49/49. First changed run: 49 passed /
  1 failed because ExternalVisual still asserted always-visible attribution;
  updated it to assert hidden before opening and present with direct links after
  opening. Retry: 50/50. New gesture/viewer tests: FRESH 71/71 across five files.
- First extended web test: 3 passed / 1 failed, comparing a snapshot grounding
  span's React children array with a string. Flattened the rendered text; FRESH
  retry 4/4. Existing Ask/Save exact-target and offline checks remain.
- First forced root lint: 7/8 tasks successful, zero cached; one new test error
  (`react/no-children-prop`). Typed the render-function props before createElement.
  Fresh retry: 8/8, zero cached, zero errors and six pre-existing warnings.
- First full mobile suite: 130 files passed / 3 files failed to import, 1,186
  collected tests passed. The new viewer imports native safe-area context, which
  three reader suites had not stubbed. Added the same inert native boundary used
  by the component suites. StudyAssistSheet's EV1 regression now checks hidden
  attribution and the thumbnail's named accessibility label; source precedence,
  discovery failure and offline assertions remain. FRESH retry: 1,238/1,238,
  133 files. No nondeterministic flake observed.
- SourceFigures responder expectation now permits native scroll takeover at
  zoom 1 and explicitly rejects takeover while zoomed; pinch cap stays 4.
- Preparation commands: Python was unavailable and an initial Node edit script
  used `index` instead of `indexOf`; neither changed files. Continued with
  apply_patch/Node. Missing local path lookups were resolved from repository paths.

Evidence logs are ignored under tmp/overnight/IM2-*.log, never committed.

## Final serial gates

Final code: **311cc58**, with later documentation-only closure. A preliminary
green gate cycle was repeated after adding the explicit reader-touch boundary.
No cached result is used for final acceptance.

| Exact command | Final result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | FRESH PASS 8/8 tasks, 0 cached | IM2-final-typecheck.log |
| `npm run lint -- --force` | FRESH PASS 8/8 tasks, 0 cached; 0 errors, 6 existing warnings | IM2-final-lint.log |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS 1,239/1,239 tests, 133 files | IM2-final-mobile-tests.log |
| `npm run test --workspace @stay-focused/web` | FRESH PASS 204/204 tests, 35 files | IM2-final-web-tests.log |
| `npm run build --workspace @stay-focused/api` | FRESH PASS 1/1 build; 35/35 static pages | IM2-final-api-build.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS 1/1 export; 1 Android bundle, 35 assets | IM2-final-android-build.log |
| `npm run build -- --force` | FRESH PASS 8/8 tasks, 0 cached; API/web 35/35 and 19/19 pages; Android/iOS/web, 68 assets | IM2-final-root-build.log |
| `git diff --check`, `git diff --cached --check` and full task diff check | FRESH PASS | Local diff/staged checks |

Lint retains five existing mobile import-order warnings and one existing web
unused-useMemo warning. Existing Vite config-loader/CommonJS and Expo color-env
warnings remain. API/shared tests are NOT APPLICABLE: implementation unchanged.
Generated API/web next-env.d.ts additions were inspected and restored. Builds
used offline Expo and disabled build telemetry; no environment file was edited.
Node-host render assertions and native dialog semantics are local evidence,
not proof of measured Yoga, physical gestures, screen readers or real-browser Esc.

## Commits and closure

- 93dea65 feat(mobile): show image details on opening the viewer
- 13833e9 feat(mobile): scroll and pull down to close image viewers
- 11fb0ee feat(web): reveal image details in scrollable dialogs
- 739d80b test(mobile): retain reader contracts with the shared image viewer
- 311cc58 fix(mobile): isolate image touches from the reader scrubber
- `docs: close IM2` is the closing documentation checkpoint; its final hash is
  recorded in Git and ignored tmp/overnight/IM2.status (avoids a self-hash edit).

Required author: galaxymaxp <omgraythekid@gmail.com>. No push. Current-state,
roadmap and sprint are reconciled; historical entries are preserved. Only the
expected unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain untracked.
No remote calls, SQL/migrations, deployment, Scheduler, email or environment-file
changes. The missing roadmap reference did not contradict the actual code.

## Owner steps remaining

Rollout and Device checks were skipped entirely, NOT RUN. Release the reviewed
mobile and website changes through the normal owner flow. IM2 adds no native
module; inherited IM1b's native gallery baseline still needs its owner rollout.
RB5 on Realme: captions/details only after tapping; external-reference and course
grounding always visible; license/source links directly reachable; long captions
and actions scroll; pull-down closes only at top and zoom 1; pinch/double-tap and
zoomed pan work; Android back and Close work; Reduce Motion removes slide motion;
viewer touches do not activate the reader edge swipe/scrubber. Confirm Ask/Save.
Website: confirm scrolling at all zoom levels and Esc/Close/backdrop dismissal.

UNVERIFIED (owner to confirm): deployed revisions, browser/device interaction,
native gesture arbitration, DB rows/applied migrations and Scheduler state.
No unanswered owner question blocks local code closure. This run ends at IM2.
