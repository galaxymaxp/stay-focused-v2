# Product Recovery Phase R5 — Canvas Source Selection and Reviewer UX Recovery

Date: 2026-07-15, Asia/Manila.

## 1. Starting state

- Branch: `main`.
- Starting commit: `04a0be02d5c7618adab901298c8e0dc6c7f25f80`
  (`feat(canvas): resolve reviewer-usable course content`).
- Ahead/behind: `0/0` against `origin/main`.
- The expected R4 commit was present at `HEAD`.
- Known unrelated dirty paths were `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`, and `.vscode/`.
  They were excluded from R5 staging and preserved byte-for-byte.
- The V1.2 design-system archive was not attached, but the complete extracted
  reference was available under `design/` and was used directly.
- V1 was inspected read-only at
  `d26decf3f82d61f2e8dd6ba2444c6c156473163a` on clean `main`.

## 2. Existing journey and reproduced defects

The pre-R5 mobile journey exposed the multi-source implementation model:

```text
Courses
-> secondary Create reviewer from Canvas action
-> select up to eight source rows
-> structure sources
-> choose individual blocks
-> preview selected blocks
-> generate
-> save
```

That flow preserved strong provenance, but it made common single-source reviewer
creation feel like an operator console. The following defects were reproduced
from the starting code before the R5 implementation was completed:

| Journey area | Previous behavior | Defect or gap | Evidence |
| --- | --- | --- | --- |
| Course entry | Grades was the primary course action; Canvas reviewer was secondary and verbose | The study action was visually subordinate | Starting `CoursesScreen.tsx` action order and variants |
| Source discovery | Sources were ordered by availability, type, then title | Canvas module and item order was lost | Starting `compareSources` implementation |
| Capability display | Availability and file preparation strings carried multiple meanings | No typed student-facing `ready`, `empty`, `needs preparation`, `unsupported`, `inaccessible`, or `failed` presentation contract | Starting descriptor and mobile formatter |
| Selection | Up to eight sources and hundreds of blocks could be selected | The common task required interpreting source structure and duplicate diagnostics | Starting source/block selector screen |
| Preparation | File preparation was inline with the dense source list | Progress was not consistently announced and the next action competed with other controls | Starting source-row actions |
| Resolution | Preview creation followed structure and block-selection stages | A student could not simply select one source and check it | Starting stage branches |
| Preview | Exact text was editable, but source/title/block controls shared one large workflow | Visual hierarchy and back/change behavior were overloaded | Starting preview and block selector |
| Generation | Server gates were authoritative | Mobile action hierarchy still exposed implementation prerequisites | Starting generation screen copy |
| Success and save | Reviewer and save existed | Save readiness and destructive source changes were not expressed as one calm final stage | Starting generated-result branch |
| Errors | Safe error mapping existed | Retry and unavailable states were not consistently coupled to a typed capability action | Starting error and descriptor mapping |
| Stale state | R4 reducer protected preview identity | R5 still needed complete generation/save single-flight and destructive-navigation handling | Reducer and screen audit |
| Pagination | The API returned bounded pages | The mobile screen had no path to sources after the first page | Starting mobile list request ignored `pagination.hasMore` |
| Accessibility | Most shared controls met 44px | File/check/save/load-more progress and row explanations were not consistently announced | Starting loading branches and accessibility props |
| Visual hierarchy | Existing mobile tokens were dark and the screen used many equivalent cards/actions | It did not match the supplied parchment/gold R5 reference or provide one primary action per stage | Starting design tokens and screen layout |

## 3. V1 recovery decisions

| V1 behavior | Decision | Reason |
| --- | --- | --- |
| Keep readiness, status, and action close to a source row | Adapt | This makes selection understandable without copying the V1 web component |
| Use a direct `choose material -> prepare if needed -> create reviewer` journey | Recover | It is the strongest student-facing behavior in V1 |
| Show a clear action for ready or repairable material | Recover | It keeps the next step obvious |
| Follow broad URLs, scrape external pages, or forward Canvas authorization | Reject | V2 host, redirect, credential, and synchronized-row boundaries must remain |
| Combine direct text with partial or failed attachments | Reject | R3 exact completeness and R4 one-terminal-state guarantees remain mandatory |
| Insert filenames, module labels, attachment labels, or page markers into source text | Reject | Labels are provenance only and must never become reviewer input |
| Store or use Canvas credentials in the client | Reject | V2 encrypted server-side per-user credentials remain authoritative |
| Copy V1 glass content cards, deep accordions, or web-only CSS | Reject | R5 uses flat React Native content surfaces and reserves glass principles for chrome |

