# ADR-051: Android APK and OTA distribution

Date: 2026-10-19. Status: accepted for UC3 local implementation.

## Context

UC1 reads public release metadata and UC2 provides the website download page.
The source repository is private, so its release assets are unsuitable for
public installation. OTA only reaches compatible installed native runtimes.
A repeatable publisher must emit exactly the metadata the checker reads.
ADR-051 is the next free numbered ADR across `docs/adr/` and
`docs/architecture/` at baseline `0037a3a`.

## Decision

Keep application source private. Distribute real Android APKs through the
public releases-only `galaxymaxp/stay-focused-releases` repository; never put
source, credentials, or private academic content there. Compatible JS/assets
use the existing guarded OTA process on the same runtime. Create a GitHub
release only for a newly built APK, never for an OTA-only change or fake test.

`packages/shared/src/app-release.ts` owns the tag/body contract:
`v<versionName>+<versionCode>`, `versionCode: N`, `runtime: X`, optional
`minSupported: M`, a blank line, then plain What's new text. The Node ESM
publisher imports these parsers directly, checks round-trips including notes,
and labels the asset `stay-focused-<versionName>-<versionCode>.apk`. Reserved
metadata lines are forbidden inside user notes because the reader strips them.
`--repo` can select an alternate destination, but UC1's URL validator remains
restricted to the default public repository.

Publishing defaults to dry run: validate and print the exact argv/notes without
files, downloads or GitHub calls. Explicit `--publish` checks that the tag is
absent, streams HTTPS artifacts with bounded redirects/time, requires nonzero
bytes, and creates the release using `execFile` argv, never a shell string.
Only an explicit missing-release result permits creation; uncertain lookups
fail closed. Releases are **never overwritten or deleted**. An uncertain create
failure requires inspecting the tag before retrying. Local artifacts and notes
are also exclusively created to protect earlier attempts.

Defaults come from `apps/mobile/app.json`; mismatching version/name/code/runtime
flags require `--allow-app-json-mismatch`. Root and Android runtime settings
must agree. `apps/mobile/eas.json` currently has `cli.appVersionSource: remote`,
so **EAS may own versionCode**. The owner must inspect the **built APK's actual
versionCode** and pass it explicitly to the publisher, even when it matches the
default. app.json is only a default that must match unless deliberately
overridden after verification. The script does not extract an APK manifest or
claim it has verified artifact signing/content. Preview builds are APKs;
changing that profile invalidates this release path until reviewed.

Set minSupported only when the older runtime can no longer receive OTAs or an
API change breaks it. Omit it for routine optional updates. It must be a
positive code no greater than the published APK's code. UC1's online-only gate
and offline Library behavior remain unchanged.

## Consequences and verification

Future fullsend native releases follow the
[Android release runbook](../dev/android-release-runbook.md). Native changes
bump version, code and all runtime occurrences, then build preview and publish
the real APK. Same-runtime JS updates use OTA and leave GitHub releases alone.
Immutable release metadata ties the checker and download page to the exact APK.

Unit tests inject gh/download/fetch operations; no real GitHub publication or
provider access is needed for local validation. Public release availability,
deployed API/website revisions and physical install/update behavior remain
**UNVERIFIED (owner to confirm)** during this unattended code-only run. RB7
rollout/device acceptance and first real use of publish mode belong to Fely.

Related: [ADR-050](ADR-050-app-update-checker.md).
