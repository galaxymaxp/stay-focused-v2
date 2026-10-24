<!-- TP1 completion begin -->
## TP1 planning content: LOCAL PASS (2026-10-25)

TP1 is **LOCAL PASS**: the Today clock menu now chooses Reviewers, Tasks or
Reviewers & tasks on web and mobile. The default is both, synced per owner with
durable offline preference writes; API callers omitting mode retain tasks-only
planning. Reviewer candidates follow the current-course/24-hour/order/estimate
rules and the mixed 60% first task budget. Typed reviewer blocks persist,
reopen their saved reviewer and never complete a task. Same-title task/reviewer
identities stay separate. No new reviewer generation or automatic module scheduling.

Implementation `3948a5fec54066f81acb9fccba3c92438e2cd13f` (tree `5184fb0d20be017a62b842afce5c2851431fbf1d`) completes
the interrupted TP1 work frozen at 6c4de7e5. Original runner TP1 FAILED remains
historical; no terminal status was rewritten. [Acceptance](ai/acceptance/tp1-planning-content.md).

FRESH final suites: **5,631 passed / 0 failed / 3 existing live skips**:
shared 772/77 files, API 2508/218,
mobile 1703/180, web 648/82.
Forced typecheck/lint/serial root build each 8/8, 0 cached (7 warnings, 0 errors: six existing warnings and one unused parameter in the TP1 synthetic API fixture); direct API/web builds
and offline Android JS/assets export PASS. Twenty viewport/theme/motion menu
fixtures plus four empty-mode cases PASS (24), zero page errors/outbound calls.
First failures and collector limitations are retained in the acceptance report.

**Owner steps remaining:** apply the forward migration
`20261024000100_today_plan_content.sql` with the next separately authorized
release, then verify all three modes on the website and Realme. Rollout/Device
checks NOT RUN; production/authenticated/native state remains UNVERIFIED.
Offline-only or old-client reviewer reads do not populate server open history.
TP1b closure is **PASS** (2026-10-25): both direct commits are ancestors, all
54 owned source hashes match and the source-only diff is empty. All ten gate
logs and the 24-case synthetic receipt match the pinned acceptance evidence.
These are CACHED in TP1b (verified existing FRESH direct-run results); no
application suite or build was rerun. Fresh bookkeeping diff checks PASS.
Implementation `3948a5fe`, completion docs `8e5c7d53`; the TP1b closure commit
is recorded in Git and `tmp/overnight/TP1b.status`. Original TP1 FAILED stays
unchanged. The finite local scope is closed for Autopilot; no successor or
release is authorized by this closure.
Unrelated owner paths and the historical OX2/OX1 hold remain.
<!-- TP1 completion end -->

<!-- TC2 completion begin -->
## TC2 quiet Today clock: LOCAL PASS (2026-10-24)

Implementation dd3276f3, acceptance freeze 3972501d. On web and mobile, clock
drags (one handle or whole range), taps, keyboard/screen-reader steps and typed
entry stay local until release, then save the range once and run only the
planner preview after 400ms of quiet; the latest commit wins and stale previews
are dropped. Saving no longer changes the Today request key, so overnight
commits stop refetching Today (the "Syncing..." seen). Focus/visibility/poll
reloads and rollover wait while a drag is held; explicit refresh, reconnect,
activation, rollover and Canvas sync completion are unchanged. Mobile's
accessibility step no longer saves twice. No API/data/auth/schema change.

Measured with real clock entry points, before -> after: 3 quick commits sent
3 -> 1 previews; keyboard + typed overnight 4 -> 1 previews and 1 -> 0 Today
reads (web); mobile screen-reader steps 7 -> 4 saves, 4 -> 1 previews, 2 -> 1
Today keys; focus/visibility/poll while held 2 -> 0 reads. Sync calls 0.

FRESH suites **3,090 passed / 0 failed / 0 skipped**: shared 756/76 files,
mobile 1,693/177, web 641/81 (serial). Forced typecheck/lint/serial root build
each 8/8, 0 cached; API/web builds and offline Android export PASS; six existing
lint warnings; both diff gates PASS. An orb-load browser order flake under
parallel load and two stale hook mocks are recorded in the acceptance report.

[Acceptance, counts, attempts and limits](ai/acceptance/tc2-clock-interaction.md).
Endpoint TC2 only. TP1 and the next fullsend remain outside this run.
Rollout/Device checks NOT RUN; website/Realme drag smoothness, served FS10,
production/database/Scheduler state and native assistive technology remain
UNVERIFIED (owner to confirm). All prior records and unrelated owner paths remain.
<!-- TC2 completion end -->

<!-- LM1 completion begin -->
## LM1 mobile course options: LOCAL PASS (2026-10-24)

Implementation 2305e847, acceptance freeze 51a8e326. Mobile Library and all
Generate course groups use 400ms long-press plus the Options accessibility action
to open their existing sheet. The visible dots row/gap is removed. Tap navigation,
pin indicator/swipe controls, full action factories/confirmations/permissions,
owner/route closure and reduced-motion feedback remain. Web keeps its trigger
inside the card at 320/768/1280 and now shows Generate dots on desktop without
requiring hover. No API/data/auth/schema/provider change.

FRESH affected suites **2,294 passed / 0 failed / 0 skipped**: mobile 1,674/176
files; web 620/79 files. Focused mobile 190/15, web 113/11; options 7/2 PASS.
Forced typecheck/lint/serial root build each 8/8, 0 cached; standalone API/web
builds and offline Android JS/assets export PASS. Six existing lint warnings.
32 synthetic browser cases PASS, 0 page errors/outbound requests; required themed
Library and three-width web screenshots retained. Both diff gates PASS. First
test/helper/collector failures and RNW modal release limitation are preserved in
the acceptance report; no native/authenticated PASS is inferred.

[Acceptance, exact commands, attempts and limits](ai/acceptance/lm1-mobile-card-options.md).
Endpoint LM1 only. TC2/TP1 and the next fullsend remain outside this run.
Rollout/Device checks NOT RUN; served FS10/production/database/Scheduler/provider
state, native release/haptics/assistive technology and physical behavior remain
UNVERIFIED (owner to confirm). All prior records and unrelated owner paths remain.
<!-- LM1 completion end -->

<!-- QN1 completion begin -->
## QN1 Queue failure cards: LOCAL PASS (2026-10-24)

Implementation 05102204, acceptance freeze 394d4fa6. Failed/expired entries
now keep kind/title/reason/count and retry/circle controls inside an opaque card
on web and mobile. Latest failure per proven kind/material identity is shown;
history, Clear and retry semantics remain intact. Quiz and unknown-stage reasons
are safe and kind-aware. Full labels and filename extensions survive truncation.

FRESH full suites: **5474 passed / 0 failed / 3 existing API live skips**.
Mobile 1666, web 617, shared 736, API 2455.
Forced typecheck/lint/serial root build 8/8 each, 0 cached; standalone API/web
builds and offline Android JS/assets export PASS. Six existing lint warnings.
32 responsive theme/text cases plus initial/scrolled screenshots PASS; earlier
fixture/collector failures and exact commands are retained in the acceptance.
Both diff checks PASS; unrelated owner artifacts and historical docs preserved.

[Acceptance and limits](ai/acceptance/qn1-queue-failure-cards.md). Endpoint QN1 only; no LM1/TC2/TP1 or release started.
Rollout/Device checks NOT RUN. Served FS10 revisions, authenticated/native/device
and live production state UNVERIFIED (owner to confirm). Owner handles Realme
reviewer+quiz Queue checks and the next separately authorized rollout.
<!-- QN1 completion end -->

<!-- FS8 direct repair begin -->
## FS8 direct readiness repair: readiness PASS (2026-10-24)

All four original blockers have VERIFIED_SUPERSESSION evidence accepted by the
unchanged mandatory validator: ready=true, zero blockers.
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

[Repair and readiness receipt](ai/acceptance/fs8-readiness-repair.md),
[website audit](ai/acceptance/web-a1b-website-audit.md),
[original-pixel correction](ai/acceptance/fs8-resume-evidence-correction.md).
FRESH mandatory readiness PASS at 05017922. Final documentation receipt
is followed by the same CLI on final HEAD; see the repair report.
No FULLSEND, push, deployment, migration, APK install or old-status rewrite.

<!-- FS8 direct repair end -->

<!-- UX3 completion begin -->
## UX3 current LOCAL checkpoint: PASS (2026-10-24)

Implementation 6ee3d7c0, acceptance freeze c5584807. Existing course-arrow removal
is preserved; own-source entry arrows are removed, and web/mobile feedback now
animates within three points per edge, with keyboard/touch cancellation and
static reduced-motion feedback. Routes, titles/counts/order and independent
pin/options action inventory remain. No API/data/provider/dependency change.
[Acceptance, exact gates, failed attempts and limits](ai/acceptance/ux3-card-hover.md).

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
<!-- UX3 completion end -->

<!-- WEB-A1 stopped checkpoint begin -->
## WEB-A1 source preflight: STOPPED (2026-10-24)

The unattended website audit stopped in STEP 0 before design/roadmap comparison.
The explicitly required Claude project directory exists but has no Git checkout,
package.json or apps/web at its root; git -C there cannot resolve branch/HEAD.
This workspace is overnight/2026-10-15_feedback at 84584288, with committed
PBR-UX2 LOCAL PASS. It is not silently substituted for the specified source.
[Source evidence, frozen acceptance and owner question](ai/acceptance/web-a1-website-roadmap-design-audit.md).

Required application tests/builds/typecheck/lint and responsive/accessibility
audits: NOT RUN due to the source STOP. Only scoped documentation/diff hygiene
is verified here; no website acceptance or release-readiness claim. PBR-UX2 PASS,
historical FAILED/STOPPED records, dependencies, owner holds and unrelated files
remain unchanged. WEB-A1 and its dependents remain held pending source resolution.

Owner steps remaining: resolve the authoritative checkout/HEAD, then resume
STEP 0 and freeze the approved design and requested-change inventory there.
Rollout and Device checks NOT RUN, skipped entirely; live/physical state remains
UNVERIFIED (owner to confirm). No service calls, push, deploy, migration or
environment-file changes.
<!-- WEB-A1 stopped checkpoint end -->

<!-- PBR-UX2 completion begin -->
## PBR-UX2 current LOCAL checkpoint: PASS

2026-10-23: Authorized Queue/course-actions slice complete after actual UX1b
PASS. Code 973f3c7f repairs Queue header reflow, replaces only audited navigation
chevrons with bounded transient feedback, and exposes exact existing top-level
course actions in independent accessible menus. Failure reasons/history/retries,
actions/labels/routes, permissions, owner isolation and offline behavior remain.
No backend/data/generation/controller/dependency change. Library tile dimensions
and existing title/footnote limitation remain; Android resume-text stays separate.
[Acceptance, attempts, exact gates and limits](ai/acceptance/pbr-ux2-queue-actions-fix.md).

FRESH full mobile 1,665/176 files, web 580/76, shared 716/74, API 2,455/214:
**5,416 pass / 0 fail / 3 existing live skips**. Focused mobile 181/15 and web
76/9 PASS. Forced typecheck/lint/serial root build each 8/8, 0 cached; standalone
API/web builds and offline Android JS/assets export PASS; six existing warnings.
96 responsive scenarios and 96 motion/text cases PASS; menu/short/scaled flows
12/12, action inventory 57/57 and guard 3/3 PASS. First mobile mock failures,
web 579/1 flake, later mobile 1,664/1 flake and corrected collector attempts are
retained; unchanged full serial reruns pass. No exact flake cause is invented.

Scoped local commits: d9b5a6f0 freeze; 973f3c7f implementation; final documentation
identity in Git/PBR-UX2.status. Original UX1 FAILED and prerequisite/history/owner
inputs preserved. Every mandatory LOCAL row complete; finite UX2 endpoint reached.
No successor/controller/queue/manifest publication or new initiative. OX2 blocked
by OX1 and unrelated Owner Pause remain.

**Owner steps remaining:** Rollout/Device checks NOT RUN, skipped entirely.
Production/database/migration/Scheduler/provider state, authenticated/native
fontScale/assistive technology/focus/targets and physical performance UNVERIFIED
(owner to confirm). RT1/EV1 STOPPED; RT2 physical STOPPED / resume-text INCONCLUSIVE
and deferred unchanged. No push/deploy/service/remote SQL/migration/env-file/
worker/Scheduler/email/OTA/EAS/native build/install/device/spending action.
<!-- PBR-UX2 completion end -->

<!-- PBR-UX1b completion begin -->
## PBR-UX1b current local checkpoint: PASS

2026-10-23: Corrective UX1 audit closure complete; gate repair `80f18fad`
controls browser time only in the existing tap/hold/momentum regression.
Bounded real-clock traces accepted all five taps; delayed scheduling expired
older waves at 1803/1806ms. No production defect/physical performance conclusion.
[Complete audit, exact gates, history and bounded UX2 proposal](ai/acceptance/pbr-ux1-queue-actions-audit.md).

FRESH full web 578/76 files, shared 716/74 and API 2,455/214: 3,749 passed,
0 failed, 3 existing API live skips. Focused orb/browser 124 + shared orb 21 PASS.
Forced root typecheck/lint/serial build 8/8 each, 0 cached; standalone API/web
and Android offline JS/assets exports PASS; six existing lint warnings.
Original UX1 full mobile 1,661/174 and focused mobile 81/web 74 retained, not
rerun. Action 57/57; custody/evidence 2320/2320; original evidence preservation
75/75; guard 3/3; both diff checks PASS. Original 96-scenario findings,
all actions/permissions and exact successor boundary preserved. Completed-header
doubled-text overflow and Library title/footnote limits remain UX2 findings.

Original PBR-UX1 FAILED status and three failed full runs remain unchanged.
This corrective PASS supersedes that failure for UX2 eligibility only; actual
successor admission/approval remains with the supervisor. No UX2 implementation
or runner/queue/controller/manifest change. LR1/prerequisites remain PASS;
scoped local commits and final identities in Git/PBR-UX1b.status. Earlier failed
checkpoint blocks below are historical and do not describe the corrected gate.

**Owner steps remaining:** Rollout/Device checks NOT RUN, skipped entirely.
Production/database/migration/Scheduler/provider state, authenticated browser,
native fontScale/assistive technology/focus/targets and physical performance
UNVERIFIED (owner to confirm). RT1/EV1 STOPPED; RT2 physical STOPPED / resume-text
INCONCLUSIVE and deferred. OX2 blocked by OX1; unrelated Owner Pause preserved.
No push/deploy/service/SQL/migration/env-file/device/native build/install/OTA/EAS/
email/Scheduler/spending action. Finite corrective endpoint reached.
<!-- PBR-UX1b completion end -->

<!-- PBR-UX1 failed checkpoint begin -->
## PBR-UX1 current local checkpoint: FAILED

2026-10-23: Finite owner-authorized Queue/course-actions audit resumed after
interruption at acceptance freeze `ee3bfb8d`; LR1 and all six local prerequisites
remain PASS. [Audit, bounded proposal, exact attempts and limits](ai/acceptance/pbr-ux1-queue-actions-audit.md).
Runtime/source/tests/dependencies/data are unchanged. Existing unrelated owner
files, roadmap holds and historical evidence remain intact.

The source-extracted synthetic comparison covers 96 scenarios at widths
320/360/390/414/768/1280 and normal/doubled text, plus loading/error/offline/empty.
Mobile Queue Completed-header overflow is reproduced at doubled text, with no
default-text reproduction. Historical failed rows establish retained history,
not a current generation defect. Action/navigation source checks 57/57 PASS;
custody/evidence checks 2,321/2,321 PASS, including 36 contrast pairs. Native
accessibility/physical/production behavior is UNVERIFIED (owner to confirm).

**Hard stop: full web suite remains red.** Three completed runs each finish
577 passed / 1 failed (75 files passed / 1 failed). The existing generation
tap-wave assertion at generation-screen.browser.test.ts:252 expects 5 impulses,
receives 4/3/4. Isolated unchanged test passes 1 with 12 filtered skips; that
does not satisfy the full gate. Cause unresolved; no test/runtime workaround.
FRESH mobile full 1,661/174 files, focused mobile 81 / web 74 PASS; forced root
typecheck/lint 8/8 each, 0 cached, six existing warnings. These task runs preceded
interruption. API/Android JS-assets/web/root builds and queued shared/API suites
NOT RUN after the gate stop. No cached predecessor result is claimed as fresh.

PBR-UX1 FAILED holds every dependent successor. Product scope has a bounded
proposal and no unresolved owner decision, but implementation/approval cannot
proceed from this failed verification checkpoint. Next work: separately resolve
the full-web blocker, then resume missing gates and scoped documentation commit.
Only the freeze is committed; final audit/planning/handoff edits remain
uncommitted under the failed-gate rule. No further runtime/roadmap task started.

**Owner steps remaining:** Rollout/Device checks NOT RUN, skipped entirely.
Production revisions/database/migrations/Scheduler/providers, authenticated
browser, native assistive technology/fontScale/focus and physical results
UNVERIFIED. RT1/EV1 STOPPED; RT2 physical STOPPED / resume-text INCONCLUSIVE and
deferred. OX2 remains blocked by OX1; unrelated Owner Pause retained. No push,
service call, deploy, SQL/migration, env-file change, real retry/clear, native
build/install/OTA/EAS/device/email/Scheduler/spending action or release claim.
<!-- PBR-UX1 failed checkpoint end -->

<!-- PBR-LR1 completion begin -->
## PBR-LR1 current local checkpoint: PASS

2026-10-23: Long-reviewer profiling, narrowly supported repair and mandatory
LOCAL gates complete. Implementation `e1bde90c` memoizes only the existing
full owner/reviewer/section/canonical-content React key in both TopicAssist
wrappers. No content, parser, image, selection or export implementation change.
[Acceptance, raw evidence identities, exact counts and limits](ai/acceptance/pbr-lr1-long-reviewer-rendering.md).

Identical public synthetic 0/1/12/120/240-topic schedules preserve all complete
output/segment/anchor/canonical/export-layout hashes and host render/node counts.
240-topic key serializations: mobile 2,640 -> 720; web 2,400 -> 720. Four unchanged
parent updates add 0 after versus 960 calls before in each client. Full exact key
and owner/content resets remain; no truncation, cap or cross-owner cache.
Comparison 771/771 PASS. This proves reduced repeat serialization; mixed host
timings and GC-contaminated heap proxies establish no native/RAM/latency gain.

FRESH full shared 716/mobile 1,661/API 2,455/web 578 = **5,410 passed / 0 failed /
3 existing live skips** (shared includes emitted copies). Focused 362+66 PASS;
corrected probes 2/2 before and 2/2 after. Forced root typecheck/lint/serial build
8/8 each, 0 cached; explicit API/web builds and Android offline JS/assets PASS.
Initial red work-count tests, probe harness failures and first lint 5/8 with 3
new test-style errors are retained; corrected gates green, six existing warnings.
Scoped local commits/evidence custody in Git, acceptance and PBR-LR1.status.

**Finite MB1 -> LP1 -> AS1 -> LR1 LOCAL roadmap endpoint reached.** MB1
instrumentation and AF1 Library coalescing remain prior work; LP1/AS1 findings
remain complete. No next initiative, queue/controller publication or physical
repair retry is authorized. Earlier eligibility/hold wording below is history.
OX2 stays blocked by OX1; unrelated roadmap/Owner Pause and owner artifacts intact.
RT1/EV1 STOPPED; RT2 physical STOPPED/resume-text INCONCLUSIVE and deferred.
Active OTA/runtime/channel/embedded identity, isolation, physical frames/rendering/
RAM, authenticated browser and production state UNVERIFIED (owner to confirm).
Rollout/Device checks NOT RUN; no beta/release readiness. Source 2.2.0/code 6 differs
from archive 2.3.0/code 7. No push/deploy/service/SQL/migration/Scheduler/email/env
file/device/native build/install/OTA/EAS or spending action.
<!-- PBR-LR1 completion end -->

<!-- PBR-AS1 completion begin -->
## PBR-AS1 current local checkpoint: PASS

2026-10-23: APK/source/equivalent Android export investigation and all mandatory
local gates complete. **No safe source/config size correction justified; zero
runtime/asset/font/native/dependency changes, no APK savings claim.**
[Acceptance, exact bytes/hashes, commands and limits](ai/acceptance/pbr-as1-apk-size-optimization.md).

Existing APK stays 132,024,227 bytes, native 93,639,812 across all four ABIs.
Two guarded standalone Android exports are 14,671,618 / 14,671,619 bytes; the
entire +1 byte is a random Hermes debug-filename length difference. All 37 other
files and every remaining HBC byte match after narrowly declared debug metadata
normalization; raw originals retained. Source 65 assets / 5,646,237 bytes unchanged.
Reference audit 67/67 and strict artifact comparison 96/96 PASS. Fonts/glyphs,
media/offline access, all exports/modules/ABIs/signing/OTA semantics preserved.

FRESH shared 716/mobile 1,658/API 2,455 = **4,829 passed / 0 failed / 3 existing live
skips** (shared includes emitted copies). Focused 48 pass; forced root typecheck,
lint and serial build 8/8 each, 0 cached; explicit API and two Android JS/assets
exports PASS. Guard-startup failures and first 39 pass/3 fail raw-comparison
assumption are preserved, corrected and rerun with strict checks. Six existing
lint warnings; no product assertion failure, new skip or observed flake.

Local commits 1831c8c2 and 1320404c plus final documentation checkpoint recorded in
Git/PBR-AS1.status. Original evidence and unrelated untracked owner files kept.
MB1 and LP1 remain completed (LP1 has no further justified Library optimization).
**LR1 follows actual AS1 PASS plus fresh approval**; no LR1 publication/work,
controller/queue change or unrelated task. Earlier eligibility wording below is
history. OX2 stays blocked by OX1; unrelated roadmap and Owner Pause intact.

RT1/EV1 STOPPED, physical RT2 STOPPED /resume-text INCONCLUSIVE/deferred;
active Realme OTA/runtime/channel/embedded identity and safe isolation UNVERIFIED.
Source 2.2.0/code 6 differs from archive 2.3.0/code 7. Rebuilt-native savings,
physical startup/rendering/RAM, authenticated browser and live production state
UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN; no beta/tester/
release readiness claim. No push/deploy/service/SQL/migration/Scheduler/email/
native build/install/OTA/EAS/environment-file action or spending.
<!-- PBR-AS1 completion end -->

<!-- PBR-LP1 completion begin -->
## PBR-LP1 current local checkpoint: PASS

2026-10-23: Library profiling and mandatory local gates complete, **zero runtime
changes; no justified further local optimization**. [Acceptance, samples,
hashes and commands](ai/acceptance/pbr-lp1-library-performance.md).
Baseline MB1 `d8d22603` and AF1 `ef80dfc6` retained. Two repeated public synthetic
cohorts preserve full items/stats/DTO/cursors/hidden IDs. All 0/100/240/300
changed/unchanged hook schedules remain 2 summary/2 aggregate stats/max 1 active.
Each overview uses 8 SQL reads with 1 summary scan; 300-item medians 3.029/3.440ms
without adversarial unmatched overlays, 11.788/11.078ms with the seeded history.
API walks stay 2/2/6/6 vs 7/7/21/21 with 1,000 hidden rows. No production SQL,
physical frame/latency or percent-saving claim; no schema/cache/feature change.

FRESH full shared 716 / mobile 1,658 / API 2,455 = **4,829 passed / 0 failed /
3 existing live skips** (shared includes emitted copies). Focused 85 pass;
two 2-test probe cohorts pass; forced root typecheck/lint/build 8/8 each, 0 cached;
explicit API build PASS; root build includes offline mobile JS/assets and web.
No application gate failure or flake. Scoped local commits a35b1d3c, 204f8731 plus
the final docs checkpoint in Git/status. Original evidence/untracked dirt kept.

LP1 is complete; **PBR-AS1 requires fresh supervisor review of actual LP1 PASS**;
PBR-LR1 follows AS1 PASS/review. No successor work or queue changes. OX2 blocked
by OX1; unrelated work and Owner Pause intact. Historical RT1/EV1 STOPPED,
physical RT2 STOPPED / resume-text INCONCLUSIVE and deferred. Active OTA/safe
isolation and production/authenticated-browser/physical measurements UNVERIFIED.
Rollout and Device checks NOT RUN; no push/deploy/service/SQL/migration/env file/
Scheduler/device/native build/install/OTA/EAS/spending. Source 2.2.0/code6 is
distinct from archived 2.3.0/code7. Earlier LP1 eligibility text below is history.
<!-- PBR-LP1 completion end -->

<!-- PBR-MB1 completion begin -->
## PBR-MB1 current local checkpoint: PASS

2026-10-23: current-source startup/cache/navigation/Library/API synthetic
measurements and opt-in privacy-safe instrumentation are complete. Runtime
commit `b788663e288f5d970d87cd7d54710c94abf21813`. [Acceptance, exact intervals, hashes, attempts and commands](ai/acceptance/pbr-mb1-performance-baseline.md).
No optimization or physical/production speedup is claimed. AF1 ef80dfc6 remains
the Library baseline: all0/100/240/300 changed/unchanged schedules retain2
summary reads /2 stats reads /max1 active read; complete results match.
API0/1000-history page walks preserve exact hidden IDs, cursors and ownership.

FRESH full suites: shared711/mobile1658/API2455/web575/Canvas75/OCR27/engine606
= **6107 passed /0 failed /3 existing live skips** (shared includes emitted
copies). Forced root typecheck/lint/build each8/8,0 cached; explicit API/web
builds and38-file Android offline JS/assets export PASS. Initial typecheck
test-typing failure and mobile additive-assertion failure are recorded, corrected
and rerun. No new skip or product flake. All work is scoped local commits.

Approved order remains **PBR-MB1 -> PBR-LP1 -> PBR-AS1 -> PBR-LR1**.
LP1 is next only after fresh supervisor review/publication of MB1 PASS; start
with this baseline and AF1 completed work, optimize only demonstrated remaining
costs or document no justified further local optimization. AS1 awaits LP1 PASS
and review; LR1 awaits AS1 PASS and review. No successor work or queue change.
Historical OX2 remains blocked by OX1; unrelated roadmaps and Owner Pause intact.

RT1/EV1 STOPPED; RT2 physical preflight STOPPED / resume-text INCONCLUSIVE
and deferred for independent development. Source2.2.0/code6/runtime2.2.0-sdk57
is distinct from archived installed2.3.0/code7/binary-configured2.3.0-sdk57/preview.
Active OTA/full runtime/channel/embedded identity and safe isolation remain
UNVERIFIED; no device/beta/release gate passes. Rollout and Device checks are
owner steps, NOT RUN. No push/deploy/service/remote SQL/migration/environment
file/device/native build/install/OTA/EAS/Scheduler action or spending.
Earlier eligibility/publication wording below is a recovery checkpoint;
the independent lane disposition above is current.
<!-- PBR-MB1 completion end -->
<!-- PBR recovery 2026-10-23 begin -->
## Current owner scope: resume independent local performance work

2026-10-23 direct owner PC instruction supersedes the earlier four-task hold.
**PBR-RT2 physical diagnostic remains STOPPED; resume-text INCONCLUSIVE and
DEFERRED for independent development.** Full active OTA/runtime/channel and
embedded identity UNKNOWN; safe public/empty isolation NOT PROVEN; 0 resume
cycles. Fresh authorized Realme checks confirm Android13/API33, native2.3.0/code7
and installed APK SHA256 matching the archive; binary configured runtime
2.3.0-sdk57 / preview does not establish active OTA identity.

Approved finite order: **PBR-MB1 -> PBR-LP1 -> PBR-AS1 -> PBR-LR1**.
MB1 now depends on actual **PBR0 PASS + PBR-AF1 PASS**, removing only the
unnecessary rendering-diagnostic prerequisite for LOCAL measurements. MB1 now
has PASS for local measurements/instrumentation and committed checks; PBR-LP1
awaits fresh supervisor review/publication. AS1 and LR1 await their predecessor
PASS and review. PBR-AF1's completed Library coalescing
repair is baseline, not duplicate work. Historical RT1/EV1 STOPPED and RT2/FS7
reports stay intact; earlier hold statements below are historical checkpoints
superseded only for this independent lane. Device, beta/tester and release gates
remain BLOCKED; OX2 still depends on OX1 STOPPED.

Existing runner PID39828, active supervisor chatgpt, Manual Pause OFF at recovery
inspection; no restart or duplicate. Two TOTAL pending limit means only MB1 can
be admitted now alongside preserved OX2. Continue subsequent approved IDs through
fresh reviews as slots permit. No push/deploy/migration/OTA/native build/install,
FULLSEND, production or secret changes. Every implementation retains fresh tests,
forced typecheck/lint/build and measured before/after proof where applicable.
[Recovery evidence, deferral authority and dependency rationale](ai/acceptance/pbr-rt2-recovery-and-performance-resumption.md).
<!-- PBR recovery 2026-10-23 end -->

# Roadmap

<!-- PBR-RT2 begin -->
PBR-RT2 direct-PC diagnostic (2026-10-23): **BLOCKED at identity/isolation
preflight; rendering INCONCLUSIVE, cause UNRESOLVED.** Fresh local ADB confirms
one Realme RMX3151 / Android13/API33, package 2.3.0/code7; 13/13 recorded reads
exit0. Active validated network; full active OTA/runtime/channel UNKNOWN. Runbook
preflight stops apply: 0 app launches/navigation/resumes/captures/tree dumps.
No repair justified. Independent physical display and app theme/motion UNKNOWN.
[New acceptance and exact evidence](ai/acceptance/pbr-rt2-direct-realme-diagnostic.md).
FRESH full suites: 4809 pass/0 fail/3 existing live skips; 65 focused checks pass.
Forced root typecheck/lint/build: 8/8 each, 0 cached; Android offline JS export
PASS. Supported supervisor controller handoff applied; no tasks admitted. Historical RT1/EV1 STOPPED and RDP preparation PASS preserved;
MB1 -> LP1 -> AS1 -> LR1 HELD, beta BLOCKED. Initial runner idle, enabled, Pause
OFF; no duplicate runner or queue bypass. No release/install/settings/data change.
<!-- PBR-RT2 end -->


<!-- PBR-RDP device preflight begin -->
PBR-RDP authorized device session (2026-10-23): **STOPPED at preflight**.
ADB freshly confirms Realme RMX3151 / Android 13 / API 33 and native
2.3.0/code 7; 13 read-only checks exited 0. Phone has an active validated
network; full active OTA/runtime/channel/embedded identity UNVERIFIED.
Runbook preflight stops apply: **0 launches/resume cycles/screenshots/tree
dumps**; physical text diagnosis INCONCLUSIVE. No settings or app changes.
[Fresh results and remaining prerequisites](ai/acceptance/pbr-rdp-realme-preflight-20261023.md).
ADB access is now available; earlier preparation-only results below are historical.
PBR-RT1/EV1 STOPPED, four dependents HELD, beta readiness BLOCKED; no successor
or rollout. Other roadmap/Owner Pause states preserved.
<!-- PBR-RDP device preflight end -->

<!-- PBR-RDP begin -->
PBR-RDP / Realme diagnostic preparation (2026-10-23): **PASS for local
documentation preparation only**. [Owner-present runbook](ai/acceptance/pbr-rdp-realme-runbook.md)
pins phone/native/OTA identity, existing theme/motion and isolation preconditions,
chronological bounded observations (20 minutes / at most ten resumes), independent
physical-screen versus screenshot/tree records, privacy stops and immutable
artifact custody. Separate authorized physical diagnostic **NOT RUN**: current
bridge offers documentation preparation only, no device-execution action.
No source/native/config change or speculative fix. PBR-EV1 and PBR-RT1 remain
STOPPED; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain HELD, unqueued/unstarted;
**beta readiness BLOCKED**. Known archived FS7 ordering contradiction preserved.
Current phone/full OTA, native cause, original chronology and live state remain
**UNVERIFIED (owner to confirm)**. Rollout and Device checks NOT RUN, skipped
entirely; no service, environment-file, release, device or push action.
Fresh verification counts and exact commands are in the runbook/handoff.
Prior acceptance, OX2 block, other pending work, parity and Owner Pause preserved.
Finite preparation endpoint reached; owner-present diagnostics/review remain,
with no automatic RT1 retry, successor or release.
<!-- PBR-RDP end -->

<!-- PBR-EV1 begin -->
PBR-EV1 (2026-10-23), owner option 1 archive recovery only: **STOPPED during
STEP 1**. Recovered first/follow-up PNGs contradict FS7's text-recovery
narrative; exact artifacts/hashes, route order, timing limits and owner
question are in [checkpoint](ai/acceptance/pbr-ev1-fs7-evidence-recovery.md).
No source/native repair or new device diagnostic. PBR-RT1 STOPPED and all four
PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 HELD statuses remain unchanged; no successor
queued/started. **Beta readiness BLOCKED**. Owner must reconcile existing
capture identity/physical observation before retry; live state UNVERIFIED.
FRESH typecheck 8/8, 0 cached; lint interrupted at stop; builds NOT RUN;
focused tests NOT APPLICABLE; safe documentation/hygiene PASS. Rollout and
Device checks NOT RUN. OX2 block, pending performance/visual work, parity and
Owner Pause preserved; no automatic next task, service/release action or push.
<!-- PBR-EV1 end -->

<!-- PBR-AF1 begin -->
PBR-AF1 (2026-10-23): **PASS for mandatory LOCAL audit/repair/gate scope**,
depends on PBR0; implementation ef80dfc6. New owner answer
chatgpt-owner-1792691511294-971f0f34-866c-4ea9-856b-57750399b31c.md
authorized this independent renewed audit and immediate supported repair.
Library read amplification fixed with identical-fixture local proof; exact
APK/export/API/reader/resume findings and all fresh gates are recorded in
[acceptance](ai/acceptance/pbr-af1-audit-and-fix.md). Native text remains
UNRESOLVED / UNREPRODUCED, native repair BLOCKED on owner evidence.
PBR-RT1 remains STOPPED; PBR-MB1/PBR-LP1/PBR-AS1/PBR-LR1 remain HELD, not
started or advanced. No unrelated OX/parity/Owner Pause change. Finite AF1
endpoint reached; supervisor review and separately authorized owner device/
rollout steps remain. No automatic next task or beta/release readiness claim.
<!-- PBR-AF1 end -->

<!-- PBR execution 2026-10-22 begin -->
## Frozen owner performance sequence (2026-10-22)

Source: absolute runner BACKLOG.md, section "PBR execution 2026-10-22", after
PBR0 PASS (`bdd1c021`, `a4e5c4cc`). These explicit execution IDs govern this
finite scope; the audit's older conditional PBR1-PBR5 names are categories,
not substitute tasks. Updated by the 2026-10-23 direct owner recovery instruction; see current scope above.

| Order | ID | Authorized task | Depends on | Current result / exit evidence |
| --- | --- | --- | --- | --- |
| PBR-E1 | PBR-RT1 | P0 Android Resume-Text Recovery: reproduce FS7, trace lifecycle/render/GL/navigation/native Text, implement only supported fix and regressions | PBR0 | **STOPPED at STEP 1**: cause unsubstantiated locally; essential physical attribution missing. 65 existing + 8 synthetic tests pass, not native acceptance. Requires cause-specific reproduction, minimal repair and meaningful regressions plus applicable gates. |
| PBR-E2 | PBR-MB1 | P0 Performance Measurement Baseline: startup, navigation, Library and API local baseline plus privacy-safe instrumentation | PBR0, PBR-AF1 | **ELIGIBLE; awaiting fresh supervisor publication.** Distinguish cold/warm, synthetic/local/device, measured/inferred; fake clock/redaction/disabled-sink tests; no invented production percentiles or physical metrics. |
| PBR-E3 | PBR-LP1 | P1 Library Performance: profile repeated DB/local-storage reads and optimize demonstrated bottlenecks | PBR-MB1 | **APPROVED; await actual predecessor PASS and supervisor review; NOT QUEUED/STARTED.** Audit D1/D2: experience/repository.ts, useLocalLibrary.ts, librarySync.ts, artifactStore.ts. Fixtures 0/100/240/300 plus large history, changed/unchanged; compare reads/elapsed and full result equivalence, owner switch/cancellation/pagination/offline/partial failure. No remote DB plan/migration. |
| PBR-E4 | PBR-AS1 | P1 APK Size Optimization: native libs/assets/fonts/compression/release packaging with byte-attributed safe local improvements | PBR-LP1 | **APPROVED; await actual predecessor PASS and supervisor review; NOT QUEUED/STARTED.** Exact existing APK 132024227 B/native 93639812 B, four ABIs; compare equivalent local exports/archive inventories. Preserve ABIs/modules/features/exports/fonts/signing/OTA; native release build/install requires explicit owner authorization; no fabricated rebuilt-APK saving. |
| PBR-E5 | PBR-LR1 | P1 Long-Reviewer Rendering: profile representative long reviewers, reduce demonstrated rerenders/memory | PBR-AS1 | **APPROVED; await actual predecessor PASS and supervisor review; NOT QUEUED/STARTED.** Audit R1; mobile ReviewerReader and web reader after source discovery. Compare identical fixture counts/timings and full text/search/anchors/selection/images/accessibility/export behavior; no truncation/content cap or hidden feature removal. |

Current local dependency order: **PBR0 + PBR-AF1 -> PBR-MB1 -> PBR-LP1 ->
PBR-AS1 -> PBR-LR1**. Actual predecessor PASS and fresh supervisor review remain
required. Owner explicitly defers unsubstantiated resume-text work independently;
RT1/EV1 STOPPED and RT2 preflight stop remain device/release gates, with no false
PASS. Preserve OX2's OX1 dependency, OX3/OX4/QI1/LC1, held parity, Manual Pause,
configured supervisor and all unrelated roadmaps. LP1 starts from the completed
AF1 repair and must not duplicate it.
Every implementation retains source/privacy/ownership/features, fresh relevant
tests, forced root gates, affected exports, exact counts and scoped local
commits. Synthetic evidence stays labelled. Local-only: no release, device
operation, native release build/install, service calls, remote SQL, environment
or credential/account change, deployment or push. Physical acceptance and any
eventual FULLSEND remain separate owner work.

[PBR-RT1 acceptance and exact stop/owner evidence](ai/acceptance/pbr-rt1-android-resume-text.md).
<!-- PBR execution 2026-10-22 end -->

<!-- PBR0 begin -->
PBR0 / website + Android pre-beta baseline (2026-10-22): **PASS for the finite
unattended audit scope**, source 245380ea on overnight/2026-10-15_feedback.
No app/source implementation, dependency, config or migration changes.
Exact local 2.3.0/code7 APK weighs **132,024,227 bytes**; native libraries
93,639,812 bytes across four ABIs. User-reported 117 MB remains unidentified.
Fresh web: Today 213 kB / Library 223 kB First Load JS; standalone Android HBC
10,945,101 bytes. These are separate source/export/binary measurements, not
device latency. Existing SP1/SP2/SP2b optimizations are retained; remaining
read/render/packaging/offline work is evidence-ranked in the audit.
FRESH forced root typecheck/lint/build: 8/8 each, 0 cached; six existing warnings.
Shared 706/72 files (includes emitted copies), Canvas 75/1, OCR 27/3, engine
606 evaluations, API 2452 passed + 3 existing live skips/213 files, mobile
1645/172, web 575/76; all executed cases pass. Separate API/web/Android builds,
post-restoration forced typecheck and diff/staged hygiene PASS.
Historical FS7 physical **5 PASS/1 FAIL** stays PARTIAL; newer narrow GL recovery
proof is distinguished. Authenticated desktop web and live revisions/DB/regions/
queue/Scheduler, actual startup/Web Vitals/P50/P95 remain **UNVERIFIED (owner to
confirm)**. Rollout and Device checks **NOT RUN**, skipped entirely.
PBR1–PBR5 are conditional small code-only proposals; **supervisor review must
precede any next job**. PBR6 is owner-only. Pending OX3/OX4/QI1/LC1, held web
parity and Owner Pause remain unchanged. No remote service, environment-file
edit, SQL/migration apply, deploy/OTA/EAS, Scheduler/email or push.
Audit commit bdd1c021; documentation checkpoint follows separately.
[Audit, measurements, conditional roadmap and owner matrix](ai/acceptance/pbr0-prebeta-performance-audit.md).
<!-- PBR0 end -->

<!-- OX2P begin -->
OX2P / website + mobile light glass (2026-10-22): **PASS for the finite unattended local code scope**.
Exact source prerequisite 39ff7362 and separate Realme padding report confirmed;
historical OX1 STOPPED and old OX2 held status remain unchanged. Implementation
1140c737 refines shared light-only liquid/reflection coverage and translucent
static posters. Native padded SVG containment is retained; no new render pass,
clock compositor, loading timer, gesture, backend or dependency change. All five
dark fixed-pose RGBA comparisons with 39ff have maximum difference 0; current
web/mobile adapters match exactly locally in both themes.
FRESH root forced typecheck/lint/build: 8/8 each, 0 cached, six existing warnings.
Full suites: shared 706 tests/72 files, mobile 1643/172, web 575/76;
2924 passed, 0 failed/skipped. Explicit API/web builds
and Android HBC export PASS. Both diff checks PASS. FRESH 120 throttled normal
and 40 Reduced Motion web sequences cover all five palettes, both themes,
Today/Generation and 390/1440 widths; no sampled partial clock, alpha/RGB corner
leak, page-corner change, page error or external request. Twenty RN Web cases
and inspected before/after contact sheets pass locally. Current local web does
not reproduce the owner's square/layered-load symptom; startup easing stays OX4.
Rollout and Device checks NOT RUN, skipped entirely. Physical acceptance after
these shader changes, authenticated/deployed web and live state remain
UNVERIFIED (owner to confirm). No service call, environment-file edit, remote
SQL/migration, Scheduler/email, deploy, OTA/install, push or later-scope work.
Owner Pause and unrelated paths preserved. Local endpoint reached; owner review
and separately authorized device/rollout work remain.
[Acceptance and exact gates](ai/acceptance/ox2p-light-glass-follow-up.md).
<!-- OX2P end -->

<!-- OX1-device begin -->
OX1 / physical follow-up (2026-10-22): **PASS for the confirmed square repair
on the Realme in an isolated native test app**. New owner scope explicitly
authorizes ADB, source repair, local device builds/validation and local commits;
it excludes rollout, OTA, production changes, push and FULLSEND. The native SVG
poster's clipped backing bitmap is confirmed by physical layer isolation.
The corrected viewport retains the complete spill and original sphere geometry.
FRESH 12 theme/palette/surface captures, ten native tab cycles, resume, touch,
glass text and 31-second Reduced Motion checks pass. Root forced gates 8/8 each,
0 cached; shared/mobile/web 696/1641/569 tests and Android export pass.
Native diagnostics reuse installed release binaries under a separate identity;
clean Gradle rebuild and full authenticated production routes are unverified.
Preserve the old OX1 status/stop history for supervisor reconciliation. This
follow-up ends at the local commit; do not start OX2 or a release automatically.
[Separate physical report](ai/acceptance/ox1-realme-physical-debug.md).
<!-- OX1-device end -->

<!-- OX1 begin -->
OX1 / orb compositing integrity (2026-10-22): **STOPPED at STEP 0**.
Finite scope is OX1 only: establish the square's cause, then the smallest complete
web/mobile repair, before/after evidence, serial gates and local commits.
Physical work and rollout are owner-only; OX2 depends on a real OX1 PASS.
The local actual-component matrix did not reproduce the owner-reported square:
36 web sequences, 805 frames, 13,518 samples, zero partial-clock samples or
outer alpha leakage; 12 mobile-component browser cases also show no square.
Browser host adapters cannot prove native TextureView presentation. A safe
source cause remains unestablished, triggering OX1's explicit stop rule.
No runtime repair was made or claimed. FRESH focused tests: shared 12/12,
mobile 26/26, web 21/21; full gates NOT RUN, documentation hygiene PASS.
Record the owner-only capture/layer-isolation request; resume OX1 only with
evidence supporting attribution, preserving the external aura. Native/live
state UNVERIFIED (owner to confirm); Rollout/Device checks NOT RUN. No service,
environment-file, release or push operation. Original paths and Owner Pause
preserved. [Acceptance](ai/acceptance/ox1-orb-compositing-integrity.md).
<!-- OX1 end -->

<!-- LP2 begin -->
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
[Acceptance and exact gates](ai/acceptance/lp2-legal-discoverability.md).
<!-- LP2 end -->

<!-- TB1 begin -->
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
[Acceptance and exact gates](ai/acceptance/tb1-tab-press-scale.md).
<!-- TB1 end -->

<!-- RS1 begin -->
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
[Acceptance and exact gates](ai/acceptance/rs1-hide-on-scroll-no-shake.md).
<!-- RS1 end -->

<!-- OL1 begin -->
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
[Acceptance and exact gates](ai/acceptance/ol1-web-orb-loads-whole.md).
<!-- OL1 end -->

<!-- OG1 begin -->
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
[Acceptance and exact gates](ai/acceptance/og1-standalone-generation-glow.md).
<!-- OG1 end -->

<!-- OT1 begin -->
OT1 / Today orb theme sync (2026-10-21): **PASS for the finite unattended local code scope**.
Confirmed cause: the shared clock compositor applied a .78 black scrim in light
mode; theme propagation already worked. Shared palette/theme appearance now
drives both bodies, static fallbacks and Queue. Light clock ink replaces the
black scrim; live theme changes retain the scene and momentum. OR4 storage,
gestures, Reduce Motion and accessible real time text remain.
Implementation: `45526e95`; documentation hash is in Git/OT1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; six existing
lint warnings. Shared 682/70 files (source + compiled duplicates), mobile
1611/169, web 546/72. Separate web build 23/23 pages and Android HBC
export pass; root API build 37/37 pages. Both diff checks pass. Eight actual web
Today/Generation light/dark pearl/gold captures were inspected; GPU contrast and
live canvas identity pass. First typecheck failure and repairs are retained.
Native/physical appearance and live state remain UNVERIFIED (owner to confirm).
Rollout and Device checks NOT RUN, skipped entirely. No service call, environment
file edit, remote SQL/migration, Scheduler change, deployment or push. Original
unrelated paths and Owner Pause preserved. OT1 endpoint reached; no later item.
[Acceptance and exact gates](ai/acceptance/ot1-today-orb-theme-sync.md).
<!-- OT1 end -->

<!-- GV1 begin -->
GV1 / Generation viewport (2026-10-20): **PASS for the finite unattended local code scope**.
Native detail and pre-admission pages use measured non-scroll flex space, with
an intact responsive orb/fallback and bounded full details/errors/actions.
Enlarged short layouts keep concise state labels and full status in details;
background-work copy waits for acceptance. Phone web uses the dynamic viewport
and a bounded dialog; desktop retains both panes. Jobs, OP2 and picker scrolling
are preserved. Implementation: `8b37b5ae`; documentation hash is in Git/GV1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; six existing
lint warnings. Shared 670/68 files (335 source + compiled duplicates), mobile
1600/169, web 540/72. Equivalent final root API/web builds generate 37/37 and
23/23 pages; Android HBC export and diff/staged checks pass. Native component
bounds cover 66 state/viewport combinations via RN Web, including safe insets,
landscape and 200% text. Actual web bounds, gestures, screenshots and OP2
clock/wave/backdrop browser checks pass. Failed attempts and the stronger final
native audit are retained. Native rendering/physical acceptance and live state
remain UNVERIFIED (owner to confirm). Rollout and Device checks NOT RUN,
skipped entirely; Realme disconnected. No service call, environment-file edit,
remote SQL/migration, Scheduler operation, deployment or push. Original unrelated
paths and Owner Pause are preserved. Finite GV1 endpoint reached; no later work.
[Acceptance and exact gates](ai/acceptance/gv1-generation-viewport.md).
<!-- GV1 end -->


<!-- OP2 begin -->
OP2 / Larger glass clock, cumulative waves and source-faithful backdrop
(2026-10-20): **PASS for the finite unattended local code scope**. Time is 40
pixels/points across idle/drag/fallback, with refracted source shading and
proportional AM/PM. Eight bounded overlapping waves build strength smoothly;
a 64x64 RGBA GPU capture drives the backdrop from resolved color AND opacity.
Today, Generation preparation/detail, retained KnowledgeCore and existing
static/Queue sources are covered. Jobs, gestures, synced palettes and render
cadence remain; no extra animation loop or production pixel readback.
Implementation: `9e17fd4d`; documentation hash is in Git/OP2.status.
FRESH PASS: forced typecheck/lint/build 8/8 workspaces each, 0 cached; six
existing lint warnings. Shared 670/68 files (includes compiled duplicates;
335 source cases), mobile 1581/166, web 532/72. API/web builds 37/37 and 23/23
pages and Android HBC export are supplied by the equivalent fresh root build.
Diff/staged checks pass. Real GPU pixels, screenshots, before/after motion
frames and CPU submission/resource observations were inspected; failed attempts
and repairs are retained. Rollout and Device checks NOT RUN, skipped entirely.
Deployed/live state and physical Android appearance/performance remain
UNVERIFIED (owner to confirm). No service call, environment-file edit, remote
SQL/migration, Scheduler, deployment or push. Unrelated paths and Owner Pause
are preserved. OP2 ends here; GV1 is separate and has not started.
[Acceptance and exact gates](ai/acceptance/op2-orb-polish.md).
<!-- OP2 end -->


<!-- OA1 begin -->
OA1 / Orb ambient light (2026-10-20): **PASS for the finite unattended local
code scope**. Shared procedural spill follows final body palette, liquid motion,
spin, day light and state in all four GL scenes. Today/Generation, retained
KnowledgeCore, static fallbacks and Queue miniature sources are covered. Body,
glass clock, gestures, synced choices, layout and render rates are preserved;
Reduce Motion is stable and hidden/unfocused/disposed work stops.
Implementation: 3b1abbbb, 50cf0103; documentation hash in Git/OA1.status.
FRESH PASS: forced typecheck/lint/build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 330/34 source files (default suite 660/68 including compiled
duplicates), mobile 1581/166, web 524/72. Final root build supplies equivalent
API 37/37 pages, web 23/23 pages and Android export gates. Diff checks pass.
Local screenshots/videos, real GPU pixel checks, clock/gesture checks and CPU
submission/resource observations are recorded; failed first attempts retained.
Rollout and Device checks NOT RUN; physical/reference visual parity, performance
and deployed/live state UNVERIFIED (owner to confirm). No service call, remote
SQL/migration, Scheduler, environment-file edit, deployment or push. Original
untracked paths and Owner Pause preserved. OA1 ends here; supervisor review and
separately published OA2 remain owner work.
[Acceptance and exact gates](ai/acceptance/oa1-orb-ambient-glow.md).
<!-- OA1 end -->


<!-- WX1 begin -->
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
[Acceptance and exact gates](ai/acceptance/wx1-web-study-export.md).
<!-- WX1 end -->

<!-- FULLSEND recovery begin -->
FULLSEND recovery (2026-10-19): **BLOCKED before step 1**. WA1 is recovered and
locally committed (3fe40518, 1a808907), with all final-code gates FRESH PASS.
First release prerequisite failed: Vercel CLI 64.5.0 `whoami --json
--non-interactive` exited 1, `loggedIn: false`. Release work stopped. GitHub main
is 384173c0; no main integration, push, deployment, EAS APK or adb install was
performed. FULLSEND config remains unchanged/unconfigured. The owner must log
in locally before a new attempt prepares/reviews main and runs fresh release
gates from step 1. Owner Pause and unrelated files remain unchanged; WX1 was
not started. [Local blocker/evidence](ai/acceptance/fullsend-recovery-20261019.md).
<!-- FULLSEND recovery end -->

<!-- WA1 begin -->
WA1 / Website password recovery (2026-10-19): **PASS for the finite unattended
local code scope**, recovered from interrupted bb1ed7fe on Windows. Implementation
3fe40518 adds sign-in-only reset requests, a public reset screen, owner-bound
recovery persistence and callback routing for malformed/expired recovery links.
Normal sign-in/OAuth and server bearer-JWT/ownership boundaries remain unchanged.
FRESH PASS on final code: forced typecheck/lint/root build 8/8 each, 0 cached;
6 existing lint warnings. Shared 632, API 2452 / 3 intentional live skips,
mobile 1587, web 502 tests / 69 files (20 local browser cases). API/web builds
37/37 and 23/23 pages, Android export and diff checks pass. Four screenshots
reviewed at 1440/390. Prior failed assertions and the interrupted export are
retained in acceptance. Generated Next declarations restored after inspection;
unrelated UI/, mobile .gitignore and supabase/.temp/ remain untouched.
Rollout and Device checks NOT RUN for WA1; live redirect allowlist, email template
and real recovery round trip UNVERIFIED (owner to confirm). Owner Pause remains
set; no surviving WA1 worker, queue restart or later task. The separate owner
FULLSEND request is authorized but still requires its own reviewed main candidate,
prerequisites and fresh release gates; these local checks are not release proof.
[Acceptance](ai/acceptance/wa1-web-password-reset.md).
<!-- WA1 end -->

<!-- GL1 begin -->
GL1 / Today glass clock (2026-10-19): **PASS for the finite unattended local
code scope**. Both apps use one shared MSDF refraction composite in the existing
orb view, with bundled Inter 700 time and plain 600/500 captions. Weekday is
removed; idle time is centered and dragged time updates next frame. Accessible
real time, static/plain fallbacks and Reduce Motion remain. Inter and clock-glass
exceptions are documented in ADR-049 and design typography documentation.
Commits: c4329a3f, 2afd2e41, 18e2967c, dec26802, cba28643, e00dd0ea; docs hash in Git/status.
FRESH PASS: forced typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing
lint warnings. Shared 632, API 2452 / 3 intentional live skips, mobile 1587,
web 451 tests pass. Browser clock checks 10/10, 8 screenshots at 1440/390 in
both themes; bright-pearl stroke-contrast regression passes. API/web builds
37/37 and 22/22 pages, local Android export and diff checks pass. Mobile keeps
0.6 render scale and 80ms idle/16ms interaction cadence. Local renderer.info
shows 1 -> 3 draw calls with ~83ms idle interval; CPU submission timing is not
GPU or Realme proof. Draft failures are retained in acceptance. Rollout and
Device checks NOT RUN, skipped entirely; deployed/physical state UNVERIFIED
(owner to confirm). No prohibited service call, deployment, remote SQL/migration,
Scheduler operation, environment-file edit or push. Prior untracked paths
preserved; no later task started. [Acceptance](ai/acceptance/gl1-glass-clock.md).
<!-- GL1 end -->

<!-- OF1b begin -->
OF1b / automatic offline saving (2026-10-19): **PASS for the finite unattended
local code scope**. STEP 0-3, tests, all 10 prompt gates, additional forced root
build, documentation and local commits complete. Baseline 9bf8335; branch
overnight/2026-10-15_feedback retained. OF1b owner answers supersede OF1's STOP.
AppLifecycle remains owner; the Library joins. Limited body runs automatically
continue, transient errors back off, and local SQLite migration 10 records
version-bound permanent failures on existing artifact rows. Per-item
notifications drive current/total/failedPermanent captions on both Library
surfaces. Sync/generation changes arriving mid-flight request a later list
recheck. Inventory walks beyond ten pages. No NetInfo/shared reconnect listener
exists; foreground/session restoration plus idle active retries are the approved
fallback. OI1 image scheduling/caps/cleanup and image-aware readiness remain.
Both caption twins have exact wording; web has no offline mode or caption caller.
Commits: 5bc6652 (mobile), 9a38527 (web); docs hash in Git/OF1b.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 596, API 2433 / 3 intentional live skips, mobile 1546, web 391
tests pass. API/web builds 36/36 and 22/22 pages; Android export and diff checks
pass. Failed first attempts and final verification repeats are recorded.
Rollout and Device checks NOT RUN, skipped entirely; live state and physical
reconnect behavior UNVERIFIED (owner to confirm). No deployment, external call,
remote SQL/migration, Scheduler, email, environment-file edit or push. Original
untracked paths preserved. No later task started; owner rollout/device review
remains. [Acceptance and exact gates](ai/acceptance/of1b-offline-continuation.md).
<!-- OF1b end -->


<!-- AN1b begin -->
AN1b / announcement read on open (2026-10-19): **PASS for the finite unattended
local code scope**. STEP 0-3, both apps, regression tests, all 10 prompt gates,
additional forced root build, docs and local commits complete. Baseline ebcf59c;
branch overnight/2026-10-15_feedback retained. Owner answers supersede AN1's
row-write conflict: mobile row taps and swipes stay unchanged. Both detail
screens now wait for resolved/displayed data and the preference owner, then
mark once per opened id/owner. Explicit unread persists until a new open.
Stores keep existing per-device/browser owner keys and notifications; actual
mounted list/Today tests prove immediate dot/count/card updates. No hydration
overwrite, owner loss, id mismatch or stale Today subscription reproduced.
The symptom most likely reflects older deployed builds: UNVERIFIED (owner to
confirm), not a live diagnosis. No Today implementation change needed.
Commits: 50d4ccc (mobile), e881082 (web); docs hash in Git/AN1b.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing lint
warnings. Shared 596, API 2433 / 3 intentional live skips, mobile 1535, web 387
tests pass. API/web builds 36/36 and 22/22 static pages; Android export and
diff hygiene pass. New regressions 6 mobile / 5 web; failed first attempts and
web browser-teardown flake recorded. No platform feature skipped, dependency,
API, schema, release-version, motion or ADR change. Owner steps: Rollout and
Device checks NOT RUN, skipped entirely; verify Realme/website, notification,
deep-link and direct URL flows later. Live state UNVERIFIED (owner to confirm).
No deployment, remote SQL/migration, Scheduler, email, environment-file edit or
push; unrelated owner paths preserved. Endpoint AN1b only; no later task started.
[Acceptance and exact gates](ai/acceptance/an1b-announcement-read-on-open.md).
<!-- AN1b end -->

<!-- LP1 begin -->
LP1 / privacy and terms (2026-10-19): **PASS for the finite unattended local
code scope**. Baseline be9d5dc, branch overnight/2026-10-15_feedback retained.
STEP 0-4, shared structured copy, public server-rendered web routes, bundled
offline native root routes, caption footer links and sign-up agreement notices
are complete. Both apps use one dated source and contact constant. No required
platform skipped, new dependency, API, schema, motion or ADR change.
Implementation commits: 451b58c, 0aacc1c, 12e4aa2; docs hash in Git/LP1.status.
FRESH PASS: all 10 prompt gates; typecheck/lint/root build each 8/8 tasks,
0 cached; 6 existing lint warnings. Shared 593, API 2433 / 3 intentional live
skips, mobile 1529, web 382 tests; API 36/36 and web 22/22 static pages,
Android export and diff hygiene pass. Local Playwright 13/13, including both
legal routes signed out at 1440/390 in light/dark, footer navigation and
JavaScript-disabled content; 0 legal API/external requests or page errors.
Failed first attempts are recorded. Generated declarations restored; unrelated
owner paths preserved. Rollout/Device checks NOT RUN, skipped entirely;
live state UNVERIFIED (owner to confirm). No remote call, deployment, migration
application, Scheduler operation, environment-file edit or push.
Owner must review wording/contact before publication and later use the public
privacy URL in Play Console. Not reviewed by a lawyer. Endpoint LP1 only;
no later slice or previously stopped task resumed. [Acceptance](ai/acceptance/lp1-legal-pages.md).
<!-- LP1 end -->


<!-- OR3b begin -->
OR3b / orb momentum, ring spin, ripple and pearl (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-5, both apps, regression tests,
all 10 prompt gates, additional forced root build, docs and local commits
complete. Baseline 6cfeabb; branch overnight/2026-10-15_feedback retained.
OR3b's explicit owner answer resolves OR3's prior requirements STOP: one
0.4-second friction constant, 0.01 rad/s cutoff; 6 rad/s stops at 2.56s and
1 rad/s at 1.85s in the 10ms model tests. Smoothed samples preserve decayed
velocity through held pauses. Physical ring moves feed Y spin at gain 3;
release snapping never pushes spin. Ring input and coast bypass native page
pause. Both shaders use a 900ms great-circle ripple and matching normals;
Reduce Motion suppresses ripple/momentum and keeps deliberate still poses.
Pearl is existing #E6EAF1; stable sf.orb.colorKey migration preserves all four
old choices and handles queued writes/late hydration safely. Approved glow
fallback: remove the Today aura on both apps and native SVG halo after the
installed Stop API probe; generation aura matches the body's idle fade and
restores authoritative state tint. No new native module/dependency/token.
Commits: d0a4c65, 4c3fdbe, 1a0b512, 445fcb2f; docs hash in Git/OR3b.status.
FRESH PASS: typecheck/lint/root build each 8/8 tasks, 0 cached; 6 existing lint
warnings. Shared 610, API 2433 / 3 intentional live skips, mobile 1558, web 411
tests; API/web 36/36 and 22/22 pages; Android export and diff hygiene pass.
Local WebGL 5/5 and native Stop probe 2/2 PASS. Failed first attempts recorded.
Rollout and Device checks NOT RUN, skipped entirely. Live state, deployed
revisions and physical feel/power UNVERIFIED (owner to confirm). No remote
call, SQL/migration application, Scheduler, email, deployment, environment-file
edit, branch switch or push. Original unrelated paths preserved. Endpoint
OR3b only; no later task started. [Acceptance and exact gates](ai/acceptance/or3b-orb-interaction.md).
<!-- OR3b end -->

<!-- OR4 begin -->
OR4 / orb color sync between phone and website (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-4, both apps, tests, all 10 prompt
gates, docs and local commits complete. Baseline 34ab2f4d; branch
overnight/2026-10-15_feedback retained. Migration **file only, not applied**:
packages/db/migrations/20261018000301_profile_preferences.sql adds nullable
user_profiles.orb_color (check on pearl/gold/green/violet/orange; null = pearl)
plus a DB-time orb_color_updated_at trigger (last write wins by server time),
and extends the column-level authenticated select grant. GET/PATCH
/api/profile/preferences: verified bearer, owner-scoped service upsert,
1 KiB bounded strict body, private no-store, invalid key 400, missing
column/stale schema mapped to typed 503 profile_preferences_unavailable. Shared
parseProfilePreferences reuses OR3 palette keys; OrbPreferenceSync is one
serialized per-owner queue. Both clients render the cached key at once, PATCH
600ms after the last tap (one request for fast taps), keep a durable
per-owner pending value for reconnect, never revert on failure, and silently
stay local-only while unavailable. Server values use the existing OR2 color
cross-fade (instant under Reduce Motion). Mobile refreshes on start, sign-in,
foreground and a 15s active retry; web on load, focus, visibility, online and
a 15s visible retry. No new dependency, token or native module.
Commits: e2124bd6, bb5352ea, d84e058b, 4197bb95, a0d2d8bc, 78c8dd0c, 7fc55b7d;
docs hash in Git/OR4.status.
FRESH PASS: typecheck/lint each 8/8 tasks, 0 cached; 6 existing lint warnings.
Shared 614, API 2452 / 3 intentional live skips, mobile 1567, web 417 tests;
API/web/Android builds and diff hygiene pass. First API run had 2 timeout
flakes in unrelated files (34/34 isolated, full rerun green).
Rollout and Device checks NOT RUN, skipped entirely. Applied migration,
deployed revisions and phone/browser sync UNVERIFIED (owner to confirm). No
remote call, SQL/migration application, Scheduler, email, deployment,
environment-file edit, branch switch or push. Original unrelated paths
preserved. Endpoint OR4 only; no later task started. [Acceptance and exact gates](ai/acceptance/or4-orb-color-sync.md).
<!-- OR4 end -->

<!-- WGP2 begin -->
WGP2 / generation orb and vertical step bar (2026-10-19): **PASS for the
finite unattended local code scope**. STEP 0-4, both apps, tests, all 10
prompt gates, docs and local commits complete. Baseline 2480cf14; branch
overnight/2026-10-15_feedback retained. STEP 0 Playwright repro (real
GenerationScreen, 1440/390): the canvas mounts, the ball-only target receives
the pointer and a tap stores the next color, but generation states hid the
idle color, so taps looked dead. Web and mobile generation screens (and the
Queue generation view) now render the Today DayOrb, which gains an optional
state: the Knowledge Core's coreModel excess over idle while running, the
existing desaturated tint and stillness on failure, and a brief brighten then
idle on completion. Today is unchanged without a state; Reduce Motion snaps.
Web: numbered list replaced by a 3px segmented track (done --success, failed
--danger, pending --line), a 1.6s sweep on the current segment (steady half
fill under RM), sr-only state words, real section fill and count under
Building study material, and stepRevealQueue ticks multi-stage jumps at 180ms
without ever running ahead of the server or delaying Library. Mobile: a thin
pill bar under the status line with the shared skeleton shimmer and the
same count caption. Commits: 0aeb7177, d1231c6a, 392ca412, 3bef7b33,
4063c883; docs hash in Git/WGP2.status.
FRESH PASS: typecheck/lint/root build 8/8 tasks each, 0 cached; 6 existing
lint warnings. Shared 614, API 2452 / 3 intentional live skips, mobile 1580,
web 435 tests (first web run 430 / 5 fail on a test window stub, repaired);
API/web builds 37/37 and 22/22 pages; Android export and diff hygiene pass.
Rollout and Device checks NOT RUN, skipped entirely. Deployed revisions and
physical appearance UNVERIFIED (owner to confirm). No remote call,
SQL/migration, Scheduler, email, deployment, environment-file edit, branch
switch or push. Endpoint WGP2 only; no later task started. [Acceptance and exact gates](ai/acceptance/wgp2-generation-orb-step-bar.md).
<!-- WGP2 end -->


<!-- OF1 begin -->
OF1 / automatic offline saving (2026-10-19): **STOPPED at STEP 0**, under
the prompt's overriding UNATTENDED rules 3-4. Baseline `09e53dd`, branch
`overnight/2026-10-15_feedback` retained. Implementation contradicts the
assumed focus-cancelled job: AppLifecycle already starts owner-scoped catch-up
on sign-in/foreground; Library blur aborts only its own remote fallback, not
the shared catch-up controller. Body hydration instead has a 60-second budget
and 300-attempt cap, with no automatic continuation after a limited run;
notifications occur after batches of up to 20. This changes the required fix.
No product code changed; implementation/tests/build gates NOT RUN after STOP.
Documentation diff hygiene checked separately. Owner must resolve the recorded
scope question before work resumes. Rollout/Device checks NOT RUN, skipped
entirely; deployed behavior/state UNVERIFIED (owner to confirm). No remote call,
deployment, environment-file edit, migration application or push. Full findings
and exact owner question are in the latest OF1 handoff footer.
<!-- OF1 end -->

<!-- IV1 begin -->
IV1 / reviewer image viewer (2026-10-19): **PASS for the finite unattended local
code scope**. Endpoint: STEP 0, web/mobile implementation, tests, all 10 prompt
gates, additional forced root build, docs and scoped local commits. Baseline
`c448c21`, branch `overnight/2026-10-15_feedback` retained. Web: slider
removed; point-origin 1x/2.5x tap zoom, transform pan with fitted-image clamps,
pointer-release touch handling, keyboard toggle, 200ms motion / instant Reduce
Motion. Mobile: single-tap 1x/2.5x parity, retained 1x-4x pinch/pan and modal
isolation. Both: question-circle vectors, Ask above Save, equal full-width
48px/pt rows, 8px/pt gap and offline note below. Shared Ask retains sign-in.
FRESH PASS: shared 590, API 2433 / 3 intentional live skips, mobile 1527,
web 378; final typecheck/lint 8/8 tasks each, 0 cached; 6 existing warnings.
API/web builds, Android export, root build 8/8 / 0 cached and diff hygiene
pass. Final web rebuild follows the last measurement refinement. Browser web
6/6 and native-web layout 6/6 combinations pass, zero unexpected requests/page
errors; screenshots inspected. Failed attempts recorded. Optional web pinch/
wheel omitted; no required platform skipped, dependency/API/schema/ADR change.
Rollout/Device checks NOT RUN, skipped entirely. Live/physical state UNVERIFIED
(owner to confirm). No remote operation, environment-file edit or push.
Next: owner rollout and real website/Realme checks. IV1 endpoint only;
no later slice started or AN1 resumed. [Acceptance](ai/acceptance/iv1-reviewer-image-viewer.md).
<!-- IV1 end -->

<!-- RV3 begin -->
RV3 / reference topic level pill (2026-10-19): **PASS for the finite unattended
local code scope**. Frozen endpoint complete: STEP 0-3, mobile/web/shared-reader
presentation, regressions, 10/10 prompt gates, forced root build, docs and local
commits. Baseline `829b8fb`, branch `overnight/2026-10-15_feedback` retained.
Mobile `61cbb03`: measured native translation / layout width, 200ms ease,
instant Reduce Motion, neutral content-width rounded track and inset thumbs.
Web `d1df22b`: measured CSS translation/width, ResizeObserver, reduced-motion
override, focus-visible radios/keyboard navigation, independent Expound, no
divider. Both retain regular primary labels and RV2 short labels. Shared-reader
links preserve sign-in-only behavior and display the same Original thumb.
40pt/px visual tracks retain >=44pt/px targets. No platform implementation skipped.
FRESH PASS: shared 590, API 2433 / 3 intentional live skips, mobile 1525, web 374;
typecheck/lint/root build 8/8 tasks each, 0 cached; six existing lint warnings.
API/web builds, Android export and diff hygiene pass. Focused mobile 12/12,
web 36/36; isolated web Playwright 54/54, mobile RN Web layout/theme 8/8, zero
requests/page errors. Screenshots inspected. Tooling retries are recorded;
no unit/gate failure or nondeterministic flake. No API/schema/dependency/ADR
change. Generated declarations restored; original owner paths preserved.
Rollout/Device checks NOT RUN, skipped entirely; live/physical state UNVERIFIED
(owner to confirm). No remote call, environment-file edit, deployment or push.
Next: owner rollout/reference comparison on Realme and actual web, light/dark.
RV3 supersedes RV2 presentation; its generation and independent-toggle behavior
remain. Endpoint RV3 only; no later task started or AN1 resumed.
[Acceptance](ai/acceptance/rv3-topic-pill.md).
<!-- RV3 end -->

<!-- GS1 begin -->
GS1 / Generate course search on scroll (2026-10-19): **PASS for the finite
local code scope** from `149a516` on `overnight/2026-10-15_feedback`.
STEP 0-2, requested regressions/gates, additional forced root build, docs and
local commits complete. Mobile `b5a0d04` reuses SH2b Page for SnapshotStatus/
search; web `5886a0b` provides <=760px sticky direction hiding, 12px threshold,
200ms ease / instant Reduce Motion and hidden accessibility exclusion.
Both pin focus/raw queries; desktop layout and native refresh are preserved.
FRESH tests: shared 590, API 2433 / 3 intentional live skips, mobile 1522,
web 373. Typecheck/lint/root build each 8/8 tasks, 0 cached; six existing
warnings only. All 10 prompt gates pass, plus synthetic geometry/accessibility
4/4 widths with no network requests. Failed first attempts are retained.
Next: owner rollout and Realme down/up/focused/typed search checks, narrow web
and desktop confirmation. Rollout/Device checks NOT RUN, skipped entirely.
Live state UNVERIFIED (owner to confirm). No remote call, environment-file edit,
deployment or push. GS1 endpoint only; no later slice selected or AN1 resumed.
[Acceptance](ai/acceptance/gs1-generate-course-search-scroll.md).
<!-- GS1 end -->

<!-- GB1 begin -->
GB1 / generation action spacing (2026-10-19): **PASS for the finite local code
scope** from `795fbba` on `overnight/2026-10-15_feedback`. STEP 0-2,
regressions, all 10 requested gates, additional forced root build, docs and
local commits complete. Implementation `e1b4979`: shared mobile 240pt action
column with 12pt gap / 16pt top margin, artifact first and reconnect included;
20pt pill padding / 48pt minimum height; one primary. Web spacing/padding,
48px target and stalled single-primary parity retain WGP1 pane layout.
FRESH tests: shared 590, API 2433 / 3 intentional live skips, mobile 1521,
web 364; forced typecheck/lint/build each 8/8 tasks, 0 cached; existing six
lint warnings only. CSS geometry 4/4 widths; failed first attempts recorded.
Next: owner rollout and Realme running/stalled/failed/done checks, both NOT RUN
and skipped entirely here. Live/device state UNVERIFIED (owner to confirm).
No remote service operation, environment-file edit or push. Endpoint GB1;
no later slice started and AN1 is not resumed by this work.
[Acceptance](ai/acceptance/gb1-generation-action-spacing.md).
<!-- GB1 end -->

<!-- AN1 begin -->
AN1 / announcement read-on-open preflight (2026-10-19): **historical STOPPED
checkpoint, superseded by AN1b above**. Commit 795fbba preserved the original
row-write conflict without application changes. Owner's AN1b answers retain
mobile row-tap marking and authorize resolved-data once-per-open detail guards
on both apps. The original question is resolved; AN1b implements and tests the
revised scope. Historical evidence remains in the AN1 acceptance/handoff.
<!-- AN1 end -->

<!-- LG1 begin -->
LG1 / hidden Canvas files linked from visible sources (2026-10-19): **PASS**
for the finite unattended local code scope, baseline f709843, branch
overnight/2026-10-15_feedback retained. STEP 0-6, tests/gates/docs/local commits
complete. Shared effective policy requires current published, visible source
evidence. Course-batched reads, next-sync stale-status repair and preparation
through the existing 200-per-sync guard cover source status, previews and
snapshots. Both clients consume corrected API state; no client UI, migration,
dependency or ADR change. Finalize health records lack reference context and
retain the prompt's explicit exception; they do not gate material generation.
Commits: d318a09, ddcaef1, b345138; documentation hash in Git/LG1.status.
FRESH PASS: 10/10 requested gates. Forced typecheck/lint each 8/8 tasks, zero
cached; six existing lint warnings, zero errors. Shared 590/590 (56 files),
API 2433 passed / 3 intentional live skips (212 files, final committed-tree
rerun), mobile 1511/1511 (158 files), web 363/363 (55 files). API build 36/36
static pages, web 20/20, Android local export and diff hygiene pass. Additional
AUTOPILOT forced root build passes 8/8 tasks, zero cached, including local
Android/iOS/web exports. Failed first attempts are recorded in acceptance;
no nondeterministic flake. Generated declarations restored; owner paths untouched.
Rollout and Device checks NOT RUN, skipped entirely. Production state remains
UNVERIFIED (owner to confirm). No external service call, deployment, remote SQL,
Scheduler operation, environment-file edit or push. Next: owner rollout, SOC SCI
103N Realme/website sync/preparation/generation and read-only 14-row check.
[LG1 acceptance](ai/acceptance/lg1-page-linked-hidden-files.md).
<!-- LG1 end -->

<!-- UC3 begin -->
UC3 / APK release pipeline (2026-10-19): **PASS** for the finite local code
scope, baseline `0037a3a`, branch `overnight/2026-10-15_feedback` retained.
Endpoint: STEP 0-4, tests/gates/docs/local commits only. The update-checker
roadmap's UC1/UC2/UC3 code scope is complete; **RB7 is Fely's rollout**.
The publisher defaults to a side-effect-free dry run, imports the exact shared
release parsers, guards app.json mismatches, and tests publishing through
injected operations only. Runbook covers fullsend native APK versus OTA,
verified built versionCode under EAS remote versioning, and minSupported.
Implementation commits: `7e6f274` (script), `ece3721` (tests), `1dc1c20`
(runbook/ADR-051, linked from mobile device runbook and ADR-050).
FRESH PASS: **8/8 prompt gates**; Node publisher 27/27, shared 590/590 (56
files, existing emitted copies included), API 2404 passed / 3 intentional live
skips (210 files, two workers). Forced typecheck/lint each 8/8 tasks, zero
cached, six existing lint warnings and zero errors. API build 36/36 pages;
empty named APK dry run exits 0 with v2.2.0+6 argv; diff hygiene passes.
Additional forced root build passes 8/8 tasks, zero cached, including API/web
and local Android/iOS/web exports. No failed gates or nondeterministic flakes.
Rollout and Device checks NOT RUN, skipped entirely. Real publish mode NOT RUN;
no real gh runner, service call, deployment, remote SQL, Scheduler operation,
environment-file edit or push. Live release/artifact, EAS actual built metadata,
deployed revisions, remote-ref freshness, database/Scheduler and device state
remain **UNVERIFIED (owner to confirm)**. No mobile implementation, version,
runtime, dependency or migration change. Generated declarations are restored;
expected owner paths remain untouched. Next: owner RB7 and first use of the
publisher at a real native release, with no fake test release.
[Acceptance](ai/acceptance/uc3-apk-release.md); [runbook](dev/android-release-runbook.md).
<!-- UC3 end -->

<!-- UC2 begin -->
UC2 / public Android download page (2026-10-19): **PASS** for the finite local
code scope, baseline `c958cc1`, branch `overnight/2026-10-15_feedback` retained.
Endpoint: UC2 STEP 0-5, tests/gates/docs/local commits; UC3 completion is recorded above.
Public `/download` validates UC1 API metadata and shows version, UTC date,
plain notes, one APK action, local QR and installation steps. `/release`
redirects; auth entry points and the existing account menu link to download.
Mobile About shares the website download URL using the existing origin config.
Main implementation: `053beb6` (web), `eef9c67` (mobile). Showcase's existing
CTA is updated in ignored local clone `.local/showcase-download-link`, branch
`download-link`, commit `77dd54b`; no push or PR was performed.
FRESH PASS: all 10 prompt gates; shared 588/588, API 2404 passed/3 intentional
live skips, web 363/363, mobile 1511/1511; forced typecheck/lint 8/8 tasks each,
zero cached, six existing lint warnings. API 36/36 and web 20/20 static pages,
Android export, extra forced root build 8/8 tasks (zero cached, including local
Android/iOS/web exports), showcase build, diff hygiene, local browser 9/9.
Failed harness launches and clone commit attempt are recorded in acceptance.
Rollout and Device checks NOT RUN, skipped entirely; live production/release,
remote-ref freshness, database/Scheduler and physical-device behavior remain
**UNVERIFIED (owner to confirm)**. No deployment, production-service call,
remote SQL, Scheduler action, environment-file edit or push. Owner rollout,
Realme/QR/native-share checks and showcase push/PR remain. UC3 release automation is complete above; RB7 is Fely's rollout. [Acceptance](ai/acceptance/uc2-download-page.md); ADR-050 amended.
<!-- UC2 end -->

<!-- UC1 begin -->
UC1 / in-app update checker (2026-10-19): **PASS** for the finite local
code scope, baseline `7506d51`, branch `overnight/2026-10-15_feedback`.
Endpoint: UC1 STEP 0-6, tests/gates/docs/local commits only. Shared release
parsing/runtime comparison and the public API route are complete; mobile has
a persisted twelve-hour checker, one Today banner with version dismissal,
online-only minimum-supported sheet and Settings About/manual checks/notes.
No new native module, dependency, runtime or version-code change. Metadata
fetches are bounded; server cache is ten minutes with stale/204 fallback.
Implementation commits: `71e7a51`, `d24112c`, `e239af3`, `092fde0`,
`e48b8c5`, `8375004`, `62085d3`, `1ffcd06`.
FRESH PASS: shared 576/576 (source plus existing emitted copies), API 2404 passed /
3 intentional live skips, mobile 1503/1503; final forced typecheck/lint 8/8 tasks
each, zero cached, six existing lint warnings; API build 36/36 pages and Android
local export. Additional forced root build passes 8/8 tasks, zero cached,
including API/web and Android/iOS/web exports; final diff hygiene passes.
Rollout and Device checks NOT RUN, skipped entirely. Live release, production,
remote refs and phone behavior UNVERIFIED (owner to confirm); no remote service
operation, deployment, SQL, Scheduler change, environment-file edit or push.
Owner rollout/device acceptance remains separate; UC2 status is recorded above.
UC3 release automation completion is recorded above. [Acceptance](ai/acceptance/uc1-update-checker.md); ADR-050 in `docs/adr/`.
<!-- UC1 end -->

PAR1b / web-mobile parity audit (2026-10-19): **PASS for the finite docs-only source audit**, baseline `796e312` on `overnight/2026-10-15_feedback`, endpoint PAR1b only. Completed 54 source-backed feature rows and 16 gaps ranked by student impact; both platforms have file:line evidence, with partial behavior and roadmap mismatches explicit. Expected untracked owner paths remain untouched. FRESH PASS: `git diff --check` (1/1 prompt gate, 0 errors), docs-only scope (1/1, five docs paths), source-link/line validation; build/typecheck/lint/application tests NOT APPLICABLE. One local commit `docs: complete web vs mobile parity audit`; exact hash in Git and `tmp/overnight/PAR1b.status`. Rollout/Device checks NOT RUN, skipped entirely; live/deployed/migration/provider/Scheduler/device state UNVERIFIED (owner to confirm). Supersedes the prior PAR1 preflight-only record; owner exception is resolved. Next: Claude and Fely use Gaps for the next roadmap; no later slice started. [Audit](ai/parity-web-mobile-20261018.md).

PF1b / profile photos (2026-10-19): **PASS for the finite local code scope**, baseline `1ad0039` on `overnight/2026-10-15_feedback`, endpoint PF1b only. Private service-managed avatar storage and owner-only RLS/grants, bounded image validation/cropping, shared uploaded/provider/initial resolution and memory-only expiry, plus web/mobile photo controls are committed in `14a10d5`, `74c07df`, `8ee9099`, `6574093`, `fc9a330`. FRESH PASS: all 10 prompt gates; shared 542/542, API 2397 passed/3 skipped live cases, web 353/353, mobile 1481/1481; forced typecheck/lint 8/8 tasks each, 0 cached, six existing lint warnings; API/web/Android builds and diff hygiene pass; additional forced root build 8/8, 0 cached. Failed fixture attempts are retained in the acceptance report. Migration `20261018000300_profile_avatars.sql` is a FILE ONLY; rollout/device checks NOT RUN, all remote actions excluded. Live provider/production/device state UNVERIFIED (owner to confirm). [Acceptance](ai/acceptance/pf1b-profile-avatars.md).

OR2 / BACKLOG P14b (2026-10-18): **PASS for the finite code scope**, baseline 67e9dc4 on overnight/2026-10-15_feedback, endpoint OR2 only. Shared model 586e5bf, shader uniforms 6da7225, mobile 5483726 and web 39acf35 add device-persisted idle colors, tap bulges and held rotation/inertia using the existing render loops. Ring priority, scrolling, OR1b halo and generation-state appearance are retained; Reduce Motion switches color instantly without bulge/inertia. FRESH PASS 8/8 prompt gates: shared 520/520, mobile 1473/1473, web 348/348; forced typecheck/lint 8/8 tasks each, 0 cached, six existing lint warnings; API/Android builds and diff hygiene pass. Additional forced root build passes 8/8, 0 cached (API/web and local Android/iOS/web exports). Rollout and Device checks NOT RUN, skipped entirely; live/device state UNVERIFIED (owner to confirm). [Acceptance](ai/acceptance/or2-orb-interaction.md).

WGP1 / BACKLOG P16 (2026-10-18): **PASS for the finite code scope**, layout A, implementation 7799ef8. Web generation uses a 1.3fr/1fr layout from 1024px, a large height-capped orb, material name/page count, ordered server stages and state-specific actions; mobile, renderer, generation/retry/navigation behavior preserved. Course name and MD1 description omitted because the existing response has no lookup key. FRESH PASS 7/7 prompt gates (342 web / 502 shared tests), forced typecheck/lint 8/8 with 0 cached, plus forced root build 8/8, 0 cached. Local synthetic CSS geometry passes 4/4 widths, including no overflow at 360px. Rollout/Device checks NOT RUN; live state and physical appearance UNVERIFIED (owner to confirm). Scope baseline c372b50, STEP 0-5/tests/gates/docs/local commits only; endpoint WGP1. [Acceptance](ai/acceptance/wgp1-desktop-generation.md).

TC1b / BACKLOG P15 (2026-10-18): **PASS for the finite code scope**, superseding TC1's preflight STOP using the owner-approved server Today extension. Shared overnight math, planning/store/Schedule support, wrapped ring/drag, date ownership with boundary refresh, and mobile/web Clock options with typed time fields are complete locally. FRESH PASS 9/9 prompt gates (1462 mobile, 325 web, 489 shared, 2369 API / 3 intentional live skips); forced typecheck/lint 8/8, 0 cached. Rollout/device checks NOT RUN; production/device state UNVERIFIED (owner to confirm). ADR-047 resolves the ownership decision; no migration/RPC/SQL change. Endpoint TC1b only. [Acceptance](ai/acceptance/tc1b-today-clock.md).

IF2 / BACKLOG N11 (2026-10-18): complete locally with `5b7c41e` pending-card feedback and external image failure regressions; existing viewer-retention repair confirmed. FRESH PASS 8/8 expanded prompt gates (1439 mobile / 2351 API with 3 live skips / 309 web tests), plus forced root build 8/8, 0 cached. Endpoint IF2 only; next RB6/N9 fullsend/Realme acceptance remains owner work, NOT RUN; historical image failure UNVERIFIED (owner to confirm). [IF2 evidence](ai/acceptance/if2-external-image.md).

OR1b / BACKLOG P14 (2026-10-18): code complete locally in `8eca072`; owner-approved static Today halo resolves the previous OR1 preflight STOP without changing shared/web shaders or native dependencies. FRESH PASS 7/7 prompt gates (1446 mobile / 476 shared tests), plus forced root build 8/8, 0 cached; first test-only typecheck failure retained in evidence. Next: owner Preview OTA and Realme dark/light, handles/scrolling, Reduce Motion and power acceptance, all NOT RUN. Actual phone cause and remote state UNVERIFIED (owner to confirm). OR1b endpoint complete; OR2 is tracked separately above. [OR1b evidence](ai/acceptance/or1b-today-orb-glow.md).

IF1 / BACKLOG N10 (2026-10-18): complete locally with `bcd9ad6` cache-URI filename repair and six native-contract regressions; FRESH PASS 6/6 prompt gates (1434 mobile tests), plus forced root build 8/8, 0 cached. Endpoint IF1 only; RB6/N9 rollout and Realme saves remain owner steps, NOT RUN; historical phone exception UNVERIFIED (owner to confirm). [IF1 acceptance](ai/acceptance/if1-save-image.md).

QZ1 / BACKLOG P13 (2026-10-18): mobile/web tap-to-jump code complete locally (`3eb0be0`, `8df68cc`, `0880274`), prompt gates FRESH PASS 9/9; no scoring/persistence/API change and no flagged state. Next fullsend RB6 rollout and Realme/390px/desktop checks remain owner steps, NOT RUN; production/device state UNVERIFIED (owner to confirm). No later slice started. [QZ1 acceptance](ai/acceptance/qz1-question-jump.md).

## MD1 material descriptions complete via MD1b - PASS locally (2026-10-18)

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


[MD1 acceptance](ai/acceptance/md1-material-description.md). Cross-student reuse remains Future only.

## WD1 draft activity instructions complete locally - PASS (2026-10-18)

WD1's finite unattended code scope is complete: STEP 0-5, tests, fresh serial
gates, docs and local commits on `overnight/2026-10-15_feedback`, baseline
`fe660af`. Implementation: `8aa10db` (API/shared), `30a009e` (web),
`3817695` (mobile). The interrupted API suite was resumed; committed API work
was preserved. No later roadmap slice started.

The web draft aside now shows the linked activity's plain-text instructions,
due date and available points, with an eight-line Show all/Show less clamp.
Unavailable activities use section/slide outline links only with 2+ items,
without a Draft title link. Mobile shows a default-collapsed, accessible
Instructions section above the title, using the existing owner-scoped offline
activity cache. Editor saving, status and warnings stay intact. The optional
nullable pointsPossible DTO field uses the already-read assignment row;
no new query, migration, dependency, palette or cache behavior change.

**FRESH PASS: 10/10 prompt gate commands.** Forced root typecheck/lint each
**8/8 tasks, 0 cached**; API **2316 passed / 3 skipped** (201 files, two workers,
live cases disabled); shared **464/464** (44 files); web **297/297** (43 files);
mobile **1401/1401** (143 files). API build **1/1, 35/35** pages; web build
**1/1, 19/19** pages; Android export **1/1**; diff/staged-diff hygiene PASS.
Additional AUTOPILOT forced root build **8/8 tasks, 0 cached**, including
Android/iOS/web exports. Six existing lint warnings remain. Initial focused
fixture and test-only typecheck failures were corrected and all attempts are
recorded in acceptance; the resumed full suites had no failures or flakes.
Build-generated Next declarations were inspected and restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Fely owns API/web deployment, mobile OTA/APK, browser 1440/768px
instructions/due/points/clamp/fallback checks and phone collapsed/expanded/
offline-after-online-open checks. Production revisions, database rows,
Scheduler state, remote-ref freshness and browser/device behavior remain
**UNVERIFIED (owner to confirm)**. No remote service operation, deployment,
SQL/migration, Scheduler change, email, environment-file edit or push was run.
Unrelated `UI/`, `apps/mobile/.gitignore` and `supabase/.temp/` are preserved.

[WD1 acceptance](ai/acceptance/wd1-draft-activity-instructions.md) records exact commands/results and remaining owner steps.

## WL1 website Library sort menu complete locally - PASS (2026-10-18)

WL1's finite unattended website code scope is complete: STEP 0-4, local tests,
fresh serial gates, docs and local commits. Baseline `341cf62`, branch
`overnight/2026-10-15_feedback`; implementation `ea9ffa9`. No later roadmap
slice started. Reviewer code, mobile, API/schema and dependencies are unchanged.

Both Library views now use one compact icon + Sort button with a checked
radio menu. The existing web list still mirrors mobile's options and context
filtering. Menu choices retain the existing scope keys and persistence.
First-item focus, arrows/Home/End, Escape, outside dismissal, Tab blur and
selection focus follow the reviewer pattern; outside dismissal restores focus.
The right-aligned menu reuses account-popover tokens with a viewport width cap.
No shared component was extracted and no ADR was needed.

**FRESH PASS: 7/7 prompt gate commands.** Forced root typecheck/lint each
**8/8 tasks, 0 cached**; web **289/289** (42 files), shared **464/464**
(44 files); API build **1/1, 35/35** pages; web build **1/1, 19/19** pages;
diff and staged-diff hygiene PASS. Additional API suite **2315 passed,
3 skipped** (201 files, 2 workers); AUTOPILOT forced root build **8/8 tasks,
0 cached**. Focused Library/reviewer tests **21/21**. Six existing lint
warnings remain. First typecheck failed with three new test mock type errors
(4 successful/6 total tasks); corrected before the full fresh passing retry.
No test flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Fely owns website deployment and browser checks at 1440/768/360px
for Library grid/course: menu opening, checked choice, persistence after
reload and keyboard Escape. Production revisions, database rows, Scheduler,
remote-ref freshness and browser/device behavior are **UNVERIFIED (owner to
confirm)**. No remote service operation, deployment, SQL/migration, Scheduler
change, email, environment-file edit or push was run.

[WL1 acceptance](ai/acceptance/wl1-library-sort-menu.md) records the baseline, source findings, matrix and all
commands/results, including the failed first attempt.

## GN1 mobile grace navigation complete via GN1b - PASS (2026-10-18)

GN1b completes the finite unattended mobile code scope, superseding GN1's
preflight STOP at `8dffcd4`. Baseline `8dffcd4`, branch
`overnight/2026-10-15_feedback`. Implementation commits: `a387c59` (hook/ADR)
and `29bbe1d` (screens/tests). No later roadmap slice started.

Reviewer Generate and confirmed single Library Remake open the saved intent's
generation page after two seconds. Blur, navigation (including parent tab/stack
changes), background/inactive state, unmount, reschedule and Queue opening
cancel the pending push. Admission continues independently. The delayed route
omits `start`; GenerationScreen observes a late persisted job ID after Queue
updates/focus without admitting again, and preserves a manually retried job ID.
Generate all/Select materials keep their immediate Queue popout and unchanged
test; Quiz and all other immediate paths retain their behavior. ADR-045 records
the shared mobile pattern; no API/schema/dependency or accessibility change.

**FRESH PASS:** all **7/7 prompt gate commands**. Forced root typecheck and
lint **8/8 tasks each, zero cached** (six existing lint warnings); shared
**464/464** (44 files), mobile **1395/1395** (142 files); API build **1/1**,
**35/35** pages; Android export **1/1**; diff/staged-diff hygiene PASS.
Additional API suite **2315 passed, 3 skipped** (201 files) with two workers;
AUTOPILOT forced root build **8/8 tasks, zero cached**. First API attempt:
2314 passed/1 timed out/3 skipped; reduced-worker full retry passes without
changing assertions/timeouts. New Remake fixture failures (112 pass/5 fail)
were fixed, then focused **117/117** passed. Acceptance records all attempts.
Build-generated Next declarations were restored; unrelated work preserved.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely: Fely's mobile OTA/APK and Realme stay-two-seconds, navigate-away,
home/background-return and immediate Generate-all Queue checks. Production
revisions, database rows, Scheduler, remote-ref freshness and physical-device
behavior are **UNVERIFIED (owner to confirm)**. No remote service call,
deployment, SQL/migration, Scheduler change, email, environment-file edit or
push. [GN1/GN1b acceptance](ai/acceptance/gn1-grace-navigation.md).

## OS1 source option rows complete via OS1b - PASS (2026-10-18)

OS1 is done via OS1b. The owner correction resolves and supersedes the
preflight STOP at `9613d00`: reuse RowLink's existing opacity/scale pressed
feedback. Finite unattended STEP 0-4, tests, fresh serial gates, docs and
local commits are complete on `overnight/2026-10-15_feedback`, baseline
`9613d00`. Implementation: **26a8e69** (mobile), **a8484f6** (web).

Mobile chooser and in-mode pick actions use monotone icon RowLinks with
original labels, handlers, chooser testIDs and busy flags. The shared row
only gains optional testID forwarding; its 48pt targets, accessible role/
label and pressed feedback remain unchanged. Footer actions, Try again,
global Button and sheet chrome are unchanged. Web preflight confirmed the
white selected background; existing `--hover` now supplies a muted selected/
active state scoped to `.own-material .segments`, with no selected shadow
and text/file icons. Other toggles are unchanged.

**FRESH PASS:** forced root typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files), mobile **1372/1372** (141 files), web
**281/281** (42 files); API build **1/1**, **35/35** pages; Android export
**1/1**; web build **1/1**, **19/19** pages; AUTOPILOT forced root build
**8/8 tasks, 0 cached**; diff/staged-diff hygiene **PASS**, zero whitespace
errors. Focused mobile/web **20/20** and **9/9**; local browser CSS **8/8**.
Six existing lint warnings remain. Initial test-lint and local helper
failures and their repairs are recorded in the acceptance report; no suite
flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Realme light/dark acceptance should confirm icon rows, no filled
white highlight, existing RowLink opacity/scale feedback and the same source
flows. Production revisions, database rows, Scheduler and device/real-account
behavior are **UNVERIFIED (owner to confirm)**. No remote call, deployment,
SQL/migration, Scheduler change, email, environment-file edit or push. No
later roadmap slice started; no ADR needed.

[OS1b acceptance](ai/acceptance/os1b-source-option-rows.md) records the scope, source findings and evidence.

## SH2 mobile hide-on-scroll complete locally - PASS (2026-10-18)

SH2 is done via SH2b: the corrected Page/native RefreshControl facts resolve
and supersede the earlier preflight stop at `d98e58b`. Finite unattended
STEP 0-4, local tests/gates and implementation are complete on
`overnight/2026-10-15_feedback`, baseline `d98e58b`. Implementation commits:
**10347e2**, **fb99de4**. Documentation closes this finite mobile-only slice;
no later roadmap task was started.

One shared hook collapses measured height and opacity with the existing
**180ms** eased motion token (Reduce Motion: instant). Downward travel hides
past **header height + 24pt**; **8pt** accumulated hysteresis prevents jitter.
Up, top/negative overscroll and short refreshed/resized content reveal it;
bottom rebound and viewport offset correction cannot reopen it accidentally.
Page opts in and composes hook then caller at 16ms; native RefreshControl
and Sheet drag logic are preserved. Hidden descendants leave accessibility
and touch navigation. No dependency, schema, API or token change.

Today collapses date/status, keeping its greeting in the fixed Queue/Profile
actions row. Both Tasks pages collapse SnapshotStatus; main Tasks includes
its existing sync line. Library course collapses only the offline caption,
keeping sort/filter/selection/status controls fixed and organizer scroll
connected. Reviewer snapshot/search collapses except while focused or a raw
or deferred query is active, including match jumps. Back/actions/tab bar stay
visible. **PAR1:** website has no hide-on-scroll header in inspected source.

**FRESH PASS:** final forced root typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files, existing compiled copies included); mobile
**1365/1365** (141 files); API build **1/1**, **35/35** static pages; Android
local export **1/1**; diff/staged-diff checks **2/2**, zero whitespace errors.
Focused tests **117/117**. Six existing lint warnings remain. Initial stub,
missing-import and test-lint failures and their repairs are recorded in
[SH2b acceptance](ai/acceptance/sh2b-hide-on-scroll.md); no nondeterministic
flake. Build-generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely: owner mobile OTA/APK, then Realme down/up/no-gap, existing refresh,
Reduce Motion, search and TalkBack checks. Production revision, database/
Scheduler state and real-account/device behavior are **UNVERIFIED (owner to
confirm)**. No remote service calls, deployment, remote SQL, migration,
Scheduler operation, email, environment-file edit or push. Unrelated work
is preserved.

## RV2 topic level pill complete locally - PASS (2026-10-18)

Finite unattended STEP 0-4, tests, all eight required fresh serial gate
commands, documentation and scoped local commits are complete on
`overnight/2026-10-15_feedback`, baseline `1064513`. Mobile and website now
show one four-part topic pill. Original / Simplify / Explain simply retain
their level selection; Expound remains an independent expandable button,
separated by an existing border token. Open Expound and the selected level
can both highlight. Signed-out website controls keep their sign-in links.
No source, API, migration, dependency or native module change.

Mobile has 32-point visible segments with vertical-only 6-point hit slop
inside 44-point parent bounds, no ScrollView and full accessibility names.
Short labels Original / Simpler / Simplest appear below **380 measured row
points** (about 85 text points per segment at the boundary). Website uses
them at **<=400px viewport**, equal shares, 44px targets and no scrolling.
Implementation: **0b553dd**, **bf5febd**, **fc1cb84**, **ec580e9**.

**FRESH PASS:** root forced typecheck/lint **8/8 tasks each, 0 cached**;
shared **447/447** (44 files, existing compiled copies included), web
**280/280** (42 files), mobile **1334/1334** (139 files); API build **1/1**,
**35/35** static pages; local Android export **1/1**; diff/staged-diff checks.
Isolated browser **24/24** at 1440/768/390/360px in light/dark themes, using
actual components and CSS with all network blocked, zero requests/errors.
Six existing lint warnings remain. Three deterministic initial browser
failures and fixes are retained in acceptance; no nondeterministic flake.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner website deployment and mobile OTA/APK, then Realme 360-point
readability, no-scroll, Expound and TalkBack checks, plus real web at 1440/390.
Production revision, database/Scheduler state and real-account/device behavior
are **UNVERIFIED (owner to confirm)**. No remote service call, deployment,
remote SQL, migration application, Scheduler operation, environment-file edit
or push. Build-generated Next declarations were restored; unrelated untracked
work is preserved. RV2 is the finite endpoint; no later task started.

[Acceptance and exact evidence](ai/acceptance/rv2-topic-pill.md).


## QU1 Queue popout complete locally - PASS (2026-10-18)

Finite unattended mobile + web Queue scope is complete: STEP 0-5, tests,
fresh serial gates, docs and local commits. Shared helpers hide finished batch
progress and govern idle state; compact headers use accessible busy refresh
icons beside Close. Existing dismissal, focus and generation actions remain.
The 4/4 screenshot was stale finished display, with a separate terminal-count
defect repaired in the API. Failure attention remains independent of progress.
No DTO/schema change, dependency, migration or new design token.
Implementation: **7eb50c2**, **529d466**, **7f519a3**, **bc2e6b2**.

**FRESH PASS:** root forced typecheck/lint **8/8 each, 0 cached**; shared
**446/446** (44 files, existing compiled copies included), web **278/278**
(42 files), mobile **1332/1332** (139 files), API **2315 passed / 3 skipped**
(201 files); API build **1/1**, **35/35** pages; Android export **1/1**;
final web typecheck/lint and diff/staged checks. Six existing lint warnings;
the first mobile run's **8 assertion failures** and repair are retained in
[QU1 acceptance](ai/acceptance/qu1-queue-popout.md). No nondeterministic flake.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely: owner website deploy, mobile OTA/APK, Android finished-batch/empty
state/TalkBack refresh/outside/Back review, and web review at 1440/390 px.
Production revision/database/Scheduler and real-account/device behavior remain
**UNVERIFIED (owner to confirm)**. No remote calls, deployment, migration,
environment-file edit or push. QU1 is the stopping point; no later task started.

## WG3 done via WG3b - PASS locally (2026-10-18)

WG3b supersedes WG3's docs-only preflight stop at `1e53edd`. Website Generate
home STEP 0-7, tests, required fresh serial gates, docs and local commits are
complete on `overnight/2026-10-15_feedback`; implementation **0eb0aaa**.
Current courses come first, then own material, collapsed Not synced and Past.
Corner ellipsis menus preserve Canvas's labelled caller, Sync is secondary,
one combined sync line prioritizes active work over failure over freshness,
and all nine website Try again actions regain standard padding. Search keeps
own material visible. No API/mobile implementation, dependency or migration.

**FRESH PASS:** root forced typecheck/lint **8/8 tasks each, 0 cached**;
web **265/265 tests, 42/42 files**; API build **1/1**, **35/35** static pages;
diff/staged-diff checks. Fictional intercepted browser **35/35** at four widths
plus wide touch; zero unexpected requests/errors. Six existing lint warnings;
failed first attempts and evidence in
[WG3b acceptance](ai/acceptance/wg3b-generate-home.md). Mobile build/tests
NOT APPLICABLE. No nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely; RB6/fullsend website deployment from main and real-account
desktop/phone browser review. Production revision, database rows, Scheduler
and real-account behavior **UNVERIFIED (owner to confirm)**. No remote service
call, deployment, remote SQL, Scheduler change, environment-file edit or push.
Unrelated work is preserved. Stop at WG3b; no later roadmap task started.

## RV1 reviewer header complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, fresh serial local gates, docs and local
commits.** Mobile title-row Reviewer actions contains Export and Share in a
measured native popover, reusing QueueDropdown's outside/Android Back pattern.
The title wraps beside a 48-point trigger; the menu has no animation. Offline
Export works; Share keeps its owner/offline guard, sheet and request logic.
Website Share/Save to file use the existing account popover pattern with
Escape/focus return, arrows/Tab and outside dismissal; Generate Quiz stays
visible. Both clients group minutes/topics compactly. Mobile automatic labels
and website course/date remain. Reviewer-only hideFreshLabel suppresses idle
Updated while preserving Syncing, error/Retry and update-available actions.
Other screens retain default status behavior. **RV1 supersedes RX1's button
row.** No existing reviewer Save offline action; none invented. No reusable
primitive, ADR, dependency, native module, API change or migration.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; mobile **1321/1321** (139 files), web **249/249** (42 files), shared
workspace **427/427** (44 files including existing compiled copies), separate
shared source-only **215/215** (22 files). Standalone API build **1/1**,
**35/35** pages; Android export **1/1**. Root build includes website **19/19**
pages and Android/iOS/web exports. Diff/staged-diff PASS; six existing lint
warnings. Deterministic failed first attempts are recorded in acceptance;
no nondeterministic flake. Implementation: **e4f5ee9**, **0f500cd**, **6bef993**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB6 fullsend: website deploy and APK/OTA, then Realme menu,
offline/meta/status checks and browser checks at 1440/390 px. Production
revision, database rows, Scheduler and device/browser behavior are **UNVERIFIED
(owner to confirm)**. No remote service operation, deployment, remote SQL,
Scheduler change, email, environment-file edit or push. Generated Next
declarations were restored; original untracked work is preserved. RV1 is the
finite endpoint; no later task started. WG3's earlier stop remains independent.

[RV1 acceptance](ai/acceptance/rv1-reviewer-header.md).

## MR3 Try again on failed generation complete locally - PASS (2026-10-18)

Finite unattended STEP 0-5, tests, fresh serial gates, docs and local commits are
complete. Mobile and website reuse the accepted source/extraction with fresh
accepted-attempt keys, duplicate guards, plain stage copy and typed 409/422
rejection handling. Historical safe Reviewer/Quiz failures become eligible
without weakening validation or automatic retry policy. Deleted/unavailable
source denial remains authoritative. Existing primary/secondary styles remain.

**New function-only migration: `20261018000100_failed_generation_retry.sql`.
Owner application is required before rollout; no existing-row backfill and no
remote application occurred.** Implementation commits: **84ab171**, **71f3d25**,
**55d4eb0**, **cb36f82**. Policy and failure-code table: ADR-044.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, 0 cached**; shared
**393/393**, API **2306 passed + 3 existing live skips**, mobile **1311/1311**,
web **236/236**; standalone API build **1/1**, **35/35** pages, Android export
**1/1**. Root build includes website **19/19** and all Expo platforms. Both diff
checks PASS; six existing lint warnings. First failures and corrective checks
are retained. Optional standalone workflow probe is **BLOCKED (zero test files)**,
NOT APPLICABLE to mandatory MR3 gates; runtime/provider boundary unchanged.

**Owner steps remaining:** apply migration, publish API/web/mobile and perform
the specified failure/retry device check. Rollout/Device checks **NOT RUN**,
skipped entirely. Live deployment/database/Scheduler/device state **UNVERIFIED
(owner to confirm)**. No remote calls, deployment, remote SQL, Scheduler, email,
environment-file edit or push. Preserve unrelated work; no later task is started.

[MR3 acceptance](ai/acceptance/mr3-failed-generation-retry.md) ·
[ADR-044](adr/ADR-044-failed-generation-retry.md).

## OI1 offline reviewer images complete locally - PASS (2026-10-18)

Finite unattended STEP 0-8, tests, fresh local gates, docs and local commits
are complete. Reviewer images save automatically to private document storage
after the text, with a persistent SQLite v9 manifest, concurrency two, retries,
fresh owner reads and atomic publication. All three image surfaces prefer local
files and retain labels/attribution. Readiness and storage include image state
and bytes. Caps retain a reading-order prefix (40 MiB per reviewer / 500 MiB
app-wide) with Some images need a connection. Removal, supersession, replacement,
source denial, clear and sign-out invalidate previews and reject late writes.
Manual gallery saving remains; no native dependency, API or remote migration.
**PAR1:** website has no offline mode; website offline work is NOT APPLICABLE.

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 each, 0 cached**;
shared **362/362** (42 files), mobile **1301/1301** (137 files); standalone API
build **1/1**, **35/35** pages; Android export **1/1**. Root build also exports
iOS/web and builds website **19/19** pages. API tests NOT APPLICABLE (unchanged).
Diff/staged-diff PASS; six existing lint warnings. Failed first attempts and an
aborted resumed build are retained in acceptance; no nondeterministic flake.
Implementation **c78e4b5**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Publish reviewed mobile code, check offline images after airplane
mode/restart and verify replacement/removal storage cleanup. Live deployed/native
revision, database/Scheduler state and device behavior are **UNVERIFIED (owner
to confirm)**. No live provider check, deployment, remote SQL/migration,
Scheduler action, email, environment-file edit or push was run. Preserve earlier
release limitations and unrelated work; stop at OI1 without starting later scope.

[OI1 acceptance](ai/acceptance/oi1-offline-reviewer-images.md) ·
[ADR-043](adr/ADR-043-offline-reviewer-images.md).

## WV1/N7 reviewer image load complete locally - PASS (2026-10-18)

**PASS for unattended STEP 0-5, tests, local gates, docs and commits.** Website
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
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Owner RB5: deploy reviewed API/web and assess real reviewer image
loading; publish/recheck the mobile change on device. Deployment revision,
production rows, device behavior and Scheduler state are **UNVERIFIED (owner
to confirm)**. No remote call, deployment, SQL/migration application, Scheduler
action, email, environment-file edit or push occurred. The referenced overnight
roadmap is absent; the complete WV1 prompt supplied scope. Unrelated untracked
paths are preserved. This finite run ends at WV1; no later task was started.

[WV1 acceptance](ai/acceptance/wv1-reviewer-images.md).

## WG2/N6 complete locally - PASS; owner RB5 remains (2026-10-18)

Finite WG2 STEP 0-2, tests, gates, docs and local commits are complete. Generate
rows use the existing server `reviewerArtifactId` for Reviewer ready (including
the accessible name). Detail actions are Open reviewer and confirmed Remake;
the saved Reviewer remains accessible during submission/failure. Ready facts,
acceptance/return refresh and later-page revalidation are covered. Existing Quiz
and no-Reviewer generation remain. No API, mobile, dependency or schema change.

**generating state per material: not available from existing data**. General
job DTOs have no material ID, and batch-only mappings cannot determine the latest
job for arbitrary direct remakes. The permitted fallback uses saved state only.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, 0 cached**; web
**224/224** (38 files), shared **350/350** (40 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; Android/iOS/web exports, 68 assets;
diff/staged-diff hygiene PASS. Six existing lint warnings. Corrected initial
test-fixture typecheck/lint failures are retained in acceptance. Implementation
**0eaffa9**; tests **bb2395f**.

**Owner steps remaining:** Rollout and Device checks **NOT RUN**, skipped
entirely. Publish/review RB5 on phone and resized desktop. Deployment, owner
acceptance and live DB/Scheduler state are **UNVERIFIED (owner to confirm)**.
No remote service call, deployment, remote SQL/migration, Scheduler action,
email, environment-file edit or push. The absent overnight roadmap is recorded;
the full WG2 prompt supplied scope. Stop here; WV1/MD1 were not started.

[WG2 acceptance](ai/acceptance/wg2-generated-reviewer-state.md).

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

[FX1 diagnosis and FX1b outcome](ai/acceptance/fx1-image-diagnosis.md).

## FULLSEND shipped; live acceptance PARTIAL (2026-10-18)

The explicitly authorized release is on main and production: pinned WG1
653e8d8a2b9b43b7e607e103d9d1a09a25cd451c, tested application main
dc162de3df634eea8b447f73ac67d758be75f4ee. It includes INT1/PR #12, MR1,
SA1/SA2, MR2, IM1b, RT1, EV1, RX1, IM2 and WG1. **WG2, WV1 and MD1 are not
in this release.** The active autopilot worktree and other worktrees were
preserved; this release used a separate clean clone.

All fresh gates and GitHub CI run 39069451068 pass. Root forced
typecheck/lint/build: 8/8 each, zero cached. Doctor: 21/21. Shared: 350,
Canvas: 75, OCR: 27, engine: 606, API: 2,268 plus 3 existing live skips,
mobile: 1,239, web: 209, provider contract: 20; zero failing tests.
The sole release migration, 20261016000100_manual_reviewer_uploads.sql,
was applied before main; all 95 staged/remote versions match.

Worker generation-worker-00028-f5t is Ready with 100% traffic on image
worker:b55d5a5. API dpl_2f7nfcr1Y5JJufzTZYmqu1s7276g and website
dpl_EgAH83B3iJFhkHT5fWiN6PBHe5MN are READY; health and HTTP availability
pass. Realme RMX3151 was upgraded in place to **2.2.0 / code 6**, runtime
2.2.0-sdk57, from signed EAS build 2ed33756-ef3b-4887-ac0a-fa0c59adf7ab.
The owner session and all 75 offline Library items remain. No OTA was published.

Physical PASS: Export/Share row, first What is this? Ask chip, bulleted and
revealed text/image answers, tap-only source-figure details, pull-down close,
Library Sort placement and offline cold restart. Two live generation requests
were used. Physical FAIL: Save image shows its generic failure alert, and the
checked external-reference image stays blank and cannot keep its viewer open.
Causes are unverified. NOT RUN: desktop/390px website UI (Windows browser
activation Access denied), overflowing-viewer scroll, and Office upload
(no suitable local instructional source). These prevent full live acceptance.

Next: repair/recheck the two image failures and finish the unrun checks; keep
the finite release endpoint at WG1. Preview autoIncrement is false to retain
code 6 after the first failed build; deliberately advance the code or restore
auto-increment before a later native release. Email delivery remains disabled
(CANVAS_EMAIL_DELIVERY_ENABLED=0 was not changed); no plan purchase, persistent
credential creation/rotation, destructive SQL or app-data deletion occurred.
This entry supersedes older owner-rollout-pending statements for the shipped
scope; their historical local evidence remains below.

[Full release acceptance](ai/acceptance/fullsend-20261018.md).

## WG1 website Generate layout complete locally - PASS (2026-10-18)

**PASS for unattended WG1/N5 STEP 0-2, tests, fresh serial gates, documentation
and local commits.** Generate search/link and course heading actions wrap across
1440-360 px. Breadcrumb levels truncate on one line without colliding with Queue.
Batch buttons reuse shared padding/height; cards in each row stretch equally;
material titles/meta/actions wrap. Both Generate and Canvas use one styled
Course options disclosure with aria-expanded, Escape/focus return and outside
click/focus dismissal. Canvas popovers escape the card list's overflow clipping.

Single in-flight sync text lives in CanvasRefreshStatus below the heading.
During that global refresh the course button keeps a spinner, disabled state
and aria-busy without duplicate Syncing text; local text remains when global
refresh is idle. Existing sync and move-course requests are preserved. No API,
mobile, dependency, schema or migration change. Implementation: **ace4cb2**;
browser harness: **f485a2f**.

**FRESH PASS on f485a2f:** forced root typecheck/lint/build **8/8 tasks each,
zero cached**; web **209/209** tests (37 files), focused render/batch **8/8**;
standalone API/web builds **1/1 each**, **35/35** and **19/19** pages; root
Android/iOS/web exports with 68 assets. Local Playwright **20/20** page/viewport
checks and **10/10** mocked move-course requests, zero text-control collisions,
horizontal page scroll, unexpected requests or runtime errors. Screenshots and
logs: ignored .local/wg1/. Diff/staged-diff hygiene PASS. Six existing lint
warnings remain (five mobile, one web); every final gate passed first attempt.
Focused development failures and browser-checker false positives are retained
in acceptance; no nondeterministic flake observed. API/mobile/shared tests
NOT APPLICABLE (unchanged); generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner publishes the reviewed website change and performs RB5 Generate in a phone
browser and resized desktop. Deployed revision, owner device acceptance and
live DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The referenced
overnight roadmap file is absent; the complete WG1 prompt supplies the scope
without contradicting implementation. No remote service call, deployment,
SQL/migration application, environment-file edit, Scheduler action, email or
push occurred. Expected unrelated untracked paths remain. This finite run ends
at WG1; no later roadmap task was started.

[WG1 acceptance](ai/acceptance/wg1-generate-layout.md).

## IM2 reviewer images complete locally - PASS (2026-10-17)

**PASS for unattended IM2/N4 STEP 0-3, tests, fresh serial gates, documentation
and local commits.** Opening an image reveals its details inside the viewer on
all mobile/web surfaces. Grounding remains visible; external Commons/source and
license links are direct viewer actions. Named thumbnails, Ask/Save exact targets,
offline guards, source precedence and existing gallery permissions remain.

Mobile uses one scrollable ImageViewer Modal for images/details/actions, with
pinch/double-tap zoom, bounded pan, top/zoom-1 pull-down dismissal (120 dp or a
fast downward flick), Android back and Reduce Motion. An explicit touch boundary
prevents reader edge-scrubber interaction. Web dialog/image overflow supports
all zoom levels; Close/backdrop dismissal and native Esc semantics remain.
No dependency, native module, API, schema or migration is added. Code commits:
**93dea65**, **13833e9**, **11fb0ee**, **739d80b**, **311cc58**.

**FRESH PASS on code 311cc58:** forced root typecheck/lint/build **8/8 each,
zero cached**; mobile **1,239/1,239** (133 files), web **204/204** (35 files);
standalone API and Android builds **1/1 each**, API/web pages **35/35** and
**19/19**, Android one bundle/35 assets, root Android/iOS/web exports with 68
assets. Diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings.
Initial lint (7/8 tasks) and mobile (3 import failures / 130 passing files)
failures were fixed; focused test expectation failures and retries are retained
in acceptance. No nondeterministic flake observed. API/shared tests NOT
APPLICABLE (unchanged). Generated Next declarations inspected and restored.

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Release mobile/website through the normal owner flow; perform RB5 on Realme for
caption reveal, always-visible grounding, direct license access, tall-content
scroll, pull-down, zoom/pan, Android back, Reduce Motion and edge-swipe isolation;
check website scrolling and Esc/Close/backdrop. Deployed revisions, native/browser
interaction and DB/Scheduler state are **UNVERIFIED (owner to confirm)**. The
referenced overnight roadmap file was missing locally; the full IM2 prompt
supplied the scope without an implementation contradiction. No remote service
call, deployment, SQL/migration application, environment-file edit, Scheduler
action, email, fetch or push occurred. Expected unrelated untracked paths remain.
This finite run ends at IM2; no later roadmap item was started.

[IM2 acceptance](ai/acceptance/im2-reviewer-images.md);
[ADR-041](architecture/ADR-041-reviewer-image-viewer.md).

## RX1 reviewer header complete locally - PASS (2026-10-17)

**Header layout superseded by RV1; RX1 validation below is historical.**

**PASS for unattended RX1/N3 STEP 0-2, fresh serial gates, documentation and local
commits.** Mobile now renders title, equal-width secondary Export/Share row,
review-time/topics metadata, Generate Quiz hero and hint in that order. Export
fills the row for non-artifact reviewers. At font scale 2 and above the buttons
stack with complete labels; existing 48-point targets, accessibility defaults,
Share/offline behavior and source content remain. Website actions already use
one row and are unchanged. No dependency, native module or migration is added.
Implementation/tests: **0ce5db6**.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile
**1,216/1,216** tests (131 files); focused header/Share suites **14/14** (3 files);
standalone API and Android builds **1/1 each**, API/web pages **35/35** and
**19/19**, Android one bundle/35 assets, root Android/iOS/web exports with 68
assets; diff/staged-diff checks PASS. Zero lint errors, six existing warnings.
First typecheck failed **7/8 tasks** on a test fixture's too-narrow metadata
type, corrected with the component prop type; the fresh retry passed. No flake
observed. Web/API/shared tests NOT APPLICABLE (unchanged). Generated Next
declarations restored. [RX1 acceptance](ai/acceptance/rx1-reviewer-header.md).

**Owner steps remaining:** Rollout and Device checks skipped entirely (NOT RUN).
Owner releases the mobile change and performs RB5 on Realme, including narrow
and large-font layout, focus order, offline Share and Export-only fallback.
Deployed revisions and physical behavior are **UNVERIFIED (owner to confirm)**.
No remote service call, deployment, SQL/migration application, environment-file
edit, Scheduler action, email, fetch or push occurred. Expected unrelated
untracked paths are preserved. This finite run ends at RX1; no later item started.

## EV1 external references complete locally - PASS (2026-10-17)

**PASS for unattended EV1/N2 STEP 0-2, fresh serial gates, documentation and local commits.** Root cause in code: mobile coupled external visibility to source discovery and snapshot eligibility instead of displayed source URLs, with a batch-wide parser failure capable of hiding every valid reference. Snapshot/figure components now report displayed source images; found Commons references can render during pending, absent or failed discovery. Malformed sections are omitted individually while strict visual validation remains.

The exact external label, attribution, Wikimedia headers, source precedence, offline/auth/reachability guards, bounded batch polling and explicit replacement flow remain. Temporary reviewer.* diagnostics are removed. Captions and image viewer behavior are preserved. No API/web/shared serializer, migration, dependency or native module changed. Code commits: **239a0ab** (reproduction), **a9c1d7f** (fix).

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; mobile **1,209/1,209** (130 files); focused regressions **87/87** (5 files); standalone API and Android builds **1/1 each**, API/web pages **35/35** and **19/19**, Android one bundle / 35 assets, root mobile Android/iOS/web exports with 68 assets; diff/staged-diff hygiene PASS. Zero lint errors, six existing warnings. Deliberate red reproduction **7 failed / 80 passed** is retained in acceptance; every gate passed on its first gate attempt and no nondeterministic flake was observed. API/web/shared tests are NOT APPLICABLE because those workspaces did not change. Generated Next declarations were restored.

**Owner steps remaining:** Rollout and Device checks were skipped entirely (NOT RUN). Publish the reviewed mobile fix through the normal owner release flow; RB5 on Realme must confirm a found external image, exact label and attribution for a section without a course image, source precedence and offline behavior. Deployed revisions, actual stored visuals, applied migrations, database/Scheduler state, provider/image egress and physical-device root cause remain **UNVERIFIED (owner to confirm)**. No deploy, push, fetch, remote service/SQL call, migration application, environment-file edit, Scheduler action or email occurred. Unrelated UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. This finite run ends at EV1; IM2 and later items are not started.

[EV1 acceptance](ai/acceptance/ev1-mobile-external-references.md).

## INT1 combined locally - PASS (2026-10-17)

**PASS for the finite unattended INT1 code scope, fresh serial gates, documentation and local commits.** Merge efad5c9 combines the 35 local 10-16 commits through a967460 with PR #12 at 8fcdf16; 979f120 cherry-picks only f3dd833 with provenance. Test commits 2ddb9a8 and 21e685a prove the combination and restore PR #12's grouping contract. MR1/SA1/SA2/MR2/IM1b/RT1 remain, with PR #12 offline auth, silent idempotent Reviewer submission, organization and sorting. What is this? renders first, and inline/zoom image Ask callbacks pass for snapshots, extracted figures and external visuals on both platforms.

PR #12 mobile sorting wins: pill beside update status, compact highlighted 48-point rows, disabled during selection, displayed-title alphabetization, owner/course-scoped preferences and offline Canvas sequence cache. Website has one contextual select with identical options/values/labels and preference DTO. Both clients use complete material sequences for Canvas order; unlinked work follows. Obsolete LS1 sorting/open tracking and unused sourcePosition projection/tests are removed. Both preference versions parse safely. ADR-040 records the supersession; original branch histories below are retained as historical evidence.

**FRESH PASS:** forced root typecheck/lint/build **8/8 each, zero cached**; shared **350/350** (40 files), API **2,268 passed / 3 existing live skips** (199 files), mobile **1,202/1,202** (130 files), web **203/203** (35 files), Canvas **75/75**, OCR **27/27**, engine **606 evaluations / zero failures**. Lint has zero errors and six existing warnings. API/web build 35/35 and 19/19 pages; mobile exports Android, iOS and web (68 assets). Generated Next.js declarations were restored. Root gates ran on production code at 2ddb9a8; the only subsequent code-tree change restores a PR #12 test, verified by fresh mobile typecheck/lint and the full suite. First failures and repairs are recorded in acceptance; no nondeterministic flake was observed.

PR #12 CI was green at 8fcdf16 (run 39035996757), according to owner-provided history; live CI was not queried. Nothing beyond the reported Realme OTA is deployed. Deployed revisions, database rows/applied migrations, provider behavior, Scheduler and physical acceptance are **UNVERIFIED (owner to confirm)**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely and remain RB5 owner work after the later roadmap slices. No push, deployment, remote database/service call, migration application, environment-file edit, Scheduler action or email occurred; git fetch was the sole authorized remote operation. No changes to codex-fullsend-20261016.md. This run ends at INT1; EV1 and all later items were not started.

[INT1 acceptance](ai/acceptance/int1-local-integration.md).

## LS1 Library sorting complete locally (2026-10-16)

**PASS for unattended LS1 STEP 0-3, fresh serial gates, documentation and local commits.** Mobile and website Library now offer Recently added / Course / Title A-Z / Recently opened; course contents default to Canvas order, with Recently added and Title A-Z alternatives. Shared pure comparators sort within pinned and unpinned groups without refetching. Personal & other participates in date sorts and follows courses in alphabetical sorts. Choices and capped opened timestamps stay per owner/device; old or unavailable storage defaults safely. Mobile uses the existing sheet and Reduce Motion-aware layout animation; website uses a compact native select.

Optional sourcePosition is projected server-side from existing synced Canvas module/item/file/page/assignment metadata, with owner/course/connection checks, complete pagination and safe failure. No Canvas calls, migration, dependency or native module is added. Manual/mixed/unplaced sources follow positioned work by creation time. Existing source, authentication, RLS, grants, offline and RT1/earlier behavior remain intact.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,280 passed / 3 existing live skips** (200 files), mobile **1,136** (123), shared **358** (41, including emitted copies), web **195** (34). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors; six existing warnings. Repaired attempts are retained in acceptance; no nondeterministic flake. Code commits: **d027f2b**, **45c6d19**, **451eabb**, **c5f1f6b**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and a compatible preview update; verify all Library sorts, Canvas source order, pins, successful reviewer/quiz/draft opens and choice persistence after restart on mobile and website. LS1 adds no native module; inherited IM1b APK and MR2 migration/worker rollout remain owner work. Older API/cache entries use the unpositioned fallback until successful reconciliation. Deployed revisions, actual Canvas positions, database/applied migrations, Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, remote SQL/migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at LS1; RB4 was not started.

[LS1 acceptance](ai/acceptance/ls1-library-sorting.md); [ADR-040](architecture/ADR-040-library-sort-orders.md).

## RT1 topic levels and Expound complete locally (2026-10-16)

**PASS for unattended RT1 STEP 0-4, fresh serial gates, docs and local commits.** Each mobile/website topic has compact Original / Simplify / Explain simply controls and collapsible Expound. Canonical content stays unchanged; Original is immediate and has no model action. Server-read, owner-scoped sections feed source-only SA1 formatted answers and grounding labels. Persistent owner/exact-content caches support offline reuse; uncached controls show the existing offline reason. Reading choices last only for the session; canonical search restores Original. Shared snapshots remain unchanged, so shared topic controls route to sign-in and make no model calls.

Study Tools' existing 20/minute warm-instance admission and provider configuration are reused. New bounded server dedup/cache is per warm instance (400 entries / 30 minutes), not a durable global quota/cache. Context is capped at 18,000 characters without truncation; results at 6,000 characters. No migration, dependency or native module is added. All prior SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2/MR2/IM1b local regressions remain green.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,268 passed / 3 existing live skips** (199 files), mobile **1,129** (122), shared **345** (39 including existing emitted copies), web **188** (32). Standalone API/web/Android builds **1/1 each**, 35/35 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Repaired first attempts are recorded in acceptance; no nondeterministic flake. Implementation commits: **959424e**, **d0db258**, **dc4f381**, **06b9385**, **f1b09f1**, **ba81163**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Publish API/website and compatible preview update, then check topic levels, instant Original/cache switching, organized Expound/collapse, offline, canonical search, manual scrolling/Reduce Motion and shared sign-in routing on realme. Predecessor IM1b APK and MR2 migration/worker rollout remain owner work. Deployed revisions, actual provider output, live database/applied migrations/Scheduler and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. This finite run ends at RT1; LS1/RB4 were not started.

[RT1 acceptance](ai/acceptance/rt1-topic-levels.md); [ADR-039](architecture/ADR-039-topic-level-study-tools.md).

## IM1b image saving and Android Share complete locally (2026-10-16)

**PASS for unattended IM1b STEP 0-4, fresh serial gates, docs and local commits.** Owner resolved the previous iOS album contradiction: write-only photo permission, Android **Stay Focused** album, iOS **Photos without an album** using add-only saving. SDK-compatible expo-media-library ~57.0.5 and the permission plugin are added with no other dependency upgrades. All three mobile image zoom viewers offer Save beside Ask; owner website zoom viewers download the same sanitized title/section/kind filename. Wikimedia includes source title and stored attribution/license confirmation. Failed/non-image/empty downloads never reach gallery insertion; temporary bytes are cleaned. Shared-link viewers have no Save control.

Share retains SH1's canonical owner/server-ID gate and disabled device-copy state. No Android hide branch or lost canonical ID was found. Clipboard is loaded lazily and guarded; a missing module, rejected copy or false result falls back to system sharing with **Link ready to share** and a visible link. Eager native loading is a plausible old-APK cause; actual installed contents and physical diagnosis remain **UNVERIFIED (owner to confirm)**. SA2/MR2 and earlier features remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, 0 cached**; API **2,257 passed / 3 existing live skips** (197 files), mobile **1,119** (120), shared **337** (37 including existing emitted copies), web **179** (30). Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Zero lint errors, six existing warnings. Failed first attempts and repairs are recorded in acceptance; no nondeterministic flake. Code: **1959a0e**, **d8544f9**.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Build/install a new preview APK containing clipboard and media-library (OTA alone cannot add native modules), publish the website, and verify realme snapshot/figure/Wikimedia saves, Share, offline state, permission denial/settings and clipboard fallback. Verify iOS add-only Photos saving with no album/full-access prompt. Deployed revisions, native permissions/gallery behavior, live database/applied migrations/Scheduler/provider state and physical root cause are **UNVERIFIED (owner to confirm)**. No prohibited remote call, deployment, migration application, environment-file edit, Scheduler action, email or push occurred. No later roadmap item was started.

[IM1b acceptance](ai/acceptance/im1b-image-save-share.md); [ADR-038](architecture/ADR-038-reviewer-image-gallery-saving.md).

## MR2 manual file-to-reviewer complete locally (2026-10-16)

**PASS for unattended MR2 STEP 0-3, fresh serial gates, docs and local commits.** Manual PDF/photo/DOCX/PPTX picks now upload, extract and generate one reviewer job with one progress destination in generation and the existing Queue. Office uses the shared extractor at the Canvas 10 MiB cap, validates ZIP/expected parts, and retains ordered source blocks and MR1 generation. Legacy DOC/PPT gets conversion copy. Files/photos have no editable-text step; paste retains editing and explicit generation. Empty extraction fails with the required message before generation. Per-pick keys and upload references survive interrupted acceptance retries.

The new forward-only migration `20261016000100_manual_reviewer_uploads.sql` extends private upload policy and service-only atomic creation/source attachment. Both quota families, page/character limits, owner isolation, live leases, immutable child Retry and cancellation without publication remain. Google/database workers reuse extraction checkpoints; Vercel Workflow keeps explicit page/chunk boundaries. No new service, dependency or native module. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1/SA2 remain working under local regressions.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,257 passed / 3 existing live skips** in 197 files; mobile **1,098** in 117; shared **334** in 36 including emitted copies; web **176** in 29; provider contract **20/20**. Standalone API/web/Android builds **1/1 each**, 34/34 and 19/19 pages, one Android bundle / 35 assets. Six existing lint warnings, zero errors. Five mocked workflow orchestration tests pass; the dedicated runtime directory has zero test sources and is NOT APPLICABLE, not runtime acceptance. Repaired first attempts are recorded in acceptance. Code: 36f19a1, 9e42184, 15c351d, e96c6be.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Apply the new migration and coordinate API/website/Google-worker/compatible preview OTA publication, then verify DOCX/PPTX/PDF/photo direct generation, Queue/reconnect after 202, empty/legacy failures, cancellation and paste parity. Deployed revisions, live database/applied migrations/Scheduler, provider outcomes and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action, email or push occurred. IM1 remains a separate next item; this finite MR2 run ends here.

[Acceptance](ai/acceptance/mr2-manual-reviewer-upload-chain.md); [ADR-037](architecture/ADR-037-manual-reviewer-upload-chain.md).

## SA2 Ask about an image complete locally (2026-10-16)

**PASS for the unattended SA2 code scope: STEP 0-4, fresh serial gates, docs and local commits.** Ask now accepts an owner-scoped image reference for page snapshots, extracted figures and stored Wikimedia visuals. All three mobile/web image surfaces and zoom viewers open the existing Ask panel with a thumbnail, the four specified static chips, typed questions and two follow-ups. SA1 formatting/reveal/session caching remain in use. The server fetches exact scoped bytes, rejects raster input above 3 MiB, supplies section text and attribution to the existing vision adapter, and preserves grounding/admission/error controls. Clients never submit bytes or image URLs. Shared visuals route to sign-in with the share return path and make zero model calls. Offline controls are disabled. No migration, dependency, native module or canonical reviewer rewrite is introduced. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1/SA1 remain preserved.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,226 passed / 3 existing live skips** in 192 files, mobile **1,086/1,086** in 115, shared **324/324** in 34 (includes emitted copies), web **168/168** in 28; provider contract **20/20**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and fixes are retained in acceptance; no nondeterministic flake observed. Code commits: 3a03e34 shared, 1e46ee3 API, 99ba4f7 mobile, c886fec web.

**Owner steps remaining:** Rollout and Device checks were skipped entirely. Coordinate API/website and compatible preview OTA publication for the v3 Study Tools contract. Then check image Ask on a page snapshot, figure and Wikimedia image, including inline/zoom controls, all four chips, typed questions, follow-ups, organized answers/reveal, offline behavior and shared-link sign-in return. Production revisions, live database/Scheduler state, actual provider interpretation, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 adds no migration or worker change. MR2 subsequently completed locally; see its newer entry above.

[Acceptance](ai/acceptance/sa2-ask-about-image.md); [ADR-036](architecture/ADR-036-ask-about-image.md).

## SA1 Study Assist complete locally (2026-10-16)

**PASS for the unattended SA1 code scope: STEP 0-5, fresh serial gates, reconciled docs and scoped local commits.** Shared flat markdown-lite parsing, v2 prompts/cache keys, organized mobile/web/shared-link answers, press/completion reveal with manual-scroll and Reduce Motion guards, and the exact four Ask chips with **What is this?** first are complete. Test Me question/choice structure, canonical reviewer content, grounding, owner isolation and all existing limits remain intact. SH1 explicitly accepts retained v1 and current v2 assists with exact content validation. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b/MR1 are preserved. No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,208 passed / 3 existing skips** in 191 files, mobile **1,082/1,082** in 115, shared **296/296** in 30 (includes emitted copies), web **164/164** in 27. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android bundle / 35 assets). Zero lint errors, six existing warnings. Failed first attempts and their repairs are retained in acceptance; no nondeterministic flake observed. Code commits: ad92609 shared, 5bcf15e API, 051c649 mobile, 5041c1d web.

**Owner steps remaining:** Rollout and Device checks were entirely skipped. Coordinate API/website and compatible preview OTA publication for the v2 prompt contracts, then check Explain loading/answer reveal, organized answers, Ask chip order, manual scrolling, Reduce Motion and website keyboard/focus on realme and website. Production revisions, database/Scheduler state, actual provider formatting, deployed compatibility and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, migration application, environment-file edit, deployment, Scheduler action or push occurred. SA2 subsequently completed locally; see its newer entry above.

[Acceptance](ai/acceptance/sa1-study-assist.md).

## MR1 long-source reviewer recovery complete locally (2026-10-16)

**PASS for STEP 0-2, fresh serial gates, reconciled docs and local commits.**
MR1 is the first item of the 2026-10-16 roadmap, after GA1b `ed67445`.
Source-sized bounded output budgets, ordered whole-block recovery on known token
exhaustion, two-attempt part quarantine with typed partial results, durable
receipts/cost counts, and safe website/mobile partial notices are implemented.
Short sources keep one call; content filtering and unknown transfer fencing
retain their existing failure behavior. SP1/CQ1/QD1/SP2/SP2b/SH1/GA1b are preserved.
[Acceptance](ai/acceptance/mr1-long-source-reviewer.md); ADR-035 records the split/assembly decision.
No later roadmap scope is included.

FRESH forced typecheck/lint/root build **8/8 each, zero cached**; API **2,206
passed / 3 existing skips**, mobile **1,072**, shared **272**, web **154**, engine
**606 evaluations**, AI-first unit **20**, provider contract **20** passed.
Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 pages, one Android
bundle / 35 assets). Zero lint errors, six existing warnings. Repaired first
provider-contract/config-launch failures are retained in acceptance. Code:
747ea4d engine, 7c226ed API, 307000e mobile/web partial disclosure.

**Owner steps remaining:** Rollout and Device checks are entirely skipped.
Deploy API/Google worker and compatible website/mobile code, then re-upload the
SOC SCI 103 midterm material on realme and website and inspect completeness.
Live revisions/database/Scheduler, original incomplete reason/token usage and
physical behavior are **UNVERIFIED (owner to confirm)**. No migration, remote
call, environment-file edit, deployment, Scheduler change or push is part of MR1.
## Library Sort layout follow-up (2026-10-17)

Owner feedback: Sort crowds the title and looks out of place. Finite scope:
move it beside update status on both Library pages, use a compact horizontal
pill, remove duplicate status inset, tighten the option sheet and retain all
presets, touch targets and drag selection. Mobile tests FRESH PASS: 1,135 / 121.
FRESH PASS: forced root typecheck/lint/build, 8/8 each, zero cached; six existing
lint warnings. Preview source bcb9988, group b60fe0f0-5319-4c11-b0a3-9aba991bbc43,
update 01a14a01-00f6-70b7-a358-d708971b2e95, runtime 2.1.0-sdk57, published
2026-10-17 21:15 Manila, applied on Realme. Ten native layout/interaction checks
PASS, with screenshots inspected: title now two lines, status and Sort share a
row, all six menu choices fit, selection toolbar remains compact. Zero matching
fatal/JS errors in current process sample. Draft PR #12 updated; CI pending.
Acceptance: docs/ai/acceptance/realme-library-sort-20261017.md. No remaining
layout blocker; course page left open with Course order selected.

## Library sort presets (2026-10-17)

Owner-approved finite scope: visible Library sorting by updated date, Canvas
module/material order and alphabet, while preserving manual drag order. Cover
both the course grid and saved items, store choices per owner/scope, use the
complete existing material inventory for course sequence, retain a complete
sequence for offline use, verify automated/native behavior, publish preview
and reconcile this record. No backend/schema change or paid generation.
Visible Sort controls now cover the Library course grid and saved items.
Presets: Updated newest/oldest, Alphabetical A?Z/Z?A, Canvas Course order and
My order. Choices are owner/scope specific; dragging switches to My order
without erasing a previously saved order when another preset is selected.
Canvas sequence comes from the complete paginated material inventory, with
linked quizzes placed with their Reviewer. Unlinked work is last. Complete
sequences are cached for offline use; failed refreshes retain the saved one.

FRESH PASS: mobile 1,134 tests / 121 files, web 154 / 26, forced root TypeScript
and lint 8/8 each, zero cached; six existing lint warnings. Root production build passed 8/8, zero cached; native correction and final
publication are recorded below. First icon-mock and old
bulk-toolbar assertion failures were repaired; the full rerun passes.
FRESH PASS: final Android preview group 456c1693-3c24-4104-8bd5-58f2b162d563,
update 01a146c3-084c-7407-acf0-d3f36b97bd70, source 22b4afa, runtime
2.1.0-sdk57, published 2026-10-17 06:09 Manila, is active on Realme
2.1.0/code 5. Visible-title course-grid A-Z and Z-A now pass. Six choices are
visible; item alphabet/date choices, complete course sequence and preserved
manual order passed the preceding feature OTA. Course-order selection also
passes an explicit fresh select/relaunch check on the final OTA. Cached course
sequence/account/choice passed restart without an active default network;
original network settings were restored. The Sort sheet is left open for the
owner. Recent final process log has zero matching fatal/JS errors.

FRESH final mobile suite: 1,135 tests / 121 files, mobile TypeScript, focused
ESLint and final Android export/publication PASS. Web 154 tests and forced root
typecheck/lint/build 8/8 each, zero cached, passed for feature base 29d48e6.
The corrective change only adjusts the pure grid comparator to use the same
courseIdentity title as the tiles. Initial implementation CI passed; final
implementation CI is in progress. No APK, database, backend or paid generation.

See [acceptance](ai/acceptance/realme-library-sort-20261017.md).


## Realme offline startup and current Autopilot integration (2026-10-17)

Owner scope: restore saved-account offline startup, retain the Realme Library
hold/drag and compact toolbar, update to current Autopilot source, and make
Generate Reviewer submit silently without forcing the generation page.

Isolated branch `fix/realme-offline-current-20261017` combines main `ed67445`
with Realme branch `e38f96b`. Current durable course batches, cached-first
screens, Queue, sharing and course-state work are retained alongside the device
Library changes and ExpoGL hotfix. No main push or backend mutation.

Saved SDK credentials unlock owner-scoped device data before online refresh.
Retryable auth transport failures retain offline access; explicit SIGNED_OUT,
invalid/revoked refresh tokens and late pre-logout responses cannot revive it.
SecureStore uses serialized alternating chunk banks and commits the manifest
last; legacy chunks remain readable. A visible offline-access message explains
the saved-content state. Online APIs still verify the bearer token.

Reviewer Generate and confirmed Library Remake save an explicit automatic
intent, submit independently of the screen and leave navigation alone. Queue
tracks accepted jobs. Interrupted admissions resume on launch/foreground with
the same idempotency key; permanent rejection requires a deliberate Retry.
Server background safety begins at acceptance. If the OS kills the process
before acceptance, the saved request resumes when the app reopens.

FRESH mobile suite: 1,124 tests / 119 files PASS. Focused authentication/storage
51 tests PASS; reviewer admission tests cover navigation, restart replay,
duplicate taps, account fencing and permanent rejection. FRESH forced root typecheck/lint/build pass 8/8 each, zero cached; six
existing lint warnings. A final lifecycle concurrency adjustment has fresh
mobile suite/typecheck/lint coverage; the preview export verifies its bundle.
Preview/device acceptance passes as recorded below. Earlier silent-screen assertion
failed because it inspected Copy nodes instead of the rendered Notice; fixed.

Read-only live checks confirm the API production deployment uses `ed67445`
and all CQ1/SP2/SH1/GA1b migrations are present. Vercel connector inspection
returned 403; the explicitly scoped authenticated CLI fallback succeeded.
The installed Realme APK 2.1.0/code 5 includes expo-clipboard, so this remains
a JavaScript-only update on runtime `2.1.0-sdk57`.

FRESH PASS: Android preview group `e2aa9590-bb0b-4afe-908a-36bd52d5cc8c`,
update `01a1465e-b73c-7d7a-be19-13d2ad63195d`, source `a4d11a8`,
runtime `2.1.0-sdk57`, published 2026-10-17 04:19 Manila. The update is
active on Realme 2.1.0/code 5: current cached-first status/Queue and retained
four-icon Library controls are visible. With Android reporting no active
default network, force-stop/relaunch retains the account, opens the course
Library and reads a full saved Reviewer. Native hold/drag reorders two cards;
an inverse drag restores the original order. Original Wi-Fi/data settings are
restored. Recent app-process sample: zero matching fatal/JS errors.

FRESH web suite 154/154, TypeScript and lint pass after mirroring the shared
Library-order preference schema. PR CI initially found that mirror mismatch
and a missing Chromium executable; the workflow now installs its required
Playwright Chromium before browser tests. [Draft PR #12](https://github.com/galaxymaxp/stay-focused-v2/pull/12)
retains the combined changes for mainline review. CI rerun is pending.

NOT RUN: paid real-source generation/deletion and forced real-token expiry on
the phone. Silent admission, screen exit/restart recovery and expired-token
startup are covered by deterministic regressions. The first physical attempt
used Android's stale global mobile-data preference as its offline check; it
was not accepted as offline proof. The successful rerun verifies that there is
no active default network. No native build or backend mutation was needed.

See [acceptance](ai/acceptance/realme-offline-current-20261017.md).

## Realme compact Library selection toolbar (2026-10-17)

Owner UI correction supersedes the earlier Library controls: remove the always
visible remake/remove card, Organize/Done, and the move-to-edge footer. Holding
a saved item reveals four equal icon targets in place of the filter tabs:
remake, trash, select/unselect all, and X to cancel. The header shows the selected
count. Selection covers the current filter, including items beyond the first
page; remake/removal use only that selection and retain confirmation. Dragging
and stored order remain available. The toolbar occupies a fixed 48-point slot
in both modes, preserving the list viewport during the hold.

FRESH PASS: 1,056 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene; EAS preview environment preflight. Final copy-only change also
passes all 70 screen tests.

FRESH PASS: preview OTA group `b1537d74-77d0-4e80-ad86-24fef46abe6d`
from `e4f0ae7` is active on Realme 2.1.0/code 5. Physical checks confirm
three complete Reviewer cards plus part of a fourth remain visible in selection
mode; four equal icons replace the tabs; select all, unselect all and X work.
Native hold/drag and saved order after force-stop/relaunch pass. The original
item order was restored; the course Library is left open in normal mode. Recent
process sample: 0 matching fatal/JS errors. See
`docs/ai/acceptance/realme-library-toolbar-20261017.md`.

## Realme course Library organization (2026-10-17)

Owner scope: home-screen-style organization of saved items inside a course,
not the course grid. Long press selects and arms drag; further taps select
items without opening them. Drop moves the selection as a block. Order is
account/course scoped on the device; filtered-out items retain their slots.
Done returns to ordinary opening. Move-to-edge controls provide a gesture-free
option, and selected removal uses the existing explicit confirmation.

FRESH PASS: 1,052 mobile tests in 105 files; mobile TypeScript; focused ESLint;
diff hygiene. Final test-only typing correction also passes 66 screen tests.
FRESH PASS: preview OTA group `7dc9a912-93aa-4348-8d1f-ca41911575a6`
from `43131a5` is active on the connected Realme (2.1.0/code 5). Native
hold-to-select and the selection controls were verified. Recent process log
sample: zero matching fatal/JS errors. The owner is testing the phone directly;
agent physical multi-select, drag and restart-persistence checks were not run.
Those behaviors pass automated regression tests. See
`docs/ai/acceptance/realme-library-organize-20261017.md`. No native
dependency, database or backend change.

## Realme Library and generation actions (2026-10-16)

JS-only update adds Generate all Reviewers for ready course materials, including
PPTX slides, with complete fresh pagination and saved-Reviewer skipping. Generated
materials have a shaded row and explicit label; their detail opens the saved
Reviewer or offers Remake. Course Library adds Remake all reviewers and Remove
all saved work with confirmation; individual drafts can now be removed. Server
confirmation precedes local removal, failed items remain visible, and quizzes
are removed before their referenced Reviewers. Batch submissions reuse uncertain
requests, wait up to three minutes for queue capacity, and report partial
acceptance and queue limits. Keep the app open until
submission finishes; accepted work remains server-backed.

FRESH PASS: 91 tests across screen, batch, generation-recovery, local-Library and
Reviewer API suites; mobile TypeScript; focused ESLint; diff hygiene. Initial
checks caught a CRLF-sensitive edit duplication; corrected before final checks.
FRESH PASS: preview OTA `55e1412d-c073-45d6-9bb4-651dfddddb4c` published
from `9ef1340` and applied to the connected Realme (2.1.0/code 5). Physical
checks confirm CC17 Generate all, generated labels, both course Library bulk
actions and the draft Remove swipe. All confirmation dialogs were cancelled;
NOT RUN: live generation or deletion. Recent process log sample has no matching
fatal/JS errors. No native build, backend deployment or migration. See
`docs/ai/acceptance/realme-library-actions-20261016.md` for evidence.

## Realme generation orb hotfix (2026-10-16)

The generation screen incorrectly checked the retired `ExponentGLObjectManager`
native module after the SDK 57 upgrade. It now checks `ExpoGL`, matching the
installed GLView, so supported devices use the existing 3D Knowledge Core.
Scoped from published preview source `079986c`; unrelated unshipped work is
excluded. FRESH generation/core tests: 23/23; mobile typecheck and focused
ESLint PASS. JavaScript-only preview OTA `d1b79016-9ed3-4de4-85af-184896cbc25e`
published from `e18dda0`; FRESH physical Realme verification PASS: the
generation screen shows the animated 3D orb after relaunch. No native/APK/EAS build requested or run.

## GA1b explicit course batch generation complete locally (2026-10-16)

**PASS for the finite unattended code scope, STEP 0-3, gates, docs and local
commits.** The owner's GA1b answers supersede GA1's STEP 0 deferral: saved explicit
preparation requests are authorized, and confirmation omits generation minutes.
The API/migration, mobile/web course controls and Queue integration are
implemented. Auto baseline/off/past-course coverage gaps now have an explicit
per-material path, with exact-current skip, stable source-version receipts,
normal server quotas, independent Retry, pending cancellation and recovery.
SP1/CQ1/QD1/SP2/SP2b/SH1 remain preserved.
[Acceptance](ai/acceptance/ga1b-saved-course-batch-generation.md),
[ADR-034](architecture/ADR-034-course-batch-generation.md).

FRESH typecheck/lint **8/8 each, zero cached**; API **2,187 passed/3 existing
skips**, mobile **1,072**, shared **269**, web **154** passed; standalone
API/web/Android builds **1/1 each**. Six existing lint warnings, zero errors.
Forced root build **FRESH PASS, 8/8 tasks, zero cached**. Implementation commits:
`6f247f0` API/shared/migration, `2782bc3` mobile, `7a73181` web. Repaired failures
and the interrupted first web build remain disclosed in acceptance.

**Owner steps remaining:** Rollout and Device checks entirely skipped. Apply
new migration `20261016010000_course_reviewer_batch_requests.sql` via the
Supabase connector (filename as name), after preparation/quota/CQ1/SP2/SH1
prerequisites; publish API/website/worker as appropriate and compatible preview
OTA; confirm existing global poll scheduling and run CIT17/realme/web parity,
quota, waiting, cancellation, Retry/Open and regression checks. Live deployment,
database, Scheduler, actual latency and physical behavior are **UNVERIFIED
(owner to confirm)**. No remote call, SQL/application, env edit, deployment,
Scheduler action or push occurred. No later scope is authorized by this run.

## SH1 share reviewer links complete locally (2026-10-16)

**PASS for the finite unattended SH0-approved SH1 code scope.** Owner share/copy/update/stop on web/mobile, anonymous frozen reader and local quiz, saved device assistance, attributed Wikimedia visuals, no private course images, safe sign-in returns, no public AI/database writes, RLS, bounded limiting and revocation/deletion handling are implemented and committed through `147db48`. SP1/CQ1/QD1/SP2/SP2b remain intact; GA1 batch generation is excluded. [Acceptance](ai/acceptance/sh1-public-share-links.md), [ADR-033](architecture/ADR-033-public-share-links.md).

FRESH final forced typecheck/lint/root build **8/8 each, zero cached**; API **2,166 passed/3 existing skips**, mobile **1,068**, shared **264** (includes emitted copies), web **150** passed. Standalone API/web/Android builds **1/1 each**. Six existing lint warnings, zero errors. Failed draft attempts are recorded; no flake observed.

**Owner steps remaining:** Rollout and Device checks entirely skipped: apply migrations `20261015050000`/`20261015050100` after prerequisites, publish API/website and compatible mobile preview (confirm clipboard native module before OTA), then CIT17 anonymous/share/quiz/sign-in/update/stop/deletion and mobile checks. Live revisions, database/Scheduler, website origin/ingress and physical behavior **UNVERIFIED (owner to confirm)**. Score saving after sign-in and cross-device assistance remain follow-ups. No remote service action, env edit, deployment or push. SH1 ends here; no next scope is started.

## SP2b remaining speed findings complete locally (2026-10-15)

**PASS for the unattended SP2b code scope: findings 4/7/8/10/13, tests, fresh serial gates, documentation and local commits.** Courses opens from stored inventory with zero Canvas calls/writes; Today shares one verified bundle; website WebGL loads after useful content; read handlers shed preparation/document imports; Queue/header/generation detail share one owner-scoped reader and poller. Mobile detail follows screen focus. SP1/CQ1/QD1/SP2 are preserved; GA1 stays STOPPED. Code tip `19028c5`; [acceptance](ai/acceptance/sp2b-read-path-speed.md), [ADR-032](architecture/ADR-032-today-and-job-read-context.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,146 passed / 3 existing skips in 183 files**, mobile **1059/1059 in 110 files**, shared **260/260 in 23 files**, web **121/121 in 22 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings. Repaired draft fixture/tracing failures and first mobile gate **1,056 passed / 2 failed** remain recorded in acceptance; no nondeterministic flake observed.

Local deterministic measures: Today **4 requests / 16 data reads + 8 auth/activity calls -> 1 / 9 + 2**; `/today` First Load JS **320 -> 198 kB**; dedicated Today server trace **375 PDF.js package entries -> 0** (79 total files). Courses uses four data reads plus its connection lookup, with the final three reads parallel. Detail **2 sequential requests plus header polling -> 1 shared request/poller**. These are fixture/build counts, not production latency. Mobile orb remains unchanged (Three.js **1,292,907 raw bytes**, not its Metro contribution).

**Owner steps remaining:** rollout and device checks were entirely skipped. Confirm pending SP2/CQ1 migration prerequisites, deploy API/website and preview OTA, then verify CIT17 Courses/Today speed, orb/clock/reduced motion, Queue Retry/Open/extraction/detail, saved content and owner isolation. Deployed revisions, live rows/applied migrations, Scheduler, actual latency/cold starts, physical behavior and Metro contribution are **UNVERIFIED (owner to confirm)**. SP2b adds no migration, region/capacity/queue/service change. Findings 11/12 and GA1 remain separate owner decisions. No remote service call, remote SQL/application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2b run ends here.


## SP2 preparation and Library data path complete locally (2026-10-15)

**PASS for the unattended SP2 code scope (STEP 0-5, fresh serial gates, docs and local commits).** Owner-bound summary projections and exact current-version detail reads replace whole-owner body scans; preparation reuses complete current evidence and batched receipts/controls; independent reads run in parallel; website Library publishes accepted pages while retaining saved cards on partial failures. Existing unchanged-version mobile hydration was already implemented and is retained with stronger regression proof. SP1/CQ1/QD1 remain intact; GA1 remains separately STOPPED, with no batch-generation implementation claimed. Code tip `97a6934`; [acceptance](ai/acceptance/sp2-library-data-path.md), [ADR-031](architecture/ADR-031-library-summary-projections.md).

FRESH final verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,130 passed / 3 existing skips in 182 files**, mobile **1,057/1,057 in 110 files**, web **118/118 in 21 files**. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Zero lint errors, six existing warnings; one repaired source-fixture import timeout and earlier draft failures remain recorded. Shared tests NOT APPLICABLE (unchanged source). Diff/staged hygiene PASS.

Same SP0 synthetic fixture: Library **18 reads / 18,900,915 bytes -> 2 / 44,277**; exact reviewer **11 / 18,879,565 -> 2 / 78,702**; preparation probe **700 / 75,400 -> 2 / 4** with empty receipts/controls. Response bodies remain identical. These are local DB JSON counts, excluding unchanged auth/freshness and real inventory/provider costs; no production latency claim.

**Owner steps remaining:** apply new migration file `20261015040000_experience_library_projections.sql` before API publication (including appropriate version-table generated-estimate backfill scheduling), deploy API/website and preview OTA, then perform the entirely skipped CIT17/realme/website Rollout and Device checks. Regions, capacity, live rows/applied migrations/query plans, Scheduler, actual latency and physical behavior are **UNVERIFIED (owner to confirm)**. SP0 findings 11/12 remain owner region/capacity decisions; SP2b is tracked above. No remote service, remote SQL/migration application, environment-file edit, deployment, Scheduler action or push occurred. This finite SP2 run ends here.

## Tester feedback GA1 stopped at STEP 0 (2026-10-15)

**STOPPED, no product implementation.** Inspection at `65c9150` found two
contradictions in the prompt prerequisites: EP1 has no durable explicit Reviewer
wait-for-prepared intent (manual admission returns `409 not_ready`), and E2 is a
saved-reviewer study-time estimate, not a pre-generation duration estimate.
Existing server quota enforcement is reusable. AG1/AG2 leave the baseline
backlog out and cap later automatic admissions; this is a coverage gap.
Audit commit `2c0a02b`; [evidence and exact owner questions](ai/acceptance/ga1-course-batch-generation.md),
[deferred ADR-030](architecture/ADR-030-course-batch-generation.md).

FRESH baseline prerequisites **3/3 PASS**; product typecheck/lint/test/build gates
**NOT RUN**, zero executed. Documentation whitespace checks: zero errors.
Owner steps remaining: resolve durable explicit intent and honest estimate
semantics before resuming GA1, then implementation, fresh gates and the entirely
skipped Rollout/Device checks. Live production/database/Scheduler/CIT17/device
state **UNVERIFIED (owner to confirm)**. No remote action, env edit or push.
QD1 remains locally complete; GA1 is not PASS and no later item was started.

## Tester feedback QD1 complete locally (2026-10-15)

**PASS for the unattended QD1 code scope (STEP 0-4, gates, docs and local commits).** Queue now opens over the current screen from the mobile/web header. Shared owner-scoped sources replace duplicate list polling, with running-only badges, unseen failure dots, progress, Retry, and the latest five completed entries from the existing bounded Queue window. Mobile keeps Auto, pending request recovery and outside/Back dismissal; web has native keyboard activation, focus entry/return and Escape/outside dismissal. Old Queue routes open the overlay; the separate processing notification target, SP1 and CQ1 remain intact. Code tip: `1183369`; [acceptance](ai/acceptance/qd1-queue-dropdown.md), [ADR-029](architecture/ADR-029-queue-dropdown.md).

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; mobile **1,056/1,056 in 110 files**, web **113/113 in 20 files**, zero skips. Standalone API/web/Android builds **1/1 each** (34/34 and 19/19 static pages; Android 1 bundle/35 assets). Lint: zero errors, five existing mobile warnings plus one existing web warning. Failed draft and first gate attempts remain in acceptance; no nondeterministic flake observed. API/shared tests **NOT APPLICABLE** because their source is unchanged.

**Owner steps remaining:** deploy website, publish preview OTA, then run the entirely skipped Rollout/Device checks on realme and website, including Retry/Open, old links, Back/outside dismissal, Reduce Motion and website keyboard/focus. Deployed revisions, database/Scheduler state and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service action, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. QD1 adds no migration/API/worker change. Next separate roadmap item: GA1; this finite QD1 run ends here.


## Tester feedback CQ1 complete locally (2026-10-15)

**PASS for the unattended CQ1 code scope (STEP 0-4, gates, docs and local commits).** Current courses show by default; past courses stay in collapsed sections on mobile and website with owner controls to move either way. Shared Canvas conclusion/enrollment/course/term evidence drives the automatic rule; Default Term without completion evidence stays current. Past-course work is omitted from Today, Tasks, calendar, Queue, notification fan-out, routine sync and eager preparation. Explicit opens/refreshes sync once; Library reviewers and quizzes remain labelled and available. Code tip: `6d8759e`; [acceptance](ai/acceptance/cq1-current-and-past-courses.md), [ADR-028](adr/ADR-028-current-and-past-courses.md).

FRESH final serial verification: forced typecheck/lint/root build **8/8 tasks each, zero cached**; API **2,120 passed/3 skipped in 180 files**, mobile **1,042/1,042 in 105 files**, shared **258/258 in 22 files** (includes emitted JS copies; source-only **129/129 in 11 files**), web **95/95 in 16 files**, Canvas **75/75 in 1 file**. Standalone API/web/Android builds **1/1 each**. Lint: zero errors/five existing warnings. Repaired draft/first-gate failures and one earlier API timeout flake remain recorded in acceptance; the final serial run passed without retries.

**Owner steps remaining:** apply migration files `20261015030000` then `20261015030100`, publish API/website/worker and preview OTA, then run the entirely skipped Rollout/Device checks on realme and website. CIT17 Default Term identities/counts, live course evidence, deployed revisions/database/Scheduler state, actual speed and physical behavior are **UNVERIFIED (owner to confirm)**. No remote service call, remote SQL/migration application, deployment, Scheduler action, environment-file edit or push occurred. Next separate roadmap item: QD1; this finite CQ1 run ends here.

## Tester feedback SP1 complete locally (2026-10-15)

**PASS for the unattended SP1 code scope.** Mobile and website render owner-scoped saved Today, Courses, course pages, Tasks/Work, Library and Reviewer content before background requests. Static Syncing/Updated/Retry status preserves saved content on failure; open reviewers require an explicit tap to accept a changed revision. Exact course-page offsets, stable course/list positions, sign-out purge, account-switch isolation and browser storage fallback are covered. Code tip: `15811de`; [acceptance](ai/acceptance/sp1-cached-first-screens.md), [ADR-027](architecture/ADR-027-cached-first-screens.md).

FRESH final verification: forced typecheck and lint **8/8 tasks each, zero cached**; mobile **1,036/1,036 in 105 files**, shared **223/223 in 19 files**, web **94/94 in 16 files**, no skips. Standalone API/website/Android builds pass **1/1 each**; forced repository build passes **8/8, zero cached**. Lint retains five existing warnings/zero errors. First mobile gate was **1,032 passed/4 failed** (schema-version and header-position fixtures); focused repair **77/77** and full rerun pass. Draft failures remain recorded; no flake observed. API tests are NOT APPLICABLE because API source is unchanged.

Production/deployed revision, actual first-content latency and physical/browser RB3 behavior are **UNVERIFIED (owner to confirm)**. Rollout and Device checks were entirely skipped. **Owner steps remaining:** preview OTA, website deployment, then RB3 saved reopen, airplane-mode Retry, second-account isolation and open-reviewer checks. No remote service call, remote SQL/migration, Scheduler action, environment-file change or push occurred. Next separate item: CQ1; this run does not start it.

## Tester feedback SP0 complete (2026-10-15)

**PASS, docs only:** [SP0 speed audit](architecture/sp0-speed-audit.md), commit
`588bbf1`, establishes screen/cache/API/query/sync/hosting baselines and ranked
code-only fixes plus owner region/capacity decisions. SP1 should reuse mobile
SQLite Library behavior and add missing screen snapshots; CQ1 must account for
term/enrollment evidence absent from stored courses; SP2 starts with preparation
N+1 and exact-id/summary reads. No later item's implementation was started.

FRESH web build PASS (19 static pages, 28 routes), mobile Library 9/9 tests,
final hook probes 2/2, synthetic service observations 12/12, docs hygiene PASS;
failed harness/tooling attempts are recorded. Actual production/device timing,
CIT17 Default Term counts and deployed region/capacity remain **UNVERIFIED
(owner to confirm)**. Owner-present rollout and Device checks remain excluded.
This supersedes the F0S "SP0 next" statement below; next separate item is SP1.

## Tester feedback F0S complete (2026-10-15)

**PASS:** the autopilot base is now `overnight/2026-10-15_feedback`, created
from released GitHub `main` `079986c` (PR #10). All 37 overnight-added migrations
and all added source paths are present; unrelated untracked files remain intact.
This supersedes the older local Git/PR-pending state below, without asserting
production or device acceptance.

FRESH baseline: typecheck/lint/build 8/8 each, zero cached; lint zero errors/five
existing warnings; shared 134, Canvas 75, mobile 1,026, web 84 tests passed.
API's first run had 2,095 passed, three skipped and one 5-second timeout; its
unchanged full rerun passed 2,096 with three skips (179 files). See the F0S
handoff for exact commands and evidence. Production/device state is
**UNVERIFIED (owner to confirm)**. Owner steps remaining: none for F0S.

Next separate item: SP0 speed audit, docs only, before implementing speed fixes.
F0S ends at local baseline verification and documentation; no later roadmap item,
deployment, remote migration, environment edit or push is included.

## Realignment and mobile visuals parity in progress (2026-10-15)

Owner-approved finite scope: realign to main 150df38 (PRs #7/#8), deliver
JS-only mobile automatic reviewer visuals and inline lazy course visuals,
pass all quality gates, merge by PR, publish preview OTA, then verify existing
Reviewers and finish notification/offline checks on the realme. No new manual
Reviewer generations: the two PDF/PPTX smoke generations are complete.

Main was fast-forwarded from d0fa50b to 150df38; pre-realignment edits are
preserved locally on wip/pre-realign-20261015 at 6ad67bf. Clean-main fresh
root typecheck passed 8/8 before edits. Cloud Run generation-worker-00027-rz2
serves 100% from 150df38; authenticated health 200, unauthenticated 403.
Supabase migration 20261015020000 was already applied and remains untouched.

Mobile parity branch feat/mobile-reviewer-visuals-parity now has 1,024 passing
mobile tests in 102 files (+15), fresh root typecheck/lint 8/8 and Expo Doctor
21/21. Fresh root build also passes 8/8 (2m45.765s). PR/CI/merge, OTA, and physical acceptance are pending.
Finished APK 12ab0357 (2.1.0/code 4, source f989710) is kept; mobile parity
will arrive through OTA on runtime 2.1.0-sdk57. The existing account is preserved.
Canvas schedule stays enabled every five minutes; owner automatic reviewers
are restored. Broad student email stays off because no sending domain is owned.
See [release evidence](ai/acceptance/release-20261014.md); older entries below are historical.

## VL3 Find a visual completed locally; rollout pending (2026-10-14)

**Code complete; unattended run FAILED on the validation-temp guard.** Initial
full API tests cleaned their own synthetic directories in Windows Temp before
TEMP/TMP were redirected into the repo. Final API rerun uses repo-local temp;
the incident is recorded in the handoff and requires owner review before rollout.
The Visual Reviewer now supports explicit
Commons-only external references for sections without source snapshots/figures.
License/attribution filtering, five-candidate search, at most three vision checks
at 0.90 confidence, exact-version section cache, one Find another and a serialized
20/owner/rolling-day reservation cap are implemented. Provider failure never
becomes a cached no-result. No preparation/sync/generation/pre-render search.

Mobile uses a separate labeled card and the existing zoom sheet, with attribution
and legal links, honest no-result copy, and positive reachability/source discovery
before showing its quiet action. Canonical prose/source evidence and offline
library payloads remain source-grounded. Existing design tokens only.

Migration `20261014000700_section_external_visuals.sql` is **not applied**.
See [ADR-020](architecture/ADR-020-visual-learning.md#find-a-visual-vl3) and
[VL3 handoff](ai/handoff.md#vl3-unattended-find-a-visual-2026-10-14) for exact
fresh gates and attempts. VL2.1 is present and reused; DOCX snapshots retain their
separate evidence follow-up. Next owner milestone is RB2: apply reviewed queued
migrations via the Supabase connector, deploy API/worker prerequisites, publish
preview OTA and test on realme. VL3 needs API/OTA, no new worker or native module.
Confirm live Wikimedia egress and actual match quality. Rollout/Device checks
entirely skipped; deployed state and physical/provider behavior **UNVERIFIED
(owner to confirm)**. No push or remote change occurred.


## VL2.1 PPTX page snapshots completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** PPTX now uses the existing page snapshot renderer and VL1.3 pre-render path.
Preparation converts the accepted original with isolated headless LibreOffice,
with a 60-second deadline, process kill, 20 MiB output / 100-page caps, safe PDF
validation and temporary-file cleanup. Full archive bounds and linked-media
rejection precede native execution. Conversion failure or missing local binary
leaves material prepared and keeps VL2 extracted figures as the fallback.

Receipt identity is owner + Canvas file + exact metadata fingerprint + original
SHA-256. The new forward-only migration
`20261014000600_office_page_snapshots.sql` is written, **not applied**. It
adds a private PDF bucket, immutable service-only receipts with RLS/grants and
server-derived accepted-snapshot fingerprint binding. Changed revisions convert
again, unchanged ones reuse, and historical conversions/originals remain retained.
Old unbound/edited/composite Office sources fail closed; no provenance backfill.

PPTX blocks map pageNumber to slideNumber in presentation order, including blank
and hidden slides. Canonical citations and exact accepted conversion evidence
qualify snapshots. Missing original/converted bytes cannot be bypassed by cache.
Original PDF/local checks, rendering budgets, system exemption, leases and
completion remain shared. Mobile adds From slide n / Slide n labels to the
existing viewer without changing polling, gestures, tokens or offline behavior.
Canvas/synchronous original PDFs keep the 40-page limit; converted page counts
live only in their own rendering receipt. DOCX pagination is not deterministic
from existing blocks, so the permitted PPTX-only scope ships; DOCX snapshots
remain a follow-up, and its VL2 extracted figures continue to work.

Worker image installs only the approved LibreOffice writer/impress components
with --no-install-recommends, apt-list cleanup and writable non-root HOME.
Estimated delta is 250-500 MiB uncompressed / 100-200 MiB compressed; estimated
small-deck startup/conversion is 5-30 seconds. No repository-documented image or
cold-start numeric limit was found. Actual image size, peak RSS, cold start and
native conversion fidelity are **UNVERIFIED (owner to confirm)**; no image build
was run. Exact fresh gates and draft failures are in [VL2.1 handoff](ai/handoff.md#vl21-unattended-office-page-snapshots-2026-10-14).
See [ADR-020 Office page snapshots](architecture/ADR-020-visual-learning.md#office-page-snapshots-vl21).

Final FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,997 passed / 3 existing skips
(169 files); mobile 984 passed (95 files); API build 34/34 pages; Android export
1 bundle / 31 assets; whitespace 0 errors. No failed required gate; draft fixture
and syntax failures are retained in the handoff.

Owner steps remaining: review/apply the migration through the Supabase connector
(filename as name, never db push), rebuild/deploy the worker and measure its
real size/cold start/peak RSS, deploy API, publish preview OTA, then RB2 realme
From slide n and conversion-failure figure-fallback checks. Rollout and Device
checks were entirely skipped. Deployed state, prerequisites, migrations/buckets,
queue/IAM/Scheduler, retained source rows and physical behavior are unverified.
No deployment, production service call, remote SQL, environment-file edit, Scheduler
change or push occurred. Next code work requires a separately prompted item.


## VL2 extracted source figures completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Preparation extracts the exact original's
PDF raster figures and PPTX/DOCX media. Named size, area, repetition, count and
time limits remove tiny/repeated decoration and bound work. PDF.js image objects
and a pure JavaScript PNG encoder need no new dependency. Office preparation and
accepted manifests share structural drafts; standalone and composite admission
retain canonical cited IDs. No generated/external image or model caption.

Figures run only after prepared/succeeded completion, outside its transaction.
Failure is code/count-only and leaves preparation successful. Private immutable
rows bind owner + file/asset + original SHA-256; revision receipts also preserve
successful empty extraction. New revisions re-extract, unchanged ones reuse, and
historical rows/originals remain retained under ADR-021. Both migration files
`20261014000400_source_figures.sql` and
`20261014000500_source_figure_extraction_receipts.sql` are written, **not applied**.

Owner-only bearer API routes use private no-store responses, strict canonical
citations and exact accepted material/hash. Batched availability signs no images;
only fully receipted extractions are visible. Opening a section returns at most
12 short-lived signed images. Office requires
the new structural parser, so old flattened snapshots are not guessed into
alignment. Missing/deleted/edited or ambiguous evidence exposes no figures.

Mobile shows the image action only where figures exist, hides it offline, and
opens the existing bottom sheet with page/slide labels, one figure at a time and
the existing bounded pinch/pan/double-tap viewer. Existing tokens, Reduce Motion
and dismissal are retained. Eligible VL1 page snapshots remain the fallback.
Office vector rendering belongs to VL2.1. Durable uploaded local PDFs are covered;
legacy hashless assets and stateless synchronous OCR lack a retained exact
original and receive no guessed figure binding or new asset backfill.

Final FRESH gates: forced typecheck 7/7 and forced lint 7/7 (0 cached, 0 errors,
4 existing warnings); shared 133 passed; API 1,947 passed / 3 existing skips
(166 files); mobile 979 passed (95 files); API build 34/34 static pages;
Android export 1 bundle; whitespace 0 errors. Draft failures, the initial
PGlite timeout and exact validation details are retained in the
[VL2 handoff](ai/handoff.md#vl2-unattended-extracted-figures-2026-10-14).
See [ADR-020 Phase 2](architecture/ADR-020-visual-learning.md#phase-2-extracted-figures-vl2).

Owner steps remaining: apply both migrations through the Supabase connector
(filename as name, never db push), deploy worker and API, publish preview OTA,
then RB2 realme figure/logo/no-icon, zoom, offline and snapshot-fallback checks.
Rollout and Device checks were entirely skipped. Deployed state, applied
migrations/buckets, retained originals, costs and device behavior are
**UNVERIFIED (owner to confirm)**. No remote service call, environment-file edit,
Scheduler change or push. VL2.1 is now completed locally above; DOCX pagination remains a follow-up.

## VL1.3 cited page pre-render completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** Manual and automatic Reviewer completion share
one post-commit hook that reserves and dispatches every distinct lowest cited
section page, at most 100, sequentially. The exact accepted standalone Canvas PDF
or unchanged accepted local PDF is resolved once. Edited, Office and multi-source
materials are silent no-ops. Failures log fixed codes/counts and cannot change
the committed Reviewer outcome; completion before a student opens is best effort.

New forward-only migration `20261014000300_system_page_snapshot_prerender.sql`
is written, not applied. Existing/default snapshot rows remain student-origin;
service-only system reservations bypass the rolling 20-render student cap.
Student reservation and claim count student work only; system attempts retain
the three-claim bound, leases and deletion fences. Idempotent reuse never changes
origin. Older reviewers keep their capped on-open fallback. Existing mobile
header discovery shows ready images without a student reservation; no mobile
or EP3 source change was needed.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,896 passed / 3 existing skips (160 files),
API build 34/34 static pages (16 steps / 1 workflow), whitespace 0 errors. Unchanged
mobile snapshot discovery/viewer tests also pass 22/22. Full mobile/Android gates
are NOT APPLICABLE because mobile is unchanged. Draft failures and exact counts
are retained in the [VL1.3 handoff](ai/handoff.md#vl13-unattended-cited-page-pre-render-2026-10-14); see [ADR-020 Pre-render](architecture/ADR-020-visual-learning.md#pre-render-vl13).

Owner steps remaining: apply the migration through the Supabase connector using
the filename as name (never db push), deploy worker then API, and run RB2 realme
new-PDF instant-image / older-reviewer on-open-fallback checks. Rollout and Device
checks were entirely skipped. Deployed revisions, applied migrations, queue/IAM,
Scheduler, retained bytes and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.
VL2 subsequently completed locally above; EP3 remains committed.

## EP3 preparation status completed locally; rollout pending (2026-10-14)

**PASS for unattended code scope.** EP3 STEPS 0-3, all required fresh gates,
documentation and local commits are complete. The corrected owner roadmap is
readable; the earlier missing-roadmap STOP is superseded. Each current Canvas
revision exposes a fixed safe preparation status. Older prepared revisions never
make newer work Ready; backlog/deferred work is Preparing, failed/cancelled/capped
or guard-paused work is Couldn't prepare. Unsupported/empty/unavailable stay
explicit. Legacy fields remain for one release; strict older Canvas clients keep
their response shape unless they opt in with '?preparationStatus=1'.

Mobile replaces normal Prepare actions with Ready / Preparing / Couldn't prepare.
Only failures offer Retry, hidden on observed connection failure. Preparing has
no animation (including Reduce Motion); Reviewer and Quiz wait for Ready. Focus
refresh and serial ten-second polling are bounded to 18 reads/polls per refresh
cycle and stop on terminal status, blur/background or offline evidence. Later
loaded pages keep their pagination and refresh their own material statuses.
Retry uses EP1's single admission/dispatch path, with accounting reset only in
the serialized RPC, cumulative lifetime attempts retained, and double submission/
Ready reconnection idempotent. Existing Reviewer Retry recovery remains intact.
No migration or native dependency was added; owner RLS/private columns are intact.

Final FRESH gates: forced typecheck 7/7, forced lint 7/7 (0 errors, four existing
mobile warnings), shared 133 passed, API 1,856 passed / 3 existing skips, mobile
959 passed, API build 34/34 pages (16 steps / 1 workflow), Android export one
bundle / 31 assets, whitespace 0 errors. Draft failures and exact counts are in
the [EP3 handoff](ai/handoff.md#ep3-corrected-prompt-continuation-2026-10-14); see [ADR-026 Client status](architecture/ADR-026-eager-preparation.md#client-status).

Owner steps remaining: deploy API then preview OTA after EP1/EP2 prerequisites;
RB2 realme checks new PDF Preparing -> Ready without a tap, forced failure plus
Retry, airplane-mode Retry visibility, and Reduce Motion. Rollout and device
checks were entirely skipped. Deployed revisions, applied migrations, job rows,
queue/IAM, Scheduler and physical behavior are UNVERIFIED (owner to confirm).
No remote service call, environment-file edit, Scheduler change or push occurred.

## EP2 preparation backfill completed locally; rollout pending (2026-10-14)

EP2 STEPS 0-3 are implemented locally. The corrected external roadmap was read;
the earlier EP2 missing-path STOP is superseded. Active selected owned courses,
including completed courses skipped by notification polling, now receive fair
poll-owned preparation visits without another sync or student request. Inactive
or unselected courses wait until their connection/selection permits preparation.

Complete source eligibility and batched exact-revision/control reads seed only
unprepared, unsuppressed, below-cap materials into the existing discovery backlog.
EP1's admission, worker and 25/200 runaway guard remain the single preparation
path. Stable five-material round-robin turns are bounded by 25 per course and
50 globally per poll invocation; at most 20 courses are leased for 90 seconds.
Live sync/discovery and student Retry recover before backfill. Worker completion
cannot advance a backfill ledger outside the poll budget. Durable visits and
idempotent discoveries/receipts recover seed/admission/registration crashes.

New forward-only migration `20261014000200_canvas_preparation_backfill.sql` is
written, not applied. It adds service-only fair course visits with safe owner
RLS reads and explicit grants. The real discovery/PGlite proof prepares all
230 old materials within budgets; the five-material course is fully admitted
in the first round. Existing EP1 tests pass unchanged. Final FRESH gates:
typecheck 7/7, lint 7/7 (four existing mobile warnings), shared 133/133,
API 1,841 passed / 3 existing skips, API build 34/34 pages, whitespace 0 errors.
First timeout/typecheck failures and exact results are retained in the
[EP2 handoff](ai/handoff.md#ep2-corrected-prompt-continuation-2026-10-14).
See [ADR-026](architecture/ADR-026-eager-preparation.md#backfill) for budgets, priority and resumability.

Rollout and device checks were entirely skipped. Owner steps: apply the EP2
migration after EP1's two migrations, deploy API and Google worker, observe
per-course backfill counts and guard state not `tripped`, then RB2 checks an
old never-opened material shows Ready on realme. Deployed revisions, migrations,
credentials, Scheduler, production inventory, OCR/cost and retained bytes are
UNVERIFIED (owner to confirm). No remote call, environment-file edit or push.

## EP1e eager preparation done locally; owner rollout next (2026-10-14)

**EP1 STEPS 0-4 are implemented locally.** The owner answered the earlier STOPs;
exact-revision original reuse, Page attachment invalidation and staged extraction
fences are repaired. The durable store, Google preparation task/broker lease,
sync batches/guard/recovery, deferred poll drain and prepared-only consumers are
complete. Existing eligibility, AG1 limits, PV1c retention and Canvas 40/local
durable 100/40 limits remain. The real discovery/SQL case is 230 -> 200 prepared
+ 30 deferred -> 30 prepared on the next poll cycle without new module IDs.

[ADR-026](architecture/ADR-026-eager-preparation.md) records the design and guard
queries. The [EP1e handoff](ai/handoff.md#ep1e-unattended-continuation-2026-10-14)
records final FRESH gates, commits, failed first attempts and owner steps. Prior
STOP sections below are historical and superseded.

Next owner steps: apply migrations `20261014000000` then `20261014000100`; deploy
API and Google worker; confirm Cloud Tasks queue/IAM; watch first CIT17 sync for
<=200 enqueued and `completed`/`deferred`; RB2 checks realme sync-to-Ready.
Rollout/device checks were entirely skipped; all live state remains UNVERIFIED.
EP2 resumable backfill and EP3 preparation status are complete locally.
The later Visual Reviewer phases remain pending. No mobile UI change belonged to EP1.

## EP1d inventory repairs done; revision-byte binding STOP (2026-10-14)

**EP1 remains incomplete before STEPS 1-4.** Owner-approved Module/ModuleItem
pagination is committed as `996574a`; additional file-reference/open-candidate
pagination is committed as `e739cab` under the standing inventory authorization.
Stable owned reads, safety bounds and fail-closed placement/admission preserve
the earlier cap and File/Page fixes. FRESH focused tests: 78/78; the modeled
1,000-row response cap no longer loses the 1,002-item placement evidence.

New non-inventory STOP: the actual inventory SQL can store revision B's
fingerprint alongside retained revision A bytes (`not_requested`), then the
ingester marks those bytes `unchanged` without downloading B. Local actual-SQL/
ingester evidence: 1 passed, 17 deliberately filtered, 0 downloads/uploads.
Safe exact-revision preparation cannot rely on that reuse decision. The
continuation question and verification are in the
[EP1d handoff](ai/handoff.md#ep1d-unattended-continuation-2026-10-14).
No preparation schema, worker/broker, guard/drain or consumer gating was added;
ADR-026 remains free. EP2/EP3 and Visual Reviewer phases remain downstream.
Rollout/device checks entirely skipped; live impact UNVERIFIED (owner to confirm).
The older EP1c placement question below has been answered and repaired.

Retained-repair gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached;
4 existing lint warnings), shared 133/133, API 1,766 passed / 3 existing skips,
API build 34/34 pages, diff 0 errors. Final focused tests: 102/102. One initial
API fixture failure was corrected and the full suite rerun; see the handoff.
Mobile gates NOT APPLICABLE.

## EP1c File/Page inventory repaired; placement completeness STOP (2026-10-14)

**STEP 0.6 done locally; EP1 remains STOPPED before STEPS 1-4.** Owner-approved
File/Page reads now use stable ID order and 200-row ranges, with a 50-page
safety bound per owned course/type. Errors or an exhausted bound fail explicitly;
AG1 records no candidate/baseline from that incomplete evidence. Real listing
regressions discover all 230 Files and all 230 Pages with correct public
pagination; mixed placement/exclusion and Page reference behavior is preserved.
The earlier Canvas 40-page repair `23cb9d0` remains intact.

A separate placement-evidence surprise requires continuation review:
`readModules` / `readModuleItemsForReferences` still perform a single
unpaginated read. Under a modeled 1,000-row server cap, the actual source-list
path silently omits an independently placed instructional attachment and admits
an administrative file whose excluded module placement was beyond the cap;
`hasMore=false`. This is distinct from the repaired File/Page cap. Live row-limit
configuration/impact is **UNVERIFIED (owner to confirm)**. See the exact evidence
and continuation question in the [EP1c handoff](ai/handoff.md#ep1c-unattended-continuation-2026-10-14).

Commit: `c5d537b`. Retained-repair gates FRESH PASS: forced typecheck/lint 7/7
each (0 cached; 4 existing warnings), shared 133/133, API 1,756 passed / 3 skips,
API build 34/34 pages, diff 0 errors. Mobile gates NOT APPLICABLE.

No preparation migration/types, result store, worker/broker extension, guard,
poll drain or consumer gating was added. ADR-026 remains free. EP2/EP3 remain
blocked on EP1. Rollout and device checks entirely skipped.

## EP1b continuation stopped on source inventory completeness (2026-10-14)

**STEP 0.5 done locally; EP1 remains STOPPED and incomplete.** `23cb9d0`
restores Canvas PDFs to 40 total pages before deferred inspection/OCR and checks
reused page counts; local durable 100/40 limits remain. FRESH focused tests 29/29.
Retained-fix gates FRESH PASS: forced typecheck/lint 7/7 each (0 cached,
4 existing warnings), shared 133/133, API 1,749 passed / 3 skips, API build
34/34 pages, diff check 0 errors. Mobile gates NOT APPLICABLE.

A second preflight surprise blocks discovery: source readers cap Files/Pages
at 150 each, but public pagination can report `hasMore=false` on that partial
inventory. Offline 230-file reproduction observes 150 and omits 80. Required
200-prepared/30-deferred behavior needs complete owned discovery using the same
eligibility boundary. The unattended rule requires an owner answer; see the
[continuation question](ai/handoff.md#ep1b-unattended-continuation-2026-10-14).
The unfinished store draft was removed; no new schema, preparation worker,
guard or consumer path is shipped. ADR-026 stays free. EP2/EP3 and visual phases
remain downstream; rollout/device checks entirely skipped and live state
UNVERIFIED (owner to confirm).

## EP1 preflight stopped (2026-10-14)

**STOPPED at STEP 0; EP1 implementation remains pending.** Current deferred
Canvas PDF worker validation uses the durable 100-page limit, contrary to the
audit's assumed 40-page Canvas extraction cap. Canvas snapshot acceptance still
has a 40-page constraint, which acts after extraction. The unattended STOP rule
requires owner review of the [finding and continuation question](ai/handoff.md#ep1-unattended-preflight-stop-2026-10-14).

Recommended continuation: repair the Canvas pre-extraction cap, preserving local
durable 100/40 limits, then complete EP1's remaining preflight and STEPS 1-4.
ADR-026 remains available. EP2, EP3 and the visual phases continue to depend on
EP1 completion; no preparation store, worker task or guard has been implemented.
Code gates NOT RUN (0); documentation diff check FRESH PASS (0 errors).
Rollout/device checks entirely skipped; live state UNVERIFIED (owner to confirm).

## Eager preparation and Visual Reviewer: EP0 complete (2026-10-14)

**EP0 docs-only PASS; EP1 next.** Owner direction is eager preparation of every
instructional Canvas material on sync; cost accepted, no per-user preparation
cost cap. Guard: 200/sync in batches of 25 with repeat/no-progress stops, plus
three attempts across syncs before student Retry. LibreOffice is approved for
VL2.1. P0 confirmation at 12:48 is recorded by the EP0 unattended prompt.

Sequence: EP0 -> EP1 durable prepare-on-sync -> EP2 resumable backfill -> EP3
status/Retry -> VL1.3 pre-render cited pages -> VL2 extracted diagrams -> VL2.1
Office snapshots -> VL3 labeled requested visuals -> RB2 owner rollout.
The [EP0 audit and implementation brief](architecture/ep0-preparation-audit.md)
identifies current Prepare as binary ingestion, later worker/preview extraction,
and the single durable result path EP1 must unify. No request-context STOP;
use brokered tokens and awaited dispatch. EP1 uses ADR-026 if still free,
not occupied ADR-021. Guard tests: repeat, stuck/no progress, 230 -> 200 + 30
deferred, with next-poll drain even without a new module item.

FRESH diff check PASS (0 errors); full suites NOT RUN (0), docs only. Live
counts/OCR/cost and production state UNVERIFIED (owner to confirm); historical
CIT17 sample is five PDFs / 164 pages / 8,973,082 bytes. No remote work or release.
RB1/N1 acceptance remains owner work; the new owner-authorized EP0 slice
supersedes the earlier blanket pause for this audit. Rollout/device checks
entirely skipped; RB2 remains owner-present.

## RB1 rollout — device acceptance in progress (2026-10-13)

**Production-deployed at exact commit `9d6f254`; device acceptance NOT RUN.**
This section supersedes the rollout-pending statements in the earlier local
slice records below. Autopilot remains paused until RB1 and the requested N1
continuation are handled.

API `dpl_D7XoTybcNT1ib9AMcEvXYU8tKB4P` is READY and healthy; worker
`generation-worker-00024-p6n` is READY with 100% traffic and authenticated
health 200. Preview OTA group `3b109b84-f28d-4557-b1ba-433a1a2e9145`
is published on Android runtime `2.0.1`. Five forward-only migrations applied
and passed object/RLS/grant/private-bucket verification. No RB1 env change.

| Item | Deployment | RB1 device acceptance |
| --- | --- | --- |
| P1 hidden grades, Grades navigation, Matching cap | API + preview deployed | NOT RUN |
| AG2 polling and labels | API + preview + migrations deployed; poll inactive | Queue Auto NOT RUN; Library/reviewer automatic labels BLOCKED (no successful automatic artifact) |
| PV1c Canvas PDF provenance retention | API + worker + migration deployed | NOT RUN |
| VL1.1b Canvas page snapshots | API + worker + preview + migration deployed | NOT RUN |
| E2 review-time estimate | API + preview deployed | NOT RUN |
| G1.1 drop rules | API + preview deployed | BLOCKED (no live drop-lowest fixture) |
| H1b private logging | API + worker deployed | End-to-end generation NOT RUN |
| VL0c/VL1.2 local PDF provenance/snapshots | API + worker + preview + migration deployed | NOT RUN |
| O2c offline quiz scoring | API + preview deployed | NOT RUN |
| H2/H2b dependency fixes | API + worker deployed | Dispatch/completion NOT RUN |
| H3 private responses | API deployed; FRESH owner GET 200/private,no-store PASS | Live API check PASS |
| H4 legacy review retirement | API deployed; FRESH POST /api/review 404 PASS | Canonical generation NOT RUN |

STEP 5 is **DEFERRED to N1 notification activation (separate owner step;
follows docs/architecture/canvas-email-notifications.md, including
skip_stale_canvas_email_events_v1 before any send)**. No RB1 cron call,
Scheduler operation or Resend activation. N1 starts after RB1 acceptance/docs;
creating/resuming Scheduler requires its separate STEP 5 yes.

FRESH pinned gates PASS: forced typecheck/lint 7/7 each (zero cached; four
existing lint warnings), shared 108/108, API 1,735 passed/3 existing skips,
mobile 928/928, API build, Android export and diff check. The first OTA command
stopped before publication for a missing noninteractive message; the owner
approved the explicit-message retry, which published one update group.

See [RB1 rollout evidence and device matrix](ai/acceptance/rb1/rollout.md).


## H4 legacy review route retirement (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
Security status: **H1-03 FIXED locally (retired)**. Fely selected option 1 on
2026-10-13 at 18:27: retire the legacy /api/review route if unused. STEP 0 found
no runtime, test-harness, script, CI or mobile/website consumer. Commit
`eb2a4b5` removes its only POST module and adds a focused offline absence
test. The canonical reviewer route, engine/provider exports and opt-in provider
smoke script remain used and unchanged. No migration, dependency or mobile change.

FRESH gates: forced typecheck and lint 7/7 tasks each, 0 cached;
lint 0 errors / 4 existing mobile import warnings; shared 133/133 in 12 files;
API 1,735 passed / 3 skipped / 0 failed in 146 files; API build 34/34 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). The build route
list and manifest omit /api/review and retain /api/reviewer/generate.
Mobile tests and Android export are NOT APPLICABLE (mobile unchanged).
The first typecheck failed on three stale generated Next route imports;
a local rebuild refreshed them, and the forced rerun passed. No test flake.

Owner steps remaining: ship H4 with the next API deploy, confirm POST /api/review
returns 404 and canonical generation works, optionally remove the deployed API's
RUN_OPENAI_SMOKE variable, and generate a reviewer from a Canvas module on device.
Rollout and device checks were entirely skipped. Live deployed revisions, route
behavior and environment state remain **UNVERIFIED (owner to confirm)**.
See [H4 handoff](ai/handoff.md#h4-unattended-legacy-review-route-retirement-2026-10-13).

## H3 private responses and bounded bodies (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.**
All 14 bounded text readers stream
request bodies and cancel at their existing byte caps, including missing or
misleading Content-Length. Fatal UTF-8 decoding maps to each caller's existing
invalid-JSON/request denial; null/blank-body behavior is preserved. All 15
previously uncovered owner-data route files return Cache-Control: private,
no-store on success and error, including the four audited source/job routes.
Existing no-store helpers and the separate experience streaming reader stay
unchanged. Status codes, error codes/messages, bodies and authorization are preserved.

Local code commits: `e2f2d1c` (shared reader), `ca6e48d` (14 bounded readers and regressions),
`d2a2ba8` (15 owner-response route files and regressions). No dependency,
migration, mobile, environment-file or legacy /api/review change.

FRESH gates: forced typecheck 7/7 tasks, 0 cached; forced lint 7/7 tasks,
0 cached, 0 errors / 4 existing mobile import warnings; shared 133/133 in 12
files; API 1,734 passed / 3 skipped in 145 files; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 whitespace errors). Mobile tests
and Android export are NOT APPLICABLE (mobile unchanged).
One new connection test first used POST instead of PUT (34 passed / 2 failed);
corrected fixture rerun 36/36. No full-gate failure or flake.

Owner steps remaining: include H3 in the next API deploy; spot-check source
detail and job result response headers; sign in, sync Canvas and open a reviewer
and task plan on device. Rollout and device checks were entirely skipped. Live
deployed headers/revisions, database/applied state and Scheduler remain
**UNVERIFIED (owner to confirm)**. See [ADR-024](architecture/ADR-024-private-responses-bounded-bodies.md) and
[H3 handoff](ai/handoff.md#h3-unattended-private-responses-and-bounded-bodies-2026-10-13).

## VL1.2 local PDF page snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Accepted
unchanged local PDFs with VL0c's extracted page blocks now use the shared
lowest-cited-page cache, durable worker and 1400 px thumbnail/zoom viewer.
Exact accepted source/parent/extraction/asset ownership and byte size/hash are
verified. Edited/unavailable/old local revisions and non-PDF sources stay excluded.

Fely's option 1 is implemented: **respect the delete**. Deleted/cleanup-pending
assets or missing objects make even cached images unavailable before download,
reservation or dispatch. Mobile keeps page text with "Page preview unavailable";
offline controls remain hidden. Deletion, cleanup and preserve-artifacts retention
are unchanged; missing bytes terminate safely and completion fences deletion.

Local commits: `4a7bb83` and `84bee38`. Forward-only migration
`20261013000400_local_pdf_page_snapshots.sql` is **NOT APPLIED**. Paired nullable
Canvas bindings admit local cache rows under the same owner/version/page key,
RLS/grants, budgets, leases and dispatch. No native dependency or new bucket.

FRESH gates: forced typecheck/lint 7/7 each, 0 cached (0 errors / 4 existing lint
warnings); shared 133/133 in 12 files; API 1,655 passed / 3 skipped in 141 files;
mobile 928/928 in 90 files; API build 35/35 pages, 16 steps / 1 workflow; Android
export 3,456 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS
(0 whitespace errors). First mobile attempt: 927 passed / 1 failed, old local-file
header exclusion assertion corrected. Gates ran with the then-uncommitted H2 dependency group, now completed by H2b.

Owner next: reviewed migration application, one API deploy, one worker deploy,
one preview OTA and fresh local PDF/one-word edit/keep-reviewers deletion/airplane-mode
device acceptance. Live revisions, applied state and retained bytes remain
**UNVERIFIED (owner to confirm)**. Rollout and device checks entirely skipped.
See [ADR-020](architecture/ADR-020-visual-learning.md) and
[VL1.2 handoff](ai/handoff.md#vl12-unattended-local-pdf-page-snapshots-2026-10-13).

## H2 dependency upgrades (2026-10-13)

**H2b PASS for local code scope; H2 code work is done. Rollout/device acceptance
pending.**
Dependency status: Next / eslint-config-next 15.5.27 (`bd39917`), Workflow 4.8.13 / test
adapter 4.0.29 (`86cf90a`, accepted ADR-023), Google authentication/gRPC, sharp 0.35.5,
undici 6.29.0 / 7.30.0 and compatible parsing/archive/mobile leaves are committed in
separate groups. React/React DOM remain 19.1.0; all 110 frozen Expo/RN/tooling package
names and existing majors pass the local scope check. No app/test/snapshot changes or
new migration.

CACHED before audit (reused from H2): **5 critical / 38 high / 33 moderate / 0 low / 0
info / 76 total**. FRESH after audit: **0 critical / 24 high / 21 moderate / 0 low / 0
info / 45 total** (valid JSON; exit 1 reports residual advisories). Remaining findings
and every changed package are in the [H2b
result](ai/audits/h1-release-hardening.md#h2-result-2026-10-13-h2b-pass). Original H2
failures remain historical; O2c PASS and isolated HEAD mobile 928/928 cleared that
blocker.

All eight gates ran FRESH between each STEP 2 group. Final: forced typecheck/lint 7/7
each, 0 cached, 0 errors / 4 existing lint warnings; shared 133/133 (12 files), API 1655
passed / 3 skipped (141 files), mobile 928/928 (90 files), API build 35/35 pages with 16
steps / 1 workflow, Android export 3459 modules / 31 assets / 1 bundle / 1 metadata
file, whitespace check 0 errors. No full-suite H2b flake; failed preflight launcher and
original H2 attempts are recorded in the
[handoff](ai/handoff.md#h2b-unattended-dependency-upgrade-completion-2026-10-13).

**Separate owner-planned item:** Expo SDK 54 -> 57 / React Native 0.81 -> 0.87, with
coordinated native/Metro/Jest/router changes and device acceptance. Next's excluded
PostCSS pin and unavailable compatible argparse/sprintf-js fixes remain reported. Live
production state is **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped. Owner steps remaining: review, one API deploy plus the coordinated
mobile OTA, then sign-in/sync/reviewer smoke and app/Canvas/reviewer/quiz device checks.

## H1/H1b release hardening audit (2026-10-13)

**PASS for local scope.** H1 audit local: 8 findings, 2 fixed, 5 reported,
1 UNVERIFIED boundary. The completed inventory covers 75 migrations, 106 current
security-definer functions, 69 application tables, 100 policies including Storage
and 65 API routes. Reviewer log hygiene (`aa58d87`) and experience exception-name
log hygiene (`21bb836`) are fixed with regressions and preserve HTTP behavior.

Next owner decisions: prioritize compatible runtime dependency updates and assess
reachable advisories (FRESH npm audit: 5 critical / 38 high / 33 moderate; 76
entries, historical H1 baseline). H4 retires the unused legacy review endpoint
locally. H3 completed private/no-store responses and bounded body reading; H2b
completed the compatible dependency slice (see current entries above). Fely's VL1.2
option 1 decision resolves local retention: respect deletion, no retention change. Options and
recommendations are in
the [audit](ai/audits/h1-release-hardening.md#owner-decisions-needed). No dependency
change, new migration or retention implementation was added by H1/H1b.

FRESH gates: typecheck/lint 7/7 each, 0 cached (lint 0 errors / 4 existing warnings);
shared 108/108, API 1,558 passed / 3 skipped, mobile 898/898; API build 35/35 pages,
16 steps / 1 workflow; diff check PASS (0 errors). Android export NOT APPLICABLE.
Live ACL/RLS/bucket privacy, secrets, deployed revisions/flags, Scheduler and
runtime logs are **UNVERIFIED (owner to confirm)**. Rollout and device checks were
entirely skipped; both API fixes await the owner's rollout batch. See
[handoff](ai/handoff.md#h1h1b-unattended-release-hardening-audit-2026-10-13).

## O2 offline quiz reveal and scoring (2026-10-13)

**O2c PASS for local code scope; rollout/device acceptance pending.** O2b's shared
TypeScript grader (`4ad11b4`) and owner-only answer-key endpoint (`086e7ad`) are
preserved. The owner's corrected decision keeps `complete_quiz_attempt` and
persisted History/Library percentages SQL-authoritative; no database migration
or SQL function was changed. Frozen TypeScript response parity and all 23
SQL-rule fixtures pass against the unchanged function in local PGlite.

Separate owner-scoped SQLite keys hydrate with O1 bodies, retry independently,
refresh with the body revision and purge on sign-out/copy removal. Missing keys
retain the existing connection-required behavior. Offline check, reveal and
finish use the shared grader and persist provisional results with the caption
"Scored offline · will sync". Replay persists the server attempt identity before
mutations, preserves assisted-reveal ordering, tolerates interrupted completion,
and replaces local results with the server's; mismatch logging is only
`offline_score_mismatch`. No AI calls or jobs were added.

O2c implementation commits: `f2ac5dd` (storage/hydration) and `3b05865`
(offline practice/replay). FRESH final gates: forced typecheck/lint 7/7 each,
0 cached (0 lint errors / 4 existing warnings); shared 133/133 in 12 files;
API 1,608 passed / 3 skipped in 141 files; mobile 920/920 in 90 files;
API build 35/35 pages, 16 steps / 1 workflow; Android export 3,456 modules /
31 assets / 1 bundle / 1 metadata file; diff check PASS (0 whitespace errors).
The failed first fixture/typecheck/mobile-request-count attempts are recorded
in the handoff. Gates ran with the pre-existing uncommitted H2 dependency group;
O2c neither changes nor commits those manifests, lockfile or ADR-023.

Live revisions, deployed SQL and parity on real student data are
**UNVERIFIED (owner to confirm)**. Owner steps remaining: one API deploy,
one preview OTA, then airplane-mode/force-stop/reopen/reveal/finish/reconnect
acceptance and score comparison. Rollout and device checks were entirely skipped.
See [ADR-022](architecture/ADR-022-offline-quiz-answer-keys.md) and [O2c handoff](ai/handoff.md#o2c-unattended-offline-quiz-reveal-and-scoring-completion-2026-10-13).

## VL0 local-upload PDF provenance (2026-10-13)

**VL0c PASS for local code scope; owner rollout/device acceptance pending.**
Accepted unchanged PDF text keeps the worker's page blocks on its canonical child
with `pageProvenance: "extracted"`. Exact trimmed-text hash comparison rejects
edited provenance (`"edited"`, no blocks). Read failures/missing or invalid
evidence keep acceptance successful with `"unavailable"` and no blocks. Existing
readers work without changes; no backfill, migration or second builder is needed.

VL1.2 subsequently adds local-PDF snapshots under Fely's respect-the-delete
decision. Owner answer 6 records VL0 STEP 0.5 as **accepted, deferred to VL1.2**; metadata relies
only on accepted text and does not assume bytes survive deletion. Cleanup,
camera/image, Canvas and mobile paths remain unchanged.
FRESH typecheck/lint 7/7 each (0 cached; 4 existing warnings); shared 108/108,
API 1,579 passed / 3 skipped, mobile 898/898; API build 35/35 pages, 16 steps /
1 workflow; diff check PASS (0 errors). Android export NOT APPLICABLE. Live state
and old affected-row counts **UNVERIFIED (owner to confirm)**.
Rollout/device checks entirely skipped. See
[VL0c handoff](ai/handoff.md#vl0c-unattended-local-upload-pdf-provenance-2026-10-13).

## G1.1 grade estimator drop rules (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Grade estimates
now apply `drop_lowest`, `drop_highest` and `never_drop` within each group, using
percentage ordering, stable assignment-ID ties and the one-graded-score guard.
The API translates persisted Canvas IDs into owned stored assignment IDs;
malformed rules retain an explicit warning. Hidden grades remain pending, and
mode selection still chooses the current calculation nearest Canvas's visible
score. No-rule output is pinned by the CIT17-like regression: 217/250 graded,
350 remaining, target 90% gives 92.3%, with the same per-activity points.

Uniform future scores are simulated at each candidate. Bounded binary searches
within stable drop ranges find the minimum required score to 0.1%, including
unequal-point order changes; dropped future activities do not contribute to the
target or appear in retained activity advice. Mobile displays applied drop counts
in existing secondary text. Protected-only rules have no misleading warning.

Implementation commits: `378fb61`, `fae3bdc`, `f856de7`, `0ccc29e`.
FRESH gates: forced typecheck/lint 7/7 each (0 cached; lint 0 errors / 4 existing
warnings); shared 108/108 in 11 files; API 1,551 passed / 3 skipped in 140 files;
mobile 898/898 in 89 files; API build 35/35 pages, 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file;
diff check PASS. Failed fixture/preload attempts are recorded in the handoff.

Live production state and Canvas parity are **UNVERIFIED (owner to confirm)**.
Owner next: one Vercel deploy, one preview OTA, then a drop-lowest course/device
hand calculation. No migration, remote service call, Scheduler change,
environment-file edit or push. Existing G1/R1 acceptance remains unchanged.
See [G1.1 handoff](ai/handoff.md#g11-unattended-grade-estimator-drop-rules-2026-10-13).

## E2 reviewer review-time estimate (2026-10-13)

**PASS: estimate and display code, tests and local commits complete; rollout/device acceptance pending.**
Reviewer estimates: E2 local. The reader and Library already load the exact saved
version payload, so both compute the estimate on read without new queries, metadata
writes or a migration. Saved explanations, key points and item/evidence text count
at 200 words/minute, plus 15 seconds per nonblank key point and 1 minute per section;
round up to 5-minute increments, minimum 5. Titles, metadata, emphasis copies and
unsupported enrichment are excluded. Empty/invalid content returns null.
Optional `reviewMinutes` fields keep older clients compatible; quizzes and activity
outputs return null. Mobile shows `~N min review` in the existing secondary caption,
joined to the automatic-origin label with ` · ` when present.

Implementation commits: `80e8cd5`, `4c48804`, `f3d3b7b`.
FRESH gates: forced typecheck 7/7 and lint 7/7 (0 cached; 0 lint errors,
4 existing mobile warnings); shared 93/93 in 11 files; API 1,542 passed / 3 skipped
in 140 files; mobile 890/890 in 89 files; API build 35 pages / 16 steps / 1 workflow;
Android export 3,454 modules / 31 assets / 1 bundle / 1 metadata file; diff check PASS.
The handoff records the corrected fixture failures and generated-type race.

E3 is the next product decision: which reviewers become Today review blocks, when,
and how often. Today and `task-planning.ts` are unchanged. E2 is independent of
PV1c/VL1.1b. Live production state is **UNVERIFIED (owner to confirm)**. Rollout and
device checks were entirely skipped under the unattended rules.

## PV1 Canvas PDF provenance (2026-10-13)

**PASS: code, migration file, tests and local commits complete; rollout pending.**
Freshly prepared Canvas PDFs refresh the owned descriptor and use existing deferred
admission for both manual and automatic generation. The worker remains the sole
builder of cited page blocks; preparation failure remains `409 not_ready`.
Snapshot-aware cleanup uses transaction advisory locks plus a durable exclusive
claim to bridge the Storage HTTP deletion window. Snapshot insertion and new
current-file references share that lock and fail safely during a claim. Rollback
keeps any pre-existing or uncertain object and removes only a new unreferenced key.
The unused server resolver returns only the accepted unedited Canvas PDF revision.

Implementation commits: `2b0ce49`, `9b6ce4e`. Forward-only migration:
`20261013000200_canvas_source_provenance_retention.sql` (NOT APPLIED).
FRESH gates: typecheck 7/7 tasks; lint 7/7 tasks, 0 errors / 4 existing mobile
warnings; API 134 files, 1,488 passed / 0 failed / 3 skipped; mobile 87 files,
861 passed / 0 failed; API build 1/1, 35/35 static pages; diff check 0 errors.
The first API gate had one existing database setup timeout (1,484 passed / 7
skipped); both rerun and final run passed. A focused database fixture initially
failed 7 cases and was repaired (final focused retention suite 37/37).
No cached results claimed. PGlite tests deterministic transaction interleavings;
physical multi-session blocking and deployed Storage remain UNVERIFIED.

R1.4 admission evidence is NOT AVAILABLE (R1.4 preflight stop). Preview caps
(20,000/source; 90,000 combined) reject rather than truncate; no partial-source
quality finding is established. VL1.1b subsequently passed STEP 0 and completed Canvas-only snapshots locally;
owner rollout remains pending. VL0 remains separate. No production calls, deployment,
migration application, Scheduler changes, environment-file edits or push.
See [PV1c completion handoff](ai/handoff.md#pv1c-canvas-pdf-provenance-completion-2026-10-13)
and [ADR-021](architecture/ADR-021-canvas-source-provenance-retention.md).

## R1.4 CIT17 acceptance (2026-10-13)

**STOPPED at step 1; R1 remains 15/16, AG1 PARTIAL.** All five CIT17 baseline materials already have reviewers under the shared owner-scoped reviewer mapping. No eligible file, baseline edit, sync tap or generation; baseline remains exactly `2026-10-12T07:07:14.956768+00:00`. Production API `dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ` is READY and worker `generation-worker-00023-9hs` serves 100%. End counts: 622 sync jobs, 242 processing jobs, 113 reviewer jobs, 90 artifacts; 0 active sync/processing jobs. PV1 admission-path evidence NOT RUN because no new job exists. AG2 rollout/device acceptance remains pending. FRESH read-only checks; code gates NOT RUN (docs only). See [R1.4 stop evidence](ai/acceptance/r1/rollout-and-acceptance.md#r14--cit17-preflight-stop-2026-10-13).

## VL1.1b Canvas PDF snapshots (2026-10-13)

**PASS for local code scope; owner rollout/device acceptance pending.** Both
manual and automatic standalone unedited Canvas PDFs preserve cited page blocks.
The authenticated topic endpoint selects the lowest cited page, reuses an
owner/source-version/page cache, and awaits durable Google task acceptance before
HTTP 202. Header discovery does not render. The existing native worker renders
one accepted PDF page at 1400 px, verifies its hash, uploads privately and fences
publication with a lease. Reservations and actual attempts are capped at
20/user/rolling 24 hours, including retries. Missing original revisions return
source_revision_unavailable; VL1.1b excluded local/edited/Office/Page sources.
VL1.2 above subsequently admits eligible local PDFs while respecting deletion.

Mobile adds From page n, bounded five-check/15-second progress polling, and a
full-screen pinch/pan/double-tap viewer using existing tokens and Reduce Motion.
Offline device copies and failed reachability checks hide it; no offline image
store or new native dependency. Coarse null source types are classified server-side.

FRESH gates: forced typecheck and lint 7/7 each, 0 cached; lint 0 errors /
4 existing warnings; API 140 files, 1,537 passed / 0 failed / 3 skipped; mobile
89 files, 879 passed / 0 failed; API build 35/35 static pages, 16 steps/1 workflow;
Android export 1 bundle / 3,452 modules / 31 assets; diff check 0 errors.
Failed first attempts and the recurring PGlite bootstrap flake are recorded in
the handoff; its setup timeout now matches the other database fixtures.

Forward-only migration 20261013000300_source_page_snapshots.sql is NOT APPLIED.
PV1 migration/rollout, live retained bytes, bucket/IAM/queue, deployed renderer
and device checks remain UNVERIFIED (owner to confirm). No remote service calls,
deployments, applied migrations, Scheduler changes, environment-file edits or push.
VL0 local provenance remains separate. Embedded images and labeled external
visuals on request remain later phases. See [ADR-020](architecture/ADR-020-visual-learning.md),
[preflight](ai/acceptance/vl1/preflight.md), and
[VL1.1b handoff](ai/handoff.md#vl11b-unattended-canvas-pdf-snapshots-2026-10-13).

## VL1 source-page snapshots (2026-10-13)

**STOPPED at STEP 0.1; implementation remains pending.** Local PDF canonical
source versions lose page-numbered blocks at extraction persistence, although
reviewer payloads retain `sourceBlockIds` and original document links survive.
Owner direction is required for a provenance repair before the snapshot table,
API, durable worker rendering, mobile viewer and tests. ADR-020 is not written:
the run stopped before implementation and the Docs section. Later visual phases
remain extracted embedded images, then labeled external visuals only on request;
VL1 is actual source pages only. No rollout or device checks attempted. FRESH:
documentation diff check (0 errors); six build/test gates NOT RUN. See
[VL1 handoff](ai/handoff.md#vl1-unattended-source-page-snapshots-2026-10-13).

## P1 unattended polish (2026-10-13)

**PASS for local code scope; rollout/device acceptance pending.** Singular hidden-grade
copy is tested, Tasks opens the shared Grades screen inside its own `work` stack,
and Matching-only quizzes use a deterministic verbatim-term budget in setup,
admission, retry and worker processing. The strict validator and Mixed capacity
are preserved. No migration, external service call, deployment, Scheduler change,
environment-file edit or push. FRESH: forced typecheck/lint 7/7 (0 cached,
4 existing lint warnings); shared 71/71; API 1,415 passed/3 skipped; mobile
853/853; API build 35 pages/16 steps/1 workflow; diff check 0 errors.
The original R1 Matching-only source/cause and live revisions are UNVERIFIED
(owner to confirm); the historical fixture does not establish that root cause.
Failed first attempts, evidence and Owner steps remaining are recorded in [P1 acceptance](ai/acceptance/p1/unattended-polish.md).

## AG2 background automation (2026-10-13)

**PASS (local code scope); rollout and device acceptance pending.** Complete
metadata polls now detect newly observed File/Page module-item IDs and await the
existing durable course-content admission and Google dispatch. The first complete
inventory baselines existing IDs; changed items and failed scopes do not trigger.
Service-only reservations serialize per-user checks: automation enabled, verified
API activity within 7 days, at most 1 request/course/rolling 6 hours and 3/user/rolling
24 hours. Auth records activity with an hourly conditional write. AG1's 3/run and
5/24-hour reviewer limits remain unchanged. Queue shows Auto; Library and the
reviewer header show Made automatically, derived from owned candidate/job/version
receipts. A service-only, idempotent stale-email SQL guard and owner activation
runbook are prepared. Migrations `20261013000000` and `20261013000100` are local only.

FRESH: forced typecheck/lint 7/7 each (0 cached; 4 existing lint warnings), API
1,450 passed/3 skipped in 132 files, mobile 861 passed in 87 files, API build
35 static pages/16 workflow steps/1 workflow, Android export 1 bundle/3,450 modules/
31 assets, and diff check 0 errors. The first typechecks failed on JSON narrowing
and mobile fetch-mock types; both were fixed and rerun successfully. No test flakes.
R1.4 pending. Cloud Scheduler, live revisions, environment/IAM and applied
migration state are UNVERIFIED (owner to confirm). No remote service calls,
deployments, migration application, emails, Scheduler changes, environment-file
edits or push. Website parity is deferred. See the
[execution contexts](architecture/ag2-execution-contexts.md) and [handoff](ai/handoff.md).

## R1 coordinated rollout (2026-10-12)

**PARTIAL — production rollout complete; 15/16 device lines PASS, line 7 FAIL (R1.3 reviewer generation), 0 pending.** R1 source `cc42361`; AG1.1 fix `b5adb7d`; AG1.2 token fix `4a2a2d0` and dispatch fix `b6ab830`. Owner-applied R1.1 migrations remain reconciled with no history repair. API `dpl_38faB6K3SfD38KeGE7TNuG6W6bgp` was later redeployed by the CC17 session as R1 + API quiz fixes, `dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF`. GR1 API **dpl_Hua1KbWEDGYphVB8xVexSdV3UBdQ** and worker **generation-worker-00023-9hs** (100%) deploy source fc3486b. Rollback: API dpl_7xLxnfVqY81QVCUyiiy6qQvsDDgF; worker generation-worker-00022-wzx. Preview OTA `ba5e6d56-d75a-4ef4-adb0-162518572c48` is unchanged. Scheduler/Resend inactive. See [R1 evidence](ai/acceptance/r1/rollout-and-acceptance.md).

| Feature | Overall status | Device acceptance |
|---|---|---|
| O1 offline library | PASS | Lines 1–4 accepted: cold offline Reviewer/Quiz/Draft reopen, copy removal/recovery, practice kept, no sync jobs |
| AG1 automatic reviewers | PARTIAL | R1.3 proved preparation/admission/dispatch/start but failed during generation. GR1 classification and bounded known-outcome retries are live. Fresh manual Unit 2 diagnosis succeeded on worker 00023, first delivery, 53,159 ms; saved reviewer opens in Library. Original failed job unchanged. Line 7 still needs one completing automatic run. |
| E1 study-time estimates | PASS | Lines 10–12: varied estimates, student edit kept, no re-estimation |
| G1 grade estimator | PASS | Lines 13–14: hand-checked CIT17 90% → 92.3% per remaining activity |

Regression/sign-out-in line 15 and Mixed-quiz Matching line 16 PASS. Matching-only generation contract failure remains open. GR1 provider classification and bounded definite-outcome checkpoints are deployed from fc3486b. Unit 2 manual diagnosis PASS on worker 00023: fresh job ceaebf6d succeeded on delivery 1; provider duration 53,159 ms; saved reviewer opens from Library (18 topics). No request_failed or reviewer_generation.* failure events; kind/httpStatus/incompleteReason absent on success. Original d9de6cfe remains failed/generation_failed, attempt 2, retryable=false. No Queue Retry or direct data edits; no new deploy, cap change, migration, OTA or push. The earlier R1.3 failure cause remains unknown; this run does not establish output truncation. Line 7 remains FAIL, R1 15/16, AG1 PARTIAL; next automatic acceptance needs naturally new or known-fitting material. AG2 background-poll code is complete locally; rollout/device acceptance and website parity remain open. Prior GR1 code gates passed: forced typecheck/lint 7/7 (0 cached, 4 existing warnings), API 1,409 passed/3 skipped/128 files, build 35 pages/16 steps/1 workflow, provider contract 20/20. Code gates NOT RERUN for this device/docs continuation; documentation diff check FRESH PASS.

## O1 explicit offline library (2026-10-12)

**PASS (local) - v1.4 follow-up item (4); device acceptance pending.** O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Fely's option 1 and corrected grading decision are implemented by O2c (ADR-022); TypeScript is shared, SQL retains persisted authority, and deployment/device acceptance remain pending.

## G1 grade estimator (2026-10-12; historical local result before R1/G1.1)

**PARTIAL - local implementation verified.** Product direction v1.4 follow-up item (2): G1 implemented locally: target grade → required score per remaining activity, mode chosen by Canvas's own current score, drop-rule/hidden-grade/mismatch warnings. Not physically accepted. Drop rules are not simulated; hidden grades count as pending. Read-only live sanity check awaits account/course context. Next: offline library (O1).

## E1 study-time estimates (2026-10-12)

**PARTIAL - local implementation verified.** Product direction v1.4 follow-up item (3): E1 implemented locally: content-based task estimates (batched AI, heuristic fallback, student override wins), refreshed before planning. Not production-applied or physically accepted. Reviewer estimates: E2 local; Today review blocks deferred to E3.

## AG1 automatic reviewer generation (2026-10-12)

**PARTIAL - local implementation verified.** AG1 implemented locally (ADR-019): admission after content sync, baseline, caps, off switch. Not production-applied or physically accepted. AG2: metadata-poll trigger, inactivity gating, Queue/Library Auto label, website parity. [ADR-019](architecture/ADR-019-automatic-reviewer-generation.md).

## Product direction v1.4 follow-up (2026-10-10)

**PARTIAL — AG1, E1, G1 and O1 implemented locally; device acceptance pending.** From the October 10 TBI assessment huddle (see [official direction v1.4](capstone/official-direction.md)): (1) AG1 implemented locally (ADR-019): admission after content sync, baseline, caps, off switch. Not production-applied or physically accepted. AG2: metadata-poll trigger, inactivity gating and Queue/Library Auto labels complete locally; rollout/device acceptance and website parity remain; (2) G1 implemented locally: target grade → required score per remaining activity, mode chosen by Canvas's own current score, drop-rule/hidden-grade/mismatch warnings. Not physically accepted.; (3) E1 implemented locally: content-based task estimates (batched AI, heuristic fallback, student override wins), refreshed before planning. Not production-applied or physically accepted. Reviewer estimates: E2 local; Today review blocks deferred to E3; (4) O1 implemented locally: every saved artifact body hydrates in batches (foreground and completion catch-up, no new jobs), Saved offline markers and counts, calm offline states, Offline storage settings. Not physically accepted. O2c now supports offline Quiz reveal/scoring with separate owner-scoped device keys; offline Draft editing remains network-only. Team action items: compare the app against NotebookLM, research fair use and the replacement term for "grounded generative AI", and revise the BMC. Notification activation and B43 remain the current engineering priorities unless Fely reorders them.

## Urgent Canvas notification activation (2026-10-03)

Local metadata synchronization, transactional email outbox, deadline reminders and persistent Settings controls are implemented. Next: apply the forward migration, configure cron/Resend variables and verified sender, roll out API and Mobile, perform developer-only live delivery and repeat-request/device acceptance, verify five-minute workload capacity, then enable the single Google Cloud Scheduler job. The current Hobby plan cannot provide that trigger interval through Vercel Cron. [Setup and behavior](architecture/canvas-email-notifications.md). Other phase gates below remain unchanged.

## Quick Canvas token tutorial (2026-10-01)

The scoped tutorial popup is implemented and checked on the realme through preview OTA `01a0f7d2-ca43-760b-9723-4a4ddf1f1a40`. New-token reconnection remains untested on the device; no Canvas integration or footer navigation code changed. B43–B45 work has not started.

## B39.1 deploy + physical Canvas sync and Task attachment acceptance (2026-10-01)

**BLOCKED at live Canvas/device acceptance.** Offline Task attachment metadata is stored in the existing owner-scoped SQLite database. API deployment `dpl_74hWVM2kSvg21hfnRLcVu885ohFe` is READY and healthy; preview APK `de93f504-cb53-4388-b48a-47103d65eb3a` contains Expo Sharing and is installed on the RMX3151. The session exposes no Android UI control surface, so the fresh Canvas credential check/sync, attachment open, and physical workflow/passive-sync tests could not run. Next: provide supported CUA Android control for the authorized RMX3151, then finish the remaining B39 acceptance gates. [Evidence](ai/acceptance/b39.1/deploy-physical-canvas-sync.md).

## B39 student workflow and Canvas Task attachments (2026-10-01)

**BLOCKED pending live Canvas and physical acceptance.** Course-first workflows and the student screens were retained. Assignment/announcement attachment-only files are now excluded from Generate; Task detail presents owner-scoped attachment metadata and a server-resolved, authenticated file open path. Local typecheck and focused sync, routing, Task, Library, Announcement, Reviewer, and Canvas-client suites pass. No production changes or fresh sync occurred. Next: run the normal manual Sync and complete realme attachment/resync/passive-navigation acceptance on a native build with `expo-sharing`. [Evidence and outstanding gates](ai/acceptance/b39/student-workflow-canvas-tasks.md).

## B37 generation regression physical gate (2026-10-01)

**BLOCKED after B37.2.** The Introduction PDF remains physically PASS. The hidden Page-linked file `11574237` is now authenticated, downloaded, validated and stored through the scoped repair `54aa9fd`, deployed as API `dpl_AHpKJsANQzNa3Tya3QqaYusZn89z` and Android preview OTA `01a0f4ef-496a-7c4c-a6e7-52617f4268bd`. Fresh Unit 3 job row `dde023f1-65ef-415b-b888-5550bc845494` cannot stage its Page plus file provenance: production `stage_deferred_canvas_reviewer_pdf_v1` requires exactly one file item. It remains queued with zero worker attempts and no result after an API 503. Next: reconcile this database contract with the already implemented two-source worker path, address the stranded row safely, then rerun fresh Unit 3 acceptance before the 40-page PDF. No further repair was made after this device failure. [Evidence](ai/acceptance/b37/production-generation-regression-20261001.md).

## B39 preview API configuration (2026-09-30)

**PASS.** Runtime configuration failures are separated from authentication, and the Android preview OTA command now validates the EAS preview API address before publishing. Final update `01a0f2ae-79d7-732a-9ba4-c492f2af3545` passed realme acceptance. Canvas jobs stayed at 468 with zero passive additions. Continue using the [guarded preview command](dev/mobile-device-runbook.md#android-preview-updates) for future OTAs. [Acceptance](ai/acceptance/b39/preview-api-configuration.md).

## B38 Canvas admission and physical gate (2026-09-30)

**PASS.** Production API and private worker deployment, manual synchronization, passive zero-job navigation, and realme relaunch passed after explicit user authorization. [Acceptance](ai/acceptance/b38/canvas-sync-admission.md).

## B38 pre-rollout snapshot (historical, 2026-09-29)

**Deployment gate blocked.** Automatic approval review rejected the production Vercel rollout and prohibited a workaround. Obtain authorization for the prepared Vercel, Cloud Run, and preview mobile deployments, then run the realme gates. [Evidence](ai/acceptance/b38/canvas-sync-admission.md).

B37 Google dispatch is committed at `46e66a8`. B38 locally removes full-course sync requests from launch, foreground stale checks, Today focus, and Generate/Tasks refresh. The existing unique active-job index is reused to return the current job on a concurrent request. A bounded token-handoff retry addresses the zero-unit repeat failure associated with a Vercel internal-route timeout, and empty Canvas Pages are excluded from Generate. Next: deploy the verified API/worker/mobile revisions, then run the realme passive-navigation, one-course-at-a-time manual sync, announcement, and relaunch gates. The preceding P0 note is historical.

## Immediate P0: Canvas sync capacity (2026-09-29)

The direct Google Cloud Tasks to private Cloud Run Canvas path is deployed and proved by fresh terminal content/grade jobs for CC6, CIT17 and SOC SCI 103N, all without Workflow. The finalization token handoff bug is corrected. Physical acceptance remains PARTIAL: app navigation and relaunch started additional 7-course batches, one repeat CC6 content delivery failed before units, and an empty CIT17 administrative Page appeared in Generate. Next: correct automatic sync freshness/relaunch admission and the repeat-delivery failure, then rerun physical routing and relaunch acceptance. The earlier capacity note below records the pre-cutover state.

Vercel Workflow has exhausted its usage limit, so accepted Canvas jobs do not execute. Overdue-job expiry and client failure convergence are implemented, with the database reaper applied and Android preview OTA published. Fresh CC6, CIT17 and SOC SCI 103N syncs remain blocked. Restore Workflow capacity or implement the already planned Google-worker Canvas sync migration, then run the three-course physical acceptance and commit the scoped repair only after it passes.

## B39 EAS preview distribution (2026-09-29)

**PASS after authorized native preview-build fallback.** B38 plus header cleanup was delivered by preview OTA, then the old APK's missing native crypto required owner-authorized APK `21be5ea3-f224-4be4-a707-643c7957dd15` from `2c66889`, Android runtime `2.0.1`. Realme Google sign-in, Draft-first UI/headers, Library categories, Reviewer controls, Quiz progress, offline force-stop/reopen and unchanged Draft cards/count pass without Metro. FRESH focused mobile 147/auth 29 tests, typecheck/lint, diff check, export and APK build pass. Preview channel retained; future Android updates target `2.0.1`; no backend rollout, production channel change or push. Next: complete separate native Office DOCX/PPTX-opening acceptance. [Acceptance](ai/acceptance/b39/eas-preview-b38-distribution.md).

## Artifact header simplification (2026-09-29)

Removed repeated course/source banners and generated-date lines from saved Draft/Quiz previews, and repeated course/source context from the Reviewer header. Draft uses one multiline editable title and a header Export action; Quiz preview titles are compact. Topic navigation, question progress, Draft save status, actions and course organization remain. FRESH verification: 67 focused mobile tests, mobile typecheck, changed-screen lint and git diff check pass. Existing Draft, Quiz preview and Reviewer opened on realme with the cleaned headers; no generation or account data changed. Local debug JS only, no deployment or push.

## B38 draft-first assignment UX (2026-09-29)

**PASS.** Draft-first assignment UX is complete locally and accepted on realme: Task -> Assignment -> Generate Draft -> saved editable Draft. Library uses Drafts and the separate Study Activity artifact is no longer exposed. Internal Activity pipeline and B37 source handling remain intact. Fresh Firewall/VPN and Dice Roller each persist once; Firewall/VPN offline force-stop/reopen passes. Automated checks pass. Next: distribute the tested mobile UX through the existing preview update channel; no rollout or next milestone started. Earlier B38 architecture entries below describe separate historical scopes. [Acceptance](ai/acceptance/b38/draft-first-assignment-ux.md).

## B37.1 firewall/VPN Activity acceptance (2026-09-29)

**This generation bug PASS; B37.1 remains PARTIAL.** Course-aware assignment link resolution fixes the specific pre-provider source failure. The same firewall/VPN assignment and Dice Roller generated fresh drafts on realme through private Google worker `generation-worker-00011-n2s`; Queue, Library and firewall force-stop/reopen pass, with one result/draft per new job. Supplemental API error-message rollout awaits explicit authorization after automatic approval review rejection. Other B37.1 gates remain; no B38 work, EAS build or push. [Evidence](ai/acceptance/b37/activity-firewall-vpn-generation.md).

## B37.1 pre-APK polish and B38 order (2026-09-28)

**B37.1 PARTIAL; B37 PARTIAL.** Authorized production API/private-worker rollout is complete (`dpl_6UepXtqEVSPwnZMRYejoN5rMy38x`, `generation-worker-00010-g9v`). Minimal integrated arrows/slider, realme adb navigation/drift, reveal, offline persistence/replay, completion/score and retake/history pass. Fresh Reviewer emphasis, source grounding and three-page PDF pass. Fresh Matching generation loses pair labels during publication; tested forward migration `1025208` awaits Supabase approval, followed by fresh pairing/partial-credit acceptance. Real-finger 10/30/100 slider and remaining Activity task/native Office acceptance remain open. Earlier Activity persistence/PDF/DOCX/PPTX evidence is preserved. Do not make the EAS build yet; no origin push. [B37.1 evidence](ai/acceptance/b37/pre-apk-study-experience-polish.md).

After B37.1 passes, **B38 — Durable Canvas Sync Migration to Google Worker** is next. Keep Mobile → authenticated Vercel API → durable Supabase job → internal Google worker → Canvas → canonical Supabase data. Vercel owns validation, ownership, job start/status and lightweight API; the existing Google worker owns pagination, courses/modules/instructional files/Pages/tasks/announcements, downloads, checkpointed ingestion and bounded retry. Supabase owns job state, RLS, provenance, normalized data and generated artifacts. Design for interruption recovery, observable progress, isolated material failures, idempotent repeat sync, historical data retention and disconnect/reconnect. Preserve instructional material → Generate, deadline work → Tasks and announcements → Announcements. Keep worker credentials out of Mobile and logs. **B38 is not implemented.** Then run production Canvas lifecycle acceptance, make one new EAS preview APK and finish physical-device acceptance.

## B37.2 non-Canvas acceptance and build gate (2026-09-28)

**PARTIAL.** Non-Canvas sources (Text, Camera, Local File) and the 100-item Quiz pass physically after the immutable-source claim fix and two extraction-panel fixes. Canvas sync is blocked by the Vercel Workflow quota, so B37 closure and the signed preview APK wait for a fresh Canvas sync and a disconnect/reconnect check. Canvas sync jobs still run on Vercel Workflow; moving them to the Google worker would remove this failure mode. Consider this for B38. [Ledger](ai/acceptance/b37/study-experience-overhaul.md).

## B37.2 continuation in progress (2026-09-28)

Authentication and Canvas lifecycle implementation is deployed; email/password restoration, native S256, invalid Canvas token handling and same-account replacement have fresh device evidence. Owner/history fingerprints are retained. Resend delivered one deduplicated server-originated test message; a verified sender domain is still needed for general student delivery. Manual linking readiness now returns 200 after the user's saved setting change. Google/Microsoft device acceptance is continuing.

The normal quota admitted the fresh VPN 30 Mixed (30 persisted, two calls, no repairs) and Firewalls 100 Mixed (batch 4 duplicate rejection after seven calls, no published result). Finish provider flows, Canvas disconnect/reconnect/sync, Queue/Library reopen and Text/Camera/Local File physical acceptance before deciding B37 closure. Study Assist latency optimization remains deferred. API `dpl_6A3CygzdmL4u3jzUd9zkKZZb8afL`, unchanged private worker `generation-worker-00009-jzb`, Canvas migration `20260928001117`; 0 EAS builds, no push, `tmp/` untouched. [Ledger](ai/acceptance/b37/study-experience-overhaul.md). Earlier quota-stop checkpoints remain historical.

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

The local implementation reuses owner-bound `source_versions` for Text, Camera and Local PDF; Reviewer and Quiz share canonical source identity, existing generation, capacity and Library persistence in code. Canvas-specific IDs remain source provenance only. Non-Canvas sources do not use fake Canvas IDs. The rising Other source sheet persists on Continue, with no manual Save. Activity remains a separate Canvas assignment flow. The live Supabase migration was rejected by automatic approval review because its production Quiz constraint and RPC changes lacked clear authorization; the physical app's API was unreachable. That earlier approval/rollout blocker is resolved by the opening-gate checkpoint above; physical Android source and Library acceptance remains pending. Then run fresh small-source, 30-item and 100-item B37.1 production acceptance and Queue/Library reopen before B37.2 authentication. Study Assist latency follows B37 closure. [Ledger](ai/acceptance/b37/study-experience-overhaul.md).

Source acquisition may differ. After normalization/persistence, generation uses the same current engine.

## B37.1 capacity and non-Canvas decision (2026-09-28)

**PARTIAL.** The Generate UI now offers Text, Camera and Local File in a rising sheet verified on realme. Finish the canonical ownership/provenance design for those sources so they can use the same Reviewer, Quiz and Library pipeline as Canvas without invented Canvas IDs. Then deploy the scoped capacity/repair code, verify the small VPN source, find a legitimate instructional source with capacity at least 100, and run fresh 30/100-item and remaining physical acceptance. Study Assist selected-Reviewer fetch optimization follows B37 closure. [Checkpoint](ai/acceptance/b37/study-experience-overhaul.md).

## B37 study experience overhaul (2026-09-27)

**PARTIAL.** Batched Quiz generation, retry, exact-wording contract, key-point result reopening and Android sheet swipe-to-close are live and verified; 30-item production Quizzes pass. Next: decide how 100-item Quizzes stay unique (concept planning before batches or a source-size guard), make Study Assist reads scoped or co-locate the API with Supabase, then finish device acceptance and spend the single EAS build only after every gate passes. [Implementation and acceptance ledger](ai/acceptance/b37/study-experience-overhaul.md).

## B38 Google generation cutover readiness (2026-09-27)

**PASS — production generation cutover complete.** The B37 Quiz failure was a multi-select prompt/type mismatch; the prompt was repaired without relaxing validation. Fresh Google-backed Quiz, terminal duplicate replay, scoped Vercel OIDC federation and authenticated dispatch pass. After the user confirmed deployment capacity, one READY production deployment `dpl_Cgp6geT9JJrE2epyR9zQDmmYxvbL` switched routing to Google Cloud. Health and one owner-authenticated real instructional Quiz passed through the production API, queue, worker, persistence and Library reopen. Vercel Workflow remains the rollback path; no Android/EAS build was used. See [acceptance](ai/acceptance/b38/google-generation-cutover-readiness.md).

## B37 Google Cloud generation foundation (2026-09-27)

**PARTIAL.** A private Cloud Run worker and OIDC Cloud Tasks queue in the existing Stay Focus project executed the shared Reviewer/Quiz/Activity pipeline without a Vercel deployment. Five fresh Reviewer source formats and Activity succeeded, including existing scanned-PDF Google OCR and Library reopen. Quiz failed existing source validation; terminal replay was not executed after automatic approval review hit its usage limit. Vercel dispatcher workload identity and deployment capacity remain B38 prerequisites. Production still uses Vercel Workflow. See [acceptance](ai/acceptance/b37/google-cloud-generation-foundation.md).

## B37 Reviewer Study Assist (2026-09-27)

**PASS - production and realme acceptance complete.** On-demand Summarize, Explain simply, Analogy and Example use existing canonical Reviewer blocks and the contextual sheet, with a separate owner-scoped SQLite cache, content/prompt invalidation and concurrent-request deduplication. Reviewer and Quiz prompts/schemas are unchanged; cache isolation is regression-tested. Fresh mobile 677/677, API 947 passed / 3 existing opt-in skips, shared 44/44, provider contracts 19/19, forced typecheck/lint 7/7, API build and mobile export pass. Production deployment dpl_F87NsbQVEkbisWzJ1VZqiXtt5RKD is READY. EAS preview group c52531f9-a177-4b82-b73b-533f7ef0b93c reached the realme. All four live assists, cached sheet/Reviewer reopen, offline cached reuse after force-stop/relaunch, uncached-offline guidance, canonical integrity and Quiz UI pass. Logs show exactly four successful generation requests and zero additional calls for cached reuse; no deployment error entries. See [acceptance](ai/acceptance/b37/reviewer-study-assist-acceptance.md). Reviewer generation-quality review remains a separate user-guided milestone.

### B38.2.1 ribbon refinement (2026-09-26)

Dev-lab glow, palette flow and true ribbon-shape morphing are implemented and physically checked; mobile 576/576, typecheck and lint pass. Continuous completion and stopped failure/Reduced Motion are preserved. See [follow-up](ai/acceptance/b38-2-1/ribbon-glow-refinement.md). Original visual acceptance remains PARTIAL: approve material/shape and directly profile GL before production integration.

## B38.2.1 Knowledge Core visual prototype (2026-09-26)

**PARTIAL — prototype-only; production integration remains gated.** Real GL geometry, six states, theme variants and Reduced Motion work on the realme. Complete keeps moving slowly; Error stops. Mobile 574/574, typecheck and lint pass with four existing warnings. Materials/transparency and direct GL pacing still need acceptance; UI-frame evidence alone is insufficient. See [acceptance](ai/acceptance/b38-2-1/generation-core-prototype.md). Next for this visual: refine geometry/materials, reprofile, and approve before replacing the production SVG. B39 E2E remains separate; no job/Queue behavior changed.

## B38.2 physical-use repair (2026-09-25)

**PASS with limitations — Canvas sync, navigation, Reviewer navigation, course-first IA, motion and theme are repaired and physically accepted on the realme RMX3151.** Canvas sync had not run for six days. Durable jobs and credentials were healthy, but the only trigger was a buried legacy page, and every visible Refresh re-read stale rows. No account had ever synced submissions either, so Tasks counted submitted work as missing. Mobile now has one account-level sync (content + grades per selected course): it resumes on foreground, refreshes automatically when data is older than 6 hours, and shows a calm status line with Retry. Two latent defects were also fixed: stale idempotency-key replay and a lost-update race on job references. Announcement detail is a dismissible modal route; the old sheet re-selected the deep-linked announcement on every dismissal. Generate, Tasks and Library use one stack route per level, so header, Android and swipe back walk the hierarchy. Reviewers gain local find (highlights, count, previous/next) and a right-edge topic scrubber that activates only on a still hold. Also delivered: course-first Tasks with real due/past-due/completed counts, a uniform Library course grid with an All/Reviewers/Quizzes/Activities control, and title-first shared course identity. Motion uses native hierarchy slides, modal rises and tab fades, with a Reduced Motion fallback. The free-time ring is calm and theme-accented. A labelled UC-inspired (not official) palette is available. Mobile-only: no API, schema or migration change. Fresh mobile 569/569, typecheck, and lint with 0 errors. Delivered as EAS preview update `7b04c8e2` at `2974ced`. Screen recording is NOT RUN (ROM lacks `screenrecord`); physical Reduced Motion is BLOCKED (settings writes denied). Frame timing (17% janky over transitions) needs a performance pass. See [B38.2 acceptance](ai/acceptance/b38-2/physical-use-repair.md). Next: B39 Full E2E / Demo Acceptance.

## B38.1 production generation quality acceptance (2026-09-24)

**PASS.** Fresh production PDF Reviewer, same-source Quiz, PPTX Reviewer, and assignment-grounded Activity Output passed source fidelity, coverage, correctness, readability, physical-device presentation, Queue/background, Library, and relaunch acceptance. A real PPTX contract-budget failure was traced to the response schema's per-source-ID enum, repaired without weakening local exact-reference validation, deployed as `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk`, and successfully retested. See [B38.1 acceptance](ai/acceptance/b38-1/production-generation-quality-acceptance.md). Next: B39 Full E2E / Demo Acceptance.

## B38.0 Generate course state and material loading repair (2026-09-24)

**PASS.** This was a blocking repair before B38 quality testing. Generate now uses the Sync page's course inventory, so tapping a course follows its sync status: unsynced or incomplete courses go to Canvas sync, synced courses open Generate. What a synced course shows follows material eligibility: its materials or "No study materials found". Current courses come before previous ones. The HIST 100 "Materials could not be loaded" defect was an unselected course reported as a server outage. Deployed without a migration and accepted on Android. See [B38.0 acceptance](ai/acceptance/b38-0/generate-course-state-and-material-repair.md). Next: B38 Production Generation Quality Acceptance.

## B37.1 production migration and runtime closure (2026-09-24)

**PASS.** Production migration metadata was reconciled, the canonical Reviewer migration and owner-scoped read-grant follow-up were applied, and the corrected API deployment is READY. Signed Android acceptance covered both Quiz gates, explicit-confirmation spend safety, one real canonical Quiz through the durable Queue, offline SQLite reopen, canonical management, successful disposable deletion, and dependency-protected deletion. Legacy `reviewers` remains compatibility-only with zero rows and no active runtime reads. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: B38 Generation Quality Acceptance.

Current milestone order: B34 Current Mobile UX Repair → B35 On-Device Artifact Persistence → B36 Signed Physical UX + Offline Acceptance → B37 Generated Artifact Model Convergence → B38 Generation Quality Acceptance → B39 Full E2E / Demo Acceptance → B40 Capstone & Release Hardening.

## B37 generated artifact model convergence (2026-09-23)

**PARTIAL — canonical implementation passes locally; production migration and workflow acceptance remain.** All current source consumers now use owner-scoped `generated_artifacts` identity and persisted current versions. The forward migration preserves historical Quiz rows, adds an owner-safe canonical Quiz FK, and keeps the legacy table for later audited retirement. Saved-Reviewer management/deletion and B35 local removal use canonical IDs. Queue opening no longer accepts billable work. Production was not mutated because the known remote migration-history mismatch remains unresolved and no safe Supabase access path was available. See [B37 acceptance](ai/acceptance/b37/generated-artifact-convergence.md). Next: controlled B37 production rollout/smoke, then B38.

## B36 signed physical UX + offline acceptance (2026-09-23)

**PARTIAL — signed post-B35 physical acceptance completed; two items are unreachable on this branch.** Signed preview APK `245ccaec` at `1e81edd` (expo-sqlite included, signing identity unchanged) was installed on the realme RMX3151. B34's pending physical matrix now passes: Generate synced-course browser, Reviewer hierarchy, generation visual with status-independent layout, Library paging and indicator, Today handle geometry, and motion. B35 passes on device: local-first Library before any network call, force-stop/relaunch from the device store, full airplane-mode reading of Reviewer, Quiz (read-only, no answer keys, no scoring), and Activity Output, and reconnect with no duplicates or loss. Logout clears the session and the owner re-authenticated. Two bounded layout defects were repaired in `1e81edd`. Quiz generation and the supported Reviewer deletion flow remain unreachable because the Quiz gate, quiz source resolution, and Reviewer management still read the retired `reviewers` table while artifacts live in `generated_artifacts`; that needs a migration and RPC change, not an on-device repair. No second test account exists, so cross-account isolation stays covered by automated tests. See [B36 acceptance](ai/acceptance/b36/signed-physical-offline-acceptance.md). Next: B37.

## B35 on-device artifact persistence (2026-09-22)

**PASS — completed Reviewers, Quizzes, and Activity outputs are stored on the device and the Library is local-first.** An owner-scoped, versioned expo-sqlite store holds the authoritative cloud copy after the server has persisted the artifact. The Library renders from it before any network call, reconciles in the background without blanking, retains local rows on failure or remote-list absence, and removes a row only on an explicit owner-authenticated `not_found`. Explicit sign-out purges that owner's rows. Supabase, RLS, durable generation, and Queue are unchanged. A new native build is required. See [B35 acceptance](ai/acceptance/b35/on-device-artifact-persistence.md). Next: B36.

## B34 current mobile UX repair (2026-09-21)

**PARTIAL — the connected mobile UX implementation and automated gates pass; authenticated changed-build physical acceptance is pending.** The repaired surfaces are Generate information architecture, persisted Reviewer→Quiz dependency, Reviewer hierarchy, generation visual/stable layout, Library paging/loading/cards, Today handle geometry, and shared reduced-motion-aware interactions. The ADB-authorized realme loaded the local changed bundle but Expo Go has no access to the signed app's session; a signed EAS preview requires explicit upload approval. See [B34 acceptance](ai/acceptance/b34/current-mobile-ux-repair.md).

## B33 student-material ingestion closure audit (2026-09-21)

**PASS — supported student-material ingestion matrix is closed.** The former standalone DOCX/PPTX production milestone was absorbed by B31, and B32 closed scanned-PDF reliability; those production jobs should not be repeated without a new reproduced defect. B33 verified the complete Page/PDF/Office/image eligibility, acquisition, extraction, provenance, durable-generation, Queue, persistence, and Library evidence chain and repaired the one remaining concrete boundary defect: Tasks now admits Canvas assignments only when deadline-bearing and/or submittable. Positive Canvas instructional-image discovery remains naturally fixture/Student-permission limited and does not block the roadmap. See [B33 acceptance](ai/acceptance/b33/student-material-ingestion-closure-audit.md). Next: B34 generation quality acceptance.

## B32 scanned-PDF runtime reliability (2026-09-20)

**PASS — the 16-page Accounting scan now completes through checkpointed production inspection, OCR, ordered source attachment, AI generation, Queue, and Android Library persistence/reopen.** The final READY deployment is `dpl_EekcdmCmpfdoobvYouekuXrUmMEd`; the accepted fresh job is `a85bd672-2aed-401b-a37e-fd1c794d826f`. See [B32 acceptance](ai/acceptance/b32/scanned-pdf-runtime-reliability-acceptance.md). Next: B34 generation quality acceptance; revisit B33 only for a newly proven DOCX/PPTX defect.

## B31 student-accessible Canvas material acceptance (2026-09-19)

**PARTIAL — fresh Student-accessible Canvas text PDF, DOCX, PPTX, and Page Reviewers pass production generation, persistence, Queue/background use, Android Library retrieval, and relaunch reopen.** A proven FL 100 administrative-module routing defect was narrowly repaired and deployed as READY production `dpl_DKat3ypp6q4V5UETSKuDbJjLymcK`. The real 16-page Accounting scan now prepares to `PDF · ready`, but generation submission OOMs before durable job creation; exact internal provenance/byte/signature fields were not safely inspectable from student-facing surfaces. No eligible instructional image exists. See [B31 acceptance](ai/acceptance/b31/student-accessible-canvas-material-production-acceptance.md). Next: B32 scanned-PDF reliability.

## B30 Canvas instructional-image production acceptance (2026-09-19)

**PARTIAL / CLOSED WITH PLATFORM LIMITATION — the image-routing guard is deployed, READY, healthy, and verified to exclude administrative and ungrouped image noise after fresh physical-device synchronization.** The Student-only Canvas identity cannot create a direct teaching-module image fixture. Teacher/Designer cooperation and sandbox access will not be pursued. Automated routing tests remain the acceptance evidence unless a suitable student-accessible instructional image occurs naturally. This external Canvas-permission limitation does not block the student product roadmap. See [B30 acceptance](ai/acceptance/b30/canvas-instructional-image-production-acceptance.md).

## Former B33 DOCX and PPTX production milestone (absorbed)

Status: **Closed and superseded by the B33 closure audit above.** Real Student-accessible Canvas DOCX and PPTX acquisition, extraction, durable generation, persistence, Queue, physical Android rendering, and Library reopen were completed early in B31. B32 then closed the remaining scanned-PDF format blocker. Do not repeat a standalone Office-format milestone unless a new student-facing defect is reproduced.

## B36 Signed Physical UX + Offline Acceptance

Status: **PARTIAL and closed.** Signed post-B35 builds were produced and accepted on the realme RMX3151; see the dated entry above. Do not repeat the physical matrix without a new reproduced defect.

Complete B34's pending physical matrix (Today, Generate, Queue, Library, Reviewer, generation, motion, gesture conflicts, relaunch, accessibility) and accept B35 on device: generation completion stored locally, force-stop/relaunch Library before network, airplane-mode Library and Reviewer/Quiz/Activity opening, reconnect reconciliation, and sign-out/account-switch isolation.

## B37 Generated Artifact Model Convergence

Status: **PARTIAL.** Implemented and locally verified; production migration, deployment, authenticated smoke, safe deletion, and physical accidental-spend acceptance remain.

## B38 Generation Quality Acceptance

Status: **PASS and closed by B38.1.**

Fresh PDF Reviewer/Quiz, PPTX Reviewer, and Activity Output acceptance covered grounding, source fidelity, formatting, larger extracted context, durable Queue behavior, Library, and relaunch. The reproduced PPTX `request_exceeds_context_budget` defect was repaired at the structured-output contract boundary and retested in production. Previously accepted ingestion work remains historical evidence rather than being duplicated. See the dated B38.1 entry above.

## B39 Full E2E / Demo Acceptance

Status: **NEXT — ready to begin after B38.1 PASS.**

Run the complete authenticated Canvas-to-generation-to-Queue-to-Library demo matrix, including background/relaunch and failure recovery.

## B40 Reviewer Smart Selection Learning Tools

Status: **PASS (2026-10-01).** Topic tap → existing Study Assist sheet → selectable concept text → Define / Explain / Example / Test Me / Ask with lazy refinements, automatic labelled grounding, source-only Test Me, and server-enforced cost limits. Production-deployed (`dpl_CW3TWB9FjkXAoMvBPRbMntZvqMaR`, OTA `ded5f2a6`). [Acceptance](ai/acceptance/b40/reviewer-smart-selection-learning-tools.md).

## B41 Native Office DOCX/PPTX Opening Acceptance

Status: **PASS (2026-10-01).** Exported Draft DOCX and PPTX files open in Google Docs and Slides on the realme, after a line-break export fix shipped by OTA `9129850a`. [Acceptance](ai/acceptance/b41/native-office-docx-pptx-opening.md).

## Capstone & Release Hardening (formerly labelled B40)

Status: **NEXT.**

Close release, evidence, operational, security, and capstone presentation readiness without weakening the accepted product contracts.

## Canvas permission boundary

Stay Focused V2 will not depend on teacher or instructor cooperation for development, testing, demonstration, or capstone acceptance. Features requiring Teacher/Designer privileges must be supported by automated tests, exercised only through naturally available student-accessible content, or documented as external platform-permission limitations. They do not block the core student product roadmap.

## B29 live OCR and learning-image acceptance (2026-09-19)

**PARTIAL — live one-page scanned-PDF OCR, instructional-image OCR, fresh Reviewer generation, persistence, and Android Library retrieval pass.** The synchronized Canvas account provides no eligible direct-module teaching image, so Canvas learning-image discovery and the local routing repair remain physically unexercised. Generate now rejects ungrouped Canvas images such as course banners/profile artwork while retaining direct teaching-module images; administrative exclusions remain. One 16-page image-only accounting scan stalled before OCR and was cancelled safely. See [B29 acceptance](ai/acceptance/b29/live-ocr-learning-image-acceptance.md). Next bounded task: B30 deploy and physically accept one consented direct-module Canvas instructional PNG/JPEG, including provenance and decorative-image exclusion.

## B28 ingestion coverage and document-format acceptance (2026-09-19)

**PARTIAL — fresh production PDF, PPTX, and Canvas Page ingestion and generation passed; live OCR and Canvas DOCX coverage remain.** Three new owner-linked Reviewers completed and opened on physical Android from substantive CC16, CC17, and CC13 materials. The source snapshots retained 33 PDF pages, 39 PPTX slide markers, and 137 Page blocks. DOCX is implemented and extracted from a local fixture but absent in the Canvas account; scanned PDF and instructional image OCR await real sources. The accepted B27 deployment remains live. See [B28 acceptance](ai/acceptance/b28/ingestion-document-format-acceptance.md). Next bounded task: B29 live scanned-PDF and instructional-image OCR, including a decision on whether module-linked learning images should appear in Generate.

## B27 student-facing Canvas announcements (2026-09-18)

**PASS — B27 production rollout and authenticated physical announcement acceptance are complete.** Implementation commit `6b0a806` is live in READY deployment `dpl_BXWY9fC2L59bzJnPscspMdKLZHpT`; the metadata schema is applied, a fresh Canvas sync retained author data, and the signed Android app passed real Today/list/detail/Canvas-handoff and B26 routing checks. Links and attachments have no current source example. Reconcile the connector-assigned remote migration-history version with the local filename before a future CLI push. See [B27.1 acceptance](ai/acceptance/b27/student-facing-announcements.md). Next: B28 ingestion coverage and document-format acceptance.

## B26.1 deployed Canvas routing and Activity reliability acceptance (2026-09-18)

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.** The routing repair and two generic Activity requirement/personalization repairs are live in READY production deployment `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v`. Standalone realme validation before and after normal sync confirms learning Pages/PDF/PPTX in Generate, assignments in Tasks, announcements separated, and retained orientation material excluded. Five completed fresh Activity types passed all prewritten mandatory checks; a sixth was consistently source-limited before provider execution. Full verification passes except the existing local Expo external-link export limitation. See [B26.1 acceptance](ai/acceptance/b26.1/deployed-routing-and-activity-reliability.md). Next milestone: B27 remaining application redesign, beginning with a student-facing announcement experience.

## B25.3.4 standalone and AI-first production acceptance (2026-09-17)

**PASS — B25 is complete; B26 may begin.** The repaired existing APK passed physical standalone acceptance on the realme RMX3151: session/Canvas, one new completed Reviewer, five-question server-scored Quiz, one Canvas-instruction-grounded Activity draft, and Queue/Library cold-relaunch persistence. AI-first production paths, API security/health, and mobile regressions passed. See [B25.3.4 acceptance](ai/acceptance/b25.3.4/device-standalone-ai-first-acceptance.md). Next: B26 generation-quality evaluation across multiple real Reviewer materials and Activity assignment types. Earlier PARTIAL entries are historical.

## B25.4 physical-device acceptance (2026-09-16)

Authenticated physical production-API runs completed a real CIT6 Reviewer, exact 5/5 Quiz with server-scored 100% attempt, and CC16 Learning Contract Activity. Queue and Library persisted all three and the result reopened. A corrupt local generation cache defect was fixed and retested in Expo Go; the full regression passed. The patched standalone APK is being built for installation and release-path retest, so **B25 remains PARTIAL; B26 may not begin**. See [B25.4 device checkpoint](ai/acceptance/b25.3.3/device-acceptance.md).

## B25.3.3 AI-first generator migration (2026-09-16)

Real-material comparison is complete. Reviewer routes/worker/Workflow, whole-set Quiz and Activity now use the shared coherent-context/AI/thin-contract boundary. Legacy Quiz and Activity semantic planners and the duplicate Reviewer Workflow pipeline are removed. Full deterministic regression, typecheck, lint and build pass. Production 09835be / dpl_9yAtq2sy2YYRfYjoqytHCL6aWUa4 is READY and healthy. Physical acceptance is blocked on direct device sign-in and Activity assignment selection; B25 remains PARTIAL and B26 may not begin. See docs/ai/acceptance/b25.3.3/architecture-simplification.md and the accepted ADR.

## B25.3.2 candidate convergence (2026-09-15)

Commit `79e54dd` adds source-compatible blueprints, two-candidate pools, deterministic selection, cumulative semantic-intent exclusions and v4 durable call bounds. Strict quality, secrecy, ownership and exact-count gates remain. Focused Quiz 117; full Quiz 168 passed / 3 skipped; API 944, Mobile 481, Canvas 73, Engine 606, OCR 27, Shared 44; Workflow 1, provider contract 18; fresh root typecheck/lint/build 7/7 each. One live fixture passed 5/5 in 63.331 seconds with two author/two verifier calls and 14 candidates. Deployment `dpl_peVBgRctKVmGTfkNfQqTev74QCda` is READY and canonical health is OK.

The single authenticated production attempt on the unchanged real lecture failed: job `d038e85b-ae03-4853-aa2a-f663037415b0`, Workflow `wrun_01M2J4TSMPMWB6SPQXW8F0CTH0`, 4/5 accepted, q3 pending, `repair_exhausted` / `bounded_repair_attempts_exhausted` / `quiz_generation_failed`. Eighteen candidates and four author/four verifier batches; no Quiz persisted and no retry submitted. q1/q4 accepted second alternatives; q5 converged after a new intent; q3 failed even with alternate support. The realme showed the Generation failure and opened Queue; Library/attempt/secrecy/score/result/reopen remain unaccepted.

B25.3.3 should preserve source context and precise evidence ownership, select supports with enough evidence for meaningful distractors, and plan full-set concept/difficulty feasibility before immutable acceptance. **PARTIAL — Quiz semantic convergence remains incomplete.** B26 may not begin. See [B25.3.2 report](ai/acceptance/b25.3.2/quiz-candidate-convergence.md).


## B25.3.1 real-material Quiz semantic convergence (2026-09-15)

The implementation now sends structured validator findings, permits complete slot reauthoring, escalates to unused compatible support, derives mixed difficulty from source affordance, preserves accepted questions, and keeps the exact-count/grounding/distractor/leakage/academic-value gates strict. Fresh full verification and the final bounded synthetic-live attempt pass; production deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD` is `READY` and healthy.

The single real-material production retest still accepted only 1/5 and exhausted all bounded repair phases with four pending slots. No Quiz artifact or persisted attempt/result was available. **PARTIAL — Quiz semantic convergence remains incomplete.** The next B25 follow-up must use this symbolic failure trace under separately authorized provider/production limits; B26 does not begin automatically. See [B25.3.1 report](ai/acceptance/b25.3.1/quiz-semantic-convergence.md).

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

**PASS — B23 mobile recovery foundation proven; ready for B24 full UX/UI redesign.** The physical Android flow now survives backgrounding, process death during a running Reviewer job, and temporary network loss while preserving one exact durable identity. Relaunch restores the owning course, terminal results render and save once per immutable snapshot, unsafe state fails closed, and explicit retry is the only path to a new identity. Large-text behavior remains usable at font scale 1.35. Fresh Canvas 73/73, API 626/626, mobile 411/411, engine 606/606, and root gates pass. See [B23 acceptance](ai/acceptance/b23/mobile-recovery-foundation.md). Earlier entries below are historical.

B23 establishes accessibility/recovery behavior contracts only. Final UI accessibility and visual polish will be performed against the redesigned interface during B25–B28.

1. B24 — Complete Stay Focused V2 mobile UX/UI redesign specification
2. B25 — Design system + app shell implementation
3. B26 — Core experience redesign
4. B27 — Remaining application redesign
5. B28 — Full design QA + pilot freeze

## B22 mobile Canvas-to-Reviewer workflow — current result (2026-09-12)

**PASS — the Canvas learner-material capability is now a coherent physical-mobile study workflow.** Students choose a synced course, see ordered module materials with honest states, confirm a material, create a durable Reviewer with one primary action, study the completed output, receive automatic snapshot-bound persistence, and reopen it from Study Library without regeneration. The physical CIT6 run produced one fresh 20-section Reviewer from all 23 PDF pages with 1.00 coverage/grounding, zero verifier issues, passed leakage, and safe fallback disclosure. Unsupported PPTX and empty items remained visible and blocked. All final package and root gates pass; no backend deployment was needed. Next: define B23 as a separate accessibility and interrupted-session/resume hardening slice rather than broadening B22 into format ingestion or Canvas permission expansion. See [B22 acceptance](ai/acceptance/b22/mobile-canvas-study-workflow.md). Earlier entries below are historical.

## B21.1 Canvas learner-material production acceptance — current result (2026-09-11)

**PASS — B21 is deployed and physically proven.** Fresh production syncs persisted exact module Files, Pages, and Assignments for the three selected courses while unavailable broad collections remained safe partial warnings. Production repairs aligned the durable sync-unit constraint with B21's exact resolver kinds and reviewer snapshot provenance with the existing 40-page Canvas PDF limit. A real module-owned 23-page CIT6 PDF completed prepare, native-text extraction, 20-section grounded Reviewer generation, rendering, save, and Study Library reopen on a physical Android 13 phone. Fresh Canvas 73/73, API 626/626, mobile 377/377, and engine 606/606 pass. PPTX/DOCX and broader Canvas permission expansion remain out of scope. Next: begin B22 as a new bounded milestone. See [B21.1 acceptance](ai/acceptance/b21/canvas-learner-material-ingestion.md). Earlier entries below are historical.

## B20 real mobile Reviewer E2E — current result (2026-09-10)

**PASS — B20 real mobile Reviewer end-to-end validation passed for real PDF upload.** A physical realme RMX3151 / Android 13 completed authentication restoration, selection of real learner PDFs, durable extraction, authenticated production Reviewer jobs, completion, rendering, save, and Study Library reopen for 15-page prose-heavy and 55-page formula/table-like sources. Live auth, owner isolation, duplicate-submit, and network recovery checks passed. Fresh mobile 376/376, Reader 32/32, API 607/607, engine 606/606, architecture 157/157, Expo config, and forced root gates pass. **YES — MOBILE REVIEWER DEMO FLOW READY for PDF upload.** Canvas learner-material selection remains a capstone gap: fresh syncs of all three available courses were partial because Canvas denied Files and did not expose Pages, leaving announcements or no source; DOCX/PPTX ingestion is also absent. EAS preview APK build `58c631c6-ef35-4822-b634-c8c32eea064c` finished and passed standalone validation; [download the APK](https://expo.dev/artifacts/eas/HuRRjoOyl-ew_PDWGXUZcwOQ2hsHVV9fv9njifiRuQk.apk). Next capstone slice: Canvas learner-material access and ingestion validation; do not resume general Reviewer polishing without a demonstrated blocker. See [B20 acceptance](ai/acceptance/b20/mobile-reviewer-e2e-validation.md). Earlier entries below are historical.

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

## Reviewer B16 - Deterministic retention verified, live quality gate failed

B16.1 attempt 3 (2026-09-07): capacity AVAILABLE; all four live cases ran.
Required targets are retained at 99/99, 232/232, 156/156 and 46/46, with no
provider-owned targets, provider losses or factual retries. Final calls are
4/2/3/1 and durations 10.383/26.266/16.945/5.824 s. A generic, regression-backed
prompt correction aligns explanation wording with the frozen lexical gate;
Python still uses two fallbacks. Statistics fails assembly and Accounting fails
manual quality despite automated PASS. Full B12 is NOT RUN because targeted
acceptance failed. Fresh engine 476/476, architecture 27/27 and API 607/607 pass.
Next: reconcile the generic explanation/evidence presentation contract with
existing validation rules using captured failures; do not weaken gates or start
a benchmark-specific B17. The earlier no-credit attempts remain historical.
See `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Required evidence is now assembled and identity-checked from the Stage 2
manifest before any provider call. OpenAI owns only bounded batched
explanations; factual retries are zero, stable IDs isolate batch failures, and
non-standalone dispositions consume zero calls. Focused 26/26, full engine
475/475, API 607/607, and all root gates pass.

Historical B16 result before restored capacity: Python's two batches returned
OpenAI 429 `no credits remaining`; safe fallback preserved 99/99 targets in
5.432 s with no loss/fabrication, but this does not establish provider quality.
Statistics, Accounting, and full B12 were not run in that historical attempt.
The attempt 3 result above supersedes its provider blocker. Production remains `legacy`.

## Reviewer B15 - Planning boundary repaired, acceptance still failed

Stage 2 now distinguishes standalone, structural, typed-evidence and
unsupported source nodes using only local normalized/semantic evidence.
Non-standalone nodes retain explicit hierarchy, disposition reasons, exact
typed/semantic representations and unchanged manifest owners while consuming
no provider or retry calls. Twelve focused regressions pass and the complete
engine suite is 449/449 with all B13/B14 gates retained.

Fresh targeted acceptance did not clear the full-corpus prerequisite. Python
preserved 99/99 targets at 1.00 coverage/grounding but was withheld for
instructional noise. Statistics/MinerU preserved 211/232, Statistics/Docling
152/156 and Accounting 35/46; provider omissions and Statistics usefulness
failures were rejected with zero fabrication failures. The full unchanged B12
rerun was therefore not run. Production remains `legacy` and historical
acceptance evidence is unchanged.

Next task: repair source-supported evidence completion and usefulness without
changing B15 classifications, ownership, frozen thresholds or parser defaults,
then rerun the four targeted cases before full B12.

## Reviewer B14 - Explanation hardening, acceptance blocked by source boundary

Field-aware imperative, code-as-explanation, fragment and explanation-dump
checks now protect Stage 6. Missing-target repair prompts carry only exact
target evidence while retaining all source identities, and usefulness repairs
merge with accepted content. B14 adds 12/12 regressions; engine total is
437/437 with all 425 prior cases retained.

The milestone still fails. Exact candidate replay remains withheld, and source
audit proves the frozen 13-title Python plan contains two heading-only sections
and two code-only sections without explanatory prose. No B14 live or full B12
rerun was attempted after that deterministic stop condition. Production remains
`legacy`; historical acceptance evidence is unchanged.

Next task: reconcile heading-only planned sections with the source-faithful
Reviewer contract without cross-section borrowing, fabrication, default-parser
promotion, or weaker usefulness gates.

## Reviewer B13 - Implemented hardening, failed acceptance

Required evidence now has stable IDs and typed provenance, source availability
is checked before generation/fallback/assembly, and retries receive exact
missing targets with prior accepted content. Stage 6 rejects non-explanatory,
instructional-noise, source-dump and low-information content without deleting
required sections. Formula/code/table allowances remain block-aware. The engine
suite is **425/425**, including all 406 previous cases.

This does not complete the acceptance milestone. The frozen targeted workload
still produces withheld reviewers. The report distinguishes captured live
metrics from replay after final required-technical-evidence tightening; no full
B12 or durable acceptance rerun is claimed. Production remains `legacy` and
all original safety/structure gates are retained.

Next task: evidence-bound provider completion and source-sparse explanation
recovery, then targeted acceptance and only afterward the unchanged full B12
corpus. See `docs/ai/acceptance/b13/reviewer-usefulness-and-completion.md`.

## Reviewer Benchmark B12 - Failed acceptance

The frozen B8 Python, Statistics, and scanned Accounting sources were rerun
through hybrid extraction, production pipeline components, and the real durable
job APIs. Parser readiness passed for every source with no fallback or parser
loss. One generic durable-boundary defect was fixed: persisted Docling/MinerU
typed blocks now bypass legacy presentation-page expansion. The focused Stage 0
regression passes and the complete engine suite is 406/406.

The acceptance milestone is not complete. Python restores the exact 13 B11
titles and passes coverage/grounding at 1.00, but manual inspection still finds
non-explanatory sections, activity leakage, and overlong source-like points.
Statistics remains withheld for omissions with both MinerU and Docling.
Accounting remains withheld when generated Ledger content omits an exact table
row. Zero fabrication and zero unsupported relationships were accepted; the
production parser default remains `legacy`.

Next Reviewer task: generically strengthen student-visible usefulness and
required-evidence completion without weakening current gates, then rerun the
unchanged B12 workload.

## Reviewer Benchmark B11 - Complete

Stages 1-6 now exploit the typed structure established in B10. Generic
multi-signal heading roles suppress furniture and instructional fragments while
retaining their child evidence; equivalent same-parent headings consolidate
without numeric suffixes. Planned typed evidence groups preserve formula raw
text/parser LaTeX, tables, exact cells, code, results, and provenance through
generation and relationship grounding. Objective Stage 6 diagnostics withhold
malformed student-visible structure without imposing a blind point cap.

The eight B11 regression families pass, and the complete engine suite is
405/405 with all prior 396 cases retained. API remains 607/607. Live Python
Docling now assembles 13 clean concepts at 1.00 coverage/grounding. Statistics
Docling grounding issues fall from 41 to 4 and MinerU from 40 to 2, with zero
fabrication failures; both remain safely withheld for omissions or missing
output. Accounting cell and numeric/OCR provenance is unchanged. The parser
production default remains `legacy`.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using hybrid
structured parsing. Unconditional parser promotion remains deferred.

## Reviewer Benchmark B10 - Complete

A feature-flagged structured parser architecture now preserves typed document
structure and provenance across the API, durable processing, engine Stage 0,
and mobile result boundary. Legacy, Docling, and MinerU outputs map into one
provider-independent contract; generic observable-signal routing and quality
gates select or reject external parses, and every external failure falls back
to the unchanged current extraction/Google OCR path. `legacy` remains the
production default.

Sanitized code-heavy, formula/table-heavy, and scanned-accounting fixtures
protect typed code, formulas, tables, OCR origin, hierarchy, source order, and
numeric cell provenance. The deterministic engine suite is 396/396 and the API
suite is 607/607. Live generation evidence is partial: Docling improves the
code-heavy reviewer before additional heading heuristics, but MinerU is
withheld; all central-tendency arms are withheld even though Docling/MinerU
retain formulas and tables. Scanned accounting reaches MinerU and the shared
contract without Google credentials, while known parser omissions remain
visible rather than being invented.

Next Reviewer benchmark: B12 - rerun full B8 end-to-end acceptance using the
accepted typed hierarchy/grounding layer and hybrid structured parser.

## Reviewer Benchmark B4 - Complete

Stage 4/5 now verifies relationships rather than certifying source-token
presence alone. Coverage assigns visible rows to unique semantic targets and
scores covered targets over total targets. Grounding separately rejects wrong
definition, parent-child, procedure-order, example, cross-concept, and sibling
associations while retaining lexical fabrication and omission checks. Valid
conservative paraphrases and ambiguous flat source structures still pass.

The required 16-fixture matrix, seven structured fault injections, and precise
section-only retry diagnostic pass. The engine suite is 343/343. The exact Intro
to IT Security PDF rerun preserves B3's 17 titles and every sourceCore payload,
passes 110/110 semantic targets, coverage and grounding at 1.00, zero semantic
relationship issues, and leakage, with 17 calls, no retries, and no fallbacks.

Page 10 visual labels, page 14 hierarchy edges, and flat denial-service visual
relationships remain extraction limits rather than verifier failures. The
Google service-account credential exposed during B3 requires separate
authorized operational rotation; B4 did not inspect or reuse it.

Next Reviewer benchmark: apply the same process to the Firewalls PDF to test
cross-document generalization before making additional engine changes.

## Reviewer Benchmark B3 - Complete

The accepted B2 17-section outline is unchanged. Stage 2 now carries a generic,
optional semantic plan for concepts, lists, definition sets, supported category
groups, procedures, and example groups. Stage 3 serializes those relationships
through the compatible key-point surface, retains only useful direct-source
explanations, keeps sparse facts free of filler, and continues to exclude
outside enrichment. Page-scoped continuation content remains whole through
generation and grounding.

The 32-page Intro to IT Security rerun used `gpt-4o`, made 17 calls with zero
retries and zero fallbacks, emitted the same 17 titles, and passed coverage and
grounding at 1.00 with leakage passing. Definitions, threat categories,
infiltration groups and ordered steps, and blended-attack examples remain
associated. The deterministic engine suite passes 319/319.

Known extraction limits remain: page 10 visual labels are absent and page 14
attacker hierarchy edges are not reconstructed. The next Reviewer benchmark is
B4 semantic verification: Stage 4/5 should independently reject incorrect
relationship flattening/grouping instead of treating lexical 1.00 scores as
semantic proof.

## Reviewer Benchmark B2 - Complete

Production PDF review now retains normalized page identity through durable job
submission and feeds generic page-aware blocks to Stage 0/1. Presentation title,
divider, references, and OCR/logo noise are classified as source evidence but
excluded from the academic outline; repeated continuation headings merge while
distinct neighboring concepts remain separate. The unchanged Stage 3 generated
the Intro to IT Security benchmark from a natural 17-section outline with
coverage, grounding, and leakage gates passing. Eleven new generic regressions
raise the deterministic engine suite from 292 to 303 cases.

Known next-layer debt remains explicit: Stage 2/3 must preserve semantic
relationships and write useful explanations, and extraction still cannot recover
page 10's diagram labels or page 14's visual hierarchy edges.

## Capstone Development Phase R5 - Task And Study-Plan Foundation

Status: Complete and live accepted.

- Added owner-scoped `tasks`, `study_plans`, and `study_sessions` with RLS,
  owner-safe foreign keys, service-only atomic import/apply functions, and a
  forward-only migration after the existing local/linked versions.
- Manual task CRUD and persisted synchronized Canvas-assignment import are
  exposed through authenticated APIs. Import makes a user-owned task, is
  idempotent, performs no Canvas request, and preserves user edits on re-import.
- The shared planner is deterministic and non-AI. It orders by deadline,
  priority, creation time, then task ID; bounds sessions to 90 minutes; and
  reports every unscheduled minute when capacity is insufficient.
- Preview is read-only. Apply accepts the normalized planning request, reruns
  the planner, validates owned pending tasks, and persists the plan/sessions in
  one RPC transaction rather than trusting arbitrary client session records.
- Targeted R5 API/database/acceptance tests pass 11/11, shared tests pass 31/31,
  reviewer regression passes 290/290, and shared/DB/API typechecks plus DB/API
  builds pass. Full API regression remains 558/559 only because of the known
  pre-existing Windows CRLF Canvas assertion.
- The four authorized Canvas migration-version aliases were reverified against
  live tables, constraints, indexes, RLS, functions, grants, retry structures,
  and service-role protections, then reconciled as metadata only. Historical
  SQL and Canvas schema objects were not changed or replayed.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260827155438_task_study_plan_foundation`; the linked push applied only that
  migration. Live schema, CRUD, Canvas import, preview/apply, session behavior,
  atomicity, cleanup, and all eight API plus RLS/database cross-user denials
  passed.
- Live preview initially exposed a valid PostgreSQL microsecond timestamp being
  rejected by the shared validator. R5 now accepts arbitrary valid fractional
  seconds, the focused regression passes, and the full live suite passes.

### R6 prerequisite - deterministic replanning replacement

Status: Complete and hosted accepted.

- Study sessions expose `planned`, `completed`, and `skipped` lifecycle state.
- Applying a plan serializes per owner, deletes only active sessions that
  intersect the requested planning range, preserves terminal history, rejects
  overlapping proposed sessions, and persists the replacement atomically.
- Repeated stateful API applies remain bounded to one active schedule for the
  range. Shared, targeted planning, mobile, reviewer, typecheck, lint, and build
  gates pass. The full API suite remains green except for its known Windows
  CRLF Canvas assertion.
- Supabase CLI 2.116.0 dry-run proposed only
  `20260828173643_replace_planned_study_sessions_on_replan.sql`; the linked push
  applied it and local/remote migration history now matches.
- Hosted catalog inspection verified lifecycle schema, the partial planned-row
  index, advisory locking, replacement/overlap markers, `SECURITY INVOKER`,
  service-role-only execution, RLS, and owner policies.
- Dedicated two-user live acceptance passed first apply, same-window reapply,
  active-duplicate absence, completed/skipped preservation, status PATCH
  persistence, atomic proposed-overlap rejection, cross-owner denial, two
  concurrent RPC applies, unaffected outside-range data, and the Gap A embedded
  task/full PATCH response contract. All fixtures were removed and R5 table
  counts returned to zero.
- Fresh verification passed targeted Gap A/Gap B 27/27, shared 32/32, mobile
  216/216, reviewer 290/290, forced root typecheck/lint for 7/7 packages, and
  DB/API builds. Full API is 574/575 with only the documented Windows
  CRLF-sensitive Canvas SQL assertion.

Immediate next task: continue R6 mobile Tasks and Study Schedule integration.

## Phase 5F.2 - Incremental, Resumable Canvas Synchronization

Status: Complete and hosted validated.

- Content and grade jobs expand into database-owned list-page, item-detail,
  announcement, file, assignment, submission, and grade-summary units. Vercel
  Workflow executes one Canvas request per step and resumes from persisted
  units rather than replaying a whole course.
- Atomic connection-scoped claims cap provider work at three concurrent units,
  or two for grade jobs. Ninety-second leases, bounded provider retries,
  durable `Retry-After` scheduling, a 30-minute parent deadline, and same-job
  retry prevent unsafe request races and unbounded work.
- Relational course content promotes atomically. Announcements, files, and
  grades maintain independent health so usable scopes can advance while an
  incomplete scope keeps its last-known-good snapshot.
- Expo Go now shows course and scope health, nullable expanding totals,
  truthful partial completion, Sync again, and Cancel. Synchronization remains
  manual and still requires HTTP 202 acceptance before the app may switch away.
- Private staging is service-only, is removed on success/cancellation, and
  expires after 24 hours for failed jobs. Sanitized job/unit audit records stay
  within the existing 30-day idempotency window.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.

Hosted content produced a safe `partial` outcome when one Canvas list endpoint
was unavailable, while independent announcements advanced and no deletion was
inferred. Grade synchronization returned `unchanged`, idempotent replay reused
the same content job, and explicit cancellation published no result.

Release acceptance debt: perform the three-item physical Expo Go reload,
temporary-network, and cancellation spot-check before the next mobile release.

## Phase 5F.1 - Durable Canvas Synchronization

Status: Complete and hosted validated.

- Course-content and grade synchronization are now separate Supabase-owned
  jobs started through Vercel Workflow after HTTP 202 durable acceptance.
- Job creation is owner-scoped and idempotent. Workflow run IDs, progress,
  retryability, cancellation, bounded attempts, and stale underlying sync
  recovery are persisted without exposing Canvas source or grade content.
- Expo Go persists the creation intent before submission, replays the same key
  if acceptance is lost, stops relying on background JavaScript, and reconciles
  on launch or foreground return. Grade jobs expose Cancel and Retry.
- The user has physically passed OCR and reviewer-generation switch-away tests.
  Agent-led hosted reload recovery, temporary client disconnection, and
  explicit cancellation also pass for the existing extraction/reviewer jobs.
- Release reminder: before the next mobile release, physically spot-check Expo
  Go reload recovery, temporary network loss, and explicit cancellation.
- Hosted Canvas validation passed content sync, grade sync, idempotent replay,
  and explicit cancellation. The temporary validation course selection was
  restored, successful results were persisted before terminal status, and the
  cancelled job published no result.

Phase 5F.2 builds on this completed server-owned acceptance boundary.

## Durable-document Android closeout - Device smoke passed, matrix pending

- Durable processing accepts up to 100 total PDF pages while allowing at most
  40 pages that actually require OCR. Native-text and confirmed blank pages do
  not consume the OCR allowance.
- Synchronous and Canvas extraction retain the existing 40-total-page ceiling.
- Native text is inspected before OCR; an oversized scanned document fails
  safely before provider dispatch, and mobile presents sanitized guidance.
- The EAS preview APK was built and installed on a physical Android device.
  Authentication and hosted V2 API connectivity passed. Those checks do not
  yet prove the durable long-document limits or interruption/reconciliation
  behavior.

Current acceptance task: use the installed preview build to validate the
durable-document matrix on a physical Android device. This is a closeout task,
not Phase 6.

## Product Recovery Phase R6 - Partial

Automated R6 acceptance passed on 2026-07-15, but physical-device acceptance
remains deferred because no controllable physical iPhone Expo Go session was
available to this agent. No product defect was reproduced, no product code was
changed, and the R5 automated/protected gates remain green: Canvas 69/69, OCR
25/25, engine 287/287, API 428/428, mobile 154/154, reviewer web smoke 51/51,
R3/R4/R5 protected validations, PDF OCR web smoke, root lint/typecheck, and
root production build.

Remaining recovery debt: complete Product Recovery Phase R6 on a physical
iPhone with Expo Go before claiming R6 complete.

## Product Recovery Phase R5 — Complete

The Canvas reviewer path now presents authoritative module/item ordering, safe
capability states, explicit file preparation and source checking, exact editable
preview text, existing protected generation, immutable snapshot save, and
stale-state invalidation as one calm staged student journey. Large bounded
inventories can load later pages without mixing changed or duplicate pages.
R1-R4 security, OCR completeness, reviewer grounding, and provider-call gates
remain intact. No database migration was required.

Immediate next task result: Product Recovery Phase R6 automated acceptance is
partial pending physical-device observation.

## Phase 1 - Foundation And Reviewer Engine

Status: Complete

Purpose: Establish the repository foundation and a tested reviewer-generation
engine before product UI and integrations depend on it.

Major deliverables:

- Monorepo foundation
- Stage 0 through Stage 6 pipeline
- OpenAI-compatible provider boundary
- Coverage verification
- Grounding validation
- Leakage protection
- Deterministic evaluations
- Short-prose fallback for OCR-style pasted text

Exit criteria:

- Engine build passes.
- Aggregate deterministic evals pass with 343 cases.
- Default visible reviewer output is source-faithful.
- Unsupported enrichment is excluded from default assembly.

Real-course quality note: Intro to IT Security B4 preserves B3's repaired
course-PDF outline and source-supported definitions, categories, procedures,
and examples. Stage 4/5 now independently verifies those relationships. The
next quality proof is the Firewalls PDF, not additional Intro-specific tuning.

Immediate dependency: None.

## Phase 2 - Authenticated Reviewer Vertical Slice

Status: Complete

Purpose: Prove a real user can sign in, submit source text, call the protected
API, generate with OpenAI, and preview validated reviewer output.

Major deliverables:

- Supabase email/password authentication
- Protected reviewer API route
- Expo reviewer input and preview
- OpenAI-backed generation
- Local Expo Web CORS
- Unattended authenticated browser smoke
- Persistent smoke session and output assertions

Exit criteria:

- `POST /api/reviewer/generate` requires a valid Supabase bearer token.
- Expo reviewer generation screen can submit pasted text and render a preview.
- `npm run smoke:reviewer:web` passes against the local API and Expo Web.
- Immediate repeat and session-only smoke flows are supported.

Immediate dependency: Phase 1 complete.

## Phase 3 - OCR And Source Ingestion

Status: Complete

Purpose: Replace paste-only source intake with a server-side OCR contract that
preserves layout enough for the reviewer engine to stay source-faithful.

Completed in Phase 3A:

- Audit existing source and OCR-related contracts.
- Provider-agnostic OCR boundary.
- Server-only Google Cloud OCR adapter.
- Fake-client OCR tests.
- Protected image OCR API route.
- MIME type and size validation.
- Preserved line, list, and layout boundaries.

Completed in Phase 3B:

- Gallery image selection through Expo Image Picker.
- Selected-image preview and filename display.
- Authenticated upload to `POST /api/ocr/extract`.
- Editable extracted-text review before reviewer generation.
- Manual paste fallback as a separate source mode.
- Deterministic Expo Web OCR smoke using a mocked OCR response and real
  reviewer generation.

Completed in Phase 3C:

- Camera capture through the existing Expo image-picker boundary.
- Captured-image preview and generated filename display.
- Reuse of the authenticated `POST /api/ocr/extract` upload path.
- Editable extracted-text review before reviewer generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision OCR.
- Verified that edited OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live OCR-generated reviewer.

Completed in Phase 3D:

- Synchronous small-batch PDF OCR ingestion for one PDF per request.
- PDF selection through Expo Document Picker.
- Authenticated upload to `POST /api/ocr/extract-pdf`.
- Server-side PDF validation for MIME type, `%PDF-` signature, parseability,
  encrypted/password-protected files, upload size, and 1-5 page count.
- Google Vision `DOCUMENT_TEXT_DETECTION` through synchronous
  `batchAnnotateFiles` with inline PDF bytes and explicit pages.
- Page-ordered normalized text with editable extracted-text review before
  reviewer generation.
- PDFs over five pages are rejected, not silently truncated.
- PDF files stay server-bound; Google credentials remain server-only.
- No Cloud Storage, background jobs, polling, local PDF rasterization, Poppler,
  or Ghostscript in this phase.
- Mocked PDF OCR web smoke using a fictional PDF fixture and real reviewer
  generation.
- Live physical-device validation on iPhone Expo Go with the local Next.js API
  over LAN and server-only Google Cloud Vision PDF OCR.
- Verified that a fictional, image-only, two-page scanned PDF extracted both
  pages in page order.
- Verified that edited PDF OCR text is used as the reviewer source.
- Verified Reviewer Ready, source-faithful, coverage, and clean-output passed
  for the live PDF OCR-generated reviewer.
- Verified that a separate PDF with more than five pages is rejected safely with
  the expected UI messages instead of being silently truncated.

Remaining Phase 3 deliverables:

- None.

Exit criteria:

- A protected OCR API route accepts image input, validates it, invokes the OCR
  provider boundary, and returns typed extracted text without exposing secrets.
- Fake-client tests prove success, error, size, MIME, and layout-preservation
  behavior.
- The reviewer input flow can use user-reviewed extracted text while manual
  paste remains available.
- Live iPhone camera/image OCR validation passes without exposing Google
  credentials to mobile code or committed files.
- Live iPhone PDF OCR validation passes using a fictional 1-2 page scanned PDF,
  editable OCR text, and reviewer generation.

Immediate dependency: Phase 2 complete.

Known limitation: visible repeated headers and footers in scanned PDFs may be
extracted as source text and become reviewer sections. Users can remove them in
the editable OCR text field. Automatic repeated header/footer detection is
deferred to a later OCR cleanup task.

Immediate next task after Phase 3D: Phase 4 Study Library and Persistence.
Phase 4 is complete and live validated; the next product phase is Phase 5
Canvas Integration.

## Phase 4 - Study Library And Persistence

Status: Complete

Purpose: Save generated study content to a user-owned library so reviewers can
be reopened, renamed, and managed across sessions.

Major deliverables:

- Supabase reviewer storage
- User-owned RLS policies
- Source metadata
- Reviewer list
- Open, rename, and delete actions
- Study Library as the saved-content destination

Implemented foundations:

- `reviewers` Supabase migration with owner-scoped RLS policies, timestamps,
  section count, source metadata, and reviewer JSON output.
- Typed reviewer table shapes in `@stay-focused/db`.
- Authenticated Next.js reviewer CRUD API using the caller's bearer token and
  user-scoped Supabase access instead of service-role CRUD.
- Mobile Study Library screen with list, open, rename, delete, refresh, and
  return-to-generator actions.
- Save-to-library action after reviewer generation, preserving editable
  OCR-before-reviewer behavior and storing only safe source metadata.
- Regression-hardened PDF OCR web smoke wait for fast mocked OCR completion.
- Live Supabase verification confirmed the migration is already applied, the
  `public.reviewers` table exists, RLS remains enabled, and owner SELECT,
  INSERT, UPDATE, and DELETE policies use `auth.uid() = user_id`.
- Live cross-user validation used two distinct Supabase auth users. User A
  created, listed, and opened a reviewer; User B's list excluded it and open,
  rename, and delete attempts returned safe `404 reviewer_not_found` responses.
- Reverse isolation was also validated: User B created and listed a reviewer;
  User A could not list or open it; User B deleted it.
- Cleanup removed both fictional validation reviewers through their owning
  users, and follow-up owner-list/open checks confirmed no validation rows
  remained.
- The Next.js reviewer detail route typing fix aligns `[id]` route params with
  the Promise-based App Router context without changing runtime behavior.
- Consolidated physical Android acceptance on realme RMX3151 / Android 13 now
  covers Maker source modes, Canvas selective preview, pinned readiness-gated
  Generate/Save actions, durable Processing, Reader, save/list/reopen, rename,
  native delete Cancel/Confirm, and in-app/hardware Back. Reopen remains a plain
  persisted read with no regeneration.

Exit criteria:

- Authenticated users can save, list, open, rename, and delete their own
  reviewers.
- RLS prevents cross-user access.
- Reviewer metadata preserves enough source context for later study workflows.
- Automated API, mobile, DB typecheck, engine, OCR, and browser smoke
  regression checks pass.
- Live migrated Supabase validation proves save, list, open, rename, delete,
  and cross-user denial against the deployed `reviewers` table.

Immediate dependency: Phase 3 source-ingestion contracts are stable enough to
store source metadata consistently. All Phase 4 external validation gates are
complete.

## Phase 5 - Canvas Synchronization Foundation

Status: Implementation complete through Phase 5F.2. Phase 5E.6 and Product
Recovery R6 acceptance remain partial only for named physical-device checks.
Phase 5A is complete and live validated; Phase 5B.1
academic graph foundation is complete; Phase 5B.2 initial full academic graph
synchronization is complete and live validated; Phase 5B.3A course recovery
hardening is complete and live validated; Phase 5B.3B incremental persistence
is complete and live validated; Phase 5B.3C1 conditional-request capability
audit is complete; Phase 5B.4A planner-item and announcement synchronization
is complete with documented live Canvas limitations; Phase 5C.1 secure file
inventory and bounded ingestion is remotely and live validated with a
documented account-wide synchronous route-duration limitation; Phase 5C.2A1
selected-course synchronization is complete and runtime-safe in local
production-build validation; Phase 5C.2A2 Canvas source selection and reviewer
handoff is complete and live validated; Phase 5C.2B Canvas PDF/image OCR
sources are complete and live validated for preparation, private Storage OCR
preview, edited reviewer handoff, and Study Library cleanup; Phase 5D.1
immutable source snapshots and exact reviewer provenance, Phase 5D.2
structured normalized blocks and selective import, and Phase 5D.3 duplicate
relationships, source freshness, and regeneration readiness are implemented,
remotely verified, and protected-live validated. Phase 5E planning is complete
in `docs/ai/phase5e-grades-submissions-plan-20260708.md`, Phase 5E.1 is
complete in
`docs/ai/phase5e1-grades-submissions-foundation-20260708.md`, and Phase 5E.2
is complete in `docs/ai/phase5e2-canvas-grade-client-20260708.md`. Phase 5E.3
explicit synchronized import is complete and remotely verified, and Phase 5E.4
protected grade APIs are implemented and protected-live validated in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`. Phase 5E.5
mobile assignment and grade experience is complete and locally validated in
`docs/ai/phase5e5-mobile-grade-experience-20260708.md`. Phase 5E.6 and Phase
5F remain planned and must not be collapsed into a single generic Canvas
integration task.

Purpose: Bring Canvas LMS data into Stay Focused as a permission-aware academic
graph that can feed the existing OCR, normalization, provenance, reviewer, and
future schedule/grade-planning boundaries without creating a parallel
generation path.

Immediate dependency: completed Phase 4 persistence and source metadata, plus a
stable source-ingestion contract from Phase 3.

Credential-source boundary: Canvas client, synchronization, and capability
logic must remain independent of whether credentials came from a manually
entered personal access token or a later OAuth flow. The intended model remains
conceptually similar to:

```text
CanvasCredentialProvider
|-- PersonalAccessTokenCredential
`-- OAuthCredential
```

### Phase 5A - Secure Canvas Connection And Capability Discovery

Status: Complete, live validated, and audit-hardened. Direct server-side Canvas
validation, remote Supabase migration/RLS validation, protected API
connect/status/courses/capabilities/disconnect lifecycle, strict encrypted
payload validation, atomic connection/capability persistence, redirect
rejection, and automated two-user authorization tests have passed.

Scope:

- Canvas instance URL
- Canvas personal access token
- API-side credential validation
- AES-256-GCM encrypted credential storage
- Protected connection-status API
- Disconnect support
- Course discovery
- Initial capability registry
- Safe endpoint probes
- User-visible connection and course states

#### Phase 5A Authentication Model

Phase 5A uses user-generated Canvas personal access tokens for development,
capstone demonstrations, controlled testing, and initial user-controlled Canvas
connections. Each Stay Focused user supplies their own personal access token.
There is no shared school-wide token.

Each token is scoped to the Canvas account that generated it and remains subject
to the permissions configured by the institution and course. A token cannot
access school-wide Canvas data, cannot bypass locked, hidden, unpublished, or
permission-restricted content, and must never be shared between Stay Focused
users.

Personal access tokens must be:

- validated before persistence
- encrypted server-side with AES-256-GCM
- stored per Stay Focused user
- excluded from API responses
- excluded from logs and errors
- removable through disconnect
- treated as revocable credentials

Personal access token entry is acceptable for the capstone, development, and
controlled initial deployment, but it is not the preferred permanent
authorization flow for a broad public multi-user release.

Completion criteria:

- A signed-in Stay Focused user can connect Canvas.
- The Canvas profile is validated.
- The token is encrypted before persistence.
- The token is never returned to mobile.
- Courses can be listed.
- Supported and unsupported Canvas capabilities are recorded honestly.

Validation status as of 2026-07-05:

- Direct Canvas HTTPS validation passed through the server-side validation
  script using one developer-owned personal access token from existing ignored
  local credential names.
- Canvas profile returned and normalized successfully.
- Course listing returned 17 courses.
- These results prove only the validating user's available Canvas capabilities;
  they do not prove institution-wide course or endpoint access.
- Live pagination was not exercised because the account did not require a
  second page; automated tests cover ordered pagination and cross-origin
  rejection.
- Enrollments, modules, assignment groups, and planner probes returned
  `available` for that user; capability availability may differ per user,
  course, role, or institution.
- Supabase migration `202607050002_create_canvas_connections.sql` applied
  remotely and read-only checks verified both tables, RLS, and no direct
  `anon`/`authenticated` access to encrypted token columns.
- `CANVAS_TOKEN_ENCRYPTION_KEY` is configured locally as a canonical padded
  Base64 key that decodes to exactly 32 bytes. The helper accepts surrounding
  environment whitespace, rejects malformed or non-canonical key material, and
  validates only when encryption or decryption is used.
- Protected API lifecycle validation passed against `http://localhost:3000`:
  Supabase bearer authentication was acquired for an established smoke-test
  user, `PUT /api/canvas/connection` validated the Canvas profile before
  persistence, 17 courses were returned, 25 capability records were created,
  and connection metadata responses excluded credential fields.
- Encrypted persistence was verified through a server-side database query:
  one connection row existed for the selected user, ciphertext, IV,
  authentication tag, and encryption version were populated, no plaintext PAT
  column was present, ciphertext differed from the submitted PAT, and capability
  rows were scoped to the same user and connection.
- `GET /api/canvas/connection`, `GET /api/canvas/courses`, and
  `GET /api/canvas/capabilities` passed from the stored encrypted credential.
  Capability statuses were `available` and `not_tested`.
- Invalid replacement PAT validation returned the stable token error while
  preserving the existing valid connection.
- `DELETE /api/canvas/connection` removed the selected user's connection and
  dependent capability rows, left saved reviewers unchanged, and final
  connection status returned the disconnected state.
- Automated route tests cover cross-user scoping for connection, courses,
  capabilities, and disconnect behavior. A live second-user validation was not
  run because no separate second test-user credentials were available.
- Phase 5A.2 hardening adds strict canonical Base64 validation for encrypted
  payload fields, the atomic `replace_canvas_connection_with_capabilities` RPC,
  a composite capability ownership foreign key, explicit redirect rejection,
  expanded request validation coverage, and realistic two-user route tests.
- Remote migration `202607050003_harden_canvas_connection_persistence.sql` is
  applied. Read-only checks passed for RPC existence, revoked public execution,
  service-role execution, validated ownership constraint, RLS, and revoked
  direct grants.

### Phase 5B - Academic Graph Synchronization

Status: Complete through Phase 5B.4A. Phase 5B.1 is complete as a database and
typed Canvas API foundation. Phase 5B.2 initial full synchronization is complete as a manual,
synchronous route with atomic per-course persistence. Phase 5B.3A recovery
hardening and Phase 5B.3B deterministic incremental persistence are complete.
Phase 5B.3C1 found no useful 304 support for the currently synchronized
endpoint families, so production conditional fetching remains unsupported.
Phase 5B.4A planner-item and announcement synchronization is complete as a
backend-only extension.

#### Phase 5B.1 - Academic Graph Foundation

Status: Complete and remotely verified.

Implemented:

- Supabase migration `202607050004_create_canvas_academic_graph.sql`.
- Tables: `canvas_courses`, `canvas_modules`, `canvas_module_items`,
  `canvas_pages`, `canvas_assignment_groups`, and `canvas_assignments`.
- Stable Canvas identity constraints for courses, modules, module items, Pages,
  assignment groups, and assignments.
- Composite ownership constraints across `user_id`, `canvas_connection_id`,
  and `course_id`.
- RLS on every academic graph table.
- Direct `anon` and `authenticated` grants revoked to preserve the Phase 5A
  service-role persistence boundary.
- Typed Canvas client methods for courses, modules, module items, Pages, Page
  detail, assignment groups, and assignments.
- Pagination tests for all new collection methods, including later-page
  failures, repeated-link loop protection, and cross-origin next-link
  rejection.

Deferred from Phase 5B.1:

- Full synchronization orchestration
- Scheduled jobs and background workers
- Mobile course screens
- Sync-start API routes
- Announcements, discussions, planner data, quiz metadata, and files/media
  ingestion
- Incremental sync cursors and destructive stale cleanup
- Reviewer generation from Canvas content

Recommended next phase after Phase 5B.3B: Phase 5B.3C - Conditional Canvas
fetching and network-efficiency hardening.

#### Phase 5B.2 - Initial Full Academic Graph Synchronization

Status: Complete, remotely verified, and live validated.

Scope:

- Courses
- Modules
- Ordered module items
- Canvas Pages
- Assignment groups
- Assignments
- Page detail bodies
- Existing assignment quiz metadata fields
- Sync-run history
- Bounded synchronous orchestration
- Per-course atomic replacement
- Stale-child cleanup after complete course snapshots only
- Partial account-sync handling
- Mobile service function without UI

Required source relationships:

```text
Course
|-- Module
|   `-- Module item
|       |-- Page
|       |-- Assignment
|       |-- External URL
|       `-- External tool
|-- Assignment group
`-- Assignment
```

Exit criteria:

- Canvas material is stored as related academic entities, not as a flat file
  list.
- Module order, Page relationships, assignment-group relationships, nullable
  dates, HTML fields, and existing assignment quiz metadata are preserved.
- The authenticated user can manually trigger synchronization through
  `POST /api/canvas/sync`.
- Persistence is atomic per course rather than for the whole Canvas account.
- A partial account sync may commit successful courses while preserving failed
  courses.
- Empty complete snapshots remove stale child rows for that course only.
- Incomplete course fetches and failed RPC calls do not prune existing graphs.
- Repeated full synchronization is idempotent and preserves internal row IDs.
- No background or scheduled synchronization exists yet.
- No mobile synchronization screen exists yet.

Validation:

- Remote migrations `202607050005_add_canvas_academic_sync.sql` and
  `202607050006_fix_canvas_connection_rpc_ambiguity.sql` are applied.
- Remote rollback verification passed through
  `scripts/phase5b2-full-sync-verification.sql`.
- Live protected connection recreation passed through
  `PUT /api/canvas/connection`.
- Two live sync calls returned HTTP 200 with sanitized partial results:
  17 courses discovered, 13 succeeded, 4 failed, 27 modules, 311 module items,
  459 Pages, 18 assignment groups, and 25 assignments.
- The second live sync introduced no duplicates, preserved internal
  identities, kept first-sync timestamps stable, advanced last-sync timestamps,
  and left zero running sync rows.

#### Phase 5B.3A - Course Failure Diagnostics And Recovery Hardening

Status: Complete.

Scope:

- Added migration `202607050007_add_canvas_sync_course_results.sql`.
- Added sanitized per-course sync diagnostics through
  `record_canvas_sync_course_result`.
- Preserved manual synchronous sync and atomic per-course persistence.
- Added operation-specific failure codes and bounded transient retries.
- Preserved course/module-item/Page-detail concurrency limits.
- Confirmed the four previous generic failures are Page-listing
  `resource_not_found` 4xx permanent Canvas limitations, not implementation
  defects.

Validation:

- Remote migration history includes `202607050007`.
- Remote rollback verification passed through
  `scripts/phase5b3a-recovery-verification.sql`.
- Two hardened live sync calls returned HTTP 200 partial results:
  17 courses discovered, 13 succeeded, 4 failed with sanitized
  `canvas_course_pages_failed`, 27 modules, 311 module items, 459 Pages,
  18 assignment groups, and 25 assignments.
- Retry attempts in live validation: 0, because the four failures are
  non-retryable 4xx resource-not-found responses.
- Duplicate identities remained 0, internal identities remained stable, and
  zero sync rows remained running.

#### Phase 5B.3B - Incremental Synchronization Foundation

Status: Complete, remotely verified, and live validated.

Scope:

- Added migration `202607050008_add_canvas_incremental_sync_state.sql`.
- Added `canvas_course_sync_states` with one row per user, Canvas connection,
  and Canvas course identity.
- Added deterministic course-snapshot fingerprints from the normalized
  persistence payload, with version `canvas-course-snapshot-v1`.
- Added `full` and `incremental` sync modes and `unchanged` course results.
- Added service-role-only RPCs for mode-aware run creation, changed-course
  graph replacement plus state advancement, unchanged-course recording, and
  failed-course metadata.
- Preserved the Phase 5A credential boundary and Phase 5B.2 per-course
  atomicity.

Validation:

- Remote migration history includes `202607050008`.
- Remote rollback verification passed through
  `scripts/phase5b3b-incremental-sync-verification.sql`.
- A full live baseline returned HTTP 200 partial with 17 courses discovered,
  13 changed/succeeded, 0 unchanged, 4 Page-listing failures, 13 graph
  replacements, and zero running sync rows.
- Two immediate incremental live runs returned HTTP 200 partial with 13
  unchanged courses, 0 changed courses, 4 Page-listing failures, 0 graph
  replacements for unchanged courses, deterministic fingerprints, stable graph
  timestamps, no duplicate identities, and zero running sync rows.

Deferred from Phase 5B.3B:

- Endpoint-level conditional requests
- ETag and Last-Modified support
- Secondary Canvas resources
- Scheduled/background synchronization
- Mobile synchronization UI
- Reviewer generation from Canvas content

#### Phase 5B.3C - Conditional Canvas Fetching And Network-Efficiency Hardening

Status: Audit complete for Phase 5B.3C1. Production conditional fetching is
not implemented.

Scope:

- Investigate Canvas endpoint support for conditional requests.
- Add ETag or Last-Modified handling only where reliable per endpoint.
- Measure whether request count, bandwidth, or duration improves.
- Preserve deterministic persistence and safe failure behavior from Phase
  5B.3B.
- Avoid claiming delta synchronization where Canvas cannot provide a reliable
  cursor.

Phase 5B.3C1 audit result:

- A local ignored harness audited active course listing, modules, module items,
  Pages, Page details, assignment groups, and assignments using the stored
  encrypted Canvas connection.
- Production sync behavior was unchanged; no sync runs, graph writes,
  validator persistence, raw response caching, or migrations were added.
- ETags were present and stable across all audited endpoint families.
- `Last-Modified` was absent across all audited endpoint families.
- If-None-Match primary conditional requests returned HTTP 200 with full
  bodies for every audited endpoint; no 304 responses were observed.
- Baseline and conditional body bytes were both 154,503, so observed body-byte
  reduction was 0%.
- One paginated Page collection included a later page, confirming that any
  future conditional design would need independent per-page validator and
  pagination state.
- Page-list validators cannot be treated as proof that Page-detail bodies are
  unchanged.
- Module lists, module-item lists, assignment groups, and assignments require
  separate state if future evidence ever supports conditional requests.
- The four known Page-listing failures remained
  `canvas_course_pages_failed`, `resource_not_found`, non-retryable, not 304,
  and did not advance graph or fingerprint state.

Decision:

- Outcome C: no useful validator support was observed.
- Do not implement Phase 5B.3C2 for the currently synchronized endpoint
  families.
- Continue ordinary GET behavior for courses, modules, module items, Pages,
  Page details, assignment groups, and assignments.
- Do not invent validators and do not skip requests based only on
  course-level fingerprint state.

#### Phase 5B.4 - Secondary Canvas Resource Synchronization

Status: Phase 5B.4A complete, remotely verified, and live validated with
documented permanent Canvas limitations.

Scope:

- Select each secondary Canvas resource family only after explicit product and
  security review.
- Continue using the per-user credential boundary, service-role persistence,
  sanitized diagnostics, and failure-preservation rules established in Phase
  5A through Phase 5B.3C1.
- Keep production conditional fetching out unless future evidence shows
  reliable 304 behavior.
- Continue not treating Page-listing 404 failures as successful empty-Page
  collections.

##### Phase 5B.4A - Planner Items And Announcements

Status: Complete, remotely verified, and live validated with a documented
partial result.

Scope:

- Canvas planner-item retrieval through `GET /api/v1/planner/items`.
- Canvas announcement retrieval through per-course
  `GET /api/v1/announcements` calls.
- A deterministic rolling sync window: 30 days in the past and 120 days in the
  future, captured from one run timestamp.
- Typed Canvas client methods, repeated `context_codes[]` query serialization,
  ordinary authenticated GET behavior, trusted pagination, redirect rejection,
  and bounded transient retry behavior.
- Normalized planner and announcement payloads with deterministic source
  fingerprints and without unrestricted nested Canvas payload retention.
- Tables `canvas_planner_items` and `canvas_announcements`.
- Service-role-only snapshot RPCs for planner and per-course announcement
  persistence.
- Insert/update/unchanged/pruned accounting and safe scoped pruning only after
  a complete authoritative snapshot is fetched.
- Aggregate-only route summaries and mobile service parsing without UI.

Validation:

- Remote migrations `202607060001` and `202607060002` are applied.
- Remote rollback verification passed through
  `scripts/phase5b4a-planner-announcements-verification.sql`.
- Protected live validation used the existing encrypted Canvas connection.
  The first run returned HTTP 200 `partial`, discovered 37 planner items and
  27 announcements, inserted 37 planner items and 19 announcements, preserved
  four known Page-listing limitations, and left zero running sync rows.
- The second run returned HTTP 200 `partial`, classified 37 planner items and
  19 announcements as unchanged, preserved stable identities, produced zero
  duplicates, zero unnecessary updates, zero unexpected pruning, stable failure
  categories, and zero running sync rows.
- The four known Page-listing failures remain non-retryable
  `canvas_course_pages_failed` `resource_not_found` 4xx limitations.
- Four announcement persistence scopes remain partial for the same unavailable
  course graphs and are reported as sanitized
  `canvas_announcement_persistence_failed` diagnostics without pruning.

Deferred from Phase 5B.4A:

- Discussion entries, discussion replies, and general discussion-topic
  synchronization.
- Quiz details and quiz-question metadata.
- Planner-note creation, planner-note editing, and planner-override mutation.
- Submission, grade, rubric, and feedback synchronization.
- File, attachment, announcement-attachment, and media ingestion.
- Canvas webhooks, scheduled synchronization, background jobs, resumable jobs,
  queues, mobile synchronization UI, source-selection UI, notifications, and
  reviewer generation from Canvas data.

### Phase 5C - File, Attachment, And Media Ingestion

Status: Complete through Phase 5C.2B. Phase 5C.1 secure file inventory and
bounded selected-file ingestion is remotely and live validated for backend behavior, private Storage,
and second-run stability. The account-wide synchronous metadata sync route
remains over its configured runtime budget in local production-build
measurement, so deployed production-runtime readiness is not claimed for that
diagnostic route. Phase 5C.2A1 selected-course synchronization is complete,
uses independent course-scoped requests, and stayed within the 60-second
per-course budget in protected live validation. Phase 5C.2A2 Canvas source
selection and reviewer handoff is complete and live validated. Phase 5C.2B
Canvas PDF/image OCR sources are complete and live validated for preparation,
private Storage OCR preview, edited reviewer handoff, and Study Library
cleanup. Phase 5D.1 immutable source snapshots, Phase 5D.2 structured
normalized blocks, and Phase 5D.3 duplicate relationships, source freshness,
and regeneration readiness are implemented, remotely verified, and
protected-live validated. The historical Phase 5E next-step text is superseded:
Phase 5E.1 through 5E.5 are implemented, and Phase 5E.6 remains partial only
for physical-device acceptance.

#### Phase 5C.1 - Secure File Inventory And Bounded Ingestion Foundation

Status: Remotely and live validated for backend behavior; production-runtime
safe status is partial because the synchronous sync route exceeds its
configured 60-second budget.

Implemented:

- Canvas file metadata listing and single-file metadata lookup in
  `@stay-focused/canvas`.
- Bounded Canvas file download support with manual redirect handling,
  off-origin bearer stripping, unsafe host rejection, timeout enforcement, and
  content-length/stream byte caps.
- Central file policy shared with existing OCR limits: 10 MiB per file, 3 files
  per ingestion request, and 15 MiB aggregate stored bytes per ingestion
  request.
- Metadata-only or blocked classification for media, unsupported formats,
  dangerous MIME/extension combinations, archives/containers, locked files,
  hidden files, unavailable files, and oversized files.
- `canvas_files`, `canvas_file_references`, and
  `canvas_file_ingestion_results` migration foundation.
- Private Supabase Storage bucket `canvas-source-files` with restrictive
  policies denying direct `anon` and `authenticated` object access.
- Service-role-only RPCs for file inventory replacement and sanitized ingestion
  result recording.
- `POST /api/canvas/sync` file inventory for successful course graphs, with
  module-item references and Canvas file links discovered from Page,
  assignment, and announcement HTML.
- `POST /api/canvas/files/ingest` for authenticated selected file-row ids,
  fresh metadata lookup before download, content signature validation, private
  storage upload, stale-object cleanup, and sanitized per-file terminal
  results.
- Mobile sync response parsing for aggregate `files` and `fileReferences`
  counts without adding UI.
- Remote migrations `202607060003` and `202607060004` are applied.
- Supabase security and performance advisors were reviewed; new Phase 5C.1
  foreign-key index warnings were fixed by `202607060004`.
- Private Storage access controls passed: public, anonymous, authenticated
  arbitrary, and cross-user object access were denied while trusted server
  access worked.
- Protected live ingestion stored two eligible selected files, recorded one
  metadata-only result, and preserved stable object pointers on the second
  ingestion with zero additional bytes stored.
- Protected live metadata sync remained aggregate-only and metadata-only for
  files, but measured 72.294 seconds and 65.355 seconds in local
  production-build validation against `maxDuration = 60`.

Still deferred from Phase 5C.1:

- Text extraction from Canvas files.
- OCR over Canvas files.
- Parser registry and parser-version tracking.
- PowerPoint, Word, spreadsheet, HTML, caption, and media parsers.
- Mobile file-selection, source-preview, and selective-import UI.
- Reviewer generation from Canvas file contents.
- Background/resumable ingestion jobs.

Verification:

- Canvas package tests: 50/50.
- API tests: 184/184.
- Mobile tests: 79/79.
- OCR tests: 14/14.
- Root typecheck/build/tests: 7/7 workspaces.

#### Phase 5C.2A1 - Course Selection And Runtime-Safe Canvas Synchronization

Status: Complete. Remotely verified and protected-live validated.

Implemented:

- `GET /api/canvas/courses` now returns a Canvas course inventory with
  metadata-based presentation categories: likely current, past or concluded,
  other or uncertain, and unavailable.
- Course names are display data only, not authoritative exclusion rules.
- `canvas_course_sync_preferences` stores selected-course choices separately
  from the course inventory with stable identities, composite ownership,
  RLS, revoked direct client grants, and service-role-only RPCs.
- Deselecting a course disables future normal selected-course synchronization
  but does not delete synchronized graph data, file metadata, stored objects,
  or sync history.
- `POST /api/canvas/courses/:courseId/sync` synchronizes one selected internal
  course row through the existing shared course synchronization path.
- Course-scoped sync covers course-owned graph data, announcements, file
  metadata, and file references, but intentionally excludes user-wide planner
  synchronization.
- Normal mobile synchronization uses selected course IDs and a maximum
  concurrency of two independent course-scoped requests.
- Per-course mobile status distinguishes unsaved selection changes, running,
  success, partial, failed, deselected, and unavailable states.
- Academic-unit synchronization limit: none.

Validation:

- Remote migration `20260706113150` is applied and rollback-safe SQL
  verification passed.
- Supabase security and performance advisors produced no new Phase 5C.2A1
  findings.
- Protected live inventory returned 76 course shells: 15 likely current,
  59 past or concluded, 2 other or uncertain, and 0 unavailable.
- Two likely-current courses were selected, persisted, restored after reload,
  synchronized independently, deselected, and reselected without duplicate
  identities or destructive cleanup.
- First selected-course sync durations were 6.052 seconds and 8.492 seconds.
  Second selected-course sync durations were 5.833 seconds and 7.849 seconds.
- The account-wide route was not called by the normal selected-course mobile
  flow.

Still deferred from Phase 5C.2A1:
- Parser/OCR expansion for Canvas file contents.
- Background, scheduled, resumable, or queued synchronization.
- Canvas OAuth and broader Canvas resource families.

#### Phase 5C.2A2 - Canvas Source Selection And Reviewer Handoff

Status: Complete and protected-live validated.

Implemented:

- Protected `GET /api/canvas/courses/:courseId/sources` for selected,
  synchronized, owned internal course rows.
- Source descriptors over existing synchronized Canvas tables for Pages,
  assignment descriptions, announcements, and unavailable file metadata.
- Safe course freshness summary with terminal sync status, completed timestamp,
  partial flag, sanitized failure categories, and synchronized-source
  availability.
- Deterministic descriptor ordering: available first, then Page, Assignment,
  Announcement, File, then sanitized title and internal id.
- Bounded source listing with pagination-ready metadata.
- Protected `POST /api/canvas/courses/:courseId/sources/preview` that validates
  ordered internal source ids, rejects duplicates, cross-course ids, unknown
  ids, unavailable files, unsupported types, and over-limit selections.
- Server-side `parse5` HTML-to-text normalization preserving readable
  structure while removing hidden/executable content, URLs, signed parameters,
  bearer tokens, and token-like strings.
- Preview limits that fit inside the existing reviewer request limit:
  8 sources, 20,000 characters per source, 90,000 combined preview characters,
  120-character suggested title, and 100,000-character reviewer request limit.
- Mobile `Create reviewer from Canvas` entry point for saved selected courses
  with terminal sync history.
- Mobile source picker sections for Pages, Assignments, Announcements, and
  Files, with unavailable files disabled.
- Editable Canvas preview text and title before generation.
- Existing reviewer-generation API reuse with only `sourceText` and
  `sourceTitle`.
- Existing Study Library save flow reuse with minimal `sourceMode: "canvas"`
  metadata.
- No migration, no new reviewer engine, no file parsing/OCR, no automatic sync,
  and no full persistent provenance table.

Exit criteria:

- Canvas provides visible student value in mobile before more Canvas resource
  families are added.
- Partial sync failures are understandable without exposing raw Canvas errors,
  course names, filenames, URLs, object keys, hashes, or private content.
- Reviewer generation still receives user-reviewed source text through the
  existing generation boundary.

Validation:

- API source service tests passed with 11/11 cases, covering normalization,
  limits, selected-course lookup, unavailable files, duplicate rejection,
  cross-course rejection, and no token-column selection.
- API route tests for source list and preview passed with 10/10 cases.
- Mobile Canvas API service tests passed with 22/22 Canvas source cases.
- Package verification passed for Canvas, DB, API, mobile, engine, and OCR.
- Protected live validation used opaque `live-course-1` and aggregate-only
  output: 49 descriptors, 36 available Pages, 2 unavailable Pages, 11 available
  announcements, 0 available assignments, no source bodies in listing, ordered
  two-source preview with 3,467 characters, deterministic assembly, empty-source
  rejection, cross-course rejection, no URLs or credentials, and no
  Canvas/Storage/OCR/OpenAI calls during preview.
- Reviewer-generation smoke reused the existing reviewer API, returned HTTP
  200, generated 2 sections, saved to Study Library, verified list visibility,
  and deleted the smoke reviewer.
- Expo Web UI smoke selected two Canvas sources, loaded preview, edited source
  text and title, returned to source selection with selection preserved, and
  reloaded preview.

Still deferred from Phase 5C.2A2 and completed by Phase 5C.2B:

- Canvas PDF extraction.
- Canvas image OCR.

Still deferred after Phase 5C.2B:

- Office parsing.
- audio/video transcription.
- full persistent Canvas source provenance.
- background, scheduled, resumable, or queued synchronization.
- tasks and schedule generation.
- Canvas OAuth.
- broader Canvas resource support.

#### Phase 5C.2B - Canvas PDF And Image Extraction/OCR Integration

Status: Complete and protected-live validated.

Implemented:

- Safe Canvas file-state descriptors for ready, not prepared, failed,
  blocked, unsupported, and unavailable files without returning Storage fields,
  Canvas URLs, hashes, raw MIME internals, or credentials.
- Course-scoped `POST /api/canvas/courses/:courseId/sources/prepare` that
  accepts only owned `file:<internal-row-id>` descriptors and delegates to the
  existing `ingestCanvasFiles` boundary.
- Shared API-side OCR validation/extraction helpers reused by manual image/PDF
  OCR routes and Canvas stored-file extraction.
- Stored-file extraction from server-resolved owned rows only, with private
  bucket, object-key shape, byte count, SHA-256, MIME/signature, PDF
  parseability, encrypted-PDF, and page-limit validation before OCR.
- Source preview support for one OCR-backed PDF/image file mixed with Pages,
  assignment descriptions, and announcements while preserving submitted picker
  order.
- Mobile source-picker prepare/ready/failed/unsupported states, one-file
  selection guard, and honest extraction loading copy.
- No extracted-text persistence, no Canvas call or PAT decryption during
  preview, no signed URLs or raw bytes returned to mobile, and no Canvas
  metadata sent to OpenAI.

Validation:

- Canvas package typecheck/build/tests: 52/52.
- DB package typecheck: passed.
- OCR package typecheck/build/tests: 14/14.
- API typecheck/build/tests: 269/269.
- Mobile typecheck/tests: 92/92.
- Engine typecheck/build/evals: 266/266.
- Root Turbo typecheck/build: 7/7 tasks, 5 cached and 2 fresh.
- Workspace tests: API 269/269, mobile 92/92, Canvas 52/52, OCR 14/14.
- Protected live validation checked 2 selected synchronized courses, found 0
  eligible PDFs and 2 eligible images, prepared opaque `live-file-1`, reran
  preparation idempotently, previewed Page -> Image -> Announcement with 1
  OCR-backed source and 62 extracted image characters, returned no private
  Storage or credential fields, generated and saved a reviewer from harmless
  edited text, verified Study Library visibility, and deleted the validation
  reviewer. An exploratory generation attempt including the very short/noisy
  live OCR preview text returned the existing `reviewer_validation_failed`
  response.

#### Later Phase 5C Parser And Source Import Work

Scope:

- PDF with embedded text
- Scanned PDF through the existing OCR boundary
- PowerPoint `.ppt` and `.pptx`
- Word `.doc` and `.docx`
- Images
- Plain text
- HTML
- Supported spreadsheet text
- Assignment attachments
- Discussion attachments
- Announcement attachments
- Canvas-hosted media captions when available
- Unsupported format handling
- File-size and page-count limits
- Parser registry
- Partial-failure reporting

Required ingestion flow:

```text
Canvas discovery
-> metadata record
-> authorized file download
-> MIME and extension detection
-> parser or OCR selection
-> structured text extraction
-> normalized source blocks
-> editable preview
-> confirmed import
-> reviewer generation
```

Exit criteria:

- Canvas file discovery does not bypass the existing OCR, normalization,
  grounding, or reviewer validation boundaries.
- Unsupported files and partial failures are visible without blocking unrelated
  synchronized records.

### Phase 5D - Source Normalization, Provenance, And Selective Import

Status: Complete through Phase 5D.3 and protected-live validated for Phase
5D.1 through Phase 5D.3 on 2026-07-08. Phase 5D.1 is implemented and remotely
verified as the immutable source-snapshot and exact reviewer-provenance
foundation. Phase 5D.2 is implemented and remotely verified as the structured
normalized-block and selective-import slice. Phase 5D.3 is implemented as
duplicate relationships, source freshness, and regeneration readiness without
actual regeneration. Remote Phase 5D.3 verification passed with migrations
`202607080001_add_canvas_source_relationships_freshness.sql` and
`202607080002_harden_source_relationship_grants.sql`, plus 18/18 rollback-safe
SQL verifier checks; protected live validation passed with aggregate opaque
output only; remaining Supabase advisor warnings are historical.

Subphases:

- Phase 5D.1 - Immutable Source Snapshots And Exact Reviewer Provenance:
  private preview sessions, exact edited source snapshots, ordered snapshot
  items, parser/OCR version identifiers, database-enforced reviewer ownership
  linkage, safe detail summaries, no historical reviewer backfill, and no
  provenance sent to OpenAI.
- Phase 5D.2 - Structured Normalized Blocks And Selective Import:
  private short-lived structure sessions, heading/list/table/OCR block models,
  page ordering where available, safe public block selectors, bounded
  user-selectable blocks before generation, selected-block preview manifests,
  immutable snapshot block provenance, and no provenance sent to OpenAI.
- Phase 5D.3 - Duplicate Relationships, Source Freshness, And Regeneration
  Readiness: same-source and exact-content duplicate detection, repeated Canvas
  reference summaries, immutable relationship provenance, protected
  current-versus-snapshot source-status checks, conservative
  missing-after-sync semantics, unsupported-source reporting, and readiness
  assessment without actual regeneration.

Scope:

- Structure preservation
- Headings
- Bullet hierarchy
- Tables
- Pages
- Slide numbers
- Module order
- Source snapshots
- Source versions
- Content hashes
- Parser versions
- OCR versions
- Selective import
- Editable source preview
- Deduplication
- Repeated-source relationships
- Stale-source handling
- Deleted-source handling
- Unsupported-source reporting

Every normalized source must preserve provenance such as:

```text
Stay Focused user ID
Canvas connection ID
Canvas course ID
Canvas module ID
Canvas module-item ID
Canvas source-object ID
source type
source title
file name
MIME type
page or slide number
Canvas URL
Canvas updated timestamp
local synchronized timestamp
content hash
parser version
OCR version
```

Exit criteria:

- A reviewer remains linked to the exact source snapshot used during
  generation. Phase 5D.1 satisfies this foundation for the current Canvas
  reviewer path.
- Users can preview and selectively import source material before it reaches the
  reviewer engine. Phase 5D.2 satisfies this for the current Canvas reviewer
  path using server-held block manifests and selected-block snapshots.
- Saved Canvas reviewers can be checked against current synchronized source
  state with conservative current/changed/unavailable/unsupported/missing/unknown
  results and a regeneration-readiness summary. Phase 5D.3 satisfies this as
  assessment only; actual reviewer regeneration remains out of scope.

### Phase 5E - Grades, Submissions, Rubrics, And Feedback Foundation

Status: Implemented through Phase 5E.5. Phase 5E.6 automated, protected API,
and Expo Web validation is complete; physical iPhone acceptance remains
partial. The implementation-ready plan is recorded in
`docs/ai/phase5e-grades-submissions-plan-20260708.md`. Phase 5E.1 is complete
in `docs/ai/phase5e1-grades-submissions-foundation-20260708.md`: database
tables, normalized data contracts, DB types, remote migration verification, and
rollback-safe SQL verification are done. Phase 5E.2 is complete in
`docs/ai/phase5e2-canvas-grade-client-20260708.md`: typed read-only Canvas
client methods, normalized assignment/submission/course-grade provider
contracts, explicit visibility wrappers, pagination/error coverage, and
unsafe-field discards are done. Phase 5E.3 is implemented and locally validated
in
`docs/ai/phase5e3-explicit-grade-sync-20260708.md`: an internal explicit
service can synchronize one owned selected course into the Phase 5E.1
assignment/submission and visible-summary tables with service-role-only RPCs,
deterministic fingerprints, sync-state transitions, and failed-family
preservation. Remote Supabase verification is complete: migrations
`202607080005_add_canvas_grade_sync_rpcs.sql` and
`202607080006_harden_canvas_grade_sync_rpc_function_references.sql` are applied
remotely, RPC execution is service-role-only, RLS/direct grants remain
hardened, the rollback-safe verifier passed 17/17 checks, and no fictional rows
remain. Phase 5E.4 is implemented in
`docs/ai/phase5e4-protected-grade-api-20260708.md`: protected API routes now
allow explicit selected-course grade sync, paginated assignment/submission
list, assignment detail, Canvas-provided visible course summary, and sync-status
reads. The sync route delegates to Phase 5E.3; all GET routes are database-only
and return `Cache-Control: no-store`. Phase 5E.5 is complete and locally
validated in `docs/ai/phase5e5-mobile-grade-experience-20260708.md`: mobile now
adds selected-course `Grades` entry points, strict grade API client parsers,
GET-only initial loading and reload behavior, explicit per-course grade sync,
course summary display, assignment pagination, safe assignment detail loading,
status presentation, stale/partial/failed copy, and in-memory-only
network-failure preservation. Synchronization is manual and per selected course
only, Canvas access remains read-only, and no background job, notification,
durable grade cache, local grade calculation, submission write, private
submission-content storage, or reviewer prompt integration exists.
Phase 5E.6 is partial in
`docs/ai/phase5e6-mobile-grade-protected-live-validation-20260708.md`:
automated baseline checks, protected API preflight, Expo Web protected smoke,
session-only smoke, controlled fictional edge validation, authorization
regression checks, and privacy scans passed. Physical iPhone Expo Go validation
remains required before Phase 5E.6 and Phase 5E can be marked complete.
Phase 5E.4 protected live validation is complete in
`docs/ai/phase5e4-protected-grade-api-live-validation-20260708.md`; the closeout
fixed the sync route course-scope preflight so unknown valid course UUIDs return
safe `404` and owned but unselected courses return safe `400` before Canvas
synchronization.

MVP boundary:

- Strictly read-only selected-course assignment, submission, and visible grade
  state.
- Explicit per-course synchronization only; Canvas calls happen only in the
  sync route.
- DB-only mobile read routes over synchronized state.
- Canvas-provided visible course grade summaries only when returned by Canvas.
- No unofficial local grade calculation or weighted estimate.
- No notification delivery, background jobs, cron, queues, submission writes,
  uploads, comments, grade edits, or reviewer prompt use.

Scope:

- Visible current course score
- Visible final course score
- Displayed grades
- Assignment groups
- Assignment-group weights
- Drop rules
- Grading periods
- Assignments
- Points possible
- Grading type
- Submission scores
- Submission state
- Attempt number
- Missing state
- Late state
- Excused state
- Omitted-from-final-grade state
- Rubric definitions
- Rubric assessments
- Instructor comments
- Feedback attachments
- Learning outcomes when permitted
- Grade snapshots
- Canvas hidden-grade behavior

MVP subphases:

- Phase 5E.1 - Data contract and database foundation (complete)
- Phase 5E.2 - Canvas assignment/submission client support (complete)
- Phase 5E.3 - Explicit synchronized import (complete and remotely verified)
- Phase 5E.4 - Protected API read model (complete and live validated)
- Phase 5E.5 - Mobile assignment and grade experience (complete and locally validated)
- Phase 5E.6 - Protected live validation and hardening (automated/protected
  validation complete; physical iPhone acceptance pending)

Roadmap result: Phase 5E.6 - partial for physical-device acceptance only.
Product Recovery Phases R1, R2, and
R3 are complete and documented in
`docs/ai/product-recovery-r1-v1-audit-20260713.md`,
`docs/ai/product-recovery-r2-reviewer-reliability-20260713.md`, and
`docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.

Historical next step at that checkpoint was Product Recovery Phase R4; R4 and
R5 are now complete and R6 remains partial.

Exit criteria:

- Grade and submission records remain separate from reviewer source content.
- Grades never automatically enter reviewer-generation prompts.
- Hidden or incomplete Canvas grading information is represented honestly.
- Phase 5E.1 through Phase 5E.5 are complete. Phase 5E.6 automated,
  protected API, and Expo Web validation passed; physical iPhone Expo Go
  validation remains before Phase 5E can be marked complete.

## Product Recovery

Status: Partial. Phases R1 through R5 are complete; R6 automated acceptance is
complete and its physical-device matrix remains open.

Product Recovery Phase R5 - Complete.

Purpose: Restore practical student usefulness while preserving the stronger V2
architecture. V1 is the behavioral benchmark; V2 is the security,
maintainability, privacy, and mobile architecture benchmark.

Phase R1 result:

- Completed `docs/ai/product-recovery-r1-v1-audit-20260713.md`.
- Located and inspected the V1 repository without modifying it.
- Compared V1 and V2 reviewer generation, OCR, Canvas source resolution,
  mobile workflow, security, and maintainability behavior.
- Identified V2 safeguards that must remain: authentication, RLS, encrypted
  Canvas credentials, server-only OCR/OpenAI credentials, protected Canvas APIs,
  private source snapshots, provenance, strict parsers, grade/reviewer
  separation, and privacy-preserving validation docs.
- Identified product restrictions that are blocking usefulness: the five-page
  OCR ceiling, incomplete page coverage handling, all-or-nothing reviewer
  assembly, narrow Canvas source eligibility, ambiguous sync/capability copy,
  and a workflow that exposes too many implementation gates to students.

Phase R3 result:

- Completed `docs/ai/product-recovery-r3-full-document-ocr-20260713.md`.
- Centralized the synchronous five-page PDF limit and documented the Google
  Vision `files:annotate` constraint behind it.
- Added one authoritative verifier for expected count, exact unique page
  coverage, range, terminal states, explicit blank pages, deterministic order,
  and source eligibility.
- Gated manual and Canvas-backed OCR so incomplete extraction returns safe
  diagnostics and cannot reach reviewer generation.
- Preserved R2 at 287/287 engine evaluations and protected-live validated all
  five accepted pages with coverage, grounding, and leakage passing.

Phase R4 result:

- Enforced one authoritative `usable`, `empty`, `unsupported`, `inaccessible`,
  or `failed` Canvas content boundary.
- Kept metadata and incomplete OCR out of reviewer text and added current-row,
  selection, fingerprint, and preview-session generation gates.

Phase R5 result:

- Recovered the selected-course student journey with authoritative ordering,
  safe capability states, explicit preparation/checking, exact editable
  preview, existing reviewer generation, and snapshot-bound save.
- Added continuous bounded source pagination, complete stale-state clearing,
  duplicate-request prevention, accessible progress, and the parchment/gold
  flat-content visual hierarchy.
- Protected R5 validation passed live generation/save/cleanup and stored-file
  resolution; unsupported, inaccessible, and stale scenarios made zero
  reviewer calls.

Recovery roadmap:

- Phase R2 - Reviewer reliability and fallback redesign (complete; 287/287 engine evals and protected Canvas HTTP 200 with validated limited fallback output).
- Phase R3 - Full-document OCR with page completeness (complete; exact page coverage enforced, OCR 25/25, API 391/391, mobile 130/130, protected five-page extraction 5/5 with reviewer validation passing).
- Phase R4 - Canvas usable-content resolution (complete; typed terminal states, exact content-only normalization, current fingerprint gate, and zero reviewer calls for non-usable sources).
- Phase R5 - Simplified student workflow (complete; module ordering, safe capability presentation, staged single-source preview/generation/save, pagination, stale invalidation, and protected end-to-end validation).
- Phase R6 - Real-device product acceptance (partial; automated checks pass,
  physical iPhone checks remain).

Remaining recovery task: Phase R6 physical iPhone acceptance.

Historical note: Phase 5F was pending when this recovery roadmap was written.
Phase 5F.1 and 5F.2 are now complete and hosted validated as recorded at the
top of this roadmap.

### Phase 5F - Incremental And Resilient Synchronization

Status: Complete through Phase 5F.2 and hosted validated. The original scope
below is retained as the planning record; physical release spot-checks remain
acceptance debt rather than implementation work.

Scope:

- Incremental updates
- Canvas `updated_at` handling
- Content hashing
- Idempotent upserts
- Per-course checkpoints
- Per-item sync status
- Resumable synchronization
- Pagination
- Low-concurrency queues
- Retry behavior
- `429` handling
- Retry-after handling
- Stale records
- Deleted Canvas objects
- Locked or unpublished objects
- Partial failures
- Synchronization history
- Background synchronization
- User-visible sync health

Supported item states:

```text
discovered
synced
metadata_only
locked
unpublished
permission_denied
external
unsupported_format
download_failed
parse_failed
ocr_failed
stale
deleted_from_canvas
temporarily_failed
```

Exit criteria:

- Synchronization is idempotent, resumable, low-concurrency, and transparent
  about partial failures.
- Users can see sync health without seeing raw Canvas errors or secret data.

### Future Phase - Canvas OAuth Production Authorization

Status: Future. Not implemented.

Purpose: Replace or supplement manual personal access token entry with the
intended production authorization path for broad multi-user Canvas deployment.

Scope:

- institution-approved Canvas Developer Key
- OAuth authorization redirect
- Canvas authorization-code exchange
- per-user OAuth access tokens
- refresh-token handling where supported
- token refresh and expiration
- encrypted server-side token storage
- connection revocation
- OAuth state validation
- redirect URI validation
- migration from manually entered PAT connections
- institution-specific configuration
- capability revalidation after OAuth connection

Stay Focused does not currently possess a Canvas Developer Key. A Developer Key
is controlled by the Canvas institution or administrator, so OAuth cannot be
fully implemented for the school instance until such a key is approved.

OAuth is required before presenting the Canvas integration as a broadly
deployable public production authorization system. Phase 5A personal access
token support remains useful as a capstone and controlled deployment path, but
OAuth is not merely an optional hardening step.

### Future Phase - Grade Goal Planner

Status: Future.

Grade Goal Planner - Allow students to set a desired course grade, such as
90%, and calculate what scores they need on remaining activities using
synchronized Canvas grades, assignment weights, points, submissions, grading
rules, and editable manual assumptions.

Future planner requirements:

- Target-grade input
- Total-points courses
- Weighted assignment-group courses
- Grading periods
- Dropped-score rules
- Excused assignments
- Omitted assignments
- Extra credit
- Hypothetical scores
- Minimum required score
- Feasibility detection
- Best-case projection
- Worst-case projection
- "What happens if" scenarios
- Highest-impact remaining activity
- Manual correction when Canvas data is incomplete
- Confidence labels
- Optional Canvas What-If Grades verification when supported

Authorization relationship: the planner must consume only grade and assignment
data visible through the connected user's own Canvas credentials, whether the
credential source is the current per-user PAT model or the future OAuth model.
It must not require or assume a school-wide Canvas credential.

Required confidence states:

```ts
type GradeProjectionConfidence =
  | "exact_from_visible_canvas_rules"
  | "verified_with_canvas_what_if"
  | "estimated_from_visible_data"
  | "manual_configuration_required"
  | "insufficient_data";
```

Future grade projections must not be described as exact when grading
information is incomplete or hidden.

### Future Phase - Student Intelligence Features

Status: Future.

Later roadmap group:

- Missing-work recovery plans
- Announcement digests
- Deadline-conflict detection
- Professor-feedback summaries
- Rubric weakness detection
- Outcome-based study planning
- Course-progress dashboards
- Transcript-based reviewers
- Searchable lecture captions
- Offline course packs
- Course-wide semantic search
- Recently viewed material
- "Continue where you left off"

Permission-dependent features must be marked honestly. Successful Canvas course
access does not imply access to inbox messages, recent history, captions,
quiz questions, grades, outcomes, or external-tool content.

## Phase 6 - Tasks And Study Schedules

Status: In progress; route foundation and replanning backend are hosted
accepted, with task/schedule mobile surfaces remaining.

Purpose: Expand from reviewer generation into schedule-first planning and
actionable study sessions.

Major deliverables:

- Task generation
- Due-date awareness
- Schedule generation
- Calendar-first planning
- Canvas deadline integration
- Actionable study sessions

Exit criteria:

- Source material and deadlines can produce user-actionable tasks.
- Generated study sessions fit into schedule-first planning.
- Canvas deadlines can inform task and schedule generation when Canvas is
  connected.

Immediate dependency: Phase 5 Canvas integration and Phase 4 saved content.

## Phase 7 - Polish, Deployment, And Capstone Validation

Status: Pending

Purpose: Validate the app as a polished, deployable capstone product rather
than only a local development slice.

Major deliverables:

- Completed mobile OAuth flows
- Deployed API validation
- Accessibility
- Navigation and UI polish
- Performance testing
- User testing
- Capstone evidence
- Production readiness

Exit criteria:

- Production deployment is validated with safe environment separation.
- Mobile auth flows are complete, including OAuth redirects if kept in scope.
- Accessibility, performance, and user-testing evidence are documented.
- Capstone evidence reflects the implemented product accurately.

Immediate dependency: Phases 3 through 6 complete enough to validate an end-to-end
student workflow.



## W2 mobile parity main integration (2026-10-11)

Owner requested main publication. W1/W2 website already exists on remote
main `7ef5a61`; W2 mobile patches now integrate as `f308faf`, `55b7cd0`,
`815631d`, `dc018c8`, retaining main's newer task refresh. **FRESH PASS:**
web typecheck/lint/82 tests and mobile typecheck/lint/793 tests, with four
existing lint warnings. Existing integration and parity documentation both
survive conflict resolution. Normal push targets `origin/main`; no manual
deployment or force push. Unrelated dirty work remains intact. Next: owner
laptop/fullscreen review; other feature scopes remain separately scheduled.

## W2 mobile parity and fresh acceptance (2026-10-11)

**PASS locally, including physical Android acceptance.** Website W2 remains
verified (fresh typecheck/lint, 79 tests, 25 page/viewport checks). STEP 7 is
complete on `b25-3-3-ai-first`: grouped Canvas spaces, growing/keyboard-aware
draft fields, and light/dark clear-day illustrations with reduced-motion
handling. Mobile implementation tip `9ec9fa1`; fresh typecheck/lint and 791
tests pass, with four existing lint warnings. Physical RMX3151 checks used an
isolated local debug package and fictional fixtures; production/real-account
mobile flows were not tested. Original device settings restored. The appended
W2 handoff records evidence and adaptations; dirty mobile docs/design files
were preserved. No push/deployment. Next: owner laptop/fullscreen review,
then separately scheduled content-estimate, grade-estimator and sync work.

## W1/W2 main integration (2026-10-11)

Owner-authorized release: merge W1/W2 `c05634f` with main `6319376` and push
normally to main. The integration retains the newer canonical activity model
and explicit content+grades refresh while delivering W1 completion/free-time
alignment and W2 desktop, Library, Canvas search and draft editor improvements.
FRESH PASS: 82 web tests, 171 focused API planning/experience tests, root
typecheck/lint/build 8/8 each with zero cached. The
25 page/viewport checks, both Today themes, Canvas/draft flows and unlinked
paper completion pass in isolated browser fixtures. Earlier W1/W2 entries
below are local checkpoints superseded by this release. Separate estimator,
notification automation and inactivity-gating scopes remain pending.

## W2 website desktop layout (2026-10-11)

**PASS locally.** The website now supports the requested laptop/fullscreen
layouts, uniform Library grids, searchable/grouped Canvas courses, a desktop
draft editor with auto-growing fields, and theme-aware clear-day states.
Fresh web typecheck/lint/79 tests and all 25 page/viewport checks pass, with
additional light/dark, Canvas selection and draft persistence checks.
Implementation tip `14b12c4`; evidence/adaptations are in the W2 handoff.
No push/deployment. Next: owner review on laptop and fullscreen; content-based
estimates, grade estimator, sync automation and inactivity gating await their
separately scheduled scopes.

## W1 Today/Schedule alignment and submitted-work filtering (2026-10-11)

**PASS locally and in all six signed-in real-account checks.** Shared planner
submission filtering, Done actions including unlinked paper activities,
date-specific shared free time, unsaved-plan labels and overdue separation are
implemented on `website/functional-v1` (`de3e99c`, `9d2ef46`, `1343428`). Fresh
API typecheck/32 task-planning tests and web typecheck/lint/79 tests pass.
Test sessions, plan metadata and preferences were restored; The 5 Why Analysis
stays completed. No push/deployment. Next requires a separate W2 scope:
website desktop/16:9 layout, Library grid, Canvas course search, draft editor.
Estimator, generation-on-sync and inactivity-gating exclusions remain intact.

## Task and planner sync reliability (2026-10-10)

Owner-authorized scope: repair stale Tasks/Today/Schedule on website and mobile,
merge immediately, and publish the existing API, website and Android preview.

The canonical activity model now checks course selection, stored course end/state,
assignment availability and submission evidence for both clients and the planner.
Imported Canvas tasks retain their course identity and current assignment deadline.
Submitted work moves to Completed, is never overdue, and is excluded from planning;
planned sessions reflect the linked activity state. Deselected/ended courses and
orphaned imports do not return as personal tasks. Saved work is preserved.

Website Tasks consumes the complete canonical activity list; Tasks, Today and
Schedule expose explicit content+grades Sync now and poll persisted data every
minute. Per-course website sync now includes grades. Partial sync outcomes remain
partial. Android refresh admissions are bounded to one content/grades pair.
Opening Tasks/Today/Schedule does not create Canvas jobs; the existing once-per-load Generate refresh is preserved. Automatic five-minute Canvas polling
is still the separate, pending notification activation scope.

FRESH PASS: API 1,275 tests (3 skipped), focused final activity/planning regression
162 tests, web 69 tests, mobile sync/screens 68 tests, root production builds 8/8,
root lint 8/8 (four existing mobile warnings), root typecheck 8/8 (changed apps fresh;
unmodified packages cached). Read-only live database checks passed and found four
pending local imports with submitted Canvas evidence. Android preview OTA
25edeaae-9365-4ffa-acb2-f84123430983 is published for runtime 2.0.1.

API/website publication and main integration are being completed. Physical device
acceptance is NOT RUN: no ADB device or browser surface is exposed. See
[acceptance](ai/acceptance/task-sync-reliability-20261010.md).


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
[completion evidence](ai/acceptance/website-completion-20261008.md).

## Urgent Canvas notification activation (2026-10-03)

Local metadata synchronization, transactional email outbox, deadline reminders and persistent Settings controls are implemented. Next: apply the forward migration, configure cron/Resend variables and verified sender, roll out API and Mobile, perform developer-only live delivery and repeat-request/device acceptance, verify five-minute workload capacity, then enable the single Google Cloud Scheduler job. The current Hobby plan cannot provide that trigger interval through Vercel Cron. [Setup and behavior](architecture/canvas-email-notifications.md). Other phase gates below remain unchanged.
