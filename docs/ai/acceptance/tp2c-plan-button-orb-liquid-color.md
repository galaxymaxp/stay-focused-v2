# TP2c: orb liquid and synchronized Plan color

Status: **STOPPED during STEP 0** (2026-10-25). No implementation changes.
The unattended rules in `tmp/overnight/prompts/TP2c.md` take precedence over
the later instruction to stop only for data loss, security/privacy or branch.

## Baseline and partial STEP 0 inventory

- Expected and actual branch: `overnight/2026-10-15_feedback`.
- Initial HEAD: `3068726879cd27a057a57b0dfd66c049e39801b6`.
- FRESH `git merge-base --is-ancestor 30687268 HEAD`: exit 0.
- TP2b acceptance reports local PASS. Live/native acceptance remains unverified.
- Local upstream comparison: 29 behind / 17 ahead; no fetch performed.
- Initial dirty paths: untracked `UI/`, `apps/mobile/.gitignore`,
  `supabase/.temp/`. These and all `tmp/` paths remain unstaged.
- Requested commit author: `galaxymaxp <omgraythekid@gmail.com>`.

Read the full TP2c prompt, root AGENTS.md and AUTOPILOT.md. Inspected the
shared body/scene implementation, web PlanGlassCanvas, mobile PlanGlassView
and PlanButton, current planning entries and newest handoff. STEP 0 is partial:
the complete DayOrb, palette and impulse inventory was not finished because
the shader discrepancy below triggers the preceding unattended STOP rule.
No exact reusable palette source or impulse function is claimed as verified.

## STOP evidence

Unattended rule 3 says: "It is a STOP if the code itself contradicts what
the prompt assumes." Rule 4 requires recording the findings and exact owner
question, committing safe completed work, writing STOPPED and ending.

The prompt's "What is wrong (confirmed in code)" section and liquid decision
assume the slab has this density floor:

```glsl
float sheet = (0.75 + 0.25 * smoothstep(0.3, 0.9, flow)) * held * filled;
```

Actual `packages/shared/src/orb-body-renderer.ts` uses:

```glsl
float sheet = (0.35 + 0.65 * smoothstep(0.3, 0.9, flow)) * held * filled;
```

FRESH read-only `git show 30687268:packages/shared/src/orb-body-renderer.ts`
confirms that the prerequisite commit itself has the same `0.35 + 0.65`
expression. This is a local code contradiction, not missing production access.
The existing `surface`, `filled` and `uSlosh` are present as described.
The desired gravity-free expression is clear, but the higher-priority rule
requires stopping before implementing it from the contradictory baseline.

Exact owner question for a future attended run: **May TP2c proceed from the
actual TP2b `0.35 + 0.65` slab floor, treating the prompt's `0.75 + 0.25`
baseline as a documentation error?** No question was sent during this run.
No DECISIONS-NEEDED entry was added.

## Verification and remaining scope

| Check | Result |
| --- | --- |
| Branch and prerequisite ancestry | FRESH PASS, 2/2 checks |
| Slab baseline comparison with prompt | FRESH contradiction, 1/1 comparison; STOP |
| Working/staged diff hygiene | FRESH PASS, 2/2 commands, exit 0 |
| Focused and full affected test suites | NOT RUN, 0 tests executed; stopped before code edits |
| Forced typecheck/lint, API/web builds, offline Android export, serial root build | NOT RUN, 0 gates executed; STOP rule |
| Real GL captures and surface/hue/30-frame mask metrics | NOT RUN, 0 captures; STOP rule |
| Native GL and production state | UNVERIFIED (owner to confirm) |

No application gate failed, and no previous TP2b test count is claimed as a
TP2c result. No code, migration, dependency or env file was changed. No remote
service, SQL, deployment, Scheduler, email, push or device action occurred.

## Owner steps remaining

- Resolve the recorded baseline contradiction, then resume STEP 0 and carry
  out STEP 1-4, fresh suites/gates and acceptance captures locally.
- Rollout NOT RUN: release completed work via the next separately authorized
  FULLSEND.
- Device checks NOT RUN: website and Realme gravity-free liquid, synchronized
  palette/fade, fixed shell and press wave; native GL/performance/accessibility.
- Served revision and database/Scheduler/provider state are UNVERIFIED
  (owner to confirm); remote inspection is prohibited in this unattended run.

The local documentation commit is titled `docs(today): record TP2c baseline
contradiction stop`; its exact hash is recorded in Git and
`tmp/overnight/TP2c.status`. Endpoint is the unattended STOP, with no successor
task or release started.
