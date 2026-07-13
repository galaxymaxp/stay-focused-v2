# Product Recovery Phase R2 - Reviewer Reliability and Fallback Redesign

Date: 2026-07-13 (Asia/Manila)

## Starting state

- V2 branch: `main`
- V2 starting commit: `11d3041373db7fe35951394a772a1c11e4ffeee5` (`docs(product): complete V1 capability audit`)
- Ahead/behind: `0/0`
- Initial dirty paths: `apps/api/next-env.d.ts`, `apps/mobile/expo-env.d.ts`, `apps/mobile/.gitignore`, and `.vscode/`; all were declared unrelated and remained outside the R2 commit.
- V1 reference: clean `main` at `d26decf3f82d61f2e8dd6ba2444c6c156473163a`; inspected read-only and never modified.
- Baseline engine eval: 266/266.

## V1 behavior adopted conceptually

V1 supplied useful behavioral ideas rather than architecture: preserve exact source wording, validate the final artifact, retry a failed result with explicit repair direction, compile a usable reviewer from already validated source-derived structures, and return a smaller useful artifact when the preferred form is unavailable. V2 retains its typed stage contracts, provider abstraction, authentication, source grounding, leakage rejection, coverage reports, and provenance boundaries.

## Failure classes reproduced

| Failure class | Previous behavior | Evidence |
|---|---|---|
| Ordinary explanatory prose | Narrow fallback worked only for 3-12 sentence-ended blocks | Legacy Stage 5 fallback constants and baseline eval |
| Heading-heavy notes | Fallback often unavailable | Heading blocks were excluded by the sentence-only fallback |
| List-only notes | Fallback unavailable | Sentence-ended prose minimum rejected list shapes |
| One-topic short source | Fallback unavailable below three content blocks | `EXTRACTIVE_PROSE_MIN_CONTENT_BLOCKS = 3` |
| Mixed headings and paragraphs | Could lose the failed section | Fallback required an existing output and exact prose shape |
| Exact technical terms | Retry could paraphrase protected terms again | Retry regenerated the whole section |
| Harmless morphology | Grounding normalization handled bounded variants, but fallback did not solve unrelated section failure | Existing Stage 5a tests remained green |
| Grounded title, drifting explanation | Whole section retried; exhaustion could reject reviewer | Legacy retry guidance and Stage 6 acceptance |
| Grounded explanation, one drifting key point | Whole section retried | No field-scoped diagnostic summary |
| One malformed provider section | Initial failure was collected, then the pipeline rejected after successful assembly | Legacy `runPipeline` post-assembly failure throw |
| One missing planned section | Stage 6 rejected missing output | Legacy Stage 6 missing-output guard |
| Schema-valid unsupported wording | Grounding failed after retries | Baseline grounding-retry eval |
| Retry drift | Latest invalid output could reach final rejection | Legacy retry exhaustion policy |
| Too few extractive blocks | Fallback not created | Three-block minimum |
| One failed section among valid sections | Whole reviewer rejected | Baseline collect-and-continue pipeline eval expected rejection |

## Redesigned reliability policy

Each planned section now follows: accept validated generation; otherwise run bounded repair with failed fields, validation category, exact allowed terminology, and shorten-not-elaborate guidance; validate the repair; otherwise try deterministic source-item, block, line, and final exact-span fallback forms; validate every fallback against coverage, grounding, and leakage; then assemble in final plan order. Earlier Stage 3 failures no longer poison a later valid assembly.

Section quality is `generated`, `repaired`, or `extractive_fallback`. Reviewer metadata adds optional counts, `reviewerQualityStatus`, `fallbackPlanUsed`, `limitedSource`, and uncovered topic titles. Any reviewer containing fallback is reported as `limited`. Provider-wide malformed output or outage uses the source-outline plan with all validated extractive sections and no additional provider call.

Hard failure remains for empty/effectively empty source, invalid request shape, authentication/configuration failure, corrupt plan/source references, fallback that still fails grounding or leakage, no useful output, and structurally impossible assembly.

## Grounding, leakage, and coverage

| Check | Before | After | Result |
|---|---|---|---|
| Grounding | Strict per visible field | Same checks on generated, repaired, and every fallback candidate | Preserved |
| Leakage | Strict visible-output rejection | Same guard; fallback candidates must pass | Preserved |
| Coverage | Original source-outline coverage | Original plan stays intact; fallback counts only for its intended planned section; fallback-plan use is explicit | Honest |
| List coverage | Required exact normalized key-point equality | Also recognizes source-exact list markers and a full extract containing the item; no synonym allowlist added | Hardened |
| Diagnostics | Assembly diagnostics included excerpts | Content excerpts removed; only lengths, counts, categories, statuses, and sanitized identifiers remain | Privacy improved |

