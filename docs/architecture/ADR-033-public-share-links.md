# ADR-033: Public reviewer snapshot links

Status: Accepted for SH1 unattended local code scope, 2026-10-16. Owner rollout
and device checks remain separate. SH0's answered snapshot/privacy rules are
the product authority; batch generation is excluded.

`reviewer_shares` stores one row per owner/artifact, a unique cryptographically
random 256-bit opaque token, a separate JSON snapshot, timestamps and revocation.
Owner RLS permits own reads/create/update, with owner-matching artifact foreign
keys and explicit grants. Anonymous roles have no table or RPC access.
Server-only service credentials never reach either client. Owner endpoints
verify a Supabase bearer JWT and use only that verified identity. Missing,
foreign, deleted and non-reviewer artifacts receive safe not-found denial.

The service-only security-invoker mutation serializes owner/artifact operations
with a transaction lock. Create returns an existing active share unchanged.
Update replaces the snapshot and preserves its token, fencing publication on
the exact accepted artifact version. Stop sets `revoked_at`; an update cannot
revive it. Sharing again rotates the token so a stopped URL stays stopped.
Neither editing nor regeneration implicitly modifies the stored copy.
The forward follow-up migration revokes links in the artifact's soft-delete
transaction, preventing an inaccessible deleted reviewer from keeping a live
public link. Hard deletion cascades the stored share through its foreign key.

An explicit allow-list copies reviewer titles, section/block text, key points,
evidence already displayed by the reader, emphasis, key terms from existing
block titles, numeric page citations rendered as text, and the owner's existing
linked quizzes with only learner questions and local grading answers/explanations.
No grades, attempt history, tasks, account details, Canvas references/URLs,
source text, provider metadata, private Storage paths, source page images or
extracted figures enter the snapshot. The public read reprojects the allow-list
again, including nested quiz options, keys and assistance. Unknown fields in
storage do not expand the public contract. Invalid payloads fail closed.

Saved Study Assist currently lives in owner-scoped browser storage or mobile
SQLite, not a synchronized server collection. Create/update explicitly submits
only results available on the sharing device for the exact current reviewer
block/content hash and prompt version. The server verifies that binding and
copies only the result text/type and numeric block/point location. It never
generates a missing result. Content saved exclusively on another device is
unavailable here. Ephemeral Smart Selection sessions are not saved assistance.
Existing valid cached content is rendered as labelled read-only AI assistance,
outside canonical reviewer text.

Wikimedia visuals come only from `section_external_visuals` for the exact owner,
artifact and immutable version. Image and source hosts are constrained to
Wikimedia, license URLs to Wikimedia/Creative Commons, with explicit credit and
allowed license labels. They retain the external-reference label, attribution
and license links. Course figure and snapshot APIs are never called publicly.

`GET /api/shares/:token` is anonymous and selects only `snapshot` by exact token
and non-revoked state. Revoked, unknown and malformed tokens share the same 404
body. Every response is private/no-store and noindex, including errors. Tokens
and IPs are not logged; limiter keys are hashed. Public routes have no AI,
generation, private reader or write dependencies. In-process rate counters are
the only public-path mutation; there are no database writes or durable quotas.

The best-effort limiter permits 60 reads per minute per trusted forwarded IP
and independently per token. It retains at most 4,096 entries, expires them
after a minute, and fails closed when full; it never evicts a live bucket to
make a new allowance. Vercel's trusted `x-vercel-forwarded-for` supplies the IP;
other hosts use an unknown-IP bucket unless their trusted ingress supplies it.
This is not a distributed abuse-control guarantee: cold starts and multiple
instances reset/divide limits. Owner rollout must confirm trusted header behavior.

The website `/s/:token` lives outside the signed-in app group and bypasses auth
initialization and private cache hydration. It has noindex metadata/headers,
no-store snapshot reads and no-referrer handling. Dedicated read-only markup
uses existing reader classes because the owner components fetch private images
and can start AI work. Every AI control links to sign-in with a validated local
share return path, including OAuth/signup flows. Quiz grading uses O2 shared
pure functions in memory, with no fetch, storage or attempt write. A viewer does
not own the original quiz, so there is no clean authorized score-save path after
sign-in; the return link is preserved and score-saving is a documented follow-up.

Web Library reviewer detail and the mobile reviewer menu expose Share/copy,
Update shared version and Stop sharing. Mobile uses React Native `Share` and
SDK 57 `expo-clipboard` 57.0.2. The website origin is separately configurable
with `EXPO_PUBLIC_WEBSITE_URL`, defaulting to the existing documented website
origin. No environment files were edited. Before OTA, the owner must confirm
that the target binary contains this native clipboard module, otherwise build
and install a compatible preview binary first. No native build or publication
is authorized during this unattended run.

Migrations `20261015050000_public_reviewer_shares.sql` and
`20261015050100_revoke_deleted_reviewer_shares.sql` are new files only. They
requires the existing canonical artifact schema and SP2 Library projections.
Local SQL tests verify grants/RLS and mutation semantics; production SQL,
applied history, deployment, trusted ingress and physical behavior are
UNVERIFIED (owner to confirm).
