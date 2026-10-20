# GV1 generation viewport

**PASS for the finite unattended local code scope.** Implementation `8b37b5ae`;
final serial gates and owner limits below.

## STEP 0 — baseline and finite scope (2026-10-20)

Branch `overnight/2026-10-15_feedback`, HEAD `1d3c5cfc`, includes the reviewed
baseline `202f8c3f` plus completed OP2 implementation `9e17fd4d` and acceptance.
Read the full GV1 unattended prompt, root AGENTS.md, AUTOPILOT.md, current planning
summaries, OP2 acceptance and the owner's BACKLOG OP2/GV1 section. No nested
AGENTS.md or material contradiction found. Preserve untracked UI/,
apps/mobile/.gitignore and supabase/.temp/. Tracking is ahead 2 / behind 5
against the existing github/main ref; no fetch. Owner Pause is preserved.

Only local code, fixtures, verification, documentation and local commits are
authorized. Rollout and Device checks are skipped entirely. No service calls,
environment-file edits, remote SQL/migrations, Scheduler operations or push.
Live/deployed state is UNVERIFIED (owner to confirm). OP2's final body occupies
half its canvas; the full canvas includes its ambient margin and must fit intact.

### Actual overflow causes

- Native `/generation` uses Page's default ScrollView. Page adds 32 bottom
  padding; GenerationScreen adds 40 top / 32 bottom, 24 gaps, a 78-high status,
  300-square core, 270-wide note, 240-wide actions and unbounded titles/notices.
- Page's non-scroll path already supplies flex space after the actual header,
  offline banner, safe-area edges and any footer. The back route has no tabs;
  the header is at least 44 + 18 high. Measure the child rather than subtracting
  presumed status/navigation-bar sizes again. Android safe areas are provided
  by SafeAreaView. Generate's pre-202 admission branch repeats a large core
  below an unbounded material/course header. Selection screens must keep scroll.
- GenerationCore accepts size, but its no-ExpoGL GenerationVisual ignores it
  and stays 300 high. Both render paths must follow the same budget.
- Web detail uses Heading/State inside Shell's main. At <=760, detail routes
  hide the topbar/bottom navigation. Main still adds 24 top / 48 bottom padding;
  generation adds 48 margins, 32 grid gap, orb up to 70vh, full material/steps,
  notes/errors and all actions. Desktop >=1024 has two panes and stays intact.

## Acceptance matrix before edits

| Requirement / states | Owning layer | Proof needed | Initial result |
| --- | --- | --- | --- |
| Safe viewport, intact canvas + ambient; no generation scroll/bounce | Native Page non-scroll and measured generation composition; narrow web dynamic viewport | Actual content/control/canvas bounds, scroll offsets, width and height | PENDING |
| Queued, connecting, preparing, running, finalizing, stalled, failed, completed, cancelled, confirmation, retry and reconnect | Existing clients and local fixtures | State matrix, real progress counts, existing action/admission/polling/cancel/retry tests | PENDING |
| Long material/title/error and actions | Existing native Sheet and web dialog/disclosure | Full text and all actions reachable; close/back/focus; no essential silent truncation | PENDING |
| 360x640, 390x844, 412x915; 640x360 landscape; safe insets; 200% text | Responsive layout and real browser | Exact tested dimensions, computed bounds and inspected screenshots; native calculation/component proof separately labelled | PENDING |
| Orb tap/hold/momentum, reduced motion, focus pause and fallback | Unchanged OP2 renderer/gesture paths, sized canvas/fallback | Interaction/model suites and joint local renderer review; clock/waves/backdrop checks where present | PENDING |
| Queue open/close, material/course scrolling, desktop two panes | Local harness and existing suites | Page isolation plus interaction and desktop regression proof | PENDING |
| Native appearance and physical interaction | Native runtime | UNVERIFIED if no local emulator; Realme is disconnected and Device checks are NOT RUN | PENDING |
| Required gates, docs and scoped commits | Repository | Serial fresh gates, failures retained, explicit staging and diff checks | PENDING |

Evidence uses synthetic local fixtures, loopback-only browser traffic and the
existing Node network guard. TEMP/TMP stay under ignored tmp/overnight/GV1-temp;
Expo is offline and telemetry disabled. No unit result substitutes for native
rendering or physical approval. This finite run ends after GV1.

## Implementation and local evidence

- GenerationScreen opts into `Page scroll={false}`; the existing Page and its
  unrelated screens are unchanged. GenerationLayout measures the post-chrome
  viewport and the natural status/control sizes, then sizes the entire square
  canvas from the remaining flex slot, capped at 340. It never clips overflow
  to hide content. Crowded/short layouts and fontScale >1.3 use the existing
  Sheet for the full action column; ordinary portraits keep actions on-page.
  Short landscapes reduce local padding/gaps to 4; at enlarged text they show
  brief equivalent state labels, with the exact full status retained in details.
