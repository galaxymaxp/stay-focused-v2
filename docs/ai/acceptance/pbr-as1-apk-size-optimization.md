# PBR-AS1: measured APK and local export size investigation

2026-10-23. Finite authorized scope: AS1 only, local inspection, equivalent
offline exports, safe byte-attributed source correction if justified, tests,
gates, documentation and local commits. No successor execution or publication.
Prepared branch `overnight/2026-10-15_feedback`, HEAD
`ecf4c5edc4aae7e3a0228fdec7b84d2421e6e5f7`; tracked/index clean. Local upstream
snapshot 27 ahead / 23 behind github/main, without fetch. Untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored owner evidence preserved.

## Acceptance frozen before runtime changes

| Row | Requirement | Proof / initial disposition |
| --- | --- | --- |
| 0 | Source, authority and prerequisites | Root AGENTS/AUTOPILOT, current plans, recent handoff, PBR0/AF1/MB1/LP1/recovery reports and absolute runner BACKLOG inspected. Actual PBR0/AF1/MB1/LP1 PASS status files; LP1 a35b1d3c/204f8731/ecf4c5ed reachable. Current run note supplies owner approval after LP1 PASS. PASS. |
| 1a | Actual APK provenance and attribution | Fresh archive hash, badging, entry sizes/methods/hashes, ABI/library/assets/fonts/duplicate inventories; archived binary distinct from current source. PASS initial inventory, repeat pending. |
| 1b | Comparable local JS/assets | Two identical offline Android exports with all per-file hashes, preserved outputs, input/source/tool identity and exact byte differences. Pending. |
| 2 | Safe correction or justified no-change verdict | Only reproduced source cost with preserved references, offline/fallback access, full fonts/glyphs, media, modules, ABIs, exports, signing and OTA semantics. Otherwise document no justified safe source change. Pending. |
| 3 | Equivalent comparison and limits | Repeat archive/source/export inventory; explain every difference and do not count Metro bytes as native APK savings. Native rebuild NOT RUN. Pending. |
| G | Mandatory fresh verification | Focused asset/font/export behavior checks; full shared/mobile/API suites; forced root typecheck/lint; explicit API build; two Android offline exports for measurement; forced serial root build with loose env; staged/unstaged diff checks. Web standalone gates only if web/shared behavior changes. Pending. |
| C | Closure | Reconcile three current planning documents, append handoff, owner-authored scoped local commits, ignored progress/status and evidence custody. Pending. |

## Initial measured inventory and identities

Read-only local archive `tmp/overnight/OX1-device/installed-release.apk`:
**132,024,227 bytes**, SHA256
`0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6`.
Fresh installed SDK 36.0.0 aapt badging identifies
`com.galaxymaxp.stayfocusedv2`, **2.3.0/code 7**, min SDK24/target36 and four
ABIs. This hash agrees with PBR0/AF1/FS5 historical custody; reported build
a26aa1fe-623e-49e5-95fb-0c2caa1f86ea from e62e31ce is historical provenance,
not a newly queried build service. Signature verification is NOT RUN. Signing
material is not inspected. The owner's 117 MB artifact/units remain unidentified.

| Entry category | Entries | Compressed bytes | Uncompressed bytes |
| --- | ---: | ---: | ---: |
| Native libraries | 108 | 93,639,812 | 93,639,812 |
| DEX | 6 | 21,313,504 | 58,578,744 |
| assets | 6 | 8,793,910 | 8,804,526 |
| res | 1,347 | 3,485,909 | 4,987,435 |
| resources.arsc | 1 | 2,288,268 | 2,288,268 |
| Other | 261 | 1,410,414 | 1,732,118 |
| All payloads | 1,729 | 130,931,817 | 170,030,903 |

