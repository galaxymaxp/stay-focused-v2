# Stay Focused V2 - Local Agent Handoff

## Handoff — FULLSEND (20261024-1357)

FULLSEND 20261024-1357: **PASS for publication; 6/6 bounded device checks PASS; broader matrices NOT RUN.**

Source pin `5f6acd275207541bad9a41f314df96e71856a043`; previous main `f626aa8159ed3875d5e1ff39d4bc6f610102811f`.
Fresh application gates and release CI pass at `6fe6af8b9c449a19459c2e610afb69e30cdee9c6`;
native version commit/main `80a6b4df3327683e9ae0733a54092f5e8d832d23` (version CI 40071906102: FRESH SUCCESS).
Ships Library read coalescing, opt-in privacy-safe measurements, reviewer key reuse,
Queue/course menus, bounded card feedback and light-theme muted-text contrast.
PBR-LP1/AS1 are measurement/no-change reports; no APK-size or physical speedup claim.
RT1/EV1 original statuses remain historical; the pixel correction is evidence repair,
not a claimed native resume-text fix. Saved TC2/TP1 and unrelated holds are unchanged.

FRESH source workspace suites **5,769 passed / 0 failed / 3 existing live skips**;
provider 20/20, capture verifier 5/5 and APK publisher 27/27. Forced root
typecheck/lint/serial build each 8/8 tasks, 0 cached; six existing lint warnings.
No migrations. Worker `generation-worker-00034-x2f` Ready/100%, startup errors 0.
API dpl_4KJctNQURVt4LsHbur3eSWsZfqYW; website dpl_HBDxPr6VrjKHE9V9LgoWSa5L482h READY.
APK build 76bda74e-ddd9-4f2f-ba09-c327c6bb9d57: 2.4.0/code8/runtime 2.4.0-sdk57; adb install -r SUCCESS on connected Realme RMX3151; existing signed-in account and saved Library/course/reviewer data retained.
Public release: https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.4.0%2B8. No OTA; the Doctor-required notifications
patch changed a native dependency, so a new runtime/APK was required.

Desktop production UI: NOT RUN (no connected browser surface); HTTP and proxy
checks PASS. Device outcomes, failed first Doctor/CLI attempts, exact commits,
readiness JSON and remaining limits are in the release acceptance report.

Pending: none for publication.

What changed: Library/read/render, Queue/course menus, card feedback and contrast; native dependency/runtime alignment.
Verification (exact counts): FRESH 5,769 workspace passes +3 existing live skips, provider20/20, verifier5/5, publisher27/27; forced root gates8/8 each,0 cached.
Deployments (IDs, SHAs): dpl_4KJctNQURVt4LsHbur3eSWsZfqYW, dpl_HBDxPr6VrjKHE9V9LgoWSa5L482h, generation-worker-00034-x2f, EAS76bda74e-ddd9-4f2f-ba09-c327c6bb9d57; application main 80a6b4df3327683e9ae0733a54092f5e8d832d23.
Live checks: 6/6 bounded device checks PASS; broader matrices NOT RUN; individual results and limits in acceptance.
Next steps: Owner may run broader font-scale, assistive-technology, populated Queue and full performance/physical matrices; desktop production UI remains NOT RUN.
Blockers: none for publication.
Risks: bounded physical proof, no performance/complete historical acceptance claim.

[Full acceptance](acceptance/fullsend-20261024-1357.md).


## Handoff — FULLSEND (20261022-1719)

What changed:
Shipped two orb fixes from source 245380ea (release/fullsend-20261022-1719) by
normal merge acf9481 over previous main babcb0bc. 90383ef2: web and mobile orb
stays empty while loading and fades in from its first complete frame; the
static poster is only a failure/Reduce Motion state. 245380ea: mobile Today orb
rebuilds on a replacement GL context after Settings or another screen covers
Today, instead of staying on the poster until a cold restart.

Verification (exact counts):
FRESH at acf9481: npm ci 1,591; Doctor 21/21; typecheck/lint 8/8, 0 cached, six
existing warnings; build first attempt FAILED (Windows file-read error in Metro on
untouched generationRecovery.ts), forced rerun 8/8, 0 cached. Shared 353/36,
Canvas 75/1, OCR 27/3, engine 606/0, API 2452 + 3 skips/213, mobile 1645/172, web
575/76, provider 20/20, diff check PASS. CI 39757286388 SUCCESS.

Deployments (IDs, SHAs):
Migrations and worker: NOT APPLICABLE (no paths changed). API Git deploy READY at
acf9481; proxied health reports acf9481. Website dpl_Bt6ivQjFbkva3MykeVznrq6fegmJ
READY, alias stay-focused-ten.vercel.app. OTA group 5c027739-bb01-4532-8108-12c1f46a8ac4,
Android update 01a16304-432c-703e-838e-c4ea04e4b3d9, runtime 2.3.0-sdk57.

Live checks:
PASS: Realme About shows 2.3.0 (7) · update 01a16304. Settings round trips with
Light, Dark and Automatic each return to a live GLView orb, no "Orb unavailable".
NOT RUN: deployed-website desktop visual check; deployment 5xx scans.

Next steps:
FS7 open items (native resume text redraw; authenticated web visuals). OX3/OX4
backlog under Owner Pause. Source checkout b25-3-3-work stays on
overnight/2026-10-15_feedback and does not yet contain this release's docs.

[Full record](acceptance/fullsend-20261022-1719.md).

## Handoff — FULLSEND (20261022-1512)

What changed:
Shipped OX1's padded SVG poster repair and OX2P's shared light-glass refinement
from source 2670285815e47885fb8220c9596b91daa61dde84; previous main
28174c76cf7b2696d24e33656f428ee6bf4b92dc retained by normal merge 83f9474603ed45488c75d7028dad170f79374263.
Only documentation conflicts; both entries retained. Existing native/Expo/test
release repairs retained. Owner artifacts are left local, not shipped.

Verification (exact counts):
FRESH Doctor 21/21; root forced typecheck/lint/build 8/8 each, 0 cached; six
existing lint warnings. Shared 353/36 source tests/files, Canvas 75/1, OCR 27/3,
engine 606, API 2452 pass+3 existing live skips/213 files, mobile 1643/172,
web 575/76, provider 20/20. Root build API 37/37, web 23/23, Android/iOS HBC and
web exports. Complete CI 39741781659 SUCCESS at 83f9474603ed45488c75d7028dad170f79374263; counts match.
Diff hygiene FRESH PASS. Final docs-only full-suite reruns NOT APPLICABLE.
The prescribed Doctor --cwd form failed; positional project path passed.
No suite retry, flake, new skip, assertion weakening or paid generation.

Deployments (IDs, SHAs):
Migrations: none. Cloud Build d51b0164-095c-411b-b033-2596d4ad6ade SUCCESS; image asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:83f9474;
digest sha256:86fc0314f5358ac9923704b984ce2eb35a0edeb434e734a7f139050f0a7a8dc2; revision generation-worker-00033-7sv Ready, 100% traffic.
Authenticated worker health HTTP 200/ok; startup ERROR count 0; dispatch configuration PASS.
API dpl_F16grTGjt5Be1pV3HhzHpSDGrYoo READY via Git at 83f9474603ed45488c75d7028dad170f79374263:
https://stay-focused-v2-prototype-j1hkedk2e-galaxymaxps-projects.vercel.app.
Website dpl_292JfCBzE1J4F21wqXUaJ5ziwQ3v READY via one production CLI upload at 83f9474603ed45488c75d7028dad170f79374263:
https://stay-focused-92csqprd6-galaxymaxps-projects.vercel.app; alias https://stay-focused-ten.vercel.app.
Stable API and website/proxy HTTP 200/ok, commit equals application main.
Deployment-scoped API and website 5xx request queries returned 0 records,
with no excluded intervals. No rollback or repeated deployment.
OTA group bc0231d4-8b5c-4ded-bbb8-0c543e5e9970, Android update 01a162a3-6a63-7318-9a64-4b40789569a1, preview channel/branch,
runtime 2.3.0-sdk57, message fullsend 20261022-1512, source 83f9474603ed45488c75d7028dad170f79374263.
Manifest: https://u.expo.dev/update/01a162a3-6a63-7318-9a64-4b40789569a1.
Realme About confirms Version 2.3.0 (7) · update 01a162a3;
installed APK manifest confirms runtime 2.3.0-sdk57 and preview channel.
No native build, APK install, public APK release or signing operation was required.

Live checks:
FRESH Realme bounded smoke 5 PASS / 1 FAIL: light/dark Today complete poster and
readable clock, light/dark standalone Generation complete orb, and complete
orb at a 54.9-second follow-up PASS. Three route cycles finish complete, but
first background/resume capture loses native text while orb stays visible: FAIL.
Text recovers by the follow-up. This resembles previously recorded FS5 native
redraw symptoms; cause and duration remain unverified. Physical acceptance PARTIAL.
Automatic theme restored and selected=true verified; palette, Wi-Fi, airplane
mode, Reduced Motion and other preferences unchanged. Left Today/asleep.
Desktop 1440px public sign-in and proxy health PASS, zero page errors/5xx.
Authenticated deployed web visual checks NOT RUN: no fresh-browser session.

Next steps:
Investigate the native text redraw after resume, then recheck that flow on the
Realme. Complete authenticated deployed web orb acceptance and the broader
palette/Reduced Motion/performance matrix separately. No deployment pending.

Blockers:
No release deployment blocker. Authenticated browser session unavailable for
protected visual checks; no interactive login attempted.

Documentation repair: the first release-docs commit c9cb867 introduced
duplicated historical handoff text and mixed line endings in a formatting pass.
Its staged diff check failed, but the native command chain continued to commit
and push. The normal follow-up restores the original 83f9474 handoff history
exactly plus this single FS7 entry. No remote history or application code was
rewritten. Final diff and staged checks are FRESH PASS; no full application
suite rerun is applicable to this documentation-only correction.

Risks:
Release shipping PASS through STEP 6 is separate from STEP 7 physical acceptance
PARTIAL. Bounded screenshots do not establish every transient frame, all five
palettes, Reduced Motion or native GPU/battery performance. No new generation
was submitted; standalone /generation was opened without id/intent/start and
remained unsubmitted. Historical statuses remain intact. Final documentation
SHA, post-push observation and source-ref ancestry are recorded in the external
FS7 result/status, because a commit cannot embed its own SHA.

<details>
<summary>FS7 persistent readiness validator JSON (copied exactly as data)</summary>

```json
{
  "ready": true,
  "head": "2670285815e47885fb8220c9596b91daa61dde84",
  "baseline": "FS5",
  "beforeId": "FS7",
  "runner": {
    "state": "running",
    "item": "FS7"
  },
  "items": [
    {
      "id": "OX1",
      "originalState": "STOPPED",
      "result": "VERIFIED_SUPERSESSION",
      "evidence": {
        "commits": [
          "bcef04777aa56cd6c1e6eba4fdd7c004851dcc95",
          "39ff73620e91714f077a664aafaf888dc94b527c",
          "1140c73764e19edf054fd5ce131a707697301524",
          "2670285815e47885fb8220c9596b91daa61dde84"
        ],
        "acceptance": "docs/ai/acceptance/ox1-realme-physical-debug.md",
        "passingGates": 9
      },
      "successor": "OX2P"
    },
    {
      "id": "OX2",
      "originalState": null,
      "result": "VERIFIED_SUPERSESSION",
      "evidence": {
        "commits": [
          "39ff73620e91714f077a664aafaf888dc94b527c",
          "1140c73764e19edf054fd5ce131a707697301524",
          "2670285815e47885fb8220c9596b91daa61dde84"
        ],
        "acceptance": "docs/ai/acceptance/ox2p-light-glass-follow-up.md",
        "passingGates": 11
      },
      "successor": "OX2P"
    },
    {
      "id": "OX2P",
      "originalState": "PASS",
      "result": "PASS"
    },
    {
      "id": "FS6",
      "originalState": "STOPPED",
      "result": "ABORTED_BEFORE_RELEASE"
    }
  ],
  "leftLocal": [
    "UI/README.md",
    "UI/screenshots/dark/01-generate.png",
    "UI/screenshots/dark/02-today.png",
    "UI/screenshots/dark/03-tasks.png",
    "UI/screenshots/dark/04-library.png",
    "UI/screenshots/dark/05-task-course.png",
    "UI/screenshots/dark/06-library-course.png",
    "UI/screenshots/dark/07-reviewers-list.png",
    "UI/screenshots/dark/08-reviewer.png",
    "UI/screenshots/dark/09-other-source.png",
    "UI/screenshots/dark/10-queue.png",
    "UI/screenshots/light/01-generate.png",
    "UI/screenshots/light/02-today.png",
    "UI/screenshots/light/03-tasks.png",
    "UI/screenshots/light/04-library.png",
    "UI/screenshots/light/05-task-course.png",
    "UI/screenshots/light/06-library-course.png",
    "UI/screenshots/light/07-reviewers-list.png",
    "UI/screenshots/light/08-reviewer.png",
    "UI/screenshots/light/09-other-source.png",
    "UI/screenshots/light/10-queue.png",
    "apps/mobile/.gitignore",
    "supabase/.temp/cli-latest"
  ],
  "blockers": []
}
```

</details>

## Handoff — FULLSEND (20261021-2245)

What changed:
Shipped OT1/OG1/OL1/RS1/TB1/LP2 from source70c415d13ef75c2e334fc6d544edfdc35d34e5ff;
previous maine71dd2aaf836751f3b694eb60b2b2274d2c484b0 retained by normal
merge56170ac. Tested application/test maine8b44dd242a2e8a3340d8287bf6b2f4f57ac0a52.
Fresh clone; source UI/, apps/mobile/.gitignore, supabase/.temp/ left local,
not shipped. Expo patches43038b9, web workers64cc1e7, native0536abf,
publisher fixture9df3602, preview Node24e62e31c, causal browser probee8b44dd.

Verification (exact counts):
FRESH forced root typecheck/lint/build8/8 each,0 cached; six existing warnings.
Shared348/36 source cases/files, Canvas75/1, OCR27/3, engine606,
API2452 pass+3 existing live skips/213 files, mobile1633/171, web569/75,
contract20/20, publisher27/27; Doctor21/21. API/web37/37 and23/23 pages,
Android/iOS/web exports. Complete CI39637163181 SUCCESS. Failed first
Doctor/web/browser CI39634165945/publisher/EAS attempts and repairs
are recorded in the acceptance report; no assertions/deadlines weakened or
tests newly skipped. Docs-only application reruns NOT APPLICABLE; final diff
and staged hygiene FRESH PASS. Final docs SHA/CI in external FS5 result/status.

Deployments (IDs, SHAs):
Migrations none. Worker Cloud Build56025bca-0794-42dd-9506-79b1c9c6b42a SUCCESS,
asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:64cc1e7,
digest7d973fd7cd6b9fa2d1d7daeddaa549cd252a2e0b2a5e681c9f6db7e2ada982aa;
generation-worker-00032-gbv Ready/100%, health200/startup errors0; dispatch set.
Website dpl_2yGbZmy658n1QJW8Fgjw6c9YgYiQ production64cc1e7,
https://stay-focused-1p3sqgzh2-galaxymaxps-projects.vercel.app,
alias https://stay-focused-ten.vercel.app. API dpl_CK6u8TsPnGnKi2bFqbYvTBVQewsB
productione8b44dd, https://stay-focused-v2-prototype-4trdwmfbc-galaxymaxps-projects.vercel.app.
Direct/proxied health200 reports exacte8b44dd; website200. Initial complete
10-minute error/fatal/5xx scans0, follow-up API20-minute scans0.
First EASd6242c5b failed before Gradle; targeted preview Node24.16.0 pin;
single rebuilda26aa1fe-623e-49e5-95fb-0c2caa1f86ea FINISHED frome62e31c.
Realme adb install-r SUCCESS,2.3.0/code7/runtime2.3.0-sdk57, built-in update;
verified package/runtime/signature, matching installed APK hash
0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6.
Public https://github.com/galaxymaxp/stay-focused-releases/releases/tag/v2.3.0%2B7;
canonical APK132024227bytes, exact digest. First publisher timed out creating
empty draft; completed its same draft after inspection/asset verification.
No asset/release overwrite/deletion, third build, credential change, uninstall,
data clear or OTA. Completed release actions were not repeated on resume.

Live checks:
FRESH4 PASS/2 FAIL on installed2.3.0/code7. PASS limited smoke: Today light
body/dark time, restrained standalone glow, Generate scroll endpoints, profile/
Settings legal links and Back. FAIL OL1/TB1: return/post-tab captures lose
header/body/tab text; some Today captures show square poster/background.
Native composition versus adb capture cause remains UNVERIFIED; mirrors prior
FS4 symptom but no causal regression claim. Full palette/theme parity, active
state/motion/performance and frame-by-frame jitter NOT RUN. Desktop UI NOT RUN:
empty browser inventory/IAB unavailable. Zero generations/start/retry/clear
or manual sync. Automatic restored, palette unchanged; phone Today/Asleep.
Private captures remain ignored in .local/fullsend-20261021-2245.

Next steps:
Investigate native redraw/capture behavior and complete broader physical
acceptance. Final docs push, main-ref refresh and observations in external result.

Blockers:
None for shipped release; no owner deployment pending. Desktop UI unavailable.

Risks:
Release PASS through STEP6 coexists with PARTIAL device visual acceptance;
two smoke failures remain open. Details: docs/ai/acceptance/fullsend-20261021-2245.md.

## Handoff ? FULLSEND (20261020-2101)

What changed:
Published OP2/GV1 from pinned source 32206c1656453975b4c989f7d59a0b1726730c8c;
previous shipped main 913b11877f29206b3deee41c2cb4e453f1c5a64b; final application
main f0736bfa20ff545264624940db4dfc42b2a33265. OP2 9e17fd4d/1d3c5cfc,
GV1 8b37b5ae/32206c16. Fresh clone, normal merge 5143e3e preserving earlier
main fixes and both documentation entries; normal main push. Test/CI-only
fixes 1f099db (portable fixture/Chromium order) and f0736bf (explicit gesture
time/one-worker web CI). Original UI/, apps/mobile/.gitignore, supabase/.temp/
left local, not shipped. Author/committer galaxymaxp, no trailers.

Verification (exact counts):
FRESH local and final Linux CI gates: forced typecheck/lint/build 8/8 each,
0 cached; six existing lint warnings. Shared 335/34 source files (historical
670/68 included compiled duplicates), Canvas 75/1, OCR 27/3, engine 606, API
2452 pass + 3 intentional live skips/213 files, mobile 1600/169, web 540/72,
provider contract 20/20 fake clients. API/web pages 37/37 and 23/23; native
and web exports. Doctor 21/21, npm ci 1593 packages. Repo-local temp; generated
Next declarations restored. Full CI 39438782653 SUCCESS on final app SHA.
First mobile timeout and first web timeouts/hook-blocked cases, full passing
reruns, and failed CI 39435814818 / 39436913399 are retained. Post-fix focused
native browser 6/6 and web browser 23/23 plus respective typecheck/lint pass.
No assertions/deadlines weakened or tests removed/newly skipped. Final docs-only
checks: diff/staged hygiene FRESH; application suites NOT APPLICABLE to docs alone.

Deployments (IDs, SHAs):
Migrations: none. Worker Cloud Build 7632e00a-2be6-4ed1-ad27-492a0adbdacf SUCCESS;
asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:f0736bf,
digest sha256:3545a74e1a4b2acb9fff5071b92d619c93971bc9ead682504ab12cf04ffc11ba;
generation-worker-00031-kns Ready/100%; dispatch succeeds; startup errors zero.
Upload 2047 tracked files only, generated/private artifacts excluded.
API dpl_8Y2xj9EFsVBQb6JvCpdKM4pTBtd4 READY/production at f0736bf;
https://stay-focused-v2-prototype-6v4t5rn0b-galaxymaxps-projects.vercel.app.
Website dpl_DopMzVTAgzTdMMo7YgC4236H7yNf READY/production at f0736bf;
https://stay-focused-ge3gtn2d1-galaxymaxps-projects.vercel.app, aliased to
stay-focused-ten.vercel.app. Verified metadata SHAs, root/direct/proxied health
200/ok, API commit matches main. API 20-minute/web five-minute error/fatal and
5xx scans zero, no pagination/excluded intervals. Existing login, explicit
verified project, clean source checkout; no settings change or rollback.
OTA group 44243e11-cb14-4390-b56c-0755e317144b; Android update
01a159c7-b0d4-7f4c-8ae4-4f513969d26a; preview/runtime 2.2.0-sdk57 from f0736bf.
Installed manifest proves channel/runtime; Realme About proves 2.2.0 (6),
update 01a159c7 after relaunches. No native change, APK build/install/public
release NOT APPLICABLE. Final docs SHA and resulting automatic API/CI are in
external result/status after commit.

Live checks:
FRESH 5 PASS / 1 FAIL. PASS: initial Today clock/body/backdrop; Queue safety
and open/close; confirmation visually fits portrait; full details/Done/return;
Generate picker scroll. FAIL: blank regions outside the orb in post-tap
captures 11/12; navigation redraw restores normal Today. Five-tap palette
cycle returns pearl. Cause native composition versus ADB capture is unverified.
Initial clipping diagnosis is withdrawn: pixel close-up shows the full details
control despite UIAutomator's underreported bound; accessibility discrepancy
remains open. Desktop UI NOT RUN: IAB unavailable. Zero paid generations;
no start/retry/clear/sync submitted. Original timeout 1800000 ms unchanged,
settings preserved, phone returned Today and Asleep. Neutral ignored evidence
under .local/fullsend-20261020-2101. Initial Python helper/asleep captures failed;
Node capture plus ordinary wake/swipe-only keyguard dismissal resolved access.

Next steps:
Investigate captured blank regions and actual native display/compositor behavior;
verify accessibility bounds and remaining desktop, active generation, landscape,
enlarged-text, Reduced Motion, wave/gesture and performance variants.

Blockers:
Browser unavailable. No release migration/deployment/mobile operation pending.

Risks:
SHIPPED with physical acceptance PARTIAL, not full OP2/GV1 acceptance. No
credential/signing rotation, destructive SQL, email activation, purchase,
force-push, uninstall or app data clear. Owner Pause and later scopes retained.
Source checkout fetch/ancestry is recorded externally; no source integration.

[Full acceptance](acceptance/fullsend-20261020-2101.md).

## Handoff — FULLSEND (20261020-0604)

What changed:
Published UC1/UC2/UC3, LG1, GB1, GS1, RV3, IV1, AN1b, OF1b, OR3b, OR4, WGP2, LP1, GL1, WA1, WX1 and OA1 from pinned 202f8c3f7e7b012136acf3708a7e044a561be827; previous main 384173c0e936bd3709f021842f3be2a2e79743e1; application main b6645ed4cc8d27c86af2ccc5e1a830e1e4d8074e. Release-only merge 436dc36 and docs cleanup b6645ed retain both histories. All work used a fresh clone; source untracked files and separate showcase-only commit remain left local, not shipped.

Verification (exact counts):
FRESH PASS: npm ci 1593, Doctor 21/21, forced typecheck/lint/build 8/8 each and 0 cached; shared 330/34 source files, Canvas 75/1, OCR 27/3, engine 606, API 2452 passed/3 intentional skips/213 files, mobile 1581/166, web 524/72, provider 20, publisher 27. Builds API 37/37 pages, web 23/23 and Android/iOS/web exports. Six existing warnings. First mobile five-second timeout and four web test plus one teardown timeout retained; focused mobile 10/10 and full two-worker reruns pass. No weakened/skipped tests. GitHub CI 39339336556 SUCCESS repeats counts and fresh forced gates. Diff hygiene pass; generated declarations restored.

Deployments (IDs, SHAs):
Only additive migration 20261018000301_profile_preferences.sql applied to xfdbwfqtorelmurncyql before main; exact-set dry run, post-list 99 matching/0 pending and RLS/grants/trigger catalog checks pass. Worker build 6c1d040c-5573-4bb0-9f7a-2b7c79f0dbaa SUCCESS; image worker:b6645ed, digest sha256:343d6551c1cc50f4169bc24af1188d60f4b235ce910b3ce8fd2ae276b1691bcc, revision generation-worker-00030-c2q Ready/100%, dispatch configured. API dpl_FTJbc451LXaRmGadBioS7bQ6qqno and website dpl_9R9BSaNwPUP3hmT856fFjpEpVTQS READY at b6645ed4cc8d27c86af2ccc5e1a830e1e4d8074e; stable production aliases healthy. OTA group 8274c431-7189-42cb-bb36-7fe546e06ea7 / Android 01a1567c-cc55-7bbf-bdf1-7c3ccc2380f0 runs on Realme, native 2.2.0/code6/runtime2.2.0-sdk57. No APK path or public native release applies. Final documentation commit and automatic follow-up deployment IDs are recorded externally after this commit.

Live checks:
Six FRESH bounded PASS: Today orb/clock render; exact About OTA/native metadata and manual up-to-date result; correct native download share URL (dismissed, not sent); Privacy and Terms screens; Generate search hides/reappears on down/up scroll; reviewer Original selected with Simplify/Explain simply/Expound controls. Direct/proxied health 200 matching application SHA, public root/download/privacy/terms 200, unauthenticated preferences401, release metadata200/version2.2.0. Worker initial ERROR query zero; API/web bounded error/fatal and 5xx scans zero, no excluded intervals. Desktop browser UI NOT RUN (no surfaces/IAB unavailable). Zero paid generations; no quiz answers or settings changes. Swipe-only keyguard dismissed using standard command; failed timeout write unchanged at1800000, device returned asleep. Transient list navigation was resolved from fresh button bounds.

Next steps:
No required FS3 publication remains. Desktop UI and broader feature/visual/performance acceptance remain separate. UC2 showcase-only push/PR is left local outside this repository; OA2/later roadmap scopes are not resumed. Final source fetch/ancestry and final commit are in the external result. [Full evidence](acceptance/fullsend-20261020-0604.md).

Blockers:
Desktop browser unavailable. Required migrations, worker, API, website and mobile publication have no pending owner/Claude action.

Risks:
Six quick checks do not close full feature acceptance, offline/reconnect flows, recovery email, cross-device sync, image gestures, physical reference parity or GPU/power measurements. Initial load flakes and exploratory failures are retained. CLI link's automatically created local environment file was removed without reading values; no persistent credential, project-setting change or email activation was performed. Original owner work, source content and later scopes remain preserved.

## Handoff — FULLSEND (2026-10-19)

What changed:
Shipped the finite FS2 release from pinned source 7506d51cde323caf036c6bc930512739a94613cb; tested application main is e11779a46f46513035f4cdacae55286bd337e5cf. The only release repair is e11779a, which makes the offline-image database restart test create its own repository-local temporary parent. The original b25-3-3-work checkout was preserved; all release work used this fresh clone.

Verification (exact counts):
FRESH PASS: npm ci (1,488 packages), Expo Doctor 21/21; forced root typecheck, lint and build each 8/8 tasks, 0 cached. Shared 282/282 across 27 source files; Canvas 75/75 (1 file), OCR 27/27 (3), engine 606/606, API 2,397 passed and 3 intentional live skips (209 files, two workers), mobile 1,481/1,481 (154), web 353/353 (54), provider contract 20/20 (fake clients only). API/web builds produced 35/35 and 19/19 pages; Android/iOS/web exports passed. Six existing lint warnings remain. Diff hygiene passed; Next-generated declarations were restored. GitHub release quality run 39150200346 SUCCESS repeats these counts, including forced gates with 0 cached tasks. First failures and tool retries are retained in the acceptance report.

Deployments (IDs, SHAs):
Supabase xfdbwfqtorelmurncyql: applied only 20261018000100_failed_generation_retry.sql, 20261018000200_material_descriptions.sql and 20261018000300_profile_avatars.sql before main. Exact-set dry run passed; post-list has 98 matching versions, zero unmatched. RLS, owner policies, eight service-only RPCs and private avatar bucket metadata verified.
Worker build 29123816-84a5-4fbf-99eb-3b0957cd481d SUCCESS; image asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:e11779a, digest sha256:7d64c5be35043c5c00a99952fe8aa3f7eb4986a49a6e861c162090d917d0ddb4; generation-worker-00029-br6 Ready, 100% traffic, dispatch configuration successful, initial ERROR query zero entries.
API Git status reference 43oQUjybjvenibMU5v2D4Ljsxpo2 / GitHub deployment 7158236365 SUCCESS at e11779a; https://stay-focused-v2-prototype-6x4psutxk-galaxymaxps-projects.vercel.app. Direct health and website API proxy return 200/status ok/commit e11779a; valid overnight Today override returns expected unauthenticated 401.
Website production dpl_6dq21qJz4UPLx4pxCMXdyCKgYGEk READY at e11779a; stay-focused-ten.vercel.app alias assignment verified and HTTP 200. Existing connector rebuilt the source for production after CLI authentication failed; preview dpl_G9UfZLk46o4iNNnJQtB9piBvXcUD was not promoted. Previous READY dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN retained; no rollback.
Android preview OTA group 946136b5-2716-4e87-b1ba-b254f101fa4f, update 01a15020-2f92-74b9-8c2b-63c146cc77ed, runtime 2.2.0-sdk57, Git e11779a. Two Realme relaunches completed; new clock/quiz UI and image checks prove the OTA is running. Phone versionName 2.2.0/code 6; owner session retained. APK path NOT APPLICABLE because there was no native diff.

Live checks:
FRESH PASS: TC1b typed 10 PM–4 AM fields and midnight ring; OR1b visible halo; IF1 Image saved / Saved to Stay Focused; IF2 external image visibly loads and viewer remains open; QZ1 question-number jump to question 2 and back to 1; PF1 provider photo. Original free time restored to 2 AM–4 AM (00 minutes), clock lock left false, no plan applied and no quiz answers submitted. Zero paid generations.
NOT RUN: after-midnight session blocks (preview had no fitting sessions), previous-date current-plan ownership (required prior overnight plan baseline not established), MD1b description display (new cache has 0 ready/0 total entries), desktop Today/WGP1 UI (browser inventory empty; IAB creation explicitly unavailable).

Next steps:
Finish the listed live checks with an eligible overnight plan, an existing ready material description and an available browser. Any broad description backfill remains a separate owner decision. FS2 ends here; no later queued product slice was started. Final documentation commit and any subsequent automatic API deployment are recorded in the external overnight result/status, avoiding a self-referential commit hash.

Blockers:
API runtime log scan remains BLOCKED: installed Vercel CLI 64.5.0 rejects its saved token, and the existing connector returns 404 for this API project/deployment. Website publication was recovered through the connector and its bounded error/fatal scan returned zero groups. No new authentication completed, credentials created/rotated, project settings changed or email delivery enabled.

Risks:
The named NOT RUN checks and inaccessible API runtime logs remain unverified; passing local/CI tests do not replace those observations. A source-figure viewer changed state between early captures; a stale-coordinate attempt opened Study Assist, was dismissed without submission, then exact live UI bounds produced a successful save. No cause for that transient state change is claimed. Device captures and validation logs remain ignored in .local/fullsend-20261019; no private academic content, credentials or generated outputs enter the commit.


## Handoff — FULLSEND (2026-10-18)

What changed:
Published pinned WG1 653e8d8a2b9b43b7e607e103d9d1a09a25cd451c to main;
initial publication b55d5a50a45c2b561e44319342b25087425a67ce, native bump
90369428a7dd34e0e1410c850051003d41f8e003, final tested application main
dc162de3df634eea8b447f73ac67d758be75f4ee. PR #12 is MERGED. Includes
MR1/SA1/SA2/MR2/IM1b/RT1/INT1/EV1/RX1/IM2/WG1 and retained f3dd833 behavior.
WG2, WV1 and MD1 are not in this release. Existing worktrees were preserved.
Expo/Router patch alignment and npm-10-compatible lock repair were scoped
release fixes; Android is now 2.2.0, code 6, runtime 2.2.0-sdk57.

Verification (exact counts):
FRESH on dc162de: npm ci PASS (1,488 packages); Doctor 21/21; forced root
typecheck/lint/build 8/8 each, 0 cached; shared 350/40 files including emitted
copies, Canvas 75/1, OCR 27/3, engine 606/0 failures, API 2,268 pass + 3
existing live skips / 199 files, mobile 1,239/133, web 209/37, provider 20/20.
API/web pages 35/35 and 19/19; Android/iOS/web export, 68 assets. Six existing
lint warnings, no errors. Diff hygiene passes. GitHub CI 39069451068 SUCCESS.
First clean shared run had 175 source tests / 20 files before emission.
Doctor's unsupported --cwd invocation and initial two-package mismatch, the
first EAS npm-install failure, and superseded CI runs are recorded in acceptance.
No nondeterministic test flake observed. Repo-local test temp was used; generated
Next declarations restored after both builds; Windows TEMP was untouched.

Deployments (IDs, SHAs):
Supabase xfdbwfqtorelmurncyql: only 20261016000100_manual_reviewer_uploads.sql
applied before main. Read-only CLI migration fetch resolved historical aliases
in ignored staging without history repair; dry runs listed only the release
file. After push, 95 matching versions, zero pending. Both new RPCs exist and
remain service-role only; no existing row was deleted during application.
Google Cloud Build a524ee7e-ffce-442a-a006-b7949fd2adef SUCCESS;
asia-northeast1-docker.pkg.dev/stay-focus-492811/generation/worker:b55d5a5,
digest sha256:dac2af81c85519383f8c868fd218621315b45615dfe20ee4de3f0aa56988d364;
generation-worker-00028-f5t Ready, 100% traffic, dispatch configuration succeeds.
API dpl_2f7nfcr1Y5JJufzTZYmqu1s7276g READY at dc162de, health status ok.
Website dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN READY from clean b55d5a5 CLI upload,
aliased to stay-focused-ten.vercel.app, HTTP 200. Initial bounded API/web 5xx
and worker startup ERROR queries returned zero entries; no rollback.
EAS first build 3c6b9e1d-8285-4655-ac7c-4d49e66e561f failed npm installation;
repaired build 2ed33756-ef3b-4887-ac0a-fa0c59adf7ab FINISHED at dc162de.
APK: https://expo.dev/artifacts/eas/otDX0o3Lh-NYRtnGRygzbG4N_WSgdQxO-DiBmZGabjk.apk
adb install -r SUCCESS on RMX3151; versionName=2.2.0, versionCode=6. Owner
session and 75 saved offline items retained. Existing keystore reused; no OTA.
The final documentation-only commit SHA is recorded after commit in the external
result file/Git history; application source remains dc162de.

Live checks:
PASS: STEP 7.1 Export/Share same row, text Ask first What is this?, bulleted
answer in view; 7.2 tap-only source details, image Ask answer and pull-down close;
7.4 Library Sort and Wi-Fi-off cold restart with 75 items. Two generation
requests used (one image, one text), no follow-ups. Wi-Fi restored.
FAIL: 7.3 checked external reference stays blank; viewer closes on load.
FAIL: 7.4 Save image on a visibly loaded source figure returns its generic
failure alert on the new online APK; underlying cause unverified.
NOT RUN: 7.2 overflowing-viewer scroll (chosen figure fits viewport), 7.5
website desktop/390px/reviewer UI (Windows capture black, activation Access
denied 0x80070005), 7.6 Office upload (only local file is an administrative
learning-contract template, no suitable instructional Canvas source).
Neutral screenshots/XML are ignored under .local/fullsend-20261018/.

Next steps:
Repair and physically recheck the two image failures, then finish website,
overflowing-viewer and suitable-source Office checks. Keep WG2/WV1/MD1 excluded.
Before a later native release, increment the remote code or restore preview
autoIncrement; it is false for this code-6 retry. Any later authorized JS OTA
must pass apps/mobile/scripts/preview-update-preflight.mjs.

Blockers:
Windows browser interaction is unavailable (Access denied); suitable local
Office instructional input is absent. Image failures require scoped follow-up
diagnosis; no source-level fix or root cause is claimed.

Risks:
SHIPPED, with live acceptance PARTIAL. Gallery saving and the checked external
image are not accepted. Automated gates do not replace the remaining physical
or browser checks. Email delivery remains disabled; no purchase, destructive
SQL, signing/service credential rotation, branch deletion, force-push,
uninstall or app-data clear was performed.

[Full acceptance](acceptance/fullsend-20261018.md).

## B38.1 production generation quality acceptance (2026-09-24)

B38.1 passes. Fresh production outputs on the realme RMX3151 covered a CC16 Firewalls PDF Reviewer, its five-question Quiz, a CC17 Android Platform PPTX Reviewer, and a CC17 Android Versions assignment Activity Output. Inspecting the actual artifacts found no material unsupported Reviewer claims, source omissions, wrong Quiz answer, ambiguity, or invented instructor requirement; Queue/background and Library/relaunch persistence passed. The first PPTX attempt failed before provider execution because the strict response schema enumerated every long source block ID and exceeded the contract budget. Commit `1d992aa` bounds that provider schema while exact local source-reference validation remains intact. Regression 30/30 and all full gates pass. Production `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` is READY and healthy, and the repaired 32-topic PPTX Reviewer completed on `gpt-5.4-2026-03-05`. See `docs/ai/acceptance/b38-1/production-generation-quality-acceptance.md`. Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

B38.0 passes. Generate's course list now comes from the Sync page inventory (`loadCanvasCourseInventory`, `allowStoredFallback` for Generate only): courses are grouped Current → Previous → Other, with synced first and newest term first. Only synced courses (selected, with a completed latest attempt) open materials; the others open `/canvas-settings?courseId=…`, which adds the course to the unsaved selection draft. The materials gate for unselected courses returns `409 course_not_synced` instead of 503. Implementation `b3f6973`, Vercel `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ`, EAS preview update `d288a6ea-7a77-4d2d-b855-61c1eae2329f` (exported with dotenv disabled and the production API URL set explicitly). HIST 100 was genuinely unsynced; the old error was a mislabeled 400. See `docs/ai/acceptance/b38-0/generate-course-state-and-material-repair.md`. Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

B37 now passes. Production migration history was reconciled and both `20260923000000_canonical_reviewer_artifacts.sql` and `20260923010000_authenticated_canonical_reviewer_reads.sql` are live. Corrected Vercel deployment `dpl_2QUkcVoZADvJ3JfzegXSDXEjzrcp` is READY. Signed Android build `f0d6d63e-2607-45ee-b125-3b5d43ec2966` at `a7bfcee` passed authenticated gates, explicit-confirmation spend safety, one real durable canonical Quiz, Queue result opening without duplication, offline SQLite cold reopen, canonical management, disposable rename/delete without resurrection, and dependency-protected deletion. The legacy `reviewers` table is retained for historical compatibility, has zero rows, and has no active runtime read. Full automated gates pass. See `docs/ai/acceptance/b37/generated-artifact-convergence.md`. Next: B38 Generation Quality Acceptance; investigate large-PPTX `request_exceeds_context_budget` and cover the representative source matrix.

## B37 generated artifact model convergence (2026-09-23)

B37 is PARTIAL. Local code and migration converge current Reviewer runtime paths on `generated_artifacts`: exact material gate, clear `reviewerArtifactId` contracts, owner/type/current-version validated Quiz jobs, persisted Reviewer payload as the direct Quiz source, canonical Quiz persistence/Library links, canonical management/source status, dependency-restricted soft deletion, and post-success-only B35 SQLite removal. Navigation to a confirmation-required Queue item is now side-effect free; only the explicit single-flight confirmation accepts generation. All requested local suites/build/export/install gates pass. Production was not mutated: the linked Vercel target was verified, but the known Supabase migration-history alias mismatch is unresolved, no supported local Supabase workflow or authenticated dashboard exists, and a production environment pull was rejected for secret-exposure risk. Therefore production counts, migration, deploy, authenticated Quiz, Reviewer management/deletion, and physical spend acceptance remain open. See `docs/ai/acceptance/b37/generated-artifact-convergence.md`. Next: apply and verify B37 through an approved Supabase path, deploy, complete the production smoke, then begin B38 Generation Quality Acceptance. B38 must investigate `request_exceeds_context_budget` on large PPTX sources and cover PDF/scanned PDF/DOCX/PPTX/Canvas Page/Reviewer/Quiz/Activity Output.

## B36 signed physical UX + offline acceptance (2026-09-23)

B36 is PARTIAL. Signed preview APKs `0dc19cdd` (`f88b0c2`) and `245ccaec` (`1e81edd`) were built, installed, and accepted on the realme RMX3151 (Android 13). Both contain `libexpo-sqlite.so`; the preview signing identity is unchanged and no credential was created or rotated. B34's pending physical matrix and B35's local-first persistence both pass on device, including full airplane-mode reading of Reviewer, Quiz (read-only, no answer keys, no scoring, no submission), and Activity Output, plus reconnect with no duplicates. Two bounded layout defects were repaired in `1e81edd` and re-verified on the rebuilt APK. Two items are unreachable on this branch and were not repaired: Quiz generation and the supported Reviewer deletion flow, both because the Quiz gate, `quiz/sources.ts`, and "Manage saved Reviewers" still read the retired `reviewers` table (0 rows) while artifacts live in `generated_artifacts` (48 rows). Fixing that needs a migration plus an RPC signature change. No second test account exists, so cross-account isolation remains covered by automated tests; the logout purge itself passed on device. Note for operators: opening a Queue row marked "Request needs confirmation" submits it immediately, because `GenerationScreen` calls `acceptGeneration` from a mount effect. See `docs/ai/acceptance/b36/signed-physical-offline-acceptance.md`. Next: B37 Generation Quality Acceptance, starting with the legacy-`reviewers` retirement.

## B35 on-device artifact persistence (2026-09-22)

B35 passes. Completed Reviewers, Quizzes, and Activity outputs are stored on the device in an owner-scoped expo-sqlite store after the server has persisted them. The Library and artifact reader are local-first, with safe background reconciliation. Explicit sign-out purges that owner's local rows. Cloud architecture is unchanged. Adding expo-sqlite means a new native build is required before device acceptance; older binaries fall back to cloud-only reads. See `docs/ai/acceptance/b35/on-device-artifact-persistence.md`. Next: B36 Signed Physical UX + Offline Acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

B32 is complete and accepted. READY production deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` moves scanned Canvas PDF download, per-page inspection, OCR, ordered source attachment, and reviewer context generation into durable workflow steps. Fresh 16-page Accounting job `a85bd672-2aed-401b-a37e-fd1c794d826f` completed all checkpoints, attached 6,757 characters, generated `Reviewer in Journaling and Basic Accounting`, and survived physical Android force-stop/relaunch Library retrieval. Full API and engine suites pass. Direct service-role DB metadata inspection was not available because the local Vercel environment pull returned secret references, so workflow logs and owner-authenticated device behavior are the persistence evidence. See `docs/ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md`. Next: B34 generation quality acceptance unless a new DOCX/PPTX defect reopens B33.

## B25.3.3 migration update (2026-09-16)

The user approved scoped provider transfers. Live comparison and production caller migration are complete; deterministic checks pass. Deployment dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance requires direct device sign-in and selected Activity assignment. See the current B25.3.3 acceptance report.

## B25.3.3 AI-first spike checkpoint (2026-09-15)

Standalone AI-first Reviewer, Quiz and Activity generators plus coherent context and thin contract tests are implemented in the isolated b25-3-3-ai-first branch. Production cutover, legacy retirement and real-material/device acceptance are pending private-source OCR/OpenAI authorization after an automatic approval rejection. B25 remains PARTIAL; B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md.


> **HISTORICAL LOG — NOT AUTHORITATIVE CURRENT STATE**
>
> New agents should use `docs/current-state.md`, `docs/roadmap.md`, and
> `docs/ai/current_sprint.md`, then the relevant ADR. This tracked file is an
> append-only historical log and is not required default context. The older
> `handoff.example.md` records the former local-only convention; current policy
> keeps this log tracked as evidence while current state lives in the three
> concise documents above.

This handoff is tracked in the repository and must not contain secrets,
credential values, tokens, or machine-specific local paths beyond repository
paths.

## Current Status

- Product Recovery R6 is partial. Automated acceptance passed on 2026-07-15,
  but physical-device acceptance remains deferred because this agent did not
  have a controllable physical iPhone Expo Go session. The API dev server
  started on port 3000, `/api/health` returned the expected V2 payload, Metro
  started on port 8081, the Expo root returned HTTP 200, root typecheck/lint,
  workspace tests, reviewer web smoke tests, PDF OCR web smoke, R3/R4/R5
  protected validations, and root production build passed. Totals remained
  Canvas 69/69, OCR 25/25, engine 287/287, API 428/428, mobile 154/154, and
  reviewer web smoke 51/51. No R6 production defect was reproduced and no
  product code was changed. See
  `docs/ai/product-recovery-r6-device-acceptance-20260715.md`.
- Next task: finish Product Recovery Phase R6 on a physical iPhone with Expo
  Go. Do not claim R6 complete until normal text size, Dynamic Type, VoiceOver,
  LAN reachability, slow/interrupted API behavior, destructive-navigation
  prompts, duplicate prevention, sign-out/session cleanup, and Study Library
  handoff are actually observed with safe labels.
- Product Recovery R5 is complete. The selected-course Canvas reviewer path is
  now `choose source -> prepare/check -> exact editable preview -> generate ->
  reviewer ready -> immutable snapshot save`. Sources use authoritative module
  placement or conservative ungrouped fallback, safe capability labels, bounded
  continuous pagination, request-token/abort protection, exact generation/save
  bindings, single-flight locks, and discard confirmation. Protected validation
  passed the live Page, stored-file, generate, save, cleanup, and controlled
  zero-call scenarios. See
  `docs/ai/product-recovery-r5-canvas-source-selection-reviewer-ux-20260715.md`.
- Next task: Product Recovery Phase R6 — real-device product acceptance on
  iPhone/Expo Go, including Dynamic Type and screen-reader observation.
- Product Recovery R4 is complete. The authoritative Canvas usable-content
  boundary classifies synchronized Page/Assignment/Announcement content,
  protected stored Image/PDF OCR, and supported module links as `usable`,
  `empty`, `unsupported`, `inaccessible`, or `failed`. Source labels, titles,
  filenames, IDs, and page markers are no longer injected into reviewer text.
  Preview fingerprints plus current selected-course/item/hash checks run before
  Canvas reviewer provider creation, and mobile abort/token state prevents late
  results from restoring stale content. Protected validation passed for a real
  Page reviewer and real stored Image; non-usable fixtures made zero reviewer
  calls. See
  `docs/ai/product-recovery-r4-canvas-usable-content-resolution-20260713.md`.
- Product Recovery Phases R1 through R5 are complete. Focused reports include
  `docs/ai/product-recovery-r1-v1-audit-20260713.md`,
  `docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`,
  `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`,
  `docs/ai/product-recovery-r4-canvas-usable-content-resolution-20260713.md`, and
  `docs/ai/product-recovery-r5-canvas-source-selection-reviewer-ux-20260715.md`.
  R1 compared V1 as the behavioral benchmark with V2 as the architecture
  benchmark. V2's authentication, RLS, encrypted Canvas credentials, protected
  APIs, private source snapshots, provenance, tests, strict parsers, and
  grade/reviewer separation should remain. R2 added bounded field-aware repair,
  validated per-section extractive fallback, emergency source-outline recovery,
  safe quality metadata, and calm mobile fallback rendering. R3 added exact
  page coverage, explicit blank pages, sanitized completeness metadata, stale
  OCR source clearing, and a hard reviewer-generation gate. R4 established the
  authoritative content boundary and R5 recovered the student workflow. The
  next task is Product Recovery Phase R6 - real-device product acceptance.
- Baseline before this Phase 4 implementation:
  `0fdf1e4 docs: complete Phase 3D live PDF validation`.
- Phase 4 implementation commit: the commit containing this handoff update.
- Branch: `main`.
- Stay Focused V2 remains engine-first, evaluation-first, schedule-first, and
  mobile-primary through Expo/React Native.
- The current completed vertical slice is: sign in -> paste source text,
  import a gallery image, take a camera photo, or import a PDF -> review and
  edit source text -> authenticated reviewer API -> OpenAI generation ->
  coverage, grounding, and leakage validation -> reviewer preview -> save to
  Study Library -> list, open, rename, or delete saved reviewers.
- Phase 3A is implemented: provider-agnostic OCR contracts live in
  `@stay-focused/ocr`, Google Cloud Vision OCR wiring lives only under
  `apps/api/src/lib/ocr`, and `POST /api/ocr/extract` exposes a protected
  multipart PNG/JPEG OCR route.
- Expo Web is the fast laptop-browser development and regression surface for
  the mobile app, not a replacement for the mobile-primary product.
- User-facing source intake in the mobile app now supports manual paste,
  gallery-selected PNG/JPEG OCR, camera-captured PNG/JPEG OCR, and PDF OCR with
  editable extracted-text review. Physical-device live image OCR validation
  passed on an iPhone through Expo Go against the local Next.js API over LAN
  with server-only Google Cloud Vision OCR. Phase 3D PDF OCR live validation
  also passed on an iPhone through Expo Go against the local Next.js API over
  LAN with server-only Google Cloud Vision PDF OCR.
- Phase 4 adds reviewer persistence through a Supabase `reviewers` migration,
  owner-scoped RLS, authenticated reviewer CRUD API routes, and a mobile Study
  Library. The local implementation stores generated reviewer output and
  allowlisted metadata only; raw source text, OCR text, uploads, file paths,
  credentials, tokens, and private OCR artifacts are not persisted by the save
  flow.
- Phase 4 is now complete and live validated. The target Supabase project has
  the migration applied, schema/RLS/policies were verified, distinct users
  passed bidirectional owner isolation, safe `404 reviewer_not_found` denial
  passed, and fictional validation rows were cleaned up.
- Phase 5A Secure Canvas Connection and Capability Discovery is complete and
  live validated. It adds the staged Phase 5 roadmap, Canvas
  capability matrix, five Canvas ADRs, a strict `@stay-focused/canvas` client,
  per-user personal access token validation, AES-256-GCM encrypted token
  storage, `canvas_connections` and `canvas_capabilities` migration foundation,
  protected Canvas API routes, and a mobile Courses surface.
- Phase 5A uses personal access tokens generated by individual Canvas users.
  There is no school-wide Canvas token. Each token belongs only to the user who
  generated it and remains limited by that user's Canvas permissions.
- Phase 5A.1 direct server-side Canvas validation passed using one
  developer-owned personal access token from existing ignored local credential
  names without exposing values. Profile validation, course listing, and the
  small capability probes passed over Canvas HTTPS; 17 courses were returned for
  that token. These results prove only that user's available Canvas
  capabilities and do not prove institution-wide access. Live pagination was not
  exercised because the account did not require a second course page.
- Phase 5A.1 remote Supabase migration application passed through
  `npx supabase` using the ignored local Supabase CLI project. Migration
  history now includes `202607050002`, and read-only checks passed for both
  Canvas tables, RLS, encrypted columns, and no direct
  `anon`/`authenticated` encrypted-column access.
- Phase 5A protected API flow validation passed after configuring a real
  app-owned `CANVAS_TOKEN_ENCRYPTION_KEY` in the ignored API-local environment
  file. The hardened key format is canonical padded Base64 and must decode to
  exactly 32 bytes.
- Protected API validation passed on `http://localhost:3000`: API health,
  Supabase bearer authentication for the established smoke-test user,
  connect/status/courses/capabilities/disconnect, encrypted persistence checks,
  invalid replacement PAT preservation, reviewer-count preservation, and final
  disconnected state all passed. Course count was 17; capability count was 25
  with statuses `available` and `not_tested`.
- Phase 5A.2 hardening is complete. The audit returned PASS WITH CONDITIONS and
  the conditions are now closed: Base64 validation is strict and canonical,
  Canvas connection/capability persistence is atomic through
  `replace_canvas_connection_with_capabilities`, capability ownership is
  database-enforced with a composite foreign key, redirect responses are
  rejected with `canvas_redirect_rejected`, request validation tests cover
  malformed and oversized input, realistic automated two-user route tests prove
  user isolation, README status is current, and duplicate ADR numbering is
  resolved by renaming Fast Testing Surfaces to ADR-011.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for migration history, RPC existence,
  revoked `anon`/`authenticated` execution, service-role execution, validated
  ownership constraint, RLS, revoked direct table grants, and revoked encrypted
  column access. The Supabase CLI again emitted a non-fatal Docker catalog-cache
  warning after push.
- Phase 5B.1 Academic Graph Foundation is complete and remotely verified. It
  adds `202607050004_create_canvas_academic_graph.sql`, the academic graph
  tables for courses, modules, module items, Pages, assignment groups, and
  assignments, composite ownership constraints across `user_id`,
  `canvas_connection_id`, and `course_id`, RLS, revoked direct client grants,
  service-role DML access, typed Canvas retrieval methods, and pagination
  regression tests.
- Phase 5B.2 Initial Full Academic Graph Synchronization is complete and live
  validated. It adds `POST /api/canvas/sync`, `canvas_sync_runs`, service-role
  sync-run RPCs, `replace_canvas_course_academic_snapshot`, explicit
  Canvas-to-DB normalization, bounded synchronous orchestration, atomic
  per-course replacement, stale-child cleanup after complete course snapshots,
  partial-run preservation, and mobile service support without UI.
- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied and
  verified. The `202607050006` repair was added after live validation exposed
  an ambiguous `user_id` conflict target in the existing Phase 5A connection
  replacement RPC; the historical migration was not edited.
- Phase 5B.2 live validation recreated the encrypted stored Canvas connection
  through `PUT /api/canvas/connection` using the established smoke-test user
  and ignored local credentials. The connection remains stored for later Canvas
  phases. Two protected `POST /api/canvas/sync` calls returned HTTP 200 with a
  documented partial result: 17 courses discovered, 13 succeeded, 4 failed with
  sanitized `canvas_course_fetch_failed`, 27 modules, 311 module items, 459
  Pages, 18 assignment groups, and 25 assignments. The second run preserved
  internal identities, kept first-sync timestamps stable, advanced last-sync
  timestamps, introduced no duplicate identities, and left zero running sync
  rows.
- Phase 5B.3A Course Recovery Hardening remains closed. The four permanent
  Page-listing failures are classified as sanitized
  `canvas_course_pages_failed` results, non-retryable, and not treated as
  successful empty-Page courses.
- Phase 5B.3B Incremental Academic Graph Synchronization Foundation is
  complete and live validated. It adds deterministic versioned course-snapshot
  fingerprints, `canvas_course_sync_states`, `full` and `incremental` route
  modes, changed/unchanged/failed counts, and service-role-only state RPCs.
  Incremental mode still fetches complete Canvas snapshots, but unchanged
  courses skip database graph replacement.
- Phase 5B.3C1 Conditional Request Capability Audit is complete as live
  validation only. Production sync behavior was not changed. The audit found
  stable ETags on the currently synchronized endpoint families, no
  `Last-Modified`, no 304 responses, and 0% body-byte reduction. Continue
  ordinary GET behavior for courses, modules, module items, Pages, Page
  details, assignment groups, and assignments.
- Phase 5B.4A Planner Item and Announcement Synchronization is complete as a
  backend-only slice with documented live Canvas limitations. It adds typed
  planner and announcement Canvas client methods, deterministic normalization
  and fingerprints, `canvas_planner_items`, `canvas_announcements`,
  service-role-only snapshot RPCs, safe scoped pruning, aggregate route
  diagnostics, and mobile service parsing without UI. It uses ordinary GET
  requests and a 30-day past and 120-day future sync window.
- Phase 5C.1 Secure Canvas File Inventory and Bounded Ingestion Foundation is
  remotely and live validated for backend behavior. It adds Canvas file
  metadata inventory during sync, module/Page/assignment/announcement
  file-reference discovery, a private `canvas-source-files` storage boundary,
  and protected `POST /api/canvas/files/ingest` for selected owned file-row
  ids. It stores only eligible selected files after fresh metadata, redirect,
  byte-limit, and signature checks. Remote migrations `202607060003` and
  `202607060004` are applied, Supabase advisors were reviewed, private Storage
  controls passed, and protected live ingestion plus second-run stability
  passed. It does not parse, OCR, preview, transcribe, or generate reviewers
  from Canvas file contents. The synchronous metadata sync route remains over
  its configured 60-second runtime budget in local production-build
  measurement, so production-runtime readiness is not claimed.
- Phase 5C.2A1 Course Selection and Runtime-Safe Canvas Synchronization is
  complete, remotely verified, and protected-live validated. It changes the
  normal mobile Canvas flow from account-wide synchronization to explicit
  selected-course synchronization. Course inventory is classified for
  presentation using Canvas metadata, preferences are stored in
  `canvas_course_sync_preferences` behind ownership-protected service-role
  RPCs, and the mobile Courses surface saves selected internal course IDs then
  syncs them through independent `POST /api/canvas/courses/:courseId/sync`
  requests with maximum concurrency two. Course-scoped sync reuses the shared
  single-course graph path, includes course-owned announcements and file
  metadata, excludes user-wide planner synchronization, preserves synchronized
  data on deselection, and keeps the account-wide route as a diagnostic and
  future maintenance foundation. Academic-unit synchronization limit: none.
- Phase 5C.2A2 Canvas Source Selection and Reviewer Handoff is complete,
  automated-verification passed, and protected-live validated. It adds selected
  synchronized course source listing, source preview, safe HTML-to-text
  normalization, editable mobile source preview, reuse of the existing reviewer
  generation API, and save-to-Study-Library handoff for stored Canvas Pages,
  assignment descriptions, and announcements. The preview endpoint reads only
  existing database rows and does not call Canvas, decrypt the Canvas token,
  call Storage, invoke OCR, or call OpenAI.
- Phase 5C.2B Canvas PDF/Image OCR Sources is complete, automated-verification
  passed, and protected-live validated for preparation, private Storage-backed
  OCR preview, edited reviewer handoff, and Study Library cleanup. It adds safe
  Canvas file-state descriptors, course-scoped preparation through the existing
  ingestion service, private byte/hash/signature revalidation, one OCR-backed
  file per preview, ordered mixed-source assembly, mobile prepare/ready states,
  no extracted-text persistence, and no Canvas/OpenAI calls during preview.
- Phase 5D.1 Immutable Source Snapshots and Exact Reviewer Provenance is
  implemented and remotely verified as the first bounded Phase 5D slice. It
  adds private short-lived preview sessions, immutable exact edited source
  snapshots, ordered source snapshot items, parser/OCR version identifiers,
  database-enforced same-owner reviewer linkage, Canvas save enforcement, and
  safe Study Library detail provenance summaries. The reviewer engine/provider
  boundary still receives only `sourceText` and `sourceTitle`.
- Phase 5D.2 Structured Normalized Blocks and Selective Import is implemented
  and remotely verified. It adds private short-lived Canvas source structure
  sessions, normalized HTML/OCR block manifests, safe public block selectors,
  bounded selected-block preview creation, selected-block immutable snapshot
  rows, mobile block-selection UI, and safe Study Library selected-block
  counts. The reviewer engine/provider boundary still receives only
  `sourceText` and `sourceTitle`.
- Phase 5D.3 Duplicate Relationships, Source Freshness, and Regeneration
  Readiness is implemented. It adds exact same-source and same-content
  duplicate summaries, repeated-reference categories, private immutable
  snapshot item relationship rows, a protected manual reviewer source-status
  endpoint, conservative missing-after-sync semantics, Study Library
  source-health UI, and readiness assessment without actual regeneration. The
  source-status path does not call Canvas, decrypt the PAT, read Storage,
  invoke OCR, or call OpenAI.
- Phase 5D.1 through Phase 5D.3 protected live validation completed on
  2026-07-08 with aggregate opaque output only. The run reused `connection-1`,
  synchronized `course-1`, loaded source structure, previewed selected blocks,
  created and removed one reviewer/snapshot validation set, verified
  source-status `current` and `ready_current`, confirmed no source-status
  sync/Canvas/decrypt/Storage/OCR/OpenAI/regeneration side effects, and
  preserved pre-existing data. See
  `docs/ai/phase5d-protected-live-validation-20260708.md`.
- Live second-user validation was not run because no separate second test-user
  credentials were available. Automated route tests cover user scoping for
  connection, courses, capabilities, and disconnect behavior.
- Canvas OAuth is not implemented. It is the intended production authorization
  path for broad multi-user deployment and requires an institution-approved
  Canvas Developer Key.
- Phase 5E planning is complete in
  `docs/ai/phase5e-grades-submissions-plan-20260708.md`, and Phase 5E.1 is
  complete in
  `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`. Phase 5E.2 is
  complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.3
  is complete and remotely verified in
  `docs/ai/phase5e3-explicit-grade-sync-20260708.md`; migrations
  `202607080005_add_canvas_grade_sync_rpcs.sql` and
  `202607080006_harden_canvas_grade_sync_rpc_function_references.sql` are
  applied remotely, RPC execution is service-role-only, RLS/direct grants
  remain hardened, the rollback-safe verifier passed 17/17 checks, and no
  fictional rows remain. The recommended MVP remains strictly read-only
  selected-course assignment, submission, and visible grade state. Phase 5E.4
  is implemented in
  `docs/ai/phase5e4-protected-grade-api-20260708.md`; it exposes protected
  explicit grade sync plus DB-only list, detail, summary, and sync-status
  routes for owned selected courses. Only the sync route can call Canvas through
  the Phase 5E.3 service. Phase 5E.5 is complete and locally validated in
  `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: selected courses now
  expose a mobile `Grades` entry point, grade reads are strict and GET-only on
  mount/reload, explicit `Sync grades` is the only grade POST, assignment
  pagination and detail are wired, and hidden grade wrappers are never shown as
  zero. Unofficial local grade estimates, durable grade caching, notifications,
  background jobs, submission writes, private submission-content return, and
  reviewer prompt use remain excluded. Phase 5E.6 is in progress in
  `docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
  automated baseline checks, protected API preflight, Expo Web protected smoke,
  session-only smoke, controlled fictional edge validation, authorization
  regression checks, and privacy scans passed. Physical iPhone Expo Go
  validation remains required before Phase 5E.6 and Phase 5E can be marked
  complete.
- Remaining secondary Canvas resources, broader parser families,
  stale/deleted-source comparison, Phase 5E.6 physical-device validation,
  background synchronization, task generation, and study schedule generation are
  still pending. Production endpoint validators remain unsupported for the audited
  endpoint families. Discussions, quiz metadata, announcement attachment
  content import, and broader Canvas resource support remain deferred.

## Environment and credentials

Credentials are supplied through ignored local environment files and managed
deployment/provider secret configuration. Future agents must inspect the
existing environment-variable names and project setup before running protected
integrations. Never print, log, commit, partially reveal, or copy secret values
into documentation.

Typical configuration locations:

- local development: ignored `.env.local` files at the root, `apps/api`, and
  `apps/mobile`
- Vercel: project environment variables
- Supabase: project configuration and secrets
- Google Cloud: configured OCR service credentials
- Canvas: encrypted connection or local protected environment configuration

Useful variable names confirmed in example files and code:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`,
`EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_BASE_URL`, `OPENAI_API_KEY`,
`GOOGLE_CLOUD_PROJECT_ID`, `GOOGLE_CLOUD_PROJECT`,
`GOOGLE_CLOUD_CREDENTIALS_JSON`, `GOOGLE_APPLICATION_CREDENTIALS`,
`CANVAS_TOKEN_ENCRYPTION_KEY`, `CANVAS_BASE_URL`,
`CANVAS_PERSONAL_ACCESS_TOKEN`, `CANVAS_ACCESS_TOKEN`,
`CANVAS_LIVE_BASE_URL`, and `CANVAS_LIVE_PERSONAL_ACCESS_TOKEN`.

## Current Test Baselines

- Product Recovery R3: OCR typecheck/build/tests 25/25; engine
  typecheck/build/evals 287/287; API typecheck/lint/build/tests 391/391; mobile
  typecheck/lint/tests 130/130; root typecheck/lint 7/7 workspaces; reviewer
  smoke-runner tests 51/51; mocked PDF OCR browser smoke passed; protected
  real-OCR validation passed for single-page image, two-page PDF, five-page
  PDF, blank-middle PDF, and controlled incomplete input. Five-page extraction
  was 5/5 in one call and 1.591 seconds; incomplete input made zero reviewer
  calls.
- Reviewer smoke-runner tests: 51 passed, 0 failed.
- DB package typecheck: passed.
- OCR package typecheck/build/tests: passed; 14 tests passed, 0 failed.
- API typecheck/tests: passed; 94 tests passed, 0 failed.
- Engine build: passed.
- Engine evaluations: 266 passed, 0 failed.
- Mobile typecheck: passed.
- Mobile OCR client/picker/source-flow/library/Canvas service tests: 70 passed,
  0 failed.
- Canvas package typecheck/build/tests: passed; 30 tests passed, 0 failed after
  Phase 5B.1 endpoint and pagination coverage.
- DB package typecheck after Canvas migration/types: passed.
- API typecheck/tests including Canvas routes and encryption: passed; 146 tests
  passed, 0 failed.
- Direct live Canvas validation: passed through
  `scripts/phase5a-live-canvas-validation.mjs` with sanitized output only; 17
  courses were returned for the developer-owned personal access token used by
  that script.
- Remote Canvas migration verification: passed; both Canvas tables, RLS, and no
  direct encrypted-column access were verified.
- Phase 5A.2 remote hardening migration verification: passed; RPC, grants,
  ownership constraint, RLS, and direct grant restrictions verified.
- Phase 5B.1 remote migration verification: passed. Migration history includes
  `202607050004`; rollback SQL verification passed with fake User A/User B
  graph data; read-only checks confirmed new tables, RLS, composite ownership
  constraints, required indexes, revoked direct client grants, service-role DML
  grants, and unchanged Phase 5A protections.
- Phase 5B.2 remote migration verification: passed. Migration history includes
  `202607050005` and `202607050006`; rollback SQL verification passed for
  sync-run ownership constraints, active-run protection, stale-run recovery,
  atomic course replacement, duplicate prevention, stable IDs, rollback on
  malformed relationships, RLS, grants, public RPC revocation, service-role RPC
  execution, and unchanged Phase 5A and Phase 5B.1 protections.
- Phase 5B.2 live validation: passed with sanitized aggregate-only output.
  Protected connection recreation passed, two sync runs returned HTTP 200
  partial results, the final encrypted connection remained stored, duplicate
  identities were absent, internal identities were stable, first-sync
  timestamps were stable, last-sync timestamps advanced, and no sync run
  remained running.
- Phase 5B.3B verification: Canvas typecheck/build/tests passed with 33/33
  tests; DB typecheck passed; API typecheck/build/tests passed with 176/176
  tests; mobile typecheck/tests passed with 79/79 tests; root typecheck passed
  across 7/7 workspaces with 4 cached and 3 fresh; root build passed across
  7/7 workspaces with 4 cached and 3 fresh; workspace tests passed with API
  176/176, mobile 79/79, Canvas 33/33, and OCR 14/14; `git diff --check`
  passed with line-ending warnings only.
- Phase 5B.3C1 live audit: stored encrypted Canvas connection loaded and
  decrypted through the API-side boundary; 10 baseline GET requests and 10
  primary conditional requests were audited; all primary conditional requests
  returned HTTP 200 with full bodies, 0 returned 304, and body-byte reduction
  was 0%. No sync run remained running.
- Phase 5B.3C1 focused verification: Canvas typecheck/build/tests 33/33, API
  typecheck/build/tests 176/176, and mobile typecheck/tests 79/79 passed.
- Phase 5B.4A verification: Canvas typecheck/build/tests 35/35, DB typecheck,
  API typecheck/build/tests 183/183, mobile typecheck/tests 79/79, root
  typecheck 7/7, root build 7/7 after clearing a generated API `.next`
  artifact from the known OneDrive/Next issue, workspace tests API 183/183,
  mobile 79/79, Canvas 35/35, OCR 14/14, and `git diff --check` with CRLF
  warnings only.
- Phase 5B.4A remote verification: migrations `202607060001` and
  `202607060002` are applied remotely; rollback SQL verification passed
  through `scripts/phase5b4a-planner-announcements-verification.sql`.
- Phase 5B.4A live validation: first protected sync inserted 37 planner items
  and 19 announcements; second protected sync classified 37 planner items and
  19 announcements as unchanged with stable identities, zero duplicates, zero
  unnecessary updates, zero unexpected pruning, stable sanitized failure
  categories, preserved failed course graphs, and zero running sync rows.
- Phase 5C.1 verification: Canvas tests 50/50 and typecheck passed; API tests
  184/184 and typecheck passed; mobile tests 79/79 and typecheck passed; OCR
  tests 14/14 passed; root typecheck/build/tests passed across 7/7 workspaces.
  Remote migrations `202607060003` and `202607060004` are applied. Supabase
  security/performance advisors were reviewed; new Phase 5C.1 foreign-key
  index warnings were fixed. Protected live ingestion stored two eligible files
  and one metadata-only result, then a second ingestion stored zero additional
  bytes with stable object pointers.
- Phase 5C.2A1 verification: migration `20260706113150` is applied remotely;
  rollback-safe SQL verification passed; Supabase security/performance
  advisors produced no new Phase 5C.2A1 findings; Canvas package tests,
  API route tests, mobile service tests, workspace typechecks, production
  builds, and workspace tests passed. Protected live validation used aggregate
  output only: inventory returned 76 course shells, two likely-current courses
  were selected, first selected-course sync durations were 6.052 seconds and
  8.492 seconds, second selected-course sync durations were 5.833 seconds and
  7.849 seconds, deselect/reselect preserved data and identities, zero running
  rows remained, and the normal selected-course flow did not call the
  account-wide route.
- Phase 5C.2A2 verification: Canvas package typecheck/build/tests passed with
  52/52 tests; DB package typecheck passed; API typecheck/build/tests passed
  with Canvas source-list, preview, reviewer, and route coverage; mobile
  typecheck/tests passed with Canvas source API coverage; engine
  typecheck/build/eval passed with 266/266 evaluations; OCR typecheck/build/tests
  passed with 14/14 tests; root typecheck/build/workspace tests and
  `git diff --check` passed. Protected live validation used aggregate-only
  output: one opaque selected course exposed 49 descriptors, a two-source
  preview assembled 3,467 characters deterministically without Canvas,
  Storage, OCR, or OpenAI preview calls, the existing reviewer API returned HTTP
  200, a two-section reviewer was saved to Study Library, and the smoke item
  was cleaned up.
- Phase 5C.2B verification: Canvas package typecheck/build/tests 52/52; DB
  typecheck passed; OCR typecheck/build/tests 14/14; API typecheck/build/tests
  269/269; mobile typecheck/tests 92/92; engine typecheck/build/evals 266/266;
  root Turbo typecheck/build 7/7 with 5 cached and 2 fresh tasks; workspace
  tests API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14. Protected live
  validation checked 2 selected synchronized courses, found 0 eligible PDFs and
  2 eligible images, prepared opaque `live-file-1`, reran preparation
  idempotently, previewed Page -> Image -> Announcement with 1 OCR-backed
  source and 62 extracted image characters, returned no private Storage or
  credential fields, generated and saved a reviewer from harmless edited text,
  verified Study Library visibility, and deleted the validation reviewer. An
  exploratory generation attempt including the very short/noisy live OCR
  preview text returned the existing `reviewer_validation_failed` response.
- Phase 5D.1 verification: migrations `202607070001`, `202607070002`, and
  `202607070003` are applied remotely; rollback-safe SQL verification passed
  through `scripts/phase5d1-source-provenance-verification.sql`; Canvas
  typecheck/build/tests 52/52; DB typecheck passed; OCR typecheck/build/tests
  14/14; API typecheck/build/tests 284/284; mobile typecheck/tests 93/93;
  engine typecheck/build/evals 266/266; root Turbo typecheck/build 7/7 with 4
  cached and 3 fresh tasks; workspace tests API 284/284, mobile 93/93, Canvas
  52/52, OCR 14/14. Supabase advisors showed no new Phase 5D.1 findings after
  the follow-up function search-path hardening migration; remaining warnings
  are historical. The rollback verifier also covers snapshot item context
  mismatch rejection. Phase 5D.1 protected live validation completed on
  2026-07-08.
- Phase 5D.2 verification: migration
  `202607070004_add_canvas_selective_source_blocks.sql` is applied remotely;
  rollback-safe SQL verification passed through
  `scripts/phase5d2-selective-blocks-verification.sql` with 18 PASS checks;
  shared typecheck/build passed; Canvas typecheck/build/tests 52/52; DB
  typecheck passed; OCR typecheck/build/tests 14/14; API typecheck/build/tests
  299/299; mobile typecheck/tests 95/95; engine typecheck/build/evals 266/266;
  root Turbo typecheck/build passed across 7/7 workspaces; workspace tests
  passed with API 299/299, mobile 95/95, Canvas 52/52, and OCR 14/14. Supabase
  advisors showed no new Phase 5D.2 findings; remaining warnings are
  historical. Phase 5D.2 protected live validation completed on 2026-07-08.
- Phase 5D.3 verification uses migrations
  `202607080001_add_canvas_source_relationships_freshness.sql` and
  `202607080002_harden_source_relationship_grants.sql`, plus rollback-safe SQL
  verifier
  `scripts/phase5d3-source-relationships-freshness-verification.sql`. Remote
  SQL verification passed with 18/18 checks. Automated verification passed with
  root typecheck/build across 7/7 workspaces, workspace tests API 315/315,
  mobile 98/98, Canvas 52/52, OCR 14/14, and engine evals 266/266. Supabase
  advisors were reviewed; remaining warnings are historical. Phase 5D.3
  protected live validation completed on 2026-07-08.
- Reviewer smoke-runner tests: 51 passed, 0 failed.
- Reviewer web smoke: passed with real reviewer generation.
- OCR web smoke: passed with mocked image OCR response and real reviewer
  generation.
- PDF OCR web smoke: passed with a fictional in-memory PDF fixture, mocked PDF
  OCR response, editable extracted text, and real reviewer generation.
- Phase 3C live iPhone camera/image OCR validation: passed with editable OCR
  text, reviewer generation, Reviewer Ready, source-faithful, coverage, and
  clean-output validation.
- Phase 3D live iPhone PDF OCR validation: passed with a fictional,
  image-only, two-page scanned PDF, editable OCR text, reviewer generation,
  Reviewer Ready, source-faithful, coverage, and clean-output validation.
- Phase 3D oversized-PDF validation: a separate PDF with more than five pages
  was rejected safely with the expected UI messages.
- Latest recorded unattended reviewer smoke during Phase 3A verification:
  passed on local HEAD `00d3e8f` before the Phase 3A commit, using a persisted
  session and returning HTTP 200 from the reviewer POST.
- Current unattended smoke command: `npm run smoke:reviewer:web`.
- Current OCR browser smoke commands: `npm run smoke:ocr:web` and
  `npm run smoke:ocr-pdf:web`.
- Live Study Library validation: passed with distinct users, bidirectional RLS
  isolation, safe item-operation 404s, owner cleanup, and no validation rows
  remaining.
- Final Phase 4 regression pass: DB typecheck, API typecheck/tests, mobile
  typecheck/tests, engine build/evals, OCR tests, and `git diff --check`
  passed. The reviewer `[id]` route typing fix changed App Router type shape
  only; runtime behavior was unchanged.

## Immediate Next Task

Phase 5A hardening is complete, Phase 5A quality conditions are closed, Phase
5B.1 academic graph foundation is complete, and Phase 5B.2 initial full
academic graph synchronization is complete and live validated. Phase 5B.3A
course recovery hardening is complete and live validated. Phase 5B.3B
incremental academic graph synchronization foundation is complete and live
validated. Phase 5B.3C1 conditional-request capability audit is complete and
does not support Phase 5B.3C2 implementation for the audited endpoints. The
Phase 5B.4A planner-item and announcement synchronization slice is complete
with documented live Canvas limitations. Phase 5C.1 file inventory and bounded
ingestion foundation is remotely and live validated with a documented
account-wide synchronous route-duration limitation. Phase 5C.2A1
selected-course synchronization is complete and runtime-safe in local
production validation. Phase 5C.2A2 Canvas source selection and reviewer
handoff is complete and live validated. Phase 5C.2B Canvas PDF/image OCR
sources are complete and live validated. Phase 5D.1 immutable source snapshots
and exact reviewer provenance, Phase 5D.2 structured normalized blocks and
selective import, and Phase 5D.3 duplicate relationships, source freshness,
and regeneration readiness are implemented, remotely verified, and
protected-live validated. Phase 5E planning is complete in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`, and Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`. Phase 5E.2 is
complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.1 adds
only the normalized contract, schema, DB types, and rollback-safe SQL verifier.
Phase 5E.2 adds only read-only Canvas assignment metadata, own-submission, and
visible course-grade client methods with safe normalized provider contracts,
explicit visibility wrappers, shared pagination/error handling, omitted
`student_ids[]`, `user_id=self`, and unsafe-field discards. Phase 5E.3 adds the
internal explicit per-selected-course grade synchronization service,
Canvas-to-database normalization, deterministic fingerprints, service-role-only
RPC persistence, authoritative absence marking, partial-failure preservation,
and per-course grade sync state. Canvas access remains read-only and manual.
Remote Supabase verification is complete through `202607080006`, with
service-role-only RPC execution, hardened table grants/RLS, 17/17 rollback
verifier checks passing, and zero fictional rows remaining. Phase 5E.4 exposes
protected grade API routes for explicit selected-course sync plus DB-only list,
detail, summary, and sync-status reads. Phase 5E.4 protected live validation is
complete in `docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`;
the closeout fixed the sync route course-scope preflight so unknown valid
course UUIDs return safe `404` and owned but unselected courses return safe
`400` before Canvas synchronization. Phase 5E.5 is complete and locally
validated in `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: mobile now
has selected-course `Grades`, strict parsers, GET-only loading/reload, explicit
per-course grade sync, course summary display, assignment pagination, protected
assignment detail, stale/partial/failed copy, and in-memory-only network
failure preservation. No background synchronization, durable grade cache,
notification, local grade calculation, submission mutation, private
submission-content return, or reviewer integration exists. Phase 5E.6 is in
progress in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed. The next roadmap step is Phase
5E.6 physical iPhone Expo Go validation; Phase 5E is not complete until that
device checklist passes.
Product Recovery R3 is complete with exact OCR page completeness enforced for
all accepted documents. Product Recovery R4 - Canvas usable-content resolution
is the immediate product-recovery task. Phase 5E.6 remains in progress and is
not marked complete by R3.
Automatic repeated scanned-PDF header/footer detection remains a deferred
candidate.

## Known Blockers And Risks

- OneDrive-backed generated Next output can leave stale reparse-point artifacts;
  the smoke runner clears generated `apps/api/.next/server` before
  runner-owned API startup. A stale generated
  `apps/api/.next/types/cache-life.d.ts` reparse-point artifact was removed
  during Phase 4 verification before rerunning the PDF OCR smoke.
- OpenAI cost, rate limits, and serverless latency can affect reviewer
  generation.
- OCR layout preservation is a product risk because reviewer quality depends on
  line, heading, and list boundaries.
- Live Google OCR has passed on a correctly configured local API, but future
  live OCR remains credential-, LAN-, and device-dependent. Credential paths
  are machine-specific and must not be documented or committed.
- Scanned-PDF OCR is implemented and live-validated as a synchronous 1-5 page
  product boundary. Five is the inline Google Vision `files:annotate` limit,
  is centralized in `@stay-focused/ocr`, and is checked before provider work.
  Accepted documents require exact terminal coverage of every page. Larger
  PDFs require a separately planned asynchronous Cloud Storage architecture.
  Visible repeated headers and footers may still be extracted as source text
  until a later cleanup task adds automatic repeated header/footer detection.
- Reviewer persistence has a live cross-user RLS validation baseline. Future
  persistence changes should preserve owner-scoped access, safe 404 denial, and
  owner-only cleanup behavior.
- Phase 5A Canvas storage requires `CANVAS_TOKEN_ENCRYPTION_KEY`, which must be
  canonical padded Base64 and decode to exactly 32 bytes. Stored ciphertext, IV,
  and authentication-tag fields are strictly decoded and fail closed when
  malformed. Do not generate a permanent fallback key and do not log the key or
  Canvas tokens.
- The protected connect/status/courses/capabilities/disconnect flow has passed
  locally with a real app-owned ignored local key, not a temporary test key.
- Each Canvas personal access token is validated through the API, encrypted
  server-side, stored only for the authenticated Stay Focused user, and never
  returned to mobile. Mobile uses secure text entry and clears the token after
  connect attempts; it does not store the Canvas token in AsyncStorage or
  SecureStore.
- `CANVAS_PERSONAL_ACCESS_TOKEN` is developer-owned live-validation input only,
  not a shared application credential.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is a deployment-owned encryption secret. It is
  not obtained from Canvas, the school, or the student.
- Canvas permissions vary by user, role, institution, and course. Course access
  for one token does not imply module, file, grade, quiz, caption,
  conversation, external-tool, or institution-wide access.
- Phase 5B.2 synchronization is synchronous and manual. The observed live
  account finished inside the current 60-second route duration, but the first
  run was close to the limit. Larger accounts may need resumable or background
  synchronization later.
- Phase 5B.2 persistence is atomic per course, not one transaction for the
  entire Canvas account. Partial account syncs may commit successful courses
  while preserving failed courses.
- No background or scheduled Canvas synchronization exists yet, and no mobile
  synchronization screen exists yet.
- Canvas OAuth is required before broad public production authorization can be
  presented as complete. It requires an institution-approved Canvas Developer
  Key and is not implemented.
- Mobile OAuth redirect completion is not yet validated as complete.
- Server secrets must stay out of mobile env files, browser bundles, logs, and
  committed files.
- Captured images, screenshots, credential files, OCR artifacts, tokens, and
  private document OCR output must stay out of committed files.

## Historical Snapshot Before 2026-07-04

The following undated snapshot is retained for history only. The current status
is the section above.

- Stay Focused V2 uses an engine-first, evaluation-first workflow.
- Stages 0 through 6 and the end-to-end pipeline are implemented with typed
  evaluation coverage.
- The API-layer OpenAI provider now includes an injected-client adapter and a
  server-only OpenAI SDK factory in commit `d8374e9`, present on `origin/main`.
- The current branch is `main` at `d8374e9`, matching `origin/main`.
- The latest full evaluation result is 219 passed and 0 failed.
- OpenAI adapter contract checks pass 18 cases with fake clients and no network
  access.
- Node.js `v24.16.0` and npm `11.13.0` are installed. The Node directory was
  added to the user PATH, and PowerShell CurrentUser execution policy is
  `RemoteSigned` so the official npm shim can run.
- API and engine typechecks/builds pass. Root workspace typecheck/build now run
  but stop in untouched mobile configuration due duplicate React types and a
  missing `react-native-web` dependency.
- The real OpenAI smoke test is implemented but was not run because it remains
  explicitly opt-in through `RUN_OPENAI_SMOKE=1`.
- Supabase JWT Bearer authentication is now enforced on `/api/review`.
- This handoff is local-only, ignored by Git, and was not committed.

### Historical Recent Completed Work

### Stage 0 - Domain Contracts and Source Normalization

- Added domain contracts and initial normalized source handling.
- Added the evaluation framework foundation and Stage 0 cases.
- Recorded verification: 14 passed, 0 failed.

### Stage 1 - Outline Detection

- Implemented deterministic outline detection.
- Added typed eval coverage for outline behavior.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed.

### Stage 2 - Generation Planning

- Implemented deterministic generation planning.
- Added plan-oriented eval cases.
- Recorded verification: Stage 0 14 passed; Stage 1 14 passed; Stage 2 24
  passed.

### Stage 3 - Provider Requests and Typed Outputs

- Implemented deterministic, source-grounded prompts.
- Added provider-agnostic schema selection with `gpt-4o` as the default model.
- Added plan, section, schema, and source metadata to provider requests.
- Added validation for returned output fields and identities.
- Wrapped provider failures with section context.
- Kept all provider access behind the `GenerationProvider` interface.
- Added plain serializable TypeScript descriptors for `ConceptCard`,
  `ProcessStep`, `ExampleCard`, and `ClaimCard`.
- Added 24 eval cases covering schema selection, prompts, metadata, valid
  outputs, invalid responses, missing inputs, source references, and provider
  failures.

### Stage 4 - Coverage Verification

- Implemented deterministic coverage verification using eval-first
  development.
- Added checks for schema alignment, required content, source coverage,
  scoring, statuses, ordering, and validation.
- Added Stage 4 to the aggregate eval runner.

### Stage 5 - Bounded Retry Handling

- Implemented eval-first bounded retries through the existing Stage 3 provider
  boundary.
- Preserved passed outputs and retried only retryable weak or failed sections.
- Re-ran Stage 4 coverage after generated retry candidates and stopped sections
  once they passed or reached the configured retry bound.
- Added fake-provider coverage for policy switches, provider failures, missing
  outputs, ordering, replacement behavior, and structural validation.
- Added Stage 5 to the aggregate eval runner.

### Stage 6 - Deterministic Reviewer Assembly

- Implemented deterministic reviewer assembly without a final provider or
  model pass.
- Preserved generation-plan order and all typed section output content.
- Added stable reviewer and reviewer-section IDs, deterministic metadata, and
  explicit weak-section opt-in.
- Added validation for output, coverage, plan, source, schema, and source-block
  relationships.
- Added Stage 6 to the aggregate eval runner with 30 cases.

### Pipeline Integration

- Wired `runPipeline` through normalization, outline detection, generation
  planning, initial generation, coverage verification, bounded retries, final
  verification, and reviewer assembly.
- Kept all provider calls behind `GenerationProvider` and used deterministic
  fake providers in integration evals only.
- Added integration coverage for schema routing, source order, request counts,
  retries, weak-section policy, metadata, deterministic IDs, and contextual
  failures.
- Added the pipeline integration suite to the aggregate eval runner.

### Engine Contract Documentation

- Added ADR-004 for the accepted Stage 0 through Stage 6 engine pipeline.
- Added an implementation-focused engine contract covering public types, stage
  boundaries, provider requests, schema family, verification, retries, and
  current limitations.
- Updated the repository README, capstone overview, and eval README with the
  completed pipeline status and capstone context.

### OpenAI Provider Adapter Boundary

- Added ADR-005 and implementation documentation for an API-layer OpenAI
  adapter behind `GenerationProvider`.
- Added an injected-client `OpenAIProvider` boundary without importing the
  OpenAI SDK or changing Stage 0 through Stage 6.
- Added 16 dependency-free fake-client contract checks for request mapping,
  structured output parsing, validation, and error wrapping.
- Added safe env templates and strengthened ignore rules for local env and
  credential files.
- Migrated matching V1 local values into ignored V2 root/API/mobile env files;
  Google Cloud project and credential values remain missing.

### Server OpenAI SDK Wiring

- Installed the OpenAI SDK in `apps/api` only.
- Added `createServerOpenAIProvider`, which reads the server-only
  `OPENAI_API_KEY` and constructs the real SDK client behind the existing
  `OpenAIResponsesClient` boundary.
- Preserved strict JSON Schema Responses API mapping and Stage 3 validation.
- Added an opt-in, one-call OpenAI smoke module guarded by
  `RUN_OPENAI_SMOKE=1`.
- Expanded fake-client provider contract coverage to 18 passing checks.
- Restored local Node/npm access without changing system PATH.

### Historical Active Branch / Commits

- Branch: `main`
- `d8374e9` - `feat(api): wire server openai provider`
- `a0233be` - `feat(api): design openai provider adapter boundary`
- `e2a665f` - `docs(engine): document completed pipeline contract`
- `cc5dac2` - `feat(engine): wire pipeline integration`
- `d54b4cb` - `feat(engine): implement stage 6 reviewer assembly`
- `25aabc4` - `feat(engine): implement stage 5 bounded retries`
- `612bfe0` - `chore: add local-only agent handoff template`
- `e0f79bf` - `feat(engine): implement eval-first stage 4 coverage verification`
- `a108a26` - `feat(engine): implement eval-first stage 3 provider requests`
- `5f50c89` - `feat(engine): implement eval-first stage 2 generation planning`
- `1aad79c` - `feat(engine): implement eval-first stage 1 outline detection`
- `4483503` - `test(engine): add dependency-free evaluation harness`
- `dfd6ae8` - `feat(engine): add domain contracts and stage 0 normalization`

`origin/main` currently points to `a0233be`, confirming that the OpenAI adapter
boundary commit was pushed.

### Historical Test / Verification Status

Latest full verification through pipeline integration on 2026-06-15:

- Stage 0: 14 passed
- Stage 1: 14 passed
- Stage 2: 24 passed
- Stage 3: 24 passed
- Stage 4: 21 passed
- Stage 5: 28 passed
- Stage 6: 30 passed
- Pipeline integration: 21 passed
- Total: 176 passed, 0 failed
- Direct TypeScript 5.8.3 source and eval typechecks passed.
- Direct TypeScript 5.8.3 source and eval builds passed.
- Each Stage 0 through Stage 6 suite and the pipeline suite passed
  independently.
- The aggregate eval runner passed.
- The failure exit-code check correctly returned `1`.
- `git diff --check` passed with exit code `0`.
- `npm install` passes with npm `11.13.0`.
- `npm run typecheck` starts successfully but fails in untouched mobile code
  because React Native JSX types resolve against incompatible duplicate React
  type definitions.
- `npm run build` starts successfully but fails in untouched mobile setup
  because Expo web export requires `react-native-web`.
- Verification used the bundled Codex Node.js runtime and the local temporary
  TypeScript 5.8.3 compiler package.
- The documentation session reran direct source/eval typechecks, both builds,
  and the full 176-case eval runner successfully.
- The adapter session reran the full 176-case engine eval runner and direct
  engine typechecks/builds successfully.
- API provider-specific TypeScript typecheck/build passed, and all 18 provider
  contract checks passed without a real API key or network call.
- The API Next.js production build passes.
- The OpenAI smoke test was not run because it is opt-in and
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.

### Historical Important Architecture Decisions

- Engine-first development continues.
- Evaluation-first development is the standard workflow for each engine stage.
- The provider boundary must remain isolated through `GenerationProvider`.
- Stage outputs must remain typed, serializable, and source-grounded.
- `packages/engine` must not contain UI coupling.
- Provider schema descriptors remain plain serializable TypeScript data rather
  than SDK-specific objects.
- Real model quality evaluation remains separate from deterministic engine
  contract evaluation.

### Historical Known Constraints

- New shells inherit `C:\Program Files\nodejs` from the user PATH. Existing
  long-lived parent processes may require a restart to observe the updated
  environment automatically.
- Google Cloud project ID and credentials are not available in the migrated
  local environment files.
- OpenAI token ceilings and serverless execution limits may affect future
  generation latency and should be monitored when real provider integration is
  added.
- `npm install` currently reports 12 moderate dependency vulnerabilities; no
  forced audit fix was applied because that could introduce unrelated breaking
  changes.

### Historical Blockers

- Root workspace typecheck is blocked by duplicate React type definitions in
  the existing mobile workspace.
- Root workspace build is blocked because the existing Expo web configuration
  does not include `react-native-web`.
- CRLF warnings appear during some Git checks but do not block verification.

### Historical Recommended Next Task

- Run the opt-in OpenAI smoke test in a deliberate credentialed session, then
  add a protected API route that constructs the server provider and invokes the
  unchanged engine pipeline.
- Resolve the separate mobile dependency/type mismatch before requiring clean
  root monorepo typecheck and build results.

## Session Log

### 2026-07-13 Product Recovery R3 full-document OCR completeness

- Started on `main` at
  `a1ffef95cdc99dc9f0845d6dd2779b2969466f37`, synced 0/0 with origin. The
  four declared unrelated dirty paths remained untouched and unstaged.
- Audited manual image/PDF OCR, Canvas stored-file OCR, mobile reviewer handoff,
  Google provider normalization, page-count and upload enforcement, and V1's
  read-only page-rendering behavior.
- Added one authoritative shared verifier for expected page count, exact unique
  coverage, range, valid terminal states, explicit blank pages, deterministic
  ordering, sanitized diagnostics, and assembled-source eligibility.
- Provider, extraction service, API routes, Canvas preparation, mobile parsing,
  source state, and reviewer start now all fail closed on incomplete OCR. A
  failed retry cannot reuse stale OCR text.
- Retained and centralized the five-page PDF limit because the current
  synchronous inline Google Vision method permits at most five pages per call;
  all over-limit rejection happens before the provider call.
- Automated verification passed: OCR 25/25, engine 287/287, API 391/391,
  mobile 130/130, reviewer smoke-runner 51/51, full typecheck/lint/build checks,
  and mocked PDF OCR browser smoke with reviewer HTTP 200.
- Protected fictional real-OCR validation passed for 1-page image, 2-page PDF,
  5-page PDF, blank-middle PDF, and controlled incomplete input. The 5-page
  case processed/extracted all 5 pages in one call and 1.591 seconds, with
  reviewer coverage/grounding/leakage passing. The incomplete case made zero
  reviewer calls.
- No OCR text, document title, private Canvas content, provider body, provider
  ID, upload, rendered page, credential, or local validation artifact was
  printed or committed.
- Full report:
  `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

### 2026-07-06 Phase 5C.1 Canvas file inventory and bounded ingestion

- Baseline: `main` at `b6fecec`, synced with `origin/main` at start. Known
  unrelated dirty files remained untouched: `apps/api/next-env.d.ts`,
  `apps/mobile/expo-env.d.ts`, and `apps/mobile/.gitignore`.
- Added typed Canvas file metadata methods and a bounded binary download path
  in `@stay-focused/canvas`.
- Download hardening includes manual redirect handling, off-origin bearer-token
  stripping, unsafe redirect target rejection, timeout enforcement,
  content-length checks, and stream byte caps.
- Added a central Canvas file policy tied to existing OCR ceilings: 10 MiB per
  file, 3 selected files per ingestion request, and 15 MiB aggregate stored
  bytes.
- Added file metadata normalization and HTML reference discovery with `parse5`
  for module items, Pages, assignments, and announcements. The normalizer
  records references only; it does not fetch or extract file contents.
- Added migration
  `202607060003_add_canvas_file_ingestion_foundation.sql` for `canvas_files`,
  `canvas_file_references`, `canvas_file_ingestion_results`, service-role-only
  RPCs, and private `canvas-source-files` storage bucket posture.
- Added follow-up migration
  `202607060004_add_canvas_file_ingestion_fk_indexes.sql` after Supabase
  performance advisors identified new Phase 5C.1 foreign-key index warnings.
- Extended `POST /api/canvas/sync` with file inventory and aggregate file
  counts while preserving sanitized route output.
- Added protected `POST /api/canvas/files/ingest`, which accepts selected owned
  `canvas_files` row ids, re-fetches metadata, stores only eligible validated
  bytes, cleans up unreferenced old objects, and returns sanitized per-file
  statuses without filenames, URLs, object keys, hashes, or Canvas response
  bodies.
- Extended mobile Canvas sync response parsing for `files` and
  `fileReferences` counts without adding UI.
- Automated verification passed:
  - `npm test --workspace @stay-focused/canvas`: 50/50
  - `npm run typecheck --workspace @stay-focused/canvas`: passed
  - `npm run build --workspace @stay-focused/canvas`: passed
  - `npm run typecheck --workspace @stay-focused/db`: passed
  - `npm test --workspace apps/api`: 184/184
  - `npm run typecheck --workspace apps/api`: passed
  - `npm run build --workspace apps/api`: passed
  - `npm test --workspace apps/mobile`: 79/79
  - `npm run typecheck --workspace apps/mobile`: passed
  - `npm run typecheck --workspace @stay-focused/ocr`: passed
  - `npm run build --workspace @stay-focused/ocr`: passed
  - `npm test --workspace @stay-focused/ocr`: 14/14
  - `npm run typecheck`: 7/7 workspaces
  - `npm run build`: 7/7 workspaces
  - `npm run test --workspaces --if-present`: passed
- Remote migration/advisor/storage verification completed through the existing
  ignored linked Supabase workflow. Migration history includes `202607060003`
  and `202607060004`. Security advisors had no unresolved new Phase 5C.1
  security finding; performance advisors' new Phase 5C.1 foreign-key warnings
  were fixed by `202607060004`.
- Protected live metadata sync ran twice through a local production build. It
  discovered 52 files, inserted 52 on the first run, classified 52 as unchanged
  on the second run, recorded 15 references, produced no duplicate identities,
  preserved failed course data, and left zero running sync rows. The route
  measured 72.294 seconds and 65.355 seconds against `maxDuration = 60`, so
  production-runtime readiness remains partial.
- Protected live ingestion requested three selected internal rows, stored two
  eligible files, recorded one metadata-only result, stored 92,950 aggregate
  bytes, verified private objects, denied public access, and invoked no
  OCR/extraction. The second ingestion returned two unchanged and one
  metadata-only result, stored 0 bytes, produced no duplicate object versions,
  and left zero running sync rows.
- No PATs, bearer tokens, Canvas URLs, Canvas IDs, file names, storage object
  keys, hashes, file bytes, or raw Canvas responses were printed or committed.

### 2026-07-06 Phase 5B.4A Canvas planner-item and announcement synchronization

- Starting baseline: `main` at `dc670a4`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added typed Canvas client methods and types for planner items and
  announcements. Planner sync uses repeated course `context_codes[]`;
  announcement sync fetches one course at a time to preserve failure isolation.
- Added a deterministic rolling window of 30 days in the past and 120 days in
  the future, captured from one run timestamp.
- Added normalized planner and announcement payloads with deterministic
  fingerprints and without unrestricted nested Canvas payload retention.
- Added migrations `202607060001_add_canvas_planner_announcements.sql` and
  `202607060002_harden_canvas_planner_announcement_triggers.sql`.
- Added `canvas_planner_items`, `canvas_announcements`, and service-role-only
  snapshot RPCs with RLS, restricted grants, ownership checks, and controlled
  search paths.
- Extended `POST /api/canvas/sync` to persist planner items and per-course
  announcements after the existing course graph work, while preserving existing
  course graph atomicity and failure behavior.
- Extended mobile Canvas sync response parsing and tests. No mobile UI was
  added.
- Remote migration history includes `202607060001` and `202607060002`; remote
  rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 35/35, DB
  typecheck, API typecheck/build/tests 183/183, mobile typecheck/tests 79/79,
  root typecheck 7/7, root build 7/7 after clearing a generated API `.next`
  artifact from the known OneDrive/Next issue, workspace tests API 183/183,
  mobile 79/79, Canvas 35/35, OCR 14/14, and `git diff --check` with CRLF
  warnings only.
- Protected live validation used the existing encrypted Canvas connection and
  aggregate-only output. No PATs, bearer tokens, Canvas URLs, Canvas IDs,
  course names, planner titles, announcement titles, announcement bodies,
  instructor names, assignment names, raw responses, internal UUIDs, or real
  fingerprint values were committed.
- First protected live run: HTTP 200 `partial`, 72.370 seconds, 17 courses
  discovered, 13 existing graph courses succeeded, 4 existing graph courses
  failed with sanitized `canvas_course_pages_failed`, 37 planner items
  discovered and inserted, 27 announcements discovered, 13 announcement courses
  succeeded, 4 announcement courses failed, 19 announcements inserted, 0 retry
  attempts, and 0 running sync rows.
- Second protected live run: HTTP 200 `partial`, 63.048 seconds, 37 planner
  items unchanged, 19 announcements unchanged, stable planner and announcement
  identities, 0 duplicate planner identities, 0 duplicate announcement
  identities, 0 unnecessary updates, 0 unexpected pruning, preserved failed
  course graphs, stable failure categories, and 0 running sync rows.
- Sanitized live failure counts remained `canvas_course_pages_failed: 4` and
  `canvas_announcement_persistence_failed: 4`.
- A final response-shape revalidation after hiding internal diagnostic fields
  repeated the protected sync twice and confirmed strict aggregate output,
  stable identities, zero duplicates, zero unnecessary updates, zero
  unexpected pruning, and zero running sync rows.
- Verdict: partial due documented permanent live Canvas limitations. The next
  roadmap task is Phase 5C file, attachment, and media ingestion.

### 2026-07-06 Phase 5B.3C1 Canvas conditional-request capability audit

- Starting baseline: `main` at `6401ee9`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Created an ignored `.local` audit harness and kept all raw live artifacts out
  of git.
- Loaded the existing stored encrypted Canvas connection through the API-side
  service-role and token-decryption boundary. Connection availability,
  decryption success, and audit-client initialization passed.
- Production Canvas synchronization behavior was not changed. No migrations,
  sync runs, graph writes, validator persistence, raw response caching, or
  secondary Canvas resources were added.
- Audited active course listing, modules, module items, Pages, Page details,
  assignment groups, and assignments with 3 local course sample labels and no
  real course identity output.
- Baseline requests: 10; primary conditional requests: 10; controlled
  conditional subtests: 20.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match requests returned HTTP 200 with full bodies for every audited
  endpoint. No 304 responses were observed.
- Baseline body bytes and conditional body bytes were both 154,503, so
  observed body-byte reduction was 0%.
- Baseline duration was 3.467 seconds; primary conditional duration was 3.993
  seconds.
- One paginated Page collection included a later page, proving future
  conditional design would require per-page validator and pagination state if
  useful 304 behavior is ever observed.
- Page-list validators cannot prove Page-detail body stability. Module-item
  lists, assignment groups, and assignments require separate state from
  neighboring collection families.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.
- Focused verification passed because production source was not changed:
  Canvas typecheck/build/tests 33/33, API typecheck/build/tests 176/176, and
  mobile typecheck/tests 79/79.
- Decision: Outcome C. Continue ordinary GET behavior for all currently
  synchronized endpoint families. Recommended next Canvas phase: Phase 5B.4
  secondary Canvas resource synchronization.

### 2026-07-06 Phase 5B.3B incremental academic graph synchronization foundation

- Starting baseline: `main` at `289f636`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added `202607050008_add_canvas_incremental_sync_state.sql` and updated
  `packages/db/src/types.ts`.
- Added `canvas_course_sync_states`, expanded sync modes to `full` and
  `incremental`, expanded course-result statuses to include `unchanged`, and
  kept the new table and RPCs behind the service-role boundary.
- Added deterministic versioned fingerprints over normalized persistence
  payloads in `apps/api/src/lib/canvas-sync-fingerprint.ts`. Fingerprints are
  private change-detection values, are not returned publicly, are not logged,
  and are not authorization controls.
- Updated `POST /api/canvas/sync` so missing bodies default to `full` and
  `{ "mode": "incremental" }` enables changed/unchanged comparison after the
  complete Canvas course snapshot has been fetched.
- Changed-course persistence uses
  `replace_canvas_course_academic_snapshot_with_sync_state` so graph
  replacement and fingerprint advancement happen atomically.
- Matching fingerprints call `record_canvas_course_snapshot_unchanged`, skip
  graph replacement, leave graph timestamps stable, and advance only safe
  sync-state metadata.
- Fetch failures call `record_canvas_course_snapshot_failed` best-effort,
  preserve previous graph rows, preserve the last successful fingerprint, and
  retain the Phase 5B.3A sanitized failure code.
- Remote migration push applied only `202607050008`; migration history includes
  `202607050008`.
- Remote rollback SQL verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- Automated verification passed: Canvas typecheck/build/tests 33/33, DB
  typecheck, API typecheck/build/tests 176/176, mobile typecheck/tests 79/79,
  root typecheck 7/7 with 4 cached and 3 fresh, root build 7/7 with 4 cached
  and 3 fresh, workspace tests API 176/176, mobile 79/79, Canvas 33/33, OCR
  14/14, and `git diff --check` with line-ending warnings only.
- Live validation used the existing encrypted Canvas connection and protected
  `POST /api/canvas/sync` flow. No PATs, bearer tokens, Canvas URLs, Canvas
  IDs, course names, Page titles/bodies, assignment names/descriptions, raw
  responses, internal UUIDs, or real fingerprint values were committed.
- Full live baseline: HTTP 200, `partial`, 50.725 seconds, 17 courses
  discovered, 13 changed/succeeded, 0 unchanged, 4 failed with sanitized
  `canvas_course_pages_failed`, 13 graph replacements, 0 running rows.
- First incremental live sync: HTTP 200, `partial`, 47.502 seconds, 17 courses
  discovered, 13 unchanged, 0 changed, 4 failed, 0 graph replacements, state
  checks advanced, failed fingerprints preserved, unchanged graph timestamps
  stable, 0 running rows.
- Second incremental live sync: HTTP 200, `partial`, 46.750 seconds, 13
  unchanged, 0 changed, 4 failed, deterministic fingerprints, duplicate
  identities 0, internal identities stable, failed graphs preserved, 0 running
  rows.
- Incremental mode reduced database replacement and pruning work for unchanged
  courses. It does not reduce Canvas request volume yet because complete
  snapshots are still fetched before comparison.
- At that time, the next recommended phase was Phase 5B.3C conditional Canvas
  fetching and network-efficiency hardening; Phase 5B.3C1 has since completed
  that audit and recommends moving to Phase 5B.4 instead.

### 2026-07-06 Phase 5B.3A Canvas course recovery hardening

- Starting baseline: `main` at `1cd23c1`, matching `origin/main` with ahead 0
  and behind 0. Known unrelated dirty files remained untouched:
  `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, and
  `apps/mobile/.gitignore`.
- Added `202607050007_add_canvas_sync_course_results.sql` and updated
  `packages/db/src/types.ts`.
- Added sanitized per-course diagnostics through
  `record_canvas_sync_course_result`, with RLS enabled, direct
  `anon`/`authenticated` grants revoked, and public RPC execution revoked.
- Extended Canvas error classification to distinguish resource-not-found and
  network failures while preserving redirect and same-origin pagination
  protections.
- Added operation-specific course sync failure codes and bounded transient
  retries: 2 retries after the initial attempt, bounded exponential backoff,
  capped `Retry-After`, finite request timeouts, and no retries for
  non-retryable 4xx, malformed responses, redirects, pagination rejection,
  ownership failures, or persistence failures.
- Remote migration push applied only `202607050007`; migration history includes
  `202607050007`. The CLI emitted the known non-fatal Docker catalog-cache
  warning after remote application.
- Remote rollback SQL verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Hardened live validation used the existing encrypted Canvas connection and
  protected `POST /api/canvas/sync` flow. No PATs, bearer tokens, Canvas URLs,
  Canvas IDs, course names, Page titles/bodies, assignment names/descriptions,
  or raw Canvas responses were printed or committed.
- First hardened live sync: HTTP 200, `partial`, 52.318 seconds, 17 courses
  discovered, 13 succeeded, 4 failed, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, 25 assignments, 0 retry attempts, 0 running rows.
- Second hardened live sync: HTTP 200, `partial`, 50.622 seconds, same
  aggregate counts, 0 retry attempts, 0 running rows.
- The four previously generic failures are now
  `canvas_course_pages_failed`, operation `pages`, category
  `resource_not_found`, HTTP class 4xx, non-retryable, retry count 0. They are
  documented as permanent Canvas/resource limitations for the required
  Page-listing operation, not implementation defects.
- Duplicate identities remained 0, internal identities remained stable on the
  second run, first-sync timestamps remained stable, and last-sync timestamps
  advanced for successful courses.
- Next recommended phase: Phase 5B.3B incremental academic graph
  synchronization foundation.

### 2026-07-05 Phase 4 live Study Library RLS validation

- Starting baseline: `main` at `2e945cf`, matching `origin/main` with ahead 0
  and behind 0.
- Preserved the existing reviewer `[id]` route typing fix and test update.
  Root cause: Next.js App Router dynamic route params are Promise-based in the
  route context. Runtime behavior did not change.
- Reloaded `.env.smoke.local`, `.env.supabase.local`, `apps/api/.env.local`,
  and `apps/mobile/.env.local` in the validation process without printing
  credential values, emails, tokens, full user IDs, connection strings, or
  reviewer payloads.
- Confirmed the two live test accounts authenticated, their normalized emails
  differed, and their Supabase user IDs differed.
- Confirmed the target Supabase project already had migration
  `202607050001_create_reviewers.sql` applied.
- Verified `public.reviewers` exists, RLS remains enabled, and the owner
  SELECT, INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Started the local API on `http://localhost:3000` because no API was already
  listening there; `GET /api/health` returned 200.
- User A generated and saved one fictional reviewer through the authenticated
  API with allowlisted metadata and no client-supplied ownership, then listed
  and opened it successfully.
- User B's list excluded User A's reviewer. User B open, rename, and delete
  attempts returned safe `404 reviewer_not_found` responses without exposing
  owner identity, title, metadata, reviewer content, ownership, or row
  existence. User A retained access after User B's delete attempt.
- Reverse isolation passed: User B generated and saved one fictional reviewer,
  User B could list it, User A could not list or open it, and User B deleted
  it.
- Cleanup passed: User A deleted User A's validation reviewer; deleted rows no
  longer appeared in owner lists; opening either deleted reviewer returned safe
  `404 reviewer_not_found`; no fictional validation rows remained.
- Service-role reviewer CRUD was not used. Service/management access was used
  only for read-only schema, policy, and migration verification.
- Regression pass:
  `npm run typecheck --workspace @stay-focused/db`;
  `npm run typecheck --workspace apps/api`;
  `npm run test --workspace apps/api` (94/94);
  `npm run typecheck --workspace apps/mobile`;
  `npm run test --workspace apps/mobile` (66/66);
  `npm run build --workspace @stay-focused/engine`;
  `npm run eval --workspace @stay-focused/engine` (266/266);
  `npm run test --workspace @stay-focused/ocr` (14/14);
  `git diff --check` passed with line-ending warnings only.
- Reviewer web smoke was not rerun because the route fix was typing-only and
  runtime behavior did not change.
- Verdict: Phase 4 Study Library and Persistence completed and live validated.
  Next product phase: Phase 5 Canvas Integration.

### 2026-07-05 Phase 3D live iPhone PDF OCR validation

- Confirmed Phase 3D live physical-device validation passed using iPhone Expo
  Go against the local Next.js API over LAN with real server-only Google Cloud
  Vision credentials.
- Confirmed a fictional, image-only, two-page scanned PDF could be selected
  from the iPhone Files picker.
- Confirmed the app displayed the PDF filename, `APPLICATION/PDF`, file size,
  and detected page count of 2.
- Confirmed the protected PDF OCR request reached the API and Google Vision
  synchronous PDF OCR succeeded.
- Confirmed both PDF pages were extracted in preserved page order.
- Confirmed extracted text appeared in the editable review field and the user
  edited that text before generation.
- Confirmed reviewer generation used the edited OCR text as its source.
- Confirmed Reviewer Ready appeared, source-faithful passed, coverage passed,
  and clean output passed.
- Confirmed multiple reviewer sections and key points were generated.
- Confirmed the five-page limit using a separate PDF with more than five pages:
  the PDF was rejected safely and the UI displayed `PDF has too many pages` and
  `PDF OCR supports up to 5 pages per request.`
- Retained logs are not available for an exact HTTP status code, so no status
  code is claimed.
- Known limitation: visible scanned-PDF footer text such as `FICTIONAL OCR TEST
  DOCUMENT - PAGE 1 OF 2` and `FICTIONAL OCR TEST DOCUMENT - PAGE 2 OF 2` was
  correctly extracted by Google Vision and may become reviewer headings or
  sections. Users can remove this text in the editable OCR text field.
  Automatic repeated header/footer detection is deferred to a later cleanup
  task and was not implemented here.
- Verdict: COMPLETE - Phase 3D live PDF OCR validation passed.

### 2026-07-04 Phase 3D scanned PDF OCR ingestion

- Implemented synchronous small-batch scanned PDF OCR ingestion.
- Added Expo Document Picker PDF selection with one-file `application/pdf`
  intake, cache-copy enabled, filename/type/size display, page-count display
  after server validation, retry, and clear-PDF handling.
- Added `POST /api/ocr/extract-pdf` with Supabase bearer authentication,
  multipart field `pdf`, 10 MiB upload cap, `%PDF-` signature validation,
  `pdf-lib` parse/page-count validation, encrypted/malformed PDF safe errors,
  and a 1-5 page limit.
- Added Google Vision PDF OCR through synchronous `batchAnnotateFiles` with
  inline PDF bytes, `DOCUMENT_TEXT_DETECTION`, and explicit pages. No Cloud
  Storage, async operation, polling, or local PDF rasterization was added.
- Extended `@stay-focused/ocr` to accept PDF inputs while preserving the
  normalized document result shape used by image OCR.
- Added PDF-specific mobile API upload, safe error mapping, source-flow state,
  and editable extracted-text review before reviewer generation.
- Added mocked PDF OCR web smoke using a fictional in-memory PDF fixture and
  real reviewer generation.
- Verification passed: OCR package typecheck/build/test 14/14; API typecheck
  and tests 72/72; mobile typecheck and tests 61/61; smoke-runner tests 51/51;
  engine build and eval 266/266; reviewer web smoke passed; image OCR web smoke
  passed; PDF OCR web smoke passed.
- Existing paste, gallery-image, camera-image, and image OCR API regression
  paths remained covered by tests and smokes.
- Google credentials remain server-only. No credential files, env files,
  private PDFs, uploaded content, screenshots, tokens, or OCR output artifacts
  were committed.
- Verdict at implementation time: implemented; live validation recorded in the
  2026-07-05 session log entry above.

### 2026-07-04 Phase 3C live iPhone OCR validation

- Confirmed Phase 3C live physical-device validation passed using iPhone Expo
  Go against the local Next.js API over LAN.
- Confirmed camera/image intake reached the server-side OCR path and Google
  Cloud Vision extracted fictional study-habits text.
- Confirmed extracted OCR text remained editable and the edited text was used
  as the reviewer source.
- Confirmed Reviewer Ready appeared after reviewer generation.
- Confirmed source-faithful, coverage, and clean-output validation passed.
- Confirmed the generated reviewer contained at least one section and key
  point.
- The earlier live OCR failure was caused by a machine-specific
  `GOOGLE_APPLICATION_CREDENTIALS` path from another computer; after local
  credential configuration was corrected and the API restarted, live OCR
  succeeded. No credential path, filename, project ID, key, token, screenshot,
  photo, environment value, or captured image is recorded here.
- Google credentials remain server-only. No captured images, screenshots, OCR
  test artifacts, credential files, or private OCR output are committed.
- Verdict: COMPLETE - Phase 3C live camera/image OCR validation passed.
- Historical follow-up: Phase 3D scanned PDF ingestion is now complete.

### 2026-07-04 Phase 3C live iPhone OCR credential audit

- Confirmed local branch `main` is at
  `57b8811 feat(ocr): add camera capture source`, and `origin/main` contains
  that commit.
- Confirmed the camera implementation is already landed; no camera UI or OCR
  client redesign was attempted.
- Inspected OCR configuration by variable name and safe readiness metadata
  only. No credential values, paths, private keys, tokens, or OCR text were
  recorded.
- Result: `apps/api/.env.local` has no usable Google OCR credential
  configuration. Root env has a Google project value and a credential path, but
  the referenced file does not exist.
- Checked standard private credential locations on this machine and found no
  valid service-account JSON and no valid authorized-user ADC JSON.
- Per the Phase 3C task stop condition, physical iPhone validation was not
  claimed and the API/Expo phone environment was not started for live OCR.
- Required next action: create or place a valid Google OCR credential outside
  the repository and tracked files, configure the API process with
  `GOOGLE_APPLICATION_CREDENTIALS` plus project id or
  `GOOGLE_CLOUD_CREDENTIALS_JSON` plus project id, then rerun the iPhone
  checklist in `docs/dev/mobile-device-runbook.md`.
- Verdict: PARTIAL - camera implementation passes but live validation remains
  blocked by server-only Google credential setup.

### 2026-07-04 Phase 3B gallery OCR intake

- Added Expo SDK-compatible `expo-image-picker` to `apps/mobile`.
- Added `apps/mobile/src/services/ocrApi.ts` for typed authenticated
  multipart uploads to `POST /api/ocr/extract`, with PNG/JPEG validation,
  native/web form-data handling, abort support, safe error mapping, and secret
  redaction.
- Added gallery image selection and source-flow state helpers for permission
  denial, cancellation, selected-image preview, OCR loading, OCR success/failure,
  retry, clearing images, preserving manual paste, and using edited OCR text for
  reviewer generation.
- Updated `ReviewerGenerateScreen` with `Paste text` and `Import image` modes,
  selected-image preview, explicit `Extract text`, editable extracted-text
  review, character count, OCR status/error states, and stable OCR test IDs.
- Added mobile Vitest coverage: OCR client, gallery image mapping, and reviewer
  source-flow tests pass 32/32.
- Added `npm run smoke:ocr:web`, which uses a non-production Expo Web fixture
  hook, mocks only `POST /api/ocr/extract` with fictional OCR text, confirms
  authenticated multipart OCR upload, edits extracted text, then generates a
  reviewer through the real reviewer route.
- Updated the smoke runner generated-output cleanup to remove only
  `apps/api/.next/server` before runner-owned API startup, avoiding stale
  OneDrive-backed Next artifacts outside `.next/server/app`.
- Manual paste remains supported. Images are previewed only from local URIs and
  are not persisted, stored, logged, committed, or sent to the reviewer engine.
- Historical follow-up: live physical-device image OCR passed in Phase 3C, and
  scanned PDF OCR is now complete in Phase 3D.

### 2026-07-04 Phase 3A OCR server boundary

- Added `packages/ocr` with provider-agnostic OCR input/result types,
  `OcrProvider`, `OcrProviderError`, and deterministic normalization.
- Added an API-only Google Cloud Vision adapter with an injected fake-client
  boundary and no Google client construction during module import.
- Added a server OCR provider factory that reads Google Cloud configuration at
  runtime, normalizes escaped private-key newlines, supports Application
  Default Credentials, and keeps credential values out of responses.
- Added protected `POST /api/ocr/extract` with bearer auth, multipart parsing,
  PNG/JPEG MIME validation, a 5 MiB image limit, empty-file rejection, typed
  success responses, and safe error codes.
- Added docs for the OCR architecture, route, env names, supported image types,
  size limit, fake-test strategy, and Phase 3B handoff.
- Verification added in this phase: OCR package tests 10/10, Google OCR
  fake-client tests 10/10, OCR API route tests 14/14, API test suite 43/43,
  root typecheck PASS, root build PASS, API typecheck PASS, mobile typecheck
  PASS, engine build PASS, engine eval 266/266, and reviewer web smoke PASS.
- Manual paste remains supported. Mobile gallery selection, editable OCR text
  review, and scanned-PDF OCR remain pending.

### 2026-07-04 Documentation status and roadmap refresh

- Refreshed `README.md`, `docs/current-state.md`, `docs/roadmap.md`,
  `docs/ai/current_sprint.md`, supporting architecture/eval docs, capstone
  overview, and this handoff so they match local HEAD at baseline `ebb79d8`.
- Canonical current state is now `docs/current-state.md`; canonical roadmap is
  `docs/roadmap.md`; canonical current sprint is `docs/ai/current_sprint.md`.
- Current product state: Supabase email/password sign-in, protected reviewer
  API, OpenAI-backed reviewer generation, source-faithful validation, Expo
  reviewer preview, and unattended Expo Web smoke are complete locally.
- Current limitations: source input is still pasted text; OCR ingestion,
  scanned PDFs, Study Library persistence, Canvas sync, tasks, schedules,
  completed mobile OAuth redirects, deployment validation, and production
  readiness remain pending.
- Verification in this documentation refresh: smoke-runner unit tests 51/51,
  reviewer API route tests 19/19, engine build PASS, engine eval PASS 266/266,
  API typecheck PASS, mobile typecheck PASS.
- Current smoke command: `npm run smoke:reviewer:web`.
- Next engineering task: Phase 3A - audit source/OCR contracts, add a
  provider-agnostic OCR boundary, add fake Google OCR client tests, and expose a
  protected server OCR API contract before building camera or gallery UI.

### 2026-06-15 - Session 14 Supabase JWT Auth on /api/review

**Files created:**
- `apps/api/src/lib/auth.ts` — `verifyBearerToken(request)` helper using
  Supabase service-role client to validate `Authorization: Bearer <token>`
  headers. Returns the `User` object on success, `null` on any failure.
  Never exposes token contents, stack traces, or Supabase internals.

**Files changed:**
- `apps/api/app/api/review/route.ts` — Auth check now runs first, before
  `RUN_OPENAI_SMOKE` and all other checks. Returns `{ error: "Unauthorized" }`
  with HTTP 401 on any auth failure.
- `apps/api/package.json` — Added `@supabase/supabase-js: ^2.49.4` to
  `dependencies` (was already hoisted to root node_modules via `packages/db`;
  now declared explicitly in the API package).

**What was implemented:**
- JWT Bearer-only authentication for `/api/review` (no cookies, mobile-safe).
- Auth call order: auth → RUN_OPENAI_SMOKE guard → input validation → provider
  → pipeline.
- Status mapping: 401 (no/bad/expired token), 501 (smoke disabled), 400 (bad
  input), 500 (provider/pipeline failure).
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are read from `process.env`
  inside the helper; both are already configured in Vercel.

**Risks / edge cases noticed:**
- `@supabase/supabase-js` was not explicitly listed in `apps/api/package.json`
  before this session. It was accessible via hoisting from `packages/db`, but
  explicit declaration was added for correctness and deploy reliability.
- The `tsconfig.providers.json` scope does not include `src/lib/`, so the new
  auth helper is only compiled by the main `tsconfig.json`. This is intentional
  and consistent with existing route files.
- `persistSession: false` is passed to `createClient` to prevent any
  cookie/storage side effects in the server environment.
- If `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing at runtime, the
  helper returns `null` (→ 401) rather than throwing, keeping error responses
  generic.

**Next recommended step:**
- Run `npm run build` in `apps/api` and verify the Next.js production build
  still passes with the new auth import.
- Test the deployed `/api/review` endpoint: confirm 401 without a token, 401
  with an invalid token, and 501 with a valid Supabase token (until
  `RUN_OPENAI_SMOKE=1` is enabled).
- Consider adding a mobile integration test that exercises the full auth +
  pipeline path once `RUN_OPENAI_SMOKE=1` is enabled in a staging environment.

### 2026-06-15 - Session 13 Server OpenAI SDK Wiring

- Diagnosed Node/npm as absent rather than only missing from PATH.
- Installed official Node.js LTS `v24.16.0` through `winget`; npm `11.13.0` is
  available.
- Added `C:\Program Files\nodejs` to the user PATH and set PowerShell
  CurrentUser execution policy to `RemoteSigned`; system PATH and machine
  policy were not changed.
- Installed `openai@6.42.0` in `apps/api` only.
- Added the server-only SDK factory while preserving the injected fake-client
  adapter and all engine contracts.
- Added an opt-in one-call smoke module; it was not run because
  `RUN_OPENAI_SMOKE=1` was not explicitly enabled.
- Provider contract checks pass 18 cases with no network access.
- Engine evals remain 176 passed, 0 failed.
- API and engine typechecks/builds pass; the API Next.js production build
  passes.
- Root workspace typecheck/build now execute but fail only in untouched mobile
  setup due duplicate React types and missing `react-native-web`.
- `npm install` passes. It reports 12 moderate dependency vulnerabilities; no
  forced audit remediation was applied.
- Committed and pushed the server SDK wiring as `d8374e9`.
- Next step: run the opt-in real OpenAI smoke test intentionally, then add a
  protected API route without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 12 OpenAI Adapter Boundary

- Safely prepared V2 env files using matching V1 local env values.
- Created the root env example and confirmed the existing API/mobile examples
  contain empty values only.
- Designed the OpenAI provider adapter boundary and added ADR-005.
- Added provider adapter implementation documentation.
- Added an API-layer `OpenAIProvider` boundary with 16 fake-client contract
  checks and no network calls.
- Current engine eval total remains 176 passed, 0 failed.
- Direct TypeScript 5.8.3 engine and provider typechecks/builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the adapter boundary as `a0233be`.
- Next step: fix Node.js/npm PATH before real SDK wiring, or add an opt-in real
  OpenAI smoke test only after npm works.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 11 Engine Contract Documentation

- Added engine contract documentation.
- Added ADR-004 for the completed Stage 0 through Stage 6 pipeline.
- Updated the repository README, capstone overview, and eval README.
- Current eval total: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed the documentation as `e2a665f`.
- Next step: design the provider adapter boundary for OpenAI integration
  without changing engine contracts.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 10 Pipeline Integration

- Wired `runPipeline` end to end with fake-provider integration fixtures.
- Added a 21-case pipeline eval suite.
- The eval runner now covers Stage 0 through Stage 6 plus pipeline integration.
- Current eval totals: 176 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed pipeline integration as `cc5dac2`.
- Next step: add engine contract documentation and an ADR for the completed
  pipeline before provider integration.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 9 Stage 6 Reviewer Assembly

- Implemented eval-first Stage 6 deterministic reviewer assembly.
- Added Stage 6 fixtures and a 30-case eval suite.
- The eval runner now covers Stage 0 through Stage 6.
- Current eval totals: 155 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 6 as `d54b4cb`.
- Next step: wire `runPipeline` end to end using fake-provider fixtures, then
  add integration evals.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Session 8 Stage 5 Bounded Retries

- Implemented eval-first Stage 5 bounded retry handling.
- Added Stage 5 fixtures and a 28-case fake-provider eval suite.
- The eval runner now covers Stage 0, Stage 1, Stage 2, Stage 3, Stage 4, and
  Stage 5.
- Current eval totals: 125 passed, 0 failed.
- Direct TypeScript 5.8.3 source/eval typechecks and builds passed.
- npm remains unavailable on `PATH`; `npm install`, `npm run typecheck`, and
  `npm run build` were blocked by the command-not-found error.
- Committed and pushed Stage 5 as `25aabc4`.
- Next step: implement Stage 6 deterministic reviewer assembly.
- `docs/ai/handoff.md` is ignored and local-only, so it was updated locally but
  not staged or committed.

### 2026-06-15 - Current Progress Refresh

- Refreshed the local-only handoff with detailed Stage 0 through Stage 3
  progress and verification results.
- Verified that the exact Stage 3 commit is `a108a26`.
- Confirmed that `origin/main` includes Stage 4 at `e0f79bf`, which is newer
  than the supplied Stage 3 project snapshot.
- Confirmed the current branch is `main` and locally ahead by the handoff
  template commit `612bfe0`.
- Attempted the engine build and aggregate eval commands; both remain blocked
  by npm being unavailable on `PATH`.
- Confirmed `git diff --check` passes in the current workspace.

### Session 7 - Stage 4 Coverage Verification

- Implemented eval-first Stage 4 deterministic coverage verification.
- Added fixtures and eval coverage for schema alignment, required content,
  source coverage, scoring, statuses, ordering, and validation.
- Updated the aggregate eval runner to include Stage 4.
- Next task recorded at the time: Stage 5 bounded retry handling with fake
  providers.

### Session 6 - Stage 3 Provider Requests

- Implemented eval-first Stage 3 schema contracts and provider-request
  construction.
- Added provider-agnostic schema descriptors for four section output kinds.
- Added fake-provider evals for requests, valid outputs, validation, source
  isolation, and contextual provider errors.
- Updated the aggregate eval runner to include Stage 3.

### Session 5 - Stage 2 Generation Planning

- Implemented eval-first deterministic generation planning.
- Added cases for schema selection, target contracts, source references,
  ordering, deterministic IDs, and validation.

### Session 4 - Stage 1 Outline Detection

- Implemented eval-first deterministic outline detection.
- Added coverage for grouping, ordering, tags, confidence scores,
  deterministic IDs, and empty-source validation.

### Session 3 - Evaluation Harness

- Built a dependency-free evaluation harness for deterministic engine stages.
- Added Stage 0 success and expected-error cases with readable JSON fixtures.

### Session 2 - Stage 0 Normalization

- Implemented normalization for extracted text and block-like input.
- Added deterministic text-to-block normalization and stable source/block IDs.
- Preserved the engine boundary from raw file, OCR, storage, LMS, UI, and
  provider dependencies.

### Session 1 - Domain Types

- Implemented stable domain types for normalized sources, outlines, generation
  plans, outputs, coverage, reviewer output, and retries.
- Defined a provider-agnostic request boundary without importing an SDK.
- Updated stage signatures to use typed argument objects.

### Session 0 - Initial Architecture

- Initialized V2 as a Turborepo monorepo with npm workspaces.
- Chose an engine-first architecture with no UI dependency.
- Chose token-based JWT authentication instead of cookies.
- Separated mobile, API, engine, database, Canvas, and shared code into
  workspaces.

Vercel project created:
- Project name: stay-focused-v2-api
- Root directory: apps/api
- Preset: Next.js
- RUN_OPENAI_SMOKE=0
- /api/health expected live
- /api/review expected 501 until real provider is enabled

Design reference:
- Local folder: C:\Users\Fely Max Dilinila\OneDrive\Documents\Projects\stay-focused-v2\design

### Session: Stage 6.1 - JWT auth on /api/review

- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`
- What was implemented: Bearer token verification via Supabase `getUser`, runs
  before all other checks, with a generic 401 response on failure.
- Next step: Apply the same auth helper to remaining generation routes.
- Risks/blockers: The app has no `@/*` TypeScript path alias, so the route uses
  the existing relative import style. Missing Supabase server environment
  variables intentionally produce the same generic 401 response.

### Stage 6.1 — Supabase JWT verification — 2026-06-15
- Files created: `apps/api/src/lib/auth.ts`
- Files changed: `apps/api/app/api/review/route.ts`, `docs/ai/handoff.md`
- What was implemented: Added a Supabase-backed Bearer token verifier and enforced authentication before all other `/api/review` checks, returning a generic 401 on failure without cookies or exposed internals.
- Verified by: API TypeScript check (`tsc --noEmit`).
- Next recommended step: Apply the same auth helper to remaining protected API routes.
- Risks/blockers: `apps/api/package.json` has a separate unstaged change adding `@supabase/supabase-js`; it is intentionally excluded from this commit.
- Commit: not committed

### Stage 6.2 — @/* path alias — 2026-06-15
- Files created: none
- Files changed: apps/api/tsconfig.json, apps/api/app/api/review/route.ts
- What was implemented: @/* → ./src/* alias; auth import switched off relative path
- Verified by: tsc --noEmit pass
- Next recommended step: roll verifyBearerToken out to remaining generation routes
- Risks/blockers: npx is unavailable on PATH in this shell; verification passed with the repository's local TypeScript compiler via the bundled Node runtime. tsconfig.providers.json remains unchanged.
- Commit: 853b1901b93773b9af088c3add7d96c82fc42f2b

---

## CONVENTION — API route auth (established Stage 6.2)

Every new `/api/*` route that touches user data or runs generation MUST:
- call `verifyBearerToken(request)` from `@/lib/auth` as the first statement in the handler
- return `{ error: "Unauthorized" }` with status 401 when it returns null
- run the auth check before input parsing and before any env/feature flag checks
- never expose token contents, stack traces, or Supabase internals in responses
- use JWT Bearer only — no cookies (mobile cannot use cookies)

Public exceptions (MUST NOT receive the Bearer guard):
- `/api/health` — health check, must return unauthenticated 200
- any future webhook or cron route — these authenticate via their own secret/signature, not Bearer

Current route status:
- `/api/review` — guarded ✅
- `/api/health` — intentionally public ✅

---

### 2026-06-19 Stage 5a grounding fix — Phase 1 (deterministic floor)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/src/types.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage6-assemble.eval.ts`, `packages/engine/scripts/live-run.ts`, `docs/ai/handoff.md`
- Root cause: token-presence fabrication check flagged glue words (false-positive storm); real omissions/drift were buried. The comparison span is clean UTF-8; corruption was limited to PowerShell live-log capture.
- Phase 1 fix: extraction-first sourceCore; stopword-aware content-token check; LIST_COVERAGE_THRESHOLD omission gate; no encoding normalization needed. NO LLM judge.
- Verification: typecheck PASS; build PASS; eval PASS (202/202); eval:stage5a PASS (12/12); phase1FabricationFails=unavailable (OPENAI_API_KEY unset)
- Next: Phase 2 — entailment judge for the N flagged claims (sized from a future live run); Phase 3 — specific-reason retry + judge cap.
- Risks: Phase 1 flags faithful synonym paraphrase as fabrication by design; mitigated by extraction-first generator until Phase 2.

### 2026-06-19 Stage 5a grounding fix — Phase 1.1 (list adherence + collect-and-continue)
- Changed: `packages/engine/src/stage3-generate.ts`, `packages/engine/src/generate.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/scripts/live-run.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage5-retry.eval.ts`, `packages/engine/evals/fixtures/pipeline-retry.json`, `packages/engine/evals/fixtures/stage5-basic.json`, `packages/engine/evals/fixtures/stage5-policy.json`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: extraction-first prompt failed on list-only sections - model elaborated instead of extracting, causing fabrication + 0/N omission, and a meta-commentary explanation tripped the instruction-leakage guard and aborted the run.
- Fix: hard list-adherence rule (keyPoints = source items verbatim; descriptions to enrichment); anti-meta explanation rule; collect-and-continue on validation failures with infra-error boundary preserved.
- Verification: typecheck PASS; build PASS; eval PASS (208/208); eval:stage5a PASS (14/14). LIVE: complete run = yes; phase1FabricationFails=45; per-section grounding = Introduction 1, What is IT Security 1, Goal of IT Security 1, Domains of IT Security 0.4, What is Cybersecurity? 1, What is Cybersecurity all about? 0.25, Importance of cybersecurity 0.88, Challenges of Cybersecurity 0.7, Impact of a Security Breach 0.4, Types of Attackers 0.79, Definition of Terms 0.25, Types of Cybersecurity Threats 0, Types of Malware 0, Symptoms of Malware 0, Methods of Infiltration 0, Methods to Deny Service 0, Blended Attacks 0, Impact Reduction 0.25.
- Next: Phase 2 (entailment judge) - NOW UNBLOCKED because N=45 is known; size judge cost against N. Re-confirm list omissions resolved before adding judge (judge can't fix non-extraction).
- Risks: PS5 stderr trap on live runs - always use `$ErrorActionPreference='Continue'`. Consider a committed run script so the working invocation isn't re-derived.

### 2026-06-19 Stage 5a grounding fix — Phase 1.2
- Changed: `packages/engine/src/source-blocks.ts`, `packages/engine/src/source-items.ts`, `packages/engine/src/index.ts`, `packages/engine/src/schemas.ts`, `packages/engine/src/stage3-generate.ts`, `packages/engine/src/stage4-verify.ts`, `packages/engine/src/stage5-retry.ts`, `packages/engine/src/stage5a-grounding.ts`, `packages/engine/evals/fixtures/stage3-request.json`, `packages/engine/evals/fixtures/stage4-status.json`, `packages/engine/evals/pipeline.eval.ts`, `packages/engine/evals/stage3-generate.eval.ts`, `packages/engine/evals/stage5a-grounding.eval.ts`, `docs/ai/live-output-it-security-after-grounding.txt`, `docs/ai/handoff.md`
- Root cause: Stage 1 preserved source items, but Stage 3 still summarized/replaced list-heavy sections. Non-empty explanation schema forced filler into grounded core. Real-topic examples and denylisted prompt vocabulary contaminated output.
- Fix: cleaned repeated-heading suffixes from detected items; allowed empty sourceCore.explanation; passed/enforced cleaned detected items in Stage 3; aligned Stage 3 span offsets with Stage 1 duplicate-block handling; replaced real-topic examples with fake-domain examples; removed prompt/denylist collisions.
- Verification: typecheck PASS; build PASS; eval PASS (213/213); eval:stage5a PASS (16/16); live OpenAI strict schema accepted the required string with empty string allowed.
- Live result: complete run=yes; phase1FabricationFails=0; formerly zero-list sections=Types of Cybersecurity Threats 7/7, Types of Malware 10/10, Symptoms of Malware 11/11, Methods of Infiltration 19/19, Methods to Deny Service 12/12, Blended Attacks 5/5, Impact Reduction 7/7; Domains of IT Security remained 11/11.
- Next: Phase 2 only after this N is known and list extraction is clean. Phase 2 should add entailment judging only for remaining lexical false positives, not for omissions or prompt contamination. This IT Security fixture now has N=0, so validate broader fixtures before adding judge cost.
- Risks: OpenAI strict schema compatibility for empty explanation is live-verified; UI/assembly has no direct explanation renderer and treats the required empty string safely while keyPoints/enrichment remain available.

### 2026-06-21 Stage 5a grounding fix — Phase 1.3
- Changed: added a shared default-visible text extractor; Stage 5 now validates title, sourceCore.explanation, and every sourceCore.keyPoint; Stage 3 normalizes title to the planned heading and enrichment to null; Stage 6 strips enrichment again during assembly.
- Policy: IT Security sourceCore grounding remains closed. Default reviewer output is source-faithful, and outside knowledge is not part of the default assembled reviewer output.
- Regression coverage: unsupported malware definitions, attack consequences, and invented example scenarios in enrichment are excluded; unsupported visible titles fail with field-specific diagnostics; existing list-adherence regressions remain passing.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219); Stage 5a PASS (16/16); student-visible faithfulness PASS (6/6).
- Live validation: not rerun in this phase; no live OpenAI calls were made.

### 2026-06-21 Phase 1.4 live visible-grounding validation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding.txt`
- Audit: `docs/ai/live-output-it-security-after-visible-grounding-audit.md`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: 17 list-heavy sections use empty explanations with complete source key points; no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-22 Phase 1.4 live visible-grounding revalidation
- Live output: `docs/ai/live-output-it-security-after-visible-grounding-20260622-053615.txt`
- Result: coverage 18/18; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Default-visible verdict: all 18 assembled cards have `enrichment: null`; no unsupported visible outside knowledge was found.
- Readability: the source-backed `Blended Attacks` title remains restored; 17 list-heavy sections use empty explanations with 3-19 source key points, and no section is empty.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).

### 2026-06-23 05:25 +08:00 Phase 1.5 cross-fixture live visible-grounding validation
- Fixtures: Digital Components (`live-digital-components`) and Arnis M1 (`live-arnis-m1`).
- Live outputs: `docs/ai/live-output-digital-components-after-visible-grounding-20260623-052054.txt` and `docs/ai/live-output-arnis-after-visible-grounding-20260623-052149.txt`.
- Digital Components automated result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 18 enrichment values null.
- Digital Components manual verdict: FAIL. The source phrase `3.3V on 3.3 board` became separate default-visible key points `3V on` and `3 board)`, changing the technical meaning despite the passing grounding report. Repeated duplicate-heading sections are also weak as a study outline.
- Arnis M1 result: coverage 8/8, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0; all 8 enrichment values null; no unsupported default-visible outside knowledge found.
- Arnis M1 readability: no section is empty; seven explanations are empty and the heading card is title-only, while source key points preserve the history, techniques, equipment, rules, and Filipino martial-arts context. The evolvement section is dense but source-faithful.
- Verification: engine typecheck PASS; build PASS; eval PASS (219/219).
- Remaining issue: add a regression for decimal-bearing source text so sentence/item extraction does not split `3.3V` into misleading standalone visible fragments. No engine, prompt, schema, mobile, auth, or provider changes were made in this validation task.

### 2026-06-23 Phase 1.6 generalized source-token fidelity
- Digital Components live validation exposed a deterministic list-marker bug: decimal fragments inside `3.3V on 3.3 board` were interpreted as numbered-item boundaries and then copied into visible key points by the Stage 3 source-item guard.
- Fixed source-item extraction so explicit bullet lists do not reinterpret numeric punctuation inside their items, ordered markers require following whitespace, and leading token punctuation such as `.env.local` is preserved.
- Added shared source-token fidelity validation for numeric identity, measurements, math, chemistry, laws/dates, networking/software tokens, code, ranges/ratios/dimensions, abbreviations, table rows, numbered headings, and OCR-looking source text.
- Stage 5 now rejects punctuation-stripped, symbol-stripped, or number-mutated visible variants with field-specific grounding failures instead of accepting content-word substring matches.
- The fix is deterministic extraction and grounding logic across subject domains. Stage 3 prompts, OpenAI schemas, provider behavior, mobile, auth, API, database, and shared packages were unchanged.
- Added 23 cross-domain fidelity evals, including the Digital Components live fixture regression.
- Verification: engine typecheck PASS; build PASS; targeted Stage 0/1/3/5a/pipeline/fidelity suites PASS; aggregate eval PASS (242/242). No live OpenAI calls were made.

### 2026-06-23 06:55 +08:00 Phase 1.7 Digital Components live token-fidelity validation
- Fixture: Digital Components (`digital-components`; source ID `live-digital-components`).
- Live output: `docs/ai/live-output-digital-components-after-token-fidelity-20260623-065246.txt`.
- Result: coverage 18/18, score 1.00; grounding 1.00; grounding issues 0; phase-1 fabrication failures 0; leakage issues 0.
- Token-fidelity verdict: PASS. The default-visible key point preserves `3.3V on 3.3 board` intact; no standalone `3V on`, `3 board`, or `3 board)` key point is present.
- Default-visible verdict: all 18 enrichment values are null; no unsupported visible text was found.
- Readability: all 18 sections are non-empty and the 76 source-backed key points remain useful as a compact outline. Explanations remain limited: 9 are empty and 9 are heading-like placeholders.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issue: explanation quality and repeated generic `Digital Software Coding` sections remain weak, but no Phase 1.7 coverage, grounding, leakage, enrichment, or token-fidelity failure remains.

### 2026-06-23 08:18 +08:00 Phase 1.8 final three-fixture live validation sweep
- Fixtures: IT Security (`it-security`; source ID `live-it-security`), Digital Components (`digital-components`; source ID `live-digital-components`), and Arnis M1 (`arnis-m1`; source ID `live-arnis-m1`).
- Live outputs: `docs/ai/live-output-it-security-final-sweep-20260623-081451.txt`, `docs/ai/live-output-digital-components-final-sweep-20260623-081534.txt`, and `docs/ai/live-output-arnis-final-sweep-20260623-081615.txt`.
- IT Security: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. Risky list sections remain source-faithful, the title is `Blended Attacks`, and no unsupported malware definitions, attack consequences, DoS flood examples, or fabricated blended-attack scenario appeared.
- Digital Components: coverage 18/18, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 18 enrichment values null. `3.3V on 3.3 board`, `pinMode`, `digitalWrite`, `digitalRead`, HIGH/LOW, INPUT/OUTPUT, ADC/PWM, hardware component names, and the reference URL remain intact; no standalone corrupted decimal fragments or electronics explanation creep appeared.
- Arnis M1: coverage 8/8, score 1.00; grounding 1.00 with 0 issues and 0 phase-1 fabrication failures; leakage issues 0; all 8 enrichment values null. `R.A. 9850`, `December 11, 2009`, historical/evolvement content, `3 MAIN GROUPS`, courtesy/salutation, strike names, and padded-stick sport content remain intact; no unsupported origin, safety, or martial-arts additions appeared.
- Default-visible/token-fidelity verdict: PASS for all three fixtures. Every visible sourceCore string was found in its fixture source, no section was empty, and no unsupported outside knowledge was found.
- Readability: the reviewers remain usable as compact source-faithful outlines. IT Security has 17 empty explanations; Digital Components has 9 empty and 9 heading-like explanations; Arnis has 7 empty explanations and one heading-like explanation. Digital Components retains generic repeated coding sections, and the source-derived Arnis evolvement item remains dense.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242); source-token fidelity eval PASS (23/23).
- Remaining issues: presentation quality only; no Phase 1.8 coverage, grounding, leakage, enrichment, unsupported-text, or token-fidelity failure remains.

### 2026-06-24 01:57 +08:00 Phase 1.4 live OpenAI validation
- Fixture: IT Security (`it-security`; source ID `live-it-security`).
- Live output: `docs/ai/live-output-phase14.txt`; JSON artifact: `docs/ai/live-output-phase14.json`.
- Coverage result: PASS, 18/18 sections covered, score 1.00, 0 weak sections, 0 failed sections.
- Grounding result: PASS, score 1.00, grounding issues 0, phase-1 fabrication failures 0.
- Leakage result: PASS, leakage issues 0, failed leakage sections 0.
- Enrichment verdict: PASS. All 18 assembled section items have `enrichment: null`; `enrichment` appears only as an internal JSON field key, not as visible content.
- Visible-content verdict: PASS. No unsupported visible outside knowledge found; `Blended Attacks` is unchanged from the previous IT Security final sweep and remains source-faithful. Explanations remain presentation-weak after enrichment removal: 17 of 18 are empty, but source-backed key points are present.
- Verification: engine typecheck PASS; build PASS; aggregate eval PASS (242/242). Mobile typecheck was intentionally not run.

### 2026-06-25 Expo Go reviewer generation stabilization
- Expo Go end-to-end reviewer generation passed against API URL `http://192.168.68.102:3000`.
- Organized reviewer fixture returned HTTP 200 through the Expo/API manual flow.
- Flattened Arduino OCR-style fixture returned HTTP 200 after around 32 seconds (`POST /api/reviewer/generate 200 in 32255ms`).
- Coverage, grounding, and leakage checks passed; assembled reviewer output kept `enrichment: null`.
- Remaining issue: OCR-style input quality and layout reconstruction are still rough and deferred to the OCR layout phase.
- Next recommended task: add OCR layout reconstruction before Stage 1 outline detection so flattened slide streams recover headings, bullets, and section boundaries before generation.

### 2026-07-01 Expo Web fast-testing workflow
- Added Expo Web as the fast laptop-browser testing surface for the existing mobile reviewer UI.
- Keep the testing surfaces ordered this way:
  1. Engine/API testing: use engine evals, live scripts, and API route checks.
  2. Fast UI testing: use Expo Web in the laptop browser.
  3. Final mobile validation: use Expo Go on iPhone only for smoke testing.
  4. Future V1 replacement: build a real browser app later using Next.js, after mobile/reviewer flow is stable.
- Local commands: `npm run dev --workspace apps/api` and `npm run web --workspace apps/mobile`.
- Use `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` for Expo Web and `EXPO_PUBLIC_API_BASE_URL=http://<LAN_IP>:3000` for iPhone Expo Go.

### 2026-07-01 Expo Web reviewer network_error troubleshooting
- Root cause found: Expo Web sends a browser preflight for `POST /api/reviewer/generate` because the request includes `Authorization` and JSON. The API route previously returned `204` for OPTIONS without local-web CORS headers, so browser fetch could fail before the request reached the POST handler and surface as `network_error`.
- Fix: `apps/api/app/api/reviewer/generate/route.ts` now exports an explicit OPTIONS handler and adds CORS headers to reviewer POST JSON responses for local browser origins (`localhost`, `127.0.0.1`, and `::1`). Non-local origins do not receive `Access-Control-Allow-Origin`.
- API port used: `http://localhost:3000`.
- Expo Web URL used: `http://localhost:8081`.
- CLI `/api/health` result: PASS, returned `{ "status": "ok", "version": "2.0.0" }`.
- Browser-shaped OPTIONS preflight result: PASS, returned `204` with `Access-Control-Allow-Origin: http://localhost:8081`, `Access-Control-Allow-Methods: POST, OPTIONS`, and `Access-Control-Allow-Headers: authorization, content-type`.
- Same-browser `/api/health`: opened in the user's normal browser for manual confirmation; Codex Chrome control was unavailable and only the in-app browser backend was exposed, so this was not observed by the agent.
- Signed-in reviewer generation: pending manual confirmation because credentials must be entered by the human and were not requested, logged, stored, or hardcoded.
- Reviewer preview/logout: pending manual confirmation with the same constraint.
- Verification: reviewer route test PASS (17/17); mobile typecheck PASS; API typecheck PASS; engine build PASS; engine eval PASS (264/264); `git diff --check` PASS with line-ending warnings only.

### 2026-07-23 generalized multi-page PDF extraction
- Split the Google synchronous provider boundary (5 pages per request) from the user-document boundary (40 pages, configurable downward), while retaining the 10 MiB upload limit.
- Added subject-neutral per-page inspection: usable embedded text stays local through PDF.js, confirmed blank pages remain explicit, and only scanned/unreadable pages are copied with `pdf-lib` into five-page OCR chunks.
- Added concurrency 2, local-to-original page remapping, deterministic merge order, chunk/page diagnostics, a 50-second document deadline, and a retryable timeout response. Missing, duplicate, failed, or malformed pages remain ineligible for reviewer generation.
- Mobile now reports the actual configured document limit, retains affected-page details for incomplete extraction, and no longer describes five pages as the product limit.
- Synthetic coverage includes 1/5/6/12-page scans, native, mixed, blank, failed/incomplete chunks, limit validation, provider-boundary enforcement, concurrency, and cross-domain reviewer checks for biology, history, and mathematics.
- Black-box fixture result: the 32-page example extracted completely in mixed mode (31 native pages, 1 OCR page, 1 OCR chunk, 6,622 characters); live reviewer generation produced 13 sections with coverage, grounding, and leakage all passing at 1.00/zero issues. Physical iPhone interaction was not performed in this run.

### 2026-07-23 durable processing-job foundation
- Added Supabase-backed extraction and reviewer jobs with strict states/stages, ownership RLS, private source snapshots, transactional result publication, idempotency fingerprints, cancellation, terminal events, leases, heartbeat, bounded retry/backoff, and stale-worker recovery.
- Added authenticated `/api/jobs` creation/status/result/cancel/retry routes. HTTP 202 is returned only after durable staging and persistence; no route launches an unawaited background promise.
- Added `npm run worker --workspace @stay-focused/api` plus bounded claim/heartbeat/recovery processing through the existing generalized OCR and Stage 0-6 reviewer engines.
- Mobile now persists safe active-job references, stops polling while backgrounded, reconciles on foreground/restart/sign-in, and treats handled timeout/network events without `console.error`. Both normal and Canvas reviewer flows use job creation rather than the 120-second request.
- Production logic remains subject-neutral; normalization removes only strongly evidenced repeated page-edge templates and retains audit metrics. No fixture-specific vocabulary or headings were added.
- Production status is PARTIAL until a continuously available worker is deployed. Expo Go can test switch-away/reconnect, but native background upload, push delivery, and terminated-app integration require an Expo/EAS development build.
- Architecture and limitations: `docs/architecture/ADR-018-durable-processing-jobs.md`.

### 2026-07-23 durable processing R2 reusable assets and multi-job operation
- Added owner-scoped `document_assets`, `extraction_results`, immutable `source_versions`, generic `generated_artifacts`, immutable `generated_artifact_versions`, cleanup queue/policy, exact reuse fingerprints, source-edit conflict detection, fair claims, quotas, rate-limit backoff, and transactional artifact publication.
- Applied eight additive development Supabase migrations from `20260723084329_reusable_processing_assets` through `20260723091627_processing_lifecycle_batching`; existing durable rows were backfilled, quota admission is serialized, cleanup is batch-bounded, and rolled-back fixtures verified account deletion/Storage queueing plus artifact soft-delete without source deletion.
- Added bounded all-job cursor retrieval, canonical source/result provenance routes, idle worker heartbeats, dry-run-first lifecycle/Storage cleanup tooling, and a privacy-safe aggregate operations report.
- Mobile now has a central multi-job Processing screen, independent actions, bounded account-scoped job history, idempotent offline reviewer outbox/drafts with sign-in/foreground/interval reconciliation, and a bounded native SecureStore artifact cache with stale/unsynced protection. Offline document-upload staging, immediate OS reachability callbacks, push delivery, and real two-device edit resolution remain pending.
- Production remains PARTIAL until the separate worker is deployed. Railway is the recommended initial target; configuration and rollout/rollback guidance are in `docs/architecture/ADR-013-processing-worker-deployment.md`.
- Full architecture, reuse/privacy boundaries, fairness, retention/deletion, offline/cache behavior, and known limitations: `docs/architecture/ADR-012-reusable-processing-assets.md`.

### 2026-07-23 R3 worker deployment acceptance audit
- Starting state: `main` at `fe8b61a`, 7 commits ahead of `origin/main`, with only the known unrelated dirty files (`apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `.vscode/`, `apps/mobile/.gitignore`).
- Migration consistency: linked Supabase project `stay-focused-v2` has all processing migrations through `20260723091627_processing_lifecycle_batching`; the matching migration files are tracked in local `HEAD`, and `origin/main` still lacks them.
- Baseline verification: shared/db/ocr/api/mobile/engine typechecks and tests passed; API and engine builds passed; engine eval passed (290/290); `worker:once`, dry-run cleanup, ops report, `git diff --check`, `git diff --stat`, and `git status --short` completed without functional regressions.
- Worker deployment status: Railway remains the recommended target and `railway.worker.json` is suitable for one continuous worker with `npm run worker --workspace @stay-focused/api` and `ALWAYS` restart, but Railway CLI/project credentials were unavailable, so no hosted worker was deployed.
- Worker heartbeat result: local `worker:once` started and stopped, and the ops report saw stopped heartbeat rows only; no hosted running heartbeat was observed.
- Cleanup deployment status: local dry-run reported zero due storage objects and zero eligible cleanup rows. Hosted dry-run and scheduled cleanup were not configured because hosting access was unavailable.
- Physical iPhone results: NOT RUN. No deployed or continuously reachable hosted worker was available, so background-switch, reload, temporary network loss, cancellation, multiple-job, offline-cache, and account-switch acceptance remain unproven on device.
- Security audit result: linked database RLS is enabled on processing/asset tables; owner-select policies use `auth.uid()` where exposed; worker claim/progress/finalization/recovery/cleanup RPCs are service-role only; source/artifact versions are immutable by trigger; idempotency and reuse are owner-scoped; safe logging emits job IDs, statuses, counts, and metrics rather than source text, reviewer text, prompts, tokens, local paths, or credentials.
- npm audit triage: `npm audit` still reports 21 findings (14 moderate, 6 high, 1 critical). The critical `tar` issue is transitive through Expo CLI tooling, not the API worker runtime. Production runtime follow-up is still recommended for `next` and `@google-cloud/vision` transitive packages (`protobufjs`, `brace-expansion`, `sharp`) before production traffic.
- Remaining blockers: hosted worker deployment credentials, hosted queue-processing acceptance, physical iPhone acceptance, cleanup scheduling, and explicit approval to push the branch with migrations to GitHub.
- Next task: deploy exactly one Railway worker from the current branch, configure server-only secrets, verify hosted heartbeat/queue/restart behavior with synthetic jobs, then run the physical iPhone background-switch suite before pushing `main`.

### 2026-07-23 R3A push-safety and dependency audit remediation
- Starting state: `main` at `89655dc`, 8 commits ahead of `origin/main`, with the same unrelated dirty files preserved (`apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `.vscode/`, `apps/mobile/.gitignore`).
- Push readiness: READY_TO_PUSH. The linked Supabase development project has migrations through `20260723091627_processing_lifecycle_batching`; every applied processing migration exists locally and is committed in `HEAD`, while `origin/main` still lacks the processing migration commits until push.
- Dependency audit before remediation: 21 findings (14 moderate, 6 high, 1 critical).
- Safe remediation applied: `next` moved within the current major to `15.5.21`; lockfile patched `protobufjs` to `7.6.5`, `brace-expansion` to fixed 1.x/2.x/5.x releases, `tar` to `7.5.21`, `undici` to `6.27.0`, `shell-quote` to `1.10.0`, and `js-yaml` to fixed 3.x/4.x releases where npm could resolve safely.
- Dependency audit after remediation: 15 findings (13 moderate, 2 high, 0 critical). The critical `tar` finding and OCR/provider `protobufjs` finding are resolved.
- Deferred findings: `next` still reports high through bundled `postcss@8.4.31` and optional `sharp@0.34.5`; npm's listed fix path is a breaking downgrade to `next@9.3.3`, and the latest current Next major still carries the flagged transitive dependency shape. Expo, `expo-constants`, `expo-linking`, `expo-router`, `@expo/*`, `xcode`, and `uuid` remain in the Expo 57 major-upgrade chain and were intentionally not forced.
- Expo major upgrade was avoided as requested.
- Verification result: shared/db/ocr/api/mobile/engine typechecks and tests passed; API and engine builds passed; engine eval passed (290/290); `worker:once`, cleanup dry-run, ops report, and `git diff --check` passed after dependency changes. `npm audit` remains nonzero only for the deferred findings above.
- Next task: evaluate a safe Next remediation path for the `postcss`/`sharp` advisories and plan the Expo 57 upgrade separately, then push `main` after explicit approval.

### 2026-07-27 durable processing completion repair and LAN portability
- Root cause of the pictured 32-page failures was the result-publication transaction, not OCR or the changed Wi-Fi: hardened database functions called `digest(...)` without the Supabase `extensions` schema and failed with SQLSTATE `42883` after all pages were processed.
- Applied migration `20260726214339_harden_processing_digest_and_retry_policy`, qualified the three affected digest calls, preserved service-only execution, and separated manual retry eligibility from same-job automatic retry. Deterministic database contract failures now stop without repeating costly OCR.
- Multipart jobs now send a validated display name separately, preserving filenames such as `Notes + Appendix.pdf` without transport encoding artifacts.
- Mobile local API resolution now supports `EXPO_PUBLIC_API_BASE_URL=auto`, derives the current Expo LAN host, keeps the API port configurable, and rejects the incorrect assumption that an Expo tunnel also exposes the API.
- Linked development Supabase validation passed: neutral 3-page extraction, idempotent duplicate creation, disconnect/reconciliation, source revision, reviewer generation, retry of the prior 32-page job (32/32, zero failed/blank pages), and explicit cancellation with no published result.
- Full OCR/API/mobile/engine checks passed; API, worker, and Expo were left running locally. Production remains PARTIAL because neither Vercel nor Railway was authenticated, so no hosted continuous worker or physical-iPhone acceptance run was completed.

### 2026-07-27 hosted uploads and completion-notification foundation
- Added private intent-authorized TUS uploads and a separate HTTP 202 acceptance boundary, so supported 10 MiB sources no longer pass through Vercel's smaller function request-body limit. Storage accepts only the signed-in user's unexpired intent path.
- Added service-controlled device registrations and a leased per-device notification outbox sourced from processing terminal events. The worker sends generic Expo messages, checks receipts, retries transport failures, and invalidates unregistered devices without logging private source content.
- Mobile now supports explicit notification permission, device registration, a server-verified test notification, notification-tap navigation, and an EAS iOS development-build configuration. Local `EXPO_PUBLIC_API_BASE_URL=auto` remains the Wi-Fi-portable development default; hosted builds require an HTTPS API origin.
- Applied linked development migration `20260726230833_hosted_processing_uploads_and_notifications`; service access, private bucket availability, claim RPC access, and anonymous denial passed. Existing database-advisor warnings are unrelated legacy functions/policies; no new-table warning was reported.
- Real push receipt and app-switch acceptance still require an EAS project/Apple credentials and a continuously deployed Railway worker. Architecture and limitations: `docs/architecture/ADR-014-hosted-processing-and-completion-notifications.md`.

## 2026-07-27 — Expo Go hosted stability prototype preparation

- Added a Railway production API service boundary alongside the existing
  durable worker, SDK-matched Expo Updates support, explicit EAS environments,
  and an Expo Go capability gate that hides unsupported push controls.
- Local `EXPO_PUBLIC_API_BASE_URL=auto` remains unchanged. Hosted Expo Go
  publication still requires Railway and Expo account authentication, a stable
  Railway HTTPS domain, EAS preview public variables, and a 24-hour soak before
  device acceptance.

## 2026-07-27 — Vercel Workflow no-spend prototype

- Replaced the prototype's continuously hosted Railway requirement with
  Vercel Workflow 4.3.1 while preserving Supabase as the job/source/result
  authority and retaining Railway/local polling-worker support.
- Added workflow run metadata, service-only durable checkpoints, atomic
  workflow-by-ID claims, backend-separated polling claims/recovery, replay-safe
  OCR chunks and reviewer sections, cancellation checks, and transactional
  result finalization.
- Added a truthful Expo Go foreground completion notice after a persisted
  extraction/reviewer result is reconciled. Local API resolution remains
  `auto`; hosted testing uses the new Vercel HTTPS origin.
- Applied and verified `vercel_workflow_processing` and
  `vercel_workflow_dispatch_recovery` on the linked `stay-focused-v2`
  Supabase project. Workflow RPCs are service-only and checkpoints deny direct
  anonymous/authenticated reads.
- The existing Vercel project `stay-focused` is V1 and was not changed. V2 must
  use a separate `stay-focused-v2-prototype` project.
- Local API/mobile/OCR/engine suites pass. Hosted Workflow replay, private live
  fixture, and physical iPhone switch-away validation remain pending until the
  new Vercel project is deployed.

## 2026-07-28 — resilience closeout and durable Canvas synchronization

- Physical iPhone Expo Go switch-away passed for PDF extraction and reviewer
  generation. Agent-led hosted V2 validation passed runtime recreation,
  disconnect-after-acceptance with later reconciliation, and explicit
  cancellation with no result publication. Keep a physical reload,
  network-loss, and cancellation spot-check on the next mobile release list.
- Added owner-scoped `course_content` and `course_grades` jobs with strict
  state/stage constraints, 30-day idempotency scope, workflow run metadata,
  bounded attempts, service-only mutation RPCs, explicit cancellation, and
  five-minute stale underlying-sync recovery.
- Canvas content and grade POST routes now return HTTP 202 only after job
  persistence and Vercel Workflow acceptance. Status, cancel, and retry routes
  enforce the authenticated owner and never return raw Canvas or grade content.
- Expo Go stores the intent before submission, reuses the same idempotency key
  after a lost response or runtime restart, reconciles accepted jobs on launch
  and foreground return, and exposes truthful in-app completion, Cancel, and
  Retry states. Background timers are not required.
- Applied `add_durable_canvas_sync_jobs` to the `stay-focused-v2` Supabase
  project only. Authenticated users can select through RLS but cannot update
  worker state; no new `canvas_sync_jobs` security advisory was reported.
- The existing V1 Vercel project remains untouched. Remaining acceptance is one
  hosted content job and one hosted grade job using a connected, non-sensitive
  Canvas test course.
- V2 production deployment and `/api/health` passed. The first hosted Canvas
  smoke found and fixed a missing Production `CANVAS_TOKEN_ENCRYPTION_KEY`
  without exposing or committing it. The rerun reached Canvas and then stopped
  safely because both the stored and local validation personal-access tokens
  are expired/revoked (`invalid_canvas_token`). A fresh Canvas test token is
  required for the remaining live content/grade smoke.

## 2026-07-28 — hosted Canvas durable-job acceptance passed

- The user refreshed the per-user Canvas personal access token through the
  mobile connection screen. No token, Canvas source content, grade content, or
  user identity was printed or committed.
- Hosted content job `24c20f16-2ad1-4fa2-8a14-a90eb226bd47` succeeded on its
  first attempt in 46.6 seconds. Replaying the same idempotency key returned
  that same job.
- Hosted grade job `55c36bf3-a892-4bf3-a8fb-182f81297beb` succeeded on its
  first attempt in 20.3 seconds.
- Cancellation job `00ec52c5-1df7-4e5a-86ff-39ded9a69984` reached `cancelled`
  with `cancellation_requested` recorded and no result published.
- Validation temporarily selected one likely-current course because the
  original selection was empty, then restored the original empty selection.
- Supabase confirms both successful result summaries were persisted before
  terminal completion and all three jobs have Workflow run references. Vercel
  runtime logs contained no error/fatal entries during the validation window.
- Phase 5F.1 is complete and hosted validated. Keep the physical Expo Go
  reload/network-loss/cancellation spot-check as a next-release reminder; plan
  Phase 5F.2 next around incremental checkpoints and user-visible sync health.

## 2026-07-28 — Phase 5F.2 incremental, resumable Canvas synchronization

- Added service-owned Canvas page/item units, private staging, scope health,
  item evidence, recoverable 90-second leases, atomic connection-level
  concurrency limits, same-job retry, and bounded stale-checkpoint cleanup.
- Refactored Vercel Workflow to one Canvas provider request per durable step.
  Rate-limit waits use Workflow scheduling, not function sleep; content jobs
  allow three active connection units and grade jobs allow two.
- Preserved last-known-good scope data. Core content is atomic; announcements,
  files, and grades advance independently. Incomplete traversals never infer
  deletion.
- Added owner-checked aggregate sync health APIs and Expo overall/scope health,
  nullable expanding totals, truthful partial outcomes, Sync again, and Cancel.
  Units, cursors, source bodies, provider messages, and private identifiers are
  never returned to mobile.
- Applied `canvas_incremental_resumable_sync` only to the V2 Supabase project.
  Schema/grant verification passed. Canvas/API/mobile/OCR tests, Workflow
  runtime tests, root typecheck/build, and reviewer eval 290/290 pass locally.
- The existing V1 Vercel project remains untouched. Deployment is restricted
  to `stay-focused-v2-prototype`.
- Keep the later physical Expo Go reload, temporary-network-loss, and explicit
  cancellation spot-check on the next mobile release checklist.
- Hosted V2 validation found and fixed a job-creation authorization regression:
  server routes use a service-role Supabase client after bearer verification,
  while the first guard read a legacy per-claim GUC. The forward repair now
  uses `auth.role()` for create, cancel, and retry and is applied only to V2.
- Post-repair content job `18d55d36-0026-4c90-89dc-52e9287abfe5` succeeded
  with outcome `partial`; one non-retryable page-list endpoint was unavailable,
  announcements remained healthy, last-known-good content/files were retained,
  and zero deletions were inferred. Grade job
  `eb6d966c-6d92-4d9a-a4b6-b48f8ab9d7f5` succeeded `unchanged`.
- Idempotent replay returned the same content job. Cancellation job
  `79ce6ab7-6346-4bf4-bc8e-de9c28cd191e` ended `cancelled`, recorded explicit
  cancellation, and published no result. All three terminal jobs had zero
  staging rows, zero running units, and zero private checkpoints retained.

## 2026-08-27 — R2 recovered baseline and live reviewer validation

- Active recovered repository: `C:\Projects\stay-focused-v2`, branch
  `recovery/r1-onedrive`, starting from R1 recovery commit `16a4742` outside
  OneDrive with a clean worktree and passing `git fsck --full`.
- The separately recovered environment was restored to the ignored repo-root
  `.env.local`. The direct live harness required only `OPENAI_API_KEY`; no
  environment values were printed, written to evidence, staged, or committed.
- Existing command: `npm run live-run --workspace @stay-focused/engine -- it-security`.
  It used the existing IT Security fixture and OpenAI `gpt-4o`; no new harness
  or generation behavior was added.
- Live artifacts:
  `docs/ai/live-output-it-security-r2-recovered-baseline.txt` and
  `docs/ai/live-output-it-security-r2-recovered-baseline.json`.
- Live result: PASS. Structured output parsed; coverage passed 18/18 at 1.00;
  grounding passed at 1.00 with 0 issues and 0 phase-1 fabrication failures;
  leakage passed with 0 issues; all 18 sections assembled; unsupported visible
  content was 0; all enrichment values were null and enrichment was not visible.
- Student-visible quality remained source-faithful and materially useful as an
  organized key-point reviewer. Seventeen list-oriented cards intentionally
  have empty explanations under the current anti-fabrication/list-only policy.
  `Domains of IT Security`, `Definition of Terms`, and the infiltration
  procedure remain structurally thin because the flattened source groups some
  adjacent list text, but no source topic text was lost and no outside facts
  were added.
- Verification before and after the provider run: engine typecheck PASS, build
  PASS, aggregate eval PASS (290/290). Relevant mobile verification: typecheck
  PASS and tests PASS (204/204). Public Supabase client construction passed
  without a network request or data mutation.
- Known API issue remains unchanged and non-blocking: one Canvas sync database
  contract assertion requires an LF substring while the clean Windows checkout
  supplies the equivalent CRLF SQL. The targeted file passed 11/12 assertions;
  runtime SQL content is intact.

## 2026-08-27 — R3 reconciled capstone development baseline

- Started from clean recovery branch `recovery/r1-onedrive` at validated R2
  commit `e5f3255`. `git fsck --full` passed, and local `main` matched
  `origin/main` at `bad5b55` before reconciliation.
- Preserved the validated recovery commit before moving `main`: backup branch
  `recovery/r2-validated-baseline`, annotated tag
  `recovery-r2-validated-baseline`, and the original
  `recovery/r1-onedrive` branch all retain `e5f3255`.
- History was unambiguous Case A: `bad5b55` was the merge base and an ancestor
  of the recovery branch. Recovery was 34 commits ahead and 0 behind both local
  and origin `main`; local `main` and `origin/main` had no unique commits.
- Reconciled with `git merge --ff-only recovery/r1-onedrive` while on `main`.
  The operation fast-forwarded `main` from `bad5b55` to `e5f3255` without a
  merge commit, conflict, rebase, reset, or other destructive rewrite.
- Post-reconciliation verification passed: engine typecheck/build and eval
  290/290; mobile typecheck and tests 204/204; OCR typecheck and tests 27/27;
  Canvas typecheck and tests 72/72; reviewer web smoke 51/51; DB
  typecheck/build; API typecheck/build; and API health HTTP 200 with
  `{"status":"ok","version":"2.0.0"}`.
- The full API suite remains 547/548 only because the pre-existing Windows CRLF
  checkout does not match one LF-only SQL substring assertion. Runtime SQL is
  unchanged, and this non-blocking line-ending test issue was not modified.
- The ignored repo-root `.env.local` remains present, untracked, and
  uncommitted. No secret values were printed or written. The R2 live OpenAI
  validation was not rerun; its committed passing artifacts remain the trusted
  provider evidence.
- `main` is now the trusted capstone development baseline. Next recommended
  task: audit the remaining capstone scope and define the final development
  sequence from this reconciled baseline.

## 2026-08-27 — R4 capstone scope audit and final development sequence

- Audited trusted `main` baseline `cd070eb` without changing application code,
  prompts, schemas, migrations, dependencies, or the known CRLF-sensitive
  assertion. Full report: `docs/ai/capstone-scope-audit-r4.md`.
- Remote preservation is `SAFE_TO_PUSH`: after a fresh fetch, `origin/main`
  remained `bad5b55`; local `main` was 35 commits ahead and 0 behind before
  this R4 documentation commit. No push was performed.
- The existing product core is capstone-credible and should be protected:
  email auth/session restore, Stage 0-6 reviewer validation, R2 live OpenAI
  evidence, image/PDF OCR, Study Library persistence, durable Vercel Workflow
  processing, encrypted owner-scoped Canvas access, hosted incremental content
  and grade sync, and the EAS Android preview path.
- Readiness gaps: P0 = 1, P1 = 7, P2 = 4. The sole P0 is the absent task and
  study-schedule vertical slice: no task/session schema, API, planning contract,
  or mobile agenda exists despite the schedule-first product promise.
- P1 work covers remote preservation, safe reconciliation of four linked
  migration version aliases before new schema, coherent cached-reviewer
  offline access, final physical-device acceptance, deployment-to-commit
  provenance, canonical/capstone reconciliation, and live-artifact privacy review.
- Final sequence: R5 task/study-plan domain foundation; R6 mobile task/schedule
  experience; R7 limited offline study access; R8 navigation/accessibility
  hardening; R9 final hosted/device acceptance; R10 capstone/privacy/demo
  hardening; R11 final release baseline.
- R4 fresh verification: clean starting Git state, preservation refs retained,
  `git fetch --prune`, `git diff --check`, and `git fsck --full` passed; hosted
  V2 `/api/health` returned HTTP 200 with version `2.0.0`. Expensive R3 suites
  and paid OpenAI generation were intentionally not rerun.
- Next recommended phase: R5 task and study-plan domain foundation, gated first
  by an approved normal push of `main` and deliberate linked-migration alias
  reconciliation without editing or replaying applied migrations.

## 2026-08-28 - R5 task and deterministic study-plan foundation

- R5 resumed from the interrupted working tree on `main`; original starting
  commit `31522d840fd415267b048408ba0317587d4cafab`. Implementation commit:
  `3b5f21f` (`feat(planning): add task and study-plan foundation`). No push was
  performed.
- Migration preflight retained the four Canvas differences as Case A
  metadata-only aliases. No historical migration was edited, no migration
  repair ran, and linked Supabase state was not mutated.
- Added forward-only migration
  `20260827155438_task_study_plan_foundation.sql` for owner-scoped `tasks`,
  `study_plans`, and `study_sessions`. It includes validation constraints,
  composite owner-safe foreign keys, supporting FK/query indexes, RLS CRUD
  policies, explicit grants, and service-only security-invoker import/apply
  RPCs.
- Manual task APIs cover create/list/read/update/complete/delete. Canvas import
  reads only persisted synchronized `canvas_assignments`/`canvas_courses`,
  performs no provider request, rejects missing/foreign assignment rows, and
  uses the partial unique key `(user_id, canvas_connection_id,
  canvas_course_id, canvas_assignment_id)` with `ON CONFLICT DO NOTHING`.
  Re-import returns the existing user-owned task and does not overwrite edits.
- The pure shared planner is deterministic-v1 and does not call OpenAI. It
  normalizes/clips/merges availability, orders work by deadline, priority,
  creation timestamp, then UUID, splits sessions at 90 minutes, marks late
  sessions, and returns explicit scheduled/unscheduled minutes when capacity is
  insufficient.
- Preview performs no persistence. Apply accepts only the normalized planning
  request, reloads owned pending tasks, reruns the planner, hashes normalized
  output, and atomically persists the plan plus validated sessions through
  `apply_study_plan_v1`; arbitrary client session records are not accepted.
- Study sessions persist across a fresh request/client context and support
  owner-scoped list/edit/delete. Both the route layer and database constraints
  reject invalid intervals and cross-owner task/plan/session relationships.
- The stateful persistence acceptance covers manual creation, owned Canvas
  import, user customization and idempotent re-import, non-mutating preview,
  apply, session edit, fresh-context task/session reads, completion/deletion,
  and all eight User A to User B denial attacks.
- Fresh verification: shared tests 30/30; targeted R5 API/database/acceptance
  11/11; shared, DB, and API typechecks pass; DB and API builds pass; protected
  reviewer deterministic regression 290/290. Full API is 558/559 only because
  the known pre-existing Windows CRLF-sensitive Canvas SQL assertion expects LF
  text. It was not modified and is not an R5 product defect.
- Local migration static/RLS contract validation passes. Local Supabase runtime
  validation is blocked because Supabase CLI and Docker are unavailable. No
  linked `db push` or runtime migration validation was attempted.
- Protected audit: no Stage 0-6 reviewer, OCR/PDF, durable processing, Canvas
  synchronization, auth architecture, Study Library, notification, or mobile/EAS
  behavior changed. The only lockfile change records the API workspace's
  existing shared-workspace dependency; no external package was added.
- Remaining R5 risk is runtime application/validation of the new migration in
  an approved environment. Recommended next phase: R6 - Mobile task and
  schedule experience.

## 2026-08-28 - R5 final validation clarification

- Git was authoritative when final validation resumed: both intended R5
  commits already existed, the working tree was clean, and no duplicate
  implementation or documentation commit was created.
- Fresh final validation reproduced shared 30/30 (planner 12/12), targeted R5
  API/database/acceptance 11/11, reviewer 290/290, and passing shared/DB/API
  typechecks plus DB/API builds. Full API remained 558/559 with only the known
  Windows CRLF-sensitive Canvas SQL assertion.
- Static SQL, repository-double, and stateful integration coverage do not
  substitute for executing the migration and owner-isolation matrix against a
  real linked Supabase project. No linked mutation was performed during final
  validation.
- Final verdict: PARTIAL — R5 implementation accepted but
  environment/migration runtime validation remains blocked.
- Corrected next task: R5.1 — Live Supabase migration and domain acceptance.
  R6 begins only after R5.1 accepts the database vertical slice.

## 2026-08-28 - R5.1 live Supabase acceptance

- Started from clean `main` at `20ae205`, 40 commits ahead and 0 behind
  `origin/main`; `git fsck --full` passed and both recovery branches plus the
  recovery tag remained present.
- Reverified the four Canvas Case A aliases against live tables, columns,
  constraints, indexes, RLS, policies, triggers, 26 functions, grants,
  retry/idempotency state, incremental state, durable jobs, and service-role
  authorization. Reconciled only `20260728022127` to `20260728094421`,
  `20260728024021` to `20260728104000`, `20260728131529` to
  `20260728201000`, and `20260728133821` to `20260728213700` with supported
  migration-history repair commands. No historical SQL ran or changed.
- The post-repair CLI 2.116.0 dry run proposed exactly
  `20260827155438_task_study_plan_foundation.sql`. The real push applied only
  that migration, and final linked history records `20260827155438`.
- Live schema verification passed for `tasks`, `study_plans`,
  `study_sessions`, `import_canvas_assignments_as_tasks_v1`, and
  `apply_study_plan_v1`, including ownership constraints, indexes, RLS,
  grants, security context, task reload, and atomic plan/session insertion.
- Dedicated User A/User B acceptance passed manual CRUD, persisted Canvas
  import with an unreachable `.invalid` provider URL, idempotent re-import,
  edit preservation, deterministic/non-mutating preview, atomic apply,
  invalid apply rollback, session edit/constraint/delete, and all eight API
  plus RLS/database attacks. Cleanup restored tasks/plans/sessions 0 to 0.
- The first live preview exposed an R5 defect: PostgreSQL microsecond
  `created_at` precision was rejected by a milliseconds-only ISO regex. The
  validator now accepts valid fractional precision and a regression covers the
  live format. The complete live suite then passed.
- Fresh verification: shared 31/31; targeted R5 11/11; DB typecheck/build,
  engine typecheck, API typecheck/build all pass. Full API remains 558/559 only
  for the known Windows CRLF Canvas assertion. No protected subsystem changed.
- R5.1 verdict: PASS. Next recommended task: R6 — mobile Tasks and Study
  Schedule integration.

## 2026-09-04 — Reviewer B14 explanatory repair

- Starting HEAD `f61e0dc`; only historical untracked B8 evidence was present.
- Added bounded missing-target prompts, usefulness-aware merge and deterministic
  imperative/code/fragment/explanation-dump checks. B14 12/12 and engine 437/437
  pass; API baseline remains 607/607 across 69 files.
- Exact B13 candidate replay remains withheld. Plan audit proves the frozen
  Python hierarchy has two heading-only and two code-only sections without
  source explanatory prose. No B14 provider or full B12 rerun was made after
  that stop condition; no evidence was invented and parser default is `legacy`.
- B14 verdict: FAIL. Next task is to reconcile heading-only planned sections
  with the source-faithful explanatory contract without borrowing or weakening
  gates. See `docs/ai/acceptance/b14/reviewer-explanatory-repair.md`.

## 2026-09-04 — Reviewer B15 evidence-supported section planning

- Started at `55547b2` on `main`, 10 ahead / 0 behind, with only the historical
  untracked B8 evidence present and the same two known dangling blobs.
- Stage 2 now classifies explicit source nodes as standalone, structural,
  typed-evidence or unsupported from local normalized/semantic evidence.
  Non-standalone nodes retain titles, reasons, manifests and exact evidence but
  make no provider/retry calls and do not require invented explanations.
- The source audit retains all 13 Python headings as 9 standalone, 2 typed and
  2 unsupported nodes; Statistics/MinerU is 9 standalone plus 1 unsupported;
  Statistics/Docling remains 11 standalone; Accounting is 5 standalone plus 1
  structural introduction. Manifest totals and owners remain 99, 232, 156 and
  46 respectively, with zero planning-time loss or reassignment.
- B15 12/12 and engine 449/449 pass; API remains 607/607. Root typecheck, lint
  and build pass, with only four established mobile import-order warnings.
- Fresh targeted provider validation still fails acceptance. Python reaches
  1.00 coverage/grounding and 99/99 targets but is withheld for instructional
  noise. Statistics/MinerU reaches 0.91/0.80 and 211/232,
  Statistics/Docling 0.97/0.81 and 152/156, and Accounting 0.76/0.88 and 35/46.
  All four are withheld with zero fabrication failures, so the full unchanged
  B12 rerun was not eligible.
- B15 verdict: FAIL. Next task is source-supported evidence completion and
  usefulness repair without changing B15 dispositions, evidence ownership,
  parser defaults or frozen B13/B14 gates. See
  `docs/ai/acceptance/b15/reviewer-section-planning.md`.

## 2026-09-05 — Reviewer B16 deterministic evidence architecture

- Started at `95fc5ac` on `main`, 12 ahead / 0 behind, with only historical B8
  untracked and the same two known dangling blobs.
- Required targets are assembled and identity-hashed before provider work. The
  provider schema contains only stable IDs and concise explanations; required
  key points are source-owned. Batches are capped at six sections / 36,000
  support characters with stable-ID isolation and source-order assembly.
- Stage 4 checks deterministic representation; Stage 5 performs explanation-
  only repair for manifest plans; Stage 5a validates source-owned evidence and
  model prose separately. Permanent quota failures do not retry.
- Runtime metrics cover total/planning/deterministic/provider/validation/
  assembly time, batch sizes, requests, and both retry classes. The durable
  workflow shares this batching boundary and keeps per-section checkpoints.
- Focused 26/26, engine 475/475, API 607/607, root typecheck/lint/build pass.
- Live acceptance stopped at Python because OpenAI returned 429 `no credits
  remaining`. Two initial batches, zero retries, and 5.432 s total preserved
  99/99 targets with zero issues, omissions, fabrications, or provider losses.
  This fallback is not provider-quality acceptance; remaining targets and full
  B12 were not run.
- Verdict: FAIL because frozen live acceptance is unresolved. Restore provider
  capacity and rerun the required B16 order before any B17 work. See
  `docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.

## B16.1 attempt 3 — working-provider validation, 2026-09-07

- One minimal `gpt-4o` readiness request succeeded; provider capacity AVAILABLE.
  The two earlier no-credit attempts remain in the continued validation report.
- Fresh original-prompt Python exposed a generic source-wording prompt contract
  mismatch. A synthetic regression was captured failing before the small prompt
  correction; grounding/usefulness rules, thresholds, ownership and retries did
  not change. Final Python uses four calls, 10.383 s, and two fallback explanations.
- All four target sets remain intact before/after provider work: 99/99, 232/232,
  156/156 and 46/46. Provider-owned targets, provider losses and factual retries
  are zero. Final case call counts are 4/2/3/1.
- Verdict FAIL: Statistics MinerU/Docling are withheld with two/four unresolved
  grounding omissions; MinerU also has structural noise. Python still falls back;
  Accounting has automated PASS but fragmentary prose/raw table dumps. Manual
  quality is not accepted, so the full frozen B12 rerun was NOT RUN.
- Fresh engine 476/476, architecture 27/27, API 607/607; root typecheck/lint/build
  PASS with three fresh/four cached tasks each and four existing lint warnings.
- Next task: reconcile the generic explanation/evidence presentation contract
  with existing validation rules using captured failures. No B17, default parser
  promotion, frozen-gate weakening, evidence-ownership change or push.
- Evidence: `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

## 2026-09-07 — B17 explanation and evidence presentation (local)

- Continued from `4cc7233c2102a3251945a1825e2f591bd158b166` on `main` in
  `C:/Projects/stay-focused-v2`. Implementation/tests committed locally as
  `39fb81211b0f8e48a24d6f29c41f4b9accdfbbb5`; accompanying documentation is in
  the subsequent `docs(ai): record B17 Reviewer presentation validation` commit.
- Added conservative source-owned typed evidence presentation, local prose
  selection, heading-only subject completion, exact duplication removal and
  reader/API support. Manifest identity and all frozen factual rules remain.
- Fresh engine 494/494, architecture 45/45, API 607/607 and reader 32/32 PASS.
  Root typecheck, lint and build each ran seven fresh tasks with zero cached;
  all PASS, with four unchanged lint warnings. Diff check/full fsck PASS;
  the two pre-existing dangling blobs remain.
- Final live Python/MinerU/Docling/Accounting preserve 99/232/156/46 targets
  with zero provider target losses or factual retries. Calls are 2/2/2/2;
  explanation retries 0/0/0/1; observed replacements 0/0/3/0. Accounting's
  extra retry is explicitly reported. All generation requests used gpt-4o.
- Verdict: FAIL — generic Reviewer quality defect remains. Every case fails
  manual usefulness; Statistics remains withheld for two/four independent
  source-item omissions. Required composite labels still repeat source
  passages and damaged cached code/table layout remains. Full frozen B12:
  NOT RUN — targeted prerequisites failed. Native screenshot acceptance was
  not run; complete projected text/payloads were reviewed.
- Next task: repair generic composite source-span/relationship presentation
  and its alignment with source-item evidence, then repeat the frozen four
  gates. Do not weaken factual checks or change model/parser defaults.
- Historical reports preserved; B16 receives an additive continuation link.
  Private source/provider captures and logs remain ignored in `.local/b17/`;
  pre-existing untracked B8 is untouched. No secrets staged and no push.
- Evidence: `docs/ai/acceptance/b17/reviewer-explanation-evidence-presentation.md`.


## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](acceptance/b25.3.2/quiz-candidate-convergence.md).


## W1 — Today/Schedule alignment + submitted-work filtering (website) — 2026-10-11

**Status:** PASS (local implementation and all six real-account checks; unreleased)
**Commits:**
- de3e99c fix(api): keep handed-in Canvas work out of the study planner
- 9d2ef46 feat(web): mark work done from Today, Schedule and Tasks, including paper submissions
- 1343428 fix(web): share free time between Today and Schedule and label unsaved plans

**Changed files:**
- apps/api/src/lib/task-planning-repository.ts
- apps/api/src/lib/task-planning-repository.planner-tasks.test.ts
- apps/web/src/lib/complete-work.ts
- apps/web/src/lib/complete-work.test.ts
- apps/web/src/features/tasks.tsx
- apps/web/src/features/today/today-screen.tsx
- apps/web/src/features/today/plan-preview.tsx
- apps/web/src/features/schedule.tsx
- apps/web/src/features/day-clock/free-time-store.ts
- apps/web/src/features/day-clock/free-time-store.test.ts
- docs/ai/handoff.md
- docs/current-state.md
- docs/ai/current_sprint.md
- docs/roadmap.md

**Adaptations from prompt:**
- STEP 0 stopped because C:/Projects/stay-focused-v2 was on dirty main at de09b9c.
  After owner authorization for isolation, used the existing separate
  C:/Projects/stay-focused-v2-website worktree on website/functional-v1 at the
  required 8942c3c tip. Its only dirty paths were untracked
  docs/ai/desktop-layout-mockup/ and docs/ai/website-screenshots/; both are
  untouched. The original dirty main checkout was not edited or switched.
- Reused isSubmittedCanvasSubmission from mappers: no runtime import cycle.
  Deduplicated linked assignment IDs before the owner-scoped read. No task
  statuses change during planner loading. Regression includes the requested
  four cases, graded-but-missing work, query ownership and safe storage failure.
- Api is already exported by apps/web/src/lib/api.ts and used by useAuth;
  imported that type. The import endpoint accepts exactly assignmentIds and
  returns TaskView[], which does not contain canvasAssignmentRowId. Used its
  existing response contract rather than inventing that field.
- Tasks rendered an icon instead of a button for unlinked Canvas activities.
  Replaced that conditional with a check button for all rows, disabled for
  submitted work. Matched linked rows to canonical activity summaries so
  Canvas submission status and course context survive the Tasks list mapping.
- Today's upcomingDeadlines begins tomorrow. Removing overdue alone would
  lose today's unscheduled deadlines, so today's active deadlines come from
  the existing urgent feed filtered to the local date, alongside today's
  timeline/current block. Prior-date overdue deadlines are separate.
- Today's Done action uses the existing busyRef guard, reports unavailable
  activity resolution, and invalidates a stale preview after completion.
  Schedule also invalidates its preview after completing a deadline.
- Schedule due chips were Link elements. Made each chip a div with a linked
  title and a sibling check button, avoiding nested interactive elements while
  retaining the existing classes and visual pattern.
- Free-time storage retains sf.today.free-time.<date>. Added bounds/integer
  checks and ignored invalid input so malformed data cannot seed clock state.
  Schedule treats Until 00:00 as the next midnight (1440 minutes), preserving
  Today's supported midnight-ending windows.
- Schedule previously planned/replaced only its narrow availability range;
  reused Today's existing planningRequest for the full-day replacement range
  and the same availability. Both still call the same server planner.
- Proposed plan was already the heading; added the unsaved line and placed
  Save to schedule/Discard directly below it, before the plan bar. Verified
  that the primary button needs no scrolling inside the card.
- Reconciled docs/roadmap.md as required by AGENTS.md, in addition to the two
  current-state documents requested in the prompt.

**Gates (FRESH/CACHED/NOT RUN):**
Baseline before edits, all FRESH:
- api typecheck: PASS
- web typecheck: PASS
- api tests (task-planning): PASS, 29 tests / 4 files
- web tests: PASS, 66 tests / 10 files

Final implementation, all FRESH:
- api typecheck: PASS
- api tests (task-planning): PASS, 32 tests / 5 files
- web typecheck: PASS
- web lint: PASS, zero reported warnings/errors
- web tests: PASS, 79 tests / 12 files
- git diff --check / staged diff check: PASS
- Root builds/gates: NOT RUN; this slice uses the explicitly requested API/web gates.

**Real-account verification (STEP 6):** FRESH, actual signed-in account,
local API http://127.0.0.1:3000 and website http://127.0.0.1:3100,
Asia/Manila, implementation HEAD 1343428. No mock backend was used.
1. PASS — The 5 Why Analysis appeared under Overdue, not Today's schedule.
2. PASS — Done removed it from Overdue; Tasks showed it under Completed.
3. PASS — Real pointer drags set Today to 9:30—11:30 PM; Schedule showed
   From 21:30 / Until 23:30 and Same free time as Today.
4. PASS — The real Today preview excluded The 5 Why Analysis.
5. PASS — Not saved yet and the zero planned blocks/Plans from Today hint
   were visible before saving. Save created two blocks at 9:30—10:30 PM and
   10:30—11:30 PM. Preview, saved API sessions, Today's timeline and
   Schedule's today column agreed on the work and times.
6. PASS — Reopen from Tasks restored the assignment to Overdue. It was
   completed again afterward because the owner had already handed it in.

Cleanup PASS: removed only the two session IDs and the new plan ID returned
by the test save; verified original session/plan sets and task fields against
snapshots. Restored local free-time and clock-lock preferences. No new task
imports occurred. The sole intended account change is The 5 Why Analysis
remaining completed. No Canvas synchronization or generation was started.
Private snapshots/screenshots/results are ignored under .local/w1/.

**Failed attempts and recovery:** API startup from the monorepo root initially
failed Workflow app-directory discovery; starting with the API package as cwd
resolved it. The launcher initially misread the first environment key due to a
UTF-8 BOM; stripping it restored browser configuration before sign-in. The
owner's first inability to sign in was superseded by successful sign-in after
that repair. A scripted drag initially set From past the old Until and was
correctly clamped; setting Until first passed. A browser assertion initially
compared equivalent ISO strings literally (+00:00 versus .000Z); comparing
parsed instants confirmed equal persisted times. None required application
changes, gate weakening, or mocked real-account results.

**Known limits:** Paper (on_paper) work stays unsubmitted in Canvas until
it is graded; students clear it with Done. Submitted filtering affects planner
candidates and does not automatically delete historical saved sessions.

**Next:** W2 — website desktop/16:9 layout, Library grid, Canvas course search,
draft editor (separate scope; not started).

**Risks/blockers:** No implementation/STEP 6 blockers remain. Commits are local;
no push or deployment was requested, so production has not received this W1
release. Content time estimates, grade estimator, generation on sync and
inactivity gating remain excluded.


## W2 - Website desktop layout (16:9, Library grid, Canvas search, draft editor, clear-day state) - 2026-10-11

**Status:** PASS locally. All mandatory W2 gates and requested viewport checks passed. No push or deployment.

**Commits:**

- e833536 style(web): full-width shell that fits 16:9 fullscreen and short laptop screens
- 3642654 style(web): equal-height Library course and item cards
- 2abe801 feat(web): search Canvas courses and separate other Canvas spaces
- 5ae9b6b feat(web): desktop draft editor with outline and auto-growing sections
- 7a520ba feat(web): clear-day illustration for empty Today sections
- 14b12c4 fix(web): stretch clear-day panels and center reading layouts

**Changed files:** apps/web/app/globals.css; apps/web/src/components/clear-day.tsx; apps/web/src/features/canvas.tsx; apps/web/src/features/library.tsx; apps/web/src/features/today/today-screen.tsx; apps/web/src/features/today/today-calendar.tsx. Documentation: this appended handoff plus docs/current-state.md, docs/roadmap.md and docs/ai/current_sprint.md. Runtime changes are confined to apps/web; no API changes.

**Adaptations from prompt:**

- Continued in the existing owner-authorized isolated checkout C:/Projects/stay-focused-v2-website, branch website/functional-v1. W1's commits were present at 0a1590a. The dirty main checkout and two unrelated untracked website evidence directories were preserved.
- DayRingClock uses .day-clock, already measured by ResizeObserver. Its desktop width is min(100%, 52vh, 420px), with the existing mobile clock rule preserved. No numeric-size hook or geometry change was needed. Mobile shell rules are repeated at the end so they win.
- Centered capped reading/work surfaces and Settings without widening their readable measures. Reviewer grid tracks use justify-content: center because margin alone cannot center fixed-size tracks inside a full-width grid.
- Library title tooltips use the full course name, while existing courseIdentity presentation remains unchanged.
- Canvas inventory already projected classification as string. Main grouping uses persisted course.selected plus likely_current/past_or_concluded, retaining selected uncertain/unavailable spaces in the main list. Pending checkbox edits and saved-only material/grade/sync actions remain unchanged. Groups move after saving, not while ticking a checkbox. Search includes names and codes across both groups; the N of M count includes other spaces, and those spaces open during a nonempty search.
- ArtifactScreen already rendered DraftEditor directly. Removed the editor's own .reader class, used stable section-index/slide-number anchors, and made the outline a sticky 300px aside at 1100px and above (single column through 1099px). Auto-sizing accounts for borders, content changes, width changes and loaded fonts; save/revision and leave guards are retained.
- ClearDay uses existing theme color tokens, root radius/easing tokens, a compact calendar variant and reduced-motion-safe ray animation. Up Next remains the existing actionable row. Existing mobile shell/column behavior is retained with the requested new search, outline and empty-state additions.

**Gates (FRESH):**

- Baseline at 0a1590a: npm run typecheck --workspace apps/web PASS (exit 0); npm run lint --workspace apps/web PASS (exit 0, no warnings); npm run test --workspace apps/web PASS, 79 tests in 12 files.
- Final implementation tree committed as 14b12c4: the same web typecheck and lint PASS (exit 0); web tests PASS, 79/79 across 12/12 files. No skipped or failing tests. git diff --check and staged diff hygiene PASS.
- Browser acceptance PASS on the final implementation tree: isolated localhost Next preview at 3411 and fictional API/Auth at 3403, existing Playwright Chromium. No Playwright installation. External requests were blocked; zero browser exceptions and zero paid/generation calls. Fictional task/selection/draft writes never touched the real account.
- Browser flows: name/code/case/whitespace search and zero matches, collapsed other spaces, selected uncertain space retained in main list, checkbox changes saved across search and reload, course sync; draft sections and slides resize without internal scrolling, long typing grows and shortening shrinks fields, outline anchors bypass the leave guard, cancelled navigation retains dirty content, two saves update revisions, and reload recovers saved text. Reduced motion disables the rays, normal motion enables cd-glow.
- React review: row and textarea components are declared outside their parents; hooks are unconditional; resize/font callbacks clean up; strict types, accessible labels, keyboard links and existing authentication boundaries are retained.

**Viewport check (FRESH):** Every cell includes no horizontal page scrolling. Desktop shells are centered at 1920/2560; screenshots are full-page captures.

| Page | 1366x768 | 1536x864 | 1920x1080 | 2560x1440 | 390x844 | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Today | PASS | PASS | PASS | PASS | PASS | Clock and proposed-plan heading visible together on small laptop; empty Later fills its desktop row beside Due soon. |
| Schedule | PASS | PASS | PASS | PASS | PASS | Week view remains usable; narrow view keeps the existing internal week scroller without page overflow. |
| Library | PASS | PASS | PASS | PASS | PASS | Mixed one/two-line course names and personal cards fill equal-height rows; searched item cards also match row heights. |
| Library draft | PASS | PASS | PASS | PASS | PASS | Outline beside fields on desktop, above on mobile; existing long sections and slides have no textarea scrollbars. |
| Canvas | PASS | PASS | PASS | PASS | PASS | Search filters both groups; other spaces collapsed when search is clear; selection/actions retained. |

Light and dark Today were also captured and checked at all five sizes (10 additional captures). Tasks, Settings, Generate and Announcements passed the 1920x1080 sweep; Settings' capped grid is centered. Screenshot/report output is ignored under tmp/w2-screens/ via the local Git exclude. Do not commit those files. Reproduction scripts are ignored .local/w2-layout.mjs, .local/w2-body.mjs and .local/w2-fixture.mjs, derived from scripts/web-browser-check.mjs and its existing fixture.

**Failed attempts and recovery:** The first local harness startup had a CRLF-sensitive assembly error; repaired before browser checks. Its first browser attempt lacked the Due soon fixture needed for a two-column assertion; added fictional deadlines. The next run caught the stretch rule applied to the draft grid instead of .today-split: corrected the selector and restored draft align-items: start. The final complete run passed without weakening checks. These failures were local setup/layout issues, not flaky gate results.

**Known limits / follow-ups:** Visual acceptance uses Chromium and fictional local data, not a physical laptop or production deployment. Browser data is intentionally not real-account evidence. On 1366x768 the plan heading is above the fold; the entire plan can still extend below it. Very long drafts intentionally increase page height, with no textarea scroll. This work does not change backend estimates, grades, sync admission/automation or inactivity rules. The owner's real-account localhost preview was restored at port 3100 after the isolated checks; signed-in browser storage was not modified.

**Next:** Owner review on laptop + fullscreen; then feature prompts (content-based estimates, grade estimator, sync automation) when scheduled. No remaining W2 implementation blockers.

## W1/W2 - Owner-authorized main integration - 2026-10-11

**Scope:** The owner explicitly requested `push to main w1 w2`. Integration
starts from remote main `6319376` and merges W1/W2 tip `c05634f`, preserving
both histories. Worktree: `C:/Projects/stay-focused-v2-w1-w2-main`; branch:
`integration/w1-w2-main-20261011`. The original dirty main checkout and
unrelated website evidence directories are untouched. Normal main publication
follows the verified integration commit; no force push or manual deployment.

**Conflict decisions:** Retained main's canonical planner repository exactly:
it already filters submitted/completed work and deselected/ended/unavailable
courses through the shared activity model. Adapted W1's planner regression to
that model and added coverage for an explicitly reopened Canvas assignment
with an old submission timestamp. Tasks retains main's complete canonical
activity list and minute polling, adding W1's import-and-complete helper for
paper work. Today/Schedule preserve explicit content+grades refresh alongside
W1's Done actions, date-specific free time and unsaved-plan labels. Canvas
uses W2 search/grouping/extracted rows with main's bounded content+grades
CourseSync. Documentation combines both release records and the intervening
task-sync reliability/capstone changes.

**FRESH verification:**

- `npm run test --workspace apps/web`: PASS, 82 tests in 12 files.
- `npm run test --workspace apps/api -- src/lib/task-planning src/lib/experience`:
  PASS, 171 tests in 9 files.
- `npm run typecheck -- --force`: PASS, 8/8 packages, zero cached.
- `npm run lint -- --force`: PASS, 8/8 packages, zero cached; four existing
  mobile import-order warnings, no errors.
- Final `npm run build -- --force`: PASS, 8/8 packages, zero cached,
  including Next API/web production builds and Expo web/Android/iOS exports.
- Isolated browser suite: PASS, all 25 requested page/viewport checks, 10
  light/dark Today captures, four-page desktop sweep, Canvas search/selection
  persistence and content+grades Sync now, section/slide textarea growth,
  draft save/reload/dirty-navigation guards and reduced motion. Added an
  unlinked paper activity to the canonical Tasks fixture, clicked Complete,
  verified its import then completed-status PATCH, and verified it moved to
  Completed with Reopen available. Zero browser exceptions/paid calls.
  Screenshots of small-laptop Today and desktop Canvas were also inspected.

**Browser evidence:** Ignored `.local/w2-layout.mjs`, `.local/w2-fixture.mjs`
and `tmp/w2-screens/result.json` in the integration checkout. Fictional API/Auth
run on 3405/3413 with external requests blocked; this is not new real-account
or production acceptance. Temporary browser/server processes closed after
the suite. The signed-in owner preview and earlier W1 account state were not
used or modified during this integration.

**Failed setup attempts and recovery:** This new worktree initially lacked
nested Expo Router and Workflow installations for root typechecking; local
dependency links restored them, and the fresh complete rerun passed. The first
root build could not crawl the mobile dependency junction; copied only the
small existing nested mobile dependencies into the ignored worktree install.
The second build then found workspace links pointing outside Metro's watch
roots; added ignored mobile-local links to this checkout's unchanged packages.
No source/configuration changes, dependency upgrades or weakened checks were
used for these repairs. Next-generated API `next-env.d.ts` changes are excluded
from the release, as are dependency installs, build outputs and test evidence.

**Current-state reconciliation:** Updated `docs/current-state.md`,
`docs/roadmap.md` and `docs/ai/current_sprint.md` with this integration. Their
earlier W1/W2 local-only entries are historical checkpoints superseded by
the owner's main-release instruction. Estimators, sync automation and
inactivity gating remain separate future scopes.


## W2 - Website desktop layout and mobile parity (STEP 7) - 2026-10-11

**Status:** PASS locally, including physical Android acceptance. This supplements
the earlier website-only W2 entry with the revised prompt's mobile scope and
fresh website verification. No API changes, push or deployment.

**Commits:** Existing website implementation retained: `e833536`, `3642654`,
`2abe801`, `5ae9b6b`, `7a520ba`, `14b12c4`; previous website report `c05634f`.
New mobile commits on `b25-3-3-ai-first`, all authored by
`galaxymaxp <omgraythekid@gmail.com>`:

- `b87fe54` feat(mobile): group other Canvas spaces under course search
- `e1f5f3d` fix(mobile): let draft fields grow instead of scrolling inside
- `f42c43f` feat(mobile): clear-day illustration for empty Today sections
- `9ec9fa1` fix(mobile): keep growing draft fields above the keyboard

**Changed files:** New runtime/test changes are confined to mobile:
`src/features/sync/CanvasSyncScreen.tsx`, `canvasSyncPresentation.ts` and its
test; `src/features/redesign/DraftInput.tsx` and its test; `LibraryScreen.tsx`,
`TodayScreen.tsx`, `TodayCalendar.tsx`, `screens.test.ts`; `src/design/ClearDay.tsx`
and its test (all below `apps/mobile`). This website checkout records the
cross-repository result in `docs/ai/handoff.md`, `docs/current-state.md`,
`docs/ai/current_sprint.md` and `docs/roadmap.md`. No new website runtime edits
were necessary because its W2 implementation was already committed.

**Adaptations from prompt:**

- The named `C:/Projects/stay-focused-v2` checkout is dirty `main`. Continued
  website verification/docs in the existing `C:/Projects/stay-focused-v2-website`
  worktree on `website/functional-v1`, where W1 and all website W2 commits
  already exist. Preserved both unrelated website evidence directories.
- Mobile starts at `dace312` on `b25-3-3-ai-first`. All initial dirty
  README/docs/design paths, the deleted thesis overview and untracked paths
  remain untouched and unstaged. Its planning docs are dirty, so the required
  reconciliation is recorded here instead of overwriting mobile owner edits.
- Mobile course types already carry classification. Split after the existing
  search using selected/current/past as main and all others as other spaces.
  Preserve the main list's existing three-course disclosure, row controls,
  saved selection and sync behavior. Reuse the existing disclosure and motion
  helper; searching opens other spaces, clearing closes them, and manual
  toggling remains available. No API contract change.
- Current mobile Library is a two-column compact grid, rather than the
  prompt's older horizontal pager. No layout rewrite: physical CC17 title
  wraps completely over three lines; a longer Enterprise Architecture title
  retains the existing three-line ellipsis with its full accessible label.
- A shared top-level DraftInput owns each field's content-size height,
  including title, sections and slides. Minimum heights are 52 for title and
  96 for content; wrapped content uses ceil(height) + 16 and scrollEnabled=false.
  The outer Page remains the only scroller with handled keyboard taps. Native
  acceptance found Android edge-to-edge adjustResize insufficient, so added
  draft-only KeyboardAvoidingView (Android height / iOS padding). Existing
  save/autosave, revisions and leave guards are retained.
- ClearDay lives beside the shared design primitives. Theme aliases are
  separator/surfacePrimary/textMuted/textPrimary/amber; the rays use a separate
  SVG layer in an Animated.View for native opacity animation. Existing ambient
  motion duration is 3200ms per leg, opacity 0.35 to 0.7. Reduced motion,
  background and lost focus stop the loop; cleanup stops it on unmount.
  The optional planning action scrolls to the actual clock through Page's
  existing scrollRef. Compact calendar state uses the same drawing.

**Gates (FRESH):**

- Website at `c05634f`: typecheck PASS; lint PASS, zero warnings/errors;
  tests PASS, 79/79 in 12/12 files. This is both the current baseline and final
  runtime tree; no implementation changes were needed this turn.
- Mobile baseline `dace312`: typecheck PASS; lint PASS with four pre-existing
  import/first warnings; tests PASS, 784/784 in 76/76 files.
- Mobile final `9ec9fa1`: typecheck PASS; lint PASS, same four existing warnings
  in activeProcessingJobStore.test.ts, completedArtifactCache.test.ts,
  processingJobsApi.test.ts and processingOutboxStore.test.ts; tests PASS,
  791/791 in 78/78 files. Added grouping, growth/shrink/edit forwarding,
  ClearDay theme/motion lifecycle and Today action/keyboard wrapper coverage.
- Native arm64 local debug APK build PASS using the existing Android project,
  JDK 17 and installed SDK: 412 Gradle tasks (367 executed, 45 up-to-date).
  No Playwright installation, API edits, root builds or provider calls.
  Root suites/builds: NOT RUN; the prompt's scoped web/mobile gates passed.
- React review PASS: top-level components, unconditional hooks, cleaned-up
  animation, strict types, accessible disclosures/labels and decorative SVG.

**Viewport check (FRESH):** Re-ran ignored `.local/w2-layout.mjs` with installed
Playwright Chromium against isolated localhost web/API/Auth fixtures. Every
cell includes no horizontal page scroll; desktop shell centers at 1920/2560.

| Page | 1366x768 | 1536x864 | 1920x1080 | 2560x1440 | 390x844 | Note |
| --- | --- | --- | --- | --- | --- | --- |
| Today | PASS | PASS | PASS | PASS | PASS | Clock and top of proposed plan visible on laptop; clear state fills desktop row. |
| Schedule | PASS | PASS | PASS | PASS | PASS | Existing narrow week scroller stays inside the page. |
| Library | PASS | PASS | PASS | PASS | PASS | Long/short/personal course cards and item cards match row heights. |
| Library draft | PASS | PASS | PASS | PASS | PASS | Desktop outline beside fields; narrow outline above; fields have no inner scrollbars. |
| Canvas | PASS | PASS | PASS | PASS | PASS | Search filters names/codes and both groups; other spaces collapse with clear query. |

Ten additional light/dark Today captures and Tasks/Settings/Generate/Announcements
1920x1080 sweep PASS. Interaction checks PASS: Canvas selection persistence and
sync; no-match search; selected uncertain main group; draft loaded growth,
typing/shrink, anchor navigation, leave guard, two saved revisions/reload;
normal/reduced-motion rays. Zero browser exceptions and zero paid calls.
Report and screenshots remain ignored under `tmp/w2-screens/`.

**Mobile parity (STEP 7):** Full-width desktop shell is NOT APPLICABLE.
Library layout rewrite is NOT APPLICABLE; actual long titles checked as above.
Canvas grouping, growing draft fields/keyboard awareness, and normal/compact
clear-day states are applied. Physical check FRESH PASS on realme RMX3151,
Android 13, using a separate native local debug package
`com.galaxymaxp.stayfocusedv2.w2verification`, not Expo Go. The ignored Metro
harness mounts actual current screens, ThemeProvider, native navigation,
TextInputs and react-native-svg with isolated fictional auth/API/library/course
data; it does not authenticate or write to the real account.

| Physical check | Result | Evidence |
| --- | --- | --- |
| Canvas | PASS | Other spaces collapsed initially, selected uncertain in main; Career search opens matching group; clear collapses; disclosure opens. |
| Draft | PASS | Loaded long field has no inner native scroll; outer page reaches Next steps; real keyboard leaves focused field visible; additional typing grows it with scrollEnabled=false. |
| Today light/dark | PASS | Normal and compact sun/calendar/check drawings and text readable in both themes. |
| System Reduce Motion | PASS | Off/on checked in both themes through Android Accessibility Remove animations; actual ThemeProvider follows system state. Animation stop/start lifecycle also verified by tests. |
| Planning action | PASS | Plan your free time returns the outer page to the actual day clock. |
| Library titles | PASS | CC17 wraps fully; longer title uses existing ellipsis, without vertical clipping/overlap. |

Ignored native evidence: mobile `.local/w2-native/` screenshots, UI XML,
`device.cjs`, `device-more.cjs`, `result.json`, fixture/resolver files; build
log `.local/w2-native-build.log`, Metro log `.local/w2-native-metro-2.log`.
No screenshots, fixture configuration or APKs committed.

**Failed attempts and recovery:** New render-test type selectors initially
failed strict typing; changed to typed predicates. Existing screen mocks lacked
the new SVG Rect/G and absolute-fill style; added those mocks and reran the
full suite successfully. Native fixture startup initially omitted its Metro
watch folder, and an old launcher held a log file; fixed only ignored harness
setup. The physical keyboard overlap was a real defect, repaired in `9ec9fa1`
and rechecked. A post-autosave assertion looked for an offscreen field; scrolling
the outer page found the retained text. ADB WRITE_SECURE_SETTINGS was denied
for animation toggles, so used the actual Accessibility UI. Device briefly
disconnected during final checks; owner reconnected it, and remaining checks
and restoration passed. Early screenshots captured before a navigation/theme
update were replaced with captures after UI settles; final named reduce-true/
reduce-false and Library captures are the acceptance evidence. No gates were
weakened and no passing physical result is inferred from a unit test alone.

**Cleanup:** Original Remove animations Off / transition_animation_scale=1
restored and read back. Only the isolated W2 debug package was uninstalled;
existing signed app retained. Own remote screenshot/XML removed. The 8082
reverse was already absent after device reconnect; Metro stopped. Expo's
generated expo-env.d.ts comment was restored to its pre-check content.
Original web preview on port 3100 remained available; no real-account state
was changed by these fixture checks.

**Known limits / follow-ups:** Local Chromium and physical Android checks use
fictional data; they establish layout/native behavior, not production or
real-account API integration. iOS keyboard behavior is NOT RUN physically.
Long drafts intentionally increase outer page height. Existing mobile tile
truncation is retained. No backend estimate, grade, sync-automation/admission,
inactivity rule or generation-engine work is included. Commits are local.

**Next:** Owner review on laptop + fullscreen; then feature prompts
(content-based estimates, grade estimator, sync automation) when scheduled.

## W2 mobile parity main publication - 2026-10-11

**Scope:** Owner requested `push to main`. Fresh fetch found W1/W2 website
already on remote main at `7ef5a61`. Used the clean existing integration
worktree, preserving all original dirty checkouts. Imported the mobile branch
locally and cherry-picked only the four W2 commits; its older unrelated branch
history is excluded.

**Mainline commits:** `b87fe54` -> `f308faf` (Canvas grouping), `e1f5f3d` ->
`55b7cd0` (growing fields), `f42c43f` -> `815631d` (clear-day), `9ec9fa1` ->
`dc018c8` (keyboard avoidance). Report `3a59d3a` -> `2c022f4`. Runtime patches
applied cleanly; Today retains main's newer 60000ms task-refresh interval.
The four report files conflicted at their new sections: retained both existing
main integration and mobile-parity sections, without discarding history.

**FRESH gates at `2c022f4`:** web typecheck PASS, lint PASS, tests 82/82 in
12/12 files; mobile typecheck PASS, lint PASS (same four pre-existing import
warnings), tests 793/793 in 78/78 files. Diff hygiene PASS. No API, dependency,
schema or website runtime changes in this integration. Root build, new browser
and physical-device checks NOT RUN for this Git-only integration; previous
viewport/physical results remain historical evidence for the source patches.

**Publication:** Owner-authorized normal push of this verified integration to
`origin/main`, followed by a remote HEAD comparison. No force push, source
branch push, manual deployment, paid calls, private fixtures or environment
files. Original dirty mobile docs/design and website evidence directories
remain untouched. Next: owner laptop/fullscreen review.

## F0S - autopilot base moved to main `079986c` (2026-10-15)

**Status: PASS for the unattended F0S scope.** Created
`overnight/2026-10-15_feedback` directly at released GitHub main
`079986c2568d067ea49595f9b4862dac98db2fc0` (PR #10). Starting checkout was
`overnight/2026-10-13_0132` at `20b12c5`, with no tracked changes or existing
F0S progress/commits. The new branch did not exist. No committed work was redone.

**Fetch path:** added `github` as
`https://github.com/galaxymaxp/stay-focused-v2.git`, then successfully ran
`git fetch github main`. Local release-clone fallback was NOT RUN; stale
local-path `origin` is unchanged. Required ancestor `079986c` equals fetched
main. All 37 overnight-added migration paths exist there, including both named
visual migrations and `20261013000500_offline_activity_draft_copies.sql`.
STEP 2.3 added non-doc source paths absent from main: **none**.

**Untracked preservation:** 23 initial files: `UI/README.md`, ten screenshots
under each of `UI/screenshots/dark/` and `UI/screenshots/light/`,
`apps/mobile/.gitignore`, and `supabase/.temp/cli-latest`. None collide with a
tracked path in main; moved untracked files: **none**. All remain untouched.
Runner files under `tmp/` remain uncommitted.

**Install:** FRESH `npm ci --no-audit --no-fund` PASS (1,495 packages, 2m),
Node v24.16.0/npm 11.13.0; no lockfile/engine mismatch or fallback attempt.
Deprecation warnings were recorded. `package-lock.json` is unchanged.

**FRESH baseline gates at `079986c`, run serially:**

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | PASS: 8/8 tasks, 0 cached |
| `npm run lint -- --force` | PASS: 8/8 tasks, 0 cached; 0 errors, 5 existing mobile import-order warnings |
| `npm test -w @stay-focused/shared` | PASS: 134 tests, 13 files |
| `npm test -w @stay-focused/canvas` | PASS: 75 tests, 1 file |
| `npm test -w @stay-focused/api -- --maxWorkers=4` | First run: 2,095 passed / 1 failed / 3 skipped, 178 passed / 1 failed files; unchanged full rerun PASS: 2,096 passed / 3 skipped, 179 files |
| `npm test -w @stay-focused/mobile` | PASS: 1,026 tests, 102 files |
| `npm test -w @stay-focused/web` | PASS: 84 tests, 13 files |
| `npm run build -- --force` | PASS: 8/8 tasks, 0 cached; API 34/34 pages, web 19/19 pages; Expo 68 assets, 8 web bundles, 1 Android bundle, 1 iOS bundle |
| `git diff --check` | PASS: 0 whitespace errors; also checked after generated-file restoration and documentation edits |

**Failed first attempt / flake:** API test
`src/lib/canvas-reviewer-sources.test.ts:157`, "lists only selected-course
descriptors without source bodies", exceeded its unchanged 5,000ms timeout
(5,665ms reported). The same full suite and four-worker cap passed on rerun;
no product code, test, timeout or validation setting was changed. Vite's existing
CommonJS/ESM config warning was recorded. The API's three skips remain explicit.
All tests used repository-local `.local/test-temp` via TEMP/TMP/TMPDIR; no
Windows Temp cleanup. Full local evidence: `tmp/overnight/F0S.*.log`, gate
results `F0S.gates.json`, and the separate `F0S.api-rerun.log`. Next.js generated
changes to both `next-env.d.ts` files were inspected and restored before commits.

**Commits:** `c2b1cec docs(ai): reconcile F0S released-main baseline` updates
current-state, roadmap and sprint as required by AGENTS.md. This footer is
committed alone as `docs(ai): record autopilot base on released main`; its final
hash and both commit subjects are recorded in `tmp/overnight/F0S.status`.
All commits use author `galaxymaxp <omgraythekid@gmail.com>`.

**UNVERIFIED (owner to confirm):** deployed revisions, live database/migration
rows, Scheduler and physical-device behavior. This run establishes a local Git
and validation baseline only. No Supabase, Vercel, Google Cloud, Canvas or Resend
call, deployment, remote SQL, Scheduler change, environment-file edit or push
occurred. Rollout and Device checks were skipped entirely; F0S defines no such
actions. **Owner steps remaining: none for F0S.** SP0 is the next separate item;
no later tester-feedback work was started.

## SP0 unattended speed audit (2026-10-15)

**Status: PASS for the docs-only local SP0 scope.** Read the full SP0 prompt,
including overriding UNATTENDED rules, the tester-feedback roadmap's full
SP0/SP1/CQ1/SP2 sections, root policy/AUTOPILOT and current planning state.
Starting branch `overnight/2026-10-15_feedback`, HEAD `89dd1b8`, F0S PASS,
tracked tree clean. Preserved unrelated untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/`; no product code or migration was edited.

Deliverable: [SP0 speed audit](../architecture/sp0-speed-audit.md), covering Today,
Courses/course workspace, Tasks, Library, Reviewer and Queue/processing on mobile
and the student website, API/query costs, cache boundaries, complete Canvas sync,
EP1 admission/200/25 guard, bundles/hosting, and concrete SP1/CQ1/SP2 inputs.
Current-state/roadmap are reconciled and sprint has the requested tester-feedback
line. Older F0S "SP0 next" descriptions are superseded by these current entries.

**Top 5 findings:**

1. Course preparation status checks run sequentially before pagination, then
   repeat for the visible page: simple 100 File/Page candidates imply 300 serial
   reads plus 400 visible-page reads, excluding inventory/auth. Batch evidence,
   revision-matched receipts and controls without weakening identity checks.
2. Library/detail/material badge assembly loads full owner histories before
   filtering. Synthetic 240-reviewer Library case: 18 emulated table-page reads,
   18,900,915 DB JSON bytes for 38,123 bytes of summaries; one reviewer still
   reads 18,879,565 bytes. These are synthetic observations, not live wire sizes.
3. Main resource hooks wait for network on fresh visits. Mobile Tasks has SQLite
   snapshots but does not read them until connection failure; mobile Library and
   saved Reviewer already display local content before a remote answer.
4. Courses reads live Canvas inventory and writes course rows before returning
   saved course state. This introduces Canvas latency into ordinary navigation.
5. Website Library fetches all pages before publishing first content. Its isolated
   unchanged hook hid an available first page while page two was held for 100 ms.

Further findings include overlapping Today context/auth calls, serial Library
groups, background hydration amplification, duplicate job polling, static Three.js
on Today (315 kB First Load JS), heavy read-route imports, and owner decisions
about region/capacity. The stored course schema has course dates/workflow and
term id, but not term dates/concluded/enrollment evidence. CQ1 must keep undated
Default Term cases current absent explicit completion or manual override.

**Commits:**

- `588bbf1 docs(architecture): SP0 speed audit` — audit only.
- Companion local commit `docs(ai): reconcile SP0 audit checkpoint` — this
  handoff, sprint, current-state and roadmap; its final hash and both subjects
  are recorded in `tmp/overnight/SP0.status` after commit, avoiding a self-hash.

Both use author `galaxymaxp <omgraythekid@gmail.com>`. No push.

**Gates and measurements (FRESH, implementation baseline `89dd1b8`):**

| Command / evidence | Exact result |
| --- | --- |
| `npm run build -w @stay-focused/web` | PASS, exit 0; 1/1 build, compilation 3.6 s, 19/19 static pages, 28 route entries; every route size is in the audit |
| `npm run test -w @stay-focused/mobile -- src/features/redesign/useLocalLibrary.test.ts` | PASS, 9/9 tests, 1/1 file, test duration 195 ms / total 764 ms; TEMP/TMP under `.local/test-temp` |
| `node_modules/.bin/vitest.cmd run --config tmp/overnight/SP0.hooks.config.ts` | Final PASS, 2/2 tests, 1/1 file: 11 resource-hook cases plus website Library all-pages gate; test time 1.34 s / total 1.70 s |
| `node_modules/.bin/tsx.cmd --tsconfig apps/api/tsconfig.json tmp/overnight/SP0.measure.ts` | PASS, exit 0, 12/12 observations: six real service methods against synthetic typed rows, zero/20 ms injected page delays; no network clients |
| `node tmp/overnight/SP0.verify-docs.cjs` | PASS: 100/100 explicit audit file:line references exist/in range; staged paths all Markdown under docs (1/1 in audit commit, 4/4 in companion commit) |
| `git diff --check` | PASS, 0 whitespace errors on final owned docs |
| `git diff --cached --check` | PASS, 0 whitespace errors before each commit |
| Docs-only scope | PASS: 5 changed paths total, all docs Markdown; generated web `next-env.d.ts` inspected and restored |
| Root typecheck/lint/full suites/mobile build | NOT APPLICABLE, docs only; F0S baseline results were not relabeled as fresh SP0 results |
| Production, rollout, physical-device/browser live timings | NOT RUN under UNATTENDED rules; live claims UNVERIFIED (owner to confirm) |

**Failed attempts / tooling:** initial 1-test resource probes passed; one repeat
added JSON capture because console output was suppressed. Expanding the probe to
the full web Library module first produced **1 passed / 1 failed** on Vite JSX
import parsing, before Library assertions; only the temporary harness was changed
to extract the unchanged private hook in memory. Final 2/2 passed; product files,
timeouts and assertions were not weakened. Failed log is
`tmp/overnight/evidence/SP0-hook-measure-jsx-failed.log`. The normal Vite future
native-config CommonJS/ESM warning remains. No flake observed. Two attempted
Python helper commands could not start (Python unavailable); a later inline Node
reference-check command failed from PowerShell quote handling. File-based Node
helpers completed reconciliation/reference checking. Both Git diff gates were
green even in that combined inline-helper attempt. These tooling failures are
retained separately from the successful product build and tests.

Local scripts/logs/JSON stay under `tmp/overnight/` and are not committed. Audit
embeds measurements needed by future items. Progress is `SP0.progress` and final
machine status/commit list is `SP0.status`.

**UNVERIFIED (owner to confirm):** actual per-screen cold/warm first-content
timings, actual API payload sizes and query plans, CIT17 sync split into Canvas/
DB/preparation admission, CIT17 Default Term/date/enrollment counts, deployed
API/website/DB/worker regions/revisions, current Cloud Tasks/worker limits,
provider quotas, live backlog/cold starts and physical behavior. Tokyo DB/worker
versus iad1 API is repository/historical evidence, not a fresh service check.

**Owner steps remaining:** confirm those live measurements/classification facts;
decide SP2 region/capacity trade-offs. **Rollout** and **Device checks** were
skipped entirely and remain owner-present work for later RB3 (migration/deploy/
OTA as applicable, realme/website saved-first/offline/account isolation/current-
past/Queue/generation checks and before/after timings). SP0 itself requires no
rollout because it changes no product behavior. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, remote SQL, deployment, Scheduler change, environment-file
edit or push occurred. Next separate item is SP1; this run stops at SP0.


## SP1 unattended saved-first screens (2026-10-15)

**Status: PASS for STEP 0-4, gates, docs and local commits.** Branch `overnight/2026-10-15_feedback`, starting `68e40d0`, tested code `15811de`. [Acceptance](acceptance/sp1-cached-first-screens.md) records STEP 0 file:line references, each screen's pre-SP1 saved data, the acceptance matrix and failures. [ADR-027](../architecture/ADR-027-cached-first-screens.md) uses the established ADR folder; the prompt's `docs/adr` does not exist.

Owner/query/schema-bound snapshots now hydrate both apps before network, including successful empty results and exact course material offsets. Mobile reuses SQLite Library/draft/answer-key behavior and adds a forward-only local table/purge; web uses one owner-keyed IndexedDB database with silent storage fallback. Status/Retry keeps data visible, derived group positions remain stable, and changed Reviewers require explicit acceptance. Auth cleanup is tested; epochs fence delayed writes. No API/provider/generation/RLS/cancellation behavior changes.

Commits (author `galaxymaxp <omgraythekid@gmail.com>`, local only):

- `2bb62ba feat(shared): add owner-bound saved snapshot contract`
- `eb6ac80 feat(mobile): render saved screens before background refresh`
- `2bfbff3 feat(web): persist owner-scoped saved-first screens in IndexedDB`
- `44f2683 fix(cache): retain derived course positions during refresh`
- `15811de fix(cache): reconcile pagination status and schema regressions`

The scoped documentation commit containing this footer is listed with its final hash in `tmp/overnight/SP1.status`; no self-hash amendment is needed.

| Command | Evidence/result |
|---|---|
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks; zero cached; 28.111s |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks; zero cached; zero errors, five existing warnings; 32.18s |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1,036/1,036 tests; 105/105 files; zero skips; 6.596s |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 223/223 tests; 19/19 files; zero skips; 2.269s |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 94/94 tests; 16/16 files; zero skips; 2.96s |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build; 73.15s |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 19/19 static pages; 37.247s |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 local Android export; 63.626s |
| `npm run build -- --force` | FRESH PASS: 8/8 tasks; zero cached; 113.542s |
| `git diff --check` and `git diff --cached --check` | FRESH PASS before documentation commit |
| API test suite | NOT APPLICABLE / NOT RUN: no API source changed |

First full mobile gate stopped correctly at **1,032 passed/4 failed**, **102 passed/3 failed files** (1,036 tests/105 files). Two upgrade assertions hard-coded schema 7; they now assert the current schema while retaining body/draft/key/practice checks. Two screen assertions used header-child positions; the stand-in now renders header controls and tests find SearchField/SegmentedControl. Focused repair **77/77**; final full mobile **1,036/1,036**. Earlier draft parse/edit-tail, JSX transform, ordering assertion and lint failures are retained in the acceptance report; no flake observed. Initial forced typecheck/lint also passed 8/8 before final review, then were rerun fresh after the final edits. Logs remain ignored under `tmp/overnight/evidence/SP1-*`; TEMP/TMP stayed inside `.local/test-temp`. No tmp, credential, generated export or private fixture is committed. Unrelated `UI/`, `apps/mobile/.gitignore`, and `supabase/` remain untouched.

**UNVERIFIED (owner to confirm):** live/deployed revision, production first-content latency, live operational state and actual RB3 physical/browser behavior. There were no remote service calls, deployments, remote SQL/migration application, Scheduler changes, environment-file edits or pushes. The only migration is new on-device SQLite migration 8; historical migrations are unchanged. Current-state, roadmap, Tester feedback sprint and the external roadmap's SP1 status are reconciled.

**Owner steps remaining:** the entirely skipped Rollout (preview OTA and website deploy), followed by the entirely skipped Device checks/RB3: reopen saved Today, airplane-mode refresh/Retry with last-updated time, sign out and use a second account, and hold an open Reviewer while its new revision arrives. SP1 requires no remote migration. Next separate roadmap item is CQ1, not started here.

Tooling note: the finalizer's first freshness guard could not parse PowerShell's UTF-16 build log; no docs were written before that guard. Correct decoding confirmed the existing 8/8, zero-cached build result, and finalization succeeded. This was not a product gate failure.


## CQ1 unattended current and past courses (2026-10-15)

**PASS for the unattended CQ1 code scope (STEP 0-4, gates, docs and local commits).** Current courses show by default; past courses stay in collapsed sections on mobile and website with owner controls to move either way. Shared Canvas conclusion/enrollment/course/term evidence drives the automatic rule; Default Term without completion evidence stays current. Past-course work is omitted from Today, Tasks, calendar, Queue, notification fan-out, routine sync and eager preparation. Explicit opens/refreshes sync once; Library reviewers and quizzes remain labelled and available. Code tip: `6d8759e`; [acceptance](acceptance/cq1-current-and-past-courses.md), [ADR-028](../adr/ADR-028-current-and-past-courses.md).

Starting HEAD `33824ca`; branch `overnight/2026-10-15_feedback`. Resumed after interruption by rereading prompt/progress/Git and inspecting the uncommitted implementation; committed migration/shared work was preserved.

Commits (author `galaxymaxp <omgraythekid@gmail.com>`, local only):

- `a4554a9 feat(db): persist course state evidence and owner overrides`
- `39cf0ff feat(shared): classify current and past courses consistently`
- `5e1506e fix(db): guard past courses at atomic poll sync reservation`
- `6d8d51d test(shared): verify refreshed snapshots replace course state`
- `98024e8 feat(api): hide past-course work and skip routine sync`
- `132a315 feat(mobile): collapse past courses and retain Library access`
- `6d8759e feat(web): group past courses behind owner controls`

The documentation commit containing this footer is listed with its final hash in `tmp/overnight/CQ1.status`.

| Command | Evidence/result |
|---|---|
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks; zero cached; zero errors/five existing warnings |
| `npm run test --workspace @stay-focused/api` | FRESH PASS: 2,120 passed; 3 skipped; 180/180 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1,042/1,042 tests; 105/105 files; zero skips |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 258/258 tests; 22/22 files; zero skips; source and generated JS copies |
| `npm run test --workspace @stay-focused/shared -- src` | FRESH PASS: 129/129 source tests; 11/11 files; zero skips |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 95/95 tests; 16/16 files; zero skips |
| `npm run test --workspace @stay-focused/canvas` | FRESH PASS: 75/75 tests; 1/1 file; zero skips |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 1/1 build |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 1/1 build; 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: 1/1 local Android export |
| `npm run build -- --force` | FRESH PASS: 8/8 tasks; zero cached |
| `git diff --check; git diff --cached --check` | FRESH PASS: diff hygiene before documentation commit |

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,120 passed/3 skipped in 180 files**, mobile **1,042/1,042 in 105 files**, shared **258/258 in 22 files** (includes emitted JS copies; source-only **129/129 in 11 files**), web **95/95 in 16 files**, Canvas **75/75 in 1 file**. Standalone API/web/Android builds **1/1 each**. Lint: zero errors/five existing warnings. Repaired draft/first-gate failures and one earlier API timeout flake remain recorded in acceptance; the final serial run passed without retries.

The shared source-only run avoids counting emitted JS as distinct acceptance cases. First API full gate: 2,097 passed/19 failed/3 skipped; adapter repairs passed 80/80, then 2,117 passed/3 skipped. Added atomic reservation tests passed 10/10 and subsequent full API passed 2,120/3 skipped. One unchanged Canvas source test timed out at 5s under load; unchanged focused/full reruns passed, recorded as a flake. First mobile: 1,037 passed/3 failed; repaired fixtures plus behavior tests passed 58/58, final mobile 1,042/1,042. Draft typecheck/SQL/fixture/tooling failures are retained in acceptance. The additional root build was interrupted before completion and has now passed freshly.

Logs/helpers/progress stay under `tmp/overnight/`; test temp stays under `.local/test-temp`. No credentials, generated output, validation artifacts or private fixtures are committed. Generated Next ambient files are restored to their tracked contents after builds. Unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/` remain untouched. Current-state, roadmap, sprint, acceptance, ADR and external roadmap CQ1 status are reconciled.

**Owner steps remaining:** apply migration files `20261015030000` then `20261015030100`, publish API/website/worker and preview OTA, then run the entirely skipped Rollout/Device checks on realme and website. CIT17 Default Term identities/counts, live course evidence, deployed revisions/database/Scheduler state, actual speed and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. Next separate roadmap item: QD1; this finite CQ1 run ends here.

Documentation reference check: FRESH PASS, 10/10 CQ1 local links. The first helper scanned historical roadmap sections and flagged an unrelated old RB1 link; limiting the helper to CQ1 additions passed without changing historical content.

## QD1 unattended header Queue - 2026-10-15

**Status: PASS for local code scope.** STEP 0-4, fresh serial gates, documentation
and local commits complete on `overnight/2026-10-15_feedback`. Queue is now a
header dropdown/popover over the current screen on both platforms. One owner-
scoped source per platform supplies jobs and counts, preserving 5 s active /
30 s idle foreground polling. Running-only badges, unseen failed/expired dots,
progress/Retry/Open and five recent completed entries reuse the existing grouping
and bounded history projection. Mobile retains Auto, pending intent recovery,
past-course filtering and outside/Back dismissal; web uses native button
activation, dialog focus, Esc/outside dismissal and focus return. Legacy Queue
routes open the overlay. The distinct processing notification/deep-link target,
SP1 saved-first screens and CQ1 current/past behavior remain intact.

Commits (author galaxymaxp <omgraythekid@gmail.com>, no push):

- `6beec6a` refactor(queue): share header data and bounded history grouping
- `c94d529` feat(mobile): open generation queue under the header
- `1183369` feat(web): replace the queue page with a header popover
- Documentation: `docs: record QD1 header queue acceptance` (this entry's scoped
  commit; final hash in `tmp/overnight/QD1.status` and Git log).

FRESH final serial gates: forced typecheck **8/8**, forced lint **8/8**, forced
root build **8/8**, all **0 cached**. Mobile tests **1,056/1,056 in 110 files**;
web **113/113 in 20 files**; **0 skipped**. Standalone API build **1/1, 34/34 static
pages**, web **1/1, 19/19 static pages**, Android export **1/1, 1 bundle/35 assets**.
Diff and staged-diff hygiene **0 errors**. Lint has **0 errors**, five existing
mobile warnings and one existing web Library warning. API/shared tests **NOT
APPLICABLE** (their source unchanged). Logs remain under tmp/overnight; tests use
repo-local TEMP/TMP. Next-generated declarations restored; no generated output
or private fixture committed.

Failures retained: first root typecheck **4/6 tasks, 0 cached, 12 TS diagnostics**;
second **4/6, 0 cached, 3 diagnostics**, fixed strict test callback/ref typing.
First lint **5/8, 0 cached, web 1 error/2 warnings**; fixed const/dependency and all
13 new mobile warnings revealed by an intermediate passing lint. The first lint
launch briefly overlapped typecheck; only the final sequential runner counts as
serial evidence. First expanded mobile focus run **20 passed/1 failed** (test-tree
serialization), next **21 passed/3 failed** (mock identity/memoization, including
one 5-second harness timeout); fixed, final focus runs **24/24 mobile**, **18/18
web**, then full suites passed. Earlier draft source-extraction/token/encoding
and local helper failures are documented in acceptance. No nondeterministic
product flake observed; no validation weakened or unrelated work overwritten.

Production revisions, live database/Scheduler state and physical behavior are
**UNVERIFIED (owner to confirm)**. Code/migrations/docs supported STEP 0; there was
no uncovered Queue notification dependency or source contradiction. No remote
service action, remote SQL/migration application, deployment, Scheduler change,
environment-file edit, push or deletion outside the repository occurred.

**Owner steps remaining:** Rollout and Device checks were entirely skipped.
Deploy website and publish preview OTA; check realme and website for running
count, dropdown over current screen, Retry/Open, old links, outside/Android Back,
Reduce Motion and website Enter/Space/Esc/focus return. Complete earlier CQ1
migration/API/worker owner rollout separately before combined RB3 acceptance.
QD1 needs no migration or API/worker deployment. No further approval question
is pending; this run ends at QD1 and does not start GA1.

[Acceptance](acceptance/qd1-queue-dropdown.md),
[ADR-029](../architecture/ADR-029-queue-dropdown.md). Reconciled current-state,
repo roadmap, current sprint and the external tester-feedback roadmap QD1 status.
Unrelated untracked UI/, apps/mobile/.gitignore and supabase/ were preserved.

Final docs hygiene first found one extra sprint EOF blank line; repaired, then
final diff/staged-diff checks passed with zero errors.

## GA1 unattended course batch generation (2026-10-15)

**Status: STOPPED at STEP 0**, as required by UNATTENDED rules 3/4 and
"Verify (STOP on any surprise)". Inspected HEAD `65c9150` on
`overnight/2026-10-15_feedback`; branch/QD1 PASS/clean tracked tree prerequisites
passed **3/3 FRESH**. Unrelated untracked UI/, apps/mobile/.gitignore and
supabase/ were preserved. No product code, migration or later step was started.

**Findings:** EP1 manual admission reads preparation then admits preparation and
throws `409 not_ready`, without creating a Reviewer job or durable explicit
intent (`apps/api/src/lib/experience/generation.ts:44`, line 49; existing test at
`generation.test.ts:37`). Completion wakes only automatic admission
(`canvas-preparation/orchestration.ts:107`), which skips Auto opt-out, baseline
material and past courses. E2's `packages/shared/src/reviewer-estimate.ts:21`
requires a saved reviewer and estimates study/recall time; it cannot supply
pre-generation wall-clock minutes. These contradict the requested reusable
prerequisites, rather than merely lacking live confirmation.

**AG1/AG2 coverage finding:** coverage is incomplete by design, not just hidden.
`apps/api/src/lib/auto-reviewers/admission.ts:152` baselines initial material;
line 64 requires a valid newer timestamp; lines 53-60 limit File/Page eligibility;
line 132 honors Auto off; lines 15-18/179/191/236 enforce three/run, five/rolling
day, three attempts and run budget. Lines 225-234 skip mapped existing material
and wait for preparation. Existing mapped-reviewer presence does not prove the
current revision is up to date (`experience/service.ts:374`). `after-sync.ts:13`
skips past courses. `poll-trigger.ts:13` only detects new File/Page module items
from complete prior evidence, and line 45 reserves a capped sync. QD1 shows
admitted jobs, not the ungenerated backlog. Live student inventory was not read.

**Quota:** server enforcement does exist. The transaction-serialized trigger in
`packages/db/migrations/20260723090006_processing_quota_concurrency_hardening.sql:15`
enforces active/hourly/queued/daily caps on normal job insertion. Reuse it;
`study-tools.ts:310` explicitly says its in-memory limiter is not a durable quota.
The no-server-quota STOP condition is not triggered. Full reuse inventory,
actual mobile/web course routes, ownership/idempotency and evidence are in
[GA1 audit](acceptance/ga1-course-batch-generation.md); ADR-030 is deferred.

**Exact questions for the owner (recorded, not sent during unattended work):**

1. May GA1 add a durable explicit batch-intent receipt/resumer independent of
   Auto preference/baseline, including explicitly opened past courses, while
   retaining server quotas for every eventual Reviewer?
2. Should confirmation use a new, separately labelled coarse generation-duration
   estimate, or omit minutes until supported? E2 remains a saved-reviewer
   study-time estimate and cannot honestly supply generation duration.

**Commits:** `2c0a02b docs: record GA1 prerequisite contradictions`; accompanying
`docs: checkpoint GA1 unattended stop` reconciles current-state/roadmap/sprint
and this footer. Exact final commit IDs are in `tmp/overnight/GA1.status`.
The external feedback roadmap's GA1 status is also updated locally.

**Gates/counts:** forced typecheck **NOT RUN (0 tasks)**; forced lint **NOT RUN
(0 tasks)**; API/mobile/shared/web tests **NOT RUN (0 tests each)**; API/web/Android
builds **NOT RUN (0 each)** because the mandatory stop preceded implementation.
`git diff --check` and `git diff --cached --check`: **FRESH PASS, 0 whitespace
errors each** for documentation. No cached product result is claimed; no suite
was run, no product gate failure or flake occurred. Read-only discovery had
Windows wildcard/path misses, resolved by locating real paths; no private
fixture/temp output was created. All tmp files remain uncommitted.

**UNVERIFIED (owner to confirm):** deployed API/web/worker revisions, applied
migration/database rows, Cloud Scheduler state, CIT17 material/reviewer counts
and physical behavior. Local absence of the explicit intent/generation estimator
is proven from code, not inferred from missing production access.

**Owner steps remaining:** resolve the two questions and revise prerequisites;
resume GA1 STEP 1-3, fresh serial gates and scoped API/mobile/web/docs commits.
Rollout and Device checks were entirely skipped: after code acceptance, apply
any new migration via Supabase connector (filename as name), deploy API/website,
publish preview OTA, then CIT17 Generate all on realme/website: skip current
reviewers, confirm honest count/time/quota remainder, normal QD1 jobs/summary,
independent Retry and SP1/CQ1 preservation. No remote service call, remote SQL,
migration application, deployment, Scheduler action, environment-file edit, push
or file deletion occurred. GA1 remains STOPPED; no later item was started.

## SP2 preparation and Library data path — unattended local PASS (2026-10-15)

**Status: PASS for STEP 0-5, gates, docs and local commits.** Inspected baseline
`482cb6e`, expected `overnight/2026-10-15_feedback`, SP0 PASS, tracked-clean:
FRESH **3/3 prerequisites**. QD1 PASS; GA1 STOPPED independently, not required.
The full prompt/UNATTENDED rules, SP0 audit and external SP2 section were read.
No question was asked. SP1/CQ1/QD1 remain covered; no GA1 implementation or SP2b
findings 4/7/8/10/13 were added. [Acceptance](acceptance/sp2-library-data-path.md)
contains the matrix, methods, full failures and owner work; [ADR-031](../architecture/ADR-031-library-summary-projections.md)
defines the projection contract.

Re-opened current locations at the inspected baseline (line drift from SP0):

| Finding | File:line at `482cb6e` |
|---|---|
| 1 | `apps/api/src/lib/canvas-reviewer-sources.ts:414,419`; `apps/api/src/lib/canvas-preparation/admission.ts:12`; `apps/api/src/lib/canvas-preparation/client-status.ts:22` |
| 2 | `apps/api/src/lib/experience/repository.ts:31,36`; `apps/api/src/lib/experience/service.ts:55,198,236,248` |
| 5 | `apps/web/src/features/library.tsx:77` (SP1 snapshot existed, all-pages gate remained) |
| 6 | `apps/api/src/lib/experience/service.ts:78,199,239` |
| 9 | `apps/mobile/src/app-shell/AppLifecycle.tsx:40`; `apps/mobile/src/features/redesign/useLocalLibrary.ts:99`; `apps/mobile/src/services/localLibrary/librarySync.ts:90`; `apps/mobile/src/services/localLibrary/artifactStore.ts:324` |

Findings 1/2/5/6 are DONE locally. Finding 9 skips additional implementation
because both callers already use owner/version/schema-bound catch-up; stronger
regressions prove unchanged copies make zero detail requests, changed copies
make one, and only explicit owner-authenticated not-found removes a copy.
Bounds stay 300 attempts / 60 seconds. Its expensive server dependency is fixed
by finding 2. No code contradiction requiring a stop was found.

Implementation commits (all author `galaxymaxp <omgraythekid@gmail.com>`):

- `f0c7173 perf(api): project Library summaries and read exact reviewer versions`
- `eeae99b perf(api): batch revision-fenced material preparation projections`
- `6fb2d79 perf(web): publish Library pages during background refresh`
- `2092b34 fix(api): order preparation controls by their material primary key`
- `426edf3 test(api): exercise filtered exact reads through the SQL adapter`
- `14a45ae test(api): verify summary bytes and isolate preparation fixtures`
- `97a6934 fix(web): retain saved Library cards during partial refreshes`

The documentation commit contains this footer; its finalized hash and every
commit above are recorded in `tmp/overnight/SP2.status` after commit. No push.

**Before/after:** same unchanged SP0 service fixture declarations and page/JSON
accounting, real service/repository with throwing-network synthetic adapter.
Separate PGlite tests execute the views and compare previous/new results for
estimates, origin, supersession, ordering, quizzes, drafts, exact details,
ownership and past-course retention. No production timing is claimed.

| Finding / measure | Reads before -> after | DB JSON bytes before -> after | HTTP requests before -> after |
|---|---|---|---|
| 1: 100 candidates + 100 visible statuses, no receipts/controls | 700 -> 2 | 75,400 -> 4 | 1 -> 1 |
| 2: Library page / 100 cards | 18 -> 2 | 18,900,915 -> 44,277 | 1 -> 1 |
| 2: exact reviewer, freshness excluded | 11 -> 2 | 18,879,565 -> 78,702 | 1 -> 1 |
| 5: full 240-card traversal | 54 -> 6 | 56,702,745 -> 105,692 | 3 -> 3 total; **3 -> 1 before uncached cards** |
| 6: empty-material workspace | 10 -> 1 | 18,879,782 -> 221 | 1 -> 1 |
| 9: unchanged hydrated body, existing fix retained | 0 -> 0 | 0 -> 0 | 0 -> 0 detail requests |

Do not add overlapping findings' savings. Library/reviewer/workspace response
JSON remains **38,123 / 78,742 / 893 bytes**. Auth/activity's two calls, freshness,
actual material inventory, Canvas, Storage, OCR/model work and rendering are
excluded as in SP0. Nonempty visible badges add one bounded query per 100 unique
IDs. Preparation reuses loaded source evidence; its isolated repeated File probe
excludes inventory bytes, while committed tests cover 100 distinct files and 201
across complete chunks. SP1 saved snapshots render after zero network responses
before and after; partial website refresh retains unseen saved cards until a
complete walk succeeds and never persists an incomplete snapshot.

**Final serial gates — FRESH PASS:**

| Exact command | Result |
|---|---|
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 5 existing mobile + 1 existing web warnings |
| `npm run test --workspace @stay-focused/api` | 2,130 passed / 3 existing skips, 182/182 files |
| `npm run test --workspace @stay-focused/mobile` | 1,057/1,057, 110/110 files, 0 skips |
| `npm run test --workspace @stay-focused/web` | 118/118, 21/21 files, 0 skips |
| Shared tests | NOT APPLICABLE: no shared source changed |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build, 19/19 static pages, 28 routes |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 export, 1 Android bundle / 35 assets |
| `npm run build -- --force` (AUTOPILOT) | 8/8 tasks, 0 cached |
| `git diff --check`; `git diff --cached --check` | 0 errors each |

Failures/flake preserved: temp baseline CJS top-level-await transform failed
before repair; first SQL suite **4 passed/1 timeout** led to storing estimates
instead of repeated body parsing; draft typecheck **7 errors** repaired with
typed filtering and the missing existing table type; preparation fixture
**55 passed/1 failed** on missing `.neq`, then repaired. After an initial full
API PASS, a repeat hit a first-import timeout (**2,129 passed/1 failed/3 skipped**,
6.543 seconds against 5-second budget). Its synthetic formatting adapter now
avoids loading mutation/dispatch modules; all assertions and unmocked batching
proof remain. Final full API **2,130 passed/3 skipped**, no further retry. This
load-sensitive timeout flake and earlier failures are in acceptance/logs.
Vitest retains its existing future native-config warning. No live/provider or
workflow smoke ran (NOT APPLICABLE to unchanged execution boundaries).

Next build-generated `next-env.d.ts` changes were restored to the verified clean
baseline and excluded from commits. TEMP/TMP were repo-local `.local/test-temp`.
Evidence/scripts under `tmp/` stay uncommitted. Initial unrelated `UI/`,
`apps/mobile/.gitignore`, and `supabase/` remain untouched. Final owned tracked
changes are committed; local ahead/behind uses recorded refs, with no fetch.

**Decisions for the owner:** finding 11 has repo API `iad1` versus historical DB
`ap-northeast-1` / worker `asia-northeast1`; serial DB calls cross regions if live
settings match. RTT/regions remain **UNVERIFIED (owner to confirm)**. Finding 12
shares one queue/service, historically **2 concurrent tasks, 1/s**, worker
**concurrency 1, 0-2 instances**; two long preparations can occupy both slots.
Current backlog, wait, cost and quotas are **UNVERIFIED (owner to confirm)**.
Measure before choosing region, reservation/priority or separated capacity; no
queue, region, concurrency, guard, service or Scheduler setting changed.

**Owner steps remaining:** Rollout and Device checks were **entirely skipped**.
Confirm prerequisites and apply `20261015040000_experience_library_projections.sql`
via Supabase connector (filename as name), before publishing API; schedule the
generated-estimate version-table backfill appropriately and inspect live plans.
Complete pending CQ1 prerequisites where needed, deploy API/website and preview
OTA, then CIT17/realme/website checks for Library/material speed against SP0,
saved/offline content, account isolation, explicit not-found, stable open-reader
revisions, supersession, quizzes, past courses and Queue. Resolve GA1's separate
questions before resuming batch generation. SP2 ends; SP2b is separate scope.

Production/deployed revisions, database rows/applied migrations, live indexes and
plans, Scheduler state, Canvas/CIT17 counts, real speed, capacity and physical
behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote
SQL/application, environment-file edit, deployment, Scheduler action, push or
outside-repository deletion occurred.

## SP2b remaining speed findings — unattended local PASS (2026-10-15)

**PASS, local code scope only.** Baseline `41377cc` (SP2 PASS), branch
`overnight/2026-10-15_feedback`. Resume inspected the prompt (UNATTENDED first),
progress, last 15 commits, status and diff; STEP 1-4 were already committed and
were not redone. Completed the interrupted STEP 5 client work and API contract,
STEP 6, serial gates and docs. [Full acceptance](acceptance/sp2b-read-path-speed.md),
[ADR-032](../architecture/ADR-032-today-and-job-read-context.md).

Implementation commits (this footer is the documentation checkpoint):

- `7a79a3a perf(api): open Courses from stored owner inventory`
- `7dfcd13 perf(today): bundle activity reads within one verified request`
- `5cb63ad perf(web): defer Today WebGL until useful content paints`
- `8151f68 perf(api): isolate read models from document and generation imports`
- `99de167 perf(queue): share owner-scoped status and generation detail reads`
- `8db0f3b test(sp2b): reconcile Today fixtures and shared polling effects`
- `19028c5 fix(mobile): follow generation screen focus in shared job reads`

Reopened current locations after baseline line drift; paths without prefixes are
under `apps/api/src/lib`:

| Finding | Baseline inspection -> final implementation |
|---|---|
| 4 | `canvas-course-selection.ts:100`, `experience/http.ts:31` -> stored branch `:119`, parallel `storedInventory:286`, `experience/http.ts:8` |
| 7 | mobile `TodayScreen.tsx:75`, web `today-screen.tsx:80` -> `:68` / `:77`; `experience/service.ts:158`; `auth.ts:4`, `experience/task-state.ts:5` remain verified server paths |
| 8 | web `DayRingClock.tsx:13`, `DayOrb.tsx:3` -> `DeferredDayOrb.tsx:9`; mobile `DayOrb.tsx:4` unchanged |
| 10 | experience catch-all `route.ts:3,20`, `experience/http.ts:4`, `canvas-reviewer-sources.ts:1` -> catch-all `route.ts:3,17`, `experience/read-http.ts:1` and lightweight quiz/activity/Office metadata modules |
| 13 | web `queue.tsx:195`, `queue-button.tsx:12`; mobile `AppActivityProvider.tsx:10` -> jobs `route.ts:139`, `experience/service.ts:320`, shared web/mobile Queue hooks |

QD1 already shared mobile header/list polling, so that existing portion was
retained. Website's two sequential detail requests and mobile's separate detail
poller still needed fixing. No contradictory code requiring a scope change or
owner decision was found. First-ever empty Courses inventory still uses the
existing live discovery and `classificationSource: canvas`; stored inventory
reports `stored`. Existing sync reconciliation, selection and CQ1 grouping stay.

**Before/after, FRESH local deterministic evidence:**

| Finding | Before | After |
|---|---|---|
| 4: stored Courses | 1+ Canvas pages; 1 upsert; at least 5 DB ops after auth | 0 Canvas; 0 writes; 4 data reads + connection read; last 3 parallel |
| 7: Today, single-page fixture | 4 requests; 16 data + 8 auth/activity calls | 1 request; 9 distinct table reads + 2 auth/activity calls; equivalent results |
| 8: website `/today` fresh First Load JS | 320 kB | 198 kB |
| 10: dedicated Today built NFT heavy package entries | 375 PDF.js path entries | 0; 79 total trace files |
| 13: detail + header | 2 sequential detail requests plus header polling; mobile extra detail poller | 1 shared Queue/detail request and poller |

Courses/Today counts are asserted by tests; builds/logs live uncommitted under
`tmp/overnight/SP2b.*`. The preserved trace baseline has 375 entries; STEP 0's
372 shorthand is superseded by that exact file count. Mobile Three.js remains
**1,292,907 raw bytes**, not a Metro bundle contribution: no behavior-neutral
chunk deferral was established in this scope. Dedicated Today sheds native/PDF
packaging; the mixed experience catch-all still packages dynamic write assets.
Static dependency graph tests verify both read entry points avoid heavy handlers.
No cold-start or production millisecond result is claimed.

The additive `detailId` response uses one verified owner, reuses page rows and
uses one exact scoped fallback for older/past-course direct links. CQ1 exclusions
still apply to Queue lists. Extraction status, Retry/Open, persisted-result
checks, cancellation without results and account cleanup are preserved. Mobile
retained screens release/reacquire detail on focus changes; active detail/list
poll every 3/5 seconds, idle every 30, with visibility/background handling.
Legacy endpoints remain compatible. Today retains SP1 snapshots and 60-second
web polling. No new migration, service, queue, region or concurrency change.

**Final serial gates:**

| Exact command | FRESH result |
|---|---|
| `npm run typecheck -- --force` | 8/8 tasks; 0 cached |
| `npm run lint -- --force` | 8/8 tasks; 0 cached; 0 errors; 5 existing mobile + 1 existing web warnings |
| `npm run test --workspace @stay-focused/api` | 2,146 passed / 3 existing skips; 183/183 files |
| `npm run test --workspace @stay-focused/mobile` | 1059/1059; 110/110 files; 0 skips |
| `npm run test --workspace @stay-focused/shared` | 260/260; 23/23 files; includes existing emitted copies |
| `npm run test --workspace @stay-focused/web` | 121/121; 22/22 files; 0 skips |
| `npm run build --workspace @stay-focused/api` | 1/1 build; 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build; 19/19 static pages; 28 routes; `/today` 198 kB |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 export; 1 Android bundle / 35 assets |
| `npm run build -- --force` (AUTOPILOT) | 8/8 tasks; 0 cached |
| `git diff --check`; `git diff --cached --check` | 0 errors each |

Failures and attempts preserved: Step 2 focused API **117 passed / 1 failed**
(old inventory mock contract), repaired **118/118**. Step 4 focused suites
**427 passed / 1 failed / 3 skips** (tracing glob), repaired final imports **3/3**;
intermediate build's six unused-import warnings were removed. Resume Step 5
focused API **85 passed / 1 failed** (undefined fake client), repaired **89/89**.
Initial full mobile gate **1,056 passed / 2 failed**, stale separate-capability
fixtures repaired; focused interactions **58/58**, final full mobile **1059**.
Initial lint passed with three new hook dependency warnings, all repaired;
final lint retains only six existing warnings. Added a retained-screen focus
regression during final review; affected gates were rerun after it. No flaky
failure was observed. Python was unavailable before editing; used installed
Node. Existing Vitest/renderer and Metro color warnings remain in logs.

TEMP/TMP were repo-local `.local/test-temp`; final exports ran offline and
Next/Turbo telemetry was disabled. Generated `next-env.d.ts` changes were
inspected and restored to their clean baseline. Final owned changes are committed;
initial unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/` remain untouched.
No temp artifact, credential or private fixture was staged. Live provider/workflow
smoke is NOT APPLICABLE to unchanged execution/provider contracts.

**Owner steps remaining:** Rollout and Device checks were **entirely skipped**.
Confirm pending SP2/CQ1 migration prerequisites before deployment, deploy
API/website and preview OTA, then CIT17 Courses/Today speed and clock/orb/reduced
motion checks, Queue Retry/Open/extraction/detail and navigation-return updates,
saved content, account isolation and past-course grouping. Findings 11/12 remain
owner region/capacity decisions; GA1 remains STOPPED pending its separate questions.
Production revisions, live rows/applied migrations, Scheduler, Canvas inventory,
real latency/cold starts, Metro contribution and physical behavior remain
**UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/application,
environment-file edit, deployment, Scheduler action, push or outside-repository
deletion occurred. SP2b ends here; no further roadmap scope was started.

## SH1 — public reviewer snapshot links (2026-10-16)

**Status: PASS for the unattended local code scope.** STEP 0-5, tests, fresh
serial gates, documentation reconciliation and local commits are complete on
`overnight/2026-10-15_feedback`. Baseline `2ff66b0`; SP2 and SP2b status files
were PASS. SH0 and the external roadmap's SH1 section were read in full.
No code contradiction required a stop. GA1 batch generation remains excluded;
SP1/CQ1/QD1/SP2/SP2b behavior is retained. This finite SH1 run ends here.

Website and mobile owner controls create/copy/update/stop a frozen reviewer
link. Anonymous `/s/<token>` reads only the stored allow-list: reviewer text,
existing key terms, included quizzes/answers for local scoring, existing
matching assistance saved on the sharing device, attributed/licensed Wikimedia
references and numeric citations as text. It excludes account/Canvas/provider
metadata, source text, grades/tasks, course page snapshots and extracted figures.
The actual public HTTP handler has zero auth/model/write calls in fresh tests;
the public page bypasses auth/private caches, routes every AI control to sign-in
with a safe return, and scores without network/storage writes. Owner RLS,
256-bit tokens, same-link explicit updates, revocation, token rotation after
stop, soft-delete revocation and bounded best-effort IP/token limiting are
covered. Late mobile responses cannot copy/share the previous owner's link.
See [acceptance](acceptance/sh1-public-share-links.md) and
[ADR-033](../architecture/ADR-033-public-share-links.md).

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `f991d2b feat(db): store owner-isolated reviewer share snapshots`
- `cc1b502 feat(api): serve allow-listed reviewer snapshots by public token`
- `d087e09 fix(api): resolve share route test through the configured alias`
- `aa3cce8 feat(web): read shared reviewers and score included quizzes anonymously`
- `025bc1f feat(mobile): share reviewer links with copy and system sharing`
- `fe88b54 fix(db): revoke public links when a reviewer is deleted`
- `71b616b test(api): verify complete owner-bound share snapshot projections`
- `b9700e2 fix(mobile): discard late share actions after account changes`
- `bcf9ed7 fix(web): clear obsolete quiz corrections before shared scoring`
- `147db48 test(api): prove anonymous share handler has no model or write calls`
- Final `docs: close SH1 with fresh public sharing acceptance` checkpoint is
  this commit; the resolved complete commit list is in `tmp/overnight/SH1.status`.

FRESH final gates, executed serially:

| Gate | Exact result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks; 0 cached |
| `npm run lint -- --force` | 8/8 tasks; 0 cached; 0 errors / 6 existing warnings |
| API full suite | 2,166 passed / 3 existing opt-in skips; 187 files |
| Mobile full suite | 1,068 passed; 112 files |
| Shared full suite | 264 passed; 25 files, includes emitted test copies |
| Web full suite | 150 passed; 24 files |
| Standalone API build | 1/1; 34/34 generated pages |
| Standalone website build | 1/1; 19/19 generated pages; public route included |
| Standalone Android export | 1/1; 1 bundle / 35 assets |
| `npm run build -- --force` | 8/8 tasks; 0 cached; mobile 8 web / 1 Android / 1 iOS bundles |
| Diff/staged whitespace checks | 0 errors |

Additional final API typecheck/lint passed 1/1 each after the actual-handler
test was added. Initial full API was 2,165 passed / 3 skips; the final additional
boundary assertion increased it to 2,166. Focused SQL 4/4, initial SH1 API 19/19,
web 11/11, mobile 56/56 and shared link checks 2/2 passed. Subsequent full suites
include the late-owner guard and all applicable O2 scoring fixtures.

Failed first attempts are retained in acceptance: draft strict API narrowing
and emphasis type errors; focused route fixture 15 passed / 1 failed because
GET had a body; TypeScript-only test import alias error; one unsupported mobile
Copy prop; five web parser diagnostics from one malformed href template. These
were repaired and affected checks rerun. Initial lint's four new test import
warnings were removed; final six warnings predate SH1. No nondeterministic flake
observed. Vitest configuration/renderer and Metro color warnings remain in logs.
The first npm lockfile update pruned unrelated entries; only the 12-line exact
clipboard dependency addition remains. Python was unavailable; Node performed
the local lockfile cleanup.

TEMP/TMP were repo-local `tmp/overnight/sh1-temp`; logs remain under ignored
`tmp/overnight/SH1-*`. Next/Turbo telemetry was disabled, exports ran offline,
and live Quiz flags were disabled. Generated API/web `next-env.d.ts` changes
were inspected and restored. No temp output, generated bundle, credential or
private fixture was staged. Initial untracked `UI/`, `apps/mobile/.gitignore`
and `supabase/` were left alone. Provider/workflow live smoke is NOT APPLICABLE
to unchanged provider execution; remote/device work is NOT RUN by instruction.

### Owner steps remaining

Rollout and Device checks were **entirely skipped**. Apply new migrations
`20261015050000_public_reviewer_shares.sql` then
`20261015050100_revoke_deleted_reviewer_shares.sql` after canonical/SP2
prerequisites. Deploy API/website; confirm the target preview binary includes
SDK 57 `expo-clipboard` 57.0.2, or build/install a compatible preview before OTA.
Confirm the website origin (`EXPO_PUBLIC_WEBSITE_URL`, default existing documented
`https://stay-focused-ten.vercel.app`) and trusted forwarded-IP behavior.
The Vercel CLI is unavailable; installing `npm i -g vercel` is recommended for
the later owner deploy/env/log session. No Vercel CLI command ran here.

Run CIT17 sharing from both platforms, open in a private browser window, read
and take every quiz format without signing in, verify saved assistance and
Wikimedia credit/license, absent course images, sign-in returns, explicit update
with stable token, Stop sharing and deletion killing the link. Check clipboard,
native sharing, account changes and existing SP1/CQ1/QD1/SP2/SP2b behavior on the
physical device. Production revisions, applied history/live rows, Scheduler,
origin/ingress, latency and physical behavior are **UNVERIFIED (owner to confirm)**.

No clean authorized path exists to save a viewer score against another owner's
quiz after sign-in; this scope returns to the link without a write. Viewer score
ownership/copying is a follow-up. Study Assist saved exclusively on another
device is unavailable to the sharing device; cross-device synchronization is
also a follow-up. Neither gap authorizes work beyond SH1.

No remote service call, remote SQL/migration application, environment-file edit,
deployment, Cloud Scheduler action, push or outside-repository deletion occurred.

## GA1b saved course batch generation - unattended local PASS (2026-10-16)

**Status: PASS for STEP 0-3, all fresh serial gates, documentation and scoped
local commits.** Resumed the uncommitted checkpoint at `d0eb70e` after rereading
UNATTENDED rules, progress, log/status/diff, AUTOPILOT and planning evidence.
Reused GA1 audit commits `2c0a02b`/`482cb6e`; no committed product work was redone.
The owner's answers authorize saved requests and omit generation minutes.

**What changed:** owner-authenticated preview/create and pending Cancel/Retry,
source-version-unique saved requests with owner SELECT RLS/server-only mutations,
atomic membership/admission/cancellation fences, exact-current Reviewer skip,
normal quota-bound per-material jobs, and completion/global-poll recovery.
Auto off and explicitly requested past courses use this path. Preparation
failure or changed evidence ends intent without a loop; preview text never
starts generation. Mobile/web have Generate all, selection/Select all,
"Generate N reviewers", skipped titles and honest quota/capacity messages.
QD1 includes waiting requests, Cancel/Retry, normal job Retry/Open and batch
progress. Existing tokens/static controls respect Reduce Motion.

**AG1/AG2 finding:** the gap is coverage, with visibility only for admitted jobs.
`auto-reviewers/admission.ts:53` filters File/Page eligibility, `:64` requires
newer timestamp evidence, `:132` honors Auto off and `:152` baselines old
material. Limits are three/run, five/rolling day, three attempts and run budget;
mapped reviewers/preparing material are skipped. `after-sync.ts:13` excludes
past courses and `poll-trigger.ts:13` only discovers new module File/Page IDs
from complete prior evidence. Explicit saved intent fills those gaps without
changing Auto. Reviewer presence alone does not prove source freshness.

**Reuse and resume:** `canvas-preparation/orchestration.ts:107` resumes matching
requests before Auto; `notifications/canvas-poll.ts:125` recovers open requests
before current-course eligibility. Every job uses `experience/generation.ts`
and the existing transaction-serialized processing quota trigger. Timed caps
return a possible retry threshold; capacity has no promised finish time.
No new Scheduler or service is introduced. Existing Reviewer/Canvas selection,
accepted source/preparation evidence, E2 saved study estimates and SP1/CQ1/QD1/
SP2/SP2b/SH1 behavior remain intact. Full source references and acceptance matrix:
[GA1b acceptance](acceptance/ga1b-saved-course-batch-generation.md),
[ADR-034](../architecture/ADR-034-course-batch-generation.md).

**Commits:**

- `6f247f0 feat(api): persist quota-bound course reviewer batch requests`
- `2782bc3 feat(mobile): generate course reviewers with saved batch progress`
- `7a73181 feat(web): add course reviewer batches and Queue request controls`
- Accompanying `docs: close GA1b with fresh batch generation acceptance`; final
  hash and every subject are in the uncommitted `tmp/overnight/GA1b.status`.

**Gates/counts, FRESH and serial:** `npm run typecheck -- --force`,
`npm run lint -- --force`, `npm run build -- --force`: **8/8 tasks each,
zero cached**. Lint has zero errors/six existing warnings (five mobile/one web).
`npm run test --workspace @stay-focused/api`: **2,187 passed/3 existing skips,
189 files**; mobile: **1,072/1,072 in 114**; shared: **269/269 in 27**, including
existing emitted copies; web: **154/154 in 26**. Each corresponding
`npm run build --workspace` command passes **1/1**: API 34/34 static pages,
web 19/19, mobile `-- --platform android` one bundle/35 assets. Diff/staged
whitespace checks pass with zero errors. All logs use repo-local TEMP/TMP and
remain under ignored `tmp/overnight/GA1b-*`.

**Failed attempts/limits:** first typecheck 7/8 successful, one strict readonly
JSON narrowing error repaired without weakening types; mobile first full suite
1,069 passed/3 fixture failures, repaired by isolating the new child, then all
1,072 pass. Two new import-order warnings were repaired. The interrupted first
web build had no completion result; resumed build passes with exit 0.
No nondeterministic flake observed. Local path/patch discovery misses were
resolved. Generated declarations/build outputs, tmp logs, unrelated UI/,
mobile `.gitignore` and Supabase CLI temp metadata are excluded from commits.

**UNVERIFIED (owner to confirm):** production API/web/worker revisions, applied
migration history/live rows, global polling/Scheduler state, CIT17 inventory,
real latency, ingress/native compatibility and physical behavior. These are
outside unattended scope, not claims established by passing fixture tests.

**Owner steps remaining:** Rollout and Device checks were entirely skipped.
Apply `supabase/migrations/20261016010000_course_reviewer_batch_requests.sql`
via the Supabase connector using its filename as name, after preparation/quota,
CQ1, SP2 and SH1 prerequisites. Deploy API/website/Google worker as appropriate,
confirm native preview compatibility and publish OTA. Confirm existing global
poll scheduling; this run does not create/change/resume Scheduler. On CIT17,
realme and website verify Generate all/selection, exact done skip, count/skipped
confirmation, quota remainder/threshold, waiting preparation, Auto off/past-course
completion, failed preparation/Retry, pending Cancel and normal Retry/Open with
batch progress. Recheck SP1/CQ1/QD1/SP2/SP2b/SH1. The external roadmap GA1 status
is reconciled locally; no later roadmap scope is started.

No remote service call, remote SQL/migration application, deployment, email,
Scheduler action, environment-file edit, push or outside-repository deletion
occurred. The finite GA1b code endpoint is complete.


## MR1 unattended long-source reviewer recovery (2026-10-16)

**Status: PASS for STEP 0-2, fresh serial local gates, docs and scoped commits.**
Finite MR1 only on overnight/2026-10-15_feedback, baseline ed67445; no later item
was started. Bounded 12k-24k output budget (26,325 chars ->23,744), ordered
whole-block recovery after known token exhaustion, two attempts per part,
quarantined gaps with typed partial metadata and owner-reader notice, durable
receipts/reservations on every reviewer backend, and correct saved call totals.
Content filtering, legacy unknown reasons, uncertain outcomes, cancellation,
source grounding, auth/RLS/isolation and SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b are preserved.

Commits:

- 747ea4d fix(engine): recover truncated reviewers with ordered source parts
- 7c226ed fix(api): resume reviewer parts with counted provider transfers
- 307000e fix(reviewer): disclose partial generation on mobile and web

Documentation closure: this commit, subject
"docs: close MR1 with fresh long-source reviewer acceptance"; final hash in
uncommitted tmp/overnight/MR1.status. All commits use the requested author.

FRESH gate counts: forced typecheck/lint/root build 8/8 tasks each, zero cached;
API 2,206 passed / 3 existing skips in 191 files; mobile 1,072/1,072 in 114;
shared 272/272 in 28 (includes emitted copies); web 154/154 in 26; engine 606
passed/0 failed evaluations; AI-first unit 20/20 in 3; provider contract 20/20.
Standalone API/web/Android builds 1/1 each, 34/34 and 19/19 static pages, one
Android bundle/35 assets. Zero lint errors/six existing warnings. Diff and staged
checks pass with zero whitespace errors. test:workflow NOT APPLICABLE: no test
files in the configured workflow-tests tree; common durable paths are tested
in the API suite and Next builds 16 workflow steps/one workflow.

First attempts are retained in [acceptance](acceptance/mr1-long-source-reviewer.md):
temporary engine config launch failed before collection (bad module path), and
the extra standalone provider-contract gate failed before assertions because a
new engine runtime barrel import broke Node resolution. The provider keeps its
existing safe error boundary; engine-side recognition fixed the contract gate
to 20/20. Final serial suites/builds reran after repair. No assertion failures or
nondeterministic flakes. Python was unavailable before an editing command wrote
anything; Node completed the edits. [ADR-035](../architecture/ADR-035-long-source-reviewer-split.md)
records the decision. External 2026-10-16 MR1 roadmap and all three planning files
were reconciled; only the original unrelated untracked UI/, mobile .gitignore
and supabase/.temp/ remain. Generated Next ambient files were restored.

The supplied production checkpoint proves incomplete output but omitted its
reason; output exhaustion is an inference, not recovered production evidence.
The original reason/token usage, deployed revisions, applied database state,
Scheduler state, production latency and physical behavior are **UNVERIFIED
(owner to confirm)**. Code provenance with file:line is in acceptance.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Deploy
API and Google worker; distribute website/mobile code for the safe partial
notice. Then re-upload the SOC SCI 103 midterm reviewer PDF as manual material on
the realme and website, inspect completeness/source order, and check Canvas,
partial notice, Queue/cancellation and preserved features. No migration is added
by MR1; existing prior rollout prerequisites remain owner steps. No Scheduler
creation/change/resume. No remote service/provider call, SQL/application, email,
environment-file edit, deployment, push or deletion outside the repo occurred.
This MR1 run ends here.


## SA1 Study Assist unattended handoff (2026-10-16)

Status: **PASS for STEP 0-5, fresh serial gates, documentation and local commits.** Organized answers share one safe parser across mobile, website and saved public snapshots. Prompt versions and cache keys change to v2; retained v1 text stays valid, and SH1 exact-content checks admit both known versions only. Presses reveal loading, completions reveal their answer unless user scrolling/newer intent suppresses it, Reduce Motion jumps, and What is this? is first of exactly four Ask chips. Test Me structure, grounding/length limits and prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1 behavior are preserved.

Commits:

- `ad92609 feat(shared): add safe study answer format and reveal intent`
- `5bcf15e feat(api): organize study answers and preserve share compatibility`
- `051c649 feat(mobile): reveal and format study assist answers`
- `5041c1d feat(web): reveal and format study assist answers`

Documentation closure: this checkpoint; final hash is recorded in tmp/overnight/SA1.status (no self-amend required).

Gate counts: **FRESH** typecheck/lint/root build 8/8 each, 0 cached; API 2,208 passed/3 existing skips (191 files), mobile 1,082 (115), shared 296 (30, includes emitted copies), web 164 (27); standalone API/web/Android builds 1/1 each, 34/34 and 19/19 static pages, 1 Android bundle/35 assets; diff/staged whitespace checks 0 errors. Six existing lint warnings, zero errors. Engine tests **NOT APPLICABLE** (unchanged). Failed first attempts: forced typecheck 5/8 (React fixture unknown props); API 2,203 passed/4 failed/3 skips (SH1 hardcoded v1); mobile 1,064 passed/18 failed (two old harnesses missing native frame global). All repaired and rerun green. Earlier focused parser/cache-key and test-selector draft failures are recorded in the [acceptance report](acceptance/sa1-study-assist.md); no nondeterministic flake observed.

Production revisions, live database/Scheduler state, actual provider formatting, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks are skipped entirely. Coordinate API/website and compatible preview OTA publication for v2 prompts, then tap Explain and verify immediate loading/answer reveal, bulleted answers, first Ask chip, manual-scroll suppression, Reduce Motion and website focus/keyboard on realme and website. No service call, deployment, migration application, Scheduler change, environment-file edit or push occurred. No tmp files, generated output, credentials, private fixtures or owner untracked files are committed. SA2 remains separately scoped; SA1 stops here.


## SA2 Ask about an image unattended handoff (2026-10-16)

Status: **PASS for STEP 0-4, fresh serial gates, documentation and local commits.** Image-reference Ask fetches owner/current-section bytes on the server for snapshots, figures and stored Wikimedia visuals; no client bytes/URLs. Three MiB raster cap, section text, title/attribution, honest grounding and SA1 organized answers/reveal/session caching are retained. All inline/zoom controls open the existing Ask panel with a thumbnail, the exact four static chips, typed questions and two follow-ups. Offline controls are disabled with the existing message. Shared visuals route to sign-in with the original return link and zero model calls. Existing SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1 behavior remains covered; no later item was started.

Commits:

- 3a03e34 feat(shared): add image references to Study Tools Ask
- 1e46ee3 feat(api): resolve owner images for vision study answers
- 99ba4f7 feat(mobile): open image questions in Study Assist
- c886fec feat(web): add image questions to reviewer surfaces

Documentation closure: this checkpoint; final hash is recorded in tmp/overnight/SA2.status and Git history (no self-amend).

Gate counts: **FRESH** forced typecheck/lint/root build 8/8 each, 0 cached; API 2,226 passed/3 existing live skips in 192 files; mobile 1,086 in 115; shared 324 in 34 (includes emitted copies, rerun after build; pre-build 322/33); web 168 in 28; provider contract 20/20. Standalone API/web/Android builds 1/1 each, 34/34 and 19/19 pages, one Android bundle/35 assets. Diff/staged whitespace checks 0 errors. Zero lint errors/six existing warnings. Engine/workflow suites **NOT APPLICABLE** (unchanged). Rollout/Device checks **NOT RUN**, skipped entirely.

Failed first attempts are preserved in [acceptance](acceptance/sa2-ask-about-image.md): initial typecheck 6/8, three mobile state-field errors; focused API 169 passed/1 failed (snapshot id assertion); mobile 52 passed/2 failed (old offline assertions); web 35 passed/1 failed (React test selector); first full API 2,225 passed/1 failed/3 skipped (pre-render id assertion). All repaired and rerun green, including full API after final prompt wording. Focused final API 170/170 before streaming-cap addition, mobile 57/57, web 39/39. No nondeterministic flake observed. Python was unavailable before edits, so Node was used. Existing Vite future-config and test-renderer deprecation warnings remain.

[ADR-036](../architecture/ADR-036-ask-about-image.md) records owner-scoped service-client retrieval, reference identity, cap and grounding. Private buckets/locator columns remain server-only, with explicit owner/current-source/citation checks. The baseline Study Tools route has a 20/minute warm-instance guard but no durable quota/cost ledger; SA2 preserves that path rather than claiming a new ledger. No migration, dependency, native module or worker change. The external roadmap and all three current planning files are reconciled. Generated Next ambient files are restored. Original untracked UI/, apps/mobile/.gitignore and supabase/.temp/ are untouched; no tmp, generated artifacts, credentials or private fixtures are committed.

Production revisions, live database/applied migrations, Scheduler, actual provider interpretation, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Coordinate API/website and compatible preview OTA publication for the v3 contract. On a reviewer with a page snapshot, figure and Wikimedia image, check inline/zoom Ask, What is this?, What does it mean?, Explain the parts, Why is it in this lesson?, typed questions/two follow-ups/repeat cache, grounding and organized answer reveal, manual scroll/Reduce Motion, offline disabled controls and shared-link sign-in return with zero viewer AI calls. Preserve prior rollout prerequisites. No remote service/provider call, SQL/migration application, deployment, Scheduler action, email, environment-file edit, push or deletion outside the repo occurred. MR2 remains separate; this finite SA2 run ends here.


## 2026-10-16 MR2 unattended closure - PASS locally

Status: **PASS for MR2 STEP 0-3, fresh serial gates, reconciled docs and local commits.** Manual PDF/photo/DOCX/PPTX picks now go directly through upload, extraction and reviewer generation under one job ID, with the existing Queue/generation screen. Paste is unchanged. Office uses the shared bounded extractor and expected ZIP parts at the Canvas cap; legacy DOC/PPT has conversion copy. Empty Office files are verified through the actual worker to fail with the exact message, zero generation calls and no result completion. Existing page/OCR/character bounds, quotas, owner checks, leases, immutable retries, cancellation and MR1 split/replay remain.

Commits:

- 36f19a1 feat(shared): define manual Office upload policy
- 9e42184 feat(api): chain manual file extraction into reviewer jobs
- 15c351d feat(mobile): create reviewers immediately from picked files
- e96c6be feat(web): create reviewers directly from manual uploads

Documentation closure is this checkpoint; its final hash and all five commits are recorded in tmp/overnight/MR2.status and Git history (no self-amend).

Gate counts: **FRESH** forced typecheck/lint/root build **8/8 each, zero cached**. API **2,257 passed / 3 existing live skips** in 197 files; mobile **1,098/1,098** in 117; shared **334/334** in 36 including emitted copies (pre-build 329/35); web **176/176** in 29; provider contract **20/20**. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets; API compiler 18 steps / 1 workflow. Diff and staged whitespace checks: zero errors. Six existing lint warnings, zero errors. Engine suite **NOT APPLICABLE** (unchanged). Dedicated workflow runtime command with --passWithNoTests exited 0 with zero sources: **NOT APPLICABLE**, not runtime acceptance; the five mocked workflow orchestration tests pass inside the API suite. Rollout/Device checks **NOT RUN**, skipped entirely.

[Acceptance](acceptance/mr2-manual-reviewer-upload-chain.md) records exact initial failures and repairs: package type unions/accessibility, forced typechecks 6/8 then 7/8, a short retry fixture key (16 passed/1 failed), workflow import (one failed suite), and the first full mobile gate (1,096 passed/2 failed) followed by an upload-envelope fixture correction (14 passed/1 failed; then 15/15). All affected final gates are fresh and green. No nondeterministic flake observed. [ADR-037](../architecture/ADR-037-manual-reviewer-upload-chain.md) records the job-chain/database contract. The PGlite harness uses PostgreSQL sha256 as its pgcrypto digest shim, not remote Supabase. The external MR2 roadmap was updated outside the checkout; all three repository planning files are reconciled. Generated Next ambient files were restored. Owner-untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched; no tmp/generated/credential/private-fixture artifact is committed.

Production API/website/worker revisions, live database rows/applied migrations/catalog, Scheduler, actual provider behavior, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks skipped entirely. Apply the forward-only migration **20261016000100_manual_reviewer_uploads.sql**; coordinate API, website, Google worker and compatible preview OTA publication. Then device-check DOCX/PPTX straight from file to reviewer, photo straight to reviewer, PDF page/blank accounting, Queue/progress, reconnect after 202, empty-file and legacy conversion messages, cancellation and paste parity. Preserve prior rollout prerequisites. Vercel CLI is not installed; for the owner's later rollout, installing it with `npm i -g vercel` is strongly recommended for env pull/deploy/logs. No remote Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL/migration application, Scheduler action, deployment, email, environment-file edit, push or deletion outside the repo occurred. IM1 remains separate; this finite MR2 run ends here.

## IM1 unattended checkpoint - STOPPED (2026-10-16)

**Status: STOPPED at STEP 0**, baseline c74d94f on overnight/2026-10-15_feedback; SA2 and MR2 status files both PASS. SDK 57-compatible expo-media-library 57.0.5 requires full read/write authorization for iOS album lookup/creation. IM1 requires write-only authorization plus the Stay Focused album. Both the current and legacy native implementations enforce the conflicting requirement. Per the UNATTENDED STOP rule, no later code step was performed. Inspection-only dependency/lockfile edits were reverted; no app code, native plugin, migration or dependency addition is committed.

**Exact question for the owner:** May IM1 request full photo-library access on iOS so it can save to the Stay Focused album, or should this slice explicitly limit named-album saving to Android and keep iOS save behavior deferred?

**Share root cause:** no Android-specific hide branch or canonical-ID loss was found. Server summaries normalize generation aliases to artifact: IDs, and device copies preserve them. The eager expo-clipboard import resolves a required native module at import time, so an older APK missing ExpoClipboard is a plausible cause; installed APK contents and physical diagnosis remain **UNVERIFIED (owner to confirm)**. Guarded clipboard loading/system-share fallback is still pending after the STEP 0 stop.

**Commits:** no implementation commits. This footer, acceptance evidence and reconciled planning files form the local documentation checkpoint, planned subject: docs: record IM1 permission contradiction and unattended stop. Its resulting hash is written to tmp/overnight/IM1.status and IM1.progress after commit, following the repository convention against self-referential commit hashes. The external roadmap IM1 status is also updated.

**Gate counts:** FRESH git diff --check and git diff --cached --check: 0 whitespace errors (verified immediately before commit). Typecheck, lint, API/mobile/shared/web suites and API/web/Android builds: **NOT RUN**, 0 tasks/tests/builds executed, because the run stopped before implementation. No test flake or failed test attempt. npm package inspection succeeded; an unavailable Python cleanup command made no changes, then Node restored the two dependency files. Initial PowerShell source-search glob errors were corrected. No passing historical SA2/MR2 suite is claimed as IM1 evidence.

**Owner steps remaining:** resolve the exact question, then resume STEP 1?4, add the native module ADR and complete all fresh serial gates. **Rollout and Device checks were skipped entirely:** new preview APK (clipboard + media-library native modules), website publication, then realme gallery saves for snapshot/figure/Wikimedia and Android Share/offline/denial/settings/clipboard-fallback checks. Deployed revisions, live database/applied migrations/Scheduler/provider state and real gallery/device behavior are **UNVERIFIED (owner to confirm)**. No Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL, migration application, deployment, Scheduler action, environment-file edit, email or push occurred. Existing owner untracked paths were left alone; no later roadmap item was started.

Full file:line inventory and native-source evidence: [IM1 acceptance](acceptance/im1-image-save-share.md).


## IM1b unattended local completion (2026-10-16)

**Status: PASS for code STEP 0-4, fresh serial gates, documentation and local commits.** Reused IM1 STEP 0 evidence at b972c5e; branch overnight/2026-10-15_feedback and SA2/MR2 PASS were confirmed with a clean tracked baseline. Owner answered the previous permission STOP. Mobile/shared implementation is **1959a0e feat(mobile): save reviewer images and guard native sharing**; website is **d8544f9 feat(web): download owner reviewer images from zoom viewers**. This footer and reconciled docs form the final docs checkpoint, subject **docs: close IM1b local image save and share acceptance**; its exact resulting hash is in tmp/overnight/IM1b.status/progress (no self-referential hash amendment).

Save is in each existing owner zoom viewer beside Ask. SDK-compatible media-library 57.0.5 uses write-only photo permission; Android direct named-directory creation saves into Stay Focused without a read-permission lookup, while iOS saves add-only directly into Photos with no album calls. Cache/download checks and cleanup precede insertion; denial offers Open settings. Mobile/web share safe title/section/kind names, adding Wikimedia source title and attribution/license confirmation. Shared pages gain no private Save control. ADR-038 records permissions, platform difference and APK requirement.

**Share root cause:** there is no Android hide branch or canonical-ID loss in supported owner online/device-copy paths. Eager expo-clipboard native loading was a plausible missing-module failure in an older APK, not a confirmed device diagnosis. Guarded lazy import handles module evaluation failure, copy rejection and false; both Share link and Copy use the system sheet fallback with **Link ready to share**, retaining the visible link. SH1 owner/server-ID gating and offline device-copy notice/disabled state remain. No prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2 behavior is intentionally changed.

**Gate counts (all FRESH, serial commands):** npm run typecheck -- --force **8/8, 0 cached**; npm run lint -- --force **8/8, 0 cached, 0 errors, 6 existing warnings**; npm run test --workspace @stay-focused/api **2257 passed / 3 existing live skips, 197 files**; mobile **1119 passed, 120 files**; shared **337 passed, 37 files including existing emitted copies**; web **179 passed, 30 files**. npm run build --workspace @stay-focused/api **1/1, 34/34 pages**; web **1/1, 19/19 pages**; mobile -- --platform android **1/1, 1 bundle / 35 assets**. AUTOPILOT npm run build -- --force **8/8, 0 cached**. git diff --check and git diff --cached --check **0 whitespace errors** at commit checkpoints. TEMP/TMP were repo-local; validation logs/artifacts are uncommitted under tmp/overnight.

**First attempts preserved:** focused mobile 50 passed/5 failed (missing Download icon in an existing mock), then 81 passed/1 failed (new assertion stringified circular React props). First full mobile 1117 passed/1 failed (new system-share mock returned undefined instead of its Promise contract); corrected full pass 1118, then final false-return coverage yields 1119. First lint introduced test import-order warnings; corrected closure has only six existing warnings. Installed native-source review avoided Android album lookup's read requirement. Unrelated npm lock churn was removed. Some PowerShell glob-based read searches required directory-scoped retries; no mutation resulted. No nondeterministic test flake. Focused web 32/32 and shared filename 3/3 also passed. Full suite/build results are distinct from production/device acceptance.

**UNVERIFIED (owner to confirm):** deployed revisions, installed APK contents, actual photo permissions/gallery behavior, iOS behavior, physical Share diagnosis, live database/applied migrations/Scheduler and providers. No Supabase/Vercel/Google Cloud/Canvas/Resend call, remote SQL, migration application, deployment, Scheduler action, environment-file edit, email or push occurred. No new migration; no later roadmap item started. Owner untracked UI/, apps/mobile/.gitignore and supabase/.temp/ were left alone. Root planning files and external IM1 roadmap are reconciled; historical IM1 STOP evidence is retained and superseded by the owner answer.

**Owner steps remaining:** **Rollout and Device checks were skipped entirely.** Build/install a new preview APK containing expo-clipboard and expo-media-library (OTA alone cannot add native modules), publish the website, then check on realme: page snapshot/figure/Wikimedia saves reach Stay Focused, attribution, Share visibility, offline disabled copy, denied permission/Open settings and missing-clipboard fallback. Verify iOS uses only add-only permission and Photos without an album/full-access prompt. Prior slices' separate rollout debt remains unchanged.

Evidence: [IM1b acceptance](acceptance/im1b-image-save-share.md), [ADR-038](../architecture/ADR-038-reviewer-image-gallery-saving.md), [original IM1 STEP 0](acceptance/im1-image-save-share.md).

## RT1 topic levels and Expound complete locally (2026-10-16)

**PASS for unattended RT1 STEP 0-4, fresh serial gates, docs and local commits.** Each mobile/website topic has compact Original / Simplify / Explain simply controls and collapsible Expound. Canonical content stays unchanged; Original is immediate and has no model action. Server-read, owner-scoped sections feed source-only SA1 formatted answers and grounding labels. Persistent owner/exact-content caches support offline reuse; uncached controls show the existing offline reason. Reading choices last only for the session; canonical search restores Original. Shared snapshots remain unchanged, so shared topic controls route to sign-in and make no model calls.

Study Tools' existing 20/minute warm-instance admission and provider configuration are reused. New bounded server dedup/cache is per warm instance (400 entries / 30 minutes), not a durable global quota/cache. Context is capped at 18,000 characters without truncation; results at 6,000 characters. No migration, dependency or native module is added. All prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2/IM1b local regressions remain green.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,268 passed / 3 existing live skips** (199 files), mobile **1,129** (122), shared **345** (39 including existing emitted copies), web **188** (32). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Repaired first attempts are recorded in acceptance; no nondeterministic flake. Implementation commits: **959424e**, **d0db258**, **dc4f381**, **06b9385**, **f1b09f1**, **ba81163**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and compatible preview update, then check topic levels, instant Original/cache switching, organized Expound/collapse, offline, canonical search, manual scrolling/Reduce Motion and shared sign-in routing on realme. Predecessor IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual provider output, live database/applied migrations/Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at RT1; LS1/RB4 were not started.

[Acceptance](acceptance/rt1-topic-levels.md); [ADR-039](../architecture/ADR-039-topic-level-study-tools.md).

Commits:

- 959424e feat(shared): define section topic levels and cached assistance
- d0db258 feat(api): generate owner-scoped cached topic explanations
- dc4f381 test(shared): verify topic cache and Original contracts
- 06b9385 test(api): verify topic isolation caching and admission
- f1b09f1 feat(mobile): add cached topic levels and collapsible Expound
- ba81163 feat(web): add topic levels Expound and shared sign-in controls

The docs closure commit is this entry’s containing commit; its final hash is recorded in tmp/overnight/RT1.status. See acceptance for exact commands, gate evidence, repaired first attempts and owner-only remaining checks.

## 2026-10-16 LS1 Library sorting - unattended PASS

Status: **PASS for code STEP 0-3, fresh serial gates, documentation and local commits**. Shared deterministic sorts, owner-scoped synced Canvas sourcePosition, per-device sort/open history, and compact accessible mobile/browser controls are complete. Pins stay first; sorting uses loaded summaries and never refreshes. No migration, dependency or native module added.

Commits: d027f2b (shared), 45c6d19 (API), 451eabb (mobile), c5f1f6b (web). This documentation closure commit is recorded after creation in tmp/overnight/LS1.status; no push.

FRESH: npm run typecheck -- --force, npm run lint -- --force and npm run build -- --force each **8/8 tasks / 0 cached**; tests --workspace @stay-focused/api **2,280 passed / 3 existing live skips / 200 files**, @stay-focused/mobile **1,136 / 123**, @stay-focused/shared **358 / 41 including emitted copies**, @stay-focused/web **195 / 34**. Standalone API/web/Android builds **1/1 each** (35/35 pages, 19/19 pages, 1 Android bundle / 35 assets). Diff/staged checks FRESH exit 0. Zero lint errors, six existing warnings. All repaired failures/counts and one interrupted run are preserved in [LS1 acceptance](acceptance/ls1-library-sorting.md); no nondeterministic flake. [ADR-040](../architecture/ADR-040-library-sort-orders.md). Generated ambient declarations restored; owner untracked UI/, apps/mobile/.gitignore and supabase/.temp/ untouched. No remote service call, deploy, remote SQL/migration application, env-file edit, Scheduler action, email or push occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Publish API/website and compatible preview update, then validate Library/course orders, Canvas positions, pins, reviewer/quiz/draft recently-opened changes and restart persistence on mobile and browser. Older summaries fall back to unpositioned creation order until refreshed. LS1 has no native/migration addition; inherited IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual synced positions, database/applied migrations, Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No next slice/RB4 was started.


## INT1 unattended local integration - PASS (2026-10-17)

Finite scope: INT1 STEP 0-3, fresh serial gates, docs and local commits. Branch overnight/2026-10-15_feedback; initial HEAD a967460, 35 local commits beyond ed67445. Fetch github succeeded first try; PR #12=8fcdf16, main=ed67445, visual-readiness=f3dd833; merge-base ed67445. Tracked tree was clean; owner's UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved.

Commits: efad5c9 (merge PR #12); 979f120 (only f3dd833, -x); 2ddb9a8 (combined proof); 21e685a (exact PR #12 grouping test restored); closing docs: close INT1 commit contains this footer (exact final hash is in Git and ignored tmp/overnight/INT1.status). All authors galaxymaxp <omgraythekid@gmail.com>; no push.

Merge conflicts: LibraryScreen.tsx and LibrarySortControl.tsx take PR #12's mobile behavior; mobile/web listPreferences.ts use identical PR #12 DTOs; useListPreferences.ts retains PR #12 callbacks plus initial-hydration protection; screens.test.ts is the unchanged PR #12 suite. docs/current-state.md and docs/roadmap.md keep both histories with current local-combination status; current_sprint auto-merged both histories. Cherry-pick conflicts: ExternalVisual.test.ts combines existing Ask/Save tests and diagnostic redaction coverage; all three current planning docs retain their integrated versions. Nonconflicting release acceptance history is retained. Full per-path account is in acceptance.

Library decision: PR #12 wins: pill beside update status; compact selected 48-point rows; all six exact options/values mirrored by one website select with contextual filtering; owner/course preferences, complete/offline cached material sequences, unlinked work last, Sort disabled during selection, alphabetical displayed cleaned course titles. Removed LS1 separate sort/open logic and unused sourcePosition server field/projection/tests. Stored prefs from either line parse safely. Other MR1/SA1/SA2/MR2/IM1b/RT1 behavior remains, including first What is this? and image Ask across both platforms. f3dd833's figure heartbeat/15-second read, redacted diagnostics and included cold-notification fixes remain.

FRESH gate counts: root forced typecheck/lint/build 8/8 each, zero cached; shared 350/350 (40 files); API 2,268 pass + 3 existing live skips (199); mobile 1,202/1,202 (130); web 203/203 (35); Canvas 75/75 (1); OCR 27/27 (3); engine 606/606 evaluations, zero failures. Lint zero errors/six existing warnings. API/web pages 35/35 and 19/19; Android/iOS/web exports, 68 assets. Generated next-env.d.ts files restored. FRESH diff and staged-diff hygiene pass. Root gates tested production code at 2ddb9a8; subsequent test-only restoration 21e685a has fresh mobile typecheck/lint/full tests. Database tests NOT APPLICABLE (no script). No CACHED acceptance claim.

Failed attempts retained: preliminary typecheck 5 successful/8, zero cached, failed on in-progress stale LS1 references/missing hook; repaired 8/8. Website focused attempt 14 pass/2 fail (new tests used hidden identities), corrected to displayed titles then 16/16. Full mobile first attempt 1,201 pass/1 fail (old LS1 grouping contract), restored exact PR #12 test then 1,202/1,202. Extra EOF blank fixed before merge. Initial python alias/writer launch errors made no edits; Node writers succeeded. Existing Vite CommonJS/configLoader warning remains. No nondeterministic flake observed. Ten initially audited PR #12 files plus restored libraryPresentation now all match PR #12; focused image/Ask mobile 81 and web 32 tests passed. No validation artifacts, credentials or private fixtures committed.

UNVERIFIED (owner to confirm): PR #12 CI green at 8fcdf16/run 39035996757 and Realme OTA are supplied historical evidence; live CI was not queried. Nothing beyond the reported Realme OTA is deployed. Deployed API/web/worker revisions, actual provider/device behavior, database rows/applied migrations and Scheduler are unverified. Only git fetch contacted a remote; no Supabase/Vercel/Google/Canvas/Resend call, remote SQL, migration application, deploy, environment-file edit, Scheduler action, email or push occurred.

**Owner steps remaining:** Rollout and Device checks skipped entirely; finish later roadmap slices before RB5 owner release/device acceptance. The old codex-fullsend-20261016.md is untouched. INT1's external roadmap status and current-state/roadmap/sprint are reconciled; EV1 and later items were not started. No unanswered owner decision blocks this completed code scope. Acceptance: docs/ai/acceptance/int1-local-integration.md. Progress/status/logs are ignored under tmp/overnight/INT1*.

## EV1 unattended mobile external references - PASS (2026-10-17)

Status: PASS for the finite unattended EV1/N2 code scope: STEP 0-2, fresh serial gates, documentation and local commits. Branch overnight/2026-10-15_feedback; baseline 2bf02f8. The expected untracked UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved. No later roadmap item, including IM2, was started.

Commits: 239a0ab test(mobile): reproduce missing external references; a9c1d7f fix(mobile): match website external reference visibility. Closing docs: docs: close EV1, the commit containing this footer (final hash in Git and ignored tmp/overnight/EV1.status). All authors galaxymaxp <omgraythekid@gmail.com>; no push.

Root cause in code: mobile coupled external visibility to source discovery and snapshot eligibility instead of displayed source URLs, with a batch-wide parser failure capable of hiding every valid reference. Snapshot/figure components now report actual inline images; the reader uses that state for precedence without waiting for a snapshot probe. A malformed section is omitted without discarding validated peers or cancelling batch polling. The exact EXTERNAL_VISUAL_LABEL, attribution and EXTERNAL_IMAGE_HEADERS remain, along with strict URL/license/dimension/attempt validation, owner/auth/offline guards, source-first behavior, bounded batch polling and explicit replacement. Temporary reviewer.* runtime/load diagnostics were removed. Caption visibility and image viewer behavior are unchanged. No API/web/shared code or serializer, migration, dependency or native module changed.

FRESH gate counts: forced root typecheck/lint/build 8/8 each, zero cached; mobile 1,209/1,209 tests in 130 files; focused reproduction regression 87/87 in 5 files; standalone API and Android builds 1/1 each. API/web builds generate 35/35 and 19/19 pages; Android export one bundle/35 assets; root Android/iOS/web exports include 68 assets. Lint has zero errors/six existing warnings. Diff and staged-diff hygiene PASS. Generated Next declarations restored. API/web/shared tests NOT APPLICABLE (unchanged workspaces/serializers). No CACHED acceptance claims.

Failed attempts: deliberate red reproduction at 239a0ab had 7 failed/80 passed in 4 failing/1 passing files, then 87/87 green after the fixes. Every verification gate passed on its first gate attempt; no nondeterministic flake was observed. The unavailable Python launcher during doc preparation was replaced with Node. Existing Vite configLoader/CommonJS and Expo color-environment warnings remain. Full STEP 0 candidates, serializer comparison and acceptance matrix: docs/ai/acceptance/ev1-mobile-external-references.md. Logs/progress/status are ignored under tmp/overnight/EV1*; no validation output or private fixture is committed.

UNVERIFIED (owner to confirm): deployed revisions, actual stored visual rows, applied migrations, database/Scheduler state, provider/image egress and physical-device root cause. The offline code evidence proves display/parser failures; it cannot establish which occurred on Realme. No deployment, remote service/SQL call, migration application, environment-file edit, Scheduler action, email, fetch or push occurred.

**Owner steps remaining:** Rollout and Device checks were skipped entirely (NOT RUN). Publish the reviewed mobile fix through the owner's normal release flow. RB5 on Realme: open a reviewer section without a course image and with a found Commons visual; verify the image, exact external label and attribution, then confirm source-image precedence and offline behavior. Confirm actual deployed versions and the live state listed above. No unanswered owner question or approval request blocks this completed code-only slice. Stop at EV1; IM2 and later work remain untouched.

## RX1 unattended reviewer header - PASS (2026-10-17)

Status: PASS for RX1/N3 STEP 0-2, fresh serial gates, documentation and local
commits. Baseline 7d503dd after INT1 and EV1, branch
overnight/2026-10-15_feedback. Initial tracked tree was clean; expected untracked
UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. This run ends
at RX1; no later roadmap slice was started.

Commits: 0ce5db6 feat(mobile): put reviewer Export and Share in one row;
docs: close RX1 is the closing commit containing this footer (final hash in Git
and ignored tmp/overnight/RX1.status). Both use the required author
galaxymaxp <omgraythekid@gmail.com>. No push.

Chosen layout is the explicit prompt order: title -> equal-width secondary
Export/Share row -> review-time/topics metadata -> Generate Quiz hero -> hint.
Generate Quiz retains its primary styling. ReviewerHeader is used by the live
reader and tested with the actual Action/Copy/Share trigger against inert native
hosts. Optional Action wrapper style and ShareReviewerMenu triggerStyle preserve
the menu, owner key, offline state, clipboard fallback and sharing behavior.
Export fills the row for non-artifact IDs. Both targets stay at least 48 points;
font scale below 2 keeps one row, 2+ stacks full-width buttons. Labels have no
line limit or fixed height. Source text and accessibility defaults are unchanged;
focus order is Export then Share. No dependency, native module or migration added.
Website already places Share, Save to file and Generate Quiz in div.row with
display:flex, so STEP 2 requires no website change or web test.

FRESH serial gate counts:

- npm run typecheck -- --force: 8/8 tasks, zero cached on retry.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing
  warnings (five mobile import-order warnings, one web unused useMemo).
- npm run test --workspace @stay-focused/mobile: 1,216/1,216 tests, 131/131 files.
  Header/Share/missing-clipboard suites have 14 tests, including seven new header
  cases; the initial focused run also passed 14/14 in 3 files.
- npm run build --workspace @stay-focused/api: PASS, 35/35 pages.
- npm run build --workspace @stay-focused/mobile -- --platform android: PASS,
  one Android bundle and 35 assets.
- npm run build -- --force (AUTOPILOT.md): 8/8 tasks, zero cached; API/web pages
  35/35 and 19/19, Android/iOS/web exports with 68 assets.
- git diff --check and git diff --cached --check: PASS. Generated API/web
  next-env.d.ts changes inspected and restored. No CACHED acceptance claim.

First failed gate attempt is retained: forced typecheck exited 2 with 7/8 tasks
successful, zero cached, one mobile test-only TS2322. The test fixture inferred
string metadata and rejected null; ComponentProps<typeof ReviewerHeader> fixes
the fixture without weakening production types. Fresh retry passed. All later
gates passed on their first attempts. No nondeterministic flake observed. Existing
Vite configLoader/CommonJS and Expo color-environment warnings remain. Web/API/
shared tests are NOT APPLICABLE because those workspaces did not change. Final
gates tested the exact code tree committed at 0ce5db6; later edits are docs only.
Full acceptance: [RX1 report](acceptance/rx1-reviewer-header.md). Planning files
are reconciled; logs/progress/status remain ignored under tmp/overnight/RX1*.

UNVERIFIED (owner to confirm): deployed revisions and physical narrow-screen,
large-font and screen-reader behavior. Native-host render assertions establish
the layout contract, not measured Yoga/device acceptance. No deployment, remote
service/SQL call, migration application, environment-file edit, Scheduler action,
email, fetch or push occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Release the reviewed
mobile change through the normal owner flow. RB5 on Realme: open a reviewer and
confirm Export/Share are equal buttons directly under the title, metadata follows
the row and Generate Quiz remains primary. Verify narrow/320 dp and large-font
layout, Export-before-Share focus order, existing export/share behavior, offline
Share disabling and full-width Export for non-artifact reviewers. Confirm the
actual deployed revision. No unanswered owner question blocks local closure.


## IM2 unattended reviewer images (2026-10-17)

Status: **PASS for the finite unattended IM2/N4 code scope, fresh serial gates,
documentation and local commits.** Baseline 1a9d3f9 after INT1/EV1/RX1; branch
overnight/2026-10-15_feedback. Initial tracked tree was clean. Expected untracked
UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved. Endpoint is IM2;
no later roadmap slice was started. The referenced overnight roadmap file was
missing locally; the full prompt supplied the scope without a code contradiction.

Commits (author galaxymaxp <omgraythekid@gmail.com>, no push):

- 93dea65 feat(mobile): show image details on opening the viewer
- 13833e9 feat(mobile): scroll and pull down to close image viewers
- 11fb0ee feat(web): reveal image details in scrollable dialogs
- 739d80b test(mobile): retain reader contracts with the shared image viewer
- 311cc58 fix(mobile): isolate image touches from the reader scrubber
- docs: close IM2 is the documentation commit containing this footer; final
  hash is in Git and ignored tmp/overnight/IM2.status.

Chosen reveal pattern: **opening an image reveals its details inside the viewer**
on every mobile/web surface; no Details toggle. Grounding labels stay visible.
External title, credit/Own work, license, Commons/source and legal-license link
are hidden before opening and directly reachable when open. Thumbnail accessible
names and 48-point mobile targets remain; Ask/Save keep exact targets, attribution,
headers, permission policy and offline behavior. Source precedence remains intact.

Mobile shares a full-screen ImageViewer Modal with scrollable image/details/actions.
ZoomablePage retains pinch/double-tap/bounded pan, permits native scroll takeover
at zoom 1, and keeps zoomed pans away from dismissal. A downward gesture starting
at top/zoom 1 closes at 120 dp, or at least 24 dp with velocity >=0.9 dp/ms.
Pinch, upward/horizontal intent, leaving the top, cancellation and stale flick
velocity prevent dismissal. All raw touch phases stop before reaching the reader
edge scrubber. Android back/Close remain available; Reduce Motion removes Modal
animation, translation and spring. Web dialog and enlarged image scroll at all
slider zooms; native Esc is unprevented, Close/backdrop close, and close clears
details. Bounds/target checks preserve clicks inside the content and padding.
No dependency, native module, API/schema/migration or provider change.
[ADR-041](../architecture/ADR-041-reviewer-image-viewer.md) records the pattern.

FRESH final serial gates, tested code 311cc58:

- npm run typecheck -- --force: 8/8 tasks, zero cached.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing
  warnings (five mobile import-order, one web unused useMemo).
- npm run test --workspace @stay-focused/mobile: 1,239/1,239 tests, 133/133 files.
- npm run test --workspace @stay-focused/web: 204/204 tests, 35/35 files.
- npm run build --workspace @stay-focused/api: PASS, 1/1 build, 35/35 pages.
- npm run build --workspace @stay-focused/mobile -- --platform android: PASS,
  1/1 export, one Android bundle and 35 assets.
- npm run build -- --force (AUTOPILOT): 8/8 tasks, zero cached; API/web 35/35
  and 19/19 pages; Android/iOS/web exports, 68 assets.
- git diff --check, git diff --cached --check and full task diff: PASS.
  Generated API/web next-env.d.ts changes inspected and restored.

Failed attempts retained: focused mobile 49 passed/1 failed (old always-visible
attribution expectation), web 3 passed/1 failed (React children array comparison),
root lint 7/8 tasks (new test's react/no-children-prop), full mobile 130 passing
files/3 import failures with 1,186 collected tests passing (native safe-area context
needed stubs). All repaired within scope. StudyAssistSheet's attribution assertion
now checks hidden text; all source precedence/discovery/offline assertions remain.
SourceFigures permits responder takeover at zoom 1 and rejects it when zoomed.
Retries passed; no nondeterministic flake observed. A preliminary all-green cycle
was repeated after the explicit touch boundary; final acceptance uses no cached
results. Existing Vite CommonJS/config-loader and Expo color-env warnings remain.
API/shared tests NOT APPLICABLE (unchanged). Preparation tool/path errors and the
full matrix are in [IM2 acceptance](acceptance/im2-reviewer-images.md). Planning
files are reconciled. Logs/progress/status are ignored under tmp/overnight/IM2*.

UNVERIFIED (owner to confirm): deployed revisions, native/browser interaction,
physical gesture arbitration/accessibility, DB rows/applied migrations and Scheduler
state. Local native-host assertions and native dialog semantics are not physical
or real-browser acceptance. No deploy, push, fetch, remote service/SQL call,
migration application, environment-file edit, Scheduler action or email occurred.

### Owner steps remaining

Rollout and Device checks were skipped entirely (NOT RUN). Release the reviewed
mobile/website changes using the normal owner flow; IM2 adds no native module,
while inherited IM1b still needs its compatible native gallery baseline. RB5 on
Realme: caption/details only after tap; external-reference/course grounding always
visible; license/source links directly reachable; tall content/actions scroll;
pull-down only at top and zoom 1; pinch/double-tap/zoomed pan; Android back/Close;
Reduce Motion; no viewer interaction with reader edge swipe/scrubber; Ask/Save.
Website: confirm scrolling at all zoom levels and Esc/Close/backdrop dismissal.
Confirm deployed revisions. No unanswered owner question blocks local closure.


## WG1/N5 unattended website Generate layout - PASS (2026-10-18)

Status: **PASS for the finite local code scope**. STEP 0-2, tests, fresh serial
gates, documentation and local commits are complete on
`overnight/2026-10-15_feedback`; baseline fdf1937 includes required 1a9d3f9.
Only the three allowed unrelated untracked paths were present and are retained.

Commits:
- ace4cb2 fix(web): repair Generate layout and course options
- f485a2f test(web): check Generate layout at five viewport widths
- docs: close WG1 (the documentation commit containing this footer; its final
  hash is recorded in tmp/overnight/WG1.status).

Generate search and connection link wrap; header actions clear the title;
breadcrumb links/current text truncate on one line; batch controls use shared
button sizing and pane padding; row cards stretch equally; detail metadata wraps.
Generate/Canvas share a secondary Course options disclosure, with aria-expanded,
Escape returning focus, outside pointer/focus dismissal and the unchanged move
request. Open popovers do not change card height; Canvas list overflow permits
its final popover action to remain clickable.

Sync status choice: **CanvasRefreshStatus below the heading** is the single
in-flight message while global refresh runs. A per-course busy button retains
its spinner, disabled and aria-busy state, without duplicate Syncing text. Local
sync text is visible when global refresh is idle. No transport/polling, selection,
auth, API, mobile, dependency, schema or migration semantics changed.

FRESH final gates, serial, code f485a2f:
- npm run typecheck -- --force: 8/8 tasks, zero cached.
- npm run lint -- --force: 8/8 tasks, zero cached; zero errors, six existing warnings.
- npm run test --workspace @stay-focused/web: 209/209 tests, 37/37 files.
- npm run build --workspace @stay-focused/api: 1/1, 35/35 pages.
- npm run build --workspace @stay-focused/web: 1/1, 19/19 pages.
- npm run build -- --force (AUTOPILOT): 8/8 tasks, zero cached; API/web
  35/35 and 19/19 pages, Android/iOS/web exports and 68 assets.
- git diff --check and git diff --cached --check: PASS.

FRESH focused render/batch tests: 8/8 (3 files), retaining course-batch.test.ts.
FRESH local Playwright: 20/20 Generate/course/material/Canvas viewport checks at
1440, 1024, 768, 390 and 360 px; 10/10 mocked existing move-course requests;
170 intercepted API requests, zero unexpected requests/runtime errors. Distinct
text-control intersections, horizontal page scroll, equal card heights, button
padding/height, stable disclosure geometry, Esc/outside click, aria-expanded,
single sync and final Canvas popover clickability pass. Screenshots/report/logs
are ignored under .local/wg1/; rerun: node apps/web/scripts/wg1-layout-check.mjs.

Failed first attempts retained: focused render 2 failed/6 passed (Next Link
needed a Node-renderer mock); isolated web typecheck TS2769 (test callback
returned boolean). Two initial browser runs stopped after one passed check on
same-heading font-range false positives; checker now compares distinct text
nodes and clips actual overflow bounds. All repaired before final gates, with
no nondeterministic flake. Python launcher was unavailable for an edit attempt;
Node applied the edits. No final gate failed. Generated API/web next-env.d.ts
changes were inspected and restored. Existing Vite notice/lint warnings remain.
API/mobile/shared unit tests NOT APPLICABLE (unchanged).

UNVERIFIED (owner to confirm): deployed revision, owner phone/browser acceptance,
live DB rows/applied migrations and Scheduler state. Referenced overnight roadmap
file is missing; complete WG1 prompt supplies scope without a code contradiction.
No remote Supabase/Vercel/Google/Canvas/Resend call, deployment, SQL/migration
application, environment-file edit, Scheduler change, email or push occurred.
All browser API/auth responses were fictional and intercepted; fallback origins
are loopback. No question blocks local closure. Planning files are reconciled.
See [WG1 acceptance](acceptance/wg1-generate-layout.md).

### Owner steps remaining

**Rollout and Device checks skipped entirely (NOT RUN).** Owner reviews/publishes
the website through the normal release flow, confirms the deployed revision and
performs RB5 Generate at narrow phone-browser and resized desktop widths. Check
search/link wrapping, breadcrumb/action separation, batch controls, course cards,
Course options on Generate/Canvas, detail metadata and single sync progress.
This run ends at WG1; no later roadmap task was started.


## FX1 unattended checkpoint ? STOPPED (2026-10-18)

**Status: STOPPED during STEP 0, before application edits.** FX1's unattended
rule 3 requires a stop if code contradicts a prompt assumption. The proposed
format/size explanation says the server stores original Commons files, but
`commons.ts:73` already selects `info.thumburl`, line 75 uses thumbnail
dimensions and line 91 requests 1200 px thumbnails. Existing tests assert raw
SVG/oversize/foreign-host rejection and thumbnail-host normalization. This is
code evidence, not proof that the device failure has been fixed. Both reported
FULLSEND failures remain unresolved; no root cause is claimed.

**Commits:** fetched expected `github/main` 0d7bfed and merged it without
conflicts as **cb4df08** ? `merge: bring fullsend 2026-10-18 release fixes from main`.
The subsequent `docs: record FX1 diagnostic stop` checkpoint contains this
footer and reconciled current state/roadmap/sprint/FULLSEND acceptance. Its
actual hash is recorded in `tmp/overnight/FX1.status` and Git history after
commit, rather than recursively embedded here. Both use author galaxymaxp
<omgraythekid@gmail.com>. No push. Unrelated UI/, apps/mobile/.gitignore and
supabase/.temp/ remain untracked and untouched.

**FRESH verification:** post-merge `npm ci` exit 0, **1,488 packages added,
1,497 audited** with repo-local TEMP/TMP. npm reported **33 advisories
(11 moderate, 22 high)** and deprecation warnings; no dependency repair was
attempted. Documentation `git diff --check` and staged diff check pass
(exit 0). Gate counts: **0/7 application commands run**; forced root
typecheck/lint/build and shared/API/mobile/web suites are each **NOT RUN**
because the mandatory earlier STOP overrides them. No test counts or fresh
application acceptance are claimed. No test flake observed; suites did not run.
First documentation-edit attempt could not start because Python is unavailable;
the Node.js retry succeeded. No application checks failed.

**Evidence and UNVERIFIED:** source-figure and snapshot image bytes use
600-second signed storage URLs, with no bearer header needed for those bytes;
external bytes use the allow-listed Commons image plus the stale 2.1.0
User-Agent. Save hides HTTP/MIME/empty/module/native exceptions; its native
write is awaited before cleanup. Android's current initial-file album path and
iOS add-only decision are recorded in ADR-038. Actual failed HTTP response,
stored historical image URL shape, native exception and APK module resolution
are **UNVERIFIED (owner to confirm)**. `adb devices` found no phone; the
requested read-only log dump waited for a device and was interrupted, yielding
**zero records, BLOCKED**. This absence is not the STOP reason. Live deployed
revision/database/Scheduler state is **UNVERIFIED (owner to confirm)**. No
Supabase/Vercel/Google Cloud/Canvas/Resend request, remote SQL, migration,
Scheduler action, deployment, email or environment-file edit occurred. The
requested 2026-10-17 roadmap file was not found; no replacement was invented.

**Exact owner question:** Given that current Commons selection already requests
bounded thumbnails and stores thumburl, should FX1 resume under a revised scope
that investigates the actual failed image response and save failure stage,
preserves ADR-038's write-only/add-only permission constraints, and changes
image selection or the Android media path only when evidence supports it?

### Owner steps remaining

Resolve that scope question, complete STEP 0 and both repairs, then execute
all tests and fresh serial gates. **Rollout and Device checks were skipped
entirely (NOT RUN).** After a reviewed JS/TS repair, run the preview-update
preflight before separately authorized OTA to runtime 2.2.0-sdk57, plus API
deployment if applicable. A native change needs a new APK with deliberate
versionCode 7 (preview autoIncrement is false). On Realme, recheck saving
figures, page snapshots and external images, plus external card/viewer loading.
FULLSEND browser, overflowing-viewer and suitable-source Office checks remain.

[FX1 file:line evidence and hypothesis verdicts](acceptance/fx1-image-diagnosis.md).


## FX1b unattended repair — 2026-10-18

## FX1b image repair complete locally (2026-10-18)

**PASS for the finite unattended code scope; device acceptance remains pending.**
Owner's revised FX1b scope supersedes the earlier diagnostic STOP. Commons
already selected bounded thumbnails from its first implementation; no legacy
conversion is needed. New GIF candidates are skipped. The native User-Agent
uses expo-constants/app config (currently 2.2.0) and the existing contact URL.
Mobile and web external-image failures retain the viewer and display
Image couldn't load, Retry and Open on Commons; safe failure logs contain no URL.

Save returns/logs typed permission, download, HTTP-status, MIME, empty-file,
media-write and missing-module stages with specific messages. Source saves
refresh signed URLs through existing bearer-protected reads after permission,
match the exact figure/snapshot identity, and fail safely if it changed.
SDK 57 explicitly supports the current Android initial-file album call, so
ADR-038's Android write-only and iOS add-only paths remain; cleanup follows
the awaited native write. These fixes do not establish the actual phone exception.

**FRESH final gates:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; shared **350/350** (40 files), API **2273/2273** (199 files, 3 existing live skips), mobile **1263/1263** (134 files), web **211/211** (37 files); zero test failures. All seven application gates
ran serially with repo-local TEMP/TMP. Diff and staged-diff hygiene PASS.
Lint retains six existing warnings. First lint attempt failed on a new web
JSX apostrophe (5/8 tasks complete, one error); fixed and the serial sequence
restarted. Focused mobile first attempt had 141 pass/1 fail from an invalid
test fixture; corrected, then 142/142 passed. First full mobile run had 1,243
passing tests and two failed suites (132 passing files) because indirect imports
needed an expo-constants Node mock; fixed before restarting the final sequence.
No nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Publish reviewed JS/TS changes and the GIF API rule, then recheck figure,
snapshot and external saves plus external card/viewer rendering on Realme.
ADB evidence is BLOCKED (zero devices); actual native cause/module resolution,
failed image/response and production/database/Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deployment, SQL, migration,
Scheduler action, email, environment-file edit or push occurred. The absent
2026-10-17 roadmap file was skipped; unrelated untracked work is preserved.
This run ends at FX1b; FULLSEND's other live checks remain pending.

[FX1 diagnosis and FX1b outcome](acceptance/fx1-image-diagnosis.md).


### Commits

```text
37fcd16 fix(api): serve raster Commons thumbnails for external visuals
dfbf466 fix(mobile): save images through fresh owner reads and report failure stage
a10642b fix(mobile): show retry when an external image fails
```

The final docs: close FX1 commit contains this footer; its post-commit hash
is in tmp/overnight/FX1b.status and Git history. Author galaxymaxp
<omgraythekid@gmail.com>; branch overnight/2026-10-15_feedback; no push.
Existing merge cb4df08 and dependency install were not repeated. Read-only
fetch confirms github/main 0d7bfed. Unrelated UI/, apps/mobile/.gitignore,
supabase/.temp/ preserved. Runtime/build/native configuration is unchanged.

**Evidence:** Commons already chose thumburl (original hypothesis closed);
new GIF exclusion commons.ts:78-81, dynamic native User-Agent
services/externalVisuals.ts:9, retained card/viewer failure states
ExternalVisual.tsx:18-23,39-51 and section-visual.tsx:59-62,145-170.
saveImage.ts:25-78 adds stage-only diagnostics and awaits writes before cleanup;
SourceFigures.tsx:95 and SourcePageSnapshot.tsx:129 refresh expirable URLs
via existing owner-scoped reads, requiring the same accepted image identity.
Installed SDK source explicitly supports initialAssetLocalUri
(src/legacy/MediaLibrary.ts:768-815, Android MediaLibraryModule.kt:155-170,
albums/CreateAlbum.kt:50-66); Android media path stays as ADR-038 specifies.
Local legacy imports and forced bundle export pass; APK contents and actual
device exception/HTTP response remain **UNVERIFIED (owner to confirm)**.

### Owner steps remaining

**Rollout and Device checks — NOT RUN, skipped entirely.** Run mobile preview
preflight before an authorized OTA to 2.2.0-sdk57; publish API GIF filtering and
website error state. Recheck Save for a figure, page snapshot and external image,
and external card/viewer rendering on Realme, plus iOS add-only Photos saving.
No native change was required; any later native release must deliberately
advance versionCode from 6 (preview autoIncrement is false). Complete remaining
FULLSEND browser/overflow/Office-source checks. Production revisions/database/
Scheduler/native causes are UNVERIFIED; zero ADB devices means log evidence is
BLOCKED. No deployment, remote service/SQL, migration, Scheduler, email,
environment-file edit or push occurred. The dated roadmap is absent and skipped.
Finite FX1b endpoint reached; no later roadmap work started.

## WG2/N6 unattended handoff - PASS (2026-10-18)

**Status: PASS for the finite code scope.** Baseline `b750224`, branch
`overnight/2026-10-15_feedback`; WG1 `653e8d8` verified as an ancestor. Completed
STEP 0-2, tests, fresh serial gates, docs and local commits. Initial tracked tree
was clean; only the allowed untracked UI/, apps/mobile/.gitignore and
supabase/.temp/ remain. The referenced overnight roadmap is absent (also noted
by WG1/FX1b); the full prompt supplies scope without a code contradiction.

Rows now show Reviewer ready in the existing meta line and accessible name for
the same server `reviewerArtifactId` mobile uses. Detail has primary Open
reviewer with the encoded Library artifact route, secondary confirmed Remake,
the exact requested confirmation copy and Ready fact. Cancel/Escape focus
return, owner/material identity, busy locking, retained saved reading on failure
and retry are covered. Generate without a Reviewer and Quiz remain unchanged.
Acceptance/return/focus revalidate existing resources, including saved later
material pages. No API, shared DTO, mobile, dependency, schema or migration change.

**generating state per material: not available from existing data**. General
ProcessingJobStatusView/source metadata/GenerationView have no material ID;
sourceVersionId is a different identifier. Optional batch requests map only
batch submissions and cannot establish the latest arbitrary direct remake.
The authorized fallback shows saved Reviewer state, without guessing by title.

**Commits**, author `galaxymaxp <omgraythekid@gmail.com>`:

- `0eaffa9 feat(web): show saved Reviewer state on Generate`
- `bb2395f test(web): cover generated Reviewer actions and refresh`
- `docs: close WG2` is the closing documentation commit; its final hash and all
  run commits are recorded in ignored `tmp/overnight/WG2.status`.

**Final gates, all FRESH and serial**, tested application tree committed above:

- `npm run typecheck -- --force`: PASS, **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: PASS, **8/8 tasks, 0 cached**, zero errors and six
  existing warnings (five mobile import-order, one web Library unused import).
- `npm run test --workspace @stay-focused/web`: PASS, **224/224**, **38/38 files**;
  includes 13 WG2 regressions and unchanged WG1/course-batch tests.
- `npm run test --workspace @stay-focused/shared`: PASS, **350/350**, **40/40 files**.
- `npm run build --workspace @stay-focused/api`: PASS, **1/1**, **35/35** pages.
- `npm run build --workspace @stay-focused/web`: PASS, **1/1**, **19/19** pages.
- AUTOPILOT `npm run build -- --force`: PASS, **8/8 tasks, 0 cached**;
  API/web **35/35** and **19/19** pages; Android/iOS/web exports, **68 assets**.
- `git diff --check` and `git diff --cached --check`: PASS.

First typecheck failed with TS18046 in the new focus node mock, exit 2,
**4 successful/6 scheduled tasks, 0 cached**; fixed using an explicit props
type guard. Its rerun passed 8/8. First lint failed on the test's inline
children prop, exit 1, **5 successful/8 tasks, 0 cached**, one new error and one
existing web warning; fixed with a typed props fixture and restarted the serial
gates. Focused development tests passed **20/20**, then **21/21** after adding
Quiz coverage. No nondeterministic flake or skipped test in the required suites.
Existing Vite CommonJS/config-loader and build color-environment notices remain.

API/mobile unit suites and provider/workflow/live tests: NOT APPLICABLE to the
unchanged paths, NOT RUN. Logs/progress/status are ignored under tmp/overnight/.
Inspected and restored generated Next ambient declarations; no generated
artifacts, credentials or private fixtures are committed. Root export used
EXPO_OFFLINE=1; build telemetry was disabled.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Publish the reviewed
website change and perform RB5 Generate for Reviewer ready / Open reviewer /
confirmed Remake on phone and resized desktop. Deployed revision, live owner
acceptance, database and Scheduler state remain **UNVERIFIED (owner to confirm)**.
No remote service call, deployment, SQL/migration application, Scheduler action,
email, environment-file edit or push occurred. Unrelated work is preserved.
Finite endpoint WG2 reached; WV1/MD1 and other later work were not started.

Acceptance: [WG2 generated Reviewer state](acceptance/wg2-generated-reviewer-state.md).


## WV1/N7 unattended reviewer image load - PASS (2026-10-18)

Status: **PASS** for STEP 0-5, mocked tests, fresh serial gates, docs and local
commits on `overnight/2026-10-15_feedback`, baseline `7112770` (includes
`653e8d8`). Website
and mobile load all cached reviewer image URLs in one owner-scoped `/figures`
response on open. Bulk snapshot discovery checks the exact original once and
never renders. Missing snapshots use a three-request queue with read-only
bounded polling; source-image errors share one signed-URL refresh. Website
reserves image boxes, eagerly loads the first two images, and lazily loads the
rest with async decoding. IM2 Ask/Save/details, source priority, owner isolation
and offline/identity guards remain. Legacy routes are compatible; no migration
or dependency change.

Synthetic fixture: **7 -> 2 metadata requests**, first course URL **2 -> 1
sequential responses**; unrendered page **3 -> 2** with mocked immediate
completion. Earliest URL including stored external remains **1 -> 1**.
Production speed is unverified.


**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; API **2283/2283** (201 files, three existing live skips),
web **227/227** (39 files), shared **362/362** (42 files),
mobile **1269/1269** (135 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; mobile Android export **1/1**.
Root build also exports Android/iOS/web. Six existing lint warnings remain.
Shared's default result includes emitted tests; the separate source-only run
is **FRESH PASS, 181/181 tests in 21 files**.
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

Local implementation commits:

- 3d54f97 feat(api): batch owner-scoped reviewer image discovery
- e5c1165 perf(web): load reviewer visuals on open
- 32a1714 perf(mobile): load reviewer visuals with the reader
- docs: close WV1 (this documentation/handoff commit; final hash in `tmp/overnight/WV1.status`).

First full API run: 2,281 pass, 1 fail, 3 live skips; corrected old route mock.
Next full mobile run: 1,246 pass, 22 fail across three reader files; corrected
old hook mocks and replaced obsolete scroll gating with offscreen propagation
coverage (focused 52/52 PASS). Initial type/fixture and preload-path failures
are also retained in acceptance. Final suites have zero failures. No flake
observed. Baseline exact fixture was reproduced from Git under ignored tmp,
1/1 PASS; no duplicate baseline code or generated validation artifact is staged.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Owner RB5: deploy
reviewed API/web and measure website image load speed on a real reviewer.
Publish the mobile change and verify cached/pending images, expired signatures,
offline behavior and IM2 controls on device. Deployment revision, production
rows, actual speed, device behavior and Scheduler state are **UNVERIFIED
(owner to confirm)**. No remote service call, deploy, remote SQL/migration,
Scheduler operation, email, environment-file edit or push occurred. Local
gate children blocked non-loopback sockets; live-test switches and telemetry
were disabled. Unrelated UI/, mobile .gitignore and supabase/.temp are preserved.
The absent overnight roadmap is recorded; the complete WV1 prompt supplied
scope. The finite endpoint is WV1; no later task was started.

Acceptance: [WV1](acceptance/wv1-reviewer-images.md).
ADR: [ADR-042](../adr/ADR-042-reviewer-visuals-single-load.md).

## OI1 unattended offline reviewer images - PASS (2026-10-18)

Status: **PASS** for STEP 0-8, tests, fresh serial local gates, docs and local
commits on overnight/2026-10-15_feedback, baseline 181c4b6. Recovery reread the
UNATTENDED rules, progress and Git state. All OI1 implementation was still
uncommitted; no committed FX1b/WV1 work was repeated. FX1b 37fcd16, dfbf466,
a10642b and b750224 are ancestors. Both code-level STOP conditions were absent:
the offline reviewer store and fresh owner-scoped image reads already exist.

Saving reviewer text now schedules images automatically without a gallery tap.
Private document files use stable owner/artifact/version keys, a SQLite v9
manifest, temporary-file validation/moves and a two-download background queue.
Failed work resumes with persisted backoff after restart. Text remains readable
through failures. Local snapshots, figures and external references retain their
labels and attribution. Readiness counts all non-capped images; bytes include
stored images. Reading-order caps are 40 MiB per reviewer and 500 MiB app-wide,
with one Some images need a connection line. Removal, explicit supersession,
replacement, authenticated source denial, clear and sign-out invalidate previews;
generation guards reject late publication. Failed discovery does not establish
deletion. Manual gallery saving and its tests remain. No new native dependency,
API, server auth/RLS or remote migration. **PAR1:** website has no offline mode;
website offline work is NOT APPLICABLE.

### STEP 0 inspection anchors

These file:line references describe the final implementation. Paths are relative
to the repository root. The existing text body remains
library_artifacts.payload_json; image files and manifest rows follow its lifecycle.

- `apps/mobile/src/features/reviewer/saveImage.ts:26` and `:51`: permission,
  lazy legacy filesystem download and manual gallery save; shared validation is
  `apps/mobile/src/services/studyImageFile.ts:14`. Fresh exact snapshot/figure
  owner reads are extracted at `studyImageFile.ts:32` and `:39`.
- `apps/mobile/src/features/reviewer/SourcePageSnapshot.tsx:14`, `:56`, `:134`:
  batch/local URI input and fresh snapshot read for manual save;
  `apps/mobile/src/features/reviewer/SourceFigures.tsx:44`, `:58`, `:98`: batch/local
  figures and fresh exact figure read. `apps/mobile/src/features/reviewer/ExternalVisual.tsx:14`,
  `:17`, `:54`: batch/replacement URI, local preference and attributed gallery
  save. Offline external URLs come from the same owner-scoped combined GET.
- `apps/mobile/src/services/localLibrary/artifactStore.ts:40`, `:47`, `:230`:
  OfflineStats, LocalArtifactStore and image-aware offlineReady. `:308` / `:511`
  save the body and initialize its manifest. `:474` handles a newer summary;
  `:359`, `:400`, `:415` own remove, clearBodies and purgeOwner cleanup.
- `apps/mobile/src/services/localLibrary/schema.ts:100`: appended v9 table;
  `:111` derives the schema version. Existing migrations are unchanged.
  `apps/mobile/src/services/localLibrary/localArtifactDatabase.ts:12`, `:32`:
  lazy SQLite open/migrate and sign-out drain/purge;
  `apps/mobile/src/services/localLibrary/localArtifactDatabase.web.ts:7`: no web store.
- `apps/mobile/src/services/localLibrary/offlineCatchUp.ts:41`, `:86`: startup
  catch-up and queue stop; `apps/mobile/src/services/localLibrary/librarySync.ts:41`,
  `:115`: reconciliation and post-text notification;
  `apps/mobile/src/services/localLibrary/deviceLibrary.ts:15`: schedules images
  through onDetailStored. Existing `apps/mobile/src/app-shell/AppLifecycle.tsx:40`
  triggers catch-up after session restore/foreground.
- `apps/mobile/src/features/redesign/useLocalLibrary.ts:88`: reads stats and
  subscribes to changes; `apps/mobile/src/features/redesign/LibraryScreen.tsx:190`,
  `:393`: offline caption and accessible Saved offline state;
  `apps/mobile/src/features/redesign/libraryPresentation.ts:18`: All N items
  caption consumes the updated image-aware counts.
- `apps/mobile/src/features/settings/OfflineStorageSettings.tsx:55`: stop work
  before clearBodies; `packages/shared/src/image-download.ts:1`: unchanged
  StudyImageDownload contract. New queue/cache entry points are
  `apps/mobile/src/services/localLibrary/offlineImageQueue.ts:11` and
  `apps/mobile/src/services/localLibrary/offlineImages.ts:63`.

### Commits and verification

- `c78e4b5 feat(mobile): save reviewer images with offline library`
- `docs: close OI1` is the closing docs/handoff commit; the final hash and both
  run commits are recorded in ignored tmp/overnight/OI1.status.

Author: galaxymaxp <omgraythekid@gmail.com> via --author. No push.
Final application tree: **c78e4b5**. All following gates are **FRESH**, serial:

- `npm run typecheck -- --force`: PASS, **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: PASS, **8/8 tasks, 0 cached**, six existing warnings
  (five mobile import-order and one web unused import), zero errors.
- `npm run test --workspace @stay-focused/shared`: PASS, **362/362**, **42/42 files**.
- `npm run test --workspace @stay-focused/mobile`: PASS, **1301/1301**, **137/137 files**;
  includes unchanged saveImage tests, actual SQLite reopen, queue/concurrency,
  caps, cleanup, readiness and three local-image component regressions.
- `npm run test --workspace @stay-focused/api`: **NOT APPLICABLE**, unchanged API.
- AUTOPILOT `npm run build -- --force`: PASS, **8/8 tasks, 0 cached**; API
  **35/35** and website **19/19** pages; Android/iOS/web exports.
- `npm run build --workspace @stay-focused/api`: PASS, **1/1**, **35/35** pages.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  PASS, **1/1 Android export**.
- `git diff --check` and `git diff --cached --check`: PASS.

First attempts are retained in acceptance: focused **93 pass / 6 fail**, then
**75 / 1**, corrected **137/137**; first mobile **1288 pass / 5 fail** across
four failed files, corrected focused **81/81**; early strict-type fixture
diagnostics **3, 3, 1**; final-review typecheck **7/8 tasks** with one TS18049,
then fixed. Two final regressions increased mobile from 1299 to 1301. A shared
run that overlapped lint was repeated serially. No nondeterministic flake.
Existing Vite CommonJS/config-loader and build color notices remain.

On recovery, one root-build invocation was deliberately aborted (exit 1, no
final task counts) to restore the previous non-loopback socket blocker and
Expo-offline/Turbo-telemetry flags. No provider operation was observed during
that invocation; remote activity/state was not verified. The passing resumed
builds use the blocker, offline flags, disabled telemetry and repo-local TEMP/TMP.
Logs are ignored under tmp/overnight/OI1.gates; generated Next ambient changes
were inspected/restored. No generated artifact, private fixture or credential
is committed. Unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain.

### Owner steps remaining

**Rollout and Device checks - NOT RUN, skipped entirely.** Publish reviewed
mobile changes through the existing update process; no new native module or
versionCode change is required by OI1. Save a reviewer with snapshots, figures
and an external reference; use airplane mode, reopen and restart; verify all
saved images and attribution. Replace/remove the reviewer and clear/sign out;
confirm storage drops and previews disappear. Gallery copies remain independent.
Deployed/native revision, live database rows, Scheduler and physical results
are **UNVERIFIED (owner to confirm)**. No live provider check, deployment,
remote SQL/migration, Scheduler action, email, environment-file edit or push
was performed. The finite endpoint is OI1; no later task was started.

Acceptance: [OI1](acceptance/oi1-offline-reviewer-images.md).
ADR: [ADR-043](../adr/ADR-043-offline-reviewer-images.md).

---

## MR3 unattended failed-generation recovery - PASS (2026-10-18)

**Status: PASS for STEP 0-5, tests, requested local gates, docs and local
commits.** Baseline `73bafb1`, branch `overnight/2026-10-15_feedback`; WG2
`0eaffa9 bb2395f 7112770` and FX1b `37fcd16 dfbf466 a10642b b750224` are present.
Mobile Generation/Canvas/Queue and website Generation/Queue now offer Try again
for safe generation failures, show the persisted stage in plain words and say
Your material is safe. Stored extraction/source/version/settings are reused,
without a new upload/OCR when resolved. Duplicate taps are fenced; accepted
attempts get fresh keys, including a mounted original mobile Queue card.
Typed 409/422 rejection removes the action despite stale polling. Source checks,
quotas, automatic retry policy, source validation and cancellation remain.

**NEW MIGRATION FILE - OWNER APPLICATION REQUIRED BEFORE ROLLOUT:**
`packages/db/migrations/20261018000100_failed_generation_retry.sql` only replaces
the retry function and restates its restricted grant. It does not backfill or
update existing rows. Historical safe Reviewer/Quiz generation failures can
retry despite stored retryable=false. Deleted/unavailable document, Canvas and
Quiz Reviewer sources are denied even if immutable text survives. No migration
was applied remotely; local PGlite verification used synthetic, in-memory data.

### STEP 0 file:line record

- `apps/api/app/api/jobs/[jobId]/retry/route.ts:38` key validation; :45 live
  retry lookup; :48 same-key source recheck; :55 Quiz capacity 422; :59 retry;
  :66 dispatch; :78 non-retryable 409. `apps/api/src/lib/processing-jobs/repository.ts:270`
  calls retry_processing_job; :313 projects safe historical failure eligibility.
- Original copying/eligibility:
  `packages/db/migrations/20260723084329_reusable_processing_assets.sql:1562`
  (failed + retryable, same-key replay/conflict, source snapshot/version and
  contract copy). New function :48 checks source ownership, :125 admits the
  exact failed generation codes/stages, :185-186 copies the same source IDs.
  Resolved manual text short-circuits at
  `apps/api/src/lib/processing-jobs/manual-reviewer-source.ts:24`; resolved
  Canvas PDF/composite metadata also skips extraction. No source reuse rewrite.
- `apps/api/src/lib/processing-jobs/ai-reviewer.ts:49` emits generation_failed
  for contract/coverage failure. Reviewed every fail call in `operations.ts`:
  :114/:749/:878 forward WorkerJobError policy; :149/:166 PDF validation false;
  :236 Quiz generation only true, capacity false; :263 Activity false (outside
  MR3); :341 incomplete inspection true; :412 OCR limit false;
  :489 extraction-specific policy; :691/:810 incomplete extraction only true;
  :712/:819 empty text false; :840/:869 Canvas preparation false;
  :882 Reviewer generation only true after MR3; :913 interrupted true except
  cancellation; :998 forwards known policy. Local worker classification:
  `apps/api/src/lib/processing-jobs/processor.ts:501` (manual generation retry,
  same automatic policy); legacy validation at :513. Google dispatch and worker
  `apps/api/src/lib/processing-jobs/google-cloud.ts:131` and :164-168 remain true,
  with automaticRetryable unchanged.
- `apps/mobile/src/features/redesign/GenerationScreen.tsx:128` canRetry;
  :129 retryFailed; :204 stage; :207 action; :226 failed notice.
  `apps/mobile/src/features/courses/CanvasSourceReviewerScreen.tsx:1433`
  retries with a fresh key and lock; :2479 stage; :2505 action;
  :2510 non-retryable secondary path. `apps/mobile/src/features/queue/QueueContents.tsx:155`
  submits retry; :256 stage; :259 Try again. Aligned copy:
  `apps/mobile/src/services/experienceApi.ts:35`.
- `apps/web/src/features/queue.tsx:57` Queue retry policy; :183 label;
  :221 Generation canRetry; :283 stage/safe-material copy; :361 label.
  Real enum: `packages/db/src/types.ts:449`. Shared mapping/predicate:
  `packages/shared/src/processing-job-recovery.ts:1`.
  Before/after failure-code table and complete evidence:
  [MR3 acceptance](acceptance/mr3-failed-generation-retry.md) and
  [ADR-044](../adr/ADR-044-failed-generation-retry.md).

### Commits

- `84ab171 feat(shared): describe failed generation recovery`
- `71f3d25 fix(api): retry failed generation from stored sources`
- `55d4eb0 feat(web): try again on failed generation`
- `cb36f82 feat(mobile): try again on failed generation`

Author on every commit: `galaxymaxp <omgraythekid@gmail.com>`. Documentation
closure: `docs: record MR3 recovery and owner steps`; its final hash is in local
Git history and `tmp/overnight/MR3.status` (no self-hash amendment). No push.

### Gates and first attempts

**FRESH PASS, serial:** `npm run typecheck -- --force`, `npm run lint -- --force`
and `npm run build -- --force`: **8/8 tasks each, zero cached**. Lint has six
existing warnings. `npm run test --workspace @stay-focused/shared`: **393/393**
(43 files); `@stay-focused/api`: **2306 passed, 3 existing live skips**
(201 files); `@stay-focused/mobile`: **1311/1311** (138 files, no unhandled errors);
`@stay-focused/web`: **236/236** (40 files). Standalone
`npm run build --workspace @stay-focused/api`: **1/1**, **35/35** pages;
`npm run build --workspace @stay-focused/mobile -- --platform android`: **1/1**.
Root build also generates website **19/19** pages and Android/iOS/web exports.
`git diff --check` and scoped `git diff --cached --check`: PASS.

Additional diagnostic `npm run test:workflow --workspace @stay-focused/api`:
**BLOCKED as a standalone probe: exit 1, zero tests found**. Only .gitignore is
tracked in workflow-tests. Runtime graph/provider boundary is unchanged, so this
is NOT APPLICABLE to MR3's mandatory gates; no empty-suite bypass was used.
Existing API workflow/source-chain tests pass and the API build compiles the
workflow. Provider contract: NOT APPLICABLE (unchanged interface).

First attempts retained: two draft-migration setup failures each had 29 passing
tests, 20 skipped and 1 failed/4 passed files; corrected focused 49/49. First
final typecheck launch failed before tasks on Windows preloader path escaping;
corrected. First full API: **2304 passed/2 failed/3 skipped**, **199 passed/2 failed
files**; real Quiz constraints and the cache mock were repaired, then focused
**52/52** and full **2306** passed. First full mobile: **1306 passed/4 failed**,
**137 passed/1 failed files**, **1 unhandled rejection** from new assertion/mock
contamination; corrected focused **6/6**, then full **1310** passed. Final Queue
key review added a regression (**7/7** focused), then affected typecheck/lint,
mobile **1311**, Android and root builds were repeated. Earlier root build was
also green but is retained separately. No nondeterministic flake observed.
The unavailable Python helper and rejected no-op patch are recorded in acceptance.

### UNVERIFIED

Production/deployed revision, migration application, live database rows,
Scheduler state, SOC_SCI_103 failure/retry behavior and physical device behavior
are **UNVERIFIED (owner to confirm)**. No remote service call, deployment,
remote SQL/migration, Scheduler action, email, environment-file edit or push.
Checks used a local non-loopback socket blocker and disabled live test flags,
telemetry and Expo network access. Generated Next type files were restored;
untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` remain untouched.

### Owner steps remaining

Rollout and Device checks are **NOT RUN**, skipped entirely.

1. Apply the reviewed function-only migration before publishing the new API and
   clients; deploy API and website and publish mobile OTA through owner tooling.
2. Re-upload SOC_SCI_103 on device; if generation fails, confirm Try again reports
   its stage and resumes from stored extraction without another upload/OCR.
   Check a non-retryable limit and safe capacity rejection as appropriate.
3. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for the
   later owner-controlled environment/deployment/log workflow; not run here.

MR3 is the finite endpoint. Planning files are reconciled; no later task started.

---

## WG3 unattended Generate home - STOPPED at STEP 0 (2026-10-18)

**Status: STOPPED; no WG3 implementation was started.** The complete prompt
`tmp/overnight/prompts/WG3.md` was read. Its UNATTENDED rule 4 requires stopping
at a STOP condition, and STEP 0.1 requires a clean tree apart from `tmp/`.
The initial checkout contains unrelated untracked `UI/README.md`, twenty
`UI/screenshots/{dark,light}/` images, `apps/mobile/.gitignore`, and
`supabase/.temp/cli-latest`. All were preserved without reading their contents,
staging, moving, deleting or committing them.

The actual branch is `overnight/2026-10-15_feedback`, whereas WG3 names
`overnight/2026-10-13_0132` and says to stay on it. Initial HEAD is
`9dae76f docs: record MR3 recovery and owner steps`; local ancestry confirms
WV1 `181c4b6` is included. No branch switch was attempted. Repository policy,
AUTOPILOT and current planning context were inspected. Component verification
and line-number collection in STEP 0.2 were NOT RUN after the stop condition.
Steps 1-7 remain NOT RUN; WG3 is not marked done in the planning files.

**Exact owner question for resumption:** Should WG3 run on the current
`overnight/2026-10-15_feedback` branch, and may its clean-tree prerequisite be
waived specifically for the preserved untracked `UI/`,
`apps/mobile/.gitignore`, and `supabase/.temp/` paths, or will you provide the
named branch with a tree clean apart from `tmp/`?

### Commits

Documentation-only checkpoint: `docs: record WG3 preflight stop`, author
`galaxymaxp <omgraythekid@gmail.com>`. The final hash is recorded in
`tmp/overnight/WG3.status` and local Git history; no self-hash amendment.
No implementation commit, push or remote operation was performed.

### Gate counts

Four execution gates are **NOT RUN (0/4 executed)** due to the mandatory STEP 0
stop: forced root typecheck, forced root lint, web tests and standalone API
build. Unit tests and Playwright are **NOT RUN (0 executed)**. The fifth gate,
`git diff --check`, is **FRESH PASS** for this documentation-only change;
`git diff --cached --check` is also checked before the checkpoint commit.
These hygiene checks establish no implementation acceptance. No failed test
attempt, skipped test, cached result or flake is claimed.

The Try-again padding cause is **UNVERIFIED**: the audit was not reached.
Production revision, database rows, Scheduler state, browser/device behavior
and all other live state are **UNVERIFIED (owner to confirm)**. No deployment,
remote SQL/migration, provider call, Scheduler change, email, environment-file
edit or push was performed.

### Owner steps remaining

1. Resolve the branch/clean-tree question above, then rerun WG3 beginning with
   the incomplete STEP 0. No code step or acceptance gate is complete.
2. Rollout is **NOT RUN**, skipped entirely: owner website deployment through
   the approved fullsend/Vercel production-from-main workflow (RB6).
3. Device checks are **NOT RUN**, skipped entirely: owner browser review of
   Generate home at desktop and phone widths after implementation and rollout.
4. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for the
   later owner-controlled environment, deployment and log workflow; not run here.


---

## RV1 unattended reviewer header - PASS (2026-10-18)

**Status: PASS for STEP 0-5, tests, fresh serial gates, docs and local commits.**
Baseline 1e53edd on overnight/2026-10-15_feedback. The complete RV1 prompt and
its overriding UNATTENDED rules governed this run. All seven code assumptions
hold. The referenced overnight roadmap file is absent; the complete prompt
provides scope. WG3 stopped before implementation. Original untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ were preserved. No questions,
branch switch or later task.

Mobile title-row Reviewer actions uses a 48-point IconAction and the existing
Queue native Modal/anchor/outside/Android Back pattern, without animation.
Export stays available offline; Share retains its existing owner/offline guard,
fetching, sheet, mutation, clipboard and system sharing logic. Website reuses
the AccountMenu popover pattern with Escape/focus return, arrows/Tab and outside
dismissal; Share and Save to file are inside it, Generate Quiz remains visible.
Compact minutes/topics retain mobile automatic labels and web course/date.
Reviewer usages alone hide idle Updated, keeping Syncing, error/Retry and
update-available actions. RV1 supersedes RX1's button row. No existing reviewer
Save offline action was found; none was added. No reusable primitive, ADR,
dependency, native module, API change or migration.

### Commits

- `e4f5ee9` feat(shared): allow hiding idle snapshot freshness
- `0f500cd` feat(mobile): compact reviewer header and actions menu
- `6bef993` feat(web): compact reviewer header and actions menu

Closure: docs: close RV1 reviewer header (final hash in local Git and
tmp/overnight/RV1.status; no self-hash amendment).
All commits use galaxymaxp <omgraythekid@gmail.com> via --author. No push.

### Gate counts

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; mobile **1321/1321** (139 files), web **249/249** (42 files), shared
workspace **427/427** (44 files including existing compiled test copies).
Separate shared source-only **215/215** (22 files). Standalone API build
**1/1**, **35/35** pages; Android export **1/1**. Root build includes web
**19/19**, API **35/35** and Android/iOS/web exports. All eight mandatory gate
commands plus root build/source-only pass. Diff/staged-diff PASS. Six existing
lint warnings, no new lint errors. No nondeterministic flake observed.

First attempts retained: focused mobile **20 passed / 4 failed** from a
floating-point assertion (retry **24/24**); typecheck **5/8 tasks**, three
TS18046 errors in new test mock props (typed unknown props; retry **8/8**);
full mobile **1320 passed / 1 failed** from a missing safe-area mock (focused
retry **23/23**, full retry **1321/1321**). Preliminary passing lint overlapped
the end of typecheck; the complete chain was rerun serially. Initial Python
setup was unavailable; Node completed it. No product validation or acceptance
requirement was weakened.
API tests: NOT RUN (API unchanged, outside requested suites); provider/workflow
probes: NOT APPLICABLE. Generated Next declarations were restored; generated
artifacts, private fixtures, tmp and unrelated files were not staged.

Production revision, database rows, Scheduler and physical/browser behavior:
**UNVERIFIED (owner to confirm)**. No remote service operation, deployment,
remote SQL/migration, Scheduler change, email, environment-file edit or push.
Exact commands, counts, failed attempts and local logs:
[RV1 acceptance](acceptance/rv1-reviewer-header.md).

### Owner steps remaining

1. Rollout **NOT RUN**, skipped entirely: next owner RB6 fullsend with website
   deploy and reviewed mobile APK/OTA. No RV1 migration.
2. Device checks **NOT RUN**, skipped entirely: Realme menu Export/Share,
   offline disabled Share/working Export, compact meta/large text, outside/Back,
   no idle Updated, preserved Syncing/error/Retry/update-available and sharing.
3. Browser at **1440 and 390 px: NOT RUN**, skipped entirely: Share/Save menu,
   compact meta/course/date, Generate Quiz, Enter/Space, arrows/Tab,
   Escape/focus return and outside dismissal.
4. Vercel CLI is not installed. Strongly recommend npm i -g vercel for later
   owner-controlled environment, deployment and log work; not run here.

RV1 is the finite endpoint. Current state, roadmap and sprint are reconciled;
RX1 layout is explicitly superseded. WG3's STOP remains independent.

---

## WG3b unattended website Generate home - PASS (2026-10-18)

**Status: PASS for STEP 0-7, tests, required fresh serial gates, docs and local
commits. WG3 is done via WG3b**, superseding the docs-only preflight stop at
`1e53edd`. Baseline `4bd0d91`, branch `overnight/2026-10-15_feedback`;
`9dae76f` is an ancestor. Resumed after interruption by reading the overriding
UNATTENDED prompt, progress, log/status/diff and inspecting pending work.
No WG3b implementation was already committed, so none was repeated. The
referenced overnight roadmap is absent (already recorded by WG1); the complete
WG3b prompt provides the finite scope. No later task or branch switch.

Current course groups precede own material, collapsed Not synced and collapsed
Past; own material stays visible under search. Generate uses accessible
per-course corner ellipsis menus with desktop hover/focus and narrow/touch
visibility, Escape/focus return, arrows, Tab/outside dismissal. Canvas keeps
its labelled menu and move action. Card space prevents trigger/title/chevron
overlap. Not-synced Sync is secondary; the home has no primary action.
Generate alone suppresses State's snapshot labels and uses a tested pure
selector: in-progress before failed before updated, retaining disconnected
and unconfirmed states. Other callers keep their default snapshot behavior,
and initial loading/error recovery is preserved.

**Try again padding cause:** desktop density CSS replaces base `12px 16px`
padding with `0 14px`; Smart Selection also used compact `link-button`
`2px 4px` with no minimum height. All nine website action sites now use
`retry-button` to restore `12px 16px` and a 48px minimum. Existing tones,
handlers, retry eligibility and duplicate/busy guards are unchanged. No mobile
or API implementation, new dependency, migration, reusable architecture or ADR.

### Commits

- `0eb0aaa` feat(web): simplify Generate home and recovery actions
- Closure: `docs: close WG3b Generate home` (final hash in Git and
  `tmp/overnight/WG3b.status`; no self-hash amendment).

Both commits use `galaxymaxp <omgraythekid@gmail.com>` via `--author`. No push.
Only WG3b-owned web paths and documentation are staged. Original untracked
`UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` remain untouched. The
pre-existing WG3b sprint header and acceptance draft were completed, preserving
other runs' content. Generated API Next declarations were inspected and
restored. Screenshots, validation output, tmp and private fixtures are excluded.

### Gate counts

**FRESH PASS, serial:**

- `npm run typecheck -- --force`: **8/8 tasks, 0 cached**.
- `npm run lint -- --force`: **8/8 tasks, 0 cached**, zero errors,
  six existing warnings (web 1, mobile 5).
- `npm test --workspace @stay-focused/web`: **265/265 tests, 42/42 files**,
  including Generate, generate-reviewer-state and generation recovery.
- `npm run build --workspace @stay-focused/api`: **1/1**, **35/35** static
  pages. No API implementation changes or remote service operation.
- `git diff --check` and `git diff --cached --check`: **PASS** for scoped
  implementation and documentation closure.
- `node apps/web/scripts/wg3-layout-check.mjs`: **35/35** page/viewport
  checks at 1440/1024/768/390 px plus 1440 px touch; **275** intercepted API
  requests, **5** checked move PATCH requests, **0** unexpected requests and
  **0** runtime errors. Fictional data only, fail-closed interception. Checks
  order/search/collapse, labels, primary count, menu keyboard/focus/visibility,
  single status and stale-failure priority, actual retry padding/recovery,
  Canvas compatibility and card/text geometry. Desktop/phone screenshots
  inspected; `.local/wg3/` remains uncommitted.
- Both browser harnesses' `node --check`: **2/2 PASS**.

First attempts retained: focused tests **32 passed / 2 failed**, corrected to
**34/34** (test-only counting/circular-child assertions); browser **0 complete /
1 failed** (checker treated text behind an opaque popover as a collision),
then **2 complete / timeout** (copied fixture job IDs), corrected to **35/35**;
typecheck **5/8 tasks** (one TS2739, new fixture missing two fields), explicit
nulls restored strict typing, final **8/8**; web **264 passed / 1 failed**,
41/42 files (exact className assertion), CSS-token assertion retains the
exactly-one-primary check, final **265/265**. No nondeterministic flake.
Existing non-failing Vite config-loader warning retained. Final chain restarted
serially after the last test edit and interruption. Exact evidence/log paths:
[WG3b acceptance](acceptance/wg3b-generate-home.md).

Mobile/Android build and tests: **NOT APPLICABLE**, website-only scope.
API tests: **NOT RUN**, API unchanged and outside requested suites.
Live provider/workflow probes: **NOT APPLICABLE**. Root build not required by
the WG3b gate list. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
deployment, remote SQL/migration, Scheduler operation, email, environment-file
edit or push. Production revision, database rows, Scheduler and real-account
browser/device behavior: **UNVERIFIED (owner to confirm)**.

### Owner steps remaining

1. Rollout **NOT RUN**, skipped entirely: owner website deployment through
   RB6/fullsend and Vercel production from main. No WG3b migration.
2. Device checks **NOT RUN**, skipped entirely: after rollout review Generate
   with a real account at desktop and phone widths, including course order,
   hover/focus/touch menu, sync/failure/freshness line and recovery padding.
3. Confirm production revision, database/Scheduler state and real-account
   behavior; these remain **UNVERIFIED (owner to confirm)**.
4. Vercel CLI is not installed. Strongly recommend `npm i -g vercel` for later
   owner-controlled environment, deployment and log work; not run here.

Current state, roadmap and sprint are reconciled. WG3b is the finite endpoint;
no next roadmap item is authorized by this run.

## QU1 Queue popout redone - PASS locally (2026-10-18)

**Status: PASS for unattended STEP 0-5, tests, required fresh serial gates,
documentation and scoped local commits.** Branch
`overnight/2026-10-15_feedback`, baseline `cabd5b8`; no branch switch or push.
The finite endpoint is QU1. No later roadmap task was started.

Both apps use shared active-only batch summaries and one idle rule. Completed
outputs allow idle; running/queued/stopping jobs, visible attention items,
mobile pending intents, batch waiting/quota/failed requests and unfinished
summaries prevent it. Refresh is an accessible header icon beside Close, with
busy/disabled state during initial and cached-data refresh. The existing
pollers still deduplicate requests. Mobile retains outside tap and Android
Back; web retains outside pointerdown, Escape, blur and trigger focus return.
Existing Clear, QueueCard, batch Retry/Cancel and result-open actions remain.
Spacing/icons/colors come from the existing design system.

**4 of 4 diagnosis:** legitimate successful completion, not duplicate counting.
The screenshot defect was stale finished progress display. Code review also
found a separate count defect: terminal failed/cancelled requests and jobs
could leave progress unfinished forever, including after Clear. Terminal
attempts now settle progress while failures keep their independent attention
UI; Retry changes a request back to waiting and reopens progress. In-memory
API tests cover exact 4/4, overlapping membership, owner filtering, every job
status and retry reopening. No DTO/schema, grant/RLS, quota, job publication,
provider, dependency or migration change. No new ADR is needed.

### Commits

- `7eb50c2` feat(shared): add active batch summaries and idle queue rule
- `529d466` fix(api): settle terminal course batch progress
- `7f519a3` feat(mobile): compact queue popout with refresh icon
- `bc2e6b2` feat(web): compact queue popout with refresh icon
- `docs: close QU1` is the documentation closure commit containing this footer;
  its hash and all five commits are recorded in `tmp/overnight/QU1.status`.

All commits use author `galaxymaxp <omgraythekid@gmail.com>`. Only owned paths
are staged. Original untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
remain untouched. Build-generated API `next-env.d.ts` was restored; generated
outputs, local credentials, private fixtures and validation logs are not committed.

### Gate counts (all local, FRESH, serial)

- `npm run typecheck -- --force`: **8/8 tasks, 0 cached**, PASS.
- `npm run lint -- --force`: **8/8 tasks, 0 cached**, PASS; **0 errors,
  6 existing warnings** (five mobile import-order, one web unused import).
- Shared workspace tests: **446/446**, **44/44 files**, PASS; includes existing
  compiled copies and source tests. No separate source-only count is claimed.
- Web workspace tests: **278/278**, **42/42 files**, PASS.
- Mobile workspace tests: **1332/1332**, **139/139 files**, PASS.
- API workspace tests: **2315 passed, 3 skipped, 0 failed**, **201/201 files**, PASS.
- `npm run build --workspace @stay-focused/api`: **1/1**, **35/35** static pages,
  PASS after the final terminal-count change.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  **1/1 export**, **1 Android bundle, 35 assets, 4262 modules**, PASS with Expo
  offline/telemetry disabled. This is a local export, not an APK or OTA release.
- Final scoped web typecheck/lint after the corrected fixture: **1/1 each**,
  PASS, one existing warning. Diff and each implementation staged-diff check:
  **0 whitespace errors**, PASS; docs staged check is part of closure.

First mobile attempt: **1324 passed / 8 failed**, **138/139 files**. New
assertions serialized mocked icon props with circular React Fiber references;
rendered-text assertions fixed that test-only defect. Initial lint passed
8/8 with eight warnings; two new duplicate imports were removed, final six
warnings are pre-existing. Initial API tests/build passed before final review;
the final API suite adds all terminal-status and retry coverage. A web test
fixture that combined a running badge with an empty list was corrected, then
the full web suite and scoped typecheck/lint passed. Non-failing Vite and Expo
color-environment notices remain. **No nondeterministic flake observed.**

Evidence, exact commands and acceptance matrix:
[QU1 acceptance](acceptance/qu1-queue-popout.md). Logs are ignored under
`tmp/overnight/QU1-*.log`; progress/status remain under `tmp/overnight/`.
Root aggregate/website production build: **NOT RUN**, outside QU1's explicit
gate list. Live provider/workflow probes: **NOT APPLICABLE**.

Production revision, actual database rows (including the screenshot's exact
batch), Scheduler state and real-account/device/browser behavior are
**UNVERIFIED (owner to confirm)**. Repository code/tests establish the display
and count diagnosis; no live production evidence is claimed. The referenced
`overnight/roadmaps/2026-10-18-web-desktop-mobile-polish-profiles.md` is absent;
the self-contained QU1 prompt and repository/current planning files establish
this scope. Named components were present and still had the old presentation;
existing web outside/Escape handling was preserved rather than duplicated.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, deployment, remote SQL,
migration, Scheduler operation, email, environment-file edit or push occurred.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** owner website deployment and mobile
   OTA/APK. No QU1 migration is required. Coordinate rollout through the existing
   owner release procedure; no remote action was taken here.
2. **Device checks - NOT RUN, skipped entirely:** Android finished batch shows
   no N-of-N line and correct idle text; TalkBack says Refresh queue; refresh
   shows busy state/ignores repeated taps; outside tap and Android Back close.
   Web at 1440 and 390 px: same finished/partial/attention behavior, refresh
   label/busy state, outside/Escape/blur dismissal and trigger focus return.
3. Confirm production revision, database/Scheduler state and real-account
   behavior; these remain **UNVERIFIED (owner to confirm)**.
4. Vercel CLI is absent. Strongly recommend `npm i -g vercel` for later
   owner-controlled environment, deployment and log work; not run here.

Current state, roadmap and sprint are reconciled. QU1 stops here.


## RV2 unattended handoff - PASS locally (2026-10-18)

Status: **PASS** for finite STEP 0-4, tests, all required fresh serial gates,
docs and scoped local commits. Branch `overnight/2026-10-15_feedback`, baseline
`1064513`, tested implementation `ec580e9`. Both clients and signed-out web
now show one four-part pill. Expound retains independent expansion, full
button semantics and disabled rules; three levels keep their selection and
full accessibility labels. Original content and generation behavior remain.

Commits:

- `0b553dd feat(shared): compact topic level labels`
- `bf5febd feat(mobile): topic levels and expound in one pill`
- `fc1cb84 fix(mobile): preserve equal topic pill shares and hit bounds`
- `ec580e9 feat(web): topic levels and expound in one pill`
- Documentation closure: `docs: close RV2`; final hash and all commits are
  recorded in ignored `tmp/overnight/RV2.status` after the closure commit.

Narrow threshold: mobile **<380 measured row points**, leaving about 85pt
for text per segment at the boundary; web **<=400px viewport**. Short labels
are Original / Simpler / Simplest. Mobile visible segments are 32pt, with
vertical-only 6pt hit slop and 44pt parent bounds; no horizontal ScrollView.
Web uses equal shares, 44px targets, existing palette/radius/border tokens
and no overflow. Signed-out links retain the exact sign-in return path.

**FRESH PASS, serial:** forced root typecheck **8/8**, lint **8/8**, both
**0 cached**; shared **447/447** (44 files including existing compiled
copies), web **280/280** (42 files), mobile **1334/1334** (139 files); API
build **1/1**, **35/35** static pages; local Android export **1/1**;
diff/staged-diff **0 whitespace errors**. Six existing lint warnings. No
unit/gate failure or test skip. Isolated browser **24/24** at
1440/768/390/360px in light/dark, actual components/CSS, all network blocked,
zero unexpected requests/page errors. Screenshots at 360 light and 1440 dark
were inspected. This verifies component layout, not a deployed app flow.

Browser first attempts are retained: **0/24** before an equal-width assertion
caught padding affecting flex shares (layout corrected); **2/24** before a
wrong `returnTo` fixture expectation (existing helper uses `next`); **3/24**
before an encoded Windows screenshot path failed (harness now uses
fileURLToPath). Final **24/24** passed. No nondeterministic flake observed. Closure tooling initially exited 9009
because Python is unavailable; an equivalent Node helper completed docs
without an installation. No gate failure or partial doc edit resulted.
Exact commands/results and scope limits:
[RV2 acceptance](acceptance/rv2-topic-pill.md). Progress/logs/status and
screenshots remain ignored under `tmp/overnight/RV2*`.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** owner website deploy and mobile
   OTA/APK through the existing release process. No RV2 migration is needed.
2. **Device checks - NOT RUN, skipped entirely:** Realme Android at 360pt,
   compact/readable four-part pill, no scrolling, Expound opens/closes and
   TalkBack reads three level radios plus an expandable button. Real web at
   1440 and 390px.
3. Production revision, database rows, Scheduler state and real-account/device
   behavior are **UNVERIFIED (owner to confirm)**; no live check attempted.
4. Vercel CLI is absent. Strongly recommend `npm i -g vercel` for later owner
   environment/deployment/log work; no installation or CLI call was run.

No remote service call, deployment, remote SQL, migration application,
Scheduler action, email, environment-file edit or push occurred. API-generated
Next declarations were inspected and restored. Unrelated untracked paths were
preserved; no generated artifact, `tmp/` or `.local/` file was staged. Current
state, roadmap and sprint are reconciled. RV2 stops here.

## SH2 unattended handoff - STOPPED at STEP 0 (2026-10-18)

Status: **STOPPED**, per SH2 unattended rule 4 and STEP 0's instruction to
stop on code contradictions. SH2 is not implemented or complete. Baseline
`ef79f23`, branch `overnight/2026-10-15_feedback`; no branch switch. Local
upstream comparison: **37 ahead / 0 behind**, without fetching. Existing
untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are preserved.

Preflight evidence (baseline line numbers):

- `primitives.tsx:198`: Page exists; expected props at :200-241. Header title
  and subtitle at :288-293 share the row with back/leading/header actions,
  Queue and Profile controls. `headerBelow` is :302, outside the scroll area.
- Page's `onScroll` is passed directly to ScrollView at :307; native
  `RefreshControl` is :318. **Page has no `pull` helper or pull scroll handler.**
  The only `pull.onScroll` in the file is Sheet's at :564, from
  `useSheetDrag(dismiss, ...)` at :519. This observes scrolling for sheet
  drag-to-dismiss, not Page pull-to-refresh. Step 2 requires composing the
  Page hook with an existing pull handler that does not exist in Page.
  Reusing Sheet's handler would introduce unrelated dismissal semantics.
- `theme.tsx:30,85,98`: `useTheme()` exposes `reducedMotion`.
- `TodayScreen.tsx:289`: greeting is Page title; date is subtitle :290-294;
  SnapshotStatus is headerBelow :295-296.
- `TasksScreen.tsx:46,54`: Tasks and SnapshotStatus; course screen :100,124.
  The separate Tasks SyncStatus is currently scroll content at :58.
- `LibraryScreen.tsx:254`: LibraryCourseScreen; organizer onScroll :303;
  headerBelow :307 includes status, sort and filter/selection actions as well
  as offline caption :325. `libraryPresentation.ts:18-20` produces the caption;
  `useLibraryOrganizer.ts:138` observes offsets for drag organization.
- `ReviewerReader.tsx:268` updates anchors/metrics/scrubber; headerBelow :324
  includes snapshot status and ReviewerSearchBar. No existing shared
  hide-on-scroll header found by local design/web source inspection.

**Exact owner question for resumption (not asked during unattended run):**
May SH2 proceed by preserving Page's native RefreshControl unchanged and
composing the hide-on-scroll handler only with Page's existing caller
onScroll, treating the prompt's pull.onScroll reference as a Sheet-only
misidentification?

Title decision from STEP 0.3: keep the Today greeting/title row visible
because it shares the row with persistent header controls. On an approved
resume, only content below that row should collapse; the date currently in
subtitle would need moving into the collapsible region with SnapshotStatus.
No title/date layout changes were made. No animation method or thresholds
were implemented/chosen; the prompt's >24px beyond measured height, 8px
hysteresis and approximately 200ms easing remain proposed requirements.
Library's sort/filter/selection actions also need to stay visible when
isolating its offline caption. **PAR1:** no website hide-on-scroll header
found in inspected code; website implementation remains outside SH2 scope.

Verification and gate counts:

- **FRESH:** local STEP 0 source/Git inspection completed with the contradiction
  above. Initial upstream argument parsing failed once; quoted argument
  rerun succeeded with 37/0. This was metadata inspection, not a gate failure.
- **NOT RUN (0 executed):** `npm run typecheck -- --force`,
  `npm run lint -- --force`, `npm run test -w @stay-focused/shared`,
  `npm run test -w @stay-focused/mobile`,
  `npm run build --workspace @stay-focused/api`, and
  `npm run build --workspace @stay-focused/mobile -- --platform android`.
  Stopped before app edits; no test pass counts inferred from previous runs.
- **FRESH PASS (2/2, 0 whitespace errors):** documentation-only
  `git diff --check` and `git diff --cached --check`. No suite failure or flake.
- Production revision, database rows and Scheduler state are
  **UNVERIFIED (owner to confirm)**. No live check attempted.

Commits: one scoped documentation checkpoint, planned subject
`docs: record SH2 preflight stop`; the resulting hash is recorded in
`tmp/overnight/SH2.status` and `tmp/overnight/SH2.progress` after commit.
No implementation commits exist for SH2.

### Owner steps remaining

1. Resolve the handler question above, then resume SH2 implementation, tests
   and every required fresh serial gate before declaring code completion.
2. **Rollout - NOT RUN, skipped entirely:** mobile OTA/APK is Fely's, only
   after implementation and gates pass.
3. **Device checks - NOT RUN, skipped entirely:** Realme Today, Tasks,
   Library course and reviewer scroll down/up with no blank gap; persistent
   actions/tab bar; pull-to-refresh at top; instant Reduce Motion; reviewer
   search remains visible while typing/with query and after match jumps.
4. Confirm any needed live production state. Vercel CLI is absent; strongly
   recommend `npm i -g vercel` for later owner environment/deployment/log work.
   No installation or Vercel CLI command was run here.

No application code, dependency, migration, environment file or unrelated
work changed. No remote service call, deployment, remote SQL, Scheduler
operation, email or push occurred. Current state, roadmap and sprint record
this stop consistently; no later implementation step was entered.


## SH2b mobile hide-on-scroll - PASS (2026-10-18)

Status: **PASS - all finite unattended code steps and fresh gates complete
locally.** SH2 is done via SH2b; the owner's corrected Page/Sheet facts
resolve the earlier `d98e58b` stop. Baseline `d98e58b`, branch
`overnight/2026-10-15_feedback`. The earlier SH2 footer is historical.

Commits:

- `10347e2 feat(mobile): add hide-on-scroll header hook`
- `fb99de4 feat(mobile): hide secondary headers on scroll`
- This footer, acceptance report and planning reconciliation are committed
  as `docs: close SH2 mobile hide-on-scroll`; the resulting hash is recorded
  in `tmp/overnight/SH2b.status` and progress after commit.

One shared hook animates measured height and opacity to remove occupied
space; the natural inner measurement stays available when hidden. Existing
`motion.small` **180ms**, `Easing.inOut(Easing.quad)`; Reduce Motion sets
values instantly. Hide after downward travel beyond **measured height +
24pt** with **8pt accumulated hysteresis**; reveal on up, top/negative
overscroll, short refreshed content or a fitting resized viewport. Clamp
bottom offsets so elastic rebound/viewport enlargement cannot reopen it
accidentally. Stop interrupted/unmounted animations. Hidden descendants
use both accessibility exclusion properties and no pointer events.

Title decision (STEP 0.3): Today greeting stays in the title row because
Queue/Profile controls share that row; date moves from subtitle into the
collapsible SnapshotStatus region. Main and course Tasks status headers opt
in; main Tasks' existing Canvas sync line joins the collapsible region.
Library course isolates the offline caption, leaving sort/filter/selection
and status controls fixed via `headerBelowFixed`; organizer.onScroll still
runs. Reviewer snapshot/search collapses except when focused or a raw or
deferred query is active. This also holds it visible during match jumps.
Page calls hook then caller at 16ms; native RefreshControl is unchanged.
Back/header actions/tab bar remain visible. Sheet drag logic is untouched.
No new dependency, native module, schema, API or token; no ADR required.
**PAR1:** website has no hide-on-scroll header in inspected source.

Verification (final code, fresh and serial):

- **FRESH PASS:** `npm run typecheck -- --force`, **8/8 tasks, 0 cached**.
- **FRESH PASS:** `npm run lint -- --force`, **8/8 tasks, 0 cached**;
  zero errors, six existing warnings (five mobile import-order, one web unused import).
- **FRESH PASS:** `npm run test --workspace @stay-focused/shared`,
  **447/447**, **44 files**, including existing compiled copies.
- **FRESH PASS:** `npm run test --workspace @stay-focused/mobile`,
  **1365/1365**, **141 files**. Focused design/screens/Reviewer: **117/117**.
- **FRESH PASS:** `npm run build --workspace @stay-focused/api`, **1/1**,
  **35/35 static pages**. Generated `next-env.d.ts` restored to baseline.
- **FRESH PASS:** `npm run build --workspace @stay-focused/mobile -- --platform android`,
  **1/1 local export**. Expo offline and telemetry disabled in process env;
  environment files untouched. Generated exports remain ignored.
- **FRESH PASS:** `git diff --check` and `git diff --cached --check`,
  **2/2**, zero whitespace errors, including final documentation.
- All **7/7 required gate commands** passed; staged-diff checks also passed.
  API unit/provider suites were **NOT RUN / NOT APPLICABLE** to this mobile-only change.

Failed first attempts are retained: initial hook stub **15 passed / 2 failed**
(static interpolation stub corrected); initial mobile typecheck **1 error**
and combined focused tests **107 passed / 8 failed** (missing Today spacing
import corrected); initial forced lint **7/8 tasks**, **1 error / 8 total
warnings** (test element construction and two new import warnings corrected).
The next focused run passed **115/115**; two added bottom-offset regressions
bring the final focused total to **117/117**. Final root gates were repeated
for the final code. No nondeterministic flake. Existing Vite config-loader,
react-test-renderer and terminal color diagnostics do not indicate failures.
Documentation helper first attempts found Python unavailable; Node performed
the local edits successfully. Exact acceptance:
[SH2b report](acceptance/sh2b-hide-on-scroll.md).
Ignored raw logs/progress/status: `tmp/overnight/SH2b*`; none committed.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK.
2. **Device checks - NOT RUN, skipped entirely:** Realme Today, Tasks,
   course Tasks, Library course and reviewer down/up with no blank gap;
   persistent actions/tab bar; existing pull-to-refresh at top; instant
   Reduce Motion; reviewer search while focused/typing/querying/match jumping;
   TalkBack hidden descendants and restoration at the top.
3. Production revision, database rows, Cloud Scheduler state and real-account/
   device behavior are **UNVERIFIED (owner to confirm)**. No live check attempted.
4. For later owner Vercel work, the CLI is absent; strongly recommend
   `npm i -g vercel` for environment/deployment/log tooling. No installation
   or Vercel CLI command was run in this unattended slice.

No remote service call, deployment, remote SQL/migration, Scheduler change,
email, environment-file edit or push. Unrelated `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored temporary work are
preserved. Current state, roadmap and sprint are reconciled. SH2b is the
finite endpoint; no later roadmap work was started.

## OS1 Other source rows - STOPPED at STEP 0 (2026-10-18)

**Status: STOPPED, not implemented.** Baseline `c6584b5` on
`overnight/2026-10-15_feedback`; HEAD is after `ef79f23` and includes SH2b.
Local upstream tracking is `github/main`, ahead 41 at preflight; remote
freshness is **UNVERIFIED (owner to confirm)**. Initial dirty paths were
only unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`;
all preserved. No branch switch, application edit or later task.

**Stop authority:** `tmp/overnight/prompts/OS1.md`, unattended rule 3:
"It is a STOP if the code itself contradicts what the prompt assumes."
Rule 4 requires a safe commit, handoff question, STOPPED status and end.
STEP 1 assumes an existing RowLink pressed surface tint that can be reused.
Actual `apps/mobile/src/design/primitives.tsx:399-459` has only pressed
opacity (`:451`, 0.7 versus 1) and scale (`usePressMotion`, `:96-114`),
with no background tint. A plain reuse cannot meet the specified tint.
Its props also lack `testID`; accessible button role/label and disabled/
selected state exist. This is a code contradiction, not a live-access block.

**Exact question for the owner (recorded, no answer requested overnight):**
May the resumed OS1 use a local source-row component with the existing
surface/text tokens, 48pt minimum target, icon before label, button role,
accessible label, original testIDs/handlers/disabled behavior, and a new
subtle pressed surface tint, since RowLink currently has opacity/scale
feedback only and no testID prop?

STEP 0 source findings (FRESH local inspection):

- `ReviewerGenerateScreen.tsx:116`: Other source Sheet. `:122-125`:
  chooser with three secondary Buttons, original text/camera/file testIDs,
  `changeMode("paste")`, `pick("camera")`, `pick("file")`; busy disables
  Camera/File. `:138-140`: default Buttons for Take photo / Choose photo /
  Choose PDF, DOCX or PPTX. Footer actions `:118-120` and Try again `:146`
  remain untouched.
- `Button.tsx:31`: default primary; `:112-118`: accent background and
  accentText. `:122-128`: secondary cardElevated background/textPrimary.
  `theme.tsx:106-112` and `tokens.ts:7-13` map those to surfaceElevated,
  accent/onAccent and textPrimary. `themeTokens.ts:6-13` light:
  secondary white `#FFFFFF` / text `#111111`, primary `#171717` / white;
  `:36-43` dark: secondary `#2C2C2E` / white, primary `#F5F5F5` / `#111111`.
  Thus light secondary and dark primary explain the filled white controls.
  Global Button remains unchanged.
- `RowLink` details above; `tokens.ts:66-67` defines hitTarget.min = 48.
  Existing lucide dependency and primitives imports are present.
- Web `own-material.tsx:85-87`: Source group, Paste text / Upload a file,
  aria-pressed from mode. Actual CSS is `apps/web/app/globals.css`, not
  `apps/web/src/app/globals.css` (harmless path drift). Shared `.segments`
  at `:589-611` uses transparent buttons and selected `var(--elevated)`;
  light `--elevated: #fff` at `:5`, dark `#2c2c2e` at `:57`. `:1159-1161`
  adds selected shadow. White/filled highlight confirmed; conditional web
  change is applicable but not started because STEP 0 stopped. Future
  override must use `.own-material .segments`. Existing Icon is
  `src/components/ui.tsx:6`; local `text-align-start.svg` and `file-text.svg`
  assets exist.

Acceptance / gate counts:

- Preflight assumption check: **FRESH, STOPPED**, 1 contradiction.
- Mobile chooser/in-mode rows, behavior/icon/busy tests, conditional web
  icons/selection tests: **NOT RUN**, no implementation.
- `npm run typecheck -- --force`, `npm run lint -- --force`, shared/mobile/
  web workspace tests, API build, Android export, web build: **NOT RUN**,
  **0/8 implementation gate commands**, stopped before editing code.
- `git diff --check`, `git diff --cached --check`: **FRESH PASS**, **2/2**,
  zero whitespace errors for this documentation checkpoint.
- No test failures or flakes; lookup attempts at OS1's stale CSS path and
  guessed theme/Icon/pressMotion/SH2 report paths were resolved by source
  discovery. No build or test attempt occurred. No cached result claimed.

Local commit: `docs: record OS1 preflight stop`, author
`galaxymaxp <omgraythekid@gmail.com>`, contains only current-state, roadmap,
current_sprint and this footer. Its final hash and subject are recorded in
`tmp/overnight/OS1.status` and `tmp/overnight/OS1.progress` after commit;
no tmp artifact is staged. No implementation commit was made.

### Owner steps remaining

1. Resolve the recorded RowLink assumption and issue corrected resume
   instructions; implement mobile rows and conditional scoped web treatment,
   then run every required fresh serial gate before claiming OS1 complete.
2. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK and any
   web deployment after implementation and acceptance.
3. **Device checks - NOT RUN, skipped entirely:** Realme light/dark Other
   source Text/Camera/Local File icon rows, subtle pressed tint without
   white fill; matching Take photo / Choose photo rows; Text opens editor.
4. Production revisions, database rows, Scheduler state and actual device/
   real-account behavior are **UNVERIFIED (owner to confirm)**. No live
   checks attempted. For later owner Vercel work, strongly recommend
   installing its absent CLI with `npm i -g vercel`; nothing installed here.

No remote service call, deployment, remote SQL/migration, Scheduler action,
email, environment-file edit or push. All three planning files reconcile
OS1 as STOPPED/pending. No ADR needed. Finite unattended endpoint reached
by the mandatory preflight stop; no implementation step was crossed.


## OS1b source option rows - unattended local completion (2026-10-18)

**Status: PASS** for finite STEP 0-4, tests, fresh serial gates, documentation
and local commits. Baseline `9613d00`, branch
`overnight/2026-10-15_feedback`; OS1 progress and its historical STOP footer
were read first. Owner correction resolves that STOP: RowLink's existing
opacity/scale feedback is accepted, with no global pressed-style change.
Preflight source/token references and acceptance matrix are in
[OS1b acceptance](acceptance/os1b-source-option-rows.md).

**Commits:** `26a8e69 feat(mobile): monotone icon rows in other-source sheet`;
`a8484f6 fix(web): subtle own-material source toggle`; closing
`docs: close OS1 (OS1b)` contains this footer and reconciled planning files.
Its exact resulting hash and every run commit are recorded in Git and
ignored `tmp/overnight/OS1b.status`/progress after commit, without self-hash
amendment. All use author galaxymaxp <omgraythekid@gmail.com>. No push.

Mobile chooser and in-mode picks now reuse RowLink with Type/Camera/FileUp
and Camera/Image/FileUp icons, original labels, handlers, chooser testIDs and
busy flags. Shared RowLink adds only optional testID forwarding; accessible
48pt unfilled targets and feedback remain. Footer actions, Try again,
Button.tsx, generation/upload logic and sheet chrome are unchanged.
**Web finding:** actual `apps/web/app/globals.css:606,1159` selected a white
elevated fill and shadow. Conditional work uses existing `--hover` for
selected/active background and removes the shadow, scoped to
`.own-material .segments`, with text-align-start/file-text icons. Other
toggles retain their styles; aria-pressed mode switching is tested.

**Gate counts (FRESH, serial):** forced root typecheck and lint **8/8 each,
0 cached**; lint **0 errors, six existing warnings**; shared **447/447**
(44 files, emitted copies included); mobile **1372/1372** (141 files); web
**281/281** (42 files). API build **1/1, 35/35 pages**; local Android export
**1/1**; web build **1/1, 19/19 pages**. AUTOPILOT forced root build **8/8,
0 cached**. Diff and each staged-diff check **PASS**, zero whitespace errors.
All **9/9 prompt gate commands** plus the additional root build/staged
checks pass. Focused mobile/web **20/20** and **9/9**; local Chromium CSS
**8/8** light/dark selected/forced-active/shadow/scope assertions, all
network requests aborted. API/provider suites **NOT RUN / NOT APPLICABLE**.
Next ambient files restored; generated artifacts remain ignored.

Failed first attempts: forced lint **7/8** tasks, **one test error plus six
existing warnings**, fixed by the established createElement props pattern;
fresh typecheck/lint then passed. Initial pointer CSS helper failed one
active-state assertion; forced CSS state now passes deterministically. One
inline source-check helper failed PowerShell quoting before execution; local
script comparison passed. The documentation helper initially stopped before
writes on a UTF-16 log decoding assertion; BOM detection fixed it. No suite
failure or flake. Existing Vite config and Expo terminal-color diagnostics
remain. Full details and log names are
in acceptance. All three planning files reconcile OS1 as done via OS1b;
historical OS1 footer is preserved. No ADR or later roadmap slice.

### Owner steps remaining

1. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK and any
   website deployment.
2. **Device checks - NOT RUN, skipped entirely:** Realme light/dark Other
   source Text/Camera/Local File monotone icon rows; no white filled
   highlight; existing RowLink opacity/scale feedback per the owner answer;
   Camera's Take photo/Choose photo rows match; Text opens the paste editor;
   original camera/gallery/file flows still work.
3. Production revisions, database rows, Scheduler state and actual device/
   real-account behavior are **UNVERIFIED (owner to confirm)**. Local refs
   initially showed ahead 42/behind 0; remote freshness unverified, no fetch.
4. For later owner Vercel work, strongly recommend installing the absent CLI
   with `npm i -g vercel`. No installation or Vercel command ran.

No remote service call, deployment, SQL/migration, Scheduler action, email,
environment-file edit or push. Unrelated untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` remain preserved. Logs,
helpers/progress/status and generated output are uncommitted and ignored.

## GN1 mobile grace navigation - unattended preflight STOP (2026-10-18)

**Status: STOPPED.** STEP 0's "STOP on any surprise" and unattended rule 4
apply before implementation. Baseline `da57f05`, branch
`overnight/2026-10-15_feedback`; local refs ahead 45 / behind 0, no fetch.
The reviewer path exists and matches the prompt, but
`apps/mobile/src/features/courses/CourseBatchControls.tsx:38` already opens
Queue immediately on a successful batch response. Its existing test
(`CourseBatchControls.test.ts:25`) requires `show()` once. This is a visible
popout transition, not router navigation, and is omitted from the prompt's
baseline. No implementation step was crossed. Full inventory, acceptance
matrix and inspection limitations: [GN1 preflight](acceptance/gn1-grace-navigation.md).

**STEP 0.3 route finding:** `GenerationScreen.tsx:32,74-94` with start=1
calls `acceptGeneration`; it is not observe-only. With intent and no start,
`:45-71` reads the saved intent and any generation ID without admission.
An unresolved intent shows Ready to start / Start generation, and that
effect does not subscribe to subsequent storage writes. A late admission
therefore needs explicit observation treatment. `/generation-queue` is
QU1's redirect: back, or replace `/today`, then open the Queue native Modal;
it renders no persistent page. Queue opening itself need not blur a screen.

**Exact owner question (recorded, not asked in this unattended session):**
May GN1 replace CourseBatchControls' existing immediate `queue.show()`
(and its test expectation) with the cancellable two-second opening through
the current `/generation-queue` redirect/popout route, preserving QU1's
popout rather than creating a new full-page queue? Also, may it add
observe-only intent reconciliation in GenerationScreen so an admission
that finishes after the initial intent read displays progress without
another `acceptGeneration` call?

**Commits:** no implementation commit. The scoped local checkpoint commit
`docs: record GN1 preflight stop` contains this footer, the acceptance report
and the three reconciled planning files. Its final hash is recorded in Git
and `tmp/overnight/GN1.status` / `GN1.progress` after commit, without amending
to embed its own hash. Author galaxymaxp <omgraythekid@gmail.com>.

**Gate counts:** FRESH documentation `git diff --check` and
`git diff --cached --check` PASS, 2/2 checks, zero whitespace errors.
Of seven prompt gate commands (shared/mobile counted separately), only
`git diff --check` ran: 1/7; other 6/7 NOT RUN due to the mandatory preflight
stop. Forced root typecheck/lint, shared/mobile/API tests, API build,
Android export and AUTOPILOT root build NOT RUN. No cached tests or previous
slice's counts claimed. No suite first failure or flake. Read-only search
helper errors (PowerShell brace expansion, two guessed absent source paths,
an oversized truncated historical-doc read) were corrected and recorded in
acceptance; they did not change repository content.

### Owner steps remaining

1. Resolve the exact recorded baseline/observation questions, issue corrected
   resume instructions, then implement GN1 and pass all fresh serial gates.
2. **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK.
3. **Device checks - NOT RUN, skipped entirely:** Realme Generate Reviewer,
   stay two seconds, generation page opens; navigate to another tab within
   two seconds, remain there; home/background then return, no navigation;
   Generate all opens Queue after two seconds.
4. Production revisions, database rows, Scheduler state, real-account and
   physical-device behavior are **UNVERIFIED (owner to confirm)**; no live
   check attempted. This uncertainty did not cause the preflight stop.

No hook/screen/test/API/schema/dependency/ADR change. No remote call,
deployment, SQL/migration, Scheduler action, email, environment-file edit
or push. Unrelated untracked `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` preserved. No tmp or .local artifact staged. All three
planning files mark GN1 STOPPED/pending; no later task started.

## GN1b mobile grace navigation - PASS (2026-10-18)

Finite unattended code scope STEP 0-5, tests, fresh serial gates, docs and
local commits is complete. Owner corrections supersede GN1's STOP at
`8dffcd4`; no later slice started. Branch `overnight/2026-10-15_feedback`.

Commits:

- `a387c59 feat(mobile): add cancellable grace navigation hook`
- `29bbe1d feat(mobile): open generation progress after grace period`
- The accompanying `docs: close GN1 (GN1b)` commit closes planning/acceptance;
  its exact hash is recorded after commit in ignored `tmp/overnight/GN1b.status`
  and Git. All commits use author galaxymaxp <omgraythekid@gmail.com>.

Reviewer Generate and confirmed single Library Remake schedule one two-second
push after saved intent persistence. Blur, navigator/parent state changes,
background/inactive, unmount, reschedule and opening the Queue Modal cancel.
The callback checks mounted, focused and active before pushing. Existing note,
Queue refresh and admission lifetime remain intact. Generate all/Select materials
and their test remain unchanged and open Queue immediately; Quiz is immediate.
ADR-045 records the shared mobile pattern.

**STEP 0.3 route finding:** `start=1` calls `acceptGeneration`; delayed pushes
use `/generation` with `intent` and **no start**. The destination re-reads local
intent storage after Queue updates/focus until a job ID exists. A late admission
therefore attaches without a second acceptance call. Tests prove exactly one
originating admission and protect a manually retried ID from old saved intent
reconciliation. `/generation-queue` still returns to the prior screen/Today
and opens the existing QU1 popout.

**FRESH verification; all 7/7 prompt gate commands PASS:**

- `npm run typecheck -- --force`: 8/8 tasks, 0 cached.
- `npm run lint -- --force`: 8/8 tasks, 0 cached; 0 errors, 6 existing warnings.
- `npm run test --workspace @stay-focused/shared`: 464/464, 44 files.
- `npm run test --workspace @stay-focused/mobile`: 1395/1395, 142 files.
- `npm run build --workspace @stay-focused/api`: 1/1, 35/35 pages.
- `npm run build --workspace @stay-focused/mobile -- --platform android`: 1/1,
  one Android bundle.
- `git diff --check`: PASS, zero whitespace errors; staged diff also PASS.

Additional FRESH checks: API suite with `--maxWorkers=2`: 2315 passed,
3 skipped, 201 files; AUTOPILOT forced root build: 8/8 tasks, 0 cached,
API 35/35 and web 19/19 pages plus mobile Android/iOS/web exports. Initial
API suite: 2314 passed/1 failed/3 skipped; unchanged local PGlite inventory
revision test exceeded its 15000ms timeout. Full two-worker retry passed
without timeout/assertion changes; resource contention is inferred. Initial
focused suite: 112 passed/5 failed due to invalid new Remake fixture ID;
corrected fixture yielded 117/117 (4 files). Later retry-ID regression is
covered by the full mobile suite. No hidden failed attempt or cached gate.
Existing Vite native/CommonJS and Expo color warnings remain. Minor inspection
and documentation-helper errors and repairs are recorded in acceptance.

Generated API/web Next declarations restored. Tracked tree clean after docs
commit; unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.
Local refs were ahead 46/behind 0 at baseline and will be ahead 49/behind 0
at closure; remote freshness UNVERIFIED (owner to confirm), no fetch or push.
No remote service call, deploy, SQL/migration, Scheduler operation, email or
environment-file edit. No credentials/private fixtures/outputs committed.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** Fely's mobile OTA/APK.
- **Device checks - NOT RUN, skipped entirely:** Realme Generate Reviewer,
  stay two seconds, generation opens; Generate then another tab within two
  seconds, remain there; Generate then home/background, no navigation on
  return; Generate all still opens Queue immediately.
- Production revisions, database rows, Scheduler, remote-ref freshness,
  real-account and physical-device behavior: **UNVERIFIED (owner to confirm)**.

Acceptance: [GN1/GN1b](acceptance/gn1-grace-navigation.md). Exact logs and
progress/status remain ignored under `tmp/overnight/GN1b*`. Endpoint reached;
no follow-on roadmap work is authorized by this run.

## WL1 - website Library compact Sort menu - PASS (2026-10-18)

Status: **PASS for the finite unattended code scope**. STEP 0-4, tests,
fresh serial gates, docs and local commits are done. No later slice started.
Branch `overnight/2026-10-15_feedback`, baseline `341cf62`.

Commits:

- `ea9ffa9 feat(web): library sort menu button`
- `docs: close WL1` (this documentation commit; final hashes are recorded in
  `tmp/overnight/WL1.status`). Both use the requested galaxymaxp author.

The native Library select is replaced by a compact icon + Sort button and
checked menu, preserving grid/course filtering, scope keys and persistence.
The menu reuses reviewer interactions and existing account-popover styling,
with a right-aligned viewport width cap; reviewer implementation is untouched.
Official SVG paths came from installed lucide-react-native; lucide-static
is absent. No shared extraction, ADR, dependency, API/schema or mobile change.

**FRESH PASS: 7/7 prompt gate commands:** forced root typecheck **8/8 tasks,
0 cached**; forced lint **8/8, 0 cached**, six existing warnings; web
**289/289** (42 files); shared **464/464** (44 files); API build **1/1,
35/35** pages; web build **1/1, 19/19** pages; `git diff --check` PASS.
Additional API tests **2315 passed, 3 skipped** (201 files, 2 workers,
live flags disabled); AUTOPILOT forced root build **8/8, 0 cached**;
staged diff PASS. Focused Library/reviewer tests **21/21** (2 files).
First typecheck: **FRESH FAIL**, 4 successful/6 total tasks, 0 cached,
three test-only TS2345 mock lookups; fixed with typed predicates, then
full fresh retry PASS. No test failure/flake. Next-generated declarations
were restored; validation outputs and unrelated baseline paths stay excluded.
See [acceptance](acceptance/wl1-library-sort-menu.md) for exact commands.

**UNVERIFIED (owner to confirm):** production revisions, database rows,
Scheduler state, remote-ref freshness and browser/device behavior. No remote
service operation, deployment, SQL/migration, Scheduler change, email,
environment-file edit or push was run.

**Owner steps remaining**

- Rollout: Fely's website deployment - **NOT RUN**, skipped entirely.
- Device checks: browser **1440 / 768 / 360px**, Library grid and course:
  menu opens, correct checked choice, choice persists after reload, keyboard
  Escape closes/refocuses - **NOT RUN**, skipped entirely.

## WD1 - draft activity instructions - PASS (2026-10-18)

Status: **PASS for the finite unattended code scope**. STEP 0-5, tests,
10/10 fresh serial prompt gate commands, additional AUTOPILOT forced root
build, docs and local commits are complete. Branch
`overnight/2026-10-15_feedback`, baseline `fe660af`. Resumed from the
interruption without redoing the committed API/shared change.

Commits (required galaxymaxp author):

- `8aa10db feat(api): expose assignment points in activity detail`
- `30a009e feat(web): draft aside shows activity instructions`
- `3817695 feat(mobile): draft editor instructions section`
- `docs: close WD1` (this documentation commit; exact final hash recorded
  after commit in ignored `tmp/overnight/WD1.status` and Git).

Web replaces the draft aside's outline with literal activity instructions,
due date and available points. Long instructions clamp to eight lines with
accessible Show all/Show less. Missing/unavailable activities fall back to
section/slide links only with 2+ items, without the Draft title link. Loading
is nonblocking. Status, warnings, Save and editor anchor IDs stay intact.
Mobile puts a default-collapsed Instructions Surface above the title with
chevron, expanded accessibility state and a 44pt minimum button. It reuses
useExperience and the existing owner-scoped activityDetailOfflineCache;
uncached unavailable activity is hidden. Tokens/primitives only, no new palette.

DTO decision: ActivityDetail gains optional nullable `pointsPossible`.
The existing owner-filtered assignment supplies points; local tasks use null.
No query/migration change; older clients and cached payloads remain valid.

**FRESH PASS - 10/10 prompt gate commands:**

- `npm run typecheck -- --force`: 8/8 tasks, 0 cached (saved initial-session
  passing log; no subsequent code edits).
- `npm run lint -- --force`: 8/8 tasks, 0 cached, zero errors, six existing
  warnings (one web unused useMemo; five mobile import-order).
- `npm run test --workspace @stay-focused/api -- --maxWorkers=2`:
  2316 passed / 3 skipped, 201 files; process-local B24_6_LIVE=0 and
  B24_7_LIVE=0 disable opt-in remote cases.
- `npm run test --workspace @stay-focused/shared`: 464/464, 44 files.
- `npm run test --workspace @stay-focused/web`: 297/297, 43 files.
- `npm run test --workspace @stay-focused/mobile`: 1401/1401, 143 files.
- `npm run build --workspace @stay-focused/api`: 1/1, 35/35 static pages.
- `npm run build --workspace @stay-focused/web`: 1/1, 19/19 static pages.
- `npm run build --workspace @stay-focused/mobile -- --platform android`:
  1/1 local Android export, one bundle, EXPO_OFFLINE=1.
- `git diff --check`: PASS, zero whitespace errors; staged diff also PASS.

Additional `npm run build -- --force --env-mode=loose`: **FRESH PASS, 8/8
tasks, 0 cached**, including Android/iOS/web exports. Loose mode carries
process-local offline/no-telemetry flags through to child builds. Generated
API/web Next declarations were inspected and restored; outputs/logs excluded.
Focused results: API 82/82; web 8/8; mobile 94/94 (2 files), including real
SQLite offline remount and owner isolation. Initial focused fixture failures
(web 3 pass/5 fail, then 7 pass/1 fail; mobile 92 pass/2 fail) and the first
typecheck's test-only TS2345 failure (6 successful/8 total tasks) were repaired.
The old API log stopped at startup with no completion/counts and was rerun.
No failures/retries/flakes in resumed full suites; no weakened assertions,
timeouts or validation. Existing Vite config and Expo color advisories remain.

**UNVERIFIED (owner to confirm):** production revisions, database rows,
Scheduler state, remote-ref freshness and browser/phone behavior. No remote
service operation, deployment, SQL/migration, Scheduler change, email,
environment-file edit or push was run. Baseline untracked `UI/`,
`apps/mobile/.gitignore` and `supabase/.temp/` are preserved. Local refs
are ahead 55 / behind 0 after closure relative to locally recorded
`github/main`; no remote freshness claimed.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** Fely's API/web deployment and
  mobile OTA/APK. The Vercel CLI is missing in this session; installing
  `npm i -g vercel` is recommended for the owner's deployment tooling.
- **Device checks - NOT RUN, skipped entirely:** browser 1440/768px,
  Canvas-linked Library draft Instructions/due/points, long-text toggle and
  unavailable-activity minimal outline. Phone: collapsed by default, expand,
  and offline instructions after one online open.

[WD1 acceptance](acceptance/wd1-draft-activity-instructions.md) contains the
baseline, matrix, commands, failures and limits. Endpoint reached; no later
roadmap slice was started or authorized.

## MD1 material descriptions - STOPPED at preflight (2026-10-18)

Baseline `665c156`, branch `overnight/2026-10-15_feedback`. Read the full MD1
prompt and both referenced roadmaps. STEP 0 is partial; implementation steps
1-6 are NOT RUN. No later slice started. UNATTENDED rule 4 requires this
checkpoint and STOPPED after a preflight surprise, without asking questions.

The Canvas worker has two post-commit `extractPreparedFigures` hook sites
(lines 92 and 119), not the three STEP 0.2 requires confirming. Manual uploads
also start reviewer generation immediately (ADR-037), extracting inside the
accepted job. They do not have the selectable material detail pane before
Generate described in MD1's goal. A description attachment hook alone cannot
supply that pre-generation manual UI.

**Exact owner question (recorded, not sent):** May MD1 target the two actual
Canvas post-commit hook sites plus the separate manual source attachment
path, preserve MR2's immediate manual reviewer generation, and limit
pre-generation detail-pane display to Canvas materials; or should manual
uploads gain a separate preparation/detail/Generate flow first?

**Commits:** one local documentation checkpoint, `docs: checkpoint MD1
preflight stop`, author `galaxymaxp <omgraythekid@gmail.com>`. Its resulting
hash is recorded in Git and `tmp/overnight/MD1.status`; no self-referential
commit amendment. Only the acceptance report, three planning files and this
handoff were changed. No code, migration or ADR was added. **Migration file
name: none.** The preparation/manual schemas are in `packages/db/migrations/`;
`supabase/migrations/` contains only the course-batch migration. Latest across
both tracked directories is `20261018000100_failed_generation_retry.sql`, so
any future MD1 migration must sort after it.

**Gates:** FRESH PASS **1/10** prompt gate commands (`git diff --check`, zero
whitespace errors); **9/10 NOT RUN** at the preflight STOP: root forced
typecheck/lint, API/shared/web/mobile tests, API/web builds and Android export.
Tests: **0 run**, no suite result claimed. Staged diff hygiene also FRESH PASS.
First diff check found one new blank line at EOF in the sprint checkpoint;
removed and rechecked before commit. No test failure or flake occurred.
Read-only Windows wildcard searches had path errors; exact-path reads and
repository-wide searches established the findings. Python was unavailable for
an attempted documentation edit; the edit was completed with Node instead.
This is a documentation checkpoint, not MD1 completion or production acceptance.

**UNVERIFIED (owner to confirm):** production revisions, database rows/applied
migrations, Scheduler state, remote-ref freshness and browser/phone behavior.
No remote service call, deployment, SQL, Scheduler operation, email,
environment-file edit or push. Unrelated untracked `UI/`,
`apps/mobile/.gitignore` and `supabase/.temp/` are preserved.

**Owner steps remaining**

- Resolve the recorded preflight question; implement MD1 steps 1-6 and run
  every fresh gate before marking the feature done.
- **Rollout - NOT RUN, skipped entirely:** after implementation, apply the
  new migration, optionally set `MATERIAL_DESCRIPTION_MODEL`, deploy API /
  Google worker / web and publish mobile OTA/APK. Existing prepared materials
  need re-preparation or a separately approved backfill; none was written or
  run. For the owner's later Vercel tooling, installing the missing CLI with
  `npm i -g vercel` is strongly recommended; no installation or CLI use here.
- **Device checks - NOT RUN, skipped entirely:** phone/browser descriptions
  for prepared PDF/PPTX/Canvas pages, absent-description behavior and Generate
  staying usable; clarify manual-upload acceptance first.
- Future only: cross-student cache reuse for identical files. Owner isolation
  remains required.

[MD1 acceptance](acceptance/md1-material-description.md) records the complete
baseline and retained preflight findings. MD1 remains unfinished; resume only
with the recorded scope assumptions resolved.

## QZ1 question-number jump - PASS locally (2026-10-18)

**Status: PASS for the finite unattended code scope.** STEP 0-4, tests,
gates, docs and local commits completed on `overnight/2026-10-15_feedback`
from baseline `8bf6b2d`; no later slice started. Mobile's progress label now
opens the existing scrollable Questions Sheet with compact state chips;
saved-only questions use a local list. Web's progress button opens a native
dialog, sharing dots with the desktop rail, with Escape/outside/Done dismissal
and focus return. Active attempts still use moveTo. Scoring, attempt
persistence and API behavior are unchanged. **Flagged: not implemented**
(the quiz model has no flag state). No migration or ADR was needed.

**Commits:** `3eb0be0 feat(shared): quiz question states helper`,
`8df68cc feat(mobile): tap question number to jump`,
`0880274 feat(web): question jump dialog`, and `docs: close QZ1` (this
commit; final hash in Git and `tmp/overnight/QZ1.status`). All commits use
`galaxymaxp <omgraythekid@gmail.com>`; no push.

**Gates: FRESH PASS 9/9 prompt commands.** Forced root typecheck/lint each
8/8 tasks, 0 cached; shared 470/470 tests (45 files), mobile 1406/1406
(143 files), web 304/304 (44 files). API build 1/1, 35/35 static pages;
Android export 1/1; web build 1/1, 19/19 static pages; diff/staged-diff
hygiene 0 errors. Additional AUTOPILOT forced root build FRESH PASS 8/8
tasks, 0 cached, including Android/iOS/web exports. Six existing lint
warnings remain. Focused shared 6/6, mobile navigation/slider 39/39 and web
7/7 passed. First focused web run had 2 pass / 5 fail from fixture/mock
issues; first web typecheck had 2 test typing errors. Fixed and rerun green;
no validation weakened. Documentation diff caught one EOF blank line,
removed before the passing retry. Full suites/builds had no failures or
flakes. Next-generated declarations were inspected and restored.

**UNVERIFIED (owner to confirm):** production revisions, applied database
state, Scheduler state, remote-ref freshness and real browser/phone behavior.
No remote service operation, deployment, SQL/migration application, Scheduler
change, email, environment-file edit or push. Unrelated `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` are preserved; tmp/logs/build
artifacts are excluded from commits.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** ship in the next fullsend (RB6).
  For later owner Vercel tooling, installing the missing CLI with
  `npm i -g vercel` is strongly recommended; no install/CLI use in this run.
- **Device checks - NOT RUN, skipped entirely:** on the Realme, open a 10+
  question quiz, tap Question N of M, and jump to an unanswered question.
  Repeat on the website at 390px and desktop; check dismissal/focus return
  and scrolling through a long quiz. Native browser/physical behavior is
  not established by the component tests.

[QZ1 acceptance](acceptance/qz1-question-jump.md) records the baseline,
acceptance matrix, exact commands/counts, failed first attempts and owner steps.

## MD1b material descriptions - PASS locally (2026-10-18)

MD1b resolves and supersedes the historical preflight STOP at `8bf6b2d`.
Finite unattended STEP 0-6, tests/gates/docs/local commits are complete from
baseline `b7ff2d2` on `overnight/2026-10-15_feedback`. No later slice started.

Canvas preparation generates a source-only description once per exact revision
after its result commits, at both existing figure-hook sites. Separate safe
owner metadata leaves private prepared payloads immutable/service-only. Atomic
reservations prevent repeated charges; empty extraction records skipped_empty,
failures retain failed, and guards/exhausted quotas skip supplementary work.
Only 6,000 source characters, low reasoning effort, 600 output tokens, an
eight-second provider timeout and zero retries are allowed; descriptions are
plain text, one or two sentences, at most 240 Unicode code points.

One owner-bound material-page lookup validates revision and original bytes;
missing/outage metadata maps to null. Mobile bodySmall and the web muted
paragraph render above Generate only when present, using existing tokens and
without changing availability. Manual uploads start nonblocking best-effort
metadata after attachment and retain immediate generation; existing personal
Library cards display it beneath source filenames through one batched lookup.
ADR-046 records the
storage/model/cap/quota decisions; the new migration is a FILE ONLY.

Implementation commits:

- `0f2e2d8 feat(db): add material description cache migration file`
- `7ef8fa5 feat(api): describe exact material revisions after extraction`
- `5865036 feat(mobile): show material descriptions above Generate`
- `2afa3bb feat(web): show material descriptions above Generate`
- `efd2883 feat: show manual material descriptions in Library`

**FRESH PASS: 10/10 prompt gate commands**, executed serially against the
final implementation:

| Command | FRESH result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2350 passed / 3 skipped, 204 files; live cases disabled process-locally |
| `npm run test --workspace @stay-focused/shared` | 476/476 passed, 46 files (existing compiled test copies included) |
| `npm run test --workspace @stay-focused/web` | 308/308 passed, 44 files |
| `npm run test --workspace @stay-focused/mobile` | 1410/1410 passed, 143 files |
| `npm run build --workspace @stay-focused/api` | 1/1 build, 35/35 static pages |
| `npm run build --workspace @stay-focused/web` | 1/1 build, 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1/1 local export, 1 Android bundle; EXPO_OFFLINE=1 |
| `git diff --check` | PASS, 0 whitespace errors; staged check also PASS |

Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
**FRESH PASS, 8/8 tasks, 0 cached**, including Android/iOS/web exports.
Loose mode preserves process-local offline/no-telemetry flags in child builds.
Additional provider contract: **FRESH PASS 20/20, 0 failed (fake provider clients only)**. Workflow regression:
**NOT APPLICABLE: no Workflow runtime/step changes; no tracked workflow test sources exist; changed attachment hook covered by API/manual/worker regressions**. Neither calls a live provider.

Failed first attempts retained in acceptance: manual-display mobile focused
**93 passed / 1 failed** (missing personal-route fixture), then **94/94**;
manual-display full API **2349 passed / 1 failed / 3 skipped** (unwanted null
metadata changed the legacy Library summary shape), then **2350 passed /
3 skipped** after preserving absent optional metadata. The unchanged SQL
baseline/read regression passed **8/8**. No nondeterministic flakes or weakened
assertions, timeouts or validation.

**UNVERIFIED (owner to confirm):** production revisions, database rows/applied
migrations, Scheduler state, remote-ref freshness and real browser/phone/provider
behavior. No remote service operation, deployment, remote SQL/migration,
Scheduler change, email, environment-file edit or push was performed.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` are
preserved. Temporary logs, generated build outputs and validation artifacts are
excluded from commits; Next-generated declarations were inspected/restored.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** apply
  `packages/db/migrations/20261018000200_material_descriptions.sql`, optionally
  set `MATERIAL_DESCRIPTION_MODEL`, deploy API / Google worker / web, and
  publish mobile OTA/APK in the next owner fullsend. The Vercel CLI is missing;
  installing `npm i -g vercel` is strongly recommended for the owner's later
  deployment tooling. No installation or CLI use occurred here.
- Existing prepared materials need worker redelivery/re-preparation to acquire
  metadata. Broad existing-material coverage needs an owner backfill decision;
  no backfill was written or run. Normal Generate reads never call the model.
- **Device checks - NOT RUN, skipped entirely:** phone/browser prepared
  PDF/PPTX/Canvas-page description above Generate; missing description adds
  nothing; Generate still works; completed manual uploads show cached descriptions
  beneath their existing personal Library filenames. Provider quality/latency and physical/browser
  behavior remain owner acceptance.
- Manual uploads retain ADR-037 immediate generation. Existing personal Library
  cards show cached descriptions beneath the original filename on mobile/web.
  Optional manual metadata is started without awaiting it and may be lost when
  a worker exits; no background completion guarantee is claimed.
- Future only: cross-student reuse for identical files; owner isolation remains.


Closing commit: `docs: close MD1b` (this commit; final hash in Git and `tmp/overnight/MD1b.status`). All commits use `galaxymaxp <omgraythekid@gmail.com>`; no push.

[MD1 acceptance](acceptance/md1-material-description.md) records the baseline, exact counts and limitations. No later roadmap item was started.

## IF1 unattended Save image diagnosis and repair - 2026-10-18

**Status: PASS for the finite unattended code scope.** IF1 / BACKLOG
N10 STEP 0-4, regressions, gates and docs resumed from the interrupted dirty
tree at `2b6cad3` on `overnight/2026-10-15_feedback`; no committed work repeated.
Required ancestors `0d7bfed`, `dfbf466f` and `c78e4b54` are present. The local
main ref is stale at `d00a543`; release comparison uses `0d7bfed` without fetch.

FX1b already refreshes owner-scoped URLs and exposes safe failure stages, but
the interrupted deeper inspection found a remaining filename defect. Raw spaces,
Unicode and punctuation in cache file URIs can defeat Android MIME lookup and
reject the album call before directory creation. IF1 encodes only the filename
URI component, preserving the native decoded filename, original image, existing
permissions, success copy and **Stay Focused** destination. Six native-contract
cases reproduce the old failure. No dependency, permission, runtime, API, schema
or save-design change; no ADR required. Initial no-product-change notes are
superseded. The historical phone exception remains unknown.

| Candidate cause | Evidence | Fixed on HEAD by | Test |
| --- | --- | --- | --- |
| Stale signed figure/snapshot URL | Release `SourceFigures.tsx:95`, `SourcePageSnapshot.tsx:129`, `saveImage.ts:28`; server signs for 600 seconds (`source-figures/sections.ts:104-106`) | Existing FX1b `dfbf466f` / OI1 `c78e4b54` proactively refresh exact owner identity | Stale 403 then deliberate retry through refresh succeeds; refresh before bytes, changed-source refusal retained |
| Unsupported source URI | Release `saveImage.ts:27-36`; source service validation already requires HTTPS | Existing refusal retained, with safe `download` stage (`studyImageFile.ts:18-25`) | data/content/http refused before gallery write |
| HTTP/network/non-image/empty bytes | Release `saveImage.ts:28-31,37-38`; loaded pixels do not prove a later byte request succeeds | Existing FX1b/OI1 safe HTTP/download/not_image/empty stages | 302/401/403/404/429/500/503, rejection, MIME and empty/invalid-size regressions |
| Android permission/native write; alleged copyAsset=false move bug | Expo `MediaLibraryModule.kt:155-170,309-320,393-400`, legacy JS `MediaLibrary.ts:779,783-815`; without asset ID, initial-file path ignores copyAsset; API 30 write permission is WRITE_EXTERNAL_STORAGE | No speculative native change; FX1b reports media_write. Actual APK permission/OEM/query behavior UNVERIFIED | Exact Android album arguments, write-only photo request, awaited native write; simulated storage exception preserves local original and cleans only cache |
| Extension/MIME mismatch | Release `saveImage.ts:30-33`, shared `image-download.ts:12-18` already choose MIME extension; Expo `MediaLibraryUtils.kt:190-196` uses extension | Existing MIME rename retained | Misleading PNG suffix/JPEG response renames before insertion; rename rejection publishes nothing |
| Unescaped cache filename URI | Release `saveImage.ts:26,33`, starting HEAD `saveImage.ts:50,52`; Expo `MediaLibraryUtils.kt:190-196`, `CreateAlbum.kt:50-58`; installed Android SDK `MimeTypeMap.java:48-77` restricts filename characters before extracting extension | IF1 `saveImage.ts:50-57` encodes filename for download and rename; native path/display-name decoding preserves readable title | Six contract regressions fail on pre-fix code and pass after encoding: spaces, Unicode, hash, apostrophe/ampersand, literal punctuation and percent |
| Hidden module/permission/cache/native exception | Release catch `saveImage.ts:49-50` discards all exception evidence | Existing FX1b stage-only logging and plain notices retained | Module suite and stage tests; four new Alert cases expose safe messages and reenable Save |

Mobile reviewer paths in the table are under
`apps/mobile/src/features/reviewer/`; shared under `packages/shared/src/`,
server under `apps/api/src/lib/`, Expo under `node_modules/expo-media-library/`.
Android source was inspected in local SDK `sources/android-37.0/android/webkit/`.
Contract mocks are not physical MediaStore/OEM execution.

**Final verification (FRESH):** 6/6 prompt commands PASS: forced typecheck
**8/8 tasks, 0 cached**; forced lint **8/8 tasks, 0 cached**, zero errors and
six existing warnings; full mobile **1434/1434 tests, 143 files**; API build
**1/1, 35/35 static pages**; Android export **1/1, one bundle**; diff hygiene
**0 whitespace errors**, staged check also PASS. Focused development suite
**99/99, five files**. Additional AUTOPILOT
`npm run build -- --force --env-mode=loose`: **8/8 tasks PASS, 0 cached**,
including API, web and Android/iOS/web exports. Gates ran against implementation
now committed as `bcd9ad6`; only documentation and inspected/restored generated
ambient declarations changed afterward. Loose mode retains process-local offline,
no-telemetry and Node outbound-connection guard flags in child builds.

Failure history retained: intentional pre-fix filename red run **43 passed /
6 failed**; first green attempt **98 passed / 1 failed** (old test expected a
literal filename space), corrected to encoded expectation, then **99/99**.
Earlier full mobile **1428/1428** and pre-fix gates are superseded. First
resumed typecheck/lint/mobile launches failed before suites with preload
MODULE_NOT_FOUND because NODE_OPTIONS consumed Windows backslashes; corrected
only the invocation to forward-slash paths. No nondeterministic flakes or
weakened validation. Vitest retains its existing native-config/CJS warning and
Metro its existing color warning. Logs stay ignored in `tmp/overnight/IF1*`.

**Commits:** `bcd9ad6 fix(mobile): encode save image cache filenames for Android`;
`docs: close IF1` is this closing docs commit (final hash in Git and
`tmp/overnight/IF1.status`). Both use author
`galaxymaxp <omgraythekid@gmail.com>`. No push. Unrelated untracked `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` preserved. Temporary logs, build
artifacts and generated Next ambient declarations are excluded from commits.

**UNVERIFIED (owner to confirm):** actual failed image/URL/HTTP/native exception,
installed APK module and permission state, Realme Android/OEM behavior, shipped
or deployed revisions, database rows/applied migrations, Scheduler state and
remote-ref freshness. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
remote SQL/migration, Scheduler action, deployment, email, environment-file edit
or push was performed. No phone access attempted.

**Owner steps remaining**

- **Rollout - NOT RUN, skipped entirely:** ship reviewed changes in the next
  fullsend RB6/N9 via new APK or separately authorized OTA, following existing
  preflight. IF1 adds no native dependency or runtime change.
- **Device checks - NOT RUN, skipped entirely:** on Realme save a freshly
  opened source figure and an external reference; confirm the **Stay Focused**
  album and intact original image. Include filenames with spaces, accents and
  punctuation; regress source-page Save too. If still failing, capture only the
  safe failure stage and Android permission/API/native evidence without private
  URLs or academic content.
- Fullsend row 4b's recorded FAIL is preserved; its IF1 follow-up links the
  diagnosis. No physical fix or production acceptance is claimed.

Endpoint IF1 only; no later slice started. [IF1 acceptance](acceptance/if1-save-image.md).

## OR1 unattended Today orb glow preflight - 2026-10-18

**Status: STOPPED at STEP 0**, baseline `4517181` on
`overnight/2026-10-15_feedback`. OR1 / BACKLOG P14 remains open; no OR2 work.
The supplied unattended rules require a stop on preflight surprises and when
the matching outer glow already exists in mobile code. No product changes
were made after finding this condition.

Mobile and web already use the same `createOrbAura()` shader, 3.3 plane,
0.86 mesh scale, outside-glass fade, additive blending, camera, host footprint,
day/time tint, alpha-zero clearing, sRGB and ACES exposure. Mobile has canvas
room beyond the glass and no clipping style in the inspected orb/host/ring.
Installed Expo Android GLView explicitly sets `isOpaque = false`. A concrete
cause for a mobile-only missing/weaker glow cannot be established from this
source comparison. The reduced render resolution is a known performance
difference, not proof of a missing halo. The PNG fallback lacks a separate
glow, but whether the reported phone was using it is UNVERIFIED. No speculative
alpha/shader/host change or second halo was added. The referenced
`overnight/roadmaps/2026-10-18-web-desktop-mobile-polish-profiles.md` and its
`overnight/` directory are absent; no matching tracked roadmap was found.

**Exact question for the owner:** Which installed mobile revision and render
path (live GL or PNG fallback), theme and time of day showed the weaker glow,
and should OR1 proceed with a static mobile-only halo despite the existing
matching GL aura? Please provide the missing testing roadmap or correct its path.
Recorded for morning; no response requested during the unattended run.

**Gate counts: 1/7 FRESH PASS, 6/7 NOT RUN, 0 failed.** Diff/staged-diff hygiene
passes with zero whitespace errors. Forced root typecheck/lint, mobile/shared
tests, API build and Android export are NOT RUN because STEP 0 stopped the
implementation. Additional AUTOPILOT root build NOT RUN; this checkpoint is
documentation-only. No test failures or flakes. Source-discovery misses and
the complete comparison are recorded in [OR1 evidence](acceptance/or1-today-orb-glow.md).

**Commits:** `docs: record OR1 preflight stop` is this scoped documentation
commit; final hash is in Git and `tmp/overnight/OR1.status`. Author
`galaxymaxp <omgraythekid@gmail.com>`. Progress/status files are not committed.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, deployment, remote
SQL/migration, Scheduler operation, email, environment-file edit or push.

**UNVERIFIED (owner to confirm):** installed/shipped revisions, actual mobile
render path, visual output, power behavior, production/database/migration/
Scheduler state and remote-ref freshness. Physical visual parity is not claimed.

**Owner steps remaining**

- Resolve the preflight question and missing roadmap before resuming OR1.
- **Rollout - NOT RUN, skipped entirely:** Preview OTA after an implementation
  is reviewed and the owner separately authorizes rollout.
- **Device checks - NOT RUN, skipped entirely:** Realme Today dark/light glow
  comparison, immediate ring handles, scrolling and Reduce Motion acceptance.

Endpoint: OR1 preflight STOP only; no further code step or roadmap slice started.

## IF2 / BACKLOG N11 unattended handoff - PASS (2026-10-18)

**Status: PASS for the finite code scope.** Completed STEP 0-4, tests, gates,
docs and local commits from baseline `7a70262` on
`overnight/2026-10-15_feedback`. No later slice started. Verified `0d7bfed`,
`a10642b2` and `37fcd169` are ancestors; all six requested main-to-HEAD paths
and the FX1/FX1b handoffs were inspected. No material rendering-path surprise.

Main's external card and viewer error callbacks explicitly close the viewer.
HEAD already replaces those callbacks with retained error UI. Main also already
uses bounded raster Commons thumbnails; the later API commit adds GIF filtering.
The missing pending-card feedback remained on both clients: IF2 adds a native
existing-token indicator and a web muted loading status, keyed to the same
URI/Retry attempt. Successful load clears it, errors replace it with the
existing Retry/Commons controls, and Retry/new URI restores loading feedback.
Sourcing, allowlist, attribution, source priority and design architecture stay
as implemented; no ADR or native/schema/dependency change is required.

### Candidate-cause table

| Cause | Evidence | Fixed on HEAD by / verdict | Test |
| --- | --- | --- | --- |
| SVG/non-raster/oversized original | `0d7bfed:apps/api/src/lib/external-visuals/commons.ts:73,75,79` already selects thumburl/dimensions and PNG for SVG. | Already guarded on main; actual returned bytes UNVERIFIED. | Explicit SVG original to PNG thumbnail regression; raw SVG/oversize guards. |
| Unsupported GIF | Current `commons.ts:78-81`; main allowed GIF. | `37fcd169` excludes new GIF candidates, not a rewrite of cached rows; phone cause unproved. | Existing GIF MIME/path cases. |
| Wikimedia header rejection | Main already passed User-Agent; current `externalVisuals.ts:8`, `ExternalVisual.tsx:41,55`. | FX1b updates configured version; header presence predates main. Actual HTTP rejection UNVERIFIED. | Configured-version/contact and card/viewer header assertions. |
| Redirect host rejected | `externalVisuals.ts:29`, shared `reviewer-images.ts:56,80`, API `commons.ts:49,99`. | Existing thumb-to-upload normalization/strict allowlist; native redirects do not use the metadata parser. Invalid metadata omits the card. | Normalized thumbnail acceptance, alternate/local host rejection; existing API normalization. |
| Empty/wrong-MIME local copy | Main external offline path hidden; current `studyImageFile.ts:19-27`, `localLibrary/offlineImages.ts:108,160,181-186`. | OI1 validates before local publication/reconciles empty files. Later corruption possible, unproved; no cache-policy change. | Existing offline validation and new saved-file decode error retaining viewer. |
| Error clears open/result | `0d7bfed:ExternalVisual.tsx:36,46` closes on error; current lines 22-24 and 51-55 retain open/result. ImageViewer lines 55/61 only gesture/back dismissal; ZoomablePage line 178 forwards supplied onError. | `a10642b2`; no error-to-null external result remains. Intentional identity/source/offline/Ask closes retained. | Same Modal/no onClose on card/viewer error, Retry remount/new key and viewer zoom reset. Main counterfactual fails on actual unmount. |
| Silent pending card | Baseline ExternalVisual/SectionVisual render Image/img without loading feedback. | `5b7c41e` IF2 mobile/web attempt-keyed pending UI. | Loading/decode/new URI/retry cases; baseline counterfactual probes fail. |

Cached found rows retain their stored image URLs (`external-visuals/service.ts:21,58`).
No claim is made that every historical stored file is newly GIF-filtered or
decodable. This run preserves sourcing rules and makes pending/error states
visible; it does not infer the actual phone response from a possible format.

### Gates and commits

**FRESH PASS: 8/8 expanded prompt gate commands, 0 failed.**

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached. |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 pre-existing warnings. |
| `npm test --workspace @stay-focused/mobile` | 1439/1439, 143 files. |
| `npm test --workspace @stay-focused/api -- --maxWorkers=2` | 2351 passed, 3 existing live skips, 204 files. |
| `npm test --workspace @stay-focused/web` | 309/309, 44 files. |
| `npm run build --workspace @stay-focused/api` | PASS; 35/35 static pages. |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS; one Android bundle, 4266 modules. |
| `git diff --check` | PASS; staged-diff hygiene also PASS. |

Additional AUTOPILOT `npm run build -- --force`: **FRESH PASS, 8/8 tasks,
0 cached**, including web/API builds and Expo exports. Gates ran serially;
live flags disabled and process-local external socket guard/offline export
preserved through Turbo build children. No remote calls sent. Generated
next-env changes were restored; validation outputs remain uncommitted.
Standalone shared/workflow/provider suites are NOT APPLICABLE to unchanged
boundaries. Device/rollout acceptance is NOT RUN.

Focused checks: mobile component/service 37/37, web SectionVisual 7/7,
API Commons 24/24. Intentional counterfactual reds: main viewer 2 failed /
18 skipped at the actual viewer-unmount assertion; baseline pending feedback
mobile 2 failed / 18 skipped and web 1 failed / 6 skipped. Restored current
implementation passes. First tooling attempts needed Windows preload path
normalization and Node instead of the absent Python launcher; the first
counterfactual probe's single-child key assumption was corrected before the
valid unmount proof. No nondeterministic flake observed. Existing Vite/Expo
environment warnings remain; details are in the acceptance report.

Commits:

```text
5b7c41e fix(reviewer): show loading for external reference images
docs: close IF2 (this footer; final hash in Git and tmp/overnight/IF2.status)
```

Author `galaxymaxp <omgraythekid@gmail.com>` for both local commits. No push,
branch switch, deployment, migration/remote SQL, Supabase/Vercel/Google Cloud/
Canvas/Resend call, Scheduler operation, email or environment-file edit.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved;
no `tmp/` path is committed. Planning files and the fullsend follow-up are
reconciled, preserving the recorded fullsend FAIL/NOT RUN results.

**UNVERIFIED (owner to confirm):** actual failed image URL/HTTP status/redirect
chain/decode bytes, problematic stored row, installed APK contents and native
behavior, production revisions/database rows/Scheduler state and remote-ref
freshness. Local tests establish error/loading behavior, not physical acceptance.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** include reviewed changes in the next
  BACKLOG RB6/N9 fullsend, new APK or owner-authorized OTA; account for existing
  FX1b API GIF/web changes as applicable.
- **Device checks - NOT RUN, skipped entirely:** on Realme topic 2 verify the
  external image loads or shows Retry, pending loading is visible and image
  failure retains the viewer with Retry/Open on Commons. Recheck long viewer
  overflow for row 2b. Capture the actual failing response/decode evidence if
  loading still fails; do not infer an HTTP/format cause from this analysis.

[IF2 diagnosis, full diff notes and local evidence](acceptance/if2-external-image.md).
Endpoint: IF2 code scope complete; no further roadmap task started.

## OR1b / BACKLOG P14 unattended handoff - PASS (2026-10-18)

**Status: PASS for the finite code scope.** STEP 0-4, tests, all seven prompt
gates, additional forced root build, docs and local commits complete from
`9f53e47` on `overnight/2026-10-15_feedback`. OR1b's explicit owner answers
supersede OR1's historical preflight STOP at `7a70262`; its source comparison
was reused. The quoted owner roadmap section supplies the required scope.
No OR2 or later roadmap slice started.

`8eca072` adds an absolute static `react-native-svg` radial halo inside DayOrb,
behind both GL and PNG. Existing day aura tint is memoized by minute and reused
by the existing scene runtime. Peak alpha is 0.35 dark / 0.16 light, just outside
the unchanged glass radius, fading to zero before the ring/handles and canvas
edge. The center remains transparent, with the readout/ring above the orb.
Both halo and host pass touches through. No animation, timer, frame callback,
extra GL pass, native module or dependency was added; existing reduced render
resolution, touch pause, foreground/live/Reduce Motion controls are retained.
The static glow remains for Reduce Motion, live=false and failed-GL PNG fallback.

**Cause found / limits:** the PNG path lacked any independent outer glow. The
live GL path uses only additive light into a transparent Expo surface. A bounded
inspection of installed Three found non-premultiplied additive blending uses
`SRC_ALPHA, ONE`, giving an isolated low-alpha fragment squared alpha coverage;
Expo Android TextureView is non-opaque. This is a concrete attenuation mechanism,
but the actual phone path/compositing cause is **UNVERIFIED (owner to confirm)**.
No renderer setting can be claimed as a proven device fix from this evidence.
The explicitly approved SVG layer supplies visible-alpha spill independently.
Existing web/mobile shader parity and adequate host room were already documented
by OR1; no shared/web shader, render pipeline, Generation/Queue orb, schema,
dependency or ADR change was made.

### Gates and commits

**FRESH PASS: 7/7 prompt gate commands, 0 final failures.**

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached, corrected second attempt |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/mobile` | 1446/1446 tests, 144 files |
| `npm run test --workspace @stay-focused/shared` | 476/476 tests, 46 files, including existing compiled copies |
| `npm run build --workspace @stay-focused/api` | PASS; 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS; 1 Android bundle, 4266 modules |
| `git diff --check` | PASS; staged-diff hygiene also PASS, 0 whitespace errors |

Additional AUTOPILOT `npm run build -- --force`: **FRESH PASS, 8/8 tasks,
0 cached**, including API/web builds and Android/iOS/web exports. Focused mounted
DayOrb suite **7/7 FRESH PASS** covers geometry, touch pass-through, two day
tones, light tuning, Reduce Motion/live=false single existing GL still frame,
and static PNG fallback. No added Animated value, timer or frame loop.

First forced typecheck: **7/8 tasks, 0 cached**, 8 test-only TS2345 diagnostics
from mocked host strings; corrected queries use typed component imports, then
all gates passed. No runtime test failure, nondeterministic flake, skipped test,
weakened validation or hidden failed attempt. Source filename discovery misses
were resolved with rg. A temporary PowerShell sprint encoding change was
corrected from Git's UTF-8 source before commit. Existing Vite configuration and
Metro color warnings remain.

Gates ran serially against code now committed as `8eca072`, with process-local
Node external-socket blocking, Expo offline/no-telemetry and Next/Turbo telemetry
disabled. Turbo loose environment mode preserved the guard in build children.
Next-generated declarations were inspected/restored. Validation logs, status,
progress, scripts and outputs remain uncommitted under `tmp/overnight/OR1b*`.
Separate API/web/workflow/provider tests are NOT APPLICABLE to unchanged
boundaries. Initial SVG rasterization/composition is not a zero-hardware-cost
claim; there is no added ongoing scheduled work.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

```text
8eca072 fix(mobile): add static outer glow to the Today orb
docs: close OR1b (this footer; final hash in Git and tmp/overnight/OR1b.status)
```

No push, branch switch, deployment, migration/remote SQL, Supabase/Vercel/Google
Cloud/Canvas/Resend call, Scheduler operation, email or environment-file edit.
Unrelated untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved;
no tmp path or generated build output is committed. Planning files reconciled.

**UNVERIFIED (owner to confirm):** actual phone GL versus PNG path, Android
compositing, installed/shipped/deployed revisions, physical appearance and power
behavior, production database rows/applied migrations, Scheduler state and
remote-ref freshness. Local tests establish structure/lifecycle behavior, not
physical visual parity. No code blocker remains within OR1b's finite scope.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** reviewed Preview OTA through the
  existing release process. No new native dependency/APK requirement.
- **Device checks - NOT RUN, skipped entirely:** Realme Today dark/light soft
  glow against website, handles grabbing immediately, unaffected scrolling,
  clear readout, Reduce Motion without motion, fallback/inactive appearance and
  low-power behavior. Check subtle combined GL/SVG glow where GL aura already
  displays; final device tuning remains owner acceptance.
- For future Vercel deployment tooling, the CLI is absent; installing
  `npm i -g vercel` is strongly recommended. No installation or CLI call ran.

[OR1b implementation and local acceptance](acceptance/or1b-today-orb-glow.md).
Endpoint: OR1b code scope complete; no OR2 or further task started.

---

## TC1 / BACKLOG P15 - STOPPED at STEP 0 (2026-10-18)

Baseline `bb14b88`, branch `overnight/2026-10-15_feedback` (unchanged).
Read `tmp/overnight/prompts/TC1.md` in full and followed its unattended
overrides. Frozen scope was TC1 STEP 0-6/tests/gates/docs/local commits only.
No runtime work was started past the mandatory preflight stop; OR1b preserved.

**Finding:** the planner validator accepts overnight ISO ranges and tracked SQL
has no 24-hour/same-date restriction. However, the current Today day model
ends at midnight: `apps/api/src/lib/experience/mappers.ts:63` returns
`start + 86_400_000`; `composeToday` filters sessions against that boundary
(line 129), then derives current/next/later from the filtered timeline
(lines 138-139, 147). The route/service offer date and UTC offset, with no
extended read-window parameter. Changing Today to yesterday's date does not
include yesterday's plan sessions that start after midnight.

Local synthetic counterexample: October 17 window 22:00-04:00, October 18
01:30 current time, planned session 01:00-02:00 (UTC+08). Yesterday's Today
snapshot has no timeline/current/next; the next calendar date contains it.
TC1 STEP 0.3 requires STOP on this day-model incompatibility; unattended rule
4 requires committing the safe checkpoint and recording the owner question.
No server projection extension or client two-date composition was implemented.

**Exact question for the owner:** May TC1 extend the server Today read model
to include the wrapped end while preserving start-date ownership, or should
it instead compose two existing calendar-date snapshots in each client?
Please approve the approach and its treatment of current/next/later/progress
before resuming TC1. Recorded for morning; no unattended question was sent.

Verification, all local:

| Gate / check | Result |
| --- | --- |
| `node node_modules/vitest/vitest.mjs run --config tmp/overnight/TC1.vitest.config.ts` | FRESH PASS: 1 file, 5/5 diagnostic tests (two planner validator cases, midnight boundary, prior-date omission, next-date current/next) |
| `npm run typecheck -- --force` | NOT RUN: STEP 0 STOP |
| `npm run lint -- --force` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/web` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/shared` | NOT RUN: STEP 0 STOP |
| `npm run test --workspace @stay-focused/api` | NOT RUN: STEP 0 STOP; diagnostics are not a full API-suite run |
| `npm run build --workspace @stay-focused/api` | NOT RUN: STEP 0 STOP |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: STEP 0 STOP |
| `git diff --check` and `git diff --cached --check` | FRESH PASS: 0 whitespace errors |

Prompt gates **1/9 FRESH PASS, 8/9 NOT RUN, 0 failed**; additional AUTOPILOT
forced root build NOT RUN (documentation-only stopped checkpoint). The five
diagnostic checks establish the blocker, not feature completion. Initial
diagnostic launch exited 1 before collection because the absolute guard path
in NODE_OPTIONS lost Windows backslashes; repository-relative preload fixed
it and the retry passed. No assertion failures, skips or flakes. Existing
Vite ESM/CommonJS warning retained. Source-discovery misses were resolved
with rg; no code or validation output committed.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

```text
docs: record TC1 Today model preflight stop (this checkpoint; final hash in Git and tmp/overnight/TC1.status)
```

Planning files reconciled to STOPPED/open. Acceptance report:
[TC1 Today clock preflight](acceptance/tc1-today-clock-preflight.md).
STEP 0 partial; STEPS 1-6/tests/implementation gates and ownership ADR remain
unimplemented. No later roadmap work started. tmp progress/status, synthetic
test/config and logs remain uncommitted. Unrelated `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` preserved. Tracking comparison
73 ahead / 0 behind at baseline; no fetch, branch change or push.

**UNVERIFIED (owner to confirm):** installed/deployed revisions, production
DB rows/applied migrations, Scheduler state, remote-ref freshness and actual
device behavior. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
deployment, migration application, remote SQL, Scheduler operation, email or
`.env*` edit. Diagnostic process used a non-loopback socket guard.

### Owner steps remaining

- Resolve the recorded Today contract decision before resuming TC1; implement
  wrap helpers, planning/store/Schedule acceptance, ring behavior, date
  ownership, clock options menu, labels/tests/gates and ownership ADR.
- **Rollout - NOT RUN, skipped entirely:** Preview OTA and website preview
  after implementation and verification through the owner's release process.
- **Device checks - NOT RUN, skipped entirely:** Realme/web 22:00-04:00
  by dragging and typing, 12/24h device setting, plan beyond midnight, Today
  at 01:00, lock preventing drags and typed edits while locked.
- Vercel CLI is absent; for future owner rollout tooling, installing
  `npm i -g vercel` is strongly recommended. No installation or CLI call ran.

Endpoint: TC1 STOPPED at preflight; no TC1 runtime changes or later item.


---

## TC1b / BACKLOG P15 - PASS for finite code scope (2026-10-18)

Baseline `9430e20`, branch `overnight/2026-10-15_feedback` (unchanged).
Read the entire TC1b prompt and followed its unattended overrides. STEP 0-6,
local tests/gates/docs/commits only; no later roadmap item started. TC1's old
STOP is resolved by the supplied owner answer and ADR-047. Reused the original
TC1 preflight diagnostics as CACHED 5/5 without rerunning them; repository code
still accepts overnight planner ranges without migration or RPC changes.

**What changed:** shared start-date ownership and wrap math; exact ISO planning
ranges extending only through the wrapped morning; mobile/web storage and web
Schedule acceptance; clockwise arc, hit testing and handle/whole-block dragging;
validated optional server Today window bounds and one projection for timeline,
current/next/later/progress. Both clients read the previous date's existing key,
select yesterday before its wrapped end and today's trimmed snapshot afterward,
and switch while open at midnight/the end and on foreground/focus. Pending
preview responses cannot republish after their owning date changes.

The sole corner control is now a 44px Clock options ellipsis. Its existing lock
callback/key controls dragging and step adjustment; typed free-time fields use
the same commit/storage/planning callback even when locked. Mobile reuses the
reviewer measured-Modal pattern with typed hour/minute and device-locale AM/PM;
web reuses popover tokens and browser time inputs with Escape/focus restoration.
Equal/empty/invalid input stays inline without saving. Up next retains actual
source times; wrapped preview bars lift morning blocks and keep positive widths.
No new native dependency, migration, RPC/SQL, auth, provider or orb/halo change.

The approved next-date `startsAt=04:00` example controls the date-anchor rule:
the previous morning may be trimmed from the new date. Requiring every override
to include midnight would contradict that explicit owner example; ADR-047
records the interpretation and bounds. No client merges two snapshots.

### Gates and commits

**FRESH PASS: 9/9 prompt gate commands, 0 final failures.**

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, six existing warnings |
| `npm run test --workspace @stay-focused/mobile` | 1462/1462, 148 files |
| `npm run test --workspace @stay-focused/web` | 325/325, 48 files |
| `npm run test --workspace @stay-focused/shared` | 489/489, 47 files, including existing compiled test copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2369 passed / 3 intentional live-provider skips, 205 files; two workers bound local DB-test memory |
| `npm run build --workspace @stay-focused/api` | PASS, 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, one local Android bundle |
| `git diff --check` / staged / baseline-to-HEAD checks | PASS after correcting one trailing space; 0 final whitespace errors |

Additional AUTOPILOT gate `npm run build -- --force --env-mode=loose`:
**FRESH PASS 8/8 tasks, 0 cached**, including API/web builds and local mobile
Android/iOS/web exports. On resume at `11f9afa`, these completed gate logs were
inspected as **CACHED** evidence; no committed code or passing suite was redone.
Remaining work was documentation closure, restoration of inspected generated
Next declarations and fresh diff/link checks. The React review confirmed
effect/listener cleanup, strict props and labelled typed controls; physical
interaction remains owner acceptance.
Resume closure checks: **FRESH PASS**, 9/9 TC1b local documentation links
resolve; working-tree, staged and baseline-to-implementation diff checks have
0 whitespace errors. Generated Next declarations are restored to tracked content.
Workflow/provider contract suites are NOT APPLICABLE: no workflow runtime,
provider or generation boundary changed; API build compiles the existing workflow.
All gates ran locally with the socket guard and process-local offline/no-telemetry
flags. Live provider cases were disabled process-locally; no environment-file edit.

**Failed first attempts, repaired:** Python unavailable (no edit ran); initial
shared-test preload path failed before collection, corrected to quoted absolute
forward slashes (13/13 passed). Initial root typecheck 5/8 tasks: a CRLF marker
omitted clock model suffixes and a web hook edit missed; suffixes restored from
Git and hook repaired. Second typecheck 6/8: alert role moved from nonforwarding
Copy to its native View. Subsequent checks pass 8/8. Initial focused API run
49 passed / 10 failed on early-read assertions; moved validation ahead of bundle
reads, retry 59/59. Initial mobile preview/boundary run 3 passed / 1 failed because
a selector also matched a divider; limited it to percentage-width blocks. Initial
web full suite 323 passed / 2 mirror consistency failures; synchronized mirrors,
final 325/325. First lint passed with 11 warnings; removed introduced duplicate
directives/imports, final six existing warnings. Staged diff found one trailing
space in a new mobile test; scoped cleanup and complete implementation diff pass.
No nondeterministic flake, weakened validation, suppressed assertion or deleted
acceptance test. Existing Vite configuration and Metro color warnings remain.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

```text
d60b7d5 feat(shared): support start-date-owned overnight free time
2fd78d3 feat(api): extend Today read windows for overnight plans
862f193 feat(mobile): add overnight Today clock and options menu
65a2502 feat(web): support overnight clock planning and options
11f9afa style(mobile): clean clock ownership test whitespace
docs: close TC1b overnight clock (this footer; final hash in Git/status)
```

Planning files reconciled; [TC1b acceptance](acceptance/tc1b-today-clock.md) and
[ADR-047](../architecture/ADR-047-overnight-today-clock.md). TC1 preflight is
explicitly resolved while its historical findings remain. Build-generated
Next declarations are inspected/restored; temporary logs/scripts/status/progress,
exports and generated outputs are excluded from commits. Unrelated untracked
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.

**UNVERIFIED (owner to confirm):** installed/deployed revisions, production
DB rows/applied migrations, Cloud Scheduler state, remote-ref freshness and real
phone/browser appearance/keyboard behavior. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, deployment, migration application/remote SQL, Scheduler
operation, email, environment-file edit, branch switch or push.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** Preview OTA and website preview via
  the existing owner release process. No new native dependency/APK requirement.
- **Device checks - NOT RUN, skipped entirely:** Realme and web 22:00-04:00
  and 23:30-00:30 by dragging and typing, 12/24-hour device setting, plan and
  Up next past midnight, Today at 01:00, automatic switch at wrapped end, lock
  preventing drags and typed edits while locked. Confirm physical menu layout,
  keyboard, scrolling/handles and retained OR1b glow on the phone.
- Vercel CLI is absent; for future owner rollout tooling, installing
  `npm i -g vercel` is strongly recommended. No installation or CLI call ran.

Endpoint: TC1b local code scope complete; rollout/device acceptance stays with
owner. No further roadmap item started.

---

## WGP1 / BACKLOG P16 - PASS for finite code scope (2026-10-18)

Baseline c372b50 on overnight/2026-10-15_feedback, unchanged branch. Read the
full WGP1 prompt and followed unattended overrides. STEP 0-5, local tests,
gates, docs and commits complete; no later roadmap work.

Layout A is web only: orb and one live status in the first pane; material
name/page count, ordered real stages and actions in the second. Grid is
1.3fr/1fr from 1024px and stacked below; orb is min(60% of pane,70vh) on
desktop, with no old 300px cap in this page. Existing renderer, mobile,
polling, cancel/preparation Continue, MR3 retry identity/denial behavior and
1400ms saved-output navigation remain. Queue/leave links and explicit
Open reviewer/quiz labels match the requested states; saved Draft is retained.

STEP 0 found no OR2 commit/footer (current planning says not started); the
actual KnowledgeCore was inspected and no OR2 renderer dependency or missing
stage API was found. Shared extraction/reviewer stage orders are reused.
Quiz/Draft lists filter to their actual worker stages, including storing_result.
Progress indicates position of the reported stage, not an execution audit of
optional OCR/retry branches. Source pageCount is available when supplied;
course name and MD1 description cannot be resolved from this DTO (no material
or course key), so are omitted per STEP 0.3 with no endpoint/API field added.

### Gates and commits

**FRESH PASS 7/7 prompt gates, 0 final failures.**

| Gate | FRESH result |
| --- | --- |
| npm run typecheck -- --force | 8/8 tasks, 0 cached |
| npm run lint -- --force | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| npm run test --workspace @stay-focused/shared | 502/502 tests, 48 files; existing compiled copies included |
| npm run test --workspace @stay-focused/web | 342/342 tests, 50 files |
| npm run build --workspace @stay-focused/api | PASS, 35/35 static pages |
| npm run build --workspace @stay-focused/web | PASS, 19/19 static pages |
| git diff --check / staged / baseline-to-HEAD | PASS, 0 whitespace errors |

Additional AUTOPILOT forced root build with --env-mode=loose: FRESH PASS
8/8 tasks, 0 cached, including local Android/iOS/web exports. Final web lint
also passes (one existing library warning). Focused tests: 17/17 PASS.
A local synthetic CSS geometry probe passes 4/4 widths, 360/800/1024/1440:
no overflow with long filenames, correct stacking/grid and desktop orb sizing.
No app preview, authenticated job or device was opened; all requests blocked.
Workflow/provider contract suites NOT APPLICABLE (no affected boundary).

Failed first attempts retained: focused run 16 pass / 1 fail because a rejected
API mock leaked into cancellation coverage; mock reset fixed isolation. Initial
root typecheck stopped at 4/6 tasks on two TS2345 test-selector errors; valid
mock host tags fixed them. Final forced typecheck 8/8 and web 342/342 pass.
No nondeterministic flake, assertion weakening or runtime workaround. Existing
Vite CJS, React renderer deprecation and Metro warnings retained.

Commits, author galaxymaxp <omgraythekid@gmail.com>:

- 7799ef8 feat(web): desktop generation page layout
- docs: close WGP1 desktop generation layout (this footer; final hash in Git
  and tmp/overnight/WGP1.status)

Planning files reconciled. [WGP1 acceptance](acceptance/wgp1-desktop-generation.md).
Generated Next declarations inspected/restored. Logs, scripts, layout fixtures,
exports, progress/status and all tmp files excluded. Unrelated untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ preserved. Baseline tracking 80 ahead /
0 behind from local refs; no fetch or push.

**UNVERIFIED (owner to confirm):** deployed revisions, DB rows/applied migrations,
Cloud Scheduler state, remote-ref freshness, authenticated browser behavior and
physical appearance. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
deployment, remote SQL/migration application, Scheduler operation, email,
environment-file edit, branch switch or push. Local processes used the existing
non-loopback socket guard with offline/no-telemetry flags.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** website preview, running/failed/done
  at 1440px and 800px; big orb left/details right on desktop, stacking below
  1024px, Try again and Open reviewer/quiz working.
- **Device checks - NOT RUN, skipped entirely:** physical narrow/browser,
  keyboard and assistive behavior. CSS probe is not physical acceptance.
- Course name/MD1 description require an existing response linkage or a
  separately approved API change; no fabricated values are displayed.
- Vercel CLI is absent; for future owner rollout tooling, installing
  npm i -g vercel is strongly recommended. No installation or CLI call ran.

Endpoint: WGP1 local code scope complete; no later roadmap task started.

---

## OR2 / BACKLOG P14b unattended handoff - PASS for finite code scope (2026-10-18)

**Status: PASS.** STEP 0-7, tests, all eight prompt gates, additional forced root
build, docs and local commits complete from 67e9dc4 on
`overnight/2026-10-15_feedback`; branch unchanged. Read OR2 in full and obeyed
its unattended overrides. Rollout and Device checks skipped entirely. No later
roadmap slice started; no new native module, APK requirement or dependency.

### Implementation and STEP 0 findings

Shared pure functions classify tap/250ms hold/early scroll; keep an early scroll
sticky; step bounded two-axis momentum back to existing idle spin; project taps
onto the front hemisphere; produce a 650ms damped bulge and smooth 600ms color
fade (including rapid taps). The device key is `sf.orb.color`, using the existing
mobile sessionStore and guarded web localStorage. Invalid values and storage
failures are safe; late native reads cannot overwrite a new choice. Mounted
surfaces share local color changes; web tabs receive storage events.

Existing theme accent is neutral. The first palette gold therefore uses the
existing light.findActive #F4C542 token, followed by existing calm dark
green/violet/orange tokens, with no invented colors or theme changes.

Both existing body vertex stages were extendable. Matching shader text adds
optional uBulgeDir/uBulgeAmount and idle tint inputs; the zero-bulge fast path
retains the original vertex/normal math and skips displacement calculations.
The local deformation also adjusts its normal. Non-idle job states omit the
idle tint, while taps still bulge and advance the remembered idle index.
The four scenes sample ref state in their original loop; user rotation uses
inverse liquid coordinates so visible movement follows the pointer. Today
returns to its existing 80ms idle cadence after interaction. No second loop,
render pass, blur, timer-driven model or new idle frame scheduling is added.

**Touch ownership at preflight:** mobile
`apps/mobile/src/features/redesign/DayOrb.tsx` has a pointerEvents=none visual
wrapper; `DayRingClock.tsx` has a pointerEvents=none absolute orb host and
readout. OR1b's SVG halo also has pointerEvents=none. The full-clock
`day-ring-touch` View receives ring input; TodayScreen's touch handlers set
`dayOrbTouch` to pause rendering. These visual wrappers/halo and the screen
pause remain. A new ball-bounds responder is above the ring target, rejects
outside-sphere points, and delegates the original PanResponder lifecycle in
the overlapping 92..102 design-point band so ring/handles still win instantly.
It yields termination to scrolling until rotation starts. Mobile KnowledgeCore
previously used a full-frame imagebutton Pressable; it now has the same hidden,
ball-only responder and shared model. No new accessible/focusable control.

Web DayRingClock's host/readout/SVG previously passed through to the full-clock
`day-clock-touch` overlay. It now has a circular cutout only inside the existing
ring band, with the ball target below the ring target. Ball touch-action is
pan-y; pointer capture starts only on rotation. A cleaned-up nonpassive touchmove
listener suppresses panning only after a hold, before native scrolling commits.
The deferred Today still keeps its no-WebGL Reduce Motion path until deliberate
rotation requests a renderable still pose. Reduce Motion suppresses bulge and
release inertia, switches color instantly, and creates no ambient scene loop.
Generation/Queue generation views reuse KnowledgeCore; job lifecycle, navigation
and Queue launch controls are unchanged. OR1b halo and TC1b clock options/wrap
behavior are preserved.

### Gates and commits

**FRESH PASS: 8/8 prompt gate commands, 0 final failures.**

| Command | Final result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, six existing warnings |
| `npm run test --workspace @stay-focused/shared` | 520/520 tests, 50 files; compiled copies included |
| `npm run test --workspace @stay-focused/mobile` | 1473/1473 tests, 150 files |
| `npm run test --workspace @stay-focused/web` | 348/348 tests, 51 files |
| `npm run build --workspace @stay-focused/api` | PASS, 35/35 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, one local Android bundle |
| `git diff --check` / staged / baseline-to-HEAD | PASS, 0 whitespace errors |

Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
**FRESH PASS 8/8 tasks, 0 cached**, including web 19/19 pages and local
Android/iOS/web exports. Repeated after the final zero-bulge shader optimization;
both executions pass. Forced typecheck/lint and full mobile/web suites were
also rerun against final code. Shared initially passed 511/511 before build;
the new nine-test compiled copy makes the post-build total 520/520. This count
change is generated test duplication, not a flake. Focused model 9/9, mobile
shader/halo/target 15/15, generation state/RM 6/6 and initial web shader/pointer/
deferred 8/8 pass; all are included in full suites. Separate API full,
workflow and provider suites NOT APPLICABLE: those boundaries are unchanged.

Failed attempts retained: a local edit-script syntax error ran no edits, then
its test command collected 0 tests (exit 1); corrected script created the test.
Initial generation-renderer fixture 0 pass/6 fail because its mocked body
omitted ORB_RADIUS used by the real aura; fixed mock export, retry 6/6.
First full web 346 pass/1 fail because the new parity test compared complete
files with existing formatting differences; compare exact shader text and the
complete sampler as required, retry 347/347, final 348/348 after added direction
coverage. First lint passed with 12 warnings; stable handles/complete hook
dependencies removed six introduced warnings, leaving six existing warnings.
No assertion weakening, suppressed rules, skipped required test or nondeterministic
flake. Existing Vite config, React renderer deprecation and Metro color warnings
remain. Final React review checked refs, dependencies, cleanup, state precedence,
decorative accessibility and preserved deferred loading.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

```text
586e5bf feat(shared): add decorative orb interaction model
6da7225 feat(orb): add localized bulge and idle color shader inputs
5483726 feat(mobile): make Today and generation orbs interactive
39acf35 feat(web): add shared orb gestures and persisted colors
docs: close OR2 orb interaction (this checkpoint; final hash in Git/status)
```

Planning files reconciled. [OR2 acceptance](acceptance/or2-orb-interaction.md)
and [ADR-048](../architecture/ADR-048-orb-interaction.md) record implementation,
local evidence and tradeoffs. Generated Next declarations inspected/restored.
Logs, scripts, exports, status/progress and all tmp paths remain uncommitted.
Unrelated untracked `UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` are
preserved. Baseline local tracking 82 ahead/0 behind; no fetch or push.

**UNVERIFIED (owner to confirm):** deployed/installed revisions, production
DB rows/applied migrations, Cloud Scheduler state, remote-ref freshness,
authenticated browser use, actual scrolling/gesture arbitration, shader
appearance/compositing and physical power behavior. Local tests establish code
behavior and lifecycle, not physical acceptance. No Supabase, Vercel, Google
Cloud, Canvas or Resend call, deployment, migration application/remote SQL,
Scheduler operation, email, environment-file edit, branch switch or push.
Node children used the existing non-loopback socket guard and process-local
offline/no-telemetry flags. Build scripts were inspected before execution.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner Preview OTA and website preview
  through the existing release process. No new native module/APK requirement.
- **Device checks - NOT RUN, skipped entirely:** on Realme and desktop Today,
  generation and Queue generation view: tap color crossfade/bulge, 250ms
  hold-drag/inertia, quick vertical swipe scroll, immediate overlapping ring
  handles, Reduce Motion instant color/no bulge/no inertia, color persistence
  after restart, running/failed/done state priority, background/foreground and
  narrow layouts. Confirm actual glass deformation/shading and power.
- Vercel CLI is absent; for later owner deployment tooling, installing
  `npm i -g vercel` is strongly recommended. No installation or CLI call ran.

Endpoint: OR2 finite local code scope complete. Rollout/device acceptance stays
with the owner; no later roadmap item started.

---

## PF1 profile pictures unattended handoff - STOPPED (2026-10-18)

**Status: STOPPED at STEP 0.1.** Read `tmp/overnight/prompts/PF1.md` in full,
root AGENTS.md, AUTOPILOT.md, current planning headers, the preceding handoff
footer and the external 2026-10-18 roadmap. Baseline HEAD is `436128f` on
`overnight/2026-10-15_feedback`; no branch switch. Local tracking refs show
87 ahead / 0 behind, with remote-ref freshness unverified.

The initial `git status --short --untracked-files=all` found 23 pre-existing
untracked files: `UI/README.md`, 20 PNGs under `UI/screenshots/dark/` and
`UI/screenshots/light/`, `apps/mobile/.gitignore`, and
`supabase/.temp/cli-latest`. Tracked and staged diffs were empty. The OR2 footer
also identifies these paths as unrelated preserved work. PF1 STEP 0.1 says:
"If the tree has uncommitted owner edits, don't stash/commit them: STOP."
Their presence therefore triggers the stop even though earlier slices
preserved them. None was changed, removed, stashed or staged.

**Exact question for the owner (recorded only; nobody was asked):** May PF1
resume while preserving these 23 existing untracked files, or will you first
commit or move your files so the checkout meets PF1's clean-tree prerequisite?

STEP 0.2-0.7, implementation steps 1-6, migration file, ADR and avatar tests
were NOT RUN after the mandatory stop. No completed implementation slice is
claimed; current-state, roadmap and sprint implementation claims stay unchanged.

### Gates and commits

PF1 gate counts: **1/10 FRESH PASS, 9/10 NOT RUN, 0 failures**. Only handoff
documentation changed. No implementation test results or prior cached results
are claimed for this run.

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | NOT RUN: STEP 0 stop |
| `npm run lint -- --force` | NOT RUN: STEP 0 stop |
| `npm run test --workspace @stay-focused/shared` | NOT RUN: STEP 0 stop |
| `npm run test --workspace @stay-focused/api` | NOT RUN: STEP 0 stop |
| `npm run test --workspace @stay-focused/web` | NOT RUN: STEP 0 stop |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN: STEP 0 stop |
| `npm run build --workspace @stay-focused/api` | NOT RUN: STEP 0 stop |
| `npm run build --workspace @stay-focused/web` | NOT RUN: STEP 0 stop |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN: STEP 0 stop |
| `git diff --check` | FRESH PASS: 0 whitespace errors on handoff-only diff |

Local commit, author `galaxymaxp <omgraythekid@gmail.com>`:
`docs: record PF1 preflight stop` (this footer; final hash in Git and
`tmp/overnight/PF1.status`). Progress/status files remain uncommitted under tmp.

**UNVERIFIED (owner to confirm):** deployed API/web and installed mobile
revisions, provider session photo metadata, applied migrations/database rows,
Cloud Scheduler state and remote-ref freshness. No Supabase, Vercel, Google
Cloud, Canvas or Resend calls; no deployment, migration application, remote
SQL, Scheduler operation, email, environment-file edit or push.

### Owner steps remaining

- Resolve the clean-tree stop or explicitly authorize preserving the listed
  unrelated files, then resume PF1 from STEP 0.2 on the current HEAD.
- **Rollout - NOT RUN, skipped entirely:** after PF1 implementation and green
  local gates, apply the new avatar migration, deploy API/web and ship mobile
  through the owner release process. No avatar migration exists from this run.
- **Device checks - NOT RUN, skipped entirely:** after implementation/rollout,
  confirm Google/Microsoft provider photos; upload, replace and remove on web
  and mobile; initials/offline fallback; and cross-account storage denial.
- Vercel CLI is absent; for later owner rollout tooling, installing
  `npm i -g vercel` is strongly recommended. No installation or CLI call ran.

Endpoint: PF1 stopped before implementation under its explicit unattended
stop rule. No later roadmap task started.

## PF1b profile pictures - 2026-10-19

**Status: PASS for the finite local code scope.** Resumed from baseline
`1ad0039` on `overnight/2026-10-15_feedback`, after rereading the unattended
rules, PF1/PF1b progress, current planning files, AUTOPILOT, Git history/status/
diff and the existing migration/API/shared drafts. No implementation commit was
redone. Endpoint: PF1b only. Expected owner files were preserved.

Private `profile-avatars` Storage is service-managed through the existing
server-verified bearer API. The FILE ONLY migration adds owner-row RLS,
column grants, restrictive client Storage denial and service-only invoker RPCs.
The API bounds wire bytes to 2 MiB, checks magic/MIME/dimensions, uses the
existing canvas library to center-crop/resize/re-encode <=512px PNG, and returns
only a 600-second signed URL/expiry. CAS plus durable retirement protects
replacement/deletion across devices and retries failed cleanup. Shared source
order is uploaded, provider avatar_url, provider picture, initials (HTTPS only).
Web/mobile use one Avatar each, initials on image errors, Settings change/remove
controls with confirmation and busy/error recovery, and owner-keyed memory
which expires/reconciles and is discarded on sign-out. No auth/session format
change or new native dependency. ADR-049 records the decisions and crash caveat.

Local commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `14a10d5 feat(db): add private profile avatar storage migration`
- `74c07df feat(shared): resolve avatar sources and scope photo memory`
- `8ee9099 feat(api): manage owner-scoped profile photos`
- `6574093 feat(web): show and manage profile photos`
- `fc9a330 feat(mobile): show and manage profile photos`
- `docs: close PF1b profile photos` - final hash in Git and PF1b.status.

**FRESH PASS: all 10 prompt gates.** Exact commands, first-attempt failures,
limitations and the acceptance matrix are in
[PF1b acceptance](acceptance/pf1b-profile-avatars.md).

| Gate | FRESH result |
| --- | --- |
| Forced root typecheck | 8/8 tasks, 0 cached |
| Forced root lint | 8/8 tasks, 0 cached; zero errors, six pre-existing warnings |
| Shared tests | 542/542, 52 files |
| API tests | 2397 passed / 3 skipped live cases, 209 files |
| Web tests | 353/353, 54 files |
| Mobile tests | 1481/1481, 154 files |
| API build | 36/36 static pages; avatar route includes native canvas tracing |
| Web build | 19/19 static pages |
| Android build | One local bundle/export, offline Expo |
| Diff hygiene | Zero whitespace errors, unstaged and staged |

Additional AUTOPILOT forced root build (`--force --env-mode=loose`):
**FRESH PASS 8/8, 0 cached**, including local Android/iOS/web exports.
Final isolated API/security suite: **FRESH PASS 28/28, four files**.
Workflow and provider-contract suites: NOT APPLICABLE (unchanged boundaries).
Three new-fixture typecheck failures and one CORS preflight fixture failure
were corrected and retained in acceptance evidence; no full-suite failure or
nondeterministic flake. New import-order warnings were fixed; remaining six
lint warnings predate PF1b. Logs/exports stay uncommitted under ignored tmp/dist;
Next-generated ambient type changes were restored.

**UNVERIFIED (owner to confirm):** live Google/Microsoft photo metadata,
deployed API/web and installed mobile revisions, applied migrations/database
rows, Scheduler state, remote-ref freshness and authenticated production/device
behavior. No Supabase, Vercel, Google Cloud, Canvas or Resend calls, remote SQL,
Scheduler operation, deployment, email, environment-file edit or push ran.
All 23 expected owner files under `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` remain untouched and uncommitted.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** apply
  `packages/db/migrations/20261018000300_profile_avatars.sql`, deploy API/web,
  then ship mobile through the existing owner release process (no native module).
- **Device checks - NOT RUN, skipped entirely:** Google/Microsoft provider photo;
  upload, replace and confirmed removal on web/mobile; fallback to provider or
  initials, image-error/offline behavior, expiry/reload, account switch/sign-out,
  and cross-account read/write/delete denial for private Storage.
- Storage and Postgres have no shared transaction. A crash/uncertain RPC may
  leave an unreferenced private object. The code never deletes a possibly-current
  photo on uncertain evidence; retired objects remain queued until cleanup
  succeeds. Failed retirement returns a safe error and clients reconcile.
- Vercel CLI is absent. Installing `npm i -g vercel` is strongly recommended for
  later owner rollout tooling. No installation or Vercel CLI invocation ran.

PF1b's finite local endpoint is complete. No PAR1 or later task was started.

## PAR1b website vs mobile parity audit - 2026-10-19

**Status: PASS for the finite docs-only source audit.** Baseline `796e312`
on `overnight/2026-10-15_feedback`; endpoint PAR1b only. Read
`tmp/overnight/prompts/PAR1b.md` in full, including the overriding UNATTENDED
rules, prior PAR1 progress/history, repository policy/AUTOPILOT, current planning
records and the external 2026-10-18 roadmap. The owner explicitly resolved the
prior preflight condition: expected untracked `UI/`,
`apps/mobile/.gitignore` and `supabase/.temp/` were preserved exactly and
never staged. No tracked owner edits existed. This completed entry replaces
the prior PAR1 preflight-only footer from `796e312`.

[Parity audit](parity-web-mobile-20261018.md): 54 feature rows with source
file:line evidence on both platforms, behavioral differences and 16 gaps in
high/medium/low student-impact order. Findings include web recovery/document
exports/selective source preview, saved-Quiz reuse, mobile image-cap readiness,
weekly Schedule/grace coverage, remake confirmation, quiz flags, notifications
and remaining presentation differences. No fixes or cost estimates were added.
Current state, roadmap and current sprint now reflect completed PAR1b.

Local commit (author `galaxymaxp <omgraythekid@gmail.com>`):

- `docs: complete web vs mobile parity audit` — the five owned docs paths;
  exact hash is recorded after commit in Git, `tmp/overnight/PAR1b.status`
  and `tmp/overnight/PAR1b.progress`. No push.

Verification:

- **FRESH PASS:** `git diff --check`, 0 whitespace errors, **1/1** prompt
  gate. `git diff --cached --check` also passes before commit.
- **FRESH PASS:** diff scope **1/1**, exactly five `docs/` paths; no code,
  migration, credentials, generated outputs or owner paths staged.
- **FRESH PASS:** local audit structure/reference validation, **54/54** rows
  cite both platforms; all linked source files/line anchors exist. No live
  assertions are inferred from historical reports.
- **NOT APPLICABLE:** build, typecheck, lint and application tests (docs only).
  No failed prompt-gate attempts or flakes. First supplementary structure
  validation falsely rejected 54 rows: its helper expected six columns, not
  five. Corrected helper then passed. Exploratory Python/read-path and oversized
  shell-command failures were corrected with Node, actual paths and patching.

**UNVERIFIED (owner to confirm):** deployed revisions, applied migrations,
actual description rows/provider metadata, notification delivery/Scheduler
state, remote-ref freshness, production generation and browser/device behavior.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, deployment, remote SQL,
Scheduler operation, email, environment-file edit or push ran. Stored tracking
state reports this branch ahead of `github/main` by 95 before this commit;
no network refresh established current remote state.

### Owner steps remaining

- Claude and Fely turn the audit's Gaps into the next owner-approved roadmap;
  gap implementation is outside this docs-only run.
- Confirm any live/release state needed for that roadmap. PF1/MD1 migration
  application and prior feature rollout/device debt remain owner work.
- **Rollout — NOT RUN, skipped entirely:** none for PAR1b itself (docs only).
- **Device checks — NOT RUN, skipped entirely:** none required by PAR1b;
  browser/phone behavior in the feature table remains unverified by this run.
- Vercel CLI is absent. For later owner rollout tooling, installing
  `npm i -g vercel` is strongly recommended; no installation/invocation ran.

The finite PAR1b endpoint is complete; no RB6 or later task was started.

## UC1 in-app update checker - 2026-10-19

**Status: PASS for the finite UC1 local code scope; all eight prompt gates
and the additional forced root build pass.** Baseline `7506d51`, branch
`overnight/2026-10-15_feedback`, endpoint UC1 only. Read the full UC1 prompt,
overriding UNATTENDED rules, external update-checker roadmap, repository policy,
AUTOPILOT and current planning files. Historical FS2/UC0 local records report
PASS; their remote actions were neither repeated nor independently verified.
The three expected untracked owner paths were preserved and never staged.

Shared validation maps public GitHub releases, strips machine metadata from
plain notes and compares runtime/native codes with minimum-supported priority.
The public API route has a five-second fetch/body bound, ten-minute in-memory
cache, coalesced refreshes, failure backoff, stale fallback/204 and public
five-minute response caching. It requires no session and contains no user data.
The existing protected-route JWT policy is unchanged. Health's hardcoded
`2.1.0` is out of scope and unchanged.

Mobile uses the installed expo-constants/expo-updates modules. The device store
persists last attempt/success, validated release and dismissed version code;
automatic metadata requests are throttled twelve hours, with manual bypass.
Today has one optional native-update banner with Download/version dismissal.
The online minimum-supported sheet disables all close gestures and releases on
background/offline state or failed bounded health probes. Cached successful
metadata needs a fresh health probe before it can block after restart; the
periodic probe is ten seconds with a five-second timeout. Settings About shows
version/code, OTA short ID or built-in, manual checks, last checked and plain
release notes. No native module, dependency, runtime or build-number change.

Local commits, all authored `galaxymaxp <omgraythekid@gmail.com>`:

- `71e7a51 feat(shared): parse and compare public app releases`
- `d24112c feat(api): serve cached public app release metadata`
- `e239af3 feat(mobile): persist and throttle public update checks`
- `092fde0 fix(shared): keep blank release runtime metadata absent`
- `e48b8c5 fix(mobile): preserve update checks across lifecycle races`
- `8375004 feat(mobile): show native update banner and required sheet`
- `62085d3 feat(mobile): add version and update checks to Settings About`
- `1ffcd06 feat(mobile): check app releases on launch and foreground`
- `docs: complete UC1 update checker handoff` records this entry, ADR-050,
  acceptance and reconciled planning files. Its exact hash is recorded after
  commit in Git and `tmp/overnight/UC1.status`; no self-referential amendment.

**FRESH PASS: 8/8 prompt gates.** Forced typecheck/lint each pass 8/8 tasks,
zero cached; lint has six existing warnings, zero errors. Shared: 576/576 tests,
55 files (source plus existing emitted copies). API: 2404 passed / 3 intentional
live skips, 210 files, `--maxWorkers=2`. Mobile: 1503/1503, 157 files. API build:
36/36 static pages, dynamic latest-release handler. Android: one local bundle,
35 assets, no publication. `git diff --check`: zero whitespace errors.
Additional AUTOPILOT forced root build: **FRESH PASS, 8/8 tasks, zero cached**,
including API/web and local Android/iOS/web exports. Staged diff hygiene also
passes. Exact commands/log names
and acceptance rows: [UC1 acceptance](acceptance/uc1-update-checker.md).

Failed first attempts retained: mobile typecheck's one maybe-async storage
adapter error, then two test `act` callback return errors; first forced lint
7/8 tasks with two test children-prop errors; first mobile suite 1 failed /
156 passed files with 1406 tests passing, due to an unmocked native Expo import
in broad screen tests. All were corrected, not suppressed. Mobile reruns pass
1501 then 1503 tests after two added race regressions. No nondeterministic flake
observed. Test TEMP/TMP stays inside the repository; live-test flags are disabled.
Generated declarations are inspected/restored; outputs/logs stay ignored.

**UNVERIFIED (owner to confirm):** current public release/tag/APK availability,
deployed API/website/worker revisions, remote-ref freshness, applied production
state, real OTA identity and phone/browser behavior. No Supabase, Vercel, Google
Cloud, Canvas or Resend call, remote SQL/migration, Scheduler operation, email,
deployment, environment-file edit or push ran. No unverified live requirement
was used as a reason to skip the authorized code work.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy API and ship mobile using the
  existing OTA process; UC1 adds no native module. Reconfirm real UC0 metadata.
- **Device checks - NOT RUN, skipped entirely:** Settings About version/code and
  OTA identity; manual current-release up-to-date feedback; on a real future
  native release, banner/download/dismissal/notes and minimum-supported online
  gating with offline Library still accessible. Do not fake a release.
- UC2 download page/showcase links and UC3 publishing/fullsend automation are
  the next separately scoped slices; neither was started.
- Process-local cache does not provide a global GitHub rate-limit guarantee.
  Required-sheet release after a physical connection loss can take up to the
  ten-second probe interval plus its bounded five-second request.
- For later owner rollout tooling, installing the Vercel CLI with
  `npm i -g vercel` is strongly recommended. No installation/invocation ran.

Final UC1 checkpoint/status is recorded in ignored `tmp/overnight/UC1.*`.


## UC2 / public Android download page (2026-10-19)

**Status: PASS for the finite unattended code scope.** Baseline `c958cc1`;
current branch `overnight/2026-10-15_feedback` retained, as required. The
prompt's branch label was stale; UC1 commits, exact shared release shape,
public API route, same-origin rewrite and Settings About were verified in code.
The tracked tree was clean before changes. Owner paths `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` remain untouched and unstaged.

What changed: public `/download`, validated metadata, UTC date/plain notes,
three-line expansion, one primary APK action, locally encoded QR and three
install steps. `/release` redirects. Sign-in/sign-up and the existing account
menu link to download; public routes do not initialize auth/private caches.
Mobile About shares the website download URL via native Share. The existing
website origin is centralized with reviewer sharing, with public releases as
invalid-config fallback. Pinned QR encoder: `qrcode-generator` 2.0.4, MIT,
zero runtime dependencies. No native module, version/runtime, migration or API
behavior change. The showcase already had an Android CTA; only its destination
and obsolete comment changed in the ignored local clone.

Commits (all author `galaxymaxp <omgraythekid@gmail.com>`):

- `053beb6 feat(web): add public Android download page and entry links`
- `eef9c67 feat(mobile): share public download link from Settings About`
- Showcase clone only: `77dd54b feat: link Android download to public website`
- `docs: complete UC2 download page handoff` is this documentation checkpoint;
  its final hash is in Git and `tmp/overnight/UC2.status` after committing.

FRESH verification: **10/10 prompt gates pass**. Forced root typecheck and lint
are each 8/8 tasks, zero cached; lint has six existing warnings and zero errors.
Shared tests 588/588 (56 files, existing emitted copies included); API 2404
passed / 3 intentional live skips (210 files, two workers); web 363/363
(55 files); mobile 1511/1511 (158 files). API build 36/36 static pages, web
20/20, Android local export and diff hygiene pass. Additional forced root build
passes 8/8 tasks, zero cached, including local Android/iOS/web exports.
Showcase Vite build passes with its existing large-chunk warning. Local Chromium
passes 9/9 scenarios with mocked metadata, zero page errors and zero external
requests; inspected narrow/light and desktop/dark screenshots. The owned local
server is stopped. Full commands and acceptance rows:
[UC2 acceptance](acceptance/uc2-download-page.md); amended ADR-050.

Failed attempts retained: first typecheck/shared/web launches exited 1 before
suite execution due to Windows preload-path parsing; the concurrent gate-ledger
append also collided. Forward-slash preload paths and per-gate exit files fixed
the harness. First showcase commit lacked clone committer identity; scoped
`git -c` identity fixed it. No failing application tests or nondeterministic
flakes occurred. First dark screenshot caught an entrance animation, so final
screenshots fast-forward finite animations. Atomic patch validation failures,
corrected exploratory reads and restored unrelated npm lockfile pruning are
recorded in acceptance. Generated Next declarations are restored to HEAD and excluded from commits;
logs/build/test output stay ignored. Tests use repository-local TEMP/TMP,
disabled live flags and an outbound-service guard; builds use offline/no-telemetry
flags. Local browser traffic is restricted to loopback and mocked metadata.

**UNVERIFIED (owner to confirm):** real public release/tag/APK, production website
origin and deployed revisions, remote-ref freshness, applied production database
and Scheduler state, actual OTA identity, APK install/QR scan/native sharing on
the phone. No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL,
migration application, Scheduler operation, email, deployment, environment-file
edit or push ran. GitHub showcase cloning and npm package installation were the
explicitly permitted read-only/dependency operations. Live-state limitations did
not stop the authorized code work. UC3 is the next separate slice, not started.

### Owner steps remaining

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

Final UC2 checkpoint/status is in ignored `tmp/overnight/UC2.*`.

## UC3 - APK release pipeline - PASS locally (2026-10-19)

Status: **PASS** for finite STEP 0-4, tests/gates/docs/local commits, baseline
`0037a3a` on `overnight/2026-10-15_feedback`. UC1/UC2 commits, shared parser,
app.json 2.2.0 / 6 / 2.2.0-sdk57, preview APK profile and EAS remote versioning
matched preflight. No tracked owner edits were present. The update-checker
roadmap's code scope is complete; **RB7 is Fely's rollout**. No later slice.

What changed: Node ESM publisher with no new dependencies, dry run by default,
strict flags/defaults/mismatch override, exact shared-parser import/round-trip,
plain generated notes and JSON argv preview. Publish logic uses execFile,
refuses existing/uncertain tags, streams HTTPS-only redirects with bounded time,
preserves existing local artifacts/notes, rejects empty bytes and sanitizes
provider errors. Tests inject all publishing operations; **no real gh runner
or real publish mode executed**. New Android fullsend runbook covers OTA versus
APK, actual built versionCode under EAS remote versioning, minSupported and
owner verification. Mobile device runbook and ADR-050 link to the runbook/new
ADR-051; number checked across both ADR folders. No mobile/API/web behavior,
version/runtime, dependency or migration changed.

Commits (author `galaxymaxp <omgraythekid@gmail.com>`):

- `7e6f274 feat(scripts): publish APK releases to the public releases repo`
- `ece3721 test(scripts): cover APK release publishing`
- `1dc1c20 docs: android release runbook and distribution ADR`
- `docs: complete UC3 release pipeline handoff` is this documentation checkpoint;
  its final hash is in Git and `tmp/overnight/UC3.status` after committing.

**FRESH PASS: 8/8 prompt gates.** Forced root typecheck/lint each pass 8/8 tasks,
zero cached; six existing lint warnings and zero errors. Publisher tests 27/27,
zero skips; shared 590/590 in 56 files (existing emitted copies included);
API 2404 passed / 3 intentional live skips in 210 files with two workers. Exact
API build passes, 36/36 static pages. Required empty named APK dry run exits 0,
printing v2.2.0+6 argv and metadata; no publication or download. Diff/staged diff
hygiene pass. Additional forced root build passes 8/8 tasks, zero cached,
including API/web and local Android/iOS/web exports. Both scripts pass Node
syntax checks. [Exact commands and acceptance](acceptance/uc3-apk-release.md).

No failed first gate/test attempts or nondeterministic flakes. Initial and final
27/27 Node tests pass; targeted refinements cover Node 22 warning tolerance and
download cancellation cleanup. One final documentation patch failed atomic
validation on a table label and was corrected without file changes; this was
not a gate failure. Existing Vite config/build color warnings remain in logs.
Tests use repository-local TEMP/TMP, disabled live flags and an outbound
HTTP/fetch guard; builds use offline/no-telemetry settings. Generated Next
declarations were restored to baseline. No APK, output, credential or tmp file
is committed. Owner paths `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
remain untouched and unstaged.

**UNVERIFIED (owner to confirm):** public release/tag/APK availability, real APK
manifest/runtime/signing, deployed API/website/checker revisions, remote-ref
freshness, production database/Scheduler state and device behavior. No
Supabase, Vercel, Google Cloud, Canvas or Resend call; no remote SQL, migration
application, Scheduler action, email, deployment, environment-file edit or push
ran. Production-state limitations did not stop code work. Current state,
roadmap and sprint are reconciled; UC3 is the endpoint.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** RB7 API/website deployment and mobile
  checker OTA remain Fely's work. At the next real native release, follow
  [the Android release runbook](../dev/android-release-runbook.md), inspect the
  actual built code/runtime, review dry-run output, then use `--publish`.
  OTA-only changes create no GitHub release; never publish a fake test release.
- **Device checks - NOT RUN, skipped entirely:** on the real signed APK, verify
  API metadata, `/download`/QR, data-preserving install, Settings About,
  older-install banner/download and any deliberate minSupported sheet; retain
  offline Library access.
- Confirm the UNVERIFIED live states above. Complete UC2's remaining showcase
  branch push/PR and rollout/device checks as separately recorded.
- For later owner Vercel deployment/log/env workflows, installing the missing
  CLI with `npm i -g vercel` is strongly recommended; it was not installed or
  invoked here.

Final UC3 checkpoint/status is in ignored `tmp/overnight/UC3.*`. Stop at UC3;
no rollout, publication or later work is authorized by this handoff.


## LG1 / hidden Canvas Page-linked files (2026-10-19)

**Status: PASS for the finite unattended local code scope.**
Baseline f709843; current branch overnight/2026-10-15_feedback retained.
Finite endpoint: STEP 0-6, tests/gates/docs/local commits. The tracked baseline
was clean; owner UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched.
Local upstream tracking was ahead 16 / behind 2 at baseline; no fetch or push.

Shared effective eligibility now requires a current, explicitly published,
student-visible reference before hidden metadata can be treated as available.
Locks/dates/deletion and byte/type/security checks still win. Fresh inventory
uses existing course source/reference context; stored readers batch complete
references/source rows by course with owner/connection predicates and safe
failure. Sync repairs stale blocked/unavailable statuses, including retained
hashes, without claiming old bytes are current. Preparation re-ingests missing
objects and registers jobs through the existing 200-per-sync guard.
API source lists, preparation, previews/structured snapshots and saved reviewer
status consume the same rule. No migration, backfill script, dependency or ADR.
Mobile and web already consume API preparation/generation state; no raw hidden
checks were found in either Generate client, so client implementation is
intentionally unchanged. Both clients receive the corrected behavior.

STEP 0 schema evidence: packages/db/src/types.ts and the existing
202607060003 file-ingestion foundation migration store references and source
publication/access metadata. No missing-schema STOP condition applied. The
prompt's approximate line numbers drifted; the schema lives in packages/db,
not supabase/migrations. Every requested scan call site is recorded here:

| Call site | Before LG1 | LG1 result / reference availability |
| --- | --- | --- |
| `packages/canvas/src/types.ts`, `client.ts` | Define/parse `hiddenForUser` | Unchanged metadata transport; no access decision |
| `packages/db/src/types.ts` | File row/insert/update hidden fields | Unchanged schema types |
| `canvas-file-policy.ts` classifier, direct-link classifier, status mapper, hidden predicate | Hidden always unavailable except explicit Page override | Shared effective policy; locks/deletion win; only current, explicitly published and visible references elevate hidden files; size/type/security limits retained |
| `canvas-file-policy.ts:isNewlySupportedOfficeFile` | Ordinary Office metadata upgrade classifier | Unchanged legacy helper; effective classification now runs on access-aware source reads |
| `canvas-file-normalize.ts` payload fields / `mapCanvasFile` | Raw hidden flags set blocked eligibility/status | Effective policy from fresh course reference/source batches; standalone mapping denies without evidence |
| `canvas-sync.ts` inventory write / existing-file mapping | Reclassified inventory could overwrite Page access; existing-file path merely maps flags | Persistence extracted to `canvas-file-inventory.ts`; effective inventory payload plus owner-scoped 200-ID repair batches for stale unavailable/blocked status |
| `canvas-file-ingestion.ts` hiddenPageLink / eligibility/status mapping / metadata update / content validation | Only explicit Page-worker hint could override hidden metadata | Current references loaded once per requested course, fully paginated; shared mapper used on fresh provider metadata; aggregate limit uses effective eligibility; metadata/signature validation unchanged |
| `canvas-reviewer-sources.ts` direct-link candidate / metadata availability | Raw hidden flags denied normal file preparation; separate Page candidate override | Course-batched access evidence attached to source rows for list/prepare/preview/structured snapshot reads; candidate bypass removed; shared policy controls availability |
| `reviewer-source-status.ts:isFileUnavailable` | Hidden flags and stored blocked eligibility denied rebuild | Shared policy plus complete owned reference/source batches for file status; missing rows remain denied |
| `canvas-stored-file-extraction.ts` hidden fields in validation input | Pass-through to byte/type/signature validation | Unchanged; preview/snapshot readers supply effective source state, workers freshly ingest before extraction |
| `experience/canvas-page-attachments.ts` hidden-file branch | Separate hidden Page download override | Shared effective policy and visible published Page check; authenticated byte validation retained; stale existing rows repaired without replacing historical objects |
| `canvas-sync-jobs/finalize.ts:itemStateForRecord` | `locked` or `hiddenForUser` reports health state locked | Explicit prompt exception: unchanged. The staged `record` has provider metadata, no current references/source visibility. This health receipt does not determine material generation eligibility |
| `canvas-module-material.ts` | Classifies raw provider file/assignment attachment policy; blocks `blocked_*` eligibility | Unchanged dormant diagnostic classifier: repository search finds no production caller, only its tests; it does not control material Generate, previews or snapshots |
| `canvas-preparation/backfill.fixture.ts` | Synthetic local nonhidden rows | Test fixture only; not a production decision |
| `canvas-preparation/orchestration.ts` | Enqueues supported/canPrepare sources from complete API inventory | Unchanged: corrected sources enter the same durable registration/200-job guard; no parallel queue or bypass |

Final verification and exact commands:

| Exact command | Result / counts | Log stem |
| --- | --- | --- |
| npm run typecheck -- --force | FRESH PASS, 8/8 tasks, 0 cached (final rerun) | LG1.typecheck-final |
| npm run lint -- --force | FRESH PASS, 8/8 tasks, 0 cached, 6 existing warnings, 0 errors | LG1.lint-final |
| npm run test --workspace @stay-focused/shared | FRESH PASS, 590/590 tests, 56 files (existing emitted copies included) | LG1.shared |
| npm run test --workspace @stay-focused/api -- --maxWorkers=2 | FRESH PASS, 2433 passed / 3 intentional live skips, 212 files; final committed-tree rerun also passes | LG1.api / LG1.api-final |
| npm run test --workspace @stay-focused/mobile | FRESH PASS, 1511/1511 tests, 158 files | LG1.mobile |
| npm run test --workspace @stay-focused/web | FRESH PASS, 363/363 tests, 55 files | LG1.web |
| npm run build --workspace @stay-focused/api | FRESH PASS, 36/36 static pages | LG1.api-build |
| npm run build --workspace @stay-focused/web | FRESH PASS, 20/20 static pages | LG1.web-build |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS, 1 local Android bundle / 35 assets, no publication | LG1.android |
| git diff --check | FRESH PASS, 0 whitespace errors; staged and baseline-to-HEAD checks also pass | LG1.diff-check |
| npm run build -- --force (additional AUTOPILOT gate) | FRESH PASS, 8/8 tasks, 0 cached; API/web and Android/iOS/web exports | LG1.root-build |

Every workspace has a test script. NOT APPLICABLE: new schema migration,
ADR, dependency installation, UI visual changes and workflow/provider-contract
suites (no workflow/provider implementation change). No device or deployment
claim is inferred from local gates. The API full suite was repeated against
committed code after the final aggregate-policy review; the 25/25 focused run
also covers that review. Vite config-loader and Expo color warnings remain.

Implementation commits (author galaxymaxp <omgraythekid@gmail.com>):

- d318a09 fix(api): centralize access policy for hidden linked Canvas files
- ddcaef1 fix(api): preserve hidden linked file access through sync and generation
- b345138 test(api): cover Page-only hidden file repair and preparation
- The documentation checkpoint's exact hash is recorded in Git and LG1.status
  after committing; no self-referential amendment.


See [LG1 acceptance](acceptance/lg1-page-linked-hidden-files.md) for the matrix,
local-only fixture boundaries, failed first attempts and log paths. The
Page-only synthetic course proves two linked hidden PDFs eligible/preparable,
the third unreferenced PDF unavailable, later Files promotion stable, and
source list/rebuild readiness after injected worker publication. Complete
reference paging and missing/foreign/unpublished/locked-source denial pass.
Full-suite local worker/extraction/guard contracts remain in place.

Failed first attempts are preserved: focused typecheck typing/narrowing and
fixture hash errors; focused preparation fixtures missing paging/source rows
(2 failed / 105 passed); new integration fixture metadata (1 failed / 35 passed)
and enum expectation (1 failed / 58 passed). Focused final 89/89, post-review
25/25. First forced lint failed after 6/8 tasks with one reserved binding error;
fixed without suppressions. One trailing EOF blank line found by staged diff
hygiene was removed in a local test-commit amendment. Python was unavailable;
Node handled that local edit. One long shell write was automatically rejected;
apply_patch safely authored the local fixture. No nondeterministic flake.
Generated Next declarations are inspected/restored; logs/exports remain ignored.

**UNVERIFIED (owner to confirm):** reported production course/file/reference
rows, deployed API/worker/website revisions, applied production database state,
Scheduler state, remote-ref freshness and real Realme/browser behavior.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL, migration
application, Scheduler action, email, deployment, environment-file edit or push
ran. Live-state limitations did not stop authorized code work.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy API and Google worker.
  No migration/backfill is needed; the next course sync performs repair.
- **Device checks - NOT RUN, skipped entirely:** sync SOC SCI 103N on Realme
  and website; confirm Unit 1-3 lesson PDFs appear under Pages, prepare and
  generate a reviewer. Owner performs the prompt's read-only check that all 14
  rows have eligible_document after sync.
- Confirm the UNVERIFIED states above. Finalize health receipts can still call
  hiddenForUser items locked because their records lack reference context;
  this explicit LG1 exception does not gate material generation.
- For later deployment/env/log tooling, installing the missing Vercel CLI with
  npm i -g vercel is strongly recommended. No installation/invocation ran.

The finite LG1 endpoint ends here; no later overnight prompt is started.
Final progress and status are recorded in ignored tmp/overnight/LG1.*.

## AN1 / announcement read-on-open preflight (2026-10-19)

**Status: STOPPED at STEP 0 under unattended rules 3 and 4.** Baseline
`b38c46a` on `overnight/2026-10-15_feedback`; expected branch retained and
tracked baseline clean. No application/test code changed, no later slice.

AN1 assumes only explicit buttons/swipes currently mark announcements read.
Source already auto-marks on both detail screens before loaded-data checks:
mobile `AnnouncementsScreen.tsx:201-204`, web `announcements.tsx:138-141`.
Mobile `AnnouncementItem.open` also calls `if (!read) onRead(true)` at lines
88-90 before navigation, used by both the list and Today. A detail-only guard
would leave that early write in place. Removing it changes a row handler,
explicitly forbidden by STEP 1's "No change to list rows or swipes."
This changes the repair, rather than merely drifting a line/helper name.

**Exact question for the owner:** May AN1 remove only the pre-navigation
`if (!read) onRead(true)` call from `AnnouncementItem.open`, overriding
STEP 1's "No change to list rows or swipes", so automatic read writes occur
only after resolved detail data is displayed on mobile and web, with a
once-per-open id guard and the existing explicit read/unread actions retained?
No unattended answer was requested; work stopped before implementation.

STEP 0 ownership: mobile `app/(app)/announcement.tsx` re-exports
`AnnouncementDetailScreen`, which finds the route id in the list returned by
`useExperience<StudentAnnouncementList>(ANNOUNCEMENT_LIST_PATH)` at
`/api/experience/announcements?limit=100`. Mobile `useListPreferences.markRead`
updates the per-owner cache, emits to `useSyncExternalStore` subscribers and
serializes `sessionStore.setItem` writes. Web `[id]/page.tsx` awaits/decodes
params and renders `AnnouncementDetail`; the announcements layout wraps it in
`AnnouncementsWorkspace`, whose `useResource` provides list items through
Context. Web `useListPreferences.read` updates the per-owner cache, emits and
writes `localStorage`, with storage-event subscriptions. Both use
`sf.list-preferences.v1.${owner}`. Canvas is not changed. Both Today screens
already subscribe through these hooks; no stale unsubscribed snapshot found
in source. Runtime unread dots/counts/Today updates are not claimed verified.

Prompt gates: **1/10 FRESH PASS, 9/10 NOT RUN, 0 failed.** `git diff --check`
and additional staged diff hygiene pass with 0 whitespace errors. Forced root
typecheck/lint, shared/API/mobile/web tests, API/web builds and Android export
are NOT RUN because of the preflight STOP. Additional AUTOPILOT forced root
build NOT RUN; docs-only checkpoint. Every requested workspace has a test
script. No test/build attempts or flakes. One nonexistent web store filename
was corrected during source discovery, not a gate failure.
[Exact evidence and gate table](acceptance/an1-announcement-read-on-open.md).

Commit (author `galaxymaxp <omgraythekid@gmail.com>`):
`docs: record AN1 preflight scope conflict`; final hash is in Git and ignored
`tmp/overnight/AN1.status` after committing. Current-state, roadmap and sprint
record STOPPED. No ADR, dependency or migration. No platform implementation
was silently skipped: both remain pending the scope decision. Expected owner
`UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` remain untouched/unstaged;
no tmp path is committed. Baseline tracking ahead 20 / behind 2, no fetch.

**UNVERIFIED (owner to confirm):** deployed API/mobile/web revisions,
production/database/applied-migration/Scheduler state, remote-ref freshness,
actual browser/Realme behavior and the reported symptom on deployed builds.
Live verification was not the STOP reason. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, remote SQL/migration, Scheduler action, email,
deployment, environment-file edit or push ran.

### Owner steps remaining

- Resolve the exact mobile row-write scope question before resuming AN1.
  Implement/test both platforms' data-resolved once-per-open guards, then run
  every required gate; this checkpoint does not complete the feature.
- **Rollout - NOT RUN, skipped entirely:** owner chooses deployment/OTA after
  implementation review and green gates.
- **Device checks - NOT RUN, skipped entirely:** on Realme and the website,
  open an unread announcement from Today and the list, return and confirm
  it reads as read and leaves Today's card; confirm marking unread while
  viewing persists. Verify notification/deep-link entry points as applicable.
- Confirm the UNVERIFIED live states above. For later Vercel deployment/env/log
  work, installing the missing CLI with `npm i -g vercel` is strongly
  recommended; no installation or invocation ran here.

Final AN1 progress/status are in ignored `tmp/overnight/AN1.*`. Stop at AN1;
no later overnight prompt or rollout is started.

## GB1 / generation action spacing (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Baseline `795fbba`,
branch `overnight/2026-10-15_feedback` retained. Read the full GB1 prompt,
including its overriding UNATTENDED rules. Endpoint: STEP 0-2, regression
tests, local gates, docs and local commits. No later slice; AN1 remains
separately STOPPED. Tracked baseline was clean; expected owner `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` remain untouched and unstaged.
Baseline local tracking ahead 21 / behind 2; no fetch or push.

STEP 0: read newest handoffs and WGP1/GN1b, current planning, AUTOPILOT and
ADR-001/011. Mobile status column had gap 0, adjacent 240pt action wrappers,
and separate artifact/reconnect actions. Action pills had only 16pt primary /
8pt secondary horizontal padding, 8pt vertical padding, minimum height 48pt.
Web already shared a full-width column with gap 10px and 24px space above;
base padding 12px / 16px and 48px minimum height became 0 / 14px and 36px
under desktop density rules. Stalled web Queue and Cancel were both primary.
Approximate prompt line numbers drifted without changing the repair.

Mobile now groups every action in one centered 240pt column, with
`spacing[3]` (12pt) gaps and `spacing[4]` (16pt) top margin. Artifact opens
first, reconnect actions join the column, and at most one action is primary.
The shared pill style uses `spacing[5]` (20pt) horizontal padding and retains
the `hitTarget.min` 48pt minimum. Non-pill styles are preserved. Web gets 12px
gaps, 20px horizontal padding and a local 48px minimum height; stalled Queue
becomes secondary. Both platforms retain visibility conditions and handlers,
admission/retry/cancellation behavior and completion navigation. No API,
database/migration, dependency, orb renderer, motion or ADR change.

No platform implementation was skipped. Web's already-shared full pane width
and existing 24px top separation are retained to respect WGP1's desktop
layout, adapting mobile's fixed width/top-space rule. Shared pill padding
also affects other mobile pill callers as explicitly permitted; physical
appearance remains an owner check.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `e1b4979 fix: space and pad generation actions on mobile and web`
- `docs: complete GB1 generation spacing handoff` is the documentation
  checkpoint; its final hash is recorded in Git and ignored `GB1.status`
  after committing, without a self-referential amendment.

**FRESH PASS: all 10/10 requested gates**, plus the AUTOPILOT root build:

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached; final rerun |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | 590/590 tests, 56 files, existing emitted copies included |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2433 passed / 3 intentional live skips, 212 files |
| `npm run test --workspace @stay-focused/mobile` | 1521/1521 tests, 158 files; final rerun |
| `npm run test --workspace @stay-focused/web` | 364/364 tests, 55 files |
| `npm run build --workspace @stay-focused/api` | 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | 20/20 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 local Android bundle / 35 assets; no publication |
| `git diff --check` | 0 whitespace errors; staged and baseline-to-HEAD checks also pass |
| `npm run build -- --force --env-mode=loose` (additional) | 8/8 tasks, 0 cached; API/web and local Android/iOS/web exports |

Every requested workspace has a test script. API runs the complete suite with
two workers, as in LG1, to bound local database-test memory. Focused final
checks: mobile 36/36 in 2 files, web 10/10 in 1 file. Synthetic Playwright CSS
geometry passes 4/4 widths (360/800/1024/1440): equal button widths, 12px gap,
20px horizontal padding, at least 48px height, 24px space above, no overflow,
correct stacking/desktop columns and zero network requests. No authenticated
app or physical-device acceptance is inferred. Workflow/provider-contract
suites NOT APPLICABLE to these UI-only paths. Exact acceptance, logs and
failed-attempt evidence: [GB1 acceptance](acceptance/gb1-generation-action-spacing.md).

Failed first attempts retained: focused mobile 35 passed / 1 timed out due to
new session/client identities in the existing mock; stable hoisted fixture
objects fixed the missing-intent loop. Initial forced lint failed at 7/8
tasks with one new `react/no-children-prop` error; test construction was fixed.
Initial CSS probe passed 360px then found the real 36px desktop height at
800px; the local minimum-height rule fixes it. No nondeterministic flake,
assertion weakening or validation suppression. One final multi-file docs
patch failed atomic context validation and was reapplied with the correct
anchor; no partial file edits or gate failure. Exploratory wildcard-path
reads were corrected. Existing Vite/React renderer/Expo color warnings remain.

Generated Next declarations were inspected and restored. Local test TEMP/TMP,
disabled live flags, outbound HTTP/fetch/socket guards and offline/no-telemetry
build settings were used. Logs, exports, fixtures, progress/status and tmp
paths are excluded from commits. Current-state, roadmap and sprint reconciled.

**UNVERIFIED (owner to confirm):** deployed mobile/API/website revisions,
production/database/applied-migration/Scheduler state, remote-ref freshness,
reported deployed symptom and real Realme/authenticated-browser appearance.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration
application, Scheduler action, email, deployment, environment-file edit,
branch switch or push ran. Live-state limitations did not stop this code work.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner chooses website deployment
  and mobile OTA/APK publication after reviewing these local commits.
- **Device checks - NOT RUN, skipped entirely:** on Realme start generation
  and inspect running, stalled, failed/Try again and done states; verify even
  gaps, comfortable padding, artifact-first actions and reconnect actions.
  Confirm website parity at narrow/desktop widths and other mobile pill callers.
- Confirm the UNVERIFIED states above. For later Vercel deployment/env/log
  workflows, installing the missing CLI with `npm i -g vercel` is strongly
  recommended; no installation or invocation ran here.

Final GB1 progress/status are in ignored `tmp/overnight/GB1.*`. Endpoint GB1;
no rollout, device work, AN1 resumption or later overnight slice is started.

## GS1 / Generate course search on scroll (2026-10-19)

**Status: PASS for the finite unattended local code scope.** STEP 0-2,
regressions, all 10 requested gates, additional forced root build, docs and
scoped local commits complete. Baseline `149a516` on
`overnight/2026-10-15_feedback`; branch retained. No tracked edits at entry;
unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/`
remain untouched and unstaged. Cached upstream was behind 2 / ahead 23 before
these three commits; remote freshness was not checked.

Mobile Generate now passes `hideHeaderBelowOnScroll` and pins visibility for
focus or any raw query, including whitespace. Existing Page collapses the
SnapshotStatus/search region and restores it on upward direction changes.
SH2b's measured height, 180ms easing, 8pt hysteresis, height +24pt hide threshold,
instant Reduce Motion, pointer/accessibility exclusion and native refresh stay
unchanged. SearchField already exposed focus/blur; Library was the reference.
The line references drifted without changing the described fix.

No shared web equivalent exists. A small lib hook accumulates 12px direction
changes, translates/fades the sticky search with 200ms ease, updates live media
preferences and uses instant Reduce Motion. Focus/raw text pins it; hidden
search is inert and aria-hidden. Passive scroll/media listeners are cleaned
up. At <=760px only the field sticks/hides; connection and sync status remain
in normal flow. Above 760px the original layout stays. The prompt's explicit
<=760px rule controls its conflicting >=760px test parenthetical at exactly
760; that boundary is covered by the local CSS probe. No platform implementation
was skipped. No new dependency, API/schema, migration, design surface or ADR.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `b5a0d04 feat(mobile): hide Generate search on scroll down`
- `5886a0b feat(web): hide Generate search on scroll at narrow widths`
- `docs: complete GS1 Generate search scroll handoff` is the documentation
  checkpoint; its resulting hash is in Git and ignored `GS1.status`, without
  a self-referential amendment.

**FRESH PASS: 10/10 requested gates**, plus the AUTOPILOT root build:

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | 590/590 tests, 56 files, existing emitted copies included |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2433 passed / 3 intentional live skips, 212 files |
| `npm run test --workspace @stay-focused/mobile` | 1522/1522 tests, 158 files |
| `npm run test --workspace @stay-focused/web` | 373/373 tests, 56 files |
| `npm run build --workspace @stay-focused/api` | 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | 20/20 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 local Android bundle / 35 assets; no publication |
| `git diff --check` | 0 whitespace errors; staged/baseline-to-HEAD hygiene also passes |
| `npm run build -- --force --env-mode=loose` (additional) | 8/8 tasks, 0 cached; API/web and local Android/iOS/web exports |

Every requested workspace has a test script. API's complete suite uses two
workers to bound local database-test memory, following the prior slice.
Focused mobile: **128/128**, 3 files; focused web: **27/27**, 2 files.
Synthetic Playwright CSS/accessibility: **4/4 widths** (360/760/761/1440),
**0 network requests**; sticky return at the same scroll offset, full hidden
translation, inert focus denial, exact 48px phone / existing 36px desktop
fields, natural-width connection action and no overflow. No authenticated
app/device acceptance is inferred. Workflow/provider-contract suites are
NOT APPLICABLE to these UI-only changes. Evidence and full matrix:
[GS1 acceptance](acceptance/gs1-generate-course-search-scroll.md).

Failed first attempts retained: focused mobile **127 passed / 1 failed**
because the new test had no course data and therefore no search field; adding
the existing synthetic fixture fixed it. The first CSS probe passed 2 widths
then failed a mistaken desktop >=40px expectation at 761px; baseline desktop
is 36px, now verified exactly alongside mobile 48px. No product change to
satisfy that bad expectation, nondeterministic flake or validation suppression.
Exploratory drifted paths were resolved through source search. Existing Vite
config-loader, React renderer and Expo color diagnostics remain non-fatal.

All code gates ran against the application/test changes subsequently committed
above. Generated Next declarations were inspected and restored. Local TEMP/TMP,
disabled live flags, outbound HTTP/fetch/socket guards and offline/no-telemetry
build settings were used. Logs, exports, probe, progress/status and all tmp
paths remain ignored and uncommitted. Current-state, roadmap and sprint are
reconciled; no remaining local code blocker or additional scope selected.

**UNVERIFIED (owner to confirm):** deployed mobile/API/website revisions,
production/database/applied-migration/Scheduler state, remote-ref freshness,
reported deployed symptom and real Realme/authenticated-browser behavior.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration
application, Scheduler action, email, deployment, environment-file edit,
branch switch or push ran. Live-state limitations did not stop local code work.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner reviews the local commits and
  chooses website deployment and mobile OTA/APK publication separately.
- **Device checks - NOT RUN, skipped entirely:** Realme Generate course list
  down/up; focus empty search, type/filter and scroll, blur with text, then
  clear. Confirm it stays visible while focused/typed and collapses again
  afterward, with native refresh and Reduce Motion. Confirm web <=760px and
  unchanged desktop >760px behavior.
- Confirm the UNVERIFIED state above. For later deployment/env/log tooling,
  installing the missing Vercel CLI with `npm i -g vercel` is strongly
  recommended; no installation or invocation ran here.

Final progress/status: ignored `tmp/overnight/GS1.*`. Endpoint GS1 only;
no rollout, device work, AN1 resumption or later overnight slice is started.

## RV3 / reference topic level pill (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Read the full RV3
prompt and overriding UNATTENDED rules. STEP 0-3, regressions, all 10 requested
gates, additional forced root build, docs and local commits complete. Baseline
`829b8fb`, branch `overnight/2026-10-15_feedback` retained; cached upstream
ahead 26 / behind 2 at entry, no fetch. Tracked baseline clean. Owner `UI/`,
`apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/` preserved.

Opened the exact reference image; read current planning, AUTOPILOT,
ADR-001/011/039, latest and RV2 handoffs. Source matches RV2 description;
line numbers drifted. Only reviewer/shared-reader use segmented, and CSS
remains scoped to topic-level-row. Mobile uses textPrimary/surfaceElevated;
dark elevated #2c2c2e versus field #3a3a3c retains the required existing tokens.

Mobile now hugs content left with a fully rounded 40pt visual track inside
48pt interaction bounds, 44pt buttons plus vertical hit slop, 32pt elevated
thumbs, regular primary text and no divider. Measured onLayout positions/widths
drive 200ms easing; separate nodes use native translation and JS width.
First measurement/Reduce Motion snap and interrupted motion cleans up. RV2's
<380pt available-width labels remain. Expound is still an independent toggle.

Web/shared-reader match using scoped max-content CSS, 40px track/32px thumbs
and 48px targets. Owner thumb translates/resizes over 200ms, ResizeObserver
handles responsive labels, and live Reduce Motion removes transitions.
Web's pre-existing group/pressed buttons differed from the explicit prompt:
implemented radiogroup/radios, full names, roving arrows/Home/End, disabled
skipping, visible focus and offline-safe Original tab stop. Expound retains
aria-expanded. Shared links retain exact sign-in paths, no generation, and
one Original thumb. Interactive thumb movement does not apply to those links.
No other platform code skipped; no source/cache/generation/API/schema,
migration, dependency or ADR change.

Commits, author `galaxymaxp <omgraythekid@gmail.com>`:

- `61cbb03 style(mobile): topic level pill with sliding thumb`
- `d1df22b style(web): topic level pill with sliding thumb`
- `docs: complete RV3 topic pill handoff` is the documentation checkpoint;
  its final hash is in Git and ignored RV3.status after committing.

**FRESH PASS: 10/10 prompt gates**, plus AUTOPILOT forced root build:

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached | FRESH PASS, final rerun |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings | FRESH PASS, final rerun |
| `npm run test --workspace @stay-focused/shared` | 590/590 tests, 56 files | FRESH PASS |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2433 passed / 3 intentional live skips, 212 files | FRESH PASS |
| `npm run test --workspace @stay-focused/mobile` | 1525/1525 tests, 158 files | FRESH PASS |
| `npm run test --workspace @stay-focused/web` | 374/374 tests, 56 files | FRESH PASS |
| `npm run build --workspace @stay-focused/api` | 36/36 static pages | FRESH PASS |
| `npm run build --workspace @stay-focused/web` | 20/20 static pages | FRESH PASS |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 Android bundle / 35 assets, local export | FRESH PASS |
| `git diff --check` | 0 whitespace errors; staged/final checks also pass | FRESH PASS |
| `npm run build -- --force --env-mode=loose` (additional AUTOPILOT gate) | 8/8 tasks, 0 cached; local Android/iOS/web exports | FRESH PASS |

Every requested workspace has a test script. API full suite uses two workers
for local database-test memory, without filtering. Focused mobile **12/12**
(1 file); web topic/shared **36/36** (2 files). Web Playwright **54/54** checks
at 1440/768/400/390/360/320px in light/dark: geometry/tokens, content width,
no scroll, 48px targets, measured selected alignment, independent two thumbs,
keyboard/focus, exact sign-in links, 200ms animation, live Reduce Motion and
live breakpoint remeasurement. Mobile RN Web **8/8** layout/theme combinations
at 500/390/360/320px using actual TopicAssist/unchanged extracted Copy.
Final harnesses: **0 requests, 0 page errors**. Isolated fictional component
fixtures, not authenticated/deployed/device acceptance. Native semantics are
covered by render tests; RN Web 0.21 does not map accessibilityState to ARIA.
390 light expanded / 1440 dark web and 360 light/dark mobile images inspected.

Required screenshot paths (ignored, not committed):

- [1440 light](../../tmp/overnight/RV3-browser/1440-light.png),
  [1440 dark](../../tmp/overnight/RV3-browser/1440-dark.png).
- [390 light](../../tmp/overnight/RV3-browser/390-light.png),
  [390 dark](../../tmp/overnight/RV3-browser/390-dark.png),
  [390 light with two thumbs](../../tmp/overnight/RV3-browser/390-light-expanded.png).
- [Mobile 360 light](../../tmp/overnight/RV3-mobile-browser/360-light.png),
  [mobile 360 dark](../../tmp/overnight/RV3-mobile-browser/360-dark.png).

Failed attempts retained: optional mobile-browser first attempt **0/8** because
it expected RN Web to expose the native accessibilityState prop as ARIA;
corrected layout probe passes **8/8**, with native a11y render assertions kept.
PowerShell documentation encoding conversion was detected and historical
bytes restored from Git while retaining the new prefix. Inline Node repair
first failed shell quoting with no write; the file-based helper succeeded.
Exploratory wildcard/renamed-path reads were corrected. No unit-test/gate
failure or nondeterministic flake. Initial green typecheck/lint and 35-test
web focused run were followed by final green reruns after the offline focus
safeguard. Existing Vite/React renderer/Expo warnings remain non-failing.
Full evidence: [RV3 acceptance](acceptance/rv3-topic-pill.md).

Generated Next declarations inspected/restored; local export/log/progress/
status/screenshots and all tmp paths excluded from staging. Outbound guards,
disabled live flags and offline/no-telemetry settings used; environment files
untouched. Current-state, roadmap and sprint reconciled. Workflow/provider
contract suites NOT APPLICABLE to UI-only paths; full API tests still passed.

**UNVERIFIED (owner to confirm):** deployed API/mobile/website revisions,
database/applied-migration/Scheduler state, remote-ref freshness, reported
production symptom, real Realme/authenticated-browser appearance and native
animation/TalkBack behavior. No Supabase, Vercel, Google Cloud, Canvas or
Resend call, remote SQL/migration application, Scheduler action, email,
deployment, environment-file edit, branch switch or push ran.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** owner reviews these local commits
  and chooses website deployment and mobile OTA/APK publication separately.
- **Device checks - NOT RUN, skipped entirely:** compare the exact reference
  on Realme and website in light/dark; inspect narrow labels, sliding thumb,
  independent Expound/two thumbs, Reduce Motion, TalkBack and web focus.
- Confirm UNVERIFIED state above. Installing the missing Vercel CLI with
  `npm i -g vercel` is strongly recommended for later owner deployment/env/log
  work; no installation or invocation ran here.

Final progress/status: ignored `tmp/overnight/RV3.*`. RV3 endpoint only;
no rollout, device work, AN1 resumption or later overnight slice started.


## IV1 / reviewer image viewer (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Read the full IV1
prompt and overriding UNATTENDED rules. STEP 0, code, tests, 10/10 prompt
gates, additional forced root build, documentation and local commits complete.
Baseline `c448c21`, branch `overnight/2026-10-15_feedback` retained; cached
upstream behind 2 / ahead 29 at entry, no fetch. Tracked baseline clean;
original `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and ignored `tmp/`
untouched and unstaged. Scope ends at IV1.

STEP 0 matched source despite drifted line numbers/shared-reviewer path. The
only broken web message-circle use was SectionVisual AskImageButton; no other
web use to defer. Mobile ImageViewer already isolated a scrollable native
Modal with top-only fit dismissal; ZoomablePage supported double-tap 1x/2x,
pinch 1x-4x and pan. Single tap did nothing beyond recording a timestamp.
It now immediately toggles 1x/2.5x at the point, retains pinch and clamped pan,
and prevents post-pinch/pan/cancel toggles. Two taps toggle in and back out.
All three viewers use the shared zoom surface. Native gesture/physical
acceptance stays UNVERIFIED, not inferred from render tests.

Web removes the slider/width scaling. Fixed overflow-hidden frame, point
transform origin plus clamped translation/scale, precise fitted layout
dimensions excluding entrance transforms, mouse/one-finger pointer capture,
200ms transform/origin transition and instant Reduce Motion. Stationary taps
complete on pointerup, with compatibility clicks suppressed. Keyboard toggle,
native Escape/Close/backdrop and image non-dismissal verified. Optional web
pinch and ctrl/command-wheel intentionally omitted to retain small tested
scope; native pinch stays.

CircleHelp is an installed circle-question-mark alias; web copies its lucide
SVG with stroke width 2 and uses it in viewer/inline/shared sign-in actions.
Both platforms stack Ask above Save, equal 48px/pt full-width left-aligned
rows, matching labels/color/icons and 8px/pt gap, offline note below column.
Mobile ImageActions covers ExternalVisual, SourcePageSnapshot and SourceFigures.
No required platform skipped. Shared-reader lacks Save/interactive zoom and
retains its existing sign-in-only action. No API/source/schema/migration,
dependency or ADR change.

Commits, author galaxymaxp <omgraythekid@gmail.com>:

- `0d09cf3 feat(mobile): align reviewer image zoom and actions`
- `2a2f1d8 feat(web): tap to zoom reviewer images`
- `docs: complete IV1 reviewer image viewer handoff`: documentation checkpoint;
  final hash recorded in Git and ignored IV1.status after committing.

**FRESH PASS: 10/10 prompt gates**, plus AUTOPILOT forced root build:

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached, final rerun |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors / 6 existing warnings, final rerun |
| `npm run test --workspace @stay-focused/shared` | 590/590 tests, 56 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | 2433 passed / 3 intentional live skips, 212 files |
| `npm run test --workspace @stay-focused/mobile` | 1527/1527 tests, 159 files, final rerun |
| `npm run test --workspace @stay-focused/web` | 378/378 tests, 57 files, final rerun |
| `npm run build --workspace @stay-focused/api` | 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | 20/20 static pages, final rebuild |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 Android bundle / 35 assets, local export |
| `git diff --check` | 0 whitespace errors; staged/final hygiene also checked |
| `npm run build -- --force --env-mode=loose` (additional AUTOPILOT gate) | 8/8 tasks, 0 cached; local Android/iOS/web exports |

All workspaces have test scripts. Focused native **80/80**; final web suite
includes **38/38** focused tests. API uses two workers for local database-test
memory without filtering. Web Playwright **6/6** at 1440/390/320px in both
themes; actual native ImageActions via RN Web **6/6** at 390/360/320px in both
themes; zero unexpected requests/page errors. Synthetic fixtures and service
stubs only. Screenshots inspected. Final web rebuild and root typecheck/lint
follow the last measurement refinement; forced root build passed earlier in
this run with all other workspaces unchanged afterward. Workflow/provider
contract suites NOT APPLICABLE to these UI-only paths.

Resume checkpoint: the interrupted final lint run had no completion marker.
Its log is preserved as `IV1.lint-interrupted.log`; the resumed forced lint
finished FRESH PASS, 8/8 tasks, 0 cached, 0 errors / 6 existing warnings.
Other passing IV1 results above are retained from the pre-interruption local
run after inspecting their logs and the unchanged implementation. No committed
work or passing suite was repeated. No application changes were needed on resume.

Failed attempts retained, without weakening validation:

- Initial forced typecheck: **7/8 tasks passed, 1 failed**, one TS2769 error:
  native Image does not accept pointerEvents. A wrapping View now owns it;
  final forced typecheck is green.
- Initial full mobile suite: **1526 passed / 1 failed**, 158 files passed /
  1 failed. StudyAssistSheet's lucide mock omitted the new CircleHelp export;
  extending that existing mock fixes it. Final full suite **1527/1527**.
- Focused mobile first three runs: **77 passed / 1 failed**, then **79 passed /
  1 failed** twice. New assertions initially ignored letterboxing, omitted one
  required release event, and used exact equality for a fractional pan bound.
  Correct event evidence and geometric/tolerance assertions yield **80/80**.
- The first optional browser geometry probe measured rows during the existing
  entrance animation; waiting for it to settle fixes that harness expectation.
  Two subsequent probes exposed missing compatibility clicks after captured
  touch pan. Taps now complete on pointerup and suppress duplicate clicks;
  a committed regression covers both browser behaviors. Web **6/6** then passed.
- Final tapped-origin review prompted further browser bound failures on
  intermediate edits. Integer client sizes rounded fractional phone widths;
  bounding-rect sizes then included the dialog's entrance scale (diagnostic
  first combination **0/6**). Final computed layout sizes avoid both issues;
  origin-aware clamp evidence and final browser **6/6** pass.
- Optional native-web layout bundling failed twice on React Native Flow code;
  resolving react-native-svg's installed web entry and .web extensions fixes
  the harness. Final **6/6**, with real CircleHelp/Download vectors.
- Exploratory drifted paths were resolved with source search. One mock patch
  missed its context and applied no changes before the corrected patch.

- On resume, a documentation-only preservation check first compared raw
  checkout bytes to Git-normalized content and failed on Windows CRLF.
  Comparing canonical line endings passes; Git shows additions only.

No nondeterministic flake, removed assertion, suppressed check or remaining
gate failure. Existing Vite config-loader, react-test-renderer deprecation and
Expo NO_COLOR/FORCE_COLOR warnings remain non-failing.

Generated Next declarations inspected/restored. Logs/exports/screenshots,
progress/status and all tmp files excluded. Outbound HTTP/fetch/socket guards,
disabled live flags and offline/no-telemetry build settings used. Planning
files reconciled with historical bytes preserved. No local code blocker.
[Full acceptance/evidence](acceptance/iv1-reviewer-image-viewer.md).

**UNVERIFIED (owner to confirm):** deployed API/mobile/website revisions,
production database/applied-migration/Scheduler state, remote-ref freshness,
the reported deployed symptom, real Realme/authenticated-browser gestures,
native tap-coordinate behavior, TalkBack and physical appearance. No remote
state was needed to establish the code fix. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, remote SQL/migration application, Scheduler action,
email, deployment, environment-file edit, branch switch or push ran.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** review these local commits and
  choose website deployment and mobile OTA/APK publication separately.
- **Device checks - NOT RUN, skipped entirely:** website reviewer image tap
  at a point, drag with mouse/one finger, tap back to fit; verify Escape,
  Close/backdrop, keyboard and Reduce Motion. On Realme verify single-tap
  toggling, retained pinch/pan, dismissal/scroll isolation, Ask/Save matching
  vectors and stacked full-width rows in external, source-page and figure
  viewers. Confirm light/dark and offline notes on both apps, and shared
  reviewer Ask remains a sign-in link.
- Confirm the UNVERIFIED states above. For later deployment/env/log tooling,
  installing the missing Vercel CLI with `npm i -g vercel` is strongly
  recommended; no installation or invocation ran here.

Final progress/status: ignored `tmp/overnight/IV1.*`. Endpoint IV1 only;
no rollout, device work, later slice or AN1 resumption.


## OF1 unattended automatic offline saving - STOPPED (2026-10-19)

**Status: STOPPED at STEP 0.** Read the entire prompt, including overriding
UNATTENDED rules, newest IV1 handoff, full OI1/SP1 handoff sections, AUTOPILOT
and relevant implementation. Rule 3 says: "It is a STOP if the code itself
contradicts what the prompt assumes in a way that changes the fix." Rule 4
requires recording the owner question and ending rather than continuing.
No question was sent to an unavailable owner and no implementation proceeded.

Baseline `09e53dd`, branch `overnight/2026-10-15_feedback`; tracked tree clean
at entry. Cached upstream `github/main`: behind 2 / ahead 32, without fetch.
Original untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` and ignored
`tmp/` remain untouched/unstaged. No branch switch or history rewrite.

### STEP 0 findings and changed fix

- `apps/mobile/src/app-shell/AppLifecycle.tsx:49`: app-level effect already
  invokes catch-up for the owner/token when active, independently of Library
  focus. Its stop cleanup at :57 is tied to owner changes/unmount, not blur.
  Existing AppLifecycle.test.ts covers sign-in/foreground, signed-out admission
  and owner switching. OI1's handoff explicitly records this lifecycle wiring.
- `apps/mobile/src/features/redesign/useLocalLibrary.ts:68`: focus/active gates
  the screen effect, but :99 joins `runOfflineCatchUp` without passing the
  screen's AbortSignal. Cleanup at :120 aborts only the controller passed to
  the separate fallback remote at :69. It unsubscribes the view without
  cancelling the shared native catch-up. Moving the job out of this effect
  would therefore not fix the claimed cancellation cause.
- `apps/mobile/src/services/localLibrary/offlineCatchUp.ts:50`: concurrent
  callers already share an owner-scoped promise. :57 creates its own abort
  controller; :62 makes one reconciliation call. There is no continuation
  loop/timer for a limited or transiently failed body run. :74 checks whether
  success may be throttled; leaving it unthrottled only permits a later trigger.
- `apps/mobile/src/services/localLibrary/librarySync.ts:26`: list pagination
  walks up to 10 pages of 100, rather than native catch-up using only
  fetchPage(0,100). That single-page path exists only for a null device store
  in useLocalLibrary.ts:79. Hydration at :89 has a 300-attempt cap and a
  60,000ms budget (:29-30, :91, :97). It can return limit while copies remain.
  Per-item non-connection errors are skipped in the run (:103-105), without
  persistent permanent-failure accounting or body retry backoff. Progress at
  :108 publishes after a batch of up to 20, rather than after every item.
- `apps/mobile/src/services/localLibrary/artifactStore.ts:383`: current count
  is image-aware offline readiness. Body counts alone cannot establish full
  completion. OI1 image queue already has separate retry scheduling, caps and
  cleanup; no image behavior was changed or claimed defective here.
- Both libraryPresentation.ts twins still contain the old caption wording.
  Web search found only the function definition and no caption caller.
  Web has no native offline mode (OI1); no web code was deleted or changed.

The 60-second budget, lack of automatic body continuation/retry and batched
notifications are code-established potential contributors; **the cause of the
reported production 40/72 state is UNVERIFIED (owner to confirm)**. No live
evidence was collected. These findings change the proposed blur/lifecycle fix
to continuation/retry/progress work on an already app-scoped job, triggering
the explicit unattended STOP before STEP 1.

**Exact owner question for a later attended run:** May OF1 proceed against the
existing app-scoped, blur-independent job by implementing resumable body
continuation after time/attempt limits, transient retry/backoff and permanent
failure accounting, explicit reconnect admission and per-item progress, while
preserving OI1 image rules and updating both caption twins, instead of the
prompt's assumed relocation/focus-abort fix?

### Commits and verification

Local checkpoint commit: `docs: record OF1 step-zero stop findings`, author
`galaxymaxp <omgraythekid@gmail.com>` via --author. Its final hash is recorded
in Git and ignored `tmp/overnight/OF1.status`; no implementation commit.

| Exact command | Result / counts |
| --- | --- |
| `npm run typecheck -- --force` | NOT RUN, 0 tasks; STEP 0 STOP |
| `npm run lint -- --force` | NOT RUN, 0 tasks; STEP 0 STOP |
| `npm run test --workspace @stay-focused/shared` | NOT RUN, 0 tests; STEP 0 STOP |
| `npm run test --workspace @stay-focused/api` | NOT RUN, 0 tests; STEP 0 STOP |
| `npm run test --workspace @stay-focused/mobile` | NOT RUN, 0 tests; STEP 0 STOP |
| `npm run test --workspace @stay-focused/web` | NOT RUN, 0 tests; STEP 0 STOP |
| `npm run build --workspace @stay-focused/api` | NOT RUN, 0 builds; STEP 0 STOP |
| `npm run build --workspace @stay-focused/web` | NOT RUN, 0 builds; STEP 0 STOP |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | NOT RUN, 0 exports; STEP 0 STOP |
| `npm run build -- --force` (AUTOPILOT) | NOT RUN, 0 tasks; STEP 0 STOP |
| `git diff --check` and `git diff --cached --check` | FRESH PASS, 0 whitespace errors |

Prompt gates: 1/10 checked (diff hygiene); 9/10 NOT RUN. No product test result
or completion claim. Documentation preservation check: FRESH PASS, 4/4 files
retain all pre-existing bytes. No test failure, flake or gate repair attempt.
One exploratory read targeted nonexistent repository.ts; source search located
librarySync.ts instead. Output-heavy initial reads were repeated in bounded
sections to inspect relevant evidence. No application file was written.
Current-state, roadmap and sprint now record this STOP without superseding
the previous completed IV1 result. No ADR needed for an inspection checkpoint.

**UNVERIFIED (owner to confirm):** deployed API/mobile/website revisions,
production database/applied-migration/Scheduler state, remote-ref freshness,
actual reported count, and physical/authenticated reconnect behavior. No
Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration,
Scheduler action, email, deployment, environment-file edit or push ran.

### Owner steps remaining

- Resolve the exact scope question above; STEP 1-3, regression tests and full
  implementation gates remain pending. This run ends at STEP 0.
- **Rollout - NOT RUN, skipped entirely:** after a later completed/reviewed
  implementation, owner chooses publication separately.
- **Device checks - NOT RUN, skipped entirely:** after implementation, owner
  verifies Today-only sign-in saving, a gradually rising Library count and
  completion wording, then airplane-mode interruption/reconnect on Realme.
- Confirm all UNVERIFIED state above. For later Vercel deployment/env/log work,
  installing the missing CLI with `npm i -g vercel` is strongly recommended;
  no installation or invocation ran here.

Ignored progress/status: `tmp/overnight/OF1.progress` and `OF1.status`.
No later overnight task or AN1 resumption started.


## OR3 unattended orb interaction - STOPPED (2026-10-19)

**Status: STOPPED before STEP 1.** Full prompt and overriding UNATTENDED rules
read. No question sent to the absent owner. Baseline a68072f, branch
overnight/2026-10-15_feedback retained; tracked entry tree clean. Original
untracked UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored tmp/
preserved and unstaged. Cached upstream: 2 behind / 33 ahead; no fetch.

This is a material internal requirements conflict, not missing live state or
an unreachable ring handle. AUTOPILOT requires owner judgment for unresolved
material requirements conflicts; UNATTENDED rule 4 supplies this stop and
checkpoint procedure. No product code was changed or requirement weakened.

### Findings and exact owner question

The specified exponential exp(-dt / 1.4), stopping below 0.01 rad/s, gives
t = 1.4 * ln(v0 / 0.01). A 6 rad/s flick takes **8.955701517 s** to cross
the cutoff; 1 rad/s takes **6.447238260 s**. OR3's mandatory tests require
**2.5-5 s** and **under 2 s** respectively. Discrete frames only cross later;
EMA cannot change tests with specified starting velocities. Keeping the pure
exponential and cutoff, both timing tests need a time constant approximately
0.390812489 <= tau < 0.434294482. Tau 0.4 gives 2.558771862 / 1.842068074 s,
materially different from 1.4. Extra braking/truncation would also change the
specified model. The code cannot satisfy all these numerical requirements.

**Exact owner question for a later attended run:** Should OR3 preserve the
specified exp(-dt / 1.4) friction and 0.01 rad/s cutoff and revise stopping-time
tests to approximately 8.96 s / 6.45 s, or preserve the required 2.5-5 s /
under-2 s tests and authorize a roughly 0.4 s time constant (or explicitly
specify a different braking model)?

STEP 0 is partial, with source findings preserved for resume. Both ring move
handlers can reach existing orbInteraction handles without Today restructuring.
Body uSpin transforms liquid only; uLight is world-space, Today-supplied from
tones.position and centered by default in KnowledgeCore. Both aura adapters
accept per-frame offset/color. Native SVG currently uses fixed center/day tint;
installed Shape has setNativeProps, warranting investigation before deciding
tracking versus the approved removal fallback. No tracking attempt/removal
decision is claimed. Neutral #E6EAF1 already exists in both light body palettes.
Mobile's page touch pause excludes only orb rotation today. Tests that need
updating and the acceptance matrix are in the [OR3 preflight](acceptance/or3-orb-momentum-preflight.md).

### Commit and verification

Local checkpoint commit: **docs: record OR3 momentum requirements conflict**,
author galaxymaxp <omgraythekid@gmail.com> via --author. Final commit hash is
recorded in Git and ignored tmp/overnight/OR3.status; no implementation commit.

| Exact command | Result / counts |
| --- | --- |
| node tmp/overnight/OR3-momentum-preflight.mjs | FRESH diagnostic; exit 1; 6/6 mathematical assertions PASS, 0/2 timing bounds compatible |
| npm run typecheck -- --force | NOT RUN, 0 tasks; requirements STOP |
| npm run lint -- --force | NOT RUN, 0 tasks; requirements STOP |
| npm run test --workspace @stay-focused/shared | NOT RUN, 0 tests; requirements STOP |
| npm run test --workspace @stay-focused/api | NOT RUN, 0 tests; requirements STOP |
| npm run test --workspace @stay-focused/mobile | NOT RUN, 0 tests; requirements STOP |
| npm run test --workspace @stay-focused/web | NOT RUN, 0 tests; requirements STOP |
| npm run build --workspace @stay-focused/api | NOT RUN, 0 builds; requirements STOP |
| npm run build --workspace @stay-focused/web | NOT RUN, 0 builds; requirements STOP |
| npm run build --workspace @stay-focused/mobile -- --platform android | NOT RUN, 0 exports; requirements STOP |
| npm run build -- --force (AUTOPILOT) | NOT RUN, 0 tasks; requirements STOP |
| git diff --check and git diff --cached --check | FRESH PASS, 0 whitespace errors |

Prompt gates: 1/10 checked (diff hygiene), 9/10 NOT RUN. No product test or
completion claim. Documentation preservation check: FRESH PASS, 4/4 existing
files retain all pre-existing bytes; 4/4 newly added OR3 report links resolve.
The exit-1 mathematical diagnostic is retained as a requirements incompatibility,
not relabelled as a passing suite. No test flake or implementation gate attempt.
The first documentation helper exited 1 before writing because Git object LF
bytes differed from the clean checkout's CRLF; normalized baseline comparison
and byte-preserving insertion correct that tooling assertion on the retry.
One exploratory rg glob was invalid under Windows (os error 123); reads and
explicit source paths still establish the inspected baseline. No file changed
as a result. No ADR decision was made; ADR-048 remains unchanged.

Current-state, roadmap and sprint record this checkpoint without superseding
prior completed scopes. Only five owned Markdown paths are staged; all tmp
diagnostics, progress/status and original untracked paths stay uncommitted.

**UNVERIFIED (owner to confirm):** deployed API/mobile/website revisions,
database/applied-migration/Scheduler state, remote-ref freshness and actual
physical/authenticated-browser behavior. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, remote SQL/migration application, Scheduler action,
email, deployment, environment-file access/edit, branch switch or push ran.

### Owner steps remaining

- Resolve the exact physics question above, then resume STEP 1-5, shared and
  renderer/ring/storage regressions, all gates and implementation commits.
- **Rollout - NOT RUN, skipped entirely:** after a later reviewed implementation,
  owner chooses website/mobile publication separately.
- **Device checks - NOT RUN, skipped entirely:** after implementation, check
  hard/gentle flicks, both ring edges/block and move-hold-move-release, traveling
  ripple, tracked glow or approved absence, fresh pearl, preserved legacy gold
  and Reduce Motion on Realme and desktop browser.
- Confirm all UNVERIFIED state above. For later owner deployment/env/log work,
  installing the missing Vercel CLI with npm i -g vercel is strongly recommended;
  no installation or CLI invocation ran here.

Ignored progress/status: tmp/overnight/OR3.progress and OR3.status.
OR3 ends at this requirements checkpoint; no later overnight work started.


## LP1 unattended privacy and terms - PASS (2026-10-19)

**Status: PASS for the finite local code scope.** Entire LP1 prompt and its
overriding UNATTENDED rules read. Endpoint STEP 0-4, tests, all gates, docs and
local commits only; Rollout and Device checks skipped entirely. Baseline
be9d5dc, branch overnight/2026-10-15_feedback retained. Tracked entry tree was
clean; original untracked UI/, apps/mobile/.gitignore, supabase/.temp/ and
ignored tmp/ preserved and unstaged. Cached github/main was 34 ahead / 2 behind
at entry, without fetch. No later slice or stopped prior task was resumed.

Shared copy is dated 2026-10-19 with one LEGAL_CONTACT_EMAIL. Both apps render
the same structured sections. Web has public /privacy and /terms outside the
signed-in group, metadata, a 68ch column and UC2's auth-free theme path.
Native root routes are reachable from both guarded groups and render bundled
copy offline with a small public website address. Both platforms have centered
caption links at the bottom of auth and Settings, and the sign-up agreement;
web adds the download footer. Targets are 48px/pt minimum. The mobile email
confirmation state keeps links too. No sidebar clutter, parser dependency,
API/schema/auth/RLS behavior, motion, release number or ADR change.
Web metadata/download and native offline presentation apply to their respective
platforms; no required parity feature was skipped.

### Data and processor inventory (repo evidence)

- Account email, Supabase sign-in and optional linked Google/Microsoft profile:
  apps/web/src/features/auth.tsx, components/providers.tsx;
  apps/mobile/src/auth/authService.ts and providerAuth.ts.
- Canvas account/address/token: apps/api/app/api/canvas/connection/route.ts,
  apps/api/src/lib/canvas-routes.ts and canvas-token-encryption.ts.
  Server AES-256-GCM encryption; disconnect clears stored token fields through
  packages/db/migrations/20260928120000_canvas_credential_lifecycle.sql.
  packages/canvas/src/client.ts issues GET requests; token permissions may be
  broader. Policy explains revocation in Canvas, not just app disconnect.
- Synced courses, modules, pages, files, assignments, announcements, grades and
  own submissions: apps/api/src/lib/canvas-sync.ts, canvas-grade-sync.ts,
  canvas-file-ingestion.ts and packages/db/migrations/202607050004_create_canvas_academic_graph.sql,
  202607060001_add_canvas_planner_announcements.sql,
  202607060003_add_canvas_file_ingestion_foundation.sql and
  202607080003_add_canvas_grades_submissions_foundation.sql.
- Uploaded files/text/source snapshots, reviewers and jobs/results:
  apps/api/src/lib/processing-jobs/ and
  packages/db/migrations/20260723084329_reusable_processing_assets.sql.
  Quizzes/attempts/drafts: apps/api/src/lib/quiz/, experience/ and
  20260912100000_activity_maker.sql / 20260912110000_quiz_maker.sql.
  Tasks/plans/sessions: apps/api/app/api/study-plan/ and
  20260827155438_task_study_plan_foundation.sql. Uploaded avatars:
  apps/api/src/lib/profile-avatars.ts and 20261018000300_profile_avatars.sql.
- Notification devices/push tokens/preferences/delivery records:
  apps/api/src/lib/notifications/repository.ts, worker.ts and
  20260726230833_hosted_processing_uploads_and_notifications.sql.
  Supabase account/database/private storage: packages/db/src/client.ts and
  apps/api/src/lib/processing-jobs/upload-intents.ts.
- Vercel hosting/workflows: apps/web/next.config.ts, apps/api/next.config.ts,
  apps/api/src/lib/processing-jobs/workflow-start.ts and workflow-dispatch.ts.
  Google Cloud tasks/workers: processing-jobs/google-cloud.ts,
  canvas-sync-jobs/google-dispatch.ts and canvas-preparation/dispatch.ts;
  Cloud Vision OCR: apps/api/src/lib/ocr/create-server-ocr-provider.ts.
  OpenAI material/prompts: apps/api/src/providers/openai-provider.ts and
  packages/engine/src/providers/openai-provider.ts. No unsupported training,
  region or provider-retention promises were added.
- Wikimedia Commons topic-derived queries/images:
  apps/api/src/lib/external-visuals/service.ts and commons.ts; the policy
  explicitly discloses study-topic exposure. Resend recipient/coursework email:
  apps/api/src/lib/transactional-email.ts and notifications/canvas-email.ts.
  Expo push: notifications/worker.ts; app delivery/update configuration:
  apps/mobile/app.json and src/services/appUpdateStore.ts.
  GitHub release/APK requests: apps/web/src/features/download/DownloadPage.tsx,
  packages/shared/src/app-release.ts and apps/api/app/api/app/latest-release/route.ts.
- Offline study work/images/pending edits/screen snapshots:
  apps/mobile/src/services/localLibrary/artifactStore.ts, localArtifactDatabase.ts,
  pendingDraftSync.ts, schema.ts and apps/mobile/src/auth/AuthProvider.tsx.
  Sign-out attempts owner cleanup, which can fail; policy does not promise
  infallible wiping. Settings clears downloaded bodies/images through
  apps/mobile/src/features/settings/OfflineStorageSettings.tsx. Exports are
  outside cleanup. Web browser session/preferences/snapshots: providers.tsx
  and apps/web/src/lib/screen-snapshots.ts.
- Public revocable share snapshots, not live mirrors:
  apps/api/src/lib/reviewer-shares/public.ts, owner.ts, snapshot.ts and
  20261015050000_public_reviewer_shares.sql / 20261015050100_revoke_deleted_reviewer_shares.sql.
- Retention: configurable job cleanup in reusable_processing_assets and
  20260723091627_processing_lifecycle_batching.sql, not a universal account
  deadline. No self-serve account deletion endpoint found; administrative
  deletion hardening is not a UI. Requests go to the exported contact email.
  Unavailable/deleted Canvas sources block affected rebuilds/retries through
  apps/api/src/lib/reviewer-source-status.ts and
  20261018000100_failed_generation_retry.sql; saved text/share/offline copies
  are not promised to disappear automatically. Partial sync is not deletion.

Full paths and acceptance matrix: [LP1 acceptance](acceptance/lp1-legal-pages.md).
No processor/data flow requiring a scope decision was found. The actual web
route directory and public-provider location differ from exploratory src/app
paths; mobile uses root routes to avoid both group guards. These are routine
path adaptations, not a material contradiction or unattended STOP.

### Commits and gates

- 451b58c feat(shared): add privacy policy and terms content
- 0aacc1c feat(web): add public privacy and terms pages
- 12e4aa2 feat(mobile): add offline privacy and terms screens
- docs: complete LP1 legal pages handoff (final hash in Git and LP1.status)

All commits use galaxymaxp <omgraythekid@gmail.com> via --author.
Final evidence is FRESH for code tip 12e4aa2; tests/type/lint ran on identical
implementation before its scoped commits. All workspaces have tests.
Prompt gates: 10/10 PASS; additional forced root build PASS.

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, 0 cached, final retry |
| `npm run lint -- --force` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | PASS, 593/593 tests, 57 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite, bounded workers |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1529/1529 tests, 160 files; final run |
| `npm run test --workspace @stay-focused/web` | PASS, 382/382 tests, 58 files; final retry |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages, including privacy and terms; sequential retry |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 Android bundle exported locally |
| `git diff --check` and `git diff --cached --check` | PASS, 0 whitespace errors; repeated at closure |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; includes local Android/iOS/web exports |
| `node tmp/overnight/LP1-browser.mjs` | PASS, 13/13 scenarios; 8 signed-out legal route/width/theme combinations, 3 footer navigations, 2 no-JavaScript routes; 0 legal API/external requests and 0 page errors |

Screenshots were inspected. Native physical behavior is not established by the
renderer tests or Android export. The public legal browser contexts had empty
sessions, no redirects, no overflow and no API/external requests; provider tests
also cover configured auth. Download metadata was mocked locally. Server was
stopped after use. No production or external-provider availability claim.

### Failed first attempts and safeguards

- First focused web run: 7 failed / 9 passed (3 files). Next Link's browser idle-callback implementation needed a Node test mock after adding the real footer. Full web first run similarly exposed the Settings test harness: 2 failed / 380 passed (58 files). Added href-preserving link mocks in both affected test files; no production workaround. Final web 382/382.
- First forced typecheck: 6/8 tasks, 0 cached, exit 2; 3 mobile diagnostics. Expo's ignored generated route types lacked the two new files, and a renderer test compared a typed element directly to a mock string. Used the installed SDK's local route generator and String(node.type); strict typing remains intact. Final typecheck 8/8.
- First lint passed 8/8 with 7 warnings, including one new unused mock prop. Removed it; final lint has only the 6 existing warnings (5 mobile, 1 web).
- An extra web build was mistakenly started while the first build was collecting traces. The overlapping output invalidated the first build (exit 1, ENOENT for _not-found/page.js.nft.json). The extra process was interrupted (exit 1). A sequential web rebuild and the later forced repository build passed. This was a local verification orchestration error, not a hidden passing first attempt.
- Python was unavailable for a draft sprint-prefix helper, so no file was written by that attempt; used Node instead. Exploratory reads of stale src/app, Page, workflow/update and SDK paths were resolved from source search. A few Windows rg wildcard paths were invalid and were corrected. No product assumption was contradicted.
- No nondeterministic flake, weakened assertion, suppressed check or remaining failure. Existing Vite config-loader, react-test-renderer deprecation and Expo color warnings are non-failing.

HTTP(S)/fetch/socket guards deny non-loopback traffic; live/telemetry flags are
off and Expo runs offline. Loose root-build env mode preserves those guards.
Generated Next declarations inspected/restored; logs/exports/screenshots and
all tmp files excluded from commits. Planning files reconcile LP1 while
preserving historical content. No local code blocker remains.

**UNVERIFIED (owner to confirm):** deployed website/API/mobile revisions,
production provider configuration/policies, database/applied-migration/Scheduler
state, remote-ref freshness and actual signed-in/physical/offline behavior.
No Supabase, Vercel, Google Cloud, Canvas or Resend call, remote SQL/migration
application, Scheduler action, email, deployment, environment-file edit,
branch switch or push ran.

### Owner steps remaining

- Read both policies and confirm or replace LEGAL_CONTACT_EMAIL,
  currently omgraythekid@gmail.com; operational deletion requests go there.
- Not reviewed by a lawyer; owner to review wording before publishing to the Play Store.
- **Rollout - NOT RUN, skipped entirely:** owner reviews these local commits,
  then chooses website deployment and mobile OTA/APK publication separately.
  Later paste https://stay-focused-ten.vercel.app/privacy into Play Console.
- **Device checks - NOT RUN, skipped entirely:** verify auth/Settings footer
  placement, signed-out and signed-in native navigation, Back, offline legal
  reading, 44pt-or-larger tap targets, large text and light/dark on Realme;
  verify actual public website routes and entry links after owner rollout.
- Confirm all UNVERIFIED states above. For later deployment/env/log tooling,
  installing the missing Vercel CLI with npm i -g vercel is strongly recommended;
  no installation or invocation ran here.

Ignored progress/status: tmp/overnight/LP1.progress and LP1.status.
Endpoint LP1 only; no rollout, device work or later slice started.

## AN1b / announcement read on open - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Read the entire
AN1b prompt and its overriding UNATTENDED rules. STEP 0-3, both apps, tests,
all 10 prompt gates, additional forced root build, docs and local commits are
complete. Baseline `ebcf59c`; branch `overnight/2026-10-15_feedback` retained.
Tracked entry tree was clean. Reused AN1's `795fbba` preflight/acceptance
evidence; its row-write scope question is resolved by the AN1b owner answers.
No later overnight task or previously stopped slice was started.

### What changed and where state lives

- Mobile `app/(app)/announcement.tsx` re-exports `AnnouncementDetailScreen`.
  It resolves the route id from `useExperience`'s announcement list response.
  Web `announcements/[id]/page.tsx` decodes id and renders `AnnouncementDetail`
  in the layout's `AnnouncementsWorkspace` context, backed by `useResource`.
  Both use `/api/experience/announcements?limit=100` for detail source data.
- Both detail effects now wait for resolved/displayed content and an owner,
  then mark once per opened route id/owner using a ref. Missing/loading data
  never auto-marks. Explicit unread remains unread across preference renders
  and refreshed source objects; route changes or unmount/reopen can read again.
  Guard reset waits for owner readiness and preserves account isolation.
- Mobile row-tap read marking before navigation and all swipes are unchanged,
  as explicitly required by owner answer 1. List render does not mark read.
  Web rows remain links. No new UI, motion or design-token change.
- Existing writes remain in mobile `useListPreferences.markRead` through
  owner cache + emit + serialized `sessionStore` writes, and web
  `useListPreferences.read` through owner cache + emit + `localStorage`.
  Both hooks expose their existing owner id for the guard. Storage schema/key
  remains `sf.list-preferences.v1.${owner}`; Canvas is never changed.
- Actual mounted Today/list/detail tests use the real preference hooks and
  controlled local storage, verifying immediate dot/count/Today removal,
  explicit unread and reopen. Mobile delayed hydration preserves an early
  read and a subsequent early unread plus saved pins/read ids. Web merges
  saved state before parent hydration effects. Owner arrival/switch and
  encoded web `[id]` navigation use the same canonical id. The API mapper
  returns `row.id` for both standalone and bundled Today announcements.
- No dropped/overwritten mark, id mismatch or stale Today subscription was
  reproduced. Both Today surfaces already subscribe, so neither needed a
  source change. The symptom is most likely deployed builds predating the
  existing auto-mark code: **UNVERIFIED (owner to confirm)**. This is a
  source/test-based inference, not a deployed diagnosis or a claimed race fix.

No required platform behavior was skipped. Native sheet/gestures and browser
links keep their existing roles. No API, schema, migration, dependency,
release-version, auth/RLS, generation or ADR change. React best-practices skill
applied; strict mocks, unconditional hooks and effect-confined refs verified.

### Commits and gate counts

- `50d4ccc feat(mobile): guard announcement read on detail open`
- `e881082 feat(web): guard announcement read on detail open`
- `docs: complete AN1b announcement read handoff` (final hash in Git and
  ignored `tmp/overnight/AN1b.status`).

All use `--author='galaxymaxp <omgraythekid@gmail.com>'`. Evidence applies to
code tip `e881082`; gates ran on identical implementation before/after commits.
Every requested workspace has a test script. **Prompt gates: 10/10 PASS**;
additional forced root build PASS. No cached result is claimed as fresh.

| Exact command | FRESH result and counts |
| --- | --- |
| `npm run typecheck -- --force` | PASS, 8/8 tasks, 0 cached; final retry |
| `npm run lint -- --force` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | PASS, 596/596 tests, 58 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; complete suite, bounded workers |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1535/1535 tests, 161 files |
| `npm run test --workspace @stay-focused/web` | PASS, 387/387 tests, 59 files; retry |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android bundle exported |
| `git diff --check` and `git diff --cached --check` | PASS, 0 whitespace errors; repeated at closure |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; Android/iOS/web local exports |

Focused evidence: mobile 102/102 (6 new + 96 existing screen tests), web 5/5
through the actual async `[id]` page. No additional API workflow/provider
contract suite applies; those implementations did not change. API live flags
were explicitly disabled; all 3 live cases skipped. Renderer tests use local
fictional fixtures and mocked data/auth/storage boundaries, not live providers.

Failed first attempts are retained in the
[AN1b acceptance report](acceptance/an1b-announcement-read-on-open.md): focused
mobile 100 pass / 1 fail (icon prop assertion); focused web 4 pass / 1 fail
(read-row regrouping invalidated index assumption); root typecheck 5/8 tasks,
exit 2 (3 web test typing diagnostics); root lint 5/8, exit 1 (2 web test
children-prop errors). Fixed test code without weakening production typing or
assertions. First full web had 387 passing tests but 1 failed suite / 58 passed
from existing browser teardown exceeding 10 seconds under concurrent gates;
unchanged full-suite retry passed all 59 files. No timeout was increased.
First extra root-build launch failed before any task due to Windows backslash
parsing in the Node preload path; forward slashes fixed the launch.

Final root build disables telemetry/live flags, puts Expo offline and carries
an ignored HTTP(S)/fetch/socket guard denying non-loopback traffic through
Turbo loose env mode. Earlier local workspace scripts ran without this guard;
they did not run deploy/provider scripts. Exploratory stale filenames and
Windows rg wildcard misses were corrected, not gate failures. Existing Vite,
react-test-renderer and Expo color warnings remain non-failing.

Generated Next declarations were inspected/restored. Current-state, roadmap and
sprint reconcile AN1b and identify AN1 as superseded historical evidence.
Only owned paths are staged; no tmp file, generated output, credential or
private fixture is committed. Original `UI/`, `apps/mobile/.gitignore`,
`supabase/.temp/` and ignored `tmp/` remain untouched/unstaged. Baseline cached
tracking ahead 38 / behind 2, without fetch. No local blocker remains.

**UNVERIFIED (owner to confirm):** deployed API/web/mobile revisions, the
reported symptom on those revisions, production/database/applied-migration/
Scheduler state, remote-ref freshness and actual browser/Realme behavior.
No live state is inferred from passing local tests. No deployment, remote SQL,
migration application, Scheduler action, email, environment-file edit, branch
switch or push ran; no Supabase/Vercel/Google Cloud/Canvas/Resend operation was
requested or invoked by the implementation workflow.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** review local commits, choose
  website/mobile publication separately and confirm deployed revisions.
- **Device checks - NOT RUN, skipped entirely:** on Realme and actual website,
  open unread announcements from Today/list, return and confirm read dot/count
  and Today removal. Verify explicit unread while open, reopen, notification,
  deep-link and direct URL entry points as applicable.
- Confirm UNVERIFIED state and the older-build inference. For later Vercel
  deployment/env/log work, installing the missing CLI with `npm i -g vercel`
  is strongly recommended; no installation or CLI command ran here.

Ignored progress/status: `tmp/overnight/AN1b.progress` and `AN1b.status`.
Endpoint AN1b only; no rollout, device work or later task started.


## OF1b / automatic offline saving - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Read OF1b in full,
including its overriding UNATTENDED rules. STEP 0-3, tests, all 10 prompt gates,
additional forced root build, documentation and local commits are complete.
Baseline `9bf8335`; branch `overnight/2026-10-15_feedback` retained. Tracked
entry tree was clean. Reused `a68072f`/OF1 findings, then verified the same
limits, app-level ownership and blur independence on HEAD. The OF1 owner
question is resolved by OF1b's explicit answers. SP1/OI1 handoffs and ADR-027 /
ADR-043 were reviewed. No later overnight task was started.

### What changed

- AppLifecycle remains the owner; the Library-focused trigger remains a joiner.
  Active/offline-session admission cancels body work/timers when suspended.
  Foreground and restored online sessions resume it. There is no NetInfo or
  shared native reconnect listener in the installed app; release checks use
  isolated reachability probes. The explicitly approved fallback is foreground
  plus idle active retry admissions (30 seconds up to five minutes), rather
  than an immediate hardware reconnect event. No native dependency was added.
- Limited body runs automatically continue after 250ms, retaining the
  60-second/300-attempt per-run bounds. Five-item groups yield between groups.
  Each committed item publishes progress. A sync/generation change arriving
  mid-flight schedules another list check without creating concurrent flights.
  Inventory follows every advancing 100-item page; the former ten-page ceiling
  no longer strands larger libraries. List absence/failure never deletes work.
- Forward-only local SQLite migration 10 adds four failure/retry columns to
  existing artifact rows, with no new table or remote migration. Per-item
  transient backoff starts at 2 seconds and caps at five minutes. Permanent
  denials are owner/item/version bound; a newer version, successful open or
  explicit clear resets eligibility. Late old-version failures cannot mark a
  new version. Exact detail not_found still removes only that owned artifact;
  a missing quiz key keeps its readable body and stops an endless key retry.
- Current/total/failedPermanent counts come from the existing store. The hook
  subscribes to per-item and image notifications, including queue completion.
  Offline waiting leaves the existing checking label quiet. Image-aware
  readiness, OI1 downloads/concurrency/retries/caps and cleanup stay unchanged;
  the image queue only exposes running state and a final notification.
- Both mobile Library surfaces already use the same caption helper. Mobile
  and web twins now have all four exact requested texts. Web has no offline
  mode or caption caller: the helper is retained and tested, with no new web
  offline behavior. No required platform feature was skipped. No new button,
  toast, animation, design token, dependency, release-version, API/auth/RLS,
  source content or ADR change. React best-practices skill review applied.

### Commits and gate counts

- `5bc6652 feat(mobile): continue offline saving with live progress`
- `9a38527 fix(web): align offline library caption wording`
- `docs: complete OF1b offline saving handoff` (final hash in Git and
  ignored `tmp/overnight/OF1b.status`; no self-hash amendment).

All commits use `--author='galaxymaxp <omgraythekid@gmail.com>'`. Evidence is
**FRESH** for code tip `9a38527`, whose implementation is identical to the
final verified tree. All workspaces have test scripts. **Prompt gates: 10/10
PASS**, plus the additional forced root build. No cached result is called fresh.

| Exact command | FRESH result / counts |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; final repeat |
| `npm run lint -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; final repeat |
| `npm run test --workspace @stay-focused/shared` | PASS, 596/596 tests, 58 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1546/1546 tests, 162 files; final repeat |
| `npm run test --workspace @stay-focused/web` | PASS, 391/391 tests, 60 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android bundle; final repeat |
| `git diff --check` and `git diff --cached --check` | PASS, 0 whitespace errors; repeated at closure |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; Android/iOS/web local exports; final repeat |

Turbo loose env mode preserves the ignored outbound HTTP(S)/fetch/socket
blocker and disabled telemetry/live flags; Expo runs offline. API uses the
complete suite with two workers, not a test filter. Temporary directories stay
inside the repo. Generated Next declarations were inspected/restored. No tmp,
credential, generated export, private fixture or validation output is committed.

Failed first attempts: focused **122 passed / 3 failed** (7 passed / 2 failed
files), then **139 / 3** (11 / 2 files, plus a teardown timeout). New queued-state
and retry-deadline expectations needed updating; cold native imports stalled
the Node fake-timer harness. An isolated diagnostic had **1 failed / 10 skipped**.
Explicit inert filesystem mocks repaired the harness without increasing a
production timeout or weakening assertions. Corrected focused **142/142** and
then **155/155** passed. Later missing-key/pagination regressions are included
in final mobile **1546/1546**. Preliminary full mobile **1545/1545** and a first
1546/1546 run also passed; final UI polish justified a final 1546/1546 rerun and
fresh type/lint/build repeats. All repository gate attempts passed. No remaining
failure or nondeterministic flake established. Existing Vite/renderer/Expo color
warnings are non-failing. Exact evidence and implementation limits are in
[OF1b acceptance](acceptance/of1b-offline-continuation.md).

**UNVERIFIED (owner to confirm):** deployed API/web/mobile revisions, the actual
production cause of 40/72, database/applied-migration/Scheduler state, remote-ref
freshness, and physical Wi-Fi/airplane-mode/foreground behavior. Baseline cached
upstream was behind 2 / ahead 41 without fetch. No live service call, deployment,
remote SQL/migration application, Scheduler operation, email, environment-file
edit, branch switch or push ran. Original untracked UI/, apps/mobile/.gitignore
and supabase/.temp/ remain untouched/unstaged. No local code blocker remains.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** review the local commits and choose
  web/mobile publication separately. No deployment, OTA or EAS command ran.
- **Device checks - NOT RUN, skipped entirely:** on Realme, fresh sign-in on
  Wi-Fi and open Today only; confirm the Library count rises and ends at
  `72 saved for offline use`. Interrupt and restore connectivity; verify
  automatic resumption, background/foreground, both Library captions and
  offline opening. Account for the documented fallback retry delay.
- Confirm all UNVERIFIED states above. For later authorized deployment/env/log
  tooling, installing the missing Vercel CLI with `npm i -g vercel` is strongly
  recommended; no installation or invocation ran here.

Ignored progress/status: `tmp/overnight/OF1b.progress` and `OF1b.status`.
Endpoint OF1b only; rollout/device work and later tasks remain owner work.


## OR3b / orb momentum, ring spin, ripple and pearl - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** OR3b was read in
full, including the overriding UNATTENDED rules. STEP 0-5, both apps, tests,
all prompt gates, forced root build, docs and local commits complete. Baseline
6cfeabb; branch overnight/2026-10-15_feedback retained. Tracked entry tree was
clean; the prompt-listed unrelated paths were preserved. Reused OR3.progress,
be9d5dc and the existing preflight at docs/ai/acceptance/ (the prompt's
shorter docs/acceptance/ path had drifted). OR1b, TC1b and OR2 handoffs and
ADR-048 were reviewed. The explicit 0.4-second owner answer resolves the prior
friction STOP. No further contradiction or ring restructuring was needed.
No later overnight task or roadmap slice was started.

### What changed

- Shared pure model: roughly 100ms velocity smoothing, +/-10 rad/s cap,
  exp(-dt / 0.4) decay, 0.01 cutoff, held-pose pause decay and release continuity.
  Render/input timestamps prevent double decay. The 10ms timing tests stop
  6 rad/s at 2.56s and 1 rad/s at 1.85s. Cancellation, scene disposal,
  navigation/background and Reduce Motion clear inertia; existing idle spin
  remains after the excess velocity settles.
- Both start/end/block ring handlers push Y-axis spin from physical angle
  deltas at gain 3. Clockwise moves the front right; snapping never pushes.
  Ring input stays synchronous and retains priority. Native Today page touch
  pause excludes ring input, coast and active interaction work. Settled Today
  returns to its existing 80ms cadence. Deferred web Reduce Motion can load one
  deliberate ring-driven still pose without enabling ambient animation.
- Identical shader text replaces bulge uniforms with uRippleDir/uRippleTime.
  The 900ms great-circle wave packet travels/fades, restarts on a second tap
  and derives normals from the same height function. Maximum amplitude 0.12
  is below the old 0.18. Off/zero/endpoints match original undeformed pixels.
  Reduce Motion has no ripple, with an instant color change.
- Pearl uses the existing Knowledge Core light body #E6EAF1 and starts the
  pearl/gold/green/violet/orange cycle. Both stores persist stable keys under
  sf.orb.colorKey; missing new keys migrate old sf.orb.color indices 0..3 to
  their original colors. Unknown keys use pearl. Native writes are serialized,
  new reads wait for queued choices, and revisions reject late hydration.
  Web keeps guarded preferences and same-tab/cross-tab notifications.
- **Glow decision: approved removal fallback.** Both Today aura meshes and the
  mobile SVG halo are removed. Body emission uses world-space uLight while
  inverse uSpin rotates liquid; shifting an aura alone would not prove
  tracking. Both auras support per-frame offset, but the installed native
  Stop.setNativeProps ignores new color and invokes parent.forceUpdate.
  The actual implementation probe passes 2/2 assertions; using it at render
  cadence requires React updates or a new native encoding path. Removal
  preserves parity and avoids a disconnected glow/new animation loop.
  Generation keeps its centered aura, exactly matching idle body crossfade
  and restoring authoritative state colors in the same theme. Its centered
  light remains centered under a forward pose rotation.

No required platform feature skipped. Mobile halo-center animation is NOT
APPLICABLE after the approved removal; web has no native SVG halo. Both shader
and sampler parity are tested, including the inverse of the full two-axis
pose. Existing deferred loading, decorative accessibility and touch priorities
remain. No new native dependency, APK requirement, API/auth/RLS, schema,
migration, source-content, design-token or release-version change. React
best-practices review checked refs, effects/dependencies, cancellation and
cleanup; no per-frame React state update or second animation loop.

### Commits and gate counts

- `d0a4c65 feat(shared): add orb momentum ring spin and palette keys`
- `4c3fdbe feat(orb): replace tap bulge with traveling ripple shaders`
- `1a0b512 feat(mobile): connect orb momentum ripple and ring input`
- `445fcb2f feat(web): connect orb momentum ripple and ring input`
- `docs: complete OR3b orb interaction handoff` (final hash in Git and
  ignored `tmp/overnight/OR3b.status`; no self-hash amendment).

All commits use --author='galaxymaxp <omgraythekid@gmail.com>'. Verification is
FRESH against implementation tip 445fcb2f; later changes are docs only.
**10/10 prompt gates PASS**, plus the additional forced root build.

| Exact command | FRESH final result |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; closure repeat |
| `npm run lint -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; closure repeat |
| `npm run test --workspace @stay-focused/shared` | PASS, 610/610 tests, 58 files; includes generated copies |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS, 2433 passed / 3 intentional live skips, 212 files; full suite |
| `npm run test --workspace @stay-focused/mobile` | PASS, 1558/1558 tests, 163 files |
| `npm run test --workspace @stay-focused/web` | PASS, 411/411 tests, 63 files |
| `npm run build --workspace @stay-focused/api` | PASS, 36/36 static pages |
| `npm run build --workspace @stay-focused/web` | PASS, 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS, 1 local Android export |
| `git diff --check` / `git diff --cached --check` | PASS, 0 whitespace errors; closure repeated |
| Additional `npm run build -- --force --env-mode=loose` | PASS, 8/8 tasks, 0 cached; local Android/iOS/web exports |

All four workspaces have test scripts. API uses its complete suite with two
workers and 3 explicitly disabled live cases. Separate workflow/provider
contract suites are NOT APPLICABLE: those implementations did not change.
Turbo loose env mode carries the ignored outbound HTTP(S)/fetch/socket guard;
telemetry is disabled and Expo is offline. No deployment/provider script ran.
Generated Next declarations were inspected/restored; generated tests, exports,
logs, private data and every tmp path remain uncommitted.

Additional local proof: WebGL shader **FRESH PASS 5/5**, 0 page/shader errors;
off/zero/900ms endpoint vs original shader has 0 differing byte channels,
active ripple changes 37,260 channels. Installed native Stop probe **FRESH
PASS 2/2**. These are local code/GPU proofs, not Realme appearance or physical
feel. Focused native final 28/28 and browser deferred RM 4/4 pass.

Failed first attempts are retained in the
[OR3b acceptance report](acceptance/or3b-orb-interaction.md): unavailable python
alias and a stale test-title edit match; early shared build with 2 removed-test
export errors; focused web 9 pass / 4 fail plus 2 failed collection suites from
an edit-script copy error and missing rectangle.height, then 18 / 3 before
repair; new browser fixture 0 / 7 from a missing forceContextLoss mock; first
shared full gate 598 / 4 from stale generated dist tests. Rebuild refreshed
those tests, final shared 610/610 includes both copies. All repaired without
weaker assertions, type suppression or skipped required checks. Earlier lint
had 7 warnings; removed one introduced unused CLOCK import, leaving the
6 existing warnings. Final typecheck/lint repeated after final lifecycle,
storage and deferred RM edits. No remaining nondeterministic flake established.
Existing Vite, React renderer and Expo color warnings remain non-failing.
The first docs-finalizer attempt stopped on Windows cp1252 decoding of a
pre-existing UTF-8 planning file; explicit `py -X utf8` repaired the launch
without changing unrelated content or any implementation gate result.

Current-state, roadmap and sprint reconcile OR3b and supersede the old OR3
requirements STOP. ADR-048 includes the requested follow-up. No local blocker
remains. Original UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved
unstaged; ignored tmp progress/status/logs are uncommitted. Baseline cached
upstream ahead 44 / behind 2, without fetch. Only owned paths are staged.

**UNVERIFIED (owner to confirm):** installed/deployed API/web/mobile revisions,
production DB/applied migrations, Cloud Scheduler state, remote-ref freshness,
actual Realme/browser appearance, gesture arbitration, feel and power. No live
state was queried or inferred from tests. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, deployment, remote SQL/migration application, Scheduler
operation, email, environment-file edit, branch switch or push occurred.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** review local commits and choose
  web/mobile publication separately through the existing owner release process.
- **Device checks - NOT RUN, skipped entirely:** Realme and desktop hard/gentle
  flicks, ring start/end/block and move-hold-move-release, traveling ripple,
  approved absence of Today glow, matching generation aura, fresh pearl and
  preserved legacy gold, Reduce Motion, scrolling, navigation/visibility and
  power. Local GPU proof does not replace physical acceptance.
- Confirm all UNVERIFIED state. For later authorized deployment/env/log work,
  installing the missing Vercel CLI with npm i -g vercel is strongly recommended;
  no installation or invocation ran here.

Ignored progress/status: tmp/overnight/OR3b.progress and OR3b.status.
Endpoint OR3b only; rollout/device work and later tasks remain owner work.

## OR4 / orb color sync between phone and website - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** OR4 was read in
full, including the overriding UNATTENDED rules. STEP 0-4, both apps, tests,
all 10 prompt gates, docs and local commits complete. Baseline 34ab2f4d;
branch overnight/2026-10-15_feedback retained. The run was interrupted after
STEP 4 and resumed from OR4.progress for gates and docs; no committed work was
redone. PF1b user_profiles exists in the repo migrations, so there was no
STOP. Newest migration across both directories was
packages/db 20261018000300 (supabase/migrations newest 20261016010000), so
the new file is 20261018000301. No later task was started.

### What changed

- DB (file only, **not applied**):
  `packages/db/migrations/20261018000301_profile_preferences.sql` adds
  nullable `user_profiles.orb_color` with a check on the five OR3 palette keys
  (null = pearl), `orb_color_updated_at` set by a DB trigger with
  `clock_timestamp()` (last write wins by server time, including conflicting
  upserts), and extends the column-level authenticated select grant.
  Existing RLS and service-only writes are unchanged. `packages/db` types updated.
- API: `GET`/`PATCH /api/profile/preferences` returns `{ orbColor }`. Verified
  bearer, owner-scoped service-client upsert, 1 KiB bounded strict body,
  query strings rejected, invalid key 400, private no-store, CORS like the
  avatar route. A missing column or stale PostgREST schema (42703/PGRST204)
  maps to a typed 503 `profile_preferences_unavailable`. Provider messages are
  never exposed.
- Shared: `parseProfilePreferences`/`isOrbColorKey` reuse OR3 palette keys, and
  `OrbPreferenceSync` is a serialized per-owner queue: 600ms debounce, durable
  pending value, stale-response guard, and it never reverts the visible color.
- Mobile: `OrbPreferencesSync` is mounted in the root layout. The cached
  `sf.orb.colorKey` still renders instantly. It refreshes on start, sign-in,
  foreground and every 15s while active. The pending value is stored in
  sessionStore per owner, and writes are kept safe across sign-out and owner
  changes.
- Web: `OrbPreferencesSync` is mounted in the shell. The cached localStorage
  key renders instantly. It refreshes on load, focus, visibilitychange, online
  and every 15s while visible. The pending value is stored in localStorage per
  owner.
- Server values flow through the existing orb color listeners, so the
  OR2 600ms cross-fade applies. It is instant under Reduce Motion. No new
  dependency, token or native module.
- Parity: both apps got every change. Only the lifecycle triggers differ by
  platform (AppState vs window/document events). Nothing was skipped.

### Commits and gate counts

- e2124bd6 feat(db): add orb profile preferences migration file
- bb5352ea feat(api): add owner-scoped profile preferences route
- d84e058b feat(shared): validate orb preferences and serialize offline sync
- 4197bb95 fix(profile): preserve pending writes across owner lifecycle changes
- a0d2d8bc feat(mobile): sync cached orb color with profile preferences
- 78c8dd0c feat(web): sync orb color on focus and reconnect
- 7fc55b7d test(profile): align orb sync fixture import order
- docs commit: hash in tmp/overnight/OR4.status

Focused results (all FRESH): route 17/17, local PGlite DB 8/8, shared sync 4/4,
native 20/20, web 16/16.

Final gates (all FRESH PASS):
- typecheck --force: 8/8 tasks, 0 cached.
- lint --force: 8/8 tasks, 0 errors, plus the same 6 warnings already in
  untouched files.
- Tests: shared 614/614 (59 files); API 2452 passed with 3 intentional live
  skips (213 files); mobile 1567/1567 (165 files); web 417/417 (64 files).
- Builds: API 37/37 pages, web 22/22 pages, Android export PASS.
- git diff --check: PASS.

Failed first attempt: the first full API run hit 2 timeouts in files OR4 did
not touch: canvas-file-ingestion (15s) and page-snapshot-prerender-hook (5s).
That run was 2450 passed / 2 failed. Both files passed 34/34 when run alone,
and the full rerun was green. This is recorded as a load-timeout flake.
Builds regenerated next-env.d.ts in api/web; both files were restored. The docs
insert first failed on the missing `python` alias and was rerun with
`py -X utf8`. Details:
[OR4 acceptance](acceptance/or4-orb-color-sync.md).

**Risks/debt:** the clients refresh every 15s and on focus/foreground, with
no push channel. A color change on one device shows on the other at its next
focus, foreground or retry tick. Until the migration is applied, both clients
silently stay local-only.

**UNVERIFIED (owner to confirm):** applied migrations and production DB
schema, deployed API/web/mobile revisions, remote-ref freshness, and real
phone/browser sync. No Supabase, Vercel, Google Cloud, Canvas or Resend call,
deployment, remote SQL/migration application, Scheduler operation, email,
environment-file edit, branch switch or push occurred.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** apply
  `20261018000301_profile_preferences.sql` after profile_avatars (copy it into
  supabase/migrations if that is the apply path). Then deploy the API and the
  website, and publish the OTA through the existing owner release process.
- **Device checks - NOT RUN, skipped entirely:** on the Realme, tap the orb to
  violet. Open or focus the website: it should show violet. Change the color on
  the web, then reopen or foreground the app: it should match. Also check the
  cross-fade, Reduce Motion (instant), that an offline tap is sent on
  reconnect, and that nothing breaks before the migration is applied.
- Confirm all UNVERIFIED state. For later authorized deployment/env work,
  installing the missing Vercel CLI with npm i -g vercel is recommended; no
  installation or invocation ran here.

Ignored progress/status: tmp/overnight/OR4.progress and OR4.status.
Endpoint OR4 only; rollout/device work and later tasks remain owner work.

## WGP2 / generation orb and vertical step bar - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** WGP2 was read in
full, including the overriding UNATTENDED rules. STEP 0-4, both apps, tests,
all 10 prompt gates, docs and local commits complete. Baseline 2480cf14;
branch overnight/2026-10-15_feedback retained. First run (no prior
WGP2.progress). Tracked tree was clean; UI/, apps/mobile/.gitignore,
supabase/.temp/ and tmp/ were left alone and never staged. Newest handoffs
(WGP1, OR2, OR3b, OR4, GB1) were read first. No later task was started.

### STEP 0 finding (interactivity root cause)

A local Playwright harness rendered the real web GenerationScreen with
globals.css and three.js (fictional local job fixture, all non-local requests
aborted) at 1440x900 and 390x844. The canvas was present;
`document.elementFromPoint` at the orb center returned the ball-only
`orb-touch` layer at both widths, and a click changed `sf.orb.colorKey`
pearl -> gold. So none of the prompt's candidates (dynamic placeholder, pane
stacking, status overlap, inset math, WebGL fallback) was the cause. The real
cause is visual: the Knowledge Core passes the remembered idle color only in
the `idle` state (OR2 rule), and a generation page is never idle. A tap
changed storage with nothing visible, and the 0.12 ripple was masked by the
full-speed spin. DayOrb could take a state input through the existing
coreModel mapping without duplicating shader logic, so no STOP.

### What changed

- **One orb (both apps).** DayOrb gains an optional `state`. coreModel (web
  and mobile copies) adds `createCoreLevels` / `stepCoreLevels` /
  `coreLevelsExtra`. These add the Knowledge Core's excess over its own idle
  profile (life, glow, spin, liquid rate, shimmer level) with the same easing
  constants. Running states are livelier and render at full frame rate.
  Failure eases `error` to 1 (the existing desaturated, glow-off tint, which
  wins over the idle color) and then stops the loop. Completion brightens for
  about 1 s, then renders exactly as idle Today. Reduce Motion snaps the
  levels, with no flash and no ambient loop. Without a state, Today's
  uniforms are unchanged (tested).
- **Web generation page:** new `GenerationOrb` (DayOrb + the shared
  OrbPointerLayer and remembered or synced color), still lazy-loaded with
  three.js at the WGP1 size. The `.day-orb-fallback` static fallback is kept.
- **Mobile:** GenerationCore renders DayOrb with an OrbTouchLayer. This covers
  the generation screen and the Generate "Submitting" view. It keeps the
  pre-GL install fallback (GenerationVisual) and DayOrb's PNG fallback.
- **Web step bar:** the numbered list and its Done/Pending/In progress lines
  are replaced by a 3px pill track with one segment per stage. Done segments
  are --success, failed is --danger (still showing "Stopped here"), pending is
  --line. The current segment has a 1.6s ease-in-out top-to-bottom sweep,
  reusing the skeleton highlight's muted color; under Reduce Motion it is a
  steady half fill. Screen readers get aria-current plus a hidden state word.
  Building study material fills by `progress.completed/total`, with the
  `3 of 18 sections` count moved under its label (pages progress attaches to
  the current step).
- **Fast tail:** pure `stepRevealQueue(prev, next)` plus a 180ms reveal hook.
  It never marks a stage done before the server does, and Reduce Motion
  makes it instant. The Library open is now keyed by the saved id, so these
  re-renders (or polls) can no longer cancel the existing 1400ms wait. The
  redirect is never delayed.
- **Mobile compact progress:** under the status line, a 3px pill bar with the
  shared SkeletonBlock shimmer while running (hidden when stalled, failed or
  done). It fills by real section or page progress, with the same caption,
  and holds still under Reduce Motion. No step list was added.

**Parity and skips:** both apps got the orb change. The step list is web-only
and the compact bar is mobile-only, as the prompt specifies. Mobile reuses its
existing opacity skeleton shimmer instead of a sliding gradient: there is no
gradient primitive, and adding a dependency was out of scope. The web topbar
Queue icon is a 26px static PNG, not a renderer, so it was left unchanged; the
Queue generation view is the same GenerationScreen. The Knowledge Core files
stay: the mobile lab screen uses them, and web `KnowledgeCore.tsx` is no longer
imported by production code but is kept with its tests.

### Commits and gate counts

- 0aeb7177 feat(web): Today orb with generation state on generation screen
- d1231c6a feat(mobile): Today orb with generation state on generation screens
- 392ca412 feat(web): vertical generation step bar
- 3bef7b33 feat(mobile): compact generation progress
- 4063c883 test(web): give the recovery screen fixture a matchMedia window
- docs commit: hash in tmp/overnight/WGP2.status

All use `--author="galaxymaxp <omgraythekid@gmail.com>"`, with no
attribution trailers. **10/10 prompt gates FRESH PASS**, plus the forced root
build:

| Command | Result |
| --- | --- |
| `npm run typecheck -- --force` | 8/8 tasks, 0 cached (loose env mode for the network guard; repeated at closure) |
| `npm run lint -- --force` | 8/8 tasks, 0 cached; 0 errors, 6 existing warnings; repeated at closure |
| `npm run test --workspace @stay-focused/shared` | 614/614 tests, 59 files |
| `npm run test --workspace @stay-focused/api` | 2452 passed / 3 intentional live skips, 213 files (`--maxWorkers=2`) |
| `npm run test --workspace @stay-focused/mobile` | 1580/1580 tests, 166 files |
| `npm run test --workspace @stay-focused/web` | 435/435 tests, 66 files (after repair) |
| `npm run build --workspace @stay-focused/api` | 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | 1 local Android bundle |
| `git diff --check` | PASS, 0 whitespace errors |
| Additional `npm run build -- --force --env-mode=loose` | 8/8 tasks, 0 cached |

The new local Playwright suite (`generation-screen.browser.test.ts`, part of
the web gate) passes 3/3. At 1440 and 390 it checks the canvas, the center hit
target, that a tap changes pearl -> gold, the numberless and wordless list,
the `animated` current segment with `step-sweep`, and the Reduce Motion
`none`. Each one launches local Chromium with software WebGL and aborts all
non-local requests.

**Failed first attempt:** the first full web gate ran 430 passed / 5 failed in
`generationRecovery.test.ts` (`window.matchMedia is not a function`; its
EventTarget window stub lacked matchMedia). 4063c883 adds it, with no
assertion changed; the rerun passed 435/435. Other implementation-time
failures are recorded in the acceptance report. No assertion was weakened, no
rule suppressed, no test skipped, and no flake was observed. The builds
regenerated both next-env.d.ts files; both were restored. Details:
[WGP2 acceptance](acceptance/wgp2-generation-orb-step-bar.md).

**Risks/debt:** the state mapping's visual weights (life, glow, flash) are
tuned by reasoning and local renders, not on a device. The running generation
orb now renders at full frame rate, the same as the Knowledge Core did before.

**UNVERIFIED (owner to confirm):** whether the deployed website even includes
the OR2/OR3b pointer handling (an older deployment would explain "not
interactable" on its own). Also: deployed API/web/mobile revisions, applied
migrations (OR4 file still pending), remote-ref freshness, and the physical
look and feel on the Realme and desktop. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, deployment, remote SQL or migration application,
Scheduler operation, email, environment-file edit, branch switch or push.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** publish the website and the mobile
  OTA through the existing owner release process. On the website and Realme,
  start a reviewer generation. Check that the orb looks like Today's, rotates
  and ripples, and shows state; that the step bar shimmers on the current
  step; that Building study material fills with sections; and that the last
  steps tick through in sequence before Library opens.
- **Device checks - NOT RUN, skipped entirely:** tap color change and
  hold-rotate on the generation page, failure dimming, completion brighten,
  Reduce Motion (steady bar, no sweep or brighten), the mobile compact bar
  and caption, and power while generating.
- Confirm the UNVERIFIED items. For later authorized deployment or env work,
  installing the missing Vercel CLI (`npm i -g vercel`) is recommended; no
  installation or invocation ran here.

Ignored progress/status: tmp/overnight/WGP2.progress and WGP2.status.
Endpoint WGP2 only; rollout/device work and later tasks remain owner work.

## GL1 / Today glass clock - PASS locally (2026-10-19)

**Status: PASS for the finite unattended local code scope.** Re-read the full
GL1 prompt with UNATTENDED rules first, then progress/Git/diff. No prior GL1
progress or committed work existed. Baseline ec9ddbf9; retained branch
overnight/2026-10-15_feedback. Tracked entry tree was clean. STEP 0, both apps,
atlas/shared compositor, tests/screenshots, all gates, docs and commits complete.

Both apps now draw only the large time as refractive glass in the existing
orb GL view. Inter Bold 700/tabular/-2% tracking, 45% baseline AM/PM; plain
Inter 600/500 small labels; no weekday and centered idle time. One committed
512x256 build-time atlas, one pure layout and one shared shader/compositor;
no per-time texture uploads. Existing scrim is retained below glass, with
stronger bright-tone treatment. Plain Inter time remains accessible and is
shown until glass succeeds or if GL/atlas/float/shader/render support fails.
Reduce Motion keeps glass with no ambient loop or shimmer. Both apps retain
80ms idle/16ms interaction; mobile retains 0.6 render scale. Native uses
existing expo-font/asset/GL modules; web keeps deferred loading without drag
updates restarting it. Generation passes no clock prop and keeps its orb path.
Parity is complete; differences are only native asset/font loading versus web
deferred loading/context events. No product skip. ADR-049 and design readme/
typography comments record the approved readout-only font/glass exceptions.

### Commits and gate counts

- c4329a3f build: clock glyph atlas from Inter
- 2afd2e41 feat(shared): add clock glyph layout and glass compositor
- 18e2967c fix(shared): preserve glass clock contrast over translucent orbs
- dec26802 feat(mobile): render Today time as glass in Inter
- cba28643 feat(web): render Today time as glass in Inter
- e00dd0ea fix(web): keep the orb fallback in place after context loss
- docs commit: hash in tmp/overnight/GL1.status and Git.

All use the requested owner author and no attribution trailers. All prompt
gates FRESH PASS, plus the forced root build:

| Exact command | FRESH result |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; closure repeat |
| `npm run lint -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; 0 errors / 6 existing warnings; closure repeat |
| `npm run test --workspace @stay-focused/shared` | PASS 632/632 tests, 64 files; post-build repeat |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | PASS 2452 passed / 3 intentional live skips, 213 files |
| `npm run test --workspace @stay-focused/mobile` | PASS 1587/1587 tests, 166 files |
| `npm run test --workspace @stay-focused/web` | PASS 451/451 tests, 67 files, including 10/10 clock browser checks |
| `npm run build --workspace @stay-focused/api` | PASS 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | PASS 22/22 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | PASS local Android export |
| `git diff --check` / `git diff --cached --check` | PASS, 0 whitespace errors (closure checked again before commit) |
| Additional `npm run build -- --force --env-mode=loose` | PASS 8/8 tasks, 0 cached; local exports only |

Clock browser suite is 10/10, real local Chromium/SwiftShader, all non-local
requests aborted. Eight screenshots:
tmp/overnight/GL1-screens/{1440,390}-{light,dark}-{idle,drag}.png.
Brightest-pearl solid-stroke contrast minimum: light 7.08:1,
dark 11.42:1 (75th-percentile solid pixels per glyph, excluding AA
fringe; a regression check, not a full WCAG audit). Local renderer.info:
1 -> 3 draw calls/frame, median interval 83.4 -> 83.5ms,
median CPU submission 0.20 -> 0.30ms,
p95 0.30 -> 0.40ms. These do not establish GPU/device performance.

**Failed first attempts:** native focused 88 pass/15 fail (missing Text mock,
fixed, then 103/103); browser 0/8 (pre-DOM theme/date setup, fixed), later 6/8
(intro spring settling, harness waits), contrast 9/10 (bright M/P/1, stronger
scrim/tint, unchanged thresholds), deferred fixture 5/6 (mock module cache
ordering, fixed). Draft typecheck 6/8 (test host-name comparison, fixed);
draft lint had 5 introduced warnings, all removed. A docs EOF blank line was
also fixed. The final gate sequence passed; no nondeterministic flake remained.
All details, limitations and logs: [acceptance](acceptance/gl1-glass-clock.md).
Generated Next declarations were inspected/restored; exports, screenshots,
test copies, logs and tmp helpers remain uncommitted.

**Risks/debt:** local software WebGL and mocked native lifecycle cannot prove
Realme GPU/image upload performance or physical screen-reader behavior. A
half-float-unsupported GPU uses plain Inter time rather than disappearing.
The stronger scrim is deliberate for brightest-tone readability; owner visual
review remains. No engine/auth/RLS/source, DB/migration or release change.

**UNVERIFIED (owner to confirm):** deployed website/mobile/API revisions,
the exact installed APK's native module inventory, real GPU/Realme timing and
physical appearance/accessibility, applied remote migrations and Scheduler
state, and remote-ref freshness. Local Expo dependency/autolinking evidence
requires no new native module or APK change. No Supabase, Vercel, Google Cloud,
Canvas or Resend call, deployment, remote SQL/migration application, Scheduler
operation, email, environment-file edit, branch switch or push occurred.

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** publish the website and mobile OTA
  through the existing owner release process. No API/database change is needed
  by GL1; prior slices retain their own pending release work.
- **Device checks - NOT RUN, skipped entirely:** website and Realme current
  time and dragged time look like glass, respond to orb rotation/ripple/color,
  stay readable in both themes, retain plain small Inter labels, and show no
  weekday. Check dragging without flicker, Realme frame cost/stutter/power,
  screen-reader time and the static/plain fallbacks. Reduce Motion must retain
  glass with no ambient motion or shimmer.
- Confirm the recorded UNVERIFIED items. For later authorized deployment/env/log
  work, strongly recommend installing the missing Vercel CLI with
  `npm i -g vercel`. No installation or invocation was made during GL1.

Ignored progress/status: tmp/overnight/GL1.progress and GL1.status. Unrelated
untracked paths remain untouched. Endpoint GL1 only; no later task started.

## WA1 / Website password recovery — recovered 2026-10-19

**PASS for the finite unattended local code scope.** Implementation commit
`3fe40518 feat(web): add guarded password recovery`; documentation commit is
recorded in Git and ignored WA1.status. The interrupted worker's final callback
changes were reviewed and freshly verified without changing its implementation.
Request normalization/validation, neutral safe notices, busy lock, PKCE and
explicit legacy recovery, expired/used links, min-eight matching passwords and
owner-bound recovery guards are complete. Normal sign-in/OAuth remain intact.
No mobile/API/database implementation change or new styling/motion.

**FRESH verification on final source:** typecheck/lint/root build 8/8 each,
0 cached, 6 existing warnings; shared 632/64 files, API 2452/213 files with
3 intentional live skips, mobile 1587/166 files, web 502/69 files including
20 local browser cases. API/web production builds generate 37/37 and 23/23
pages; Android export and diff/staged-diff checks pass. All four 1440/390
screenshots were visually reviewed. Node gates blocked external service traffic;
public documentation was read separately. Full commands/exits/times and source
hashes are in ignored tmp/overnight/WA1-recovery-*.

**Recovery evidence and limitations:** Windows/source checkout and applicable
instructions were verified. PID 20872 and its worker/toolchain were gone; the
other Node process is the local panel. The old Metro PID had been reused by Edge
and was not killed. No second worker or queue item was started. Owner Pause
retains its original contents/timestamp. The previous closure log had 502 tests,
but the earlier 498/499 passes did not cover the final callback; the prior Android
export had no completion result. All required gates were rerun, including root
build. Existing Vite/Expo warnings and prior assertion failures are retained;
no recovery test failure or flaky retry occurred. An inline declaration-restore
command hit a quoting error before writes, then a checked script restored only
the two inspected task-generated declarations. Unrelated UI/, mobile .gitignore
and supabase/.temp/ have unchanged hashes and remain uncommitted.

### Owner steps remaining

- **Rollout — NOT RUN for WA1:** verify Supabase Auth Redirect URLs include
  https://stay-focused-ten.vercel.app/auth/reset and the reset email template
  uses {{ .ConfirmationURL }}; publish through the separately authorized release.
- **Device/live checks — NOT RUN:** test a real email/password recovery link,
  invalid/expired link and normal OAuth on the deployed website. These remain
  UNVERIFIED (owner to confirm); local stubbed tests do not prove live behavior.
- The owner separately authorized exact FULLSEND recovery: reviewed main,
  fresh gates, normal push, exact-commit READY website, preview APK and selected
  realme RMX3151 adb install -r. No FULLSEND step is claimed by this WA1 closure.

No product-service API call, email, remote SQL/migration, Scheduler operation,
environment-file edit, push or deployment occurred during WA1 recovery. Runner
checkpoint: tmp/overnight/WA1.progress and WA1.status. WX1 remains unstarted and
Autopilot paused. Endpoint is WA1 plus the separately authorized FULLSEND only.


## WX1 / Website saved study exports - 2026-10-19

WX1 / Website saved study exports (2026-10-19): **PASS for the finite
unattended local code scope**. Pure layout/PDF/DOCX/PPTX builders now live in
`@stay-focused/shared/study-export`; mobile retains SAF saves. The website
lazily downloads Reviewer PDF (with existing TXT retained) and saved Draft
PDF/DOCX/PPTX. Unsaved Draft edits disable export with the save-first hint;
exports use the confirmed save response. Existing menu/aside, tokens, busy
locks and safe Notices are used; no API/schema or motion change.
Commits: 255081e3 (shared/mobile), f787b490 (web); docs hash in Git/WX1.status.
FRESH PASS: forced typecheck/lint/root build 8/8 tasks each, 0 cached;
6 existing lint warnings. Shared 643/65 files, API 2452/213 files with
3 intentional live skips, mobile 1582/166 files, web 515/71 files.
API/web builds 37/37 and 23/23 pages; Android export and diff checks pass.
Original builders are identical after import-path normalization; the web builder
chunk is absent from all initial page bundles. First failures/retries are
recorded in acceptance. Rollout and Device checks NOT RUN, skipped entirely;
live deployed state and actual viewers are UNVERIFIED (owner to confirm).
No service call, deployment, remote SQL/migration, Scheduler, environment-file
edit or push. Unrelated paths and Owner Pause remain; no later task started.
This supersedes earlier WX1-unstarted checkpoint notes without resuming FULLSEND.

Implementation commits:

- `255081e3 refactor(shared): move study export builders to shared`
- `f787b490 feat(web): export saved reviewers and drafts locally`
- Documentation commit: recorded in Git and ignored WX1.status.

Gate counts: FRESH forced typecheck/lint/root build 8/8 each, 0 cached; lint
6 existing warnings. FRESH tests: shared 643/65 files, API 2452/213 files +
3 intentional live skips, mobile 1582/166 files, web 515/71 files. FRESH API/web
builds 37/37 and 23/23 pages; Android export and diff/staged-diff pass. First
typecheck failed 4/6 tasks on a test mock type, fixed. First mobile/API runs
failed 1 and 2 existing 5000ms timeouts under load (1581/2450 passed); full
two-worker retries passed without timeout/assertion changes. The runner preload
path failure (0 tests) and trailing blank line correction are also retained.
[Acceptance and exact commands](acceptance/wx1-web-study-export.md).

### Owner steps remaining

- **Rollout - NOT RUN, skipped entirely:** deploy the website. Mobile changed
  beyond imports (shared MIME lookup/dependency ownership), so include it in
  the next authorized OTA when shipping the refactor. Builders retain identical
  output behavior. No API/database release is required for WX1.
- **Device checks - NOT RUN, skipped entirely:** on desktop and phone browsers,
  export Reviewer PDF and Draft PDF/DOCX/PPTX and open all files in their apps;
  check save-first gating and post-save content. Check native folder exports
  when shipping mobile. Deployed revisions, viewers and physical behavior are
  **UNVERIFIED (owner to confirm)**. No live state was queried.
- For later authorized Vercel env/deploy/log work, strongly recommend installing
  the missing CLI with `npm i -g vercel`; no Vercel command or install ran.

Ignored evidence: tmp/overnight/WX1-* plus WX1.progress and WX1.status. No
service call, deployment, remote SQL/migration, Scheduler, email, environment
edit or push. Original untracked paths preserved; no later task started.

## OA1 - ambient orb light, local implementation complete (2026-10-20)

**Status: PASS for the finite unattended local code scope only.** STEP 0-4,
local implementation, required applicable gates, documentation and scoped local
commits are complete. This is the first implementation milestone of the owner's
finite implementation -> supervisor handoff -> separate verification benchmark.
No OA2 or other backlog task was started.

Requirement coverage: all four actual GL scene owners use one shared procedural
ambient renderer driven by the body's resolved palette, liquid clock/life/stir,
spin, world-space light, glow and error. Today and Generation/Queue-opened jobs
reuse the same component on both apps. Retained KnowledgeCore/lab paths, deferred
and failed stills and both Queue raster miniatures are covered. The old aura is
replaced, not stacked. Static spills use the displayed gradient/image; the native
failure PNG remains a pearl still. Body/clock shader and interaction sources,
layout, synced preferences, native 0.6 scale and existing frame cadence remain.
Reduced Motion snaps to stable source light without an ambient loop; visibility,
focus, AppState and disposal stop work. This is a documented procedural
approximation, not pixel sampling or a claim about YouTube's private algorithm.

Commits (all author galaxymaxp <omgraythekid@gmail.com>):

- 3b1abbbb feat(shared): add source-coupled orb ambient renderer
- 50cf0103 feat(orb): integrate ambient spill across web and mobile
- docs(orb): close OA1 local implementation and gates (this documentation
  commit; exact hash is recorded in Git and tmp/overnight/OA1.status).

Final gates: **FRESH PASS** forced root typecheck, lint and build **8/8 tasks
apiece, 0 cached**, with **6 baseline lint warnings / 0 errors**. Shared default
suite **660/660 / 68 files** includes compiled duplicates; explicit source-only
suite is **330/330 / 34 files**. Mobile **1581/1581 / 166 files**, web **524/524 /
72 files** pass. The web suite includes **8 ambient + 10 glass + 3 Generation
page browser cases**. API tests **NOT APPLICABLE** (client-only subpath and no
API/default shared runtime/schema change). The prompt's equivalent-build
allowance reuses final root API **37/37 generated pages**, web **23/23** and
Android export (one HBC bundle, also iOS/web emitted); separate standalone
build invocations were **NOT RUN**, not cached. Working/staged diff checks
**FRESH PASS, exit 0 / 0 whitespace errors**, including each scoped commit.

First attempts are retained in [acceptance](acceptance/oa1-orb-ambient-glow.md),
including root typecheck 7/8 (two unsupported native Image props, repaired),
focused equality/fallback issues, added BOM lint warnings (removed), and first
full web 521 passed / 3 failed. Direct GPU snapshots removed a 2D conversion
measurement artifact without changing tolerances; the existing Generation
caption test now waits for its same exact animated target. Affected browser
retry passed 11/11 and final full web passed 524/524. No gate was weakened.

Evidence: ignored tmp/overnight/OA1-*.log, OA1-before/, OA1-after/ (screenshots,
WebM videos, palette/state/context-loss and GPU/resource JSON), OA1.progress
and OA1.status. Browser harness traffic is loopback only, with no academic body
content or production calls. Direct GPU interior RGBA diff and edge alpha are
0 on both tested GL paths; spatial spill is nonzero. Local DayOrb draw calls
are 1 -> 2 (3 -> 4 with clock), idle intervals remain about 83ms, and CPU
submission/resource observations are recorded without claiming GPU/device FPS
or power. Before video was not captured. Next-generated declaration-only diffs
were inspected/restored. No validation output or generated artifact is staged.

**Owner steps remaining**

- Review OA1 commits, source inventory, gates and artifacts, then publish a
  separate bounded OA2 visual/performance/coverage verification prompt. Final
  visual/reference parity is UNVERIFIED; unit PASS is not visual approval.
- **Rollout: NOT RUN, skipped entirely.** Follow the owner's separate release
  process after review. No deployment, remote migration, Scheduler, email,
  environment-file edit, service call or push occurred here.
- **Device checks: NOT RUN, skipped entirely.** Confirm real Android Today,
  preparation, Generation/Queue-opened jobs, miniature and fallback lighting,
  themes/palettes/states, Reduce Motion, glass/plain clock, gestures/scrolling,
  clipping, focus/background, actual GPU/frame timing, allocations and power.
- Deployed revisions and live preference/database/migration/Scheduler state,
  Android compositing/blur and all physical results are **UNVERIFIED (owner to
  confirm)**. Original UI/, apps/mobile/.gitignore and supabase/.temp/ are
  preserved. Owner Pause and unrelated scopes remain unchanged. No Supabase,
  Vercel, Google Cloud, Canvas or Resend call was made.

## OP2 � larger glass time, cumulative waves and source-faithful backdrop (2026-10-20)

**Status: PASS for the finite unattended local code scope.** STEP 0�4, local
visual/regression checks and scoped commits are complete. Rollout/device checks
are skipped. The full OP2 unattended header governed this run; no questions or
production access were required. Baseline 202f8c3f on the expected branch matched.

Commits:
- `9e17fd4d feat(orb): refine glass time, cumulative waves and ambient backdrop`
- `docs(orb): close OP2 local acceptance and gates` (this documentation checkpoint;
  final hash is recorded in Git and tmp/overnight/OP2.status, per AUTOPILOT).

Both platforms use 40px/point refractive time with proportional AM/PM and real
fallback text. Eight independently timed 1.8s waves preserve earlier fronts and
add smooth bounded energy; reduced motion keeps only the palette acknowledgment.
One 64x64 RGBA target samples the resolved body into a diffuse backdrop, retaining
source opacity and hue/luminance. No full-resolution second orb, readback or
extra animation loop. Today, preparation/detail/Queue Generation, retained
KnowledgeCore and exact existing static/miniature sources are covered.

FRESH final gates: typecheck/lint/forced root build 8/8 tasks each, 0 cached;
six existing lint warnings, 0 errors. Shared 670/670 in 68 files (335 source
cases plus compiled copies), mobile 1581/1581 in 166, web 532/532 in 72.
Equivalent final root API/web builds 37/37 and 23/23 pages; Android HBC emitted
and inspected for final shader strings. Separate duplicate builds NOT RUN,
satisfied by the prompt-permitted final forced equivalents. Relevant API tests
NOT APPLICABLE: no API consumer, server behavior, auth or schema changed.
Unstaged and staged diff checks FRESH PASS, 0 whitespace errors.

Actual local GPU pixels, 390/1440 light/dark/Reduce Motion/state/palette captures,
320/390/1440 long time and fallback, eight dawn/dusk captures and before/after
WebM decoded motion frames were reviewed. Real page-composited luminance
correlation .9725�.9997 with moving dim sectors; interior RGBA diff and border
alpha 0. One-to-five 150ms taps grow peak .00989?.03020 and RMS .00339?.01614;
GPU retains five distinct ages and later reaches count 0. Idle cadence ~83ms;
3/5 draws, 2/1 and 4/3 geometry/texture counts, one 16KiB logical target.
CPU submission observations are not Android/GPU timing or battery evidence.

Failures are retained in [acceptance](acceptance/op2-orb-polish.md): launcher
preload path quoting, initial float/negative-zero assertions, new QA typing,
clock contrast/material iterations, a packet interference bug caught by a
stronger buildup audit, old uniform/text-child tests, and an initial ambient
metric that incorrectly normalized away opacity. Source coverage and emitted/
visible metrics were corrected. No test threshold was lowered. Earlier forced
builds were superseded; only the final source gates support this PASS.

Artifacts are ignored under tmp/overnight/OP2-*: logs, gates JSON, before/after
screens/videos, day-state captures, pixel/resource data, decoded motion, progress
and status. Generated Next declarations were inspected/restored. No validation
artifact, private fixture or credential was staged.

**Owner steps remaining**

- Rollout: NOT RUN, skipped entirely. Review the scoped commits/evidence and
  separately initiate any release. Nothing was pushed, deployed or published.
- Device checks: NOT RUN, skipped entirely; Realme is disconnected. Confirm
  actual Android glass/plain typography, dynamic source lighting, preparation/
  Generation/Queue detail, fallback/miniatures, gestures/scrolling, reduced motion,
  focus/background/context recovery and actual GPU/frame/power behavior.
- Deployed revisions, live preference/database/migration/Scheduler state and all
  physical appearance/performance are **UNVERIFIED (owner to confirm)**. Static
  native pearl stills do not establish live procedural palette parity.
- GV1 is the separately queued next scope and has not started. Owner Pause and
  unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ are preserved.
  No Supabase, Vercel, Google Cloud, Canvas or Resend call, environment-file edit,
  remote SQL/migration, Scheduler change or push occurred.


## GV1 generation viewport - unattended local closure (2026-10-20)

Status: **PASS for the finite unattended local code scope**. Implementation
`8b37b5ae fix(generation): fit active pages to measured viewports`. Documentation:
`docs(generation): close GV1 local acceptance and gates` (this follow-up commit;
exact hash and both commits are recorded in tmp/overnight/GV1.status and Git).
Branch: overnight/2026-10-15_feedback. Owner Pause remains preserved.

Native detail/pre-admission pages now use Page's existing non-scroll flex path
and the measured post-chrome viewport. Full canvas/fallback sizing, width-aware
controls, concise enlarged-text landscape status, full details/errors and actions
fit without clipping. Automatic-start copy waits for accepted server identity
before promising background work. Phone web fits the dynamic safe viewport,
with a bounded details/actions dialog; desktop keeps two panes. Existing job
handlers, picker/Queue behavior and OP2 remain.

FRESH final serial gates: typecheck/lint/build **8/8 each, 0 cached**, six existing
lint warnings; shared **670/68 files**, mobile **1600/169**, web **540/72**. Root
build supplies equivalent FRESH API **37/37 pages**, web **23/23 pages** and Android
HBC export; separate duplicate invocations NOT RUN. Relevant API tests are NOT
APPLICABLE (client layout/copy only, no server/request/auth/schema change).
Unstaged and explicitly staged diff checks PASS exit 0. The final forced build
took 235.824s wall. Failed focused attempts, the native audit and
interrupted intermediate validation are retained; only the final frozen-source
run is closure evidence.

Bounds/screenshots: synthetic RN Web native components cover **66** state/viewport
combinations at 360x640, 390x844, 412x915, 640x360, 24/24 safe insets and 200%
text; all complete canvases exceed 48 points. Actual web covers **40** state/
viewports plus enlarged text, dynamic resize, desktop and tap/hold/momentum.
Full text/error/action reachability and zero page offset are asserted. Local
Today/Generation OP2 clock/waves/backdrop tests and fresh captures were jointly
reviewed. Evidence: ignored GV1-web/, GV1-native/, GV1-gate-*.log and final
Android bundle hash report under tmp/overnight/. Native fixtures replace GL;
component/unit PASS is not physical or native rendering approval.

### Owner steps remaining

Native rendering/appearance, physical Android interactions/performance and OS
text scaling: **UNVERIFIED (owner to confirm)**. No emulator was running; Realme
is disconnected. Device checks: **NOT RUN**, skipped entirely; no device install
or reconnection was attempted. Rollout: **NOT RUN**, skipped entirely. Live/
deployed state: **UNVERIFIED (owner to confirm)**. Review commits/evidence and
separately initiate any publication. No service call, environment-file edit,
remote SQL/migration, Scheduler operation, deployment or push. Original untracked
UI/, apps/mobile/.gitignore and supabase/.temp/ remain. Finite GV1 endpoint
reached; no later task or FULLSEND was started.

See [GV1 acceptance](acceptance/gv1-generation-viewport.md).

## OT1 Today orb theme sync - unattended local closure (2026-10-21)

Status: **PASS for the finite unattended local code scope**. Implementation
`45526e95 fix(orb): unify palette appearance and light clock tint`.
Documentation: `docs(orb): close OT1 local acceptance and gates` (this follow-up
commit; exact hash and both commits are in Git and tmp/overnight/OT1.status).
Branch: overnight/2026-10-15_feedback. Original baseline was 32206c16. Resume
inspected STEP 0 and unfinished edits; no committed work was repeated.

Cause confirmed at baseline clock-glass-renderer.ts:106: light mode applied .78
black scrim. Today and Generation already shared the resolved theme. A shared
appearance helper now drives body uniforms and all static/Queue surfaces. The
clock uses light-theme ink instead of darkening the orb; existing accessible
time, OR4 storage, gestures, scene identity and momentum remain.

FRESH final serial gates: typecheck/lint/build **8/8 each, 0 cached**; six
existing lint warnings. Shared **682/70 files** (includes compiled duplicates;
341 source cases), mobile **1611/169**, web **546/72**. Separate web build
**23/23 pages**, Android HBC export and both diff checks PASS exit 0. Root API
build **37/37 pages**; API tests NOT APPLICABLE because only client decorative
rendering changed. The first typecheck failed at 6/8 successful tasks with two
native type errors; both were repaired without weakening types/assertions.
The first mobile suite also stopped on an unmocked native SVG import in the
retained KnowledgeCore fixture: 168 files/1604 tests passed, 1 suite failed to
load. Its native boundary mock was added, preserving every assertion; forced
typecheck/lint and the complete mobile suite were rerun. The passing root build
and shared suite preceded this test-only repair; production sources were unchanged.
Logs, failed attempts, source hashes and evidence remain under ignored
tmp/overnight/OT1-*; no validation artifact or generated output was staged.

Final documentation resume found implementation already committed. All 25 saved
source hashes still match; the nine saved gate results and their logs were
rechecked. Implementation gates were NOT RUN again for documentation-only
closure; their original FRESH evidence remains valid. Final documentation diff
checks are FRESH. The capture contact sheet and metadata were reinspected.

Visual evidence: eight actual Today/Generation x light/dark x pearl/gold web
captures inspected together and against the original black light-mode center.
Eight browser theme toggles retain the canvas. Existing GPU stroke checks pass
(light 10.44-12.96:1, dark 5.51-11.84:1 statistics); native/web component tests
retain scene and momentum. Chromium software WebGL and native unit PASS do not
establish physical-device acceptance. Manual visual preload-path failure and
unavailable Python/contact-sheet fallback are recorded in acceptance.

### Owner steps remaining

Rollout: **NOT RUN**, skipped entirely. Review commits/evidence and separately
initiate any release. Device checks: **NOT RUN**, skipped entirely; confirm
Realme Today light mode matches Generation, themes, synced palette, Queue and
fallbacks, glass/plain text and gestures/momentum. Native rendering/performance,
deployed revisions and live preference/database/Scheduler state remain
**UNVERIFIED (owner to confirm)**. No service call, environment-file edit,
remote SQL/migration, Scheduler change, deployment or push occurred. Original
UI/, apps/mobile/.gitignore and supabase/.temp/ and Owner Pause remain. OT1 ends
here; no OG1 or later backlog item was started.

See [OT1 acceptance](acceptance/ot1-today-orb-theme-sync.md).

## OG1 standalone Generation glow - unattended local closure (2026-10-21)

OG1 / standalone Generation glow (2026-10-21): **PASS for the finite unattended local code scope**.
Shared annular mask was confirmed; a clock-radius input or existing canvas
clipping was not found. Explicit standalone lighting begins at .9x body radius,
fades to zero by 1.7x, and has .4998 of clock peak coverage. Padded decorative
layers preserve body/hit sizes and phone no-scroll fit. All Generation,
preparation/Queue, retained KnowledgeCore and static consumers are covered;
Today keeps its prior clock geometry, strength and appearance.
Implementation: `0e06266f`; documentation hash is in Git/OG1.status.
FRESH final typecheck/lint/root build: 8/8 each, 0 cached; six existing lint
warnings. Shared 688/70 files (344 source cases plus compiled duplicates),
mobile 1612/169, web 550/72. Separate web build 23/23 pages and Android HBC
export pass; root API build 37/37 pages. Both diff checks pass. First focused
measurement failures and two repaired duplicate-import warnings are recorded.
16 baseline/after web captures per run and eight full Generation page captures
cover light/dark pearl/gold at phone/desktop sizes. GPU core differences and
border alpha are zero; standalone source-sector correlations and overlap pass.
Native component and full viewport/gesture regressions pass. Native/emulator/
physical appearance and performance remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, environment
file edit, remote SQL/migration, Scheduler operation, deployment or push.
Original unrelated paths and Owner Pause preserved. OG1 endpoint reached;
OL1 and all later backlog items were not started.

Commits:
- 0e06266f fix(orb): soften standalone generation glow
- docs(orb): close OG1 local acceptance and gates (this documentation checkpoint;
  exact hash in Git and tmp/overnight/OG1.status).

Cause at baseline orb-ambient-renderer.ts:9,19: a fixed annular mask outside
.95 body radius, shared without context. The literal clock-radius input and
existing hard canvas clip hypothesis were refuted; the same accepted symptom
has one safe explicit-profile fix. See [acceptance](acceptance/og1-standalone-generation-glow.md)
for file:line inventory, baseline, exact commands, failed focused attempts and
all local evidence. Root build wall time 410.294s. Full suites have no skips.

The first lint passed with eight warnings; two new duplicate type-import warnings
were fixed and final forced typecheck/lint rerun. Only six existing warnings
remain. Focused failures caught new under-edge geometry in old pixel probes,
transparent decorative overflow, and inappropriate old absolute-luminance
sampling for the softer profile. Old clock thresholds remain; standalone has
separate geometry/intensity/sector proof. No final gate failed. All 24 final
source hashes match. Generated Next declarations were inspected/restored.

Actual captures: tmp/overnight/OG1-before/, OG1-after/, OG1-page/ and their
inspected contact sheets. GPU metrics copied to OG1-gpu/: core RGBA diff and
border alpha 0; source opacity and rotating dim sectors preserved. Native GL
geometry, measured viewport/200% text, gestures and existing lifecycle tests
pass. Local software WebGL is not native performance or physical acceptance.

**Owner steps remaining**

- Rollout: **NOT RUN**, skipped entirely. Review local commits/evidence and
  separately initiate publication; nothing was pushed or deployed.
- Device checks: **NOT RUN**, skipped entirely. Realme Generation light/dark,
  no band/cutoff, weaker glow, Today, Queue/fallbacks, gestures/Reduce Motion,
  background/focus and actual GPU/frame/power remain owner checks.
- Native/emulator/physical appearance and performance, deployed revisions and
  live preference/database/Scheduler state are **UNVERIFIED (owner to confirm)**.
  No local emulator is running; no install/reconnection was attempted.
- Original UI/, apps/mobile/.gitignore, supabase/.temp/ and Owner Pause preserved.
  No service call, environment-file edit, remote SQL/migration, Scheduler change,
  deployment or push. Finite OG1 endpoint reached; no later item started.

## OL1 whole-orb loading - unattended local closure (2026-10-21)

OL1 / whole-orb loading (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed: the deferred still was replaced before the first GL frame, and
body/aura drew before the asynchronous clock atlas. Web/native now retain one
OT1 palette/theme poster until a complete frame (native: after endFrameEXP),
then crossfade the whole surface over 250ms; Reduce Motion is instant.
Early chunk/atlas loading retains the Three.js split. Failure/timeout keeps the
poster, logs one safe warning and disposes work; late callbacks cannot reveal it.
Generation's change-only reduced-motion pose, gestures, cadence and OG1 remain.
Implementation: e54f11d0; documentation hash is in Git/OL1.status.
FRESH final forced typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files (source plus compiled duplicates), mobile
1617/169, web 561/73; separate web 23/23 pages and Android HBC
export pass. Root API build 37/37 pages; API tests NOT APPLICABLE (decorative
client/loading helper only). Diff/staged checks pass. Failed focused attempts
and the interrupted first build/reduced-motion repair are recorded.
Twelve before/after browser sequences, 164/137 images and 3343/4086 samples:
731 visible partial samples before, zero after; seven loading browser regressions
cover fades, Slow 4G, failure/timeout and Reduce Motion. Production bundle
inspection confirms Three stays outside Today/Generation initial route chunks.
Physical/native appearance/performance, real Next Router/auth/production and
deployed/live state remain UNVERIFIED (owner to confirm). Rollout and Device
checks NOT RUN, skipped entirely. No service call, environment-file edit,
remote SQL/migration, Scheduler, deployment or push. Original unrelated paths
and Owner Pause preserved. OL1 endpoint reached; no later backlog item.
[Acceptance and exact gates](acceptance/ol1-web-orb-loads-whole.md).


Commits:
- e54f11d0 fix(orb): reveal only complete orb frames
- docs(orb): close OL1 local acceptance and gates (this documentation checkpoint;
  exact hash in Git and tmp/overnight/OL1.status).

Confirmed baseline cause: DeferredDayOrb.tsx:49 replaces the poster at module
arrival; DayOrb.tsx:204 loads the atlas asynchronously while :299 draws the
body/aura. Mobile DayOrb.tsx:169,245-255 presents the same incomplete clock
scene. Atlas and aura are not independently visible GL canvases. The shared
12-second active deadline, complete-frame event and guarded fallback now bound
both platforms. Native plain text remains through the reveal; web text fades
with the complete canvas. No new frame loop or per-frame React update.

The first focused web component run had 9 failures/8 passes from a missing
style.setProperty DOM mock; expanded focused suites passed. First browser hook
failed before 7 cases (minifier quote syntax); corrected split assertion and all
7 passed. Three native test callback TS errors and two hook warnings were
repaired. First root typecheck/lint passed; root build was deliberately
interrupted for the Generation reduced-motion preservation fix. Final serial
gates restarted on frozen source and all pass. Final Expo GL source review
added a native replacement-context fallback and regression; affected forced
root gates, full native suite and Android export were rerun serially. Unchanged
shared/web suites and the explicit web build retain their original FRESH proof;
they were NOT RUN again for this native-only repair. No hidden flake or relaxed
rendering assertion. Resume found the separate Android export had stopped at
Metro startup while its result entry was stale; the incomplete log is retained,
and only that unfinished export was rerun: FRESH PASS, exit 0, 60.127s.
Full details and commands are in acceptance. Logs, hashes,
frames/contact sheets and manifest proof stay ignored under tmp/overnight/OL1-*.

**Owner steps remaining**

- Rollout: NOT RUN, skipped entirely. Review local commits/evidence and separately
  initiate any publication. No push, deploy, OTA/EAS, remote SQL/migration,
  Scheduler operation or environment-file edit occurred.
- Device checks: NOT RUN, skipped entirely. Website real slow connection,
  cold/reload/real navigation, light/dark palettes, fallback/Reduce Motion;
  Realme Today/Generation first frame, text/fade, themes/palettes, gestures,
  AppState/focus and actual GPU/frame/power. Mobile changed; no install attempted.
- Native/physical appearance/performance, real Next Router/auth/production,
  deployed revisions and live preference/database/Scheduler state are
  UNVERIFIED (owner to confirm). Software Chromium/RN tests do not establish them.
- Vercel CLI is absent. For separately authorized future rollout, strongly
  recommend npm i -g vercel for env pull/deploy/logs; NOT RUN in OL1.
- Original UI/, apps/mobile/.gitignore, supabase/.temp/, ignored tmp/ and Owner
  Pause preserved. OL1 endpoint reached; RS1 and all later items not started.


## RS1 hide-on-scroll search - unattended local closure (2026-10-21)

RS1 / hide-on-scroll search (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed: mobile's shared secondary header animated layout height on JS,
changing the scroll viewport during visibility decisions. Every opted-in Page
(Reviewer, Generate, Library, Today, Tasks and course Tasks) now uses a measured
constant inset and an absolute transform-only header with a header-only mask.
Reanimated owns clamped finger-following motion, drag/momentum snap, top/short
list restoration, focus/query pinning and instant Reduce Motion endpoints.
Native animated accessibility/hit props avoid per-scroll header React updates.
Reviewer jumps/section anchors/answer reveal account for the measured inset.
Phone web Generate/Reviewer use measured overlay slots and 12px hysteresis;
desktop layout remains. Implementation: 7a5043e2; docs hash is in Git/RS1.status.
FRESH forced typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files, mobile 1615/169, web 566/74; separate web
23/23 pages and Android HBC export PASS. Root API build 37/37 pages; API tests
NOT APPLICABLE (client scroll/layout only). Unstaged/staged diff checks PASS.
Four local browser regressions, six direct emulated touch drags, before/after
captures and fixed content coordinates verify local phone scroll behavior.
Failed focused attempts and two deliberately interrupted builds are retained.
Native/emulator/physical behavior, authenticated routes and deployed/live state
remain UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN,
skipped entirely. No service call, environment-file edit, SQL/migration apply,
Scheduler operation, deployment or push. Original owner paths and Owner Pause
preserved. RS1 endpoint reached; no TB1, LP2, release or FULLSEND started.

Commits:
- 7a5043e2 fix(scroll): stabilize shared search headers
- docs(scroll): close RS1 local acceptance and gates (this documentation
  checkpoint; exact hash in Git and tmp/overnight/RS1.status).

Branch overnight/2026-10-15_feedback; baseline 2764ce02. Confirmed cause at
baseline useHideOnScroll.ts:64-71,102-105 and primitives.tsx:315-340. Web
Generate already used transform/hysteresis; phone Reviewer search was static.
The same shared mobile fix covers all six consumers. Constant padding is
measured independently; only the search overlay is clipped, preserving the
existing scrubber viewport/touch region. Search/section/answer jumps compensate
for the inset so pinned search cannot cover targets. No React header state
update on scroll; existing reader/organizer observers still receive native metrics.

Evidence: ignored RS1-before/ (4 captures), RS1-after/ (7 captures and two
36-sample traces), RS1-touch/ (6 captures, two surfaces/six direct touch drags).
Real production hook/CSS with synthetic content at phone width: unchanged row
document Y and slot height; slow 1px direction accumulation, fast flings, 12px
reversal, top, focus/query, ResizeObserver, desktop and Reduce Motion pass.
Direct emulated touch down/up 40px/s and fast down 1200px/s pass. Expo Babel
emits nine worklet transforms. These are local browser/compiler/component
proof, not physical/native rendering or authenticated route acceptance.

Retained failures: invalid Windows guard escaping prevented first test start;
first actual focused mobile run 28 PASS/1 FAIL from a proxy property-descriptor
stub; four mobile and two web test-only TypeScript errors; baseline screenshot
builder virtual-TS parse error; section-anchor test 11 PASS/1 FAIL because the
mock Page stores but does not render overlay; first CDP high-level touch gesture
returned without scrolling. All were repaired without weakening assertions;
direct touch events provide actual scroll evidence. Two earlier builds were
deliberately interrupted for the isolated header mask and Reviewer jump fixes.
A final native-only audit retained raw nonfinite metric validation before
clamping; focused native tests pass 42/42. Affected forced root gates, full
mobile suite and Android export were rerun serially; unchanged shared/web
suites and the explicit web build retain their FRESH evidence. Only final
frozen-production-source gate results count. Exact commands/timings,
failed logs, hash evidence and limitations are in the acceptance document.
The final resize regression preserves a fully hidden header's endpoint and
accessibility state when its measured height grows from 50pt to 90pt. Affected
native gates were repeated again for this last adjustment. Standalone before /
touch captures were refreshed with explicit repository TEMP/TMP; the first
helpers' missing override is recorded in acceptance. No owner file outside the
repository was targeted.
Generated Next declarations restored; final forced typecheck and final diff
checks pass. No generated/private validation artifact was staged.

**Owner steps remaining**

- Rollout: **NOT RUN**, skipped entirely. Review local commits/evidence and
  separately initiate any publication. Nothing was pushed/deployed/installed.
- Device checks: **NOT RUN**, skipped entirely. Realme very slow down/up and
  fast Reviewer/Generate drags, snap, focus/query and match jumps, top/short
  content, font/width changes, Reduce Motion, scrubber, pull refresh and
  accessibility. Also smoke-check Today, Library, Tasks and course Tasks.
- Native/emulator/physical rendering, performance and accessibility, actual
  authenticated web route behavior, deployed revisions and live database /
  Scheduler state remain **UNVERIFIED (owner to confirm)**. No emulator was
  running; no physical device command or install was attempted.
- Vercel CLI absent: strongly recommend npm i -g vercel for separately authorized
  future env/deploy/log tooling. Installation and every Vercel command NOT RUN.
- No Supabase, Vercel, Google Cloud, Canvas or Resend call; no environment-file
  edit, remote SQL/migration, Scheduler operation, deployment or push.
- Original UI/, apps/mobile/.gitignore, supabase/.temp/, ignored tmp/ and Owner
  Pause preserved. RS1 ends here; no later backlog item, release or FULLSEND.

See [RS1 acceptance](acceptance/rs1-hide-on-scroll-no-shake.md).


## TB1 bottom tab press - unattended local closure (2026-10-21)

TB1 / bottom tab press (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed installed Expo Router's borderless Android ripple. Shared tab options
now supply a plain Pressable, discard ripple props and scale the exact icon/label
children to 1.08 with native-driver timing. Return uses the existing 180ms token
and bounded ease, with no overshoot. Release/cancel/blur reset; live Reduce Motion,
background/disabled changes and unmount stop/reset motion. The 48pt fixed targets,
accessibility/ref/selected styles, navigation and existing tab haptic remain.
Website sidebar has no equivalent ripple at phone width; web code change skipped.
Implementation: 5f875a4e; docs checkpoint hash is in Git and TB1.status.
FRESH forced root typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
warnings. Shared 696/72 files, mobile 1630/170, web 566/74; explicit web build
23/23 pages and Android HBC export PASS. Root API build 37/37 pages; API tests
NOT APPLICABLE (client feedback only). Post-restoration forced typecheck 8/8,
0 cached, PASS. Unstaged/staged hygiene checks PASS. First typecheck/fixture
failures and repairs are retained in acceptance; no assertions were weakened.
Focused component tests 15/15; local RN Web fixture 8/8 cases, 24 captures,
135 release samples: scale [1,1.08], return about 179-183ms, reduced scale 1.
Baseline child/target geometry is preserved in light/dark and column/row layouts.
Native/emulator/physical rendering/performance and deployed/live state remain
UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN, skipped entirely.
No service call, environment-file edit, SQL/migration apply, Scheduler operation,
deployment or push. Original owner paths and Owner Pause preserved. Finite TB1
endpoint reached; no LP2, release or FULLSEND started.

Commits:
- 5f875a4e fix(navigation): replace tab ripple with press scale
- docs(navigation): close TB1 local acceptance and gates (this documentation
  checkpoint; exact hash in Git and tmp/overnight/TB1.status).

Branch overnight/2026-10-15_feedback; baseline 390d3b80. STEP 0 confirmed
BottomTabItem.js:11,110 and PlatformPressable.js:95-103 in installed Expo Router.
No custom Liquid Glass tab bar is active. The native timing implementation uses
existing motion.press=140/motion.small=180; zero new dependencies/colors/glass.
Website shell.tsx:14-19,68-84 and globals.css:424-451,1314-1323 confirm no phone
ripple. Existing tabPress haptic listener remains untouched. Expo Web href,
modified clicks/default prevention and native event/ref/accessibility props
remain; actual authenticated/native navigation acceptance is still owner work.

[Acceptance](acceptance/tb1-tab-press-scale.md) records exact commands, counts,
timings, source inventory, baseline, first failures and repair details. Final
forced typecheck after generated declaration restoration: FRESH PASS 8/8,
0 cached, exit 0, 44.089s. The three frozen source/test hashes match after gates.
Six existing lint warnings, zero new; no suite skips. All requested gates ran
serially. Ignored TB1-gate-*.log/TB1-gates.json and TB1-visual/ retain local proof.
Both contact sheets of all 24 captures were inspected. Fixture uses production
button/RN Web with synthetic icons/theme, not Android ripple or native-thread
runtime/performance evidence. No emulator is running; recording NOT RUN.

**Owner steps remaining**

- Rollout: **NOT RUN**, skipped entirely. Review local commits/evidence and
  separately initiate publication. No push, deploy, OTA/EAS, production SQL,
  migration apply, service call, email or Scheduler operation occurred.
- Device checks: **NOT RUN**, skipped entirely. Realme: tap Today/Generate/
  Tasks/Library, no circle, quick enlarge and smooth return; long press, cancelled
  press, rapid tabs, Reduce Motion and accessibility. Physical/native appearance,
  navigation/haptics and performance are **UNVERIFIED (owner to confirm)**.
- Deployed revisions and live production/database/Scheduler state are
  **UNVERIFIED (owner to confirm)**. Source confirmation did not require them.
- Vercel CLI absent: strongly recommend npm i -g vercel for separately
  authorized future rollout tooling. Installation and Vercel commands NOT RUN.
- UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored tmp/ preserved and
  excluded from staging. Existing Owner Pause remains. TB1 endpoint reached;
  do not start LP2, release or FULLSEND in this run.


## LP2 legal discoverability - unattended local closure (2026-10-21)

LP2 / legal discoverability (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed existing LP1 bundled routes and tiny Settings footer links; neither
profile menu exposed legal information. Native/web Settings now have standard
Privacy Policy and Terms of Use rows in About, with version information.
Profile/account menus open Privacy in two taps and retain the existing Terms
cross-link. Phone web reuses the same menu behind a topbar avatar because its
desktop sidebar is hidden. Signed-out/download links and legal copy remain.
Implementation: c6586db4; docs checkpoint hash is in Git and LP2.status.
FRESH forced root typecheck/lint/build: 8/8 tasks each, 0 cached; six existing
lint warnings, zero new. Shared 696/72 files, mobile 1633/171, web 569/75;
explicit web build 23/23 pages and Android HBC export PASS. Root API build
37/37 pages; API tests NOT APPLICABLE (client navigation only). Post-restoration
forced typecheck 8/8, 0 cached, PASS. Unstaged/staged hygiene checks PASS.
Six isolated browser cases and 12 inspected light/dark captures cover native
components through RN Web, phone web and desktop web; both Settings routes,
two profile taps and Terms cross-link pass with no external requests/page errors.
First helper failures, new-warning repairs and two deliberately interrupted
builds are retained in acceptance. Native/physical rendering, actual authenticated
routes and deployed/live state remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, email,
environment-file edit, remote SQL/migration, Scheduler operation, deploy or push.
Original owner paths and Owner Pause preserved. LP2 endpoint reached; no RB9,
release or FULLSEND started.

Commits:
- c6586db4 fix(legal): expose policies in settings and profile menus
- docs(legal): close LP2 local acceptance and gates (this documentation checkpoint;
  exact hash in Git and tmp/overnight/LP2.status).

Branch overnight/2026-10-15_feedback; baseline 60865bc3. Confirmed source:
mobile features/settings/SettingsScreen.tsx, design/primitives.tsx ProfileButton,
web features/settings.tsx and components/shell.tsx AccountMenu. LP1 native/web
privacy/terms routes are intact and bundle shared copy; no legal text regression.
Native About keeps AppUpdateAbout's installed version/update/share behavior.
Website displays its own package version. Existing RowLink/Sheet/AccountMenu
and tokens are reused; no new dependencies, colors, glass or animation behavior.
Phone account links keep 44px targets and the popover fits the viewport.

[Acceptance](acceptance/lp2-legal-discoverability.md) records the full owner
roadmap path, baseline, matrix, exact gate commands/counts/timings, first attempts,
visual fixture boundaries and limitations. Focused mobile 18/18 and web 5/5;
post-restoration typecheck 40.302s, 8/8 tasks and 0 cached. Local screenshots
are under tmp/overnight/LP2-visual/ with results.json; 6/6 cases, 12 captures.
These use synthetic account state/inert unrelated network sections, RN Web,
zero safe insets, web SVG icon masks and a simulated local router. They do not
establish Expo/Next Router, actual authentication, native rendering or performance.
Eight frozen source/test hashes match; no meaningful assertion was weakened.
Two deliberate build interruptions repaired one test lint warning and a named
JSON import warning. Both full typecheck/lint attempts passed; failures were
limited to the initial guard-path launch and browser helper lookup. All original
logs are retained, and the final complete serial gates are green.

**Owner steps remaining**

- Rollout: NOT RUN, skipped entirely. Review the local commits/evidence, then
  separately initiate publication. No push, deploy, OTA/EAS or install here.
- Device checks: NOT RUN, skipped entirely. Realme: Today avatar -> Privacy &
  Terms; follow Terms and Back; Settings -> About -> both legal rows, version,
  light/dark and offline. Physical/native rendering and actual navigation,
  accessibility and performance are UNVERIFIED (owner to confirm).
- Actual authenticated web routes/Next Router, deployed revisions, live
  production/database/Scheduler state are UNVERIFIED (owner to confirm).
- Vercel CLI is absent. Strongly recommend `npm i -g vercel` for separately
  authorized future env pull/deploy/log tooling. Installation and all Vercel
  commands NOT RUN in LP2.
- No service call, email, environment-file edit, remote SQL/migration or
  Scheduler operation is performed. Original UI/, apps/mobile/.gitignore,
  supabase/.temp/ and ignored tmp/ remain untouched and excluded from staging.
  Existing Owner Pause remains; no RB9, release or FULLSEND is started.

## OX1 orb compositing integrity - STEP 0 stop (2026-10-22)

**STOPPED.** The owner-reported Realme square was not reproduced locally and
no safe source-level cause was established. This triggers OX1 STEP 0's explicit
physical-only/unattributed stop rule. No product code, dependency, pixel format,
blend math or masking changed. The square remains unresolved. OX2 is blocked.

Commit: `docs(orb): record OX1 source-attribution stop` (this scoped documentation
checkpoint; exact hash in Git and ignored OX1.progress/OX1.status). Branch
overnight/2026-10-15_feedback, baseline 70c415d1. Existing FS5 status and
28174c7:docs/ai/acceptance/fullsend-20261021-2245.md explain the separate release
clone and intentionally unchanged source checkout; no branch mismatch remains.
FS5 was not rerun and no branch switch/merge/fetch was performed.

[Acceptance](acceptance/ox1-orb-compositing-integrity.md) records the exact paths,
installed Expo flags, hypotheses, matrix, commands, failed first attempts and
limits. Installed Android GLView is a non-opaque TextureView with EGL alpha 8;
native context reports premultipliedAlpha false versus browser true. That is
not sufficient evidence to blame the alpha contract or change it speculatively.

FRESH web baseline: 36 actual DayRingClock/GenerationOrb sequences, three
palettes (purple uses key violet), both themes, cold/hard reload/component route,
390/1440 widths, cache disabled, Slow 4G/4x CPU plus local delayed atlas.
805 screencast images / 13,518 rAF samples; zero visible partial-clock samples,
border/corner alpha/RGB, page errors and external requests. Against the actual
page background, 344,364 outside-corner pixels have maximum RGB difference 0;
sampled external aura remains nonzero. Twelve actual mobile DayOrb/OrbPoster
browser-adapter cases provide 36 poster/live/resumed PNGs, zero border alpha,
page errors or external traffic. All five contact sheets and full violet-dark
poster/live images were inspected; no local square was visible. Evidence:
tmp/overnight/OX1-before/, OX1-native-web/, OX1-*-contact.png and OX1-summary.json.
No after captures exist because no repair was justified. Native helper replaces
Expo surface/asset and SVG host boundaries; it is not Android rendering proof.

FRESH serial diagnostic suites: shared 12/12 across 3 files, mobile 26/26 in
1 file, web 21/21 across 3 files: **59 passed / 0 failed / 0 skipped**. Commands
and logs are in the report and OX1-focused.json. Full root typecheck/lint/build,
full shared/mobile/web suites and separate API/web/Android builds: **NOT RUN**
at the required STEP 0 stop. Relevant API tests: **NOT APPLICABLE**, no server
changes. Documentation diff and staged checks: **FRESH PASS**, exit 0. No gate
cache results reused. Initial invalid purple-key capture run was interrupted
and excluded; corrected violet run exits 0. Native first wrapper reported exit 1
from bundler stderr warnings; repeated explicit exit-code run and Node manifest
record exit 0. Original logs retained; assertions/config were not weakened.

**Owner steps remaining**

- Exact question for owner: On the installed FS5 Realme build, does the violet
  square persist for at least 10 seconds after a cold Today open, and does it
  also occur in standalone Generation or change after Today -> Generate ->
  Today and background -> foreground, in each theme? Can matching on-screen
  photo/recording and ordinary screen capture from the same state be supplied,
  with installed version/runtime, to isolate native presentation versus
  framebuffer/poster/clock composition? Further native framebuffer/compositor
  diagnostics may be needed before choosing a fix. This question is recorded
  only; none was sent during the unattended run.
- Device checks: **NOT RUN**, skipped entirely. Native/physical appearance,
  context restoration, performance and capture behavior remain **UNVERIFIED
  (owner to confirm)**. Browser component switching/live-prop cycles are
  approximations, not physical acceptance or actual Android lifecycle evidence.
- Rollout: **NOT RUN**, skipped entirely. No implemented fix exists to publish.
  Actual authenticated web routes, deployed revisions, live database/Scheduler
  state are **UNVERIFIED (owner to confirm)**. No Supabase/Vercel/Google Cloud/
  Canvas/Resend call, email, environment-file edit, SQL/migration apply, Scheduler
  operation, deployment, OTA/EAS, install or push occurred.
- Vercel CLI unavailable: strongly recommend `npm i -g vercel` for separately
  authorized future env/deploy/log tooling. Installation and Vercel commands
  NOT RUN. Original UI/, apps/mobile/.gitignore, supabase/.temp/, ignored tmp/
  and Owner Pause preserved. OX2/release/FULLSEND remain unstarted.

## OX1-device — separately authorized Realme square repair (2026-10-22)

**PASS for physical square removal in the isolated native diagnostic app.**
The owner explicitly authorized this physical follow-up after bcef0477's stop.
The release's square reproduces in an SVG-only OrbPoster with no GL surface.
Android SVG's bitmap clips the spill outside the 100-unit viewport. Expanding
the actual bitmap/viewport to include the full spill plus a clear guard removes
the square, preserves the body size and retains feathered external light.
Only OrbPoster runtime code and eight targeted regression tests change.

FRESH forced typecheck/lint/build: 8/8 tasks each, 0 cached. Full shared 696/72
files, mobile 1641/172, web 569/75: 2906 pass, 0 failures/skips. Focused mobile
37/37 overlaps the full suite. Explicit web build and Android HBC export pass.
All original warnings remain. Physical Realme RMX3151/Android13 checks include
12 dark/light × gold/pearl/violet × Today/Generate captures, ten native tab
cycles, resume, glass clock text, tap palette/held rotation and 31-second Reduced
Motion stability (0 pixel difference, 0 UI frames during that idle interval).
The bounded normal sample has p99 18ms, GPU p99 12ms; no matched battery claim.

[Separate acceptance report](acceptance/ox1-realme-physical-debug.md) contains
cause, isolation, exact native package/build boundaries, commands, first failed
attempts and private evidence paths under tmp/overnight/OX1-device/. Diagnostics
reuse the release's actual native binaries in .ox1physical with disabled OTA,
local source bundles and an explicitly adapted atlas URI. This is an offline
real-component shell, not authenticated production-route acceptance. Clean
Gradle rebuild was interrupted during uncached NDK provisioning; no remote build.

Original release 2.3.0/code7, install/update timestamps and data are unchanged.
Its Automatic theme, original green palette and OS animation scale 1 are
restored; phone returned to release Today. That release intentionally still
shows the square until publication is separately approved. Historical OX1
status/report and Owner Pause are preserved. No push, deployment, OTA, FULLSEND,
production mutation, uninstall, data clear or OX2. Scoped local commit hash is
in the completion report/Git. Owner/supervisor review is the next action.

## OX2P - unattended website + mobile light glass (2026-10-22)

**PASS for the finite local code scope.** Source 39ff7362 and its separate Realme
SVG-bitmap report satisfy the prerequisite; historical OX1.status stays STOPPED
with its original hash, and old OX2 stays held/unrun. Shared light optical
coverage/studio and poster stops now produce restrained clear glass and colored
liquid. Android padded containment is preserved; all five bounded dark RGBA
comparisons with 39ff are unchanged. No new render pass or startup timing change.
Current local web does not reproduce the reported square/partial-load symptom;
remaining poster-to-live easing is separate OX4 backlog, not implemented here.

Commits: 1140c737 fix(orb): refine light glass across web and mobile; followed by
this docs(orb): close OX2P local light-glass acceptance commit (exact hash in Git
and tmp/overnight/OX2P.status). Both are local, with the required author.

FRESH forced root typecheck/lint/build: 8/8 tasks each, 0 cached, six pre-existing
warnings. Full suites: shared 706 tests/72 files, mobile 1643/172, web 575/76;
2924 passed, 0 failed/skipped. Separate API build 37/37,
web 23/23 and Android HBC export pass. Both staged/unstaged diff checks pass;
final declaration restoration/typecheck is retained in the acceptance ledger.
Focused shared/mobile/web 23/48/46 plus new shader 5/5 overlap full suites.
First new-test expectation/helper/wrapper failures are retained in the report;
no thresholds were lowered. No full serial gate invocation failed.

FRESH browser proof: 120 normal-motion sequences (2679 frames, 44238 rAF samples) plus 40 Reduced Motion sequences (218 frames, 18723 samples); all five palettes,
both themes, Today/Generation, 390/1440, cache-disabled Slow 4G + 4x CPU,
cold/reload/component routes and focus resume. Zero sampled partial clock,
outer alpha/RGB leak, page-corner change, page error or external request.
Twenty RN Web poster/live/resumed cases pass. Before/after and sequence contact
sheets were inspected. Browser adapters do not establish physical native GPU
presentation. [Acceptance, exact commands and artifacts](acceptance/ox2p-light-glass-follow-up.md).

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Review these local commits/images; separately confirm Realme shader,
poster/Queue, gestures/waves, clock readability, Reduced Motion, AppState,
no-square behavior and GPU/performance/battery; confirm real authenticated
website routes/slow loading. Physical acceptance after these shader changes,
deployed revisions and live preference/database/Scheduler state are
**UNVERIFIED (owner to confirm)**. Original release is unchanged. No Supabase,
Vercel, Google Cloud, Canvas or Resend call, environment-file edit, remote SQL,
Scheduler/email, deployment, OTA/EAS/install, push, FULLSEND or later task.
Owner Pause, UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored tmp/ are
preserved. Vercel CLI is unavailable; strongly recommend npm i -g vercel only
for future separately authorized env/deploy/log work. No install was run.

Final restoration checkpoint: FRESH forced typecheck 8/8, 0 cached, exit 0
(43.149s); both generated Next declarations restored. Final 10,944,818-byte
Android HBC contains the new light uniforms/density shader. All 11 source
hashes and expected evidence counts match; final staged/unstaged hygiene PASS.


## PBR0 - website and Android pre-beta baseline (2026-10-22)

**PASS for the finite unattended audit scope.** No product implementation,
dependency, release configuration or migration changed. Source baseline
245380ea131ed14c5b3abb2d00a7aec6d88c828e on overnight/2026-10-15_feedback;
locally recorded github/main was 23 behind/0 ahead before this work, no fetch.
Source 2.2.0/code6/runtime2.2.0-sdk57 is deliberately separate from FS5's
2.3.0/code7 APK and FS7/newer 2.3.0-runtime OTAs. Latest local Git release report
is c0569007: application acf9481, source pin 245380ea, OTA 01a16304. All live
state remains UNVERIFIED; no service query was made.

Commits:

- bdd1c021 docs(perf): establish PBR0 website and Android baseline
- docs(perf): record PBR0 audit checkpoint (this checkpoint; exact hash in Git
  and tmp/overnight/PBR0.status, which lists both local commits).

[Acceptance audit](acceptance/pbr0-prebeta-performance-audit.md) contains exact
source/release fingerprints, all screen/workflow inventories, existing
SP1/SP2/SP2b optimizations, fresh byte/count/fixture evidence, P0/P1/P2 priorities,
no-feature-removal gates, targets-only thresholds, privacy-safe telemetry plan,
measurement procedures, representative matrix and GO/NO-GO checklist.
Conditional PBR1–PBR5 proposals await supervisor review; PBR6 is owner-only.
Pending OX3/OX4/QI1/LC1, held web parity and Owner Pause are preserved.

MEASURED: exact existing local APK **132,024,227 bytes**, hash
0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6, manifest
2.3.0/code7, native libraries **93,639,812 bytes** across four ABIs. User's
117 MB report remains UNVERIFIED as to artifact/units. Fresh web Today/Library
First Load JS **213/223 kB**; 71 JS chunks **2,585,223 raw / 821,493 gzip bytes**
across the whole build, not one route. Standalone Android HBC **10,945,101 bytes**,
36 assets; not a rebuilt APK. Synthetic current service reproduces two reads
for Library page/exact reviewer and six for complete 240-card traversal.
Source-inferred risks include repeated hidden-ID/local derived reads, eager
long-document mounts and packaging/metric attribution. No latency saving claimed.

FRESH gates (exact command/result table in report): root forced typecheck/lint/
build **8/8 each, 0 cached**; six existing lint warnings. Shared **706/72 files**
includes emitted copies; Canvas **75/1**, OCR **27/3**, engine **606 passed**,
API **2452 passed / 3 existing live skips / 213 files**, mobile **1645/172**,
web **575/76**, zero test failures. Separate API build **37/37**, web **23/23**,
Android offline export **1 HBC/36 assets** PASS. Root export also covers iOS/web
as build outputs only. Next declarations restored, final forced typecheck
**8/8, 0 cached** PASS. Unstaged/staged diff checks and source-path/docs-only
scope checks PASS. No gate cache reused, failed suite/build attempt, new skip,
assertion weakening or observed flake. Two first synthetic probes failed alias
resolution without --tsconfig; corrected local commands pass, original logs
retained. Exploratory read/path failures and existing tool warnings are recorded.
Temporary gate/sample/fixture/APK evidence remains ignored and uncommitted.

FRESH local browser integrity: **12 normal-motion sequences / 3609 rAF samples**,
zero premature visible clock and loading poster samples; existing tests also
cover Reduced Motion/fallback. Synthetic loopback Chromium/software GL is not
physical startup, native GPU or production authenticated navigation evidence.
Historical **FS7 5 PASS/1 FAIL remains PARTIAL** (initial resume native text loss,
later recovery at 54.9s). Newer release report's successful Appearance/GL round
trips is narrower and does not close the entire resume/performance matrix.

**Owner steps remaining**

- Rollout: **NOT RUN**, skipped entirely. Review commits and audit before
  generating any optimization job. No deploy, worker publication, OTA/EAS,
  release/push, remote SQL/migration application, Scheduler, email or tester
  invitations. PBR6 publication/distribution is owner-only.
- Device checks: **NOT RUN**, skipped entirely. Confirm active binary/runtime/
  OTA, repeat agreed native resume/Appearance/route and lower-end RAM/network
  matrix, and complete authenticated desktop/responsive website acceptance.
- **UNVERIFIED (owner to confirm):** live revisions/DB/applied migrations/index
  plans/regions/queue/Scheduler, actual P50/P95/startup/Web Vitals/native GPU/
  battery, and reported 117 MB artifact identity. Exact offline code7 APK size
  is measured; current active OTA is a separate question.
- Keep Owner Pause and pending OX3/OX4/QI1/LC1/held web parity. No automatic next
  slice. Vercel CLI unavailable; strongly recommend npm i -g vercel for future
  separately authorized env/deploy/log work. No install/Vercel command ran.
- UI/, apps/mobile/.gitignore, supabase/.temp/ and pre-existing ignored tmp/
  evidence are preserved and excluded. No .env file was edited, no service was
  called, no private academic fixture or provider error was committed.

## PBR-RT1 - Android resume-text evidence stop (2026-10-22)

**STOPPED at STEP 1, before implementation.** The actual FS7 missing-native-text
cause cannot be substantiated from the available local evidence. This is the
prompt's required physical-attribution stop, not a failed implementation gate.
No runtime code, dependency, font, navigation, release configuration or permanent
regression test changed; no fix is established. FS7 remains **5 PASS / 1 FAIL,
physical PARTIAL**. Existing replacement-GL-context recovery is already present;
the later Appearance/live-GL success does not close the broader missing-text flow.

Commits:

- `0a150687 docs(perf): record PBR-RT1 native-text evidence stop`
- `docs(perf): checkpoint PBR-RT1 stopped handoff` (this documentation checkpoint;
  exact hash and both commits are recorded in Git and `tmp/overnight/PBR-RT1.status`).

Branch `overnight/2026-10-15_feedback`, initial source
`a4e5c4ccda1408f853db2e6a1f102b823a343ff0`. Initial local upstream snapshot
2 ahead / 23 behind github/main, no fetch. Author galaxymaxp <omgraythekid@gmail.com>.
Owned files: `docs/current-state.md`, `docs/roadmap.md`,
`docs/ai/current_sprint.md`,
`docs/ai/acceptance/pbr-rt1-android-resume-text.md`, and this appended handoff.
[Acceptance report](acceptance/pbr-rt1-android-resume-text.md) contains the matrix,
source/dependency trace, release boundaries, diagnostic details and exact commands.

FRESH final investigative suites: existing focused mobile **65 passed / 0 failed /
0 skipped / 5 files** (DayOrb, ring-orb-spin, AppLifecycle, navigationStructure,
TabPressButton); ignored combined actual DayRingClock/DayOrb synthetic probe
**8 passed / 0 failed / 0 skipped / 1 file**. Total **73 passed / 6 files**,
not physical proof. The probe simulates 80 resume/focus/theme cycles with
same/replaced GL contexts, normal/Reduced Motion and fonts loaded/unloaded,
complete native Text host children/accessibility, fallback and cleanup. Native
Text/GL/atlas/animation/focus boundaries are stubbed; no real Android pixels,
font loading, TextureView/EGL, Activity/window/native-stack or screenshot path.
It does not reproduce FS7. First probe attempt **4 passed / 4 failed** was a
harness effect/timer-flush error; corrected harness retains every assertion and
passes with unchanged product code. Both attempts retained; no observed flake.
Existing Vite/react-test-renderer warnings remain; an exploratory Windows
wildcard read was corrected, and broad inventory output was narrowed.

FRESH unstaged/staged diff checks and documentation path/scope/sequence/history
validation PASS, exit 0. Exact five runner task descriptions/dependencies match;
historical planning/handoff bodies preserved. Full mobile/shared/API/web suites,
root forced typecheck/lint/build, separate API/web builds and Android offline
export: **NOT RUN at mandatory pre-implementation STEP 1 stop**. No historical
PBR0 gate is reused. Cause-specific correction/regression acceptance: **BLOCKED**.
Serial local tests use repository-local TEMP/TMP/TMPDIR, inspected PBR0 Node
loopback network guard, Expo offline, disabled telemetry, npm offline and local
Turbo cache only. No cached test/Turbo result reused. Test duration is not
startup, device latency or native frame evidence.

MEASURED LOCALLY: source manifest 2.2.0/code6/runtime 2.2.0-sdk57; exact baseline
HEAD and passing diagnostic counts above. HISTORICAL: FS7 report from local Git
c9cb867d pins source 26702858/application 83f9474/update 01a162a3 on the
2.3.0/code7/runtime 2.3.0-sdk57 binary, with complete text recovered at a 54.9 s
follow-up (not a measured failure duration). Newer c0569007 report pins source
245380ea/application acf9481/update 01a16304 on that same binary/runtime and
proves narrower Appearance round trips. Current code includes the later GL
repair. `tmp/overnight/FS7.progress`/`.status` repeat the failure but provide no
native cause trace. Original release-clone `.local/` capture paths are absent
here; inspected OX1-device logs belong to a separate SVG diagnostic shell and
cannot attribute FS7. No private screen/source content was displayed or copied.

Frozen finite sequence reconciled from absolute runner BACKLOG's
"PBR execution 2026-10-22": **PBR0 -> PBR-RT1 -> PBR-MB1 -> PBR-LP1 -> PBR-AS1 ->
PBR-LR1**. Only PBR-RT1 executed. All four dependents remain **HELD, approved
roadmap only, NOT QUEUED/STARTED/COMPLETED**. Actual predecessor PASS with fresh
authorized supervisor review is required; no follow-up initiated. Historical
PBR1-PBR5 proposals, pending OX2/OX3/OX4/QI1/LC1, held parity and Owner Pause
remain intact. Original UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored
tmp/ artifacts preserved and excluded from commits.

**Owner steps remaining**

- Exact owner question, recorded only: On the pinned Realme 2.3.0/code7 binary,
  what original FS7 route order, background dwell, Appearance/system-theme state
  and active OTA reproduce missing native labels, and do those same labels
  disappear on the physical display as in a simultaneous capture? Provide
  synchronized sanitized AppState/focus, Activity/window/surface/context and
  native Text/view/font/error evidence through first failure and recovery before
  choosing a repair. Recover original FS7 evidence first; the report omits exact
  route order/dwell. No unattended question was sent.
- Device checks: **NOT RUN**, skipped entirely. With separate authorization,
  pin model/OS/binary fingerprint/active update/runtime/channel; repeat original
  FS7 flow and ten background/foreground cycles, distinguishing same-route
  resume, Today/standalone Generation without submission, and Settings >
  Appearance > Today. Light/Dark/Automatic, normal/Reduced Motion, public/empty
  text state; compare page/tab native labels, SVG labels, GL clock and native
  fallback on screen versus capture with actual timestamps (resume and bounded
  1/5/15/30/55 s follow-ups). Redact academic content/credentials. No build,
  install, OTA switch, force-stop/data reset or lost pending state is implied.
- Rollout: **NOT RUN**, skipped entirely. Review local documentation and obtain
  essential physical attribution before retry or any dependent publication.
  No fix is ready for publication. No deploy/worker/EAS/OTA/native release build,
  install/push, remote migration/SQL, provider/email/Scheduler/account/credential
  operation or environment-file edit occurred.
- **UNVERIFIED (owner to confirm):** current active binary/OTA, actual failure
  cause/recovery interval, native screen-versus-capture attribution, Android
  lifecycle/GPU/font/compositor behavior and performance, broader authenticated
  native/web acceptance, current live revisions/database/regions/queues/Scheduler.
  Missing live state alone was not the stop; missing native cause evidence was.
- Vercel CLI unavailable: strongly recommend `npm i -g vercel` for future
  separately authorized env/deploy/log work. Installation and all Vercel commands
  NOT RUN here. No service contacted and no next task/release initiated.

## PBR-AF1 — renewed audit and supported local repair — 2026-10-23

**PASS for mandatory LOCAL audit/repair/gate scope**, implementation ef80dfc6.
Initial branch overnight/2026-10-15_feedback / source 85959030. Owner direction
processed from exact runner answer
chatgpt-owner-1792691511294-971f0f34-866c-4ea9-856b-57750399b31c.md.
[Acceptance and sanitized evidence index](acceptance/pbr-af1-audit-and-fix.md)
and ignored tmp/overnight/PBR-AF1/ logs/progress preserve every checkpoint.

Reproduced/fixed: overlapping Library invalidations plus duplicate list/stat
summary scans. Same public synthetic 300-item schedule: summary 604 -> 2,
stats 302 -> 2, max 1 active summary call. First saved result, late writes,
complete rows, owner-switch denial, failed-read recovery and per-item committed
progress retained. No schema/auth/RLS/provider/native/rendering change.

FRESH full suites: shared 706/72 files (includes emitted copies), Canvas 75/1,
OCR 27/3, engine 606, API 2,452 passed + 3 existing live skips/213,
mobile 1,651/172, web 575/76: **6,092 passed / 0 failed / 3 existing skips**.
Focused Library 80/4, resume 65/5, reader navigation 21/2, long-reader host 2/1 pass.
Forced root typecheck/lint/build 8/8 each, zero cached. API 37/web 23 static pages,
Android 38-file JS/assets export pass. Generated Next type files restored;
final forced typecheck 8/8, zero cached. Staged/unstaged diff and owned-path/
history/held-sequence checks FRESH PASS. Six existing lint warnings remain.
First expected Library baseline 74 pass/4 fail; first added owner/error fixture
78 pass/2 fail corrected double ID prefixes; original held-request harness
drain interrupted and corrected; CJS probe entry corrected. No weakened
assertion or unresolved failed gate, no observed product flake. Exact logs and
helper corrections are in acceptance; test/build times are not device latency.

Measured separately: source 2.2.0/code 6/runtime 2.2.0-sdk57; existing matched
2.3.0/code 7 APK 132,024,227 B, SHA256 0910d589...cc12e6, native 93,639,812 B/four ABIs;
current HBC 10,946,724 B (+1,623 versus historical PBR0), no APK saving. Web
chunks 2,585,223 raw / 821,493 local gzip bytes. Reader synthetic 120-section
fixture preserves 4,440 segments/120 anchors; development host mount 647.192 ms /
search 1,835.517 ms do not establish physical performance or a safe reader fix.
API synthetic 0/100/240/300 plus 1,000 hidden rows preserves exact owned results
and rejects failed evidence; plans/live latency remain unknown.

Commits:

- `8d6e60a3 docs(perf): freeze PBR-AF1 renewed audit acceptance`
- `da8daa6f docs(perf): checkpoint reproduced Library read amplification`
- `5ca0ca9f docs(perf): checkpoint verified Library repair and renewed inventories`
- `3074a473 docs(perf): preserve PBR-AF1 progress and held roadmap boundaries`
- `54aef02b docs(perf): checkpoint fresh PBR-AF1 full-suite results`
- `ef80dfc6 perf(library): coalesce owner-scoped local refresh reads`
- Final docs(perf): close PBR-AF1 local acceptance checkpoint; exact hash in
  Git and tmp/overnight/PBR-AF1.status after committing this footer.

**Owner steps remaining**

- Native text **UNRESOLVED / UNREPRODUCED**; native repair BLOCKED on attribution.
  Exact owner question, recorded only: which original FS7 route order, background
  dwell, Appearance state and active OTA reproduce missing labels, and are the
  same labels absent simultaneously on screen and capture? Recover original
  FS7 evidence, then separately authorize the pinned Realme 2.3.0/code 7/hash /
  active update/runtime matrix. Distinguish 01a162a3 and 01a16304. Record ten
  resume cycles, same-route/Today-Generation/Appearance round trips, Light/Dark/
  Automatic and Reduced Motion with synchronized lifecycle/focus/surface/Text
  markers and bounded 0/1/5/15/30/55s screen-versus-capture observations. Use
  public/empty content; redact academic data/credentials, preserve pending work.
- **Device checks and Rollout NOT RUN**, skipped entirely. No service/provider/
  account/email/Scheduler call, environment edit, remote SQL/migration, deploy,
  EAS/OTA/native release build/install, push or spending. No new native fix is
  ready for closure. PBR-RT1 stays STOPPED; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1
  stay HELD, not started/advanced. Unrelated OX/parity/Owner Pause and UI/,
  apps/mobile/.gitignore, supabase/.temp/ and previous ignored evidence preserved.
- **UNVERIFIED (owner to confirm):** active binary/OTA/live revisions/database/
  applied migrations/regions/queue/Scheduler/providers, native failure cause and
  screen/capture attribution, physical latency/RAM/GPU/font/compositor behavior,
  authenticated acceptance and beta/release readiness. Review API history plans,
  image badge semantics with LC1, stage timing, compatible packaging and target
  device reader traces before material choices. No native closure or release GO.
- Vercel CLI unavailable: strongly recommend npm i -g vercel for future
  separately authorized env/deploy/log tooling. Install/commands NOT RUN.

## PBR-EV1 - FS7 archive evidence contradiction (2026-10-23)

**STOPPED during STEP 1**, under the prompt's surprise/contradiction stop rule.
Owner panel option 1 authorized only recovery of existing FS7 evidence; no
source/native fix, new device diagnostic or release. Initial branch
overnight/2026-10-15_feedback / HEAD 821b2416, local upstream 11 ahead / 23
behind, no fetch. Original untracked UI/, apps/mobile/.gitignore,
supabase/.temp/ and ignored evidence preserved/excluded.

[Recovery checkpoint, exact file/hash provenance and recorded owner question](acceptance/pbr-ev1-fs7-evidence-recovery.md).
The actual sibling release clone exists at
`C:/Users/Fely Max Dilinila/Documents/Projects/stay-focused-v2-fullsend-20261022-1512`;
its `.local/fullsend-20261022-1512/` contains the PNG/XML pair and metadata.
Read-only Git c9cb867d/babcb0b and runner FS7 log/results corroborate historical
identity 2.3.0/code7/runtime 2.3.0-sdk57/update 01a162a3. Source 2.2.0/code6
and later update 01a16304 remain separate. Original reports are unmodified.

Recovered command order: Light Today/standalone Generation, Dark Appearance
selection -> Today/Generation, three Today -> Generation cycles, Home ->
launcher resume. No explicit Home-to-launch dwell; no synchronized native
lifecycle/Text/surface trace. Capture mtimes are 16:10:41.966 and 16:11:36.817
+08:00 on October 22: 54.851 s spacing, consistent with logged 54.9, not a
measured failure/recovery duration. Public Generation pair inspected only.

**Contradiction:** currently recovered `after-resume.png` SHA256
`486145d3c9d7bb1772a224e3cd682e3686014ed966da1023c5437cf168f5d8b9`
shows status/helper/View Queue/Generation details and back arrow;
`stable-after-resume.png` SHA256
`8b3698a5dcbe96150e14026a1b752acebc88f7fe029d520be63ae129d67fe0df`
lacks them, while orb/backgrounds/system status remain. Historical report/log
says first missing, later recovered. Both full XML dumps are byte-identical
and retain four TextView strings; separate dump/capture cannot prove physical
pixels. No filename swap, narrative rewrite or native-cause inference. Hashes
computed now do not authenticate original chronology/no-overwrite history.
No raw log, XML, screenshot, academic content or secret committed.

Commits:

- `31137b67 docs(perf): record PBR-EV1 archive evidence contradiction`
- `docs(perf): checkpoint PBR-EV1 stopped handoff` (this footer; exact hash in
  Git and ignored `tmp/overnight/PBR-EV1.status` after commit).

FRESH `npm run typecheck -- --force`: **8/8 tasks, 0 cached, exit 0**, runner
59.128 s, source 821b2416. `npm run lint -- --force` began but was interrupted
at the contradiction: no final counts/normal lint exit, **BLOCKED/INTERRUPTED**;
owned runner PID 43272 and child tree terminated, session exit 1 retained.
API build and Android offline JS/assets export **NOT RUN** at stop; focused
shared/API/mobile tests **NOT APPLICABLE** (docs only, zero tests executed).
No historical tests reused as fresh evidence. Inspected runner used local temp,
loopback-only Node guard, npm/Expo offline/no-dotenv, disabled telemetry and
local Turbo cache. No installs or live commands. Safe documentation validation
**FRESH 36/36, 0 failed**; exact staged/unstaged diff checks exit 0. Historical
planning/handoff bytes and Next declarations preserved; five Markdown paths
only across both local commits. Provenance corroboration of the recovery
narrative is **BLOCKED**, not a green native acceptance gate.

First inspection issues retained in report: PowerShell upstream literal and
inline Node quoting, absent guessed app.config.ts, UI-automator footer rejected
by direct XML casting, overbroad output narrowed. File-based bounded extraction
corrected inspection without evidence/source changes. No observed flake or
completed failed implementation gate. STEP 0 done; STEP 1 partial/STOPPED;
STEP 2 safe findings only; STEP 3 safe docs/boundary validation only.

**Owner steps remaining**

- Exact question, recorded only: can you reconcile original FS7 first-failure
  versus follow-up filename/timestamp/checksum mapping with the opposite text
  ordering above? Supply any already-saved original screenshots/recording if
  different and confirm whether the physical display also lost those labels;
  include existing dwell/system-theme/native notes if available. The route
  loop is recovered. No new capture/install/reset/OTA switch is authorized;
  no unattended question was sent.
- **UNVERIFIED (owner to confirm):** original pixel identity/untampered
  chronology, physical-screen versus capture, actual recovery interval/cause,
  native lifecycle/font/GL/compositor attribution, current active binary/OTA,
  all live production/database/Scheduler/provider state. PBR-RT1 stays
  **STOPPED**; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 stay **HELD**, unqueued/unstarted.
  **Beta readiness BLOCKED**; no automatic retry or successor. Historical FS7
  5 PASS / 1 FAIL/PARTIAL is preserved as a conflicting historical result.
- **Rollout and Device checks NOT RUN**, skipped entirely. No FULLSEND,
  service call, deploy/worker/OTA/EAS, native build/install, remote SQL or
  migration application, Scheduler/email, environment-file edit, push or cost.
  Owner must review archive discrepancy before separately authorizing any
  native diagnostic or release. No fix ready for publication. OX2's original
  block, pending performance/visual work, parity and Owner Pause preserved.
- Vercel CLI unavailable: strongly recommend `npm i -g vercel` for future
  separately authorized env/deploy/log tooling. Install/commands NOT RUN here.

## PBR-RDP - Realme read-only diagnostic preparation (2026-10-23)

**PASS for local documentation preparation only. Separate physical diagnostic
NOT RUN.** The complete PBR-RDP prompt's UNATTENDED header controls. Owner
authorized a bounded Realme diagnostic after EV1's screenshot contradiction;
the current bridge offers documentation preparation only, no device-execution
action. No device was examined and no capture/native log was collected.

[Owner-present runbook, evidence fields, stop rules and original-artifact
protection](acceptance/pbr-rdp-realme-runbook.md). STEP 0 baseline complete at
d728939fa2c45a3d84b6dc42bc15843259d0450f on overnight/2026-10-15_feedback;
local upstream snapshot 13 ahead / 23 behind github/main, no fetch. STEP 1
runbook and STEP 2 exact owner checklist/handoff complete. Git/source,
AGENTS/AUTOPILOT, planning, existing RT1/AF1/EV1 acceptance and ADR-001/011
reviewed. No new implementation contradiction. Existing FS7 opposite PNG/text
ordering stays unresolved; prior acceptance records remain unchanged.

Checklist pins Realme RMX3151/Android 13 and independently verified native
version/code/full OTA/runtime/channel, distinguishes source 2.2.0/code6 from
historical 2.3.0/code7 and FS7 01a162a3 from later 01a16304. About's displayed
prefix is insufficient. Requires already-isolated public/empty state, no pending
work and owner presence; no connectivity/app settings change to create it.
At most 20 minutes/ten resumes in the existing theme/motion state, logged
Today -> Generation x3, measured background dwell, actual 0/1/5/15/30/55-second
observations, physical-screen notes independent from sequential screenshot/tree
assessment. Stops on unexpected identity/OTA, privacy, service activity or risk;
first safe symptom gets only its remaining bounded observations, no further
cycles/fix. Manifest/hash custody, original/derivative mapping and strict privacy
limits protect original evidence. All of these device steps remain prospective.

Commits:

- bee62e32 docs(perf): prepare bounded Realme diagnostic runbook
- docs(perf): checkpoint PBR-RDP preparation handoff (this footer; exact hash
  recorded after commit in Git and ignored tmp/overnight/PBR-RDP.status).

FRESH local results, unchanged implementation d728939f:

- npm run typecheck -- --force: exit 0, **8/8 tasks, 0 cached**, 57.164 s.
- npm run lint -- --force: exit 0, **8/8 tasks, 0 cached**, zero errors,
  six existing warnings (five mobile import-order / one web unused import),
  101.891 s.
- npm run build --workspace @stay-focused/api: exit 0, **37/37 static pages**,
  146.541 s. Build-generated API next-env.d.ts inspected and restored through
  Git checkout filtering to the baseline tracked content; source diff empty.
- Relevant shared/API/mobile tests **NOT APPLICABLE**, docs only, zero tests
  executed. Android offline export **NOT APPLICABLE / command NOT RUN**, no
  runtime/config/native/assets change. Root/web builds **NOT RUN**, outside
  applicable documentation scope. No old test counts reused as fresh evidence.
- Documentation checker **FRESH 43 passed / 0 failed**; tracked historical
  planning/policy/acceptance/declaration content, append-only handoff bytes,
  local links, required evidence, owned scope and secret-pattern checks.
  git diff --check and git diff --cached --check **FRESH PASS**, exit 0,
  including exact staged documentation for each local commit.
- **Seven preparation gates PASS**: read-only scope, provenance, no device
  action, no native change, no lost features, no secrets, RT1/four holds intact.
  This is no native/production/beta acceptance verdict.

First checker attempt **39 passed / 4 failed**: raw LF Git blobs versus existing
Windows CRLF policy/handoff/web declaration bytes. Validator corrected to
normalize tracked-content comparison and preserve a byte-exact pre-append
handoff snapshot; no product/policy file changed to make it pass. Narrowed
truncated reads and resolved guessed paths by inventory. No implementation gate
failure or product flake observed; no failed gate remains unresolved. Logs,
runner, checker, progress/status and local inspection outputs remain ignored
under tmp/overnight/PBR-RDP*. Nothing under tmp committed.

**Owner steps remaining**

- **Device checks: NOT RUN**, skipped entirely. Conduct the separately
  authorized owner-present read-only diagnostic only through a capable bridge,
  with the runbook's identity/isolation/privacy preflight satisfied. Current
  preparation bridge has no device-execution action. No settings, install,
  reset, force-stop, OTA/version switch, new instrumentation or remote service
  is authorized by this preparation. Report unavailable identity as UNVERIFIED
  and stop that future session rather than adapting the phone.
- **Rollout: NOT RUN**, skipped entirely. No fix is ready to publish. No
  push/deploy/Google worker/OTA/EAS/native build/install, Supabase/Vercel/Google
  Cloud/Canvas/Resend call, remote SQL/migration apply, Scheduler/email,
  environment-file edit, credential/account operation or spending occurred.
- **UNVERIFIED (owner to confirm):** current phone/binary/full OTA/runtime/
  channel, original FS7 custody/chronology and physical-screen attribution,
  failure/recovery interval and native cause, physical performance, all live
  revisions/database/applied migrations/regions/queues/Scheduler/provider state.
  Local build/test timing is not device performance or pixel evidence.
- PBR-RT1 and PBR-EV1 remain **STOPPED**; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1
  remain **HELD**, unqueued/unstarted. **Beta readiness BLOCKED**. Review future
  evidence before retry/supervisor review; no automatic successor. OX2's original
  block, pending OX3/OX4/QI1/LC1, parity and Owner Pause preserved. Unrelated
  UI/, apps/mobile/.gitignore, supabase/.temp/ and prior ignored evidence intact.
- Vercel CLI unavailable: strongly recommend npm i -g vercel for future
  separately authorized env/deploy/log tooling. Installation/all Vercel commands
  NOT RUN; no service contacted here.

## PBR-RDP - authorized Realme ADB preflight (2026-10-23)

**STOPPED at preflight; native text diagnosis INCONCLUSIVE.** Direct chat owner
requested execution against connected, authorized Realme. ADB is available in
this session, superseding the earlier preparation bridge limitation. Historical
preparation/FS7 evidence is preserved.

Source `a94c2bb7`, branch `overnight/2026-10-15_feedback`; metadata session
`pbr-rdp-20261023T030250693Z`, 03:02:50–03:02:52 UTC / 11:02 Manila.
**FRESH: 13/13 recorded device reads exit 0.** Realme RMX3151, Android 13/API 33,
package com.galaxymaxp.stayfocusedv2, native 2.3.0/code 7. Airplane mode 0,
Wi-Fi/mobile-data settings 1; active default network and validated capability.
Full active OTA/runtime/channel/embedded identity UNVERIFIED. System night mode
yes, animation scale 1, preferred rotation 0; app preferences not established.

Runbook preflight items 4/5 require stopping before transitions when full OTA
identity or existing isolation is unavailable. **0 app launches/navigation/
resume cycles, 0 screenshots/tree dumps, 0 logcat.** No physical observation,
cause or recovery claim. No settings, installation, source/native/configuration,
service, release, environment-file, remote SQL, rollout or push action.

[Acceptance and exact commands](acceptance/pbr-rdp-realme-preflight-20261023.md).
Sanitized command ledger/results plus SHA256/size manifest retained under ignored
tmp/overnight/PBR-RDP-device/pbr-rdp-20261023T030250693Z/. Initial custody
verification FRESH PASS for both files. Documentation/diff checks FRESH PASS at
closure; code suites/builds NOT APPLICABLE / NOT RUN, no implementation changes.
Scoped documentation commit follows; exact hash in Git/local closure file.
Initial inspection wildcard/upstream/ADR-path corrections recorded in acceptance;
no device command failed. Unrelated untracked paths preserved.

**Owner steps remaining:** independently establish full active OTA identity and
pin intended baseline, already-isolated public/empty safe app state and physical
observer before bounded transitions. No automatic setting change/workaround.
Rollout NOT RUN. RT1/EV1 STOPPED; MB1/LP1/AS1/LR1 HELD; beta BLOCKED. Other
OX/parity/Owner Pause states and contradictory archived originals unchanged.

## PBR-RT2 — direct-PC Realme diagnostic (2026-10-23)

**BLOCKED at identity/isolation preflight; rendering INCONCLUSIVE; cause
UNRESOLVED.** Direct owner-authorized local ADB, not the unattended bridge.
Initial HEAD 32a7d220, expected overnight/2026-10-15_feedback; tracked/index
clean, local github/main snapshot 16 ahead/23 behind, no fetch. Author and
unrelated UI/, apps/mobile/.gitignore, supabase/.temp/ preserved.

FRESH single Realme RMX3151/Android13/API33, package com.galaxymaxp.stayfocusedv2
2.3.0/code7. Thirteen metadata reads exit0 at 03:45:15–03:45:16 UTC. Phone has
active validated network; full OTA/runtime/channel UNKNOWN. Runbook items4/5
and current owner identity stop apply before navigation/capture. **0 launches,
0 resume cycles, 0 screenshots/tree dumps/logcat.** Physical display, native
Text/GL/focus, app theme/motion and reproduction UNKNOWN. No supported cause,
source change or regression test invented. Historical FS7 PNG/XML contradiction
and RT1/EV1 STOPPED records unchanged; four dependents HELD, beta BLOCKED.

[Acceptance and sanitized custody](acceptance/pbr-rt2-direct-realme-diagnostic.md).
Separate ignored evidence tmp/overnight/PBR-RT2/pbr-rt2-20261023T034515540Z/
contains timestamped command ledger, sanitized metadata and SHA256/bytes manifest;
no raw private captures. PC-only guarded offline verification on unchanged code:
shared706/mobile1651/API2452 = **4809 pass, 0 fail, 3 existing live skips**;
focused resume65/5 files pass. Forced typecheck/lint/build8/8 each,0 cached;
API37/web23 static pages; standalone Android JS/assets export PASS (not APK).
Six existing lint warnings; no failed product gate/new skip. Generated Next
declarations restored and final forced typecheck passes. Exact command timings,
freshness, outputs and hashes retained locally. Diff/index/docs preservation
checks recorded at closure. No release/install/OTA/FULLSEND/push, network or
app settings/data changes, private storage, migrations or paid/provider calls.

Supported controller review 6ea624c7-955c-46f1-840d-86da5bc52dcf applied
(backlog/ledger/panel status; queued[], rollout false). MB1->LP1->AS1->LR1 remain
held until native predecessor actually passes. Existing runner remains enabled/
Pause OFF; no duplicate runner or manual queue/status edits. Blocking prerequisites
are safe full active OTA/runtime identity and an already isolated public/empty
state; physical display UNKNOWN unless independently observed. No repeat routine
permission requested. Receipt: ignored PBR-RT2/supervisor-review-1.json.
First root build interrupted for Turbo environment propagation; corrected
guarded rerun PASS; log and timing clarification retained. Docs/custody37/37,
0 failed. Local commit follows; final committed HEAD gets fresh controller review.

PBR-RT2 local commit checkpoint: `a915993bc6bba6c99fb175985f145feb55a4de89`
(docs(perf): record PBR-RT2 direct Realme diagnostic blocker). Five docs paths
only, owner identity galaxymaxp <omgraythekid@gmail.com>; no product changes or
push. Final exact footer HEAD and controller receipt are recorded in Git/local
closure and final response. Full suites4809 pass/0fail/3 existing live skips;
65 focused pass; forced gates8/8 each0cached; Android JS38files PASS;
docs/custody37/37 and both diff checks PASS. One interrupted root attempt
retained, corrected guarded PASS. No native repair, release or dependent-task
admission; same original untracked work and historical reports preserved.


## PBR-RT2 recovery / independent performance continuation — 2026-10-23

Owner's direct PC recovery instruction supersedes the earlier blanket performance
hold. See acceptance/pbr-rt2-recovery-and-performance-resumption.md for exact
scope, evidence and controller procedure. Initial HEAD 359cc51ab9c9e0da1f9a668a88a16a7e6feeb985, branch
overnight/2026-10-15_feedback; unrelated untracked paths preserved.

Fresh 13/13 metadata checks confirm one authorized Realme RMX3151 Android13/API33,
native2.3.0/code7. Installed base APK SHA256 matches the historical132024227-byte
archive; binary configured runtime2.3.0-sdk57/channel preview confirmed locally.
Active OTA/runtime/channel/embedded identity still UNKNOWN. Active validated
network; existing public/empty isolated state NOT PROVEN. No app launch, capture
or physical resume cycles; **STOPPED / INCONCLUSIVE**, no attributable cause/fix.
Fresh original screenshot inspection/hashes confirm EV1's opposite pixel ordering
versus FS7 narrative. Original reports, statuses and artifact bytes preserved.

Current independent chain: PBR0 PASS + PBR-AF1 PASS -> PBR-MB1 -> PBR-LP1 ->
PBR-AS1 -> PBR-LR1. MB1 eligible for fresh supported publication, later IDs await
predecessor PASS and review. AF1's Library coalescing is already complete; profile
current code, no duplicate repair. Only one new task fits alongside historical
OX2 under controller two-TOTAL-pending limit. OX2/OX1 and release gates unchanged.

Recovery changes are docs only: app unit/typecheck/lint/build/performance gates
NOT APPLICABLE; fresh documentation/custody and Git diff checks required before
local commit. Implementation gates remain mandatory for workers. Runner39828
already idle, Manual Pause OFF, supervisor chatgpt; no restart/duplicate. Publish
through existing review lease and bridge guard only, verify actual pickup before
claiming running. Controller ledger/status and final report record publication.

Owner steps remaining: full active identity and already isolated safe public app
state plus independent observer conditions before physical retry. Device/beta/
release gates BLOCKED. No production, push, deploy, migration, OTA, native build,
install, device setting/data/account change or FULLSEND. No owner action is needed
for the independent local lane if the bridge accepts its reviewed task.

## PBR-MB1 local baseline — 2026-10-23

**PASS for mandatory LOCAL code/measurement/instrumentation/gate/docs scope.**
Initial447c0e51, branch overnight/2026-10-15_feedback; runtime/tests
`b788663e288f5d970d87cd7d54710c94abf21813`. Original unrelated UI/, apps/mobile/.gitignore,
supabase/.temp/ and historical reports/statuses preserved. No push.
[Acceptance and reproducible measurements](acceptance/pbr-mb1-performance-baseline.md).

Public synthetic Node/SQLite/React adapters measure fresh/warm local setup,
saved-cache reads, entry/notification dispatch, all0/100/240/300 Library changed
and unchanged schedules, and API0/1000-history pagination. Complete results and
page/history hashes match. AF1 retained:2 summary/2 stats/max1 active read.
API reads remain2/2/6/6 without history and7/7/21/21 with1000 hidden rows.
These are adapter counts/host timings, not PostgreSQL or native latency.
No optimization/speedup is claimed. Optional shared measurement observer has
fixed numeric allowlisted events, injected clock, no default clock/sink/buffer/
timer/network; sink failures and cancellation cannot change study behavior.

FRESH full suites: shared711/73files, mobile1658/174files, API2455/214files
(+3 existing live skips), web575/76files, Canvas75/1file, OCR27/3files,
engine606/0failed; **6107 pass /0 fail /3 existing live skips**. Shared includes
emitted copies, not unique source coverage. Focused shared5/mobile86/API3 PASS.
Forced root typecheck/lint/build8/8 each,0 cached. Explicit API37/web23 static
pages, Android38-file offline JS/assets export PASS. Six existing lint warnings.
Staged/unstaged diff hygiene PASS; FRESH docs/custody validation99/99,0 failed;
hashes in ignored PBR-MB1/verification.json and SHA256.json. Final typecheck/lint
run after generated Next declaration restoration. No test weakening/new skip.

First attempts retained: probe import1 suite failed/2 tests passed; invalid
enabled tsx cohort emitted0 events and was excluded, corrected shared import
verifies1/page; typecheck6/8 successful with3 new test TS2345 errors corrected;
mobile1654 pass/3 failed due new assertions including unrelated setup events,
corrected boundary assertions1657 PASS and final router-throw extension1658 PASS.
No observed product flake. Final matched frozen/current API and off/on probes
include complete DTO hashes, fixed events and injected clock-call counts.

The first final-document helper had a closing-delimiter syntax error before
writing; corrected helper syntax check and assembly PASS. Failure retained in
closure-attempts.log; no application or gate change.

Commits made (owner author galaxymaxp <omgraythekid@gmail.com>):

- `803748e8 docs(perf): freeze PBR-MB1 local measurement acceptance`
- `49c18aa1 docs(perf): checkpoint current-source synthetic baseline`
- `4c4c9e9b docs(perf): checkpoint measurement safety and verification attempts`
- `b788663e feat(perf): add opt-in privacy-safe local measurements`

The final scoped documentation checkpoint follows this footer; its exact hash
is recorded in Git and tmp/overnight/PBR-MB1.status, without amending history.

Next eligible task: PBR-LP1 only after fresh supervisor review/publication of
actual MB1 PASS. Begin with MB1 and AF1 ef80dfc6; require attributable evidence
for further optimization or document no justified local change. AS1 after LP1
PASS/review, LR1 after AS1 PASS/review. No successor or unrelated scope executed;
historical OX2 remains blocked by OX1. No controller/queue/status bypass.

**Owner steps remaining**: Rollout and Device checks **NOT RUN**, skipped
entirely. RT1/EV1 STOPPED and RT2 physical preflight STOPPED / resume-text
INCONCLUSIVE remain intact; active OTA/full runtime/channel/embedded identity,
safe public/empty isolation, physical rendering/startup/frames/RAM, authenticated
acceptance, deployments/DB/applied migrations/regions/Scheduler/provider state
and production percentiles are **UNVERIFIED (owner to confirm)**. Source
2.2.0/code6/runtime2.2.0-sdk57 and JS export are distinct from the archived
installed2.3.0/code7/binary configured2.3.0-sdk57/preview; no new device read.
Before separately authorized physical measurements, satisfy the RT2 runbook
identity/isolation/observer preflight; measure20 cold/20 warm launches and
navigation/frame cohorts on the pinned identity. No release/beta readiness.
Any production/service/worker/Scheduler/push/deploy/SQL/migration/OTA/EAS/native
build/install/tester distribution or spending remains owner work; no environment
file was touched. Vercel CLI unavailable; strongly recommend npm i -g vercel
for separately authorized future env/deploy/log tooling; installation NOT RUN.

## PBR-LP1 local Library profiling — 2026-10-23

**PASS for mandatory LOCAL scope, no runtime change.** Resumed at d8d22603 with
no progress file/LP1 dirt; unrelated UI/, apps/mobile/.gitignore, supabase/.temp/
and ignored evidence retained. [Acceptance](acceptance/pbr-lp1-library-performance.md).
Initial branch overnight/2026-10-15_feedback; 24 ahead / 23 behind local upstream
snapshot, no fetch. No prior committed work redone. Owner author galaxymaxp.

Two identical unchanged-source cohorts: 960 measured isolated store operations
(96 warmups), 80 hook schedules (16 warmups), 80 API walks (16 warmups).
Exact full sorted items/stats/DTOs/cursors/hidden-ID hashes match repeat and MB1
where fixtures overlap. AF1 `ef80dfc6` remains baseline: 2 summary/2 aggregate stats/
max 1 active hook read. API 2/2/6/6 vs 7/7/21/21 with 1,000 hidden rows retained.
300-item overview medians 3.029/3.440ms without stress, 11.788/11.078ms with 1,000
foreign summaries plus 1,000 unmatched rows per 4 overlay tables. Seeded adversarial
shape, not production cardinality; normal removal cleans related rows. No
specific safe remaining optimization/production SQL plan is established. Keep
all 8 owner-bound reads/one summary scan, full history and pending work. No
speedup, index/cache change, frame/native startup or APK-saving claim.

FRESH full relevant tests: shared 716/74 files (37 source + 37 emitted),
mobile 1,658/174 files, API 2,455/214 files; **4,829 pass /0 fail /3 existing live
skips** (activity 1, quiz 2). Focused mobile 82 / API 3 PASS; both 2-file/2-test probe
cohorts PASS; API adapters exit 0. Forced root typecheck/lint/build 8/8 each, 0
cached; six existing lint warnings. Explicit API 37/37 pages; root web 23/23 and
mobile Android/iOS/web offline JS/assets exports PASS. Standalone Android and
web tests/build NOT APPLICABLE to zero runtime changes. Build hashes, exact
logs/commands, first discovery failures and custody checks live in ignored
tmp/overnight/PBR-LP1/. No application gate failure, new skip or product flake.
The first final documentation verifier exited1 after29,546 unchanged hashes:
it rejected3 existing historical replacement characters. Baseline/current
counts are both3, historical prefix unchanged, new LP1 footer0. Corrected the
helper to verify no new characters and clean owned text; failed attempt kept.
Corrected final custody/documentation verification: FRESH 29,575/29,575 PASS,
0 failed; all 29,546 original input hashes unchanged. Root mobile JS/assets
inventory: 84 files / 35,320,652 bytes across three platforms, not a native APK.
Exact build IDs/per-file hashes and evidence index recorded locally. Final
staged/unstaged diff checks PASS; no generated/private artifact is staged.

Local commits:

- a35b1d3c docs(perf): freeze PBR-LP1 profiling acceptance
- 204f8731 docs(perf): record LP1 measurements and no-change verdict

Final scoped documentation checkpoint follows this footer; exact hash recorded
in Git and tmp/overnight/PBR-LP1.status without amending history. All tracked
LP1 changes are documentation. RT1/EV1 STOPPED, RT2 physical STOPPED /
resume-text INCONCLUSIVE/deferred and OX2 blocked by OX1 remain untouched.
Next eligible AS1 requires fresh supervisor review of actual LP1 PASS; LR1
requires AS1 PASS/review. No task publication/controller/queue edits here.

**Owner steps remaining**: Rollout and Device checks **NOT RUN**, skipped
entirely. Deployed revisions/database/applied migrations/Scheduler, production
SQL plans/cardinality/timings, authenticated browser, native frame/startup/RAM
and physical rendering remain **UNVERIFIED (owner to confirm)**. Before physical
work, satisfy preserved RT2 full active OTA/runtime/channel/embedded identity,
safe public/empty isolation and independent-observation preflight. Source
2.2.0/code6 differs from archived installed 2.3.0/code7; no new device claim.
Push/deploy/service/SQL/migration/email/Google worker/Scheduler/OTA/EAS/native
build/install/tester distribution/spending are owner work; none performed.
No environment file opened/edited by task helpers. Vercel CLI unavailable;
strongly recommend npm i -g vercel for separately authorized future tooling;
installation NOT RUN.

## PBR-AS1 APK size investigation - 2026-10-23

**Status: PASS for mandatory LOCAL scope; justified no-change verdict.**
Branch overnight/2026-10-15_feedback, initialecf4c5ed (27 ahead / 23 behind local
upstream snapshot, no fetch). Actual PBR0/AF1/MB1/LP1 PASS and LP1 commit ancestry
verified; current prompt's owner approval authorizes AS1 only. Untracked UI/,
apps/mobile/.gitignore, supabase/.temp/ and original ignored evidence preserved.
[Acceptance and exact evidence](acceptance/pbr-as1-apk-size-optimization.md).

Before/after APK 132,024,227 bytes, SHA256
0910d589b42c02c04f032dff7362da69258cdd081c5be1c2dc83798452cc12e6,
1,729 entries; native 93,639,812 bytes across27 libraries per each of four ABIs.
Compressed assets 8,793,910, fonts 932,190 bytes unchanged. Forty identical payload
groups (111 named entries) do not prove any safely removable resource/library
lookup. No duplicate names/fonts/native/assets and no source correction proved.
Native compression/shrinking requires separate equivalent owner native builds;
no packaging/signing/runtime/ABI/module/font/quality/feature/export change.

Source 65 assets / 5,646,237 bytes unchanged. Offline Android exports38 files,
14,671,618 ->14,671,619 bytes. HBC10,949,445 ->10,949,446; the entire +1 byte is
installed Expo's Math.random/Date.now debug source pathname length. Other 37 files
match exactly; strict comparison accounts only for filename, length fields,
size and valid checksums, compares all remaining bytes and detects a corrupted
non-debug byte. Raw SHA256s and canonical diagnostic hash remain in acceptance/
comparison.json; no APK saving or physical metric inferred from Metro output.
Full font hashes preserve 2,926 glyphs/Inter and 4,045/Material Symbols. Literal
asset/config references, metadata, offline tutorial, full weights, local sounds,
atlas/GL/plain-text fallbacks and saved PDF/DOCX/PPTX exports remain intact.

FRESH full shared 716/mobile 1,658/API 2,455 = **4,829 pass / 0 fail / 3 existing live
skips**; shared counts include emitted copies. Focused mobile 37/shared export11
PASS. Reference audit 67/67; strict artifact comparison 96/96 PASS. Forced root
typecheck/lint/build 8/8 each, 0 cached; six existing lint warnings. Explicit
API 37/37 and two standalone Android offline JS/assets exports PASS; root includes
web 23/23 and Android/iOS/web exports. Standalone web tests/build NOT APPLICABLE
(no web/shared behavior change). Native/physical/live outcomes NOT RUN.

First Android/first focused startup failed before execution due only to ignored
guard relative-path/environment-file visibility handling; fixed without reading
or editing environment files or changing products/tests. Original failed logs
retained. First raw-comparison helper39 pass/3 fail is preserved, investigated and
replaced by strict 96/96 metadata-aware evidence checks, not hidden raw equality.
Python alias/Windows guessed-path discovery attempts corrected locally. No
failed product assertions, new skips or observed flake. Next-generated ambient
files inspected/restored; final forced typecheck checks the original source.

Local scoped owner-authored commits:

- 1831c8c2 docs(perf): freeze PBR-AS1 size investigation acceptance
- 1320404c docs(perf): record AS1 byte attribution and no-change verdict

Final documentation checkpoint follows this footer; its exact hash is in Git
and tmp/overnight/PBR-AS1.status, without amending its own history. Only five
owned Markdown files are committed. All logs/inventories/fixtures/tool hashes/
original and failed comparisons remain ignored under tmp/overnight/PBR-AS1/.
Fresh final custody/build identities and exact check count are recorded below.
MB1/LP1 remain complete; no repeated Library optimization. LR1 requires actual
AS1 PASS and fresh approval; no publication or successor work performed.
OX2 stays blocked on OX1, unrelated scope/Owner Pause and controller untouched.

**Owner steps remaining**: Rollout and Device checks **NOT RUN**, skipped
entirely. No push/deploy/service/provider/remote SQL/migration/email/Google worker/
Scheduler/OTA/EAS/native build/install/tester distribution/spending/environment
file action. Rebuilt APK savings, identity of owner-reported117 MB artifact,
active full Realme OTA/runtime/channel/embedded identity, safe public isolation,
physical rendering/startup/RAM, authenticated browser, deployed revisions/DB/
applied migrations/Scheduler/production outcomes **UNVERIFIED (owner to confirm)**.
RT1/EV1 STOPPED, physical RT2 STOPPED/resume-text INCONCLUSIVE and deferred remain
unchanged. Source 2.2.0/code 6 is distinct from archive 2.3.0/code 7. Before separately
authorized physical work, satisfy the preserved RT2 identity/isolation/observation
preflight. No beta/release readiness claim. Vercel CLI absent; strongly recommend
npm i -g vercel for separately authorized future tooling; installation NOT RUN.

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

## PBR-LR1 long-reviewer rendering - 2026-10-23

**Status: PASS for mandatory LOCAL scope.** Branch overnight/2026-10-15_feedback,
initial d747fcd2 (30 ahead /23 behind local upstream snapshot; no fetch).
Actual PBR0/AF1/MB1/LP1/AS1 PASS and all reported status commits verified ancestors.
Owner prompt grants manual approval of existing LR1 after actual AS1 PASS.
Untracked UI/, apps/mobile/.gitignore, supabase/.temp/ and ignored owner evidence
preserved. [Acceptance](acceptance/pbr-lr1-long-reviewer-rendering.md).

Only runtime change: reuse the existing complete JSON identity in mobile/web
TopicAssist through useMemo(owner,selection). Every serialized key value and
content/owner/reviewer/section reset is unchanged. New regressions prove exact
removed-work counts, same-content active-answer retention, current full children,
changed identity reset and late old-owner/unmounted completion isolation.
No parser/image/selection/export/virtualization/content-size/cache rewrite.

One warmup and 3 samples at each 0/1/12/120/240 topics per client per cohort:
60 measured schedules plus 20 warmups across before/after. Largest full source
JSON 1,070,213 code units; 10,800 complete segments. Exact full output/navigation/
canonical/export-layout/parser hashes and host node/commit counts match all
schedules: FRESH strict comparison 771/771,0 failed. Key calls at 240 topics:
mobile 2,640 -> 720, web 2,400 -> 720; identical parent updates 960 -> 0 each.
Avoided repeat output 8,463,840 / 7,405,860 UTF-16 code units respectively. These
are serialization/work proxies, not native bytes or retained heap savings.
Rerenders persist; mixed three-sample timings/GC deltas establish no speedup.
Full timing/heap samples, original probes, source/tool/diff and artifact hashes
remain ignored in tmp/overnight/PBR-LR1/, indexed by SHA256.json.

FRESH full shared 716/74 files, mobile 1661/174, API 2455/214 plus 3 existing live
skips, web 578/76: **5410 pass /0 fail / 3 existing live skips**. Shared includes
emitted copies. Focused mobile 362/web 66 PASS; corrected full-reader probes 2/2
before and 2/2 after; guard 3/3 PASS. Forced root typecheck/lint/build 8/8 each,
0 cached; explicit API/web builds and Android offline JS/assets export PASS.
Build/export identities and exact commands/results are in acceptance/gate-results.
Six existing lint warnings; no product flake/new skip/test weakening.

First failures retained: red focused mobile 361 pass/1 fail and web 65 pass/1 fail
(the new expected key-count regression); first probe mobile circular mock JSON
and interrupted expensive web assertion worker 1 error; second probe 1 pass/1 fail;
corrected third 2/2 PASS. First lint 5/8 successful, 0 cached, 3 web test children-prop
style errors; corrected test syntax, then forced lint/typecheck and full suites
PASS. No runtime change after successful comparison. Discovery path errors and
all original logs remain; no failed first attempt is presented as a passing run.

Local scoped commits (author galaxymaxp <omgraythekid@gmail.com>):

- 5f3bf300 docs(perf): freeze PBR-LR1 rendering acceptance
- 93cec189 docs(perf): record LR1 complete-content baseline
- e1bde90c perf(reviewer): reuse exact topic render identities

Final scoped documentation checkpoint follows this footer; its exact hash is in
Git and PBR-LR1.status, without self-amending history. Current-state/roadmap/sprint
now record the finite MB1 -> LP1 -> AS1 -> LR1 LOCAL endpoint. No new initiative,
queue/controller/dependency change or physical retry. MB1/AF1 are baseline work,
not duplicate LR1 claims. OX2 blocked by OX1 and unrelated Owner Pause preserved.
Final custody/doc/diff checks are recorded in the acceptance closure entry.

**Owner steps remaining**: Rollout and Device checks **NOT RUN**, skipped
entirely. Physical/native/authenticated acceptance and production performance,
full active Realme OTA/runtime/channel/embedded identity, safe public/empty
isolation, independent physical-screen observations, deployed revisions/DB/
applied migrations/Scheduler/provider state **UNVERIFIED (owner to confirm)**.
RT1/EV1 STOPPED; RT2 physical STOPPED/resume-text INCONCLUSIVE/deferred remain.
Source 2.2.0/code 6 differs from archived 2.3.0/code 7. Satisfy preserved RT2 runbook
preflight before separately authorized physical work; local test-host evidence
does not establish beta/tester/release readiness. Push/deploy/service/remote SQL/
migration/email/Google worker/Scheduler/OTA/EAS/native build/install/distribution/
account or environment changes/spending remain owner work; none performed here.
Vercel CLI absent; strongly recommend npm i -g vercel for separately authorized
future env/deploy/log tooling. Installation NOT RUN.

Final FRESH custody/documentation verification: **2,135/2,135 passed, 0 failed**.
Both `git diff --check` and `git diff --cached --check` pass at the final scoped
commit boundary. Historical planning/handoff text, all unrelated tracked inputs,
23 owner artifacts and inherited status/probe hashes are preserved. Source and
per-file local build/export hashes plus original attempts remain in the ignored
evidence index; all generated Next declarations were restored before final
forced typecheck 8/8, 0 cached. No physical/production result is inferred.


## PBR-UX1 resumed audit — FAILED (2026-10-23)

Resumed at `ee3bfb8d` on `overnight/2026-10-15_feedback` (35 ahead /23 behind
the local upstream snapshot; no fetch). Reread unattended rules/progress, log,
status/diff, policies/current plans and owning source; preserved the uncommitted
audit and all unrelated files. No committed work repeated. No runtime/test,
provider, schema, dependency or data change. LR1 remains PASS; all six dependency
status hashes and named commit ancestry remain verified.

[Audit, original findings, action inventory and bounded proposal](acceptance/pbr-ux1-queue-actions-audit.md).
96 adapted browser scenarios use source-extracted original functions and
synthetic hooks/data at 320/360/390/414/768/1280, normal/200% text, reduced motion
and loading/error/offline/empty. Corrected geometry reproduces mobile Completed
header overflow only at doubled text; screenshot review records the left-clipped
heading after scroll and Library title/footnote overlap. No normal-text or native
reproduction is claimed. Retained old failures do not establish a current
generation defect. Every existing course/Queue action, route, pin/selection,
permission/data consequence is inventoried. Proposal covers Queue reflow,
course chevron/enlargement feedback and accessible top-level existing-action
menus; detail generation/selection/destructive actions retain their scope and
placement. No product scope decision remains, but no successor is approved.

FRESH source action/navigation comparison 57/57 PASS; guard 3/3 PASS; custody/
evidence 2,321/2,321 PASS, including 36 sampled text contrast pairs (minimum 4.805:1).
96 original browser scenarios have 0 runtime errors/outbound page requests.
These are adapted/source proofs; physical assistive-technology results remain
unverified. All raw attempts, scripts, screenshots, SHA256 index and results
remain ignored under tmp/overnight/PBR-UX1/.

Required full-web gate FAILS in three completed executions: 577 passed / 1 failed,
75 files passed / 1 failed each. Commands: npm run test --workspace
@stay-focused/web -- --maxWorkers=2, then two complete --maxWorkers=1 runs.
Same generation-screen.browser.test.ts:252 tap-wave assertion expected 5, got 4/3/4.
Wall times 198.289/342.442/335.961s. Isolated unchanged -t run 1 passed / 12 filtered
skips in 8.768s. An older serial log was interrupted without a terminal result;
it is not counted as PASS. Source unchanged throughout. Timing/expiry is only a
hypothesis; do not manufacture a runtime diagnosis or weaken the assertion.
Three failed full runs plus isolation exhaust the bounded honest attempts.

FRESH pre-interruption task gates retained: focused mobile 81/12 files and
web 74/9; full mobile 1,661/174; forced root typecheck/lint 8/8 each, 0 cached,
0 errors/six existing warnings. No cached predecessor results substituted.
Queued shared/API full suites and required standalone API/Android JS-assets/web
and serial forced root builds NOT RUN because the runner stops on web exit 1.
Final git diff --check and git diff --cached --check PASS; index remains empty.
No build-generated declaration changed. Full verification stays FAILED; final
documentation commit stays pending. Current-state/roadmap/sprint now hold
dependents at this failure while preserving all historical text.

Commits: `ee3bfb8d docs(ux): freeze PBR-UX1 audit acceptance` (author
galaxymaxp <omgraythekid@gmail.com>). No new commit on resume. Five task-owned
documentation paths remain uncommitted under unattended rule 5; unrelated UI/,
apps/mobile/.gitignore and supabase/.temp/ preserved. Nothing under tmp staged.

**Owner steps remaining**:

- Separately resolve the full-web tap-wave gate; distinguish test-order/browser
  timing from a runtime defect, retain all original failure/isolated-pass logs.
  Resume PBR-UX1 only to finish missing local gates/docs/scoped commits after
  that blocker is resolved. FAILED holds dependents; no speculative successor.
- Rollout and Device checks NOT RUN, skipped entirely. Deployed revisions,
  database rows/applied migrations/Scheduler/provider state, authenticated
  browser, native OS fontScale/external keyboard/TalkBack/VoiceOver/focus/targets
  and physical reduced motion remain UNVERIFIED (owner to confirm). No release
  readiness or fresh production-generation claim.
- Preserve RT1/EV1 STOPPED and RT2 physical STOPPED / resume-text INCONCLUSIVE,
  deferred, without claiming a link to historical Queue failures. OX2 remains
  blocked by OX1; unrelated roadmap/Owner Pause remains. No service call, deploy,
  remote SQL/migration/env-file change/push/retry/clear/worker/Scheduler/email/
  OTA/EAS/native build/install/device/spending action was performed.
- Vercel CLI is absent; strongly recommend npm i -g vercel for separately
  authorized future env/deploy/log work. Installation NOT RUN.

## PBR-UX1b corrective audit closure — PASS (2026-10-23, LOCAL only)

Completed the finite correction from ee3bfb8d on overnight/2026-10-15_feedback.
Scoped commits: d62db151 docs(ux): freeze PBR-UX1b corrective acceptance;
80f18fad test(web): control orb gesture regression time; final documentation
commit recorded in Git/PBR-UX1b.status. Author galaxymaxp <omgraythekid@gmail.com>.
No push. [Full acceptance and exact command table](acceptance/pbr-ux1-queue-actions-audit.md).

Bounded local browser traces prove all five trusted down/up pairs insert one
tap impulse each. Requested 150ms gaps retained five; delayed 450ms gaps removed
two at ages 1803/1806ms and retained three. Earlier full failures did not record
timing, so no exact historical schedule or production defect is invented.
Only the browser regression changes: install Playwright clock before app load,
pause after renderer readiness, retain five real clicks/exact 150ms ages, real
450ms hold/move/release, rotating classification, positive decaying momentum,
palette and fitted viewport bounds. Shared exact 1799/1800ms expiry tests remain.
Fake time establishes logic with real pointers, not physical performance.

FRESH gates: full web 578/76 files, shared 716/74, API 2,455/214 — 3,749 passed /
0 failed / 3 existing live skips. Focused orb/browser 124/15 files, shared orb
21/1 PASS. Forced root typecheck/lint/serial build each 8/8, 0 cached; standalone
API/web and offline Android JS/assets exports PASS. Six existing lint warnings.
Retained original UX1 mobile 1,661/174 and focused mobile 81/web 74 are explicitly
not fresh corrective executions. Action 57/57, guard 3/3, custody 2320/2320,
original evidence preservation 75/75, both diff checks PASS. Original 96
adapted scenarios, all source/action/permission inventory, doubled-text Queue
Completed-header clipping, Library title/footnote overlap and bounded proposal
remain intact. Physical/native/accessibility conclusions remain UNVERIFIED.

Preserved original FAILED status, three full-web 577/1 failures, isolated 1/12
filtered diagnostic and interrupted log. First corrective diagnostic failed
only fixture import from wrong working directory: 1 failed suite, 13 skipped;
workspace-corrected traces 1 passed/12 filtered each. No corrected application
gate failure, new skip or assertion weakening. Original indexed evidence is
byte-identical (commands append only); test before-image matches baseline.
Original unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ untouched;
only task-owned paths committed; no tmp staged. Planning is reconciled.
The first declaration-restoration shell command also failed with a quoting
SyntaxError before any write; declaration-attempt1.log preserves it. A checked
local script then verified generated contents/before-image hashes and restored
both declarations; the final forced typecheck ran afterward. Extra earlier
typecheck executions remain logged and are not substituted for that final gate.

Corrective PASS supersedes original UX1 failure for UX2 eligibility only.
Supervisor retains successor admission/approval; no UX2 code or orchestration
runner/queue/controller/manifest modification. All LR1 prerequisites preserved.

**Owner steps remaining**:

- Rollout and Device checks NOT RUN, skipped entirely. Deployed revisions,
  database rows/applied migrations/Scheduler/provider state, authenticated
  browser, native OS fontScale/external keyboard/TalkBack/VoiceOver/focus/targets/
  reduced motion and physical performance UNVERIFIED (owner to confirm).
- Preserve RT1/EV1 STOPPED and RT2 physical STOPPED / resume-text INCONCLUSIVE,
  deferred separately. OX2 remains blocked by OX1; unrelated Owner Pause intact.
  Supervisor handles any separately approved successor after this genuine PASS.
- No service call, deploy, remote SQL/migration/env-file change/push/retry/clear/
  worker/Scheduler/email/OTA/EAS/native build/install/device/spending action.
- Vercel CLI is absent; strongly recommend npm i -g vercel for separately
  authorized future env/deploy/log work. Installation NOT RUN.


## PBR-UX2 Queue/course interactions - PASS (2026-10-23, LOCAL only)

Owner unattended prompt admits this finite successor after committed UX1b PASS.
Initial e0b63bc6 on overnight/2026-10-15_feedback (38 ahead/23 behind local
upstream snapshot; no fetch). All seven dependency PASS statuses/named commit
ancestries verified. Original UX1 FAILED and RT1/EV1/RT2 holds preserved.
[Acceptance, full action contract, attempts and exact command table](acceptance/pbr-ux2-queue-actions-fix.md).

Queue headers reflow without concealing failed text or changing retry/clear/
history behavior. Audited navigation chevrons give way to bounded hover/focus/
press feedback outside swipe clipping, static reduced-motion styling and stable
reserved space. Native tile dimensions/grid stay intact. Independent native
sheets expose the exact Generate factories and Library Pin/Unpin; web reuses
Move-only options and Library Pin/Unpin. Full labels/selected pin state, keyboard
entry/dismiss/return, 48/44 targets and owner/route closure are verified locally.
No detail/global action relocation or backend/data/generation/dependency change.

FRESH full mobile 1,665/176, web 580/76, shared 716/74, API 2,455/214:
**5,416 passed / 0 failed / 3 existing API live skips**. Focused mobile 181/15,
web 76/9 PASS. Forced typecheck/lint/serial root build 8/8 each, 0 cached;
standalone API/web and offline Android JS/assets export PASS. Six existing lint
warnings. Final typecheck follows exact Next-declaration restoration. Both diff
checks PASS at scoped code/docs staging boundaries. Action 57/57, guard 3/3;
96 responsive +96 motion/text scenarios, menu/short/scaled flows 12/12 PASS,
0 outbound page requests/runtime errors. Native/authenticated results unverified.

Preserved failures: new theme-mock 83/1; lint 7/8 with one test error; typecheck
7/8 from a narrow test helper; initial full mobile 1,653/12 from missing screen
adapters/cascades; full web 579/1 hide-on-scroll initial measurement; later mobile
1,664/1 GenerationLayout core measurement. Adapters/types corrected, assertions
retained, unrelated flakes resolved by unchanged full serial reruns (exact cause
unproven). Original browser/custody/coordinate/live-style collector attempts
remain indexed; corrected probes snapshot text metrics before writes and assert
full menu clip bounds. No production workaround or test weakening.

Commits, author galaxymaxp <omgraythekid@gmail.com>:

- d9b5a6f0 docs(ux): freeze PBR-UX2 queue and course acceptance
- 973f3c7f fix(ux): repair queue layout and course action interactions
- Final documentation commit follows this footer; exact identity in Git and
  PBR-UX2.status without self-amending. No push; no tmp staged.

Current-state/roadmap/sprint reconciled. Source/callback/owner-input and complete
historical-text custody checks pass; original unrelated UI/, apps/mobile/.gitignore
and supabase/.temp/ preserved. Ignored evidence under tmp/overnight/PBR-UX2/
contains exact commands/source hashes, original attempts, outputs and SHA256 index.
Final source/index custody counts are appended at closure. Finite UX2 endpoint
reached; no next initiative admitted. OX2 blocked by OX1; Owner Pause unchanged.

**Owner steps remaining**:

- Rollout and Device checks NOT RUN, skipped entirely. Deployed revisions,
  database rows/applied migrations/Scheduler/provider state, authenticated browser,
  native fontScale/assistive technology/external-keyboard focus/targets/reduced
  motion and physical performance UNVERIFIED (owner to confirm).
- Preserve RT1/EV1 STOPPED and RT2 physical STOPPED / resume-text INCONCLUSIVE,
  deferred separately. Existing compact Library title/footnote limitation remains
  outside this task; no native rendering or release-readiness conclusion.
- No push/deploy/service/provider call/remote SQL/migration/env-file change,
  real retry/clear, worker/Scheduler/email/OTA/EAS/native build/install/device/
  account or spending action. Separately authorize any successor or rollout.
- Vercel CLI remains absent; strongly recommend npm i -g vercel for separately
  authorized future env/deploy/log work. Installation NOT RUN.

Final FRESH custody/documentation verification: **2,124/2,124 passed, 0 failed**.
Exact original UX1 FAILED bytes, seven prerequisite status hashes, 23 unrelated
owner artifacts and full historical planning/handoff text are preserved.
Only 16 code/test paths and five documentation paths belong to this task.
Both diff checks pass at the final scoped code/docs staging boundaries; no tmp
or generated declarations/artifacts/owner inputs staged. Final commit identity
and terminal status remain in PBR-UX2.status; original attempts and local output
hashes remain in the ignored SHA256 index. No physical/production result inferred.


## WEB-A1 website roadmap/design audit - STOPPED (2026-10-24)

STEP 0 source preflight stopped before the website audit. The prompt explicitly
requires C:\Users\Fely Max Dilinila\Claude\Projects\Stay Focused on
overnight/2026-10-15_feedback, but that root has no .git/package.json/apps/web;
four Git source/branch/HEAD/status checks fail as not a Git repository. Current
workspace is the requested branch at 84584288, with PBR-UX2.status PASS and
3/3 named commits verified ancestors; its committed acceptance/handoff exists.
It is not silently substituted for the specified source. UNATTENDED rule 4
requires STOP on this source surprise.
[Acceptance, source evidence, frozen matrix and exact commands](acceptance/web-a1-website-roadmap-design-audit.md).

Exact owner question: Should WEB-A1 audit C:\Users\Fely Max Dilinila\Documents\Projects\b25-3-3-work at 84584288d28d2f933e4c8cab84eb2a8dc4bd95e8 on overnight/2026-10-15_feedback, or which Git checkout/HEAD under the specified Claude project directory is authoritative?

Gate counts: **0 fresh application tests / 0 builds run**. Required fresh forced
typecheck/lint, API/web/root builds, Android JS/assets export, focused/full web
suites and responsive/accessibility/reduced-motion checks: NOT RUN after STEP 0
STOP. **FRESH git diff --check and git diff --cached --check: 2/2 PASS** at
scoped documentation staging. Prior PBR-UX2 results remain historical, not fresh
WEB-A1 evidence. Optional python metadata probe failed before writes because
Python is unavailable; Node replacement succeeded. No test flake or cached gate
claimed. Original broad output truncation was resolved by bounded inventory.

Commit: docs(web): record WEB-A1 source preflight stop, containing this footer,
acceptance report and three planning prefixes; exact hash follows in Git and
tmp/overnight/WEB-A1.status without self-amending. Author galaxymaxp
<omgraythekid@gmail.com>; no push and no tmp staged. Source/tests/dependencies,
all historical planning/handoff text, prior statuses and unrelated UI/,
apps/mobile/.gitignore and supabase/.temp/ retained.

**Owner steps remaining**:

- Resolve the exact source question, then explicitly resume STEP 0 and verify
  every prerequisite/approved design before audit or application gates. WEB-A1
  remains STOPPED and holds dependent work. No product-gap verdict is inferred.
- Rollout and Device checks: NOT RUN, skipped entirely. Live deployed revisions,
  database/applied migrations/Scheduler/provider state, authenticated/physical
  behavior and release acceptance UNVERIFIED (owner to confirm).
- No service calls, deploy, migration/remote SQL, environment-file change,
  Scheduler/email/OTA/EAS/native build/install/device/spending action or push.
  Preserve RT1/EV1 STOPPED, RT2 physical STOPPED / resume-text INCONCLUSIVE,
  historical UX1 FAILED, OX2/OX1 and unrelated owner holds.
- Vercel CLI remains absent; strongly recommend npm i -g vercel for separately
  authorized future env/deploy/log work. Installation NOT RUN.

FRESH preservation checks: **182/182 PASS, 0 failed**; 147 prior statuses,
23 unrelated owner files and byte-exact prior planning/handoff content retained.
Git LF-to-CRLF working-copy warnings are recorded; diff gates have no errors.


## UX3 card feedback - LOCAL PASS (2026-10-24)

Implementation 6ee3d7c0, acceptance freeze c5584807. Existing course-arrow removal
is preserved; own-source entry arrows are removed, and web/mobile feedback now
animates within three points per edge, with keyboard/touch cancellation and
static reduced-motion feedback. Routes, titles/counts/order and independent
pin/options action inventory remain. No API/data/provider/dependency change.
[Acceptance, exact gates, failed attempts and limits](acceptance/ux3-card-hover.md).

FRESH full suites **5,419 passed / 0 failed / 3 existing live skips**: mobile
1,665/176 files, web 583/77, shared 716/74, API 2,455/214. Focused mobile 181/15,
web 79/10. Forced typecheck/lint/serial root build each 8/8, 0 cached; standalone
API/web and offline Android JS/assets export PASS; six existing lint warnings.
144 responsive/theme/text/motion cases, four hover/return traces, 12 touch flows,
four menu and six keyboard navigation flows PASS; action inventory 57/57,
guard 3/3 and both diff checks PASS. Earlier orb timeout and corrected collectors
are retained; complete final serial web rerun passes without orb changes.

**Owner steps remaining:** Rollout/Device checks NOT RUN, skipped entirely.
Served revision/authenticated/physical/native acceptance and production state
UNVERIFIED (owner to confirm). No push/deploy/services/SQL/env-file/native/device
work. Preserve WEB-A1 STOP/dependents and all historical holds/owner files.
UX3 endpoint complete; TC2 then TP1 remain saved successors, with no queue or
controller change. Scoped local identities follow in Git/UX3.status.



Commits: c5584807 freeze; 6ee3d7c0 implementation; documentation subject
"docs(ux): close UX3 local card feedback verification" (final hash in Git and
UX3.status). Author galaxymaxp <omgraythekid@gmail.com>. No tmp staged.
Final code/test hashes are unchanged from final-source.json. Exact commands,
first failures/reruns, fresh/cache labels and synthetic boundaries are in the
acceptance report. Initial full web 580/1 orb timeout is retained; final 583/77
passes. Workflow/provider/live acceptance NOT APPLICABLE / NOT RUN for this UI
slice. Owner steps remaining and all UNVERIFIED limits above are mandatory.
Vercel CLI absent; strongly recommend npm i -g vercel for separately authorized
future env/deploy/log tooling. Installation NOT RUN.

FRESH final custody: **2,135/2,135 PASS**, zero failures; eight prerequisite
statuses, original UX1 FAILED, 23 owner artifacts and full prior planning/handoff
text retained. Code index matched all 11 tested files with CRLF/LF normalization
only. LF-to-CRLF Git warnings are recorded; both diff checks have no errors.


## FS8 direct readiness repair: acceptance complete (2026-10-24)

All four original blockers now have completed supersession evidence prepared.
PBR-UX1 uses unchanged UX1b repair/acceptance and eleven pinned historical gates.
WEB-A1 uses the confirmed runner checkout, completed source/roadmap gap audit,
one bounded contrast correction and fresh verification. RT1/EV1's asserted
captured-text failure is disproved by the original PNG bytes: four regions are
identical and visibly populated in both archived frames. Their old reports and
terminal records are preserved; this corrects evidence, not a claimed native fix.

Fresh web 583/77 files, verifier 5/5, forced typecheck/lint/build 8/8 each with
0 cached; API/web builds and offline Android export PASS. Responsive fixture
144 cases, menus 4, keyboard 6, action checks 57 and contrast 14/14 PASS. Nine
phone cycles fully sampled, one interrupted; owner reported text stays visible.
No candidate/live/full-OTA acceptance or ten-of-ten phone PASS claim.

[Repair and readiness receipt](acceptance/fs8-readiness-repair.md),
[website audit](acceptance/web-a1b-website-audit.md),
[original-pixel correction](acceptance/fs8-resume-evidence-correction.md).
Final unchanged mandatory validator runs after committed evidence publication.
No FULLSEND, push, deployment, migration, APK install or old-status rewrite.

## Mandatory readiness receipt (2026-10-24)

**FRESH PASS: exit 0, ready=true, blockers=[]** at committed acceptance
05017922c21f1cad2b83ca571b611b7ac54fab96. Fourteen scoped items: ten PASS and four
VERIFIED_SUPERSESSION (PBR-RT1, PBR-EV1, PBR-UX1, WEB-A1). The existing
readiness.js implementation is unchanged. The manifest pins implementation,
completion/acceptance commits, original terminal records, passing logs and raw
evidence digests. Historical statuses are not overwritten or silently ignored.

The final documentation receipt is committed separately and the literal
mandatory CLI is rerun on that final HEAD; its complete JSON is
`tmp/overnight/FS8-REPAIR/readiness-final.json`. Ordinary release gates and
post-rollout physical checks remain required. This work performs no release.

Final diff hygiene: both working-tree and staged checks PASS after correction.
The first closure check found one added blank line at the handoff EOF; the
PowerShell command sequence continued to a documentation commit. That whitespace
was corrected in this receipt, then both checks were rerun and recorded as
separate passing gates. The initial failure is retained here rather than
counted as a pass. Unrelated owner files and original acceptance/status records
remain preserved. No application tests/builds are repeated for this receipt.
