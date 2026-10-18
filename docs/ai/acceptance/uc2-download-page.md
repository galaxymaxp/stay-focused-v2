# UC2 download page acceptance

Finite scope: UC2 STEP 0-5, local tests/gates/docs/commits only. Baseline
`c958cc1`, actual branch `overnight/2026-10-15_feedback` retained; prompt's
`overnight/2026-10-13_0132` label is stale. UC1 prerequisites match code.
No production calls, deployments, remote SQL, Scheduler, environment-file
edits or push. Showcase GitHub clone is explicitly permitted read-only access.
Rollout and Device checks are excluded; UC3 is the next separate slice.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Public version/date/notes/APK/QR/install steps | web | Mocked API component tests + local browser | FRESH PASS, download suite 8/8; browser scenarios 9/9 |
| 204/errors/invalid metadata, no invented version | web | Failure response tests | FRESH PASS, included in download suite |
| Public without session, old release redirect, entry links | web | Provider/redirect tests, browser and source inspection | FRESH PASS, provider suite 4/4; browser entry links and redirect |
| Share website download URL | mobile | Native Share mock + config regression tests | FRESH PASS, notice/About 6/6; website 6/6; reviewer-sharing 5/5 |
| Existing showcase CTA links to website, local branch only | showcase | Local diff/build/commit | FRESH PASS, `77dd54b`, clean clone; no push/PR |
| Required prompt and repository gates | repository | Exact commands/counts | FRESH PASS 10/10 prompt gates; extra forced root build 8/8 tasks, zero cached |

Live production/release/device/Scheduler state is **UNVERIFIED (owner to confirm)**.

## Implementation and boundaries

Public `/download` reads the existing same-origin API without auth, validates
UC1's exact shared release shape, and shows one primary APK action. A local QR
encodes the same URL; notes are plain text, clamped to three lines, with an
expansion control. UTC date formatting avoids host-timezone differences.
The existing account menu and shared sign-in/sign-up screen provide entry links.
`/release` redirects; no stale private-repo APK content remains there.
The public theme provider bypasses session initialization for both routes.

Mobile About adds native Share and calm error feedback. The existing website
origin is centralized with reviewer sharing: `EXPO_PUBLIC_WEBSITE_URL` or the
existing `https://stay-focused-ten.vercel.app` default. Invalid configuration
uses `https://github.com/galaxymaxp/stay-focused-releases/releases/latest`.
The showcase's existing CTA is reused without a redesign. Its clone's default
branch is `claude/dazzling-shannon-cn82ol`; `download-link` starts at that default
HEAD (`8ba74b2`), and contains just the scoped CTA/comment change.

No migration, API behavior, native module, runtime version or versionCode change.
QR choice and route decisions are recorded in [ADR-050](../../adr/ADR-050-app-update-checker.md).

## Verification

Results are FRESH for the UC2 implementation (code tip `eef9c67`; checks ran
against the same implementation before its scoped commits). Local outputs/logs remain ignored
under `tmp/overnight/UC2.*`; no artifact, private fixture or credential is committed.

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, zero cached |
| `npm run lint -- --force` | PASS, 8/8 tasks, zero cached; six existing warnings, zero errors |
| `npm run test --workspace @stay-focused/shared` | PASS, 588/588 tests, 56 files; includes existing emitted copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2404 passed / 3 intentional live skips, 210 files |
| `npm run test --workspace @stay-focused/web` | PASS, 363/363 tests, 55 files |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1511/1511 tests, 158 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages; latest-release remains dynamic |
| `npm run build --workspace @stay-focused/web` | PASS, 20/20 static pages, including public download |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, one local Android bundle exported |
| `git diff --check` | PASS, zero whitespace errors; repeated after documentation |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, zero cached; API/web plus local Android/iOS/web exports |
| Showcase `npm run build --prefix .local/showcase-download-link` | PASS, Vite production build; existing large-chunk warning |
| Additional local Chromium check | PASS, 9/9 scenarios; zero page errors and zero external requests |