- Full titles, status, explanatory text and safe errors are in that bounded
  Sheet with its pinned Done control. The main page announces attention and
  exposes a labelled details/error action. Queue closes details before opening.
  Retryable errors now retain their full safe message as well as the existing
  safe-material/retry hint. GenerationCore forwards size to the no-ExpoGL
  illustration, whose decorative field scales within the same frame.
- GenerateMaterialScreen's pre-admission submitting branch uses the same
  composition with an empty chrome title and the full title in details. It
  explicitly says the server takes over only after acceptance. The scrollable
  course/material picker branches and admission/polling/saved-result handlers
  retain their existing behavior.
- Web changes are local to `.generation-page` at <=760px. `100dvh` and safe-area
  padding bound the page; ResizeObserver fits the whole orb/touch square to its
  remaining slot. Status, real progress counts, Queue and a details/actions
  trigger remain visible. Short landscape places status beside the orb and
  exposes Queue inside details. Desktop keeps the two-pane grid, full stage
  list and original action handlers. Connecting also gets the fitted orb and
  a bounded resource/reconnect surface.
- The web detail pane uses the existing native-dialog pattern: scrolling
  content, pinned Done, Escape/backdrop dismissal and focus return. Resizing
  an open modal beyond the phone breakpoint closes modal inertness. An opaque
  elevated surface prevents underlying status text showing through long errors.
- No shader, gesture classification, palette persistence, render cadence,
  visibility policy, Reduced Motion logic, API, auth, schema or job model changed.
  Relevant ADR-011, ADR-048, ADR-049 and ADR-052 were reviewed; no new architectural
  decision requires an ADR.

### Exact local layout coverage

The committed Vite/Playwright fixtures use actual native Page/Action/Copy/Sheet/
GenerationLayout through RN Web (safe-area and OS fontScale adapters), and the
actual web GenerationScreen/GenerationOrb/shaders/CSS with fictional job reads.
All browser requests outside each loopback origin are aborted. Native GPU output
is explicitly replaced by a sized fixture; this is component/layout proof,
not Android appearance or ExpoGL proof.

- Web: 360x640, 390x844, 412x915, 640x360; each covers connecting, queued,
  preparation, running, finalizing, stalled, failed, completed, cancelled and
  reconnect. Tests assert document/main content bounds, status/control/canvas
  rectangles, square canvas, no wheel-induced page offset, full title/error
  sentinels, last-action reachability, dismissal and returned focus.
- Native components via RN Web: those same four viewports at scale 1, plus
  360x640 and 640x360 at fontScale 2, with 24-point top AND bottom insets.
  Each covers connecting, queued, preparing, running, finalizing, stalled,
  failed, completed, confirmation, reconnect and pre-admission submission.
  Tests assert text/control/core bounds and zero document offset, inspect full
  title/error sentinels, tap actions and open/close the actual Sheet as Queue.
  The final fixture imports real generation labels, includes the 60-point status
  minimum and actual progress bar/caption spacing, and requires the complete
  canvas to remain larger than 48 points in every combination. Routing/auth/job
  readers and animated GL output remain isolated stand-ins; native rendering is
  still UNVERIFIED.
- Web enlarged-text fixtures double computed text sizes/line heights at
  360x640 and 640x360, with synthetic 32 top / 24 bottom padding. These are
  explicit CSS text-scale checks, not a claim about OS browser text zoom.
- Resize proof covers 390x844 -> 640x360 -> 390x680 -> 412x915 -> 1440x900;
  desktop retains two columns and an accessible Cancel action. The web gesture
  test retains five tap impulses, then checks hold rotation, nonzero release
  velocity, unchanged palette during rotation, and zero page scroll.
- Native component tests fit the measured 320x530, 350x734, 372x805 and 600x250
  post-chrome spaces; GL/fallback caller tests cover 80/170/300/340-point
  canvas sizes and proportional ball-only touch bounds. Existing admission,
  reconnect, cancellation, retry, completion/offline-save and picker suites
  remain required in the final gate.

Evidence is ignored under `tmp/overnight/GV1-web/` and `GV1-native/`: screenshots
and JSON bounds. Phone/landscape/200%-text images were inspected. Web images
show the real OP2 body/backdrop; native component images use a clearly synthetic
disc and do not claim native visual parity. No emulator was running; a local
emulator executable alone is not a native runtime. Native rendering/gesture
appearance remains **UNVERIFIED (owner to confirm)**. Realme Device checks are
**NOT RUN**, skipped entirely; no device was connected, installed or awaited.

### Failed first attempts and repairs

- Focused native first run: 128 passed / 1 failed (129, 4 files). The original
  typed-error assertion looked outside the new disclosure. It now opens the
  labelled error surface and asserts the same complete message. Retry: 129/129.
