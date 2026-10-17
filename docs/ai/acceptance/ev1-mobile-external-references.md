# EV1 mobile external references

Status: PASS for the finite unattended local code scope. N2: STEP 0-2, local tests/gates,
documentation and local commits only. Baseline: 2bf02f8, branch
overnight/2026-10-15_feedback. Expected unrelated untracked UI/,
apps/mobile/.gitignore and supabase/.temp/ are preserved. No fetch or remote calls.

| Requirement | Layer | Proof | Result |
| --- | --- | --- | --- |
| Found external image, exact label and attribution without source image | mobile reader/card | API-shaped fixture and rendered component | FRESH PASS |
| Source URL presence, rather than eligibility/discovery, controls precedence | mobile source components/reader | pending/failed/ready snapshot and figure transitions | FRESH PASS |
| One invalid section cannot hide valid references or stop polling | mobile parser/hook | mixed valid/invalid batch regression | FRESH PASS |
| Strict URL/license/dimension/label validation remains | mobile parser | negative DTO cases | FRESH PASS |
| Existing headers, caption and viewer preserved; temporary diagnostics removed | mobile | component regressions/diff | FRESH PASS |
| All required local gates fresh and serial | root/mobile/API | command results below | FRESH PASS |

## STEP 0 findings

HEAD, branch, dirty paths and every requested file/route match the prompt.
API routes live under apps/api/app/api/reviewers/[id]; implementation lives
under apps/api/src/lib/external-visuals. GET visuals uses readReviewerVisuals;
POST visuals admits a background batch; section POST uses findSectionVisual.
All protected reads/searches remain server-authenticated and owner-scoped.

Candidate causes and dispositions:

- Confirmed display mismatch: mobile treats snapshot.available as a source
  image even for rendering/unrendered responses without a URL. Website uses
  loaded figures.length or snapshot.url. Mobile also blocks a found image until
  snapshot discovery is non-null, so an untouched/offscreen/failed probe hides
  a reference the website renders. Figure discovery similarly suppresses an
  external before any figure URL is loaded (including empty/failed reads).
- Confirmed batch failure risk: parseReviewerVisuals throws on one invalid
  section; load catches it as null, discarding all valid sections and, on the
  initial read, preventing batch admission/polling entirely. Server batch reads
  check presence but do not revalidate stored URLs/dimensions/labels.
- No current serializer mismatch: both API serializers emit status, opaque id,
  image/title/credit/license/licenseUrl/sourceUrl, exact EXTERNAL_VISUAL_LABEL,
  positive width/height and attemptCount. Commons bounds width to 1200, height
  to 10000, and normalizes thumb.wikimedia.org to upload.wikimedia.org. Rows
  with null required found fields are skipped server-side. Extra fields are ignored on mobile;
  optional id preserves older compatibility. Validation limits need no widening.
- Batch !result behavior, single admission and bounded polling match website;
  adding per-section initial searches would change that rule, so none is added.
- deviceCopy and access-token guards intentionally exclude offline/unsigned
  requests. Figure discovery supplies existing mobile reachability; preserve it
  while removing the additional snapshot-discovery prerequisite.
  LibraryScreen passes useLocalArtifact.deviceCopy: cached initial reads and
  successful refreshes set it false; failed remote refreshes with a retained
  detail set it true. It does not mark every saved reviewer permanently offline.
- Headers are already shared by inline/zoom Commons images and must remain.
  Native HTTP/image load behavior and the actual Realme failure cannot be
  established offline. Remove temporary reviewer.* runtime/load diagnostics;
  they are no longer needed for the code reproduction.

Live deployed revisions, actual stored visuals, applied migrations, Scheduler,
provider/image egress and physical-device root cause: **UNVERIFIED (owner to confirm)**.
Code proves the mismatches above, not which one occurred on the owner's device.

## Implementation and verification

Root cause in code: mobile coupled external visibility to source discovery and
snapshot eligibility instead of displayed source URLs, with a batch-wide parser
failure capable of hiding every valid reference.

