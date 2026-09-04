# B15 Evidence-Supported Reviewer Section Planning

Date: 2026-09-04 (Asia/Manila)

## 1. Starting state

- Branch: `main`.
- Starting HEAD: `55547b285250ec0d39acb8877fbc4728d0db7f6f`.
- Working tree: only the pre-existing untracked `docs/ai/acceptance/b8/`.
- Ahead/behind: 10 ahead / 0 behind `origin/main`.
- Engine baseline: fresh typecheck/build and 437/437 evaluations passed.
- API baseline: fresh 607/607 tests across 69 files passed.
- Git fsck: passed except the established dangling blobs `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and `625ec44ccb5695fe93ac518f09238fac61eca223`.

The required current-state, sprint, roadmap, handoff, B13 and B14 reports were
reviewed before implementation. Frozen B12 Python, Statistics/MinerU,
Statistics/Docling and Accounting/MinerU structured evidence was inspected but
not modified. Production parser selection remained `legacy`.

## 2. B14 planning defect reproduced

The defect was reproduced from Stage 1/semantic structure and the Stage 2 plan,
not inferred from generated Reviewer output. Before B15 every detected section
below was planned as a normal standalone section.

| Case | Source heading | Local evidence | Current plan | Problem |
| --- | --- | --- | --- | --- |
| Statistics / MinerU | `A. MEASURES OF CENTRAL TENDENCY` | Heading only; 0 local text, 0 typed blocks, 0 required targets | Standalone | Required an explanation with no source support |
| Python / Docling | `GENERATOR FUNCTION vs GENERATOR EXPRESSION` | Heading only; 0 required targets | Standalone | Could only repeat the title or fabricate prose |
| Python / Docling | `Using a Regular List` | Heading only; 0 required targets | Standalone | Could only repeat the title or fabricate prose |
| Python / Docling | `Using Generators` | Code only; 1 code block and 1 required target | Standalone | Code could be preserved, but could not support prose |
| Python / Docling | `Using a Generator Expression` | Code only; 2 code blocks and 2 required targets | Standalone | Code could be preserved, but could not support prose |
| Accounting / MinerU | `LEDGERS AND THE UNADJUSTED TRIAL BALANCE` | Author line and numbered agenda; no explanatory sentence; 1 required target | Standalone | Presentation structure was being asked to masquerade as an explanation |

No sparse table-only or formula-only node occurs as an independent heading in
the four frozen parser outputs. Those cases were reproduced with focused typed
fixtures. Statistics and Accounting formula/table sections also contain local
explanatory prose and therefore remain standalone.

## 3. Source-node evidence audit

All parser-provided conceptual hierarchies are flat in these saved B12 outputs,
so their source hierarchy depth and child-section count are zero for every
node. This is recorded honestly; B15 does not invent parentage. The focused
parent/child fixture separately proves true source-established hierarchy.

| Case | Hierarchy nodes | Locally explanatory | Heading-only | Typed-only | Structural nodes | Unsupported leaves |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | 13 | 9 | 2 | 2 | 0 | 2 |
| Statistics / MinerU | 10 | 9 | 1 | 0 | 0 | 1 |
| Statistics / Docling | 11 | 11 | 0 | 0 | 0 | 0 |
| Accounting / MinerU | 6 | 5 | 0 | 0 | 1 | 0 |

The Accounting introduction is structural source material rather than a
heading-only leaf. Across every node, the audit also recorded local text/typed
block counts, required-manifest counts, semantic explanation usefulness,
disposition reason and parent identity in ignored local evidence.

## 4. Root cause

The invalid invariant was: every meaningful detected heading is equivalent to
a standalone Reviewer section and therefore must produce explanatory prose.
Source hierarchy, explanatory support and typed study evidence are distinct.
Stage 2 did not encode that distinction, so downstream generation was asked to
invent prose for valid structure or evidence-only regions.

## 5. Planning policy

Stage 2 now applies a deterministic local-source support classifier:

- `standalone`: the node owns a locally explanatory non-heading source block.
  Detection uses source kind, relational/explanatory language and sentence
  form; it is not a raw character threshold. Concise clauses such as the three
  Accounting method descriptions remain supported.
- `typed-evidence`: no explanatory prose exists, but the node locally owns
  code, formula or table evidence. Stage 3 creates an exact deterministic
  source representation with an empty explanation and makes no provider call.
- `structural`: the node has source-established children or meaningful local
  structure/semantic evidence but cannot support an explanatory sentence. It
  retains its title, ownership, reason and deterministic representation without
  consuming generation or retry calls.
- `unsupported`: a heading-only leaf with no local review content. It remains
  explicit in the plan and final representation contract rather than acquiring
  borrowed or fabricated prose.

Local evidence excludes headings, furniture and images. A sibling's text never
participates. Existing sections containing multiple meaningful headings keep
the prior standalone path as a compatibility/safety gate so B11's oversized
hidden-transition rejection cannot be bypassed. Presentation-furniture titles
also retain existing validation. Missing required evidence still fails.

## 6. Regressions added

| Regression | Before | After | Protects |
| --- | --- | --- | --- |
| Heading-only parent with supported children | Parent required prose | Parent structural; children standalone | Hierarchy without fabrication |
| Heading-only leaf | Standalone | Explicit unsupported leaf | No title-only invention |
| Code-only heading | Standalone/provider call | Exact typed representation; zero call | Code locality and B14 code-as-explanation |
| Formula-only heading | Standalone/provider call | Exact typed representation; zero call | Quantitative evidence retention |
| Table-only heading | Standalone/provider call | Exact table/row representation; zero call | Table and ledger fidelity |
| Concise explanatory section | At risk of sparse demotion | Standalone | No crude length threshold |
| Container conversion ownership | Unspecified | Target count and owner retained | Manifest integrity |
| Sibling borrowing | Unspecified | Heading A remains unsupported | Section locality |
| Parent-child locality | At risk of duplication | Child block stays child-owned | No fabricated parent summary |
| Structural assembly | Empty explanation rejected | Valid representation assembles | Structure is not forced prose |
| Required supported parent | Could be hidden by classification | Remains standalone | No structural escape hatch |
| Frozen usefulness examples | B14 baseline | Imperative/code/fragment/dump fail; concise passes | B14 policy unchanged |

The focused suite was added red first (1/12 passed, 11/12 failed), then passed
12/12 after implementation. Full engine: 449/449, including B13 19/19 and B14
12/12.

## 7. Implementation

| Changed file | Responsibility |
| --- | --- |
| `packages/engine/src/reviewer-section-support.ts` | Local evidence classifier and provider-generation predicate |
| `packages/engine/src/types.ts` | Optional disposition, reason, parent and count metadata |
| `packages/engine/src/stage2-plan.ts` | Classifies planned nodes and records hierarchy/count metadata |
| `packages/engine/src/stage3-generate.ts` | Creates exact deterministic non-standalone representations |
| `packages/engine/src/stage4-verify.ts` | Verifies representation, ownership and required evidence |
| `packages/engine/src/stage5a-grounding.ts` | Grounds non-standalone representations without prose requirements |
| `packages/engine/src/stage5-retry.ts` | Reserves retries for standalone sections |
| `packages/engine/src/stage6-assemble.ts` | Accepts valid structural/typed/unsupported representations and reports counts |
| `packages/engine/src/generate.ts` | Counts only actual provider-bound initial generation calls |
| `packages/engine/src/index.ts` | Exports the support boundary |
| `packages/engine/evals/reviewer-section-planning.eval.ts` | Adds the 12 focused B15 cases |
| `packages/engine/evals/run-evals.ts` | Registers the B15 suite |
| `apps/mobile/src/features/reviewer/reviewerReaderPresentation.ts` | Renders typed/unsupported representations without labeling empty structure as a generation failure |

No parser, extraction provider, prompt policy, grounding threshold or frozen
usefulness threshold changed.

## 8. Required-evidence ownership

| Case | Targets before | Targets after | Targets with owners | Targets lost | Ownership changes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Python / Docling | 99 | 99 | 99 | 0 | 0 |
| Statistics / MinerU | 232 | 232 | 232 | 0 | 0 |
| Statistics / Docling | 156 | 156 | 156 | 0 | 0 |
| Accounting / MinerU | 46 | 46 | 46 | 0 | 0 |

Classification is applied after the same section-local manifest is built; it
does not move targets. Structural Accounting retains its one agenda target.
Python typed nodes retain 1 and 2 code targets under their original headings.

## 9. Python classification

The fresh run was ultimately withheld, so “final representation” below means
the deterministic planned representation that reached validation, followed by
its withheld student-visible status.

| Source heading | Classification | Local support | Final representation |
| --- | --- | --- | --- |
| Unit 5: Generators in Python | Standalone | 4 text blocks; 3 targets | Generated explanatory section; Reviewer withheld |
| ITERATORS | Standalone | 20 text, 3 code; 22 targets | Generated explanatory section; Reviewer withheld |
| GENERATORS | Standalone | 15 text; 11 targets | Generated explanatory section; Reviewer withheld |
| Yield Command | Standalone | 1 text, 1 code; 1 target | Generated explanatory section; Reviewer withheld |
| GENERATOR FUNCTION vs GENERATOR EXPRESSION | Unsupported | Heading only; 0 targets | Explicit unsupported marker; Reviewer withheld |
| Generator Expressions | Standalone | 9 text, 2 code; 12 targets | Generated explanatory section; Reviewer withheld |
| The next() function | Standalone | 8 text, 1 code; 8 targets | Generated explanatory section; Reviewer withheld |
| Generator Functions | Standalone | 14 text, 3 code; 16 targets | Generated explanatory section; Reviewer withheld |
| Using a Regular List | Unsupported | Heading only; 0 targets | Explicit unsupported marker; Reviewer withheld |
| Using Generators | Typed evidence | 1 code block; 1 target | Exact code evidence, empty explanation; Reviewer withheld |
| Using a Generator Expression | Typed evidence | 2 code blocks; 2 targets | Exact code evidence, empty explanation; Reviewer withheld |
| Infinite Sequences | Standalone | 13 text, 1 code; 12 targets | Generated explanatory section; Reviewer withheld |
| Sending objects to a Generator | Standalone | 10 text, 2 code; 11 targets | Generated explanatory section; Reviewer withheld |

- Fabricated explanations: 0 detected.
- Sibling evidence borrowing: 0 detected; classifier and regression are local.
- Code-as-explanation: 0 for the two typed-only nodes.
- Meaningful headings lost: 0 from hierarchy/plan; final Reviewer was wholly withheld by safety policy.
- Required targets represented/required: 99/99.

## 10. Accounting result

- Source hierarchy nodes: 6.
- Standalone / structural / typed / unsupported: 5 / 1 / 0 / 0.
- Coverage: 0.76, failed.
- Grounding: 0.88, failed.
- Issues / omissions / fabrications: 11 / 11 / 0; relationship failures 0.
- Manifest represented/required: 35/46.
- Exact capital-row result: `15.9.17 | To Capital A/C | XXXX |  |  |` and the corresponding `By Cash A/C` row were represented. The separate `CapitalA/C` header row was omitted; it was not invented.
- Introduction: structural with reason `source-structure-without-explanatory-prose`; no generic accounting explanation was generated.
- Ledger/table structure: retained in source and manifest; 11 Ledger rows were omitted by generated SourceCore.
- Generated outputs / final sections: 6 total outputs (5 provider-backed, 1 deterministic) / 0.
- Assembly: failed safely on Ledger coverage.
- Usefulness: not accepted; assembly stopped on failed coverage before a final Reviewer.
- Retries/calls: 9/14; the structural introduction consumed neither an initial call nor retries (5 initial standalone calls).

## 11. Statistics MinerU result

- Source hierarchy nodes: 10.
- Standalone / structural / typed / unsupported: 9 / 0 / 0 / 1.
- Coverage: 0.91, failed because one or more required sections remained incomplete.
- Grounding: 0.80, failed.
- Issues / omissions / fabrications: 23 / 23 / 0; relationship failures 0.
- Manifest represented/required: 211/232.
- Generated outputs / final sections: 10 total outputs (9 provider-backed, 1 deterministic) / 0.
- Assembly: failed; the final usefulness gate also identified instructional noise in `a. Computation of the Median for Ungrouped Data`.
- Usefulness: failed.
- Retries/calls: 18/27; the empty broad heading consumed neither an initial call nor retries (9 initial standalone calls).
- Mean, median and mode headings remained source-supported standalone sections. Formulas, formula results, tables and worked examples remained required and locally owned; 21 required formula/result targets were still omitted after bounded repair.
- Broad heading: explicit unsupported empty leaf. MinerU supplied only the heading, so no explanation was manufactured.

## 12. Statistics Docling result

- Source hierarchy nodes: 11.
- Standalone / structural / typed / unsupported: 11 / 0 / 0 / 0.
- Coverage: 0.97, failed because required sections remained incomplete.
- Grounding: 0.81, failed.
- Issues / omissions / fabrications: 8 / 8 / 0; relationship failures 0.
- Manifest represented/required: 152/156.
- Generated outputs / final sections: 11/0.
- Assembly: failed; Stage 6 also rejected a source-dump explanation in `2. THE MEDIAN`.
- Usefulness: failed.
- Retries/calls: 22/33 (11 initial standalone calls).
- Mean, median and mode, formulas/results, tables and worked examples remain in the source plan. Four required formula/result targets remained omitted after bounded repair.
- Broad heading: supported by 3 local text and 2 typed blocks in Docling, so it honestly remains standalone.

## 13. Python result

- Coverage / grounding: 1.00 / 1.00, both passed.
- Issues / fabrications: 0 / 0; required omissions and relationship failures 0.
- Source hierarchy nodes: 13.
- Standalone / structural / typed / unsupported: 9 / 0 / 2 / 2.
- Manifest represented/required: 99/99.
- Generated outputs / final sections: 13 total outputs (9 provider-backed, 4 deterministic) / 0.
- Assembly: failed at the frozen usefulness gate.
- Usefulness: failed because an `ITERATORS` key point retained learner-directed instructional noise.
- Activity leakage: detected by `INSTRUCTIONAL_NOISE` and rejected.
- Code-as-explanation: none for typed-only nodes.
- Fragments: no final fragment diagnostic.
- Source dumps: no final source-dump diagnostic in this run.
- Retries/calls: 16/25; four source-insufficient nodes consumed no initial calls or retries (9 initial standalone calls).

## 14. Full unchanged B12 rerun

NOT RUN — targeted B15 acceptance prerequisites failed

Failed prerequisites: all four fresh targeted Reviewers were withheld. Python
failed usefulness; Statistics/MinerU failed grounding/completion and
usefulness; Statistics/Docling failed grounding/completion and usefulness;
Accounting failed coverage/grounding. Running the full frozen contract after
those results would violate the ordered acceptance gate.

## 15. Missing-evidence safety

- Heading-only section: explicit unsupported leaf; no provider call, retry or invented explanation.
- Code-only section: exact typed representation with empty explanation; no provider call or retry.
- Formula-only section: exact typed representation remains owned; no invented prose.
- Table-only section: exact block and row representations remain owned; no invented prose.
- Missing list target: omission remains a grounding failure and can withhold assembly.
- Missing table row: omission remains a coverage/grounding failure; Accounting was withheld.
- Missing numeric value: existing typed hardening rejects it; B15 did not relax the gate.
- Missing formula: remains a required-evidence omission; both Statistics runs were withheld.
- Missing relationship: relationship verification remains section-local; no targeted run accepted one.
- Required-section failure: structural classification cannot hide source-supported content; the regression keeps such a section standalone and assembly still fails when its content is incomplete.

## 16. Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm run typecheck --workspace @stay-focused/engine` | PASS | Fresh |
| `npm run build --workspace @stay-focused/engine` | PASS | Fresh |
| `npm run eval --workspace @stay-focused/engine` | PASS | Fresh 449/449; B15 12/12, B14 12/12, B13 19/19 |
| `npm test --workspace @stay-focused/api` | PASS | Fresh 69 files, 607/607 |
| `npm run typecheck` | PASS | 7/7; 3 fresh, 4 Turbo-cached |
| `npm run lint` | PASS | 7/7; 3 fresh, 4 cached; only four established mobile import-order warnings |
| `npm run build` | PASS | 7/7; 3 fresh, 4 cached |
| Fresh targeted provider harness | FAIL acceptance | Four exact cases run; all safely withheld; private captures ignored |
| Full unchanged B12 rerun | NOT RUN | Targeted prerequisites failed |
| `git diff --check` | PASS | No whitespace errors |
| `git fsck --full` | PASS with known exceptions | Only the two established dangling blobs |

