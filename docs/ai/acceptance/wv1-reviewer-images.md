# WV1/N7 reviewer images load on open

Finite unattended scope: STEP 0-5, mocked tests, fresh serial local gates,
documentation and local commits. Baseline `7112770` on
`overnight/2026-10-15_feedback` includes required `653e8d8`. No later task is
authorized by this run. Rollout and Device checks are skipped entirely.

## Acceptance matrix

| Requirement | Owning layer | Evidence / result |
| --- | --- | --- |
| Server-verified bearer and owner isolation before private reads | API | Route auth/404 tests; artifact/version/source owner-denial tests |
| All section URLs and explicit snapshot states in one read | API/shared | `reviewer-images` tests, validated DTO; legacy routes retained |
| One accepted canonical version across source and stored external visuals | API | Injected canonical-read regression; no second latest-version lookup |
| No render dispatch from bulk GET | API | Snapshot bulk tests: no RPC, exact source/owner filters, 600-second URL, shared-page signing once |
| One website request on open, no scroll dependency | Web | Reader-hook/component test, no IntersectionObserver installed |
| First two eager, rest lazy, async decoding, reserved boxes | Web | Four-image render test |
| Missing snapshots bounded to three, admission once, read-only polls | Shared | Eight-section queue test, five polls, peak concurrency three |
| Expired/403 URL refresh once, then unavailable | Shared/web/native | Concurrent failures, failed refresh, component error and fresh-URL tests |
| Offline and identity changes discard URLs and late responses | Shared/web/native | Abort/owner/token/offline tests; native health/reconnect tests |
| Mobile receives same complete load | Native | Controlled offscreen figure/snapshot tests; zero discovery/tap/heartbeat section reads |
| IM2 and public share behavior preserved | Web/native/API | Existing suites included in final gates |

## Measurement

Four synthetic sections (figure, cached page, unrendered page, external
reference): **7 -> 2 metadata requests**; first course URL **2 -> 1 sequential
responses**; unrendered URL **3 -> 2** with immediate mocked completion.
Earliest URL including the already-stored external remains **1 -> 1**.
Offscreen cached URLs are available in the initial response. Image downloads,
reviewer content, health checks and asynchronous worker time are excluded.
See [ADR-042](../../adr/ADR-042-reviewer-visuals-single-load.md).

## Verification

**FRESH PASS, serial:** forced root typecheck/lint/build **8/8 tasks each,
0 cached**; API **2283/2283** (201 files, three existing live skips),
web **227/227** (39 files), shared **362/362** (42 files),
mobile **1269/1269** (135 files); standalone API/web builds
**1/1 each**, **35/35** and **19/19** pages; mobile Android export **1/1**.
Root build also exports Android/iOS/web. Six existing lint warnings remain.
Diff and staged-diff hygiene PASS. First-attempt failures and corrected fixture
mocks are retained in acceptance; no nondeterministic flake observed.

| Command | Final result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS, 8/8 tasks, 0 cached |
| `npm run lint -- --force` | FRESH PASS, 8/8 tasks, 0 cached, six existing warnings |
| `npm run test --workspace @stay-focused/api` | FRESH PASS, 2,283 tests, 201 files, 3 existing live skips |
| `npm run test --workspace @stay-focused/web` | FRESH PASS, 227 tests, 39 files |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS, 362 executions, 42 files, includes emitted tests |
| `npm run test --workspace @stay-focused/shared -- src` | FRESH PASS, 181 source tests, 21 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS, 1,269 tests, 135 files |
| `npm run build --workspace @stay-focused/api` | FRESH PASS, 1/1 build, 35/35 pages |
| `npm run build --workspace @stay-focused/web` | FRESH PASS, 1/1 build, 19/19 pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS, 1/1 local export |
| `npm run build -- --force` | FRESH PASS, 8/8 tasks, 0 cached; Android/iOS/web exports |
| `git diff --check` / `git diff --cached --check` | FRESH PASS |

Implementation commits:

- 3d54f97 feat(api): batch owner-scoped reviewer image discovery
- e5c1165 perf(web): load reviewer visuals on open
- 32a1714 perf(mobile): load reviewer visuals with the reader

The documentation/handoff commit is listed with these commits in the final
ignored status file. All required gates ran fresh and serially. Binding the
final API read to one canonical record was followed by fresh serial root
typecheck/lint, the full API suite
and standalone API build; the root build already includes that final API
code. Web/mobile/shared source remained unchanged through their passing gates.
No result is taken from Turbo cache. Provider/workflow
contracts are NOT APPLICABLE to these unchanged boundaries, NOT RUN.
Local evidence and logs live under untracked `tmp/overnight/WV1*`.

