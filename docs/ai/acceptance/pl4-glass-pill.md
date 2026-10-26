# PL4 vector GlassPill — acceptance

Status: IN PROGRESS. Finite unattended scope: STEP 0–5, local gates, docs and
atomic local commits. Rollout and Device checks are skipped entirely. No remote
services, database application, environment-file edits, push or deployment.

## Baseline and STEP 0 inventory

Branch `overnight/2026-10-15_feedback`, HEAD `31a3d50a`; upstream github/main
ahead 22 / behind 32 (local refs only). PL3.status is PASS and canonical docs
record PL3 LOCAL PASS. Current branch agrees with the recent canonical entries;
the old main reference describes the separate C:/Projects checkout.

```text
31a3d50a docs(today): close PL3 block action verification
d3633495 fix(today-mobile): release edit state after cancelled block drag
6ee0f5e1 test(today): use complete saved timeline fixtures
fa02dc47 fix(today): normalize saved reviewer action keys
7d3133a3 test(today): prove block actions in local Chromium
4e266a13 fix(today): preserve saved block action identities
7e08db36 feat(today-mobile): long-press reorder of plan blocks
ddc8b981 feat(today-mobile): swipe to skip or remove with undo
```

`git status --short` contains only untracked owner paths: UI/,
apps/mobile/.gitignore, supabase/.temp/. Preserve these; never stage tmp/.
Read AGENTS.md, CLAUDE.md, AUTOPILOT.md, current planning entries and newest
handoff. Approved roadmap D1–D15 and Pills.dc.html/Main.dc.html inline styles
read in full from C:/Users/Fely Max Dilinila/Claude/Projects/Stay Focused/overnight/roadmaps/.

- Mobile PlanButton owns focus/AppState/load gate/GL and fallback; fallback uses
  orb palette and clock fonts. PlanGlassView owns the Expo GL context and atlas;
  planPill exports only radius 26. PlanButton.test, PlanButton3d.test and
  PlanGlassView.test cover only this obsolete button. PlanningControl opens the
  existing sheet. TodayScreen already tracks ringActive for handle drags.
- Web plan-button loads PlanGlassCanvas via DayOrb's re-export/preload promise.
  plan-glass.browser.test is solely the old button's GL proof. TodayScreen
  toggles the existing inline adjust panel; add aria-expanded to the new pill.
- git grep of every plan-glass-renderer export (planImpulse, PLAN_GLASS_FIT,
  createPlanShell, PlanGlassFrame, createPlanGlass, createPlanGlassLoop) finds
  only its own tests and the two old adapters. Delete those button-only files
  and the package subpath. No orb, Queue or Generation importer uses them.
- There is no plan-liquid.ts. plan-liquid.test.ts exercises createOrbBody and
  pins the orb fragment bytes; keep it, the shared orb renderers, glass atlas
  loader, clock fonts and orb interaction implementations unchanged.
- Mobile GenerateMaterialScreen: existing generate(reviewer|quiz), busy,
  submitting ref, reviewerSubmitted and quiz submitting screen; primary Action
  for reviewer and secondary Action for quiz. Keep durable admission/grace
  navigation. Web MaterialScreen: generate/useAction reviewer handler plus
  existing secondary Remake confirmation and QuizForm options/submit handler.
- Tasks: mobile ActivityScreen create()/busyRef/busy; web ActivityDetail
  createDraft()/draft.busy. Replace only their draft primary action.
- Library reviewer: mobile ReviewerHeader/ReviewerReader opens existing
  QuizFromReviewerSheet with next()/busy; web ReviewerHeader/ReviewerReader
  opens QuizFromReviewerDialog with create()/busy. Keep existing quiz settings.
- Existing responses expose reviewerArtifactId but no material quiz-existence
  metadata; reviewer summaries initialize relatedArtifactIds empty. Add minimal
  owner-scoped linked-quiz metadata to existing responses, no new client fetch
  or generation behavior. Older API responses safely retain an available action.
- expo-linear-gradient is absent; Expo bundledNativeModules specifies ~57.0.2.
  Add that native gradient dependency with expo install (no alternative native
  gradient component is installed). Small mobile visual height stays 34 while
  its outer touch target is at least 44.

## Acceptance matrix

| Decision / requirement | Owning layer / proof | Result |
| --- | --- | --- |
| D13 vector only, clipped highlight, exact sizes/themes | CSS/native components + browser/tree tests | PENDING |
| D13 busy/disabled/focus/Reduce Motion and >=44 native targets | Component/browser tests | PENDING |
| D13 Today count, Updating… while dragging, accessible action remains | Today/PlanningControl + closest tests | PENDING |
| D13 delete proven button-only renderers; preserve orb/Queue/Generation | git grep inventory + regression suites | PENDING |
| D14 Generate one pill for reviewer/quiz/busy/completed states | Both platform state/handler tests | PENDING |
| D14 Tasks draft handler and busy label | Both platform screen tests | PENDING |
| D14 Library small quiz pill/busy/hidden for existing quiz | Both headers + existing quiz flow tests | PENDING |
| D1 monochrome; D2 clock renderer/gesture unchanged | Owned diff + styles review | PENDING |
| D15 code/local commits only, no sync/Library refetch | Request assertions + diff review | PENDING |
| 300% web edges and clipped highlight | Local Chromium captures | PENDING |

## Verification

Fresh serial commands and exact counts will be recorded here. Evidence only in
tmp/overnight/PL4; preserve first failures and reruns. Repo-local temporary and
cache paths, dotenv/telemetry off, credential stripping and loopback guards.

## UNVERIFIED and Owner steps remaining

Live FS12/served revision, database, Scheduler/provider state: **UNVERIFIED
(owner to confirm)**. No permitted local code check requires remote access.

- Rollout **NOT RUN**, skipped entirely: owner FULLSEND after PL4 PASS.
- Device checks **NOT RUN**, skipped entirely: Realme pill sharpness at 3×,
  placements, native accessibility/Reduce Motion/appearance/performance.
- Native fidelity, other real browsers/assistive technology: **UNVERIFIED
  (owner to confirm)**.