Archive overhead (headers/alignment/signing/directory, not separately decoded):
**1,092,410 bytes**. Each ABI has 27 libraries, all stored uncompressed:
arm64-v8a 24,860,944; armeabi-v7a 17,151,772; x86 26,109,856;
x86_64 25,517,240 bytes. ABI support is required, not removable overhead.
Five packaged TTFs total 2,004,756 raw / 932,190 compressed bytes; exact hashes
and obfuscated resource names are in `apk-before.json`. There are 0 duplicate
entry names and 40 groups of byte-identical payloads; their references and
resource qualifications must be examined before inferring removable duplicates.
No signature/certificate entry contents are read or extracted by the helper.

Tracked source asset inventory: 65 files / 5,646,237 bytes across mobile assets,
web public and shared assets, including platform copies and branding sources.
This is not APK contribution. Current app manifest remains **2.2.0/code 6 /
runtime2.2.0-sdk57**, distinct from the archived **2.3.0/code 7** release.
Local installed Node24.16.0/Expo57.0.30/RN0.86.3/Next15.5.27 tool identities
are recorded, rather than inferred as the archived binary's dependencies.

## Measurement and safety contract

New helpers, fixtures, logs, copies and hashes live only in ignored
`tmp/overnight/PBR-AS1/`. `identity-before.json` records 46,216 original
input-file hashes, including inherited AF1/MB1/LP1 custody and unrelated owner
files; no environment file is read. Archive payload hashes are computed in
memory without extraction. Repeated exports run the same installed Expo
production Android/Hermes export command with unchanged inputs; compiler,
Metro and OS caches may remain warm. Artifact bytes/hashes, not build elapsed
time, are the comparison. Source/config/package/lock hashes anchor the inputs.

Reuse the inspected loopback-only PBR0 Node network guard, repo-local
TEMP/TMP/TMPDIR, npm/Expo offline, EXPO_NO_DOTENV=1, telemetry off, local-only
Turbo cache and loose env mode. A task-local wrapper also makes `.env*` reads
unavailable to Next tooling without opening or modifying those files.
Initial guard checks 3/3 PASS (environment-read denial, outbound fetch denial,
outbound socket denial). No dependency installation or cache purge.

Tracked Expo/Metro/Babel/EAS scripts/configuration and ignored local Android
Gradle packaging are inspected without signing blocks/credentials. The native
project is untracked historical tooling, not authoritative release-build flags.
Changing library compression/R8/resource shrinking requires owner native-build,
startup/install/module verification; no speculative flag change or repack.
All fonts/glyphs/weights and offline exports remain required. No lossy encoding,
feature/module/ABI removal, source/content truncation or arbitrary deletion.

Success permits a measured no-change verdict: every local inventory, comparison,
gate and closure row must complete, while native/physical/live limits stay
explicit. No minimum invented saving or target size can override compatibility.
An actual source/security/data-loss contradiction triggers STOP; unavailable
live state alone does not. No architecture decision is currently proposed.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely. No push, deployment,
service/provider call, remote SQL/migration, Scheduler/email, native release
build/install, OTA/EAS, account/credential action or spending. Native rebuilt
APK savings, active full Realme OTA/runtime/channel/embedded identity, safe
isolation, physical startup/rendering/RAM, authenticated browser, deployed
revisions/database/applied migrations/Scheduler and production outcomes remain
**UNVERIFIED (owner to confirm)**. No beta/tester/release readiness claim.

MB1 and LP1 remain complete; no repeated Library optimization. Historical
RT1/EV1 STOPPED and physical RT2 STOPPED / resume-text INCONCLUSIVE/deferred
stay unchanged. OX2 stays blocked on OX1; unrelated work/Owner Pause and runner
queue/controller are untouched. LR1 is next only after actual AS1 PASS and
fresh approval; do not publish or implement it here.

## STEP 2: justified no-change verdict

**No safe byte-attributed source/config correction is justified in this scope.**
There are zero runtime, dependency, asset, font, native, signing, OTA or release
configuration changes. This is the explicitly allowed no-change branch, not a
claim that the APK got smaller. No new permanent runtime regression is warranted
without a changed behavior; existing export/fallback suites and an ignored
artifact/reference audit verify the preserved boundaries.

