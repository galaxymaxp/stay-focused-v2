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
