# Current Sprint

## Study Reviewer and Quiz polish (2026-10-10)

Implemented locally on `claude/slack-session-m1o1ea` from main `d9490fb` in an
isolated clone, preserving the original dirty workspace. Web Check no longer
races eager draft saves and shows loading. Web/mobile identification feedback
is verdict-only until final review; accepted labels and mobile review-by-ID are
fixed. Optional suggested Quiz titles, concept/key-point Ask, visible accessible
loader motion, fading assist highlights, mobile Previous/Next and twelve-hour
time are implemented. A forward migration aligns two-pair matching save and
completion scoring while preserving owner isolation and service-only grants.

FRESH: API 1264 passed / 3 skipped, mobile 791, web 68, shared 52; root typecheck
and lint 8/8 with no cache; comprehensive fictional localhost browser acceptance
passed. Root build passed 8/8 (API/web/mobile FRESH; 5 package tasks CACHED). BLOCKED: workflow
suite has no test files in this main revision. NOT RUN: physical native mobile
end-to-end flow, live migration/provider/deployment. Next: apply the forward
migration with rollout and finish physical mobile acceptance. No remote push or
production change in this slice. See [acceptance evidence](acceptance/study-reviewer-quiz-polish-20261010.md).

## Website completion and main integration (2026-10-08)

Owner-authorized finite scope: finish Claude's pending web changes, verify the
website, publish it, and push to main. Existing API/mobile/database architecture
and unrelated working-tree changes are preserved.

PUBLISHED AND INTEGRATED INTO MAIN. Course Library, reviewer management and
selection tools, account menu, content identity and Schedule deadlines are
complete. Canvas refresh is explicit, bounded, owner-cancelled and honest about
partial admission or unknown polling outcomes. Fresh web tests 66/66, reviewer
route regression 9/9, web typecheck/lint and root typecheck/lint/build 8/8 pass.
Production deployment ca524a4 is READY. Live signed-in read, rename with reload,
delete confirmation Cancel, and desktop/mobile layout checks passed. The normal
main push was verified remotely; no force push. No paid generation or live
Canvas sync was submitted. See
[completion evidence](acceptance/website-completion-20261008.md).

## Website production deployment (2026-10-08)

Owner-authorized: the V2 website replaces retired V1 on
`https://stay-focused-ten.vercel.app` (Vercel project `stay-focused`). The
project now builds `galaxymaxp/stay-focused-v2` from `apps/web`, and pushes to
`website/functional-v1` deploy production automatically. It uses the shared V2
Supabase project and the existing API (`stay-focused-v2-prototype`) through the
same-origin rewrite. Owner enabled web generation and Google/Microsoft sign-in;
V1 server secrets were removed from the project.

Shipped with it: V1-style desktop shell (sidebar, breadcrumbs, full-width
layout), Today with a right rail, side-by-side course materials, and motion
mirroring the mobile tokens. FRESH: web typecheck/lint/tests, both isolated
browser runs, production build, and live checks (API proxy 200/401, anon key
for the V2 project). NOT RUN: authenticated live use by the owner, live
generation and OAuth round trips. Preview deployments have no Supabase key
(`NEXT_SUPABASE_ANON_KEY` is production-only), and `main` now includes `apps/web`; preview authentication remains unconfigured.

## Website V1.1 orb parity (2026-10-08)

Owner-authorized scope: port the authoritative mobile WebGL orb, verify visual
and behavioral parity, preserve the functional website and commit scoped work
on `website/functional-v1`. Investigation at `6a8032a` found that the actual
mobile Generation route uses Animated plus layered SVG, with no WebGL renderer
or shaders in the inspected local sources. **BLOCKED** pending the actual
WebGL source location or owner resolution of that rendering requirement. No
replacement orb or runtime change was made. See [orb parity report](acceptance/website-orb-parity.md)
for source mapping, baseline verification and remaining differences. Existing
V1 historical findings remain below; B25.3.3 stays paused and incomplete. No
production deployment, provider call, schema or generation-engine change.

## Website V1 owner-approved scope (2026-10-08)

The owner prioritizes functional website implementation immediately. B25.3.3
production compatibility investigation is paused; its PARTIAL/BLOCKED verdict,
reports, repairs, and blockers remain preserved and it is not complete. This
instruction supersedes earlier web exclusions for the finite website scope only.

Endpoint: implement and locally verify the nine requested browser surfaces in
`apps/web` over existing Supabase identity and shared API/workflows, record exact
blockers, and commit scoped changes on `website/functional-v1`. No production
deployments, migrations/data writes, PR #1 edits, or paid generation requests.
See `docs/ai/acceptance/website-v1.md` and ADR-019 for the acceptance matrix.

Task order: W1 auth/shell/Today; W2 tasks/calendar; W3 Canvas/generation/queue;
W4 Library/Reviewer/Quiz/settings; W5 browser, regression and root verification.
Continue independent work when live acceptance is blocked. Current result:
LOCALLY VERIFIED; W1-W4 functional client implementations and W5 browser,
visual, regression and fresh root TypeScript/lint/build checks pass. Live
acceptance remains PARTIAL/BLOCKED: dedicated non-production Supabase/API and
Canvas test access, plus a separate paid-generation allowance, are not established.
Generation is disabled by default. Run instructions are in `apps/web/README.md`.
Historical sections below are retained.

## Urgent Canvas notification system (2026-10-03)

