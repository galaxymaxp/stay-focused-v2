# UC3 APK release pipeline acceptance

Finite scope: UC3 STEP 0-4, local tests/gates/docs/commits only, baseline
`0037a3a` on `overnight/2026-10-15_feedback`. UC1 and UC2 prerequisites match
the implementation; only expected owner paths are untracked. No later slice.
Rollout and Device checks are excluded. No publish mode may execute here.

| Requirement | Layer | Proof needed | Result |
| --- | --- | --- | --- |
| Strict flags, app.json defaults and explicit mismatch guard | script | Node unit tests | FRESH PASS, included in 27/27 |
| Exact shared tag/body parser round-trip | shared/script | Direct parser imports and v2.2.0+6 fixture | FRESH PASS, 27/27 Node and 590/590 shared tests |
| Dry run prints argv/notes without mutation, gh or network | CLI | Subprocess, dependency traps and required empty APK dry run | FRESH PASS |
| Stream HTTPS APK, refuse existing/uncertain tags, no overwrite | script | Injected runner/download tests only | FRESH PASS, included in 27/27 |
| Native versus OTA, verified built code, minimum support policy | documentation | Runbook and ADR-051 source review | FRESH PASS |
| Prompt gates and repository build | repository | Fresh local commands and counts | FRESH PASS, 8/8 prompt gates; extra root build 8/8 tasks, zero cached |

Live release/APK, deployed revisions, remote-ref freshness, database/Scheduler
and physical-device state are **UNVERIFIED (owner to confirm)**.

## Implementation

`scripts/publish-apk-release.mjs` is Node ESM with no new dependencies. It
imports the exact TypeScript release parsers with the repository's supported
Node type stripping. It validates all flags and round-trips the generated tag,
metadata and plain notes; it refuses reserved metadata within What's new.
Defaults are app.json's 2.2.0 / 6 / 2.2.0-sdk57, with an explicit mismatch
override for verified EAS remote versioning. Root/Android runtimes must agree.

Dry run prints a JSON argv array and generated notes without mutations or
external operations. Publish logic uses execFile, refuses existing or uncertain
tags before writes/downloads, streams only HTTPS redirects, uses bounded time
and exclusive file creation, rejects empty bytes, and sanitizes provider errors.
It never replaces/deletes releases. All publishing paths were exercised with
injected fakes only; no real gh runner or network request executed in tests.

The required local empty-APK dry run exits 0 and prints v2.2.0+6; this validates
the publication plan, not an actual APK, GitHub release or artifact URL.
Tests create disposable fixtures under repository-local TEMP/TMP, not private
fixtures or external directories. No APK or validation output is committed.

The new [runbook](../../dev/android-release-runbook.md) is the fullsend APK
path, linked from the existing mobile device runbook. It requires reading the
actual APK versionCode explicitly because EAS appVersionSource is remote,
distinguishes same-runtime OTA from native distribution, explains minSupported,
and provides owner API/download/banner verification. [ADR-051](../../adr/ADR-051-android-release-distribution.md)
is next free across both ADR folders. No mobile implementation, API, migration,
dependency, version/runtime, credentials or provider behavior changed.

## Verification - PASS

All checks run locally with live flags disabled process-locally, repository-local
TEMP/TMP, outbound HTTP/fetch guard and offline/no-telemetry build settings.
Logs/exit markers are ignored under `tmp/overnight/UC3.*`.
Evidence applies to final implementation `7e6f274` / `ece3721` and runbook/ADR
`1dc1c20`; checks ran against those same final files before their scoped commits.

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, zero cached |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, zero cached; six existing warnings, zero errors |
| `npm run test:publish-apk-release` | FRESH PASS, 27/27 tests, zero skips |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 590/590 tests, 56 files; includes existing emitted copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS, 2404 passed / 3 intentional live skips, 210 files |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 36/36 static pages; latest-release stays dynamic |
| Additional `npm run build -- --force --env-mode=loose` | FRESH PASS, 8/8 tasks, zero cached; API 36/36 and web 20/20 static pages, local Android/iOS/web exports |
| `node scripts/publish-apk-release.mjs --apk .local/uc3/validation.apk --notes-file .local/uc3/notes.txt` | FRESH PASS, empty named APK, exit 0, v2.2.0+6 argv and generated metadata |
| `git diff --check` and `git diff --cached --check` | FRESH PASS, zero whitespace errors |
| Additional `node --check` on both new scripts | FRESH PASS, 2/2 syntax checks |

**8/8 prompt gates pass**, plus the additional forced root build. No failed
first test/gate attempts or nondeterministic flakes. Initial
27/27 passed; final focused reruns followed a Node 22 warning-tolerance change
and cancellation cleanup coverage, and also passed. Existing warnings: six lint
warnings, Vite native-config compatibility warning, and build color-environment
warnings. These did not fail a command. LF/CRLF normalization notices are not
whitespace failures. Build-generated API/web Next ambient declarations were
restored to baseline and excluded from commits. One documentation patch failed
atomic validation because its expected table label differed; no files changed,
and the corrected patch succeeded. This was not a test/gate failure.

Mobile application tests, workflow/provider contract/live smoke suites and
browser QA are **NOT APPLICABLE** to this script/docs slice; no mobile or web
implementation changed. Root build's local platform exports are additional
build proof, not physical-device acceptance. Publish mode, rollout and device
checks are **NOT RUN**, as explicitly excluded. No external-service validation
or actual APK-content/signing verification is claimed.

## Commits and closure

- `7e6f274 feat(scripts): publish APK releases to the public releases repo`
- `ece3721 test(scripts): cover APK release publishing`
- `1dc1c20 docs: android release runbook and distribution ADR`
- `docs: complete UC3 release pipeline handoff` is the final documentation
  checkpoint; its final hash is recorded in Git and `tmp/overnight/UC3.status`.

All commits use author `galaxymaxp <omgraythekid@gmail.com>`. Current state,
roadmap and sprint are reconciled: UC roadmap code scope is complete, RB7 is
Fely's rollout, and this run stops at UC3. Expected owner paths `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` are untouched and unstaged. No
environment-file modification, migration application, deployment, remote SQL,
Scheduler operation, service call, email or push occurred.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** RB7 API/website deployment and
  checker OTA belong to Fely. At the next real native build, follow the new
  runbook and review its dry run before `--publish`. No fake test release.
- **Device checks - NOT RUN, skipped entirely:** verify the real APK install,
  API metadata, `/download`/QR, Settings About and older-install banner/required
  sheet, including offline Library behavior and retained data/signing.
- Confirm real public tag/APK, EAS built manifest/runtime, deployed revisions,
  remote refs and production database/Scheduler/device state:
  **UNVERIFIED (owner to confirm)**. UC2's showcase push/PR remains owner work.
- For later owner Vercel operations, installing its missing CLI with
  `npm i -g vercel` is strongly recommended. It was not installed or invoked here.
