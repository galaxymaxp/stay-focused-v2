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

## B25.3 follow-up (2026-09-14)

The structural planner repair and synthetic regressions are recorded in [quiz-generation-repair.md](../quiz-generation-repair.md). Fresh post-change API, Mobile, Canvas, Engine, OCR, Shared, Workflow, provider-contract, forced typecheck, forced lint, and forced build gates passed. A single bounded live provider test on the pinned Quiz model accepted all five questions; its second allowed attempt was not used. Commit `04ddf26` was deployed to the existing production project, whose final deployment `dpl_6PnfPKwDZPyrCSq8NSN2Hfv8xV5c` reached `READY` at `https://stay-focused-v2-prototype.vercel.app`.

The realme RMX3151 remained authorized over ADB on Android 13. From Expo Go, a real Canvas lecture PDF prepared successfully and the authenticated Quiz request reached Generation. The orb remained responsive; leaving for Today did not cancel server work; Queue restored the job. The production workflow nevertheless exhausted its third bounded semantic-repair round with three of five questions accepted. Its exact terminal diagnostic was `repair_exhausted`; the two remaining questions failed `academicValue`, with one also failing `difficulty_mismatch`. Earlier rounds also recorded option/distractor, distinctness, leakage, explanation-grounding, and one answer-key-mismatch finding. No quality gate was bypassed.

Per the acceptance stop rule, no further provider attempt was made. An accidental second queued request was cancelled before processing. No Quiz artifact reached Library, so physical answer selection, pre-submit answer secrecy, scoring, result persistence, and reopen remain **unaccepted**. The existing PNGs remain historical B25.1 evidence; no private B25.3 academic screenshots were committed.

## B25.3.1 follow-up (2026-09-15)

The same realme RMX3151 / Android 13 restored the authenticated application and selected one ready real lecture PDF. Exactly one five-question mixed Quiz was submitted against deployment `dpl_3UxRUwZDy5iGgkX1j8HnLpJBqpnD`. Generation and its animated orb remained responsive, Queue loaded the owner-scoped history, and the newest Quiz opened to the generic failure detail.

The production workflow accepted only `q4`. Direct correction, full same-support reauthoring, and alternate-unused-support reauthoring left `q1`, `q2`, `q3`, and `q5` pending, terminal `repair_exhausted`. No retry was submitted. No Quiz artifact, attempt, score, result, or reopen exists to accept. Redacted-safe screenshots were retained outside the repository; no private course text, provider output, key, token, account ID, or device serial was committed. B25 remains **PARTIAL** and B26 was not started.


## B25.3.2 device status (2026-09-15)

The authorized realme RMX3151 (Android 13) was unlocked and its existing authenticated app session used to select the original ready material and submit exactly one Quiz. The Generation screen rendered its orb and later displayed "This generation couldn't finish" with the public Quiz failure message. View Queue opened and refreshed. Orb motion was not measured in this task, and the failed job's Queue row was not separately inspected. No success-path device acceptance is claimed. Temporary screenshot and navigation XML were deleted; the task Metro helper and ADB forwarding were stopped.

Because 5/5 generation did not complete and no Quiz persisted, Library Quiz open, production pre-attempt secrecy inspection, answering, submit, expected/actual score, result persistence and result reopen were not performed and remain unaccepted. Automated secrecy/scoring/owner-isolation gates passed; they do not substitute for physical production acceptance.

B25 remains PARTIAL; B26 may not begin. See [B25.3.2 report](../../b25.3.2/quiz-candidate-convergence.md).
