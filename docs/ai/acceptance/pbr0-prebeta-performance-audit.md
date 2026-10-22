# PBR0: website and Android pre-beta performance baseline

Date: 2026-10-22. Scope: **audit only**, STEP 0–4, offline local gates,
documentation and local commits. Final verdict and exact gate results appear
below. This is not external-tester, production or physical-device acceptance.
No application, dependency, configuration, migration or feature change is made.
PBR1–PBR5 are conditional proposals requiring supervisor review; PBR6 is owner-only.

## Evidence contract and fingerprints

**MEASURED** means a fresh local observation during PBR0. **SOURCE-INFERRED**
means control flow or a potential cost established in this checkout, without a
runtime latency claim. **OWNER-TO-VERIFY** means live release/device/network
evidence is absent. Historical release measurements are explicitly attributed.
Gate labels are FRESH, CACHED, NOT RUN, BLOCKED or NOT APPLICABLE.

| Boundary | Exact identity and evidence |
| --- | --- |
| Repository | `C:\Users\Fely Max Dilinila\Documents\Projects\b25-3-3-work`, private Stay Focused **V2** npm monorepo |
| Inspected source | `overnight/2026-10-15_feedback`, `245380ea131ed14c5b3abb2d00a7aec6d88c828e`; clean tracked tree before work |
| Local upstream snapshot | `github/main`, 23 behind / 0 ahead at inspection; no fetch, switch, merge or remote query. This is local-ref ancestry, not current remote state. |
| Owner files | Untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved and excluded; ignored historical `tmp/` evidence also preserved |
| Source build configuration | `apps/mobile/app.json:6`: version 2.2.0, root/Android runtime `2.2.0-sdk57`, code 6. Installed source packages: Expo 57.0.30, Router 57.0.28, Sharing 57.0.23, RN 0.86.3; Node 24.16.0/npm 11.13.0 locally. These are not the shipped binary's dependency versions. |
| Binary release | Git report `28174c76:docs/ai/acceptance/fullsend-20261021-2245.md`, Mobile section: EAS build `a26aa1fe-623e-49e5-95fb-0c2caa1f86ea` from `e62e31ce0c3c636107d4d221d3040cb955f82020`, 2.3.0/code 7/runtime `2.3.0-sdk57`. Release merge retained native patch/version/toolchain repairs that are intentionally absent from this source branch. |
| Fresh local APK | `tmp/overnight/OX1-device/installed-release.apk`: **132,024,227 bytes**, SHA256 `0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`. Exact match with the FS5 report; `aapt dump badging` freshly confirms package `com.galaxymaxp.stayfocusedv2`, version 2.3.0/code 7, min SDK 24, target SDK 36, four ABIs; no application-debuggable flag. Signature verification is historical, not rerun. |
| FS7 OTA/website | Git report `c9cb867d:docs/ai/acceptance/fullsend-20261022-1512.md`: application `83f9474603ed45488c75d7028dad170f79374263`, API `dpl_F16grTGjt5Be1pV3HhzHpSDGrYoo`, website `dpl_292JfCBzE1J4F21wqXUaJ5ziwQ3v`; OTA group `bc0231d4-8b5c-4ded-bbb8-0c543e5e9970`, update `01a162a3-6a63-7318-9a64-4b40789569a1`, runtime 2.3.0-sdk57. Historical bounded Realme result **5 PASS / 1 FAIL**. |
| Newer recorded release | `c0569007:docs/ai/acceptance/fullsend-20261022-1719.md`: source pin is this audit's `245380ea`; merged application `acf948187f8d9a77ace569df433bbdecd445993c`; website `dpl_Bt6ivQjFbkva3MykeVznrq6fegmJ`, API recorded READY at acf9481, OTA group `5c027739-bb01-4532-8108-12c1f46a8ac4`, update `01a16304-432c-703e-838e-c4ea04e4b3d9`. Same 2.3.0 binary/runtime; no newer APK. The report records Appearance round trips restoring the live GL surface. |
| Live state | Current deployments, installed/active OTA, database rows/applied migrations, regions, queue capacity, Scheduler and provider state: **UNVERIFIED (owner to confirm)**. No service contacted. |

The reported **117 MB** remains **UNVERIFIED** as to artifact, units and build.
The exact local release above is 132.024227 decimal MB / approximately 125.908
MiB. It is a binary baseline, not the size of newer OTA JavaScript, installed
disk usage, an AAB download estimate, or a current-device read. Do not combine
V1, source checkout, FS5 embedded JS, FS7 OTA and the newer OTA into one build.
The documented separate release clone explains the version mismatch; there is
no source contradiction requiring PBR0 to stop.

Read before conclusions: root AGENTS/AUTOPILOT, current planning checkpoints,
historical handoff, SP0/SP1/SP2/SP2b, 20261018 parity audit and later WA1/WX1
source, Android release/device runbooks, ADR-011/022/031/032/051, and release
reports in local Git. Historical missing features are rechecked against source.

## Screen and workflow inventory

These route groups enumerate the implemented screens, not a claim that every
screen was exercised with an authenticated session. Layout-only files are
containers; source listings and the production route table are the inventory.

