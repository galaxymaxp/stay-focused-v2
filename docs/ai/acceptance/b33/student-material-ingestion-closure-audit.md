# B33 student-material ingestion closure audit

Date: 2026-09-21 (Asia/Manila)

Verdict: **PASS — supported student-material ingestion matrix is closed.** B31 and B32 absorbed the former standalone DOCX/PPTX milestone and the scanned-PDF blocker. B33 found and fixed one separate, reproducible B26 routing defect: the Tasks read model admitted synchronized Canvas assignment records that had neither a deadline nor a submission mode.

## 1. Starting state

- Branch: `b25-3-3-ai-first`.
- Starting HEAD: `3dcc0a516022a8637653c23b3c88caa21fcf3ca8` (`docs(ai): record B32 scanned PDF reliability acceptance`).
- `origin/main...HEAD`: 0 behind / 34 ahead.
- Dirty files: none.
- Repository health: `git fsck --no-reflogs` exited 0. It reported only unreachable/dangling commits and blobs, not corruption.

## 2. Why the original B33 scope was reassessed

The roadmap still described B33 as DOCX/PPTX production acceptance, but newer evidence is authoritative. B31 used real Student-accessible Canvas DOCX and PPTX sources through discovery, preparation, real OOXML extraction, durable Reviewer generation, persistence, Queue completion, physical Android rendering, and Library reopen after force-stop/relaunch. B32 then closed the only remaining format correctness blocker by moving the 16-page scanned-PDF path into checkpointed workflow inspection, chunked OCR, ordered atomic source attachment, AI generation, persistence, Queue, and Android Library reopen.

No DOCX/PPTX rerun and no repeat Accounting generation were warranted. B33 therefore audited the complete supported matrix, routing boundaries, and failure safety instead of manufacturing duplicate production evidence.

## 3. Authoritative ingestion matrix

Each state cell uses only the required classifications. A production PASS is based on B28-B32 production/device evidence, not unit tests alone.

| Source type | Student eligible? | Discovery/resolution | Acquisition | Extraction | Provenance | Durable job | Production generation | Queue | Library reopen | Evidence | Remaining gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Canvas Page | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | B28 and B31 real Canvas Pages; normalized readable HTML; fresh source-specific Reviewers; Android Queue/Library/relaunch | None |
| text PDF | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | B28 33-page Firewalls PDF and B31 Greetings PDF; native text, stored source, fresh durable generation, physical reopen | None |
| scanned PDF | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | B32 job `a85bd672-2aed-401b-a37e-fd1c794d826f`: 16/16 pages, four OCR chunks, 6,757 ordered characters, source attachment, Reviewer, Queue, Library relaunch | None |
| DOCX | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | B31 `FINAL EXAM REVIEWER 2T 23-24.docx`; real Canvas preparation and OOXML extraction; job `a3ff7851-d2ce-40a8-922c-d675a283dbe3`; artifact `24a8e4da-4a23-4384-a8d1-9bb96d5a8e8a` reopened after relaunch | Exact internal byte/hash/row IDs were not exposed by approved production surfaces; no correctness defect was observed |
| PPTX | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | B28 Android Platform PPTX plus B31 Self Introduction PPTX; real slide-order extraction, source-specific fresh Reviewer, Queue, physical render, Library reopen | Advanced slide media/notes are outside the structural-text contract |
| PNG | PASS | BLOCKED BY CANVAS PERMISSION | BLOCKED BY CANVAS PERMISSION | PASS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | MIME/signature/OCR/routing/failure paths pass automated tests; administrative and ungrouped PNG negatives passed production sync/device checks | No natural direct-module instructional PNG exists; the Student account cannot create one |
| JPEG | PASS | BLOCKED BY CANVAS PERMISSION | BLOCKED BY CANVAS PERMISSION | PASS | PASS | PASS | PASS | PASS | PASS | B29 real Piaget JPEG direct import: 965 OCR characters, durable production Reviewer, owner-linked upload provenance, Queue and Android Library reopen | Canvas-specific discovery/acquisition/provenance remains fixture-limited |
| TXT/Markdown | PASS | NOT TESTED | NOT TESTED | PASS | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | NOT TESTED | Current Canvas policy, strict UTF-8 extraction, empty-text rejection, and context tests | No natural Student-accessible Canvas fixture; no implementation defect found |
| legacy DOC/PPT | UNSUPPORTED BY DESIGN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Capability contract returns `unsupported_material`; students must convert to DOCX/PPTX | Intentional exclusion |
| XLS/XLSX/RTF | UNSUPPORTED BY DESIGN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Metadata may synchronize, but no generation-ready extraction contract exists | Intentional exclusion |
| standalone HTML file | UNSUPPORTED BY DESIGN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | File policy blocks HTML; Canvas Page HTML remains supported through the Page path | Intentional security boundary |
| archives, executables, audio/video | UNSUPPORTED BY DESIGN | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | NOT APPLICABLE | Archives/executables are blocked; audio/video remain metadata-only media | Intentional security/product boundary |