- Focused web first run: 16 passed / 1 failed (17, 2 files). A global no-`Done`
  assertion accidentally included the new dialog's Done button. It now checks
  the stage list, preserving the original stage-label requirement.
- First viewport matrix: 18 passed / 5 failed (23, 2 files). Four cases exposed
  the existing retry hint replacing the full safe error; the fifth found a
  45px orb under doubled text in landscape. Retained full errors and used the
  short-height side-by-side layout, keeping the >48px assertion. Retry: 9/9
  browser cases, including all 40 state/viewports and both text-scale cases.
- Native browser harness first run was interrupted without completed counts
  while investigating missing content. Diagnostic run: 2 failed / 4 excluded;
  JSX development runtime was being combined with a production React bundle.
  Explicit production JSX resolved it. Next full native layout run: 7 passed /
  4 failed (11): three Queue transitions and one circular React-element JSON
  assertion. The unit test now reads real text children. Queue diagnostics
  retained the failure (2 failed / 4 excluded); page errors then identified
  RN Web Animated's missing browser `global` alias. Adding the standard harness
  alias fixed it, without a product transition change. Retry: 48/48 across
  five native files, including six browser cases / 66 fixture combinations.
  The intermediate retry after the circular assertion repair was 8 passed /
  3 failed (11); both subsequent targeted Queue diagnostics were 2 failed /
  4 excluded (6). Their timeout/page-error logs remain under GV1-native-*.
- Extended web run: 24 passed / 1 failed (25, 2 files); new instrumentation read
  `waves` instead of the model's actual `impulses`. Corrected that QA-only read.
  Retry: 11/11 browser cases. Fixture encoding was corrected to ASCII before
  final gates; an early screenshot containing replacement characters is
  superseded by the final captures.

The first full serial gate pass was green (typecheck/lint/build 8/8 each,
0 cached; shared 670/68, mobile 1599/169, web 540/72, diff exit 0). However,
the final native audit found that the initial synthetic status/progress fixture
was too simple: the connecting canvas at 640x360/fontScale 2 could be only 7
points. The final fixture now uses actual generation labels and progress spacing,
and a >48-point canvas assertion, rather than just proving positive bounds.
Short-layout spacing and concise enlarged-text state labels repair the product;
full status stays in details. Strengthened focused native retry: **39/39 across
3 files**, including all 66 browser fixture combinations. The entire serial
gate sequence is restarted on this final source. Earlier gate results are
retained as `GV1-pre-audit-*` and are not reused as final-source evidence.

The audit also repaired the old automatic-start waiting copy: while no accepted
job id exists it now says the server takes over after acceptance, matching the
pre-admission material route. A new regression waits on the actual mocked
acceptance Promise, verifies that no background-work promise appears early,
then verifies the accepted copy without duplicate submission. The interim gate
runner had passed typecheck/lint 8/8 each and was deliberately stopped during
Expo export to freeze this final source; its incomplete results are retained
as `GV1-interim-*`. No failing gate was hidden. A new complete serial run is
the final authority below.

Selected measured canvas ranges from the strengthened native component matrix
(logical points, entire canvas including ambient margin):

| Viewport / fontScale | Cases | Smallest / largest canvas | Page overflow / scroll offset |
| --- | --- | --- | --- |
| 360x640 / 1 | 11 | 209 / 248 | 0 / 0 |
| 390x844 / 1 | 11 | 340 / 340 | 0 / 0 |
| 412x915 / 1 | 11 | 340 / 340 | 0 / 0 |
| 640x360 / 1 | 11 | 83 / 122 | 0 / 0 |
| 360x640 / 2 | 11 | 148 / 320 | 0 / 0 |
| 640x360 / 2 | 11 | 64 / 119 | 0 / 0 |

Web's ten states per viewport retain 320px canvas at 360x640, 340px at
390x844/412x915 and 172-232px at 640x360, with zero overflow/offset. The separate
doubled-text/synthetic-inset cases also retain the >48px minimum and full action
reachability. These measurements do not claim real native GPU bounds.
Final strengthened native portrait/landscape screenshots were inspected again.

`GV1-business-boundary-proof.json` compares Prettier-normalized native component
logic before its JSX return with baseline `1d3c5cfc`: admission, polling, cancellation,
retry and saved-result code is exactly unchanged. The waiting-copy correction
is confined to JSX; its new Promise-based acceptance regression is required in
the final mobile suite.

Final serial gate results and owner handoff follow below.

## Final-source closure

Implementation: `8b37b5ae`. Final code was frozen before this complete serial
run; no pre-audit/interrupted result substitutes for it. All results are FRESH
unless explicitly labelled otherwise. Repository-local TEMP/TMP, the loopback
Node guard, browser route blocking, Expo offline and disabled telemetry remain.