| Workflow | Mobile routes under `apps/mobile/app` | Website routes under `apps/web/app` |
| --- | --- | --- |
| Entry/auth/legal | `index`, `(auth)/sign-in`, `(auth)/sign-up`, `auth/callback`, `privacy`, `terms` | `/`, `/sign-in`, `/sign-up`, `/auth/callback`, `/auth/reset`, `/privacy`, `/terms`, not-found/error boundaries |
| Today/planning | `(app)/(tabs)/today`, `(app)/study-session` | `/today`, `/schedule`, `/schedule/session/[id]` |
| Courses/materials | `(app)/(tabs)/courses/index`, `courses/[courseId]/index`, `material`, `reviewer`, `grades` | `/generate`, `/generate/[courseId]`, `/generate/[courseId]/[id]` |
| Generate/processing/Queue | `(app)/generate`, `generation`, `generation-queue`, `processing` | `/generate/new`, `/generation/[id]`, `/queue` |
| Library/read/edit | `(app)/(tabs)/library/index`, `library/[courseKey]`, `(app)/artifact`, `activity` | `/library`, `/library/course/[courseKey]`, `/library/[id]` |
| Quiz | `(app)/quiz` | `/quiz/[id]`; shared-recipient included quiz inside `/s/[token]` |
| Tasks/grades | `(app)/(tabs)/work/index`, `work/[courseKey]`, `work/[courseKey]/grades`, `(app)/task`, `personal-tasks` | `/tasks`, `/tasks/[id]`, `/canvas/[courseId]/grades`, `/canvas/[courseId]/grades/[assignmentId]` |
| Canvas/account/settings | `(app)/canvas-settings`, `settings`, `appearance` | `/canvas`, `/settings` |
| Announcements | `(app)/announcements`, `announcement` | `/announcements`, `/announcements/[id]` |
| Distribution/share | Native share creation and app-update Settings/Today UI; recipient uses website | `/download`, `/release`, `/s/[token]` |
| Diagnostic | `generation-core-lab` | No equivalent public product route |

Mobile Today includes calendar/planning, not a standalone weekly Schedule.
Website offline study mode remains excluded by design. Both retain reviewer,
quiz, draft/task, source visual, export, Canvas and account workflows. Website
password reset now exists (`apps/web/src/features/password-reset-screen.tsx:1`), and
website PDF/DOCX/PPTX support exists in `study-export.ts:11`; do not repeat the
older parity audit's already-closed WA1/WX1 gaps. Other held parity work, including
exact Canvas block selection, quiz flags, saved-Quiz reuse and native shared
recipient/Schedule differences, is not silently scheduled by this audit.

### Optimizations already present — retain and test

| Layer | Source proof at inspected HEAD | Existing behavior |
| --- | --- | --- |
| Shared contracts | `packages/shared/src/job-status-reader.ts:4`; saved snapshot/merge contracts | One owned in-flight job read; snapshot identity/version and stable merge support. Shared is a runtime package, not just types. |
| Saved-first screens | `apps/web/src/lib/hooks.ts:33,99`; mobile `useExperience.ts:62,114` | IndexedDB/SQLite hydration before unresolved remote response; saved content survives failed refresh; owner/path/date keys, abort/epoch fences, explicit refresh status. No React Query/SWR migration is needed. |
| Library pages | `apps/web/src/lib/use-saved-library.ts:8` | First accepted page publishes immediately; maximum 20 pages, duplicate IDs merge, nonadvancing cursors fail; persist only complete walk, retain saved rows during partial failure. |
| Exact reviewer reads | `apps/api/src/lib/experience/repository.ts:100,127` | Summary-only filtered page; exact owned current version body for detail. Material badge projections batch IDs in 100s (`:143`); no full reviewer body scan on the production list path. |
| Today | `apps/api/src/lib/experience/service.ts:165`; `app/api/today/route.ts:6` | One combined HTTP response; fixed-time request-local promise map shares table reads; independent summaries fetched together. Bearer verification is still per request. |
| Queue | web `features/queue-items.ts:70,107`; mobile `app-shell/AppActivityProvider.tsx:10` and `features/queue/useQueueItems.ts` | Header, Queue and active detail share one provider/reader. Adaptive 3 s detail / 5 s active list / 30 s idle; visibility/AppState handling. No blanket additional poller proposed. |
| Offline Library | mobile `localLibrary/localArtifactDatabase.ts:12`, `offlineCatchUp.ts:19,86`, `librarySync.ts:26,92` | Lazy SQLite/WAL; owner-scoped single flight, ten-minute successful throttle; unchanged bodies skipped; 300-attempt/60 s catch-up bound, serial small groups and event-loop yield. Exact not-found can remove a copy; list absence cannot. |
| Canvas | `packages/canvas/src/client.ts:663,922`; `canvas-sync-jobs/checkpoints.ts:26`; `finalize.ts:249` | Complete validated pagination; repeated/unsafe cursor rejection; Retry-After and durable leases; content concurrency 3/grades 2; terminal state persisted before preparation admission. Partial evidence remains distinct from deletion. |
| Web visual splitting | `day-clock/preloadDayOrb.ts:6`, `DeferredDayOrb.tsx:16`; `features/queue.tsx:28` | Three renderer is dynamic, atlas and chunk start independently; Queue heavy visual deferred. Current preload starts before data readiness, so SP2b's historical two-frame deferral description is not current behavior. |
| Native orb | `features/redesign/DayOrb.tsx:29,36,99,161` | 80 ms idle frame interval, 0.6 render scale, memoized component, background/focus/touch gating, Reduced Motion and surface-replacement recovery. 60 fps target applies to input/navigation when feasible; do not indiscriminately raise orb idle FPS. |
| Exports | web `features/study-export.ts:6,13`; shared `study-export/index.ts:25`; mobile `features/export/studyExport.ts:17` | Web export code dynamically imported on demand, bytes generated from saved content without provider calls. Native file APIs loaded on demand. All formats stay available. |
| Auth/errors | API `auth.ts:4,20`; `experience/read-http.ts:8,25`; repository `:45` | Server getUser verifies bearer; trusted repository binds owner; private/no-store responses and safe error normalization. Service-role credentials remain server-only. |

## Reproducible measurements

Only existing installed tooling was used. No install/update, live provider,
remote database, production URL, EAS, deployment or device command ran.
Local helpers and raw output are ignored `tmp/overnight/PBR0-*` files.

### APK archive and assets — MEASURED, FRESH

Read-only commands: PowerShell `Get-Item`, `Get-FileHash -Algorithm SHA256`,
`[System.IO.Compression.ZipFile]::OpenRead(...)` and each entry's `Length` /
`CompressedLength`; installed SDK `aapt.exe dump badging <local.apk>`. ZIP sizes
below are actual compressed entry bytes; they exclude ZIP headers/alignment,
signing blocks and central-directory overhead. No repack or rebuilt APK exists.

