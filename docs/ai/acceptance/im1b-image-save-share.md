# IM1b image saving and Android Share

**PASS for the local unattended code scope.** Implementation commits: 1959a0e (mobile/shared), d8544f9 (website). The documentation checkpoint carrying this report is listed with its exact hash in tmp/overnight/IM1b.status. Physical and production acceptance remain owner steps.

Scope: IM1 STEP 0-4, local tests/builds, documentation and atomic local commits.
No rollout, device checks, remote service calls, remote SQL, environment edits or push.
Baseline: b972c5e on overnight/2026-10-15_feedback; tracked tree clean, owner
untracked UI/, apps/mobile/.gitignore and supabase/.temp/ preserved. SA2 and MR2 PASS.

The previous STEP 0 evidence in [IM1](im1-image-save-share.md) is reused.
Owner answered the permission contradiction: Android uses Stay Focused;
iOS uses add-only saving directly to Photos and never album operations.
Installed SDK bundledNativeModules selects ~57.0.5; no further contradiction.

| Requirement | Owning layer | Proof / current result |
| --- | --- | --- |
| Compatible native dependency/plugin, no other upgrades | Mobile manifest/config/lock | FRESH SDK source + minimal dependency diff; npm ls confirms 57.0.5 |
| Android album, iOS add-only without album queries | saveImage | FRESH mocked branch/permission/repeated-save tests pass; native source supports direct named-directory insertion |
| Denial/settings, failed download cleanup, attribution/name | Mobile/shared helper | FRESH denial/settings, HTTP/download/non-image/empty, local-copy, MIME, attribution and portable filename tests pass |
| Save beside Ask in all three zoom viewers | Mobile viewers/reader | FRESH rendered viewer action and exact download metadata tests pass |
| Owner website download, same filename, shared exclusion | SectionVisual/download helper/shared viewer | FRESH Blob/name/cleanup, all three viewer actions and shared boundary tests pass |
| Android Share online/saved, offline disabled, canonical server id | Reader + Share menu | FRESH Android reader gate and menu disabled/owner-switch tests pass |
| Missing clipboard module cannot break menu | Share menu | FRESH throwing module-factory and rejected clipboard tests pass; link remains visible and system share invoked |

## Implementation evidence

- Mobile save permission/destinations: saveImage.ts:15/41/45. Direct Android
  initial-file album creation avoids the read-permission guard on getAlbumAsync;
  AlbumUtils.kt:137 reuses the named directory. iOS never calls an album API.
- Save action: SourcePageSnapshot.tsx:127, SourceFigures.tsx:87,
  ExternalVisual.tsx:53. ReviewerReader.tsx:405/409/413 supplies actual titles.
  Signed snapshot/figure URLs and Wikimedia identification headers are retained.
- Owner web: section-visual.tsx:153; reviewer-reader.tsx:411 supplies titles;
  download-image.ts fetches a Blob with omitted credentials and no referrer,
  assigns the shared filename, then removes/revokes temporary resources.
  shared-reviewer.tsx imports no download helper or private visual component.
- Share: ReviewerReader.tsx:375 still requires a canonical artifact server ID.
  ShareReviewerMenu.tsx:79 loads clipboard inside a guarded dynamic import;
  both share creation and Copy fall back to the system sheet and safe ready copy.
  Existing offline notice and disabled menu remain. SH1 ownership/content rules
  and prior features are unchanged.

## Fresh serial gates

All commands run locally with TEMP/TMP under tmp/overnight/local-temp. No cached
task is counted as fresh. Local logs stay under tmp/overnight and are not committed.

| Command | Result |
| --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| npm run test --workspace @stay-focused/api | FRESH PASS, 197 files; 2,257 passed / 3 existing live skips; live opt-in disabled |
| npm run test --workspace @stay-focused/mobile | FRESH PASS after documented mock correction and final false-return regression, 120 files; 1,119 passed |
| npm run test --workspace @stay-focused/shared | FRESH PASS, 37 files; 337 passed (includes existing emitted copies) |
| npm run test --workspace @stay-focused/web | FRESH PASS, 30 files; 179 passed |
| npm run build --workspace @stay-focused/api | FRESH PASS, 1/1 build; 34/34 static pages |
| npm run build --workspace @stay-focused/web | FRESH PASS, 1/1 build; 19/19 static pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS on final code, 1/1 export; 1 Android bundle / 35 assets |
| npm run build -- --force (AUTOPILOT) | FRESH PASS, 8/8 tasks, 0 cached; 2m15.884s; API/web/mobile and library builds |
| git diff --check and git diff --cached --check | FRESH PASS, 0 whitespace errors at scoped commit checkpoints |

## Attempts

- Focused mobile first: 50 passed / 5 failed, 6 files. Existing SourceFigures
  icon mock lacked Download; mock extended without changing product behavior.
- Focused mobile second: 81 passed / 1 failed, 8 files. New offline assertion
  tried to stringify a circular React prop; changed it to inspect Notice text.
- npm install used --ignore-scripts --no-audit --no-fund and the SDK-compatible
  ~57.0.5 version. Unrelated npm lockfile churn was removed; only the dependency
  and its package entry remain. No other dependency upgrade.
- First full mobile suite: 1,117 passed / 1 failed, 120 files. The new missing-
  clipboard test's system-share mock returned undefined; configure its real
  Promise contract so sheet-failure handling can be tested accurately.
- First lint passed 8/8 with zero cached but introduced import-order warnings in
  two test files. Moved those mocks below imports; final lint passed 8/8, zero
  cached, zero errors and only six existing warnings.
- Final installed-source review confirmed clipboard can resolve false. Treat it
  as unavailable, add a second fallback regression, and refresh forced typecheck,
  lint, full mobile suite and Android export before the required root build.
  Earlier full mobile pass was 1,118; closure is 1,119. No nondeterministic flake.

## Closure

The finite run ends here. Root and external IM1 roadmap, current state, sprint,
ADR-038 and handoff are reconciled. No later item or remote rollout was started.
The original IM1 STOP record remains historical evidence; the owner answer and
this report supersede its pending permission question. Initial scope excluded
all deployment/device work. Tracked changes are intentionally scoped; owner
untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched.
Next.js regenerated the two tracked next-env.d.ts ambient files during builds;
their generated-only differences were inspected and restored to HEAD before
the final documentation checkpoint. No generated build outputs are committed.

## Owner steps remaining

Rollout and Device checks are skipped entirely. New preview APK must include
expo-clipboard and expo-media-library; OTA alone cannot add either native module.
Owner publishes the website and checks realme snapshot/figure/Wikimedia gallery
saves, Share, offline state, permission denial/settings and fallback. Check iOS
add-only saving with no album/full-access prompt. Installed APK contents, actual
native permissions/gallery behavior, live revisions/database/Scheduler/providers
and physical root cause remain UNVERIFIED (owner to confirm).