The only grounding normalization change is list-marker-aware coverage comparison and source-exact containment for short list labels. Pluralization, tense, capitalization, punctuation, hyphenation, acronyms, and numeric fidelity remain governed by the existing bounded normalizers and protected-token checks.

## API and mobile

Successful recovery uses the existing HTTP 200 response and normal reviewer object. New metadata is additive and optional for stored/older clients. Public errors remain generic; development-only diagnostics may include the validation category and failed field but never unsupported-token lists, source excerpts, prompts, model output, provider IDs, fingerprints, or retry payloads.

The mobile preview renders recovered reviewers normally and shows: "Some sections use source-only fallback because generation could not be safely verified." Complete failure guidance now recommends reviewing source text, returning to block selection where applicable, and retrying without presenting internal codes as the primary message.

## Deterministic tests and evaluation

- Previous eval count: 266
- New eval count: 287
- Normal-generation recovery cases: 1 passed
- Repair cases: 3 passed
- Extractive fallback cases: 15 passed, including paragraph, bullet, heading-heavy, list-only, short, mixed, technical term, table-to-text, numbered procedure, OCR-like, Canvas-like, too-few-block, mixed-quality, missing-section, and retry-drift paths
- Emergency fallback cases: 2 passed
- Hard failures: existing empty/whitespace, invalid plan/source, leakage, grounding, and impossible assembly tests remain passing
- Grounding issues: 0 final failures
- Leakage issues: 0 final failures
- Coverage issues: 0 final failures
- Aggregate: 287/287
- API: 383/383
- Mobile: 126/126

Committed fixtures are fictional. No live Canvas text, course title, assignment title, grade, token, or identifier was added to a fixture or document.

## Protected live validation

| Source label | HTTP | Quality | Generated | Repaired | Fallback | Final | Coverage | Grounding | Leakage |
|---|---:|---|---:|---:|---:|---:|---|---|---|
| fictional-it-security | direct engine | complete | 18 | 0 | 0 | 18 | passed | passed | passed |
| fictional-short-prose | direct engine | complete | 1 | 0 | 0 | 1 | passed | passed | passed |
| fictional-list-notes | direct engine | complete | 1 | 0 | 0 | 1 | passed | passed | passed |
| canvas-live-1 | 200 | limited | 0 | 1 | 3 | 4 | passed | passed | passed |

The protected Canvas check used one existing non-file source through authenticated course source listing, structure, selective preview, reviewer generation, and provenance validation. It reported only: source count 1, character count 4,066, selected block count 23, planned/final section count 4, generated 0, repaired 1, fallback 3, HTTP 200, passed coverage/grounding/leakage, limited quality, and 38,143 ms. No live text or private title was printed or stored in this document.

The live defect found during R2 was an exact-source list whose mechanically cleaned items passed omission coverage but failed protected-token fidelity; raw blocks then failed exact item representation. The final recovery ladder adds source-span-aligned fallback candidates and a validated exact-span last resort, while keeping protected-token rejection active.

## Performance and provider calls

- Maximum initial calls per section: 1
- Maximum repair calls per section: 2 (unchanged default bound)
- Maximum calls per section: 3
- Maximum calls per reviewer: `planned section count * 3`
- Deterministic fallback calls: 0
- Emergency fallback calls: 0
- Valid sections are never regenerated because another section failed.
- Observed protected Canvas duration: 38.143 seconds.

## Automated verification

All passed: engine typecheck/build/test/eval; API typecheck/lint/test/build; mobile typecheck/lint/test; root typecheck/lint; `test:reviewer-web-smoke`; `smoke:reviewer:web`; and `git diff --check`. Browser smoke returned HTTP 200, rendered Reviewer Ready, and passed source-faithful, coverage, clean-output, session, and cleanup checks.

## Files changed

- Engine recovery/types/assembly/grounding: `packages/engine/src/*` R2 files
- Engine regression and eval fixtures: `packages/engine/evals/*` R2 files
- Fictional protected-live fixtures and runner support: `packages/engine/scripts/*` R2 files
- API safe diagnostics/types/tests: reviewer generate route files
- Mobile recovered-preview and failure guidance: reviewer preview and Canvas reviewer screen
- Protected Canvas aggregate-only runner: `scripts/r2-canvas-live-validation.mjs`
- Project scripts and R2 documentation/state files

## Verdict

PRODUCT RECOVERY PHASE R2 COMPLETE WITH FIXES — reviewer reliability restored after hardening

Next task: Product Recovery Phase R3 - Full-document OCR with page completeness

Phase 5E.6 remains in progress. The original Canvas physical validation is not marked complete, and Phase 5F has not started.