## 4. Final R5 flow

```text
Courses
-> primary Create reviewer action on a selected synchronized course
-> course context and synchronized source inventory
-> authoritative module/item grouping with conservative ungrouped fallback
-> select one ready or preparable source
-> prepare a file when required
-> explicitly check the source
-> edit the exact resolved instructional text
-> create reviewer through the existing protected route
-> review generated output
-> save the existing immutable source snapshot to Study Library
-> clear or confirm before changing source/course with unsaved work
```

The screen has three visible stages: choose source, check/edit source, and
reviewer ready/save. The old structured-block path remains implemented on the
server for provenance-compatible callers, but it is no longer forced into the
common single-source mobile journey.

## 5. Source-selection and ordering model

The API now returns a safe course name, typed capability, and placement for
each descriptor. Placement is derived only from owned, synchronized
`canvas_modules` and `canvas_module_items`. A Page, Assignment, or File is
placed under a module only when the synchronized relationship is provable.
Announcements and unproven resources remain in `Other course content`.

Ordering is deterministic:

1. Proven module sources before ungrouped sources.
2. Module position.
3. Stable module title fallback.
4. Module item position.
5. Stable source type, title, and opaque descriptor identity fallback.

The mobile client can request later bounded pages and merges them only when
course identity, totals, offset continuity, and duplicate-free identities all
match. A changed or discontinuous inventory reloads from the authoritative
first page instead of mixing snapshots.

| Source state/type | Selectable | Student-facing behavior | Provider calls before generation |
| --- | ---: | --- | ---: |
| Ready Page | Yes | `Ready to review`; explicit `Check source` | 0 Canvas, 0 OCR, 0 reviewer |
| Ready Assignment description | Yes | Same direct check flow | 0 Canvas, 0 OCR, 0 reviewer |
| Ready Announcement | Yes | Same direct check flow | 0 Canvas, 0 OCR, 0 reviewer |
| Ready stored Image/PDF | Yes | Reads complete protected extraction during check | 0 Canvas, at most 1 OCR, 0 reviewer |
| Needs preparation | Yes | `Prepare file`, then inventory reload | Bounded selected-file Canvas preparation only |
| Failed preparation | Yes | Safe `Try preparation again` action | Bounded selected-file retry only |
| Empty | No | `No study text found` | 0 reviewer |
| Unsupported | No | `Not supported yet` | 0 reviewer |
| Inaccessible | No | Opaque `Unavailable` | 0 reviewer |
| Resolution failed | Retry check | Safe, specific recovery copy | 0 reviewer until a current usable preview exists |

## 6. Complete state and stale-safety model

| Event | Immediate invalidation |
| --- | --- |
| Course change | Inventory request, selection, preview, session, fingerprint, reviewer, snapshot, save and errors |
| Source change | Preparation/preview requests, resolved text, preview identity, reviewer, snapshot and save |
| Preparation/retry | Old resolution token, preview, reviewer and previous error |
| Preview retry | Old request token and all dependent output |
| Preview edit | Generated reviewer, snapshot, save state and generation request |
| Fingerprint/session/source-set mismatch | Generation disabled locally and rejected server-side |
| Sign-out/session loss | Screen teardown or authenticated reload clears all Canvas reviewer state |
| Back navigation | In-flight requests abort; meaningful edits or unsaved reviewer prompt before discard |
| Screen teardown | Every request token increments, every abort controller fires, and late responses are ignored |

Late preparation, preview, generation, inventory-page, and save responses may
update UI only while their request token and complete active binding remain
current. Preparation, preview, generation, and save each use a single-flight
lock. A generated reviewer can save only while its selection key, resolution
fingerprint, exact trimmed edited text, preview identity, and source snapshot
remain current.

## 7. UX and design-system implementation

- Passed the course display name into the reviewer screen without using it as
  source text.
- Promoted `Create reviewer` above Grades for ready selected courses.
- Replaced technical multi-source/block selection with a staged single-source
  flow and one primary action per stage.
- Applied the exact gold `#d7aa38` and parchment `#f6f4ef` foundation, warm flat
  surfaces, warm borders, restrained shadows, and sentence-case actions.