Snapshot and figure components now report whether their inline source images
are present. The reader applies that state to external precedence without waiting
for snapshot discovery; existing device-copy/auth/reachability guards remain.
Malformed sections are dropped individually with all per-visual validation intact.
The existing batch/poll/replacement flow, EXTERNAL_IMAGE_HEADERS, exact label,
attribution, captions and image viewer remain. Temporary reviewer.* runtime/load
diagnostics are removed; image errors still close the external sheet quietly.
No API/web/shared code, serializer, migration, dependency or native module changed.

React review: callbacks use refs to avoid effects repeating on inline handler
identity changes; availability is derived from displayed state and only transitions
notify the reader. Functional setters avoid redundant map updates. Existing effect
abort/cleanup, strict types and accessible image/attribution controls are retained.

- FRESH deliberate red reproduction at 239a0ab: 7 failed / 80 passed, 4 failing /
  1 passing file. All seven failures match the expected defects/new contract.
- FRESH focused rerun after fixes: 87/87 passed, 5/5 files.
- FRESH forced root typecheck: 8/8 tasks passed, zero cached.
- FRESH forced root lint: 8/8 tasks passed, zero cached; zero errors and six
  pre-existing warnings (five mobile import-order warnings, one web unused import).
- FRESH full mobile suite: 1,209/1,209 tests in 130/130 files passed.
- API/web/shared tests: NOT APPLICABLE; those workspaces and serializers did not
  change. Mobile tests exercise the copied real serializer DTO shape.
- FRESH standalone API build: PASS, 35/35 pages generated.
- FRESH standalone Android export: PASS, one Android bundle and 35 assets.
- FRESH forced root build: 8/8 tasks passed, zero cached; API 35/35 and web 19/19
  pages, Android/iOS/web mobile exports with 68 assets. This additional repository
  gate is required by AUTOPILOT.md.
- FRESH git diff --check and git diff --cached --check: PASS. Generated API/web
  next-env.d.ts build declarations were restored to the clean baseline.
- Rollout and Device checks: NOT RUN, skipped entirely.

Exact serial gate commands (all PASS on their first gate attempt):

| Command | Evidence |
| --- | --- |
| npm run typecheck -- --force | FRESH 8/8, zero cached |
| npm run lint -- --force | FRESH 8/8, zero cached; zero errors, six existing warnings |
| npm test --workspace @stay-focused/mobile | FRESH 1,209/1,209, 130 files |
| npm run build --workspace @stay-focused/api | FRESH PASS, 35/35 pages |
| npm run build --workspace @stay-focused/mobile -- --platform android | FRESH PASS, one bundle / 35 assets |
| npm run build -- --force | FRESH 8/8, zero cached |
| git diff --check; git diff --cached --check | FRESH PASS |

Verification covers the production/test tree committed as a9c1d7f. Initial
reproduction tests were committed separately as 239a0ab. Closing documentation
is in docs: close EV1; its final hash is in Git and tmp/overnight/EV1.status.

Logs are local-only under tmp/overnight/EV1-*.log and excluded from commits.
No nondeterministic flake observed. Existing Vite CommonJS/configLoader and Expo
NO_COLOR/FORCE_COLOR warnings remain. A Python launcher was unavailable during
documentation preparation; the operation was completed with the installed Node
runtime. This was a tooling attempt, not a failed verification gate.

No deployment, push, fetch, remote service/SQL call, migration application,
environment-file edit, Scheduler action or email occurred. No migration file,
native module or dependency was added. The three baseline untracked paths are
untouched; generated validation/build outputs are excluded from commits.
This run ends at EV1; IM2 and every later roadmap item are not started.

## Owner steps remaining

Rollout: publish the reviewed mobile fix through the owner's normal release flow.
Device checks / RB5: on Realme, open a reviewer with no course image and a found
Commons reference; confirm the image, exact external label and attribution.
Confirm source-image precedence, offline behavior and actual deployed versions.
No owner question or new approval is required for this local code scope.