| Required gate | Exact final result | Evidence under tmp/overnight/ |
| --- | --- | --- |
| `npm run typecheck -- --force` | PASS 8/8 tasks, 0 cached; 30.208s wall | GV1-gate-typecheck.log |
| `npm run lint -- --force` | PASS 8/8, 0 cached; 0 errors / 6 existing warnings; 38.129s wall | GV1-gate-lint.log |
| `npm run build -- --force --concurrency=1` | PASS 8/8, 0 cached; 3m54.124s Turbo / 235.824s wall | GV1-gate-build.log |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | PASS 670/670, 68 files; 335 source + 335 compiled cases | GV1-gate-shared.log |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | PASS 1600/1600, 169 files; includes pre-202 acceptance regression and strengthened native browser matrix | GV1-gate-mobile.log |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | PASS 540/540, 72 files; includes GV1 11, glass 14 and ambient 12 browser cases | GV1-gate-web.log |
| Relevant API tests | NOT APPLICABLE: client layout/safe display copy only; no API route, request semantics, schema/auth or server model changed | Owned source diff and unchanged business-boundary proof |
| `npm run build --workspace @stay-focused/api` | PASS equivalent FRESH final root task, 37/37 generated pages; separate invocation NOT RUN | GV1-gate-build.log |
| `npm run build --workspace @stay-focused/web` | PASS equivalent FRESH final root task, 23/23 generated pages; separate invocation NOT RUN | GV1-gate-build.log |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS equivalent FRESH final root Android export (also iOS/web); separate invocation NOT RUN | GV1-gate-build.log, GV1-android-export-proof.json |
| `git diff --check` | PASS exit 0; repeated after generated-declaration restoration and docs | GV1-gate-diff.log, GV1-final-diff.log |
| `git diff --cached --check` | PASS exit 0 for explicit code and documentation stages | GV1-cached-code.log, GV1-cached-docs.log |

The prompt explicitly permits matching final-source forced builds to supply
duplicate workspace gates. The final Android HBC is 10,925,269 bytes,
SHA-256 `ad51a6d00df73c2466bfc02356f992733b81afc6e0fa32cd34e48374933a2de1`. Its seven viewport/disclosure/acceptance/OP2 markers
are true. Both generated Next ambient declarations were inspected and restored
to the repository originals; no generated validation output is committed.
No assertion threshold, validation config or package version was weakened.

Final joint OP2 review: the unchanged full suite passes the GPU glass and
RGBA-backed ambient checks. Fresh Today light idle/dark drag clock and Generation
light/dark body/backdrop captures under OP2-clock/ and OP2-after/ were inspected
during the GV1 run. GV1's real generation-page fixture retains five impulses,
hold rotation/release velocity, palette semantics and zero page offset. Existing
shared and both platform lifecycle/Reduced Motion/fallback suites remain green.
These are local software-Chromium/component observations, not Android GPU or
physical acceptance. No new performance or battery claim is made.

| Final acceptance row | Verdict |
| --- | --- |
| Native non-scroll composition, complete canvas and reachable controls | PASS local component/layout proof; native rendering UNVERIFIED |
| All named states, full title/error disclosure, admission/cancel/retry/reconnect/saved work | PASS local fixture and real client-handler suites |
| Four requested viewports, safe insets, short landscape and enlarged text | PASS exact bounds/zero-offset assertions; 66 native + 40 web state/viewports, plus web text/resize cases |
| Orb tap/hold/momentum, Reduced Motion, fallback and focus/background behavior | PASS local model/component/browser suites; physical feel UNVERIFIED |
| Queue opening/closing, picker scrolling and desktop panes | PASS local interaction suites, source isolation and browser desktop accessible-action check |
| Gates, docs and scoped local commits | PASS; code `8b37b5ae`, this documentation follow-up; exact hashes in GV1.status/Git |

## Owner steps remaining

Status: **PASS locally**. Documentation commit: `docs(generation): close GV1 local acceptance and gates`
(the commit records itself; exact hash is in GV1.status/Git). Review the code
commit and local evidence. Native rendering/appearance, actual Android gesture
feel, safe-area/navigation behavior, performance and OS accessibility text remain
**UNVERIFIED (owner to confirm)**. Realme is disconnected. Device checks: **NOT
RUN**, skipped entirely; reconnect and validate only as an owner step.
Rollout: **NOT RUN**, skipped entirely. Live/deployed state: **UNVERIFIED (owner
to confirm)**; any publication requires a separate owner instruction. No service
call, remote SQL/migration, Scheduler operation, environment-file edit or push
occurred. Preserve Owner Pause and the original UI/, apps/mobile/.gitignore and
supabase/.temp/ paths. This run stops at GV1; no OA2, parity backlog, FULLSEND or
release continuation.