- Used Lucide outline icons; no emoji or generic blue primary action was added.
- Kept cards, alerts, editor, and reviewer content flat. No blur was added.
- Kept source title/type separate from the editable exact source text.
- Added honest live progress for inventory, later pages, file preparation,
  checking, generation, and saving without fake percentages.
- Added clear saved state and direct Study Library handoff.

The Expo Web bundle compiled and served. The normal in-app interactive browser
backend was unavailable during the final run, so no unobserved screenshot or
manual visual claim is made. The PDF web smoke did observe the rendered Expo
flow through reviewer success, and automated type/lint/build/accessibility
contracts passed. Physical-device visual and Dynamic Type acceptance belongs
to R6.

## 8. Accessibility result

| Check | Result | Notes |
| --- | --- | --- |
| Icon-only controls labeled | Passed | Back button has an explicit accessibility label |
| Source status not color-only | Passed | Text label plus Lucide status icon |
| Selected state announced | Passed | Radio role with checked/selected state |
| Disabled prerequisite visible | Passed | Next-step, empty-preview, snapshot, and item-state copy remain visible |
| Loading states announced | Passed in code | Polite live regions cover inventory, pagination, preparation, checking, generation, save and success |
| Reading order | Passed in structure | Header, error, current stage, then secondary actions |
| Minimum touch size | Passed | Shared minimum is 44px; rows are at least 72px |
| Larger text resilience | Passed in layout | Rows/cards use minimum rather than fixed content heights; editor is multiline |
| Hover independence | Passed | All actions use Pressable/Button behavior |
| Reduced motion | Passed | No timed or decorative animation; only immediate press feedback |
| Interactive browser observation | Unavailable | Browser backend exposed no usable browser; deferred to R6 device acceptance |

## 9. Deterministic regression coverage

R5 tests cover:

- module/item and ungrouped fallback ordering;
- safe capability labels and opaque inaccessible copy;
- disabled empty/unsupported sources and retryable failed preparation;
- safe descriptor serialization without bodies, storage keys, hashes, URLs, or
  raw Canvas fields;
- continuous duplicate-free inventory pagination;
- selection change, stale response, retry token, course/mode/sign-out/teardown
  clearing;
- exact preview binding and fingerprint requirements;
- editing invalidation, empty preview blocking, and single-flight generation/save;
- Page/Assignment/Announcement and stored Image/PDF R4 resolution;
- complete/incomplete OCR, no metadata padding, no artificial page labels;
- invalid/expired/stale preview zero-provider generation gates;
- Canvas snapshot-required save and non-Canvas save compatibility.

Final relevant totals were Canvas 69/69, OCR 25/25, engine 287/287, API
428/428, and mobile 154/154.

## 10. Protected validation and performance

`npm run validate:canvas:r5` passed with aggregate-only output:

| Safe label | Scenario | Resolution | Reviewer calls | Result |
| --- | --- | --- | ---: | --- |
| `course-sample-1` | Selected synchronized course inventory | `inventory_ready` | 0 | Passed |
| `usable-source-1` | Page, whitespace-only preview edit, generate, save, owner cleanup | `usable` | 1 | Passed |
| `file-source-1` | Existing stored Image or complete PDF | `usable` | 0 | Passed |
| `unsupported-source-1` | Unsupported module item | `unsupported` | 0 | Passed |
| `controlled-inaccessible` | Opaque inaccessible source | `inaccessible` | 0 | Passed |
| `controlled-stale` | Selection changed before generation | `stale` | 0 | Passed |

Measured evidence:

- Protected HTTP calls: 10.
- Source inventory: 8,734 ms.
- Ordinary synchronized text resolution: 5,450 ms.
- Stored-file resolution: 5,362 ms.
- Reviewer generation: 8,320 ms.
- Canvas remote calls during inventory and resolution: 0.
- File preparation: not needed; remote preparation calls 0.
- OCR calls for the selected stored file: 1.
- Reviewer calls for all non-usable/stale scenarios: 0.
- Duplicate request attempt count: 1 accepted request.
- Route limits: inventory/resolution 60,000 ms; reviewer 120,000 ms. No route
  approached its execution limit.

R3 and R4 protected validation also passed after R5. The R4 Page reviewer took
39,580 ms in that independent run and still remained within the 120-second
reviewer boundary. The PDF web smoke passed with mocked OCR and the real
reviewer route, returning two sections and four visible key points.

