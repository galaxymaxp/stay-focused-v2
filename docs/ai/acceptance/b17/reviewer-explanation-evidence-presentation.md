# B17 — Generic Reviewer explanation and evidence presentation

2026-09-07, local execution only. **FAIL — generic Reviewer quality defect remains**.
This report continues B16.1; its historical FAIL is unchanged. Private evidence is in ignored `.local/b17/`.

## 1. Starting state

- Repository: `C:/Projects/stay-focused-v2`; the Codex workspace under OneDrive was empty.
- Branch `main`; HEAD `4cc7233c2102a3251945a1825e2f591bd158b166`; ahead/behind 16/0.
- Only pre-existing untracked `docs/ai/acceptance/b8/`; untouched throughout.
- `git fsck --full` PASS, two dangling blobs; no implementation drift.
- FRESH engine typecheck/build PASS, eval 476/476, architecture 27/27, API 607/607 in 69 files.
- Canonical current-state/roadmap files are under `docs/`. The requested `docs/ai/current-state.md` and `docs/ai/roadmap.md` did not exist; update canonical files rather than create competing state documents.

## 2. B16.1 failure ownership

This matrix was written in `.local/b17/failure-ownership.md` before production edits, from the actual source/plan/manifest/request/response/replay/output captures.

| Defect | Owner | Evidence |
|---|---|---|
| Python fallback duplication | ASSEMBLY | Final ITERATORS and Generator Expressions repeat extractive explanation in keyPoints. attachGeneratedExplanation and fallback preserve all points; serialization does not remove overlap. |
| Python repetitive facts | EVIDENCE_PRESENTATION | ITERATORS targets include explanatory prefix + code and the same code alone, sharing block provenance; Generator Expressions code also reappears as relationshipLabel of next code target. |
| Python lecture framing | EVIDENCE_PRESENTATION | Deterministic points expose “Before discussing…”, “Now let us see what”, “Keep in mind…” from semantic target labels. Provider does not own these points. |
| Python flattened code | EVIDENCE_PRESENTATION | Code block types survive normalization but renderRequiredEvidenceTarget emits untyped strings. Cached extraction already has flattened lines in multiple code blocks; missing indentation cannot safely be invented. |
| MinerU repeated labels | EVIDENCE_PRESENTATION | Mapping/row targets repeat relationshipLabel and table row headers; overlapping semantic and typed targets emitted separately. |
| MinerU Median source dump | EVIDENCE_PRESENTATION | 109 targets from 21 local blocks include overlapping mappings and 64 table rows. Whole-table semantic strings coexist with typed rows. Provider explanation itself is 1 concise source sentence. |
| MinerU structural noise | ASSEMBLY | Stage6 duplicatePointCount normalizes punctuation and counts repeated table values as prose duplicates; it sees flattened evidence, not row identity. |
| Docling oversized passages | EVIDENCE_PRESENTATION | Grouped section contains 46 targets, including concept passages joined to table text and separately preserved table rows. |
| Docling instructional wording | EVIDENCE_SELECTION | Whole locally explanatory blocks enter the prompt. Procedure instructions beginning “Based on…” and “Look for…” survive existing conservative instructional filtering. Required procedure content must remain separately visible. |
| Accounting fragments | PROMPT | Request mandates verbatim complete sentences, while local source says “is a record…” / “may be allowable…”. Response follows fragments without heading subjects. |
| Accounting command wording | PROMPT | Cash request contains “report when you…”, response capitalizes it as imperative. Contract disallows even adding the local title as subject. |
| Accounting duplicated raw tables | EVIDENCE_PRESENTATION | Trial Balance concept target includes all table rows; 17 typed row targets display the same table again. |

The primary capture directory was `.local/b16-1/attempt3/`. Private joined trace JSONs contain block IDs, full manifests, outputs and source provenance. Per-section metrics record characters, unique normalized spans and evidence types. All source boundaries remain local; no new token budget was imposed (existing 10,000-character section / 36,000-character batch bounds retained).

## 3. Root cause

The manifest serves both as a factual contract and as a flattened display specification. Semantic targets can include an entire parent passage as a relationship label, while typed targets separately contain the same code or table rows. Rendering every target as a key point repeats both. Source code has also already lost whitespace in the frozen cached extraction; display formatting cannot recover it safely.

The explanation contract required verbatim sentences even when headings supply the missing subject. Whole-block prompt selection admitted mixed instructional material, and multi-sentence explanations were rejected by the frozen sibling-fusion validator. Its rule is unchanged; the prompt now requests one local sentence. Legacy source-item omission checks remain a second factual contract beyond the manifest; Statistics still fails those checks. A proposed heading-filter change was tested and rejected; the final omission extraction/rules are unchanged.

## 4. Repair

