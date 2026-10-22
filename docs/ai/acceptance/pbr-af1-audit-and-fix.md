# PBR-AF1: renewed pre-beta audit and supported local repairs

## Frozen scope and evidence contract

2026-10-23. Initial source `859590308b16afbabd4b454b0741565e5972dbcf`,
branch `overnight/2026-10-15_feedback`; tracked tree clean, local upstream
snapshot 4 ahead / 23 behind `github/main` (no fetch). Preserve untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored evidence.

Owner direction read in full from runner answer
`chatgpt-owner-1792691511294-971f0f34-866c-4ea9-856b-57750399b31c.md`
(2026-10-22T17:51:51.302Z): renew audit, reproduce/diagnose/repair/verify in
one task, save evidence immediately, record unreproduced findings honestly.
This scope depends on PBR0. PBR-RT1 stays STOPPED; PBR-MB1, PBR-LP1,
PBR-AS1 and PBR-LR1 stay HELD, not started or automatically advanced.

Read root AGENTS/AUTOPILOT, active planning checkpoints, PBR0 and PBR-RT1
acceptance, latest handoff, runner BACKLOG PBR sections and queue/137.
No nested AGENTS found under tracked application/package paths. Historical
scaffold/design files and unrelated OX/parity work are excluded.

Mandatory local rows frozen before runtime edits:

| Row | Requirement / owning layer | Proof needed | Initial result |
| --- | --- | --- | --- |
| I0 | Exact source, binary, OTA and export boundaries | Git/manifest/local artifact inventory; historical release reports distinguished | Source matches; inventory pending; live state UNVERIFIED |
| B0 | Resume/render: DayOrb, DayRingClock, AppLifecycle, navigation/Appearance | Source recheck and bounded local probe; separately identify missing native proof | Existing replacement-GL repair present; FS7 unresolved |
| B1 | Web/mobile/API experience and existing optimizations | Current source plus offline synthetic repository counts; no production percentile inference | Pending |
| D1 | API Library: `apps/api/src/lib/experience/repository.ts` | Synthetic 0/100/240/300 and large superseded history, exact count/equivalence/failure boundaries | Pending |
| D2 | Mobile Library: `apps/mobile/src/features/redesign/useLocalLibrary.ts`, `apps/mobile/src/services/localLibrary/{librarySync,artifactStore}.ts` | Synthetic read/progress counts; retain failing proof before any repair, owner/cancel/offline/final state regressions | Pending |
| S1/S2 | APK/export/assets and imports | Read existing APK/archive and source/export separately; no native build or APK savings claim | Pending |
| R1 | Long reviewer: `apps/mobile/src/features/reviewer/ReviewerReader.tsx` and discovered web equivalent | Synthetic complete-content/search/anchor/render audit; measured versus inferred costs | Pending |
| O1/A1/U1 | Remaining PBR0 image/AI/polish findings | Bounded current-source recheck; avoid unrelated LC1/OX scope | Pending |
| G | Focused reproductions, relevant full suites and serial forced gates | Fresh exact counts, first failures, cache results, offline guarded builds and diff hygiene | Pending |
| C | Final acceptance, planning/handoff and scoped local commits | All mandatory local audit/repair rows complete; native limitation explicit | Pending |

Only demonstrated in-scope local causes receive the smallest complete repair,
cause-specific regression and identical-fixture before/after measurement.
Unsupported native fixes, architecture/native release changes, installs, remote
services/SQL, environment edits, device operations and rollout are excluded.
No new index, telemetry service, provider, font/module/ABI removal or content cap.
No test duration establishes physical latency or native pixels.

## Durable evidence index

New raw logs, probes, measurements and their SHA256 index are saved immediately
under ignored `tmp/overnight/PBR-AF1/`. Progress is appended to
`tmp/overnight/PBR-AF1.progress` after each step/finding. No generated/private
artifact is committed. Findings below will include UTC timestamp, identity,
command/fixture, observed/expected, owning code, confidence, failing proof,
next action and verification. This report and progress suffice to resume.

## STEP 0 checkpoint

PASS for local baseline inspection. No source contradiction found. Source
manifest remains 2.2.0/code6/runtime `2.2.0-sdk57`; historical shipped binary
is 2.3.0/code7/runtime `2.3.0-sdk57`. These identities deliberately differ.
FS7 update `01a162a3-6a63-7318-9a64-4b40789569a1` and later narrower GL
update `01a16304-432c-703e-838e-c4ea04e4b3d9` are historical, not active OTA
observations. Current deployments, active binary/OTA, database/applied migration,
queue, Scheduler/provider state: **UNVERIFIED (owner to confirm)**.

Scripts inspected: Next builds, mobile `expo export`, Vitest, shared TypeScript
and engine offline evaluations. Release/update/worker/live-validation scripts
will not run. Inspected PBR0 loopback-only Node network guard and local temp
runner; new runner will additionally use npm offline, Expo offline, disabled
telemetry and local Turbo cache only. Gates run serially.

## Owner steps remaining

Rollout and Device checks: **NOT RUN**, skipped entirely by unattended rules.
Pinned native reproduction/attribution and authenticated live acceptance remain
owner work; no local PASS will close PBR-RT1 or establish beta/release readiness.