Local browser proof uses mocked metadata, never a production API. It covers a
390px light layout with no horizontal overflow, desktop dark layout, expansion,
QR rendering, legacy redirect, 204 and network fallback, and both auth entry
links. Screenshots were inspected. The API/provider boundary is proven by UC1's
mocked route tests and the unchanged rewrite; live GitHub/download availability
remains UNVERIFIED. Native OS sharing and actual QR scanning remain owner checks.
The owned local server was stopped after verification.

Workflow/provider/live/device suites are NOT APPLICABLE to this change or
NOT RUN as explicitly excluded; no external-service verification is claimed.

## Failed attempts and limitations

- First typecheck/shared/web gate launches failed before execution because
  Node's preload parser stripped Windows path backslashes. These were harness
  failures, not test failures; each command exited 1 without suite/task counts.
  Changing the process-only preload path to forward slashes fixed the launches.
  The first concurrent ledger append also collided; per-command exit files
  avoid shared writes. Original attempt logs are retained.
- The showcase's first commit failed because its clone lacked committer
  identity. Command-scoped `user.name`/`user.email` plus the required `--author`
  fixed it. No global identity setting changed.
- The first dark screenshot caught the existing surface entrance animation
  near opacity zero. Repeated the local browser check with finite animations
  fast-forwarded for screenshots; the final dark screenshot is readable.
  The application needed no change, and all browser assertions passed both runs.
- Two atomic patch attempts failed validation before modifying files; corrected
  the patches. Exploratory reads of missing test/config/roadmap paths and a
  mid-build generated path were corrected or skipped; no code assumption was
  contradicted. The separate referenced overnight roadmap is not in this
  checkout; UC2's full supplied prompt defines the finite scope.
- npm initially pruned unrelated optional lockfile entries. Restored those
  entries from HEAD and kept only the new QR dependency and its package record.
- Existing warnings: Vite config-loader notice, six lint warnings, Expo's color
  flag warnings, showcase large-chunk warning. No nondeterministic test flakes.
- Live flags are disabled. Test TEMP/TMP is inside the repository. Node-level
  outbound HTTP(S)/fetch is blocked outside loopback for gates; builds use
  offline/no-telemetry flags. Browser routes block all external requests.
  `.env*` files are untouched. Generated Next declarations are restored after
  builds and are not implementation changes.

## Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy the website and API if UC1
  has not been deployed; ship mobile through the existing OTA process. For later
  rollout tooling, installing the Vercel CLI with `npm i -g vercel` is strongly
  recommended; this run installed/invoked no deployment CLI.
- **Device checks - NOT RUN, skipped entirely:** open `/download` on the Realme,
  scan the QR and confirm the APK downloads from the public releases repository;
  verify Settings > About > Share download link and native sharing behavior.
- Confirm production website origin, current public tag/APK and deployed
  revisions. Remote production/database/Scheduler/device state is
  **UNVERIFIED (owner to confirm)**.
- Push the showcase branch and open its PR (commands below); owner chooses the
  final merge/deployment. `--base` matches the clone's actual default branch.
- UC3 release automation is the next separately scoped item, not started.

Run from this repository root, when the owner is ready:

```powershell
git -C .local/showcase-download-link push -u origin download-link
gh pr create --repo galaxymaxp/stay-focused-showcase --head download-link --base claude/dazzling-shannon-cn82ol --title "Link Android download to public website" --body "Route the existing Download for Android CTA to https://stay-focused-ten.vercel.app/download. Preserve the existing showcase styles. Local Vite build and diff hygiene pass."
```

No command in this owner section was executed.

## Commits

- `053beb6 feat(web): add public Android download page and entry links`
- `eef9c67 feat(mobile): share public download link from Settings About`
- Showcase clone only: `77dd54b feat: link Android download to public website`
- Documentation: `docs: complete UC2 download page handoff`; final hash is in
  Git and ignored `tmp/overnight/UC2.status` after committing this report.
