# LM1 - Mobile course options by long press

## Frozen scope and baseline (2026-10-24)

LOCAL code/tests/docs/commits only, endpoint LM1. Read the complete LM1 prompt,
owner roadmap (including final LM1 decisions), screenshot, AGENTS.md,
AUTOPILOT.md, current plans, recent handoff, PBR-UX2 and UX3 acceptance.
No services, environment files, deploys, remote SQL, push or physical checks.

Branch: `overnight/2026-10-15_feedback`. Initial `git log --oneline -8`:

```text
58fbf6a0 docs(queue): close QN1 local verification
05102204 fix(queue): contain failure cards and group repeated attempts
394d4fa6 docs(queue): freeze QN1 failure card acceptance
5f6acd27 docs(readiness): record passing FS8 validation receipt
05017922 docs(readiness): close FS8 blocker supersession acceptance
5adcafc8 fix(verification): validate resume text against actual capture pixels
d30afbb3 fix(web): meet muted text contrast on the light page canvas
6175e8d2 docs(readiness): freeze direct FS8 repair and website audit scope
```

Initial `git status --short`:

```text
?? UI/
?? apps/mobile/.gitignore
?? supabase/.temp/
```

Preserve these owner paths and ignored tmp. Local upstream snapshot: ahead 3,
behind 27 against github/main; no fetch. Author galaxymaxp <omgraythekid@gmail.com>.

## STEP 0 source findings

`apps/mobile/src/design/CourseViews.tsx:62` renders `options` after the animated
card in a separate View with marginTop 4. `CourseOptions.tsx:59-64` renders the
48-point MoreHorizontal trigger there. Library passes it from
`LibraryScreen.tsx:215`; Generate current/hidden/past pass it at
`GenerateScreen.tsx:177,192,206`. Thus the dots are below the card by design,
outside SwipeRow clipping and transformed bounds; the reference matches this.
Removing the sibling also removes its 48-point height and four-point gap.

Exact source inventory (correction to preliminary verbal inventory):

| Surface | Existing sheet actions, in order |
| --- | --- |
| Library course | Pin or Unpin |
| Generate current, synced | Pin or Unpin; Hide; Unsync; Move to past courses |
| Generate current, not synced | Pin or Unpin; Hide; Move to past courses |
| Generate hidden | Show; Move to past courses |
| Generate past | Move to current |

All actions come from unchanged existing factories/callbacks, including their
confirmations and permissions. PinnedMark is a visible indicator, retained.
There is no separate always-visible mobile course Pin button; swipe Pin remains.
Web Library keeps Pin/Unpin; Generate keeps Move to past courses/Move to current.
Web source positions its independent trigger inside the top-right corner with
reserved title space and a separate bottom-right pin indicator. Verify actual
phone/tablet/desktop geometry in the local synthetic browser fixture before
deciding whether any web positioning repair is needed.

| Row | Requirement / proof | Initial result |
| --- | --- | --- |
| 0 | Branch/policy/source/action inventory and web bounds baseline | Source confirmed; browser pending |
| 1 | Mobile Library and all Generate groups: no dots, 400ms long press, light haptic, same sheet, tap only navigation, clean feedback cancellation | Pending |
| 2 | Options accessibility action plus retained existing actions, pin and owner/route closure | Pending |
| 3 | Web dots at all widths, inside card, clear of title/pin, independent navigation | Pending local browser proof |
| 4 | Focused/full mobile and web regressions; light/dark Library and three-width web screenshots | Pending |
| G | Fresh serial forced typecheck/lint, API/web builds, offline Android export, forced serial root build, both diff checks | Pending |
| C | Reconcile planning/handoff, local scoped commits, progress/status | Pending |

## Owner steps remaining

Rollout and Device checks NOT RUN, skipped entirely. Owner: Realme Library and
Generate long-press options, next fullsend, native assistive technology/haptics.
FS10 served revision, production/database/Scheduler/provider state and physical
acceptance are UNVERIFIED (owner to confirm); source/docs alone establish no
live claim. No hint banner, new actions, data/schema/controller or other backlog
work belongs to LM1.
