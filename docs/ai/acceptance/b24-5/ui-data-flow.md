# B24.5 UI data flow

## Learn to Library

```mermaid
flowchart TD
  Canvas[Canvas sync and stored academic graph] --> Materials[Course materials experience projection]
  Materials --> Selection[Student selects course and material ID]
  Selection --> Prepare[Existing preparation and default selective preview]
  Prepare --> Gate[Existing freshness and snapshot ownership gates]
  Gate --> Job[Durable Reviewer acceptance: HTTP 202]
  Job --> Engine[Unchanged grounded Reviewer engine]
  Engine --> Persist[Persist result and artifact version before success]
  Persist --> Library[Library artifact and persisted reader]
  Persist --> Save[Existing B22/B23 automatic Reviewer save]
  Save --> Deduplicate[Deduplicate by immutable snapshot]
  Deduplicate --> Library
```

Client uses GET experience/courses, course workspace/materials, optional POST
materials/prepare, POST generations with an idempotency key, GET generations/:id
and GET library/:artifactId. The client does not join source structures or job
provenance. Polling returns stable lifecycle states and actual unit counts.
Opening Library reads existing results only. A repeated generation key recovers
accepted work with matching owner/course/material identity.

## Activity to future Activity Maker

```mermaid
flowchart TD
  Assignment[Stored Canvas assignment and submission evidence] --> Activity[Activity experience DTO]
  Task[Optional imported planner task] --> Activity
  Activity --> Detail[Plain instructions and safe resource links]
  Materials[Course materials] --> Detail
  Detail --> Capability[Activity Maker capability: unavailable]
  Capability -. future approved implementation .-> Maker[Activity Maker generator]
  Maker -. future persistence .-> Draft[Owner-scoped editable ActivityOutputDraft]
  Draft -. future normalization .-> Library[Library activity_output artifact]
```

Dashed edges are missing backend functionality, not working mock behavior.
Activity IDs are distinct from planner task IDs and study-session IDs.
Current output arrays are empty. No AI draft is created by opening ActivityDetail.

## Today and planning

```mermaid
flowchart TD
  Tasks[Personal tasks and imported Canvas task settings] --> Today[Today experience service]
  Assignments[Canvas assignments and submission/deadline data] --> Today
  Sessions[Owned study sessions: planned/completed/skipped] --> Today
  Plans[Owned study plans and timestamps] --> Today
  Today --> Screen[TodayOverview: urgency, current/next, timeline, progress]
  Screen --> Preview[Existing deterministic preview]
  Preview --> Apply[Existing apply/replan primitive]
  Apply --> Sessions
  Screen --> Status[Existing session PATCH: status or interval]
  Status --> Sessions
```

GET /api/today defines the date and offset boundary server-side. No new
scheduling algorithm or class/calendar data is invented. Assignment imports are
explicit mutations through the existing task import endpoint.

All protected arrows originate with verified Supabase identity. Read adapters
use authenticated RLS plus owner predicates; existing privileged mutations and
Canvas resolvers retain their explicit owner authorization. No credential,
private Storage location, extraction diagnostic, generation prompt or sourceCore
structure is a student-facing field.