**PARTIAL: implemented locally; activation pending.** Protected metadata polling, database event deduplication and due revisions, durable Resend delivery, submission/completion suppression, and persistent per-type Settings controls are complete. Forward migration `20261003025905` has local Postgres/RLS verification. Production lacks `CRON_SECRET`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL`; sender verification, rollout, developer-only live/physical acceptance, workload measurement, and enabling one Google Cloud Scheduler job remain. No production migration, deployment, Scheduler job, or real email was performed. [Architecture/runbook](../architecture/canvas-email-notifications.md).

## Quick Canvas token tutorial (2026-10-01)

**PARTIAL physical acceptance.** The unchanged local image, one-time popup, manual reopen action, and scrollable full-screen viewer are on Android preview OTA `01a0f7d2-ca43-760b-9723-4a4ddf1f1a40`. The realme passed the popup, readability, scrolling, close/reopen, and edited-domain preservation checks; connected courses still loaded. A fresh Canvas token was not entered, so successful reconnection and real-token log absence remain unverified. FRESH: mobile typecheck and two focused sync test files (16 tests) pass; mobile lint has zero errors and four existing warnings in unrelated service tests.

## B41 native Office DOCX/PPTX opening (2026-10-01)

**PASS.** The realme had no app able to open DOCX or PPTX; with the owner's approval, Google Docs and Slides were installed. The opening test exposed a defect: exported Drafts lost every line break (DOCX breaks were written outside runs, and PPTX chunking flattened lines). Fixed in `28b81af`/`74ae2ab` with regression tests, and shipped as preview OTA `9129850a-bd65-4588-b80b-53cd53d82745` (runtime 2.0.1). The re-exported DOCX and PPTX open directly from My Files in Google Docs and Slides (18/18 slides), with lines preserved. No new jobs or artifacts. FRESH: mobile 782, typecheck and lint pass. Microsoft Word/PowerPoint not tested. [B41 acceptance](acceptance/b41/native-office-docx-pptx-opening.md).

## B40 Reviewer Smart Selection learning tools (2026-10-01)

**PASS.** Tapping a Reviewer topic opens the existing Study Assist sheet. The full concept is now selectable there with Android's own handles and Copy/Select All, and the sheet captures the exact range. Define, Explain, Example, Test Me and Ask then run on that selection in the same sheet, with lazy refinements (Plain words, In context, Key traits, Compare; Simpler, Deeper, Analogy, Why it matters; Real world, Step-by-step, Another, Counterexample; Test Me checking, Harder, Apply it, Explain answer, Need choices?).

One owner-scoped `POST /api/experience/study-tools` route reuses the Study Assist ownership and source-provenance path. It verifies that the selection belongs to the owner's block, sends only bounded context (the block, nearby section content and cited source excerpts), and enforces selection, question, answer, follow-up (2) and output limits on the server. Define/Explain/Example/Ask fall back to general knowledge automatically, with a tappable From your material / Source + general knowledge / General knowledge badge. Test Me is source-only. The canonical Reviewer is never modified.

Physical acceptance passed on the RMX3151 against a local API and a coinstalled local debug build: all actions and refinements, grounding states, offline message, Reduce Motion, search and the scrubber, and zero new Canvas, processing or artifact rows. FRESH: API 1,198 tests, mobile 778, shared 50; typecheck and lint 7/7. **Production-deployed:** API `dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR` and preview OTA `ded5f2a6-19a4-4934-99ea-23610409a642` (runtime 2.0.1), both smoke-tested on the preview app. The sheet now opens on whole-topic quick assists, and selecting text swaps in the five actions. [B40 acceptance](acceptance/b40/reviewer-smart-selection-learning-tools.md). Next: B41 native Office DOCX/PPTX opening acceptance.

## B39.2 physical Canvas and Android acceptance (2026-10-01)

**PASS — closes B39.** Recorded in [B39.2 acceptance](acceptance/b39.2/physical-canvas-android-acceptance.md); the B39.1 BLOCKED entry below is historical.

## B39.1 deployment + physical Canvas sync and Task attachment acceptance (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Production API `dpl_74hWVM2kSvg21hfnRLcVu885ohFe` is READY and healthy. Offline Task attachment metadata is now persisted in the existing local SQLite store. Native preview APK `de93f504-cb53-4388-b48a-47103d65eb3a` from commit `80cd1b0` is installed on the RMX3151 and includes Expo Sharing. No Android UI control surface is exposed, so live Canvas authentication/sync and the physical task/Generate/Library/Announcement/Reviewer/passive-sync checks remain unverified. Do not close B39 or begin B40. Next: restore supported CUA Android control for the authorized device and resume these gates. [B39.1 record](acceptance/b39.1/deploy-physical-canvas-sync.md).

## B39 student workflow and Canvas Task attachments (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Local Task attachment metadata/opening and Generate attachment-routing fixes are implemented; root typecheck, scoped API/Mobile tests, Canvas client tests, and lint pass. Current Canvas credentials were not inspected, fresh manual sync was not triggered, and the attached RMX3151 did not expose a controllable UI. No deployment or app data mutation occurred. Expo Sharing requires a native preview build before the physical attachment-open gate. Complete the current Canvas-auth/sync, idempotency, attachment-open, and passive-navigation checks on that build. [B39 record](acceptance/b39/student-workflow-canvas-tasks.md).

## B37 production generation regression (2026-10-01)

**BLOCKED after B37.2.** B37.1's Introduction PDF and durable recovery remain PASS. B37.2 established that Page-linked Canvas file `11574237` is directly downloadable despite `hidden` and `hidden_for_user`; scoped repair `54aa9fd` is live in API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` and preview OTA `01a0f4ef-496a-7c4c-a6e7-52617f4268bd`. The realme's fresh Unit 3 request prepared the full PDF but hit a separate database staging contract: `stage_deferred_canvas_reviewer_pdf_v1` accepts one file ID, while Page plus attachment supplies two IDs. API returned 503; job row `dde023f1-65ef-415b-b888-5550bc845494` is queued without dispatch, attempt or result. No further repair or 40-page retest was made after this failure. [Evidence](acceptance/b37/production-generation-regression-20261001.md).

## B39 preview API configuration (2026-09-30)

**PASS — preview API configuration is explicit and future EAS updates are guarded.** The mobile API clients validate a canonical API address before requests and render configuration-specific errors while retaining the existing session, Canvas connection, and local data. The EAS preview environment contains the public API address; the normal preview OTA command checks it against the build profile and publishes with `--environment preview`. Final Android update `01a0f2ae-79d7-732a-9ba4-c492f2af3545` passed on the realme. Generate, Tasks, Library, Today, CIT17 PDFs, Canvas connection, and force-stop/relaunch remained intact; Canvas jobs stayed at 468 with zero active. [Acceptance](acceptance/b39/preview-api-configuration.md).

## B38 Canvas sync admission (2026-09-29)

**PASS — Google Canvas sync is stable, idempotent, and physically accepted.** After explicit user authorization, Vercel production deployment `dpl_7CiWZrgZAf9ersa5bFsegVfnMbnn` is READY, private Cloud Run revision `generation-worker-00014-qxb` serves 100%, and corrected Android preview OTA `01a0ef99-599e-7e9f-88dc-509cae198f4b` loads authenticated Canvas courses. Launch, repeated Generate/Tasks/Library/Today navigation, and post-sync force-stop/relaunch created zero automatic jobs. Manual CC6, CIT17, and SOC SCI 103N syncs each created exactly one content and one grades job; all six reached terminal success with one worker attempt. SOC SCI content had the expected partial Canvas Files/Pages access result. CIT17 instructional PDFs, empty-Page exclusion, submitted Tasks, announcements open/close and Canvas handoff, persisted session/data, and stable row counts passed on the realme. The first OTA omitted the API address and misleadingly showed “Please sign in again”; the corrected OTA fixed connectivity without signing out. A follow-up should make missing API configuration explicit and include the URL in the EAS update environment. [Evidence](acceptance/b38/canvas-sync-admission.md).

**Repair deployed and verified.** B37 architecture is committed at `46e66a8`. The extra-batch paths were sign-in/foreground staleness and Today focus, with Generate/Tasks refresh also able to call account-wide `sync()`. Passive paths now restore persisted data and poll already accepted jobs; only explicit Sync actions start new work. Database unique active-job admission remains authoritative and the API reuses its winner on concurrent requests. The failed CC6 repeat content job had one claim and zero units; a contemporaneous production token-route 504 supports a pre-unit handoff timeout, now addressed with one bounded retry and a 35-second request deadline. An empty CIT17 Page is excluded by body eligibility. Physical acceptance passed on the corrected preview OTA.

## B37 Canvas sync Google worker cutover (2026-09-29)

**PARTIAL.** Production Canvas jobs enqueue to the existing Google Tasks queue and run on private Cloud Run. After correcting legacy finalization token decrypts, fresh realme CC6, CIT17 and SOC SCI 103N content/grade jobs all reached terminal success; content was partial for inaccessible Canvas resources, with no Workflow run IDs. Generate showed CIT17 PDFs, Tasks showed submitted assignments, and relaunch retained the signed-in session and canonical row counts. Opening Generate and relaunching started extra 7-course sync batches; one repeat CC6 content delivery failed before units. An empty CIT17 administrative Page appeared as a learning source. Full physical acceptance and the architecture commit remain open. The older P0 note below is historical.

## Canvas sync P0 (2026-09-29)

