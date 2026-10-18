# Android release runbook

Use this from the private source repository root for the fullsend APK path.
The public distribution repository is
[`galaxymaxp/stay-focused-releases`](https://github.com/galaxymaxp/stay-focused-releases).
Publish only public APKs and plain release notes there; source stays private.
See [ADR-051](../adr/ADR-051-android-release-distribution.md) for the policy and
[mobile device setup](mobile-device-runbook.md) for local validation.

## Choose OTA or a native APK

- **OTA only:** JavaScript/assets compatible with the installed native runtime.
  Use the existing guarded preview OTA command below. Keep the same runtime;
  do not create a GitHub release because there is no new APK.
- **Native APK:** new/changed native modules, native configuration, or a runtime
  change. Update `expo.version`, `expo.android.versionCode`, and **every**
  `runtimeVersion` occurrence in `apps/mobile/app.json` (currently root and
  Android). Use an increasing versionCode and a new runtime for native changes.
  Build an APK, verify its actual metadata, then publish it using this runbook.

For an OTA on preview (the wrapper validates the EAS preview environment before
running `eas update --channel preview --environment preview --platform android`):

```powershell
npm run update:preview --workspace @stay-focused/mobile -- --message "Describe the JS change"
```

Do not use a bare `eas update` for preview. Do not run any build, OTA or publish
command during a code-only unattended run. These are owner rollout commands.

## Fullsend APK path

1. Complete the code checks and public What's new text. Write a non-empty UTF-8
   notes file under `.local/releases/`, with no credentials, private content or
   `versionCode:`, `runtime:` or `minSupported:` lines. The script generates
   those reserved lines. Do not commit artifacts or generated notes.
2. Bump the version/name/code/runtime settings described above and review the
   diff. Check `apps/mobile/eas.json`: preview must build `apk`, using preview's
   channel/environment and the intended HTTPS API origin.
3. Build the real native APK (owner action):

   ```powershell
   eas build --platform android --profile preview
   ```

4. Get the HTTPS EAS artifact URL and inspect the **built APK**, rather than
   assuming its versionCode equals app.json. With Android SDK tools available,
   `apkanalyzer manifest version-code <downloaded.apk>` and
   `apkanalyzer manifest version-name <downloaded.apk>` read the built manifest.
   Confirm the runtime against the build's Expo configuration/metadata as well.
   `cli.appVersionSource` is `remote`, so EAS may own the actual versionCode;
   app.json is only a default and must match unless deliberately overridden.
5. Run this **dry run first**, substituting the verified values (the placeholders
   are not literal arguments):

   ```powershell
   npm run release:apk -- --apk "<HTTPS EAS artifact URL>" --version-name "<built versionName>" --version-code "<built versionCode>" --runtime "<built runtimeVersion>" --notes-file ".local/releases/whats-new.txt"
   ```

   The script validates local configuration, notes, and the exact shared parser,
   prints the `gh release create` argv as a JSON array plus generated notes, and
   performs **no download, file write or GitHub call**. It accepts a local `.apk`
   path too. A dry run validates existence/extension of a local APK; publish
   additionally requires nonzero bytes. It does not inspect the APK manifest,
   verify the URL exists, or authenticate `gh` for you.

   A version/name/code/runtime flag differing from app.json fails by default.
   Only after checking the actual built values, add
   `--allow-app-json-mismatch` for a deliberate remote-versioning discrepancy.
   Pass `--version-code` explicitly on every real release even if it matches.
6. Review the full argv, target repository, version/code/runtime, What's new,
   and optional minimum support threshold. Authenticate `gh` with permission to
   create releases in the public distribution repository. Repeat the exact
   reviewed command with **`--publish`** appended (owner action):

   ```powershell
   npm run release:apk -- --apk "<HTTPS EAS artifact URL>" --version-name "<built versionName>" --version-code "<built versionCode>" --runtime "<built runtimeVersion>" --notes-file ".local/releases/whats-new.txt" --publish
   ```

   Only publish mode calls `gh release view <tag> --repo <repo>` first. An
   existing release or uncertain lookup fails closed. For a URL, it streams the
   artifact through HTTPS-only redirects to
   `.local/releases/stay-focused-<versionName>-<versionCode>.apk`, checks nonzero
   bytes, writes generated notes, then calls `gh release create` with asset label
   `stay-focused-<versionName>-<versionCode>.apk` and title
   `Stay Focused <versionName>`. It uses no shell command string.
   `--repo owner/repository` overrides the default for an intentional alternate
   destination; the current API accepts assets only from the default repository.
7. If a run fails, inspect the tag and `.local/releases/` before retrying. Existing
   artifacts/partial files/notes are preserved rather than overwritten. Confirm
   their origin before removing only a failed local attempt or choosing a local
   APK input. Never overwrite/delete a published release or retry blindly after
   a create error: the server may have accepted it. Correct a published mistake
   by building a real new APK with a higher code and publishing a new tag.

## Minimum supported version

Omit `--min-supported` by default. Set it only when the older runtime can no
longer receive OTAs or an API change breaks that older app. It is a positive
versionCode, at most the new APK's code. Example: `--min-supported 7` means
installed codes below 7 receive the required-update sheet while online. A
routine optional update does not justify forcing students to install it.

The shared parser owns this format; the script imports it directly using the
repository's Node >=22.13 runtime, without new dependencies:

```text
tag: v2.2.0+6

versionCode: 6
runtime: 2.2.0-sdk57

Plain What's new text.
```

This is a format example, not an instruction to republish the existing tag.
When supplied, `minSupported: N` goes after runtime and before the blank line.

## Owner verification after release

1. Confirm the public release's tag, title, generated metadata and APK filename
   match the real built artifact. Never create a fake release to test a banner.
2. Check the deployed API `GET /api/app/latest-release`: verify versionName,
   versionCode, runtimeVersion, apkUrl, releaseUrl, notes and optional minimum
   support. Allow the ten-minute API process cache and five-minute response
   cache to refresh; failures can serve stale data or 204.
3. Open the public website `/download`, confirm the same version/notes, and
   verify the Download APK action and QR reach that public APK. Install over an
   existing signed build to check data retention and signing compatibility.
4. On an older real install, use Settings > About > Check for updates (bypasses
   the automatic twelve-hour throttle). The optional Today banner appears for
   a higher versionCode with a different or missing runtime; builds on the same
   runtime use OTA. Below a deliberate minSupported threshold, verify the
   required sheet online and that offline Library remains available.
5. Record the real build/tag/device evidence in the release handoff. RB7 API/web
   deployment, checker OTA and physical-device acceptance remain Fely's lane.

Local script verification (no external services):

```powershell
npm run test:publish-apk-release
npm run test --workspace @stay-focused/shared
```