## 11. Automated verification

| Command | Result | Notes |
| --- | --- | --- |
| Canvas typecheck/build/test | Passed | 69/69 |
| OCR typecheck/build/test | Passed | 25/25 |
| Engine typecheck/build/eval | Passed | 287/287 |
| API typecheck/lint/test/build | Passed | 428/428 and production build |
| Mobile typecheck/lint/test | Passed | 154/154 |
| Root typecheck/lint | Passed | 7/7 tasks each |
| Workspace tests | Passed | All workspaces with test scripts |
| Reviewer web-smoke tests | Passed | 51/51 |
| PDF web smoke | Passed | Authenticated rendered flow; mocked OCR, real reviewer |
| `validate:ocr:r3` | Passed | Exact complete/incomplete page evidence |
| `validate:canvas:r4` | Passed | Live Page/Image plus zero-call gates |
| `validate:canvas:r5` | Passed | Full R5 journey and aggregate timings |
| R5 harness standalone TypeScript | Passed | NodeNext strict check |
| `git diff --check` | Passed | Line-ending warnings only |

An intermediate API lint/build run found the Next.js reserved local identifier
`module`; it was renamed to `moduleRow`, after which API lint and production
build passed.

## 12. Files changed

### Mobile

- Navigation/course action hierarchy and course-name handoff.
- Parchment/gold tokens and matching status-bar treatment.
- Recovered Canvas source reviewer staged screen.
- Pure resolution, presentation, pagination, and single-flight state helpers.
- Strict Canvas API response/pagination parsing.
- Lucide React Native dependencies.

### API

- Safe course name, capability, and placement descriptor contract.
- Module/item placement analysis and stable source ordering.
- Source route contract coverage.

### Tests and validation

- API source ordering/capability/route tests.
- Mobile presentation, pagination, stale-state, duplicate-generation and
  duplicate-save tests.
- Aggregate-only `scripts/r5-canvas-protected-validation.ts` and root command.

### Documentation

- This focused R5 report.
- Current state, roadmap, sprint, and handoff current sections.

### Database or migrations

- None. Existing synchronized tables, preview sessions, source snapshots,
  ownership filters, and RLS are sufficient.

### Canvas/OCR/engine/shared

- No production changes. R1-R4 boundaries were preserved and revalidated.

## 13. Security and privacy result

- Auth remains bearer-token and owner scoped.
- Service reads remain filtered by user, connection, selected course, and row.
- Course/source titles are display/provenance only and never appended to source
  text.
- Non-usable results contain no source text or resolution fingerprint.
- The R5 harness prints only safe labels, counts, durations, terminal states,
  and call totals.
- The harness did not print names, titles, source/OCR text, reviewer content,
  URLs, IDs, hashes, credentials, or signed/storage paths.
- The validation reviewer was deleted through the existing authenticated owner
  route.
- No migration, grant, RLS, view, function, Storage, or service-role policy
  change was required.

## 14. Git result

- Intended commit subject: `feat(canvas): recover source selection reviewer UX`.
- R5 paths only are included; the four known unrelated paths remain unstaged.
- Exact commit, push, ahead/behind, and final dirty-state evidence are reported
  in the completion response because a commit cannot safely contain its own
  final hash.

## 15. Deferred scope

- Physical iPhone/Expo Go product acceptance, Dynamic Type observation, and
  VoiceOver/TalkBack walkthrough (R6).
- Account-wide background synchronization, polling, queues, cron, and
  notifications.
- Canvas OAuth and institution-wide deployment authorization.
- OCR above the existing synchronous five-page policy or new OCR providers.
- Office/spreadsheet parsing and audio/video transcription.
- Discussions, quizzes, external URLs/tools, submissions, and grading content
  as reviewer sources.
- Cross-course bundles, automatic regeneration, fuzzy duplicate matching, a
  new generation engine, and a second reviewer API.
- Schedule or unrelated Study Library redesign.

## 16. Verdict

```text
PRODUCT RECOVERY PHASE R5 COMPLETE — Canvas source-selection and reviewer UX recovered
```

Recommended next phase: Product Recovery Phase R6 — real-device product
acceptance on iPhone/Expo Go, including the complete Canvas flow, accessibility,
Dynamic Type, destructive-navigation prompts, slow-network states, and save
handoff.