All 27 library names occur once per ABI, with no duplicate native payloads.
Below, compressed equals uncompressed bytes in this actual archive. Complete
per-ABI/per-entry sizes, methods and payload hashes are in apk-before.json and
the byte-identical repeated apk-after.json; no native build has occurred.

| Library (all four ABIs) | Compressed bytes | Uncompressed bytes |
| --- | ---: | ---: |
| libreactnative.so | 26,305,072 | 26,305,072 |
| libhermesvm.so | 9,789,288 | 9,789,288 |
| libexpo-sqlite.so | 6,961,772 | 6,961,772 |
| libappmodules.so | 6,097,716 | 6,097,716 |
| libreanimated.so | 5,433,028 | 5,433,028 |
| libexpo-modules-core.so | 5,424,008 | 5,424,008 |
| libc++_shared.so | 4,672,844 | 4,672,844 |
| libreact_codegen_rnscreens.so | 4,524,668 | 4,524,668 |
| libworklets.so | 3,855,888 | 3,855,888 |
| libreact_codegen_rnsvg.so | 3,274,608 | 3,274,608 |
| libexpo-gl.so | 3,052,436 | 3,052,436 |
| libzstd-kmp.so | 2,973,216 | 2,973,216 |
| libnative-imagetranscoder.so | 2,311,616 | 2,311,616 |
| libstatic-webp.so | 1,980,508 | 1,980,508 |
| libjsi.so | 1,558,512 | 1,558,512 |
| libreact_codegen_rngesturehandler_codegen.so | 1,425,272 | 1,425,272 |
| libgifimage.so | 1,087,772 | 1,087,772 |
| libfbjni.so | 635,888 | 635,888 |
| libreact_codegen_safeareacontext.so | 570,384 | 570,384 |
| libhermestooling.so | 492,824 | 492,824 |
| libexpo-updates.so | 384,004 | 384,004 |
| librnscreens.so | 343,864 | 343,864 |
| libgesturehandler.so | 305,324 | 305,324 |
| libnative-filters.so | 88,868 | 88,868 |
| libandroidx.graphics.path.so | 37,392 | 37,392 |
| libimagepipeline.so | 30,140 | 30,140 |
| libdatastore_shared_counter.so | 22,900 | 22,900 |

Native packaging is the dominant measured cost, but changing stored JNI libs
to legacy compression changes install/loading behavior and requires equivalent
owner-authorized native builds and device checks. R8/shrink flags in the ignored
historical Gradle project are not proof of the EAS archive's settings. Tracked
source has no native Gradle project or release-shrinking override. No source
flag is changed based on an unverified release configuration. Preview remains
APK, production profile semantics and remote version source remain unchanged.

Forty identical-payload groups contain 111 named entries. Relative to one
representative per group, repeated payloads account for 50,448 raw / 28,005
compressed entry bytes, excluding headers. These are identity counts, **not
removable bytes or achieved savings**: nine groups are Commons Codec named
language tables and 31 groups are Android resources (including qualified color,
XML, PNG and nine-patch paths). Resource IDs, qualifiers and library lookup names
can require distinct entries despite byte equality. There are no duplicate names,
fonts, native libraries or assets entries. No resource-table rewrite/exclusion
or dependency patch is justified by equality alone.

The fresh Android export has 36 assets + 1 HBC + metadata = 38 files,
14,671,618 bytes. Its 36 assets total 3,719,720 bytes: TTF 2,001,440,
PNG 1,684,855, WAV 32,806, XML 619. HBC is 10,949,445 bytes and metadata 2,453.
No duplicate emitted payloads. All 11 local literal asset/config references
resolve; all 9 non-JSON payload references match exactly one emitted file.
The two JSON imports are code inputs, not omitted downloadable assets.
references.cjs uses the installed TypeScript AST, actual metadata and SHA256,
with **FRESH 67/67 checks passed, 0 failed** in reference-audit.json.

- clockFonts.ts requires all three Inter weights (1,030,596 raw bytes).
  DayRingClock.CenterReadout uses 600 for mode labels, 700 for time and 500 for
  duration; System is a load-failure fallback, not an equivalent replacement.
  The full TTFs match both export and archive hashes (res/Ih.ttf, res/Lp.ttf,
  res/kZ.ttf), totaling 497,937 compressed APK bytes. The GL clock atlas only
  contains canonical clock glyphs; it cannot replace label/font coverage.