## 17. Files created/changed

B15-owned committed implementation files are the 13 files listed in section 7.
Committed documentation is this report plus `docs/ai/current_sprint.md`,
`docs/current-state.md`, `docs/roadmap.md` and `docs/ai/handoff.md`.

Ignored/private artifacts: `.local/b15-plan-audit.mjs`,
`.local/b15-debug-oversized.mjs`, `.local/b15-safe-summary.mjs` and
`.local/b15-targeted-final/`, including provider payloads.

Pre-existing untouched files: untracked `docs/ai/acceptance/b8/`; all tracked
B8/B12/B13/B14 historical reports and private/secret files.

## 18. Git result

- Final HEAD: the documentation commit containing this report; the exact hash is reported in the final handoff.
- Commits: implementation `b68bbdb` (`fix(engine): plan only evidence-supported reviewer sections`) and the documentation commit containing this report (`docs(ai): record B15 reviewer section-planning acceptance`).
- Working tree: only pre-existing untracked `docs/ai/acceptance/b8/` expected.
- Ahead/behind: expected 12 ahead / 0 behind after both commits.
- B8 untouched: yes.
- B12/B13/B14 preserved: yes.
- Parser default changed: no; remains `legacy`.
- Secrets committed: no.
- Pushed: no.

## 19. Verdict

**FAIL — B15 still has unresolved Reviewer planning or acceptance defects**

Single next task: repair source-supported required-evidence completion and
student-visible usefulness for the exact four targeted cases without changing
B15 dispositions, evidence ownership, parser defaults, grounding thresholds or
frozen B13/B14 gates; then rerun targeted acceptance before full B12.
