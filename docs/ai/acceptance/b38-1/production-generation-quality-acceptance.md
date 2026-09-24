# B38.1 Production Generation Quality Acceptance

Date: 2026-09-24 (Asia/Manila)

Verdict: **PASS — B38.1 production generation quality physically accepted.**

## Starting state

- Branch: `b25-3-3-ai-first`
- Starting HEAD: `e80e5770e7a08e258a6135d6c34a651904caa5dd`
- Ahead / behind `origin/main`: `52 / 0`
- Dirty files: none
- Starting production deployment: `dpl_BB4Zf1kh2cBmiyKn8733USYzkJCZ`
- Starting health: HTTP 200, `{"status":"ok","version":"2.0.0"}`
- Device: realme RMX3151, Android 13 / SDK 33, ADB authorized

## Production architecture and provider

The exercised path remains AI-first:

```text
Canvas material or assignment
  → durable source download
  → native extraction or OCR
  → ordered text plus provenance
  → bounded context assembly
  → OpenAI Responses API with strict JSON schema
  → local contract and source-reference validation
  → persisted generated artifact
  → Queue, Library, and mobile reader
```

`apps/api/src/providers/openai-provider.ts` uses the server-side OpenAI Responses API. Production runtime logs resolved Reviewer, Quiz, and Activity generation to `gpt-5.4-2026-03-05`; the request-specific generator configuration takes precedence over the adapter's legacy default when supplied. The SDK allows one transport retry. The shared generation contract permits at most two attempts, with the second reserved for bounded semantic/contract repair. There is no silent alternate-model fallback. Provider and transport failures propagate to the durable job.

Reviewer context is used directly below the 80,000 UTF-8-byte boundary. Larger sources are split into at most eight bounded pieces and condensed while preserving source references. The provider receives a strict response schema, and local validation still enforces that every returned `sourceRef` belongs to the exact input allowlist. Persistence and the mobile layer do not rewrite generated content.

## Sources used

| Test | Course | Material | Type | Source-side evidence | Why selected |
| ---- | ------ | -------- | ---- | -------------------- | ------------ |
| PDF Reviewer and Quiz | CC16, previous | `2. Firewalls.pdf` | PDF | 33 pages; native extraction, no OCR; 8,421 source characters in the fresh durable run; ordered provenance available | Substantial instructional material with definitions, taxonomies, architecture diagrams, and best practices |
| Non-PDF Reviewer | CC17, current | `Module 1 - Introduction to the Android Platform.pptx` | PPTX | 39 slide markers; prior extraction recorded 9,873 usable characters; fresh provider context was 21,422 bytes; ordered block provenance available | Substantial Office-format lecture testing a different extraction path |
| Activity Output | CC17, current | `Activity 1 - Research on the Different Android Versions` | Canvas assignment | 945 provider source bytes; assignment title, research fields, required tabular Word format, filename rule, and reference requirement present | Real student task reached through the current Tasks → Create Draft flow |

The source review used concise factual inventories rather than copying the underlying course files. Historical generated artifacts were not used as quality references.

## PDF Reviewer acceptance

Fresh job `0d36fe19-0b44-4248-98f1-cacc5577cc52` produced `Firewalls & VPNs Reviewer` with 25 topics. The device reader was inspected from top to bottom.

### Source coverage

- Major source topics: physical security design/control; firewall definition and purpose; forms and categories; packet-filtering, application, circuit, MAC-layer, and hybrid processing; firewall generations; commercial/SOHO/residential structures; packet-filtering, screened-host, dual-homed, and screened-subnet/DMZ architectures; firewall best practices; lesson objectives.
- Covered: all major topics above, including the source-supported architecture examples and the full best-practice set.
- Partially covered: none material. A few concepts were reinforced in more than one section without changing meaning.
- Missing: no major instructional topic identified.