| Contributor | Compressed bytes in exact APK | Uncompressed bytes |
| --- | ---: | ---: |
| Native libraries, 108 entries | 93,639,812 | 93,639,812 |
| Six DEX files combined | 21,313,504 | 58,578,744 |
| `assets/`, six entries | 8,793,910 | 8,804,526 |
| Embedded `assets/index.android.bundle` (subset of assets) | 8,777,020 | 8,777,020 |
| Android `res/`, 1,347 entries | 3,485,909 | 4,987,435 |
| `resources.arsc` | 2,288,268 | 2,288,268 |

Native bytes by ABI: arm64-v8a **24,860,944**, armeabi-v7a **17,151,772**,
x86 **26,109,856**, x86_64 **25,517,240**. All are stored uncompressed in
this artifact. Four-ABI totals by library: React Native **26,305,072**, Hermes
**9,789,288**, SQLite **6,961,772**, app modules **6,097,716**, Reanimated
**5,433,028**, Expo core **5,424,008**, GL **3,052,436** bytes. These are
necessary feature/runtime contributors, not candidates for blind deletion.
ABI splitting/compression/shrinking needs compatibility, signing, install and
startup validation before any size-savings claim. No hypothetical saving is
counted as measured, and desktop emulator support cannot disappear silently.

Fresh tracked asset inventory (`git ls-files`, Node `statSync`) across mobile
assets, web public and shared assets: **65 files / 5,646,237 bytes**. This sum
includes platform copies and source branding; it is not APK contribution.
Largest: Canvas token tutorial PNG **1,621,928**, app icon **781,459**,
branding source PNG **468,300**. Three Inter TTF files total **1,030,596 bytes
per platform copy** (Bold 344,072; SemiBold 343,632; Medium 342,892). Clock atlas
PNG is **40,796 bytes per platform copy**. Website `globals.css:2054–2073`
declares those TTFs with `font-display: swap`; mobile tokens use System
(`design/tokens.ts:45`), so packaged native font use requires artifact tracing,
not an assumption based on files being in the repo.

Installed module-entry measurements: Three ESM **1,292,907 raw / 261,339 gzip**,
pdf-lib minified distribution **525,099 / 206,639**, fflate Node entry
**92,380 / 22,768** bytes. These are individual file weights, not additive
tree-shaken web, Metro or APK sizes. No new analyzer dependency was installed.

### Current local production builds — MEASURED, FRESH

The final gate/build ledger below records the actual build output. The fresh
standalone website build (Next 15.5.27) generated **23/23 static pages** and
reported **33 route entries**, with shared First Load JS **103 kB**. These are
Next's reported units, not measured HTTP transfers:

| Route | Route size | First Load JS |
| --- | ---: | ---: |
| `/`, `/_not-found` (each) | 136 B | 103 kB |
| `/announcements`, `/announcements/[id]` (each) | 180 B | 195 kB |
| `/auth/callback` | 596 B | 183 kB |
| `/auth/reset` | 1.08 kB | 191 kB |
| `/canvas` | 5.88 kB | 196 kB |
| `/canvas/[courseId]/grades`, `/canvas/[courseId]/grades/[assignmentId]` (each) | 181 B | 196 kB |
| `/download` | 9.08 kB | 130 kB |
| `/generate` | 185 B | 205 kB |
| `/generate/[courseId]` | 182 B | 205 kB |
| `/generate/[courseId]/[id]` | 185 B | 205 kB |
| `/generate/new` | 19.7 kB | 206 kB |
| `/generation/[id]` | 179 B | 200 kB |
| `/icon.svg` | 0 B | 0 B |
| `/library`, `/library/[id]` (each) | 182 B | 223 kB |
| `/library/course/[courseKey]` | 185 B | 223 kB |
| `/privacy`, `/terms` (each) | 166 B | 106 kB |
| `/queue`, `/release` (each) | 136 B | 103 kB |
| `/quiz/[id]` | 5.79 kB | 195 kB |
| `/s/[token]` | 3.37 kB | 124 kB |
| `/schedule` | 2.97 kB | 197 kB |
| `/schedule/session/[id]` | 4.76 kB | 194 kB |
| `/settings` | 3.42 kB | 193 kB |
| `/sign-in`, `/sign-up` (each) | 2.42 kB | 192 kB |
| `/tasks` | 179 B | 198 kB |
| `/tasks/[id]` | 180 B | 198 kB |
| `/today` | 19.4 kB | 213 kB |

`/queue` redirects to `/today?queue=open` (`apps/web/app/(app)/queue/page.tsx:1`);
its 103 kB is not the cost of showing the Queue popout. Shared route code means
these figures must not be summed as a session total. SP2b's historical Today
198 kB precedes many later features; 213 kB is the current baseline, not a
controlled regression attribution. Additional emitted-chunk gzip measurements
are local `zlib.gzipSync` results, not observed HTTP transfer/CDN compression.
Android `expo export --platform android`
is an offline release JS/Hermes/assets export, **not a native APK/AAB build**.

Fresh standalone emitted files, inspected by `PBR0-build-measure.cjs`:

| Artifact | Raw bytes | Locally gzip-compressed bytes / interpretation |
| --- | ---: | --- |
| All 71 web emitted JS chunks | 2,585,223 | 821,493; includes async chunks and framework/polyfill files, not one route's transfer |
| Deferred renderer vendor chunk `9d78c252.e8fa1c3f0dfafd00.js` | 487,191 | 118,978; loadable manifest maps it to `preloadDayOrb.ts -> ./DayOrb` |
| Deferred export vendor chunk `6920.8fcd9a982c2b5e4e.js` | 430,525 | 178,402; manifest maps it to `study-export.ts -> @stay-focused/shared/study-export` |
| Shared app chunk `18-25b11e3a132b87ef.js` | 173,875 | 46,628 |
| Shared app chunk `87c73c54-24122e7b92478d00.js` | 173,019 | 54,357 |
| Today page chunk | 58,143 | 19,424 |
| One emitted CSS file | 97,462 | 18,756 |
| Android HBC `index-17014b69fe426bb1398738b0e8e8fb84.hbc` | 10,945,101 | No compression claim; Metro reports 4,317 modules |
| Android export: 36 assets + HBC + metadata, 38 files | 14,667,274 | Export folder weight, not APK size |

