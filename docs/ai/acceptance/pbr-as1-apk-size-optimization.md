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
**1,092,410 bytes**. Each ABI has27 libraries, all stored uncompressed:
arm64-v8a24,860,944; armeabi-v7a17,151,772; x8626,109,856;
x86_6425,517,240 bytes. ABI support is required, not removable overhead.
Five packaged TTFs total2,004,756 raw /932,190 compressed bytes; exact hashes
and obfuscated resource names are in `apk-before.json`. There are0 duplicate
entry names and40 groups of byte-identical payloads; their references and
resource qualifications must be examined before inferring removable duplicates.
No signature/certificate entry contents are read or extracted by the helper.

Tracked source asset inventory:65 files /5,646,237 bytes across mobile assets,
web public and shared assets, including platform copies and branding sources.
This is not APK contribution. Current app manifest remains **2.2.0/code6 /
runtime2.2.0-sdk57**, distinct from the archived **2.3.0/code7** release.
Local installed Node24.16.0/Expo57.0.30/RN0.86.3/Next15.5.27 tool identities
are recorded, rather than inferred as the archived binary's dependencies.

## Measurement and safety contract

New helpers, fixtures, logs, copies and hashes live only in ignored
`tmp/overnight/PBR-AS1/`. `identity-before.json` records46,216 original
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
Initial guard checks3/3 PASS (environment-read denial, outbound fetch denial,
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
representative per group, repeated payloads account for 50,448 raw /28,005
compressed entry bytes, excluding headers. These are identity counts, **not
removable bytes or achieved savings**: nine groups are Commons Codec named
language tables and31 groups are Android resources (including qualified color,
XML, PNG and nine-patch paths). Resource IDs, qualifiers and library lookup names
can require distinct entries despite byte equality. There are no duplicate names,
fonts, native libraries or assets entries. No resource-table rewrite/exclusion
or dependency patch is justified by equality alone.

The fresh Android export has 36 assets +1 HBC +metadata =38 files,
14,671,618 bytes. Its 36 assets total 3,719,720 bytes: TTF2,001,440,
PNG1,684,855, WAV32,806, XML619. HBC is10,949,445 bytes and metadata2,453.
No duplicate emitted payloads. All11 local literal asset/config references
resolve; all9 non-JSON payload references match exactly one emitted file.
The two JSON imports are code inputs, not omitted downloadable assets.
references.cjs uses the installed TypeScript AST, actual metadata and SHA256,
with **FRESH67/67 checks passed,0 failed** in reference-audit.json.

- clockFonts.ts requires all three Inter weights (1,030,596 raw bytes).
  DayRingClock.CenterReadout uses600 for mode labels,700 for time and500 for
  duration; System is a load-failure fallback, not an equivalent replacement.
  The full TTFs match both export and archive hashes (res/Ih.ttf, res/Lp.ttf,
  res/kZ.ttf), totaling497,937 compressed APK bytes. The GL clock atlas only
  contains canonical clock glyphs; it cannot replace label/font coverage.
- DayOrb loads the40,796-byte local clock atlas and retains plain-text/poster
  fallback when its local asset/GL frame fails. CanvasSyncScreen explicitly
  shows the1,621,928-byte bundled tutorial with its accessible six-step label.
  Both remain available offline. These PNGs have no exact payload-hash match in
  the older archive, so no source-to-archive PNG subtraction is claimed.
- Four feedback WAVs total32,806 bytes and match archive/export hashes exactly.
  Deleting or recoding them would change media/feedback behavior, not a free
  optimization. Native app/adaptive/monochrome icons are config references;
  unused source branding and platform copies are not automatically APK payloads.
- Material Symbols regular970,844 raw /431,959 compressed APK bytes matches the
  installed full font and emitted payload. Expo Router's native-tabs Android
  materialIconConverter imports expo-symbols; its utils selects the regular
  font. Replacing Router internals, subsetting glyphs or deleting a dependency
  font violates required compatibility/coverage without additional proof.
  The fifth small APK font is3,316 raw /2,294 compressed bytes; it is not
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
