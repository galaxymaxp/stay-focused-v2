# B25.3.3 architecture simplification

Date: 2026-09-16. Migration and live-material comparison complete; deployment and physical acceptance in progress. **B25 remains PARTIAL until production Quiz acceptance.** B26 may not begin.

## Starting state and isolation

- Repository: `C:/Projects/stay-focused-v2`, branch `main`, HEAD `d00a543`.
- Recorded remote comparison: 51 ahead / 0 behind; no push.
- Existing dirty mobile persistence/auth tests, Workflow tests, root package
  script and planning documents plus untracked design/acceptance/Supabase work
  were inspected and left untouched.
- `git fsck --full`: exit 0; dangling blobs only, no corruption reported.
- Independent clone: `b25-3-3-work`, branch `b25-3-3-ai-first`. Dependency
  junctions reuse installed packages. This is not a linked Git worktree.
- Existing production implementation: `79e54dd`; deployment
  `dpl_peVBgRctKVmGTfkNfQqTev74QCda`, freshly inspected READY. Canonical alias
  `https://stay-focused-v2-prototype.vercel.app`; fresh health
  `{"status":"ok","version":"2.0.0"}`. This records the starting deployment.


## Implemented architecture

Existing extraction/OCR -> ordered full source context -> OpenAI -> thin product contract -> bounded optional one repair -> owner-bound durable artifact -> existing mobile UI.

Reviewer synchronous routes, worker and durable Workflow all use runAIReviewer. The separate Workflow section-plan/generate/verify/retry implementation is removed. Historical engine semantic modules remain explicitly deprecated for old evaluations; no production caller uses them. Extraction, normalization, source blocks and provenance snapshots remain.

Quiz generates one complete set. Legacy blueprints, affordances, candidate pools, per-question repair and partial acceptance checkpoints are removed. Exact count, option/key structure, requested types, normalized exact duplicates and valid source IDs remain checked. The existing learner projection, SQL scoring, attempts and ownership contracts remain intact.

Activity retains deterministic assignment/link/material gathering and native/Office/OCR extraction. Local requirement/type/template semantic inference and independent semantic verifier are removed. AI interprets instructions/template precedence and returns sections or slides. Rubric data is not available in the existing assignment record; no new schema is introduced.

Durability: source context is frozen per job; whole contract-valid products are checkpointed. Call counts are reserved before provider requests and survive restart (two per product, one per coarse condensation group). A crash may consume a reserved call; the system fails truthfully rather than resetting the budget. Existing leases, cancellation checks and completion transactions prevent publishing cancelled work. Checkpoints never store rejected outputs. Transport retry remains separately bounded by the existing adapter.

## Fresh checks

| Suite | Result | Notes |
|---|---|---|
| API | PASS | 864 passed, 3 opt-in live tests skipped, 83 files |
| Mobile | PASS | 450, 38 files |
| Canvas | PASS | 73 |
| Engine | PASS | 606 historical/extraction cases |
| OCR | PASS | 27 |
| Shared | PASS | 44 |
| Workflow runtime | PASS on retry | 1; first run hit existing 1 ms sleep replay divergence |
| Provider contract | PASS | 19 |
| Root typecheck | PASS | 7/7, zero cached |
| Root lint | PASS | 7/7, four baseline mobile import-order warnings |
| Root build | PASS | 7/7, zero cached; local junction harness restored Metro configuration |

Test count changes: obsolete Quiz convergence/blueprint/candidate tests and Activity regex requirement/semantic-verifier tests were removed with their implementations. SQL scoring, RLS, ownership, API secrecy, Office extraction and cancellation tests remain. Eight new durable-budget tests were added. Mobile differs from the user's dirty-tree baseline because 32 unrelated persistence tests are outside this isolated HEAD checkout; the new reader badge test adds one to its 449 baseline. Shared 44 was reproduced in the final full run, correcting the earlier spike report's 22-case observation. Intermediate fixture/type/assertion failures were corrected; they were not production failures.

## Live material

See [comparison and inspection](real-material-generation-comparison.md). All three full sources generated Reviewers and five-question Quizzes; each final generation used one request. Activity followed the two-heading fixture. Initial prompt/model quality failures and remaining source defects are recorded there.

## Deployment and device

Pending at this commit. Starting deployment remains the rollback target. No B25 PASS is claimed before physical Quiz generation, Library, secrecy, attempt, authoritative score and reopen are accepted.

## Git and privacy

No push. Original dirty working tree remains untouched. Isolated branch b25-3-3-ai-first holds all work. No schema migration or secret changes. Temporary live source/output inspection files are removed; hashes and aggregate metrics remain. Source material is not added to Git or Vercel uploads.
