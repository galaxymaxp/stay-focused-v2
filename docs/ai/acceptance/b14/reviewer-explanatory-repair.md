# B14 Reviewer Explanatory Repair

Date: 2026-09-04 (Asia/Manila)

Verdict: **FAIL — B14 still has unresolved Reviewer acceptance defects**

This is an implementation and failed-acceptance report. No safe withholding is
counted as a usable Reviewer, and no replay is represented as a live provider
run.

## Starting state

- Branch: `main`.
- Starting HEAD: `f61e0dc420dbf665a5d0b8dc71549620d389c4af`.
- Working tree: only the protected untracked `docs/ai/acceptance/b8/`.
- Ahead/behind: 8 ahead / 0 behind `origin/main`.
- FRESH engine typecheck/build passed; evaluations **425/425**.
- FRESH API tests passed: **607/607 across 69 files**.
- `git fsck --full` passed with only the established dangling blobs
  `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391` and
  `625ec44ccb5695fe93ac518f09238fac61eca223`.

The required current-state and historical B12/B13 reports were read before
code changes. Historical acceptance files were not rewritten.

## Exact B13 failures reproduced

The ignored B13 structured inputs and terminal candidates were replayed at
starting HEAD. The replay reproduced B13; it made no provider calls.

| Case | Planned / retained | Coverage | Grounding | Missing manifest | Usefulness | Assembly |
| --- | --- | --- | --- | --- | --- | --- |
| Accounting/MinerU | 6 / 6 | 0.76 | 0.90 | 11 | Non-explanatory introduction | Withheld |
| Statistics/MinerU | 10 / 9 | 0.91 | 0.72 | 21, plus original semantic omissions | Instructional noise and source dumps | Withheld |
| Statistics/Docling | 11 / 11 | 0.97 | 0.81 | 4, plus original semantic omissions | Instructional noise and source dumps | Withheld |
| Python/Docling | 13 / 11 | 0.98 | 0.85 | 0 in retained candidates | Six instructional diagnostics; manual code/fragment defects | Withheld |

B14 planning audit then proved the missing-section boundary. The Statistics
MinerU broad heading and Python's comparison and regular-list sections each
contain one heading, zero non-heading blocks, zero required targets and zero
reviewable evidence characters. Python's two “Using” sections contain code but
no source prose from which an explanation can be written. No parser output was
changed and no adjacent child section was borrowed.

## Root cause

Existing types already distinguish required targets, supporting block IDs,
typed evidence/provenance and source roles. A new role model was not justified.
Consumption was defective at three boundaries:

1. Target repair repeated the full semantic plan, full manifest, detected items,
   typed evidence and passage, then repeated the missing target. This invited
   evidence-bundle output.
2. Usefulness-only retry replaced the whole section instead of merging the
   corrected field with already accepted evidence.
3. Stage 6 detected title tautologies and large points but not imperative,
   code-dominant, fragmentary or oversized explanation fields.

A fourth boundary cannot be repaired under frozen constraints: some planned
sections contain no explanatory source evidence. Filling them would require
outside knowledge, cross-section borrowing, a hierarchy/parser change, or a
weaker usefulness gate.

## Regressions added

The B14 suite is **12/12 FRESH PASS**. Total engine evaluations are
**437/437**, retaining all prior 425, including all 19 B13 cases.

| Regression | Before | After | Protects |
| --- | --- | --- | --- |
| Imperative explanations | Two generic forms escaped detection | All five structural variants fail | Learner-command explanations |
| Declarative verb sentence | Broad imperative experiment risked false positives | Passes | Concept prose |
| Code as explanation | Python and inline code passed | Both block and inline-dominant code fail | Explanation boundary |
| Code-backed explanation | Typed evidence risk | Prose plus code passes | Typed evidence |
| Fragmentary explanation | Gerund/preposition fragments passed | Four variants fail | Complete concise prose |
| Instructional dump | Grounded command paragraph passed | Fails usefulness | Disguised activity dump |
| Descriptive dump | Explanation field had no length check | Grounded 72-word passage fails | Useful compression |
| Protected evidence set | Formula/result/row/code/list could be over-rejected | All pass with useful prose | Exact evidence |
| Targeted completion | Full repair could displace good prose | Explanation retained; one point added | Narrow merge |
| Missing section recovery | Needed explicit survival proof | Source-supported absent output recovers | Section survival |
| Command key point | “Observe how …” escaped | Command removed; concept retained | Activity filtering |
| Concise explanation | New gates could penalize brevity | Short source-supported prose passes | Barebones contract |

The first implementation attempt caused 26 prior-evaluation failures by treating
all imperative-looking text and all blank explanations alike. It was rejected.
Field-aware checks and source-compatible behavior restored every prior case.

## Implementation

| File | Responsibility |
| --- | --- |
| `review-content.ts` | Field-aware imperative classification and generic surviving-command cues. |
| `reviewer-usefulness.ts` | `CODE_AS_EXPLANATION`, `FRAGMENTARY_EXPLANATION`, explanation-field dump checks and reusable useful-form predicate. |
| `stage3-generate.ts` | Concise explanation/typed-evidence instructions; missing-target repair serializes only the bounded target slice while retaining every source block ID. |
| `stage5-retry.ts` | Merges usefulness repairs as well as omission repairs, preserving valid explanation/evidence. |
| `stage6-assemble.ts` | Preserves B11 duplicate-diagnostic priority before new usefulness checks. |
| `reviewer-explanatory-repair.eval.ts` | Twelve focused B14 regressions. |
| `run-evals.ts` | B14 suite registration. |