Production Workflow queue deliveries fail with `ThrottleError: Workflow usage limit exceeded`; CC6, CIT17 and SOC SCI 103N jobs were accepted but never claimed. The existing Canvas credential works for live course inventory. Applied forward expiry migration `20260929060000`; the original six jobs now expire to a safe terminal state. Mobile now reconciles terminal jobs on foreground, polls beyond 15 minutes, persists a restart cooldown, and shows a retryable failure. Android preview OTA `bbf3c411-38b7-4c26-880b-61a6f9206514` is published but realme activation is unconfirmed. Do not trigger more automatic sync attempts while capacity is exhausted. Next: restore Workflow capacity or move Canvas execution to the Google worker, then retest all three courses and finish physical acceptance. Scoped code remains uncommitted until that acceptance passes.

## B39 EAS preview distribution (2026-09-29)

**PASS after authorized native preview-build fallback.** Preview OTA group `cdc3f3a6-5ecb-46b5-96cb-ea1404c007bb` delivered B38/header cleanup at `b88a507`, runtime `2.0.0`. Old APK lacked native provider-auth crypto; owner-authorized preview APK `21be5ea3-f224-4be4-a707-643c7957dd15` at `2c66889`, Android runtime `2.0.1`, is built and installed. FRESH realme Google sign-in, Draft-first flow/headers, Library, Reviewer navigation, Quiz progress, offline Draft force-stop/reopen and stable Draft cards/count pass without Metro. FRESH focused mobile 147/auth 29 tests, typecheck/lint (four existing warnings), diff check, export and APK build/inspection pass. Debug app restored, connectivity restored; preview channel unchanged; future Android updates target `2.0.1`. No backend rollout, production channel change or push. Next: separate native Office DOCX/PPTX-opening acceptance. [Acceptance](acceptance/b39/eas-preview-b38-distribution.md).

## Artifact header simplification (2026-09-29)

Removed repeated course/source banners and generated-date lines from saved Draft/Quiz previews, and repeated course/source context from the Reviewer header. Draft uses one multiline editable title and a header Export action; Quiz preview titles are compact. Topic navigation, question progress, Draft save status, actions and course organization remain. FRESH verification: 67 focused mobile tests, mobile typecheck, changed-screen lint and git diff check pass. Existing Draft, Quiz preview and Reviewer opened on realme with the cleaned headers; no generation or account data changed. Local debug JS only, no deployment or push.

## B38 draft-first assignment UX (2026-09-29)

**PASS.** Completed the user-requested B38 Draft-first assignment UX. Draft is the immediate saved/editable assignment result; no Study Activity worksheet/status; Library categories are All / Reviewers / Quizzes / Drafts. Saved-Draft export and immediate confirmed-revision display are covered. Backend Activity infrastructure, B37 cross-course resolution, Tasks model and offline copies remain. Fresh physical Firewall/VPN and Dice Roller generation/opening, one result each, and Firewall/VPN offline force-stop/reopen pass. Fresh mobile 733/API 1,076 tests, focused mobile 103/Activity-worker 70, Workflow, typechecks/lint/diff check pass with four existing mobile lint warnings. Next: preview-channel mobile distribution, not started. No API/worker rollout, migration, EAS build/update or push. [Acceptance](acceptance/b38/draft-first-assignment-ux.md).

## B37.1 firewall/VPN Activity generation (2026-09-29)

**Specific bug PASS; remain on B37.1.** The failed physical job had zero provider calls: a page URL scoped to another Canvas course was incorrectly treated as required local material. Narrow course-aware preparation is deployed to private worker `generation-worker-00011-n2s`; the same assignment now produces one 12-slide presentation draft, completes Queue, lists in Library and reopens after force-stop. Fresh Dice Roller also passes. API 1,076/mobile 726 tests, focused Activity/Google worker 72 tests, typechecks and lint pass (four existing mobile warnings). Safe API error mapping is tested locally; production deployment awaits explicit authorization after automatic approval review rejected it. Separate B37.1/Matching/native Office gates remain. No EAS build, B38 work or push. [Evidence](acceptance/b37/activity-firewall-vpn-generation.md).

## B37.1 pre-APK study experience polish (2026-09-28)

**PARTIAL; remain on B37.1.** Authorized Vercel API/private Google worker rollout is complete (`dpl_6UepXtqEVSPwnZMRYejoN5rMy38x`, `generation-worker-00010-g9v`). Commits `3ed1428` and `8251652` provide minimal integrated spatial arrows/slider and unrestricted unanswered navigation. Fresh mobile tests 726/726 and earlier API 1071 passed/three existing skips; mobile typecheck and lint pass (four existing warnings). Realme adb navigation/synthetic drift and vertical handoff, reveal-before/after, offline force-stop, production replay, completion/score and retake/history pass. After an initial real-finger failure, the user reports about 20 connected thumb drags without cancellation on the corrected slider. The user physically retested and accepted the follow-up instant-on-release navigation; automated vertical handoff passed. Fresh Reviewer emphasis/grounding/three-page PDF pass. Fresh Matching's public projection drops visible pairs; tested forward migration `1025208` awaits explicit Supabase approval, then fresh pairing/partial scoring acceptance. Remaining Activity task/native Office acceptance is pending. Earlier Activity persistence/exports remain valid. Export scope remains **generated Library Activities: PDF/DOCX/PPTX; Reviewers: PDF only**. No EAS build or origin push. [B37.1 evidence](acceptance/b37/pre-apk-study-experience-polish.md).

The next milestone, **after B37.1 passes**, is B38: move durable Canvas sync execution from Vercel Workflow to the existing Google worker, with Vercel retaining the authenticated API and Supabase retaining owner-scoped job/data state. Production Canvas lifecycle acceptance follows B38, then one new EAS preview APK and final physical acceptance. B38 is a recorded decision, not implemented. B37 remains PARTIAL.

## B37.2 non-Canvas acceptance and build gate (2026-09-28)

**PARTIAL.** Text, Camera and Local File pass on realme after two fixes. The API (`dpl_Ehds5J5evWG1zwj7JT68CZaYZRnR`) now claims unedited Camera/PDF text as a new revision, because `source_versions` is immutable and the old path returned 503. The mobile source panel now shows extraction failures and applies reused extractions. The 100-item Firewalls Quiz produced 100 unique, sourced items in 10 bounded calls, and the 30- and 100-item Quizzes reopen physically. The recovery email reached the owner via the Resend test sender, and Google sign-out/sign-in keeps the same owner. The stale Canvas provider test mock is fixed (692/692 mobile, 1066 API). **Canvas sync is BLOCKED** by the Vercel Workflow usage limit (ThrottleError; stuck `queued` jobs return 409 until about 23:30Z). **No EAS build.** Next: once the quota clears, run a Canvas sync plus disconnect/reconnect, then build one preview APK (it needs native `expo-crypto`). [Evidence](acceptance/b37/study-experience-overhaul.md). No push; `tmp/` untouched.

## B37.2 continuation in progress (2026-09-28)

Core implementation is deployed. Email/password sign-out/sign-in and restored owner session pass; the locally upgraded realme client proves native S256 with 0 EAS builds. Manual linking is now ready (fresh 200 after the user saved the toggle), and Google/Microsoft physical acceptance is continuing. Invalid Canvas credential handling and user-entered same-account replacement preserve original owner/connection IDs and historical data fingerprints. Hostname-only Canvas input adds HTTPS. Live disconnect/reconnect and sync remain pending.

