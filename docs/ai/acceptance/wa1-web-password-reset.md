# WA1 — Website password recovery

Scope: unattended local code, tests, gates, documentation and local commits on
`overnight/2026-10-15_feedback`, baseline `bb1ed7fe`. No rollout, device checks,
service calls, remote SQL, environment-file changes or push.

## STEP 0

FRESH inspection confirms email/password sign-in and no web reset entry. Web
creates a Supabase client in `src/components/providers.tsx`, with PKCE,
`detectSessionInUrl: true`, persisted browser sessions and automatic refresh.
The callback currently routes any session into the app. Mobile validation and
safe recovery copy are in `src/auth/providerAuth.ts`; mobile remains unchanged.
Installed auth-js automatically exchanges PKCE codes and emits
PASSWORD_RECOVERY using its persisted recovery verifier. It rejects implicit
hash sessions when configured for PKCE, so legacy recovery hashes need explicit
session establishment instead of a second PKCE exchange. No code contradiction.
Live redirect allowlist, email template and deployment are UNVERIFIED (owner to
confirm). Existing untracked `UI/`, `apps/mobile/.gitignore`, `supabase/.temp/`
are unrelated and preserved.

## Acceptance matrix

| Requirement | Owning layer | Proof | Result |
| --- | --- | --- | --- |
| Sign-in-only request, validation, normalized email, neutral notice, safe errors, busy lock | Auth screen/helper | Unit and local browser | FRESH PASS |
| PKCE auto exchange and explicit recovery hash, no double exchange | Auth provider | Provider tests, installed SDK inspection, Strict Mode replay | FRESH PASS |
| Recovery cannot skip password update; ordinary sign-in/OAuth unchanged | Provider, callback, auth, shell | Provider/callback regressions, owner-bound guard and shell source review | FRESH PASS |
| Public reset route, expired/used link, min 8, confirmation, safe errors, successful update | Reset screen/helper | Unit and local browser; ordinary existing session cannot promote an invalid link | FRESH PASS |
| Existing classes/tokens, legal footer, 1440/390 widths | Auth/reset screens | Local browser, four screenshots; visual review at both widths | FRESH PASS |
| Required gates and planning reconciliation | Repository | Exact fresh command results and scoped documentation | FRESH PASS |

The helper/provider/browser checks use actual screens/provider with stubbed
SDK and routing in local Chromium (20 browser cases). Per-tab
session storage records only the pending owner's ID, never link credentials;
it survives reload and clears after successful update, logout or owner change.
The provider keeps automatic PKCE exchange, manually establishes legacy hashes
once, and removes hash credentials from history. SDK auth calls are not awaited
inside its auth-state listener. This is a browser presentation guard under
ADR-003/019; protected APIs retain their existing server JWT/ownership checks.
Mobile and all API/database code are unchanged. No new motion or CSS/token is
introduced, so new Reduce Motion behavior is NOT APPLICABLE.

A post-suite source audit caught a second-link bypass: clearing accepted
recovery evidence merely because a new link has parameters would let an invalid
link discard a still-pending recovery guard. Evidence now remains owner-bound
until successful password update, logout or owner change. A regression covers
this case. A later callback audit also routes malformed/expired links marked
as recovery to the reset screen rather than entering the app using an ordinary
stored session. The final web suite passes 502 tests across 69 files, including
57 checks across the three changed test files. The interrupted worker's earlier
498/499 results did not cover those last callback changes.

## Local recovery (2026-10-19)

The owner explicitly authorized recovery of WA1 followed by a separately gated
FULLSEND. Windows and the actual source checkout were verified at `bb1ed7fe`.
Root AGENTS/AUTOPILOT, live queue prompt, progress, logs and ADR-003/019 were
inspected. The initial worker log establishes that only `UI/`, the mobile
`.gitignore` and `supabase/.temp/` were dirty before WA1. Its patches establish
ownership of the current recovery implementation and sprint block. These
unrelated paths remain untouched, with local before/after hashes recorded.