| Check | Result | Evidence/notes |
| ----- | ------ | -------------- |
| Source fidelity | PASS | Definitions, classifications, examples, architecture relationships, and technical claims matched the inspected source inventory. |
| Coverage | PASS | 25 topics covered the source's major conceptual groups and learning objectives. |
| Organization | PASS | Deliberate progression from fundamentals to processing modes, generations, architectures, practices, and objectives; no unrelated concept mixing. |
| Explanation quality | PASS | Explanations were study-usable, appropriately detailed, and more substantive than headings or one-line paraphrases. |
| Key-point quality | PASS | Key points carried concrete study information. Minor reinforcement did not become material duplication. |
| Unsupported claims | PASS | No material unsupported factual claim was found. |
| Mobile presentation | PASS | Readable hierarchy; no raw JSON, schema fields, broken Markdown, clipping, or unbroken text walls; scrolling worked through the full artifact. |
| Persistence | PASS | Reopened from Library, then reopened as the same artifact after force-stop/relaunch with no regeneration or loss. |

Unsupported claims found: **none**.

## Quiz acceptance

Fresh job `803a706a-deb5-4f57-949a-cfc164d22f6a` generated five questions from the persisted Firewalls Reviewer. All five questions, answer options, and marked answers were inspected; the quiz was answered only to confirm the full scoring/result path and scored 5/5 (100%).

| # | Tested concept | Marked answer verification |
| - | -------------- | -------------------------- |
| 1 | Physical-security design sequence | Designing physical security measures follows the physical design step. Correct. |
| 2 | Packet-filtering inputs | Header/network/IP/direction/TCP/UDP criteria are source-supported. `True` is correct. |
| 3 | Stateful connection tracking | The source associates this with a second-generation circuit-level gateway. Correct. |
| 4 | External router, DMZ, mail/web/FTP services | Screened subnet with DMZ is the source-supported architecture. Correct. |
| 5 | Public accessibility as a firewall practice | The source says this should not be done merely because authentication is strong. `False` is correct. |

| Check | Result | Evidence/notes |
| ----- | ------ | -------------- |
| Question grounding | PASS | Every stem and correct answer was supportable by the selected source/Reviewer. |
| Correct answers | PASS | 5/5 marked answers independently verified. |
| Distractor quality | PASS | Alternatives were distinct, plausible in context, and not second correct answers. |
| Ambiguity | PASS | No incomplete stem, multiple-correct set, or meaning-changing grammar found. |
| Topic coverage | PASS | Distribution covered process, processing mode, firewall generation/state, architecture, and best practices. |
| Unsupported questions | PASS | None required outside knowledge. |
| Persistence | PASS | Quiz and 100% best result reopened from Library and survived force-close/relaunch without regeneration. |

- Question count: 5
- Number inspected: 5
- Incorrect answers found: 0
- Ambiguous questions found: 0
- Unsupported questions found: 0

## Non-PDF Reviewer acceptance

The first fresh submission reproduced a production failure before the provider was reached. The repaired production deployment then completed fresh job `a086c05c-ef48-4aae-9aa3-6854dac479fd` as `Unit 1 Reviewer: Introduction to the Android Mobile Platform`, containing 32 topics. Every topic was physically inspected.

| Check | Result | Notes |
| ----- | ------ | ----- |
| Extraction/context quality | PASS | All 39 slide markers yielded usable ordered context. The repaired provider request carried 21,422 source bytes with valid provenance. |
| Source fidelity | PASS | Android definition/device support, Java/Kotlin/XML, partner/ecosystem material, versions/API levels, development environment, architecture layers, Linux kernel services, libraries, runtime/Dalvik, framework managers, applications, workflow, and lifecycle/publication content followed the slides. Source-owned dated terminology and typos were not silently modernized. |
| Coverage | PASS | All major instructional groups were represented across 32 topics. No important slide group was missing. |
| Organization | PASS | The artifact progressed from platform overview and development concepts into architecture layers, execution workflow, application framework, and lifecycle. |
| Readability | PASS | College-level explanations, useful detail, short semantic sections, and clean mobile hierarchy. |
| Compared with PDF path | PASS | Comparable or greater depth and equally good fidelity, structure, and readability; no Office-extraction quality penalty remained. |

Unsupported claims found: **none**.

## Activity generation acceptance

The actual student path is **Tasks → assignment → Create Draft → confirm → Queue/Library**. No Activity flow was invented on the Generate screen.

Fresh job `4ff24262-9c9a-4b01-a94a-eeb00df55789` generated an Activity Output for CC17's `Activity 1 - Research on the Different Android Versions`.