The Android export explicitly includes the tutorial PNG (1,621,928 bytes),
MaterialSymbols regular TTF from the installed dependency (970,844 bytes), all
three Inter TTFs (1,030,596 combined), clock atlas (40,796) and feedback sounds.
Their presence is measured; whether a safe narrower encoding/import boundary
exists is a follow-up question, not permission to delete glyphs or tutorials.
The 2.3.0 APK embeds older JS and uses Android resource packaging; do not subtract
its embedded bundle weight from this different source export to claim a regression.

Fresh API NFT trace: Today **79 files**, with zero matches for PDF.js,
`@napi-rs/canvas`, fflate or fast-xml-parser; experience mixed catch-all **1,310
files**, including **375 PDF.js** and **5 `@napi-rs/canvas`** entries. These are
trace membership counts, not deployment bytes or cold-start latency. They
reconfirm SP2b's read isolation while retaining write-route packaging.

Preview packaging is explicit APK (`apps/mobile/eas.json:24`); development is
`developmentClient: true`, internal development channel; production auto-
increments but has no explicit Android buildType. The resolved production
artifact type is **OWNER-TO-VERIFY**, not weighed as an AAB. Remote app version
source means the actual built manifest remains authoritative (ADR-051).
Source scripts are `expo export` and `next build`, with no deploy hooks.
Metro uses Expo defaults (`metro.config.js:5`); Babel uses `babel-preset-expo`.
There is no tracked native Android project or explicit tracked R8/resource-
shrinking override. The ignored local Android project is historical tooling,
not evidence of FS5 EAS build flags. Actual FS5 minify/shrink settings are
**UNVERIFIED**; absence of a debuggable manifest flag does not establish R8.

### Fresh synthetic data-path probe

Reused existing SP2 synthetic fixture declarations: one fictional course, 240
reviewers with repeated fictional text, empty drafts/quizzes/material inventory.
The actual current service/repository runs against the in-memory PostgREST
adapter; `fetch` throws. View rows are fixture-generated, not a real PostgreSQL
query plan. Auth/activity, Storage, Canvas, OCR, model calls and rendering are
excluded. No private fixture used; no latency claimed.

| Operation | Repository page reads | Returned DB JSON bytes | Response JSON bytes | HTTP-equivalent calls |
| --- | ---: | ---: | ---: | ---: |
| Course workspace, empty materials | 1 | 221 | 893 | 1 |
| Library first 100 summaries | 2 | 44,277 | 38,123 | 1 |
| Exact reviewer | 2 | 78,702 | 78,742 | 1 |
| Complete 240-card Library walk | 6 | 105,692 | Not aggregated | 3 |
| Preparation projection, repeated fixture file/100 candidate-visible IDs, empty receipts/controls | 2 | 4 | Not measured | 1 |

Commands (all local): `node --require ./tmp/overnight/PBR0-network-guard.cjs
node_modules/tsx/dist/cli.mjs --tsconfig apps/api/tsconfig.json
tmp/overnight/PBR0-service-probe.ts` and the same with
`PBR0-preparation-probe.ts`; both final exits **0**. Two first attempts without
`--tsconfig` failed resolving API `@/lib/...` aliases before observations;
original logs retained, no source repair. Final figures reproduce SP2's
bounded data path, not its historical before-state. No claimed new improvement.

### Latency, rendering and server limits

FRESH existing `orb-load.browser.test.ts` coverage produced **12 normal-motion
sequences / 3,609 rAF samples**, both themes × Today/Generation × cold/reload/
component switch. Sample checks found **0 premature visible clock frames** and
**0 loading poster samples**; the seven-test file also covers Reduced Motion
and chunk/atlas/WebGL/timeout fallbacks. These use fictional state, loopback-only
request interception, Chromium software GL, 390×844 viewport, 4× CPU throttling,
150 ms latency/200,000 B/s download/93,750 B/s upload, cache disabled and an added
800 ms atlas delay (`orb-load.browser.test.ts:44,68,108`). Cold first-live from
first sampled rAF was 8,383/9,882 ms for light/dark Today and 4,671/4,680 ms for
light/dark Generation (one sample per case). These are test-fixture reveal
observations, **not** document navigation time, LCP/INP, native startup, real-user
frame cost or P50/P95. No continuous native or physical evidence is inferred.

P50/P95 endpoints, acceptance-to-result duration, Android cold/warm startup,
navigation/input latency, native RAM/GC/GPU/battery, actual network cache misses,
web LCP/INP/CLS p75 and production compression: **NOT RUN**. No actual timed
device/network samples were collected, so their sample size is zero and there is no
P50/P95, device/network percentile or speedup estimate. Existing browser tests
exercise synthetic local fixtures and software GL, not native GPU performance.

SOURCE-INFERRED remaining work:

- `experience/repository.ts:104–115` walks all superseded IDs again for **each**
  Library page; first-page fixture above has none, so it does not measure a large
  history. `:168–184` still reads whole owned tables in 200-row pages for generic
  Today/tasks/announcement contexts, with safe failure at 10,000. SP2's exact
  detail and SP2b's request-local dedupe already avoid separate older costs.
- `20261015040000_experience_library_projections.sql:86–130` has reviewer ranking
  and quiz lateral history/active-attempt aggregates. Existing indexes include
  `20260723084329_reusable_processing_assets.sql:447,464` owner artifact/job
  history, `20260912110000_quiz_maker.sql:45` owner/quiz/start history and
  `20260827155438_task_study_plan_foundation.sql:106` owner/session start. No
  remote EXPLAIN/cardinality/index usage evidence exists. Do not add a speculative
  index, remove RLS/joins/grants, or bypass the summary contract to claim speed.
- API `next.config.ts:8–20` retains native/PDF trace includes on mixed/write
  routes, exempting Today. Mixed catch-all writes still need these files;
  additional trace narrowing must prove all extraction/exports paths remain.
- Native `ReviewerReader.tsx:393,422` and web `reviewer-reader.tsx:409,425`
  mount every section/block. Search is already memoized/deferred; scrolling,
  selection, image layout and topic anchors mean naive virtualization can break
  features. Library native reveals bounded visible items (`LibraryScreen.tsx:348`)
  while web mounts `items.map` (`library.tsx:437`). Rendering cost is a hypothesis
  to measure with long existing fixtures, not evidence of a measured stutter.
