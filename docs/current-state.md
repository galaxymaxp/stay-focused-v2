# Current State

## B37.2 opening production gate (2026-09-28)

**PARTIAL — migration/deployment/small-source rejection verified; fresh 30 Mixed blocked at the existing daily quota (25/25), so B37.2 is NOT STARTED.**

The approved B37.1a migration is recorded once in `xfdbwfqtorelmurncyql` as version `20260927230139`, name `20260928100000_canonical_non_canvas_sources`; reviewed local filename unchanged. Sources/courses/original Quiz row fingerprints match, all 15 historical Quizzes remain readable, and RLS/grants/owner-source constraints are preserved. No reset or deletion. Production API `dpl_FnAWyTzQmfNgsQLuo5rQyPKpdzbv` is READY for `0c354ac`, health 200 and signed-out Library 401. Private worker `generation-worker-00009-jzb` serves 100%; anonymous health 403. Build/digest and detailed verification are in the ledger.

VPN sections 6–10 have 26 concepts, 5 duplicate exclusions and capacity 52. Direct 100-item admission returns typed 422 with maximum 52, no job and zero provider calls. The whole VPN Reviewer still calculates capacity 100; its whole-source capacity is not claimed to pass a below-100 check. Fresh 30 Mixed returns 429 `rate_limited`, no job/provider calls: 25/25 daily jobs, zero queued/running. The next window starts **2026-09-28 08:00 Manila**. An existing Canvas `2. Firewalls.pdf` Reviewer is a candidate with 138 concepts/capacity 100. No fresh 100-item, Queue/Library completion or non-Canvas physical flow was run after the required stop. Do not bypass the quota.

Realme `PB6DWWEIHAUCMZOR` loaded current JS against production, retained the authorized owner's session, and loaded existing Library/Queue data. Tokens stayed in the app. The corrected config `stay-focused-v2/env.local` matches production; only variable names/presence are recorded. Initial inventory approval blocks were resolved for aggregate counts after explicit user approval; private content exports were not bypassed. Fresh Quiz tests: 157 passed, 2 existing skips; focused database tests: 30 passed, 2 skips (overlapping); production build and `git diff --check` pass. No EAS build, auth/Canvas credential/Resend implementation, live email or new lifecycle acceptance. Existing unrelated Supabase security-advisor warnings remain recorded for separate review.

The authenticated Supabase user UUID is the canonical owner.

Canvas credentials authorize synchronization.
They do not own Stay Focused data.

Resume the 30/100 and non-Canvas physical gate after daily admission resets, then B37.2. Study Assist latency remains approximately 20 seconds and optimization is deferred. `tmp/` untouched; no push.

[Detailed B37 rollout and acceptance ledger](ai/acceptance/b37/study-experience-overhaul.md).


## B37.1a local checkpoint before rollout (2026-09-28)

