# LM1 - Mobile course options by long press

## Final local checkpoint: PASS

Implementation 2305e847; acceptance freeze 51a8e326. Authorized LOCAL scope only.
All required local gates pass; physical/production behavior remains UNVERIFIED
(owner to confirm). Completion documentation identity follows in Git/LM1.status.

## Frozen scope and baseline (2026-10-24)

LOCAL code/tests/docs/commits only, endpoint LM1. Read the complete LM1 prompt,
owner roadmap (including final LM1 decisions), screenshot, AGENTS.md,
AUTOPILOT.md, current plans, recent handoff, PBR-UX2 and UX3 acceptance.
No services, environment files, deploys, remote SQL, push or physical checks.

Branch: `overnight/2026-10-15_feedback`. Initial `git log --oneline -8`:

```text
58fbf6a0 docs(queue): close QN1 local verification
05102204 fix(queue): contain failure cards and group repeated attempts
394d4fa6 docs(queue): freeze QN1 failure card acceptance
5f6acd27 docs(readiness): record passing FS8 validation receipt
05017922 docs(readiness): close FS8 blocker supersession acceptance
5adcafc8 fix(verification): validate resume text against actual capture pixels
d30afbb3 fix(web): meet muted text contrast on the light page canvas
6175e8d2 docs(readiness): freeze direct FS8 repair and website audit scope
```

Initial `git status --short`:

