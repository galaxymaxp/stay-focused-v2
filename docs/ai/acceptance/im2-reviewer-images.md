# IM2 reviewer images — acceptance

Finite unattended IM2/N4 scope from `tmp/overnight/prompts/IM2.md`, baseline
1a9d3f9 on overnight/2026-10-15_feedback. Endpoint: IM2 only.

## Baseline and decisions

STEP 0 verified branch/HEAD and only the permitted unrelated untracked UI/,
apps/mobile/.gitignore and supabase/.temp/. All named image surfaces exist.
External/figure viewers use Sheet; snapshots use Modal. ReviewerReader uses
right-edge hold/drag scrubbing on its reader ScrollView. Isolate viewer gestures
in a Modal so image interaction cannot reach the reader scrubber.

The referenced overnight/roadmaps/2026-10-17-integrate-reviewer-generate-polish.md
was not found by local file search. The full prompt supplies the requirements;
this is a documentation gap with no implementation contradiction.

Chosen pattern: opening an image reveals details inside the viewer on all three
surfaces on both platforms. No extra Details toggle. Grounding stays visible
outside and inside; external source and license links are direct viewer actions.
Accessible thumbnail names retain image identity.

## Acceptance matrix (before implementation)

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Details hidden before opening; grounding and accessible names retained | Mobile/web images | Render tests | Pending |
| Attribution and direct source/license links when open | Mobile/web viewer | Render/link tests | Pending |
| Tall content scrolls; dismiss only at top and zoom 1; pinch/pan retained | Mobile viewer | Helper/responder/render tests | Pending |
| Android back and Reduce Motion | Mobile Modal | Render tests | Pending |
| Ask/Save exact targets, offline guards | Mobile/web | Existing SA2/IM1b suites | Pending |
| Scroll at all zoom levels; Esc/Close/backdrop | Web dialog | Render/event tests; native dialog semantics | Pending |
| Typecheck/lint/tests/API/Android/root builds/diff | Local gates | Fresh serial commands | Pending |
| Rollout and Device checks | Owner | Excluded by UNATTENDED | NOT RUN |

Production revisions, DB/Scheduler state and physical behavior are
UNVERIFIED (owner to confirm). No live verification is permitted in this run.