- Native export statically imports all format builders via `studyExport.ts:2`
  and shared `study-export/index.ts:3–5`; web already defers that module.
  Metro deferral, bytecode attribution and peak export memory remain unmeasured.
  Base64 construction in native `studyExport.ts:5–13` and PDF/Office byte arrays
  can coexist in memory; preserve file integrity and offline operation.
- Mobile Library's focus effect explicitly calls catch-up with `force: true`
  (`features/redesign/useLocalLibrary.ts:99`), bypassing the successful throttle
  for that visit while retaining single-flight deduplication. Its subscription
  reloads both summaries and stats (`:87–91`) on progress notifications; body
  hydration notifies per item (`localLibrary/librarySync.ts:117`). Summary reads
  also parse owner-wide image manifests, responses, quiz practice and pending
  drafts (`artifactStore.ts:220–246`). Large offline histories may therefore
  spend CPU/SQLite work even with unchanged-body downloads already eliminated.
  Measure notification/read counts before proposing batching; do not remove
  refresh/reconnect guarantees or defer saved content behind network.

## AI/OCR/queue review

The active durable reviewer path is **AI-first**, not an assumption that all
old stages run for every job: `processing-jobs/ai-reviewer.ts:30` calls
`runAIReviewer`. `packages/engine/src/ai-first-reviewer.ts:137,145` normalizes
once for call-budget planning and again for execution; this is possible pure
CPU duplication, not measured model latency. The generator validates structured
output/source IDs/emphasis; whole-document generation can repair, then output-
limit fallback splits full source-order blocks with bounded retries (`:120–138,
167–210`). Calls are serial across fallback parts; provider latency and repair
frequency must be measured before changing concurrency. Metrics currently use
total duration as provider wait and zero component durations (`:107`), so these
fields do **not** establish actual planning/verification timing.

The legacy normalization → outline → plan → generation → coverage verification
→ retry → assembly path still exists (`generate.ts:158–340`) and retains its
evaluations. Reviewer speed must retain exact accepted-source terminology,
examples, requirements, source coverage and disclosed generation failures; no
lossy summary, token cap reduction, dropped section, validation bypass, changed
model or unsupported enrichment is authorized. Checkpoint/provider transfer
reservations and saved completed output already avoid repeating accepted work
(`processing-jobs/ai-reviewer.ts:20,32,40`, `ai-generation.ts`).

OCR policy remains synchronous/Canvas **40 total pages**, durable **100 total /
40 OCR-required**, provider requests **5 pages**, extraction concurrency **2**
(`ocr/upload-policy.ts:9–20`; `packages/ocr/src/policy.ts:3`). The completeness
verifier accounts for missing/duplicate/out-of-range/malformed/failed pages and
explicit blanks (`packages/ocr/src/completeness.ts:13–130`). Manual document
inspection and chunk extraction can run serially (`manual-reviewer-source.ts:61,
65`). This is not permission to drop blank pages or make a partial extraction
eligible. Boundaries and page-accounting tests remain hard regression gates.

Durable creation is idempotent (`creation.ts:49,396–433`); successful processing
persists via `processor.ts:85` before success reporting, with cancellation
checks (`:440`). Mobile outbox/recovery and Queue must reconcile server state
after acceptance, timeout and restart. A local intent is never HTTP 202.
Worker max concurrency 4 (`processing-jobs/constants.ts:11`) and Canvas unit
limits are source constants, not measured deployed capacity. API `vercel.json`
region and historically documented DB/Google regions are hypotheses for RTT;
no region migration, queue reservation or capacity increase is authorized.

## Polish, reliability, privacy and platform coverage

SOURCE-INFERRED strengths: Page/sheet primitives retain scroll and keyboard tap
handling, labelled actions and Android Back dismissal (`mobile/design/primitives.tsx:
327,340,568,602`); common actions use token hit targets (`:159,194`). Skeletons,
empty/error notices and saved-refresh status exist in both apps. Native sheets
and skeletons branch for Reduced Motion (`:536,865`); web has focus-visible,
skip-link and Reduced Motion CSS (`globals.css:192,662,841`). Current orb startup
reveals from empty only after a whole live frame, falls back on failure and
recovers replacement native surfaces. OX3/OX4 remain separate owners of orb work.

Verification still needed: TalkBack/keyboard/focus trapping and return focus,
font-scale 1.0/1.3/2.0, 320/360 px width, keyboard open on task/draft/quiz editing,
Back during sheets/upload/pre-202 versus post-202, nested scrolling and overlays,
search with long content, lower-end RAM, background/kill/reopen, and slow-network
failure/retry without duplicate jobs. Some segmented controls have 32 px minimum
height (`primitives.tsx:706`); hit area/screen-reader measurement is needed before
claiming accessibility conformance. This is not a WCAG/device audit PASS.

Offline text/body/version and account fences are already implemented. Quiz
practice restores and serializes pending writes (`QuizScreen.tsx:113–141`), then
adopts server results after replay (`:291–313`); missing answer keys remain
connection-required (ADR-022). Draft edit/revision/conflict copies must survive
restarts; task completion remains server-authoritative. Offline images expose
"Some images need a connection" (`ReviewerReader.tsx:380`), but `imagesReady`
counts `skipped_cap` as ready (`localLibrary/imageManifest.ts:33`). Preserve the
distinction between readable text and complete images; do not remove caps or
download private content indiscriminately to make a badge green.

Auth and owner isolation are security invariants, not measured performance
bugs. Reviewed server bearer verification, trusted owner repository, invoker
views with explicit owner joins/revokes/service-role grants, private/no-store
responses, epoch-bound cache publication and exact-item safe not-found denial.
Local database-contract tests use PGlite, not a remote database. These prove
local contracts only; no production security certification is claimed.
API error normalization omits raw provider messages/stacks (`read-http.ts:30–35`),
and reviewer failures log safe categories/findings (`ai-reviewer.ts:44–59`).
No private academic content, credentials, private Storage path or raw provider
error is reproduced in this report.