- DayOrb loads the 40,796-byte local clock atlas and retains plain-text/poster
  fallback when its local asset/GL frame fails. CanvasSyncScreen explicitly
  shows the 1,621,928-byte bundled tutorial with its accessible six-step label.
  Both remain available offline. These PNGs have no exact payload-hash match in
  the older archive, so no source-to-archive PNG subtraction is claimed.
- Four feedback WAVs total 32,806 bytes and match archive/export hashes exactly.
  Deleting or recoding them would change media/feedback behavior, not a free
  optimization. Native app/adaptive/monochrome icons are config references;
  unused source branding and platform copies are not automatically APK payloads.
- Material Symbols regular 970,844 raw / 431,959 compressed APK bytes matches the
  installed full font and emitted payload. Expo Router's native-tabs Android
  materialIconConverter imports expo-symbols; its utils selects the regular
  font. Replacing Router internals, subsetting glyphs or deleting a dependency
  font violates required compatibility/coverage without additional proof.
  The fifth small APK font is 3,316 raw / 2,294 compressed bytes; it is not
  attributed to a current export or removed based on its obfuscated name.
- Native studyExport imports the shared saved-content builders for PDF/DOCX/PPTX;
  metadata emits a single Android HBC. Moving a static import to a promise does
  not establish removal from this offline artifact. All formats stay local,
  with saved content, MIME, permissions and cancellation semantics preserved.

No quality reduction, asset recompression experiment, font conversion/subsetting,
module removal, ABI filter or packaging change is proposed. Additional native
compression/shrinking experiments and their exact rebuilt bytes are owner work;
this task can finish all provable local rows without them. ADR NOT APPLICABLE.
Mandatory gates and the second equivalent Android export remain pending here.

## STEP 3: equivalent artifacts, exact raw difference and limits

Both standalone commands were identical:
`npm run build --workspace @stay-focused/mobile -- --platform android`.
Product/config/package/lock/asset inputs are unchanged; only documentation HEAD
advanced from 1831c8c2 to 1320404c. The task-local guard's Vite environment-file
visibility repair occurred between exports; both Expo runs already had
EXPO_NO_DOTENV=1, the same offline settings and the same actual Metro bundle hash.
Original before/after inventories and complete exported files are retained.
No native build, reinstall or APK modification is involved.

| Actual artifact / input | Before bytes | After bytes | Raw delta |
| --- | ---: | ---: | ---: |
| Existing archived APK | 132,024,227 | 132,024,227 | 0 |
| Its compressed native libraries | 93,639,812 | 93,639,812 | 0 |
| Its compressed assets | 8,793,910 | 8,793,910 | 0 |
| Its compressed fonts | 932,190 | 932,190 | 0 |
| Tracked source assets, 65 files | 5,646,237 | 5,646,237 | 0 |
| Standalone Android JS/assets export, 38 files | 14,671,618 | 14,671,619 | +1 |
| HBC (only changed exported file) | 10,949,445 | 10,949,446 | +1 |
| Other 37 exported files | 3,722,173 | 3,722,173 | 0 |

Before HBC SHA256:
`44869cd9c9f381eb6b745e7e92a861d603a0db9ef11a1bad7b3ec7d0b28fffb6`.
After HBC SHA256:
`dc92cfd679598a6d6c4753c21c0d787af180d0976fb5ee1e5fb0f4487d8b9f44`.
Both metadata files name index-b1140c3d5f4d980071543d1ea13e651b.hbc.
Every compared file's raw name/size/SHA256 and delta is in comparison.json;
37 files are byte-identical. Archive and source inventories are byte-identical,
including every compared payload hash, compression method and ABI/library total.