- Add a deterministic, optional display projection: prose key points plus typed table, code, formula, result, example or source blocks. Every projected target must pass the existing matcher; Stage 6 checks conservation again after serialization.
- Preserve internal source-owned key points, target IDs and evidence hash. A recomputed projection rejects altered presentation content; provider output remains explanation-only.
- Group table rows by table identity, preserve distinct row identities, restore source row ordering, remove shared-provenance exact contained spans only where conservation allows, and remove an exact table passage from prose only if all targets still match.
- Separate local prose sentences from code/table/formula/image/heading payloads for structured-source explanation requests. Keep the prior fallback support path for sources without sufficiently shaped prose.
- Request one source-worded sentence, no outside facts or lecture commands, and local-heading subject completion only. Deterministic subject completion handles initial predicate fragments without rewriting the source predicate. Fallback uses the same sentence selection and subject completion.
- Remove exact explanation/key-point duplication, including an exact predicate with only the local heading added. Near duplicates and unsafe composite spans remain; there is no global fuzzy deduplication.
- Reader renders selectable technical text and horizontally scrollable tables; stored-reviewer validation accepts only known evidence kinds. Text extraction, grounding, leakage, semantic matching and the information-value check include the new serialized evidence field.

The new helpers are parser-independent. No section title, course or parser name selects behavior. No planner merge or sibling-policy change was introduced.

## 5. Regression evidence

| Regression | Before | After |
|---|---|---|
| Separate table display | Old serializer has raw bullets | PASS, typed table |
| Raw table absent from prose | Old serializer duplicates table passage | PASS for exact conservative subtraction |
| Code structural formatting | Old serializer has code bullet | PASS, exact whitespace in code block |
| Fallback emitted once | Old serializer repeats explanation as point | PASS |
| Exact explanation/predicate duplicates | Observed B16.1 duplicates | PASS; distinct facts retained |
| Presentation-only commands in context | Whole blocks can enter prompt | PASS synthetic sentence filtering |
| Every required target survives projection | B16.1 retained all targets | PASS before and after |
| Distinct rows with identical values | Required safety invariant | PASS |
| Same table row identity repeated | Raw semantic/typed duplicates | PASS, emitted once |
| Source row ordering | Semantic discovery can precede headers | PASS |
| Formula/result pair | Existing fidelity invariant | PASS, exact values retained |
| No neighboring context | Existing locality invariant | PASS |
| Provider cannot alter display ownership | New field needed protection | PASS, altered projection rejected |
| Source-authorized combination accepted | Existing semantic rule | PASS unchanged |
| Unsupported sibling combination rejected | Existing semantic rule | PASS unchanged |
| Subject completion | Source predicates remain fragments | PASS, only local heading added |
| Typed serialized evidence counts as information | Initial B17 audit exposed false low-information failure | PASS after field integration |
| Reader preserves typed-only content | No evidence field rendered | PASS, reader test |

There are 18 added engine architecture cases, plus one reader case. A private synthetic comparison executes the actual starting-HEAD serializer against the current serializer: table separation, raw-table prose duplication, code typing and fallback duplication all reproduce FAIL before / PASS after (`before-after-regressions.json`). Other before entries are observed captures or preserved invariants, not claimed pre-fix test runs.

First implementation test runs failed 15 then 7 existing evaluations; fixes restored compatibility without changing or deleting those tests. A test-authoring async signature error was corrected. All intermediate logs remain private.

## 6. Deterministic verification

FRESH engine typecheck/build PASS; **494/494** evaluations (476 + 18). Focused architecture **45/45** (27 + 18). Reader presentation **32/32** (31 + 1). No existing test weakened or deleted.

## 7. Python live result

99/99 retained, coverage 1.00, grounding 0.94; zero final issues, omissions, fabrications, provider target losses or factual retries. Assembly and automatic usefulness PASS. Two initial batches, two calls, zero explanation retries, zero fallback. Total **9.113 s**. ITERATORS and Generator Expressions no longer need fallback. Code has explicit display blocks, but source prose/code remains entangled in some required labels, source code is already flattened, and lecture labels/near-duplicate facts persist. **Manual FAIL**.

## 8. Statistics MinerU live result

232/232 retained, coverage 1.00, grounding 0.84; two unresolved source-item omissions, zero fabrication/provider loss/factual retry. Two batches/calls, no explanation retry and no observed final explanation replacement. Total **17.819 s**. Assembly FAIL and candidate withheld; standalone automatic usefulness has no diagnostics, but this is not acceptance. Median formula, result (70.7), examples and all required rows remain. The earlier STRUCTURAL_NOISE rejection is absent, but repeated relationship labels, cells and source dumps remain. No source boundary was expanded. **Manual FAIL**.

## 9. Statistics Docling live result

