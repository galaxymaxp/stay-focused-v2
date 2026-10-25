# QL1 Queue miniature: acceptance

Scope frozen 2026-10-25 at `06e64db4`, branch
`overnight/2026-10-15_feedback`. TP2d prerequisite PASS is established by
Git and its acceptance report. Unattended rules prohibit remote services,
deployment, database work, env-file access, push and device checks.

## STEP 0: baseline before implementation

FRESH inventory: the only Queue orb mark is the shared header control on each
platform. Web `apps/web/src/components/queue-button.tsx` uses
`features/knowledge-core/OrbStill.tsx` (CSS gradient); mobile
`apps/mobile/src/design/QueueButton.tsx` uses
`features/generation-core/OrbPoster.tsx` (SVG radial gradient).
Both subscribe to the synced palette through their orb interaction handle.
These are static compatibility surfaces, not GL snapshots.

Web `apps/web/app/globals.css` supplies the OA1 `orb-static-source::before`
spill and the 9s Queue rotation. Mobile OrbPoster supplies its padded SVG spill;
`OrbImageSpill.tsx` is the unused raster-spill helper. The retained artwork is
`apps/{web/public,mobile/assets}/queue/orb-{light,dark}.png`; neither header
currently displays it. Web `day-clock/OrbLoadPoster.tsx` owns
`day-orb-still`; it too is a gradient. No pre-existing snapshot cache exists.

Queue panel headers, nav links, cards/list rows, course batches and Needs
attention contain text/content/status icons, with no additional orb marks.
`features/queue.tsx` also contains Generation progress/detail screens using
GenerationOrb; those are outside this task and remain unchanged. Mobile
generation-queue route redirects to the popover. QN1 failure cards remain frozen.

FRESH Chromium/SwiftShader captures, device scale 3, 26px body crop:
`tmp/overnight/QL1/baseline.cjs`, `baseline.json`, `*-old-web.png`,
`*-old-mobile.png`, `*-today.png`. Native baseline is a labelled SVG web proxy
of the exact OrbPoster gradients/geometry, not a native capture.
Today reference uses the actual shared body/stage/output transform, noon light,
time 8.4, identity spin, no digits. Metrics are linear-sRGB luminance within
radius 0.46 of the body crop, composited onto the same theme paper.

| Mode/color | Old web mean / p95 | Old mobile proxy mean / p95 | Today mean / p95 |
|---|---|---|---|
| light pearl | .86030 / .89567 | .80055 / .88792 | .90259 / .92096 |
| light gold | .77255 / .82609 | .71682 / .80290 | .89364 / .92096 |
| light green | .76775 / .81957 | .71081 / .79658 | .89313 / .92096 |
| dark pearl | .70286 / .81227 | .56998 / .82020 | .03547 / .19439 |
| dark gold | .51152 / .58928 | .41617 / .59559 | .03117 / .15923 |
| dark green | .48861 / .56151 | .39813 / .56783 | .03089 / .15574 |

The default dark web miniature is about 19.8 times the reference mean;
mobile proxy is about 16.1 times. Baseline does not meet QL1.

## Frozen acceptance matrix

| Requirement | Owning layer | Required proof | Result |
|---|---|---|---|
| Shared body/stage/output and fixed still frame | shared renderer | GL comparison against independent Today crop | pending |
| Color × theme × physical-size cache, invalidation/retry | shared/platform adapters | focused tests | pending |
| Web/mobile Queue only; layout and QN1 intact | header components | focused/full client suites, Chromium and mobile proxy | pending |
| Mean/p95 within 10%, hue within 6 degrees | captures | 390/1280 light/dark pearl/gold/green | pending |
| Quiet fallback, no extra spill, no hidden work, Reduce Motion | adapters/components | lifecycle/fallback/rotation checks | pending |
| Fresh serial gates and scoped commits | repository | exact counts/logs | pending |

## Owner steps remaining

- Rollout NOT RUN: release via the next separately authorized FULLSEND.
- Device checks NOT RUN: website and Realme visual comparison with Today;
  native GL presentation and physical performance.
- Live served revision/database/Scheduler/provider state:
  **UNVERIFIED (owner to confirm)**. No live call is needed for this code slice.