The first helper incorrectly demanded complete raw-export identity:
**39 checks passed / 3 failed**, exit 1, preserved in comparison-first-failed.json.
Investigation found the installed Expo serializer
`node_modules/@expo/metro-config/build/serializer/exportHermes.js:65` creates
`expo-bundler-${Math.random()}-${Date.now()}/index.js` under local TEMP.
Hermes embeds that source filename in debug metadata. The before filename is 140
bytes; after 141. This accounts for the **entire +1 raw byte**, without a code or
asset change. It is not evidence of an app size regression or optimization.

Strict corrected comparison: validate the known filename prefix and random/
timestamp grammar, exactly one such path, both original valid SHA1 footers,
embedded source hashes, total-length fields and both filename-length fields.
Only the source filename bytes, length fields at offsets 32/9,283,496/9,283,512,
and final 20 checksum bytes are normalized in memory. Every remaining byte must
match. Actual exported files remain untouched. A deliberately corrupted non-debug
byte is still rejected by the equality check. **FRESH 96/96 passed, 0 failed**,
not a relaxed product gate or deletion of a failing application assertion.
Canonical comparison SHA256 for both is
`2025faa93930b9c710504526fa9b56555c4751540834787739222b464a5912a3`;
embedded Hermes source hash is
`3392e47acb970662cdfc1816559d66558d224d54`. The raw bytes/hashes above remain
primary; canonical values are diagnostic, not rebuilt APK or savings evidence.

Tool-identity.json pins installed Hermes compiler 250829098.0.17, actual local
hermesc.exe SHA256
`998c85044f67c6bb68038c318dfdcd97285bc3bcaec53e29dda05fc257c1661b`,
serializer/CLI/network-guard hashes and --version output (HBC 98). No package or
compiler changed. Full font-file equality additionally preserves all 2,926 glyphs
per Inter font and 4,045 in Material Symbols; font-coverage.json records cmap table
hashes and lengths. No font coverage or media-quality trade is taken.

This is a reproducible unchanged-source local comparison, with an explicitly
explained non-deterministic debug filename. Native rebuilt-APK savings are
**NOT RUN / UNVERIFIED (owner to confirm)**. Neither Metro export bytes nor
historical owner 117 MB can substitute for an equivalent newly built native APK.
Physical startup/rendering/RAM, active OTA identity, authenticated browser and
production outcomes remain owner checks. Final mandatory root gate and closure
are recorded below after completion.

## Final local verdict and gate ledger

**PASS for mandatory AS1 LOCAL scope; justified no-source-change verdict.**
Rows 0, 1a, 1b, 2, 3, G, C complete. Acceptance freeze 1831c8c2; measured decision
1320404c; final documentation commit is recorded by Git and PBR-AS1.status.
Runtime/config/assets/packages are unchanged from ecf4c5ed. Local evidence does
not establish native savings, physical acceptance or beta/release readiness.

Every successful row below is **FRESH**, not reused from LP1/MB1. Forced Turbo
gates have 0 cache hits; compiler/Metro/OS caches may remain warm. All commands
use the guarded offline runner, repo-local temp and local-only Turbo cache.
Only documentation HEAD advanced during these gates; command timestamps/HEADs,
exits/log paths are in commands.jsonl. Wall times are command cost, not latency.

| Exact command | Result | Seconds |
| --- | --- | ---: |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 38-file Android offline JS/assets export; not a native build | 136.846 |
| `npm run test --workspace @stay-focused/mobile -- src/features/redesign/overnight-clock.test.ts src/features/redesign/DayOrb.test.ts src/features/export/saveStudyFile.test.ts --maxWorkers=1` | 37 passed / 3 files / 0 failed / 0 skipped | 4.921 |
| `npm run test --workspace @stay-focused/shared -- src/study-export --maxWorkers=1` | 11 passed / 1 file / 0 failed / 0 skipped | 2.043 |
| `npm run test --workspace @stay-focused/shared -- --maxWorkers=2` | 716 passed / 74 files / 0 failed / 0 skipped | 15.180 |
| `npm run test --workspace @stay-focused/mobile -- --maxWorkers=2` | 1,658 passed / 174 files / 0 failed / 0 skipped | 63.937 |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2,455 passed / 214 files / 0 failed / 3 existing live skips | 167.875 |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | 47.302 |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings | 89.349 |
| `npm run build --workspace @stay-focused/api` | 37/37 static pages; 18 workflow steps / 1 workflow | 124.792 |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 38-file Android offline JS/assets export; not a native build | 61.124 |
| `npm run build -- --force --concurrency=1 --env-mode=loose` | 8/8 tasks, 0 cached; API 37/web 23; Android/iOS/web offline JS/assets exports | 360.777 |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | 45.329 |

