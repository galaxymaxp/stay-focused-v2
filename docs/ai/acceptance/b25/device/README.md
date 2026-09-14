# B25.1 physical-device acceptance

Tested on a realme RMX3151 running Android 13 through the authenticated Expo application on 2026-09-14.

## Result

**FAIL — B25 requires implementation repair before B26.**

The redesigned shell, Today ring, navigation, typography, safe areas, and dark/light themes rendered correctly on the physical device. The ring accepted a hold-and-drag gesture and refreshed the planner preview without applying a schedule change.

The hosted Activity Maker and Quiz migrations are applied, and the intended Vercel production deployment is current. Authenticated experience reads still return HTTP 503 because the API uses the authenticated Supabase client to read server-only tables whose `authenticated` SELECT grants are intentionally revoked. This blocks real Today, Generate, Tasks, Library, Reviewer, Quiz, Activity Maker, and end-to-end Queue routing acceptance.

The Queue recovered 43 completed local records after relaunch. Its populated screenshots are intentionally omitted because they contain private academic titles. Generation screenshots are also absent because the hosted read failure prevents selecting a real material and starting a job.

## Evidence

- `today-dark.png`, `today-light.png`: Today shell and ring in both themes
- `today-ring-drag-dark.png`: ring value and planner preview after physical drag
- `generate-dark.png`, `generate-light.png`: hosted feature failure state
- `tasks-dark.png`, `tasks-light.png`: hosted feature failure state and grouping shell
- `library-dark.png`, `library-light.png`: tabs and hosted feature failure state
- `settings-light.png`: native appearance selection and reduced-motion state

No screenshot in this directory contains Canvas course, assignment, material, or artifact titles.
