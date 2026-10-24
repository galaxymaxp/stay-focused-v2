# WEB-A4: website release readiness and FULLSEND handoff

2026-10-25. Branch overnight/2026-10-15_feedback after WEB-A3 (543c87d8).
**LOCAL PASS: ready for the next FULLSEND.** No push, deploy or migration in
this task.

## Release preflight

| Check | Result |
| --- | --- |
| Mandatory readiness validator, `node fullsend/readiness.js --root <overnight> --repo <work>` | exit 0, `ready: true` at 543c87d8, baseline FS11 (PASS), no unresolved queue items, no blockers; rerun at the final documentation commit below |
| Previous release | FS11 / FULLSEND 20261025-0127 PASS: main 30f378bd, docs 2e01a62a; Release quality CI 40118380043 and 40119720781 SUCCESS |
| Branch versus `github/main` | 5 ahead (WEB-A2/A3) + this report; 29 behind, all release merges, release records and FS10's 2.4.0 version commits already on main |
| Merge simulation, `git merge-tree --write-tree HEAD github/main` | Conflicts only in the top entries of `docs/ai/current_sprint.md`, `docs/current-state.md`, `docs/roadmap.md`; resolve by keeping both sides, as FS11 did. No code conflict |
| What ships (`git diff d2a45bb2 HEAD`) | Website: D1 draft reload fix and D2 copy (`apps/web/src/features/library.tsx`, `own-material.tsx`, `reviewer/topic-assist.tsx`), new `draft-editor.test.ts`; browser harness/fixture; docs |
| Migrations | None |
| Worker inputs (`infra`, `packages/shared|engine|ocr|db`, `apps/api/src/lib`) | Unchanged: worker redeploy not required |
| Mobile (`apps/mobile`, native config) | Unchanged: no APK; an OTA would carry no app change |
| API (`apps/api`) | Unchanged; its git production deployment from main is harmless |
| Website | Changed: needs the clean-main CLI production deployment (main only produces a website preview, as in FS10/FS11) |
| Tracked dirty files | None; untracked owner artifacts are the pinned left-local set |

## Gate evidence

Application gates are **CACHED** from WEB-A3: every application and tooling
tree is byte-identical between the tested implementation commit 614138c7 and
this HEAD (`apps` 0e674239, `packages` 194c6242, `scripts` b163cf11; `git diff
614138c7 HEAD -- apps packages scripts infra supabase` is empty). The WEB-A3
FRESH results therefore apply unchanged: forced typecheck, lint and serial
root build 8/8 with 0 cached; web 651/651 (83 files, serial); API, website
(23/23 pages) and offline Android export builds; browser harness default,
generation and task-sync modes PASS. See
[WEB-A3](web-a3-website-repairs.md) and [WEB-A2](web-a2-browser-verification.md).
Re-running identical builds would add no evidence. The FULLSEND run's own
STEP 1 gates repeat everything fresh in a clean clone before anything goes
live.

FRESH in this task: readiness validator, merge simulation, `git diff --check`
and `git diff --cached --check` at commit.

## Production acceptance checklist (after the next FULLSEND)

Run on https://stay-focused-ten.vercel.app signed in as the owner, then mark
each PASS / FAIL in the release report:

1. `/api/health` through the website reports the new main commit.
2. Library → an activity draft: edit a section, Save draft, reload the page.
   The saved text is shown (D1).
3. Generate → Your own material → Upload a file: the hint reads "or click to
   choose · Documents up to 10 MiB…", progress reads "Uploading source… N%";
   with pasted notes the button reads "Starting…" while submitting (D2).
4. Reviewer → Study Assist on a paragraph: the loading line reads "Creating
   your explanation…" (D2).
5. Today → Clock options → Plan with: Reviewers / Tasks / Reviewers & tasks;
   the choice survives a reload (carried over from FS11's pending checks).
6. Light and dark at phone, tablet and desktop widths: no horizontal scroll on
   Today, Generate, Library, Queue and Settings.
7. Vercel runtime errors for both projects stay at zero after the deploy.

Real browsers other than Chromium, real phone browsers, screen readers and live
Canvas remain UNVERIFIED until the owner runs this list.

## FULLSEND handoff

Press **FULLSEND** in the Autopilot panel (or ask Claude Code to run it). Expect:
STEP 0 readiness `ready: true`; merge `origin/main` keeping both sides of the
three planning-document top entries; STEP 1 fresh gates; STEP 2 migrations
"none"; STEP 4 "worker unchanged, not redeployed"; STEP 5 API from git plus a
clean-main CLI website production deployment; STEP 6 OTA optional (no mobile
change); STEP 7 the checklist above.

Known separate items, not blockers for this website release: mobile
`ReviewerGenerateScreen.tsx:145` still shows "Uploading source?" (same as D2);
WEB-A1's historical STOPPED status remains, superseded by WEB-A1b.