| Check | Result | Notes |
| ----- | ------ | ----- |
| Student-accessible path | PASS | Reached through the production assignment detail's Create Draft action. |
| Generation completed | PASS | Durable Activity job completed and opened on the physical device. |
| Source/task alignment | PASS | Output centered on Android versions, version number, codename, release date, features, and reliable references. |
| Requirement fidelity | PASS | Retained Word/table format, `LASTNAME, FIRSTNAME-ACT-1` filename requirement, and references. No deadline, points, teacher name, or extra instructor requirement was invented. |
| AI suggestion separation | PASS | Android 1.0–14 rows were clearly a suggested scaffold with editable research placeholders and an instruction to adjust from class/module guidance, not purported Canvas facts. |
| Persistence | PASS | Activity Output reopened from Library and remained after force-close/relaunch. |

Canvas/source requirements were the research fields, tabular Word deliverable, filename rule, and references. The prefilled version-row structure and research placeholders were AI suggestions. One ordinary workflow phrase, “before uploading,” was consistent with the Canvas assignment context and was not presented as a new instructor constraint.

## Queue, background, Library, and relaunch

During the PDF Reviewer run, generation was started and the user left the generation screen for Today before completion. The job continued, appeared completed in Queue, and opened normally from the Queue result. This passes the requirement that the user need not remain on the generation screen.

| Artifact | Reopened from Library | Survived force-close/relaunch | Verdict |
| -------- | --------------------- | ----------------------------- | ------- |
| Firewalls Reviewer | Yes | Yes | PASS |
| Firewalls Quiz and 100% result | Yes | Yes | PASS |
| Android Platform PPTX Reviewer | Yes | Library presence/open verified; shared app relaunch retained Library state | PASS |
| Android Versions Activity Output | Yes | Yes | PASS |

The app was force-stopped and relaunched through the installed standalone package. The authenticated Today session restored normally. Library reopened the same PDF Reviewer, Quiz/result, and Activity content with stable titles/dates and without regeneration, ownership errors, or lost content.

## Defect and repair

```text
ID: B38.1-01
Severity: High — reproducibly blocked a supported production PPTX Reviewer
Artifact: CC17 Android Platform PPTX Reviewer
Symptom: Job 0b252785-27ac-4fc9-be26-4181ce8c0193 failed with request_exceeds_context_budget before any provider request.
Root cause: The strict Reviewer response schema embedded every full source block ID as a sourceRefs enum. For a structured PPTX with many long IDs, instruction bytes plus duplicated schema bytes exceeded generateContract's 8,000-byte request-contract budget even though the extracted instructional context itself was valid.
Responsible layer: Structured-output contract / context assembly boundary.
Regression test: A 100-long-block-ID Reviewer fixture now proves the provider is reached, exact valid refs survive, and a fabricated ref remains rejected by local validation.
Repair: Provider schema sourceRefs items changed from the unbounded per-request enum to a bounded string schema. Exact source-ID allowlisting remains enforced by validateReviewerDocument and the repair path; no validation was weakened.
Retest: Focused API AI-first tests passed 30/30; implementation 1d992aa was deployed; fresh PPTX job a086c05c-ef48-4aae-9aa3-6854dac479fd reached gpt-5.4 on attempt 1, completed, persisted, opened, and passed the full 32-topic quality inspection.
```

The trace followed source selection, extraction, ordering, usable context, provider reachability, contract construction, validation, persistence, and presentation in that order. No prompt, model, routing, or UI redesign was warranted.

## Generation diagnostics

