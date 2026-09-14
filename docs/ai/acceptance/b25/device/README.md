# B25.1 physical-device acceptance

Tested on a realme RMX3151 running Android 13 through the authenticated Expo application on 2026-09-14.

## Result

**PARTIAL — B25 implementation works but acceptance remains incomplete.**

## Hosted experience-read repair

Commit `2de5e38` binds the trusted Supabase read repository to the user ID returned by bearer-token verification. The server client is created only after authentication succeeds, every owner-scoped query applies `user_id = authenticatedUserId`, returned rows are filtered defensively, and route/query/body user IDs cannot replace the verified identity. The boundary exposes reads only; RLS, grants, and mutation paths were not changed.

The repair was deployed from a clean worktree as Vercel production deployment `dpl_Bf9mmJpP7KvDxFg212AHQXBGmRJo` and aliased to `https://stay-focused-v2-prototype.vercel.app`.

## Post-repair physical acceptance

- Today loaded the authenticated owner's real timeline and planner data.
- `/api/experience/courses` loaded the owner's courses. Selecting an account course enabled its real Canvas materials.
- Reviewer generation completed through the hosted workflow. Leaving Generation did not cancel it; Queue recovered it, and the persisted Reviewer opened from Library without regenerating.
- Activity Maker generated a draft from a real activity. The draft opened in Library, accepted an edit, and saved a new revision.
- Two ready materials reached hosted Quiz generation. Both were rejected by the existing non-retryable `quiz_generation_failed` validation gate, so Quiz attempt/result acceptance remains incomplete.
- The Android vibrator service recorded a completed 10 ms `TOUCH` vibration from `host.exp.exponent` during ring hold-and-drag. The accessible fifteen-minute controls also updated the availability window and produced a planner preview without applying it.

## Verification

- Focused owner-isolation tests: 31 passed.
- API: 913 passed, 3 skipped.
- Mobile: 477 passed.
- Canvas: 73 passed.
- Engine: 606 passed.
- OCR: 27 passed.
- Shared: 44 passed.
- Workflow runtime: 1 passed.
- Typecheck, lint, and build: 7/7 each, zero cached.

## Evidence

The PNG files in this directory record the initial physical rendering and pre-repair hosted failure state. New populated post-repair screenshots were intentionally not committed because they contain private academic titles. Queue screenshots were also withheld for the same reason.

No screenshot in this directory contains Canvas course, assignment, material, or artifact titles.
