# SA1 Study Assist (2026-10-16)

**PASS for the unattended local code scope.** Rollout and Device checks remain owner steps.

Finite scope: STEP 0-5, local serial gates and commits. Rollout and Device checks excluded. Baseline 7db5981 on overnight/2026-10-15_feedback; MR1.status PASS; tracked tree clean, only owner UI/, apps/mobile/.gitignore and supabase/.temp/ untracked. No code contradiction found.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Flat safe paragraphs/bullets/steps/bold, literal unknown syntax | Shared | Parser cases | FRESH PASS (local tests; final gate table below) |
| Organized instructions; bumped versions; old plain strings valid | Shared/API/cache | Prompt and cache tests | FRESH PASS (local tests; final gate table below) |
| Render all answer surfaces and shared snapshots | Mobile/web | Component tests | FRESH PASS (local tests; final gate table below) |
| Press/completion reveal; manual scroll cancels; Reduce Motion | Shared/mobile/web | Interaction tests | FRESH PASS (local tests; final gate table below) |
| What is this? first on both clients | Shared/mobile/web | Chip tests | FRESH PASS (local tests; final gate table below) |

## STEP 0 source mapping

- `packages/shared/src/study-tools.ts:8` (baseline).
- `packages/shared/src/study-tools.ts:42` (baseline).
- `packages/shared/src/study-assist.ts:4` (baseline).
- `packages/shared/src/study-assist.ts:60` (baseline).
- `packages/shared/src/study-assist.ts:74` (baseline).
- `packages/shared/src/study-assist.ts:75` (baseline).
- `packages/shared/src/study-assist.ts:82` (baseline).
- `apps/api/src/lib/study-tools.ts:224` (baseline).
- `apps/api/src/lib/study-assist.ts:8` (baseline).
- `apps/api/src/lib/study-assist.ts:75` (baseline).
- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:32` (baseline).
- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:62` (baseline).
- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:65` (baseline).
- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:67` (baseline).
- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:282` (baseline).
- `apps/mobile/src/features/reviewer/StudyAssistSheet.tsx:26` (baseline).
- `apps/mobile/src/features/reviewer/ReviewerReader.tsx:145` (baseline).
- `apps/mobile/src/features/reviewer/ReviewerReader.tsx:483` (baseline).
- `apps/mobile/src/services/localLibrary/assistCache.ts:8` (baseline).
- `apps/web/src/features/reviewer/study-assist-panel.tsx:32` (baseline).
- `apps/web/src/features/reviewer/smart-selection.tsx:94` (baseline).
- `apps/web/src/features/reviewer/assist-store.ts:81` (baseline).
- `apps/web/src/features/reviewer/assist-store.ts:91` (baseline).
- `apps/web/src/features/shared-reviewer.tsx:59` (baseline).

- `apps/mobile/src/features/reviewer/SmartSelectionPanel.tsx:286` (baseline plain result.text).
- `apps/web/src/features/reviewer/study-assist-panel.tsx:132` (baseline plain current.text).
- `apps/api/src/lib/reviewer-shares/snapshot.ts:106` (baseline hardcoded share prompt version).

## Implementation and focused verification

The shared parser is flat (one list level and one bold level) and returns text-only typed blocks. No HTML/link/image interpretation or new dependencies. Test Me question/choice fields and all validation/grounding limits are unchanged. Both prompt versions are v2. The Smart Selection session key omitted promptVersion at baseline; adding it is required by STEP 1's cache-isolation acceptance and changes only the ephemeral reuse key, not stored payloads. Old AssistRequest v1 rows remain readable by their original key; current v2 requests bypass them. Existing shared snapshots remain readable. No schema/migration or canonical reviewer change.

One reveal controller is shared by quick assists and Smart Selection per panel/sheet. Reveal tokens fence older completion scrolls and queued frames; actual user drag on mobile and wheel/touch/scroll keys/scrollbar intent on web suppress completion. Native measurement callbacks recheck intent. Web answers are focusable polite regions, with preventScroll focus after nearest scrolling. Reduce Motion uses native animated:false / web instant.

Focused FRESH: shared parser/controller 24/24, mobile answer interactions 9/9, mobile cache/service 25/25, API study tools/assist 96/96, web answer/shared reader 35/35. Draft failures retained: initial mobile typecheck failed on a JSX closing tag (fixed; mobile/web focused typechecks passed); first shared focused run 23 passed/1 failed exposed omitted promptVersion in the session key (fixed); first mobile focused run 28 passed/3 failed from circular React-element JSON assertions (fixed); first web focused run 31 passed/1 failed because the test clicked the Ask tab rather than the submit button (fixed). These are deterministic repairs, not hidden flakes.

## Final gates

All mandatory commands run serially with repository-local TEMP/TMP under tmp/overnight/sa1-temp. The final counts are recorded below; logs remain ignored under tmp/overnight/SA1.*.log.

## Owner steps remaining

Rollout and Device checks are skipped entirely: deploy API/website and compatible preview OTA, then check Explain -> loading/answer reveal, organized bullets, first Ask chip, manual scroll and Reduce Motion on realme and website. Production revisions, database/Scheduler state, actual provider formatting and physical behavior are UNVERIFIED (owner to confirm). No live service calls, environment-file edits, deployment, migration application, Scheduler action or push are authorized.

## Repaired failed attempts

First forced root typecheck: 5 successful/8 total, 0 cached; failed web test fixture TS18046 on React 19 unknown element.props. Fixed with an explicit Record<string, unknown> cast; no any or validation weakening. The final forced rerun passes 8/8 as recorded below.

First full API gate: 2,203 passed/4 failed/3 skipped in 191 files. SH1 snapshot assembly hardcoded study-assist-v1, so new v2 results failed its unchanged exact-binding check. Repaired within required SH1 compatibility: explicitly allow retained v1 and current v2 only, keeping content/owner/point/result validation intact; added stale/unknown-version regressions. No network or privacy expansion. Full typecheck/lint/API gates rerun after the repair.

First full mobile gate: 1,064 passed/18 failed in 115 files. Two pre-existing interaction harnesses lacked the native requestAnimationFrame global newly used for deferred reveal. Added a local frame stub to those harnesses; dedicated new scroll tests still use queued frames and actual adapter refs. No product fallback or assertions were removed.

Final FRESH full suites: API 2,208 passed/3 existing skipped in 191 files; mobile 1,082/1,082 in 115 files; shared 296/296 in 30 files (160 source cases plus 136 pre-existing emitted copies); web 164/164 in 27 files. No nondeterministic flake observed. Engine tests NOT APPLICABLE (engine unchanged). The two older mobile harness frame stubs do not replace the dedicated queued-frame tests.

## Fresh serial gate ledger (final implementation)

| Command | Evidence label | Result |
| --- | --- | --- |
| `npm run typecheck -- --force` | FRESH | 8/8 tasks; 0 cached; 0 errors |
| `npm run lint -- --force` | FRESH | 8/8 tasks; 0 cached; 0 errors; 6 existing warnings (5 mobile, 1 web) |
| `npm run test --workspace @stay-focused/api` | FRESH | 2,208 passed, 3 existing skips; 191 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH | 1,082 passed; 115 files |
| `npm run test --workspace @stay-focused/shared` | FRESH | 296 passed; 30 files (160 source cases plus 136 existing emitted copies) |
| `npm run test --workspace @stay-focused/web` | FRESH | 164 passed; 27 files |
| Engine tests | NOT APPLICABLE | Engine unchanged |
| `npm run build --workspace @stay-focused/api` | FRESH | 1/1; 34/34 static pages |
| `npm run build --workspace @stay-focused/web` | FRESH | 1/1; 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH | 1/1; 1 Android bundle, 35 assets |
| `npm run build -- --force --env-mode=loose` | FRESH | 8/8 tasks; 0 cached; 2m23.558s |
| `git diff --check` / `git diff --cached --check` | FRESH | 0 whitespace errors |
| Rollout / Device checks | NOT RUN | Skipped entirely by UNATTENDED rules |

Root build uses loose environment passing solely to preserve repository-local TEMP/TMP, EXPO_OFFLINE and telemetry-disable settings in child builds. Standalone builds use the same local temp/offline settings. Next-generated next-env.d.ts additions were inspected and restored; generated bundles, emitted tests and all tmp evidence are excluded from commits. Vite config/react-test-renderer deprecation notices and Expo color-variable notices are tooling warnings, not hidden failures.

## Commits and checkpoint

- `ad92609 feat(shared): add safe study answer format and reveal intent`
- `5bcf15e feat(api): organize study answers and preserve share compatibility`
- `051c649 feat(mobile): reveal and format study assist answers`
- `5041c1d feat(web): reveal and format study assist answers`

The documentation closure is the commit containing this report; its final hash is recorded in tmp/overnight/SA1.status. All commits use galaxymaxp <omgraythekid@gmail.com>. Branch: overnight/2026-10-15_feedback; validated source is unchanged from these four code commits (only planning/handoff text follows). The owner untracked UI/, apps/mobile/.gitignore and supabase/.temp/ remain untouched. No code gate is cached. The external 2026-10-16 study-assist roadmap has also been reconciled.