Runner PID 20872 and the WA1 worker/toolchain no longer exist. The other local
Node process serves the inspected control panel on port 4747; it reports the
runner stopped with Pause requested. The stale Metro PID was already reused by
Edge and was not terminated. No second coding worker was started. The owner
Pause file remains unchanged. Exact evidence is in ignored
`tmp/overnight/WA1-recovery-ownership.txt` and `WA1-recovery-*-baseline.json`.

The interrupted Android export never recorded completion. The closure web log
does contain 502 passing tests, but recovery reruns the required gates against
the unchanged final source instead of treating historical results as fresh.
Fresh recovery screenshots were visually reviewed at 1440 and 390 pixels;
all four retain readable controls/notices, legal links and no horizontal
overflow. Network access is blocked for local Node gates; live-test flags stay
off. The recovery gate process uses two CPUs to bound worker fan-out, and the
Android export explicitly uses `--max-workers 2`. No assertions are reduced.
Full command, exit and time evidence is retained in ignored
`tmp/overnight/WA1-recovery-gates.json` and matching logs.

| Recovery command | Evidence/result on final source |
| --- | --- |
| `npm run typecheck -- --force --env-mode=loose` | FRESH PASS, 8/8 tasks, 0 cached |
| `npm run lint -- --force --env-mode=loose` | FRESH PASS, 8/8 tasks, 0 cached; 6 existing warnings |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 632 tests / 64 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS, 2452 tests / 213 files; 3 intentional live skips |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1587 tests / 166 files |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 502 tests / 69 files, including 20 local browser cases |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 37/37 static pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 23/23 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android --max-workers 2` | FRESH PASS, Android bundle and `Exported: dist` |
| `npm run build -- --force --env-mode=loose` | FRESH PASS, 8/8 tasks, 0 cached; API 37/37, web 23/23, mobile Android/iOS/web export |

`--env-mode=loose` passes the outbound-network guard to Turbo children; all
required tasks still execute freshly. Logs retain the existing Vite CommonJS
configuration warning and Expo color warnings. No recovery test failure or
flaky retry occurred. The earlier worker's failed assertions remain recorded
below, and its interrupted export remains an interrupted attempt, not a pass.
Workflow/provider-boundary suites are NOT APPLICABLE to WA1's web-only change.

FRESH PASS: `git diff --check` and `git diff --cached --check`. The two Next
declarations were confirmed as WA1-generated against the initial clean baseline
and exact Next output, backed up locally, then restored byte-for-byte to HEAD.
An initial inline Node restore command failed on PowerShell quoting before any
file write; a checked script performed the restore successfully. This was a
preparation-command failure, not a failed suite or a FULLSEND attempt.
Implementation commit: `3fe4051882b1557a69bfb91c69cfaf076457cf05`.
Documentation, parity-gap closure and the runner checkpoint complete WA1 only;
the separately authorized FULLSEND still requires its own candidate/prerequisites
and fresh release gates. No later queued task is included.

## Owner steps remaining

Rollout and Device checks are NOT RUN, skipped entirely per WA1. Owner adds
`https://stay-focused-ten.vercel.app/auth/reset` (optionally
`http://127.0.0.1:3100/auth/reset`) to Auth Redirect URLs, checks the reset email
template uses `{{ .ConfirmationURL }}`, deploys the website and tests a real
email/password account. Live production and physical acceptance remain
UNVERIFIED (owner to confirm).

## Failed first attempts

- Focused helper/provider run: 32 passed, 2 failed. Test assertion attempted
  `not.toContain` on a correctly null provider error. Corrected to `toBeNull`.
- Focused helper/provider/browser run: 47 passed, 2 failed. Two browser waits
  expected `/library` as a return path; the existing `sharedReturnPath` helper
  permits shared-reviewer paths only and correctly defaults to `/today`.
  Corrected the expectations and added an allowed shared-reviewer redirect case.