One server-originated Resend test message is delivered; replay deduplicates. No verified sender domain exists, so broad student delivery remains unproven. Fresh 30 Mixed persisted exactly 30 with two calls/no repairs. Fresh capacity-100 Firewalls stopped in batch 4 on duplicate validation after seven calls and published no Quiz. Next: provider completion, Canvas disconnect/reconnect, physical Queue/Library reopen and Text/Camera/Local File acceptance; then final B37 verdict. API `dpl_6A3CygzdmL4u3jzUd9zkKZZb8afL`, migration `20260928001117`, worker unchanged. [Evidence](acceptance/b37/study-experience-overhaul.md). Historical quota-stop sections below are superseded. `tmp/` untouched; no push.

## B37.2 opening production gate (2026-09-28)

**PARTIAL — migration/deployment/small-source rejection verified; fresh 30 Mixed blocked at the existing daily quota (25/25), so B37.2 is NOT STARTED.**

The approved B37.1a migration is recorded once in `xfdbwfqtorelmurncyql` as version `20260927230139`, name `20260928100000_canonical_non_canvas_sources`; reviewed local filename unchanged. Sources/courses/original Quiz row fingerprints match, all 15 historical Quizzes remain readable, and RLS/grants/owner-source constraints are preserved. No reset or deletion. Production API `dpl_FnAWyTzQmfNgsQLuo5rQyPKpdzbv` is READY for `0c354ac`, health 200 and signed-out Library 401. Private worker `generation-worker-00009-jzb` serves 100%; anonymous health 403. Build/digest and detailed verification are in the ledger.

VPN sections 6–10 have 26 concepts, 5 duplicate exclusions and capacity 52. Direct 100-item admission returns typed 422 with maximum 52, no job and zero provider calls. The whole VPN Reviewer still calculates capacity 100; its whole-source capacity is not claimed to pass a below-100 check. Fresh 30 Mixed returns 429 `rate_limited`, no job/provider calls: 25/25 daily jobs, zero queued/running. The next window starts **2026-09-28 08:00 Manila**. An existing Canvas `2. Firewalls.pdf` Reviewer is a candidate with 138 concepts/capacity 100. No fresh 100-item, Queue/Library completion or non-Canvas physical flow was run after the required stop. Do not bypass the quota.

Realme `PB6DWWEIHAUCMZOR` loaded current JS against production, retained the authorized owner's session, and loaded existing Library/Queue data. Tokens stayed in the app. The corrected config `stay-focused-v2/env.local` matches production; only variable names/presence are recorded. Initial inventory approval blocks were resolved for aggregate counts after explicit user approval; private content exports were not bypassed. Fresh Quiz tests: 157 passed, 2 existing skips; focused database tests: 30 passed, 2 skips (overlapping); production build and `git diff --check` pass. No EAS build, auth/Canvas credential/Resend implementation, live email or new lifecycle acceptance. Existing unrelated Supabase security-advisor warnings remain recorded for separate review.

The authenticated Supabase user UUID is the canonical owner.

Canvas credentials authorize synchronization.
They do not own Stay Focused data.

Resume the 30/100 and non-Canvas physical gate after daily admission resets, then B37.2. Study Assist latency remains approximately 20 seconds and optimization is deferred. `tmp/` untouched; no push.

[Detailed B37 rollout and acceptance ledger](acceptance/b37/study-experience-overhaul.md).


## B37.1a local checkpoint before rollout (2026-09-28)

