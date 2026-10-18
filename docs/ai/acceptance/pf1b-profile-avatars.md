# PF1b account photos

Finite scope: STEP 0-6, local tests/gates/docs/commits on
`overnight/2026-10-15_feedback`, baseline `1ad0039`. No rollout/device work.

## Preflight

- Tracked tree clean. Preserve expected untracked `UI/`,
  `apps/mobile/.gitignore`, `supabase/.temp/` exactly. PF1's stop was resolved
  explicitly by PF1b; `tmp/overnight/PF1.progress` and the footer were read.
- Original renderers: web shell name 203, account initial 247-249;
  settings 16-18; `.avatar` CSS 427 and `.account-avatar` 4221.
  Mobile primitives profile button 784, sheet 789, Avatar 815;
  Settings row 81, Avatar 212. Session metadata mapping authService 358.
- Google/Microsoft (`azure`)/email exist. Web exposes original user_metadata;
  mobile maps it to userMetadata. No session handling change required.
- Read job-upload route/intent flow, private bucket at durable migration 274,
  resumable authorization migration and snapshot signing (600 s).
- No profiles/user_profiles/user_settings table in either migration directory.
  Latest across both directories: `20261018000200`; new `20261018000300`.
- Installed expo-image-picker 57 supports editing and square aspect on Android,
  square editing on iOS. No expo-image-manipulator. Existing API canvas library
  provides server crop; no native module added.
- External PF1 order differs; this prompt explicitly chooses uploaded first.
- Live provider metadata, deployed revisions, applied migrations, database rows,
  Scheduler and remote-ref freshness: **UNVERIFIED (owner to confirm)**.

## Acceptance matrix

| Requirement | Owning layer | Proof |
| --- | --- | --- |
| Private owner isolation and service-only writes | DB/API | Local migration/RLS and route tests |
| Bounded bytes, magic type, square crop and <=512 | API | Codec and route tests |
| Replace/delete persistence and cleanup | API | Storage mocks, CAS and failure tests |
| Uploaded/provider/initial order, HTTPS only | Shared | Pure unit suite |
| Account images and image-error fallback | Web/mobile | Component tests and wiring review |
| Change/remove, confirmation and errors | Web/mobile | Client tests and static integration review |
| Memory-only cache, expiry, owner switch | Web/mobile | Provider lifecycle tests |
| Actual provider/phone/production behavior | Owner | NOT RUN; unattended scope excludes |

Final verification and limitations are recorded below at closure.

## Implementation and evidence (2026-10-19)

**PASS for the finite local code scope**, from baseline `1ad0039` on
`overnight/2026-10-15_feedback`. Resume inspected the existing uncommitted
migration/API/shared drafts and continued them; no committed work was redone.
Endpoint: PF1b only. Rollout and device acceptance are excluded.

| Requirement | Final local result |
| --- | --- |
| Private owner isolation | FRESH PASS: local PGlite executes the new migration; own-row column grants/RLS, service-only invoker RPCs, path constraint and restrictive Storage denial for anon/authenticated, including with an unrelated permissive policy |
| Bounded, validated photo | FRESH PASS: declared/chunked 2 MiB bounds, magic/MIME mismatch and dimension rejection; real JPEG/PNG/WebP decode; center-crop pixel proof; square <=512, no upscale |
| Replace/delete persistence | FRESH PASS: verified-owner route and storage mocks; new object before CAS, old-object retirement, explicit-conflict compensation, durable failed-delete retry, ambiguous RPC safety, idempotent delete, empty GET |
| Source order | FRESH PASS: uploaded > HTTPS avatar_url > HTTPS picture > initials, invalid schemes/credentials and empty email |
| Web UI | FRESH PASS: shared Avatar in account button/popover/settings, image-error fallback/retry, canvas crop before upload, removal confirmation, busy/error recovery, binary bearer retry |
| Mobile UI | FRESH PASS: one Avatar in profile button/sheet/settings, image-error fallback/retry, existing square picker, removal confirmation and permission/error recovery, bounded binary transport |
| Cache and offline | FRESH PASS: memory-only shared store, one-minute-before-expiry refresh, failed-read fallback, stale read/mutation protection, account-switch/sign-out disposal and ignored late responses; provider fallback offline |
| Native dependencies/auth | NOT APPLICABLE: no new module, dependency, credential or auth/session format change |
| Production/device/provider behavior | NOT RUN: explicitly excluded; UNVERIFIED (owner to confirm) |

Implementation commits (author `galaxymaxp <omgraythekid@gmail.com>`):

- `14a10d5 feat(db): add private profile avatar storage migration`
- `74c07df feat(shared): resolve avatar sources and scope photo memory`
- `8ee9099 feat(api): manage owner-scoped profile photos`
- `6574093 feat(web): show and manage profile photos`
- `fc9a330 feat(mobile): show and manage profile photos`

### Gates