156/156 retained, coverage 1.00, grounding 0.78; four unresolved source-item omissions, zero final fabrications/provider loss/factual retries. Two initial batches/calls, no explanation retry. Three observed extractive explanation replacements in withheld output (grouped mean and both mode computation sections); these are not hidden as zero fallbacks. Total **7.049 s**. Assembly FAIL; standalone automatic usefulness has no diagnostics. Median formula/result/required tables remain in their frozen source ownership, including source structure that places worked formula material under a neighboring plan section. Oversized required passages, instructional prose and repeated tables remain. **Manual FAIL**.

## 10. Accounting live result

46/46 retained, coverage/grounding 1.00; zero final issues, omissions, fabrications, fallback or provider target losses. Capital row, corresponding cash row, ledger headers and remaining rows explicitly inspected and retained. Assembly and automatic usefulness PASS. One initial batch plus one explanation retry for two sections = two calls. Total **4.268 s**. The first response used unsupported “recognize” and “exchanged”; unchanged grounding rejected both. Final explanations are coherent and have subjects, and the full trial-balance table is no longer duplicated in prose. Cash remains a near-duplicate point after provider inflection; fragmentary source key points and malformed cached ledger rows remain. Distinct identical source rows are deliberately not erased. **Manual FAIL**.

## 11. Batch and retry behavior

| Case | Initial batches | Explanation retries | Sections retried | Factual retries | Fallbacks / observed replacements |
|---|---:|---:|---:|---:|---:|
| Python | 2 | 0 | 0 | 0 | 0 |
| Statistics MinerU | 2 | 0 | 0 | 0 | 0 |
| Statistics Docling | 2 | 0 | 0 | 0 | 3 |
| Accounting | 1 | 1 | 2 | 0 | 0 |

B16.1 explanation retries 2/0/1/0 become 0/0/0/1; calls 4/2/3/1 become 2/2/2/2. Accounting cost increased by one request. B16.1 observed replacements 2/1/4/0 become 0/0/3/0; for withheld candidates counts compare final source text with captured provider text after allowed subject completion, not unavailable final Reviewer metadata. Successful explanations were excluded from provider retries; factual retries stay 0/0/0/0. The unchanged fallback path can still replace a valid explanation when a section fails the separate source-item omission check. No new HTTP/schema failure; all final generation requests HTTP 200, model gpt-4o. Boundary/identity/order checks pass; existing response-order and partial-failure tests remain passing.

Three development live runs used 7, 7 and 8 generation calls respectively, plus one readiness call: **23 total provider requests**. Runtime comparisons below use only the final run; earlier attempts remain saved and are not represented as final acceptance.

## 12. Runtime

Seconds; single observations, not a controlled latency benchmark.

| Case | B16.1 | B17 | Difference | Under 30 s? | Under 60 s? |
|---|---:|---:|---:|---|---|
| Python | 10.383 | 9.113 | -1.270 | Yes | Yes |
| Statistics MinerU | 26.266 | 17.819 | -8.447 | Yes | Yes |
| Statistics Docling | 16.945 | 7.049 | -9.896 | Yes | Yes |
| Accounting | 5.824 | 4.268 | -1.556 | Yes | Yes |

Component timing in milliseconds:

| Case | Planning | Deterministic evidence | Provider wait | Validation | Assembly | Other/unattributed | Provider % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Python | 62 | 22 | 8722 | 150 | 15 | 142 | 95.7% |
| Statistics MinerU | 168 | 1054 | 5911 | 4753 | 0 | 5933 | 33.2% |
| Statistics Docling | 106 | 126 | 5563 | 542 | 0 | 712 | 78.9% |
| Accounting | 18 | 12 | 4065 | 57 | 3 | 113 | 95.2% |

Withheld cases report assembly 0 because the existing metric does not record completed assembly on a throw. Other time is explicitly retained, not incorrectly attributed to provider or validation. Projection recomputation increases deterministic work, especially for MinerU; no concurrency or extra generation loop was added.

## 13. Manual Reviewer quality

| Case | Source fidelity | Explanation | Repetition | Structured readability | Hierarchy | Study usefulness |
|---|---|---|---|---|---|---|
| Python | All required targets | Improved; no fallback | Lecture labels/near duplicates remain | Typed, but cached code is flattened | Source hierarchy retained | FAIL |
| MinerU | All required targets | Mostly concise | Large parent labels and cell duplication | Tables separated but noisy | Local/source order retained | FAIL |
| Docling | All required targets | Some result/presentation framing | Oversized passages/repeated tables | Formula/row material retained, still difficult | Frozen neighboring formula ownership remains | FAIL |
| Accounting | All 46 targets including ledger rows | Improved, direct subjects | Whole trial table fixed; cash near duplicate | Better tables; malformed source rows retained | Easy concept locations | FAIL |