**Historical FS7 physical acceptance remains PARTIAL: 5 PASS / 1 FAIL.**
Light/dark Today and standalone Generation endpoints and later complete frame
passed; initial resume capture lost native text, with recovery observed at
54.9 s. Newer recorded `245380ea` release checks specifically prove Appearance
round trips retained a live GL surface on the Realme; they do not retroactively
pass FS7's broader resume matrix or establish native frame timings. Authenticated
desktop website acceptance remains **NOT RUN / UNVERIFIED (owner to confirm)**;
historical public desktop sign-in at 1440 px is narrower. PBR0 Device checks
were skipped entirely.

## Prioritized findings and conditional actions

P0 below means a tester-readiness evidence gate, not an invented confirmed
security vulnerability. Impact is qualitative unless measured above.

| Priority / ID | Evidence and issue | Next bounded action / expected impact | Risk and regression condition |
| --- | --- | --- | --- |
| P0 / B0 | FS7 report Live checks row 5; newer report Device acceptance has narrower Appearance proof; authenticated desktop NOT RUN | Owner repeat exact resume/route/Appearance flow and authenticated browser matrix on pinned binary+OTA; resolve visible missing content before tester GO | Do not relabel old failure or use software GL as native proof; OX3/OX4 preserved |
| P0 / B1 | No current endpoint/startup/Web Vitals percentile samples; AI-first metrics `:107` conflate total/provider duration | Establish sanitized stage and first-content measurements before choosing invasive work; gives attributable baseline | No content/token/URL/owner data in telemetry; no new service without separate authorization |
| P1 / S1 | Exact APK 132,024,227 bytes; four-ABI native entries 93,639,812; tracked EAS APK/profile source above | PBR2 assess R8/resource compression and artifact formats against actual release settings first; largest evidenced size contributor | Native module/ABI/signature/OTA compatibility and all features retained; no promised MB reduction |
| P1 / D1 | `experience/repository.ts:104–115` repeats hidden-ID walk per page; `:168` whole-owner scans; SQL `:86–130` ranking/history | PBR1 characterize large-history counts/query plans, then one request-local projection/read improvement at a time | Superseded detail, past-course Library, ordering, safe bounds and complete evidence must match; no cross-owner auth cache |
| P1 / D2 | Mobile `useLocalLibrary.ts:87–99`, `librarySync.ts:117`, `artifactStore.ts:220–246`: repeated full local derived reads on progress/focus | PBR1 measure list/stat reads for 0/100/300 changed and unchanged items, then coalesce only redundant publication work if proved | First saved cards, per-item durable writes, final refresh/error state, owner switch and cancellation must remain timely; no catch-up cap removal |
| P1 / R1 | Reader maps entire document; Library native visible slice/web full map, cited above | Profile long existing fixtures, then narrowly reduce rerender work if proven; potential input/scroll/RAM benefit | Search anchors, smart selection, scrubber, image alignment, exports and all source text remain intact; no truncation |
| P1 / O1 | `imageManifest.ts:33` ready includes skipped images; `ReviewerReader.tsx:380` already warns | PBR4 clarify complete-image versus readable-text state under existing cap, reconcile against LC1 owner scope | Preserve offline text, quotas, private images and owner/version fences; do not silently expand offline downloads |
| P2 / S2 | Native static export graph; web dynamic export already present; TTFs 1,030,596 bytes/web copy | PBR2 measure native graph and evaluate font encoding/on-demand boundaries while retaining glyphs/formats/design | No dependency removal by name, no broken offline export; compare exact file structure, glyph coverage and layout |
| P2 / A1 | `ai-reviewer.ts:30` plus engine `:137,145` normalize twice; fallback serial parts and broad timing fields | Instrument first; consider reuse of immutable normalization only if measured cost justifies it | All accepted source blocks/limits/contract checks/checkpoints/cancellation unchanged; no AI completeness trade |
| P2 / U1 | `primitives.tsx:706` 32 px segments; keyboard/Back/device matrix not executed | PBR3 verify effective hit areas and keyboard/focus behavior; fix only demonstrated problems with existing tokens | Preserve design system, touch gestures, input state and Reduced Motion; no broad redesign |

## Conditional PBR1–PBR6 sequence

This queues proposals, not implementation authority. Baseline precedes changes.
Supervisor review must choose the first eligible small slice and reconcile
pending **OX3/OX4/QI1/LC1**, held website parity and Owner Pause. None is deleted,
reprioritized automatically or marked complete. Dependencies/config stay frozen
until a separate code-only prompt explicitly permits them.