First attempts retained: the baseline availability mock initially made a read
on each render (8 observed, 7 expected); corrected to an effect before measuring.
An attempted PowerShell `Set-Content -NoNewline` was unsupported and changed no
file; rerun still failed until the mock patch was applied. Early web typecheck
reported three obsolete `hasFigures` fixture props; updated for the combined
DTO. First forced typecheck failed with two shared fixture literal-type errors
(3/5 tasks successful, 0 cached); corrected. Exploratory forced typecheck then
passed 8/8 with 0 cached. Exploratory lint passed 8/8 but overlapped that run,
so neither is used as final serial evidence; one newly introduced import warning
was corrected. The final-run harness first failed before task execution because
NODE_OPTIONS treated Windows backslashes as escapes; fixed to forward slashes.
No application gate was bypassed or weakened. No nondeterministic flake observed.

The first full API gate had **2,281 pass, 1 fail, 3 existing live skips**
(200 passing files, one failing file). The existing section-figure route test
still mocked the old availability helper, so the new bulk route reached an
empty fake client and correctly failed safely with 503. Updated that mock to
the combined reader, retaining verified-owner and no-store assertions; focused
rerun **5/5 PASS**. Final serial gates restart from typecheck. The exact before
fixture, including the stored external reference, was rerun from the baseline
Git source entirely under `tmp/overnight`: **1/1 PASS**, seven requests and four
known image URLs. No baseline source copy is committed.

The next full run passed API **2,282/2,282** (201 files, three existing live
skips), web **227/227** (39 files) and shared **356/356** (41 files), then mobile
had **1,246 pass / 22 fail** (132 passing files, three failing files). The three
reader suites mocked the removed hooks and therefore reached a new AppState
dependency absent from their native mocks. Updated their reader boundary to
the new hook, preserving selection, Quiz, Share and header assertions. Replaced
the obsolete near-scroll activation assertion with immediate offscreen cached
snapshot propagation. Focused rerun **52/52 PASS** (three files). Final serial
gates restart from typecheck with all source and fixture changes present.
Final review also confirmed the DTO returns cached snapshots even for sections
with figures; figure-first UI priority and background-render exclusion remain.

After that all-green run, final review retained the existing native parser's
legacy snapshot-ID guard: invalid IDs are omitted rather than becoming Ask
references. A mobile lifecycle regression test also caught the possibility of
a stale health failure clearing a successful foreground reload. Probe identity
now fences those results; hook tests **4/4 PASS**. The complete serial gate
sequence repeats against the frozen final code. Generated Next ambient files
are restored before final checks/staging. A local handoff helper initially
failed its syntax check before execution (Markdown backtick escaping); corrected
without writing repository docs, then syntax-checked successfully.

The added lifecycle regression fixture's next forced typecheck exposed one
excess-property error: its helper accepted a narrowed client type without
`fetchImpl` (6/8 tasks successful, 0 cached). The helper now accepts the actual
`ExperienceClient` contract. Production code did not change for this correction;
the serial gates restart from typecheck.

The combined reader now supplies its already-verified canonical record to the
stored external-visual reader, avoiding a second lookup and cross-version mixing
if latest-version changes during the request. Focused tests **9/9 PASS** (two
files). Final scope remains the same combined owner read; no provider work was
added. Default shared Vitest discovery includes emitted `dist` tests after a
build, so later suite counts include those duplicate executions; source-only
verification is recorded separately before closure. Generated outputs are not
staged, and the discovery configuration is unchanged.

**FRESH PASS:** `npm run test --workspace @stay-focused/shared -- src`
**181/181 source tests** (21 files); the default suite's **362 executions**
include the corresponding emitted tests (42 files). Exact before fixture from
baseline Git source, with matching synthetic IDs/URLs, rerun **1/1 PASS**.
No emitted tests, compiled artifacts or baseline source copy are committed.

## Owner steps remaining

Rollout and Device checks **NOT RUN**, skipped by unattended instructions.
Owner RB5: deploy reviewed API and web, then assess a real reviewer's website
image loading speed. Publish the reviewed mobile change and verify cached and
pending image loading, signed-URL recovery, offline behavior and IM2 controls
on device. Deployed revision, production rows, actual speed, device behavior
and Scheduler state are **UNVERIFIED (owner to confirm)**. No remote service
call, deployment, remote SQL/migration, Scheduler operation, email, `.env*`
edit or push is authorized or performed. Local gate children block non-loopback
sockets and disable telemetry/live tests. The referenced 2026-10-17 overnight
roadmap file is absent; the supplied complete WV1 prompt defines scope.