## 4. Generate eligibility audit

| Material type | Expected destination | Actual behavior | Verdict |
| --- | --- | --- | --- |
| Instructional Page | Generate | Included unless empty or evidence-backed administrative routing excludes it | PASS |
| Instructional PDF, DOCX, PPTX, TXT/Markdown | Generate | Supported files appear with ready/prepare states; unsafe, locked, unavailable, or unsupported files fail closed | PASS |
| Direct-module instructional PNG/JPEG | Generate | Eligible only with a direct module File placement outside administrative modules | PASS |
| Ungrouped artwork/banner/profile image | Excluded | Direct-module intent guard excludes it | PASS |
| Announcement | Announcements/Today | Canvas object type is always excluded from Generate and Tasks | PASS |
| Assignment/task record | Tasks when actionable | Canvas object type is always excluded from Generate | PASS |
| Course outline, syllabus, orientation, administrative module material | Excluded | Evidence-backed title/module rules exclude the accepted production cases, including `Module 0: Course Information Module` | PASS |

The routing classifier is deliberately narrow and evidence-based. A future ambiguously titled Page/file could require a new observed rule, but no current student-accessible false positive remains. This is an ambiguity, not a reproduced defect.

## 5. Tasks eligibility audit

The audit reproduced a real defect in `composeActivities`: every owned synchronized Canvas assignment was mapped to Tasks even when both `due_at` and `submission_types` were empty. The fix retains an assignment when it is deadline-bearing or has an actionable submission type, rejects empty/`none`/`not_graded` submission metadata without a deadline, and prevents an already-imported non-actionable assignment task from leaking back into the experience read model.

| Material type | Expected destination | Actual behavior after B33 | Verdict |
| --- | --- | --- | --- |
| Assignment with deadline and submission | Tasks | Included | PASS |
| Deadline-only assignment | Tasks | Included | PASS |
| Submission-only assignment | Tasks | Included | PASS |
| Assignment with neither deadline nor actionable submission | Not Tasks | Excluded, including a linked imported task row | PASS |
| Announcement | Announcements/Today | Excluded from Tasks | PASS |
| Instructional Page/file | Generate | Not converted into an assignment activity | PASS |
| Manual student task | Tasks | Preserved independently | PASS |

## 6. DOCX/PPTX evidence review

For both formats, B31 proved that the source was Student-accessible, resolved through the Canvas material path, prepared through the authenticated file path, and extracted from the real Office document. The resulting source-specific Reviewer passed durable 202-backed generation, persistence, Queue completion, physical Android rendering, and Library reopen. The DOCX artifact was reopened again after force-stop/relaunch. B28 independently confirmed PPTX persisted source-version/provenance data and ordered slide markers.

Approved production surfaces did not expose every internal byte count, magic-byte comparison, redirect, hash, or relationship row during B31. Those controls remain enforced in the same acquisition/extraction implementation and regression suite; there is no evidence of missing provenance or source substitution. No new live DOCX/PPTX validation was necessary.

## 7. PNG/JPEG status

- JPEG is production-proven through B29 direct import, live Vision OCR, durable generation, owner-linked persistence, Queue, and Android Library reopen.
- PNG and JPEG share the implemented Canvas acquisition, MIME/signature, OCR, empty-output, provenance, and durable-generation contracts. PNG-specific policy/extraction behavior is automated-test covered.
- Canvas-positive instructional-image acceptance remains fixture-limited and permission-limited. Fresh production synchronization proved the negative rules: administrative `APA Sample.png` and ungrouped artwork/profile images stay out of Generate.
- No naturally eligible direct-module instructional image exists, and the Student account cannot author one. Per B30, this external limitation does not block the roadmap and was not bypassed with fabricated data or Teacher/Designer cooperation.

## 8. Failure-safety review