Full relevant suites: **4,829 passed / 0 failed / 3 existing live skips**.
Shared 716 includes 37 source and 37 pre-existing emitted-copy files; this is not
716 unique source assertions. API skips are the existing 1 live activity + 2
live quiz cases; no new skip, failed product assertion or observed flake.
Focused 48 passes are additional, not double-counted. Full mobile includes the
existing ring-orb-spin Inter weight/accessibility/plain-text-fallback cases.
Reference 67 and artifact-comparison 96 checks are additional evidence checks.
Existing Vite native-config, React test renderer, Expo color warnings and five
mobile import-order + one web unused-useMemo lint warnings are retained.

First failures are retained, not relabelled successful: initial Android export
exit 1 before Metro (guard's workspace-relative require); focused Vitest exit 1
before test execution (Vite saw environment-file existence before denied read).
Corrected only ignored guard path/visibility/ESM handling; successful reruns are
above. No environment content was opened or modified. First artifact verifier
39 pass/3 fail on raw HBC equality is retained; exact metadata attribution and
strict 96-check correction are explained above. Read-only Python alias/Windows
wildcard/guessed-path discovery failures used installed Node/discovered paths,
without installs or product changes. attempts.json and original logs remain.

Standalone web tests/build: **NOT APPLICABLE**, no web/shared behavior change;
mandatory root build includes web 23/23 pages. Workflow/provider-live/remote SQL,
native release build/install, physical/authenticated-browser/production tests,
rollout and Device checks: **NOT RUN**, expressly outside scope. Existing full
API tests use local adapters/PGlite, not a remote database. Generated Next
ambient declarations were inspected and restored to the original tracked
baseline; final forced typecheck verifies that restored source.

Final ownership/custody, build identities and evidence-index hashes are added
below after the local closure check. No generated/private fixture, export,
log, APK, local Android project or tmp path is committed. No new ADR is needed.

**Owner steps remaining**: all rollout/device/rebuilt-native measurements and
live outcomes remain NOT RUN / UNVERIFIED (owner to confirm), as frozen above.
Review AS1 actual local PASS before approving LR1; do not publish it here.
MB1/LP1 remain complete; RT1/EV1 STOPPED and physical RT2 INCONCLUSIVE/deferred
stay intact, OX2 remains blocked on OX1 and unrelated roadmaps/Owner Pause stay
preserved. No controller/queue/predecessor status change. Vercel CLI is absent;
strongly recommend npm i -g vercel for separately authorized future tooling.
Installation and Vercel commands are NOT RUN in this scope.

Final custody/build verification: **FRESH 46,237/46,237 passed, 0 failed**, including
46,212 unchanged original path-keyed hashes (inherited Windows path aliases
can name the same file). All historical planning text and the full previous
handoff prefix are preserved, with no new replacement characters and only five
owned Markdown paths. API build ID P55gH1yFsCDvegNGsGeRa; web build ID
tSMVzJuotFgjdh_dxWwL-. Root mobile export: 84 files /
35,320,693 bytes across Android/iOS/web; individual hashes are in verification.json.
These are local build/export identities, not deployed revisions or native APKs.
Final staged/unstaged diff hygiene is checked at the scoped local commit boundary.

Final documentation/index review: **FRESH 28/28 passed, 0 failed**. Both
`git diff --check` and `git diff --cached --check` pass at the final scoped
commit boundary. Original failures, raw inventories, per-file hashes and exact
command results are indexed by ignored tmp/overnight/PBR-AS1/SHA256.json.