The local B37.1a implementation uses `source_versions` to anchor non-Canvas Text, Camera/OCR and Local PDF sources under the authenticated `user_id`. Existing Canvas File and Page Reviewers continue to use that table and retain snapshot/course/material provenance; new jobs label their source type. The non-Canvas sheet persists a source on Continue, then sends its source ID through the durable Reviewer path. Quiz resolves the same persisted Reviewer and source; the forward migration allows an owner-bound Quiz with a null Canvas course and a required source version. Library code retains source name/type and can reopen both artifacts. The old manual Save screen is removed from this route. No fake Canvas IDs are used for non-Canvas sources. Activity remains Canvas assignment based. The physical app reached Text entry, camera launch and PDF selection, but its API was unreachable, so persistence and Library reopening are unverified. Automatic approval review rejected the live Supabase migration; no production schema/data changed. Physical and production acceptance are tracked in the [B37 ledger](ai/acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 capacity lock checkpoint (2026-09-28)

**PARTIAL — local Quiz capacity and repair implementation passes focused checks; production acceptance is pending.** Capacity is calculated from persisted Reviewer titles and key points with deterministic deduplication and no provider calls. API admission, worker execution and old-job Retry enforce the same maximum; repair rejects a replacement that repeats its rejected original. Generate now shows Other source near the top and opens a rising sheet with Text, Camera and Local File. The connected realme confirmed text entry, native camera launch and selection of an instructional PDF. Its underlying flow remains Reviewer-only with a manual Save step; Quiz persistence still requires Canvas IDs, so converging non-Canvas generation exceeds this scoped task's stop condition. No production deployment, EAS build, fresh Quiz or Library acceptance occurred. See [B37 acceptance checkpoint](ai/acceptance/b37/study-experience-overhaul.md). Study Assist latency remains separate.

## B37 study experience overhaul (2026-09-27)

**PARTIAL - 100-item production Quiz stopped at batch 3.** Quiz generation now budgets two calls per 20-item batch (cap 10), repairs only rejected items with fresh responses, keeps single-format requests single-format, and requires exact source wording for recall answers; failed Quizzes can be retried without duplicates. Worker `generation-worker-00008-8q5` and Vercel `dpl_4m9zHz7epmr7qHtG427gJgZgBMQi` are live. 30-item Mixed and Multiple Choice production Quizzes pass and reopen from Library; the 100-item Mixed run failed on repeated questions in batch 3 and awaits an owner decision. Study Assist is still about 20 s because each request loads every Reviewer from Tokyo into `iad1`. No EAS build used. See [B37 acceptance](ai/acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation now routes to Google Cloud.** The user confirmed Vercel deployment capacity after the readiness checkpoint. One production deployment, `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL`, reached READY with `GENERATION_BACKEND=google-cloud`; the aliased `/api/health` returned 200. An authenticated production API request using the existing owner-linked VPN instructional Reviewer completed one Quiz through Cloud Tasks, private Cloud Run, OpenAI and Supabase. Queue showed `succeeded`; one owner-scoped result and Quiz persisted; Library listed and reopened it. B38's earlier fresh Quiz, terminal Quiz/text-PDF replay, scoped Vercel OIDC federation, final worker image and security checks also pass. Vercel Workflow remains available for rollback; no Android/EAS build was used. See [B38 acceptance](ai/acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud heavy-generation foundation (2026-09-27)

**PARTIAL — direct Cloud Tasks → private Cloud Run execution works; production cutover remains blocked.** The existing Stay Focus project and Google Vision OCR were reused. Fresh Google-backed Reviewer runs succeeded from text PDF, scanned PDF (16 inspected pages, four OCR chunks), DOCX, PPTX and Canvas Page; Activity also succeeded. Jobs persisted once and reopened from Library. A fresh Quiz reached the existing validator but failed `quiz_generation_failed` with no artifact. Controlled lease retry, queued/running cancellation and safe failure checks passed; terminal duplicate replay was blocked by automatic approval review's usage limit. Vercel dispatch identity has not been federated to Google, and Vercel Functions Storage capacity still prevents assuming a new deployment is possible. The live Vercel API and Workflow default are unchanged; no EAS build was used. See [B37 Cloud acceptance](ai/acceptance/b37/google-cloud-generation-foundation.md). Next: complete Quiz and replay acceptance, configure Vercel-to-Google identity, clear deployment capacity, then review B38 cutover.

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](ai/acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Latest dev-lab revision adds ribbon-edge glow, flowing theme palettes and independent width/twist/curvature changes, replacing transparent faceting with depth-tested bodies. Complete remains slowly alive; Error and Reduced Motion freeze. Fresh mobile 576/576, typecheck and lint pass (four existing warnings). Realme checks are recorded in [ribbon refinement](ai/acceptance/b38-2-1/ribbon-glow-refinement.md). Still PARTIAL for the original glass-material bar; production remains unchanged.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — dev-only real 3D prototype; not approved for production integration.** Expo GL/Three.js replaces the rejected wobbling-image experiment in a dedicated lab, not in production generation. Six states, four palettes, system/simulated Reduced Motion and physical realme checks are implemented. Complete now slows continuously instead of stopping; Error settles and stops. Fresh mobile tests 574/574, typecheck and lint (0 errors, four existing warnings) pass. Short UI-frame samples show 1.35–2.04% steady-state jank and 4.40% transition jank; these are not direct GL FPS measurements. Transparent ribbon intersections, weak glass material and UC surface coloration still miss the signature-visual bar. Production jobs, Queue, auth and old SVG are untouched. See [prototype acceptance](ai/acceptance/b38-2-1/generation-core-prototype.md). Next: refine geometry/materials on the realme and repeat visual/direct-GL acceptance before integration.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](ai/acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS — fresh production generation is source-faithful, useful, durable, and demo-ready for the tested matrix.** On the physical realme RMX3151, a 33-page CC16 Firewalls PDF produced a 25-topic Reviewer and a five-question Quiz whose five marked answers were all correct; a 39-slide CC17 Android Platform PPTX produced a 32-topic Reviewer; and the production Tasks → Create Draft flow produced a requirement-faithful Android Versions Activity Output. All artifacts completed through durable jobs, opened cleanly, persisted in Library, and survived the required relaunch checks. Queue/background continuation passed.

The initial PPTX job reproducibly failed before OpenAI because the strict response schema expanded every long source block ID into an enum and crossed the contract budget. The smallest repair (`1d992aa`) uses bounded strings in the provider schema while preserving exact allowlist enforcement in local validation and repair. The long-ID regression passes, the repaired PPTX completed on production `gpt-5.4-2026-03-05`, and the full repository gates pass. Deployment `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk` is READY and healthy; no mobile update or migration was required. See [B38.1 acceptance](ai/acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS — Generate course state and material loading are physically accepted.** Generate listed every discovered Canvas course as "Synced", using the inventory-upsert time, in one alphabetical list. Opening an unselected course such as HIST 100 turned the correct `400 canvas_course_not_selected` gate into a generic `503` "Materials could not be loaded". The Generate list now uses the Sync page's own inventory: selection plus the latest sync attempt give synced / not synced / sync incomplete, and Canvas term/enrollment classification groups current before previous courses, synced first and newest term first. A read-only stored fallback applies when Canvas cannot list courses. Unsynced and incomplete courses open Canvas sync with that course added to the selection draft, and they make no materials request. The unselected gate now returns `409 course_not_synced`, real failures stay retryable, and a synced course with no eligible sources shows "No study materials found".

Implementation `b3f6973` is deployed as `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ` (READY, healthy, no 5xx), and the mobile change as EAS preview update `d288a6ea` on the B37 signed build. No migration was needed.

On the realme RMX3151: HIST 100 (not synced) opens Sync; CC17 (current) and CC16 (previous) open their materials; CIT6 shows the empty state; an offline materials failure retries successfully. Fresh gates pass: typecheck/lint 7/7, mobile 513/513, API 901 with 3 opt-in skips, Canvas 73/73, shared 44/44, DB/API and mobile builds, and the lockfile dry-run. See [B38.0 acceptance](ai/acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS — canonical Reviewer convergence is live and physically accepted.** Production migration history was reconciled without replaying schema SQL, `20260923000000_canonical_reviewer_artifacts.sql` and the owner-scoped read-grant follow-up `20260923010000_authenticated_canonical_reviewer_reads.sql` were applied, and all local migration versions now match production. Deployment `dpl_2QUkcVoZADvJ3JfzegXSDXEjzrcp` is READY at the canonical production alias. Authenticated Android acceptance proved the positive and negative Quiz gates, explicit Queue confirmation with zero pre-confirmation jobs, one durable canonical Quiz job/result/Quiz, offline cold-relaunch reading from SQLite, populated canonical Reviewer management, disposable rename/delete without resurrection, and dependency denial for a Quiz-backed Reviewer. Signed preview build `f0d6d63e-2607-45ee-b125-3b5d43ec2966` at `a7bfcee` is the accepted binary. The legacy table remains for historical compatibility but has zero rows and no active runtime reads. Fresh verification passes: typecheck/lint 7/7, mobile 508/508, API 890 passed with 3 opt-in skips, Canvas 73/73, shared 44/44, DB focus 82 passed with 2 opt-in skips, production build, mobile export, lockfile dry-run, and diff check. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — canonical migration implemented with unresolved runtime dependencies.** The repository now uses `generated_artifacts` as the durable Reviewer identity for the Generate Quiz gate, Quiz DTO/RPC/job/source/persistence path, Reviewer management, source status, deletion, and B35 local relationships. Quiz source assembly consumes the persisted current Reviewer version directly; title matching is never used. The forward migration adds owner-safe `quizzes.reviewer_artifact_id`, preserves historical `reviewer_id`, restricts deletion when dependent Quizzes exist, and keeps the legacy table for a later audited retirement. Queue navigation is side-effect free: only an explicit confirmation can accept generation, with repeated-tap and reopen protection. Fresh typecheck/lint/build/export/install and all requested suites pass (mobile 508, API 886 with 3 opt-in skips, Canvas 73, shared 44). Production is still on the pre-B37 schema/API: the known remote migration-history mismatch, unavailable local Supabase workflow/credentials, and rejected full environment pull prevented a safe current data audit, migration, deployment, authenticated smoke, or physical spend check. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: apply/verify B37 through an approved Supabase path and complete its production smoke; then B38 Generation Quality Acceptance.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — the B34 UX overhaul and the B35 local-first store are accepted on real hardware; Quiz generation and Reviewer deletion are unreachable on this branch.** Two signed EAS preview APKs were built and installed on the realme RMX3151 (Android 13): `0dc19cdd` at `f88b0c2` for acceptance and `245ccaec` at `1e81edd` carrying the repairs. Both contain `libexpo-sqlite.so`; the signing identity is unchanged and no credential was created or rotated. Authentication, session persistence across force-stop, the synced-course Generate browser, Reviewer hierarchy across three materially different Reviewers, the replacement generation visual with genuinely multiline-stable status regions, Library paging/indicator/cards, and the repaired Today handles all pass physically. One real Reviewer was generated end to end from CC17 material and stored locally. Offline is the strongest result: with the network fully disabled, the Library renders saved work behind an explicit device-copy notice, Reviewer and Activity Output open in full, and the Quiz opens read-only with questions visible, no answer keys (correctness exists only on attempt results, never in stored question bodies), no fake scoring, and no submission path; network-only functions fail honestly. Reconnect reconciles with no duplicates and no loss, proven both by a stable `6 items` count and by two same-titled Reviewers correctly remaining two distinct ids. Measured motion is acceptable (289 frames, 11.4% janky, 90th percentile 28ms, GPU 8ms), and reduced motion via "Remove animations" keeps every surface usable. Logout returns to sign-in and the session is cleared across relaunch; the owner re-authenticated and the Library rebuilt from the cloud. Two bounded layout defects were found and repaired: card rows were clipped by the Surface corner radius because three call sites gave `RowLink inset` a `padding: 0` Surface with nothing to cancel, and the Library tab row was a hardcoded 378pt inside a 320pt content area. Blocking the remaining items is one shared root cause: creation and reading moved to `generated_artifacts` (48 rows) while the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table (0 rows), so Quiz generation can never be enabled and "Manage saved Reviewers" lists nothing to delete. No second test account exists, so cross-account isolation remains covered by automated tests only. Fresh forced typecheck/lint 7/7 (same 4 pre-existing warnings), mobile 505/505, API 895/3 skipped, Canvas 73/73, shared 44/44, `npm ci --dry-run`, mobile export, and `git diff --check` all pass. See [B36 acceptance](ai/acceptance/b36/signed-physical-offline-acceptance.md). Next: B37 Generation Quality Acceptance, which should also carry the legacy-`reviewers` retirement that unblocks Quiz generation and Reviewer deletion.

## B35 on-device artifact persistence (2026-09-22)

**PASS — completed Reviewers, Quizzes, and Activity outputs are persisted on the device and the Library is local-first.** An owner-scoped, versioned expo-sqlite store (`apps/mobile/src/services/localLibrary`) keeps the authoritative cloud Library detail once the server reports a persisted `artifactId`. It is also filled by online opens, Library reconciliation (summaries plus bounded body hydration), and saved Activity draft revisions. The Library and artifact reader render from the device before any network request. Cloud refresh is idempotent: older copies are ignored, failures and remote-list absence retain local rows, and only an owner-authenticated `not_found` removes one. Offline, Reviewers, Quiz questions, and Activity drafts are readable; generation, practice/scoring, draft saves, and refresh stay network-only. Explicit sign-out purges that owner's rows. Supabase, RLS, durable generation, and Queue are unchanged; Quiz→Reviewer identity uses persisted ids, never titles. Fresh forced typecheck/lint, mobile 505/505, API 895 passed / 3 skipped, Canvas 73/73, shared 44/44, mobile export, and DB/API builds pass. The installed signed APK predates the new native module, so a new native build is required. See [B35 acceptance](ai/acceptance/b35/on-device-artifact-persistence.md). Next: B36 Signed Physical UX + Offline Acceptance, which also completes B34's pending physical matrix.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — the connected Generate, Reviewer, Generation, Library, Today-handle, and motion overhaul is implemented and all fresh automated gates pass, but authenticated acceptance on the changed signed Android build is still blocked.** Generate now browses synchronized owner-scoped courses and gates Quiz through an exact persisted Reviewer relationship; the reader has study-oriented semantic hierarchy without duplicate section/block titles; the former orb is replaced by a native-driven study field in fixed layout regions; Library is a swipeable native pager with interpolated rounded tabs, compact cards, and structural loading; radial handles now use 34-point visuals over the 22-point ring with 56-point touch geometry; common press motion is centralized and reduced-motion aware. The realme RMX3151 / Android 13 is ADB-authorized and loaded the changed local bundle, but Expo Go cannot reuse the signed app's authenticated SecureStore session. EAS signed-build upload requires explicit approval. See [B34 acceptance](ai/acceptance/b34/current-mobile-ux-repair.md). Next: finish B34 physical acceptance, then B35 Physical UX Acceptance.

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** The former standalone DOCX/PPTX milestone was already absorbed by B31, and B32 closed the scanned-PDF reliability blocker; no duplicate production generation was run. Page, text PDF, scanned PDF, DOCX, and PPTX now have production generation, Queue, physical Android, persistence, and Library-reopen evidence. Direct instructional JPEG ingestion is production-proven; Canvas PNG/JPEG discovery remains naturally fixture/Student-permission limited, with shared implementation and negative routing verified. B33 repaired one reproducible product-separation defect so Tasks now excludes Canvas assignment records with neither a deadline nor an actionable submission mode, including previously imported linked rows. Full API, engine, Canvas, focused failure-safety, typecheck, and DB/API production-build gates pass. See [B33 acceptance](ai/acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — production scanned-PDF Reviewer generation is durable and memory-safe.** The synchronous request now stores only a durable Canvas source reference; checkpointed workflow steps perform page inspection, OCR, ordered source assembly, attachment, and AI generation. READY deployment `dpl_EekcdmCmpfdoobvYouekuXrUmMEd` completed fresh 16-page job `a85bd672-2aed-401b-a37e-fd1c794d826f`, attaching 6,757 ordered OCR characters and persisting `Reviewer in Journaling and Basic Accounting`. The authenticated realme RMX3151 showed background continuation, Queue completion, meaningful Reviewer rendering, and Library reopen after force-stop/relaunch. Full API and engine regressions pass. Direct service-role DB metadata inspection was unavailable because the local Vercel environment pull returned secret references rather than decrypted Supabase values; production workflow logs and physical app behavior provide the durable-result evidence. See [B32 acceptance](ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance, with B33 only if a new DOCX/PPTX defect is proven.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — production Student paths now accept fresh Canvas text PDF, DOCX, PPTX, and Page Reviewers end-to-end, including Queue/background continuation, owner-authenticated persistence, physical Library open, and force-stop/relaunch retrieval.** B31 expanded synchronization to concluded FL 100 and CIT5 courses without modifying Canvas. It found and repaired one exact administrative-module routing gap; commit `9e29d84` is live in READY deployment `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`, and physical Generate now excludes the eight-item FL 100 Course Information module while retaining 29 lesson materials. The genuine 16-page Accounting scan reaches `PDF · ready`, then both generation submissions are killed for production OOM before durable job creation. Deep internal provenance/byte/signature fields were not safely inspectable, and no eligible instructional image exists. See [B31 acceptance](ai/acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — production contains B29's direct-module image routing guard, and its negative behavior is physically accepted.** READY deployment `dpl_3LCFzi9ao68Upsiir8GFL1kroX82` serves the canonical URL and passes health. Fresh normal-device synchronization completed for CC13, CC16, CC17, and CIT6. CC16's administrative APA image and five ungrouped CC13 artwork/profile files stayed out of Generate, while announcements and assignments remained on their expected surfaces. The Student-only account cannot create the positive direct-module fixture. Instructor cooperation and sandbox access will not be pursued, and this external Canvas-permission limitation does not block the student product roadmap. No product repair or Canvas mutation was made. Required tests, typecheck, lint, and the isolated production API build pass. See [B30 acceptance](ai/acceptance/b30/canvas-instructional-image-production-acceptance.md). Next: B31 student-accessible Canvas material acceptance.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — the production Google Vision path and OCR-derived Reviewer flow are proven on physical Android, but Canvas learning-image discovery is not physically accepted.** A real image-only Hiragana PDF completed 1/1 OCR page with 688 characters, fresh generation, owner-linked persistence, and Library reopen. A real Piaget JPEG completed live image OCR with 965 characters and the same fresh generation/retrieval path. Canvas images are intentionally supported only when a direct module File placement establishes learning intent and administrative routing does not exclude them. B29 repaired a false-positive gap by excluding ungrouped artwork; no suitable synchronized teaching image exists to exercise the Canvas route. A larger 16-page image-only scan stalled during inspection and was cancelled safely. Package tests, OCR tests, typecheck, lint, and isolated production API build pass; the known local `expo-router` root-build issue remains. See [B29 acceptance](ai/acceptance/b29/live-ocr-learning-image-acceptance.md). Next: B30 production acceptance with one consented direct-module Canvas instructional image.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — the production Canvas PDF, PPTX, and Page source paths completed fresh Reviewer jobs on the authenticated realme and reopened in Library.** Read-only database checks found 7,984/9,873/8,227 source characters respectively, matching source versions, Canvas provenance, persisted results, and owner links. The OOXML DOCX extractor produced readable text from a local fixture; no Canvas DOCX learning file was present. Scanned PDF and meaningful image OCR were not run live, though the existing Google Cloud Vision paths and failure behavior pass automated tests. B27 remains the active READY production deployment. No code or schema repair was made; the B27 migration-history mismatch still blocks a future CLI push until reconciled. See [B28 acceptance](ai/acceptance/b28/ingestion-document-format-acceptance.md). Next: B29 scanned-PDF/instructional-image OCR acceptance.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 student-facing Canvas announcements are deployed and physically accepted.** The production schema supports author and attachment metadata without changing RLS or grants; deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT` is READY and healthy. A signed B27 APK preserved the realme's authenticated session, and fresh sync plus physical Today/list/detail/native-text/Canvas-handoff and routing checks passed. Live announcements have no body links or attachments. The remote migration-history version differs from the local filename and needs reconciliation before a future CLI push; the applied schema is verified. See [B27.1 acceptance](ai/acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** The final production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v` is READY and healthy. Physical standalone validation confirms study Pages/PDF/PPTX in Generate, Canvas assignments in Tasks, announcements excluded from Generate/Tasks, and the retained CIT6 orientation PDF excluded after normal synchronization. Generic Activity prompt repairs preserve mandatory non-text/count/format/reference requirements and use editable sentence starters instead of inventing personal facts. Five completed assignment types passed their prewritten checklists; one scenario-dependent type stopped before generation because its referenced Group Announcement was unavailable. Automated and production gates pass apart from the existing local Expo external-link limitation. See [B26.1 acceptance](ai/acceptance/b26.1/deployed-routing-and-activity-reliability.md).

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The existing preview APK was verified to contain the generation-cache repair, installed with app data preserved on the realme RMX3151, and launched directly outside Expo Go. Authentication/Canvas, fresh Reviewer/Quiz/Activity jobs, server Quiz scoring, Queue, Library and all three artifact reopens passed through cold relaunch. A read-only trace confirms AI-first production ownership for all three generators. Production health/protected-route checks and fresh mobile regressions pass. See [B25.3.4 acceptance](ai/acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Historical PARTIAL entries below remain as checkpoints, not current status.

## B25.4 physical-device acceptance (2026-09-16)

Physical realme RMX3151 / Android 13 acceptance reached the production AI-first API for a real CIT6 Reviewer and five-question Quiz plus a real CC16 Learning Contract Activity. All three completed in Queue and reopened from Library; the Quiz attempt scored 5/5 on the server and its result reopened. A malformed mobile generation-admission cache initially blocked Quiz submission and is repaired in `9bdc03e`, with regression coverage and a successful Expo Go physical retest. Full post-fix regression passes. A patched preview APK build is pending install/retest; therefore B25 remains **PARTIAL** and B26 may not begin. See [B25.4 device checkpoint](ai/acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](ai/acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

Quiz repair now uses structured finding-specific feedback, direct correction, full same-support reauthoring, alternate unused support, source-affordance difficulty planning, immutable accepted questions, and deterministic academic-value checks. All fresh package/root gates pass, and the second/final bounded synthetic-live validation accepted all five questions. Commit `bd5eb15` is deployed as production `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` (`READY`, healthy canonical alias).

The one authorized authenticated real-lecture retest still ended `repair_exhausted`: 1/5 accepted, with four slots pending after alternate-support repair. No Quiz artifact reached Library, so take/submit/score/result/reopen remain unaccepted. **PARTIAL — Quiz semantic convergence remains incomplete.** No gates were weakened, no retry was submitted, and B26 was not started. See [B25.3.1 report](ai/acceptance/b25.3.1/quiz-semantic-convergence.md).

## B25.2.1 Generation orb animation repair (2026-09-14)

The Generation orb now uses independently animated halo, deforming body, spectrum wash, highlights and orbital light rather than moving one static SVG composition. Press/hold compresses and brightens it; tap pulses; blur, background, terminal state and unmount stop the native-driven loops; reduced motion holds a stable phase.

Fresh verification: Mobile 481 tests in 40 files, mobile typecheck and lint passed. Physical realme RMX3151 profiling recorded 0.51% janky frames with 14 ms p99 over 1,177 frames, no temperature rise, and one frame over 10 seconds after navigating away. **PASS — the focused orb repair is accepted; B25's separate Quiz-generation acceptance remains PARTIAL and B26 was not started.** See [B25.2.1 report](ai/acceptance/b25.2.1/generation-orb-repair.md).

## B25.2 core UI visual repair (2026-09-14)

Implemented compact shared controls/surfaces, quieter bottom navigation, detailed Today ring, material/task/artifact rows, compact Queue and a layered Generation orb. Three screenshot cycles preserve the accepted fixture data; final reference comparisons and a real bottom-navigator web preview are saved for human review.

Fresh verification: mobile 477 tests; mobile typecheck; forced root typecheck, lint and build all 7/7 with zero cached tasks. Sixteen browser interaction checks passed. Backend behavior and unrelated persistence/workflow changes are preserved.

PARTIAL — implementation improved but visual convergence still requires work. The orb remains more geometric than the reference; populated Today and native typography/motion remain unverified because the connected realme is locked. No B25.1 or B26 work starts automatically. See [B25.2 report](ai/acceptance/b25.2/final-comparison-v2.md). This status supersedes the earlier B25 next-step guidance below.

## B25 mobile redesign foundation (2026-09-13)

Implemented the Today / Generate / Tasks / Library shell, shared light/dark/system themes, interactive day-ring planner entry, hidden durable Generation/Queue, Canvas material actions, Activity Maker entry and saved-artifact consumption. Existing deep functionality remains reachable. No production AI model, schema or planner changes.

Automated verification is passing; physical acceptance is pending because the connected realme remains locked. Component-only dark/light renders were compared with the approved references. Hosted B24.6/B24.7 rollout is not certified by this mobile work. B25 is PARTIAL until authenticated device validation is completed; then proceed to B26 deep screens and advanced animation polish. See [B25 acceptance](ai/acceptance/b25/ui-redesign-foundation.md).


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
See [B24.5 contract](ai/acceptance/b24-5/backend-ui-contract.md) and [verification](ai/acceptance/b24-5/verification.md).


## B23 mobile recovery foundation — current result (2026-09-12)

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** Canvas Reviewer creation now persists a minimal owner/source/job recovery record before submission, reconnects the exact durable job after backgrounding or Android process death, retains identity through temporary network errors, fails closed on unsafe state, and makes snapshot-bound Library saves replay-safe. Production physical acceptance on a realme RMX3151 / Android 13 proved background/foreground, running-job force-stop/relaunch, network interruption/recovery, large text at font scale 1.35, automatic save, and Library reopen without regeneration. Exactly two intentional jobs produced two distinct snapshots and one saved Reviewer per snapshot. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and forced root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

Next milestones: B24 — Complete Stay Focused V2 mobile UX/UI redesign specification; B25 — Design system + app shell implementation; B26 — Core experience redesign; B27 — Remaining application redesign; B28 — Full design QA + pilot freeze.

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — B22 mobile Canvas-to-Reviewer study workflow is proven end-to-end on physical Android.** The normal path is now Study materials → material → Create Reviewer → automatic save → Library → reopen. Course diagnostics are disclosed instead of leading, Canvas materials retain module order, Ready/Prepare/PPTX-DOCX unsupported/empty states are explicit, and the accepted single-source snapshot/durable-job architecture remains intact. Physical production acceptance used the real 23-page CIT6 PDF and created one fresh 20-section Reviewer with 1.00 coverage/grounding, zero grounding/fabrication/leakage issues, automatic snapshot-bound persistence, and reopen without a second job. Fresh Canvas 73/73, API 626/626, mobile 389/389, engine 606/606, and root gates pass. No API, engine, Supabase, or Vercel deployment change was required. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 Canvas learner-material ingestion is proven end-to-end on physical Android.** Production exact module resolution persisted real learner materials for all three selected courses despite broad Files (`canvas_permission_denied`) and Pages (`canvas_resource_not_found`) failures. Two production-only database contract gaps were repaired and regression-covered: the exact-resource sync-unit allow-list and the stale five-page reviewer-snapshot limit. A genuine 23-page CIT6 Canvas PDF was resolved from its module, stored privately, extracted as 23/23 native-text blocks, generated into a grounded 20-section Reviewer (coverage/grounding 1.00, leakage passed), rendered on a physical realme Android 13 phone, saved, and reopened from Study Library. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass; production is healthy at the canonical Vercel URL. PPTX/DOCX remain intentionally unsupported and broad Canvas limitations remain honest partial-sync warnings. Next: start B22 only as a separate scope. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** The current `main` app launched on a physical realme RMX3151 / Android 13, restored its Supabase session, selected real 15-page and 55-page learner PDFs through Android Files, created authenticated durable jobs against the deployed Vercel API, completed the production `gpt-4o` Reviewer workflow, rendered 5-section and 14-section grounded results, saved them, and reopened them from Study Library without regeneration. Live missing-token, owner-filtered invalid-source, rapid-double-tap, and recoverable network-failure checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root typecheck/lint/build pass; lint retains four existing warnings. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas-backed learner-material selection remains unvalidated: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source. Current Canvas ingestion also lacks DOCX/PPTX parsing. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next: Canvas learner-material access and ingestion validation. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

## B19.3 grouped-median repair — current result (2026-09-09)

**PASS — B19.3 grouped-median demo blocker cleared.** A deterministic display graph uses frozen source-member boundaries to separate definitions, formula components, objectives, captions and ordered tables while preserving every factual owner. Targeted live and full frozen B12 generation reruns pass all four routes: 533/533 targets, coverage 1.00, grounding 0.99/1.00/1.00/1.00, zero issues/omissions/fabrication/retries/fallback and automatic usefulness PASS. Grouped-median manual usefulness PASS; other cases have no new regression, with their explicitly pre-existing non-blocking presentation and cache limitations retained. This does not claim those historical strict polish failures are repaired. Fresh engine 606/606 (14 new regressions), architecture 157/157, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Sources, plans, manifests, residuals, hashes and typed payloads match B19.2. Runtime model gpt-4o, parser default legacy and OCR/extraction unchanged; no push. **YES — REVIEWER DEMO BLOCKER CLEARED.** Next: real mobile end-to-end Reviewer validation. See [B19.3 acceptance](ai/acceptance/b19-3/grouped-median-composite-repair.md). Earlier phase entries below are historical.

## B19.2 final presentation cleanup — current result (2026-09-09)

**FAIL — demo-blocking presentation defect remains.** Final live gpt-4o preserves 533/533 targets, grounding 0.99/1.00/1.00/1.00, zero omissions/fabrication/retries, and passing assembly. All four automatic usefulness checks now pass. Source-owned navigation edits, exact display deduplication, ordered-table ownership and conservative fragment repairs improve presentation; strict manual review still fails. The one pre-demo engine blocker is the MinerU grouped-median composite that mixes definitions, exercise text and table-heading fragments. Other remaining prose imperfections are non-blocking; frozen code/cell damage is not reconstructed. Full B12: NOT RUN — targeted prerequisites failed. **NO — DEMO BLOCKER REMAINS.** FRESH engine 592/592, architecture 143/143, reader 32/32, API 607/607, forced root typecheck/lint/build PASS; four existing lint warnings unchanged. Parser default legacy, production gpt-4o and OCR/extraction unchanged; no push. Next: repair only that grouped-median composite while preserving frozen source owners. Do not start general architecture work or another model comparison. See [B19.2 acceptance](ai/acceptance/b19-2/final-presentation-demo-readiness.md). Earlier B16–B19.1 entries below remain historical evidence.

## B19.1 runtime-model escalation — current result (2026-09-08)

**FAIL — presentation defects are model-independent.** Frozen B19 runs on `gpt-5.6-terra` and `gpt-5.6-sol`, plus one Sol replication, preserved 533/533 targets, grounding, zero omissions/fabrication/retries, and passing assembly. Neither candidate materially removed Python source dumps/lecture wording/repetition or Statistics fragments/instructional presentation; Sol's isolated Accounting grammar repair reverted in replication. Production remains `gpt-4o`; OCR/extraction is unchanged and no document was re-extracted. Fresh engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19.1 acceptance](ai/acceptance/b19-1/runtime-model-escalation-demo-readiness.md).

## B19 local repair — current result (2026-09-08)

**FAIL — Reviewer source completeness/presentation defect remains.** Source-owned residual evidence restores both real Docling definitions without changing the 533 frozen targets, hashes, ownership, parser default legacy, or gpt-4o. All four cases now have zero omissions and pass assembly; all Statistics SOURCE_DUMP findings are resolved. Calls are 2/2/2/1, with zero factual/explanation retries or replacements. Python/MinerU/Docling still fail serialized automatic usefulness; all four fail manual quality for residual fragments/repetition/grammar. Full unchanged B12: NOT RUN — targeted prerequisites failed. FRESH engine 547/547, architecture 98/98, reader 32/32, API 607/607, and forced root typecheck/lint/build PASS. No push. See [B19 acceptance](ai/acceptance/b19/source-span-ancestry-completeness.md).

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
See [B18 acceptance](ai/acceptance/b18/composite-source-presentation-source-item-alignment.md).


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
See [B17 acceptance](ai/acceptance/b17/reviewer-explanation-evidence-presentation.md).


Last refreshed: 2026-09-08, Asia/Manila.

## Repository

- Authoritative branch: `main` in `C:\Projects\stay-focused-v2`.
- R5 started from `31522d840fd415267b048408ba0317587d4cafab`; implementation
  commit `3b5f21f` adds the owner-scoped task and deterministic study-plan
  foundation.
- Local `main` contains the R5 implementation, Gap A/Gap B, and acceptance
  documentation commits and remains unpushed. Gap B hosted acceptance began at
  `792205d` with a clean tree, 45 commits ahead and 0 behind `origin/main`.
- R8 started from clean `dbf5e039f345f95986d810bb353c83b5b85487ca`,
  55 commits ahead and 0 behind `origin/main`. Implementation commit
  `69ea697ee916adb0e928171b4d0afdc792b92da0` exposes the existing Canvas
  structured-block/selective-preview contract in the Android reviewer flow.
- Consolidated Reviewer Android acceptance started at `e23ef61` on `main`, 62
  commits ahead and 0 behind `origin/main`, with three preserved in-scope UI
  edits already present in the working tree.
- Recovery branches/tags remain preserved. Generated Next build drift was
  removed before the R5 implementation commit.

## Deployment and completed development phase

- The separate Vercel prototype at
  `https://stay-focused-v2-prototype.vercel.app` reports healthy V2 status.
- Canvas Phase 5F.1 and Phase 5F.2 are complete and hosted validated. Canvas
  content/grade synchronization is server-owned, durable, resumable, bounded,
  owner-scoped, and manually initiated.
- Phase 6 is in progress locally; Phase 7 has not started.

## Recovery and active implementation

- B16.1 attempt 3 on 2026-09-07 has working OpenAI capacity but FAILS live
  acceptance. All four targeted cases retained every deterministic target
  (99/99, 232/232, 156/156, 46/46), with zero provider losses or factual retries.
  A regression-backed generic prompt correction reduced Python from six calls
  and eight fallback explanations to four calls and two fallbacks (10.383 s).
  Statistics remains withheld for grounding omissions/structural noise;
  Accounting assembles in 5.824 s but has fragmentary prose and raw table dumps.
  Manual quality fails, so full frozen B12 was not eligible. Fresh engine
  476/476 (architecture 27/27) and API 607/607 pass. Preserve the frozen gates;
  next: reconcile the generic explanation/evidence presentation contract with
  the existing validation rules, using these captured failures. No B17, parser
  promotion, evidence-ownership change, or push. See
  `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.
- Reviewer B16 deterministically assembles required facts, list items,
  formulas/results, tables/rows, code, relationships, titles, and provenance.
  OpenAI owns only bounded batched explanations; ownership and prose validation
  are separate and runtime/request metrics are explicit. Focused 26/26, engine
  475/475, API 607/607, and all root gates pass. Live acceptance is unresolved:
  Python returned permanent no-credit 429s. Its two-call, zero-retry fallback
  preserved 99/99 targets in 5.432 s, but Statistics, Accounting, and full B12
  were not run. Production remains `legacy`. See
  `docs/ai/acceptance/b16/reviewer-deterministic-evidence-runtime.md`.
- Reviewer B15 makes source sufficiency a Stage 2 planning concern. Explicit
  source nodes are deterministically classified as standalone, structural,
  typed evidence or unsupported; non-standalone nodes retain hierarchy and
  exact evidence ownership without provider calls or fabricated explanations.
  B15 passes 12/12 focused regressions and the full 449/449 engine suite. Fresh
  targeted acceptance remains failed: Python preserves 99/99 targets but is
  withheld for instructional noise; Statistics/MinerU preserves 211/232,
  Statistics/Docling 152/156 and Accounting 35/46, all with zero fabrication
  failures. The full B12 rerun was not eligible. Production remains `legacy`.
  See `docs/ai/acceptance/b15/reviewer-section-planning.md`.
- Reviewer B14 hardens explanation form and targeted repair while retaining all
  B13 safety gates. The new 12/12 suite and full 437/437 engine evaluations pass.
  Acceptance remains failed: exact B13 candidates are still withheld, and
  source audit proves two planned Python sections are heading-only while two
  additional sections are code-only. B14 made no fresh provider calls and did
  not fabricate prose. See `docs/ai/acceptance/b14/reviewer-explanatory-repair.md`.
- Reviewer B13 adds stable required-evidence manifests, structured row/cell
  provenance, source-absent preflight refusal, exact-target bounded repairs and
  final deterministic usefulness gates. Empty-child semantic group labels no
  longer disappear from extractive fallback. All **425/425 engine evaluations**
  pass, but the Reviewer acceptance milestone remains **failed**: provider
  omissions and non-explanatory/source-dump candidates are still withheld.
  Earlier live metrics and final-code candidate replay are distinguished in
  `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`. No full B12
  rerun is claimed after failed targeted prerequisites. Parser default remains
  `legacy`; B11 gates and B12 durable typed-block preservation remain intact.
- Reviewer Benchmark B12 completed the full frozen B8 corpus in hybrid mode and
  failed acceptance. A minimal Stage 0 fix now preserves non-legacy typed blocks
  after durable metadata rehydration; its regression raises engine evaluations
  to 406/406. The post-fix durable run produces Python's expected 13-section
  plan, while Statistics and Accounting remain safely withheld for missing
  generated source evidence. Manual Python inspection also finds title-only
  explanations, activity leakage into key points, and excessive source-like
  lists despite 1.00 coverage/grounding. No fabrication was allowed, and the
  production parser default remains `legacy`. See
  `docs/ai/acceptance/b12/full-b8-hybrid-acceptance.md`.
- Reviewer Benchmark B11 is complete locally. Typed heading roles now use
  hierarchy, repetition, lexical/body, neighbor, and subordinate-evidence
  signals; furniture and instruction labels fold into their supported parent
  without losing source blocks. Same-parent repeats consolidate without numeric
  suffixes. Plan-level typed evidence groups carry formulas, tables, exact
  cells, code, and result statements through generation and grounding. Stage 6
  now rejects objective malformed student-visible structure.
- Live Python Docling assembles 13/13 clean concepts with 1.00 coverage and
  grounding and none of B10's furniture, malformed fragments, or repeated
  suffixes. Central-tendency Docling issues fall from 41 to 4 and MinerU from
  40 to 2, all omissions with zero fabrication failures; both remain safely
  withheld. Accounting numeric provenance remains Docling 41/41 and MinerU
  32/32. The production parser default remains `legacy`.
- Reviewer Benchmark B10 is complete locally. The API can now route PDF bytes
  through a feature-flagged, provider-independent `StructuredDocument`
  boundary with legacy, Docling, and MinerU adapters. Typed headings,
  paragraphs, lists, code, formulas, tables, images, reading order, hierarchy,
  parser diagnostics, and block/cell provenance reach Stage 0 without first
  being collapsed into Markdown. The production default remains the existing
  extraction/Google OCR path; external parser failures and quality failures
  fall back deterministically and expose only safe diagnostics.
- B10's sanitized three-class fixtures and router regressions pass without
  downloading parser models. Live A/B evidence is mixed: Docling materially
  improves code-heavy source structure and title quality, while MinerU's
  Python reviewer is withheld by grounding; all three central-tendency
  reviewers are withheld despite substantially better typed formula/table
  evidence. The scanned accounting source routes through MinerU into the
  shared contract without Google credentials, but known missing/misread cells
  remain unsynthesized. B11 now addresses the downstream hierarchy and
  grounding layer without another parser-specific mapping.
- Reviewer Benchmark B4 is complete locally. Stage 4 now scores unique
  source-derived semantic targets, while Stage 5a independently rejects wrong
  definition, parent-child, step-order, example, cross-concept, and sibling
  relationships. Relationship failures remain section-bounded and now produce
  field/type-specific retry guidance. The exact Intro to IT Security PDF
  retains B3's 17 titles and all 17 sourceCore payloads, passing 110/110 semantic
  targets, 1.00 coverage, 1.00 grounding, zero relationship issues, leakage,
  17 calls, 0 retries, and 0 fallbacks. The Google credential exposed during B3
  still requires authorized operational rotation; B4 did not inspect or reuse
  it. See `docs/ai/benchmarks/intro-it-security/benchmark-b4.md`.
- Reviewer Benchmark B3 is complete locally. Stage 2 now carries an optional
  source-derived semantic plan and distinguishes conceptual enumerations from
  procedures; Stage 3 preserves definitions, supported category groups,
  ordered steps, and explicit examples while allowing useful direct-source
  explanations and avoiding filler. The real 32-page Intro to IT Security run
  retains B2's 17-section outline and passes with 17 calls, 0 retries, 0
  fallbacks, 1.00 coverage, 1.00 grounding, and leakage passing. Page 10 visual
  labels and page 14 hierarchy edges remain explicit extraction gaps; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b3.md`.
- Reviewer Benchmark B2 is complete locally. Production PDF extraction now
  preserves normalized page blocks through mobile job submission and durable
  worker storage into generic engine source blocks. Page-aware Stage 0/1
  classifies title/divider/reference noise, recognizes page-leading academic
  headings, merges repeated continuation slides, and keeps distinct concepts
  separate without changing Stage 3. The real 32-page Intro to IT Security run
  now produces the approved 17-concept outline instead of the B1 giant Domains
  span and noise sections; see
  `docs/ai/benchmarks/intro-it-security/benchmark-b2.md`.
- The R6 reviewer-core capstone audit is accepted. The complete supported path
  is source intake or synchronized Canvas selection, editable preparation,
  grounded Stage 0-6 generation, durable progress, reviewer reading, save, and
  Study Library reopen. A fresh linked-project Canvas run passed selection,
  OpenAI generation, immutable provenance, persistence, source health, owner
  isolation, and zero-residue cleanup.
- Two reviewer defects were hardened: saved PDF metadata now matches the
  durable 100-total-page policy instead of rejecting page counts above five,
  and reviewer results opened from completion routing can be titled and saved
  from Processing, including their Canvas snapshot.
- The R8 Canvas mobile gap is closed and physically accepted. A synchronized
  source now resolves to server-owned structured blocks, honors the server
  default selection, supports ordered subset selection and a zero-selection
  guard, creates an authoritative selective preview, and hands its preview
  session/fingerprint into the unchanged durable generation path. Changing the
  selection invalidates the old preview and requires a new one.
- The physical R8 run selected three of nine returned blocks. The resulting
  durable job completed 1/1, recovered through Processing after force-stop,
  saved as `Capstone Selective Canvas Reviewer`, and reopened from Study
  Library without regeneration. Its immutable snapshot records exactly three
  ordered paragraph blocks (source block ordinals 5, 6, and 7), the
  selective-preview parser/normalization versions, hashes, no OCR, and
  `wasEdited = false`.
- Consolidated Reviewer UI acceptance is complete on realme RMX3151 / Android
  13. Pasted text, gallery, camera, PDF, Canvas selection/preview, a real durable
  generation, Processing, Reader, save, immediate Library refresh, reopen,
  rename, native delete Cancel/Confirm, and both Back paths passed. The run fixed
  blank-source/footer readiness and saved-Reader Android Back behavior without
  changing reviewer architecture or persistence semantics.
- Capstone development R5 is complete and live accepted: manual task CRUD,
  persisted Canvas-assignment import, deterministic preview/apply planning,
  study-session persistence/edit/delete, and two-user denial coverage are in
  place and passed against linked Supabase. Final verdict: PASS.
- The R6 replanning prerequisite (Gap B) is implemented and hosted accepted.
  Study sessions have `planned`, `completed`, and `skipped` lifecycle state;
  applying a range serializes per owner and atomically replaces only
  intersecting planned rows, preserves terminal history, and rejects
  overlapping new proposals.
- Live acceptance exposed one R5 runtime defect: PostgreSQL returned persisted
  timestamps with microsecond precision while the shared ISO validator allowed
  at most milliseconds. The parser now accepts valid fractional precision and
  a regression test covers the live format.
- Product Recovery R1-R5 is complete. R6 is partial: automated checks pass,
  while Dynamic Type, VoiceOver, interruption, navigation/reconciliation, and
  save-flow behavior still require physical iPhone observation.
- Durable document jobs now accept at most 100 total PDF pages and at most 40
  pages that require OCR. Native-text and confirmed blank pages do not consume
  the OCR allowance; synchronous and Canvas extraction remain capped at 40
  total pages.
- API and mobile errors are sanitized, native text is inspected before OCR,
  OCR fan-out remains bounded, and Vercel Workflow owns accepted processing.
- The EAS preview APK was built and installed on a physical Android device.
  Android authentication and hosted API connectivity passed. The specific
  durable 41-100-page native-text and >40-OCR-required-page matrix remains.
- R8 EAS internal preview build `ab67feeb-0f61-4d6c-b24c-a7c5658ac050`
  (Stay Focused V2 2.0.0, build 1, commit `69ea697`) was installed with
  `adb install -r` on the realme RMX3151 / Android 13. Authentication and the
  existing session survived replacement. No API code changed, so the verified
  production deployment remained in use.
- Reviewer acceptance EAS build `b625303b-943e-45a1-89da-e50c33fbba1b`
  (Stay Focused V2 2.0.0, build 1) was installed with `adb install -r` on the
  same device. Authentication and the two pre-existing saved reviewers survived
  replacement; the hosted preview API remained reachable.

## Deterministic test baseline

- B15 verification passes 449/449 engine evaluations (B15 12/12, B14 12/12,
  B13 19/19) and 607/607 API tests across 69 files. Root typecheck, lint and
  build pass for 7/7 workspaces; four established mobile import-order warnings
  remain. Fresh targeted provider runs completed but all four Reviewers were
  safely withheld, so the full B12 rerun was not run.
- B11 verification passes 405/405 engine evaluations (all prior 396 remain)
  and 607/607 API tests. Engine and full repository typechecks pass; builds
  pass; lint retains only the four accepted mobile import-order warnings. B10's
  unchanged adjacent baselines remain 1/1 durable workflow and 10/10 focused
  mobile parser handoff tests.
- Shared: 32/32, including the PostgreSQL microsecond timestamp regression;
  targeted Gap A/Gap B API/database/session coverage: 27/27; mobile: 216/216;
  reviewer engine: 343/343 deterministic evaluations after B4 semantic
  coverage, relationship, fault-injection, and retry-diagnostic regressions.
  These suites were rerun after hosted acceptance.
- Forced root typecheck and lint pass fresh for 7/7 packages with zero cached
  tasks; lint retains only the four known mobile import-order warnings. DB and
  API production builds pass.
- Full API regression is 576/577 after two new reviewer-save boundary tests.
  The only failure matches the documented
  pre-existing Windows CRLF-sensitive Canvas SQL substring baseline; the SQL
  semantics and all planning tests pass, so it is not a Gap B product defect.
- R8 verification passed: mobile 278/278, Canvas 72/72, targeted Canvas
  structure/selective-preview/generation/freshness/provenance API tests 43/43,
  fresh forced root typecheck 7/7, fresh forced root lint 7/7, `git diff
  --check`, and `git fsck --full`. The four previously accepted mobile
  import-order warnings did not appear in the R8 lint run and no new warning
  was introduced.
- Consolidated Reviewer acceptance verification passes mobile 373/373, focused
  Reviewer/Library 108/108, mobile and root typecheck/lint, `git diff --check`,
  and `git fsck --full`. Lint retains only the same four accepted mobile
  `import/first` warnings.

## Migration status

- The four proven Canvas metadata aliases were reconciled through supported
  `supabase migration repair` metadata operations only:
  `20260728022127` to `20260728094421`, `20260728024021` to
  `20260728104000`, `20260728131529` to `20260728201000`, and
  `20260728133821` to `20260728213700`. No historical SQL was edited or
  replayed and no Canvas schema object was changed by the repair.
- Forward-only migration
  `20260827155438_task_study_plan_foundation.sql` is the applied R5 foundation.
  It creates `tasks`, `study_plans`, and `study_sessions` with owner-safe
  foreign keys, RLS policies, service-only RPCs, and supporting indexes.
- Forward-only migration
  `20260828173643_replace_planned_study_sessions_on_replan.sql` is applied to
  linked Supabase. A CLI 2.116.0 dry-run proposed only this migration; final
  local/remote history matches through `20260828173643`.
- Hosted catalog inspection confirmed the non-null `planned` status default and
  lifecycle check, partial planned-session index, owner-serialized replacement
  function, safe search path, `SECURITY INVOKER`, service-role-only execution,
  enabled RLS, and unchanged owner policies.
- Dedicated two-user runtime acceptance passed first apply, same-window
  reapply, no duplicate active schedule, completed/skipped preservation,
  owner-scoped status PATCH persistence, overlap rejection with no partial
  writes, cross-owner API/RLS denial, two concurrent RPC applies, and the Gap A
  embedded-task/full-PATCH response contract. Temporary users and rows were
  removed; `tasks`, `study_plans`, and `study_sessions` counts returned from
  0/0/0 to 0/0/0.
- Supabase CLI 2.116.0 dry-run proposed only the R5 migration. The linked push
  applied only `20260827155438`, and final linked history records it as
  `task_study_plan_foundation`.
- Live schema checks passed for constraints, indexes, owner RLS, grants,
  triggers, and service-only security-invoker import/apply RPCs. Live CRUD,
  Canvas import/idempotency/edit preservation, deterministic preview, atomic
  apply, study-session behavior, and all eight API plus RLS/database isolation
  attacks passed. Dedicated test users and rows were removed; R5 table counts
  returned from 0 to 0.

## Known risks and immediate task

- Recommended next task: reconcile heading-only planned sections with the
  source-faithful explanatory contract. Do not borrow child content, fabricate,
  weaken usefulness, or change the parser default. Targeted acceptance must pass
  before the unchanged full B12 rerun.
- Recommended next task: run the same reviewer benchmark on the Firewalls PDF
  to test whether the B3 generation structure and B4 semantic verifier
  generalize beyond Intro to IT Security.
- The Google service-account credential exposed during B3 requires authorized
  operational rotation. Do not inspect, print, copy, or commit the existing
  value while remediation is pending.
- Reviewer-core limitations are documented in
  `docs/ai/reviewer-core-capstone-acceptance-20260828.md`; notably, fresh camera
  and long-document device acceptance was not repeated, and a cold-start
  non-Canvas result conservatively loses its gallery/camera/PDF mode label when
  saved from Processing. Content and reopen behavior remain intact.
- Supabase warn-level advisors report only legacy non-Gap-B findings: four
  `reviewers` RLS init-plan performance warnings plus older function/Auth
  security warnings. No warning names the Gap B status/index/apply objects.
  Address unrelated findings only through separately scoped work.
- Physical-device acceptance debt remains for Product R6, readable camera OCR,
  the durable long-document Android matrix, and notification registration,
  delivery, and routing. Persisted Processing/relaunch recovery is accepted and
  does not depend on notifications.
- `npm audit` reports 0 critical, 6 high, and 32 moderate findings; the direct
  production high is `next`, and remediation is a separate recovery task.
- Provenance of tracked historical academic live-output artifacts is not
  established; preserve them and complete a privacy review before removal.

## Authoritative documentation

Use this file for the snapshot, `docs/roadmap.md` for verified phase status,
`docs/ai/current_sprint.md` for the one active objective, and the relevant ADR
for invariants. `docs/ai/handoff.md` is historical evidence only.