```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

Preserve these owner paths and ignored tmp. Local upstream snapshot: ahead 3,
behind 27 against github/main; no fetch. Author galaxymaxp <omgraythekid@gmail.com>.

## STEP 0 source findings

At baseline 58fbf6a0, `apps/mobile/src/design/CourseViews.tsx:48` renders `options` after the animated
card in a separate View with marginTop 4. `CourseOptions.tsx:53-57` renders the
48-point MoreHorizontal trigger there. Library passes it from
`LibraryScreen.tsx:215`; Generate current/hidden/past pass it at
`GenerateScreen.tsx:177,192,206`. Thus the dots are below the card by design,
outside SwipeRow clipping and transformed bounds; the reference matches this.
Removing the sibling also removes its 48-point height and four-point gap.

Exact source inventory (correction to preliminary verbal inventory):

| Surface | Existing sheet actions, in order |
| --- | --- |
| Library course | Pin or Unpin |
| Generate current, synced | Pin or Unpin; Hide; Unsync; Move to past courses |
| Generate current, not synced | Pin or Unpin; Hide; Move to past courses |
| Generate hidden | Show; Move to past courses |
| Generate past | Move to current |

All actions come from unchanged existing factories/callbacks, including their
confirmations and permissions. PinnedMark is a visible indicator, retained.
There is no separate always-visible mobile course Pin button; swipe Pin remains.
Web Library keeps Pin/Unpin; Generate keeps Move to past courses/Move to current.
Web source positions its independent trigger inside the top-right corner with
reserved title space and a separate bottom-right pin indicator. Verify actual
phone/tablet/desktop geometry in the local synthetic browser fixture before
deciding whether any web positioning repair is needed.

| Row | Requirement / proof | Initial result |
| --- | --- | --- |
| 0 | Branch/policy/source/action inventory and web bounds baseline | Source confirmed; browser pending |
| 1 | Mobile Library and all Generate groups: no dots, 400ms long press, light haptic, same sheet, tap only navigation, clean feedback cancellation | Pending |
| 2 | Options accessibility action plus retained existing actions, pin and owner/route closure | Pending |
| 3 | Web dots at all widths, inside card, clear of title/pin, independent navigation | Pending local browser proof |
| 4 | Focused/full mobile and web regressions; light/dark Library and three-width web screenshots | Pending |
| G | Fresh serial forced typecheck/lint, API/web builds, offline Android export, forced serial root build, both diff checks | Pending |
| C | Reconcile planning/handoff, local scoped commits, progress/status | Pending |

## Owner steps remaining

Rollout and Device checks NOT RUN, skipped entirely. Owner: Realme Library and
Generate long-press options, next fullsend, native assistive technology/haptics.
FS10 served revision, production/database/Scheduler/provider state and physical
acceptance are UNVERIFIED (owner to confirm); source/docs alone establish no
live claim. No hint banner, new actions, data/schema/controller or other backlog
work belongs to LM1.

## Implementation and local interaction evidence

CourseOptions now owns a disclosure context around the existing card/feedback/
SwipeRow instead of rendering an independent button below it. All current,
hidden and past Generate wrappers and Library pass the same action arrays.
CourseCard/CourseTile add a 400ms long press and an Options accessibility action,
retaining their existing custom actions. The light `haptic.tap()` helper respects
the existing feedback setting. Holding resets transient feedback and suppresses
navigation until the next press begins. Tap still invokes the original route.
Sheet title/actions/selected pin state, confirmations, owner/route/course-key
reset, Done/Back/outside dismissal and focus return remain; focus now returns to
the card. No additional hints or controls. The orphaned 48-point row plus its
four-point gap is removed; tile sizing/grid and pin indicator remain unchanged.

Settled web card geometry was already correct at 320/768/1280 in light/dark:
12 baseline cases prove containment and no title/pin overlap. No positioning
change is needed. Removed Generate's desktop hover-only opacity/pointer-events
rule so the website trigger stays visible at every width. Web action code and
navigation remain unchanged. Three permanent Chromium regressions check both
web surfaces at these widths, 44px targets, independent menu opening/action and
no navigation. Existing pin/move/busy/dismissal unit coverage remains intact.

FRESH synthetic source-extracted Chromium/RNW evidence uses 27 exact production
function bodies plus real CourseViews/CourseOptions/SwipeRow/CourseNavigation,
production motion tokens, web CSS and web icon assets. Authentication, data,
navigation, native icon drawings and page shell are synthetic. This is local layout/interaction evidence,
not an authenticated app or native-device screenshot. Final `browser-results.json`
records **32/32** cases: eight mobile long-press/sheet/dismiss/tap flows across
both themes/motion settings, 12 baseline web geometries and 12 final web menu
flows. **0 page errors / 0 outbound page requests**. Light/dark mobile Library
and web Library/Generate captures at all three widths are retained under ignored
`tmp/overnight/LM1/`; representative captures were visually inspected.

The mobile browser probe sends touchCancel when the RNW Modal takes over the
held responder. Initial touchEnd produced a compatibility click on the new
backdrop, closing the sheet, without navigating. That RNW retargeting is retained
as an explicit limitation; native release handling is UNVERIFIED (owner to
confirm). Component regressions separately dispatch long press, release and tap
handlers and prove the navigation guard, new subsequent tap, full sheet action
inventory, Options custom action, original custom actions, motion cancellation,
focus return, pin indicator and owner/route/course reset. No native release PASS
is inferred from the adapted fixture.

Eight action/navigation callback bodies match the initial implementation exactly:
Generate actions/openCourse/moveCourse/unsync/change, Library pinAction/
libraryIdentity and web syncCourse. Seven final source/test hashes, 23 unrelated
owner artifact hashes and four prior planning/handoff documents are recorded in
the ignored integrity evidence. No API/auth/schema/provider/data work.

## Attempts retained

- Initial focused mobile: **180 passed / 2 failed** in 14 passing/1 failing
  files; the old disclosure tests targeted the removed visible trigger. Tests
  now exercise the card's gesture and accessibility entry points.
- Expanded focused mobile: **188 passed / 2 failed**; the second motion iteration
  compared cumulative navigation calls against zero after its deliberate first
  tap. Compare against the count before each hold; no assertion was removed.
- Initial forced typecheck: **7/8 tasks**, 0 cached; one new test helper used a
  union of Card/Tile component types with incompatible required width props.
  Split the typed createElement calls; strict product types remain intact.
- Initial forced lint: **7/8 tasks**, 0 cached; three react/no-children-prop
  errors in the new test helper. Use createElement's child arguments. Six existing
  warnings remain, with zero new warnings/errors on the passing rerun.
- Two initial browser attempts timed out on Done after RNW's compatibility
  release click dismissed the new modal. The responder-cancellation adaptation
  and native limitation are described above; original diagnostic output remains.
- The next browser collector counted all hidden swipe Hide buttons (29) rather
  than the one open-sheet action. Scope inventory to the modal; all expected
  labels and counts remain asserted.
- Initial web probe and permanent browser regression measured during the existing
  rise-in entry animation: **4 passed / 3 failed** tests in 1 passing/1 failing
  files for the permanent options run. Await actual document animations before
  settled geometry measurements. All three widths pass without changing card
  positioning or weakening containment/overlap assertions.
- Read-only discovery included a PowerShell brace-expansion parse failure and
  guessed path misses. They performed no mutations; actual paths were read.

All original logs/failed JSONs remain under ignored `tmp/overnight/LM1/`.
Commands use inspected loopback-only network/environment-file guards, repo-local
TEMP/TMP/TMPDIR and npm cache, offline npm/Expo, EXPO_NO_DOTENV=1, and telemetry
off. No dependency installation or external service check is performed.
Existing Vite config-loader, react-test-renderer deprecation and Expo
NO_COLOR/FORCE_COLOR warnings remain in the original logs. React review checked
hook cleanup, disclosure ownership, press state held in a ref, strict props,
accessible action forwarding and transform-only feedback; no new data effects.

## Final fresh gates and closure

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run test --workspace @stay-focused/web -- src/components/course-options.browser.test.ts src/components/course-options.test.ts --maxWorkers=1` | 7 passed (7); files 2 passed (2) | FRESH |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/screens.test.ts src/features/queue src/design/CourseInteractions.test.ts src/design/QueueButton.test.ts src/design/courseIdentity.test.ts src/features/redesign/presentation.test.ts src/features/redesign/libraryPresentation.test.ts src/features/redesign/courseReviewerActions.test.ts src/features/redesign/listPreferences.test.ts --maxWorkers=2` | 190 passed (190); files 15 passed (15) | FRESH |
| `npm run test --workspace @stay-focused/web -- src/features/queue src/features/course-batch src/features/generate.test.ts src/features/library.test.ts src/components/queue-button.test.ts src/components/course-options.test.ts src/components/course-navigation.test.ts --maxWorkers=2` | 113 passed (113); files 11 passed (11) | FRESH |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=1` | 1674 passed (1674); files 176 passed (176) | FRESH |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | 620 passed (620); files 79 passed (79) | FRESH |
| `npm run typecheck -- --force` | 8 successful, 8 total; 0 cached, 8 total | FRESH |
| `npm run lint -- --force` | 8 successful, 8 total; 0 cached, 8 total | FRESH |
| `npm run build --workspace @stay-focused/api` | exit 0 | FRESH |
| `npm run build --workspace @stay-focused/web` | exit 0 | FRESH |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | exit 0 | FRESH |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8 successful, 8 total; 0 cached, 8 total | FRESH |