Every final Reviewer/withheld candidate was inspected through the complete projected text and payload. The frozen harness's old text export omits the newly added field, so independent `*-complete-output.txt` and `*-visible.json` files explicitly include it. Final serialized target conservation and automatic usefulness were rerun. Device/browser screenshot acceptance is NOT RUN; no claim is made that native visual layout was manually accepted. Reader presentation tests and root mobile export/typecheck cover integration.

## 14. Full unchanged B12 rerun

**NOT RUN — targeted prerequisites failed**.
Python and Accounting fail manual usefulness. MinerU and Docling fail grounding/assembly and manual usefulness. Do not bypass this gate.

## 15. Simplicity gate

Architecture remains Plan → deterministic evidence → bounded explanation generation → validate → assemble. No provider factual regeneration; zero factual retries; no course/parser fixture branches; no threshold or omission-policy weakening; no new regeneration loop, concurrency, provider model or parser-default change. The projection is a conservative structural helper, not a replacement generator. Its limitations prevent overall B17 acceptance.

## 16. Verification

- FRESH engine typecheck/build/eval: PASS, 494/494.
- FRESH architecture: PASS, 45/45.
- FRESH API: PASS, 607/607, 69 files.
- FRESH reader presentation: PASS, 32/32.
- FRESH root typecheck and lint: PASS, 7 fresh / 0 cached each. Four pre-existing mobile import-order warnings, unchanged.
- FRESH root build: PASS, 7 fresh / 0 cached tasks (Expo exports and Next.js production build).
- Final diff check and full fsck: PASS; the same two pre-existing dangling blobs remain. Next.js regenerated `apps/api/next-env.d.ts` during build; that incidental generated change was restored before staging.
- The last post-live change makes the information-value check consume typed serialized evidence; it does not affect internal generation candidates, prompts, provider requests, output content or retries. Captured final outputs were re-audited with this change and fresh deterministic suites pass; no unnecessary additional live calls were made.

## 17. Files created/changed

Implementation (repository-relative paths):

```text
packages/engine/src/reviewer-evidence-presentation.ts (new)
packages/engine/src/reviewer-explanation-evidence.ts (new)
packages/engine/src/reviewer-evidence-assembly.ts
packages/engine/src/stage3-generate.ts
packages/engine/src/stage5-retry.ts
packages/engine/src/stage6-assemble.ts
packages/engine/src/types.ts
packages/engine/src/student-visible-text.ts
packages/engine/src/required-evidence.ts
packages/engine/src/stage5a-grounding.ts
packages/engine/src/semantic-verification.ts
packages/engine/src/leakage-guard.ts
packages/engine/src/reviewer-usefulness.ts
apps/api/src/lib/reviewers.ts
apps/mobile/src/features/reviewer/reviewerReaderPresentation.ts
apps/mobile/src/features/reviewer/ReviewerPreview.tsx
```

Tests: `packages/engine/evals/reviewer-deterministic-evidence.eval.ts` and `apps/mobile/src/features/reviewer/reviewerReaderPresentation.test.ts`.

Validation/docs: this new report; `docs/current-state.md`, `docs/roadmap.md`, `docs/ai/current_sprint.md`, `docs/ai/handoff.md` and appended continuation in `docs/ai/acceptance/b16/live-provider-runtime-validation.md`.

Ignored/private: diagnosis, provenance traces, per-section metrics, original serializer reproduction, source/preflight snapshots, 3 sets of provider captures, complete projected and withheld outputs, replay/independent audit, timing/retry/manual notes and all verification logs under `.local/b17/`. Pre-existing untracked `docs/ai/acceptance/b8/` untouched.

## 18. Git result

Implementation/tests: `39fb81211b0f8e48a24d6f29c41f4b9accdfbbb5` (`fix(engine): separate Reviewer evidence presentation from explanations`). This report and handoff form the subsequent `docs(ai): record B17 Reviewer presentation validation` commit; its final HEAD hash is recorded in the final response. After these two local commits: 18 ahead / 0 behind the existing origin/main tracking ref. No push. Historical reports preserved with an additive continuation link. Parser default legacy; production model **UNCHANGED (gpt-4o)**. No secrets or private acceptance artifacts staged. Final intended tree contains only the known pre-existing b8 untracked directory.

## 19. Verdict

**FAIL — generic Reviewer quality defect remains**

The repair preserves every frozen target and improves deterministic display and explanation cost, but the frozen manifest still entangles evidence payloads with repeated parent/lecture labels, the separate source-item omission contract still rejects Statistics, and cached code/layout damage remains visible. Those are observed causal defects, not provider-capacity failures; automated success in Python/Accounting is not a manual pass.

## 20. Next task

Repair the generic source-span/relationship ownership used to present composite manifest targets, with explicit projected-target and source-item alignment, then repeat the same four gates without changing the model or weakening validation.
