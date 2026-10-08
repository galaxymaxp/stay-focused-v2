# Stay Focused V2 web

Functional Next.js browser client for the existing shared API. Production code
contains no fixture data, alternate backend, service-role credential or direct
domain database access. Shared DTOs come from `@stay-focused/shared`.

## Local development

From the monorepo root, install with `npm ci`. Copy `apps/web/.env.example` to
`apps/web/.env.local` and supply the **non-production** Supabase URL/public anon
key that matches your shared API. Set `STAY_FOCUSED_API_ORIGIN` to that API's
origin. Its existing server credentials and worker configuration stay in the
API workspace; never put them in this app.

Run the existing backend with `npm run dev --workspace @stay-focused/api`, then
the website with `npm run dev --workspace @stay-focused/web`. Open
`http://127.0.0.1:3100`. Configure the local auth callback URL
`http://127.0.0.1:3100/auth/callback` in the non-production Supabase project if
email confirmation is enabled. Auth recovery/refresh uses the Supabase SDK;
domain requests use bearer JWTs through a fixed same-origin Next rewrite.

Generation is disabled by default. Only set
`NEXT_PUBLIC_GENERATION_ENABLED=true` after a separate allowance exists for the
target environment, then restart/rebuild. Admission, ownership, exact source,
question count, cancellation and grading safeguards remain on the shared API.
Viewing saved materials and jobs does not submit generation.

## Implemented surfaces

| Surface | Existing backend contracts |
| --- | --- |
| Sign-in/sign-up/confirmation/session recovery | Supabase Auth SDK |
| Today and available-time planning | `/api/today`, `/api/study-plan/preview`, `/api/study-plan/apply` |
| Schedule | `/api/study-sessions` and session status updates |
| Tasks and Canvas deadlines | `/api/tasks`, import and item CRUD; `/api/experience/activities` |
| Course/module/material browsing and preparation | `/api/experience/courses`, `/api/experience/materials/prepare` |
| Reviewer/Quiz admission and progress | `/api/experience/generations`, `/api/experience/quizzes`, `/api/jobs` |
| Queue, cancellation and permitted retry | Existing job status/cancel/retry routes |
| Library and saved Reviewer reader/export | `/api/experience/library` |
| Saved activity draft editing | Revision-checked `/api/experience/activity-drafts` |
| Quiz practice, drafts, checking, completion and history | Existing Quiz/attempt lifecycle routes |
| Canvas connection/course selection/durable sync | Existing `/api/canvas` contracts |
| Settings | Local system/light/dark preference, account sign-out, integration links |

Manual text/file uploads and activity-output generation are not exposed in this
slice; saved activity outputs remain editable. The web app never substitutes
invented course, schedule, progress or score data when the API is unavailable.

## Verification

Run `npm run test --workspace @stay-focused/web`, plus the repository's root
TypeScript, lint and build gates. Root has no generic `test` script; regression
suites run with `npm run test --workspaces --if-present`.

`node scripts/web-browser-check.mjs` starts isolated fictional Auth/API services
on localhost ports 3402/3410, tests the application and captures phone/desktop
screens in both themes. `node scripts/web-browser-check.mjs --generation-fixture`
also tests an ambiguous admission retry with the same idempotency key and Quiz
settings against those same fixtures. Run these sequentially and separately from
builds. They override the service configuration, block non-local browser
requests and never call OpenAI. They do not establish live integration acceptance.

Generated evidence stays in ignored `.local/website-qa/`. See
[`website-v1.md`](../../docs/ai/acceptance/website-v1.md) for results, visual
references, deviations and exact remaining live-acceptance blockers. Production
deployment, migrations/data writes and draft PR #1 changes are excluded.