| Exact command | Result |
| --- | --- |
| `npm run typecheck -- --force` | FRESH PASS: 8/8 tasks, 0 cached |
| `npm run lint -- --force` | FRESH PASS: 8/8 tasks, 0 cached; 0 errors, six pre-existing warnings |
| `npm run test --workspace @stay-focused/shared` | FRESH PASS: 542/542 tests, 52 files |
| `npm run test --workspace @stay-focused/api -- --maxWorkers=2` | FRESH PASS: 2397 passed, 3 skipped live cases, 209 files; B24_6_LIVE/B24_7_LIVE=0 process-locally |
| `npm run test --workspace @stay-focused/web` | FRESH PASS: 353/353 tests, 54 files |
| `npm run test --workspace @stay-focused/mobile` | FRESH PASS: 1481/1481 tests, 154 files |
| `npm run build --workspace @stay-focused/api` | FRESH PASS: 36/36 static pages; profile route trace includes the existing native canvas decoder |
| `npm run build --workspace @stay-focused/web` | FRESH PASS: 19/19 static pages |
| `npm run build --workspace @stay-focused/mobile -- --platform android` | FRESH PASS: one local Android bundle; EXPO_OFFLINE=1, EXPO_NO_DOTENV=1 |
| `git diff --check` | FRESH PASS: zero whitespace errors; staged check also passes |

Additional final focused API/security proof: **FRESH PASS 28/28, four files**,
including both Storage roles with a broad permissive fixture policy. The first
full API suite passed 2395 tests/three live skips; after the final two
Storage-policy regressions, the final full rerun passes 2397/three live skips.
Additional AUTOPILOT `npm run build -- --force --env-mode=loose`:
**FRESH PASS 8/8 tasks, 0 cached**, including API/web and local Android/iOS/web
exports; offline Expo, telemetry disabled and no environment-file edits.
Workflow/provider-contract suites are NOT APPLICABLE: no workflow or generation
provider boundary changed. No remote query, advisor or migration application ran.

Failed first attempts and repairs (retained):

- Initial forced typecheck: 6/8 tasks, 0 cached, two mobile errors: an assumed
  Button export and unsupported Notice prop. Reused existing Action/Notice APIs.
- Second forced typecheck: 6/8 tasks, 0 cached, five test fixture type errors
  comparing React ElementType to mock host names. Used the existing String(type)
  fixture pattern without weakening product types or validation.
- Third forced typecheck: 7/8 tasks, 0 cached, two API test errors involving
  Buffer BodyInit and overloaded canvas encoding. Explicit byte copy and typed
  format branch fixed the fixtures; subsequent forced typecheck passes 8/8.
- First isolated route suite: six passed / one failed because the preflight
  fixture omitted Origin. Added an allowed local Origin, keeping real CORS rules.
  Final route suite passes all eight cases, including successful normalized PUT.
- Initial forced lint passed 8/8 with two added test import-order warnings.
  Reordered the new test imports; final six warnings are all pre-existing.
- A documentation edit attempted unavailable Python; it made no changes.
  Used native PowerShell filesystem methods. No Python installation performed.
- No full-suite failure, nondeterministic flake or skipped required unit test.
  Existing Vite-config, React renderer and Metro color warnings remain.

### Limitations and owner steps remaining

Storage and Postgres cannot share a transaction. A crash or uncertain RPC
response can leave an unreferenced private object. The code preserves a
possibly-current object rather than deleting it on uncertain evidence. Retired
objects remain in the database cleanup list until deletion succeeds; a failed
retirement returns a safe error and the clients reconcile authoritative state.
No success is returned until persistence and retirement cleanup complete.
See [ADR-049](../../adr/ADR-049-profile-avatars.md).

- **Rollout - NOT RUN, skipped entirely:** owner applies
  `packages/db/migrations/20261018000300_profile_avatars.sql`, deploys API/web,
  then ships mobile using the existing release process. No new native module.
- **Device checks - NOT RUN, skipped entirely:** Google/Microsoft provider photos;
  upload, replace and confirmed remove on both platforms; fallback after remove,
  image error and offline; reload/expiry; account switch/sign-out; and another
  account's inability to read/write/delete private objects.
- **UNVERIFIED (owner to confirm):** live provider photo metadata, deployed and
  installed revisions, applied migrations/database rows, Scheduler state,
  remote-ref freshness and authenticated production behavior.
- Vercel CLI is absent; installing `npm i -g vercel` is strongly recommended
  for the owner's later rollout tooling. No installation or CLI invocation ran.

No Supabase, Vercel, Google Cloud, Canvas or Resend calls, remote SQL,
deployments, Scheduler operations, email, environment-file edits or push.
The expected 23 owner files under `UI/`, `apps/mobile/.gitignore` and
`supabase/.temp/` remain untouched. Generated build/export outputs and logs
remain uncommitted; Next's generated ambient type-file edits are restored.
Local evidence is under ignored `tmp/overnight/PF1b.*`. Final documentation
commit/status appear in the handoff and `tmp/overnight/PF1b.status`.