Full affected suites: **2,294 passed / 0 failed / 0 skipped**: mobile
1,674 in 176 files; web 620 in 79 files. Focused mobile 190/15 files, focused
web 113/11 files; separate web options 7/2 files. Forced typecheck/lint/root
build each 8/8 tasks, 0 cached. Six existing lint warnings. API/web standalone
builds and offline Android JS/assets export pass. No native build/install.
Shared/API full suites, workflow/provider contracts: NOT RUN / NOT APPLICABLE
to this UI-only slice; shared/API implementation is unchanged.

Final suite and build gates run serially. Both Next generated declaration files are checked
against their expected generated contents, then restored from exact pre-build
copies. Final forced typecheck/lint run after restoration. All seven tested
code/test source hashes remain unchanged, and are compared with the code commit
using CRLF/LF normalization only. Both git diff --check and git diff --cached
--check pass FRESH at code and documentation staging boundaries. LF-to-CRLF
working-copy warnings are retained, with no diff errors. Original failed first
attempts above remain in the logs; final full suites pass on their first runs.

| Acceptance row | Final result |
| --- | --- |
| 0 Source/branch/inventory and web baseline | PASS (LOCAL) |
| 1 Mobile dots removal/400ms hold/light helper/tap guard/feedback | PASS (LOCAL); physical release/haptic UNVERIFIED |
| 2 Options custom action/existing actions/pin/owner-route closure | PASS (LOCAL); native assistive technology UNVERIFIED |
| 3 Web visible trigger/bounds/independent menu | PASS (LOCAL) |
| 4 Focused/full affected suites and required screenshots | PASS (synthetic LOCAL); authenticated/native visuals UNVERIFIED |
| G Fresh serial gates and diff hygiene | PASS (LOCAL) |
| C Plans/handoff/local scoped commits/status | PASS (LOCAL); final identity in Git/LM1.status |

Commits, author galaxymaxp <omgraythekid@gmail.com>:

- 51a8e326 docs(mobile): freeze LM1 course options acceptance
- 2305e847 fix(mobile): open course options on long press
- Final documentation commit: docs(mobile): close LM1 local options verification;
  exact hash follows in Git and tmp/overnight/LM1.status without self-amending.

Current-state/roadmap/sprint are reconciled; the complete prior planning/handoff
text and 23 unrelated owner artifacts remain. No tmp/generated/private artifacts
are committed. Endpoint LM1 only; no TC2/TP1 or release work is started.

**Owner steps remaining:** Rollout and Device checks NOT RUN, skipped entirely.
Owner: Realme Library and Generate long-press/release, tap, Options accessibility
and haptic checks; next separately authorized fullsend. Served FS10 revision,
production/database/applied migrations/Scheduler/provider state, authenticated
visuals, native assistive technology/fontScale/physical behavior are UNVERIFIED
(owner to confirm). Keep historical readiness/hold/acceptance records intact.
No push/deploy/service call/remote SQL/migration/Scheduler/email/environment-file
change/OTA/EAS/native build/install/device action. Vercel CLI remains absent;
strongly recommend npm i -g vercel for separately authorized future env/deploy/log
tooling. Installation NOT RUN.