| Slice | Prerequisite and finite proposed scope | Tests / expected effect / STOP rules |
| --- | --- | --- |
| PBR1: performance/API/caching | Supervisor-approved D1 or one measured hotspot; characterize 0/100/240/large-history fixture counts first. Preserve SP1/SP2/SP2b, add one bounded read/projection or normalization reuse, not a caching rewrite. | Shared/API + relevant client equivalence/count/owner-switch/partial-page tests; fresh forced typecheck/lint, API/web builds, changed mobile export. Expect fewer proved reads/bytes or CPU operations. STOP on result/ordering/ownership drift, incomplete evidence, required remote SQL or region/queue decision. New index only with plan evidence and new forward migration file if separately scoped. |
| PBR2: web and APK size | Confirm exact binary/release settings and dependency patch drift. Pick one byte-attributed font/asset/import or release-packaging experiment; no feature/native module deletion. Native build/distribution stays owner-only unless separately authorized. | Before/after same-build route/chunk/HBC/assets ledger, all format/glyph/atlas tests, web and Android exports, no API runtime dependency leak. Native R8/ABI/compression hypotheses require later owner build/install/signature/runtime checks. STOP on native incompatibility, signing change, lost architecture/support or need for new packages/config outside authorization. 100 MB is provisional, not a blocker. |
| PBR3: UI/UX polish | Coordinate with OX3/OX4/QI1 and held parity; choose one reproducible keyboard/Back/touch/layout/long-reader issue from matrix. Keep existing tokens and features. | Existing browser/component gesture, search/anchor/selection, viewport, Reduced Motion, question/attempt state and navigation tests; physical acceptance later. Expect measured input/scroll improvement or concrete usability repair. STOP on untraceable native-only symptom, missing faithful fixture, design/behavior contradiction or new feature scope. |
| PBR4: reliability/security | Coordinate LC1/O1 semantics; choose one offline-image status or demonstrated recovery issue, retaining 202/outbox/replay/owner invariants. No speculative auth relaxation. | PGlite RLS/grants/foreign-not-found, stale/partial Canvas, interrupted upload/retry/cancel, offline quiz/draft restart/replay, sign-out delayed write tests. Expect less ambiguous state/recovery, no reduced guarantees. STOP on source mismatch, applied-migration edit, production-only validation dependency or any need to send email/change accounts. |
| PBR5: regression/observability | Approved event schema/privacy policy and measured boundary list; local sinks first. Extend current safe logs with attributable durations/counters only, no telemetry provider provision. | Redaction/allowlist tests, monotonic timing with fake clock, no key/content/path leakage, cardinality/sampling and disabled-sink behavior; full affected suites. Expect reliable stage/latency evidence, no unmeasured speed claim. STOP if external service, disclosure/consent/retention decision or private capture needed. |
| PBR6: rollout/device/tester distribution | **Owner-only**, after reviewed commits, all applicable gates and resolved P0 evidence. Native/runtime/signing compatibility and migration prerequisites must be checked on actual release source. | Coordinated release/rollback, real device/network matrix, authenticated website, artifact sizes and privacy-respecting crash observation; explicit owner GO before external testers. No rollout command, account, invitation or paid generation in PBR0. |

### No-feature-removal regression gates for every later slice

Keep strict TypeScript; run changed workspace suites and forced root gates.
Prove Today/Schedule calendar/plans; every existing Generate source and Queue
Retry/Open/cancel/restart; complete grounded reviewer/search/assists/images;
all six quiz formats/progress/reveal/scoring/replay; Library current/past/pin/
sort/offline/version retention; tasks/drafts/conflicts; Canvas pagination,
Retry-After and partial-evidence retention; auth/sign-out/account isolation;
settings/legal/appearance/Reduced Motion; and PDF/DOCX/PPTX file validity.
No size, latency or frame target permits deleting content, capping reviewer
completeness, weakening verification, dropping exports or changing RLS/grants.

## Owner measurement plan and GO/NO-GO

All numbers here are **TARGETS ONLY**, not achieved metrics: midrange Android
cold first useful screen **<3 s**; input feedback **<100 ms**; navigation/scroll
**60 fps when feasible** (retain intentional lower idle orb rate); website
**LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 at p75**; endpoint/generation **P50/P95
measured separately**. APK **100 MB provisional target**, never a release blocker
on its own and never permission to remove a feature.

| Representative environment | Networks / state | Procedure and required evidence |
| --- | --- | --- |
| Realme RMX3151 / Android 13, exact 2.3.0/code 7 + pinned active OTA | Wi-Fi, mobile data, offline, slow/lossy link | Today/Generate/Tasks/Library/Settings loops, cold/warm/resume/Appearance, upload pre/post-202, offline force-stop/reopen; record binary hash/update, 20 cold + 20 warm samples, 10 resume cycles; capture frame timings/RAM separately |
| Additional 3–4 GB Android midrange and 2 GB lower-end device, supported OS/ABIs | Same controlled network profiles, cold/warm saved caches | Verify memory pressure, long reviewer/search/images, long quiz/overview, draft/export and retention; actual model/OS/RAM and thermal/battery conditions mandatory |
| Chrome desktop 1440 px and 768 px; Firefox or Edge second engine | Normal Wi-Fi and controlled Slow 4G/4× CPU, both empty and warm caches | Authenticated full routes, keyboard/focus/Back, zero overflow, first content and resource waterfall; minimum 20 cold/20 warm scripted navigations per critical path |
| Android Chrome 360/390 px and iOS Safari representative phone | Slow link/offline transition; font scale/zoom and Reduced Motion | Responsive web, sheets/editing/search, sign-in-return/share/download and exports; web offline promises remain limited to actual design |

For endpoint P50/P95: separate Today, Library first/later page, exact reviewer,
Queue list/detail, Canvas admission/poll, upload admission and generation. Use
monotonic request/response timestamps, status, bytes, cache disposition and
safe build/route identifiers. Suggested owner sample floor: **100 observations
per endpoint/cache/network/build cohort**, sorted nearest-rank `ceil(p*n)`;
publish n/failures/timeouts separately, not just successful requests. Generation
cost/samples require explicit owner authorization; choose a cost-bounded source
matrix (text, embedded/scanned/mixed PDF, image, DOCX/PPTX, Canvas) and report n
even when too small for a stable p95. Separate upload → HTTP202, queue wait,
inspection/OCR, normalization, provider transfers/repair, verification/assembly,
persisted success and UI reconciliation. Never merge queue wait into model time
or mark a cancelled job as success. Privacy-safe local IDs may correlate one run;
do not export academic text or private source/job identifiers to analytics.

For Web Vitals, collect owner-controlled lab traces first, then consented field
samples grouped by release and device class; p75 is a field distribution, not
a single Lighthouse run. Record LCP element, long tasks, layout shifts, resource
requests, cache headers and failures. Browser software GL test elapsed time is
not a user's INP, FPS or cold-start sample. Repeated tests/builds may warm caches;
keep cold and warm cohorts separate.

Crash telemetry proposal: start with an allowlisted local event sink and opt-in
sanitized tester report. Events: build/runtime/update, route template (no IDs),
OS/app lifecycle, duration bucket, cache hit/miss, safe error code, job stage and
counts. Exclude bearer/credentials, user/email/course/title/source/reviewer/quiz
content, query strings, raw URLs, private Storage paths, request bodies, screenshots,
console breadcrumbs and raw provider errors/stacks. Redact stack paths and retain
source maps privately if later authorized. Use bounded buffering/sampling,
document retention/deletion and sign-out behavior, and test sink failure never
blocks study. A remote SDK/service, consent policy and retention period need a
separate owner decision; nothing is installed or enabled here.