The required-target schema, exact formula/value/row/relationship matching,
source-availability preflight, grounding and retry bounds are unchanged.

## Targeted candidate inspection after implementation

No B14 live provider calls were made. Current-code replay of the exact B13
candidates shows better diagnosis, not repaired generation:

| Case | Manifest represented / required | New deterministic findings |
| --- | --- | --- |
| Accounting/MinerU | 35/46 | One non-explanatory introduction; Ledger remains 8/19. |
| Statistics/MinerU | 211/232 | Two instructional and four source-dump diagnostics. |
| Statistics/Docling | 152/156 | Three instructional and four source-dump diagnostics, including an oversized explanation. |
| Python/Docling | 99/99 retained | Seven instructional and two code-as-explanation diagnostics. |

The Accounting capital row remains exact and represented. Mean, median, mode,
formula/result/table evidence remains source-available in both Statistics plans.
No candidate became final, so no after-output is claimed.

## Targeted results

### Accounting / MinerU

- Coverage 0.76; grounding 0.90.
- 11 issues, all omissions; zero detected fabrication.
- Manifest 35/46 overall; Ledger 8/19.
- Exact previously missing capital row: still represented from its source row.
- Sections 6 planned / 6 retained / 0 final.
- Assembly WITHHELD; usefulness FAIL (`NON_EXPLANATORY_SECTION`).
- B14 retries/calls: 0/0; saved B13 capture: 9/15.

### Statistics / MinerU

- Coverage 0.91; grounding 0.72.
- 23 issues, all omissions; zero detected fabrication.
- Manifest 211/232.
- Sections 10 planned / 9 retained / 0 final.
- Assembly WITHHELD; usefulness FAIL.
- B14 retries/calls: 0/0; saved B13 capture: 18/28.
- Mean/median/mode, formulas, results and tables remain available, but required
  targets are incomplete and worked material remains dump-like/instructional.

### Statistics / Docling

- Coverage 0.97; grounding 0.81.
- 8 issues, all omissions; zero detected fabrication.
- Manifest 152/156.
- Sections 11 planned / 11 retained / 0 final.
- Assembly WITHHELD; usefulness FAIL.
- B14 retries/calls: 0/0; saved B13 capture: 22/33.
- Mean/median/mode and typed evidence remain available; four manifest targets
  and original semantic items remain missing, with instructional/dump output.

### Python / Docling

- Coverage 0.98; grounding 0.84 after field-aware source classification.
- Zero grounding issues and zero detected fabrication in retained candidates.
- Manifest 99/99 in retained candidates.
- Sections 13 planned / 11 retained / 0 final.
- Assembly WITHHELD; usefulness FAIL.
- B14 retries/calls: 0/0; saved B13 capture: 24/37.
- Diagnostics: seven `INSTRUCTIONAL_NOISE`, two `CODE_AS_EXPLANATION`, zero
  fragment/dump diagnostics on the saved candidates. Fragment/dump regressions
  pass, but the saved content is not repaired merely by reclassification.
- Exact final titles: none because assembly is withheld. The exact 13 planned
  titles remain unchanged in B13.

## Full unchanged B12 rerun

**NOT RUN — targeted B14 acceptance prerequisites failed.**

Python cannot produce all planned explanatory sections from its section-bound
source: two sections are headings only and two code-only sections lack source
prose. All four replayed cases also remain withheld; three retain required
evidence omissions. Running the full live corpus could not cure that deterministic
precondition without violating frozen constraints.

## Missing-evidence safety

- Missing list target: exact source evidence required; source-absent refusal retained.
- Missing table row: exact row identity required; similar rows remain distinct.
- Missing numeric value: exact protected value required.
- Missing formula: exact formula required; transformations remain unsupported.
- Missing relationship: explicit source relationship required.
- Fabrication allowed: no.
- Required-section failure: complete Reviewer assembly is withheld.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| Engine baseline typecheck/build/eval | FRESH PASS, 425/425 | Before B14 changes. |
| API baseline tests | FRESH PASS, 607/607 | 69 files. |
| Focused B14 suite | FRESH PASS, 12/12 | Four categories failed before implementation. |
| Engine full eval | FRESH PASS, 437/437 | All 425 prior cases retained. |
| Final engine typecheck | FRESH PASS | Source, eval and live-run TypeScript projects. |
| Final engine build | FRESH PASS | Engine source and evaluations. |
| Final API tests | FRESH PASS, 607/607 | 69 files. |
| Root typecheck | PASS, 7/7 | Three fresh tasks, four cached. |
| Root lint | PASS, 7/7 | Three fresh, four cached; four established mobile warnings. |
| Root build | PASS, 7/7 | Three fresh, four cached; API and Expo exports passed. |
| `git diff --check` | PASS | No whitespace errors. |
| `git fsck --full` | PASS | Only the two established dangling blobs. |

## Files and Git

Implementation commit: `5b6f44fee07826fc5c4a0b1c73c66d10649ab6a9`
(`fix(engine): repair reviewer explanatory output`).

Ignored private artifacts: `.local/b14-inspect.mjs`,
`.local/b14-plan-audit.mjs`, and updated ignored B13 replay output. They contain
diagnostic/reproduction data and are not committed.

The protected B8 directory and all B12/B13 historical evidence remain
untouched. Parser default remains `legacy`; nothing was pushed.

## Final verdict

**FAIL — B14 still has unresolved Reviewer acceptance defects**

The single next task is to reconcile heading-only planned sections with the
source-faithful Reviewer contract—without parser-default changes, cross-section
fabrication, or weaker usefulness gates—before any further live acceptance run.
