# ADR-019: Browser application over the shared API

Status: accepted for the owner-authorized website implementation, 2026-10-08.

The website lives in `apps/web`, an isolated Next.js 15 App Router workspace.
It reuses `packages/shared` DTOs and the existing `apps/api` backend, database,
Canvas workflows, generation jobs, and Quiz lifecycle. No domain database
client, service-role credential, migration, or alternative generation engine is
introduced. Mobile code and API behavior remain unchanged.

Per ADR-003, browser Supabase Auth persists and refreshes its session; every
domain request sends the current bearer JWT. The existing API verifies it
server-side and enforces ownership. Client route guards are a presentation
boundary, not server authorization. No private domain content is SSR-rendered.
A configured same-origin Next rewrite forwards `/api/*` to the fixed shared API
origin. The web app does not use auth cookies or add permissive CORS.

Design priority follows the owner's 2026-10-08 clarification: latest approved
Figma frames/screenshots, Design System v1.2, V2 mobile behavior, then V1 history.
The linked Figma file `1UlaDGXMPT6EkVRHdAveHP`, Foundations `2:190` and screen
board `25:1277` were read via design context and screenshots. Their neutral
black/graphite surfaces and pale controls supersede the older warm-charcoal/gold
prototype bundle. The Foundations page specifies Inter as the Figma stand-in
for the device system font, 48px targets, 12px controls and 16px cards.
No separately version-labelled v1.2 resource or approved Authentication,
expanded Schedule, Canvas-connection or Settings frame was located. This was
reported before implementation; those screens reuse existing mobile behavior
and inspected foundation components, with visual acceptance pending.

The Figma Quiz includes Reveal Answer and incomplete Finish Quiz controls that
conflict with the retained backend finalization/secrecy contract. Preserve
the visual hierarchy while omitting unsupported reveal/incomplete completion;
never weaken the backend. These deviations are recorded in acceptance.

Local verification must use explicit fictional fixtures or a non-production
backend. These never ship as application data. Generation submission is disabled
by default until an operator establishes an allowance and enables it for that
environment. Viewing existing jobs/materials does not generate new output.

No production deployment, data write, migration, push, or PR #1 change is
authorized by this milestone. B25.3.3 remains PARTIAL/BLOCKED and paused.
