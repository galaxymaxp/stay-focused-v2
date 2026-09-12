# B24.6 Activity Maker backend

Activity Maker now creates a source-grounded, editable draft from an owned Canvas assignment. It uses B24.5 experience authentication and the existing processing queue, provider adapter, Canvas preparation and OCR services. No UI, Quiz engine, planner replacement, or Reviewer pipeline rewrite is included.

## V2 reuse decisions

| Component | Decision | Implementation |
|---|---|---|
| Experience JWT/envelopes | REUSE | `apps/api/src/lib/experience/http.ts`; bounded JSON reader added for new routes |
| Canvas course/connection ownership, preparation, private Storage, PDF/OCR | REUSE / EXTEND | Office MIME admission and structural extraction added to the existing file path |
| Existing provider | REUSE | `createServerOpenAIProvider`, `GenerationProvider.generate`, strict Structured Outputs; existing gpt-4o default |
| `processing_jobs`, worker and Vercel Workflow | EXTEND | `activity_generation`, existing claim/heartbeat/cancel/dispatch paths, dedicated atomic completion RPC |
| Future Activity output placeholder | EXTEND | Concrete `TaskSpecification`, section/slide drafts and authenticated persistence; old exported type retained for compatibility |
| Library and Activity Detail | EXTEND | Persisted draft opening, generation resolution, latestDraftId and output summaries |
| Reviewer Stage 0–6, planner, Quiz | UNRELATED | Existing engine behavior retained; Quiz stays unavailable |

## Request and persistence contracts

All routes verify the Supabase bearer JWT server-side and return the B24.5 `{ok,data}` / `{ok:false,error}` envelope. Generation accepts no owner, course, model, provider, system prompt or Canvas credential from the client.

| Route | Method | Contract |
|---|---|---|
| `/api/experience/activities/canvas:<assignment UUID>/generate` | POST | `{mode:"draft",materialIds?:["file:<UUID>","page:<UUID>"]}`; required `Idempotency-Key`; 202 with generation id/state and null progress |
| `/api/experience/activity-drafts/<UUID>` | GET | Persisted `ActivityDraft`; no provider call |
| Same draft route | PATCH | `{revision:<currently read revision>,content:{title,sections,slides}}`; compare-and-swap update; conflict returns 409 |
| Same draft route | DELETE | Delete the owned draft |
| `/api/experience/generations/<UUID>` | GET | queued/preparing/generating/finalizing/completed/failed, plus existing cancellation states; artifact id when saved |
| Existing Library list/open routes | GET | `activity_output` summaries; opening `activity:<draft UUID>` returns `{artifact,draft}` |
| Existing Activity Detail | GET | `hasGeneratedDraft`, `latestDraftId`, outputs and generation capability |

Only `draft` mode is implemented. Breakdown, assisted improvement, open chat and binary export are outside this slice. A draft is never a Canvas submission.

Generation bodies are bounded to 4096 UTF-8 bytes while streaming. PATCH bodies are bounded to 200000 bytes. Editable content allows one of sections or slides, 1–100 parts, bounded strings and resolving source references. Identity, ownership, generation association, source metadata and creation time are immutable through PATCH and database column grants.

## Structure and grounding

`apps/api/src/lib/activity-maker/generation.ts` produces a TaskSpecification before calling the provider. It records instructions, flexible activity type, required questions/sections/order, template structure, formatting, word/paragraph/item/slide limits, artifact type, source ids and exclusions. Server context adds course identity/title and exact module ids. Unknown types remain `custom`.

Structure priority is explicit Canvas requirements, instructor template, attached instructions, then an unheaded custom fallback. There is no universal academic report wrapper. Deterministic rules recognize common numeric/word counts, question ranges, heading order, placeholders and forbidden generic sections; contradictory template/count evidence fails safely. Less regular natural-language requirements are also checked by a separate semantic provider call. This is not a guarantee that arbitrary ambiguous instructions can always be completed.

The first Structured Output contains ordered content parts and exact source evidence. Deterministic validation rejects empty/oversized output, incorrect counts, unknown refs, quotes absent from their source, unsupported citation strings, determinable extra generic sections, forbidden sections and invalid length constraints. Numeric claims require evidence, with derived calculations/program code checked semantically. A second strict Structured Output must affirm instruction compliance, actual support for claims, citation validity and template compliance. Provider failures or validation failures produce no published draft.

Insufficient source information becomes a fixed `missing_source_information` warning and explicit placeholder, never invented observations, personal experiences or outside research. Headings and slide ordering are supplied by the server. No prompts, raw provider errors, credentials or Storage paths enter the response. Draft provenance retains source role/title, material identity and a SHA-256 fingerprint of the extracted source text; full course documents are not copied into the student response.

## Durable data model

Forward-only migration: `packages/db/migrations/20260912100000_activity_maker.sql`.

`activity_drafts` contains owner/assignment/course/connection/generation ids, activity type, validated structured content, task specification, source summaries, warnings, status, revision and timestamps. Composite FKs enforce assignment and generation ownership. Authenticated users can select, insert against an owned completed Activity generation, update editable columns, and delete their own draft. Anonymous access and direct invocation of admission/completion RPCs are denied. Service-only RPCs use an empty search path and explicit grants.

The admission RPC serializes per owner, enforces idempotency and queue/daily limits, and persists the job before acceptance. Both execution backends use the existing job system. Completion locks the job, verifies running state, worker lease and assignment identity, then atomically inserts the draft and result and marks success. Cancelled/cancelling or expired-lease work cannot publish.

Regeneration uses a new idempotency key and inserts a separate draft. It never updates an earlier draft, including one with student edits. Reopening uses the saved record. Cleanup excludes generation records referenced by saved drafts; account deletion can still cascade the owner’s jobs and drafts together. Deleting a draft does not undo the assignment or submit anything.

## Deployment and scope

Apply the migration before deploying the API that reads `activity_drafts`; regenerate/reload the hosted API schema as usual. The migration was executed in local PGlite Postgres with actual queue-table DDL and minimal auth/Canvas prerequisites. It was **not applied to hosted Supabase** during this task. Production dispatch/OCR/provider configuration remains the existing deployment’s responsibility.

Activity Maker and modern file-format capabilities are available in the new code; Quiz and calendar remain explicitly unavailable. See [verification](verification.md), [data flow](activity-maker-data-flow.md), [format limits](file-ingestion-matrix.md) and [V1 audit](v1-task-maker-parity.md).