| Failure case | Protected? | Evidence |
| --- | --- | --- |
| Acquisition failure | PASS | Preparation maps ingestion failure to a safe unavailable/failed state; no source becomes ready without stored bytes and matching metadata |
| Resource not found | PASS | Canvas sync/resolution records a safe resource-not-found outcome and does not invent or delete material from partial evidence |
| Permission denied | PASS | Canvas sync records permission-limited partial outcomes; B30/B31 preserve the Student boundary without privileged fallback |
| Corrupt/invalid Office archive | PASS | Bounded OOXML parser rejects missing parts, invalid/hostile XML, active content, unsafe paths, excessive expansion, and empty/unreadable output; extraction returns a safe 422 rather than source text |
| Extraction failure | PASS | Missing Storage objects, byte/hash/signature mismatch, invalid/encrypted/over-limit PDF, invalid UTF-8, and empty text stop before generation |
| Scanned-PDF OCR failure | PASS | Provider/configuration/timeout/malformed/empty failures map to safe job failure; no empty source is accepted |
| Partial OCR or missing page result | PASS | Exact count/range/uniqueness checks reject missing, duplicate, invalid, out-of-range, failed, or misordered page evidence |
| Workflow retry/failure | PASS | Checkpoints are idempotent; leases and terminal-state guards prevent unsafe continuation; interrupted work is failed/retryable and does not publish a result |
| Source attachment failure | PASS | `attach_deferred_canvas_reviewer_source_v1` locks the owned running job/source, validates exact Canvas identity, and updates source version/source/job in one SQL transaction; AI generation occurs only after attachment returns |
| Generation failure | PASS | The workflow marks the job failed before completion; Library only publishes succeeded jobs with a matching persisted result/artifact |

B32 ordered/atomic behavior remains protected by page-accounting checks, the deferred-source service regression, and the database contract regression. The focused B33 safety set passed 152/152.

## 9. Automated verification

| Command / suite | Result | Count / notes |
| --- | --- | --- |
| Initial focused API test | BLOCKED | Broken pre-existing dependency links prevented Vitest from loading `@vitest/utils/helpers`; no test executed |
| Initial API typecheck | BLOCKED | Same generated dependency tree lacked installed type definitions |
| Clean `npm ci --ignore-scripts --no-audit --no-fund` | PASS | Exact lockfile reinstall; no tracked manifest/lockfile change |
| `npm test --workspace @stay-focused/api -- src/lib/experience/experience.test.ts` | FRESH PASS | 56/56, including B33 actionable-routing regression |
| Focused ingestion/routing/OCR/deferred/failure suites | FRESH PASS | 9 files, 152/152 |
| `npm run typecheck --workspace @stay-focused/api` | FRESH PASS | TypeScript strict check |
| `npm test --workspace @stay-focused/api` | FRESH PASS | 88 files; 894 passed / 3 skipped |
| `npm run typecheck --workspace @stay-focused/engine` | FRESH PASS | Build, eval, and live-run TypeScript configs |
| `npm test --workspace @stay-focused/engine` | FRESH PASS | 606/606 |
| `npm test --workspace @stay-focused/canvas` | FRESH PASS | 73/73 |
| `npm run build --workspace @stay-focused/db --workspace @stay-focused/api` | FRESH PASS | DB TypeScript; 22 workflow steps / 2 workflows; Next production compile/typecheck; 28 static pages |
| `git diff --check` | PASS | No whitespace errors |

## 10. Production validation performed

No new production generation, deployment, Canvas mutation, or physical-device run was performed. B31 already proves Page/text-PDF/DOCX/PPTX production and device gates, B32 proves the 16-page scanned-PDF gate, and B29/B30 establish direct JPEG OCR plus the Canvas image fixture limitation. Repeating those jobs would add cost without closing a missing gate.

## 11. Remaining limitations

- A naturally occurring Student-accessible, direct-module instructional PNG/JPEG is still unavailable. Canvas-positive image discovery/acquisition/provenance therefore remains untested and permission-limited; the shared implementation and negative production routing are sound.
- TXT/Markdown is implemented and regression-covered but lacks a natural production Canvas fixture.
- Office extraction is intentionally structural text: advanced layout, embedded media, animations, and speaker notes are not claimed.
- Legacy DOC/PPT, spreadsheets/RTF, standalone HTML files, archives/executables, and audio/video ingestion remain unsupported by design.

None is a correctness blocker for the accepted supported paths.

## 12. Roadmap impact

The former standalone B33 DOCX/PPTX production milestone was absorbed by B31, while B32 closed scanned-PDF reliability. B33 is closed after the narrow Tasks routing correction. Format work should not be repeated without a newly reproduced student-facing defect. B34 generation quality acceptance is next.

## 13. Git result

- Implementation commit: `066fdfa` (`fix(api): enforce actionable Canvas task routing`).
- Documentation commit: `docs(ai): record B33 student material ingestion acceptance`.
- Expected final `origin/main...HEAD`: 0 behind / 36 ahead.
- Expected final worktree: clean.

## 14. Verdict

**PASS — supported student-material ingestion matrix is closed**

Next roadmap milestone: **B34 generation quality acceptance**.
