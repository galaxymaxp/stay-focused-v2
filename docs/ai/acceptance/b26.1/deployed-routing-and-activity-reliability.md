# B26.1 deployed Canvas routing and Activity reliability acceptance

Date: 2026-09-18 (Asia/Manila)

Verdict: **PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.**

## Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `ffa9e4703d88e004170f06b1a787f02bbebdb962`
- Ahead / behind `origin/main`: 10 / 0
- Dirty files: none
- `git fsck --full`: passed; only pre-existing dangling objects were reported
- The accepted B26 routing repair was already committed at the starting HEAD. No merge, rebase, reset, push, or history rewrite was performed.

## Deployment

The B26 routing repair was first deployed as production deployment
`dpl_J8218ndruSpDbsJvW2R5rH7Gc9S7`. Two narrowly scoped Activity prompt repairs were
then deployed and physically retested. The final accepted production deployment is:

- Commit: `9f85feb` (`fix(engine): keep personal activity details editable`)
- Deployment: `dpl_GKBaGect3Gvh4Nq6w7Ny8HzYVz7v`
- Deployment URL: `https://stay-focused-v2-prototype-aefmph63n-galaxymaxps-projects.vercel.app`
- Canonical alias: `https://stay-focused-v2-prototype.vercel.app`
- Vercel state: `READY`
- Health: `{"status":"ok","version":"2.0.0"}`

The final deployment includes the original Canvas routing repair and both Activity
reliability repairs.

## Physical production path

Acceptance used the installed standalone Android app, authenticated against the
production API, on a realme RMX3151 running Android 13. The app was driven through
the normal Today, Generate, Tasks, Activity Detail, Generation, Queue, and Canvas
sync surfaces. No app data, Canvas source, task, or artifact was deleted.

## Production Canvas routing

| Canvas object | Observed production destination | Result |
|---|---|---|
| Lesson Canvas Page | Generate | PASS |
| Learning PDF | Generate | PASS |
| Learning PPTX | Generate | PASS |
| Assignment with deadline/submission | Tasks and Activity Detail; absent from Generate | PASS |
| Announcement | Absent from Generate and Tasks; separately synchronized | PARTIAL presentation limitation |
| Course introduction/orientation file | Retained by synchronization; absent from Generate | PASS |

CC16 Generate exposed lesson Pages and `2. Firewalls.pdf` but none of the visible
CC16 assignments. CC13 exposed `Fact Gathering Methods` as a ready Canvas Page.
CC17 exposed its Android lesson PPTX as ready and two other PPTX sources as needing
preparation. CIT6 exposed zero Generate materials even though the previously audited
orientation PDF remains synchronized and retrievable. This confirms exclusion, not
deletion.

The UI used student-readable titles and `ready` / `needs preparation` states. It also
showed useful type labels such as Canvas Page, PDF, and PPTX; no raw Canvas IDs,
tokens, or implementation-only identifiers were shown.

## Generate, Tasks, announcements, and outline handling

- Generate contains actual study Pages/files and excludes assignments and announcements.
- Tasks contains Canvas coursework, including Assignment No. 1 and Assignment No. 2
  with their visible due dates and Activity entry points.
- Assignment instructions remain available in Activity Detail. Submission metadata
  remains stored in the synchronized assignment record, though the inspected mobile
  detail does not display a submission-type field.
- Announcements are correctly separated in storage and routing, but the current mobile
  shell has no dedicated meaningful announcement presentation. This is a known P2 UI
  limitation, not a B26 routing blocker.
- The CIT6 course-introduction/orientation PDF remains retained while being excluded
  from Generate. No source was wiped, moved, or destructively reclassified.

## Normal production sync

The existing Canvas connection was synchronized through the normal mobile flow for
the four selected courses: CC13, CC16, CC17, and CIT6. The app reported that four
synchronization jobs started, then completed with the existing “some areas need
attention” warning. After sync, CIT6 still had zero Generate materials, lesson
Pages/files remained available, and CC16 assignments remained intact in Tasks.

One job emitted a workflow-attachment warning. The overall sync completed and all
routing evidence remained accessible, so this is recorded as an operational warning
rather than a failed routing acceptance.

## Activity sample and prewritten checks

The requirement checklist for each assignment was written before inspecting its
fresh output.

| Assignment | Mandatory checklist summary | Mandatory count |
|---|---|---:|
| Assignment No. 1 — Learning Contract | Individual work; exactly five Expectations, Contributions, Motivations, and Hindrances; bullets; complete sentences | 7 |
| Assignment No. 2 — Getting to know | Picture plus Name, Age, Location, Hobbies, Tagline/Motto/Quote, and course/teacher expectation | 7 |
| Assignment No. 3 — Research Top 10 | Exactly ten threats; origin, impact, propagation, mitigation, significance, lessons, organized recommendations, APA references | 9 |
| Assignment No. 5 — Firewalls and VPNs | Assigned scenario; 10–15 minutes; concerns; technology/type/product/justification; pros/cons; two APA 7 sources; PDF; presentation timing | 11 |
| Assignment No. 4 — Common Cybersecurity Threats | Introduction; at least three threats; operation/damage; prevention; examples; conclusion; exact page/font/margin/spacing/alignment rules | 11 |
| Assignment No. 8 — Build Your Own Cipher | Original manual cipher; no tools; at most five steps; presentation; overview/rules/demo/peer use/strength/weakness/challenge; 1–2 page PDF; group names | 12 |