**PARTIAL — implementation complete locally; production and physical acceptance pending.** `source_versions.id` is the canonical persisted source identity and `user_id` is the authenticated owner. Text creates an imported source; Camera and PDF reuse the normalized OCR/extraction source (or an owner-linked correction revision). Each carries source type, display name and applicable asset provenance. The Other source rising sheet offers Text, Camera and Local File, persists on Continue, and offers Reviewer or Quiz. Quiz prepares a saved Reviewer and opens the existing Quiz setup with local capacity; both use the existing worker and Library. The manual Save step is gone. Canvas snapshot checks remain for Canvas sources; non-Canvas sources use no fake Canvas IDs. Activity remains assignment based and is deferred. The realme confirmed the sheet and Text entry; PDF extraction failed to reach the configured API, and camera capture was not completed. Automatic approval review rejected the live Supabase Quiz migration because its production constraint and RPC changes lacked clear authorization. No production data was changed, EAS build used, or push made. [B37 ledger](acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 source capacity checkpoint (2026-09-28)

**PARTIAL.** Local deterministic Reviewer concept counting now limits Quiz setup, API admission, worker batching and old-job Retry. Repair rejects a self-repeating replacement after its single repair call. Focused code checks pass. The user's UI correction moved Other source near the top of Generate and into a rising Text/Camera/Local File sheet; the reloaded realme verified text entry, native camera launch and instructional PDF selection. The underlying flow remains Reviewer-only while Quiz ownership requires Canvas snapshot IDs, triggering B37.1's architecture stop condition. No production deployment, fresh Quiz, EAS build or push. Decide canonical non-Canvas provenance, then resume production acceptance. [Checkpoint](acceptance/b37/study-experience-overhaul.md).

## B37 study experience overhaul (2026-09-27)

**PARTIAL - 100-item Quiz stopped for review.** Owner-approved Quiz batching is live: two provider calls per 20-item batch (cap 10), repair of only rejected items with a distinct call identity, single formats kept across batches, exact source wording for recall answers, and retryable failed Quizzes without duplicate retries. Production 30-item Mixed (via Retry) and 30-item Multiple Choice Quizzes pass; the 100-item Mixed smoke failed at batch 3 of 5 on duplicate questions after one fresh repair (5 of 10 calls) and was stopped as instructed. Reviewer key-point results open on tap and sheets close by swiping on Android. No EAS build used (0 of 1). [B37 report](acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation runs on Google Cloud.** The fresh VPN instructional Quiz, terminal duplicate replay, production-scoped Vercel OIDC federation and rebuilt private worker passed. After the user confirmed deployment capacity, one READY Vercel production version `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL` enabled Google routing. `/api/health` returned 200; one authenticated production API Quiz from the existing VPN Reviewer completed through Cloud Tasks, Cloud Run, OpenAI and Supabase, then listed and reopened from Library. Vercel Workflow remains for rollback, and no EAS build was consumed. [B38 evidence and rollback](acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud heavy-generation foundation (2026-09-27)

**PARTIAL — Google execution proven, B38 cutover gated.** Cloud Tasks delivered fresh jobs to a private Cloud Run worker using the existing engine, Supabase persistence and Google Vision OCR. Text/scanned PDF, DOCX, PPTX and Canvas Page Reviewers plus Activity succeeded and reopened; the fresh Quiz failed existing validation. Lease retry, cancellation and safe failure passed, but terminal replay was blocked by an automatic approval-review usage limit. Vercel-to-Google dispatcher identity is not configured, and Vercel storage pressure still affects redeployment. No production routing change or EAS build. [Evidence and exact B38 actions](acceptance/b37/google-cloud-generation-foundation.md).

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Delivered in the lab: soft ribbon-edge glow, three-color palette flow, local width/twist/bend changes and depth-tested bodies. Complete keeps moving slowly; Error/Reduced Motion freeze. Fresh tests 576/576, typecheck and lint pass with four existing warnings. [Physical follow-up evidence](acceptance/b38-2-1/ribbon-glow-refinement.md) records seven screenshots and a short UI-frame sample, not direct GL FPS. Still PARTIAL for glass-artifact approval; production is unchanged.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — development lab implemented and physically inspected; visual approval withheld.** Six states/four themes use true GL geometry. Successful completion decelerates into continuous movement; failure and Reduced Motion stop. Fresh mobile tests 574/574, typecheck and lint (0 errors, four existing warnings) pass. Device screenshots and short UI-frame/memory/thermal samples are recorded, with no direct GL FPS claim. Main gap: plastic-looking ribbon intersections and weak glass/refraction, especially UC coloration. Production generation and Queue are unchanged. See [acceptance](acceptance/b38-2-1/generation-core-prototype.md). Next: material/geometry refinement and repeat realme acceptance before integration.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS — production generation quality is physically accepted.** Fresh CC16 Firewalls PDF Reviewer and five-question Quiz, CC17 Android Platform PPTX Reviewer, and CC17 Android Versions Activity Output were inspected against their real instructional/assignment sources on the realme RMX3151. All material fidelity, coverage, answer correctness, distractor quality, presentation, Queue/background, Library, and relaunch gates passed. The PPTX run first exposed a real `request_exceeds_context_budget` blocker: the response schema duplicated every long source block ID in an enum before provider execution. Commit `1d992aa` bounds the provider schema while retaining exact local source-reference validation; focused regression 30/30 and the full suite pass. READY production deployment `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` completed the 32-topic PPTX retest on `gpt-5.4-2026-03-05`; health is 200 and post-deploy logs are clean. See [B38.1 report](acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS — blocking Generate repair complete; B38 quality acceptance may begin.** The root cause was the course sync state plus error-state handling: the Generate list read raw discovered courses with an upsert timestamp shown as "Synced", and the service mapped the unselected-course gate to 503. The repair reuses `loadCanvasCourseInventory` (with a read-only stored fallback), orders current → previous → other with synced first, routes by sync state on mobile, maps the gate to `409 course_not_synced`, and uses truthful empty-state copy. Production deploy `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ` and EAS preview update `d288a6ea` are live. Physical acceptance covered the grouped list, HIST 100 → Sync with no materials request, current and previous synced courses → materials, CIT6 empty state, and offline error → retry. Failed/incomplete sync has automated coverage only, because no real course is in that state. Pre-existing eligibility quirks (a schedule PDF, "Homepage" navigation Pages, an xlsx labelled as a document) are recorded but not changed. See [B38.0 report](acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS — production and physical acceptance are complete.** Remote migration aliases were normalized only after stored-SQL/schema proof, then the canonical migration and the narrowly scoped authenticated SELECT-grant follow-up were applied. The corrected Vercel deployment is READY. On signed Android, the exact canonical Reviewer gate enabled eligible material and blocked ineligible material; Queue creation remained at zero until explicit confirmation, after which exactly one durable Quiz job/result/Quiz completed from the persisted Reviewer version. The Quiz cold-reopened offline from SQLite. Canonical Reviewer management populated, a disposable Reviewer renamed/deleted without resurrection, and a Quiz-backed Reviewer correctly returned `reviewer_has_quizzes`. All fresh gates pass. See [B37 report](acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance, including the large-PPTX `request_exceeds_context_budget` investigation.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — implementation and local verification are complete; production rollout/acceptance is unresolved.** Canonical `generated_artifacts` IDs now flow through Quiz availability, `reviewerArtifactId` DTOs, owner/type/current-version checks, durable jobs, persisted Reviewer source assembly, Quiz persistence, Library relationships, saved-Reviewer management, source status, soft deletion, and B35 local removal. Existing legacy-linked Quizzes remain readable. Deletion is denied when canonical dependent Quizzes exist. Queue mount no longer accepts billable work; explicit confirmation is single-flight and accepted intents reopen without resubmission. Fresh full gates pass: typecheck/lint 7/7, mobile 508/508, API 886 passed/3 opt-in skipped, Canvas 73/73, shared 44/44, local Postgres migration tests, DB/API build, mobile export, and lockfile dry-run. Production migration/deployment/smoke were not performed because the documented remote migration-history mismatch remains unresolved and no safe Supabase credential/dashboard path was available. See [B37 report](acceptance/b37/generated-artifact-convergence.md). Next: controlled production migration and B37 smoke, then B38 Generation Quality Acceptance with large-PPTX `request_exceeds_context_budget` investigation.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — physical validation completed with unresolved defects.** Signed preview builds `0dc19cdd` (`f88b0c2`) and `245ccaec` (`1e81edd`) were installed on the realme RMX3151; both contain `libexpo-sqlite.so` and the signing identity is unchanged. Passing physically: authentication and session persistence, Generate synced-course browsing with real Canvas data, Reviewer hierarchy across Accounting, Japanese/FL100, and a newly generated CC17 Reviewer, the replacement generation visual holding position across a real one-line-to-two-line status change, Library tap/swipe/indicator/cards, Today handle geometry and drag, relaunch from the device store, full offline reading of all three artifact types with the Quiz correctly read-only, reconnect without duplicates, measured motion (11.4% janky over 289 frames, GPU 8ms), and reduced motion. Repaired and rebuilt: corner clipping on `RowLink inset` rows given a `padding: 0` Surface, and a Library tab row hardcoded wider than the content area. Blocked: Quiz generation and Reviewer deletion, both because the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table (0 rows) while artifacts live in `generated_artifacts` (48 rows) — a migration-level fix, out of bounded repair scope. Quiz and Activity Output were not generated during B36, though their persistence and offline behaviour were verified against real artifacts. No second account exists for cross-account isolation. All automated gates pass. See [B36 report](acceptance/b36/signed-physical-offline-acceptance.md). Next: B37 Generation Quality Acceptance.

## B35 on-device artifact persistence (2026-09-22)

**PASS — local persistence and the local-first Library are implemented and verified.** expo-sqlite `~16.0.10` backs an owner-scoped, `user_version`-migrated store of canonical Library ids with summaries and typed detail bodies. The completed-generation write path is GenerationScreen → server `artifactId` → cloud detail → idempotent upsert; queued, running, failed, and cancelled jobs are never stored. The Library renders SQLite first, reconciles pages and up to 20 bodies per refresh, and keeps the B34 pager/tabs/cards. Sign-out purges the owner's rows. Tests use real SQLite and cover all 15 required areas; mutation checks confirmed the owner-isolation and older-copy guards. Fresh forced typecheck/lint 7/7 (4 pre-existing warnings), mobile 505/505, API 895/3 skipped, Canvas 73/73, shared 44/44, mobile export, and DB/API builds pass. No device was attached. See [B35 report](acceptance/b35/on-device-artifact-persistence.md). Next: B36 Signed Physical UX + Offline Acceptance on a new signed native build.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — implementation and automated verification are complete; changed-build authenticated physical acceptance remains.** Generate is now a synchronized-course browser with exact persisted Reviewer→Quiz dependency, Reviewer rendering has semantic study hierarchy and normalized duplicate-heading suppression, the orb was replaced with a low-overhead native-driven study field whose position is independent of status text, Library is a native horizontal pager with an interpolated rounded indicator and structural loading, Today handles fully cover the track with aligned 56-point targets, and shared motion tokens/press feedback respect reduced motion. Fresh mobile 456/456, API 895 passed / 3 skipped, Canvas 73/73, shared 44/44, forced 7-workspace typecheck/lint, mobile export, and isolated DB/API production builds pass; four unrelated pre-existing lint warnings remain. ADB confirms realme RMX3151 / Android 13 and the changed local bundle loads, but Expo Go cannot reuse the signed app session and EAS upload needs explicit approval. See [B34 report](acceptance/b34/current-mobile-ux-repair.md). Next: finish B34 signed physical checks, then B35 Physical UX Acceptance.

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** B31 already proved real Student-accessible Canvas Page, text PDF, DOCX, and PPTX through production Reviewer generation, Queue, Android rendering, and Library reopen; B32 proved the 16-page scanned-PDF durable OCR path. B33 found no remaining format blocker and did not repeat those live jobs. One reproducible B26 boundary defect was fixed: Tasks now includes Canvas assignments only when deadline-bearing and/or submittable, while Generate continues to exclude assignments, announcements, administrative modules, and ungrouped image artwork. JPEG direct-import production acceptance and shared PNG/JPEG implementation remain valid; positive Canvas image discovery is still naturally fixture/permission-limited and non-blocking. Fresh API 894 passed / 3 skipped, engine 606/606, Canvas 73/73, focused ingestion/failure safety 152/152, API/engine typechecks, and DB/API production build pass. See [B33 acceptance](acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — the real 16-page zero-native-text Accounting PDF now completes production Reviewer generation durably and reopens on physical Android.** B32 moved scanned Canvas PDF download, page inspection, OCR, source attachment, and reviewer context creation out of the synchronous request and into checkpointed Vercel Workflow steps. Production deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` is READY and healthy. Fresh job `a85bd672-2aed-401b-a37e-fd1c794d826f` inspected all 16 pages, OCRed four chunks, attached 6,757 ordered source characters, completed AI generation, appeared in Queue as completed, rendered as `Reviewer in Journaling and Basic Accounting`, and reopened from Library after app force-stop/relaunch. Full API and engine regressions pass. Direct service-role DB metadata inspection was unavailable because the local Vercel environment pull returned secret references rather than decrypted Supabase values. See [B32 acceptance](acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance, unless B33 format hardening is reopened by a new DOCX/PPTX defect.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — real Student-accessible Canvas text PDF, DOCX, PPTX, and Page paths completed fresh production Reviewers and Android persistence/reopen.** FL 100 and CIT5 were added as concluded-course selections without Canvas mutation. Production exposed an administrative `Module 0: Course Information Module` routing defect; the exact-label guard and regression were deployed in READY `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`, after which the eight administrative items disappeared while lesson materials remained. The 16-page Accounting scan now prepares to `PDF · ready` but two generation submissions OOM before durable job creation. Safe student/log surfaces do not expose every requested internal provenance/validation field, and no eligible instructional image exists. See [B31 acceptance](acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — the B29 routing guard is deployed and negative production acceptance passes.** Deployment `dpl_3LCFzi9ao68Upsiir8GFL1kroX82` is READY, healthy, and serves the canonical production alias. Four fresh Android-triggered Canvas sync jobs succeeded. Physical Generate checks kept CC16 `APA Sample.png` under `General Information` and five ungrouped CC13 logos/banner/profile images excluded; Announcements and Tasks remained separate. The Student account cannot author the positive direct-module fixture. Teacher/Designer cooperation and sandbox access will not be pursued; automated routing coverage remains the evidence unless a suitable student-accessible image occurs naturally. See [B30 acceptance](acceptance/b30/canvas-instructional-image-production-acceptance.md). Next: B31 student-accessible Canvas material acceptance.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — live OCR and OCR-derived generation are accepted, while production Canvas image discovery remains unavailable.** On the authenticated realme, a real one-page zero-native-text Hiragana course scan invoked Google Vision for 1/1 page, produced 688 characters, completed a fresh six-section Reviewer, and reopened from Library. A real Piaget instructional JPEG similarly produced 965 characters and a persisted six-section Reviewer. The synchronized Canvas account has no eligible direct-module teaching image outside administrative content, so Canvas image acceptance is `NOT EXERCISED`. Routing now requires direct module placement for images, excluding ungrouped logos/banners/profile imagery while retaining teaching images; all focused tests and the isolated API build pass. A 16-page 8.1 MB scan stalled before OCR and was cancelled safely. See [B29 acceptance](acceptance/b29/live-ocr-learning-image-acceptance.md). Next: bounded B30 production acceptance with one consented direct-module Canvas instructional image.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — fresh real Canvas PDF, PPTX, and Page Reviewer ingestion is accepted; scanned PDF, instructional image OCR, and Canvas DOCX need live evidence.** The authenticated realme generated and reopened three new Reviewers from CC16 Firewalls PDF (33 pages, 7,984 characters), CC17 Android Platform PPTX (39 slide markers, 9,873 characters), and CC13 Fact Gathering Methods Page (8,227 characters). Owner-linked source versions, provenance snapshots, result records, and artifacts were confirmed read-only. Local DOCX extraction worked; no Canvas DOCX learning file exists in the synchronized account. Full relevant tests pass, and the root build reaches the known local `expo-router` junction problem; isolated API build passes. No production repair or migration was needed. See [B28 acceptance](acceptance/b28/ingestion-document-format-acceptance.md). Next: bounded B29 live scanned-PDF/instructional-image OCR acceptance and image discoverability decision.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 student-facing Canvas announcements are deployed and physically accepted.** The author/attachment migration is applied, production deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT` is READY and healthy, and a signed B27 APK retained the authenticated realme session. Fresh Canvas sync populated CC17 author metadata; physical Today, list, details, native HTML readability, Canvas handoff, and Generate/Tasks separation passed. Links and attachments had no live source example. The remote migration-history version differs from the local filename and needs reconciliation before a future CLI push; the applied schema is verified. See [B27.1 acceptance](acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** Production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v` is READY and healthy. On the standalone realme app, lesson Pages/PDF/PPTX stayed in Generate, assignments stayed in Tasks, and the retained CIT6 orientation PDF stayed excluded before and after normal Canvas sync. Five completed fresh Activity types preserved every prewritten mandatory requirement after two generic prompt repairs; a sixth stopped consistently before provider execution because its referenced Group Announcement/scenario was unavailable. Personal details now remain explicit editable placeholders. Full package, contract, typecheck, lint, API-build, deployment-health, and physical gates pass; the known local Expo external-link limitation remains. See [B26.1 acceptance](acceptance/b26.1/deployed-routing-and-activity-reliability.md). Next: B27.

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The existing repaired APK installed data-preservingly and ran standalone on the realme RMX3151. Authenticated Canvas access, fresh AI-first Reviewer/Quiz/Activity generations, server Quiz scoring, and all three Library reopens plus Queue after cold relaunch passed. Production health/401 security checks and fresh mobile regressions pass. See [B25.3.4 acceptance](acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Next: B26 generation-quality evaluation across multiple real Reviewer materials and Activity assignment types. Earlier PARTIAL entries remain historical.

## B25.4 physical-device acceptance (2026-09-16)

The signed-in realme completed a production-API Reviewer from the real CIT6 PDF, an exact five-question Quiz with a persisted 5/5 server-scored result, and a CC16 Learning Contract Activity matching its four-by-five complete-sentence instruction. Queue and Library reopened the new records. A malformed local admission cache was repaired in `9bdc03e` and physically retested via Expo Go; all post-fix regression gates pass. A patched preview APK still needs installation/retest before B25 can close. **PARTIAL — B26 may not begin.** See [B25.4 device checkpoint](acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

Finding-specific structured feedback, direct correction, full same-support reauthoring, alternate unused support, source-affordance difficulty planning, immutable accepted questions, and explicit academic-value examples are implemented in `bd5eb15`. Fresh package/root gates and the final bounded synthetic-live validation pass. Production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and its canonical health endpoint is green.

The only authorized authenticated real-lecture retest still ended `repair_exhausted`: 1/5 accepted and four slots pending after the alternate-support phase. No complete Quiz persisted, so Library/take/submit/score/result/reopen remain unaccepted. **PARTIAL — Quiz semantic convergence remains incomplete.** No validation was weakened, no production retry occurred, and B26 was not started. See [B25.3.1 report](acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](acceptance/b25/ui-redesign-foundation.md).


## B24.7 Quiz backend (2026-09-13)

**PASS — Quiz backend is ready and core backend capability is complete for the UI redesign.**
Owned prepared material and saved Reviewer source relationships now feed durable,
source-grounded quizzes with server-only answer keys, persisted attempts,
deterministic exact-set scoring, weak-area navigation and Library reopen.
Reviewer, Activity Maker and Quiz capabilities are available in the new code.
Quiz uses the existing provider adapter with its own pinned GPT-5.4 model;
Reviewer and Activity model defaults and behavior are unchanged.

Fresh verification: API 906 passed plus three opt-in live tests skipped; mobile
443, Canvas 73, OCR 27, shared 44 and engine 606. Forced root typecheck/lint/build
passed 7/7 each with zero cached tasks and no lint warnings; Workflow runtime 1
and provider contract 18 passed. Both five-question live fixtures passed final
whole-set verification, local SQL attempts/scoring and Library reopen after
three rejected questions were repaired. Earlier academic failures are documented;
the limited sample is not a production reliability benchmark.

Pending rollout: apply Activity migration `20260912100000_activity_maker.sql`
then Quiz migration `20260912110000_quiz_maker.sql`, deploy API and smoke test.
No hosted migration, deployment, UI redesign or push occurred in B24.7.
This entry supersedes earlier Quiz-missing statements. Acceptance evidence is
under `docs/ai/acceptance/b24-7/`, including quality limits and failure history.

Next: B24.8 — Backend rollout readiness, then B25 — Apple-inspired 2026 design
system + mobile app shell.

## B24.6 Activity Maker backend (2026-09-12)

**PASS — V1-informed Activity Maker backend is ready for the redesigned UI.**
The verified GitHub V1 audit informed owned Canvas assignment/resource assembly,
DOCX/PPTX structural ingestion, TaskSpecification, source-grounded structured
generation, transactional editable drafts and Library/Activity Detail integration.
Activity Maker is available in the new code; Quiz remains unavailable. No UI,
Reviewer-engine rewrite, planner replacement or Canvas submission behavior added.

Fresh verification: API 768 passed plus one opt-in live test skipped; mobile 443,
Canvas 73, OCR 27, shared 44 and engine 606. Root typecheck/lint/build passed 7/7
with zero cache hits and no lint warnings. Provider contract 18 and existing
Workflow runtime 1 passed. Two live provider fixtures passed instruction/grounding
checks and local Postgres persistence/reopen/edit/regeneration validation.
Database policies, retention and account deletion passed deterministic SQL tests.

Deployment prerequisite: apply `20260912100000_activity_maker.sql` before the API
that reads Activity drafts. Hosted migration/RLS/deployed Activity execution were
not run. Legacy DOC/PPT, advanced Office layout/media and output export remain
outside this slice. Earlier phase entries below are historical; B24.6 supersedes
their Activity Maker/DOCX/PPTX missing-capability statements.

Next: B24.7 — Quiz generation, attempts, results, weak-area mapping and Library
persistence. Acceptance evidence is under `docs/ai/acceptance/b24-6/`.


## B24.5 backend experience contracts (2026-09-12)

**PARTIAL — core contracts are aligned but a product capability still requires
backend implementation.** Shared student DTOs and authenticated API experience
services now compose Today, Learn, Activities and Library. Reviewer admission
reuses source preparation, snapshot/freshness gates and durable jobs; Library
opens persisted output and deduplicates the existing automatic save path.
Capabilities explicitly disable missing Quiz, Activity Maker and calendar
implementations. No UI redesign, migration, model/provider selection change or
planner algorithm change. The standalone provider contract's pre-existing import
resolution issue is repaired with an equivalent relative import.

Fresh verification: API 710, mobile 443, Canvas 73, OCR 27, shared 44 (22 distinct source tests), engine 606,
Workflow runtime 1 and provider contract 18; forced typecheck/lint/build each pass
7/7 with zero cache hits and zero lint warnings. Hosted RLS/new APK acceptance
NOT RUN. Pre-existing persistence edits are preserved and excluded from this commit.

Next: B24.6 Activity Maker generation and owner-scoped draft persistence, then a
separate Quiz generation/attempt/results slice. Reconcile the completed B24
specification (not found in this checkout) before B25 app-shell implementation.
See [B24.5 contract](acceptance/b24-5/backend-ui-contract.md) and [verification](acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Minimal SecureStore state binds the authenticated owner, Canvas source, idempotency request, accepted job, and immutable snapshot without storing source or generated content. Exact-job polling resumes after backgrounding, process recreation, and transient network failure; a unique owner/snapshot database contract makes automatic Library persistence replay-safe. Physical Android acceptance proved the running-job recovery path, large-text reachability, save, and reopen, while production counts showed two intentional jobs and one Reviewer for each of two distinct snapshots. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification, followed by B25 — Design system + app shell implementation, B26 — Core experience redesign, B27 — Remaining application redesign, and B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The mobile flow now leads with course/module/material context, keeps Ready/Prepare/unsupported/empty states understandable, turns default source resolution and durable job submission into one Create Reviewer action, shows coarse progress, and auto-saves against the immutable Canvas snapshot. A fresh production job from the real 23-page CIT6 PDF produced a grounded 20-section Reviewer (coverage/grounding 1.00, zero issues, leakage passed), rendered on the realme Android 13 phone, appeared in Study Library, and reopened without regeneration. Real CC17 PPTX and CIT6 empty rows remained visible and disabled. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. B22 required no API or schema deployment; production health is green. Next: scope B23 separately. See [B22 acceptance](acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Fresh production syncs of the three selected courses persisted exact module resources despite broad Files/Pages failures. Two database contract mismatches found live were minimally migrated and regression-covered. A genuine 23-page CIT6 Canvas PDF was prepared from its module, extracted into 23/23 native-text blocks, generated by the durable production workflow into a grounded 20-section Reviewer with 1.00 coverage/grounding and passed leakage, rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production health is HTTP 200. PPTX/DOCX stay safely unsupported and broad Canvas permissions remain partial warnings. Next: begin B22 only under a new scope. See [B21.1 acceptance](acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed cold launch/session restoration, real 15-page and 55-page learner-PDF intake, durable authenticated production jobs, Reviewer completion/rendering, save, and Library reopen. Missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass; four existing lint warnings remain. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX parsing is not implemented. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](acceptance/b19/source-span-ancestry-completeness.md).

## B18 local repair — historical result (2026-09-08)

**FAIL — Reviewer representation defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46, with unchanged hashes, source ownership,
production gpt-4o, parser default legacy and initial prompts. Deterministic
representation ownership reduces composite/relationship copies and validates
visible spans. All Statistics mapping mismatches are resolved; Docling remains
withheld for one finding containing two real missing definitions. MinerU now
assembles with zero omissions. Python fallback remains zero. Final calls are
2/3/3/1, explanation retries 0/1/1/0, factual retries all zero. All four manual
gates still FAIL; serialized usefulness also fails Python/MinerU/Docling.
Full unchanged B12: NOT RUN — targeted prerequisites failed.
Fresh engine 519/519, architecture 70/70, reader 32/32, API 607/607, root
typecheck/lint/build all PASS. No push. B16/B17 historical FAIL reports unchanged.
Next: repair remaining source-span ancestry and source-item completeness from
B18 captures, preserving frozen targets and gates.
See [B18 acceptance](acceptance/b18/composite-source-presentation-source-item-alignment.md).


## B17 local repair — historical result (2026-09-07)

**FAIL — generic Reviewer quality defect remains.** All frozen targets remain
99/99, 232/232, 156/156 and 46/46; model gpt-4o and parser default legacy
are unchanged. Deterministic display now separates typed evidence, protects
row identity/order and exact overlap, and preserves every target at serialization.
Local sentence context and heading-subject completion improve explanations.
Fresh engine 494/494, architecture 45/45 and reader 32/32 pass.
Final calls 2/2/2/2, explanation retries 0/0/0/1, factual retries all zero.
Python has zero fallback, but source code/layout and repetitive labels remain.
Statistics remains withheld (two/four omissions); Accounting improves but
still fails manual usefulness. All four manual gates FAIL; full B12 NOT RUN.
Next: repair composite source-span/relationship presentation and align its
source-item evidence, preserving the frozen gates. No push or parser promotion.
See [B17 acceptance](acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Previous objective result — B16.1 historical

B16.1 attempt 3 (2026-09-07) is FAIL with provider capacity AVAILABLE.
All four targeted cases ran through real `gpt-4o`; deterministic retention is
99/99, 232/232, 156/156 and 46/46 with zero factual retries or provider losses.
A captured generic prompt-contract regression now passes: concise source wording
is explicitly permitted under the unchanged lexical grounding rule. Python
improves to four calls, 10.383 s and two fallback explanations, but still fails
provider acceptance. Statistics MinerU/Docling remain withheld (two/four
grounding omissions; MinerU also structural noise). Accounting has one call,
5.824 s and automated PASS, but fragmentary prose/raw tables fail manual quality.
Full B12 is NOT RUN: targeted prerequisites failed. Fresh engine 476/476,
architecture 27/27 and API 607/607 pass. Next: reconcile the generic
explanation/evidence presentation contract with the existing validation rules
using captured failures. No B17, ownership/default/threshold change or push.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Historical B16 architecture baseline: the engine assembles every required manifest target deterministically
before provider work and restricts batched provider output to explanations.
The focused suite passes 26/26, the engine 475/475, and API 607/607. Provider-
owned required targets and factual retries are zero; non-standalone nodes use
zero calls. Live quality acceptance is unresolved because Python calls returned
OpenAI 429 `no credits remaining`. Its safe fallback preserved 99/99 targets
with zero loss/fabrication in 5.432 s and two initial batches, but Statistics,
Accounting, and full B12 were not run. Production remains `legacy`. See
`docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.

## B15 predecessor result

Reviewer B15 now distinguishes source-supported standalone sections from
structural, typed-evidence and unsupported nodes before generation. Exact
non-standalone representations retain titles, manifests and ownership while
making no provider or retry calls. Its new suite is 12/12 and the engine is
**449/449**, retaining B13 and B14. Fresh targeted acceptance still fails:
Python is withheld for instructional noise despite 99/99 target representation;
Statistics and Accounting remain withheld for provider omissions, with
Statistics also failing usefulness. Production remains `legacy`. See
`docs/ai/acceptance/b15/reviewer-section-planning.md`.

## B13 predecessor result

Reviewer B13 introduced stable required-evidence manifests, exact-target repair,
source-absent refusal and initial deterministic usefulness gates. Its 19/19
regressions remain frozen and green. B13 acceptance failed because provider
omissions, activity/source dumps and source-sparse explanations remained.

## B12 predecessor result

Reviewer Benchmark B12 completed the frozen three-source B8 workload through
hybrid parsing and the real durable job path. Verdict:
`FAIL — B12 exposed unresolved Reviewer acceptance defects`.

The run found and fixed one generic Stage 0 defect: non-legacy typed blocks
rehydrated from durable metadata were incorrectly expanded as legacy
presentation pages. The post-fix durable rerun restored Python's 13-section
typed plan. Python technically passes at 1.00 coverage/grounding, but manual
inspection still finds title-only explanations, activity leakage, and overly
source-like key-point lists. Statistics remains safely withheld for provider
omissions with both MinerU and Docling; Accounting remains safely withheld
because generated Ledger content omits a required exact source row. No visible
fabrication or unsupported relationship was accepted. Production remains
`legacy` by default.

## Completed predecessor

Reviewer Benchmark B11 is complete. Stages 1-6 now use B10's typed document
structure for concept hierarchy, evidence grouping, relationship grounding,
and objective student-visible assembly validation. The production parser
default and existing Google OCR-backed path remain unchanged.

## Completed scope

- Added generic multi-signal typed-heading roles, metadata/furniture demotion,
  same-parent repeated-heading consolidation, and child-evidence retention.
- Added plan-level typed evidence groups for formulas, tables, exact cells,
  code, and result statements with preserved structural provenance.
- Grounded formula raw text/parser LaTeX and exact table cells without allowing
  unstated calculations, range substrings, or algebraic transformations.
- Added objective Stage 6 diagnostics for furniture, duplicate/code/body titles,
  empty sections, structural noise, and evidence-based oversized sections.
- Added eight deterministic regression families and reran live Python Docling
  plus central-tendency Docling/MinerU generation through the B10 harness.

## Result

`PASS - TYPED REVIEWER HIERARCHY AND GROUNDING HARDENING ACCEPTED`

Python Docling now assembles 13 clean concepts at 1.00 coverage and grounding,
with no REVIEW/ACTIVITY/Examples furniture, partial-sentence/code/list titles,
or repeated numeric suffixes. Central-tendency grounding issues fall from 41
to 4 with Docling and from 40 to 2 with MinerU, with zero fabrication failures.
Both statistics arms remain correctly withheld for omissions or missing output
rather than inventing relationships. Typed accounting cells and numeric/OCR
provenance remain intact.

## B15 verification

- FRESH B15 regressions: 12/12; engine evaluations: 449/449, retaining all 437
  prior cases, including all B13 and B14 regressions.
- FRESH API tests: 607/607 across 69 files.
- Full typecheck, lint and builds pass; the acceptance report records fresh
  versus cached tasks. Lint retains only the four accepted mobile warnings.
- Fresh provider-backed targeted results: Python 1.00/1.00 with 99/99 required
  targets but usefulness failure; Statistics/MinerU 0.91/0.80 with 211/232;
  Statistics/Docling 0.97/0.81 with 152/156; Accounting 0.76/0.88 with 35/46.
  All four were safely withheld with zero fabrication failures.
- Full unchanged B12 rerun: NOT RUN because targeted prerequisites failed.
- Repository diff and object-integrity checks pass; only the two known
  dangling blobs remain.

## Next action

Restore provider capacity and rerun the B16 targeted order. Accept only after
successful explanations pass grounding, usefulness, manual quality, and
runtime, then run unchanged B12. Do not start a B17 benchmark patch.