GO requires: exact release+OTA identity; all locally applicable gates green;
no unresolved owner-isolation/data-loss/source-completeness/cancellation issue;
no missing native UI in the agreed lifecycle matrix; authenticated website
acceptance; offline task/quiz/draft/export recovery; supported native module/
signing/runtime compatibility; numeric baseline with known sample limits; safe
crash-report path and rollback plan; supervisor and owner approval. NO-GO for
failed security/content/persistence gates, unresolved critical blank content,
duplicate/lost accepted work or incompatible install/OTA. Lack of an arbitrary
100 MB target alone is not NO-GO. **Current external-tester verdict: NO-GO for
unattended certification; owner acceptance/evidence remains outstanding.**

## Gate ledger and closure

**PASS for the finite PBR0 audit scope.** All locally applicable required
gates ran successfully on source `245380ea`; documentation commits follow.
No app implementation changed. These elapsed command times are build/test
runner wall time, not application latency. No gate result was reused from a
prior phase. Turbo remote cache was disabled; forced gates report zero cached
tasks. Compiler/Metro internal caches were not purged, and no clean install ran.

| Exact command | Actual result | Command wall time |
| --- | --- | ---: |
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks, 0 cached | 47.189 s |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks, 0 cached; 0 errors, six existing warnings | 88.434 s |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | FRESH PASS: 706 passed / 72 files; includes 36 source and 36 emitted-copy files | 22.726 s |
| `npm run test --workspace @stay-focused/canvas -- --maxWorkers=2` | FRESH PASS: 75 passed / 1 file | 1.709 s |
| `npm run test --workspace @stay-focused/ocr -- --maxWorkers=2` | FRESH PASS: 27 passed / 3 files | 1.924 s |
| `npm run test --workspace @stay-focused/engine` | FRESH PASS: 606 passed / 0 failed (offline evaluations) | 17.708 s |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS: 2,452 passed / 3 existing live skips / 213 files | 159.988 s |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | FRESH PASS: 1,645 passed / 172 files / 0 skips | 59.295 s |
| `npm run test --workspace @stay-focused/web -- --maxWorkers=1` | FRESH PASS: 575 passed / 76 files / 0 skips | 287.749 s |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build; 37/37 pages, 18 workflow steps / 1 workflow | 121.508 s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 23/23 static pages, 33 route entries | 62.000 s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 offline export; 1 Android HBC / 36 assets; not a native build | 131.397 s |
| `npm run build -- --force --concurrency=1` | FRESH PASS: 8/8 tasks, 0 cached; API 37/37, web 23/23; Android/iOS HBC and Expo web export | 332.426 s |
| `npm run typecheck -- --force` (after declaration restoration) | FRESH PASS: 8/8 tasks, 0 cached | 41.756 s |
| `git diff --check`; `git diff --cached --check` | FRESH PASS: exit 0, including final staged documentation | Not a performance sample |
| Report path/scope validation | FRESH PASS: explicit source paths exist; only five owned Markdown files across the two commits | Not a performance sample |
| Native APK/AAB build, live provider smoke, remote SQL/EXPLAIN, deployment, physical checks | NOT RUN: explicitly excluded | Not applicable |

The shared 706/72 total includes emitted copies under the default installed
Vitest discovery; it is not twice the unique source coverage. API's three
existing skipped tests are the B24.6 live activity case and two B24.7 live quiz
cases; all remain excluded rather than contacting providers/databases. All
other listed test cases passed, with no new skips, suite/build retry or observed
flake. FRESH browser fixture coverage is local Chromium/software GL/IndexedDB;
mobile suites use Node/native stubs, not physical Android. Full authenticated
production flows, actual native startup/GPU and tester acceptance are not covered.

First attempts and limitations are retained: two copied synthetic probes first
failed API alias resolution without `--tsconfig`; both corrected final commands
exit 0 with the figures above. Exploratory Windows wildcard/missing-path reads
failed before any mutation and were corrected using actual file discovery.
No product gate failed. Existing Vite native-config deprecation and Expo
NO_COLOR/FORCE_COLOR warnings remain, along with the six existing lint warnings.
Next regenerated both `next-env.d.ts` declarations; only these known generated
changes were restored to the original source version, then the forced typecheck
passed again. No assertions, thresholds, dependencies or configuration were
changed to obtain a pass. All source/app changes are absent from the final diff.

Execution safety: serial gate runner uses repository-local TEMP/TMP/TMPDIR,
`EXPO_OFFLINE=1`, disabled Expo/Next/Turbo telemetry and a loopback-only Node
network guard. Existing browser fixtures abort non-loopback requests. Builds
use installed tooling and existing local configuration; no environment file is
edited, no service is called and no migration is applied. Raw generated logs,
fixtures, browser samples and APKs remain ignored and uncommitted under `tmp/`.
PBR0 ends at supervisor review of this baseline and conditional roadmap.


## Owner steps remaining

- Rollout: **NOT RUN**, skipped entirely. Review audit and local commit; do not
  launch any PBR slice until supervisor review. PBR6 deploy/worker/OTA/EAS/public
  release/migrations/push/Scheduler/tester distribution remains owner-only.
- Device checks: **NOT RUN**, skipped entirely. Confirm active binary+OTA and
  execute the agreed Realme/authenticated web/device/network matrix, including
  FS7's broader resume failure and later narrower GL recovery proof.
- Live revisions, DB/index plans/applied migrations, regions/capacity/Scheduler,
  endpoint P50/P95, Web Vitals and actual startup/RAM/GPU/battery are
  **UNVERIFIED (owner to confirm)**. User-reported 117 MB artifact is unidentified;
  exact local code7 binary weighing is complete, active OTA size is separate.
- Preserve Owner Pause, pending OX3/OX4/QI1/LC1 and held web parity. This is a
  queued roadmap proposal, not an instruction to start optimizations automatically.
- Vercel CLI is unavailable in this session. Strongly recommend `npm i -g vercel`
  for separately authorized future env/deploy/log tooling; installation and all
  Vercel commands were **NOT RUN**, as required by this audit.