## Activity results

| Assignment | Satisfied | Partial | Missed | Rerun used? | Result |
|---|---:|---:|---:|---|---|
| Learning Contract | 7 | 0 | 0 | Yes, for defect confirmation and repaired control | PASS after repair |
| Getting to know | 7 | 0 | 0 | Yes, one allowed pre-repair rerun plus repaired control | PASS after repair |
| Research Top 10 | 9 | 0 | 0 | No | PASS |
| Firewalls and VPNs | 0 | 0 | 0 | Yes | SOURCE-LIMITED before generation |
| Common Cybersecurity Threats | 11 | 0 | 0 | No | PASS |
| Build Your Own Cipher | 12 | 0 | 0 | No | PASS |

The Firewalls and VPNs job did not produce a draft: source assembly could not obtain
the referenced Group Announcement/scenario and stopped with
`activity_source_unavailable` before the provider was called. Its eleven requirements
were therefore not graded as output omissions. The one permitted rerun failed at the
same pre-provider boundary.

The five completed assignment types retained all mandatory requirements after the
repair. Research-dependent work stayed as an explicit student research scaffold;
the cipher remained student-designed; and all personal content remained editable.

## Failure classification and reproducibility

| Case | Severity | Root cause | Reproducibility | Disposition |
|---|---|---|---|---|
| Picture cue omitted from Getting to know | P1 instruction loss | MODEL_BEHAVIOR | CONSISTENT across three of four pre-repair B26/B26.1 samples | Fixed and production-retasted |
| Learning Contract invented family/support motivation | P1 unsafe personalization | MODEL_BEHAVIOR | CONSISTENT in both post-first-repair controls | Fixed and production-retested |
| Firewalls/VPNs produced no draft | Source limitation | SOURCE_LIMITATION | CONSISTENT in both attempts | Correctly stopped before provider; source relationship remains unavailable |
| No dedicated mobile announcement surface | P2 presentation | UI_PRESENTATION | CONSISTENT | Documented B27 candidate; routing itself passes |

## Repairs

Commit `9d7b52d` makes the existing AI-first Activity prompt explicitly preserve every
mandatory non-text action, attachment/template cue, exact count, heading/section,
output format, research/reference requirement, and personal-information field. When
content is unavailable, the draft must retain an explicit student action or editable
placeholder and report missing information.

Commit `9f85feb` prevents personal/reflection/profile activities from asserting a
student biography, motivations, expectations, family circumstances, history, goals,
or obstacles. Exact counts and complete-sentence requirements are instead satisfied
with explicit editable sentence starters.

The changes remain at the thin Activity authoring boundary. They add no deterministic
educational planner, Canvas classifier, per-course template, schema change, database
migration, or additional provider call.

## Post-repair production evidence

- Getting to know includes an explicit picture upload/attachment cue and editable
  placeholders for all six text fields.
- Learning Contract includes exactly five complete-sentence starters under each of
  Expectations, Contributions, Motivations, and Hindrances.
- Neither repaired output asserts personal facts or family circumstances.
- The original Canvas routing repair remains effective after deployment and after a
  normal production synchronization.

## Automated verification

| Gate | Result |
|---|---|
| Focused Canvas source regression | PASS — 28/28 |
| Canvas package | PASS — 73/73 |
| API | PASS — 867 passed, 3 skipped (870 total) |
| Mobile | PASS — 451/451 |
| Engine | PASS — 606/606 |
| Shared | PASS — 44/44 |
| OpenAI provider contract | PASS — 19/19 |
| Root typecheck | PASS — 7/7 workspaces |
| Root lint | PASS — 7/7; zero errors, four pre-existing mobile-test warnings |
| API production build | PASS |
| Root production build | PARTIAL — API and six packages passed; local Expo export cannot resolve externally linked `expo-router` |
| Final deployment inspection | PASS — production `READY` |
| Canonical production health | PASS — version 2.0.0 |

The first sandboxed production-build attempt could not traverse the external workspace
dependency path. The approved out-of-sandbox rerun built the API successfully and
isolated the root-build limitation to the known local Metro/Expo dependency link.

## Privacy and safety

No Canvas token, account email, private student response, generated Quiz answer key,
or raw course body is recorded in this report. Production checks were owner-scoped.
No destructive data action occurred.

## Remaining limitations

- Announcement separation passes, but a dedicated student-facing announcement screen
  was not available for meaningful physical presentation testing.
- No synchronized DOCX learning material was available. PDF, PPTX, and Canvas Page
  routing were physically tested.
- Scanned-image/OCR source routing and Canvas New Quizzes were not exercised.
- Arbitrary ambiguous non-actionable Pages beyond the evidence-backed administrative
  metadata patterns remain outside this narrow routing repair.
- Assignment submission types are retained server-side but are not displayed in the
  inspected Activity Detail UI.
- The Firewalls/VPNs Activity could not assemble its separately referenced Group
  Announcement/scenario and therefore never reached generation.
- The local monorepo Expo export still cannot resolve the checkout's externally linked
  `expo-router`; the installed standalone app and deployed API were tested directly.
- Six assignment types across one synchronized course do not prove perfect stochastic
  reliability for every institution or future assignment form.

## Final verdict

**PASS — B26 Canvas routing and Activity reliability acceptance is complete. B27 may begin.**

Recommended next task: begin B27 by specifying and implementing the missing
student-facing announcement experience while preserving the accepted Canvas routing
boundaries.
