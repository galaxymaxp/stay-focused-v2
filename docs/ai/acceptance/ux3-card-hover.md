# UX3 — Library and Generate card feedback

## Frozen acceptance (2026-10-24)

Source: Documents Git checkout, branch `overnight/2026-10-15_feedback`,
HEAD `c22a703aebb3279afcef4b1c7a96777ffe7c2ef1`. Full UX3 unattended prompt,
saved owner roadmap and both screenshot references read. Root AGENTS.md and
AUTOPILOT.md apply; no nested tracked policies. Current plans and recent handoff
reviewed. PBR-UX2.status PASS, its three commits and all seven earlier PASS
prerequisites verified as ancestors. Committed UX2 report exists. HEAD differs
from UX2 only in WEB-A1 STOP documentation; that STOP and dependents stay held.
Unrelated `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/` preserved.

Screenshots show older arrow-bearing course cards, but do not identify their
served revision. Current course arrows are already removed on both platforms;
do not remove them twice. Web Your own material still has a forward arrow.
Mobile Other source is its equivalent entry and still uses RowLink's arrow.
Both current web and mobile course scale changes lack transform interpolation.
Existing full accessible titles, compact Library clamping, routes, counts,
sorting, pin/options factories and disclosure indicators must remain intact.

| Row | Requirement / owning layer / proof | Initial result |
| --- | --- | --- |
| 0 | Source, policy, genuine dependencies, screenshot reconciliation and freeze | PASS |
| 1 | Library/Generate course navigation and own-source entry: no forward arrow; retain disclosure indicators | PARTIAL: courses already correct |
| 2 | Smooth bounded hover/return, focus and touch press/cancel, static reduced motion; no reflow/overlap/clipping | PARTIAL: smooth transition missing |
| 3 | Preserve full title access, counts/order/routes, independent options/pin and complete action inventory | Baseline frozen; verify exact source and synthetic interaction |
| 4 | Phone/tablet/desktop, light/dark, long titles, keyboard, touch and reduced-motion local evidence | Pending synthetic browser/RNW and regressions |
| G | Fresh focused/full affected suites, forced typecheck/lint, API/web builds, offline Android export, forced serial root build, both diff checks | Pending |
| C | Reconcile report/current-state/roadmap/sprint/handoff and scoped local commits | Pending |

Finite task: UX3 only. TC2 and TP1 are saved successors, outside this prompt's
implementation endpoint. No API/data/schema/provider/dependency/controller work.
Use inspected local network/environment-read guards, local temp/caches, offline
npm/Expo, EXPO_NO_DOTENV=1 and telemetry off. No remote services or `.env*` access.
Evidence/logs stay ignored under `tmp/overnight/UX3/`; no tmp commits.

## Owner steps remaining

Rollout and Device checks skipped entirely, NOT RUN. Served revisions,
authenticated app/native assistive technology and physical behavior remain
UNVERIFIED (owner to confirm). No deployment, push, remote SQL, provider call,
Scheduler, email, OTA/EAS, native installation or physical device action.