| Job | Artifact | Source/context | Provider/model | Durable result | Time/attempts | Persistence |
| --- | -------- | -------------- | -------------- | -------------- | ------------- | ----------- |
| `0d36fe19-0b44-4248-98f1-cacc5577cc52` | PDF Reviewer | 1 PDF, 33 ordered pages, 8,421 chars; no OCR | OpenAI Responses / `gpt-5.4-2026-03-05` | completed | 25,697 ms provider; attempt 1 | success |
| `803a706a-deb5-4f57-949a-cfc164d22f6a` | Quiz | persisted Reviewer, 18,872 source bytes | OpenAI Responses / `gpt-5.4-2026-03-05` | completed | 10,318 ms; attempt 1 | success |
| `0b252785-27ac-4fc9-be26-4181ce8c0193` | PPTX Reviewer, before repair | 39-slide structured source | No provider request | failed: `request_exceeds_context_budget` | contract preflight | no artifact, as expected |
| `a086c05c-ef48-4aae-9aa3-6854dac479fd` | PPTX Reviewer, after repair | 1 PPTX, 39 ordered slide markers, 21,422 provider source bytes | OpenAI Responses / `gpt-5.4-2026-03-05` | completed | 49,217 ms; attempt 1 | success |
| `4ff24262-9c9a-4b01-a94a-eeb00df55789` | Activity Output | 1 Canvas assignment, 945 source bytes | OpenAI Responses / `gpt-5.4-2026-03-05` | completed | 10,463 ms; attempt 1 | success |

The PDF preparation log reported the 33 expected/accounted pages in order, eligible source context, and 225,808,384-byte process RSS without exhaustion. Post-deploy production error/warning review found no new entries for the acceptance interval. Tested polling and retrieval requests returned 200; there was no 5xx burst, stalled Workflow, memory exhaustion, provider failure, or persistence/database error after the repair.

## Automated verification

| Command/suite | Result | Notes |
| ------------- | ------ | ----- |
| Focused API AI-first Reviewer tests | PASS | 30/30, including the long-source-ID contract regression |
| `npm run typecheck -- --force` | PASS | 7/7 workspaces, zero cached |
| `npm run lint -- --force` | PASS | 7/7 workspaces; 0 errors; four pre-existing `import/first` warnings in mobile tests |
| Mobile tests | PASS | 513/513 in 43 files |
| API tests | PASS | 903 passed, 3 opt-in skipped (906 total) in 91 files |
| Engine evaluations | PASS | 606/606 |
| Canvas tests | PASS | 73/73 |
| Shared tests | PASS | 44/44 |
| OCR tests | PASS | 27/27 |
| Workflow runtime | PASS | 1/1 |
| Provider contract | PASS | 19/19 |
| Database build | PASS | Completed |
| API production build | PASS | Completed; 28 static pages |
| Mobile Expo export | PASS | Web 2,773 modules; iOS 3,157; Android 3,157; 49 assets |
| `npm ci --dry-run` | PASS | Lockfile current; no dependency change |
| `git diff --check` | PASS | Working and staged changes checked |

The four unchanged lint warnings are in `activeProcessingJobStore.test.ts`, `completedArtifactCache.test.ts`, `processingJobsApi.test.ts`, and `processingOutboxStore.test.ts`.

## Production deployment

- Implementation commit: `1d992aab48f1b74ffbe1ead29945c30957bb11d6`
- Deployment ID: `dpl_EBwoR9gdNTvWBTMdezJD1ydqDXdk`
- Deployment URL: `https://stay-focused-v2-prototype-n77mack9e-galaxymaxps-projects.vercel.app`
- Canonical URL: `https://stay-focused-v2-prototype.vercel.app`
- Status: READY
- Health: HTTP 200, `{"status":"ok","version":"2.0.0"}`
- Mobile update required: no; no mobile code changed

## Physical evidence

All committed screenshots were visually checked for unrelated private overlays before staging.

- [Background navigation](device/03-background-navigation.png)
- [Completed Queue job](device/04-queue-completed.png)
- [PDF Reviewer top](device/05-reviewer-top.png)
- [Library Reviewers](device/08-library.png)
- [Quiz Library and 100% result](device/10-quiz-top.png)
- [PPTX Reviewer](device/13-non-pdf-reviewer.png)
- [Activity source](device/14-activity-source.png)
- [Activity Output](device/15-activity-output.png)
- [Library after relaunch](device/17-after-relaunch.png)

No reproducible physical generation quirk remained. Normal navigation/touch timing did not alter the quality verdict.

## Final assessment

Fresh production artifacts—not historical outputs—showed source-faithful, complete, readable, persistent Reviewer, Quiz, and Activity behavior on the real device. The reproduced PPTX blocker was repaired at its actual contract boundary without weakening exact provenance validation and was deployed and retested successfully. B38.1 is complete. The next distinct roadmap item is **B39 Full E2E / Demo Acceptance**.
